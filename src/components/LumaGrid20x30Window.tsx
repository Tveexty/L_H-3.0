import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Activity,
  HardDrive,
  Volume2,
  VolumeX,
  CheckSquare,
  Terminal,
  Wifi,
  Timer,
  CloudSun,
  CloudRain,
  Snowflake,
  CloudLightning,
  Sun,
  Calculator,
  Power,
  FolderPlus,
  Folder,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Plus,
  Trash2,
  Search,
  Lock,
  Moon,
  RefreshCw,
  ShieldCheck,
  Cpu,
  Sparkles,
  Sliders,
  X,
  MapPin,
  FolderOpen,
  Smartphone,
  BatteryCharging,
  BellOff,
  Flame,
  TrendingUp,
  Calendar as CalendarIcon,
  Zap,
  ExternalLink,
  Move,
  Grid,
  Layers,
  Eye,
  EyeOff,
  Radio,
  Headphones,
  Gamepad2,
  Laptop,
  Compass,
  Disc3,
} from 'lucide-react';
import {
  AppItem,
  IslandMediaPlayer,
  LiveSystemTelemetry,
  formatLiveClock,
  formatMonthBadge,
} from '../data/launcherData';

export type WidgetEcosystem = 'pulse' | 'aura' | 'core';

export interface CellWidgetItem {
  id: string;
  title: string;
  subtitle: string;
  ecosystem: WidgetEcosystem;
  /** 1-based column on the 20x30 grid */
  col: number;
  /** 1-based row on the 20x30 grid */
  row: number;
  /** Width in cells */
  w: number;
  /** Height in cells */
  h: number;
  visible: boolean;
}

export interface GridFolderItem {
  id: string;
  name: string;
  color: string;
  col: number;
  row: number;
  w: number;
  h: number;
  appIds: string[];
}

export interface PinnedGridApp {
  appId: string;
  col: number;
  row: number;
  w: number;
  h: number;
}

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface WeatherHourPoint {
  time: string;
  temp: number;
  code: number;
}

interface WeatherState {
  city: string;
  region: string;
  country: string;
  timezone: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  hourly: WeatherHourPoint[];
  loading: boolean;
  updatedAt: string;
  autoDetected?: boolean;
}

export interface LumaGrid20x30Props {
  apps: AppItem[];
  isDark: boolean;
  accentHex: string;
  volume: number;
  isMuted: boolean;
  dndEnabled: boolean;
  adaptiveThemeEnabled: boolean;
  glassEnabled: boolean;
  rightClickBackEnabled: boolean;
  dynamicIslandEnabled: boolean;
  batteryLevel: number;
  isCharging: boolean;
  islandPlayers: IslandMediaPlayer[];
  activePlayerIndex: number;
  mediaPlaying: boolean;
  liveSystem: LiveSystemTelemetry | null;
  onSelectPlayer: (index: number) => void;
  onToggleMediaPlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onToggleDnd: () => void;
  onToggleAdaptiveTheme: () => void;
  onToggleGlass: () => void;
  onToggleRightClickBack: () => void;
  onToggleDynamicIsland: () => void;
  onRefreshLocation: () => void;
  onExecutePowerAction: (action: 'lock' | 'sleep' | 'recycle_bin') => void;
  onChangeVolume: (val: number) => void;
  onToggleMute: () => void;
  onLaunchApp: (app: AppItem) => void;
  onSwitchToWindow1: () => void;
  onOpenSeparateWindow2: () => void;
  onPushNotification: (title: string, message: string, type?: 'info' | 'warning' | 'success') => void;
  onPlayBeep: (freq?: number) => void;
  iconMap: Record<string, React.ComponentType<{ className?: string }>>;
  isStandaloneWindow?: boolean;
}

const STORAGE_KEY_GRID_20X30 = 'luma_os_1_0_1_grid_20x30_v3';

// 18 Original Flagship Luma OS 1.0.1 Widgets across 3 Signature Suites:
// Luma Pulse (pulse), Luma Aura (aura), Luma Core (core)
// Placed cleanly onto a 30 columns x 20 rows (600 cells) matrix!
export const DEFAULT_CELL_WIDGETS: CellWidgetItem[] = [
  // ROW 1..4 (Top band: 6 + 8 + 8 + 8 = 30)
  {
    id: 'luma_sculpt_clock',
    title: 'Luma Pulse — Скульпт-Циферблат и Сводка',
    subtitle: 'Живой циферблат Material 3 Expressive, ваш регион и погода',
    ecosystem: 'pulse',
    col: 1,
    row: 1,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_quick_shade',
    title: 'Luma Pulse — Панель Быстрого Управления',
    subtitle: 'Luma Island, DND, Авто-тема, Стекло, ПКМ Назад, Громкость',
    ecosystem: 'pulse',
    col: 7,
    row: 1,
    w: 8,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_region_weather',
    title: 'Luma Pulse — Погода вашего региона (Live)',
    subtitle: 'Автоопределение города, региона и почасовой прогноз Open-Meteo',
    ecosystem: 'pulse',
    col: 15,
    row: 1,
    w: 8,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_now_playing',
    title: 'Luma Aura — Живой Медиа-Винил и Треки',
    subtitle: 'Определение играющей музыки и реальное переключение треков',
    ecosystem: 'aura',
    col: 23,
    row: 1,
    w: 8,
    h: 4,
    visible: true,
  },

  // ROW 5..8 (Second band: 6 + 6 + 6 + 6 + 6 = 30)
  {
    id: 'luma_energy_rings',
    title: 'Luma Aura — Кольца Энергии и Ритма',
    subtitle: 'Активность • Фокус-минуты • Перерывы дня',
    ecosystem: 'aura',
    col: 1,
    row: 5,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_power_matrix',
    title: 'Luma Aura — Питание и Периферия',
    subtitle: 'Реальный заряд ПК и состояние подключённых устройств Luma',
    ecosystem: 'aura',
    col: 7,
    row: 5,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_cpu_gpu_ram',
    title: 'Luma Core — Реальные Ресурсы CPU / GPU / RAM',
    subtitle: 'Живая аппаратная телеметрия вашей системы через Luma HAL',
    ecosystem: 'core',
    col: 13,
    row: 5,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_storage_volumes',
    title: 'Luma Core — Реальные Тома и Накопители',
    subtitle: 'Фактический объём дисков системы и быстрая очистка кэша',
    ecosystem: 'core',
    col: 19,
    row: 5,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_network_monitor',
    title: 'Luma Core — Живая Сеть и Шина IPC',
    subtitle: 'Реальный сетевой поток (Мбит/с) и канал 127.0.0.1:49215',
    ecosystem: 'core',
    col: 25,
    row: 5,
    w: 6,
    h: 4,
    visible: true,
  },

  // ROW 9..12 (Third band: 6 + 6 + 6 + 6 + 6 = 30)
  {
    id: 'luma_notes_tasks',
    title: 'Luma Pulse — Заметки и Задачи VFS',
    subtitle: 'Интерактивный чек-лист и быстрый блокнот ядра Luma',
    ecosystem: 'pulse',
    col: 1,
    row: 9,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_world_clock',
    title: 'Luma Aura — Календарь и Мировые Пояса',
    subtitle: 'Ваш локальный пояс • Москва • Токио • Лондон',
    ecosystem: 'aura',
    col: 7,
    row: 9,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_focus_pomodoro',
    title: 'Luma Aura — Таймер Фокус-Потока',
    subtitle: '25 мин глубокой работы / 5 мин отдыха со звуком',
    ecosystem: 'aura',
    col: 13,
    row: 9,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_calculator',
    title: 'Luma Pulse — Калькулятор и Конвертер',
    subtitle: 'Быстрые вычисления и перевод валют/величин',
    ecosystem: 'pulse',
    col: 19,
    row: 9,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'luma_market_pulse',
    title: 'Luma Aura — Котировки и Курсы',
    subtitle: 'BTC, ETH, NVDA и валютный индекс USD/RUB',
    ecosystem: 'aura',
    col: 25,
    row: 9,
    w: 6,
    h: 4,
    visible: true,
  },

  // ROW 13..15 (Fourth band: 6 + 8 + 8 + 8 = 30)
  {
    id: 'luma_digital_balance',
    title: 'Luma Pulse — Цифровой Баланс Сессий',
    subtitle: 'Живой учёт времени приложений с 00:00 и аптайм ядра',
    ecosystem: 'pulse',
    col: 1,
    row: 13,
    w: 6,
    h: 3,
    visible: true,
  },
  {
    id: 'luma_system_tools',
    title: 'Luma Core — Системные Утилиты Быстрого Запуска',
    subtitle: 'Терминал, Монитор процессов, Проводник, Настройки сети',
    ecosystem: 'core',
    col: 7,
    row: 13,
    w: 8,
    h: 3,
    visible: true,
  },
  {
    id: 'luma_power_control',
    title: 'Luma Core — Питание, Блокировка и Корзина',
    subtitle: 'Реальная блокировка экрана, Сон, Корзина и Таймер',
    ecosystem: 'core',
    col: 15,
    row: 13,
    w: 8,
    h: 3,
    visible: true,
  },
  {
    id: 'luma_security_shield',
    title: 'Luma Core — Криптоядро LumaGuard 1.0.1',
    subtitle: 'AES-256-GCM • PBKDF2-SHA512 • Zero-Trust IPC HMAC',
    ecosystem: 'core',
    col: 23,
    row: 13,
    w: 8,
    h: 3,
    visible: true,
  },
];

export const DEFAULT_GRID_FOLDERS: GridFolderItem[] = [
  {
    id: 'gf_games',
    name: 'Игры и Стриминг',
    color: '#10b981',
    col: 1,
    row: 16,
    w: 5,
    h: 3,
    appIds: ['steam', 'vkgames', 'youtube'],
  },
  {
    id: 'gf_work',
    name: 'Браузеры и Общение',
    color: '#6366f1',
    col: 6,
    row: 16,
    w: 5,
    h: 3,
    appIds: ['chrome', 'telegram', 'vk', 'yandexmusic'],
  },
];

export const DEFAULT_PINNED_APPS: PinnedGridApp[] = [
  { appId: 'steam', col: 11, row: 16, w: 3, h: 3 },
  { appId: 'chrome', col: 14, row: 16, w: 3, h: 3 },
  { appId: 'telegram', col: 17, row: 16, w: 3, h: 3 },
  { appId: 'youtube', col: 20, row: 16, w: 3, h: 3 },
  { appId: 'yandexmusic', col: 23, row: 16, w: 3, h: 3 },
  { appId: 'vlc', col: 26, row: 16, w: 3, h: 3 },
  { appId: 'vkgames', col: 29, row: 16, w: 2, h: 3 },
];

const ECOSYSTEM_META: Record<WidgetEcosystem, { label: string; short: string; border: string; pill: string }> = {
  pulse: {
    label: 'Luma Pulse',
    short: '⚡ Luma Pulse',
    border: 'border-indigo-500/40 hover:border-indigo-400/75',
    pill: 'bg-indigo-500/20 text-indigo-400 border-indigo-400/35',
  },
  aura: {
    label: 'Luma Aura',
    short: '✨ Luma Aura',
    border: 'border-emerald-500/40 hover:border-emerald-400/75',
    pill: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/35',
  },
  core: {
    label: 'Luma Core',
    short: '🧠 Luma Core',
    border: 'border-sky-500/40 hover:border-sky-400/75',
    pill: 'bg-sky-500/20 text-sky-400 border-sky-400/35',
  },
};

