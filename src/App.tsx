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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  Folder,
  FolderOpen,
  FolderPlus,
  Gamepad2,
  Github,
  Globe,
  Grid,
  HardDrive,
  Headphones,
  History,
  Image,
  Info,
  Keyboard,
  Languages,
  Layers,
  LayoutGrid,
  LayoutPanelLeft,
  Leaf,
  ListChecks,
  Lock,
  LogOut,
  MapPin,
  Maximize,
  MessageSquare,
  Mic,
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
  Sparkles,
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
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  AppItem,
  AppType,
  AudioDevicesInfo,
  AudioEndpointInfo,
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
  KeyboardLayoutsInfo,
  LiveSystemTelemetry,
  PLUGIN_CATALOG,
  PluginItem,
  PYTHON_PROJECT_FILES,
  RollbackReleaseItem,
  ThemeKey,
  THEMES,
  VERSION_HISTORY,
  WindowsNotificationItem,
  WirelessBatteryInfo,
  WorkspacePreset,
} from './data/launcherData';
import { WORLD_KEYBOARD_LANGUAGES } from './data/worldLanguages';
import { DesignStyle, DexWindow, SnapZone, TaskbarPosition } from './components/DexWindow';
import {
  AI_PROVIDER_PRESETS,
  DEFAULT_LUMA_AI_CONFIG,
  LumaAIAssistantWindow,
  LumaAIConfig,
} from './components/LumaAIAssistantWindow';
import { LumaBatteryPanel } from './components/LumaBatteryPanel';
import { LumaCalculatorWindow } from './components/LumaCalculatorWindow';
import { LumaClockRenderer } from './components/LumaClockRenderer';
import {
  DesktopGridCols,
  DesktopShortcut,
  FolderEntry,
  LiveWallpaperId,
  LumaDesktopCanvas,
  WallpaperStyle,
  WallpaperTransitionMode,
} from './components/LumaDesktopCanvas';
import { LumaExplorerWindow } from './components/LumaExplorerWindow';
import { LumaHeliumEasterEggModal } from './components/LumaHeliumEasterEgg';
import { LumaSecurityPanel } from './components/LumaSecurityPanel';
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
import { LumaSystemUtilitiesWindow } from './components/LumaSystemUtilitiesWindow';
import { LumaTaskManagerWindow } from './components/LumaTaskManagerWindow';
import { LumaTerminalWindow } from './components/LumaTerminalWindow';
import { getLangLocale, LUMA_LANGUAGES, LumaLangCode, tr } from './i18n/translations';

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
const STORAGE_KEY = 'luma_os_permanent_shell_state_v1';
const LEGACY_KEYS = [
  'luma_os_1_1_0_helium_state',
  'luma_os_1_0_4_shell_state',
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
  | 'ai'
  | 'utilities'
  | 'calculator'
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
  | 'security'
  | 'ai_settings'
  | 'battery'
  | 'language'
  | 'shell_mode'
  | 'luma'
  | 'bluetooth'
  | 'power'
  | 'graphics'
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

type GpuProfile = 'ultra' | 'balanced' | 'performance' | 'eco';
type HostWinLabelMode = 'app_name' | 'window_title' | 'compact';

interface DexWinState {
  open: boolean;
  minimized: boolean;
  z: number;
  desktop?: number;
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

interface ShellModeState {
  start_fullscreen: boolean;
  autostart_with_os: boolean;
  hide_windows_taskbar: boolean;
  reserve_work_area: boolean;
  always_on_top: boolean;
  taskbar_position: string;
  taskbar_size_px: number;
}

interface GitHubUpdateCheck {
  ok: boolean;
  has_update: boolean;
  current_version: string;
  current_name: string;
  latest_version: string;
  latest_tag: string;
  release_title: string;
  release_notes: string;
  release_url: string;
  download_url: string;
  published_at: string;
  asset_size: number;
  checked_at: string;
  update_level?: 'major' | 'minor' | 'patch';
  update_level_label?: string;
  changelog_highlights?: string[];
  error?: string;
}

interface GitHubUpdateProgress {
  running: boolean;
  stage: string;
  percent: number;
  downloaded_bytes: number;
  total_bytes: number;
  speed_mbps: number;
  target_version: string;
  file_path?: string;
  sha256?: string;
  message: string;
  error?: string;
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
          : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--luma-accent)]' : 'bg-zinc-500'}`} />
      {active ? 'ВКЛ' : 'ВЫКЛ'}
    </span>
  );
}

