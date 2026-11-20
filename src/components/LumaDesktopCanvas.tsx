import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AppWindow,
  ArrowUpRight,
  BatteryCharging,
  BellOff,
  Calculator,
  Calendar,
  Check,
  CheckSquare,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Code2,
  Cpu,
  Disc3,
  ExternalLink,
  File,
  FileCode,
  FileImage,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Globe,
  Grid,
  HardDrive,
  LayoutPanelLeft,
  Link2,
  Lock,
  MapPin,
  Maximize,
  Maximize2,
  Minimize,
  Moon,
  Move,
  Pause,
  Pencil,
  Play,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sliders,
  Snowflake,
  StickyNote,
  Sun,
  Terminal,
  Timer,
  Trash2,
  TrendingUp,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import { AppItem, ClockStyleKey, IslandMediaPlayer, LiveSystemTelemetry } from '../data/launcherData';
import { DesignStyle, TaskbarPosition } from './DexWindow';
import { LumaClockRenderer } from './LumaClockRenderer';
import {
  DESKTOP_WIDGET_CATALOG,
  getShapeClass,
  getWidgetDef,
  LumaWidgetGalleryModal,
  SHAPE_OPTIONS,
  WidgetCatalogDef,
  WidgetShape,
  WidgetVariantDef,
} from './LumaWidgetCatalog';

export { DESKTOP_WIDGET_CATALOG };
export type { WidgetShape };
export type DesktopGridCols = 22 | 20;
export type WallpaperStyle = 'dots' | 'grid' | 'matte';

export type DesktopSystemWinId =
  | 'apps'
  | 'tracker'
  | 'kernel'
  | 'terminal'
  | 'settings'
  | 'plugins'
  | 'island'
  | 'spaces'
  | 'explorer'
  | 'taskmgr';

export interface FolderEntry {
  id: string;
  kind: 'app' | 'file' | 'disk_folder' | 'url' | 'command' | 'note' | 'system';
  label: string;
  icon: string;
  target: string;
  content?: string;
}

export interface DesktopWidgetInstance {
  id: string;
  widgetType: string;
  title: string;
  group: 'Основное' | 'Система' | 'Инструменты';
  col: number;
  row: number;
  w: number;
  h: number;
  shape?: WidgetShape;
  variant?: string;
}

export interface DesktopShortcut {
  id: string;
  kind: 'system' | 'app' | 'folder' | 'file' | 'disk_folder' | 'url' | 'command' | 'note';
  label: string;
  icon: string;
  target: string;
  content?: string;
  appIds?: string[];
  folderItems?: FolderEntry[];
  col: number;
  row: number;
  w?: number;
  h?: number;
  shape?: WidgetShape;
}

// Clean Minimal Default Desktop (Leaves calm negative space!)
const DEFAULT_MINIMAL_WIDGETS: DesktopWidgetInstance[] = [
  { id: 'w_clock', widgetType: 'luma_clock', title: 'Часы и дата', group: 'Основное', col: 3, row: 1, w: 5, h: 3, shape: 'squircle', variant: 'wide_editorial' },
  { id: 'w_weather', widgetType: 'luma_weather', title: 'Погода (Авто-регион)', group: 'Основное', col: 3, row: 4, w: 5, h: 2, shape: 'squircle', variant: 'wide_forecast' },
  { id: 'w_media', widgetType: 'luma_media', title: 'Медиаплеер', group: 'Основное', col: 17, row: 1, w: 6, h: 2, shape: 'squircle', variant: 'wide_deck' },
  { id: 'w_sys', widgetType: 'luma_sys', title: 'CPU / RAM / Система', group: 'Система', col: 17, row: 3, w: 6, h: 2, shape: 'squircle', variant: 'wide_telemetry' },
];

const DEFAULT_WORKSTATION_WIDGETS: DesktopWidgetInstance[] = [
  { id: 'w_clock', widgetType: 'luma_clock', title: 'Часы и дата', group: 'Основное', col: 3, row: 1, w: 5, h: 3, shape: 'squircle', variant: 'wide_editorial' },
  { id: 'w_weather', widgetType: 'luma_weather', title: 'Погода (Авто-регион)', group: 'Основное', col: 3, row: 4, w: 5, h: 2, shape: 'squircle', variant: 'wide_forecast' },
  { id: 'w_notes', widgetType: 'luma_notes', title: 'Заметки и задачи', group: 'Инструменты', col: 3, row: 6, w: 5, h: 3, shape: 'squircle', variant: 'default' },
  { id: 'w_battery', widgetType: 'luma_battery', title: 'Батарея и питание', group: 'Система', col: 9, row: 1, w: 3, h: 3, shape: 'circle', variant: 'circle_ring' },
  { id: 'w_disks', widgetType: 'luma_disks', title: 'Накопители', group: 'Система', col: 9, row: 4, w: 5, h: 2, shape: 'squircle', variant: 'wide_disks' },
  { id: 'w_net', widgetType: 'luma_net', title: 'Сеть и IPC', group: 'Система', col: 9, row: 6, w: 5, h: 2, shape: 'squircle', variant: 'wide_net' },
  { id: 'w_media', widgetType: 'luma_media', title: 'Медиаплеер', group: 'Основное', col: 15, row: 1, w: 6, h: 2, shape: 'squircle', variant: 'wide_deck' },
  { id: 'w_sys', widgetType: 'luma_sys', title: 'CPU / RAM / Система', group: 'Система', col: 15, row: 3, w: 6, h: 2, shape: 'squircle', variant: 'wide_telemetry' },
  { id: 'w_utils', widgetType: 'luma_utils', title: 'Системные модули', group: 'Система', col: 15, row: 5, w: 6, h: 2, shape: 'squircle', variant: 'wide_utils' },
  { id: 'w_guard', widgetType: 'luma_guard', title: 'LumaGuard AES-256', group: 'Система', col: 15, row: 7, w: 6, h: 2, shape: 'squircle', variant: 'default' },
];

const DEFAULT_SHORTCUTS: DesktopShortcut[] = [
  { id: 'sc_explorer', kind: 'system', label: 'Проводник', icon: 'FolderOpen', target: 'explorer', col: 1, row: 1 },
  { id: 'sc_apps', kind: 'system', label: 'Приложения', icon: 'AppWindow', target: 'apps', col: 1, row: 2 },
  { id: 'sc_term', kind: 'system', label: 'Терминал', icon: 'Terminal', target: 'terminal', col: 1, row: 3 },
  { id: 'sc_taskmgr', kind: 'system', label: 'Диспетчер', icon: 'Cpu', target: 'taskmgr', col: 1, row: 4 },
  { id: 'sc_settings', kind: 'system', label: 'Настройки', icon: 'Settings', target: 'settings', col: 1, row: 5 },
];

const DESKTOP_STORAGE_KEY = 'luma_os_1_0_4_dex_desktop_v1';
const LEGACY_DESKTOP_KEY = 'luma_os_1_0_2b_dex_desktop_v1';

interface WeatherLive {
  city: string;
  country: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  code: number;
  label: string;
  loading: boolean;
}

function wmoToRu(code: number): { label: string; kind: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' } {
  if (code === 0) return { label: 'Ясно', kind: 'sun' };
  if (code <= 3) return { label: 'Облачно', kind: 'cloud' };
  if (code <= 48) return { label: 'Туман', kind: 'cloud' };
  if (code <= 67) return { label: 'Дождь', kind: 'rain' };
  if (code <= 77) return { label: 'Снег', kind: 'snow' };
  if (code <= 82) return { label: 'Ливень', kind: 'rain' };
  return { label: 'Гроза', kind: 'storm' };
}

function resolveFolderEntries(sc: DesktopShortcut, apps: AppItem[]): FolderEntry[] {
  if (Array.isArray(sc.folderItems)) return sc.folderItems;
  if (Array.isArray(sc.appIds) && sc.appIds.length > 0) {
    return sc.appIds
      .map((id) => apps.find((a) => a.id === id))
      .filter((a): a is AppItem => Boolean(a))
      .map((app) => ({
        id: `fe_${app.id}`,
        kind: 'app' as const,
        label: app.name,
        icon: app.icon,
        target: app.id,
      }));
  }
  return [];
}

export interface LumaDesktopCanvasProps {
  isDark: boolean;
  accentHex: string;
  themeBgGradient?: string;
  designStyle: DesignStyle;
  onSetDesignStyle: (style: DesignStyle) => void;
  taskbarPosition: TaskbarPosition;
  onSetTaskbarPosition: (pos: TaskbarPosition) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  clockStyle: ClockStyleKey;
  timeFormat: '24' | '12';
  showSeconds: boolean;
  showDate: boolean;
  clockAccentColor: string;
  clockGlowEnabled: boolean;
  clockGlowIntensity: number;
  clockBlinkColon: boolean;
  apps: AppItem[];
  iconMap: Record<string, React.ComponentType<{ className?: string }>>;
  liveSystem: LiveSystemTelemetry | null;
  volume: number;
  isMuted: boolean;
  dndEnabled: boolean;
  dynamicIslandEnabled: boolean;
  islandPlayers: IslandMediaPlayer[];
  activePlayerIndex: number;
  mediaPlaying: boolean;
  editMode: boolean;
  onSetEditMode: (val: boolean) => void;
  gridCols: DesktopGridCols;
  onSetGridCols: (cols: DesktopGridCols) => void;
  wallpaper: WallpaperStyle;
  onSetWallpaper: (wp: WallpaperStyle) => void;
  onOpenSystemWindow: (win: DesktopSystemWinId) => void;
  onRunTerminalCommand: (cmd: string) => void;
  onLaunchApp: (app: AppItem) => void;
  onToggleMediaPlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onToggleMute: () => void;
  onToggleDnd: () => void;
  onToggleIsland: () => void;
  onToggleTheme: () => void;
  onRefreshLocation: () => void;
  onPowerAction: (action: 'lock' | 'sleep' | 'recycle_bin') => void;
  onRotateKey: () => void;
  onPushToast: (title: string, msg: string, type?: 'info' | 'warning' | 'success') => void;
  pendingPinItems?: { id: number; items: { kind: DesktopShortcut['kind']; label: string; icon: string; target: string }[] } | null;
  onConsumePendingPin?: () => void;
  pendingFolderBatch?: { id: number; label: string; items: FolderEntry[] } | null;
  onConsumePendingFolderBatch?: () => void;
  onInspectProperties?: (info: { label: string; path: string; kind: string; app?: AppItem; onDelete?: () => void }) => void;
  locale?: string;
  taskbarSizePx?: number;
  wallpaperImageUrl?: string;
  wallpaperBlur?: number;
  wallpaperDim?: number;
}

