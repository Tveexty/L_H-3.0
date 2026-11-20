import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BellOff,
  Code2,
  Command,
  CornerDownLeft,
  Disc3,
  ExternalLink,
  LayoutGrid,
  Lock,
  Moon,
  Music,
  Pause,
  Play,
  Power,
  Puzzle,
  Rocket,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  Sparkles,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
  BarChart3,
  X,
} from 'lucide-react';
import { AppItem, formatMonthBadge } from '../data/launcherData';

export interface SpotlightAction {
  id: string;
  group: 'Команды системы' | 'Окна и разделы' | 'Приложения';
  title: string;
  subtitle: string;
  shortcut?: string;
  keywords: string;
  icon: React.ReactNode;
  accent?: string;
  run: () => void;
}

interface LumaSpotlightProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  apps: AppItem[];
  iconMap: Record<string, React.ComponentType<{ className?: string }>>;
  dynamicIslandEnabled: boolean;
  dndEnabled: boolean;
  floatingHudVisible: boolean;
  isMuted: boolean;
  mediaPlaying: boolean;
  currentTrack: string;
  onLaunchApp: (app: AppItem) => void;
  onSwitchWindow: (mode: 'quick_search' | 'grid_20x30' | 'dual_windows') => void;
  onOpenWindow2: () => void;
  onSwitchSection: (sec: 'apps' | 'tracker' | 'python_code') => void;
  onToggleIsland: () => void;
  onToggleDnd: () => void;
  onToggleHud: () => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenPlugins: () => void;
  onOpenSpaces: () => void;
  onPowerAction: (action: 'lock' | 'sleep' | 'recycle_bin') => void;
}

