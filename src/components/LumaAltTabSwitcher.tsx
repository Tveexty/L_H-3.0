import React, { useEffect, useMemo, useState } from 'react';
import { AppWindow, Home, Layers, Monitor, Search, Sparkles, X } from 'lucide-react';

export interface AltTabEntry {
  key: string;
  kind: 'home' | 'luma' | 'host';
  id: string;
  pid?: number;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  iconUrl?: string;
  previewUrl?: string;
  accent?: string;
  minimized?: boolean;
  active?: boolean;
}

interface LumaAltTabSwitcherProps {
  open: boolean;
  isDark: boolean;
  items: AltTabEntry[];
  selectedIndex: number;
  wallpaperPreviewUrl?: string;
  fromExternal?: boolean;
  onSelectIndex: (idx: number) => void;
  onActivate: (item: AltTabEntry) => void;
  onGoHome: () => void;
  onCloseItem?: (item: AltTabEntry) => void;
  onCancel: () => void;
}

const ACCENT_PALETTE: Record<string, string> = {
  home: 'from-cyan-500/35 via-indigo-500/25 to-emerald-500/30',
  office: 'from-[#185ABD]/50 via-[#107C41]/30 to-[#B7472A]/40',
  cut_studio: 'from-fuchsia-600/40 via-violet-500/25 to-cyan-500/30',
  code_studio: 'from-emerald-600/35 via-slate-900/80 to-sky-600/30',
  explorer: 'from-amber-500/30 via-slate-800/70 to-cyan-500/25',
  ai: 'from-violet-600/40 via-purple-500/25 to-pink-500/30',
  settings: 'from-slate-600/40 via-zinc-700/50 to-cyan-600/25',
  terminal: 'from-emerald-700/40 via-zinc-950/90 to-teal-700/25',
  host: 'from-sky-500/30 via-blue-600/20 to-indigo-500/25',
};

