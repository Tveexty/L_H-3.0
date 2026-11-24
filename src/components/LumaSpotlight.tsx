import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AppWindow,
  BarChart3,
  BatteryCharging,
  Bell,
  Bluetooth,
  Calculator,
  Calendar,
  Code2,
  CornerDownLeft,
  Cpu,
  Disc3,
  Download,
  FolderOpen,
  Globe,
  HardDrive,
  Keyboard,
  Lock,
  Monitor,
  MousePointer2,
  Palette,
  Power,
  Puzzle,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Trash2,
  Wrench,
  X,
  Youtube,
} from 'lucide-react';
import { AppItem, InstalledAppInfo } from '../data/launcherData';

export interface SpotlightResult {
  id: string;
  group: 'Приложения' | 'Настройки системы' | 'Службы и утилиты' | 'Поиск в Интернете' | 'Выполнить';
  title: string;
  subtitle: string;
  badge?: string;
  keywords: string;
  icon?: React.ReactNode;
  iconUrl?: string;
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
  onLaunchInstalledApp?: (app: InstalledAppInfo) => void;
  onOpenWindow: (
    win:
      | 'apps'
      | 'tracker'
      | 'kernel'
      | 'terminal'
      | 'settings'
      | 'plugins'
      | 'island'
      | 'spaces'
      | 'explorer'
      | 'taskmgr'
      | 'ai'
      | 'utilities'
      | 'calculator'
      | 'calendar'
      | 'trash'
      | 'scenarios'
      | 'code_studio'
      | 'cut_studio'
      | 'office'
  ) => void;
  onOpenSettingsTab?: (tab: string) => void;
  onOpenVault?: () => void;
  onOpenControlHub?: () => void;
  onOpenCustomWidgetBuilder?: () => void;
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

// Module-level cache so Alt+R opens in 0ms without re-scanning Start Menu every time
let cachedInstalledApps: InstalledAppInfo[] | null = null;
let installedAppsPromise: Promise<InstalledAppInfo[]> | null = null;

function loadInstalledAppsOnce(): Promise<InstalledAppInfo[]> {
  if (cachedInstalledApps) return Promise.resolve(cachedInstalledApps);
  if (installedAppsPromise) return installedAppsPromise;
  installedAppsPromise = fetch('/api/kernel/apps/installed')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const list = Array.isArray(d?.apps) ? (d.apps as InstalledAppInfo[]) : [];
      cachedInstalledApps = list;
      return list;
    })
    .catch(() => [])
    .finally(() => {
      installedAppsPromise = null;
    });
  return installedAppsPromise;
}

