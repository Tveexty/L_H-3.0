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

export interface UbuntuOpenLumaWindow {
  id: string;
  title: string;
  minimized: boolean;
  alwaysOnTop?: boolean;
}

interface LumaUbuntuPanelProps {
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
  openLumaWindows: UbuntuOpenLumaWindow[];
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
  onPowerAction: (action: 'lock' | 'sleep' | 'restart' | 'shutdown') => void;
}

/**
 * Luma OS 1.6 (Nitrogen) — Authentic Ubuntu System Style Top-Right Indicator Pill & Compact Control/Launcher Panel.
 * Shown when DesignStyle === 'ubuntu' (with Start button removed from the taskbar!).
 * Clicking the top-right Battery / Wi-Fi / Language pill (or pressing Win key in Ubuntu style) opens this sleek panel
 * containing: Compact Start/App Launcher, Desktop Window Switcher, Alt+R trigger, Workspaces, Sound/Brightness & Power.
 */
export const LumaUbuntuPanel: React.FC<LumaUbuntuPanelProps> = ({
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
      {/* TOP-RIGHT UBUNTU SYSTEM INDICATOR PILL (Language + Wi-Fi + Battery) */}
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
              ? 'bg-[#1f1726]/88 border-white/15 text-white hover:border-[#E95420]/70'
              : 'bg-white/88 border-slate-300 text-slate-900 hover:border-[#E95420]'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5 text-[#E95420]" />
          <span>{kbdShort || 'RUS'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleOpen}
          title="Открыть компактную панель Ubuntu (Пуск, Окна, Alt+R, Столы, Звук, Яркость, Питание)"
          className={`h-8 px-3 rounded-full border backdrop-blur-xl flex items-center gap-2.5 text-xs font-semibold transition cursor-pointer shadow-lg ${
            open
              ? 'bg-[#E95420] border-[#ff7849] text-white shadow-[#E95420]/30'
              : isDark
              ? 'bg-[#1f1726]/90 border-white/15 text-white hover:border-[#E95420]/70'
              : 'bg-white/90 border-slate-300 text-slate-900 hover:border-[#E95420]'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
            <BatteryCharging className={`w-3.5 h-3.5 ${isCharging ? 'text-emerald-400' : ''}`} />
            {batteryLevel}%
          </span>
          {unreadNotifsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* COMPACT UBUNTU LAUNCHER & SYSTEM PANEL POPOVER */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed top-12 right-3 z-[9450] w-[390px] max-w-[95vw] max-h-[84vh] overflow-y-auto rounded-[24px] border p-4 shadow-[0_28px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl space-y-3.5 select-none ${
            isDark
              ? 'bg-[#17121e]/94 border-white/15 text-white'
              : 'bg-[#f7f4f8]/95 border-slate-300 text-slate-900'
          }`}
        >
          {/* Header: Ubuntu Nitrogen Brand + Alt+R + Settings + Power */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E95420] to-[#77216F] text-white flex items-center justify-center shadow-md font-black text-xs">
                U
              </div>
              <div>
                <div className="text-xs font-extrabold leading-tight">Luma Ubuntu · Nitrogen</div>
                <div className="text-[10px] opacity-60 font-mono">Пуск · Окна · Столы · Питание</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSpotlight();
                }}
                title="Быстрый поиск Alt+R"
                className="px-2 py-1 rounded-full bg-[#E95420]/20 hover:bg-[#E95420] text-[#ff875c] hover:text-white border border-[#E95420]/35 text-[10px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer transition"
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
              <Layers className="w-3 h-3 text-[#E95420]" />
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
                      ? 'bg-[#E95420] text-white shadow'
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
                className="p-1.5 rounded-full bg-[#E95420]/15 text-[#E95420] cursor-pointer"
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
                className="flex-1 accent-[#E95420] cursor-pointer h-1.5"
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
                className="flex-1 accent-[#E95420] cursor-pointer h-1.5"
              />
              <span className="w-8 text-right font-mono text-[11px] font-bold">{brightness}%</span>
            </div>

            {/* Quick Ubuntu Toggle Pills */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={onToggleDnd}
                className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition ${
                  dndEnabled ? 'bg-[#E95420] text-white' : isDark ? 'bg-white/8 hover:bg-white/15' : 'bg-black/6 hover:bg-black/12'
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
                <Keyboard className="w-3 h-3 text-[#E95420]" /> {kbdShort || 'RUS'}
              </button>
            </div>
          </div>

          {/* Section Switcher: Compact Start Launcher vs Open Desktop Windows */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/20">
            <button
              type="button"
              onClick={() => setSection('launcher')}
              className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                section === 'launcher' ? 'bg-[#E95420] text-white shadow' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Пуск / Лаунчер
            </button>
            <button
              type="button"
              onClick={() => setSection('windows')}
              className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                section === 'windows' ? 'bg-[#E95420] text-white shadow' : 'opacity-70 hover:opacity-100'
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
                  { id: 'ai', label: 'AI 3.8' },
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
                        ? 'bg-white/[0.04] border-white/10 hover:border-[#E95420]/60 hover:bg-[#E95420]/15'
                        : 'bg-white border-slate-200 hover:border-[#E95420]'
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
                        <AppWindow className="w-3.5 h-3.5 text-[#E95420] shrink-0" />
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
                        className="flex-1 min-w-0 text-left flex items-center gap-2 cursor-pointer"
                      >
                        <AppWindow className="w-3.5 h-3.5 text-[#E95420] shrink-0" />
                        <span className="truncate font-semibold">{w.title}</span>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleLumaTopmost(w.id)}
                          title="Поверх всех окон"
                          className={`p-1 rounded-lg cursor-pointer transition ${
                            w.alwaysOnTop ? 'bg-amber-500 text-black' : 'hover:bg-white/10 opacity-70'
                          }`}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onCloseLumaWindow(w.id)}
                          title="Закрыть"
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {hostWindows.map((hw) => (
                    <div
                      key={`ub_host_${hw.pid}`}
                      className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onFocusHostWindow(hw.pid);
                          onClose();
                        }}
                        className="flex-1 min-w-0 text-left flex items-center gap-2 cursor-pointer"
                      >
                        {hw.icon_url ? (
                          <img src={hw.icon_url} alt="" className="w-4 h-4 object-contain shrink-0" />
                        ) : (
                          <Monitor className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate font-semibold">{hw.friendly_name || hw.title || hw.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleHostTopmost(hw.pid, hw.hwnd)}
                        title="Поверх всех окон Windows (SetWindowPos)"
                        className={`p-1 rounded-lg cursor-pointer transition ${
                          hw.topmost ? 'bg-amber-500 text-black' : 'hover:bg-white/10 opacity-70'
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

          {/* Power Row */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-4 gap-1.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => {
                onClose();
                onPowerAction('lock');
              }}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer ${isDark ? 'bg-white/8 hover:bg-white/15' : 'bg-black/6 hover:bg-black/12'}`}
            >
              <Lock className="w-3 h-3" /> Блок.
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onPowerAction('sleep');
              }}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer ${isDark ? 'bg-white/8 hover:bg-white/15' : 'bg-black/6 hover:bg-black/12'}`}
            >
              <Moon className="w-3 h-3" /> Сон
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onPowerAction('restart');
              }}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer ${isDark ? 'bg-white/8 hover:bg-white/15' : 'bg-black/6 hover:bg-black/12'}`}
            >
              <RotateCcw className="w-3 h-3 text-amber-400" /> Рестарт
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onPowerAction('shutdown');
              }}
              className="py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition"
            >
              <Power className="w-3 h-3" /> Выкл
            </button>
          </div>
        </div>
      )}
    </>
  );
};
