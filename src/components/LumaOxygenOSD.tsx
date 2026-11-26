import React, { useEffect, useRef, useState } from 'react';
import {
  Bluetooth,
  Mic,
  MicOff,
  Music2,
  Sun,
  Video,
  Volume2,
  VolumeX,
  Lock,
} from 'lucide-react';

export interface OxygenOsdBanner {
  id: number;
  kind: 'volume' | 'brightness' | 'capslock' | 'numlock' | 'mic' | 'bluetooth' | 'track';
  title: string;
  subtitle?: string;
  percent?: number;
  active?: boolean;
}

interface LumaOxygenOSDProps {
  isDark: boolean;
  volume: number;
  muted: boolean;
  brightness: number;
  mediaTitle?: string;
  mediaArtist?: string;
  bluetoothBatteryDevices?: { name: string; battery: number }[];
  onWindowRulesRuntime?: (dnd: boolean, disableCompositor: boolean) => void;
}

export const LumaOxygenOSD: React.FC<LumaOxygenOSDProps> = ({
  isDark,
  volume,
  muted,
  brightness,
  mediaTitle,
  mediaArtist,
  bluetoothBatteryDevices = [],
  onWindowRulesRuntime,
}) => {
  const [banner, setBanner] = useState<OxygenOsdBanner | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [micMuted, setMicMuted] = useState(false);

  const timerRef = useRef<number | null>(null);
  const prevVolRef = useRef(volume);
  const prevMuteRef = useRef(muted);
  const prevBrightRef = useRef(brightness);
  const prevTrackRef = useRef(mediaTitle || '');
  const prevCapsRef = useRef<boolean | null>(null);
  const prevNumRef = useRef<boolean | null>(null);
  const prevMicRef = useRef<boolean | null>(null);
  const mountedRef = useRef(false);

  const showOsd = (next: Omit<OxygenOsdBanner, 'id'>) => {
    setBanner({ ...next, id: Date.now() });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setBanner(null), 2400);
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      mountedRef.current = true;
    }, 900);
    return () => window.clearTimeout(id);
  }, []);

  // Volume / Mute Oxygen Capsule OSD
  useEffect(() => {
    if (!mountedRef.current) {
      prevVolRef.current = volume;
      prevMuteRef.current = muted;
      return;
    }
    if (volume !== prevVolRef.current || muted !== prevMuteRef.current) {
      prevVolRef.current = volume;
      prevMuteRef.current = muted;
      showOsd({
        kind: 'volume',
        title: muted ? 'Звук выключен' : `Громкость · ${volume}%`,
        subtitle: bluetoothBatteryDevices[0] ? `${bluetoothBatteryDevices[0].name} · ${bluetoothBatteryDevices[0].battery}%` : 'Аудиовыход Oxygen',
        percent: muted ? 0 : volume,
        active: !muted,
      });
    }
  }, [volume, muted, bluetoothBatteryDevices]);

  // Brightness Oxygen Capsule OSD
  useEffect(() => {
    if (!mountedRef.current) {
      prevBrightRef.current = brightness;
      return;
    }
    if (brightness !== prevBrightRef.current) {
      prevBrightRef.current = brightness;
      showOsd({
        kind: 'brightness',
        title: `Яркость экрана · ${brightness}%`,
        subtitle: 'Дисплей Oxygen Cryo',
        percent: brightness,
        active: true,
      });
    }
  }, [brightness]);

  // Media Track Change OSD
  useEffect(() => {
    if (!mountedRef.current) {
      prevTrackRef.current = mediaTitle || '';
      return;
    }
    if (mediaTitle && mediaTitle !== prevTrackRef.current) {
      prevTrackRef.current = mediaTitle;
      showOsd({
        kind: 'track',
        title: mediaTitle,
        subtitle: mediaArtist || 'Сейчас играет',
        active: true,
      });
    }
  }, [mediaTitle, mediaArtist]);

  // Real-time Win32 CapsLock / NumLock / Mic Mute / Recording / KWin DND polling + custom event trigger
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/kernel/osd/state');
        if (!r.ok) return;
        const d = await r.json();
        if (!d?.ok) return;
        setRecording(Boolean(d.recording));
        setRecSec(Number(d.recording_sec || 0));
        setMicMuted(Boolean(d.mic_muted));
        onWindowRulesRuntime?.(Boolean(d.active_dnd), Boolean(d.disable_compositor));

        if (prevCapsRef.current !== null && prevCapsRef.current !== Boolean(d.caps_lock)) {
          showOsd({
            kind: 'capslock',
            title: d.caps_lock ? 'Caps Lock ВКЛ (АБВ)' : 'Caps Lock ВЫКЛ (абв)',
            subtitle: 'Индикатор клавиатуры Oxygen',
            active: Boolean(d.caps_lock),
          });
        }
        prevCapsRef.current = Boolean(d.caps_lock);

        if (prevNumRef.current !== null && prevNumRef.current !== Boolean(d.num_lock)) {
          showOsd({
            kind: 'numlock',
            title: d.num_lock ? 'Num Lock ВКЛ' : 'Num Lock ВЫКЛ',
            subtitle: 'Цифровой блок',
            active: Boolean(d.num_lock),
          });
        }
        prevNumRef.current = Boolean(d.num_lock);

        if (prevMicRef.current !== null && prevMicRef.current !== Boolean(d.mic_muted)) {
          showOsd({
            kind: 'mic',
            title: d.mic_muted ? 'Микрофон выключен' : 'Микрофон активен',
            subtitle: 'Аудиовход системы',
            active: !d.mic_muted,
          });
        }
        prevMicRef.current = Boolean(d.mic_muted);
      } catch {
        // ignore
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 950);

    const onCustomOsd = (e: Event) => {
      const det = (e as CustomEvent<Omit<OxygenOsdBanner, 'id'>>).detail;
      if (det?.title) showOsd(det);
    };
    window.addEventListener('luma-oxygen-osd', onCustomOsd);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('luma-oxygen-osd', onCustomOsd);
    };
  }, [onWindowRulesRuntime]);

  const fmtRec = `${String(Math.floor(recSec / 60)).padStart(2, '0')}:${String(recSec % 60).padStart(2, '0')}`;

  return (
    <>
      {/* Persistent Recording & Mic Muted Mini-Capsules (Top-Right corner, non-intrusive) */}
      {(recording || micMuted || bluetoothBatteryDevices.length > 0) && (
        <div className="fixed top-14 right-4 z-[9350] flex flex-col items-end gap-1.5 pointer-events-none select-none">
          {recording && (
            <div className="px-3 py-1.5 rounded-full bg-rose-600/90 border border-rose-300/45 text-white text-[11px] font-mono font-extrabold shadow-lg backdrop-blur-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <Video className="w-3.5 h-3.5" />
              REC {fmtRec}
            </div>
          )}
          {micMuted && (
            <div className="px-3 py-1 rounded-full bg-slate-900/85 border border-rose-400/40 text-rose-300 text-[10px] font-bold shadow-lg backdrop-blur-xl flex items-center gap-1.5">
              <MicOff className="w-3 h-3" /> Микрофон выкл
            </div>
          )}
          {bluetoothBatteryDevices.slice(0, 2).map((bt) => (
            <div
              key={bt.name}
              className="px-2.5 py-1 rounded-full bg-slate-950/80 border border-cyan-400/30 text-cyan-200 text-[10px] font-mono shadow-lg backdrop-blur-xl flex items-center gap-1.5"
            >
              <Bluetooth className="w-3 h-3 text-cyan-400" />
              <span className="max-w-[110px] truncate">{bt.name}</span>
              <span className="font-bold text-emerald-300">{bt.battery}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Translucent Oxygen / Material You Capsule OSD */}
      {banner && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9600] pointer-events-none select-none animate-in fade-in slide-in-from-bottom-3 duration-150">
          <div
            className={`min-w-[260px] max-w-[360px] px-4 py-3 rounded-[26px] border shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-2xl flex items-center gap-3.5 ${
              isDark
                ? 'bg-[#061124]/92 border-cyan-400/35 text-white'
                : 'bg-white/94 border-cyan-500/35 text-slate-900'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                banner.kind === 'mic' && !banner.active
                  ? 'bg-rose-500/20 text-rose-400'
                  : banner.kind === 'brightness'
                  ? 'bg-amber-500/20 text-amber-400'
                  : banner.kind === 'track'
                  ? 'bg-fuchsia-500/20 text-fuchsia-400'
                  : 'bg-cyan-500/20 text-cyan-400'
              }`}
            >
              {banner.kind === 'volume' && (banner.active ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />)}
              {banner.kind === 'brightness' && <Sun className="w-5 h-5" />}
              {banner.kind === 'mic' && (banner.active ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />)}
              {banner.kind === 'track' && <Music2 className="w-5 h-5" />}
              {banner.kind === 'bluetooth' && <Bluetooth className="w-5 h-5" />}
              {(banner.kind === 'capslock' || banner.kind === 'numlock') && <Lock className="w-5 h-5" />}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-xs font-extrabold truncate">{banner.title}</div>
              {banner.subtitle && <div className="text-[10px] opacity-65 truncate">{banner.subtitle}</div>}
              {typeof banner.percent === 'number' && (
                <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-150"
                    style={{ width: `${Math.max(0, Math.min(100, banner.percent))}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
