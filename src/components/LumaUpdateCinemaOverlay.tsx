import React from 'react';
import { CheckCircle2, Cpu, Download, ShieldCheck, Sparkles, X } from 'lucide-react';

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
  { id: 'connecting', label: 'Соединение с GitHub', minPct: 0 },
  { id: 'downloading', label: 'Загрузка сборки EXE', minPct: 12 },
  { id: 'verifying', label: 'Проверка SHA-256 & PE32+', minPct: 86 },
  { id: 'restarting', label: 'Подготовка ядра LumaCore 1.5', minPct: 95 },
];

export const LumaUpdateCinemaOverlay: React.FC<LumaUpdateCinemaOverlayProps> = React.memo(
  ({ open, progress, previewMode = false, onClose }) => {
    if (!open || !progress) return null;

    const pct = Math.max(0, Math.min(100, Math.round(progress.percent || 0)));
    const radius = 84;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - pct / 100);
    const isDone = progress.stage === 'done' || progress.stage === 'restarting' || pct >= 100;
    const isErr = progress.stage === 'error';

    const dlMb = progress.downloaded_bytes ? (progress.downloaded_bytes / (1024 * 1024)).toFixed(1) : '0.0';
    const totMb = progress.total_bytes ? (progress.total_bytes / (1024 * 1024)).toFixed(1) : '23.4';

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 select-none overflow-hidden bg-[#03050c]/92 backdrop-blur-3xl text-white luma-animate-in">
        {/* Ambient GPU Aurora Nebula Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-1/3 left-1/4 w-[680px] h-[680px] rounded-full opacity-35 blur-[110px] luma-update-aurora-a"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, #3b82f6 45%, transparent 72%)' }}
          />
          <div
            className="absolute -bottom-1/3 right-1/4 w-[640px] h-[640px] rounded-full opacity-30 blur-[110px] luma-update-aurora-b"
            style={{ background: 'radial-gradient(circle, #a855f7 0%, #10b981 48%, transparent 72%)' }}
          />
        </div>

        {/* Close button (in preview mode or error/done) */}
        {(previewMode || isDone || isErr) && onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-20 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5" />
            {previewMode ? 'Закрыть предпросмотр' : 'Свернуть'}
          </button>
        )}

        {/* Centerpiece Card */}
        <div className="relative z-10 w-full max-w-xl rounded-[32px] border border-white/15 bg-white/[0.04] shadow-[0_32px_90px_rgba(0,0,0,0.65)] p-7 sm:p-9 flex flex-col items-center text-center gap-6">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.07] border border-sky-400/35 text-[11px] font-mono uppercase tracking-[0.2em] text-sky-200">
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            <span>
              {previewMode ? 'ДЕМО-АНИМАЦИЯ ОБНОВЛЕНИЯ · NITROGEN' : `LUMA OS OTA · v${progress.target_version || '1.6'}`}
            </span>
          </div>

          {/* Luminous Nitrogen-7 Orbital Progress Reactor */}
          <div className="relative w-56 h-56 flex items-center justify-center">
            {/* Outer Spinning Orbit Ring 1 (Nitrogen 7-electron halo) */}
            <div className="absolute inset-0 rounded-full border border-sky-400/25 luma-update-orbit-slow">
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_16px_#38bdf8]" />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_14px_#818cf8]" />
            </div>
            {/* Inner Counter-Spinning Orbit Ring 2 */}
            <div className="absolute inset-3 rounded-full border border-cyan-400/20 luma-update-orbit-rev">
              <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_#34d399]" />
            </div>

            {/* Celebratory Pulse Ring on 100% */}
            {isDone && (
              <div className="absolute inset-2 rounded-full border-2 border-emerald-400/60 animate-ping" />
            )}

            {/* SVG Precision Progress Ring */}
            <svg className="w-48 h-48 -rotate-90 drop-shadow-[0_0_24px_rgba(56,189,248,0.45)]" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="lumaBoronUpdateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="rgba(6,10,24,0.65)"
                stroke="rgba(255,255,255,0.09)"
                strokeWidth="8"
              />
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={isErr ? '#f43f5e' : 'url(#lumaBoronUpdateGrad)'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 220ms cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </svg>

            {/* Center Telemetry Percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isDone ? (
                <CheckCircle2 className="w-11 h-11 text-emerald-400 mb-1 drop-shadow-[0_0_16px_rgba(52,211,153,0.65)]" />
              ) : (
                <div
                  className="text-5xl font-black font-mono tracking-tight leading-none"
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #bae6fd 58%, #38bdf8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {pct}%
                </div>
              )}
              <div className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-300">
                {isDone ? 'ГОТОВО' : isErr ? 'ОШИБКА' : 'NITROGEN · N-7'}
              </div>
            </div>
          </div>

          {/* Current Stage Title & Live Telemetry */}
          <div className="space-y-1.5 max-w-md">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {isDone
                ? `Luma OS ${progress.target_version || '1.6'} готова к запуску`
                : isErr
                ? 'Не удалось завершить обновление'
                : `Обновление до Luma OS ${progress.target_version || '1.6'}`}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {progress.message || 'Подготовка защищённого канала обновления...'}
            </p>
            {!isErr && (
              <div className="pt-1 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-indigo-200/85">
                <span className="inline-flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  {dlMb} / {totMb} МБ
                </span>
                {progress.speed_mbps > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    {progress.speed_mbps.toFixed(1)} МБ/с
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  SHA-256 Verified
                </span>
              </div>
            )}
          </div>

          {/* 4-Step Choreography Timeline */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
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
                      ? 'border-sky-400/60 bg-sky-500/15 text-white shadow-[0_0_20px_rgba(56,189,248,0.22)]'
                      : 'border-white/10 bg-white/[0.02] text-zinc-500'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span>0{idx + 1}</span>
                    {completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : reached ? (
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    )}
                  </div>
                  <div className="text-[11px] font-semibold leading-tight">{st.label}</div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-zinc-400 font-mono">
            Все виджеты, папки, приложения и темы автоматически сохраняются · LumaCore 1.5.1 · LumaShield 2.5 · Luma AI 4.0
          </div>
        </div>
      </div>
    );
  }
);
