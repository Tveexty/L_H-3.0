export type ThemeKey = 'dark' | 'amoled' | 'light' | 'purple' | 'spring' | string;
export type ClockStyleKey =
  | 'android_vertical'
  | 'stacked'
  | 'standard'
  | 'pill_glass'
  | 'split_flip'
  | 'cyber_mono'
  | 'minimal'
  | 'compact_badge'
  | 'nothing_dot'
  | 'ios_standby'
  | 'samsung_oneui'
  | 'neon_synthwave'
  | 'retro_casio'
  | 'macos_sonoma'
  | 'futuristic_hud'
  | 'analog_hybrid'
  | 'vertical_neon_bar'
  | 'material_expressive';
export type GlassIntensity = 'light' | 'medium' | 'strong';
export type AppType = 'app' | 'web' | 'system' | 'plugin';

export interface CustomThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  bgGradient: string;
  surfaceRgba: string;
  cardHex: string;
  accent: string;
  accentHex: string;
  custom?: boolean;
}

export interface AppItem {
  id: string;
  name: string;
  package: string;
  category: string;
  icon: string;
  url: string;
  args?: string;
  type: AppType;
  installed: boolean;
  favorite: boolean;
  custom?: boolean;
  monthMinutes: number;
  weekMinutes: number;
  todayMinutes: number;
  elapsedSeconds: number;
  dailyLimitMinutes: number;
  detoxGroup: string;
  isRunning?: boolean;
  pluginId?: string;
}

export interface DetoxGroup {
  name: string;
  dailyLimitMinutes: number;
  enabled: boolean;
}

export interface PluginItem {
  id: string;
  name: string;
  version: string;
  author?: string;
  category?: string;
  icon?: string;
  description: string;
  enabled: boolean;
  file: string;
  hooks: string[];
  showInLauncher?: boolean;
  customIntervalSec?: number;
  notificationsEnabled?: boolean;
}

export interface CatalogPluginItem {
  id: string;
  name: string;
  version: string;
  author: string;
  category: string;
  icon: string;
  description: string;
  file: string;
  hooks: string[];
}

export interface WorkspacePreset {
  id: string;
  name: string;
  hotkey: string;
  closeProcesses: string[];
  launchApps: string[];
}

export interface BackupRecord {
  id: string;
  filename: string;
  createdAt: string;
  sizeKb: string;
}

export const THEMES: Record<string, CustomThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Темная (Midnight Slate)',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 16% 12%, rgba(59, 130, 246, 0.11), transparent 40%), radial-gradient(circle at 85% 82%, rgba(16, 185, 129, 0.06), transparent 45%), linear-gradient(155deg, #0b0f17 0%, #0d111a 55%, #111723 100%)',
    surfaceRgba: 'rgba(21, 27, 38, 0.88)',
    cardHex: '#151b26',
    accent: 'blue',
    accentHex: '#3b82f6',
  },
  amoled: {
    id: 'amoled',
    name: 'Черный Оникс (AMOLED)',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 20% 15%, rgba(16, 185, 129, 0.08), transparent 40%), linear-gradient(155deg, #05070b 0%, #080b11 60%, #0c1018 100%)',
    surfaceRgba: 'rgba(13, 17, 24, 0.92)',
    cardHex: '#0d1118',
    accent: 'emerald',
    accentHex: '#10b981',
  },
  light: {
    id: 'light',
    name: 'Светлая',
    isDark: false,
    bgGradient:
      'radial-gradient(circle at 20% 15%, rgba(59, 130, 246, 0.12), transparent 45%), radial-gradient(circle at 80% 85%, rgba(14, 165, 233, 0.10), transparent 45%), linear-gradient(145deg, #eef2f7 0%, #f8fafc 60%, #e2e8f0 100%)',
    surfaceRgba: 'rgba(255, 255, 255, 0.82)',
    cardHex: '#ffffff',
    accent: 'blue',
    accentHex: '#2563eb',
  },
  purple: {
    id: 'purple',
    name: 'Фиолетовая',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 22% 18%, rgba(168, 85, 247, 0.18), transparent 45%), radial-gradient(circle at 80% 78%, rgba(217, 70, 239, 0.12), transparent 45%), linear-gradient(145deg, #0f0b1d 0%, #17122b 55%, #120e24 100%)',
    surfaceRgba: 'rgba(26, 20, 48, 0.86)',
    cardHex: '#1a1430',
    accent: 'purple',
    accentHex: '#a855f7',
  },
  spring: {
    id: 'spring',
    name: 'Весна',
    isDark: false,
    bgGradient:
      'radial-gradient(circle at 22% 18%, rgba(236, 72, 153, 0.14), transparent 45%), radial-gradient(circle at 80% 78%, rgba(244, 114, 182, 0.12), transparent 45%), linear-gradient(145deg, #fff5f8 0%, #fce7f3 60%, #fbcfe8 100%)',
    surfaceRgba: 'rgba(255, 245, 250, 0.82)',
    cardHex: '#ffffff',
    accent: 'pink',
    accentHex: '#ec4899',
  },
};