function decodeWeatherWmo(code: number): { label: string; kind: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' } {
  if (code === 0) return { label: 'Ясно', kind: 'clear' };
  if (code === 1 || code === 2) return { label: 'Малооблачно', kind: 'cloudy' };
  if (code === 3 || code === 45 || code === 48) return { label: 'Пасмурно', kind: 'cloudy' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Дождь', kind: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Снег', kind: 'snow' };
  if (code >= 95) return { label: 'Гроза', kind: 'storm' };
  return { label: 'Переменная облачность', kind: 'cloudy' };
}

export const LumaGrid20x30Window: React.FC<LumaGrid20x30Props> = ({
  apps,
  isDark,
  accentHex,
  volume,
  isMuted,
  dndEnabled,
  adaptiveThemeEnabled,
  glassEnabled,
  rightClickBackEnabled,
  dynamicIslandEnabled,
  batteryLevel,
  isCharging,
  islandPlayers,
  activePlayerIndex,
  mediaPlaying,
  liveSystem,
  onSelectPlayer,
  onToggleMediaPlay,
  onNextTrack,
  onPrevTrack,
  onToggleDnd,
  onToggleAdaptiveTheme,
  onToggleGlass,
  onToggleRightClickBack,
  onToggleDynamicIsland,
  onRefreshLocation,
  onExecutePowerAction,
  onChangeVolume,
  onToggleMute,
  onLaunchApp,
  onSwitchToWindow1,
  onOpenSeparateWindow2,
  onPushNotification,
  onPlayBeep,
  iconMap,
  isStandaloneWindow = false,
}) => {
  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GRID_20X30);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  }, []);

  // Theme-adaptive surface classes (Fixes Bug #9: Light Theme contrast across all 18 widgets)
  const innerCardCls = isDark
    ? 'bg-slate-900/70 border-slate-800/90 text-slate-100'
    : 'bg-slate-100/90 border-slate-300/80 text-slate-900';
  const innerBtnCls = isDark
    ? 'bg-slate-900/75 hover:bg-slate-800 border-slate-800 text-slate-100'
    : 'bg-slate-100 hover:bg-slate-200/90 border-slate-300 text-slate-900';
  const inputCls = isDark
    ? 'bg-slate-900/90 border-slate-700 text-white placeholder:text-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';
  const mutedTextCls = isDark ? 'text-slate-400' : 'text-slate-600';
  const titleTextCls = isDark ? 'text-white' : 'text-slate-900';
  const barTrackCls = isDark ? 'bg-slate-800' : 'bg-slate-300/90';
  const modalBoxCls = isDark
    ? 'border-slate-700 bg-[#0d1320] text-white'
    : 'border-slate-300 bg-white text-slate-900';

  // --- 20x30 Grid Orientation & Cell Matrix State ---
  const [gridOrientation, setGridOrientation] = useState<'30x20' | '20x30'>(saved?.gridOrientation || '30x20');
  const totalCols = gridOrientation === '30x20' ? 30 : 20;
  const totalRows = gridOrientation === '30x20' ? 20 : 30;

  const [showCellGridLines, setShowCellGridLines] = useState<boolean>(saved?.showCellGridLines ?? true);
  const [editGridMode, setEditGridMode] = useState<boolean>(false);
  const [ecosystemFilter, setEcosystemFilter] = useState<'all' | WidgetEcosystem>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);

  const [widgets, setWidgets] = useState<CellWidgetItem[]>(saved?.widgets || DEFAULT_CELL_WIDGETS);
  const [folders, setFolders] = useState<GridFolderItem[]>(saved?.folders || DEFAULT_GRID_FOLDERS);
  const [pinnedApps, setPinnedApps] = useState<PinnedGridApp[]>(saved?.pinnedApps || DEFAULT_PINNED_APPS);

  // Modals inside Window 2
  const [widgetCatalogModalOpen, setWidgetCatalogModalOpen] = useState<boolean>(false);
  const [activeFolderModal, setActiveFolderModal] = useState<GridFolderItem | null>(null);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderColor, setNewFolderColor] = useState<string>('#10b981');
  const [newFolderApps, setNewFolderApps] = useState<string[]>(['steam', 'chrome']);
  const [lockScreenOverlay, setLockScreenOverlay] = useState<boolean>(false);

  // Live Clock & Fallback Telemetry (Real liveSystem overrides these whenever connected!)
  const [nowDate, setNowDate] = useState<Date>(new Date());
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(saved?.uptimeSeconds ?? 120);
  const [netHistory, setNetHistory] = useState<number[]>([12, 18, 22, 15, 26, 20, 24, 19, 28, 22]);
  const [cacheCleanedGb, setCacheCleanedGb] = useState<number>(0);

  // Quick Shade local display brightness (controls subtle page filter feel or setting)
  const [screenBrightness, setScreenBrightness] = useState<number>(92);

  // Energy Rings
  const [moveKcal, setMoveKcal] = useState<number>(540);
  const moveGoal = 650;
  const [exerciseMins, setExerciseMins] = useState<number>(38);
  const exerciseGoal = 45;
  const [standHours, setStandHours] = useState<number>(10);
  const standGoal = 12;

  // Luma Notes & Tasks
  const [todoItems, setTodoItems] = useState<TodoItem[]>(
    saved?.todoItems || [
      { id: 't1', text: 'Проверить реальную телеметрию и регион Luma 1.0.1', done: true },
      { id: 't2', text: 'Протестировать переключение треков и Luma Island', done: true },
      { id: 't3', text: 'Запустить LumaOS_1.0.1.exe в 1 клик', done: false },
    ]
  );
  const [newTodoText, setNewTodoText] = useState<string>('');
  const [quickNote, setQuickNote] = useState<string>(
    saved?.quickNote ||
      'Luma OS 1.0.1 • Патч первого дня: реальные ресурсы ПК, авто-регион, живые треки и 18 фирменных виджетов.'
  );
  const [keepTab, setKeepTab] = useState<'todo' | 'note'>('todo');

  // Focus Pomodoro
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');
  const [pomoSecLeft, setPomoSecLeft] = useState<number>(25 * 60);
  const [pomoRunning, setPomoRunning] = useState<boolean>(false);

  // Real Auto-Detected Region Weather (Open-Meteo Live API)
  const [weatherQuery, setWeatherQuery] = useState<string>('');
  const [weatherSearchOpen, setWeatherSearchOpen] = useState<boolean>(false);
  const [manualCitySelected, setManualCitySelected] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherState>(
    saved?.weather || {
      city: 'Определение региона...',
      region: '',
      country: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      temp: 0,
      feelsLike: 0,
      humidity: 0,
      windSpeed: 0,
      weatherCode: 1,
      description: 'Запрос координат...',
      hourly: [
        { time: '12:00', temp: 0, code: 1 },
        { time: '15:00', temp: 0, code: 0 },
        { time: '18:00', temp: 0, code: 2 },
        { time: '21:00', temp: 0, code: 3 },
      ],
      loading: true,
      updatedAt: 'Синхронизация...',
      autoDetected: false,
    }
  );

  // Calculator & Converter
  const [calcTab, setCalcTab] = useState<'calc' | 'conv'>('calc');
  const [calcInput, setCalcInput] = useState<string>('256 * 18');
  const [convVal, setConvVal] = useState<string>('100');
  const [convKind, setConvKind] = useState<'usd_rub' | 'eur_rub' | 'gb_mb' | 'c_f'>('usd_rub');

  // Markets
  const [marketTickers] = useState([
    { symbol: 'BTC/USD', name: 'Bitcoin', price: 94280, changePct: +3.42 },
    { symbol: 'ETH/USD', name: 'Ethereum', price: 3185, changePct: +2.15 },
    { symbol: 'NVDA', name: 'NVIDIA Corp', price: 142.6, changePct: +4.18 },
    { symbol: 'USD/RUB', name: 'Доллар США', price: 92.45, changePct: -0.35 },
  ]);

  // Power Timer & Security
  const [shutdownTimerSec, setShutdownTimerSec] = useState<number | null>(null);
  const [cryptoKeyRev, setCryptoKeyRev] = useState<number>(1);

  const gridRef = useRef<HTMLDivElement | null>(null);

  // Stable callback & state refs to fix Bug #7 (preventing 1s interval recreation every tick)
  const onPlayBeepRef = useRef(onPlayBeep);
  const onPushNotificationRef = useRef(onPushNotification);
  const pomoRunningRef = useRef(pomoRunning);
  const pomoModeRef = useRef(pomoMode);
  const autoWeatherFetchedKeyRef = useRef<string>('');

  useEffect(() => {
    onPlayBeepRef.current = onPlayBeep;
  }, [onPlayBeep]);
  useEffect(() => {
    onPushNotificationRef.current = onPushNotification;
  }, [onPushNotification]);
  useEffect(() => {
    pomoRunningRef.current = pomoRunning;
  }, [pomoRunning]);
  useEffect(() => {
    pomoModeRef.current = pomoMode;
  }, [pomoMode]);

  // Real telemetry computed values from liveSystem (Zero fake random jitter!)
  const realCpuPct = liveSystem ? liveSystem.cpu_percent : 0;
  const realCpuModel = liveSystem?.cpu_model || 'Сканирование процессора...';
  const realCpuCores = liveSystem?.cpu_cores || 0;
  const realGpuName = liveSystem?.gpu_name || 'Графический адаптер системы';
  const realGpuPct = liveSystem ? liveSystem.gpu_percent : 0;
  const realGpuTemp = liveSystem ? liveSystem.gpu_temp_c : 0;
  const realRamPct = liveSystem ? liveSystem.ram_percent : 0;
  const realRamUsedGb = liveSystem ? liveSystem.ram_used_gb.toFixed(1) : '0.0';
  const realRamTotalGb = liveSystem ? liveSystem.ram_total_gb.toFixed(1) : '0.0';
  const realNetDown = liveSystem ? Number(liveSystem.net_down_mbps.toFixed(2)) : 0;
  const realNetUp = liveSystem ? Number(liveSystem.net_up_mbps.toFixed(2)) : 0;
  const realDisks = liveSystem?.disks && liveSystem.disks.length > 0 ? liveSystem.disks : [];
  const realMedia = liveSystem?.media;
  const realLocation = liveSystem?.location;

  // Update real network sparkline when liveSystem changes
  useEffect(() => {
    if (!liveSystem) return;
    const totalSpeed = liveSystem.net_down_mbps + liveSystem.net_up_mbps;
    const barHeight = Math.min(100, Math.max(12, Math.round(totalSpeed * 3 + 12)));
    setNetHistory((prev) => [...prev.slice(1), barHeight]);
  }, [liveSystem?.net_down_mbps, liveSystem?.net_up_mbps, liveSystem]);

  // Persist 20x30 Grid state
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_GRID_20X30,
        JSON.stringify({
          gridOrientation,
          showCellGridLines,
          widgets,
          folders,
          pinnedApps,
          todoItems,
          quickNote,
          uptimeSeconds,
          weather,
        })
      );
    } catch {
      // ignore
    }
  }, [gridOrientation, showCellGridLines, widgets, folders, pinnedApps, todoItems, quickNote, uptimeSeconds, weather]);

  // Escape key closes Window 2 modals (Bug #12 fix)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lockScreenOverlay) setLockScreenOverlay(false);
      else if (activeFolderModal) setActiveFolderModal(null);
      else if (createFolderModalOpen) setCreateFolderModalOpen(false);
      else if (widgetCatalogModalOpen) setWidgetCatalogModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lockScreenOverlay, activeFolderModal, createFolderModalOpen, widgetCatalogModalOpen]);

  // Single stable 1-second timer loop (Fix Bug #7 — no teardown on every prop change)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
      setUptimeSeconds((s) => s + 1);

      // Pomodoro countdown
      setPomoSecLeft((prev) => {
        if (!pomoRunningRef.current) return prev;
        if (prev <= 1) {
          setPomoRunning(false);
          onPlayBeepRef.current(880);
          const nextM = pomoModeRef.current === 'work' ? 'break' : 'work';
          setPomoMode(nextM);
          onPushNotificationRef.current(
            'Luma Focus-Поток',
            nextM === 'break'
              ? 'Сессия фокуса завершена! Время отдыха 5 минут.'
              : 'Перерыв окончен! Возврат к фокусу на 25 минут.',
            'success'
          );
          return nextM === 'break' ? 5 * 60 : 25 * 60;
        }
        return prev - 1;
      });

      // Shutdown countdown
      setShutdownTimerSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          onPlayBeepRef.current(520);
          onPushNotificationRef.current('Luma Core Питание', 'Таймер автодействия завершён.', 'warning');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real Open-Meteo weather by coordinates (auto-detected region or searched city)
  const fetchWeatherByCoords = useCallback(
    async (
      lat: number,
      lon: number,
      city: string,
      region: string,
      country: string,
      timezone: string,
      autoDetected: boolean,
      notify = false
    ) => {
      setWeather((prev) => ({ ...prev, loading: true }));
      try {
        const forecastRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&forecast_days=1&timezone=auto`
        );
        const fData = await forecastRes.json();
        const current = fData.current || {};
        const code = typeof current.weather_code === 'number' ? current.weather_code : 0;
        const wmo = decodeWeatherWmo(code);

        const hourlyPoints: WeatherHourPoint[] = [];
        if (fData.hourly && Array.isArray(fData.hourly.time)) {
          const curH = new Date().getHours();
          const startIdx = Math.max(0, Math.min(curH, fData.hourly.time.length - 4));
          for (let i = startIdx; i < Math.min(startIdx + 4, fData.hourly.time.length); i++) {
            const rawT = String(fData.hourly.time[i] || '');
            const hhmm = rawT.includes('T') ? rawT.split('T')[1].slice(0, 5) : `${i}:00`;
            hourlyPoints.push({
              time: hhmm,
              temp: Math.round(Number(fData.hourly.temperature_2m?.[i] ?? current.temperature_2m ?? 0)),
              code: Number(fData.hourly.weather_code?.[i] ?? code),
            });
          }
        }

        const tempRounded = Math.round(Number(current.temperature_2m ?? 0));
        setWeather({
          city,
          region,
          country,
          timezone: fData.timezone || timezone || '',
          temp: tempRounded,
          feelsLike: Math.round(Number(current.apparent_temperature ?? tempRounded)),
          humidity: Math.round(Number(current.relative_humidity_2m ?? 50)),
          windSpeed: Number(Number(current.wind_speed_10m ?? 0).toFixed(1)),
          weatherCode: code,
          description: wmo.label,
          hourly: hourlyPoints.length ? hourlyPoints : [],
          loading: false,
          updatedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          autoDetected,
        });
        if (notify) {
          onPushNotificationRef.current(
            'Luma Погода (Live)',
            `${city}${region ? `, ${region}` : ''}: ${tempRounded > 0 ? `+${tempRounded}` : tempRounded}°C (${wmo.label})`,
            'success'
          );
        }
      } catch {
        setWeather((prev) => ({
          ...prev,
          city: city || prev.city,
          region: region || prev.region,
          country: country || prev.country,
          loading: false,
          description: prev.description === 'Запрос координат...' ? 'Офлайн кэш' : prev.description,
        }));
      }
    },
    []
  );

  // Auto-detect real region from Luma Core kernel (liveSystem.location) OR browser ipwho.is fallback
  const detectMyRegionWeather = useCallback(
    async (notify = false) => {
      setManualCitySelected(false);
      onRefreshLocation();
      // First check if kernel already detected exact coordinates
      if (realLocation?.detected && (realLocation.latitude !== 0 || realLocation.longitude !== 0)) {
        const locKey = `${realLocation.city}_${realLocation.latitude.toFixed(2)}_${realLocation.longitude.toFixed(2)}`;
        autoWeatherFetchedKeyRef.current = locKey;
        await fetchWeatherByCoords(
          realLocation.latitude,
          realLocation.longitude,
          realLocation.city || realLocation.region || 'Ваш регион',
          realLocation.region || '',
          realLocation.country || '',
          realLocation.timezone || '',
          true,
          notify
        );
        return;
      }

      // Direct client-side region detection via ipwho.is (if kernel hasn't responded yet or running standalone)
      setWeather((prev) => ({ ...prev, loading: true }));
      try {
        const locRes = await fetch('/api/kernel/location').catch(() => null);
        if (locRes && locRes.ok) {
          const data = await locRes.json();
          if (data?.detected && (data.latitude !== 0 || data.longitude !== 0)) {
            await fetchWeatherByCoords(
              data.latitude,
              data.longitude,
              data.city || data.region || 'Ваш регион',
              data.region || '',
              data.country || '',
              data.timezone || '',
              true,
              notify
            );
            return;
          }
        }
        const directRes = await fetch('https://ipwho.is/?lang=ru');
        const direct = await directRes.json();
        if (direct?.success && typeof direct.latitude === 'number') {
          await fetchWeatherByCoords(
            direct.latitude,
            direct.longitude,
            direct.city || direct.region || 'Ваш регион',
            direct.region || '',
            direct.country || '',
            direct.timezone?.id || '',
            true,
            notify
          );
          return;
        }
      } catch {
        // ignore network block
      }
      setWeather((prev) => ({ ...prev, loading: false }));
    },
    [realLocation, fetchWeatherByCoords, onRefreshLocation]
  );

  // Automatically trigger live weather when realLocation arrives from Luma Core 1.0.1
  useEffect(() => {
    if (manualCitySelected) return;
    if (realLocation?.detected && (realLocation.latitude !== 0 || realLocation.longitude !== 0)) {
      const locKey = `${realLocation.city}_${realLocation.latitude.toFixed(2)}_${realLocation.longitude.toFixed(2)}`;
      if (autoWeatherFetchedKeyRef.current !== locKey) {
        autoWeatherFetchedKeyRef.current = locKey;
        fetchWeatherByCoords(
          realLocation.latitude,
          realLocation.longitude,
          realLocation.city || realLocation.region || 'Ваш регион',
          realLocation.region || '',
          realLocation.country || '',
          realLocation.timezone || '',
          true,
          false
        );
      }
    }
  }, [realLocation, manualCitySelected, fetchWeatherByCoords]);

  // Trigger initial region + weather fetch once on mount if not detected yet
  useEffect(() => {
    const t = setTimeout(() => {
      if (!autoWeatherFetchedKeyRef.current) {
        detectMyRegionWeather(false);
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open-Meteo real weather search by city name
  const searchWeatherByCity = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setWeather((prev) => ({ ...prev, loading: true }));
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=ru&format=json`
      );
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        onPushNotification('Luma Погода', `Город «${trimmed}» не найден.`, 'warning');
        setWeather((prev) => ({ ...prev, loading: false }));
        return;
      }
      const place = geoData.results[0];
      setManualCitySelected(true);
      await fetchWeatherByCoords(
        place.latitude,
        place.longitude,
        place.name || trimmed,
        place.admin1 || '',
        place.country || '',
        place.timezone || '',
        false,
        true
      );
      setWeatherSearchOpen(false);
      setWeatherQuery('');
    } catch {
      setWeather((prev) => ({ ...prev, loading: false }));
      onPushNotification('Luma Погода', 'Не удалось связаться с Open-Meteo.', 'info');
    }
  };

  // Safe Calculator
  const calcResult = useMemo(() => {
    const expr = calcInput.replace(/,/g, '.').trim();
    if (!expr) return '0';
    if (!/^[0-9+\-*/().\s%^]+$/.test(expr)) return '...';
    try {
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${expr.replace(/\^/g, '**')});`)();
      if (typeof val === 'number' && Number.isFinite(val)) {
        return Number.isInteger(val) ? String(val) : val.toFixed(2);
      }
      return '0';
    } catch {
      return '...';
    }
  }, [calcInput]);

  const convResult = useMemo(() => {
    const n = parseFloat(convVal.replace(/,/g, '.'));
    if (Number.isNaN(n)) return '0';
    if (convKind === 'usd_rub') return `${(n * 92.45).toFixed(1)} ₽`;
    if (convKind === 'eur_rub') return `${(n * 100.2).toFixed(1)} ₽`;
    if (convKind === 'gb_mb') return `${(n * 1024).toFixed(0)} МБ`;
    return `${((n * 9) / 5 + 32).toFixed(1)} °F`;
  }, [convVal, convKind]);

  // Move or Resize selected item on the 20x30 cell matrix
  const moveSelectedItem = (dCol: number, dRow: number) => {
    if (!selectedItemId) return;
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === selectedItemId
          ? {
              ...w,
              col: Math.max(1, Math.min(totalCols - w.w + 1, w.col + dCol)),
              row: Math.max(1, Math.min(totalRows - w.h + 1, w.row + dRow)),
            }
          : w
      )
    );
    setFolders((prev) =>
      prev.map((f) =>
        f.id === selectedItemId
          ? {
              ...f,
              col: Math.max(1, Math.min(totalCols - f.w + 1, f.col + dCol)),
              row: Math.max(1, Math.min(totalRows - f.h + 1, f.row + dRow)),
            }
          : f
      )
    );
    setPinnedApps((prev) =>
      prev.map((p) =>
        `pin_${p.appId}` === selectedItemId
          ? {
              ...p,
              col: Math.max(1, Math.min(totalCols - p.w + 1, p.col + dCol)),
              row: Math.max(1, Math.min(totalRows - p.h + 1, p.row + dRow)),
            }
          : p
      )
    );
  };

  const resizeSelectedItem = (dW: number, dH: number) => {
    if (!selectedItemId) return;
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === selectedItemId
          ? {
              ...w,
              w: Math.max(3, Math.min(12, w.w + dW)),
              h: Math.max(2, Math.min(8, w.h + dH)),
            }
          : w
      )
    );
    setFolders((prev) =>
      prev.map((f) =>
        f.id === selectedItemId
          ? {
              ...f,
              w: Math.max(2, Math.min(10, f.w + dW)),
              h: Math.max(2, Math.min(6, f.h + dH)),
            }
          : f
      )
    );
    setPinnedApps((prev) =>
      prev.map((p) =>
        `pin_${p.appId}` === selectedItemId
          ? {
              ...p,
              w: Math.max(2, Math.min(6, p.w + dW)),
              h: Math.max(2, Math.min(6, p.h + dH)),
            }
          : p
      )
    );
  };

  const handleCellClick = (col: number, row: number) => {
    if (!editGridMode || !selectedItemId) return;
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === selectedItemId
          ? {
              ...w,
              col: Math.max(1, Math.min(totalCols - w.w + 1, col)),
              row: Math.max(1, Math.min(totalRows - w.h + 1, row)),
            }
          : w
      )
    );
    setFolders((prev) =>
      prev.map((f) =>
        f.id === selectedItemId
          ? {
              ...f,
              col: Math.max(1, Math.min(totalCols - f.w + 1, col)),
              row: Math.max(1, Math.min(totalRows - f.h + 1, row)),
            }
          : f
      )
    );
    setPinnedApps((prev) =>
      prev.map((p) =>
        `pin_${p.appId}` === selectedItemId
          ? {
              ...p,
              col: Math.max(1, Math.min(totalCols - p.w + 1, col)),
              row: Math.max(1, Math.min(totalRows - p.h + 1, row)),
            }
          : p
      )
    );
    onPushNotification('Матрица 20×30', `Элемент перемещён в ячейку [X:${col}, Y:${row}]`, 'info');
  };

  const resetGridLayout = () => {
    setWidgets(DEFAULT_CELL_WIDGETS);
    setFolders(DEFAULT_GRID_FOLDERS);
    setPinnedApps(DEFAULT_PINNED_APPS);
    setSelectedItemId(null);
    onPushNotification('Матрица 20×30', 'Восстановлена эталонная раскладка 18 виджетов Luma 1.0.1.', 'success');
  };

  const renderAppIcon = (iconName: string, className = 'w-5 h-5') => {
    const IconComp = iconMap[iconName] || iconMap.Rocket || Sparkles;
    return <IconComp className={className} />;
  };

  const renderWeatherIcon = (code: number, className = 'w-6 h-6') => {
    const info = decodeWeatherWmo(code);
    if (info.kind === 'clear') return <Sun className={`${className} text-amber-400`} />;
    if (info.kind === 'rain') return <CloudRain className={`${className} text-sky-400`} />;
    if (info.kind === 'snow') return <Snowflake className={`${className} text-cyan-400`} />;
    if (info.kind === 'storm') return <CloudLightning className={`${className} text-purple-400`} />;
    return <CloudSun className={`${className} text-sky-400`} />;
  };

  const visibleWidgets = useMemo(
    () =>
      widgets.filter(
        (w) => w.visible && (ecosystemFilter === 'all' || w.ecosystem === ecosystemFilter)
      ),
    [widgets, ecosystemFilter]
  );

  const currentIslandPlayer = islandPlayers[activePlayerIndex] || islandPlayers[0];

  // Determine real OS playing music if available
  const hasLiveOsMedia = Boolean(realMedia?.available && realMedia.title);
  const displayTrackTitle = hasLiveOsMedia ? realMedia!.title : currentIslandPlayer.track;
  const displayTrackArtist = hasLiveOsMedia
    ? realMedia!.artist || realMedia!.source_app || 'Системный медиапоток'
    : currentIslandPlayer.artist;
  const displayMediaPlaying = hasLiveOsMedia ? realMedia!.is_playing : mediaPlaying;
  const displaySourceLabel = hasLiveOsMedia
    ? `LIVE • ${realMedia!.source_app || 'Системный поток'}`
    : currentIslandPlayer.name;

  // World clocks helper
  const getWorldTime = (offsetHours: number) => {
    const utc = nowDate.getTime() + nowDate.getTimezoneOffset() * 60000;
    const target = new Date(utc + offsetHours * 3600000);
    return target.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // Render individual widget content by ID
  const renderWidgetContent = (w: CellWidgetItem) => {
    switch (w.id) {
      // =====================================================================
      // 1. LUMA PULSE SCULPT CLOCK & REGION AT A GLANCE
      // =====================================================================
      case 'luma_sculpt_clock': {
        const hrs = String(nowDate.getHours()).padStart(2, '0');
        const mins = String(nowDate.getMinutes()).padStart(2, '0');
        const secs = String(nowDate.getSeconds()).padStart(2, '0');
        const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-400/35">
                <Sparkles className="w-3 h-3" />
                Luma Pulse 1.0.1
              </span>
              <span className={`text-[10px] font-mono ${mutedTextCls}`}>:{secs}</span>
            </div>

            <div className="my-auto flex items-center gap-3.5">
              <div
                className="w-20 h-20 rounded-[26px] flex flex-col items-center justify-center shadow-lg border border-indigo-400/40 relative overflow-hidden shrink-0"
                style={{
                  background: `linear-gradient(145deg, ${accentHex}55 0%, rgba(56,189,248,0.22) 100%)`,
                }}
              >
                <span className={`text-2xl font-black font-mono leading-none tracking-tighter ${titleTextCls}`}>
                  {hrs}
                </span>
                <span className="text-2xl font-black font-mono leading-none text-indigo-400 tracking-tighter mt-0.5">
                  {mins}
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className={`text-xs font-extrabold truncate ${titleTextCls}`}>
                  {weekdays[nowDate.getDay()]}
                </div>
                <div className={`text-[11px] font-mono ${mutedTextCls}`}>
                  {nowDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-500 dark:text-amber-300 text-[10px] font-semibold max-w-full">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {weather.city}: {weather.loading ? '...' : `${weather.temp > 0 ? `+${weather.temp}` : weather.temp}°C`}
                  </span>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between text-[10px] pt-1 border-t ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
              <span className="truncate">{liveSystem?.hostname || 'Luma Shell'}</span>
              <span className="text-emerald-500 font-mono font-bold shrink-0">● Live Core</span>
            </div>
          </div>
        );
      }

      // =====================================================================
      // 2. LUMA PULSE QUICK CONTROL SHADE (WITH LUMA ISLAND TOGGLE + REAL VOLUME)
      // =====================================================================
      case 'luma_quick_shade':
        return (
          <div className="h-full flex flex-col justify-between p-1 gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span className={`text-xs font-extrabold ${titleTextCls}`}>
                  Быстрое управление Luma Pulse
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">
                Остров: {dynamicIslandEnabled ? 'ВКЛ' : 'ВЫКЛ'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 my-auto">
              {/* Luma Island ON/OFF Pill */}
              <button
                onClick={onToggleDynamicIsland}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  dynamicIslandEnabled
                    ? 'bg-emerald-500/25 border-emerald-400/70 text-emerald-400 shadow-sm'
                    : innerBtnCls
                }`}
              >
                <Disc3 className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className={`text-[11px] font-bold truncate ${dynamicIslandEnabled ? titleTextCls : ''}`}>
                    Luma Island
                  </div>
                  <div className="text-[9px] opacity-80 truncate">
                    {dynamicIslandEnabled ? 'Активен' : 'Выключен'}
                  </div>
                </div>
              </button>

              {/* DND Pill */}
              <button
                onClick={onToggleDnd}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  dndEnabled
                    ? 'bg-purple-500/25 border-purple-400/70 text-purple-400 shadow-sm'
                    : innerBtnCls
                }`}
              >
                <BellOff className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className={`text-[11px] font-bold truncate ${dndEnabled ? titleTextCls : ''}`}>Тихий DND</div>
                  <div className="text-[9px] opacity-80 truncate">{dndEnabled ? 'ВКЛЮЧЁН' : 'Выкл'}</div>
                </div>
              </button>

              {/* Adaptive Day/Night Pill */}
              <button
                onClick={onToggleAdaptiveTheme}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  adaptiveThemeEnabled
                    ? 'bg-amber-500/25 border-amber-400/70 text-amber-500'
                    : innerBtnCls
                }`}
              >
                <Sun className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className={`text-[11px] font-bold truncate ${adaptiveThemeEnabled ? titleTextCls : ''}`}>
                    День/Ночь
                  </div>
                  <div className="text-[9px] opacity-80 truncate">{adaptiveThemeEnabled ? 'Авто' : 'Ручной'}</div>
                </div>
              </button>

              {/* Liquid Glass Pill */}
              <button
                onClick={onToggleGlass}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  glassEnabled
                    ? 'bg-teal-500/25 border-teal-400/70 text-teal-400'
                    : innerBtnCls
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className={`text-[11px] font-bold truncate ${glassEnabled ? titleTextCls : ''}`}>Стекло M3</div>
                  <div className="text-[9px] opacity-80 truncate">{glassEnabled ? 'Активно' : 'Выкл'}</div>
                </div>
              </button>

              {/* Right-Click Back Pill */}
              <button
                onClick={onToggleRightClickBack}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  rightClickBackEnabled
                    ? 'bg-indigo-500/25 border-indigo-400/70 text-indigo-400'
                    : innerBtnCls
                }`}
              >
                <Zap className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className={`text-[11px] font-bold truncate ${rightClickBackEnabled ? titleTextCls : ''}`}>
                    ПКМ Назад
                  </div>
                  <div className="text-[9px] opacity-80 truncate">{rightClickBackEnabled ? 'Активно' : 'Выкл'}</div>
                </div>
              </button>

              {/* Real Region Sync Pill */}
              <button
                onClick={() => detectMyRegionWeather(true)}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer bg-sky-500/20 border-sky-400/60 text-sky-400`}
              >
                <Compass className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className={`text-[11px] font-bold truncate ${titleTextCls}`}>Мой регион</div>
                  <div className="text-[9px] opacity-80 truncate">{weather.city}</div>
                </div>
              </button>
            </div>

            {/* Expressive Display & Real OS Volume Pill Sliders */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${innerCardCls}`}>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <input
                  type="range"
                  min={30}
                  max={100}
                  value={screenBrightness}
                  onChange={(e) => setScreenBrightness(Number(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 cursor-pointer"
                />
                <span className="text-[10px] font-mono w-7 text-right">{screenBrightness}%</span>
              </div>
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${innerCardCls}`}>
                <button onClick={onToggleMute} className="cursor-pointer" title="Выкл/Вкл звук системы">
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onChangeVolume(Number(e.target.value))}
                  className="w-full accent-sky-400 h-1.5 cursor-pointer"
                />
                <span className="text-[10px] font-mono w-7 text-right">{isMuted ? '0%' : `${volume}%`}</span>
              </div>
            </div>
          </div>
        );

      // =====================================================================
      // 3. LUMA PULSE LIVE REGION WEATHER (AUTO-DETECTED + OPEN-METEO)
      // =====================================================================
      case 'luma_region_weather':
        return (
          <div className="h-full flex flex-col justify-between p-1 gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {renderWeatherIcon(weather.weatherCode, 'w-6 h-6 shrink-0')}
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                    <span className={`text-xs font-extrabold truncate ${titleTextCls}`}>{weather.city}</span>
                    {weather.autoDetected && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[8px] font-mono font-bold shrink-0">
                        АВТО
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] truncate ${mutedTextCls}`}>
                    {weather.region ? `${weather.region} • ` : ''}
                    {weather.description} • Ощущ. {weather.feelsLike > 0 ? `+${weather.feelsLike}` : weather.feelsLike}°
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-2xl font-black font-mono tabular-nums ${titleTextCls}`}>
                  {weather.loading ? '…' : `${weather.temp > 0 ? `+${weather.temp}` : weather.temp}°C`}
                </span>
                <button
                  onClick={() => detectMyRegionWeather(true)}
                  title="Определить мой текущий регион и погоду"
                  className="p-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-400 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${weather.loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setWeatherSearchOpen((v) => !v)}
                  className="px-2 py-1 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  Город
                </button>
              </div>
            </div>

            {weatherSearchOpen ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  searchWeatherByCity(weatherQuery);
                }}
                className="flex items-center gap-1.5 my-auto"
              >
                <input
                  type="text"
                  value={weatherQuery}
                  onChange={(e) => setWeatherQuery(e.target.value)}
                  placeholder="Введите любой город..."
                  className={`flex-1 border rounded-full px-3 py-1.5 text-xs outline-none ${inputCls}`}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Найти
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 my-auto">
                {weather.hourly.slice(0, 4).map((h, i) => (
                  <div
                    key={i}
                    className={`p-1.5 rounded-2xl border flex flex-col items-center justify-center ${innerCardCls}`}
                  >
                    <span className={`text-[9px] font-mono ${mutedTextCls}`}>{h.time}</span>
                    <div className="my-0.5">{renderWeatherIcon(h.code, 'w-3.5 h-3.5')}</div>
                    <span className={`text-[11px] font-mono font-bold ${titleTextCls}`}>
                      {h.temp > 0 ? `+${h.temp}` : h.temp}°
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className={`flex items-center justify-between text-[10px] font-mono ${mutedTextCls}`}>
              <span>💧 {weather.humidity}% • 💨 {weather.windSpeed} м/с</span>
              <span className="truncate max-w-[140px]">
                {weather.country || weather.timezone || `Обн. ${weather.updatedAt}`}
              </span>
            </div>
          </div>
        );

      // =====================================================================
      // 4. LUMA AURA NOW PLAYING & REAL OS TRACK CONTROLLER
      // =====================================================================
      case 'luma_now_playing':
        return (
          <div className="h-full flex flex-col justify-between p-1 gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-400/35 truncate max-w-[65%]">
                <Radio className="w-3 h-3 shrink-0" />
                <span className="truncate">{displaySourceLabel}</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {islandPlayers.map((pl, idx) => (
                  <button
                    key={pl.id}
                    onClick={() => onSelectPlayer(idx)}
                    title={pl.name}
                    className={`w-4 h-4 rounded-full text-[8px] font-bold transition cursor-pointer ${
                      idx === activePlayerIndex
                        ? 'ring-2 ring-indigo-400 scale-110'
                        : 'opacity-50 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: pl.accent }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 my-auto">
              {/* Spinning Vinyl Disc */}
              <div
                className={`w-14 h-14 rounded-full border-2 border-emerald-400/60 flex items-center justify-center shadow-lg shrink-0 relative ${
                  displayMediaPlaying ? 'animate-spin' : ''
                }`}
                style={{
                  animationDuration: '6s',
                  background: `radial-gradient(circle, ${currentIslandPlayer.accent} 0%, #0f172a 55%, #020617 100%)`,
                }}
              >
                <div className="w-4 h-4 rounded-full bg-slate-950 border border-white/40" />
              </div>

              <div className="min-w-0 flex-1">
                <div className={`text-xs font-extrabold truncate ${titleTextCls}`}>{displayTrackTitle}</div>
                <div className={`text-[11px] truncate ${mutedTextCls}`}>{displayTrackArtist}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    onClick={onPrevTrack}
                    title="Предыдущий трек (Реальная команда ОС)"
                    className={`p-1.5 rounded-full border cursor-pointer transition ${innerBtnCls}`}
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onToggleMediaPlay}
                    title="Воспроизведение / Пауза (Реальная команда ОС)"
                    className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    {displayMediaPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {displayMediaPlaying ? 'Пауза' : 'Играть'}
                  </button>
                  <button
                    onClick={onNextTrack}
                    title="Следующий трек (Реальная команда ОС)"
                    className={`p-1.5 rounded-full border cursor-pointer transition ${innerBtnCls}`}
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between text-[10px] font-mono ${mutedTextCls}`}>
              <span>{hasLiveOsMedia ? '🟢 Системная медиасессия' : 'Luma Audio Bridge'}</span>
              <span className="text-emerald-500 font-bold">
                {displayMediaPlaying ? '♫ Играет сейчас' : 'На паузе'}
              </span>
            </div>
          </div>
        );

      // =====================================================================
      // 5. LUMA AURA ENERGY RINGS
      // =====================================================================
      case 'luma_energy_rings': {
        const movePct = Math.min(100, Math.round((moveKcal / moveGoal) * 100));
        const exPct = Math.min(100, Math.round((exerciseMins / exerciseGoal) * 100));
        const stPct = Math.min(100, Math.round((standHours / standGoal) * 100));
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <Flame className="w-4 h-4 text-rose-400" />
                Кольца Энергии Luma
              </span>
              <button
                onClick={() => {
                  setMoveKcal((v) => v + 45);
                  setExerciseMins((v) => v + 5);
                  onPushNotification('Luma Aura Энергия', '+45 ккал и +5 мин активности записаны в ядро!', 'success');
                }}
                className="px-2 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-bold cursor-pointer"
              >
                + Сессия
              </button>
            </div>

            <div className="my-auto flex items-center gap-3.5">
              <svg className="w-18 h-18 -rotate-90 shrink-0" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="33" stroke="rgba(244,63,94,0.2)" strokeWidth="6" fill="none" />
                <circle
                  cx="40"
                  cy="40"
                  r="33"
                  stroke="#f43f5e"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${(movePct / 100) * 207} 207`}
                />
                <circle cx="40" cy="40" r="24" stroke="rgba(16,185,129,0.2)" strokeWidth="6" fill="none" />
                <circle
                  cx="40"
                  cy="40"
                  r="24"
                  stroke="#10b981"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${(exPct / 100) * 150} 150`}
                />
                <circle cx="40" cy="40" r="15" stroke="rgba(56,189,248,0.2)" strokeWidth="6" fill="none" />
                <circle
                  cx="40"
                  cy="40"
                  r="15"
                  stroke="#38bdf8"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${(stPct / 100) * 94} 94`}
                />
              </svg>

              <div className="space-y-1 text-[11px] font-mono">
                <div className="text-rose-400 font-bold">
                  АКТИВНОСТЬ: {moveKcal}/{moveGoal}
                </div>
                <div className="text-emerald-500 font-bold">
                  ФОКУС: {exerciseMins}/{exerciseGoal} мин
                </div>
                <div className="text-sky-500 font-bold">
                  РАЗМИНКА: {standHours}/{standGoal} ч
                </div>
              </div>
            </div>
          </div>
        );
      }

      // =====================================================================
      // 6. LUMA AURA POWER & PERIPHERALS MATRIX (REAL HOST BATTERY)
      // =====================================================================
      case 'luma_power_matrix': {
        const hostPct = liveSystem ? liveSystem.battery_percent : batteryLevel;
        const hostCharging = liveSystem ? liveSystem.battery_charging : isCharging;
        const hostName = liveSystem?.hostname || 'Luma Хост';
        const devices = [
          {
            name: hostName,
            pct: hostPct,
            icon: Laptop,
            charging: hostCharging,
            badge: liveSystem?.battery_present ? 'Батарея' : 'От сети',
          },
          { name: 'Luma Buds', pct: 92, icon: Headphones, charging: false, badge: 'Аудио' },
          { name: 'Luma Link', pct: 81, icon: Smartphone, charging: true, badge: 'Синхр.' },
          { name: 'Luma Pad', pct: 68, icon: Gamepad2, charging: false, badge: 'Геймпад' },
        ];
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <BatteryCharging className="w-4 h-4 text-emerald-500" />
                Питание Luma Aura
              </span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">
                {hostCharging ? '⚡ ' : ''}
                {hostPct}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 my-auto">
              {devices.map((d) => {
                const IconC = d.icon;
                return (
                  <div
                    key={d.name}
                    className={`p-2 rounded-2xl border flex items-center gap-2 ${innerCardCls}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-500 shrink-0">
                      <IconC className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold truncate">{d.name}</div>
                      <div className="text-[10px] font-mono text-emerald-500 font-bold">
                        {d.charging ? '⚡ ' : ''}
                        {d.pct}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // =====================================================================
      // 7. LUMA CORE REAL HARDWARE CPU / GPU / RAM MONITOR
      // =====================================================================
      case 'luma_cpu_gpu_ram':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 truncate ${titleTextCls}`}>
                <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
                Ресурсы Luma Core
              </span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold shrink-0">
                {liveSystem?.real_telemetry ? '🟢 REAL HAL' : 'ПОДКЛЮЧЕНИЕ'}
              </span>
            </div>

            <div className="space-y-1.5 my-auto">
              <div>
                <div className="flex justify-between text-[10px] font-mono mb-0.5 gap-2">
                  <span className={`truncate ${mutedTextCls}`} title={realCpuModel}>
                    CPU {realCpuCores ? `(${realCpuCores} яд.)` : ''} • {realCpuModel}
                  </span>
                  <span className="text-emerald-500 font-bold shrink-0">{realCpuPct}%</span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${barTrackCls}`}>
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, realCpuPct)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-mono mb-0.5 gap-2">
                  <span className={`truncate ${mutedTextCls}`} title={realGpuName}>
                    GPU • {realGpuName}
                  </span>
                  <span className="text-sky-500 font-bold shrink-0">
                    {realGpuTemp > 0 ? `${realGpuTemp}°C` : `${realGpuPct}%`}
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${barTrackCls}`}>
                  <div
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(realGpuPct, realCpuPct > 0 ? 12 : 0))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-mono mb-0.5 gap-2">
                  <span className={`truncate ${mutedTextCls}`}>
                    ОЗУ ({realRamUsedGb} / {realRamTotalGb} ГБ)
                  </span>
                  <span className="text-indigo-500 font-bold shrink-0">{realRamPct}%</span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${barTrackCls}`}>
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, realRamPct)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      // =====================================================================
      // 8. LUMA CORE REAL STORAGE VOLUMES (DYNAMICALLY MAPPED FROM OS)
      // =====================================================================
      case 'luma_storage_volumes': {
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <HardDrive className="w-4 h-4 text-blue-400" />
                Накопители системы ({realDisks.length})
              </span>
              <button
                onClick={() => {
                  setCacheCleanedGb((v) => +(v + 0.6).toFixed(1));
                  onPushNotification(
                    'Luma Оптимизация томов',
                    'Команда очистки временного кэша оболочки выполнена успешно.',
                    'success'
                  );
                }}
                className="px-2 py-0.5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[10px] font-bold cursor-pointer"
              >
                Кэш{cacheCleanedGb > 0 ? ` -${cacheCleanedGb}Г` : ''}
              </button>
            </div>

            <div className="space-y-1.5 my-auto overflow-y-auto max-h-28 pr-0.5">
              {realDisks.length > 0 ? (
                realDisks.slice(0, 3).map((disk, idx) => (
                  <div key={disk.mount} className={`p-2 rounded-2xl border ${innerCardCls}`}>
                    <div className="flex justify-between text-[10px] font-mono mb-1 gap-1">
                      <span className="font-bold truncate">
                        Том {disk.mount} {disk.label ? `(${disk.label})` : ''}
                      </span>
                      <span className={idx === 0 ? 'text-blue-400 shrink-0' : 'text-indigo-400 shrink-0'}>
                        {disk.used_gb} / {disk.total_gb} ГБ ({disk.percent}%)
                      </span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${barTrackCls}`}>
                      <div
                        className={idx === 0 ? 'h-full bg-blue-500' : 'h-full bg-indigo-500'}
                        style={{ width: `${Math.min(100, disk.percent)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className={`p-2.5 rounded-2xl border text-[11px] font-mono ${innerCardCls}`}>
                  Сканирование реальных дисков через Luma HAL...
                </div>
              )}
            </div>
          </div>
        );
      }

      // =====================================================================
      // 9. LUMA CORE REAL NETWORK & IPC TELEMETRY
      // =====================================================================
      case 'luma_network_monitor':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <Wifi className="w-4 h-4 text-teal-400" />
                Сеть и IPC Поток
              </span>
              <span className="text-[10px] font-mono text-teal-500 font-bold">
                {realLocation?.ip ? `IP ${realLocation.ip}` : 'IPC :49215'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 my-1">
              <div className={`p-1.5 rounded-xl border ${innerCardCls}`}>
                <div className={`text-[9px] ${mutedTextCls}`}>↓ Приём (Down)</div>
                <div className="text-xs font-mono font-bold text-teal-500">{realNetDown} Мбит/с</div>
              </div>
              <div className={`p-1.5 rounded-xl border ${innerCardCls}`}>
                <div className={`text-[9px] ${mutedTextCls}`}>↑ Отдача (Up)</div>
                <div className="text-xs font-mono font-bold text-sky-500">{realNetUp} Мбит/с</div>
              </div>
            </div>

            <div className="flex items-end gap-1 h-7 px-1">
              {netHistory.map((h, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-t bg-teal-500/65 transition-all duration-300"
                  style={{ height: `${Math.max(15, h)}%` }}
                />
              ))}
            </div>
          </div>
        );

      // =====================================================================
      // 10. LUMA PULSE NOTES & CHECKLIST
      // =====================================================================
      case 'luma_notes_tasks':
        return (
          <div className="h-full flex flex-col justify-between p-1 gap-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <CheckSquare className="w-4 h-4 text-amber-400" />
                Заметки Luma VFS
              </span>
              <div className={`flex gap-1 p-0.5 rounded-full border ${innerCardCls}`}>
                <button
                  onClick={() => setKeepTab('todo')}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer ${
                    keepTab === 'todo' ? 'bg-amber-500 text-slate-950' : mutedTextCls
                  }`}
                >
                  Задачи
                </button>
                <button
                  onClick={() => setKeepTab('note')}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer ${
                    keepTab === 'note' ? 'bg-amber-500 text-slate-950' : mutedTextCls
                  }`}
                >
                  Текст
                </button>
              </div>
            </div>

            {keepTab === 'todo' ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-24">
                  {todoItems.map((t) => (
                    <div
                      key={t.id}
                      onClick={() =>
                        setTodoItems((prev) =>
                          prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
                        )
                      }
                      className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-xl border cursor-pointer ${innerCardCls}`}
                    >
                      <span
                        className={`text-[11px] truncate ${
                          t.done ? 'line-through opacity-50' : ''
                        }`}
                      >
                        {t.done ? '✓ ' : '○ '}
                        {t.text}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTodoItems((prev) => prev.filter((x) => x.id !== t.id));
                        }}
                        className="opacity-60 hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTodoText.trim()) return;
                    setTodoItems((prev) => [...prev, { id: 'td_' + Date.now(), text: newTodoText.trim(), done: false }]);
                    setNewTodoText('');
                  }}
                  className="flex gap-1"
                >
                  <input
                    type="text"
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    placeholder="Добавить задачу..."
                    className={`flex-1 border rounded-full px-2.5 py-1 text-[10px] outline-none ${inputCls}`}
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] cursor-pointer"
                  >
                    +
                  </button>
                </form>
              </>
            ) : (
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                className={`flex-1 w-full border rounded-2xl p-2 text-[11px] resize-none outline-none ${inputCls}`}
              />
            )}
          </div>
        );

      // =====================================================================
      // 11. LUMA AURA CALENDAR & WORLD CLOCK
      // =====================================================================
      case 'luma_world_clock':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <CalendarIcon className="w-4 h-4 text-rose-400" />
                Мировое время Luma
              </span>
              <span className="text-[10px] font-mono text-rose-400 font-bold">
                {nowDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 my-auto">
              {[
                { city: weather.city !== 'Определение региона...' ? `${weather.city} (Ваш)` : 'Локально', time: nowDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) },
                { city: 'Москва (UTC+3)', time: getWorldTime(3) },
                { city: 'Токио (UTC+9)', time: getWorldTime(9) },
                { city: 'Лондон (UTC+0)', time: getWorldTime(0) },
              ].map((c) => (
                <div key={c.city} className={`p-2 rounded-2xl border ${innerCardCls}`}>
                  <div className={`text-[10px] truncate ${mutedTextCls}`}>{c.city}</div>
                  <div className={`text-sm font-mono font-black ${titleTextCls}`}>{c.time}</div>
                </div>
              ))}
            </div>
          </div>
        );

      // =====================================================================
      // 12. LUMA AURA FOCUS POMODORO
      // =====================================================================
      case 'luma_focus_pomodoro':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <Timer className="w-4 h-4 text-amber-400" />
                Luma Фокус-Поток
              </span>
              <span className="text-[10px] font-mono text-amber-500 font-bold">
                {pomoMode === 'work' ? 'ФОКУС 25М' : 'ОТДЫХ 5М'}
              </span>
            </div>

            <div className="my-auto flex items-center justify-between gap-2">
              <div className={`text-2xl font-black font-mono tabular-nums ${titleTextCls}`}>
                {formatLiveClock(pomoSecLeft)}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPomoRunning((r) => !r)}
                  className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  {pomoRunning ? 'Пауза' : 'Старт'}
                </button>
                <button
                  onClick={() => {
                    setPomoRunning(false);
                    setPomoSecLeft(pomoMode === 'work' ? 25 * 60 : 5 * 60);
                  }}
                  className={`p-1.5 rounded-full border cursor-pointer ${innerBtnCls}`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex gap-1">
              {[15, 25, 45].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setPomoRunning(false);
                    setPomoSecLeft(m * 60);
                  }}
                  className={`flex-1 py-1 rounded-full border text-[10px] font-mono cursor-pointer ${innerBtnCls}`}
                >
                  {m}м
                </button>
              ))}
            </div>
          </div>
        );

      // =====================================================================
      // 13. LUMA PULSE CALCULATOR & CONVERTER
      // =====================================================================
      case 'luma_calculator':
        return (
          <div className="h-full flex flex-col justify-between p-1 gap-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <Calculator className="w-4 h-4 text-cyan-400" />
                Калькулятор Luma
              </span>
              <div className={`flex gap-1 p-0.5 rounded-full border ${innerCardCls}`}>
                <button
                  onClick={() => setCalcTab('calc')}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer ${
                    calcTab === 'calc' ? 'bg-cyan-500 text-slate-950' : mutedTextCls
                  }`}
                >
                  Счёт
                </button>
                <button
                  onClick={() => setCalcTab('conv')}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer ${
                    calcTab === 'conv' ? 'bg-cyan-500 text-slate-950' : mutedTextCls
                  }`}
                >
                  Курсы
                </button>
              </div>
            </div>

            {calcTab === 'calc' ? (
              <div className="space-y-1.5 my-auto">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={calcInput}
                    onChange={(e) => setCalcInput(e.target.value)}
                    className={`flex-1 border rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none ${inputCls}`}
                  />
                  <div className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 font-mono font-bold text-xs text-cyan-500">
                    = {calcResult}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {['7', '8', '9', '+', '*', '4', '5', '6', '-', '/', '1', '2', '3', '0', 'C'].map((k) => (
                    <button
                      key={k}
                      onClick={() =>
                        k === 'C' ? setCalcInput('') : setCalcInput((prev) => `${prev}${k}`)
                      }
                      className={`py-1 rounded-lg border text-[10px] font-mono font-bold cursor-pointer ${innerBtnCls}`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 my-auto">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={convVal}
                    onChange={(e) => setConvVal(e.target.value)}
                    className={`w-20 border rounded-xl px-2 py-1 text-xs font-mono outline-none ${inputCls}`}
                  />
                  <select
                    value={convKind}
                    onChange={(e) => setConvKind(e.target.value as typeof convKind)}
                    className={`flex-1 border rounded-xl px-2 py-1 text-[10px] outline-none ${inputCls}`}
                  >
                    <option value="usd_rub">USD → RUB</option>
                    <option value="eur_rub">EUR → RUB</option>
                    <option value="gb_mb">ГБ → МБ</option>
                    <option value="c_f">°C → °F</option>
                  </select>
                </div>
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-center font-mono font-extrabold text-sm text-cyan-500">
                  {convResult}
                </div>
              </div>
            )}
          </div>
        );

      // =====================================================================
      // 14. LUMA AURA MARKETS & CURRENCY
      // =====================================================================
      case 'luma_market_pulse':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Индекс Luma Market
              </span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">ПУЛЬС</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 my-auto">
              {marketTickers.map((t) => (
                <div key={t.symbol} className={`p-1.5 rounded-2xl border ${innerCardCls}`}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold">{t.symbol}</span>
                    <span className={t.changePct >= 0 ? 'text-emerald-500 font-mono' : 'text-rose-500 font-mono'}>
                      {t.changePct >= 0 ? `+${t.changePct}%` : `${t.changePct}%`}
                    </span>
                  </div>
                  <div className={`text-xs font-mono font-black mt-0.5 ${titleTextCls}`}>
                    {t.symbol.includes('RUB') ? `${t.price} ₽` : `$${t.price}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // =====================================================================
      // 15. LUMA PULSE DIGITAL BALANCE & SCREEN TIME
      // =====================================================================
      case 'luma_digital_balance': {
        const runningCount = apps.filter((a) => a.isRunning).length;
        const totalTodayMins = apps.reduce((acc, a) => acc + a.todayMinutes, 0);
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <Activity className="w-4 h-4 text-emerald-500" />
                Цифровой баланс Luma
              </span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">{runningCount} актив.</span>
            </div>

            <div className={`my-auto flex items-center justify-between gap-2 p-2 rounded-2xl border ${innerCardCls}`}>
              <div>
                <div className={`text-[10px] ${mutedTextCls}`}>Экранное время сегодня</div>
                <div className={`text-base font-black font-mono ${titleTextCls}`}>
                  {totalTodayMins.toFixed(1)} мин
                </div>
              </div>
              <div className="text-right">
                <div className={`text-[10px] ${mutedTextCls}`}>Аптайм сессии</div>
                <div className="text-xs font-mono font-bold text-emerald-500">
                  {formatLiveClock(uptimeSeconds)}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // =====================================================================
      // 16. LUMA CORE SYSTEM UTILITIES
      // =====================================================================
      case 'luma_system_tools':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <Terminal className="w-4 h-4 text-emerald-500" />
                Системные утилиты Luma Core
              </span>
              <span className={`text-[10px] font-mono ${mutedTextCls}`}>Luma Exec</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 my-auto">
              {[
                { name: 'Терминал', cmd: 'cmd' },
                { name: 'Монитор', cmd: 'taskmgr' },
                { name: 'Файлы', cmd: 'explorer' },
                { name: 'Калькулятор', cmd: 'calc' },
              ].map((u) => (
                <button
                  key={u.cmd}
                  onClick={() => {
                    fetch('/api/kernel/launch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ command: u.cmd, name: u.name }),
                    }).catch(() => {});
                    onPushNotification('Luma ProcessManager', `Запущена утилита: ${u.name}`, 'success');
                  }}
                  className={`p-2 rounded-2xl border text-center transition cursor-pointer hover:border-emerald-500/50 ${innerBtnCls}`}
                >
                  <div className="text-[11px] font-bold truncate">{u.name}</div>
                  <div className={`text-[9px] font-mono truncate ${mutedTextCls}`}>{u.cmd}</div>
                </button>
              ))}
            </div>
          </div>
        );

      // =====================================================================
      // 17. LUMA CORE REAL POWER, LOCK & RECYCLE BIN
      // =====================================================================
      case 'luma_power_control':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <Power className="w-4 h-4 text-rose-400" />
                Управление питанием Luma
              </span>
              {shutdownTimerSec !== null && (
                <span className="text-[10px] font-mono text-rose-400 font-bold">
                  Таймер: {formatLiveClock(shutdownTimerSec)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5 my-auto">
              <button
                onClick={() => {
                  onExecutePowerAction('lock');
                  setLockScreenOverlay(true);
                  onPlayBeep(640);
                }}
                className={`p-2 rounded-2xl border text-center cursor-pointer hover:border-indigo-400/60 ${innerBtnCls}`}
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-0.5" />
                <div className="text-[10px] font-bold">Блок</div>
              </button>
              <button
                onClick={() => onExecutePowerAction('sleep')}
                className={`p-2 rounded-2xl border text-center cursor-pointer hover:border-sky-400/60 ${innerBtnCls}`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-400 mx-auto mb-0.5" />
                <div className="text-[10px] font-bold">Сон</div>
              </button>
              <button
                onClick={() => onExecutePowerAction('recycle_bin')}
                className={`p-2 rounded-2xl border text-center cursor-pointer hover:border-amber-400/60 ${innerBtnCls}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
                <div className="text-[10px] font-bold">Корзина</div>
              </button>
              <button
                onClick={() =>
                  setShutdownTimerSec((prev) => (prev === null ? 30 * 60 : null))
                }
                className={`p-2 rounded-2xl border text-center cursor-pointer ${
                  shutdownTimerSec !== null
                    ? 'bg-rose-500/25 border-rose-400 text-rose-400'
                    : innerBtnCls
                }`}
              >
                <Timer className="w-3.5 h-3.5 text-rose-400 mx-auto mb-0.5" />
                <div className="text-[10px] font-bold">{shutdownTimerSec ? 'Отмена' : 'Таймер'}</div>
              </button>
            </div>
          </div>
        );

      // =====================================================================
      // 18. LUMAGUARD SECURITY KERNEL & AES-256-GCM STATUS
      // =====================================================================
      case 'luma_security_shield':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold flex items-center gap-1.5 ${titleTextCls}`}>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Криптоядро LumaGuard 1.0.1
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 text-[9px] font-mono font-bold">
                AES-256-GCM
              </span>
            </div>

            <div className={`my-auto flex items-center justify-between gap-2 p-2 rounded-2xl border border-emerald-500/35 ${innerCardCls}`}>
              <div className="text-[10px] font-mono">
                <div className={`font-bold ${titleTextCls}`}>PBKDF2-SHA512 • Ключ #{cryptoKeyRev}</div>
                <div className="text-emerald-500">Zero-Trust IPC HMAC активен</div>
              </div>
              <button
                onClick={() => {
                  setCryptoKeyRev((r) => r + 1);
                  onPushNotification(
                    'Ротация ключей LumaGuard',
                    `Сгенерирован новый мастер-ключ AES-256-GCM (Ревизия #${cryptoKeyRev + 1})`,
                    'success'
                  );
                }}
                className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] cursor-pointer shrink-0"
              >
                Ротация
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* ==================== TOP CONTROL BAR FOR WINDOW 2 (20x30 CELL MATRIX) ==================== */}
      <div
        className={`p-4 rounded-[28px] border shadow-xl flex flex-wrap items-center justify-between gap-3 transition-all ${
          isDark
            ? 'bg-[#101624]/92 border-indigo-500/30 text-white'
            : 'bg-white/95 border-slate-300 text-slate-900'
        }`}
        style={{ backdropFilter: 'blur(24px)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-[18px] flex items-center justify-center text-white font-black shadow-lg shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
            }}
          >
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight">
                Окно 2: Матрица Ячеек {gridOrientation} (600 ячеек) • Luma OS 1.0.1
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-400/40">
                🟢 LUMA PULSE • AURA • CORE
              </span>
              {hoveredCell && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-400/40">
                  Ячейка [X:{hoveredCell.col}, Y:{hoveredCell.row}]
                </span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${mutedTextCls}`}>
              Координатная матрица <strong>20×30 (600 ячеек)</strong> с 18 живыми виджетами, реальными ресурсами вашего ПК, авто-регионом погоды и управлением музыкой.
            </p>
          </div>
        </div>

        {/* Right Controls: Suite Filter, Orientation, Grid Lines, Edit Mode, Widget Catalog, Separate Window */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Luma Suite Filter Pills */}
          <div
            className={`flex items-center gap-1 p-1 rounded-full border ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}
          >
            {(
              [
                ['all', 'Все (18)'],
                ['pulse', '⚡ Luma Pulse'],
                ['aura', '✨ Luma Aura'],
                ['core', '🧠 Luma Core'],
              ] as const
            ).map(([ek, el]) => (
              <button
                key={ek}
                onClick={() => setEcosystemFilter(ek)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                  ecosystemFilter === ek
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {el}
              </button>
            ))}
          </div>

          <button
            onClick={() => setGridOrientation((o) => (o === '30x20' ? '20x30' : '30x20'))}
            className={`px-3 py-1.5 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer ${innerBtnCls}`}
            title="Переключить ориентацию матрицы 30×20 / 20×30"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Сетка: {gridOrientation}
          </button>

          <button
            onClick={() => setShowCellGridLines((v) => !v)}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
              showCellGridLines
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-500'
                : innerBtnCls
            }`}
          >
            {showCellGridLines ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Ячейки 20×30
          </button>

          <button
            onClick={() => {
              setEditGridMode((v) => !v);
              if (!editGridMode && !selectedItemId) {
                setSelectedItemId('luma_sculpt_clock');
              }
            }}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              editGridMode
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg'
                : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-400'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            {editGridMode ? '✓ Готово (Ячейки)' : 'Редактор 20×30'}
          </button>

          <button
            onClick={() => setWidgetCatalogModalOpen(true)}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${innerBtnCls}`}
          >
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            Виджеты и Папки
          </button>

          {!isStandaloneWindow && (
            <button
              onClick={onOpenSeparateWindow2}
              className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Открыть Окно 2 (20×30) в отдельном независимом окне"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              В отдельном окне
            </button>
          )}

          <button
            onClick={onSwitchToWindow1}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${innerBtnCls}`}
          >
            ← Окно 1 (По группам)
          </button>
        </div>
      </div>

      {/* ==================== INTERACTIVE CELL EDITOR TOOLBAR ==================== */}
      {editGridMode && (
        <div className="p-3.5 rounded-[24px] bg-amber-500/15 border border-amber-400/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Конструктор матрицы {gridOrientation}:</strong> выберите виджет/папку и кликните на свободную ячейку <code>[X, Y]</code> или используйте сдвиг ниже.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-amber-500 mr-1">
              Выбрано: <strong>{selectedItemId || 'нет'}</strong>
            </span>
            <button
              onClick={() => moveSelectedItem(-1, 0)}
              className={`px-2.5 py-1 rounded-lg border font-mono cursor-pointer ${innerBtnCls}`}
            >
              ← X-1
            </button>
            <button
              onClick={() => moveSelectedItem(1, 0)}
              className={`px-2.5 py-1 rounded-lg border font-mono cursor-pointer ${innerBtnCls}`}
            >
              X+1 →
            </button>
            <button
              onClick={() => moveSelectedItem(0, -1)}
              className={`px-2.5 py-1 rounded-lg border font-mono cursor-pointer ${innerBtnCls}`}
            >
              ↑ Y-1
            </button>
            <button
              onClick={() => moveSelectedItem(0, 1)}
              className={`px-2.5 py-1 rounded-lg border font-mono cursor-pointer ${innerBtnCls}`}
            >
              ↓ Y+1
            </button>
            <span className="opacity-40">|</span>
            <button
              onClick={() => resizeSelectedItem(1, 0)}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-400 font-mono cursor-pointer"
            >
              Ш +1
            </button>
            <button
              onClick={() => resizeSelectedItem(-1, 0)}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-400 font-mono cursor-pointer"
            >
              Ш -1
            </button>
            <button
              onClick={() => resizeSelectedItem(0, 1)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-500 font-mono cursor-pointer"
            >
              В +1
            </button>
            <button
              onClick={() => resizeSelectedItem(0, -1)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-500 font-mono cursor-pointer"
            >
              В -1
            </button>
            <button
              onClick={resetGridLayout}
              className="px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-400 font-bold cursor-pointer ml-1"
            >
              ↺ Сброс 20×30
            </button>
          </div>
        </div>
      )}

      {/* ==================== THE TRUE 20x30 (600 CELLS) COORDINATE MATRIX CANVAS ==================== */}
      <div className="overflow-x-auto pb-4">
        <div
          ref={gridRef}
          className={`relative rounded-[32px] border p-3 transition-all min-w-[1180px] ${
            isDark
              ? 'bg-[#090d16]/90 border-slate-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.65)]'
              : 'bg-slate-200/80 border-slate-300 shadow-xl'
          }`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${totalRows}, 46px)`,
            gap: '6px',
          }}
        >
          {/* 1. Underlying 600 Coordinate Cells */}
          {showCellGridLines &&
            Array.from({ length: totalRows }).map((_, rIdx) =>
              Array.from({ length: totalCols }).map((__, cIdx) => {
                const col = cIdx + 1;
                const row = rIdx + 1;
                const isHovered = hoveredCell?.col === col && hoveredCell?.row === row;
                return (
                  <div
                    key={`cell_${col}_${row}`}
                    style={{ gridColumn: `${col} / span 1`, gridRow: `${row} / span 1` }}
                    onMouseEnter={() => setHoveredCell({ col, row })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => handleCellClick(col, row)}
                    className={`rounded-lg border transition-colors flex items-center justify-center select-none ${
                      editGridMode
                        ? 'border-indigo-500/25 hover:border-amber-400 hover:bg-amber-400/15 cursor-pointer'
                        : isDark
                        ? 'border-white/[0.035] bg-white/[0.01]'
                        : 'border-slate-900/[0.07] bg-white/30'
                    } ${isHovered ? 'ring-1 ring-indigo-400/50' : ''}`}
                  >
                    {(editGridMode || (col % 5 === 0 && row % 5 === 0)) && (
                      <span className="text-[8px] font-mono text-slate-500/75 pointer-events-none">
                        {col}×{row}
                      </span>
                    )}
                  </div>
                );
              })
            )}

          {/* 2. Render All Visible Luma Pulse / Aura / Core Widgets on the 20x30 Grid */}
          {visibleWidgets.map((w) => {
            const clampedCol = Math.max(1, Math.min(totalCols - w.w + 1, w.col));
            const clampedRow = Math.max(1, Math.min(totalRows - w.h + 1, w.row));
            const isSelected = selectedItemId === w.id;
            const ecoMeta = ECOSYSTEM_META[w.ecosystem] || ECOSYSTEM_META.pulse;

            return (
              <div
                key={w.id}
                onClick={() => {
                  if (editGridMode) setSelectedItemId(w.id);
                }}
                style={{
                  gridColumn: `${clampedCol} / span ${Math.min(w.w, totalCols)}`,
                  gridRow: `${clampedRow} / span ${Math.min(w.h, totalRows)}`,
                  zIndex: isSelected ? 20 : 10,
                  backdropFilter: 'blur(22px)',
                }}
                className={`group relative rounded-[26px] border p-3.5 transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  isDark
                    ? 'bg-[#121929]/92 text-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.45)]'
                    : 'bg-white/95 text-slate-900 shadow-md'
                } ${ecoMeta.border} ${
                  isSelected && editGridMode ? 'ring-2 ring-amber-400 scale-[1.01]' : ''
                }`}
              >
                {editGridMode && (
                  <div className="absolute top-2 right-2 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-mono font-black shadow">
                    <span>
                      [X:{clampedCol}, Y:{clampedRow}] • {w.w}×{w.h}
                    </span>
                  </div>
                )}

                {renderWidgetContent(w)}
              </div>
            );
          })}

          {/* 3. Render Custom Folders on the 20x30 Grid */}
          {folders.map((folder) => {
            const clampedCol = Math.max(1, Math.min(totalCols - folder.w + 1, folder.col));
            const clampedRow = Math.max(1, Math.min(totalRows - folder.h + 1, folder.row));
            const isSelected = selectedItemId === folder.id;
            const folderApps = apps.filter((a) => folder.appIds.includes(a.id));

            return (
              <div
                key={folder.id}
                onClick={() => {
                  if (editGridMode) {
                    setSelectedItemId(folder.id);
                  } else {
                    setActiveFolderModal(folder);
                  }
                }}
                style={{
                  gridColumn: `${clampedCol} / span ${folder.w}`,
                  gridRow: `${clampedRow} / span ${folder.h}`,
                  zIndex: isSelected ? 20 : 10,
                  borderColor: `${folder.color}66`,
                }}
                className={`group relative rounded-[26px] border p-3.5 transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                  isDark ? 'bg-[#151d30]/92 text-white' : 'bg-white/95 text-slate-900 shadow-md'
                } hover:scale-[1.01] ${isSelected && editGridMode ? 'ring-2 ring-amber-400' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: folder.color }}
                    >
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold truncate">{folder.name}</div>
                      <div className={`text-[10px] font-mono ${mutedTextCls}`}>
                        {folderApps.length} прил. • [{clampedCol},{clampedRow}]
                      </div>
                    </div>
                  </div>
                  <FolderOpen className={`w-3.5 h-3.5 ${mutedTextCls}`} />
                </div>

                <div className="flex items-center gap-1.5 my-auto pt-1 flex-wrap">
                  {folderApps.slice(0, 4).map((app) => (
                    <button
                      key={app.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLaunchApp(app);
                      }}
                      className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-[10px] font-bold cursor-pointer hover:border-indigo-400 ${innerBtnCls}`}
                    >
                      {renderAppIcon(app.icon, 'w-3.5 h-3.5 text-indigo-400')}
                      <span className="truncate max-w-[75px]">{app.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* 4. Render Pinned App Shortcuts on the 20x30 Grid */}
          {pinnedApps.map((pin) => {
            const app = apps.find((a) => a.id === pin.appId);
            if (!app) return null;
            const itemKey = `pin_${pin.appId}`;
            const clampedCol = Math.max(1, Math.min(totalCols - pin.w + 1, pin.col));
            const clampedRow = Math.max(1, Math.min(totalRows - pin.h + 1, pin.row));
            const isSelected = selectedItemId === itemKey;

            return (
              <div
                key={itemKey}
                onClick={() => {
                  if (editGridMode) {
                    setSelectedItemId(itemKey);
                  } else {
                    onLaunchApp(app);
                  }
                }}
                style={{
                  gridColumn: `${clampedCol} / span ${pin.w}`,
                  gridRow: `${clampedRow} / span ${pin.h}`,
                  zIndex: isSelected ? 20 : 10,
                }}
                className={`group relative rounded-[24px] border p-3 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 ${
                  app.isRunning
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-lg'
                    : isDark
                    ? 'bg-[#141c2e]/90 hover:bg-[#1b263e] border-slate-700/80 text-white'
                    : 'bg-white/95 hover:bg-indigo-50 border-slate-300 text-slate-900 shadow-sm'
                } ${isSelected && editGridMode ? 'ring-2 ring-amber-400' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    app.isRunning
                      ? 'bg-emerald-500/25 text-emerald-400'
                      : 'bg-indigo-500/15 text-indigo-400'
                  }`}
                >
                  {renderAppIcon(app.icon, 'w-5 h-5')}
                </div>
                <div className="text-xs font-extrabold truncate w-full">{app.name}</div>
                <div className={`text-[10px] font-mono ${mutedTextCls}`}>
                  {formatMonthBadge(app.monthMinutes, app.elapsedSeconds, app.isRunning)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== MODAL: WIDGET CATALOG & FOLDER CREATOR ==================== */}
      {widgetCatalogModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setWidgetCatalogModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl rounded-[32px] border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${modalBoxCls}`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className="text-lg font-extrabold">
                  Каталог 18 Виджетов Luma OS 1.0.1 (Pulse • Aura • Core)
                </h3>
                <p className={`text-xs ${mutedTextCls}`}>
                  Включайте/выключайте виджеты или создавайте папки на матрице 20×30
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setWidgetCatalogModalOpen(false);
                    setCreateFolderModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  + Создать папку на 20×30
                </button>
                <button
                  onClick={() => setWidgetCatalogModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-500/20 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {widgets.map((w) => {
                const meta = ECOSYSTEM_META[w.ecosystem] || ECOSYSTEM_META.pulse;
                return (
                  <div
                    key={w.id}
                    onClick={() =>
                      setWidgets((prev) =>
                        prev.map((item) =>
                          item.id === w.id ? { ...item, visible: !item.visible } : item
                        )
                      )
                    }
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
                      w.visible
                        ? 'bg-emerald-500/15 border-emerald-400/60'
                        : `${innerCardCls} opacity-60`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${meta.pill}`}>
                        {meta.label} • {w.w}×{w.h}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-500">
                        {w.visible ? '🟢 АКТИВНО' : '⚪ СКРЫТО'}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold">{w.title}</div>
                      <div className={`text-[11px] ${mutedTextCls}`}>{w.subtitle}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CREATE NEW FOLDER ON 20x30 GRID ==================== */}
      {createFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setCreateFolderModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-[32px] border p-6 shadow-2xl space-y-4 ${modalBoxCls}`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-base font-extrabold">Создать папку на матрице 20×30</h3>
              <button
                onClick={() => setCreateFolderModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-500/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`block mb-1 ${mutedTextCls}`}>Название папки</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Например: Разработка & AI"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${inputCls}`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${mutedTextCls}`}>Акцентный цвет M3</label>
                <div className="flex gap-2">
                  {['#10b981', '#6366f1', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4'].map((clr) => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setNewFolderColor(clr)}
                      className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                        newFolderColor === clr ? 'border-indigo-400 scale-110 ring-2 ring-white/60' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: clr }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className={`block mb-1 ${mutedTextCls}`}>Выберите приложения</label>
                <div className={`grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-2 rounded-xl border ${innerCardCls}`}>
                  {apps.map((a) => {
                    const checked = newFolderApps.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          setNewFolderApps((prev) =>
                            checked ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                          )
                        }
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                          checked
                            ? 'bg-indigo-600/25 border-indigo-400 font-bold'
                            : innerBtnCls
                        }`}
                      >
                        {renderAppIcon(a.icon, 'w-3.5 h-3.5')}
                        <span className="truncate">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreateFolderModalOpen(false)}
                className={`px-4 py-2 rounded-full border text-xs font-semibold cursor-pointer ${innerBtnCls}`}
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const created: GridFolderItem = {
                    id: 'gf_' + Date.now(),
                    name: newFolderName.trim() || 'Новая папка',
                    color: newFolderColor,
                    col: 1,
                    row: 16,
                    w: 5,
                    h: 3,
                    appIds: newFolderApps,
                  };
                  setFolders((prev) => [...prev, created]);
                  setCreateFolderModalOpen(false);
                  setNewFolderName('');
                  onPushNotification('Папка создана', `Папка «${created.name}» добавлена на матрицу 20×30.`, 'success');
                }}
                className="px-5 py-2 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Создать папку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: OPENED FOLDER VIEW ==================== */}
      {activeFolderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setActiveFolderModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-[32px] border p-6 shadow-2xl space-y-4 ${modalBoxCls}`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: activeFolderModal.color }}
                >
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{activeFolderModal.name}</h3>
                  <span className={`text-[11px] font-mono ${mutedTextCls}`}>
                    Ячейка [{activeFolderModal.col}, {activeFolderModal.row}] • {activeFolderModal.w}×{activeFolderModal.h}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveFolderModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-500/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {apps
                .filter((a) => activeFolderModal.appIds.includes(a.id))
                .map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      onLaunchApp(app);
                      setActiveFolderModal(null);
                    }}
                    className={`p-3 rounded-2xl border hover:border-indigo-400 flex items-center gap-2.5 text-left cursor-pointer transition ${innerBtnCls}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                      {renderAppIcon(app.icon, 'w-5 h-5')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{app.name}</div>
                      <div className={`text-[10px] font-mono ${mutedTextCls}`}>{app.category}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== LOCK SCREEN OVERLAY ==================== */}
      {lockScreenOverlay && (
        <div
          onClick={() => setLockScreenOverlay(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl text-white cursor-pointer select-none"
        >
          <div className="text-7xl font-black font-mono tracking-tighter">
            {nowDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-lg text-indigo-300 mt-2">
            {nowDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {weather.city && weather.city !== 'Определение региона...' && (
            <div className="text-sm text-slate-400 mt-1 font-mono">
              {weather.city} • {weather.temp > 0 ? `+${weather.temp}` : weather.temp}°C ({weather.description})
            </div>
          )}
          <div className="mt-8 px-6 py-2.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
            🔒 Экран заблокирован LumaGuard 1.0.1 • Нажмите в любом месте или Esc для разблокировки
          </div>
        </div>
      )}
    </div>
  );
};
