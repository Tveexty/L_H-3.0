import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AppWindow,
  BarChart3,
  BellOff,
  Code2,
  CornerDownLeft,
  Cpu,
  Disc3,
  FolderOpen,
  Grid,
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
  Sun,
  Terminal,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AppItem, formatMonthBadge } from '../data/launcherData';

export interface SpotlightAction {
  id: string;
  group: 'Выполнить' | 'Окна системы' | 'Команды' | 'Приложения';
  title: string;
  subtitle: string;
  shortcut?: string;
  keywords: string;
  icon: React.ReactNode;
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
  isMuted: boolean;
  mediaPlaying: boolean;
  currentTrack: string;
  onLaunchApp: (app: AppItem) => void;
  onOpenWindow: (
    win: 'apps' | 'tracker' | 'kernel' | 'terminal' | 'settings' | 'plugins' | 'island' | 'spaces' | 'explorer' | 'taskmgr' | 'ai' | 'utilities'
  ) => void;
  onRunCommand?: (cmd: string) => void;
  onShowDesktop: () => void;
  onToggleEditDesktop: () => void;
  onToggleIsland: () => void;
  onToggleDnd: () => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onToggleTheme: () => void;
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
  isMuted,
  mediaPlaying,
  currentTrack,
  onLaunchApp,
  onOpenWindow,
  onRunCommand,
  onShowDesktop,
  onToggleEditDesktop,
  onToggleIsland,
  onToggleDnd,
  onToggleMute,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onToggleTheme,
  onPowerAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
      const t = window.setTimeout(() => inputRef.current?.focus(), 45);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const actions = useMemo<SpotlightAction[]>(() => {
    const winActions: SpotlightAction[] = [
      {
        id: 'win_explorer',
        group: 'Окна системы',
        title: 'Проводник Luma',
        subtitle: 'Системный файловый менеджер, вкладки и скрытые файлы',
        shortcut: 'FILES',
        keywords: 'проводник файлы explorer диски папки скрытые',
        icon: <FolderOpen className="w-4 h-4" />,
        run: () => onOpenWindow('explorer'),
      },
      {
        id: 'win_taskmgr',
        group: 'Окна системы',
        title: 'Диспетчер задач',
        subtitle: 'Процессы Luma OS, открытые окна ОС и графики ресурсов',
        shortcut: 'PROC',
        keywords: 'диспетчер задач процессы taskmgr cpu ram убить процесс',
        icon: <Cpu className="w-4 h-4" />,
        run: () => onOpenWindow('taskmgr'),
      },
      {
        id: 'win_ai',
        group: 'Окна системы',
        title: 'Luma AI (Gemini / OpenAI / Claude / Ollama)',
        subtitle: 'Встроенная нейросеть с контекстом системы и терминалом',
        shortcut: 'AI',
        keywords: 'ии нейросеть gemini openai chatgpt claude ollama ai ассистент',
        icon: <Cpu className="w-4 h-4" />,
        run: () => onOpenWindow('ai'),
      },
      {
        id: 'win_utilities',
        group: 'Окна системы',
        title: 'Службы и утилиты системы',
        subtitle: 'Калькулятор, Блокнот, Службы ОС и 16 утилит Windows',
        shortcut: 'TOOLS',
        keywords: 'службы утилиты windows калькулятор блокнот реестр панель управления',
        icon: <AppWindow className="w-4 h-4" />,
        run: () => onOpenWindow('utilities'),
      },
      {
        id: 'win_apps',
        group: 'Окна системы',
        title: 'Приложения (Библиотека по группам)',
        subtitle: 'Открыть окно списка, мультивыбора и карточек приложений',
        shortcut: 'APPS',
        keywords: 'приложения библиотека окно группы список',
        icon: <AppWindow className="w-4 h-4" />,
        run: () => onOpenWindow('apps'),
      },
      {
        id: 'win_terminal',
        group: 'Окна системы',
        title: 'Терминал Luma',
        subtitle: 'Командная строка ядра LumaCore 1.3 (ПО 1.2.3B Lithium)',
        shortcut: 'CLI',
        keywords: 'терминал консоль cmd shell cli',
        icon: <Terminal className="w-4 h-4" />,
        run: () => onOpenWindow('terminal'),
      },
      {
        id: 'win_tracker',
        group: 'Окна системы',
        title: 'Трекер времени',
        subtitle: 'Учёт сессий с 00:00 и лимиты',
        keywords: 'трекер время статистика баланс',
        icon: <BarChart3 className="w-4 h-4" />,
        run: () => onOpenWindow('tracker'),
      },
      {
        id: 'win_kernel',
        group: 'Окна системы',
        title: 'Ядро LumaCore 1.3 & IPC',
        subtitle: 'Телеметрия, LumaShield 1.3, код ядра и консоль JSON-RPC 2.0',
        keywords: 'ядро код kernel ipc rpc безопасность',
        icon: <Code2 className="w-4 h-4" />,
        run: () => onOpenWindow('kernel'),
      },
      {
        id: 'win_settings',
        group: 'Окна системы',
        title: 'Настройки системы',
        subtitle: 'Языки, Безопасность и AV, Shell Mode, GitHub OTA, ИИ, темы',
        shortcut: 'SET',
        keywords: 'настройки параметры темы часы панель задач',
        icon: <Settings className="w-4 h-4" />,
        run: () => onOpenWindow('settings'),
      },
      {
        id: 'win_plugins',
        group: 'Окна системы',
        title: 'Расширения и плагины',
        subtitle: 'Управление модулями Luma API',
        keywords: 'плагины расширения модули',
        icon: <Puzzle className="w-4 h-4" />,
        run: () => onOpenWindow('plugins'),
      },
      {
        id: 'win_spaces',
        group: 'Окна системы',
        title: 'Пространства (Luma Spaces)',
        subtitle: 'Пакетный запуск рабочих профилей',
        keywords: 'пространства профили spaces workspace',
        icon: <Rocket className="w-4 h-4" />,
        run: () => onOpenWindow('spaces'),
      },
      {
        id: 'win_desktop',
        group: 'Окна системы',
        title: 'Показать рабочий стол',
        subtitle: 'Свернуть все открытые окна',
        keywords: 'рабочий стол свернуть desktop',
        icon: <Grid className="w-4 h-4" />,
        run: onShowDesktop,
      },
    ];

    const sysActions: SpotlightAction[] = [
      {
        id: 'cmd_play_pause',
        group: 'Команды',
        title: mediaPlaying ? 'Пауза музыки' : 'Воспроизвести музыку',
        subtitle: currentTrack,
        keywords: 'музыка пауза play pause',
        icon: mediaPlaying ? (
          <Pause className="w-4 h-4 text-[var(--luma-accent)]" />
        ) : (
          <Play className="w-4 h-4 text-[var(--luma-accent)]" />
        ),
        run: onTogglePlay,
      },
      {
        id: 'cmd_next_track',
        group: 'Команды',
        title: 'Следующий трек',
        subtitle: 'Переключить трек в системе',
        keywords: 'следующий трек next skip',
        icon: <SkipForward className="w-4 h-4" />,
        run: onNextTrack,
      },
      {
        id: 'cmd_prev_track',
        group: 'Команды',
        title: 'Предыдущий трек',
        subtitle: 'Вернуться к предыдущему треку',
        keywords: 'предыдущий трек prev',
        icon: <SkipBack className="w-4 h-4" />,
        run: onPrevTrack,
      },
      {
        id: 'cmd_edit_grid',
        group: 'Команды',
        title: 'Настроить сетку рабочего стола (22×10 / 20×10)',
        subtitle: 'Включить режим расстановки, форм и размеров виджетов и папок',
        keywords: 'сетка ячейки редактор стол виджеты форма размер',
        icon: <Activity className="w-4 h-4" />,
        run: onToggleEditDesktop,
      },
      {
        id: 'cmd_toggle_island',
        group: 'Команды',
        title: dynamicIslandEnabled ? 'Выключить Luma Island' : 'Включить Luma Island',
        subtitle: 'Верхняя интерактивная капсула',
        keywords: 'остров динамический island скрыть',
        icon: <Disc3 className="w-4 h-4" />,
        run: onToggleIsland,
      },
      {
        id: 'cmd_toggle_mute',
        group: 'Команды',
        title: isMuted ? 'Включить звук' : 'Выключить звук (Mute)',
        subtitle: 'Системный аудио-выход',
        keywords: 'звук громкость mute',
        icon: isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-[var(--luma-accent)]" />,
        run: onToggleMute,
      },
      {
        id: 'cmd_toggle_dnd',
        group: 'Команды',
        title: dndEnabled ? 'Выключить «Не беспокоить»' : 'Включить «Не беспокоить» (DND)',
        subtitle: 'Тихий режим уведомлений',
        keywords: 'dnd не беспокоить тихо',
        icon: <BellOff className="w-4 h-4" />,
        run: onToggleDnd,
      },
      {
        id: 'cmd_toggle_theme',
        group: 'Команды',
        title: isDark ? 'Переключить на светлую тему (Paper)' : 'Переключить на тёмную тему (Mono)',
        subtitle: 'Смена оформления рабочего стола',
        keywords: 'тема светлая темная dark light',
        icon: isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
        run: onToggleTheme,
      },
      {
        id: 'cmd_lock',
        group: 'Команды',
        title: 'Заблокировать экран ПК',
        subtitle: 'Системная блокировка через ядро',
        keywords: 'блокировка экран lock',
        icon: <Lock className="w-4 h-4" />,
        run: () => onPowerAction('lock'),
      },
      {
        id: 'cmd_sleep',
        group: 'Команды',
        title: 'Спящий режим ПК',
        subtitle: 'Перевести компьютер в сон',
        keywords: 'сон sleep питание',
        icon: <Power className="w-4 h-4" />,
        run: () => onPowerAction('sleep'),
      },
      {
        id: 'cmd_recycle',
        group: 'Команды',
        title: 'Открыть Корзину',
        subtitle: 'Системная корзина',
        keywords: 'корзина recycle',
        icon: <Trash2 className="w-4 h-4" />,
        run: () => onPowerAction('recycle_bin'),
      },
    ];

    const appActions: SpotlightAction[] = apps.map((app) => {
      const IconComp = iconMap[app.icon] || Music;
      return {
        id: `app_${app.id}`,
        group: 'Приложения',
        title: app.name,
        subtitle: `${app.category} · ${formatMonthBadge(app.monthMinutes, app.elapsedSeconds, app.isRunning)}`,
        shortcut: app.isRunning ? 'LIVE' : undefined,
        keywords: `${app.name} ${app.category} ${app.detoxGroup || ''} ${app.package} ${app.type}`.toLowerCase(),
        icon: <IconComp className="w-4 h-4" />,
        run: () => onLaunchApp(app),
      };
    });

    return [...winActions, ...sysActions, ...appActions];
  }, [
    apps,
    iconMap,
    dynamicIslandEnabled,
    dndEnabled,
    isMuted,
    mediaPlaying,
    currentTrack,
    isDark,
    onLaunchApp,
    onOpenWindow,
    onShowDesktop,
    onToggleEditDesktop,
    onToggleIsland,
    onToggleDnd,
    onToggleMute,
    onTogglePlay,
    onNextTrack,
    onPrevTrack,
    onToggleTheme,
    onPowerAction,
  ]);

