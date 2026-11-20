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

export interface LiveDiskMetric {
  mount: string;
  label: string;
  used_gb: number;
  total_gb: number;
  free_gb: number;
  percent: number;
}

export interface LiveMediaSession {
  available: boolean;
  is_playing: boolean;
  title: string;
  artist: string;
  source_app: string;
  updated_at: number;
}

export interface LiveLocationInfo {
  detected: boolean;
  city: string;
  region: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
  ip: string;
  source: string;
}

export interface LiveSystemTelemetry {
  hostname: string;
  os_name: string;
  arch: string;
  cpu_model: string;
  cpu_cores: number;
  cpu_percent: number;
  gpu_name: string;
  gpu_percent: number;
  gpu_temp_c: number;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_percent: number;
  battery_present: boolean;
  battery_percent: number;
  battery_charging: boolean;
  net_down_mbps: number;
  net_up_mbps: number;
  disks: LiveDiskMetric[];
  media: LiveMediaSession;
  location: LiveLocationInfo;
  real_telemetry: boolean;
}

export const THEMES: Record<string, CustomThemeConfig> = {
  m3_expressive: {
    id: 'm3_expressive',
    name: 'Luma Expressive (Глубокий Индиго)',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 14% 12%, rgba(99, 102, 241, 0.24), transparent 42%), radial-gradient(circle at 86% 18%, rgba(168, 85, 247, 0.16), transparent 40%), radial-gradient(circle at 75% 85%, rgba(16, 185, 129, 0.12), transparent 45%), linear-gradient(155deg, #080b14 0%, #0d1222 52%, #11182c 100%)',
    surfaceRgba: 'rgba(18, 24, 42, 0.90)',
    cardHex: '#131a2d',
    accent: 'indigo',
    accentHex: '#6366f1',
  },
  dark: {
    id: 'dark',
    name: 'Luma Полночный Графит',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 16% 12%, rgba(59, 130, 246, 0.15), transparent 40%), radial-gradient(circle at 85% 82%, rgba(16, 185, 129, 0.08), transparent 45%), linear-gradient(155deg, #0a0e17 0%, #0d111b 55%, #111723 100%)',
    surfaceRgba: 'rgba(20, 26, 38, 0.90)',
    cardHex: '#151b26',
    accent: 'blue',
    accentHex: '#3b82f6',
  },
  amoled: {
    id: 'amoled',
    name: 'Luma Оникс (AMOLED)',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 20% 15%, rgba(16, 185, 129, 0.10), transparent 40%), linear-gradient(155deg, #04060a 0%, #070a10 60%, #0b0f17 100%)',
    surfaceRgba: 'rgba(12, 16, 23, 0.94)',
    cardHex: '#0d1118',
    accent: 'emerald',
    accentHex: '#10b981',
  },
  light: {
    id: 'light',
    name: 'Luma Светлый Кристалл',
    isDark: false,
    bgGradient:
      'radial-gradient(circle at 20% 15%, rgba(99, 102, 241, 0.14), transparent 45%), radial-gradient(circle at 80% 85%, rgba(14, 165, 233, 0.12), transparent 45%), linear-gradient(145deg, #eef2ff 0%, #f8fafc 60%, #e2e8f0 100%)',
    surfaceRgba: 'rgba(255, 255, 255, 0.88)',
    cardHex: '#ffffff',
    accent: 'indigo',
    accentHex: '#4f46e5',
  },
  purple: {
    id: 'purple',
    name: 'Luma Аметист Нео',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 22% 18%, rgba(168, 85, 247, 0.22), transparent 45%), radial-gradient(circle at 80% 78%, rgba(217, 70, 239, 0.14), transparent 45%), linear-gradient(145deg, #0f0b1d 0%, #17122b 55%, #120e24 100%)',
    surfaceRgba: 'rgba(26, 20, 48, 0.90)',
    cardHex: '#1a1430',
    accent: 'purple',
    accentHex: '#a855f7',
  },
  spring: {
    id: 'spring',
    name: 'Luma Весенний Кварц',
    isDark: false,
    bgGradient:
      'radial-gradient(circle at 22% 18%, rgba(236, 72, 153, 0.14), transparent 45%), radial-gradient(circle at 80% 78%, rgba(244, 114, 182, 0.12), transparent 45%), linear-gradient(145deg, #fff5f8 0%, #fce7f3 60%, #fbcfe8 100%)',
    surfaceRgba: 'rgba(255, 245, 250, 0.88)',
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
    label: 'Luma Вертикальный (HH / MM)',
    sample: '14 / 32',
    description: 'Крупный двухстрочный вертикальный циферблат с акцентом минут',
  },
  {
    id: 'stacked',
    label: 'Luma Двухэтажный Компакт',
    sample: '14 : 32',
    description: 'Компактные часы в два этажа с датой и днём недели сбоку',
  },
  {
    id: 'standard',
    label: 'Luma Классический',
    sample: '14:32:08',
    description: 'Чёткие цифровые часы с секундами и датой снизу',
  },
  {
    id: 'pill_glass',
    label: 'Luma Стеклянная Капсула',
    sample: '14:32 • Пн, 02.11',
    description: 'Выразительная капсула в одну строку с иконкой и датой',
  },
  {
    id: 'split_flip',
    label: 'Luma Перекидные Карточки',
    sample: '[14] [32] [08]',
    description: 'Часы, минуты и секунды на раздельных объемных карточках',
  },
  {
    id: 'cyber_mono',
    label: 'Luma Терминал Моно',
    sample: '[ 14 : 32 : 08 ]',
    description: 'Моноширинный технический стиль в квадратных скобках',
  },
  {
    id: 'minimal',
    label: 'Luma Чистый Минимал',
    sample: '14:32',
    description: 'Максимально лёгкое отображение времени без лишних рамок',
  },
  {
    id: 'compact_badge',
    label: 'Luma Бейдж Дня',
    sample: 'Пн • 14:32',
    description: 'Акцентная плашка дня недели рядом с текущим временем',
  },
  {
    id: 'nothing_dot',
    label: 'Luma Точечная Матрица',
    sample: '::14 · 32 · 08::',
    description: 'Индустриальный точечно-матричный стиль с мягким ритмом',
    isNew25: true,
  },
  {
    id: 'ios_standby',
    label: 'Luma Ночной Док (Aura)',
    sample: '14:32 AURA',
    description: 'Контрастные ночные часы для комфортного чтения в темноте',
    isNew25: true,
  },
  {
    id: 'samsung_oneui',
    label: 'Luma Дуо-Блок',
    sample: '14 / 32 DUO',
    description: 'Выразительный двойной блок с выделением минут цветом темы',
    isNew25: true,
  },
  {
    id: 'neon_synthwave',
    label: 'Luma Неон Волна',
    sample: '⚡ 14:32:08',
    description: 'Ретро-футуристичный циферблат с мягким неоновым ореолом',
    isNew25: true,
  },
  {
    id: 'retro_casio',
    label: 'Luma Кварц Ретро',
    sample: "LCD 14:32'08",
    description: 'Классический кварцевый ЖК-индикатор с миллиметровой точностью',
    isNew25: true,
  },
  {
    id: 'macos_sonoma',
    label: 'Luma Горизонт',
    sample: '14:32 Горизонт',
    description: 'Чистая воздушная типографика в стиле рабочего стола Luma',
    isNew25: true,
  },
  {
    id: 'futuristic_hud',
    label: 'Luma Тактический HUD',
    sample: 'SYS//14:32.08',
    description: 'Телеметрический циферблат ядра с системным префиксом',
    isNew25: true,
  },
  {
    id: 'analog_hybrid',
    label: 'Luma Хронограф',
    sample: '◔ 14:32:08',
    description: 'Сочетание символа хронографа и точного цифрового блока',
    isNew25: true,
  },
  {
    id: 'vertical_neon_bar',
    label: 'Luma Неоновая Вертикаль',
    sample: '14 ┃ 32',
    description: 'Вертикальная колонка с яркой акцентной линией сбоку',
    isNew25: true,
  },
  {
    id: 'material_expressive',
    label: 'Luma Скульпт Expressive',
    sample: '14 / 32 Luma',
    description: 'Фирменный выразительный стиль Luma OS 1.0.1 Material 3 Expressive',
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
  {
    id: 'discord',
    name: 'Discord',
    package: 'discord',
    category: 'Social',
    icon: 'MessageSquare',
    url: 'https://discord.com/app',
    type: 'app',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 120,
    detoxGroup: 'Соцсети и мессенджеры',
    isRunning: false,
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    package: 'code',
    category: 'Development',
    icon: 'Terminal',
    url: 'vscode://',
    type: 'app',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 360,
    detoxGroup: 'Работа',
    isRunning: false,
  },
  {
    id: 'github',
    name: 'GitHub Desktop',
    package: 'github',
    category: 'Development',
    icon: 'Globe',
    url: 'https://github.com/Tveexty/L_H-3.0',
    type: 'web',
    installed: true,
    favorite: false,
    monthMinutes: 0,
    weekMinutes: 0,
    todayMinutes: 0,
    elapsedSeconds: 0,
    dailyLimitMinutes: 360,
    detoxGroup: 'Работа',
    isRunning: false,
  },
  {
    id: 'notion',
    name: 'Notion Workspace',
    package: 'notion',
    category: 'Office',
    icon: 'FileText',
    url: 'https://notion.so',
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
    name: 'Luma Session Tracker',
    version: '1.0.1',
    author: 'Luma Core Team',
    category: 'Аналитика и Детокс',
    icon: 'BarChart3',
    description:
      'Отслеживает время с 00:00 в реальном времени после запуска каждого приложения или игры, выводит живой таймер на карточках и контролирует лимиты цифрового баланса.',
    enabled: true,
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnAppLaunched', 'OnTick', 'GetWidgetPayload'],
    showInLauncher: true,
    customIntervalSec: 1,
    notificationsEnabled: true,
  },
  {
    id: 'focus_mode_plugin',
    name: 'Luma Focus Flow (Помидор)',
    version: '1.0.1',
    author: 'Luma Core Team',
    category: 'Продуктивность',
    icon: 'Clock',
    description:
      'Режим глубокой концентрации с таймером на 25 минут и защитой от отвлекающих уведомлений.',
    enabled: true,
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnTick', 'GetWidgetPayload'],
    showInLauncher: true,
    customIntervalSec: 60,
    notificationsEnabled: true,
  },
  {
    id: 'smart_music_controller',
    name: 'Luma Media Controller',
    version: '1.0.1',
    author: 'Luma Core Team',
    category: 'Медиа',
    icon: 'Music',
    description: 'Нативный контроллер медиасессии Luma HAL: чтение текущего трека и переключение музыки в системе.',
    enabled: true,
    file: 'system_windows.go',
    hooks: ['OnInitialize', 'OnMediaControl', 'GetWidgetPayload'],
    showInLauncher: true,
    customIntervalSec: 3,
    notificationsEnabled: true,
  },
  {
    id: 'smart_weather_plugin',
    name: 'Luma Погода (Авто-регион)',
    version: '1.0.1',
    author: 'Luma Core Team',
    category: 'Виджеты',
    icon: 'Cloud',
    description: 'Автоопределение вашего региона и живой почасовой прогноз погоды Open-Meteo.',
    enabled: true,
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnLocationDetect', 'GetWidgetPayload'],
    showInLauncher: true,
    customIntervalSec: 300,
    notificationsEnabled: true,
  },
  {
    id: 'idea_notebook_plugin',
    name: 'Luma Notes (VFS AES-256)',
    version: '1.0.1',
    author: 'Luma Core Team',
    category: 'Утилиты',
    icon: 'FileText',
    description: 'Быстрые заметки и списки задач с шифрованием AES-256-GCM в виртуальной ФС ядра Luma Core.',
    enabled: true,
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnVfsSync', 'GetWidgetPayload'],
    showInLauncher: true,
    customIntervalSec: 60,
    notificationsEnabled: true,
  },
  {
    id: 'smart_file_finder',
    name: 'Luma Быстрый Поиск',
    version: '1.0.1',
    author: 'Luma Core Team',
    category: 'Система',
    icon: 'Search',
    description: 'Мгновенный поиск приложений, плагинов и локальных системных модулей ядра Luma.',
    enabled: true,
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnSearch', 'GetWidgetPayload'],
    showInLauncher: true,
    customIntervalSec: 60,
    notificationsEnabled: true,
  },
];

export const PLUGIN_CATALOG: CatalogPluginItem[] = [
  {
    id: 'system_cleaner_plugin',
    name: 'Luma Cleaner & RAM Optimizer',
    version: '1.0.1',
    author: 'Luma Store',
    category: 'Система',
    icon: 'Activity',
    description: 'Очистка временного кэша системы и оптимизация памяти процессов в 1 клик через Luma HAL.',
    file: 'system_windows.go',
    hooks: ['OnInitialize', 'GetWidgetPayload'],
  },
  {
    id: 'game_booster_plugin',
    name: 'Luma Game Booster Pro',
    version: '1.0.1',
    author: 'Luma Store',
    category: 'Игры',
    icon: 'Gamepad2',
    description: 'Повышение приоритета игровых процессов и контроль сетевой задержки перед запуском.',
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnTick', 'GetWidgetPayload'],
  },
  {
    id: 'quick_clipboard_plugin',
    name: 'Luma Clipboard Vault',
    version: '1.0.1',
    author: 'Luma Store',
    category: 'Продуктивность',
    icon: 'Copy',
    description: 'Защищённый менеджер буфера обмена с шифрованием истории в LumaGuard AES-256-GCM.',
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'GetWidgetPayload'],
  },
];

