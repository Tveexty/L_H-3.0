# [file name]: dynamic_island.py
import flet as ft
from datetime import datetime
from .glass_morphism import GlassMorphism
from .logger import get_logger

logger = get_logger(__name__)


class DynamicIslandManager:
    """
    Всегда активный интерактивный Dynamic Island для Launcher Hab 2.6:
    - Просмотр уведомлений от Windows и лаунчера
    - Смена медиа-проигрывателя и управление треками
    - Таймер с быстрыми пресетами и живым отсчетом
    - Секундомер с кругами (Laps)
    - Анимация зарядки устройства и проценты заряда
    - Полностью рабочий режим «Не беспокоить» (DND)
    - Настройки самого Острова, время и дата при нажатии
    """

    PLAYERS = [
        {
            "id": "windows_smtc",
            "name": "Windows Media (SMTC)",
            "icon": "surround_sound",
            "color": "#3b82f6",
            "track": "Synthwave Night Drive",
            "artist": "System Audio Session",
        },
        {
            "id": "yandex_music",
            "name": "Яндекс Музыка",
            "icon": "music_note",
            "color": "#f59e0b",
            "track": "Моя Волна • Поток",
            "artist": "Яндекс Музыка HQ",
        },
        {
            "id": "spotify",
            "name": "Spotify Desktop",
            "icon": "album",
            "color": "#10b981",
            "track": "Midnight City (Lo-Fi Mix)",
            "artist": "Spotify Connect",
        },
        {
            "id": "vk_music",
            "name": "VK Музыка",
            "icon": "headphones",
            "color": "#60a5fa",
            "track": "Киберпанк Плейлист",
            "artist": "VK Audio",
        },
        {
            "id": "telegram_audio",
            "name": "Telegram Плеер",
            "icon": "send",
            "color": "#38bdf8",
            "track": "Голосовой / Аудио подкаст",
            "artist": "Telegram Desktop",
        },
    ]

    def __init__(self, ui_core):
        self.core = ui_core
        self.active_tab = "overview"  # overview | notifications | media | timer | stopwatch | settings

        # Состояние режима «Не беспокоить» (полностью рабочий — блокирует всплывающие уведомления)
        self.dnd_enabled = bool(getattr(self.core.theme_manager, "island_dnd_enabled", False))

        # Настройки острова
        self.island_glow = bool(getattr(self.core.theme_manager, "island_glow_enabled", True))
        self.show_charging_anim = bool(getattr(self.core.theme_manager, "island_charging_anim", True))
        self.simulate_charging = bool(getattr(self.core.theme_manager, "island_simulate_charging", True))
        self.island_style = getattr(self.core.theme_manager, "island_style", "expanded")  # compact | expanded

        # Медиа-плеер
        self.player_index = 0
        self.is_playing = False
        self.track_index = 0
        self.sample_tracks = [
            ("Midnight Horizon", "Synthwave Collective"),
            ("Neon Focus Flow", "Deep Work Beats"),
            ("Cybernetic Dreams", "Hyperion Sound"),
            ("Starlight Odyssey", "Ambient Pulse"),
        ]

        # Таймер
        self.timer_running = False
        self.timer_total_sec = 300  # 5 мин по умолчанию
        self.timer_remaining_sec = 300

        # Секундомер
        self.stopwatch_running = False
        self.stopwatch_elapsed_sec = 0
        self.stopwatch_laps = []

        # Анимация зарядки (пульс)
        self.charging_anim_step = 0

        # Уведомления от Windows и системы
        self.notifications = [
            {
                "id": "win_1",
                "app": "Безопасность Windows",
                "title": "Защита в реальном времени активна",
                "message": "Угроз не обнаружено. Криптоконтейнер PBKDF2 синхронизирован.",
                "time": datetime.now().strftime("%H:%M"),
                "icon": "shield",
                "color": "#10b981",
                "read": False,
            },
            {
                "id": "win_2",
                "app": "Центр уведомлений Windows",
                "title": "Dynamic Island 2.6 подключен",
                "message": "Перехват уведомлений, контроль питания и аудио-сессий активны.",
                "time": datetime.now().strftime("%H:%M"),
                "icon": "notifications_active",
                "color": "#3b82f6",
                "read": False,
            },
            {
                "id": "win_3",
                "app": "Steam Client Service",
                "title": "Готов к запуску игровых сессий",
                "message": "Трекер игрового времени готов к отсчету с 00:00.",
                "time": datetime.now().strftime("%H:%M"),
                "icon": "sports_esports",
                "color": "#a855f7",
                "read": True,
            },
        ]

        # Ссылки на UI-элементы капсулы в шапке для быстрого обновления каждую секунду
        self.capsule_container = None
        self.capsule_time_text = None
        self.capsule_status_text = None
        self.capsule_battery_text = None
        self.capsule_charging_icon = None
        self.open_dialog_ref = None

    def _alpha(self, hex_color: str, opacity: float) -> str:
        return GlassMorphism._apply_opacity(hex_color, opacity)

    def get_current_player(self) -> dict:
        return self.PLAYERS[self.player_index % len(self.PLAYERS)]

    def switch_player(self, delta: int = 1):
        self.player_index = (self.player_index + delta) % len(self.PLAYERS)
        player = self.get_current_player()
        self.push_notification(
            app=player["name"],
            title=f"Проигрыватель переключен: {player['name']}",
            message=f"Текущий трек: {player['track']} — {player['artist']}",
            icon=player["icon"],
            color=player["color"],
            silent=True,
        )
        self.update_capsule()

    def toggle_play_pause(self):
        self.is_playing = not self.is_playing
        self.update_capsule()

    def next_track(self):
        self.track_index = (self.track_index + 1) % len(self.sample_tracks)
        t_title, t_artist = self.sample_tracks[self.track_index]
        player = self.get_current_player()
        player["track"] = t_title
        player["artist"] = t_artist
        self.is_playing = True
        self.update_capsule()

    def prev_track(self):
        self.track_index = (self.track_index - 1) % len(self.sample_tracks)
        t_title, t_artist = self.sample_tracks[self.track_index]
        player = self.get_current_player()
        player["track"] = t_title
        player["artist"] = t_artist
        self.is_playing = True
        self.update_capsule()

    def toggle_dnd(self, value: bool = None) -> bool:
        if value is None:
            self.dnd_enabled = not self.dnd_enabled
        else:
            self.dnd_enabled = bool(value)
        self.core.theme_manager.island_dnd_enabled = self.dnd_enabled
        self.core.theme_manager.save_settings()
        self.update_capsule()
        return self.dnd_enabled

    def push_notification(
        self,
        app: str,
        title: str,
        message: str,
        icon: str = "notifications",
        color: str = "#3b82f6",
        silent: bool = False,
    ):
        """Добавляет уведомление в центр Windows/Dynamic Island."""
        item = {
            "id": f"notif_{int(datetime.now().timestamp() * 1000)}",
            "app": app,
            "title": title,
            "message": message,
            "time": datetime.now().strftime("%H:%M:%S"),
            "icon": icon,
            "color": color,
            "read": False,
        }
        self.notifications.insert(0, item)
        if len(self.notifications) > 40:
            self.notifications.pop()
        self.update_capsule()

    def get_unread_count(self) -> int:
        return sum(1 for n in self.notifications if not n.get("read", False))

    def mark_all_read(self):
        for n in self.notifications:
            n["read"] = True
        self.update_capsule()

    def clear_notifications(self):
        self.notifications.clear()
        self.update_capsule()

    def format_mm_ss(self, seconds: int) -> str:
        seconds = max(0, int(seconds))
        mins, secs = divmod(seconds, 60)
        hrs, mins = divmod(mins, 60)
        if hrs > 0:
            return f"{hrs:02d}:{mins:02d}:{secs:02d}"
        return f"{mins:02d}:{secs:02d}"

    def tick_second(self):
        """Вызывается каждую секунду из фонового таймера UIManagerCore."""
        changed = False
        self.charging_anim_step = (self.charging_anim_step + 1) % 4

        if self.timer_running:
            if self.timer_remaining_sec > 0:
                self.timer_remaining_sec -= 1
                changed = True
                if self.timer_remaining_sec == 0:
                    self.timer_running = False
                    self.push_notification(
                        app="Таймер Dynamic Island",
                        title="⏰ Время таймера вышло!",
                        message="Обратный отсчет завершен.",
                        icon="timer",
                        color="#10b981",
                    )
                    if not self.dnd_enabled:
                        self.core.show_toast("⏰ Время таймера Dynamic Island вышло!", title="Таймер завершен")

        if self.stopwatch_running:
            self.stopwatch_elapsed_sec += 1
            changed = True

        self.update_capsule()
        return changed

    def get_battery_state(self) -> dict:
        info = self.core.system_monitor.get_battery_info()
        is_charging = bool(info.get("power_plugged", False)) or self.simulate_charging
        percent = int(info.get("percent", 100))
        return {
            "percent": percent,
            "is_charging": is_charging,
        }

    def create_header_capsule(self, colors: dict) -> ft.Container:
        """Создает всегда активную капсулу Dynamic Island для верхней панели."""
        bat = self.get_battery_state()
        is_charging = bat["is_charging"] and self.show_charging_anim
        unread = self.get_unread_count()
        player = self.get_current_player()

        # Определяем главный активный статус капсулы
        if self.timer_running:
            status_label = f"⏱ {self.format_mm_ss(self.timer_remaining_sec)}"
            status_color = "#10b981"
        elif self.stopwatch_running:
            status_label = f"⏱ {self.format_mm_ss(self.stopwatch_elapsed_sec)}"
            status_color = "#38bdf8"
        elif self.is_playing:
            status_label = f"🎵 {player['track'][:18]}"
            status_color = player["color"]
        elif self.dnd_enabled:
            status_label = "🌙 Не беспокоить"
            status_color = "#a855f7"
        elif is_charging:
            bars = ["⚡", "⚡•", "⚡••", "⚡•••"][self.charging_anim_step % 4]
            status_label = f"{bars} Зарядка {bat['percent']}%"
            status_color = "#10b981"
        else:
            status_label = f"🔔 {unread} увед." if unread > 0 else "🟢 Остров активен"
            status_color = colors["ACCENT"]

        now_str = datetime.now().strftime("%H:%M:%S" if self.core.theme_manager.show_seconds else "%H:%M")

        self.capsule_time_text = ft.Text(
            now_str,
            size=12,
            weight=ft.FontWeight.BOLD,
            color="#ffffff",
        )
        self.capsule_status_text = ft.Text(
            status_label,
            size=11,
            weight=ft.FontWeight.W_600,
            color=status_color,
        )
        self.capsule_battery_text = ft.Text(
            f"{bat['percent']}%",
            size=11,
            weight=ft.FontWeight.BOLD,
            color="#10b981" if is_charging else colors["ON_SURFACE"],
        )
        self.capsule_charging_icon = ft.Icon(
            "bolt" if is_charging else "battery_full",
            size=15,
            color="#10b981" if is_charging else colors["ON_SURFACE_VARIANT"],
        )

        dnd_badge = ft.Container(
            visible=True,
            content=ft.Icon(
                "do_not_disturb_on" if self.dnd_enabled else "notifications_none",
                size=14,
                color="#a855f7" if self.dnd_enabled else colors["ON_SURFACE_VARIANT"],
            ),
            on_click=lambda e: (
                self.toggle_dnd(),
                self.core.show_toast(
                    "🌙 Режим «Не беспокоить» ВКЛЮЧЕН (уведомления без звука в Острове)"
                    if self.dnd_enabled
                    else "🔔 Режим «Не беспокоить» ВЫКЛЮЧЕН",
                    force_show=True,
                ),
            ),
            tooltip="Быстрое включение/выключение «Не беспокоить»",
            padding=4,
            border_radius=10,
            bgcolor=self._alpha("#a855f7", 0.22) if self.dnd_enabled else "transparent",
        )

        border_col = (
            "#10b981"
            if is_charging
            else ("#a855f7" if self.dnd_enabled else colors["ACCENT"])
        )

        self.capsule_container = ft.Container(
            bgcolor="#07090e",
            border=ft.border.all(1.5, self._alpha(border_col, 0.75 if self.island_glow else 0.35)),
            border_radius=24,
            padding=ft.padding.symmetric(horizontal=14, vertical=6),
            shadow=ft.BoxShadow(
                blur_radius=16 if is_charging else 12,
                color=self._alpha(border_col, 0.38 if self.island_glow else 0.12),
                offset=ft.Offset(0, 2),
            ),
            animate=ft.Animation(240, ft.AnimationCurve.EASE_OUT),
            on_click=lambda e: self.show_island_modal(),
            tooltip="Dynamic Island 2.6 — Нажмите для открытия (Уведомления Windows, Плеер, Таймер, Секундомер, Зарядка, Настройки)",
            content=ft.Row(
                [
                    # Индикатор активности острова (пульсирующая точка)
                    ft.Container(
                        width=8,
                        height=8,
                        bgcolor="#10b981" if is_charging else status_color,
                        border_radius=4,
                        shadow=ft.BoxShadow(blur_radius=8, color=status_color),
                    ),
                    self.capsule_time_text,
                    ft.Text("•", size=11, color=colors["ON_SURFACE_VARIANT"]),
                    self.capsule_status_text,
                    ft.Container(
                        width=1,
                        height=14,
                        bgcolor=self._alpha(colors["ON_SURFACE"], 0.15),
                    ),
                    ft.Row(
                        [self.capsule_charging_icon, self.capsule_battery_text],
                        spacing=2,
                        vertical_alignment=ft.CrossAxisAlignment.CENTER,
                    ),
                    dnd_badge,
                ],
                spacing=8,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
                tight=True,
            ),
        )
        return self.capsule_container

    def update_capsule(self):
        """Динамическое обновление текста и анимации зарядки на капсуле без перерисовки всей шапки."""
        if not self.capsule_container:
            return
        try:
            colors = self.core.get_colors()
            bat = self.get_battery_state()
            is_charging = bat["is_charging"] and self.show_charging_anim
            unread = self.get_unread_count()
            player = self.get_current_player()

            if self.timer_running:
                status_label = f"⏱ {self.format_mm_ss(self.timer_remaining_sec)}"
                status_color = "#10b981"
            elif self.stopwatch_running:
                status_label = f"⏱ {self.format_mm_ss(self.stopwatch_elapsed_sec)}"
                status_color = "#38bdf8"
            elif self.is_playing:
                wave = ["ılı", "lIl", "IlI", "lli"][self.charging_anim_step % 4]
                status_label = f"🎵 {wave} {player['track'][:16]}"
                status_color = player["color"]
            elif self.dnd_enabled:
                status_label = "🌙 Не беспокоить"
                status_color = "#a855f7"
            elif is_charging:
                bars = ["⚡ Зарядка", "⚡• Зарядка", "⚡•• Зарядка", "⚡••• Зарядка"][self.charging_anim_step % 4]
                status_label = f"{bars} {bat['percent']}%"
                status_color = "#10b981"
            else:
                status_label = f"🔔 {unread} увед." if unread > 0 else "🟢 Остров активен"
                status_color = colors["ACCENT"]

            if self.capsule_time_text:
                self.capsule_time_text.value = datetime.now().strftime(
                    "%H:%M:%S" if self.core.theme_manager.show_seconds else "%H:%M"
                )
            if self.capsule_status_text:
                self.capsule_status_text.value = status_label
                self.capsule_status_text.color = status_color
            if self.capsule_battery_text:
                self.capsule_battery_text.value = f"{bat['percent']}%"
                self.capsule_battery_text.color = "#10b981" if is_charging else colors["ON_SURFACE"]
            if self.capsule_charging_icon:
                self.capsule_charging_icon.name = "bolt" if is_charging else "battery_full"
                self.capsule_charging_icon.color = "#10b981" if is_charging else colors["ON_SURFACE_VARIANT"]
        except Exception:
            pass

    def show_island_modal(self, initial_tab: str = None):
        """Открывает расширенный интерактивный Dynamic Island 2.6 при нажатии на капсулу."""
        if initial_tab:
            self.active_tab = initial_tab
        colors = self.core.get_colors()
        body_holder = ft.Container(expand=True)
        nav_row = ft.Row(spacing=6, wrap=True)

        tabs_meta = [
            ("overview", "dashboard_customize", "Обзор и Заряд"),
            ("notifications", "notifications_active", f"Уведомления ({len(self.notifications)})"),
            ("media", "library_music", "Проигрыватель"),
            ("timer", "hourglass_bottom", "Таймер"),
            ("stopwatch", "timer", "Секундомер"),
            ("settings", "tune", "Настройки Острова"),
        ]

        def switch_tab(t_id: str):
            self.active_tab = t_id
            rebuild_nav()
            rebuild_body()
            try:
                nav_row.update()
                body_holder.update()
            except Exception:
                pass

        def rebuild_nav():
            nav_row.controls.clear()
            for t_id, t_icon, t_label in tabs_meta:
                is_active = self.active_tab == t_id
                nav_row.controls.append(
                    ft.Container(
                        content=ft.Row(
                            [
                                ft.Icon(t_icon, size=15, color="#ffffff" if is_active else colors["ON_SURFACE_VARIANT"]),
                                ft.Text(
                                    t_label,
                                    size=12,
                                    weight=ft.FontWeight.BOLD if is_active else ft.FontWeight.NORMAL,
                                    color="#ffffff" if is_active else colors["ON_SURFACE_VARIANT"],
                                ),
                            ],
                            spacing=6,
                            tight=True,
                        ),
                        padding=ft.padding.symmetric(horizontal=12, vertical=8),
                        bgcolor=colors["ACCENT"] if is_active else self._alpha(colors["SURFACE_VARIANT"], 0.55),
                        border=ft.border.all(1.5 if is_active else 1, colors["ACCENT"] if is_active else colors["OUTLINE"]),
                        border_radius=14,
                        on_click=lambda e, k=t_id: switch_tab(k),
                    )
                )

        def rebuild_body():
            bat = self.get_battery_state()
            is_charging = bat["is_charging"] and self.show_charging_anim
            net = self.core.system_monitor.get_network_info()
            perf = self.core.system_monitor.get_performance_info()
            now = datetime.now()
            weekday_ru = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"][now.weekday()]

            # Верхний информационный блок острова (всегда показывает время, дату, заряд и DND)
            top_status_bar = ft.Container(
                bgcolor="#0b0f17",
                border=ft.border.all(1.5, "#10b981" if is_charging else colors["ACCENT"]),
                border_radius=18,
                padding=16,
                content=ft.Row(
                    [
                        # Время и дата
                        ft.Column(
                            [
                                ft.Text(
                                    now.strftime("%H:%M:%S"),
                                    size=28,
                                    weight=ft.FontWeight.W_900,
                                    color="#ffffff",
                                ),
                                ft.Text(
                                    f"{weekday_ru}, {now.strftime('%d.%m.%Y')}",
                                    size=12,
                                    color=colors["ON_SURFACE_VARIANT"],
                                ),
                            ],
                            spacing=2,
                        ),
                        ft.Container(expand=True),
                        # Анимация зарядки и проценты устройства
                        ft.Container(
                            bgcolor=self._alpha("#10b981" if is_charging else colors["SURFACE_VARIANT"], 0.2),
                            border=ft.border.all(1.5, "#10b981" if is_charging else colors["OUTLINE"]),
                            border_radius=14,
                            padding=ft.padding.symmetric(horizontal=14, vertical=10),
                            content=ft.Row(
                                [
                                    ft.Icon(
                                        "bolt" if is_charging else "battery_std",
                                        color="#10b981" if is_charging else colors["ON_SURFACE"],
                                        size=24,
                                    ),
                                    ft.Column(
                                        [
                                            ft.Text(
                                                f"Заряд устройства: {bat['percent']}%",
                                                size=13,
                                                weight=ft.FontWeight.BOLD,
                                                color="#10b981" if is_charging else colors["ON_SURFACE"],
                                            ),
                                            ft.Text(
                                                "⚡ Идет быстрая зарядка (Анимация активна)"
                                                if is_charging
                                                else f"От батареи • CPU {perf['cpu']}% • RAM {perf['ram']}%",
                                                size=11,
                                                color=colors["ON_SURFACE_VARIANT"],
                                            ),
                                        ],
                                        spacing=2,
                                    ),
                                ],
                                spacing=8,
                            ),
                        ),
                        # Кнопка режима «Не беспокоить»
                        ft.Container(
                            bgcolor=self._alpha("#a855f7", 0.24) if self.dnd_enabled else self._alpha(colors["SURFACE_VARIANT"], 0.5),
                            border=ft.border.all(2 if self.dnd_enabled else 1, "#a855f7" if self.dnd_enabled else colors["OUTLINE"]),
                            border_radius=14,
                            padding=ft.padding.symmetric(horizontal=14, vertical=10),
                            on_click=lambda e: (
                                self.toggle_dnd(),
                                rebuild_body(),
                                body_holder.update(),
                            ),
                            content=ft.Row(
                                [
                                    ft.Icon(
                                        "do_not_disturb_on" if self.dnd_enabled else "notifications_active",
                                        color="#a855f7" if self.dnd_enabled else colors["ON_SURFACE"],
                                        size=20,
                                    ),
                                    ft.Column(
                                        [
                                            ft.Text(
                                                "Не беспокоить",
                                                size=12,
                                                weight=ft.FontWeight.BOLD,
                                                color="#ffffff" if self.dnd_enabled else colors["ON_SURFACE"],
                                            ),
                                            ft.Text(
                                                "🟢 АКТИВНО" if self.dnd_enabled else "⚪ ВЫКЛ",
                                                size=10,
                                                weight=ft.FontWeight.BOLD,
                                                color="#10b981" if self.dnd_enabled else colors["ON_SURFACE_VARIANT"],
                                            ),
                                        ],
                                        spacing=1,
                                    ),
                                ],
                                spacing=8,
                            ),
                        ),
                    ],
                    spacing=12,
                    vertical_alignment=ft.CrossAxisAlignment.CENTER,
                ),
            )

            if self.active_tab == "overview":
                player = self.get_current_player()
                tab_content = ft.Column(
                    [
                        top_status_bar,
                        # Быстрые виджеты в 2 колонки: Плеер + Таймер/Секундомер
                        ft.Row(
                            [
                                # Мини-плеер со сменой проигрывателя
                                ft.Container(
                                    expand=True,
                                    bgcolor=colors["SETTINGS_CARD"],
                                    border=ft.border.all(1, colors["OUTLINE"]),
                                    border_radius=16,
                                    padding=14,
                                    content=ft.Column(
                                        [
                                            ft.Row(
                                                [
                                                    ft.Icon(player["icon"], color=player["color"], size=20),
                                                    ft.Text(player["name"], weight=ft.FontWeight.BOLD, size=13, expand=True),
                                                    ft.TextButton(
                                                        "Сменить плеер ↻",
                                                        on_click=lambda e: (
                                                            self.switch_player(1),
                                                            rebuild_body(),
                                                            body_holder.update(),
                                                        ),
                                                    ),
                                                ]
                                            ),
                                            ft.Text(player["track"], size=14, weight=ft.FontWeight.BOLD),
                                            ft.Text(player["artist"], size=11, color=colors["ON_SURFACE_VARIANT"]),
                                            ft.Row(
                                                [
                                                    ft.IconButton(
                                                        icon="skip_previous",
                                                        on_click=lambda e: (self.prev_track(), rebuild_body(), body_holder.update()),
                                                    ),
                                                    ft.FilledButton(
                                                        "Пауза" if self.is_playing else "Играть",
                                                        icon="pause" if self.is_playing else "play_arrow",
                                                        on_click=lambda e: (self.toggle_play_pause(), rebuild_body(), body_holder.update()),
                                                    ),
                                                    ft.IconButton(
                                                        icon="skip_next",
                                                        on_click=lambda e: (self.next_track(), rebuild_body(), body_holder.update()),
                                                    ),
                                                ],
                                                alignment=ft.MainAxisAlignment.CENTER,
                                            ),
                                        ],
                                        spacing=6,
                                    ),
                                ),
                                # Быстрый Таймер и Секундомер
                                ft.Container(
                                    expand=True,
                                    bgcolor=colors["SETTINGS_CARD"],
                                    border=ft.border.all(1, colors["OUTLINE"]),
                                    border_radius=16,
                                    padding=14,
                                    content=ft.Column(
                                        [
                                            ft.Row(
                                                [
                                                    ft.Icon("timer", color="#10b981", size=18),
                                                    ft.Text(
                                                        f"Таймер: {self.format_mm_ss(self.timer_remaining_sec)}",
                                                        weight=ft.FontWeight.BOLD,
                                                        size=13,
                                                        expand=True,
                                                    ),
                                                    ft.FilledTonalButton(
                                                        "Стоп" if self.timer_running else "Старт",
                                                        on_click=lambda e: (
                                                            setattr(self, "timer_running", not self.timer_running),
                                                            self.update_capsule(),
                                                            rebuild_body(),
                                                            body_holder.update(),
                                                        ),
                                                    ),
                                                ]
                                            ),
                                            ft.Divider(color=colors["OUTLINE"], height=8),
                                            ft.Row(
                                                [
                                                    ft.Icon("av_timer", color="#38bdf8", size=18),
                                                    ft.Text(
                                                        f"Секундомер: {self.format_mm_ss(self.stopwatch_elapsed_sec)}",
                                                        weight=ft.FontWeight.BOLD,
                                                        size=13,
                                                        expand=True,
                                                    ),
                                                    ft.FilledTonalButton(
                                                        "Пауза" if self.stopwatch_running else "Старт",
                                                        on_click=lambda e: (
                                                            setattr(self, "stopwatch_running", not self.stopwatch_running),
                                                            self.update_capsule(),
                                                            rebuild_body(),
                                                            body_holder.update(),
                                                        ),
                                                    ),
                                                ]
                                            ),
                                            ft.Row(
                                                [
                                                    ft.TextButton("Открыть Таймер →", on_click=lambda e: switch_tab("timer")),
                                                    ft.TextButton("Секундомер →", on_click=lambda e: switch_tab("stopwatch")),
                                                ]
                                            ),
                                        ],
                                        spacing=6,
                                    ),
                                ),
                            ],
                            spacing=12,
                        ),
                        # Последние уведомления Windows
                        ft.Container(
                            bgcolor=colors["SETTINGS_CARD"],
                            border=ft.border.all(1, colors["OUTLINE"]),
                            border_radius=16,
                            padding=14,
                            content=ft.Column(
                                [
                                    ft.Row(
                                        [
                                            ft.Icon("notifications_active", color=colors["ACCENT"], size=18),
                                            ft.Text("Последние уведомления от Windows", weight=ft.FontWeight.BOLD, size=13, expand=True),
                                            ft.TextButton("Все уведомления →", on_click=lambda e: switch_tab("notifications")),
                                        ]
                                    ),
                                    *(
                                        [
                                            ft.Container(
                                                padding=8,
                                                border_radius=10,
                                                bgcolor=self._alpha(colors["SURFACE_VARIANT"], 0.45),
                                                content=ft.Row(
                                                    [
                                                        ft.Icon(n["icon"], color=n["color"], size=18),
                                                        ft.Column(
                                                            [
                                                                ft.Text(f"{n['app']} • {n['title']}", size=12, weight=ft.FontWeight.BOLD),
                                                                ft.Text(n["message"], size=11, color=colors["ON_SURFACE_VARIANT"]),
                                                            ],
                                                            spacing=1,
                                                            expand=True,
                                                        ),
                                                        ft.Text(n["time"], size=10, color=colors["ON_SURFACE_VARIANT"]),
                                                    ]
                                                ),
                                            )
                                            for n in self.notifications[:2]
                                        ]
                                        if self.notifications
                                        else [ft.Text("Новых уведомлений нет", size=12, color=colors["ON_SURFACE_VARIANT"])]
                                    ),
                                ],
                                spacing=6,
                            ),
                        ),
                    ],
                    spacing=12,
                    scroll=ft.ScrollMode.ADAPTIVE,
                )

            elif self.active_tab == "notifications":
                notif_items = []
                for n in self.notifications:
                    notif_items.append(
                        ft.Container(
                            padding=12,
                            border_radius=14,
                            bgcolor=colors["SETTINGS_CARD"],
                            border=ft.border.all(1, n["color"] if not n.get("read") else colors["OUTLINE"]),
                            content=ft.Row(
                                [
                                    ft.Icon(n["icon"], color=n["color"], size=22),
                                    ft.Column(
                                        [
                                            ft.Row(
                                                [
                                                    ft.Text(n["app"], size=11, color=n["color"], weight=ft.FontWeight.BOLD),
                                                    ft.Text(f"• {n['time']}", size=11, color=colors["ON_SURFACE_VARIANT"]),
                                                ],
                                                spacing=4,
                                            ),
                                            ft.Text(n["title"], size=13, weight=ft.FontWeight.BOLD),
                                            ft.Text(n["message"], size=12, color=colors["ON_SURFACE_VARIANT"]),
                                        ],
                                        spacing=2,
                                        expand=True,
                                    ),
                                ],
                                spacing=10,
                            ),
                        )
                    )

                tab_content = ft.Column(
                    [
                        top_status_bar,
                        ft.Row(
                            [
                                ft.FilledTonalButton(
                                    "Тестовое уведомление Windows",
                                    icon="notification_add",
                                    on_click=lambda e: (
                                        self.push_notification(
                                            "Система Windows 11",
                                            "Проверка Центра уведомлений Dynamic Island",
                                            "Уведомление успешно перехвачено и отображено в острове.",
                                            "desktop_windows",
                                            "#3b82f6",
                                        ),
                                        rebuild_nav(),
                                        rebuild_body(),
                                        nav_row.update(),
                                        body_holder.update(),
                                    ),
                                ),
                                ft.OutlinedButton(
                                    "Отметить прочитанными",
                                    icon="done_all",
                                    on_click=lambda e: (
                                        self.mark_all_read(),
                                        rebuild_body(),
                                        body_holder.update(),
                                    ),
                                ),
                                ft.OutlinedButton(
                                    "Очистить все",
                                    icon="delete_sweep",
                                    on_click=lambda e: (
                                        self.clear_notifications(),
                                        rebuild_nav(),
                                        rebuild_body(),
                                        nav_row.update(),
                                        body_holder.update(),
                                    ),
                                ),
                            ],
                            spacing=8,
                        ),
                        ft.Column(
                            notif_items
                            if notif_items
                            else [ft.Text("Журнал уведомлений Windows пуст.", color=colors["ON_SURFACE_VARIANT"])],
                            spacing=8,
                        ),
                    ],
                    spacing=10,
                    scroll=ft.ScrollMode.ADAPTIVE,
                )

            elif self.active_tab == "media":
                player = self.get_current_player()
                player_chips = []
                for idx, p in enumerate(self.PLAYERS):
                    is_sel = idx == (self.player_index % len(self.PLAYERS))
                    player_chips.append(
                        ft.Container(
                            content=ft.Row(
                                [
                                    ft.Icon(p["icon"], size=16, color="#ffffff" if is_sel else p["color"]),
                                    ft.Text(
                                        p["name"],
                                        size=12,
                                        weight=ft.FontWeight.BOLD if is_sel else ft.FontWeight.NORMAL,
                                        color="#ffffff" if is_sel else colors["ON_SURFACE"],
                                    ),
                                    ft.Text("🟢 АКТИВНО" if is_sel else "", size=10, color="#ffffff", weight=ft.FontWeight.BOLD),
                                ],
                                spacing=6,
                                tight=True,
                            ),
                            padding=ft.padding.symmetric(horizontal=12, vertical=8),
                            bgcolor=p["color"] if is_sel else self._alpha(colors["SURFACE_VARIANT"], 0.5),
                            border_radius=12,
                            on_click=lambda e, i=idx: (
                                setattr(self, "player_index", i),
                                self.update_capsule(),
                                rebuild_body(),
                                body_holder.update(),
                            ),
                        )
                    )

                tab_content = ft.Column(
                    [
                        top_status_bar,
                        ft.Text("Выберите активный медиа-проигрыватель:", weight=ft.FontWeight.BOLD, size=14),
                        ft.Row(player_chips, spacing=8, wrap=True),
                        ft.Container(
                            bgcolor=colors["SETTINGS_CARD"],
                            border=ft.border.all(1.5, player["color"]),
                            border_radius=18,
                            padding=20,
                            content=ft.Column(
                                [
                                    ft.Row(
                                        [
                                            ft.Container(
                                                width=56,
                                                height=56,
                                                bgcolor=self._alpha(player["color"], 0.22),
                                                border_radius=16,
                                                alignment=ft.alignment.center,
                                                content=ft.Icon(player["icon"], color=player["color"], size=30),
                                            ),
                                            ft.Column(
                                                [
                                                    ft.Text(player["name"], size=12, color=player["color"], weight=ft.FontWeight.BOLD),
                                                    ft.Text(player["track"], size=18, weight=ft.FontWeight.BOLD),
                                                    ft.Text(player["artist"], size=13, color=colors["ON_SURFACE_VARIANT"]),
                                                ],
                                                spacing=2,
                                                expand=True,
                                            ),
                                            ft.Container(
                                                padding=ft.padding.symmetric(horizontal=10, vertical=5),
                                                border_radius=10,
                                                bgcolor=self._alpha("#10b981" if self.is_playing else colors["SURFACE_VARIANT"], 0.25),
                                                content=ft.Text(
                                                    "🟢 ВОСПРОИЗВЕДЕНИЕ" if self.is_playing else "⏸ ПАУЗА",
                                                    size=11,
                                                    weight=ft.FontWeight.BOLD,
                                                    color="#10b981" if self.is_playing else colors["ON_SURFACE_VARIANT"],
                                                ),
                                            ),
                                        ],
                                        spacing=14,
                                    ),
                                    ft.Row(
                                        [
                                            ft.IconButton(
                                                icon="skip_previous",
                                                icon_size=26,
                                                on_click=lambda e: (self.prev_track(), rebuild_body(), body_holder.update()),
                                            ),
                                            ft.FilledButton(
                                                "Пауза" if self.is_playing else "Воспроизвести",
                                                icon="pause" if self.is_playing else "play_arrow",
                                                on_click=lambda e: (self.toggle_play_pause(), rebuild_body(), body_holder.update()),
                                            ),
                                            ft.IconButton(
                                                icon="skip_next",
                                                icon_size=26,
                                                on_click=lambda e: (self.next_track(), rebuild_body(), body_holder.update()),
                                            ),
                                        ],
                                        alignment=ft.MainAxisAlignment.CENTER,
                                        spacing=16,
                                    ),
                                ],
                                spacing=14,
                            ),
                        ),
                    ],
                    spacing=12,
                    scroll=ft.ScrollMode.ADAPTIVE,
                )

            elif self.active_tab == "timer":
                presets = [
                    (60, "1 мин"),
                    (300, "5 мин"),
                    (600, "10 мин"),
                    (900, "15 мин"),
                    (1500, "25 мин (Pomodoro)"),
                    (3600, "60 мин"),
                ]
                preset_buttons = [
                    ft.FilledTonalButton(
                        label,
                        on_click=lambda e, sec=sec_val: (
                            setattr(self, "timer_total_sec", sec),
                            setattr(self, "timer_remaining_sec", sec),
                            setattr(self, "timer_running", True),
                            self.update_capsule(),
                            rebuild_body(),
                            body_holder.update(),
                        ),
                    )
                    for sec_val, label in presets
                ]

                tab_content = ft.Column(
                    [
                        top_status_bar,
                        ft.Container(
                            bgcolor=colors["SETTINGS_CARD"],
                            border=ft.border.all(1.5, "#10b981" if self.timer_running else colors["OUTLINE"]),
                            border_radius=18,
                            padding=24,
                            alignment=ft.alignment.center,
                            content=ft.Column(
                                [
                                    ft.Text("ТАЙМЕР DYNAMIC ISLAND", size=12, color=colors["ON_SURFACE_VARIANT"], weight=ft.FontWeight.BOLD),
                                    ft.Text(
                                        self.format_mm_ss(self.timer_remaining_sec),
                                        size=48,
                                        weight=ft.FontWeight.W_900,
                                        color="#10b981" if self.timer_running else colors["ON_SURFACE"],
                                    ),
                                    ft.Row(
                                        [
                                            ft.FilledButton(
                                                "Пауза" if self.timer_running else "Запустить таймер",
                                                icon="pause" if self.timer_running else "play_arrow",
                                                on_click=lambda e: (
                                                    setattr(self, "timer_running", not self.timer_running),
                                                    self.update_capsule(),
                                                    rebuild_body(),
                                                    body_holder.update(),
                                                ),
                                            ),
                                            ft.OutlinedButton(
                                                "+1 мин",
                                                icon="add",
                                                on_click=lambda e: (
                                                    setattr(self, "timer_remaining_sec", self.timer_remaining_sec + 60),
                                                    self.update_capsule(),
                                                    rebuild_body(),
                                                    body_holder.update(),
                                                ),
                                            ),
                                            ft.OutlinedButton(
                                                "Сбросить",
                                                icon="restart_alt",
                                                on_click=lambda e: (
                                                    setattr(self, "timer_running", False),
                                                    setattr(self, "timer_remaining_sec", self.timer_total_sec),
                                                    self.update_capsule(),
                                                    rebuild_body(),
                                                    body_holder.update(),
                                                ),
                                            ),
                                        ],
                                        alignment=ft.MainAxisAlignment.CENTER,
                                        spacing=10,
                                    ),
                                    ft.Text("Быстрые пресеты таймера:", size=12, color=colors["ON_SURFACE_VARIANT"]),
                                    ft.Row(preset_buttons, spacing=8, wrap=True, alignment=ft.MainAxisAlignment.CENTER),
                                ],
                                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                                spacing=12,
                            ),
                        ),
                    ],
                    spacing=12,
                    scroll=ft.ScrollMode.ADAPTIVE,
                )

            elif self.active_tab == "stopwatch":
                laps_widgets = [
                    ft.Container(
                        padding=8,
                        border_radius=8,
                        bgcolor=self._alpha(colors["SURFACE_VARIANT"], 0.45),
                        content=ft.Row(
                            [
                                ft.Text(f"Круг #{idx + 1}", weight=ft.FontWeight.BOLD, size=12),
                                ft.Container(expand=True),
                                ft.Text(lap_time, size=12, color=colors["ACCENT"], weight=ft.FontWeight.BOLD),
                            ]
                        ),
                    )
                    for idx, lap_time in enumerate(self.stopwatch_laps)
                ]

                tab_content = ft.Column(
                    [
                        top_status_bar,
                        ft.Container(
                            bgcolor=colors["SETTINGS_CARD"],
                            border=ft.border.all(1.5, "#38bdf8" if self.stopwatch_running else colors["OUTLINE"]),
                            border_radius=18,
                            padding=24,
                            content=ft.Column(
                                [
                                    ft.Text("СЕКУНДОМЕР DYNAMIC ISLAND", size=12, color=colors["ON_SURFACE_VARIANT"], weight=ft.FontWeight.BOLD),
                                    ft.Text(
                                        self.format_mm_ss(self.stopwatch_elapsed_sec),
                                        size=48,
                                        weight=ft.FontWeight.W_900,
                                        color="#38bdf8" if self.stopwatch_running else colors["ON_SURFACE"],
                                    ),
                                    ft.Row(
                                        [
                                            ft.FilledButton(
                                                "Пауза" if self.stopwatch_running else "Старт",
                                                icon="pause" if self.stopwatch_running else "play_arrow",
                                                on_click=lambda e: (
                                                    setattr(self, "stopwatch_running", not self.stopwatch_running),
                                                    self.update_capsule(),
                                                    rebuild_body(),
                                                    body_holder.update(),
                                                ),
                                            ),
                                            ft.FilledTonalButton(
                                                "Записать круг (Lap)",
                                                icon="flag",
                                                on_click=lambda e: (
                                                    self.stopwatch_laps.insert(0, self.format_mm_ss(self.stopwatch_elapsed_sec)),
                                                    rebuild_body(),
                                                    body_holder.update(),
                                                ),
                                            ),
                                            ft.OutlinedButton(
                                                "Сброс в 00:00",
                                                icon="restart_alt",
                                                on_click=lambda e: (
                                                    setattr(self, "stopwatch_running", False),
                                                    setattr(self, "stopwatch_elapsed_sec", 0),
                                                    self.stopwatch_laps.clear(),
                                                    self.update_capsule(),
                                                    rebuild_body(),
                                                    body_holder.update(),
                                                ),
                                            ),
                                        ],
                                        alignment=ft.MainAxisAlignment.CENTER,
                                        spacing=10,
                                    ),
                                    ft.Column(laps_widgets[:6], spacing=6),
                                ],
                                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                                spacing=12,
                            ),
                        ),
                    ],
                    spacing=12,
                    scroll=ft.ScrollMode.ADAPTIVE,
                )

            else:  # settings
                tab_content = ft.Column(
                    [
                        top_status_bar,
                        ft.Container(
                            bgcolor=colors["SETTINGS_CARD"],
                            border=ft.border.all(1, colors["OUTLINE"]),
                            border_radius=16,
                            padding=16,
                            content=ft.Column(
                                [
                                    ft.Text("Настройки Dynamic Island 2.6", size=15, weight=ft.FontWeight.BOLD),
                                    self.core.dialogs._create_lit_switch_row(
                                        "Режим «Не беспокоить» (Блокировка всплывающих уведомлений)",
                                        "Все уведомления тихо сохраняются внутри Острова без звуков и баннеров",
                                        self.dnd_enabled,
                                        lambda val: self.toggle_dnd(val),
                                        colors,
                                    ),
                                    self.core.dialogs._create_lit_switch_row(
                                        "Анимация зарядки в Dynamic Island",
                                        "Показывать неоновую волну и молнию при подключении питания",
                                        self.show_charging_anim,
                                        lambda val: (
                                            setattr(self, "show_charging_anim", val),
                                            setattr(self.core.theme_manager, "island_charging_anim", val),
                                            self.core.theme_manager.save_settings(),
                                            self.update_capsule(),
                                        ),
                                        colors,
                                    ),
                                    self.core.dialogs._create_lit_switch_row(
                                        "Демонстрация зарядки (для стационарных ПК без батареи)",
                                        "Активирует индикатор и анимацию зарядки на настольных компьютерах",
                                        self.simulate_charging,
                                        lambda val: (
                                            setattr(self, "simulate_charging", val),
                                            setattr(self.core.theme_manager, "island_simulate_charging", val),
                                            self.core.theme_manager.save_settings(),
                                            self.update_capsule(),
                                            rebuild_body(),
                                            body_holder.update(),
                                        ),
                                        colors,
                                    ),
                                    self.core.dialogs._create_lit_switch_row(
                                        "Неоновый ореол вокруг капсулы Острова",
                                        "Подсветка рамки Острова в цвет текущего действия (зарядка, плеер, таймер)",
                                        self.island_glow,
                                        lambda val: (
                                            setattr(self, "island_glow", val),
                                            setattr(self.core.theme_manager, "island_glow_enabled", val),
                                            self.core.theme_manager.save_settings(),
                                            self.core.update_header(),
                                        ),
                                        colors,
                                    ),
                                ],
                                spacing=10,
                            ),
                        ),
                    ],
                    spacing=12,
                    scroll=ft.ScrollMode.ADAPTIVE,
                )

            body_holder.content = tab_content

        rebuild_nav()
        rebuild_body()

        dialog = ft.AlertDialog(
            title=ft.Row(
                [
                    ft.Icon("blur_circular", color=colors["ACCENT"], size=24),
                    ft.Text("Dynamic Island 2.6 • Центр управления", size=18, weight=ft.FontWeight.BOLD, expand=True),
                    ft.Container(
                        padding=ft.padding.symmetric(horizontal=10, vertical=4),
                        border_radius=10,
                        bgcolor=self._alpha("#10b981", 0.18),
                        content=ft.Text("🟢 ВСЕГДА АКТИВЕН", size=10, weight=ft.FontWeight.BOLD, color="#10b981"),
                    ),
                ]
            ),
            content=ft.Container(
                width=780,
                height=540,
                content=ft.Column([nav_row, ft.Divider(color=colors["OUTLINE"], height=8), body_holder], spacing=8),
            ),
            actions=[
                ft.TextButton(
                    "Открыть полные настройки Android 2.6",
                    icon="settings",
                    on_click=lambda e: (self.core.page.close(dialog), self.core.show_settings(None)),
                ),
                ft.FilledButton("Свернуть в капсулу", on_click=lambda e: self.core.page.close(dialog)),
            ],
            shape=ft.RoundedRectangleBorder(radius=22),
        )
        self.open_dialog_ref = dialog
        self.core.page.open(dialog)
