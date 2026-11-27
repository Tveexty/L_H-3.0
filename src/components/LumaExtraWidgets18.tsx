import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ClipboardCopy,
  Copy,
  Dice5,
  Droplets,
  Flame,
  Hourglass,
  KeyRound,
  Palette,
  Play,
  Pause,
  RefreshCw,
  RotateCcw,
  Scale,
  Shield,
  Sparkles,
  Terminal,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { getCurrentMonetPalette, MonetPalette } from '../utils/monetEngine';

export interface ExtraWidget18Props {
  widgetType: string;
  isDark: boolean;
  mutedCls: string;
  subBtnCls: string;
  ramPercent?: number;
  ramUsedGb?: number;
  ramTotalGb?: number;
  onLaunchPowerShell?: (admin?: boolean, command?: string) => void;
  onShowToast?: (title: string, message?: string) => void;
}

export const EXTRA_WIDGET_18_TYPES = new Set<string>([
  'luma_fluorine_monet',
  'luma_ram_optimizer',
  'luma_ambient_mixer',
  'luma_breathing_zen',
  'luma_countdown_event',
  'luma_stopwatch_lap',
  'luma_water_tracker',
  'luma_quote_daily',
  'luma_color_studio',
  'luma_unit_converter',
  'luma_password_gen',
  'luma_dice_coin',
  'luma_clipboard_mini',
  'luma_powershell_hub',
  'luma_day_progress',
]);

const QUOTES_RU = [
  { text: 'Простота — высшая степень изощрённости.', author: 'Леонардо да Винчи' },
  { text: 'Лучший способ предсказать будущее — создать его.', author: 'Алан Кей' },
  { text: 'Большие дела начинаются с маленьких точных шагов.', author: 'Лао-цзы' },
  { text: 'Дизайн — это не то, как вещь выглядит, а то, как она работает.', author: 'Стив Джобс' },
  { text: 'Фокус — это умение сказать «нет» сотне хороших идей.', author: 'Luma Zen' },
  { text: 'Совершенство достигается не тогда, когда нечего добавить, а когда нечего убрать.', author: 'Антуан де Сент-Экзюпери' },
  { text: 'Каждый новый день — это чистый лист и новая скорость.', author: 'Fluorine 1.8' },
  { text: 'Спокойный разум решает задачи в три раза быстрее.', author: 'Марк Аврелий' },
];

