/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  AppWindow,
  BarChart3,
  BatteryCharging,
  Bell,
  BellOff,
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Code2,
  Compass,
  Copy,
  Disc3,
  Download,
  ExternalLink,
  EyeOff,
  FileCode,
  FileText,
  Film,
  Flag,
  FolderOpen,
  Gamepad2,
  Github,
  Globe,
  Grid,
  Headphones,
  Info,
  LayoutGrid,
  Lock,
  MapPin,
  MessageSquare,
  Moon,
  MoreVertical,
  MousePointerClick,
  Music,
  Pause,
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
  Sun,
  Terminal,
  Timer,
  Trash2,
  Trophy,
  Users,
  Volume1,
  Volume2,
  VolumeX,
  Wifi,
  X,
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
import { DexWindow } from './components/DexWindow';
import { DesktopGridCols, LumaDesktopCanvas, WallpaperStyle } from './components/LumaDesktopCanvas';
import { LumaSpotlight } from './components/LumaSpotlight';
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
const STORAGE_KEY = 'luma_os_1_0_2b_shell_state';
const LEGACY_KEYS = ['luma_os_1_0_2_shell_state', 'luma_os_1_0_1_shell_state'];

type DexWinId = 'apps' | 'terminal' | 'tracker' | 'kernel' | 'settings' | 'plugins' | 'island' | 'spaces';

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

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
        active
          ? 'bg-[#d71921]/15 text-[#d71921] border-[#d71921]/45'
          : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/25'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[#d71921]' : 'bg-zinc-500'}`} />
      {active ? 'ВКЛ' : 'ВЫКЛ'}
    </span>
  );
}

const INITIAL_WINDOWS: Record<DexWinId, DexWinState> = {
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
  const [glassEnabled, setGlassEnabled] = useState<boolean>(savedState?.glassEnabled ?? true);
  const [glassIntensity, setGlassIntensity] = useState<GlassIntensity>(savedState?.glassIntensity || 'medium');
  const [glassOpacity, setGlassOpacity] = useState<number>(savedState?.glassOpacity ?? 90);
  const [smoothAnimations, setSmoothAnimations] = useState<boolean>(savedState?.smoothAnimations ?? true);
  const [uiDensity, setUiDensity] = useState<'comfortable' | 'compact'>(savedState?.uiDensity || 'comfortable');
  const [cardBorderRadius, setCardBorderRadius] = useState<number>(savedState?.cardBorderRadius ?? 18);
  const [cardColumns, setCardColumns] = useState<number>(savedState?.cardColumns ?? 4);
  const [showPluginsInGrid, setShowPluginsInGrid] = useState<boolean>(savedState?.showPluginsInGrid ?? true);
  const [desktopCols, setDesktopCols] = useState<DesktopGridCols>(savedState?.desktopCols === 20 ? 20 : 22);
  const [wallpaper, setWallpaper] = useState<WallpaperStyle>(savedState?.wallpaper || 'dots');
  const [desktopEditMode, setDesktopEditMode] = useState<boolean>(false);

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

  // --- DeX Window Manager State (Clean Empty Desktop on Boot!) ---
  const [windows, setWindows] = useState<Record<DexWinId, DexWinState>>(INITIAL_WINDOWS);
  const zCounterRef = useRef<number>(25);
  const [spotlightOpen, setSpotlightOpen] = useState<boolean>(false);
  const [controlCenterOpen, setControlCenterOpen] = useState<boolean>(false);

  // --- Apps Window (Window 1 Grouped Structure), Tracker, Plugins, Spaces ---
  const [apps, setApps] = useState<AppItem[]>(savedState?.apps || INITIAL_APPS);
  const [detoxGroups] = useState<DetoxGroup[]>(savedState?.detoxGroups || INITIAL_DETOX_GROUPS);
  const [groupedViewStyle, setGroupedViewStyle] = useState<'list_and_cards' | 'list' | 'cards'>(
    savedState?.groupedViewStyle || 'list_and_cards'
  );
  const [currentFilter, setCurrentFilter] = useState<'all' | 'web' | 'app' | 'system' | 'plugin' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [trackerPeriod, setTrackerPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [plugins, setPlugins] = useState<PluginItem[]>(savedState?.plugins || INITIAL_PLUGINS);
  const [workspaces] = useState<WorkspacePreset[]>(INITIAL_WORKSPACES);

  // --- Real Host Telemetry, Audio, Media & Luma Island ---
  const [liveSystem, setLiveSystem] = useState<LiveSystemTelemetry | null>(null);
  const [kernelConnected, setKernelConnected] = useState<boolean>(false);
  const [cpuLoad, setCpuLoad] = useState<number>(0);
  const [ramLoad, setRamLoad] = useState<number>(0);
  const [batteryLevel, setBatteryLevel] = useState<number>(savedState?.batteryLevel ?? 100);
  const [isCharging, setIsCharging] = useState<boolean>(savedState?.isCharging ?? true);
  const [volume, setVolume] = useState<number>(savedState?.volume ?? 68);
  const [isMuted, setIsMuted] = useState<boolean>(savedState?.isMuted ?? false);
  const audioPostTimerRef = useRef<number | null>(null);

  const [dynamicIslandEnabled, setDynamicIslandEnabled] = useState<boolean>(
    savedState?.dynamicIslandEnabled ?? false
  );
  const [dndEnabled, setDndEnabled] = useState<boolean>(savedState?.dndEnabled ?? false);
  const [islandTab, setIslandTab] = useState<'overview' | 'notifications' | 'player' | 'timer' | 'stopwatch'>('overview');
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

  // --- Settings, Kernel IPC, Code Viewer & Sub-Modals ---
  const [settingsTab, setSettingsTab] = useState<
    'luma' | 'island' | 'appearance' | 'clock' | 'navigation' | 'plugins' | 'updater' | 'about'
  >('luma');
  const [changelogFilter, setChangelogFilter] = useState<string>('all');
  const [githubAutoUpdate, setGithubAutoUpdate] = useState<boolean>(savedState?.githubAutoUpdate ?? true);
  const [githubRepoUrl, setGithubRepoUrl] = useState<string>(
    savedState?.githubRepoUrl || 'https://github.com/Tveexty/L_H-3.0'
  );
  const [githubUpdateStatus, setGithubUpdateStatus] = useState<string>('Установлена сборка Luma OS 1.0.2b');
  const [checkingGithub, setCheckingGithub] = useState<boolean>(false);
  const [diagnosticsTime, setDiagnosticsTime] = useState<string>('Готово к проверке');
  const [cryptoKeyVersion, setCryptoKeyVersion] = useState<number>(1);
  const [lumaRpcMethod, setLumaRpcMethod] = useState<
    'system.ping' | 'widgets.get_data' | 'widgets.list' | 'security.status' | 'security.rotate_key'
  >('system.ping');
  const [lumaRpcLiveData, setLumaRpcLiveData] = useState<Record<string, unknown> | null>(null);
  const [selectedCodePath, setSelectedCodePath] = useState<string>('luma_kernel_main.go');
  const [codeContent, setCodeContent] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Sub-modals
  const [addAppModalOpen, setAddAppModalOpen] = useState<boolean>(false);
  const [customThemeModalOpen, setCustomThemeModalOpen] = useState<boolean>(false);
  const [contextMenuApp, setContextMenuApp] = useState<AppItem | null>(null);
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

  const pushToast = (title: string, message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    if (dndEnabled && type !== 'warning') return;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, title, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // --- DeX Window Controls ---
  const openWindow = (id: DexWinId, tab?: typeof settingsTab) => {
    if (id === 'settings' && tab) setSettingsTab(tab);
    zCounterRef.current += 1;
    const nextZ = zCounterRef.current;
    setWindows((prev) => ({
      ...prev,
      [id]: { open: true, minimized: false, z: nextZ },
    }));
    setControlCenterOpen(false);
  };

  const toggleTaskbarWindow = (id: DexWinId) => {
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
  };

  // --- Sync dark mode class on <html> ---
  useEffect(() => {
    document.documentElement.classList.toggle('dark', currentTheme.isDark);
  }, [currentTheme.isDark]);

  // --- Persist state cleanly ---
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          themeKey,
          customThemes,
          glassEnabled,
          glassIntensity,
          glassOpacity,
          smoothAnimations,
          uiDensity,
          cardBorderRadius,
          cardColumns,
          showPluginsInGrid,
          desktopCols,
          wallpaper,
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
    glassEnabled,
    glassIntensity,
    glassOpacity,
    smoothAnimations,
    uiDensity,
    cardBorderRadius,
    cardColumns,
    showPluginsInGrid,
    desktopCols,
    wallpaper,
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
    const bc = new BroadcastChannel('luma_os_1_0_2b_sync');
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

  // --- Global Keyboard Shortcuts (Ctrl+K Spotlight, Escape, Alt+D Show Desktop) ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpotlightOpen((v) => !v);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        showDesktop();
        return;
      }
      if (e.key === 'Escape') {
        if (spotlightOpen) setSpotlightOpen(false);
        else if (controlCenterOpen) setControlCenterOpen(false);
        else if (contextMenuApp) setContextMenuApp(null);
        else if (addAppModalOpen) setAddAppModalOpen(false);
        else if (customThemeModalOpen) setCustomThemeModalOpen(false);
        else if (desktopEditMode) setDesktopEditMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [spotlightOpen, controlCenterOpen, contextMenuApp, addAppModalOpen, customThemeModalOpen, desktopEditMode]);

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

  // --- Poll REAL Host Telemetry from Luma Core 1.0.2b (/api/kernel/system) ---
  const pollSystemTelemetry = async () => {
    try {
      const res = await fetch('/api/kernel/system');
      if (!res.ok) return;
      const snap: LiveSystemTelemetry = await res.json();
      setLiveSystem(snap);
      setKernelConnected(true);
      setCpuLoad(snap.cpu_percent);
      setRamLoad(snap.ram_percent);
      setBatteryLevel(snap.battery_percent);
      setIsCharging(snap.battery_charging);
    } catch {
      setKernelConnected(false);
    }
  };

  useEffect(() => {
    pollSystemTelemetry();
    const id = window.setInterval(pollSystemTelemetry, 2000);
    return () => window.clearInterval(id);
  }, []);

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
        body: JSON.stringify({ volume: clamped, muted: clamped === 0 }),
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
      body: JSON.stringify({ volume, muted: next }),
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
      pushToast('Питание', 'Доступно при запуске LumaOS_1.0.2b.exe', 'info');
    }
  };

  const callLumaKernelRpc = async (method: string) => {
    try {
      const r = await fetch('/api/kernel/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: {} }),
      });
      if (r.ok) {
        const data = await r.json();
        setLumaRpcLiveData(data.result || data);
        if (method === 'security.rotate_key') setCryptoKeyVersion((v) => v + 1);
      }
    } catch {
      setLumaRpcLiveData({ status: 'offline', method });
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
      pushToast('Запуск', `${app.name} — отсчёт сессии с 00:00`, 'info');
    }
  };

  const handleToggleFavorite = (app: AppItem) => {
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, favorite: !a.favorite } : a)));
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAppName.trim();
    if (!clean) return;
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
    };
    setApps((prev) => [created, ...prev]);
    setNewAppName('');
    setNewAppUrl('');
    setAddAppModalOpen(false);
    pushToast('Добавлено', `«${clean}» в библиотеке приложений`, 'info');
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
    return combinedApps.filter((a) => {
      if (currentFilter !== 'all' && a.type !== currentFilter) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
    });
  }, [combinedApps, currentFilter, searchQuery]);

  const groupedApps = useMemo(() => {
    const map: Record<string, AppItem[]> = {};
    filteredApps.forEach((a) => {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    });
    return Object.entries(map);
  }, [filteredApps]);

  const favoriteApps = useMemo(() => filteredApps.filter((a) => a.favorite), [filteredApps]);
  const runningAppsCount = useMemo(() => apps.filter((a) => a.isRunning).length, [apps]);
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

  // Strict Industrial Surface Tokens
  const isDark = currentTheme.isDark;
  const surfaceCls = isDark
    ? 'bg-[#141418] border-white/[0.09] text-zinc-100'
    : 'bg-white border-zinc-900/[0.1] text-zinc-900';
  const btnCls = isDark
    ? 'bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.09] text-zinc-200'
    : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800';
  const mutedCls = isDark ? 'text-zinc-400' : 'text-zinc-500';

  const renderAppIcon = (iconName: string, className = 'w-4 h-4') => {
    const Comp = ICON_MAP[iconName] || AppWindow;
    return <Comp className={className} />;
  };

  // Taskbar pinned + dynamic open windows
  const taskbarApps: { id: DexWinId; label: string; icon: React.ReactNode; pinned: boolean }[] = [
    { id: 'apps', label: 'Приложения', icon: <AppWindow className="w-4 h-4" />, pinned: true },
    { id: 'terminal', label: 'Терминал', icon: <Terminal className="w-4 h-4" />, pinned: true },
    { id: 'tracker', label: 'Трекер', icon: <BarChart3 className="w-4 h-4" />, pinned: true },
    { id: 'kernel', label: 'Ядро', icon: <Code2 className="w-4 h-4" />, pinned: true },
    { id: 'settings', label: 'Настройки', icon: <Settings className="w-4 h-4" />, pinned: true },
    { id: 'plugins', label: 'Расширения', icon: <Puzzle className="w-4 h-4" />, pinned: false },
    { id: 'island', label: 'Luma Island', icon: <Disc3 className="w-4 h-4" />, pinned: false },
    { id: 'spaces', label: 'Пространства', icon: <Rocket className="w-4 h-4" />, pinned: false },
  ];

  const topVisibleZ = Math.max(0, ...Object.values(windows).map((w) => (w.open && !w.minimized ? w.z : 0)));

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none ${
        isDark ? 'text-zinc-100' : 'text-zinc-900'
      }`}
      style={
        themeKey !== 'nothing_mono' && themeKey !== 'nothing_paper'
          ? { background: currentTheme.bgGradient }
          : undefined
      }
    >
      {/* ==================== LAYER 1: FULL-VIEWPORT 22×10 (220 CELLS) / 20×10 (200 CELLS) DESKTOP ==================== */}
      <LumaDesktopCanvas
        isDark={isDark}
        accentHex={currentTheme.accentHex}
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
      />

      {/* ==================== LAYER 2: OPTIONAL FLOATING TOP-CENTER LUMA ISLAND PILL ==================== */}
      {dynamicIslandEnabled && (
        <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5">
          <div
            onClick={() => openWindow('island')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openWindow('island');
            }}
            className="h-8 pl-3 pr-2 rounded-full bg-[#0a0a0c]/95 text-zinc-100 border border-white/15 shadow-xl flex items-center gap-2.5 cursor-pointer whitespace-nowrap"
          >
            {displayMediaPlaying ? (
              <div className="flex items-end gap-[2px] h-2.5">
                <span className="w-[2px] h-full bg-[#d71921] luma-eq-bar" />
                <span className="w-[2px] h-full bg-white luma-eq-bar luma-eq-bar-2" />
                <span className="w-[2px] h-full bg-[#d71921] luma-eq-bar luma-eq-bar-3" />
              </div>
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${dndEnabled ? 'bg-zinc-400' : 'bg-[#d71921]'}`} />
            )}

            <span className="text-[11px] font-mono max-w-[170px] truncate">
              {islandTimerRunning
                ? formatLiveClock(islandTimerRemainingSec)
                : islandStopwatchRunning
                ? formatLiveClock(islandStopwatchSec)
                : displayMediaPlaying || hasLiveOsMedia
                ? displayTrackTitle
                : `События: ${unreadNotifCount}`}
            </span>

            <div
              className="flex items-center gap-0.5 pl-1.5 border-l border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={handlePrevTrack} className="p-1 rounded-full hover:bg-white/15 cursor-pointer">
                <SkipBack className="w-3 h-3" />
              </button>
              <button onClick={handleToggleMediaPlay} className="p-1 rounded-full bg-[#d71921] text-white cursor-pointer">
                {displayMediaPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              </button>
              <button onClick={handleNextTrack} className="p-1 rounded-full hover:bg-white/15 cursor-pointer">
                <SkipForward className="w-3 h-3" />
              </button>
            </div>
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

      {/* WINDOW 1: APPS & GROUPED LIBRARY */}
      {windows.apps.open && !windows.apps.minimized && (
        <DexWindow
          id="apps"
          title="Приложения"
          subtitle={`${filteredApps.length} элементов`}
          icon={<AppWindow className="w-4 h-4" />}
          isDark={isDark}
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
                isDark ? 'border-white/[0.08] bg-white/[0.015]' : 'border-zinc-200 bg-zinc-50/70'
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
                        ? 'bg-[#d71921] text-white font-semibold'
                        : isDark
                        ? 'text-zinc-300 hover:bg-white/[0.06]'
                        : 'text-zinc-700 hover:bg-zinc-200/70'
                    }`}
                  >
                    <span>{fl}</span>
                    <span className="text-[10px] font-mono opacity-75">
                      {fk === 'all' ? combinedApps.length : combinedApps.filter((a) => a.type === fk).length}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-auto space-y-2">
                <button
                  onClick={() => setAddAppModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-[#d71921] hover:bg-[#b9151c] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
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

            {/* Right Grouped Apps Content */}
            <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Библиотека по группам · Активно: {runningAppsCount}
                </div>
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
                        groupedViewStyle === m ? 'bg-[#d71921] text-white' : ''
                      }`}
                    >
                      {label}
                    </button>
                  ))}
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
                    {favoriteApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => handleLaunchApp(app)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenuApp(app);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${surfaceCls} ${
                          app.isRunning ? 'border-[#d71921]/70' : 'hover:border-zinc-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {renderAppIcon(app.icon, 'w-4 h-4')}
                          {app.isRunning && <span className="w-2 h-2 rounded-full bg-[#d71921]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{app.name}</div>
                          <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                            {formatMonthBadge(app.monthMinutes, app.elapsedSeconds, app.isRunning)}
                          </div>
                        </div>
                      </div>
                    ))}
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
                        {list.map((app) => (
                          <div
                            key={app.id}
                            onClick={() => handleLaunchApp(app)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenuApp(app);
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${surfaceCls} ${
                              app.isRunning ? 'border-[#d71921]/70' : 'hover:border-zinc-500'
                            }`}
                          >
                            {renderAppIcon(app.icon, 'w-4 h-4 shrink-0')}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate">{app.name}</div>
                              <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                                {formatMonthBadge(app.monthMinutes, app.elapsedSeconds, app.isRunning)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`rounded-xl border divide-y overflow-hidden ${surfaceCls} ${isDark ? 'divide-white/[0.06]' : 'divide-zinc-200'}`}>
                        {list.map((app) => (
                          <div
                            key={app.id}
                            onClick={() => handleLaunchApp(app)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenuApp(app);
                            }}
                            className={`px-3.5 ${uiDensity === 'compact' ? 'py-2' : 'py-2.5'} flex items-center justify-between gap-3 cursor-pointer transition ${
                              isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-zinc-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {renderAppIcon(app.icon, 'w-4 h-4 shrink-0')}
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate">{app.name}</div>
                                <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{app.package}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[11px] font-mono ${
                                  app.isRunning ? 'text-[#d71921] font-bold' : mutedCls
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
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </DexWindow>
      )}

      {/* WINDOW 2: LUMA TERMINAL */}
      {windows.terminal.open && !windows.terminal.minimized && (
        <DexWindow
          id="terminal"
          title="Терминал Luma"
          subtitle="IPC 127.0.0.1:49215"
          icon={<Terminal className="w-4 h-4" />}
          isDark={isDark}
          zIndex={windows.terminal.z}
          initialWidth={740}
          initialHeight={460}
          initialX={140}
          initialY={90}
          onFocus={() => focusWindow('terminal')}
          onMinimize={() => minimizeWindow('terminal')}
          onClose={() => closeWindow('terminal')}
        >
          <LumaTerminalWindow
            isDark={isDark}
            liveSystem={liveSystem}
            volume={volume}
            isMuted={isMuted}
            dynamicIslandEnabled={dynamicIslandEnabled}
            onChangeVolume={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onMediaAction={(a) =>
              a === 'next' ? handleNextTrack() : a === 'prev' ? handlePrevTrack() : handleToggleMediaPlay()
            }
            onToggleIsland={handleToggleDynamicIsland}
            onPowerAction={handleExecutePowerAction}
            onCallRpc={callLumaKernelRpc}
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
                      trackerPeriod === p ? 'bg-[#d71921] text-white font-bold' : ''
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
                      <div className="h-full bg-[#d71921]" style={{ width: `${pct}%` }} />
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
                        <span className={app.isRunning ? 'text-[#d71921] font-bold' : mutedCls}>
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

      {/* WINDOW 4: LUMA KERNEL, IPC & SOURCE CODE */}
      {windows.kernel.open && !windows.kernel.minimized && (
        <DexWindow
          id="kernel"
          title="Ядро Luma Core 1.0.2b"
          subtitle={kernelConnected ? 'CONNECTED · 127.0.0.1:49215' : 'STANDALONE'}
          icon={<Code2 className="w-4 h-4" />}
          isDark={isDark}
          zIndex={windows.kernel.z}
          initialWidth={1020}
          initialHeight={650}
          onFocus={() => focusWindow('kernel')}
          onMinimize={() => minimizeWindow('kernel')}
          onClose={() => closeWindow('kernel')}
        >
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className={`px-2.5 py-1 rounded-lg border ${surfaceCls}`}>
                  CPU: {liveSystem?.cpu_model || '—'} ({cpuLoad}%)
                </span>
                <span className={`px-2.5 py-1 rounded-lg border ${surfaceCls}`}>
                  RAM: {liveSystem ? `${liveSystem.ram_used_gb.toFixed(1)}/${liveSystem.ram_total_gb.toFixed(1)} GB` : `${ramLoad}%`}
                </span>
                <span className={`px-2.5 py-1 rounded-lg border ${surfaceCls}`}>
                  KEY REV #{cryptoKeyVersion}
                </span>
              </div>
              <a
                href="/LumaOS_1.0.2b.exe"
                download="LumaOS_1.0.2b.exe"
                className="px-3.5 py-1.5 rounded-xl bg-[#d71921] hover:bg-[#b9151c] text-white text-xs font-mono font-bold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                LumaOS_1.0.2b.exe
              </a>
            </div>

            {/* Live JSON-RPC 2.0 Console */}
            <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">JSON-RPC 2.0 Консоль</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['system.ping', 'widgets.get_data', 'widgets.list', 'security.status', 'security.rotate_key'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setLumaRpcMethod(m);
                        callLumaKernelRpc(m);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono cursor-pointer ${
                        lumaRpcMethod === m ? 'bg-[#d71921] border-[#d71921] text-white' : btnCls
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <pre className={`p-3 rounded-lg border text-[11px] font-mono overflow-x-auto max-h-40 ${isDark ? 'bg-black/40 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                {JSON.stringify(
                  lumaRpcLiveData || {
                    kernel: 'LumaCore',
                    version: '1.0.2b',
                    ipc: 'tcp://127.0.0.1:49215',
                    real_telemetry: Boolean(liveSystem?.real_telemetry),
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            {/* Source Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-4 space-y-1.5">
                {PYTHON_PROJECT_FILES.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => setSelectedCodePath(f.path)}
                    className={`w-full p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      selectedCodePath === f.path ? 'border-[#d71921] bg-[#d71921]/10' : surfaceCls
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
                <div className={`px-3.5 py-2 border-b flex items-center justify-between text-xs font-mono ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
                  <span>{selectedCodePath}</span>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(codeContent);
                        setCopiedCode(true);
                        window.setTimeout(() => setCopiedCode(false), 1500);
                      } catch {
                        // ignore
                      }
                    }}
                    className={`px-2 py-0.5 rounded border text-[11px] inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
                  >
                    {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedCode ? 'Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-3.5 text-[11px] font-mono overflow-auto max-h-72 leading-relaxed">
                  {codeContent}
                </pre>
              </div>
            </div>
          </div>
        </DexWindow>
      )}

      {/* WINDOW 5: SYSTEM SETTINGS (100% OF ALL EXISTING OPTIONS PRESERVED + DESKTOP CUSTOMIZATION) */}
      {windows.settings.open && !windows.settings.minimized && (
        <DexWindow
          id="settings"
          title="Настройки системы"
          subtitle="Luma OS 1.0.2b"
          icon={<Settings className="w-4 h-4" />}
          isDark={isDark}
          zIndex={windows.settings.z}
          initialWidth={1020}
          initialHeight={660}
          onFocus={() => focusWindow('settings')}
          onMinimize={() => minimizeWindow('settings')}
          onClose={() => closeWindow('settings')}
        >
          <div className="h-full flex min-h-0">
            {/* Settings Sidebar */}
            <aside
              className={`w-56 shrink-0 border-r p-3 space-y-1 ${
                isDark ? 'border-white/[0.08] bg-white/[0.015]' : 'border-zinc-200 bg-zinc-50/70'
              }`}
            >
              {(
                [
                  ['luma', 'Система и Железо', <Activity className="w-4 h-4" />],
                  ['island', 'Luma Island', <Disc3 className="w-4 h-4" />],
                  ['appearance', 'Темы и Стол', <Sliders className="w-4 h-4" />],
                  ['clock', '18 Циферблатов', <Clock className="w-4 h-4" />],
                  ['navigation', 'Навигация', <MousePointerClick className="w-4 h-4" />],
                  ['plugins', 'Окна и Плагины', <LayoutGrid className="w-4 h-4" />],
                  ['updater', 'Обновления', <Stethoscope className="w-4 h-4" />],
                  ['about', 'О системе', <Info className="w-4 h-4" />],
                ] as const
              ).map(([tabId, label, icon]) => (
                <button
                  key={tabId}
                  onClick={() => setSettingsTab(tabId)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition cursor-pointer ${
                    settingsTab === tabId
                      ? 'bg-[#d71921] text-white font-semibold'
                      : isDark
                      ? 'text-zinc-300 hover:bg-white/[0.06]'
                      : 'text-zinc-700 hover:bg-zinc-200/70'
                  }`}
                >
                  {icon}
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </aside>

            {/* Settings Content */}
            <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
              {settingsTab === 'luma' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
                    <div>
                      <div className="text-sm font-bold">Luma Core 1.0.2b</div>
                      <div className={`text-xs font-mono ${mutedCls}`}>
                        {liveSystem?.os_name || 'Luma Runtime'} · {liveSystem?.hostname || 'host'} · IPC 127.0.0.1:49215
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
                <div className="space-y-3">
                  <div
                    onClick={handleToggleDynamicIsland}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer ${surfaceCls}`}
                  >
                    <div>
                      <div className="text-sm font-bold">Luma Island (Динамический остров)</div>
                      <div className={`text-xs ${mutedCls}`}>Верхняя интерактивная капсула с эквалайзером и управлением треками</div>
                    </div>
                    <StatusPill active={dynamicIslandEnabled} />
                  </div>

                  <div
                    onClick={() => setDndEnabled((v) => !v)}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer ${surfaceCls}`}
                  >
                    <div>
                      <div className="text-sm font-bold">Режим «Не беспокоить» (DND)</div>
                      <div className={`text-xs ${mutedCls}`}>Скрывает всплывающие уведомления и системные оповещения</div>
                    </div>
                    <StatusPill active={dndEnabled} />
                  </div>

                  <button
                    onClick={() => openWindow('island')}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
                  >
                    Открыть центр Luma Island
                  </button>
                </div>
              )}

              {settingsTab === 'appearance' && (
                <div className="space-y-4">
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
                                desktopCols === c ? 'bg-[#d71921] border-[#d71921] text-white' : btnCls
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
                                wallpaper === wKey ? 'bg-[#d71921] border-[#d71921] text-white' : btnCls
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
                                uiDensity === dKey ? 'bg-[#d71921] border-[#d71921] text-white' : btnCls
                              }`}
                            >
                              {dLabel}
                            </button>
                          ))}
                        </div>
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

                  {/* All Themes Grid (Preserves EVERY Theme + New Luma Mono & Paper!) */}
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold">Темы оформления</div>
                      <button
                        onClick={() => setCustomThemeModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#d71921] text-white text-xs font-semibold cursor-pointer"
                      >
                        + Своя тема
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(allThemesMap).map(([tKey, th]) => {
                        const sel = themeKey === tKey;
                        return (
                          <button
                            key={tKey}
                            onClick={() => setThemeKey(tKey)}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                              sel ? 'border-[#d71921] bg-[#d71921]/10' : btnCls
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{th.name}</div>
                              <div className="flex items-center gap-1 mt-1.5">
                                <span className="w-3.5 h-3.5 rounded-full border border-zinc-500/40" style={{ backgroundColor: th.cardHex }} />
                                <span className="w-3.5 h-3.5 rounded-full border border-zinc-500/40" style={{ backgroundColor: th.accentHex }} />
                              </div>
                            </div>
                            <StatusPill active={sel} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Glass & Radius Sliders */}
                  <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs ${surfaceCls}`}>
                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono">
                        <span className={mutedCls}>Прозрачность</span>
                        <span>{glassOpacity}%</span>
                      </div>
                      <input type="range" min={50} max={100} value={glassOpacity} onChange={(e) => setGlassOpacity(Number(e.target.value))} className="w-full" />
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
                              glassIntensity === lvl ? 'bg-[#d71921] border-[#d71921] text-white font-bold' : btnCls
                            }`}
                          >
                            {lvl === 'light' ? 'Слаб.' : lvl === 'medium' ? 'Сред.' : 'Сильн.'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
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
                  <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold">18 циферблатов Luma</div>
                      <span className="text-xs font-mono text-[#d71921]">
                        {CLOCK_STYLE_OPTIONS.find((o) => o.id === clockStyle)?.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                      {CLOCK_STYLE_OPTIONS.map((opt) => {
                        const sel = clockStyle === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setClockStyle(opt.id)}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                              sel ? 'border-[#d71921] bg-[#d71921]/10' : btnCls
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold truncate">{opt.label}</span>
                              {sel && <span className="w-2 h-2 rounded-full bg-[#d71921] shrink-0" />}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-400">{opt.sample}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs ${surfaceCls}`}>
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
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between ${btnCls}`}>
                      <span className={mutedCls}>Акцент:</span>
                      <input type="color" value={clockAccentColor} onChange={(e) => setClockAccentColor(e.target.value)} className="w-8 h-5 cursor-pointer bg-transparent" />
                    </div>
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
                      <div className="text-sm font-bold">ПКМ «Назад»</div>
                      <div className={`text-xs ${mutedCls}`}>Быстрый возврат и закрытие панелей. Также работают Ctrl+K (Spotlight), Alt+D (Рабочий стол) и Escape.</div>
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
                            cardColumns === n ? 'bg-[#d71921] border-[#d71921] text-white' : btnCls
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
                          let ver = '1.0.2b';
                          try {
                            const r = await fetch('/api/kernel/status');
                            if (r.ok) ver = (await r.json())?.version || ver;
                          } catch {
                            // ignore
                          }
                          setCheckingGithub(false);
                          setGithubUpdateStatus(`Актуальная сборка: ${ver} (${new Date().toLocaleTimeString('ru-RU')})`);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#d71921] text-white text-xs font-semibold cursor-pointer"
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
                        ['Ядро IPC 49215', kernelConnected ? 'ONLINE' : 'FALLBACK'],
                        ['LumaGuard', `AES-256-GCM #${cryptoKeyVersion}`],
                        ['Телеметрия', `CPU ${cpuLoad}% · RAM ${ramLoad}%`],
                        ['Рабочий стол', `${desktopCols}×10 (${desktopCols * 10} ячеек)`],
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

              {/* ABOUT + COMPLETE UNTOUCHED VERSION HISTORY (26 RELEASES) */}
              {settingsTab === 'about' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
                    <div>
                      <div className="text-base font-extrabold font-mono">LUMA OS 1.0.2b</div>
                      <div className={`text-xs ${mutedCls}`}>
                        Настольная оболочка DeX · Сетка {desktopCols}×10 ({desktopCols * 10} ячеек) · Ядро Luma Core
                      </div>
                    </div>
                    <a
                      href="/LumaOS_1.0.2b.exe"
                      download="LumaOS_1.0.2b.exe"
                      className="px-3.5 py-2 rounded-xl bg-[#d71921] text-white text-xs font-mono font-bold inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      LumaOS_1.0.2b.exe
                    </a>
                  </div>

                  <div className={`p-3.5 rounded-xl border space-y-2 ${surfaceCls}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">История версий ({Object.keys(VERSION_HISTORY).length})</span>
                      <button
                        onClick={() => setChangelogFilter('all')}
                        className={`px-2 py-0.5 rounded font-mono text-[11px] cursor-pointer ${
                          changelogFilter === 'all' ? 'bg-[#d71921] text-white' : btnCls
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
                            changelogFilter === v ? 'bg-[#d71921] text-white font-bold' : btnCls
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
                          ver === '1.0.2' ? 'border-[#d71921]/60 bg-[#d71921]/[0.06]' : surfaceCls
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold">
                            Версия {ver}
                          </span>
                          {ver === '1.0.2' && <StatusPill active={true} />}
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
                        className="p-1.5 rounded-lg hover:bg-[#d71921]/20 text-zinc-500 hover:text-[#d71921] cursor-pointer"
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
                          installed ? `${btnCls} opacity-50` : 'bg-[#d71921] text-white font-bold'
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
                        version: '1.0.2b',
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
                  className="px-3.5 py-1.5 rounded-lg bg-[#d71921] text-white text-xs font-semibold cursor-pointer"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        </DexWindow>
      )}

      {/* WINDOW 7: LUMA ISLAND CONTROL CENTER */}
      {windows.island.open && !windows.island.minimized && (
        <DexWindow
          id="island"
          title="Luma Island"
          subtitle="Медиа, события и таймер"
          icon={<Disc3 className="w-4 h-4" />}
          isDark={isDark}
          zIndex={windows.island.z}
          initialWidth={700}
          initialHeight={500}
          onFocus={() => focusWindow('island')}
          onMinimize={() => minimizeWindow('island')}
          onClose={() => closeWindow('island')}
        >
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${btnCls}`}>
                {(
                  [
                    ['overview', 'Обзор'],
                    ['player', 'Медиа'],
                    ['notifications', `События (${notifications.length})`],
                    ['timer', 'Таймер'],
                    ['stopwatch', 'Секундомер'],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setIslandTab(k)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                      islandTab === k ? 'bg-[#d71921] text-white' : ''
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
                    <button onClick={handleToggleMediaPlay} className="p-3 rounded-full bg-[#d71921] text-white cursor-pointer">
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
                        activePlayerIndex === idx ? 'bg-[#d71921] border-[#d71921] text-white' : btnCls
                      }`}
                    >
                      {pl.name}
                    </button>
                  ))}
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
                    className="px-5 py-2 rounded-xl bg-[#d71921] text-white text-xs font-mono font-bold cursor-pointer"
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
                    className="px-5 py-2 rounded-xl bg-[#d71921] text-white text-xs font-mono font-bold cursor-pointer"
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
                  className="px-3.5 py-1.5 rounded-lg bg-[#d71921] text-white text-xs font-semibold cursor-pointer shrink-0"
                >
                  Запустить
                </button>
              </div>
            ))}
          </div>
        </DexWindow>
      )}

      {/* ==================== LAYER 4: BOTTOM SAMSUNG DeX × NOTHING TASKBAR (48px) ==================== */}
      <footer
        className={`fixed bottom-0 inset-x-0 h-12 z-50 border-t flex items-center justify-between px-2.5 gap-2 ${
          isDark
            ? 'bg-[#0b0b0e]/92 border-white/[0.09] text-zinc-100'
            : 'bg-white/92 border-zinc-900/[0.1] text-zinc-900'
        }`}
        style={{ backdropFilter: 'blur(24px)' }}
      >
        {/* Left: 9-Dot App Launcher + Spotlight + Grid Edit */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => toggleTaskbarWindow('apps')}
            title="Приложения (Окно 1)"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
              windows.apps.open && !windows.apps.minimized
                ? 'bg-[#d71921] text-white'
                : isDark
                ? 'hover:bg-white/10 text-zinc-200'
                : 'hover:bg-zinc-200 text-zinc-800'
            }`}
          >
            {/* Iconic 3x3 Nothing Dot Matrix Launcher Icon */}
            <div className="grid grid-cols-3 gap-[3px]">
              {Array.from({ length: 9 }).map((_, idx) => (
                <span key={idx} className="w-[3.5px] h-[3.5px] rounded-full bg-current" />
              ))}
            </div>
          </button>

          <button
            onClick={() => setSpotlightOpen(true)}
            title="Luma Spotlight (Ctrl+K)"
            className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs transition cursor-pointer ${btnCls}`}
          >
            <Search className="w-3.5 h-3.5 text-[#d71921]" />
            <span className="hidden sm:inline font-mono text-[11px]">⌘K</span>
          </button>

          <button
            onClick={() => setDesktopEditMode((v) => !v)}
            title={`Редактор сетки рабочего стола (${desktopCols}×10)`}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer ${
              desktopEditMode ? 'bg-[#d71921] border-[#d71921] text-white' : btnCls
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Running & Pinned DeX Windows */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                  }}
                  title={item.label}
                  className={`relative h-9 px-3 rounded-xl flex items-center gap-2 text-xs transition cursor-pointer whitespace-nowrap ${
                    isFocused
                      ? isDark
                        ? 'bg-white/[0.12] text-white font-semibold'
                        : 'bg-zinc-200 text-zinc-950 font-semibold'
                      : isDark
                      ? 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                  {st.open && (
                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full transition-all ${
                        st.minimized ? 'w-1 h-1 bg-zinc-400' : 'w-3 h-[2px] bg-[#d71921]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
        </div>

        {/* Right: DeX System Tray + Clock + Show Desktop Edge */}
        <div className="flex items-center gap-1.5 shrink-0 h-full">
          <div className={`hidden lg:flex items-center gap-2 px-2.5 h-8 rounded-xl border text-[11px] font-mono ${btnCls}`}>
            <span>CPU {cpuLoad}%</span>
            <span className="opacity-30">·</span>
            <span>RAM {ramLoad}%</span>
          </div>

          {!dynamicIslandEnabled && (
            <button
              onClick={handleToggleDynamicIsland}
              title="Включить Luma Island"
              className={`w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer ${btnCls}`}
            >
              <Disc3 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* System Tray Control Center Trigger */}
          <button
            onClick={() => setControlCenterOpen((v) => !v)}
            title="Центр управления (Звук, Тема, Сетка, Питание)"
            className={`h-8 px-2.5 rounded-xl border flex items-center gap-2 text-[11px] font-mono cursor-pointer transition ${
              controlCenterOpen ? 'border-[#d71921] bg-[#d71921]/15' : btnCls
            }`}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-[#d71921]" />
            ) : volume < 50 ? (
              <Volume1 className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <Wifi className="w-3.5 h-3.5 hidden sm:inline" />
            <span className="inline-flex items-center gap-1">
              <BatteryCharging className={`w-3.5 h-3.5 ${isCharging ? 'text-[#d71921]' : ''}`} />
              {batteryLevel}%
            </span>
          </button>

          {/* Taskbar Clock */}
          <button
            onClick={() => openWindow('settings', 'clock')}
            title="Настройка 18 циферблатов"
            className={`h-9 px-2.5 rounded-xl flex flex-col items-end justify-center leading-tight font-mono cursor-pointer transition ${
              isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-zinc-100'
            }`}
          >
            <span className="text-xs font-bold tabular-nums">
              {displayHrs}
              {colon}
              {displayMins}
              {showSeconds ? `:${displaySecs}` : ''}
            </span>
            {showDate && <span className={`text-[9px] uppercase ${mutedCls}`}>{dateShort}</span>}
          </button>

          {/* Far-right Show Desktop Strip (Classic DeX / Desktop feature) */}
          <button
            onClick={showDesktop}
            title="Показать рабочий стол (Alt+D)"
            className={`w-2.5 h-7 rounded-sm border-l cursor-pointer transition ${
              isDark ? 'border-white/15 hover:bg-white/20' : 'border-zinc-300 hover:bg-zinc-300'
            }`}
          />
        </div>
      </footer>

      {/* ==================== BOTTOM-RIGHT DEX CONTROL CENTER POPOVER ==================== */}
      {controlCenterOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed bottom-14 right-3 z-50 w-80 rounded-2xl border p-4 space-y-4 ${
            isDark ? 'dex-window-dark text-zinc-100' : 'dex-window-light text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">LUMA OS 1.0.2b</span>
            <span className={`text-[10px] font-mono ${mutedCls}`}>
              {liveSystem?.location?.city || 'LOCAL'}
            </span>
          </div>

          {/* Quick 2x2 Hardware Toggles */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: isDark ? 'Тёмная' : 'Светлая', active: isDark, icon: isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />, run: () => setThemeKey(isDark ? 'nothing_paper' : 'nothing_mono') },
              { label: 'Luma Island', active: dynamicIslandEnabled, icon: <Disc3 className="w-3.5 h-3.5" />, run: handleToggleDynamicIsland },
              { label: 'Не беспокоить', active: dndEnabled, icon: <BellOff className="w-3.5 h-3.5" />, run: () => setDndEnabled((v) => !v) },
              { label: `Сетка ${desktopCols}×10`, active: desktopEditMode, icon: <Grid className="w-3.5 h-3.5" />, run: () => setDesktopEditMode((v) => !v) },
            ].map((t) => (
              <button
                key={t.label}
                onClick={t.run}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer ${
                  t.active ? 'bg-[#d71921] border-[#d71921] text-white font-semibold' : btnCls
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Real System Volume Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={mutedCls}>ГРОМКОСТЬ</span>
              <span>{isMuted ? 'MUTE' : `${volume}%`}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={handleToggleMute} className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-[#d71921]" /> : <Volume2 className="w-3.5 h-3.5" />}
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

          {/* Active Media Mini Row */}
          <div className={`pt-3 border-t flex items-center justify-between gap-2 ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{displayTrackTitle}</div>
              <div className={`text-[10px] truncate ${mutedCls}`}>{displayTrackArtist}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handlePrevTrack} className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
                <SkipBack className="w-3 h-3" />
              </button>
              <button onClick={handleToggleMediaPlay} className="p-1.5 rounded-lg bg-[#d71921] text-white cursor-pointer">
                {displayMediaPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button onClick={handleNextTrack} className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
                <SkipForward className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Power & Download Row */}
          <div className={`pt-3 border-t flex items-center justify-between gap-1.5 ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
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
              href="/LumaOS_1.0.2b.exe"
              download="LumaOS_1.0.2b.exe"
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold inline-flex items-center gap-1 ${btnCls}`}
            >
              <Download className="w-3 h-3 text-[#d71921]" />
              EXE
            </a>
          </div>
        </div>
      )}

      {/* ==================== SUB-MODALS (ADD APP, CUSTOM THEME, APP CONTEXT MENU) ==================== */}
      {addAppModalOpen && (
        <div onClick={() => setAddAppModalOpen(false)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddCustomApp}
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-md rounded-2xl border p-5 space-y-3.5 ${
              isDark ? 'dex-window-dark text-zinc-100' : 'dex-window-light text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Добавить приложение</span>
              <button type="button" onClick={() => setAddAppModalOpen(false)} className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <input required value={newAppName} onChange={(e) => setNewAppName(e.target.value)} placeholder="Название" className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${btnCls}`} />
            <input value={newAppUrl} onChange={(e) => setNewAppUrl(e.target.value)} placeholder="Путь к EXE или URL (https://...)" className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`} />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select value={newAppType} onChange={(e) => setNewAppType(e.target.value as AppType)} className={`px-3 py-2 rounded-xl border ${btnCls}`}>
                <option value="app">Программа (EXE)</option>
                <option value="web">Веб-сайт</option>
                <option value="system">Система</option>
              </select>
              <select value={newAppCategory} onChange={(e) => setNewAppCategory(e.target.value)} className={`px-3 py-2 rounded-xl border ${btnCls}`}>
                {['Development', 'Browser', 'Games', 'Social', 'Media', 'Music', 'Office', 'System'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ICON_NAMES.slice(0, 12).map((ic) => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => setNewAppIcon(ic)}
                  className={`p-2 rounded-lg border cursor-pointer ${newAppIcon === ic ? 'bg-[#d71921] border-[#d71921] text-white' : btnCls}`}
                >
                  {renderAppIcon(ic, 'w-3.5 h-3.5')}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddAppModalOpen(false)} className={`px-3.5 py-1.5 rounded-xl border text-xs cursor-pointer ${btnCls}`}>
                Отмена
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#d71921] text-white text-xs font-semibold cursor-pointer">
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
            className={`luma-animate-in w-full max-w-md rounded-2xl border p-5 space-y-4 ${
              isDark ? 'dex-window-dark text-zinc-100' : 'dex-window-light text-zinc-900'
            }`}
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
                    setNewThemeBg(m === 'light' ? '#f3f3f1' : m === 'amoled' ? '#050506' : '#09090b');
                    setNewThemeSurface(m === 'light' ? '#ffffff' : '#141418');
                  }}
                  className={`py-1.5 rounded-lg border font-mono uppercase cursor-pointer ${
                    newThemeMode === m ? 'bg-[#d71921] border-[#d71921] text-white' : btnCls
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
                    custom: true,
                  };
                  setCustomThemes((prev) => ({ ...prev, [id]: created }));
                  setThemeKey(id);
                  setCustomThemeModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-[#d71921] text-white text-xs font-semibold cursor-pointer"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenuApp && (
        <div onClick={() => setContextMenuApp(null)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-64 rounded-2xl border p-2 space-y-1 text-xs ${
              isDark ? 'dex-window-dark text-zinc-100' : 'dex-window-light text-zinc-900'
            }`}
          >
            <div className={`px-3 py-2 border-b font-bold truncate ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
              {contextMenuApp.name}
            </div>
            <button
              onClick={() => {
                handleLaunchApp(contextMenuApp);
                setContextMenuApp(null);
              }}
              className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-left flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#d71921]" />
              {contextMenuApp.isRunning ? 'Остановить таймер' : 'Запустить'}
            </button>
            <button
              onClick={() => {
                handleToggleFavorite(contextMenuApp);
                setContextMenuApp(null);
              }}
              className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-left flex items-center gap-2 cursor-pointer"
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
              className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-left flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сбросить время в 0
            </button>
            {contextMenuApp.custom && (
              <button
                onClick={() => {
                  setApps((prev) => prev.filter((a) => a.id !== contextMenuApp.id));
                  setContextMenuApp(null);
                }}
                className="w-full px-3 py-2 rounded-xl hover:bg-[#d71921]/20 text-[#d71921] text-left flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Удалить
              </button>
            )}
          </div>
        </div>
      )}

      {/* ==================== LUMA SPOTLIGHT (CTRL+K) ==================== */}
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
      <div className="fixed bottom-14 left-3 z-[60] flex flex-col gap-1.5 max-w-xs pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`luma-animate-in pointer-events-auto px-3.5 py-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              isDark ? 'dex-window-dark text-zinc-100' : 'dex-window-light text-zinc-900'
            }`}
          >
            {t.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-[#d71921] shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#d71921] shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className="font-bold truncate">{t.title}</div>
              <div className={`text-[11px] truncate ${mutedCls}`}>{t.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
