import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  HardDrive,
  Volume2,
  VolumeX,
  CheckSquare,
  Clock,
  Terminal,
  Wifi,
  Music,
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
  Check,
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
  LayoutGrid,
  FolderOpen,
  Smartphone,
  BatteryCharging,
  Bluetooth,
  BellOff,
  Flame,
  TrendingUp,
  Calendar as CalendarIcon,
  Globe,
  Zap,
  ExternalLink,
  Maximize2,
  Minimize2,
  Move,
  Grid,
  Layers,
  Eye,
  EyeOff,
  ChevronRight,
  Radio,
  Headphones,
  Gamepad2,
  Laptop,
} from 'lucide-react';
import { AppItem, IslandMediaPlayer, formatLiveClock, formatMonthBadge } from '../data/launcherData';

export type WidgetEcosystem = 'android' | 'ios' | 'windows';

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
  country: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  hourly: WeatherHourPoint[];
  loading: boolean;
  updatedAt: string;
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
  batteryLevel: number;
  isCharging: boolean;
  islandPlayers: IslandMediaPlayer[];
  activePlayerIndex: number;
  mediaPlaying: boolean;
  onSelectPlayer: (index: number) => void;
  onToggleMediaPlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onToggleDnd: () => void;
  onToggleAdaptiveTheme: () => void;
  onToggleGlass: () => void;
  onToggleRightClickBack: () => void;
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

const STORAGE_KEY_GRID_20X30 = 'luma_os_1_0_grid_20x30_v2';