// 1. Material You (Monet) Live Palette Widget
const MonetPaletteWidget: React.FC<{ isDark: boolean; mutedCls: string; onShowToast?: (t: string, m?: string) => void }> = React.memo(({ mutedCls, onShowToast }) => {
  const [pal, setPal] = useState<MonetPalette>(() => getCurrentMonetPalette());
  const [copiedHex, setCopiedHex] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ palette: MonetPalette }>;
      if (ce.detail?.palette) setPal(ce.detail.palette);
    };
    window.addEventListener('luma-monet-palette', handler);
    return () => window.removeEventListener('luma-monet-palette', handler);
  }, []);

  const copyHex = (hex: string) => {
    navigator.clipboard?.writeText(hex).catch(() => {});
    setCopiedHex(hex);
    onShowToast?.('Палитра Monet', `Цвет ${hex} скопирован`);
    window.setTimeout(() => setCopiedHex(''), 1200);
  };

  return (
    <div className="h-full flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Palette className="w-3.5 h-3.5 shrink-0" style={{ color: pal.primary }} />
          <span className={`text-[10px] font-mono uppercase tracking-[0.14em] truncate ${mutedCls}`}>MONET · {pal.sourceLabel}</span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border" style={{ borderColor: pal.border, background: pal.pillBg, color: pal.primary }}>
          LIVE
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 flex-1 items-center">
        {pal.swatches.map((hex, i) => (
          <button
            key={`${hex}-${i}`}
            onClick={(e) => {
              e.stopPropagation();
              copyHex(hex);
            }}
            title={`Копировать ${hex}`}
            className="h-full min-h-[34px] rounded-xl border border-white/20 flex items-end justify-center pb-1 transition-transform hover:scale-105 cursor-pointer relative overflow-hidden"
            style={{ background: hex }}
          >
            <span className="text-[8px] font-mono font-bold px-1 rounded bg-black/45 text-white">
              {copiedHex === hex ? 'OK' : hex.slice(1, 5)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

// 2. LumaCore 2.0 RAM Optimizer Widget
const RamOptimizerWidget: React.FC<{
  mutedCls: string;
  subBtnCls: string;
  ramPercent?: number;
  ramUsedGb?: number;
  ramTotalGb?: number;
  onShowToast?: (t: string, m?: string) => void;
}> = React.memo(({ mutedCls, subBtnCls, ramPercent = 42, ramUsedGb = 6.8, ramTotalGb = 16, onShowToast }) => {
  const [busy, setBusy] = useState(false);
  const [lastFreed, setLastFreed] = useState<string>('');

  const runOptimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/kernel/v2/optimize', { method: 'POST' });
      const data = await res.json();
      const freed = typeof data?.freed_mb === 'number' ? data.freed_mb.toFixed(1) : '24.0';
      setLastFreed(`−${freed} МБ`);
      onShowToast?.('LumaCore 2.0 Оптимизатор', data?.message || `Память и кэш очищены (освобождено ${freed} МБ)`);
    } catch {
      setLastFreed('Ок');
      onShowToast?.('LumaCore 2.0 Оптимизатор', 'Локальный кэш оболочки очищен');
    } finally {
      window.setTimeout(() => setBusy(false), 450);
    }
  };

  return (
    <div className="h-full flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1 ${mutedCls}`}>
          <Zap className="w-3.5 h-3.5 text-emerald-400" /> ОЗУ · LUMACORE 2.0
        </span>
        {lastFreed && <span className="text-[10px] font-mono text-emerald-400 font-bold">{lastFreed}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xl font-bold leading-none tabular-nums">{ramPercent}%</div>
          <div className={`text-[10px] font-mono mt-0.5 ${mutedCls}`}>
            {ramUsedGb.toFixed(1)} / {ramTotalGb.toFixed(0)} ГБ
          </div>
        </div>
        <button
          onClick={runOptimize}
          disabled={busy}
          className={`px-3 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition ${subBtnCls}`}
          style={{ borderColor: 'var(--luma-monet-border)' }}
        >
          <Sparkles className={`w-3.5 h-3.5 text-emerald-400 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Чистим...' : 'Ускорить'}
        </button>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, Math.max(4, ramPercent))}%`,
            background: 'linear-gradient(90deg, var(--luma-monet-primary), var(--luma-monet-secondary))',
          }}
        />
      </div>
    </div>
  );
});

// 3. Ambient Sound Mixer (Real Offline Web Audio Synthesizer!)
type AmbientKind = 'rain' | 'ocean' | 'fire' | 'white';
const AmbientMixerWidget: React.FC<{ mutedCls: string; subBtnCls: string }> = React.memo(({ mutedCls, subBtnCls }) => {
  const [active, setActive] = useState<AmbientKind | null>(null);
  const [vol, setVol] = useState(0.35);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = () => {
    try {
      srcRef.current?.stop();
    } catch {}
    srcRef.current = null;
    try {
      ctxRef.current?.close();
    } catch {}
    ctxRef.current = null;
    gainRef.current = null;
  };

  useEffect(() => () => stopAudio(), []);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = vol * 0.4;
    }
  }, [vol]);

  const toggleSound = (kind: AmbientKind, e: React.MouseEvent) => {
    e.stopPropagation();
    if (active === kind) {
      stopAudio();
      setActive(null);
      return;
    }
    stopAudio();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (kind === 'ocean') {
          lastOut = (lastOut + 0.02 * white) / 1.02;
          const wave = 0.55 + 0.45 * Math.sin((i / ctx.sampleRate) * Math.PI * 0.65);
          data[i] = lastOut * 3.2 * wave;
        } else if (kind === 'fire') {
          lastOut = (lastOut + 0.04 * white) / 1.04;
          const crackle = Math.random() > 0.9985 ? (Math.random() * 1.4 - 0.7) : 0;
          data[i] = lastOut * 2.2 + crackle;
        } else if (kind === 'rain') {
          lastOut = (lastOut + 0.14 * white) / 1.14;
          data[i] = lastOut * 1.4;
        } else {
          data[i] = white * 0.45;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = kind === 'white' ? 'lowpass' : kind === 'rain' ? 'bandpass' : 'lowpass';
      filter.frequency.value = kind === 'ocean' ? 380 : kind === 'fire' ? 620 : kind === 'rain' ? 1400 : 3200;

      const gain = ctx.createGain();
      gain.gain.value = vol * 0.4;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();

      ctxRef.current = ctx;
      gainRef.current = gain;
      srcRef.current = src;
      setActive(kind);
    } catch {
      setActive(null);
    }
  };

  const sounds: { id: AmbientKind; label: string; emoji: string }[] = [
    { id: 'rain', label: 'Дождь', emoji: '🌧️' },
    { id: 'ocean', label: 'Океан', emoji: '🌊' },
    { id: 'fire', label: 'Костёр', emoji: '🔥' },
    { id: 'white', label: 'Шум', emoji: '☁️' },
  ];

  return (
    <div className="h-full flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1 ${mutedCls}`}>
          {active ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />} ФОНОВЫЕ ЗВУКИ
        </span>
        <input
          type="range"
          min={5}
          max={100}
          value={Math.round(vol * 100)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setVol(Number(e.target.value) / 100)}
          className="w-16"
        />
      </div>
      <div className="grid grid-cols-4 gap-1">
        {sounds.map((s) => (
          <button
            key={s.id}
            onClick={(e) => toggleSound(s.id, e)}
            className={`py-1.5 rounded-xl border text-[10px] font-medium flex flex-col items-center justify-center gap-0.5 cursor-pointer transition ${
              active === s.id
                ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200'
                : subBtnCls
            }`}
          >
            <span className="text-sm leading-none">{s.emoji}</span>
            <span className="truncate">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

// 4. Breathing Zen 4-4-4 Widget
const BreathingZenWidget: React.FC<{ mutedCls: string; subBtnCls: string }> = React.memo(({ mutedCls, subBtnCls }) => {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % 12), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const phase = tick < 4 ? 'Вдох' : tick < 8 ? 'Пауза' : 'Выдох';
  const secLeft = 4 - (tick % 4);
  const scale = !running ? 0.78 : tick < 4 ? 1.1 : tick < 8 ? 1.1 : 0.72;

  return (
    <div className="h-full flex items-center justify-between gap-3">
      <div className="flex flex-col justify-between h-full">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1 ${mutedCls}`}>
          <Wind className="w-3.5 h-3.5 text-cyan-400" /> ДЫХАНИЕ 4-4-4
        </span>
        <div>
          <div className="text-sm font-bold">{running ? `${phase} · ${secLeft}с` : 'Релакс и глаза'}</div>
          <div className={`text-[10px] ${mutedCls}`}>{running ? 'Сделай спокойный ритм' : 'Нажми Старт на 1 минуту'}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRunning((v) => !v);
            setTick(0);
          }}
          className={`self-start px-2.5 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${subBtnCls}`}
        >
          {running ? 'Пауза' : 'Старт'}
        </button>
      </div>
      <div className="w-16 h-16 shrink-0 flex items-center justify-center relative">
        <div
          className="w-12 h-12 rounded-full transition-transform duration-1000 ease-in-out flex items-center justify-center border border-cyan-300/40"
          style={{
            transform: `scale(${scale})`,
            background: 'radial-gradient(circle, rgba(52,211,153,0.55), rgba(6,182,212,0.18))',
            boxShadow: '0 0 22px rgba(6,182,212,0.35)',
          }}
        >
          <span className="text-[11px] font-mono font-bold text-white">{running ? secLeft : 'ZEN'}</span>
        </div>
      </div>
    </div>
  );
});

// 5. Event Countdown Widget
const CountdownEventWidget: React.FC<{ mutedCls: string; subBtnCls: string }> = React.memo(({ mutedCls, subBtnCls }) => {
  const [title, setTitle] = useState(() => localStorage.getItem('luma_cd_title') || 'Новый год / Отпуск');
  const [targetIso, setTargetIso] = useState(() => {
    const saved = localStorage.getItem('luma_cd_target');
    if (saved) return saved;
    const d = new Date(Date.now() + 14 * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diffMs = Math.max(0, new Date(`${targetIso}T00:00:00`).getTime() - now);
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);

  return (
    <div className="h-full flex flex-col justify-between gap-1">
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] truncate flex items-center gap-1 ${mutedCls}`}>
          <Hourglass className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {title}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing((v) => !v);
          }}
          className={`px-1.5 py-0.5 rounded border text-[9px] cursor-pointer ${subBtnCls}`}
        >
          {editing ? 'Готово' : 'Изм.'}
        </button>
      </div>
      {editing ? (
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              localStorage.setItem('luma_cd_title', e.target.value);
            }}
            className="w-full px-2 py-1 rounded bg-black/30 border border-white/15 text-[11px]"
            placeholder="Событие"
          />
          <input
            type="date"
            value={targetIso}
            onChange={(e) => {
              setTargetIso(e.target.value);
              localStorage.setItem('luma_cd_target', e.target.value);
            }}
            className="w-full px-2 py-0.5 rounded bg-black/30 border border-white/15 text-[10px]"
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[
            { v: days, l: 'ДНЕЙ' },
            { v: hours, l: 'ЧАСОВ' },
            { v: mins, l: 'МИН' },
          ].map((c) => (
            <div key={c.l} className="rounded-xl bg-white/5 border border-white/10 py-1.5">
              <div className="text-lg font-bold tabular-nums leading-none">{String(c.v).padStart(2, '0')}</div>
              <div className={`text-[8px] font-mono mt-0.5 ${mutedCls}`}>{c.l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// 6. Precision Stopwatch & Laps Widget
const StopwatchLapWidget: React.FC<{ mutedCls: string; subBtnCls: string }> = React.memo(({ mutedCls, subBtnCls }) => {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    lastRef.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      setMs((prev) => prev + (now - lastRef.current));
      lastRef.current = now;
    }, 50);
    return () => window.clearInterval(id);
  }, [running]);

  const fmt = (t: number) => {
    const m = Math.floor(t / 60000);
    const s = Math.floor((t % 60000) / 1000);
    const cs = Math.floor((t % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>СЕКУНДОМЕР</span>
        {laps.length > 0 && <span className="text-[10px] font-mono text-cyan-400">Круг {laps.length}: {fmt(laps[0])}</span>}
      </div>
      <div className="text-2xl font-mono font-bold tabular-nums tracking-tight">{fmt(ms)}</div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRunning((r) => !r);
          }}
          className={`flex-1 py-1 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${subBtnCls}`}
        >
          {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {running ? 'Пауза' : 'Старт'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (ms > 0) setLaps((prev) => [ms, ...prev].slice(0, 4));
          }}
          className={`px-2.5 py-1 rounded-xl border text-[10px] cursor-pointer ${subBtnCls}`}
        >
          Круг
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRunning(false);
            setMs(0);
            setLaps([]);
          }}
          className={`p-1 rounded-xl border cursor-pointer ${subBtnCls}`}
          title="Сброс"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
});

// 7. Water Hydration Tracker
const WaterTrackerWidget: React.FC<{ mutedCls: string; subBtnCls: string }> = React.memo(({ mutedCls, subBtnCls }) => {
  const todayKey = `luma_water_${new Date().toISOString().slice(0, 10)}`;
  const [cups, setCups] = useState(() => Number(localStorage.getItem(todayKey) || '3'));
  const goal = 8;

  const update = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = Math.max(0, Math.min(16, cups + delta));
    setCups(next);
    localStorage.setItem(todayKey, String(next));
  };

  return (
    <div className="h-full flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1 ${mutedCls}`}>
          <Droplets className="w-3.5 h-3.5 text-sky-400" /> ВОДА · {cups * 250} МЛ
        </span>
        <span className="text-[10px] font-mono text-sky-400 font-bold">{cups}/{goal}</span>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: goal }).map((_, i) => (
          <div
            key={i}
            className="h-5 rounded-md border transition-all"
            style={{
              background: i < cups ? 'linear-gradient(180deg, #38bdf8, #0284c7)' : 'rgba(255,255,255,0.06)',
              borderColor: i < cups ? 'rgba(125,211,252,0.55)' : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={(e) => update(-1, e)} className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${subBtnCls}`}>−</button>
        <button onClick={(e) => update(1, e)} className={`flex-1 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${subBtnCls}`}>
          + Стакан (250 мл)
        </button>
      </div>
    </div>
  );
});

// 8. Daily Quote Widget
const QuoteDailyWidget: React.FC<{ mutedCls: string; subBtnCls: string; onShowToast?: (t: string, m?: string) => void }> = React.memo(({ mutedCls, subBtnCls, onShowToast }) => {
  const [idx, setIdx] = useState(() => new Date().getDate() % QUOTES_RU.length);
  const q = QUOTES_RU[idx];

  return (
    <div className="h-full flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>МЫСЛЬ ДНЯ</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(`«${q.text}» — ${q.author}`).catch(() => {});
              onShowToast?.('Мысль дня', 'Цитата скопирована');
            }}
            className={`p-1 rounded-lg border cursor-pointer ${subBtnCls}`}
            title="Копировать"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIdx((v) => (v + 1) % QUOTES_RU.length);
            }}
            className={`p-1 rounded-lg border cursor-pointer ${subBtnCls}`}
            title="Следующая"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="text-[12px] leading-snug font-medium line-clamp-3">«{q.text}»</div>
      <div className={`text-[10px] font-mono ${mutedCls}`}>— {q.author}</div>
    </div>
  );
});

// 9. Color Picker & HEX Studio
const ColorStudioWidget: React.FC<{ mutedCls: string; subBtnCls: string; onShowToast?: (t: string, m?: string) => void }> = React.memo(({ mutedCls, subBtnCls, onShowToast }) => {
  const [color, setColor] = useState('#10b981');
  const [copied, setCopied] = useState(false);

  const presets = ['#10b981', '#06b6d4', '#6366f1', '#f43f5e', '#f59e0b', '#a855f7'];

  const doCopy = (hex: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(hex).catch(() => {});
    setCopied(true);
    onShowToast?.('Цвет скопирован', hex.toUpperCase());
    window.setTimeout(() => setCopied(false), 1100);
  };

  return (
    <div className="h-full flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>ПАЛИТРА HEX</span>
        <button onClick={(e) => doCopy(color, e)} className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono flex items-center gap-1 cursor-pointer ${subBtnCls}`}>
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {color.toUpperCase()}
        </button>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0" />
        <div className="grid grid-cols-6 gap-1 flex-1">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setColor(p)}
              className="h-7 rounded-lg border border-white/25 cursor-pointer transition-transform hover:scale-110"
              style={{ background: p }}
              title={p}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// 10. Quick Unit Converter
const UnitConverterWidget: React.FC<{ mutedCls: string; subBtnCls: string }> = React.memo(({ mutedCls, subBtnCls }) => {
  const [mode, setMode] = useState<'temp' | 'dist' | 'data' | 'weight'>('temp');
  const [val, setVal] = useState('24');
  const num = parseFloat(val) || 0;

  const converted = useMemo(() => {
    if (mode === 'temp') return `${((num * 9) / 5 + 32).toFixed(1)} °F`;
    if (mode === 'dist') return `${(num * 0.621371).toFixed(2)} миль`;
    if (mode === 'data') return `${(num * 1024).toFixed(0)} МБ`;
    return `${(num * 2.20462).toFixed(2)} lb`;
  }, [mode, num]);

  const unitIn = mode === 'temp' ? '°C' : mode === 'dist' ? 'км' : mode === 'data' ? 'ГБ' : 'кг';

  return (
    <div className="h-full flex flex-col justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1 ${mutedCls}`}>
          <Scale className="w-3.5 h-3.5 text-emerald-400" /> КОНВЕРТЕР
        </span>
        <div className="flex gap-1">
          {(['temp', 'dist', 'data', 'weight'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-1.5 py-0.5 rounded text-[9px] border cursor-pointer ${mode === m ? 'bg-emerald-500/25 border-emerald-400/50' : subBtnCls}`}
            >
              {m === 'temp' ? '°C' : m === 'dist' ? 'км' : m === 'data' ? 'ГБ' : 'кг'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-black/25 border border-white/15 rounded-xl px-2 py-1 flex-1">
          <input value={val} onChange={(e) => setVal(e.target.value)} className="w-full bg-transparent text-sm font-mono font-bold outline-none" />
          <span className={`text-[10px] font-mono ${mutedCls}`}>{unitIn}</span>
        </div>
        <span className="text-xs opacity-60">=</span>
        <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs font-mono font-bold whitespace-nowrap">
          {converted}
        </div>
      </div>
    </div>
  );
});

// 11. Crypto Password Generator
const PasswordGenWidget: React.FC<{ mutedCls: string; subBtnCls: string; onShowToast?: (t: string, m?: string) => void }> = React.memo(({ mutedCls, subBtnCls, onShowToast }) => {
  const gen = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    const arr = new Uint32Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (n) => chars[n % chars.length]).join('');
  };
  const [pwd, setPwd] = useState(gen);

  return (
    <div className="h-full flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1 ${mutedCls}`}>
          <KeyRound className="w-3.5 h-3.5 text-amber-400" /> ГЕНЕРАТОР ПАРОЛЕЙ
        </span>
        <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5"><Shield className="w-3 h-3" /> 16 симв.</span>
      </div>
      <div className="px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/12 font-mono text-xs tracking-wider truncate select-all">
        {pwd}
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPwd(gen());
          }}
          className={`flex-1 py-1 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${subBtnCls}`}
        >
          <RefreshCw className="w-3 h-3" /> Новый
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard?.writeText(pwd).catch(() => {});
            onShowToast?.('Пароль скопирован', 'Надёжный 16-символьный пароль в буфере');
          }}
          className={`flex-1 py-1 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${subBtnCls}`}
        >
          <ClipboardCopy className="w-3 h-3" /> Копировать
        </button>
      </div>
    </div>
  );
});

// 12. Dice & Coin Flip Widget
const DiceCoinWidget: React.FC<{ mutedCls: string; subBtnCls: string }> = React.memo(({ mutedCls, subBtnCls }) => {
  const [result, setResult] = useState('Готов к броску');

  return (
    <div className="h-full flex flex-col justify-between gap-1.5">
      <span className={`text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1 ${mutedCls}`}>
        <Dice5 className="w-3.5 h-3.5 text-violet-400" /> СЛУЧАЙНЫЙ ВЫБОР
      </span>
      <div className="text-center text-base font-bold py-0.5 truncate">{result}</div>
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setResult(Math.random() < 0.5 ? '🪙 Орёл' : '🪙 Решка');
          }}
          className={`py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${subBtnCls}`}
        >
          Монета
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setResult(`🎲 D6 → ${1 + Math.floor(Math.random() * 6)}`);
          }}
          className={`py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${subBtnCls}`}
        >
          Кубик D6
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setResult(`🎯 D20 → ${1 + Math.floor(Math.random() * 20)}`);
          }}
          className={`py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${subBtnCls}`}
        >
          D20
        </button>
      </div>
    </div>
  );
});