export const LumaDesktopCanvas: React.FC<LumaDesktopCanvasProps> = ({
  isDark,
  themeBgGradient,
  designStyle,
  onSetDesignStyle,
  taskbarPosition,
  onSetTaskbarPosition,
  isFullscreen,
  onToggleFullscreen,
  clockStyle,
  timeFormat,
  showSeconds,
  showDate,
  clockAccentColor,
  clockGlowEnabled,
  clockGlowIntensity,
  clockBlinkColon,
  apps,
  iconMap,
  liveSystem,
  volume,
  isMuted,
  dndEnabled,
  dynamicIslandEnabled,
  islandPlayers,
  activePlayerIndex,
  mediaPlaying,
  editMode,
  onSetEditMode,
  gridCols,
  onSetGridCols,
  wallpaper,
  onSetWallpaper,
  onOpenSystemWindow,
  onRunTerminalCommand,
  onLaunchApp,
  onToggleMediaPlay,
  onNextTrack,
  onPrevTrack,
  onToggleMute,
  onToggleDnd,
  onToggleIsland,
  onToggleTheme,
  onRefreshLocation,
  onPowerAction,
  onRotateKey,
  onPushToast,
  pendingPinItems,
  onConsumePendingPin,
  pendingFolderBatch,
  onConsumePendingFolderBatch,
  onInspectProperties,
  locale = 'ru-RU',
  taskbarSizePx = 54,
  wallpaperImageUrl = '',
  wallpaperBlur = 0,
  wallpaperDim = 25,
}) => {
  const totalRows = 10;
  const totalCells = gridCols * totalRows;
  const gridRef = useRef<HTMLDivElement>(null);

  const [widgets, setWidgets] = useState<DesktopWidgetInstance[]>(() => {
    try {
      const raw = localStorage.getItem(DESKTOP_STORAGE_KEY) || localStorage.getItem(LEGACY_DESKTOP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.widgets)) return parsed.widgets;
      }
    } catch {
      // ignore
    }
    return DEFAULT_MINIMAL_WIDGETS;
  });

  const [shortcuts, setShortcuts] = useState<DesktopShortcut[]>(() => {
    try {
      const raw = localStorage.getItem(DESKTOP_STORAGE_KEY) || localStorage.getItem(LEGACY_DESKTOP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.shortcuts)) return parsed.shortcuts;
      }
    } catch {
      // ignore
    }
    return DEFAULT_SHORTCUTS;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);
  const [draggingId, setDraggingId] = useState<{ kind: 'widget' | 'shortcut'; id: string } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [externalFileDrag, setExternalFileDrag] = useState<boolean>(false);

  // Huawei HarmonyOS Resize & Shape Mode (works for BOTH Widgets AND Folders!)
  const [resizingTarget, setResizingTarget] = useState<{ kind: 'widget' | 'folder'; id: string } | null>(null);

  // Context Menus & Modals
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; col: number; row: number } | null>(null);
  const [shortcutCtxMenu, setShortcutCtxMenu] = useState<{ x: number; y: number; sc: DesktopShortcut } | null>(null);
  const [widgetCtxMenu, setWidgetCtxMenu] = useState<{ x: number; y: number; w: DesktopWidgetInstance } | null>(null);
  const [pickerModal, setPickerModal] = useState<null | { mode: 'widget' | 'app' | 'item'; col: number; row: number }>(null);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [folderAddOpen, setFolderAddOpen] = useState<boolean>(false);
  const [folderAddTab, setFolderAddTab] = useState<'app' | 'file' | 'disk_folder' | 'url' | 'command' | 'note' | 'system'>('app');
  const [folderItemLabel, setFolderItemLabel] = useState('');
  const [folderItemTarget, setFolderItemTarget] = useState('');
  const [folderItemNote, setFolderItemNote] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [folderRenameDraft, setFolderRenameDraft] = useState('');
  const [openNoteItem, setOpenNoteItem] = useState<{ id: string; label: string; icon: string; target: string; content: string; fromFolderId?: string } | null>(null);

  // User-customizable Currency & Markets widget state (persisted in localStorage)
  const ALL_CURRENCIES = ['USD', 'EUR', 'RUB', 'MDL', 'RON', 'UAH', 'GBP', 'CNY', 'JPY', 'KZT', 'TRY', 'CHF', 'PLN', 'BYN', 'AED', 'BTC', 'ETH', 'USDT'];
  const CURRENCY_SYMBOLS: Record<string, string> = {
    RUB: '₽', USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥', UAH: '₴', MDL: 'L', RON: 'lei', KZT: '₸', TRY: '₺', PLN: 'zł', CHF: 'Fr', BYN: 'Br', AED: 'د.إ', BTC: '₿', ETH: 'Ξ', USDT: '₮',
  };
  const [currencyBase, setCurrencyBase] = useState<string>(() => {
    try {
      return localStorage.getItem('luma_currency_base_v1') || 'RUB';
    } catch {
      return 'RUB';
    }
  });
  const [trackedCurrencies, setTrackedCurrencies] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('luma_currency_list_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return ['USD', 'EUR', 'MDL', 'BTC'];
  });
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({
    USD: 92.5, EUR: 100.5, MDL: 5.18, RON: 20.2, UAH: 2.24, GBP: 117.1, CNY: 12.78, JPY: 0.6, KZT: 0.19, TRY: 2.69, CHF: 105.1, PLN: 23.0, BYN: 28.2, AED: 25.2, BTC: 8720000, ETH: 306000, USDT: 92.5, RUB: 1,
  });
  const [currencyLive, setCurrencyLive] = useState(false);
  const [currencyUpdatedAt, setCurrencyUpdatedAt] = useState('');
  const [currencyConfigOpen, setCurrencyConfigOpen] = useState(false);
  const [currencyConvertAmt, setCurrencyConvertAmt] = useState('100');
  const [currencyConvertFrom, setCurrencyConvertFrom] = useState('USD');

  useEffect(() => {
    try {
      localStorage.setItem('luma_currency_base_v1', currencyBase);
      localStorage.setItem('luma_currency_list_v1', JSON.stringify(trackedCurrencies));
    } catch {
      // ignore
    }
  }, [currencyBase, trackedCurrencies]);

  const refreshCurrencyRates = async (base = currencyBase) => {
    try {
      const r = await fetch(`/api/kernel/currency?base=${encodeURIComponent(base)}`);
      if (r.ok) {
        const d = await r.json();
        if (d?.ok && d?.unit_in_base) {
          setCurrencyRates(d.unit_in_base);
          setCurrencyLive(Boolean(d.live));
          setCurrencyUpdatedAt(d.updated_at || '');
        }
      }
    } catch {
      // fallback rates remain active
    }
  };

  useEffect(() => {
    void refreshCurrencyRates(currencyBase);
  }, [currencyBase]);

  const openFolder = useMemo(
    () => (openFolderId ? shortcuts.find((s) => s.id === openFolderId && s.kind === 'folder') || null : null),
    [openFolderId, shortcuts]
  );

  // Zero stuck red cell highlight
  useEffect(() => {
    if (!editMode && !draggingId && !externalFileDrag) {
      setHoveredCell(null);
      setDragOverFolderId(null);
    }
  }, [editMode, draggingId, externalFileDrag]);

  useEffect(() => {
    const clearDragState = () => {
      setHoveredCell(null);
      setDraggingId(null);
      setExternalFileDrag(false);
      setDragOverFolderId(null);
    };
    window.addEventListener('dragend', clearDragState);
    window.addEventListener('drop', clearDragState);
    window.addEventListener('blur', clearDragState);
    return () => {
      window.removeEventListener('dragend', clearDragState);
      window.removeEventListener('drop', clearDragState);
      window.removeEventListener('blur', clearDragState);
    };
  }, []);

  // Pin batch of apps / files onto open desktop cells
  useEffect(() => {
    if (!pendingPinItems || !pendingPinItems.items.length) return;
    setShortcuts((prev) => {
      const occupied = new Set(prev.map((s) => `${s.col},${s.row}`));
      const next = [...prev];
      let c = 2;
      let r = 1;
      for (const item of pendingPinItems.items) {
        while (occupied.has(`${c},${r}`) && c <= gridCols) {
          r += 1;
          if (r > totalRows) {
            r = 1;
            c += 1;
          }
        }
        occupied.add(`${c},${r}`);
        next.push({
          ...item,
          id: `sc_pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          col: Math.min(gridCols, c),
          row: Math.min(totalRows, r),
        });
      }
      return next;
    });
    onConsumePendingPin?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPinItems?.id]);

  // Pack selected apps into a brand-new 2×2 Universal Folder on desktop
  useEffect(() => {
    if (!pendingFolderBatch || !pendingFolderBatch.items.length) return;
    setShortcuts((prev) => [
      ...prev,
      {
        id: `fld_batch_${Date.now()}`,
        kind: 'folder',
        label: pendingFolderBatch.label || 'Коллекция',
        icon: 'Folder',
        target: 'folder',
        folderItems: pendingFolderBatch.items,
        col: 2,
        row: 6,
        w: 2,
        h: 2,
        shape: 'squircle',
      },
    ]);
    onPushToast('Новая папка на столе', `«${pendingFolderBatch.label}» (${pendingFolderBatch.items.length} эл.)`, 'success');
    onConsumePendingFolderBatch?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFolderBatch?.id]);

  // Add Any Item Form State
  const [customItemTab, setCustomItemTab] = useState<'file' | 'disk_folder' | 'url' | 'command' | 'note'>('file');
  const [customLabel, setCustomLabel] = useState('');
  const [customTarget, setCustomTarget] = useState('');
  const [customNoteBody, setCustomNoteBody] = useState('');
  const [pickingOsFile, setPickingOsFile] = useState(false);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const hiddenFileCellRef = useRef<{ col: number; row: number }>({ col: 2, row: 1 });

  // Widget interactive local states
  const [now, setNow] = useState(() => new Date());
  const [notes, setNotes] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: 'n1', text: 'Проверить ресурсы ядра', done: true },
    { id: 'n2', text: 'Настроить виджеты и папки', done: false },
  ]);
  const [noteInput, setNoteInput] = useState('');
  const [pomoSec, setPomoSec] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [calcExpr, setCalcExpr] = useState('');
  const [calcRes, setCalcRes] = useState('0');
  const [weather, setWeather] = useState<WeatherLive>({
    city: 'Определение...',
    country: '',
    temp: 0,
    feelsLike: 0,
    humidity: 0,
    wind: 0,
    code: 1,
    label: 'Загрузка',
    loading: true,
  });

  const pomoRunningRef = useRef(pomoRunning);
  pomoRunningRef.current = pomoRunning;
  const fetchedCityRef = useRef<string>('');

  // Persist desktop layout
  useEffect(() => {
    try {
      localStorage.setItem(DESKTOP_STORAGE_KEY, JSON.stringify({ widgets, shortcuts }));
    } catch {
      // ignore
    }
  }, [widgets, shortcuts]);

  // Single stable 1s tick
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
      if (pomoRunningRef.current) {
        setPomoSec((s) => (s > 0 ? s - 1 : 0));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Live Open-Meteo weather
  const fetchWeatherForCoords = async (lat: number, lon: number, city: string, country: string) => {
    setWeather((w) => ({ ...w, loading: true, city, country }));
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );
      if (r.ok) {
        const d = await r.json();
        const cur = d.current || {};
        const dec = wmoToRu(Number(cur.weather_code ?? 1));
        setWeather({
          city,
          country,
          temp: Math.round(Number(cur.temperature_2m ?? 0)),
          feelsLike: Math.round(Number(cur.apparent_temperature ?? 0)),
          humidity: Math.round(Number(cur.relative_humidity_2m ?? 0)),
          wind: Math.round(Number(cur.wind_speed_10m ?? 0)),
          code: Number(cur.weather_code ?? 1),
          label: dec.label,
          loading: false,
        });
        return;
      }
    } catch {
      // fallback
    }
    setWeather((w) => ({ ...w, loading: false, label: 'Нет сети' }));
  };

  useEffect(() => {
    const loc = liveSystem?.location;
    if (loc?.detected && loc.city && fetchedCityRef.current !== loc.city) {
      fetchedCityRef.current = loc.city;
      fetchWeatherForCoords(loc.latitude, loc.longitude, loc.city, loc.country);
      return;
    }
    if (!loc?.detected && !fetchedCityRef.current) {
      fetch('/api/kernel/location')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.detected && d.city && !fetchedCityRef.current) {
            fetchedCityRef.current = d.city;
            fetchWeatherForCoords(d.latitude, d.longitude, d.city, d.country);
          }
        })
        .catch(() => {});
    }
  }, [liveSystem?.location]);

  // Close menus on click or Escape
  useEffect(() => {
    const close = () => {
      setCtxMenu(null);
      setShortcutCtxMenu(null);
      setWidgetCtxMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCtxMenu(null);
        setShortcutCtxMenu(null);
        setWidgetCtxMenu(null);
        setPickerModal(null);
        setOpenFolderId(null);
        setFolderAddOpen(false);
        setOpenNoteItem(null);
        setHoveredCell(null);
        setResizingTarget(null);
        if (editMode) onSetEditMode(false);
      }
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [editMode, onSetEditMode]);

  const currentPlayer = islandPlayers[activePlayerIndex] || islandPlayers[0];
  const hasLiveMedia = Boolean(liveSystem?.media?.available && liveSystem.media.title);
  const trackTitle = hasLiveMedia ? liveSystem!.media.title : currentPlayer.track;
  const trackArtist = hasLiveMedia ? liveSystem!.media.artist || liveSystem!.media.source_app : currentPlayer.artist;
  const isPlaying = hasLiveMedia ? liveSystem!.media.is_playing : mediaPlaying;

  // Move widget or shortcut
  const moveItemToCell = (kind: 'widget' | 'shortcut', id: string, col: number, row: number) => {
    if (kind === 'widget') {
      setWidgets((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w;
          const clampedCol = Math.max(1, Math.min(gridCols - w.w + 1, col));
          const clampedRow = Math.max(1, Math.min(totalRows - w.h + 1, row));
          return { ...w, col: clampedCol, row: clampedRow };
        })
      );
    } else {
      setShortcuts((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const sw = s.w || 1;
          const sh = s.h || 1;
          return {
            ...s,
            col: Math.max(1, Math.min(gridCols - sw + 1, col)),
            row: Math.max(1, Math.min(totalRows - sh + 1, row)),
          };
        })
      );
    }
  };

  // Update size, shape or variant of any Widget or Folder (Huawei HarmonyOS Engine)
  const updateWidgetProps = (id: string, patch: Partial<DesktopWidgetInstance>) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const nw = Math.max(2, Math.min(12, patch.w ?? w.w));
        const nh = Math.max(1, Math.min(6, patch.h ?? w.h));
        return {
          ...w,
          ...patch,
          w: nw,
          h: nh,
          col: Math.max(1, Math.min(w.col, gridCols - nw + 1)),
          row: Math.max(1, Math.min(w.row, totalRows - nh + 1)),
        };
      })
    );
  };

  const updateFolderProps = (id: string, patch: Partial<DesktopShortcut>) => {
    setShortcuts((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nw = Math.max(1, Math.min(6, patch.w ?? s.w ?? 1));
        const nh = Math.max(1, Math.min(5, patch.h ?? s.h ?? 1));
        return {
          ...s,
          ...patch,
          w: nw,
          h: nh,
          col: Math.max(1, Math.min(s.col, gridCols - nw + 1)),
          row: Math.max(1, Math.min(s.row, totalRows - nh + 1)),
        };
      })
    );
  };

  // Interactive Huawei Corner / Edge Drag-to-Resize on the Desktop Grid!
  const startGridResizeDrag = (
    e: React.PointerEvent,
    kind: 'widget' | 'folder',
    id: string,
    initW: number,
    initH: number,
    axis: 'both' | 'x' | 'y'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const gridEl = gridRef.current;
    if (!gridEl) return;
    const rect = gridEl.getBoundingClientRect();
    const cellW = Math.max(24, rect.width / gridCols);
    const cellH = Math.max(24, rect.height / totalRows);
    const startX = e.clientX;
    const startY = e.clientY;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const dCols = axis === 'y' ? 0 : Math.round(dx / cellW);
      const dRows = axis === 'x' ? 0 : Math.round(dy / cellH);
      const nextW = initW + dCols;
      const nextH = initH + dRows;
      if (kind === 'widget') {
        updateWidgetProps(id, { w: nextW, h: nextH });
      } else {
        updateFolderProps(id, { w: nextW, h: nextH });
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const resizeSelectedWidget = (dw: number, dh: number) => {
    if (!selectedId) return;
    const w = widgets.find((x) => x.id === selectedId);
    if (w) updateWidgetProps(w.id, { w: w.w + dw, h: w.h + dh });
    const f = shortcuts.find((x) => x.id === selectedId && x.kind === 'folder');
    if (f) updateFolderProps(f.id, { w: (f.w || 1) + dw, h: (f.h || 1) + dh });
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setWidgets((prev) => prev.filter((w) => w.id !== selectedId));
    setShortcuts((prev) => prev.filter((s) => s.id !== selectedId));
    if (resizingTarget?.id === selectedId) setResizingTarget(null);
    setSelectedId(null);
  };

  const addWidgetVariantAt = (def: WidgetCatalogDef, variant: WidgetVariantDef, col: number, row: number) => {
    const id = `w_${def.type}_${Date.now()}`;
    const c = Math.max(1, Math.min(gridCols - variant.w + 1, col));
    const r = Math.max(1, Math.min(totalRows - variant.h + 1, row));
    setWidgets((prev) => [
      ...prev,
      {
        id,
        widgetType: def.type,
        title: def.title,
        group: def.group,
        col: c,
        row: r,
        w: variant.w,
        h: variant.h,
        shape: variant.shape,
        variant: variant.id,
      },
    ]);
    setPickerModal(null);
    onPushToast('Рабочий стол', `Добавлен виджет «${def.title} · ${variant.label}»`, 'success');
  };

  const addAppShortcutAt = (app: AppItem, col: number, row: number) => {
    setShortcuts((prev) => [
      ...prev,
      {
        id: `sc_${app.id}_${Date.now()}`,
        kind: 'app',
        label: app.name,
        icon: app.icon,
        target: app.id,
        col: Math.max(1, Math.min(gridCols, col)),
        row: Math.max(1, Math.min(totalRows, row)),
      },
    ]);
    setPickerModal(null);
  };

  const inferFileIcon = (name: string) => {
    const low = name.toLowerCase();
    if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/.test(low)) return 'FileImage';
    if (/\.(ts|tsx|js|jsx|go|py|rs|cs|cpp|c|h|json|yaml|yml|toml|html|css|sh|bat|ps1)$/.test(low)) return 'FileCode';
    if (/\.(txt|md|log|pdf|docx?|rtf|csv)$/.test(low)) return 'FileText';
    return 'File';
  };

  // Create Universal Folder (can store apps, files, disk folders, URLs, notes, commands, system windows)
  const addFolderAt = (col: number, row: number, initialBig = false) => {
    const newId = `fld_${Date.now()}`;
    const starterItems: FolderEntry[] = apps.slice(0, 4).map((a) => ({
      id: `fe_${a.id}_${Date.now()}`,
      kind: 'app',
      label: a.name,
      icon: a.icon,
      target: a.id,
    }));
    const w = initialBig ? 2 : 1;
    const h = initialBig ? 2 : 1;
    setShortcuts((prev) => [
      ...prev,
      {
        id: newId,
        kind: 'folder',
        label: 'Новая папка',
        icon: 'Folder',
        target: 'folder',
        folderItems: starterItems,
        col: Math.max(1, Math.min(gridCols - w + 1, col)),
        row: Math.max(1, Math.min(totalRows - h + 1, row)),
        w,
        h,
        shape: 'squircle',
      },
    ]);
    setCtxMenu(null);
    onPushToast('Универсальная папка', 'Можно перетаскивать файлы, приложения, ссылки и менять размер через ПКМ', 'success');
  };

  const appendEntriesToFolder = (folderId: string, newEntries: FolderEntry[]) => {
    setShortcuts((prev) =>
      prev.map((s) => {
        if (s.id !== folderId || s.kind !== 'folder') return s;
        const current = resolveFolderEntries(s, apps);
        return { ...s, folderItems: [...current, ...newEntries], appIds: undefined };
      })
    );
  };

  const removeEntryFromFolder = (folderId: string, entryId: string) => {
    setShortcuts((prev) =>
      prev.map((s) => {
        if (s.id !== folderId || s.kind !== 'folder') return s;
        const current = resolveFolderEntries(s, apps);
        return { ...s, folderItems: current.filter((x) => x.id !== entryId), appIds: undefined };
      })
    );
  };

  const moveShortcutIntoFolder = (shortcutId: string, folderId: string) => {
    if (shortcutId === folderId) return;
    const sc = shortcuts.find((s) => s.id === shortcutId);
    if (!sc || sc.kind === 'folder') return;
    const entry: FolderEntry = {
      id: `fe_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      kind: sc.kind,
      label: sc.label,
      icon: sc.icon,
      target: sc.target,
      content: sc.content,
    };
    setShortcuts((prev) =>
      prev
        .filter((s) => s.id !== shortcutId)
        .map((s) => {
          if (s.id !== folderId) return s;
          const cur = resolveFolderEntries(s, apps);
          return { ...s, folderItems: [...cur, entry], appIds: undefined };
        })
    );
    onPushToast('Папка', `«${sc.label}» перемещено в папку`, 'success');
  };

  const extractFolderEntryToDesktop = (folderId: string, entry: FolderEntry) => {
    const folder = shortcuts.find((s) => s.id === folderId);
    const col = Math.min(gridCols, (folder?.col || 2) + (folder?.w || 1));
    const row = folder?.row || 1;
    removeEntryFromFolder(folderId, entry.id);
    addCustomDesktopItem(
      {
        kind: entry.kind,
        label: entry.label,
        icon: entry.icon,
        target: entry.target,
        content: entry.content,
      },
      col,
      row
    );
    onPushToast('Рабочий стол', `«${entry.label}» вынесено на стол`, 'info');
  };

  const addCustomDesktopItem = (item: Omit<DesktopShortcut, 'id' | 'col' | 'row'>, col: number, row: number) => {
    setShortcuts((prev) => [
      ...prev,
      {
        ...item,
        id: `sc_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        col: Math.max(1, Math.min(gridCols, col)),
        row: Math.max(1, Math.min(totalRows, row)),
      },
    ]);
  };

  const handlePickOsItem = async (mode: 'file' | 'folder', col: number, row: number, targetFolderId?: string) => {
    setPickingOsFile(true);
    try {
      const r = await fetch('/api/kernel/pick-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.picked && d?.path) {
          const entryKind = mode === 'folder' || d.is_dir ? 'disk_folder' : 'file';
          const label = d.name || d.path.split(/[\\/]/).pop() || (mode === 'folder' ? 'Папка ПК' : 'Файл');
          const icon = mode === 'folder' || d.is_dir ? 'FolderOpen' : inferFileIcon(d.name || d.path);
          if (targetFolderId) {
            appendEntriesToFolder(targetFolderId, [
              { id: `fe_${Date.now()}`, kind: entryKind, label, icon, target: d.path },
            ]);
            setFolderAddOpen(false);
          } else {
            addCustomDesktopItem({ kind: entryKind, label, icon, target: d.path }, col, row);
            setPickerModal(null);
          }
          onPushToast(targetFolderId ? 'Папка' : 'Рабочий стол', `Добавлено: ${label}`, 'success');
          setPickingOsFile(false);
          return;
        }
      }
    } catch {
      // fallback
    }
    setPickingOsFile(false);
    if (!targetFolderId && mode === 'file' && hiddenFileInputRef.current) {
      hiddenFileCellRef.current = { col, row };
      hiddenFileInputRef.current.click();
    } else {
      onPushToast('Выбор с ПК', 'Укажите путь вручную или используйте LumaOS_1.0.4.exe', 'info');
    }
  };

  const handleFilesAdded = (files: FileList | null, col: number, row: number, targetFolderId?: string) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file, idx) => {
      const targetCol = Math.min(gridCols, col + (idx % 4));
      const targetRow = Math.min(totalRows, row + Math.floor(idx / 4));
      const icon = inferFileIcon(file.name);
      const isTextLike = /\.(txt|md|json|log|csv|ts|tsx|js|py|go|html|css|ini|conf|xml)$/i.test(file.name) && file.size <= 64 * 1024;
      const commitItem = (content: string) => {
        if (targetFolderId) {
          appendEntriesToFolder(targetFolderId, [
            {
              id: `fe_${Date.now()}_${idx}`,
              kind: 'file',
              label: file.name,
              icon,
              target: file.name,
              content,
            },
          ]);
        } else {
          addCustomDesktopItem(
            { kind: 'file', label: file.name, icon, target: file.name, content },
            targetCol,
            targetRow
          );
        }
      };
      if (isTextLike) {
        const reader = new FileReader();
        reader.onload = () => commitItem(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsText(file);
      } else {
        commitItem(`Файл: ${file.name}\nРазмер: ${(file.size / 1024).toFixed(1)} КБ\nТип: ${file.type || 'файл'}`);
      }
    });
    setPickerModal(null);
    onPushToast(targetFolderId ? 'Папка' : 'Рабочий стол', `Добавлено файлов: ${files.length}`, 'success');
  };

  const openAnyEntry = async (
    entry: { id: string; kind: FolderEntry['kind']; label: string; icon: string; target: string; content?: string },
    fromFolderId?: string
  ) => {
    if (entry.kind === 'system') {
      onOpenSystemWindow(entry.target as DesktopSystemWinId);
      return;
    }
    if (entry.kind === 'app') {
      const found = apps.find((a) => a.id === entry.target);
      if (found) onLaunchApp(found);
      return;
    }
    if (entry.kind === 'command') {
      onRunTerminalCommand(entry.target);
      return;
    }
    if (entry.kind === 'note') {
      setOpenNoteItem({
        id: entry.id,
        label: entry.label,
        icon: entry.icon,
        target: entry.target,
        content: entry.content || '',
        fromFolderId,
      });
      return;
    }
    if (entry.kind === 'url') {
      const url = /^https?:\/\//i.test(entry.target) ? entry.target : `https://${entry.target}`;
      try {
        const r = await fetch('/api/kernel/open-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: url }),
        });
        if (r.ok) {
          onPushToast('Открыто', entry.label, 'info');
          return;
        }
      } catch {
        // fallback
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const hasAbsolutePath = entry.target.includes('\\') || entry.target.includes('/') || entry.target.includes(':');
    if (hasAbsolutePath) {
      try {
        const r = await fetch('/api/kernel/open-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: entry.target }),
        });
        if (r.ok) {
          onPushToast('Открыто в ОС', entry.label, 'success');
          return;
        }
      } catch {
        // fallback
      }
    }
    if (entry.content !== undefined) {
      setOpenNoteItem({
        id: entry.id,
        label: entry.label,
        icon: entry.icon,
        target: entry.target,
        content: entry.content,
        fromFolderId,
      });
    } else {
      onPushToast('Файл ПК', `Путь: ${entry.target}`, 'info');
    }
  };

  const handleOpenShortcut = async (sc: DesktopShortcut) => {
    if (sc.kind === 'folder') {
      setOpenFolderId(sc.id);
      setFolderAddOpen(false);
      return;
    }
    await openAnyEntry({
      id: sc.id,
      kind: sc.kind,
      label: sc.label,
      icon: sc.icon,
      target: sc.target,
      content: sc.content,
    });
  };

  const handleCellClick = (col: number, row: number) => {
    setCtxMenu(null);
    setShortcutCtxMenu(null);
    setWidgetCtxMenu(null);
    if (resizingTarget) {
      setResizingTarget(null);
      return;
    }
    if (!editMode || !selectedId) return;
    if (widgets.some((w) => w.id === selectedId)) {
      moveItemToCell('widget', selectedId, col, row);
    } else if (shortcuts.some((s) => s.id === selectedId)) {
      moveItemToCell('shortcut', selectedId, col, row);
    }
  };

  const handleDesktopContextMenu = (e: React.MouseEvent, col: number, row: number) => {
    e.preventDefault();
    e.stopPropagation();
    setShortcutCtxMenu(null);
    setWidgetCtxMenu(null);
    const menuW = 264;
    const menuH = 440;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 64);
    setCtxMenu({ x: Math.max(12, x), y: Math.max(12, y), col, row });
  };

  const evalCalc = (expr: string) => {
    try {
      const cleaned = expr.replace(/[^0-9+\-*/(). ]/g, '');
      if (!cleaned) return '0';
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${cleaned})`)();
      return Number.isFinite(val) ? String(Number(val.toFixed(4))) : 'ERR';
    } catch {
      return 'ERR';
    }
  };

  const runningAppsCount = useMemo(() => apps.filter((a) => a.isRunning).length, [apps]);
  const isPixel = designStyle === 'pixelbook';

  // Design-Adaptive Surface Tokens (Theme RGB Driven!)
  const cardCls = isPixel
    ? isDark
      ? 'luma-widget-pixel-dark border-white/[0.14] text-slate-100 hover:border-[var(--luma-accent-border)] shadow-[0_8px_28px_rgba(0,0,0,0.28)]'
      : 'luma-widget-pixel-light border-zinc-900/[0.14] text-slate-900 hover:border-[var(--luma-accent-border)] shadow-[0_4px_20px_rgba(25,55,109,0.08)]'
    : isDark
    ? 'luma-widget-dark border-white/[0.1] text-zinc-100 hover:border-white/[0.2]'
    : 'luma-widget-light border-zinc-900/[0.14] text-zinc-900 hover:border-zinc-900/[0.28] shadow-[0_2px_12px_rgba(0,0,0,0.05)]';

  const mutedCls = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const subBtnCls = isDark
    ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-zinc-200'
    : 'bg-zinc-900/[0.06] hover:bg-zinc-900/[0.12] border-zinc-900/[0.15] text-zinc-900';
  const railTrackCls = isDark ? 'bg-white/[0.1]' : 'bg-zinc-500/30';

  // Transparent pattern overlays layered cleanly over ANY of the 8 themes' bgGradient
  const patternOverlayCls =
    wallpaper === 'dots'
      ? isDark
        ? 'luma-pattern-dots-dark'
        : 'luma-pattern-dots-light'
      : wallpaper === 'grid'
      ? isDark
        ? 'luma-pattern-grid-dark'
        : 'luma-pattern-grid-light'
      : '';

  const renderWeatherIcon = (code: number, cls = 'w-5 h-5') => {
    const k = wmoToRu(code).kind;
    if (k === 'sun') return <Sun className={cls} />;
    if (k === 'rain') return <CloudRain className={cls} />;
    if (k === 'snow') return <Snowflake className={cls} />;
    if (k === 'storm') return <CloudLightning className={cls} />;
    return code <= 2 ? <CloudSun className={cls} /> : <Cloud className={cls} />;
  };

  const renderShortcutIcon = (iconName: string, className = 'w-5 h-5') => {
    if (iconName === 'AppWindow') return <AppWindow className={className} />;
    if (iconName === 'Terminal') return <Terminal className={className} />;
    if (iconName === 'Code2') return <Code2 className={className} />;
    if (iconName === 'Settings') return <Settings className={className} />;
    if (iconName === 'Folder') return <Folder className={className} />;
    if (iconName === 'FolderOpen') return <FolderOpen className={className} />;
    if (iconName === 'Cpu') return <Cpu className={className} />;
    if (iconName === 'File') return <File className={className} />;
    if (iconName === 'FileText') return <FileText className={className} />;
    if (iconName === 'FileCode') return <FileCode className={className} />;
    if (iconName === 'FileImage') return <FileImage className={className} />;
    if (iconName === 'Globe') return <Globe className={className} />;
    if (iconName === 'Link2') return <Link2 className={className} />;
    if (iconName === 'StickyNote') return <StickyNote className={className} />;
    const Comp = iconMap[iconName] || AppWindow;
    return <Comp className={className} />;
  };

  const renderWidgetBody = (w: DesktopWidgetInstance) => {
    const variant = w.variant || getWidgetDef(w.widgetType).defaultVariant;
    const isCircle = w.shape === 'circle';
    const isPill = w.shape === 'pill' || w.h === 1;

    switch (w.widgetType) {
      case 'luma_clock': {
        const hrs24 = now.getHours();
        const hh = timeFormat === '12' ? String(hrs24 % 12 || 12).padStart(2, '0') : String(hrs24).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const dayStr = now.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' });

        if (variant === 'analog_circle' || isCircle) {
          const secDeg = now.getSeconds() * 6;
          const minDeg = now.getMinutes() * 6 + now.getSeconds() * 0.1;
          const hrDeg = (hrs24 % 12) * 30 + now.getMinutes() * 0.5;
          return (
            <div className="h-full w-full flex items-center justify-center relative">
              <svg viewBox="0 0 120 120" className="w-full h-full max-w-[155px] max-h-[155px]">
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.5" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={i}
                    x1="60"
                    y1="10"
                    x2="60"
                    y2={i % 3 === 0 ? '20' : '15'}
                    stroke={i % 3 === 0 ? 'var(--luma-accent)' : 'currentColor'}
                    strokeOpacity={i % 3 === 0 ? 1 : 0.45}
                    strokeWidth={i % 3 === 0 ? '2.5' : '1.4'}
                    strokeLinecap="round"
                    transform={`rotate(${i * 30} 60 60)`}
                  />
                ))}
                <text x="60" y="88" textAnchor="middle" fill="currentColor" fillOpacity="0.55" fontSize="9" fontFamily="monospace">
                  {String(now.getDate()).padStart(2, '0')}.{String(now.getMonth() + 1).padStart(2, '0')}
                </text>
                <line x1="60" y1="60" x2="60" y2="32" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" transform={`rotate(${hrDeg} 60 60)`} />
                <line x1="60" y1="60" x2="60" y2="21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${minDeg} 60 60)`} />
                <line x1="60" y1="70" x2="60" y2="17" stroke="var(--luma-accent)" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${secDeg} 60 60)`} />
                <circle cx="60" cy="60" r="3.5" fill="var(--luma-accent)" />
              </svg>
            </div>
          );
        }

        if (variant === 'square_matrix') {
          return (
            <div className="h-full px-1 py-0.5 flex flex-col items-center justify-between text-center font-mono">
              <div className={`text-[9px] uppercase tracking-[0.14em] truncate max-w-full ${mutedCls}`}>{dayStr}</div>
              <div className="flex flex-col items-center leading-[0.88] font-black tracking-tighter tabular-nums">
                <span className="text-3xl sm:text-4xl">{hh}</span>
                <span className="text-3xl sm:text-4xl text-[var(--luma-accent)]">{mm}</span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] text-[10px] font-bold tabular-nums">
                :{ss}
              </div>
            </div>
          );
        }

        if (variant === 'split_flip') {
          return (
            <div className="h-full px-1 py-0.5 flex flex-col justify-between">
              <div className={`flex justify-between gap-2 text-[9px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>
                <span className="truncate">FLIP CLOCK</span>
                <span className="truncate">{dayStr}</span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-2 font-mono font-black tabular-nums">
                <div className={`relative flex-1 h-full max-h-20 rounded-lg border flex items-center justify-center text-3xl sm:text-4xl ${subBtnCls}`}>
                  {hh}
                  <span className="absolute inset-x-0 top-1/2 h-px bg-black/35" />
                </div>
                <span className="text-2xl text-[var(--luma-accent)] animate-pulse">:</span>
                <div className={`relative flex-1 h-full max-h-20 rounded-lg border flex items-center justify-center text-3xl sm:text-4xl ${subBtnCls}`}>
                  {mm}
                  <span className="absolute inset-x-0 top-1/2 h-px bg-black/35" />
                </div>
              </div>
            </div>
          );
        }

        if (variant === 'pill_minimal' || isPill) {
          return (
            <div className="h-full flex items-center justify-between gap-3 px-3 font-mono">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)]" />
                <span className="text-xl font-extrabold tabular-nums">
                  {hh}:{mm}
                  {showSeconds ? `:${ss}` : ''}
                </span>
              </div>
              <span className={`text-[10px] uppercase truncate ${mutedCls}`}>{dayStr}</span>
            </div>
          );
        }

        return (
          <LumaClockRenderer
            now={now}
            clockStyle={clockStyle}
            timeFormat={timeFormat}
            showSeconds={showSeconds}
            showDate={showDate}
            clockAccentColor={clockAccentColor}
            clockGlowEnabled={clockGlowEnabled}
            clockGlowIntensity={clockGlowIntensity}
            clockBlinkColon={clockBlinkColon}
            isDark={isDark}
            cityLabel={liveSystem?.location?.city || 'LUMA DESKTOP'}
            locale={locale}
            widgetW={w.w}
            widgetH={w.h}
          />
        );
      }

      case 'luma_battery': {
        const bat = liveSystem?.battery_percent ?? 100;
        const chg = liveSystem?.battery_charging ?? true;
        const circ = 2 * Math.PI * 38;
        const dashOffset = circ * (1 - Math.max(0, Math.min(100, bat)) / 100);

        if (variant === 'circle_ring' || isCircle) {
          return (
            <div className="h-full w-full flex items-center justify-center relative">
              <svg viewBox="0 0 100 100" className="w-full h-full max-w-[140px] max-h-[140px] -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="var(--luma-accent)"
                  strokeWidth="8"
                  strokeDasharray={circ}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <BatteryCharging className={`w-4 h-4 mb-0.5 ${chg ? 'text-[var(--luma-accent)]' : mutedCls}`} />
                <span className="text-xl font-black tabular-nums leading-none">{bat}%</span>
                <span className={`text-[8px] uppercase mt-0.5 ${mutedCls}`}>{chg ? 'СЕТЬ' : 'АКБ'}</span>
              </div>
            </div>
          );
        }

        if (variant === 'square_cell') {
          return (
            <div className="h-full w-full relative flex flex-col justify-between overflow-hidden rounded-xl">
              <div
                className="absolute inset-x-0 bottom-0 bg-[var(--luma-accent-soft)] border-t-2 border-[var(--luma-accent)] transition-all duration-500"
                style={{ height: `${Math.max(12, bat)}%` }}
              />
              <div className="relative z-10 flex items-center justify-between text-[9px] font-mono uppercase">
                <span className={mutedCls}>ЯЧЕЙКА</span>
                <BatteryCharging className={`w-3.5 h-3.5 ${chg ? 'text-[var(--luma-accent)]' : mutedCls}`} />
              </div>
              <div className="relative z-10 font-mono">
                <div className="text-3xl font-black tabular-nums leading-none">{bat}%</div>
                <div className={`text-[10px] uppercase mt-1 ${mutedCls}`}>{chg ? 'Заряжается' : 'От батареи'}</div>
              </div>
            </div>
          );
        }

        if (variant === 'pill_compact' || isPill) {
          return (
            <div className="h-full flex items-center gap-2.5 px-2 font-mono">
              <BatteryCharging className={`w-4 h-4 shrink-0 ${chg ? 'text-[var(--luma-accent)]' : mutedCls}`} />
              <div className={`flex-1 h-2 rounded-full overflow-hidden ${railTrackCls}`}>
                <div className="h-full bg-[var(--luma-accent)] rounded-full transition-all" style={{ width: `${bat}%` }} />
              </div>
              <span className="text-xs font-bold tabular-nums">{bat}%</span>
            </div>
          );
        }

        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={mutedCls}>ПИТАНИЕ</span>
              <BatteryCharging className={`w-3.5 h-3.5 ${chg ? 'text-[var(--luma-accent)]' : mutedCls}`} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-mono font-bold tabular-nums">{bat}%</span>
              <span className={`text-[10px] font-mono uppercase ${mutedCls}`}>{chg ? 'ОТ СЕТИ' : 'АКБ'}</span>
            </div>
            <div className={`h-[4px] rounded-full overflow-hidden ${railTrackCls}`}>
              <div className="h-full bg-[var(--luma-accent)]" style={{ width: `${bat}%` }} />
            </div>
          </div>
        );
      }

      case 'luma_weather': {
        if (variant === 'circle_radar' || isCircle) {
          return (
            <div className="h-full flex flex-col items-center justify-center text-center gap-1 relative">
              <div className="absolute inset-2 rounded-full border border-dashed border-current opacity-15 pointer-events-none" />
              <span className="text-[var(--luma-accent)]">{renderWeatherIcon(weather.code, 'w-6 h-6')}</span>
              <div className="text-2xl font-mono font-black tabular-nums leading-none">
                {weather.loading ? '—' : `${weather.temp > 0 ? '+' : ''}${weather.temp}°`}
              </div>
              <div className={`text-[9px] font-mono uppercase truncate max-w-[80%] ${mutedCls}`}>{weather.city}</div>
            </div>
          );
        }

        if (variant === 'square_card') {
          return (
            <div className="h-full flex flex-col items-center justify-between text-center">
              <div className={`inline-flex items-center gap-1 text-[9px] font-mono uppercase max-w-full truncate ${mutedCls}`}>
                <MapPin className="w-3 h-3 text-[var(--luma-accent)] shrink-0" />
                <span className="truncate">{weather.city}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[var(--luma-accent)]">{renderWeatherIcon(weather.code, 'w-7 h-7')}</span>
                <span className="text-3xl font-mono font-black tabular-nums leading-none">
                  {weather.loading ? '—' : `${weather.temp > 0 ? '+' : ''}${weather.temp}°`}
                </span>
              </div>
              <div className={`text-[10px] font-mono ${mutedCls}`}>{weather.label}</div>
            </div>
          );
        }

        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] truncate ${mutedCls}`}>
                <MapPin className="w-3 h-3 text-[var(--luma-accent)] shrink-0" />
                <span className="truncate">{weather.city}</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchedCityRef.current = '';
                  onRefreshLocation();
                  if (liveSystem?.location?.detected) {
                    fetchWeatherForCoords(
                      liveSystem.location.latitude,
                      liveSystem.location.longitude,
                      liveSystem.location.city,
                      liveSystem.location.country
                    );
                  }
                }}
                title="Обновить погоду и регион"
                className={`p-1 rounded-md cursor-pointer transition ${mutedCls} hover:text-[var(--luma-accent)]`}
              >
                <RefreshCw className={`w-3 h-3 ${weather.loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {renderWeatherIcon(weather.code)}
                <span className="text-3xl font-mono font-bold tabular-nums leading-none">
                  {weather.loading ? '—' : `${weather.temp > 0 ? '+' : ''}${weather.temp}°`}
                </span>
              </div>
              <div className={`text-right text-[10px] font-mono leading-tight ${mutedCls}`}>
                <div className={isDark ? 'text-zinc-200 font-semibold' : 'text-zinc-800 font-semibold'}>{weather.label}</div>
                <div>
                  {weather.humidity}% · {weather.wind} км/ч
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'luma_media': {
        if (variant === 'vinyl_circle' || isCircle) {
          return (
            <div className="h-full flex flex-col items-center justify-center text-center relative">
              <div
                className={`w-24 h-24 rounded-full border-2 border-dashed border-current/25 flex items-center justify-center relative ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '9s' }}
              >
                <div className="w-16 h-16 rounded-full border border-current/15 flex items-center justify-center" />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMediaPlay();
                }}
                className="absolute w-10 h-10 rounded-full bg-[var(--luma-accent)] text-white flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="absolute bottom-1.5 inset-x-4 text-[9px] font-bold truncate">{trackTitle}</div>
            </div>
          );
        }

        if (variant === 'square_cover') {
          return (
            <div className="h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center">
                  <Disc3 className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '5s' }} />
                </div>
                <span className={`text-[9px] font-mono uppercase ${mutedCls}`}>{isPlaying ? 'PLAY' : 'PAUSE'}</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{trackTitle}</div>
                <div className={`text-[10px] truncate ${mutedCls}`}>{trackArtist}</div>
              </div>
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrevTrack();
                  }}
                  className={`p-1.5 rounded-full border cursor-pointer ${subBtnCls}`}
                >
                  <SkipBack className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMediaPlay();
                  }}
                  className="p-2 rounded-full bg-[var(--luma-accent)] text-white cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNextTrack();
                  }}
                  className={`p-1.5 rounded-full border cursor-pointer ${subBtnCls}`}
                >
                  <SkipForward className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className="inline-flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[var(--luma-accent)] animate-pulse' : 'bg-zinc-500'}`} />
                <span className={mutedCls}>{hasLiveMedia ? 'АУДИО ОС' : 'МЕДИА'}</span>
              </span>
              {isPlaying && (
                <div className="flex items-end gap-[2px] h-2.5">
                  <span className="w-[2px] h-full bg-[var(--luma-accent)] luma-eq-bar" />
                  <span className="w-[2px] h-full bg-current luma-eq-bar luma-eq-bar-2" />
                  <span className="w-[2px] h-full bg-[var(--luma-accent)] luma-eq-bar luma-eq-bar-3" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{trackTitle}</div>
                <div className={`text-[11px] truncate ${mutedCls}`}>{trackArtist}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrevTrack();
                  }}
                  title="Предыдущий трек"
                  className={`w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer transition ${subBtnCls}`}
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMediaPlay();
                  }}
                  title={isPlaying ? 'Пауза' : 'Воспроизвести'}
                  className="w-8 h-8 rounded-full bg-[var(--luma-accent)] hover:opacity-90 text-white flex items-center justify-center cursor-pointer transition"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNextTrack();
                  }}
                  title="Следующий трек"
                  className={`w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer transition ${subBtnCls}`}
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'luma_sys': {
        const cpu = liveSystem?.cpu_percent ?? 0;
        const ram = liveSystem?.ram_percent ?? 0;
        const ramStr = liveSystem ? `${liveSystem.ram_used_gb.toFixed(1)}/${liveSystem.ram_total_gb.toFixed(0)}G` : `${ram}%`;
        const disk = liveSystem?.disks?.[0];
        const bat = liveSystem?.battery_percent ?? 100;

        if (variant === 'dual_rings') {
          const rCirc = 2 * Math.PI * 26;
          return (
            <div className="h-full flex flex-col justify-between">
              <div className={`text-[9px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>ТЕЛЕМЕТРИЯ</div>
              <div className="flex-1 grid grid-cols-2 gap-2 items-center">
                {[
                  { label: 'CPU', pct: cpu },
                  { label: 'ОЗУ', pct: ram },
                ].map((g) => (
                  <div key={g.label} className="relative flex items-center justify-center">
                    <svg viewBox="0 0 68 68" className="w-20 h-20 -rotate-90">
                      <circle cx="34" cy="34" r="26" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="6" />
                      <circle
                        cx="34"
                        cy="34"
                        r="26"
                        fill="none"
                        stroke="var(--luma-accent)"
                        strokeWidth="6"
                        strokeDasharray={rCirc}
                        strokeDashoffset={rCirc * (1 - Math.min(100, g.pct) / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center font-mono leading-none">
                      <span className="text-xs font-black">{g.pct}%</span>
                      <span className={`text-[8px] mt-0.5 ${mutedCls}`}>{g.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (variant === 'pill_strip' || isPill) {
          return (
            <div className="h-full flex items-center justify-around gap-2 px-2 font-mono text-xs">
              <span>
                <span className={mutedCls}>CPU </span>
                <strong className="text-[var(--luma-accent)]">{cpu}%</strong>
              </span>
              <span className="opacity-25">·</span>
              <span>
                <span className={mutedCls}>RAM </span>
                <strong>{ram}%</strong>
              </span>
              <span className="opacity-25">·</span>
              <span>
                <span className={mutedCls}>DSK </span>
                <strong>{disk?.percent ?? 0}%</strong>
              </span>
            </div>
          );
        }

        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={mutedCls}>СИСТЕМА · HAL</span>
              <span className={`truncate max-w-[140px] ${mutedCls}`}>{liveSystem?.hostname || 'HOST'}</span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { label: 'CPU', val: `${cpu}%`, pct: cpu },
                { label: 'ОЗУ', val: ramStr, pct: ram },
                { label: 'ДИСК', val: disk ? `${disk.percent}%` : '—', pct: disk?.percent ?? 0 },
                { label: 'ЗАРЯД', val: `${bat}%`, pct: bat },
              ].map((m) => (
                <div key={m.label} className="space-y-1">
                  <div className={`text-[9px] font-mono uppercase ${mutedCls}`}>{m.label}</div>
                  <div className="text-xs font-mono font-bold tabular-nums truncate">{m.val}</div>
                  <div className={`h-[3px] w-full rounded-full overflow-hidden ${railTrackCls}`}>
                    <div
                      className={`h-full transition-all duration-300 ${
                        m.pct > 85 ? 'bg-[var(--luma-accent)]' : isDark ? 'bg-zinc-200' : 'bg-zinc-900'
                      }`}
                      style={{ width: `${Math.max(4, Math.min(100, m.pct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'luma_disks': {
        const disks = liveSystem?.disks || [];
        const first = disks[0];
        if (variant === 'circle_disk' || isCircle) {
          const pct = first?.percent ?? 0;
          const circ = 2 * Math.PI * 36;
          return (
            <div className="h-full flex items-center justify-center relative">
              <svg viewBox="0 0 96 96" className="w-full h-full max-w-[136px] max-h-[136px] -rotate-90">
                <circle cx="48" cy="48" r="36" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="7" />
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  fill="none"
                  stroke="var(--luma-accent)"
                  strokeWidth="7"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center font-mono">
                <span className="text-[10px] font-bold">{first?.mount || 'C:'}</span>
                <span className="text-lg font-black leading-none">{pct}%</span>
                <span className={`text-[8px] ${mutedCls}`}>{first ? `${first.free_gb.toFixed(0)}G своб.` : '—'}</span>
              </div>
            </div>
          );
        }

        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={`inline-flex items-center gap-1.5 ${mutedCls}`}>
                <HardDrive className="w-3 h-3" />
                НАКОПИТЕЛИ ({disks.length})
              </span>
            </div>
            <div className="space-y-1.5 overflow-hidden">
              {disks.slice(0, 2).map((d) => (
                <div key={d.mount} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="font-bold truncate">{d.mount}</span>
                    <span className={mutedCls}>
                      {d.free_gb.toFixed(1)}G своб. / {d.total_gb.toFixed(0)}G
                    </span>
                  </div>
                  <div className={`h-[3px] rounded-full overflow-hidden ${railTrackCls}`}>
                    <div
                      className={`h-full ${d.percent > 85 ? 'bg-[var(--luma-accent)]' : isDark ? 'bg-zinc-200' : 'bg-zinc-900'}`}
                      style={{ width: `${Math.max(3, d.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'luma_net':
        if (variant === 'square_net') {
          return (
            <div className="h-full flex flex-col justify-between font-mono">
              <div className={`inline-flex items-center gap-1 text-[9px] uppercase ${mutedCls}`}>
                <Wifi className="w-3 h-3 text-[var(--luma-accent)]" /> СЕТЬ
              </div>
              <div className="space-y-1">
                <div className={`text-[9px] ${mutedCls}`}>↓ ПРИЁМ</div>
                <div className="text-lg font-black leading-none">{(liveSystem?.net_down_mbps ?? 0).toFixed(1)} Мб/с</div>
              </div>
              <div className="space-y-1">
                <div className={`text-[9px] ${mutedCls}`}>↑ ОТДАЧА</div>
                <div className="text-lg font-black leading-none">{(liveSystem?.net_up_mbps ?? 0).toFixed(1)} Мб/с</div>
              </div>
            </div>
          );
        }
        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={`inline-flex items-center gap-1.5 ${mutedCls}`}>
                <Wifi className="w-3 h-3" />
                СЕТЬ · IPC 49215
              </span>
              <span className="text-[10px] font-mono">{liveSystem?.location?.ip || '127.0.0.1'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono">
              <div>
                <div className={`text-[9px] uppercase ${mutedCls}`}>ПРИЁМ</div>
                <div className="text-lg font-bold tabular-nums">
                  {(liveSystem?.net_down_mbps ?? 0).toFixed(1)} <span className={`text-[10px] font-normal ${mutedCls}`}>Мбит/с</span>
                </div>
              </div>
              <div>
                <div className={`text-[9px] uppercase ${mutedCls}`}>ОТДАЧА</div>
                <div className="text-lg font-bold tabular-nums">
                  {(liveSystem?.net_up_mbps ?? 0).toFixed(1)} <span className={`text-[10px] font-normal ${mutedCls}`}>Мбит/с</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'luma_quick': {
        const items = [
          { label: isMuted ? 'Выкл' : `${volume}%`, active: !isMuted, icon: isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />, onClick: onToggleMute },
          { label: 'DND', active: dndEnabled, icon: <BellOff className="w-3.5 h-3.5" />, onClick: onToggleDnd },
          { label: 'Остров', active: dynamicIslandEnabled, icon: <Disc3 className="w-3.5 h-3.5" />, onClick: onToggleIsland },
          { label: isDark ? 'Ночь' : 'День', active: isDark, icon: isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />, onClick: onToggleTheme },
        ];
        return (
          <div className="h-full flex flex-col justify-between gap-1.5">
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>УПРАВЛЕНИЕ</div>
            <div className={`grid ${variant === 'square_grid' ? 'grid-cols-2 flex-1' : 'grid-cols-4'} gap-1.5`}>
              {items.map((b) => (
                <button
                  key={b.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    b.onClick();
                  }}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-mono cursor-pointer transition ${
                    b.active ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : subBtnCls
                  }`}
                >
                  {b.icon}
                  <span className="truncate max-w-full">{b.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'luma_notes':
        return (
          <div className="h-full flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={`inline-flex items-center gap-1.5 ${mutedCls}`}>
                <CheckSquare className="w-3 h-3" />
                ЗАДАЧИ ({notes.filter((n) => !n.done).length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
              {notes.map((n) => (
                <div
                  key={n.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)));
                  }}
                  className="flex items-center justify-between gap-2 text-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 ${
                        n.done ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : 'border-zinc-500'
                      }`}
                    >
                      {n.done && <Check className="w-2.5 h-2.5" />}
                    </span>
                    <span className={`truncate ${n.done ? 'line-through opacity-50' : ''}`}>{n.text}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotes((prev) => prev.filter((x) => x.id !== n.id));
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-[var(--luma-accent)] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!noteInput.trim()) return;
                setNotes((prev) => [...prev, { id: String(Date.now()), text: noteInput.trim(), done: false }]);
                setNoteInput('');
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex gap-1.5"
            >
              <input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Новая задача..."
                className={`flex-1 min-w-0 px-2.5 py-1 rounded-lg border text-[11px] outline-none ${subBtnCls}`}
              />
              <button type="submit" className="px-2 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-[11px] font-bold cursor-pointer">
                +
              </button>
            </form>
          </div>
        );

      case 'luma_pomodoro': {
        const mm = String(Math.floor(pomoSec / 60)).padStart(2, '0');
        const ss = String(pomoSec % 60).padStart(2, '0');
        if (variant === 'circle_dial' || isCircle) {
          const pct = pomoSec / (25 * 60);
          const circ = 2 * Math.PI * 38;
          return (
            <div className="h-full flex items-center justify-center relative">
              <svg viewBox="0 0 100 100" className="w-full h-full max-w-[140px] max-h-[140px] -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="var(--luma-accent)"
                  strokeWidth="6"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center gap-1 font-mono">
                <span className="text-lg font-black tabular-nums leading-none">
                  {mm}:{ss}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPomoRunning((v) => !v);
                  }}
                  className="px-2 py-0.5 rounded-full bg-[var(--luma-accent)] text-white text-[9px] font-bold cursor-pointer"
                >
                  {pomoRunning ? 'СТОП' : 'СТАРТ'}
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={`inline-flex items-center gap-1 ${mutedCls}`}>
                <Timer className="w-3 h-3" />
                ФОКУС
              </span>
              <span className={pomoRunning ? 'text-[var(--luma-accent)]' : mutedCls}>{pomoRunning ? 'ИДЁТ' : 'ПАУЗА'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-3xl font-mono font-bold tabular-nums">
                {mm}:{ss}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPomoRunning((v) => !v);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--luma-accent)] text-white text-[10px] font-mono font-bold cursor-pointer"
                >
                  {pomoRunning ? 'СТОП' : 'СТАРТ'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPomoRunning(false);
                    setPomoSec(25 * 60);
                  }}
                  className={`p-1.5 rounded-lg border cursor-pointer ${subBtnCls}`}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'luma_calc':
        return (
          <div className="h-full flex flex-col justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={`inline-flex items-center gap-1 ${mutedCls}`}>
                <Calculator className="w-3 h-3" />
                КАЛЬКУЛЯТОР
              </span>
              <span className="font-bold text-sm tabular-nums">{calcRes}</span>
            </div>
            <div className={`px-2 py-1 rounded-lg border text-right font-mono text-xs truncate ${subBtnCls}`}>
              {calcExpr || '0'}
            </div>
            <div className="grid grid-cols-4 gap-1 text-[11px] font-mono font-bold">
              {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '=', '+'].map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    if (k === 'C') {
                      setCalcExpr('');
                      setCalcRes('0');
                    } else if (k === '=') {
                      setCalcRes(evalCalc(calcExpr));
                    } else {
                      const next = calcExpr + k;
                      setCalcExpr(next);
                      setCalcRes(evalCalc(next));
                    }
                  }}
                  className={`py-1 rounded-lg border cursor-pointer ${
                    k === '=' ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : subBtnCls
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        );

      case 'luma_calendar': {
        if (variant === 'square_date') {
          const monthName = now.toLocaleDateString('ru-RU', { month: 'long' });
          const weekdayName = now.toLocaleDateString('ru-RU', { weekday: 'long' });
          return (
            <div className="h-full flex flex-col items-center justify-between text-center">
              <div className="w-full py-0.5 rounded-lg bg-[var(--luma-accent)] text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                {monthName}
              </div>
              <div className="text-4xl font-mono font-black tabular-nums leading-none">{now.getDate()}</div>
              <div className={`text-[10px] capitalize ${mutedCls}`}>{weekdayName}</div>
            </div>
          );
        }

        const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
        const fmt = (off: number) => {
          const d = new Date(utc.getTime() + off * 3600000);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };
        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={`inline-flex items-center gap-1 ${mutedCls}`}>
                <Calendar className="w-3 h-3" />
                КАЛЕНДАРЬ
              </span>
              <span className="text-[var(--luma-accent)] font-bold">{now.getFullYear()}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-2xl font-mono font-bold tabular-nums">
                {String(now.getDate()).padStart(2, '0')}.{String(now.getMonth() + 1).padStart(2, '0')}
              </div>
              <div className={`text-[10px] font-mono space-x-2 ${mutedCls}`}>
                <span>MSK {fmt(3)}</span>
                <span>LON {fmt(0)}</span>
                <span>TYO {fmt(9)}</span>
              </div>
            </div>
          </div>
        );
      }

      case 'luma_wellbeing':
        return (
          <div className="h-full flex flex-col justify-between">
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>ЭКРАННОЕ ВРЕМЯ</div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-mono font-bold tabular-nums">{runningAppsCount}</div>
                <div className={`text-[10px] ${mutedCls}`}>активных сессий</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSystemWindow('tracker');
                }}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold cursor-pointer ${subBtnCls}`}
              >
                ОТКРЫТЬ
              </button>
            </div>
          </div>
        );

      case 'luma_rings': {
        const pct = Math.round((notes.filter((n) => n.done).length / Math.max(1, notes.length)) * 100);
        if (variant === 'circle_ring' || isCircle) {
          const circ = 2 * Math.PI * 36;
          return (
            <div className="h-full flex items-center justify-center relative">
              <svg viewBox="0 0 96 96" className="w-full h-full max-w-[136px] max-h-[136px] -rotate-90">
                <circle cx="48" cy="48" r="36" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="7" />
                <circle cx="48" cy="48" r="36" fill="none" stroke="var(--luma-accent)" strokeWidth="7" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" />
              </svg>
              <div className="absolute flex flex-col items-center font-mono">
                <span className="text-lg font-black">{pct}%</span>
                <span className={`text-[8px] uppercase ${mutedCls}`}>РИТМ</span>
              </div>
            </div>
          );
        }
        return (
          <div className="h-full flex flex-col justify-between">
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>РИТМ ДНЯ</div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span>Задачи: {notes.filter((n) => n.done).length}/{notes.length}</span>
              <span className="text-[var(--luma-accent)] font-bold">{pct}%</span>
            </div>
            <div className={`h-[4px] rounded-full overflow-hidden ${railTrackCls}`}>
              <div className="h-full bg-[var(--luma-accent)]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      }

      case 'luma_markets': {
        const baseSym = CURRENCY_SYMBOLS[currencyBase] || currencyBase;
        const visibleList = trackedCurrencies.filter((c) => c !== currencyBase).slice(0, w.w >= 5 ? 4 : 3);
        const fmtRate = (val: number) => {
          if (!Number.isFinite(val)) return '—';
          if (val >= 100000) return `${(val / 1000).toFixed(0)}k`;
          if (val >= 10000) return `${(val / 1000).toFixed(1)}k`;
          if (val >= 100) return val.toFixed(1);
          if (val >= 1) return val.toFixed(2);
          return val.toFixed(3);
        };
        return (
          <div className="h-full flex flex-col justify-between gap-1.5 px-0.5">
            <div className="flex items-center justify-between gap-1">
              <div className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] truncate ${mutedCls}`}>
                <TrendingUp className="w-3 h-3 text-[var(--luma-accent)] shrink-0" />
                <span>ВАЛЮТЫ · {currencyBase}</span>
                {currencyLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Живые курсы" />}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrencyConfigOpen(true);
                }}
                title="Настроить валюты и конвертер"
                className={`px-1.5 py-0.5 rounded-lg border text-[9px] font-mono cursor-pointer transition hover:border-[var(--luma-accent)] ${subBtnCls}`}
              >
                Изм.
              </button>
            </div>
            <div
              className="grid gap-2 font-mono text-[11px]"
              style={{ gridTemplateColumns: `repeat(${Math.max(1, visibleList.length)}, minmax(0, 1fr))` }}
            >
              {visibleList.map((sym) => {
                const rate = currencyRates[sym];
                return (
                  <div key={sym} className="min-w-0">
                    <div className={`text-[9px] truncate ${mutedCls}`}>{sym}</div>
                    <div className="font-bold tabular-nums truncate">
                      {fmtRate(rate)}
                      <span className="text-[9px] opacity-75 ml-0.5">{baseSym}</span>
                    </div>
                    <div className="text-[8px] text-emerald-500 truncate">
                      {currencyUpdatedAt ? currencyUpdatedAt : 'LIVE'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'luma_power': {
        const actions = [
          { label: 'Блок', icon: <Lock className="w-3.5 h-3.5" />, act: 'lock' as const },
          { label: 'Сон', icon: <Power className="w-3.5 h-3.5" />, act: 'sleep' as const },
          { label: 'Корзина', icon: <Trash2 className="w-3.5 h-3.5" />, act: 'recycle_bin' as const },
        ];
        if (variant === 'pill_power' || isPill) {
          return (
            <div className="h-full flex items-center justify-around gap-1.5 px-1">
              {actions.map((p) => (
                <button
                  key={p.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPowerAction(p.act);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-full border flex items-center justify-center gap-1 text-[10px] font-mono cursor-pointer ${subBtnCls}`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          );
        }
        return (
          <div className="h-full flex flex-col justify-between">
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>ПИТАНИЕ ПК</div>
            <div className="grid grid-cols-3 gap-1.5">
              {actions.map((p) => (
                <button
                  key={p.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPowerAction(p.act);
                  }}
                  className={`py-2 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-mono cursor-pointer transition ${subBtnCls}`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'luma_guard':
        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={`inline-flex items-center gap-1 ${mutedCls}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                LUMAGUARD
              </span>
              <span>AES-256</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[11px] font-mono ${mutedCls}`}>PBKDF2 · HMAC</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRotateKey();
                }}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold cursor-pointer ${subBtnCls}`}
              >
                РОТАЦИЯ
              </button>
            </div>
          </div>
        );

      case 'luma_utils':
      default: {
        const mods = [
          { label: 'Файлы', icon: <FolderOpen className="w-3.5 h-3.5" />, win: 'explorer' as const },
          { label: 'Задачи', icon: <Cpu className="w-3.5 h-3.5" />, win: 'taskmgr' as const },
          { label: 'Терм.', icon: <Terminal className="w-3.5 h-3.5" />, win: 'terminal' as const },
          { label: 'Опции', icon: <Settings className="w-3.5 h-3.5" />, win: 'settings' as const },
        ];
        return (
          <div className="h-full flex flex-col justify-between gap-1.5">
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>МОДУЛИ</div>
            <div className={`grid ${variant === 'square_utils' ? 'grid-cols-2 flex-1' : 'grid-cols-4'} gap-1.5`}>
              {mods.map((u) => (
                <button
                  key={u.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSystemWindow(u.win);
                  }}
                  className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-mono cursor-pointer transition ${subBtnCls}`}
                >
                  {u.icon}
                  <span>{u.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      }
    }
  };

  const dynamicGridPadStyle: React.CSSProperties =
    taskbarPosition === 'top'
      ? { padding: '12px', paddingTop: `${taskbarSizePx + 14}px` }
      : taskbarPosition === 'left'
      ? { padding: '12px', paddingLeft: `${taskbarSizePx + 14}px` }
      : { padding: '12px', paddingBottom: `${taskbarSizePx + 14}px` };

  const modalShellCls = isPixel
    ? isDark
      ? 'dex-window-pixel-dark text-slate-100 rounded-[24px]'
      : 'dex-window-pixel-light text-slate-900 rounded-[24px]'
    : isDark
    ? 'dex-window-dark text-zinc-100 rounded-2xl'
    : 'dex-window-light text-zinc-900 rounded-2xl';

  // Resolve active resizing target object for the Huawei HarmonyOS floating bar
  const resizingWidget = resizingTarget?.kind === 'widget' ? widgets.find((w) => w.id === resizingTarget.id) || null : null;
  const resizingFolder = resizingTarget?.kind === 'folder' ? shortcuts.find((s) => s.id === resizingTarget.id && s.kind === 'folder') || null : null;
  const resizingWidgetDef = resizingWidget ? getWidgetDef(resizingWidget.widgetType) : null;

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background:
          themeBgGradient ||
          (isDark ? 'linear-gradient(160deg, #09090b 0%, #101014 100%)' : 'linear-gradient(160deg, #e1e2dc 0%, #d4d6ce 100%)'),
      }}
    >
      {/* Optional Custom Wallpaper Image Layer with Adjustable Blur & Dimming */}
      {wallpaperImageUrl && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{
              backgroundImage: `url("${wallpaperImageUrl}")`,
              filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined,
              transform: wallpaperBlur > 0 ? 'scale(1.06)' : undefined,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundColor: isDark
                ? `rgba(7, 7, 12, ${Math.min(0.85, Math.max(0, wallpaperDim / 100))})`
                : `rgba(240, 240, 236, ${Math.min(0.75, Math.max(0, wallpaperDim / 120))})`,
            }}
          />
        </>
      )}

      {/* Subtle transparent texture overlay (Dots / Grid / Matte) over ANY theme */}
      {patternOverlayCls && <div className={`pointer-events-none absolute inset-0 ${patternOverlayCls}`} />}

      {/* Hidden browser file input fallback */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesAdded(e.target.files, hiddenFileCellRef.current.col, hiddenFileCellRef.current.row);
          e.target.value = '';
        }}
      />

      {/* FULL-VIEWPORT 22x10 (220 CELLS) OR 20x10 (200 CELLS) DESKTOP MATRIX */}
      <div
        ref={gridRef}
        className="relative z-10 w-full h-full"
        onMouseLeave={() => setHoveredCell(null)}
        onDragEnter={(e) => {
          if (e.dataTransfer?.types?.includes('Files')) setExternalFileDrag(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) {
            setHoveredCell(null);
            setExternalFileDrag(false);
          }
        }}
        style={{
          ...dynamicGridPadStyle,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))`,
          gap: '6px',
        }}
      >
        {/* 1. Interactive 200–220 Desktop Coordinate Cells */}
        {Array.from({ length: totalRows }).map((_, rIdx) =>
          Array.from({ length: gridCols }).map((__, cIdx) => {
            const col = cIdx + 1;
            const row = rIdx + 1;
            const isHovered = hoveredCell?.col === col && hoveredCell?.row === row;
            const showActiveHighlight = (editMode || Boolean(draggingId) || externalFileDrag) && isHovered;
            return (
              <div
                key={`c_${col}_${row}`}
                style={{ gridColumn: `${col} / span 1`, gridRow: `${row} / span 1` }}
                onMouseEnter={() => {
                  if (editMode) setHoveredCell({ col, row });
                }}
                onMouseLeave={() => {
                  if (hoveredCell?.col === col && hoveredCell?.row === row) setHoveredCell(null);
                }}
                onClick={() => handleCellClick(col, row)}
                onContextMenu={(e) => handleDesktopContextMenu(e, col, row)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggingId || e.dataTransfer?.types?.includes('Files')) {
                    setHoveredCell({ col, row });
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setHoveredCell(null);
                  setExternalFileDrag(false);
                  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                    handleFilesAdded(e.dataTransfer.files, col, row);
                    return;
                  }
                  if (draggingId) {
                    moveItemToCell(draggingId.kind, draggingId.id, col, row);
                    setDraggingId(null);
                  }
                }}
                className={`rounded-lg transition-colors flex items-center justify-center ${
                  editMode || Boolean(resizingTarget)
                    ? showActiveHighlight
                      ? 'border border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] cursor-pointer'
                      : isDark
                      ? 'border border-white/[0.06] hover:border-white/[0.15] cursor-pointer'
                      : 'border border-zinc-900/[0.1] hover:border-zinc-900/[0.24] cursor-pointer'
                    : showActiveHighlight
                    ? 'border border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                    : ''
                }`}
              >
                {(editMode || Boolean(resizingTarget)) && (
                  <span className="text-[8px] font-mono text-zinc-500/60 pointer-events-none">
                    {col}.{row}
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* 2. Desktop Widgets (with Huawei HarmonyOS Shape & Corner Drag Resize!) */}
        {widgets.map((w) => {
          const clampedCol = Math.max(1, Math.min(gridCols - w.w + 1, w.col));
          const clampedRow = Math.max(1, Math.min(totalRows - w.h + 1, w.row));
          const isSelected = selectedId === w.id;
          const isResizing = resizingTarget?.kind === 'widget' && resizingTarget.id === w.id;
          const shapeCls = getShapeClass(w.shape);

          return (
            <div
              key={w.id}
              draggable={!isResizing}
              onDragStart={() => {
                if (!isResizing) setDraggingId({ kind: 'widget', id: w.id });
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setHoveredCell(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setCtxMenu(null);
                setShortcutCtxMenu(null);
                setWidgetCtxMenu(null);
                if (editMode) setSelectedId(w.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCtxMenu(null);
                setShortcutCtxMenu(null);
                setSelectedId(w.id);
                const x = Math.min(e.clientX, window.innerWidth - 235);
                const y = Math.min(e.clientY, window.innerHeight - 230);
                setWidgetCtxMenu({ x: Math.max(12, x), y: Math.max(12, y), w });
              }}
              style={{
                gridColumn: `${clampedCol} / span ${Math.min(w.w, gridCols)}`,
                gridRow: `${clampedRow} / span ${Math.min(w.h, totalRows)}`,
                zIndex: isResizing ? 28 : isSelected ? 15 : 5,
              }}
              className={`relative border ${w.shape === 'circle' ? 'p-2.5' : 'p-3.5'} ${shapeCls} luma-card-lift ${cardCls} ${
                editMode ? 'cursor-grab active:cursor-grabbing' : ''
              } ${
                isResizing
                  ? 'ring-2 ring-[var(--luma-accent)] shadow-[0_0_0_5px_var(--luma-accent-soft)]'
                  : isSelected && editMode
                  ? 'ring-2 ring-[var(--luma-accent)]'
                  : ''
              }`}
            >
              <div className={`w-full h-full overflow-hidden ${shapeCls}`}>{renderWidgetBody(w)}</div>

              {(editMode || isResizing) && (
                <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--luma-accent)] text-white text-[9px] font-mono font-bold shadow">
                  <span>
                    {w.w}×{w.h}
                  </span>
                </div>
              )}

              {/* Huawei HarmonyOS Interactive Drag Handles when Resizing */}
              {isResizing && (
                <>
                  <div
                    onPointerDown={(e) => startGridResizeDrag(e, 'widget', w.id, w.w, w.h, 'x')}
                    title="Потяните вправо/влево для ширины"
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-30 w-2.5 h-8 rounded-full bg-[var(--luma-accent)] border-2 border-white cursor-ew-resize shadow-lg"
                  />
                  <div
                    onPointerDown={(e) => startGridResizeDrag(e, 'widget', w.id, w.w, w.h, 'y')}
                    title="Потяните вверх/вниз для высоты"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-30 h-2.5 w-8 rounded-full bg-[var(--luma-accent)] border-2 border-white cursor-ns-resize shadow-lg"
                  />
                  <div
                    onPointerDown={(e) => startGridResizeDrag(e, 'widget', w.id, w.w, w.h, 'both')}
                    title="Потяните за угол для изменения размера"
                    className="absolute -bottom-1.5 -right-1.5 z-30 w-5 h-5 rounded-full bg-[var(--luma-accent)] border-2 border-white text-white flex items-center justify-center cursor-nwse-resize shadow-xl"
                  >
                    <Maximize2 className="w-2.5 h-2.5" />
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* 3. Desktop Shortcuts & Universal Huawei Big Folders */}
        {shortcuts.map((sc) => {
          const sw = sc.kind === 'folder' ? Math.max(1, sc.w || 1) : 1;
          const sh = sc.kind === 'folder' ? Math.max(1, sc.h || 1) : 1;
          const clampedCol = Math.max(1, Math.min(gridCols - sw + 1, sc.col));
          const clampedRow = Math.max(1, Math.min(totalRows - sh + 1, sc.row));
          const isSelected = selectedId === sc.id;
          const isResizing = resizingTarget?.kind === 'folder' && resizingTarget.id === sc.id;
          const isFolder = sc.kind === 'folder';
          const isBigFolder = isFolder && (sw >= 2 || sh >= 2);
          const folderEntries = isFolder ? resolveFolderEntries(sc, apps) : [];
          const folderShapeCls = getShapeClass(sc.shape);
          const isDropTarget = isFolder && dragOverFolderId === sc.id;

          // HUAWEI HARMONYOS BIG FOLDER RENDER (2x1, 2x2, 3x2, 4x2, etc.)
          if (isBigFolder) {
            const visibleLimit = sw === 2 && sh === 1 ? 3 : Math.min(12, sw * sh * 2 - 1);
            const gridColsInner = sw >= 4 ? 4 : sw >= 3 ? 3 : sh === 1 ? 3 : 2;
            return (
              <div
                key={sc.id}
                draggable={!isResizing}
                onDragStart={() => {
                  if (!isResizing) setDraggingId({ kind: 'shortcut', id: sc.id });
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setHoveredCell(null);
                  setDragOverFolderId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if ((draggingId?.kind === 'shortcut' && draggingId.id !== sc.id) || e.dataTransfer?.types?.includes('Files')) {
                    setDragOverFolderId(sc.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverFolderId === sc.id) setDragOverFolderId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(null);
                  setHoveredCell(null);
                  setExternalFileDrag(false);
                  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                    handleFilesAdded(e.dataTransfer.files, clampedCol, clampedRow, sc.id);
                    return;
                  }
                  if (draggingId?.kind === 'shortcut' && draggingId.id !== sc.id) {
                    moveShortcutIntoFolder(draggingId.id, sc.id);
                    setDraggingId(null);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCtxMenu(null);
                  setShortcutCtxMenu(null);
                  setWidgetCtxMenu(null);
                  if (editMode) {
                    setSelectedId(sc.id);
                    return;
                  }
                  setOpenFolderId(sc.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCtxMenu(null);
                  setWidgetCtxMenu(null);
                  setSelectedId(sc.id);
                  const x = Math.min(e.clientX, window.innerWidth - 235);
                  const y = Math.min(e.clientY, window.innerHeight - 250);
                  setShortcutCtxMenu({ x: Math.max(12, x), y: Math.max(12, y), sc });
                }}
                style={{
                  gridColumn: `${clampedCol} / span ${sw}`,
                  gridRow: `${clampedRow} / span ${sh}`,
                  zIndex: isResizing ? 28 : 8,
                }}
                className={`relative border p-2.5 flex flex-col justify-between gap-1.5 ${folderShapeCls} ${cardCls} cursor-pointer transition ${
                  isDropTarget || isResizing
                    ? 'ring-2 ring-[var(--luma-accent)] shadow-[0_0_0_5px_var(--luma-accent-soft)]'
                    : isSelected && editMode
                    ? 'ring-2 ring-[var(--luma-accent)]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1 px-0.5 shrink-0">
                  <span className="text-[11px] font-bold truncate flex items-center gap-1">
                    <Folder className="w-3 h-3 text-[var(--luma-accent)] shrink-0" />
                    <span className="truncate">{sc.label}</span>
                  </span>
                  <span className={`text-[9px] font-mono shrink-0 ${mutedCls}`}>{folderEntries.length}</span>
                </div>

                <div
                  className="flex-1 min-h-0 grid gap-1.5 overflow-hidden content-start"
                  style={{ gridTemplateColumns: `repeat(${gridColsInner}, minmax(0, 1fr))` }}
                >
                  {folderEntries.slice(0, visibleLimit).map((entry) => (
                    <button
                      key={entry.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openAnyEntry(entry, sc.id);
                      }}
                      title={`${entry.label}${entry.target ? `\n${entry.target}` : ''}`}
                      className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${subBtnCls} hover:border-[var(--luma-accent)]`}
                    >
                      {renderShortcutIcon(entry.icon, 'w-3.5 h-3.5 shrink-0')}
                      {sh >= 2 && <span className="text-[8px] truncate max-w-full leading-tight">{entry.label}</span>}
                    </button>
                  ))}
                  {folderEntries.length > visibleLimit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFolderId(sc.id);
                      }}
                      className={`p-1.5 rounded-xl border flex items-center justify-center text-[10px] font-mono font-bold text-[var(--luma-accent)] cursor-pointer ${subBtnCls}`}
                    >
                      +{folderEntries.length - visibleLimit}
                    </button>
                  )}
                </div>

                {isResizing && (
                  <>
                    <div className="absolute top-1 right-1 z-20 px-1.5 py-0.5 rounded bg-[var(--luma-accent)] text-white text-[9px] font-mono font-bold">
                      {sw}×{sh}
                    </div>
                    <div
                      onPointerDown={(e) => startGridResizeDrag(e, 'folder', sc.id, sw, sh, 'both')}
                      title="Потяните за угол для изменения размера папки"
                      className="absolute -bottom-1.5 -right-1.5 z-30 w-5 h-5 rounded-full bg-[var(--luma-accent)] border-2 border-white text-white flex items-center justify-center cursor-nwse-resize shadow-xl"
                    >
                      <Maximize2 className="w-2.5 h-2.5" />
                    </div>
                  </>
                )}
              </div>
            );
          }

          // STANDARD 1x1 SHORTCUT OR 1x1 UNIVERSAL FOLDER
          const badge =
            sc.kind === 'url'
              ? 'URL'
              : sc.kind === 'command'
              ? 'SH'
              : sc.kind === 'note'
              ? 'TXT'
              : sc.kind === 'disk_folder'
              ? 'DIR'
              : sc.kind === 'file'
              ? 'FILE'
              : isFolder
              ? String(folderEntries.length)
              : '';

          return (
            <button
              key={sc.id}
              draggable={!isResizing}
              onDragStart={() => {
                if (!isResizing) setDraggingId({ kind: 'shortcut', id: sc.id });
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setHoveredCell(null);
                setDragOverFolderId(null);
              }}
              onDragOver={(e) => {
                if (!isFolder) return;
                e.preventDefault();
                e.stopPropagation();
                if ((draggingId?.kind === 'shortcut' && draggingId.id !== sc.id) || e.dataTransfer?.types?.includes('Files')) {
                  setDragOverFolderId(sc.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverFolderId === sc.id) setDragOverFolderId(null);
              }}
              onDrop={(e) => {
                if (!isFolder) return;
                e.preventDefault();
                e.stopPropagation();
                setDragOverFolderId(null);
                setHoveredCell(null);
                setExternalFileDrag(false);
                if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                  handleFilesAdded(e.dataTransfer.files, clampedCol, clampedRow, sc.id);
                  return;
                }
                if (draggingId?.kind === 'shortcut' && draggingId.id !== sc.id) {
                  moveShortcutIntoFolder(draggingId.id, sc.id);
                  setDraggingId(null);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                setCtxMenu(null);
                setShortcutCtxMenu(null);
                setWidgetCtxMenu(null);
                if (editMode) {
                  setSelectedId(sc.id);
                  return;
                }
                handleOpenShortcut(sc);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCtxMenu(null);
                setWidgetCtxMenu(null);
                setSelectedId(sc.id);
                const x = Math.min(e.clientX, window.innerWidth - 235);
                const y = Math.min(e.clientY, window.innerHeight - 250);
                setShortcutCtxMenu({ x: Math.max(12, x), y: Math.max(12, y), sc });
              }}
              style={{
                gridColumn: `${clampedCol} / span 1`,
                gridRow: `${clampedRow} / span 1`,
                zIndex: isResizing ? 28 : 6,
              }}
              title={
                isFolder
                  ? `${sc.label} (${folderEntries.length} эл. · ПКМ — размер и форма)`
                  : sc.target
                  ? `${sc.label}\n${sc.target}`
                  : sc.label
              }
              className={`group relative flex flex-col items-center justify-center gap-1 rounded-2xl p-1 transition cursor-pointer ${
                isDark ? 'hover:bg-white/[0.07] text-zinc-200' : 'hover:bg-zinc-900/[0.07] text-zinc-900'
              } ${
                isDropTarget || isResizing
                  ? 'ring-2 ring-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                  : isSelected && editMode
                  ? 'ring-2 ring-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                  : ''
              }`}
            >
              <div
                className={`relative w-10 h-10 ${isFolder && sc.shape ? folderShapeCls : isPixel ? 'rounded-full' : 'rounded-[14px]'} border flex items-center justify-center transition ${
                  isDark
                    ? 'bg-black/40 border-white/[0.12] group-hover:border-[var(--luma-accent-border)] text-zinc-100'
                    : 'bg-white/75 border-zinc-900/[0.15] group-hover:border-[var(--luma-accent-border)] text-zinc-900 shadow-xs'
                }`}
              >
                {isFolder && folderEntries.length > 0 ? (
                  <div className="grid grid-cols-2 gap-[2px] p-1.5">
                    {folderEntries.slice(0, 4).map((fe) => (
                      <span key={fe.id} className="flex items-center justify-center opacity-85">
                        {renderShortcutIcon(fe.icon, 'w-2.5 h-2.5')}
                      </span>
                    ))}
                  </div>
                ) : (
                  renderShortcutIcon(sc.icon, 'w-4 h-4')
                )}
                {badge && (
                  <span className="absolute -bottom-1 -right-1 px-1 py-[1px] rounded text-[7px] font-mono font-bold bg-[var(--luma-accent)] text-white leading-none">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">{sc.label}</span>

              {isResizing && (
                <div
                  onPointerDown={(e) => startGridResizeDrag(e, 'folder', sc.id, 1, 1, 'both')}
                  title="Потяните за угол для увеличения папки"
                  className="absolute -bottom-1 -right-1 z-30 w-4 h-4 rounded-full bg-[var(--luma-accent)] border-2 border-white text-white flex items-center justify-center cursor-nwse-resize shadow-xl"
                >
                  <Maximize2 className="w-2 h-2" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* WIDGET RIGHT-CLICK CONTEXT MENU (HUAWEI HARMONYOS RESIZE & SHAPE!) */}
      {widgetCtxMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ left: widgetCtxMenu.x, top: widgetCtxMenu.y }}
          className={`luma-animate-in fixed z-50 w-56 border p-1.5 shadow-2xl text-xs ${modalShellCls}`}
        >
          <div className={`px-2.5 py-1.5 border-b font-bold truncate flex items-center justify-between ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
            <span className="truncate">{widgetCtxMenu.w.title}</span>
            <span className="text-[10px] font-mono text-[var(--luma-accent)]">
              {widgetCtxMenu.w.w}×{widgetCtxMenu.w.h}
            </span>
          </div>
          <button
            onClick={() => {
              setResizingTarget({ kind: 'widget', id: widgetCtxMenu.w.id });
              setSelectedId(widgetCtxMenu.w.id);
              setWidgetCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            <span>Изменить размер и форму</span>
          </button>
          <button
            onClick={() => {
              setSelectedId(widgetCtxMenu.w.id);
              onSetEditMode(true);
              setWidgetCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Переместить по сетке</span>
          </button>
          <button
            onClick={() => {
              setPickerModal({ mode: 'widget', col: widgetCtxMenu.w.col, row: widgetCtxMenu.w.row });
              setWidgetCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Галерея виджетов...</span>
          </button>
          <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`} />
          <button
            onClick={() => {
              const id = widgetCtxMenu.w.id;
              setWidgets((prev) => prev.filter((x) => x.id !== id));
              if (resizingTarget?.id === id) setResizingTarget(null);
              setWidgetCtxMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-[var(--luma-accent)] hover:bg-[var(--luma-accent-soft)] font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить виджет</span>
          </button>
        </div>
      )}

      {/* SHORTCUT & FOLDER RIGHT-CLICK CONTEXT MENU */}
      {shortcutCtxMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ left: shortcutCtxMenu.x, top: shortcutCtxMenu.y }}
          className={`luma-animate-in fixed z-50 w-56 border p-1.5 shadow-2xl text-xs ${modalShellCls}`}
        >
          <div className={`px-2.5 py-1.5 border-b font-bold truncate ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
            {shortcutCtxMenu.sc.label}
          </div>
          <button
            onClick={() => {
              handleOpenShortcut(shortcutCtxMenu.sc);
              setShortcutCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            <span>Открыть</span>
          </button>

          {shortcutCtxMenu.sc.kind === 'folder' && (
            <>
              <button
                onClick={() => {
                  setResizingTarget({ kind: 'folder', id: shortcutCtxMenu.sc.id });
                  setSelectedId(shortcutCtxMenu.sc.id);
                  setShortcutCtxMenu(null);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                <span>Изменить размер и форму</span>
              </button>
              <button
                onClick={() => {
                  setOpenFolderId(shortcutCtxMenu.sc.id);
                  setRenamingFolderId(shortcutCtxMenu.sc.id);
                  setFolderRenameDraft(shortcutCtxMenu.sc.label);
                  setShortcutCtxMenu(null);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Переименовать папку</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              const sc = shortcutCtxMenu.sc;
              const matchedApp = sc.kind === 'app' ? apps.find((a) => a.id === sc.target) : undefined;
              onInspectProperties?.({
                label: sc.label,
                path: matchedApp?.url || sc.target,
                kind: sc.kind,
                app: matchedApp,
                onDelete: () => setShortcuts((prev) => prev.filter((x) => x.id !== sc.id)),
              });
              setShortcutCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Свойства</span>
          </button>
          <button
            onClick={() => {
              setSelectedId(shortcutCtxMenu.sc.id);
              onSetEditMode(true);
              setShortcutCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Переместить</span>
          </button>
          <button
            onClick={() => {
              const id = shortcutCtxMenu.sc.id;
              setShortcuts((prev) => prev.filter((x) => x.id !== id));
              if (resizingTarget?.id === id) setResizingTarget(null);
              setShortcutCtxMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-[var(--luma-accent)] hover:bg-[var(--luma-accent-soft)] font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить со стола</span>
          </button>
        </div>
      )}

      {/* HUAWEI HARMONYOS FLOATING RESIZE, SHAPE & VARIANT CONTROL BAR */}
      {(resizingWidget || resizingFolder) && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed ${taskbarPosition === 'bottom' ? 'bottom-16' : 'bottom-4'} left-1/2 -translate-x-1/2 z-50 max-w-[96vw] border p-3 shadow-2xl space-y-2.5 text-xs ${modalShellCls}`}
        >
          {/* Row 1: Title + Quick Sizes + W/H Steppers + Done */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono">
              <Maximize2 className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              <span className="font-bold truncate max-w-[160px]">
                {resizingWidget ? resizingWidget.title : resizingFolder?.label}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-bold text-[11px]">
                {resizingWidget ? `${resizingWidget.w}×${resizingWidget.h}` : `${resizingFolder?.w || 1}×${resizingFolder?.h || 1}`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
              {(resizingFolder
                ? [
                    [1, 1],
                    [2, 1],
                    [2, 2],
                    [3, 2],
                    [4, 2],
                  ]
                : [
                    [3, 1],
                    [3, 3],
                    [4, 2],
                    [5, 2],
                    [6, 2],
                    [5, 3],
                  ]
              ).map(([pw, ph]) => {
                const curW = resizingWidget ? resizingWidget.w : resizingFolder?.w || 1;
                const curH = resizingWidget ? resizingWidget.h : resizingFolder?.h || 1;
                const active = curW === pw && curH === ph;
                return (
                  <button
                    key={`${pw}x${ph}`}
                    onClick={() =>
                      resizingWidget
                        ? updateWidgetProps(resizingWidget.id, { w: pw, h: ph })
                        : resizingFolder && updateFolderProps(resizingFolder.id, { w: pw, h: ph })
                    }
                    className={`px-2 py-1 rounded-lg border cursor-pointer transition ${
                      active ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-bold' : subBtnCls
                    }`}
                  >
                    {pw}×{ph}
                  </button>
                );
              })}

              <span className="mx-0.5 opacity-30">|</span>
              <button
                onClick={() =>
                  resizingWidget
                    ? updateWidgetProps(resizingWidget.id, { w: resizingWidget.w - 1 })
                    : resizingFolder && updateFolderProps(resizingFolder.id, { w: (resizingFolder.w || 1) - 1 })
                }
                className={`px-1.5 py-1 rounded-lg border cursor-pointer ${subBtnCls}`}
              >
                W-
              </button>
              <button
                onClick={() =>
                  resizingWidget
                    ? updateWidgetProps(resizingWidget.id, { w: resizingWidget.w + 1 })
                    : resizingFolder && updateFolderProps(resizingFolder.id, { w: (resizingFolder.w || 1) + 1 })
                }
                className={`px-1.5 py-1 rounded-lg border cursor-pointer ${subBtnCls}`}
              >
                W+
              </button>
              <button
                onClick={() =>
                  resizingWidget
                    ? updateWidgetProps(resizingWidget.id, { h: resizingWidget.h - 1 })
                    : resizingFolder && updateFolderProps(resizingFolder.id, { h: (resizingFolder.h || 1) - 1 })
                }
                className={`px-1.5 py-1 rounded-lg border cursor-pointer ${subBtnCls}`}
              >
                H-
              </button>
              <button
                onClick={() =>
                  resizingWidget
                    ? updateWidgetProps(resizingWidget.id, { h: resizingWidget.h + 1 })
                    : resizingFolder && updateFolderProps(resizingFolder.id, { h: (resizingFolder.h || 1) + 1 })
                }
                className={`px-1.5 py-1 rounded-lg border cursor-pointer ${subBtnCls}`}
              >
                H+
              </button>

              <button
                onClick={() => setResizingTarget(null)}
                className="ml-1 px-3 py-1 rounded-lg bg-[var(--luma-accent)] text-white font-bold cursor-pointer"
              >
                Готово
              </button>
            </div>
          </div>

          {/* Row 2: 5 HarmonyOS Shapes + Widget Visual Variant Switcher */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-500/15">
            <span className={`text-[10px] font-mono uppercase ${mutedCls}`}>Форма:</span>
            <div className="flex flex-wrap gap-1">
              {SHAPE_OPTIONS.map((sh) => {
                const curShape = (resizingWidget ? resizingWidget.shape : resizingFolder?.shape) || 'squircle';
                const active = curShape === sh.id;
                return (
                  <button
                    key={sh.id}
                    onClick={() =>
                      resizingWidget
                        ? updateWidgetProps(resizingWidget.id, {
                            shape: sh.id,
                            ...(sh.id === 'circle' ? { w: 3, h: 3 } : {}),
                          })
                        : resizingFolder && updateFolderProps(resizingFolder.id, { shape: sh.id })
                    }
                    className={`px-2 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition ${
                      active ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-semibold' : subBtnCls
                    }`}
                  >
                    {sh.label}
                  </button>
                );
              })}
            </div>

            {resizingWidget && resizingWidgetDef && resizingWidgetDef.variants.length > 1 && (
              <>
                <span className={`text-[10px] font-mono uppercase ml-2 ${mutedCls}`}>Стиль:</span>
                <div className="flex flex-wrap gap-1">
                  {resizingWidgetDef.variants.map((v) => {
                    const active = (resizingWidget.variant || resizingWidgetDef.defaultVariant) === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() =>
                          updateWidgetProps(resizingWidget.id, {
                            variant: v.id,
                            shape: v.shape,
                            w: v.w,
                            h: v.h,
                          })
                        }
                        className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer transition ${
                          active ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-semibold' : subBtnCls
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* FLOATING EDIT-MODE TOOLBAR */}
      {editMode && !resizingTarget && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed ${taskbarPosition === 'bottom' ? 'bottom-16' : 'bottom-4'} left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-mono shadow-2xl ${modalShellCls}`}
        >
          <span className="inline-flex items-center gap-1.5 px-2 text-[11px] font-bold">
            <Move className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            СЕТКА {gridCols}×{totalRows} ({totalCells})
          </span>

          <button
            onClick={() => onSetGridCols(gridCols === 22 ? 20 : 22)}
            className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${subBtnCls}`}
          >
            {gridCols === 22 ? '20×10' : '22×10'}
          </button>

          {selectedId && (widgets.some((w) => w.id === selectedId) || shortcuts.some((s) => s.id === selectedId && s.kind === 'folder')) && (
            <>
              <button onClick={() => resizeSelectedWidget(-1, 0)} className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${subBtnCls}`}>
                W-
              </button>
              <button onClick={() => resizeSelectedWidget(1, 0)} className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${subBtnCls}`}>
                W+
              </button>
              <button onClick={() => resizeSelectedWidget(0, -1)} className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${subBtnCls}`}>
                H-
              </button>
              <button onClick={() => resizeSelectedWidget(0, 1)} className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${subBtnCls}`}>
                H+
              </button>
              <button
                onClick={() => {
                  const isW = widgets.some((w) => w.id === selectedId);
                  setResizingTarget({ kind: isW ? 'widget' : 'folder', id: selectedId });
                  onSetEditMode(false);
                }}
                className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${subBtnCls}`}
              >
                Форма
              </button>
            </>
          )}

          {selectedId && (
            <button
              onClick={removeSelected}
              className="px-2 py-1 rounded-lg bg-[var(--luma-accent-soft)] border border-[var(--luma-accent-border)] text-[var(--luma-accent)] text-[11px] font-bold cursor-pointer"
            >
              Убрать
            </button>
          )}

          <button
            onClick={() => setPickerModal({ mode: 'item', col: 2, row: 1 })}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 ${subBtnCls}`}
          >
            <FilePlus className="w-3 h-3" /> Файл / URL
          </button>

          <button
            onClick={() => setPickerModal({ mode: 'widget', col: 9, row: 3 })}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 ${subBtnCls}`}
          >
            <Plus className="w-3 h-3" /> Виджет
          </button>

          <button
            onClick={() => {
              setWidgets(DEFAULT_MINIMAL_WIDGETS);
              setShortcuts(DEFAULT_SHORTCUTS);
              setSelectedId(null);
            }}
            className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${subBtnCls}`}
            title="Вернуть чистый минимальный рабочий стол"
          >
            Сброс
          </button>

          <button
            onClick={() => {
              setSelectedId(null);
              onSetEditMode(false);
            }}
            className="px-3 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-[11px] font-bold cursor-pointer"
          >
            Готово
          </button>
        </div>
      )}

      {/* NATIVE DEX DESKTOP RIGHT-CLICK CONTEXT MENU */}
      {ctxMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          className={`luma-animate-in fixed z-50 w-64 border p-1.5 shadow-2xl text-xs ${modalShellCls}`}
        >
          <div className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
            Ячейка [{ctxMenu.col}, {ctxMenu.row}] · {gridCols}×{totalRows}
          </div>

          {[
            {
              label: 'Галерея виджетов (формы и стили)',
              icon: <Plus className="w-3.5 h-3.5 text-[var(--luma-accent)]" />,
              run: () => {
                setPickerModal({ mode: 'widget', col: ctxMenu.col, row: ctxMenu.row });
                setCtxMenu(null);
              },
            },
            {
              label: 'Создать универсальную папку',
              icon: <FolderPlus className="w-3.5 h-3.5 text-[var(--luma-accent)]" />,
              run: () => addFolderAt(ctxMenu.col, ctxMenu.row, true),
            },
            {
              label: 'Добавить файл / папку / URL...',
              icon: <FilePlus className="w-3.5 h-3.5" />,
              run: () => {
                setCustomLabel('');
                setCustomTarget('');
                setCustomNoteBody('');
                setPickerModal({ mode: 'item', col: ctxMenu.col, row: ctxMenu.row });
                setCtxMenu(null);
              },
            },
            {
              label: 'Добавить ярлык приложения',
              icon: <AppWindow className="w-3.5 h-3.5" />,
              run: () => {
                setPickerModal({ mode: 'app', col: ctxMenu.col, row: ctxMenu.row });
                setCtxMenu(null);
              },
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.run}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
              }`}
            >
              <span className={mutedCls}>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}

          <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`} />

          <button
            onClick={() => {
              onOpenSystemWindow('explorer');
              setCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <FolderOpen className={`w-3.5 h-3.5 ${mutedCls}`} />
            <span>Открыть Проводник</span>
          </button>

          <button
            onClick={() => {
              onOpenSystemWindow('taskmgr');
              setCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Cpu className={`w-3.5 h-3.5 ${mutedCls}`} />
            <span>Диспетчер задач</span>
          </button>

          <button
            onClick={() => {
              onToggleFullscreen();
              setCtxMenu(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <span className="flex items-center gap-2.5">
              {isFullscreen ? <Minimize className={`w-3.5 h-3.5 ${mutedCls}`} /> : <Maximize className={`w-3.5 h-3.5 ${mutedCls}`} />}
              <span>{isFullscreen ? 'Выйти из полного экрана' : 'Во весь экран (F11)'}</span>
            </span>
            <span className="text-[10px] font-mono text-[var(--luma-accent)]">{isFullscreen ? 'ВКЛ' : 'F11'}</span>
          </button>

          <button
            onClick={() => {
              onSetEditMode(!editMode);
              setCtxMenu(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Move className={`w-3.5 h-3.5 ${mutedCls}`} />
              <span>Режим расстановки</span>
            </span>
            <span className="text-[10px] font-mono text-[var(--luma-accent)]">{editMode ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>

          <button
            onClick={() => {
              const order: WallpaperStyle[] = ['dots', 'grid', 'matte'];
              onSetWallpaper(order[(order.indexOf(wallpaper) + 1) % order.length]);
              setCtxMenu(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Sliders className={`w-3.5 h-3.5 ${mutedCls}`} />
              <span>Текстура фона</span>
            </span>
            <span className="text-[10px] font-mono uppercase">
              {wallpaper === 'dots' ? 'Точки' : wallpaper === 'grid' ? 'Сетка' : 'Мат'}
            </span>
          </button>

          <button
            onClick={() => {
              const order: TaskbarPosition[] = ['bottom', 'left', 'top'];
              onSetTaskbarPosition(order[(order.indexOf(taskbarPosition) + 1) % order.length]);
              setCtxMenu(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutPanelLeft className={`w-3.5 h-3.5 ${mutedCls}`} />
              <span>Панель задач</span>
            </span>
            <span className="text-[10px] font-mono uppercase">
              {taskbarPosition === 'bottom' ? 'Снизу' : taskbarPosition === 'left' ? 'Слева' : 'Сверху'}
            </span>
          </button>

          <button
            onClick={() => {
              onSetDesignStyle(designStyle === 'nothing' ? 'pixelbook' : 'nothing');
              setCtxMenu(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Grid className={`w-3.5 h-3.5 ${mutedCls}`} />
              <span>Стиль оболочки</span>
            </span>
            <span className="text-[10px] font-mono uppercase text-[var(--luma-accent)]">
              {designStyle === 'nothing' ? 'Nothing' : 'Pixelbook'}
            </span>
          </button>

          <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`} />

          <button
            onClick={() => {
              setWidgets(DEFAULT_MINIMAL_WIDGETS);
              setShortcuts(DEFAULT_SHORTCUTS);
              setCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${mutedCls}`} />
            <span>Пресет: Чистый стол</span>
          </button>

          <button
            onClick={() => {
              setWidgets(DEFAULT_WORKSTATION_WIDGETS);
              setCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${mutedCls}`} />
            <span>Пресет: Станция</span>
          </button>

          <button
            onClick={() => {
              onOpenSystemWindow('settings');
              setCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${mutedCls}`} />
            <span>Настройки системы</span>
          </button>
        </div>
      )}

      {/* REDESIGNED 2-COLUMN WIDGET GALLERY MODAL */}
      {pickerModal?.mode === 'widget' && (
        <LumaWidgetGalleryModal
          col={pickerModal.col}
          row={pickerModal.row}
          isDark={isDark}
          modalShellCls={modalShellCls}
          subBtnCls={subBtnCls}
          mutedCls={mutedCls}
          onSelectVariant={(def, variant) => addWidgetVariantAt(def, variant, pickerModal.col, pickerModal.row)}
          onClose={() => setPickerModal(null)}
        />
      )}

      {/* APP / ANY FILE-FOLDER-URL-COMMAND-NOTE PICKER MODAL */}
      {pickerModal && pickerModal.mode !== 'widget' && (
        <div
          onClick={() => setPickerModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-2xl max-h-[82vh] border flex flex-col overflow-hidden ${modalShellCls}`}
          >
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
              <div>
                <h3 className="text-sm font-bold">
                  {pickerModal.mode === 'app'
                    ? 'Добавить ярлык приложения'
                    : 'Добавить на рабочий стол (Файл / Папка / URL / Команда / Заметка)'}
                </h3>
                <p className={`text-[11px] font-mono ${mutedCls}`}>
                  Позиция: [{pickerModal.col}, {pickerModal.row}] · Можно перетащить файлы прямо с ПК на стол или в папку
                </p>
              </div>
              <button onClick={() => setPickerModal(null)} className={`p-1.5 rounded-lg border cursor-pointer ${subBtnCls}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {pickerModal.mode === 'app' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {apps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => addAppShortcutAt(app, pickerModal.col, pickerModal.row)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition cursor-pointer ${subBtnCls}`}
                    >
                      {renderShortcutIcon(app.icon, 'w-4 h-4 shrink-0')}
                      <span className="text-xs font-semibold truncate">{app.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={pickingOsFile}
                      onClick={() => handlePickOsItem('file', pickerModal.col, pickerModal.row)}
                      className="p-3.5 rounded-xl bg-[var(--luma-accent)] text-white text-left flex items-center gap-3 cursor-pointer hover:opacity-95 transition"
                    >
                      <FilePlus className="w-5 h-5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold">Выбрать файл с компьютера</div>
                        <div className="text-[10px] opacity-85 truncate">Любой документ, EXE, фото, архив или скрипт</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={pickingOsFile}
                      onClick={() => handlePickOsItem('folder', pickerModal.col, pickerModal.row)}
                      className={`p-3.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition ${subBtnCls}`}
                    >
                      <FolderOpen className="w-5 h-5 text-[var(--luma-accent)] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold">Выбрать папку с компьютера</div>
                        <div className={`text-[10px] truncate ${mutedCls}`}>Открытие каталога в 1 клик</div>
                      </div>
                    </button>
                  </div>

                  <div className={`flex flex-wrap gap-1 p-1 rounded-xl border ${subBtnCls}`}>
                    {(
                      [
                        ['file', 'Файл (путь)'],
                        ['disk_folder', 'Папка (путь)'],
                        ['url', 'Сайт / URL'],
                        ['command', 'Команда терминала'],
                        ['note', 'Заметка'],
                      ] as const
                    ).map(([tk, tl]) => (
                      <button
                        key={tk}
                        type="button"
                        onClick={() => setCustomItemTab(tk)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                          customItemTab === tk ? 'bg-[var(--luma-accent)] text-white' : ''
                        }`}
                      >
                        {tl}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const lbl =
                        customLabel.trim() ||
                        (customTarget.trim().split(/[\\/]/).pop() || (customItemTab === 'note' ? 'Заметка' : 'Объект'));
                      if (customItemTab !== 'note' && !customTarget.trim()) return;
                      const icon =
                        customItemTab === 'disk_folder'
                          ? 'FolderOpen'
                          : customItemTab === 'url'
                          ? 'Globe'
                          : customItemTab === 'command'
                          ? 'Terminal'
                          : customItemTab === 'note'
                          ? 'StickyNote'
                          : inferFileIcon(customTarget.trim() || lbl);

                      addCustomDesktopItem(
                        {
                          kind: customItemTab,
                          label: lbl,
                          icon,
                          target: customTarget.trim(),
                          content: customItemTab === 'note' ? customNoteBody : undefined,
                        },
                        pickerModal.col,
                        pickerModal.row
                      );
                      setPickerModal(null);
                      onPushToast('Рабочий стол', `Добавлено: ${lbl}`, 'success');
                    }}
                    className="space-y-3"
                  >
                    <input
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="Название на рабочем столе (необязательно)"
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${subBtnCls}`}
                    />
                    {customItemTab !== 'note' ? (
                      <input
                        required
                        value={customTarget}
                        onChange={(e) => setCustomTarget(e.target.value)}
                        placeholder={
                          customItemTab === 'file'
                            ? 'C:\\Users\\Name\\Desktop\\file.pdf'
                            : customItemTab === 'disk_folder'
                            ? 'D:\\Projects'
                            : customItemTab === 'url'
                            ? 'https://github.com/Tveexty/L_H-3.0'
                            : 'neofetch или sh ipconfig'
                        }
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${subBtnCls}`}
                      />
                    ) : (
                      <textarea
                        rows={4}
                        value={customNoteBody}
                        onChange={(e) => setCustomNoteBody(e.target.value)}
                        placeholder="Текст заметки, команды, ссылки..."
                        className={`w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none ${subBtnCls}`}
                      />
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPickerModal(null)}
                        className={`px-3.5 py-1.5 rounded-xl border text-xs cursor-pointer ${subBtnCls}`}
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-semibold cursor-pointer"
                      >
                        Поместить на стол
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UNIVERSAL DESKTOP FOLDER POPUP (STORES APPS, FILES, FOLDERS, URLS, COMMANDS, NOTES, SYSTEM WINDOWS) */}
      {openFolder && (() => {
        const entries = resolveFolderEntries(openFolder, apps);
        return (
          <div
            onClick={() => {
              setOpenFolderId(null);
              setFolderAddOpen(false);
              setRenamingFolderId(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`luma-animate-in w-full max-w-xl max-h-[82vh] border p-4 flex flex-col gap-3 overflow-hidden ${modalShellCls}`}
            >
              {/* Folder Header with Inline Rename + Huawei Resize Trigger + Add Anything */}
              <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                {renamingFolderId === openFolder.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (folderRenameDraft.trim()) {
                        updateFolderProps(openFolder.id, { label: folderRenameDraft.trim() });
                      }
                      setRenamingFolderId(null);
                    }}
                    className="flex items-center gap-1.5 flex-1 min-w-0"
                  >
                    <input
                      autoFocus
                      value={folderRenameDraft}
                      onChange={(e) => setFolderRenameDraft(e.target.value)}
                      className={`flex-1 px-2.5 py-1 rounded-lg border text-sm font-bold outline-none ${subBtnCls}`}
                    />
                    <button type="submit" className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-xs font-bold cursor-pointer">
                      OK
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setRenamingFolderId(openFolder.id);
                      setFolderRenameDraft(openFolder.label);
                    }}
                    title="Нажмите, чтобы переименовать папку"
                    className="text-sm font-bold flex items-center gap-2 cursor-pointer hover:text-[var(--luma-accent)] transition min-w-0"
                  >
                    <Folder className="w-4 h-4 text-[var(--luma-accent)] shrink-0" />
                    <span className="truncate">{openFolder.label}</span>
                    <Pencil className="w-3 h-3 opacity-50 shrink-0" />
                  </button>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setResizingTarget({ kind: 'folder', id: openFolder.id });
                      setOpenFolderId(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${subBtnCls}`}
                  >
                    <Maximize2 className="w-3 h-3 text-[var(--luma-accent)]" />
                    Размер и форма
                  </button>
                  <button
                    onClick={() => setFolderAddOpen((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                      folderAddOpen ? 'bg-[var(--luma-accent)] text-white' : `border ${subBtnCls}`
                    }`}
                  >
                    <Plus className="w-3 h-3" /> Добавить
                  </button>
                  <button
                    onClick={() => {
                      setOpenFolderId(null);
                      setFolderAddOpen(false);
                    }}
                    className={`p-1 rounded-lg border cursor-pointer ${subBtnCls}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* "+ Add Anything to Folder" Drawer */}
              {folderAddOpen && (
                <div className={`p-3 rounded-xl border space-y-2.5 shrink-0 ${subBtnCls}`}>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        ['app', 'Приложение'],
                        ['file', 'Файл'],
                        ['disk_folder', 'Папка ПК'],
                        ['url', 'URL'],
                        ['command', 'Команда'],
                        ['note', 'Заметка'],
                        ['system', 'Окно Luma'],
                      ] as const
                    ).map(([tk, tl]) => (
                      <button
                        key={tk}
                        onClick={() => setFolderAddTab(tk)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          folderAddTab === tk ? 'bg-[var(--luma-accent)] text-white' : 'hover:bg-white/10'
                        }`}
                      >
                        {tl}
                      </button>
                    ))}
                  </div>

                  {folderAddTab === 'app' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                      {apps.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => {
                            appendEntriesToFolder(openFolder.id, [
                              {
                                id: `fe_${app.id}_${Date.now()}`,
                                kind: 'app',
                                label: app.name,
                                icon: app.icon,
                                target: app.id,
                              },
                            ]);
                            onPushToast(openFolder.label, `Добавлено: ${app.name}`, 'success');
                          }}
                          className={`p-2 rounded-lg border flex items-center gap-2 text-left text-xs cursor-pointer hover:border-[var(--luma-accent)] ${subBtnCls}`}
                        >
                          {renderShortcutIcon(app.icon, 'w-3.5 h-3.5 shrink-0')}
                          <span className="truncate">{app.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : folderAddTab === 'system' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {(
                        [
                          ['explorer', 'Проводник', 'FolderOpen'],
                          ['taskmgr', 'Диспетчер задач', 'Cpu'],
                          ['terminal', 'Терминал', 'Terminal'],
                          ['apps', 'Приложения', 'AppWindow'],
                          ['kernel', 'Ядро', 'Code2'],
                          ['settings', 'Настройки', 'Settings'],
                        ] as const
                      ).map(([target, label, icon]) => (
                        <button
                          key={target}
                          onClick={() => {
                            appendEntriesToFolder(openFolder.id, [
                              { id: `fe_sys_${target}_${Date.now()}`, kind: 'system', label, icon, target },
                            ]);
                            setFolderAddOpen(false);
                          }}
                          className={`p-2 rounded-lg border flex items-center gap-2 text-xs cursor-pointer hover:border-[var(--luma-accent)] ${subBtnCls}`}
                        >
                          {renderShortcutIcon(icon, 'w-3.5 h-3.5 text-[var(--luma-accent)]')}
                          <span className="truncate">{label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const lbl =
                          folderItemLabel.trim() ||
                          folderItemTarget.trim().split(/[\\/]/).pop() ||
                          (folderAddTab === 'note' ? 'Заметка' : 'Объект');
                        if (folderAddTab !== 'note' && !folderItemTarget.trim()) return;
                        const icon =
                          folderAddTab === 'disk_folder'
                            ? 'FolderOpen'
                            : folderAddTab === 'url'
                            ? 'Globe'
                            : folderAddTab === 'command'
                            ? 'Terminal'
                            : folderAddTab === 'note'
                            ? 'StickyNote'
                            : inferFileIcon(folderItemTarget || lbl);
                        appendEntriesToFolder(openFolder.id, [
                          {
                            id: `fe_${Date.now()}`,
                            kind: folderAddTab,
                            label: lbl,
                            icon,
                            target: folderItemTarget.trim(),
                            content: folderAddTab === 'note' ? folderItemNote : undefined,
                          },
                        ]);
                        setFolderItemLabel('');
                        setFolderItemTarget('');
                        setFolderItemNote('');
                        setFolderAddOpen(false);
                        onPushToast(openFolder.label, `Добавлено: ${lbl}`, 'success');
                      }}
                      className="space-y-2"
                    >
                      {(folderAddTab === 'file' || folderAddTab === 'disk_folder') && (
                        <button
                          type="button"
                          onClick={() =>
                            handlePickOsItem(
                              folderAddTab === 'disk_folder' ? 'folder' : 'file',
                              openFolder.col,
                              openFolder.row,
                              openFolder.id
                            )
                          }
                          className="w-full py-1.5 rounded-lg bg-[var(--luma-accent)] text-white text-xs font-semibold cursor-pointer"
                        >
                          {folderAddTab === 'disk_folder' ? 'Выбрать папку с ПК...' : 'Выбрать файл с ПК...'}
                        </button>
                      )}
                      <input
                        value={folderItemLabel}
                        onChange={(e) => setFolderItemLabel(e.target.value)}
                        placeholder="Название (необязательно)"
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none ${subBtnCls}`}
                      />
                      {folderAddTab !== 'note' ? (
                        <input
                          required
                          value={folderItemTarget}
                          onChange={(e) => setFolderItemTarget(e.target.value)}
                          placeholder={
                            folderAddTab === 'url'
                              ? 'https://...'
                              : folderAddTab === 'command'
                              ? 'Команда терминала'
                              : 'Путь на диске (C:\\...)'
                          }
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none ${subBtnCls}`}
                        />
                      ) : (
                        <textarea
                          rows={2}
                          value={folderItemNote}
                          onChange={(e) => setFolderItemNote(e.target.value)}
                          placeholder="Текст заметки..."
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none resize-none ${subBtnCls}`}
                        />
                      )}
                      <div className="flex justify-end">
                        <button type="submit" className="px-3 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-xs font-semibold cursor-pointer">
                          Добавить в папку
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Stored Items Grid */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {entries.length === 0 ? (
                  <div className={`py-10 text-center text-xs font-mono ${mutedCls}`}>
                    Папка пуста — нажмите «+ Добавить» или перетащите сюда любые ярлыки и файлы
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`group p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${subBtnCls} hover:border-[var(--luma-accent)]`}
                      >
                        <button
                          onClick={() => {
                            openAnyEntry(entry, openFolder.id);
                            if (entry.kind !== 'note') setOpenFolderId(null);
                          }}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          {renderShortcutIcon(entry.icon, 'w-4 h-4 shrink-0 text-[var(--luma-accent)]')}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{entry.label}</div>
                            <div className={`text-[9px] font-mono uppercase truncate ${mutedCls}`}>{entry.kind}</div>
                          </div>
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            onClick={() => extractFolderEntryToDesktop(openFolder.id, entry)}
                            title="Вынести на рабочий стол"
                            className="p-1 rounded hover:bg-white/10 cursor-pointer"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeEntryFromFolder(openFolder.id, entry.id)}
                            title="Убрать из папки"
                            className="p-1 rounded hover:bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`pt-2 border-t text-[10px] font-mono flex items-center justify-between ${isDark ? 'border-white/10' : 'border-zinc-900/10'} ${mutedCls}`}>
                <span>Хранит приложения, файлы, папки, ссылки, команды и заметки</span>
                <span>Элементов: {entries.length}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DESKTOP / FOLDER NOTE VIEWER & EDITOR */}
      {openNoteItem && (
        <div
          onClick={() => setOpenNoteItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-lg border p-4 space-y-3 ${modalShellCls}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {renderShortcutIcon(openNoteItem.icon, 'w-4 h-4 text-[var(--luma-accent)] shrink-0')}
                <span className="text-sm font-bold truncate">{openNoteItem.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {openNoteItem.target && (
                  <button
                    onClick={() => {
                      fetch('/api/kernel/open-path', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: openNoteItem.target }),
                      }).catch(() => {});
                    }}
                    title="Открыть в ОС"
                    className={`px-2 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1 cursor-pointer ${subBtnCls}`}
                  >
                    <ExternalLink className="w-3 h-3" /> ОС
                  </button>
                )}
                <button onClick={() => setOpenNoteItem(null)} className={`p-1 rounded-lg border cursor-pointer ${subBtnCls}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <textarea
              rows={9}
              value={openNoteItem.content || ''}
              onChange={(e) => {
                const val = e.target.value;
                setOpenNoteItem((prev) => (prev ? { ...prev, content: val } : null));
                if (openNoteItem.fromFolderId) {
                  setShortcuts((prev) =>
                    prev.map((s) => {
                      if (s.id !== openNoteItem.fromFolderId) return s;
                      const cur = resolveFolderEntries(s, apps);
                      return {
                        ...s,
                        folderItems: cur.map((x) => (x.id === openNoteItem.id ? { ...x, content: val } : x)),
                      };
                    })
                  );
                } else {
                  setShortcuts((prev) => prev.map((s) => (s.id === openNoteItem.id ? { ...s, content: val } : s)));
                }
              }}
              className={`w-full p-3 rounded-xl border text-xs font-mono outline-none resize-none leading-relaxed ${subBtnCls}`}
            />
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className={mutedCls}>Автосохранение активно</span>
              {!openNoteItem.fromFolderId && (
                <button
                  onClick={() => {
                    setShortcuts((prev) => prev.filter((s) => s.id !== openNoteItem.id));
                    setOpenNoteItem(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-bold cursor-pointer"
                >
                  Удалить со стола
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZABLE CURRENCY WIDGET MODAL + INSTANT CONVERTER */}
      {currencyConfigOpen && (
        <div
          onClick={() => setCurrencyConfigOpen(false)}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-lg border p-5 shadow-2xl space-y-4 ${modalShellCls}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-extrabold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--luma-accent)]" />
                  Настройка валют и конвертер
                </div>
                <div className={`text-[11px] font-mono ${mutedCls}`}>
                  {currencyLive ? `Живые курсы · обновлено ${currencyUpdatedAt}` : 'Автономные курсы (нажмите Обновить)'}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => void refreshCurrencyRates(currencyBase)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono cursor-pointer ${subBtnCls}`}
                >
                  Обновить
                </button>
                <button onClick={() => setCurrencyConfigOpen(false)} className={`p-1.5 rounded-lg border cursor-pointer ${subBtnCls}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Base Currency Selector */}
            <div className="space-y-1.5">
              <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                Базовая валюта (в чём показывать курсы)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['RUB', 'MDL', 'USD', 'EUR', 'RON', 'UAH', 'GBP', 'CNY', 'KZT', 'TRY', 'PLN', 'CHF', 'JPY'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrencyBase(c)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold cursor-pointer transition ${
                      currencyBase === c ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : subBtnCls
                    }`}
                  >
                    {c} {CURRENCY_SYMBOLS[c] || ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Tracked Currencies Toggle Grid */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                <span className={mutedCls}>Отслеживаемые валюты в виджете ({trackedCurrencies.length})</span>
                <span className="text-[var(--luma-accent)]">Выберите до 4-х</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {ALL_CURRENCIES.filter((c) => c !== currencyBase).map((sym) => {
                  const active = trackedCurrencies.includes(sym);
                  return (
                    <button
                      key={sym}
                      onClick={() => {
                        setTrackedCurrencies((prev) => {
                          if (prev.includes(sym)) {
                            return prev.length > 1 ? prev.filter((x) => x !== sym) : prev;
                          }
                          return [...prev, sym].slice(-4);
                        });
                      }}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-mono cursor-pointer transition ${
                        active ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-bold' : subBtnCls
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instant Currency Converter */}
            <div className={`p-3 rounded-xl border space-y-2 ${subBtnCls}`}>
              <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Быстрый конвертер</div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <input
                  type="number"
                  value={currencyConvertAmt}
                  onChange={(e) => setCurrencyConvertAmt(e.target.value)}
                  className={`w-24 px-2.5 py-1.5 rounded-lg border outline-none ${subBtnCls}`}
                />
                <select
                  value={currencyConvertFrom}
                  onChange={(e) => setCurrencyConvertFrom(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg border outline-none ${subBtnCls}`}
                >
                  {ALL_CURRENCIES.map((c) => (
                    <option key={c} value={c} className="bg-zinc-900 text-white">
                      {c}
                    </option>
                  ))}
                </select>
                <span className="opacity-60">=</span>
                <span className="text-sm font-black text-[var(--luma-accent)]">
                  {((parseFloat(currencyConvertAmt) || 0) * (currencyRates[currencyConvertFrom] || 1)).toLocaleString(locale, {
                    maximumFractionDigits: 2,
                  })}{' '}
                  {CURRENCY_SYMBOLS[currencyBase] || currencyBase}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