  const filtered = useMemo(() => {
    const raw = query.trim();
    const q = raw.toLowerCase();
    if (!q) return actions.slice(0, 18);
    const matches = actions
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subtitle.toLowerCase().includes(q) ||
          a.keywords.toLowerCase().includes(q)
      )
      .slice(0, 20);

    // Direct Run command / URL / path execution (like Windows Run Alt+R)
    const runItem: SpotlightAction = {
      id: `direct_run_${q}`,
      group: 'Выполнить',
      title: `Выполнить: ${raw}`,
      subtitle:
        /^https?:\/\//i.test(raw) || raw.includes('.')
          ? 'Открыть адрес, файл или выполнить команду в Терминале Luma'
          : 'Запустить в Терминале Luma или открыть системный путь',
      shortcut: 'RUN',
      keywords: q,
      icon: <Terminal className="w-4 h-4 text-[var(--luma-accent)]" />,
      run: () => {
        if (q === 'explorer' || q === 'files' || q === 'проводник') {
          onOpenWindow('explorer');
          return;
        }
        if (q === 'taskmgr' || q === 'tasks' || q === 'диспетчер') {
          onOpenWindow('taskmgr');
          return;
        }
        if (q === 'settings' || q === 'настройки') {
          onOpenWindow('settings');
          return;
        }
        if (q === 'cmd' || q === 'terminal' || q === 'term') {
          onOpenWindow('terminal');
          return;
        }
        if (onRunCommand) {
          onRunCommand(raw);
        } else {
          onOpenWindow('terminal');
        }
      },
    };

    const looksLikeDirect =
      raw.includes(' ') ||
      raw.includes('\\') ||
      raw.includes('/') ||
      raw.includes(':') ||
      /^https?:\/\//i.test(raw) ||
      matches.length === 0;

    return looksLikeDirect ? [runItem, ...matches] : [...matches, runItem];
  }, [actions, query, onOpenWindow, onRunCommand]);

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

  const groups: SpotlightAction['group'][] = ['Выполнить', 'Окна системы', 'Команды', 'Приложения'];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[11vh] bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`luma-animate-in w-full max-w-xl rounded-2xl border overflow-hidden ${
          isDark ? 'dex-window-dark text-zinc-100' : 'dex-window-light text-zinc-900'
        }`}
      >
        <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
          <Search className="w-4 h-4 text-[var(--luma-accent)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Выполнить команду, путь (C:\...), URL или найти приложение..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-zinc-500 hover:text-current cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-500 border border-zinc-500/30">ESC</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs font-mono text-zinc-500">Ничего не найдено</div>
          ) : (
            groups.map((grp) => {
              const items = filtered.filter((f) => f.group === grp);
              if (items.length === 0) return null;
              return (
                <div key={grp} className="space-y-0.5">
                  <div className="px-2.5 pt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">{grp}</div>
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
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                          active
                            ? isDark
                              ? 'bg-white/[0.1] text-white'
                              : 'bg-zinc-200/90 text-zinc-950'
                            : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`shrink-0 ${active ? 'text-[var(--luma-accent)]' : 'text-zinc-400'}`}>{item.icon}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{item.title}</div>
                            <div className="text-[11px] text-zinc-500 truncate">{item.subtitle}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.shortcut && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                item.shortcut === 'LIVE' || item.shortcut === 'RUN'
                                  ? 'bg-[var(--luma-accent)] text-white'
                                  : isDark
                                  ? 'bg-white/10 text-zinc-400'
                                  : 'bg-zinc-200 text-zinc-600'
                              }`}
                            >
                              {item.shortcut}
                            </span>
                          )}
                          {active && <CornerDownLeft className="w-3.5 h-3.5 text-[var(--luma-accent)]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div
          className={`flex items-center justify-between px-4 py-2 border-t text-[10px] font-mono text-zinc-500 ${
            isDark ? 'border-white/[0.08]' : 'border-zinc-200'
          }`}
        >
          <span>LUMA RUN & SPOTLIGHT 1.2.3B (LITHIUM) · ↑↓ · ENTER</span>
          <span>ALT + R</span>
        </div>
      </div>
    </div>
  );
};
