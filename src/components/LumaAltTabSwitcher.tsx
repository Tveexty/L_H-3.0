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
  office: 'from-blue-600/35 via-sky-500/20 to-indigo-600/30',
  cut_studio: 'from-fuchsia-600/35 via-violet-500/20 to-cyan-500/25',
  code_studio: 'from-emerald-500/30 via-teal-500/20 to-sky-500/25',
  ai: 'from-violet-600/35 via-purple-500/25 to-pink-500/25',
  settings: 'from-slate-500/30 via-zinc-500/20 to-cyan-500/20',
  terminal: 'from-emerald-600/30 via-zinc-900/60 to-cyan-600/20',
  host: 'from-sky-500/30 via-blue-600/20 to-indigo-500/25',
};

/**
 * Luma OS 1.5.3 (Carbon) — Flagship Glassmorphic Alt+Tab Switcher HUD (Topmost Over ALL Windows).
 * Surfaces instantly above Chrome, Telegram, games, and fullscreen apps, letting you jump straight back
 * to Luma OS Home ("Главная · Luma OS"), any built-in Luma studio, or any running Windows application.
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
          (item.kind === 'home' && ('главная домой luma desktop'.includes(q)))
      );
  }, [items, query]);

  if (!open) return null;

  const activeEntry = items[selectedIndex] || items[0];

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[1250] bg-black/55 backdrop-blur-2xl flex items-center justify-center p-5 sm:p-8 select-none animate-in fade-in duration-100"
    >
      {/* Subtle radial spotlight behind the floating dock */}
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--luma-accent) 26%, transparent), transparent 60%)',
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-5xl rounded-[28px] border p-5 sm:p-6 shadow-[0_40px_120px_rgba(0,0,0,0.75)] space-y-4 overflow-hidden ${
          isDark
            ? 'bg-[#090d16]/90 border-white/18 text-white'
            : 'bg-white/92 border-slate-300/90 text-slate-900'
        }`}
      >
        {/* Top glass highlight bar */}
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
                  Поверх всех окон
                </span>
                {fromExternal && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Переход из Windows-окна
                  </span>
                )}
              </div>
              <div className={`text-[11px] mt-0.5 ${isDark ? 'text-white/55' : 'text-slate-500'}`}>
                Окна Luma OS + приложения Windows ({items.length}) · Отпустите <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Alt</kbd> или нажмите <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Enter</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick filter */}
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

            {/* 1-click Home Desktop button */}
            <button
              type="button"
              onClick={onGoHome}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[var(--luma-accent)] to-cyan-500 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-[var(--luma-accent)]/25 inline-flex items-center gap-1.5 transition cursor-pointer"
              title="Вернуться на главный экран Luma OS (Win + D)"
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

        {/* Visual Window Cards Grid */}
        {filtered.length === 0 ? (
          <div className={`py-14 text-center text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Окна по запросу не найдены. Нажмите <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Win+D</kbd> для возврата на главный экран Luma OS.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 max-h-[60vh] overflow-y-auto pr-1 py-1">
            {filtered.map(({ item, origIdx }) => {
              const selected = origIdx === selectedIndex;
              const isHome = item.kind === 'home';
              const grad = ACCENT_PALETTE[item.id] || ACCENT_PALETTE[item.kind] || ACCENT_PALETTE.host;

              return (
                <div
                  key={item.key}
                  onMouseEnter={() => onSelectIndex(origIdx)}
                  onClick={() => onActivate(item)}
                  className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-150 flex flex-col ${
                    selected
                      ? 'border-[var(--luma-accent)] ring-2 ring-[var(--luma-accent)]/60 scale-[1.03] shadow-[0_16px_42px_rgba(0,0,0,0.45)] z-10'
                      : isDark
                      ? 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]'
                      : 'border-slate-200 bg-slate-50/90 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {/* Visual Mini Preview Canvas (16:9-ish thumbnail header!) */}
                  <div
                    className={`relative h-24 w-full overflow-hidden flex items-center justify-center bg-gradient-to-br ${grad}`}
                    style={
                      isHome && wallpaperPreviewUrl
                        ? {
                            backgroundImage: `linear-gradient(180deg, rgba(8,12,22,0.18), rgba(8,12,22,0.62)), url(${wallpaperPreviewUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  >
                    {/* Mini Window Mockup Chrome */}
                    {!isHome && (
                      <div className="absolute inset-x-2.5 top-2 h-4 rounded-t-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between px-2">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80" />
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                        </div>
                        <span className="text-[8px] font-mono text-white/60 truncate max-w-[90px]">
                          {item.kind === 'host' ? 'Windows' : 'Luma OS'}
                        </span>
                      </div>
                    )}

                    {/* Center Icon or Live Home Clock */}
                    {isHome ? (
                      <div className="flex flex-col items-center justify-center text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                        <div className="text-2xl font-black tracking-tight leading-none">{clockText}</div>
                        <div className="mt-1 px-2 py-0.5 rounded-full bg-black/45 border border-white/20 text-[9px] font-bold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-cyan-300" />
                          Luma OS · Главная
                        </div>
                      </div>
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

                    {/* Close window button on hover */}
                    {onCloseItem && !isHome && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseItem(item);
                        }}
                        title="Закрыть окно"
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-black/60 hover:bg-rose-500 text-white/80 hover:text-white transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    {/* Status Badge */}
                    {item.minimized && !isHome && (
                      <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/55 text-[8px] font-mono text-amber-300">
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
                    className={`px-3 py-2.5 flex items-center justify-between gap-2 ${
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
            <span>·</span>
            <span>Esc — отмена</span>
          </div>
        </div>
      </div>
    </div>
  );
};