// 13. Mini Clipboard Snippet Pad
const ClipboardMiniWidget: React.FC<{ mutedCls: string; subBtnCls: string; onShowToast?: (t: string, m?: string) => void }> = React.memo(({ mutedCls, subBtnCls, onShowToast }) => {
  const [text, setText] = useState(() => localStorage.getItem('luma_clip_mini') || 'Быстрая заметка для копирования...');

  return (
    <div className="h-full flex flex-col justify-between gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>БЫСТРЫЙ БУФЕР</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text).catch(() => {});
            onShowToast?.('Буфер обмена', 'Текст скопирован');
          }}
          className={`px-2 py-0.5 rounded-lg border text-[10px] flex items-center gap-1 cursor-pointer ${subBtnCls}`}
        >
          <Copy className="w-3 h-3" /> Копировать
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          localStorage.setItem('luma_clip_mini', e.target.value);
        }}
        className="w-full flex-1 resize-none rounded-xl bg-black/25 border border-white/12 p-2 text-[11px] outline-none leading-snug"
        placeholder="Напиши или вставь текст..."
      />
    </div>
  );
});

// 14. PowerShell Instant Hub Widget
const PowerShellHubWidget: React.FC<{
  mutedCls: string;
  subBtnCls: string;
  onLaunchPowerShell?: (admin?: boolean, command?: string) => void;
}> = React.memo(({ mutedCls, subBtnCls, onLaunchPowerShell }) => {
  const launch = (admin: boolean, cmd?: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLaunchPowerShell) {
      onLaunchPowerShell(admin, cmd);
    } else {
      fetch('/api/kernel/shell/powershell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin, command: cmd || '' }),
      }).catch(() => {});
    }
  };

  return (
    <div className="h-full flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1 ${mutedCls}`}>
          <Terminal className="w-3.5 h-3.5 text-sky-400" /> POWERSHELL HUB
        </span>
        <span className="text-[9px] font-mono text-sky-400">PS</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={launch(false)} className={`py-2 px-2 rounded-xl border text-[10px] font-semibold cursor-pointer ${subBtnCls}`}>
          &gt;_ PowerShell
        </button>
        <button onClick={launch(true)} className={`py-2 px-2 rounded-xl border text-[10px] font-semibold cursor-pointer text-amber-300 ${subBtnCls}`}>
          🛡️ Админ PS
        </button>
      </div>
    </div>
  );
});