function openExternalUrl(url: string) {
  void fetch('/api/kernel/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: `web_${Date.now()}`, name: url, url, target: url, type: 'web' }),
  }).catch(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

export const LumaSpotlight: React.FC<LumaSpotlightProps> = ({
  open,
  onClose,
  isDark,
  apps,
  iconMap,
  onLaunchApp,
  onLaunchInstalledApp,
  onOpenWindow,
  onOpenSettingsTab,
  onOpenVault,
  onOpenControlHub,
  onOpenCustomWidgetBuilder,
  onRunCommand,
  onToggleTheme,
  onPowerAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [installedApps, setInstalledApps] = useState<InstalledAppInfo[]>(cachedInstalledApps || []);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    const t = window.setTimeout(() => inputRef.current?.focus(), 45);
    if (!cachedInstalledApps) {
      void loadInstalledAppsOnce().then((list) => setInstalledApps(list));
    }
    return () => window.clearTimeout(t);
  }, [open]);

  const openSetting = (tab: string) => {
    if (onOpenSettingsTab) onOpenSettingsTab(tab);
    else onOpenWindow('settings');
  };

  const launchNativeTool = (cmd: string, title: string) => {
    if (onRunCommand) {
      onRunCommand(cmd);
    } else {
      void fetch('/api/kernel/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `svc_${Date.now()}`, name: title, url: cmd, target: cmd, type: 'native' }),
      }).catch(() => {});
    }
  };

  const catalog = useMemo<SpotlightResult[]>(() => {
    // 1. Installed PC apps + Luma apps (deduplicated)
    const seenNames = new Set<string>();
    const appItems: SpotlightResult[] = [];

    for (const app of apps) {
      const key = app.name.trim().toLowerCase();
      seenNames.add(key);
      const IconComp = iconMap[app.icon] || AppWindow;
      appItems.push({
        id: `luma_app_${app.id}`,
        group: 'Приложения',
        title: app.name,
        subtitle: `${app.category} · Приложение Luma`,
        badge: app.isRunning ? 'АКТИВНО' : undefined,
        keywords: `${app.name} ${app.category} ${app.package} ${app.detoxGroup || ''}`.toLowerCase(),
        icon: <IconComp className="w-4 h-4" />,
        iconUrl: app.iconUrl,
        run: () => onLaunchApp(app),
      });
    }

    for (const pcApp of installedApps) {
      const key = pcApp.name.trim().toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      appItems.push({
        id: `pc_app_${pcApp.id}`,
        group: 'Приложения',
        title: pcApp.name,
        subtitle: `${pcApp.category || 'Программа ПК'}${pcApp.publisher ? ` · ${pcApp.publisher}` : ''}`,
        badge: 'ПК',
        keywords: `${pcApp.name} ${pcApp.publisher || ''} ${pcApp.category} ${pcApp.exec_path}`.toLowerCase(),
        icon: <AppWindow className="w-4 h-4" />,
        iconUrl: pcApp.icon_url,
        run: () => {
          if (onLaunchInstalledApp) {
            onLaunchInstalledApp(pcApp);
          } else {
            launchNativeTool(pcApp.exec_path, pcApp.name);
          }
        },
      });
    }

    // 2. System Settings
    const settingsItems: SpotlightResult[] = [
      {
        id: 'set_kernel_ui',
        group: 'Настройки системы',
        title: 'Ядро UI и О системе (Luma OS 1.5 Carbon)',
        subtitle: 'Имя ПК, характеристики, LumaCore 1.6, LumaShield 1.6, пасхалка',
        keywords: 'ядро ui о системе версия модель устройство carbon 1.5 about',
        icon: <Cpu className="w-4 h-4" />,
        run: () => openSetting('kernel_ui'),
      },
      {
        id: 'set_mouse_dpi',
        group: 'Настройки системы',
        title: 'Мышь, Скорость указателя и DPI (eDPI)',
        subtitle: 'Регулировка DPI, скорость курсора Windows 1–20, Raw Input, IO/Ajazz/Ardor',
        keywords: 'мышь скорость dpi edpi сенсор курсор чувствительность mouse sensitivity raw input io ajazz ardor',
        icon: <MousePointer2 className="w-4 h-4" />,
        run: () => openSetting('mouse_dpi'),
      },
      {
        id: 'set_power_battery',
        group: 'Настройки системы',
        title: 'Питание и Батарея (АКБ + Беспроводные устройства)',
        subtitle: 'Заряд ноутбука, беспроводные мышки IO/Ajazz/Ardor BT & 2.4GHz, планы питания',
        keywords: 'батарея питание заряд энергосбережение яркость акб мышь наушники 2.4ghz радиоканал battery power',
        icon: <BatteryCharging className="w-4 h-4" />,
        run: () => openSetting('power_battery'),
      },
      {
        id: 'set_appearance',
        group: 'Настройки системы',
        title: 'Оформление, Обои Carbon 1.5, 3 точки и Анимации HarmonyOS 7',
        subtitle: 'Стили Классический/Модерн, 3 новых арта Carbon, кнопки окна 3 точки, анимации',
        keywords: 'темы обои фон цвет прозрачность blur анимации оформление виджеты wallpaper theme carbon harmonyos 3 точки',
        icon: <Palette className="w-4 h-4" />,
        run: () => openSetting('appearance'),
      },
      {
        id: 'set_taskbar',
        group: 'Настройки системы',
        title: 'Настройка Панели задач (Двойная панель + Прямой запуск)',
        subtitle: '2 панели задач (верх: утилиты, низ: окна), автоскрытие, прямой запуск приложений',
        keywords: 'панель задач taskbar двойная панель автоскрытие трей прямой запуск',
        icon: <SlidersHorizontal className="w-4 h-4" />,
        run: () => openSetting('taskbar'),
      },
      {
        id: 'set_graphics',
        group: 'Настройки системы',
        title: 'Графика, Оптимизация GPU и Масштаб экрана',
        subtitle: 'Профили GPU, автоадаптация экрана, размер иконок, Турбо-Эко',
        keywords: 'графика gpu оптимизация масштаб экран иконки dpi эко blur',
        icon: <Monitor className="w-4 h-4" />,
        run: () => openSetting('graphics'),
      },
      {
        id: 'set_language',
        group: 'Настройки системы',
        title: 'Язык системы и Раскладка клавиатуры (120+ языков)',
        subtitle: '18 языков интерфейса, мгновенный Alt+Shift, адаптивная раскладка',
        keywords: 'язык клавиатура раскладка перевод english русский язык language keyboard',
        icon: <Keyboard className="w-4 h-4" />,
        run: () => openSetting('language'),
      },
      {
        id: 'set_security',
        group: 'Настройки системы',
        title: 'Безопасность и Антивирус (LumaShield 1.6)',
        subtitle: 'Сканер 85+ правил, Аудит файла Hosts (DNS), TCP-монитор, Карантин',
        keywords: 'безопасность антивирус защита сканер карантин lumashield сеть firewall hosts dns',
        icon: <ShieldCheck className="w-4 h-4" />,
        run: () => openSetting('security'),
      },
      {
        id: 'set_bluetooth',
        group: 'Настройки системы',
        title: 'Bluetooth и Беспроводные устройства (BT + 2.4GHz)',
        subtitle: 'Адаптер Bluetooth, беспроводные мыши IO/Ajazz/Ardor и процент заряда',
        keywords: 'bluetooth блютуз беспроводные наушники мышь клавиатура 2.4ghz радиоканал io ajazz ardor',
        icon: <Bluetooth className="w-4 h-4" />,
        run: () => openSetting('bluetooth'),
      },
      {
        id: 'set_storage',
        group: 'Настройки системы',
        title: 'Память, Диски и Файлы',
        subtitle: 'Состояние дисков, ОЗУ и быстрый просмотр скрытых файлов',
        keywords: 'память диски файлы хранилище storage ram',
        icon: <HardDrive className="w-4 h-4" />,
        run: () => openSetting('storage'),
      },
      {
        id: 'set_updates',
        group: 'Настройки системы',
        title: 'Обновления GitHub OTA и Откат версии',
        subtitle: 'Проверка новой версии, киноанимация обновления и откат на прошлые релизы',
        keywords: 'обновление версия откат github ota rollback update анимация',
        icon: <Download className="w-4 h-4" />,
        run: () => openSetting('updates'),
      },
      {
        id: 'set_notifications',
        group: 'Настройки системы',
        title: 'Уведомления и Режим «Не беспокоить»',
        subtitle: 'Настройка правых уведомлений, Telegram, DND и синхронизации Windows',
        keywords: 'уведомления dnd не беспокоить notifications telegram',
        icon: <Bell className="w-4 h-4" />,
        run: () => openSetting('notifications'),
      },
      {
        id: 'set_island',
        group: 'Настройки системы',
        title: 'Dynamic Island и Режим оболочки',
        subtitle: 'Верхняя капсула, выбор плееров, режим оболочки Windows Shell',
        keywords: 'динамический остров island оболочка shell автозапуск',
        icon: <Disc3 className="w-4 h-4" />,
        run: () => openSetting('island'),
      },
      {
        id: 'set_theme_toggle',
        group: 'Настройки системы',
        title: isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему',
        subtitle: 'Быстрая смена светлого/тёмного режима',
        keywords: 'светлая темная тема dark light toggle',
        icon: <Palette className="w-4 h-4" />,
        run: onToggleTheme,
      },
    ];

    // 3. System Services, Luma Modules & Windows Utilities
    const serviceItems: SpotlightResult[] = [
      ...(onOpenControlHub
        ? [
            {
              id: 'svc_carbon_hub',
              group: 'Службы и утилиты' as const,
              title: 'Панель управления Carbon + Центр уведомлений (Tab)',
              subtitle: 'Редактируемая панель 1/4×1/2, Скриншот, Запись экрана, Telegram и Функции ОС',
              badge: 'TAB',
              keywords: 'панель управления tab уведомления telegram скриншот запись экрана control hub carbon',
              icon: <SlidersHorizontal className="w-4 h-4" />,
              run: () => onOpenControlHub(),
            },
          ]
        : []),
      ...(onOpenVault
        ? [
            {
              id: 'svc_private_vault',
              group: 'Службы и утилиты' as const,
              title: 'Суперконфиденциальность (Приватный рабочий стол AES-256)',
              subtitle: 'Изолированный зашифрованный стол, скрытые файлы, пароль или без пароля',
              badge: 'AES-256',
              keywords: 'суперконфиденциальность приватный сейф скрытый рабочий стол vault secret privacy',
              icon: <Lock className="w-4 h-4" />,
              run: () => onOpenVault(),
            },
          ]
        : []),
      {
        id: 'svc_code_studio',
        group: 'Службы и утилиты',
        title: 'Luma Code Studio (Редактор кода · VS Code)',
        subtitle: 'Файловое дерево ПК, вкладки, подсветка, HTML-превью и встроенный терминал',
        badge: 'IDE',
        keywords: 'код редактор vscode code studio ide программирование js python go html',
        icon: <Code2 className="w-4 h-4" />,
        run: () => onOpenWindow('code_studio'),
      },
      {
        id: 'svc_cut_studio',
        group: 'Службы и утилиты',
        title: 'Luma Cut Studio (Видеоредактор · CapCut)',
        subtitle: 'Таймлайн, нарезка, 10 LUT фильтров, титры, переходы и экспорт .webm',
        badge: 'VIDEO',
        keywords: 'видео видеоредактор монтаж capcut cut studio экспорт фильтры титры',
        icon: <Sparkles className="w-4 h-4" />,
        run: () => onOpenWindow('cut_studio'),
      },
      {
        id: 'svc_scenarios',
        group: 'Службы и утилиты',
        title: 'Сценарии автоматизации (Если → То)',
        subtitle: 'Автоматические действия при запуске программ, зарядке, времени и темах',
        badge: 'AUTO',
        keywords: 'сценарии автоматизация правила если то триггер scenarios automation',
        icon: <Rocket className="w-4 h-4" />,
        run: () => onOpenWindow('scenarios'),
      },
      {
        id: 'svc_trash',
        group: 'Службы и утилиты',
        title: 'Корзина Luma OS',
        subtitle: 'Удалённые файлы с восстановлением и полной очисткой Корзины ОС',
        badge: '1.5',
        keywords: 'корзина удаленные файлы очистить восстановить trash recycle bin',
        icon: <Trash2 className="w-4 h-4" />,
        run: () => onOpenWindow('trash'),
      },
      ...(onOpenCustomWidgetBuilder
        ? [
            {
              id: 'svc_custom_widget',
              group: 'Службы и утилиты' as const,
              title: 'Конструктор своих виджетов (Фото + JS скрипт)',
              subtitle: 'Создать собственный виджет для рабочего стола со своей картинкой и кодом',
              badge: 'STUDIO',
              keywords: 'конструктор виджет свой виджет скрипт фото custom widget builder',
              icon: <Sparkles className="w-4 h-4" />,
              run: () => onOpenCustomWidgetBuilder(),
            },
          ]
        : []),
      {
        id: 'svc_calendar',
        group: 'Службы и утилиты',
        title: 'Календарь Luma OS 1.5 (Месяц / Неделя / Повестка / Pomodoro)',
        subtitle: 'Повторяющиеся события, приоритеты, фокус-таймер и экспорт/импорт .ics',
        badge: 'PRO',
        keywords: 'календарь дата события напоминания расписание месяц неделя pomodoro ics calendar',
        icon: <Calendar className="w-4 h-4" />,
        run: () => onOpenWindow('calendar'),
      },
      {
        id: 'svc_taskmgr',
        group: 'Службы и утилиты',
        title: 'Диспетчер задач Luma',
        subtitle: 'Процессы, GPU Чип + VRAM, ЦП/ОЗУ, автозагрузка и службы ОС',
        badge: 'LUMA',
        keywords: 'диспетчер задач процессы taskmgr gpu vram cpu ram службы',
        icon: <Activity className="w-4 h-4" />,
        run: () => onOpenWindow('taskmgr'),
      },
      {
        id: 'svc_explorer',
        group: 'Службы и утилиты',
        title: 'Проводник файлов Luma Pro',
        subtitle: 'Диски, вкладки, скрытые файлы, редактор кода и предпросмотр',
        badge: 'LUMA',
        keywords: 'проводник файлы explorer папки скрытые диски',
        icon: <FolderOpen className="w-4 h-4" />,
        run: () => onOpenWindow('explorer'),
      },
      {
        id: 'svc_office',
        group: 'Службы и утилиты',
        title: 'Luma Office Studio (Docs · Sheets · Slides)',
        subtitle: 'Встроенный Word, Excel и PowerPoint: открытие и экспорт .pptx, .docx, .xlsx, .pdf, .csv',
        badge: 'OFFICE',
        keywords: 'офис office word excel powerpoint презентация таблица документ pptx docx xlsx odt odp ods slides docs sheets pdf',
        icon: <AppWindow className="w-4 h-4 text-sky-400" />,
        run: () => onOpenWindow('office'),
      },
      {
        id: 'svc_terminal',
        group: 'Службы и утилиты',
        title: 'Терминал LumaCore 1.6.1',
        subtitle: 'Командная строка + 20 новых системных команд (ip, tcp, scan, wireless, hash, matrix)',
        badge: 'CLI',
        keywords: 'терминал консоль cmd powershell shell terminal',
        icon: <Terminal className="w-4 h-4" />,
        run: () => onOpenWindow('terminal'),
      },
      {
        id: 'svc_utilities',
        group: 'Службы и утилиты',
        title: 'Службы и утилиты Windows (Мышь DPI, Устройства, Службы)',
        subtitle: 'Мышь и DPI, Диспетчер устройств, Службы ОС, Сеть/Ping, Микшер, Блокнот',
        badge: 'TOOLS',
        keywords: 'службы утилиты windows services устройства сеть ping микшер блокнот очистка мышь dpi',
        icon: <Wrench className="w-4 h-4" />,
        run: () => onOpenWindow('utilities'),
      },
      {
        id: 'svc_calculator',
        group: 'Службы и утилиты',
        title: 'Калькулятор Luma (4 режима)',
        subtitle: 'Стандартный, Инженерный, Программист и Конвертер величин',
        badge: 'APP',
        keywords: 'калькулятор считать calc calculator конвертер',
        icon: <Calculator className="w-4 h-4" />,
        run: () => onOpenWindow('calculator'),
      },
      {
        id: 'svc_tracker',
        group: 'Службы и утилиты',
        title: 'Трекер сессий и Лимиты 2.0',
        subtitle: 'Учёт времени в Luma и окнах Windows, Фокус-сессии и лимиты',
        badge: 'PRO',
        keywords: 'трекер сессии лимиты время статистика фокус tracker',
        icon: <BarChart3 className="w-4 h-4" />,
        run: () => onOpenWindow('tracker'),
      },
      {
        id: 'svc_ai',
        group: 'Службы и утилиты',
        title: 'Luma AI 3.0 (Luma Lang 3.0 + Code 3.0 + Web Overview)',
        subtitle: 'Офлайн-ИИ с памятью диалога и ревью кода, Gemini, OpenAI, Claude, Ollama',
        badge: 'AI 2.0',
        keywords: 'ии нейросеть ai ассистент chatgpt gemini claude код luma ai 2.0',
        icon: <Sparkles className="w-4 h-4" />,
        run: () => onOpenWindow('ai'),
      },
      {
        id: 'svc_kernel',
        group: 'Службы и утилиты',
        title: 'Монитор ядра LumaCore 1.6.1 & JSON-RPC',
        subtitle: 'Внутренний монитор, диагностика GC, JSON-RPC консоль и код ядра',
        keywords: 'ядро kernel rpc ipc монитор диагностика',
        icon: <Code2 className="w-4 h-4" />,
        run: () => onOpenWindow('kernel'),
      },
      {
        id: 'svc_plugins',
        group: 'Службы и утилиты',
        title: 'Расширения и Developer SDK v3.0 (Темы и Плагины)',
        subtitle: 'Конструктор тем, импорт/экспорт JSON-плагинов, API /api/v3/sdk',
        badge: 'SDK 3.0',
        keywords: 'плагины расширения plugins модули sdk api developer темы разработчик',
        icon: <Puzzle className="w-4 h-4" />,
        run: () => onOpenWindow('plugins'),
      },
      {
        id: 'svc_spaces',
        group: 'Службы и утилиты',
        title: 'Пространства (Luma Spaces)',
        subtitle: 'Быстрое переключение рабочих профилей и наборов приложений',
        keywords: 'пространства spaces профили workspace',
        icon: <Rocket className="w-4 h-4" />,
        run: () => onOpenWindow('spaces'),
      },
      {
        id: 'svc_win_services',
        group: 'Службы и утилиты',
        title: 'Службы Windows (services.msc)',
        subtitle: 'Системная консоль служб операционной системы',
        badge: 'WIN',
        keywords: 'services.msc службы windows консоль',
        icon: <Settings className="w-4 h-4" />,
        run: () => launchNativeTool('services.msc', 'Службы Windows'),
      },
      {
        id: 'svc_win_devmgmt',
        group: 'Службы и утилиты',
        title: 'Диспетчер устройств (devmgmt.msc)',
        subtitle: 'Оборудование и драйверы Windows',
        badge: 'WIN',
        keywords: 'devmgmt.msc диспетчер устройств драйверы оборудование',
        icon: <Cpu className="w-4 h-4" />,
        run: () => launchNativeTool('devmgmt.msc', 'Диспетчер устройств'),
      },
      {
        id: 'svc_win_regedit',
        group: 'Службы и утилиты',
        title: 'Редактор реестра (regedit)',
        subtitle: 'Системный реестр Windows',
        badge: 'WIN',
        keywords: 'regedit реестр registry',
        icon: <Wrench className="w-4 h-4" />,
        run: () => launchNativeTool('regedit', 'Редактор реестра'),
      },
      {
        id: 'svc_win_control',
        group: 'Службы и утилиты',
        title: 'Панель управления Windows (control)',
        subtitle: 'Классическая панель управления системой',
        badge: 'WIN',
        keywords: 'control панель управления windows',
        icon: <SlidersHorizontal className="w-4 h-4" />,
        run: () => launchNativeTool('control', 'Панель управления'),
      },
      {
        id: 'svc_win_firewall',
        group: 'Службы и утилиты',
        title: 'Брандмауэр Windows (wf.msc)',
        subtitle: 'Правила входящего и исходящего трафика',
        badge: 'WIN',
        keywords: 'firewall брандмауэр wf.msc сеть',
        icon: <ShieldCheck className="w-4 h-4" />,
        run: () => launchNativeTool('wf.msc', 'Брандмауэр'),
      },
      {
        id: 'svc_lock',
        group: 'Службы и утилиты',
        title: 'Заблокировать ПК',
        subtitle: 'Мгновенная блокировка экрана',
        keywords: 'блокировка экран lock',
        icon: <Lock className="w-4 h-4" />,
        run: () => onPowerAction('lock'),
      },
      {
        id: 'svc_sleep',
        group: 'Службы и утилиты',
        title: 'Спящий режим ПК',
        subtitle: 'Перевести компьютер в сон',
        keywords: 'сон sleep выключить питание',
        icon: <Power className="w-4 h-4" />,
        run: () => onPowerAction('sleep'),
      },
      {
        id: 'svc_recycle',
        group: 'Службы и утилиты',
        title: 'Корзина Windows',
        subtitle: 'Открыть системную корзину',
        keywords: 'корзина recycle bin удалить',
        icon: <Trash2 className="w-4 h-4" />,
        run: () => onPowerAction('recycle_bin'),
      },
    ];

    return [...appItems, ...settingsItems, ...serviceItems];
  }, [apps, installedApps, iconMap, isDark]);

  const results = useMemo<SpotlightResult[]>(() => {
    const raw = query.trim();
    const q = raw.toLowerCase();
    if (!q) return [];

    // Rank: startsWith title > includes title > includes keywords/subtitle
    const scored = catalog
      .map((item) => {
        const t = item.title.toLowerCase();
        const k = item.keywords;
        const sub = item.subtitle.toLowerCase();
        let score = 0;
        if (t === q) score = 100;
        else if (t.startsWith(q)) score = 80;
        else if (t.includes(q)) score = 60;
        else if (k.includes(q)) score = 40;
        else if (sub.includes(q)) score = 25;
        return { item, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 18)
      .map((x) => x.item);

    const out: SpotlightResult[] = [...scored];

    // Direct URL or file path / terminal command
    const isUrl = /^https?:\/\//i.test(raw) || (/^[a-z0-9-]+\.[a-z]{2,}(\/.*)?$/i.test(raw) && !raw.includes(' '));
    const isPathOrCmd = raw.includes('\\') || raw.includes(':/') || raw.endsWith('.exe') || raw.endsWith('.msc');
    if (isUrl) {
      const fullUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      out.unshift({
        id: `open_url_${q}`,
        group: 'Выполнить',
        title: `Открыть сайт: ${fullUrl}`,
        subtitle: 'Открыть адрес в браузере по умолчанию',
        badge: 'URL',
        keywords: q,
        icon: <Globe className="w-4 h-4 text-sky-400" />,
        run: () => openExternalUrl(fullUrl),
      });
    } else if (isPathOrCmd) {
      out.unshift({
        id: `run_cmd_${q}`,
        group: 'Выполнить',
        title: `Выполнить: ${raw}`,
        subtitle: 'Запустить команду или открыть путь в системе',
        badge: 'RUN',
        keywords: q,
        icon: <Terminal className="w-4 h-4 text-[var(--luma-accent)]" />,
        run: () => launchNativeTool(raw, raw),
      });
    }

    // Web Search fallback — highlighted FIRST if nothing matched locally, otherwise cleanly available at bottom!
    const encoded = encodeURIComponent(raw);
    const webItems: SpotlightResult[] = [
      {
        id: `web_google_${q}`,
        group: 'Поиск в Интернете',
        title: `Искать «${raw}» в Google`,
        subtitle:
          scored.length === 0
            ? 'Локально ничего не найдено — мгновенный поиск в Интернете'
            : 'Открыть результаты поиска в Google',
        badge: 'WEB',
        keywords: q,
        icon: <Globe className="w-4 h-4 text-emerald-400" />,
        run: () => openExternalUrl(`https://www.google.com/search?q=${encoded}`),
      },
      {
        id: `web_ddg_${q}`,
        group: 'Поиск в Интернете',
        title: `Искать «${raw}» в DuckDuckGo`,
        subtitle: 'Приватный поиск в Интернете',
        badge: 'WEB',
        keywords: q,
        icon: <Search className="w-4 h-4 text-amber-400" />,
        run: () => openExternalUrl(`https://duckduckgo.com/?q=${encoded}`),
      },
      {
        id: `web_yt_${q}`,
        group: 'Поиск в Интернете',
        title: `Найти «${raw}» на YouTube`,
        subtitle: 'Поиск видео и руководств',
        badge: 'YT',
        keywords: q,
        icon: <Youtube className="w-4 h-4 text-rose-400" />,
        run: () => openExternalUrl(`https://www.youtube.com/results?search_query=${encoded}`),
      },
    ];

    if (scored.length === 0) {
      return [...out, ...webItems];
    }
    return [...out, webItems[0]];
  }, [catalog, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (results.length ? (i + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        const act = results[selectedIndex];
        onClose();
        act.run();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, results, selectedIndex, onClose]);

  if (!open) return null;

  const groupedOrder: SpotlightResult['group'][] = [
    'Выполнить',
    'Приложения',
    'Настройки системы',
    'Службы и утилиты',
    'Поиск в Интернете',
  ];

  // Build flat index map matching rendered group order
  const orderedFlat: SpotlightResult[] = [];
  const sections: { group: SpotlightResult['group']; items: { item: SpotlightResult; flatIdx: number }[] }[] = [];
  for (const grp of groupedOrder) {
    const itemsInGrp = results.filter((r) => r.group === grp);
    if (itemsInGrp.length > 0) {
      sections.push({
        group: grp,
        items: itemsInGrp.map((item) => {
          const flatIdx = orderedFlat.length;
          orderedFlat.push(item);
          return { item, flatIdx };
        }),
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center pt-[13vh] px-4 bg-black/45 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full max-w-[620px] rounded-2xl border shadow-2xl overflow-hidden luma-animate-in ${
          isDark
            ? 'bg-[#101218]/96 border-white/15 text-zinc-100'
            : 'bg-white/96 border-zinc-900/15 text-zinc-900'
        }`}
      >
        {/* Clean Minimal Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Search className="w-5 h-5 text-[var(--luma-accent)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск приложений, настроек, служб или в Интернете..."
            className="flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:opacity-50"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
              title="Очистить"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd
            className={`px-2 py-0.5 rounded-md border text-[10px] font-mono opacity-65 shrink-0 ${
              isDark ? 'border-white/15 bg-white/5' : 'border-zinc-300 bg-zinc-100'
            }`}
          >
            Alt+R
          </kbd>
        </div>

        {/* Empty state: ultra-clean minimal subtle footer only */}
        {!query.trim() ? (
          <div
            className={`px-4 py-2 border-t flex items-center justify-between text-[11px] font-mono ${
              isDark ? 'border-white/[0.07] bg-white/[0.02] text-zinc-400' : 'border-zinc-900/[0.07] bg-black/[0.02] text-zinc-500'
            }`}
          >
            <span>Приложения ПК · Настройки · Службы ОС · Поиск в Интернете</span>
            <span>ESC — закрыть</span>
          </div>
        ) : (
          <>
            {/* Live Filtered Results */}
            <div
              className={`max-h-[58vh] overflow-y-auto border-t p-2 space-y-2.5 ${
                isDark ? 'border-white/[0.08]' : 'border-zinc-900/[0.08]'
              }`}
            >
              {sections.map((sec) => (
                <div key={sec.group} className="space-y-1">
                  <div className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-[0.14em] opacity-55">
                    {sec.group}
                  </div>
                  {sec.items.map(({ item, flatIdx }) => {
                    const active = flatIdx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(flatIdx)}
                        onClick={() => {
                          onClose();
                          item.run();
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left transition cursor-pointer ${
                          active
                            ? 'bg-[var(--luma-accent)] text-white shadow-sm'
                            : isDark
                            ? 'hover:bg-white/[0.06]'
                            : 'hover:bg-black/[0.04]'
                        }`}
                      >
                        <div
                          className={`relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
                            active ? 'bg-white/20 text-white' : isDark ? 'bg-white/[0.07]' : 'bg-black/[0.06]'
                          }`}
                        >
                          <span className="flex items-center justify-center">{item.icon}</span>
                          {item.iconUrl && (
                            <img
                              src={item.iconUrl}
                              alt=""
                              className="absolute inset-0 m-auto w-5 h-5 object-contain rounded-[3px]"
                              onLoad={(e) => {
                                const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                                if (prev) prev.style.opacity = '0';
                              }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold truncate">{item.title}</div>
                          <div className={`text-[11px] truncate ${active ? 'text-white/80' : 'opacity-60'}`}>
                            {item.subtitle}
                          </div>
                        </div>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase shrink-0 ${
                              active ? 'bg-white/20 text-white' : isDark ? 'bg-white/10 text-zinc-300' : 'bg-black/10 text-zinc-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {active && <CornerDownLeft className="w-3.5 h-3.5 shrink-0 opacity-85" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div
              className={`px-4 py-2 border-t flex items-center justify-between text-[10px] font-mono ${
                isDark ? 'border-white/[0.07] bg-white/[0.02] text-zinc-400' : 'border-zinc-900/[0.07] bg-black/[0.02] text-zinc-500'
              }`}
            >
              <span>↑↓ выбор · Enter — открыть</span>
              <span>Найдено: {orderedFlat.length}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