export const CLOCK_STYLE_OPTIONS: {
  id: ClockStyleKey;
  label: string;
  sample: string;
  description: string;
  isNew25?: boolean;
}[] = [
  {
    id: 'android_vertical',
    label: 'Android 14 Вертикальный (HH / MM)',
    sample: '14 / 32',
    description: 'Крупные вертикальные часы в стиле экрана блокировки Android 14 / Pixel',
  },
  {
    id: 'stacked',
    label: 'Двухэтажный (Stacked Compact)',
    sample: '14 : 32',
    description: 'Компактные часы в два этажа с датой сбоку',
  },
  {
    id: 'standard',
    label: 'Классический (Горизонтальный)',
    sample: '14:32:08',
    description: 'Традиционные цифровые часы с секундами и датой снизу',
  },
  {
    id: 'pill_glass',
    label: 'Стеклянная капсула (OneUI Pill)',
    sample: '14:32 • Пн, 02.11',
    description: 'Стильная капсула в одну строку с иконкой и датой',
  },
  {
    id: 'split_flip',
    label: 'Раздельные карточки (Flip Clock)',
    sample: '[14] [32] [08]',
    description: 'Часы и минуты на отдельных темных карточках',
  },
  {
    id: 'cyber_mono',
    label: 'Кибер-Моно (Терминал)',
    sample: '[ 14 : 32 : 08 ]',
    description: 'Моноширинный киберпанк-стиль в квадратных скобках',
  },
  {
    id: 'minimal',
    label: 'Минималистичный (Чистый)',
    sample: '14:32',
    description: 'Чистое время без лишних рамок',
  },
  {
    id: 'compact_badge',
    label: 'Компактный бейдж с днем недели',
    sample: 'Пн • 14:32',
    description: 'Акцентный бейдж дня недели и текущее время',
  },
  // +10 НОВЫХ СТИЛЕЙ В ВЕРСИИ 2.5
  {
    id: 'nothing_dot',
    label: 'Nothing OS (Dot-Matrix)',
    sample: '::14 · 32 · 08::',
    description: 'Точечно-матричный индустриальный шрифт в стиле Nothing Phone (2)',
    isNew25: true,
  },
  {
    id: 'ios_standby',
    label: 'iOS 17 StandBy (Ночной док)',
    sample: '14:32 STANDBY',
    description: 'Крупные контрастные часы ночного режима iOS 17 StandBy',
    isNew25: true,
  },
  {
    id: 'samsung_oneui',
    label: 'Samsung OneUI 6 Lock',
    sample: '14 / 32 OneUI',
    description: 'Фирменный двойной блок Samsung One UI 6 с акцентом минут',
    isNew25: true,
  },
  {
    id: 'neon_synthwave',
    label: 'Neon Synthwave 80s',
    sample: '⚡ 14:32:08',
    description: 'Неоновый ретро-футуризм с мягким свечением цифр',
    isNew25: true,
  },
  {
    id: 'retro_casio',
    label: 'Retro LCD (Casio F-91W)',
    sample: "LCD 14:32'08",
    description: 'Кварцевый ЖК-индикатор в стиле классических часов Casio',
    isNew25: true,
  },
  {
    id: 'macos_sonoma',
    label: 'macOS Sonoma Lockscreen',
    sample: '14:32 Sonoma',
    description: 'Элегантная типографика экрана блокировки macOS Sonoma',
    isNew25: true,
  },
  {
    id: 'futuristic_hud',
    label: 'Sci-Fi Tactical HUD',
    sample: 'SYS//14:32.08',
    description: 'Тактический телеметрический дисплей с системным префиксом',
    isNew25: true,
  },
  {
    id: 'analog_hybrid',
    label: 'Гибридный Хронограф',
    sample: '◔ 14:32:08',
    description: 'Сочетание часового индикатора хронографа и цифрового блока',
    isNew25: true,
  },
  {
    id: 'vertical_neon_bar',
    label: 'Неоновая Вертикаль (Бар)',
    sample: '14 ┃ 32',
    description: 'Вертикальная колонка с яркой неоновой полосой акцента',
    isNew25: true,
  },
  {
    id: 'material_expressive',
    label: 'Material You Expressive (Pixel 9)',
    sample: '14 / 32 Pixel',
    description: 'Выразительный адаптивный стиль Google Pixel 9 Material You',
    isNew25: true,
  },
];

// All apps start at 0 minutes / 0 seconds. Timer starts counting in real time when launched!
export const INITIAL_APPS: AppItem[] = [
  {
    id: 'steam',
    name: 'Steam',
    package: 'steam',
    category: 'Games',
    icon: 'Gamepad2',
    url: 'steam://',
    type: 'app',
    installed: true,
    favorite: true,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 180,
    detoxGroup: 'Игры',
    isRunning: false,
  },
  {
    id: 'chrome',
    name: 'Chrome',
    package: 'chrome',
    category: 'Browser',
    icon: 'Globe',
    url: 'https://google.com',
    type: 'web',
    installed: true,
    favorite: true,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 240,
    detoxGroup: 'Браузеры',
    isRunning: false,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    package: 'telegram',
    category: 'Social',
    icon: 'MessageSquare',
    url: 'tg://',
    type: 'app',
    installed: true,
    favorite: true,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 60,
    detoxGroup: 'Соцсети и мессенджеры',
    isRunning: false,
  },
  {
    id: 'vk',
    name: 'VK',
    package: 'vk',
    category: 'Social',
    icon: 'Users',
    url: 'https://vk.com',
    type: 'web',
    installed: true,
    favorite: true,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 60,
    detoxGroup: 'Соцсети и мессенджеры',
    isRunning: false,
  },
  {
    id: 'vkgames',
    name: 'VK Play / Игры',
    package: 'vkgames',
    category: 'Games',
    icon: 'Trophy',
    url: 'https://games.vk.com',
    type: 'web',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 180,
    detoxGroup: 'Игры',
    isRunning: false,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    package: 'youtube',
    category: 'Media',
    icon: 'Play',
    url: 'https://youtube.com',
    type: 'web',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 90,
    detoxGroup: 'Медиа',
    isRunning: false,
  },
  {
    id: 'vlc',
    name: 'VLC Media Player',
    package: 'vlc',
    category: 'Media',
    icon: 'Film',
    url: 'vlc://',
    type: 'app',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 180,
    detoxGroup: 'Медиа',
    isRunning: false,
  },
  {
    id: 'vkmusic',
    name: 'VK Музыка',
    package: 'vkmusic',
    category: 'Music',
    icon: 'Music',
    url: 'https://vk.com/music',
    type: 'web',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 180,
    detoxGroup: 'Медиа',
    isRunning: false,
  },
  {
    id: 'yandexmusic',
    name: 'Яндекс Музыка',
    package: 'yandexmusic',
    category: 'Music',
    icon: 'Headphones',
    url: 'https://music.yandex.ru',
    type: 'web',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 180,
    detoxGroup: 'Медиа',
    isRunning: false,
  },
  {
    id: 'firefox',
    name: 'Firefox',
    package: 'firefox',
    category: 'Browser',
    icon: 'Compass',
    url: 'https://mozilla.org',
    type: 'web',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 240,
    detoxGroup: 'Браузеры',
    isRunning: false,
  },
  {
    id: 'calc',
    name: 'Калькулятор',
    package: 'calc',
    category: 'System',
    icon: 'Calculator',
    url: 'calc',
    type: 'system',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 300,
    detoxGroup: 'Система',
    isRunning: false,
  },
  {
    id: 'explorer',
    name: 'Проводник',
    package: 'explorer',
    category: 'System',
    icon: 'FolderOpen',
    url: 'explorer',
    type: 'system',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 300,
    detoxGroup: 'Система',
    isRunning: false,
  },
  {
    id: 'taskmgr',
    name: 'Диспетчер задач',
    package: 'taskmgr',
    category: 'System',
    icon: 'Activity',
    url: 'taskmgr',
    type: 'system',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 300,
    detoxGroup: 'Система',
    isRunning: false,
  },
  {
    id: 'cmd',
    name: 'Командная строка',
    package: 'cmd',
    category: 'System',
    icon: 'Terminal',
    url: 'cmd',
    type: 'system',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 300,
    detoxGroup: 'Система',
    isRunning: false,
  },
  {
    id: 'winword',
    name: 'Microsoft Word',
    package: 'winword',
    category: 'Office',
    icon: 'FileText',
    url: 'winword',
    type: 'app',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 300,
    detoxGroup: 'Работа',
    isRunning: false,
  },
  {
    id: 'yandexdisk',
    name: 'Яндекс Диск',
    package: 'yandexdisk',
    category: 'Cloud',
    icon: 'Cloud',
    url: 'https://disk.yandex.ru',
    type: 'web',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 300,
    detoxGroup: 'Работа',
    isRunning: false,
  },
];