export const INITIAL_WORKSPACES: WorkspacePreset[] = [
  {
    id: 'gaming',
    name: 'Игровой режим Luma',
    hotkey: 'ctrl+shift+g',
    closeProcesses: ['chrome', 'browser', 'discord'],
    launchApps: ['steam', 'telegram'],
  },
  {
    id: 'dev',
    name: 'Режим разработчика Luma',
    hotkey: 'ctrl+shift+d',
    closeProcesses: [],
    launchApps: ['vscode', 'cmd', 'github'],
  },
  {
    id: 'focus',
    name: 'Фокус и Баланс',
    hotkey: 'ctrl+shift+f',
    closeProcesses: ['steam', 'vk', 'telegram', 'discord'],
    launchApps: ['notion', 'winword'],
  },
];

export interface IslandMediaPlayer {
  id: string;
  name: string;
  color: string;
  accent: string;
  track: string;
  artist: string;
  playlist?: { track: string; artist: string }[];
  trackIndex?: number;
}

export type IslandPlayerItem = IslandMediaPlayer;

export interface WindowsNotificationItem {
  id: string;
  app: string;
  title: string;
  message: string;
  time: string;
  icon: string;
  color?: string;
  unread: boolean;
  read?: boolean;
}

export type IslandNotificationItem = WindowsNotificationItem;

