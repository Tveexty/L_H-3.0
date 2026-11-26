import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, FolderOpen, Layers, Sparkles } from 'lucide-react';

export interface HarmonyTransferPayload {
  id?: string;
  direction: 'receive' | 'send';
  fileName: string;
  path?: string;
  size?: number;
  isImage?: boolean;
  previewUrl?: string;
  device?: string;
}

interface LumaHarmonyTransferWaveProps {
  isDark: boolean;
  onPushToast?: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
}

function playHarmonyChime(direction: 'receive' | 'send') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const freqs = direction === 'receive' ? [659.25, 987.77, 1318.51] : [523.25, 783.99, 1046.5];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.065);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.045 / (idx + 1), now + idx * 0.065 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.065 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.6);
    });
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 900);
  } catch {
    // ignore audio autoplay restriction
  }
}

const SPARK_ANGLES = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);

export const LumaHarmonyTransferWave: React.FC<LumaHarmonyTransferWaveProps> = ({ isDark, onPushToast }) => {
  const [active, setActive] = useState<(HarmonyTransferPayload & { seq: number }) | null>(null);
  const timerRef = useRef<number | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const fireWave = useCallback((payload: HarmonyTransferPayload) => {
    const key = payload.id || `${payload.direction}_${payload.fileName}_${Date.now()}`;
    if (payload.id && seenIdsRef.current.has(payload.id)) return;
    seenIdsRef.current.add(key);
    if (seenIdsRef.current.size > 80) {
      const first = seenIdsRef.current.values().next().value;
      if (first) seenIdsRef.current.delete(first);
    }

    if (timerRef.current) window.clearTimeout(timerRef.current);
    setActive({ ...payload, seq: Date.now() });
    playHarmonyChime(payload.direction);

    timerRef.current = window.setTimeout(() => {
      setActive(null);
    }, 3200);
  }, []);

  // 1. Subscribe to real-time SSE stream from Oxygen Connect (/api/kernel/oxygen-connect/events)
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        es = new EventSource('/api/kernel/oxygen-connect/events');
        es.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg?.type === 'transfer' && msg?.event) {
              const ev = msg.event;
              fireWave({
                id: ev.id,
                direction: ev.direction === 'send' ? 'send' : 'receive',
                fileName: ev.file_name || 'Файл',
                path: ev.path,
                size: ev.size,
                isImage: Boolean(ev.is_image),
                previewUrl: ev.preview_url,
                device: ev.device || 'Android',
              });
            }
          } catch {
            // ignore malformed event
          }
        };
        es.onerror = () => {
          es?.close();
          es = null;
          if (!closed) {
            reconnectTimer = window.setTimeout(connect, 5000);
          }
        };
      } catch {
        // offline
      }
    };
    connect();

    // 2. Also listen for local desktop custom events (Drop Shelf, Send-to-Phone, Test Wave)
    const onCustom = (e: Event) => {
      const det = (e as CustomEvent<HarmonyTransferPayload>).detail;
      if (det && det.fileName) fireWave(det);
    };
    window.addEventListener('luma-harmony-transfer', onCustom);

    return () => {
      closed = true;
      es?.close();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener('luma-harmony-transfer', onCustom);
    };
  }, [fireWave]);

  if (!active) return null;

  const isReceive = active.direction === 'receive';
  const sizeLabel = active.size && active.size > 0
    ? active.size >= 1024 * 1024
      ? `${(active.size / (1024 * 1024)).toFixed(1)} МБ`
      : `${Math.max(1, Math.round(active.size / 1024))} КБ`
    : '';

  const openFile = () => {
    if (!active.path) return;
    void fetch('/api/kernel/fs/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: active.path }),
    }).catch(() => {});
  };

  return (
    <div
      key={active.seq}
      className="fixed inset-0 z-[9990] pointer-events-none flex items-center justify-center overflow-hidden select-none"
      aria-live="polite"
    >
      {/* Full-Screen Central Ambient Radial Light Wash */}
      <div
        className="absolute inset-0 luma-harmony-flash"
        style={{
          background: isReceive
            ? 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.42) 0%, rgba(6,182,212,0.22) 38%, rgba(56,189,248,0.08) 65%, transparent 82%)'
            : 'radial-gradient(circle at 50% 50%, rgba(56,189,248,0.42) 0%, rgba(99,102,241,0.22) 38%, rgba(168,85,247,0.08) 65%, transparent 82%)',
        }}
      />

      {/* 3 Expanding Concentric HarmonyOS Ripple Rings covering 100% of the viewport from center! */}
      <div
        className={`luma-harmony-ring luma-harmony-ring-1 ${isReceive ? 'luma-harmony-ring-rx' : 'luma-harmony-ring-tx'}`}
      />
      <div
        className={`luma-harmony-ring luma-harmony-ring-2 ${isReceive ? 'luma-harmony-ring-rx' : 'luma-harmony-ring-tx'}`}
      />
      <div
        className={`luma-harmony-ring luma-harmony-ring-3 ${isReceive ? 'luma-harmony-ring-rx' : 'luma-harmony-ring-tx'}`}
      />

      {/* 16 Luminous Radial Sparks radiating outward from screen center */}
      <div className="absolute left-1/2 top-1/2">
        {SPARK_ANGLES.map((deg, idx) => (
          <span
            key={deg}
            className="luma-harmony-spark"
            style={
              {
                '--deg': `${deg}deg`,
                '--delay': `${(idx % 4) * 45}ms`,
                background: isReceive
                  ? idx % 2 === 0
                    ? '#34d399'
                    : '#38bdf8'
                  : idx % 2 === 0
                  ? '#38bdf8'
                  : '#a78bfa',
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Central Floating HarmonyOS SuperHub Glass Pill */}
      <div
        className={`pointer-events-auto relative z-10 luma-harmony-card w-[340px] max-w-[90vw] rounded-[28px] border backdrop-blur-3xl p-4 shadow-[0_28px_90px_rgba(0,0,0,0.6)] ${
          isDark
            ? isReceive
              ? 'bg-[#051822]/90 border-emerald-400/50 text-white'
              : 'bg-[#07152c]/90 border-sky-400/50 text-white'
            : isReceive
            ? 'bg-white/92 border-emerald-400/60 text-slate-900'
            : 'bg-white/92 border-sky-400/60 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-3.5">
          {active.isImage && active.previewUrl ? (
            <img
              src={active.previewUrl}
              alt={active.fileName}
              className="w-14 h-14 rounded-2xl object-cover border border-white/25 shadow-lg shrink-0"
            />
          ) : (
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-lg ${
                isReceive
                  ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-emerald-500/35'
                  : 'bg-gradient-to-br from-sky-400 to-indigo-600 shadow-sky-500/35'
              }`}
            >
              {isReceive ? <ArrowDownToLine className="w-7 h-7" /> : <ArrowUpFromLine className="w-7 h-7" />}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className={`w-3 h-3 ${isReceive ? 'text-emerald-400' : 'text-sky-400'}`} />
              <span className={isReceive ? 'text-emerald-400' : 'text-sky-400'}>
                {isReceive ? `Принято · ${active.device || 'Android'}` : `Отправлено · ${active.device || 'Android'}`}
              </span>
            </div>
            <div className="text-sm font-black truncate mt-0.5">{active.fileName}</div>
            <div className={`text-[11px] font-mono ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              {sizeLabel ? `${sizeLabel} · ` : ''}
              {isReceive ? 'Добавлено в Полку Dropzone' : 'Доступно на смартфоне'}
            </div>
          </div>
        </div>

        {active.path && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={openFile}
              className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
                isReceive
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/35 text-emerald-300'
                  : 'bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-300'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" /> Открыть файл
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('luma-toggle-shelf'));
                onPushToast?.('Полка Dropzone', `Файл «${active.fileName}» готов на полке`, 'info');
                setActive(null);
              }}
              className={`py-1.5 px-3 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer border transition ${
                isDark ? 'bg-white/10 hover:bg-white/15 border-white/15' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Полка
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