export const INITIAL_DETOX_GROUPS: DetoxGroup[] = [
  { name: 'Игры', dailyLimitMinutes: 180, enabled: true },
  { name: 'Соцсети и мессенджеры', dailyLimitMinutes: 90, enabled: true },
  { name: 'Медиа', dailyLimitMinutes: 120, enabled: true },
  { name: 'Браузеры', dailyLimitMinutes: 240, enabled: false },
];

export const INITIAL_PLUGINS: PluginItem[] = [
  {
    id: 'session_tracker_plugin',
    name: 'Game & App Session Tracker (C#)',
    version: '3.0.0',
    author: 'Luma OS Core Team',
    category: 'Аналитика и Детокс',
    icon: 'BarChart3',
    description:
      'Отслеживает время с 00:00 в реальном времени после запуска каждого приложения или игры, выводит таймер и часы на плитках, строит графики (день/неделя/месяц) и контролирует лимиты детокса.',
    enabled: true,
    file: 'LauncherHab3.0_CSharp/Plugins/SessionTrackerPlugin.cs',
    hooks: ['OnInitializeAsync', 'OnAppLaunched', 'OnTickAsync', 'FormatLiveTileBadge', 'GetTilePayload'],
    showInLauncher: true,
    customIntervalSec: 1,
    notificationsEnabled: true,
  },
  {
    id: 'focus_mode_plugin',
    name: 'Focus Mode (Pomodoro C#)',
    version: '3.0.0',
    author: 'Luma OS Core Team',
    category: 'Продуктивность',
    icon: 'Clock',
    description:
      'Режим концентрации с Pomodoro-таймером на 25 минут и автоматическим закрытием отвлекающих мессенджеров в среде .NET 8.',
    enabled: true,
    file: 'LauncherHab3.0_CSharp/Plugins/BuiltInPluginsPack.cs',
    hooks: ['OnInitializeAsync', 'OnTickAsync', 'GetTilePayload'],
    showInLauncher: true,
    customIntervalSec: 60,
    notificationsEnabled: true,
  },
  {
    id: 'smart_music_controller',
    name: 'Smart Music Controller (WASAPI C#)',
    version: '3.0.0',
    author: 'Luma OS Core Team',
    category: 'Медиа',
    icon: 'Music',
    description: 'Встроенный мини-плеер C# (WASAPI / Windows SMTC) для быстрого переключения треков на плитках.',
    enabled: true,
    file: 'LauncherHab3.0_CSharp/Plugins/BuiltInPluginsPack.cs',
    hooks: ['OnInitializeAsync', 'GetTilePayload'],
    showInLauncher: true,
    customIntervalSec: 30,
    notificationsEnabled: true,
  },
  {
    id: 'smart_weather_plugin',
    name: 'Smart Weather Open-Meteo (C#)',
    version: '3.0.0',
    author: 'Luma OS Core Team',
    category: 'Виджеты',
    icon: 'Cloud',
    description: 'Живая плитка погоды C# (Open-Meteo API): температура, ветер и почасовой прогноз для любого города.',
    enabled: true,
    file: 'LauncherHab3.0_CSharp/Plugins/BuiltInPluginsPack.cs',
    hooks: ['OnInitializeAsync', 'GetTilePayload'],
    showInLauncher: true,
    customIntervalSec: 300,
    notificationsEnabled: true,
  },
  {
    id: 'idea_notebook_plugin',
    name: 'Idea Notebook (C# VFS)',
    version: '3.0.0',
    author: 'Luma OS Core Team',
    category: 'Утилиты',
    icon: 'FileText',
    description: 'Быстрые заметки и To-Do списки с шифрованием AES-256-GCM в виртуальной ФС ядра Luma OS.',
    enabled: true,
    file: 'LauncherHab3.0_CSharp/Plugins/BuiltInPluginsPack.cs',
    hooks: ['OnInitializeAsync', 'GetTilePayload'],
    showInLauncher: true,
    customIntervalSec: 60,
    notificationsEnabled: true,
  },
  {
    id: 'smart_file_finder',
    name: 'Smart File Finder (C# .NET 8)',
    version: '3.0.0',
    author: 'Luma OS Core Team',
    category: 'Система',
    icon: 'Search',
    description: 'Сверхбыстрый асинхронный поиск локальных файлов через Directory.EnumerateFiles (.NET 8).',
    enabled: true,
    file: 'LauncherHab3.0_CSharp/Plugins/BuiltInPluginsPack.cs',
    hooks: ['OnInitializeAsync', 'SearchLocalFiles', 'GetTilePayload'],
    showInLauncher: true,
    customIntervalSec: 60,
    notificationsEnabled: true,
  },
];

export const PLUGIN_CATALOG: CatalogPluginItem[] = [
  {
    id: 'system_cleaner_plugin',
    name: 'System Cleaner & RAM Optimizer (C#)',
    version: '3.0.0',
    author: 'Luma OS Store',
    category: 'Система',
    icon: 'Activity',
    description: 'Очистка временного кэша системы и оптимизация Working Set процессов в 1 клик через Win32 API.',
    file: 'LauncherHab3.0_CSharp/Plugins/BuiltInPluginsPack.cs',
    hooks: ['OnInitializeAsync', 'GetTilePayload'],
  },
  {
    id: 'game_booster_plugin',
    name: 'Game Booster Pro (FPS & Ping C#)',
    version: '3.0.0',
    author: 'Luma OS Store',
    category: 'Игры',
    icon: 'Gamepad2',
    description: 'Повышение приоритета игровых процессов (ProcessPriorityClass.High) и мониторинг пинга перед запуском.',
    file: 'LauncherHab3.0_CSharp/Plugins/BuiltInPluginsPack.cs',
    hooks: ['OnInitializeAsync', 'OnTickAsync', 'GetTilePayload'],
  },
  {
    id: 'quick_clipboard_plugin',
    name: 'Quick Clipboard History (C#)',
    version: '3.0.0',
    author: 'Luma OS Store',
    category: 'Продуктивность',
    icon: 'Copy',
    description: 'Менеджер буфера обмена Windows с шифрованием истории сниппетов через Luma SecurityKernel.',
    file: 'LauncherHab3.0_CSharp/Plugins/BuiltInPluginsPack.cs',
    hooks: ['OnInitializeAsync', 'GetTilePayload'],
  },
];

