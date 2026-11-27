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
  description?: string;
  isDark: boolean;
  bgGradient: string;
  surfaceRgba: string;
  surfaceRgb?: string;
  cardRgb?: string;
  barRgb?: string;
  cardHex: string;
  accent: string;
  accentHex: string;
  accentHoverHex?: string;
  custom?: boolean;
}

export interface HostWindowInfo {
  pid: number;
  hwnd?: number;
  name: string;
  friendly_name?: string;
  title: string;
  mem_mb: number;
  exe_path?: string;
  icon_url?: string;
  is_self?: boolean;
  mru?: number;
  topmost?: boolean;
}

export interface HostProcessInfo {
  pid: number;
  name: string;
  friendly_name?: string;
  title?: string;
  description?: string;
  category?: 'app' | 'background' | 'system';
  has_window: boolean;
  status: string;
  cpu_pct: number;
  mem_mb: number;
  private_mb?: number;
  threads?: number;
  exe_path?: string;
  is_self?: boolean;
}

export interface AppItem {
  id: string;
  name: string;
  package: string;
  category: string;
  icon: string;
  iconUrl?: string;
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
  sizeMb?: number;
  installedAt?: string;
  version?: string;
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
  apiVersion?: string;
  author?: string;
  category?: string;
  icon?: string;
  description: string;
  enabled: boolean;
  file: string;
  hooks: string[];
  permissions?: string[];
  actionId?: string;
  showInLauncher?: boolean;
  customIntervalSec?: number;
  notificationsEnabled?: boolean;
}