export const INITIAL_ISLAND_PLAYERS: IslandMediaPlayer[] = [
  {
    id: 'luma_system_media',
    name: 'Luma Media Hub (Системный поток)',
    color: '#6366f1',
    accent: '#6366f1',
    track: 'Ожидание активного медиапотока...',
    artist: 'Luma Audio Engine • Реальный контроль треков',
    trackIndex: 0,
    playlist: [
      { track: 'Synthwave Night Drive', artist: 'Luma Audio Session' },
      { track: 'Midnight City (Extended)', artist: 'M83 • Luma Stream' },
      { track: 'Nightcall', artist: 'Kavinsky • Outrun Mix' },
      { track: 'Resonance', artist: 'HOME • Ambient Synth' },
      { track: 'Memory Reboot', artist: 'VØJ & Narvent' },
    ],
  },
  {
    id: 'yandex_music',
    name: 'Яндекс Музыка',
    color: '#f59e0b',
    accent: '#f59e0b',
    track: 'Моя Волна • Поток',
    artist: 'Яндекс Музыка HQ',
    trackIndex: 0,
    playlist: [
      { track: 'Моя Волна • Поток', artist: 'Яндекс Музыка HQ' },
      { track: 'После полуночи', artist: 'Инди-Волна' },
      { track: 'Неоновый рассвет', artist: 'Электронный поток' },
      { track: 'Фокус и Код', artist: 'Lo-Fi Beats' },
    ],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    color: '#10b981',
    accent: '#10b981',
    track: 'Midnight City (Lo-Fi Mix)',
    artist: 'Spotify Connect',
    trackIndex: 0,
    playlist: [
      { track: 'Midnight City (Lo-Fi Mix)', artist: 'Spotify Connect' },
      { track: 'Blinding Lights (Instrumental)', artist: 'Synth Club' },
      { track: 'Veridis Quo', artist: 'Daft Punk' },
      { track: 'Instant Crush', artist: 'Daft Punk & Julian Casablancas' },
    ],
  },
  {
    id: 'vk_music',
    name: 'VK Музыка',
    color: '#60a5fa',
    accent: '#60a5fa',
    track: 'Ночной Плейлист',
    artist: 'VK Audio',
    trackIndex: 0,
    playlist: [
      { track: 'Ночной Плейлист', artist: 'VK Audio' },
      { track: 'Тёплый синт', artist: 'VK Mix' },
      { track: 'Пульс города', artist: 'VK Beats' },
    ],
  },
  {
    id: 'telegram_audio',
    name: 'Telegram Аудио',
    color: '#38bdf8',
    accent: '#38bdf8',
    track: 'Аудиопоток / Подкаст',
    artist: 'Telegram Плеер',
    trackIndex: 0,
    playlist: [
      { track: 'Аудиопоток / Подкаст', artist: 'Telegram Плеер' },
      { track: 'Tech Deep Dive #42', artist: 'Luma Podcast' },
      { track: 'Утренний брифинг', artist: 'Telegram Audio' },
    ],
  },
];