export const INITIAL_WORKSPACES: WorkspacePreset[] = [
  {
    id: 'gaming',
    name: 'Игровой режим',
    hotkey: 'ctrl+shift+g',
    closeProcesses: ['chrome', 'browser', 'discordcanary'],
    launchApps: ['steam', 'telegram'],
  },
  {
    id: 'dev',
    name: 'Режим разработчика C#',
    hotkey: 'ctrl+shift+d',
    closeProcesses: [],
    launchApps: ['cmd', 'chrome'],
  },
  {
    id: 'focus',
    name: 'Фокус и Детокс',
    hotkey: 'ctrl+shift+f',
    closeProcesses: ['steam', 'vk', 'telegram'],
    launchApps: ['winword'],
  },
];

export interface IslandPlayerItem {
  id: string;
  name: string;
  color: string;
  track: string;
  artist: string;
}

export interface IslandNotificationItem {
  id: string;
  app: string;
  title: string;
  message: string;
  time: string;
  color: string;
  read: boolean;
}

export const INITIAL_ISLAND_PLAYERS: IslandPlayerItem[] = [
  {
    id: 'windows_smtc',
    name: 'Windows Media (SMTC)',
    color: '#3b82f6',
    track: 'Synthwave Night Drive',
    artist: 'System Audio Session',
  },
  {
    id: 'yandex_music',
    name: 'Яндекс Музыка',
    color: '#f59e0b',
    track: 'Моя Волна • Поток',
    artist: 'Яндекс Музыка HQ',
  },
  {
    id: 'spotify',
    name: 'Spotify Desktop',
    color: '#10b981',
    track: 'Midnight City (Lo-Fi Mix)',
    artist: 'Spotify Connect',
  },
  {
    id: 'vk_music',
    name: 'VK Музыка',
    color: '#60a5fa',
    track: 'Киберпанк Плейлист',
    artist: 'VK Audio',
  },
  {
    id: 'telegram_audio',
    name: 'Telegram Плеер',
    color: '#38bdf8',
    track: 'Голосовой / Аудио подкаст',
    artist: 'Telegram Desktop',
  },
];

export const INITIAL_WINDOWS_NOTIFICATIONS: IslandNotificationItem[] = [
  {
    id: 'win_1',
    app: 'Luma OS Security Kernel 1.0',
    title: 'Криптоядро AES-256-GCM активно',
    message: 'Угроз не обнаружено. Контейнер PBKDF2-HMAC-SHA512 (310 000 итераций) синхронизирован.',
    time: 'Сейчас',
    color: '#10b981',
    read: false,
  },
  {
    id: 'win_2',
    app: 'Плиточная оболочка Luma Shell',
    title: 'Интерфейс плиток (Windows / Android) запущен поверх Luma OS',
    message: 'Все 12 живых виджетов, папки 1x1/2x1/2x2 и служба Dynamic Island подключены к ядру C#.',
    time: '1 мин назад',
    color: '#3b82f6',
    read: false,
  },
  {
    id: 'win_3',
    app: 'Luma Core Daemon (.NET 8)',
    title: 'JSON-RPC 2.0 сервер 127.0.0.1:49215',
    message: 'Весь код переведен на C# (.NET 8 / WPF / WASAPI). Службы ядра работают в штатном режиме.',
    time: '2 мин назад',
    color: '#a855f7',
    read: false,
  },
];