const INITIAL_WINDOWS: Record<DexWinId, DexWinState> = {
  explorer: { open: false, minimized: false, z: 20, desktop: 1 },
  taskmgr: { open: false, minimized: false, z: 20, desktop: 1 },
  apps: { open: false, minimized: false, z: 20, desktop: 1 },
  terminal: { open: false, minimized: false, z: 20, desktop: 1 },
  ai: { open: false, minimized: false, z: 20, desktop: 1 },
  utilities: { open: false, minimized: false, z: 20, desktop: 1 },
  calculator: { open: false, minimized: false, z: 20, desktop: 1 },
  tracker: { open: false, minimized: false, z: 20, desktop: 1 },
  kernel: { open: false, minimized: false, z: 20, desktop: 1 },
  settings: { open: false, minimized: false, z: 20, desktop: 1 },
  plugins: { open: false, minimized: false, z: 20, desktop: 1 },
  island: { open: false, minimized: false, z: 20, desktop: 1 },
  spaces: { open: false, minimized: false, z: 20, desktop: 1 },
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
  const [autoDisplayScale, setAutoDisplayScale] = useState<boolean>(savedState?.autoDisplayScale ?? true);
  const [uiScale, setUiScale] = useState<number>(() => {
    if (typeof savedState?.uiScale === 'number') return Math.max(85, Math.min(135, savedState.uiScale));
    return 100;
  });
  const [viewportAutoPct, setViewportAutoPct] = useState<number>(100);
  const [iconSizePx, setIconSizePx] = useState<number>(() => {
    if (typeof savedState?.iconSizePx === 'number') return Math.max(36, Math.min(72, savedState.iconSizePx));
    return 46;
  });
  const [gpuProfile, setGpuProfile] = useState<GpuProfile>(
    savedState?.gpuProfile === 'ultra' ||
      savedState?.gpuProfile === 'performance' ||
      savedState?.gpuProfile === 'eco'
      ? savedState.gpuProfile
      : 'balanced'
  );
  const [gpuBlurEnabled, setGpuBlurEnabled] = useState<boolean>(savedState?.gpuBlurEnabled ?? true);
  const [gpuShadowsEnabled, setGpuShadowsEnabled] = useState<boolean>(savedState?.gpuShadowsEnabled ?? true);
  const [gpuPauseLiveWp, setGpuPauseLiveWp] = useState<boolean>(savedState?.gpuPauseLiveWp ?? true);
  const [telemetryIntervalMs, setTelemetryIntervalMs] = useState<1500 | 3000 | 6000>(
    savedState?.telemetryIntervalMs === 1500 || savedState?.telemetryIntervalMs === 6000 ? savedState.telemetryIntervalMs : 3000
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
  const [hostWinLabelMode, setHostWinLabelMode] = useState<HostWinLabelMode>(
    savedState?.hostWinLabelMode === 'window_title' || savedState?.hostWinLabelMode === 'compact'
      ? savedState.hostWinLabelMode
      : 'app_name'
  );
  const [taskbarOrder, setTaskbarOrder] = useState<DexWinId[]>(() =>
    Array.isArray(savedState?.taskbarOrder) && savedState.taskbarOrder.length > 0
      ? savedState.taskbarOrder
      : ['explorer', 'apps', 'ai', 'calculator', 'terminal', 'utilities', 'tracker', 'kernel', 'settings', 'taskmgr', 'plugins', 'island', 'spaces']
  );
  const [draggedTaskbarId, setDraggedTaskbarId] = useState<DexWinId | null>(null);
  const [hostWinOrder, setHostWinOrder] = useState<string[]>(() =>
    Array.isArray(savedState?.hostWinOrder) ? savedState.hostWinOrder : []
  );
  const [draggedHostWinKey, setDraggedHostWinKey] = useState<string | null>(null);
  const [taskbarCollapseSysFolder, setTaskbarCollapseSysFolder] = useState<boolean>(
    savedState?.taskbarCollapseSysFolder ?? false
  );
  const [sysFolderOpen, setSysFolderOpen] = useState<boolean>(false);

  // --- Audio Input/Output Devices, Wireless Peripheral Batteries & World Keyboard Layouts (1.2.2) ---
  const [audioDevices, setAudioDevices] = useState<AudioDevicesInfo | null>(null);
  const [audioPickerSection, setAudioPickerSection] = useState<'none' | 'output' | 'input'>('none');
  const [wirelessBatteries, setWirelessBatteries] = useState<WirelessBatteryInfo[]>([]);
  const [kbdLayouts, setKbdLayouts] = useState<KeyboardLayoutsInfo | null>(null);
  const [kbdPopoverOpen, setKbdPopoverOpen] = useState<boolean>(false);
  const [worldLangQuery, setWorldLangQuery] = useState<string>('');
  const [worldLangRegion, setWorldLangRegion] = useState<string>('Все');

  // --- Version Rollback & Animated App Deletion & Dynamic Island 2.0 Reactive Pulse ---
  const [rollbackReleases, setRollbackReleases] = useState<RollbackReleaseItem[]>([]);
  const [rollbackLoading, setRollbackLoading] = useState<boolean>(false);
  const [rollbackConfirm, setRollbackConfirm] = useState<RollbackReleaseItem | null>(null);
  const [deletingAppIds, setDeletingAppIds] = useState<Record<string, boolean>>({});
  const [islandPulse, setIslandPulse] = useState<null | {
    id: number;
    title: string;
    detail?: string;
    kind: string;
    barPct?: number;
  }>(null);
  const islandPulseTimerRef = useRef<number | null>(null);
  const [taskbarShowTelemetry, setTaskbarShowTelemetry] = useState<boolean>(savedState?.taskbarShowTelemetry ?? true);
  const [taskbarCenterIcons, setTaskbarCenterIcons] = useState<boolean>(savedState?.taskbarCenterIcons ?? false);
  const [taskbarSizePx, setTaskbarSizePx] = useState<number>(() => {
    if (typeof savedState?.taskbarSizePx === 'number') {
      return Math.max(38, Math.min(84, savedState.taskbarSizePx));
    }
    return savedState?.taskbarSize === 'compact' ? 44 : savedState?.taskbarSize === 'large' ? 66 : 52;
  });
  const [resizingTaskbar, setResizingTaskbar] = useState<boolean>(false);
  const taskbarStripRef = useRef<HTMLDivElement | null>(null);
  const [taskListSearch, setTaskListSearch] = useState<string>('');

  // --- Multi-Language i18n (9 Languages) ---
  const [lang, setLang] = useState<LumaLangCode>(() => {
    const saved = savedState?.lang as LumaLangCode | undefined;
    return saved && LUMA_LANGUAGES.some((l) => l.code === saved) ? saved : 'ru';
  });
  const locale = getLangLocale(lang);
  const t = (key: string, fallback?: string) => tr(lang, key, fallback);

  // --- Extra Wallpaper Engine Customization (Transitions + Live Animated Wallpapers) ---
  const [wallpaperImageUrl, setWallpaperImageUrl] = useState<string>(savedState?.wallpaperImageUrl || '');
  const [wallpaperBlur, setWallpaperBlur] = useState<number>(savedState?.wallpaperBlur ?? 0);
  const [wallpaperDim, setWallpaperDim] = useState<number>(savedState?.wallpaperDim ?? 24);
  const [wallpaperTransition, setWallpaperTransition] = useState<WallpaperTransitionMode>(
    savedState?.wallpaperTransition || 'iris'
  );
  const [liveWallpaper, setLiveWallpaper] = useState<LiveWallpaperId>(savedState?.liveWallpaper || '');

  // --- Multitasking: Virtual Desktops, Task View Overview & Snap Layouts ---
  const [multitaskingOpen, setMultitaskingOpen] = useState<boolean>(false);
  const [activeDesktop, setActiveDesktop] = useState<number>(1);
  const [virtualDesktops, setVirtualDesktops] = useState<number[]>([1, 2, 3]);
  const [snapCommands, setSnapCommands] = useState<Partial<Record<DexWinId, { zone: SnapZone; seq: number }>>>({});
  const snapSeqRef = useRef<number>(0);
  const shellDiskHydratedRef = useRef<boolean>(false);

  // --- Luma AI Multi-Provider Config + Master AI Kill Switch ---
  const [aiEnabled, setAiEnabled] = useState<boolean>(savedState?.aiEnabled ?? true);
  const [aiConfig, setAiConfig] = useState<LumaAIConfig>(() => ({
    ...DEFAULT_LUMA_AI_CONFIG,
    ...(savedState?.aiConfig || {}),
  }));

  // --- Lithium 1.2 Easter Egg & Power Confirmation Modal ---
  const [easterEggOpen, setEasterEggOpen] = useState<boolean>(false);
  const [powerConfirm, setPowerConfirm] = useState<null | {
    action: 'shutdown' | 'restart' | 'sleep' | 'lock' | 'signout' | 'exit_luma';
    title: string;
    desc: string;
  }>(null);

  // --- Real Windows Shell Mode (Fullscreen on Start, Autostart, Hide Windows Taskbar) ---
  const [shellMode, setShellMode] = useState<ShellModeState>({
    start_fullscreen: false,
    autostart_with_os: false,
    hide_windows_taskbar: false,
    reserve_work_area: true,
    always_on_top: false,
    taskbar_position: 'bottom',
    taskbar_size_px: 52,
  });
  const [shellModeSaving, setShellModeSaving] = useState<boolean>(false);

  // --- Real GitHub OTA Update Checker, Daily Auto-Notify Popup & Cinematic Progress ---
  const [updateInfo, setUpdateInfo] = useState<GitHubUpdateCheck | null>(null);
  const [updatePopupOpen, setUpdatePopupOpen] = useState<boolean>(false);
  const [pluginRunResults, setPluginRunResults] = useState<
    Record<string, { loading?: boolean; summary?: string; latency?: number; ok?: boolean }>
  >({});
  const [updateProgress, setUpdateProgress] = useState<GitHubUpdateProgress>({
    running: false,
    stage: 'idle',
    percent: 0,
    downloaded_bytes: 0,
    total_bytes: 0,
    speed_mbps: 0,
    target_version: '',
    message: 'Нажмите «Проверить обновления» для запроса релизов GitHub',
  });

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
            text: 'Luma OS 1.2.2 (Lithium) — Буфер обмена Luma Island готов к работе',
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
  const [githubUpdateStatus, setGithubUpdateStatus] = useState<string>('Установлена сборка Luma OS 1.2.2 (Lithium)');
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
      source: 'LumaCore 1.2',
      message: 'Инициализация оболочки Luma OS 1.2.2 (Lithium) и шины IPC 127.0.0.1:49215',
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

  // --- DeX Window Controls & Multitasking Manager ---
  const openWindow = (id: DexWinId, tab?: SettingsTabId) => {
    if (id === 'settings' && tab) setSettingsTab(tab);
    zCounterRef.current += 1;
    const nextZ = zCounterRef.current;
    setWindows((prev) => ({
      ...prev,
      [id]: { open: true, minimized: false, z: nextZ, desktop: activeDesktop },
    }));
    setControlCenterOpen(false);
    setStartMenuOpen(false);
    setTaskListOpen(false);
    setMultitaskingOpen(false);
    setTaskbarAppMenuId(null);
    setTaskbarHostWinPid(null);
    setTaskbarCtxMenu(null);
  };

  const sendSnapCommand = (id: DexWinId, zone: SnapZone) => {
    snapSeqRef.current += 1;
    const seq = snapSeqRef.current;
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], open: true, minimized: false, desktop: prev[id].desktop ?? activeDesktop },
    }));
    setSnapCommands((prev) => ({ ...prev, [id]: { zone, seq } }));
  };

  const splitTopTwoWindows = () => {
    const openOnDesk = (Object.keys(windows) as DexWinId[])
      .filter((id) => windows[id].open && (windows[id].desktop ?? 1) === activeDesktop)
      .sort((a, b) => windows[b].z - windows[a].z);
    if (openOnDesk.length === 0) {
      pushToast('Мультизадачность', 'Откройте минимум 2 окна для разделения 50/50', 'info');
      return;
    }
    if (openOnDesk.length === 1) {
      sendSnapCommand(openOnDesk[0], 'left');
      openWindow('calculator');
      window.setTimeout(() => sendSnapCommand('calculator', 'right'), 40);
      setMultitaskingOpen(false);
      return;
    }
    sendSnapCommand(openOnDesk[0], 'left');
    sendSnapCommand(openOnDesk[1], 'right');
    setMultitaskingOpen(false);
    pushToast('Разделение экрана', 'Два активных окна закреплены 50/50', 'success');
  };

  const tileOpenWindows = () => {
    const openOnDesk = (Object.keys(windows) as DexWinId[])
      .filter((id) => windows[id].open && (windows[id].desktop ?? 1) === activeDesktop)
      .sort((a, b) => windows[b].z - windows[a].z)
      .slice(0, 4);
    const zones: SnapZone[] =
      openOnDesk.length === 1
        ? ['maximize']
        : openOnDesk.length === 2
        ? ['left', 'right']
        : openOnDesk.length === 3
        ? ['left', 'tr', 'br']
        : ['tl', 'tr', 'bl', 'br'];
    openOnDesk.forEach((id, idx) => sendSnapCommand(id, zones[idx]));
    setMultitaskingOpen(false);
    if (openOnDesk.length > 0) {
      pushToast('Сетка окон', `Расположено окон: ${openOnDesk.length}`, 'success');
    }
  };

  const moveWindowToDesktop = (id: DexWinId, desk: number) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], desktop: desk },
    }));
    pushToast('Рабочие столы', `Окно перенесено на Стол ${desk}`, 'info');
  };

  const handleExportBackup = async () => {
    try {
      const desktopRaw = localStorage.getItem('luma_desktop_permanent_v1');
      const shellRaw = localStorage.getItem(STORAGE_KEY);
      const bundle = {
        schema: 'luma_os_backup_v1',
        exported_at: new Date().toISOString(),
        version: '1.2.2 (Lithium)',
        desktop_layout: desktopRaw ? JSON.parse(desktopRaw) : null,
        shell_state: shellRaw ? JSON.parse(shellRaw) : null,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LumaOS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast('Резервная копия', 'Все виджеты, папки, ярлыки и настройки сохранены в JSON', 'success');
    } catch {
      pushToast('Резервная копия', 'Не удалось экспортировать файл', 'warning');
    }
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const patch: Record<string, unknown> = {};
        if (parsed.desktop_layout) {
          localStorage.setItem('luma_desktop_permanent_v1', JSON.stringify(parsed.desktop_layout));
          window.dispatchEvent(new CustomEvent('luma-restore-desktop-layout', { detail: parsed.desktop_layout }));
          patch.desktop_layout = parsed.desktop_layout;
        }
        if (parsed.shell_state) {
          const st = parsed.shell_state;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
          if (st.themeKey) setThemeKey(st.themeKey);
          if (st.lang) setLang(st.lang);
          if (typeof st.wallpaperImageUrl === 'string') setWallpaperImageUrl(st.wallpaperImageUrl);
          if (typeof st.liveWallpaper === 'string') setLiveWallpaper(st.liveWallpaper as LiveWallpaperId);
          if (st.wallpaperTransition) setWallpaperTransition(st.wallpaperTransition);
          if (Array.isArray(st.apps)) setApps(st.apps);
          if (st.aiConfig) setAiConfig({ ...DEFAULT_LUMA_AI_CONFIG, ...st.aiConfig });
          patch.shell_state = st;
        }
        if (Object.keys(patch).length > 0) {
          await fetch('/api/kernel/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patch }),
          }).catch(() => {});
          pushToast('Восстановление', 'Рабочий стол, виджеты и настройки успешно восстановлены!', 'success');
        }
      } catch {
        pushToast('Восстановление', 'Некорректный JSON-файл резервной копии', 'warning');
      }
    };
    reader.readAsText(file);
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
    const maxZ = Math.max(
      ...Object.values(windows).map((w) => (w.open && !w.minimized && (w.desktop ?? 1) === activeDesktop ? w.z : 0))
    );
    if (!cur.open) {
      openWindow(id);
    } else if ((cur.desktop ?? 1) !== activeDesktop) {
      setActiveDesktop(cur.desktop ?? 1);
      focusWindow(id);
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
    root.setProperty('--luma-icon-size', `${iconSizePx}px`);

    // Adaptive Display Scaling (keeps Laptop 1440x900 & Big Desktop Monitors visually consistent!)
    const effectiveScalePct = autoDisplayScale
      ? Math.round((viewportAutoPct * uiScale) / 100)
      : uiScale;
    const clampedPx = Math.max(13.5, Math.min(22, (16 * effectiveScalePct) / 100));
    root.fontSize = `${clampedPx.toFixed(2)}px`;

    // GPU Optimization pipeline switches
    const blurActive = gpuBlurEnabled && glassEnabled && gpuProfile !== 'performance' && gpuProfile !== 'eco';
    const shadowsActive = gpuShadowsEnabled && gpuProfile !== 'performance';
    document.documentElement.setAttribute('data-perf', gpuProfile);
    document.documentElement.setAttribute('data-gpu-blur', blurActive ? 'on' : 'off');
    document.documentElement.setAttribute('data-gpu-shadows', shadowsActive ? 'on' : 'off');
  }, [
    currentTheme,
    customAccentOverride,
    fontPreset,
    autoDisplayScale,
    viewportAutoPct,
    uiScale,
    iconSizePx,
    gpuProfile,
    gpuBlurEnabled,
    gpuShadowsEnabled,
    glassEnabled,
    glassOpacity,
    glassIntensity,
    cardBorderRadius,
    powerProfile,
    reduceEffectsOnSaver,
  ]);

  // Compute Auto Display Scale on load & window resize (1440x900 laptop baseline -> smooth upscaling on 1080p/1440p/4K)
  useEffect(() => {
    const computeScale = () => {
      const w = window.innerWidth || 1440;
      const h = window.innerHeight || 900;
      const ratio = Math.min(w / 1440, h / 900);
      // Gentle ergonomic scaling curve: 1440x900 => 100%, 1920x1080 => ~112%, 2560x1440 => ~124%, 3840x2160 => 132%
      let pct = 100;
      if (ratio > 1.02) {
        pct = Math.min(132, Math.round(100 + (ratio - 1) * 46));
      } else if (ratio < 0.88) {
        pct = Math.max(88, Math.round(100 - (0.88 - ratio) * 40));
      }
      setViewportAutoPct(pct);
    };
    computeScale();
    window.addEventListener('resize', computeScale);
    return () => window.removeEventListener('resize', computeScale);
  }, []);

  // Auto-pause live mesh wallpapers when any window is open & GPU pause option is active
  const anyWindowOpenNow = useMemo(
    () => (Object.keys(windows) as DexWinId[]).some((k) => windows[k].open && !windows[k].minimized),
    [windows]
  );
  useEffect(() => {
    const shouldPause =
      gpuProfile === 'performance' || gpuProfile === 'eco' || (gpuPauseLiveWp && anyWindowOpenNow);
    document.documentElement.setAttribute('data-wp-paused', shouldPause ? 'true' : 'false');
  }, [gpuProfile, gpuPauseLiveWp, anyWindowOpenNow]);

  // Sync AI Master Kill Switch with Go Kernel (/api/kernel/ai/toggle)
  const handleToggleAiEnabled = async (next: boolean) => {
    setAiEnabled(next);
    if (!next && windows.ai.open) {
      closeWindow('ai');
    }
    try {
      await fetch('/api/kernel/ai/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
    } catch {
      // ignore offline
    }
    pushToast(
      'Luma AI',
      next ? 'Luma AI включён (Luma Lang 1.2 + Luma Code 1.2)' : 'Luma AI полностью отключён для экономии ресурсов',
      next ? 'success' : 'info'
    );
  };

  useEffect(() => {
    fetch('/api/kernel/ai/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: aiEnabled }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply GPU Performance Preset in 1 click
  const applyGpuProfile = (profile: GpuProfile) => {
    setGpuProfile(profile);
    if (profile === 'ultra') {
      setGpuBlurEnabled(true);
      setGpuShadowsEnabled(true);
      setGpuPauseLiveWp(false);
      setGlassEnabled(true);
      setTelemetryIntervalMs(1500);
      if (animationPreset === 'none') setAnimationPreset('spring');
    } else if (profile === 'balanced') {
      setGpuBlurEnabled(true);
      setGpuShadowsEnabled(true);
      setGpuPauseLiveWp(true);
      setGlassEnabled(true);
      setTelemetryIntervalMs(3000);
    } else if (profile === 'performance') {
      setGpuBlurEnabled(false);
      setGpuShadowsEnabled(false);
      setGpuPauseLiveWp(true);
      setGlassEnabled(false);
      setAnimationPreset('none');
      setTelemetryIntervalMs(6000);
    } else {
      // eco
      setGpuBlurEnabled(false);
      setGpuShadowsEnabled(false);
      setGpuPauseLiveWp(true);
      setTelemetryIntervalMs(6000);
    }
    pushToast('Графика и GPU', `Применён профиль: ${profile.toUpperCase()}`, 'success');
  };

  // --- Persist state cleanly ---
  useEffect(() => {
    const payload = {
      updated_at: Date.now(),
      themeKey,
      customThemes,
      customAccentOverride,
      fontPreset,
      autoDisplayScale,
      uiScale,
      iconSizePx,
      gpuProfile,
      gpuBlurEnabled,
      gpuShadowsEnabled,
      gpuPauseLiveWp,
      telemetryIntervalMs,
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
      taskbarSizePx,
      taskbarShowLabels,
      taskbarShowHostWindows,
      hostWinLabelMode,
      taskbarOrder,
      hostWinOrder,
      taskbarCollapseSysFolder,
      taskbarShowTelemetry,
      taskbarCenterIcons,
      lang,
      wallpaperImageUrl,
      wallpaperBlur,
      wallpaperDim,
      wallpaperTransition,
      liveWallpaper,
      aiEnabled,
      aiConfig,
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
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
    if (!shellDiskHydratedRef.current) return;
    const syncTimer = window.setTimeout(() => {
      fetch('/api/kernel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch: { shell_state: payload } }),
      }).catch(() => {});
    }, 650);
    return () => window.clearTimeout(syncTimer);
  }, [
    themeKey,
    customThemes,
    customAccentOverride,
    fontPreset,
    autoDisplayScale,
    uiScale,
    iconSizePx,
    gpuProfile,
    gpuBlurEnabled,
    gpuShadowsEnabled,
    gpuPauseLiveWp,
    telemetryIntervalMs,
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
    lang,
    taskbarSizePx,
    hostWinLabelMode,
    taskbarOrder,
    hostWinOrder,
    taskbarCollapseSysFolder,
    wallpaperImageUrl,
    wallpaperBlur,
    wallpaperDim,
    wallpaperTransition,
    liveWallpaper,
    aiEnabled,
    aiConfig,
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

  // --- Eternal Disk State Hydration on boot (protects apps, themes, wallpapers & language across upgrades) ---
  useEffect(() => {
    fetch('/api/kernel/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const st = d?.state?.shell_state;
        const hasLocal = Boolean(localStorage.getItem(STORAGE_KEY));
        if (st && !hasLocal) {
          if (st.themeKey) setThemeKey(st.themeKey);
          if (st.lang) setLang(st.lang);
          if (typeof st.wallpaperImageUrl === 'string') setWallpaperImageUrl(st.wallpaperImageUrl);
          if (typeof st.liveWallpaper === 'string') setLiveWallpaper(st.liveWallpaper as LiveWallpaperId);
          if (st.wallpaperTransition) setWallpaperTransition(st.wallpaperTransition);
          if (Array.isArray(st.apps) && st.apps.length > 0) setApps(st.apps);
          if (st.aiConfig) setAiConfig({ ...DEFAULT_LUMA_AI_CONFIG, ...st.aiConfig });
          if (typeof st.aiEnabled === 'boolean') setAiEnabled(st.aiEnabled);
          if (typeof st.customDeviceName === 'string') setCustomDeviceName(st.customDeviceName);
          if (st.clockStyle) setClockStyle(st.clockStyle);
          if (typeof st.autoDisplayScale === 'boolean') setAutoDisplayScale(st.autoDisplayScale);
          if (typeof st.uiScale === 'number') setUiScale(Math.max(85, Math.min(135, st.uiScale)));
          if (typeof st.iconSizePx === 'number') setIconSizePx(Math.max(36, Math.min(72, st.iconSizePx)));
          if (st.gpuProfile) setGpuProfile(st.gpuProfile);
          if (typeof st.gpuBlurEnabled === 'boolean') setGpuBlurEnabled(st.gpuBlurEnabled);
          if (typeof st.gpuShadowsEnabled === 'boolean') setGpuShadowsEnabled(st.gpuShadowsEnabled);
          if (typeof st.gpuPauseLiveWp === 'boolean') setGpuPauseLiveWp(st.gpuPauseLiveWp);
          if (typeof st.telemetryIntervalMs === 'number') setTelemetryIntervalMs(st.telemetryIntervalMs);
          if (st.hostWinLabelMode === 'app_name' || st.hostWinLabelMode === 'window_title' || st.hostWinLabelMode === 'compact') {
            setHostWinLabelMode(st.hostWinLabelMode);
          }
          if (Array.isArray(st.taskbarOrder) && st.taskbarOrder.length > 0) setTaskbarOrder(st.taskbarOrder);
          if (Array.isArray(st.hostWinOrder)) setHostWinOrder(st.hostWinOrder);
          if (typeof st.taskbarCollapseSysFolder === 'boolean') setTaskbarCollapseSysFolder(st.taskbarCollapseSysFolder);
        }
        shellDiskHydratedRef.current = true;
      })
      .catch(() => {
        shellDiskHydratedRef.current = true;
      });
  }, []);

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

  // --- Global Keyboard Shortcuts (Capture-Phase Alt+R + Win32 Hook + Ctrl+K, F11, Alt+W, Alt+D, Escape) ---
  useEffect(() => {
    const toggleSpotlightSafe = () => {
      setSpotlightOpen((v) => !v);
      setStartMenuOpen(false);
      setMultitaskingOpen(false);
      setControlCenterOpen(false);
      setSysFolderOpen(false);
      setKbdPopoverOpen(false);
      setTaskbarCtxMenu(null);
    };

    const onNativeSpotlight = () => {
      toggleSpotlightSafe();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
        return;
      }
      const keyLow = (e.key || '').toLowerCase();
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyW' || e.keyCode === 87 || keyLow === 'w' || keyLow === 'ц')) {
        e.preventDefault();
        e.stopPropagation();
        setMultitaskingOpen((v) => !v);
        setStartMenuOpen(false);
        setSpotlightOpen(false);
        setControlCenterOpen(false);
        setSysFolderOpen(false);
        setKbdPopoverOpen(false);
        return;
      }
      const isAltR =
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (e.code === 'KeyR' || e.keyCode === 82 || keyLow === 'r' || keyLow === 'к');
      const isCtrlK =
        (e.ctrlKey || e.metaKey) &&
        !e.altKey &&
        (e.code === 'KeyK' || e.keyCode === 75 || keyLow === 'k' || keyLow === 'л');
      if (isAltR || isCtrlK) {
        e.preventDefault();
        e.stopPropagation();
        toggleSpotlightSafe();
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyD' || e.keyCode === 68 || keyLow === 'd' || keyLow === 'в')) {
        e.preventDefault();
        e.stopPropagation();
        showDesktop();
        return;
      }
      if (e.key === 'Escape') {
        if (rollbackConfirm) setRollbackConfirm(null);
        else if (multitaskingOpen) setMultitaskingOpen(false);
        else if (taskbarCtxMenu) setTaskbarCtxMenu(null);
        else if (editingApp) setEditingApp(null);
        else if (propertiesTarget) setPropertiesTarget(null);
        else if (spotlightOpen) setSpotlightOpen(false);
        else if (startMenuOpen) setStartMenuOpen(false);
        else if (controlCenterOpen) setControlCenterOpen(false);
        else if (sysFolderOpen) setSysFolderOpen(false);
        else if (kbdPopoverOpen) setKbdPopoverOpen(false);
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
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('luma-toggle-spotlight', onNativeSpotlight as EventListener);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('luma-toggle-spotlight', onNativeSpotlight as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rollbackConfirm,
    multitaskingOpen,
    taskbarCtxMenu,
    editingApp,
    propertiesTarget,
    spotlightOpen,
    startMenuOpen,
    controlCenterOpen,
    sysFolderOpen,
    kbdPopoverOpen,
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
      pushToast('Окно ОС', 'Доступно при запуске LumaOS_1.2.2.exe', 'info');
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
    const intervalMs = powerProfile === 'saver' ? Math.max(4500, telemetryIntervalMs) : telemetryIntervalMs;
    const id = window.setInterval(pollSystemTelemetry, intervalMs);
    return () => window.clearInterval(id);
  }, [powerProfile, telemetryIntervalMs]);

  useEffect(() => {
    pollHostWindows();
    const winPollMs = gpuProfile === 'performance' || gpuProfile === 'eco' ? 4000 : 2500;
    const id = window.setInterval(pollHostWindows, winPollMs);
    return () => window.clearInterval(id);
  }, [gpuProfile]);

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

  // --- Dynamic Island 2.0 Reactive User Activity Pulse ---
  const triggerIslandPulse = (title: string, detail?: string, kind = 'info', barPct?: number) => {
    setIslandPulse({ id: Date.now(), title, detail, kind, barPct });
    if (islandPulseTimerRef.current) window.clearTimeout(islandPulseTimerRef.current);
    islandPulseTimerRef.current = window.setTimeout(() => {
      setIslandPulse(null);
      islandPulseTimerRef.current = null;
    }, 2600);
  };

  // --- Audio Input/Output Devices Switcher (1.2.2) ---
  const fetchAudioDevices = async (force = false) => {
    try {
      const r = await fetch(`/api/kernel/audio/devices${force ? '?refresh=1' : ''}`);
      if (r.ok) {
        const d: AudioDevicesInfo = await r.json();
        if (d?.ok) setAudioDevices(d);
      }
    } catch {
      // ignore if offline
    }
  };

  const handleSelectAudioDevice = async (dev: AudioEndpointInfo) => {
    try {
      const r = await fetch('/api/kernel/audio/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dev.id, kind: dev.kind }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.devices) setAudioDevices(d.devices);
        setAudioPickerSection('none');
        const label = dev.kind === 'output' ? 'Вывод звука' : 'Микрофон / Ввод';
        pushToast(label, dev.name, 'success');
        triggerIslandPulse(label, dev.name, 'audio');
      }
    } catch {
      pushToast('Аудиоустройство', 'Доступно при подключении к ядру LumaCore 1.2', 'info');
    }
  };

  // --- Wireless Peripheral Batteries Loader (1.2.2) ---
  const fetchWirelessBatteries = async (force = false) => {
    try {
      const r = await fetch(`/api/kernel/wireless/batteries${force ? '?refresh=1' : ''}`);
      if (r.ok) {
        const d = await r.json();
        if (d?.ok && Array.isArray(d.devices)) setWirelessBatteries(d.devices);
      }
    } catch {
      // ignore
    }
  };

  // --- World Keyboard Layout Manager & Switcher (120+ Languages, 1.2.2) ---
  const fetchKeyboardLayouts = async () => {
    try {
      const r = await fetch('/api/kernel/keyboard/layouts');
      if (r.ok) {
        const d: KeyboardLayoutsInfo = await r.json();
        if (d?.ok) setKbdLayouts(d);
      }
    } catch {
      // ignore
    }
  };

  const handleSwitchKeyboardLayout = async (tag: string, klid?: string) => {
    try {
      const r = await fetch('/api/kernel/keyboard/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, klid: klid || '' }),
      });
      if (r.ok) {
        const d: KeyboardLayoutsInfo = await r.json();
        if (d?.ok) {
          setKbdLayouts(d);
          triggerIslandPulse('Раскладка клавиатуры', `${d.active?.short || tag} · ${d.active?.native_name || tag}`, 'keyboard');
        }
      }
    } catch {
      // ignore
    }
  };

  const handleManageKeyboardLayout = async (action: 'add' | 'remove', tag: string) => {
    try {
      const r = await fetch('/api/kernel/keyboard/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tag }),
      });
      if (r.ok) {
        const d: KeyboardLayoutsInfo = await r.json();
        if (d?.ok) {
          setKbdLayouts(d);
          pushToast(
            'Языки клавиатуры',
            action === 'add' ? `Добавлена раскладка: ${tag}` : `Удалена раскладка: ${tag}`,
            'success'
          );
          triggerIslandPulse(action === 'add' ? 'Добавлена раскладка' : 'Удалена раскладка', tag, 'keyboard');
        }
      }
    } catch {
      pushToast('Языки клавиатуры', 'Не удалось обновить список раскладок', 'warning');
    }
  };

  // --- Version Rollback Releases Loader & Executor (1.2.2) ---
  const fetchRollbackReleases = async () => {
    setRollbackLoading(true);
    try {
      const r = await fetch(`/api/kernel/update/releases?repo=${encodeURIComponent(githubRepoUrl)}`);
      if (r.ok) {
        const d = await r.json();
        if (d?.ok && Array.isArray(d.releases)) setRollbackReleases(d.releases);
      }
    } catch {
      // ignore
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleConfirmRollback = async (rel: RollbackReleaseItem) => {
    setRollbackConfirm(null);
    try {
      const r = await fetch('/api/kernel/update/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: rel.version, download_url: rel.download_url }),
      });
      const d = await r.json();
      if (d?.ok && d?.progress) {
        setUpdateProgress(d.progress);
        pushToast('Откат версии Luma OS', `Переход на v${rel.version} запущен...`, 'info');
        triggerIslandPulse('Откат Luma OS', `Переход на v${rel.version}`, 'rollback');
      } else {
        pushToast('Откат версии', d?.error || 'Не удалось выполнить откат', 'warning');
      }
    } catch {
      pushToast('Откат версии', 'Ошибка запуска службы отката', 'warning');
    }
  };

  // Boot & Reactive Loaders for Audio I/O, Wireless Batteries, Keyboard Layouts & Rollback History
  useEffect(() => {
    void fetchKeyboardLayouts();
    void fetchAudioDevices(false);
    void fetchWirelessBatteries(false);
    const id = window.setInterval(() => {
      void fetchKeyboardLayouts();
      void fetchWirelessBatteries(false);
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (controlCenterOpen) {
      void fetchAudioDevices(true);
      void fetchWirelessBatteries(true);
    } else {
      setAudioPickerSection('none');
    }
  }, [controlCenterOpen]);

  useEffect(() => {
    if (settingsTab === 'updater' && windows.settings.open) {
      void fetchRollbackReleases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsTab, windows.settings.open]);

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
    const nextPlay = !mediaPlaying;
    setMediaPlaying(nextPlay);
    sendRealMediaCommand('play_pause');
    triggerIslandPulse(nextPlay ? 'Воспроизведение' : 'Пауза', displayTrackTitle, 'media');
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
    triggerIslandPulse('Следующий трек', 'Медиапоток', 'media');
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
    triggerIslandPulse('Предыдущий трек', 'Медиапоток', 'media');
  };

  const handleVolumeChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setVolume(clamped);
    if (clamped > 0 && isMuted) setIsMuted(false);
    bcRef.current?.postMessage({ volume: clamped, isMuted: clamped === 0 });
    triggerIslandPulse(clamped === 0 ? 'Без звука' : `Громкость ${clamped}%`, undefined, 'volume', clamped);
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
    triggerIslandPulse(next ? 'Звук выключен' : `Звук ${volume}%`, undefined, 'volume', next ? 0 : volume);
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

  const handleExecutePowerAction = async (
    action: 'lock' | 'sleep' | 'hibernate' | 'shutdown' | 'restart' | 'signout' | 'exit_luma' | 'recycle_bin'
  ) => {
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
      pushToast('Питание', 'Доступно при запуске LumaOS_1.2.2.exe', 'info');
    }
  };

  // --- Windows Shell Mode Sync (Fullscreen-on-Start, Autostart, Hide Windows Taskbar + Work Area) ---
  useEffect(() => {
    fetch('/api/kernel/shell-mode')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && d?.config) setShellMode(d.config);
      })
      .catch(() => {});
  }, []);

  const handleApplyShellMode = async (next: ShellModeState) => {
    setShellMode(next);
    setShellModeSaving(true);
    try {
      const r = await fetch('/api/kernel/shell-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...next,
          taskbar_position: taskbarPosition,
          taskbar_size_px: taskbarSizePx,
        }),
      });
      const d = await r.json();
      if (d?.ok && d?.config) {
        setShellMode(d.config);
        pushToast('Режим оболочки Windows', 'Параметры применены к системе', 'success');
      }
    } catch {
      pushToast('Режим оболочки', 'Настройки сохранены (активируются в LumaOS_1.2.2.exe)', 'info');
    } finally {
      setShellModeSaving(false);
    }
  };

  const handleRestoreWindowsTaskbar = async () => {
    try {
      const r = await fetch('/api/kernel/shell-restore', { method: 'POST' });
      const d = await r.json();
      if (d?.ok && d?.config) setShellMode(d.config);
      pushToast('Панель задач Windows', 'Штатная панель задач Windows восстановлена', 'success');
    } catch {
      // ignore
    }
  };

  // Emergency Hotkey Ctrl+Alt+Shift+W to restore Windows Taskbar anytime
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && e.code === 'KeyW') {
        e.preventDefault();
        void handleRestoreWindowsTaskbar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- Live Drag-to-Resize Taskbar Handler (38px..84px) ---
  useEffect(() => {
    if (!resizingTaskbar) return;
    const onMove = (e: MouseEvent) => {
      let nextPx = taskbarSizePx;
      if (taskbarPosition === 'bottom') {
        nextPx = window.innerHeight - e.clientY;
      } else if (taskbarPosition === 'top') {
        nextPx = e.clientY;
      } else {
        nextPx = e.clientX;
      }
      const clamped = Math.max(38, Math.min(84, Math.round(nextPx)));
      setTaskbarSizePx(clamped);
    };
    const onUp = () => {
      setResizingTaskbar(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizingTaskbar, taskbarPosition, taskbarSizePx]);

  // --- Real GitHub OTA Update Checker, Daily 24h Auto-Check & Live Progress Poller ---
  const handleCheckGitHubUpdates = async (silent = false) => {
    setCheckingGithub(true);
    try {
      const r = await fetch(`/api/kernel/update/check?repo=${encodeURIComponent(githubRepoUrl)}`);
      const d: GitHubUpdateCheck = await r.json();
      setUpdateInfo(d);
      try {
        localStorage.setItem('luma_last_daily_update_check_ts', String(Date.now()));
      } catch {
        // ignore
      }
      if (d?.ok) {
        if (d.has_update) {
          const lvl = d.update_level_label ? ` · ${d.update_level_label}` : '';
          setGithubUpdateStatus(`Доступна новая версия: Luma OS ${d.latest_version}${lvl} (${d.checked_at})`);
          setUpdatePopupOpen(true);
          pushToast('Доступно обновление Luma OS', `v${d.latest_version}${lvl}`, 'success');
        } else {
          setGithubUpdateStatus(
            `Актуальная версия: Luma OS ${d.current_name} · последний релиз GitHub: ${d.latest_tag} (${d.checked_at})`
          );
          if (!silent) {
            pushToast('Обновления GitHub', `У вас актуальная сборка (${d.current_name})`, 'info');
          }
        }
      } else {
        setGithubUpdateStatus(d?.error || 'Не удалось проверить релизы GitHub');
        if (!silent) {
          pushToast('Обновления GitHub', d?.error || 'Ошибка связи с GitHub', 'warning');
        }
      }
    } catch {
      setGithubUpdateStatus('Нет ответа от службы обновлений LumaCore 1.2');
      if (!silent) {
        pushToast('Обновления GitHub', 'Нет ответа от службы обновлений', 'warning');
      }
    } finally {
      setCheckingGithub(false);
    }
  };

  // Automatic Daily GitHub Release Check (runs once every 24h when auto-update is enabled)
  useEffect(() => {
    if (!githubAutoUpdate) return;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const maybeCheckDaily = () => {
      try {
        const last = Number(localStorage.getItem('luma_last_daily_update_check_ts') || '0');
        if (!last || Date.now() - last >= DAY_MS) {
          void handleCheckGitHubUpdates(true);
        }
      } catch {
        // ignore
      }
    };
    const startTimer = window.setTimeout(maybeCheckDaily, 3500);
    const interval = window.setInterval(maybeCheckDaily, 60 * 60 * 1000);
    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubAutoUpdate, githubRepoUrl]);

  // --- Luma Plugin API v2.0 Live Runner ---
  const handleRunPluginV2 = async (plugin: PluginItem) => {
    const action = plugin.actionId || 'sys.snapshot';
    setPluginRunResults((prev) => ({ ...prev, [plugin.id]: { loading: true } }));
    try {
      const r = await fetch('/api/kernel/plugins/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plugin_id: plugin.id, action }),
      });
      const d = await r.json();
      if (d?.ok) {
        const summary = d?.result?.summary || 'Команда API v2.0 выполнена';
        setPluginRunResults((prev) => ({
          ...prev,
          [plugin.id]: { loading: false, ok: true, summary, latency: d.latency_ms },
        }));
        pushToast(plugin.name, summary, 'success');
      } else {
        setPluginRunResults((prev) => ({
          ...prev,
          [plugin.id]: { loading: false, ok: false, summary: d?.error || 'Ошибка API v2.0' },
        }));
      }
    } catch {
      setPluginRunResults((prev) => ({
        ...prev,
        [plugin.id]: { loading: false, ok: false, summary: 'Нет связи с шиной Plugin API v2.0' },
      }));
    }
  };

  // --- Taskbar Reorder Helpers (Drag-and-Drop & Settings ▲/▼) ---
  const moveTaskbarOrder = (id: DexWinId, delta: -1 | 1) => {
    setTaskbarOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const target = idx + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
  };

  const reorderTaskbarByDrag = (srcId: DexWinId, dstId: DexWinId) => {
    if (srcId === dstId) return;
    setTaskbarOrder((prev) => {
      const list = [...prev];
      if (!list.includes(srcId)) list.push(srcId);
      if (!list.includes(dstId)) list.push(dstId);
      const fromIdx = list.indexOf(srcId);
      const toIdx = list.indexOf(dstId);
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      return list;
    });
  };

  // --- Open Windows Host Apps Reorder Helpers (Drag-and-Drop on Taskbar + Settings ▲/▼) ---
  const getHostWinKey = (hw: HostWindowInfo): string =>
    `${(hw.name || hw.friendly_name || String(hw.pid)).toLowerCase()}::${hw.pid}`;

  const orderedHostWindows = useMemo(() => {
    if (hostWinOrder.length === 0) return hostWindows;
    return [...hostWindows].sort((a, b) => {
      const ka = getHostWinKey(a);
      const kb = getHostWinKey(b);
      const ia = hostWinOrder.indexOf(ka);
      const ib = hostWinOrder.indexOf(kb);
      const aKeyFallback = ia !== -1 ? ia : hostWinOrder.findIndex((x) => x.startsWith(`${(a.name || '').toLowerCase()}::`));
      const bKeyFallback = ib !== -1 ? ib : hostWinOrder.findIndex((x) => x.startsWith(`${(b.name || '').toLowerCase()}::`));
      return (aKeyFallback === -1 ? 9999 : aKeyFallback) - (bKeyFallback === -1 ? 9999 : bKeyFallback);
    });
  }, [hostWindows, hostWinOrder]);

  const moveHostWinOrder = (key: string, delta: -1 | 1) => {
    const currentKeys = orderedHostWindows.map(getHostWinKey);
    const idx = currentKeys.indexOf(key);
    if (idx < 0) return;
    const target = idx + delta;
    if (target < 0 || target >= currentKeys.length) return;
    const copy = [...currentKeys];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    setHostWinOrder(copy);
  };

  const reorderHostWinByDrag = (srcKey: string, dstKey: string) => {
    if (srcKey === dstKey) return;
    const currentKeys = orderedHostWindows.map(getHostWinKey);
    if (!currentKeys.includes(srcKey)) currentKeys.push(srcKey);
    if (!currentKeys.includes(dstKey)) currentKeys.push(dstKey);
    const fromIdx = currentKeys.indexOf(srcKey);
    const toIdx = currentKeys.indexOf(dstKey);
    const [moved] = currentKeys.splice(fromIdx, 1);
    currentKeys.splice(toIdx, 0, moved);
    setHostWinOrder(currentKeys);
  };

  const handleStartGitHubUpdate = async (urlOverride?: string, verOverride?: string) => {
    const dlUrl = urlOverride || updateInfo?.download_url;
    const ver = verOverride || updateInfo?.latest_version || 'latest';
    if (!dlUrl) {
      pushToast('Обновление GitHub', 'Сначала выполните проверку обновлений', 'warning');
      return;
    }
    try {
      const r = await fetch('/api/kernel/update/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ download_url: dlUrl, target_version: ver }),
      });
      const d = await r.json();
      if (d?.ok && d?.progress) {
        setUpdateProgress(d.progress);
        pushToast('Обновление GitHub', `Загрузка Luma OS ${ver} запущена...`, 'info');
      } else {
        pushToast('Обновление GitHub', d?.error || 'Не удалось начать загрузку', 'warning');
      }
    } catch {
      pushToast('Обновление GitHub', 'Ошибка запуска обновления', 'warning');
    }
  };

  useEffect(() => {
    if (!updateProgress.running) return;
    const timer = window.setInterval(async () => {
      try {
        const r = await fetch('/api/kernel/update/progress');
        if (r.ok) {
          const p: GitHubUpdateProgress = await r.json();
          setUpdateProgress(p);
          if (p.stage === 'done' || p.stage === 'restarting') {
            pushToast('Обновление Luma OS', p.message, 'success');
          } else if (p.stage === 'error') {
            pushToast('Ошибка обновления', p.error || p.message, 'warning');
          }
        }
      } catch {
        // When restarting on Windows, server shuts down cleanly while launching new EXE
      }
    }, 350);
    return () => clearInterval(timer);
  }, [updateProgress.running]);

  const handleOpenWindowsApplet = async (applet: string, title: string) => {
    try {
      const r = await fetch('/api/kernel/system-applet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applet }),
      });
      const d = await r.json();
      if (d?.ok) pushToast('Система', `Открыто: ${title}`, 'info');
    } catch {
      // ignore
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
      triggerIslandPulse('Запуск', app.name, 'app');
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
    triggerIslandPulse('Активное окно', app.name, 'app');
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
    setDeletingAppIds((prev) => ({ ...prev, [app.id]: true }));
    triggerIslandPulse('Удалено приложение', app.name, 'trash');
    window.setTimeout(() => {
      setApps((prev) => prev.filter((a) => a.id !== app.id));
      setSelectedAppIds((prev) => prev.filter((id) => id !== app.id));
      setDeletingAppIds((prev) => {
        const copy = { ...prev };
        delete copy[app.id];
        return copy;
      });
      if (taskbarAppMenuId === app.id) setTaskbarAppMenuId(null);
      pushToast('Удалено', `«${app.name}» удалено из списка приложений`, 'info');
    }, 260);
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
      pushToast('Выбор файла', 'Введите путь вручную или используйте LumaOS_1.2.2.exe', 'info');
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
        apiVersion: item.apiVersion || '2.0',
        author: item.author,
        category: item.category,
        icon: item.icon,
        description: item.description,
        enabled: true,
        file: item.file,
        hooks: item.hooks,
        permissions: item.permissions || ['system.read'],
        actionId: item.actionId || 'sys.snapshot',
        showInLauncher: true,
        customIntervalSec: 60,
        notificationsEnabled: true,
      },
    ]);
    pushToast('Расширение API v2.0', `Модуль «${item.name}» установлен`, 'info');
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
  const dateShort = now.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' });

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

  // Taskbar pinned + dynamic open windows (sortable via taskbarOrder & drag-and-drop!)
  const rawTaskbarApps: { id: DexWinId; label: string; icon: React.ReactNode; pinned: boolean }[] = [
    { id: 'explorer', label: t('explorer', 'Проводник'), icon: <FolderOpen className="w-4 h-4" />, pinned: true },
    { id: 'apps', label: t('apps', 'Приложения'), icon: <AppWindow className="w-4 h-4" />, pinned: true },
    { id: 'ai', label: t('ai', 'Luma AI'), icon: <Sparkles className="w-4 h-4" />, pinned: aiEnabled },
    { id: 'calculator', label: t('calculator', 'Калькулятор'), icon: <Calculator className="w-4 h-4" />, pinned: true },
    { id: 'terminal', label: t('terminal', 'Терминал'), icon: <Terminal className="w-4 h-4" />, pinned: true },
    { id: 'utilities', label: t('utilities', 'Службы'), icon: <Wrench className="w-4 h-4" />, pinned: true },
    { id: 'tracker', label: t('tracker', 'Трекер'), icon: <BarChart3 className="w-4 h-4" />, pinned: false },
    { id: 'kernel', label: t('kernel', 'Ядро'), icon: <Code2 className="w-4 h-4" />, pinned: true },
    { id: 'settings', label: t('settings', 'Настройки'), icon: <Settings className="w-4 h-4" />, pinned: true },
    { id: 'taskmgr', label: t('taskmgrFull', 'Диспетчер задач'), icon: <Cpu className="w-4 h-4" />, pinned: false },
    { id: 'plugins', label: 'Расширения', icon: <Puzzle className="w-4 h-4" />, pinned: false },
    { id: 'island', label: 'Luma Island', icon: <Disc3 className="w-4 h-4" />, pinned: false },
    { id: 'spaces', label: 'Пространства', icon: <Rocket className="w-4 h-4" />, pinned: false },
  ];
  const taskbarApps = [...rawTaskbarApps].sort((a, b) => {
    const ia = taskbarOrder.indexOf(a.id);
    const ib = taskbarOrder.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const visiblePinnedOrOpenWins = taskbarApps.filter((item) => item.pinned || windows[item.id].open);
  const openSystemWindowsList = taskbarApps.filter((w) => windows[w.id].open);
  const totalActiveTasksCount =
    openSystemWindowsList.length + runningAppsCount + (taskbarShowHostWindows ? hostWindows.length : 0);
  const totalBarTabsCount =
    visiblePinnedOrOpenWins.length + runningApps.length + (taskbarShowHostWindows ? hostWindows.length : 0);
  // Automatic smart tab compression so 100+ open apps NEVER clip awkwardly while preserving readable brand names!
  const barCompression: 'normal' | 'compact' | 'icons' =
    totalBarTabsCount > 24 ? 'icons' : totalBarTabsCount > 13 ? 'compact' : 'normal';
  const topVisibleZ = Math.max(
    0,
    ...Object.values(windows).map((w) => (w.open && !w.minimized && (w.desktop ?? 1) === activeDesktop ? w.z : 0))
  );

  const handleTaskbarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const menuW = 248;
    const menuH = 268;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 12);
    setTaskbarCtxMenu({ x: Math.max(12, x), y: Math.max(12, y) });
    setStartMenuOpen(false);
    setControlCenterOpen(false);
    setSysFolderOpen(false);
    setKbdPopoverOpen(false);
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

  const isWinVisible = (id: DexWinId) =>
    windows[id].open && !windows[id].minimized && (windows[id].desktop ?? 1) === activeDesktop;

  return (
    <div
      onClick={() => {
        if (startMenuOpen) setStartMenuOpen(false);
        if (controlCenterOpen) setControlCenterOpen(false);
        if (sysFolderOpen) setSysFolderOpen(false);
        if (kbdPopoverOpen) setKbdPopoverOpen(false);
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
        onOpenSystemWindow={(w) => {
          if (w === 'security') openWindow('settings', 'security');
          else openWindow(w as DexWinId);
        }}
        onRunTerminalCommand={handleRunTerminalCommand}
        onLaunchApp={handleLaunchApp}
        onToggleMediaPlay={handleToggleMediaPlay}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onToggleMute={handleToggleMute}
        onToggleDnd={() => {
          setDndEnabled((v) => {
            triggerIslandPulse(!v ? 'Не беспокоить: ВКЛ' : 'Не беспокоить: ВЫКЛ', undefined, 'dnd');
            return !v;
          });
        }}
        onToggleIsland={handleToggleDynamicIsland}
        onToggleTheme={() => {
          const next = isDark ? 'nothing_paper' : 'nothing_mono';
          setThemeKey(next);
          triggerIslandPulse('Тема оформления', next === 'nothing_paper' ? 'Светлая бумага' : 'Графитовый тёмный', 'theme');
        }}
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
        locale={locale}
        taskbarSizePx={taskbarSizePx}
        wallpaperImageUrl={wallpaperImageUrl}
        wallpaperBlur={wallpaperBlur}
        wallpaperDim={wallpaperDim}
        wallpaperTransition={wallpaperTransition}
        liveWallpaper={liveWallpaper}
        aiEnabled={aiEnabled}
        iconSizePx={iconSizePx}
        onActivityPulse={(title, detail, icon) => triggerIslandPulse(title, detail, icon || 'info')}
      />

      {/* ==================== LAYER 2: DYNAMIC ISLAND 2.0 (REACTIVE ACTIVITY PULSE + 7-BAR HARMONIC SPECTRUM + VINYL) ==================== */}
      {dynamicIslandEnabled && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`fixed ${islandAnchorCls} left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5`}
        >
          <div
            key={islandPulse ? `pulse_${islandPulse.id}` : 'island_idle'}
            onClick={() => openIslandTab('overview')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openIslandTab('overview');
            }}
            style={
              islandGlowEnabled || displayMediaPlaying
                ? { boxShadow: '0 0 26px -2px var(--luma-accent-border), 0 12px 28px rgba(0,0,0,0.48)' }
                : undefined
            }
            className={`luma-island-pill ${islandHeightCls} pl-3 pr-2 rounded-full bg-[#0a0a0c]/95 text-zinc-100 border shadow-xl flex items-center gap-2.5 cursor-pointer whitespace-nowrap ${
              islandPulse
                ? 'luma-island-pulse border-[var(--luma-accent)]/70'
                : displayMediaPlaying
                ? 'luma-island-playing border-[var(--luma-accent)]/45'
                : 'border-white/15'
            }`}
          >
            {islandPulse ? (
              <>
                <span className="w-5 h-5 rounded-full bg-[var(--luma-accent)]/20 text-[var(--luma-accent)] flex items-center justify-center shrink-0">
                  {islandPulse.kind === 'volume' ? (
                    islandPulse.barPct === 0 ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />
                  ) : islandPulse.kind === 'audio' ? (
                    <Headphones className="w-3 h-3" />
                  ) : islandPulse.kind === 'keyboard' ? (
                    <Keyboard className="w-3 h-3" />
                  ) : islandPulse.kind === 'trash' ? (
                    <Trash2 className="w-3 h-3" />
                  ) : islandPulse.kind === 'media' ? (
                    <Music className="w-3 h-3" />
                  ) : islandPulse.kind === 'rollback' ? (
                    <History className="w-3 h-3" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-white truncate max-w-[160px]">
                    {islandPulse.title}
                  </span>
                  {islandPulse.detail && (
                    <span className="text-[10px] font-mono text-zinc-300 truncate max-w-[150px]">
                      {islandPulse.detail}
                    </span>
                  )}
                  {typeof islandPulse.barPct === 'number' && (
                    <div className="w-16 h-1.5 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--luma-accent)] transition-all duration-150"
                        style={{ width: `${Math.max(0, Math.min(100, islandPulse.barPct))}%` }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {islandShowEq && displayMediaPlaying ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-[var(--luma-accent)] via-zinc-700 to-white/60 border border-white/25 flex items-center justify-center luma-vinyl-spin shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0c]" />
                    </span>
                    <div className="flex items-end gap-[2px] h-3.5" aria-label="Audio spectrum">
                      {[0, 0.12, 0.24, 0.08, 0.32, 0.18, 0.4].map((delay, i) => (
                        <span
                          key={i}
                          className={`w-[2px] h-full rounded-full luma-wave-bar ${
                            i % 2 === 0 ? 'bg-[var(--luma-accent)]' : 'bg-white/90'
                          }`}
                          style={{ animationDelay: `${delay}s`, animationDuration: `${0.58 + (i % 3) * 0.16}s` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full ${dndEnabled ? 'bg-zinc-400' : 'bg-[var(--luma-accent)]'}`} />
                )}

                <span className={`text-[11px] font-mono truncate ${islandSize === 'expanded' ? 'max-w-[240px]' : islandSize === 'compact' ? 'max-w-[120px]' : 'max-w-[180px]'}`}>
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
              </>
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
      {isWinVisible('apps') && (
        <DexWindow
          id="apps"
          title={t('apps', 'Приложения')}
          subtitle={
            selectedAppIds.length > 0
              ? `Выбрано: ${selectedAppIds.length} из ${filteredApps.length}`
              : `${filteredApps.length} элементов · ПКМ: свойства и удаление`
          }
          icon={<AppWindow className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.apps || null}
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
                              deletingAppIds[app.id] ? 'luma-delete-app' : ''
                            } ${
                              isSel
                                ? 'border-[var(--luma-accent)] ring-1 ring-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                : app.isRunning
                                ? 'border-[var(--luma-accent-border)]'
                                : 'hover:border-zinc-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className={`rounded-xl border flex items-center justify-center shrink-0 ${btnCls}`}
                                style={{
                                  width: Math.max(30, Math.round(iconSizePx * 0.78)),
                                  height: Math.max(30, Math.round(iconSizePx * 0.78)),
                                }}
                              >
                                {renderAppIcon(
                                  app.icon,
                                  iconSizePx >= 60 ? 'w-6 h-6' : iconSizePx >= 50 ? 'w-5 h-5' : 'w-4 h-4'
                                )}
                              </div>
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
                                  deletingAppIds[app.id] ? 'luma-delete-app' : ''
                                } ${
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
                                  deletingAppIds[app.id] ? 'luma-delete-app' : ''
                                } ${
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
      {isWinVisible('explorer') && (
        <DexWindow
          id="explorer"
          title={t('explorer', 'Проводник Luma')}
          subtitle="Системные файлы · Скрытые файлы · Вкладки"
          icon={<FolderOpen className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.explorer || null}
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
      {isWinVisible('taskmgr') && (
        <DexWindow
          id="taskmgr"
          title={t('taskmgrFull', 'Диспетчер задач')}
          subtitle="Процессы Luma OS · Окна ОС · Производительность"
          icon={<Cpu className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.taskmgr || null}
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
      {isWinVisible('terminal') && (
        <DexWindow
          id="terminal"
          title={t('terminal', 'Терминал Luma Pro')}
          subtitle="Multi-Tab · Host Exec · IPC 49215"
          icon={<Terminal className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.terminal || null}
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
      {isWinVisible('tracker') && (
        <DexWindow
          id="tracker"
          title={t('tracker', 'Трекер времени')}
          subtitle="Сессии и лимиты"
          icon={<BarChart3 className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.tracker || null}
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
      {isWinVisible('kernel') && (
        <DexWindow
          id="kernel"
          title="Ядро LumaCore 1.2 (ПО 1.2.2 Lithium)"
          subtitle={kernelConnected ? 'CONNECTED · 127.0.0.1:49215' : 'STANDALONE'}
          icon={<Code2 className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.kernel || null}
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
                  href="/LumaOS_1.2.2.exe"
                  download="LumaOS_1.2.2.exe"
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-mono font-bold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  LumaOS_1.2.2.exe
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
                        sub: `${ramLoad}% занято · LumaCore 1.2`,
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
                      ['Версия ПО', '1.2.2 (Lithium)'],
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
                          software_version: '1.2.2 (Lithium)',
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
      {isWinVisible('settings') && (
        <DexWindow
          id="settings"
          title={t('settings', 'Настройки системы')}
          subtitle="Luma OS 1.2.2 (Lithium)"
          icon={<Settings className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.settings || null}
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
                    ['kernel_ui', t('tabKernelUI', 'Ядро UI'), <Cpu className="w-4 h-4 shrink-0" />, 'ядро ui имя устройства модель версия по 1.2.2 lithium ядра 1.2 пасхалка kernel'],
                    ['graphics', 'Графика и Экран', <Monitor className="w-4 h-4 shrink-0" />, 'графика gpu оптимизация адаптация экрана масштаб монитор ноутбук размытие blur тени fps'],
                    ['security', t('tabSecurity', 'Безопасность и AV'), <ShieldCheck className="w-4 h-4 shrink-0" />, 'безопасность антивирус lumashield 1.3 guard defender карантин eicar исключения вирусы проверка security'],
                    ['ai_settings', t('tabAI', 'ИИ и Нейросети'), <Sparkles className="w-4 h-4 shrink-0" />, 'ии нейросети luma lang code объём кратко баланс подробно verbosity кодер языковая отключить автономный голос ai'],
                    ['battery', t('tabBattery', 'Батарея и экран'), <BatteryCharging className="w-4 h-4 shrink-0" />, 'батарея акб беспроводные мышь клавиатура наушники циклы зарядки график разряда здоровье экранное время battery'],
                    ['language', t('tabLanguage', 'Язык и клавиатура'), <Languages className="w-4 h-4 shrink-0" />, 'язык клавиатура раскладка keyboard layout 120 стран мира language english romanian polish turkish arabic korean регион'],
                    ['shell_mode', t('tabShellMode', 'Оболочка Windows'), <Monitor className="w-4 h-4 shrink-0" />, 'оболочка windows полный экран fullscreen автозапуск autostart поверх виндовс скрыть панель задач chrome'],
                    ['appearance', t('tabThemes', 'Темы и обои'), <Sliders className="w-4 h-4 shrink-0" />, 'темы 8 тем акцент шрифт масштаб прозрачность blur размытие скругление анимации стиль nothing pixelbook сетка обои wallpaper бэкап backup'],
                    ['taskbar', t('tabTaskbar', 'Панель задач'), <LayoutPanelLeft className="w-4 h-4 shrink-0" />, 'панель задач папка luma система док порядок приложений windows chrome steam снизу слева сверху размер высота сжатие taskbar'],
                    ['storage', t('tabStorage', 'Память и Файлы'), <HardDrive className="w-4 h-4 shrink-0" />, 'память озу ram диски накопители проводник скрытые файлы storage disk files'],
                    ['bluetooth', t('tabBluetooth', 'Bluetooth'), <Bluetooth className="w-4 h-4 shrink-0" />, 'bluetooth блютуз беспроводные мышь клавиатура наушники заряд процент адаптер устройства'],
                    ['power', t('tabPower', 'Питание'), <Leaf className="w-4 h-4 shrink-0" />, 'энергосбережение питание батарея яркость производительность сбалансированный сон power battery'],
                    ['apps_list', t('apps', 'Приложения и иконки'), <AppWindow className="w-4 h-4 shrink-0" />, 'приложения иконки размер увеличить редактировать программы список удалить свойства apps'],
                    ['notifications', t('notifications', 'Уведомления'), <Bell className="w-4 h-4 shrink-0" />, 'уведомления оповещения звук баннеры dnd не беспокоить журнал notifications'],
                    ['island', t('tabIsland', 'Luma Island'), <Disc3 className="w-4 h-4 shrink-0" />, 'luma island 2.0 динамический остров анимации музыка спектр буфер обмена заметка эквалайзер таймер'],
                    ['clock', t('tabClock', 'Часы'), <Clock className="w-4 h-4 shrink-0" />, 'часы циферблат время секунды дата свечение формат clock'],
                    ['luma', 'Система и Железо', <Activity className="w-4 h-4 shrink-0" />, 'система железо процессор видеокарта cpu gpu регион погода музыка'],
                    ['navigation', 'Навигация', <MousePointerClick className="w-4 h-4 shrink-0" />, 'навигация пкм назад горячие клавиши alt+r ctrl+k alt+w spotlight мультизадачность'],
                    ['plugins', 'Окна и Плагины', <LayoutGrid className="w-4 h-4 shrink-0" />, 'окна плагины api 2.0 колонки сетка расширения'],
                    ['updater', t('tabUpdater', 'Обновления и Откат'), <Stethoscope className="w-4 h-4 shrink-0" />, 'обновления откат версии rollback downgrade github ota ежедневная проверка патч прогресс бар новая версия диагностика'],
                    ['about', t('tabAbout', 'О системе'), <Info className="w-4 h-4 shrink-0" />, 'о системе версия 1.2.2 lithium история изменений changelog exe скачать'],
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
                  onTriggerEasterEgg={() => setEasterEggOpen(true)}
                />
              )}

              {/* GRAPHICS, GPU OPTIMIZATION & ADAPTIVE DISPLAY SCALING (1.2.2 LITHIUM) */}
              {settingsTab === 'graphics' && (
                <div className="space-y-4 text-xs">
                  {/* 1. Adaptive Display Scaling (Laptop <-> Monitor consistency!) */}
                  <div className={`p-4 rounded-2xl border space-y-3.5 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-[var(--luma-accent)]" />
                          Автоадаптация экрана (Ноутбук ↔ Монитор)
                        </div>
                        <div className={`mt-0.5 ${mutedCls}`}>
                          Автоматически масштабирует интерфейс под разрешение и диагональ экрана, чтобы после ноутбука на большом мониторе всё оставалось крупным и пропорциональным
                        </div>
                      </div>
                      <button onClick={() => setAutoDisplayScale((v) => !v)} className="cursor-pointer">
                        <StatusPill active={autoDisplayScale} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                      <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                        <div className={mutedCls}>Экран</div>
                        <div className="font-bold">
                          {typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : '1440×900'}
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                        <div className={mutedCls}>Авто-фактор</div>
                        <div className="font-bold text-emerald-400">{viewportAutoPct}%</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                        <div className={mutedCls}>Ручной масштаб</div>
                        <div className="font-bold">{uiScale}%</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                        <div className={mutedCls}>Итоговый размер</div>
                        <div className="font-bold text-[var(--luma-accent)]">
                          {autoDisplayScale ? Math.round((viewportAutoPct * uiScale) / 100) : uiScale}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={mutedCls}>Точный ручной масштаб интерфейса:</span>
                        <span className="font-mono font-bold text-[var(--luma-accent)]">{uiScale}%</span>
                      </div>
                      <input
                        type="range"
                        min={85}
                        max={135}
                        step={5}
                        value={uiScale}
                        onChange={(e) => setUiScale(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="grid grid-cols-5 gap-1.5 font-mono">
                        {[90, 100, 110, 120, 130].map((sc) => (
                          <button
                            key={sc}
                            onClick={() => setUiScale(sc)}
                            className={`py-1.5 rounded-xl border font-bold cursor-pointer ${
                              uiScale === sc ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                            }`}
                          >
                            {sc}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2. GPU Optimization Profiles */}
                  <div className={`p-4 rounded-2xl border space-y-3.5 ${surfaceCls}`}>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[var(--luma-accent)]" />
                        Оптимизация графических процессов (GPU)
                      </div>
                      <div className={`mt-0.5 ${mutedCls}`}>
                        Снижайте нагрузку на видеокарту (WebView2 / DWM композитор) отключением тяжёлого размытия, теней и фоновых анимаций
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          ['ultra', 'Ультра', 'Максимум стекла и 60 FPS'],
                          ['balanced', 'Баланс', 'Оптимально для ПК и ноутбуков'],
                          ['performance', 'Минимум GPU', 'Без blur, теней и анимаций'],
                          ['eco', 'Эко-ноутбук', 'Экономия заряда и GPU'],
                        ] as const
                      ).map(([id, title, desc]) => (
                        <button
                          key={id}
                          onClick={() => applyGpuProfile(id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                            gpuProfile === id
                              ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                              : btnCls
                          }`}
                        >
                          <div className="font-bold">{title}</div>
                          <div className={`text-[10px] mt-0.5 leading-snug ${mutedCls}`}>{desc}</div>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          label: 'Стеклянное размытие (backdrop-filter)',
                          sub: 'Отключение снижает нагрузку на GPU на 30–60%',
                          active: gpuBlurEnabled,
                          toggle: () => setGpuBlurEnabled((v) => !v),
                        },
                        {
                          label: 'Тени и неоновое свечение окон',
                          sub: 'Ускоряет перетаскивание и ресайз окон на слабых GPU',
                          active: gpuShadowsEnabled,
                          toggle: () => setGpuShadowsEnabled((v) => !v),
                        },
                        {
                          label: 'Автопауза живых обоев при окнах',
                          sub: 'Останавливает GPU-анимацию обоев, пока открыто любое окно',
                          active: gpuPauseLiveWp,
                          toggle: () => setGpuPauseLiveWp((v) => !v),
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          onClick={row.toggle}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${btnCls}`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold truncate">{row.label}</div>
                            <div className={`text-[10px] truncate ${mutedCls}`}>{row.sub}</div>
                          </div>
                          <StatusPill active={row.active} />
                        </div>
                      ))}

                      <div className={`p-3 rounded-xl border space-y-1.5 ${btnCls}`}>
                        <div className="font-bold">Частота опроса телеметрии ядра</div>
                        <div className="grid grid-cols-3 gap-1 font-mono text-[11px]">
                          {([1500, 3000, 6000] as const).map((ms) => (
                            <button
                              key={ms}
                              onClick={() => setTelemetryIntervalMs(ms)}
                              className={`py-1 rounded-lg border font-bold cursor-pointer ${
                                telemetryIntervalMs === ms
                                  ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                  : surfaceCls
                              }`}
                            >
                              {(ms / 1000).toFixed(1)}s
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY CORE & ZERO-CONFLICT LOCAL ANTIVIRUS */}
              {settingsTab === 'security' && (
                <LumaSecurityPanel
                  isDark={isDark}
                  surfaceCls={surfaceCls}
                  btnCls={btnCls}
                  mutedCls={mutedCls}
                  onPushToast={pushToast}
                  onOpenWindowsDefender={() => void handleOpenWindowsApplet('defender', 'Windows Defender')}
                />
              )}

              {/* LAPTOP BATTERY ANALYTICS, CYCLES, HEALTH & 7-DAY SCREEN-ON TIME */}
              {settingsTab === 'battery' && (
                <LumaBatteryPanel
                  isDark={isDark}
                  lang={lang}
                  activePowerPlan={powerProfile}
                  onSelectPowerPlan={handleChangePowerProfile}
                />
              )}

              {/* AI & NEURAL NETWORKS SETTINGS (WITH MASTER KILL SWITCH + 2 LOCAL MODELS) */}
              {settingsTab === 'ai_settings' && (
                <div className="space-y-4 text-xs">
                  {/* Master AI Kill Switch */}
                  <div
                    className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                      aiEnabled ? surfaceCls : 'border-amber-500/40 bg-amber-500/10'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <Power className={`w-4 h-4 ${aiEnabled ? 'text-emerald-400' : 'text-amber-400'}`} />
                        Подсистема Luma AI ({aiEnabled ? 'Включена' : 'Отключена'})
                      </div>
                      <div className={`mt-0.5 ${mutedCls}`}>
                        {aiEnabled
                          ? 'Активны две встроенные модели (Языковая Luma Lang 1.2 и Кодер Luma Code 1.2) + облачные API'
                          : 'ИИ полностью отключён в ядре и скрыт с панели задач для экономии ресурсов ПК'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleToggleAiEnabled(!aiEnabled)}
                        className={`px-3.5 py-2 rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                          aiEnabled
                            ? 'bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500 hover:text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {aiEnabled ? 'Отключить Luma AI' : 'Включить Luma AI'}
                      </button>
                      {aiEnabled && (
                        <button
                          onClick={() => openWindow('ai')}
                          className="px-3.5 py-2 rounded-xl bg-[var(--luma-accent)] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Открыть чат
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2 Dedicated Local Variations Selector + AI Information Volume (Verbosity) */}
                  {aiEnabled && (
                    <div className="space-y-3">
                      <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
                        <div className="font-bold">Вариация встроенного Luma AI 1.2</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {(
                            [
                              ['auto', 'Авто (Гибрид)', 'Сам выбирает между Языковой и Кодером'],
                              ['language', 'Luma Lang 1.2 (Языковая)', 'Энциклопедия (45+ тем + Wikipedia), знания, расчёты'],
                              ['code', 'Luma Code 1.2 (Кодер)', 'Программирование на 12 языках, скрипты, боты'],
                            ] as const
                          ).map(([modeId, title, desc]) => (
                            <button
                              key={modeId}
                              onClick={() => setAiConfig({ ...aiConfig, provider: 'luma_local', aiMode: modeId })}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                                (aiConfig.aiMode || 'auto') === modeId
                                  ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                  : btnCls
                              }`}
                            >
                              <div className="font-bold">{title}</div>
                              <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold">Объём информации в ответах ИИ</div>
                          <span className="text-[10px] font-mono text-[var(--luma-accent)] font-bold">
                            {(aiConfig.verbosity || 'balanced') === 'brief'
                              ? 'КРАТКО'
                              : (aiConfig.verbosity || 'balanced') === 'detailed'
                              ? 'ПОДРОБНО'
                              : 'БАЛАНС'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {(
                            [
                              ['brief', 'Кратко', '1–3 лаконичных тезиса, только суть без лишней воды'],
                              ['balanced', 'Баланс', 'Оптимальная структура: ключевые факты, примеры и вывод'],
                              ['detailed', 'Подробно', 'Глубокий разбор, расширенная Wikipedia, пошаговые детали и код'],
                            ] as const
                          ).map(([vId, title, desc]) => (
                            <button
                              key={vId}
                              onClick={() => {
                                setAiConfig({ ...aiConfig, verbosity: vId });
                                pushToast('Luma AI', `Объём ответов: ${title}`, 'info');
                              }}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                                (aiConfig.verbosity || 'balanced') === vId
                                  ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                  : btnCls
                              }`}
                            >
                              <div className="font-bold">{title}</div>
                              <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls} ${!aiEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="font-bold">Активный провайдер</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {AI_PROVIDER_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setAiConfig({ ...aiConfig, provider: p.id })}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                            aiConfig.provider === p.id
                              ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                              : btnCls
                          }`}
                        >
                          <div className="font-bold truncate">{p.label}</div>
                          <div className={`text-[10px] font-mono ${mutedCls}`}>{p.badge}</div>
                        </button>
                      ))}
                    </div>

                    {(() => {
                      const activeP = AI_PROVIDER_PRESETS.find((x) => x.id === aiConfig.provider) || AI_PROVIDER_PRESETS[0];
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <label className="space-y-1">
                            <span className={`text-[11px] font-mono ${mutedCls}`}>API-ключ ({activeP.label})</span>
                            <input
                              type="password"
                              value={aiConfig.apiKeys[aiConfig.provider] || ''}
                              onChange={(e) =>
                                setAiConfig({
                                  ...aiConfig,
                                  apiKeys: { ...aiConfig.apiKeys, [aiConfig.provider]: e.target.value },
                                })
                              }
                              placeholder={activeP.hint}
                              className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none ${btnCls}`}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className={`text-[11px] font-mono ${mutedCls}`}>Модель</span>
                            <input
                              value={aiConfig.models[aiConfig.provider] || activeP.defaultModel}
                              onChange={(e) =>
                                setAiConfig({
                                  ...aiConfig,
                                  models: { ...aiConfig.models, [aiConfig.provider]: e.target.value },
                                })
                              }
                              className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none ${btnCls}`}
                            />
                          </label>
                        </div>
                      );
                    })()}

                    <div
                      onClick={() => setAiConfig({ ...aiConfig, includeSystemContext: !aiConfig.includeSystemContext })}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${btnCls}`}
                    >
                      <div>
                        <div className="font-bold">Передавать живую телеметрию ПК в контекст ИИ</div>
                        <div className={`text-[11px] ${mutedCls}`}>Позволяет нейросети видеть CPU/RAM/ОС для точной помощи</div>
                      </div>
                      <StatusPill active={aiConfig.includeSystemContext} />
                    </div>
                  </div>
                </div>
              )}

              {/* MULTI-LANGUAGE SETTINGS (18 SYSTEM UI LANGUAGES + 120+ WORLD KEYBOARD LAYOUTS) */}
              {settingsTab === 'language' && (
                <div className="space-y-4 text-xs">
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${surfaceCls}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold flex items-center gap-2">
                        <Languages className="w-4 h-4 text-[var(--luma-accent)]" />
                        {t('tabLanguage', 'Язык интерфейса и клавиатуры')}
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-mono text-[10px] font-bold">
                        {LUMA_LANGUAGES.length} UI · {WORLD_KEYBOARD_LANGUAGES.length}+ клавиатур
                      </span>
                    </div>
                    <div className={mutedCls}>{t('languageDesc')}</div>
                  </div>

                  <div className="space-y-2">
                    <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                      Язык интерфейса системы ({LUMA_LANGUAGES.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {LUMA_LANGUAGES.map((l) => {
                        const active = lang === l.code;
                        return (
                          <button
                            key={l.code}
                            onClick={() => {
                              setLang(l.code);
                              pushToast('Language / Язык', `${l.name} (${l.locale})`, 'success');
                              triggerIslandPulse('Язык системы', l.name, 'keyboard');
                            }}
                            className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-2 cursor-pointer transition ${
                              active
                                ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] shadow-sm'
                                : surfaceCls
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">{l.name}</div>
                              <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                                {l.englishName} · {l.locale}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold shrink-0 ${
                                active ? 'bg-[var(--luma-accent)] text-white' : btnCls
                              }`}
                            >
                              {l.tag}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* World Keyboard Layouts Manager (120+ Languages) */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Keyboard className="w-4 h-4 text-[var(--luma-accent)]" />
                          Раскладки клавиатуры · Все языки мира ({WORLD_KEYBOARD_LANGUAGES.length})
                        </div>
                        <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
                          Активная раскладка в системе: <span className="font-mono font-bold text-[var(--luma-accent)]">{kbdLayouts?.active?.short || 'RUS'}</span> ({kbdLayouts?.active?.native_name || 'Русский'})
                        </div>
                      </div>
                      <button
                        onClick={() => void fetchKeyboardLayouts()}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
                      >
                        <RefreshCw className="w-3 h-3" /> Обновить
                      </button>
                    </div>

                    {/* Installed Keyboard Layouts */}
                    <div className="space-y-1.5">
                      <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                        Установленные раскладки ({kbdLayouts?.installed?.length || 0}) — клик для мгновенного переключения
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(kbdLayouts?.installed || []).map((lay) => (
                          <div
                            key={lay.tag}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition ${
                              lay.active
                                ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                : btnCls
                            }`}
                          >
                            <button
                              onClick={() => void handleSwitchKeyboardLayout(lay.tag, lay.hkl)}
                              className="inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <span
                                className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                  lay.active ? 'bg-[var(--luma-accent)] text-white' : 'bg-black/20'
                                }`}
                              >
                                {lay.short}
                              </span>
                              <span className="font-semibold">{lay.native_name || lay.name}</span>
                              <span className={`text-[10px] font-mono ${mutedCls}`}>{lay.tag}</span>
                            </button>
                            {(kbdLayouts?.installed?.length || 0) > 1 && (
                              <button
                                onClick={() => void handleManageKeyboardLayout('remove', lay.tag)}
                                title={`Удалить ${lay.tag}`}
                                className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Search + Region Filter for 120+ World Languages */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className={`flex-1 min-w-[200px] flex items-center gap-2 px-3 py-1.5 rounded-xl border ${btnCls}`}>
                        <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <input
                          value={worldLangQuery}
                          onChange={(e) => setWorldLangQuery(e.target.value)}
                          placeholder="Поиск любого языка мира (русский, română, 日本語, العربية, français, hindi...)"
                          className="w-full bg-transparent outline-none text-xs placeholder:text-zinc-500"
                        />
                        {worldLangQuery && (
                          <button onClick={() => setWorldLangQuery('')} className="cursor-pointer opacity-70 hover:opacity-100">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {['Все', 'СНГ', 'Европа', 'Азия', 'Ближний Восток', 'Америка', 'Африка', 'Океания'].map((reg) => (
                        <button
                          key={reg}
                          onClick={() => setWorldLangRegion(reg)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                            worldLangRegion === reg
                              ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                              : btnCls
                          }`}
                        >
                          {reg}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
                      {WORLD_KEYBOARD_LANGUAGES.filter((wl) => {
                        if (worldLangRegion !== 'Все' && wl.region !== worldLangRegion) return false;
                        const q = worldLangQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          wl.nameRu.toLowerCase().includes(q) ||
                          wl.nativeName.toLowerCase().includes(q) ||
                          wl.englishName.toLowerCase().includes(q) ||
                          wl.tag.toLowerCase().includes(q) ||
                          wl.short.toLowerCase().includes(q)
                        );
                      }).map((wl) => {
                        const isInstalled = (kbdLayouts?.installed || []).some(
                          (x) => x.tag.toLowerCase() === wl.tag.toLowerCase()
                        );
                        const isActive = (kbdLayouts?.active_tag || '').toLowerCase() === wl.tag.toLowerCase();
                        return (
                          <div
                            key={wl.tag}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                              isActive
                                ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                : btnCls
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold truncate">{wl.nameRu}</div>
                              <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                                {wl.nativeName} · {wl.tag}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isInstalled ? (
                                <button
                                  onClick={() => void handleSwitchKeyboardLayout(wl.tag, wl.klid)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                    isActive
                                      ? 'bg-[var(--luma-accent)] text-white'
                                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                  }`}
                                >
                                  {isActive ? 'Активен' : 'Выбрать'}
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    await handleManageKeyboardLayout('add', wl.tag);
                                    await handleSwitchKeyboardLayout(wl.tag, wl.klid);
                                  }}
                                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer hover:border-[var(--luma-accent)] ${surfaceCls}`}
                                >
                                  + Добавить
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* WINDOWS SHELL MODE (FULLSCREEN ON START, AUTOSTART, HIDE WINDOWS TASKBAR FOR CHROME/APPS) */}
              {settingsTab === 'shell_mode' && (
                <div className="space-y-4 text-xs">
                  <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-[var(--luma-accent)]" />
                        Режим оболочки поверх Windows
                      </div>
                      <div className={`mt-0.5 ${mutedCls}`}>
                        Автозапуск с Windows, полный экран при старте и скрытие штатной панели задач Windows при работе с Chrome и другими программами.
                      </div>
                    </div>
                    <button
                      onClick={() => void handleRestoreWindowsTaskbar()}
                      className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer ${btnCls}`}
                    >
                      Восстановить панель Windows
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      {
                        key: 'start_fullscreen' as const,
                        title: 'Открывать Luma OS сразу на весь экран',
                        desc: 'Запускает оболочку в безрамочном полноэкранном режиме (WS_POPUP) без заголовка окна Windows',
                        val: shellMode.start_fullscreen,
                      },
                      {
                        key: 'autostart_with_os' as const,
                        title: 'Автозапуск сразу вместе с системой Windows',
                        desc: 'Прописывает LumaOS в реестр автозагрузки HKCU\\...\\CurrentVersion\\Run (с флагом полного экрана, если включён)',
                        val: shellMode.autostart_with_os,
                      },
                      {
                        key: 'hide_windows_taskbar' as const,
                        title: 'Скрыть панель задач Windows (поверх Windows)',
                        desc: 'Скрывает Shell_TrayWnd / SecondaryTrayWnd во время работы Luma OS — при запуске Chrome и других программ панель Windows не видна. Автоматически восстанавливается при выходе из Luma OS или по Ctrl+Alt+Shift+W!',
                        val: shellMode.hide_windows_taskbar,
                      },
                      {
                        key: 'reserve_work_area' as const,
                        title: 'Резервировать место под панель задач Luma (SPI_SETWORKAREA)',
                        desc: 'Развёрнутые окна (Chrome, VS Code, Проводник) останавливаются ровно у границы панели Luma и не перекрывают её',
                        val: shellMode.reserve_work_area,
                      },
                      {
                        key: 'always_on_top' as const,
                        title: 'Закрепить окно Luma поверх других окон (Topmost)',
                        desc: 'Удерживает оболочку поверх обычных окон (удобно на втором мониторе; выключите, если работаете в Chrome поверх рабочего стола)',
                        val: shellMode.always_on_top,
                      },
                    ].map((opt) => (
                      <div
                        key={opt.key}
                        onClick={() =>
                          !shellModeSaving &&
                          void handleApplyShellMode({
                            ...shellMode,
                            [opt.key]: !opt.val,
                          })
                        }
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 cursor-pointer transition ${surfaceCls}`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold">{opt.title}</div>
                          <div className={`text-[11px] mt-0.5 leading-relaxed ${mutedCls}`}>{opt.desc}</div>
                        </div>
                        <StatusPill active={opt.val} />
                      </div>
                    ))}
                  </div>

                  <div className={`p-3 rounded-xl border font-mono text-[11px] ${btnCls}`}>
                    Экстренное восстановление панели Windows: <span className="text-[var(--luma-accent)] font-bold">Ctrl + Alt + Shift + W</span> (также панель автоматически возвращается при любом закрытии LumaOS_1.2.2.exe).
                  </div>
                </div>
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
                        Точный размер (38–84 px), перетаскивание края панели мышью, умное сжатие до 100+ вкладок и Диспетчер задач
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
                      <div className="flex items-center justify-between">
                        <span className={mutedCls}>Точный размер панели задач:</span>
                        <span className="font-mono font-bold text-[var(--luma-accent)]">{taskbarSizePx} px</span>
                      </div>
                      <input
                        type="range"
                        min={38}
                        max={84}
                        step={2}
                        value={taskbarSizePx}
                        onChange={(e) => setTaskbarSizePx(Number(e.target.value))}
                        className="w-full accent-[var(--luma-accent)]"
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        {(
                          [
                            [42, 'Мини'],
                            [52, 'Стандарт'],
                            [64, 'Крупная'],
                            [78, 'Макси'],
                          ] as const
                        ).map(([px, label]) => (
                          <button
                            key={px}
                            onClick={() => {
                              setTaskbarSizePx(px);
                              setTaskbarSize(px <= 44 ? 'compact' : px >= 62 ? 'large' : 'standard');
                            }}
                            className={`py-1.5 rounded-xl border font-semibold cursor-pointer ${
                              Math.abs(taskbarSizePx - px) <= 3
                                ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                : btnCls
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className={`text-[10px] ${mutedCls}`}>
                        Совет: потяните мышью за внутренний край самой панели задач, чтобы менять её размер вживую!
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        label: 'Сжать системные приложения в папку',
                        sub: 'Объединяет Проводник, ИИ, Терминал, Настройки и др. в 1 папку «Luma Система»',
                        active: taskbarCollapseSysFolder,
                        toggle: () => {
                          setTaskbarCollapseSysFolder((v) => {
                            const next = !v;
                            setSysFolderOpen(false);
                            pushToast('Панель задач', next ? 'Системные приложения сжаты в папку «Luma Система»' : 'Системные приложения развёрнуты на панели', 'info');
                            triggerIslandPulse('Панель задач', next ? 'Папка «Luma Система» ВКЛ' : 'Развёрнутый вид', 'info');
                            return next;
                          });
                        },
                      },
                      {
                        label: 'Показывать открытые приложения ОС',
                        sub: `Все запущенные программы ПК на панели (${hostWindows.length} сейчас)`,
                        active: taskbarShowHostWindows,
                        toggle: () => setTaskbarShowHostWindows((v) => !v),
                      },
                      {
                        label: 'Подписи окон на панели',
                        sub: 'Автоматически сжимаются при открытии множества приложений',
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

                  {/* Open PC Applications Naming Mode Selector */}
                  <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-emerald-500" />
                        Как отображать открытые приложения ПК на панели задач
                      </div>
                      <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
                        Выберите понятные имена программ (Chrome, Steam, Telegram, VS Code), полный заголовок активной вкладки или компактные значки
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          {
                            id: 'app_name' as HostWinLabelMode,
                            title: 'Имя приложения',
                            desc: 'Chrome, Steam, Telegram, Discord…',
                          },
                          {
                            id: 'window_title' as HostWinLabelMode,
                            title: 'Заголовок окна',
                            desc: 'Полное название вкладки / документа',
                          },
                          {
                            id: 'compact' as HostWinLabelMode,
                            title: 'Компактный бейдж',
                            desc: 'Только короткий значок и подсказка',
                          },
                        ]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setHostWinLabelMode(opt.id);
                            pushToast('Панель задач', `Режим открытых приложений: ${opt.title}`, 'info');
                          }}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            hostWinLabelMode === opt.id
                              ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                              : btnCls
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between gap-1">
                            <span>{opt.title}</span>
                            {hostWinLabelMode === opt.id && (
                              <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)] shrink-0" />
                            )}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reorderable Open Windows Host Applications Order Editor (1.2.2) */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-emerald-500" />
                          Порядок открытых приложений Windows ({orderedHostWindows.length})
                        </div>
                        <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
                          Меняйте порядок открытых окон (Chrome, Steam, Discord и др.) кнопками ▲/▼ или просто перетаскивайте мышкой на панели задач
                        </div>
                      </div>
                      {hostWinOrder.length > 0 && (
                        <button
                          onClick={() => {
                            setHostWinOrder([]);
                            pushToast('Панель задач', 'Порядок окон Windows сброшен', 'info');
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${btnCls}`}
                        >
                          Сбросить
                        </button>
                      )}
                    </div>
                    {orderedHostWindows.length === 0 ? (
                      <div className={`p-3 rounded-xl border text-[11px] font-mono ${btnCls} ${mutedCls}`}>
                        Сейчас нет сторонних открытых окон ОС — откройте любое приложение (Chrome, Steam, Telegram и др.), и оно появится здесь для сортировки.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {orderedHostWindows.map((hw, idx) => {
                          const key = getHostWinKey(hw);
                          const friendly = hw.friendly_name || hw.name;
                          return (
                            <div
                              key={key}
                              className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-[10px] font-mono w-4 text-center ${mutedCls}`}>{idx + 1}</span>
                                <Monitor className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{friendly}</div>
                                  {hw.title && hw.title !== friendly && (
                                    <div className={`text-[10px] truncate ${mutedCls}`}>{hw.title}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  disabled={idx === 0}
                                  onClick={() => moveHostWinOrder(key, -1)}
                                  title="Переместить левее / выше"
                                  className={`w-6 h-6 rounded-lg border text-[10px] font-bold flex items-center justify-center cursor-pointer disabled:opacity-35 ${surfaceCls}`}
                                >
                                  ▲
                                </button>
                                <button
                                  disabled={idx === orderedHostWindows.length - 1}
                                  onClick={() => moveHostWinOrder(key, 1)}
                                  title="Переместить правее / ниже"
                                  className={`w-6 h-6 rounded-lg border text-[10px] font-bold flex items-center justify-center cursor-pointer disabled:opacity-35 ${surfaceCls}`}
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Reorderable Taskbar App Order Editor */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <ArrowUpDown className="w-4 h-4 text-[var(--luma-accent)]" />
                          Порядок системных приложений Luma на панели задач
                        </div>
                        <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
                          Переставляйте кнопками ▲/▼ здесь или просто перетаскивайте значки мышкой прямо на панели задач
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setTaskbarOrder([
                            'explorer',
                            'apps',
                            'ai',
                            'calculator',
                            'terminal',
                            'utilities',
                            'tracker',
                            'kernel',
                            'settings',
                            'taskmgr',
                            'plugins',
                            'island',
                            'spaces',
                          ]);
                          pushToast('Панель задач', 'Порядок приложений сброшен по умолчанию', 'info');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${btnCls}`}
                      >
                        Сбросить порядок
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {taskbarApps.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[10px] font-mono w-4 text-center ${mutedCls}`}>{idx + 1}</span>
                            <span className="text-[var(--luma-accent)] shrink-0">{item.icon}</span>
                            <span className="font-semibold truncate">{item.label}</span>
                            {item.pinned && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]">
                                Закреплено
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              disabled={idx === 0}
                              onClick={() => moveTaskbarOrder(item.id, -1)}
                              title="Переместить левее / выше"
                              className={`w-6 h-6 rounded-lg border text-[10px] font-bold flex items-center justify-center cursor-pointer disabled:opacity-35 ${surfaceCls}`}
                            >
                              ▲
                            </button>
                            <button
                              disabled={idx === taskbarApps.length - 1}
                              onClick={() => moveTaskbarOrder(item.id, 1)}
                              title="Переместить правее / ниже"
                              className={`w-6 h-6 rounded-lg border text-[10px] font-bold flex items-center justify-center cursor-pointer disabled:opacity-35 ${surfaceCls}`}
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
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
                  iconSizePx={iconSizePx}
                  onChangeIconSizePx={setIconSizePx}
                  onUpdateApp={(updated) => {
                    setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
                    pushToast('Приложение обновлено', updated.name, 'success');
                  }}
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
                        title: 'Проверка уведомлений Luma OS 1.2.2 (Lithium)',
                        message: 'Система оповещений Luma OS 1.2.2 (Lithium) работает штатно.',
                        time: tStr,
                        unread: true,
                      },
                      ...prev,
                    ]);
                    pushToast('Luma OS 1.2.2 (Lithium)', 'Тестовое уведомление доставлено', 'success');
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
                      <div className="text-sm font-bold">Luma OS 1.2.2 (Lithium) · LumaCore 1.2</div>
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

                  {/* Wallpaper Image Engine 1.2.0 (Bespoke Lithium/Obsidian/Helium Art, Live Mesh, 4 Transitions, Custom Upload) */}
                  <div className={`p-4 rounded-xl border space-y-3.5 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Image className="w-4 h-4 text-[var(--luma-accent)]" />
                          {t('wallpaperLabel', 'Галерея обоев и анимации смены')}
                        </div>
                        <div className={`text-xs ${mutedCls}`}>
                          Фирменные 3D-обои Lithium & Obsidian, живые градиенты, загрузка фото и плавная анимация смены
                        </div>
                      </div>
                      {(wallpaperImageUrl || liveWallpaper) && (
                        <button
                          onClick={() => {
                            setWallpaperImageUrl('');
                            setLiveWallpaper('');
                          }}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-mono cursor-pointer ${btnCls}`}
                        >
                          {t('reset', 'Сбросить')}
                        </button>
                      )}
                    </div>

                    {/* 4 Wallpaper Transition Animations */}
                    <div className="space-y-1.5">
                      <div className={`text-[11px] font-mono uppercase tracking-wider ${mutedCls}`}>
                        {t('wallpaperAnimTitle', 'Анимация смены обоев')}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                        {(
                          [
                            ['iris', t('animIris', 'Сфера (Iris)')],
                            ['bloom', t('animBloom', 'Сияние (Bloom)')],
                            ['wipe', t('animWipe', 'Луч (Wipe)')],
                            ['morph', t('animMorph', 'Фокус (Morph)')],
                          ] as [WallpaperTransitionMode, string][]
                        ).map(([mId, mLabel]) => (
                          <button
                            key={mId}
                            onClick={() => setWallpaperTransition(mId)}
                            className={`py-1.5 px-2.5 rounded-xl border font-semibold cursor-pointer transition ${
                              wallpaperTransition === mId
                                ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white shadow'
                                : btnCls
                            }`}
                          >
                            {mLabel}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bespoke & Curated Static Wallpapers */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { label: 'Без картинки (Тема)', url: '', preview: '' },
                        { label: 'Lithium 1.2 Crystal', url: '/luma-lithium-hero.jpg', preview: '/luma-lithium-hero.jpg' },
                        { label: 'Obsidian Silk', url: '/luma-obsidian-silk.jpg', preview: '/luma-obsidian-silk.jpg' },
                        { label: 'Helium 1.1 Orb', url: '/luma-helium-hero.jpg', preview: '/luma-helium-hero.jpg' },
                        {
                          label: 'Cosmic Aurora',
                          url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
                          preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=320&q=60',
                        },
                        {
                          label: 'Dark Glass Waves',
                          url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1920&q=80',
                          preview: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=320&q=60',
                        },
                        {
                          label: 'Midnight Peaks',
                          url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
                          preview: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=320&q=60',
                        },
                        {
                          label: 'Emerald Forest',
                          url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80',
                          preview: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=320&q=60',
                        },
                      ].map((wp) => (
                        <button
                          key={wp.label}
                          onClick={() => {
                            setLiveWallpaper('');
                            setWallpaperImageUrl(wp.url);
                          }}
                          className={`group relative overflow-hidden rounded-xl border text-left transition cursor-pointer ${
                            !liveWallpaper && wallpaperImageUrl === wp.url
                              ? 'border-[var(--luma-accent)] ring-1 ring-[var(--luma-accent)] font-bold'
                              : btnCls
                          }`}
                        >
                          <div
                            className="h-14 w-full bg-cover bg-center"
                            style={
                              wp.preview
                                ? { backgroundImage: `url("${wp.preview}")` }
                                : { background: currentTheme.bgGradient }
                            }
                          />
                          <div className="px-2 py-1.5 text-[11px] truncate">{wp.label}</div>
                        </button>
                      ))}
                    </div>

                    {/* 3 Live Animated Mesh Wallpapers */}
                    <div className="space-y-1.5">
                      <div className={`text-[11px] font-mono uppercase tracking-wider ${mutedCls}`}>
                        {t('liveWallpaperLabel', 'Живые анимированные обои')}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {(
                          [
                            ['lithium', 'Lithium Aurora (Live)', 'luma-live-wp-lithium'],
                            ['nebula', 'Cosmic Nebula (Live)', 'luma-live-wp-nebula'],
                            ['solar', 'Solar Kinetic (Live)', 'luma-live-wp-solar'],
                          ] as [LiveWallpaperId, string, string][]
                        ).map(([lwId, lwLabel, cls]) => (
                          <button
                            key={lwId}
                            onClick={() => {
                              setWallpaperImageUrl('');
                              setLiveWallpaper(lwId);
                            }}
                            className={`overflow-hidden rounded-xl border text-left cursor-pointer transition ${
                              liveWallpaper === lwId
                                ? 'border-[var(--luma-accent)] ring-1 ring-[var(--luma-accent)] font-bold'
                                : btnCls
                            }`}
                          >
                            <div className={`h-10 w-full ${cls}`} />
                            <div className="px-2 py-1 text-[11px] truncate">{lwLabel}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <input
                        value={wallpaperImageUrl}
                        onChange={(e) => {
                          setLiveWallpaper('');
                          setWallpaperImageUrl(e.target.value);
                        }}
                        placeholder="URL изображения обоев или загрузите файл..."
                        className={`flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border font-mono text-xs outline-none ${btnCls}`}
                      />
                      <label className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer inline-flex items-center gap-1.5 ${btnCls}`}>
                        <Image className="w-3.5 h-3.5" />
                        С диска
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setLiveWallpaper('');
                                setWallpaperImageUrl(reader.result);
                              }
                            };
                            reader.readAsDataURL(f);
                          }}
                        />
                      </label>
                    </div>

                    {(wallpaperImageUrl || liveWallpaper) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <label className="space-y-1">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span className={mutedCls}>Размытие обоев</span>
                            <span>{wallpaperBlur} px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={24}
                            value={wallpaperBlur}
                            onChange={(e) => setWallpaperBlur(Number(e.target.value))}
                            className="w-full accent-[var(--luma-accent)]"
                          />
                        </label>
                        <label className="space-y-1">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span className={mutedCls}>Затемнение фона</span>
                            <span>{wallpaperDim}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={80}
                            value={wallpaperDim}
                            onChange={(e) => setWallpaperDim(Number(e.target.value))}
                            className="w-full accent-[var(--luma-accent)]"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Eternal Desktop Persistence & Backup Export/Import Card */}
                  <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          {t('persistenceTitle', 'Вечное сохранение рабочего стола')}
                        </div>
                        <div className={`text-xs mt-0.5 ${mutedCls}`}>
                          {t(
                            'persistenceDesc',
                            'Виджеты, папки, ярлыки и настройки сохраняются на диск (%APPDATA%/LumaOS) и не сбрасываются при обновлении версии.'
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          onClick={() => void handleExportBackup()}
                          className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white font-semibold cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {t('exportBackup', 'Экспорт JSON')}
                        </button>
                        <label className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer inline-flex items-center gap-1.5 ${btnCls}`}>
                          <FolderOpen className="w-3.5 h-3.5" />
                          {t('importBackup', 'Импорт')}
                          <input
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImportBackup(f);
                              e.target.value = '';
                            }}
                          />
                        </label>
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
                      <div className="flex items-center justify-between gap-1">
                        <span className={mutedCls}>Масштаб экрана:</span>
                        <button
                          type="button"
                          onClick={() => setSettingsTab('graphics')}
                          className="text-[10px] font-mono text-[var(--luma-accent)] cursor-pointer hover:underline"
                        >
                          {autoDisplayScale ? `Авто (${viewportAutoPct}%)` : `${uiScale}%`} · Экран
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1 font-mono">
                        {([90, 100, 115, 130] as const).map((sc) => (
                          <button
                            key={sc}
                            onClick={() => {
                              setAutoDisplayScale(false);
                              setUiScale(sc);
                            }}
                            className={`py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                              !autoDisplayScale && uiScale === sc
                                ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                : btnCls
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
                  {/* Real GitHub OTA Update Checker & Seamless Self-Updater */}
                  <div className={`p-4 rounded-2xl border space-y-3.5 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Github className="w-4 h-4 text-[var(--luma-accent)]" />
                          Обновление Luma OS через GitHub (OTA)
                        </div>
                        <div className={`text-xs mt-0.5 ${mutedCls}`}>
                          {githubUpdateStatus} · Ежедневная автопроверка (раз в 24 ч): {githubAutoUpdate ? 'Вкл' : 'Выкл'}
                        </div>
                      </div>
                      <button
                        onClick={() => setGithubAutoUpdate((v) => !v)}
                        className="cursor-pointer"
                        title="Ежедневная автоматическая проверка обновлений раз в 24 часа"
                      >
                        <StatusPill active={githubAutoUpdate} />
                      </button>
                    </div>

                    {/* SemVer X.Y.Z Update Level Legend */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                        <div className="font-mono font-bold text-rose-400">X.0.0 · 1-я цифра</div>
                        <div className={mutedCls}>Глобальное обновление архитектуры</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                        <div className="font-mono font-bold text-violet-400">1.Y.0 · 2-я цифра</div>
                        <div className={mutedCls}>Большое обновление версии</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                        <div className="font-mono font-bold text-emerald-400">1.2.Z · 3-я цифра</div>
                        <div className={mutedCls}>Патч исправлений и улучшений</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <input
                        value={githubRepoUrl}
                        onChange={(e) => setGithubRepoUrl(e.target.value)}
                        className={`flex-1 min-w-[200px] px-3 py-2 rounded-xl border text-xs font-mono ${btnCls}`}
                      />
                      <button
                        disabled={checkingGithub || updateProgress.running}
                        onClick={() => void handleCheckGitHubUpdates(false)}
                        className="px-4 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${checkingGithub ? 'animate-spin' : ''}`} />
                        {checkingGithub ? t('checking', 'Проверка...') : t('checkUpdates', 'Проверить обновления')}
                      </button>
                      <a
                        href={updateInfo?.release_url || `${githubRepoUrl}/releases`}
                        target="_blank"
                        rel="noreferrer"
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 ${btnCls}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Релизы
                      </a>
                    </div>

                    {/* Live GitHub Release Check Result Card */}
                    {updateInfo && (
                      <div
                        className={`p-3.5 rounded-xl border space-y-2.5 text-xs ${
                          updateInfo.has_update
                            ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                            : btnCls
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="font-extrabold flex flex-wrap items-center gap-2">
                              {updateInfo.has_update ? (
                                <span className="text-[var(--luma-accent)]">
                                  Доступна новая версия: {updateInfo.release_title || `v${updateInfo.latest_version}`}
                                </span>
                              ) : updateInfo.ok ? (
                                <span className="text-emerald-500">
                                  У вас установлена последняя версия ({updateInfo.current_name})
                                </span>
                              ) : (
                                <span className="text-amber-500">{updateInfo.error || 'Не удалось связаться с GitHub'}</span>
                              )}
                              {updateInfo.update_level_label && updateInfo.has_update && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                    updateInfo.update_level === 'major'
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                      : updateInfo.update_level === 'minor'
                                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  }`}
                                >
                                  {updateInfo.update_level_label}
                                </span>
                              )}
                            </div>
                            {updateInfo.ok && (
                              <div className={`text-[11px] font-mono ${mutedCls}`}>
                                Текущая: v{updateInfo.current_version} · На GitHub: {updateInfo.latest_tag} · Проверено: {updateInfo.checked_at}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {updateInfo.has_update && (
                              <button
                                onClick={() => setUpdatePopupOpen(true)}
                                className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
                              >
                                Подробнее
                              </button>
                            )}
                            {updateInfo.ok && updateInfo.download_url && (
                              <button
                                disabled={updateProgress.running}
                                onClick={() => void handleStartGitHubUpdate(updateInfo.download_url, updateInfo.latest_version)}
                                className="px-4 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                {updateInfo.has_update
                                  ? `Обновить до ${updateInfo.latest_version} и перейти`
                                  : `Переустановить ${updateInfo.latest_version} с GitHub`}
                              </button>
                            )}
                          </div>
                        </div>

                        {Array.isArray(updateInfo.changelog_highlights) && updateInfo.changelog_highlights.length > 0 && (
                          <div className={`p-2.5 rounded-lg border space-y-1 text-[11px] ${surfaceCls}`}>
                            <div className="font-bold text-[10px] font-mono uppercase tracking-wider text-[var(--luma-accent)]">
                              Что нового в релизе:
                            </div>
                            <ul className="space-y-0.5 list-disc pl-4">
                              {updateInfo.changelog_highlights.slice(0, 6).map((hl, i) => (
                                <li key={i}>{hl}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {updateInfo.release_notes && (
                          <div className={`max-h-36 overflow-y-auto p-2.5 rounded-lg border font-mono text-[11px] whitespace-pre-wrap ${surfaceCls}`}>
                            {updateInfo.release_notes.slice(0, 1200)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Real-Time OTA Download & Transition Progress Bar */}
                    {updateProgress.stage !== 'idle' && (
                      <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${btnCls}`}>
                        <div className="flex items-center justify-between gap-2 font-mono">
                          <span className="font-bold text-[var(--luma-accent)] uppercase">{updateProgress.stage}</span>
                          <span className="font-black tabular-nums">{updateProgress.percent}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-black/25 overflow-hidden border border-white/10">
                          <div
                            className="h-full rounded-full luma-shimmer-bar transition-all duration-300"
                            style={{ width: `${Math.max(4, updateProgress.percent)}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="truncate">{updateProgress.message}</span>
                          {updateProgress.speed_mbps > 0 && (
                            <span className={mutedCls}>{updateProgress.speed_mbps.toFixed(1)} МБ/с</span>
                          )}
                        </div>
                        {updateProgress.sha256 && (
                          <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                            SHA-256: {updateProgress.sha256}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Version Rollback Card (1.2.2) — Safe downgrade to any previous release while keeping all desktop widgets & settings */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <History className="w-4 h-4 text-[var(--luma-accent)]" />
                          Откат версии Luma OS (Version Rollback)
                        </div>
                        <div className={`text-xs mt-0.5 ${mutedCls}`}>
                          Вернитесь на любую предыдущую версию в 1 клик. Локальные копии в <code>%APPDATA%/LumaOS/versions</code> восстанавливаются мгновенно, все виджеты и настройки сохраняются.
                        </div>
                      </div>
                      <button
                        onClick={() => void fetchRollbackReleases()}
                        disabled={rollbackLoading}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${btnCls}`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${rollbackLoading ? 'animate-spin' : ''}`} />
                        Обновить список
                      </button>
                    </div>

                    {rollbackReleases.length === 0 ? (
                      <div className={`p-3 rounded-xl border text-xs font-mono ${btnCls} ${mutedCls}`}>
                        {rollbackLoading ? 'Загрузка доступных версий и локальных резервных копий...' : 'Нажмите «Обновить список» для получения версий Luma OS.'}
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {rollbackReleases.map((rel) => (
                          <div
                            key={rel.version}
                            className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                              rel.is_current
                                ? 'border-[var(--luma-accent)]/60 bg-[var(--luma-accent-soft)]'
                                : btnCls
                            }`}
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono font-extrabold">{rel.title || `Luma OS ${rel.version}`}</span>
                                {rel.is_current && (
                                  <span className="px-2 py-0.5 rounded-full bg-[var(--luma-accent)] text-white text-[9px] font-mono font-bold uppercase">
                                    Текущая
                                  </span>
                                )}
                                {rel.local_backup ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[9px] font-mono font-bold">
                                    Локальная копия (мгновенно)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-400 text-[9px] font-mono font-bold">
                                    GitHub · PE32+
                                  </span>
                                )}
                              </div>
                              {rel.summary && (
                                <div className={`text-[11px] truncate ${mutedCls}`}>{rel.summary}</div>
                              )}
                            </div>

                            {!rel.is_current && (
                              <button
                                disabled={updateProgress.running}
                                onClick={() => setRollbackConfirm(rel)}
                                className="px-3 py-1.5 rounded-xl border border-amber-500/45 bg-amber-500/15 hover:bg-amber-500 hover:text-white text-amber-400 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition disabled:opacity-45 shrink-0"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Откатить на {rel.version}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Diagnostics Card */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold">Диагностика служб LumaCore 1.2</div>
                        <div className={`text-xs ${mutedCls}`}>{diagnosticsTime}</div>
                      </div>
                      <button
                        onClick={async () => {
                          await callLumaKernelRpc('system.ping');
                          await handleRefreshLocation();
                          setDiagnosticsTime(`OK · ${new Date().toLocaleTimeString(locale)}`);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${btnCls}`}
                      >
                        Запустить тест
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      {[
                        ['Ядро LumaCore 1.2', kernelConnected ? 'ONLINE · 49215' : 'FALLBACK'],
                        ['Ядро LumaShield 1.3', `AES-256-GCM #${cryptoKeyVersion} · 55+ правил + Guard`],
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

              {/* ABOUT + COMPLETE VERSION HISTORY (WITH 1.2.2 LITHIUM) */}
              {settingsTab === 'about' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
                    <div>
                      <div className="text-base font-extrabold font-mono">LUMA OS 1.2.2 (LITHIUM)</div>
                      <div className={`text-xs ${mutedCls}`}>
                        Настольная оболочка · Сетка {desktopCols}×10 ({desktopCols * 10} ячеек) · Ядро LumaCore 1.2 · LumaShield 1.3 · Plugin API v2.0
                      </div>
                    </div>
                    <a
                      href="/LumaOS_1.2.2.exe"
                      download="LumaOS_1.2.2.exe"
                      className="px-3.5 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-mono font-bold inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      LumaOS_1.2.2.exe
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
                          ver === '1.2.2 (Lithium)' ? 'border-[var(--luma-accent)]/60 bg-[var(--luma-accent)]/[0.06]' : surfaceCls
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold">
                            Версия {ver}
                          </span>
                          {ver === '1.2.2 (Lithium)' && <StatusPill active={true} />}
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

      {/* WINDOW 6: PLUGINS MANAGER & STORE (LUMA PLUGIN API v2.0) */}
      {isWinVisible('plugins') && (
        <DexWindow
          id="plugins"
          title="Расширения · Plugin API v2.0"
          subtitle={`${plugins.filter((p) => p.enabled).length} активных · ${PLUGIN_CATALOG.length} в каталоге`}
          icon={<Puzzle className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.plugins || null}
          zIndex={windows.plugins.z}
          initialWidth={920}
          initialHeight={620}
          onFocus={() => focusWindow('plugins')}
          onMinimize={() => minimizeWindow('plugins')}
          onClose={() => closeWindow('plugins')}
        >
          <div className="p-5 space-y-5">
            {/* Plugin API v2.0 Runtime Banner */}
            <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${surfaceCls}`}>
              <div className="space-y-0.5">
                <div className="text-xs font-bold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                  Шина расширений Luma Plugin API v2.0
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                    ACTIVE
                  </span>
                </div>
                <div className={`text-[11px] ${mutedCls}`}>
                  Песочница разрешений, прямой доступ к системным действиям LumaCore и мгновенный запуск модулей
                </div>
              </div>
              <div className="text-[10px] font-mono text-[var(--luma-accent)]">
                POST /api/kernel/plugins/api · SDK 2.0
              </div>
            </div>

            <div className="space-y-2">
              <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                Установленные модули ({plugins.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {plugins.map((p) => {
                  const res = pluginRunResults[p.id];
                  return (
                    <div key={p.id} className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${surfaceCls}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold truncate">{p.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-mono text-[9px] font-bold">
                              v{p.version}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded border font-mono text-[9px] ${btnCls}`}>
                              API {p.apiVersion || '2.0'}
                            </span>
                          </div>
                          <div className={`text-[11px] leading-snug ${mutedCls}`}>{p.description}</div>
                          {Array.isArray(p.permissions) && p.permissions.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {p.permissions.map((perm) => (
                                <span
                                  key={perm}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${btnCls} ${mutedCls}`}
                                >
                                  {perm}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() =>
                              setPlugins((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled: !x.enabled } : x)))
                            }
                            className="cursor-pointer"
                            title={p.enabled ? 'Выключить модуль' : 'Включить модуль'}
                          >
                            <StatusPill active={p.enabled} />
                          </button>
                          <button
                            onClick={() => setPlugins((prev) => prev.filter((x) => x.id !== p.id))}
                            className="p-1.5 rounded-lg hover:bg-[var(--luma-accent-soft)] text-zinc-500 hover:text-[var(--luma-accent)] cursor-pointer"
                            title="Удалить модуль"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                        <span className={`text-[10px] font-mono truncate ${mutedCls}`}>
                          {p.actionId || 'sys.snapshot'} · {p.author}
                        </span>
                        <button
                          disabled={!p.enabled || Boolean(res?.loading)}
                          onClick={() => void handleRunPluginV2(p)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0"
                        >
                          <Play className="w-3 h-3" />
                          {res?.loading ? 'Выполняется...' : 'Запустить'}
                        </button>
                      </div>

                      {res && !res.loading && res.summary && (
                        <div
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-between gap-2 ${
                            res.ok
                              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                              : 'border-rose-500/35 bg-rose-500/10 text-rose-300'
                          }`}
                        >
                          <span className="truncate">{res.summary}</span>
                          {typeof res.latency === 'number' && (
                            <span className="text-[10px] opacity-80 shrink-0">{res.latency} ms</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                Каталог расширений API v2.0 ({PLUGIN_CATALOG.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {PLUGIN_CATALOG.map((item) => {
                  const installed = plugins.some((p) => p.id === item.id);
                  return (
                    <div key={item.id} className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${surfaceCls}`}>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold truncate">{item.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-mono text-[9px] font-bold">
                            v{item.version}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded border font-mono text-[9px] ${btnCls}`}>
                            API {item.apiVersion || '2.0'}
                          </span>
                        </div>
                        <div className={`text-[11px] truncate ${mutedCls}`}>{item.description}</div>
                        {Array.isArray(item.permissions) && item.permissions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.permissions.map((perm) => (
                              <span key={perm} className={`text-[9px] font-mono ${mutedCls}`}>
                                [{perm}]
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        disabled={installed}
                        onClick={() => handleInstallCatalogPlugin(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 cursor-pointer ${
                          installed ? `${btnCls} opacity-50` : 'bg-[var(--luma-accent)] text-white font-bold'
                        }`}
                      >
                        {installed ? 'Установлен' : 'Установить'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
              <div className="text-xs font-bold">Создать собственный модуль (Luma SDK 2.0)</div>
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
                        version: '2.0.0',
                        apiVersion: '2.0',
                        author: 'Luma SDK 2.0',
                        category: 'Пользовательские',
                        icon: 'Puzzle',
                        description: 'Пользовательский модуль на базе шины Luma Plugin API v2.0',
                        enabled: true,
                        file: `plugins/${slug}.luma`,
                        hooks: ['OnInitialize', 'OnTick', 'OnAction'],
                        permissions: ['system.read'],
                        actionId: 'sys.snapshot',
                        showInLauncher: true,
                        customIntervalSec: 60,
                        notificationsEnabled: true,
                      },
                    ]);
                    setNewPluginSlug('');
                    setNewPluginTitle('');
                    pushToast('Luma SDK 2.0', `Модуль «${newPluginTitle.trim() || slug}» создан`, 'success');
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
      {isWinVisible('island') && (
        <DexWindow
          id="island"
          title="Luma Island"
          subtitle="Буфер обмена, медиа, заметка, таймер"
          icon={<Disc3 className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.island || null}
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
      {isWinVisible('spaces') && (
        <DexWindow
          id="spaces"
          title="Пространства"
          subtitle="Пакетный запуск"
          icon={<Rocket className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.spaces || null}
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

      {/* WINDOW: LUMA AI (AUTONOMOUS OFFLINE LUMANANO 1.2 + VOICE INPUT + CLOUD MODELS) */}
      {isWinVisible('ai') && (
        <DexWindow
          id="ai"
          title={t('ai', 'Luma AI')}
          subtitle={`${AI_PROVIDER_PRESETS.find((p) => p.id === aiConfig.provider)?.label || 'Luma AI'} · LumaNano 1.2 + Voice`}
          icon={<Sparkles className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.ai || null}
          zIndex={windows.ai.z}
          initialWidth={940}
          initialHeight={620}
          onFocus={() => focusWindow('ai')}
          onMinimize={() => minimizeWindow('ai')}
          onClose={() => closeWindow('ai')}
        >
          <LumaAIAssistantWindow
            isDark={isDark}
            surfaceCls={surfaceCls}
            btnCls={btnCls}
            mutedCls={mutedCls}
            locale={locale}
            config={aiConfig}
            aiEnabled={aiEnabled}
            onToggleAiEnabled={(next) => void handleToggleAiEnabled(next)}
            onChangeConfig={setAiConfig}
            onRunInTerminal={(cmd) => {
              handleRunTerminalCommand(cmd);
              openWindow('terminal');
            }}
            onPushToast={pushToast}
          />
        </DexWindow>
      )}

      {/* WINDOW: NATIVE SYSTEM UTILITIES & ADAPTED WINDOWS SERVICES */}
      {isWinVisible('utilities') && (
        <DexWindow
          id="utilities"
          title={t('utilities', 'Службы и утилиты системы')}
          subtitle="Устройства · Службы ОС · Сеть & Firewall · Звук · Блокнот Pro · Диски"
          icon={<Wrench className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.utilities || null}
          zIndex={windows.utilities.z}
          initialWidth={960}
          initialHeight={620}
          onFocus={() => focusWindow('utilities')}
          onMinimize={() => minimizeWindow('utilities')}
          onClose={() => closeWindow('utilities')}
        >
          <LumaSystemUtilitiesWindow
            isDark={isDark}
            lang={lang}
            surfaceCls={surfaceCls}
            btnCls={btnCls}
            mutedCls={mutedCls}
            volume={volume}
            isMuted={isMuted}
            disks={liveSystem?.disks}
            onChangeVolume={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onOpenCalculator={() => openWindow('calculator')}
            onPushToast={pushToast}
          />
        </DexWindow>
      )}

      {/* WINDOW: NATIVE LUMA CALCULATOR (STANDARD / SCIENTIFIC / PROGRAMMER / CONVERTER) */}
      {isWinVisible('calculator') && (
        <DexWindow
          id="calculator"
          title={t('calculator', 'Калькулятор Luma')}
          subtitle="Стандартный · Инженерный · Программист · Конвертер"
          icon={<Calculator className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={taskbarSizePx}
          snapCommand={snapCommands.calculator || null}
          zIndex={windows.calculator.z}
          initialWidth={460}
          initialHeight={590}
          minWidth={360}
          minHeight={440}
          onFocus={() => focusWindow('calculator')}
          onMinimize={() => minimizeWindow('calculator')}
          onClose={() => closeWindow('calculator')}
        >
          <LumaCalculatorWindow isDark={isDark} lang={lang} />
        </DexWindow>
      )}

      {/* ==================== LAYER 4: ADAPTIVE RESIZABLE OS TASKBAR (100+ APP SMART COMPRESSION) ==================== */}
      {taskbarPosition === 'left' ? (
        <aside
          onClick={(e) => e.stopPropagation()}
          onContextMenu={handleTaskbarContextMenu}
          style={{ width: `${taskbarSizePx}px` }}
          className={`fixed left-0 inset-y-0 z-50 border-r flex flex-col items-center justify-between py-2.5 gap-2 ${taskbarGlassCls}`}
        >
          {/* Live Drag-Resize Right Edge Handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setResizingTaskbar(true);
            }}
            title="Потяните, чтобы изменить ширину панели задач"
            className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-[var(--luma-accent)]/60 transition z-20"
          />
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

          {/* Center: Vertical System Windows (or Collapsed Luma System Folder) + Running Luma Apps + Drag-Reorderable Open Host OS Windows */}
          <div className="flex flex-col items-center gap-1 overflow-y-auto no-scrollbar py-1">
            {taskbarCollapseSysFolder ? (
              <button
                onClick={() => {
                  setSysFolderOpen((v) => !v);
                  setKbdPopoverOpen(false);
                  setStartMenuOpen(false);
                  setControlCenterOpen(false);
                  setTaskListOpen(false);
                  setTaskbarAppMenuId(null);
                  setTaskbarHostWinPid(null);
                }}
                title={`Папка «Luma Система» (${taskbarApps.length} приложений · открыто: ${openSystemWindowsList.length})`}
                className={`relative w-10 h-10 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center transition cursor-pointer ${
                  sysFolderOpen
                    ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white shadow'
                    : btnCls
                }`}
              >
                <div className="grid grid-cols-2 gap-[2.5px]">
                  <span className="w-1.5 h-1.5 rounded-[2px] bg-current opacity-90" />
                  <span className="w-1.5 h-1.5 rounded-[2px] bg-current opacity-65" />
                  <span className="w-1.5 h-1.5 rounded-[2px] bg-current opacity-65" />
                  <span className="w-1.5 h-1.5 rounded-[2px] bg-[var(--luma-accent)]" />
                </div>
                {openSystemWindowsList.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[var(--luma-accent)] text-white text-[9px] font-mono font-bold flex items-center justify-center">
                    {openSystemWindowsList.length}
                  </span>
                )}
              </button>
            ) : (
              taskbarApps
                .filter((item) => item.pinned || windows[item.id].open)
                .map((item) => {
                  const st = windows[item.id];
                  const isFocused = st.open && !st.minimized && st.z === topVisibleZ;
                  const isDragged = draggedTaskbarId === item.id;
                  return (
                    <button
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedTaskbarId(item.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedTaskbarId && draggedTaskbarId !== item.id) {
                          reorderTaskbarByDrag(draggedTaskbarId, item.id);
                        }
                        setDraggedTaskbarId(null);
                      }}
                      onDragEnd={() => setDraggedTaskbarId(null)}
                      onClick={() => toggleTaskbarWindow(item.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (st.open) closeWindow(item.id);
                        else handleTaskbarContextMenu(e);
                      }}
                      title={`${item.label} (перетащите для изменения порядка)`}
                      className={`relative w-10 h-10 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center transition cursor-pointer ${
                        isDragged ? 'opacity-50 ring-2 ring-[var(--luma-accent)]' : ''
                      } ${
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
                })
            )}

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
                        setSysFolderOpen(false);
                        setKbdPopoverOpen(false);
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

            {/* REAL Host OS Running Applications on Vertical Taskbar (Drag-and-Drop Reorderable!) */}
            {taskbarShowHostWindows && orderedHostWindows.length > 0 && (
              <>
                <div className={`w-6 h-px my-1 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />
                {orderedHostWindows.map((hw) => {
                  const key = getHostWinKey(hw);
                  const isDragged = draggedHostWinKey === key;
                  const activePop = taskbarHostWinPid === hw.pid;
                  const friendly = hw.friendly_name || hw.name;
                  const hoverLabel = hostWinLabelMode === 'window_title' ? hw.title || friendly : friendly;
                  return (
                    <button
                      key={`host_v_${hw.pid}`}
                      draggable
                      onDragStart={() => setDraggedHostWinKey(key)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedHostWinKey && draggedHostWinKey !== key) {
                          reorderHostWinByDrag(draggedHostWinKey, key);
                        }
                        setDraggedHostWinKey(null);
                      }}
                      onDragEnd={() => setDraggedHostWinKey(null)}
                      onClick={() => {
                        setTaskbarHostWinPid((cur) => (cur === hw.pid ? null : hw.pid));
                        setTaskbarAppMenuId(null);
                        setStartMenuOpen(false);
                        setControlCenterOpen(false);
                        setSysFolderOpen(false);
                        setKbdPopoverOpen(false);
                        setTaskListOpen(false);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleKillHostProcess(hw.pid, false);
                      }}
                      title={`${hoverLabel}${hw.title && hw.title !== hoverLabel ? ` — ${hw.title}` : ''} (PID ${hw.pid} · перетащите для порядка · ПКМ — закрыть)`}
                      className={`relative w-10 h-10 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center transition cursor-pointer ${
                        isDragged ? 'opacity-50 ring-2 ring-emerald-400' : ''
                      } ${
                        activePop
                          ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]'
                          : isDark
                          ? 'bg-white/[0.05] text-zinc-200 hover:bg-white/[0.12]'
                          : 'bg-zinc-900/[0.06] text-zinc-900 hover:bg-zinc-900/[0.12]'
                      }`}
                    >
                      <Monitor className="w-4 h-4 text-emerald-500" />
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 w-[2.5px] h-3.5 rounded-full bg-emerald-500" />
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Bottom: Tasks Switcher + Fullscreen + Clipboard + Keyboard Layout + Control Center + Vertical Clock + Show Desktop */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setTaskListOpen((v) => !v);
                setStartMenuOpen(false);
                setControlCenterOpen(false);
                setSysFolderOpen(false);
                setKbdPopoverOpen(false);
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
                setKbdPopoverOpen((v) => !v);
                setControlCenterOpen(false);
                setSysFolderOpen(false);
                setStartMenuOpen(false);
                setTaskListOpen(false);
                setTaskbarAppMenuId(null);
                setTaskbarHostWinPid(null);
              }}
              title={`Раскладка клавиатуры: ${kbdLayouts?.active?.native_name || 'Русский'} (120+ языков мира)`}
              className={`w-9 h-7 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center text-[10px] font-mono font-bold cursor-pointer ${
                kbdPopoverOpen ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]' : btnCls
              }`}
            >
              {kbdLayouts?.active?.short || 'RUS'}
            </button>

            <button
              onClick={() => {
                setControlCenterOpen((v) => !v);
                setStartMenuOpen(false);
                setSysFolderOpen(false);
                setKbdPopoverOpen(false);
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
          style={{ height: `${taskbarSizePx}px` }}
          className={`fixed z-50 flex items-center justify-between px-2.5 gap-2 transition-[background,border-color] ${
            isPixel
              ? taskbarPosition === 'top'
                ? 'top-2 inset-x-3 rounded-full border shadow-xl'
                : 'bottom-2 inset-x-3 rounded-full border shadow-xl'
              : taskbarPosition === 'top'
              ? 'top-0 inset-x-0 border-b'
              : 'bottom-0 inset-x-0 border-t'
          } ${taskbarGlassCls}`}
        >
          {/* Live Drag-Resize Top/Bottom Edge Handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setResizingTaskbar(true);
            }}
            title={`Потяните, чтобы изменить высоту панели задач (${taskbarSizePx} px)`}
            className={`absolute inset-x-0 h-1.5 cursor-ns-resize hover:bg-[var(--luma-accent)]/60 transition z-20 ${
              taskbarPosition === 'top' ? 'bottom-0' : 'top-0'
            }`}
          />

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
              title={`${t('start', 'Пуск')} (Luma OS 1.2.2)`}
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
              onClick={() => {
                setMultitaskingOpen((v) => !v);
                setStartMenuOpen(false);
                setControlCenterOpen(false);
              }}
              title={`${t('multitasking', 'Обзор окон')} (Alt+W · ${t('desktopLabel', 'Стол')} ${activeDesktop})`}
              className={`h-8 px-2 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-1 text-xs transition cursor-pointer ${
                multitaskingOpen ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white shadow' : btnCls
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px] font-bold">D{activeDesktop}</span>
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

          {/* Center: Smart-Compressing OS Tabs Strip (Handles 100+ open apps cleanly + Drag-and-Drop Reorder!) */}
          <div className="flex-1 min-w-0 flex items-center gap-1">
            {totalBarTabsCount > 9 && (
              <button
                onClick={() => taskbarStripRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
                title="Прокрутить вкладки влево"
                className={`w-6 h-7 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${btnCls}`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <div
              ref={taskbarStripRef}
              onWheel={(e) => {
                if (Math.abs(e.deltaY) > 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              className={`flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 ${
                taskbarCenterIcons ? 'justify-center' : ''
              }`}
            >
              {taskbarCollapseSysFolder ? (
                <button
                  onClick={() => {
                    setSysFolderOpen((v) => !v);
                    setKbdPopoverOpen(false);
                    setStartMenuOpen(false);
                    setControlCenterOpen(false);
                    setTaskListOpen(false);
                    setTaskbarAppMenuId(null);
                    setTaskbarHostWinPid(null);
                  }}
                  title={`Папка «Luma Система» (${taskbarApps.length} приложений · открыто: ${openSystemWindowsList.length})`}
                  className={`relative h-8 sm:h-9 px-2.5 ${
                    isPixel ? 'rounded-full' : 'rounded-xl'
                  } border flex items-center gap-2 text-xs font-semibold transition cursor-pointer shrink-0 ${
                    sysFolderOpen
                      ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white shadow'
                      : btnCls
                  }`}
                >
                  <div className="grid grid-cols-2 gap-[2px] shrink-0">
                    <span className="w-1.5 h-1.5 rounded-[2px] bg-current opacity-95" />
                    <span className="w-1.5 h-1.5 rounded-[2px] bg-current opacity-65" />
                    <span className="w-1.5 h-1.5 rounded-[2px] bg-current opacity-65" />
                    <span className="w-1.5 h-1.5 rounded-[2px] bg-[var(--luma-accent)]" />
                  </div>
                  {taskbarShowLabels && <span className="hidden md:inline">Luma Система</span>}
                  {openSystemWindowsList.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        sysFolderOpen ? 'bg-white/25 text-white' : 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]'
                      }`}
                    >
                      {openSystemWindowsList.length}
                    </span>
                  )}
                </button>
              ) : (
                visiblePinnedOrOpenWins.map((item) => {
                  const st = windows[item.id];
                  const isFocused = st.open && !st.minimized && st.z === topVisibleZ;
                  const isDragged = draggedTaskbarId === item.id;
                  const showLbl = taskbarShowLabels && barCompression !== 'icons';
                  return (
                    <button
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedTaskbarId(item.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedTaskbarId && draggedTaskbarId !== item.id) {
                          reorderTaskbarByDrag(draggedTaskbarId, item.id);
                        }
                        setDraggedTaskbarId(null);
                      }}
                      onDragEnd={() => setDraggedTaskbarId(null)}
                      onClick={() => toggleTaskbarWindow(item.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (st.open) closeWindow(item.id);
                        else handleTaskbarContextMenu(e);
                      }}
                      title={
                        st.open
                          ? `${item.label} (ПКМ — закрыть · перетащите для порядка)`
                          : `${item.label} (перетащите для изменения порядка)`
                      }
                      className={`relative h-8 sm:h-9 ${
                        showLbl
                          ? barCompression === 'compact'
                            ? 'px-2 max-w-[84px] min-w-[34px] shrink'
                            : 'px-2.5 max-w-[132px] min-w-[38px] shrink'
                          : 'w-8 sm:w-9 justify-center shrink-0'
                      } ${
                        isPixel ? 'rounded-full' : 'rounded-xl'
                      } flex items-center gap-1.5 text-xs transition cursor-pointer whitespace-nowrap overflow-hidden ${
                        isDragged ? 'opacity-50 ring-2 ring-[var(--luma-accent)]' : ''
                      } ${
                        isFocused
                          ? isPixel
                            ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                            : isDark
                            ? 'bg-white/[0.13] text-white font-semibold'
                            : 'bg-zinc-900/[0.13] text-zinc-950 font-semibold'
                          : isDark
                          ? 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
                          : 'text-zinc-700 hover:bg-zinc-900/[0.07] hover:text-zinc-950'
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {showLbl && <span className="hidden lg:inline truncate">{item.label}</span>}
                      {st.open && (
                        <span
                          className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full transition-all ${
                            st.minimized ? 'w-1 h-1 bg-zinc-400' : 'w-3 h-[2px] bg-[var(--luma-accent)]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })
              )}

              {/* Running Luma Applications Dynamically Compressed */}
              {runningApps.length > 0 && (
                <>
                  <span className={`w-px h-5 mx-0.5 shrink-0 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />
                  {runningApps.map((app) => {
                    const activePop = taskbarAppMenuId === app.id;
                    const showLbl = taskbarShowLabels && barCompression !== 'icons';
                    return (
                      <button
                        key={app.id}
                        onClick={() => {
                          setTaskbarAppMenuId((cur) => (cur === app.id ? null : app.id));
                          setTaskbarHostWinPid(null);
                          setStartMenuOpen(false);
                          setControlCenterOpen(false);
                          setSysFolderOpen(false);
                          setKbdPopoverOpen(false);
                          setTaskListOpen(false);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStopApp(app.id);
                        }}
                        title={`${app.name} · ${formatLiveClock(app.elapsedSeconds)} (ЛКМ — управление, ПКМ — закрыть)`}
                        className={`relative h-8 sm:h-9 ${
                          showLbl
                            ? barCompression === 'compact'
                              ? 'px-2 max-w-[76px] min-w-[32px] shrink'
                              : 'px-2.5 max-w-[110px] min-w-[36px] shrink'
                            : 'w-8 sm:w-9 justify-center shrink-0'
                        } ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center gap-1.5 text-xs transition cursor-pointer whitespace-nowrap overflow-hidden border ${
                          activePop
                            ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                            : isDark
                            ? 'border-white/[0.08] bg-white/[0.06] text-zinc-100 hover:bg-white/[0.12]'
                            : 'border-zinc-900/[0.1] bg-zinc-900/[0.06] text-zinc-900 hover:bg-zinc-900/[0.12]'
                        }`}
                      >
                        {renderAppIcon(app.icon, 'w-3.5 h-3.5 shrink-0')}
                        {showLbl && <span className="hidden md:inline truncate">{app.name}</span>}
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-[var(--luma-accent)]" />
                      </button>
                    );
                  })}
                </>
              )}

              {/* REAL Host OS Running Windows (Drag-and-Drop Reorderable + Readable App Names: Chrome, Steam, Telegram) */}
              {taskbarShowHostWindows && orderedHostWindows.length > 0 && (
                <>
                  <span className={`w-px h-5 mx-0.5 shrink-0 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />
                  {orderedHostWindows.map((hw) => {
                    const key = getHostWinKey(hw);
                    const isDragged = draggedHostWinKey === key;
                    const activePop = taskbarHostWinPid === hw.pid;
                    const friendlyName = hw.friendly_name || hw.name;
                    const displayLabel =
                      hostWinLabelMode === 'window_title' ? hw.title || friendlyName : friendlyName;
                    const compactMode = hostWinLabelMode === 'compact' || barCompression === 'icons';
                    const showLbl = taskbarShowLabels && !compactMode;
                    const monoInitial = (friendlyName || hw.name || 'W').slice(0, 2).toUpperCase();
                    return (
                      <button
                        key={`host_${hw.pid}`}
                        draggable
                        onDragStart={() => setDraggedHostWinKey(key)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedHostWinKey && draggedHostWinKey !== key) {
                            reorderHostWinByDrag(draggedHostWinKey, key);
                          }
                          setDraggedHostWinKey(null);
                        }}
                        onDragEnd={() => setDraggedHostWinKey(null)}
                        onClick={() => {
                          setTaskbarHostWinPid((cur) => (cur === hw.pid ? null : hw.pid));
                          setTaskbarAppMenuId(null);
                          setStartMenuOpen(false);
                          setControlCenterOpen(false);
                          setSysFolderOpen(false);
                          setKbdPopoverOpen(false);
                          setTaskListOpen(false);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleKillHostProcess(hw.pid, false);
                        }}
                        title={`${friendlyName}${hw.title && hw.title !== friendlyName ? ` — ${hw.title}` : ''} (${hw.name} · PID ${hw.pid} · ${hw.mem_mb.toFixed(0)} МБ)\nПеретащите мышкой для порядка · ЛКМ — управлять · ПКМ — закрыть`}
                        className={`relative h-8 sm:h-9 ${
                          showLbl
                            ? hostWinLabelMode === 'window_title'
                              ? 'px-2.5 max-w-[168px] min-w-[44px] shrink'
                              : barCompression === 'compact'
                              ? 'px-2 max-w-[96px] min-w-[40px] shrink'
                              : 'px-2.5 max-w-[132px] min-w-[44px] shrink'
                            : 'w-8 sm:w-9 justify-center shrink-0'
                        } ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center gap-1.5 text-xs transition cursor-pointer whitespace-nowrap overflow-hidden border ${
                          isDragged ? 'opacity-50 ring-2 ring-emerald-400' : ''
                        } ${
                          activePop
                            ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                            : isDark
                            ? 'border-white/[0.08] bg-white/[0.05] text-zinc-200 hover:bg-white/[0.11]'
                            : 'border-zinc-900/[0.1] bg-zinc-900/[0.06] text-zinc-900 hover:bg-zinc-900/[0.12]'
                        }`}
                      >
                        {compactMode ? (
                          <span className="text-[10px] font-mono font-black text-emerald-400">{monoInitial}</span>
                        ) : (
                          <Monitor className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        {showLbl && <span className="truncate font-medium">{displayLabel}</span>}
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-emerald-500" />
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {totalBarTabsCount > 9 && (
              <button
                onClick={() => taskbarStripRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
                title="Прокрутить вкладки вправо"
                className={`w-6 h-7 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${btnCls}`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Open Tasks Switcher + Telemetry + Clipboard + Fullscreen + Keyboard Layout + Control Center + Clock */}
          <div className="flex items-center gap-1.5 shrink-0 h-full">
            <button
              onClick={() => {
                setTaskListOpen((v) => !v);
                setTaskListSearch('');
                setStartMenuOpen(false);
                setControlCenterOpen(false);
                setSysFolderOpen(false);
                setKbdPopoverOpen(false);
                setTaskbarAppMenuId(null);
                setTaskbarHostWinPid(null);
              }}
              title="Открытые задачи, окна Luma и приложения ОС (поддержка 100+ приложений с поиском)"
              className={`h-8 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-1.5 text-[11px] font-mono cursor-pointer transition ${
                taskListOpen ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-bold' : btnCls
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('tasks', 'Задачи')}</span>
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

            {/* Live Keyboard Layout Switcher Pill (120+ World Languages) */}
            <button
              onClick={() => {
                setKbdPopoverOpen((v) => !v);
                setControlCenterOpen(false);
                setSysFolderOpen(false);
                setStartMenuOpen(false);
                setTaskListOpen(false);
                setTaskbarAppMenuId(null);
                setTaskbarHostWinPid(null);
              }}
              title={`Язык клавиатуры: ${kbdLayouts?.active?.native_name || 'Русский'} (${kbdLayouts?.active_tag || 'ru-RU'}) · 120+ языков мира`}
              className={`h-8 px-2 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-1 text-[11px] font-mono font-bold cursor-pointer transition ${
                kbdPopoverOpen ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]' : btnCls
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 opacity-80 hidden sm:inline" />
              <span>{kbdLayouts?.active?.short || 'RUS'}</span>
            </button>

            {/* System Tray Control Center Trigger */}
            <button
              onClick={() => {
                setControlCenterOpen((v) => !v);
                setStartMenuOpen(false);
                setSysFolderOpen(false);
                setKbdPopoverOpen(false);
                setTaskListOpen(false);
                setTaskbarAppMenuId(null);
                setTaskbarHostWinPid(null);
              }}
              title="Центр управления (Звук, Устройства ввода/вывода, Беспроводные батареи, Панель, Питание)"
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
          className={`luma-animate-in fixed z-[75] w-64 border p-1.5 shadow-2xl text-xs ${popoverShellCls}`}
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
          <button
            onClick={() => {
              setTaskbarCollapseSysFolder((v) => !v);
              setSysFolderOpen(false);
              setTaskbarCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            <span>{taskbarCollapseSysFolder ? 'Развернуть системные приложения' : 'Сжать системные в папку'}</span>
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

      {/* ==================== COLLAPSED "LUMA СИСТЕМА" TASKBAR FOLDER POPOVER (1.2.2) ==================== */}
      {sysFolderOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed z-[60] w-80 border p-3.5 space-y-3 text-xs shadow-2xl ${popoverShellCls} ${
            taskbarPosition === 'left'
              ? 'top-1/2 -translate-y-1/2 left-[68px]'
              : taskbarPosition === 'top'
              ? isPixel
                ? 'top-16 left-28'
                : 'top-14 left-28'
              : isPixel
              ? 'bottom-16 left-28'
              : 'bottom-14 left-28'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center">
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold">Luma Система</div>
                <div className={`text-[10px] font-mono ${mutedCls}`}>
                  {taskbarApps.length} приложений · открыто: {openSystemWindowsList.length}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setTaskbarCollapseSysFolder(false);
                setSysFolderOpen(false);
              }}
              title="Развернуть системные иконки обратно на панель задач"
              className={`px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${btnCls}`}
            >
              Развернуть
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {taskbarApps.map((item) => {
              const st = windows[item.id];
              const isFocused = st.open && !st.minimized && st.z === topVisibleZ;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    toggleTaskbarWindow(item.id);
                    setSysFolderOpen(false);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (st.open) closeWindow(item.id);
                  }}
                  title={st.open ? `${item.label} (ПКМ — закрыть)` : item.label}
                  className={`relative p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-center transition cursor-pointer ${
                    isFocused
                      ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-bold'
                      : btnCls
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="text-[10px] leading-tight truncate w-full">{item.label}</span>
                  {st.open && (
                    <span
                      className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
                        st.minimized ? 'bg-zinc-400' : 'bg-[var(--luma-accent)]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== KEYBOARD LAYOUT & 120+ WORLD LANGUAGES POPOVER (1.2.2) ==================== */}
      {kbdPopoverOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed z-[60] w-80 border p-3.5 space-y-3 text-xs shadow-2xl ${popoverShellCls} ${
            taskbarPosition === 'left'
              ? 'bottom-16 left-[68px]'
              : taskbarPosition === 'top'
              ? isPixel
                ? 'top-16 right-28'
                : 'top-14 right-28'
              : isPixel
              ? 'bottom-16 right-28'
              : 'bottom-14 right-28'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-[var(--luma-accent)]" />
              <div>
                <div className="font-bold">Язык клавиатуры</div>
                <div className={`text-[10px] font-mono ${mutedCls}`}>
                  Активен: {kbdLayouts?.active?.short || 'RUS'} · {WORLD_KEYBOARD_LANGUAGES.length}+ языков мира
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setKbdPopoverOpen(false);
                openWindow('settings', 'language');
              }}
              className={`px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${btnCls}`}
            >
              Все настройки
            </button>
          </div>

          {/* Installed OS layouts for instant 1-click switching */}
          <div className="space-y-1">
            {(kbdLayouts?.installed || []).map((lay) => (
              <div
                key={lay.tag}
                className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 transition ${
                  lay.active ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : btnCls
                }`}
              >
                <button
                  onClick={() => {
                    void handleSwitchKeyboardLayout(lay.tag, lay.hkl);
                    setKbdPopoverOpen(false);
                  }}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
                >
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${
                      lay.active ? 'bg-[var(--luma-accent)] text-white' : 'bg-black/20'
                    }`}
                  >
                    {lay.short}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{lay.native_name || lay.name}</div>
                    <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{lay.tag}</div>
                  </div>
                </button>
                {(kbdLayouts?.installed?.length || 0) > 1 && (
                  <button
                    onClick={() => void handleManageKeyboardLayout('remove', lay.tag)}
                    title="Удалить раскладку"
                    className="p-1 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Quick Search & Add ANY of 120+ World Languages */}
          <div className="space-y-1.5 pt-1 border-t border-white/10">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${btnCls}`}>
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                value={worldLangQuery}
                onChange={(e) => setWorldLangQuery(e.target.value)}
                placeholder="Добавить любой язык мира..."
                className="w-full bg-transparent outline-none text-xs placeholder:text-zinc-500"
              />
              {worldLangQuery && (
                <button onClick={() => setWorldLangQuery('')} className="cursor-pointer opacity-70">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {worldLangQuery.trim().length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 pr-0.5">
                {WORLD_KEYBOARD_LANGUAGES.filter((wl) => {
                  const q = worldLangQuery.trim().toLowerCase();
                  return (
                    wl.nameRu.toLowerCase().includes(q) ||
                    wl.nativeName.toLowerCase().includes(q) ||
                    wl.englishName.toLowerCase().includes(q) ||
                    wl.tag.toLowerCase().includes(q) ||
                    wl.short.toLowerCase().includes(q)
                  );
                })
                  .slice(0, 12)
                  .map((wl) => (
                    <button
                      key={wl.tag}
                      onClick={async () => {
                        await handleManageKeyboardLayout('add', wl.tag);
                        await handleSwitchKeyboardLayout(wl.tag, wl.klid);
                        setWorldLangQuery('');
                        setKbdPopoverOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-left cursor-pointer hover:border-[var(--luma-accent)] ${btnCls}`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{wl.nameRu}</div>
                        <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                          {wl.nativeName} · {wl.tag}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-mono text-[10px] font-bold shrink-0">
                        + {wl.short}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
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

      {/* ==================== OS OPEN TASKS SWITCHER POPOVER (100+ APPS SEARCHABLE PICKER) ==================== */}
      {taskListOpen && (() => {
        const tq = taskListSearch.trim().toLowerCase();
        const fSys = openSystemWindowsList.filter((w) => !tq || w.label.toLowerCase().includes(tq) || w.id.includes(tq));
        const fHost = (taskbarShowHostWindows ? hostWindows : []).filter(
          (hw) => !tq || (hw.title || '').toLowerCase().includes(tq) || hw.name.toLowerCase().includes(tq) || String(hw.pid).includes(tq)
        );
        const fRun = runningApps.filter((a) => !tq || a.name.toLowerCase().includes(tq) || a.category.toLowerCase().includes(tq));
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in fixed z-50 w-96 max-w-[calc(100vw-24px)] border p-4 space-y-3 text-xs ${popoverShellCls} ${
              taskbarPosition === 'left'
                ? 'bottom-16 left-[72px]'
                : taskbarPosition === 'top'
                ? isPixel
                  ? 'top-16 right-3'
                  : 'top-14 right-3'
                : isPixel
                ? 'bottom-16 right-3'
                : 'bottom-14 right-3'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                {t('allWindows', 'Все окна')} ({totalActiveTasksCount})
              </div>
              <button onClick={() => setTaskListOpen(false)} className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}>
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Instant Filter Input so picking any of 100+ open apps takes < 1 second */}
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${btnCls}`}>
              <Search className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
              <input
                value={taskListSearch}
                onChange={(e) => setTaskListSearch(e.target.value)}
                placeholder="Фильтр среди всех открытых окон и приложений..."
                autoFocus
                className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-500"
              />
              {taskListSearch && (
                <button onClick={() => setTaskListSearch('')} className="opacity-60 hover:opacity-100 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {totalActiveTasksCount === 0 ? (
              <div className={`py-6 text-center font-mono ${mutedCls}`}>
                Нет открытых окон или запущенных приложений
              </div>
            ) : fSys.length + fHost.length + fRun.length === 0 ? (
              <div className={`py-6 text-center font-mono ${mutedCls}`}>
                Ничего не найдено по запросу «{taskListSearch}»
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-0.5">
                {fSys.length > 0 && (
                  <div className="space-y-1.5">
                    <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                      Окна Luma ({fSys.length})
                    </div>
                    {fSys.map((w) => {
                      const st = windows[w.id];
                      return (
                        <div key={w.id} className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}>
                          <button
                            onClick={() => {
                              openWindow(w.id);
                              setTaskListOpen(false);
                            }}
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

                {fHost.length > 0 && (
                  <div className="space-y-1.5">
                    <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                      Открытые окна ОС ({fHost.length})
                    </div>
                    {fHost.map((hw) => (
                      <div key={`tl_host_${hw.pid}`} className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}>
                        <button
                          onClick={() => {
                            handleFocusHostWindow(hw.pid);
                            setTaskListOpen(false);
                          }}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <Monitor className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{hw.title || hw.name}</div>
                            <div className={`text-[10px] font-mono ${mutedCls}`}>
                              {hw.name} · PID {hw.pid} · {hw.mem_mb.toFixed(0)} МБ
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

                {fRun.length > 0 && (
                  <div className="space-y-1.5">
                    <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                      Приложения Luma ({fRun.length})
                    </div>
                    {fRun.map((app) => (
                      <div key={app.id} className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}>
                        <button
                          onClick={() => {
                            handleFocusOrRelaunchApp(app);
                            setTaskListOpen(false);
                          }}
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
                <Cpu className="w-3 h-3" /> {t('openTaskManager', 'Диспетчер задач')}
              </button>
              <button
                onClick={showDesktop}
                className={`flex-1 py-1.5 rounded-lg border font-semibold cursor-pointer ${btnCls}`}
              >
                {t('showDesktop', 'Свернуть окна')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ==================== REAL START MENU («ПУСК») WITH DIRECT PC POWER CONTROLS ==================== */}
      {startMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed z-50 w-[465px] max-w-[calc(100vw-24px)] border p-4 space-y-3.5 ${popoverShellCls} ${
            taskbarPosition === 'left'
              ? 'top-3 left-[72px]'
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
                placeholder={t('searchPlaceholder', 'Поиск приложений, модулей и команд...')}
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
              {t('all', 'Все')}
            </button>
          </div>

          {/* System Modules Grid */}
          {!startSearch.trim() && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
                <span className={mutedCls}>Luma OS 1.2.2 (Lithium)</span>
                <span className="text-[var(--luma-accent)] font-bold">LumaCore 1.2</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
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
                {startSearch.trim() ? t('searchResults', 'Результаты поиска') : t('pinnedApps', 'Закреплённые приложения')}
              </span>
              <span className={`text-[10px] font-mono ${mutedCls}`}>
                {runningAppsCount + hostWindows.length} {t('active', 'активн.')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
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

          {/* Quick 1.1.0 Helium Shortcuts inside Start Menu */}
          <div className="grid grid-cols-4 gap-1.5 text-[11px]">
            <button
              onClick={() => openWindow('settings', 'security')}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer ${btnCls}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">{t('security', 'Защита')}</span>
            </button>
            <button
              onClick={() => openWindow('settings', 'language')}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer ${btnCls}`}
            >
              <Languages className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
              <span className="font-mono uppercase">{lang}</span>
            </button>
            <button
              onClick={() => openWindow('settings', 'shell_mode')}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer ${btnCls}`}
            >
              <Monitor className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
              <span className="truncate">Shell</span>
            </button>
            <button
              onClick={() => openWindow('settings', 'updater')}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer ${btnCls}`}
            >
              <Github className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
              <span className="truncate">OTA</span>
            </button>
          </div>

          {/* Start Footer with FULL PC Power Controls (Shutdown, Restart, Sleep, Lock, Exit Luma) */}
          <div className={`pt-3 border-t space-y-2.5 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[var(--luma-accent)] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  Li
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{customDeviceName || liveSystem?.hostname || 'Luma Desktop'}</div>
                  <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                    {liveSystem?.location?.city || 'Luma OS 1.2.2 (Lithium)'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  handleToggleFullscreen();
                  setStartMenuOpen(false);
                }}
                title={`${t('fullscreen', 'Во весь экран')} (F11)`}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                <span>F11</span>
              </button>
            </div>

            {/* Direct Device Power Action Row in Start Menu */}
            <div className="grid grid-cols-5 gap-1.5 text-[10px] font-semibold">
              <button
                onClick={() => {
                  setStartMenuOpen(false);
                  setPowerConfirm({
                    action: 'shutdown',
                    title: t('powerShutdown', 'Выключить ПК'),
                    desc: 'Устройство полностью завершит работу. Панель Windows будет корректно восстановлена перед выключением.',
                  });
                }}
                title={t('powerShutdown', 'Выключить ПК')}
                className="py-2 px-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white flex flex-col items-center gap-1 cursor-pointer transition"
              >
                <Power className="w-3.5 h-3.5" />
                <span className="truncate max-w-full">{t('powerShutdown', 'Выключить')}</span>
              </button>
              <button
                onClick={() => {
                  setStartMenuOpen(false);
                  setPowerConfirm({
                    action: 'restart',
                    title: t('powerRestart', 'Перезагрузка'),
                    desc: 'Компьютер перезагрузится сейчас.',
                  });
                }}
                title={t('powerRestart', 'Перезагрузка')}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${btnCls}`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                <span className="truncate max-w-full">{t('powerRestart', 'Рестарт')}</span>
              </button>
              <button
                onClick={() => {
                  setStartMenuOpen(false);
                  void handleExecutePowerAction('sleep');
                }}
                title={t('powerSleep', 'Сон')}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${btnCls}`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="truncate max-w-full">{t('powerSleep', 'Сон')}</span>
              </button>
              <button
                onClick={() => {
                  setStartMenuOpen(false);
                  void handleExecutePowerAction('lock');
                }}
                title={t('powerLock', 'Блокировка')}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${btnCls}`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="truncate max-w-full">{t('powerLock', 'Блок')}</span>
              </button>
              <button
                onClick={() => {
                  setStartMenuOpen(false);
                  setPowerConfirm({
                    action: 'exit_luma',
                    title: t('powerExitLuma', 'Закрыть Luma OS'),
                    desc: 'Закрыть оболочку Luma OS и вернуть стандартную панель задач Windows.',
                  });
                }}
                title={t('powerExitLuma', 'Закрыть Luma')}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${btnCls}`}
              >
                <LogOut className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                <span className="truncate max-w-full">Выход</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADAPTIVE DEX CONTROL CENTER POPOVER ==================== */}
      {controlCenterOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed z-50 w-80 max-h-[84vh] overflow-y-auto border p-4 space-y-3.5 ${popoverShellCls} ${
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
            <span className="text-xs font-mono font-bold uppercase tracking-wider">LUMA OS 1.2.2 (LITHIUM)</span>
            <span className={`text-[10px] font-mono ${mutedCls}`}>
              {liveSystem?.location?.city || 'LOCAL'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: isDark ? 'Тёмная' : 'Светлая', active: isDark, icon: isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />, run: () => { const nxt = isDark ? 'nothing_paper' : 'nothing_mono'; setThemeKey(nxt); triggerIslandPulse('Тема', nxt === 'nothing_paper' ? 'Светлая' : 'Тёмная', 'theme'); } },
              { label: designStyle === 'nothing' ? 'Nothing' : 'Pixelbook', active: designStyle === 'pixelbook', icon: <Sliders className="w-3.5 h-3.5" />, run: () => setDesignStyle(designStyle === 'nothing' ? 'pixelbook' : 'nothing') },
              { label: 'Luma Island', active: dynamicIslandEnabled, icon: <Disc3 className="w-3.5 h-3.5" />, run: handleToggleDynamicIsland },
              { label: 'Экономия', active: powerProfile === 'saver', icon: <Leaf className="w-3.5 h-3.5" />, run: () => handleChangePowerProfile(powerProfile === 'saver' ? 'balanced' : 'saver') },
              { label: 'Не беспокоить', active: dndEnabled, icon: <BellOff className="w-3.5 h-3.5" />, run: () => setDndEnabled((v) => { triggerIslandPulse(!v ? 'Не беспокоить: ВКЛ' : 'Не беспокоить: ВЫКЛ', undefined, 'dnd'); return !v; }) },
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

          {/* Volume + Real Audio Output & Input Device Switcher (1.2.2) */}
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

            {/* Audio Output / Input Device Selectors directly inside Control Center */}
            {(() => {
              const outputs = audioDevices?.outputs || [];
              const inputs = audioDevices?.inputs || [];
              const activeOut = outputs.find((d) => d.is_default) || outputs[0];
              const activeIn = inputs.find((d) => d.is_default) || inputs[0];
              return (
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <button
                    onClick={() => setAudioPickerSection((s) => (s === 'output' ? 'none' : 'output'))}
                    className={`w-full px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                      audioPickerSection === 'output' ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : btnCls
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Headphones className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
                      <div className="min-w-0">
                        <div className={`text-[9px] font-mono uppercase ${mutedCls}`}>Вывод звука</div>
                        <div className="font-semibold truncate">{activeOut?.name || 'Системный вывод'}</div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                        audioPickerSection === 'output' ? 'rotate-180 text-[var(--luma-accent)]' : 'opacity-60'
                      }`}
                    />
                  </button>

                  {audioPickerSection === 'output' && (
                    <div className={`p-1.5 rounded-xl border space-y-1 max-h-36 overflow-y-auto ${surfaceCls}`}>
                      {outputs.length === 0 ? (
                        <div className={`px-2 py-1.5 text-[10px] font-mono ${mutedCls}`}>Нет доступных устройств вывода</div>
                      ) : (
                        outputs.map((dev) => (
                          <button
                            key={dev.id}
                            onClick={() => void handleSelectAudioDevice(dev)}
                            className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-left cursor-pointer transition ${
                              dev.is_default
                                ? 'bg-[var(--luma-accent)] text-white font-semibold'
                                : isDark
                                ? 'hover:bg-white/10'
                                : 'hover:bg-zinc-900/10'
                            }`}
                          >
                            <span className="truncate">{dev.name}</span>
                            {dev.is_default && <Check className="w-3 h-3 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setAudioPickerSection((s) => (s === 'input' ? 'none' : 'input'))}
                    className={`w-full px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                      audioPickerSection === 'input' ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : btnCls
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className={`text-[9px] font-mono uppercase ${mutedCls}`}>Микрофон / Ввод</div>
                        <div className="font-semibold truncate">{activeIn?.name || 'Системный микрофон'}</div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                        audioPickerSection === 'input' ? 'rotate-180 text-[var(--luma-accent)]' : 'opacity-60'
                      }`}
                    />
                  </button>

                  {audioPickerSection === 'input' && (
                    <div className={`p-1.5 rounded-xl border space-y-1 max-h-36 overflow-y-auto ${surfaceCls}`}>
                      {inputs.length === 0 ? (
                        <div className={`px-2 py-1.5 text-[10px] font-mono ${mutedCls}`}>Нет доступных микрофонов</div>
                      ) : (
                        inputs.map((dev) => (
                          <button
                            key={dev.id}
                            onClick={() => void handleSelectAudioDevice(dev)}
                            className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-left cursor-pointer transition ${
                              dev.is_default
                                ? 'bg-[var(--luma-accent)] text-white font-semibold'
                                : isDark
                                ? 'hover:bg-white/10'
                                : 'hover:bg-zinc-900/10'
                            }`}
                          >
                            <span className="truncate">{dev.name}</span>
                            {dev.is_default && <Check className="w-3 h-3 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Wireless Peripheral Batteries (Mice, Keyboards, Headphones, Gamepads) */}
          {wirelessBatteries.length > 0 && (
            <div className={`pt-2.5 border-t space-y-1.5 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                <span className={`flex items-center gap-1 ${mutedCls}`}>
                  <Bluetooth className="w-3 h-3 text-sky-400" />
                  Заряд устройств ({wirelessBatteries.length})
                </span>
                <button
                  onClick={() => {
                    setControlCenterOpen(false);
                    openWindow('settings', 'bluetooth');
                  }}
                  className="text-[var(--luma-accent)] hover:underline cursor-pointer"
                >
                  Bluetooth
                </button>
              </div>
              <div className="space-y-1">
                {wirelessBatteries.slice(0, 4).map((wb, i) => {
                  const pct = Math.max(0, Math.min(100, wb.battery_percent));
                  const low = pct <= 20;
                  return (
                    <div
                      key={`${wb.name}_${i}`}
                      className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-2 text-[11px] ${btnCls}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {wb.device_type === 'headphones' ? (
                          <Headphones className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        ) : wb.device_type === 'keyboard' ? (
                          <Keyboard className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        ) : wb.device_type === 'gamepad' ? (
                          <Gamepad2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <MousePointerClick className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate font-medium">{wb.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-10 h-1.5 rounded-full bg-black/25 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${low ? 'bg-rose-500' : pct <= 45 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`font-mono font-bold text-[10px] tabular-nums ${low ? 'text-rose-400' : ''}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              href="/LumaOS_1.2.2.exe"
              download="LumaOS_1.2.2.exe"
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

      {/* ==================== MULTITASKING OVERVIEW / TASK VIEW & VIRTUAL DESKTOPS (ALT+W) ==================== */}
      {multitaskingOpen && (
        <div
          onClick={() => setMultitaskingOpen(false)}
          className="luma-animate-in fixed inset-0 z-[105] bg-black/75 backdrop-blur-2xl flex flex-col p-6 gap-5 overflow-hidden text-white"
        >
          {/* Top Bar: Title + Layout Actions */}
          <div onClick={(e) => e.stopPropagation()} className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--luma-accent)] text-white flex items-center justify-center shadow-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight">
                  {t('multitasking', 'Обзор окон и Мультизадачность')} · {t('desktopLabel', 'Стол')} {activeDesktop}
                </div>
                <div className="text-xs font-mono text-zinc-400">
                  Luma OS 1.2.2 (Lithium) · Alt+W — Обзор · 8-сторонний ресайз и Snap Layouts
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={splitTopTwoWindows}
                className="px-3.5 py-2 rounded-xl bg-[var(--luma-accent)] hover:brightness-110 text-white font-bold cursor-pointer inline-flex items-center gap-1.5 shadow"
              >
                <LayoutPanelLeft className="w-3.5 h-3.5" />
                {t('splitScreen', 'Разделить 50/50')}
              </button>
              <button
                onClick={tileOpenWindows}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {t('tileWindows', 'Сетка 2×2')}
              </button>
              <button
                onClick={() => {
                  showDesktop();
                  setMultitaskingOpen(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 font-semibold cursor-pointer"
              >
                {t('closeAllWindows', 'Свернуть все')}
              </button>
              <button
                onClick={() => setMultitaskingOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/40 border border-white/15 cursor-pointer"
                title={t('close', 'Закрыть')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Open Luma Windows Grid on Active Desktop */}
          <div onClick={(e) => e.stopPropagation()} className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
            {(() => {
              const deskWins = taskbarApps.filter(
                (item) => windows[item.id].open && (windows[item.id].desktop ?? 1) === activeDesktop
              );
              if (deskWins.length === 0) {
                return (
                  <div className="h-56 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] flex flex-col items-center justify-center gap-3 text-center p-6">
                    <Layers className="w-8 h-8 text-zinc-500" />
                    <div className="text-sm font-bold text-zinc-300">
                      {t('noOpenWindows', 'На этом рабочем столе нет открытых окон')}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 text-xs">
                      {(['explorer', 'ai', 'calculator', 'terminal', 'utilities', 'settings'] as DexWinId[]).map((wid) => {
                        const meta = taskbarApps.find((x) => x.id === wid);
                        if (!meta) return null;
                        return (
                          <button
                            key={wid}
                            onClick={() => openWindow(wid)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[var(--luma-accent)] border border-white/15 inline-flex items-center gap-1.5 cursor-pointer transition"
                          >
                            {meta.icon}
                            <span>{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deskWins.map((item) => {
                    const st = windows[item.id];
                    return (
                      <div
                        key={item.id}
                        className="group rounded-2xl border border-white/15 bg-white/[0.06] hover:border-[var(--luma-accent)] p-4 flex flex-col justify-between gap-3 transition shadow-xl"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => openWindow(item.id)}
                            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                          >
                            <span className="w-8 h-8 rounded-xl bg-[var(--luma-accent)]/20 text-[var(--luma-accent)] flex items-center justify-center shrink-0">
                              {item.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate">{item.label}</div>
                              <div className="text-[10px] font-mono text-zinc-400">
                                {st.minimized ? 'Свёрнуто' : 'Активно'} · Стол {st.desktop ?? 1}
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => closeWindow(item.id)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500 text-zinc-300 hover:text-white cursor-pointer"
                            title="Закрыть окно"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Snap Controls */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                          <button
                            onClick={() => {
                              sendSnapCommand(item.id, 'left');
                              setMultitaskingOpen(false);
                            }}
                            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-[var(--luma-accent)] cursor-pointer"
                          >
                            ◀ 50%
                          </button>
                          <button
                            onClick={() => {
                              sendSnapCommand(item.id, 'right');
                              setMultitaskingOpen(false);
                            }}
                            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-[var(--luma-accent)] cursor-pointer"
                          >
                            50% ▶
                          </button>
                          <button
                            onClick={() => {
                              sendSnapCommand(item.id, 'maximize');
                              setMultitaskingOpen(false);
                            }}
                            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-[var(--luma-accent)] cursor-pointer"
                          >
                            MAX
                          </button>
                          <span className="flex-1" />
                          {virtualDesktops
                            .filter((d) => d !== activeDesktop)
                            .map((d) => (
                              <button
                                key={d}
                                onClick={() => moveWindowToDesktop(item.id, d)}
                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/20 border border-white/10 cursor-pointer"
                                title={`${t('moveToDesktop', 'Переместить на стол')} ${d}`}
                              >
                                → D{d}
                              </button>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Real Host PC Windows */}
            {hostWindows.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
                  {t('hostWindows', 'Открытые окна системы (ПК)')} ({hostWindows.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {hostWindows.map((hw) => (
                    <button
                      key={hw.pid}
                      onClick={() => {
                        void handleFocusHostWindow(hw.pid);
                        setMultitaskingOpen(false);
                      }}
                      className="p-3 rounded-xl border border-white/10 bg-white/[0.04] hover:border-[var(--luma-accent)] text-left transition cursor-pointer"
                    >
                      <div className="text-xs font-bold truncate">{hw.title || hw.name}</div>
                      <div className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                        {hw.name} · PID {hw.pid} · {hw.mem_mb.toFixed(0)} МБ
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Virtual Desktops Strip */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-2.5"
          >
            {virtualDesktops.map((desk) => {
              const count = (Object.keys(windows) as DexWinId[]).filter(
                (id) => windows[id].open && (windows[id].desktop ?? 1) === desk
              ).length;
              return (
                <button
                  key={desk}
                  onClick={() => setActiveDesktop(desk)}
                  className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition ${
                    activeDesktop === desk
                      ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white shadow-lg'
                      : 'bg-white/[0.06] border-white/15 hover:bg-white/15 text-zinc-200'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>
                    {t('desktopLabel', 'Стол')} {desk}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-black/25 font-mono text-[10px]">{count}</span>
                </button>
              );
            })}
            {virtualDesktops.length < 6 && (
              <button
                onClick={() => {
                  const next = Math.max(...virtualDesktops) + 1;
                  setVirtualDesktops((prev) => [...prev, next]);
                  setActiveDesktop(next);
                }}
                className="px-3.5 py-2.5 rounded-2xl border border-dashed border-white/25 hover:border-white/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-zinc-300"
              >
                <Plus className="w-4 h-4" />
                {t('newDesktop', 'Новый стол')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ==================== LITHIUM 1.2 AWAKENING ANIMATION & PLAYABLE EASTER-EGG MINI-GAME ==================== */}
      <LumaHeliumEasterEggModal open={easterEggOpen} onClose={() => setEasterEggOpen(false)} />

      {/* ==================== PC POWER CONFIRMATION MODAL (SHUTDOWN / RESTART / EXIT LUMA) ==================== */}
      {powerConfirm && (
        <div
          onClick={() => setPowerConfirm(null)}
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-sm border p-5 shadow-2xl space-y-4 ${popoverShellCls}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold">{powerConfirm.title}</div>
                <div className={`text-[11px] ${mutedCls}`}>{t('powerConfirmTitle', 'Подтвердите действие питания')}</div>
              </div>
            </div>
            <div className={`text-xs leading-relaxed ${mutedCls}`}>{powerConfirm.desc}</div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPowerConfirm(null)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
              >
                {t('cancel', 'Отмена')}
              </button>
              <button
                onClick={() => {
                  const act = powerConfirm.action;
                  setPowerConfirm(null);
                  void handleExecutePowerAction(act);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                {t('confirm', 'Подтвердить')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DAILY AUTOMATIC UPDATE NOTIFICATION POPUP (SemVer X.Y.Z) ==================== */}
      {updatePopupOpen && updateInfo?.has_update && (
        <div
          onClick={() => setUpdatePopupOpen(false)}
          className="fixed inset-0 z-[115] bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-lg border p-6 shadow-2xl space-y-4 ${popoverShellCls}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[var(--luma-accent-soft)] border border-[var(--luma-accent)]/40 text-[var(--luma-accent)] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-extrabold">Доступно обновление Luma OS</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        updateInfo.update_level === 'major'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : updateInfo.update_level === 'minor'
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {updateInfo.update_level_label || 'Обновление'}
                    </span>
                  </div>
                  <div className={`text-xs font-mono mt-0.5 ${mutedCls}`}>
                    v{updateInfo.current_version} → v{updateInfo.latest_version} ({updateInfo.release_title || updateInfo.latest_tag})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setUpdatePopupOpen(false)}
                className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {Array.isArray(updateInfo.changelog_highlights) && updateInfo.changelog_highlights.length > 0 ? (
              <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${surfaceCls}`}>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--luma-accent)] font-bold">
                  Основные изменения версии:
                </div>
                <ul className="space-y-1 list-disc pl-4 leading-relaxed">
                  {updateInfo.changelog_highlights.slice(0, 6).map((hl, idx) => (
                    <li key={idx}>{hl}</li>
                  ))}
                </ul>
              </div>
            ) : (
              updateInfo.release_notes && (
                <div className={`p-3.5 rounded-xl border text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap ${surfaceCls}`}>
                  {updateInfo.release_notes.slice(0, 600)}
                </div>
              )
            )}

            <div className={`text-[11px] flex items-center gap-2 ${mutedCls}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Все ваши виджеты, ярлыки, папки и настройки автоматически сохранятся на диске.</span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setUpdatePopupOpen(false)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
              >
                Напомнить позже
              </button>
              {updateInfo.download_url && (
                <button
                  onClick={() => {
                    setUpdatePopupOpen(false);
                    void handleStartGitHubUpdate(updateInfo.download_url, updateInfo.latest_version);
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  Обновить до v{updateInfo.latest_version}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== VERSION ROLLBACK CONFIRMATION MODAL (1.2.2) ==================== */}
      {rollbackConfirm && (
        <div
          onClick={() => setRollbackConfirm(null)}
          className="fixed inset-0 z-[125] flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-md border p-5 space-y-4 shadow-2xl ${popoverShellCls}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold">Откатить на Luma OS {rollbackConfirm.version}?</div>
                  <div className={`text-[11px] font-mono ${mutedCls}`}>
                    {rollbackConfirm.local_backup
                      ? 'Источник: локальная резервная копия (мгновенный откат)'
                      : 'Источник: проверенный PE32+ бинарник с GitHub'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setRollbackConfirm(null)}
                className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rollbackConfirm.summary && (
              <div className={`p-3 rounded-xl border text-xs leading-relaxed ${surfaceCls}`}>
                {rollbackConfirm.summary}
              </div>
            )}

            <div className={`p-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-[11px] flex items-start gap-2`}>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Текущая сборка <b>1.2.2</b> будет автоматически сохранена в <code>%APPDATA%/LumaOS/versions</code>, а все ваши виджеты, папки, обои и настройки останутся на месте.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setRollbackConfirm(null)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
              >
                Отмена
              </button>
              <button
                onClick={() => void handleConfirmRollback(rollbackConfirm)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Выполнить откат на v{rollbackConfirm.version}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CINEMATIC ANIMATED OTA UPDATE & ROLLBACK OVERLAY ==================== */}
      {(updateProgress.running || updateProgress.stage === 'restarting') && (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-xl flex items-center justify-center p-6 text-white">
          <div className="w-full max-w-md flex flex-col items-center text-center space-y-6">
            {/* Dual Orbital Spinning Rings */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--luma-accent)] border-r-[var(--luma-accent)]/50 luma-orbit-spin"
                style={{ animationDuration: '2.2s' }}
              />
              <div
                className="absolute inset-3 rounded-full border-2 border-transparent border-b-cyan-400 border-l-violet-400/60 luma-orbit-spin"
                style={{ animationDuration: '3.4s', animationDirection: 'reverse' }}
              />
              <div className="w-20 h-20 rounded-full bg-white/[0.06] border border-white/15 flex flex-col items-center justify-center shadow-2xl">
                <span className="text-xl font-mono font-black tabular-nums">{updateProgress.percent}%</span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">LITHIUM</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-lg font-extrabold tracking-tight">
                Установка Luma OS {updateProgress.target_version || '1.2.2'}
              </div>
              <div className="text-xs font-mono text-zinc-300">
                {updateProgress.message || 'Подготовка обновления...'}
              </div>
              {updateProgress.speed_mbps > 0 && (
                <div className="text-[11px] font-mono text-cyan-300">
                  Скорость загрузки: {updateProgress.speed_mbps.toFixed(1)} МБ/с
                </div>
              )}
            </div>

            {/* Shimmer Progress Bar */}
            <div className="w-full space-y-2">
              <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden border border-white/15">
                <div
                  className="h-full rounded-full luma-shimmer-bar transition-all duration-300"
                  style={{ width: `${Math.max(6, updateProgress.percent)}%` }}
                />
              </div>

              {/* 4-Stage Pipeline Indicator */}
              <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono pt-1">
                {(
                  [
                    { key: 'connect', label: 'Связь', done: updateProgress.percent >= 10 },
                    { key: 'download', label: 'Загрузка', done: updateProgress.percent >= 75 || updateProgress.stage === 'verifying' || updateProgress.stage === 'restarting' },
                    { key: 'verify', label: 'SHA-256', done: updateProgress.stage === 'restarting' || updateProgress.stage === 'done' },
                    { key: 'restart', label: 'Запуск', done: updateProgress.stage === 'restarting' || updateProgress.stage === 'done' },
                  ]
                ).map((st) => (
                  <div
                    key={st.key}
                    className={`py-1 px-1.5 rounded-lg border text-center transition ${
                      st.done
                        ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'border-white/10 bg-white/[0.04] text-zinc-400'
                    }`}
                  >
                    {st.done ? '✓ ' : ''}
                    {st.label}
                  </div>
                ))}
              </div>
            </div>

            {updateProgress.sha256 && (
              <div className="text-[10px] font-mono text-zinc-500 break-all max-w-full">
                SHA-256: {updateProgress.sha256}
              </div>
            )}
          </div>
        </div>
      )}

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