export const INITIAL_WINDOWS_NOTIFICATIONS: WindowsNotificationItem[] = [
  {
    id: 'luma_notif_1',
    app: 'Luma OS 1.0.1 • Патч первого дня',
    title: 'Обновление 1.0.1 активно — все службы в норме',
    message: 'Подключена реальная телеметрия ПК, авто-регион и погода, переключение системных треков и отключаемый Luma Island.',
    time: 'Сейчас',
    icon: '🚀',
    color: '#10b981',
    unread: true,
    read: false,
  },
  {
    id: 'luma_notif_2',
    app: 'LumaGuard Криптоядро 1.0.1',
    title: 'Контейнер AES-256-GCM + PBKDF2-SHA512 проверен',
    message: 'Угроз не обнаружено. Шина IPC 127.0.0.1:49215 защищена подписью HMAC-SHA256.',
    time: '1 мин назад',
    icon: '🛡️',
    color: '#6366f1',
    unread: true,
    read: false,
  },
  {
    id: 'luma_notif_3',
    app: 'Оболочка Luma Shell (2 Окна)',
    title: 'Окно 1 (По группам) и Окно 2 (Матрица 20×30) синхронизированы',
    message: '18 фирменных виджетов Luma Pulse, Luma Aura и Luma Core готовы к работе.',
    time: '2 мин назад',
    icon: '🪟',
    color: '#a855f7',
    unread: true,
    read: false,
  },
];