// Default 18 Flagship Widgets across Android 16 (Material 3 Expressive), iPhone (iOS 18), and Windows 11
// Placed cleanly onto a 30 columns x 20 rows (600 cells) matrix!
export const DEFAULT_CELL_WIDGETS: CellWidgetItem[] = [
  // ROW 1..4 (Top band: 30 columns total: 6 + 8 + 8 + 8 = 30)
  {
    id: 'android_m3_clock',
    title: 'Android 16 Material 3 Expressive Clock',
    subtitle: 'Scallop Morphing Циферблат и Сводка дня',
    ecosystem: 'android',
    col: 1,
    row: 1,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'android_quick_settings',
    title: 'Шторка быстрых настроек Android 16',
    subtitle: 'Wi-Fi 7, BT, DND, Авто-тема, Стекло, Громкость',
    ecosystem: 'android',
    col: 7,
    row: 1,
    w: 8,
    h: 4,
    visible: true,
  },
  {
    id: 'android_pixel_weather',
    title: 'Погода Google Pixel (Open-Meteo Live)',
    subtitle: 'Поиск любого города мира и почасовой прогноз',
    ecosystem: 'android',
    col: 15,
    row: 1,
    w: 8,
    h: 4,
    visible: true,
  },
  {
    id: 'ios_now_playing',
    title: 'iOS 18 StandBy Музыка и Винил',
    subtitle: 'Анимированный винил, эквалайзер и смена плеера',
    ecosystem: 'ios',
    col: 23,
    row: 1,
    w: 8,
    h: 4,
    visible: true,
  },

  // ROW 5..8 (Second band: 6 + 6 + 6 + 6 + 6 = 30)
  {
    id: 'ios_activity_rings',
    title: 'iOS 18 Fitness — Кольца активности',
    subtitle: 'Подвижность • Фокус-разминка • Часы с разминкой',
    ecosystem: 'ios',
    col: 1,
    row: 5,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'ios_battery_matrix',
    title: 'iOS 18 Batteries — Заряд экосистемы',
    subtitle: 'ПК, AirPods Pro, iPhone 16 Pro, Геймпад',
    ecosystem: 'ios',
    col: 7,
    row: 5,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'win_cpu_gpu_ram',
    title: 'Windows 11 — Монитор CPU / GPU / RAM',
    subtitle: 'Телеметрия ядра Luma 1.0 в реальном времени',
    ecosystem: 'windows',
    col: 13,
    row: 5,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'win_storage_disks',
    title: 'Windows 11 — Накопители C: и D:',
    subtitle: 'NVMe PCIe 4.0 анализатор и очистка кэша',
    ecosystem: 'windows',
    col: 19,
    row: 5,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'win_network_monitor',
    title: 'Windows 11 — Сеть и IPC Трафик',
    subtitle: 'Входящий/исходящий поток и пинг 127.0.0.1:49215',
    ecosystem: 'windows',
    col: 25,
    row: 5,
    w: 6,
    h: 4,
    visible: true,
  },

  // ROW 9..12 (Third band: 6 + 6 + 6 + 6 + 6 = 30)
  {
    id: 'android_keep_notes',
    title: 'Google Keep M3 — Заметки и Задачи',
    subtitle: 'Интерактивный чек-лист и быстрый блокнот ядра',
    ecosystem: 'android',
    col: 1,
    row: 9,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'ios_calendar_worldclock',
    title: 'iOS 18 Календарь и Мировые часы',
    subtitle: 'Москва • Токио • Нью-Йорк • Лондон',
    ecosystem: 'ios',
    col: 7,
    row: 9,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'ios_pomodoro_focus',
    title: 'iOS 18 Focus — Таймер Помидор',
    subtitle: '25 мин фокус / 5 мин отдых со звуковым сигналом',
    ecosystem: 'ios',
    col: 13,
    row: 9,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'android_calculator',
    title: 'Android M3 — Калькулятор и Валюты',
    subtitle: 'Быстрые вычисления и конвертер USD/EUR/RUB',
    ecosystem: 'android',
    col: 19,
    row: 9,
    w: 6,
    h: 4,
    visible: true,
  },
  {
    id: 'ios_stocks_crypto',
    title: 'iOS 18 Stocks — Рынки и Крипто',
    subtitle: 'BTC, ETH, NVDA, AAPL и курс USD/RUB',
    ecosystem: 'ios',
    col: 25,
    row: 9,
    w: 6,
    h: 4,
    visible: true,
  },

  // ROW 13..15 (Fourth band: 6 + 8 + 8 + 8 = 30)
  {
    id: 'android_wellbeing',
    title: 'Android Digital Wellbeing (Экранное время)',
    subtitle: 'Живой учет сессий с 00:00 и лимиты детокса',
    ecosystem: 'android',
    col: 1,
    row: 13,
    w: 6,
    h: 3,
    visible: true,
  },
  {
    id: 'win_quick_utilities',
    title: 'Windows 11 — Быстрый запуск утилит',
    subtitle: 'Терминал, Диспетчер задач, Реестр, Проводник',
    ecosystem: 'windows',
    col: 7,
    row: 13,
    w: 8,
    h: 3,
    visible: true,
  },
  {
    id: 'win_power_center',
    title: 'Windows 11 — Питание и Блокировка',
    subtitle: 'Экран блокировки Win+L, Сон, Перезагрузка и Таймер',
    ecosystem: 'windows',
    col: 15,
    row: 13,
    w: 8,
    h: 3,
    visible: true,
  },
  {
    id: 'win_security_defender',
    title: 'LumaGuard Security & Криптоядро 1.0',
    subtitle: 'AES-256-GCM • PBKDF2-SHA512 • Zero-Trust Песочница',
    ecosystem: 'windows',
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
  batteryLevel,
  isCharging,
  islandPlayers,
  activePlayerIndex,
  mediaPlaying,
  onSelectPlayer,
  onToggleMediaPlay,
  onNextTrack,
  onPrevTrack,
  onToggleDnd,
  onToggleAdaptiveTheme,
  onToggleGlass,
  onToggleRightClickBack,
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

  // --- 20x30 Grid Orientation & Cell Matrix State ---
  // Landscape: 30 cols x 20 rows (600 cells) | Portrait: 20 cols x 30 rows (600 cells)
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

  // Live Telemetry & Widget Interactive States
  const [nowDate, setNowDate] = useState<Date>(new Date());
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(saved?.uptimeSeconds ?? 18420);
  const [cpuUsage, setCpuUsage] = useState<number>(17);
  const [gpuUsage, setGpuUsage] = useState<number>(24);
  const [gpuTempC, setGpuTempC] = useState<number>(52);
  const [ramUsagePct, setRamUsagePct] = useState<number>(41);
  const ramTotalGb = 32;
  const ramUsedGb = useMemo(() => ((ramUsagePct / 100) * ramTotalGb).toFixed(1), [ramUsagePct]);

  // Disks C: and D:
  const [diskCUsedGb, setDiskCUsedGb] = useState<number>(298.4);
  const diskCTotalGb = 512;
  const [diskDUsedGb] = useState<number>(612.0);
  const diskDTotalGb = 1024;

  // Network I/O
  const [netDownMbps, setNetDownMbps] = useState<number>(84.6);
  const [netUpMbps, setNetUpMbps] = useState<number>(22.4);
  const [netHistory, setNetHistory] = useState<number[]>([35, 52, 68, 44, 79, 61, 85, 58, 72, 64]);

  // Android Quick Settings local toggles
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(true);
  const [btEnabled, setBtEnabled] = useState<boolean>(true);
  const [powerSaverEnabled, setPowerSaverEnabled] = useState<boolean>(false);
  const [screenBrightness, setScreenBrightness] = useState<number>(88);

  // iOS 18 Activity Rings
  const [moveKcal, setMoveKcal] = useState<number>(540);
  const moveGoal = 650;
  const [exerciseMins, setExerciseMins] = useState<number>(38);
  const exerciseGoal = 45;
  const [standHours, setStandHours] = useState<number>(10);
  const standGoal = 12;

  // Google Keep Notes & To-Do
  const [todoItems, setTodoItems] = useState<TodoItem[]>(
    saved?.todoItems || [
      { id: 't1', text: 'Проверить ядро Luma 1.0 (Android HAL + Binder IPC)', done: true },
      { id: 't2', text: 'Протестировать сетку 20×30 (600 ячеек) во 2-м окне', done: true },
      { id: 't3', text: 'Запустить готовый LumaOS_1.0.exe в 1 клик', done: false },
    ]
  );
  const [newTodoText, setNewTodoText] = useState<string>('');
  const [quickNote, setQuickNote] = useState<string>(
    saved?.quickNote || 'Luma OS 1.0 • Material 3 Expressive: все 18 виджетов Android, iOS 18 и Windows 11 активны.'
  );
  const [keepTab, setKeepTab] = useState<'todo' | 'note'>('todo');

  // iOS 18 Pomodoro Focus
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');
  const [pomoSecLeft, setPomoSecLeft] = useState<number>(25 * 60);
  const [pomoRunning, setPomoRunning] = useState<boolean>(false);

  // Google Pixel Weather (Open-Meteo Live API)
  const [weatherQuery, setWeatherQuery] = useState<string>('');
  const [weatherSearchOpen, setWeatherSearchOpen] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherState>(
    saved?.weather || {
      city: 'Москва',
      country: 'Россия',
      temp: 21,
      feelsLike: 20,
      humidity: 52,
      windSpeed: 3.6,
      weatherCode: 1,
      description: 'Малооблачно',
      hourly: [
        { time: '12:00', temp: 21, code: 1 },
        { time: '15:00', temp: 23, code: 0 },
        { time: '18:00', temp: 19, code: 2 },
        { time: '21:00', temp: 16, code: 3 },
      ],
      loading: false,
      updatedAt: 'Только что',
    }
  );

  // Android M3 Calculator & Converter
  const [calcTab, setCalcTab] = useState<'calc' | 'conv'>('calc');
  const [calcInput, setCalcInput] = useState<string>('256 * 18');
  const [convVal, setConvVal] = useState<string>('100');
  const [convKind, setConvKind] = useState<'usd_rub' | 'eur_rub' | 'gb_mb' | 'c_f'>('usd_rub');

  // iOS 18 Stocks & Crypto
  const [marketTickers, setMarketTickers] = useState([
    { symbol: 'BTC/USD', name: 'Bitcoin', price: 94280, changePct: +3.42 },
    { symbol: 'ETH/USD', name: 'Ethereum', price: 3185, changePct: +2.15 },
    { symbol: 'NVDA', name: 'NVIDIA Corp', price: 142.6, changePct: +4.18 },
    { symbol: 'USD/RUB', name: 'Доллар США', price: 92.45, changePct: -0.35 },
  ]);

  // Windows Power Timer & Security
  const [shutdownTimerSec, setShutdownTimerSec] = useState<number | null>(null);
  const [cryptoKeyRev, setCryptoKeyRev] = useState<number>(1);

  const gridRef = useRef<HTMLDivElement | null>(null);

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

  // 1-second live kernel telemetry loop
  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
      setUptimeSeconds((s) => s + 1);

      setCpuUsage((prev) => Math.max(6, Math.min(95, prev + Math.floor(Math.random() * 9) - 4)));
      setGpuUsage((prev) => Math.max(8, Math.min(98, prev + Math.floor(Math.random() * 7) - 3)));
      setGpuTempC((prev) => Math.max(44, Math.min(79, prev + Math.floor(Math.random() * 3) - 1)));
      setRamUsagePct((prev) => Math.max(30, Math.min(88, prev + Math.floor(Math.random() * 3) - 1)));

      const nextDown = +(65 + Math.sin(Date.now() / 1600) * 35 + Math.random() * 18).toFixed(1);
      const nextUp = +(18 + Math.cos(Date.now() / 2100) * 9 + Math.random() * 6).toFixed(1);
      setNetDownMbps(Math.max(4.2, nextDown));
      setNetUpMbps(Math.max(2.1, nextUp));
      setNetHistory((prev) => [...prev.slice(1), Math.min(100, Math.max(15, Math.round(nextDown * 0.85)))]);

      // Subtle market ticker updates
      setMarketTickers((prev) =>
        prev.map((item) => {
          const delta = (Math.random() - 0.48) * (item.price * 0.002);
          const nextPrice = +(item.price + delta).toFixed(item.price > 500 ? 0 : 2);
          return { ...item, price: nextPrice };
        })
      );

      // Pomodoro countdown
      setPomoSecLeft((prev) => {
        if (!pomoRunning) return prev;
        if (prev <= 1) {
          setPomoRunning(false);
          onPlayBeep(880);
          const nextM = pomoMode === 'work' ? 'break' : 'work';
          setPomoMode(nextM);
          onPushNotification(
            'Фокус-Таймер Luma 1.0',
            nextM === 'break' ? 'Сессия фокуса завершена! Перерыв 5 минут.' : 'Перерыв окончен! Время фокуса 25 минут.',
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
          onPlayBeep(520);
          onPushNotification('Управление питанием', 'Таймер автовыключения завершен.', 'warning');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomoRunning, pomoMode, onPlayBeep, onPushNotification]);

  // Open-Meteo real weather search
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
        onPushNotification('Погода Pixel', `Город «${trimmed}» не найден.`, 'warning');
        setWeather((prev) => ({ ...prev, loading: false }));
        return;
      }
      const place = geoData.results[0];
      const forecastRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&forecast_days=1&timezone=auto`
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
            temp: Math.round(Number(fData.hourly.temperature_2m?.[i] ?? current.temperature_2m ?? 20)),
            code: Number(fData.hourly.weather_code?.[i] ?? code),
          });
        }
      }

      setWeather({
        city: place.name || trimmed,
        country: place.country || '',
        temp: Math.round(Number(current.temperature_2m ?? 20)),
        feelsLike: Math.round(Number(current.apparent_temperature ?? 20)),
        humidity: Math.round(Number(current.relative_humidity_2m ?? 50)),
        windSpeed: Number(Number(current.wind_speed_10m ?? 3.5).toFixed(1)),
        weatherCode: code,
        description: wmo.label,
        hourly: hourlyPoints.length ? hourlyPoints : weather.hourly,
        loading: false,
        updatedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      });
      setWeatherSearchOpen(false);
      setWeatherQuery('');
      onPushNotification('Погода обновлена', `${place.name}: ${Math.round(Number(current.temperature_2m ?? 20))}°C`, 'success');
    } catch {
      setWeather((prev) => ({ ...prev, loading: false }));
      onPushNotification('Кэш погоды', 'Используются автономные данные ядра Luma 1.0.', 'info');
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

  // Click any empty cell (col, row) in Edit Mode to snap the currently selected item right to that cell!
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
    onPushNotification('Ячейка 20×30', `Элемент перемещен в ячейку [X:${col}, Y:${row}]`, 'info');
  };

  const resetGridLayout = () => {
    setWidgets(DEFAULT_CELL_WIDGETS);
    setFolders(DEFAULT_GRID_FOLDERS);
    setPinnedApps(DEFAULT_PINNED_APPS);
    setSelectedItemId(null);
    onPushNotification('Сетка 20×30', 'Восстановлена эталонная раскладка всех 18 виджетов и папок.', 'success');
  };

  const renderAppIcon = (iconName: string, className = 'w-5 h-5') => {
    const IconComp = iconMap[iconName] || iconMap.Rocket || Sparkles;
    return <IconComp className={className} />;
  };

  const renderWeatherIcon = (code: number, className = 'w-6 h-6') => {
    const info = decodeWeatherWmo(code);
    if (info.kind === 'clear') return <Sun className={`${className} text-amber-400`} />;
    if (info.kind === 'rain') return <CloudRain className={`${className} text-sky-400`} />;
    if (info.kind === 'snow') return <Snowflake className={`${className} text-cyan-300`} />;
    if (info.kind === 'storm') return <CloudLightning className={`${className} text-purple-400`} />;
    return <CloudSun className={`${className} text-blue-300`} />;
  };

  const visibleWidgets = useMemo(
    () =>
      widgets.filter(
        (w) => w.visible && (ecosystemFilter === 'all' || w.ecosystem === ecosystemFilter)
      ),
    [widgets, ecosystemFilter]
  );

  const currentIslandPlayer = islandPlayers[activePlayerIndex] || islandPlayers[0];

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
      // 1. ANDROID 16 MATERIAL 3 EXPRESSIVE SCALLOP CLOCK & AT A GLANCE
      // =====================================================================
      case 'android_m3_clock': {
        const hrs = String(nowDate.getHours()).padStart(2, '0');
        const mins = String(nowDate.getMinutes()).padStart(2, '0');
        const secs = String(nowDate.getSeconds()).padStart(2, '0');
        const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Smartphone className="w-3 h-3" />
                Android 16 M3 Expressive
              </span>
              <span className="text-[10px] font-mono text-slate-400">:{secs}</span>
            </div>

            <div className="my-auto flex items-center gap-3.5">
              {/* Expressive Morphing Squircle/Scallop Clock Pill */}
              <div
                className="w-20 h-20 rounded-[26px] flex flex-col items-center justify-center shadow-lg border border-indigo-400/40 relative overflow-hidden shrink-0"
                style={{
                  background: 'linear-gradient(145deg, rgba(99,102,241,0.32) 0%, rgba(56,189,248,0.18) 100%)',
                }}
              >
                <span className="text-2xl font-black font-mono leading-none text-white tracking-tighter">
                  {hrs}
                </span>
                <span className="text-2xl font-black font-mono leading-none text-indigo-300 tracking-tighter mt-0.5">
                  {mins}
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-xs font-extrabold text-white truncate">
                  {weekdays[nowDate.getDay()]}
                </div>
                <div className="text-[11px] font-mono text-slate-300">
                  {nowDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-semibold">
                  <Sun className="w-3 h-3" />
                  {weather.city}: {weather.temp > 0 ? `+${weather.temp}` : weather.temp}°C
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
              <span>Сводка At a Glance</span>
              <span className="text-emerald-400 font-mono font-bold">● Luma 1.0 Ready</span>
            </div>
          </div>
        );
      }

      // =====================================================================
      // 2. ANDROID 16 QUICK SETTINGS SHADE (PILL TILES + SLIDERS)
      // =====================================================================
      case 'android_quick_settings':
        return (
          <div className="h-full flex flex-col justify-between p-1 gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-extrabold">Быстрые настройки Android 16 (M3 Expressive)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">6 плиток активны</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 my-auto">
              {/* Wi-Fi 7 Pill */}
              <button
                onClick={() => {
                  setWifiEnabled((v) => !v);
                  onPushNotification('Wi-Fi 7 (Luma HAL)', !wifiEnabled ? 'Подключено к 5GHz / 6GHz' : 'Wi-Fi отключен');
                }}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  wifiEnabled
                    ? 'bg-sky-500/25 border-sky-400/60 text-white shadow-sm'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400'
                }`}
              >
                <Wifi className="w-4 h-4 text-sky-300 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">Wi-Fi 7</div>
                  <div className="text-[9px] opacity-80 truncate">{wifiEnabled ? '1.0 Гбит/с' : 'Выкл'}</div>
                </div>
              </button>

              {/* Bluetooth 5.4 Pill */}
              <button
                onClick={() => {
                  setBtEnabled((v) => !v);
                  onPushNotification('Bluetooth 5.4', !btEnabled ? 'AirPods Pro подключены' : 'Bluetooth отключен');
                }}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  btEnabled
                    ? 'bg-indigo-500/25 border-indigo-400/60 text-white shadow-sm'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400'
                }`}
              >
                <Bluetooth className="w-4 h-4 text-indigo-300 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">Bluetooth</div>
                  <div className="text-[9px] opacity-80 truncate">{btEnabled ? '2 устр.' : 'Выкл'}</div>
                </div>
              </button>

              {/* DND Pill */}
              <button
                onClick={onToggleDnd}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  dndEnabled
                    ? 'bg-purple-500/30 border-purple-400 text-white shadow-sm'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400'
                }`}
              >
                <BellOff className="w-4 h-4 text-purple-300 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">Тихий DND</div>
                  <div className="text-[9px] opacity-80 truncate">{dndEnabled ? 'ВКЛЮЧЕН' : 'Выкл'}</div>
                </div>
              </button>

              {/* Adaptive Day/Night Pill */}
              <button
                onClick={onToggleAdaptiveTheme}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  adaptiveThemeEnabled
                    ? 'bg-amber-500/25 border-amber-400/60 text-white'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">День/Ночь</div>
                  <div className="text-[9px] opacity-80 truncate">{adaptiveThemeEnabled ? 'Авто' : 'Ручной'}</div>
                </div>
              </button>

              {/* Liquid Glass Pill */}
              <button
                onClick={onToggleGlass}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  glassEnabled
                    ? 'bg-teal-500/25 border-teal-400/60 text-white'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400'
                }`}
              >
                <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">Стекло M3</div>
                  <div className="text-[9px] opacity-80 truncate">{glassEnabled ? 'Активно' : 'Выкл'}</div>
                </div>
              </button>

              {/* Power Saver / Right-Click Back Pill */}
              <button
                onClick={() => {
                  setPowerSaverEnabled((v) => !v);
                  onToggleRightClickBack();
                }}
                className={`p-2 rounded-[18px] border text-left transition-all flex items-center gap-2 cursor-pointer ${
                  rightClickBackEnabled
                    ? 'bg-emerald-500/25 border-emerald-400/60 text-white'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400'
                }`}
              >
                <Zap className="w-4 h-4 text-emerald-300 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">ПКМ Назад</div>
                  <div className="text-[9px] opacity-80 truncate">{rightClickBackEnabled ? 'Активно' : 'Выкл'}</div>
                </div>
              </button>
            </div>

            {/* Expressive Brightness & Volume Pill Sliders */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={screenBrightness}
                  onChange={(e) => setScreenBrightness(Number(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 cursor-pointer"
                />
                <span className="text-[10px] font-mono w-7 text-right">{screenBrightness}%</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
                <button onClick={onToggleMute} className="cursor-pointer">
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
      // 3. GOOGLE PIXEL WEATHER & RADAR CAPSULE (OPEN-METEO LIVE)
      // =====================================================================
      case 'android_pixel_weather':
        return (
          <div className="h-full flex flex-col justify-between p-1 gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {renderWeatherIcon(weather.weatherCode, 'w-6 h-6 shrink-0')}
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                    <span className="text-xs font-extrabold truncate">{weather.city}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {weather.description} • Ощущ. {weather.feelsLike > 0 ? `+${weather.feelsLike}` : weather.feelsLike}°
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-2xl font-black font-mono tabular-nums text-white">
                  {weather.temp > 0 ? `+${weather.temp}` : weather.temp}°C
                </span>
                <button
                  onClick={() => setWeatherSearchOpen((v) => !v)}
                  className="px-2 py-1 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
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
                  placeholder="Введите город (Москва, Токио, Париж)..."
                  className="flex-1 bg-slate-900/90 border border-sky-500/50 rounded-full px-3 py-1.5 text-xs text-white outline-none"
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
                    className="p-1.5 rounded-2xl bg-slate-900/65 border border-slate-800/80 flex flex-col items-center justify-center"
                  >
                    <span className="text-[9px] font-mono text-slate-400">{h.time}</span>
                    <div className="my-0.5">{renderWeatherIcon(h.code, 'w-3.5 h-3.5')}</div>
                    <span className="text-[11px] font-mono font-bold">
                      {h.temp > 0 ? `+${h.temp}` : h.temp}°
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>💧 Влажность: {weather.humidity}%</span>
              <span>💨 Ветер: {weather.windSpeed} м/с</span>
            </div>
          </div>
        );

      // =====================================================================
      // 4. iOS 18 STANDBY NOW PLAYING & VINYL MEDIA CONTROLLER
      // =====================================================================
      case 'ios_now_playing':
        return (
          <div className="h-full flex flex-col justify-between p-1 gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Radio className="w-3 h-3" />
                {currentIslandPlayer.name}
              </span>
              <div className="flex items-center gap-1">
                {islandPlayers.map((pl, idx) => (
                  <button
                    key={pl.id}
                    onClick={() => onSelectPlayer(idx)}
                    title={pl.name}
                    className={`w-4 h-4 rounded-full text-[8px] font-bold transition cursor-pointer ${
                      idx === activePlayerIndex
                        ? 'ring-2 ring-white scale-110'
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
                className={`w-14 h-14 rounded-full border-2 border-emerald-400/50 flex items-center justify-center shadow-lg shrink-0 relative ${
                  mediaPlaying ? 'animate-spin' : ''
                }`}
                style={{
                  animationDuration: '6s',
                  background: `radial-gradient(circle, ${currentIslandPlayer.accent} 0%, #0f172a 55%, #020617 100%)`,
                }}
              >
                <div className="w-4 h-4 rounded-full bg-slate-950 border border-white/40" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-white truncate">{currentIslandPlayer.track}</div>
                <div className="text-[11px] text-slate-400 truncate">{currentIslandPlayer.artist}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    onClick={onPrevTrack}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onToggleMediaPlay}
                    className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {mediaPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {mediaPlaying ? 'Пауза' : 'Играть'}
                  </button>
                  <button
                    onClick={onNextTrack}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>iOS 18 StandBy Audio</span>
              <span className="text-emerald-400">{mediaPlaying ? '♫ Воспроизведение' : 'На паузе'}</span>
            </div>
          </div>
        );

      // =====================================================================
      // 5. iOS 18 FITNESS ACTIVITY RINGS
      // =====================================================================
      case 'ios_activity_rings': {
        const movePct = Math.min(100, Math.round((moveKcal / moveGoal) * 100));
        const exPct = Math.min(100, Math.round((exerciseMins / exerciseGoal) * 100));
        const stPct = Math.min(100, Math.round((standHours / standGoal) * 100));
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" />
                Кольца активности iOS 18
              </span>
              <button
                onClick={() => {
                  setMoveKcal((v) => v + 45);
                  setExerciseMins((v) => v + 5);
                  onPushNotification('iOS 18 Fitness', '+45 ккал и +5 мин активности записаны в ядро Luma!', 'success');
                }}
                className="px-2 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold cursor-pointer"
              >
                + Тренировка
              </button>
            </div>

            <div className="my-auto flex items-center gap-3.5">
              {/* Concentric Rings SVG */}
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
                  ПОДВИЖНОСТЬ: {moveKcal}/{moveGoal} ккал
                </div>
                <div className="text-emerald-400 font-bold">
                  ФОКУС-МИНУТЫ: {exerciseMins}/{exerciseGoal} мин
                </div>
                <div className="text-sky-400 font-bold">
                  РАЗМИНКА: {standHours}/{standGoal} ч
                </div>
              </div>
            </div>
          </div>
        );
      }

      // =====================================================================
      // 6. iOS 18 BATTERIES ECOSYSTEM MATRIX
      // =====================================================================
      case 'ios_battery_matrix': {
        const devices = [
          { name: 'Luma PC', pct: batteryLevel, icon: Laptop, charging: isCharging },
          { name: 'AirPods Pro', pct: 88, icon: Headphones, charging: false },
          { name: 'iPhone 16', pct: 74, icon: Smartphone, charging: true },
          { name: 'DualSense', pct: 62, icon: Gamepad2, charging: false },
        ];
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
                Экосистема заряда iOS 18
              </span>
              <span className="text-[10px] font-mono text-emerald-400">{batteryLevel}% Питание</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 my-auto">
              {devices.map((d) => {
                const IconC = d.icon;
                return (
                  <div
                    key={d.name}
                    className="p-2 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <IconC className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold truncate">{d.name}</div>
                      <div className="text-[10px] font-mono text-emerald-400 font-bold">
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
      // 7. WINDOWS 11 CPU / GPU / RAM PERFORMANCE MONITOR
      // =====================================================================
      case 'win_cpu_gpu_ram':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-sky-400" />
                Ресурсы Windows 11 &amp; Luma
              </span>
              <span className="text-[10px] font-mono text-emerald-400">0.0% Idle Core</span>
            </div>

            <div className="space-y-1.5 my-auto">
              <div>
                <div className="flex justify-between text-[10px] font-mono mb-0.5">
                  <span className="text-slate-300">CPU (x86_64 Multi-Core)</span>
                  <span className="text-emerald-400 font-bold">{cpuUsage}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${cpuUsage}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-mono mb-0.5">
                  <span className="text-slate-300">GPU RTX • {gpuTempC}°C</span>
                  <span className="text-sky-400 font-bold">{gpuUsage}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${gpuUsage}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-mono mb-0.5">
                  <span className="text-slate-300">RAM ({ramUsedGb} / {ramTotalGb} ГБ)</span>
                  <span className="text-indigo-400 font-bold">{ramUsagePct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${ramUsagePct}%` }} />
                </div>
              </div>
            </div>
          </div>
        );

      // =====================================================================
      // 8. WINDOWS 11 STORAGE & DRIVE ANALYZER (C: & D:)
      // =====================================================================
      case 'win_storage_disks': {
        const cPct = Math.round((diskCUsedGb / diskCTotalGb) * 100);
        const dPct = Math.round((diskDUsedGb / diskDTotalGb) * 100);
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-400" />
                Диски C: и D: (NVMe)
              </span>
              <button
                onClick={() => {
                  setDiskCUsedGb((v) => Math.max(180, +(v - 1.8).toFixed(1)));
                  onPushNotification('Очистка диска C:', 'Освобождено 1.8 ГБ кэша шейдеров и временных файлов.', 'success');
                }}
                className="px-2 py-0.5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[10px] font-bold cursor-pointer"
              >
                Очистить
              </button>
            </div>

            <div className="space-y-2 my-auto">
              <div className="p-2 rounded-2xl bg-slate-900/65 border border-slate-800">
                <div className="flex justify-between text-[10px] font-mono mb-1">
                  <span className="font-bold text-white">Диск C: (Luma OS &amp; Win)</span>
                  <span className="text-blue-400">{diskCUsedGb} / {diskCTotalGb} ГБ ({cPct}%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${cPct}%` }} />
                </div>
              </div>

              <div className="p-2 rounded-2xl bg-slate-900/65 border border-slate-800">
                <div className="flex justify-between text-[10px] font-mono mb-1">
                  <span className="font-bold text-white">Диск D: (Игры и Проекты)</span>
                  <span className="text-indigo-400">{diskDUsedGb} / {diskDTotalGb} ГБ ({dPct}%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${dPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        );
      }

      // =====================================================================
      // 9. WINDOWS 11 NETWORK I/O & IPC MONITOR
      // =====================================================================
      case 'win_network_monitor':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-teal-400" />
                Сеть и IPC Трафик
              </span>
              <span className="text-[10px] font-mono text-teal-400">RTT 0.3 ms</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 my-1">
              <div className="p-1.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="text-[9px] text-slate-400">↓ Прием (Down)</div>
                <div className="text-xs font-mono font-bold text-teal-400">{netDownMbps} Мбит/с</div>
              </div>
              <div className="p-1.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="text-[9px] text-slate-400">↑ Отдача (Up)</div>
                <div className="text-xs font-mono font-bold text-sky-400">{netUpMbps} Мбит/с</div>
              </div>
            </div>

            <div className="flex items-end gap-1 h-7 px-1">
              {netHistory.map((h, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-t bg-teal-500/60 transition-all duration-300"
                  style={{ height: `${Math.max(18, h)}%` }}
                />
              ))}
            </div>
          </div>
        );

      // =====================================================================
      // 10. GOOGLE KEEP M3 NOTES & CHECKLIST
      // =====================================================================
      case 'android_keep_notes':
        return (
          <div className="h-full flex flex-col justify-between p-1 gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                Заметки Google Keep M3
              </span>
              <div className="flex gap-1 bg-slate-900/80 p-0.5 rounded-full border border-slate-800">
                <button
                  onClick={() => setKeepTab('todo')}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer ${
                    keepTab === 'todo' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Задачи
                </button>
                <button
                  onClick={() => setKeepTab('note')}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer ${
                    keepTab === 'note' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
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
                      className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-xl bg-slate-900/65 border border-slate-800 cursor-pointer"
                    >
                      <span className={`text-[11px] truncate ${t.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {t.done ? '✓ ' : '○ '}
                        {t.text}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTodoItems((prev) => prev.filter((x) => x.id !== t.id));
                        }}
                        className="text-slate-500 hover:text-rose-400"
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
                    className="flex-1 bg-slate-900/80 border border-slate-700 rounded-full px-2.5 py-1 text-[10px] text-white outline-none"
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
                className="flex-1 w-full bg-slate-900/70 border border-slate-800 rounded-2xl p-2 text-[11px] text-slate-200 resize-none outline-none"
              />
            )}
          </div>
        );

      // =====================================================================
      // 11. iOS 18 CALENDAR & WORLD CLOCK
      // =====================================================================
      case 'ios_calendar_worldclock':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-rose-400" />
                Мировое время iOS 18
              </span>
              <span className="text-[10px] font-mono text-rose-300">
                {nowDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 my-auto">
              {[
                { city: 'Москва', tz: 3 },
                { city: 'Токио', tz: 9 },
                { city: 'Нью-Йорк', tz: -4 },
                { city: 'Лондон', tz: 1 },
              ].map((c) => (
                <div key={c.city} className="p-2 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{c.city}</div>
                  <div className="text-sm font-mono font-black text-white">{getWorldTime(c.tz)}</div>
                </div>
              ))}
            </div>
          </div>
        );

      // =====================================================================
      // 12. iOS 18 POMODORO FOCUS TIMER
      // =====================================================================
      case 'ios_pomodoro_focus':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-amber-400" />
                Фокус Помидор
              </span>
              <span className="text-[10px] font-mono text-amber-300">
                {pomoMode === 'work' ? 'РАБОТА 25М' : 'ОТДЫХ 5М'}
              </span>
            </div>

            <div className="my-auto flex items-center justify-between gap-2">
              <div className="text-2xl font-black font-mono tabular-nums text-white">
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
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
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
                  className="flex-1 py-1 rounded-full bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono cursor-pointer"
                >
                  {m}м
                </button>
              ))}
            </div>
          </div>
        );

      // =====================================================================
      // 13. ANDROID M3 CALCULATOR & CURRENCY CONVERTER
      // =====================================================================
      case 'android_calculator':
        return (
          <div className="h-full flex flex-col justify-between p-1 gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-cyan-400" />
                Калькулятор M3
              </span>
              <div className="flex gap-1 bg-slate-900/80 p-0.5 rounded-full border border-slate-800">
                <button
                  onClick={() => setCalcTab('calc')}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer ${
                    calcTab === 'calc' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Счет
                </button>
                <button
                  onClick={() => setCalcTab('conv')}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer ${
                    calcTab === 'conv' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
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
                    className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                  />
                  <div className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 font-mono font-bold text-xs text-cyan-300">
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
                      className="py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono font-bold cursor-pointer"
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
                    className="w-20 bg-slate-900/90 border border-slate-700 rounded-xl px-2 py-1 text-xs font-mono text-white outline-none"
                  />
                  <select
                    value={convKind}
                    onChange={(e) => setConvKind(e.target.value as typeof convKind)}
                    className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-2 py-1 text-[10px] text-white outline-none"
                  >
                    <option value="usd_rub">USD → RUB</option>
                    <option value="eur_rub">EUR → RUB</option>
                    <option value="gb_mb">ГБ → МБ</option>
                    <option value="c_f">°C → °F</option>
                  </select>
                </div>
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-center font-mono font-extrabold text-sm text-cyan-300">
                  {convResult}
                </div>
              </div>
            )}
          </div>
        );

      // =====================================================================
      // 14. iOS 18 STOCKS, CRYPTO & CURRENCY TICKER
      // =====================================================================
      case 'ios_stocks_crypto':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Биржа и Крипто iOS 18
              </span>
              <span className="text-[10px] font-mono text-emerald-400">LIVE</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 my-auto">
              {marketTickers.map((t) => (
                <div key={t.symbol} className="p-1.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-white">{t.symbol}</span>
                    <span className={t.changePct >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                      {t.changePct >= 0 ? `+${t.changePct}%` : `${t.changePct}%`}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-black text-slate-200 mt-0.5">
                    {t.symbol.includes('RUB') ? `${t.price} ₽` : `$${t.price}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // =====================================================================
      // 15. ANDROID DIGITAL WELLBEING & SCREEN TIME
      // =====================================================================
      case 'android_wellbeing': {
        const runningCount = apps.filter((a) => a.isRunning).length;
        const totalTodayMins = apps.reduce((acc, a) => acc + a.todayMinutes, 0);
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Цифровое благополучие
              </span>
              <span className="text-[10px] font-mono text-emerald-400">{runningCount} актив.</span>
            </div>

            <div className="my-auto flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div>
                <div className="text-[10px] text-slate-400">Экранное время сегодня</div>
                <div className="text-base font-black font-mono text-white">
                  {totalTodayMins.toFixed(1)} мин
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400">Аптайм ядра</div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {formatLiveClock(uptimeSeconds)}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // =====================================================================
      // 16. WINDOWS 11 QUICK SYSTEM UTILITIES
      // =====================================================================
      case 'win_quick_utilities':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Быстрый запуск утилит Windows
              </span>
              <span className="text-[10px] font-mono text-slate-400">Process.Start</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 my-auto">
              {[
                { name: 'Терминал', cmd: 'wt.exe' },
                { name: 'Диспетчер', cmd: 'taskmgr.exe' },
                { name: 'Реестр', cmd: 'regedit.exe' },
                { name: 'Проводник', cmd: 'explorer.exe' },
              ].map((u) => (
                <button
                  key={u.cmd}
                  onClick={() => {
                    fetch('/api/kernel/launch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ command: u.cmd, name: u.name }),
                    }).catch(() => {});
                    onPushNotification('Luma ProcessManager', `Запущена системная утилита: ${u.name} (${u.cmd})`, 'success');
                  }}
                  className="p-2 rounded-2xl bg-slate-900/75 hover:bg-emerald-500/20 border border-slate-800 hover:border-emerald-500/40 text-center transition cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-white truncate">{u.name}</div>
                  <div className="text-[9px] font-mono text-slate-400 truncate">{u.cmd}</div>
                </button>
              ))}
            </div>
          </div>
        );

      // =====================================================================
      // 17. WINDOWS 11 POWER MANAGEMENT & LOCK SCREEN
      // =====================================================================
      case 'win_power_center':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <Power className="w-4 h-4 text-rose-400" />
                Управление питанием ОС
              </span>
              {shutdownTimerSec !== null && (
                <span className="text-[10px] font-mono text-rose-400 font-bold">
                  Выкл: {formatLiveClock(shutdownTimerSec)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5 my-auto">
              <button
                onClick={() => {
                  setLockScreenOverlay(true);
                  onPlayBeep(640);
                }}
                className="p-2 rounded-2xl bg-slate-900/75 hover:bg-indigo-500/20 border border-slate-800 text-center cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-0.5" />
                <div className="text-[10px] font-bold">Win + L</div>
              </button>
              <button
                onClick={() => onPushNotification('Режим Сна', 'Команда SetSuspendState отправлена в ядро Luma.', 'info')}
                className="p-2 rounded-2xl bg-slate-900/75 hover:bg-sky-500/20 border border-slate-800 text-center cursor-pointer"
              >
                <Moon className="w-3.5 h-3.5 text-sky-400 mx-auto mb-0.5" />
                <div className="text-[10px] font-bold">Сон</div>
              </button>
              <button
                onClick={() => onPushNotification('Перезагрузка', 'Проверка сервисов перед перезапуском.', 'warning')}
                className="p-2 rounded-2xl bg-slate-900/75 hover:bg-amber-500/20 border border-slate-800 text-center cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
                <div className="text-[10px] font-bold">Рестарт</div>
              </button>
              <button
                onClick={() =>
                  setShutdownTimerSec((prev) => (prev === null ? 30 * 60 : null))
                }
                className={`p-2 rounded-2xl border text-center cursor-pointer ${
                  shutdownTimerSec !== null
                    ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                    : 'bg-slate-900/75 border-slate-800'
                }`}
              >
                <Timer className="w-3.5 h-3.5 text-rose-400 mx-auto mb-0.5" />
                <div className="text-[10px] font-bold">{shutdownTimerSec ? 'Отмена' : 'Таймер 30м'}</div>
              </button>
            </div>
          </div>
        );

      // =====================================================================
      // 18. LUMAGUARD SECURITY KERNEL & AES-256-GCM STATUS
      // =====================================================================
      case 'win_security_defender':
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Защита ядра LumaGuard 1.0
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
                AES-256-GCM
              </span>
            </div>

            <div className="my-auto flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-900/70 border border-emerald-500/30">
              <div className="text-[10px] font-mono">
                <div className="text-white font-bold">PBKDF2-SHA512 • Ключ #{cryptoKeyRev}</div>
                <div className="text-emerald-400">Zero-Trust IPC HMAC активен</div>
              </div>
              <button
                onClick={() => {
                  setCryptoKeyRev((r) => r + 1);
                  onPushNotification('Ротация ключей LumaGuard', `Сгенерирован новый мастер-ключ AES-256-GCM (Ревизия #${cryptoKeyRev + 1})`, 'success');
                }}
                className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] cursor-pointer shrink-0"
              >
                Ротация ключа
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
            ? 'bg-[#101624]/90 border-indigo-500/30 text-white'
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
                Окно 2: Матрица Ячеек {gridOrientation} (600 ячеек) • Виджеты Luma 1.0
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                🟢 ANDROID + iOS 18 + WINDOWS 11
              </span>
              {hoveredCell && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-400/40">
                  Ячейка [X:{hoveredCell.col}, Y:{hoveredCell.row}]
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Полноценное второе окно ядра Luma 1.0 с сеткой <strong>20×30 (600 координатных ячеек)</strong> и 18 самыми популярными виджетами из Android 16 (Material 3 Expressive), iPhone (iOS 18) и Windows 11.
            </p>
          </div>
        </div>

        {/* Right Controls: Ecosystem Filter, Orientation 30x20 / 20x30, Grid Lines, Edit Mode, Open Separate Window */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ecosystem Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-full border border-slate-800">
            {(
              [
                ['all', 'Все (18)'],
                ['android', '🤖 Android M3'],
                ['ios', '🍎 iPhone iOS'],
                ['windows', '🪟 Windows 11'],
              ] as const
            ).map(([ek, el]) => (
              <button
                key={ek}
                onClick={() => setEcosystemFilter(ek)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                  ecosystemFilter === ek
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {el}
              </button>
            ))}
          </div>

          {/* 30x20 vs 20x30 Matrix Orientation Toggle */}
          <button
            onClick={() =>
              setGridOrientation((o) => (o === '30x20' ? '20x30' : '30x20'))
            }
            className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-indigo-300 flex items-center gap-1.5 cursor-pointer"
            title="Переключить ориентацию матрицы 30×20 / 20×30"
          >
            <Layers className="w-3.5 h-3.5" />
            Сетка: {gridOrientation}
          </button>

          {/* Toggle 600 Cell Lines */}
          <button
            onClick={() => setShowCellGridLines((v) => !v)}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
              showCellGridLines
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {showCellGridLines ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Ячейки 20×30
          </button>

          {/* Edit / Snap to Cell Mode */}
          <button
            onClick={() => {
              setEditGridMode((v) => !v);
              if (!editGridMode && !selectedItemId) {
                setSelectedItemId('android_m3_clock');
              }
            }}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              editGridMode
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg'
                : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-300'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            {editGridMode ? '✓ Готово (Режим ячеек)' : 'Редактор ячеек 20×30'}
          </button>

          {/* Widget Manager Modal */}
          <button
            onClick={() => setWidgetCatalogModalOpen(true)}
            className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Виджеты и Папки
          </button>

          {!isStandaloneWindow && (
            <button
              onClick={onOpenSeparateWindow2}
              className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Открыть Окно 2 (20×30) в отдельном независимом окне ОС"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              В отдельном окне
            </button>
          )}

          <button
            onClick={onSwitchToWindow1}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            ← Окно 1 (По группам)
          </button>
        </div>
      </div>

      {/* ==================== INTERACTIVE CELL EDITOR TOOLBAR (Shown when Edit Mode is active) ==================== */}
      {editGridMode && (
        <div className="p-3.5 rounded-[24px] bg-amber-500/15 border border-amber-400/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Конструктор матрицы {gridOrientation}:</strong> кликните на любой виджет/папку/иконку, а затем кликните на любую свободную ячейку <code>[X, Y]</code> или используйте кнопки сдвига и размера ниже!
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-amber-300 mr-1">
              Выбрано: <strong>{selectedItemId || 'нет'}</strong>
            </span>
            <button
              onClick={() => moveSelectedItem(-1, 0)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 font-mono cursor-pointer"
            >
              ← X-1
            </button>
            <button
              onClick={() => moveSelectedItem(1, 0)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 font-mono cursor-pointer"
            >
              X+1 →
            </button>
            <button
              onClick={() => moveSelectedItem(0, -1)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 font-mono cursor-pointer"
            >
              ↑ Y-1
            </button>
            <button
              onClick={() => moveSelectedItem(0, 1)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 font-mono cursor-pointer"
            >
              ↓ Y+1
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => resizeSelectedItem(1, 0)}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 font-mono cursor-pointer"
            >
              Ширина +1
            </button>
            <button
              onClick={() => resizeSelectedItem(-1, 0)}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 font-mono cursor-pointer"
            >
              Ширина -1
            </button>
            <button
              onClick={() => resizeSelectedItem(0, 1)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-mono cursor-pointer"
            >
              Высота +1
            </button>
            <button
              onClick={() => resizeSelectedItem(0, -1)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-mono cursor-pointer"
            >
              Высота -1
            </button>
            <button
              onClick={resetGridLayout}
              className="px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-200 font-bold cursor-pointer ml-1"
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
              : 'bg-slate-100/90 border-slate-300 shadow-xl'
          }`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${totalRows}, 46px)`,
            gap: '6px',
          }}
        >
          {/* 1. Underlying 600 Coordinate Cells (20x30 / 30x20) */}
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
                        : 'border-slate-900/[0.05] bg-slate-900/[0.015]'
                    } ${isHovered ? 'ring-1 ring-indigo-400/50' : ''}`}
                  >
                    {(editGridMode || (col % 5 === 0 && row % 5 === 0)) && (
                      <span className="text-[8px] font-mono text-slate-600/80 pointer-events-none">
                        {col}×{row}
                      </span>
                    )}
                  </div>
                );
              })
            )}

          {/* 2. Render All Visible Android / iOS / Windows Widgets on the 20x30 Grid */}
          {visibleWidgets.map((w) => {
            const clampedCol = Math.max(1, Math.min(totalCols - w.w + 1, w.col));
            const clampedRow = Math.max(1, Math.min(totalRows - w.h + 1, w.row));
            const isSelected = selectedItemId === w.id;

            const ecoBadgeColor =
              w.ecosystem === 'android'
                ? 'border-indigo-500/40 hover:border-indigo-400/70'
                : w.ecosystem === 'ios'
                ? 'border-emerald-500/40 hover:border-emerald-400/70'
                : 'border-sky-500/40 hover:border-sky-400/70';

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
                } ${ecoBadgeColor} ${
                  isSelected && editGridMode ? 'ring-2 ring-amber-400 scale-[1.01]' : ''
                }`}
              >
                {/* Cell Coordinate & Size Pill in Edit Mode */}
                {editGridMode && (
                  <div className="absolute top-2 right-2 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-mono font-black shadow">
                    <span>
                      [X:{clampedCol}, Y:{clampedRow}] • {w.w}×{w.h} яч.
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
                  isDark ? 'bg-[#151d30]/92 text-white' : 'bg-white/95 text-slate-900'
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
                      <div className="text-[10px] text-slate-400 font-mono">
                        {folderApps.length} прил. • [{clampedCol},{clampedRow}]
                      </div>
                    </div>
                  </div>
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="flex items-center gap-1.5 my-auto pt-1 flex-wrap">
                  {folderApps.slice(0, 4).map((app) => (
                    <button
                      key={app.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLaunchApp(app);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-indigo-600/30 border border-slate-700/80 flex items-center gap-1.5 text-[10px] font-bold cursor-pointer"
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
                    ? 'bg-emerald-950/70 border-emerald-400 shadow-lg'
                    : isDark
                    ? 'bg-[#141c2e]/90 hover:bg-[#1b263e] border-slate-700/80'
                    : 'bg-white/95 hover:bg-indigo-50 border-slate-300'
                } ${isSelected && editGridMode ? 'ring-2 ring-amber-400' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    app.isRunning
                      ? 'bg-emerald-500/25 text-emerald-300'
                      : 'bg-indigo-500/15 text-indigo-400'
                  }`}
                >
                  {renderAppIcon(app.icon, 'w-5 h-5')}
                </div>
                <div className="text-xs font-extrabold truncate w-full">{app.name}</div>
                <div className="text-[10px] font-mono text-slate-400">
                  {formatMonthBadge(app.monthMinutes, app.elapsedSeconds, app.isRunning)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== MODAL: WIDGET CATALOG & FOLDER CREATOR ==================== */}
      {widgetCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-[32px] border border-slate-700 bg-[#0d1320] p-6 shadow-2xl space-y-4 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-extrabold">
                  Каталог 18 Виджетов Ядра Luma 1.0 (Android 16 • iOS 18 • Windows 11)
                </h3>
                <p className="text-xs text-slate-400">
                  Включайте/выключайте виджеты или создавайте папки на матрице 20×30
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setWidgetCatalogModalOpen(false);
                    setCreateFolderModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  + Создать папку на сетке 20×30
                </button>
                <button
                  onClick={() => setWidgetCatalogModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {widgets.map((w) => (
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
                      : 'bg-slate-900/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10">
                      {w.ecosystem.toUpperCase()} • {w.w}×{w.h} яч.
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      {w.visible ? '🟢 АКТИВНО' : '⚪ СКРЫТО'}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{w.title}</div>
                    <div className="text-[11px] text-slate-400">{w.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CREATE NEW FOLDER ON 20x30 GRID ==================== */}
      {createFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[32px] border border-slate-700 bg-[#0d1320] p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold">Создать папку на матрице 20×30</h3>
              <button
                onClick={() => setCreateFolderModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Название папки</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Например: Разработка & AI"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Акцентный цвет M3</label>
                <div className="flex gap-2">
                  {['#10b981', '#6366f1', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4'].map((clr) => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setNewFolderColor(clr)}
                      className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                        newFolderColor === clr ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: clr }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Выберите приложения</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800">
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
                            ? 'bg-indigo-600/25 border-indigo-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
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
                className="px-4 py-2 rounded-full bg-white/10 text-xs font-semibold cursor-pointer"
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
                  onPushNotification('Папка создана', `Папка «${created.name}» добавлена на сетку 20×30.`, 'success');
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
            className="w-full max-w-md rounded-[32px] border border-slate-700 bg-[#0d1320] p-6 shadow-2xl space-y-4 text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: activeFolderModal.color }}
                >
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{activeFolderModal.name}</h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Ячейка [{activeFolderModal.col}, {activeFolderModal.row}] • {activeFolderModal.w}×{activeFolderModal.h}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveFolderModal(null)}
                className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
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
                    className="p-3 rounded-2xl bg-slate-900 hover:bg-indigo-600/25 border border-slate-800 hover:border-indigo-400 flex items-center gap-2.5 text-left cursor-pointer transition"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                      {renderAppIcon(app.icon, 'w-5 h-5')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{app.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{app.category}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== LOCK SCREEN OVERLAY (WIN + L) ==================== */}
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
          <div className="mt-8 px-6 py-2.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
            🔒 Экран заблокирован Luma Security 1.0 • Нажмите в любом месте для разблокировки
          </div>
        </div>
      )}
    </div>
  );
};
