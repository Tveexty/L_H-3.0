/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  AppWindow,
  ArrowUpDown,
  BarChart3,
  BatteryCharging,
  Bell,
  BellOff,
  Bluetooth,
  Calculator,
  Check,
  CheckCircle2,
  CheckSquare,
  Clipboard,
  ClipboardCheck,
  Clock,
  Cloud,
  Code2,
  Compass,
  Copy,
  Cpu,
  Disc3,
  Download,
  ExternalLink,
  EyeOff,
  FileCode,
  FileText,
  Film,
  Flag,
  FolderOpen,
  FolderPlus,
  Gamepad2,
  Github,
  Globe,
  Grid,
  HardDrive,
  Headphones,
  Info,
  Layers,
  LayoutGrid,
  LayoutPanelLeft,
  Leaf,
  ListChecks,
  Lock,
  MapPin,
  Maximize,
  MessageSquare,
  Minimize,
  Monitor,
  Moon,
  MoreVertical,
  MousePointerClick,
  Music,
  Palette,
  Pause,
  Pencil,
  Pin,
  PinOff,
  Play,
  Plus,
  Power,
  Puzzle,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sliders,
  Square,
  Star,
  Stethoscope,
  StickyNote,
  Sun,
  Terminal,
  Timer,
  Trash2,
  Trophy,
  Type,
  Users,
  Volume1,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import {
  AppItem,
  AppType,
  CatalogPluginItem,
  ClockStyleKey,
  CLOCK_STYLE_OPTIONS,
  CustomThemeConfig,
  DetoxGroup,
  formatDurationRu,
  formatLiveClock,
  formatMonthBadge,
  GlassIntensity,
  HostWindowInfo,
  INITIAL_APPS,
  INITIAL_DETOX_GROUPS,
  INITIAL_ISLAND_PLAYERS,
  INITIAL_PLUGINS,
  INITIAL_WINDOWS_NOTIFICATIONS,
  INITIAL_WORKSPACES,
  IslandMediaPlayer,
  LiveSystemTelemetry,
  PLUGIN_CATALOG,
  PluginItem,
  PYTHON_PROJECT_FILES,
  ThemeKey,
  THEMES,
  VERSION_HISTORY,
  WindowsNotificationItem,
  WorkspacePreset,
} from './data/launcherData';
import { DesignStyle, DexWindow, TaskbarPosition } from './components/DexWindow';
import { LumaClockRenderer } from './components/LumaClockRenderer';
import {
  DesktopGridCols,
  DesktopShortcut,
  FolderEntry,
  LumaDesktopCanvas,
  WallpaperStyle,
} from './components/LumaDesktopCanvas';
import { LumaExplorerWindow } from './components/LumaExplorerWindow';
import {
  BluetoothSettingsPanel,
  KernelUIPanel,
  PowerProfile,
  PowerSaverPanel,
  PropertiesModal,
  PropertiesTarget,
  SettingsAppsListPanel,
  SettingsNotificationsPanel,
  StorageMemoryPanel,
} from './components/LumaSettingsExtra';
import { LumaSpotlight } from './components/LumaSpotlight';
import { LumaTaskManagerWindow } from './components/LumaTaskManagerWindow';
import { LumaTerminalWindow } from './components/LumaTerminalWindow';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Gamepad2,
  Globe,
  MessageSquare,
  Users,
  Play,
  Film,
  Music,
  Headphones,
  Compass,
  Trophy,
  Calculator,
  FolderOpen,
  Activity,
  Terminal,
  FileText,
  Cloud,
  Code2,
  Rocket,
  Puzzle,
  Star,
  Settings,
  AppWindow,
};

const ICON_NAMES = Object.keys(ICON_MAP);
const WEEKDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const STORAGE_KEY = 'luma_os_1_0_4_shell_state';
const LEGACY_KEYS = [
  'luma_os_1_0_3_shell_state',
  'luma_os_1_0_2b_shell_state',
  'luma_os_1_0_2_shell_state',
  'luma_os_1_0_1_shell_state',
];

type DexWinId =
  | 'apps'
  | 'explorer'
  | 'taskmgr'
  | 'terminal'
  | 'tracker'
  | 'kernel'
  | 'settings'
  | 'plugins'
  | 'island'
  | 'spaces';
type AnimationPreset = 'standard' | 'spring' | 'glide' | 'none';
type TaskbarSizePreset = 'compact' | 'standard' | 'large';
type FontPreset = 'sans' | 'mono' | 'rounded';
type SettingsTabId =
  | 'kernel_ui'
  | 'luma'
  | 'bluetooth'
  | 'power'
  | 'storage'
  | 'apps_list'
  | 'notifications'
  | 'taskbar'
  | 'island'
  | 'appearance'
  | 'clock'
  | 'navigation'
  | 'plugins'
  | 'updater'
  | 'about';

interface DexWinState {
  open: boolean;
  minimized: boolean;
  z: number;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success';
}

interface ClipboardEntry {
  id: string;
  text: string;
  pinned: boolean;
  time: string;
}

interface KernelEventEntry {
  id: string;
  time: string;
  source: string;
  message: string;
  level: 'info' | 'success' | 'warn';
}

