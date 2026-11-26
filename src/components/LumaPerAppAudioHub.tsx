import React, { useEffect, useState } from 'react';
import {
  Check,
  GripVertical,
  Headphones,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Speaker,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AudioEndpointInfo } from '../data/launcherData';

export interface PerAppAudioSession {
  pid: number;
  name: string;
  title: string;
  volume: number;
  muted: boolean;
  playing: boolean;
  icon_url: string;
}

export interface MediaPlayerSessionMini {
  id: string;
  source_app: string;
  display_name: string;
  title: string;
  artist: string;
  is_playing: boolean;
  is_current?: boolean;
}

interface LumaPerAppAudioHubProps {
  isDark: boolean;
  audioOutputs: AudioEndpointInfo[];
  activeAudioOutputId?: string;
  mediaSessions?: MediaPlayerSessionMini[];
  onSwitchAudioDevice?: (deviceId: string, kind: 'output' | 'input') => void;
  onMediaAction?: (action: 'playpause' | 'next' | 'prev', sessionId?: string) => void;
}

export const LumaPerAppAudioHub: React.FC<LumaPerAppAudioHubProps> = ({
  isDark,
  audioOutputs,
  activeAudioOutputId,
  mediaSessions = [],
  onSwitchAudioDevice,
  onMediaAction,
}) => {
  const [apps, setApps] = useState<PerAppAudioSession[]>([]);
  const [micMuted, setMicMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draggingPid, setDraggingPid] = useState<number | null>(null);
  const [hoverDeviceId, setHoverDeviceId] = useState<string | null>(null);

  const loadAudioApps = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/kernel/audio/apps');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.apps)) setApps(d.apps);
        if (typeof d?.mic_muted === 'boolean') setMicMuted(d.mic_muted);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAudioApps();
  }, []);

  const updateAppVolume = (pid: number, volume?: number, muted?: boolean) => {
    setApps((prev) =>
      prev.map((a) =>
        a.pid === pid
          ? {
              ...a,
              volume: volume !== undefined ? volume : a.volume,
              muted: muted !== undefined ? muted : a.muted,
            }
          : a
      )
    );
    void fetch('/api/kernel/audio/app-volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, volume, muted }),
    }).catch(() => {});
  };

  const toggleMic = async () => {
    const next = !micMuted;
    setMicMuted(next);
    try {
      await fetch('/api/kernel/audio/mic-mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: next }),
      });
      window.dispatchEvent(
        new CustomEvent('luma-oxygen-osd', {
          detail: {
            kind: 'mic',
            title: next ? 'Микрофон выключен' : 'Микрофон включён',
            subtitle: 'Per-App Audio Hub · Oxygen',
            active: !next,
          },
        })
      );
    } catch {
      // ignore
    }
  };

  const handleDropOnOutput = (dev: AudioEndpointInfo) => {
    setHoverDeviceId(null);
    setDraggingPid(null);
    onSwitchAudioDevice?.(dev.id, 'output');
    window.dispatchEvent(
      new CustomEvent('luma-oxygen-osd', {
        detail: {
          kind: 'volume',
          title: `Вывод: ${dev.name}`,
          subtitle: 'Переключено перетаскиванием (PipeWire / Oxygen)',
          active: true,
        },
      })
    );
  };

  return (
    <div className={`rounded-2xl border p-2.5 space-y-2.5 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-cyan-400">
          <Headphones size={12} />
          Per-App Audio & Media Hub
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => void toggleMic()}
            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${
              micMuted
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                : 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
            }`}
            title="Включить / выключить микрофон"
          >
            {micMuted ? <MicOff size={10} /> : <Mic size={10} />}
            {micMuted ? 'Мик ВЫКЛ' : 'Мик ВКЛ'}
          </button>
          <button
            onClick={() => void loadAudioApps()}
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            title="Обновить аудио-сессии"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin text-cyan-400' : 'opacity-70'} />
          </button>
        </div>
      </div>

      {/* Per-App Volume Sliders (Draggable onto Output Devices!) */}
      {apps.length === 0 ? (
        <div className="text-[10px] opacity-60 text-center py-2">Нет активных звуковых потоков приложений</div>
      ) : (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
          {apps.map((app) => (
            <div
              key={app.pid}
              draggable
              onDragStart={() => setDraggingPid(app.pid)}
              onDragEnd={() => {
                setDraggingPid(null);
                setHoverDeviceId(null);
              }}
              className={`p-2 rounded-xl border space-y-1 cursor-grab active:cursor-grabbing transition ${
                draggingPid === app.pid
                  ? 'border-cyan-400 bg-cyan-500/15'
                  : isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-white border-slate-200'
              }`}
              title="Перетащите приложение на устройство вывода ниже, чтобы переключить звук"
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <GripVertical size={11} className="opacity-40 shrink-0" />
                  <img src={app.icon_url} alt={app.name} className="w-4 h-4 rounded object-contain shrink-0" />
                  <span className="font-bold truncate">{app.title || app.name}</span>
                  {app.playing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono text-[10px] opacity-75">{app.muted ? '0%' : `${app.volume}%`}</span>
                  <button
                    onClick={() => updateAppVolume(app.pid, undefined, !app.muted)}
                    className={`p-1 rounded-md cursor-pointer ${app.muted ? 'bg-rose-500/20 text-rose-400' : 'hover:bg-white/10'}`}
                  >
                    {app.muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={app.muted ? 0 : app.volume}
                onChange={(e) => updateAppVolume(app.pid, Number(e.target.value), false)}
                className="w-full h-1.5 accent-cyan-400 cursor-pointer"
              />
            </div>
          ))}
        </div>
      )}

      {/* Drag & Drop Output Device Switcher Pills */}
      {audioOutputs.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] font-mono uppercase opacity-60">
            Устройства вывода {draggingPid ? '— отпустите приложение на устройство!' : '(клик или Drag & Drop)'}
          </div>
          <div className="flex flex-wrap gap-1">
            {audioOutputs.map((dev) => {
              const isAct = dev.id === activeAudioOutputId || dev.is_default;
              const isDropHover = hoverDeviceId === dev.id;
              return (
                <button
                  key={dev.id}
                  onClick={() => onSwitchAudioDevice?.(dev.id, 'output')}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoverDeviceId(dev.id);
                  }}
                  onDragLeave={() => setHoverDeviceId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnOutput(dev);
                  }}
                  className={`px-2 py-1 rounded-xl border text-[10px] font-semibold inline-flex items-center gap-1 max-w-full cursor-pointer transition ${
                    isDropHover
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 scale-105'
                      : isAct
                      ? 'bg-cyan-500/20 border-cyan-400/45 text-cyan-200'
                      : isDark
                      ? 'bg-white/[0.04] border-white/10 hover:bg-white/10'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Speaker size={10} className="shrink-0" />
                  <span className="truncate max-w-[140px]">{dev.name}</span>
                  {isAct && <Check size={10} className="text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Per-Player Media Session Controls */}
      {mediaSessions.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/10">
          <div className="text-[9px] font-mono uppercase opacity-60">Отдельные плееры ({mediaSessions.length})</div>
          {mediaSessions.map((ms) => (
            <div
              key={ms.id}
              className={`px-2 py-1.5 rounded-xl border flex items-center justify-between gap-2 text-[10px] ${
                isDark ? 'bg-black/25 border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">{ms.title || ms.display_name}</div>
                <div className="text-[9px] opacity-60 truncate">
                  {ms.display_name} {ms.artist ? `· ${ms.artist}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => onMediaAction?.('prev', ms.id)}
                  className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                  title="Предыдущий трек"
                >
                  <SkipBack size={11} />
                </button>
                <button
                  onClick={() => onMediaAction?.('playpause', ms.id)}
                  className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 cursor-pointer"
                  title="Пауза / Воспроизведение этого плеера"
                >
                  {ms.is_playing ? <Pause size={11} /> : <Play size={11} />}
                </button>
                <button
                  onClick={() => onMediaAction?.('next', ms.id)}
                  className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                  title="Следующий трек"
                >
                  <SkipForward size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
