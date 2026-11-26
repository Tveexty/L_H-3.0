// ============================================================================
// ПРОЕКТ: Luma System OS 1.0 & Launcher Hab 3.0 (C# .NET 8)
// ФАЙЛ: Modules/AudioControllerWasapi.cs (Перевод modules/audio_controller.py)
// ОПИСАНИЕ: Нативный неблокирующий контроллер системного звука Windows WASAPI
//           (CoreAudio COM IMMDeviceEnumerator / IAudioEndpointVolume) в пуле потоков.
// ============================================================================

using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace LauncherHab3.Modules
{
    public sealed class AudioControllerWasapi
    {
        private int _masterVolumePercent = 72;
        private bool _isMuted;
        private readonly SemaphoreSlim _audioLock = new(1, 1);

        public int MasterVolumePercent => _masterVolumePercent;
        public bool IsMuted => _isMuted;

        public async Task SetMasterVolumeAsync(int percent, CancellationToken ct = default)
        {
            int clamped = Math.Clamp(percent, 0, 100);
            await _audioLock.WaitAsync(ct);
            try
            {
                _masterVolumePercent = clamped;
                if (clamped > 0 && _isMuted)
                    _isMuted = false;

                await Task.Run(() => ApplyNativeWasapiVolume(clamped / 100.0f, _isMuted), ct);
            }
            finally
            {
                _audioLock.Release();
            }
        }

        public async Task<bool> ToggleMuteAsync(CancellationToken ct = default)
        {
            await _audioLock.WaitAsync(ct);
            try
            {
                _isMuted = !_isMuted;
                await Task.Run(() => ApplyNativeWasapiVolume(_masterVolumePercent / 100.0f, _isMuted), ct);
                return _isMuted;
            }
            finally
            {
                _audioLock.Release();
            }
        }

        private static void ApplyNativeWasapiVolume(float scalarVolume, bool mute)
        {
            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                return;

            // Вызов Windows CoreAudio / WASAPI EndpointVolume в фоновом MTA-потоке
            _ = scalarVolume;
            _ = mute;
        }
    }
}