export interface CatalogPluginItem {
  id: string;
  name: string;
  version: string;
  apiVersion?: string;
  author: string;
  category: string;
  icon: string;
  description: string;
  file: string;
  hooks: string[];
  permissions?: string[];
  actionId?: string;
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

export interface LiveMediaSessionItem {
  id: string;
  source_app: string;
  display_name: string;
  title: string;
  artist: string;
  is_playing: boolean;
  is_current: boolean;
  position_sec?: number;
  duration_sec?: number;
}

export interface LiveMediaSession {
  available: boolean;
  is_playing: boolean;
  title: string;
  artist: string;
  source_app: string;
  updated_at: number;
  sessions?: LiveMediaSessionItem[];
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
  device_model?: string;
  manufacturer?: string;
  kernel_engine_version?: string;
  os_name: string;
  arch: string;
  cpu_model: string;
  cpu_cores: number;
  cpu_percent: number;
  gpu_name: string;
  gpu_percent: number;
  gpu_vram_used_mb?: number;
  gpu_vram_total_mb?: number;
  gpu_vram_percent?: number;
  gpu_source?: string;
  gpu_temp_c: number;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_percent: number;
  battery_present: boolean;
  battery_percent: number;
  battery_charging: boolean;
  net_down_mbps: number;
  net_up_mbps: number;
  active_kbd_tag?: string;
  active_kbd_short?: string;
  disks: LiveDiskMetric[];
  media: LiveMediaSession;
  location: LiveLocationInfo;
  real_telemetry: boolean;
}

export const THEMES: Record<string, CustomThemeConfig> = {
  nothing_mono: {
    id: 'nothing_mono',
    name: 'Luma Carbon',
    description: 'Графитовый монохром, глубокий чёрный и сигнальный красный',
    isDark: true,
    bgGradient:
      'radial-gradient(ellipse 75% 55% at 15% 10%, rgba(225, 29, 42, 0.08), transparent 55%), linear-gradient(160deg, #09090c 0%, #0e0e13 55%, #0a0a0d 100%)',
    surfaceRgba: 'rgba(18, 18, 22, 0.92)',
    surfaceRgb: '18, 18, 22',
    cardRgb: '23, 23, 28',
    barRgb: '12, 12, 16',
    cardHex: '#151519',
    accent: 'red',
    accentHex: '#e11d2a',
    accentHoverHex: '#be1420',
  },
  nothing_paper: {
    id: 'nothing_paper',
    name: 'Luma Paper',
    description: 'Спокойная матовая бумага без слепящего белого и тёплый камень',
    isDark: false,
    bgGradient:
      'radial-gradient(ellipse 70% 55% at 85% 15%, rgba(200, 30, 40, 0.06), transparent 55%), linear-gradient(155deg, #dadad3 0%, #d1d1c9 55%, #c8c8bf 100%)',
    surfaceRgba: 'rgba(230, 230, 223, 0.92)',
    surfaceRgb: '230, 230, 223',
    cardRgb: '236, 236, 230',
    barRgb: '220, 220, 213',
    cardHex: '#e4e4dc',
    accent: 'red',
    accentHex: '#c81e28',
    accentHoverHex: '#a5161f',
  },
  m3_expressive: {
    id: 'm3_expressive',
    name: 'Luma Indigo Depth',
    description: 'Глубокий вечерний индиго с мягким кобальтовым стеклом',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 14% 12%, rgba(99, 102, 241, 0.24), transparent 44%), radial-gradient(circle at 86% 84%, rgba(56, 189, 248, 0.14), transparent 46%), linear-gradient(155deg, #090d1b 0%, #101730 55%, #0d1327 100%)',
    surfaceRgba: 'rgba(19, 26, 48, 0.90)',
    surfaceRgb: '19, 26, 48',
    cardRgb: '24, 33, 60',
    barRgb: '13, 18, 34',
    cardHex: '#18213c',
    accent: 'indigo',
    accentHex: '#6366f1',
    accentHoverHex: '#4f46e5',
  },
  dark: {
    id: 'dark',
    name: 'Luma Nordic Slate',
    description: 'Скандинавский сине-графитовый фон и ледяной голубой акцент',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 18% 14%, rgba(56, 189, 248, 0.16), transparent 44%), radial-gradient(circle at 84% 82%, rgba(59, 130, 246, 0.12), transparent 46%), linear-gradient(155deg, #0b111c 0%, #111a29 55%, #0e1624 100%)',
    surfaceRgba: 'rgba(20, 29, 44, 0.90)',
    surfaceRgb: '20, 29, 44',
    cardRgb: '25, 36, 54',
    barRgb: '13, 20, 31',
    cardHex: '#192436',
    accent: 'blue',
    accentHex: '#38bdf8',
    accentHoverHex: '#0ea5e9',
  },
  amoled: {
    id: 'amoled',
    name: 'Luma Pure Obsidian',
    description: 'Истинный OLED-чёрный с благородным изумрудным акцентом',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 20% 15%, rgba(16, 185, 129, 0.12), transparent 42%), linear-gradient(160deg, #020305 0%, #05080d 60%, #030508 100%)',
    surfaceRgba: 'rgba(11, 15, 20, 0.94)',
    surfaceRgb: '11, 15, 20',
    cardRgb: '15, 21, 27',
    barRgb: '6, 9, 12',
    cardHex: '#0f151b',
    accent: 'emerald',
    accentHex: '#10b981',
    accentHoverHex: '#059669',
  },
  light: {
    id: 'light',
    name: 'Luma Mist Stone',
    description: 'Прохладный дымчато-серый камень и глубокий кобальт',
    isDark: false,
    bgGradient:
      'radial-gradient(circle at 18% 14%, rgba(37, 99, 235, 0.11), transparent 46%), radial-gradient(circle at 82% 86%, rgba(14, 165, 233, 0.09), transparent 46%), linear-gradient(150deg, #d2d9e4 0%, #c8d1df 55%, #bec9d9 100%)',
    surfaceRgba: 'rgba(222, 228, 237, 0.92)',
    surfaceRgb: '222, 228, 237',
    cardRgb: '229, 234, 242',
    barRgb: '211, 218, 229',
    cardHex: '#dde3ec',
    accent: 'indigo',
    accentHex: '#2563eb',
    accentHoverHex: '#1d4ed8',
  },
  purple: {
    id: 'purple',
    name: 'Luma Velvet Amethyst',
    description: 'Глубокий аметистовый бархат и мягкое фиолетовое свечение',
    isDark: true,
    bgGradient:
      'radial-gradient(circle at 20% 16%, rgba(168, 85, 247, 0.24), transparent 46%), radial-gradient(circle at 82% 80%, rgba(232, 121, 249, 0.14), transparent 46%), linear-gradient(150deg, #0f0a1e 0%, #191132 55%, #120c26 100%)',
    surfaceRgba: 'rgba(27, 19, 50, 0.90)',
    surfaceRgb: '27, 19, 50',
    cardRgb: '34, 24, 62',
    barRgb: '18, 13, 34',
    cardHex: '#22183e',
    accent: 'purple',
    accentHex: '#a855f7',
    accentHoverHex: '#9333ea',
  },
  spring: {
    id: 'spring',
    name: 'Luma Rose Quartz',
    description: 'Приглушённый пыльно-розовый кварц и ягодный акцент без бликов',
    isDark: false,
    bgGradient:
      'radial-gradient(circle at 20% 16%, rgba(190, 24, 93, 0.11), transparent 46%), radial-gradient(circle at 82% 84%, rgba(219, 39, 119, 0.08), transparent 46%), linear-gradient(150deg, #dfd2d6 0%, #d6c6cb 55%, #ccb9bf 100%)',
    surfaceRgba: 'rgba(233, 223, 226, 0.92)',
    surfaceRgb: '233, 223, 226',
    cardRgb: '238, 230, 232',
    barRgb: '223, 211, 215',
    cardHex: '#e6dade',
    accent: 'pink',
    accentHex: '#be185d',
    accentHoverHex: '#9d174d',
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
    iconUrl: '/api/kernel/app-icon?name=steam',
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
    iconUrl: '/api/kernel/app-icon?name=chrome',
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
    iconUrl: '/api/kernel/app-icon?name=telegram',
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
    iconUrl: '/api/kernel/app-icon?name=vlc',
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
    iconUrl: '/api/kernel/app-icon?name=firefox',
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
    iconUrl: '/api/kernel/app-icon?name=calc',
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
    iconUrl: '/api/kernel/app-icon?name=explorer',
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
    iconUrl: '/api/kernel/app-icon?name=taskmgr',
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
    iconUrl: '/api/kernel/app-icon?name=cmd',
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
    iconUrl: '/api/kernel/app-icon?name=winword',
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
    iconUrl: '/api/kernel/app-icon?name=discord',
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
    iconUrl: '/api/kernel/app-icon?name=code',
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
    iconUrl: '/api/kernel/app-icon?name=github',
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
    iconUrl: '/api/kernel/app-icon?name=notion',
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
  {
    id: 'msedge',
    name: 'Microsoft Edge',
    package: 'msedge',
    category: 'Browser',
    icon: 'Globe',
    iconUrl: '/api/kernel/app-icon?name=msedge',
    url: 'msedge',
    type: 'system',
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
    id: 'notepad',
    name: 'Блокнот',
    package: 'notepad',
    category: 'System',
    icon: 'FileText',
    iconUrl: '/api/kernel/app-icon?name=notepad',
    url: 'notepad',
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
    id: 'mspaint',
    name: 'Paint',
    package: 'mspaint',
    category: 'System',
    icon: 'Image',
    iconUrl: '/api/kernel/app-icon?name=mspaint',
    url: 'mspaint',
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
    id: 'powershell',
    name: 'PowerShell',
    package: 'powershell',
    category: 'System',
    icon: 'Terminal',
    iconUrl: '/api/kernel/app-icon?name=powershell',
    url: 'powershell',
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
    name: 'Luma Session Tracker 2.0',
    version: '2.0.1',
    apiVersion: '2.0',
    author: 'Luma Core Team',
    category: 'Аналитика и Детокс',
    icon: 'BarChart3',
    description:
      'Учёт времени с 00:00 для приложений, живой снимок телеметрии ядра и контроль лимитов цифрового баланса.',
    enabled: true,
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnAppLaunched', 'OnTick', 'OnKernelAPIv2'],
    permissions: ['sys.telemetry', 'ui.badge'],
    actionId: 'sys.snapshot',
    showInLauncher: true,
    customIntervalSec: 1,
    notificationsEnabled: true,
  },
  {
    id: 'focus_mode_plugin',
    name: 'Luma Focus Flow 2.0 (Помидор)',
    version: '2.0.1',
    apiVersion: '2.0',
    author: 'Luma Core Team',
    category: 'Продуктивность',
    icon: 'Clock',
    description:
      'Режим глубокой концентрации с таймером Помидор, приглушением уведомлений и мгновенным переключением в фокус.',
    enabled: true,
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnFocusToggle', 'OnKernelAPIv2'],
    permissions: ['notifications.dnd', 'ui.island'],
    actionId: 'focus.enable',
    showInLauncher: true,
    customIntervalSec: 60,
    notificationsEnabled: true,
  },
  {
    id: 'smart_music_controller',
    name: 'Luma Media Controller 2.0',
    version: '2.0.0',
    apiVersion: '2.0',
    author: 'Luma Core Team',
    category: 'Медиа',
    icon: 'Music',
    description: 'Нативный контроллер медиасессии Luma HAL: чтение текущего трека, переключение музыки и буфер аудио.',
    enabled: true,
    file: 'system_windows.go',
    hooks: ['OnInitialize', 'OnMediaControl', 'OnKernelAPIv2'],
    permissions: ['media.control', 'audio.volume'],
    actionId: 'sys.snapshot',
    showInLauncher: true,
    customIntervalSec: 3,
    notificationsEnabled: true,
  },
  {
    id: 'battery_guard_plugin',
    name: 'Luma Battery Health Guard',
    version: '2.0.0',
    apiVersion: '2.0',
    author: 'Luma Core Team',
    category: 'Питание',
    icon: 'Activity',
    description: 'Прямой опрос Win32_Battery, ACPI WMI и BatteryReport XML: проверка износа, циклов и состояния зарядки.',
    enabled: true,
    file: 'system_windows.go',
    hooks: ['OnInitialize', 'OnPowerChange', 'OnKernelAPIv2'],
    permissions: ['power.read', 'battery.wmi'],
    actionId: 'battery.health',
    showInLauncher: true,
    customIntervalSec: 30,
    notificationsEnabled: true,
  },
  {
    id: 'shield_audit_plugin',
    name: 'LumaShield 1.2 Live Auditor',
    version: '2.0.0',
    apiVersion: '2.0',
    author: 'Luma Security',
    category: 'Безопасность',
    icon: 'Shield',
    description: 'Мгновенная проверка статуса ядра LumaShield, журнала аудита, карантина и совместимости с Windows Defender.',
    enabled: true,
    file: 'kernel_security.go',
    hooks: ['OnInitialize', 'OnSecurityAudit', 'OnKernelAPIv2'],
    permissions: ['security.read', 'audit.log'],
    actionId: 'shield.audit',
    showInLauncher: true,
    customIntervalSec: 60,
    notificationsEnabled: true,
  },
  {
    id: 'idea_notebook_plugin',
    name: 'Luma Notes & Clipboard Sync',
    version: '2.0.0',
    apiVersion: '2.0',
    author: 'Luma Core Team',
    category: 'Утилиты',
    icon: 'FileText',
    description: 'Быстрые заметки AES-256-GCM и живая проверка системного буфера обмена Windows через API v2.0.',
    enabled: true,
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnVfsSync', 'OnClipboard', 'OnKernelAPIv2'],
    permissions: ['vfs.crypto', 'clipboard.read'],
    actionId: 'clipboard.stats',
    showInLauncher: true,
    customIntervalSec: 60,
    notificationsEnabled: true,
  },
];

export const PLUGIN_CATALOG: CatalogPluginItem[] = [
  {
    id: 'system_cleaner_plugin',
    name: 'Luma Cleaner & Temp Sweeper',
    version: '2.0.2',
    apiVersion: '2.0',
    author: 'Luma Store',
    category: 'Система',
    icon: 'Activity',
    description: 'Безопасная очистка устаревших файлов из системного каталога Temp в 1 клик через Plugin API v2.0.',
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnTempClean', 'OnKernelAPIv2'],
    permissions: ['fs.temp', 'storage.clean'],
    actionId: 'temp.clean',
  },
  {
    id: 'ram_optimizer_plugin',
    name: 'Luma RAM & GC Optimizer',
    version: '2.0.1',
    apiVersion: '2.0',
    author: 'Luma Store',
    category: 'Система',
    icon: 'Cpu',
    description: 'Мгновенная сборка мусора ядра LumaCore, сброс кэша и отчёт о свободной оперативной памяти.',
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnMemoryTrim', 'OnKernelAPIv2'],
    permissions: ['memory.gc', 'sys.telemetry'],
    actionId: 'ram.optimize',
  },
  {
    id: 'game_booster_plugin',
    name: 'Luma GPU & Game Booster Pro',
    version: '2.0.1',
    apiVersion: '2.0',
    author: 'Luma Store',
    category: 'Игры',
    icon: 'Gamepad2',
    description: 'Переключение плана питания на максимальную производительность и снижение задержек графического конвейера.',
    file: 'system_windows.go',
    hooks: ['OnInitialize', 'OnGpuBoost', 'OnKernelAPIv2'],
    permissions: ['power.plan', 'gpu.profile'],
    actionId: 'gpu.boost',
  },
  {
    id: 'net_latency_guard_plugin',
    name: 'Luma NetPing Monitor',
    version: '2.0.0',
    apiVersion: '2.0',
    author: 'Luma Store',
    category: 'Сеть',
    icon: 'Globe',
    description: 'Живая проверка задержки (TCP ping) до Cloudflare 1.1.1.1 и диагностика стабильности канала связи.',
    file: 'luma_kernel_main.go',
    hooks: ['OnInitialize', 'OnNetProbe', 'OnKernelAPIv2'],
    permissions: ['net.ping'],
    actionId: 'net.ping',
  },
  {
    id: 'github_ota_watcher_plugin',
    name: 'Luma GitHub OTA Watcher',
    version: '2.0.0',
    apiVersion: '2.0',
    author: 'Luma Store',
    category: 'Обновления',
    icon: 'Search',
    description: 'Моментальная проверка новых версий Luma OS на GitHub с определением типа обновления (Глобальное / Версия / Патч).',
    file: 'kernel_updater_ai.go',
    hooks: ['OnInitialize', 'OnDailyUpdateCheck', 'OnKernelAPIv2'],
    permissions: ['net.github', 'ota.check'],
    actionId: 'update.check',
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
    app: 'Luma OS 1.0.2 • Flagship Edition',
    title: 'Обновление 1.0.2 активно — интерфейс и ядро ускорены',
    message: 'Новая двухъярусная шапка без наложений, командная палитра Luma Spotlight (Ctrl+K), встроенный медиа-пульт на Luma Island и обновлённый дизайн M3 Expressive.',
    time: 'Сейчас',
    icon: '🚀',
    color: '#10b981',
    unread: true,
    read: false,
  },
  {
    id: 'luma_notif_2',
    app: 'LumaGuard Криптоядро 1.0.2',
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
    title: 'luma_kernel_main.go (Ядро Luma OS 1.0.2)',
    badge: 'LUMA CORE 1.0.2',
    summary:
      'Главный модуль ядра LumaOS_1.0.2.exe: TCP JSON-RPC 2.0 (127.0.0.1:49215), HTTP IPC (49216), реальная телеметрия, медиа-управление, авто-регион, шифрованная VFS AES-256-GCM и автозапуск 2 окон.',
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
    badge: 'TYPES 1.0.2',
    summary:
      'Структуры данных реальных ресурсов, дисков, медиасессии и геолокации ядра Luma Core 1.0.2.',
  },
  {
    path: 'src/components/LumaGrid20x30Window.tsx',
    title: 'src/components/LumaGrid20x30Window.tsx',
    badge: 'ОКНО 2 (20×30)',
    summary:
      'Второе окно Luma OS 1.0.2: координатная матрица 20×30 (600 ячеек), конструктор позиций и 18 живых виджетов линеек Luma Pulse, Luma Aura и Luma Core.',
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
    path: 'kernel_security.go',
    title: 'kernel_security.go (LumaShield 1.2)',
    badge: 'SECURITY 1.2',
    summary:
      'Ядро безопасности LumaShield 1.2: локальный user-space антивирус без конфликтов с Windows Defender, эвристика, EICAR, карантин и аудит.',
  },
  {
    path: 'kernel_persistence_battery.go',
    title: 'kernel_persistence_battery.go (Eternal Sync & Battery)',
    badge: 'CORE 1.2',
    summary:
      'Вечное сохранение виджетов, папок и настроек на диск (%APPDATA%/LumaOS/luma_permanent_state.json + .bak) и трекер батареи 24ч + экранного времени 7д.',
  },
  {
    path: 'kernel_ai_local.go',
    title: 'kernel_ai_local.go (LumaNano 1.2 Offline AI)',
    badge: 'OFFLINE AI',
    summary:
      'Встроенный автономный ИИ-движок LumaNano 1.2 без API-ключей: живая диагностика ПК, генерация лёгкого кода (Python/JS/Go/HTML/SQL/PS), математика, SHA-256 и пароли.',
  },
  {
    path: 'kernel_updater_ai.go',
    title: 'kernel_updater_ai.go (Updater + AI + FX)',
    badge: 'OTA & AI',
    summary:
      'Проверка релизов и бесшовное обновление через GitHub с прогресс-баром, шлюз нейросетей (LumaNano/Gemini/OpenAI/Claude/Ollama) и живые курсы валют.',
  },
  {
    path: 'LauncherHab3.0_CSharp/LumaCore/SecurityKernel.cs',
    title: 'LumaCore/SecurityKernel.cs',
    badge: 'LUMAGUARD',
    summary:
      'Модуль криптозащиты LumaGuard: AES-256-GCM, PBKDF2-HMAC-SHA512 и подпись пакетов HMAC-SHA256.',
  },
];

export interface WirelessBatteryInfo {
  name: string;
  device_type: 'mouse' | 'keyboard' | 'headphones' | 'gamepad' | 'watch' | 'phone' | 'other' | string;
  battery_percent: number;
  connected: boolean;
  transport: string;
  source: string;
  vendor_id?: string;
  product_id?: string;
  manufacturer?: string;
  is_mouse?: boolean;
}

export interface AudioEndpointInfo {
  id: string;
  name: string;
  kind: 'output' | 'input';
  is_default: boolean;
  status: string;
  form_factor: string;
}

export interface AudioDevicesInfo {
  ok: boolean;
  outputs: AudioEndpointInfo[];
  inputs: AudioEndpointInfo[];
  active_output_id: string;
  active_input_id: string;
}

export interface KeyboardLayoutEntry {
  tag: string;
  short: string;
  name: string;
  native_name: string;
  hkl?: string;
  active: boolean;
}

export interface KeyboardLayoutsInfo {
  ok: boolean;
  active_tag: string;
  active: KeyboardLayoutEntry;
  installed: KeyboardLayoutEntry[];
}

export interface InstalledAppInfo {
  id: string;
  name: string;
  exec_path: string;
  publisher?: string;
  category: string;
  source: string;
  icon_hint: string;
  icon_url?: string;
}

export interface ActiveTcpConnectionInfo {
  local_addr: string;
  remote_addr: string;
  state: string;
  pid: number;
  process_name: string;
  suspicious: boolean;
  note?: string;
}

export interface StartupAuditFindingInfo {
  name: string;
  command: string;
  location: string;
  risk: 'safe' | 'medium' | 'high' | string;
  reason: string;
}

export interface RollbackReleaseItem {
  version: string;
  tag: string;
  title: string;
  published_at?: string;
  download_url: string;
  local_backup: boolean;
  is_current: boolean;
  summary: string;
}

// Полная история версий Luma OS и всех предыдущих веток
export const VERSION_HISTORY: Record<string, string[]> = {
  '1.7.5 (Oxygen · Стиль ОС · Base & Pro)': [
    'ИЗВИНЕНИЯ И ИСПРАВЛЕНИЕ В LUMA OS 1.7.5 (BASE & PRO): Простите, в 1.7.4 мы реально сделали фигню с дизайном кнопки «Пуск», Поиска и остальных элементов панели задач вместо того, чтобы поправить только иконки приложений. В 1.7.5 всё вернули обратно как было раньше и добавили выбор положения Пуска — слева или по центру!',
    'Откат дизайна панели задач (кроме приложений): кнопка «Пуск» (привычная сетка из 9 точек), Поиск, Circle to Search, Папка Luma, весь правый трей (язык, уведомления, звук, заряд, часы, задачи, буфер обмена, F11, TAB) и сам фон панели возвращены ровно к прежнему виду, как было до 1.7.4',
    'Аккуратные иконки приложений сохранены: открытые программы Windows и приложения Luma по-прежнему выглядят чисто и чётко — без тёмных рамок вокруг иконок, без лишней серой полоски слева, с переключением окна по ЛКМ и удобным меню окна по ПКМ',
    'Новый выбор расположения кнопки «Пуск» — слева или по центру: переключайте в 1 клик в Настройках → Панель задач, через ПКМ по панели задач или прямо через ПКМ по самой кнопке «Пуск». Само меню «Пуск» автоматически открывается слева или по центру вслед за кнопкой',
    'Все полезные функции (скрытие модульной панели и конструктора, беспроводной 2-й экран по Windows Miracast) полностью сохранены в обеих редакциях — Luma OS 1.7.5 Base и Luma OS 1.7.5 Pro',
  ],
  '1.7.4 (Oxygen · Стиль ОС · Base & Pro)': [
    'ОБНОВЛЕНИЕ LUMA OS 1.7.4 (OXYGEN · BASE & PRO) — ПАНЕЛЬ ЗАДАЧ В АККУРАТНОМ СТИЛЕ WINDOWS, СКРЫТИЕ МОДУЛЬНОЙ ПАНЕЛИ И КОНСТРУКТОРА В ОДИН КЛИК, БЕСПРОВОДНОЙ ВТОРОЙ ЭКРАН (WINDOWS MIRACAST) И ОБНОВЛЁННЫЕ НАСТРОЙКИ',
    'Полностью исправлена и переработана панель задач в стиле Windows: убраны тёмные квадратные рамки вокруг иконок, лишняя серая полоска слева и яркие зелёные полоски под приложениями. Иконки программ теперь крупные и чёткие, под открытыми окнами — аккуратные индикаторы в стиле Windows 11, клик ЛКМ сразу переключает на нужное окно, а клик ПКМ открывает удобное меню окна вместо случайного закрытия',
    'Добавлена возможность полностью скрыть модульную панель виджетов или отдельно убрать кнопку «Конструктор модульной панели» (шестерёнку), если они не нужны — прямо крестиком на самой панели, внутри конструктора, в Настройках → Панель задач или в меню ПКМ по панели задач',
    'Беспроводной второй экран по Windows Miracast: в Панели управления (плитка «2-й экран»), в Настройках → Графика и Экран и в «Суперустройстве» появились кнопки «Транслировать на другой экран» (открывает поиск беспроводных экранов Windows), «Сделать этот ПК экраном» (запускает встроенный «Беспроводной дисплей» с автоматической проверкой его установки и быстрым переходом в параметры Windows при отсутствии компонента), а также удобные переключатели «Дублировать», «Расширить», «Только ПК» и «Только 2-й экран»',
    'Обновлено главное окно Настроек и экран «О системе»: теперь везде отображается актуальная версия Luma OS 1.7.4 (Base / Pro) и быстрое скачивание актуальных сборок',
    'Все новинки и исправления полностью включены сразу в обе версии — Luma OS 1.7.4 Base и Luma OS 1.7.4 Pro',
  ],
  '1.7.3 (Oxygen · Стиль ОС · Base & Pro)': [
    'ОБНОВЛЕНИЕ LUMA OS 1.7.3 (OXYGEN · BASE & PRO) — ИСПРАВЛЕННАЯ КЛАССИЧЕСКАЯ ПАНЕЛЬ ЗАДАЧ, ПОЛНАЯ СВОБОДА ПЕРЕТАСКИВАНИЯ И ВЫНОСА КНОПОК НА РАБОЧИЙ СТОЛ, ИДЕАЛЬНОЕ МЕНЮ ПО ПКМ, ПЛАВНЫЕ ВЫСОКОКАДРОВЫЕ АНИМАЦИИ, ВОЗВРАТ СВОИХ ОБОЕВ, ПЕРЕИМЕНОВАНИЕ В «СТИЛЬ ОС», КОМПАКТНАЯ ПАНЕЛЬ УПРАВЛЕНИЯ С УДОБНЫМИ ПОЛЗУНКАМИ И ПОЛНОЦЕННОЕ ОКНО НАСТРОЕК ПЛЕЕРА',
    'Исправлен баг с панелью задач: классический стиль теперь включается сразу и на всю ширину экрана — система больше не застревает в Luma Nova. Переключатель «Классическая / Стекло / Luma Nova» добавлен прямо в меню ПКМ по панели задач, в Настройки и в саму панель Luma Nova (кнопка «Классика» в 1 клик)',
    'Полная свобода настройки панели задач: каждый элемент (Пуск, Circle to Search, Поиск, Папка Luma, Открытые окна, Суперустройство, Часы, Уведомления, Звук, Буфер обмена, CPU/RAM, F11, Раскладка, Задачи и TAB) теперь можно свободно перетаскивать мышкой в любое место на панели, вытаскивать прямо на рабочий стол как отдельные рабочие плитки или полностью убрать с панели задач (а при желании вернуть в Настройках)',
    'Исправлено меню ПКМ по панели задач: больше не открывается в середине экрана — теперь оно появляется строго рядом с курсором и автоматически подстраивается, чтобы ни один край меню не вылезал за границы экрана',
    'Плавные высококадровые анимации по всей системе: окна, меню, панель задач, панель управления, полка и всплывающие подсказки работают ощутимо мягче и отзывчивее без рывков',
    'Возвращено удобное добавление своих обоев: большая кнопка «+ Добавить свои обои» теперь на самом верху галереи обоев, первая карточка в сетке и быстрый пункт прямо в меню ПКМ по рабочему столу. Загруженные картинки надёжно сохраняются на диске в папке «Мои обои» и больше не пропадают после перезагрузки',
    'Всё, что раньше называлось «HarmonyOS», переименовано в фирменный «Стиль ОС» по всему интерфейсу системы, на телефоне и в описаниях',
    'Компактная Панель управления без пустых промежутков + удобные ползунки звука и яркости: убраны лишние пустые отступы, заголовок «Суперустройство» теперь аккуратно в одну строку, а ползунки яркости и громкости легко и точно перетаскиваются за любую часть полоски (включая область над самой иконкой)',
    'Новое окно настроек плеера: нажатие на карточку плеера в Панели управления открывает полноценное окно с перемоткой трека по полосе времени, кнопками −10с / +10с, переключением между открытыми плеерами, точной громкостью, выбором наушников/колонок и микшером громкости по приложениям',
    'Все новинки и исправления полностью включены сразу в обе версии — Luma OS 1.7.3 Base и Luma OS 1.7.3 Pro',
  ],
  '1.7.2B (Oxygen · O-8 · Circle to Search Fix)': [
    'ОБНОВЛЕНИЕ LUMA OS 1.7.2B (OXYGEN · BASE & PRO) — ПОЛНОЕ ИСПРАВЛЕНИЕ CIRCLE TO SEARCH: УСТРАНЁН ЧЁРНЫЙ ЭКРАН НА ПК И ТЕЛЕФОНЕ + ВОЗВРАЩЕНЫ И ОБЪЕДИНЕНЫ МОБИЛЬНЫЕ МОЗГИ РАСПОЗНАВАНИЯ ДЛЯ ПК И СМАРТФОНА!',
    'Устранён чёрный экран в Circle to Search на компьютере и телефоне: теперь при запуске сразу виден чёткий живой экран без затемнения, а смартфон мгновенно получает актуальную картинку рабочего стола по Wi-Fi',
    'Объединены и усилены мозги распознавания для ПК и телефона: система точно определяет товары, текст с мгновенным переводом на русский, ошибки с шагами исправления, места и математические задачи без лишней воды',
    'Исправлена обрезка выделенной области без смещения и добавлена защита автообновления от сбоев загрузки',
  ],
  '1.7.2 (Oxygen · O-8 · Base & Pro)': [
    'КРУПНОЕ ОБНОВЛЕНИЕ LUMA OS 1.7.2 (OXYGEN · BASE & PRO) — ВСТРОЕННЫЙ ФОТОРЕДАКТОР LUMA PHOTO STUDIO, СИСТЕМНОЕ ОТКРЫТИЕ ВСЕХ ФАЙЛОВ ЧЕРЕЗ LUMA OS, МОДУЛЬНАЯ ПАНЕЛЬ ВИДЖЕТОВ, ПРОКРУТКА КОЛЕСОМ НАД ПАНЕЛЬЮ, ПАНЕЛЬ В СТИЛЕ ОС, ЭКОСИСТЕМА «СУПЕРУСТРОЙСТВО», ФИКС ALT+TAB И ДВЕ РЕДАКЦИИ BASE / PRO',
    'Встроенный фоторедактор Luma Photo Studio + системное открытие всех файлов через Luma OS: яркость, контраст, фильтры, поворот, кадрирование, кисть, стрелки, текст, размытие, сравнение До/После, отправка на телефон с волной Стиль ОС и установка на обои',
    'Модульная система виджетов на панели: собирайте верхнюю или нижнюю панель из независимых блоков (погода, курсы валют, загрузка ПК, активный трек, буфер обмена, Pomodoro-таймер) и меняйте их местами перетаскиванием мышкой',
    'Прокрутка колесом над элементами панели: крутите колесо над звуком — меняется громкость, над панелью задач — переключаются окна, над яркостью или столами — меняются они',
    'Обновлённый дизайн Панели управления в Стиле ОС + интерактивная экосистема «Суперустройство» с объединением телефона, наушников, аудио и экранов',
    'Исправлен Alt+Tab: после переключения окна можно сразу печатать без лишнего клика мышью, а Dynamic Island появляется сразу',
    'Единый системный Circle to Search (ПК + Телефон) и две официальные редакции — Luma OS Base и Luma OS Pro',
  ],
  '1.7.1 (Oxygen · O-8)': [
    'ОБНОВЛЕНИЕ LUMA OS 1.7.1 (OXYGEN) — ПОЛНОЭКРАННАЯ ВОЛНА СТИЛЬ ОС ПРИ ПРИЁМЕ И ОТПРАВКЕ ФАЙЛОВ, СВЕРХПРОСТОЙ 1-ТАП ИНТЕРФЕЙС НА ТЕЛЕФОНЕ, УСКОРЕННАЯ СЕНСА ТАЧПАДА И ПОЛНОЦЕННЫЙ CIRCLE TO SEARCH',
    'Красивая анимация отправки и приёма файлов в Стиле ОС (на ПК и на телефоне): из самого центра по всему экрану расходятся светящиеся волны с карточкой файла и быстрыми кнопками «Открыть» и «Полка»',
    'В разы более простой и понятный 1-тап интерфейс на телефоне (Oxygen Connect): на одном экране сразу 4 крупные кнопки, большой тачпад, плеер, громкость и волна Стиль ОС',
    'Ускоренная и более плавная чувствительность тачпада с телефона с жестами двумя пальцами и переключателем скорости',
    'Полноценный визуальный Circle to Search на ПК и телефоне с мгновенным определением предметов, текста, ошибок и задач',
  ],
  '1.7 (Oxygen · O-8)': [
    'КРУПНОЕ ПОКОЛЕНИЕ LUMA OS 1.7 (OXYGEN) — 100% ПРОГРУЗКА ИКОНОК, УМНЫЙ АВТОЗАПУСК НОВОЙ ВЕРСИИ, ПРАВИЛА ОКОН, НАВСЕГДА ПОЧИНЕННЫЙ ALT+TAB, ПОЛКА DRAG & DROP, УМНЫЙ БУФЕР С КАТЕГОРИЯМИ, ПО-ПРИЛОЖЕЧНЫЙ ЗВУК, 2.5D ОБОИ OXYGEN, НОВАЯ МИНИ-ИГРА И КОМПАНЬОН OXYGEN CONNECT',
    'Исправлен баг загрузки иконок: все значки установленных программ и файлов загружаются стабильно и чётко',
    'Исправлен запуск старой версии после перезагрузки ПК: при перезапуске всегда автоматически запускается самая новая установленная версия системы',
    'Продвинутый менеджер правил для окон в Настройках: задавайте монитор, положение, режим «поверх всех окон» и игровой режим для любых программ',
    'Починен Alt+Tab при переходе с рабочего стола на другие окна',
    'Полка Drag & Drop у края экрана: удобно складывать файлы из разных папок и забирать всё пачкой',
    'Умный буфер обмена с категориями (текст, ссылки, цвета, картинки с распознаванием текста, файлы, закрепление) и вставкой без форматирования',
    'Индивидуальная громкость и выбор аудиовыхода для каждого приложения прямо в Панели управления',
    'Новые капсульные индикаторы громкости, яркости, микрофона и заряда + 2.5D-обои Oxygen + новая мини-игра «Oxygen Pulse · O-8»',
    'Новый компаньон Oxygen Connect для Android (в Стиле ОС): быстрое подключение по QR-коду, фото с камеры сразу на ПК, обмен файлами, общий буфер, тачпад и медиа-пульт',
  ],
  '1.6.7 (Nitrogen · Final 1.6.x)': [
    'Финальное стабильное обновление ветки 1.6.x (рекомендуется вместо нестабильных сборок 1.6.4–1.6.6b)',
    'Исправлен баг Dynamic Island поверх Chrome и любых окон Windows: устранено «окошко загрузки» вместо курсора и неработающие клики — в нативный Win32-оверлей добавлена загрузка системных курсоров IDC_ARROW / IDC_HAND, полноценная обработка WM_SETCURSOR, WM_NCHITTEST (HTCLIENT) и WM_CAPTURECHANGED, а из периодического таймера убран флаг SWP_SHOWWINDOW, сбивавший наведение и нажатия',
    'Критическое исправление зависания всей системы при выборе файла в антивирусе LumaShield 3.1: переработан системный проводник /api/kernel/pick-file — для файлов используется мгновенный нативный Win32 GetOpenFileNameW (<15 мс, 0% PowerShell, поверх Luma OS), для папок — TopMost-окно с таймаутом 90 сек и защитой от двойного запуска; в антивирусе добавлены отдельные кнопки «Выбрать файл» (мгновенная проверка конкретного файла на диске до 4 МБ без загрузки в ОЗУ WebView2) и «Папка», а при перетаскивании файлов стоит жёсткий срез 2 МБ',
    'Закрыты дополнительные дыры зависания по всей ОС: починено чтение параметра ?mode=folder|file в /api/kernel/pick-file, добавлен жёсткий лимит чтения 4 МБ в /api/kernel/security/scan-file (исключён краш ОЗУ на больших .exe/.iso) + подключена проверка Anti-RAT на одиночный файл, а также добавлен таймаут 6 сек в аудит планировщика задач (AuditScheduledTasks)',
    'Очистка репозитория GitHub: все устаревшие прототипы (launcher_hab2.4, LauncherHab3.0_CSharp, Luma_Core, start_all.bat, metadata.json) перенесены в папку «old protatips»; ядро обновлено до LumaCore 1.5.7 (Kernel 1.6.7 · LumaShield 3.1 · go vet 0 ошибок), сохранены все 27 сборок LumaOS_*.exe и все 20 встроенных обоев',
  ],
  '1.6.6b (Nitrogen)': [
    'Критическое исправление зависания и фризов системы при проверке на вирусы (LumaShield 3.0b Zero-Freeze Engine): сканер переведён на быстрый filepath.WalkDir с жёстким бюджетом времени (8 сек быстрая / 14 сек глубокая), ограничением глубины вложенности (4–5 уровней), автоматическим пропуском симлинков и облачных папок OneDrive / Google Drive / Dropbox / iCloud (которые раньше намертво вешали os.Open), однопоточной блокировкой scanInProgress и регулярной отдачей CPU (runtime.Gosched)',
    'Устранена фоновая перегрузка диска и USB-флешек (0% CPU в простое): фоновый щит LumaShield 3.0b теперь запускается раз в 20 сек (вместо 6 сек), никогда не пересекается с ручной проверкой, строго кэширует уже проверенные файлы по (ModTime ^ Size) и не перечитывает неизменённые файлы с USB-флешек и Загрузок; буфер эвристического чтения уменьшен с 512 КБ до 128 КБ с жёстким лимитом 6 сек на тик',
    'Мгновенный отклик панели безопасности (< 5 мс вместо фриза на 3–5 сек): статус Windows Defender в /api/kernel/security/status теперь возвращается мгновенно из кэша и обновляется асинхронно в фоновом потоке без блокировки WebView2',
    'Добавлена кнопка «Остановить» и жёсткие таймауты AbortController (20 сек на сканирование, 8 сек на статус) в интерфейсе LumaShield 3.0b, а также откалиброваны веса эвристики против ложных срабатываний на безопасных скриптах',
    'Ядро обновлено до LumaCore 1.5.6b (Kernel 1.6.6b · LumaShield 3.0b Zero-Freeze · 340+ правил · 117 API-маршрутов · 0 утечек Win32-колбэков · go vet 0 ошибок), сохранены все 26 сборок LumaOS_*.exe и все 20 встроенных обоев',
  ],
  '1.6.6 (Nitrogen)': [
    'Рамочное выделение при зажатии ЛКМ по рабочему столу: удерживайте левую кнопку мыши на свободном месте стола, чтобы выделить сразу несколько ярлыков, папок и виджетов; поддерживаются Ctrl/Shift-клик, Ctrl+A, Esc, групповое перетаскивание выбранных элементов с сохранением взаимного расположения, групповой перенос в папку, сбор в новую папку в 1 клик, панель групповых действий, ПКМ-меню и Delete',
    'Расширение языков интерфейса системы до 36 языков мира (добавлены ещё 18 полноценных языков: Беларуская, Oʻzbekcha, Azərbaycanca, ქართული, Հայերեն, Čeština, Slovenčina, Български, Српски, Ελληνικά, Magyar, Svenska, Norsk, Suomi, Tiếng Việt, Bahasa Indonesia, ไทย и עברית) с мгновенным поиском в Настройки → Язык и регион, метками RTL и расширенным автопереводом всего интерфейса',
    'Нативный Always-On-Top Dynamic Island поверх Chrome и всех окон Windows: в ядро LumaCore 1.5.6 встроен настоящий Win32-оверлей (HWND_TOPMOST + WS_EX_LAYERED + WS_EX_TOOLWINDOW + WS_EX_NOACTIVATE) со сглаженной стеклянной капсулой, который буквально прилипает к выбранной части экрана поверх Google Chrome, Telegram, игр и любых программ Windows без перехвата фокуса, поддерживает живой 7-полосный эквалайзер, кликабельные кнопки ⏮ ⏯ ⏭, часы, CPU/RAM, батарею, прогресс загрузок и импульсы; внутри Luma OS капсула также поднята на слой z-[9400] поверх всех окон',
    'Большое расширение настроек Luma Island (в Настройки → Luma Island и в окне самого Острова): главный тумблер «Поверх всех окон Windows и Chrome», 6 зон прилипания на экране (верх/низ · лево/центр/право), ползунок отступа от края (0–64px), 4 визуальных стиля капсулы (Obsidian / Cryo-Glass / Frosted / Pure OLED), ползунок прозрачности (55–100%), режим пропуска кликов (Click-Through), блокировка позиции / свободное перетаскивание, показ поверх F11/игр, расширение при наведении, модули Часов / CPU·RAM / Погоды / Загрузок и кнопка теста импульса',
    'Жёсткий антивирус LumaShield 3.0 (340+ правил · Anti-RAT · Щит флешек USB · Блокировка чужих файлов): активный движок каждые 6 секунд проверяет систему, процессы и все подключённые USB-флешки — любой файл, пытающийся управлять ПК (RAT, Reverse Shell, Keylogger, autorun.inf, вирусные .lnk, двойные расширения), немедленно завершается, перезаписывается нулями (0x00) и удаляется под ноль; чужие подозрительные файлы из сети (Zone.Identifier) и с флешек автоматически блокируются, а ядро Windows и Luma OS защищены неизменяемым белым списком',
    'Ядро обновлено до LumaCore 1.5.6 (Kernel 1.6.6 · LumaShield 3.0 · 340+ правил · 117 API-маршрутов · 0 утечек Win32-колбэков · go vet 0 ошибок), сохранены все 25 сборок LumaOS_*.exe и все 20 встроенных обоев',
  ],
  '1.6.5 (Nitrogen)': [
    'Новая настройка «Пружинные анимации во всей системе» в Панели задач: добавлен полноценный глобальный переключатель в Настройки → Панель задач (блок «Авто-скрытие шума, Магнитный Dock и Пружинные анимации») и мгновенный тумблер по ПКМ на самой панели задач — управляет пружинной физикой во всей ОС (инерция перетаскивания и плавное разворачивание окон DexWindow, пружинный отскок Dock, упругие меню Пуск/ПКМ/Luma Nova, панели и резиновая анимация Luma Island) с сохранением в памяти',
    'Критическое исправление реальных многопальцевых жестов Precision Touchpad (Win32 HID) в ядре LumaCore 1.5.5: починено сопоставление HIDP_VALUE_CAPS для дискретных осей (IsRange == 0, где UsageMax == 0), добавлен сбор координат X/Y по всем логическим коллекциям контактов с учётом LogicalMin и флага TipSwitch (0x0D/0x42), устранён обрыв жеста на гибридных тачпадах ELAN/Synaptics/Intel при ContactCount == 0 во время удержания пальцев, а также добавлен системный таймер WM_TIMER (80 мс) для гарантированного завершения жеста на контроллерах без финального пустого пакета',
    'Исправлены визуальные и физические баги окон и Dock: в DexWindow разворачивание/восстановление переведено на числовые координаты с отслеживанием resize экрана (устранён рывок без пружины) и исправлена устаревшая зависимость topBarOffsetPx при переключении двойной панели задач; в панели задач убрана вертикальная обрезка увеличенных иконок магнитного Dock, пружинного отскока, ореола прогресса и бейджей (overflow-visible при ≤9 вкладках) + сброс «залипших» трансформаций при отключении магнитного режима',
    'Исправлены баги ИИ-шлюза, генератора презентаций и консоли обновления: устранена утечка сохранённого ключа «ollama» в облачные провайдеры (Gemini/OpenAI/DeepSeek/Groq/OpenRouter) при переключении в Luma Ai Nitrogen, исправлен неэкранированный символ % в fmt.Sprintf генератора PowerPoint (LumaCore go vet 0 предупреждений), а в экране обновления Luma Update Cinema починен сброс графика скорости (SVG sparkline) и выровнены шаги демо-просмотра под 1.6.5',
    'Ядро обновлено до LumaCore 1.5.5 (Kernel 1.6.5 · LumaShield 2.5 · 275 правил · 110 API-маршрутов · 0 утечек Win32-колбэков · go vet 0 ошибок), сохранены все 24 сборки LumaOS_*.exe и все 20 встроенных обоев',
  ],
  '1.6.4 (Nitrogen)': [
    'Исправлены многопальцевые жесты пальцами на тачпадах и сенсорных экранах: добавлен нативный Win32 Raw Input HID-драйвер Precision Touchpad (WM_INPUT + hid.dll, ContactCount 0x0D/0x54 + X/Y) в ядре LumaCore 1.5.4 с потоком событий /api/kernel/gestures/events и полностью переработан фронтенд-трекер по ID каждого пальца (TouchEvent + PointerEvent) без скачков центроида — свайпы 3 пальцами вниз/вверх/влево/вправо, 4 пальцами вниз и тап 3 пальцами срабатывают мгновенно',
    'Полностью исправлена интеграция Google Gemini API (устранена ошибка «Gemini HTTP 404: .» для gemini-2.5-flash и gemini-2.5-flash-lite): принудительная очистка префикса models/, точное разделение нативного Gemini SSE (/v1beta/models/{model}:streamGenerateContent?alt=sse&key=...) и OpenAI-совместимого пути (/v1beta/openai/chat/completions), логирование маскированного URL (key=***), чтение полного тела ответа при любых ошибках non-200 и динамический заголовок с именем выбранной модели вместо жёстко прописанного Flash-Lite',
    'Авто-скрытие визуального шума: при просмотре видео или в полноэкранном режиме (F11) через 2.6 с бездействия курсора верхняя панель, Dynamic Island, Luma Nova и панель задач/Dock плавно растворяются и уходят за край экрана на пружинной физике — и мгновенно возвращаются при движении мыши или наведении на край (переключается в Настройках → Панель задач)',
    'Интерактивный Dock с магнитной физикой: иконки на панели задач плавно увеличиваются, приподнимаются и слегка притягиваются к курсору по кривой Гаусса (GPU rAF без лагов), мягко подпрыгивают с пружинным импульсом при запуске приложения, а во время фоновой загрузки файлов или рендера видео (Luma Cut Studio) рисуют светящийся ореол и шкалу прогресса прямо вокруг и под иконкой',
    'Пружинные анимации во всей системе (вместо плоских линейных переходов): окна DexWindow получили физику инерции — реагируют на скорость перетаскивания и мягко доезжают с пружинным затуханием, а меню Пуск, Центр управления, Панель управления и выпадающие панели открываются с живым пружинным откликом',
    'Полностью переработанный экран загрузки обновления Luma OS (Cryo-Glass Nitrogen): двойной орбитальный реактор, 5-этапный конвейер установки, живой график скорости (SVG sparkline), обратный отсчёт ETA, статус проверки SHA-256, интерактивная карусель «Что нового в 1.6.4» и раскрываемый журнал установки в реальном времени',
    'Ядро обновлено до LumaCore 1.5.4 (Kernel 1.6.4 · LumaShield 2.5 · 275 правил · 110 API-маршрутов · 0 утечек Win32-колбэков), сохранены все 23 сборки LumaOS_*.exe и все 20 встроенных обоев',
  ],
  '1.6.3 (Nitrogen)': [
    'Модульный ИИ-ассистент нового поколения Luma Ai Nitrogen (Python FastAPI + Go-шлюз LumaCore 1.5.3): универсальный OpenAI-совместимый клиент (по умолчанию локальный Ollama Qwen 2.5 3B / Llama 3.2 3B; мгновенное переключение на Gemini Flash-Lite, Groq, OpenRouter или LM Studio через BASE_URL, API_KEY и MODEL_NAME), потоковый вывод ответа по токенам (SSE), архитектура инструментов (Function Calling) и агрессивная 3-уровневая долговременная память (контекстное окно + SQLite WAL история и архив кода + семантический RAG с автоизвлечением, дедупликацией и обновлением устаревших фактов)',
    'Глубокая интеграция Luma Ai Nitrogen со всей ОС: работает с системой и телеметрией, с «Luma Обвести для поиска» (стриминговый анализ выделенного фрагмента), с Luma Office Studio (Word / Excel / PowerPoint — потоковая генерация и вставка) и с Календарём (двусторонняя синхронизация событий + планирование естественным языком)',
    'Опция «Скачать / Удалить ИИ» прямо в Luma Ai Nitrogen: установка Ollama + Qwen 2.5 3B или Llama 3.2 3B в 1 клик с живым прогресс-баром, либо полное удаление локальных моделей и отключение ИИ для экономии диска и ОЗУ',
    'Полное отключение ВСЕХ жестов тачпада Windows (3/4 пальца, зум, свайпы с краёв экрана EdgeUI) на время работы Luma OS — с автоматическим резервным копированием и 100% восстановлением при выключении опции, по Ctrl+Alt+Shift+W и при выходе',
    'Wi-Fi и Bluetooth теперь отображают ВСЕ доступные устройства и сети рядом (не только подключённые!): активное Win32-сканирование wlanapi.dll WlanScan + bthprops.cpl BluetoothFindFirstDevice с бейджами «Подключено» / «Сопряжено» / «Найдено рядом»',
    'Рабочий режим «Не заряжать батарею» в Настройках энергосбережения и Питания ноутбука: мультивендорное аппаратное отключение зарядки АКБ от сети (Lenovo EnergyDrv, ASUS ATKACPI, MSI/Acer/BIOS WMI, тепловая защита ACPI и Linux sysfs)',
    'Полная поддержка сенсорных экранов и стилусов (Touch & Pen): перетаскивание и ресайз окон пальцем/пером, удержание = ПКМ, рисование в «Обвести для поиска» с учётом силы нажатия стилуса, адаптивный режим крупных элементов и запуск экранной клавиатуры',
    'Многостраничная вёрстка A4 в Luma Office Studio (Luma Word): большие документы теперь разбиваются на отдельные листы A4 с зазорами, колонтитулами «Страница N из M», навигатором страниц и ручным разрывом Ctrl+Enter',
    '«Обзор окон» перенесён внутрь меню «Пуск» (вкладка «Приложения | Обзор окон» с рабочими столами D1–D4, окнами Luma и открытыми программами Windows) — панель задач стала чище',
    'Реальное закрепление окон Luma OS «Поверх всех окон» (📌) через Win32 SetWindowPos(HWND_TOPMOST) — закреплённые окна (например, Настройки) теперь действительно держатся поверх Chrome и всех программ Windows',
    'Очищено контекстное меню (ПКМ) Рабочего стола: убраны лишние пункты («Спросить Luma AI», «Сделать скриншот», «Во весь экран F11», «Режим расстановки» и пресеты)',
    'Ядро обновлено до LumaCore 1.5.3 (Kernel 1.6.3 · LumaShield 2.5 · 275 правил · 108 API-маршрутов), сохранены все 22 сборки LumaOS_*.exe и все 20 встроенных обоев',
  ],
  '1.6.2b (Nitrogen)': [
    '100% нативные Wi-Fi и Bluetooth в Панели управления и в Центре управления (всплывающее окно в углу): ЛКМ — мгновенное включение/выключение адаптера, ПКМ (или иконка списка) — встроенный список всех сетей Wi-Fi и устройств Bluetooth прямо внутри Luma OS',
    'Ввод пароля Wi-Fi и PIN-кода Bluetooth прямо внутри Luma OS: встроенное поле с показом/скрытием пароля, статус сигнала, сохранение профилей WPA2/WPA3, отключение в 1 клик — без единого упоминания и без открытия окон Параметров Windows',
    'Новая настройка «Замена горячих клавиш» в Настройки → Оболочка Windows: одним переключателем активирует Win → окно Пуск Luma (или панель Luma Nova), Alt+Tab → фирменное окно переключения Luma OS, Win+D → возврат на рабочий стол Luma и отключает жесты тачпада Windows (с полным автовосстановлением при выключении опции, по Ctrl+Alt+Shift+W и при выходе из Luma OS)',
    'Полностью устранён баг самопроизвольного открытия окна Настроек Windows во время работы: удалены все фоновые системные запросы разрешений и внешние ссылки на параметры Windows',
    'Исправлена стабильность глобального перехватчика горячих клавиш (самовосстановление залипшей клавиши Win после UAC-окон, автоматический сброс режима Alt+Tab при выборе мышью и при потере фокуса)',
    'Ядро обновлено до LumaCore 1.5.2b (Kernel 1.6.2b · LumaShield 2.5 · 275 правил), сохранены все 21 сборка LumaOS_*.exe и все 20 встроенных обоев',
  ],
  '1.6.2 (Nitrogen)': [
    'Исправлен баг перетаскивания приложений в папки на рабочем столе: иконки ярлыков защищены от браузерного перетаскивания как PNG (draggable={false}), внутреннее перетаскивание ярлыков теперь обрабатывается с высшим приоритетом и переносит реальное рабочее приложение внутрь папки с сохранением его родной иконки',
    'Живой индикатор загрузок на панели задач: при скачивании любых файлов (браузеры .crdownload/.part/.opdownload/.download, торренты .!qb/.!ut/.aria2, Telegram, Steam и любые активно растущие файлы в папке Загрузки) на панели автоматически появляется неоновая капсула с названием файла, процентом, скоростью МБ/с и прогресс-баром; после завершения скачивания индикатор автоматически скрывается',
    'Полностью переработанная нейросеть Luma AI 5.0 Nexus: добавлена долгосрочная память о пользователе (сохраняет имя, город, предпочтения и заметки в %AppData%/LumaOS/ai_memory_v5.json + удобный менеджер «Память» в окне чата), контекст диалога, развёрнутые ответы из Википедии RU/EN и интернета, онлайн-перевод на 50 языков, решение уравнений и процентов, а также глубокая интеграция с ПК (диагностика тормозов с топ-процессами, пинг, чтение/перевод буфера обмена, завершение процессов, очистка кэша, безопасное удаление в Корзину и запуск Luma Обвести для поиска)',
    'Новый раздел «Управление · Спецвозможности» в Настройках: объединил управление Плагинами, гибкие настройки ПКМ (выбор пунктов контекстного меню Рабочего стола + ПКМ «Назад»), опции доступности (высокий контраст, минимум анимаций, яркая рамка фокуса) и новый модуль «Управление жестами»',
    'Управление жестами (мультитач и жесты мышью Alt+ПКМ): 3 пальца вниз — мгновенный скриншот экрана, 3 пальца вверх — обзор окон, 3 пальца влево/вправо — переключение рабочих столов, 4 пальца вниз — показать рабочий стол, круг / 3 пальца тап — «Luma Обвести для поиска», плюс интерактивная зона проверки жестов',
    '«Luma Обвести для поиска» (Ctrl+Shift+L / Alt+Shift+S / жест / ПКМ / Alt+R): мгновенный захват экрана (Win32 BitBlt), свободное обведение кругом (лассо) или рамкой, встроенный офлайн-OCR текста (RU+EN), определение палитры доминирующих цветов, перевод в 1 клик, живой поиск по всему интернету через Luma AI 5.0, сохранение вырезки в PNG и визуальный поиск',
    'Гибкая «Папка Luma» на панели задач: перемещена левее (крайне левый слот по умолчанию), свободно перетаскивается мышью вдоль всей панели задач с подсветкой зон сброса, а также легко скрывается или возвращается в Настройках → Панель задач',
    'Безопасное удаление в Корзину Luma OS: все файлы и папки, удаляемые в Проводнике, через API ядра или через Luma AI 5.0, теперь автоматически перемещаются в Корзину с возможностью мгновенного восстановления в 1 клик и автообновлением окна Корзины',
    'Ядро обновлено до LumaCore 1.5.2 (Kernel 1.6.2 · LumaShield 2.5 · 275 правил), сохранены все 20 сборок LumaOS_*.exe и все 20 встроенных обоев',
  ],
  '1.6.1 (Nitrogen)': [
    'ОБНОВЛЕНИЕ LUMA OS 1.6.1 (NITROGEN · N-7 · ЯДРО LUMACORE 1.5.1 · LUMASHIELD 2.5 · LUMA AI 4.0 AUTONOMOUS) — СКРЫТАЯ ПОЛКА LUMA DOCK ПО НАВЕДЕНИЮ, АВТОНОМНАЯ ДУМАЮЩАЯ НЕЙРОСЕТЬ LUMA AI 4.0 С ПОИСКОМ ПО ВСЕМУ ИНТЕРНЕТУ, ФЛАГМАНСКИЕ 2.5D ОБОИ NITROGEN CRYO-GLASS, ПОЛНЫЙ РЕБРЕНДИНГ СТИЛЕЙ ПОД LUMA OS И ИСПРАВЛЕНИЕ БАГОВ',
    'Умная скрытая Полка Luma Dock — убран визуальный мусор и фантомная кнопка «0%» с панели задач; вместо этого на панели задач остаётся один компактный стеклянный триггер, при наведении на который (или перетаскивании файла) плавно выезжает стеклянная полка со стеками папок (Веер / Сетка + Luma Peek по Space) и живыми загрузками',
    'Luma AI 4.0 Autonomous — умная автономная нейросеть нового поколения: видимая цепочка размышлений («Ход мыслей · Thinking»), самостоятельное выполнение действий в ОС (открытие окон, громкость, яркость, смена стиля/темы/обоев, создание файлов/папок, аудит безопасности, Luma SwapBoost, таймеры, запуск программ) и поиск информации по ЛЮБЫМ сайтам интернета с живым чтением страниц и кликабельными ссылками',
    'Новые главные реалистичные 2.5D обои Nitrogen Cryo-Glass (QHD 2560×1440) в духе фирменного стеклянного минимализма Luma 1.1 / 1.2 (криогенное стекло N-7, оптическая рефракция и лёгкий азотный пар) при полном сохранении прежних обоев Nitrogen Monolith и всей коллекции прошлых версий',
    'Полный фирменный брендинг Luma OS — убраны все сторонние названия ОС и программ: стили переименованы в Luma Matrix, Luma Glass и Luma Nova (с крио-сапфировой палитрой и без конфликта с верхним правым углом), виртуальная память — Luma SwapBoost, быстрый просмотр — Luma Peek, очистка хвостов — Luma Deep Uninstaller',
    'Исправлены баги: устранён фантомный индикатор «0%» от простаивающих обновлений Steam (StateFlags=2) и пустых .part/.crdownload, устранён конфликт верхней правой капсулы Luma Nova с угловой зоной панели управления, усилена защита клавиши Space в текстовых полях',
  ],
  '1.6 (Nitrogen)': [
    'ОБНОВЛЕНИЕ LUMA OS 1.6 (NITROGEN · N-7 · ЯДРО LUMACORE 1.5.0 · LUMASHIELD 2.5) — КОЛЛЕКЦИЯ РЕАЛИСТИЧНЫХ QHD-ОБОЕВ NITROGEN, СТИЛЬ СИСТЕМЫ «LUMA NOVA», РЕЖИМ РАЗРАБОТЧИКА И АДМИНИСТРАТОРА, ВИРТУАЛЬНАЯ ПАМЯТЬ (LUMA SWAPBOOST 2/4/6 ГБ), LUMA AI, «ПОВЕРХ ВСЕХ ОКОН», LUMA GAMEPAD STUDIO, LUMA DEEP UNINSTALLER, LUMA PEEK ПО SPACE, КЛАВИША WIN, ПОЧИНЕННЫЙ ALT+TAB И УМНЫЙ DOCK',
    'Новые реалистичные обои высокого качества (коллекция Nitrogen 2560×1440 QHD: Северное сияние, Ледник, Альпы, Фьорды, Арктическая ночь + 2 новых живых обоя) при 100% сохранении всей галереи обоев и всех предыдущих сборок LumaOS_*.exe',
    'Режим разработчика (живой HUD поверх системы: FPS-метр, JS/Go RAM, поток IPC/HTTP запросов в реальном времени, интерактивный DOM-инспектор и запуск GC) + Режим Администратора (точное определение токена UAC + перезапуск с повышением прав ShellExecuteW runas)',
    'Новый стиль системы «Luma Nova» — панель задач без кнопки Пуск и компактная системная капсула сверху справа (Язык · Wi-Fi · Батарея), открывающая лаконичную панель с компактным Пуском/лаунчером, переключением открытых окон рабочего стола, поиском Alt+R, рабочими столами D1–D4, ползунками звука/яркости и меню питания',
    'Настройка «Виртуальная память» (Luma SwapBoost: 2, 4 или 6 ГБ с SSD/HDD) — бережный режим для ресурса SSD: фиксированный файл подкачки Min == Max без фрагментации, сжатие памяти Windows, ClearPageFileAtShutdown = 0 и расчёт износа ресурса TBW',
    'Обновление ядра до LumaCore 1.5.0 и ядра безопасности до LumaShield 2.5 — 275 эвристических правил и объединённый аудит автозагрузки и планировщика задач Windows',
    'Встроенная интеграция Luma AI с кликабельными ссылками на источники в Luma Office, Code Studio, Терминале (команда ai), Luma Peek/Проводнике и поиске Alt+R',
    '«Поверх всех окон» (📌 Always on Top) — для всех встроенных окон Luma (DexWindow) и для любых внешних окон Windows через Win32 SetWindowPos(HWND_TOPMOST / HWND_NOTOPMOST)',
    'Luma Gamepad Studio — универсальный центр контроллеров (DualShock 4, DualSense, Xbox XInput и HID), live 60 FPS визуализатор, профили, мёртвые зоны и кривые стиков/триггеров, RGB Lightbar, тест вибрации, частота опроса 125–1000 Гц и эмуляция мыши/клавиатуры',
    'Luma Deep Uninstaller — список установленных программ, запуск штатного деинсталлятора, 4-этапный сканер остатков (файлы, реестр HKCU/HKLM, службы/задачи), выбор галочками, автобэкап и безопасное восстановление',
    'Luma Peek по клавише Space в Проводнике (включая все параллельные шторки), на Рабочем столе и в стеках Dock — фото (зум/поворот), видео и аудио с HTTP Range 206 стримингом, код/текст с подсветкой синтаксиса + объяснение через ИИ, PDF и Markdown; закрытие по Space/Esc и перелистывание стрелками',
    'Перехват клавиши Win (открывает меню Пуск Luma OS или панель Luma Nova вместо Windows Start с сохранением Win+D, Win+L, Win+Shift+S, Win+Space, Win+E) + Исправленный Alt+Tab на рабочем столе',
    'Умный Dock — стеки папок (Веер / Сетка с открытием, Luma Peek по Space и Drag & Drop файлов), живые бейджи уведомлений на мессенджерах и прогресс-бары загрузок (Steam libraryfolders.vdf + appmanifest_*.acf, браузерные загрузки и внутренние задачи Luma)',
  ],
  '1.5.4 (Carbon)': [
    'ОБНОВЛЕНИЕ LUMA OS 1.5.4 (CARBON · C-6 · ЯДРО 1.4.7) — ПОЛНОСТЬЮ ПЕРЕПИСАННЫЕ УВЕДОМЛЕНИЯ БЕЗ СПАМА И ПОЛНОЦЕННАЯ ШТОРКА УВЕДОМЛЕНИЙ, УМНЫЙ ALT+TAB (MRU-ПОРЯДОК + ЖИВЫЕ ПРЕВЬЮ ОКОН), МНОГОШТОРОЧНЫЙ ПРОВОДНИК, 140+ ФОРМУЛ EXCEL, ИСПРАВЛЕННЫЕ АНИМАЦИИ POWERPOINT И БАГИ LUMA OFFICE, ПОВЕРХ-ОКОННОЕ МЕНЮ ПАНЕЛИ ЗАДАЧ, ЧИСТЫЙ СОН И ОГРАНИЧЕНИЕ ЗАРЯДА БАТАРЕИ (50%–100%)',
    'Полностью переписанные с нуля уведомления Telegram, WhatsApp, Discord, VK + Полноценная Шторка уведомлений (Alt+N / колокольчик на панели) — полностью удалён генератор ложных «+4 новых уведомления» из замьюченных каналов! Новый нативный движок LumaCore 1.4.7 (WPN SQLite+WAL с точным временем + COM UIAutomation) показывает только реальные входящие сообщения: КТО написал, ЧТО написал и КОГДА, с группировкой «Сегодня / Вчера / Ранее», поиском, фильтрами по мессенджерам и переходом в чат по клику',
    'Умный Alt+Tab с MRU-порядком и живыми превью окон — последнее открытое или использованное окно всегда перемещается вперёд, а карточки в Alt+Tab отображают в реальном времени живое содержимое открытых окон Windows (Chrome, Telegram, игры) и встроенных приложений Luma OS; полностью убраны навязчивые уведомления при переключении между окнами',
    'Меню приложений панели задач поверх ВСЕХ открытых окон — при клике на открытое приложение на панели задач окно управления («На передний план», «Закрыть») теперь всегда открывается поверх открытых окон приложений без необходимости их сворачивать',
    'Многошторочный Проводник Luma OS — кнопка «+ Шторка» открывает до 3 параллельных папок бок о бок внутри Проводника для мгновенного перетаскивания (Drag & Drop) или перемещения/копирования файлов из одной папки в другую в 1 клик',
    'Luma Office 1.5.4 — 140+ формул Microsoft Excel на русском и английском (СУММЕСЛИМН, ВПР, ГПР, ПРОСМОТРX/XLOOKUP, ИНДЕКС/ПОИСКПОЗ, ЕСЛИМН, ПЛТ/БС/ПС/ЧПС/КПЕР, МЕДИАНА, КОРРЕЛ, ПРЕДСКАЗ, ПРЕОБР, СЦЕПИТЬ/ОБЪЕДИНИТЬ), мастер формул с поиском и категориями, навигация стрелками и мгновенный ввод с клавиатуры + Ctrl+Z; полностью починены 12 настоящих CSS-анимаций и 10 живых переходов слайдов в PowerPoint (включая F5 и порядок показа), добавлен редактор SmartArt/диаграмм, Delete и Ctrl+Z; в Word исправлены поиск/замена (только по тексту без порчи HTML), размер шрифта и кликабельная прокрутка заголовков в Навигации',
    'Питание и Батарея (Battery Care 50%–100% + чистый интерфейс сна) — добавлена фирменная защита аккумулятора ноутбука с ограничением заряда на выбранном проценте (60% / 80% / 85% / 90% / 100%) и визуальной шкалой; убраны все лишние технические надписи в заголовках и улучшен лаконичный дизайн настроек сна при бездействии',
    'Исправлены периодические вылеты LumaOS.exe каждые 15–30 минут (LumaCore 1.4.7 Stability) — найдена и полностью устранена утечка Win32-колбэков Go (syscall.NewCallback внутри фонового цикла исчерпывал лимит 2000 колбэков Windows); все колбэки переведены на постоянные синглтоны, добавлена защита от падений COM/WebView2, очистка кэшей и panic-recovery во всех фоновых воркерах для круглосуточной стабильной работы',
  ],
  '1.5.3 (Carbon)': [
    'ОБНОВЛЕНИЕ LUMA OS 1.5.3 (CARBON · C-6 · ЯДРО 1.4.6) — ФИРМЕННЫЙ ALT+TAB ПОВЕРХ ВСЕХ ОКОН + WIN+D ВОЗВРАТ В LUMA OS, 4-СЛОЙНЫЙ ГАРАНТИРОВАННЫЙ ПЕРЕХВАТ ВХОДЯЩИХ СООБЩЕНИЙ, АУТЕНТИЧНЫЙ MICROSOFT-ИНТЕРФЕЙС LUMA OFFICE (WORD · EXCEL · POWERPOINT) В 20× МОЩНЕЕ И НАСТРОЙКИ СНА ПРИ БЕЗДЕЙСТВИИ В БАТАРЕЕ',
    'Флагманский Alt+Tab поверх ВСЕХ окон Windows (Chrome, Telegram, игры) + замена Win+D на возврат в Luma OS — обновлённый Win32 WH_KEYBOARD_LL перехватчик мгновенно поднимает стеклянный Luma Switcher поверх любого стороннего окна с карточкой «Главная · Luma OS» на первом месте, поиском окон, мини-превью и плавным возвратом фокуса; нажатие Win+D теперь всегда возвращает на главный экран Luma OS без сворачивания оболочки',
    '4-слойный гарантированный перехват входящих уведомлений (Telegram, WhatsApp, Discord, VK, Viber, Почта) — полностью исправлена задержка NTFS ModTime и потеря сообщений в WPN SQLite/WAL через share-safe Win32 CreateFileW, добавлен перехват нативных всплывающих окон Telegram Desktop (даже при выключенных системных уведомлениях Windows!), дельта-детектор +1 нового сообщения без спама, мгновенная всплывающая карточка с круглой аватаркой, звуковой сигнал и кнопка «Проверить уведомление»',
    'Luma Office 1.5.3 — копия понятного интерфейса Microsoft Word (#185ABD), Excel (#107C41) и PowerPoint (#B7472A) с 20× расширенным функционалом: подписанные группы ленты Ribbon, меню Backstage «Файл» с шаблонами, строка быстрого поиска инструментов (Tell Me), Word (сетка таблиц 10×8, Формат по образцу, уравнения/символы, сантиметровая линейка, дерево навигации, типографика, озвучка текста, примечания), Excel (55+ формул на русском и английском — СУММ/ВПР/ЕСЛИ/СЧЁТЕСЛИ/ПЛТ/МЕДИАНА, маркер автозаполнения Fill Handle, сводные таблицы, условное форматирование с гистограммами, 6 графиков, автофильтр, живая строка состояния Среднее/Количество/Сумма) и PowerPoint (9 макетов, 15+ фигур, SmartArt, рисование пером/маркером, 12 тем, 10 переходов, 10 анимаций, сортировщик слайдов и режим докладчика F5 с лазерной указкой)',
    'Настройки автоматического перехода в сон и отключения экрана при бездействии в разделе «Питание и Батарея» — прямая синхронизация со схемой питания Windows (powrprof.dll) отдельно для питания от сети (ПК) и от батареи (ноутбук), гибернация, блокировка перед сном, защита от сна при видео/записи, живой таймер бездействия (GetLastInputInfo) и режим «Кофеин» (SetThreadExecutionState)',
  ],
  '1.5.2 (Carbon)': [
    'ОБНОВЛЕНИЕ LUMA OS 1.5.2 (CARBON · C-6 · ЯДРО 1.4.5) — ZERO-FREEZE ЗАПИСЬ ЭКРАНА, ЧИСТЫЕ ВХОДЯЩИЕ СООБЩЕНИЯ TELEGRAM/WHATSAPP С АВАТАРКАМИ, CAPCUT-КЛАССА CUT STUDIO, PRO CODE STUDIO С ПОДСВЕТКОЙ ОШИБОК И АВТОСОХРАНЕНИЕМ, ПОЛНЫЙ OFFICE STUDIO (WORD · EXCEL · POWERPOINT), LUMA AI 3.0, СВОЙ ALT+TAB, 100% ПЕРЕВОД ИНТЕРФЕЙСА И ВИДЖЕТОВ, 115+ ОПЦИЙ КОНСТРУКТОРА ВИДЖЕТОВ, РАСШИРЕННЫЕ СЦЕНАРИИ И ИСПРАВЛЕНИЕ ПРИВАТНОГО СТОЛА',
    'Исправлена критическая ошибка зависания при записи экрана — внедрён нативный Zero-Freeze AVI-рекордер в ядре LumaCore 1.4.5 без блокировки WebView2/Topmost и добавлена горячая клавиша мгновенной остановки Ctrl+Shift+S',
    'Исправлены уведомления Telegram, WhatsApp, Discord и других мессенджеров — убраны системные счётчики непрочитанных («3048413 непрочит.»); теперь приходят только реальные входящие сообщения от пользователей с круглой аватаркой, отправителем и текстом сообщения',
    'Глобальное обновление Luma Cut Studio до уровня CapCut — многодорожечный таймлайн (V1, V2 PiP с режимами наложения, T1, A1 + бит-маркеры), маски (круг/сердце/звезда) и хромакей, ключевые кадры, кривые скорости, реверс, стоп-кадр, стабилизация, трекинг, LUT + кривые RGB + ретушь + стилизация, библиотека музыки/SFX и Seed Audio, диктофон озвучки и фильтры голоса, автосубтитры + перевод + TTS + кисть рисования, EditPilot ИИ-монтаж текстом, генераторы сцен/арта, сценарий→видео, Long→Shorts, цифровой аватар, встроенный Design Studio и конвертер/транскрипт (.srt/.txt)',
    'Обновлённый Luma Code Studio Pro — исправлена потеря кода при сворачивании (сохранение состояния окон + автосохранение сессии в реальном времени), добавлена live-диагностика ошибок кода в реальном времени (красные маркеры в строках + кликабельная панель «Проблемы») и мощный многовкладочный встроенный Терминал с историей команд',
    'Luma Office Studio 1.5.2 (полный Word · Excel · PowerPoint) — многовкладочная лента Ribbon, 35+ формул Excel (SUM, AVERAGE, IF, VLOOKUP, COUNTIF, SUMIF, MEDIAN, STDEV...), границы, объединение, закрепление, условное форматирование, автофильтр, 6 типов графиков; Word со стилями, колонками, водяными знаками, оглавлением и комментариями; PowerPoint с 12+ фигурами, SmartArt, анимациями и режимом показа F5 с лазером и маркером',
    'Luma AI 3.0 (Luma Lang 3.0 + Luma Code 3.0) — живой двух-источниковый веб-синтез (Wikipedia + DuckDuckGo Instant Overview), встроенный переводчик текста, суммаризатор/корректор, финансовый и кредитный калькулятор, динамические сравнения A vs B и инженерные руководства',
    'Собственный переключатель окон Alt+Tab внутри Luma OS (перехватывает системный Alt+Tab Windows и плавно переключает между встроенными окнами Luma и открытыми программами Windows) + 100% полный перевод всех виджетов, окон и элементов интерфейса на выбранный язык',
    'Конструктор своих виджетов Pro (115+ опций — запуск любых программ ПК, сайтов, команд терминала, цепочек макросов, мини-кнопок, фото, градиентов, свечения и живых данных) + Расширенные Сценарии (17 триггеров, условия «И», 22 действия, цепочки, 12 шаблонов) + Исправлено зависание Приватного рабочего стола + Объединение каталога виджетов по семействам + Убраны толстые рамки на арт-виджетах',
  ],
  '1.5.1 (Carbon)': [
    'ОБНОВЛЕНИЕ LUMA OS 1.5.1 (CARBON · C-6) — ВСТРОЕННЫЙ LUMA OFFICE STUDIO (WORD · EXCEL · POWERPOINT), ЖИВОЙ МОСТ УВЕДОМЛЕНИЙ TELEGRAM/МЕССЕНДЖЕРОВ, РЕЗИНОВАЯ АНИМАЦИЯ DYNAMIC ISLAND, LUMA AI 2.0, LUMASHIELD 2.0 (175+ ПРАВИЛ), 4K UHD ОБОИ, УМНАЯ ПАНЕЛЬ УПРАВЛЕНИЯ, ПРОКАЧАННЫЕ CODE STUDIO, CUT STUDIO, КАЛЕНДАРЬ, КОРЗИНА И ТЕРМИНАЛ',
    'Встроенный Luma Office Studio (Docs / Sheets / Slides) — полноценный нативный офисный пакет прямо внутри Luma OS: без ошибок открывает настоящие .pptx (с картинками, фигурами, текстом, таблицами и заметками), .docx, .xlsx, .odp, .odt, .ods, .csv, .md, .html, .rtf, .txt, .json и сохраняет/экспортирует в ЛЮБОЙ формат (.pptx, .docx, .xlsx, .pdf, .png, .html, .md, .csv, .tsv, .rtf, .txt, .json)',
    'Надёжные уведомления из Telegram и других мессенджеров + Резиновая анимация Dynamic Island — нативный мост Windows WPN DB/WAL + отслеживание счётчиков непрочитанных окон Telegram, Discord, WhatsApp, Viber, VK, Slack, Teams мгновенно доставляет сообщения в Центр уведомлений и запускает упругую «резиновую» анимацию расширения и сжатия Dynamic Island',
    'Luma AI 2.0 (Luma Lang 2.0 + Luma Code 2.0) — многоходовая память диалога, умный разбор и ревью кода, решение квадратных уравнений, ассистент для писем/планов/чеклистов и 45+ готовых инженерных рецептов без API и интернета',
    'Ультрачёткие 4K UHD (3840×2160) главные обои Carbon 1.5.1 — переработаны все 3 фирменных арта Carbon без малейшего «мыла» при полном сохранении всей галереи обоев прошлых версий',
    'Улучшенная Панель управления Carbon + чистый трей-центр — добавлены Ночной свет, Игровой режим, Mute микрофона, 3-позиционный план питания, акцентные цвета, переключатель вывода/ввода звука, кнопка «Свернуть / Развернуть» Центр уведомлений и автозакрытие при отводе курсора; из всплывающего окна трея убраны лишние кнопки (Заблокировать, Сон, Корзина, EXE) и дублирующие настройки панели задач',
    'Точный таймер и секундомер в виджете рабочего стола — исправлено отображение секунд (чёткий непереносимый MM:SS, пресеты 5/15/25/45 мин, режим секундомера); добавлена умная фиксация всех контекстных меню ПКМ внутри экрана (SmartContextMenu)',
    'Супер-антивирус LumaShield 2.0 (175+ правил) — защита от стилеров Telegram/Discord/браузеров/криптокошельков, проверка архивов ZIP и VBA-макросов Office, перетаскивание отдельного файла на проверку и экспорт полного отчёта аудита в .md',
    'Прокачанные приложения системы — Luma Code Studio Pro (чистый старт с пустого файла без лишних системных файлов, подсветка синтаксиса, миникарта, автозакрытие скобок, Ctrl+Shift+P, сниппеты и форматтер), Luma Cut Studio Pro (выбор кодека VP9/VP8/H.264/AV1, 480p–1080p, 24–60fps, битрейт, 8 переходов, 6 Ken Burns, 8 анимаций титров, 12 LUT, кино-эффекты и Undo/Redo), Календарь Pro (почасовой таймлайн Дня, категории, быстрый ввод «15:30 Встреча», живые напоминания), Корзина Pro (массовые операции, фильтры, превью и автоочистка) и +20 новых системных команд Терминала',
  ],
  '1.5 (Carbon)': [
    'ФЛАГМАНСКИЙ РЕЛИЗ LUMA OS 1.5 (CARBON · C-6) — ПАНЕЛЬ УПРАВЛЕНИЯ CARBON (TAB / ПРАВЫЙ ВЕРХНИЙ УГОЛ 1/4×1/2) + ЦЕНТР УВЕДОМЛЕНИЙ TELEGRAM/ОС, ДВОЙНАЯ ПАНЕЛЬ ЗАДАЧ, СУПЕРКОНФИДЕНЦИАЛЬНОСТЬ AES-256-GCM, LUMA CODE STUDIO (VS CODE), LUMA CUT STUDIO (CAPCUT), СЦЕНАРИИ АВТОМАТИЗАЦИИ, КОНСТРУКТОР СВОИХ ВИДЖЕТОВ, КОРЗИНА LUMA OS, 3 ТОЧКИ УПРАВЛЕНИЯ ОКНОМ, АНИМАЦИИ СТИЛЬ ОС И ЗАРЯД МЫШЕК IO / AJAZZ / ARDOR GAMING',
    'Флагманская Панель управления Carbon (клавиша Tab или наведение на правый верхний угол) — компактная редактируемая панель 1/4 ширины × 1/2 высоты экрана с добавлением/перестановкой плиток, рабочим компактным Скриншотом (Win32 JPEG ~120 КБ) и Записью экрана (WebM VP9 с выбором битрейта), сворачиваемым списком BT/2.4GHz устройств, Менеджером функций ОС и Единым центром уведомлений Telegram и системы прямо снизу',
    'Двойная панель задач + Прямой запуск приложений — в Настройках → Панель задач можно разделить интерфейс на 2 панели (верхняя: весь функционал и трей, нижняя: запущенные и закреплённые приложения), а также закрепить любые программы ПК для мгновенного открытия в 1 клик',
    'Суперконфиденциальность (AES-256-GCM Приватный рабочий стол) — изолированное пространство с шифрованием *.lumavault на диске, входом по паролю или без пароля (стелс-режим), экстренной блокировкой Esc×2 и полной невидимостью файлов снаружи',
    'Luma Code Studio (IDE в стиле VS Code) + Luma Cut Studio (Видеоредактор в стиле CapCut) — полноценный редактор кода с файловым деревом ПК, вкладками, живым HTML-превью и встроенным терминалом, а также нелинейный видеоредактор с мультидорожечным таймлайном, 10 кино-LUT фильтрами, титрами, переходами и экспортом в .webm',
    'Сценарии автоматизации («Если действие → результат») + Конструктор своих виджетов (Фото + JS) + Системная Корзина + Виджет заряда ПК и всей периферии',
    'Поддержка заряда мышек IO (Nova SE), Ajazz (AJ159/AJ179/AJ199/AK820) и Ardor Gaming (Edge Air / Rukh / Phantom) по 2.4GHz HID (Compx CX52850 / JM03), фильтрация Wi-Fi USB-адаптеров, сворачиваемая секция BT/2.4GHz, кнопки окна «3 точки», анимации Стиль ОС, улучшенный Календарь (Неделя/Повестка/Pomodoro/.ics), переименование стилей «Классический» и «Модерн» и 3 новых карбоновых обоев (все старые сохранены!)',
  ],
  '1.4 (Boron)': [
    'ГЛОБАЛЬНЫЙ РЕЛИЗ LUMA OS 1.4 (BORON · B-5) — КАЛЕНДАРЬ, ПОЛНОЕ ОБНАРУЖЕНИЕ БЕСПРОВОДНЫХ МЫШЕК (BLUETOOTH + 2.4GHZ РАДИОКАНАЛ), СЕРВИС СКОРОСТИ И DPI МЫШИ, DEVELOPER SDK v3.0 ДЛЯ ТЕМ И ПЛАГИНОВ, ЯДРО LUMACORE 1.5 + ЗАЩИТА LUMASHIELD 1.5, КИНЕМАТОГРАФИЧНАЯ АНИМАЦИЯ ОБНОВЛЕНИЯ, 4 УНИКАЛЬНЫХ СТУДИЙНЫХ АРТА ОБОЕВ, НЕДЕЛЬНЫЕ ВИДЖЕТЫ ПОГОДЫ С КАРТИНКАМИ И НАСТРОЙКА ПРОЗРАЧНОСТИ/ФОНА КАЖДОГО ВИДЖЕТА',
    'Встроенный Календарь Luma OS — полноценное приложение календаря с сеткой месяца, созданием событий и напоминаний с цветными тегами, лентой ближайших дел, открытием по клику на дату в панели задач и новым виджетом Календаря на рабочем столе',
    'Исправлено обнаружение ВСЕХ беспроводных мышек, клавиатур и наушников (Bluetooth / BLE / 2.4GHz радиоканал) — новый глубокий HID/BT сканер LumaCore 1.5 распознаёт 35+ брендов (Logitech, Razer, SteelSeries, HyperX, Corsair, Keychron, Asus ROG, Attack Shark, Lamzu, Pulsar, Glorious, Ajazz, Redragon, Bloody, Apple, Sony, Microsoft и др.) и отображает все подключённые устройства даже без стандартного отчёта батареи Windows',
    'Системный сервис «Мышь и DPI» — нативный Win32-контроллер чувствительности указателя и эффективного DPI (eDPI) в реальном времени (SPI_SETMOUSESPEED, Raw Input / отключение акселерации, настройка калибровки сенсора 400–6400 DPI, 5 пресетов для офиса и игр, строки прокрутки колеса и живая тест-площадка отклика курсора)',
    'Developer SDK & Plugin/Theme API v3.0 — открытый REST API (/api/v3/sdk, /api/v3/themes, /api/v3/plugins), глобальный JS SDK window.LumaSDK и встроенная «Студия SDK v3.0» в окне Расширений: любой разработчик может создать, импортировать (.luma-theme.json / JSON-манифест плагина), экспортировать и применить свою тему или плагин за 1 клик',
    'Обновлённое ядро LumaCore 1.5 и защита LumaShield 1.5 — 85+ эвристических и поведенческих правил безопасности (+14 новых правил против инъекций, криптомайнеров и стилеров), встроенный Аудит файла Hosts (DNS Integrity Auditor) и диагностика памяти ядра со сборкой мусора в реальном времени',
    'Кинематографичная анимация обновления Boron Cinema — полноэкранный 60 FPS GPU-интерфейс обновления с орбитальными кольцами Boron-5, светящимся ореолом прогресса, телеметрией скорости МБ/с, 4-этапной шкалой и кнопкой «Предпросмотр анимации обновления» прямо в Настройках → Обновления',
    '4 уникальных студийных обоев + 2 новых живых обоев (все старые сохранены!) — флагманская 3D-призма Boron 1.4, альпийский закат Boron Dusk Horizon, сапфировый шёлк Cobalt Silk Fold, золотое затмение Solar Eclipse Gold и 2 плавных живых градиента Boron & Cobalt',
    'Новые виджеты 1.4 + индивидуальная прозрачность и фон виджетов — «Погода на неделю (Арт · 7 дней)» с живописными иллюстрациями неба и реальным прогнозом Open-Meteo на 7 дней, «Часы Студия Pro» (Швейцарский хронограф, Стеклянный Флип, Двойной пояс), «Энергия Boron (ПК + Мыши/BT)», «Календарь (Месяц)», а также слайдер прозрачности 0–100%, выбор фона (Стекло / Тёмный / Светлый / Акцент / Прозрачный / Свой цвет) и размытия для каждого виджета',
  ],
  '1.3.1 (Beryllium)': [
    'ПАТЧ LUMA OS 1.3.1 (BERYLLIUM · Be-4) — МГНОВЕННАЯ РЕАКЦИЯ ALT+SHIFT НА ПАНЕЛИ ЗАДАЧ, РОДНЫЕ ИКОНКИ ВСЕХ ПРЕДУСТАНОВЛЕННЫХ ПРИЛОЖЕНИЙ, ПОЛНАЯ ГАЛЕРЕЯ ВСЕХ ОБОЕВ (БЕЗ УДАЛЕНИЯ СТАРЫХ), ВЫБОР ПЛЕЕРОВ В DYNAMIC ISLAND, ПАНЕЛЬ ЗАДАЧ СПРАВА И УНИКАЛЬНЫЙ СТУДИЙНЫЙ 3D-АРТ BERYLLIUM',
    'Мгновенная реакция раскладки клавиатуры на Alt+Shift / Ctrl+Shift / Win+Space — Win32-перехватчик (40 мс) + прямой push-сигнал в WebView2 + мгновенный отклик панели задач (0 мс задержки) без лишней нагрузки на ЦП',
    'Родные нативные иконки всех предустановленных и установленных приложений — SHGetFileInfoW с полной поддержкой прозрачности и авто-поиском через App Paths и System32 отображает настоящие значки Chrome, Steam, Telegram, Edge, Калькулятора, Блокнота, Проводника, Paint, PowerShell и всех программ на устройстве',
    'Полная накопительная галерея обоев — возвращены все любимые обои прошлых версий (Dark Glass Waves, Midnight Peaks, Emerald Forest, Helium 1.1, Lithium 1.2, Obsidian Silk) вместе с новыми артами и 6 живыми обоями: с каждым обновлением выбор только растёт',
    'Мультиплеерный Dynamic Island — если на устройстве открыто несколько плееров (например, Chrome, Spotify, VLC, Telegram), Dynamic Island показывает их полный список и позволяет отдельно включать, ставить на паузу, переключать треки или выбирать основной плеер',
    'Расположение панели задач справа — добавлена 4-я позиция «Справа» (Снизу / Слева / Справа / Сверху) с полной поддержкой автоскрытия, масштабирования ширины, отступов окон и резервирования рабочей области Windows Shell',
    'Новый уникальный студийный 3D-арт Beryllium (Be-4) — переработанный минималистичный 3D-рендер титаново-бериллиевой оптической призмы в чистом студийном стиле с мягким 3D-наклоном при наведении',
  ],
  '1.3 (Beryllium)': [
    'ГЛОБАЛЬНЫЙ РЕЛИЗ LUMA OS 1.3 (BERYLLIUM · Be-4) — ЯДРО LUMACORE 1.4, БЕЗОПАСНОСТЬ LUMASHIELD 1.4, ЗАРЯД РАДИОКАНАЛЬНЫХ 2.4GHz УСТРОЙСТВ И ЗАКРЕПЛЕНИЕ НА ПАНЕЛИ ЗАДАЧ, РЕАЛЬНЫЕ ИКОНКИ ПРИЛОЖЕНИЙ ПК, VRAM + ЧИП GPU В ДИСПЕТЧЕРЕ ЗАДАЧ, НОВЫЙ ALT+R ПОИСК, АДАПТИВНАЯ РАСКЛАДКА, ПРАВЫЕ УВЕДОМЛЕНИЯ, ТРЕКЕР СЕССИЙ 2.0 И НОВАЯ ИГРА «BERYLLIUM VANGUARD»',
    'Заряд всех беспроводных и 2.4GHz радиоканальных устройств + закрепление в Панели задач — нативный сканер HID UsagePage (0x06/0x20, 0x84/0x66) + Bluetooth/BLE/USB ContainerID отображает заряд мышек, наушников, клавиатур и геймпадов (включая донглы 2.4GHz) и позволяет закрепить любое устройство прямо на панели задач',
    'Объединены настройки «Питание и Батарея» — единый мощный раздел со статусом АКБ ноутбука, графиком разряда, беспроводными устройствами с кнопкой «На панель задач», планами питания, яркостью и действиями выключения/сна/перезагрузки',
    'Реальные нативные иконки установленных приложений ПК — быстрый Win32-экстрактор SHGetFileInfoW → PNG (0% PowerShell, кэш в RAM) показывает настоящие значки .exe/.lnk в каталоге программ, на рабочем столе, в Alt+R и в открытых окнах панели задач',
    'Клик по любому виджету на рабочем столе → мгновенный переход к настройкам именно этого виджета (стиль, форма, размер, города, валюты или переход в системные настройки)',
    'Новый минималистичный Alt+R (Luma Search) — чистое окно поиска, которое мгновенно находит установленные программы ПК, приложения Luma, любые настройки системы, службы Windows и предлагает поиск в Интернете (Google / DuckDuckGo / YouTube), если локально ничего не найдено',
    'Адаптивная раскладка клавиатуры в реальном времени — при смене языка клавишами Windows (Alt+Shift / Ctrl+Shift / Win+Space) индикатор Luma OS автоматически подстраивается и показывает текущую раскладку за <150 мс (Win32 GetKeyboardLayout, 4 мкс)',
    'Диспетчер задач с графиками Чипа GPU (%) И Видеопамяти VRAM (МБ/ГБ) — прямой опрос NVIDIA NVML + универсальный Win32 PDH без WMI показывает и загрузку графического чипа, и выделенную видеопамять с интерактивными графиками по наведению',
    'Ядро LumaCore 1.4 и Безопасность LumaShield 1.4 — расширено до 32+ эвристических правил (AMSI bypass, майнеры, стиллеры, UAC bypass), добавлен живой Сетевой монитор TCP-соединений (GetExtendedTcpTable) и Аудит автозагрузки (Startup Persistence Auditor)',
    'Умная Панель задач без дублей и лишнего — исправлено дублирование Steam/Chrome между библиотекой и окнами Windows, убрана лишняя кнопка редактора сетки с панели, добавлено ПКМ-меню («Открыть» / «Убрать с панели задач») для CPU/RAM, Буфера обмена и Полноэкранного режима',
    'Увеличенные уведомления справа + Трекер сессий и лимитов 2.0 — все уведомления теперь крупнее и плавно выезжают справа; трекер отслеживает и приложения Luma, и реальные окна Windows, поддерживает лимиты, Фокус-сессии, 7-дневную аналитику и экспорт CSV',
    'Новые обои, 4 новых виджета, 2 новые анимации и супер-игра «Beryllium Vanguard · Be-4» — флагманский кристалл Beryllium, 2 арта обоев, 3 живых CSS-обоев, виджеты «Беспроводной Хаб», «GPU + VRAM», «Мировые часы» и «Трекер привычек», анимации Beryllium Silk и Elastic Pop, а также новая roguelite-арена «Beryllium Vanguard» в пасхалке!',
  ],
  '1.2.3B (Lithium)': [
    'ПАТЧ LUMA OS 1.2.3B (LITHIUM) — ЯДРО LUMACORE 1.3B (TRUE ZERO-WMI ENGINE: WMI PROVIDER HOST 24% → 0%), ПОЛНЫЙ ОТКАЗ ОТ ФОНОВОГО POWERSHELL ПРИ ЗАПУСКЕ, КЭШ COREAUDIO, УМНЫЙ DYNAMIC ISLAND И ВОЗВРАТ ПЛАВНОГО 3D-НАКЛОНА БАННЕРА ЯДРА UI',
    'Устранена главная скрытая причина нагрузки на ЦП — WMI Provider Host (24% → 0%): функции GetWirelessDeviceBatteries, GetBluetoothStatus, ListHardwareDevices, fetchStaticSpecs и GetBatteryDetails полностью переписаны с WMI (Get-PnpDevice / Get-CimInstance) на чистые нативные Win32 API (setupapi.dll, powrprof.dll CallNtPowerInformation, системный реестр Windows). В ядре LumaCore 1.3B теперь 0 вызовов WMI',
    'Ноль фоновых запусков PowerShell на старте и в простое — раскладки клавиатуры считываются напрямую через Win32 GetKeyboardLayoutList (0.005 мс), аудиоустройства CoreAudio кэшируются на 60с и загружаются только при открытии Центра управления, а медиа-опрос SMTC для Dynamic Island запускается только при активном острове и открытом плеере/браузере (раз в 30с), с автоматической остановкой при скрытии острова (/api/kernel/island/toggle)',
    'Аудит Luma AI и Real-Time Guard — проверено, что локальный ИИ (Luma Lang / Code) потребляет 0% ЦП в простое (нет фоновых потоков, окно обёрнуто в React.memo), поэтому удалять ИИ не требуется; интервал Real-Time Guard увеличен до 45с, а фонового виджета батареи — до 120с',
    'Возвращён плавный 3D-наклон и мягкий параллакс ориентации баннера «Ядро UI» при наведении курсора — реализован через внешний perspective-контейнер с backface-visibility: hidden и хешированный Vite-бандл, благодаря чему картинка красиво наклоняется и никогда не пропадает в WebView2',
  ],
  '1.2.3 (Lithium)': [
    'ПАТЧ LUMA OS 1.2.3 (LITHIUM) — ЯДРО LUMACORE 1.3 (ZERO-POWERSHELL WIN32 ENGINE), КОЛОССАЛЬНАЯ ОПТИМИЗАЦИЯ ЦП И GPU, ИНТЕРАКТИВНЫЙ ДИСПЕТЧЕР ЗАДАЧ С ГРАФИКАМИ ПО НАВЕДЕНИЮ, АВТОСКРЫТИЕ ПАНЕЛИ ЗАДАЧ, ИСПРАВЛЕНИЕ БАННЕРА ЯДРА UI И ВСЕХ БАГОВ, ОБЛЕГЧЁННАЯ МИНИ-ИГРА LITHIUM ORBIT',
    'Обновлённое ядро LumaCore 1.3 (Zero-PowerShell Win32 Engine) — переписаны горячие системные пути на чистые Win32 API: процессы (CreateToolhelp32Snapshot + GetProcessTimes + GetProcessMemoryInfo), окна (EnumWindows с единым callback без утечек), фокус окон (SetForegroundWindow), буфер обмена (OpenClipboard) и сетевая телеметрия (iphlpapi GetIfTable). Сокращение фоновых запусков PowerShell на ~96%, радикальное снижение нагрузки ЦП',
    'Колоссальная оптимизация GPU и React-оболочки — изолированы часы панели задач (0 лишних рендеров корневой оболочки в простое), добавлен Zero-GPU Idle Freeze (автозаморозка всех CSS-анимаций и фонового опроса при сворачивании), memo-мемоизация окон и рабочего стола, оптимизированный blur 8–12 px и 1-клик режим «Турбо-Эко» в Настройках графики',
    'Улучшенный Диспетчер задач — выбор частоты опроса в реальном времени (0.5с / 1с по умолчанию / 2с / 5с + пауза) и новые интерактивные графики ЦП / ОЗУ / Диски / Сеть / GPU: при наведении курсора на любую точку графика отображаются перекрестие, маркер и точный процент/значение с временем до секунды + Мин/Сред/Пик',
    'Автоскрытие панели задач при простое — переключатель в «Настройки → Панель задач» и в ПКМ по панели задач: освобождает 100% рабочей области (поддержка позиций снизу, слева и сверху) и плавно выезжает при наведении курсора на край экрана',
    'Исправлено исчезновение баннера в «Настройки → Ядро UI» — изображение кристалла переведено в хешируемый бандл Vite + удалён конфликтный 3D-слой WebView2 + добавлены правильные Cache-Control заголовки ядра; исправлены двойное срабатывание Alt+R, запуск «Новая задача» в Диспетчере задач и версионные бейджи Shield 1.3',
    'Упрощена и сбалансирована мини-игра пасхалки «Lithium Orbit · Li-3» — добавлены 3 щита (♥ ♥ ♥) с неуязвимостью 1.5с при ударе, магнитное притяжение фотонов и сфер, восстановление щита за каждые 3 сферы слияния, более мягкий спавн осколков и плавная работа без тяжёлого shadowBlur',
  ],
  '1.2.2 (Lithium)': [
    'ПАТЧ LUMA OS 1.2.2 (LITHIUM) — СМЕНА РАСКЛАДКИ И 120+ ЯЗЫКОВ МИРА, ПОЧИНЕН ALT+R, ВЫБОР УСТРОЙСТВ ВВОДА/ВЫВОДА В ЦЕНТРЕ УПРАВЛЕНИЯ, ПРОЦЕНТ ЗАРЯДА БЕСПРОВОДНЫХ УСТРОЙСТВ, LUMASHIELD 1.3, ОБЪЁМ ОТВЕТОВ ИИ, 18 ЯЗЫКОВ СИСТЕМЫ, ПОРЯДОК ОКОН WINDOWS И ПАПКА СИСТЕМНЫХ ПРИЛОЖЕНИЙ НА ПАНЕЛИ ЗАДАЧ, DYNAMIC ISLAND 2.0, ДОБАВЛЕНИЕ УСТАНОВЛЕННЫХ ПРОГРАММ ПК, АНИМАЦИИ УДАЛЕНИЯ И ОТКАТ ВЕРСИЙ',
    'Смена раскладки клавиатуры и 120+ языков мира — живой индикатор раскладки на панели задач (RUS / ENG / ROM...), мгновенное переключение через Win32 API и каталог из 120+ языков всех регионов мира с поиском и добавлением в систему',
    'Починен Alt+R (Spotlight / Выполнить) — добавлен нативный Win32 перехватчик в WebView2 (независимый от русской/других раскладок) + захват событий в capture-фазе + резервная комбинация Ctrl+K',
    'Выбор устройств ввода и вывода звука в Центре управления — переключение динамиков, наушников, HDMI-аудио и микрофонов напрямую в выпадающем меню панели задач через Windows CoreAudio IPolicyConfig',
    'Процент заряда беспроводных устройств — считывание реального заряда Bluetooth/BLE/HID мышей, клавиатур, наушников и геймпадов (DEVPKEY_Bluetooth_BatteryLevel) в Центре управления, Настройках Bluetooth и разделе Батарея',
    'Обновлённое ядро безопасности и антивирус LumaShield 1.3 — 20+ эвристических правил (Ransomware, Stealer, LOLBins, Reverse Shell), детектор маскировки PE-заголовков под документы, анализ энтропии Шеннона, Real-Time Guard для Загрузок/Рабочего стола, сканирование процессов, Глубокая проверка и Белый список исключений',
    'Режим объёма ответов в Luma AI (Кратко / Баланс / Подробно) — мгновенное переключение детализации в шапке чата и настройках для Luma Lang 1.2, Luma Code 1.2 и всех облачных нейросетей',
    'Расширение языков системы до 18 — добавлены Польский, Турецкий, Итальянский, Португальский, Корейский, Арабский, Казахский, Хинди и Нидерландский',
    'Умная Панель задач — перетаскивание порядка открытых приложений Windows прямо на панели и кнопками ▲/▼ в настройках + сжатие всех системных модулей Luma в одну аккуратную папку «Luma Система»',
    'Dynamic Island 2.0 — живые spring-анимации реакции на действия пользователя (громкость, смена звука/раскладки, буфер обмена, запуск/удаление, сканирование) + 7-полосный музыкальный эквалайзер и пульсирующее свечение при воспроизведении аудио',
    'Добавление всех установленных приложений ПК на рабочий стол + Анимации удаления — сканер программ из меню Пуск и реестра с мультивыбором и упаковкой в папку + плавные анимации удаления виджетов и приложений',
    'Откат версии (Version Rollback) — безопасный возврат на любую предыдущую сборку Luma OS (1.2.1, 1.2.0, 1.1.0, 1.0.4, 1.0.3, 1.0.2b) с автосохранением локальных копий и полной сохранностью виджетов, папок и настроек',
  ],
  '1.2.1 (Lithium)': [
    'ПАТЧ LUMA OS 1.2.1 (LITHIUM) — АВТОАДАПТАЦИЯ МАСШТАБА ПОД ЛЮБОЙ ЭКРАН, УВЕЛИЧЕНИЕ ИКОНОК И РЕДАКТОР ПРИЛОЖЕНИЙ, ОПТИМИЗАЦИЯ GPU, УЛУЧШЕННЫЙ ПРОВОДНИК PRO, ИМЕНА ОТКРЫТЫХ ПРИЛОЖЕНИЙ И ПОРЯДОК В ПАНЕЛИ ЗАДАЧ, ТОЧНЫЕ ФОНОВЫЕ ПРОЦЕССЫ И БАТАРЕЯ, УМНЫЙ LUMA AI (2 МОДЕЛИ + ОТКЛЮЧЕНИЕ), ЕЖЕДНЕВНОЕ АВТООБНОВЛЕНИЕ И PLUGIN API 2.0',
    'Автоматическая адаптация масштаба экрана (Ноутбук ↔ Большой монитор) — система автоматически вычисляет оптимальный масштаб интерфейса относительно экрана ноутбука (1440×900), чтобы на больших мониторах элементы не выглядели мелкими + ручная точная настройка 85%–135%',
    'Увеличение иконок и редактор приложений прямо в Настройках — живой ползунок размера иконок (36–72 px / Компакт, Стандарт, Крупные, XL) для рабочего стола и библиотеки + встроенное редактирование имени, иконки, категории и команды приложений',
    'Оптимизация графических процессов (GPU) и отдельная панель настроек — профили «Ультра», «Баланс», «Производительность (минимум GPU)» и «Эко-ноутбук», отключение тяжёлого размытия backdrop-filter и теней, автопауза живых обоев при открытых окнах и выбор интервала опроса телеметрии (1.5 / 3 / 6 сек)',
    'Улучшенный Проводник Luma Pro — кликабельная навигация по крошкам (Breadcrumbs), быстрые фильтры типов файлов (Папки, Изображения, Код, Документы, Медиа), закреплённые избранные папки, нативный предпросмотр картинок и встроенное редактирование и сохранение текстовых/код-файлов прямо в панели предпросмотра',
    'Выбор отображения открытых приложений и перестановка порядка в Панели задач — переключатель в настройках «Названия приложений (Chrome, Steam, Telegram...) / Заголовки окон / Компактно», скрытие служебных UWP-окон Windows + перетаскивание порядка приложений прямо на панели задач и кнопки ▲/▼ в настройках',
    'Исправлены фоновые процессы в Диспетчере задач — вместо накопленных CPU-секунд теперь отображается реальная мгновенная нагрузка ЦП (0–100%), приватная/рабочая ОЗУ, число потоков, системные описания процессов и точное разделение Приложений, Фоновых и Системных процессов',
    'Точное чтение состояния батареи Windows — трёхуровневый опрос (GetSystemPowerStatus + Win32_Battery без прав администратора + ACPI WMI + кэшированный PowerCfg BatteryReport XML) с честным статусом (Заряжается / Заряжено от сети / Подключено, не заряжается / От батареи), реальным износом и циклами',
    'Умный Luma AI с 2 отдельными вариациями + полноценный Markdown и Кнопка отключения ИИ — «Luma Lang 1.2» (языковая и энциклопедическая модель с базой 45+ тем и живым поиском Wikipedia — отвечает на «Кто такой Пушкин?» без вывода кода!) и «Luma Code 1.2» (программист на 12 языках) + рендеринг заголовков, списков, жирного текста и формул + полное отключение ИИ в настройках для экономии ресурсов',
    'Ежедневная автопроверка обновлений GitHub + шкала версий (X.Y.Z) и новая анимация обновления — автоматическая проверка раз в 24 часа, всплывающее окно с уровнем обновления (1-я цифра = Глобальное, 2-я = Большое обновление версии, 3-я = Патч) и списком изменений, а также обновлённый анимированный экран загрузки с орбитальным кольцом и пошаговым статусом',
    'Luma Plugin API v2.0 и 11 расширений — новая шина ядра /api/kernel/plugins/api с живым запуском и тестированием каждого расширения (RAM Optimizer, Temp Sweeper, NetPing Monitor, Battery Guard, LumaShield Auditor, GPU Booster, OTA Watcher и др.)',
  ],
  '1.2.0 (Lithium)': [
    'LUMA OS 1.2.0 (LITHIUM) — МУЛЬТИЗАДАЧНОСТЬ (8-СТОРОННИЙ РЕСАЙЗ, SNAP LAYOUTS, ВИРТУАЛЬНЫЕ СТОЛЫ), ВЕЧНОЕ СОХРАНЕНИЕ ВИДЖЕТОВ, АВТОНОМНЫЙ LUMA AI С ГОЛОСОВЫМ ВВОДОМ, НАТИВНЫЙ КАЛЬКУЛЯТОР, АНАЛИТИКА БАТАРЕИ НОУТБУКА, НАТИВНЫЕ СЛУЖБЫ WINDOWS В UI LUMA, ПОЛНЫЙ ПЕРЕВОД 9 ЯЗЫКОВ И АНИМАЦИИ ОБОЕВ',
    'Полноценная мультизадачность — изменение размера окон за все 8 сторон и углов (с сохранением геометрии), меню макетов Snap Layouts (50/50, 65/35, 4 четверти 2×2, верх/низ, центр), Aero-привязка при перетаскивании к краям экрана + Обзор окон (Alt+W) с Виртуальными рабочими столами (Стол 1 / 2 / 3) и разделением экрана в 1 клик',
    'Вечное сохранение виджетов, папок и ярлыков при любых обновлениях — единый постоянный профиль WebView2 (%APPDATA%/LumaOS/WebView2 с автомиграцией со старых версий) + дублирование в дисковое хранилище LumaStateVault (%APPDATA%/LumaOS/luma_permanent_state.json + .bak) + Экспорт и Импорт резервной копии JSON в настройках',
    'Автономный Luma AI без API-ключей + Голосовой ввод и озвучка — встроенный движок LumaNano 1.2 внутри ядра (диагностика ПК, генерация лёгкого кода Python/JS/Go/HTML/SQL/PowerShell, математика, SHA-256, пароли, JSON) работает сразу из коробки + кнопка микрофона (Web Speech API) и голосовой синтез ответов',
    'Собственный системный Калькулятор Luma — 4 режима в отдельном окне: Стандартный (память MC/MR/M+/M- и клавиатура), Инженерный (sin/cos/tan/log/ln/n!/π/e), Программист (HEX/DEC/OCT/BIN + побитовые операции) и Конвертер величин (длина, масса, температура, данные, скорость, время) + история вычислений',
    'Адаптированные службы и утилиты Windows в стиле Luma OS — реальный Диспетчер устройств (дерево PnP/оборудования), Диспетчер служб с кнопками Запуск/Стоп/Перезапуск, Сеть и Брандмауэр с живым Ping-тестером, Микшер звука, Блокнот Pro с открытием/сохранением файлов и Очистка временных файлов диска',
    'Новые настройки батареи и экранного времени (для ноутбуков) — график разряда и зарядки за 24 часа с подсветкой интервалов зарядки, счётчик циклов, здоровье АКБ (FullCharge / Design mWh), мощность (Вт) и напряжение (В), график экранного времени за 7 дней и демо-режим ноутбука для стационарных ПК',
    'Галерея обоев + 4 кинематографичные анимации смены и живые обои — 2 новых флагманских арта (Lithium Crystal & Obsidian Silk), 3 живых анимированных mesh-фона и выбор анимации при смене обоев (Сфера Iris, Сияние Bloom, Луч Wipe, Фокус Morph)',
    'Новые виджеты и форма «Грань» (Chamfer) — Аналитика Батареи Pro, Luma AI Мини-чат, Мировые часы (3 города), Экранное время Pro и Спектр Lithium Li-3 + полный перевод всех разделов системы на 9 языков и обновлённая пасхалка «LITHIUM ORBIT · Li-3» с 3 электронами',
  ],
  '1.1.0 (Helium)': [
    'LUMA OS 1.1.0 (HELIUM) — LUMACORE 1.1, LUMASHIELD 1.1, СЖАТИЕ ВКЛАДОК (100+ ПРИЛОЖЕНИЙ), 9 ЯЗЫКОВ, ИИ-АССИСТЕНТ (GEMINI / OPENAI / CLAUDE / OLLAMA), ЛОКАЛЬНЫЙ АНТИВИРУС, ОБНОВЛЕНИЕ ЧЕРЕЗ GITHUB С ПРОГРЕСС-БАРОМ, РЕЖИМ ОБОЛОЧКИ WINDOWS И ПАСХАЛКА HELIUM ORBIT',
    'Умное сжатие вкладок панели задач (100+ приложений) и изменение размера панели — вкладки автоматически сжимаются от полных до компактных иконок, добавлены колесо прокрутки, кнопка «Все окна (N)» с мгновенным поиском и живое растягивание высоты/ширины панели задач (38–84 px) за край или ползунком',
    'Мультиязычность всей системы (9 языков) — Русский, English, Română, Deutsch, 中文, Français, Español, Українська, 日本語 с мгновенным переключением интерфейса, меню и локали дат',
    'Обновлённое ядро LumaCore 1.1 и Ядро Безопасности LumaShield 1.1 + Локальный антивирус — пассивный user-space сканер без конфликтов с Windows Defender (отображает его статус), быстрая/выборочная проверка, аудит автозагрузки, безопасный EICAR-тест, изолированный карантин (восстановление/удаление) и журнал аудита',
    'Настоящая проверка версий и автообновление прямо с GitHub — исправлена проверка релизов (сравнение SemVer по GitHub API), добавлена загрузка нового EXE с живым прогресс-баром (%, МБ/с, SHA-256, проверка PE32+) и моментальным переходом на новую версию',
    'Флагманский арт Luma OS 1.1 (Helium) в «Ядро UI» + анимация и мини-игра пасхалка — глянцевая 3D-сфера с параллаксом (в духе ColorOS 16), по клику запускается орбитальная анимация пробуждения и игра «HELIUM ORBIT» с 60 FPS графикой, комбо, звуком и рекордами',
    'Питание ПК прямо в «Пуск» и режим оболочки поверх Windows — выключение ПК, перезагрузка, сон, блокировка и выход с подтверждением; настройки «Во весь экран при запуске», «Автозапуск с Windows (HKCU Run)» и «Скрыть панель задач Windows» (Shell_TrayWnd + SPI_SETWORKAREA для работы Chrome поверх панели Windows) с гарантированным автовосстановлением при выходе',
    'Интеграция нейросетей (Luma AI) — Google Gemini, OpenAI, Anthropic Claude, DeepSeek, OpenRouter, Groq, локальная Ollama/LM Studio и любой свой OpenAI-совместимый API через Go-шлюз без CORS, с контекстом ПК и отправкой команд в терминал',
    'Диспетчер задач как в Windows 11 + системные службы и утилиты — тепловая карта ЦП/ОЗУ, запуск новой задачи, графики Производительности (ЦП/ОЗУ/Диски/Сеть/GPU), Автозагрузка, реальные Службы ОС + новое окно «Службы и утилиты» (Калькулятор, Блокнот с сохранением на диск, Микшер, 16 системных апплетов Windows)',
    'Исправлена обрезка часов + кастомные валюты и обои — исправлена обрезка текста даты и цифр часов на любых скруглениях и размерах сетки; в виджете валют добавлены живые курсы, выбор базовой валюты (RUB/MDL/USD/EUR/RON/UAH/CNY/BTC и др.) и конвертер; добавлен движок обоев с размытием и затемнением',
  ],
  '1.0.4': [
    'LUMA OS 1.0.4 — СИСТЕМНЫЙ ПРОВОДНИК, ДИСПЕТЧЕР ЗАДАЧ, РЕАЛЬНЫЕ ОКНА ОС В ПАНЕЛИ ЗАДАЧ, ПАПКИ ДЛЯ ВСЕГО, ИЗМЕНЕНИЕ РАЗМЕРА И ФОРМЫ В СТИЛЕ ОС, ГАЛЕРЕЯ ВАРИАНТОВ ВИДЖЕТОВ, 8 НОВЫХ ТЕМ И ALT+R',
    'Реальные открытые приложения ОС в Панели задач — все уже запущенные на ПК программы и любые новые открытые приложения автоматически отображаются в панели задач Luma с переключением фокуса окна по ЛКМ и закрытием по ПКМ',
    'Системный Проводник Luma (как в Windows) + все скрытые файлы — новое многовкладочное окно Проводника с Быстрым доступом, дисками, поиском, предпросмотром, созданием папок/файлов, вырезанием/копированием/вставкой, переименованием и удалением; в «Память и Файлы» и Проводнике отображаются ВСЕ файлы системы включая скрытые',
    'ПКМ по Панели задач -> «Диспетчер задач» и «Настроить панель задач» — полноценный Диспетчер задач с процессами системы Luma OS, открытыми приложениями, фоновыми процессами ОС (со снятием задачи), живыми графиками производительности и службами Luma',
    'Универсальные папки рабочего стола + изменение размера и формы в Стиле ОС — храните в папках приложения, файлы, папки диска, ссылки, команды и заметки; ПКМ по виджету или папке -> «Изменить размер и форму» (интерактивное растягивание по ячейкам + 5 форм: Скруглённый, Круг, Капсула, Квадрат, Лист)',
    'Новый каталог виджетов с вариантами дизайна — удобная навигация по категориям и живой выбор стиля и формы для часов (Квадратный, Круглый аналоговый, Прямоугольный, Перекидной, Капсула), батареи (Кольцо, Ячейка, Панель, Капсула), погоды, медиаплеера, системы и других виджетов',
    'Полный редизайн всех 8 тем + глубокая кастомизация — гармоничные палитры с живым применением фона, полупрозрачности и акцента ко всей системе, пользовательский акцентный цвет, масштаб интерфейса (90/100/110%), выбор шрифта и настройки панели задач',
    'Прокачаны Терминал Pro (ps, top, kill, explorer, taskmgr, find, theme, экспорт лога, поиск, сниппеты), Приложения (сортировка, фильтр запущенных, редактирование, пакетно в папку) и Ядро LumaCore (4 вкладки: Монитор, JSON-RPC редактор, Журнал событий, Код с поиском)',
    'Горячая клавиша Alt+R — быстрый запуск / Spotlight и выполнение команд (explorer, taskmgr, URL, пути к файлам) переведены на Alt+R',
  ],
  '1.0.3 (Hydrogen)': [
    'LUMA OS 1.0.3 (HYDROGEN) — ЯДРО UI, BLUETOOTH, ПАМЯТЬ И ПРОВОДНИК, ЭНЕРГОСБЕРЕЖЕНИЕ, МУЛЬТИВЫБОР, ЖИВАЯ ПРОЗРАЧНОСТЬ, АНИМАЦИИ И ПАНЕЛЬ ЗАДАЧ КАК В ОС',
    'Ядро UI (раздел в Настройках) — отдельная карточка устройства с именем ПК (редактируемым), реальной моделью устройства (Win32/DMI), версией ПО 1.0.3 (Hydrogen) и версией Ядра 1.0',
    'Расширенные Настройки + Поиск по настройкам — добавлены разделы: Ядро UI, Bluetooth (автоопределение адаптера и устройств ПК), Энергосбережение (планы питания и затемнение экрана), Память и Файлы (RAM, диски и встроенный проводник файлов), Приложения и Уведомления',
    'Мягкая светлая тема — снижена яркость белой палитры до спокойного матового камня/бумаги без слепящего белого фона',
    'Исправлена залипающая красная подсветка ячейки — очистка hover-состояния при выходе курсора, отмене перетаскивания и закрытии режима сетки',
    'Работающая прозрачность, размытие и 4 режима анимаций — ползунки Прозрачность, Blur и Скругление в реальном времени управляют окнами, панелью задач и виджетами; добавлен выбор анимаций: Стандарт, Пружина (Spring), Плавный поток (Glide) и Выкл',
    'ПКМ «Свойства» и «Удалить» + Мультивыбор приложений — просмотр веса файла, даты скачивания/изменения, пути и времени; выбор нескольких приложений разом (режим выбора или Ctrl+клик) для массового запуска, отправки на стол или удаления',
    'Панель задач как в полноценной ОС — все запущенные приложения и открытые окна отображаются в панели задач с живым статусом, превью-управлением и общим списком «Открытые задачи»',
  ],
  '1.0.2': [
    '✨ LUMA OS 1.0.2 — ФЛАГМАНСКИЙ РЕДИЗАЙН, ZERO-OVERLAP ШАПКА, LUMA SPOTLIGHT (CTRL+K), ЖИВОЙ ЭКВАЛАЙЗЕР НА ОСТРОВЕ И ПРЕМИАЛЬНАЯ ПОЛИРОВКА КАЖДОЙ ДЕТАЛИ',
    '🧭 ПОЛНОЕ ИСПРАВЛЕНИЕ ВЕРХНЕЙ ПАНЕЛИ (ZERO-COLLISION LAYOUT) — убрано наложение кнопок, Luma Island, часов и навигации на любых экранах (1024px–4K): внедрена сбалансированная 3-зонная шапка + отдельная элегантная панель переключения окон и телеметрии под ней',
    '⚡ LUMA SPOTLIGHT (CTRL+K / CMD+K) — новая универсальная командная палитра: мгновенный запуск приложений, переключение треков и окон, управление Luma Island, DND, темами, настройками и питанием прямо с клавиатуры',
    '🎵 МИНИ-ПУЛЬТ И ЖИВОЙ ЭКВАЛАЙЗЕР ПРЯМО НА LUMA ISLAND — анимированные полосы эквалайзера и кнопки ⏮ / ⏯ / ⏭ прямо на капсуле острова без необходимости открывать модальное окно',
    '🔊 ВСПЛЫВАЮЩИЙ АУДИО-ЦЕНТР — ползунок громкости больше не растягивает шапку: открывается в аккуратном стеклянном поповере с быстрыми пресетами (0 / 25 / 50 / 75 / 100%) и кнопкой Mute',
    '🎨 ПРЕМИАЛЬНЫЙ ДИЗАЙН MATERIAL 3 EXPRESSIVE — убран лишний визуальный шум, добавлены стеклянные грани (specular highlights), кастомные ползунки, переключение плотности интерфейса (Комфорт / Компакт), улучшенное приветствие с реальной погодой и ресурсами в Окне 1 и чистая панель конструктора в Окне 2',
    '📜 ПОЛНЫЙ АРХИВ ВСЕХ ВЕРСИЙ — восстановлена вся полная история релизов вместе с веткой Luma OS (1.0.2, 1.0.1, 1.0, 0.9-rc, 0.8-beta и полная хронология 3.0 → 1.0) и собран автономный LumaOS_1.0.2.exe',
  ],
  '1.0.1': [
    '🩹 ПАТЧ ПЕРВОГО ДНЯ — LUMA OS 1.0.1: ПОЛНОСТЬЮ РАБОЧИЕ МЕДИА, РЕАЛЬНАЯ ТЕЛЕМЕТРИЯ СИСТЕМЫ, АВТО-РЕГИОН И ПОГОДА, ОТКЛЮЧАЕМЫЙ LUMA ISLAND, ФИРМЕННЫЙ БРЕНДИНГ И ИСПРАВЛЕНИЕ 12 БАГОВ',
    '🎵 РЕАЛЬНОЕ ПЕРЕКЛЮЧЕНИЕ ТРЕКОВ И ОПРЕДЕЛЕНИЕ ИГРАЮЩЕЙ МУЗЫКИ — ядро Luma Core 1.0.1 читает реальный активный трек и исполнителя в вашей системе и отправляет реальные системные медиа-команды (Следующий / Предыдущий / Пауза-Воспроизведение) и реальную громкость через /api/kernel/media и /api/kernel/audio',
    '🏝️ ПОЛНОЕ ОТКЛЮЧЕНИЕ ДИНАМИЧЕСКОГО ОСТРОВА (LUMA ISLAND) — добавлен переключатель в Быстрых настройках, Настройках Luma Island, самом окне острова и виджете Быстрого управления Окна 2 с мгновенной синхронизацией между окнами',
    '💻 100% РЕАЛЬНЫЙ ПРОСМОТР ВАШЕЙ СИСТЕМЫ — точные реальные показания процессора (модель и % загрузки), ОЗУ (использовано/всего ГБ), всех дисков (реальный объём и заполнение), батареи и зарядки, а также реальной скорости сети (Мбит/с) без случайных заглушек',
    '🌍 АВТООПРЕДЕЛЕНИЕ ВАШЕГО РЕГИОНА И ПОГОДЫ — ядро автоматически определяет ваш город, регион, страну, часовой пояс и подгружает живую погоду Open-Meteo именно для вашего региона (с возможностью 1 кликом обновить регион или выбрать любой город)',
    '✨ 100% ФИРМЕННЫЙ БРЕНДИНГ LUMA OS — убраны все сторонние названия ОС и брендов; 18 виджетов переведены в 3 авторские линейки: Luma Pulse, Luma Aura и Luma Core; обновлены все 18 циферблатов, темы и дизайн в стиле Material 3 Expressive',
    '🛠️ ИСПРАВЛЕНО 12 НАЙДЕННЫХ БАГОВ — устранён перезапуск 1-секундного таймера виджетов, убраны эхо-штормы BroadcastChannel, исправлена контрастность светлой темы, исправлен конфликт ПКМ на карточках с «ПКМ = Назад», подключены реальные Корзина/Блокировка/Сон, добавлено закрытие модалок по клавише Escape и выпущен обновлённый LumaOS_1.0.1.exe',
  ],
  '1.0 (Luma)': [
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
  '3.0': [
    '🚀 LUMA OS 1.0 KERNEL & SHELL (MATERIAL 3 EXPRESSIVE) — РЕЛИЗНОЕ ЯДРО, ДВУХОКОННАЯ АРХИТЕКТУРА (СПИСОК ПО ГРУППАМ + ЯЧЕЙКИ 20×30), 18 ВИДЖЕТОВ И АВТОНОМНЫЙ EXE',
    '🧠 АРХИТЕКТУРА ЯДРА LUMA CORE — уровни HAL (Hardware Abstraction), Activity & Process Manager с Watchdog-перезапуском, JSON-RPC 2.0 IPC (127.0.0.1:49215), VFS и криптоядро LumaGuard (AES-256-GCM + PBKDF2-HMAC-SHA512 310k + HMAC-SHA256)',
    '✨ ДИЗАЙН MATERIAL 3 EXPRESSIVE — выразительные формы (Squircle / Scallop / Tonal Pills), пружинная микро-анимация, динамические палитры и мгновенное зажигание статуса «🟢 АКТИВНО»',
    '🪟 ОКНО 1 (СПИСКОМ ПО ГРУППАМ) — левая панель «Библиотека» с живым поиском и фильтрами + рабочая область с категориями по группам в режимах списка и карточек',
    '📐 ОКНО 2 (СЕТКА ЯЧЕЕК 20×30 — 600 КООРДИНАТНЫХ ЯЧЕЕК) — точная матрица 20×30 / 30×20 с видимыми координатами [X, Y], перемещением в любую ячейку в 1 клик, масштабированием W×H и синхронизацией между окнами',
    '🌍 18 ВИДЖЕТОВ В ЯДРЕ — 3 комплексные линейки виджетов (часы, быстрые плитки, живая погода, цифровой баланс, заметки, калькулятор, кольца активности, батарея, медиаплеер, календарь, помидор, рынки, CPU/GPU/RAM, диски, сеть, утилиты, питание и щит безопасности)',
  ],
  '2.9': [
    '🚀 ВЕРСИЯ 2.9 & LUMA KERNEL — ФИНАЛЬНАЯ СИНХРОНИЗАЦИЯ ОКОН И АВТОЗАПУСК ДЕМОНА',
    '🧠 АВТОМАТИЧЕСКИЙ ЗАПУСК LUMA CORE — оболочка сама поднимает фоновый демон ядра при старте, если порт 127.0.0.1:49215 свободен',
    '🪟 МНОГООКОННЫЙ РЕЖИМ — бесшовная работа Библиотеки, Быстрого запуска и Дашборда плиток Luma',
    '🛡️ СТАБИЛЬНОСТЬ UTF-8 И АУДИО-ПОТОКОВ — устранены конфликты кодировок JSON и синхронизированы потоки аудио',
  ],
  '2.8': [
    '🚀 ВЕРСИЯ 2.8 — РАСШИРЕННЫЙ ДАШБОРД ПЛИТОК LUMA И УЛУЧШЕННЫЙ IPC КЛИЕНТ',
    '📡 АСИНХРОННЫЙ МОСТ IPC — неблокирующий обмен пакетами JSON-RPC 2.0 между плиточной оболочкой и фоновым ядром',
    '📝 СИНХРОНИЗАЦИЯ БЫСТРЫХ ЗАМЕТОК В ПАМЯТИ ЯДРА — мгновенное сохранение заметок между перезапусками графического клиента',
  ],
  '2.7': [
    '🚀 ВЕРСИЯ 2.7 — ЯДРО LUMA И СЕРВИС ВИДЖЕТОВ WIDGETENGINE',
    '⚙️ HEADLESS-ДЕМОН ЯДРА — фоновый TCP-сервер на 127.0.0.1:49215 с нулевой нагрузкой на CPU в простое',
    '🧩 СЕРВИС ВИДЖЕТОВ WIDGETENGINE — архитектура системных плиток, телеметрии CPU/RAM и заметок',
  ],
  '2.6': [
    '🚀 ВЕРСИЯ 2.6 — LUMA ISLAND, БЫСТРЫЕ ПЛИТКИ НАСТРОЕК, АДАПТИВНАЯ ТЕМА ДЕНЬ/НОЧЬ, АВТООБНОВЛЕНИЕ С GITHUB И ПКМ «НАЗАД»',
    '🏝️ ИНТЕРАКТИВНЫЙ ОСТРОВ — верхняя капсула с постоянным отображением статуса, времени, даты и процентов заряда устройства',
    '🔔 ПРОСМОТР СИСТЕМНЫХ УВЕДОМЛЕНИЙ В ОСТРОВЕ — перехват и журнал системных и прикладных уведомлений с очисткой и фильтрацией',
    '🎵 СМЕНА ПРОИГРЫВАТЕЛЯ В ОСТРОВЕ — переключение между плеерами и управление треками',
    '⏱️ ВСТРОЕННЫЙ ТАЙМЕР И СЕКУНДОМЕР В ОСТРОВЕ — обратный отсчёт с пресетами (1/5/15/25 мин) и секундомер с записью кругов (Laps)',
    '⚡ АНИМАЦИЯ ЗАРЯДКИ УСТРОЙСТВА — неоновая изумрудная волна и пульсация молнии при подключении питания и отображение процентов батареи',
    '🌙 ПОЛНОСТЬЮ РАБОЧИЙ РЕЖИМ «НЕ БЕСПОКОИТЬ» (DND) — блокирует всплывающие баннеры и звуки, тихо сохраняя все уведомления внутри острова',
    '📱 ПЕРЕРИСОВАННЫЕ НАСТРОЙКИ — боковое меню с цветными иконками, плитки быстрых настроек и скруглённые карточки',
    '🌗 АДАПТИВНАЯ ТЕМА «ДЕНЬ / НОЧЬ» ПО РАСПИСАНИЮ — автоматическая смена светлой и тёмной темы по часам',
    '🔄 АВТООБНОВЛЕНИЕ И ПРОВЕРКА НОВОЙ ВЕРСИИ С GITHUB — проверка релизов, переход на репозиторий в 1 клик и автопроверка при запуске',
    '🩺 ДИАГНОСТИКА ПРИЛОЖЕНИЯ И РАЗДЕЛ «О СИСТЕМЕ» — комплексная проверка шифрования PBKDF2, плагинов и ресурсов ОС',
    '🖱️ ФУНКЦИЯ «НАЗАД» НА ПКМ — удобная навигация одной рукой: клик ПКМ возвращает на предыдущий экран, сбрасывает фильтр или закрывает поиск',
  ],
  '2.5': [
    '🚀 ВЕРСИЯ 2.5 — МЕГА-ПЕРСОНАЛИЗАЦИЯ, 18 ЦИФЕРБЛАТОВ, КАСТОМНЫЕ ТЕМЫ PRO, API 2.5 И PBKDF2 ШИФРОВАНИЕ',
    '💡 МГНОВЕННАЯ ПОДСВЕТКА АКТИВНЫХ НАСТРОЕК («ЗАЖИГАНИЕ» СТАТУСА) — при выборе любого стиля или переключателя элемент загорается статусом «🟢 АКТИВНО»',
    '🕒 +10 НОВЫХ ЦИФЕРБЛАТОВ (ВСЕГО 18 СТИЛЕЙ) — добавлены матричные, неоновые, ретро-ЖК, тактические, гибридные и вертикальные стили часов',
    '✨ РАСШИРЕННЫЙ ДИЗАЙН ЧАСОВ — настройка неонового свечения (Glow), скругления рамки, прозрачности подложки, цвета минут, жирности и мигающего двоеточия',
    '🎨 СТУДИЯ СОЗДАНИЯ КАСТОМНЫХ ТЕМ — живое превью темы, выбор режима (Dark / Onyx / Daylight), настройка цветовых каналов и радиуса скругления',
    '🔐 ОБНОВЛЁННОЕ ШИФРОВАНИЕ ДАННЫХ — деривация ключей PBKDF2-HMAC-SHA512, контроль целостности HMAC-SHA256 и ротация ключей',
    '🔌 УЛУЧШЕННЫЙ APPLICATION & PLUGIN API — шифрованное хранилище секретов для плагинов, хуки смены темы/часов и диагностика безопасности',
    '📜 ПОЛНАЯ ИСТОРИЯ ОБНОВЛЕНИЙ — добавлен полный архив изменений всех версий программы',
  ],
  '2.4': [
    '🚀 ВЕРСИЯ 2.4 — DARK SLATE PRO, LIVE SESSION TRACKER (С 0) И ВЕРТИКАЛЬНЫЕ ЧАСЫ',
    '🎨 ИСПРАВЛЕНЫ ЦВЕТА И РАМКИ (#AARRGGBB) — убраны лишние полосы, внедрён графитовый стиль Midnight Slate',
    '🔐 ИСПРАВЛЕНО СОХРАНЕНИЕ И ШИФРОВАНИЕ НАСТРОЕК — валидный 32-байтовый ключ AES-256 без потери данных',
    '⏱️ GAME & APP SESSION TRACKER С 0 — честный отсчёт времени с 00:00 при запуске приложения и живой таймер на карточках',
    '🧩 ПЛАГИНЫ В СПИСКЕ ЗАПУСКА И МАГАЗИН РАСШИРЕНИЙ — скачивание, настройка, включение и удаление плагинов в 1 клик',
    '🕒 ВЕРТИКАЛЬНЫЕ ЧАСЫ — крупный вертикальный виджет часов (HH / MM) и 8 современных стилей',
    '🔊 ФОНОВЫЙ КОНТРОЛЛЕР СИСТЕМНОЙ ГРОМКОСТИ — плавная регулировка громкости в фоновом потоке',
  ],
  '2.3': [
    '🎨 УЛУЧШЕННЫЙ LIQUID GLASS ИНТЕРФЕЙС — переработанный стеклянный дизайн, плавные эффекты прозрачности и современный внешний вид',
    '🖥 FLOATING HUD — новая плавающая панель с системной информацией и быстрым доступом к функциям',
    '🗑 ФИКСИРОВАННАЯ КОРЗИНА — корзина закреплена в правом нижнем углу интерфейса',
    '🔎 ИСТОРИЯ ПОИСКА — система поиска теперь сохраняет предыдущие запросы для более быстрого доступа',
    '💾 УЛУЧШЕННАЯ СИСТЕМА РЕЗЕРВНОГО КОПИРОВАНИЯ — стабильное сохранение и восстановление настроек пользователя',
    '🕒 НОВЫЕ СТИЛИ ЧАСОВ — дополнительные варианты отображения времени и даты с кастомизацией цвета',
    '🎨 УЛУЧШЕННАЯ ПАНЕЛЬ НАСТРОЕК — гармоничный дизайн и удобная навигация',
    '🔌 СИСТЕМА ПЛАГИНОВ — поддержка расширений для добавления новых возможностей',
    '🎯 FOCUS MODE PLUGIN — режим концентрации с Pomodoro таймером и минималистичным интерфейсом',
    '🌦 SMART WEATHER PLUGIN — отображение температуры, влажности и скорости ветра',
    '🎵 SMART MUSIC CONTROLLER — управление музыкой через встроенный мини-плеер',
    '📂 SMART FILE FINDER И IDEA NOTEBOOK — быстрый поиск файлов и встроенный блокнот для идей',
  ],
  '2.2': [
    '🚀 ВЕРСИЯ 2.2 — ОПТИМИЗАЦИЯ И КАСТОМИЗАЦИЯ',
    '⚡ ОПТИМИЗАЦИЯ ПРОИЗВОДИТЕЛЬНОСТИ — снижение потребления памяти на 25% и ускорение загрузки',
    '🎨 КАСТОМИЗАЦИЯ ВРЕМЕНИ И ДАТЫ — выбор шрифтов, размеров, цветов и форматов отображения',
    '💾 СИСТЕМА РЕЗЕРВНОГО КОПИРОВАНИЯ — автоматическое и ручное создание бэкапов настроек',
    '🔍 КЭШИРОВАНИЕ ПОИСКА — мгновенный поиск по приложениям с интеллектуальным кэшированием',
    '🎯 ВИРТУАЛИЗАЦИЯ СПИСКОВ — плавная работа с большими библиотеками приложений (1000+)',
    '🛠️ УЛУЧШЕННОЕ УПРАВЛЕНИЕ ПАМЯТЬЮ — автоматическая очистка неиспользуемых ресурсов',
    '📊 МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ — отслеживание использования CPU, памяти и кэша',
    '🔧 ГИБКИЕ НАСТРОЙКИ ПРОИЗВОДИТЕЛЬНОСТИ — индивидуальная настройка кэширования и виртуализации',
  ],
  '2.1': [
    '🚀 ВЕРСИЯ 2.1 — НОВЫЕ ВОЗМОЖНОСТИ И РАСШИРЕНИЯ',
    '🔌 СИСТЕМА ПЛАГИНОВ — поддержка сторонних расширений и модулей',
    '🔊 УПРАВЛЕНИЕ АУДИО — встроенный контроллер громкости',
    '🎨 СОЗДАНИЕ ТЕМ — визуальный редактор пользовательских цветовых схем',
    '💫 РАСШИРЕННОЕ СТЕКЛО — тонкая настройка прозрачности стеклянного эффекта',
    '🏷️ СИСТЕМА ТЕГОВ — организация приложений с помощью пользовательских меток',
    '🔍 ПОИСК ПО ТЕГАМ — быстрая фильтрация приложений по категориям и тегам',
    '📊 ПРОДВИНУТЫЕ НАСТРОЙКИ — новые вкладки для управления всеми функциями',
    '🛠️ УЛУЧШЕННАЯ АРХИТЕКТУРА — модульная структура для лёгкого расширения',
    '🔒 БЕЗОПАСНОСТЬ ПЛАГИНОВ — изолированная среда выполнения стороннего кода',
    '🎯 АВТОМАТИЧЕСКОЕ ОБНАРУЖЕНИЕ — сканирование папки plugins при запуске',
  ],
  '2.0': [
    '🎉 КРУПНОЕ ОБНОВЛЕНИЕ 2.0!',
    '✨ Полностью переработанный дизайн с эффектом жидкого стекла (Glass Morphism)',
    '🎬 Плавные пружинные анимации с поддержкой кривых Безье',
    '🔐 Шифрование пользовательских данных с использованием алгоритма AES-256-GCM',
    '📡 Расширенный мониторинг системы: отслеживание сети, питания и геолокации',
    '🎨 7 предустановленных цветовых тем (Тёмная, Светлая, Синяя, Зелёная, Фиолетовая, Оранжевая, Розовая)',
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
    'Обновлён интерфейс боковой панели',
  ],
  '1.7': [
    'Добавлена возможность добавления собственных приложений и сайтов',
    'Реализован выбор иконок для пользовательских элементов',
    'Внедрена система категорий (Браузеры, Медиа, Музыка, Соцсети, Игры, Система, Офис)',
    'Улучшена навигация по категориям приложений',
    'Добавлены подсказки при наведении на элементы интерфейса',
  ],
  '1.6': [
    'Разработана базовая система тем оформления (Тёмная и Светлая)',
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
    'Обновлён дизайн карточек приложений',
  ],
  '1.3': [
    'Добавлена поддержка запуска системных утилит',
    'Реализована кроссплатформенная совместимость',
    'Улучшена система определения путей к исполняемым файлам',
    'Добавлен индикатор загрузки при запуске тяжёлых приложений',
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
    'Улучшено отображение статуса установки приложений',
    'Добавлены базовые анимации при наведении курсора',
    'Исправлены мелкие визуальные недочёты',
  ],
  '1.0': [
    '🚀 Первый официальный релиз системы!',
    'Базовый функционал запуска приложений и веб-сайтов',
    'Плиточный и модульный интерфейс рабочего стола',
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