export const PYTHON_PROJECT_FILES: { path: string; title: string; badge: string; summary: string }[] = [
  {
    path: 'LauncherHab3.0_CSharp/Program.cs',
    title: 'Program.cs',
    badge: 'ENTRY C#',
    summary:
      'Главная точка входа C# (.NET 8): запускает полноценное ядро системы Luma OS (LumaSystemKernel), фоновый IPC-демон и монтирует плиточный интерфейс (Windows / Android) поверх системы.',
  },
  {
    path: 'LauncherHab3.0_CSharp/LumaCore/LumaSystemKernel.cs',
    title: 'LumaCore/LumaSystemKernel.cs',
    badge: 'LUMA OS KERNEL',
    summary:
      'Полноценное ядро операционной системы Luma на C#: диспетчер 8 системных служб, виртуальная файловая система (VFS), шифрованный реестр и управление плиточной оболочкой (Windows Metro / Android 15 / Luma Glass).',
  },
  {
    path: 'LauncherHab3.0_CSharp/LumaCore/LumaCoreDaemon.cs',
    title: 'LumaCore/LumaCoreDaemon.cs',
    badge: 'LUMA DAEMON C#',
    summary:
      'Независимый фоновый демон Luma 1.0 на C# (JSON-RPC 2.0 сокет 127.0.0.1:49215, ProcessManager с Watchdog-перезапуском, WidgetEngine и PluginHostV3).',
  },
  {
    path: 'LauncherHab3.0_CSharp/LumaCore/SecurityKernel.cs',
    title: 'LumaCore/SecurityKernel.cs',
    badge: 'SECURITY 3.0',
    summary:
      'Ядро безопасности Luma 1.0 на C#: аутентифицированное шифрование AES-256-GCM (96-бит Nonce + 128-бит AuthTag), PBKDF2-HMAC-SHA512 (310 000 итераций) и HMAC-подпись IPC пакетов.',
  },
  {
    path: 'LauncherHab3.0_CSharp/LumaCore/WidgetEngine.cs',
    title: 'LumaCore/WidgetEngine.cs',
    badge: '12 WIDGETS C#',
    summary:
      'Движок всех 12 интерактивных системных виджетов Luma на C#: CPU/RAM 2x1, Диски C/D 2x1, Аудио WASAPI 1x1, Заметки & To-Do 2x2, Часы/Аптайм 1x1, Быстрый запуск 2x1, Сеть 1x1/2x1, Плеер 2x1, Помидор 1x1, Погода 1x1/2x1, Калькулятор 2x1 и Питание 1x1.',
  },
  {
    path: 'LauncherHab3.0_CSharp/LumaCore/PluginApiV3.cs',
    title: 'LumaCore/PluginApiV3.cs',
    badge: 'PLUGIN API 3.0',
    summary:
      'Контракт ILumaPluginV3 на C#: изолированный AssemblyLoadContext (.NET 8), флаги разрешений (Permissions), регистрация кастомных плиток (1x1, 2x1, 2x2) и шифрованное хранилище.',
  },
  {
    path: 'LauncherHab3.0_CSharp/LumaCore/IpcClientBridge.cs',
    title: 'LumaCore/IpcClientBridge.cs',
    badge: 'JSON-RPC C#',
    summary:
      'Асинхронный клиент и транспортный мост JSON-RPC 2.0 (NDJSON поверх TCP 127.0.0.1:49215) для связи плиточной оболочки с ядром Luma OS.',
  },
  {
    path: 'LauncherHab3.0_CSharp/UI/MainWindow.xaml.cs',
    title: 'UI/MainWindow.xaml.cs',
    badge: 'TILE SHELL C#',
    summary:
      'Главное окно плиточной оболочки поверх системы Luma OS в стиле живых плиток Windows / Android с переключением в классический Быстрый поиск, папками и размерами 1x1, 2x1, 2x2.',
  },
  {
    path: 'LauncherHab3.0_CSharp/UI/TileShellDashboardWindow.cs',
    title: 'UI/TileShellDashboardWindow.cs',
    badge: 'WIN/ANDROID UI',
    summary:
      'Контроллер плиточного рабочего стола поверх Luma OS: переключение режимов плиток Windows Metro Fluent / Android 15 Material / Luma Glass и навигация одной рукой «ПКМ = Назад».',
  },
  {
    path: 'LauncherHab3.0_CSharp/Modules/DynamicIslandService.cs',
    title: 'Modules/DynamicIslandService.cs',
    badge: 'ISLAND C#',
    summary:
      'Системная служба Dynamic Island на C#: перехват уведомлений Windows, переключение плееров SMTC, таймер, секундомер с кругами, индикация зарядки и режим «Не беспокоить».',
  },
  {
    path: 'LauncherHab3.0_CSharp/Modules/AudioControllerWasapi.cs',
    title: 'Modules/AudioControllerWasapi.cs',
    badge: 'WASAPI AUDIO',
    summary:
      'Неблокирующий контроллер системной громкости Windows CoreAudio / WASAPI на C# с выполнением COM-операций в фоновом потоке.',
  },
  {
    path: 'LauncherHab3.0_CSharp/Modules/AppAndWorkspaceManager.cs',
    title: 'Modules/AppAndWorkspaceManager.cs',
    badge: 'APPS & HOTKEYS',
    summary:
      'Менеджер приложений, папок, рабочих пространств (Smart Workspaces) и глобальных горячих клавиш Win32 (user32.dll RegisterHotKey) на C#.',
  },
  {
    path: 'LauncherHab3.0_CSharp/Modules/ThemeAndGlassEngine.cs',
    title: 'Modules/ThemeAndGlassEngine.cs',
    badge: 'THEMES & GLASS',
    summary:
      'Движок адаптивной темы «День / Ночь» по расписанию, 18 стилей часов и генератор жидкого стекла #AARRGGBB (Windows Acrylic / Mica & Android Blur) на C#.',
  },
  {
    path: 'LauncherHab3.0_CSharp/Modules/DiagnosticsAndUpdater.cs',
    title: 'Modules/DiagnosticsAndUpdater.cs',
    badge: 'DIAGNOSTICS C#',
    summary:
      'Служба самодиагностики 6 узлов системы Luma OS, атомарного сохранения JSON (UTF-8) и автообновления через GitHub Releases API на C#.',
  },
  {
    path: 'LauncherHab3.0_CSharp/Plugins/SessionTrackerPlugin.cs',
    title: 'Plugins/SessionTrackerPlugin.cs',
    badge: 'TRACKER C#',
    summary:
      'Плагин посекундного учета времени приложений и игр с 00:00 (Zero-Start) на C# с выводом живого таймера (🟢 00:00:15) на плитках и контролем лимитов детокса.',
  },
  {
    path: 'LauncherHab3.0_CSharp/Plugins/BuiltInPluginsPack.cs',
    title: 'Plugins/BuiltInPluginsPack.cs',
    badge: 'PLUGINS PACK C#',
    summary:
      'Набор системных плагинов Luma OS на C# (.NET 8): FocusModePomodoroPlugin, SmartWeatherPlugin, SmartMusicControllerPlugin, IdeaNotebookAndFinderPlugin.',
  },
  {
    path: 'LauncherHab3.0_CSharp/LauncherHab3.csproj',
    title: 'LauncherHab3.csproj',
    badge: '.NET 8 CSPROJ',
    summary:
      'Манифест сборки проекта C# (.NET 8 Windows WPF + WinUI + NAudio.Wasapi + CommunityToolkit.Mvvm) для системы Luma OS и плиточного интерфейса.',
  },
  {
    path: 'LauncherHab3.0_CSharp/README_CSHARP_3.0.md',
    title: 'README_CSHARP_3.0.md',
    badge: 'DOCS C#',
    summary:
      'Полная документация по архитектуре системы Luma OS 1.0 на языке C# (.NET 8) и плиточной оболочке Windows / Android.',
  },
];