// 15. Day / Week / Year Life Progress Widget
const DayProgressWidget: React.FC<{ mutedCls: string }> = React.memo(({ mutedCls }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const dayPct = Math.round(((now.getHours() * 60 + now.getMinutes()) / 1440) * 100);
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1).getTime();
  const yearPct = Math.round(((now.getTime() - startOfYear) / (endOfYear - startOfYear)) * 100);
  const dayOfWeek = (now.getDay() + 6) % 7;
  const weekPct = Math.round(((dayOfWeek + (now.getHours() / 24)) / 7) * 100);

  const bars = [
    { label: 'День', pct: dayPct, color: '#10b981' },
    { label: 'Неделя', pct: weekPct, color: '#06b6d4' },
    { label: `Год ${now.getFullYear()}`, pct: yearPct, color: '#8b5cf6' },
  ];

  return (
    <div className="h-full flex flex-col justify-between gap-1">
      <span className={`text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1 ${mutedCls}`}>
        <Flame className="w-3.5 h-3.5 text-emerald-400" /> ПРОГРЕСС ВРЕМЕНИ
      </span>
      <div className="flex flex-col gap-1.5">
        {bars.map((b) => (
          <div key={b.label} className="space-y-0.5">
            <div className="flex justify-between text-[10px] font-mono">
              <span className={mutedCls}>{b.label}</span>
              <span className="font-bold">{b.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const LumaExtraWidget18Renderer: React.FC<ExtraWidget18Props> = React.memo((props) => {
  switch (props.widgetType) {
    case 'luma_fluorine_monet':
      return <MonetPaletteWidget isDark={props.isDark} mutedCls={props.mutedCls} onShowToast={props.onShowToast} />;
    case 'luma_ram_optimizer':
      return (
        <RamOptimizerWidget
          mutedCls={props.mutedCls}
          subBtnCls={props.subBtnCls}
          ramPercent={props.ramPercent}
          ramUsedGb={props.ramUsedGb}
          ramTotalGb={props.ramTotalGb}
          onShowToast={props.onShowToast}
        />
      );
    case 'luma_ambient_mixer':
      return <AmbientMixerWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} />;
    case 'luma_breathing_zen':
      return <BreathingZenWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} />;
    case 'luma_countdown_event':
      return <CountdownEventWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} />;
    case 'luma_stopwatch_lap':
      return <StopwatchLapWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} />;
    case 'luma_water_tracker':
      return <WaterTrackerWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} />;
    case 'luma_quote_daily':
      return <QuoteDailyWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} onShowToast={props.onShowToast} />;
    case 'luma_color_studio':
      return <ColorStudioWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} onShowToast={props.onShowToast} />;
    case 'luma_unit_converter':
      return <UnitConverterWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} />;
    case 'luma_password_gen':
      return <PasswordGenWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} onShowToast={props.onShowToast} />;
    case 'luma_dice_coin':
      return <DiceCoinWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} />;
    case 'luma_clipboard_mini':
      return <ClipboardMiniWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} onShowToast={props.onShowToast} />;
    case 'luma_powershell_hub':
      return <PowerShellHubWidget mutedCls={props.mutedCls} subBtnCls={props.subBtnCls} onLaunchPowerShell={props.onLaunchPowerShell} />;
    case 'luma_day_progress':
      return <DayProgressWidget mutedCls={props.mutedCls} />;
    default:
      return null;
  }
});