function renderLumaLiveMockup(id: string) {
  switch (id) {
    case 'office':
      return (
        <div className="w-[84%] h-[76%] rounded-md overflow-hidden border border-white/20 bg-white shadow-md flex flex-col mt-3">
          <div className="h-3 bg-[#185ABD] flex items-center px-1.5 gap-1">
            <span className="w-4 h-1 rounded bg-white/75" />
            <span className="w-3 h-1 rounded bg-white/40" />
            <span className="ml-auto w-2 h-1 rounded bg-emerald-300" />
          </div>
          <div className="h-2.5 bg-[#F3F2F1] border-b border-slate-200 flex items-center px-1.5 gap-1">
            <span className="w-2 h-1.5 rounded-xs bg-slate-300" />
            <span className="w-4 h-1.5 rounded-xs bg-slate-300" />
            <span className="w-3 h-1.5 rounded-xs bg-slate-300" />
          </div>
          <div className="flex-1 bg-[#E6E6E6] flex justify-center py-1">
            <div className="w-3/4 h-full bg-white shadow-xs p-1.5 space-y-1">
              <div className="h-1.5 w-2/3 bg-[#185ABD]/70 rounded-xs" />
              <div className="h-1 w-full bg-slate-300 rounded-xs" />
              <div className="h-1 w-5/6 bg-slate-200 rounded-xs" />
              <div className="h-1 w-4/6 bg-slate-200 rounded-xs" />
            </div>
          </div>
        </div>
      );
    case 'code_studio':
      return (
        <div className="w-[84%] h-[76%] rounded-md overflow-hidden border border-white/15 bg-[#0d1117] shadow-md flex mt-3">
          <div className="w-5 bg-[#161b22] border-r border-white/10 p-1 space-y-1">
            <div className="h-1 bg-cyan-400/60 rounded" />
            <div className="h-1 bg-white/25 rounded" />
            <div className="h-1 bg-white/25 rounded" />
          </div>
          <div className="flex-1 p-1.5 space-y-1 font-mono">
            <div className="h-1 w-1/2 bg-violet-400/80 rounded" />
            <div className="h-1 w-3/4 bg-sky-400/70 rounded ml-2" />
            <div className="h-1 w-2/3 bg-emerald-400/75 rounded ml-2" />
            <div className="h-1 w-1/3 bg-amber-400/75 rounded ml-4" />
            <div className="h-1 w-3/5 bg-white/30 rounded" />
          </div>
        </div>
      );
    case 'cut_studio':
      return (
        <div className="w-[84%] h-[76%] rounded-md overflow-hidden border border-white/15 bg-[#0e0e14] shadow-md flex flex-col mt-3 p-1.5 gap-1">
          <div className="flex-1 rounded bg-gradient-to-br from-fuchsia-600/40 via-indigo-900/70 to-cyan-500/40 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-white/20 border border-white/40" />
          </div>
          <div className="h-4 rounded bg-black/60 p-0.5 flex flex-col gap-0.5">
            <div className="h-1.5 w-4/5 bg-cyan-400/80 rounded-xs" />
            <div className="h-1 w-3/5 bg-emerald-400/70 rounded-xs" />
          </div>
        </div>
      );
    case 'explorer':
      return (
        <div className="w-[84%] h-[76%] rounded-md overflow-hidden border border-white/15 bg-[#111520] shadow-md flex mt-3">
          <div className="w-6 bg-white/5 border-r border-white/10 p-1 space-y-1">
            <div className="h-1 bg-amber-400/80 rounded" />
            <div className="h-1 bg-white/25 rounded" />
            <div className="h-1 bg-white/25 rounded" />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-1 p-1.5">
            <div className="rounded bg-white/5 p-1 space-y-1">
              <div className="h-1.5 w-3/4 bg-amber-400/70 rounded" />
              <div className="h-1 w-full bg-white/25 rounded" />
              <div className="h-1 w-2/3 bg-white/20 rounded" />
            </div>
            <div className="rounded bg-white/5 p-1 space-y-1">
              <div className="h-1.5 w-3/4 bg-cyan-400/70 rounded" />
              <div className="h-1 w-full bg-white/25 rounded" />
              <div className="h-1 w-2/3 bg-white/20 rounded" />
            </div>
          </div>
        </div>
      );
    case 'terminal':
      return (
        <div className="w-[84%] h-[76%] rounded-md overflow-hidden border border-emerald-500/30 bg-[#05080b] shadow-md p-2 space-y-1 mt-3">
          <div className="h-1 w-2/3 bg-emerald-400/85 rounded" />
          <div className="h-1 w-1/2 bg-cyan-400/70 rounded" />
          <div className="h-1 w-4/5 bg-white/40 rounded" />
          <div className="h-1 w-1/3 bg-emerald-300 rounded animate-pulse" />
        </div>
      );
    default:
      return null;
  }
}

/**
 * Luma OS 1.5.4 (Carbon) — Live-Preview MRU Glassmorphic Alt+Tab Switcher (Topmost Over ALL Windows).
 * Shows real live screenshots of running Windows apps (PrintWindow PW_RENDERFULLCONTENT) AND live visual previews
 * of Luma OS windows, ordered strictly by Most Recently Used (last opened/active window always moves to front!).
 */
