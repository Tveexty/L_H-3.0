import React from 'react';
import { AppWindow, Layers, Monitor, X } from 'lucide-react';

export interface AltTabEntry {
  key: string;
  kind: 'luma' | 'host';
  id: string;
  pid?: number;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  iconUrl?: string;
  minimized?: boolean;
  active?: boolean;
}

interface LumaAltTabSwitcherProps {
  open: boolean;
  isDark: boolean;
  items: AltTabEntry[];
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  onActivate: (item: AltTabEntry) => void;
  onCloseItem?: (item: AltTabEntry) => void;
  onCancel: () => void;
}

/**
 * Luma OS 1.5.2 (Carbon) — Native Alt+Tab Window Switcher HUD.
 * Replaces Windows Alt+Tab cleanly, switching seamlessly between built-in Luma OS windows
 * (Office Studio, Code Studio, Cut Studio, AI, Explorer, Terminal...) AND live Windows apps (Chrome, Telegram, Steam...).
 */
export const LumaAltTabSwitcher: React.FC<LumaAltTabSwitcherProps> = ({
  open,
  isDark,
  items,
  selectedIndex,
  onSelectIndex,
  onActivate,
  onCloseItem,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[1150] bg-black/45 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl rounded-3xl border p-5 shadow-[0_32px_90px_rgba(0,0,0,0.65)] space-y-4 ${
          isDark
            ? 'bg-[#0c0f16]/95 border-white/15 text-white'
            : 'bg-white/95 border-slate-300 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[var(--luma-accent)]/20 text-[var(--luma-accent)] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <div className="text-sm font-bold tracking-tight">Переключатель окон Luma OS · Alt+Tab</div>
              <div className={`text-[11px] font-mono ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                Окна Luma + приложения Windows ({items.length}) · Tab / Стрелки — выбор · Отпустите Alt или Enter — открыть
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className={`p-1.5 rounded-xl cursor-pointer ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-slate-200 text-slate-500'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className={`py-12 text-center text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
            Нет открытых окон. Нажмите Alt+R для быстрого запуска любого приложения.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const selected = idx === selectedIndex;
              return (
                <div
                  key={item.key}
                  onMouseEnter={() => onSelectIndex(idx)}
                  onClick={() => onActivate(item)}
                  className={`group relative rounded-2xl border p-3.5 cursor-pointer transition-all flex flex-col justify-between gap-3 min-h-[118px] ${
                    selected
                      ? 'border-[var(--luma-accent)] bg-[var(--luma-accent)]/15 ring-2 ring-[var(--luma-accent)]/50 scale-[1.02] shadow-lg'
                      : isDark
                      ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.iconUrl ? (
                        <img
                          src={item.iconUrl}
                          alt=""
                          className="w-6 h-6 object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : item.icon ? (
                        <span className="text-[var(--luma-accent)]">{item.icon}</span>
                      ) : (
                        <AppWindow className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md uppercase ${
                          item.kind === 'host'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400/25'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/25'
                        }`}
                      >
                        {item.kind === 'host' ? 'Windows' : 'Luma'}
                      </span>
                      {onCloseItem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseItem(item);
                          }}
                          title="Закрыть окно"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate leading-snug">{item.title}</div>
                    <div className={`text-[10px] truncate mt-0.5 flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      {item.kind === 'host' && <Monitor className="w-2.5 h-2.5 shrink-0" />}
                      <span className="truncate">{item.subtitle}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
