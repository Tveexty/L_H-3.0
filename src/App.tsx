/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Calendar,
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
  Crown,
  Disc3,
  Download,
  ExternalLink,
  Eye,
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
  MousePointer2,
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
  Radio,
  RefreshCw,
  Rocket,
  RotateCcw,
  ScanSearch,
  Search,
  Settings,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sliders,
  Smartphone,
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
  WifiOff,
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
  LiveMediaSessionItem,
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
import { DesignStyle, DexWindow, SnapZone, TaskbarPosition, WindowControlsStyle } from './components/DexWindow';
import {
  AI_PROVIDER_PRESETS,
  DEFAULT_LUMA_AI_CONFIG,
  LumaAIAssistantWindow,
  LumaAIConfig,
} from './components/LumaAIAssistantWindow';
import { LumaBatteryPanel } from './components/LumaBatteryPanel';
import { LumaCalculatorWindow } from './components/LumaCalculatorWindow';
import { LumaCalendarWindow } from './components/LumaCalendarWindow';
import {
  BluetoothDeviceItem,
  BluetoothStatusSnapshot,
  LumaBluetoothPickerPanel,
  LumaWifiPickerPanel,
  WifiStatusSnapshot,
} from './components/LumaConnectivityPicker';
import {
  CarbonNotificationItem,
  LumaCarbonControlHub,
  SystemFeaturesMap,
} from './components/LumaCarbonControlHub';
import { LumaNotificationShade, ShadeNotificationItem } from './components/LumaNotificationShade';
import { LumaClockRenderer } from './components/LumaClockRenderer';
import { LumaCodeStudioWindow } from './components/LumaCodeStudioWindow';
import { CustomUserWidgetSpec, LumaCustomWidgetBuilder } from './components/LumaCustomWidgetBuilder';
import { LumaCutStudioWindow } from './components/LumaCutStudioWindow';
import { LumaDeveloperSdkStudio } from './components/LumaDeveloperSdkStudio';
import {
  DesktopGridCols,
  DesktopShortcut,
  FolderEntry,
  LiveWallpaperId,
  LumaDesktopCanvas,
  WallpaperStyle,
  WallpaperTransitionMode,
  WidgetBgMode,
} from './components/LumaDesktopCanvas';
import { LumaExplorerWindow } from './components/LumaExplorerWindow';
import { LumaLensSearchOverlay } from './components/LumaLensSearchOverlay';
import {
  DEFAULT_ACCESSIBILITY_CONFIG,
  DEFAULT_GESTURE_CONFIG,
  DEFAULT_RMB_MENU_CONFIG,
  LumaAccessibilityConfig,
  LumaAccessibilityGesturesPanel,
  LumaGestureAction,
  LumaGestureConfig,
  LumaRmbMenuConfig,
} from './components/LumaAccessibilityGesturesPanel';
import { LumaHeliumEasterEggModal } from './components/LumaHeliumEasterEgg';
import { LumaMouseDpiPanel } from './components/LumaMouseDpiPanel';
import { LumaPrivateVaultOverlay } from './components/LumaPrivateVaultOverlay';
import { DEFAULT_SCENARIOS, LumaScenarioRule, LumaScenariosWindow } from './components/LumaScenariosWindow';
import { LumaSecurityPanel } from './components/LumaSecurityPanel';
import {
  BluetoothSettingsPanel,
  KernelUIPanel,
  PowerProfile,
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
import { LumaTrackerWindow } from './components/LumaTrackerWindow';
import { LumaTrashWindow } from './components/LumaTrashWindow';
import { LumaUpdateCinemaOverlay } from './components/LumaUpdateCinemaOverlay';
import { LumaOfficeSuiteWindow } from './components/LumaOfficeSuiteWindow';
import { AltTabEntry, LumaAltTabSwitcher } from './components/LumaAltTabSwitcher';
import { LumaDevHudOverlay } from './components/LumaDevHudOverlay';
import { LumaNovaPanel } from './components/LumaNovaPanel';
import { LumaVirtualMemoryPanel } from './components/LumaVirtualMemoryPanel';
import { LumaQuickLookModal, QuickLookCandidate } from './components/LumaQuickLookModal';
import { LumaGamepadStudioWindow } from './components/LumaGamepadStudioWindow';
import { LumaUninstallerWindow } from './components/LumaUninstallerWindow';
import {
  DockFolderStackConfig,
  DockIconProgressBar,
  DockMessengerBadge,
  DockProgressTask,
  LumaSmartDockStacks,
  matchDockTaskForApp,
  matchMessengerBadgeForApp,
  SmartDockStatus,
} from './components/LumaSmartDock';
import { SmartContextMenu } from './components/SmartContextMenu';
import { LumaWindowRulesPanel } from './components/LumaWindowRulesPanel';
import { LumaDropShelf } from './components/LumaDropShelf';
import { LumaSmartClipboardModal } from './components/LumaSmartClipboardModal';
import { LumaOxygenOSD } from './components/LumaOxygenOSD';
import { LumaOxygenConnectWindow } from './components/LumaOxygenConnectWindow';
import { LumaHarmonyTransferWave } from './components/LumaHarmonyTransferWave';
import { LumaPhotoEditorWindow } from './components/LumaPhotoEditorWindow';
import { LumaSuperDeviceWindow } from './components/LumaSuperDeviceWindow';
import {
  DEFAULT_MODULAR_PANEL_CONFIG,
  LumaModularPanelBar,
  ModularPanelConfig,
} from './components/LumaModularPanelBar';
import { getLangLocale, LUMA_LANGUAGES, LumaLangCode, tr } from './i18n/translations';
import { useLumaAutoTranslate } from './i18n/LumaAutoTranslator';

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
  Calendar,
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
  | 'calendar'
  | 'tracker'
  | 'kernel'
  | 'settings'
  | 'plugins'
  | 'island'
  | 'spaces'
  | 'trash'
  | 'scenarios'
  | 'code_studio'
  | 'cut_studio'
  | 'office'
  | 'gamepad'
  | 'uninstaller'
  | 'oxygen_connect'
  | 'photo_editor'
  | 'superdevice';
type AnimationPreset = 'harmony7' | 'standard' | 'spring' | 'glide' | 'silk' | 'elastic' | 'none';
type TaskbarSizePreset = 'compact' | 'standard' | 'large';
type FontPreset = 'sans' | 'mono' | 'rounded';
type SettingsTabId =
  | 'kernel_ui'
  | 'window_rules'
  | 'mouse_dpi'
  | 'security'
  | 'ai_settings'
  | 'power_battery'
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
  alwaysOnTop?: boolean;
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
  source?: string;
  imageData?: string;
  ocrText?: string;
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
  replace_hotkeys: boolean;
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

const LumaTaskbarClock = React.memo(function LumaTaskbarClock({
  orientation,
  timeFormat,
  showSeconds,
  showDate,
  clockAccentColor,
  clockBlinkColon,
  locale,
  mutedCls,
}: {
  orientation: 'vertical' | 'horizontal';
  timeFormat: '12' | '24';
  showSeconds: boolean;
  showDate: boolean;
  clockAccentColor: string;
  clockBlinkColon: boolean;
  locale: string;
  mutedCls: string;
}) {
  const [tickNow, setTickNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const stepMs = showSeconds || clockBlinkColon ? 1000 : 15000;
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setTickNow(new Date());
    }, stepMs);
    const onVis = () => {
      if (!document.hidden) setTickNow(new Date());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [showSeconds, clockBlinkColon]);

  const hrs24 = tickNow.getHours();
  const hrs = timeFormat === '12' ? String(hrs24 % 12 || 12).padStart(2, '0') : String(hrs24).padStart(2, '0');
  const mins = String(tickNow.getMinutes()).padStart(2, '0');
  const secs = String(tickNow.getSeconds()).padStart(2, '0');
  const colon = clockBlinkColon && tickNow.getSeconds() % 2 === 1 ? ' ' : ':';
  const dateShort = tickNow.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' });

  if (orientation === 'vertical') {
    return (
      <>
        <span className="text-[11px] font-bold tabular-nums">{hrs}</span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: clockAccentColor }}>
          {mins}
        </span>
      </>
    );
  }

  return (
    <>
      <span className="text-xs font-bold tabular-nums">
        {hrs}
        <span style={{ color: clockAccentColor }}>{colon}</span>
        {mins}
        {showSeconds ? `:${secs}` : ''}
      </span>
      {showDate && <span className={`text-[9px] uppercase ${mutedCls}`}>{dateShort}</span>}
    </>
  );
});


const INITIAL_WINDOWS: Record<DexWinId, DexWinState> = {
  explorer: { open: false, minimized: false, z: 20, desktop: 1 },
  taskmgr: { open: false, minimized: false, z: 20, desktop: 1 },
  apps: { open: false, minimized: false, z: 20, desktop: 1 },
  terminal: { open: false, minimized: false, z: 20, desktop: 1 },
  ai: { open: false, minimized: false, z: 20, desktop: 1 },
  utilities: { open: false, minimized: false, z: 20, desktop: 1 },
  calculator: { open: false, minimized: false, z: 20, desktop: 1 },
  calendar: { open: false, minimized: false, z: 20, desktop: 1 },
  tracker: { open: false, minimized: false, z: 20, desktop: 1 },
  kernel: { open: false, minimized: false, z: 20, desktop: 1 },
  settings: { open: false, minimized: false, z: 20, desktop: 1 },
  plugins: { open: false, minimized: false, z: 20, desktop: 1 },
  island: { open: false, minimized: false, z: 20, desktop: 1 },
  spaces: { open: false, minimized: false, z: 20, desktop: 1 },
  trash: { open: false, minimized: false, z: 20, desktop: 1 },
  scenarios: { open: false, minimized: false, z: 20, desktop: 1 },
  code_studio: { open: false, minimized: false, z: 20, desktop: 1 },
  cut_studio: { open: false, minimized: false, z: 20, desktop: 1 },
  office: { open: false, minimized: false, z: 20, desktop: 1 },
  gamepad: { open: false, minimized: false, z: 20, desktop: 1 },
  uninstaller: { open: false, minimized: false, z: 20, desktop: 1 },
  oxygen_connect: { open: false, minimized: false, z: 20, desktop: 1 },
  photo_editor: { open: false, minimized: false, z: 20, desktop: 1 },
  superdevice: { open: false, minimized: false, z: 20, desktop: 1 },
};

type TaskbarElementId =
  | 'luma_folder'
  | 'start'
  | 'search'
  | 'circle_search'
  | 'windows_strip'
  | 'control_hub'
  | 'tasks'
  | 'telemetry'
  | 'clipboard'
  | 'fullscreen'
  | 'keyboard'
  | 'notifications'
  | 'superdevice'
  | 'tray_cc'
  | 'clock';

interface DesktopTaskbarTool {
  id: TaskbarElementId;
  x: number;
  y: number;
}

const DEFAULT_TASKBAR_ELEMENTS: TaskbarElementId[] = [
  'luma_folder',
  'start',
  'search',
  'circle_search',
  'windows_strip',
  'control_hub',
  'tasks',
  'telemetry',
  'clipboard',
  'fullscreen',
  'keyboard',
  'notifications',
  'superdevice',
  'tray_cc',
  'clock',
];

const TASKBAR_ELEMENT_META: Record<
  TaskbarElementId,
  { label: string; shortLabel: string; canTearOff: boolean; desc: string }
> = {
  luma_folder: { label: 'Папка Luma', shortLabel: 'Luma', canTearOff: true, desc: 'Системные приложения в одной папке' },
  start: { label: 'Пуск', shortLabel: 'Пуск', canTearOff: true, desc: 'Главное меню приложений и поиска' },
  search: { label: 'Поиск (Alt+R)', shortLabel: 'Поиск', canTearOff: true, desc: 'Мгновенный поиск программ и файлов' },
  circle_search: { label: 'Circle to Search', shortLabel: 'Circle', canTearOff: true, desc: 'Обвести область экрана и распознать' },
  windows_strip: { label: 'Открытые окна и приложения', shortLabel: 'Окна', canTearOff: false, desc: 'Полоса запущенных и закреплённых программ' },
  control_hub: { label: 'Панель управления (TAB)', shortLabel: 'Панель', canTearOff: true, desc: 'Стиль ОС: звук, яркость, Wi-Fi, плеер' },
  tasks: { label: 'Задачи', shortLabel: 'Задачи', canTearOff: true, desc: 'Список всех открытых окон и задач' },
  telemetry: { label: 'CPU / RAM', shortLabel: 'CPU/RAM', canTearOff: true, desc: 'Живая загрузка процессора и памяти' },
  clipboard: { label: 'Буфер обмена', shortLabel: 'Буфер', canTearOff: true, desc: 'История скопированного текста и картинок' },
  fullscreen: { label: 'Полный экран (F11)', shortLabel: 'F11', canTearOff: true, desc: 'Развернуть или свернуть на весь экран' },
  keyboard: { label: 'Раскладка клавиатуры', shortLabel: 'Язык', canTearOff: true, desc: 'Текущий язык ввода (RUS / ENG)' },
  notifications: { label: 'Уведомления', shortLabel: 'Уведомл.', canTearOff: true, desc: 'Шторка уведомлений и режим «Не беспокоить»' },
  superdevice: { label: 'Суперустройство', shortLabel: 'Экосистема', canTearOff: true, desc: 'Подключение телефона, аудио и устройств' },
  tray_cc: { label: 'Звук, Сеть и Заряд', shortLabel: 'Трей', canTearOff: true, desc: 'Быстрый центр управления, громкость и батарея' },
  clock: { label: 'Часы и Календарь', shortLabel: 'Часы', canTearOff: true, desc: 'Текущее время, дата и календарь' },
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
  const [glassIntensity, setGlassIntensity] = useState<GlassIntensity>(savedState?.glassIntensity || 'light');
  const [glassOpacity, setGlassOpacity] = useState<number>(savedState?.glassOpacity ?? 88);
  const [animationPreset, setAnimationPreset] = useState<AnimationPreset>(
    savedState?.animationPreset === 'harmony7' ||
      savedState?.animationPreset === 'spring' ||
      savedState?.animationPreset === 'glide' ||
      savedState?.animationPreset === 'silk' ||
      savedState?.animationPreset === 'elastic' ||
      savedState?.animationPreset === 'none'
      ? savedState.animationPreset
      : savedState?.smoothAnimations === false
      ? 'none'
      : 'harmony7'
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
    savedState?.taskbarPosition === 'left' || savedState?.taskbarPosition === 'right' || savedState?.taskbarPosition === 'top'
      ? savedState.taskbarPosition
      : 'bottom'
  );
  const [taskbarAutoHide, setTaskbarAutoHide] = useState<boolean>(savedState?.taskbarAutoHide ?? false);
  const [taskbarHoverOpen, setTaskbarHoverOpen] = useState<boolean>(false);
  const taskbarHideTimerRef = useRef<number | null>(null);
  const lastSpotlightToggleRef = useRef<number>(0);

  const openTaskbarHover = () => {
    if (taskbarHideTimerRef.current) {
      window.clearTimeout(taskbarHideTimerRef.current);
      taskbarHideTimerRef.current = null;
    }
    setTaskbarHoverOpen(true);
  };

  const scheduleTaskbarHoverClose = () => {
    if (!taskbarAutoHide) return;
    if (taskbarHideTimerRef.current) window.clearTimeout(taskbarHideTimerRef.current);
    taskbarHideTimerRef.current = window.setTimeout(() => {
      setTaskbarHoverOpen(false);
      taskbarHideTimerRef.current = null;
    }, 380);
  };
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
  const [showLumaSysFolder, setShowLumaSysFolder] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('luma_show_sys_folder_v1');
      if (v !== null) return v === 'true';
    } catch { /* ignore */ }
    return true;
  });
  const [lumaFolderSlot, setLumaFolderSlot] = useState<'far_left' | 'before_apps' | 'after_apps' | 'right'>(() => {
    try {
      const v = localStorage.getItem('luma_folder_slot_v1');
      if (v === 'far_left' || v === 'before_apps' || v === 'after_apps' || v === 'right') return v;
    } catch { /* ignore */ }
    return 'far_left';
  });
  const [draggingLumaFolder, setDraggingLumaFolder] = useState<boolean>(false);
  const [showSmartDockShelf, setShowSmartDockShelf] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('luma_show_smart_dock_v1');
      if (v !== null) return v === 'true';
    } catch { /* ignore */ }
    return true;
  });
  const [smartDockSide, setSmartDockSide] = useState<'left' | 'right'>(() => {
    try {
      const v = localStorage.getItem('luma_smart_dock_side_v1');
      if (v === 'left' || v === 'right') return v;
    } catch { /* ignore */ }
    return 'right';
  });
  const [autoHideNoiseEnabled, setAutoHideNoiseEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('luma_auto_hide_noise_v1');
      if (v !== null) return v === 'true';
    } catch { /* ignore */ }
    return true;
  });
  const [magneticDockEnabled, setMagneticDockEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('luma_magnetic_dock_v1');
      if (v !== null) return v === 'true';
    } catch { /* ignore */ }
    return true;
  });
  const [springAnimationsEnabled, setSpringAnimationsEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('luma_spring_animations_v1');
      if (v !== null) return v === 'true';
    } catch { /* ignore */ }
    return true;
  });
  const [visualNoiseHidden, setVisualNoiseHidden] = useState<boolean>(false);
  const [mediaVideoPlaying, setMediaVideoPlaying] = useState<boolean>(false);
  const [bouncingDockIds, setBouncingDockIds] = useState<Record<string, boolean>>({});
  const [renderDockTask, setRenderDockTask] = useState<DockProgressTask | null>(null);
  const magneticRafRef = useRef<number | null>(null);

  // Apply system-wide Spring Physics setting to document root so CSS, DexWindow, Menus & Dock react immediately
  useEffect(() => {
    document.documentElement.dataset.springPhysics = springAnimationsEnabled ? 'on' : 'off';
  }, [springAnimationsEnabled]);

  // Clear any lingering inline magnetic transforms immediately when Magnetic Dock is toggled off
  useEffect(() => {
    if (!magneticDockEnabled) {
      if (magneticRafRef.current !== null) {
        cancelAnimationFrame(magneticRafRef.current);
        magneticRafRef.current = null;
      }
      document.querySelectorAll<HTMLElement>('[data-dock-item="1"]').forEach((el) => {
        el.style.transform = '';
        el.style.zIndex = '';
      });
    }
  }, [magneticDockEnabled]);

  const triggerDockBounce = useCallback(
    (dockKey: string) => {
      if (!dockKey || !springAnimationsEnabled) return;
      setBouncingDockIds((prev) => ({ ...prev, [dockKey]: true }));
      window.setTimeout(() => {
        setBouncingDockIds((prev) => {
          if (!prev[dockKey]) return prev;
          const next = { ...prev };
          delete next[dockKey];
          return next;
        });
      }, 680);
    },
    [springAnimationsEnabled]
  );

  // Zero-lag GPU magnetic Dock magnification & cursor attraction (Gaussian spring curve)
  const handleDockMagneticMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!magneticDockEnabled) return;
      const container = e.currentTarget;
      const clientX = e.clientX;
      if (magneticRafRef.current !== null) cancelAnimationFrame(magneticRafRef.current);
      magneticRafRef.current = requestAnimationFrame(() => {
        const items = container.querySelectorAll<HTMLElement>('[data-dock-item="1"]');
        const radius = 148;
        items.forEach((el) => {
          // Do not overwrite transform while elastic launch bounce keyframe is playing
          if (el.classList.contains('luma-dock-bounce')) return;
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const dx = clientX - cx;
          const absDx = Math.abs(dx);
          if (absDx < radius) {
            const norm = absDx / radius;
            const wave = Math.cos((norm * Math.PI) / 2);
            const strength = wave * wave; // smooth bell curve
            const scale = 1 + 0.22 * strength;
            const liftY = -4.5 * strength;
            const pullX = Math.max(-3.5, Math.min(3.5, (dx / radius) * 8.5 * strength));
            el.style.transform = `translate3d(${pullX.toFixed(2)}px, ${liftY.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
            el.style.zIndex = String(Math.round(10 + strength * 20));
          } else {
            el.style.transform = '';
            el.style.zIndex = '';
          }
        });
      });
    },
    [magneticDockEnabled]
  );

  const handleDockMagneticLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (magneticRafRef.current !== null) {
      cancelAnimationFrame(magneticRafRef.current);
      magneticRafRef.current = null;
    }
    const items = e.currentTarget.querySelectorAll<HTMLElement>('[data-dock-item="1"]');
    items.forEach((el) => {
      el.style.transform = '';
      el.style.zIndex = '';
    });
  }, []);

  // Listen to Cut Studio live video render progress & video playback events
  useEffect(() => {
    const onRenderProgress = (ev: Event) => {
      const detail = (ev as CustomEvent<{ active?: boolean; percent?: number; title?: string }>).detail;
      if (!detail || !detail.active) {
        setRenderDockTask(null);
        return;
      }
      setRenderDockTask({
        id: 'luma_cut_studio_render',
        app_key: 'cut_studio',
        app_name: 'Luma Cut Studio',
        title: detail.title || 'Рендер видео',
        source: 'luma',
        state: 'rendering',
        percent: Math.max(2, Math.min(100, Math.round(detail.percent || 0))),
        bytes_done: 0,
        bytes_total: 0,
        speed_mb_s: 0,
        updated_at: Date.now(),
      });
    };
    const onMediaPlaying = (ev: Event) => {
      const detail = (ev as CustomEvent<{ playing?: boolean }>).detail;
      setMediaVideoPlaying(Boolean(detail?.playing));
    };
    const syncDomVideos = () => {
      const videos = Array.from(document.querySelectorAll('video'));
      const anyActive = videos.some((v) => !v.paused && !v.ended && v.readyState >= 2);
      if (anyActive) setMediaVideoPlaying(true);
    };
    const onDomPlay = (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === 'VIDEO') setMediaVideoPlaying(true);
    };
    const onDomPauseOrEnd = (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === 'VIDEO') {
        const videos = Array.from(document.querySelectorAll('video'));
        setMediaVideoPlaying(videos.some((v) => !v.paused && !v.ended && v.readyState >= 2));
      }
    };
    window.addEventListener('luma-render-progress', onRenderProgress);
    window.addEventListener('luma-media-playing', onMediaPlaying);
    document.addEventListener('play', onDomPlay, true);
    document.addEventListener('pause', onDomPauseOrEnd, true);
    document.addEventListener('ended', onDomPauseOrEnd, true);
    syncDomVideos();
    return () => {
      window.removeEventListener('luma-render-progress', onRenderProgress);
      window.removeEventListener('luma-media-playing', onMediaPlaying);
      document.removeEventListener('play', onDomPlay, true);
      document.removeEventListener('pause', onDomPauseOrEnd, true);
      document.removeEventListener('ended', onDomPauseOrEnd, true);
    };
  }, []);

  const [lensSearchOpen, setLensSearchOpen] = useState<boolean>(false);
  const [lensInitialImage, setLensInitialImage] = useState<string | null>(null);
  const [lensInitialSourceKind, setLensInitialSourceKind] = useState<'screen' | 'photo' | 'phone'>('screen');
  const [lensPreferCached, setLensPreferCached] = useState<boolean>(false);
  const openUnifiedCircleSearch = useCallback((opts?: { imageSrc?: string | null; preCaptured?: boolean }) => {
    if (opts?.imageSrc) {
      setLensInitialImage(opts.imageSrc);
      setLensInitialSourceKind('photo');
      setLensPreferCached(false);
      setLensSearchOpen(true);
      return;
    }
    if (opts?.preCaptured) {
      setLensInitialImage(null);
      setLensInitialSourceKind('screen');
      setLensPreferCached(true);
      setLensSearchOpen(true);
      return;
    }
    // Capture the real live desktop BEFORE mounting the overlay so GDI BitBlt never screenshots a dark overlay!
    fetch(`/api/kernel/capture/screen-now?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d?.image_base64) {
          setLensInitialImage(d.image_base64);
          setLensInitialSourceKind('screen');
          setLensPreferCached(false);
        } else {
          setLensInitialImage(null);
          setLensInitialSourceKind('screen');
          setLensPreferCached(false);
        }
        setLensSearchOpen(true);
      })
      .catch(() => {
        setLensInitialImage(null);
        setLensInitialSourceKind('screen');
        setLensPreferCached(false);
        setLensSearchOpen(true);
      });
  }, []);
  useEffect(() => {
    const onOpenEvent = (e: Event) => {
      const det = (e as CustomEvent<{ imageSrc?: string; preCaptured?: boolean }>).detail;
      openUnifiedCircleSearch({ imageSrc: det?.imageSrc || null, preCaptured: Boolean(det?.preCaptured) });
    };
    const onKeyHot = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.code === 'Space') || (e.altKey && e.shiftKey && e.code === 'KeyS')) {
        e.preventDefault();
        openUnifiedCircleSearch({ preCaptured: false });
      }
    };
    window.addEventListener('luma-circle-search-open', onOpenEvent);
    window.addEventListener('keydown', onKeyHot);
    return () => {
      window.removeEventListener('luma-circle-search-open', onOpenEvent);
      window.removeEventListener('keydown', onKeyHot);
    };
  }, [openUnifiedCircleSearch]);
  const [gestureConfig, setGestureConfig] = useState<LumaGestureConfig>(() => {
    try {
      const raw = localStorage.getItem('luma_gesture_config_v1');
      if (raw) return { ...DEFAULT_GESTURE_CONFIG, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_GESTURE_CONFIG;
  });
  const [rmbConfig, setRmbConfig] = useState<LumaRmbMenuConfig>(() => {
    try {
      const raw = localStorage.getItem('luma_rmb_config_v1');
      if (raw) return { ...DEFAULT_RMB_MENU_CONFIG, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_RMB_MENU_CONFIG;
  });
  const [accessibilityConfig, setAccessibilityConfig] = useState<LumaAccessibilityConfig>(() => {
    try {
      const raw = localStorage.getItem('luma_accessibility_config_v1');
      if (raw) return { ...DEFAULT_ACCESSIBILITY_CONFIG, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_ACCESSIBILITY_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem('luma_show_sys_folder_v1', String(showLumaSysFolder));
      localStorage.setItem('luma_folder_slot_v1', lumaFolderSlot);
      localStorage.setItem('luma_show_smart_dock_v1', String(showSmartDockShelf));
      localStorage.setItem('luma_smart_dock_side_v1', smartDockSide);
      localStorage.setItem('luma_auto_hide_noise_v1', String(autoHideNoiseEnabled));
      localStorage.setItem('luma_magnetic_dock_v1', String(magneticDockEnabled));
      localStorage.setItem('luma_spring_animations_v1', String(springAnimationsEnabled));
      localStorage.setItem('luma_gesture_config_v1', JSON.stringify(gestureConfig));
      localStorage.setItem('luma_rmb_config_v1', JSON.stringify(rmbConfig));
      localStorage.setItem('luma_accessibility_config_v1', JSON.stringify(accessibilityConfig));
    } catch { /* ignore */ }
  }, [showLumaSysFolder, lumaFolderSlot, showSmartDockShelf, smartDockSide, autoHideNoiseEnabled, magneticDockEnabled, springAnimationsEnabled, gestureConfig, rmbConfig, accessibilityConfig]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('luma-high-contrast', accessibilityConfig.highContrast);
    root.classList.toggle('luma-reduced-motion', accessibilityConfig.reducedMotion);
    root.classList.toggle('luma-large-focus', accessibilityConfig.largeFocusRing);
  }, [accessibilityConfig]);

  // --- Audio Input/Output Devices, Wireless Peripheral Batteries & World Keyboard Layouts (1.3 Beryllium) ---
  const [audioDevices, setAudioDevices] = useState<AudioDevicesInfo | null>(null);
  const [audioPickerSection, setAudioPickerSection] = useState<'none' | 'output' | 'input'>('none');
  const [wirelessBatteries, setWirelessBatteries] = useState<WirelessBatteryInfo[]>([]);
  const [kbdLayouts, setKbdLayouts] = useState<KeyboardLayoutsInfo | null>(null);
  const [liveKbdShort, setLiveKbdShort] = useState<string>('');
  const [liveKbdTag, setLiveKbdTag] = useState<string>('');

  // --- 1.3 Taskbar Tray Visibility Toggles, Right-Click Menu & Pinned Wireless Devices ---
  const [taskbarShowClipboardBtn, setTaskbarShowClipboardBtn] = useState<boolean>(
    savedState?.taskbarShowClipboardBtn ?? true
  );
  const [taskbarShowFullscreenBtn, setTaskbarShowFullscreenBtn] = useState<boolean>(
    savedState?.taskbarShowFullscreenBtn ?? true
  );
  const [pinnedWirelessNames, setPinnedWirelessNames] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('luma_pinned_wireless_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
    return Array.isArray(savedState?.pinnedWirelessNames) ? savedState.pinnedWirelessNames : [];
  });
  const [trayItemCtxMenu, setTrayItemCtxMenu] = useState<{
    x: number;
    y: number;
    item: 'telemetry' | 'clipboard' | 'fullscreen' | 'wireless';
    label: string;
    wirelessName?: string;
  } | null>(null);

  // --- 1.3 Session Tracker 2.0 Host Windows Usage & Limits State ---
  const [hostUsageSeconds, setHostUsageSeconds] = useState<
    Record<string, { name: string; seconds: number; category: string; iconUrl?: string }>
  >(() => {
    try {
      const raw = localStorage.getItem('luma_tracker_host_usage_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        const todayKey = new Date().toISOString().slice(0, 10);
        if (parsed?.date === todayKey && parsed?.items) return parsed.items;
      }
    } catch {
      /* ignore */
    }
    return {};
  });
  const [hostLimitsMinutes, setHostLimitsMinutes] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('luma_tracker_host_limits_v2');
      if (raw) return JSON.parse(raw) || {};
    } catch {
      /* ignore */
    }
    return {};
  });
  const [dailyHistoryMinutes, setDailyHistoryMinutes] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('luma_tracker_history_7d_v2');
      if (raw) return JSON.parse(raw) || {};
    } catch {
      /* ignore */
    }
    return {};
  });
  const [strictFocusLock, setStrictFocusLock] = useState<boolean>(savedState?.strictFocusLock ?? false);
  const warnedLimitsRef = useRef<Set<string>>(new Set());
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
  const [islandRubberPhase, setIslandRubberPhase] = useState<'idle' | 'expand' | 'snap'>('idle');
  const islandPulseTimerRef = useRef<number | null>(null);
  const islandRubberSnapRef = useRef<number | null>(null);
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

  // --- Multi-Language i18n (100% Complete Auto-Translation for ALL Widgets & UI) ---
  const [lang, setLang] = useState<LumaLangCode>(() => {
    const saved = savedState?.lang as LumaLangCode | undefined;
    return saved && LUMA_LANGUAGES.some((l) => l.code === saved) ? saved : 'ru';
  });
  useLumaAutoTranslate(lang);
  const locale = getLangLocale(lang);
  const t = (key: string, fallback?: string) => tr(lang, key, fallback);

  // --- Native Custom Alt+Tab Window Switcher (MRU + Live Previews) & Win+D Home State (1.5.4) ---
  const [altTabOpen, setAltTabOpen] = useState(false);
  const [altTabIdx, setAltTabIdx] = useState(0);
  const [altTabFromExternal, setAltTabFromExternal] = useState(false);
  const [notifShadeOpen, setNotifShadeOpen] = useState(false);
  const [windowMruMap, setWindowMruMap] = useState<Record<string, number>>(() => ({
    luma_home_desktop: Date.now() - 5000,
  }));
  const [hostWindowPreviews, setHostWindowPreviews] = useState<Record<number, string>>({});
  const touchWindowMru = useCallback((key: string) => {
    const now = Date.now();
    setWindowMruMap((prev) => ({ ...prev, [key]: now }));
  }, []);
  const [incomingBanner, setIncomingBanner] = useState<ShadeNotificationItem | null>(null);
  const incomingBannerTimerRef = useRef<number | null>(null);
  const osNotifBootedRef = useRef<boolean>(false);
  const winDSavedOpenRef = useRef<DexWinId[]>([]);

  // --- Extra Wallpaper Engine Customization (Transitions + Live Animated Wallpapers) ---
  const [wallpaperImageUrl, setWallpaperImageUrl] = useState<string>(() => {
    const savedWp = savedState?.wallpaperImageUrl;
    if (savedWp === undefined) return '/luma-oxygen-hero.jpg';
    try {
      if (!localStorage.getItem('luma_oxygen_17_wp_applied') && savedWp === '/luma-nitrogen-hero.jpg') {
        localStorage.setItem('luma_oxygen_17_wp_applied', '1');
        return '/luma-oxygen-hero.jpg';
      }
    } catch {
      // ignore
    }
    return savedWp;
  });
  const [wallpaperBlur, setWallpaperBlur] = useState<number>(savedState?.wallpaperBlur ?? 0);
  const [wallpaperDim, setWallpaperDim] = useState<number>(savedState?.wallpaperDim ?? 24);
  const [wallpaperTransition, setWallpaperTransition] = useState<WallpaperTransitionMode>(
    savedState?.wallpaperTransition || 'iris'
  );
  const [liveWallpaper, setLiveWallpaper] = useState<LiveWallpaperId>(savedState?.liveWallpaper || '');

  // --- Luma OS 1.7.2 Oxygen: Smart Clipboard Modal + KWin Runtime Game/DND Overrides ---
  const [smartClipboardOpen, setSmartClipboardOpen] = useState<boolean>(false);
  const [kwinAutoDnd, setKwinAutoDnd] = useState<boolean>(false);
  const [kwinNoCompositor, setKwinNoCompositor] = useState<boolean>(false);

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

  // Luma OS 1.7.2B: Automatically sync AI Vision keys & active provider to Go kernel so BOTH PC and Phone Circle to Search share the exact same AI brain!
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const preset = AI_PROVIDER_PRESETS.find((p) => p.id === aiConfig.provider) || AI_PROVIDER_PRESETS[0];
      const isLocal = aiConfig.provider === 'luma_local' || aiConfig.provider === 'ollama';
      const activeKey = (aiConfig.apiKeys?.[aiConfig.provider] || '').trim();
      const rawModel = (aiConfig.models?.[aiConfig.provider] || preset.defaultModel || 'qwen2.5:3b').trim();
      const cleanModel = aiConfig.provider === 'gemini' ? rawModel.replace(/^(?:models\/)+/i, '') : rawModel;
      const activeUrl = (aiConfig.baseUrls?.[aiConfig.provider] || preset.defaultBaseUrl || 'http://127.0.0.1:11434/v1').trim();
      const providerKeys: Record<string, string> = {};
      const providerModels: Record<string, string> = {};
      const providerUrls: Record<string, string> = {};
      AI_PROVIDER_PRESETS.forEach((p) => {
        const k = (aiConfig.apiKeys?.[p.id] || '').trim();
        if (k) providerKeys[p.id] = k;
        const m = (aiConfig.models?.[p.id] || p.defaultModel || '').trim();
        if (m) providerModels[p.id] = p.id === 'gemini' ? m.replace(/^(?:models\/)+/i, '') : m;
        const u = (aiConfig.baseUrls?.[p.id] || p.defaultBaseUrl || '').trim();
        if (u) providerUrls[p.id] = u;
      });
      fetch('/api/kernel/ai/nitrogen/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiConfig.provider,
          base_url: activeUrl,
          api_key: activeKey || (isLocal ? 'ollama' : ''),
          model_name: cleanModel,
          provider_keys: providerKeys,
          provider_models: providerModels,
          provider_urls: providerUrls,
          temperature: aiConfig.temperature,
          enabled: aiEnabled,
        }),
      }).catch(() => {});
    }, 300);
    return () => window.clearTimeout(timer);
  }, [aiConfig, aiEnabled]);

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
    replace_hotkeys: true,
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
  // Luma OS 1.4 Boron: Cinematic Update Animation Preview, SDK v3.0 Studio, Kernel Diagnostics & Global Widget Styling
  const [updateCinemaDemo, setUpdateCinemaDemo] = useState<GitHubUpdateProgress | null>(null);
  const [updateCinemaDismissed, setUpdateCinemaDismissed] = useState<boolean>(false);
  const [pluginsTab, setPluginsTab] = useState<'catalog' | 'sdk_studio'>('catalog');
  const [kernelDiag, setKernelDiag] = useState<{
    go_version?: string;
    goroutines?: number;
    heap_alloc_mb?: number;
    sys_mem_mb?: number;
    gc_cycles?: number;
    uptime_sec?: number;
    security_rules?: number;
    sdk_themes?: number;
    sdk_plugins?: number;
  } | null>(null);
  const [globalWidgetBgMode, setGlobalWidgetBgMode] = useState<WidgetBgMode>('glass');
  const [globalWidgetOpacity, setGlobalWidgetOpacity] = useState<number>(78);
  const [globalWidgetBlur, setGlobalWidgetBlur] = useState<number>(16);
  const [globalWidgetColor, setGlobalWidgetColor] = useState<string>('#1e1b4b');

  const [designStyle, setDesignStyle] = useState<DesignStyle>(
    savedState?.designStyle === 'nova'
      ? 'nova'
      : savedState?.designStyle === 'glass'
      ? 'glass'
      : 'matrix'
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // ==================== LUMA OS 1.7.3 (OXYGEN) TASKBAR ELEMENTS, DESKTOP TEAR-OFF & CUSTOM WALLPAPERS ====================
  const [taskbarElementsOrder, setTaskbarElementsOrder] = useState<TaskbarElementId[]>(() => {
    try {
      const raw = localStorage.getItem('luma_tb_el_order_v173');
      const parsed = raw ? JSON.parse(raw) : savedState?.taskbarElementsOrder;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter((x): x is TaskbarElementId =>
          DEFAULT_TASKBAR_ELEMENTS.includes(x as TaskbarElementId)
        );
        const missing = DEFAULT_TASKBAR_ELEMENTS.filter((x) => !valid.includes(x));
        return [...valid, ...missing];
      }
    } catch { /* ignore */ }
    return [...DEFAULT_TASKBAR_ELEMENTS];
  });
  const [taskbarHiddenElements, setTaskbarHiddenElements] = useState<TaskbarElementId[]>(() => {
    try {
      const raw = localStorage.getItem('luma_tb_el_hidden_v173');
      const parsed = raw ? JSON.parse(raw) : savedState?.taskbarHiddenElements;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is TaskbarElementId =>
          DEFAULT_TASKBAR_ELEMENTS.includes(x as TaskbarElementId)
        );
      }
    } catch { /* ignore */ }
    return [];
  });
  const [desktopTaskbarTools, setDesktopTaskbarTools] = useState<DesktopTaskbarTool[]>(() => {
    try {
      const raw = localStorage.getItem('luma_tb_desktop_tools_v173');
      const parsed = raw ? JSON.parse(raw) : savedState?.desktopTaskbarTools;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (t): t is DesktopTaskbarTool =>
            Boolean(t) &&
            DEFAULT_TASKBAR_ELEMENTS.includes(t.id as TaskbarElementId) &&
            typeof t.x === 'number' &&
            typeof t.y === 'number'
        );
      }
    } catch { /* ignore */ }
    return [];
  });
  const [draggedBarElement, setDraggedBarElement] = useState<TaskbarElementId | null>(null);
  const [dragOverBarElement, setDragOverBarElement] = useState<{
    id: TaskbarElementId;
    side: 'left' | 'right';
  } | null>(null);
  const barElementDropHandledRef = useRef<boolean>(false);
  const taskbarFooterRef = useRef<HTMLElement | null>(null);
  const [barElementCtxMenu, setBarElementCtxMenu] = useState<{
    x: number;
    y: number;
    id: TaskbarElementId;
    fromDesktop?: boolean;
  } | null>(null);
  const [customWallpapers, setCustomWallpapers] = useState<{ name: string; url: string; size?: number }[]>([]);
  const [uploadingCustomWp, setUploadingCustomWp] = useState<boolean>(false);
  const customWpInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('luma_tb_el_order_v173', JSON.stringify(taskbarElementsOrder));
    } catch { /* ignore */ }
  }, [taskbarElementsOrder]);

  useEffect(() => {
    try {
      localStorage.setItem('luma_tb_el_hidden_v173', JSON.stringify(taskbarHiddenElements));
    } catch { /* ignore */ }
  }, [taskbarHiddenElements]);

  useEffect(() => {
    try {
      localStorage.setItem('luma_tb_desktop_tools_v173', JSON.stringify(desktopTaskbarTools));
    } catch { /* ignore */ }
  }, [desktopTaskbarTools]);

  // Fetch persistent custom wallpapers stored on disk (~/Pictures/LumaWallpapers)
  const refreshCustomWallpapers = useCallback(async () => {
    try {
      const r = await fetch('/api/kernel/wallpapers/custom');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.wallpapers)) setCustomWallpapers(d.wallpapers);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void refreshCustomWallpapers();
    const onAddWpEvent = () => {
      customWpInputRef.current?.click();
    };
    window.addEventListener('luma-add-custom-wallpaper', onAddWpEvent);
    return () => window.removeEventListener('luma-add-custom-wallpaper', onAddWpEvent);
  }, [refreshCustomWallpapers]);

  // ==================== LUMA OS 1.6.1 (NITROGEN · N-7) FLAGSHIP STATE ====================
  const [devModeEnabled, setDevModeEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('luma_dev_mode_v16') === '1'; } catch { return false; }
  });
  const [novaPanelOpen, setNovaPanelOpen] = useState<boolean>(false);

  // Leaving Luma Nova always closes the Nova overlay cleanly so taskbar never gets stuck
  useEffect(() => {
    if (designStyle !== 'nova') setNovaPanelOpen(false);
  }, [designStyle]);
  const [quickLookState, setQuickLookState] = useState<{
    open: boolean;
    items: QuickLookCandidate[];
    index: number;
  }>({ open: false, items: [], index: 0 });
  const [smartDock, setSmartDock] = useState<SmartDockStatus>({
    ok: true,
    tasks: [],
    badges: {},
    stacks: [],
    checked_at: '',
  });
  const effectiveDockTasks = useMemo<DockProgressTask[]>(
    () => (renderDockTask ? [renderDockTask, ...smartDock.tasks] : smartDock.tasks),
    [renderDockTask, smartDock.tasks]
  );
  const [winKeyToLuma, setWinKeyToLuma] = useState<boolean>(true);

  useEffect(() => {
    try { localStorage.setItem('luma_dev_mode_v16', devModeEnabled ? '1' : '0'); } catch { /* ignore */ }
  }, [devModeEnabled]);

  useEffect(() => {
    fetch('/api/kernel/win-key/toggle')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.enabled === 'boolean') setWinKeyToLuma(d.enabled);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const pollSmartDock = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch('/api/kernel/dock/status');
        if (r.ok && alive) {
          const d: SmartDockStatus = await r.json();
          if (d?.ok) setSmartDock(d);
        }
      } catch { /* ignore */ }
    };
    void pollSmartDock();
    const id = window.setInterval(() => void pollSmartDock(), 2500);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

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

  // ==================== LUMA OS 1.5 (CARBON · C-6) FLAGSHIP STATE ====================
  const [windowControlsStyle, setWindowControlsStyle] = useState<WindowControlsStyle>(() => {
    try {
      const v = localStorage.getItem('luma_win_controls_v15');
      if (v === 'dots3' || v === 'menu3' || v === 'classic') return v;
    } catch { /* ignore */ }
    return 'classic';
  });
  const [dualTaskbarMode, setDualTaskbarMode] = useState<boolean>(() => {
    try { return localStorage.getItem('luma_dual_taskbar_v15') === '1'; } catch { return false; }
  });
  const [taskbarDirectLaunch, setTaskbarDirectLaunch] = useState<boolean>(() => {
    try { return localStorage.getItem('luma_direct_launch_v15') !== '0'; } catch { return true; }
  });
  const [taskbarDirectAppIds, setTaskbarDirectAppIds] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('luma_direct_apps_v15') || 'null');
      if (Array.isArray(raw)) return raw;
    } catch { /* ignore */ }
    return ['steam', 'discord', 'vscode'];
  });
  const [deleteAnimStyle, setDeleteAnimStyle] = useState<'harmony7' | 'shrink' | 'evaporate'>(() => {
    try {
      const v = localStorage.getItem('luma_delete_anim_v15');
      if (v === 'harmony7' || v === 'shrink' || v === 'evaporate') return v;
    } catch { /* ignore */ }
    return 'harmony7';
  });
  const [carbonHubOpen, setCarbonHubOpen] = useState(false);
  const [hubBluetoothEnabled, setHubBluetoothEnabled] = useState(true);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [btDevicesCollapsed, setBtDevicesCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('luma_bt_section_collapsed_v15') === '1'; } catch { return false; }
  });
  const [trashCount, setTrashCount] = useState(0);
  const [scenarios, setScenarios] = useState<LumaScenarioRule[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('luma_scenarios_v15') || 'null');
      if (Array.isArray(raw) && raw.length > 0) return raw;
    } catch { /* ignore */ }
    return DEFAULT_SCENARIOS;
  });
  const [enabledFeatures, setEnabledFeatures] = useState<SystemFeaturesMap>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('luma_features_v15') || 'null');
      if (raw && typeof raw === 'object') {
        return {
          ai: true,
          dynamicIsland: true,
          calendar: true,
          scenarios: true,
          codeStudio: true,
          cutStudio: true,
          trash: true,
          easterEgg: true,
          wirelessScanner: true,
          privateVault: true,
          ...raw,
        };
      }
    } catch { /* ignore */ }
    return {
      ai: true,
      dynamicIsland: true,
      calendar: true,
      scenarios: true,
      codeStudio: true,
      cutStudio: true,
      trash: true,
      easterEgg: true,
      wirelessScanner: true,
      privateVault: true,
    };
  });
  const [hubNotifications, setHubNotifications] = useState<ShadeNotificationItem[]>([
    {
      id: 'notif_nitrogen_welcome_160',
      source: 'system',
      appName: 'Luma OS 1.7.3',
      sender: 'Luma OS 1.7.3 Oxygen',
      title: 'Добро пожаловать в Luma OS 1.7.3 (Oxygen · Стиль ОС)!',
      body: 'Классическая и гибко настраиваемая панель задач с перетаскиванием и выносом кнопок на рабочий стол · Плавные высококадровые анимации · Свои обои с диска · Компактная Панель управления в Стиле ОС с удобными ползунками и окном настроек плеера.',
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      dateLabel: 'Сегодня',
      timestamp: Date.now(),
      unread: true,
    },
  ]);
  const [nightLightLevel, setNightLightLevel] = useState<number>(() => {
    try {
      const n = Number(localStorage.getItem('luma_night_light_v151') || '0');
      return Number.isFinite(n) ? Math.max(0, Math.min(75, n)) : 0;
    } catch {
      return 0;
    }
  });
  const [gamingBoost, setGamingBoost] = useState<boolean>(false);
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const ccHoverEnteredRef = useRef<boolean>(false);
  const ccLeaveTimerRef = useRef<number | null>(null);
  const seenOsNotifIdsRef = useRef<Set<string>>(new Set());
  const osNotifSinceRef = useRef<number>(0);
  const [customWidgetModal, setCustomWidgetModal] = useState<{
    open: boolean;
    editWidgetId?: string;
    spec?: CustomUserWidgetSpec | null;
  }>({ open: false, spec: null });
  const [pendingCustomWidget, setPendingCustomWidget] = useState<{
    seq: number;
    editWidgetId?: string;
    spec: CustomUserWidgetSpec;
  } | null>(null);
  const cornerHoverTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try { localStorage.setItem('luma_night_light_v151', String(nightLightLevel)); } catch { /* ignore */ }
  }, [nightLightLevel]);
  useEffect(() => {
    try { localStorage.setItem('luma_win_controls_v15', windowControlsStyle); } catch { /* ignore */ }
  }, [windowControlsStyle]);
  useEffect(() => {
    try { localStorage.setItem('luma_dual_taskbar_v15', dualTaskbarMode ? '1' : '0'); } catch { /* ignore */ }
  }, [dualTaskbarMode]);
  useEffect(() => {
    try { localStorage.setItem('luma_direct_launch_v15', taskbarDirectLaunch ? '1' : '0'); } catch { /* ignore */ }
  }, [taskbarDirectLaunch]);
  useEffect(() => {
    try { localStorage.setItem('luma_direct_apps_v15', JSON.stringify(taskbarDirectAppIds)); } catch { /* ignore */ }
  }, [taskbarDirectAppIds]);
  useEffect(() => {
    try { localStorage.setItem('luma_delete_anim_v15', deleteAnimStyle); } catch { /* ignore */ }
  }, [deleteAnimStyle]);
  useEffect(() => {
    try { localStorage.setItem('luma_bt_section_collapsed_v15', btDevicesCollapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [btDevicesCollapsed]);
  useEffect(() => {
    try { localStorage.setItem('luma_scenarios_v15', JSON.stringify(scenarios)); } catch { /* ignore */ }
  }, [scenarios]);
  useEffect(() => {
    try { localStorage.setItem('luma_features_v15', JSON.stringify(enabledFeatures)); } catch { /* ignore */ }
  }, [enabledFeatures]);

  // Initial Trash count probe
  useEffect(() => {
    fetch('/api/kernel/trash')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && typeof d.count === 'number') setTrashCount(d.count);
      })
      .catch(() => {});
  }, []);
  const zCounterRef = useRef<number>(25);
  const [explorerStartPath, setExplorerStartPath] = useState<string>('~');
  const [explorerKey, setExplorerKey] = useState<number>(1);
  // --- Luma OS 1.7.3: Built-in Photo Studio, Base/Pro Edition, System File Handlers & Modular Panel ---
  const [photoEditorPath, setPhotoEditorPath] = useState<string>('');
  const [photoEditorKey, setPhotoEditorKey] = useState<number>(1);
  const [editionInfo, setEditionInfo] = useState<{
    edition: 'base' | 'pro';
    edition_label: string;
    is_pro: boolean;
    is_admin: boolean;
    full_rights: boolean;
    can_elevate: boolean;
  }>({
    edition: 'pro',
    edition_label: 'Luma OS 1.7.3 Pro',
    is_pro: true,
    is_admin: false,
    full_rights: false,
    can_elevate: true,
  });
  const [sysHandlers, setSysHandlers] = useState<{
    photos_in_luma: boolean;
    explorer_in_luma: boolean;
    code_in_luma: boolean;
    office_in_luma: boolean;
    os_registered: boolean;
    message?: string;
  }>({
    photos_in_luma: true,
    explorer_in_luma: true,
    code_in_luma: true,
    office_in_luma: true,
    os_registered: false,
  });
  const [modularPanelCfg, setModularPanelCfg] = useState<ModularPanelConfig>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('luma_modular_panel_v172') || 'null');
      if (raw && Array.isArray(raw.order)) return { ...DEFAULT_MODULAR_PANEL_CONFIG, ...raw };
    } catch {
      // ignore
    }
    return DEFAULT_MODULAR_PANEL_CONFIG;
  });
  useEffect(() => {
    try {
      localStorage.setItem('luma_modular_panel_v172', JSON.stringify(modularPanelCfg));
    } catch {
      // ignore
    }
  }, [modularPanelCfg]);
  useEffect(() => {
    void fetch('/api/kernel/edition')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok) setEditionInfo(d);
      })
      .catch(() => {});
    void fetch('/api/kernel/system-handlers')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok) setSysHandlers(d);
      })
      .catch(() => {});
  }, []);
  const taskbarWheelRef = useRef<number>(0);
  const [spotlightOpen, setSpotlightOpen] = useState<boolean>(false);
  const [startMenuOpen, setStartMenuOpen] = useState<boolean>(false);
  const [startMenuTab, setStartMenuTab] = useState<'apps' | 'overview'>('apps');
  const [startSearch, setStartSearch] = useState<string>('');
  const [touchModeEnabled, setTouchModeEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('luma_touch_mode_v163');
      if (saved === '1' || saved === 'true') return true;
      if (saved === '0' || saved === 'false') return false;
      return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    } catch {
      return false;
    }
  });
  const [controlCenterOpen, setControlCenterOpen] = useState<boolean>(false);
  const [wifiStatus, setWifiStatus] = useState<WifiStatusSnapshot | null>(null);
  const [wifiLoading, setWifiLoading] = useState<boolean>(false);
  const [btStatus, setBtStatus] = useState<BluetoothStatusSnapshot | null>(null);
  const [btLoading, setBtLoading] = useState<boolean>(false);
  const [ccConnectivityPicker, setCcConnectivityPicker] = useState<'none' | 'wifi' | 'bluetooth'>('none');

  // Apply Touch & Stylus CSS class + enable touch long-press => right-click context menu globally
  useEffect(() => {
    try {
      localStorage.setItem('luma_touch_mode_v163', touchModeEnabled ? '1' : '0');
    } catch {
      /* ignore */
    }
    document.documentElement.classList.toggle('luma-touch-mode', touchModeEnabled);
  }, [touchModeEnabled]);

  useEffect(() => {
    let longPressTimer: number | null = null;
    let startX = 0;
    let startY = 0;
    const clearTimer = () => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      if (e.pointerType === 'pen' && e.button === 2) return; // stylus barrel button already fires contextmenu
      const target = e.target as HTMLElement | null;
      if (!target || target.closest('input, textarea, [contenteditable="true"], canvas')) return;
      startX = e.clientX;
      startY = e.clientY;
      clearTimer();
      longPressTimer = window.setTimeout(() => {
        const ctxEvt = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: startX,
          clientY: startY,
          button: 2,
          buttons: 2,
        });
        target.dispatchEvent(ctxEvt);
        longPressTimer = null;
      }, 540);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (longPressTimer !== null && Math.hypot(e.clientX - startX, e.clientY - startY) > 12) {
        clearTimer();
      }
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', clearTimer, true);
    window.addEventListener('pointercancel', clearTimer, true);
    return () => {
      clearTimer();
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', clearTimer, true);
      window.removeEventListener('pointercancel', clearTimer, true);
    };
  }, []);
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
  const [apps, setApps] = useState<AppItem[]>(() => {
    const base: AppItem[] = Array.isArray(savedState?.apps) && savedState.apps.length > 0 ? savedState.apps : INITIAL_APPS;
    const byId = new Map(INITIAL_APPS.map((a) => [a.id, a]));
    const withCacheBust = (url: string) =>
      url.startsWith('/api/kernel/app-icon?') && !url.includes('v=17') ? `${url}&v=17` : url;
    const enriched = base.map((a) => {
      if (a.iconUrl) return { ...a, iconUrl: withCacheBust(a.iconUrl) };
      const def = byId.get(a.id);
      if (def?.iconUrl) return { ...a, iconUrl: withCacheBust(def.iconUrl) };
      if (a.type === 'app' || a.type === 'system') {
        const probe = a.url && !a.url.startsWith('http') && !a.url.includes('://') ? a.url : a.package || a.name || a.id;
        return { ...a, iconUrl: `/api/kernel/app-icon?name=${encodeURIComponent(probe)}&v=17` };
      }
      return a;
    });
    const existingIds = new Set(enriched.map((a) => a.id));
    for (const def of INITIAL_APPS) {
      if (def.type === 'system' && !existingIds.has(def.id)) {
        enriched.push({ ...def, iconUrl: def.iconUrl ? withCacheBust(def.iconUrl) : def.iconUrl });
      }
    }
    return enriched;
  });
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
  const [splitLeftPid, setSplitLeftPid] = useState<number>(0);
  const [splitRightPid, setSplitRightPid] = useState<number>(0);
  const [osMediaSessions, setOsMediaSessions] = useState<LiveMediaSessionItem[]>([]);
  const [selectedMediaSourceApp, setSelectedMediaSourceApp] = useState<string>('');
  const [loadingMediaSessions, setLoadingMediaSessions] = useState<boolean>(false);
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
  const [islandAnchor, setIslandAnchor] = useState<
    'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  >(() => {
    const a = savedState?.islandAnchor;
    if (
      a === 'top-left' ||
      a === 'top-center' ||
      a === 'top-right' ||
      a === 'bottom-left' ||
      a === 'bottom-center' ||
      a === 'bottom-right'
    ) {
      return a;
    }
    return savedState?.islandPosition === 'bottom' ? 'bottom-center' : 'top-center';
  });
  const [islandOffsetY, setIslandOffsetY] = useState<number>(
    typeof savedState?.islandOffsetY === 'number' ? savedState.islandOffsetY : 10
  );
  const [islandSize, setIslandSize] = useState<'compact' | 'standard' | 'expanded'>(
    savedState?.islandSize || 'standard'
  );
  const [islandStyle, setIslandStyle] = useState<'obsidian' | 'cryo' | 'frosted' | 'oled'>(
    savedState?.islandStyle || 'obsidian'
  );
  const [islandOpacity, setIslandOpacity] = useState<number>(
    typeof savedState?.islandOpacity === 'number' ? savedState.islandOpacity : 94
  );
  const [islandPinOverAllWindows, setIslandPinOverAllWindows] = useState<boolean>(
    savedState?.islandPinOverAllWindows ?? true
  );
  const [islandAlwaysOverLuma, setIslandAlwaysOverLuma] = useState<boolean>(
    savedState?.islandAlwaysOverLuma ?? false
  );
  const [islandShowInFullscreen, setIslandShowInFullscreen] = useState<boolean>(
    savedState?.islandShowInFullscreen ?? false
  );
  const [islandClickThrough, setIslandClickThrough] = useState<boolean>(
    savedState?.islandClickThrough ?? false
  );
  const [islandLocked, setIslandLocked] = useState<boolean>(
    savedState?.islandLocked ?? true
  );
  const [islandHoverExpand, setIslandHoverExpand] = useState<boolean>(
    savedState?.islandHoverExpand ?? true
  );
  const [islandShowClock, setIslandShowClock] = useState<boolean>(
    savedState?.islandShowClock ?? true
  );
  const [islandShowTelemetry, setIslandShowTelemetry] = useState<boolean>(
    savedState?.islandShowTelemetry ?? true
  );
  const [islandShowWeather, setIslandShowWeather] = useState<boolean>(
    savedState?.islandShowWeather ?? false
  );
  const [islandShowDownloads, setIslandShowDownloads] = useState<boolean>(
    savedState?.islandShowDownloads ?? true
  );
  const [islandShowNotifications, setIslandShowNotifications] = useState<boolean>(
    savedState?.islandShowNotifications ?? true
  );
  const [nativeIslandOverlayActive, setNativeIslandOverlayActive] = useState<boolean>(false);
  const [langSearchQuery, setLangSearchQuery] = useState<string>('');
  const [islandShowEq, setIslandShowEq] = useState<boolean>(savedState?.islandShowEq ?? true);
  const [islandShowClip, setIslandShowClip] = useState<boolean>(savedState?.islandShowClip ?? true);
  const [islandShowBattery, setIslandShowBattery] = useState<boolean>(savedState?.islandShowBattery ?? true);
  const [islandAutoClipboard, setIslandAutoClipboard] = useState<boolean>(savedState?.islandAutoClipboard ?? true);
  const [islandGlowEnabled, setIslandGlowEnabled] = useState<boolean>(savedState?.islandGlowEnabled ?? true);
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardEntry[]>(
    Array.isArray(savedState?.clipboardHistory)
      ? savedState.clipboardHistory
      : [
          {
            id: 'clip_init_1',
            text: 'Luma OS 1.7.3 (Oxygen · O-8) — Буфер обмена Luma Island готов к работе',
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
  const [githubUpdateStatus, setGithubUpdateStatus] = useState<string>('Установлена сборка Luma OS 1.7.3 (Oxygen · O-8)');
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
      source: 'LumaCore 1.6.2',
      message: 'Инициализация оболочки Luma OS 1.7.3 (Oxygen · O-8), LumaCore 1.6.2, LumaShield 3.2 Zero-Freeze и AI 5.0',
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
    setHubNotifications((prev) => [
      {
        id: `hn_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        source: title.toLowerCase().includes('telegram') ? 'telegram' : 'system',
        sender: title,
        title,
        body: message,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        unread: true,
      },
      ...prev.slice(0, 39),
    ]);
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
    triggerDockBounce(id);
    zCounterRef.current += 1;
    const nextZ = zCounterRef.current;
    touchWindowMru(`luma_${id}`);
    setWindows((prev) => ({
      ...prev,
      [id]: { open: true, minimized: false, z: nextZ, desktop: activeDesktop },
    }));
    setControlCenterOpen(false);
    setNotifShadeOpen(false);
    setStartMenuOpen(false);
    setTaskListOpen(false);
    setMultitaskingOpen(false);
    setTaskbarAppMenuId(null);
    setTaskbarHostWinPid(null);
    setTaskbarCtxMenu(null);
  };

  // --- Developer SDK v3.0 (Persistent Custom Themes & Plugins + Global window.LumaSDK API) ---
  const registerSdkTheme = async (theme: CustomThemeConfig, applyNow = false) => {
    setCustomThemes((prev) => ({ ...prev, [theme.id]: theme }));
    if (applyNow) {
      setThemeKey(theme.id);
    }
    try {
      await fetch('/api/v3/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: theme.id,
          name: theme.name,
          description: theme.description,
          is_dark: theme.isDark,
          bg_gradient: theme.bgGradient,
          surface_rgba: theme.surfaceRgba,
          card_hex: theme.cardHex,
          accent: theme.accent,
          accent_hex: theme.accentHex,
        }),
      });
    } catch {
      /* offline fallback keeps localStorage state */
    }
  };

  const deleteSdkTheme = async (id: string) => {
    setCustomThemes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (themeKey === id) setThemeKey('nothing_mono');
    try {
      await fetch(`/api/v3/themes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      /* ignore */
    }
  };

  const registerSdkPlugin = async (plugin: PluginItem) => {
    setPlugins((prev) => {
      const exists = prev.some((p) => p.id === plugin.id);
      return exists ? prev.map((p) => (p.id === plugin.id ? plugin : p)) : [plugin, ...prev];
    });
    try {
      await fetch('/api/v3/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          api_version: plugin.apiVersion || '3.0',
          author: plugin.author || 'Developer',
          category: plugin.category || 'Инструменты',
          icon: plugin.icon || 'Puzzle',
          description: plugin.description,
          enabled: plugin.enabled,
          hooks: plugin.hooks || ['onAction'],
          permissions: plugin.permissions || ['notify'],
          action_id: plugin.actionId || 'custom_sdk_v3',
        }),
      });
    } catch {
      /* ignore */
    }
  };

  const deleteSdkPlugin = async (id: string) => {
    setPlugins((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/v3/plugins?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      /* ignore */
    }
  };

  // Hydrate Developer SDK v3.0 themes & plugins from ~/.config/LumaOS/sdk_v3 on boot
  useEffect(() => {
    fetch('/api/v3/themes')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!Array.isArray(d?.themes) || d.themes.length === 0) return;
        setCustomThemes((prev) => {
          const next = { ...prev };
          for (const t of d.themes) {
            if (!t?.id) continue;
            next[t.id] = {
              id: t.id,
              name: t.name || t.id,
              description: t.description || 'SDK v3.0 Theme',
              isDark: t.is_dark !== false,
              bgGradient: t.bg_gradient || 'linear-gradient(155deg, #060916, #111827)',
              surfaceRgba: t.surface_rgba || 'rgba(15, 22, 42, 0.90)',
              cardHex: t.card_hex || '#131c36',
              accent: t.accent || 'indigo',
              accentHex: t.accent_hex || '#6366f1',
            };
          }
          return next;
        });
      })
      .catch(() => {});

    fetch('/api/v3/plugins')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!Array.isArray(d?.plugins) || d.plugins.length === 0) return;
        setPlugins((prev) => {
          const existing = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const p of d.plugins) {
            if (!p?.id || existing.has(p.id)) continue;
            merged.push({
              id: p.id,
              name: p.name || p.id,
              version: p.version || '1.0.0',
              apiVersion: p.api_version || '3.0',
              author: p.author || 'Developer',
              category: p.category || 'Инструменты',
              icon: p.icon || 'Puzzle',
              description: p.description || 'SDK v3.0 Plugin',
              enabled: p.enabled !== false,
              file: `${p.id}.luma.json`,
              hooks: Array.isArray(p.hooks) ? p.hooks : ['onAction'],
              permissions: Array.isArray(p.permissions) ? p.permissions : ['notify'],
              actionId: p.action_id || 'custom_sdk_v3',
            });
          }
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  // Expose live global window.LumaSDK v3.0 API for third-party developers & DevTools
  useEffect(() => {
    const sdkObj = {
      version: '3.0',
      osVersion: '1.4 (Boron)',
      kernelVersion: '1.5',
      registerTheme: (theme: CustomThemeConfig, applyNow = true) => registerSdkTheme(theme, applyNow),
      deleteTheme: (id: string) => deleteSdkTheme(id),
      applyTheme: (id: string) => {
        const found = allThemesMap[id];
        if (found) {
          setThemeKey(id);
        }
      },
      listThemes: () => Object.values(allThemesMap),
      registerPlugin: (plugin: PluginItem) => registerSdkPlugin(plugin),
      deletePlugin: (id: string) => deleteSdkPlugin(id),
      listPlugins: () => plugins,
      notify: (title: string, msg: string, type: 'info' | 'success' | 'warning' = 'info') => pushToast(title, msg, type),
      openWindow: (id: DexWinId) => openWindow(id),
      getTelemetry: () => liveSystem,
    };
    (window as unknown as { LumaSDK?: typeof sdkObj }).LumaSDK = sdkObj;
  });

  // Luma OS 1.4 Boron: Play Cinematic Update Animation Preview (6s smooth simulation)
  const updateDemoTimersRef = useRef<number[]>([]);
  const playUpdateCinemaDemo = () => {
    updateDemoTimersRef.current.forEach((id) => window.clearTimeout(id));
    updateDemoTimersRef.current = [];
    const steps: { delay: number; data: GitHubUpdateProgress }[] = [
      {
        delay: 0,
        data: {
          running: true,
          stage: 'connecting',
          percent: 6,
          downloaded_bytes: 2.1 * 1024 * 1024,
          total_bytes: 35.0 * 1024 * 1024,
          speed_mbps: 16.4,
          target_version: '1.7.3 (Oxygen · Стиль ОС)',
          message: 'Соединение с репозиторием GitHub и проверка обновления Luma OS 1.7.3...',
        },
      },
      {
        delay: 900,
        data: {
          running: true,
          stage: 'downloading',
          percent: 29,
          downloaded_bytes: 10.2 * 1024 * 1024,
          total_bytes: 35.0 * 1024 * 1024,
          speed_mbps: 27.6,
          target_version: '1.7.3 (Oxygen · Стиль ОС)',
          message: 'Загрузка сборки LumaOS_1.7.3_Pro.exe (Классическая и гибкая панель задач + 120 Гц анимации)...',
        },
      },
      {
        delay: 1900,
        data: {
          running: true,
          stage: 'downloading',
          percent: 66,
          downloaded_bytes: 23.1 * 1024 * 1024,
          total_bytes: 35.0 * 1024 * 1024,
          speed_mbps: 36.2,
          target_version: '1.7.3 (Oxygen · Стиль ОС)',
          message: 'Загрузка Стиля ОС, компактной Панели управления, расширенного плеера и 21 обоев...',
        },
      },
      {
        delay: 3000,
        data: {
          running: true,
          stage: 'verifying',
          percent: 88,
          downloaded_bytes: 35.0 * 1024 * 1024,
          total_bytes: 35.0 * 1024 * 1024,
          speed_mbps: 19.4,
          target_version: '1.7.3 (Oxygen · Стиль ОС)',
          sha256: 'e9f2c84a71b04d35e82a6f913c5d2e8a',
          message: 'Проверка целостности файла обновления...',
        },
      },
      {
        delay: 4200,
        data: {
          running: true,
          stage: 'restarting',
          percent: 100,
          downloaded_bytes: 35.0 * 1024 * 1024,
          total_bytes: 35.0 * 1024 * 1024,
          speed_mbps: 0,
          target_version: '1.7.3 (Oxygen · Стиль ОС)',
          sha256: 'e9f2c84a71b04d35e82a6f913c5d2e8a',
          message: 'Сборка Luma OS 1.7.3 проверена и готова к мгновенному запуску!',
        },
      },
    ];
    for (const st of steps) {
      const id = window.setTimeout(() => setUpdateCinemaDemo(st.data), st.delay);
      updateDemoTimersRef.current.push(id);
    }
  };

  // LumaCore 1.5 Kernel Diagnostics & GC Memory Trim
  const runKernelDiagnostics = async (trimGc = false) => {
    try {
      const r = await fetch(`/api/kernel/diagnostics${trimGc ? '?gc=1' : ''}`);
      if (r.ok) {
        const d = await r.json();
        setKernelDiag(d);
        if (trimGc) {
          pushToast(
            'LumaCore 1.5 GC Trim',
            `Память ядра очищена: Heap ${d.heap_alloc_mb} МБ · Горутин: ${d.goroutines}`,
            'success'
          );
        }
      }
    } catch {
      /* ignore */
    }
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
        version: '1.4 (Boron)',
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

  // Luma OS 1.7.2: Universal System File Router — open ALL photos, folders, docs & media inside Luma OS!
  const openFileInLumaSystem = useCallback(
    (targetPath: string, forcedMode: string = 'auto', displayName?: string) => {
      const clean = (targetPath || '').trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      const isImg = /\.(png|jpe?g|webp|bmp|gif|svg|ico|avif)$/.test(lower);
      const isOffice = /\.(docx?|xlsx?|pptx?|csv|rtf|odt)$/.test(lower);
      const isMedia = /\.(mp4|mkv|avi|mov|webm|mp3|wav|flac|ogg|m4a)$/.test(lower);
      const isCode = /\.(txt|md|json|jsx?|tsx?|go|py|css|html?|xml|ya?ml|ini|cfg|log|sh|ps1|rs|cpp|c|h|cs|sql)$/.test(lower);
      if (forcedMode === 'photo' || (forcedMode === 'auto' && isImg && sysHandlers.photos_in_luma)) {
        setPhotoEditorPath(clean);
        setPhotoEditorKey((k) => k + 1);
        openWindow('photo_editor');
        return;
      }
      if (forcedMode === 'explorer' || (!isImg && !isOffice && !isMedia && !isCode && !/\.[a-z0-9]{1,5}$/i.test(lower))) {
        openExplorerAt(clean);
        return;
      }
      if (forcedMode === 'office' || (forcedMode === 'auto' && isOffice && sysHandlers.office_in_luma)) {
        openWindow('office');
        pushToast('Luma Office Pro', `Открыт документ: ${displayName || clean.split(/[\\/]/).pop()}`, 'info');
        return;
      }
      if (forcedMode === 'media' || (forcedMode === 'auto' && isMedia)) {
        openWindow('cut_studio');
        pushToast('Luma Cut Studio', `Медиафайл открыт в системе: ${displayName || clean.split(/[\\/]/).pop()}`, 'info');
        return;
      }
      if (forcedMode === 'code' || (forcedMode === 'auto' && isCode && sysHandlers.code_in_luma)) {
        openWindow('code_studio');
        pushToast('Luma Code Studio', `Файл открыт в IDE: ${displayName || clean.split(/[\\/]/).pop()}`, 'info');
        return;
      }
      openExplorerAt(clean.replace(/[\\/][^\\/]+$/, '') || '~');
    },
    [sysHandlers]
  );

  useEffect(() => {
    const onInternalOpen = (e: Event) => {
      const det = (e as CustomEvent<{ path?: string; mode?: string; name?: string }>).detail;
      if (det?.path) openFileInLumaSystem(det.path, det.mode || 'auto', det.name);
    };
    window.addEventListener('luma-open-internal-file', onInternalOpen);
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/kernel/external-open/events');
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'open' && msg?.item?.path) {
            openFileInLumaSystem(msg.item.path, msg.item.mode || 'auto', msg.item.name);
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // offline
    }
    return () => {
      window.removeEventListener('luma-open-internal-file', onInternalOpen);
      es?.close();
    };
  }, [openFileInLumaSystem]);

  const openIslandTab = (tab: typeof islandTab) => {
    setIslandTab(tab);
    openWindow('island');
    if (tab === 'overview' || tab === 'player') {
      void refreshOsMediaSessions();
    }
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
    touchWindowMru(`luma_${id}`);
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], z: nextZ } }));
  };

  const minimizeWindow = (id: DexWinId) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], minimized: true } }));
  };

  const closeWindow = (id: DexWinId) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], open: false, minimized: false } }));
  };

  const showDesktop = () => {
    touchWindowMru('luma_home_desktop');
    setWindows((prev) => {
      const next = { ...prev };
      (Object.keys(next) as DexWinId[]).forEach((k) => {
        if (next[k].open) next[k] = { ...next[k], minimized: true };
      });
      return next;
    });
    setControlCenterOpen(false);
    setNotifShadeOpen(false);
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

  const pastePlainFromSmartClipboard = async (text: string, simulatePaste = false) => {
    const clean = text.replace(/\r\n/g, '\n');
    lastOsClipRef.current = clean;
    try {
      await navigator.clipboard.writeText(clean);
    } catch {
      // ignore WebView2 permission
    }
    try {
      await fetch('/api/kernel/clipboard/paste-plain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, simulate_paste: simulatePaste }),
      });
    } catch {
      // fallback offline
    }
    pushClipboardText(clean);
    pushToast('Умный буфер (Plain Text)', clean.length > 42 ? `${clean.slice(0, 42)}…` : clean, 'success');
  };

  useEffect(() => {
    const onSmartClipKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyV') {
        e.preventDefault();
        setSmartClipboardOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onSmartClipKey);
    return () => window.removeEventListener('keydown', onSmartClipKey);
  }, []);

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
    if (!dynamicIslandEnabled || !islandAutoClipboard) return;
    readOsClipboardNow(true);
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      readOsClipboardNow(true);
    }, 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicIslandEnabled, islandAutoClipboard]);

  // Notify LumaCore 1.4 backend when Dynamic Island is toggled so SMTC media polling stops completely when Island is off
  useEffect(() => {
    fetch('/api/kernel/island/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: dynamicIslandEnabled }),
    }).catch(() => {});
  }, [dynamicIslandEnabled]);

  // --- LumaCore 1.4 Zero-GPU Idle Saver (freezes all CSS animations & background polling while hidden/minimized) ---
  useEffect(() => {
    const syncIdle = () => {
      const hidden = typeof document !== 'undefined' && document.hidden;
      document.documentElement.dataset.lumaIdle = hidden ? 'true' : 'false';
      if (!hidden) {
        void pollSystemTelemetry();
        void pollHostWindows();
      }
    };
    syncIdle();
    document.addEventListener('visibilitychange', syncIdle);
    return () => {
      document.removeEventListener('visibilitychange', syncIdle);
      delete document.documentElement.dataset.lumaIdle;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      ? '8px'
      : glassIntensity === 'strong'
      ? '22px'
      : '12px';

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
      taskbarAutoHide,
      taskbarSize,
      taskbarSizePx,
      taskbarShowLabels,
      taskbarShowHostWindows,
      hostWinLabelMode,
      taskbarOrder,
      hostWinOrder,
      taskbarElementsOrder,
      taskbarHiddenElements,
      desktopTaskbarTools,
      taskbarCollapseSysFolder,
      taskbarShowTelemetry,
      taskbarShowClipboardBtn,
      taskbarShowFullscreenBtn,
      pinnedWirelessNames,
      strictFocusLock,
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
      islandAnchor,
      islandOffsetY,
      islandSize,
      islandStyle,
      islandOpacity,
      islandPinOverAllWindows,
      islandAlwaysOverLuma,
      islandShowInFullscreen,
      islandClickThrough,
      islandLocked,
      islandHoverExpand,
      islandShowClock,
      islandShowTelemetry,
      islandShowWeather,
      islandShowDownloads,
      islandShowNotifications,
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
    taskbarElementsOrder,
    taskbarHiddenElements,
    desktopTaskbarTools,
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
    taskbarAutoHide,
    taskbarSize,
    taskbarShowLabels,
    taskbarShowHostWindows,
    taskbarShowTelemetry,
    taskbarShowClipboardBtn,
    taskbarShowFullscreenBtn,
    pinnedWirelessNames,
    strictFocusLock,
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
    islandAnchor,
    islandOffsetY,
    islandSize,
    islandStyle,
    islandOpacity,
    islandPinOverAllWindows,
    islandAlwaysOverLuma,
    islandShowInFullscreen,
    islandClickThrough,
    islandLocked,
    islandHoverExpand,
    islandShowClock,
    islandShowTelemetry,
    islandShowWeather,
    islandShowDownloads,
    islandShowNotifications,
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
          if (st.designStyle === 'matrix' || st.designStyle === 'glass' || st.designStyle === 'nova') {
            setDesignStyle(st.designStyle);
          }
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
          if (Array.isArray(st.taskbarElementsOrder) && st.taskbarElementsOrder.length > 0) {
            const valid = st.taskbarElementsOrder.filter((x: string): x is TaskbarElementId =>
              DEFAULT_TASKBAR_ELEMENTS.includes(x as TaskbarElementId)
            );
            const missing = DEFAULT_TASKBAR_ELEMENTS.filter((x) => !valid.includes(x));
            setTaskbarElementsOrder([...valid, ...missing]);
          }
          if (Array.isArray(st.taskbarHiddenElements)) {
            setTaskbarHiddenElements(
              st.taskbarHiddenElements.filter((x: string): x is TaskbarElementId =>
                DEFAULT_TASKBAR_ELEMENTS.includes(x as TaskbarElementId)
              )
            );
          }
          if (Array.isArray(st.desktopTaskbarTools)) {
            setDesktopTaskbarTools(st.desktopTaskbarTools);
          }
          if (typeof st.taskbarCollapseSysFolder === 'boolean') setTaskbarCollapseSysFolder(st.taskbarCollapseSysFolder);
          if (typeof st.taskbarAutoHide === 'boolean') setTaskbarAutoHide(st.taskbarAutoHide);
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
      const nowMs = Date.now();
      if (nowMs - lastSpotlightToggleRef.current < 240) return;
      lastSpotlightToggleRef.current = nowMs;
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
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyN' || e.keyCode === 78 || keyLow === 'n' || keyLow === 'т')) {
        e.preventDefault();
        e.stopPropagation();
        setNotifShadeOpen((v) => !v);
        setControlCenterOpen(false);
        setCarbonHubOpen(false);
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyD' || e.keyCode === 68 || keyLow === 'd' || keyLow === 'в')) {
        e.preventDefault();
        e.stopPropagation();
        showDesktop();
        return;
      }
      if (e.key === 'Escape') {
        if (notifShadeOpen) setNotifShadeOpen(false);
        else if (rollbackConfirm) setRollbackConfirm(null);
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
    notifShadeOpen,
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

  // --- LumaCore 1.4 Zero-Idle-Render Tickers ---
  // 1) Root clock state ONLY updates when Settings -> Clock preview is visible (1s) or Adaptive Day/Night is enabled (30s).
  //    Taskbar clock uses isolated memoized <LumaTaskbarClock /> so App.tsx stays at 0 re-renders/min when idle!
  const clockPreviewActive = windows.settings.open && settingsTab === 'clock';
  useEffect(() => {
    if (!clockPreviewActive && !adaptiveThemeEnabled) return;
    setNow(new Date());
    const stepMs = clockPreviewActive ? 1000 : 30000;
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setNow(new Date());
    }, stepMs);
    return () => window.clearInterval(id);
  }, [clockPreviewActive, adaptiveThemeEnabled]);

  // 2) Active timers (Running App session clock + Island Timer/Stopwatch) ONLY run while active!
  const hasRunningApp = useMemo(() => apps.some((a) => a.isRunning), [apps]);
  useEffect(() => {
    if (!hasRunningApp && !islandTimerRunning && !islandStopwatchRunning) return;
    const id = window.setInterval(() => {
      if (hasRunningApp) {
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
      }
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
  }, [hasRunningApp, islandTimerRunning, islandStopwatchRunning]);

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

  // --- Poll REAL Host Telemetry & REAL Running Host OS Windows from LumaCore 1.4 (Zero-WMI Engine) ---
  const pollSystemTelemetry = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
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
      if (snap.active_kbd_short) setLiveKbdShort(snap.active_kbd_short);
      if (snap.active_kbd_tag) setLiveKbdTag(snap.active_kbd_tag);
      if (Array.isArray(snap.media?.sessions)) {
        setOsMediaSessions(snap.media.sessions);
      }
    } catch {
      setKernelConnected(false);
    }
  };

  // --- Adaptive Real-Time Keyboard Language Monitor (0ms Alt+Shift / Ctrl+Shift + 40ms Win32 push!) ---
  const kbdLayoutsRef = useRef<KeyboardLayoutsInfo | null>(null);
  kbdLayoutsRef.current = kbdLayouts;
  const liveKbdShortRef = useRef<string>('');
  liveKbdShortRef.current = liveKbdShort || kbdLayouts?.active?.short || 'RUS';

  const syncActiveKeyboardFast = async () => {
    try {
      const r = await fetch('/api/kernel/keyboard/active');
      if (!r.ok) return;
      const d = await r.json();
      if (d?.ok && d.short) {
        setLiveKbdShort(d.short);
        if (d.tag) setLiveKbdTag(d.tag);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void syncActiveKeyboardFast();
    let t1: number | null = null;
    let t2: number | null = null;
    let lastOptimisticAt = 0;

    const scheduleFastReconcile = () => {
      if (t1) window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
      t1 = window.setTimeout(() => void syncActiveKeyboardFast(), 32);
      t2 = window.setTimeout(() => void syncActiveKeyboardFast(), 130);
    };

    const optimisticCycleLayout = () => {
      const now = Date.now();
      if (now - lastOptimisticAt < 180) return;
      lastOptimisticAt = now;
      const installed = kbdLayoutsRef.current?.installed || [];
      const curShort = (liveKbdShortRef.current || 'RUS').toUpperCase();
      if (installed.length >= 2) {
        const idx = installed.findIndex((it) => it.short.toUpperCase() === curShort);
        const next = installed[(idx + 1 + installed.length) % installed.length];
        if (next?.short) {
          setLiveKbdShort(next.short);
          if (next.tag) setLiveKbdTag(next.tag);
          return;
        }
      }
      // Clean instant fallback between RUS <-> ENG until 32ms Win32 reconcile confirms exact tag
      setLiveKbdShort(curShort === 'RUS' ? 'ENG' : 'RUS');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const isAltShift = (e.altKey && e.key === 'Shift') || (e.shiftKey && e.key === 'Alt');
      const isCtrlShift = (e.ctrlKey && e.key === 'Shift') || (e.shiftKey && e.key === 'Control');
      const isWinSpace = e.metaKey && e.code === 'Space';
      if (isAltShift || isCtrlShift || isWinSpace) {
        optimisticCycleLayout();
        scheduleFastReconcile();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Alt' || e.key === 'Control' || e.key === 'Meta' || e.code === 'Space') {
        scheduleFastReconcile();
      }
    };
    const onNativeKbdChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<{ tag?: string; short?: string }>).detail;
      if (detail?.short) {
        setLiveKbdShort(detail.short);
        if (detail.tag) setLiveKbdTag(detail.tag);
      } else {
        void syncActiveKeyboardFast();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('focus', scheduleFastReconcile);
    window.addEventListener('luma-kbd-changed', onNativeKbdChanged as EventListener);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('focus', scheduleFastReconcile);
      window.removeEventListener('luma-kbd-changed', onNativeKbdChanged as EventListener);
      if (t1) window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
    };
  }, []);

  // ==================== LUMA OS 1.5 CARBON: TAB KEY CONTROL HUB & LIVE SCENARIO ENGINE ====================
  useEffect(() => {
    const onTabToggle = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase() || '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
      e.preventDefault();
      setCarbonHubOpen((v) => !v);
      setStartMenuOpen(false);
      setControlCenterOpen(false);
    };
    window.addEventListener('keydown', onTabToggle);
    return () => window.removeEventListener('keydown', onTabToggle);
  }, []);

  const executeScenarioRule = useCallback(
    (rule: LumaScenarioRule) => {
      // Check optional AND condition
      const cond = rule.conditionType || 'none';
      const hr = new Date().getHours();
      if (cond === 'only_on_battery' && liveSystem?.battery_charging) return;
      if (cond === 'only_on_ac' && !liveSystem?.battery_charging) return;
      if (cond === 'only_at_night' && hr >= 7 && hr < 21) return;
      if (cond === 'only_in_day' && (hr < 7 || hr >= 21)) return;
      if (cond === 'only_if_cpu_high' && (liveSystem?.cpu_percent || 0) <= 65) return;
      if (cond === 'only_if_dnd_off' && dndEnabled) return;

      const runStep = (actionType: LumaScenarioRule['actionType'], rawParam: string) => {
        const p = (rawParam || '').trim().toLowerCase();
        switch (actionType) {
          case 'set_dnd':
            setDndEnabled(p !== 'off' && p !== 'false');
            break;
          case 'set_theme':
            setThemeKey(p === 'light' ? 'nothing_paper' : 'nothing_mono');
            break;
          case 'set_night_light':
            setNightLightLevel(Math.max(0, Math.min(70, parseInt(p, 10) || 0)));
            break;
          case 'set_gaming_boost': {
            const on = p !== 'off' && p !== 'false';
            setGamingBoost(on);
            if (on) {
              setPowerProfile('performance');
              void fetch('/api/kernel/optimize', { method: 'POST' }).catch(() => {});
            }
            break;
          }
          case 'set_mic_mute':
            setMicMuted(p !== 'off' && p !== 'false');
            break;
          case 'set_brightness':
            setScreenBrightness(Math.max(30, Math.min(100, parseInt(p, 10) || 80)));
            break;
          case 'set_volume': {
            const vol = Math.max(0, Math.min(100, parseInt(p, 10) || 0));
            setVolume(vol);
            setIsMuted(vol === 0);
            void fetch('/api/kernel/audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ volume: vol, mute: vol === 0 }),
            }).catch(() => {});
            break;
          }
          case 'set_mouse_dpi': {
            const dpi = Math.max(200, Math.min(20000, parseInt(p, 10) || 1600));
            void fetch('/api/kernel/mouse/dpi', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target_effective_dpi: dpi }),
            }).catch(() => {});
            break;
          }
          case 'set_power_plan': {
            const plan: PowerProfile = p === 'performance' ? 'performance' : p === 'powersaver' || p === 'saver' ? 'saver' : 'balanced';
            setPowerProfile(plan);
            void fetch('/api/kernel/power-plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plan: plan === 'saver' ? 'powersaver' : plan }),
            }).catch(() => {});
            break;
          }
          case 'open_window': {
            const win = (p || 'settings') as DexWinId;
            if (INITIAL_WINDOWS[win]) openWindow(win);
            break;
          }
          case 'launch_pc_app':
            if (rawParam.trim()) {
              void fetch('/api/kernel/apps/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exec_path: rawParam.trim(), name: rawParam.trim() }),
              }).catch(() => {});
            }
            break;
          case 'open_url':
            if (rawParam.trim()) {
              const url = /^https?:\/\//i.test(rawParam.trim()) ? rawParam.trim() : `https://${rawParam.trim()}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }
            break;
          case 'run_terminal':
            if (rawParam.trim()) {
              void fetch('/api/kernel/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: rawParam.trim() }),
              }).catch(() => {});
            }
            break;
          case 'take_screenshot':
            void fetch('/api/kernel/capture/screenshot', { method: 'POST', body: '{}' }).catch(() => {});
            break;
          case 'start_recording':
            void fetch('/api/kernel/capture/native-record/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fps: 12, max_width: 1280, quality: 72 }),
            }).catch(() => {});
            break;
          case 'optimize_ram':
            void fetch('/api/kernel/optimize', { method: 'POST' }).catch(() => {});
            break;
          case 'toggle_island':
            setDynamicIslandEnabled(p !== 'off');
            break;
          case 'toggle_dual_bar':
            setDualTaskbarMode(p !== 'off');
            break;
          case 'lock_screen':
            void fetch('/api/kernel/power', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'lock' }) }).catch(() => {});
            break;
          case 'sleep_pc':
            void fetch('/api/kernel/power', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sleep' }) }).catch(() => {});
            break;
          case 'clean_trash':
            void fetch('/api/kernel/trash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'empty' }) }).catch(() => {});
            break;
          case 'notify':
          default:
            break;
        }
      };

      runStep(rule.actionType, rule.actionParam);
      if (Array.isArray(rule.extraActions)) {
        rule.extraActions.forEach((step, idx) => {
          window.setTimeout(() => runStep(step.actionType, step.actionParam), (idx + 1) * 140);
        });
      }

      const nowStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      setScenarios((prev) =>
        prev.map((s) => (s.id === rule.id ? { ...s, lastRunAt: nowStr, runCount: (s.runCount || 0) + 1 } : s))
      );
      pushToast('Сценарий выполнен', rule.actionType === 'notify' && rule.actionParam ? rule.actionParam : rule.name, 'success');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveSystem, dndEnabled]
  );

  // Automatic Scenario Triggers: Time HH:MM, Power State, Low Battery, High CPU/RAM/GPU, Vault Enter
  const prevChargingRef = useRef<boolean | null>(null);
  const lastMinuteFiredRef = useRef<string>('');
  const lowBattFiredRef = useRef<boolean>(false);
  const telemetryFiredAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!enabledFeatures.scenarios || !liveSystem) return;
    if (liveSystem.battery_present) {
      if (prevChargingRef.current !== null && prevChargingRef.current !== liveSystem.battery_charging) {
        const want = liveSystem.battery_charging ? 'power_ac' : 'power_battery';
        scenarios.filter((s) => s.enabled && s.triggerType === want).forEach((s) => executeScenarioRule(s));
      }
      prevChargingRef.current = liveSystem.battery_charging;
      if (!liveSystem.battery_charging && liveSystem.battery_percent > 0) {
        scenarios
          .filter((s) => s.enabled && s.triggerType === 'battery_low')
          .forEach((s) => {
            const thresh = parseInt(s.triggerParam, 10) || 25;
            if (liveSystem.battery_percent <= thresh && !lowBattFiredRef.current) {
              lowBattFiredRef.current = true;
              executeScenarioRule(s);
            }
          });
        if (liveSystem.battery_percent > 35) lowBattFiredRef.current = false;
      }
    }
    const nowMs = Date.now();
    scenarios
      .filter((s) => s.enabled && (s.triggerType === 'cpu_high' || s.triggerType === 'ram_high' || s.triggerType === 'gpu_hot'))
      .forEach((s) => {
        if (nowMs - (telemetryFiredAtRef.current[s.id] || 0) < 120_000) return;
        const thresh = parseInt(s.triggerParam, 10) || 85;
        const val =
          s.triggerType === 'cpu_high'
            ? liveSystem.cpu_percent || 0
            : s.triggerType === 'ram_high'
            ? liveSystem.ram_percent || 0
            : liveSystem.gpu_temp_c || 0;
        if (val >= thresh) {
          telemetryFiredAtRef.current[s.id] = nowMs;
          executeScenarioRule(s);
        }
      });
  }, [liveSystem, scenarios, enabledFeatures.scenarios, executeScenarioRule]);

  useEffect(() => {
    if (!enabledFeatures.scenarios) return;
    const id = window.setInterval(() => {
      const hhmm = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      if (lastMinuteFiredRef.current === hhmm) return;
      const due = scenarios.filter((s) => s.enabled && s.triggerType === 'time_at' && s.triggerParam.trim() === hhmm);
      if (due.length > 0) {
        lastMinuteFiredRef.current = hhmm;
        due.forEach((s) => executeScenarioRule(s));
      }
    }, 15000);
    return () => window.clearInterval(id);
  }, [scenarios, enabledFeatures.scenarios, executeScenarioRule]);

  useEffect(() => {
    if (!vaultOpen || !enabledFeatures.scenarios) return;
    scenarios.filter((s) => s.enabled && s.triggerType === 'vault_enter').forEach((s) => executeScenarioRule(s));
  }, [vaultOpen, scenarios, enabledFeatures.scenarios, executeScenarioRule]);

  // --- Lightweight 15-Second Host Windows Session Tracker (Tracks real open OS apps & checks daily limits!) ---
  const hostWindowsRef = useRef<HostWindowInfo[]>([]);
  hostWindowsRef.current = hostWindows;
  const hostLimitsRef = useRef<Record<string, number>>({});
  hostLimitsRef.current = hostLimitsMinutes;

  useEffect(() => {
    const id = window.setInterval(() => {
      const openWins = hostWindowsRef.current.filter((w) => !w.is_self);
      if (openWins.length === 0) return;
      const todayKey = new Date().toISOString().slice(0, 10);
      setHostUsageSeconds((prev) => {
        const next = { ...prev };
        const seen = new Set<string>();
        for (const hw of openWins) {
          const key = (hw.friendly_name || hw.name).trim().toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          const cur = next[key] || {
            name: hw.friendly_name || hw.name,
            seconds: 0,
            category: 'Windows',
            iconUrl: hw.icon_url,
          };
          const updatedSec = cur.seconds + 15;
          next[key] = { ...cur, seconds: updatedSec, iconUrl: hw.icon_url || cur.iconUrl };
          const limMin = hostLimitsRef.current[key] || 0;
          if (limMin > 0 && updatedSec >= limMin * 60 && !warnedLimitsRef.current.has(key)) {
            warnedLimitsRef.current.add(key);
            pushToast('Лимит времени достигнут', `${cur.name} — исчерпан дневной лимит (${limMin} мин)`, 'warning');
          }
        }
        try {
          localStorage.setItem('luma_tracker_host_usage_v2', JSON.stringify({ date: todayKey, items: next }));
        } catch {
          /* ignore */
        }
        const totalMin = Math.round(Object.values(next).reduce((a, b) => a + b.seconds, 0) / 60);
        setDailyHistoryMinutes((hist) => {
          const updated = { ...hist, [todayKey]: Math.max(hist[todayKey] || 0, totalMin) };
          try {
            localStorage.setItem('luma_tracker_history_7d_v2', JSON.stringify(updated));
          } catch {
            /* ignore */
          }
          return updated;
        });
        return next;
      });
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const togglePinWirelessDevice = (dev: WirelessBatteryInfo) => {
    setPinnedWirelessNames((prev) => {
      const exists = prev.includes(dev.name);
      const next = exists ? prev.filter((n) => n !== dev.name) : [...prev, dev.name];
      try {
        localStorage.setItem('luma_pinned_wireless_v1', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      pushToast(
        'Панель задач',
        exists ? `«${dev.name}» убрано с панели задач` : `«${dev.name}» (${dev.battery_percent}%) закреплено на панели задач`,
        exists ? 'info' : 'success'
      );
      return next;
    });
  };

  const pollHostWindows = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const r = await fetch('/api/kernel/windows');
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d?.windows)) {
        setHostWindows(d.windows);
        setWindowMruMap((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const hw of d.windows as HostWindowInfo[]) {
            if (hw.mru && hw.mru > 0) {
              const k = `host_${hw.pid}`;
              if (!next[k] || hw.mru > next[k]) {
                next[k] = hw.mru;
                changed = true;
              }
            }
          }
          return changed ? next : prev;
        });
      }
    } catch {
      // ignore offline
    }
  };

  const fetchHostWindowPreviews = useCallback(async () => {
    try {
      const r = await fetch('/api/kernel/windows/previews');
      if (!r.ok) return;
      const d = await r.json();
      if (d?.previews && typeof d.previews === 'object') {
        const mapped: Record<number, string> = {};
        for (const [pidStr, dataUrl] of Object.entries(d.previews as Record<string, string>)) {
          const p = Number(pidStr);
          if (p > 0 && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
            mapped[p] = dataUrl;
          }
        }
        setHostWindowPreviews((prev) => ({ ...prev, ...mapped }));
      }
    } catch {
      // ignore offline
    }
  }, []);

  const handleFocusHostWindow = async (pid: number, hwnd?: number) => {
    setTaskbarHostWinPid(null);
    setTaskListOpen(false);
    touchWindowMru(`host_${pid}`);
    try {
      await fetch('/api/kernel/windows/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid, hwnd: hwnd || 0 }),
      });
    } catch {
      // silent window switching — no intrusive toast
    }
  };

  const handleSnapHostWindow = async (pid: number, zone: 'left' | 'right' | 'maximize') => {
    setTaskbarHostWinPid(null);
    setTaskListOpen(false);
    try {
      const r = await fetch('/api/kernel/windows/snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pid,
          zone,
          taskbar_pos: taskbarPosition,
          taskbar_px: taskbarAutoHide ? 0 : taskbarSizePx,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const win = hostWindows.find((w) => w.pid === pid);
        const zoneRu = zone === 'left' ? 'влево (50%)' : zone === 'right' ? 'вправо (50%)' : 'на весь экран';
        if (d?.ok) {
          pushToast('Окна ОС', `${win?.friendly_name || win?.name || `PID ${pid}`} закреплено ${zoneRu}`, 'success');
        } else {
          pushToast('Окна ОС', d?.error || 'Не удалось разместить окно', 'warning');
        }
      }
    } catch {
      pushToast('Окна ОС', 'Доступно при запуске LumaOS_1.6.2.exe', 'info');
    }
  };

  const handleSplitTwoHostWindows = async (leftPid: number, rightPid: number) => {
    if (!leftPid || !rightPid || leftPid === rightPid) {
      pushToast('Два окна рядом', 'Выберите два разных открытых окна Windows', 'warning');
      return;
    }
    setTaskbarHostWinPid(null);
    setTaskListOpen(false);
    setMultitaskingOpen(false);
    try {
      const r = await fetch('/api/kernel/windows/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          left_pid: leftPid,
          right_pid: rightPid,
          taskbar_pos: taskbarPosition,
          taskbar_px: taskbarAutoHide ? 0 : taskbarSizePx,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.ok) {
          const wL = hostWindows.find((w) => w.pid === leftPid);
          const wR = hostWindows.find((w) => w.pid === rightPid);
          pushToast(
            '2 окна рядом (50/50)',
            `${wL?.friendly_name || wL?.name || leftPid}  |  ${wR?.friendly_name || wR?.name || rightPid}`,
            'success'
          );
        } else {
          pushToast('2 окна рядом', d?.error || 'Не удалось разместить окна', 'warning');
        }
      }
    } catch {
      pushToast('2 окна рядом', 'Доступно при запуске LumaOS_1.6.2.exe', 'info');
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

  // --- Dynamic Island 2.0 Reactive Pulse + Elastic Rubber-Band Notification Animation + Native Win32 Overlay Sync (1.6.7) ---
  const triggerIslandPulse = useCallback((title: string, detail?: string, kind = 'info', barPct?: number) => {
    const isNotif =
      kind === 'notification' ||
      kind === 'telegram' ||
      kind === 'discord' ||
      kind === 'whatsapp' ||
      kind === 'messenger' ||
      kind === 'system';

    if (isNotif && !islandShowNotifications) return;

    if (islandPulseTimerRef.current) window.clearTimeout(islandPulseTimerRef.current);
    if (islandRubberSnapRef.current) window.clearTimeout(islandRubberSnapRef.current);

    setIslandPulse({ id: Date.now() + Math.random(), title, detail, kind, barPct });
    setIslandRubberPhase(isNotif ? 'expand' : 'idle');

    // Mirror pulse onto the native Win32 HWND_TOPMOST Dynamic Island capsule floating over Chrome/Windows!
    if (dynamicIslandEnabled && islandPinOverAllWindows) {
      fetch('/api/kernel/island/overlay/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          detail: detail || '',
          kind,
          bar_pct: typeof barPct === 'number' ? Math.round(barPct) : undefined,
          duration_ms: isNotif ? 3200 : 2500,
        }),
      }).catch(() => {});
    }

    if (isNotif) {
      // Elastic rubber-band expand -> hold briefly so message is readable -> snap back tightly!
      islandRubberSnapRef.current = window.setTimeout(() => {
        setIslandRubberPhase('snap');
        islandPulseTimerRef.current = window.setTimeout(() => {
          setIslandPulse(null);
          setIslandRubberPhase('idle');
          islandPulseTimerRef.current = null;
        }, 420);
      }, 2200);
    } else {
      islandPulseTimerRef.current = window.setTimeout(() => {
        setIslandPulse(null);
        setIslandRubberPhase('idle');
        islandPulseTimerRef.current = null;
      }, 2400);
    }
  }, [dynamicIslandEnabled, islandPinOverAllWindows, islandShowNotifications]);

  const dndEnabledNotifRef = useRef(dndEnabled);
  const isMutedNotifRef = useRef(isMuted);
  const triggerIslandPulseNotifRef = useRef(triggerIslandPulse);
  dndEnabledNotifRef.current = dndEnabled;
  isMutedNotifRef.current = isMuted;
  triggerIslandPulseNotifRef.current = triggerIslandPulse;

  // --- Clean Zero-Spam Messenger Notification Poller (1.5.4: WHO, WHAT & WHEN — No Muted Channel "+4"!) ---
  useEffect(() => {
    let active = true;
    const playIncomingChime = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        g.connect(ctx.destination);
        const o1 = ctx.createOscillator();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(660, now);
        o1.frequency.setValueAtTime(880, now + 0.09);
        o1.connect(g);
        o1.start(now);
        o1.stop(now + 0.39);
        window.setTimeout(() => void ctx.close().catch(() => {}), 500);
      } catch {
        /* ignore autoplay guard */
      }
    };

    const mapAppKeyToSource = (key: string): CarbonNotificationItem['source'] => {
      const k = (key || '').toLowerCase();
      if (k === 'telegram') return 'telegram';
      if (k === 'discord') return 'discord';
      if (k === 'whatsapp' || k === 'viber') return 'whatsapp';
      if (k === 'browser' || k === 'vk') return 'browser';
      return 'system';
    };

    const pollOsNotifications = async () => {
      try {
        const since = osNotifSinceRef.current;
        const querySince = since > 4000 ? since - 4000 : 0;
        const r = await fetch(`/api/kernel/notifications/os${querySince > 0 ? `?since=${querySince}` : ''}`);
        if (!r.ok || !active) return;
        const d = await r.json();
        const list = Array.isArray(d?.notifications) ? d.notifications : [];
        if (list.length === 0) {
          osNotifBootedRef.current = true;
          return;
        }

        const fresh: ShadeNotificationItem[] = [];
        let maxCursor = since;
        for (const item of list) {
          const id = String(item.id || '');
          if (!id || seenOsNotifIdsRef.current.has(id)) continue;
          seenOsNotifIdsRef.current.add(id);
          const ts = Number(item.timestamp || 0) || Date.now();
          const delivered = Number(item.delivered_at || 0) || ts;
          if (delivered > maxCursor) maxCursor = delivered;
          fresh.push({
            id,
            source: mapAppKeyToSource(item.app_key || item.app || ''),
            appName: item.app || undefined,
            sender: item.sender || item.title || item.app || 'Сообщение',
            chat: item.chat || undefined,
            title: item.title || item.app || 'Новое сообщение',
            body: item.body || '',
            time: item.time || new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            dateLabel: item.date_label || 'Сегодня',
            timestamp: ts,
            avatarUrl: item.avatar_url || undefined,
            unread: true,
          });
        }
        if (maxCursor > osNotifSinceRef.current) osNotifSinceRef.current = maxCursor;

        const wasBooted = osNotifBootedRef.current;
        osNotifBootedRef.current = true;

        if (fresh.length > 0 && active) {
          setHubNotifications((prev) => [...fresh, ...prev].slice(0, 120));
          const latest = fresh[0];
          const isBrandNew = wasBooted || Date.now() - maxCursor < 30000;
          if (!dndEnabledNotifRef.current && isBrandNew) {
            // 1. Elastic rubber-band Dynamic Island alert
            triggerIslandPulseNotifRef.current(
              latest.chat && latest.chat !== latest.sender ? `${latest.sender} → ${latest.chat}` : latest.sender,
              latest.body || latest.title || 'Новое сообщение',
              latest.source
            );
            // 2. Crisp floating incoming messenger card
            setIncomingBanner(latest);
            if (incomingBannerTimerRef.current) window.clearTimeout(incomingBannerTimerRef.current);
            incomingBannerTimerRef.current = window.setTimeout(() => {
              setIncomingBanner(null);
              incomingBannerTimerRef.current = null;
            }, 6500);
            // 3. Soft notification chime
            if (!isMutedNotifRef.current) playIncomingChime();
          }
        }
      } catch {
        // kernel offline / standalone preview
      }
    };

    void pollOsNotifications();
    const timer = window.setInterval(() => {
      void pollOsNotifications();
    }, 900);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  // --- Custom Widget Pro System Actions Bridge (1.5.2) ---
  useEffect(() => {
    const onCustomAction = (e: Event) => {
      const action = (e as CustomEvent<{ action?: string }>).detail?.action;
      if (action === 'toggle_gaming') {
        setGamingBoost((v) => !v);
        setPowerProfile('performance');
      } else if (action === 'open_hub') {
        setCarbonHubOpen((v) => !v);
      } else if (action === 'open_vault') {
        setVaultOpen(true);
      } else if (action === 'open_spotlight') {
        setSpotlightOpen(true);
      }
    };
    window.addEventListener('luma-custom-sys-action', onCustomAction);
    return () => window.removeEventListener('luma-custom-sys-action', onCustomAction);
  }, []);

  // --- Luma OS 1.6.2 Nitrogen Helpers: Always-on-Top, Admin UAC Elevate, Luma Peek & Win Key Toggle ---
  const designStyleRef = useRef<DesignStyle>(designStyle);
  designStyleRef.current = designStyle;

  const getWinZ = useCallback(
    (id: DexWinId) => {
      const w = windows[id];
      if (!w) return 20;
      return w.alwaysOnTop ? 6500 + (w.z || 20) : w.z || 20;
    },
    [windows]
  );

  const lastLumaTopmostRef = useRef<boolean>(false);

  // Real Win32 HWND_TOPMOST sync: when ANY Luma OS window (e.g. Settings) is pinned (📌),
  // keep the Luma OS window genuinely above Chrome and all other Windows apps!
  useEffect(() => {
    const hasPinnedLumaWindow = Object.values(windows).some(
      (w) => w.open && !w.minimized && Boolean(w.alwaysOnTop)
    );
    if (hasPinnedLumaWindow === lastLumaTopmostRef.current) return;
    lastLumaTopmostRef.current = hasPinnedLumaWindow;
    void fetch('/api/kernel/window/luma-topmost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: hasPinnedLumaWindow }),
    }).catch(() => {});
  }, [windows]);

  const toggleWindowAlwaysOnTop = useCallback(
    (id: DexWinId) => {
      setWindows((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        const nextPin = !cur.alwaysOnTop;
        pushToast(
          nextPin ? '📌 Поверх всех окон (и поверх Chrome)' : 'Окно откреплено',
          nextPin
            ? 'Окно закреплено поверх Chrome и всех внешних приложений Windows (Win32 HWND_TOPMOST)'
            : 'Возвращён обычный порядок перекрытия окон',
          'info'
        );
        return { ...prev, [id]: { ...cur, alwaysOnTop: nextPin } };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleToggleHostTopmost = useCallback(
    async (pid: number, hwnd?: number) => {
      try {
        const r = await fetch('/api/kernel/windows/topmost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pid, hwnd: hwnd || 0, toggle: true }),
        });
        if (r.ok) {
          const d = await r.json();
          pushToast(
            d.topmost ? '📌 Поверх всех окон (Windows)' : 'Окно Windows откреплено',
            d.message || (d.topmost ? `PID ${pid} закреплён поверх всех окон` : `PID ${pid} возвращён в обычный слой`),
            d.ok ? 'success' : 'warning'
          );
          void pollHostWindows();
        }
      } catch {
        pushToast('Поверх всех окон', 'Требуется запущенное ядро LumaCore 1.6.2', 'warning');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleElevateAdmin = useCallback(async () => {
    try {
      const r = await fetch('/api/kernel/admin/elevate', { method: 'POST' });
      const d = await r.json();
      pushToast(
        'Режим Администратора (UAC)',
        d.message || (d.ok ? 'Запрошен перезапуск от имени Администратора' : d.error || 'Не удалось повысить права'),
        d.ok ? 'success' : 'warning'
      );
    } catch {
      pushToast('Режим Администратора', 'Ядро LumaCore недоступно', 'warning');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleWinKeyToLuma = useCallback(async (next: boolean) => {
    setWinKeyToLuma(next);
    try {
      await fetch('/api/kernel/win-key/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      pushToast(
        'Клавиша Win',
        next ? 'Клавиша Win теперь открывает меню Luma OS (Win+D/L/Shift+S сохранены)' : 'Возвращено стандартное меню Windows Start',
        'info'
      );
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openQuickLook = useCallback((items: QuickLookCandidate[], index: number) => {
    if (!items || items.length === 0) return;
    setQuickLookState({
      open: true,
      items,
      index: Math.max(0, Math.min(index, items.length - 1)),
    });
  }, []);

  // Listen for Win key solo-tap (Item 11), Ctrl+Shift+D Dev HUD (Item 2), and luma-ai-ask (Item 6)
  useEffect(() => {
    const onWinStart = () => {
      setSpotlightOpen(false);
      setControlCenterOpen(false);
      setCarbonHubOpen(false);
      if (designStyleRef.current === 'nova') {
        setStartMenuOpen(false);
        setNovaPanelOpen((v) => !v);
      } else {
        setNovaPanelOpen(false);
        setStartMenuOpen((v) => !v);
      }
    };
    const onAiAskOpen = () => {
      openWindow('ai');
    };
    const onGlobalDevShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setDevModeEnabled((v) => !v);
      } else if ((e.ctrlKey && e.shiftKey && e.code === 'KeyL') || (e.altKey && e.shiftKey && e.code === 'KeyS')) {
        e.preventDefault();
        setLensSearchOpen(true);
      }
    };
    const onOpenLensEvent = () => {
      setLensSearchOpen(true);
    };
    const onAiAgentActions = (ev: Event) => {
      const list = (ev as CustomEvent<{ type: string; target?: string; value?: unknown; label?: string }[]>).detail;
      if (!Array.isArray(list) || list.length === 0) return;
      for (const act of list) {
        switch (act.type) {
          case 'open_window':
            if (act.target) openWindow(act.target as DexWinId);
            break;
          case 'set_style':
            if (act.value === 'nova' || act.value === 'glass' || act.value === 'matrix') {
              setDesignStyle(act.value);
              if (act.value === 'nova') setStartMenuOpen(false);
              else setNovaPanelOpen(false);
            }
            break;
          case 'set_theme':
            setThemeKey(act.value === 'light' ? 'nothing_paper' : 'nothing_mono');
            break;
          case 'set_wallpaper':
            if (typeof act.value === 'string') setWallpaperImageUrl(act.value);
            break;
          case 'set_volume':
            if (typeof act.value === 'number') {
              setVolume(act.value);
              setIsMuted(act.value === 0);
            }
            break;
          case 'set_brightness':
            if (typeof act.value === 'number') setScreenBrightness(act.value);
            break;
          case 'toggle_dev_hud':
            setDevModeEnabled(Boolean(act.value));
            break;
          case 'switch_desktop':
            if (typeof act.value === 'number' && act.value >= 1 && act.value <= 4) {
              setActiveDesktop(act.value);
            }
            break;
          case 'start_timer':
            if (typeof act.value === 'number' && act.value > 0) {
              setIslandTimerTotalSec(act.value);
              setIslandTimerRemainingSec(act.value);
              setIslandTimerRunning(true);
            }
            break;
          case 'take_screenshot':
            void fetch('/api/kernel/capture/screenshot', { method: 'POST' })
              .then(() => pushToast('Luma Ai Nitrogen', 'Снимок экрана сохранён', 'success'))
              .catch(() => {});
            break;
          case 'open_lens_search':
            setLensSearchOpen(true);
            break;
          case 'refresh_trash':
            window.dispatchEvent(new Event('luma-trash-updated'));
            break;
          case 'refresh_calendar':
            window.dispatchEvent(new Event('luma-calendar-updated'));
            break;
          default:
            break;
        }
      }
    };
    window.addEventListener('luma-win-start', onWinStart);
    window.addEventListener('luma-ai-ask', onAiAskOpen);
    window.addEventListener('luma-open-lens', onOpenLensEvent);
    window.addEventListener('luma-ai-agent-actions', onAiAgentActions);
    window.addEventListener('keydown', onGlobalDevShortcut);
    return () => {
      window.removeEventListener('luma-win-start', onWinStart);
      window.removeEventListener('luma-ai-ask', onAiAskOpen);
      window.removeEventListener('luma-open-lens', onOpenLensEvent);
      window.removeEventListener('luma-ai-agent-actions', onAiAgentActions);
      window.removeEventListener('keydown', onGlobalDevShortcut);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Luma OS 1.6.2 Global Gesture Engine (3/4-Finger Touchpad/Touch + Alt+RMB Mouse Gestures) ---
  const executeGestureAction = useCallback((action: LumaGestureAction, sourceLabel?: string) => {
    if (!action || action === 'none') return;
    switch (action) {
      case 'screenshot':
        void fetch('/api/kernel/capture/screenshot', { method: 'POST' })
          .then((r) => r.json())
          .then((d) => {
            const msg = d?.file?.name ? `Скриншот сохранён: ${d.file.name}` : 'Снимок экрана сохранён в LumaCaptures';
            pushToast(sourceLabel || 'Жест · Скриншот', msg, 'success');
            triggerIslandPulse('Скриншот', msg, 'info');
          })
          .catch(() => {
            pushToast(sourceLabel || 'Жест · Скриншот', 'Снимок экрана выполнен', 'info');
          });
        break;
      case 'lens_search':
        setLensSearchOpen(true);
        break;
      case 'alt_tab':
        setMultitaskingOpen((v) => !v);
        break;
      case 'show_desktop':
        setWindows((prev) => {
          const next = { ...prev };
          (Object.keys(next) as DexWinId[]).forEach((k) => {
            if (next[k].open) next[k] = { ...next[k], minimized: true };
          });
          return next;
        });
        pushToast(sourceLabel || 'Жест', 'Показан рабочий стол', 'info');
        break;
      case 'prev_desktop':
        setActiveDesktop((d) => (d <= 1 ? 4 : d - 1));
        break;
      case 'next_desktop':
        setActiveDesktop((d) => (d >= 4 ? 1 : d + 1));
        break;
      case 'control_center':
        setCarbonHubOpen((v) => !v);
        break;
      case 'ai_assistant':
        openWindow('ai');
        break;
      case 'spotlight':
        setSpotlightOpen(true);
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gestureConfigRef = useRef(gestureConfig);
  const executeGestureRef = useRef(executeGestureAction);
  gestureConfigRef.current = gestureConfig;
  executeGestureRef.current = executeGestureAction;

  useEffect(() => {
    // 1. Native Win32 Precision Touchpad HID Bridge (dispatched by LumaCore 1.6.2 WM_INPUT + SSE fallback)
    let lastNativeFireAt = 0;
    let lastNativeKey = '';
    const dispatchMappedGesture = (gestureName: string, sourceTag: string) => {
      const cfg = gestureConfigRef.current;
      if (!cfg.enabled) return;
      const now = Date.now();
      if (gestureName === lastNativeKey && now - lastNativeFireAt < 260) return;
      lastNativeFireAt = now;
      lastNativeKey = gestureName;

      const labelMap: Record<string, { action: LumaGestureAction; label: string }> = {
        three_fingers_down: { action: cfg.threeFingersDown, label: `${sourceTag}: 3 пальца вниз` },
        three_fingers_up: { action: cfg.threeFingersUp, label: `${sourceTag}: 3 пальца вверх` },
        three_fingers_left: { action: cfg.threeFingersLeft, label: `${sourceTag}: 3 пальца влево` },
        three_fingers_right: { action: cfg.threeFingersRight, label: `${sourceTag}: 3 пальца вправо` },
        four_fingers_down: { action: cfg.fourFingersDown, label: `${sourceTag}: 4 пальца вниз` },
        three_fingers_tap: { action: cfg.circleOrThreeTap, label: `${sourceTag}: 3 пальца тап` },
      };
      const mapped = labelMap[gestureName];
      if (!mapped || mapped.action === 'none') return;
      triggerIslandPulse('Жест', mapped.label, 'info');
      executeGestureRef.current(mapped.action, mapped.label);
    };

    const onNativeGestureEvent = (ev: Event) => {
      const detail = (ev as CustomEvent<{ gesture?: string; source?: string }>).detail;
      if (detail?.gesture) {
        dispatchMappedGesture(detail.gesture, 'Тачпад HID');
      }
    };
    window.addEventListener('luma-native-gesture', onNativeGestureEvent);

    let gestureSse: EventSource | null = null;
    try {
      gestureSse = new EventSource('/api/kernel/gestures/events');
      gestureSse.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.gesture) {
            dispatchMappedGesture(String(payload.gesture), 'Тачпад HID');
          }
        } catch {
          /* ignore malformed SSE frame */
        }
      };
    } catch {
      gestureSse = null;
    }

    // 2. Per-Finger Multi-Touch Engine (TouchEvent + PointerEvent pointerType==='touch')
    // Eliminates centroid jump when fingers lift 10-40ms apart!
    interface TrackedFinger {
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
    }
    const activeFingers = new Map<number, TrackedFinger>();
    const finishedFingers: TrackedFinger[] = [];
    let peakFingers = 0;
    let gestureStartAt = 0;
    let multiTouchHandledByTouchEvents = false;

    const finalizeFingerGesture = (sourceTag: string) => {
      if (peakFingers < 3) {
        peakFingers = 0;
        finishedFingers.length = 0;
        return;
      }
      const samples = finishedFingers.length > 0 ? finishedFingers.slice() : Array.from(activeFingers.values());
      const fingers = peakFingers;
      const dt = Date.now() - gestureStartAt;
      peakFingers = 0;
      finishedFingers.length = 0;
      if (samples.length === 0) return;

      let sumDx = 0;
      let sumDy = 0;
      for (const f of samples) {
        sumDx += f.lastX - f.startX;
        sumDy += f.lastY - f.startY;
      }
      const dx = sumDx / samples.length;
      const dy = sumDy / samples.length;
      const dist = Math.hypot(dx, dy);

      if (dist < 26 && dt < 380 && fingers === 3) {
        dispatchMappedGesture('three_fingers_tap', sourceTag);
        return;
      }
      if (dist < 42) return;
      if (fingers >= 4 && dy > 48 && Math.abs(dy) > Math.abs(dx)) {
        dispatchMappedGesture('four_fingers_down', sourceTag);
      } else if (Math.abs(dy) >= Math.abs(dx)) {
        dispatchMappedGesture(dy > 0 ? 'three_fingers_down' : 'three_fingers_up', sourceTag);
      } else {
        dispatchMappedGesture(dx < 0 ? 'three_fingers_left' : 'three_fingers_right', sourceTag);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!gestureConfigRef.current.enabled) return;
      multiTouchHandledByTouchEvents = true;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        activeFingers.set(t.identifier, {
          startX: t.clientX,
          startY: t.clientY,
          lastX: t.clientX,
          lastY: t.clientY,
        });
      }
      if (activeFingers.size > peakFingers) {
        if (peakFingers < 3 && activeFingers.size >= 3) {
          gestureStartAt = Date.now();
          // Re-anchor start coordinates when 3rd finger lands to avoid pre-gesture drift
          activeFingers.forEach((f) => {
            f.startX = f.lastX;
            f.startY = f.lastY;
          });
          finishedFingers.length = 0;
        }
        peakFingers = activeFingers.size;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (activeFingers.size === 0) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const rec = activeFingers.get(t.identifier);
        if (rec) {
          rec.lastX = t.clientX;
          rec.lastY = t.clientY;
        }
      }
    };

    const onTouchEndOrCancel = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const rec = activeFingers.get(t.identifier);
        if (rec) {
          rec.lastX = t.clientX;
          rec.lastY = t.clientY;
          if (peakFingers >= 3) finishedFingers.push({ ...rec });
          activeFingers.delete(t.identifier);
        }
      }
      if (activeFingers.size === 0 && peakFingers >= 3) {
        finalizeFingerGesture('Сенсор');
      } else if (activeFingers.size === 0) {
        peakFingers = 0;
        finishedFingers.length = 0;
      }
    };

    // PointerEvent touch fallback (WebView2 / Windows Precision Touch screens that dispatch PointerEvents)
    const ptrFingers = new Map<number, TrackedFinger>();
    const ptrFinished: TrackedFinger[] = [];
    let ptrPeak = 0;
    let ptrStartAt = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || multiTouchHandledByTouchEvents) return;
      if (!gestureConfigRef.current.enabled) return;
      ptrFingers.set(e.pointerId, { startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY });
      if (ptrFingers.size > ptrPeak) {
        if (ptrPeak < 3 && ptrFingers.size >= 3) {
          ptrStartAt = Date.now();
          ptrFingers.forEach((f) => {
            f.startX = f.lastX;
            f.startY = f.lastY;
          });
          ptrFinished.length = 0;
        }
        ptrPeak = ptrFingers.size;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || multiTouchHandledByTouchEvents) return;
      const rec = ptrFingers.get(e.pointerId);
      if (rec) {
        rec.lastX = e.clientX;
        rec.lastY = e.clientY;
      }
    };

    const onPointerUpOrCancel = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || multiTouchHandledByTouchEvents) return;
      const rec = ptrFingers.get(e.pointerId);
      if (rec) {
        rec.lastX = e.clientX;
        rec.lastY = e.clientY;
        if (ptrPeak >= 3) ptrFinished.push({ ...rec });
        ptrFingers.delete(e.pointerId);
      }
      if (ptrFingers.size === 0 && ptrPeak >= 3) {
        const samples = ptrFinished.slice();
        const fingers = ptrPeak;
        const dt = Date.now() - ptrStartAt;
        ptrPeak = 0;
        ptrFinished.length = 0;
        if (samples.length > 0) {
          const dx = samples.reduce((s, f) => s + (f.lastX - f.startX), 0) / samples.length;
          const dy = samples.reduce((s, f) => s + (f.lastY - f.startY), 0) / samples.length;
          const dist = Math.hypot(dx, dy);
          if (dist < 26 && dt < 380 && fingers === 3) {
            dispatchMappedGesture('three_fingers_tap', 'Сенсор');
          } else if (dist >= 42) {
            if (fingers >= 4 && dy > 48 && Math.abs(dy) > Math.abs(dx)) {
              dispatchMappedGesture('four_fingers_down', 'Сенсор');
            } else if (Math.abs(dy) >= Math.abs(dx)) {
              dispatchMappedGesture(dy > 0 ? 'three_fingers_down' : 'three_fingers_up', 'Сенсор');
            } else {
              dispatchMappedGesture(dx < 0 ? 'three_fingers_left' : 'three_fingers_right', 'Сенсор');
            }
          }
        }
      } else if (ptrFingers.size === 0) {
        ptrPeak = 0;
        ptrFinished.length = 0;
      }
    };

    // 3. Mouse Gestures for Desktop PCs without touchpads: Hold Alt + Right Mouse Button and swipe or draw a circle!
    let mouseActive = false;
    let mousePoints: { x: number; y: number }[] = [];
    let suppressNextContextMenu = false;

    const onMouseDown = (e: MouseEvent) => {
      const cfg = gestureConfigRef.current;
      if (!cfg.enabled || !cfg.mouseGesturesEnabled) return;
      if (e.button === 2 && e.altKey) {
        mouseActive = true;
        mousePoints = [{ x: e.clientX, y: e.clientY }];
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!mouseActive) return;
      const last = mousePoints[mousePoints.length - 1];
      if (!last || Math.hypot(e.clientX - last.x, e.clientY - last.y) >= 8) {
        mousePoints.push({ x: e.clientX, y: e.clientY });
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!mouseActive || e.button !== 2) return;
      mouseActive = false;
      const pts = mousePoints;
      mousePoints = [];
      const cfg = gestureConfigRef.current;
      if (!cfg.enabled || pts.length < 3) return;
      const p0 = pts[0];
      const pEnd = pts[pts.length - 1];
      let pathLen = 0;
      let minX = p0.x, maxX = p0.x, minY = p0.y, maxY = p0.y;
      for (let i = 1; i < pts.length; i++) {
        pathLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (pts[i].x < minX) minX = pts[i].x;
        if (pts[i].x > maxX) maxX = pts[i].x;
        if (pts[i].y < minY) minY = pts[i].y;
        if (pts[i].y > maxY) maxY = pts[i].y;
      }
      const dx = pEnd.x - p0.x;
      const dy = pEnd.y - p0.y;
      const directDist = Math.hypot(dx, dy);
      if (pathLen < 60) return;

      suppressNextContextMenu = true;
      window.setTimeout(() => {
        suppressNextContextMenu = false;
      }, 250);

      // Closed loop / circle gesture -> Luma Обвести для поиска!
      const boxW = maxX - minX;
      const boxH = maxY - minY;
      if (pathLen > 160 && boxW > 45 && boxH > 45 && directDist < pathLen * 0.42) {
        executeGestureRef.current(cfg.circleOrThreeTap, 'Жест мышью: Круг');
        return;
      }
      if (Math.abs(dy) >= Math.abs(dx)) {
        if (dy > 0) executeGestureRef.current(cfg.threeFingersDown, 'Жест мышью: Вниз');
        else executeGestureRef.current(cfg.threeFingersUp, 'Жест мышью: Вверх');
      } else if (dx < 0) {
        executeGestureRef.current(cfg.threeFingersLeft, 'Жест мышью: Влево');
      } else {
        executeGestureRef.current(cfg.threeFingersRight, 'Жест мышью: Вправо');
      }
    };

    const onContextMenuGuard = (e: MouseEvent) => {
      if (suppressNextContextMenu) {
        e.preventDefault();
        e.stopPropagation();
        suppressNextContextMenu = false;
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEndOrCancel, { passive: true });
    window.addEventListener('touchcancel', onTouchEndOrCancel, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUpOrCancel, { passive: true });
    window.addEventListener('pointercancel', onPointerUpOrCancel, { passive: true });
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('contextmenu', onContextMenuGuard, true);
    return () => {
      window.removeEventListener('luma-native-gesture', onNativeGestureEvent);
      if (gestureSse) {
        try { gestureSse.close(); } catch { /* ignore */ }
      }
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEndOrCancel);
      window.removeEventListener('touchcancel', onTouchEndOrCancel);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUpOrCancel);
      window.removeEventListener('pointercancel', onPointerUpOrCancel);
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mousemove', onMouseMove, true);
      window.removeEventListener('mouseup', onMouseUp, true);
      window.removeEventListener('contextmenu', onContextMenuGuard, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Luma OS 1.6.7: Auto-Hide Visual Noise (dissolves bars/panels after 2.6s cursor idle in video/fullscreen) ---
  useEffect(() => {
    const anyMenuOpen =
      startMenuOpen ||
      controlCenterOpen ||
      carbonHubOpen ||
      notifShadeOpen ||
      sysFolderOpen ||
      novaPanelOpen ||
      spotlightOpen ||
      multitaskingOpen;
    const shouldImmerse = autoHideNoiseEnabled && (isFullscreen || mediaVideoPlaying) && !anyMenuOpen;
    if (!shouldImmerse) {
      setVisualNoiseHidden(false);
      return;
    }

    let idleTimer: number | null = null;
    const armIdleTimer = (clientX?: number, clientY?: number) => {
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      setVisualNoiseHidden(false);
      // Do not hide while cursor rests directly on top/bottom/side reveal zone
      const nearEdge =
        clientY !== undefined &&
        clientX !== undefined &&
        (clientY < 54 ||
          clientY > window.innerHeight - 62 ||
          clientX < 42 ||
          clientX > window.innerWidth - 42);
      if (nearEdge) return;
      idleTimer = window.setTimeout(() => {
        setVisualNoiseHidden(true);
      }, 2600);
    };

    const onPointerActivity = (e: PointerEvent) => armIdleTimer(e.clientX, e.clientY);
    const onKeyActivity = () => armIdleTimer();
    armIdleTimer();

    window.addEventListener('pointermove', onPointerActivity, { passive: true });
    window.addEventListener('pointerdown', onPointerActivity, { passive: true });
    window.addEventListener('keydown', onKeyActivity, { passive: true });
    return () => {
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      window.removeEventListener('pointermove', onPointerActivity);
      window.removeEventListener('pointerdown', onPointerActivity);
      window.removeEventListener('keydown', onKeyActivity);
    };
  }, [
    autoHideNoiseEnabled,
    isFullscreen,
    mediaVideoPlaying,
    startMenuOpen,
    controlCenterOpen,
    carbonHubOpen,
    notifShadeOpen,
    sysFolderOpen,
    novaPanelOpen,
    spotlightOpen,
    multitaskingOpen,
  ]);

  // --- Native Custom Alt+Tab (True MRU Order + Live Window Previews + Permanent Desktop→Window Switch Fix · 1.7 Oxygen) ---
  const altTabEntries: AltTabEntry[] = useMemo(() => {
    const lumaTitles: Partial<Record<DexWinId, string>> = {
      apps: 'Приложения', explorer: 'Проводник', taskmgr: 'Диспетчер задач', terminal: 'Терминал',
      tracker: 'Трекер сессий', kernel: 'Ядро LumaCore 1.6.2', settings: 'Настройки', plugins: 'Расширения',
      island: 'Dynamic Island', spaces: 'Рабочие столы', ai: 'Luma Ai Nitrogen', utilities: 'Службы ОС',
      calculator: 'Калькулятор', calendar: 'Календарь', trash: 'Корзина', scenarios: 'Сценарии',
      code_studio: 'Code Studio Pro', cut_studio: 'Cut Studio Pro', office: 'Luma Office Pro',
      gamepad: 'Luma Gamepad Studio', uninstaller: 'Luma Uninstaller', oxygen_connect: 'Oxygen Connect (Android)',
      photo_editor: 'Luma Photo Studio', superdevice: 'Суперустройство (Экосистема)',
    };
    const homeEntry: AltTabEntry & { _mru: number } = {
      key: 'luma_home_desktop',
      kind: 'home',
      id: 'home',
      title: 'Главная · Luma OS',
      subtitle: 'Рабочий стол и виджеты (Win+D)',
      active: true,
      _mru: windowMruMap['luma_home_desktop'] || 1,
    };
    const openLuma: (AltTabEntry & { _mru: number })[] = (Object.keys(windows) as DexWinId[])
      .filter((id) => windows[id]?.open)
      .map((id) => {
        const key = `luma_${id}`;
        return {
          key,
          kind: 'luma',
          id,
          title: lumaTitles[id] || id,
          subtitle: windows[id].minimized ? 'Свёрнуто · Luma OS' : 'Активно · Luma OS',
          minimized: windows[id].minimized,
          active: !windows[id].minimized,
          topmost: Boolean(windows[id].alwaysOnTop),
          _mru: windowMruMap[key] || (windows[id]?.z || 0) * 1000,
        };
      });
    const openHost: (AltTabEntry & { _mru: number })[] = hostWindows.map((hw) => {
      const key = `host_${hw.pid}`;
      return {
        key,
        kind: 'host',
        id: String(hw.pid),
        pid: hw.pid,
        hwnd: hw.hwnd,
        title: hw.friendly_name || hw.title || hw.name,
        subtitle: hw.name || `PID ${hw.pid}`,
        iconUrl: hw.icon_url,
        previewUrl: hostWindowPreviews[hw.pid],
        topmost: Boolean(hw.topmost),
        _mru: Math.max(windowMruMap[key] || 0, hw.mru || 0),
      };
    });

    // Strict MRU sort: whichever window was opened or used MOST RECENTLY always moves to the front!
    const allSorted = [...openLuma, ...openHost, homeEntry].sort((a, b) => b._mru - a._mru);
    return allSorted.map(({ _mru: _ignored, ...entry }) => entry);
  }, [windows, hostWindows, windowMruMap, hostWindowPreviews]);

  // Periodically refresh live PrintWindow thumbnails while Alt+Tab is open
  useEffect(() => {
    if (!altTabOpen) return;
    void fetchHostWindowPreviews();
    const id = window.setInterval(() => {
      void fetchHostWindowPreviews();
    }, 2200);
    return () => window.clearInterval(id);
  }, [altTabOpen, fetchHostWindowPreviews]);

  const windowsRef = useRef(windows);
  windowsRef.current = windows;
  const altTabEntriesRef = useRef<AltTabEntry[]>(altTabEntries);
  altTabEntriesRef.current = altTabEntries;
  const altTabIdxRef = useRef<number>(altTabIdx);
  altTabIdxRef.current = altTabIdx;
  const altTabOpenRef = useRef<boolean>(altTabOpen);
  altTabOpenRef.current = altTabOpen;
  const nativeAltTabSessionRef = useRef<boolean>(false);
  const lastAltTabSeqRef = useRef<number>(0);
  const altTabCommitLockUntilRef = useRef<number>(0);

  const returnToLumaHome = useCallback(
    (allowToggleBack = false) => {
      nativeAltTabSessionRef.current = false;
      setAltTabOpen(false);
      setAltTabFromExternal(false);
      setSpotlightOpen(false);
      setCarbonHubOpen(false);
      setNotifShadeOpen(false);
      setNovaPanelOpen(false);
      touchWindowMru('luma_home_desktop');
      void fetch('/api/kernel/alt-tab/release', { method: 'POST' }).catch(() => {});

      setWindows((prev) => {
        const visibleIds = (Object.keys(prev) as DexWinId[]).filter((id) => prev[id]?.open && !prev[id]?.minimized);
        if (visibleIds.length > 0) {
          winDSavedOpenRef.current = visibleIds;
          const next = { ...prev };
          visibleIds.forEach((id) => {
            next[id] = { ...next[id], minimized: true };
          });
          return next;
        }
        if (allowToggleBack && winDSavedOpenRef.current.length > 0) {
          const next = { ...prev };
          winDSavedOpenRef.current.forEach((id) => {
            if (next[id]?.open) next[id] = { ...next[id], minimized: false };
          });
          winDSavedOpenRef.current = [];
          return next;
        }
        return prev;
      });
    },
    [touchWindowMru]
  );

  const cancelAltTab = useCallback(() => {
    nativeAltTabSessionRef.current = false;
    setAltTabOpen(false);
    setAltTabFromExternal(false);
    void fetch('/api/kernel/alt-tab/release', { method: 'POST' }).catch(() => {});
  }, []);

  const activateAltTabEntry = useCallback(
    (item?: AltTabEntry) => {
      const nowMs = Date.now();
      if (nowMs < altTabCommitLockUntilRef.current) return;
      altTabCommitLockUntilRef.current = nowMs + 220;
      nativeAltTabSessionRef.current = false;
      setAltTabOpen(false);
      setAltTabFromExternal(false);
      if (!item) {
        void fetch('/api/kernel/alt-tab/release', { method: 'POST' }).catch(() => {});
        return;
      }
      if (item.kind === 'home') {
        returnToLumaHome(false);
        return;
      }
      if (item.kind === 'luma') {
        void fetch('/api/kernel/alt-tab/release', { method: 'POST' }).catch(() => {});
        const wid = item.id as DexWinId;
        openWindow(wid);
      } else if (item.pid) {
        // Luma OS 1.7.2 Oxygen Permanent Alt+Tab Fix:
        // Single atomic call to /api/kernel/windows/focus synchronously strips HWND_TOPMOST
        // from Luma OS and executes AttachThreadInput + FocusWindowWithHWND(pid, hwnd)!
        void handleFocusHostWindow(item.pid, item.hwnd);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [returnToLumaHome, touchWindowMru]
  );

  useEffect(() => {
    const stepSwitcher = (reverse: boolean, fromExternal = false) => {
      void pollHostWindows();
      void fetchHostWindowPreviews();
      const list = altTabEntriesRef.current;
      const len = Math.max(1, list.length);
      if (!altTabOpenRef.current) {
        setAltTabOpen(true);
        setAltTabFromExternal(fromExternal);
        const curWins = windowsRef.current;
        const hasVisibleDexWin = (Object.keys(curWins) as DexWinId[]).some(
          (id) => curWins[id]?.open && !curWins[id]?.minimized
        );
        const onLumaDesktop = !fromExternal && !hasVisibleDexWin;
        if (onLumaDesktop && len > 1) {
          // Switching AWAY from Luma Desktop: ALWAYS pick an actual other window, NEVER stay stuck on luma_home_desktop!
          const targetIdx = reverse
            ? list.map((e, i) => (e.kind !== 'home' ? i : -1)).filter((i) => i >= 0).pop() ?? 0
            : list.findIndex((e) => e.kind !== 'home');
          setAltTabIdx(targetIdx >= 0 ? targetIdx : 0);
        } else {
          // Classic MRU Alt+Tab: item #0 is the current most-recent window, so first tap highlights #1 (previous window)!
          setAltTabIdx(len > 1 ? (reverse ? len - 1 : 1) : 0);
        }
      } else {
        setAltTabIdx((cur) => (cur + (reverse ? -1 : 1) + len) % len);
      }
    };

    const onNativeAltTab = (e: Event) => {
      const det = (e as CustomEvent<{ reverse?: boolean; fromExternal?: boolean; seq?: number; native?: boolean }>).detail;
      if (det?.seq && det.seq === lastAltTabSeqRef.current) return;
      if (det?.seq) lastAltTabSeqRef.current = det.seq;
      nativeAltTabSessionRef.current = true;
      stepSwitcher(Boolean(det?.reverse), Boolean(det?.fromExternal));
    };
    const onNativeAltTabNav = (e: Event) => {
      if (!altTabOpenRef.current) return;
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      const len = Math.max(1, altTabEntriesRef.current.length);
      if (key === 'ArrowRight') setAltTabIdx((c) => (c + 1) % len);
      else if (key === 'ArrowLeft') setAltTabIdx((c) => (c - 1 + len) % len);
      else if (key === 'ArrowDown') setAltTabIdx((c) => (c + 4) % len);
      else if (key === 'ArrowUp') setAltTabIdx((c) => (c - 4 + len * 4) % len);
    };
    const onNativeCommit = () => {
      if (!altTabOpenRef.current) return;
      activateAltTabEntry(altTabEntriesRef.current[altTabIdxRef.current]);
    };
    const onNativeCancel = () => {
      cancelAltTab();
    };
    const onWinDHome = () => {
      returnToLumaHome(true);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      // Browser/WebView fallback: ONLY step if NOT driven by native Win32 WH_KEYBOARD_LL hook (prevents double-switching!)
      if (e.altKey && (e.key === 'Tab' || e.code === 'KeyQ')) {
        e.preventDefault();
        e.stopPropagation();
        if (nativeAltTabSessionRef.current && e.key === 'Tab') return;
        stepSwitcher(e.shiftKey, false);
        return;
      }
      if (!altTabOpenRef.current) return;
      // When native hook is driving Alt+Tab, hook already forwards Arrows/Enter/Esc — ignore duplicates if target isn't search input
      const isInputFocused = (e.target as HTMLElement)?.tagName === 'INPUT';
      if (nativeAltTabSessionRef.current && !isInputFocused && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
        return;
      }
      const len = Math.max(1, altTabEntriesRef.current.length);
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelAltTab();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        activateAltTabEntry(altTabEntriesRef.current[altTabIdxRef.current]);
      } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault();
        setAltTabIdx((c) => (c + 1) % len);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setAltTabIdx((c) => (c - 1 + len) % len);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAltTabIdx((c) => (c + 4) % len);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAltTabIdx((c) => (c - 4 + len * 4) % len);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && altTabOpenRef.current && !nativeAltTabSessionRef.current) {
        activateAltTabEntry(altTabEntriesRef.current[altTabIdxRef.current]);
      }
    };

    window.addEventListener('luma-alt-tab', onNativeAltTab);
    window.addEventListener('luma-alt-tab-nav', onNativeAltTabNav);
    window.addEventListener('luma-alt-tab-commit', onNativeCommit);
    window.addEventListener('luma-alt-tab-cancel', onNativeCancel);
    window.addEventListener('luma-win-d-home', onWinDHome);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('luma-alt-tab', onNativeAltTab);
      window.removeEventListener('luma-alt-tab-nav', onNativeAltTabNav);
      window.removeEventListener('luma-alt-tab-commit', onNativeCommit);
      window.removeEventListener('luma-alt-tab-cancel', onNativeCancel);
      window.removeEventListener('luma-win-d-home', onWinDHome);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [activateAltTabEntry, cancelAltTab, returnToLumaHome]);

  // --- Audio Input/Output Devices Switcher (1.3) ---
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
      pushToast('Аудиоустройство', 'Доступно при подключении к ядру LumaCore 1.4', 'info');
    }
  };

  // --- Wireless Peripheral Batteries Loader (1.3) ---
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

  // --- World Keyboard Layout Manager & Switcher (120+ Languages, 1.3) ---
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

  // --- Version Rollback Releases Loader & Executor (1.3) ---
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

  // Boot & Reactive Loaders (0 PowerShell on boot! Keyboard & wireless batteries are 100% pure Win32 in LumaCore 1.4)
  useEffect(() => {
    void fetchKeyboardLayouts();
    void fetchWirelessBatteries(false);
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void fetchKeyboardLayouts();
      void fetchWirelessBatteries(false);
    }, 45000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (controlCenterOpen) {
      void fetchAudioDevices(false);
      void fetchWirelessBatteries(false);
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

  const refreshOsMediaSessions = async () => {
    setLoadingMediaSessions(true);
    try {
      const r = await fetch('/api/kernel/media/sessions');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.sessions)) {
          setOsMediaSessions(d.sessions);
        }
        if (d?.media) {
          setLiveSystem((prev) => (prev ? { ...prev, media: d.media } : prev));
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingMediaSessions(false);
    }
  };

  const handleControlSpecificPlayer = async (
    sourceApp: string,
    action: string,
    displayName?: string
  ) => {
    try {
      const r = await fetch('/api/kernel/media/session-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_app: sourceApp, action }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.sessions)) {
          setOsMediaSessions(d.sessions);
        }
        if (d?.media) {
          setLiveSystem((prev) => (prev ? { ...prev, media: d.media } : prev));
        }
        const actRu =
          action === 'play'
            ? 'Включено'
            : action === 'pause'
            ? 'Пауза'
            : action === 'next'
            ? 'Следующий трек'
            : action === 'prev'
            ? 'Предыдущий трек'
            : action === 'seek_back'
            ? 'Перемотка −10с'
            : action === 'seek_forward'
            ? 'Перемотка +10с'
            : action.startsWith('seek_to:')
            ? 'Перемотка трека'
            : 'Переключено';
        triggerIslandPulse(displayName || 'Плеер ОС', actRu, 'media');
      }
    } catch {
      /* ignore */
    }
  };

  const handleToggleMediaPlay = () => {
    const chosen = selectedMediaSourceApp
      ? osMediaSessions.find((s) => s.source_app === selectedMediaSourceApp)
      : undefined;
    if (chosen) {
      void handleControlSpecificPlayer(chosen.source_app, chosen.is_playing ? 'pause' : 'play', chosen.display_name);
      return;
    }
    const nextPlay = !displayMediaPlaying;
    setMediaPlaying(nextPlay);
    sendRealMediaCommand('play_pause');
    triggerIslandPulse(nextPlay ? 'Воспроизведение' : 'Пауза', displayTrackTitle, 'media');
  };

  const handleNextTrack = () => {
    const chosen = selectedMediaSourceApp
      ? osMediaSessions.find((s) => s.source_app === selectedMediaSourceApp)
      : undefined;
    if (chosen) {
      void handleControlSpecificPlayer(chosen.source_app, 'next', chosen.display_name);
      return;
    }
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
    const chosen = selectedMediaSourceApp
      ? osMediaSessions.find((s) => s.source_app === selectedMediaSourceApp)
      : undefined;
    if (chosen) {
      void handleControlSpecificPlayer(chosen.source_app, 'prev', chosen.display_name);
      return;
    }
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
      pushToast('Питание', 'Доступно при запуске LumaOS_1.6.2.exe', 'info');
    }
  };

  // --- Windows Shell Mode Sync (Fullscreen-on-Start, Autostart, Hide Windows Taskbar + Replace Hotkeys & Touchpad) ---
  useEffect(() => {
    fetch('/api/kernel/shell-mode')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && d?.config) {
          setShellMode(d.config);
          if (typeof d.config.replace_hotkeys === 'boolean') {
            setWinKeyToLuma(d.config.replace_hotkeys);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleApplyShellMode = async (next: ShellModeState) => {
    setShellMode(next);
    setWinKeyToLuma(next.replace_hotkeys);
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
        if (typeof d.config.replace_hotkeys === 'boolean') {
          setWinKeyToLuma(d.config.replace_hotkeys);
        }
        pushToast(
          'Оболочка Windows',
          d.config.replace_hotkeys
            ? 'Параметры применены (Win/Alt+Tab/Win+D → Luma OS, жесты тачпада Windows отключены)'
            : 'Параметры оболочки применены к системе',
          'success'
        );
      }
    } catch {
      pushToast('Оболочка Windows', 'Настройки сохранены (активируются в LumaOS_1.7.3_Pro.exe)', 'info');
    } finally {
      setShellModeSaving(false);
    }
  };

  const handleRestoreWindowsTaskbar = async () => {
    try {
      const r = await fetch('/api/kernel/shell-restore', { method: 'POST' });
      const d = await r.json();
      if (d?.ok && d?.config) {
        setShellMode(d.config);
        if (typeof d.config.replace_hotkeys === 'boolean') {
          setWinKeyToLuma(d.config.replace_hotkeys);
        }
      }
      pushToast('Оболочка Windows', 'Панель задач, горячие клавиши и жесты тачпада Windows восстановлены', 'success');
    } catch {
      // ignore
    }
  };

  // --- Luma OS 1.6.7: 100% Native Wi-Fi & Bluetooth Connectivity Handlers (ZERO Windows Settings!) ---
  const fetchWifiStatus = useCallback(async (rescan = false) => {
    setWifiLoading(true);
    try {
      const r = await fetch(`/api/kernel/wifi/status${rescan ? '?rescan=1' : ''}`);
      if (r.ok) {
        const d: WifiStatusSnapshot = await r.json();
        setWifiStatus(d);
      }
    } catch {
      // ignore offline
    } finally {
      setWifiLoading(false);
    }
  }, []);

  const handleToggleWifi = useCallback(
    async (explicitNext?: boolean) => {
      const current = wifiStatus ? wifiStatus.enabled : true;
      const next = typeof explicitNext === 'boolean' ? explicitNext : !current;
      setWifiStatus((prev) =>
        prev
          ? { ...prev, enabled: next, connected: next ? prev.connected : false, active_ssid: next ? prev.active_ssid : '' }
          : {
              ok: true,
              available: true,
              enabled: next,
              connected: false,
              active_ssid: '',
              interface_name: 'Wi-Fi',
              signal: 0,
              networks: [],
            }
      );
      setWifiLoading(true);
      try {
        const r = await fetch('/api/kernel/wifi/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: next }),
        });
        if (r.ok) {
          const d: WifiStatusSnapshot = await r.json();
          setWifiStatus(d);
          pushToast('Wi-Fi', d.enabled ? 'Адаптер Wi-Fi включён' : 'Адаптер Wi-Fi выключен', 'info');
        }
      } catch {
        pushToast('Wi-Fi', 'Не удалось переключить адаптер Wi-Fi', 'warning');
      } finally {
        setWifiLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wifiStatus]
  );

  const handleConnectWifi = useCallback(
    async (ssid: string, password?: string) => {
      try {
        const r = await fetch('/api/kernel/wifi/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ssid, password: password || '', disconnect: false }),
        });
        const d = await r.json();
        if (d?.status) setWifiStatus(d.status);
        if (d?.ok) {
          pushToast('Wi-Fi', d.message || `Подключено к ${ssid}`, 'success');
        }
        return {
          ok: Boolean(d?.ok),
          needs_password: Boolean(d?.needs_password),
          message: d?.message,
          error: d?.error,
        };
      } catch {
        return { ok: false, error: 'Нет связи с ядром LumaCore 1.6.2' };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleDisconnectWifi = useCallback(async () => {
    try {
      const r = await fetch('/api/kernel/wifi/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disconnect: true }),
      });
      const d = await r.json();
      if (d?.status) setWifiStatus(d.status);
      pushToast('Wi-Fi', 'Отключено от сети Wi-Fi', 'info');
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBluetoothDevices = useCallback(async (activeScan = false) => {
    setBtLoading(true);
    try {
      const r = await fetch(`/api/kernel/bluetooth/devices${activeScan ? '?scan=1' : ''}`);
      if (r.ok) {
        const d: BluetoothStatusSnapshot = await r.json();
        setBtStatus(d);
        if (typeof d.enabled === 'boolean') setHubBluetoothEnabled(d.enabled);
      }
    } catch {
      // ignore
    } finally {
      setBtLoading(false);
    }
  }, []);

  const handleToggleBluetoothRadio = useCallback(
    async (explicitNext?: boolean) => {
      const next = typeof explicitNext === 'boolean' ? explicitNext : !hubBluetoothEnabled;
      setHubBluetoothEnabled(next);
      setBtStatus((prev) => (prev ? { ...prev, enabled: next } : prev));
      try {
        const r = await fetch('/api/kernel/bluetooth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: next }),
        });
        if (r.ok) {
          const d: BluetoothStatusSnapshot = await r.json();
          setBtStatus(d);
          if (typeof d.enabled === 'boolean') setHubBluetoothEnabled(d.enabled);
          pushToast('Bluetooth', next ? 'Радиомодуль Bluetooth включён' : 'Радиомодуль Bluetooth выключен', 'info');
        }
      } catch {
        // ignore
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hubBluetoothEnabled]
  );

  const handleBluetoothDeviceAction = useCallback(
    async (dev: BluetoothDeviceItem, action: 'connect' | 'disconnect' | 'pair', pin?: string) => {
      try {
        const r = await fetch('/api/kernel/bluetooth/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: dev.name,
            instance_id: dev.instance_id || '',
            action,
            pin: pin || '',
          }),
        });
        const d = await r.json();
        if (d?.status) {
          setBtStatus(d.status);
          if (typeof d.status.enabled === 'boolean') setHubBluetoothEnabled(d.status.enabled);
        }
        if (d?.ok) {
          pushToast('Bluetooth', d.message || `Операция выполнена: ${dev.name}`, 'success');
        }
        return {
          ok: Boolean(d?.ok),
          needs_pin: Boolean(d?.needs_pin),
          message: d?.message,
          error: d?.error,
        };
      } catch {
        return { ok: false, error: 'Нет связи с ядром LumaCore 1.6.2' };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    void fetchWifiStatus(false);
    void fetchBluetoothDevices();
  }, [fetchWifiStatus, fetchBluetoothDevices]);

  useEffect(() => {
    if (controlCenterOpen || carbonHubOpen) {
      void fetchWifiStatus(false);
      void fetchBluetoothDevices();
    }
    if (!controlCenterOpen) {
      setCcConnectivityPicker('none');
    }
  }, [controlCenterOpen, carbonHubOpen, fetchWifiStatus, fetchBluetoothDevices]);

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
      } else if (taskbarPosition === 'right') {
        nextPx = window.innerWidth - e.clientX;
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
      setGithubUpdateStatus('Нет ответа от службы обновлений LumaCore 1.4');
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
    triggerDockBounce(app.id);
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
      if (enabledFeatures.scenarios) {
        const lowerApp = `${app.id} ${app.name} ${app.url || ''}`.toLowerCase();
        scenarios
          .filter(
            (s) =>
              s.enabled &&
              s.triggerType === 'app_launch' &&
              s.triggerParam.trim() &&
              lowerApp.includes(s.triggerParam.trim().toLowerCase())
          )
          .forEach((s) => executeScenarioRule(s));
      }
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
      pushToast('Выбор файла', 'Введите путь вручную или используйте LumaOS_1.6.2.exe', 'info');
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
  // Deduplicate Luma catalog runningApps against live real Windows hostWindows so Steam/Chrome/Telegram NEVER appear twice on the taskbar!
  const taskbarRunningApps = useMemo(() => {
    if (!taskbarShowHostWindows || orderedHostWindows.length === 0) return runningApps;
    const hostTokens = orderedHostWindows.map((hw) =>
      `${hw.friendly_name || ''} ${hw.name || ''} ${hw.title || ''}`.toLowerCase()
    );
    return runningApps.filter((app) => {
      const appName = app.name.trim().toLowerCase();
      const appPkg = (app.package || app.id || '').trim().toLowerCase();
      return !hostTokens.some(
        (tok) =>
          (appName.length >= 3 && tok.includes(appName)) ||
          (appPkg.length >= 3 && tok.includes(appPkg))
      );
    });
  }, [runningApps, orderedHostWindows, taskbarShowHostWindows]);
  const runningAppsCount = runningApps.length;
  const unreadNotifCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications]);

  const currentIslandPlayer = islandPlayers[activePlayerIndex] || islandPlayers[0];
  const liveMediaSessionsList: LiveMediaSessionItem[] = useMemo(() => {
    if (osMediaSessions.length > 0) return osMediaSessions;
    return Array.isArray(liveSystem?.media?.sessions) ? liveSystem!.media.sessions : [];
  }, [osMediaSessions, liveSystem]);
  const selectedOsSession = useMemo(() => {
    if (liveMediaSessionsList.length === 0) return null;
    if (selectedMediaSourceApp) {
      const exact = liveMediaSessionsList.find((s) => s.source_app === selectedMediaSourceApp);
      if (exact) return exact;
    }
    return liveMediaSessionsList.find((s) => s.is_playing) || liveMediaSessionsList.find((s) => s.is_current) || liveMediaSessionsList[0];
  }, [liveMediaSessionsList, selectedMediaSourceApp]);
  const hasLiveOsMedia = Boolean(selectedOsSession || (liveSystem?.media?.available && liveSystem.media.title));
  const displayTrackTitle = selectedOsSession
    ? selectedOsSession.title || selectedOsSession.display_name
    : hasLiveOsMedia
    ? liveSystem!.media.title
    : currentIslandPlayer.track;
  const displayTrackArtist = selectedOsSession
    ? selectedOsSession.artist || selectedOsSession.display_name || 'Плеер ОС'
    : hasLiveOsMedia
    ? liveSystem!.media.artist || liveSystem!.media.source_app || 'Системный поток'
    : currentIslandPlayer.artist;
  const displayMediaSourceLabel = selectedOsSession
    ? selectedOsSession.display_name
    : hasLiveOsMedia
    ? liveSystem!.media.source_app || 'СИСТЕМНЫЙ ПОТОК ОС'
    : currentIslandPlayer.name;
  const displayMediaPlaying = selectedOsSession
    ? selectedOsSession.is_playing
    : hasLiveOsMedia
    ? liveSystem!.media.is_playing
    : mediaPlaying;

  // Harmonious Theme-Adaptive Surface Tokens (Cohesive across ALL 8 themes!)
  const isDark = currentTheme.isDark;
  const isPixel = designStyle === 'glass';
  const isNova = designStyle === 'nova';
  const surfaceCls = isDark
    ? 'bg-white/[0.045] border-white/[0.1] text-zinc-100'
    : 'bg-white/[0.45] border-zinc-900/[0.13] text-zinc-900';
  const btnCls = isDark
    ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-zinc-200'
    : 'bg-zinc-900/[0.06] hover:bg-zinc-900/[0.12] border-zinc-900/[0.15] text-zinc-900';
  const mutedCls = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const popoverShellCls = isNova
    ? isDark
      ? 'dex-window-nova-dark text-zinc-100 rounded-2xl'
      : 'dex-window-nova-light text-zinc-900 rounded-2xl'
    : isPixel
    ? isDark
      ? 'dex-window-pixel-dark text-slate-100 rounded-[24px]'
      : 'dex-window-pixel-light text-slate-900 rounded-[24px]'
    : isDark
    ? 'dex-window-dark text-zinc-100 rounded-2xl'
    : 'dex-window-light text-zinc-900 rounded-2xl';
  const taskbarGlassCls = isNova
    ? isDark
      ? 'bg-[#1c1c1e]/88 backdrop-blur-2xl border-white/[0.12] text-zinc-100'
      : 'bg-[#f4f3f2]/92 backdrop-blur-2xl border-zinc-900/[0.14] text-zinc-900'
    : isPixel
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

  // Renders real native Windows app icon PNG/SVG overlaid seamlessly on Lucide fallback (with 1.7 Oxygen auto-retry!)
  const renderAppVisual = (app: Pick<AppItem, 'icon' | 'iconUrl' | 'name'>, className = 'w-4 h-4') => {
    const baseSrc = app.iconUrl
      ? app.iconUrl.startsWith('/api/kernel/app-icon?') && !app.iconUrl.includes('v=17')
        ? `${app.iconUrl}&v=17`
        : app.iconUrl
      : '';
    if (!baseSrc) return renderAppIcon(app.icon, className);
    return (
      <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <span className="inline-flex items-center justify-center w-full h-full">
          {renderAppIcon(app.icon, 'w-full h-full')}
        </span>
        <img
          src={baseSrc}
          alt={app.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-contain rounded-[3px]"
          onLoad={(e) => {
            const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
            if (prev) prev.style.opacity = '0';
          }}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.dataset.retried) {
              img.dataset.retried = '1';
              img.src = `/api/kernel/app-icon?name=${encodeURIComponent(app.name || 'app')}&v=17r`;
              return;
            }
            img.style.display = 'none';
          }}
        />
      </span>
    );
  };

  // Taskbar pinned + dynamic open windows (sortable via taskbarOrder & drag-and-drop!)
  const rawTaskbarApps: { id: DexWinId; label: string; icon: React.ReactNode; pinned: boolean }[] = [
    { id: 'explorer', label: t('explorer', 'Проводник'), icon: <FolderOpen className="w-4 h-4" />, pinned: true },
    { id: 'apps', label: t('apps', 'Приложения'), icon: <AppWindow className="w-4 h-4" />, pinned: true },
    { id: 'superdevice', label: 'Суперустройство', icon: <Radio className="w-4 h-4 text-blue-400" />, pinned: true },
    { id: 'photo_editor', label: 'Фотостудия', icon: <Image className="w-4 h-4 text-sky-400" />, pinned: true },
    { id: 'oxygen_connect', label: 'Oxygen Connect', icon: <Smartphone className="w-4 h-4 text-cyan-400" />, pinned: true },
    { id: 'office', label: 'Office Studio', icon: <FileText className="w-4 h-4" />, pinned: true },
    ...(enabledFeatures.calendar ? [{ id: 'calendar' as DexWinId, label: 'Календарь', icon: <Calendar className="w-4 h-4" />, pinned: true }] : []),
    ...(enabledFeatures.codeStudio ? [{ id: 'code_studio' as DexWinId, label: 'Code Studio', icon: <Code2 className="w-4 h-4" />, pinned: true }] : []),
    ...(enabledFeatures.cutStudio ? [{ id: 'cut_studio' as DexWinId, label: 'Cut Studio', icon: <Film className="w-4 h-4" />, pinned: true }] : []),
    ...(enabledFeatures.scenarios ? [{ id: 'scenarios' as DexWinId, label: 'Сценарии', icon: <Zap className="w-4 h-4" />, pinned: true }] : []),
    ...(enabledFeatures.trash ? [{ id: 'trash' as DexWinId, label: 'Корзина', icon: <Trash2 className="w-4 h-4" />, pinned: true }] : []),
    ...(enabledFeatures.ai ? [{ id: 'ai' as DexWinId, label: t('ai', 'Luma Ai Nitrogen'), icon: <Sparkles className="w-4 h-4" />, pinned: aiEnabled }] : []),
    { id: 'gamepad', label: 'Gamepad Studio', icon: <Gamepad2 className="w-4 h-4" />, pinned: true },
    { id: 'uninstaller', label: 'Очистка хвостов', icon: <Trash2 className="w-4 h-4 text-rose-400" />, pinned: true },
    { id: 'calculator', label: t('calculator', 'Калькулятор'), icon: <Calculator className="w-4 h-4" />, pinned: true },
    { id: 'terminal', label: t('terminal', 'Терминал'), icon: <Terminal className="w-4 h-4" />, pinned: true },
    { id: 'utilities', label: t('utilities', 'Службы'), icon: <Wrench className="w-4 h-4" />, pinned: true },
    { id: 'tracker', label: t('tracker', 'Трекер'), icon: <BarChart3 className="w-4 h-4" />, pinned: false },
    { id: 'kernel', label: t('kernel', 'Ядро'), icon: <Cpu className="w-4 h-4" />, pinned: true },
    { id: 'settings', label: t('settings', 'Настройки'), icon: <Settings className="w-4 h-4" />, pinned: true },
    { id: 'taskmgr', label: t('taskmgrFull', 'Диспетчер задач'), icon: <Activity className="w-4 h-4" />, pinned: false },
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

  // Auto-Hide Taskbar state (keeps taskbar visible while hovered or any taskbar menu/popover is open)
  const isTaskbarShown =
    !taskbarAutoHide ||
    taskbarHoverOpen ||
    resizingTaskbar ||
    startMenuOpen ||
    controlCenterOpen ||
    taskListOpen ||
    sysFolderOpen ||
    kbdPopoverOpen ||
    Boolean(taskbarCtxMenu) ||
    Boolean(barElementCtxMenu) ||
    Boolean(taskbarAppMenuId) ||
    taskbarHostWinPid !== null;
  const effectiveTaskbarSizePx = taskbarAutoHide ? 0 : taskbarSizePx;

  const handleTaskbarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Pass raw cursor coordinates directly to SmartContextMenu so it anchors right at the cursor
    // and dynamically flips upward / clamps inside screen edges without double-offsetting!
    setTaskbarCtxMenu({ x: e.clientX, y: e.clientY });
    setBarElementCtxMenu(null);
    setTrayItemCtxMenu(null);
    setStartMenuOpen(false);
    setControlCenterOpen(false);
    setSysFolderOpen(false);
    setKbdPopoverOpen(false);
    setTaskListOpen(false);
    setTaskbarAppMenuId(null);
    setTaskbarHostWinPid(null);
  };

  // ==================== LUMA OS 1.7.3 TASKBAR CUSTOMIZATION, TEAR-OFF TO DESKTOP & CUSTOM WALLPAPERS ====================
  const handleUploadCustomWallpaperFile = (file: File) => {
    if (!file) return;
    setUploadingCustomWp(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) return;
        setLiveWallpaper('');
        setWallpaperImageUrl(dataUrl);
        const r = await fetch('/api/kernel/wallpapers/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, data_url: dataUrl }),
        }).catch(() => null);
        if (r && r.ok) {
          const d = await r.json();
          if (d?.url) {
            setWallpaperImageUrl(d.url);
            await refreshCustomWallpapers();
          }
          pushToast('Мои обои', `Обои «${file.name}» добавлены и сохранены на диск!`, 'success');
        } else {
          pushToast('Мои обои', `Обои «${file.name}» применены!`, 'success');
        }
      } finally {
        setUploadingCustomWp(false);
      }
    };
    reader.onerror = () => setUploadingCustomWp(false);
    reader.readAsDataURL(file);
  };

  const handleDeleteCustomWallpaper = async (name: string, url: string) => {
    try {
      await fetch(`/api/kernel/wallpapers/custom?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (wallpaperImageUrl === url) setWallpaperImageUrl('');
      await refreshCustomWallpapers();
      pushToast('Мои обои', `Удалено: ${name}`, 'info');
    } catch { /* ignore */ }
  };

  const reorderBarElement = (srcId: TaskbarElementId, targetId: TaskbarElementId, side: 'left' | 'right') => {
    if (srcId === targetId) return;
    setTaskbarElementsOrder((prev) => {
      const cleaned = prev.filter((x) => x !== srcId);
      const tIdx = cleaned.indexOf(targetId);
      if (tIdx < 0) return [...cleaned, srcId];
      const insertAt = side === 'left' ? tIdx : tIdx + 1;
      cleaned.splice(insertAt, 0, srcId);
      return cleaned;
    });
  };

  const moveBarElementByStep = (id: TaskbarElementId, delta: -1 | 1) => {
    setTaskbarElementsOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const nextIdx = Math.max(0, Math.min(prev.length - 1, idx + delta));
      if (nextIdx === idx) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  };

  const tearOffTaskbarElementToDesktop = (id: TaskbarElementId, clientX?: number, clientY?: number) => {
    if (!TASKBAR_ELEMENT_META[id]?.canTearOff) {
      pushToast('Панель задач', 'Полосу открытых окон нельзя вытащить на стол — её можно только перетаскивать по панели', 'info');
      return;
    }
    const maxW = Math.max(240, window.innerWidth - 150);
    const maxH = Math.max(200, window.innerHeight - 130);
    const x = Math.max(20, Math.min(maxW, (clientX ?? Math.round(window.innerWidth * 0.45)) - 56));
    const y = Math.max(56, Math.min(maxH, (clientY ?? Math.round(window.innerHeight * 0.42)) - 26));
    setDesktopTaskbarTools((prev) => {
      const exists = prev.find((t) => t.id === id);
      if (exists) {
        return prev.map((t) => (t.id === id ? { ...t, x, y } : t));
      }
      return [...prev, { id, x, y }];
    });
    pushToast('Рабочий стол', `«${TASKBAR_ELEMENT_META[id].label}» вынесено на рабочий стол!`, 'success');
  };

  const removeDesktopTaskbarTool = (id: TaskbarElementId, restoreToTaskbar = false) => {
    setDesktopTaskbarTools((prev) => prev.filter((t) => t.id !== id));
    if (restoreToTaskbar) {
      setTaskbarHiddenElements((prev) => prev.filter((x) => x !== id));
      if (id === 'telemetry') setTaskbarShowTelemetry(true);
      if (id === 'clipboard') setTaskbarShowClipboardBtn(true);
      if (id === 'fullscreen') setTaskbarShowFullscreenBtn(true);
      if (id === 'luma_folder') setShowLumaSysFolder(true);
      pushToast('Панель задач', `«${TASKBAR_ELEMENT_META[id].label}» возвращено на панель задач`, 'info');
    } else {
      pushToast('Рабочий стол', `Плитка «${TASKBAR_ELEMENT_META[id].label}» убрана со стола`, 'info');
    }
  };

  const toggleHideTaskbarElement = (id: TaskbarElementId, forceHidden?: boolean) => {
    setTaskbarHiddenElements((prev) => {
      const currentlyHidden = prev.includes(id);
      const nextHidden = typeof forceHidden === 'boolean' ? forceHidden : !currentlyHidden;
      if (nextHidden) {
        if (id === 'telemetry') setTaskbarShowTelemetry(false);
        if (id === 'clipboard') setTaskbarShowClipboardBtn(false);
        if (id === 'fullscreen') setTaskbarShowFullscreenBtn(false);
        if (id === 'luma_folder') setShowLumaSysFolder(false);
        return currentlyHidden ? prev : [...prev, id];
      } else {
        if (id === 'telemetry') setTaskbarShowTelemetry(true);
        if (id === 'clipboard') setTaskbarShowClipboardBtn(true);
        if (id === 'fullscreen') setTaskbarShowFullscreenBtn(true);
        if (id === 'luma_folder') setShowLumaSysFolder(true);
        return prev.filter((x) => x !== id);
      }
    });
  };

  const resetTaskbarLayout = () => {
    setTaskbarElementsOrder([...DEFAULT_TASKBAR_ELEMENTS]);
    setTaskbarHiddenElements([]);
    setDesktopTaskbarTools([]);
    setTaskbarShowTelemetry(true);
    setTaskbarShowClipboardBtn(true);
    setTaskbarShowFullscreenBtn(true);
    setShowLumaSysFolder(true);
    pushToast('Панель задач', 'Порядок и состав панели задач сброшены по умолчанию', 'success');
  };

  const runTaskbarElementAction = (id: TaskbarElementId) => {
    setBarElementCtxMenu(null);
    setTaskbarCtxMenu(null);
    switch (id) {
      case 'luma_folder':
        setSysFolderOpen((v) => !v);
        setKbdPopoverOpen(false);
        setStartMenuOpen(false);
        setControlCenterOpen(false);
        setTaskListOpen(false);
        setTaskbarAppMenuId(null);
        setTaskbarHostWinPid(null);
        break;
      case 'start':
        setStartMenuOpen((v) => !v);
        setControlCenterOpen(false);
        setTaskListOpen(false);
        setTaskbarAppMenuId(null);
        setTaskbarHostWinPid(null);
        break;
      case 'search':
        setSpotlightOpen(true);
        break;
      case 'circle_search':
        openUnifiedCircleSearch({ preCaptured: false });
        break;
      case 'control_hub':
        setCarbonHubOpen((v) => !v);
        setStartMenuOpen(false);
        setControlCenterOpen(false);
        break;
      case 'tasks':
        setTaskListOpen((v) => !v);
        setTaskListSearch('');
        setStartMenuOpen(false);
        setControlCenterOpen(false);
        setSysFolderOpen(false);
        setKbdPopoverOpen(false);
        setTaskbarAppMenuId(null);
        setTaskbarHostWinPid(null);
        break;
      case 'telemetry':
        openWindow('taskmgr');
        break;
      case 'clipboard':
        setSmartClipboardOpen(true);
        break;
      case 'fullscreen':
        handleToggleFullscreen();
        break;
      case 'keyboard':
        setKbdPopoverOpen((v) => !v);
        setControlCenterOpen(false);
        setSysFolderOpen(false);
        setStartMenuOpen(false);
        setTaskListOpen(false);
        setTaskbarAppMenuId(null);
        setTaskbarHostWinPid(null);
        break;
      case 'notifications':
        setNotifShadeOpen((v) => !v);
        setControlCenterOpen(false);
        setCarbonHubOpen(false);
        setStartMenuOpen(false);
        setSysFolderOpen(false);
        setKbdPopoverOpen(false);
        setTaskListOpen(false);
        break;
      case 'superdevice':
        openWindow('superdevice');
        break;
      case 'tray_cc':
        setControlCenterOpen((v) => !v);
        setNotifShadeOpen(false);
        setStartMenuOpen(false);
        setSysFolderOpen(false);
        setKbdPopoverOpen(false);
        setTaskListOpen(false);
        setTaskbarAppMenuId(null);
        setTaskbarHostWinPid(null);
        break;
      case 'clock':
        openWindow('calendar');
        break;
      default:
        break;
    }
  };

  // Luma OS 1.6.7: Smart 6-Point Dynamic Island Placement, 4 Themes & Native Win32 Always-On-Top Overlay Sync
  const isIslandBottom = islandAnchor.startsWith('bottom');
  const islandHorizontalCls = islandAnchor.endsWith('left')
    ? 'left-4'
    : islandAnchor.endsWith('right')
    ? 'right-4'
    : 'left-1/2 -translate-x-1/2';
  const islandSafeOffsetPx = isIslandBottom
    ? (taskbarPosition === 'bottom' && isTaskbarShown ? effectiveTaskbarSizePx + 10 : 0) + islandOffsetY
    : (taskbarPosition === 'top' && isTaskbarShown ? effectiveTaskbarSizePx + 10 : dualTaskbarMode ? 48 : 0) + islandOffsetY;
  const islandAnchorStyle: React.CSSProperties = isIslandBottom
    ? { bottom: `${islandSafeOffsetPx}px` }
    : { top: `${islandSafeOffsetPx}px` };

  const islandHeightCls = islandSize === 'compact' ? 'h-7' : islandSize === 'expanded' ? 'h-10' : 'h-8';
  const islandSurfaceThemeCls =
    islandStyle === 'cryo'
      ? 'bg-[#09182e] text-sky-50 border-sky-400/40 backdrop-blur-2xl'
      : islandStyle === 'frosted'
      ? 'bg-[#f1f5f9] text-slate-900 border-white/75 backdrop-blur-2xl'
      : islandStyle === 'oled'
      ? 'bg-black text-white border-[var(--luma-accent)]/75'
      : 'bg-[#0a0a0c] text-zinc-100 border-white/15 backdrop-blur-xl';

  const activeIslandProgress = renderDockTask
    ? { label: renderDockTask.title || 'Рендер', percent: renderDockTask.percent }
    : updateProgress?.running
    ? { label: 'Обновление OS', percent: updateProgress.percent }
    : null;

  // Sync Dynamic Island Always-On-Top Native Win32 Overlay configuration to LumaCore 1.6.2
  useEffect(() => {
    const payload = {
      enabled: dynamicIslandEnabled,
      pin_over_all_windows: islandPinOverAllWindows,
      always_show_over_luma: islandAlwaysOverLuma,
      show_in_fullscreen_apps: islandShowInFullscreen,
      click_through: islandClickThrough,
      locked: islandLocked,
      position: islandAnchor,
      offset_x: 0,
      offset_y: islandOffsetY,
      size: islandSize,
      style: islandStyle,
      opacity: islandOpacity,
      accent_hex: customAccentOverride || currentTheme.accentHex,
      glow_enabled: islandGlowEnabled,
      hover_expand: islandHoverExpand,
      show_clock: islandShowClock,
      show_telemetry: islandShowTelemetry,
      show_battery: islandShowBattery,
      show_weather: islandShowWeather,
      show_media: islandShowEq,
      show_notifications: islandShowNotifications,
      show_downloads: islandShowDownloads,
      dnd_enabled: dndEnabled,
    };
    fetch('/api/kernel/island/overlay/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.native_active === 'boolean') setNativeIslandOverlayActive(d.native_active);
      })
      .catch(() => {});
  }, [
    dynamicIslandEnabled,
    islandPinOverAllWindows,
    islandAlwaysOverLuma,
    islandShowInFullscreen,
    islandClickThrough,
    islandLocked,
    islandAnchor,
    islandOffsetY,
    islandSize,
    islandStyle,
    islandOpacity,
    customAccentOverride,
    currentTheme.accentHex,
    islandGlowEnabled,
    islandHoverExpand,
    islandShowClock,
    islandShowTelemetry,
    islandShowBattery,
    islandShowWeather,
    islandShowEq,
    islandShowNotifications,
    islandShowDownloads,
    dndEnabled,
  ]);

  // Push live telemetry, track, timer & download progress to Native Win32 Always-On-Top Dynamic Island Overlay
  useEffect(() => {
    if (!dynamicIslandEnabled || !islandPinOverAllWindows) return;
    const timerTxt = islandTimerRunning
      ? formatLiveClock(islandTimerRemainingSec)
      : islandStopwatchRunning
      ? formatLiveClock(islandStopwatchSec)
      : '';
    const weatherTxt = liveSystem?.location?.city ? `${liveSystem.location.city}` : '';
    const sendLive = () => {
      fetch('/api/kernel/island/overlay/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_title: displayMediaPlaying || hasLiveOsMedia ? displayTrackTitle : '',
          track_artist: displayMediaPlaying || hasLiveOsMedia ? displayTrackArtist : '',
          media_playing: displayMediaPlaying,
          timer_text: timerTxt,
          weather_text: weatherTxt,
          cpu_percent: Math.round(cpuLoad),
          ram_percent: Math.round(ramLoad),
          battery_percent: Math.round(batteryLevel),
          battery_charging: isCharging,
          download_label: activeIslandProgress?.label || '',
          download_percent: activeIslandProgress?.percent || 0,
          unread_count: unreadNotifCount,
          accent_hex: customAccentOverride || currentTheme.accentHex,
        }),
      }).catch(() => {});
    };
    sendLive();
    const id = window.setInterval(sendLive, 1500);
    return () => window.clearInterval(id);
  }, [
    dynamicIslandEnabled,
    islandPinOverAllWindows,
    displayTrackTitle,
    displayTrackArtist,
    displayMediaPlaying,
    hasLiveOsMedia,
    islandTimerRunning,
    islandTimerRemainingSec,
    islandStopwatchRunning,
    islandStopwatchSec,
    cpuLoad,
    ramLoad,
    batteryLevel,
    isCharging,
    unreadNotifCount,
    activeIslandProgress?.label,
    activeIslandProgress?.percent,
    liveSystem?.location?.city,
    customAccentOverride,
    currentTheme.accentHex,
  ]);

  const isWinVisible = (id: DexWinId) =>
    windows[id].open && !windows[id].minimized && (windows[id].desktop ?? 1) === activeDesktop;

  useEffect(() => {
    if (pinnedWirelessNames.length === 0) return;
    void fetchWirelessBatteries(false);
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void fetchWirelessBatteries(false);
    }, 90000);
    return () => clearInterval(id);
  }, [pinnedWirelessNames.length]);

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
        if (barElementCtxMenu) setBarElementCtxMenu(null);
        if (trayItemCtxMenu) setTrayItemCtxMenu(null);
      }}
      className={`relative w-screen h-screen overflow-hidden select-none ${
        isDark ? 'text-zinc-100' : 'text-zinc-900'
      }`}
    >
      {/* Hidden Global Custom Wallpaper Picker (triggered from Settings OR Desktop RMB → Добавить свои обои) */}
      <input
        ref={customWpInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUploadCustomWallpaperFile(f);
          e.currentTarget.value = '';
        }}
      />

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
        taskbarSizePx={effectiveTaskbarSizePx}
        wallpaperImageUrl={wallpaperImageUrl}
        wallpaperBlur={wallpaperBlur}
        wallpaperDim={wallpaperDim}
        wallpaperTransition={wallpaperTransition}
        liveWallpaper={liveWallpaper}
        aiEnabled={aiEnabled}
        iconSizePx={iconSizePx}
        onActivityPulse={(title, detail, icon) => triggerIslandPulse(title, detail, icon || 'info')}
        wirelessBatteries={wirelessBatteries}
        onOpenSettingsTab={(tab) => openWindow('settings', tab as SettingsTabId)}
        onTriggerEasterEgg={() => enabledFeatures.easterEgg && setEasterEggOpen(true)}
        deleteAnimStyle={deleteAnimStyle}
        topBarOffsetPx={dualTaskbarMode ? 46 : 0}
        onOpenCustomWidgetBuilder={(editWidgetId, spec) =>
          setCustomWidgetModal({ open: true, editWidgetId, spec: spec || null })
        }
        pendingCustomWidget={pendingCustomWidget}
        onConsumePendingCustomWidget={() => setPendingCustomWidget(null)}
        onQuickLook={openQuickLook}
        rmbConfig={rmbConfig}
        onOpenLensSearch={() => setLensSearchOpen(true)}
        onTakeScreenshot={() => executeGestureAction('screenshot', 'Снимок экрана')}
        onCycleShellStyle={() => {
          const order: DesignStyle[] = ['matrix', 'glass', 'nova'];
          const next = order[(order.indexOf(designStyle) + 1) % order.length];
          setDesignStyle(next);
          if (next === 'nova') setStartMenuOpen(false);
          else setNovaPanelOpen(false);
          pushToast('Стиль оболочки', `Выбран стиль: ${next === 'nova' ? 'Luma Nova' : next === 'glass' ? 'Стекло' : 'Классика'}`, 'info');
        }}
      />

      {/* ==================== LAYER 1.5: TEAR-OFF DESKTOP TASKBAR TOOL TILES (1.7.3) ==================== */}
      {desktopTaskbarTools.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[180]">
          {desktopTaskbarTools.map((tool) => {
            const meta = TASKBAR_ELEMENT_META[tool.id];
            if (!meta) return null;
            const unread = hubNotifications.filter((n) => n.unread).length;
            const renderToolIcon = () => {
              switch (tool.id) {
                case 'start':
                  return <Grid className="w-4 h-4 text-[var(--luma-accent)]" />;
                case 'search':
                  return <Search className="w-4 h-4 text-[var(--luma-accent)]" />;
                case 'circle_search':
                  return <ScanSearch className="w-4 h-4 text-sky-400" />;
                case 'luma_folder':
                  return <Folder className="w-4 h-4 text-[var(--luma-accent)]" />;
                case 'control_hub':
                  return <Sliders className="w-4 h-4 text-blue-400" />;
                case 'tasks':
                  return <Layers className="w-4 h-4 text-violet-400" />;
                case 'telemetry':
                  return <Cpu className="w-4 h-4 text-emerald-400" />;
                case 'clipboard':
                  return <Clipboard className="w-4 h-4 text-cyan-400" />;
                case 'fullscreen':
                  return isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4 text-amber-400" />;
                case 'keyboard':
                  return <Keyboard className="w-4 h-4 text-sky-400" />;
                case 'notifications':
                  return dndEnabled ? <BellOff className="w-4 h-4 text-amber-400" /> : <Bell className="w-4 h-4 text-cyan-400" />;
                case 'superdevice':
                  return <Radio className="w-4 h-4 text-blue-400" />;
                case 'tray_cc':
                  return isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />;
                case 'clock':
                  return <Clock className="w-4 h-4 text-[var(--luma-accent)]" />;
                default:
                  return <Sparkles className="w-4 h-4 text-[var(--luma-accent)]" />;
              }
            };
            const liveSub =
              tool.id === 'telemetry'
                ? `CPU ${cpuLoad}% · RAM ${ramLoad}%`
                : tool.id === 'keyboard'
                ? liveKbdShort || kbdLayouts?.active?.short || 'RUS'
                : tool.id === 'tray_cc'
                ? `${isMuted ? '0%' : `${volume}%`} · ${batteryLevel}%`
                : tool.id === 'notifications'
                ? unread > 0
                  ? `${unread} новых`
                  : 'Нет новых'
                : tool.id === 'tasks'
                ? `Открыто: ${totalActiveTasksCount}`
                : tool.id === 'clock'
                ? undefined
                : meta.shortLabel;

            return (
              <div
                key={`desktop_tool_${tool.id}`}
                style={{ left: `${tool.x}px`, top: `${tool.y}px` }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  const el = e.currentTarget;
                  el.setPointerCapture(e.pointerId);
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const origX = tool.x;
                  const origY = tool.y;
                  let moved = false;
                  const onMove = (me: PointerEvent) => {
                    const dx = me.clientX - startX;
                    const dy = me.clientY - startY;
                    if (!moved && Math.hypot(dx, dy) > 5) moved = true;
                    if (moved) {
                      const nx = Math.max(8, Math.min(window.innerWidth - 130, origX + dx));
                      const ny = Math.max(8, Math.min(window.innerHeight - 80, origY + dy));
                      setDesktopTaskbarTools((prev) =>
                        prev.map((t) => (t.id === tool.id ? { ...t, x: nx, y: ny } : t))
                      );
                    }
                  };
                  const onUp = (ue: PointerEvent) => {
                    el.removeEventListener('pointermove', onMove);
                    el.removeEventListener('pointerup', onUp);
                    el.removeEventListener('pointercancel', onUp);
                    try { el.releasePointerCapture(ue.pointerId); } catch { /* ignore */ }
                    if (!moved) {
                      runTaskbarElementAction(tool.id);
                    }
                  };
                  el.addEventListener('pointermove', onMove);
                  el.addEventListener('pointerup', onUp);
                  el.addEventListener('pointercancel', onUp);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTaskbarCtxMenu(null);
                  setTrayItemCtxMenu(null);
                  setBarElementCtxMenu({ x: e.clientX, y: e.clientY, id: tool.id, fromDesktop: true });
                }}
                title={`${meta.label} · ЛКМ — открыть · Перетащите по столу · ПКМ — вернуть на панель`}
                className={`group pointer-events-auto fixed flex items-center gap-2.5 pl-3 pr-3.5 py-2.5 rounded-2xl border backdrop-blur-2xl shadow-[0_14px_34px_rgba(0,0,0,0.42)] cursor-grab active:cursor-grabbing transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] ${
                  isDark
                    ? 'bg-[#121622]/84 border-white/15 text-white hover:border-sky-400/50'
                    : 'bg-white/88 border-slate-300 text-slate-900 hover:border-blue-500/60'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-white/[0.08]' : 'bg-slate-900/[0.06]'}`}>
                  {renderToolIcon()}
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[12px] font-bold truncate max-w-[140px]">{meta.label}</div>
                  {tool.id === 'clock' ? (
                    <div className="text-[11px] font-mono opacity-85">
                      <LumaTaskbarClock
                        orientation="horizontal"
                        timeFormat={timeFormat}
                        showSeconds={showSeconds}
                        showDate={false}
                        clockAccentColor={clockAccentColor}
                        clockBlinkColon={clockBlinkColon}
                        locale={locale}
                        mutedCls={mutedCls}
                      />
                    </div>
                  ) : (
                    <div className="text-[10px] opacity-65 font-mono truncate max-w-[140px]">{liveSub}</div>
                  )}
                </div>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDesktopTaskbarTool(tool.id, false);
                  }}
                  title="Убрать плитку со стола"
                  className="opacity-0 group-hover:opacity-100 -mr-1.5 w-5 h-5 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== LAYER 2: DYNAMIC ISLAND 2.5 (ALWAYS-ON-TOP z-[9400] + 6 POSITIONS + 4 THEMES + NATIVE WIN32 OVERLAY) ==================== */}
      {dynamicIslandEnabled && !(islandPinOverAllWindows && islandAlwaysOverLuma && nativeIslandOverlayActive) && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            ...islandAnchorStyle,
            opacity: Math.max(0.55, Math.min(1, islandOpacity / 100)),
          }}
          className={`fixed ${islandHorizontalCls} z-[9400] flex items-center gap-1.5 luma-noise-surface ${
            islandClickThrough ? 'pointer-events-none' : ''
          } ${
            visualNoiseHidden && !islandShowInFullscreen
              ? isIslandBottom
                ? 'luma-noise-hidden-bottom'
                : 'luma-noise-hidden-top'
              : ''
          }`}
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
              islandGlowEnabled || displayMediaPlaying || islandRubberPhase !== 'idle'
                ? { boxShadow: '0 0 28px -2px var(--luma-accent-border), 0 12px 30px rgba(0,0,0,0.52)' }
                : undefined
            }
            className={`luma-island-pill ${islandHeightCls} pl-3 pr-2.5 rounded-full border shadow-xl flex items-center gap-2.5 cursor-pointer whitespace-nowrap transition-transform duration-200 ${islandSurfaceThemeCls} ${
              islandHoverExpand ? 'hover:scale-[1.035]' : ''
            } ${
              islandRubberPhase === 'expand'
                ? 'luma-island-rubber-expand border-sky-400/80 px-4'
                : islandRubberPhase === 'snap'
                ? 'luma-island-rubber-snap border-[var(--luma-accent)]/70'
                : islandPulse
                ? 'luma-island-pulse border-[var(--luma-accent)]/70'
                : displayMediaPlaying
                ? 'luma-island-playing border-[var(--luma-accent)]/45'
                : ''
            }`}
          >
            {islandPulse ? (
              <>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    islandPulse.kind === 'telegram'
                      ? 'bg-sky-500/25 text-sky-400'
                      : islandPulse.kind === 'discord'
                      ? 'bg-indigo-500/25 text-indigo-400'
                      : islandPulse.kind === 'whatsapp'
                      ? 'bg-emerald-500/25 text-emerald-400'
                      : 'bg-[var(--luma-accent)]/20 text-[var(--luma-accent)]'
                  }`}
                >
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
                  ) : islandPulse.kind === 'telegram' ||
                    islandPulse.kind === 'discord' ||
                    islandPulse.kind === 'whatsapp' ||
                    islandPulse.kind === 'messenger' ? (
                    <MessageSquare className="w-3 h-3" />
                  ) : islandPulse.kind === 'notification' || islandPulse.kind === 'system' ? (
                    <Bell className="w-3 h-3" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold truncate max-w-[200px]">
                    {islandPulse.title}
                  </span>
                  {islandPulse.detail && (
                    <span className="text-[10px] font-mono opacity-80 truncate max-w-[180px]">
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
                            i % 2 === 0 ? 'bg-[var(--luma-accent)]' : islandStyle === 'frosted' ? 'bg-slate-700' : 'bg-white/90'
                          }`}
                          style={{ animationDelay: `${delay}s`, animationDuration: `${0.58 + (i % 3) * 0.16}s` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dndEnabled ? 'bg-zinc-400' : 'bg-[var(--luma-accent)]'}`} />
                )}

                <span className={`text-[11px] font-mono truncate ${islandSize === 'expanded' ? 'max-w-[240px]' : islandSize === 'compact' ? 'max-w-[120px]' : 'max-w-[180px]'}`}>
                  {islandShowDownloads && activeIslandProgress
                    ? `${activeIslandProgress.label} · ${activeIslandProgress.percent}%`
                    : islandTimerRunning
                    ? `⏱ ${formatLiveClock(islandTimerRemainingSec)}`
                    : islandStopwatchRunning
                    ? `⏱ ${formatLiveClock(islandStopwatchSec)}`
                    : displayMediaPlaying || hasLiveOsMedia
                    ? displayTrackTitle
                    : islandShowWeather && liveSystem?.location?.city
                    ? liveSystem.location.city
                    : clipboardHistory[0]?.text
                    ? `Буфер: ${clipboardHistory[0].text}`
                    : `События: ${unreadNotifCount}`}
                </span>

                {islandShowDownloads && activeIslandProgress && (
                  <div className="w-12 h-1.5 rounded-full bg-white/15 overflow-hidden shrink-0">
                    <div
                      className="h-full rounded-full bg-[var(--luma-accent)] transition-all duration-200"
                      style={{ width: `${Math.max(4, Math.min(100, activeIslandProgress.percent))}%` }}
                    />
                  </div>
                )}

                {islandShowTelemetry && islandSize !== 'compact' && (
                  <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono opacity-80 pl-1.5 border-l border-current/15">
                    <span>CPU {Math.round(cpuLoad)}%</span>
                    <span>RAM {Math.round(ramLoad)}%</span>
                  </span>
                )}

                {islandShowBattery && islandSize !== 'compact' && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono opacity-80 pl-1.5 border-l border-current/15">
                    <BatteryCharging className={`w-3 h-3 ${isCharging ? 'text-[var(--luma-accent)]' : ''}`} />
                    {batteryLevel}%
                  </span>
                )}

                {islandShowClock && (
                  <span className="inline-flex items-center text-[10px] font-mono font-bold pl-1.5 border-l border-current/15">
                    {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12' })}
                  </span>
                )}

                {islandShowClip && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openIslandTab('clipboard');
                    }}
                    title={`Буфер обмена Luma Island (${clipboardHistory.length})`}
                    className="px-1.5 py-0.5 rounded-full bg-current/10 hover:bg-current/20 text-[10px] font-mono inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <Clipboard className="w-3 h-3 text-[var(--luma-accent)]" />
                    <span>{clipboardHistory.length}</span>
                  </button>
                )}

                {liveMediaSessionsList.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openIslandTab('player');
                    }}
                    title="Выбрать активный плеер"
                    className="px-1.5 py-0.5 rounded-full bg-[var(--luma-accent)]/25 text-[var(--luma-accent)] border border-[var(--luma-accent)]/40 text-[10px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer hover:bg-[var(--luma-accent)] hover:text-white transition"
                  >
                    <Music className="w-2.5 h-2.5" />
                    <span>{liveMediaSessionsList.length}</span>
                  </button>
                )}

                {islandShowEq && (
                  <div
                    className="flex items-center gap-0.5 pl-1.5 border-l border-current/15"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button onClick={handlePrevTrack} className="p-1 rounded-full hover:bg-current/15 cursor-pointer">
                      <SkipBack className="w-3 h-3" />
                    </button>
                    <button onClick={handleToggleMediaPlay} className="p-1 rounded-full bg-[var(--luma-accent)] text-white cursor-pointer">
                      {displayMediaPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                    </button>
                    <button onClick={handleNextTrack} className="p-1 rounded-full hover:bg-current/15 cursor-pointer">
                      <SkipForward className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {!islandClickThrough && (
            <button
              onClick={handleToggleDynamicIsland}
              title="Скрыть Luma Island"
              className={`w-7 h-7 rounded-full border flex items-center justify-center cursor-pointer transition ${
                islandStyle === 'frosted'
                  ? 'bg-white/90 text-slate-600 hover:text-slate-900 border-slate-300'
                  : 'bg-[#0a0a0c]/90 text-zinc-400 hover:text-white border-white/15'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
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
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.apps || null}
          zIndex={getWinZ('apps')}
          alwaysOnTop={Boolean(windows.apps.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('apps')}
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
                                {renderAppVisual(
                                  app,
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
                                {renderAppVisual(app, 'w-5 h-5 shrink-0')}
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
                                  {renderAppVisual(app, 'w-5 h-5 shrink-0')}
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
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.explorer || null}
          zIndex={getWinZ('explorer')}
          alwaysOnTop={Boolean(windows.explorer.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('explorer')}
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
            onQuickLook={openQuickLook}
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
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.taskmgr || null}
          zIndex={getWinZ('taskmgr')}
          alwaysOnTop={Boolean(windows.taskmgr.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('taskmgr')}
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
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.terminal || null}
          zIndex={getWinZ('terminal')}
          alwaysOnTop={Boolean(windows.terminal.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('terminal')}
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

      {/* WINDOW 3: SESSION TRACKER & LIMITS 2.0 */}
      {isWinVisible('tracker') && (
        <DexWindow
          id="tracker"
          title={t('tracker', 'Трекер сессий и лимитов 2.0')}
          subtitle="Luma + Окна Windows · Лимиты · Фокус"
          icon={<BarChart3 className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.tracker || null}
          zIndex={getWinZ('tracker')}
          alwaysOnTop={Boolean(windows.tracker.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('tracker')}
          initialWidth={920}
          initialHeight={620}
          onFocus={() => focusWindow('tracker')}
          onMinimize={() => minimizeWindow('tracker')}
          onClose={() => closeWindow('tracker')}
        >
          <LumaTrackerWindow
            isDark={isDark}
            apps={combinedApps}
            hostWindows={hostWindows}
            hostUsageSeconds={hostUsageSeconds}
            hostLimitsMinutes={hostLimitsMinutes}
            dailyHistoryMinutes={dailyHistoryMinutes}
            strictFocusLock={strictFocusLock}
            surfaceCls={surfaceCls}
            btnCls={btnCls}
            mutedCls={mutedCls}
            onChangeAppLimit={(appId, minutes) => {
              setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, dailyLimitMinutes: minutes } : a)));
              pushToast('Лимит обновлён', minutes > 0 ? `Установлен лимит ${minutes} мин/день` : 'Лимит снят', 'info');
            }}
            onChangeHostLimit={(key, minutes) => {
              setHostLimitsMinutes((prev) => {
                const next = { ...prev, [key]: minutes };
                try {
                  localStorage.setItem('luma_tracker_host_limits_v2', JSON.stringify(next));
                } catch {
                  /* ignore */
                }
                return next;
              });
              warnedLimitsRef.current.delete(key);
              pushToast('Лимит Windows', minutes > 0 ? `Лимит ${minutes} мин/день сохранён` : 'Лимит снят', 'info');
            }}
            onToggleStrictLock={() => setStrictFocusLock((v) => !v)}
            onStopLumaApp={(appId) => handleStopApp(appId)}
            onKillHostPid={(pid) => void handleKillHostProcess(pid, false)}
            onPushToast={pushToast}
          />
        </DexWindow>
      )}

      {/* WINDOW 4: SUPERCHARGED LUMA KERNEL, MONITOR, JSON-RPC, LIVE EVENT LOG & SEARCHABLE CODE */}
      {isWinVisible('kernel') && (
        <DexWindow
          id="kernel"
          title="Ядро LumaCore 1.5 (ПО 1.4 Boron)"
          subtitle={kernelConnected ? 'CONNECTED · 127.0.0.1:49215' : 'STANDALONE'}
          icon={<Code2 className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.kernel || null}
          zIndex={getWinZ('kernel')}
          alwaysOnTop={Boolean(windows.kernel.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('kernel')}
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
                  onClick={() => void runKernelDiagnostics(true)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold cursor-pointer inline-flex items-center gap-1.5 ${btnCls}`}
                  title="Диагностика LumaCore 1.5 + освобождение памяти GC"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  Очистить RAM ядра (GC)
                </button>
                <button
                  onClick={() => openWindow('taskmgr')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold cursor-pointer inline-flex items-center gap-1.5 ${btnCls}`}
                >
                  <Cpu className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                  Диспетчер задач
                </button>
                <a
                  href="/LumaOS_1.6.2.exe"
                  download="LumaOS_1.6.2.exe"
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-mono font-bold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  LumaOS_1.6.2.exe
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
                        sub: `${ramLoad}% занято · LumaCore 1.6.2`,
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
                      ['Версия ПО', '1.7.3 (Oxygen · O-8)'],
                      ['Версия Ядра', 'LumaCore 1.6.2 (1.7.1)'],
                      ['Безопасность', `LumaShield 3.2 (${kernelDiag?.security_rules ?? 340}+ правил)`],
                      ['Developer SDK', `v3.0 (${kernelDiag?.sdk_themes ?? Object.keys(customThemes).length} тем / ${kernelDiag?.sdk_plugins ?? plugins.length} плаг.)`],
                      ['Шина IPC', kernelConnected ? '127.0.0.1:49215' : 'STANDALONE'],
                      ['LumaGuard', `AES-256 #${cryptoKeyVersion}`],
                      ['Память ядра', kernelDiag ? `${kernelDiag.heap_alloc_mb} МБ · ${kernelDiag.goroutines} gor.` : 'Нажмите GC выше'],
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
                          kernel_engine_version: '1.3',
                          software_version: '1.4 (Boron)',
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

      {/* ==================== LUMA OS 1.5.2 CARBON: TRASH, SCENARIOS, CODE STUDIO, CUT STUDIO & OFFICE STUDIO (ZERO-LOSS ON MINIMIZE!) ==================== */}
      {windows.trash.open && (
        <div style={{ display: isWinVisible('trash') ? 'contents' : 'none' }}>
          <DexWindow
            id="trash"
            title="Корзина Luma OS"
            subtitle="Системная корзина Pro · Массовые операции · Превью · Автоочистка"
            icon={<Trash2 className="w-4 h-4" />}
            isDark={isDark}
            designStyle={designStyle}
            windowControlsStyle={windowControlsStyle}
            taskbarPosition={taskbarPosition}
            taskbarSizePx={effectiveTaskbarSizePx}
            topBarOffsetPx={dualTaskbarMode ? 46 : 0}
            snapCommand={snapCommands.trash || null}
            zIndex={getWinZ('trash')}
            alwaysOnTop={Boolean(windows.trash.alwaysOnTop)}
            onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('trash')}
            initialWidth={860}
            initialHeight={580}
            onFocus={() => focusWindow('trash')}
            onMinimize={() => minimizeWindow('trash')}
            onClose={() => closeWindow('trash')}
          >
            <LumaTrashWindow
              isDark={isDark}
              deleteAnimStyle={deleteAnimStyle}
              onCountChange={(c) => setTrashCount(c)}
              onNotify={(title, msg, kind) => pushToast(title, msg, kind === 'warn' ? 'warning' : kind || 'info')}
            />
          </DexWindow>
        </div>
      )}

      {windows.scenarios.open && (
        <div style={{ display: isWinVisible('scenarios') ? 'contents' : 'none' }}>
          <DexWindow
            id="scenarios"
            title="Сценарии автоматизации Pro"
            subtitle="17 триггеров · Условия «И» · 22 действия · Цепочки"
            icon={<Zap className="w-4 h-4" />}
            isDark={isDark}
            designStyle={designStyle}
            windowControlsStyle={windowControlsStyle}
            taskbarPosition={taskbarPosition}
            taskbarSizePx={effectiveTaskbarSizePx}
            topBarOffsetPx={dualTaskbarMode ? 46 : 0}
            snapCommand={snapCommands.scenarios || null}
            zIndex={getWinZ('scenarios')}
            alwaysOnTop={Boolean(windows.scenarios.alwaysOnTop)}
            onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('scenarios')}
            initialWidth={940}
            initialHeight={620}
            onFocus={() => focusWindow('scenarios')}
            onMinimize={() => minimizeWindow('scenarios')}
            onClose={() => closeWindow('scenarios')}
          >
            <LumaScenariosWindow
              isDark={isDark}
              scenarios={scenarios}
              onChangeScenarios={setScenarios}
              onExecuteScenario={executeScenarioRule}
            />
          </DexWindow>
        </div>
      )}

      {windows.code_studio.open && (
        <div style={{ display: isWinVisible('code_studio') ? 'contents' : 'none' }}>
          <DexWindow
            id="code_studio"
            title="Luma Code Studio Pro"
            subtitle="IDE 1.6.2 · Luma AI 5.0 · Live диагностика · Pro Терминал · Автосохранение"
            icon={<Code2 className="w-4 h-4" />}
            isDark={isDark}
            designStyle={designStyle}
            windowControlsStyle={windowControlsStyle}
            taskbarPosition={taskbarPosition}
            taskbarSizePx={effectiveTaskbarSizePx}
            topBarOffsetPx={dualTaskbarMode ? 46 : 0}
            snapCommand={snapCommands.code_studio || null}
            zIndex={getWinZ('code_studio')}
            alwaysOnTop={Boolean(windows.code_studio.alwaysOnTop)}
            onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('code_studio')}
            initialWidth={1120}
            initialHeight={700}
            onFocus={() => focusWindow('code_studio')}
            onMinimize={() => minimizeWindow('code_studio')}
            onClose={() => closeWindow('code_studio')}
          >
            <LumaCodeStudioWindow
              isDark={isDark}
              onNotify={(title, msg, kind) => pushToast(title, msg, kind === 'warn' ? 'warning' : kind || 'info')}
            />
          </DexWindow>
        </div>
      )}

      {windows.cut_studio.open && (
        <div style={{ display: isWinVisible('cut_studio') ? 'contents' : 'none' }}>
          <DexWindow
            id="cut_studio"
            title="Luma Cut Studio Pro"
            subtitle="Многодорожечный Pro-монтаж · Маски/Хромакей · ИИ EditPilot · Озвучка · Design Studio"
            icon={<Film className="w-4 h-4" />}
            isDark={isDark}
            designStyle={designStyle}
            windowControlsStyle={windowControlsStyle}
            taskbarPosition={taskbarPosition}
            taskbarSizePx={effectiveTaskbarSizePx}
            topBarOffsetPx={dualTaskbarMode ? 46 : 0}
            snapCommand={snapCommands.cut_studio || null}
            zIndex={getWinZ('cut_studio')}
            alwaysOnTop={Boolean(windows.cut_studio.alwaysOnTop)}
            onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('cut_studio')}
            initialWidth={1180}
            initialHeight={740}
            onFocus={() => focusWindow('cut_studio')}
            onMinimize={() => minimizeWindow('cut_studio')}
            onClose={() => closeWindow('cut_studio')}
          >
            <LumaCutStudioWindow
              isDark={isDark}
              onNotify={(title, msg, kind) => pushToast(title, msg, kind === 'warn' ? 'warning' : kind || 'info')}
            />
          </DexWindow>
        </div>
      )}

      {windows.office.open && (
        <div style={{ display: isWinVisible('office') ? 'contents' : 'none' }}>
          <DexWindow
            id="office"
            title="Luma Office Studio Pro"
            subtitle="Word (.docx) · Excel 35+ формул (.xlsx) · PowerPoint F5 + Лазер (.pptx) · PDF"
            icon={<FileText className="w-4 h-4" />}
            isDark={isDark}
            designStyle={designStyle}
            windowControlsStyle={windowControlsStyle}
            taskbarPosition={taskbarPosition}
            taskbarSizePx={effectiveTaskbarSizePx}
            topBarOffsetPx={dualTaskbarMode ? 46 : 0}
            snapCommand={snapCommands.office || null}
            zIndex={getWinZ('office')}
            alwaysOnTop={Boolean(windows.office.alwaysOnTop)}
            onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('office')}
            initialWidth={1200}
            initialHeight={750}
            onFocus={() => focusWindow('office')}
            onMinimize={() => minimizeWindow('office')}
            onClose={() => closeWindow('office')}
          >
            <LumaOfficeSuiteWindow
              isDark={isDark}
              onNotify={(title, body, level) =>
                pushToast(
                  title,
                  body,
                  level === 'ok' ? 'success' : level === 'warn' || level === 'danger' ? 'warning' : 'info'
                )
              }
            />
          </DexWindow>
        </div>
      )}

      {/* WINDOW 4B: LUMA GAMEPAD STUDIO (DS4WINDOWS ALTERNATIVE — ITEM 8) */}
      {windows.gamepad.open && (
        <div style={{ display: isWinVisible('gamepad') ? 'contents' : 'none' }}>
          <DexWindow
            id="gamepad"
            title="Luma Gamepad Studio"
            subtitle="DualShock 4 · DualSense · Xbox XInput · HID · 60 FPS · RGB · Вибрация · Эмуляция"
            icon={<Gamepad2 className="w-4 h-4 text-sky-400" />}
            isDark={isDark}
            designStyle={designStyle}
            windowControlsStyle={windowControlsStyle}
            taskbarPosition={taskbarPosition}
            taskbarSizePx={effectiveTaskbarSizePx}
            topBarOffsetPx={dualTaskbarMode ? 46 : 0}
            snapCommand={snapCommands.gamepad || null}
            zIndex={getWinZ('gamepad')}
            alwaysOnTop={Boolean(windows.gamepad.alwaysOnTop)}
            onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('gamepad')}
            initialWidth={1060}
            initialHeight={690}
            onFocus={() => focusWindow('gamepad')}
            onMinimize={() => minimizeWindow('gamepad')}
            onClose={() => closeWindow('gamepad')}
          >
            <LumaGamepadStudioWindow
              kernelBase=""
              isDarkTheme={isDark}
              onNotify={(title, msg) => pushToast(title, msg, 'success')}
            />
          </DexWindow>
        </div>
      )}

      {/* WINDOW 4C: LUMA UNINSTALLER & LEFTOVER CLEANER (REVO / BCUNINSTALLER ANALOG — ITEM 9) */}
      {windows.uninstaller.open && (
        <div style={{ display: isWinVisible('uninstaller') ? 'contents' : 'none' }}>
          <DexWindow
            id="uninstaller"
            title="Luma Uninstaller & Очистка хвостов"
            subtitle="4-этапный сканер остатков · AppData · Program Files · Реестр HKCU/HKLM · Службы · Автобэкап"
            icon={<Trash2 className="w-4 h-4 text-rose-400" />}
            isDark={isDark}
            designStyle={designStyle}
            windowControlsStyle={windowControlsStyle}
            taskbarPosition={taskbarPosition}
            taskbarSizePx={effectiveTaskbarSizePx}
            topBarOffsetPx={dualTaskbarMode ? 46 : 0}
            snapCommand={snapCommands.uninstaller || null}
            zIndex={getWinZ('uninstaller')}
            alwaysOnTop={Boolean(windows.uninstaller.alwaysOnTop)}
            onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('uninstaller')}
            initialWidth={1040}
            initialHeight={690}
            onFocus={() => focusWindow('uninstaller')}
            onMinimize={() => minimizeWindow('uninstaller')}
            onClose={() => closeWindow('uninstaller')}
          >
            <LumaUninstallerWindow
              kernelBase=""
              isDarkTheme={isDark}
              onNotify={(title, msg) => pushToast(title, msg, 'success')}
            />
          </DexWindow>
        </div>
      )}

      {/* WINDOW 4D: OXYGEN CONNECT (ANDROID COMPANION — СТИЛЬ ОС · 1.7.3 OXYGEN) */}
      {windows.oxygen_connect.open && (
        <div style={{ display: isWinVisible('oxygen_connect') ? 'contents' : 'none' }}>
          <DexWindow
            id="oxygen_connect"
            title="Oxygen Connect · Связь с телефоном"
            subtitle="Стиль ОС · QR-код · Фото с камеры на ПК · Общий буфер · Тачпад и Медиа-пульт"
            icon={<Smartphone className="w-4 h-4 text-sky-400" />}
            isDark={isDark}
            designStyle={designStyle}
            windowControlsStyle={windowControlsStyle}
            taskbarPosition={taskbarPosition}
            taskbarSizePx={effectiveTaskbarSizePx}
            topBarOffsetPx={dualTaskbarMode ? 46 : 0}
            snapCommand={snapCommands.oxygen_connect || null}
            zIndex={getWinZ('oxygen_connect')}
            alwaysOnTop={Boolean(windows.oxygen_connect.alwaysOnTop)}
            onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('oxygen_connect')}
            initialWidth={1020}
            initialHeight={680}
            onFocus={() => focusWindow('oxygen_connect')}
            onMinimize={() => minimizeWindow('oxygen_connect')}
            onClose={() => closeWindow('oxygen_connect')}
          >
            <LumaOxygenConnectWindow
              isDark={isDark}
              onPushToast={pushToast}
              onCopyToClipboard={(txt) => void copyTextToClipboard(txt)}
            />
          </DexWindow>
        </div>
      )}

      {/* WINDOW: LUMA PHOTO STUDIO (1.7.3 BUILT-IN SYSTEM PHOTO EDITOR) */}
      {windows.photo_editor.open && (
        <div style={{ display: isWinVisible('photo_editor') ? 'contents' : 'none' }}>
          <DexWindow
            id="photo_editor"
            title="Luma Photo Studio 1.7.3"
            subtitle="Встроенный редактор фото · 12 фильтров · Свет/Цвет · Обрезка · Рисование · До/После · Экспорт"
            icon={<Image className="w-4 h-4 text-sky-400" />}
            isDark={isDark}
            designStyle={designStyle}
            windowControlsStyle={windowControlsStyle}
            taskbarPosition={taskbarPosition}
            taskbarSizePx={effectiveTaskbarSizePx}
            topBarOffsetPx={dualTaskbarMode ? 46 : 0}
            snapCommand={snapCommands.photo_editor || null}
            zIndex={getWinZ('photo_editor')}
            alwaysOnTop={Boolean(windows.photo_editor.alwaysOnTop)}
            onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('photo_editor')}
            initialWidth={1120}
            initialHeight={720}
            onFocus={() => focusWindow('photo_editor')}
            onMinimize={() => minimizeWindow('photo_editor')}
            onClose={() => closeWindow('photo_editor')}
          >
            <LumaPhotoEditorWindow
              key={photoEditorKey}
              initialPath={photoEditorPath}
              isDark={isDark}
              isPro={editionInfo.is_pro}
              onSetWallpaper={(url) => setWallpaperImageUrl(url)}
              onPushToast={pushToast}
            />
          </DexWindow>
        </div>
      )}

      {/* WINDOW: СТИЛЬ ОС SUPERDEVICE ECOSYSTEM HUB (1.7.3) */}
      {windows.superdevice.open && (
        <div style={{ display: isWinVisible('superdevice') ? 'contents' : 'none' }}>
          <DexWindow
            id="superdevice"
            title="Суперустройство · Экосистема Luma OS 1.7.3"
            subtitle="Стиль ОС · Перетащите устройство на ПК для объединения в экосистему"
            icon={<Radio className="w-4 h-4 text-blue-400" />}
            isDark={isDark}
            designStyle={designStyle}
            windowControlsStyle={windowControlsStyle}
            taskbarPosition={taskbarPosition}
            taskbarSizePx={effectiveTaskbarSizePx}
            topBarOffsetPx={dualTaskbarMode ? 46 : 0}
            snapCommand={snapCommands.superdevice || null}
            zIndex={getWinZ('superdevice')}
            alwaysOnTop={Boolean(windows.superdevice.alwaysOnTop)}
            onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('superdevice')}
            initialWidth={980}
            initialHeight={690}
            onFocus={() => focusWindow('superdevice')}
            onMinimize={() => minimizeWindow('superdevice')}
            onClose={() => closeWindow('superdevice')}
          >
            <LumaSuperDeviceWindow
              isDark={isDark}
              isPro={editionInfo.is_pro}
              onOpenWindow={(w) => {
                if (w === 'window_rules') openWindow('settings', 'window_rules');
                else openWindow(w as DexWinId);
              }}
              onOpenLens={() => setLensSearchOpen(true)}
              onOpenClipboard={() => setSmartClipboardOpen(true)}
              onPushToast={pushToast}
            />
          </DexWindow>
        </div>
      )}

      {/* WINDOW 5: SYSTEM SETTINGS (1.7.2 OXYGEN) */}
      {isWinVisible('settings') && (
        <DexWindow
          id="settings"
          title={t('settings', 'Настройки системы')}
          subtitle="Luma OS 1.7.3 (Oxygen · O-8 · LumaCore 1.6.2 · LumaShield 3.2)"
          icon={<Settings className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.settings || null}
          zIndex={getWinZ('settings')}
          alwaysOnTop={Boolean(windows.settings.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('settings')}
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
                    ['kernel_ui', t('tabKernelUI', 'Ядро UI · Dev & Admin'), <Cpu className="w-4 h-4 shrink-0" />, 'ядро ui имя устройства модель версия по 1.7 oxygen разработчик dev hud администратор uac пасхалка kernel'],
                    ['window_rules', 'Правила окон (KWin)', <Layers className="w-4 h-4 shrink-0" />, 'правила окон kwin монитор 2-й монитор справа без рамки калькулятор поверх всех окон игра композитор уведомления dnd telegram window rules'],
                    ['mouse_dpi', 'Мышь и DPI', <MousePointer2 className="w-4 h-4 shrink-0" />, 'мышь скорость dpi edpi сенсор курсор чувствительность raw input колесо mouse'],
                    ['graphics', 'Графика и Экран', <Monitor className="w-4 h-4 shrink-0" />, 'графика gpu цп оптимизация lumacore 1.6.0 турбо эко адаптация экрана масштаб монитор ноутбук размытие blur тени fps'],
                    ['security', t('tabSecurity', 'Безопасность 3.2'), <ShieldCheck className="w-4 h-4 shrink-0" />, 'безопасность антивирус lumashield 3.2 340 правил hosts dns сетевой экран tcp аудит автозагрузки задачи guard defender карантин eicar security'],
                    ['ai_settings', t('tabAI', 'Luma Ai Nitrogen'), <Sparkles className="w-4 h-4 shrink-0" />, 'ии нейросети luma ai nitrogen память источники википедия перевод объём голос gemini openai ai'],
                    ['power_battery', 'Питание и Батарея', <BatteryCharging className="w-4 h-4 shrink-0" />, 'питание батарея экран акб беспроводные 2.4ghz радиоканал мышь клавиатура наушники циклы зарядки энергосбережение яркость сон выключение battery power'],
                    ['language', t('tabLanguage', 'Язык и клавиатура'), <Languages className="w-4 h-4 shrink-0" />, 'язык клавиатура раскладка адаптивная keyboard layout 120 стран мира language english romanian polish turkish arabic korean регион'],
                    ['shell_mode', t('tabShellMode', 'Оболочка Windows'), <Monitor className="w-4 h-4 shrink-0" />, 'оболочка windows полный экран fullscreen автозапуск autostart поверх виндовс скрыть панель задач chrome'],
                    ['appearance', t('tabThemes', 'Темы, Luma Nova и Обои'), <Sliders className="w-4 h-4 shrink-0" />, 'темы обои oxygen 1.7 nitrogen nova matrix glass стиль живые анимации виджеты прозрачность фон акцент шрифт масштаб blur скругление wallpaper theme'],
                    ['taskbar', t('tabTaskbar', 'Панель задач · Папка Luma'), <LayoutPanelLeft className="w-4 h-4 shrink-0" />, 'панель задач папка luma система скрыть добавить перетащить автоскрытие клавиша win умный dock стеки загрузки наведение буфер обмена cpu ram полный экран taskbar'],
                    ['storage', t('tabStorage', 'Виртуальная память и Диски'), <HardDrive className="w-4 h-4 shrink-0" />, 'память виртуальная swapboost 2 4 6 гб pagefile ssd tbw озу ram диски накопители проводник скрытые файлы storage disk files'],
                    ['bluetooth', t('tabBluetooth', 'Bluetooth и 2.4GHz'), <Bluetooth className="w-4 h-4 shrink-0" />, 'bluetooth блютуз беспроводные мышь клавиатура наушники 2.4ghz радиоканал заряд процент адаптер устройства'],
                    ['apps_list', t('apps', 'Приложения и иконки'), <AppWindow className="w-4 h-4 shrink-0" />, 'приложения иконки размер увеличить редактировать программы список удалить свойства apps'],
                    ['notifications', t('notifications', 'Уведомления'), <Bell className="w-4 h-4 shrink-0" />, 'уведомления оповещения справа звук баннеры dnd не беспокоить журнал notifications'],
                    ['island', t('tabIsland', 'Luma Island'), <Disc3 className="w-4 h-4 shrink-0" />, 'luma island 2.0 динамический остров анимации музыка плееры буфер обмена заметка эквалайзер таймер'],
                    ['clock', t('tabClock', 'Часы'), <Clock className="w-4 h-4 shrink-0" />, 'часы циферблат время секунды дата свечение формат clock'],
                    ['luma', 'Система и Железо', <Activity className="w-4 h-4 shrink-0" />, 'система железо процессор видеокарта vram cpu gpu регион погода музыка'],
                    ['navigation', 'Управление · Спецвозможности', <MousePointerClick className="w-4 h-4 shrink-0" />, 'управление спецвозможности доступность жесты 3 пальца вниз скриншот обвести для поиска lens пкм плагины расширения навигация назад горячие клавиши alt+r'],
                    ['plugins', 'Окна и SDK v3.0', <LayoutGrid className="w-4 h-4 shrink-0" />, 'окна плагины api sdk 3.0 темы колонки сетка расширения разработчик'],
                    ['updater', t('tabUpdater', 'Обновления и Откат'), <Stethoscope className="w-4 h-4 shrink-0" />, 'обновления откат версии анимация cinema rollback downgrade github ota ежедневная проверка патч прогресс бар новая версия'],
                    ['about', t('tabAbout', 'О системе'), <Info className="w-4 h-4 shrink-0" />, 'о системе версия 1.7 oxygen история изменений changelog exe скачать'],
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
                  devModeEnabled={devModeEnabled}
                  onToggleDevMode={setDevModeEnabled}
                  onPushToast={pushToast}
                />
              )}

              {settingsTab === 'window_rules' && (
                <LumaWindowRulesPanel
                  isDark={isDark}
                  surfaceCls={surfaceCls}
                  btnCls={btnCls}
                  mutedCls={mutedCls}
                  onPushToast={pushToast}
                />
              )}

              {settingsTab === 'mouse_dpi' && (
                <LumaMouseDpiPanel
                  isDark={isDark}
                  surfaceCls={surfaceCls}
                  btnCls={btnCls}
                  mutedCls={mutedCls}
                  wirelessDevices={wirelessBatteries}
                  onNotify={pushToast}
                />
              )}

              {/* GRAPHICS, GPU OPTIMIZATION & ADAPTIVE DISPLAY SCALING (1.3 LITHIUM · LUMACORE 1.3) */}
              {settingsTab === 'graphics' && (
                <div className="space-y-4 text-xs">
                  {/* 0. LumaCore 1.4 True Zero-WMI & Zero-PowerShell Engine Banner */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          LumaCore 1.4 · True Zero-WMI Engine (ЦП и GPU)
                        </div>
                        <div className={`mt-0.5 ${mutedCls}`}>
                          0 вызовов WMI (WMI Provider Host 24% → 0%), чистые Win32 API (SetupDi, Power API, Registry), 0% GPU при сворачивании и кэш аудио
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          applyGpuProfile('performance');
                          setGlassIntensity('light');
                          pushToast('LumaCore 1.4', 'Включён режим максимальной экономии ЦП и GPU', 'success');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Турбо-Эко (1 клик)
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10px]">
                      <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                        <div className="font-bold text-emerald-400">Zero-WMI Win32</div>
                        <div className={mutedCls}>setupapi, powrprof, Registry, Toolhelp, iphlpapi напрямую</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                        <div className="font-bold text-sky-400">0% GPU и 0 PS в фоне</div>
                        <div className={mutedCls}>Умный Dynamic Island, кэш CoreAudio и Idle-заморозка</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                        <div className="font-bold text-purple-400">Memo-рендер UI</div>
                        <div className={mutedCls}>Изолированные часы, окна и Luma AI (0% ЦП в простое)</div>
                      </div>
                    </div>
                  </div>

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

              {/* UNIFIED POWER, BATTERY, 2.4GHz/BT WIRELESS DEVICES & BRIGHTNESS PANEL */}
              {(settingsTab === 'power_battery' || settingsTab === 'battery' || settingsTab === 'power') && (
                <LumaBatteryPanel
                  isDark={isDark}
                  lang={lang}
                  activePowerPlan={powerProfile}
                  onSelectPowerPlan={handleChangePowerProfile}
                  screenBrightness={screenBrightness}
                  onChangeScreenBrightness={setScreenBrightness}
                  autoSaverThreshold={autoSaverThreshold}
                  onChangeAutoSaverThreshold={setAutoSaverThreshold}
                  reduceEffectsOnSaver={reduceEffectsOnSaver}
                  onToggleReduceEffectsOnSaver={() => setReduceEffectsOnSaver((v) => !v)}
                  onPowerAction={(act) => {
                    void handleExecutePowerAction(act === 'reboot' ? 'restart' : act);
                  }}
                  pinnedWirelessNames={pinnedWirelessNames}
                  onTogglePinWireless={togglePinWirelessDevice}
                  onWirelessDevicesLoaded={(devs) => setWirelessBatteries(devs)}
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

              {/* MULTI-LANGUAGE SETTINGS (36 SYSTEM UI LANGUAGES + 120+ WORLD KEYBOARD LAYOUTS) */}
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

                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
                        Язык интерфейса системы ({LUMA_LANGUAGES.length})
                      </div>
                      <div className="relative w-full sm:w-64">
                        <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${mutedCls}`} />
                        <input
                          type="text"
                          value={langSearchQuery}
                          onChange={(e) => setLangSearchQuery(e.target.value)}
                          placeholder="Поиск языка интерфейса..."
                          className={`w-full pl-8 pr-7 py-1.5 rounded-xl border text-xs outline-none ${btnCls}`}
                        />
                        {langSearchQuery && (
                          <button
                            onClick={() => setLangSearchQuery('')}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer ${mutedCls}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1">
                      {LUMA_LANGUAGES.filter((l) => {
                        const q = langSearchQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          l.name.toLowerCase().includes(q) ||
                          l.englishName.toLowerCase().includes(q) ||
                          l.code.toLowerCase().includes(q) ||
                          l.tag.toLowerCase().includes(q) ||
                          l.locale.toLowerCase().includes(q)
                        );
                      }).map((l) => {
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
                              <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                <span className="truncate">{l.name}</span>
                                {l.rtl && (
                                  <span className="px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 text-[8px] font-mono">
                                    RTL
                                  </span>
                                )}
                              </div>
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

              {/* WINDOWS SHELL MODE (FULLSCREEN ON START, AUTOSTART, HIDE WINDOWS TASKBAR, REPLACE HOTKEYS & TOUCHPAD) */}
              {settingsTab === 'shell_mode' && (
                <div className="space-y-4 text-xs">
                  <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-[var(--luma-accent)]" />
                        Режим оболочки поверх Windows
                      </div>
                      <div className={`mt-0.5 ${mutedCls}`}>
                        Замена системных горячих клавиш и жестов тачпада Windows, автозапуск, полный экран при старте и скрытие панели задач Windows.
                      </div>
                    </div>
                    <button
                      onClick={() => void handleRestoreWindowsTaskbar()}
                      className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer ${btnCls}`}
                    >
                      Восстановить оболочку Windows
                    </button>
                  </div>

                  {/* Flagship 1.6.7 Master Toggle: Замена горячих клавиш и жестов тачпада Windows */}
                  <div
                    onClick={() =>
                      !shellModeSaving &&
                      void handleApplyShellMode({
                        ...shellMode,
                        replace_hotkeys: !shellMode.replace_hotkeys,
                      })
                    }
                    className={`p-4 rounded-2xl border cursor-pointer transition space-y-2.5 ${
                      shellMode.replace_hotkeys
                        ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                        : surfaceCls
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-bold text-[13px] flex items-center gap-2 flex-wrap">
                          <Keyboard className="w-4 h-4 text-[var(--luma-accent)] shrink-0" />
                          <span>Замена горячих клавиш</span>
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-[var(--luma-accent)] text-white">
                            1.6.7
                          </span>
                        </div>
                        <div className={`text-[11px] mt-1 leading-relaxed ${mutedCls}`}>
                          Переводит ключевые системные клавиши в нативную оболочку Luma OS и отключает штатные жесты тачпада Windows на время работы (при выключении или закрытии Luma OS всё автоматически возвращается назад).
                        </div>
                      </div>
                      <StatusPill active={Boolean(shellMode.replace_hotkeys)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                      {[
                        ['Win', 'Открывает меню Пуск Luma OS (или Luma Nova)'],
                        ['Alt + Tab', 'Фирменное окно переключения окон Luma OS'],
                        ['Win + D', 'Мгновенный возврат на рабочий стол Luma OS'],
                        ['Тачпад Windows', 'Жесты Windows 3/4 пальца отключены (Luma активны)'],
                      ].map(([k, desc]) => (
                        <div
                          key={k}
                          className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 ${
                            shellMode.replace_hotkeys
                              ? isDark
                                ? 'bg-black/30 border-cyan-400/30 text-cyan-100'
                                : 'bg-white/80 border-cyan-500/35 text-slate-900'
                              : `${btnCls} opacity-65`
                          }`}
                        >
                          <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent)]/20 text-[var(--luma-accent)] font-bold shrink-0">
                            {k}
                          </span>
                          <span className="truncate">{desc}</span>
                        </div>
                      ))}
                    </div>
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
                        desc: 'Скрывает Shell_TrayWnd / SecondaryTrayWnd во время работы Luma OS — при запуске браузера и других программ панель Windows не видна. Автоматически восстанавливается при выходе из Luma OS или по Ctrl+Alt+Shift+W!',
                        val: shellMode.hide_windows_taskbar,
                      },
                      {
                        key: 'reserve_work_area' as const,
                        title: 'Резервировать место под панель задач Luma (SPI_SETWORKAREA)',
                        desc: 'Развёрнутые окна останавливаются ровно у границы панели Luma и не перекрывают её',
                        val: shellMode.reserve_work_area,
                      },
                      {
                        key: 'always_on_top' as const,
                        title: 'Закрепить окно Luma поверх других окон (Topmost)',
                        desc: 'Удерживает оболочку поверх обычных окон (удобно на втором мониторе; выключите, если работаете в окнах поверх рабочего стола)',
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
                    Экстренное восстановление панели и жестов Windows: <span className="text-[var(--luma-accent)] font-bold">Ctrl + Alt + Shift + W</span> (также всё автоматически возвращается при любом закрытии LumaOS_1.7.3_Pro.exe).
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

                  {/* Luma OS 1.7.2: Modular Panel Bar & KDE/Waybar Scroll Actions + System File Opening */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          Модульная панель виджетов и Scroll Actions (KDE / Waybar)
                        </div>
                        <div className={`mt-0.5 ${mutedCls}`}>
                          Собирайте верхнюю или нижнюю панель из блоков (Погода, Курсы валют, CPU/GPU, Трек, Буфер, Pomodoro) и меняйте их местами перетаскиванием. Колесо мыши над звуком, яркостью, окнами и столами работает без кликов!
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setModularPanelCfg((c) => ({ ...c, enabled: !c.enabled }))}
                          className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer border ${
                            modularPanelCfg.enabled ? 'bg-blue-600 border-blue-400 text-white' : btnCls
                          }`}
                        >
                          {modularPanelCfg.enabled ? 'Модульная панель: ВКЛ' : 'Модульная панель: ВЫКЛ'}
                        </button>
                        <button
                          onClick={() => setModularPanelCfg((c) => ({ ...c, position: c.position === 'top' ? 'bottom' : 'top' }))}
                          className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer border ${btnCls}`}
                        >
                          Позиция: {modularPanelCfg.position === 'top' ? 'Сверху' : 'Снизу'}
                        </button>
                        <button
                          onClick={() => setModularPanelCfg((c) => ({ ...c, scrollActions: !c.scrollActions }))}
                          className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer border ${
                            modularPanelCfg.scrollActions ? 'bg-emerald-600 border-emerald-400 text-white' : btnCls
                          }`}
                        >
                          Scroll Actions: {modularPanelCfg.scrollActions ? 'ВКЛ' : 'ВЫКЛ'}
                        </button>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold">Системное открытие всех файлов через Luma OS (Фото → Фотостудия, Папки → Проводник)</div>
                        <div className={mutedCls}>{sysHandlers.message || 'Фото, папки и документы открываются внутри Luma OS'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={async () => {
                            const r = await fetch('/api/kernel/system-handlers', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ...sysHandlers, register_os: true }),
                            }).catch(() => null);
                            if (r?.ok) {
                              const d = await r.json();
                              setSysHandlers(d);
                              pushToast('Файлы через Luma OS', d.message || 'Интеграция в Windows выполнена', 'success');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold cursor-pointer"
                        >
                          {sysHandlers.os_registered ? '✓ Интегрировано в Windows' : 'Интегрировать в Windows (HKCU)'}
                        </button>
                        {sysHandlers.os_registered && (
                          <button
                            onClick={async () => {
                              const r = await fetch('/api/kernel/system-handlers', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'restore' }),
                              }).catch(() => null);
                              if (r?.ok) {
                                const d = await r.json();
                                setSysHandlers(d);
                                pushToast('Файлы Windows', 'Стандартные ассоциации Windows восстановлены', 'info');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer ${btnCls}`}
                          >
                            Сбросить
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-4 ${surfaceCls}`}>
                    <div className="space-y-2">
                      <div className={mutedCls}>Расположение на экране:</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(
                          [
                            ['bottom', 'Снизу'],
                            ['left', 'Слева'],
                            ['right', 'Справа'],
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

                  {/* Luma OS 1.7.3: Taskbar Style Switcher (Classic vs Glass vs Luma Nova) */}
                  <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold">Стиль панели задач</div>
                        <div className={`text-[11px] ${mutedCls}`}>
                          Мгновенное переключение между классической панелью во всю ширину, плавающим стеклом и Luma Nova
                        </div>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-[var(--luma-accent)] font-bold">
                        {designStyle === 'matrix' ? 'Классическая' : designStyle === 'glass' ? 'Стекло' : 'Luma Nova'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {(
                        [
                          { id: 'matrix' as const, title: 'Классическая панель', desc: 'Во всю ширину экрана, без отступов, с кнопкой «Пуск»' },
                          { id: 'glass' as const, title: 'Стекло (Плавающий док)', desc: 'Скруглённая плавающая стеклянная панель задач' },
                          { id: 'nova' as const, title: 'Luma Nova', desc: 'Компактная верхняя капсула управления вместо Пуска' },
                        ]
                      ).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setDesignStyle(st.id);
                            if (st.id === 'nova') setStartMenuOpen(false);
                            else setNovaPanelOpen(false);
                            pushToast('Стиль панели задач', `Включено: ${st.title}`, 'success');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            designStyle === st.id
                              ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                              : btnCls
                          }`}
                        >
                          <div className="font-bold">{st.title}</div>
                          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{st.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Luma OS 1.7.3: Interactive Taskbar Elements Builder (Drag, Reorder, Tear-off to Desktop, Show/Hide ANY Element) */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <LayoutPanelLeft className="w-4 h-4 text-[var(--luma-accent)]" />
                          Конструктор элементов панели задач (перетаскивание и вынос на стол)
                        </div>
                        <div className={`text-[11px] ${mutedCls}`}>
                          Перетаскивайте любой пункт мышкой прямо на панели задач, выносите кнопки на рабочий стол или скрывайте ненужное
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={resetTaskbarLayout}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer ${btnCls}`}
                      >
                        Сбросить панель
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
                      {taskbarElementsOrder.map((elId, idx) => {
                        const meta = TASKBAR_ELEMENT_META[elId];
                        if (!meta) return null;
                        const isHidden = taskbarHiddenElements.includes(elId);
                        const onDesktop = desktopTaskbarTools.some((t) => t.id === elId);
                        return (
                          <div
                            key={`cfg_tb_${elId}`}
                            className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 ${
                              isHidden ? 'opacity-55 border-white/10' : 'border-white/12 bg-white/[0.03]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-[11px] truncate">{meta.label}</div>
                              <div className={`text-[10px] truncate ${mutedCls}`}>{meta.desc}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveBarElementByStep(elId, -1)}
                                title="Сдвинуть влево"
                                className={`w-6 h-6 rounded-lg border flex items-center justify-center text-[11px] cursor-pointer disabled:opacity-30 ${btnCls}`}
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                disabled={idx === taskbarElementsOrder.length - 1}
                                onClick={() => moveBarElementByStep(elId, 1)}
                                title="Сдвинуть вправо"
                                className={`w-6 h-6 rounded-lg border flex items-center justify-center text-[11px] cursor-pointer disabled:opacity-30 ${btnCls}`}
                              >
                                →
                              </button>
                              {meta.canTearOff && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onDesktop
                                      ? removeDesktopTaskbarTool(elId, false)
                                      : tearOffTaskbarElementToDesktop(elId)
                                  }
                                  title={onDesktop ? 'Убрать плитку со стола' : 'Вытащить на рабочий стол'}
                                  className={`px-2 h-6 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                                    onDesktop
                                      ? 'bg-sky-500 border-sky-400 text-white'
                                      : btnCls
                                  }`}
                                >
                                  {onDesktop ? 'На столе ✓' : 'На стол'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleHideTaskbarElement(elId)}
                                title={isHidden ? 'Вернуть на панель задач' : 'Убрать с панели задач'}
                                className={`px-2 h-6 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                                  isHidden
                                    ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                                    : 'bg-emerald-500/20 border-emerald-400/35 text-emerald-300'
                                }`}
                              >
                                {isHidden ? 'Скрыт' : 'Показан'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        label: 'Двойная панель задач (1.5 Carbon)',
                        sub: 'Верхняя панель — весь функционал, поиск, трей и часы · Нижняя панель — запущенные и закреплённые приложения',
                        active: dualTaskbarMode,
                        toggle: () => {
                          setDualTaskbarMode((v) => {
                            const next = !v;
                            if (next) setTaskbarPosition('bottom');
                            pushToast(
                              'Двойная панель задач',
                              next
                                ? 'Включено: верхняя панель — функционал и трей, нижняя — все приложения'
                                : 'Возвращена единая панель задач',
                              'success'
                            );
                            return next;
                          });
                        },
                      },
                      {
                        label: 'Прямой запуск приложений с панели задач',
                        sub: 'Закрепляйте любые программы ПК прямо на панели задач и запускайте их в 1 клик',
                        active: taskbarDirectLaunch,
                        toggle: () => setTaskbarDirectLaunch((v) => !v),
                      },
                      {
                        label: 'Автоматически скрывать панель задач',
                        sub: 'Скрывает панель и освобождает 100% экрана; плавно появляется при наведении курсора на край экрана',
                        active: taskbarAutoHide,
                        toggle: () => {
                          setTaskbarAutoHide((v) => {
                            const next = !v;
                            setTaskbarHoverOpen(false);
                            pushToast(
                              'Панель задач',
                              next
                                ? 'Автоскрытие включено — наведите курсор на край экрана, чтобы показать панель'
                                : 'Панель задач закреплена на экране',
                              'info'
                            );
                            triggerIslandPulse('Панель задач', next ? 'Автоскрытие ВКЛ' : 'Закреплена', 'info');
                            return next;
                          });
                        },
                      },
                      {
                        label: 'Показывать папку «Luma» на панели задач',
                        sub: 'Добавляет или убирает папку «Luma» (слева по умолчанию, перетаскивается мышью)',
                        active: showLumaSysFolder || taskbarCollapseSysFolder,
                        toggle: () => {
                          const next = !(showLumaSysFolder || taskbarCollapseSysFolder);
                          toggleHideTaskbarElement('luma_folder', !next);
                          if (!next) {
                            setTaskbarCollapseSysFolder(false);
                            setSysFolderOpen(false);
                          }
                          pushToast('Папка «Luma»', next ? 'Папка «Luma» добавлена на панель задач' : 'Папка «Luma» убрана с панели задач', 'info');
                        },
                      },
                      {
                        label: 'Сжать системные приложения в папку',
                        sub: 'Объединяет Проводник, ИИ, Терминал, Настройки и др. в 1 папку «Luma Система»',
                        active: taskbarCollapseSysFolder,
                        toggle: () => {
                          setTaskbarCollapseSysFolder((v) => {
                            const next = !v;
                            if (next) toggleHideTaskbarElement('luma_folder', false);
                            setSysFolderOpen(false);
                            pushToast('Панель задач', next ? 'Системные приложения сжаты в папку «Luma Система»' : 'Системные приложения развёрнуты на панели', 'info');
                            triggerIslandPulse('Панель задач', next ? 'Папка «Luma Система» ВКЛ' : 'Развёрнутый вид', 'info');
                            return next;
                          });
                        },
                      },
                      {
                        label: 'Показывать Полку папок и индикатор загрузок',
                        sub: 'Полка Luma Dock с папками и живым индикатором скачивания на панели',
                        active: showSmartDockShelf,
                        toggle: () => setShowSmartDockShelf((v) => !v),
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
                        sub: 'Живые проценты загрузки рядом с часами (ПКМ → убрать)',
                        active: taskbarShowTelemetry && !taskbarHiddenElements.includes('telemetry'),
                        toggle: () => toggleHideTaskbarElement('telemetry', taskbarShowTelemetry && !taskbarHiddenElements.includes('telemetry')),
                      },
                      {
                        label: 'Кнопка «Буфер обмена» в трее',
                        sub: 'Быстрый доступ к истории буфера (ПКМ → убрать с панели)',
                        active: taskbarShowClipboardBtn && !taskbarHiddenElements.includes('clipboard'),
                        toggle: () => toggleHideTaskbarElement('clipboard', taskbarShowClipboardBtn && !taskbarHiddenElements.includes('clipboard')),
                      },
                      {
                        label: 'Кнопка «На весь экран» в трее',
                        sub: 'Переключатель F11 на панели задач (ПКМ → убрать с панели)',
                        active: taskbarShowFullscreenBtn && !taskbarHiddenElements.includes('fullscreen'),
                        toggle: () => toggleHideTaskbarElement('fullscreen', taskbarShowFullscreenBtn && !taskbarHiddenElements.includes('fullscreen')),
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

                  {/* Luma OS 1.6.2: Position & Mouse-Drag Controls for Папка «Luma» and Полка Dock */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <Folder className="w-4 h-4 text-[var(--luma-accent)]" />
                          Позиция папки «Luma» и Полки Dock на панели задач
                        </div>
                        <div className={`text-[11px] ${mutedCls}`}>
                          По умолчанию папка «Luma» закреплена левее — вы также можете свободно перетаскивать её мышью вдоль панели задач
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(
                        [
                          { id: 'far_left' as const, label: '⬅ Крайне слева' },
                          { id: 'before_apps' as const, label: 'До приложений' },
                          { id: 'after_apps' as const, label: 'По центру' },
                          { id: 'right' as const, label: 'Справа ➡' },
                        ]
                      ).map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => {
                            setShowLumaSysFolder(true);
                            setLumaFolderSlot(pos.id);
                            pushToast('Папка «Luma»', `Позиция: ${pos.label.replace(/[⬅➡]/g, '').trim()}`, 'info');
                          }}
                          className={`px-2.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            lumaFolderSlot === pos.id
                              ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                              : btnCls
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10">
                      <span className={`text-[11px] ${mutedCls}`}>Сторона Полки папок и индикатора загрузок:</span>
                      <div className="flex gap-1.5">
                        {(['left', 'right'] as const).map((side) => (
                          <button
                            key={side}
                            type="button"
                            onClick={() => setSmartDockSide(side)}
                            className={`px-3 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                              smartDockSide === side
                                ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                : btnCls
                            }`}
                          >
                            {side === 'left' ? 'Слева' : 'Справа'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Luma OS 1.7.2 Oxygen: Auto-Hide Visual Noise, Magnetic Dock & System-Wide Spring Animations */}
                  <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold flex items-center gap-2 flex-wrap">
                          <span>Авто-скрытие шума, Магнитный Dock и Пружинные анимации</span>
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 text-[9px] font-mono">1.6.7</span>
                        </div>
                        <div className={`text-[11px] ${mutedCls}`}>
                          Управление пружинной физикой во всей системе (окна, инерция, Dock, меню и панели), авто-скрытием в видео/F11 и магнитным увеличением иконок
                        </div>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-[var(--luma-accent)] font-bold shrink-0">
                        {springAnimationsEnabled ? 'Пружины: ВКЛ' : 'Пружины: ВЫКЛ'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border cursor-pointer ${
                        springAnimationsEnabled ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : btnCls
                      }`}>
                        <div>
                          <div className="text-xs font-bold">Пружинные анимации во всей системе</div>
                          <div className={`text-[10px] ${mutedCls}`}>Упругая физика окон, инерция перетаскивания, отскок Dock, меню и Luma Island</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={springAnimationsEnabled}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setSpringAnimationsEnabled(next);
                            pushToast(
                              'Пружинные анимации',
                              next
                                ? 'Пружинная физика включена во всей системе (окна, меню, Dock и инерция)'
                                : 'Пружинные анимации отключены — активированы быстрые линейные переходы',
                              'info'
                            );
                          }}
                          className="accent-[var(--luma-accent)] w-4 h-4 shrink-0"
                        />
                      </label>
                      <label className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border cursor-pointer ${btnCls}`}>
                        <div>
                          <div className="text-xs font-bold">Авто-скрытие визуального шума</div>
                          <div className={`text-[10px] ${mutedCls}`}>Уводит верхнюю панель, Island и Dock через 2.6с в видео/F11</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoHideNoiseEnabled}
                          onChange={(e) => setAutoHideNoiseEnabled(e.target.checked)}
                          className="accent-[var(--luma-accent)] w-4 h-4 shrink-0"
                        />
                      </label>
                      <label className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border cursor-pointer ${btnCls}`}>
                        <div>
                          <div className="text-xs font-bold">Магнитная физика Dock</div>
                          <div className={`text-[10px] ${mutedCls}`}>Плавное притяжение к курсору, пружинный отскок и ореол рендера</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={magneticDockEnabled}
                          onChange={(e) => setMagneticDockEnabled(e.target.checked)}
                          className="accent-[var(--luma-accent)] w-4 h-4 shrink-0"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Luma OS 1.5 Carbon: Window Controls Style (Classic vs 3 Colored Dots vs 3-Dot Menu) */}
                  <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold">Кнопки управления окном (Свернуть / Развернуть / Закрыть)</div>
                        <div className={`text-[11px] ${mutedCls}`}>
                          Замените стандартные кнопки окна на 3 цветные точки или компактную кнопку «3 точки» (⋯)
                        </div>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-[var(--luma-accent)] font-bold">
                        {windowControlsStyle === 'classic' ? 'Классика' : windowControlsStyle === 'dots3' ? '3 точки ●●●' : 'Меню ⋯'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          ['classic', 'Классические (─ □ ×)', 'Три отдельные иконки в правом углу'],
                          ['dots3', '3 цветные точки (● ● ●)', 'Тактильные точки: свернуть, развернуть, закрыть'],
                          ['menu3', 'Кнопка «3 точки» (⋯)', 'Компактное меню: заменяет все 3 кнопки одной'],
                        ] as const
                      ).map(([id, title, desc]) => (
                        <button
                          key={id}
                          onClick={() => {
                            setWindowControlsStyle(id);
                            pushToast('Кнопки окна', `Выбран стиль: ${title}`, 'info');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            windowControlsStyle === id
                              ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                              : btnCls
                          }`}
                        >
                          <div className="font-bold text-xs">{title}</div>
                          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Luma OS 1.5 Carbon: Direct Launch Quick App Pinner */}
                  {taskbarDirectLaunch && (
                    <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold">Приложения для прямого запуска с панели задач ({taskbarDirectAppIds.length})</div>
                          <div className={`text-[11px] ${mutedCls}`}>
                            Нажмите на любое приложение ниже — оно появится на панели задач для мгновенного открытия в 1 клик
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {combinedApps.slice(0, 24).map((app) => {
                          const pinned = taskbarDirectAppIds.includes(app.id);
                          return (
                            <button
                              key={app.id}
                              onClick={() => {
                                setTaskbarDirectAppIds((prev) =>
                                  prev.includes(app.id) ? prev.filter((x) => x !== app.id) : [...prev, app.id]
                                );
                              }}
                              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer ${
                                pinned
                                  ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] font-semibold'
                                  : btnCls
                              }`}
                            >
                              {renderAppVisual(app, 'w-4 h-4 shrink-0')}
                              <span className="text-[11px] truncate flex-1">{app.name}</span>
                              {pinned && <Check className="w-3 h-3 text-[var(--luma-accent)] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

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

                  {/* Reorderable Open Windows Host Applications Order Editor (1.3) */}
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

              {settingsTab === 'storage' && (
                <div className="space-y-5">
                  <LumaVirtualMemoryPanel
                    isDark={isDark}
                    surfaceCls={surfaceCls}
                    btnCls={btnCls}
                    mutedCls={mutedCls}
                    onElevateAdmin={() => void handleElevateAdmin()}
                    onPushToast={pushToast}
                  />
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
                </div>
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
                        title: 'Проверка уведомлений Luma OS 1.7.3 (Oxygen)',
                        message: 'Система оповещений Luma OS 1.7.3 (Oxygen) работает штатно.',
                        time: tStr,
                        unread: true,
                      },
                      ...prev,
                    ]);
                    pushToast('Luma OS 1.7.3 (Oxygen)', 'Тестовое уведомление доставлено', 'success');
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
                      <div className="text-sm font-bold">Luma OS 1.7.3 (Oxygen · O-8) · LumaCore 1.6.2</div>
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
                      <div className="text-sm font-bold flex items-center gap-2">
                        <span>Luma Island (Динамический остров)</span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 text-[9px] font-mono">1.6.7</span>
                      </div>
                      <div className={`text-xs ${mutedCls}`}>Плавающая капсула с эквалайзером, телеметрией, часами, загрузками, таймером и буфером обмена</div>
                    </div>
                    <StatusPill active={dynamicIslandEnabled} />
                  </div>

                  {/* Flagship 1.6.7: Real Native Win32 Always-On-Top Dynamic Island Over Chrome & All Windows Apps */}
                  <div className={`p-4 rounded-xl border space-y-3 text-xs ${
                    islandPinOverAllWindows
                      ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                      : surfaceCls
                  }`}>
                    <div
                      onClick={() => {
                        setIslandPinOverAllWindows((v) => {
                          const next = !v;
                          pushToast(
                            'Luma Island · Поверх окон',
                            next
                              ? 'Динамический остров прикреплён поверх Chrome и всех окон Windows!'
                              : 'Режим поверх всех окон Windows отключён',
                            'success'
                          );
                          return next;
                        });
                      }}
                      className="flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold flex items-center gap-2 flex-wrap">
                          <span>Поверх всех окон Windows и Chrome (Прилипший оверлей)</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-[var(--luma-accent)] text-white text-[9px] font-mono">
                            HWND_TOPMOST
                          </span>
                        </div>
                        <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
                          Нативная капсула LumaCore 1.6.2 остаётся прилипшей к выбранной части экрана поверх Google Chrome, игр, Telegram и всех программ Windows без перехвата фокуса
                        </div>
                      </div>
                      <StatusPill active={islandPinOverAllWindows} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        {
                          label: 'Блокировка позиции (прилипание)',
                          sub: islandLocked ? 'Жёстко приклеена к зоне экрана' : 'Разблокировано: тяните капсулу мышью',
                          active: islandLocked,
                          toggle: () => setIslandLocked((v) => !v),
                        },
                        {
                          label: 'Поверх полноэкранных игр и видео',
                          sub: 'Не скрывать оверлей в F11 / YouTube / играх',
                          active: islandShowInFullscreen,
                          toggle: () => setIslandShowInFullscreen((v) => !v),
                        },
                        {
                          label: 'Пропускать клики мыши (Click-Through)',
                          sub: 'Клики проходят сквозь остров по вкладкам Chrome',
                          active: islandClickThrough,
                          toggle: () => setIslandClickThrough((v) => !v),
                        },
                        {
                          label: 'Нативный оверлей даже поверх Luma',
                          sub: 'Использовать единую Win32-капсулу везде',
                          active: islandAlwaysOverLuma,
                          toggle: () => setIslandAlwaysOverLuma((v) => !v),
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          onClick={row.toggle}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${surfaceCls}`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold truncate">{row.label}</div>
                            <div className={`text-[10px] truncate ${mutedCls}`}>{row.sub}</div>
                          </div>
                          <StatusPill active={row.active} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6-Zone Screen Anchor + Edge Offset Slider */}
                  <div className={`p-4 rounded-xl border space-y-3 text-xs ${surfaceCls}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold">Положение на экране (6 зон прилипания)</div>
                      <span className="text-[10px] font-mono text-[var(--luma-accent)] font-bold">
                        {islandAnchor} · отступ {islandOffsetY}px
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ['top-left', '↖ Сверху слева'],
                          ['top-center', '↑ Сверху по центру'],
                          ['top-right', '↗ Сверху справа'],
                          ['bottom-left', '↙ Снизу слева'],
                          ['bottom-center', '↓ Снизу по центру'],
                          ['bottom-right', '↘ Снизу справа'],
                        ] as const
                      ).map(([pos, label]) => (
                        <button
                          key={pos}
                          onClick={() => {
                            setIslandAnchor(pos);
                            setIslandPosition(pos.startsWith('bottom') ? 'bottom' : 'top');
                          }}
                          className={`py-2 px-2 rounded-xl border font-semibold cursor-pointer transition ${
                            islandAnchor === pos
                              ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                              : btnCls
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className={mutedCls}>Отступ от края экрана</span>
                          <span className="font-mono font-bold">{islandOffsetY} px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={64}
                          value={islandOffsetY}
                          onChange={(e) => setIslandOffsetY(Number(e.target.value))}
                          className="w-full accent-[var(--luma-accent)] cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className={mutedCls}>Прозрачность капсулы</span>
                          <span className="font-mono font-bold">{islandOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min={55}
                          max={100}
                          value={islandOpacity}
                          onChange={(e) => setIslandOpacity(Number(e.target.value))}
                          className="w-full accent-[var(--luma-accent)] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Size & 4 Visual Capsule Themes */}
                  <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs ${surfaceCls}`}>
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

                    <div className="space-y-1.5">
                      <div className={mutedCls}>Стиль капсулы:</div>
                      <div className="grid grid-cols-2 gap-1">
                        {(
                          [
                            ['obsidian', 'Obsidian'],
                            ['cryo', 'Cryo-Glass'],
                            ['frosted', 'Frosted'],
                            ['oled', 'Pure OLED'],
                          ] as const
                        ).map(([st, label]) => (
                          <button
                            key={st}
                            onClick={() => setIslandStyle(st)}
                            className={`py-1.5 rounded-lg border font-semibold cursor-pointer ${
                              islandStyle === st ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Island Modules & Behavior Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {[
                      { label: 'Живые часы в капсуле', sub: 'Точное время справа в острове', active: islandShowClock, toggle: () => setIslandShowClock((v) => !v) },
                      { label: 'Телеметрия CPU / RAM', sub: 'Нагрузка процессора и памяти в реальном времени', active: islandShowTelemetry, toggle: () => setIslandShowTelemetry((v) => !v) },
                      { label: 'Медиа и эквалайзер', sub: '7-полосный спектр и кнопки ⏮ ⏯ ⏭', active: islandShowEq, toggle: () => setIslandShowEq((v) => !v) },
                      { label: 'Индикатор загрузок и рендера', sub: 'Шкала прогресса обновлений и Cut Studio', active: islandShowDownloads, toggle: () => setIslandShowDownloads((v) => !v) },
                      { label: 'Погода и регион', sub: 'Отображать город в режиме ожидания', active: islandShowWeather, toggle: () => setIslandShowWeather((v) => !v) },
                      { label: 'Индикатор батареи', sub: 'Показывать заряд и статус сети в капсуле', active: islandShowBattery, toggle: () => setIslandShowBattery((v) => !v) },
                      { label: 'Буфер обмена в острове', sub: 'Быстрая кнопка истории клипов', active: islandShowClip, toggle: () => setIslandShowClip((v) => !v) },
                      { label: 'Авто-захват буфера ОС', sub: 'Сохранять скопированное из Windows', active: islandAutoClipboard, toggle: () => setIslandAutoClipboard((v) => !v) },
                      { label: 'Подсветка контура (Glow)', sub: 'Мягкий неоновый акцент вокруг капсулы', active: islandGlowEnabled, toggle: () => setIslandGlowEnabled((v) => !v) },
                      { label: 'Расширение при наведении', sub: 'Пружинный отклик при подведении курсора', active: islandHoverExpand, toggle: () => setIslandHoverExpand((v) => !v) },
                      { label: 'Оповещения в Острове', sub: 'Показывать живые импульсы событий', active: islandShowNotifications, toggle: () => setIslandShowNotifications((v) => !v) },
                      { label: 'Режим «Не беспокоить»', sub: 'Скрывать всплывающие оповещения', active: dndEnabled, toggle: () => setDndEnabled((v) => !v) },
                    ].map((row) => (
                      <div
                        key={row.label}
                        onClick={row.toggle}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${surfaceCls}`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate">{row.label}</div>
                          <div className={`text-[10px] truncate ${mutedCls}`}>{row.sub}</div>
                        </div>
                        <StatusPill active={row.active} />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        if (!dynamicIslandEnabled) setDynamicIslandEnabled(true);
                        triggerIslandPulse('Luma Island 1.6.7', 'Поверх всех окон Chrome и Windows', 'info', 82);
                      }}
                      className="px-4 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Тест импульса Острова
                    </button>
                    <button
                      onClick={() => openIslandTab('clipboard')}
                      className={`px-4 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
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
                  {/* Design Style (Классический vs Модерн) & Taskbar Position (Bottom / Left / Top) */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold">Стиль системы и панель задач</div>
                        <div className={`text-xs ${mutedCls}`}>Переключение фирменных стилей Luma Matrix / Luma Glass / Luma Nova и клавиши Win</div>
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
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => {
                              setDesignStyle('matrix');
                              setNovaPanelOpen(false);
                              pushToast('Стиль панели', 'Включён классический стиль панели задач', 'success');
                            }}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              designStyle === 'matrix'
                                ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                : btnCls
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px]">Классический</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#d71921]" />
                            </div>
                            <div className={`text-[10px] mt-0.5 ${mutedCls}`}>Панель во всю ширину</div>
                          </button>

                          <button
                            onClick={() => {
                              setDesignStyle('glass');
                              setNovaPanelOpen(false);
                              pushToast('Стиль панели', 'Включён стиль Luma Glass (плавающий док)', 'info');
                            }}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              designStyle === 'glass'
                                ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                : btnCls
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px]">Luma Glass</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#4285f4]" />
                            </div>
                            <div className={`text-[10px] mt-0.5 ${mutedCls}`}>Плавающий док</div>
                          </button>

                          <button
                            onClick={() => {
                              setDesignStyle('nova');
                              setStartMenuOpen(false);
                              pushToast('Стиль панели', 'Включён стиль Luma Nova (капсула сверху)', 'info');
                            }}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              designStyle === 'nova'
                                ? 'border-sky-400 bg-sky-500/15'
                                : btnCls
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px]">Luma Nova</span>
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                            </div>
                            <div className={`text-[10px] mt-0.5 ${mutedCls}`}>Без Пуска, капсула сверху</div>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className={mutedCls}>Положение панели задач:</div>
                        <div className="grid grid-cols-4 gap-1.5 h-[54px]">
                          {(
                            [
                              ['bottom', 'Снизу'],
                              ['left', 'Слева'],
                              ['right', 'Справа'],
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
                              <LayoutPanelLeft
                                className={`w-3.5 h-3.5 ${
                                  pos === 'bottom'
                                    ? '-rotate-90'
                                    : pos === 'top'
                                    ? 'rotate-90'
                                    : pos === 'right'
                                    ? 'rotate-180'
                                    : ''
                                }`}
                              />
                              <span className="text-[11px]">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Item 11: Win Key Solo-Tap Interceptor Toggle */}
                    <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${btnCls}`}>
                      <div>
                        <div className="font-bold">Клавиша Win открывает меню Luma OS (или панель Luma Nova)</div>
                        <div className={`text-[11px] ${mutedCls}`}>
                          Перехватывает одиночное нажатие Win вместо Windows Start, полностью сохраняя Win+D, Win+L, Win+Shift+S, Win+Space и Win+E
                        </div>
                      </div>
                      <button
                        onClick={() => void handleToggleWinKeyToLuma(!winKeyToLuma)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                          winKeyToLuma ? 'bg-[var(--luma-accent)] text-white' : 'bg-white/10 text-zinc-400'
                        }`}
                      >
                        {winKeyToLuma ? 'ВКЛ (Luma Start)' : 'ВЫКЛ (Windows)'}
                      </button>
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

                  {/* Wallpaper Image Engine 1.7.3 (ALL 21 built-in artworks preserved + Persistent Custom Disk Wallpapers!) */}
                  <div className={`p-4 rounded-xl border space-y-3.5 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Image className="w-4 h-4 text-[var(--luma-accent)]" />
                          {t('wallpaperLabel', 'Галерея обоев и свои изображения')}
                        </div>
                        <div className={`text-xs ${mutedCls}`}>
                          Добавляйте любые свои картинки с компьютера (сохраняются на диске) или выбирайте из 21 встроенных и 12 живых обоев
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => customWpInputRef.current?.click()}
                          disabled={uploadingCustomWp}
                          className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent)] hover:brightness-110 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow cursor-pointer transition disabled:opacity-60"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {uploadingCustomWp ? 'Загрузка…' : 'Добавить свои обои'}
                        </button>
                        {(wallpaperImageUrl || liveWallpaper) && (
                          <button
                            onClick={() => {
                              setWallpaperImageUrl('');
                              setLiveWallpaper('');
                            }}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono cursor-pointer ${btnCls}`}
                          >
                            {t('reset', 'Сбросить')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Persistent Disk-Saved Custom Wallpapers («Мои обои») */}
                    {customWallpapers.length > 0 && (
                      <div className="space-y-1.5">
                        <div className={`text-[11px] font-mono uppercase tracking-wider flex items-center justify-between ${mutedCls}`}>
                          <span>Мои добавленные обои ({customWallpapers.length})</span>
                          <span className="text-[10px] opacity-75">Сохранены на диске</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {customWallpapers.map((cw) => (
                            <div
                              key={cw.name}
                              className={`group relative overflow-hidden rounded-xl border text-left transition ${
                                !liveWallpaper && wallpaperImageUrl === cw.url
                                  ? 'border-[var(--luma-accent)] ring-1 ring-[var(--luma-accent)] font-bold'
                                  : btnCls
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setLiveWallpaper('');
                                  setWallpaperImageUrl(cw.url);
                                }}
                                className="w-full text-left cursor-pointer"
                              >
                                <div
                                  className="h-14 w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url("${cw.url}")` }}
                                />
                                <div className="px-2 py-1.5 text-[11px] truncate">{cw.name}</div>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteCustomWallpaper(cw.name, cw.url);
                                }}
                                title="Удалить эти обои"
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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

                    {/* Complete Additive Wallpaper Gallery (ALL 21 built-in artworks 100% preserved + first card Add Your Own!) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => customWpInputRef.current?.click()}
                        className="group relative overflow-hidden rounded-xl border-2 border-dashed border-[var(--luma-accent)]/70 bg-[var(--luma-accent-soft)]/50 hover:bg-[var(--luma-accent-soft)] text-left transition cursor-pointer flex flex-col justify-between"
                      >
                        <div className="h-14 w-full flex flex-col items-center justify-center gap-1 text-[var(--luma-accent)]">
                          <Plus className="w-5 h-5" />
                          <span className="text-[10px] font-bold">С компьютера</span>
                        </div>
                        <div className="px-2 py-1.5 text-[11px] font-bold truncate text-center">
                          + Добавить свои обои
                        </div>
                      </button>
                      {[
                        { label: 'Без картинки (Тема)', url: '', preview: '' },
                        { label: 'Oxygen 1.7 · 2.5D Cryo-Bubbles', url: '/luma-oxygen-hero.jpg', preview: '/luma-oxygen-hero.jpg' },
                        { label: 'Nitrogen 1.6.1 · 2.5D Cryo-Glass', url: '/luma-nitrogen-hero.jpg', preview: '/luma-nitrogen-hero.jpg' },
                        { label: 'Nitrogen 1.6 · N-7 Monolith', url: '/luma-nitrogen-monolith.jpg', preview: '/luma-nitrogen-monolith.jpg' },
                        { label: 'Nitrogen Aurora (Исландия)', url: '/luma-nitrogen-aurora.jpg', preview: '/luma-nitrogen-aurora.jpg' },
                        { label: 'Nitrogen Glacier (Ледник)', url: '/luma-nitrogen-glacier.jpg', preview: '/luma-nitrogen-glacier.jpg' },
                        { label: 'Nitrogen Alpine (Альпы)', url: '/luma-nitrogen-alpine.jpg', preview: '/luma-nitrogen-alpine.jpg' },
                        { label: 'Nitrogen Fjord (Лофотены)', url: '/luma-nitrogen-fjord.jpg', preview: '/luma-nitrogen-fjord.jpg' },
                        { label: 'Nitrogen Arctic (Арктика)', url: '/luma-nitrogen-arctic.jpg', preview: '/luma-nitrogen-arctic.jpg' },
                        { label: 'Carbon 1.5.1 · 4K UHD Monolith', url: '/luma-carbon-hero.jpg', preview: '/luma-carbon-hero.jpg' },
                        { label: 'Carbon Weave · 4K UHD', url: '/luma-carbon-weave.jpg', preview: '/luma-carbon-weave.jpg' },
                        { label: 'Forged Carbon · 4K UHD', url: '/luma-carbon-forged.jpg', preview: '/luma-carbon-forged.jpg' },
                        { label: 'Boron 1.4 (3D Prism)', url: '/luma-boron-hero.jpg', preview: '/luma-boron-hero.jpg' },
                        { label: 'Boron Dusk Horizon (1.4)', url: '/luma-boron-horizon.jpg', preview: '/luma-boron-horizon.jpg' },
                        { label: 'Cobalt Silk Fold (1.4)', url: '/luma-boron-silk.jpg', preview: '/luma-boron-silk.jpg' },
                        { label: 'Solar Eclipse Gold (1.4)', url: '/luma-boron-eclipse.jpg', preview: '/luma-boron-eclipse.jpg' },
                        { label: 'Beryllium 1.3.1 (3D)', url: '/luma-beryllium-hero.jpg', preview: '/luma-beryllium-hero.jpg' },
                        { label: 'Beryl Aurora (1.3)', url: '/luma-beryl-aurora.jpg', preview: '/luma-beryl-aurora.jpg' },
                        { label: 'Amber Monolith (1.3)', url: '/luma-amber-monolith.jpg', preview: '/luma-amber-monolith.jpg' },
                        { label: 'Lithium 1.2 Crystal', url: '/luma-lithium-hero.jpg', preview: '/luma-lithium-hero.jpg' },
                        { label: 'Obsidian Silk (1.2)', url: '/luma-obsidian-silk.jpg', preview: '/luma-obsidian-silk.jpg' },
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

                    {/* 12 Lightweight CSS Live Animated Mesh Wallpapers */}
                    <div className="space-y-1.5">
                      <div className={`text-[11px] font-mono uppercase tracking-wider ${mutedCls}`}>
                        {t('liveWallpaperLabel', 'Живые анимированные обои (12 стилей · 0% ЦП)')}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {(
                          [
                            ['nitrogen', 'Nitrogen N-7 Cryo (1.6 Live)', 'luma-live-wp-nitrogen'],
                            ['aurora-ice', 'Arctic Aurora Ice (1.6 Live)', 'luma-live-wp-aurora-ice'],
                            ['carbon', 'Carbon Fiber Pulse (1.5 Live)', 'luma-live-wp-carbon'],
                            ['obsidian-gold', 'Obsidian Gold (1.5 Live)', 'luma-live-wp-obsidian-gold'],
                            ['boron', 'Boron Sapphire (1.4 Live)', 'luma-live-wp-boron'],
                            ['cobalt', 'Cobalt Obsidian (1.4 Live)', 'luma-live-wp-cobalt'],
                            ['beryllium', 'Beryllium Prism (1.3 Live)', 'luma-live-wp-beryllium'],
                            ['borealis', 'Emerald Borealis (1.3 Live)', 'luma-live-wp-borealis'],
                            ['cybergrid', 'Cyber Grid Flow (1.3 Live)', 'luma-live-wp-cybergrid'],
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

                    {/* Luma OS 1.4 Boron: Global Widget Transparency & Background Customizer */}
                    <div className={`p-3.5 rounded-2xl border space-y-3 text-xs ${btnCls}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                            Прозрачность и фон виджетов рабочего стола (1.4 Boron)
                          </div>
                          <div className={`text-[11px] ${mutedCls}`}>
                            Примените стиль сразу ко всем виджетам или кликните по любому виджету на рабочем столе для индивидуальной настройки
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              window.dispatchEvent(
                                new CustomEvent('luma-apply-widget-appearance', {
                                  detail: {
                                    bgMode: globalWidgetBgMode,
                                    bgOpacity: globalWidgetOpacity,
                                    bgBlur: globalWidgetBlur,
                                    bgCustomColor: globalWidgetColor,
                                  },
                                })
                              );
                              pushToast('Виджеты', 'Фон и прозрачность применены ко всем виджетам!', 'success');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-[11px] font-bold cursor-pointer"
                          >
                            Применить ко всем
                          </button>
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('luma-apply-widget-appearance', { detail: { reset: true } }));
                              pushToast('Виджеты', 'Фон всех виджетов сброшен к стилю темы', 'info');
                            }}
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${btnCls}`}
                          >
                            Сброс
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            ['theme', 'По теме'],
                            ['glass', 'Стекло'],
                            ['dark', 'Тёмный'],
                            ['light', 'Светлый'],
                            ['accent', 'Акцент'],
                            ['transparent', 'Прозрачный'],
                            ['custom', 'Свой цвет'],
                          ] as [WidgetBgMode, string][]
                        ).map(([mId, mLabel]) => (
                          <button
                            key={mId}
                            onClick={() => {
                              setGlobalWidgetBgMode(mId);
                              if (mId === 'transparent') {
                                setGlobalWidgetOpacity(0);
                                setGlobalWidgetBlur(0);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                              globalWidgetBgMode === mId
                                ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                : btnCls
                            }`}
                          >
                            {mLabel}
                          </button>
                        ))}
                        {globalWidgetBgMode === 'custom' && (
                          <input
                            type="color"
                            value={globalWidgetColor}
                            onChange={(e) => setGlobalWidgetColor(e.target.value)}
                            className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span className={mutedCls}>Непрозрачность виджетов</span>
                            <span className="font-bold text-[var(--luma-accent)]">{globalWidgetOpacity}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={2}
                            value={globalWidgetOpacity}
                            onChange={(e) => setGlobalWidgetOpacity(Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] font-mono ${mutedCls}`}>Размытие (Blur)</span>
                          <div className="flex gap-1">
                            {[0, 8, 16, 24].map((b) => (
                              <button
                                key={b}
                                onClick={() => setGlobalWidgetBlur(b)}
                                className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold cursor-pointer ${
                                  globalWidgetBlur === b
                                    ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                    : btnCls
                                }`}
                              >
                                {b}px
                              </button>
                            ))}
                          </div>
                        </div>
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
                      <button
                        type="button"
                        onClick={() => customWpInputRef.current?.click()}
                        className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer inline-flex items-center gap-1.5 ${btnCls}`}
                      >
                        <Image className="w-3.5 h-3.5" />
                        С диска
                      </button>
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

                  {/* Selectable Animation Presets (7 High-FPS GPU Variants!) */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <Zap className="w-4 h-4 text-[var(--luma-accent)]" />
                          Анимации интерфейса (7 режимов · Стиль ОС + 120 Гц GPU)
                        </div>
                        <div className={`text-xs ${mutedCls}`}>
                          Выбор плавной высококадровой физики открытия окон, удаления элементов (Стиль ОС), меню и карточек
                        </div>
                      </div>
                      <span className="text-[11px] font-mono uppercase text-[var(--luma-accent)] font-bold">
                        {animationPreset === 'harmony7' ? 'Стиль ОС' : animationPreset}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {(
                        [
                          { id: 'harmony7', title: 'Стиль ОС (120 Гц)', desc: 'Сверхплавная пружинная физика + распад при удалении' },
                          { id: 'silk', title: 'Beryllium Silk', desc: 'Шёлковый GPU-выход без размытия' },
                          { id: 'elastic', title: 'Elastic Pop', desc: 'Живой упругий гармоничный импульс' },
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

                    {/* Стиль ОС Delete Animation Style */}
                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className={mutedCls}>Анимация удаления виджетов, ярлыков и файлов Корзины:</span>
                      <div className="flex items-center gap-1.5">
                        {(
                          [
                            ['harmony7', 'Стиль ОС (Распад)'],
                            ['evaporate', 'Испарение'],
                            ['shrink', 'Сжатие'],
                          ] as const
                        ).map(([k, lbl]) => (
                          <button
                            key={k}
                            onClick={() => setDeleteAnimStyle(k)}
                            className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                              deleteAnimStyle === k
                                ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                                : btnCls
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
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
                <LumaAccessibilityGesturesPanel
                  isDark={isDark}
                  btnCls={btnCls}
                  mutedCls={mutedCls}
                  gestureConfig={gestureConfig}
                  onChangeGestureConfig={setGestureConfig}
                  onTriggerGestureAction={executeGestureAction}
                  rightClickBack={rightClickBackEnabled}
                  onChangeRightClickBack={setRightClickBackEnabled}
                  rmbConfig={rmbConfig}
                  onChangeRmbConfig={setRmbConfig}
                  accessibilityConfig={accessibilityConfig}
                  onChangeAccessibilityConfig={setAccessibilityConfig}
                  touchModeEnabled={touchModeEnabled}
                  onChangeTouchModeEnabled={setTouchModeEnabled}
                  plugins={plugins}
                  onTogglePlugin={(id) =>
                    setPlugins((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)))
                  }
                  showPluginsInGrid={showPluginsInGrid}
                  onChangeShowPluginsInGrid={setShowPluginsInGrid}
                  gridColumns={(cardColumns === 3 || cardColumns === 5 ? cardColumns : 4) as 3 | 4 | 5}
                  onChangeGridColumns={(cols) => setCardColumns(cols)}
                  onOpenPluginsWindow={() => openWindow('plugins')}
                />
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
                      <button
                        type="button"
                        onClick={playUpdateCinemaDemo}
                        className="px-3.5 py-2 rounded-xl border border-indigo-400/40 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                        title="Посмотреть новую полноэкранную кинематографичную анимацию обновления Boron 1.4"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Анимация обновления
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

                  {/* Version Rollback Card (1.3) — Safe downgrade to any previous release while keeping all desktop widgets & settings */}
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
                        <div className="text-sm font-bold">Диагностика служб LumaCore 1.4</div>
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
                        ['Ядро LumaCore 1.4', kernelConnected ? 'ONLINE · 49215' : 'FALLBACK'],
                        ['Ядро LumaShield 1.4', `AES-256-GCM #${cryptoKeyVersion} · 55+ правил + Guard`],
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

              {/* ABOUT + COMPLETE VERSION HISTORY (WITH 1.7 OXYGEN) */}
              {settingsTab === 'about' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-extrabold font-mono flex items-center gap-2">
                          <span>{editionInfo.edition_label.toUpperCase()} (OXYGEN · СТИЛЬ ОС)</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            editionInfo.is_pro ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/75'
                          }`}>
                            {editionInfo.is_pro ? (editionInfo.is_admin ? 'PRO · ПОЛНЫЕ ПРАВА' : 'PRO EDITION') : 'BASE EDITION'}
                          </span>
                        </div>
                        <div className={`text-xs mt-1 ${mutedCls}`}>
                          Классическая и гибкая панель задач · Перетаскивание и вынос кнопок на рабочий стол · 120 Гц плавные анимации · Свои обои · Панель управления в Стиле ОС · Расширенное окно плеера · Luma Photo Studio · Суперустройство
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {editionInfo.is_pro && editionInfo.can_elevate && (
                          <button
                            onClick={async () => {
                              const r = await fetch('/api/kernel/edition/elevate', { method: 'POST' }).catch(() => null);
                              if (r?.ok) pushToast('Luma OS 1.7.3 Pro', 'Запрошен перезапуск с полными правами Администратора (UAC)', 'success');
                            }}
                            className="px-3 py-2 rounded-xl bg-amber-500 text-black text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Crown className="w-3.5 h-3.5" /> Полные права (Admin)
                          </button>
                        )}
                        <a
                          href="/LumaOS_1.7.3_Pro.exe"
                          download="LumaOS_1.7.3_Pro.exe"
                          className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-mono font-bold inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Pro EXE
                        </a>
                        <a
                          href="/LumaOS_1.7.3_Base.exe"
                          download="LumaOS_1.7.3_Base.exe"
                          className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold inline-flex items-center gap-1.5 ${btnCls}`}
                        >
                          <Download className="w-3.5 h-3.5" /> Base EXE
                        </a>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                      <div className={`p-3 rounded-xl border ${!editionInfo.is_pro ? 'border-sky-400/60 bg-sky-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
                        <div className="font-black text-xs mb-1">Luma OS 1.7.3 Base (Обычная)</div>
                        <ul className={`space-y-0.5 ${mutedCls}`}>
                          <li>• Все обновления 1.7.3: классическая и настраиваемая панель задач, вынос кнопок на стол</li>
                          <li>• Плавные анимации, свои обои с диска, Панель управления в Стиле ОС и окно плеера</li>
                          <li>• Luma Photo Studio (до 2K), Проводник, Модульная панель и прокрутка колесом</li>
                          <li>• Суперустройство, Oxygen Connect, Circle to Search и защита без запроса UAC</li>
                        </ul>
                      </div>
                      <div className={`p-3 rounded-xl border ${editionInfo.is_pro ? 'border-blue-400/70 bg-blue-600/15' : 'border-white/10 bg-white/[0.03]'}`}>
                        <div className="font-black text-xs mb-1 flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-300" /> Luma OS 1.7.3 Pro (Полные права + Макс. опции)
                        </div>
                        <ul className={`space-y-0.5 ${mutedCls}`}>
                          <li>• Все обновления 1.7.3 + полные права Администратора и управление службами</li>
                          <li>• Luma Photo Studio Pro 4K (30 шагов Undo) + Системные ассоциации файлов</li>
                          <li>• Расширенная защита + Luma SwapBoost + Стоп-зарядка батареи</li>
                          <li>• Суперустройство Pro + игровой буст правил окон + Developer SDK Studio</li>
                        </ul>
                      </div>
                    </div>
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
                          ver === '1.6.1 (Nitrogen)' ? 'border-[var(--luma-accent)]/60 bg-[var(--luma-accent)]/[0.06]' : surfaceCls
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold">
                            Версия {ver}
                          </span>
                          {ver === '1.6.1 (Nitrogen)' && <StatusPill active={true} />}
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

      {/* WINDOW 6: PLUGINS MANAGER, STORE & DEVELOPER SDK v3.0 STUDIO */}
      {isWinVisible('plugins') && (
        <DexWindow
          id="plugins"
          title="Расширения · Developer SDK v3.0"
          subtitle={`${plugins.filter((p) => p.enabled).length} активных · ${Object.keys(customThemes).length} польз. тем · /api/v3/sdk`}
          icon={<Puzzle className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.plugins || null}
          zIndex={getWinZ('plugins')}
          alwaysOnTop={Boolean(windows.plugins.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('plugins')}
          initialWidth={960}
          initialHeight={650}
          onFocus={() => focusWindow('plugins')}
          onMinimize={() => minimizeWindow('plugins')}
          onClose={() => closeWindow('plugins')}
        >
          <div className="p-5 space-y-5">
            {/* Developer SDK v3.0 Runtime Banner + Mode Switch */}
            <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${surfaceCls}`}>
              <div className="space-y-0.5">
                <div className="text-xs font-bold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                  Шина расширений & Тем — Luma Developer SDK v3.0
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                    ACTIVE
                  </span>
                </div>
                <div className={`text-[11px] ${mutedCls}`}>
                  REST API /api/v3/themes & /api/v3/plugins + window.LumaSDK + импорт/экспорт тем и плагинов для разработчиков
                </div>
              </div>
              <div className={`flex items-center gap-1 p-0.5 rounded-xl border ${btnCls}`}>
                <button
                  onClick={() => setPluginsTab('catalog')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    pluginsTab === 'catalog' ? 'bg-[var(--luma-accent)] text-white' : ''
                  }`}
                >
                  Каталог ({plugins.length})
                </button>
                <button
                  onClick={() => setPluginsTab('sdk_studio')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1 ${
                    pluginsTab === 'sdk_studio' ? 'bg-[var(--luma-accent)] text-white' : ''
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Студия SDK v3.0
                </button>
              </div>
            </div>

            {pluginsTab === 'sdk_studio' ? (
              <LumaDeveloperSdkStudio
                isDark={isDark}
                surfaceCls={surfaceCls}
                btnCls={btnCls}
                mutedCls={mutedCls}
                customThemes={Object.values(customThemes)}
                activeThemeKey={themeKey}
                onRegisterTheme={registerSdkTheme}
                onDeleteTheme={deleteSdkTheme}
                onApplyTheme={(id) => {
                  const found = allThemesMap[id];
                  if (found) {
                    setThemeKey(id);
                  }
                }}
                plugins={plugins}
                onRegisterPlugin={registerSdkPlugin}
                onDeletePlugin={deleteSdkPlugin}
                onRunPlugin={(p) => void handleRunPluginV2(p)}
                onNotify={pushToast}
              />
            ) : (
            <div className="space-y-5">
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
            )}
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
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.island || null}
          zIndex={getWinZ('island')}
          alwaysOnTop={Boolean(windows.island.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('island')}
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
                    onClick={() => {
                      setIslandTab(k);
                      if (k === 'overview' || k === 'player') {
                        void refreshOsMediaSessions();
                      }
                    }}
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
              <div className={`p-4 rounded-xl border space-y-3.5 ${surfaceCls}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase text-[var(--luma-accent)] font-bold flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${displayMediaPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                      {displayMediaSourceLabel}
                      {selectedMediaSourceApp && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent)]/20 text-[9px]">ВЫБРАН ОСНОВНЫМ</span>
                      )}
                    </div>
                    <div className="text-base font-bold truncate">{displayTrackTitle}</div>
                    <div className={`text-xs truncate ${mutedCls}`}>{displayTrackArtist}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={handlePrevTrack} className={`p-2.5 rounded-full border cursor-pointer ${btnCls}`} title="Предыдущий трек">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button onClick={handleToggleMediaPlay} className="p-3 rounded-full bg-[var(--luma-accent)] text-white cursor-pointer" title={displayMediaPlaying ? 'Пауза' : 'Воспроизвести'}>
                      {displayMediaPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={handleNextTrack} className={`p-2.5 rounded-full border cursor-pointer ${btnCls}`} title="Следующий трек">
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Multi-Player OS Control Panel: Choose which open player to play/pause/skip or make primary! */}
                <div className={`pt-3 border-t space-y-2 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold inline-flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                      Открытые плееры устройства ({liveMediaSessionsList.length})
                    </span>
                    <button
                      onClick={() => void refreshOsMediaSessions()}
                      disabled={loadingMediaSessions}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-mono inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingMediaSessions ? 'animate-spin' : ''}`} />
                      Обновить
                    </button>
                  </div>

                  {liveMediaSessionsList.length > 0 ? (
                    <div className="space-y-1.5">
                      {liveMediaSessionsList.map((sess) => {
                        const isPicked = selectedOsSession?.source_app === sess.source_app;
                        return (
                          <div
                            key={`${sess.id}_${sess.source_app}`}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                              isPicked
                                ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                                : isDark
                                ? 'bg-black/20 border-white/10'
                                : 'bg-black/[0.03] border-zinc-900/10'
                            }`}
                          >
                            <button
                              onClick={() =>
                                setSelectedMediaSourceApp((cur) => (cur === sess.source_app ? '' : sess.source_app))
                              }
                              className="min-w-0 flex-1 text-left cursor-pointer"
                              title="Нажмите, чтобы закрепить этот плеер основным на Dynamic Island"
                            >
                              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    sess.is_playing ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                                  }`}
                                />
                                <span className="truncate">{sess.display_name}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase shrink-0 ${
                                    sess.is_playing
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-zinc-500/20 text-zinc-400'
                                  }`}
                                >
                                  {sess.is_playing ? 'Играет' : 'Пауза'}
                                </span>
                                {isPicked && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[var(--luma-accent)] text-white shrink-0">
                                    Основной
                                  </span>
                                )}
                              </div>
                              <div className={`text-[11px] truncate mt-0.5 ${mutedCls}`}>
                                {sess.title || sess.display_name}
                                {sess.artist ? ` · ${sess.artist}` : ''}
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => void handleControlSpecificPlayer(sess.source_app, 'prev', sess.display_name)}
                                title="Предыдущий трек в этом плеере"
                                className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}
                              >
                                <SkipBack className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  void handleControlSpecificPlayer(
                                    sess.source_app,
                                    sess.is_playing ? 'pause' : 'play',
                                    sess.display_name
                                  )
                                }
                                title={sess.is_playing ? 'Выключить (пауза)' : 'Включить (играть)'}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                                  sess.is_playing
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30'
                                    : 'bg-[var(--luma-accent)] text-white'
                                }`}
                              >
                                {sess.is_playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                <span>{sess.is_playing ? 'Пауза' : 'Вкл'}</span>
                              </button>
                              <button
                                onClick={() => void handleControlSpecificPlayer(sess.source_app, 'next', sess.display_name)}
                                title="Следующий трек в этом плеере"
                                className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}
                              >
                                <SkipForward className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`text-[11px] px-2.5 py-2 rounded-lg border ${btnCls} ${mutedCls}`}>
                      Запустите музыку или видео в браузере, Spotify, VLC или Telegram — все активные плееры появятся здесь с отдельным управлением.
                    </div>
                  )}
                </div>

                <div className={`flex flex-wrap gap-1.5 pt-2 border-t ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
                  {islandPlayers.map((pl, idx) => (
                    <button
                      key={pl.id}
                      onClick={() => {
                        setSelectedMediaSourceApp('');
                        setActivePlayerIndex(idx);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                        !selectedMediaSourceApp && activePlayerIndex === idx
                          ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                          : btnCls
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

            {/* INLINE ISLAND SETTINGS TAB (LUMA OS 1.6.7) */}
            {islandTab === 'settings' && (
              <div className="space-y-3 text-xs">
                <div
                  onClick={() => setIslandPinOverAllWindows((v) => !v)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${
                    islandPinOverAllWindows
                      ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                      : surfaceCls
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Поверх Chrome и всех окон Windows</span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent)] text-white text-[9px] font-mono">TOPMOST</span>
                    </div>
                    <div className={`text-[10px] ${mutedCls}`}>Прилипший нативный Win32-оверлей без перехвата фокуса</div>
                  </div>
                  <StatusPill active={islandPinOverAllWindows} />
                </div>

                <div className={`p-3.5 rounded-xl border space-y-2 ${surfaceCls}`}>
                  <div className="flex items-center justify-between">
                    <span className={mutedCls}>Положение на экране (6 зон)</span>
                    <span className="font-mono text-[10px] text-[var(--luma-accent)] font-bold">{islandAnchor}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        ['top-left', '↖ В. лево'],
                        ['top-center', '↑ В. центр'],
                        ['top-right', '↗ В. право'],
                        ['bottom-left', '↙ Н. лево'],
                        ['bottom-center', '↓ Н. центр'],
                        ['bottom-right', '↘ Н. право'],
                      ] as const
                    ).map(([pos, label]) => (
                      <button
                        key={pos}
                        onClick={() => {
                          setIslandAnchor(pos);
                          setIslandPosition(pos.startsWith('bottom') ? 'bottom' : 'top');
                        }}
                        className={`py-1.5 px-1.5 rounded-lg border font-semibold cursor-pointer ${
                          islandAnchor === pos ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className={mutedCls}>Отступ</span>
                        <span className="font-mono font-bold">{islandOffsetY}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={64}
                        value={islandOffsetY}
                        onChange={(e) => setIslandOffsetY(Number(e.target.value))}
                        className="w-full accent-[var(--luma-accent)] cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className={mutedCls}>Прозрачность</span>
                        <span className="font-mono font-bold">{islandOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={55}
                        max={100}
                        value={islandOpacity}
                        onChange={(e) => setIslandOpacity(Number(e.target.value))}
                        className="w-full accent-[var(--luma-accent)] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className={`p-3 rounded-xl border space-y-1.5 ${surfaceCls}`}>
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
                  <div className={`p-3 rounded-xl border space-y-1.5 ${surfaceCls}`}>
                    <div className={mutedCls}>Стиль капсулы</div>
                    <div className="grid grid-cols-2 gap-1">
                      {(
                        [
                          ['obsidian', 'Obsidian'],
                          ['cryo', 'Cryo-Glass'],
                          ['frosted', 'Frosted'],
                          ['oled', 'Pure OLED'],
                        ] as const
                      ).map(([st, label]) => (
                        <button
                          key={st}
                          onClick={() => setIslandStyle(st)}
                          className={`py-1 rounded-lg border font-semibold cursor-pointer ${
                            islandStyle === st ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Блокировка позиции', active: islandLocked, toggle: () => setIslandLocked((v) => !v) },
                    { label: 'Поверх F11 / игр', active: islandShowInFullscreen, toggle: () => setIslandShowInFullscreen((v) => !v) },
                    { label: 'Пропускать клики', active: islandClickThrough, toggle: () => setIslandClickThrough((v) => !v) },
                    { label: 'Живые часы', active: islandShowClock, toggle: () => setIslandShowClock((v) => !v) },
                    { label: 'Телеметрия CPU / RAM', active: islandShowTelemetry, toggle: () => setIslandShowTelemetry((v) => !v) },
                    { label: 'Загрузки и рендер', active: islandShowDownloads, toggle: () => setIslandShowDownloads((v) => !v) },
                    { label: 'Медиа и эквалайзер', active: islandShowEq, toggle: () => setIslandShowEq((v) => !v) },
                    { label: 'Буфер обмена', active: islandShowClip, toggle: () => setIslandShowClip((v) => !v) },
                    { label: 'Авто-захват буфера ОС', active: islandAutoClipboard, toggle: () => setIslandAutoClipboard((v) => !v) },
                    { label: 'Индикатор заряда', active: islandShowBattery, toggle: () => setIslandShowBattery((v) => !v) },
                    { label: 'Свечение контура', active: islandGlowEnabled, toggle: () => setIslandGlowEnabled((v) => !v) },
                    { label: 'Расширение при наведении', active: islandHoverExpand, toggle: () => setIslandHoverExpand((v) => !v) },
                    { label: 'Оповещения в Острове', active: islandShowNotifications, toggle: () => setIslandShowNotifications((v) => !v) },
                    { label: 'Не беспокоить (DND)', active: dndEnabled, toggle: () => setDndEnabled((v) => !v) },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={opt.toggle}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer ${surfaceCls}`}
                    >
                      <span className="font-semibold truncate pr-2">{opt.label}</span>
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
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.spaces || null}
          zIndex={getWinZ('spaces')}
          alwaysOnTop={Boolean(windows.spaces.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('spaces')}
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

      {/* WINDOW: LUMA AI NITROGEN (SSE STREAMING + 3-TIER MEMORY + OLLAMA/OPENAI + OS/OFFICE/CALENDAR) */}
      {isWinVisible('ai') && (
        <DexWindow
          id="ai"
          title="Luma Ai Nitrogen"
          subtitle={`${AI_PROVIDER_PRESETS.find((p) => p.id === aiConfig.provider)?.label || 'Luma Ai Nitrogen'} · SSE + 3-Tier Memory`}
          icon={<Sparkles className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.ai || null}
          zIndex={getWinZ('ai')}
          alwaysOnTop={Boolean(windows.ai.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('ai')}
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
          subtitle="Устройства · Мышь и DPI · Службы ОС · Сеть & Firewall · Звук · Блокнот Pro · Диски"
          icon={<Wrench className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.utilities || null}
          zIndex={getWinZ('utilities')}
          alwaysOnTop={Boolean(windows.utilities.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('utilities')}
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
            wirelessDevices={wirelessBatteries}
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
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.calculator || null}
          zIndex={getWinZ('calculator')}
          alwaysOnTop={Boolean(windows.calculator.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('calculator')}
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

      {/* WINDOW: NATIVE LUMA CALENDAR (Luma OS 1.4 Boron) */}
      {isWinVisible('calendar') && (
        <DexWindow
          id="calendar"
          title="Календарь Luma OS"
          subtitle="Сетка месяца · События · Напоминания · Расписание"
          icon={<Calendar className="w-4 h-4" />}
          isDark={isDark}
          designStyle={designStyle}
          windowControlsStyle={windowControlsStyle}
          taskbarPosition={taskbarPosition}
          taskbarSizePx={effectiveTaskbarSizePx}
          topBarOffsetPx={dualTaskbarMode ? 46 : 0}
          snapCommand={snapCommands.calendar || null}
          zIndex={getWinZ('calendar')}
          alwaysOnTop={Boolean(windows.calendar.alwaysOnTop)}
          onToggleAlwaysOnTop={() => toggleWindowAlwaysOnTop('calendar')}
          initialWidth={860}
          initialHeight={620}
          minWidth={560}
          minHeight={460}
          onFocus={() => focusWindow('calendar')}
          onMinimize={() => minimizeWindow('calendar')}
          onClose={() => closeWindow('calendar')}
        >
          <LumaCalendarWindow
            isDark={isDark}
            accentHex={customAccentOverride || currentTheme.accentHex}
            onNotify={pushToast}
          />
        </DexWindow>
      )}

      {/* ==================== LAYER 4: ADAPTIVE RESIZABLE OS TASKBAR (100+ APP SMART COMPRESSION + AUTO-HIDE) ==================== */}
      {/* Invisible edge hover sensor + subtle handle indicator when taskbar is auto-hidden */}
      {taskbarAutoHide && !isTaskbarShown && (
        <div
          onMouseEnter={openTaskbarHover}
          onClick={openTaskbarHover}
          title="Наведите курсор, чтобы показать панель задач"
          className={`fixed z-[8950] flex items-center justify-center cursor-pointer transition-opacity ${
            taskbarPosition === 'left'
              ? 'left-0 inset-y-0 w-3 justify-start pl-0.5'
              : taskbarPosition === 'right'
              ? 'right-0 inset-y-0 w-3 justify-end pr-0.5'
              : taskbarPosition === 'top'
              ? 'top-0 inset-x-0 h-3 items-start pt-0.5'
              : 'bottom-0 inset-x-0 h-3 items-end pb-0.5'
          }`}
        >
          <span
            className={`rounded-full transition-all ${
              taskbarPosition === 'left' || taskbarPosition === 'right' ? 'w-1 h-24' : 'w-24 h-1'
            } ${isDark ? 'bg-white/30 hover:bg-[var(--luma-accent)]' : 'bg-zinc-900/25 hover:bg-[var(--luma-accent)]'}`}
          />
        </div>
      )}

      {taskbarPosition === 'left' || taskbarPosition === 'right' ? (
        <aside
          onClick={(e) => e.stopPropagation()}
          onContextMenu={handleTaskbarContextMenu}
          onMouseEnter={openTaskbarHover}
          onMouseLeave={scheduleTaskbarHoverClose}
          style={{ width: `${taskbarSizePx}px` }}
          className={`fixed inset-y-0 z-[8900] flex flex-col items-center justify-between py-2.5 gap-2 luma-noise-surface ${
            taskbarPosition === 'right' ? 'right-0 border-l' : 'left-0 border-r'
          } ${
            visualNoiseHidden
              ? taskbarPosition === 'right'
                ? 'luma-noise-hidden-right'
                : 'luma-noise-hidden-left'
              : isTaskbarShown
              ? 'translate-x-0'
              : taskbarPosition === 'right'
              ? 'translate-x-full pointer-events-none'
              : '-translate-x-full pointer-events-none'
          } ${taskbarGlassCls}`}
        >
          {/* Live Drag-Resize Inner Edge Handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setResizingTaskbar(true);
            }}
            title="Потяните, чтобы изменить ширину панели задач"
            className={`absolute inset-y-0 w-1.5 cursor-ew-resize hover:bg-[var(--luma-accent)]/60 transition z-20 ${
              taskbarPosition === 'right' ? 'left-0' : 'right-0'
            }`}
          />
          {/* Top: Start Menu (hidden in Ubuntu style — opened via top-right Ubuntu pill!) + Run/Spotlight (Alt+R) */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            {!isNova && (
              <button
                onClick={() => {
                  setStartMenuOpen((v) => !v);
                  setControlCenterOpen(false);
                  setTaskListOpen(false);
                  setTaskbarAppMenuId(null);
                  setTaskbarHostWinPid(null);
                  setTaskbarCtxMenu(null);
                }}
                title="Пуск (Меню Luma OS 1.6)"
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
            )}

            <button
              onClick={() => setSpotlightOpen(true)}
              title="Поиск Luma (Alt+R)"
              className={`w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center transition cursor-pointer ${btnCls}`}
            >
              <Search className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            </button>
          </div>

          {/* Center: Vertical System Windows (or Collapsed Luma System Folder) + Deduplicated Running Luma Apps + Drag-Reorderable Open Host OS Windows */}
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
                          className={`absolute ${
                            taskbarPosition === 'right' ? 'right-1' : 'left-1'
                          } top-1/2 -translate-y-1/2 rounded-full transition-all ${
                            st.minimized ? 'w-1 h-1 bg-zinc-400' : 'w-[2.5px] h-3.5 bg-[var(--luma-accent)]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })
            )}

            {taskbarRunningApps.length > 0 && (
              <>
                <div className={`w-6 h-px my-1 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />
                {taskbarRunningApps.map((app) => {
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
                      {renderAppVisual(app, 'w-5 h-5')}
                      <span
                        className={`absolute ${
                          taskbarPosition === 'right' ? 'right-1' : 'left-1'
                        } top-1/2 -translate-y-1/2 w-[2.5px] h-3.5 rounded-full bg-[var(--luma-accent)]`}
                      />
                    </button>
                  );
                })}
              </>
            )}

            {/* REAL Host OS Running Applications on Vertical Taskbar (Native PNG Icons + Drag-and-Drop Reorderable!) */}
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
                      {hw.icon_url ? (
                        <img
                          src={hw.icon_url}
                          alt=""
                          className="w-5 h-5 rounded object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Monitor className="w-4 h-4 text-emerald-500" />
                      )}
                      <span
                        className={`absolute ${
                          taskbarPosition === 'right' ? 'right-1' : 'left-1'
                        } top-1/2 -translate-y-1/2 w-[2.5px] h-3.5 rounded-full bg-emerald-500`}
                      />
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Bottom: Tasks Switcher + Fullscreen + Clipboard + Adaptive Keyboard Layout + Control Center + Vertical Clock + Show Desktop */}
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

            {taskbarShowFullscreenBtn && (
              <button
                onClick={handleToggleFullscreen}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTaskbarCtxMenu(null);
                  setTrayItemCtxMenu({
                    x: e.clientX,
                    y: e.clientY,
                    item: 'fullscreen',
                    label: 'На весь экран (F11)',
                  });
                }}
                title={isFullscreen ? 'Выйти из полного экрана (F11 · ПКМ — меню)' : 'Во весь экран (F11 · ПКМ — меню)'}
                className={`w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer ${
                  isFullscreen ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                }`}
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              </button>
            )}

            {taskbarShowClipboardBtn && (
              <button
                onClick={() => setSmartClipboardOpen(true)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTaskbarCtxMenu(null);
                  setTrayItemCtxMenu({
                    x: e.clientX,
                    y: e.clientY,
                    item: 'clipboard',
                    label: 'Умный буфер обмена',
                  });
                }}
                title={`Умный буфер обмена (${clipboardHistory.length}) · Ctrl+Shift+V · ПКМ — меню`}
                className={`w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer ${btnCls}`}
              >
                <Clipboard className="w-3.5 h-3.5" />
              </button>
            )}

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
              title={`Раскладка клавиатуры: ${liveKbdShort || kbdLayouts?.active?.short || 'RUS'} (${liveKbdTag || kbdLayouts?.active_tag || 'ru-RU'}) · Адаптивная`}
              className={`w-9 h-7 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center text-[10px] font-mono font-bold cursor-pointer ${
                kbdPopoverOpen ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]' : btnCls
              }`}
            >
              {liveKbdShort || kbdLayouts?.active?.short || 'RUS'}
            </button>

            <button
              onClick={() => {
                setNotifShadeOpen((v) => !v);
                setControlCenterOpen(false);
                setCarbonHubOpen(false);
                setStartMenuOpen(false);
                setTaskbarHostWinPid(null);
              }}
              title="Шторка уведомлений (Alt+N)"
              className={`relative w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer ${
                notifShadeOpen ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]' : btnCls
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              {hubNotifications.filter((n) => n.unread).length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-cyan-500 text-black text-[9px] font-mono font-black flex items-center justify-center">
                  {Math.min(99, hubNotifications.filter((n) => n.unread).length)}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setControlCenterOpen((v) => !v);
                setNotifShadeOpen(false);
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
              onClick={() => openWindow('calendar')}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openWindow('settings', 'clock');
              }}
              title="Календарь Luma OS (ЛКМ) · Настройка часов (ПКМ)"
              className={`w-11 py-1 rounded-xl flex flex-col items-center justify-center font-mono leading-tight cursor-pointer ${
                isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-zinc-900/[0.08]'
              }`}
            >
              <LumaTaskbarClock
                orientation="vertical"
                timeFormat={timeFormat}
                showSeconds={showSeconds}
                showDate={showDate}
                clockAccentColor={clockAccentColor}
                clockBlinkColon={clockBlinkColon}
                locale={locale}
                mutedCls={mutedCls}
              />
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
          ref={taskbarFooterRef}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={handleTaskbarContextMenu}
          onMouseEnter={openTaskbarHover}
          onMouseLeave={scheduleTaskbarHoverClose}
          onDragOver={(e) => {
            if (draggedBarElement) e.preventDefault();
          }}
          style={{ height: `${taskbarSizePx}px` }}
          className={`fixed z-[8900] flex items-center px-2.5 gap-1.5 luma-noise-surface ${
            designStyle === 'matrix'
              ? taskbarPosition === 'top'
                ? 'top-0 inset-x-0 rounded-none border-b shadow-[0_6px_24px_rgba(0,0,0,0.34)]'
                : 'bottom-0 inset-x-0 rounded-none border-t shadow-[0_-6px_24px_rgba(0,0,0,0.38)]'
              : designStyle === 'glass'
              ? taskbarPosition === 'top'
                ? 'top-2 inset-x-3 rounded-[24px] border shadow-[0_16px_46px_rgba(0,0,0,0.44)]'
                : 'bottom-2 inset-x-3 rounded-[24px] border shadow-[0_16px_46px_rgba(0,0,0,0.48)]'
              : taskbarPosition === 'top'
              ? 'top-2 inset-x-5 rounded-[26px] border shadow-[0_18px_50px_rgba(0,0,0,0.48)]'
              : 'bottom-2 inset-x-5 rounded-[26px] border shadow-[0_18px_50px_rgba(0,0,0,0.52)]'
          } ${
            visualNoiseHidden
              ? taskbarPosition === 'top'
                ? 'luma-noise-hidden-top'
                : 'luma-noise-hidden-bottom'
              : isTaskbarShown
              ? 'translate-y-0'
              : taskbarPosition === 'top'
              ? '-translate-y-[calc(100%+16px)] pointer-events-none'
              : 'translate-y-[calc(100%+16px)] pointer-events-none'
          } ${taskbarGlassCls}`}
        >
          {/* Floating Drag Hint while rearranging or tearing off a taskbar button */}
          {draggedBarElement && (
            <div
              className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-[9550] px-3.5 py-1.5 rounded-full border text-[11px] font-bold shadow-xl backdrop-blur-xl ${
                taskbarPosition === 'top' ? 'top-16' : 'bottom-16'
              } bg-[#0e1526]/92 border-sky-400/50 text-sky-200`}
            >
              Перетащите по панели задач или вытяните на рабочий стол: «{TASKBAR_ELEMENT_META[draggedBarElement]?.label}»
            </div>
          )}

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

          {/* Dynamic 1.7.3 Freely-Draggable, Removable & Tear-Off Taskbar Elements */}
          {(dualTaskbarMode ? (['windows_strip'] as TaskbarElementId[]) : taskbarElementsOrder).map((elId) => {
            if (!dualTaskbarMode && taskbarHiddenElements.includes(elId)) return null;
            if (elId === 'start' && isNova) return null;
            if (elId === 'luma_folder' && !(showLumaSysFolder || taskbarCollapseSysFolder)) return null;
            if (elId === 'telemetry' && !taskbarShowTelemetry) return null;
            if (elId === 'clipboard' && !taskbarShowClipboardBtn) return null;
            if (elId === 'fullscreen' && !taskbarShowFullscreenBtn) return null;

            const isDropTarget = dragOverBarElement?.id === elId && draggedBarElement && draggedBarElement !== elId;
            const dropIndicatorCls = isDropTarget
              ? dragOverBarElement.side === 'left'
                ? 'ring-2 ring-sky-400/80 border-l-2 border-l-sky-400'
                : 'ring-2 ring-sky-400/80 border-r-2 border-r-sky-400'
              : '';
            const isBeingDragged = draggedBarElement === elId;

            const makeDragHandlers = (allowWholeDrag = true) => ({
              draggable: allowWholeDrag,
              onDragStart: (e: React.DragEvent) => {
                if (!allowWholeDrag) return;
                e.stopPropagation();
                e.dataTransfer.setData('application/x-luma-bar-el', elId);
                e.dataTransfer.effectAllowed = 'move';
                barElementDropHandledRef.current = false;
                setDraggedBarElement(elId);
              },
              onDragOver: (e: React.DragEvent) => {
                if (!draggedBarElement || draggedBarElement === elId) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
                setDragOverBarElement((prev) =>
                  prev && prev.id === elId && prev.side === side ? prev : { id: elId, side }
                );
              },
              onDrop: (e: React.DragEvent) => {
                if (!draggedBarElement || draggedBarElement === elId) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
                barElementDropHandledRef.current = true;
                reorderBarElement(draggedBarElement, elId, side);
                setDraggedBarElement(null);
                setDragOverBarElement(null);
              },
              onDragEnd: (e: React.DragEvent) => {
                const wasHandled = barElementDropHandledRef.current;
                setDraggedBarElement(null);
                setDragOverBarElement(null);
                if (!wasHandled && TASKBAR_ELEMENT_META[elId]?.canTearOff && taskbarFooterRef.current) {
                  const barRect = taskbarFooterRef.current.getBoundingClientRect();
                  const pulledOutside =
                    e.clientY < barRect.top - 48 ||
                    e.clientY > barRect.bottom + 48;
                  if (pulledOutside && e.clientX > 0 && e.clientY > 0) {
                    tearOffTaskbarElementToDesktop(elId, e.clientX, e.clientY);
                  }
                }
              },
            });

            const openElCtxMenu = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setTaskbarCtxMenu(null);
              setTrayItemCtxMenu(null);
              setBarElementCtxMenu({ x: e.clientX, y: e.clientY, id: elId, fromDesktop: false });
            };

            if (elId === 'luma_folder') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('luma_folder')}
                  onContextMenu={openElCtxMenu}
                  title={`Папка «Luma» (${taskbarApps.length} приложений · открыто: ${openSystemWindowsList.length} · перетащите по панели или на стол · ПКМ — меню)`}
                  className={`relative h-8 sm:h-9 px-2.5 ${
                    isPixel ? 'rounded-full' : 'rounded-xl'
                  } border flex items-center gap-1.5 text-xs font-semibold transition cursor-grab active:cursor-grabbing shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${
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
                  {taskbarShowLabels && <span className="hidden md:inline">Luma</span>}
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
              );
            }

            if (elId === 'start') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('start')}
                  onContextMenu={openElCtxMenu}
                  title={`${t('start', 'Пуск')} · Приложения и Обзор окон (перетащите по панели или на стол · ПКМ — меню)`}
                  className={`w-9 h-9 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center transition cursor-grab active:cursor-grabbing shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${
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
              );
            }

            if (elId === 'search') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('search')}
                  onContextMenu={openElCtxMenu}
                  title="Выполнить и поиск (Alt+R · перетащите по панели или на стол · ПКМ — меню)"
                  className={`h-8 px-2.5 rounded-full border flex items-center gap-1.5 text-xs transition cursor-grab active:cursor-grabbing shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${btnCls}`}
                >
                  <Search className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                  <span className="hidden sm:inline font-mono text-[11px]">Alt+R</span>
                </button>
              );
            }

            if (elId === 'circle_search') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('circle_search')}
                  onContextMenu={openElCtxMenu}
                  title="Circle to Search (Ctrl+Shift+Space) · перетащите по панели или на стол · ПКМ — меню"
                  className={`h-8 px-2.5 rounded-full border flex items-center gap-1.5 text-xs font-bold transition cursor-grab active:cursor-grabbing shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${
                    lensSearchOpen
                      ? 'bg-gradient-to-r from-sky-500 to-violet-600 border-sky-300 text-white shadow-lg shadow-sky-500/35'
                      : 'bg-gradient-to-r from-sky-500/18 to-violet-500/18 border-sky-400/35 text-sky-200 hover:from-sky-500/30 hover:to-violet-500/30'
                  }`}
                >
                  <ScanSearch className="w-3.5 h-3.5 text-sky-300" />
                  <span className="hidden lg:inline text-[11px]">Circle</span>
                </button>
              );
            }

            if (elId === 'windows_strip') {
              return (
                <div
                  key={elId}
                  onDragOver={(e) => {
                    if (!draggedBarElement || draggedBarElement === elId) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
                    setDragOverBarElement((prev) =>
                      prev && prev.id === elId && prev.side === side ? prev : { id: elId, side }
                    );
                  }}
                  onDrop={(e) => {
                    if (!draggedBarElement || draggedBarElement === elId) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
                    barElementDropHandledRef.current = true;
                    reorderBarElement(draggedBarElement, elId, side);
                    setDraggedBarElement(null);
                    setDragOverBarElement(null);
                  }}
                  className={`flex-1 min-w-0 flex items-center gap-1 rounded-xl ${dropIndicatorCls}`}
                >
                  {/* Optional Left-Aligned Smart Dock Shelf + Live Download & Render Indicator */}
                  {showSmartDockShelf && smartDockSide === 'left' && (
                    <LumaSmartDockStacks
                      kernelBase=""
                      stacks={smartDock.stacks}
                      tasks={effectiveDockTasks}
                      isDarkTheme={isDark}
                      align="left"
                      onStacksChanged={(next: DockFolderStackConfig[]) =>
                        setSmartDock((prev) => ({ ...prev, stacks: next }))
                      }
                      onOpenFolderInExplorer={(p) => openExplorerAt(p)}
                      onOpenFile={(p) => openFileInLumaSystem(p, 'auto')}
                      onQuickLook={openQuickLook}
                      onNotify={(title, msg) => pushToast(title, msg, 'success')}
                    />
                  )}

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
                    onMouseMove={handleDockMagneticMove}
                    onMouseLeave={handleDockMagneticLeave}
                    onWheel={(e) => {
                      if (modularPanelCfg.scrollActions && Math.abs(e.deltaY) > 0 && !e.shiftKey) {
                        const now = Date.now();
                        if (now - taskbarWheelRef.current > 170) {
                          taskbarWheelRef.current = now;
                          const dir = e.deltaY > 0 ? 1 : -1;
                          const openLuma = openSystemWindowsList.map((w) => ({ kind: 'luma' as const, id: w.id }));
                          const openHost = (taskbarShowHostWindows ? hostWindows : []).map((h) => ({ kind: 'host' as const, pid: h.pid, hwnd: h.hwnd }));
                          const allTargets = [...openLuma, ...openHost];
                          if (allTargets.length > 0) {
                            e.preventDefault();
                            const curIdx = openLuma.findIndex((x) => windows[x.id].z === topVisibleZ && !windows[x.id].minimized);
                            const nextIdx = ((curIdx < 0 ? 0 : curIdx) + dir + allTargets.length) % allTargets.length;
                            const tgt = allTargets[nextIdx];
                            if (tgt.kind === 'luma') {
                              openWindow(tgt.id);
                            } else {
                              void fetch('/api/kernel/windows/focus', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ pid: tgt.pid, hwnd: tgt.hwnd || 0 }),
                              }).catch(() => {});
                            }
                            return;
                          }
                        }
                      }
                      if (totalBarTabsCount > 9 && Math.abs(e.deltaY) > 0) {
                        e.currentTarget.scrollLeft += e.deltaY;
                      }
                    }}
                    className={`flex-1 min-w-0 flex items-center gap-1 ${
                      totalBarTabsCount > 9 ? 'overflow-x-auto no-scrollbar py-1.5' : 'overflow-visible py-1'
                    } ${
                      taskbarCenterIcons || dualTaskbarMode ? 'justify-center' : ''
                    }`}
                  >
                    {/* Direct 1-Click Pinned Apps Launcher */}
                    {taskbarDirectLaunch && taskbarDirectAppIds.length > 0 && (
                      <>
                        {taskbarDirectAppIds
                          .map((aid) => combinedApps.find((a) => a.id === aid))
                          .filter((a): a is AppItem => Boolean(a))
                          .map((app) => {
                            const badgeCount = matchMessengerBadgeForApp(smartDock.badges, app.name);
                            const dlTask = matchDockTaskForApp(effectiveDockTasks, app.name);
                            return (
                              <button
                                key={`direct_${app.id}`}
                                data-dock-item="1"
                                onClick={() => handleLaunchApp(app)}
                                title={`Открыть сразу: ${app.name}${dlTask ? ` · ${Math.round(dlTask.percent)}% (${dlTask.title})` : ''}${badgeCount > 0 ? ` · ${badgeCount} новых` : ''}`}
                                className={`luma-dock-magnetic-item ${bouncingDockIds[app.id] ? 'luma-dock-bounce' : ''} relative h-8 sm:h-9 px-2 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-1.5 text-xs cursor-pointer shrink-0 ${
                                  app.isRunning
                                    ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                                    : btnCls
                                }`}
                              >
                                {renderAppVisual(app, 'w-4 h-4 shrink-0')}
                                {dualTaskbarMode && <span className="hidden md:inline max-w-[90px] truncate">{app.name}</span>}
                                <DockMessengerBadge count={badgeCount} />
                                <DockIconProgressBar task={dlTask} />
                                {app.isRunning && !dlTask && (
                                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-[2px] rounded-full bg-[var(--luma-accent)]" />
                                )}
                              </button>
                            );
                          })}
                        <span className={`w-px h-5 mx-0.5 shrink-0 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />
                      </>
                    )}

                    {/* System Luma Windows */}
                    {!taskbarCollapseSysFolder && (
                      visiblePinnedOrOpenWins.map((item) => {
                        const st = windows[item.id];
                        const isFocused = st.open && !st.minimized && st.z === topVisibleZ;
                        const isDragged = draggedTaskbarId === item.id;
                        const showLbl = taskbarShowLabels && barCompression !== 'icons';
                        const sysTask = matchDockTaskForApp(effectiveDockTasks, item.id);
                        return (
                          <button
                            key={item.id}
                            data-dock-item="1"
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDraggedTaskbarId(item.id);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              if (draggedTaskbarId && draggedTaskbarId !== item.id) {
                                e.preventDefault();
                                e.stopPropagation();
                                reorderTaskbarByDrag(draggedTaskbarId, item.id);
                                setDraggedTaskbarId(null);
                              }
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
                                ? `${item.label}${st.alwaysOnTop ? ' (📌 Поверх всех окон)' : ''} (ПКМ — закрыть · перетащите для порядка)`
                                : `${item.label} (перетащите для изменения порядка)`
                            }
                            className={`luma-dock-magnetic-item ${bouncingDockIds[item.id] ? 'luma-dock-bounce' : ''} relative h-8 sm:h-9 ${
                              showLbl
                                ? barCompression === 'compact'
                                  ? 'px-2 max-w-[84px] min-w-[34px] shrink'
                                  : 'px-2.5 max-w-[132px] min-w-[38px] shrink'
                                : 'w-8 sm:w-9 justify-center shrink-0'
                            } ${
                              isPixel ? 'rounded-full' : 'rounded-xl'
                            } flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap overflow-hidden ${
                              isDragged ? 'opacity-50 ring-2 ring-[var(--luma-accent)]' : ''
                            } ${
                              st.alwaysOnTop ? 'ring-1 ring-amber-400/60' : ''
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
                            <DockIconProgressBar task={sysTask} />
                            {st.open && !sysTask && (
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

                    {/* Deduplicated Running Luma Applications */}
                    {taskbarRunningApps.length > 0 && (
                      <>
                        <span className={`w-px h-5 mx-0.5 shrink-0 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />
                        {taskbarRunningApps.map((app) => {
                          const activePop = taskbarAppMenuId === app.id;
                          const showLbl = taskbarShowLabels && barCompression !== 'icons';
                          const badgeCount = matchMessengerBadgeForApp(smartDock.badges, app.name);
                          const dlTask = matchDockTaskForApp(effectiveDockTasks, app.name);
                          return (
                            <button
                              key={app.id}
                              data-dock-item="1"
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
                              className={`luma-dock-magnetic-item ${bouncingDockIds[app.id] ? 'luma-dock-bounce' : ''} relative h-8 sm:h-9 ${
                                showLbl
                                  ? barCompression === 'compact'
                                    ? 'px-2 max-w-[76px] min-w-[32px] shrink'
                                    : 'px-2.5 max-w-[110px] min-w-[36px] shrink'
                                  : 'w-8 sm:w-9 justify-center shrink-0'
                              } ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap border ${
                                activePop
                                  ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                                  : isDark
                                  ? 'border-white/[0.08] bg-white/[0.06] text-zinc-100 hover:bg-white/[0.12]'
                                  : 'border-zinc-900/[0.1] bg-zinc-900/[0.06] text-zinc-900 hover:bg-zinc-900/[0.12]'
                              }`}
                            >
                              {renderAppVisual(app, 'w-4 h-4 shrink-0')}
                              {showLbl && <span className="hidden md:inline truncate">{app.name}</span>}
                              <DockMessengerBadge count={badgeCount} />
                              <DockIconProgressBar task={dlTask} />
                              {!dlTask && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-[var(--luma-accent)]" />}
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* REAL Host OS Running Windows */}
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
                          const badgeCount = matchMessengerBadgeForApp(smartDock.badges, `${friendlyName} ${hw.name}`);
                          const dlTask = matchDockTaskForApp(effectiveDockTasks, `${friendlyName} ${hw.name}`);
                          return (
                            <button
                              key={`host_${hw.pid}`}
                              data-dock-item="1"
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setDraggedHostWinKey(key);
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                if (draggedHostWinKey && draggedHostWinKey !== key) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  reorderHostWinByDrag(draggedHostWinKey, key);
                                  setDraggedHostWinKey(null);
                                }
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
                              title={`${friendlyName}${hw.topmost ? ' [📌 Поверх всех окон]' : ''}${hw.title && hw.title !== friendlyName ? ` — ${hw.title}` : ''} (${hw.name} · PID ${hw.pid} · ${hw.mem_mb.toFixed(0)} МБ)\nПеретащите мышкой для порядка · ЛКМ — управлять · ПКМ — закрыть`}
                              className={`luma-dock-magnetic-item relative h-8 sm:h-9 ${
                                showLbl
                                  ? hostWinLabelMode === 'window_title'
                                    ? 'px-2.5 max-w-[168px] min-w-[44px] shrink'
                                    : barCompression === 'compact'
                                    ? 'px-2 max-w-[96px] min-w-[40px] shrink'
                                    : 'px-2.5 max-w-[132px] min-w-[44px] shrink'
                                  : 'w-8 sm:w-9 justify-center shrink-0'
                              } ${isPixel ? 'rounded-full' : 'rounded-xl'} flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap border ${
                                isDragged ? 'opacity-50 ring-2 ring-emerald-400' : ''
                              } ${
                                hw.topmost ? 'ring-1 ring-amber-400/70' : ''
                              } ${
                                activePop
                                  ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                                  : isDark
                                  ? 'border-white/[0.08] bg-white/[0.05] text-zinc-200 hover:bg-white/[0.11]'
                                  : 'border-zinc-900/[0.1] bg-zinc-900/[0.06] text-zinc-900 hover:bg-zinc-900/[0.12]'
                              }`}
                            >
                              {hw.icon_url ? (
                                <img
                                  src={hw.icon_url}
                                  alt=""
                                  className="w-4 h-4 rounded object-contain shrink-0"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : compactMode ? (
                                <span className="text-[10px] font-mono font-black text-emerald-400">{monoInitial}</span>
                              ) : (
                                <Monitor className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              )}
                              {showLbl && <span className="truncate font-medium">{displayLabel}</span>}
                              <DockMessengerBadge count={badgeCount} />
                              <DockIconProgressBar task={dlTask} />
                              {!dlTask && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-emerald-500" />}
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* Right-Aligned Smart Dock Folder Stacks */}
                  {showSmartDockShelf && smartDockSide === 'right' && (
                    <LumaSmartDockStacks
                      kernelBase=""
                      stacks={smartDock.stacks}
                      tasks={effectiveDockTasks}
                      isDarkTheme={isDark}
                      align="right"
                      onStacksChanged={(next: DockFolderStackConfig[]) =>
                        setSmartDock((prev) => ({ ...prev, stacks: next }))
                      }
                      onOpenFolderInExplorer={(p) => openExplorerAt(p)}
                      onOpenFile={(p) => openFileInLumaSystem(p, 'auto')}
                      onQuickLook={openQuickLook}
                      onNotify={(title, msg) => pushToast(title, msg, 'success')}
                    />
                  )}

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
              );
            }

            if (elId === 'control_hub') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('control_hub')}
                  onContextMenu={openElCtxMenu}
                  title="Панель управления Стиль ОС (Tab · перетащите по панели или на стол · ПКМ — меню)"
                  className={`h-8 px-2 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-1 text-[10px] font-mono font-bold cursor-grab active:cursor-grabbing transition shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${
                    carbonHubOpen ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span className="hidden xl:inline">TAB</span>
                </button>
              );
            }

            if (elId === 'tasks') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('tasks')}
                  onContextMenu={openElCtxMenu}
                  title="Открытые задачи и окна (перетащите по панели или на стол · ПКМ — меню)"
                  className={`h-8 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-1.5 text-[11px] font-mono cursor-grab active:cursor-grabbing transition shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${
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
              );
            }

            if (elId === 'telemetry') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('telemetry')}
                  onContextMenu={openElCtxMenu}
                  title="Состояние железа CPU/RAM (перетащите по панели или на стол · ПКМ — меню)"
                  className={`hidden xl:flex items-center gap-2 px-2.5 h-8 ${isPixel ? 'rounded-full' : 'rounded-xl'} border text-[11px] font-mono cursor-grab active:cursor-grabbing shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${btnCls}`}
                >
                  <span>CPU {cpuLoad}%</span>
                  <span className="opacity-30">·</span>
                  <span>RAM {ramLoad}%</span>
                </button>
              );
            }

            if (elId === 'clipboard') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('clipboard')}
                  onContextMenu={openElCtxMenu}
                  title={`Умный буфер обмена (${clipboardHistory.length}) · Ctrl+Shift+V · перетащите по панели или на стол · ПКМ — меню`}
                  className={`w-8 h-8 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${btnCls}`}
                >
                  <Clipboard className="w-3.5 h-3.5" />
                </button>
              );
            }

            if (elId === 'fullscreen') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('fullscreen')}
                  onContextMenu={openElCtxMenu}
                  title={isFullscreen ? 'Выйти из полного экрана (F11 · перетащите или ПКМ)' : 'Во весь экран (F11 · перетащите или ПКМ)'}
                  className={`w-8 h-8 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${
                    isFullscreen ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                  }`}
                >
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>
              );
            }

            if (elId === 'keyboard') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('keyboard')}
                  onContextMenu={openElCtxMenu}
                  title={`Язык клавиатуры: ${liveKbdShort || kbdLayouts?.active?.short || 'RUS'} · перетащите по панели или на стол · ПКМ — меню`}
                  className={`h-8 px-2 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-1 text-[11px] font-mono font-bold cursor-grab active:cursor-grabbing transition shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${
                    kbdPopoverOpen ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]' : btnCls
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5 opacity-80 hidden sm:inline" />
                  <span>{liveKbdShort || kbdLayouts?.active?.short || 'RUS'}</span>
                </button>
              );
            }

            if (elId === 'notifications') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('notifications')}
                  onContextMenu={openElCtxMenu}
                  title="Шторка уведомлений (Alt+N · перетащите по панели или на стол · ПКМ — меню)"
                  className={`relative h-8 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-1.5 text-[11px] font-mono cursor-grab active:cursor-grabbing transition shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${
                    notifShadeOpen ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]' : btnCls
                  }`}
                >
                  {dndEnabled ? <BellOff className="w-3.5 h-3.5 text-amber-400" /> : <Bell className="w-3.5 h-3.5 text-cyan-400" />}
                  {hubNotifications.filter((n) => n.unread).length > 0 && (
                    <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-cyan-500 text-black text-[9px] font-black flex items-center justify-center">
                      {Math.min(99, hubNotifications.filter((n) => n.unread).length)}
                    </span>
                  )}
                </button>
              );
            }

            if (elId === 'superdevice') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('superdevice')}
                  onContextMenu={openElCtxMenu}
                  title="Суперустройство (Экосистема Стиль ОС · перетащите по панели или на стол · ПКМ — меню)"
                  className={`h-8 px-2.5 rounded-full border flex items-center gap-1.5 text-[11px] font-bold cursor-grab active:cursor-grabbing transition shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${
                    windows.superdevice.open
                      ? 'bg-[#2563eb] border-blue-400 text-white shadow-md shadow-blue-600/35'
                      : btnCls
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden 2xl:inline">Экосистема</span>
                </button>
              );
            }

            if (elId === 'tray_cc') {
              return (
                <React.Fragment key={elId}>
                  {/* Pinned Wireless / 2.4GHz Battery Devices */}
                  {wirelessBatteries
                    .filter((wb) => pinnedWirelessNames.includes(wb.name))
                    .slice(0, 3)
                    .map((wb) => {
                      const hasBat = typeof wb.battery_percent === 'number' && wb.battery_percent >= 0;
                      const pct = hasBat ? Math.max(0, Math.min(100, wb.battery_percent)) : 0;
                      const shortName = wb.name.length > 10 ? `${wb.name.slice(0, 9)}…` : wb.name;
                      return (
                        <button
                          key={`pin_wb_${wb.name}`}
                          onClick={() => openWindow('settings', 'power_battery')}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTaskbarCtxMenu(null);
                            setBarElementCtxMenu(null);
                            setTrayItemCtxMenu({
                              x: e.clientX,
                              y: e.clientY,
                              item: 'wireless',
                              label: wb.name,
                              wirelessName: wb.name,
                            });
                          }}
                          title={`${wb.name} (${wb.transport}): ${hasBat ? `${pct}%` : 'Подключено'} · ПКМ — убрать с панели`}
                          className={`hidden md:flex items-center gap-1.5 px-2 h-8 ${isPixel ? 'rounded-full' : 'rounded-xl'} border text-[11px] font-mono cursor-pointer shrink-0 ${btnCls}`}
                        >
                          {wb.device_type === 'headphones' ? (
                            <Headphones className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          ) : wb.device_type === 'gamepad' ? (
                            <Gamepad2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : wb.device_type === 'keyboard' ? (
                            <Keyboard className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          ) : (
                            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          <span className="hidden 2xl:inline max-w-[70px] truncate">{shortName}</span>
                          {hasBat ? (
                            <span className={`font-bold ${pct <= 20 ? 'text-rose-400' : pct <= 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {pct}%
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-400 text-[10px]">ON</span>
                          )}
                        </button>
                      );
                    })}

                  {!dynamicIslandEnabled && (
                    <button
                      onClick={handleToggleDynamicIsland}
                      title="Включить Luma Island"
                      className={`w-8 h-8 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center justify-center cursor-pointer shrink-0 ${btnCls}`}
                    >
                      <Disc3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    {...makeDragHandlers(true)}
                    onWheel={(e) => {
                      if (!modularPanelCfg.scrollActions) return;
                      e.preventDefault();
                      const nextVol = Math.max(0, Math.min(100, (isMuted ? 0 : volume) + (e.deltaY < 0 ? 4 : -4)));
                      setVolume(nextVol);
                      setIsMuted(nextVol === 0);
                      void fetch('/api/kernel/audio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ volume: nextVol, mute: nextVol === 0 }),
                      }).catch(() => {});
                    }}
                    onClick={() => runTaskbarElementAction('tray_cc')}
                    onContextMenu={openElCtxMenu}
                    title="Центр управления (Звук, Сеть, Заряд · колесо — громкость · перетащите по панели или на стол · ПКМ — меню)"
                    className={`h-8 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} border flex items-center gap-2 text-[11px] font-mono cursor-grab active:cursor-grabbing transition shrink-0 ${dropIndicatorCls} ${
                      isBeingDragged ? 'opacity-50' : ''
                    } ${
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
                </React.Fragment>
              );
            }

            if (elId === 'clock') {
              return (
                <button
                  key={elId}
                  {...makeDragHandlers(true)}
                  onClick={() => runTaskbarElementAction('clock')}
                  onContextMenu={openElCtxMenu}
                  title={`Календарь Luma OS (ЛКМ) · перетащите по панели или на стол · ПКМ — меню`}
                  className={`h-9 px-2.5 ${isPixel ? 'rounded-full' : 'rounded-xl'} flex flex-col items-end justify-center leading-tight font-mono cursor-grab active:cursor-grabbing transition shrink-0 ${dropIndicatorCls} ${
                    isBeingDragged ? 'opacity-50' : ''
                  } ${
                    isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-zinc-900/[0.07]'
                  }`}
                >
                  <LumaTaskbarClock
                    orientation="horizontal"
                    timeFormat={timeFormat}
                    showSeconds={showSeconds}
                    showDate={showDate}
                    clockAccentColor={clockAccentColor}
                    clockBlinkColon={clockBlinkColon}
                    locale={locale}
                    mutedCls={mutedCls}
                  />
                </button>
              );
            }

            return null;
          })}

          {/* Far-right Show Desktop Strip */}
          {!dualTaskbarMode && (
            <button
              onClick={showDesktop}
              title="Показать рабочий стол (Alt+D)"
              className={`w-2.5 h-7 rounded-sm border-l cursor-pointer transition shrink-0 ${
                isDark ? 'border-white/15 hover:bg-white/20' : 'border-zinc-500/40 hover:bg-zinc-500/30'
              }`}
            />
          )}
        </footer>
      )}

      {/* ==================== LUMA OS 1.6 NITROGEN: DUAL TASKBAR TOP SYSTEM UTILITY BAR ==================== */}
      {dualTaskbarMode && (
        <header
          onClick={(e) => e.stopPropagation()}
          className={`fixed top-0 inset-x-0 h-11 z-[8900] px-3 border-b flex items-center justify-between gap-2 select-none luma-noise-surface ${
            visualNoiseHidden ? 'luma-noise-hidden-top' : ''
          } ${taskbarGlassCls}`}
        >
          {/* Top-Left: Start (hidden in Nova style), Search, Desktops & System Tools */}
          <div className="flex items-center gap-1.5 min-w-0">
            {!isNova && (
              <button
                onClick={() => {
                  setStartMenuOpen((v) => !v);
                  setControlCenterOpen(false);
                  setCarbonHubOpen(false);
                  setNotifShadeOpen(false);
                }}
                title="Пуск · Приложения и Обзор окон (Luma OS 1.7.2 Oxygen)"
                className={`h-8 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer transition ${
                  startMenuOpen ? 'bg-[var(--luma-accent)] text-white' : btnCls + ' border'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
                <span>Luma 1.7.3</span>
              </button>
            )}
            <button
              onClick={() => setSpotlightOpen(true)}
              title="Поиск по ПК и системе (Alt+R)"
              className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs cursor-pointer ${btnCls}`}
            >
              <Search className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              <span className="hidden sm:inline font-mono text-[11px]">Alt+R</span>
            </button>
            {enabledFeatures.privateVault && (
              <button
                onClick={() => setVaultOpen(true)}
                title="Суперконфиденциальность (Приватный стол AES-256)"
                className="h-8 px-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden md:inline">Сейф</span>
              </button>
            )}
            {enabledFeatures.scenarios && (
              <button
                onClick={() => openWindow('scenarios')}
                title="Сценарии автоматизации"
                className={`h-8 px-2 rounded-xl border flex items-center gap-1 text-[11px] cursor-pointer ${btnCls}`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline">Сценарии</span>
              </button>
            )}
            {enabledFeatures.trash && (
              <button
                onClick={() => openWindow('trash')}
                title={`Корзина Luma OS (${trashCount})`}
                className={`h-8 px-2 rounded-xl border flex items-center gap-1 text-[11px] cursor-pointer ${btnCls}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                {trashCount > 0 && <span className="font-mono text-[10px]">{trashCount}</span>}
              </button>
            )}
          </div>

          {/* Top-Right: Live Telemetry, Keyboard Layout, Notification Shade, Control Center, Carbon Hub (Tab), Calendar Clock */}
          <div className="flex items-center gap-1.5 shrink-0">
            {liveSystem && (
              <button
                onClick={() => openWindow('taskmgr')}
                className={`hidden md:flex h-8 px-2.5 rounded-xl border items-center gap-2 text-[10px] font-mono cursor-pointer ${btnCls}`}
              >
                <span>CPU {liveSystem.cpu_percent}%</span>
                <span>RAM {liveSystem.ram_percent}%</span>
              </button>
            )}
            <button
              onClick={() => setKbdPopoverOpen((v) => !v)}
              className={`h-8 px-2 rounded-xl border text-[11px] font-mono font-bold cursor-pointer ${btnCls}`}
            >
              {liveKbdShort || kbdLayouts?.active?.short || 'RUS'}
            </button>
            <button
              onClick={() => {
                setNotifShadeOpen((v) => !v);
                setControlCenterOpen(false);
                setCarbonHubOpen(false);
              }}
              title="Шторка уведомлений (Alt+N)"
              className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-[11px] font-mono font-bold cursor-pointer ${
                notifShadeOpen ? 'bg-cyan-500 border-cyan-400 text-black' : btnCls
              }`}
            >
              {dndEnabled ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5 text-cyan-400" />}
              {hubNotifications.filter((n) => n.unread).length > 0 && (
                <span className="px-1.5 rounded-full bg-cyan-500/25 text-cyan-300 text-[9px]">
                  {Math.min(99, hubNotifications.filter((n) => n.unread).length)}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setControlCenterOpen((v) => !v);
                setCarbonHubOpen(false);
                setNotifShadeOpen(false);
              }}
              className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-[11px] font-mono cursor-pointer ${btnCls}`}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <Wifi className="w-3.5 h-3.5" />
              <span>{batteryLevel}%</span>
            </button>
            <button
              onClick={() => {
                setCarbonHubOpen((v) => !v);
                setControlCenterOpen(false);
                setNotifShadeOpen(false);
              }}
              title="Панель управления Carbon + Центр уведомлений (Tab)"
              className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-[11px] font-mono font-bold cursor-pointer ${
                carbonHubOpen ? 'bg-cyan-500 border-cyan-400 text-black' : btnCls
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>TAB</span>
            </button>
            <button
              onClick={() => openWindow('calendar')}
              className={`h-8 px-2.5 rounded-xl flex items-center font-mono text-xs font-bold cursor-pointer ${btnCls} border`}
            >
              <LumaTaskbarClock
                orientation="horizontal"
                timeFormat={timeFormat}
                showSeconds={false}
                showDate={false}
                clockAccentColor={clockAccentColor}
                clockBlinkColon={clockBlinkColon}
                locale={locale}
                mutedCls={mutedCls}
              />
            </button>
          </div>
        </header>
      )}

      {/* ==================== TRAY ITEM RIGHT-CLICK MENU (CPU/RAM, CLIPBOARD, FULLSCREEN, WIRELESS) ==================== */}
      {trayItemCtxMenu && (
        <SmartContextMenu
          x={trayItemCtxMenu.x}
          y={trayItemCtxMenu.y}
          zIndex={9600}
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in w-56 border p-1.5 shadow-2xl text-xs ${popoverShellCls}`}
        >
          <div className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider truncate ${mutedCls}`}>
            {trayItemCtxMenu.label}
          </div>
          <button
            onClick={() => {
              const target = trayItemCtxMenu.item;
              setTrayItemCtxMenu(null);
              if (target === 'telemetry') openWindow('taskmgr');
              else if (target === 'clipboard') openIslandTab('clipboard');
              else if (target === 'fullscreen') handleToggleFullscreen();
              else if (target === 'wireless') openWindow('settings', 'power_battery');
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
              isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-zinc-900/[0.08]'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            Открыть
          </button>
          <button
            onClick={() => {
              const target = trayItemCtxMenu.item;
              const wName = trayItemCtxMenu.wirelessName;
              setTrayItemCtxMenu(null);
              if (target === 'telemetry') {
                setTaskbarShowTelemetry(false);
                pushToast('Панель задач', 'Индикатор CPU/RAM убран (вернуть: Настройки → Панель задач)', 'info');
              } else if (target === 'clipboard') {
                setTaskbarShowClipboardBtn(false);
                pushToast('Панель задач', 'Кнопка «Буфер обмена» убрана (вернуть: Настройки → Панель задач)', 'info');
              } else if (target === 'fullscreen') {
                setTaskbarShowFullscreenBtn(false);
                pushToast('Панель задач', 'Кнопка «На весь экран» убрана (вернуть: Настройки → Панель задач)', 'info');
              } else if (target === 'wireless' && wName) {
                setPinnedWirelessNames((prev) => {
                  const next = prev.filter((n) => n !== wName);
                  try { localStorage.setItem('luma_pinned_wireless_v1', JSON.stringify(next)); } catch { /* ignore */ }
                  return next;
                });
                pushToast('Панель задач', `«${wName}» убрано с панели задач`, 'info');
              }
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold text-rose-400 hover:bg-rose-500/15 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Убрать с панели задач
          </button>
        </SmartContextMenu>
      )}

      {/* ==================== TASKBAR ELEMENT & DESKTOP TILE RIGHT-CLICK MENU (1.7.3) ==================== */}
      {barElementCtxMenu && (
        <SmartContextMenu
          x={barElementCtxMenu.x}
          y={barElementCtxMenu.y}
          zIndex={9650}
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in w-60 border p-1.5 shadow-2xl text-xs ${popoverShellCls}`}
        >
          <div className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider truncate ${mutedCls}`}>
            {TASKBAR_ELEMENT_META[barElementCtxMenu.id]?.label || 'Элемент панели'}
          </div>
          <button
            onClick={() => runTaskbarElementAction(barElementCtxMenu.id)}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
              isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-zinc-900/[0.08]'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            Открыть
          </button>

          {!barElementCtxMenu.fromDesktop ? (
            <>
              {TASKBAR_ELEMENT_META[barElementCtxMenu.id]?.canTearOff && (
                <button
                  onClick={() => {
                    const targetId = barElementCtxMenu.id;
                    const cx = barElementCtxMenu.x;
                    const cy = Math.max(120, barElementCtxMenu.y - 160);
                    setBarElementCtxMenu(null);
                    tearOffTaskbarElementToDesktop(targetId, cx, cy);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
                    isDark ? 'hover:bg-white/[0.08] text-sky-300' : 'hover:bg-zinc-900/[0.08] text-sky-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Вытащить на рабочий стол
                </button>
              )}
              <div className="grid grid-cols-2 gap-1 px-1 py-1">
                <button
                  onClick={() => {
                    moveBarElementByStep(barElementCtxMenu.id, -1);
                    setBarElementCtxMenu(null);
                  }}
                  className={`py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${btnCls}`}
                >
                  ← Влево
                </button>
                <button
                  onClick={() => {
                    moveBarElementByStep(barElementCtxMenu.id, 1);
                    setBarElementCtxMenu(null);
                  }}
                  className={`py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${btnCls}`}
                >
                  Вправо →
                </button>
              </div>
              {barElementCtxMenu.id === 'clock' && (
                <button
                  onClick={() => {
                    setBarElementCtxMenu(null);
                    openWindow('settings', 'clock');
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
                    isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-zinc-900/[0.08]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                  Настроить циферблат
                </button>
              )}
              <button
                onClick={() => {
                  const targetId = barElementCtxMenu.id;
                  setBarElementCtxMenu(null);
                  toggleHideTaskbarElement(targetId, true);
                  pushToast(
                    'Панель задач',
                    `«${TASKBAR_ELEMENT_META[targetId]?.label}» убрано (вернуть: Настройки → Панель задач)`,
                    'info'
                  );
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold text-rose-400 hover:bg-rose-500/15 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Убрать с панели задач
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  const targetId = barElementCtxMenu.id;
                  setBarElementCtxMenu(null);
                  removeDesktopTaskbarTool(targetId, true);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
                  isDark ? 'hover:bg-white/[0.08] text-emerald-300' : 'hover:bg-zinc-900/[0.08] text-emerald-700'
                }`}
              >
                <LayoutPanelLeft className="w-3.5 h-3.5 text-emerald-400" />
                Вернуть на панель задач
              </button>
              <button
                onClick={() => {
                  const targetId = barElementCtxMenu.id;
                  setBarElementCtxMenu(null);
                  removeDesktopTaskbarTool(targetId, false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold text-rose-400 hover:bg-rose-500/15 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Убрать с рабочего стола
              </button>
            </>
          )}
          <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`} />
          <button
            onClick={() => {
              setBarElementCtxMenu(null);
              openWindow('settings', 'taskbar');
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer ${
              isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-zinc-900/[0.08]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 opacity-75" />
            Настроить панель задач
          </button>
        </SmartContextMenu>
      )}

      {/* ==================== WINDOWS-STYLE TASKBAR RIGHT-CLICK CONTEXT MENU ==================== */}
      {taskbarCtxMenu && (
        <SmartContextMenu
          x={taskbarCtxMenu.x}
          y={taskbarCtxMenu.y}
          zIndex={9600}
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in w-64 border p-1.5 shadow-2xl text-xs ${popoverShellCls}`}
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
              setTaskbarAutoHide((v) => {
                const next = !v;
                setTaskbarHoverOpen(false);
                pushToast(
                  'Панель задач',
                  next ? 'Автоскрытие панели задач включено' : 'Панель задач закреплена на экране',
                  'info'
                );
                return next;
              });
              setTaskbarCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            <span>{taskbarAutoHide ? 'Закрепить панель задач' : 'Автоскрытие при простое'}</span>
          </button>
          <button
            onClick={() => {
              setSpringAnimationsEnabled((v) => {
                const next = !v;
                pushToast(
                  'Пружинные анимации',
                  next
                    ? 'Пружинная физика включена во всей системе'
                    : 'Пружинные анимации отключены — быстрый режим без отскока',
                  'info'
                );
                return next;
              });
              setTaskbarCtxMenu(null);
            }}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left font-semibold cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
              <span className="truncate">Пружинные анимации</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                springAnimationsEnabled
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isDark
                  ? 'bg-white/10 text-zinc-400'
                  : 'bg-zinc-900/10 text-zinc-600'
              }`}
            >
              {springAnimationsEnabled ? 'ВКЛ' : 'ВЫКЛ'}
            </span>
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
          <div className="px-2 py-1 space-y-1">
            <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>Стиль панели</div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {(
                [
                  ['matrix', 'Классика'],
                  ['glass', 'Стекло'],
                  ['nova', 'Nova'],
                ] as const
              ).map(([stKey, stLbl]) => (
                <button
                  key={stKey}
                  onClick={() => {
                    setDesignStyle(stKey);
                    if (stKey === 'nova') setStartMenuOpen(false);
                    else setNovaPanelOpen(false);
                    setTaskbarCtxMenu(null);
                    pushToast('Стиль панели', `Выбран стиль: ${stLbl}`, 'success');
                  }}
                  className={`py-1 rounded-lg border font-semibold cursor-pointer ${
                    designStyle === stKey ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                  }`}
                >
                  {stLbl}
                </button>
              ))}
            </div>
          </div>
          <div className="px-2 py-1 space-y-1">
            <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>Положение панели</div>
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              {(
                [
                  ['bottom', 'Низ'],
                  ['left', 'Лево'],
                  ['right', 'Право'],
                  ['top', 'Верх'],
                ] as const
              ).map(([pos, lbl]) => (
                <button
                  key={pos}
                  onClick={() => {
                    setTaskbarPosition(pos);
                    setTaskbarCtxMenu(null);
                  }}
                  className={`py-1 rounded-lg border font-semibold cursor-pointer ${
                    taskbarPosition === pos ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
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
        </SmartContextMenu>
      )}

      {/* ==================== MOVABLE "LUMA" TASKBAR FOLDER POPOVER (1.6.2) ==================== */}
      {sysFolderOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed z-[9500] w-80 border p-3.5 space-y-3 text-xs shadow-2xl ${popoverShellCls} ${
            taskbarPosition === 'left'
              ? 'top-1/2 -translate-y-1/2 left-[68px]'
              : taskbarPosition === 'right'
              ? 'top-1/2 -translate-y-1/2 right-[68px]'
              : `${taskbarPosition === 'top' ? (isPixel ? 'top-16' : 'top-14') : isPixel ? 'bottom-16' : 'bottom-14'} ${
                  lumaFolderSlot === 'far_left'
                    ? 'left-3'
                    : lumaFolderSlot === 'before_apps'
                    ? 'left-28'
                    : lumaFolderSlot === 'after_apps'
                    ? 'left-1/2 -translate-x-1/2'
                    : 'right-28'
                }`
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center">
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold">Папка Luma</div>
                <div className={`text-[10px] font-mono ${mutedCls}`}>
                  {taskbarApps.length} приложений · открыто: {openSystemWindowsList.length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {taskbarCollapseSysFolder && (
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
              )}
              <button
                onClick={() => {
                  setShowLumaSysFolder(false);
                  setTaskbarCollapseSysFolder(false);
                  setSysFolderOpen(false);
                  pushToast('Папка «Luma»', 'Скрыта с панели задач (вернуть: Настройки → Панель задач)', 'info');
                }}
                title="Убрать папку «Luma» с панели задач"
                className={`px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer hover:border-rose-400 hover:text-rose-400 ${btnCls}`}
              >
                Убрать
              </button>
            </div>
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

      {/* ==================== KEYBOARD LAYOUT & 120+ WORLD LANGUAGES POPOVER (1.3.1) ==================== */}
      {kbdPopoverOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed z-[9500] w-80 border p-3.5 space-y-3 text-xs shadow-2xl ${popoverShellCls} ${
            taskbarPosition === 'left'
              ? 'bottom-16 left-[68px]'
              : taskbarPosition === 'right'
              ? 'bottom-16 right-[68px]'
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
        const otherHostWin = hostWindows.find((w) => w.pid !== hw.pid && !w.is_self);
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in fixed z-[9500] w-80 border p-3.5 space-y-3 text-xs ${popoverShellCls} ${
              taskbarPosition === 'left'
                ? 'top-1/2 -translate-y-1/2 left-[68px]'
                : taskbarPosition === 'right'
                ? 'top-1/2 -translate-y-1/2 right-[68px]'
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
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 overflow-hidden">
                  {hw.icon_url ? (
                    <img
                      src={hw.icon_url}
                      alt=""
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Monitor className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{hw.title || hw.name}</div>
                  <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                    {hw.friendly_name || hw.name} · PID {hw.pid} · {hw.mem_mb.toFixed(0)} МБ
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
              onClick={() => void handleToggleHostTopmost(hw.pid, hw.hwnd)}
              className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 transition ${
                hw.topmost
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : btnCls
              }`}
              title="Закрепить внешнее окно Windows поверх всех остальных окон (Win32 HWND_TOPMOST)"
            >
              <Pin className={`w-3.5 h-3.5 ${hw.topmost ? 'fill-current' : 'text-amber-400'}`} />
              {hw.topmost ? '📌 Закреплено поверх всех окон (Открепить)' : '📌 Поверх всех окон (Always on Top)'}
            </button>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                onClick={() => void handleSnapHostWindow(hw.pid, 'left')}
                title="Закрепить это окно слева (50% экрана)"
                className={`py-1.5 px-2 rounded-lg border font-semibold cursor-pointer ${btnCls}`}
              >
                ◧ Влево
              </button>
              <button
                onClick={() => void handleSnapHostWindow(hw.pid, 'right')}
                title="Закрепить это окно справа (50% экрана)"
                className={`py-1.5 px-2 rounded-lg border font-semibold cursor-pointer ${btnCls}`}
              >
                ◨ Вправо
              </button>
              <button
                onClick={() => {
                  if (otherHostWin) {
                    void handleSplitTwoHostWindows(hw.pid, otherHostWin.pid);
                  } else {
                    setMultitaskingOpen(true);
                    setTaskbarHostWinPid(null);
                  }
                }}
                title={
                  otherHostWin
                    ? `Открыть рядом: ${hw.friendly_name || hw.name} | ${otherHostWin.friendly_name || otherHostWin.name}`
                    : 'Открыть выбор 2 окон рядом (Alt+W)'
                }
                className={`py-1.5 px-2 rounded-lg border font-semibold cursor-pointer ${btnCls}`}
              >
                ◫ 2 рядом
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
            className={`luma-animate-in fixed z-[9500] w-72 border p-3.5 space-y-3 text-xs ${popoverShellCls} ${
              taskbarPosition === 'left'
                ? 'top-1/2 -translate-y-1/2 left-[68px]'
                : taskbarPosition === 'right'
                ? 'top-1/2 -translate-y-1/2 right-[68px]'
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
                  {renderAppVisual(activeApp, 'w-5 h-5')}
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
            className={`luma-animate-in fixed z-[9500] w-96 max-w-[calc(100vw-24px)] border p-4 space-y-3 text-xs ${popoverShellCls} ${
              taskbarPosition === 'left'
                ? 'bottom-16 left-[72px]'
                : taskbarPosition === 'right'
                ? 'bottom-16 right-[72px]'
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

      {/* ==================== REAL START MENU («ПУСК») WITH EMBEDDED «ОБЗОР ОКОН» & DIRECT PC POWER CONTROLS ==================== */}
      {startMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-spring-menu fixed z-[9500] w-[490px] max-w-[calc(100vw-24px)] border p-4 space-y-3.5 ${popoverShellCls} ${
            taskbarPosition === 'left'
              ? 'top-3 left-[72px]'
              : taskbarPosition === 'right'
              ? 'top-3 right-[72px]'
              : taskbarPosition === 'top'
              ? isPixel
                ? 'top-16 left-1/2 -translate-x-1/2'
                : 'top-14 left-2.5'
              : isPixel
              ? 'bottom-16 left-1/2 -translate-x-1/2'
              : 'bottom-14 left-2.5'
          }`}
        >
          {/* Start Menu Mode Switcher: Приложения vs Обзор окон (moved from taskbar into Start Menu!) */}
          <div className="flex items-center justify-between gap-2">
            <div className={`flex-1 p-1 rounded-xl border grid grid-cols-2 gap-1 text-xs font-bold ${isDark ? 'bg-black/30 border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
              <button
                type="button"
                onClick={() => setStartMenuTab('apps')}
                className={`py-1.5 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  startMenuTab === 'apps'
                    ? 'bg-[var(--luma-accent)] text-white shadow'
                    : mutedCls + ' hover:opacity-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Приложения</span>
              </button>
              <button
                type="button"
                onClick={() => setStartMenuTab('overview')}
                className={`py-1.5 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  startMenuTab === 'overview'
                    ? 'bg-[var(--luma-accent)] text-white shadow'
                    : mutedCls + ' hover:opacity-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Обзор окон</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${startMenuTab === 'overview' ? 'bg-white/20 text-white' : 'bg-white/10'}`}>
                  {openSystemWindowsList.length + orderedHostWindows.length}
                </span>
              </button>
            </div>
            <span className={`px-2 py-1 rounded-xl border text-[10px] font-mono font-bold ${btnCls}`} title={`Активный рабочий стол ${activeDesktop}`}>
              D{activeDesktop}
            </span>
          </div>

          {startMenuTab === 'overview' ? (
            /* ==================== EMBEDDED «ОБЗОР ОКОН» INSIDE START MENU ==================== */
            <div className="space-y-3">
              {/* Virtual Desktops D1..D4 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.12em]">
                  <span className={mutedCls}>Рабочие столы</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStartMenuOpen(false);
                      setMultitaskingOpen(true);
                    }}
                    className="text-[var(--luma-accent)] hover:underline cursor-pointer font-bold"
                  >
                    Полный экран (Alt+W)
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((desk) => (
                    <button
                      key={desk}
                      type="button"
                      onClick={() => {
                        setActiveDesktop(desk);
                        triggerIslandPulse(`Рабочий стол ${desk}`, undefined, 'desktop');
                      }}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold font-mono transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeDesktop === desk
                          ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white shadow'
                          : btnCls
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>D{desk}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Open Luma OS Windows */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.12em]">
                  <span className={mutedCls}>Окна Luma OS ({openSystemWindowsList.length})</span>
                  <span className={mutedCls}>📌 = поверх Chrome</span>
                </div>
                {openSystemWindowsList.length === 0 ? (
                  <div className={`p-3 rounded-xl border text-center text-xs ${btnCls} ${mutedCls}`}>
                    Нет открытых окон Luma OS
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {openSystemWindowsList.map((w) => {
                      const st = windows[w.id];
                      const pinned = Boolean(st?.alwaysOnTop);
                      return (
                        <div
                          key={w.id}
                          onClick={() => {
                            openWindow(w.id);
                            setStartMenuOpen(false);
                          }}
                          className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                            pinned ? 'border-sky-400/50 bg-sky-500/10' : btnCls
                          }`}
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)] shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">{w.label}</div>
                              <div className={`text-[10px] font-mono ${mutedCls}`}>
                                {st?.minimized ? 'Свёрнуто' : 'Активно'}
                                {pinned ? ' · 📌 Поверх всех окон' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWindowAlwaysOnTop(w.id);
                              }}
                              title={pinned ? 'Открепить поверх окон' : 'Закрепить поверх всех окон и Chrome'}
                              className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                                pinned
                                  ? 'bg-sky-500 border-sky-400 text-white'
                                  : isDark
                                  ? 'border-white/10 hover:bg-white/15'
                                  : 'border-zinc-300 hover:bg-zinc-200'
                              }`}
                            >
                              📌
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeWindow(w.id);
                              }}
                              title="Закрыть окно"
                              className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Real Open Windows Host Applications */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.12em]">
                  <span className={mutedCls}>Открытые программы Windows ({orderedHostWindows.length})</span>
                  <button
                    type="button"
                    onClick={() => void pollHostWindows()}
                    className="text-sky-400 hover:underline cursor-pointer"
                  >
                    Обновить
                  </button>
                </div>
                {orderedHostWindows.length === 0 ? (
                  <div className={`p-3 rounded-xl border text-center text-xs ${btnCls} ${mutedCls}`}>
                    Внешние приложения Windows не обнаружены
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                    {orderedHostWindows.map((hw) => (
                      <div
                        key={`${hw.pid}_${hw.hwnd || 0}`}
                        onClick={() => {
                          setStartMenuOpen(false);
                          void handleFocusHostWindow(hw.pid);
                        }}
                        className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${btnCls}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">{hw.title || hw.friendly_name || hw.name}</div>
                          <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                            {hw.friendly_name || hw.name} · PID {hw.pid}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleToggleHostTopmost(hw.pid, hw.hwnd);
                            }}
                            title="Закрепить это окно Windows поверх всех окон"
                            className={`px-2 py-1 rounded-lg border text-[10px] cursor-pointer ${
                              isDark ? 'border-white/10 hover:bg-white/15' : 'border-zinc-300 hover:bg-zinc-200'
                            }`}
                          >
                            📌
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void fetch('/api/kernel/windows/close', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ pid: hw.pid }),
                              })
                                .then(() => void pollHostWindows())
                                .catch(() => {});
                            }}
                            title="Закрыть программу"
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
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
                    <span className={mutedCls}>Luma OS 1.7.3 (Oxygen · O-8)</span>
                    <div className="flex items-center gap-1.5">
                      {enabledFeatures.privateVault && (
                        <button
                          onClick={() => {
                            setStartMenuOpen(false);
                            setVaultOpen(true);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-500/25 cursor-pointer font-bold"
                        >
                          🔒 Приватный стол
                        </button>
                      )}
                      <span className="text-[var(--luma-accent)] font-bold">LumaCore 1.6.2</span>
                    </div>
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
                        {renderAppVisual(app, 'w-5 h-5 shrink-0')}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">{app.name}</div>
                          <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{app.category}</div>
                        </div>
                        {app.isRunning && <span className="w-1.5 h-1.5 rounded-full bg-[var(--luma-accent)] shrink-0" />}
                      </button>
                    ))}
                </div>
              </div>

              {/* Quick Shortcuts inside Start Menu */}
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
            </>
          )}

          {/* Start Footer with FULL PC Power Controls (Shutdown, Restart, Sleep, Lock, Exit Luma) */}
          <div className={`pt-3 border-t space-y-2.5 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[var(--luma-accent)] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  N
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{customDeviceName || liveSystem?.hostname || 'Luma Desktop'}</div>
                  <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                    {liveSystem?.location?.city || 'Luma OS 1.7.3 (Oxygen)'}
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
          onMouseEnter={() => {
            ccHoverEnteredRef.current = true;
            if (ccLeaveTimerRef.current) {
              window.clearTimeout(ccLeaveTimerRef.current);
              ccLeaveTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            if (!ccHoverEnteredRef.current || ccConnectivityPicker !== 'none') return;
            if (ccLeaveTimerRef.current) window.clearTimeout(ccLeaveTimerRef.current);
            ccLeaveTimerRef.current = window.setTimeout(() => {
              ccHoverEnteredRef.current = false;
              setControlCenterOpen(false);
            }, 280);
          }}
          className={`luma-spring-menu fixed z-[9500] w-80 max-h-[86vh] overflow-y-auto border p-4 space-y-3.5 ${popoverShellCls} ${
            taskbarPosition === 'left'
              ? 'bottom-3 left-[68px]'
              : taskbarPosition === 'right'
              ? 'bottom-3 right-[68px]'
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
            <span className="text-xs font-mono font-bold uppercase tracking-wider">LUMA OS 1.6.2B (NITROGEN)</span>
            <span className={`text-[10px] font-mono ${mutedCls}`}>
              {liveSystem?.location?.city || 'LOCAL'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Native Luma OS Wi-Fi Tile (LMB toggle · RMB or chevron -> network list & inline password) */}
            {(() => {
              const wfOn = wifiStatus ? wifiStatus.enabled : true;
              const wfConn = Boolean(wifiStatus?.connected && wifiStatus?.active_ssid);
              const wfOpen = ccConnectivityPicker === 'wifi';
              const openWifiList = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setCcConnectivityPicker((p) => {
                  const next = p === 'wifi' ? 'none' : 'wifi';
                  if (next === 'wifi') void fetchWifiStatus(true);
                  return next;
                });
              };
              return (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleToggleWifi(!wfOn)}
                  onContextMenu={openWifiList}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void handleToggleWifi(!wfOn); } }}
                  title="ЛКМ — вкл/выкл Wi-Fi · ПКМ — выбрать сеть и ввести пароль"
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-1.5 text-left transition cursor-pointer select-none ${
                    wfOpen
                      ? 'bg-[var(--luma-accent)] border-cyan-300 text-white font-semibold shadow-md'
                      : wfOn
                      ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-semibold'
                      : btnCls
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {wfOn ? <Wifi className="w-3.5 h-3.5 shrink-0" /> : <WifiOff className="w-3.5 h-3.5 shrink-0" />}
                    <div className="min-w-0">
                      <div className="truncate leading-tight">{wfConn ? wifiStatus!.active_ssid : 'Wi-Fi'}</div>
                      <div className={`text-[9px] font-mono truncate ${wfOn ? 'text-white/75' : mutedCls}`}>
                        {!wfOn ? 'Выкл · ПКМ' : wfConn ? 'Подкл. · ПКМ' : 'Сети · ПКМ'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openWifiList}
                    title="Выбрать Wi-Fi сеть (или ПКМ)"
                    className={`p-0.5 rounded-md shrink-0 cursor-pointer transition ${
                      wfOn ? 'hover:bg-black/20 text-white/90' : 'hover:bg-white/15 opacity-75'
                    }`}
                  >
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${wfOpen ? 'rotate-90' : ''}`} />
                  </button>
                </div>
              );
            })()}

            {/* Native Luma OS Bluetooth Tile (LMB toggle · RMB or chevron -> device list & inline PIN) */}
            {(() => {
              const btOn = btStatus ? btStatus.enabled : hubBluetoothEnabled;
              const btActiveDev = btStatus?.devices?.find((d) => d.connected);
              const btOpen = ccConnectivityPicker === 'bluetooth';
              const openBtList = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setCcConnectivityPicker((p) => {
                  const next = p === 'bluetooth' ? 'none' : 'bluetooth';
                  if (next === 'bluetooth') void fetchBluetoothDevices();
                  return next;
                });
              };
              return (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleToggleBluetoothRadio(!btOn)}
                  onContextMenu={openBtList}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void handleToggleBluetoothRadio(!btOn); } }}
                  title="ЛКМ — вкл/выкл Bluetooth · ПКМ — список устройств"
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-1.5 text-left transition cursor-pointer select-none ${
                    btOpen
                      ? 'bg-[var(--luma-accent)] border-sky-300 text-white font-semibold shadow-md'
                      : btOn
                      ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-semibold'
                      : btnCls
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Bluetooth className="w-3.5 h-3.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate leading-tight">{btActiveDev ? btActiveDev.name : 'Bluetooth'}</div>
                      <div className={`text-[9px] font-mono truncate ${btOn ? 'text-white/75' : mutedCls}`}>
                        {!btOn ? 'Выкл · ПКМ' : btActiveDev ? 'Подкл. · ПКМ' : 'Устр. · ПКМ'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openBtList}
                    title="Выбрать устройство Bluetooth (или ПКМ)"
                    className={`p-0.5 rounded-md shrink-0 cursor-pointer transition ${
                      btOn ? 'hover:bg-black/20 text-white/90' : 'hover:bg-white/15 opacity-75'
                    }`}
                  >
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${btOpen ? 'rotate-90' : ''}`} />
                  </button>
                </div>
              );
            })()}

            {[
              { label: isDark ? 'Тёмная' : 'Светлая', active: isDark, icon: isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />, run: () => { const nxt = isDark ? 'nothing_paper' : 'nothing_mono'; setThemeKey(nxt); triggerIslandPulse('Тема', nxt === 'nothing_paper' ? 'Светлая' : 'Тёмная', 'theme'); } },
              {
                label: designStyle === 'nova' ? 'Luma Nova' : designStyle === 'matrix' ? 'Luma Matrix' : 'Luma Glass',
                active: designStyle !== 'matrix',
                icon: <Sliders className="w-3.5 h-3.5" />,
                run: () => {
                  const nextStyle: DesignStyle = designStyle === 'matrix' ? 'glass' : designStyle === 'glass' ? 'nova' : 'matrix';
                  setDesignStyle(nextStyle);
                  if (nextStyle === 'nova') setStartMenuOpen(false);
                  else setNovaPanelOpen(false);
                },
              },
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

          {/* Inline 100% Native Luma OS Wi-Fi / Bluetooth Picker (opened via RMB or tile chevron) */}
          {ccConnectivityPicker === 'wifi' && (
            <LumaWifiPickerPanel
              isDark={isDark}
              status={wifiStatus}
              loading={wifiLoading}
              onRefresh={(rescan) => void fetchWifiStatus(Boolean(rescan))}
              onToggleRadio={(en) => void handleToggleWifi(en)}
              onConnect={handleConnectWifi}
              onDisconnect={handleDisconnectWifi}
              onClose={() => setCcConnectivityPicker('none')}
            />
          )}

          {ccConnectivityPicker === 'bluetooth' && (
            <LumaBluetoothPickerPanel
              isDark={isDark}
              status={btStatus}
              loading={btLoading}
              onRefresh={(activeScan) => void fetchBluetoothDevices(Boolean(activeScan))}
              onToggleRadio={(en) => void handleToggleBluetoothRadio(en)}
              onDeviceAction={handleBluetoothDeviceAction}
              onClose={() => setCcConnectivityPicker('none')}
            />
          )}

          {/* Volume + Real Audio Output & Input Device Switcher */}
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

          {/* Wireless Peripheral Batteries & 2.4GHz Radio Devices (Collapsible — IO Nova SE, Ajazz, Ardor, BT) */}
          {wirelessBatteries.length > 0 && (
            <div className={`pt-2.5 border-t space-y-1.5 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                <button
                  onClick={() => setBtDevicesCollapsed((c) => !c)}
                  className={`flex items-center gap-1 cursor-pointer hover:opacity-100 ${mutedCls}`}
                  title={btDevicesCollapsed ? 'Показать устройства' : 'Скрыть список устройств'}
                >
                  <Bluetooth className="w-3 h-3 text-sky-400" />
                  <span>Устройства BT / 2.4GHz ({wirelessBatteries.length})</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBtDevicesCollapsed((c) => !c)}
                    className={`px-1.5 py-0.5 rounded-md border text-[9px] font-semibold cursor-pointer ${btnCls}`}
                  >
                    {btDevicesCollapsed ? 'Показать' : 'Скрыть'}
                  </button>
                  <button
                    onClick={() => {
                      setControlCenterOpen(false);
                      openWindow('settings', 'mouse_dpi');
                    }}
                    className="text-emerald-400 hover:underline cursor-pointer"
                  >
                    DPI
                  </button>
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
              </div>
              {!btDevicesCollapsed && (
                <div className="space-y-1">
                  {wirelessBatteries.slice(0, 5).map((wb, i) => {
                    const hasBat = typeof wb.battery_percent === 'number' && wb.battery_percent >= 0;
                    const pct = hasBat ? Math.max(0, Math.min(100, wb.battery_percent)) : 0;
                    const low = hasBat && pct <= 20;
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
                        {hasBat ? (
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
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 shrink-0">
                            Подключено
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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

      {/* ==================== LUMA UNIFIED SEARCH (ALT+R) ==================== */}
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
        onLaunchInstalledApp={(pcApp) => {
          void fetch('/api/kernel/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: pcApp.id,
              name: pcApp.name,
              url: pcApp.exec_path,
              target: pcApp.exec_path,
              type: 'native',
            }),
          }).catch(() => {});
          pushToast('Запуск приложения', pcApp.name, 'success');
        }}
        onOpenWindow={(w) => openWindow(w as DexWinId)}
        onOpenSettingsTab={(tab) => openWindow('settings', tab as SettingsTabId)}
        onOpenVault={() => setVaultOpen(true)}
        onOpenControlHub={() => setCarbonHubOpen(true)}
        onOpenCustomWidgetBuilder={() => setCustomWidgetModal({ open: true, spec: null })}
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

      {/* ==================== TOP-RIGHT CORNER HOVER HOT-ZONE FOR CARBON CONTROL HUB (TAB / CORNER HOVER) ==================== */}
      {!isNova && <div
        onMouseEnter={() => {
          if (cornerHoverTimerRef.current) window.clearTimeout(cornerHoverTimerRef.current);
          cornerHoverTimerRef.current = window.setTimeout(() => {
            setCarbonHubOpen(true);
            setStartMenuOpen(false);
            setControlCenterOpen(false);
          }, 160);
        }}
        onMouseLeave={() => {
          if (cornerHoverTimerRef.current) {
            window.clearTimeout(cornerHoverTimerRef.current);
            cornerHoverTimerRef.current = null;
          }
        }}
        onClick={() => setCarbonHubOpen((v) => !v)}
        title="Наведите сюда или нажмите Tab — Панель управления Carbon + Центр уведомлений"
        className="fixed top-0 right-0 w-9 h-9 z-[942] cursor-pointer group flex items-start justify-end p-1.5"
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400/50 group-hover:bg-cyan-400 group-hover:scale-125 transition shadow-[0_0_8px_#22d3ee]" />
      </div>}

      {/* ==================== FLAGSHIP TOP-RIGHT CARBON CONTROL HUB (1/4×1/2 EDITABLE) + NOTIFICATION CENTER ==================== */}
      <LumaCarbonControlHub
        open={carbonHubOpen}
        isDark={isDark}
        onClose={() => setCarbonHubOpen(false)}
        wifiConnected={Boolean(wifiStatus?.connected)}
        wifiEnabled={wifiStatus ? wifiStatus.enabled : true}
        wifiName={wifiStatus?.active_ssid || (wifiStatus?.enabled === false ? 'Выкл' : 'Wi-Fi')}
        wifiStatus={wifiStatus}
        wifiLoading={wifiLoading}
        onToggleWifi={(en) => void handleToggleWifi(en)}
        onRefreshWifi={(rescan) => void fetchWifiStatus(Boolean(rescan))}
        onConnectWifi={handleConnectWifi}
        onDisconnectWifi={handleDisconnectWifi}
        bluetoothEnabled={btStatus ? btStatus.enabled : hubBluetoothEnabled}
        bluetoothStatus={btStatus}
        bluetoothLoading={btLoading}
        onToggleBluetooth={(en) => void handleToggleBluetoothRadio(en)}
        onRefreshBluetooth={(activeScan) => void fetchBluetoothDevices(Boolean(activeScan))}
        onBluetoothDeviceAction={handleBluetoothDeviceAction}
        dnd={dndEnabled}
        onToggleDnd={() => setDndEnabled((v) => !v)}
        volume={volume}
        muted={isMuted}
        onVolumeChange={(v) => {
          setVolume(v);
          setIsMuted(v === 0);
          void fetch('/api/kernel/audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volume: v, mute: v === 0 }),
          }).catch(() => {});
        }}
        onToggleMute={handleToggleMute}
        brightness={screenBrightness}
        onBrightnessChange={setScreenBrightness}
        onToggleTheme={() => setThemeKey(isDark ? 'nothing_paper' : 'nothing_mono')}
        dynamicIslandEnabled={dynamicIslandEnabled}
        onToggleIsland={handleToggleDynamicIsland}
        dualTaskbarMode={dualTaskbarMode}
        onToggleDualTaskbar={() => {
          setDualTaskbarMode((v) => {
            const next = !v;
            if (next) setTaskbarPosition('bottom');
            return next;
          });
        }}
        powerPlan={powerProfile === 'saver' ? 'powersaver' : powerProfile}
        onTogglePowerSaver={() => {
          const next: PowerProfile = powerProfile === 'saver' ? 'balanced' : 'saver';
          setPowerProfile(next);
          void fetch('/api/kernel/power-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: next === 'saver' ? 'powersaver' : next }),
          }).catch(() => {});
        }}
        onSetPowerPlan={(plan) => {
          const mapped: PowerProfile = plan === 'saver' ? 'saver' : plan === 'performance' ? 'performance' : 'balanced';
          setPowerProfile(mapped);
          void fetch('/api/kernel/power-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: mapped === 'saver' ? 'powersaver' : mapped }),
          }).catch(() => {});
          pushToast('План питания', mapped === 'performance' ? 'Макс. производительность' : mapped === 'saver' ? 'Энергосбережение' : 'Сбалансированный', 'info');
        }}
        nightLightLevel={nightLightLevel}
        onNightLightChange={setNightLightLevel}
        gamingBoost={gamingBoost}
        onToggleGamingBoost={() => {
          setGamingBoost((prev) => {
            const next = !prev;
            if (next) {
              setPowerProfile('performance');
              void fetch('/api/kernel/optimize', { method: 'POST' }).catch(() => {});
              pushToast('Игровой режим', 'CPU/RAM оптимизированы, включён приоритет производительности', 'success');
              triggerIslandPulse('Игровой режим: ВКЛ', 'CPU + RAM Boost', 'system');
            } else {
              setPowerProfile('balanced');
              pushToast('Игровой режим', 'Возврат в сбалансированный режим', 'info');
            }
            return next;
          });
        }}
        micMuted={micMuted}
        onToggleMicMute={() => {
          setMicMuted((m) => {
            const next = !m;
            void fetch('/api/kernel/audio/mic-mute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ muted: next }),
            }).catch(() => {});
            triggerIslandPulse(next ? 'Микрофон выключен' : 'Микрофон активен', undefined, 'audio');
            return next;
          });
        }}
        audioOutputs={audioDevices?.outputs || []}
        audioInputs={audioDevices?.inputs || []}
        activeAudioOutputId={audioDevices?.outputs?.find((d) => d.is_default)?.id}
        activeAudioInputId={audioDevices?.inputs?.find((d) => d.is_default)?.id}
        onSwitchAudioDevice={(id, kind) => {
          const list = kind === 'output' ? audioDevices?.outputs || [] : audioDevices?.inputs || [];
          const found = list.find((d) => d.id === id);
          if (found) void handleSelectAudioDevice(found);
        }}
        mediaSessions={liveMediaSessionsList}
        onMediaAction={(action, sourceApp) => {
          const mapped = action === 'playpause' ? 'play_pause' : action;
          const isSeek = mapped === 'seek_back' || mapped === 'seek_forward' || mapped.startsWith('seek_to:');
          const found = sourceApp
            ? liveMediaSessionsList.find((s) => s.source_app === sourceApp || s.id === sourceApp)
            : selectedOsSession || liveMediaSessionsList[0];
          if (sourceApp || isSeek || found) {
            void handleControlSpecificPlayer(found?.source_app || sourceApp || '', mapped, found?.display_name);
          } else {
            void fetch('/api/kernel/media', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: mapped }),
            }).catch(() => {});
          }
        }}
        onPickAccentColor={(hex) => {
          setCustomAccentOverride(hex);
          pushToast('Акцентный цвет', `Применён цвет ${hex}`, 'success');
        }}
        wirelessDevices={wirelessBatteries}
        onRefreshWireless={() => {
          void fetch('/api/kernel/wireless/batteries?refresh=1')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (Array.isArray(d?.devices)) setWirelessBatteries(d.devices);
            })
            .catch(() => {});
        }}
        trashCount={trashCount}
        enabledFeatures={enabledFeatures}
        onToggleFeature={(key) => {
          setEnabledFeatures((prev) => {
            const nextVal = !prev[key];
            if (key === 'ai') setAiEnabled(nextVal);
            if (key === 'dynamicIsland') setDynamicIslandEnabled(nextVal);
            return { ...prev, [key]: nextVal };
          });
        }}
        isPro={editionInfo.is_pro}
        isAdmin={editionInfo.is_admin}
        onOpenLens={() => setLensSearchOpen(true)}
        onOpenWindow={(w) => {
          if (w === 'security') openWindow('settings', 'security');
          else if (w === 'window_rules') openWindow('settings', 'window_rules');
          else openWindow(w as DexWinId);
        }}
        onOpenVault={() => setVaultOpen(true)}
        onOpenMouseSettings={() => openWindow('settings', 'mouse_dpi')}
        notifications={hubNotifications}
        onClearNotifications={() => {
          setHubNotifications([]);
          void fetch('/api/kernel/notifications/os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear' }),
          }).catch(() => {});
        }}
        onDismissNotification={(id) => setHubNotifications((prev) => prev.filter((n) => n.id !== id))}
        onAddNotification={(n) => {
          const now = Date.now();
          setHubNotifications((prev) => [
            {
              ...n,
              id: `hn_${now}_${Math.random().toString(36).slice(2, 5)}`,
              time: new Date(now).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
              dateLabel: 'Сегодня',
              timestamp: now,
              unread: true,
            },
            ...prev.slice(0, 119),
          ]);
          if (!dndEnabled) {
            triggerIslandPulse(`${n.sender}: ${n.title}`, n.body, n.source);
          }
        }}
        onOpenFullShade={() => setNotifShadeOpen(true)}
      />

      {/* ==================== LUMA OS 1.5.4 FULL NOTIFICATION SHADE («ШТОРКА УВЕДОМЛЕНИЙ» · ALT+N) ==================== */}
      <LumaNotificationShade
        open={notifShadeOpen}
        isDark={isDark}
        notifications={hubNotifications}
        dndEnabled={dndEnabled}
        onToggleDnd={() => setDndEnabled((v) => !v)}
        onClose={() => setNotifShadeOpen(false)}
        onClearAll={() => {
          setHubNotifications([]);
          void fetch('/api/kernel/notifications/os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear' }),
          }).catch(() => {});
        }}
        onMarkAllRead={() => {
          setHubNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
        }}
        onDismiss={(id) => {
          setHubNotifications((prev) => prev.filter((n) => n.id !== id));
        }}
        onOpenMessenger={(item) => {
          setHubNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)));
          setNotifShadeOpen(false);
          const src = item.source;
          const match = hostWindows.find((hw) => {
            const txt = `${hw.name} ${hw.title} ${hw.friendly_name || ''}`.toLowerCase();
            if (src === 'telegram') return txt.includes('telegram') || txt.includes('ayugram');
            if (src === 'whatsapp') return txt.includes('whatsapp');
            if (src === 'discord') return txt.includes('discord');
            if (src === 'browser') return txt.includes('chrome') || txt.includes('edge') || txt.includes('yandex') || txt.includes('firefox') || txt.includes('opera');
            return false;
          });
          if (match?.pid) {
            void handleFocusHostWindow(match.pid);
          }
        }}
        onSendTest={() => {
          void fetch('/api/kernel/notifications/os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              app: 'Telegram',
              sender: 'Дмитрий',
              chat: 'Личный чат',
              title: 'Дмитрий',
              body: 'Привет! Погнали тестить Luma OS 1.6.2 Nitrogen — шторка, AI 5.0 и Умный Dock работают мгновенно.',
            }),
          }).catch(() => {});
        }}
      />

      {/* ==================== LIVE FLOATING INCOMING MESSENGER BANNER (TELEGRAM / WHATSAPP / DISCORD / VK) ==================== */}
      {incomingBanner && (
        <div
          onClick={() => {
            const src = incomingBanner.source;
            setIncomingBanner(null);
            const match = hostWindows.find((hw) => {
              const txt = `${hw.name} ${hw.title} ${hw.friendly_name || ''}`.toLowerCase();
              if (src === 'telegram') return txt.includes('telegram') || txt.includes('ayugram');
              if (src === 'whatsapp') return txt.includes('whatsapp');
              if (src === 'discord') return txt.includes('discord');
              return false;
            });
            if (match?.pid) {
              void handleFocusHostWindow(match.pid);
            } else {
              setNotifShadeOpen(true);
            }
          }}
          className={`fixed top-14 right-4 z-[9950] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border p-3.5 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-2xl cursor-pointer transition-all animate-in slide-in-from-right-6 fade-in duration-200 ${
            isDark
              ? 'bg-[#0d121d]/95 border-white/18 text-white hover:border-[var(--luma-accent)]'
              : 'bg-white/95 border-slate-300 text-slate-900 hover:border-[var(--luma-accent)]'
          }`}
        >
          <div className="flex items-start gap-3">
            {incomingBanner.avatarUrl ? (
              <img
                src={incomingBanner.avatarUrl}
                alt=""
                className="w-11 h-11 rounded-full object-cover border-2 border-[var(--luma-accent)]/60 shrink-0 shadow"
              />
            ) : (
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 shadow ${
                  incomingBanner.source === 'telegram'
                    ? 'bg-gradient-to-br from-sky-400 to-blue-600'
                    : incomingBanner.source === 'whatsapp'
                    ? 'bg-gradient-to-br from-emerald-400 to-green-600'
                    : incomingBanner.source === 'discord'
                    ? 'bg-gradient-to-br from-indigo-400 to-violet-600'
                    : 'bg-gradient-to-br from-[var(--luma-accent)] to-cyan-500'
                }`}
              >
                {(incomingBanner.sender || 'L').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold truncate">
                  {incomingBanner.chat && incomingBanner.chat !== incomingBanner.sender
                    ? `${incomingBanner.sender} → ${incomingBanner.chat}`
                    : incomingBanner.sender}
                </span>
                <span className="text-[10px] font-mono opacity-60 shrink-0">{incomingBanner.time}</span>
              </div>
              <div className={`text-xs mt-0.5 line-clamp-2 leading-snug ${isDark ? 'text-white/85' : 'text-slate-700'}`}>
                {incomingBanner.body || incomingBanner.title}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent)]/15 text-[var(--luma-accent)] font-bold uppercase">
                  {incomingBanner.source === 'telegram'
                    ? 'Telegram'
                    : incomingBanner.source === 'whatsapp'
                    ? 'WhatsApp'
                    : incomingBanner.source === 'discord'
                    ? 'Discord'
                    : 'Входящее сообщение'}
                </span>
                <span className="opacity-60">Нажмите, чтобы открыть</span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIncomingBanner(null);
              }}
              className="p-1 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Warm Night Light Eye-Protection Filter Overlay */}
      {nightLightLevel > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[99990] transition-opacity duration-300"
          style={{
            backgroundColor: `rgba(255, 146, 43, ${(nightLightLevel / 100) * 0.42})`,
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* ==================== SUPER-CONFIDENTIALITY AES-256-GCM ISOLATED PRIVATE DESKTOP ==================== */}
      <LumaPrivateVaultOverlay
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onLaunchTarget={(target) => {
          void fetch('/api/kernel/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: `vault_${Date.now()}`, name: target, url: target, target, type: 'native' }),
          }).catch(() => {});
        }}
        onNotify={(title, msg, kind) => pushToast(title, msg, kind === 'warn' ? 'warning' : kind || 'info')}
      />

      {/* ==================== NATIVE CUSTOM ALT+TAB WINDOW SWITCHER (TOPMOST OVER ALL WINDOWS) ==================== */}
      <LumaAltTabSwitcher
        open={altTabOpen}
        isDark={isDark}
        items={altTabEntries}
        selectedIndex={altTabIdx}
        wallpaperPreviewUrl={wallpaperImageUrl || '/luma-oxygen-hero.jpg'}
        fromExternal={altTabFromExternal}
        onSelectIndex={setAltTabIdx}
        onActivate={(item) => activateAltTabEntry(item)}
        onGoHome={() => returnToLumaHome(false)}
        onToggleTopmost={(item) => {
          if (item.kind === 'luma') {
            toggleWindowAlwaysOnTop(item.id as DexWinId);
          } else if (item.pid) {
            void handleToggleHostTopmost(item.pid, item.hwnd);
          }
        }}
        onCloseItem={(item) => {
          if (item.kind === 'luma') {
            closeWindow(item.id as DexWinId);
          } else if (item.pid) {
            void fetch('/api/kernel/windows/close', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pid: item.pid }),
            })
              .then(() => void pollHostWindows())
              .catch(() => {});
          }
        }}
        onCancel={cancelAltTab}
      />

      {/* ==================== LUMA OS 1.6.2 (NITROGEN) DEVELOPER MODE LIVE HUD ==================== */}
      <LumaDevHudOverlay
        enabled={devModeEnabled}
        isDark={isDark}
        onClose={() => setDevModeEnabled(false)}
        onElevateAdmin={() => void handleElevateAdmin()}
        onPushToast={pushToast}
      />

      {/* ==================== LUMA OS 1.7.3 (OXYGEN) — UNIFIED SYSTEM + PHONE CIRCLE TO SEARCH ==================== */}
      <LumaLensSearchOverlay
        open={lensSearchOpen}
        isDark={isDark}
        initialImageSrc={lensInitialImage}
        initialSourceKind={lensInitialSourceKind}
        preferCachedScreen={lensPreferCached}
        aiConfig={(() => {
          const activeP = AI_PROVIDER_PRESETS.find((p) => p.id === aiConfig.provider) || AI_PROVIDER_PRESETS[0];
          const providerKeys: Record<string, string> = {};
          const providerModels: Record<string, string> = {};
          const providerUrls: Record<string, string> = {};
          AI_PROVIDER_PRESETS.forEach((p) => {
            const k = (aiConfig.apiKeys?.[p.id] || '').trim();
            if (k) providerKeys[p.id] = k;
            const m = (aiConfig.models?.[p.id] || p.defaultModel || '').trim();
            if (m) providerModels[p.id] = p.id === 'gemini' ? m.replace(/^(?:models\/)+/i, '') : m;
            const u = (aiConfig.baseUrls?.[p.id] || p.defaultBaseUrl || '').trim();
            if (u) providerUrls[p.id] = u;
          });
          return {
            provider: aiConfig.provider,
            baseUrl: (aiConfig.baseUrls?.[aiConfig.provider] || activeP.defaultBaseUrl || '').trim(),
            apiKey: (aiConfig.apiKeys?.[aiConfig.provider] || '').trim(),
            model: (aiConfig.models?.[aiConfig.provider] || activeP.defaultModel || '').trim(),
            providerKeys,
            providerModels,
            providerUrls,
          };
        })()}
        onClose={() => {
          setLensSearchOpen(false);
          setLensInitialImage(null);
          setLensPreferCached(false);
        }}
        onAskAI={(prompt) => {
          openWindow('ai');
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('luma-ai-ask', { detail: { prompt } }));
          }, 120);
        }}
        onNotify={(title, msg, level) => pushToast(title, msg, level || 'info')}
      />

      {/* ==================== LUMA OS 1.6.7 (NITROGEN) LUMA NOVA STYLE TOP-RIGHT PILL & COMPACT PANEL ==================== */}
      {isNova && (
        <div
          className={`transition-opacity duration-300 ${
            visualNoiseHidden && !novaPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
        <LumaNovaPanel
          open={novaPanelOpen}
          onToggleOpen={() => {
            setStartMenuOpen(false);
            setControlCenterOpen(false);
            setNovaPanelOpen((v) => !v);
          }}
          onClose={() => setNovaPanelOpen(false)}
          onSwitchToClassic={() => {
            setDesignStyle('matrix');
            setNovaPanelOpen(false);
            pushToast('Стиль панели', 'Возвращена классическая панель задач', 'success');
          }}
          isDark={isDark}
          batteryLevel={batteryLevel}
          isCharging={isCharging}
          kbdShort={liveKbdShort || kbdLayouts?.active?.short || 'RUS'}
          volume={volume}
          isMuted={isMuted}
          brightness={screenBrightness}
          dndEnabled={dndEnabled}
          nightLightEnabled={nightLightLevel > 0}
          unreadNotifsCount={unreadNotifCount}
          activeDesktop={activeDesktop}
          apps={combinedApps}
          openLumaWindows={openSystemWindowsList.map((w) => ({
            id: w.id,
            title: w.label,
            minimized: Boolean(windows[w.id]?.minimized),
            alwaysOnTop: Boolean(windows[w.id]?.alwaysOnTop),
          }))}
          hostWindows={orderedHostWindows}
          onSwitchDesktop={(desk) => {
            setActiveDesktop(desk);
            triggerIslandPulse(`Рабочий стол ${desk}`, undefined, 'desktop');
          }}
          onOpenSpotlight={() => {
            setNovaPanelOpen(false);
            setSpotlightOpen(true);
          }}
          onLaunchApp={(app) => {
            setNovaPanelOpen(false);
            handleLaunchApp(app);
          }}
          onOpenLumaWindow={(id) => {
            setNovaPanelOpen(false);
            openWindow(id as DexWinId);
          }}
          onCloseLumaWindow={(id) => closeWindow(id as DexWinId)}
          onToggleLumaTopmost={(id) => toggleWindowAlwaysOnTop(id as DexWinId)}
          onFocusHostWindow={(pid) => {
            setNovaPanelOpen(false);
            void handleFocusHostWindow(pid);
          }}
          onToggleHostTopmost={(pid, hwnd) => void handleToggleHostTopmost(pid, hwnd)}
          onCycleKeyboard={() => {
            const list = kbdLayouts?.installed || [];
            if (list.length > 1) {
              const curIdx = list.findIndex((l) => l.tag.toLowerCase() === (kbdLayouts?.active_tag || '').toLowerCase());
              const nextLay = list[(curIdx + 1) % list.length];
              if (nextLay) void handleSwitchKeyboardLayout(nextLay.tag, nextLay.hkl);
            }
          }}
          onChangeVolume={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onChangeBrightness={setScreenBrightness}
          onToggleDnd={() => setDndEnabled((v) => !v)}
          onToggleNightLight={() => setNightLightLevel((v) => (v > 0 ? 0 : 45))}
          onOpenSettings={() => {
            setNovaPanelOpen(false);
            openWindow('settings', 'appearance');
          }}
          onPowerAction={(act) => {
            setNovaPanelOpen(false);
            void handleExecutePowerAction(act);
          }}
        />
        </div>
      )}

      {/* ==================== LUMA OS 1.6.1 (NITROGEN) QUICK LOOK MODAL (SPACE IN EXPLORER, SHUTTERS, DESKTOP & DOCK — ITEM 10) ==================== */}
      <LumaQuickLookModal
        open={quickLookState.open}
        items={quickLookState.items}
        activeIndex={quickLookState.index}
        isDark={isDark}
        onChangeIndex={(nextIdx) => setQuickLookState((prev) => ({ ...prev, index: nextIdx }))}
        onClose={() => setQuickLookState((prev) => ({ ...prev, open: false }))}
        onOpenExternal={(p) => {
          void fetch('/api/kernel/fs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'open', path: p }),
          }).catch(() => {});
        }}
        onPushToast={pushToast}
      />

      {/* ==================== CUSTOM USER WIDGET BUILDER (PHOTO + LIVE JS SCRIPT) ==================== */}
      <LumaCustomWidgetBuilder
        open={customWidgetModal.open}
        isDark={isDark}
        initialSpec={customWidgetModal.spec}
        previewCtx={{
          telemetry: {
            cpu_percent: liveSystem?.cpu_percent ?? 18,
            ram_percent: liveSystem?.ram_percent ?? 42,
            ram_used_gb: liveSystem?.ram_used_gb ?? 6.7,
            ram_total_gb: liveSystem?.ram_total_gb ?? 16,
            gpu_percent: liveSystem?.gpu_percent ?? 14,
            gpu_temp_c: liveSystem?.gpu_temp_c ?? 48,
            battery_pct: batteryLevel,
            battery_charging: isCharging,
          },
          wireless: wirelessBatteries.map((d) => ({
            name: d.name,
            battery_percent: d.battery_percent,
            device_type: d.device_type,
            transport: d.transport,
          })),
          time: {
            hhmm: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
            seconds: String(new Date().getSeconds()).padStart(2, '0'),
            dateStr: new Date().toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
            hour: new Date().getHours(),
          },
          weather: { temp: 21, desc: 'Ясно', city: liveSystem?.location?.city || 'Luma OS' },
        }}
        onClose={() => setCustomWidgetModal({ open: false, spec: null })}
        onSave={(spec) =>
          setPendingCustomWidget({
            seq: Date.now(),
            editWidgetId: customWidgetModal.editWidgetId,
            spec,
          })
        }
      />

      {/* ==================== RIGHT-SIDE LARGER SYSTEM NOTIFICATIONS (1.3.1 BERYLLIUM) ==================== */}
      <div
        className={`fixed z-[95] flex flex-col gap-2.5 w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] pointer-events-none ${
          taskbarPosition === 'right' && isTaskbarShown ? 'right-20' : 'right-5'
        } ${
          taskbarPosition === 'top' ? 'top-20' : 'top-5'
        }`}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`luma-toast-right pointer-events-auto p-4 rounded-2xl border shadow-2xl flex items-start gap-3.5 ${popoverShellCls}`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                t.type === 'warning'
                  ? 'bg-amber-500/20 text-amber-400'
                  : t.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)]'
              }`}
            >
              {t.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold leading-snug">{t.title}</div>
              <div className={`text-xs mt-0.5 leading-relaxed break-words ${mutedCls}`}>{t.message}</div>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="p-1 rounded-lg opacity-55 hover:opacity-100 cursor-pointer shrink-0"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
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
                  Luma OS 1.7.3 (Oxygen · O-8) · Space — Luma Peek · Alt+W — Обзор · 📌 Поверх окон
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
                      {(['office', 'explorer', 'ai', 'code_studio', 'cut_studio', 'terminal', 'settings'] as DexWinId[]).map((wid) => {
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

            {/* Real Host PC Windows + Side-by-Side 2-Window Multitasking */}
            {hostWindows.length > 0 && (() => {
              const selectableWins = hostWindows.filter((w) => !w.is_self);
              const effLeft =
                splitLeftPid && selectableWins.some((w) => w.pid === splitLeftPid)
                  ? splitLeftPid
                  : selectableWins[0]?.pid || 0;
              const effRight =
                splitRightPid && selectableWins.some((w) => w.pid === splitRightPid && w.pid !== effLeft)
                  ? splitRightPid
                  : selectableWins.find((w) => w.pid !== effLeft)?.pid || 0;
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
                      {t('hostWindows', 'Открытые окна системы (ПК)')} ({selectableWins.length})
                    </div>
                    {selectableWins.length >= 2 && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <select
                          value={effLeft}
                          onChange={(e) => setSplitLeftPid(Number(e.target.value))}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white outline-none max-w-[180px]"
                          title="Левое окно (50%)"
                        >
                          {selectableWins.map((w) => (
                            <option key={`sl_${w.pid}`} value={w.pid} className="bg-zinc-900 text-white">
                              ◧ {w.friendly_name || w.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={effRight}
                          onChange={(e) => setSplitRightPid(Number(e.target.value))}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white outline-none max-w-[180px]"
                          title="Правое окно (50%)"
                        >
                          {selectableWins.map((w) => (
                            <option key={`sr_${w.pid}`} value={w.pid} className="bg-zinc-900 text-white">
                              ◨ {w.friendly_name || w.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => void handleSplitTwoHostWindows(effLeft, effRight)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent)] hover:brightness-110 text-white font-bold cursor-pointer inline-flex items-center gap-1.5 shadow"
                        >
                          <LayoutPanelLeft className="w-3.5 h-3.5" />
                          Открыть 2 окна рядом
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {selectableWins.map((hw) => (
                      <div
                        key={hw.pid}
                        className="p-3 rounded-xl border border-white/10 bg-white/[0.04] hover:border-[var(--luma-accent)] transition flex flex-col justify-between gap-2"
                      >
                        <button
                          onClick={() => {
                            void handleFocusHostWindow(hw.pid);
                            setMultitaskingOpen(false);
                          }}
                          className="flex items-center gap-2 text-left min-w-0 cursor-pointer"
                        >
                          {hw.icon_url ? (
                            <img
                              src={hw.icon_url}
                              alt=""
                              className="w-5 h-5 rounded object-contain shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Monitor className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{hw.title || hw.friendly_name || hw.name}</div>
                            <div className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                              {hw.friendly_name || hw.name} · PID {hw.pid} · {hw.mem_mb.toFixed(0)} МБ
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 text-[10px] font-mono">
                          <button
                            onClick={() => {
                              void handleSnapHostWindow(hw.pid, 'left');
                              setMultitaskingOpen(false);
                            }}
                            className="flex-1 py-1 rounded-lg bg-white/10 hover:bg-[var(--luma-accent)] cursor-pointer"
                          >
                            ◀ 50%
                          </button>
                          <button
                            onClick={() => {
                              void handleSnapHostWindow(hw.pid, 'right');
                              setMultitaskingOpen(false);
                            }}
                            className="flex-1 py-1 rounded-lg bg-white/10 hover:bg-[var(--luma-accent)] cursor-pointer"
                          >
                            50% ▶
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
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

      {/* ==================== LUMA OS 1.7 (OXYGEN): YOINK / DROPZONE DRAG & DROP SHELF ==================== */}
      <LumaDropShelf
        isDark={isDark}
        onPushToast={pushToast}
        onCopyToClipboard={(txt) => void copyTextToClipboard(txt)}
      />

      {/* ==================== LUMA OS 1.7 (OXYGEN): SMART CLIPBOARD WITH CATEGORIES, COLOR SWATCHES & AUTO-OCR ==================== */}
      <LumaSmartClipboardModal
        open={smartClipboardOpen}
        isDark={isDark}
        entries={clipboardHistory}
        onClose={() => setSmartClipboardOpen(false)}
        onPastePlain={(txt, simulate) => void pastePlainFromSmartClipboard(txt, Boolean(simulate))}
        onTogglePin={(id) =>
          setClipboardHistory((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
        }
        onDelete={(id) => setClipboardHistory((prev) => prev.filter((c) => c.id !== id))}
        onClearUnpinned={() => setClipboardHistory((prev) => prev.filter((c) => c.pinned))}
        onAddEntry={(entry) => {
          const tStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          const next: ClipboardEntry = {
            id: entry.id || `clip_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            text: entry.text || '',
            pinned: Boolean(entry.pinned),
            time: entry.time || tStr,
            source: entry.source,
            imageData: entry.imageData,
            ocrText: entry.ocrText,
          };
          setClipboardHistory((prev) => [next, ...prev.slice(0, 49)]);
        }}
        onUpdateOCRText={(id, ocrText) =>
          setClipboardHistory((prev) => prev.map((c) => (c.id === id ? { ...c, ocrText } : c)))
        }
        onPushToast={pushToast}
      />

      {/* ==================== LUMA OS 1.7 (OXYGEN): NEXT-GEN TRANSLUCENT CAPSULE OSD OVERLAYS ==================== */}
      <LumaOxygenOSD
        isDark={isDark}
        volume={volume}
        muted={isMuted}
        brightness={screenBrightness}
        mediaTitle={selectedOsSession?.title || (liveSystem?.media?.available ? liveSystem.media.title : '')}
        mediaArtist={selectedOsSession?.artist || (liveSystem?.media?.available ? liveSystem.media.artist : '')}
        bluetoothBatteryDevices={wirelessBatteries
          .filter((w) => w.battery_percent > 0)
          .map((w) => ({ name: w.name, battery: w.battery_percent }))}
        onWindowRulesRuntime={(dnd, noComp) => {
          if (dnd !== kwinAutoDnd) {
            setKwinAutoDnd(dnd);
            if (dnd) setDndEnabled(true);
          }
          if (noComp !== kwinNoCompositor) {
            setKwinNoCompositor(noComp);
            document.documentElement.classList.toggle('luma-perf-no-blur', noComp);
          }
        }}
      />

      {/* ==================== LUMA OS 1.7.2 (OXYGEN): MODULAR WIDGET PANEL + KDE/WAYBAR SCROLL ACTIONS ==================== */}
      <LumaModularPanelBar
        config={modularPanelCfg}
        onChangeConfig={setModularPanelCfg}
        isDark={isDark}
        isPro={editionInfo.is_pro}
        isAdmin={editionInfo.is_admin}
        visualNoiseHidden={visualNoiseHidden}
        weatherTemp="+21°"
        weatherDesc="Ясно"
        weatherCity={liveSystem?.location?.city || 'Luma OS'}
        cpuLoad={cpuLoad}
        gpuLoad={Math.round(liveSystem?.gpu_percent || 0)}
        ramLoad={ramLoad}
        mediaTitle={selectedOsSession?.title || (liveSystem?.media?.available ? liveSystem.media.title : '')}
        mediaPlaying={Boolean(selectedOsSession?.is_playing || mediaPlaying)}
        onMediaAction={(action) => {
          void fetch('/api/kernel/media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          }).catch(() => {});
        }}
        clipboardTexts={clipboardHistory.map((c) => c.text).filter(Boolean)}
        onOpenClipboard={() => setSmartClipboardOpen(true)}
        onCopyText={(txt) => void copyTextToClipboard(txt)}
        activeDesktop={activeDesktop}
        desktopCount={virtualDesktops.length}
        onSwitchDesktop={(n) => setActiveDesktop(n)}
        brightness={screenBrightness}
        onBrightnessChange={setScreenBrightness}
        volume={volume}
        muted={isMuted}
        onVolumeChange={(v) => {
          setVolume(v);
          setIsMuted(v === 0);
          void fetch('/api/kernel/audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volume: v, mute: v === 0 }),
          }).catch(() => {});
        }}
        onToggleMute={handleToggleMute}
        onOpenSuperDevice={() => openWindow('superdevice')}
        onOpenCircleSearch={() => openUnifiedCircleSearch({ preCaptured: false })}
        onOpenPhotoStudio={() => openWindow('photo_editor')}
        onOpenTaskMgr={() => openWindow('taskmgr')}
        onOpenEditionSettings={() => openWindow('settings', 'about')}
        onPushToast={pushToast}
      />

      {/* ==================== LUMA OS 1.7.2 (OXYGEN): HARMONYOS FULL-SCREEN FILE TRANSFER WAVE ==================== */}
      <LumaHarmonyTransferWave isDark={isDark} onPushToast={pushToast} />

      {/* ==================== OXYGEN 1.7.1 AWAKENING ANIMATION & PLAYABLE MINI-GAMES (NEW + CLASSIC) ==================== */}
      <LumaHeliumEasterEggModal open={easterEggOpen} onClose={() => setEasterEggOpen(false)} />

      {/* ==================== LUMA OS 1.4 BORON CINEMATIC UPDATE OVERLAY (REAL OTA + DEMO PREVIEW) ==================== */}
      <LumaUpdateCinemaOverlay
        open={Boolean(updateCinemaDemo) || (updateProgress.running && !updateCinemaDismissed)}
        progress={updateCinemaDemo || updateProgress}
        previewMode={Boolean(updateCinemaDemo)}
        onClose={() => {
          updateDemoTimersRef.current.forEach((id) => window.clearTimeout(id));
          updateDemoTimersRef.current = [];
          if (updateCinemaDemo) setUpdateCinemaDemo(null);
          else setUpdateCinemaDismissed(true);
        }}
      />

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

      {/* ==================== VERSION ROLLBACK CONFIRMATION MODAL (1.3) ==================== */}
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
                Текущая сборка <b>1.3</b> будет автоматически сохранена в <code>%APPDATA%/LumaOS/versions</code>, а все ваши виджеты, папки, обои и настройки останутся на месте.
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
                Установка Luma OS {updateProgress.target_version || '1.3'}
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