export const LumaAltTabSwitcher: React.FC<LumaAltTabSwitcherProps> = ({
  open,
  isDark,
  items,
  selectedIndex,
  wallpaperPreviewUrl,
  fromExternal,
  onSelectIndex,
  onActivate,
  onGoHome,
  onCloseItem,
  onCancel,
}) => {
  const [query, setQuery] = useState('');
  const [clockText, setClockText] = useState(() =>
    new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    setClockText(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.map((item, origIdx) => ({ item, origIdx }));
    return items
      .map((item, origIdx) => ({ item, origIdx }))
      .filter(
        ({ item }) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          (item.kind === 'home' && 'главная домой luma desktop'.includes(q))
      );
  }, [items, query]);

  if (!open) return null;

  const activeEntry = items[selectedIndex] || items[0];

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[9700] bg-black/55 backdrop-blur-2xl flex items-center justify-center p-5 sm:p-8 select-none animate-in fade-in duration-100"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--luma-accent) 26%, transparent), transparent 60%)',
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-6xl rounded-[28px] border p-5 sm:p-6 shadow-[0_40px_120px_rgba(0,0,0,0.75)] space-y-4 overflow-hidden ${
          isDark
            ? 'bg-[#090d16]/92 border-white/18 text-white'
            : 'bg-white/94 border-slate-300/90 text-slate-900'
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--luma-accent)] to-indigo-500 text-white shadow-lg shadow-[var(--luma-accent)]/30 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight">Luma Switcher · Alt+Tab</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--luma-accent)]/20 text-[var(--luma-accent)] border border-[var(--luma-accent)]/35">
                  Живые превью · MRU
                </span>
                {fromExternal && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Поверх всех окон
                  </span>
                )}
              </div>
              <div className={`text-[11px] mt-0.5 ${isDark ? 'text-white/55' : 'text-slate-500'}`}>
                Недавно открытые впереди ({items.length}) · Отпустите <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Alt</kbd> или нажмите <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Enter</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs ${
                isDark ? 'bg-white/5 border-white/12 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5 opacity-55" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered[0]) {
                    e.preventDefault();
                    onActivate(filtered[0].item);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel();
                  }
                }}
                placeholder="Найти окно..."
                className="bg-transparent outline-none w-32 text-xs placeholder:opacity-50"
              />
            </div>

            <button
              type="button"
              onClick={onGoHome}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[var(--luma-accent)] to-cyan-500 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-[var(--luma-accent)]/25 inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>На главную</span>
              <kbd className="px-1.5 py-0.5 rounded bg-black/25 font-mono text-[9px]">Win+D</kbd>
            </button>

            <button
              type="button"
              onClick={onCancel}
              title="Закрыть (Esc)"
              className={`p-2 rounded-xl cursor-pointer transition ${
                isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Live-Preview Window Cards Grid */}
        {filtered.length === 0 ? (
          <div className={`py-14 text-center text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Окна по запросу не найдены. Нажмите <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Win+D</kbd> для возврата в Luma OS.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 max-h-[62vh] overflow-y-auto pr-1 py-1">
            {filtered.map(({ item, origIdx }) => {
              const selected = origIdx === selectedIndex;
              const isHome = item.kind === 'home';
              const grad = ACCENT_PALETTE[item.id] || ACCENT_PALETTE[item.kind] || ACCENT_PALETTE.host;
              const lumaMock = item.kind === 'luma' ? renderLumaLiveMockup(item.id) : null;

              return (
                <div
                  key={item.key}
                  onMouseEnter={() => onSelectIndex(origIdx)}
                  onClick={() => onActivate(item)}
                  className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-150 flex flex-col ${
                    selected
                      ? 'border-[var(--luma-accent)] ring-2 ring-[var(--luma-accent)]/70 scale-[1.03] shadow-[0_18px_46px_rgba(0,0,0,0.5)] z-10'
                      : isDark
                      ? 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]'
                      : 'border-slate-200 bg-slate-50/90 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {/* REAL LIVE 16:9 WINDOW PREVIEW AREA! */}
                  <div
                    className={`relative aspect-video w-full overflow-hidden flex items-center justify-center bg-gradient-to-br ${grad}`}
                    style={
                      isHome && wallpaperPreviewUrl
                        ? {
                            backgroundImage: `linear-gradient(180deg, rgba(8,12,22,0.16), rgba(8,12,22,0.62)), url(${wallpaperPreviewUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  >
                    {/* 1. REAL LIVE SCREENSHOT OF WINDOWS APP (Chrome / Telegram / VS Code / Games!) */}
                    {item.previewUrl ? (
                      <>
                        <img
                          src={item.previewUrl}
                          alt={item.title}
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/75 to-transparent" />
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-[8px] font-mono font-bold text-emerald-300 inline-flex items-center gap-1 border border-white/15">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE
                        </span>
                        {item.iconUrl && (
                          <div className="absolute bottom-2 left-2 w-6 h-6 rounded-lg bg-black/65 backdrop-blur-md border border-white/20 flex items-center justify-center">
                            <img src={item.iconUrl} alt="" className="w-4 h-4 object-contain" />
                          </div>
                        )}
                      </>
                    ) : isHome ? (
                      <div className="flex flex-col items-center justify-center text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                        <div className="text-2xl font-black tracking-tight leading-none">{clockText}</div>
                        <div className="mt-1 px-2 py-0.5 rounded-full bg-black/45 border border-white/20 text-[9px] font-bold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-cyan-300" />
                          Luma OS · Главная
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Mini Window Chrome Bar */}
                        <div className="absolute inset-x-2.5 top-2 h-4 rounded-t-lg bg-black/35 backdrop-blur-sm border border-white/10 flex items-center justify-between px-2">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80" />
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                          </div>
                          <span className="text-[8px] font-mono text-white/60 truncate max-w-[100px]">
                            {item.kind === 'host' ? 'Windows' : 'Luma OS'}
                          </span>
                        </div>

                        {lumaMock ? (
                          lumaMock
                        ) : (
                          <div className="mt-3 w-12 h-12 rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 shadow-lg flex items-center justify-center overflow-hidden">
                            {item.iconUrl ? (
                              <img
                                src={item.iconUrl}
                                alt=""
                                className="w-7 h-7 object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : item.icon ? (
                              <span className="text-white scale-110">{item.icon}</span>
                            ) : (
                              <AppWindow className="w-6 h-6 text-cyan-300" />
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Close button on hover */}
                    {onCloseItem && !isHome && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseItem(item);
                        }}
                        title="Закрыть окно"
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-black/65 hover:bg-rose-500 text-white/85 hover:text-white transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    {item.minimized && !isHome && (
                      <span className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-black/60 text-[8px] font-mono text-amber-300">
                        Свёрнуто
                      </span>
                    )}
                    {isHome && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-emerald-500/85 text-white text-[9px] font-mono font-bold shadow">
                        Win+D
                      </span>
                    )}
                  </div>

                  {/* Card Footer Metadata */}
                  <div
                    className={`px-3 py-2 flex items-center justify-between gap-2 ${
                      selected
                        ? isDark
                          ? 'bg-[var(--luma-accent)]/20'
                          : 'bg-[var(--luma-accent)]/12'
                        : isDark
                        ? 'bg-white/[0.03]'
                        : 'bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate leading-tight">{item.title}</div>
                      <div
                        className={`text-[10px] truncate mt-0.5 flex items-center gap-1 ${
                          isDark ? 'text-white/55' : 'text-slate-500'
                        }`}
                      >
                        {item.kind === 'host' && <Monitor className="w-2.5 h-2.5 shrink-0 text-sky-400" />}
                        {item.kind === 'home' && <Home className="w-2.5 h-2.5 shrink-0 text-emerald-400" />}
                        <span className="truncate">{item.subtitle}</span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md uppercase ${
                        item.kind === 'home'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : item.kind === 'host'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-400/25'
                          : 'bg-violet-500/20 text-violet-300 border border-violet-400/25'
                      }`}
                    >
                      {item.kind === 'home' ? 'Home' : item.kind === 'host' ? 'Win' : 'Luma'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Active Selection Bar */}
        <div
          className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
            isDark ? 'border-white/10 text-white/60' : 'border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)] animate-pulse shrink-0" />
            <span className="truncate">
              Выбрано:{' '}
              <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                {activeEntry ? activeEntry.title : 'Главная Luma OS'}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span>Tab / Стрелки — выбор</span>
            <span>·</span>
            <span>Enter / Отпустить Alt — перейти</span>
            <span>·</span>
            <span>Win+D — Luma OS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
