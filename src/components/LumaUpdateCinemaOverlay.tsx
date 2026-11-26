import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Download,
  FileCheck2,
  Hand,
  Layers,
  Magnet,
  ShieldCheck,
  Sparkles,
  Terminal,
  Waves,
  X,
} from 'lucide-react';

export interface UpdateProgressInfo {
  running: boolean;
  stage: string;
  percent: number;
  downloaded_bytes: number;
  total_bytes: number;
  speed_mbps: number;
  target_version: string;
  file_path?: string;
  sha256?: string;
  message: string;
  error?: string;
}

interface LumaUpdateCinemaOverlayProps {
  open: boolean;
  progress: UpdateProgressInfo | null;
  previewMode?: boolean;
  onClose?: () => void;
}

const STAGES = [
  { id: 'connecting', label: 'Защищённый канал GitHub', short: 'Канал TLS', minPct: 0 },
  { id: 'downloading', label: 'Потоковая загрузка EXE', short: 'Загрузка', minPct: 10 },
  { id: 'verifying', label: 'Проверка SHA-256 & PE32+', short: 'Хеш-проверка', minPct: 82 },
  { id: 'migrating', label: 'Сохранение профиля и виджетов', short: 'Профиль', minPct: 91 },
  { id: 'restarting', label: 'Запуск LumaCore 1.6.0', short: 'Перезапуск', minPct: 96 },
];

const WHATS_NEW_HIGHLIGHTS = [
  {
    icon: Layers,
    accent: 'text-sky-300 bg-sky-500/15 border-sky-400/30',
    title: 'Правила окон (KWin) и починенный Alt+Tab',
    desc: 'Авторазмещение программ по мониторам, без рамки, поверх окон, игровой режим и мгновенный Alt+Tab.',
  },
  {
    icon: Sparkles,
    accent: 'text-indigo-300 bg-indigo-500/15 border-indigo-400/30',
    title: 'Полка Dropzone и Умный буфер с OCR',
    desc: 'Перетаскивайте файлы пачкой через боковую полку, фильтруйте цвета/код и распознавайте текст со скриншотов.',
  },
  {
    icon: Magnet,
    accent: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/30',
    title: 'Oxygen Connect (Android SuperHub)',
    desc: 'Подключите смартфон по QR-коду: фото с камеры сразу на ПК, общий буфер, тачпад и передача файлов.',
  },
  {
    icon: Waves,
    accent: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30',
    title: 'Per-App Аудио-центр и Капсульные OSD',
    desc: 'Громкость каждого приложения отдельно, перетаскивание на аудиовыход и стеклянные OSD-индикаторы.',
  },
];