// Полная история версий с 1.0 до 3.0
export const VERSION_HISTORY: Record<string, string[]> = {
  '3.0': [
    '🚀 LAUNCHER HAB 3.0 (C# .NET 8 EDITION) & РЕЛИЗНОЕ ЯДРО LUMA CORE 1.0 — ПОЛНЫЙ ПЕРЕХОД НА C#, ПЛИТОЧНЫЙ ЭКРАН, ПАПКИ И 12 СИСТЕМНЫХ ВИДЖЕТОВ',
    '💜 ПОЛНЫЙ РЕРАЙТ АРХИТЕКТУРЫ НА ЯЗЫК C# (.NET 8 / WPF / WASAPI) — нативная производительность, строгая типизация, минимальное потребление ОЗУ и мгновенный отклик интерфейса',
    '🧠 РЕЛИЗНОЕ ЯДРО LUMA CORE 1.0 STABLE — выход из стадии Luma Beta: асинхронный JSON-RPC 2.0 сервер на 127.0.0.1:49215, Watchdog-контроль процессов и атомарная UTF-8 запись конфигураций',
    '🔐 ОБНОВЛЕННАЯ БЕЗОПАСНОСТЬ ЯДРА LUMA SECURITY 1.0 — аутентифицированное шифрование AES-256-GCM (96-бит Nonce + 128-бит AuthTag), деривация ключей PBKDF2-HMAC-SHA512 (310 000 итераций) и HMAC-SHA256 подпись IPC-пакетов с защитой от Replay-атак',
    '📱 ПЛИТОЧНЫЙ ГЛАВНЫЙ ЭКРАН 3.0 + ПЕРЕКЛЮЧАТЕЛЬ В «БЫСТРЫЙ ПОИСК» (СТАРОЕ ОКНО) — настраиваемая сетка живых плиток как на современных смартфонах и ПК со свободной расстановкой элементов и мгновенным переключением обратно в классическое окно быстрого поиска',
    '📁 СОЗДАНИЕ ПАПОК И НАСТРОЙКА РАЗМЕРОВ (1x1, 2x1, 2x2) — объединение приложений в папки, переименование, выбор цвета и независимое изменение размера для Папок, Иконок приложений и Виджетов',
    '📊 12 ИНТЕРАКТИВНЫХ ВИДЖЕТОВ LUMA 1.0 НА ГЛАВНОМ ЭКРАНЕ — Системный монитор CPU/RAM (2x1), Анализатор дисков C:/D: (2x1), Аудио-микшер WASAPI (1x1), Быстрые заметки и To-Do чек-лист (2x2), Часы/Дата/Аптайм (1x1), Быстрый запуск утилит (2x1), Сетевой монитор Network I/O (1x1/2x1), Медиаплеер Now Playing (2x1), Таймер Помидор со звуком (1x1), Погода Open-Meteo (1x1/2x1), Быстрый калькулятор и конвертер (2x1), Управление питанием и блокировкой Win+L (1x1)',
    '🌦️ ТОЧНЫЙ ПОИСК ПОГОДЫ ПО ЛЮБОМУ ГОРОДУ МИРА — прямая интеграция Open-Meteo Geocoding API + Forecast API с живым поиском городов на русском и английском языках, почасовым прогнозом и геолокацией',
    '🔌 ПЛАГИН API 3.0 (ILumaPluginV3 C#) — изолированный контекст загрузки сборок .NET 8, система гранулярных разрешений (Permissions), регистрация собственных плиток и плавные 60fps анимации',
  ],
  '2.9': [
    '🚀 LAUNCHER HAB 2.9 & LUMA BETA — ФИНАЛЬНАЯ СИНХРОНИЗАЦИЯ ТРЕХ ОКОН И АВТОЗАПУСК ДЕМОНА',
    '🧠 АВТОМАТИЧЕСКИЙ ЗАПУСК LUMA CORE — лаунчер сам поднимает фоновый демон ядра при старте, если порт 127.0.0.1:49215 свободен',
    '🪟 РЕЖИМ ТРЕХ ОКОН — бесшовная работа Библиотеки, Быстрого запуска (Quick Launch) и Дашборда плиток Luma (Tiles Dashboard)',
    '🛡️ СТАБИЛЬНОСТЬ UTF-8 И PYCAW — устранены конфликты кодировок JSON на Windows и ошибки COM-потоков аудио',
  ],
  '2.8': [
    '🚀 LAUNCHER HAB 2.8 — РАСШИРЕННЫЙ ДАШБОРД ПЛИТОК LUMA И УЛУЧШЕННЫЙ IPC КЛИЕНТ',
    '📡 АСИНХРОННЫЙ МОСТ IPC_CLIENT — неблокирующий обмен пакетами JSON-RPC 2.0 между Flet-интерфейсом и фоновым ядром',
    '📝 СИНХРОНИЗАЦИЯ БЫСТРЫХ ЗАМЕТОК В ПАМЯТИ ЯДРА — мгновенное сохранение заметок между перезапусками графического клиента',
  ],
  '2.7': [
    '🚀 LAUNCHER HAB 2.7 — ПРОТОТИП ЯДРА LUMA BETA И СЕРВИС ВИДЖЕТОВ',
    '⚙️ HEADLESS-ДЕМОН LUMA_CORE.PY — фоновый TCP-сервер на 127.0.0.1:49215 с нулевой нагрузкой на CPU в простое',
    '🧩 БАЗОВЫЙ СЕРВИС ВИДЖЕТОВ WIDGET_SERVICE — архитектура BaseWidget, SystemStatsWidget и QuickNoteWidget',
  ],
  '2.6': [
    '🚀 LAUNCHER HAB 2.6 — DYNAMIC ISLAND, НАСТРОЙКИ В СТИЛЕ ANDROID, АДАПТИВНАЯ ТЕМА ДЕНЬ/НОЧЬ, АВТООБНОВЛЕНИЕ С GITHUB И ПКМ «НАЗАД»',
    '🏝️ ВСЕГДА АКТИВНЫЙ DYNAMIC ISLAND — интерактивный остров в верхней панели с постоянным отображением статуса, времени, даты и процентов заряда устройства',
    '🔔 ПРОСМОТР УВЕДОМЛЕНИЙ ОТ WINDOWS В ОСТРОВЕ — перехват и журнал системных и прикладных уведомлений Windows с очисткой и фильтрацией',
    '🎵 СМЕНА ПРОИГРЫВАТЕЛЯ В DYNAMIC ISLAND — переключение между Windows Media (SMTC), Яндекс Музыкой, Spotify, VK Музыкой и Telegram Audio + управление треками',
    '⏱️ ВСТРОЕННЫЙ ТАЙМЕР И СЕКУНДОМЕР В ОСТРОВЕ — обратный отсчет с пресетами (1/5/15/25 мин) и секундомер с записью кругов (Laps) и выводом прямо на капсулу',
    '⚡ АНИМАЦИЯ ЗАРЯДКИ УСТРОЙСТВА — неоновая изумрудная волна и пульсация молнии в Dynamic Island при подключении питания и отображение процентов батареи',
    '🌙 ПОЛНОСТЬЮ РАБОЧИМ РЕЖИМ «НЕ БЕСПОКОИТЬ» (DND) — блокирует всплывающие баннеры и звуки, тихо сохраняя все уведомления внутри Dynamic Island',
    '📱 ПОЛНОСТЬЮ ПЕРЕРИСОВАННЫЕ НАСТРОЙКИ В СТИЛЕ ANDROID 15 — боковое меню с цветными иконками, плитки быстрых настроек (Quick Settings Tiles) и скругленные карточки',
    '🌗 АДАПТИВНАЯ ТЕМА «ДЕНЬ / НОЧЬ» ПО РАСПИСАНИЮ — автоматическая смена темы (днем — светлая/белая, ночью — темная) с выбором точного времени смены и конкретных тем',
    '🔄 АВТООБНОВЛЕНИЕ И ПРОВЕРКА НОВОЙ ВЕРСИИ С GITHUB — проверка релизов через GitHub API, переход на репозиторий GitHub в 1 клик и автопроверка при запуске',
    '🩺 ДИАГНОСТИКА ПРИЛОЖЕНИЯ И РАЗДЕЛ «О ПРИЛОЖЕНИИ» — комплексная проверка файловой системы, шифрования PBKDF2, плагинов, ресурсов ОС и экспорт отчета',
    '🖱️ ФУНКЦИЯ «НАЗАД» НА ПКМ (ПРАВУЮ КНОПКУ МЫШИ) — удобная навигация одной рукой: клик ПКМ возвращает на предыдущий экран, сбрасывает фильтр или закрывает поиск',
  ],
  '2.5': [
    '🚀 LAUNCHER HAB 2.5 — МЕГА-ПЕРСОНАЛИЗАЦИЯ, 18 СТИЛЕЙ ЧАСОВ, КАСТОМНЫЕ ТЕМЫ PRO, API 2.5 И PBKDF2 ШИФРОВАНИЕ',
    '💡 МГНОВЕННАЯ ПОДСВЕТКА АКТИВНЫХ НАСТРОЕК («ЗАЖИГАНИЕ» СТАТУСА) — при выборе любого стиля, переключателя или пресета элемент мгновенно загорается неоновой рамкой и меняет статус с «⚪ НЕАКТИВНО» на «🟢 АКТИВНО»',
    '🕒 +10 НОВЫХ СТИЛЕЙ ЧАСОВ (ВСЕГО 18 СТИЛЕЙ) — добавлены Nothing OS (Dot-Matrix), iOS 17 StandBy, Samsung OneUI 6, Neon Synthwave 80s, Retro LCD Casio F-91W, macOS Sonoma, Sci-Fi Tactical HUD, Гибридный Хронограф, Неоновая Вертикаль и Material You Expressive',
    '✨ РАСШИРЕННЫЙ ДИЗАЙН ЧАСОВ — настройка неонового свечения (Glow), скругления рамки часов, прозрачности подложки, акцентного цвета минут, жирности шрифта и мигающего разделителя',
    '🎨 СТУДИЯ СОЗДАНИЯ КАСТОМНЫХ ТЕМ 2.5 — живое интерактивное превью темы, выбор режима (Dark / AMOLED / Light), настройка цветовых каналов, радиуса скругления карточек, масштаба иконок и свечения при наведении',
    '🔐 ОБНОВЛЕННОЕ ШИФРОВАНИЕ ДАННЫХ 2.5 — деривация ключей PBKDF2-HMAC-SHA256 (100 000 итераций), контроль целостности HMAC-SHA256, ротация ключей и обратная совместимость с v2.4',
    '🔌 УЛУЧШЕННЫЙ APPLICATION & PLUGIN API 2.5 — шифрованное хранилище секретов для плагинов, хуки смены темы/часов (on_theme_changed, on_clock_style_changed) и диагностика безопасности',
    '📜 ПОЛНАЯ ИСТОРИЯ ОБНОВЛЕНИЙ — добавлен полный архив изменений всех версий программы с 1.0 по 2.5',
  ],
  '2.4': [
    '🚀 LAUNCHER HAB 2.4 — DARK SLATE PRO, LIVE SESSION TRACKER (С 0) И ANDROID 14 ЧАСЫ',
    '🎨 ИСПРАВЛЕНЫ ЦВЕТА И РАМКИ (#AARRGGBB) — убраны желтые полосы, внедрен графитовый стиль Midnight Slate',
    '🔐 ИСПРАВЛЕНО СОХРАНЕНИЕ И ШИФРОВАНИЕ НАСТРОЕК — валидный 32-байтовый ключ Fernet без потери данных',
    '⏱️ GAME & APP SESSION TRACKER С 0 — честный отсчет времени с 00:00 при запуске приложения и живой таймер на карточках',
    '🧩 ПЛАГИНЫ В СПИСКЕ ЗАПУСКА И МАГАЗИН РАСШИРЕНИЙ — скачивание, настройка, включение и удаление плагинов в 1 клик',
    '🕒 ВЕРТИКАЛЬНЫЕ ЧАСЫ ANDROID 14 — крупный вертикальный виджет часов (HH / MM) и 8 современных стилей',
    '🔊 ФОНОВЫЙ КОНТРОЛЛЕР СИСТЕМНОЙ ГРОМКОСТИ — плавная регулировка громкости в фоновом потоке',
  ],
  '2.3': [
    '🎨 УЛУЧШЕННЫЙ LIQUID GLASS ИНТЕРФЕЙС – переработанный стеклянный дизайн, плавные эффекты прозрачности и более современный внешний вид',
    '🖥 FLOATING HUD – новая плавающая панель с системной информацией и быстрым доступом к функциям',
    '🗑 ФИКСИРОВАННАЯ КОРЗИНА – корзина закреплена в правом нижнем углу интерфейса',
    '🔎 ИСТОРИЯ ПОИСКА – система поиска теперь сохраняет предыдущие запросы для более быстрого доступа',
    '💾 УЛУЧШЕННАЯ СИСТЕМА РЕЗЕРВНОГО КОПИРОВАНИЯ – стабильное сохранение и восстановление настроек и данных пользователя',
    '🕒 НОВЫЕ СТИЛИ ЧАСОВ – добавлены дополнительные варианты отображения времени и даты с кастомизацией цвета',
    '🎨 УЛУЧШЕННАЯ ПАНЕЛЬ НАСТРОЕК – более гармоничный дизайн и удобная навигация',
    '🔌 СИСТЕМА ПЛАГИНОВ – поддержка расширений LauncherHub для добавления новых возможностей',
    '🎯 FOCUS MODE PLUGIN – режим концентрации с Pomodoro таймером и минималистичным интерфейсом',
    '🌦 SMART WEATHER PLUGIN – отображение температуры, влажности и скорости ветра',
    '🎵 SMART MUSIC CONTROLLER – управление музыкой через встроенный мини-плеер',
    '📂 SMART FILE FINDER И IDEA NOTEBOOK – быстрый поиск файлов и встроенный блокнот для идей',
  ],
  '2.2': [
    '🚀 LAUNCHER HAB 2.2 - ОПТИМИЗАЦИЯ И КАСТОМИЗАЦИЯ',
    '⚡ ОПТИМИЗАЦИЯ ПРОИЗВОДИТЕЛЬНОСТИ - снижение потребления памяти на 25% и ускорение загрузки',
    '🎨 КАСТОМИЗАЦИЯ ВРЕМЕНИ И ДАТЫ - выбор шрифтов, размеров, цветов и форматов отображения',
    '💾 СИСТЕМА РЕЗЕРВНОГО КОПИРОВАНИЯ - автоматическое и ручное создание бэкапов настроек',
    '🔍 КЭШИРОВАНИЕ ПОИСКА - мгновенный поиск по приложениям с интеллектуальным кэшированием',
    '🎯 ВИРТУАЛИЗАЦИЯ СПИСКОВ - плавная работа с большими библиотеками приложений (1000+)',
    '🛠️ УЛУЧШЕННОЕ УПРАВЛЕНИЕ ПАМЯТЬЮ - автоматическая очистка неиспользуемых ресурсов',
    '📊 МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ - отслеживание использования CPU, памяти и кэша',
    '🔧 ГИБКИЕ НАСТРОЙКИ ПРОИЗВОДИТЕЛЬНОСТИ - индивидуальная настройка кэширования и виртуализации',
  ],
  '2.1': [
    '🚀 LAUNCHER HAB 2.1 - НОВЫЕ ВОЗМОЖНОСТИ И РАСШИРЕНИЯ',
    '🔌 СИСТЕМА ПЛАГИНОВ - поддержка сторонних расширений и модулей',
    '🔊 УПРАВЛЕНИЕ АУДИО - встроенный контроллер громкости с поддержкой всех ОС',
    '🎨 СОЗДАНИЕ ТЕМ - визуальный редактор пользовательских цветовых схем',
    '💫 РАСШИРЕННОЕ СТЕКЛО - тонкая настройка прозрачности стеклянного эффекта',
    '🏷️ СИСТЕМА ТЕГОВ - организация приложений с помощью пользовательских меток',
    '🔍 ПОИСК ПО ТЕГАМ - быстрая фильтрация приложений по категориям и тегам',
    '📊 ПРОДВИНУТЫЕ НАСТРОЙКИ - новые вкладки для управления всеми функциями',
    '🛠️ УЛУЧШЕННАЯ АРХИТЕКТУРА - модульная структура для легкого расширения',
    '🔒 БЕЗОПАСНОСТЬ ПЛАГИНОВ - изолированная среда выполнения стороннего кода',
    '🎯 АВТОМАТИЧЕСКОЕ ОБНАРУЖЕНИЕ - сканирование папки plugins при запуске',
  ],
  '2.0': [
    '🎉 КРУПНОЕ ОБНОВЛЕНИЕ LAUNCHER HAB 2.0!',
    '✨ Полностью переработанный дизайн с эффектом жидкого стекла (Glass Morphism)',
    '🎬 Плавные анимации в стиле Android с поддержкой кривых Безье',
    '🔐 Шифрование пользовательских данных с использованием алгоритма Fernet',
    '📡 Расширенный мониторинг системы: отслеживание Bluetooth, Wi-Fi и геолокации',
    '🎨 7 предустановленных цветовых тем (Темная, Светлая, Синяя, Зеленая, Фиолетовая, Оранжевая, Розовая)',
    '⚡ Настройка интенсивности стеклянного эффекта (Слабая, Средняя, Сильная)',
    '🔄 Улучшенная система фильтрации с диалоговым меню',
    '📱 Адаптивная сетка карточек приложений с эффектами наведения',
    '🔔 Интеллектуальная система уведомлений о действиях пользователя',
    '🛡️ Повышенная стабильность работы и обработка ошибок',
    '💾 Автоматическое сохранение всех настроек в зашифрованном виде',
  ],
  '1.9': [
    'Добавлен мониторинг системных ресурсов (CPU, память, батарея, сеть)',
    'Реализована система автоматического определения установленных приложений',
    'Улучшена производительность при работе с большими списками приложений',
    'Добавлена поддержка пользовательских путей к приложениям',
    'Исправлены ошибки при запуске веб-приложений',
  ],
  '1.8': [
    'Внедрена система избранных приложений (до 10 элементов)',
    'Добавлена панель быстрого доступа к часто используемым программам',
    'Реализовано контекстное меню для управления приложениями',
    'Улучшен поиск с поддержкой фильтрации по категориям',
    'Обновлен интерфейс боковой панели',
  ],
  '1.7': [
    'Добавлена возможность добавления собственных приложений и сайтов',
    'Реализован выбор иконок для пользовательских элементов',
    'Внедрена система категорий (Браузеры, Медиа, Музыка, Соцсети, Игры, Система, Офис)',
    'Улучшена навигация по категориям приложений',
    'Добавлены подсказки при наведении на элементы интерфейса',
  ],
  '1.6': [
    'Разработана базовая система тем оформления (Темная и Светлая)',
    'Добавлены часы и дата в заголовок приложения',
    'Реализовано автообновление времени каждую секунду',
    'Улучшена адаптивность интерфейса при изменении размера окна',
    'Исправлены проблемы с отображением кириллицы',
  ],
  '1.5': [
    'Добавлена функция поиска по приложениям в реальном времени',
    'Реализована фильтрация приложений по типам (Все, Приложения, Сайты, Система)',
    'Улучшена визуальная обратная связь при взаимодействии с элементами',
    'Оптимизирована загрузка иконок приложений',
    'Добавлена поддержка горячих клавиш',
  ],
  '1.4': [
    'Расширена база предустановленных приложений (более 30 программ)',
    'Добавлена проверка наличия приложений в системе',
    'Реализовано перенаправление на официальные сайты для неустановленных программ',
    'Улучшена обработка ошибок при запуске приложений',
    'Обновлен дизайн карточек приложений',
  ],
  '1.3': [
    'Добавлена поддержка запуска системных утилит Windows и Linux',
    'Реализована кроссплатформенная совместимость (Windows, Linux, macOS)',
    'Улучшена система определения путей к исполняемым файлам',
    'Добавлен индикатор загрузки при запуске тяжелых приложений',
    'Исправлены ошибки при работе в различных окружениях',
  ],
  '1.2': [
    'Внедрено сохранение настроек между сеансами работы',
    'Добавлено диалоговое окно настроек приложения',
    'Реализована возможность сброса избранного и пользовательских путей',
    'Улучшена структура хранения конфигурационных файлов',
    'Повышена общая стабильность приложения',
  ],
  '1.1': [
    'Добавлена боковая панель со списком всех приложений',
    'Реализовано разделение интерфейса на функциональные зоны',
    'Улучшено отображение статуса статуса установки приложений',
    'Добавлены базовые анимации при наведении курсора',
    'Исправлены мелкие визуальные недочеты',
  ],
  '1.0': [
    '🚀 Первый официальный релиз Launcher Hab!',
    'Базовый функционал запуска приложений и веб-сайтов',
    'Простой и понятный пользовательский интерфейс на базе Flet',
    'Поддержка основных браузеров и медиа-плееров',
    'Фундамент для будущих обновлений и расширений',
  ],
};

export function formatLiveClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function formatMonthBadge(minutes: number, elapsedSeconds = 0, isRunning = false): string {
  if (isRunning) {
    return `🟢 ${formatLiveClock(elapsedSeconds)}`;
  }
  const totalSec = Math.max(Math.round(minutes * 60), elapsedSeconds);
  if (totalSec <= 0) {
    return '0 мин';
  }
  if (totalSec < 60) {
    return `${totalSec} сек`;
  }
  const totalMinutes = totalSec / 60;
  const hours = totalMinutes / 60;
  if (hours >= 10) return `${Math.round(hours)} ч в мес`;
  if (hours >= 1) return `${hours.toFixed(1)} ч в мес`;
  return `${Math.max(1, Math.round(totalMinutes))} мин в мес`;
}

export function formatDurationRu(minutes: number, elapsedSeconds = 0): string {
  const totalSec = Math.max(Math.round(minutes * 60), elapsedSeconds);
  if (totalSec <= 0) return '0 мин';
  if (totalSec < 60) return `${totalSec} сек`;
  const totalMin = Math.floor(totalSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h} ч ${m} мин`;
  if (h > 0) return `${h} ч`;
  return `${m} мин`;
}
