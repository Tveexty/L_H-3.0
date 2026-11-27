import React, { useMemo, useState } from 'react';
import {
  AppWindow,
  BatteryCharging,
  BellOff,
  Grid,
  Keyboard,
  Layers,
  Lock,
  Monitor,
  Moon,
  Pin,
  Power,
  RotateCcw,
  Search,
  Settings,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import { AppItem, HostWindowInfo } from '../data/launcherData';

export interface NovaOpenLumaWindow {
  id: string;
  title: string;
  minimized: boolean;
  alwaysOnTop?: boolean;
}

interface LumaNovaPanelProps {
  open: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  isDark: boolean;
  batteryLevel: number;
  isCharging: boolean;
  kbdShort: string;
  volume: number;
  isMuted: boolean;
  brightness: number;
  dndEnabled: boolean;
  nightLightEnabled: boolean;
  unreadNotifsCount: number;
  activeDesktop: number;
  apps: AppItem[];
  openLumaWindows: NovaOpenLumaWindow[];
  hostWindows: HostWindowInfo[];
  onSwitchDesktop: (desk: number) => void;
  onOpenSpotlight: () => void;
  onLaunchApp: (app: AppItem) => void;
  onOpenLumaWindow: (id: string) => void;
  onCloseLumaWindow: (id: string) => void;
  onToggleLumaTopmost: (id: string) => void;
  onFocusHostWindow: (pid: number) => void;
  onToggleHostTopmost: (pid: number, hwnd?: number) => void;
  onCycleKeyboard: () => void;
  onChangeVolume: (val: number) => void;
  onToggleMute: () => void;
  onChangeBrightness: (val: number) => void;
  onToggleDnd: () => void;
  onToggleNightLight: () => void;
  onOpenSettings: () => void;
  onSwitchToClassic?: () => void;
  onPowerAction: (action: 'lock' | 'sleep' | 'restart' | 'shutdown') => void;
}

/**
 * Luma OS 1.7.3 (Oxygen) — Native "Luma Nova" System Style Top-Right Indicator Pill & Compact Control/Launcher Panel.
 * Shown when DesignStyle === 'nova' (with Start button cleanly removed from the taskbar!).
 * Includes 1-click return to Classic taskbar so you never get stuck in Nova mode.
 */
export const LumaNovaPanel: React.FC<LumaNovaPanelProps> = ({
  open,
  onToggleOpen,
  onClose,
  isDark,
  batteryLevel,
  isCharging,
  kbdShort,
  volume,
  isMuted,
  brightness,
  dndEnabled,
  nightLightEnabled,
  unreadNotifsCount,
  activeDesktop,
  apps,
  openLumaWindows,
  hostWindows,
  onSwitchDesktop,
  onOpenSpotlight,
  onLaunchApp,
  onOpenLumaWindow,
  onCloseLumaWindow,
  onToggleLumaTopmost,
  onFocusHostWindow,
  onToggleHostTopmost,
  onCycleKeyboard,
  onChangeVolume,
  onToggleMute,
  onChangeBrightness,
  onToggleDnd,
  onToggleNightLight,
  onOpenSettings,
  onSwitchToClassic,
  onPowerAction,
}) => {
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<'launcher' | 'windows'>('launcher');

  const quickApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = apps.filter((a) => !q || a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
    return list.slice(0, 12);
  }, [apps, search]);

  const totalWindows = openLumaWindows.length + hostWindows.length;

  return (
    <>
      {/* TOP-RIGHT LUMA NOVA SYSTEM INDICATOR PILL (Language + Wi-Fi + Battery) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed top-2.5 right-3 z-[9250] flex items-center gap-1.5 select-none"
      >
        <button
          type="button"
          onClick={onCycleKeyboard}
          title="Переключить язык клавиатуры"
          className={`h-8 px-2.5 rounded-full border backdrop-blur-xl text-[11px] font-mono font-bold flex items-center gap-1 transition cursor-pointer shadow-lg ${
            isDark
              ? 'bg-[#0b1322]/88 border-white/15 text-white hover:border-sky-400/70'
              : 'bg-white/90 border-slate-300 text-slate-900 hover:border-sky-500'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
          <span>{kbdShort || 'RUS'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleOpen}
          title="Открыть компактную панель Luma Nova (Пуск, Окна, Alt+R, Столы, Звук, Яркость, Питание)"
          className={`h-8 px-3 rounded-full border backdrop-blur-xl flex items-center gap-2.5 text-xs font-semibold transition cursor-pointer shadow-lg ${
            open
              ? 'bg-[var(--luma-accent)] border-sky-300/60 text-white shadow-sky-500/30'
              : isDark
              ? 'bg-[#0b1322]/90 border-white/15 text-white hover:border-sky-400/70'
              : 'bg-white/90 border-slate-300 text-slate-900 hover:border-sky-500'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
            <BatteryCharging className={`w-3.5 h-3.5 ${isCharging ? 'text-emerald-400' : ''}`} />
            {batteryLevel}%
          </span>
          {unreadNotifsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
          )}
        </button>
      </div>

      {/* COMPACT LUMA NOVA LAUNCHER & SYSTEM PANEL POPOVER */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-spring-panel fixed top-12 right-3 z-[9450] w-[390px] max-w-[95vw] max-h-[84vh] overflow-y-auto rounded-[24px] border p-4 shadow-[0_28px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl space-y-3.5 select-none ${
            isDark
              ? 'bg-[#0a111f]/94 border-white/15 text-white'
              : 'bg-[#f4f7fb]/95 border-slate-300 text-slate-900'
          }`}
        >
          {/* Header: Luma Nova Brand + 1-Click Classic Switch + Alt+R + Settings + Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md font-black text-xs shrink-0">
                N
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold leading-tight truncate">Luma Nova · 1.8</div>
                <div className="text-[10px] opacity-60 font-mono truncate">Пуск · Окна · Столы · Питание</div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onSwitchToClassic && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToClassic();
                  }}
                  title="Вернуть классическую панель задач"
                  className="px-2 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-400/35 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                >
                  Классика
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSpotlight();
                }}
                title="Быстрый поиск Alt+R"
                className="px-2 py-1 rounded-full bg-sky-500/20 hover:bg-[var(--luma-accent)] text-sky-300 hover:text-white border border-sky-400/35 text-[10px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer transition"
              >
                <Search className="w-3 h-3" />
                Alt+R
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                title="Настройки системы"
                className={`p-1.5 rounded-full cursor-pointer transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`p-1.5 rounded-full cursor-pointer transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Workspaces Switcher (D1 - D4) */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[var(--luma-accent)]" />
              Столы
            </span>
            <div className="flex items-center gap-1 flex-1 justify-end">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onSwitchDesktop(d)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition cursor-pointer ${
                    activeDesktop === d
                      ? 'bg-[var(--luma-accent)] text-white shadow'
                      : isDark
                      ? 'bg-white/8 text-white/75 hover:bg-white/15'
                      : 'bg-black/8 text-slate-700 hover:bg-black/15'
                  }`}
                >
                  D{d}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Brightness Sliders */}
          <div className={`p-3 rounded-2xl border space-y-2.5 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/80 border-slate-200'}`}>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-1.5 rounded-full bg-sky-500/15 text-[var(--luma-accent)] cursor-pointer"
                title="Вкл/Выкл звук"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => onChangeVolume(Number(e.target.value))}
                className="flex-1 accent-[var(--luma-accent)] cursor-pointer h-1.5"
              />
              <span className="w-8 text-right font-mono text-[11px] font-bold">{isMuted ? 0 : volume}%</span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-full bg-amber-500/15 text-amber-400">
                <Sun className="w-3.5 h-3.5" />
              </span>
              <input
                type="range"
                min={20}
                max={100}
                value={brightness}
                onChange={(e) => onChangeBrightness(Number(e.target.value))}
                className="flex-1 accent-[var(--luma-accent)] cursor-pointer h-1.5"
              />
              <span className="w-8 text-right font-mono text-[11px] font-bold">{brightness}%</span>
            </div>

            {/* Quick Toggle Pills */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={onToggleDnd}
                className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition ${
                  dndEnabled ? 'bg-[var(--luma-accent)] text-white' : isDark ? 'bg-white/8 hover:bg-white/15' : 'bg-black/6 hover:bg-black/12'
                }`}
              >
                <BellOff className="w-3 h-3" /> Не бесп.
              </button>
              <button
                type="button"
                onClick={onToggleNightLight}
                className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition ${
                  nightLightEnabled ? 'bg-amber-500 text-black' : isDark ? 'bg-white/8 hover:bg-white/15' : 'bg-black/6 hover:bg-black/12'
                }`}
              >
                <Moon className="w-3 h-3" /> Ночной
              </button>
              <button
                type="button"
                onClick={onCycleKeyboard}
                className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition ${
                  isDark ? 'bg-white/8 hover:bg-white/15' : 'bg-black/6 hover:bg-black/12'
                }`}
              >
                <Keyboard className="w-3 h-3 text-[var(--luma-accent)]" /> {kbdShort || 'RUS'}
              </button>
            </div>
          </div>

          {/* Section Switcher: Compact Start Launcher vs Open Desktop Windows */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/20">
            <button
              type="button"
              onClick={() => setSection('launcher')}
              className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                section === 'launcher' ? 'bg-[var(--luma-accent)] text-white shadow' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Пуск / Лаунчер
            </button>
            <button
              type="button"
              onClick={() => setSection('windows')}
              className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                section === 'windows' ? 'bg-[var(--luma-accent)] text-white shadow' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <AppWindow className="w-3.5 h-3.5" />
              Окна ({totalWindows})
            </button>
          </div>

          {/* Compact Start / App Launcher */}
          {section === 'launcher' && (
            <div className="space-y-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                <Search className="w-3.5 h-3.5 opacity-55 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Найти приложение..."
                  className="w-full bg-transparent outline-none text-xs"
                />
              </div>

              {/* Built-in Luma Essential Modules Row */}
              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                {[
                  { id: 'explorer', label: 'Файлы' },
                  { id: 'terminal', label: 'Терминал' },
                  { id: 'office', label: 'Office' },
                  { id: 'ai', label: 'AI 5.0' },
                  { id: 'code_studio', label: 'Code' },
                  { id: 'gamepad', label: 'Геймпад' },
                  { id: 'uninstaller', label: 'Хвосты' },
                  { id: 'apps', label: 'Все' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onOpenLumaWindow(m.id);
                      onClose();
                    }}
                    className={`py-2 px-1.5 rounded-xl border text-center font-semibold truncate cursor-pointer transition ${
                      isDark
                        ? 'bg-white/[0.04] border-white/10 hover:border-sky-400/60 hover:bg-sky-500/15'
                        : 'bg-white border-slate-200 hover:border-sky-500'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* User / Favorite Apps Grid */}
              {quickApps.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                  {quickApps.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => {
                        onLaunchApp(app);
                        onClose();
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center gap-1.5 text-[11px] truncate cursor-pointer transition ${
                        isDark
                          ? 'bg-white/[0.03] border-white/10 hover:bg-white/10'
                          : 'bg-white border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {app.iconUrl ? (
                        <img src={app.iconUrl} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
                      ) : (
                        <AppWindow className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
                      )}
                      <span className="truncate font-medium">{app.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Open Desktop Windows Switcher (with 📌 Always on Top!) */}
          {section === 'windows' && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
              {totalWindows === 0 ? (
                <div className="py-6 text-center text-xs opacity-60">Нет открытых окон на рабочем столе</div>
              ) : (
                <>
                  {openLumaWindows.map((w) => (
                    <div
                      key={w.id}
                      className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onOpenLumaWindow(w.id);
                          onClose();
                        }}
                        className="flex-1 text-left flex items-center gap-2 truncate cursor-pointer"
                      >
                        <AppWindow className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
                        <span className="truncate font-semibold">{w.title}</span>
                        {w.minimized && <span className="text-[9px] opacity-50">(свёрн.)</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleLumaTopmost(w.id)}
                        title="Поверх всех окон"
                        className={`p-1 rounded-lg cursor-pointer transition ${
                          w.alwaysOnTop ? 'bg-sky-500/25 text-sky-300' : 'opacity-50 hover:opacity-100 hover:bg-white/10'
                        }`}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onCloseLumaWindow(w.id)}
                        title="Закрыть"
                        className="p-1 rounded-lg opacity-50 hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {hostWindows.map((hw) => (
                    <div
                      key={`host_${hw.pid}_${hw.hwnd || 0}`}
                      className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onFocusHostWindow(hw.pid);
                          onClose();
                        }}
                        className="flex-1 text-left flex items-center gap-2 truncate cursor-pointer"
                      >
                        <Monitor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate font-medium">{hw.title || hw.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleHostTopmost(hw.pid, hw.hwnd)}
                        title="Поверх всех окон (Win32 Topmost)"
                        className={`p-1 rounded-lg cursor-pointer transition ${
                          hw.topmost ? 'bg-sky-500/25 text-sky-300' : 'opacity-50 hover:opacity-100 hover:bg-white/10'
                        }`}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Bottom Power Row */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-white/10 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => { onClose(); onPowerAction('lock'); }}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition ${isDark ? 'bg-white/6 hover:bg-white/15' : 'bg-black/5 hover:bg-black/12'}`}
            >
              <Lock className="w-3 h-3" /> Блок
            </button>
            <button
              type="button"
              onClick={() => { onClose(); onPowerAction('sleep'); }}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition ${isDark ? 'bg-white/6 hover:bg-white/15' : 'bg-black/5 hover:bg-black/12'}`}
            >
              <Moon className="w-3 h-3" /> Сон
            </button>
            <button
              type="button"
              onClick={() => { onClose(); onPowerAction('restart'); }}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition ${isDark ? 'bg-white/6 hover:bg-white/15' : 'bg-black/5 hover:bg-black/12'}`}
            >
              <RotateCcw className="w-3 h-3" /> Перезагр.
            </button>
            <button
              type="button"
              onClick={() => { onClose(); onPowerAction('shutdown'); }}
              className="py-1.5 rounded-xl flex items-center justify-center gap-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white cursor-pointer transition"
            >
              <Power className="w-3 h-3" /> Выкл.
            </button>
          </div>
        </div>
      )}
    </>
  );
};