export const LumaSpotlight: React.FC<LumaSpotlightProps> = ({
  open,
  onClose,
  isDark,
  apps,
  iconMap,
  dynamicIslandEnabled,
  dndEnabled,
  floatingHudVisible,
  isMuted,
  mediaPlaying,
  currentTrack,
  onLaunchApp,
  onSwitchWindow,
  onOpenWindow2,
  onSwitchSection,
  onToggleIsland,
  onToggleDnd,
  onToggleHud,
  onToggleMute,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onToggleTheme,
  onOpenSettings,
  onOpenPlugins,
  onOpenSpaces,
  onPowerAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const actions = useMemo<SpotlightAction[]>(() => {
    const sysActions: SpotlightAction[] = [
      {
        id: 'cmd_play_pause',
        group: 'Команды системы',
        title: mediaPlaying ? 'Пауза музыки' : 'Воспроизвести музыку',
        subtitle: `Сейчас: ${currentTrack}`,
        shortcut: 'Media',
        keywords: 'музыка трек пауза play pause spotify audio',
        icon: mediaPlaying ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 text-emerald-400" />,
        run: onTogglePlay,
      },
      {
        id: 'cmd_next_track',
        group: 'Команды системы',
        title: 'Следующий трек',
        subtitle: 'Переключить трек в системном плеере',
        keywords: 'следующий трек музыка next track skip',
        icon: <SkipForward className="w-4 h-4 text-indigo-400" />,
        run: onNextTrack,
      },
      {
        id: 'cmd_prev_track',
        group: 'Команды системы',
        title: 'Предыдущий трек',
        subtitle: 'Вернуться к прошлому треку',
        keywords: 'предыдущий трек музыка prev back',
        icon: <SkipBack className="w-4 h-4 text-indigo-400" />,
        run: onPrevTrack,
      },
      {
        id: 'cmd_toggle_island',
        group: 'Команды системы',
        title: dynamicIslandEnabled ? 'Выключить Luma Island' : 'Включить Luma Island',
        subtitle: 'Скрыть или вернуть динамический остров в верхней панели',
        keywords: 'остров динамический luma island скрыть выключить включить',
        icon: <Disc3 className="w-4 h-4 text-violet-400" />,
        run: onToggleIsland,
      },
      {
        id: 'cmd_toggle_mute',
        group: 'Команды системы',
        title: isMuted ? 'Включить системный звук' : 'Отключить звук (Mute)',
        subtitle: 'Мгновенное управление системным аудио-выходом',
        keywords: 'звук громкость mute audio тихо',
        icon: isMuted ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />,
        run: onToggleMute,
      },
      {
        id: 'cmd_toggle_dnd',
        group: 'Команды системы',
        title: dndEnabled ? 'Выключить режим «Не беспокоить»' : 'Включить режим «Не беспокоить» (DND)',
        subtitle: 'Блокировать всплывающие уведомления и звуки',
        keywords: 'dnd не беспокоить тихий режим уведомления',
        icon: <BellOff className="w-4 h-4 text-purple-400" />,
        run: onToggleDnd,
      },
      {
        id: 'cmd_toggle_hud',
        group: 'Команды системы',
        title: floatingHudVisible ? 'Скрыть Luma HUD' : 'Показать Luma HUD',
        subtitle: 'Плавающий монитор CPU, RAM, региона и трека',
        keywords: 'hud монитор cpu ram ресурсы',
        icon: <Activity className="w-4 h-4 text-cyan-400" />,
        run: onToggleHud,
      },
      {
        id: 'cmd_toggle_theme',
        group: 'Команды системы',
        title: isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему',
        subtitle: 'Мгновенная смена оформления Luma Expressive / Светлая',
        keywords: 'тема светлая темная dark light оформление',
        icon: isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
        run: onToggleTheme,
      },
      {
        id: 'cmd_lock',
        group: 'Команды системы',
        title: 'Заблокировать экран ПК',
        subtitle: 'Отправить команду блокировки в ядро Luma Core',
        keywords: 'блокировка экран lock питание',
        icon: <Lock className="w-4 h-4 text-amber-400" />,
        run: () => onPowerAction('lock'),
      },
      {
        id: 'cmd_sleep',
        group: 'Команды системы',
        title: 'Спящий режим ПК',
        subtitle: 'Перевести компьютер в режим сна',
        keywords: 'сон спящий режим sleep питание',
        icon: <Power className="w-4 h-4 text-rose-400" />,
        run: () => onPowerAction('sleep'),
      },
      {
        id: 'cmd_recycle',
        group: 'Команды системы',
        title: 'Открыть Корзину',
        subtitle: 'Системная корзина через Luma HAL',
        keywords: 'корзина recycle bin удалить мусор',
        icon: <Trash2 className="w-4 h-4 text-slate-400" />,
        run: () => onPowerAction('recycle_bin'),
      },
    ];

    const navActions: SpotlightAction[] = [
      {
        id: 'nav_win1',
        group: 'Окна и разделы',
        title: 'Окно 1 — Приложения по группам',
        subtitle: 'Библиотека, избранное и группировка по категориям',
        shortcut: '1',
        keywords: 'окно 1 группы список приложения библиотека',
        icon: <LayoutGrid className="w-4 h-4 text-indigo-400" />,
        run: () => {
          onSwitchSection('apps');
          onSwitchWindow('quick_search');
        },
      },
      {
        id: 'nav_win2',
        group: 'Окна и разделы',
        title: 'Окно 2 — Матрица ячеек 20×30 (18 виджетов)',
        subtitle: 'Luma Pulse, Luma Aura и Luma Core на сетке 600 ячеек',
        shortcut: '2',
        keywords: 'окно 2 ячейки 20x30 виджеты матрица погода',
        icon: <Sparkles className="w-4 h-4 text-violet-400" />,
        run: () => {
          onSwitchSection('apps');
          onSwitchWindow('grid_20x30');
        },
      },
      {
        id: 'nav_dual',
        group: 'Окна и разделы',
        title: 'Режим: 2 Окна рядом (Split View)',
        subtitle: 'Окно 1 и Окно 2 одновременно на одном экране',
        shortcut: '3',
        keywords: 'два окна рядом split dual',
        icon: <LayoutGrid className="w-4 h-4 text-emerald-400" />,
        run: () => {
          onSwitchSection('apps');
          onSwitchWindow('dual_windows');
        },
      },
      {
        id: 'nav_win2_ext',
        group: 'Окна и разделы',
        title: 'Открыть Окно 2 в отдельном окне',
        subtitle: 'Независимое окно матрицы 20×30 с живой синхронизацией',
        keywords: 'отдельно второе окно popup',
        icon: <ExternalLink className="w-4 h-4 text-sky-400" />,
        run: onOpenWindow2,
      },
      {
        id: 'nav_tracker',
        group: 'Окна и разделы',
        title: 'Трекер времени и Цифровой баланс',
        subtitle: 'Живой отсчёт сессий с 00:00 и лимиты категорий',
        keywords: 'трекер время статистика баланс детокс',
        icon: <BarChart3 className="w-4 h-4 text-amber-400" />,
        run: () => onSwitchSection('tracker'),
      },
      {
        id: 'nav_kernel',
        group: 'Окна и разделы',
        title: 'Ядро Luma Core 1.0.2 & IPC Консоль',
        subtitle: 'Исходный код ядра, LumaGuard AES-256-GCM и живой JSON-RPC 2.0',
        keywords: 'ядро код kernel ipc rpc безопасность',
        icon: <Code2 className="w-4 h-4 text-emerald-400" />,
        run: () => onSwitchSection('python_code'),
      },
      {
        id: 'nav_settings',
        group: 'Окна и разделы',
        title: 'Настройки системы Luma OS 1.0.2',
        subtitle: 'Темы, 18 циферблатов, Luma Island, телеметрия и история версий',
        shortcut: ',',
        keywords: 'настройки параметры темы часы версии',
        icon: <Settings className="w-4 h-4 text-slate-300" />,
        run: onOpenSettings,
      },
      {
        id: 'nav_plugins',
        group: 'Окна и разделы',
        title: 'Центр расширений и плагинов',
        subtitle: 'Управление модулями Luma Plugin API',
        keywords: 'плагины расширения модули магазин',
        icon: <Puzzle className="w-4 h-4 text-indigo-400" />,
        run: onOpenPlugins,
      },
      {
        id: 'nav_spaces',
        group: 'Окна и разделы',
        title: 'Luma Spaces — Рабочие профили',
        subtitle: 'Пакетный запуск наборов приложений в 1 клик',
        keywords: 'spaces пространства профили workspace',
        icon: <Rocket className="w-4 h-4 text-cyan-400" />,
        run: onOpenSpaces,
      },
    ];

    const appActions: SpotlightAction[] = apps.map((app) => {
      const IconComp = iconMap[app.icon] || Music;
      return {
        id: `app_${app.id}`,
        group: 'Приложения',
        title: app.name,
        subtitle: `${app.category} • ${formatMonthBadge(app.monthMinutes, app.elapsedSeconds, app.isRunning)}`,
        shortcut: app.isRunning ? 'LIVE' : undefined,
        keywords: `${app.name} ${app.category} ${app.detoxGroup || ''} ${app.package} ${app.type}`.toLowerCase(),
        icon: <IconComp className="w-4 h-4 text-indigo-400" />,
        run: () => onLaunchApp(app),
      };
    });

    return [...sysActions, ...navActions, ...appActions];
  }, [
    apps,
    iconMap,
    dynamicIslandEnabled,
    dndEnabled,
    floatingHudVisible,
    isMuted,
    mediaPlaying,
    currentTrack,
    isDark,
    onLaunchApp,
    onSwitchWindow,
    onOpenWindow2,
    onSwitchSection,
    onToggleIsland,
    onToggleDnd,
    onToggleHud,
    onToggleMute,
    onTogglePlay,
    onNextTrack,
    onPrevTrack,
    onToggleTheme,
    onOpenSettings,
    onOpenPlugins,
    onOpenSpaces,
    onPowerAction,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return actions.slice(0, 18);
    }
    return actions
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subtitle.toLowerCase().includes(q) ||
          a.keywords.toLowerCase().includes(q)
      )
      .slice(0, 24);
  }, [actions, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].run();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filtered, selectedIndex, onClose]);

  if (!open) return null;

  const groups: SpotlightAction['group'][] = ['Команды системы', 'Окна и разделы', 'Приложения'];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] bg-black/65 backdrop-blur-md p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`luma-animate-in w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl ${
          isDark
            ? 'bg-[#0c111e]/95 border-white/12 text-slate-100 luma-specular'
            : 'bg-white/95 border-slate-300 text-slate-900 luma-specular-light'
        }`}
      >
        {/* Search Header */}
        <div
          className={`flex items-center gap-3 px-5 py-4 border-b ${
            isDark ? 'border-white/10' : 'border-slate-200'
          }`}
        >
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Luma Spotlight — приложения, треки, окна, темы, команды..."
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border ${
              isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[58vh] overflow-y-auto p-2.5 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : (
            groups.map((grp) => {
              const items = filtered.filter((f) => f.group === grp);
              if (items.length === 0) return null;
              return (
                <div key={grp} className="space-y-1">
                  <div className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {grp}
                  </div>
                  {items.map((item) => {
                    const globalIdx = filtered.indexOf(item);
                    const active = globalIdx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        onClick={() => {
                          item.run();
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                          active
                            ? isDark
                              ? 'bg-indigo-500/22 border border-indigo-400/40 text-white'
                              : 'bg-indigo-50 border border-indigo-300 text-slate-950'
                            : 'border border-transparent hover:bg-slate-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-white/8' : 'bg-slate-100'
                            }`}
                          >
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{item.title}</div>
                            <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.shortcut && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                item.shortcut === 'LIVE'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : isDark
                                  ? 'bg-white/8 text-slate-400'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {item.shortcut}
                            </span>
                          )}
                          {active && <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div
          className={`flex items-center justify-between px-5 py-2.5 border-t text-[11px] text-slate-400 ${
            isDark ? 'border-white/8 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Command className="w-3 h-3 text-indigo-400" />
              Luma Spotlight 1.0.2
            </span>
            <span>↑↓ выбор</span>
            <span>Enter запуск</span>
          </div>
          <span className="font-mono text-[10px]">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
};
