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
  Search,
  Settings,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sliders,
  Snowflake,
  Sparkles,
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
import { AppItem, ClockStyleKey, InstalledAppInfo, IslandMediaPlayer, LiveSystemTelemetry, WirelessBatteryInfo } from '../data/launcherData';
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
import {
  computeCustomWidgetOutput,
  CustomUserWidgetSpec,
  CustomWidgetActionType,
  renderCustomLucideIcon,
} from './LumaCustomWidgetBuilder';
import { SmartContextMenu } from './SmartContextMenu';
import type { QuickLookCandidate } from './LumaQuickLookModal';

export { DESKTOP_WIDGET_CATALOG };
export type { WidgetShape };
export type DesktopGridCols = 22 | 20;
export type WallpaperStyle = 'dots' | 'grid' | 'matte';
export type WallpaperTransitionMode = 'iris' | 'bloom' | 'wipe' | 'morph';
export type LiveWallpaperId =
  | ''
  | 'lithium'
  | 'nebula'
  | 'solar'
  | 'beryllium'
  | 'borealis'
  | 'cybergrid'
  | 'boron'
  | 'cobalt'
  | 'carbon'
  | 'obsidian-gold'
  | 'nitrogen'
  | 'aurora-ice';

export type WidgetBgMode = 'theme' | 'glass' | 'dark' | 'light' | 'accent' | 'transparent' | 'custom';

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
  | 'taskmgr'
  | 'calculator'
  | 'calendar'
  | 'ai'
  | 'utilities'
  | 'security'
  | 'trash'
  | 'scenarios'
  | 'code_studio'
  | 'cut_studio'
  | 'office'
  | 'gamepad'
  | 'uninstaller';

export interface FolderEntry {
  id: string;
  kind: 'app' | 'file' | 'disk_folder' | 'url' | 'command' | 'note' | 'system';
  label: string;
  icon: string;
  iconUrl?: string;
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
  // Luma OS 1.4 Boron: per-widget transparency, background mode, custom color & blur
  bgMode?: WidgetBgMode;
  bgOpacity?: number; // 0..100
  bgCustomColor?: string; // #rrggbb
  bgBlur?: number; // 0 | 8 | 16 | 24
  // Luma OS 1.5 Carbon: custom user widget specification (image + JS script)
  customSpec?: CustomUserWidgetSpec;
}

export interface DesktopShortcut {
  id: string;
  kind: 'system' | 'app' | 'folder' | 'file' | 'disk_folder' | 'url' | 'command' | 'note';
  label: string;
  icon: string;
  iconUrl?: string;
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

const DESKTOP_STORAGE_KEY = 'luma_desktop_permanent_v1';
const LEGACY_DESKTOP_KEYS = ['luma_os_1_0_4_dex_desktop_v1', 'luma_os_1_0_2b_dex_desktop_v1'];

interface WeatherDailyPoint {
  date: string;
  dayShort: string;
  code: number;
  maxTemp: number;
  minTemp: number;
  precipProb: number;
}

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
  daily?: WeatherDailyPoint[];
}

function parseHexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#111827').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [17, 24, 39];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function computeWidgetSurfaceStyle(
  w: DesktopWidgetInstance,
  isDark: boolean,
  accentHex: string
): React.CSSProperties {
  const hasCustom =
    (w.bgMode && w.bgMode !== 'theme') ||
    typeof w.bgOpacity === 'number' ||
    typeof w.bgBlur === 'number';
  if (!hasCustom) return {};

  const mode: WidgetBgMode = w.bgMode || 'theme';
  const alpha = Math.max(0, Math.min(100, w.bgOpacity ?? 78)) / 100;
  const blurPx = w.bgBlur ?? (mode === 'transparent' ? 0 : 14);
  const style: React.CSSProperties = {
    backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
    WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
  };

  if (mode === 'transparent') {
    style.backgroundColor = 'rgba(0, 0, 0, 0)';
    style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.14)';
    style.boxShadow = 'none';
    return style;
  }
  if (mode === 'glass') {
    style.backgroundColor = isDark
      ? `rgba(18, 22, 34, ${(alpha * 0.62).toFixed(2)})`
      : `rgba(255, 255, 255, ${(alpha * 0.68).toFixed(2)})`;
    return style;
  }
  if (mode === 'dark') {
    style.backgroundColor = `rgba(9, 11, 18, ${alpha.toFixed(2)})`;
    style.color = '#f4f4f5';
    style.borderColor = 'rgba(255,255,255,0.14)';
    return style;
  }
  if (mode === 'light') {
    style.backgroundColor = `rgba(250, 251, 255, ${alpha.toFixed(2)})`;
    style.color = '#18181b';
    style.borderColor = 'rgba(24,24,27,0.16)';
    return style;
  }
  if (mode === 'accent') {
    const [r, g, b] = parseHexToRgb(accentHex || '#6366f1');
    style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.45).toFixed(2)})`;
    style.borderColor = `rgba(${r}, ${g}, ${b}, 0.55)`;
    return style;
  }
  if (mode === 'custom') {
    const [r, g, b] = parseHexToRgb(w.bgCustomColor || '#1e1b4b');
    style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    return style;
  }
  // mode === 'theme' with custom opacity/blur
  style.backgroundColor = isDark
    ? `rgba(15, 18, 26, ${alpha.toFixed(2)})`
    : `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
  return style;
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
  if (Array.isArray(sc.folderItems)) {
    return sc.folderItems.map((fe) => {
      if (fe.iconUrl || fe.kind !== 'app') return fe;
      const found = apps.find((a) => a.id === fe.target);
      return found?.iconUrl ? { ...fe, iconUrl: found.iconUrl } : fe;
    });
  }
  if (Array.isArray(sc.appIds) && sc.appIds.length > 0) {
    return sc.appIds
      .map((id) => apps.find((a) => a.id === id))
      .filter((a): a is AppItem => Boolean(a))
      .map((app) => ({
        id: `fe_${app.id}`,
        kind: 'app' as const,
        label: app.name,
        icon: app.icon,
        iconUrl: app.iconUrl,
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
  wallpaperTransition?: WallpaperTransitionMode;
  liveWallpaper?: LiveWallpaperId;
  aiEnabled?: boolean;
  iconSizePx?: number;
  onActivityPulse?: (title: string, detail?: string, icon?: string) => void;
  wirelessBatteries?: WirelessBatteryInfo[];
  onOpenSettingsTab?: (tab: string) => void;
  onTriggerEasterEgg?: () => void;
  deleteAnimStyle?: 'harmony7' | 'shrink' | 'evaporate';
  topBarOffsetPx?: number;
  onOpenCustomWidgetBuilder?: (editWidgetId?: string, spec?: CustomUserWidgetSpec) => void;
  pendingCustomWidget?: { seq: number; editWidgetId?: string; spec: CustomUserWidgetSpec } | null;
  onConsumePendingCustomWidget?: () => void;
  onQuickLook?: (items: QuickLookCandidate[], index: number) => void;
}

export const LumaDesktopCanvas: React.FC<LumaDesktopCanvasProps> = React.memo(({
  isDark,
  accentHex,
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
  wallpaperTransition = 'iris',
  liveWallpaper = '',
  aiEnabled = true,
  iconSizePx = 44,
  onActivityPulse,
  wirelessBatteries = [],
  onOpenSettingsTab,
  onTriggerEasterEgg,
  deleteAnimStyle = 'harmony7',
  topBarOffsetPx = 0,
  onOpenCustomWidgetBuilder,
  pendingCustomWidget = null,
  onConsumePendingCustomWidget,
  onQuickLook,
}) => {
  const totalRows = 10;
  const totalCells = gridCols * totalRows;
  const gridRef = useRef<HTMLDivElement>(null);

  // Instant Widget Settings Modal state (click any desktop widget → jump directly to its settings!)
  const [activeWidgetSettingsId, setActiveWidgetSettingsId] = useState<string | null>(null);

  // Daily Habit Streak widget state (persisted locally)
  const [habits, setHabits] = useState<{ id: string; text: string; done: boolean; streak: number }[]>(() => {
    try {
      const raw = localStorage.getItem('luma_habits_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [
      { id: 'h1', text: 'Глубокий фокус 45 мин', done: false, streak: 4 },
      { id: 'h2', text: 'Разминка и вода', done: true, streak: 7 },
      { id: 'h3', text: 'Код / Обучение', done: false, streak: 3 },
    ];
  });

  const toggleHabit = (id: string) => {
    setHabits((prev) => {
      const next = prev.map((h) =>
        h.id === id ? { ...h, done: !h.done, streak: !h.done ? h.streak + 1 : Math.max(0, h.streak - 1) } : h
      );
      try {
        localStorage.setItem('luma_habits_v1', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Smooth exit animation tracking for deleting widgets & desktop shortcuts
  const [deletingWidgetIds, setDeletingWidgetIds] = useState<Record<string, boolean>>({});
  const [deletingShortcutIds, setDeletingShortcutIds] = useState<Record<string, boolean>>({});

  // Installed Device Apps Picker Modal state
  const [installedModalOpen, setInstalledModalOpen] = useState<boolean>(false);
  const [installedApps, setInstalledApps] = useState<InstalledAppInfo[]>([]);
  const [installedLoading, setInstalledLoading] = useState<boolean>(false);
  const [installedQuery, setInstalledQuery] = useState<string>('');
  const [installedCat, setInstalledCat] = useState<string>('Все');
  const [selectedInstalled, setSelectedInstalled] = useState<string[]>([]);

  const readStoredDesktop = () => {
    try {
      const keys = [DESKTOP_STORAGE_KEY, ...LEGACY_DESKTOP_KEYS];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (Array.isArray(parsed.widgets) || Array.isArray(parsed.shortcuts))) {
            return parsed as { widgets?: DesktopWidgetInstance[]; shortcuts?: DesktopShortcut[] };
          }
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const [widgets, setWidgets] = useState<DesktopWidgetInstance[]>(() => {
    const stored = readStoredDesktop();
    return Array.isArray(stored?.widgets) ? stored.widgets : DEFAULT_MINIMAL_WIDGETS;
  });

  const [shortcuts, setShortcuts] = useState<DesktopShortcut[]>(() => {
    const stored = readStoredDesktop();
    return Array.isArray(stored?.shortcuts) ? stored.shortcuts : DEFAULT_SHORTCUTS;
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
  const [pomoDuration, setPomoDuration] = useState(25 * 60);
  const [pomoSec, setPomoSec] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoStopwatch, setPomoStopwatch] = useState(false);
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

  const pomoStopwatchRef = useRef(pomoStopwatch);
  pomoStopwatchRef.current = pomoStopwatch;
  const fetchedCityRef = useRef<string>('');
  const diskHydratedRef = useRef(false);

  // New 1.5.1 Widget interactive states (Mini AI 2.0 + Exact Battery/ScreenTime Analytics)
  const [miniAiInput, setMiniAiInput] = useState('');
  const [miniAiAnswer, setMiniAiAnswer] = useState('Готов помочь офлайн (Luma Lang 2.0 + Code 2.0)');
  const [miniAiBusy, setMiniAiBusy] = useState(false);
  const [batteryMini, setBatteryMini] = useState<{
    present: boolean;
    percent: number;
    charging: boolean;
    acOnline: boolean;
    statusText: string;
    health: number;
    cycles: number;
    cycleSupported: boolean;
    screenMin: number;
    days: { weekday: string; minutes: number }[];
  }>({
    present: false,
    percent: 100,
    charging: false,
    acOnline: true,
    statusText: 'Питание от сети',
    health: 100,
    cycles: 0,
    cycleSupported: false,
    screenMin: 1,
    days: [],
  });

  // Wallpaper transition state (keeps previous wallpaper underneath during animation!)
  const activeWpKey = liveWallpaper ? `live:${liveWallpaper}` : wallpaperImageUrl ? `img:${wallpaperImageUrl}` : '';
  const [prevWpKey, setPrevWpKey] = useState<string>('');
  const [wpAnimSeq, setWpAnimSeq] = useState<number>(0);
  const lastWpKeyRef = useRef<string>(activeWpKey);

  useEffect(() => {
    if (activeWpKey !== lastWpKeyRef.current) {
      setPrevWpKey(lastWpKeyRef.current);
      lastWpKeyRef.current = activeWpKey;
      setWpAnimSeq((n) => n + 1);
      const t = window.setTimeout(() => setPrevWpKey(''), 950);
      return () => window.clearTimeout(t);
    }
  }, [activeWpKey]);

  // Fetch battery & screen-on time summary for new widgets (low-frequency 120s + paused while hidden)
  useEffect(() => {
    const loadBatt = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetch('/api/kernel/battery/report')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.ok) {
            setBatteryMini({
              present: Boolean(d.details?.present),
              percent: d.details?.percent ?? 100,
              charging: Boolean(d.details?.charging),
              acOnline: Boolean(d.details?.ac_online),
              statusText: d.details?.status_text || 'Питание от сети',
              health: d.details?.health_percent ?? 100,
              cycles: d.details?.cycle_count ?? 0,
              cycleSupported: Boolean(d.details?.cycle_supported),
              screenMin: d.screen_time_today_min ?? 1,
              days: Array.isArray(d.screen_time_7d) ? d.screen_time_7d : [],
            });
          }
        })
        .catch(() => {});
    };
    loadBatt();
    const id = window.setInterval(loadBatt, 120000);
    return () => window.clearInterval(id);
  }, []);

  // Eternal Disk Hydration on mount (guarantees zero loss across exe upgrades / cache clears)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/kernel/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const layout = d?.state?.desktop_layout;
        const hasLocal = Boolean(localStorage.getItem(DESKTOP_STORAGE_KEY));
        if (layout && !hasLocal) {
          if (Array.isArray(layout.widgets) && layout.widgets.length > 0) setWidgets(layout.widgets);
          if (Array.isArray(layout.shortcuts) && layout.shortcuts.length > 0) setShortcuts(layout.shortcuts);
        } else if (layout && hasLocal) {
          // If disk layout is newer than local, restore it seamlessly
          try {
            const localParsed = JSON.parse(localStorage.getItem(DESKTOP_STORAGE_KEY) || '{}');
            if ((layout.updated_at || 0) > (localParsed.updated_at || 0)) {
              if (Array.isArray(layout.widgets)) setWidgets(layout.widgets);
              if (Array.isArray(layout.shortcuts)) setShortcuts(layout.shortcuts);
            }
          } catch {
            /* ignore */
          }
        }
        diskHydratedRef.current = true;
      })
      .catch(() => {
        diskHydratedRef.current = true;
      });

    const onRestoreBackup = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (detail?.widgets && Array.isArray(detail.widgets)) setWidgets(detail.widgets);
      if (detail?.shortcuts && Array.isArray(detail.shortcuts)) setShortcuts(detail.shortcuts);
    };
    window.addEventListener('luma-restore-desktop-layout', onRestoreBackup);
    return () => {
      cancelled = true;
      window.removeEventListener('luma-restore-desktop-layout', onRestoreBackup);
    };
  }, []);

  // Persist desktop layout to BOTH localStorage AND permanent disk store (%APPDATA%/LumaOS)
  useEffect(() => {
    const payload = { widgets, shortcuts, updated_at: Date.now() };
    try {
      localStorage.setItem(DESKTOP_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    if (!diskHydratedRef.current) return;
    const t = window.setTimeout(() => {
      fetch('/api/kernel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch: { desktop_layout: payload } }),
      }).catch(() => {});
    }, 450);
    return () => window.clearTimeout(t);
  }, [widgets, shortcuts]);

  const askMiniAi = async () => {
    const q = miniAiInput.trim();
    if (!q || miniAiBusy) return;
    setMiniAiBusy(true);
    try {
      const r = await fetch('/api/kernel/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'luma_local',
          model: 'luma-hybrid-2.0',
          include_context: true,
          messages: [{ role: 'user', content: q }],
        }),
      });
      const d = await r.json();
      setMiniAiAnswer(d?.reply || 'Нет ответа от Luma AI 2.0');
      setMiniAiInput('');
    } catch {
      setMiniAiAnswer('Ошибка связи с Luma AI 2.0');
    } finally {
      setMiniAiBusy(false);
    }
  };

  // Adaptive low-CPU clock tick: 1s ONLY when showSeconds is active; otherwise 15s (zero re-renders when hidden!)
  useEffect(() => {
    const tickMs = showSeconds ? 1000 : 15000;
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setNow(new Date());
    }, tickMs);
    return () => window.clearInterval(id);
  }, [showSeconds]);

  // Dedicated precise 1s Timer / Stopwatch tick whenever running (works reliably regardless of showSeconds!)
  useEffect(() => {
    if (!pomoRunning) return;
    const id = window.setInterval(() => {
      setPomoSec((s) => {
        if (pomoStopwatchRef.current) return s + 1;
        if (s <= 1) {
          setPomoRunning(false);
          onPushToast('Таймер Luma', 'Время фокуса вышло!', 'success');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomoRunning]);

  // Global widget appearance listener (from Settings -> Оформление -> Виджеты)
  useEffect(() => {
    const onGlobalStyle = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        bgMode?: WidgetBgMode;
        bgOpacity?: number;
        bgCustomColor?: string;
        bgBlur?: number;
        reset?: boolean;
      };
      if (!detail) return;
      setWidgets((prev) =>
        prev.map((item) =>
          detail.reset
            ? { ...item, bgMode: undefined, bgOpacity: undefined, bgCustomColor: undefined, bgBlur: undefined }
            : {
                ...item,
                ...(detail.bgMode !== undefined ? { bgMode: detail.bgMode } : {}),
                ...(detail.bgOpacity !== undefined ? { bgOpacity: detail.bgOpacity } : {}),
                ...(detail.bgCustomColor !== undefined ? { bgCustomColor: detail.bgCustomColor } : {}),
                ...(detail.bgBlur !== undefined ? { bgBlur: detail.bgBlur } : {}),
              }
        )
      );
    };
    window.addEventListener('luma-apply-widget-appearance', onGlobalStyle);
    return () => window.removeEventListener('luma-apply-widget-appearance', onGlobalStyle);
  }, []);

  // Live Open-Meteo weather (current + 7-day daily forecast)
  const fetchWeatherForCoords = async (lat: number, lon: number, city: string, country: string) => {
    setWeather((w) => ({ ...w, loading: true, city, country }));
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`
      );
      if (r.ok) {
        const d = await r.json();
        const cur = d.current || {};
        const dec = wmoToRu(Number(cur.weather_code ?? 1));
        const dailyRaw = d.daily || {};
        const times: string[] = Array.isArray(dailyRaw.time) ? dailyRaw.time : [];
        const codes: number[] = Array.isArray(dailyRaw.weather_code) ? dailyRaw.weather_code : [];
        const maxT: number[] = Array.isArray(dailyRaw.temperature_2m_max) ? dailyRaw.temperature_2m_max : [];
        const minT: number[] = Array.isArray(dailyRaw.temperature_2m_min) ? dailyRaw.temperature_2m_min : [];
        const prec: number[] = Array.isArray(dailyRaw.precipitation_probability_max) ? dailyRaw.precipitation_probability_max : [];
        const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const daily: WeatherDailyPoint[] = times.slice(0, 7).map((iso, i) => {
          const dt = new Date(`${iso}T12:00:00`);
          return {
            date: iso,
            dayShort: i === 0 ? 'Сег' : dayNames[dt.getDay()] || iso.slice(8, 10),
            code: Number(codes[i] ?? cur.weather_code ?? 1),
            maxTemp: Math.round(Number(maxT[i] ?? cur.temperature_2m ?? 0)),
            minTemp: Math.round(Number(minT[i] ?? Number(cur.temperature_2m ?? 0) - 4)),
            precipProb: Math.round(Number(prec[i] ?? 0)),
          };
        });
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
          daily,
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
        return;
      }
      if (e.key === ' ' && !e.ctrlKey && !e.altKey && !e.metaKey && onQuickLook && selectedId) {
        const tgt = e.target as HTMLElement | null;
        const tag = tgt?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tgt?.isContentEditable) return;
        const sc = shortcuts.find((s) => s.id === selectedId);
        if (sc && (sc.kind === 'file' || sc.kind === 'disk_folder') && sc.target) {
          e.preventDefault();
          const fileShortcuts = shortcuts.filter((s) => (s.kind === 'file' || s.kind === 'disk_folder') && s.target);
          const items: QuickLookCandidate[] = fileShortcuts.map((s) => ({
            path: s.target,
            name: s.label,
            isDir: s.kind === 'disk_folder',
          }));
          const idx = Math.max(0, fileShortcuts.findIndex((s) => s.id === sc.id));
          onQuickLook(items, idx);
        }
      }
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [editMode, onSetEditMode, onQuickLook, selectedId, shortcuts]);

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

  const animatedRemoveWidget = (id: string, label?: string) => {
    setDeletingWidgetIds((prev) => ({ ...prev, [id]: true }));
    if (resizingTarget?.id === id) setResizingTarget(null);
    onActivityPulse?.('Удалён виджет', label || 'Виджет убран с рабочего стола', 'trash');
    window.setTimeout(() => {
      setWidgets((prev) => prev.filter((w) => w.id !== id));
      setDeletingWidgetIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 300);
  };

  const animatedRemoveShortcut = (id: string, label?: string) => {
    setDeletingShortcutIds((prev) => ({ ...prev, [id]: true }));
    if (resizingTarget?.id === id) setResizingTarget(null);
    onActivityPulse?.('Удалён ярлык', label || 'Элемент убран со стола', 'trash');
    window.setTimeout(() => {
      setShortcuts((prev) => prev.filter((s) => s.id !== id));
      setDeletingShortcutIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 260);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const hitW = widgets.find((w) => w.id === selectedId);
    const hitS = shortcuts.find((s) => s.id === selectedId);
    if (hitW) animatedRemoveWidget(hitW.id, hitW.title);
    if (hitS) animatedRemoveShortcut(hitS.id, hitS.label);
    setSelectedId(null);
  };

  const loadInstalledDeviceApps = async (refresh = false) => {
    setInstalledLoading(true);
    try {
      const r = await fetch(`/api/kernel/installed-apps${refresh ? '?refresh=1' : ''}`);
      if (r.ok) {
        const d = await r.json();
        setInstalledApps(Array.isArray(d?.apps) ? d.apps : []);
      }
    } catch {
      onPushToast('Программы ПК', 'Не удалось получить список установленных программ', 'warning');
    } finally {
      setInstalledLoading(false);
    }
  };

  const openInstalledAppsModal = () => {
    setInstalledModalOpen(true);
    setInstalledQuery('');
    setInstalledCat('Все');
    setSelectedInstalled([]);
    setCtxMenu(null);
    if (installedApps.length === 0) {
      void loadInstalledDeviceApps(false);
    }
  };

  const placeInstalledAppsOnDesktop = (asFolder: boolean) => {
    const chosen = installedApps.filter((a) => selectedInstalled.includes(a.id));
    if (chosen.length === 0) {
      onPushToast('Программы ПК', 'Выберите хотя бы одно приложение', 'info');
      return;
    }

    // Build occupancy map for free cells on the 22x10 desktop grid
    const occupied = new Set<string>();
    widgets.forEach((w) => {
      for (let c = w.col; c < w.col + w.w; c++) {
        for (let r = w.row; r < w.row + w.h; r++) occupied.add(`${c}:${r}`);
      }
    });
    shortcuts.forEach((s) => {
      const sw = s.w || 1;
      const sh = s.h || 1;
      for (let c = s.col; c < s.col + sw; c++) {
        for (let r = s.row; r < s.row + sh; r++) occupied.add(`${c}:${r}`);
      }
    });

    const nextFreeCell = (): { col: number; row: number } => {
      for (let c = 1; c <= gridCols; c++) {
        for (let r = 1; r <= totalRows; r++) {
          if (!occupied.has(`${c}:${r}`)) {
            occupied.add(`${c}:${r}`);
            return { col: c, row: r };
          }
        }
      }
      return { col: 2, row: 1 };
    };

    if (asFolder) {
      const cell = nextFreeCell();
      const folderEntries: FolderEntry[] = chosen.map((app, i) => ({
        id: `fe_pc_${Date.now()}_${i}`,
        kind: 'file',
        label: app.name,
        icon: app.icon_hint || 'AppWindow',
        iconUrl: app.icon_url,
        target: app.exec_path,
      }));
      setShortcuts((prev) => [
        ...prev,
        {
          id: `sc_pcfolder_${Date.now()}`,
          kind: 'folder',
          label: `Программы ПК (${chosen.length})`,
          icon: 'Folder',
          target: '',
          folderItems: folderEntries,
          col: cell.col,
          row: cell.row,
          w: chosen.length >= 4 ? 2 : 1,
          h: chosen.length >= 4 ? 2 : 1,
          shape: 'squircle',
        },
      ]);
      onPushToast('Рабочий стол', `Папка с ${chosen.length} программами ПК добавлена`, 'success');
      onActivityPulse?.('Программы ПК добавлены', `Папка (${chosen.length} прил.)`, 'app');
    } else {
      const existingTargets = new Set(shortcuts.map((s) => s.target.toLowerCase()));
      const created: DesktopShortcut[] = [];
      chosen.forEach((app, idx) => {
        if (existingTargets.has(app.exec_path.toLowerCase())) return;
        const cell = nextFreeCell();
        created.push({
          id: `sc_pc_${Date.now()}_${idx}`,
          kind: 'file',
          label: app.name,
          icon: app.icon_hint || 'AppWindow',
          iconUrl: app.icon_url,
          target: app.exec_path,
          col: cell.col,
          row: cell.row,
        });
      });
      if (created.length > 0) {
        setShortcuts((prev) => [...prev, ...created]);
        onPushToast('Рабочий стол', `Добавлено программ ПК: ${created.length}`, 'success');
        onActivityPulse?.('Программы ПК на столе', `+${created.length} ярлыков`, 'app');
      } else {
        onPushToast('Рабочий стол', 'Выбранные программы уже размещены на рабочем столе', 'info');
      }
    }
    setInstalledModalOpen(false);
    setSelectedInstalled([]);
  };

  const lastCustomSeqRef = useRef<number>(0);
  useEffect(() => {
    if (!pendingCustomWidget || pendingCustomWidget.seq === lastCustomSeqRef.current) return;
    lastCustomSeqRef.current = pendingCustomWidget.seq;
    const { spec, editWidgetId } = pendingCustomWidget;
    const gw = Math.max(2, Math.min(8, spec.w * 2));
    const gh = Math.max(1, Math.min(5, spec.h + 1));
    if (editWidgetId) {
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === editWidgetId
            ? { ...w, title: spec.title, w: gw, h: gh, customSpec: spec }
            : w
        )
      );
      onPushToast('Свой виджет обновлён', `Виджет «${spec.title}» сохранён`, 'success');
    } else {
      setWidgets((prev) => [
        ...prev,
        {
          id: `w_custom_${Date.now()}`,
          widgetType: 'luma_custom_widget',
          title: spec.title,
          group: 'Инструменты',
          col: 9,
          row: 1,
          w: gw,
          h: gh,
          shape: 'squircle',
          variant: 'custom_studio',
          customSpec: spec,
        },
      ]);
      onPushToast('Рабочий стол', `Добавлен свой виджет «${spec.title}»`, 'success');
    }
    onConsumePendingCustomWidget?.();
  }, [pendingCustomWidget, onConsumePendingCustomWidget, onPushToast]);

  const runSingleCustomAction = (actionType?: CustomWidgetActionType, target?: string, args?: string, openInNewTab = true) => {
    if (!actionType || actionType === 'none') return;
    const t = (target || '').trim();
    switch (actionType) {
      case 'launch_pc_app': {
        if (!t) return;
        const foundApp = apps.find((a) => a.id === t || a.name.toLowerCase() === t.toLowerCase() || a.url === t);
        if (foundApp) {
          onLaunchApp(foundApp);
          return;
        }
        fetch('/api/kernel/apps/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exec_path: t, name: t, args: args || '' }),
        }).catch(() => {});
        onPushToast('Запуск приложения', `Открываю: ${t}`, 'success');
        break;
      }
      case 'open_luma_app': {
        if (!t) return;
        onOpenSystemWindow(t as DesktopSystemWinId);
        break;
      }
      case 'open_url': {
        if (!t) return;
        const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
        if (openInNewTab) window.open(url, '_blank', 'noopener,noreferrer');
        else window.location.href = url;
        break;
      }
      case 'open_folder': {
        if (!t) return;
        fetch('/api/kernel/open-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: t }),
        }).catch(() => {});
        onPushToast('Открыто', t, 'info');
        break;
      }
      case 'run_terminal': {
        if (!t) return;
        onRunTerminalCommand(t);
        break;
      }
      case 'media_control': {
        if (t === 'next') onNextTrack();
        else if (t === 'prev') onPrevTrack();
        else onToggleMediaPlay();
        break;
      }
      case 'copy_text': {
        if (t) navigator.clipboard?.writeText(t).catch(() => {});
        onPushToast('Буфер обмена', 'Текст скопирован', 'success');
        break;
      }
      case 'show_toast': {
        onPushToast('Виджет Luma', t || 'Действие выполнено', 'info');
        break;
      }
      case 'run_js': {
        if (!t) return;
        try {
          // eslint-disable-next-line no-new-func
          new Function('toast', t)((msg: string) => onPushToast('JS-виджет', String(msg), 'info'));
        } catch (err) {
          onPushToast('Ошибка JS', err instanceof Error ? err.message : String(err), 'warning');
        }
        break;
      }
      case 'system_action': {
        if (t === 'toggle_theme') onToggleTheme();
        else if (t === 'toggle_dnd') onToggleDnd();
        else if (t === 'toggle_mute') onToggleMute();
        else if (t === 'lock_screen') onPowerAction('lock');
        else if (t === 'sleep_pc') onPowerAction('sleep');
        else if (t === 'screenshot') {
          fetch('/api/kernel/capture/screenshot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
          onPushToast('Скриншот', 'Снимок экрана сохранён', 'success');
        } else if (t === 'volume_up' || t === 'volume_down') {
          const nextVol = Math.max(0, Math.min(100, volume + (t === 'volume_up' ? 10 : -10)));
          fetch('/api/kernel/audio/volume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ volume: nextVol }) }).catch(() => {});
        } else if (t === 'power_performance' || t === 'power_saver') {
          fetch('/api/kernel/power/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: t === 'power_performance' ? 'performance' : 'powersaver' }) }).catch(() => {});
          onPushToast('План питания', t === 'power_performance' ? 'Максимум производительности' : 'Энергосбережение', 'success');
        } else if (t === 'clean_temp') {
          fetch('/api/kernel/optimize', { method: 'POST' }).catch(() => {});
          onPushToast('Оптимизация', 'Память и кэш очищены', 'success');
        } else if (t === 'toggle_gaming') {
          window.dispatchEvent(new CustomEvent('luma-custom-sys-action', { detail: { action: t } }));
          onPushToast('Игровой режим', 'Переключено', 'success');
        } else {
          window.dispatchEvent(new CustomEvent('luma-custom-sys-action', { detail: { action: t } }));
        }
        break;
      }
    }
  };

  const executeCustomSpecClick = (spec?: CustomUserWidgetSpec, isDouble = false) => {
    if (!spec) return false;
    if (isDouble && spec.doubleClickActionType && spec.doubleClickActionType !== 'none') {
      runSingleCustomAction(spec.doubleClickActionType, spec.doubleClickTarget, spec.doubleClickArgs, spec.openInNewTab ?? true);
      return true;
    }
    const hasPrimary = spec.clickActionType && spec.clickActionType !== 'none';
    const hasChain = Array.isArray(spec.chainedActions) && spec.chainedActions.length > 0;
    if (!hasPrimary && !hasChain) return false;
    if (spec.clickConfirm && !window.confirm(`Выполнить действие виджета «${spec.title}»?`)) return true;
    if (hasPrimary) {
      runSingleCustomAction(spec.clickActionType, spec.clickTarget, spec.clickArgs, spec.openInNewTab ?? true);
    }
    if (hasChain) {
      spec.chainedActions!.forEach((st, idx) => {
        window.setTimeout(() => runSingleCustomAction(st.actionType, st.target, st.args, spec.openInNewTab ?? true), idx * 140);
      });
    }
    return true;
  };

  const addWidgetVariantAt = (def: WidgetCatalogDef, variant: WidgetVariantDef, col: number, row: number) => {
    const actualType = variant.targetWidgetType || def.type;
    if (actualType === 'luma_custom_widget' && onOpenCustomWidgetBuilder) {
      setPickerModal(null);
      onOpenCustomWidgetBuilder();
      return;
    }
    const id = `w_${actualType}_${Date.now()}`;
    const c = Math.max(1, Math.min(gridCols - variant.w + 1, col));
    const r = Math.max(1, Math.min(totalRows - variant.h + 1, row));
    setWidgets((prev) => [
      ...prev,
      {
        id,
        widgetType: actualType,
        title: variant.targetWidgetType ? variant.label : def.title,
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
        const hrs = Math.floor(pomoSec / 3600);
        const mm = String(Math.floor((pomoSec % 3600) / 60)).padStart(2, '0');
        const ss = String(pomoSec % 60).padStart(2, '0');
        const pct = pomoStopwatch
          ? (pomoSec % 60) / 60
          : pomoDuration > 0
          ? Math.max(0, Math.min(1, pomoSec / pomoDuration))
          : 0;

        if (variant === 'circle_dial' || isCircle) {
          const circ = 2 * Math.PI * 40;
          return (
            <div className="h-full w-full flex items-center justify-center relative overflow-hidden p-1">
              <svg viewBox="0 0 100 100" className="w-full h-full max-w-[148px] max-h-[148px] -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="5.5" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--luma-accent)"
                  strokeWidth="5.5"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct)}
                  strokeLinecap="round"
                  className="transition-[stroke-dashoffset] duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 font-mono px-2">
                <div className="flex items-baseline justify-center whitespace-nowrap tabular-nums leading-none">
                  {hrs > 0 && <span className="text-[11px] font-bold opacity-70 mr-0.5">{hrs}:</span>}
                  <span className="text-[17px] font-black tracking-tight">{mm}</span>
                  <span className={`text-[15px] font-black mx-[1px] ${pomoRunning ? 'animate-pulse text-[var(--luma-accent)]' : 'opacity-60'}`}>:</span>
                  <span className="text-[17px] font-black tracking-tight text-[var(--luma-accent)]">{ss}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPomoRunning((v) => !v);
                    }}
                    className="px-2 py-0.5 rounded-full bg-[var(--luma-accent)] text-white text-[9px] font-bold cursor-pointer"
                  >
                    {pomoRunning ? 'СТОП' : 'СТАРТ'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPomoRunning(false);
                      setPomoSec(pomoStopwatch ? 0 : pomoDuration);
                    }}
                    title="Сброс"
                    className={`p-0.5 rounded-full border cursor-pointer ${subBtnCls}`}
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        }

        const presets = [5, 15, 25, 45];
        return (
          <div className="h-full w-full flex flex-col justify-between gap-1 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono uppercase tracking-[0.12em]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextSw = !pomoStopwatch;
                  setPomoStopwatch(nextSw);
                  setPomoRunning(false);
                  setPomoSec(nextSw ? 0 : pomoDuration);
                }}
                title="Переключить: Таймер / Секундомер"
                className={`inline-flex items-center gap-1 cursor-pointer hover:text-[var(--luma-accent)] transition ${mutedCls}`}
              >
                <Timer className="w-3 h-3 text-[var(--luma-accent)] shrink-0" />
                <span className="truncate">{pomoStopwatch ? 'СЕКУНДОМЕР' : 'ТАЙМЕР'}</span>
              </button>
              <span className={`shrink-0 font-bold ${pomoRunning ? 'text-[var(--luma-accent)]' : mutedCls}`}>
                {pomoRunning ? '● ИДЁТ' : 'ПАУЗА'}
              </span>
            </div>

            {/* Crisp non-clipping MM:SS readout with explicit seconds emphasis */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-baseline whitespace-nowrap font-mono font-black tabular-nums leading-none shrink-0" style={{ fontSize: 'clamp(1.25rem, 2.1vw, 1.85rem)' }}>
                {hrs > 0 && <span className="opacity-70 text-[0.65em] mr-0.5">{hrs}:</span>}
                <span>{mm}</span>
                <span className={`mx-[1px] ${pomoRunning ? 'animate-pulse text-[var(--luma-accent)]' : 'opacity-50'}`}>:</span>
                <span className="text-[var(--luma-accent)]">{ss}</span>
                <span className={`ml-1 text-[9px] font-mono uppercase font-semibold ${mutedCls}`}>сек</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPomoRunning((v) => !v);
                  }}
                  className="px-2 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-[10px] font-mono font-bold cursor-pointer hover:opacity-90 transition"
                >
                  {pomoRunning ? 'СТОП' : 'СТАРТ'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPomoRunning(false);
                    setPomoSec(pomoStopwatch ? 0 : pomoDuration);
                  }}
                  title="Сброс"
                  className={`p-1 rounded-lg border cursor-pointer ${subBtnCls}`}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Progress bar + quick duration presets */}
            <div className="space-y-1">
              <div className={`w-full h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-zinc-900/10'}`}>
                <div
                  className="h-full rounded-full bg-[var(--luma-accent)] transition-all duration-300"
                  style={{ width: `${Math.round(pct * 100)}%` }}
                />
              </div>
              {!pomoStopwatch && (
                <div className="flex items-center gap-1">
                  {presets.map((m) => {
                    const active = pomoDuration === m * 60;
                    return (
                      <button
                        key={m}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPomoRunning(false);
                          setPomoDuration(m * 60);
                          setPomoSec(m * 60);
                        }}
                        className={`flex-1 py-0.5 rounded-md text-[9px] font-mono font-bold transition cursor-pointer ${
                          active
                            ? 'bg-[var(--luma-accent)] text-white'
                            : isDark
                            ? 'bg-white/8 text-zinc-300 hover:bg-white/15'
                            : 'bg-zinc-900/8 text-zinc-700 hover:bg-zinc-900/15'
                        }`}
                      >
                        {m}м
                      </button>
                    );
                  })}
                </div>
              )}
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

      case 'luma_battery_pro': {
        const hasBatt = batteryMini.present || Boolean(liveSystem?.battery_present);
        const battPct = hasBatt ? (liveSystem?.battery_present ? liveSystem.battery_percent : batteryMini.percent) : 100;
        const charging = hasBatt ? (batteryMini.charging || Boolean(liveSystem?.battery_charging)) : false;
        const statusShort = !hasBatt
          ? 'ОТ СЕТИ (ПК)'
          : charging
          ? 'ЗАРЯДКА'
          : batteryMini.acOnline && battPct >= 99
          ? 'ЗАРЯЖЕНО'
          : batteryMini.acOnline
          ? 'ОТ СЕТИ'
          : 'ОТ БАТАРЕИ';
        return (
          <div className="h-full flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <BatteryCharging className="w-3.5 h-3.5" />
                БАТАРЕЯ PRO
              </span>
              <span className={charging ? 'text-emerald-400 font-bold' : mutedCls}>{statusShort}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-mono font-black tabular-nums">{hasBatt ? `${battPct}%` : 'AC'}</div>
              <div className="text-right font-mono text-[10px]">
                <div className="text-emerald-400 font-bold">
                  {hasBatt ? `Здоровье ${batteryMini.health}%` : 'Питание 220V'}
                </div>
                <div className={mutedCls}>
                  {hasBatt
                    ? batteryMini.cycleSupported || batteryMini.cycles > 0
                      ? `Циклов: ${batteryMini.cycles}`
                      : batteryMini.statusText
                    : 'Стационарный ПК'}
                </div>
              </div>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${railTrackCls}`}>
              <div
                style={{ width: `${Math.min(100, battPct)}%` }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
              />
            </div>
          </div>
        );
      }

      case 'luma_power_ecosystem': {
        const hasBatt = batteryMini.present || Boolean(liveSystem?.battery_present);
        const battPct = hasBatt ? (liveSystem?.battery_present ? liveSystem.battery_percent : batteryMini.percent) : 100;
        const charging = hasBatt ? (batteryMini.charging || Boolean(liveSystem?.battery_charging)) : false;
        const devs = Array.isArray(wirelessBatteries) ? wirelessBatteries : [];
        return (
          <div className="h-full flex flex-col justify-between gap-2 overflow-hidden">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] shrink-0">
              <span className="inline-flex items-center gap-1 text-cyan-400 font-bold">
                <BatteryCharging className="w-3.5 h-3.5" />
                ЭНЕРГИЯ СИСТЕМЫ И ПЕРИФЕРИИ
              </span>
              <span className={mutedCls}>{devs.length + 1} устр.</span>
            </div>

            {/* Main Device Card */}
            <div className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 shrink-0 ${subBtnCls}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">
                    {hasBatt ? 'Основное устройство (АКБ)' : 'ПК (Питание от сети AC)'}
                  </div>
                  <div className={`text-[9px] font-mono ${mutedCls}`}>
                    {hasBatt ? (charging ? 'Заряжается' : `Здоровье ${batteryMini.health}%`) : 'Стационарный 220V'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-14 h-1.5 rounded-full overflow-hidden ${railTrackCls}`}>
                  <div
                    style={{ width: `${Math.min(100, battPct)}%` }}
                    className={`h-full rounded-full ${battPct <= 20 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                  />
                </div>
                <span className="text-xs font-mono font-black tabular-nums">{hasBatt ? `${battPct}%` : 'AC'}</span>
              </div>
            </div>

            {/* Connected Wireless Peripherals */}
            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 content-start">
              {devs.length === 0 ? (
                <div className={`col-span-full text-[10px] font-mono py-2 text-center ${mutedCls}`}>
                  Подключите мышь (IO / Ajazz / Ardor), клавиатуру или наушники по BT / 2.4GHz
                </div>
              ) : (
                devs.slice(0, 6).map((d, i) => {
                  const pct = d.battery_percent;
                  const typeLabel =
                    d.device_type === 'mouse'
                      ? '🖱 Мышь'
                      : d.device_type === 'keyboard'
                      ? '⌨ Клав.'
                      : d.device_type === 'headphones'
                      ? '🎧 Аудио'
                      : d.device_type === 'gamepad'
                      ? '🎮 Геймпад'
                      : '📡 BT/2.4G';
                  return (
                    <div key={`${d.name}_${i}`} className={`px-2 py-1.5 rounded-xl border flex flex-col gap-1 ${subBtnCls}`}>
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-semibold truncate">{d.name}</span>
                        <span
                          className={`font-mono font-bold shrink-0 ${
                            pct >= 0
                              ? pct <= 20
                                ? 'text-rose-400'
                                : 'text-emerald-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          {pct >= 0 ? `${pct}%` : 'Подкл.'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-[9px] truncate ${mutedCls}`}>
                          {typeLabel} · {d.transport || '2.4G'}
                        </span>
                        {pct >= 0 && (
                          <div className={`w-10 h-1 rounded-full overflow-hidden shrink-0 ${railTrackCls}`}>
                            <div
                              style={{ width: `${Math.min(100, pct)}%` }}
                              className={`h-full rounded-full ${pct <= 20 ? 'bg-rose-500' : 'bg-cyan-400'}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      }

      case 'luma_custom_widget': {
        const spec = w.customSpec;
        const hhmm = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        const out = computeCustomWidgetOutput(spec, {
          telemetry: {
            cpu_percent: liveSystem?.cpu_percent,
            ram_percent: liveSystem?.ram_percent,
            ram_used_gb: liveSystem?.ram_used_gb,
            ram_total_gb: liveSystem?.ram_total_gb,
            gpu_percent: liveSystem?.gpu_percent,
            gpu_temp_c: liveSystem?.gpu_temp_c,
            battery_pct: liveSystem?.battery_percent,
            battery_charging: liveSystem?.battery_charging,
          },
          wireless: wirelessBatteries.map((d) => ({
            name: d.name,
            battery_percent: d.battery_percent,
            device_type: d.device_type,
            transport: d.transport,
          })),
          time: {
            hhmm,
            seconds: String(now.getSeconds()).padStart(2, '0'),
            dateStr: now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
            hour: now.getHours(),
          },
          weather: { temp: weather.temp, desc: weather.label, city: weather.city },
        });
        const isAlert =
          spec?.alertEnabled &&
          typeof out.numericValue === 'number' &&
          ((spec.alertCondition === 'lt' && out.numericValue < (spec.alertThreshold ?? 20)) ||
            (spec.alertCondition !== 'lt' && out.numericValue > (spec.alertThreshold ?? 85)));
        const accent = isAlert ? spec?.alertColor || '#f43f5e' : spec?.accentColor || accentHex || '#22d3ee';
        const bgMode = spec?.bgMode || (spec?.bgImage ? 'image' : 'glass');
        const bgStyle: React.CSSProperties = {
          padding: `${spec?.padding ?? 14}px`,
          fontFamily: spec?.fontFamily === 'mono' ? 'ui-monospace, monospace' : spec?.fontFamily === 'serif' ? 'Georgia, serif' : undefined,
          background:
            bgMode === 'gradient'
              ? `linear-gradient(${spec?.bgGradientAngle ?? 135}deg, ${spec?.bgGradientFrom || '#0ea5e9'}, ${spec?.bgGradientTo || '#6366f1'})`
              : bgMode === 'animated_mesh'
              ? `radial-gradient(circle at 15% 20%, ${spec?.bgGradientFrom || '#0ea5e9'}cc, transparent 55%), radial-gradient(circle at 85% 80%, ${spec?.bgGradientTo || '#a855f7'}cc, #0b0f1a 70%)`
              : bgMode === 'transparent'
              ? 'transparent'
              : bgMode === 'solid'
              ? spec?.bgColor || '#0f131c'
              : `rgba(15,18,26,${(spec?.bgOpacity ?? 80) / 100})`,
          boxShadow: spec?.glowRadius ? `inset 0 0 ${spec.glowRadius}px ${spec.glowColor || accent}55` : undefined,
        };
        return (
          <div
            onDoubleClick={(e) => {
              if (!editMode && executeCustomSpecClick(spec, true)) {
                e.stopPropagation();
              }
            }}
            className={`relative h-full w-full overflow-hidden text-white flex flex-col justify-between ${
              isAlert && spec?.alertPulse ? 'animate-pulse' : ''
            }`}
            style={bgStyle}
          >
            {bgMode === 'image' && spec?.bgImage && (
              <img
                src={spec.bgImage}
                alt=""
                className="pointer-events-none absolute inset-0 w-full h-full"
                style={{
                  objectFit: spec.bgFit || 'cover',
                  objectPosition: `${spec.bgPosX ?? 50}% ${spec.bgPosY ?? 50}%`,
                  transform: spec.bgZoom && spec.bgZoom !== 100 ? `scale(${spec.bgZoom / 100})` : undefined,
                  opacity: (spec.bgOpacity ?? 80) / 100,
                  filter: `blur(${(spec.bgBlur || 0) * 0.35}px) brightness(${spec.bgBrightness ?? 100}%) contrast(${spec.bgContrast ?? 100}%) saturate(${spec.bgSaturate ?? 110}%) grayscale(${spec.bgGrayscale ?? 0}%)`,
                }}
              />
            )}
            {(spec?.imageOverlayGradient || 'dark') !== 'none' && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    spec?.imageOverlayGradient === 'bottom'
                      ? 'linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0.12) 55%, transparent)'
                      : spec?.imageOverlayGradient === 'soft'
                      ? 'linear-gradient(135deg, rgba(0,0,0,0.28), rgba(0,0,0,0.45))'
                      : 'linear-gradient(135deg, rgba(0,0,0,0.52), rgba(0,0,0,0.32), rgba(0,0,0,0.68))',
                }}
              />
            )}

            <div
              className={`relative z-10 flex flex-col h-full justify-between gap-1.5 ${
                spec?.contentAlign === 'center' ? 'items-center text-center' : spec?.contentAlign === 'right' ? 'items-end text-right' : 'items-start text-left'
              }`}
              style={{ textShadow: (spec?.textShadow ?? true) ? '0 1px 8px rgba(0,0,0,0.6)' : undefined }}
            >
              {(spec?.showHeader ?? true) && (
                <div className="w-full flex items-center justify-between gap-1.5">
                  <span
                    className={`truncate ${(spec?.titleUppercase ?? true) ? 'uppercase' : ''}`}
                    style={{
                      fontSize: `${spec?.titleSize ?? 10}px`,
                      color: spec?.titleColor || '#ffffff',
                      fontWeight: spec?.titleWeight === 'black' ? 900 : spec?.titleWeight === 'bold' ? 700 : 600,
                    }}
                  >
                    {out.headline || w.title}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {(spec?.showBadge ?? true) && out.badge && (
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: `${accent}33`, color: accent, border: `1px solid ${accent}55` }}
                      >
                        {out.badge}
                      </span>
                    )}
                    {onOpenCustomWidgetBuilder && (spec?.showEditPencil ?? true) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCustomWidgetBuilder(w.id, spec);
                        }}
                        title="Редактировать виджет (115+ опций)"
                        className="p-1 rounded-lg bg-black/45 hover:bg-black/75 text-white/80 hover:text-white cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className={`w-full flex items-center gap-2.5 my-auto ${spec?.contentAlign === 'center' ? 'flex-col justify-center' : ''}`}>
                {(spec?.showIcon ?? false) && spec?.iconType && spec.iconType !== 'none' && (
                  <div
                    className={`shrink-0 flex items-center justify-center ${
                      spec.iconBgShape === 'circle' ? 'rounded-full p-2' : spec.iconBgShape === 'squircle' ? 'rounded-2xl p-2' : spec.iconBgShape === 'square' ? 'rounded-md p-2' : ''
                    }`}
                    style={{
                      backgroundColor:
                        spec.iconBgShape && spec.iconBgShape !== 'none'
                          ? `${spec.iconBgColor || accent}${Math.round(((spec.iconBgOpacity ?? 18) / 100) * 255)
                              .toString(16)
                              .padStart(2, '0')}`
                          : undefined,
                    }}
                  >
                    {spec.iconType === 'image' && spec.iconImage ? (
                      <img src={spec.iconImage} alt="" style={{ width: spec.iconSize ?? 24, height: spec.iconSize ?? 24 }} className="object-contain rounded" />
                    ) : spec.iconType === 'emoji' ? (
                      <span style={{ fontSize: `${spec.iconSize ?? 24}px`, lineHeight: 1 }}>{spec.iconEmoji || '🚀'}</span>
                    ) : (
                      renderCustomLucideIcon(spec.iconName, spec.iconSize ?? 22, spec.iconColor || accent)
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {out.value && (
                    <div
                      className="leading-none truncate"
                      style={{
                        fontSize: `${spec?.valueSize ?? 22}px`,
                        color: spec?.valueColor || '#ffffff',
                        fontWeight: spec?.valueWeight === 'semibold' ? 600 : spec?.valueWeight === 'bold' ? 700 : 900,
                      }}
                    >
                      {out.error ? 'Ошибка JS' : out.value}
                    </div>
                  )}
                  {(spec?.showSubtitle ?? true) && (out.error || out.subtitle) && (
                    <div className="mt-1 truncate" style={{ fontSize: `${spec?.subtitleSize ?? 10}px`, color: spec?.subtitleColor || '#d4d4d8' }}>
                      {out.error || out.subtitle}
                    </div>
                  )}
                </div>
              </div>

              {spec?.quickButtons && spec.quickButtons.length > 0 && (
                <div
                  className="w-full grid gap-1.5 pt-0.5"
                  style={{ gridTemplateColumns: `repeat(${spec.buttonColumns || 2}, minmax(0, 1fr))` }}
                >
                  {spec.quickButtons.map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        runSingleCustomAction(btn.actionType, btn.target, btn.args, spec.openInNewTab ?? true);
                      }}
                      className="px-2 py-1 rounded-xl bg-white/14 hover:bg-white/25 border border-white/15 text-[10px] font-semibold truncate text-center transition cursor-pointer"
                    >
                      {btn.emoji} {btn.label}
                    </button>
                  ))}
                </div>
              )}

              {(spec?.showProgress ?? true) && spec?.progressStyle !== 'hidden' && typeof out.progress === 'number' && (
                <div className="w-full">
                  {spec?.progressStyle === 'segmented' ? (
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 10 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="rounded-sm"
                          style={{
                            height: `${spec.progressHeight ?? 6}px`,
                            backgroundColor: idx * 10 < (out.progress || 0) ? accent : 'rgba(255,255,255,0.16)',
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="w-full rounded-full bg-white/15 overflow-hidden" style={{ height: `${spec?.progressHeight ?? 6}px` }}>
                      <div className="h-full rounded-full" style={{ width: `${out.progress}%`, backgroundColor: accent }} />
                    </div>
                  )}
                </div>
              )}

              {(spec?.showRows ?? true) && out.rows && out.rows.length > 0 && (
                <div className="w-full pt-1 border-t border-white/15 space-y-0.5">
                  {out.rows.slice(0, 3).map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className="text-white/70 truncate">{r.label}</span>
                      <span className="font-mono font-bold" style={{ color: accent }}>
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'luma_ai_quick': {
        if (!aiEnabled) {
          return (
            <div className="h-full flex flex-col items-center justify-center text-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <span className={`text-[10px] font-mono uppercase ${mutedCls}`}>LUMA AI ОТКЛЮЧЁН</span>
              <button
                onClick={() => onOpenSystemWindow('settings')}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${subBtnCls}`}
              >
                Настройки ИИ
              </button>
            </div>
          );
        }
        const isPill = variant === 'pill_ai';
        return (
          <div className="h-full flex flex-col justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
            {!isPill && (
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
                <span className="inline-flex items-center gap-1 text-[var(--luma-accent)] font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  LUMA AI · 1.2
                </span>
                <button
                  onClick={() => onOpenSystemWindow('ai')}
                  className={`px-1.5 py-0.5 rounded border text-[9px] cursor-pointer ${subBtnCls}`}
                >
                  ОКНО
                </button>
              </div>
            )}
            {!isPill && (
              <div className={`flex-1 overflow-y-auto text-[11px] leading-snug pr-1 ${mutedCls}`}>
                {miniAiBusy ? 'Luma AI думает...' : miniAiAnswer.replace(/[*#`]/g, '').slice(0, 180)}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void askMiniAi();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                value={miniAiInput}
                onChange={(e) => setMiniAiInput(e.target.value)}
                placeholder="Спросите Luma AI (знания или код)..."
                className={`flex-1 min-w-0 px-2.5 py-1 rounded-lg border text-[11px] outline-none ${subBtnCls}`}
              />
              <button
                type="submit"
                disabled={miniAiBusy}
                className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-[10px] font-bold cursor-pointer"
              >
                →
              </button>
            </form>
          </div>
        );
      }

      case 'luma_world_clock': {
        const fmtCity = (tz: string) => {
          try {
            return new Intl.DateTimeFormat(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
          } catch {
            return '--:--';
          }
        };
        const cities = [
          { code: 'MSK', name: 'Москва', tz: 'Europe/Moscow' },
          { code: 'LON', name: 'Лондон', tz: 'Europe/London' },
          { code: 'TYO', name: 'Токио', tz: 'Asia/Tokyo' },
        ];
        return (
          <div className="h-full flex flex-col justify-between">
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>МИРОВЫЕ ЧАСЫ · UTC</div>
            <div className="grid grid-cols-3 gap-2">
              {cities.map((c) => (
                <div key={c.code} className={`rounded-xl border px-2 py-1.5 text-center ${subBtnCls}`}>
                  <div className="text-[9px] font-mono opacity-70">{c.name}</div>
                  <div className="text-sm font-mono font-black tabular-nums">{fmtCity(c.tz)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'luma_screentime': {
        const h = Math.floor(batteryMini.screenMin / 60);
        const m = batteryMini.screenMin % 60;
        const bars = batteryMini.days.length > 0 ? batteryMini.days : [{ weekday: 'Сегодня', minutes: batteryMini.screenMin }];
        const maxM = Math.max(30, ...bars.map((b) => b.minutes));
        return (
          <div className="h-full flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={`inline-flex items-center gap-1 ${mutedCls}`}>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                ЭКРАННОЕ ВРЕМЯ
              </span>
              <span className="font-bold text-cyan-400">{h > 0 ? `${h}ч ${m}м` : `${m} мин`}</span>
            </div>
            <div className="flex-1 flex items-end gap-1.5 pt-1">
              {bars.slice(-7).map((b, i) => (
                <div key={`${b.weekday}-${i}`} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                  <div
                    style={{ height: `${Math.max(15, Math.round((b.minutes / maxM) * 100))}%` }}
                    className="w-full rounded-t bg-gradient-to-t from-[var(--luma-accent)] to-cyan-400"
                  />
                  <span className="text-[8px] font-mono opacity-65">{b.weekday.slice(0, 2)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'luma_lithium_spectrum': {
        return (
          <div className="h-full flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className="text-emerald-400 font-bold">LITHIUM Li-3</span>
              <span className={mutedCls}>CPU {liveSystem?.cpu_percent ?? 0}%</span>
            </div>
            <div className="flex items-end justify-between gap-1 h-7 px-1">
              {[0.4, 0.85, 0.55, 1, 0.7, 0.9, 0.5, 0.8, 0.6, 0.95].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${Math.round(h * 100)}%` }}
                  className={`flex-1 rounded-full bg-gradient-to-t from-emerald-500 to-cyan-300 ${
                    i % 3 === 0 ? 'luma-eq-bar' : i % 3 === 1 ? 'luma-eq-bar luma-eq-bar-2' : 'luma-eq-bar luma-eq-bar-3'
                  }`}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onOpenSystemWindow('calculator'); }}
                className={`py-1 rounded-lg border text-[9px] font-mono font-bold cursor-pointer ${subBtnCls}`}
              >
                CALC
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onOpenSystemWindow('ai'); }}
                className={`py-1 rounded-lg border text-[9px] font-mono font-bold cursor-pointer ${subBtnCls}`}
              >
                LUMA AI
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onOpenSystemWindow('utilities'); }}
                className={`py-1 rounded-lg border text-[9px] font-mono font-bold cursor-pointer ${subBtnCls}`}
              >
                СЛУЖБЫ
              </button>
            </div>
          </div>
        );
      }

      case 'luma_wireless_hub': {
        const list = wirelessBatteries.slice(0, variant === 'pill_wireless' ? 3 : 4);
        if (variant === 'pill_wireless') {
          return (
            <div className="h-full flex items-center justify-between gap-2 px-1">
              <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">2.4GHz / BT</span>
              {list.length === 0 ? (
                <span className={`text-[10px] truncate ${mutedCls}`}>Нет беспроводных датчиков</span>
              ) : (
                <div className="flex items-center gap-2 overflow-hidden">
                  {list.map((d, idx) => (
                    <span key={idx} className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 truncate">
                      {d.name.slice(0, 10)} {d.battery_percent >= 0 ? `${d.battery_percent}%` : 'ON'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <div className="h-full flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className="text-emerald-400 font-bold">БЕСПРОВОДНОЙ ХАБ</span>
              <span className={mutedCls}>{wirelessBatteries.length} устр.</span>
            </div>
            {list.length === 0 ? (
              <div className={`flex-1 flex items-center justify-center text-[11px] text-center ${mutedCls}`}>
                Подключите BT / 2.4GHz мышь, наушники или клавиатуру
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 flex-1 content-center">
                {list.map((d, idx) => {
                  const hasBat = typeof d.battery_percent === 'number' && d.battery_percent >= 0;
                  const pct = hasBat ? Math.max(0, Math.min(100, d.battery_percent)) : 0;
                  return (
                    <div key={`${d.name}_${idx}`} className={`p-1.5 rounded-xl border space-y-1 ${subBtnCls}`}>
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-semibold truncate">{d.name}</span>
                        {hasBat ? (
                          <span className={`font-mono font-bold ${pct <= 20 ? 'text-rose-400' : 'text-emerald-400'}`}>{pct}%</span>
                        ) : (
                          <span className="font-mono text-[9px] font-bold text-emerald-400 shrink-0">Подкл.</span>
                        )}
                      </div>
                      {hasBat ? (
                        <div className="h-1 rounded-full bg-black/25 overflow-hidden">
                          <div className={`h-full rounded-full ${pct <= 20 ? 'bg-rose-500' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      ) : (
                        <div className={`text-[9px] font-mono truncate ${mutedCls}`}>{d.transport}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'luma_gpu_vram': {
        const gpuPct = liveSystem?.gpu_percent ?? 0;
        const vramUsed = liveSystem?.gpu_vram_used_mb ?? 0;
        const vramTot = liveSystem?.gpu_vram_total_mb ?? 0;
        const vramPct = liveSystem?.gpu_vram_percent ?? (vramTot > 0 ? Math.round((vramUsed / vramTot) * 100) : 0);
        const tempC = liveSystem?.gpu_temp_c ?? 44;
        if (variant === 'circle_gpu') {
          return (
            <div className="h-full flex flex-col items-center justify-center text-center gap-0.5">
              <span className="text-[9px] font-mono uppercase text-rose-400 font-bold">GPU</span>
              <span className="text-2xl font-mono font-black leading-none">{gpuPct}%</span>
              <span className={`text-[9px] font-mono ${mutedCls}`}>VRAM {vramPct}% · {tempC}°C</span>
            </div>
          );
        }
        return (
          <div className="h-full flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-bold text-rose-400 truncate max-w-[70%]">{liveSystem?.gpu_name || 'GPU + VRAM'}</span>
              <span className={mutedCls}>{tempC}°C</span>
            </div>
            <div className="space-y-1.5">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={mutedCls}>Чип GPU</span>
                  <span className="font-bold text-rose-400">{gpuPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(3, gpuPct)}%` }} />
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={mutedCls}>VRAM</span>
                  <span className="font-bold text-emerald-400">
                    {vramTot > 0 ? `${(vramUsed / 1024).toFixed(1)}/${(vramTot / 1024).toFixed(0)} ГБ (${vramPct}%)` : `${Math.round(vramUsed)} МБ`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(3, vramPct)}%` }} />
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'luma_habit_streak': {
        const doneCount = habits.filter((h) => h.done).length;
        return (
          <div className="h-full flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.12em]">
              <span className="font-bold text-amber-400">ПРИВЫЧКИ · STREAK</span>
              <span className={mutedCls}>{doneCount}/{habits.length}</span>
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto pr-0.5">
              {habits.map((h) => (
                <button
                  key={h.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHabit(h.id);
                  }}
                  className={`w-full px-2 py-1.5 rounded-xl border text-left flex items-center justify-between gap-1.5 text-[11px] cursor-pointer transition ${
                    h.done ? 'bg-emerald-500/15 border-emerald-500/40' : subBtnCls
                  }`}
                >
                  <span className={`truncate ${h.done ? 'line-through opacity-75' : 'font-medium'}`}>{h.text}</span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">🔥{h.streak}</span>
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'luma_beryllium_pulse': {
        return (
          <div className="h-full flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className="text-indigo-400 font-bold">BORON · B-5 HUD</span>
              <span className="text-amber-300 font-bold">CORE 1.5</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
              <div className={`py-1 rounded-lg border ${subBtnCls}`}>
                <div className="opacity-60 text-[8px]">CPU</div>
                <div className="font-bold">{liveSystem?.cpu_percent ?? 0}%</div>
              </div>
              <div className={`py-1 rounded-lg border ${subBtnCls}`}>
                <div className="opacity-60 text-[8px]">GPU</div>
                <div className="font-bold text-rose-400">{liveSystem?.gpu_percent ?? 0}%</div>
              </div>
              <div className={`py-1 rounded-lg border ${subBtnCls}`}>
                <div className="opacity-60 text-[8px]">SHIELD</div>
                <div className="font-bold text-emerald-400">1.5</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onOpenSystemWindow('taskmgr'); }}
                className={`py-1 rounded-lg border text-[9px] font-mono font-bold cursor-pointer ${subBtnCls}`}
              >
                GPU/CPU
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onOpenSettingsTab ? onOpenSettingsTab('security') : onOpenSystemWindow('settings'); }}
                className={`py-1 rounded-lg border text-[9px] font-mono font-bold cursor-pointer ${subBtnCls}`}
              >
                SHIELD
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onTriggerEasterEgg?.(); }}
                className="py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[9px] font-mono font-black cursor-pointer"
              >
                ИГРА B-5
              </button>
            </div>
          </div>
        );
      }

      /* ==================== 1.4 BORON: 7-DAY ILLUSTRATED WEATHER WIDGET ==================== */
      case 'luma_weather_week': {
        const wKind = wmoToRu(weather.code).kind;
        const isNight = now.getHours() >= 21 || now.getHours() < 6;
        const skyGradient =
          wKind === 'storm'
            ? 'linear-gradient(135deg, #16182c 0%, #27224d 55%, #1e293b 100%)'
            : wKind === 'rain'
            ? 'linear-gradient(135deg, #142840 0%, #1e4268 55%, #182b47 100%)'
            : wKind === 'snow'
            ? 'linear-gradient(135deg, #1e3a5f 0%, #3b6ea5 55%, #6897c8 100%)'
            : wKind === 'sun' && !isNight
            ? 'linear-gradient(135deg, #1d4ed8 0%, #38bdf8 55%, #f59e0b 115%)'
            : isNight
            ? 'linear-gradient(135deg, #0b1128 0%, #1e1b4b 55%, #312e81 100%)'
            : 'linear-gradient(135deg, #1e3a5f 0%, #3b5b84 55%, #475569 100%)';

        const fallbackDays: WeatherDailyPoint[] = ['Сег', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((d, i) => ({
          date: String(i),
          dayShort: d,
          code: i % 3 === 0 ? weather.code : i % 2 === 0 ? 1 : 2,
          maxTemp: weather.temp + (i % 3) - 1,
          minTemp: weather.temp - 5 + (i % 2),
          precipProb: i % 3 === 1 ? 35 : 10,
        }));
        const days = weather.daily && weather.daily.length > 0 ? weather.daily.slice(0, 7) : fallbackDays;
        const maxAll = Math.max(...days.map((d) => d.maxTemp), 1);
        const minAll = Math.min(...days.map((d) => d.minTemp), 0);
        const span = Math.max(4, maxAll - minAll);

        if (variant === 'week_strip') {
          return (
            <div
              className="h-full w-full p-3 text-white flex flex-col justify-between relative overflow-hidden"
              style={{ background: skyGradient }}
            >
              <div className="flex items-center justify-between text-[10px] font-mono relative z-10">
                <span className="font-bold flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
                  {weather.city || 'Авто-регион'} · {weather.temp > 0 ? `+${weather.temp}` : weather.temp}° ({weather.label})
                </span>
                <span className="opacity-75">7 ДНЕЙ</span>
              </div>
              <div className="grid grid-cols-7 gap-1 relative z-10 mt-1">
                {days.map((d, i) => (
                  <div key={d.date + i} className="rounded-lg bg-black/25 backdrop-blur-sm px-1 py-1.5 flex flex-col items-center justify-between gap-0.5 text-center border border-white/10">
                    <span className="text-[9px] font-mono opacity-80">{d.dayShort}</span>
                    {renderWeatherIcon(d.code, 'w-3.5 h-3.5 text-amber-200')}
                    <span className="text-[10px] font-mono font-bold">{d.maxTemp > 0 ? `+${d.maxTemp}` : d.maxTemp}°</span>
                    <span className="text-[8px] font-mono opacity-65">{d.minTemp}°</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div
            className="h-full w-full p-3.5 text-white flex flex-col justify-between relative overflow-hidden"
            style={{ background: skyGradient }}
          >
            {/* Illustrated Scenic Sky & Horizon Vector Artwork */}
            <svg viewBox="0 0 360 170" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 w-full h-full opacity-90">
              <defs>
                <radialGradient id="lumaSunOrb" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={isNight ? '#e0e7ff' : '#fef08a'} stopOpacity="0.95" />
                  <stop offset="55%" stopColor={isNight ? '#818cf8' : '#fbbf24'} stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="lumaHill1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.72" />
                </linearGradient>
              </defs>
              {/* Celestial Glow */}
              <circle cx={isNight ? 295 : 290} cy="42" r={wKind === 'sun' ? 56 : 40} fill="url(#lumaSunOrb)" />
              {isNight ? (
                <>
                  <circle cx="295" cy="42" r="14" fill="#eef2ff" opacity="0.9" />
                  <circle cx="301" cy="39" r="12" fill="#1e1b4b" />
                  <circle cx="190" cy="24" r="1.3" fill="#fff" opacity="0.85" />
                  <circle cx="235" cy="18" r="1.1" fill="#fff" opacity="0.7" />
                  <circle cx="260" cy="52" r="1.4" fill="#fff" opacity="0.65" />
                </>
              ) : (
                <circle cx="290" cy="42" r={wKind === 'sun' ? 18 : 13} fill="#fde047" opacity="0.92" />
              )}
              {/* Layered Soft Clouds */}
              <g fill="#ffffff" opacity={wKind === 'sun' ? 0.22 : 0.34}>
                <ellipse cx="255" cy="58" rx="44" ry="14" />
                <ellipse cx="282" cy="52" rx="28" ry="13" />
                <ellipse cx="226" cy="56" rx="24" ry="10" />
              </g>
              {wKind === 'rain' && (
                <g stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" opacity="0.7">
                  <line x1="230" y1="74" x2="222" y2="96" />
                  <line x1="252" y1="76" x2="244" y2="98" />
                  <line x1="274" y1="74" x2="266" y2="96" />
                  <line x1="296" y1="78" x2="288" y2="100" />
                </g>
              )}
              {wKind === 'snow' && (
                <g fill="#ffffff" opacity="0.85">
                  <circle cx="232" cy="82" r="2.2" />
                  <circle cx="255" cy="92" r="1.8" />
                  <circle cx="278" cy="79" r="2.5" />
                  <circle cx="302" cy="94" r="2" />
                </g>
              )}
              {wKind === 'storm' && (
                <polygon points="262,64 250,88 261,88 252,110 275,81 264,81" fill="#fde047" opacity="0.9" />
              )}
              {/* Alpine Silhouette Mountains */}
              <path d="M0,136 Q65,98 135,126 T275,112 T360,128 L360,170 L0,170 Z" fill="url(#lumaHill1)" />
            </svg>

            {/* Header: Live Temp + Scenic Condition */}
            <div className="relative z-10 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-white/85">
                  <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
                  <span className="truncate font-bold">{weather.city || 'Авто-регион'}</span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black tracking-tight leading-none drop-shadow">
                    {weather.temp > 0 ? `+${weather.temp}` : weather.temp}°
                  </span>
                  <div className="text-[10px] leading-tight text-white/85">
                    <div className="font-bold">{weather.label}</div>
                    <div className="font-mono text-[9px] opacity-80">
                      Ощущ. {weather.feelsLike}° · Ветер {weather.wind} км/ч
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshLocation();
                }}
                title="Обновить погоду"
                className="p-1.5 rounded-lg bg-black/25 hover:bg-black/45 border border-white/15 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${weather.loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* 7-Day (or 3-Day Card) Forecast Strip */}
            <div className={`relative z-10 grid ${variant === 'scenic_card' ? 'grid-cols-3' : 'grid-cols-7'} gap-1 mt-2`}>
              {(variant === 'scenic_card' ? days.slice(0, 3) : days).map((d, i) => {
                const barLeft = Math.max(0, Math.min(80, ((d.minTemp - minAll) / span) * 100));
                const barW = Math.max(18, Math.min(100 - barLeft, ((d.maxTemp - d.minTemp) / span) * 100));
                return (
                  <div
                    key={d.date + i}
                    className={`rounded-xl px-1 py-1.5 flex flex-col items-center justify-between gap-1 text-center backdrop-blur-md border ${
                      i === 0 ? 'bg-white/20 border-white/35' : 'bg-black/25 border-white/10'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold leading-none">{d.dayShort}</span>
                    {renderWeatherIcon(d.code, 'w-3.5 h-3.5 text-amber-200')}
                    <div className="text-[10px] font-mono font-extrabold leading-none">
                      {d.maxTemp > 0 ? `+${d.maxTemp}` : d.maxTemp}°
                    </div>
                    <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden relative">
                      <div
                        className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-300 to-amber-300"
                        style={{ left: `${barLeft}%`, width: `${barW}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-mono text-white/75 leading-none">
                      {d.minTemp}°{d.precipProb >= 25 ? ` · ${d.precipProb}%` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      /* ==================== 1.4 BORON: STUDIO CLOCKS PRO WIDGET ==================== */
      case 'luma_clock_studio': {
        const hrs24 = now.getHours();
        const hh = timeFormat === '12' ? String(hrs24 % 12 || 12).padStart(2, '0') : String(hrs24).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const secDeg = now.getSeconds() * 6;
        const minDeg = now.getMinutes() * 6 + now.getSeconds() * 0.1;
        const hrDeg = (hrs24 % 12) * 30 + now.getMinutes() * 0.5;
        const dayProgress = Math.round(((hrs24 * 60 + now.getMinutes()) / 1440) * 100);

        if (variant === 'dual_horizon') {
          const utcTime = now.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
          const tokyoTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
          return (
            <div className="h-full flex items-center justify-between gap-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--luma-accent)] font-bold">МЕСТНОЕ</div>
                <div className="text-3xl font-mono font-black tracking-tight tabular-nums leading-none mt-0.5">
                  {hh}:{mm}
                </div>
                <div className={`text-[10px] mt-1 truncate ${mutedCls}`}>
                  {now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 shrink-0">
                {[
                  { tag: 'UTC', val: utcTime },
                  { tag: 'ТОКИО', val: tokyoTime },
                ].map((c) => (
                  <div key={c.tag} className={`px-2.5 py-2 rounded-xl border text-center ${subBtnCls}`}>
                    <div className={`text-[8px] font-mono uppercase ${mutedCls}`}>{c.tag}</div>
                    <div className="text-sm font-mono font-bold tabular-nums">{c.val}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (variant === 'glass_flip_pro') {
          return (
            <div className="h-full flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="uppercase tracking-[0.16em] text-[var(--luma-accent)] font-bold">STUDIO FLIP PRO</span>
                <span className={mutedCls}>{now.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
              </div>
              <div className="flex items-center justify-center gap-2 flex-1">
                <div className={`px-3 py-2 rounded-2xl border text-3xl sm:text-4xl font-mono font-black tabular-nums relative ${subBtnCls}`}>
                  {hh}
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/25" />
                </div>
                <span className="text-2xl font-mono font-black text-[var(--luma-accent)] animate-pulse">:</span>
                <div className={`px-3 py-2 rounded-2xl border text-3xl sm:text-4xl font-mono font-black tabular-nums relative ${subBtnCls}`}>
                  {mm}
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/25" />
                </div>
                {showSeconds && (
                  <span className="px-1.5 py-1 rounded-lg bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-mono text-xs font-bold self-end mb-1">
                    {ss}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] font-mono opacity-75">
                  <span>Прогресс дня</span>
                  <span>{dayProgress}%</span>
                </div>
                <div className={`h-1 rounded-full overflow-hidden ${railTrackCls}`}>
                  <div className="h-full rounded-full bg-[var(--luma-accent)]" style={{ width: `${dayProgress}%` }} />
                </div>
              </div>
            </div>
          );
        }

        // Default: swiss_chrono
        return (
          <div className="h-full flex items-center justify-center gap-3">
            <svg viewBox="0 0 120 120" className="w-28 h-28 max-h-full shrink-0">
              <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="2.2" />
              <circle cx="60" cy="60" r="51" fill="none" stroke="var(--luma-accent)" strokeOpacity="0.28" strokeWidth="0.8" />
              {Array.from({ length: 60 }).map((_, i) => {
                const isMajor = i % 5 === 0;
                const isQuad = i % 15 === 0;
                return (
                  <line
                    key={i}
                    x1="60"
                    y1="8"
                    x2="60"
                    y2={isQuad ? '17' : isMajor ? '14' : '11'}
                    stroke={isQuad ? 'var(--luma-accent)' : 'currentColor'}
                    strokeOpacity={isMajor ? 0.88 : 0.35}
                    strokeWidth={isQuad ? '2.4' : isMajor ? '1.6' : '0.8'}
                    transform={`rotate(${i * 6} 60 60)`}
                  />
                );
              })}
              {/* Sub-dial date badge */}
              <rect x="74" y="53" width="22" height="14" rx="4" fill="currentColor" fillOpacity="0.1" />
              <text x="85" y="63" textAnchor="middle" fontSize="9" fontWeight="800" fill="currentColor" fontFamily="monospace">
                {String(now.getDate()).padStart(2, '0')}
              </text>
              {/* Hands */}
              <line x1="60" y1="60" x2="60" y2="30" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" transform={`rotate(${hrDeg} 60 60)`} />
              <line x1="60" y1="60" x2="60" y2="20" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" transform={`rotate(${minDeg} 60 60)`} />
              <line x1="60" y1="70" x2="60" y2="16" stroke="var(--luma-accent)" strokeWidth="1.3" strokeLinecap="round" transform={`rotate(${secDeg} 60 60)`} />
              <circle cx="60" cy="60" r="3.4" fill="var(--luma-accent)" />
            </svg>
            {w.w >= 4 && w.shape !== 'circle' && (
              <div className="min-w-0 space-y-1">
                <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--luma-accent)] font-bold">CHRONO</div>
                <div className="text-xl font-mono font-black tabular-nums leading-none">
                  {hh}:{mm}
                </div>
                <div className={`text-[10px] capitalize ${mutedCls}`}>
                  {now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              </div>
            )}
          </div>
        );
      }

      /* ==================== 1.4 BORON: COMBINED BATTERY + WIRELESS MICE HUB ==================== */
      case 'luma_battery_boron': {
        const pcPct = liveSystem?.battery_percent ?? batteryMini.percent;
        const pcChg = liveSystem?.battery_charging ?? batteryMini.charging;
        const gadgets = wirelessBatteries.slice(0, 3);
        const radius = 22;
        const circ = 2 * Math.PI * radius;
        const dashOffset = circ * (1 - Math.max(4, Math.min(100, pcPct)) / 100);

        if (variant === 'boron_rings') {
          return (
            <div className="h-full flex items-center justify-around gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                    <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4.5" />
                    <circle cx="28" cy="28" r={radius} fill="none" stroke="#10b981" strokeWidth="4.5" strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round" />
                  </svg>
                  <span className="absolute text-xs font-mono font-black">{pcPct}%</span>
                </div>
                <span className={`text-[9px] font-mono ${mutedCls}`}>{pcChg ? 'Сеть' : 'АКБ ПК'}</span>
              </div>
              {gadgets.slice(0, 2).map((g, i) => {
                const hasBat = g.battery_percent >= 0;
                const gp = hasBat ? Math.max(4, Math.min(100, g.battery_percent)) : 100;
                const goff = circ * (1 - gp / 100);
                return (
                  <div key={g.name + i} className="flex flex-col items-center gap-1 min-w-0 max-w-[82px]">
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                        <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4.5" />
                        <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--luma-accent)" strokeWidth="4.5" strokeDasharray={circ} strokeDashoffset={goff} strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-[10px] font-mono font-black">{hasBat ? `${g.battery_percent}%` : 'ON'}</span>
                    </div>
                    <span className={`text-[9px] font-mono truncate max-w-full ${mutedCls}`}>{g.name}</span>
                  </div>
                );
              })}
            </div>
          );
        }

        return (
          <div className="h-full flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5" /> ЭНЕРГИЯ BORON
              </span>
              <span className={mutedCls}>Здоровье {batteryMini.health}%</span>
            </div>

            <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${subBtnCls}`}>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">Основное устройство</div>
                <div className={`text-[9px] font-mono ${mutedCls}`}>{pcChg ? 'Заряжается · AC' : batteryMini.statusText}</div>
              </div>
              <span className="text-base font-mono font-black text-emerald-400">{pcPct}%</span>
            </div>

            <div className="space-y-1 flex-1 overflow-y-auto">
              {gadgets.length === 0 ? (
                <div className={`text-[10px] font-mono text-center py-1 ${mutedCls}`}>
                  Нет активных BT / 2.4GHz устройств
                </div>
              ) : (
                gadgets.map((g, i) => (
                  <div key={g.name + i} className="flex items-center justify-between gap-2 text-[10px] px-1">
                    <span className="truncate font-medium">{g.name}</span>
                    {g.battery_percent >= 0 ? (
                      <span className={`font-mono font-bold shrink-0 ${g.battery_percent <= 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {g.battery_percent}%
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] font-bold text-emerald-400 shrink-0">Подключено</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }

      /* ==================== 1.4 BORON: INTERACTIVE CALENDAR MONTH WIDGET ==================== */
      case 'luma_calendar_month': {
        const y = now.getFullYear();
        const m = now.getMonth();
        const todayD = now.getDate();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const firstDayIdx = (new Date(y, m, 1).getDay() + 6) % 7;
        const monthLabel = now.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
        let savedEvents: { id: string; date: string; title: string; time: string; color: string }[] = [];
        try {
          const raw = localStorage.getItem('luma_calendar_events_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) savedEvents = parsed;
          }
        } catch {
          /* ignore */
        }
        const mmStr = String(m + 1).padStart(2, '0');
        const todayIso = `${y}-${mmStr}-${String(todayD).padStart(2, '0')}`;
        const eventDaySet = new Set(savedEvents.filter((e) => e.date.startsWith(`${y}-${mmStr}-`)).map((e) => Number(e.date.slice(8, 10))));

        if (variant === 'agenda_today') {
          const upcoming = savedEvents.filter((e) => e.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
          return (
            <div className="h-full flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--luma-accent)] font-bold">
                    {now.toLocaleDateString(locale, { weekday: 'long' })}
                  </div>
                  <div className="text-2xl font-black leading-tight">
                    {todayD} {now.toLocaleDateString(locale, { month: 'short' })}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSystemWindow('calendar');
                  }}
                  className="px-2 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-[10px] font-bold cursor-pointer"
                >
                  Открыть
                </button>
              </div>
              <div className="space-y-1 flex-1 overflow-y-auto">
                {upcoming.length === 0 ? (
                  <div className={`text-[10px] ${mutedCls}`}>Нет запланированных событий</div>
                ) : (
                  upcoming.map((ev) => (
                    <div key={ev.id} className={`px-2 py-1 rounded-lg border text-[10px] flex items-center justify-between gap-1 ${subBtnCls}`}>
                      <span className="truncate font-semibold">{ev.title}</span>
                      <span className="font-mono text-[9px] opacity-70 shrink-0">{ev.date.slice(5)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        }

        const cells: (number | null)[] = [];
        for (let i = 0; i < firstDayIdx; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);

        return (
          <div className="h-full flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold capitalize truncate">{monthLabel}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSystemWindow('calendar');
                }}
                className="px-2 py-0.5 rounded-lg bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] text-[9px] font-mono font-bold cursor-pointer"
              >
                Календарь ↗
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[8px] font-mono opacity-60">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dn) => (
                <div key={dn}>{dn}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 flex-1 text-center text-[9px] font-mono">
              {cells.slice(0, 35).map((dayNum, idx) => {
                if (!dayNum) return <div key={`e_${idx}`} />;
                const isToday = dayNum === todayD;
                const hasEv = eventDaySet.has(dayNum);
                return (
                  <button
                    key={dayNum}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSystemWindow('calendar');
                    }}
                    className={`rounded-md flex flex-col items-center justify-center relative cursor-pointer transition ${
                      isToday
                        ? 'bg-[var(--luma-accent)] text-white font-black'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasEv && (
                      <span
                        className={`w-1 h-1 rounded-full absolute bottom-0.5 ${
                          isToday ? 'bg-white' : 'bg-amber-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'luma_utils':
      default: {
        const mods = [
          { label: 'Файлы', icon: <FolderOpen className="w-3.5 h-3.5" />, win: 'explorer' as const },
          { label: 'Кальк.', icon: <Calculator className="w-3.5 h-3.5" />, win: 'calculator' as const },
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
    topBarOffsetPx > 0
      ? { padding: '12px', paddingTop: `${topBarOffsetPx + 10}px`, paddingBottom: `${taskbarSizePx + 14}px` }
      : taskbarPosition === 'top'
      ? { padding: '12px', paddingTop: `${taskbarSizePx + 14}px` }
      : taskbarPosition === 'left'
      ? { padding: '12px', paddingLeft: `${taskbarSizePx + 14}px` }
      : taskbarPosition === 'right'
      ? { padding: '12px', paddingRight: `${taskbarSizePx + 14}px` }
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

  const renderWpSurface = (wpKey: string, animClass = '') => {
    if (!wpKey) return null;
    if (wpKey.startsWith('live:')) {
      const id = wpKey.slice(5);
      return (
        <div
          className={`pointer-events-none absolute inset-0 luma-live-wp-${id} ${animClass}`}
          style={{
            filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined,
            transform: wallpaperBlur > 0 ? 'scale(1.06)' : undefined,
          }}
        />
      );
    }
    if (wpKey.startsWith('img:')) {
      const url = wpKey.slice(4);
      return (
        <div
          className={`pointer-events-none absolute inset-0 bg-cover bg-center ${animClass}`}
          style={{
            backgroundImage: `url("${url}")`,
            filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined,
            transform: wallpaperBlur > 0 ? 'scale(1.06)' : undefined,
          }}
        />
      );
    }
    return null;
  };

  const wpAnimCls =
    wpAnimSeq > 0
      ? wallpaperTransition === 'bloom'
        ? 'luma-wp-anim-bloom'
        : wallpaperTransition === 'wipe'
        ? 'luma-wp-anim-wipe'
        : wallpaperTransition === 'morph'
        ? 'luma-wp-anim-morph'
        : 'luma-wp-anim-iris'
      : '';

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background:
          themeBgGradient ||
          (isDark ? 'linear-gradient(160deg, #09090b 0%, #101014 100%)' : 'linear-gradient(160deg, #e1e2dc 0%, #d4d6ce 100%)'),
      }}
    >
      {/* Outgoing Wallpaper underneath during cinematic transition */}
      {prevWpKey && renderWpSurface(prevWpKey)}

      {/* Incoming Active Wallpaper (Image or Live Mesh) with Cinematic Transition Animation */}
      {activeWpKey && (
        <>
          <div key={`${activeWpKey}_${wpAnimSeq}`} className="pointer-events-none absolute inset-0">
            {renderWpSurface(activeWpKey, wpAnimCls)}
          </div>
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
          const isFullBleed = w.widgetType === 'luma_weather_week' || w.widgetType === 'luma_custom_widget';
          const customBorderStyle: React.CSSProperties =
            w.widgetType === 'luma_custom_widget' && w.customSpec
              ? {
                  borderRadius: typeof w.customSpec.borderRadius === 'number' ? `${w.customSpec.borderRadius}px` : undefined,
                  borderWidth: typeof w.customSpec.borderWidth === 'number' ? `${w.customSpec.borderWidth}px` : undefined,
                  borderStyle: w.customSpec.borderStyle || 'solid',
                  borderColor: w.customSpec.borderColor
                    ? `${w.customSpec.borderColor}${Math.round(((w.customSpec.borderOpacity ?? 18) / 100) * 255)
                        .toString(16)
                        .padStart(2, '0')}`
                    : undefined,
                  boxShadow: w.customSpec.glowRadius
                    ? `0 0 ${w.customSpec.glowRadius}px ${w.customSpec.glowColor || w.customSpec.accentColor || '#22d3ee'}66`
                    : undefined,
                }
              : {};

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
                if (editMode) {
                  setSelectedId(w.id);
                  return;
                }
                const targetEl = e.target as HTMLElement | null;
                if (targetEl?.closest('button, input, textarea, select, a')) return;
                if (w.widgetType === 'luma_custom_widget' && executeCustomSpecClick(w.customSpec, false)) {
                  return;
                }
                setActiveWidgetSettingsId(w.id);
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
                ...computeWidgetSurfaceStyle(w, isDark, accentHex),
                ...customBorderStyle,
              }}
              title={
                editMode
                  ? `${w.title} (${w.w}×${w.h})`
                  : w.widgetType === 'luma_custom_widget' && w.customSpec?.tooltipText
                  ? w.customSpec.tooltipText
                  : `${w.title} · Нажмите для настроек виджета`
              }
              className={`group relative border ${isFullBleed ? 'p-0 overflow-hidden' : w.shape === 'circle' ? 'p-2.5' : 'p-3.5'} ${shapeCls} luma-card-lift ${
                isFullBleed ? 'border-white/15 bg-transparent shadow-xl' : cardCls
              } ${
                deletingWidgetIds[w.id] ? (deleteAnimStyle === 'harmony7' ? 'luma-delete-harmony7' : 'luma-delete-widget') : ''
              } ${
                editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
              } ${
                isResizing
                  ? 'ring-2 ring-[var(--luma-accent)] shadow-[0_0_0_5px_var(--luma-accent-soft)]'
                  : isSelected && editMode
                  ? 'ring-2 ring-[var(--luma-accent)]'
                  : ''
              }`}
            >
              <div className={`w-full h-full overflow-hidden ${isFullBleed ? '' : shapeCls}`}>{renderWidgetBody(w)}</div>

              {!editMode && !isResizing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveWidgetSettingsId(w.id);
                  }}
                  title="Настройки этого виджета"
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1.5 right-1.5 z-20 p-1 rounded-lg bg-black/55 text-white/90 hover:bg-[var(--luma-accent)] cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                </button>
              )}

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
                  deletingShortcutIds[sc.id] ? (deleteAnimStyle === 'harmony7' ? 'luma-delete-harmony7' : 'luma-delete-app') : ''
                } ${
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
                      {entry.iconUrl ? (
                        <img
                          src={entry.iconUrl}
                          alt=""
                          className="w-4 h-4 rounded object-contain shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        renderShortcutIcon(entry.icon, 'w-3.5 h-3.5 shrink-0')
                      )}
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
                deletingShortcutIds[sc.id] ? (deleteAnimStyle === 'harmony7' ? 'luma-delete-harmony7' : 'luma-delete-app') : ''
              } ${
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
                style={{
                  width: `${Math.max(34, Math.min(72, iconSizePx))}px`,
                  height: `${Math.max(34, Math.min(72, iconSizePx))}px`,
                }}
                className={`relative shrink-0 ${isFolder && sc.shape ? folderShapeCls : isPixel ? 'rounded-full' : 'rounded-[14px]'} border flex items-center justify-center transition ${
                  isDark
                    ? 'bg-black/40 border-white/[0.12] group-hover:border-[var(--luma-accent-border)] text-zinc-100'
                    : 'bg-white/75 border-zinc-900/[0.15] group-hover:border-[var(--luma-accent-border)] text-zinc-900 shadow-xs'
                }`}
              >
                {(() => {
                  const resolvedIconUrl =
                    sc.iconUrl ||
                    (sc.kind === 'app'
                      ? apps.find((a) => a.id === sc.target)?.iconUrl
                      : sc.kind === 'system'
                      ? ({
                          explorer: '/api/kernel/app-icon?name=explorer',
                          taskmgr: '/api/kernel/app-icon?name=taskmgr',
                          terminal: '/api/kernel/app-icon?name=cmd',
                          calculator: '/api/kernel/app-icon?name=calc',
                        } as Record<string, string>)[sc.target]
                      : undefined);
                  const fallbackIcon = renderShortcutIcon(
                    sc.icon,
                    iconSizePx >= 58 ? 'w-6 h-6' : iconSizePx >= 48 ? 'w-5 h-5' : 'w-4 h-4'
                  );
                  if (isFolder && folderEntries.length > 0) {
                    return (
                      <div className="grid grid-cols-2 gap-[2px] p-1.5">
                        {folderEntries.slice(0, 4).map((fe) => (
                          <span key={fe.id} className="relative flex items-center justify-center opacity-90">
                            <span className="flex items-center justify-center">
                              {renderShortcutIcon(fe.icon, iconSizePx >= 54 ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5')}
                            </span>
                            {fe.iconUrl && (
                              <img
                                src={fe.iconUrl}
                                alt={fe.label}
                                className="absolute inset-0 m-auto w-3.5 h-3.5 object-contain rounded-[2px]"
                                onLoad={(e) => {
                                  const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                                  if (prev) prev.style.opacity = '0';
                                }}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                          </span>
                        ))}
                      </div>
                    );
                  }
                  if (resolvedIconUrl) {
                    return (
                      <span className="relative flex items-center justify-center w-full h-full">
                        <span className="flex items-center justify-center">{fallbackIcon}</span>
                        <img
                          src={resolvedIconUrl}
                          alt={sc.label}
                          className="absolute inset-0 m-auto w-[68%] h-[68%] object-contain rounded"
                          onLoad={(e) => {
                            const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                            if (prev) prev.style.opacity = '0';
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </span>
                    );
                  }
                  return fallbackIcon;
                })()}
                {badge && (
                  <span className="absolute -bottom-1 -right-1 px-1 py-[1px] rounded text-[7px] font-mono font-bold bg-[var(--luma-accent)] text-white leading-none">
                    {badge}
                  </span>
                )}
              </div>
              <span className={`${iconSizePx >= 54 ? 'text-[11px]' : 'text-[10px]'} font-medium leading-none truncate max-w-full px-0.5`}>
                {sc.label}
              </span>

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
        <SmartContextMenu
          x={widgetCtxMenu.x}
          y={widgetCtxMenu.y}
          zIndex={65}
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in w-56 border p-1.5 shadow-2xl text-xs ${modalShellCls}`}
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
              animatedRemoveWidget(widgetCtxMenu.w.id, widgetCtxMenu.w.title);
              setWidgetCtxMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-[var(--luma-accent)] hover:bg-[var(--luma-accent-soft)] font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить виджет</span>
          </button>
        </SmartContextMenu>
      )}

      {/* SHORTCUT & FOLDER RIGHT-CLICK CONTEXT MENU */}
      {shortcutCtxMenu && (
        <SmartContextMenu
          x={shortcutCtxMenu.x}
          y={shortcutCtxMenu.y}
          zIndex={65}
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in w-56 border p-1.5 shadow-2xl text-xs ${modalShellCls}`}
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

          {onQuickLook && (shortcutCtxMenu.sc.kind === 'file' || shortcutCtxMenu.sc.kind === 'disk_folder') && shortcutCtxMenu.sc.target && (
            <button
              onClick={() => {
                const sc = shortcutCtxMenu.sc;
                const fileShortcuts = shortcuts.filter((s) => (s.kind === 'file' || s.kind === 'disk_folder') && s.target);
                const items: QuickLookCandidate[] = fileShortcuts.map((s) => ({
                  path: s.target,
                  name: s.label,
                  isDir: s.kind === 'disk_folder',
                }));
                const idx = Math.max(0, fileShortcuts.findIndex((s) => s.id === sc.id));
                onQuickLook(items, idx);
                setShortcutCtxMenu(null);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold text-sky-400 cursor-pointer ${
                isDark ? 'hover:bg-sky-500/15' : 'hover:bg-sky-50'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Быстрый просмотр (Space)</span>
            </button>
          )}

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
                onDelete: () => animatedRemoveShortcut(sc.id, sc.label),
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
              animatedRemoveShortcut(shortcutCtxMenu.sc.id, shortcutCtxMenu.sc.label);
              setShortcutCtxMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-[var(--luma-accent)] hover:bg-[var(--luma-accent-soft)] font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить со стола</span>
          </button>
        </SmartContextMenu>
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
            onClick={openInstalledAppsModal}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 ${subBtnCls}`}
          >
            <AppWindow className="w-3 h-3 text-[var(--luma-accent)]" /> Программы ПК
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
        <SmartContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          zIndex={65}
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in w-64 border p-1.5 shadow-2xl text-xs ${modalShellCls}`}
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
              label: 'Установленные программы ПК...',
              icon: <Sparkles className="w-3.5 h-3.5 text-[var(--luma-accent)]" />,
              run: () => openInstalledAppsModal(),
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
              onOpenSystemWindow('office');
              setCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Luma Office Studio (Docs / Sheets / Slides)</span>
          </button>

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
              const order: TaskbarPosition[] = ['bottom', 'left', 'right', 'top'];
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
              {taskbarPosition === 'bottom' ? 'Снизу' : taskbarPosition === 'left' ? 'Слева' : taskbarPosition === 'right' ? 'Справа' : 'Сверху'}
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
              {designStyle === 'nothing' ? 'Классический' : 'Модерн'}
            </span>
          </button>

          {onOpenCustomWidgetBuilder && (
            <button
              onClick={() => {
                setCtxMenu(null);
                onOpenCustomWidgetBuilder();
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-cyan-300' : 'hover:bg-zinc-900/10 text-cyan-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Создать свой виджет (Фото + JS)</span>
            </button>
          )}

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
        </SmartContextMenu>
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
          onCreateCustomWidget={onOpenCustomWidgetBuilder ? () => onOpenCustomWidgetBuilder() : undefined}
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
                          {entry.iconUrl ? (
                            <img
                              src={entry.iconUrl}
                              alt=""
                              className="w-5 h-5 rounded object-contain shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            renderShortcutIcon(entry.icon, 'w-4 h-4 shrink-0 text-[var(--luma-accent)]')
                          )}
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

      {/* ==================== INSTALLED DEVICE APPS PICKER MODAL ==================== */}
      {installedModalOpen && (
        <div
          onClick={() => setInstalledModalOpen(false)}
          className="fixed inset-0 z-[75] bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-3xl max-h-[84vh] flex flex-col border p-5 shadow-2xl space-y-3.5 ${modalShellCls}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div>
                <div className="text-sm font-extrabold flex items-center gap-2">
                  <AppWindow className="w-4 h-4 text-[var(--luma-accent)]" />
                  Установленные приложения на устройстве ({installedApps.length})
                </div>
                <div className={`text-[11px] ${mutedCls}`}>
                  Сканирование меню «Пуск» и реестра программ ПК — выберите нужные или добавьте все на рабочий стол
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => void loadInstalledDeviceApps(true)}
                  disabled={installedLoading}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono inline-flex items-center gap-1 cursor-pointer ${subBtnCls}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${installedLoading ? 'animate-spin' : ''}`} />
                  Обновить
                </button>
                <button
                  onClick={() => setInstalledModalOpen(false)}
                  className={`p-1.5 rounded-xl border cursor-pointer ${subBtnCls}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {(() => {
              const cats = ['Все', ...Array.from(new Set(installedApps.map((a) => a.category)))];
              const q = installedQuery.trim().toLowerCase();
              const visible = installedApps.filter(
                (a) =>
                  (installedCat === 'Все' || a.category === installedCat) &&
                  (!q || a.name.toLowerCase().includes(q) || a.exec_path.toLowerCase().includes(q) || (a.publisher || '').toLowerCase().includes(q))
              );
              const allVisibleSelected = visible.length > 0 && visible.every((a) => selectedInstalled.includes(a.id));

              return (
                <>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className={`flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-xl border ${subBtnCls}`}>
                      <Search className={`w-3.5 h-3.5 shrink-0 ${mutedCls}`} />
                      <input
                        value={installedQuery}
                        onChange={(e) => setInstalledQuery(e.target.value)}
                        placeholder="Поиск установленных программ (Chrome, Steam, Telegram, VS Code...)"
                        className="w-full bg-transparent text-xs outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (allVisibleSelected) {
                          const visSet = new Set(visible.map((v) => v.id));
                          setSelectedInstalled((prev) => prev.filter((id) => !visSet.has(id)));
                        } else {
                          const next = new Set(selectedInstalled);
                          visible.forEach((v) => next.add(v.id));
                          setSelectedInstalled(Array.from(next));
                        }
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${subBtnCls}`}
                    >
                      {allVisibleSelected ? 'Снять выбор' : `Выбрать все (${visible.length})`}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {cats.map((c) => (
                      <button
                        key={c}
                        onClick={() => setInstalledCat(c)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition ${
                          installedCat === c
                            ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                            : subBtnCls
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 min-h-[220px] overflow-y-auto pr-1">
                    {installedLoading ? (
                      <div className={`py-14 text-center text-xs font-mono ${mutedCls}`}>
                        Сканирование установленных программ устройства...
                      </div>
                    ) : visible.length === 0 ? (
                      <div className={`py-14 text-center text-xs font-mono ${mutedCls}`}>
                        Программы не найдены. Нажмите «Обновить» или измените поисковый фильтр.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {visible.map((app) => {
                          const sel = selectedInstalled.includes(app.id);
                          return (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() =>
                                setSelectedInstalled((prev) =>
                                  prev.includes(app.id) ? prev.filter((x) => x !== app.id) : [...prev, app.id]
                                )
                              }
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                                sel
                                  ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                  : subBtnCls
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                  sel
                                    ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                    : 'border-zinc-500/50'
                                }`}
                              >
                                {sel && <Check className="w-3 h-3" />}
                              </div>
                              {app.icon_url ? (
                                <img
                                  src={app.icon_url}
                                  alt=""
                                  className="w-7 h-7 rounded-lg object-contain shrink-0 bg-black/10 p-0.5"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                  <AppWindow className="w-4 h-4 opacity-70" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate">{app.name}</div>
                                <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                                  {app.category} · {app.exec_path.split(/[\\/]/).pop()}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <span className={`text-xs font-mono ${mutedCls}`}>
                      Выбрано: <strong className="text-[var(--luma-accent)]">{selectedInstalled.length}</strong> из {installedApps.length}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        disabled={selectedInstalled.length === 0}
                        onClick={() => placeInstalledAppsOnDesktop(true)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${subBtnCls}`}
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                        Собрать в папку на столе
                      </button>
                      <button
                        disabled={selectedInstalled.length === 0}
                        onClick={() => placeInstalledAppsOnDesktop(false)}
                        className="px-4 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Добавить на рабочий стол ({selectedInstalled.length})
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================== INSTANT WIDGET SETTINGS MODAL (CLICK ANY WIDGET → JUMP TO ITS SETTINGS!) ==================== */}
      {activeWidgetSettingsId && (() => {
        const w = widgets.find((item) => item.id === activeWidgetSettingsId);
        if (!w) return null;
        const def = getWidgetDef(w.widgetType);
        const sysJump: { label: string; run: () => void } | null = (() => {
          if (w.widgetType === 'luma_calendar_month') {
            return { label: 'Открыть приложение «Календарь»', run: () => onOpenSystemWindow('calendar') };
          }
          if (w.widgetType === 'luma_clock' || w.widgetType === 'luma_clock_studio' || w.widgetType === 'luma_world_clock' || w.widgetType === 'luma_calendar') {
            return { label: 'Настройки часов и оформления', run: () => (onOpenSettingsTab ? onOpenSettingsTab('appearance') : onOpenSystemWindow('settings')) };
          }
          if (w.widgetType === 'luma_battery' || w.widgetType === 'luma_battery_pro' || w.widgetType === 'luma_battery_boron' || w.widgetType === 'luma_power' || w.widgetType === 'luma_wireless_hub') {
            return { label: 'Открыть «Питание и Батарея»', run: () => (onOpenSettingsTab ? onOpenSettingsTab('power_battery') : onOpenSystemWindow('settings')) };
          }
          if (w.widgetType === 'luma_sys' || w.widgetType === 'luma_gpu_vram' || w.widgetType === 'luma_net') {
            return { label: 'Открыть Диспетчер задач (GPU / ЦП)', run: () => onOpenSystemWindow('taskmgr') };
          }
          if (w.widgetType === 'luma_disks') {
            return { label: 'Открыть «Память и Файлы»', run: () => (onOpenSettingsTab ? onOpenSettingsTab('storage') : onOpenSystemWindow('explorer')) };
          }
          if (w.widgetType === 'luma_guard') {
            return { label: 'Открыть LumaShield 1.5', run: () => (onOpenSettingsTab ? onOpenSettingsTab('security') : onOpenSystemWindow('settings')) };
          }
          if (w.widgetType === 'luma_wellbeing' || w.widgetType === 'luma_screentime') {
            return { label: 'Открыть Трекер сессий 2.0', run: () => onOpenSystemWindow('tracker') };
          }
          if (w.widgetType === 'luma_ai_quick') {
            return { label: 'Открыть Luma AI', run: () => onOpenSystemWindow('ai') };
          }
          if (w.widgetType === 'luma_beryllium_pulse') {
            return { label: 'Открыть «Ядро UI 1.4 Boron»', run: () => (onOpenSettingsTab ? onOpenSettingsTab('kernel_ui') : onOpenSystemWindow('settings')) };
          }
          return { label: 'Системные настройки Luma OS', run: () => onOpenSystemWindow('settings') };
        })();

        const bgModes: { id: WidgetBgMode; label: string }[] = [
          { id: 'theme', label: 'Тема' },
          { id: 'glass', label: 'Стекло' },
          { id: 'dark', label: 'Тёмный' },
          { id: 'light', label: 'Светлый' },
          { id: 'accent', label: 'Акцент' },
          { id: 'transparent', label: 'Прозрачный' },
          { id: 'custom', label: 'Свой цвет' },
        ];
        const curBgMode: WidgetBgMode = w.bgMode || 'theme';
        const curOpacity = w.bgOpacity ?? 78;
        const curBlur = w.bgBlur ?? 14;
        const curColor = w.bgCustomColor || '#1e1b4b';

        return (
          <div
            onClick={() => setActiveWidgetSettingsId(null)}
            className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`luma-animate-in w-full max-w-lg max-h-[88vh] overflow-y-auto border p-5 shadow-2xl space-y-4 ${modalShellCls}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--luma-accent)] font-bold">
                    НАСТРОЙКИ ВИДЖЕТА · {w.group.toUpperCase()}
                  </div>
                  <div className="text-base font-extrabold mt-0.5">{w.title}</div>
                  <div className={`text-[11px] mt-0.5 ${mutedCls}`}>{def.summary}</div>
                </div>
                <button
                  onClick={() => setActiveWidgetSettingsId(null)}
                  className={`p-1.5 rounded-xl border cursor-pointer ${subBtnCls}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Widget Variant Switcher */}
              {def.variants.length > 0 && (
                <div className="space-y-1.5">
                  <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Стиль отображения</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {def.variants.map((v) => {
                      const active = (w.variant || def.defaultVariant) === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => updateWidgetProps(w.id, { variant: v.id, w: v.w, h: v.h, shape: v.shape })}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            active ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : subBtnCls
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center justify-between">
                            <span>{v.label}</span>
                            <span className="text-[9px] font-mono opacity-65">
                              {v.w}×{v.h}
                            </span>
                          </div>
                          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{v.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Luma OS 1.4 Boron: Per-Widget Transparency, Background & Blur */}
              <div className={`p-3.5 rounded-2xl border space-y-3 ${subBtnCls}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--luma-accent)] font-bold">
                    Фон и прозрачность виджета (1.4 Boron)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setWidgets((prev) =>
                          prev.map((item) => ({
                            ...item,
                            bgMode: curBgMode,
                            bgOpacity: curOpacity,
                            bgCustomColor: curColor,
                            bgBlur: curBlur,
                          }))
                        );
                        onPushToast('Виджеты', 'Фон и прозрачность применены ко всем виджетам', 'success');
                      }}
                      className="px-2 py-0.5 rounded-md bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] text-[10px] font-bold cursor-pointer"
                    >
                      Ко всем
                    </button>
                    <button
                      onClick={() =>
                        updateWidgetProps(w.id, {
                          bgMode: undefined,
                          bgOpacity: undefined,
                          bgCustomColor: undefined,
                          bgBlur: undefined,
                        })
                      }
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold cursor-pointer ${subBtnCls}`}
                    >
                      Сброс
                    </button>
                  </div>
                </div>

                {/* Background Preset Mode */}
                <div className="flex flex-wrap gap-1.5">
                  {bgModes.map((m) => (
                    <button
                      key={m.id}
                      onClick={() =>
                        updateWidgetProps(w.id, {
                          bgMode: m.id,
                          bgOpacity: m.id === 'transparent' ? 0 : w.bgOpacity ?? 78,
                          bgBlur: m.id === 'transparent' ? 0 : w.bgBlur ?? 14,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                        curBgMode === m.id
                          ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                          : subBtnCls
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Custom Color Picker */}
                {curBgMode === 'custom' && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={mutedCls}>Цвет подложки:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={curColor}
                        onChange={(e) => updateWidgetProps(w.id, { bgMode: 'custom', bgCustomColor: e.target.value })}
                        className="w-8 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <span className="font-mono text-[11px] uppercase">{curColor}</span>
                    </div>
                  </div>
                )}

                {/* Opacity Slider 0–100% */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className={mutedCls}>Непрозрачность фона</span>
                    <span className="font-bold text-[var(--luma-accent)]">{curOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={2}
                    value={curOpacity}
                    onChange={(e) =>
                      updateWidgetProps(w.id, {
                        bgMode: curBgMode === 'transparent' && Number(e.target.value) > 0 ? 'glass' : curBgMode,
                        bgOpacity: Number(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>

                {/* Backdrop Blur Selector */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={`text-[11px] font-mono ${mutedCls}`}>Размытие стекла (Blur)</span>
                  <div className="flex items-center gap-1">
                    {[0, 8, 16, 24].map((b) => (
                      <button
                        key={b}
                        onClick={() => updateWidgetProps(w.id, { bgBlur: b })}
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold cursor-pointer ${
                          curBlur === b
                            ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                            : subBtnCls
                        }`}
                      >
                        {b}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shape Selector */}
              <div className="space-y-1.5">
                <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Форма виджета</div>
                <div className="flex flex-wrap gap-1.5">
                  {SHAPE_OPTIONS.map((sh) => (
                    <button
                      key={sh.id}
                      onClick={() => updateWidgetProps(w.id, { shape: sh.id })}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                        (w.shape || 'squircle') === sh.id
                          ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                          : subBtnCls
                      }`}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size W × H Controls */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${subBtnCls}`}>
                  <span className="font-mono">Ширина: <strong>{w.w}</strong></span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateWidgetProps(w.id, { w: Math.max(2, w.w - 1) })}
                      className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 font-bold cursor-pointer"
                    >
                      −
                    </button>
                    <button
                      onClick={() => updateWidgetProps(w.id, { w: Math.min(10, w.w + 1) })}
                      className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${subBtnCls}`}>
                  <span className="font-mono">Высота: <strong>{w.h}</strong></span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateWidgetProps(w.id, { h: Math.max(1, w.h - 1) })}
                      className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 font-bold cursor-pointer"
                    >
                      −
                    </button>
                    <button
                      onClick={() => updateWidgetProps(w.id, { h: Math.min(6, w.h + 1) })}
                      className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                {sysJump && (
                  <button
                    onClick={() => {
                      setActiveWidgetSettingsId(null);
                      sysJump.run();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {sysJump.label}
                  </button>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => {
                      setActiveWidgetSettingsId(null);
                      setResizingTarget({ kind: 'widget', id: w.id });
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${subBtnCls}`}
                  >
                    Растянуть мышью
                  </button>
                  <button
                    onClick={() => {
                      setActiveWidgetSettingsId(null);
                      animatedRemoveWidget(w.id, w.title);
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-600/85 hover:bg-rose-600 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
});