export const PYTHON_PROJECT_FILES: { path: string; title: string; badge: string; summary: string }[] = [
  {
    path: 'luma_kernel_main.go',
    title: 'luma_kernel_main.go (Ядро Luma OS 1.0.1)',
    badge: 'LUMA CORE 1.0.1',
    summary:
      'Главный модуль ядра LumaOS_1.0.1.exe: TCP JSON-RPC 2.0 (127.0.0.1:49215), HTTP IPC (49216), реальная телеметрия, медиа-управление, авто-регион, шифрованная VFS AES-256-GCM и автозапуск 2 окон.',
  },
  {
    path: 'system_windows.go',
    title: 'system_windows.go (Нативный HAL & Медиа-мост)',
    badge: 'HAL NATIVE',
    summary:
      'Нативный сбор реальных ресурсов CPU/RAM/Дисков/Батареи/Сети, чтение текущего играющего трека из системной медиасессии, переключение треков и регулировка системной громкости.',
  },
  {
    path: 'system_unix.go',
    title: 'system_unix.go (POSIX HAL & Телеметрия)',
    badge: 'HAL POSIX',
    summary:
      'Кроссплатформенный сбор реальных показателей CPU, RAM, томов дисков, сетевого трафика и MPRIS-медиасессии.',
  },
  {
    path: 'system_types.go',
    title: 'system_types.go (Контракты телеметрии Luma)',
    badge: 'TYPES 1.0.1',
    summary:
      'Структуры данных реальных ресурсов, дисков, медиасессии и геолокации ядра Luma Core 1.0.1.',
  },
  {
    path: 'src/components/LumaGrid20x30Window.tsx',
    title: 'src/components/LumaGrid20x30Window.tsx',
    badge: 'ОКНО 2 (20×30)',
    summary:
      'Второе окно Luma OS 1.0.1: координатная матрица 20×30 (600 ячеек), конструктор позиций и 18 живых виджетов линеек Luma Pulse, Luma Aura и Luma Core.',
  },
  {
    path: 'Luma_Core/luma_core.py',
    title: 'Luma_Core/luma_core.py (Резервный демон)',
    badge: 'PYTHON CORE',
    summary:
      'Резервный кроссплатформенный фоновый демон ядра Luma Core с JSON-RPC 2.0 и трекингом процессов.',
  },
  {
    path: 'LauncherHab3.0_CSharp/LumaCore/LumaSystemKernel.cs',
    title: 'LumaCore/LumaSystemKernel.cs',
    badge: 'C# KERNEL',
    summary:
      'Эталонная реализация ядра Luma Core на C# (.NET 8) с VFS и шифрованным реестром.',
  },
  {
    path: 'LauncherHab3.0_CSharp/LumaCore/SecurityKernel.cs',
    title: 'LumaCore/SecurityKernel.cs',
    badge: 'LUMAGUARD',
    summary:
      'Модуль криптозащиты LumaGuard: AES-256-GCM, PBKDF2-HMAC-SHA512 и подпись пакетов HMAC-SHA256.',
  },
];

