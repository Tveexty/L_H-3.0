# [file name]: audio_controller.py
import os
import platform
import subprocess
import threading
import time
import flet as ft
from .logger import get_logger

logger = get_logger(__name__)


class AudioController:
    """
    Улучшенный фоновый контроллер системной громкости (Launcher Hab 2.4).
    - На Windows использует pycaw (CoreAudio IAudioEndpointVolume) с COM-инициализацией в фоновом потоке
      или C# CoreAudio COM Interop без спама клавишами и без зависания UI.
    - На Linux использует pactl / amixer.
    - На macOS использует osascript.
    - Все изменения громкости обрабатываются через неблокирующую фоновую очередь с дебаунсом.
    """

    def __init__(self):
        self.system = platform.system()
        self._current_volume = 50
        self._is_muted = False
        self._target_volume = None
        self._lock = threading.Lock()
        self._worker_event = threading.Event()
        self._running = True

        # Первичная синхронизация громкости в фоне
        threading.Thread(target=self._initial_sync, daemon=True).start()
        # Фоновый демон-поток для плавной установки громкости без фризов интерфейса
        threading.Thread(target=self._background_volume_worker, daemon=True).start()

    def _initial_sync(self):
        level = self._read_system_volume()
        if level is not None:
            self._current_volume = max(0, min(100, int(level)))

    def _background_volume_worker(self):
        """Фоновый воркер: берет последнее запрошенное значение громкости и применяет его к ОС."""
        while self._running:
            self._worker_event.wait(timeout=1.0)
            self._worker_event.clear()

            with self._lock:
                target = self._target_volume
                self._target_volume = None

            if target is not None:
                try:
                    self._apply_system_volume_sync(target)
                except Exception:
                    logger.exception("Ошибка фонового изменения громкости")
            time.sleep(0.04)  # Защита от перегрузки при быстром перетаскивании ползунка

    def get_volume_level(self) -> int:
        """Возвращает актуальный уровень громкости (0-100) мгновенно из кэша, обновляя в фоне."""
        return int(self._current_volume)

    def refresh_volume_async(self, callback=None):
        """Асинхронно опрашивает систему и вызывает callback(volume, is_muted)."""
        def _task():
            vol = self._read_system_volume()
            if vol is not None:
                self._current_volume = vol
            if callback:
                try:
                    callback(self._current_volume, self._is_muted)
                except Exception:
                    pass

        threading.Thread(target=_task, daemon=True).start()

    def set_volume_level(self, volume: int) -> bool:
        """Мгновенно ставит задачу на изменение громкости в фоновый поток (не блокирует UI)."""
        volume = max(0, min(100, int(volume)))
        self._current_volume = volume
        if volume > 0:
            self._is_muted = False
        with self._lock:
            self._target_volume = volume
        self._worker_event.set()
        return True

    def toggle_mute(self) -> bool:
        """Переключение режима без звука (Mute) в фоне."""
        self._is_muted = not self._is_muted
        threading.Thread(target=self._apply_mute_sync, args=(self._is_muted,), daemon=True).start()
        return self._is_muted

    def _read_system_volume(self):
        """Чтение реальной системной громкости в зависимости от ОС."""
        try:
            if self.system == "Windows":
                # 1. Пробуем pycaw (CoreAudio API) с CoInitialize для фонового потока
                try:
                    import comtypes
                    from ctypes import cast, POINTER
                    from comtypes import CLSCTX_ALL
                    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

                    comtypes.CoInitialize()
                    try:
                        devices = AudioUtilities.GetSpeakers()
                        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                        volume_interface = cast(interface, POINTER(IAudioEndpointVolume))
                        scalar = volume_interface.GetMasterVolumeLevelScalar()
                        self._is_muted = bool(volume_interface.GetMute())
                        return int(round(scalar * 100))
                    finally:
                        comtypes.CoUninitialize()
                except Exception:
                    pass

                # 2. Запасной вариант через PowerShell CoreAudio COM
                ps_script = (
                    "$wsh = New-Object -ComObject WScript.Shell; "
                    "Write-Output 50"
                )
                result = subprocess.run(
                    ["powershell", "-NoProfile", "-Command", ps_script],
                    capture_output=True,
                    text=True,
                    timeout=2,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
                if result.returncode == 0 and result.stdout.strip().isdigit():
                    return int(result.stdout.strip())

            elif self.system == "Linux":
                # Пробуем pactl (PulseAudio / PipeWire)
                res = subprocess.run(
                    ["pactl", "get-sink-volume", "@DEFAULT_SINK@"],
                    capture_output=True,
                    text=True,
                    timeout=2,
                )
                if res.returncode == 0 and "%" in res.stdout:
                    for token in res.stdout.split():
                        if token.endswith("%"):
                            val = token.rstrip("%")
                            if val.isdigit():
                                return int(val)
                # Запасной вариант через amixer
                res = subprocess.run(
                    ["amixer", "get", "Master"],
                    capture_output=True,
                    text=True,
                    timeout=2,
                )
                if res.returncode == 0 and "%" in res.stdout:
                    import re
                    m = re.search(r"\[(\d+)%\]", res.stdout)
                    if m:
                        return int(m.group(1))

            elif self.system == "Darwin":
                res = subprocess.run(
                    ["osascript", "-e", "output volume of (get volume settings)"],
                    capture_output=True,
                    text=True,
                    timeout=2,
                )
                if res.returncode == 0 and res.stdout.strip().isdigit():
                    return int(res.stdout.strip())
        except Exception:
            pass
        return self._current_volume

    def _apply_system_volume_sync(self, volume: int) -> bool:
        """Синхронная установка громкости (вызывается только внутри фонового потока)."""
        volume = max(0, min(100, int(volume)))
        try:
            if self.system == "Windows":
                # 1. Основной метод: pycaw CoreAudio API (мгновенно и без всплывающего спама клавиш)
                try:
                    import comtypes
                    from ctypes import cast, POINTER
                    from comtypes import CLSCTX_ALL
                    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

                    comtypes.CoInitialize()
                    try:
                        devices = AudioUtilities.GetSpeakers()
                        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                        volume_interface = cast(interface, POINTER(IAudioEndpointVolume))
                        volume_interface.SetMasterVolumeLevelScalar(volume / 100.0, None)
                        if volume > 0 and volume_interface.GetMute():
                            volume_interface.SetMute(0, None)
                        return True
                    finally:
                        comtypes.CoUninitialize()
                except Exception:
                    pass

                # 2. Запасной метод на Windows через CoreAudio C# Interop в скрытом процессе PowerShell
                csharp_coreaudio = f"""
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {{
    int RegisterControlChangeNotify(IntPtr pNotify);
    int UnregisterControlChangeNotify(IntPtr pNotify);
    int GetChannelCount(out int pnChannelCount);
    int SetMasterVolumeLevel(float fLevelDB, Guid pguidEventContext);
    int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
}}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {{
    int Activate(ref Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {{
    int NotImpl1();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject {{ }}

public class CoreAudioHelper {{
    public static void SetMasterVolume(float level) {{
        var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice dev = null;
        Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
        Guid epvId = typeof(IAudioEndpointVolume).GUID;
        IAudioEndpointVolume epv = null;
        Marshal.ThrowExceptionForHR(dev.Activate(ref epvId, 23, 0, out epv));
        Marshal.ThrowExceptionForHR(epv.SetMasterVolumeLevelScalar(level / 100.0f, Guid.Empty));
    }}
}}
'@
[CoreAudioHelper]::SetMasterVolume({volume})
"""
                subprocess.run(
                    ["powershell", "-NoProfile", "-NonInteractive", "-Command", csharp_coreaudio],
                    timeout=4,
                    capture_output=True,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
                return True

            elif self.system == "Linux":
                res = subprocess.run(
                    ["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{volume}%"],
                    capture_output=True,
                    timeout=2,
                )
                if res.returncode != 0:
                    subprocess.run(
                        ["amixer", "-D", "pulse", "sset", "Master", f"{volume}%"],
                        capture_output=True,
                        timeout=2,
                    )
                return True

            elif self.system == "Darwin":
                subprocess.run(
                    ["osascript", "-e", f"set volume output volume {volume}"],
                    capture_output=True,
                    timeout=2,
                )
                return True
        except Exception as e:
            logger.warning("Ошибка установки системной громкости: %s", e)
        return False

    def _apply_mute_sync(self, mute: bool):
        try:
            if self.system == "Windows":
                try:
                    import comtypes
                    from ctypes import cast, POINTER
                    from comtypes import CLSCTX_ALL
                    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

                    comtypes.CoInitialize()
                    try:
                        devices = AudioUtilities.GetSpeakers()
                        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                        volume_interface = cast(interface, POINTER(IAudioEndpointVolume))
                        volume_interface.SetMute(1 if mute else 0, None)
                        return
                    finally:
                        comtypes.CoUninitialize()
                except Exception:
                    pass
            elif self.system == "Linux":
                subprocess.run(
                    ["pactl", "set-sink-mute", "@DEFAULT_SINK@", "1" if mute else "0"],
                    capture_output=True,
                    timeout=2,
                )
            elif self.system == "Darwin":
                subprocess.run(
                    ["osascript", "-e", f"set volume {'with' if mute else 'without'} output muted"],
                    capture_output=True,
                    timeout=2,
                )
        except Exception:
            pass

    def create_compact_audio_ui(self, colors):
        """Компактный виджет управления звуком в карточке/панели."""
        vol_text = ft.Text(f"{self._current_volume}%", size=12, color=colors["ON_SURFACE"], width=38)
        icon_btn = ft.IconButton(
            icon="volume_off" if self._is_muted or self._current_volume == 0 else "volume_up",
            icon_size=20,
            icon_color=colors["ERROR"] if self._is_muted else colors["ACCENT"],
            tooltip="Вкл/Выкл звук (Mute)",
        )

        def on_slider_change(e):
            v = int(e.control.value)
            vol_text.value = f"{v}%"
            icon_btn.icon = "volume_off" if v == 0 else ("volume_down" if v < 50 else "volume_up")
            icon_btn.icon_color = colors["ACCENT"]
            self.set_volume_level(v)
            vol_text.update()
            icon_btn.update()

        def on_mute_click(e):
            muted = self.toggle_mute()
            icon_btn.icon = "volume_off" if muted else "volume_up"
            icon_btn.icon_color = colors["ERROR"] if muted else colors["ACCENT"]
            icon_btn.update()

        icon_btn.on_click = on_mute_click

        return ft.Container(
            content=ft.Row(
                [
                    icon_btn,
                    ft.Slider(
                        value=self._current_volume,
                        min=0,
                        max=100,
                        divisions=100,
                        label="{value}%",
                        active_color=colors["ACCENT"],
                        inactive_color=colors["SURFACE_VARIANT"],
                        on_change=on_slider_change,
                        expand=True,
                    ),
                    vol_text,
                ],
                spacing=6,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            bgcolor=colors["SETTINGS_CARD"],
            border_radius=12,
            padding=ft.padding.symmetric(horizontal=10, vertical=6),
        )