function hexToRgbTuple(hex: string, fallback = '215, 25, 33'): string {
  const clean = (hex || '').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (full.length !== 6) return fallback;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return fallback;
  return `${r}, ${g}, ${b}`;
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
        active
          ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] border-[var(--luma-accent-border)]'
          : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/25'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--luma-accent)]' : 'bg-zinc-500'}`} />
      {active ? 'ВКЛ' : 'ВЫКЛ'}
    </span>
  );
}

const INITIAL_WINDOWS: Record<DexWinId, DexWinState> = {
  explorer: { open: false, minimized: false, z: 20 },
  taskmgr: { open: false, minimized: false, z: 20 },
  apps: { open: false, minimized: false, z: 20 },
  terminal: { open: false, minimized: false, z: 20 },
  tracker: { open: false, minimized: false, z: 20 },
  kernel: { open: false, minimized: false, z: 20 },
  settings: { open: false, minimized: false, z: 20 },
  plugins: { open: false, minimized: false, z: 20 },
  island: { open: false, minimized: false, z: 20 },
  spaces: { open: false, minimized: false, z: 20 },
};

export default function App() {
  // Seamless persistence migration
  const savedState = useMemo(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ||
        LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  }, []);

  // --- Theme, Desktop Grid & Appearance Settings (ALL Choices Preserved!) ---
  const [themeKey, setThemeKey] = useState<ThemeKey>(
    savedState?.themeKey && THEMES[savedState.themeKey] ? savedState.themeKey : 'nothing_mono'
  );
  const [customThemes, setCustomThemes] = useState<Record<string, CustomThemeConfig>>(
    savedState?.customThemes || {}
  );
  const [customAccentOverride, setCustomAccentOverride] = useState<string>(savedState?.customAccentOverride || '');
  const [fontPreset, setFontPreset] = useState<FontPreset>(
    savedState?.fontPreset === 'mono' || savedState?.fontPreset === 'rounded' ? savedState.fontPreset : 'sans'
  );
  const [uiScale, setUiScale] = useState<90 | 100 | 110>(
    savedState?.uiScale === 90 || savedState?.uiScale === 110 ? savedState.uiScale : 100
  );
  const [glassEnabled, setGlassEnabled] = useState<boolean>(savedState?.glassEnabled ?? true);
  const [glassIntensity, setGlassIntensity] = useState<GlassIntensity>(savedState?.glassIntensity || 'medium');
  const [glassOpacity, setGlassOpacity] = useState<number>(savedState?.glassOpacity ?? 88);
  const [animationPreset, setAnimationPreset] = useState<AnimationPreset>(
    savedState?.animationPreset === 'spring' ||
      savedState?.animationPreset === 'glide' ||
      savedState?.animationPreset === 'none'
      ? savedState.animationPreset
      : savedState?.smoothAnimations === false
      ? 'none'
      : 'standard'
  );
  const smoothAnimations = animationPreset !== 'none';
  const setSmoothAnimations = (updater: boolean | ((v: boolean) => boolean)) => {
    const next = typeof updater === 'function' ? updater(animationPreset !== 'none') : updater;
    setAnimationPreset(next ? 'standard' : 'none');
  };
  const [uiDensity, setUiDensity] = useState<'comfortable' | 'compact'>(savedState?.uiDensity || 'comfortable');
  const [cardBorderRadius, setCardBorderRadius] = useState<number>(savedState?.cardBorderRadius ?? 18);
  const [cardColumns, setCardColumns] = useState<number>(savedState?.cardColumns ?? 4);
  const [showPluginsInGrid, setShowPluginsInGrid] = useState<boolean>(savedState?.showPluginsInGrid ?? true);
  const [desktopCols, setDesktopCols] = useState<DesktopGridCols>(savedState?.desktopCols === 20 ? 20 : 22);
  const [wallpaper, setWallpaper] = useState<WallpaperStyle>(savedState?.wallpaper || 'dots');
  const [desktopEditMode, setDesktopEditMode] = useState<boolean>(false);
  const [taskbarPosition, setTaskbarPosition] = useState<TaskbarPosition>(
    savedState?.taskbarPosition === 'left' || savedState?.taskbarPosition === 'top' ? savedState.taskbarPosition : 'bottom'
  );
  const [taskbarSize, setTaskbarSize] = useState<TaskbarSizePreset>(
    savedState?.taskbarSize === 'compact' || savedState?.taskbarSize === 'large' ? savedState.taskbarSize : 'standard'
  );
  const [taskbarShowLabels, setTaskbarShowLabels] = useState<boolean>(savedState?.taskbarShowLabels ?? true);
  const [taskbarShowHostWindows, setTaskbarShowHostWindows] = useState<boolean>(
    savedState?.taskbarShowHostWindows ?? true
  );
  const [taskbarShowTelemetry, setTaskbarShowTelemetry] = useState<boolean>(savedState?.taskbarShowTelemetry ?? true);
  const [taskbarCenterIcons, setTaskbarCenterIcons] = useState<boolean>(savedState?.taskbarCenterIcons ?? false);

  const [designStyle, setDesignStyle] = useState<DesignStyle>(
    savedState?.designStyle === 'pixelbook' ? 'pixelbook' : 'nothing'
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // --- Kernel UI, Power Saver & Notification Preferences ---
  const [customDeviceName, setCustomDeviceName] = useState<string>(savedState?.customDeviceName || '');
  const [powerProfile, setPowerProfile] = useState<PowerProfile>(
    savedState?.powerProfile === 'performance' || savedState?.powerProfile === 'saver'
      ? savedState.powerProfile
      : 'balanced'
  );
  const [screenBrightness, setScreenBrightness] = useState<number>(
    typeof savedState?.screenBrightness === 'number' ? Math.max(55, Math.min(100, savedState.screenBrightness)) : 100
  );
  const [autoSaverThreshold, setAutoSaverThreshold] = useState<number>(savedState?.autoSaverThreshold ?? 20);
  const [reduceEffectsOnSaver, setReduceEffectsOnSaver] = useState<boolean>(savedState?.reduceEffectsOnSaver ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(savedState?.notificationsEnabled ?? true);
  const [toastBannersEnabled, setToastBannersEnabled] = useState<boolean>(savedState?.toastBannersEnabled ?? true);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState<boolean>(
    savedState?.notificationSoundEnabled ?? false
  );

  // --- 18 Clock Styles & Fine Clock Customization (ALL Preserved!) ---
  const [clockStyle, setClockStyle] = useState<ClockStyleKey>(savedState?.clockStyle || 'nothing_dot');
  const [timeFormat, setTimeFormat] = useState<'24' | '12'>(savedState?.timeFormat || '24');
  const [showSeconds, setShowSeconds] = useState<boolean>(savedState?.showSeconds ?? false);
  const [showDate, setShowDate] = useState<boolean>(savedState?.showDate ?? true);
  const [clockGlowEnabled, setClockGlowEnabled] = useState<boolean>(savedState?.clockGlowEnabled ?? false);
  const [clockAccentColor, setClockAccentColor] = useState<string>(savedState?.clockAccentColor || '#d71921');
  const [clockGlowIntensity, setClockGlowIntensity] = useState<number>(savedState?.clockGlowIntensity ?? 12);
  const [clockBlinkColon, setClockBlinkColon] = useState<boolean>(savedState?.clockBlinkColon ?? false);
  const [now, setNow] = useState<Date>(() => new Date());

  // --- Adaptive Day/Night & Right-Click Back ---
  const [adaptiveThemeEnabled, setAdaptiveThemeEnabled] = useState<boolean>(
    savedState?.adaptiveThemeEnabled ?? false
  );
  const [dayStartTime, setDayStartTime] = useState<string>(savedState?.dayStartTime || '07:00');
  const [nightStartTime, setNightStartTime] = useState<string>(savedState?.nightStartTime || '20:00');
  const [dayThemeKey, setDayThemeKey] = useState<ThemeKey>(savedState?.dayThemeKey || 'nothing_paper');
  const [nightThemeKey, setNightThemeKey] = useState<ThemeKey>(savedState?.nightThemeKey || 'nothing_mono');
  const [rightClickBackEnabled, setRightClickBackEnabled] = useState<boolean>(
    savedState?.rightClickBackEnabled ?? true
  );

  // --- DeX Window Manager, Real Start Menu, OS Host Windows & Taskbar Popovers ---
  const [windows, setWindows] = useState<Record<DexWinId, DexWinState>>(INITIAL_WINDOWS);
  const zCounterRef = useRef<number>(25);
  const [explorerStartPath, setExplorerStartPath] = useState<string>('~');
  const [explorerKey, setExplorerKey] = useState<number>(1);
  const [spotlightOpen, setSpotlightOpen] = useState<boolean>(false);
  const [startMenuOpen, setStartMenuOpen] = useState<boolean>(false);
  const [startSearch, setStartSearch] = useState<string>('');
  const [controlCenterOpen, setControlCenterOpen] = useState<boolean>(false);
  const [taskListOpen, setTaskListOpen] = useState<boolean>(false);
  const [taskbarAppMenuId, setTaskbarAppMenuId] = useState<string | null>(null);
  const [taskbarHostWinPid, setTaskbarHostWinPid] = useState<number | null>(null);
  const [taskbarCtxMenu, setTaskbarCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [pendingTermCommand, setPendingTermCommand] = useState<{ id: number; command: string } | null>(null);
  const [pendingPinItems, setPendingPinItems] = useState<{
    id: number;
    items: { kind: DesktopShortcut['kind']; label: string; icon: string; target: string }[];
  } | null>(null);
  const [pendingFolderBatch, setPendingFolderBatch] = useState<{
    id: number;
    label: string;
    items: FolderEntry[];
  } | null>(null);

  // --- Apps Window (Window 1 Grouped Structure + Multi-Select + Sorting + Edit) ---
  const [apps, setApps] = useState<AppItem[]>(savedState?.apps || INITIAL_APPS);
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(false);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [lastSelectedAppId, setLastSelectedAppId] = useState<string | null>(null);
  const [appsSortBy, setAppsSortBy] = useState<'name' | 'usage' | 'size' | 'running'>('name');
  const [appsRunningOnly, setAppsRunningOnly] = useState<boolean>(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [detoxGroups] = useState<DetoxGroup[]>(savedState?.detoxGroups || INITIAL_DETOX_GROUPS);
  const [groupedViewStyle, setGroupedViewStyle] = useState<'list_and_cards' | 'list' | 'cards'>(
    savedState?.groupedViewStyle || 'list_and_cards'
  );
  const [currentFilter, setCurrentFilter] = useState<'all' | 'web' | 'app' | 'system' | 'plugin' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [trackerPeriod, setTrackerPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [plugins, setPlugins] = useState<PluginItem[]>(savedState?.plugins || INITIAL_PLUGINS);
  const [workspaces] = useState<WorkspacePreset[]>(INITIAL_WORKSPACES);

  // --- Real Host Telemetry, Open OS Windows, Audio, Media & Luma Island ---
  const [liveSystem, setLiveSystem] = useState<LiveSystemTelemetry | null>(null);
  const [hostWindows, setHostWindows] = useState<HostWindowInfo[]>([]);
  const [kernelConnected, setKernelConnected] = useState<boolean>(false);
  const [cpuLoad, setCpuLoad] = useState<number>(0);
  const [ramLoad, setRamLoad] = useState<number>(0);
  const [cpuHistory, setCpuHistory] = useState<number[]>([0, 0]);
  const [ramHistory, setRamHistory] = useState<number[]>([0, 0]);
  const [batteryLevel, setBatteryLevel] = useState<number>(savedState?.batteryLevel ?? 100);
  const [isCharging, setIsCharging] = useState<boolean>(savedState?.isCharging ?? true);
  const [volume, setVolume] = useState<number>(savedState?.volume ?? 68);
  const [isMuted, setIsMuted] = useState<boolean>(savedState?.isMuted ?? false);
  const audioPostTimerRef = useRef<number | null>(null);

  const [dynamicIslandEnabled, setDynamicIslandEnabled] = useState<boolean>(
    savedState?.dynamicIslandEnabled ?? false
  );
  const [dndEnabled, setDndEnabled] = useState<boolean>(savedState?.dndEnabled ?? false);
  const [islandTab, setIslandTab] = useState<
    'overview' | 'clipboard' | 'scratchpad' | 'notifications' | 'player' | 'timer' | 'stopwatch' | 'settings'
  >('overview');
  const [islandPosition, setIslandPosition] = useState<'top' | 'bottom'>(
    savedState?.islandPosition === 'bottom' ? 'bottom' : 'top'
  );
  const [islandSize, setIslandSize] = useState<'compact' | 'standard' | 'expanded'>(
    savedState?.islandSize || 'standard'
  );
  const [islandShowEq, setIslandShowEq] = useState<boolean>(savedState?.islandShowEq ?? true);
  const [islandShowClip, setIslandShowClip] = useState<boolean>(savedState?.islandShowClip ?? true);
  const [islandShowBattery, setIslandShowBattery] = useState<boolean>(savedState?.islandShowBattery ?? true);
  const [islandAutoClipboard, setIslandAutoClipboard] = useState<boolean>(savedState?.islandAutoClipboard ?? true);
  const [islandGlowEnabled, setIslandGlowEnabled] = useState<boolean>(savedState?.islandGlowEnabled ?? false);
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardEntry[]>(
    Array.isArray(savedState?.clipboardHistory)
      ? savedState.clipboardHistory
      : [
          {
            id: 'clip_init_1',
            text: 'Luma OS 1.0.4 — Буфер обмена Luma Island готов к работе',
            pinned: false,
            time: 'сейчас',
          },
        ]
  );
  const [clipSearch, setClipSearch] = useState<string>('');
  const [manualClipInput, setManualClipInput] = useState<string>('');
  const [islandScratchpad, setIslandScratchpad] = useState<string>(savedState?.islandScratchpad || '');
  const lastOsClipRef = useRef<string>('');
  const [notifications, setNotifications] = useState<WindowsNotificationItem[]>(
    savedState?.windowsNotifications || INITIAL_WINDOWS_NOTIFICATIONS
  );
  const [islandPlayers, setIslandPlayers] = useState<IslandMediaPlayer[]>(
    savedState?.islandPlayers || INITIAL_ISLAND_PLAYERS
  );
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(savedState?.activePlayerIndex ?? 0);
  const [mediaPlaying, setMediaPlaying] = useState<boolean>(savedState?.mediaPlaying ?? false);
  const [islandTimerTotalSec, setIslandTimerTotalSec] = useState<number>(300);
  const [islandTimerRemainingSec, setIslandTimerRemainingSec] = useState<number>(300);
  const [islandTimerRunning, setIslandTimerRunning] = useState<boolean>(false);
  const [islandStopwatchSec, setIslandStopwatchSec] = useState<number>(0);
  const [islandStopwatchRunning, setIslandStopwatchRunning] = useState<boolean>(false);
  const [islandStopwatchLaps, setIslandStopwatchLaps] = useState<string[]>([]);

  // --- Settings, Search, Kernel IPC, Event Log & Code Inspector ---
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>('kernel_ui');
  const [settingsSearch, setSettingsSearch] = useState<string>('');
  const [changelogFilter, setChangelogFilter] = useState<string>('all');
  const [githubAutoUpdate, setGithubAutoUpdate] = useState<boolean>(savedState?.githubAutoUpdate ?? true);
  const [githubRepoUrl, setGithubRepoUrl] = useState<string>(
    savedState?.githubRepoUrl || 'https://github.com/Tveexty/L_H-3.0'
  );
  const [githubUpdateStatus, setGithubUpdateStatus] = useState<string>('Установлена сборка Luma OS 1.0.4');
  const [checkingGithub, setCheckingGithub] = useState<boolean>(false);
  const [diagnosticsTime, setDiagnosticsTime] = useState<string>('Готово к проверке');
  const [cryptoKeyVersion, setCryptoKeyVersion] = useState<number>(1);
  const [kernelTab, setKernelTab] = useState<'monitor' | 'rpc' | 'events' | 'code'>('monitor');
  const [lumaRpcMethod, setLumaRpcMethod] = useState<
    'system.ping' | 'widgets.get_data' | 'widgets.list' | 'security.status' | 'security.rotate_key'
  >('system.ping');
  const [rpcCustomParams, setRpcCustomParams] = useState<string>('{}');
  const [rpcHistory, setRpcHistory] = useState<{ id: string; method: string; time: string; ok: boolean }[]>([]);
  const [lumaRpcLiveData, setLumaRpcLiveData] = useState<Record<string, unknown> | null>(null);
  const [kernelEvents, setKernelEvents] = useState<KernelEventEntry[]>([
    {
      id: 'ev_boot',
      time: new Date().toLocaleTimeString('ru-RU'),
      source: 'LumaCore 1.0',
      message: 'Инициализация оболочки Luma OS 1.0.4 и шины IPC 127.0.0.1:49215',
      level: 'success',
    },
  ]);
  const [selectedCodePath, setSelectedCodePath] = useState<string>('luma_kernel_main.go');
  const [codeContent, setCodeContent] = useState<string>('');
  const [codeSearchQuery, setCodeSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Sub-modals
  const [addAppModalOpen, setAddAppModalOpen] = useState<boolean>(false);
  const [customThemeModalOpen, setCustomThemeModalOpen] = useState<boolean>(false);
  const [contextMenuApp, setContextMenuApp] = useState<AppItem | null>(null);
  const [propertiesTarget, setPropertiesTarget] = useState<PropertiesTarget | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add App form
  const [newAppName, setNewAppName] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('');
  const [newAppCategory, setNewAppCategory] = useState('Development');
  const [newAppType, setNewAppType] = useState<AppType>('app');
  const [newAppIcon, setNewAppIcon] = useState('Terminal');

  // Custom Theme Studio form
  const [newThemeName, setNewThemeName] = useState('Luma Custom');
  const [newThemeMode, setNewThemeMode] = useState<'dark' | 'amoled' | 'light'>('dark');
  const [newThemeBg, setNewThemeBg] = useState('#09090b');
  const [newThemeSurface, setNewThemeSurface] = useState('#141418');
  const [newThemeAccent, setNewThemeAccent] = useState('#d71921');

  // Plugin SDK form
  const [newPluginSlug, setNewPluginSlug] = useState('');
  const [newPluginTitle, setNewPluginTitle] = useState('');

  const bcRef = useRef<BroadcastChannel | null>(null);

  const allThemesMap = useMemo<Record<string, CustomThemeConfig>>(
    () => ({ ...THEMES, ...customThemes }),
    [customThemes]
  );
  const currentTheme = allThemesMap[themeKey] || THEMES.nothing_mono;

  const logKernelEvent = (source: string, message: string, level: 'info' | 'success' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString('ru-RU');
    setKernelEvents((prev) => [
      { id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, time, source, message, level },
      ...prev.slice(0, 79),
    ]);
  };

  const pushToast = (title: string, message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    logKernelEvent(title, message, type === 'warning' ? 'warn' : type === 'success' ? 'success' : 'info');
    if (!notificationsEnabled && type !== 'warning') return;
    if (dndEnabled && type !== 'warning') return;
    if (!toastBannersEnabled && type !== 'warning') return;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, title, message, type }]);
    if (notificationSoundEnabled && !isMuted) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = type === 'warning' ? 620 : 880;
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
      } catch {
        // ignore audio autoplay restriction
      }
    }
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // --- DeX Window Controls ---
  const openWindow = (id: DexWinId, tab?: SettingsTabId) => {
    if (id === 'settings' && tab) setSettingsTab(tab);
    zCounterRef.current += 1;
    const nextZ = zCounterRef.current;
    setWindows((prev) => ({
      ...prev,
      [id]: { open: true, minimized: false, z: nextZ },
    }));
    setControlCenterOpen(false);
    setStartMenuOpen(false);
    setTaskListOpen(false);
    setTaskbarAppMenuId(null);
    setTaskbarHostWinPid(null);
    setTaskbarCtxMenu(null);
  };

  const openExplorerAt = (path?: string) => {
    if (path && path.trim()) {
      setExplorerStartPath(path.trim());
      setExplorerKey((k) => k + 1);
    }
    openWindow('explorer');
  };

  const openIslandTab = (tab: typeof islandTab) => {
    setIslandTab(tab);
    openWindow('island');
  };

  const handleRunTerminalCommand = (command: string) => {
    setPendingTermCommand({ id: Date.now(), command });
    openWindow('terminal');
  };

  const toggleTaskbarWindow = (id: DexWinId) => {
    setStartMenuOpen(false);
    setTaskbarCtxMenu(null);
    const cur = windows[id];
    const maxZ = Math.max(...Object.values(windows).map((w) => (w.open && !w.minimized ? w.z : 0)));
    if (!cur.open) {
      openWindow(id);
    } else if (cur.minimized || cur.z < maxZ) {
      openWindow(id);
    } else {
      setWindows((prev) => ({ ...prev, [id]: { ...prev[id], minimized: true } }));
    }
  };

  const focusWindow = (id: DexWinId) => {
    zCounterRef.current += 1;
    const nextZ = zCounterRef.current;
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], z: nextZ } }));
  };

  const minimizeWindow = (id: DexWinId) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], minimized: true } }));
  };

  const closeWindow = (id: DexWinId) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], open: false, minimized: false } }));
  };

  const showDesktop = () => {
    setWindows((prev) => {
      const next = { ...prev };
      (Object.keys(next) as DexWinId[]).forEach((k) => {
        if (next[k].open) next[k] = { ...next[k], minimized: true };
      });
      return next;
    });
    setControlCenterOpen(false);
    setStartMenuOpen(false);
    setTaskbarCtxMenu(null);
  };

  // --- Real Native Win32 + Browser Fullscreen Toggle ---
  const handleToggleFullscreen = async () => {
    const target = !isFullscreen;
    let nativeHandled = false;
    try {
      const r = await fetch('/api/kernel/fullscreen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: target }),
      });
      if (r.ok) {
        const d = await r.json();
        if (typeof d?.fullscreen === 'boolean') {
          setIsFullscreen(d.fullscreen);
          nativeHandled = d.fullscreen === target;
        }
      }
    } catch {
      // fallback to browser fullscreen API
    }
    try {
      if (target && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else if (!target && document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else if (!nativeHandled) {
        setIsFullscreen(target);
      }
    } catch {
      if (!nativeHandled) setIsFullscreen(target);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // --- Clipboard History Manager (Synced with Host OS via /api/kernel/clipboard) ---
  const pushClipboardText = (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;
    lastOsClipRef.current = text;
    const tStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setClipboardHistory((prev) => {
      const existing = prev.find((c) => c.text === text);
      if (existing) {
        return [{ ...existing, time: tStr }, ...prev.filter((c) => c.id !== existing.id)];
      }
      const next: ClipboardEntry = {
        id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        text,
        pinned: false,
        time: tStr,
      };
      const pinned = prev.filter((c) => c.pinned);
      const unpinned = prev.filter((c) => !c.pinned).slice(0, 24);
      return [next, ...pinned, ...unpinned];
    });
  };

  const copyTextToClipboard = async (text: string) => {
    lastOsClipRef.current = text;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore browser permission issues inside WebView2
    }
    try {
      await fetch('/api/kernel/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    } catch {
      // ignore offline
    }
    pushClipboardText(text);
    pushToast('Буфер обмена', text.length > 42 ? `${text.slice(0, 42)}…` : text, 'success');
  };

  const readOsClipboardNow = async (silent = false) => {
    try {
      const r = await fetch('/api/kernel/clipboard');
      if (r.ok) {
        const d = await r.json();
        const txt = typeof d?.text === 'string' ? d.text.trim() : '';
        if (txt && txt !== lastOsClipRef.current) {
          pushClipboardText(txt);
          if (!silent) pushToast('Буфер ОС', 'Считано в Luma Island', 'info');
          return;
        }
        if (!silent) pushToast('Буфер ОС', txt ? 'Уже в истории' : 'Буфер обмена пуст', 'info');
      }
    } catch {
      if (!silent) pushToast('Буфер ОС', 'Недоступно без ядра Luma Core', 'info');
    }
  };

  useEffect(() => {
    if (!islandAutoClipboard) return;
    readOsClipboardNow(true);
    const id = window.setInterval(() => readOsClipboardNow(true), 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [islandAutoClipboard]);

  // --- Sync dark mode, design style, animation preset, ALL 8 THEME RGB CHANNELS, accent, font & UI scale ---
  useEffect(() => {
    document.documentElement.classList.toggle('dark', currentTheme.isDark);
  }, [currentTheme.isDark]);

  useEffect(() => {
    document.documentElement.dataset.design = designStyle;
  }, [designStyle]);

  useEffect(() => {
    document.documentElement.dataset.anim = animationPreset;
  }, [animationPreset]);

  useEffect(() => {
    const root = document.documentElement.style;
    const saverReduce = powerProfile === 'saver' && reduceEffectsOnSaver;
    const clampedOpacity = Math.max(30, Math.min(100, glassOpacity));
    const glassAlpha = glassEnabled ? clampedOpacity / 100 : 0.99;
    const cardAlpha = glassEnabled ? Math.max(0.24, (clampedOpacity - 5) / 100) : 0.99;
    const blurPx = !glassEnabled || saverReduce
      ? '0px'
      : glassIntensity === 'light'
      ? '10px'
      : glassIntensity === 'strong'
      ? '34px'
      : '20px';

    const activeAccent = customAccentOverride || currentTheme.accentHex || '#d71921';
    const activeAccentHover = customAccentOverride ? activeAccent : currentTheme.accentHoverHex || activeAccent;
    const accentRgb = hexToRgbTuple(activeAccent, '215, 25, 33');
    const fallbackSurf = currentTheme.isDark ? '18, 18, 22' : '234, 235, 229';
    const fallbackCard = currentTheme.isDark ? '22, 22, 27' : '240, 241, 236';
    const fallbackBar = currentTheme.isDark ? '12, 12, 15' : '228, 229, 222';
    const surfRgb = currentTheme.surfaceRgb || hexToRgbTuple(currentTheme.cardHex, fallbackSurf);
    const cardRgb = currentTheme.cardRgb || hexToRgbTuple(currentTheme.cardHex, fallbackCard);
    const barRgb = currentTheme.barRgb || surfRgb || fallbackBar;

    const fontStack =
      fontPreset === 'mono'
        ? "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace"
        : fontPreset === 'rounded'
        ? "'Nunito', 'Quicksand', 'Plus Jakarta Sans', 'Segoe UI', sans-serif"
        : "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    root.setProperty('--luma-accent', activeAccent);
    root.setProperty('--luma-accent-hover', activeAccentHover);
    root.setProperty('--luma-accent-soft', `rgba(${accentRgb}, 0.16)`);
    root.setProperty('--luma-accent-border', `rgba(${accentRgb}, 0.46)`);
    root.setProperty('--luma-surface-rgb', surfRgb);
    root.setProperty('--luma-card-rgb', cardRgb);
    root.setProperty('--luma-bar-rgb', barRgb);
    root.setProperty('--luma-glass-alpha', glassAlpha.toFixed(2));
    root.setProperty('--luma-card-alpha', cardAlpha.toFixed(2));
    root.setProperty('--luma-blur', blurPx);
    root.setProperty('--luma-radius', `${cardBorderRadius}px`);
    root.setProperty('--luma-font-family', fontStack);
    root.fontSize = uiScale === 90 ? '14.5px' : uiScale === 110 ? '17.5px' : '16px';
  }, [
    currentTheme,
    customAccentOverride,
    fontPreset,
    uiScale,
    glassEnabled,
    glassOpacity,
    glassIntensity,
    cardBorderRadius,
    powerProfile,
    reduceEffectsOnSaver,
  ]);

  // --- Persist state cleanly ---
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          themeKey,
          customThemes,
          customAccentOverride,
          fontPreset,
          uiScale,
          glassEnabled,
          glassIntensity,
          glassOpacity,
          smoothAnimations,
          animationPreset,
          customDeviceName,
          powerProfile,
          screenBrightness,
          autoSaverThreshold,
          reduceEffectsOnSaver,
          notificationsEnabled,
          toastBannersEnabled,
          notificationSoundEnabled,
          uiDensity,
          cardBorderRadius,
          cardColumns,
          showPluginsInGrid,
          desktopCols,
          wallpaper,
          taskbarPosition,
          taskbarSize,
          taskbarShowLabels,
          taskbarShowHostWindows,
          taskbarShowTelemetry,
          taskbarCenterIcons,
          designStyle,
          clockStyle,
          timeFormat,
          showSeconds,
          showDate,
          clockGlowEnabled,
          clockAccentColor,
          clockGlowIntensity,
          clockBlinkColon,
          adaptiveThemeEnabled,
          dayStartTime,
          nightStartTime,
          dayThemeKey,
          nightThemeKey,
          rightClickBackEnabled,
          apps,
          plugins,
          volume,
          isMuted,
          dynamicIslandEnabled,
          dndEnabled,
          islandPosition,
          islandSize,
          islandShowEq,
          islandShowClip,
          islandShowBattery,
          islandAutoClipboard,
          islandGlowEnabled,
          clipboardHistory: clipboardHistory.slice(0, 30),
          islandScratchpad,
          windowsNotifications: notifications,
          islandPlayers,
          activePlayerIndex,
          mediaPlaying,
          githubAutoUpdate,
          githubRepoUrl,
          groupedViewStyle,
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [
    themeKey,
    customThemes,
    customAccentOverride,
    fontPreset,
    uiScale,
    glassEnabled,
    glassIntensity,
    glassOpacity,
    smoothAnimations,
    animationPreset,
    customDeviceName,
    powerProfile,
    screenBrightness,
    autoSaverThreshold,
    reduceEffectsOnSaver,
    notificationsEnabled,
    toastBannersEnabled,
    notificationSoundEnabled,
    uiDensity,
    cardBorderRadius,
    cardColumns,
    showPluginsInGrid,
    desktopCols,
    wallpaper,
    taskbarPosition,
    taskbarSize,
    taskbarShowLabels,
    taskbarShowHostWindows,
    taskbarShowTelemetry,
    taskbarCenterIcons,
    designStyle,
    clockStyle,
    timeFormat,
    showSeconds,
    showDate,
    clockGlowEnabled,
    clockAccentColor,
    clockGlowIntensity,
    clockBlinkColon,
    adaptiveThemeEnabled,
    dayStartTime,
    nightStartTime,
    dayThemeKey,
    nightThemeKey,
    rightClickBackEnabled,
    apps,
    plugins,
    volume,
    isMuted,
    dynamicIslandEnabled,
    dndEnabled,
    islandPosition,
    islandSize,
    islandShowEq,
    islandShowClip,
    islandShowBattery,
    islandAutoClipboard,
    islandGlowEnabled,
    clipboardHistory,
    islandScratchpad,
    notifications,
    islandPlayers,
    activePlayerIndex,
    mediaPlaying,
    githubAutoUpdate,
    githubRepoUrl,
    groupedViewStyle,
  ]);

  // --- Single Persistent BroadcastChannel ---
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('luma_os_1_0_4_sync');
    bcRef.current = bc;
    bc.onmessage = (ev) => {
      const msg = ev.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.themeKey) setThemeKey((p) => (p === msg.themeKey ? p : msg.themeKey));
      if (typeof msg.dynamicIslandEnabled === 'boolean') setDynamicIslandEnabled(msg.dynamicIslandEnabled);
      if (typeof msg.volume === 'number') setVolume(msg.volume);
      if (typeof msg.isMuted === 'boolean') setIsMuted(msg.isMuted);
    };
    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, []);

  // --- Global Keyboard Shortcuts (F11 Fullscreen, Alt+R Run/Spotlight [EN+RU], Alt+D Show Desktop, Escape) ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyR' || e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'к')) {
        e.preventDefault();
        setSpotlightOpen((v) => !v);
        setStartMenuOpen(false);
        setTaskbarCtxMenu(null);
        return;
      }
      if (e.altKey && (e.code === 'KeyD' || e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'в')) {
        e.preventDefault();
        showDesktop();
        return;
      }
      if (e.key === 'Escape') {
        if (taskbarCtxMenu) setTaskbarCtxMenu(null);
        else if (editingApp) setEditingApp(null);
        else if (propertiesTarget) setPropertiesTarget(null);
        else if (spotlightOpen) setSpotlightOpen(false);
        else if (startMenuOpen) setStartMenuOpen(false);
        else if (controlCenterOpen) setControlCenterOpen(false);
        else if (taskListOpen) setTaskListOpen(false);
        else if (taskbarAppMenuId) setTaskbarAppMenuId(null);
        else if (taskbarHostWinPid !== null) setTaskbarHostWinPid(null);
        else if (contextMenuApp) setContextMenuApp(null);
        else if (addAppModalOpen) setAddAppModalOpen(false);
        else if (customThemeModalOpen) setCustomThemeModalOpen(false);
        else if (selectedAppIds.length > 0) {
          setSelectedAppIds([]);
          setMultiSelectMode(false);
        } else if (desktopEditMode) setDesktopEditMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    taskbarCtxMenu,
    editingApp,
    propertiesTarget,
    spotlightOpen,
    startMenuOpen,
    controlCenterOpen,
    taskListOpen,
    taskbarAppMenuId,
    taskbarHostWinPid,
    contextMenuApp,
    addAppModalOpen,
    customThemeModalOpen,
    selectedAppIds.length,
    desktopEditMode,
    isFullscreen,
  ]);

  // --- Single 1s System Ticker (Clock, Running App Timers, Island Timer/Stopwatch, Adaptive Day/Night) ---
  useEffect(() => {
    const id = window.setInterval(() => {
      const d = new Date();
      setNow(d);

      setApps((prev) => {
        if (!prev.some((a) => a.isRunning)) return prev;
        return prev.map((a) => {
          if (!a.isRunning) return a;
          const nextSec = a.elapsedSeconds + 1;
          const incMin = nextSec % 60 === 0 ? 1 : 0;
          return {
            ...a,
            elapsedSeconds: nextSec,
            todayMinutes: a.todayMinutes + incMin,
            weekMinutes: a.weekMinutes + incMin,
            monthMinutes: a.monthMinutes + incMin,
          };
        });
      });

      if (islandTimerRunning) {
        setIslandTimerRemainingSec((s) => {
          if (s <= 1) {
            setIslandTimerRunning(false);
            return 0;
          }
          return s - 1;
        });
      }
      if (islandStopwatchRunning) {
        setIslandStopwatchSec((s) => s + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [islandTimerRunning, islandStopwatchRunning]);

  // --- Adaptive Day / Night Scheduler ---
  useEffect(() => {
    if (!adaptiveThemeEnabled) return;
    const curMin = now.getHours() * 60 + now.getMinutes();
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const isDay = curMin >= toMin(dayStartTime) && curMin < toMin(nightStartTime);
    const target = isDay ? dayThemeKey : nightThemeKey;
    if (themeKey !== target && allThemesMap[target]) {
      setThemeKey(target);
    }
  }, [adaptiveThemeEnabled, dayStartTime, nightStartTime, dayThemeKey, nightThemeKey, now, themeKey, allThemesMap]);

  // --- Poll REAL Host Telemetry & REAL Running Host OS Windows from Luma Core 1.0 (OS 1.0.4) ---
  const pollSystemTelemetry = async () => {
    try {
      const res = await fetch('/api/kernel/system');
      if (!res.ok) return;
      const snap: LiveSystemTelemetry = await res.json();
      setLiveSystem(snap);
      setKernelConnected(true);
      setCpuLoad(snap.cpu_percent);
      setRamLoad(snap.ram_percent);
      setCpuHistory((p) => [...p.slice(-29), snap.cpu_percent]);
      setRamHistory((p) => [...p.slice(-29), snap.ram_percent]);
      setBatteryLevel(snap.battery_percent);
      setIsCharging(snap.battery_charging);
    } catch {
      setKernelConnected(false);
    }
  };

  const pollHostWindows = async () => {
    try {
      const r = await fetch('/api/kernel/windows');
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d?.windows)) {
        setHostWindows(d.windows);
      }
    } catch {
      // ignore offline
    }
  };

  const handleFocusHostWindow = async (pid: number) => {
    setTaskbarHostWinPid(null);
    setTaskListOpen(false);
    try {
      const r = await fetch('/api/kernel/windows/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid }),
      });
      if (r.ok) {
        const d = await r.json();
        const win = hostWindows.find((w) => w.pid === pid);
        pushToast('Окно ОС', d?.detail || `Переключено на ${win?.title || win?.name || `PID ${pid}`}`, 'info');
      }
    } catch {
      pushToast('Окно ОС', 'Доступно при запуске LumaOS_1.0.4.exe', 'info');
    }
  };

  const handleKillHostProcess = async (pid: number, force = false) => {
    setTaskbarHostWinPid(null);
    try {
      const r = await fetch('/api/kernel/processes/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid, force }),
      });
      if (r.ok) {
        const d = await r.json();
        pushToast('Процесс завершён', d?.detail || `PID ${pid}`, d?.ok ? 'success' : 'warning');
        window.setTimeout(pollHostWindows, 500);
      }
    } catch {
      pushToast('Процессы', 'Ошибка завершения процесса', 'warning');
    }
  };

  useEffect(() => {
    pollSystemTelemetry();
    const intervalMs = powerProfile === 'saver' ? 6000 : powerProfile === 'performance' ? 1500 : 2000;
    const id = window.setInterval(pollSystemTelemetry, intervalMs);
    return () => window.clearInterval(id);
  }, [powerProfile]);

  useEffect(() => {
    pollHostWindows();
    const id = window.setInterval(pollHostWindows, 2500);
    return () => window.clearInterval(id);
  }, []);

  // Auto-enable power saver when battery drops below threshold on battery power
  useEffect(() => {
    if (!isCharging && batteryLevel > 0 && batteryLevel <= autoSaverThreshold && powerProfile !== 'saver') {
      setPowerProfile('saver');
      pushToast('Энергосбережение', `Заряд ${batteryLevel}% — включён режим экономии`, 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batteryLevel, isCharging, autoSaverThreshold]);

  // --- Load source file when Kernel window is open ---
  useEffect(() => {
    if (!windows.kernel.open) return;
    setCodeContent(`// Загрузка ${selectedCodePath}...`);
    fetch(`/${selectedCodePath}`)
      .then((r) => (r.ok ? r.text() : `// Файл ${selectedCodePath} доступен при запуске ядра Luma Core`))
      .then((txt) => setCodeContent(txt))
      .catch(() => setCodeContent(`// Не удалось загрузить ${selectedCodePath}`));
  }, [selectedCodePath, windows.kernel.open]);

  // --- Real OS Media, Audio, Power, Location & RPC Actions ---
  const sendRealMediaCommand = async (action: 'play_pause' | 'next' | 'prev') => {
    try {
      await fetch('/api/kernel/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      window.setTimeout(pollSystemTelemetry, 450);
    } catch {
      // ignore if offline
    }
  };

  const handleToggleMediaPlay = () => {
    setMediaPlaying((v) => !v);
    sendRealMediaCommand('play_pause');
  };

  const handleNextTrack = () => {
    setIslandPlayers((prev) =>
      prev.map((p, i) => {
        if (i !== activePlayerIndex) return p;
        const list = p.playlist?.length ? p.playlist : [{ track: p.track, artist: p.artist }];
        const nextIdx = ((p.trackIndex ?? 0) + 1) % list.length;
        return { ...p, trackIndex: nextIdx, track: list[nextIdx].track, artist: list[nextIdx].artist };
      })
    );
    setMediaPlaying(true);
    sendRealMediaCommand('next');
  };

  const handlePrevTrack = () => {
    setIslandPlayers((prev) =>
      prev.map((p, i) => {
        if (i !== activePlayerIndex) return p;
        const list = p.playlist?.length ? p.playlist : [{ track: p.track, artist: p.artist }];
        const prevIdx = ((p.trackIndex ?? 0) - 1 + list.length) % list.length;
        return { ...p, trackIndex: prevIdx, track: list[prevIdx].track, artist: list[prevIdx].artist };
      })
    );
    setMediaPlaying(true);
    sendRealMediaCommand('prev');
  };

  const handleVolumeChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setVolume(clamped);
    if (clamped > 0 && isMuted) setIsMuted(false);
    bcRef.current?.postMessage({ volume: clamped, isMuted: clamped === 0 });
    if (audioPostTimerRef.current) window.clearTimeout(audioPostTimerRef.current);
    audioPostTimerRef.current = window.setTimeout(() => {
      fetch('/api/kernel/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: clamped, mute: clamped === 0 }),
      }).catch(() => {});
    }, 90);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    bcRef.current?.postMessage({ isMuted: next });
    fetch('/api/kernel/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume, mute: next }),
    }).catch(() => {});
  };

  const handleToggleDynamicIsland = () => {
    setDynamicIslandEnabled((prev) => {
      const next = !prev;
      bcRef.current?.postMessage({ dynamicIslandEnabled: next });
      return next;
    });
  };

  const handleRefreshLocation = async () => {
    try {
      const r = await fetch('/api/kernel/location?refresh=1');
      if (r.ok) {
        const loc = await r.json();
        setLiveSystem((prev) => (prev ? { ...prev, location: loc } : prev));
        if (loc?.city) pushToast('Регион обновлён', `${loc.city}, ${loc.country}`, 'info');
      }
    } catch {
      // ignore
    }
  };

  const handleExecutePowerAction = async (action: 'lock' | 'sleep' | 'recycle_bin') => {
    try {
      const r = await fetch('/api/kernel/power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (r.ok) {
        const d = await r.json();
        pushToast('Питание', d?.detail || `Выполнено: ${action}`, 'info');
      }
    } catch {
      pushToast('Питание', 'Доступно при запуске LumaOS_1.0.4.exe', 'info');
    }
  };

  const handleChangePowerProfile = async (plan: PowerProfile) => {
    setPowerProfile(plan);
    const label = plan === 'performance' ? 'Производительность' : plan === 'saver' ? 'Энергосбережение' : 'Сбалансированный';
    try {
      const r = await fetch('/api/kernel/power-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (r.ok) {
        const d = await r.json();
        pushToast('Профиль питания', d?.detail || label, 'success');
        return;
      }
    } catch {
      // fallback to shell-only power saver
    }
    pushToast('Профиль питания', label, 'info');
  };

  const callLumaKernelRpc = async (method: string, customParamsJson?: string) => {
    let parsedParams: Record<string, unknown> = {};
    if (customParamsJson && customParamsJson.trim()) {
      try {
        parsedParams = JSON.parse(customParamsJson);
      } catch {
        setLumaRpcLiveData({ error: 'Некорректный JSON в поле params' });
        return;
      }
    }
    const time = new Date().toLocaleTimeString('ru-RU');
    try {
      const r = await fetch('/api/kernel/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: parsedParams }),
      });
      if (r.ok) {
        const data = await r.json();
        setLumaRpcLiveData(data.result || data);
        setRpcHistory((p) => [{ id: String(Date.now()), method, time, ok: true }, ...p.slice(0, 14)]);
        logKernelEvent('JSON-RPC', `Вызов ${method} -> OK`, 'success');
        if (method === 'security.rotate_key') setCryptoKeyVersion((v) => v + 1);
      }
    } catch {
      setLumaRpcLiveData({ status: 'offline', method });
      setRpcHistory((p) => [{ id: String(Date.now()), method, time, ok: false }, ...p.slice(0, 14)]);
      logKernelEvent('JSON-RPC', `Вызов ${method} -> OFFLINE`, 'warn');
    }
  };

  const handleLaunchApp = (app: AppItem) => {
    setApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, isRunning: !a.isRunning } : a))
    );
    if (!app.isRunning) {
      fetch('/api/kernel/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, name: app.name, url: app.url, type: app.type, args: app.args || '' }),
      }).catch(() => {});
      pushToast('Запуск', `${app.name} — добавлено на панель задач`, 'info');
    } else if (taskbarAppMenuId === app.id) {
      setTaskbarAppMenuId(null);
    }
  };

  const handleFocusOrRelaunchApp = (app: AppItem) => {
    fetch('/api/kernel/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, name: app.name, url: app.url, type: app.type, args: app.args || '' }),
    }).catch(() => {});
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, isRunning: true } : a)));
    setTaskbarAppMenuId(null);
    setTaskListOpen(false);
    pushToast('Активная задача', `${app.name} выведено на передний план`, 'info');
  };

  const handleStopApp = (appId: string) => {
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, isRunning: false } : a)));
    if (taskbarAppMenuId === appId) setTaskbarAppMenuId(null);
  };

  const handleToggleFavorite = (app: AppItem) => {
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, favorite: !a.favorite } : a)));
  };

  const pinAppsToDesktop = (list: AppItem[]) => {
    if (list.length === 0) return;
    setPendingPinItems({
      id: Date.now(),
      items: list.map((a) => ({
        kind: 'app',
        label: a.name,
        icon: a.icon || 'AppWindow',
        target: a.id,
      })),
    });
  };

  const handleDeleteApp = (app: AppItem) => {
    setApps((prev) => prev.filter((a) => a.id !== app.id));
    setSelectedAppIds((prev) => prev.filter((id) => id !== app.id));
    if (taskbarAppMenuId === app.id) setTaskbarAppMenuId(null);
    pushToast('Удалено', `«${app.name}» удалено из списка приложений`, 'info');
  };

  const handleOpenAppProperties = (app: AppItem) => {
    setPropertiesTarget({
      label: app.name,
      path: app.url || app.package,
      kind: app.type,
      app,
      onDelete: () => handleDeleteApp(app),
      onPinToDesktop: () => pinAppsToDesktop([app]),
    });
  };

  const handlePickAppExecutable = async () => {
    try {
      const r = await fetch('/api/kernel/pick-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'file' }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.picked && d?.path) {
          setNewAppUrl(d.path);
          if (!newAppName.trim() && d.name) {
            setNewAppName(String(d.name).replace(/\.[^/.]+$/, ''));
          }
          setNewAppType('app');
        }
      }
    } catch {
      pushToast('Выбор файла', 'Введите путь вручную или используйте LumaOS_1.0.4.exe', 'info');
    }
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAppName.trim();
    if (!clean) return;
    const nowStr = new Date().toLocaleDateString('ru-RU');
    const created: AppItem = {
      id: `custom_${Date.now()}`,
      name: clean,
      type: newAppType,
      url: newAppUrl.trim() || 'https://example.com',
      package: clean.toLowerCase().replace(/\s+/g, '_'),
      icon: newAppIcon,
      category: newAppCategory,
      installed: true,
      favorite: true,
      custom: true,
      todayMinutes: 0,
      weekMinutes: 0,
      monthMinutes: 0,
      elapsedSeconds: 0,
      isRunning: false,
      dailyLimitMinutes: 120,
      detoxGroup: 'Браузеры',
      installedAt: nowStr,
      version: '1.0.0',
    };
    setApps((prev) => [created, ...prev]);
    setNewAppName('');
    setNewAppUrl('');
    setAddAppModalOpen(false);
    pushToast('Добавлено', `«${clean}» в библиотеке приложений`, 'info');
  };

  const handleSaveEditedApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    setApps((prev) => prev.map((a) => (a.id === editingApp.id ? editingApp : a)));
    pushToast('Приложение обновлено', editingApp.name, 'success');
    setEditingApp(null);
  };

  const handleInstallCatalogPlugin = (item: CatalogPluginItem) => {
    if (plugins.some((p) => p.id === item.id)) return;
    setPlugins((prev) => [
      ...prev,
      {
        id: item.id,
        name: item.name,
        version: item.version,
        author: item.author,
        category: item.category,
        icon: item.icon,
        description: item.description,
        enabled: true,
        file: item.file,
        hooks: item.hooks,
        showInLauncher: true,
        customIntervalSec: 60,
        notificationsEnabled: true,
      },
    ]);
    pushToast('Расширение', `Модуль «${item.name}» установлен`, 'info');
  };

  // --- Computed Values ---
  const combinedApps = useMemo<AppItem[]>(() => {
    if (!showPluginsInGrid) return apps;
    const pluginItems: AppItem[] = plugins
      .filter((p) => p.enabled)
      .map((p) => ({
        id: `plg_${p.id}`,
        name: p.name,
        type: 'plugin' as AppType,
        url: `luma://plugin/${p.id}`,
        package: p.file,
        icon: p.icon || 'Puzzle',
        category: 'Плагины',
        installed: true,
        favorite: false,
        pluginId: p.id,
        todayMinutes: 0,
        weekMinutes: 0,
        monthMinutes: 0,
        elapsedSeconds: 0,
        isRunning: false,
        dailyLimitMinutes: 0,
        detoxGroup: 'Браузеры',
      }));
    return [...apps, ...pluginItems];
  }, [apps, plugins, showPluginsInGrid]);

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = combinedApps.filter((a) => {
      if (currentFilter !== 'all' && a.type !== currentFilter) return false;
      if (appsRunningOnly && !a.isRunning) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.package.toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      if (appsSortBy === 'running') return Number(b.isRunning) - Number(a.isRunning) || a.name.localeCompare(b.name);
      if (appsSortBy === 'usage') return (b.monthMinutes * 60 + b.elapsedSeconds) - (a.monthMinutes * 60 + a.elapsedSeconds);
      if (appsSortBy === 'size') return (b.sizeMb || 0) - (a.sizeMb || 0);
      return a.name.localeCompare(b.name);
    });
  }, [combinedApps, currentFilter, appsRunningOnly, searchQuery, appsSortBy]);

  // --- Multi-Select Interaction & Batch Operations (Apps Window) ---
  const toggleSelectApp = (app: AppItem, shiftKey = false) => {
    if (shiftKey && lastSelectedAppId) {
      const idxA = filteredApps.findIndex((a) => a.id === lastSelectedAppId);
      const idxB = filteredApps.findIndex((a) => a.id === app.id);
      if (idxA !== -1 && idxB !== -1) {
        const [start, end] = idxA < idxB ? [idxA, idxB] : [idxB, idxA];
        const rangeIds = filteredApps.slice(start, end + 1).map((a) => a.id);
        setSelectedAppIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
        setLastSelectedAppId(app.id);
        return;
      }
    }
    setSelectedAppIds((prev) =>
      prev.includes(app.id) ? prev.filter((id) => id !== app.id) : [...prev, app.id]
    );
    setLastSelectedAppId(app.id);
  };

  const handleAppCardClick = (app: AppItem, e: React.MouseEvent) => {
    if (multiSelectMode || e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      if (!multiSelectMode) setMultiSelectMode(true);
      toggleSelectApp(app, e.shiftKey);
      return;
    }
    handleLaunchApp(app);
  };

  const selectedAppsList = useMemo(
    () => combinedApps.filter((a) => selectedAppIds.includes(a.id)),
    [combinedApps, selectedAppIds]
  );

  const handleBatchLaunch = () => {
    const ids = new Set(selectedAppIds);
    const targets = apps.filter((a) => ids.has(a.id));
    setApps((prev) => prev.map((a) => (ids.has(a.id) ? { ...a, isRunning: true } : a)));
    targets.forEach((app) => {
      fetch('/api/kernel/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, name: app.name, url: app.url, type: app.type, args: app.args || '' }),
      }).catch(() => {});
    });
    pushToast('Пакетный запуск', `Запущено приложений: ${targets.length}`, 'success');
    setSelectedAppIds([]);
    setMultiSelectMode(false);
  };

  const handleBatchStop = () => {
    const ids = new Set(selectedAppIds);
    setApps((prev) => prev.map((a) => (ids.has(a.id) ? { ...a, isRunning: false } : a)));
    pushToast('Остановка', `Остановлено приложений: ${ids.size}`, 'info');
    setSelectedAppIds([]);
    setMultiSelectMode(false);
  };

  const handleBatchFavorite = () => {
    const ids = new Set(selectedAppIds);
    const allFav = apps.filter((a) => ids.has(a.id)).every((a) => a.favorite);
    setApps((prev) => prev.map((a) => (ids.has(a.id) ? { ...a, favorite: !allFav } : a)));
    pushToast('Избранное', allFav ? 'Убрано из избранного' : `Добавлено в избранное: ${ids.size}`, 'info');
    setSelectedAppIds([]);
    setMultiSelectMode(false);
  };

  const handleBatchPinDesktop = () => {
    pinAppsToDesktop(selectedAppsList);
    setSelectedAppIds([]);
    setMultiSelectMode(false);
  };

  const handleBatchPackToFolder = () => {
    if (selectedAppsList.length === 0) return;
    setPendingFolderBatch({
      id: Date.now(),
      label: `Подборка (${selectedAppsList.length})`,
      items: selectedAppsList.map((a) => ({
        id: `fe_${a.id}_${Date.now()}`,
        kind: 'app',
        label: a.name,
        icon: a.icon || 'AppWindow',
        target: a.id,
      })),
    });
    setSelectedAppIds([]);
    setMultiSelectMode(false);
  };

  const handleBatchDelete = () => {
    const ids = new Set(selectedAppIds);
    const count = apps.filter((a) => ids.has(a.id)).length;
    setApps((prev) => prev.filter((a) => !ids.has(a.id)));
    setSelectedAppIds([]);
    setMultiSelectMode(false);
    pushToast('Удалено', `Удалено приложений: ${count}`, 'info');
  };

  const groupedApps = useMemo(() => {
    const map: Record<string, AppItem[]> = {};
    filteredApps.forEach((a) => {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    });
    return Object.entries(map);
  }, [filteredApps]);

  const favoriteApps = useMemo(() => filteredApps.filter((a) => a.favorite), [filteredApps]);
  const runningApps = useMemo(() => apps.filter((a) => a.isRunning), [apps]);
  const runningAppsCount = runningApps.length;
  const unreadNotifCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications]);

  const currentIslandPlayer = islandPlayers[activePlayerIndex] || islandPlayers[0];
  const hasLiveOsMedia = Boolean(liveSystem?.media?.available && liveSystem.media.title);
  const displayTrackTitle = hasLiveOsMedia ? liveSystem!.media.title : currentIslandPlayer.track;
  const displayTrackArtist = hasLiveOsMedia
    ? liveSystem!.media.artist || liveSystem!.media.source_app || 'Системный поток'
    : currentIslandPlayer.artist;
  const displayMediaPlaying = hasLiveOsMedia ? liveSystem!.media.is_playing : mediaPlaying;

  const hrs24 = now.getHours();
  const displayHrs = timeFormat === '12' ? String(hrs24 % 12 || 12).padStart(2, '0') : String(hrs24).padStart(2, '0');
  const displayMins = String(now.getMinutes()).padStart(2, '0');
  const displaySecs = String(now.getSeconds()).padStart(2, '0');
  const colon = clockBlinkColon && now.getSeconds() % 2 === 1 ? ' ' : ':';
  const dateShort = `${WEEKDAYS_RU[now.getDay()]} ${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Harmonious Theme-Adaptive Surface Tokens (Cohesive across ALL 8 themes!)
  const isDark = currentTheme.isDark;
  const isPixel = designStyle === 'pixelbook';
  const surfaceCls = isDark
    ? 'bg-white/[0.045] border-white/[0.1] text-zinc-100'
    : 'bg-white/[0.45] border-zinc-900/[0.13] text-zinc-900';
  const btnCls = isDark
    ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-zinc-200'
    : 'bg-zinc-900/[0.06] hover:bg-zinc-900/[0.12] border-zinc-900/[0.15] text-zinc-900';
  const mutedCls = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const popoverShellCls = isPixel
    ? isDark
      ? 'dex-window-pixel-dark text-slate-100 rounded-[24px]'
      : 'dex-window-pixel-light text-slate-900 rounded-[24px]'
    : isDark
    ? 'dex-window-dark text-zinc-100 rounded-2xl'
    : 'dex-window-light text-zinc-900 rounded-2xl';
  const taskbarGlassCls = isPixel
    ? isDark
      ? 'luma-taskbar-pixel-dark border-white/[0.14] text-slate-100'
      : 'luma-taskbar-pixel-light border-zinc-900/[0.14] text-slate-900'
    : isDark
    ? 'luma-taskbar-dark border-white/[0.1] text-zinc-100'
    : 'luma-taskbar-light border-zinc-900/[0.14] text-zinc-900';

  const renderAppIcon = (iconName: string, className = 'w-4 h-4') => {
    const Comp = ICON_MAP[iconName] || AppWindow;
    return <Comp className={className} />;
  };

  // Taskbar pinned + dynamic open windows (now includes Explorer & Task Manager!)
  const taskbarApps: { id: DexWinId; label: string; icon: React.ReactNode; pinned: boolean }[] = [
    { id: 'explorer', label: 'Проводник', icon: <FolderOpen className="w-4 h-4" />, pinned: true },
    { id: 'apps', label: 'Приложения', icon: <AppWindow className="w-4 h-4" />, pinned: true },
    { id: 'terminal', label: 'Терминал', icon: <Terminal className="w-4 h-4" />, pinned: true },
    { id: 'tracker', label: 'Трекер', icon: <BarChart3 className="w-4 h-4" />, pinned: true },
    { id: 'kernel', label: 'Ядро', icon: <Code2 className="w-4 h-4" />, pinned: true },
    { id: 'settings', label: 'Настройки', icon: <Settings className="w-4 h-4" />, pinned: true },
    { id: 'taskmgr', label: 'Диспетчер задач', icon: <Cpu className="w-4 h-4" />, pinned: false },
    { id: 'plugins', label: 'Расширения', icon: <Puzzle className="w-4 h-4" />, pinned: false },
    { id: 'island', label: 'Luma Island', icon: <Disc3 className="w-4 h-4" />, pinned: false },
    { id: 'spaces', label: 'Пространства', icon: <Rocket className="w-4 h-4" />, pinned: false },
  ];

  const openSystemWindowsList = taskbarApps.filter((w) => windows[w.id].open);
  const totalActiveTasksCount =
    openSystemWindowsList.length + runningAppsCount + (taskbarShowHostWindows ? hostWindows.length : 0);
  const topVisibleZ = Math.max(0, ...Object.values(windows).map((w) => (w.open && !w.minimized ? w.z : 0)));

  const taskbarHeightCls = taskbarSize === 'compact' ? 'h-10' : taskbarSize === 'large' ? 'h-14' : 'h-12';
  const taskbarLeftWidthCls = taskbarSize === 'compact' ? 'w-12' : taskbarSize === 'large' ? 'w-16' : 'w-14';

  const handleTaskbarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const menuW = 240;
    const menuH = 230;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 12);
    setTaskbarCtxMenu({ x: Math.max(12, x), y: Math.max(12, y) });
    setStartMenuOpen(false);
    setControlCenterOpen(false);
    setTaskListOpen(false);
    setTaskbarAppMenuId(null);
    setTaskbarHostWinPid(null);
  };

  // Smart Island vertical placement so it never overlaps top or bottom taskbar
  const islandAnchorCls =
    islandPosition === 'bottom'
      ? taskbarPosition === 'bottom'
        ? 'bottom-16'
        : 'bottom-3'
      : taskbarPosition === 'top'
      ? 'top-16'
      : 'top-2.5';

  const islandHeightCls = islandSize === 'compact' ? 'h-7' : islandSize === 'expanded' ? 'h-10' : 'h-8';

  return (
    <div
      onClick={() => {
        if (startMenuOpen) setStartMenuOpen(false);
        if (controlCenterOpen) setControlCenterOpen(false);
        if (taskListOpen) setTaskListOpen(false);
        if (taskbarAppMenuId) setTaskbarAppMenuId(null);
        if (taskbarHostWinPid !== null) setTaskbarHostWinPid(null);
        if (taskbarCtxMenu) setTaskbarCtxMenu(null);
      }}
      className={`relative w-screen h-screen overflow-hidden select-none ${
        isDark ? 'text-zinc-100' : 'text-zinc-900'
      }`}
    >
      {/* ==================== LAYER 1: FULL-VIEWPORT 22×10 (220 CELLS) / 20×10 (200 CELLS) DESKTOP ==================== */}
      <LumaDesktopCanvas
        isDark={isDark}
        accentHex={customAccentOverride || currentTheme.accentHex}
        themeBgGradient={currentTheme.bgGradient}
        designStyle={designStyle}
        onSetDesignStyle={setDesignStyle}
        taskbarPosition={taskbarPosition}
        onSetTaskbarPosition={setTaskbarPosition}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        clockStyle={clockStyle}
        timeFormat={timeFormat}
        showSeconds={showSeconds}
        showDate={showDate}
        clockAccentColor={clockAccentColor}
        clockGlowEnabled={clockGlowEnabled}
        clockGlowIntensity={clockGlowIntensity}
        clockBlinkColon={clockBlinkColon}
        apps={combinedApps}
        iconMap={ICON_MAP}
        liveSystem={liveSystem}
        volume={volume}
        isMuted={isMuted}
        dndEnabled={dndEnabled}
        dynamicIslandEnabled={dynamicIslandEnabled}
        islandPlayers={islandPlayers}
        activePlayerIndex={activePlayerIndex}
        mediaPlaying={mediaPlaying}
        editMode={desktopEditMode}
        onSetEditMode={setDesktopEditMode}
        gridCols={desktopCols}
        onSetGridCols={setDesktopCols}
        wallpaper={wallpaper}
        onSetWallpaper={setWallpaper}
        onOpenSystemWindow={(w) => openWindow(w)}
        onRunTerminalCommand={handleRunTerminalCommand}
        onLaunchApp={handleLaunchApp}
        onToggleMediaPlay={handleToggleMediaPlay}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onToggleMute={handleToggleMute}
        onToggleDnd={() => setDndEnabled((v) => !v)}
        onToggleIsland={handleToggleDynamicIsland}
        onToggleTheme={() => setThemeKey(isDark ? 'nothing_paper' : 'nothing_mono')}
        onRefreshLocation={handleRefreshLocation}
        onPowerAction={handleExecutePowerAction}
        onRotateKey={() => callLumaKernelRpc('security.rotate_key')}
        onPushToast={pushToast}
        pendingPinItems={pendingPinItems}
        onConsumePendingPin={() => setPendingPinItems(null)}
        pendingFolderBatch={pendingFolderBatch}
        onConsumePendingFolderBatch={() => setPendingFolderBatch(null)}
        onInspectProperties={(info) =>
          setPropertiesTarget({
            label: info.label,
            path: info.path,
            kind: info.kind,
            app: info.app,
            onDelete: info.onDelete,
          })
        }
      />

      {/* ==================== LAYER 2: SUPERCHARGED FLOATING LUMA ISLAND PILL (MEDIA + CLIPBOARD + TIMER) ==================== */}
      {dynamicIslandEnabled && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`fixed ${islandAnchorCls} left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5`}
        >
          <div
            onClick={() => openIslandTab('overview')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openIslandTab('overview');
            }}
            style={
              islandGlowEnabled
                ? { boxShadow: '0 0 22px -2px var(--luma-accent-border), 0 12px 28px rgba(0,0,0,0.45)' }
                : undefined
            }
            className={`${islandHeightCls} pl-3 pr-2 rounded-full bg-[#0a0a0c]/95 text-zinc-100 border border-white/15 shadow-xl flex items-center gap-2.5 cursor-pointer whitespace-nowrap`}
          >
            {islandShowEq && displayMediaPlaying ? (
              <div className="flex items-end gap-[2px] h-2.5">
                <span className="w-[2px] h-full bg-[var(--luma-accent)] luma-eq-bar" />
                <span className="w-[2px] h-full bg-white luma-eq-bar luma-eq-bar-2" />
                <span className="w-[2px] h-full bg-[var(--luma-accent)] luma-eq-bar luma-eq-bar-3" />
              </div>
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${dndEnabled ? 'bg-zinc-400' : 'bg-[var(--luma-accent)]'}`} />
            )}

            <span className={`text-[11px] font-mono truncate ${islandSize === 'expanded' ? 'max-w-[240px]' : islandSize === 'compact' ? 'max-w-[120px]' : 'max-w-[175px]'}`}>
              {islandTimerRunning
                ? `⏱ ${formatLiveClock(islandTimerRemainingSec)}`
                : islandStopwatchRunning
                ? `⏱ ${formatLiveClock(islandStopwatchSec)}`
                : displayMediaPlaying || hasLiveOsMedia
                ? displayTrackTitle
                : clipboardHistory[0]?.text
                ? `Буфер: ${clipboardHistory[0].text}`
                : `События: ${unreadNotifCount}`}
            </span>

            {islandShowBattery && islandSize !== 'compact' && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 pl-1.5 border-l border-white/10">
                <BatteryCharging className={`w-3 h-3 ${isCharging ? 'text-[var(--luma-accent)]' : ''}`} />
                {batteryLevel}%
              </span>
            )}

            {islandShowClip && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openIslandTab('clipboard');
                }}
                title={`Буфер обмена Luma Island (${clipboardHistory.length})`}
                className="px-1.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-mono inline-flex items-center gap-1 cursor-pointer transition"
              >
                <Clipboard className="w-3 h-3 text-[var(--luma-accent)]" />
                <span>{clipboardHistory.length}</span>
              </button>
            )}

            {islandShowEq && (
              <div
                className="flex items-center gap-0.5 pl-1.5 border-l border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={handlePrevTrack} className="p-1 rounded-full hover:bg-white/15 cursor-pointer">
                  <SkipBack className="w-3 h-3" />
                </button>
                <button onClick={handleToggleMediaPlay} className="p-1 rounded-full bg-[var(--luma-accent)] text-white cursor-pointer">
                  {displayMediaPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                </button>
                <button onClick={handleNextTrack} className="p-1 rounded-full hover:bg-white/15 cursor-pointer">
                  <SkipForward className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleToggleDynamicIsland}
            title="Скрыть Luma Island"
            className="w-7 h-7 rounded-full bg-[#0a0a0c]/90 text-zinc-400 hover:text-white border border-white/15 flex items-center justify-center cursor-pointer"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ==================== LAYER 3: REAL DRAGGABLE & RESIZABLE DEX WINDOWS ==================== */}

      {/* WINDOW 1: APPS & GROUPED LIBRARY (WITH MULTI-SELECT & PROPERTIES) */}
      {windows.apps.open && !windows.apps.minimized && (
        <DexWindow
          id="apps"
          title="Приложения"
          subtitle={
            selectedAppIds.length > 0
              ? `Выбрано: ${selectedAppIds.length} из ${filteredApps.length}`
              : `${filteredApps.length} элементов · ПКМ: свойства и удаление`
          }
          icon={<AppWindow className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          zIndex={windows.apps.z}
          initialWidth={1060}
          initialHeight={660}
          onFocus={() => focusWindow('apps')}
          onMinimize={() => minimizeWindow('apps')}
          onClose={() => closeWindow('apps')}
        >
          <div className="h-full flex min-h-0">
            {/* Left Sidebar */}
            <aside
              className={`w-60 shrink-0 border-r p-3.5 flex flex-col gap-3 ${
                isDark ? 'border-white/[0.08] bg-white/[0.015]' : 'border-zinc-900/[0.1] bg-zinc-900/[0.03]'
              }`}
            >
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${btnCls}`}>
                <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Фильтр..."
                  className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-0.5 text-xs">
                {(
                  [
                    ['all', 'Все'],
                    ['app', 'Программы'],
                    ['web', 'Веб-сервисы'],
                    ['plugin', 'Плагины'],
                    ['system', 'Система'],
                  ] as const
                ).map(([fk, fl]) => (
                  <button
                    key={fk}
                    onClick={() => setCurrentFilter(fk)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition cursor-pointer ${
                      currentFilter === fk
                        ? 'bg-[var(--luma-accent)] text-white font-semibold'
                        : isDark
                        ? 'text-zinc-300 hover:bg-white/[0.06]'
                        : 'text-zinc-700 hover:bg-zinc-900/[0.06]'
                    }`}
                  >
                    <span>{fl}</span>
                    <span className="text-[10px] font-mono opacity-75">
                      {fk === 'all' ? combinedApps.length : combinedApps.filter((a) => a.type === fk).length}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setAppsRunningOnly((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                  appsRunningOnly ? 'bg-[var(--luma-accent-soft)] border-[var(--luma-accent)] text-[var(--luma-accent)] font-semibold' : btnCls
                }`}
              >
                <span>Только запущенные</span>
                <span className="text-[10px] font-mono font-bold">{runningAppsCount}</span>
              </button>

              <div className={`text-[10px] leading-relaxed px-1 ${mutedCls}`}>
                Ctrl+Клик — выбрать несколько и упаковать в папку на стол. ПКМ — свойства, правка и удаление.
              </div>

              <div className="mt-auto space-y-2">
                <button
                  onClick={() => setAddAppModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-[var(--luma-accent)] hover:bg-[var(--luma-accent-hover)] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить
                </button>
                <button
                  onClick={() => openWindow('plugins')}
                  className={`w-full py-1.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${btnCls}`}
                >
                  <Puzzle className="w-3.5 h-3.5" />
                  Расширения
                </button>
              </div>
            </aside>

            {/* Right Grouped Apps Content + Floating Multi-Select Bar */}
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Библиотека по группам · Активно: {runningAppsCount}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] ${btnCls}`}>
                      <ArrowUpDown className="w-3 h-3 text-[var(--luma-accent)]" />
                      <select
                        value={appsSortBy}
                        onChange={(e) => setAppsSortBy(e.target.value as typeof appsSortBy)}
                        className="bg-transparent outline-none cursor-pointer text-[11px] font-medium"
                      >
                        <option value="name" className="text-black">По имени</option>
                        <option value="running" className="text-black">Запущенные</option>
                        <option value="usage" className="text-black">По времени</option>
                        <option value="size" className="text-black">По весу</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setMultiSelectMode((v) => {
                          if (v) setSelectedAppIds([]);
                          return !v;
                        });
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition ${
                        multiSelectMode || selectedAppIds.length > 0
                          ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                          : btnCls
                      }`}
                    >
                      <ListChecks className="w-3.5 h-3.5" />
                      {multiSelectMode ? `Выбор (${selectedAppIds.length})` : 'Выбрать несколько'}
                    </button>

                    <div className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${btnCls}`}>
                      {(
                        [
                          ['list_and_cards', 'Избранное + Список'],
                          ['list', 'Список'],
                          ['cards', 'Сетка'],
                        ] as const
                      ).map(([m, label]) => (
                        <button
                          key={m}
                          onClick={() => setGroupedViewStyle(m)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                            groupedViewStyle === m ? 'bg-[var(--luma-accent)] text-white' : ''
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Favorites */}
                {groupedViewStyle !== 'list' && favoriteApps.length > 0 && (
                  <section className="space-y-2">
                    <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>
                      Избранное ({favoriteApps.length})
                    </div>
                    <div
                      className="grid gap-2"
                      style={{ gridTemplateColumns: `repeat(${Math.min(cardColumns, 5)}, minmax(0, 1fr))` }}
                    >
                      {favoriteApps.map((app) => {
                        const isSel = selectedAppIds.includes(app.id);
                        return (
                          <div
                            key={app.id}
                            onClick={(e) => handleAppCardClick(app, e)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenuApp(app);
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${surfaceCls} ${
                              isSel
                                ? 'border-[var(--luma-accent)] ring-1 ring-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                : app.isRunning
                                ? 'border-[var(--luma-accent-border)]'
                                : 'hover:border-zinc-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              {renderAppIcon(app.icon, 'w-4 h-4')}
                              <div className="flex items-center gap-1.5">
                                {app.isRunning && <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)]" />}
                                {(multiSelectMode || isSel) && (
                                  <span
                                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                                      isSel
                                        ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                        : 'border-zinc-500/60'
                                    }`}
                                  >
                                    {isSel && <Check className="w-2.5 h-2.5" />}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{app.name}</div>
                              <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                                {formatMonthBadge(app.monthMinutes, app.elapsedSeconds, app.isRunning)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Categories */}
                <div className="space-y-4">
                  {groupedApps.map(([cat, list]) => (
                    <section key={cat} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>
                          {cat} ({list.length})
                        </span>
                      </div>
                      {groupedViewStyle === 'cards' ? (
                        <div
                          className="grid gap-2"
                          style={{ gridTemplateColumns: `repeat(${Math.min(cardColumns, 5)}, minmax(0, 1fr))` }}
                        >
                          {list.map((app) => {
                            const isSel = selectedAppIds.includes(app.id);
                            return (
                              <div
                                key={app.id}
                                onClick={(e) => handleAppCardClick(app, e)}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setContextMenuApp(app);
                                }}
                                className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${surfaceCls} ${
                                  isSel
                                    ? 'border-[var(--luma-accent)] ring-1 ring-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                    : app.isRunning
                                    ? 'border-[var(--luma-accent-border)]'
                                    : 'hover:border-zinc-500'
                                }`}
                              >
                                {(multiSelectMode || isSel) && (
                                  <span
                                    className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border ${
                                      isSel
                                        ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                        : 'border-zinc-500/60'
                                    }`}
                                  >
                                    {isSel && <Check className="w-2.5 h-2.5" />}
                                  </span>
                                )}
                                {renderAppIcon(app.icon, 'w-4 h-4 shrink-0')}
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold truncate">{app.name}</div>
                                  <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                                    {formatMonthBadge(app.monthMinutes, app.elapsedSeconds, app.isRunning)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`rounded-xl border divide-y overflow-hidden ${surfaceCls} ${isDark ? 'divide-white/[0.06]' : 'divide-zinc-900/[0.08]'}`}>
                          {list.map((app) => {
                            const isSel = selectedAppIds.includes(app.id);
                            return (
                              <div
                                key={app.id}
                                onClick={(e) => handleAppCardClick(app, e)}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setContextMenuApp(app);
                                }}
                                className={`px-3.5 ${uiDensity === 'compact' ? 'py-2' : 'py-2.5'} flex items-center justify-between gap-3 cursor-pointer transition ${
                                  isSel
                                    ? 'bg-[var(--luma-accent-soft)]'
                                    : isDark
                                    ? 'hover:bg-white/[0.04]'
                                    : 'hover:bg-zinc-900/[0.04]'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {(multiSelectMode || isSel) && (
                                    <span
                                      className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border ${
                                        isSel
                                          ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                          : 'border-zinc-500/60'
                                      }`}
                                    >
                                      {isSel && <Check className="w-2.5 h-2.5" />}
                                    </span>
                                  )}
                                  {renderAppIcon(app.icon, 'w-4 h-4 shrink-0')}
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold truncate">{app.name}</div>
                                    <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{app.package}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`text-[11px] font-mono ${
                                      app.isRunning ? 'text-[var(--luma-accent)] font-bold' : mutedCls
                                    }`}
                                  >
                                    {formatMonthBadge(app.monthMinutes, app.elapsedSeconds, app.isRunning)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setContextMenuApp(app);
                                    }}
                                    className={`p-1 rounded-md cursor-pointer ${mutedCls} hover:text-current`}
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              </div>

              {/* Sticky Batch Action Bar when 1+ apps selected */}
              {(multiSelectMode || selectedAppIds.length > 0) && (
                <div
                  className={`luma-animate-in shrink-0 px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
                    isDark ? 'border-white/10 bg-black/35' : 'border-zinc-900/10 bg-zinc-900/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-mono">
                    <CheckSquare className="w-4 h-4 text-[var(--luma-accent)]" />
                    <span className="font-bold">Выбрано: {selectedAppIds.length}</span>
                    <button
                      onClick={() => setSelectedAppIds(filteredApps.map((a) => a.id))}
                      className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer ${btnCls}`}
                    >
                      Все
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAppIds([]);
                        setMultiSelectMode(false);
                      }}
                      className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer ${btnCls}`}
                    >
                      Снять
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      disabled={selectedAppIds.length === 0}
                      onClick={handleBatchLaunch}
                      className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white font-semibold disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Запустить
                    </button>
                    <button
                      disabled={selectedAppIds.length === 0}
                      onClick={handleBatchStop}
                      className={`px-2.5 py-1 rounded-lg border disabled:opacity-40 cursor-pointer inline-flex items-center gap-1 ${btnCls}`}
                    >
                      <Square className="w-3 h-3" /> Стоп
                    </button>
                    <button
                      disabled={selectedAppIds.length === 0}
                      onClick={handleBatchFavorite}
                      className={`px-2.5 py-1 rounded-lg border disabled:opacity-40 cursor-pointer inline-flex items-center gap-1 ${btnCls}`}
                    >
                      <Star className="w-3 h-3" /> Избранное
                    </button>
                    <button
                      disabled={selectedAppIds.length === 0}
                      onClick={handleBatchPinDesktop}
                      className={`px-2.5 py-1 rounded-lg border disabled:opacity-40 cursor-pointer inline-flex items-center gap-1 ${btnCls}`}
                    >
                      <Pin className="w-3 h-3" /> На стол
                    </button>
                    <button
                      disabled={selectedAppIds.length === 0}
                      onClick={handleBatchPackToFolder}
                      className={`px-2.5 py-1 rounded-lg border disabled:opacity-40 cursor-pointer inline-flex items-center gap-1 ${btnCls}`}
                    >
                      <FolderPlus className="w-3 h-3 text-[var(--luma-accent)]" /> В папку
                    </button>
                    <button
                      disabled={selectedAppIds.length === 0}
                      onClick={handleBatchDelete}
                      className="px-2.5 py-1 rounded-lg border border-[var(--luma-accent-border)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Удалить
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DexWindow>
      )}

      {/* WINDOW 1B: FULL SYSTEM FILE EXPLORER («ПРОВОДНИК LUMA») */}
      {windows.explorer.open && !windows.explorer.minimized && (
        <DexWindow
          id="explorer"
          title="Проводник Luma"
          subtitle="Системные файлы · Скрытые файлы · Вкладки"
          icon={<FolderOpen className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          zIndex={windows.explorer.z}
          initialWidth={1080}
          initialHeight={660}
          initialX={90}
          initialY={52}
          onFocus={() => focusWindow('explorer')}
          onMinimize={() => minimizeWindow('explorer')}
          onClose={() => closeWindow('explorer')}
        >
          <LumaExplorerWindow
            key={explorerKey}
            initialPath={explorerStartPath}
            isDark={isDark}
            liveSystem={liveSystem}
            surfaceCls={surfaceCls}
            btnCls={btnCls}
            mutedCls={mutedCls}
            popoverShellCls={popoverShellCls}
            onInspectProperties={(target) => setPropertiesTarget(target)}
            onPinToDesktop={(entry) =>
              setPendingPinItems({
                id: Date.now(),
                items: [
                  {
                    kind: entry.is_dir ? 'disk_folder' : 'file',
                    label: entry.name,
                    icon: entry.is_dir ? 'FolderOpen' : 'FileText',
                    target: entry.path,
                  },
                ],
              })
            }
            onPushToast={pushToast}
          />
        </DexWindow>
      )}

      {/* WINDOW 1C: WINDOWS-STYLE TASK MANAGER («ДИСПЕТЧЕР ЗАДАЧ») */}
      {windows.taskmgr.open && !windows.taskmgr.minimized && (
        <DexWindow
          id="taskmgr"
          title="Диспетчер задач"
          subtitle="Процессы Luma OS · Окна ОС · Производительность"
          icon={<Cpu className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          zIndex={windows.taskmgr.z}
          initialWidth={980}
          initialHeight={640}
          initialX={130}
          initialY={62}
          onFocus={() => focusWindow('taskmgr')}
          onMinimize={() => minimizeWindow('taskmgr')}
          onClose={() => closeWindow('taskmgr')}
        >
          <LumaTaskManagerWindow
            isDark={isDark}
            liveSystem={liveSystem}
            cpuLoad={cpuLoad}
            ramLoad={ramLoad}
            kernelConnected={kernelConnected}
            openLumaWindows={openSystemWindowsList.map((w) => ({
              id: w.id,
              label: w.label,
              minimized: windows[w.id].minimized,
            }))}
            runningApps={runningApps}
            hostWindows={hostWindows}
            dynamicIslandEnabled={dynamicIslandEnabled}
            islandAutoClipboard={islandAutoClipboard}
            surfaceCls={surfaceCls}
            btnCls={btnCls}
            mutedCls={mutedCls}
            onFocusLumaWindow={(id) => openWindow(id as DexWinId)}
            onCloseLumaWindow={(id) => closeWindow(id as DexWinId)}
            onFocusLumaApp={handleFocusOrRelaunchApp}
            onStopLumaApp={handleStopApp}
            onFocusHostWindow={handleFocusHostWindow}
            onKillHostProcess={handleKillHostProcess}
            onToggleIsland={handleToggleDynamicIsland}
            onToggleAutoClip={() => setIslandAutoClipboard((v) => !v)}
            onRotateKey={() => callLumaKernelRpc('security.rotate_key')}
            onPushToast={pushToast}
          />
        </DexWindow>
      )}

      {/* WINDOW 2: LUMA TERMINAL PRO */}
      {windows.terminal.open && !windows.terminal.minimized && (
        <DexWindow
          id="terminal"
          title="Терминал Luma Pro"
          subtitle="Multi-Tab · Host Exec · IPC 49215"
          icon={<Terminal className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          zIndex={windows.terminal.z}
          initialWidth={840}
          initialHeight={520}
          initialX={140}
          initialY={80}
          onFocus={() => focusWindow('terminal')}
          onMinimize={() => minimizeWindow('terminal')}
          onClose={() => closeWindow('terminal')}
        >
          <LumaTerminalWindow
            isDark={isDark}
            designStyle={designStyle}
            taskbarPosition={taskbarPosition}
            liveSystem={liveSystem}
            volume={volume}
            isMuted={isMuted}
            dynamicIslandEnabled={dynamicIslandEnabled}
            pendingCommand={pendingTermCommand}
            onConsumePendingCommand={() => setPendingTermCommand(null)}
            onChangeVolume={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onMediaAction={(a) =>
              a === 'next' ? handleNextTrack() : a === 'prev' ? handlePrevTrack() : handleToggleMediaPlay()
            }
            onToggleIsland={handleToggleDynamicIsland}
            onSetThemeMode={(m) => setThemeKey(m === 'light' ? 'nothing_paper' : 'nothing_mono')}
            onSelectTheme={(id) => {
              if (allThemesMap[id]) setThemeKey(id);
            }}
            onSelectAnim={(preset) => setAnimationPreset(preset)}
            onSetDesignStyle={setDesignStyle}
            onSetTaskbarPosition={setTaskbarPosition}
            onToggleFullscreen={handleToggleFullscreen}
            onOpenExplorer={openExplorerAt}
            onOpenTaskMgr={() => openWindow('taskmgr')}
            onPowerAction={handleExecutePowerAction}
            onCallRpc={(m) => callLumaKernelRpc(m)}
            onClipboardUpdated={pushClipboardText}
          />
        </DexWindow>
      )}

      {/* WINDOW 3: SESSION TRACKER */}
      {windows.tracker.open && !windows.tracker.minimized && (
        <DexWindow
          id="tracker"
          title="Трекер времени"
          subtitle="Сессии и лимиты"
          icon={<BarChart3 className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          zIndex={windows.tracker.z}
          initialWidth={860}
          initialHeight={580}
          onFocus={() => focusWindow('tracker')}
          onMinimize={() => minimizeWindow('tracker')}
          onClose={() => closeWindow('tracker')}
        >
          <div className="p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold">Учёт экранного времени (отсчёт с 00:00)</div>
                <div className={`text-xs ${mutedCls}`}>Активных сессий сейчас: {runningAppsCount}</div>
              </div>
              <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${btnCls}`}>
                {(['day', 'week', 'month'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setTrackerPeriod(p)}
                    className={`px-3 py-1 rounded-md text-xs font-mono cursor-pointer ${
                      trackerPeriod === p ? 'bg-[var(--luma-accent)] text-white font-bold' : ''
                    }`}
                  >
                    {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {detoxGroups.map((g) => {
                const used = apps
                  .filter((a) => a.detoxGroup === g.name)
                  .reduce((sum, a) => sum + a.todayMinutes, 0);
                const pct = Math.min(100, Math.round((used / Math.max(1, g.dailyLimitMinutes)) * 100));
                return (
                  <div key={g.name} className={`p-4 rounded-xl border space-y-2 ${surfaceCls}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">{g.name}</span>
                      <span className="font-mono text-zinc-500">
                        {used} / {g.dailyLimitMinutes} мин
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`}>
                      <div className="h-full bg-[var(--luma-accent)]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`rounded-xl border divide-y overflow-hidden ${surfaceCls} ${isDark ? 'divide-white/[0.06]' : 'divide-zinc-200'}`}>
              {[...apps]
                .sort((a, b) => b.elapsedSeconds - a.elapsedSeconds || b.monthMinutes - a.monthMinutes)
                .slice(0, 12)
                .map((app) => {
                  const mins =
                    trackerPeriod === 'day'
                      ? app.todayMinutes
                      : trackerPeriod === 'week'
                      ? app.weekMinutes
                      : app.monthMinutes;
                  return (
                    <div key={app.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        {renderAppIcon(app.icon, 'w-4 h-4 shrink-0')}
                        <span className="font-semibold truncate">{app.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 font-mono">
                        <span className={app.isRunning ? 'text-[var(--luma-accent)] font-bold' : mutedCls}>
                          {app.isRunning ? formatLiveClock(app.elapsedSeconds) : formatDurationRu(mins, app.elapsedSeconds)}
                        </span>
                        <button
                          onClick={() => handleLaunchApp(app)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer ${btnCls}`}
                        >
                          {app.isRunning ? 'Стоп' : 'Старт'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </DexWindow>
      )}

      {/* WINDOW 4: SUPERCHARGED LUMA KERNEL, MONITOR, JSON-RPC, LIVE EVENT LOG & SEARCHABLE CODE */}
      {windows.kernel.open && !windows.kernel.minimized && (
        <DexWindow
          id="kernel"
          title="Ядро LumaCore 1.0 (ПО 1.0.4)"
          subtitle={kernelConnected ? 'CONNECTED · 127.0.0.1:49215' : 'STANDALONE'}
          icon={<Code2 className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          zIndex={windows.kernel.z}
          initialWidth={1040}
          initialHeight={660}
          onFocus={() => focusWindow('kernel')}
          onMinimize={() => minimizeWindow('kernel')}
          onClose={() => closeWindow('kernel')}
        >
          <div className="h-full flex flex-col min-h-0">
            {/* Top Kernel Tabs & EXE Link */}
            <div className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
              <div className={`flex items-center gap-1 p-0.5 rounded-xl border ${btnCls}`}>
                {(
                  [
                    ['monitor', 'Монитор'],
                    ['rpc', 'JSON-RPC 2.0'],
                    ['events', `Журнал (${kernelEvents.length})`],
                    ['code', 'Исходный код'],
                  ] as const
                ).map(([tk, tl]) => (
                  <button
                    key={tk}
                    onClick={() => setKernelTab(tk)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                      kernelTab === tk ? 'bg-[var(--luma-accent)] text-white' : ''
                    }`}
                  >
                    {tl}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openWindow('taskmgr')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold cursor-pointer inline-flex items-center gap-1.5 ${btnCls}`}
                >
                  <Cpu className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                  Диспетчер задач
                </button>
                <a
                  href="/LumaOS_1.0.4.exe"
                  download="LumaOS_1.0.4.exe"
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-mono font-bold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  LumaOS_1.0.4.exe
                </a>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              {kernelTab === 'monitor' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: 'Нагрузка ЦП (Live)', val: `${cpuLoad}%`, sub: liveSystem?.cpu_model || 'Host CPU', hist: cpuHistory },
                      {
                        label: 'Оперативная память (Live)',
                        val: liveSystem ? `${liveSystem.ram_used_gb.toFixed(1)} / ${liveSystem.ram_total_gb.toFixed(1)} ГБ` : `${ramLoad}%`,
                        sub: `${ramLoad}% занято · LumaCore 1.0`,
                        hist: ramHistory,
                      },
                    ].map((g) => {
                      const pts = g.hist.length > 1 ? g.hist : [0, 0];
                      const coords = pts
                        .map((v, i) => `${((i / Math.max(1, pts.length - 1)) * 280).toFixed(1)},${(64 - (Math.min(100, v) / 100) * 58 - 3).toFixed(1)}`)
                        .join(' ');
                      return (
                        <div key={g.label} className={`p-4 rounded-xl border space-y-2 ${surfaceCls}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>{g.label}</span>
                            <span className="text-sm font-mono font-bold text-[var(--luma-accent)]">{g.val}</span>
                          </div>
                          <svg viewBox="0 0 280 64" className="w-full h-16 overflow-visible">
                            <polygon points={`0,64 ${coords} 280,64`} fill="var(--luma-accent-soft)" />
                            <polyline points={coords} fill="none" stroke="var(--luma-accent)" strokeWidth="2" strokeLinejoin="round" />
                          </svg>
                          <div className={`text-[11px] font-mono truncate ${mutedCls}`}>{g.sub}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                    {[
                      ['Версия ПО', '1.0.4'],
                      ['Версия Ядра', '1.0 (LumaCore)'],
                      ['Шина IPC', kernelConnected ? '127.0.0.1:49215' : 'STANDALONE'],
                      ['LumaGuard', `AES-256 #${cryptoKeyVersion}`],
                      ['Окна ОС', String(hostWindows.length)],
                      ['Окна Luma', String(openSystemWindowsList.length)],
                      ['Регион', liveSystem?.location?.city || 'Локально'],
                      ['ОС хоста', liveSystem?.os_name || 'Luma Runtime'],
                    ].map(([k, v]) => (
                      <div key={k} className={`p-3 rounded-xl border ${surfaceCls}`}>
                        <div className={`text-[10px] uppercase ${mutedCls}`}>{k}</div>
                        <div className="font-bold mt-1 truncate">{v}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {kernelTab === 'rpc' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider">JSON-RPC 2.0 Консоль</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(['system.ping', 'widgets.get_data', 'widgets.list', 'security.status', 'security.rotate_key'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setLumaRpcMethod(m);
                              callLumaKernelRpc(m, rpcCustomParams);
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono cursor-pointer ${
                              lumaRpcMethod === m ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={rpcCustomParams}
                        onChange={(e) => setRpcCustomParams(e.target.value)}
                        placeholder='JSON params, напр. {"refresh": true}'
                        className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono outline-none ${btnCls}`}
                      />
                      <button
                        onClick={() => callLumaKernelRpc(lumaRpcMethod, rpcCustomParams)}
                        className="px-4 py-1.5 rounded-lg bg-[var(--luma-accent)] text-white text-xs font-mono font-bold cursor-pointer"
                      >
                        Отправить RPC
                      </button>
                    </div>

                    <pre className={`p-3 rounded-lg border text-[11px] font-mono overflow-x-auto max-h-56 ${isDark ? 'bg-black/40 border-white/10' : 'bg-zinc-900/[0.06] border-zinc-900/15'}`}>
                      {JSON.stringify(
                        lumaRpcLiveData || {
                          kernel: 'LumaCore',
                          kernel_engine_version: '1.0',
                          software_version: '1.0.4',
                          ipc: 'tcp://127.0.0.1:49215',
                          real_telemetry: Boolean(liveSystem?.real_telemetry),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>

                  {rpcHistory.length > 0 && (
                    <div className={`p-4 rounded-xl border space-y-2 ${surfaceCls}`}>
                      <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>История вызовов ({rpcHistory.length})</div>
                      <div className="space-y-1 text-xs font-mono">
                        {rpcHistory.map((h) => (
                          <div key={h.id} className="flex items-center justify-between py-1 border-b border-zinc-500/10 last:border-0">
                            <span>{h.method}</span>
                            <div className="flex items-center gap-2">
                              <span className={mutedCls}>{h.time}</span>
                              <span className={h.ok ? 'text-emerald-500 font-bold' : 'text-[var(--luma-accent)] font-bold'}>
                                {h.ok ? 'OK' : 'ERR'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {kernelTab === 'events' && (
                <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">Живой журнал событий Luma OS</span>
                    <button
                      onClick={() => setKernelEvents([])}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono cursor-pointer ${btnCls}`}
                    >
                      Очистить
                    </button>
                  </div>
                  <div className="space-y-1.5 font-mono text-xs max-h-[420px] overflow-y-auto">
                    {kernelEvents.length === 0 ? (
                      <div className={`py-8 text-center ${mutedCls}`}>Журнал пуст</div>
                    ) : (
                      kernelEvents.map((ev) => (
                        <div key={ev.id} className={`px-3 py-2 rounded-lg border flex items-start justify-between gap-3 ${btnCls}`}>
                          <div className="min-w-0">
                            <span
                              className={`mr-2 font-bold ${
                                ev.level === 'warn'
                                  ? 'text-amber-400'
                                  : ev.level === 'success'
                                  ? 'text-emerald-500'
                                  : 'text-[var(--luma-accent)]'
                              }`}
                            >
                              [{ev.source}]
                            </span>
                            <span className="break-words">{ev.message}</span>
                          </div>
                          <span className={`text-[10px] shrink-0 ${mutedCls}`}>{ev.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {kernelTab === 'code' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-4 space-y-1.5">
                    {PYTHON_PROJECT_FILES.map((f) => (
                      <button
                        key={f.path}
                        onClick={() => setSelectedCodePath(f.path)}
                        className={`w-full p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          selectedCodePath === f.path ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : surfaceCls
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-semibold truncate">{f.path}</span>
                          <FileCode className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className={`lg:col-span-8 rounded-xl border flex flex-col overflow-hidden ${surfaceCls}`}>
                    <div className={`px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs font-mono ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
                      <span>{selectedCodePath}</span>
                      <div className="flex items-center gap-2">
                        <input
                          value={codeSearchQuery}
                          onChange={(e) => setCodeSearchQuery(e.target.value)}
                          placeholder="Поиск в коде..."
                          className={`px-2 py-0.5 rounded border text-[11px] outline-none w-36 ${btnCls}`}
                        />
                        <button
                          onClick={async () => {
                            await copyTextToClipboard(codeContent);
                            setCopiedCode(true);
                            window.setTimeout(() => setCopiedCode(false), 1500);
                          }}
                          className={`px-2 py-0.5 rounded border text-[11px] inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
                        >
                          {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedCode ? 'Скопировано' : 'Копировать'}
                        </button>
                      </div>
                    </div>
                    <pre className="p-3.5 text-[11px] font-mono overflow-auto max-h-96 leading-relaxed">
                      {codeSearchQuery.trim()
                        ? codeContent
                            .split('\n')
                            .map((ln, idx) => ({ ln, num: idx + 1 }))
                            .filter((x) => x.ln.toLowerCase().includes(codeSearchQuery.trim().toLowerCase()))
                            .map((x) => `${String(x.num).padStart(4, ' ')} | ${x.ln}`)
                            .join('\n') || '// Совпадений не найдено'
                        : codeContent}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DexWindow>
      )}

      {/* WINDOW 5: SYSTEM SETTINGS (1.0.4: SEARCH + KERNEL UI + TASKBAR + BLUETOOTH + POWER + STORAGE/HIDDEN FILES + APPS + NOTIFICATIONS + 8 THEMES + PERSONALIZATION) */}
      {windows.settings.open && !windows.settings.minimized && (
        <DexWindow
          id="settings"
          title="Настройки системы"
          subtitle="Luma OS 1.0.4"
          icon={<Settings className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          zIndex={windows.settings.z}
          initialWidth={1060}
          initialHeight={680}
          onFocus={() => focusWindow('settings')}
          onMinimize={() => minimizeWindow('settings')}
          onClose={() => closeWindow('settings')}
        >
          <div className="h-full flex min-h-0">
            {/* Settings Sidebar with Live Search */}
            <aside
              className={`w-60 shrink-0 border-r p-3 flex flex-col gap-2 min-h-0 ${
                isDark ? 'border-white/[0.08] bg-white/[0.015]' : 'border-zinc-900/[0.1] bg-zinc-900/[0.03]'
              }`}
            >
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border shrink-0 ${btnCls}`}>
                <Search className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
                <input
                  value={settingsSearch}
                  onChange={(e) => setSettingsSearch(e.target.value)}
                  placeholder="Поиск настроек..."
                  className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-500"
                />
                {settingsSearch && (
                  <button
                    onClick={() => setSettingsSearch('')}
                    className="text-zinc-500 hover:text-current cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-0.5">
                {(
                  [
                    ['kernel_ui', 'Ядро UI', <Cpu className="w-4 h-4 shrink-0" />, 'ядро ui имя устройства модель версия по 1.0.4 ядра 1.0 host kernel'],
                    ['appearance', 'Темы и Стол', <Sliders className="w-4 h-4 shrink-0" />, 'темы 8 тем акцент шрифт масштаб прозрачность blur размытие скругление анимации стиль nothing pixelbook сетка обои'],
                    ['taskbar', 'Панель задач', <LayoutPanelLeft className="w-4 h-4 shrink-0" />, 'панель задач док снизу слева сверху размер высота подписи окна ос диспетчер задач taskbar'],
                    ['storage', 'Память и Файлы', <HardDrive className="w-4 h-4 shrink-0" />, 'память озу ram диски накопители проводник скрытые файлы storage disk files'],
                    ['bluetooth', 'Bluetooth', <Bluetooth className="w-4 h-4 shrink-0" />, 'bluetooth блютуз беспроводные наушники адаптер устройства'],
                    ['power', 'Энергосбережение', <Leaf className="w-4 h-4 shrink-0" />, 'энергосбережение питание батарея яркость производительность сбалансированный сон power battery'],
                    ['apps_list', 'Приложения', <AppWindow className="w-4 h-4 shrink-0" />, 'приложения программы список удалить свойства вес размер дата скачивания apps'],
                    ['notifications', 'Уведомления', <Bell className="w-4 h-4 shrink-0" />, 'уведомления оповещения звук баннеры dnd не беспокоить журнал notifications'],
                    ['island', 'Luma Island', <Disc3 className="w-4 h-4 shrink-0" />, 'luma island динамический остров буфер обмена заметка эквалайзер таймер'],
                    ['clock', '18 Циферблатов', <Clock className="w-4 h-4 shrink-0" />, 'часы циферблат время секунды дата свечение формат clock'],
                    ['luma', 'Система и Железо', <Activity className="w-4 h-4 shrink-0" />, 'система железо процессор видеокарта cpu gpu регион погода музыка'],
                    ['navigation', 'Навигация', <MousePointerClick className="w-4 h-4 shrink-0" />, 'навигация пкм назад горячие клавиши alt+r spotlight выполнить'],
                    ['plugins', 'Окна и Плагины', <LayoutGrid className="w-4 h-4 shrink-0" />, 'окна плагины колонки сетка расширения'],
                    ['updater', 'Обновления', <Stethoscope className="w-4 h-4 shrink-0" />, 'обновления github диагностика тест ядро'],
                    ['about', 'О системе', <Info className="w-4 h-4 shrink-0" />, 'о системе версия 1.0.4 история изменений changelog exe скачать'],
                  ] as [SettingsTabId, string, React.ReactNode, string][]
                )
                  .filter(([, label, , keywords]) => {
                    const q = settingsSearch.trim().toLowerCase();
                    if (!q) return true;
                    return label.toLowerCase().includes(q) || keywords.includes(q);
                  })
                  .map(([tabId, label, icon]) => (
                    <button
                      key={tabId}
                      onClick={() => setSettingsTab(tabId)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition cursor-pointer ${
                        settingsTab === tabId
                          ? 'bg-[var(--luma-accent)] text-white font-semibold'
                          : isDark
                          ? 'text-zinc-300 hover:bg-white/[0.06]'
                          : 'text-zinc-800 hover:bg-zinc-900/[0.07]'
                      }`}
                    >
                      {icon}
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
              </div>
            </aside>

            {/* Settings Content */}
            <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
              {settingsTab === 'kernel_ui' && (
                <KernelUIPanel
                  liveSystem={liveSystem}
                  customDeviceName={customDeviceName}
                  onChangeCustomDeviceName={setCustomDeviceName}
                  kernelConnected={kernelConnected}
                  surfaceCls={surfaceCls}
                  btnCls={btnCls}
                  mutedCls={mutedCls}
                  isDark={isDark}
                />
              )}

              {settingsTab === 'taskbar' && (
                <div className="space-y-4 text-xs">
                  <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <LayoutPanelLeft className="w-4 h-4 text-[var(--luma-accent)]" />
                        Настройка панели задач
                      </div>
                      <div className={`mt-0.5 ${mutedCls}`}>
                        Положение, размер, отображение открытых приложений ОС и быстрый доступ к Диспетчеру задач
                      </div>
                    </div>
                    <button
                      onClick={() => openWindow('taskmgr')}
                      className="px-3.5 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      Открыть Диспетчер задач
                    </button>
                  </div>

                  <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-4 ${surfaceCls}`}>
                    <div className="space-y-2">
                      <div className={mutedCls}>Расположение на экране:</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            ['bottom', 'Снизу'],
                            ['left', 'Слева'],
                            ['top', 'Сверху'],
                          ] as const
                        ).map(([pos, label]) => (
                          <button
                            key={pos}
                            onClick={() => setTaskbarPosition(pos)}
                            className={`py-2 rounded-xl border font-semibold cursor-pointer ${
                              taskbarPosition === pos ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className={mutedCls}>Размер панели задач:</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            ['compact', 'Компакт'],
                            ['standard', 'Стандарт'],
                            ['large', 'Крупная'],
                          ] as const
                        ).map(([sz, label]) => (
                          <button
                            key={sz}
                            onClick={() => setTaskbarSize(sz)}
                            className={`py-2 rounded-xl border font-semibold cursor-pointer ${
                              taskbarSize === sz ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        label: 'Показывать открытые приложения ОС',
                        sub: `Все запущенные программы ПК на панели (${hostWindows.length} сейчас)`,
                        active: taskbarShowHostWindows,
                        toggle: () => setTaskbarShowHostWindows((v) => !v),
                      },
                      {
                        label: 'Подписи окон на панели',
                        sub: 'Показывать названия рядом с иконками окон',
                        active: taskbarShowLabels,
                        toggle: () => setTaskbarShowLabels((v) => !v),
                      },
                      {
                        label: 'Индикатор CPU / RAM в трее',
                        sub: 'Живые проценты загрузки рядом с часами',
                        active: taskbarShowTelemetry,
                        toggle: () => setTaskbarShowTelemetry((v) => !v),
                      },
                      {
                        label: 'Выравнивание иконок по центру',
                        sub: 'Центрирует панель приложений на широком экране',
                        active: taskbarCenterIcons,
                        toggle: () => setTaskbarCenterIcons((v) => !v),
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        onClick={row.toggle}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${surfaceCls}`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate">{row.label}</div>
                          <div className={`text-[11px] truncate ${mutedCls}`}>{row.sub}</div>
                        </div>
                        <StatusPill active={row.active} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === 'bluetooth' && (
                <BluetoothSettingsPanel
                  surfaceCls={surfaceCls}
                  btnCls={btnCls}
                  mutedCls={mutedCls}
                  onPushToast={pushToast}
                />
              )}

              {settingsTab === 'power' && (
                <PowerSaverPanel
                  powerProfile={powerProfile}
                  onChangePowerProfile={handleChangePowerProfile}
                  screenBrightness={screenBrightness}
                  onChangeScreenBrightness={setScreenBrightness}
                  autoSaverThreshold={autoSaverThreshold}
                  onChangeAutoSaverThreshold={setAutoSaverThreshold}
                  reduceEffectsOnSaver={reduceEffectsOnSaver}
                  onToggleReduceEffectsOnSaver={() => setReduceEffectsOnSaver((v) => !v)}
                  batteryLevel={batteryLevel}
                  isCharging={isCharging}
                  onPowerAction={handleExecutePowerAction}
                  surfaceCls={surfaceCls}
                  btnCls={btnCls}
                  mutedCls={mutedCls}
                />
              )}

              {settingsTab === 'storage' && (
                <StorageMemoryPanel
                  liveSystem={liveSystem}
                  surfaceCls={surfaceCls}
                  btnCls={btnCls}
                  mutedCls={mutedCls}
                  isDark={isDark}
                  onInspectFile={(info) => setPropertiesTarget(info)}
                  onPinFileToDesktop={(entry) =>
                    setPendingPinItems({
                      id: Date.now(),
                      items: [
                        {
                          kind: entry.is_dir ? 'disk_folder' : 'file',
                          label: entry.name,
                          icon: entry.is_dir ? 'Folder' : 'FileText',
                          target: entry.path,
                        },
                      ],
                    })
                  }
                  onOpenInExplorer={openExplorerAt}
                  onPushToast={pushToast}
                />
              )}

              {settingsTab === 'apps_list' && (
                <SettingsAppsListPanel
                  apps={apps}
                  renderAppIcon={renderAppIcon}
                  onLaunchApp={handleLaunchApp}
                  onDeleteApp={handleDeleteApp}
                  onOpenProperties={handleOpenAppProperties}
                  onResetDefaultApps={() => {
                    setApps(INITIAL_APPS);
                    pushToast('Приложения', 'Стандартный список приложений восстановлен', 'info');
                  }}
                  surfaceCls={surfaceCls}
                  btnCls={btnCls}
                  mutedCls={mutedCls}
                  isDark={isDark}
                />
              )}

              {settingsTab === 'notifications' && (
                <SettingsNotificationsPanel
                  notificationsEnabled={notificationsEnabled}
                  onToggleNotificationsEnabled={() => setNotificationsEnabled((v) => !v)}
                  dndEnabled={dndEnabled}
                  onToggleDnd={() => setDndEnabled((v) => !v)}
                  toastBannersEnabled={toastBannersEnabled}
                  onToggleToastBanners={() => setToastBannersEnabled((v) => !v)}
                  notificationSoundEnabled={notificationSoundEnabled}
                  onToggleNotificationSound={() => setNotificationSoundEnabled((v) => !v)}
                  notifications={notifications}
                  onClearNotifications={() => setNotifications([])}
                  onMarkAllRead={() => setNotifications((p) => p.map((x) => ({ ...x, unread: false })))}
                  onSendTestNotification={() => {
                    const tStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    setNotifications((prev) => [
                      {
                        id: `notif_${Date.now()}`,
                        app: 'LumaCore',
                        icon: 'Bell',
                        title: 'Проверка уведомлений Luma OS 1.0.4',
                        message: 'Система оповещений Luma OS 1.0.4 работает штатно.',
                        time: tStr,
                        unread: true,
                      },
                      ...prev,
                    ]);
                    pushToast('Luma OS 1.0.4', 'Тестовое уведомление доставлено', 'success');
                  }}
                  surfaceCls={surfaceCls}
                  btnCls={btnCls}
                  mutedCls={mutedCls}
                />
              )}

              {settingsTab === 'luma' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
                    <div>
                      <div className="text-sm font-bold">Luma OS 1.0.4 · Ядро 1.0</div>
                      <div className={`text-xs font-mono ${mutedCls}`}>
                        {liveSystem?.os_name || 'Luma Runtime'} · {customDeviceName || liveSystem?.hostname || 'host'} · IPC 127.0.0.1:49215
                      </div>
                    </div>
                    <button
                      onClick={handleRefreshLocation}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer inline-flex items-center gap-1.5 ${btnCls}`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Обновить регион
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      ['Процессор', `${liveSystem?.cpu_model || '—'} (${liveSystem?.cpu_cores || 0} яд. · ${cpuLoad}%)`],
                      ['Видеокарта', liveSystem?.gpu_name || '—'],
                      ['Оперативная память', liveSystem ? `${liveSystem.ram_used_gb.toFixed(1)} / ${liveSystem.ram_total_gb.toFixed(1)} ГБ (${ramLoad}%)` : `${ramLoad}%`],
                      ['Регион', liveSystem?.location?.detected ? `${liveSystem.location.city}, ${liveSystem.location.region}, ${liveSystem.location.country}` : 'Автоопределение'],
                      ['Накопители', liveSystem?.disks?.map((d) => `${d.mount} ${d.free_gb.toFixed(1)}/${d.total_gb.toFixed(0)}G`).join(' · ') || '—'],
                      ['Музыка сейчас', hasLiveOsMedia ? `${displayTrackTitle} — ${displayTrackArtist}` : 'Нет активной сессии ОС'],
                    ].map(([k, v]) => (
                      <div key={k} className={`p-3.5 rounded-xl border space-y-1 ${surfaceCls}`}>
                        <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>{k}</div>
                        <div className="font-mono font-semibold break-words">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === 'island' && (
                <div className="space-y-4">
                  <div
                    onClick={handleToggleDynamicIsland}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer ${surfaceCls}`}
                  >
                    <div>
                      <div className="text-sm font-bold">Luma Island (Динамический остров)</div>
                      <div className={`text-xs ${mutedCls}`}>Плавающая капсула с эквалайзером, управлением треками, таймером и буфером обмена</div>
                    </div>
                    <StatusPill active={dynamicIslandEnabled} />
                  </div>

                  {/* Position & Size Controls */}
                  <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs ${surfaceCls}`}>
                    <div className="space-y-1.5">
                      <div className={mutedCls}>Расположение капсулы:</div>
                      <div className="flex gap-1.5">
                        {(
                          [
                            ['top', 'Сверху'],
                            ['bottom', 'Снизу'],
                          ] as const
                        ).map(([pos, label]) => (
                          <button
                            key={pos}
                            onClick={() => setIslandPosition(pos)}
                            className={`flex-1 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                              islandPosition === pos ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className={mutedCls}>Размер капсулы:</div>
                      <div className="flex gap-1">
                        {(
                          [
                            ['compact', 'Компакт'],
                            ['standard', 'Стандарт'],
                            ['expanded', 'Широкий'],
                          ] as const
                        ).map(([sz, label]) => (
                          <button
                            key={sz}
                            onClick={() => setIslandSize(sz)}
                            className={`flex-1 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                              islandSize === sz ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Island Modules & Clipboard Auto-Capture Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {[
                      { label: 'Медиа и эквалайзер', sub: 'Кнопки треков и индикатор звука', active: islandShowEq, toggle: () => setIslandShowEq((v) => !v) },
                      { label: 'Буфер обмена в острове', sub: 'Быстрая кнопка истории клипов', active: islandShowClip, toggle: () => setIslandShowClip((v) => !v) },
                      { label: 'Авто-захват буфера ОС', sub: 'Сохранять скопированное из Windows', active: islandAutoClipboard, toggle: () => setIslandAutoClipboard((v) => !v) },
                      { label: 'Индикатор батареи', sub: 'Показывать заряд в капсуле', active: islandShowBattery, toggle: () => setIslandShowBattery((v) => !v) },
                      { label: 'Подсветка контура', sub: 'Мягкий акцент вокруг капсулы', active: islandGlowEnabled, toggle: () => setIslandGlowEnabled((v) => !v) },
                      { label: 'Режим «Не беспокоить»', sub: 'Скрывать всплывающие уведомления', active: dndEnabled, toggle: () => setDndEnabled((v) => !v) },
                    ].map((row) => (
                      <div
                        key={row.label}
                        onClick={row.toggle}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${surfaceCls}`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate">{row.label}</div>
                          <div className={`text-[11px] truncate ${mutedCls}`}>{row.sub}</div>
                        </div>
                        <StatusPill active={row.active} />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openIslandTab('clipboard')}
                      className="px-4 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      Открыть буфер обмена ({clipboardHistory.length})
                    </button>
                    <button
                      onClick={() => openIslandTab('scratchpad')}
                      className={`px-4 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                      Быстрая заметка
                    </button>
                    <button
                      onClick={() => openIslandTab('overview')}
                      className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
                    >
                      Центр Luma Island
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'appearance' && (
                <div className="space-y-4">
                  {/* Design Style (Nothing vs Pixelbook / Googlebook) & Taskbar Position (Bottom / Left / Top) */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold">Стиль системы и панель задач</div>
                        <div className={`text-xs ${mutedCls}`}>Переключение оболочки Nothing / Pixelbook и стороны дока</div>
                      </div>
                      <button
                        onClick={handleToggleFullscreen}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                          isFullscreen ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                        }`}
                      >
                        {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                        {isFullscreen ? 'Оконный режим' : 'Во весь экран (F11)'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1.5">
                        <div className={mutedCls}>Дизайн оболочки:</div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setDesignStyle('nothing')}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              designStyle === 'nothing'
                                ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                : btnCls
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold font-mono">Nothing</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#d71921]" />
                            </div>
                            <div className={`text-[10px] mt-0.5 ${mutedCls}`}>Монохром, точки, 1px сетка</div>
                          </button>

                          <button
                            onClick={() => setDesignStyle('pixelbook')}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              designStyle === 'pixelbook'
                                ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                : btnCls
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold">Pixelbook</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#4285f4]" />
                            </div>
                            <div className={`text-[10px] mt-0.5 ${mutedCls}`}>Googlebook, плавающая полка</div>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className={mutedCls}>Положение панели задач:</div>
                        <div className="grid grid-cols-3 gap-1.5 h-[54px]">
                          {(
                            [
                              ['bottom', 'Снизу'],
                              ['left', 'Слева'],
                              ['top', 'Сверху'],
                            ] as const
                          ).map(([pos, label]) => (
                            <button
                              key={pos}
                              onClick={() => setTaskbarPosition(pos)}
                              className={`rounded-xl border font-semibold cursor-pointer transition flex flex-col items-center justify-center gap-1 ${
                                taskbarPosition === pos
                                  ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                  : btnCls
                              }`}
                            >
                              <LayoutPanelLeft className={`w-3.5 h-3.5 ${pos === 'bottom' ? '-rotate-90' : pos === 'top' ? 'rotate-90' : ''}`} />
                              <span className="text-[11px]">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Grid 22x10 / 20x10 & Wallpaper */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="text-sm font-bold">Рабочий стол (200–220 ячеек)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1.5">
                        <div className={mutedCls}>Размер сетки:</div>
                        <div className="flex gap-1">
                          {([22, 20] as const).map((c) => (
                            <button
                              key={c}
                              onClick={() => setDesktopCols(c)}
                              className={`flex-1 py-1.5 rounded-lg border font-mono font-bold cursor-pointer ${
                                desktopCols === c ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                              }`}
                            >
                              {c}×10 ({c * 10})
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className={mutedCls}>Покрытие фона:</div>
                        <div className="flex gap-1">
                          {(
                            [
                              ['dots', 'Точки'],
                              ['grid', 'Сетка'],
                              ['matte', 'Мат'],
                            ] as const
                          ).map(([wKey, wLabel]) => (
                            <button
                              key={wKey}
                              onClick={() => setWallpaper(wKey)}
                              className={`flex-1 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                wallpaper === wKey ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                              }`}
                            >
                              {wLabel}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className={mutedCls}>Плотность списков:</div>
                        <div className="flex gap-1">
                          {(
                            [
                              ['comfortable', 'Комфорт'],
                              ['compact', 'Компакт'],
                            ] as const
                          ).map(([dKey, dLabel]) => (
                            <button
                              key={dKey}
                              onClick={() => setUiDensity(dKey)}
                              className={`flex-1 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                uiDensity === dKey ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                              }`}
                            >
                              {dLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selectable Animation Presets (Standard + 3 Variants) */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Zap className="w-4 h-4 text-[var(--luma-accent)]" />
                          Анимации интерфейса
                        </div>
                        <div className={`text-xs ${mutedCls}`}>
                          Выбор физики открытия окон, меню «Пуск», карточек и всплывающих панелей
                        </div>
                      </div>
                      <span className="text-[11px] font-mono uppercase text-[var(--luma-accent)] font-bold">
                        {animationPreset}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {(
                        [
                          { id: 'standard', title: 'Стандарт', desc: 'Быстрый системный отклик' },
                          { id: 'spring', title: 'Пружина', desc: 'Упругий импульс и отскок' },
                          { id: 'glide', title: 'Плавный поток', desc: 'Мягкий выход с фокусом' },
                          { id: 'none', title: 'Выкл', desc: 'Мгновенно без анимаций' },
                        ] as { id: AnimationPreset; title: string; desc: string }[]
                      ).map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setAnimationPreset(preset.id);
                            pushToast('Анимации', `Режим: ${preset.title}`, 'info');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            animationPreset === preset.id
                              ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                              : btnCls
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between gap-1">
                            <span>{preset.title}</span>
                            {animationPreset === preset.id && (
                              <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)] shrink-0" />
                            )}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{preset.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Adaptive Day / Night */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div
                      onClick={() => setAdaptiveThemeEnabled((v) => !v)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-sm font-bold">Адаптивная тема День / Ночь</div>
                        <div className={`text-xs ${mutedCls}`}>Автоматическое переключение темы по расписанию</div>
                      </div>
                      <StatusPill active={adaptiveThemeEnabled} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <select value={dayStartTime} onChange={(e) => setDayStartTime(e.target.value)} className={`px-2.5 py-1.5 rounded-lg border font-mono ${btnCls}`}>
                        {['05:00', '06:00', '07:00', '08:00', '09:00', '10:00'].map((t) => (
                          <option key={t} value={t}>День {t}</option>
                        ))}
                      </select>
                      <select value={nightStartTime} onChange={(e) => setNightStartTime(e.target.value)} className={`px-2.5 py-1.5 rounded-lg border font-mono ${btnCls}`}>
                        {['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map((t) => (
                          <option key={t} value={t}>Ночь {t}</option>
                        ))}
                      </select>
                      <select value={dayThemeKey} onChange={(e) => setDayThemeKey(e.target.value)} className={`px-2.5 py-1.5 rounded-lg border ${btnCls}`}>
                        {Object.entries(allThemesMap).map(([k, v]) => (
                          <option key={k} value={k}>{v.name}</option>
                        ))}
                      </select>
                      <select value={nightThemeKey} onChange={(e) => setNightThemeKey(e.target.value)} className={`px-2.5 py-1.5 rounded-lg border ${btnCls}`}>
                        {Object.entries(allThemesMap).map(([k, v]) => (
                          <option key={k} value={k}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* All 8 Harmonious Redesigned Themes + Custom Theme Studio */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Palette className="w-4 h-4 text-[var(--luma-accent)]" />
                          Темы оформления ({Object.keys(allThemesMap).length})
                        </div>
                        <div className={`text-xs ${mutedCls}`}>
                          Все 8 тем полностью переработаны с единым фоном, акцентным цветом и гармоничными окнами
                        </div>
                      </div>
                      <button
                        onClick={() => setCustomThemeModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--luma-accent)] text-white text-xs font-semibold cursor-pointer shrink-0"
                      >
                        + Своя тема
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {Object.entries(allThemesMap).map(([tKey, th]) => {
                        const sel = themeKey === tKey;
                        return (
                          <button
                            key={tKey}
                            onClick={() => {
                              setThemeKey(tKey);
                              setCustomAccentOverride('');
                            }}
                            className={`rounded-xl border overflow-hidden text-left transition cursor-pointer flex flex-col ${
                              sel ? 'border-[var(--luma-accent)] ring-1 ring-[var(--luma-accent)]' : btnCls
                            }`}
                          >
                            {/* Live Gradient & Mini Window Swatch */}
                            <div
                              className="h-14 w-full p-2 flex items-end justify-between relative"
                              style={{ background: th.bgGradient }}
                            >
                              <div
                                className="w-10 h-6 rounded-md border border-white/15 shadow-sm"
                                style={{ backgroundColor: th.cardHex }}
                              />
                              <span
                                className="w-4 h-4 rounded-full border-2 border-white/80 shadow"
                                style={{ backgroundColor: th.accentHex }}
                              />
                            </div>
                            <div className="p-2.5 space-y-0.5 flex-1 flex flex-col justify-between">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold truncate">{th.name}</span>
                                {sel && <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)] shrink-0" />}
                              </div>
                              <div className={`text-[10px] leading-snug line-clamp-2 ${mutedCls}`}>
                                {th.description || (th.isDark ? 'Тёмная тема' : 'Светлая матовая тема')}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Extra Personalization: Custom Accent Override, Font Family & UI Scale */}
                  <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs ${surfaceCls}`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={mutedCls}>Свой акцентный цвет:</span>
                        {customAccentOverride && (
                          <button
                            onClick={() => setCustomAccentOverride('')}
                            className="text-[10px] font-mono text-[var(--luma-accent)] cursor-pointer hover:underline"
                          >
                            Авто
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {['#d71921', '#3b82f6', '#a855f7', '#10b981', '#e11d48', '#f59e0b', '#06b6d4', '#ec4899'].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setCustomAccentOverride(hex)}
                            className={`w-5 h-5 rounded-full border cursor-pointer transition ${
                              customAccentOverride.toLowerCase() === hex ? 'ring-2 ring-current scale-110' : 'border-zinc-500/40'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={customAccentOverride || currentTheme.accentHex}
                          onChange={(e) => setCustomAccentOverride(e.target.value)}
                          className="w-6 h-5 cursor-pointer bg-transparent"
                          title="Выбрать произвольный цвет акцента"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className={`inline-flex items-center gap-1 ${mutedCls}`}>
                        <Type className="w-3.5 h-3.5" /> Шрифт интерфейса:
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            ['sans', 'Sans'],
                            ['mono', 'Mono'],
                            ['rounded', 'Мягкий'],
                          ] as const
                        ).map(([fk, fl]) => (
                          <button
                            key={fk}
                            onClick={() => setFontPreset(fk)}
                            className={`py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                              fontPreset === fk ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                            }`}
                          >
                            {fl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className={mutedCls}>Масштаб интерфейса:</div>
                      <div className="grid grid-cols-3 gap-1 font-mono">
                        {([90, 100, 110] as const).map((sc) => (
                          <button
                            key={sc}
                            onClick={() => setUiScale(sc)}
                            className={`py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                              uiScale === sc ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                            }`}
                          >
                            {sc}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* LIVE WORKING Glass Opacity, Blur & Radius Sliders */}
                  <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs ${surfaceCls}`}>
                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono">
                        <span className={mutedCls}>Непрозрачность</span>
                        <span className="font-bold text-[var(--luma-accent)]">{glassOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={100}
                        value={glassOpacity}
                        onChange={(e) => {
                          setGlassEnabled(true);
                          setGlassOpacity(Number(e.target.value));
                        }}
                        className="w-full"
                      />
                      <div className={`text-[10px] ${mutedCls}`}>
                        Регулирует реальную прозрачность окон, панели и виджетов
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono">
                        <span className={mutedCls}>Скругление</span>
                        <span>{cardBorderRadius}px</span>
                      </div>
                      <input type="range" min={8} max={28} value={cardBorderRadius} onChange={(e) => setCardBorderRadius(Number(e.target.value))} className="w-full" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono">
                        <span className={mutedCls}>Размытие (Blur)</span>
                        <span className="uppercase">{glassIntensity}</span>
                      </div>
                      <div className="flex gap-1">
                        {(['light', 'medium', 'strong'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setGlassIntensity(lvl)}
                            className={`flex-1 py-1 rounded-lg border text-[10px] font-mono cursor-pointer ${
                              glassIntensity === lvl ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-bold' : btnCls
                            }`}
                          >
                            {lvl === 'light' ? 'Слаб.' : lvl === 'medium' ? 'Сред.' : 'Сильн.'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={`sm:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2 border-t ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
                      <button onClick={() => setGlassEnabled((v) => !v)} className="flex items-center gap-2 cursor-pointer">
                        <span className={mutedCls}>Стеклянный слой:</span>
                        <StatusPill active={glassEnabled} />
                      </button>
                      <button onClick={() => setSmoothAnimations((v) => !v)} className="flex items-center gap-2 cursor-pointer">
                        <span className={mutedCls}>Плавные переходы:</span>
                        <StatusPill active={smoothAnimations} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'clock' && (
                <div className="space-y-4">
                  {/* LIVE INTERACTIVE CLOCK PREVIEW (Synchronized 1:1 with Desktop Clock Widget & Taskbar!) */}
                  <div className={`p-4 rounded-xl border ${surfaceCls}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                        Живой предпросмотр (мгновенно применяется на рабочем столе)
                      </span>
                      <span className="text-xs font-mono font-bold text-[var(--luma-accent)]">
                        {CLOCK_STYLE_OPTIONS.find((o) => o.id === clockStyle)?.label}
                      </span>
                    </div>
                    <div
                      className={`h-32 rounded-2xl border p-4 overflow-hidden ${
                        isDark ? 'bg-[#09090b] border-white/10' : 'bg-[#d6d7d1] border-zinc-400/60'
                      }`}
                    >
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
                        compact
                      />
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold">18 циферблатов Luma</div>
                      <span className={`text-[11px] font-mono ${mutedCls}`}>Выберите стиль</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                      {CLOCK_STYLE_OPTIONS.map((opt) => {
                        const sel = clockStyle === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setClockStyle(opt.id)}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                              sel ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : btnCls
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold truncate">{opt.label}</span>
                              {sel && <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)] shrink-0" />}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500">{opt.sample}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border space-y-3 text-xs ${surfaceCls}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button onClick={() => setTimeFormat(timeFormat === '24' ? '12' : '24')} className={`p-2.5 rounded-lg border font-mono cursor-pointer ${btnCls}`}>
                        Формат: {timeFormat}ч
                      </button>
                      <button onClick={() => setShowSeconds((v) => !v)} className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between ${btnCls}`}>
                        <span>Секунды</span>
                        <StatusPill active={showSeconds} />
                      </button>
                      <button onClick={() => setShowDate((v) => !v)} className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between ${btnCls}`}>
                        <span>Дата</span>
                        <StatusPill active={showDate} />
                      </button>
                      <button onClick={() => setClockBlinkColon((v) => !v)} className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between ${btnCls}`}>
                        <span>Мигание</span>
                        <StatusPill active={clockBlinkColon} />
                      </button>
                      <button onClick={() => setClockGlowEnabled((v) => !v)} className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between ${btnCls}`}>
                        <span>Свечение</span>
                        <StatusPill active={clockGlowEnabled} />
                      </button>
                      <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${btnCls}`}>
                        <span className={mutedCls}>Акцент:</span>
                        <div className="flex items-center gap-1">
                          {['#d71921', '#4285f4', '#10b981', '#f59e0b', '#ffffff'].map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setClockAccentColor(hex)}
                              className={`w-4 h-4 rounded-full border cursor-pointer ${
                                clockAccentColor.toLowerCase() === hex ? 'ring-2 ring-current' : 'border-zinc-500/40'
                              }`}
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                          <input type="color" value={clockAccentColor} onChange={(e) => setClockAccentColor(e.target.value)} className="w-6 h-5 cursor-pointer bg-transparent" />
                        </div>
                      </div>
                    </div>

                    {clockGlowEnabled && (
                      <div className="space-y-1 pt-2 border-t border-white/10">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span className={mutedCls}>Интенсивность свечения</span>
                          <span>{clockGlowIntensity}px</span>
                        </div>
                        <input
                          type="range"
                          min={4}
                          max={32}
                          value={clockGlowIntensity}
                          onChange={(e) => setClockGlowIntensity(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {settingsTab === 'navigation' && (
                <div className="space-y-3">
                  <div
                    onClick={() => setRightClickBackEnabled((v) => !v)}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer ${surfaceCls}`}
                  >
                    <div>
                      <div className="text-sm font-bold">ПКМ «Назад» и горячие клавиши</div>
                      <div className={`text-xs ${mutedCls}`}>
                        Быстрый возврат и закрытие панелей. Работают Alt+R (Выполнить / Spotlight, EN и RU), Alt+D (Рабочий стол), F11 (Полный экран) и Escape.
                      </div>
                    </div>
                    <StatusPill active={rightClickBackEnabled} />
                  </div>
                </div>
              )}

              {settingsTab === 'plugins' && (
                <div className="space-y-3">
                  <div
                    onClick={() => setShowPluginsInGrid((v) => !v)}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer ${surfaceCls}`}
                  >
                    <div>
                      <div className="text-sm font-bold">Показывать плагины в окне Приложений</div>
                      <div className={`text-xs ${mutedCls}`}>Активные модули отображаются в группе «Плагины»</div>
                    </div>
                    <StatusPill active={showPluginsInGrid} />
                  </div>

                  <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${surfaceCls}`}>
                    <span className="font-bold">Колонок в карточках приложений</span>
                    <div className="flex gap-1.5">
                      {[3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setCardColumns(n)}
                          className={`w-8 h-8 rounded-lg border font-mono font-bold cursor-pointer ${
                            cardColumns === n ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'updater' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Github className="w-4 h-4" />
                          GitHub (Tveexty/L_H-3.0)
                        </div>
                        <div className={`text-xs ${mutedCls}`}>{githubUpdateStatus}</div>
                      </div>
                      <button onClick={() => setGithubAutoUpdate((v) => !v)} className="cursor-pointer">
                        <StatusPill active={githubAutoUpdate} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={githubRepoUrl}
                        onChange={(e) => setGithubRepoUrl(e.target.value)}
                        className={`flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border text-xs font-mono ${btnCls}`}
                      />
                      <button
                        onClick={async () => {
                          setCheckingGithub(true);
                          let ver = '1.0.4';
                          try {
                            const r = await fetch('/api/kernel/status');
                            if (r.ok) {
                              const j = await r.json();
                              if (j?.version) ver = j.version;
                            }
                          } catch {
                            // ignore
                          }
                          setCheckingGithub(false);
                          setGithubUpdateStatus(`Актуальная сборка: Luma OS ${ver} (${new Date().toLocaleTimeString('ru-RU')})`);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[var(--luma-accent)] text-white text-xs font-semibold cursor-pointer"
                      >
                        {checkingGithub ? 'Проверка...' : 'Проверить'}
                      </button>
                      <a
                        href={githubRepoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 ${btnCls}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        GitHub
                      </a>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold">Диагностика служб</div>
                        <div className={`text-xs ${mutedCls}`}>{diagnosticsTime}</div>
                      </div>
                      <button
                        onClick={async () => {
                          await callLumaKernelRpc('system.ping');
                          await handleRefreshLocation();
                          setDiagnosticsTime(`OK · ${new Date().toLocaleTimeString('ru-RU')}`);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${btnCls}`}
                      >
                        Запустить тест
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      {[
                        ['Ядро LumaCore 1.0', kernelConnected ? 'ONLINE · 49215' : 'FALLBACK'],
                        ['LumaGuard', `AES-256-GCM #${cryptoKeyVersion}`],
                        ['Телеметрия', `CPU ${cpuLoad}% · RAM ${ramLoad}%`],
                        ['Окна ОС на панели', `${hostWindows.length} активн.`],
                      ].map(([k, v]) => (
                        <div key={k} className={`p-2.5 rounded-lg border flex items-center justify-between ${btnCls}`}>
                          <span>{k}</span>
                          <span className="text-emerald-500 font-bold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ABOUT + COMPLETE VERSION HISTORY (WITH 1.0.4) */}
              {settingsTab === 'about' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
                    <div>
                      <div className="text-base font-extrabold font-mono">LUMA OS 1.0.4</div>
                      <div className={`text-xs ${mutedCls}`}>
                        Настольная оболочка · Сетка {desktopCols}×10 ({desktopCols * 10} ячеек) · Ядро LumaCore 1.0
                      </div>
                    </div>
                    <a
                      href="/LumaOS_1.0.4.exe"
                      download="LumaOS_1.0.4.exe"
                      className="px-3.5 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-mono font-bold inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      LumaOS_1.0.4.exe
                    </a>
                  </div>

                  <div className={`p-3.5 rounded-xl border space-y-2 ${surfaceCls}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">История версий ({Object.keys(VERSION_HISTORY).length})</span>
                      <button
                        onClick={() => setChangelogFilter('all')}
                        className={`px-2 py-0.5 rounded font-mono text-[11px] cursor-pointer ${
                          changelogFilter === 'all' ? 'bg-[var(--luma-accent)] text-white' : btnCls
                        }`}
                      >
                        Все
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(VERSION_HISTORY).map((v) => (
                        <button
                          key={v}
                          onClick={() => setChangelogFilter(v)}
                          className={`px-2 py-0.5 rounded font-mono text-[11px] cursor-pointer ${
                            changelogFilter === v ? 'bg-[var(--luma-accent)] text-white font-bold' : btnCls
                          }`}
                        >
                          v{v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {Object.entries(VERSION_HISTORY)
                    .filter(([ver]) => changelogFilter === 'all' || changelogFilter === ver)
                    .map(([ver, items]) => (
                      <div
                        key={ver}
                        className={`p-4 rounded-xl border space-y-2 ${
                          ver === '1.0.4' ? 'border-[var(--luma-accent)]/60 bg-[var(--luma-accent)]/[0.06]' : surfaceCls
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold">
                            Версия {ver}
                          </span>
                          {ver === '1.0.4' && <StatusPill active={true} />}
                        </div>
                        <ul className="space-y-1 text-xs leading-relaxed">
                          {items.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </DexWindow>
      )}

      {/* WINDOW 6: PLUGINS MANAGER & STORE */}
      {windows.plugins.open && !windows.plugins.minimized && (
        <DexWindow
          id="plugins"
          title="Расширения"
          subtitle={`${plugins.filter((p) => p.enabled).length} активных`}
          icon={<Puzzle className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          zIndex={windows.plugins.z}
          initialWidth={860}
          initialHeight={580}
          onFocus={() => focusWindow('plugins')}
          onMinimize={() => minimizeWindow('plugins')}
          onClose={() => closeWindow('plugins')}
        >
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Установленные модули</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {plugins.map((p) => (
                  <div key={p.id} className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${surfaceCls}`}>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{p.name}</div>
                      <div className={`text-[11px] truncate ${mutedCls}`}>{p.description}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          setPlugins((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled: !x.enabled } : x)))
                        }
                        className="cursor-pointer"
                      >
                        <StatusPill active={p.enabled} />
                      </button>
                      <button
                        onClick={() => setPlugins((prev) => prev.filter((x) => x.id !== p.id))}
                        className="p-1.5 rounded-lg hover:bg-[var(--luma-accent-soft)] text-zinc-500 hover:text-[var(--luma-accent)] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Каталог расширений</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {PLUGIN_CATALOG.map((item) => {
                  const installed = plugins.some((p) => p.id === item.id);
                  return (
                    <div key={item.id} className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${surfaceCls}`}>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{item.name}</div>
                        <div className={`text-[11px] truncate ${mutedCls}`}>{item.description}</div>
                      </div>
                      <button
                        disabled={installed}
                        onClick={() => handleInstallCatalogPlugin(item)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono shrink-0 cursor-pointer ${
                          installed ? `${btnCls} opacity-50` : 'bg-[var(--luma-accent)] text-white font-bold'
                        }`}
                      >
                        {installed ? 'OK' : 'Установить'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
              <div className="text-xs font-bold">Создать собственный модуль (Luma SDK)</div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={newPluginSlug}
                  onChange={(e) => setNewPluginSlug(e.target.value)}
                  placeholder="ID (например LumaSync)"
                  className={`flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border text-xs font-mono ${btnCls}`}
                />
                <input
                  value={newPluginTitle}
                  onChange={(e) => setNewPluginTitle(e.target.value)}
                  placeholder="Название модуля"
                  className={`flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border text-xs ${btnCls}`}
                />
                <button
                  onClick={() => {
                    const slug = newPluginSlug.trim().replace(/[^a-zA-Z0-9_]/g, '');
                    if (!slug) return;
                    setPlugins((prev) => [
                      ...prev,
                      {
                        id: slug.toLowerCase(),
                        name: newPluginTitle.trim() || slug,
                        version: '1.0.4',
                        author: 'Luma SDK',
                        category: 'Пользовательские',
                        icon: 'Puzzle',
                        description: 'Пользовательский модуль Luma Core',
                        enabled: true,
                        file: `plugins/${slug}.luma`,
                        hooks: ['OnInitialize', 'OnTick'],
                        showInLauncher: true,
                        customIntervalSec: 60,
                        notificationsEnabled: true,
                      },
                    ]);
                    setNewPluginSlug('');
                    setNewPluginTitle('');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--luma-accent)] text-white text-xs font-semibold cursor-pointer"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        </DexWindow>
      )}

      {/* WINDOW 7: SUPERCHARGED LUMA ISLAND HUB (MEDIA + CLIPBOARD MANAGER + SCRATCHPAD + TIMER + SETTINGS) */}
      {windows.island.open && !windows.island.minimized && (
        <DexWindow
          id="island"
          title="Luma Island"
          subtitle="Буфер обмена, медиа, заметка, таймер"
          icon={<Disc3 className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          zIndex={windows.island.z}
          initialWidth={780}
          initialHeight={560}
          onFocus={() => focusWindow('island')}
          onMinimize={() => minimizeWindow('island')}
          onClose={() => closeWindow('island')}
        >
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={`flex flex-wrap items-center gap-1 p-0.5 rounded-lg border ${btnCls}`}>
                {(
                  [
                    ['overview', 'Обзор'],
                    ['clipboard', `Буфер (${clipboardHistory.length})`],
                    ['scratchpad', 'Заметка'],
                    ['player', 'Медиа'],
                    ['notifications', `События (${notifications.length})`],
                    ['timer', 'Таймер'],
                    ['stopwatch', 'Секундомер'],
                    ['settings', 'Настройки'],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setIslandTab(k)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                      islandTab === k ? 'bg-[var(--luma-accent)] text-white' : ''
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={handleToggleDynamicIsland} className="cursor-pointer">
                <StatusPill active={dynamicIslandEnabled} />
              </button>
            </div>

            {(islandTab === 'overview' || islandTab === 'player') && (
              <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase text-zinc-500">
                      {hasLiveOsMedia ? 'СИСТЕМНЫЙ ПОТОК ОС' : currentIslandPlayer.name}
                    </div>
                    <div className="text-base font-bold truncate">{displayTrackTitle}</div>
                    <div className={`text-xs truncate ${mutedCls}`}>{displayTrackArtist}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={handlePrevTrack} className={`p-2.5 rounded-full border cursor-pointer ${btnCls}`}>
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button onClick={handleToggleMediaPlay} className="p-3 rounded-full bg-[var(--luma-accent)] text-white cursor-pointer">
                      {displayMediaPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={handleNextTrack} className={`p-2.5 rounded-full border cursor-pointer ${btnCls}`}>
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                  {islandPlayers.map((pl, idx) => (
                    <button
                      key={pl.id}
                      onClick={() => setActivePlayerIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                        activePlayerIndex === idx ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                      }`}
                    >
                      {pl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Overview Quick Clipboard Preview */}
            {islandTab === 'overview' && (
              <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold inline-flex items-center gap-1.5">
                    <Clipboard className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                    Последние записи буфера обмена
                  </span>
                  <button
                    onClick={() => setIslandTab('clipboard')}
                    className="text-[11px] font-mono text-[var(--luma-accent)] cursor-pointer hover:underline"
                  >
                    Открыть всё ({clipboardHistory.length})
                  </button>
                </div>
                <div className="space-y-1.5">
                  {clipboardHistory.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => copyTextToClipboard(c.text)}
                      className={`w-full px-3 py-2 rounded-lg border text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition ${btnCls}`}
                    >
                      <span className="truncate font-mono">{c.text}</span>
                      <span className={`text-[10px] font-mono shrink-0 ${mutedCls}`}>{c.time}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* REAL OS CLIPBOARD MANAGER TAB */}
            {islandTab === 'clipboard' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`flex-1 min-w-[180px] flex items-center gap-2 px-3 py-1.5 rounded-xl border ${btnCls}`}>
                    <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <input
                      value={clipSearch}
                      onChange={(e) => setClipSearch(e.target.value)}
                      placeholder="Поиск по истории буфера..."
                      className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-500"
                    />
                  </div>
                  <button
                    onClick={() => readOsClipboardNow(false)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Считать ОС
                  </button>
                  <button
                    onClick={() => setClipboardHistory((prev) => prev.filter((c) => c.pinned))}
                    className={`px-3 py-1.5 rounded-xl border text-xs cursor-pointer ${btnCls}`}
                    title="Удалить все незакреплённые записи"
                  >
                    Очистить
                  </button>
                </div>

                {/* Add Manual Clip Snippet */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!manualClipInput.trim()) return;
                    copyTextToClipboard(manualClipInput.trim());
                    setManualClipInput('');
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={manualClipInput}
                    onChange={(e) => setManualClipInput(e.target.value)}
                    placeholder="Сохранить текст / ссылку / шаблон в буфер обмена..."
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none ${btnCls}`}
                  />
                  <button
                    type="submit"
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
                  >
                    + В буфер
                  </button>
                </form>

                {/* Clipboard Entries List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {clipboardHistory
                    .filter((c) => !clipSearch.trim() || c.text.toLowerCase().includes(clipSearch.trim().toLowerCase()))
                    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${surfaceCls} ${
                          entry.pinned ? 'border-[var(--luma-accent-border)]' : ''
                        }`}
                      >
                        <div
                          onClick={() => copyTextToClipboard(entry.text)}
                          className="min-w-0 flex-1 cursor-pointer space-y-1"
                        >
                          <div className="font-mono break-all line-clamp-3 leading-relaxed">{entry.text}</div>
                          <div className={`text-[10px] font-mono flex items-center gap-2 ${mutedCls}`}>
                            <span>{entry.time}</span>
                            <span>·</span>
                            <span>{entry.text.length} симв.</span>
                            {entry.pinned && <span className="text-[var(--luma-accent)] font-bold">ЗАКРЕПЛЕНО</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => copyTextToClipboard(entry.text)}
                            title="Скопировать в ОС"
                            className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}
                          >
                            <ClipboardCheck className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                          </button>
                          <button
                            onClick={() =>
                              setClipboardHistory((prev) =>
                                prev.map((c) => (c.id === entry.id ? { ...c, pinned: !c.pinned } : c))
                              )
                            }
                            title={entry.pinned ? 'Открепить' : 'Закрепить'}
                            className={`p-1.5 rounded-lg border cursor-pointer ${
                              entry.pinned ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                            }`}
                          >
                            {entry.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setClipboardHistory((prev) => prev.filter((c) => c.id !== entry.id))}
                            title="Удалить"
                            className="p-1.5 rounded-lg hover:bg-[var(--luma-accent-soft)] text-zinc-500 hover:text-[var(--luma-accent)] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {clipboardHistory.length === 0 && (
                    <div className={`py-8 text-center text-xs font-mono ${mutedCls}`}>История буфера обмена пуста</div>
                  )}
                </div>
              </div>
            )}

            {/* SCRATCHPAD QUICK NOTE TAB */}
            {islandTab === 'scratchpad' && (
              <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">Быстрая заметка Luma Island</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => islandScratchpad.trim() && copyTextToClipboard(islandScratchpad)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
                    >
                      <Copy className="w-3 h-3" /> В буфер
                    </button>
                    <button
                      onClick={() => setIslandScratchpad('')}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer ${btnCls}`}
                    >
                      Очистить
                    </button>
                  </div>
                </div>
                <textarea
                  rows={10}
                  value={islandScratchpad}
                  onChange={(e) => setIslandScratchpad(e.target.value)}
                  placeholder="Черновик, быстрые заметки, команды, ссылки — сохраняются автоматически..."
                  className={`w-full p-3 rounded-xl border text-xs font-mono outline-none resize-none leading-relaxed ${btnCls}`}
                />
                <div className={`text-[10px] font-mono ${mutedCls}`}>
                  Символов: {islandScratchpad.length} · Автосохранение активно
                </div>
              </div>
            )}

            {islandTab === 'notifications' && (
              <div className="space-y-2">
                <div className="flex justify-end gap-2 text-xs">
                  <button onClick={() => setNotifications((p) => p.map((x) => ({ ...x, unread: false })))} className={`px-2.5 py-1 rounded-lg border cursor-pointer ${btnCls}`}>
                    Прочитать все
                  </button>
                  <button onClick={() => setNotifications([])} className={`px-2.5 py-1 rounded-lg border cursor-pointer ${btnCls}`}>
                    Очистить
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className={`py-8 text-center text-xs font-mono ${mutedCls}`}>Нет уведомлений</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-3 rounded-xl border text-xs ${surfaceCls}`}>
                      <div className="flex justify-between font-bold">
                        <span>{n.title}</span>
                        <span className={`font-mono font-normal ${mutedCls}`}>{n.time}</span>
                      </div>
                      <div className={`mt-1 ${mutedCls}`}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {islandTab === 'timer' && (
              <div className={`p-5 rounded-xl border text-center space-y-4 ${surfaceCls}`}>
                <div className="text-5xl font-mono font-bold tabular-nums">{formatLiveClock(islandTimerRemainingSec)}</div>
                <div className="flex justify-center gap-2">
                  {[60, 300, 900, 1500].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        setIslandTimerTotalSec(sec);
                        setIslandTimerRemainingSec(sec);
                        setIslandTimerRunning(false);
                      }}
                      className={`px-3 py-1 rounded-lg border text-xs font-mono cursor-pointer ${btnCls}`}
                    >
                      {sec / 60} мин
                    </button>
                  ))}
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setIslandTimerRunning((v) => !v)}
                    className="px-5 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-mono font-bold cursor-pointer"
                  >
                    {islandTimerRunning ? 'ПАУЗА' : 'СТАРТ'}
                  </button>
                  <button
                    onClick={() => {
                      setIslandTimerRunning(false);
                      setIslandTimerRemainingSec(islandTimerTotalSec);
                    }}
                    className={`px-4 py-2 rounded-xl border text-xs font-mono cursor-pointer ${btnCls}`}
                  >
                    СБРОС
                  </button>
                </div>
              </div>
            )}

            {islandTab === 'stopwatch' && (
              <div className={`p-5 rounded-xl border text-center space-y-4 ${surfaceCls}`}>
                <div className="text-5xl font-mono font-bold tabular-nums">{formatLiveClock(islandStopwatchSec)}</div>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setIslandStopwatchRunning((v) => !v)}
                    className="px-5 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-mono font-bold cursor-pointer"
                  >
                    {islandStopwatchRunning ? 'СТОП' : 'СТАРТ'}
                  </button>
                  <button
                    onClick={() => setIslandStopwatchLaps((p) => [formatLiveClock(islandStopwatchSec), ...p])}
                    className={`px-4 py-2 rounded-xl border text-xs font-mono cursor-pointer inline-flex items-center gap-1 ${btnCls}`}
                  >
                    <Flag className="w-3.5 h-3.5" /> КРУГ
                  </button>
                  <button
                    onClick={() => {
                      setIslandStopwatchRunning(false);
                      setIslandStopwatchSec(0);
                      setIslandStopwatchLaps([]);
                    }}
                    className={`px-4 py-2 rounded-xl border text-xs font-mono cursor-pointer ${btnCls}`}
                  >
                    СБРОС
                  </button>
                </div>
                {islandStopwatchLaps.length > 0 && (
                  <div className="text-xs font-mono space-y-1 max-h-28 overflow-y-auto">
                    {islandStopwatchLaps.map((lap, idx) => (
                      <div key={idx} className={mutedCls}>
                        #{islandStopwatchLaps.length - idx} — {lap}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INLINE ISLAND SETTINGS TAB */}
            {islandTab === 'settings' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-3.5 rounded-xl border space-y-2 ${surfaceCls}`}>
                    <div className={mutedCls}>Положение капсулы</div>
                    <div className="flex gap-1.5">
                      {(['top', 'bottom'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setIslandPosition(p)}
                          className={`flex-1 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                            islandPosition === p ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                          }`}
                        >
                          {p === 'top' ? 'Сверху' : 'Снизу'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={`p-3.5 rounded-xl border space-y-2 ${surfaceCls}`}>
                    <div className={mutedCls}>Размер капсулы</div>
                    <div className="flex gap-1">
                      {(['compact', 'standard', 'expanded'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setIslandSize(s)}
                          className={`flex-1 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                            islandSize === s ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                          }`}
                        >
                          {s === 'compact' ? 'Компакт' : s === 'standard' ? 'Станд.' : 'Широкий'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Медиа и эквалайзер', active: islandShowEq, toggle: () => setIslandShowEq((v) => !v) },
                    { label: 'Буфер обмена в капсуле', active: islandShowClip, toggle: () => setIslandShowClip((v) => !v) },
                    { label: 'Авто-захват буфера ОС', active: islandAutoClipboard, toggle: () => setIslandAutoClipboard((v) => !v) },
                    { label: 'Индикатор заряда', active: islandShowBattery, toggle: () => setIslandShowBattery((v) => !v) },
                    { label: 'Свечение контура', active: islandGlowEnabled, toggle: () => setIslandGlowEnabled((v) => !v) },
                    { label: 'Не беспокоить (DND)', active: dndEnabled, toggle: () => setDndEnabled((v) => !v) },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={opt.toggle}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${surfaceCls}`}
                    >
                      <span className="font-semibold">{opt.label}</span>
                      <StatusPill active={opt.active} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DexWindow>
      )}

      {/* WINDOW 8: LUMA SPACES */}
      {windows.spaces.open && !windows.spaces.minimized && (
        <DexWindow
          id="spaces"
          title="Пространства"
          subtitle="Пакетный запуск"
          icon={<Rocket className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          zIndex={windows.spaces.z}
          initialWidth={600}
          initialHeight={420}
          onFocus={() => focusWindow('spaces')}
          onMinimize={() => minimizeWindow('spaces')}
          onClose={() => closeWindow('spaces')}
        >
          <div className="p-5 space-y-3">
            {workspaces.map((ws) => (
              <div key={ws.id} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${surfaceCls}`}>
                <div>
                  <div className="text-sm font-bold">
                    {ws.name} <span className={`text-xs font-mono font-normal ${mutedCls}`}>({ws.hotkey})</span>
                  </div>
                  <div className={`text-xs mt-1 ${mutedCls}`}>
                    Запуск: {ws.launchApps.join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setApps((prev) =>
                      prev.map((a) =>
                        ws.launchApps.includes(a.id) || ws.launchApps.includes(a.package)
                          ? { ...a, isRunning: true }
                          : a
                      )
                    );
                    pushToast('Пространство', `Профиль «${ws.name}» запущен`, 'info');
                    closeWindow('spaces');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--luma-accent)] text-white text-xs font-semibold cursor-pointer shrink-0"
                >
                  Запустить
                </button>
              </div>
            ))}
          </div>
        </DexWindow>
      )}

      {/* ==================== LAYER 4: ADAPTIVE OS TASKBAR (BOTTOM / LEFT / TOP) WITH REAL HOST OS WINDOWS & RIGHT-CLICK MENU ==================== */}
      {taskbarPosition === 'left' ? (
        <aside
          onClick={(e) => e.stopPropagation()}
          onContextMenu={handleTaskbarContextMenu}
          className={`fixed left-0 inset-y-0 ${taskbarLeftWidthCls} z-50 border-r flex flex-col items-center justify-between py-2.5 gap-2 ${taskbarGlassCls}`}
        >
          {/* Top: Start Menu + Run/Spotlight (Alt+R) + Grid Edit */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setStartMenuOpen((v) => !v);
                setControlCenterOpen(false);
                setTaskListOpen(false);
                setTaskbarAppMenuId(null);
                setTaskbarHostWinPid(null);
                setTaskbarCtxMenu(null);
              }}
              title="Пуск (Меню Luma)"
              className={`w-10 h-10 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center transition cursor-pointer ${
                startMenuOpen
                  ? 'bg-[var(--luma-accent)] text-white'
                  : isDark
                  ? 'hover:bg-white/10 text-zinc-200'
                  : 'hover:bg-zinc-900/10 text-zinc-800'
              }`}
            >
              {isPixel ? (
                <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-current" />
                </span>
              ) : (
                <div className="grid grid-cols-3 gap-[3px]">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <span key={idx} className="w-[3.5px] h-[3.5px] rounded-full bg-current" />
                  ))}
                </div>
              )}
            </button>

            <button
              onClick={() => setSpotlightOpen(true)}
              title="Выполнить и поиск (Alt+R)"
              className={`w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center transition cursor-pointer ${btnCls}`}
            >
              <Search className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            </button>

            <button
              onClick={() => setDesktopEditMode((v) => !v)}
              title={`Редактор сетки (${desktopCols}×10)`}
              className={`w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center transition cursor-pointer ${
                desktopEditMode ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Vertical System Windows + Running Luma Apps + REAL Open Host OS Windows */}
          <div className="flex flex-col items-center gap-1 overflow-y-auto no-scrollbar py-1">
            {taskbarApps
              .filter((item) => item.pinned || windows[item.id].open)
              .map((item) => {
                const st = windows[item.id];
                const isFocused = st.open && !st.minimized && st.z === topVisibleZ;
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleTaskbarWindow(item.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (st.open) closeWindow(item.id);
                      else handleTaskbarContextMenu(e);
                    }}
                    title={item.label}
                    className={`relative w-10 h-10 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center transition cursor-pointer ${
                      isFocused
                        ? isDark
                          ? 'bg-white/[0.14] text-white'
                          : 'bg-zinc-900/[0.12] text-zinc-950'
                        : isDark
                        ? 'text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-100'
                        : 'text-zinc-700 hover:bg-zinc-900/[0.07] hover:text-zinc-950'
                    }`}
                  >
                    {item.icon}
                    {st.open && (
                      <span
                        className={`absolute left-1 top-1/2 -translate-y-1/2 rounded-full transition-all ${
                          st.minimized ? 'w-1 h-1 bg-zinc-400' : 'w-[2.5px] h-3.5 bg-[var(--luma-accent)]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}

            {runningApps.length > 0 && (
              <>
                <div className={`w-6 h-px my-1 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />
                {runningApps.map((app) => {
                  const activePop = taskbarAppMenuId === app.id;
                  return (
                    <button
                      key={app.id}
                      onClick={() => {
                        setTaskbarAppMenuId((cur) => (cur === app.id ? null : app.id));
                        setTaskbarHostWinPid(null);
                        setStartMenuOpen(false);
                        setControlCenterOpen(false);
                        setTaskListOpen(false);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStopApp(app.id);
                      }}
                      title={`${app.name} (Запущено · ${formatLiveClock(app.elapsedSeconds)} · ПКМ — закрыть)`}
                      className={`relative w-10 h-10 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center transition cursor-pointer ${
                        activePop
                          ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]'
                          : isDark
                          ? 'bg-white/[0.06] text-zinc-100 hover:bg-white/[0.12]'
                          : 'bg-zinc-900/[0.06] text-zinc-900 hover:bg-zinc-900/[0.12]'
                      }`}
                    >
                      {renderAppIcon(app.icon, 'w-4 h-4')}
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 w-[2.5px] h-3.5 rounded-full bg-[var(--luma-accent)]" />
                    </button>
                  );
                })}
              </>
            )}

            {/* REAL Host OS Running Applications on Vertical Taskbar */}
            {taskbarShowHostWindows && hostWindows.length > 0 && (
              <>
                <div className={`w-6 h-px my-1 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />
                {hostWindows.map((hw) => {
                  const activePop = taskbarHostWinPid === hw.pid;
                  return (
                    <button
                      key={`host_v_${hw.pid}`}
                      onClick={() => {
                        setTaskbarHostWinPid((cur) => (cur === hw.pid ? null : hw.pid));
                        setTaskbarAppMenuId(null);
                        setStartMenuOpen(false);
                        setControlCenterOpen(false);
                        setTaskListOpen(false);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleKillHostProcess(hw.pid, false);
                      }}
                      title={`${hw.title || hw.name} (ОС · PID ${hw.pid} · ПКМ — закрыть)`}
                      className={`relative w-10 h-10 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center transition cursor-pointer ${
                        activePop
                          ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]'
                          : isDark
                          ? 'bg-white/[0.05] text-zinc-200 hover:bg-white/[0.12]'
                          : 'bg-zinc-900/[0.06] text-zinc-900 hover:bg-zinc-900/[0.12]'
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 w-[2.5px] h-3.5 rounded-full bg-emerald-500" />
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Bottom: Tasks Switcher + Fullscreen + Clipboard + Control Center + Vertical Clock + Show Desktop */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setTaskListOpen((v) => !v);
                setStartMenuOpen(false);
                setControlCenterOpen(false);
                setTaskbarAppMenuId(null);
                setTaskbarHostWinPid(null);
              }}
              title={`Открытые задачи (${totalActiveTasksCount})`}
              className={`relative w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer ${
                taskListOpen ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {totalActiveTasksCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--luma-accent)] text-white text-[9px] font-mono font-bold flex items-center justify-center">
                  {totalActiveTasksCount}
                </span>
              )}
            </button>

            <button
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Выйти из полного экрана (F11)' : 'Во весь экран (F11)'}
              className={`w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer ${
                isFullscreen ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
              }`}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => openIslandTab('clipboard')}
              title={`Буфер обмена (${clipboardHistory.length})`}
              className={`w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer ${btnCls}`}
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setControlCenterOpen((v) => !v);
                setStartMenuOpen(false);
                setTaskListOpen(false);
                setTaskbarAppMenuId(null);
                setTaskbarHostWinPid(null);
              }}
              title="Центр управления"
              className={`w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer ${
                controlCenterOpen ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : btnCls
              }`}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => openWindow('settings', 'clock')}
              title="Настройка 18 циферблатов"
              className={`w-11 py-1 rounded-xl flex flex-col items-center justify-center font-mono leading-tight cursor-pointer ${
                isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-zinc-900/[0.08]'
              }`}
            >
              <span className="text-[11px] font-bold tabular-nums">{displayHrs}</span>
              <span className="text-[11px] font-bold tabular-nums" style={{ color: clockAccentColor }}>
                {displayMins}
              </span>
            </button>

            <button
              onClick={showDesktop}
              title="Показать рабочий стол (Alt+D)"
              className={`w-8 h-2 rounded-full cursor-pointer transition ${
                isDark ? 'bg-white/20 hover:bg-white/40' : 'bg-zinc-500/40 hover:bg-zinc-600'
              }`}
            />
          </div>
        </aside>
      ) : (
        <footer
          onClick={(e) => e.stopPropagation()}
          onContextMenu={handleTaskbarContextMenu}
          className={`fixed z-50 ${taskbarHeightCls} flex items-center justify-between px-2.5 gap-2 transition-all ${
            isPixel
              ? taskbarPosition === 'top'
                ? 'top-2 inset-x-3 rounded-full border shadow-xl'
                : 'bottom-2 inset-x-3 rounded-full border shadow-xl'
              : taskbarPosition === 'top'
              ? 'top-0 inset-x-0 border-b'
              : 'bottom-0 inset-x-0 border-t'
          } ${taskbarGlassCls}`}
        >
          {/* Left: Real Start Menu Button + Alt+R Run/Spotlight + Grid Edit */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                setStartMenuOpen((v) => !v);
                setControlCenterOpen(false);
                setTaskListOpen(false);
                setTaskbarAppMenuId(null);
                setTaskbarHostWinPid(null);
                setTaskbarCtxMenu(null);
              }}
              title="Пуск (Меню Luma)"
              className={`w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center transition cursor-pointer ${
                startMenuOpen
                  ? 'bg-[var(--luma-accent)] text-white'
                  : isDark
                  ? 'hover:bg-white/10 text-zinc-200'
                  : 'hover:bg-zinc-900/10 text-zinc-800'
              }`}
            >
              {isPixel ? (
                <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-current" />
                </span>
              ) : (
                <div className="grid grid-cols-3 gap-[3px]">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <span key={idx} className="w-[3.5px] h-[3.5px] rounded-full bg-current" />
                  ))}
                </div>
              )}
            </button>

            <button
              onClick={() => setSpotlightOpen(true)}
              title="Выполнить и поиск (Alt+R)"
              className={`h-8 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-1.5 text-xs transition cursor-pointer ${btnCls}`}
            >
              <Search className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              <span className="hidden sm:inline font-mono text-[11px]">Alt+R</span>
            </button>

            <button
              onClick={() => setDesktopEditMode((v) => !v)}
              title={`Редактор сетки рабочего стола (${desktopCols}×10)`}
              className={`w-8 h-8 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center transition cursor-pointer ${
                desktopEditMode ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: OS-Style Pinned Windows + Running Luma Apps + REAL Open Host OS Applications */}
          <div
            className={`flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 ${
              taskbarCenterIcons ? 'flex-1 justify-center' : ''
            }`}
          >
            {taskbarApps
              .filter((item) => item.pinned || windows[item.id].open)
              .map((item) => {
                const st = windows[item.id];
                const isFocused = st.open && !st.minimized && st.z === topVisibleZ;
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleTaskbarWindow(item.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (st.open) closeWindow(item.id);
                      else handleTaskbarContextMenu(e);
                    }}
                    title={st.open ? `${item.label} (ПКМ — закрыть)` : item.label}
                    className={`relative h-9 ${taskbarShowLabels ? 'px-2.5' : 'w-9 justify-center'} ${
                      isPixel ? 'rounded-full' : 'rounded-xl'
                    } flex items-center gap-1.5 text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
                      isFocused
                        ? isPixel
                          ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                          : isDark
                          ? 'bg-white/[0.12] text-white font-semibold'
                          : 'bg-zinc-900/[0.12] text-zinc-950 font-semibold'
                        : isDark
                        ? 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
                        : 'text-zinc-700 hover:bg-zinc-900/[0.07] hover:text-zinc-950'
                    }`}
                  >
                    {item.icon}
                    {taskbarShowLabels && <span className="hidden lg:inline">{item.label}</span>}
                    {st.open && (
                      <span
                        className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full transition-all ${
                          st.minimized ? 'w-1 h-1 bg-zinc-400' : 'w-3 h-[2px] bg-[var(--luma-accent)]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}

            {/* Running Luma Applications Dynamically Displayed on Taskbar */}
            {runningApps.length > 0 && (
              <>
                <span className={`w-px h-5 mx-1 shrink-0 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />
                {runningApps.map((app) => {
                  const activePop = taskbarAppMenuId === app.id;
                  return (
                    <button
                      key={app.id}
                      onClick={() => {
                        setTaskbarAppMenuId((cur) => (cur === app.id ? null : app.id));
                        setTaskbarHostWinPid(null);
                        setStartMenuOpen(false);
                        setControlCenterOpen(false);
                        setTaskListOpen(false);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStopApp(app.id);
                      }}
                      title={`${app.name} · ${formatLiveClock(app.elapsedSeconds)} (ЛКМ — управление, ПКМ — закрыть)`}
                      className={`relative h-9 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center gap-1.5 text-xs transition cursor-pointer whitespace-nowrap shrink-0 border ${
                        activePop
                          ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                          : isDark
                          ? 'border-white/[0.08] bg-white/[0.06] text-zinc-100 hover:bg-white/[0.12]'
                          : 'border-zinc-900/[0.1] bg-zinc-900/[0.06] text-zinc-900 hover:bg-zinc-900/[0.12]'
                      }`}
                    >
                      {renderAppIcon(app.icon, 'w-3.5 h-3.5 shrink-0')}
                      {taskbarShowLabels && <span className="hidden xl:inline max-w-[96px] truncate">{app.name}</span>}
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-[2px] rounded-full bg-[var(--luma-accent)]" />
                    </button>
                  );
                })}
              </>
            )}

            {/* REAL Host OS Running Windows (All apps open on Windows/PC live on Luma Taskbar!) */}
            {taskbarShowHostWindows && hostWindows.length > 0 && (
              <>
                <span className={`w-px h-5 mx-1 shrink-0 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />
                {hostWindows.map((hw) => {
                  const activePop = taskbarHostWinPid === hw.pid;
                  const shortName = hw.title || hw.name;
                  return (
                    <button
                      key={`host_${hw.pid}`}
                      onClick={() => {
                        setTaskbarHostWinPid((cur) => (cur === hw.pid ? null : hw.pid));
                        setTaskbarAppMenuId(null);
                        setStartMenuOpen(false);
                        setControlCenterOpen(false);
                        setTaskListOpen(false);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleKillHostProcess(hw.pid, false);
                      }}
                      title={`${shortName} (${hw.name} · PID ${hw.pid} · ${hw.mem_mb.toFixed(0)} МБ)\nЛКМ — переключиться/управлять, ПКМ — закрыть`}
                      className={`relative h-9 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center gap-1.5 text-xs transition cursor-pointer whitespace-nowrap shrink-0 border ${
                        activePop
                          ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                          : isDark
                          ? 'border-white/[0.08] bg-white/[0.05] text-zinc-200 hover:bg-white/[0.11]'
                          : 'border-zinc-900/[0.1] bg-zinc-900/[0.06] text-zinc-900 hover:bg-zinc-900/[0.12]'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {taskbarShowLabels && <span className="max-w-[110px] truncate">{shortName}</span>}
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-emerald-500" />
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Right: Open Tasks Switcher + Telemetry + Clipboard + Fullscreen + Control Center + Clock + Show Desktop */}
          <div className="flex items-center gap-1.5 shrink-0 h-full">
            <button
              onClick={() => {
                setTaskListOpen((v) => !v);
                setStartMenuOpen(false);
                setControlCenterOpen(false);
                setTaskbarAppMenuId(null);
                setTaskbarHostWinPid(null);
              }}
              title="Открытые задачи, окна Luma и приложения ОС"
              className={`h-8 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-1.5 text-[11px] font-mono cursor-pointer transition ${
                taskListOpen ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-bold' : btnCls
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Задачи</span>
              <span
                className={`px-1 rounded text-[10px] font-bold ${
                  taskListOpen
                    ? 'bg-white/20 text-white'
                    : totalActiveTasksCount > 0
                    ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]'
                    : 'opacity-60'
                }`}
              >
                {totalActiveTasksCount}
              </span>
            </button>

            {taskbarShowTelemetry && (
              <button
                onClick={() => openWindow('taskmgr')}
                title="Открыть Диспетчер задач"
                className={`hidden xl:flex items-center gap-2 px-2.5 h-8 ${isPixel ? 'rounded-full' : 'rounded-xl'} border text-[11px] font-mono cursor-pointer ${btnCls}`}
              >
                <span>CPU {cpuLoad}%</span>
                <span className="opacity-30">·</span>
                <span>RAM {ramLoad}%</span>
              </button>
            )}

            <button
              onClick={() => openIslandTab('clipboard')}
              title={`Буфер обмена (${clipboardHistory.length})`}
              className={`w-8 h-8 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer ${btnCls}`}
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Выйти из полного экрана (F11)' : 'Во весь экран (F11)'}
              className={`w-8 h-8 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer ${
                isFullscreen ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
              }`}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>

            {!dynamicIslandEnabled && (
              <button
                onClick={handleToggleDynamicIsland}
                title="Включить Luma Island"
                className={`w-8 h-8 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer ${btnCls}`}
              >
                <Disc3 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* System Tray Control Center Trigger */}
            <button
              onClick={() => {
                setControlCenterOpen((v) => !v);
                setStartMenuOpen(false);
                setTaskListOpen(false);
                setTaskbarAppMenuId(null);
                setTaskbarHostWinPid(null);
              }}
              title="Центр управления (Звук, Стиль, Панель, Питание)"
              className={`h-8 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-2 text-[11px] font-mono cursor-pointer transition ${
                controlCenterOpen ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : btnCls
              }`}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              ) : volume < 50 ? (
                <Volume1 className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <Wifi className="w-3.5 h-3.5 hidden sm:inline" />
              <span className="inline-flex items-center gap-1">
                <BatteryCharging className={`w-3.5 h-3.5 ${isCharging ? 'text-[var(--luma-accent)]' : ''}`} />
                {batteryLevel}%
              </span>
            </button>

            {/* Taskbar Clock */}
            <button
              onClick={() => openWindow('settings', 'clock')}
              title={`Циферблат: ${CLOCK_STYLE_OPTIONS.find((c) => c.id === clockStyle)?.label || clockStyle}`}
              className={`h-9 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex flex-col items-end justify-center leading-tight font-mono cursor-pointer transition ${
                isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-zinc-900/[0.07]'
              }`}
            >
              <span className="text-xs font-bold tabular-nums">
                {displayHrs}
                <span style={{ color: clockAccentColor }}>{colon}</span>
                {displayMins}
                {showSeconds ? `:${displaySecs}` : ''}
              </span>
              {showDate && <span className={`text-[9px] uppercase ${mutedCls}`}>{dateShort}</span>}
            </button>

            {/* Far-right Show Desktop Strip */}
            <button
              onClick={showDesktop}
              title="Показать рабочий стол (Alt+D)"
              className={`w-2.5 h-7 rounded-sm border-l cursor-pointer transition ${
                isDark ? 'border-white/15 hover:bg-white/20' : 'border-zinc-500/40 hover:bg-zinc-500/30'
              }`}
            />
          </div>
        </footer>
      )}

      {/* ==================== WINDOWS-STYLE TASKBAR RIGHT-CLICK CONTEXT MENU ==================== */}
      {taskbarCtxMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ left: taskbarCtxMenu.x, top: taskbarCtxMenu.y }}
          className={`luma-animate-in fixed z-[75] w-60 border p-1.5 shadow-2xl text-xs ${popoverShellCls}`}
        >
          <div className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
            Панель задач Luma OS
          </div>
          <button
            onClick={() => {
              openWindow('taskmgr');
              setTaskbarCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            <span>Диспетчер задач</span>
          </button>
          <button
            onClick={() => {
              openWindow('settings', 'taskbar');
              setTaskbarCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <LayoutPanelLeft className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            <span>Настроить панель задач</span>
          </button>
          <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`} />
          <button
            onClick={() => {
              openWindow('explorer');
              setTaskbarCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Открыть Проводник</span>
          </button>
          <button
            onClick={() => {
              setDesktopEditMode((v) => !v);
              setTaskbarCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>{desktopEditMode ? 'Завершить редактор стола' : 'Редактор сетки стола'}</span>
          </button>
          <button
            onClick={() => {
              showDesktop();
              setTaskbarCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Minimize className="w-3.5 h-3.5" />
            <span>Показать рабочий стол</span>
          </button>
        </div>
      )}

      {/* ==================== HOST OS WINDOW TASKBAR POPOVER ==================== */}
      {taskbarHostWinPid !== null && (() => {
        const hw = hostWindows.find((w) => w.pid === taskbarHostWinPid);
        if (!hw) return null;
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in fixed z-50 w-76 border p-3.5 space-y-3 text-xs ${popoverShellCls} ${
              taskbarPosition === 'left'
                ? 'top-1/2 -translate-y-1/2 left-[68px]'
                : taskbarPosition === 'top'
                ? isPixel
                  ? 'top-16 left-1/2 -translate-x-1/2'
                  : 'top-14 left-1/2 -translate-x-1/2'
                : isPixel
                ? 'bottom-16 left-1/2 -translate-x-1/2'
                : 'bottom-14 left-1/2 -translate-x-1/2'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{hw.title || hw.name}</div>
                  <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                    {hw.name} · PID {hw.pid} · {hw.mem_mb.toFixed(0)} МБ
                  </div>
                </div>
              </div>
              <button onClick={() => setTaskbarHostWinPid(null)} className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleFocusHostWindow(hw.pid)}
                className="py-1.5 px-2.5 rounded-lg bg-[var(--luma-accent)] text-white font-semibold cursor-pointer inline-flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> На передний план
              </button>
              <button
                onClick={() => {
                  openWindow('taskmgr');
                  setTaskbarHostWinPid(null);
                }}
                className={`py-1.5 px-2.5 rounded-lg border font-semibold cursor-pointer inline-flex items-center justify-center gap-1 ${btnCls}`}
              >
                <Cpu className="w-3 h-3" /> Диспетчер
              </button>
            </div>
            <button
              onClick={() => handleKillHostProcess(hw.pid, false)}
              className="w-full py-1.5 px-2.5 rounded-lg border border-[var(--luma-accent-border)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Square className="w-3 h-3" /> Закрыть окно ОС
            </button>
          </div>
        );
      })()}

      {/* ==================== RUNNING APP TASKBAR CONTROL POPOVER ==================== */}
      {taskbarAppMenuId && (() => {
        const activeApp = runningApps.find((a) => a.id === taskbarAppMenuId);
        if (!activeApp) return null;
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in fixed z-50 w-72 border p-3.5 space-y-3 text-xs ${popoverShellCls} ${
              taskbarPosition === 'left'
                ? 'top-1/2 -translate-y-1/2 left-[68px]'
                : taskbarPosition === 'top'
                ? isPixel
                  ? 'top-16 left-1/2 -translate-x-1/2'
                  : 'top-14 left-1/2 -translate-x-1/2'
                : isPixel
                ? 'bottom-16 left-1/2 -translate-x-1/2'
                : 'bottom-14 left-1/2 -translate-x-1/2'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center shrink-0">
                  {renderAppIcon(activeApp.icon, 'w-4 h-4')}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{activeApp.name}</div>
                  <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                    Активно · {formatLiveClock(activeApp.elapsedSeconds)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTaskbarAppMenuId(null)}
                className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleFocusOrRelaunchApp(activeApp)}
                className="py-1.5 px-2.5 rounded-lg bg-[var(--luma-accent)] text-white font-semibold cursor-pointer inline-flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Открыть
              </button>
              <button
                onClick={() => {
                  handleOpenAppProperties(activeApp);
                  setTaskbarAppMenuId(null);
                }}
                className={`py-1.5 px-2.5 rounded-lg border font-semibold cursor-pointer inline-flex items-center justify-center gap-1 ${btnCls}`}
              >
                <Info className="w-3 h-3" /> Свойства
              </button>
            </div>
            <button
              onClick={() => handleStopApp(activeApp.id)}
              className="w-full py-1.5 px-2.5 rounded-lg border border-[var(--luma-accent-border)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Square className="w-3 h-3" /> Закрыть приложение
            </button>
          </div>
        );
      })()}

      {/* ==================== OS OPEN TASKS SWITCHER POPOVER («ОТКРЫТЫЕ ЗАДАЧИ») ==================== */}
      {taskListOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed z-50 w-84 max-w-[calc(100vw-24px)] border p-4 space-y-3 text-xs ${popoverShellCls} ${
            taskbarPosition === 'left'
              ? 'bottom-16 left-[68px]'
              : taskbarPosition === 'top'
              ? isPixel
                ? 'top-16 right-3'
                : 'top-14 right-3'
              : isPixel
              ? 'bottom-16 right-3'
              : 'bottom-14 right-3'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Открытые задачи ({totalActiveTasksCount})
            </div>
            <button onClick={() => setTaskListOpen(false)} className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}>
              <X className="w-3 h-3" />
            </button>
          </div>

          {totalActiveTasksCount === 0 ? (
            <div className={`py-6 text-center font-mono ${mutedCls}`}>
              Нет открытых окон или запущенных приложений
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-0.5">
              {openSystemWindowsList.length > 0 && (
                <div className="space-y-1.5">
                  <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                    Окна Luma ({openSystemWindowsList.length})
                  </div>
                  {openSystemWindowsList.map((w) => {
                    const st = windows[w.id];
                    return (
                      <div key={w.id} className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}>
                        <button
                          onClick={() => openWindow(w.id)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <span className="text-[var(--luma-accent)]">{w.icon}</span>
                          <span className="font-semibold truncate">{w.label}</span>
                          {st.minimized && <span className={`text-[10px] font-mono ${mutedCls}`}>(свёрн.)</span>}
                        </button>
                        <button
                          onClick={() => closeWindow(w.id)}
                          title="Закрыть окно"
                          className="p-1 rounded-md hover:bg-[var(--luma-accent-soft)] text-zinc-500 hover:text-[var(--luma-accent)] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {taskbarShowHostWindows && hostWindows.length > 0 && (
                <div className="space-y-1.5">
                  <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                    Открытые окна ОС ({hostWindows.length})
                  </div>
                  {hostWindows.map((hw) => (
                    <div key={`tl_host_${hw.pid}`} className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}>
                      <button
                        onClick={() => handleFocusHostWindow(hw.pid)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <Monitor className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{hw.title || hw.name}</div>
                          <div className={`text-[10px] font-mono ${mutedCls}`}>
                            {hw.name} · {hw.mem_mb.toFixed(0)} МБ
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleKillHostProcess(hw.pid, false)}
                        title="Закрыть процесс ОС"
                        className="p-1 rounded-md hover:bg-[var(--luma-accent-soft)] text-zinc-500 hover:text-[var(--luma-accent)] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {runningApps.length > 0 && (
                <div className="space-y-1.5">
                  <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                    Приложения Luma ({runningApps.length})
                  </div>
                  {runningApps.map((app) => (
                    <div key={app.id} className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}>
                      <button
                        onClick={() => handleFocusOrRelaunchApp(app)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        {renderAppIcon(app.icon, 'w-3.5 h-3.5 shrink-0 text-[var(--luma-accent)]')}
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{app.name}</div>
                          <div className={`text-[10px] font-mono ${mutedCls}`}>{formatLiveClock(app.elapsedSeconds)}</div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            handleOpenAppProperties(app);
                            setTaskListOpen(false);
                          }}
                          title="Свойства"
                          className={`p-1 rounded-md cursor-pointer ${mutedCls} hover:text-current`}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStopApp(app.id)}
                          title="Закрыть приложение"
                          className="p-1 rounded-md hover:bg-[var(--luma-accent-soft)] text-zinc-500 hover:text-[var(--luma-accent)] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={`pt-2 border-t flex items-center gap-1.5 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
            <button
              onClick={() => {
                openWindow('taskmgr');
                setTaskListOpen(false);
              }}
              className="flex-1 py-1.5 rounded-lg bg-[var(--luma-accent)] text-white font-semibold cursor-pointer inline-flex items-center justify-center gap-1"
            >
              <Cpu className="w-3 h-3" /> Диспетчер задач
            </button>
            <button
              onClick={showDesktop}
              className={`flex-1 py-1.5 rounded-lg border font-semibold cursor-pointer ${btnCls}`}
            >
              Свернуть окна
            </button>
          </div>
        </div>
      )}

      {/* ==================== REAL START MENU («ПУСК») POPOVER ==================== */}
      {startMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed z-50 w-[440px] max-w-[calc(100vw-24px)] border p-4 space-y-4 ${popoverShellCls} ${
            taskbarPosition === 'left'
              ? 'top-3 left-[68px]'
              : taskbarPosition === 'top'
              ? isPixel
                ? 'top-16 left-1/2 -translate-x-1/2'
                : 'top-14 left-2.5'
              : isPixel
              ? 'bottom-16 left-1/2 -translate-x-1/2'
              : 'bottom-14 left-2.5'
          }`}
        >
          {/* Start Search Header */}
          <div className="flex items-center gap-2">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2 ${isPixel ? 'rounded-full' : 'rounded-xl'} border ${btnCls}`}>
              <Search className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
              <input
                value={startSearch}
                onChange={(e) => setStartSearch(e.target.value)}
                placeholder="Поиск приложений, модулей и команд..."
                autoFocus
                className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-500"
              />
              {startSearch && (
                <button onClick={() => setStartSearch('')} className="text-zinc-400 hover:text-current cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => openWindow('apps')}
              className={`px-3 py-2 ${isPixel ? 'rounded-full' : 'rounded-xl'} border text-xs font-semibold cursor-pointer ${btnCls}`}
            >
              Все
            </button>
          </div>

          {/* System Modules Grid */}
          {!startSearch.trim() && (
            <div className="space-y-2">
              <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>Система Luma OS 1.0.4</div>
              <div className="grid grid-cols-5 gap-1.5">
                {taskbarApps.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => openWindow(m.id)}
                    className={`p-2 ${isPixel ? 'rounded-2xl' : 'rounded-xl'} border flex flex-col items-center gap-1 text-center transition cursor-pointer ${btnCls}`}
                  >
                    <span className="text-[var(--luma-accent)]">{m.icon}</span>
                    <span className="text-[10px] font-medium truncate max-w-full">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pinned / Filtered Applications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>
                {startSearch.trim() ? 'Результаты поиска' : 'Закреплённые приложения'}
              </span>
              <span className={`text-[10px] font-mono ${mutedCls}`}>{runningAppsCount + hostWindows.length} активн.</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
              {combinedApps
                .filter((a) =>
                  startSearch.trim()
                    ? a.name.toLowerCase().includes(startSearch.trim().toLowerCase()) ||
                      a.category.toLowerCase().includes(startSearch.trim().toLowerCase())
                    : a.favorite
                )
                .slice(0, 8)
                .map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      handleLaunchApp(app);
                      setStartMenuOpen(false);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenuApp(app);
                      setStartMenuOpen(false);
                    }}
                    className={`px-2.5 py-2 rounded-xl border flex items-center gap-2.5 text-left transition cursor-pointer ${btnCls}`}
                  >
                    {renderAppIcon(app.icon, 'w-4 h-4 shrink-0')}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{app.name}</div>
                      <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{app.category}</div>
                    </div>
                    {app.isRunning && <span className="w-1.5 h-1.5 rounded-full bg-[var(--luma-accent)] shrink-0" />}
                  </button>
                ))}
            </div>
          </div>

          {/* Quick Shell Controls inside Start Menu */}
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <button
              onClick={() => openIslandTab('clipboard')}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${btnCls}`}
            >
              <Clipboard className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              <span>Буфер ({clipboardHistory.length})</span>
            </button>
            <button
              onClick={() => setDesignStyle(designStyle === 'nothing' ? 'pixelbook' : 'nothing')}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${btnCls}`}
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              <span>{designStyle === 'nothing' ? 'Nothing' : 'Pixelbook'}</span>
            </button>
            <button
              onClick={() => openWindow('settings', 'taskbar')}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${btnCls}`}
            >
              <LayoutPanelLeft className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              <span>Панель</span>
            </button>
          </div>

          {/* Start Footer */}
          <div className={`pt-3 border-t flex items-center justify-between gap-2 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[var(--luma-accent)] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                L
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{customDeviceName || liveSystem?.hostname || 'Luma Desktop'}</div>
                <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                  {liveSystem?.location?.city || 'Luma OS 1.0.4'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  handleToggleFullscreen();
                  setStartMenuOpen(false);
                }}
                title="Во весь экран (F11)"
                className={`p-2 rounded-lg border cursor-pointer ${btnCls}`}
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => handleExecutePowerAction('lock')} title="Заблокировать" className={`p-2 rounded-lg border cursor-pointer ${btnCls}`}>
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleExecutePowerAction('sleep')} title="Сон" className={`p-2 rounded-lg border cursor-pointer ${btnCls}`}>
                <Power className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADAPTIVE DEX CONTROL CENTER POPOVER ==================== */}
      {controlCenterOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed z-50 w-80 border p-4 space-y-3.5 ${popoverShellCls} ${
            taskbarPosition === 'left'
              ? 'bottom-3 left-[68px]'
              : taskbarPosition === 'top'
              ? isPixel
                ? 'top-16 right-3'
                : 'top-14 right-3'
              : isPixel
              ? 'bottom-16 right-3'
              : 'bottom-14 right-3'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">LUMA OS 1.0.4</span>
            <span className={`text-[10px] font-mono ${mutedCls}`}>
              {liveSystem?.location?.city || 'LOCAL'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: isDark ? 'Тёмная' : 'Светлая', active: isDark, icon: isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />, run: () => setThemeKey(isDark ? 'nothing_paper' : 'nothing_mono') },
              { label: designStyle === 'nothing' ? 'Nothing' : 'Pixelbook', active: designStyle === 'pixelbook', icon: <Sliders className="w-3.5 h-3.5" />, run: () => setDesignStyle(designStyle === 'nothing' ? 'pixelbook' : 'nothing') },
              { label: 'Luma Island', active: dynamicIslandEnabled, icon: <Disc3 className="w-3.5 h-3.5" />, run: handleToggleDynamicIsland },
              { label: 'Экономия', active: powerProfile === 'saver', icon: <Leaf className="w-3.5 h-3.5" />, run: () => handleChangePowerProfile(powerProfile === 'saver' ? 'balanced' : 'saver') },
              { label: 'Не беспокоить', active: dndEnabled, icon: <BellOff className="w-3.5 h-3.5" />, run: () => setDndEnabled((v) => !v) },
              { label: `Сетка ${desktopCols}×10`, active: desktopEditMode, icon: <Grid className="w-3.5 h-3.5" />, run: () => setDesktopEditMode((v) => !v) },
            ].map((t) => (
              <button
                key={t.label}
                onClick={t.run}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer ${
                  t.active ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-semibold' : btnCls
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>Панель задач</div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              {(
                [
                  ['bottom', 'Снизу'],
                  ['left', 'Слева'],
                  ['top', 'Сверху'],
                ] as const
              ).map(([pos, label]) => (
                <button
                  key={pos}
                  onClick={() => setTaskbarPosition(pos)}
                  className={`py-1.5 rounded-lg border font-semibold cursor-pointer ${
                    taskbarPosition === pos ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={mutedCls}>ГРОМКОСТЬ</span>
              <span>{isMuted ? 'MUTE' : `${volume}%`}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={handleToggleMute} className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-[var(--luma-accent)]" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="flex-1"
              />
            </div>
          </div>

          <div className={`pt-3 border-t flex items-center justify-between gap-2 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{displayTrackTitle}</div>
              <div className={`text-[10px] truncate ${mutedCls}`}>{displayTrackArtist}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handlePrevTrack} className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
                <SkipBack className="w-3 h-3" />
              </button>
              <button onClick={handleToggleMediaPlay} className="p-1.5 rounded-lg bg-[var(--luma-accent)] text-white cursor-pointer">
                {displayMediaPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button onClick={handleNextTrack} className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
                <SkipForward className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className={`pt-3 border-t flex items-center justify-between gap-1.5 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
            <div className="flex gap-1">
              <button onClick={() => handleExecutePowerAction('lock')} title="Заблокировать" className={`p-2 rounded-lg border cursor-pointer ${btnCls}`}>
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleExecutePowerAction('sleep')} title="Сон" className={`p-2 rounded-lg border cursor-pointer ${btnCls}`}>
                <Power className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleExecutePowerAction('recycle_bin')} title="Корзина" className={`p-2 rounded-lg border cursor-pointer ${btnCls}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <a
              href="/LumaOS_1.0.4.exe"
              download="LumaOS_1.0.4.exe"
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold inline-flex items-center gap-1 ${btnCls}`}
            >
              <Download className="w-3 h-3 text-[var(--luma-accent)]" />
              EXE
            </a>
          </div>
        </div>
      )}

      {/* ==================== SUB-MODALS (ADD APP, EDIT APP, CUSTOM THEME, APP CONTEXT MENU, PROPERTIES) ==================== */}
      {addAppModalOpen && (
        <div onClick={() => setAddAppModalOpen(false)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddCustomApp}
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-md border p-5 space-y-3.5 ${popoverShellCls}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Добавить приложение</span>
              <button type="button" onClick={() => setAddAppModalOpen(false)} className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <input required value={newAppName} onChange={(e) => setNewAppName(e.target.value)} placeholder="Название" className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${btnCls}`} />
            <div className="flex gap-1.5">
              <input value={newAppUrl} onChange={(e) => setNewAppUrl(e.target.value)} placeholder="Путь к EXE или URL (https://...)" className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`} />
              <button
                type="button"
                onClick={handlePickAppExecutable}
                title="Выбрать программу с диска"
                className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer shrink-0 ${btnCls}`}
              >
                Обзор...
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select value={newAppType} onChange={(e) => setNewAppType(e.target.value as AppType)} className={`px-3 py-2 rounded-xl border ${btnCls}`}>
                <option value="app" className="text-black">Программа (EXE)</option>
                <option value="web" className="text-black">Веб-сайт</option>
                <option value="system" className="text-black">Система</option>
              </select>
              <select value={newAppCategory} onChange={(e) => setNewAppCategory(e.target.value)} className={`px-3 py-2 rounded-xl border ${btnCls}`}>
                {['Development', 'Browser', 'Games', 'Social', 'Media', 'Music', 'Office', 'System'].map((c) => (
                  <option key={c} value={c} className="text-black">{c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ICON_NAMES.slice(0, 12).map((ic) => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => setNewAppIcon(ic)}
                  className={`p-2 rounded-lg border cursor-pointer ${newAppIcon === ic ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls}`}
                >
                  {renderAppIcon(ic, 'w-3.5 h-3.5')}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddAppModalOpen(false)} className={`px-3.5 py-1.5 rounded-xl border text-xs cursor-pointer ${btnCls}`}>
                Отмена
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-semibold cursor-pointer">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      {editingApp && (
        <div onClick={() => setEditingApp(null)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveEditedApp}
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-md border p-5 space-y-3.5 ${popoverShellCls}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[var(--luma-accent)]" />
                Редактировать приложение
              </span>
              <button type="button" onClick={() => setEditingApp(null)} className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              required
              value={editingApp.name}
              onChange={(e) => setEditingApp({ ...editingApp, name: e.target.value })}
              placeholder="Название"
              className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${btnCls}`}
            />
            <input
              value={editingApp.url}
              onChange={(e) => setEditingApp({ ...editingApp, url: e.target.value })}
              placeholder="Путь или URL"
              className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={editingApp.category}
                onChange={(e) => setEditingApp({ ...editingApp, category: e.target.value })}
                className={`px-3 py-2 rounded-xl border ${btnCls}`}
              >
                {['Development', 'Browser', 'Games', 'Social', 'Media', 'Music', 'Office', 'System'].map((c) => (
                  <option key={c} value={c} className="text-black">{c}</option>
                ))}
              </select>
              <input
                value={editingApp.args || ''}
                onChange={(e) => setEditingApp({ ...editingApp, args: e.target.value })}
                placeholder="Аргументы запуска"
                className={`px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingApp(null)} className={`px-3.5 py-1.5 rounded-xl border text-xs cursor-pointer ${btnCls}`}>
                Отмена
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-semibold cursor-pointer">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      {customThemeModalOpen && (
        <div onClick={() => setCustomThemeModalOpen(false)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-md border p-5 space-y-4 ${popoverShellCls}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Создать тему</span>
              <button onClick={() => setCustomThemeModalOpen(false)} className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <input value={newThemeName} onChange={(e) => setNewThemeName(e.target.value)} className={`w-full px-3 py-2 rounded-xl border text-xs ${btnCls}`} />
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['dark', 'amoled', 'light'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setNewThemeMode(m);
                    setNewThemeBg(m === 'light' ? '#dcddd7' : m === 'amoled' ? '#050506' : '#09090b');
                    setNewThemeSurface(m === 'light' ? '#e7e8e3' : '#141418');
                  }}
                  className={`py-1.5 rounded-lg border font-mono uppercase cursor-pointer ${
                    newThemeMode === m ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className={`mb-1 ${mutedCls}`}>Фон</div>
                <input type="color" value={newThemeBg} onChange={(e) => setNewThemeBg(e.target.value)} className="w-full h-8 cursor-pointer bg-transparent" />
              </div>
              <div>
                <div className={`mb-1 ${mutedCls}`}>Карточки</div>
                <input type="color" value={newThemeSurface} onChange={(e) => setNewThemeSurface(e.target.value)} className="w-full h-8 cursor-pointer bg-transparent" />
              </div>
              <div>
                <div className={`mb-1 ${mutedCls}`}>Акцент</div>
                <input type="color" value={newThemeAccent} onChange={(e) => setNewThemeAccent(e.target.value)} className="w-full h-8 cursor-pointer bg-transparent" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCustomThemeModalOpen(false)} className={`px-3.5 py-1.5 rounded-xl border text-xs cursor-pointer ${btnCls}`}>
                Отмена
              </button>
              <button
                onClick={() => {
                  const id = `custom_${Date.now()}`;
                  const created: CustomThemeConfig = {
                    id,
                    name: newThemeName.trim() || 'Luma Custom',
                    isDark: newThemeMode !== 'light',
                    bgGradient: newThemeBg,
                    surfaceRgba: newThemeSurface,
                    cardHex: newThemeSurface,
                    accent: 'red',
                    accentHex: newThemeAccent,
                    surfaceRgb: hexToRgbTuple(newThemeSurface, newThemeMode === 'light' ? '234, 235, 229' : '20, 20, 24'),
                    cardRgb: hexToRgbTuple(newThemeSurface, newThemeMode === 'light' ? '238, 239, 234' : '24, 24, 30'),
                    barRgb: hexToRgbTuple(newThemeBg, newThemeMode === 'light' ? '224, 225, 219' : '12, 12, 16'),
                    custom: true,
                  };
                  setCustomThemes((prev) => ({ ...prev, [id]: created }));
                  setThemeKey(id);
                  setCustomAccentOverride('');
                  setCustomThemeModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-semibold cursor-pointer"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT-CLICK APPLICATION CONTEXT MENU (PROPERTIES + EDIT + PIN TO DESKTOP + UNIVERSAL DELETE) */}
      {contextMenuApp && (
        <div onClick={() => setContextMenuApp(null)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-64 border p-2 space-y-1 text-xs ${popoverShellCls}`}
          >
            <div className={`px-3 py-2 border-b font-bold truncate flex items-center gap-2 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
              {renderAppIcon(contextMenuApp.icon, 'w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0')}
              <span className="truncate">{contextMenuApp.name}</span>
            </div>
            <button
              onClick={() => {
                handleLaunchApp(contextMenuApp);
                setContextMenuApp(null);
              }}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'}`}
            >
              <Play className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              {contextMenuApp.isRunning ? 'Остановить приложение' : 'Запустить'}
            </button>
            <button
              onClick={() => {
                handleOpenAppProperties(contextMenuApp);
                setContextMenuApp(null);
              }}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'}`}
            >
              <Info className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Свойства (вес, дата, путь)
            </button>
            <button
              onClick={() => {
                setEditingApp(contextMenuApp);
                setContextMenuApp(null);
              }}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'}`}
            >
              <Pencil className="w-3.5 h-3.5" />
              Редактировать
            </button>
            <button
              onClick={() => {
                pinAppsToDesktop([contextMenuApp]);
                setContextMenuApp(null);
              }}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'}`}
            >
              <Pin className="w-3.5 h-3.5" />
              Закрепить на рабочий стол
            </button>
            <button
              onClick={() => {
                handleToggleFavorite(contextMenuApp);
                setContextMenuApp(null);
              }}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'}`}
            >
              <Star className="w-3.5 h-3.5" />
              {contextMenuApp.favorite ? 'Убрать из избранного' : 'В избранное'}
            </button>
            <button
              onClick={() => {
                setApps((prev) =>
                  prev.map((a) =>
                    a.id === contextMenuApp.id
                      ? { ...a, isRunning: false, elapsedSeconds: 0, todayMinutes: 0, weekMinutes: 0, monthMinutes: 0 }
                      : a
                  )
                );
                setContextMenuApp(null);
              }}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сбросить время в 0
            </button>
            <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`} />
            <button
              onClick={() => {
                handleDeleteApp(contextMenuApp);
                setContextMenuApp(null);
              }}
              className="w-full px-3 py-2 rounded-xl hover:bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold text-left flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Удалить
            </button>
          </div>
        </div>
      )}

      {/* ==================== PROPERTIES MODAL (APP / FILE WEIGHT, DOWNLOAD DATE, PATH, DELETE) ==================== */}
      <PropertiesModal
        target={propertiesTarget}
        onClose={() => setPropertiesTarget(null)}
        onLaunchApp={handleLaunchApp}
        onCopyPath={(p) => copyTextToClipboard(p)}
        popoverShellCls={popoverShellCls}
        btnCls={btnCls}
        mutedCls={mutedCls}
        isDark={isDark}
      />

      {/* ==================== LUMA RUN & SPOTLIGHT (ALT+R) ==================== */}
      <LumaSpotlight
        open={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        isDark={isDark}
        apps={combinedApps}
        iconMap={ICON_MAP}
        dynamicIslandEnabled={dynamicIslandEnabled}
        dndEnabled={dndEnabled}
        isMuted={isMuted}
        mediaPlaying={displayMediaPlaying}
        currentTrack={displayTrackTitle}
        onLaunchApp={handleLaunchApp}
        onOpenWindow={(w) => openWindow(w)}
        onRunCommand={handleRunTerminalCommand}
        onShowDesktop={showDesktop}
        onToggleEditDesktop={() => setDesktopEditMode((v) => !v)}
        onToggleIsland={handleToggleDynamicIsland}
        onToggleDnd={() => setDndEnabled((v) => !v)}
        onToggleMute={handleToggleMute}
        onTogglePlay={handleToggleMediaPlay}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onToggleTheme={() => setThemeKey(isDark ? 'nothing_paper' : 'nothing_mono')}
        onPowerAction={handleExecutePowerAction}
      />

      {/* ==================== MINIMAL MONOCHROME TOASTS ==================== */}
      <div
        className={`fixed z-[60] flex flex-col gap-1.5 max-w-xs pointer-events-none ${
          taskbarPosition === 'left'
            ? 'bottom-3 left-[68px]'
            : taskbarPosition === 'top'
            ? 'bottom-3 left-3'
            : 'bottom-14 left-3'
        }`}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`luma-animate-in pointer-events-auto px-3.5 py-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${popoverShellCls}`}
          >
            {t.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-[var(--luma-accent)] shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[var(--luma-accent)] shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className="font-bold truncate">{t.title}</div>
              <div className={`text-[11px] truncate ${mutedCls}`}>{t.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================== COMFORT SCREEN BRIGHTNESS DIMMER OVERLAY (POWER SAVER) ==================== */}
      {screenBrightness < 100 && (
        <div
          className="pointer-events-none fixed inset-0 z-[95] bg-black transition-opacity duration-200"
          style={{ opacity: Math.min(0.45, (100 - screenBrightness) / 100) }}
        />
      )}
    </div>
  );
}