// Полная история версий (с акцентом на Патч первого дня 1.0.1)
export const VERSION_HISTORY: Record<string, string[]> = {
  '1.0.1': [
    '🩹 ПАТЧ ПЕРВОГО ДНЯ — LUMA OS 1.0.1: ПОЛНОСТЬЮ РАБОЧИЕ МЕДИА, РЕАЛЬНАЯ ТЕЛЕМЕТРИЯ СИСТЕМЫ, АВТО-РЕГИОН И ПОГОДА, ОТКЛЮЧАЕМЫЙ LUMA ISLAND, ФИРМЕННЫЙ БРЕНДИНГ И ИСПРАВЛЕНИЕ 12 БАГОВ',
    '🎵 РЕАЛЬНОЕ ПЕРЕКЛЮЧЕНИЕ ТРЕКОВ И ОПРЕДЕЛЕНИЕ ИГРАЮЩЕЙ МУЗЫКИ — ядро Luma Core 1.0.1 читает реальный активный трек и исполнителя в вашей системе и отправляет реальные системные медиа-команды (Следующий / Предыдущий / Пауза-Воспроизведение) и реальную громкость через /api/kernel/media и /api/kernel/audio',
    '🏝️ ПОЛНОЕ ОТКЛЮЧЕНИЕ ДИНАМИЧЕСКОГО ОСТРОВА (LUMA ISLAND) — добавлен переключатель в Быстрых настройках, Настройках Luma Island, самом окне острова и виджете Быстрого управления Окна 2 с мгновенной синхронизацией между окнами',
    '💻 100% РЕАЛЬНЫЙ ПРОСМОТР ВАШЕЙ СИСТЕМЫ — точные реальные показания процессора (модель и % загрузки), ОЗУ (использовано/всего ГБ), всех дисков (реальный объём и заполнение), батареи и зарядки, а также реальной скорости сети (Мбит/с) без случайных заглушек',
    '🌍 АВТООПРЕДЕЛЕНИЕ ВАШЕГО РЕГИОНА И ПОГОДЫ — ядро автоматически определяет ваш город, регион, страну, часовой пояс и подгружает живую погоду Open-Meteo именно для вашего региона (с возможностью 1 кликом обновить регион или выбрать любой город)',
    '✨ 100% ФИРМЕННЫЙ БРЕНДИНГ LUMA OS — убраны все сторонние названия ОС и брендов; 18 виджетов переведены в 3 авторские линейки: Luma Pulse, Luma Aura и Luma Core; обновлены все 18 циферблатов, темы и дизайн в стиле Material 3 Expressive',
    '🛠️ ИСПРАВЛЕНО 12 НАЙДЕННЫХ БАГОВ — устранён перезапуск 1-секундного таймера виджетов, убраны эхо-штормы BroadcastChannel, исправлена контрастность светлой темы, исправлен конфликт ПКМ на карточках с «ПКМ = Назад», подключены реальные Корзина/Блокировка/Сон, добавлено закрытие модалок по клавише Escape и выпущен обновлённый LumaOS_1.0.1.exe',
  ],
  '1.0': [
    '🚀 LUMA OS 1.0 — ПЕРВЫЙ ОФИЦИАЛЬНЫЙ РЕЛИЗ ЯДРА LUMA CORE И ДВУХОКОННОЙ ОБОЛОЧКИ MATERIAL 3 EXPRESSIVE',
    '🧠 АРХИТЕКТУРА ЯДРА LUMA CORE 1.0 — уровни Luma HAL, Activity & Process Manager, JSON-RPC 2.0 IPC (127.0.0.1:49215), шифрованная VFS и криптоядро LumaGuard (AES-256-GCM + PBKDF2-HMAC-SHA512 + HMAC-SHA256)',
    '🪟 ОКНО 1 (БИБЛИОТЕКА ПО ГРУППАМ) — боковая панель навигации с живым поиском и фильтрами + рабочая область с категориями и трекером сессий с 00:00',
    '📐 ОКНО 2 (МАТРИЦА 20×30 — 600 КООРДИНАТНЫХ ЯЧЕЕК) — точная сетка 20×30 / 30×20 с координатами [X, Y], конструктором расстановки, папками и 18 интерактивными виджетами',
    '🎨 18 ЦИФЕРБЛАТОВ И СТУДИЯ ТЕМ LUMA — живое превью, адаптивный режим День/Ночь по расписанию и эффект жидкого стекла',
  ],
  '0.9-rc': [
    '🧪 LUMA OS 0.9 RELEASE CANDIDATE — ИНТЕРАКТИВНЫЙ LUMA ISLAND, БЫСТРЫЕ ПЛИТКИ И ПЛАГИНЫ',
    '🏝️ МОДУЛЬ LUMA ISLAND — интерактивная верхняя капсула с часами, зарядом, медиа-пультом, уведомлениями, таймером и секундомером',
    '🧩 ДВИЖОК РАСШИРЕНИЙ LUMA PLUGIN API — изолированный запуск плагинов, магазин расширений и шифрованное хранилище секретов',
    '🖱️ НАВИГАЦИЯ ОДНОЙ РУКОЙ (ПКМ «НАЗАД») — мгновенный возврат и сброс фильтров правой кнопкой мыши',
  ],
  '0.8-beta': [
    '⚙️ LUMA CORE 0.8 BETA — ФОНОВЫЙ ДЕМОН IPC И СИСТЕМА ТЕЛЕМЕТРИИ',
    '📡 ДВУХСТОРОННЯЯ ШИНА IPC (TCP 49215 + HTTP 49216) — стабильный обмен JSON-RPC 2.0 между графическими окнами и фоновым ядром',
    '🔐 КРИПТОЯДРО LUMAGUARD — деривация ключей PBKDF2-HMAC-SHA512, шифрование AES-256-GCM и проверка целостности HMAC-SHA256',
    '⏱️ LIVE SESSION TRACKER — учёт времени в приложениях с 00:00 и лимиты цифрового баланса',
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