export const LumaUpdateCinemaOverlay: React.FC<LumaUpdateCinemaOverlayProps> = React.memo(
  ({ open, progress, previewMode = false, onClose }) => {
    const [speedSamples, setSpeedSamples] = useState<number[]>([]);
    const [highlightIdx, setHighlightIdx] = useState(0);
    const [showLog, setShowLog] = useState(false);
    const [logLines, setLogLines] = useState<{ ts: string; text: string }[]>([]);
    const lastLoggedMsgRef = useRef<string>('');
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
      if (!open) return;
      startTimeRef.current = Date.now();
      setSpeedSamples([]);
      setLogLines([
        {
          ts: new Date().toLocaleTimeString('ru-RU', { hour12: false }),
          text: `Инициализация OTA-модуля LumaCore 1.6.0 (Oxygen · O-8)`,
        },
      ]);
      lastLoggedMsgRef.current = '';
    }, [open]);

    // Auto-rotate "What's New" cards every 4.6s
    useEffect(() => {
      if (!open) return;
      const timer = window.setInterval(() => {
        setHighlightIdx((i) => (i + 1) % WHATS_NEW_HIGHLIGHTS.length);
      }, 4600);
      return () => window.clearInterval(timer);
    }, [open]);

    // Track speed sparkline samples & live pipeline logs
    useEffect(() => {
      if (!open || !progress) return;
      const spd = Number(progress.speed_mbps || 0);
      if (spd > 0) {
        setSpeedSamples((prev) => [...prev.slice(-17), spd]);
      }
      const msg = (progress.message || '').trim();
      if (msg && msg !== lastLoggedMsgRef.current) {
        lastLoggedMsgRef.current = msg;
        const ts = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        setLogLines((prev) => [...prev.slice(-14), { ts, text: `[${progress.stage || 'ota'}] ${msg}` }]);
      }
    }, [open, progress]);

    const sparklinePath = useMemo(() => {
      const pts = speedSamples.length >= 2 ? speedSamples : speedSamples.length === 1 ? [speedSamples[0] * 0.6, speedSamples[0]] : [0.5, 0.5];
      const maxV = Math.max(1, ...pts) * 1.15;
      const w = 132;
      const h = 28;
      return pts
        .map((v, i) => {
          const x = (i / Math.max(1, pts.length - 1)) * w;
          const y = h - (v / maxV) * (h - 4) - 2;
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    }, [speedSamples]);

    if (!open || !progress) return null;

    const pct = Math.max(0, Math.min(100, Math.round(progress.percent || 0)));
    const radius = 84;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - pct / 100);
    const isDone = progress.stage === 'done' || progress.stage === 'restarting' || pct >= 100;
    const isErr = progress.stage === 'error';

    const dlBytes = progress.downloaded_bytes || 0;
    const totBytes = progress.total_bytes || 0;
    const dlMb = dlBytes > 0 ? (dlBytes / (1024 * 1024)).toFixed(1) : '0.0';
    const totMb = totBytes > 0 ? (totBytes / (1024 * 1024)).toFixed(1) : '35.0';
    const speedMbps = Number(progress.speed_mbps || 0);

    // Dynamic ETA computation
    let etaLabel = 'Расчёт…';
    if (isDone) {
      etaLabel = 'Готово';
    } else if (isErr) {
      etaLabel = 'Остановлено';
    } else if (speedMbps > 0.05 && totBytes > dlBytes) {
      const remMb = (totBytes - dlBytes) / (1024 * 1024);
      const sec = Math.max(1, Math.round(remMb / speedMbps));
      etaLabel = sec >= 60 ? `${Math.floor(sec / 60)}м ${sec % 60}с` : `~${sec} сек`;
    } else if (pct > 5) {
      const elapsedSec = Math.max(1, (Date.now() - startTimeRef.current) / 1000);
      const estRem = Math.max(1, Math.round((elapsedSec * (100 - pct)) / pct));
      etaLabel = `~${estRem} сек`;
    }

    const activeHighlight = WHATS_NEW_HIGHLIGHTS[highlightIdx];
    const HighlightIcon = activeHighlight.icon;
    const targetVer = progress.target_version || '1.7';

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 select-none overflow-y-auto bg-[#02050d]/94 backdrop-blur-3xl text-white luma-spring-panel">
        {/* Cryo-Glass Ambient GPU Aurora Background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className="absolute -top-1/3 left-1/5 w-[720px] h-[720px] rounded-full opacity-35 blur-[120px] luma-update-aurora-a"
            style={{ background: 'radial-gradient(circle, #38bdf8 0%, #6366f1 45%, transparent 72%)' }}
          />
          <div
            className="absolute -bottom-1/3 right-1/5 w-[680px] h-[680px] rounded-full opacity-30 blur-[120px] luma-update-aurora-b"
            style={{ background: 'radial-gradient(circle, #a855f7 0%, #10b981 48%, transparent 72%)' }}
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
              backgroundSize: '42px 42px',
            }}
          />
        </div>

        {/* Close button (in preview mode or error/done) */}
        {(previewMode || isDone || isErr) && onClose && (
          <button
            onClick={onClose}
            className="fixed top-5 right-5 z-20 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition backdrop-blur-xl"
          >
            <X className="w-3.5 h-3.5" />
            {previewMode ? 'Закрыть предпросмотр' : 'Свернуть'}
          </button>
        )}

        {/* Main Informative Cryo-Glass Update Console */}
        <div className="relative z-10 w-full max-w-4xl rounded-[32px] border border-white/15 bg-[#070d1c]/80 shadow-[0_36px_110px_rgba(0,0,0,0.75)] backdrop-blur-2xl p-6 sm:p-8 flex flex-col gap-6">
          {/* Top Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/12 border border-sky-400/35 text-[11px] font-mono uppercase tracking-[0.18em] text-sky-200">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>
                {previewMode ? `ДЕМО-ЭКРАН ОБНОВЛЕНИЯ · v${targetVer}` : `LUMA OS OTA · OXYGEN v${targetVer}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/12 border border-emerald-400/30 text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                LumaShield 3.2
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                LumaCore 1.6.0
              </span>
            </div>
          </div>

          {/* 2-Column Core Layout: Orbital Progress Reactor + Live Telemetry & Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Luminous Nitrogen-7 Orbital Progress Reactor */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center gap-4">
              <div className="relative w-56 h-56 flex items-center justify-center">
                {/* Outer Spinning Orbit Ring */}
                <div className="absolute inset-0 rounded-full border border-sky-400/25 luma-update-orbit-slow">
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_16px_#38bdf8]" />
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_14px_#818cf8]" />
                </div>
                {/* Inner Counter-Spinning Orbit Ring */}
                <div className="absolute inset-3 rounded-full border border-cyan-400/20 luma-update-orbit-rev">
                  <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_#34d399]" />
                  <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_12px_#e879f9]" />
                </div>

                {isDone && (
                  <div className="absolute inset-2 rounded-full border-2 border-emerald-400/60 animate-ping" />
                )}

                {/* Precision SVG Ring */}
                <svg className="w-48 h-48 -rotate-90 drop-shadow-[0_0_28px_rgba(56,189,248,0.45)]" viewBox="0 0 200 200">
                  <defs>
                    <linearGradient id="lumaNitrogenUpdateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="rgba(5,10,24,0.75)"
                    stroke="rgba(255,255,255,0.09)"
                    strokeWidth="9"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={isErr ? '#f43f5e' : 'url(#lumaNitrogenUpdateGrad)'}
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset 280ms cubic-bezier(0.22, 1.15, 0.36, 1)' }}
                  />
                </svg>

                {/* Center Big Percentage */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {isDone ? (
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-1 drop-shadow-[0_0_18px_rgba(52,211,153,0.7)]" />
                  ) : (
                    <div
                      className="text-5xl font-black font-mono tracking-tight leading-none tabular-nums"
                      style={{
                        backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #bae6fd 58%, #38bdf8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {pct}%
                    </div>
                  )}
                  <div className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-sky-200/80">
                    {isDone ? 'УСТАНОВЛЕНО' : isErr ? 'ОШИБКА OTA' : 'NITROGEN · N-7'}
                  </div>
                </div>
              </div>

              {/* Linear Shimmer Progress Bar */}
              <div className="w-full max-w-[260px] space-y-1.5">
                <div className="h-2 rounded-full bg-white/10 overflow-hidden p-[1px]">
                  <div
                    className={`h-full rounded-full luma-shimmer-bar transition-all duration-300 ${
                      isErr
                        ? 'bg-rose-500'
                        : isDone
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                        : 'bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400'
                    }`}
                    style={{ width: `${Math.max(3, pct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{dlMb} / {totMb} МБ</span>
                  <span>Осталось: {etaLabel}</span>
                </div>
              </div>
            </div>

            {/* Right: Live Telemetry Grid + Interactive "What's New" Showcase */}
            <div className="lg:col-span-7 flex flex-col gap-4 text-left">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {isDone
                    ? `Luma OS ${targetVer} готова к запуску`
                    : isErr
                    ? 'Обновление приостановлено'
                    : `Устанавливаем Luma OS ${targetVer}`}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {progress.error || progress.message || 'Подготовка защищённого канала обновления и проверка целостности...'}
                </p>
              </div>

              {/* Live Telemetry Cards (Download, Speed Sparkline, ETA, SHA-256) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.04]">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>СКОРОСТЬ</span>
                    <Activity className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="text-sm font-black font-mono text-sky-200 tabular-nums">
                    {speedMbps > 0 ? `${speedMbps.toFixed(1)} МБ/с` : isDone ? 'Завершено' : 'Подключение'}
                  </div>
                  <svg viewBox="0 0 132 28" className="w-full h-6 mt-1 overflow-visible">
                    <path
                      d={sparklinePath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.04]">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>ОСТАЛОСЬ</span>
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="text-sm font-black font-mono text-white tabular-nums">{etaLabel}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1.5 flex items-center gap-1">
                    <Download className="w-3 h-3 text-indigo-400" />
                    {dlMb} из {totMb} МБ
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl border border-white/10 bg-white/[0.04]">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>ЦЕЛОСТНОСТЬ</span>
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-emerald-300">
                    {pct >= 82 ? 'SHA-256 Подтверждён' : 'Контроль PE32+'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                    {progress.sha256 ? progress.sha256.slice(0, 14) + '…' : 'Ожидание хеша…'}
                  </div>
                </div>
              </div>

              {/* Interactive "What's New in 1.6.7" Feature Showcase Carousel */}
              <div className="p-4 rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/[0.09] via-indigo-500/[0.06] to-transparent">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-sky-300">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Что нового в Luma OS {targetVer}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {WHATS_NEW_HIGHLIGHTS.map((h, i) => (
                      <button
                        key={h.title}
                        type="button"
                        onClick={() => setHighlightIdx(i)}
                        aria-label={h.title}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === highlightIdx ? 'w-5 bg-sky-400' : 'w-1.5 bg-white/25 hover:bg-white/45'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div key={activeHighlight.title} className="flex items-start gap-3 luma-animate-in">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${activeHighlight.accent}`}>
                    <HighlightIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white leading-snug">{activeHighlight.title}</div>
                    <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{activeHighlight.desc}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5-Stage OTA Pipeline Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-left">
            {STAGES.map((st, idx) => {
              const reached = pct >= st.minPct;
              const completed = idx < STAGES.length - 1 ? pct >= STAGES[idx + 1].minPct : pct >= 100;
              return (
                <div
                  key={st.id}
                  className={`p-2.5 rounded-2xl border transition-all duration-300 ${
                    completed
                      ? 'border-emerald-400/45 bg-emerald-500/12 text-emerald-200'
                      : reached
                      ? 'border-sky-400/60 bg-sky-500/15 text-white shadow-[0_0_22px_rgba(56,189,248,0.22)]'
                      : 'border-white/10 bg-white/[0.025] text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span>0{idx + 1}</span>
                    {completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : reached ? (
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </div>
                  <div className="text-[11px] font-semibold leading-tight">{st.short}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">{st.label}</div>
                </div>
              );
            })}
          </div>

          {/* Footer: Profile Preservation Guarantee + Expandable Live Technical Log */}
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
              <span>
                Все виджеты, папки, приложения, память ИИ и темы сохраняются автоматически · LumaCore 1.6.0
              </span>
              <button
                type="button"
                onClick={() => setShowLog((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 text-[10px] font-semibold cursor-pointer transition"
              >
                <Terminal className="w-3 h-3 text-sky-400" />
                <span>Журнал установки ({logLines.length})</span>
                {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showLog && (
              <div className="rounded-2xl border border-white/10 bg-black/55 p-3 max-h-36 overflow-y-auto font-mono text-[10.5px] text-slate-300 space-y-1 text-left luma-animate-in">
                {logLines.map((line, i) => (
                  <div key={`${line.ts}-${i}`} className="flex gap-2">
                    <span className="text-sky-400/80 shrink-0">{line.ts}</span>
                    <span className="break-all">{line.text}</span>
                  </div>
                ))}
                {progress.file_path && (
                  <div className="text-emerald-300/85">Файл сборки: {progress.file_path}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

