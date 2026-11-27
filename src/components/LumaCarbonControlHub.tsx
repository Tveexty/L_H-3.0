import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Wifi,
  Bluetooth,
  Volume2,
  VolumeX,
  Sun,
  Bell,
  BellOff,
  Camera,
  Video,
  Square,
  Zap,
  MousePointer2,
  Shield,
  Sparkles,
  SunMoon,
  Layers,
  Trash2,
  Power,
  Sliders,
  Pencil,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  MessageCircle,
  Send,
  RefreshCw,
  Headphones,
  Mouse,
  Keyboard,
  Gamepad2,
  BatteryCharging,
  ToggleLeft,
  ToggleRight,
  Download,
  FolderOpen,
  Moon,
  Mic,
  MicOff,
  Flame,
  FileText,
  ShieldCheck,
  Speaker,
  Palette,
  Minimize2,
  Maximize2,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Radio,
  Settings,
  Image as ImageIcon,
  ScanSearch,
  Share2,
  Crown,
  Cast,
  Terminal,
  Calculator,
  Activity,
  Calendar,
  Clipboard,
  Code2,
  Film,
  Cpu,
  RotateCcw,
  Lock,
  Minus,
  Save,
} from 'lucide-react';
import {
  BluetoothDeviceItem,
  BluetoothStatusSnapshot,
  LumaBluetoothPickerPanel,
  LumaWifiPickerPanel,
  WifiStatusSnapshot,
} from './LumaConnectivityPicker';
import { LumaPerAppAudioHub, MediaPlayerSessionMini } from './LumaPerAppAudioHub';
import { LumaMiracastPanel } from './LumaMiracastPanel';
import { LumaOneUIGridBody } from './LumaOneUIGridBody';
import {
  BUILTIN_ONEUI_PRESETS,
  createDefaultOneUIPanelState,
  cycleBlockSize,
  hexToRgba,
  loadOneUIPanelState,
  ONEUI_GRADIENT_PRESETS,
  OneUIPanelBlockSize,
  OneUIPanelPreset,
  OneUIPanelState,
  saveOneUIPanelState,
} from './LumaOneUIPanelEngine';

export interface CarbonNotificationItem {
  id: string;
  source: 'telegram' | 'discord' | 'whatsapp' | 'browser' | 'system';
  sender: string;
  chat?: string;
  title: string;
  body: string;
  time: string;
  avatarUrl?: string;
  unread?: boolean;
}

export interface WirelessDeviceItem {
  name: string;
  device_type: string;
  battery_percent: number;
  connected?: boolean;
  transport?: string;
  source?: string;
}

export interface HubAudioEndpoint {
  id: string;
  name: string;
  kind: string;
  is_default: boolean;
}

export type ControlHubTileId =
  | 'wifi'
  | 'bluetooth'
  | 'miracast'
  | 'dnd'
  | 'theme'
  | 'night_light'
  | 'gaming_boost'
  | 'mic_mute'
  | 'office'
  | 'security'
  | 'screenshot'
  | 'recorder'
  | 'vault'
  | 'scenarios'
  | 'mouse_dpi'
  | 'island'
  | 'dual_bar'
  | 'trash'
  | 'code_studio'
  | 'cut_studio'
  | 'power_saver'
  | 'features_mgr';

export const ALL_HUB_TILES: { id: ControlHubTileId; label: string; desc: string }[] = [
  { id: 'wifi', label: 'Wi-Fi', desc: 'Сеть · ПКМ — список и пароль' },
  { id: 'bluetooth', label: 'Bluetooth', desc: 'ПКМ — список устройств' },
  { id: 'miracast', label: '2-й экран (Miracast)', desc: 'Беспроводной дисплей · Источник и Приёмник' },
  { id: 'dnd', label: 'Не беспокоить', desc: 'Приглушить звук и всплывающие окна' },
  { id: 'theme', label: 'Тема', desc: 'Светлая / Тёмная' },
  { id: 'night_light', label: 'Ночной свет', desc: 'Защита глаз от синего' },
  { id: 'gaming_boost', label: 'Игровой режим', desc: 'Приоритет CPU / RAM' },
  { id: 'mic_mute', label: 'Микрофон', desc: 'Быстрый Mute микрофона' },
  { id: 'office', label: 'Office Studio', desc: 'Docs · Sheets · Slides Pro' },
  { id: 'security', label: 'LumaShield 3.2', desc: 'Антивирус и аудит (340+ правил)' },
  { id: 'screenshot', label: 'Скриншот', desc: 'Компактный JPEG (~120 КБ)' },
  { id: 'recorder', label: 'Запись экрана', desc: 'Zero-Freeze AVI · без зависаний' },
  { id: 'vault', label: 'Конфиденциальность', desc: 'Приватный стол AES-256' },
  { id: 'scenarios', label: 'Сценарии', desc: 'Если + И → Цепочка действий' },
  { id: 'mouse_dpi', label: 'DPI мыши', desc: 'Скорость и чувствительность' },
  { id: 'island', label: 'Luma Island', desc: 'Живой остров сверху' },
  { id: 'dual_bar', label: 'Двойная панель', desc: 'Верх: утилиты, Низ: окна' },
  { id: 'trash', label: 'Корзина', desc: 'Удалённые файлы Luma' },
  { id: 'code_studio', label: 'Code Studio', desc: 'IDE + Диагностика + Терминал' },
  { id: 'cut_studio', label: 'Cut Studio', desc: 'Многодорожечный видеоредактор Pro' },
  { id: 'power_saver', label: 'Энергосбережение', desc: 'План питания ОС' },
  { id: 'features_mgr', label: 'Функции ОС', desc: 'Вкл/Выкл модулей системы' },
];

export const DEFAULT_HUB_TILES: ControlHubTileId[] = [
  'wifi',
  'bluetooth',
  'dnd',
  'night_light',
  'gaming_boost',
  'mic_mute',
  'office',
  'screenshot',
  'recorder',
  'vault',
  'security',
  'features_mgr',
];

export interface SystemFeaturesMap {
  ai: boolean;
  dynamicIsland: boolean;
  calendar: boolean;
  scenarios: boolean;
  codeStudio: boolean;
  cutStudio: boolean;
  trash: boolean;
  easterEgg: boolean;
  wirelessScanner: boolean;
  privateVault: boolean;
}

export const SYSTEM_FEATURE_META: { key: keyof SystemFeaturesMap; label: string; desc: string }[] = [
  { key: 'ai', label: 'Luma Ai Nitrogen', desc: 'Ollama / OpenAI стриминг, 3-уровневая память, Офис и Календарь' },
  { key: 'dynamicIsland', label: 'Luma Island', desc: 'Живой остров с анимацией и таймером' },
  { key: 'calendar', label: 'Календарь и задачи', desc: 'День/Неделя/Месяц/Повестка + Luma Ai Nitrogen' },
  { key: 'scenarios', label: 'Сценарии (Автоматизация)', desc: 'Правила «Если + Условие → Цепочка действий»' },
  { key: 'codeStudio', label: 'Luma Code Studio', desc: 'IDE с live-диагностикой ошибок и Pro терминалом' },
  { key: 'cutStudio', label: 'Luma Cut Studio', desc: 'Видеомонтаж, маски, AI, озвучка, Design Studio' },
  { key: 'trash', label: 'Корзина Luma OS', desc: 'Безопасная корзина с превью и восстановлением' },
  { key: 'wirelessScanner', label: 'Сканер BT / 2.4GHz', desc: 'Заряд мышек, клавиатур и наушников' },
  { key: 'privateVault', label: 'Суперконфиденциальность', desc: 'Изолированный приватный рабочий стол' },
  { key: 'easterEgg', label: 'Мини-игра Пасхалка', desc: 'Секретная игра в разделе «О системе»' },
];

interface LumaCarbonControlHubProps {
  open: boolean;
  isDark: boolean;
  onClose: () => void;
  // System state
  wifiConnected: boolean;
  wifiEnabled?: boolean;
  wifiName: string;
  wifiStatus?: WifiStatusSnapshot | null;
  wifiLoading?: boolean;
  onToggleWifi?: (enabled?: boolean) => void;
  onRefreshWifi?: (rescan?: boolean) => void;
  onConnectWifi?: (
    ssid: string,
    password?: string
  ) => Promise<{ ok: boolean; needs_password?: boolean; message?: string; error?: string }>;
  onDisconnectWifi?: () => Promise<void>;
  bluetoothEnabled: boolean;
  bluetoothStatus?: BluetoothStatusSnapshot | null;
  bluetoothLoading?: boolean;
  onToggleBluetooth: (enabled?: boolean) => void;
  onRefreshBluetooth?: (activeScan?: boolean) => void;
  onBluetoothDeviceAction?: (
    dev: BluetoothDeviceItem,
    action: 'connect' | 'disconnect' | 'pair',
    pin?: string
  ) => Promise<{ ok: boolean; needs_pin?: boolean; message?: string; error?: string }>;
  dnd: boolean;
  onToggleDnd: () => void;
  volume: number;
  muted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  brightness: number;
  onBrightnessChange: (b: number) => void;
  onToggleTheme: () => void;
  dynamicIslandEnabled: boolean;
  onToggleIsland: () => void;
  dualTaskbarMode: boolean;
  onToggleDualTaskbar: () => void;
  powerPlan: string;
  onTogglePowerSaver: () => void;
  onSetPowerPlan?: (plan: 'performance' | 'balanced' | 'saver') => void;
  nightLightLevel?: number;
  onNightLightChange?: (level: number) => void;
  gamingBoost?: boolean;
  onToggleGamingBoost?: () => void;
  micMuted?: boolean;
  onToggleMicMute?: () => void;
  audioOutputs?: HubAudioEndpoint[];
  audioInputs?: HubAudioEndpoint[];
  activeAudioOutputId?: string;
  activeAudioInputId?: string;
  onSwitchAudioDevice?: (id: string, kind: 'output' | 'input') => void;
  mediaSessions?: MediaPlayerSessionMini[];
  onMediaAction?: (action: 'playpause' | 'next' | 'prev' | 'seek_back' | 'seek_forward' | string, sessionId?: string) => void;
  onPickAccentColor?: (hex: string) => void;
  wirelessDevices: WirelessDeviceItem[];
  onRefreshWireless: () => void;
  trashCount: number;
  // Feature toggles
  enabledFeatures: SystemFeaturesMap;
  onToggleFeature: (key: keyof SystemFeaturesMap) => void;
  // Navigation & actions
  onOpenWindow: (winId: string) => void;
  onOpenVault: () => void;
  onOpenMouseSettings: () => void;
  // Notifications
  notifications: CarbonNotificationItem[];
  onClearNotifications: () => void;
  onDismissNotification: (id: string) => void;
  onAddNotification: (n: Omit<CarbonNotificationItem, 'id' | 'time'>) => void;
  onOpenFullShade?: () => void;
  isPro?: boolean;
  isAdmin?: boolean;
  onOpenLens?: () => void;
  onLaunchPowerShell?: (admin?: boolean) => void;
  themeAccentHex?: string;
  liveCpuPercent?: number;
  liveRamPercent?: number;
  liveGpuName?: string;
  onLockScreen?: () => void;
}

const HUB_TILES_KEY = 'luma_carbon_hub_tiles_v151';
const HUB_CIRCLES_KEY = 'luma_hub_circles_v18';
const HUB_BT_COLLAPSED_KEY = 'luma_bt_section_collapsed_v15';
const HUB_NOTIF_COLLAPSED_KEY = 'luma_notif_collapsed_v151';

const DEFAULT_CIRCLE_IDS: string[] = [
  'per_app_audio',
  'share',
  'mute',
  'rec',
  'shot',
  'lens',
  'eye',
  'photo',
  'miracast',
  'game',
  'mic',
  'island',
  'shield',
  'vault',
  'theme',
  'feats',
];

const ACCENT_SWATCHES = ['#2563eb', '#10b981', '#06b6d4', '#6366f1', '#f43f5e', '#f59e0b'];

export const LumaCarbonControlHub: React.FC<LumaCarbonControlHubProps> = ({
  open,
  isDark,
  onClose,
  wifiConnected,
  wifiEnabled = true,
  wifiName,
  wifiStatus = null,
  wifiLoading = false,
  onToggleWifi,
  onRefreshWifi,
  onConnectWifi,
  onDisconnectWifi,
  bluetoothEnabled,
  bluetoothStatus = null,
  bluetoothLoading = false,
  onToggleBluetooth,
  onRefreshBluetooth,
  onBluetoothDeviceAction,
  dnd,
  onToggleDnd,
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  brightness,
  onBrightnessChange,
  onToggleTheme,
  dynamicIslandEnabled,
  onToggleIsland,
  dualTaskbarMode,
  onToggleDualTaskbar,
  powerPlan,
  onTogglePowerSaver,
  onSetPowerPlan,
  nightLightLevel = 0,
  onNightLightChange,
  gamingBoost = false,
  onToggleGamingBoost,
  micMuted = false,
  onToggleMicMute,
  audioOutputs = [],
  audioInputs = [],
  activeAudioOutputId = '',
  activeAudioInputId = '',
  onSwitchAudioDevice,
  mediaSessions = [],
  onMediaAction,
  onPickAccentColor,
  wirelessDevices,
  onRefreshWireless,
  trashCount,
  enabledFeatures,
  onToggleFeature,
  onOpenWindow,
  onOpenVault,
  onOpenMouseSettings,
  notifications,
  onClearNotifications,
  onDismissNotification,
  onAddNotification,
  onOpenFullShade,
  isPro = true,
  isAdmin = false,
  onOpenLens,
  onLaunchPowerShell,
  themeAccentHex = '#10b981',
  liveCpuPercent = 0,
  liveRamPercent = 0,
  liveGpuName = 'GPU',
  onLockScreen,
}) => {
  const [tiles, setTiles] = useState<ControlHubTileId[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HUB_TILES_KEY) || 'null');
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {
      // ignore
    }
    return DEFAULT_HUB_TILES;
  });
  void setTiles;
  const [circleIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HUB_CIRCLES_KEY) || 'null');
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {
      // ignore
    }
    return DEFAULT_CIRCLE_IDS;
  });
  void circleIds;

  // One UI 9.0 / Liquid Glass Unified Panel State (Free Grid + Visuals + User Presets persisted as JSON!)
  const [panelState, setPanelState] = useState<OneUIPanelState>(() => loadOneUIPanelState());
  const [showVisualStudio, setShowVisualStudio] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    saveOneUIPanelState(panelState);
  }, [panelState]);

  const [editMode, setEditMode] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showMiracastModal, setShowMiracastModal] = useState(false);
  const [showPerAppAudioModal, setShowPerAppAudioModal] = useState(false);
  const [isGridDragging, setIsGridDragging] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string>('');
  const [scrubPosSec, setScrubPosSec] = useState<number | null>(null);
  const [activeConnectivityPicker, setActiveConnectivityPicker] = useState<'none' | 'wifi' | 'bluetooth'>('none');
  const draggingSliderRef = useRef(false);
  const volDragStartXRef = useRef<number>(0);
  const volDidDragRef = useRef<boolean>(false);

  const reorderBlock = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    setPanelState((prev) => {
      if (fromIdx >= prev.blocks.length || toIdx >= prev.blocks.length) return prev;
      const next = [...prev.blocks];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, blocks: next, activePresetId: 'custom' };
    });
  };

  const removeBlock = (id: string) => {
    setPanelState((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
      activePresetId: 'custom',
    }));
  };

  const addBlock = (id: string, defaultSize?: OneUIPanelBlockSize) => {
    setPanelState((prev) => {
      if (prev.blocks.some((b) => b.id === id)) return prev;
      const size: OneUIPanelBlockSize =
        defaultSize ||
        (id === 'media'
          ? '2x2'
          : id === 'brightness' || id === 'volume'
          ? prev.visual.sliderOrientation === 'vertical'
            ? '1x2'
            : '2x1'
          : id === 'wifi' || id === 'bluetooth' || id === 'superdevice' || id === 'dnd'
          ? '2x1'
          : id === 'sys_monitor' || id === 'power_plan'
          ? '4x1'
          : '1x1');
      return {
        ...prev,
        blocks: [...prev.blocks, { id, size }],
        activePresetId: 'custom',
      };
    });
  };

  const resizeBlock = (id: string) => {
    setPanelState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, size: cycleBlockSize(b.id, b.size) } : b)),
      activePresetId: 'custom',
    }));
  };

  const updateVisual = (patch: Partial<OneUIPanelState['visual']>) => {
    setPanelState((prev) => {
      let nextBlocks = prev.blocks;
      if (patch.sliderOrientation && patch.sliderOrientation !== prev.visual.sliderOrientation) {
        const targetSize: OneUIPanelBlockSize = patch.sliderOrientation === 'vertical' ? '1x2' : '2x1';
        nextBlocks = prev.blocks.map((b) =>
          b.id === 'brightness' || b.id === 'volume' ? { ...b, size: targetSize } : b
        );
      }
      return {
        ...prev,
        blocks: nextBlocks,
        visual: { ...prev.visual, ...patch },
        activePresetId: 'custom',
      };
    });
  };

  const applyPreset = (preset: OneUIPanelPreset) => {
    setPanelState((prev) => ({
      ...prev,
      blocks: preset.blocks.map((b) => ({ ...b })),
      visual: { ...preset.visual },
      activePresetId: preset.id,
    }));
  };

  const saveCustomPreset = () => {
    const clean = newPresetName.trim();
    if (!clean) return;
    const id = `user_${Date.now()}`;
    const preset: OneUIPanelPreset = {
      id,
      name: clean,
      blocks: panelState.blocks.map((b) => ({ ...b })),
      visual: { ...panelState.visual },
    };
    setPanelState((prev) => ({
      ...prev,
      activePresetId: id,
      userPresets: [...prev.userPresets, preset],
    }));
    setNewPresetName('');
  };

  const deleteCustomPreset = (id: string) => {
    setPanelState((prev) => ({
      ...prev,
      userPresets: prev.userPresets.filter((p) => p.id !== id),
      activePresetId: prev.activePresetId === id ? 'custom' : prev.activePresetId,
    }));
  };

  const resetPanelLayout = () => {
    const def = createDefaultOneUIPanelState();
    setPanelState((prev) => ({
      ...def,
      userPresets: prev.userPresets,
    }));
  };

  const formatMediaSec = (sec?: number) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${String(rem).padStart(2, '0')}`;
  };

  const computeCapsulePercent = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };

  const [_btCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HUB_BT_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  void _btCollapsed;
  void wirelessDevices;
  void onRefreshWireless;
  const [notifCollapsed, setNotifCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HUB_NOTIF_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [notifTab, setNotifTab] = useState<'all' | 'telegram' | 'system'>('all');

  // Auto-close on mouse leave (paused during Edit Mode, Visual Studio, Media Settings, Per-App Audio, Miracast, Features Manager, Slider Drag, or Wi-Fi/BT Picker!)
  const leaveTimerRef = useRef<number | null>(null);
  const pickingScreenRef = useRef(false);
  const handleHubMouseEnter = () => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };
  const handleHubMouseLeave = () => {
    if (
      editMode ||
      showVisualStudio ||
      showFeaturesModal ||
      showMediaModal ||
      showMiracastModal ||
      showPerAppAudioModal ||
      isGridDragging ||
      draggingSliderRef.current ||
      activeConnectivityPicker !== 'none' ||
      pickingScreenRef.current
    ) {
      return;
    }
    if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = window.setTimeout(() => {
      onClose();
    }, 280);
  };
  useEffect(() => {
    if (!open) {
      setActiveConnectivityPicker('none');
      setShowMediaModal(false);
      setShowMiracastModal(false);
      setShowVisualStudio(false);
    }
  }, [open]);
  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
    };
  }, []);

  // Zero-Freeze Native AVI Screen Recorder + Safe Fallback Screenshot state
  const [recording, setRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'native' | 'browser'>('native');
  const [recSeconds, setRecSeconds] = useState(0);
  const [recBitrateMbps, setRecBitrateMbps] = useState<1.2 | 2.5 | 5>(2.5);
  const [captureBanner, setCaptureBanner] = useState('');
  const [lastCapturePath, setLastCapturePath] = useState('');
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingModeRef = useRef<'native' | 'browser'>('native');

  useEffect(() => {
    recordingModeRef.current = recordingMode;
  }, [recordingMode]);

  useEffect(() => {
    try {
      localStorage.setItem(HUB_TILES_KEY, JSON.stringify(tiles));
    } catch {
      // ignore
    }
  }, [tiles]);

  useEffect(() => {
    try {
      localStorage.setItem(HUB_NOTIF_COLLAPSED_KEY, notifCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [notifCollapsed]);

  // Sync native recorder state on mount (in case recording continues across hub close/open)
  useEffect(() => {
    let alive = true;
    fetch('/api/kernel/capture/native-record/status')
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d) return;
        if (d.running || d.recording) {
          setRecordingMode('native');
          setRecording(true);
          if (typeof d.elapsed_sec === 'number') setRecSeconds(Math.round(d.elapsed_sec));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [recording]);

  const handleTakeScreenshot = useCallback(async () => {
    setCaptureBanner('Делаю компактный снимок экрана...');
    try {
      const res = await fetch('/api/kernel/capture/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data?.ok && data.file) {
        const kb = Math.max(1, Math.round((data.file.size_bytes || 0) / 1024));
        setLastCapturePath(data.file.path || '');
        setCaptureBanner(`Скриншот сохранён: ${data.file.name} (${kb} КБ)`);
        onAddNotification({
          source: 'system',
          sender: 'Luma Захват',
          title: 'Скриншот сохранён',
          body: `${data.file.name} (${kb} КБ) → ~/Pictures/LumaCaptures`,
          unread: true,
        });
        return;
      }
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        pickingScreenRef.current = true;
        await fetch('/api/kernel/capture/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suspend: true }),
        }).catch(() => {});
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
          const video = document.createElement('video');
          video.srcObject = stream;
          await video.play();
          await new Promise((r) => setTimeout(r, 150));
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
          stream.getTracks().forEach((tr) => tr.stop());
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          const saveRes = await fetch('/api/kernel/capture/screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64_data: dataUrl, ext: 'jpg' }),
          });
          const saved = await saveRes.json();
          if (saved?.ok && saved.file) {
            const kb = Math.max(1, Math.round((saved.file.size_bytes || 0) / 1024));
            setLastCapturePath(saved.file.path || '');
            setCaptureBanner(`Скриншот сохранён: ${saved.file.name} (${kb} КБ)`);
            onAddNotification({
              source: 'system',
              sender: 'Luma Захват',
              title: 'Скриншот сохранён',
              body: `${saved.file.name} (${kb} КБ)`,
              unread: true,
            });
            return;
          }
        } finally {
          pickingScreenRef.current = false;
          fetch('/api/kernel/capture/prepare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ suspend: false }),
          }).catch(() => {});
        }
      }
      setCaptureBanner('Не удалось захватить экран в текущем режиме браузера');
    } catch {
      pickingScreenRef.current = false;
      fetch('/api/kernel/capture/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: false }),
      }).catch(() => {});
      setCaptureBanner('Захват экрана отменён пользователем');
    }
  }, [onAddNotification]);

  const stopRecording = useCallback(async () => {
    if (recordingModeRef.current === 'native') {
      setRecording(false);
      setCaptureBanner('Сохраняю AVI-видео...');
      try {
        const res = await fetch('/api/kernel/capture/native-record/stop', { method: 'POST' });
        const data = await res.json();
        if (data?.ok && data.file) {
          const mb = ((data.file.size_bytes || 0) / (1024 * 1024)).toFixed(2);
          setLastCapturePath(data.file.path || '');
          setCaptureBanner(`Видео сохранено: ${data.file.name} (${mb} МБ · ${data.frames || 0} кадр.)`);
          onAddNotification({
            source: 'system',
            sender: 'Luma Запись экрана',
            title: 'Запись экрана сохранена (Zero-Freeze)',
            body: `${data.file.name} (${mb} МБ) → ~/Videos/LumaRecordings`,
            unread: true,
          });
        } else {
          setCaptureBanner(data?.error || 'Запись остановлена');
        }
      } catch {
        setCaptureBanner('Запись остановлена');
      }
      return;
    }

    try {
      mediaRecRef.current?.stop();
    } catch {
      // ignore
    }
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    setRecording(false);
  }, [onAddNotification]);

  // Global Ctrl+Shift+S emergency/quick stop hotkey while recording
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        void stopRecording();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [recording, stopRecording]);

  const startRecording = useCallback(async () => {
    // 1) PRIMARY (Windows / Native Kernel 1.4.7): Zero-Freeze pure-Go GDI background AVI recorder!
    // Never invokes WebView2 getDisplayMedia modal, so HWND_TOPMOST can NEVER deadlock the desktop!
    setCaptureBanner('Запускаю Zero-Freeze запись экрана...');
    try {
      const fps = recBitrateMbps === 5 ? 18 : recBitrateMbps === 2.5 ? 12 : 8;
      const maxWidth = recBitrateMbps === 5 ? 1600 : recBitrateMbps === 2.5 ? 1280 : 960;
      const quality = recBitrateMbps === 5 ? 82 : recBitrateMbps === 2.5 ? 72 : 60;
      const nativeRes = await fetch('/api/kernel/capture/native-record/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fps, max_width: maxWidth, quality }),
      });
      const nativeData = await nativeRes.json().catch(() => ({}));
      if (nativeRes.ok && nativeData?.ok) {
        setRecordingMode('native');
        recordingModeRef.current = 'native';
        setRecSeconds(0);
        setRecording(true);
        setCaptureBanner(`Идёт Zero-Freeze запись (${fps} FPS · Ctrl+Shift+S — стоп)`);
        return;
      }
    } catch {
      // Fallback to safe browser MediaRecorder below
    }

    // 2) SAFE BROWSER FALLBACK (with HWND_TOPMOST suspension so picker is NEVER trapped behind Luma!)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setCaptureBanner('Запись экрана недоступна в headless-режиме (работает в Windows EXE)');
      return;
    }

    pickingScreenRef.current = true;
    await fetch('/api/kernel/capture/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend: true }),
    }).catch(() => {});

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 24 }, audio: false });
      pickingScreenRef.current = false;
      fetch('/api/kernel/capture/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: false }),
      }).catch(() => {});

      setRecordingMode('browser');
      recordingModeRef.current = 'browser';
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

      const rec = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: Math.round(recBitrateMbps * 1_000_000),
      });
      mediaRecRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const mb = (blob.size / (1024 * 1024)).toFixed(2);
        setCaptureBanner(`Сохраняю компактное видео (${mb} МБ)...`);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const b64 = typeof reader.result === 'string' ? reader.result : '';
            if (b64) {
              const res = await fetch('/api/kernel/capture/save-recording', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64_data: b64, ext: 'webm' }),
              });
              const data = await res.json();
              if (data?.ok && data.file) {
                setLastCapturePath(data.file.path || '');
                setCaptureBanner(`Видео сохранено: ${data.file.name} (${mb} МБ)`);
                onAddNotification({
                  source: 'system',
                  sender: 'Luma Запись экрана',
                  title: 'Компактная запись сохранена',
                  body: `${data.file.name} (${mb} МБ · ${recBitrateMbps} Мбит/с) → ~/Videos/LumaRecordings`,
                  unread: true,
                });
                return;
              }
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `luma_rec_${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            setCaptureBanner(`Видео скачано (${mb} МБ)`);
          };
          reader.readAsDataURL(blob);
        } catch {
          setCaptureBanner(`Запись завершена (${mb} МБ)`);
        }
      };
      stream.getVideoTracks()[0]?.addEventListener('ended', () => void stopRecording());
      setRecSeconds(0);
      setRecording(true);
      rec.start(1000);
      setCaptureBanner(`Идёт запись (${recBitrateMbps} Мбит/с · Ctrl+Shift+S — стоп)`);
    } catch {
      pickingScreenRef.current = false;
      fetch('/api/kernel/capture/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: false }),
      }).catch(() => {});
      setCaptureBanner('Запись экрана отменена');
    }
  }, [recBitrateMbps, onAddNotification, stopRecording]);

  const moveTile = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= tiles.length) return;
    const copy = [...tiles];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setTiles(copy);
  };

  const toggleTileInDeck = (id: ControlHubTileId) => {
    if (tiles.includes(id)) {
      if (tiles.length <= 2) return;
      setTiles(tiles.filter((t) => t !== id));
    } else {
      setTiles([...tiles, id]);
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (notifTab === 'all') return true;
    if (notifTab === 'telegram') return n.source === 'telegram' || n.source === 'discord' || n.source === 'whatsapp';
    return n.source === 'system' || n.source === 'browser';
  });

  if (!open && !recording) return null;

  if (!open && recording) {
    const mm = String(Math.floor(recSeconds / 60)).padStart(2, '0');
    const ss = String(recSeconds % 60).padStart(2, '0');
    return (
      <div className="fixed top-3 right-4 z-[980] flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600/95 text-white text-xs font-semibold shadow-2xl border border-rose-300/40 backdrop-blur-xl">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="font-mono">REC {mm}:{ss}</span>
        <span className="text-[9px] opacity-75 hidden sm:inline">Ctrl+Shift+S</span>
        <button
          onClick={() => void stopRecording()}
          className="ml-1 px-2 py-0.5 rounded-full bg-black/30 hover:bg-black/50 flex items-center gap-1 text-[10px] cursor-pointer"
        >
          <Square size={9} fill="currentColor" /> Стоп
        </button>
      </div>
    );
  }

  const glassSurface = isDark
    ? 'bg-[#0c0e14]/90 border-white/14 text-white shadow-[0_24px_70px_rgba(0,0,0,0.65)]'
    : 'bg-white/90 border-slate-300/80 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.18)]';
  const subText = isDark ? 'text-white/55' : 'text-slate-500';

  const renderTileCard = (id: ControlHubTileId, idx: number) => {
    let icon: React.ReactNode = <Sparkles size={14} />;
    let label = '';
    let sub = '';
    let active = false;
    let onClick = () => {};
    let onContextMenu: ((e: React.MouseEvent) => void) | undefined;
    let onOpenList: ((e: React.MouseEvent) => void) | undefined;
    let tileTitle: string | undefined;

    switch (id) {
      case 'wifi': {
        const wfOn = wifiStatus ? wifiStatus.enabled : wifiEnabled;
        const wfConn = wifiStatus ? wifiStatus.connected : wifiConnected;
        const wfSsid = wifiStatus?.active_ssid || (wfConn ? wifiName : '');
        icon = <Wifi size={14} />;
        label = 'Wi-Fi';
        sub = !wfOn ? 'Выкл · ПКМ' : wfConn && wfSsid ? wfSsid : 'Сети · ПКМ';
        active = wfOn;
        tileTitle = 'ЛКМ — вкл/выкл Wi-Fi · ПКМ — выбрать сеть и ввести пароль';
        onClick = () => {
          if (onToggleWifi) onToggleWifi(!wfOn);
          else {
            setActiveConnectivityPicker((p) => (p === 'wifi' ? 'none' : 'wifi'));
            onRefreshWifi?.(true);
          }
        };
        onContextMenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowFeaturesModal(false);
          setActiveConnectivityPicker((p) => {
            const next = p === 'wifi' ? 'none' : 'wifi';
            if (next === 'wifi') onRefreshWifi?.(true);
            return next;
          });
        };
        onOpenList = onContextMenu;
        break;
      }
      case 'bluetooth': {
        const btOn = bluetoothStatus ? bluetoothStatus.enabled : bluetoothEnabled;
        const connectedDev = bluetoothStatus?.devices?.find((d) => d.connected);
        icon = <Bluetooth size={14} />;
        label = 'Bluetooth';
        sub = !btOn ? 'Выкл · ПКМ' : connectedDev ? connectedDev.name : 'Устр. · ПКМ';
        active = btOn;
        tileTitle = 'ЛКМ — вкл/выкл Bluetooth · ПКМ — список устройств';
        onClick = () => onToggleBluetooth(!btOn);
        onContextMenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowFeaturesModal(false);
          setActiveConnectivityPicker((p) => {
            const next = p === 'bluetooth' ? 'none' : 'bluetooth';
            if (next === 'bluetooth') onRefreshBluetooth?.();
            return next;
          });
        };
        onOpenList = onContextMenu;
        break;
      }
      case 'dnd':
        icon = dnd ? <BellOff size={14} /> : <Bell size={14} />;
        label = 'Тишина';
        sub = dnd ? 'Не беспокоить' : 'Активно';
        active = dnd;
        onClick = onToggleDnd;
        break;
      case 'theme':
        icon = <SunMoon size={14} />;
        label = 'Тема';
        sub = isDark ? 'Тёмная' : 'Светлая';
        active = isDark;
        onClick = onToggleTheme;
        break;
      case 'night_light':
        icon = <Moon size={14} />;
        label = 'Ночной свет';
        sub = nightLightLevel > 0 ? `Тепло ${nightLightLevel}%` : 'Выкл';
        active = nightLightLevel > 0;
        onClick = () => onNightLightChange?.(nightLightLevel > 0 ? 0 : 35);
        break;
      case 'gaming_boost':
        icon = <Flame size={14} />;
        label = 'Игровой';
        sub = gamingBoost ? 'Турбо ВКЛ' : 'Обычный';
        active = gamingBoost;
        onClick = () => onToggleGamingBoost?.();
        break;
      case 'mic_mute':
        icon = micMuted ? <MicOff size={14} /> : <Mic size={14} />;
        label = 'Микрофон';
        sub = micMuted ? 'Заглушён' : 'Активен';
        active = !micMuted;
        onClick = () => onToggleMicMute?.();
        break;
      case 'office':
        icon = <FileText size={14} />;
        label = 'Office';
        sub = 'Docs·Sheets·PPT';
        active = false;
        onClick = () => {
          onClose();
          onOpenWindow('office');
        };
        break;
      case 'security':
        icon = <ShieldCheck size={14} />;
        label = 'LumaShield';
        sub = 'v2.5 · 275+';
        active = true;
        onClick = () => {
          onClose();
          onOpenWindow('security');
        };
        break;
      case 'screenshot':
        icon = <Camera size={14} />;
        label = 'Скриншот';
        sub = 'JPEG ~120КБ';
        active = false;
        onClick = () => void handleTakeScreenshot();
        break;
      case 'recorder':
        icon = recording ? <Square size={14} fill="currentColor" /> : <Video size={14} />;
        label = recording ? `Стоп ${String(Math.floor(recSeconds / 60)).padStart(2, '0')}:${String(recSeconds % 60).padStart(2, '0')}` : 'Запись';
        sub = recording ? 'Ctrl+Shift+S' : 'Zero-Freeze AVI';
        active = recording;
        onClick = () => (recording ? void stopRecording() : void startRecording());
        break;
      case 'vault':
        icon = <Shield size={14} />;
        label = 'Приватность';
        sub = 'AES-256 Стол';
        active = false;
        onClick = () => {
          onClose();
          onOpenVault();
        };
        break;
      case 'scenarios':
        icon = <Zap size={14} />;
        label = 'Сценарии';
        sub = 'Если → То';
        active = enabledFeatures.scenarios;
        onClick = () => {
          onClose();
          onOpenWindow('scenarios');
        };
        break;
      case 'mouse_dpi':
        icon = <MousePointer2 size={14} />;
        label = 'Мышь DPI';
        sub = 'Скорость';
        active = false;
        onClick = () => {
          onClose();
          onOpenMouseSettings();
        };
        break;
      case 'island':
        icon = <Sparkles size={14} />;
        label = 'Остров';
        sub = dynamicIslandEnabled ? 'Активен' : 'Скрыт';
        active = dynamicIslandEnabled;
        onClick = onToggleIsland;
        break;
      case 'dual_bar':
        icon = <Layers size={14} />;
        label = '2 Панели';
        sub = dualTaskbarMode ? 'Верх + Низ' : 'Одна панель';
        active = dualTaskbarMode;
        onClick = onToggleDualTaskbar;
        break;
      case 'trash':
        icon = <Trash2 size={14} />;
        label = 'Корзина';
        sub = `${trashCount} объ.`;
        active = trashCount > 0;
        onClick = () => {
          onClose();
          onOpenWindow('trash');
        };
        break;
      case 'code_studio':
        icon = <Sliders size={14} />;
        label = 'Code IDE';
        sub = 'Редактор Pro';
        active = false;
        onClick = () => {
          onClose();
          onOpenWindow('code_studio');
        };
        break;
      case 'cut_studio':
        icon = <Video size={14} />;
        label = 'Cut Studio';
        sub = 'Видеомонтаж';
        active = false;
        onClick = () => {
          onClose();
          onOpenWindow('cut_studio');
        };
        break;
      case 'power_saver':
        icon = <Power size={14} />;
        label = 'Эко-режим';
        sub = powerPlan === 'saver' || powerPlan === 'powersaver' ? 'Включён' : 'Баланс';
        active = powerPlan === 'saver' || powerPlan === 'powersaver';
        onClick = onTogglePowerSaver;
        break;
      case 'miracast':
        icon = <Cast size={14} />;
        label = '2-й экран';
        sub = 'Miracast';
        active = showMiracastModal;
        onClick = () => {
          setActiveConnectivityPicker('none');
          setShowFeaturesModal(false);
          setShowMediaModal(false);
          setShowMiracastModal((v) => !v);
        };
        break;
      case 'features_mgr':
        icon = <Sliders size={14} />;
        label = 'Функции';
        sub = 'Модули ОС';
        active = showFeaturesModal;
        onClick = () => {
          setActiveConnectivityPicker('none');
          setShowMiracastModal(false);
          setShowFeaturesModal((v) => !v);
        };
        break;
    }

    const isPickerOpenForTile =
      (id === 'wifi' && activeConnectivityPicker === 'wifi') ||
      (id === 'bluetooth' && activeConnectivityPicker === 'bluetooth');

    return (
      <div
        key={id}
        title={tileTitle}
        onClick={() => !editMode && onClick()}
        onContextMenu={(e) => {
          if (!editMode && onContextMenu) onContextMenu(e);
        }}
        className={`relative p-2.5 rounded-2xl border transition cursor-pointer select-none flex flex-col justify-between min-h-[60px] ${
          id === 'recorder' && recording
            ? 'bg-rose-500/25 border-rose-400/60 text-rose-100 animate-pulse'
            : isPickerOpenForTile
            ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_16px_rgba(34,211,238,0.25)]'
            : active
            ? isDark
              ? 'bg-cyan-500/18 border-cyan-400/40 text-white'
              : 'bg-cyan-500/15 border-cyan-500/40 text-slate-900'
            : isDark
            ? 'bg-white/[0.045] border-white/10 hover:bg-white/[0.09]'
            : 'bg-slate-100/80 border-slate-200 hover:bg-slate-200/70'
        }`}
      >
        {editMode && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10">
            <button onClick={(e) => { e.stopPropagation(); moveTile(idx, -1); }} className="p-0.5 rounded bg-black/50 text-white hover:bg-cyan-500" title="Влево/Вверх"><ChevronUp size={10} /></button>
            <button onClick={(e) => { e.stopPropagation(); moveTile(idx, 1); }} className="p-0.5 rounded bg-black/50 text-white hover:bg-cyan-500" title="Вправо/Вниз"><ChevronDown size={10} /></button>
            <button onClick={(e) => { e.stopPropagation(); toggleTileInDeck(id); }} className="p-0.5 rounded bg-rose-500/80 text-white hover:bg-rose-500" title="Убрать плитку"><X size={10} /></button>
          </div>
        )}
        <div className="flex items-center justify-between gap-1">
          <span className={active ? 'text-cyan-400' : subText}>{icon}</span>
          {!editMode && onOpenList && (
            <button
              type="button"
              onClick={onOpenList}
              title="Открыть список (или нажмите ПКМ по плитке)"
              className={`p-0.5 rounded-md transition cursor-pointer ${
                isPickerOpenForTile
                  ? 'bg-cyan-400/30 text-cyan-200'
                  : isDark
                  ? 'hover:bg-white/15 text-white/50 hover:text-white'
                  : 'hover:bg-black/10 text-slate-500 hover:text-slate-900'
              }`}
            >
              <ChevronRight size={11} className={isPickerOpenForTile ? 'rotate-90 transition-transform' : 'transition-transform'} />
            </button>
          )}
        </div>
        <div className="mt-1">
          <div className="text-[11px] font-semibold leading-tight truncate">{label}</div>
          <div className={`text-[9px] truncate ${subText}`}>{sub}</div>
        </div>
      </div>
    );
  };

  const renderWirelessIcon = (t: string) => {
    if (t === 'mouse') return <Mouse size={12} className="text-cyan-400" />;
    if (t === 'keyboard') return <Keyboard size={12} className="text-amber-400" />;
    if (t === 'headphones') return <Headphones size={12} className="text-purple-400" />;
    if (t === 'gamepad') return <Gamepad2 size={12} className="text-emerald-400" />;
    return <BatteryCharging size={12} className="text-sky-400" />;
  };

  const triggerTestTelegram = async () => {
    try {
      await fetch('/api/kernel/notifications/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          app: 'Telegram',
          sender: 'жук❤️',
          chat: 'Личные сообщения',
          title: 'жук❤️',
          body: '10.00? 👋',
          level: 'info',
        }),
      });
    } catch {
      onAddNotification({
        source: 'telegram',
        sender: 'жук❤️',
        chat: 'Личные сообщения',
        title: 'жук❤️',
        body: '10.00? 👋',
        unread: true,
      });
    }
  };

  const vis = panelState.visual;
  const activeGradDef =
    ONEUI_GRADIENT_PRESETS.find((g) => g.id === vis.gradientPreset) || ONEUI_GRADIENT_PRESETS[0];
  const effectiveAccent = vis.syncWithTheme
    ? themeAccentHex || vis.accentColor || '#10b981'
    : vis.accentColor || activeGradDef.accent || '#2563eb';
  const opVal = Math.max(0.35, Math.min(0.98, vis.opacity / 100)).toFixed(2);
  const basePanelBg = (isDark ? activeGradDef.darkBg : activeGradDef.lightBg).replace(/OP/g, opVal);
  const panelSurfaceStyle: React.CSSProperties = {
    maxHeight: notifCollapsed ? 'calc(100% - 54px)' : editMode || showVisualStudio ? '78vh' : '70vh',
    borderRadius: `${Math.min(34, vis.radiusPx + 4)}px`,
    backdropFilter: `blur(${vis.blurPx}px) saturate(145%)`,
    WebkitBackdropFilter: `blur(${vis.blurPx}px) saturate(145%)`,
    background: vis.syncWithTheme
      ? isDark
        ? `linear-gradient(155deg, ${hexToRgba(effectiveAccent, Math.min(0.26, vis.opacity / 380))}, rgba(13, 17, 28, ${opVal}))`
        : `linear-gradient(155deg, ${hexToRgba(effectiveAccent, Math.min(0.18, vis.opacity / 480))}, rgba(252, 253, 255, ${opVal}))`
      : basePanelBg,
    borderColor: vis.syncWithTheme
      ? hexToRgba(effectiveAccent, isDark ? 0.34 : 0.28)
      : isDark
      ? 'rgba(255,255,255,0.16)'
      : 'rgba(148,163,184,0.38)',
  };

  return (
    <>
      <div className="fixed inset-0 z-[940]" onClick={onClose} />

      {/* Top-Right One UI 9.0 / Liquid Glass Control Center + Collapsible Notification Center Below */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={handleHubMouseEnter}
        onMouseLeave={handleHubMouseLeave}
        className="fixed top-3 right-3 bottom-3 z-[945] flex flex-col gap-2.5 pointer-events-none"
        style={{ width: 'clamp(340px, 25.5vw, 412px)' }}
      >
        <style>{`
          .luma-oneui-tile {
            transition: transform 260ms cubic-bezier(0.22, 1.32, 0.36, 1),
                        background-color 200ms ease,
                        border-color 200ms ease,
                        box-shadow 220ms ease;
          }
          .luma-oneui-tile:active {
            transform: scale(0.96);
          }
          @keyframes lumaOneuiDrawerIn {
            from { transform: translateY(16px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .luma-oneui-drawer {
            animation: lumaOneuiDrawerIn 260ms cubic-bezier(0.22, 1.28, 0.36, 1) both;
          }
        `}</style>

        {/* UPPER HALF: One UI 9.0 / Liquid Glass Free-Grid Control Center */}
        <div
          className={`pointer-events-auto border flex flex-col overflow-hidden luma-spring-panel luma-optical-glass luma-glass-edge shadow-[0_24px_70px_rgba(0,0,0,0.58)] ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
          style={panelSurfaceStyle}
        >
          {/* Top Compact Header Row */}
          <div className="px-3.5 pt-2.5 pb-1.5 flex items-center justify-between gap-1.5 shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditMode((v) => !v);
                  setShowVisualStudio(false);
                  setShowFeaturesModal(false);
                  setShowMediaModal(false);
                  setShowMiracastModal(false);
                  setShowPerAppAudioModal(false);
                  setActiveConnectivityPicker('none');
                }}
                title={editMode ? 'Готово (сохранить раскладку)' : 'Редактировать панель (перетаскивание, размеры, модули)'}
                className={`h-8 rounded-full flex items-center justify-center gap-1 border transition cursor-pointer ${
                  editMode
                    ? 'px-2.5 text-white shadow-lg text-[10px] font-bold'
                    : isDark
                    ? 'w-8 bg-white/[0.09] border-white/12 text-white/85 hover:bg-white/16'
                    : 'w-8 bg-slate-200/75 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
                style={
                  editMode
                    ? { backgroundColor: effectiveAccent, borderColor: hexToRgba(effectiveAccent, 0.9) }
                    : undefined
                }
              >
                {editMode ? (
                  <>
                    <Check size={13} /> Готово
                  </>
                ) : (
                  <Pencil size={13} />
                )}
              </button>

              <button
                onClick={() => {
                  setShowVisualStudio((v) => !v);
                  setShowFeaturesModal(false);
                  setShowMediaModal(false);
                  setShowMiracastModal(false);
                  setShowPerAppAudioModal(false);
                  setActiveConnectivityPicker('none');
                }}
                title="Внешний вид One UI 9.0 / Liquid Glass (прозрачность, блюр, скругление, цвета, пресеты)"
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition cursor-pointer ${
                  showVisualStudio
                    ? 'text-white shadow-lg'
                    : isDark
                    ? 'bg-white/[0.09] border-white/12 text-white/85 hover:bg-white/16'
                    : 'bg-slate-200/75 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
                style={
                  showVisualStudio
                    ? { backgroundColor: effectiveAccent, borderColor: hexToRgba(effectiveAccent, 0.9) }
                    : undefined
                }
              >
                <Palette size={13} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: effectiveAccent, boxShadow: `0 0 8px ${effectiveAccent}` }}
              />
              <span className="text-xs font-extrabold tracking-tight truncate">
                Luma OS 1.8.1 {isPro ? 'Pro' : 'Base'}
              </span>
              {isPro && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold inline-flex items-center gap-0.5 border shrink-0"
                  style={{
                    backgroundColor: hexToRgba(effectiveAccent, 0.2),
                    borderColor: hexToRgba(effectiveAccent, 0.45),
                    color: isDark ? '#ffffff' : effectiveAccent,
                  }}
                >
                  <Crown size={9} className="text-amber-300" />
                  {isAdmin ? 'ADMIN' : 'PRO'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditMode(false);
                  setShowVisualStudio(false);
                  setShowFeaturesModal(false);
                  setShowMediaModal(false);
                  setShowMiracastModal(false);
                  setActiveConnectivityPicker('none');
                  setShowPerAppAudioModal((v) => !v);
                }}
                title="Per-App Audio — настройки звука по приложениям и выбор вывода"
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition cursor-pointer ${
                  showPerAppAudioModal
                    ? 'bg-cyan-500 text-white border-cyan-300 shadow-lg shadow-cyan-500/35'
                    : isDark
                    ? 'bg-white/[0.09] border-white/12 text-cyan-300 hover:bg-white/16'
                    : 'bg-slate-200/75 border-slate-300 text-cyan-700 hover:bg-slate-200'
                }`}
              >
                <Speaker size={14} />
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenWindow('settings');
                }}
                title="Настройки Luma OS"
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition cursor-pointer ${
                  isDark
                    ? 'bg-white/[0.09] border-white/12 text-white/85 hover:bg-white/16'
                    : 'bg-slate-200/75 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <Settings size={14} />
              </button>
              <button
                onClick={onClose}
                className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer ${subText} hover:bg-white/10`}
                title="Закрыть (Tab / Esc)"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Scrollable One UI 9.0 / Liquid Glass Control Center Content */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {showVisualStudio ? (
              /* ==================== ONE UI 9.0 / LIQUID GLASS VISUAL CUSTOMIZATION STUDIO & PRESETS ==================== */
              <div className="space-y-2.5 luma-animate-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: effectiveAccent }}>
                    <Palette size={14} /> Внешний вид · One UI 9.0 / Liquid Glass
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowVisualStudio(false)}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold cursor-pointer"
                  >
                    ← Назад
                  </button>
                </div>

                {/* Theme Sync Toggle (Synchronizes Control Panel + Taskbar!) */}
                <button
                  type="button"
                  onClick={() => updateVisual({ syncWithTheme: !vis.syncWithTheme })}
                  className={`w-full p-2.5 rounded-2xl border flex items-center justify-between gap-2 text-left cursor-pointer transition ${
                    isDark ? 'bg-white/[0.05] border-white/12 hover:bg-white/[0.09]' : 'bg-white/70 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold">Окраска по теме системы</div>
                    <div className={`text-[9.5px] ${subText}`}>Синхронизирует Панель управления и Панель задач с палитрой ОС</div>
                  </div>
                  {vis.syncWithTheme ? (
                    <ToggleRight size={22} style={{ color: effectiveAccent }} className="shrink-0" />
                  ) : (
                    <ToggleLeft size={22} className="opacity-40 shrink-0" />
                  )}
                </button>

                {/* Sliders: Opacity, Blur, Radius */}
                <div className={`p-2.5 rounded-2xl border space-y-2 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/75 border-slate-200'}`}>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span>Прозрачность плиток и фона</span>
                      <span className="font-mono">{vis.opacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={35}
                      max={98}
                      value={vis.opacity}
                      onChange={(e) => updateVisual({ opacity: Number(e.target.value) })}
                      className="w-full cursor-pointer"
                      style={{ accentColor: effectiveAccent }}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span>Размытие фона (Blur)</span>
                      <span className="font-mono">{vis.blurPx}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={vis.blurPx}
                      onChange={(e) => updateVisual({ blurPx: Number(e.target.value) })}
                      className="w-full cursor-pointer"
                      style={{ accentColor: effectiveAccent }}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span>Скругление углов</span>
                      <span className="font-mono">{vis.radiusPx}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={32}
                      value={vis.radiusPx}
                      onChange={(e) => updateVisual({ radiusPx: Number(e.target.value) })}
                      className="w-full cursor-pointer"
                      style={{ accentColor: effectiveAccent }}
                    />
                  </div>
                </div>

                {/* Slider Orientation + Light/Dark Quick Switch */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className={`p-2 rounded-2xl border space-y-1.5 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/75 border-slate-200'}`}>
                    <div className={`text-[9.5px] font-bold ${subText}`}>Ползунки яркости / звука</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => updateVisual({ sliderOrientation: 'vertical' })}
                        className={`py-1 rounded-xl text-[10px] font-bold border cursor-pointer ${
                          vis.sliderOrientation === 'vertical'
                            ? 'text-white'
                            : isDark
                            ? 'bg-white/5 border-white/10 opacity-70'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                        style={
                          vis.sliderOrientation === 'vertical'
                            ? { backgroundColor: effectiveAccent, borderColor: effectiveAccent }
                            : undefined
                        }
                      >
                        Верт. 1×2
                      </button>
                      <button
                        type="button"
                        onClick={() => updateVisual({ sliderOrientation: 'horizontal' })}
                        className={`py-1 rounded-xl text-[10px] font-bold border cursor-pointer ${
                          vis.sliderOrientation === 'horizontal'
                            ? 'text-white'
                            : isDark
                            ? 'bg-white/5 border-white/10 opacity-70'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                        style={
                          vis.sliderOrientation === 'horizontal'
                            ? { backgroundColor: effectiveAccent, borderColor: effectiveAccent }
                            : undefined
                        }
                      >
                        Гориз.
                      </button>
                    </div>
                  </div>
                  <div className={`p-2 rounded-2xl border space-y-1.5 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/75 border-slate-200'}`}>
                    <div className={`text-[9.5px] font-bold ${subText}`}>Тема оформления</div>
                    <button
                      type="button"
                      onClick={onToggleTheme}
                      className={`w-full py-1 rounded-xl text-[10px] font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                        isDark ? 'bg-white/10 border-white/15 hover:bg-white/15' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <SunMoon size={12} /> {isDark ? 'Тёмная' : 'Светлая'}
                    </button>
                  </div>
                </div>

                {/* Gradient Style Presets & Manual Accent Picker */}
                <div className={`p-2.5 rounded-2xl border space-y-2 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/75 border-slate-200'}`}>
                  <div className={`text-[10px] font-bold ${subText}`}>Стиль стекла и градиент</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ONEUI_GRADIENT_PRESETS.map((gp) => {
                      const active = vis.gradientPreset === gp.id;
                      return (
                        <button
                          key={gp.id}
                          type="button"
                          onClick={() =>
                            updateVisual({
                              gradientPreset: gp.id,
                              syncWithTheme: gp.id === 'monet_theme',
                              ...(gp.accent ? { accentColor: gp.accent } : {}),
                            })
                          }
                          className={`p-1.5 rounded-xl border text-left cursor-pointer transition ${
                            active
                              ? 'ring-2 ring-white/80 bg-white/12'
                              : isDark
                              ? 'bg-white/[0.04] border-white/10 hover:bg-white/10'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="h-3 rounded-full mb-1" style={{ background: gp.preview }} />
                          <div className="text-[9.5px] font-bold truncate">{gp.label}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[10px] font-semibold ${subText}`}>Цвет активных плиток:</span>
                    <div className="flex items-center gap-1.5">
                      {ACCENT_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => {
                            updateVisual({ accentColor: hex, syncWithTheme: false });
                            onPickAccentColor?.(hex);
                          }}
                          className="w-4 h-4 rounded-full border border-white/40 hover:scale-115 transition cursor-pointer"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                      <input
                        type="color"
                        value={effectiveAccent}
                        onChange={(e) => {
                          updateVisual({ accentColor: e.target.value, syncWithTheme: false });
                          onPickAccentColor?.(e.target.value);
                        }}
                        title="Свой цвет"
                        className="w-5 h-5 rounded-full bg-transparent border-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Built-in & User Saved Presets */}
                <div className={`p-2.5 rounded-2xl border space-y-2 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/75 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold ${subText}`}>Пресеты раскладок</span>
                    <button
                      type="button"
                      onClick={resetPanelLayout}
                      className="text-[9.5px] px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={9} /> Сброс
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BUILTIN_ONEUI_PRESETS.map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => applyPreset(pr)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition ${
                          panelState.activePresetId === pr.id
                            ? 'text-white shadow'
                            : isDark
                            ? 'bg-white/[0.06] border-white/12 hover:bg-white/12'
                            : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                        }`}
                        style={
                          panelState.activePresetId === pr.id
                            ? { backgroundColor: effectiveAccent, borderColor: effectiveAccent }
                            : undefined
                        }
                      >
                        {pr.name}
                      </button>
                    ))}
                    {panelState.userPresets.map((pr) => (
                      <div
                        key={pr.id}
                        className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-[10px] font-bold border ${
                          panelState.activePresetId === pr.id
                            ? 'text-white'
                            : isDark
                            ? 'bg-white/[0.06] border-white/12'
                            : 'bg-slate-100 border-slate-200'
                        }`}
                        style={
                          panelState.activePresetId === pr.id
                            ? { backgroundColor: effectiveAccent, borderColor: effectiveAccent }
                            : undefined
                        }
                      >
                        <button type="button" onClick={() => applyPreset(pr)} className="cursor-pointer">
                          {pr.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomPreset(pr.id)}
                          className="p-0.5 rounded-full hover:bg-black/25 cursor-pointer"
                          title="Удалить пресет"
                        >
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <input
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveCustomPreset();
                      }}
                      placeholder="Название нового пресета..."
                      className={`flex-1 h-7 px-2.5 rounded-xl border text-[10px] outline-none ${
                        isDark ? 'bg-black/25 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={saveCustomPreset}
                      disabled={!newPresetName.trim()}
                      className="h-7 px-2.5 rounded-xl text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      style={{ backgroundColor: effectiveAccent }}
                    >
                      <Save size={10} /> Сохранить
                    </button>
                  </div>
                </div>
              </div>
            ) : showFeaturesModal ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold" style={{ color: effectiveAccent }}>Менеджер функций Luma OS 1.8.1</span>
                  <button onClick={() => setShowFeaturesModal(false)} className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 cursor-pointer">
                    Назад
                  </button>
                </div>
                {SYSTEM_FEATURE_META.map((feat) => {
                  const on = enabledFeatures[feat.key];
                  return (
                    <button
                      key={feat.key}
                      onClick={() => onToggleFeature(feat.key)}
                      className={`w-full p-2 rounded-2xl border flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                        isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/[0.09]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate">{feat.label}</div>
                        <div className={`text-[9px] truncate ${subText}`}>{feat.desc}</div>
                      </div>
                      {on ? <ToggleRight size={19} className="text-emerald-400 shrink-0" /> : <ToggleLeft size={19} className="text-white/30 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : showPerAppAudioModal ? (
              /* ==================== DEDICATED PER-APP AUDIO & OUTPUT SETTINGS MODAL ==================== */
              <div className="space-y-2.5 luma-animate-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-cyan-400 flex items-center gap-1.5">
                    <Speaker size={14} /> Per-App Audio · Звук по приложениям
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPerAppAudioModal(false)}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold cursor-pointer"
                  >
                    ← Назад
                  </button>
                </div>

                <LumaPerAppAudioHub
                  isDark={isDark}
                  audioOutputs={audioOutputs as any}
                  activeAudioOutputId={activeAudioOutputId}
                  onSwitchAudioDevice={onSwitchAudioDevice}
                  mediaSessions={mediaSessions}
                  onMediaAction={onMediaAction}
                />

                {(audioOutputs.length > 0 || audioInputs.length > 0) && (
                  <div className={`rounded-2xl border p-2.5 space-y-1.5 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                      Устройства вывода и микрофон
                    </div>
                    {audioOutputs.map((dev) => (
                      <button
                        key={dev.id}
                        onClick={() => onSwitchAudioDevice?.(dev.id, 'output')}
                        className={`w-full px-2 py-1.5 rounded-xl text-left text-[10px] flex items-center justify-between border transition cursor-pointer ${
                          dev.id === activeAudioOutputId || dev.is_default
                            ? 'bg-cyan-500/18 border-cyan-400/40 text-cyan-200'
                            : isDark
                            ? 'bg-white/[0.04] border-white/10 hover:bg-white/10'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <span className="truncate">🔊 {dev.name}</span>
                        {(dev.id === activeAudioOutputId || dev.is_default) && <Check size={11} className="text-cyan-400 shrink-0" />}
                      </button>
                    ))}
                    {audioInputs.map((dev) => (
                      <button
                        key={dev.id}
                        onClick={() => onSwitchAudioDevice?.(dev.id, 'input')}
                        className={`w-full px-2 py-1.5 rounded-xl text-left text-[10px] flex items-center justify-between border transition cursor-pointer ${
                          dev.id === activeAudioInputId || dev.is_default
                            ? 'bg-emerald-500/18 border-emerald-400/40 text-emerald-200'
                            : isDark
                            ? 'bg-white/[0.04] border-white/10 hover:bg-white/10'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <span className="truncate">🎙 {dev.name}</span>
                        {(dev.id === activeAudioInputId || dev.is_default) && <Check size={11} className="text-emerald-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : showMiracastModal ? (
              /* ==================== WIRELESS SECOND SCREEN (MIRACAST) MODAL ==================== */
              <div className="space-y-2.5 luma-animate-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-sky-400 flex items-center gap-1.5">
                    <Cast size={14} /> 2-й экран · Miracast
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMiracastModal(false)}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold cursor-pointer"
                  >
                    ← Назад
                  </button>
                </div>
                <LumaMiracastPanel
                  mode="compact"
                  onNotify={(msg) =>
                    onAddNotification({
                      source: 'system',
                      sender: 'Miracast · 2-й экран',
                      title: 'Беспроводной дисплей',
                      body: msg,
                      unread: true,
                    })
                  }
                />
              </div>
            ) : showMediaModal ? (
              /* ==================== FULL MEDIA PLAYER & AUDIO SETTINGS MODAL (OPENED ON PLAYER CLICK!) ==================== */
              (() => {
                const activeSession =
                  mediaSessions.find((s) => s.id === selectedMediaId || s.source_app === selectedMediaId) ||
                  mediaSessions.find((s) => s.is_playing) ||
                  mediaSessions[0];
                const targetApp = activeSession?.source_app || activeSession?.id;
                const dur = Math.max(0, activeSession?.duration_sec || 0);
                const curPos = scrubPosSec !== null ? scrubPosSec : Math.max(0, activeSession?.position_sec || 0);
                const progressPct = dur > 0 ? Math.max(0, Math.min(100, (curPos / dur) * 100)) : 0;

                return (
                  <div className="space-y-2.5 luma-animate-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-sky-400 flex items-center gap-1.5">
                        <Speaker size={14} /> Плеер и настройки звука
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMediaModal(false)}
                        className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold cursor-pointer"
                      >
                        ← Назад
                      </button>
                    </div>

                    {/* Multi-session player selector */}
                    {mediaSessions.length > 1 && (
                      <div className="flex flex-wrap gap-1">
                        {mediaSessions.map((s) => {
                          const isSel = activeSession && (s.id === activeSession.id || s.source_app === activeSession.source_app);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedMediaId(s.source_app || s.id)}
                              className={`px-2 py-1 rounded-full text-[10px] font-semibold border cursor-pointer transition ${
                                isSel
                                  ? 'bg-blue-600 border-blue-400 text-white'
                                  : isDark
                                  ? 'bg-white/[0.06] border-white/10 text-white/75 hover:bg-white/15'
                                  : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              {s.is_playing ? '▶ ' : ''}{s.display_name || s.source_app}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Now Playing Hero Card + Seek Timeline + Transport */}
                    <div className={`p-3 rounded-[22px] border space-y-2.5 ${isDark ? 'bg-[#1d2331]/90 border-white/12' : 'bg-slate-100 border-slate-200'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/40 via-sky-500/30 to-violet-500/30 border border-white/15 flex items-center justify-center shrink-0">
                          <Speaker size={22} className="text-sky-200" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold truncate">
                            {activeSession?.title || 'Ничего не воспроизводится'}
                          </div>
                          <div className={`text-[10px] truncate ${subText}`}>
                            {activeSession?.artist || activeSession?.display_name || 'Системный медиаплеер'}
                          </div>
                          <div className="text-[9px] font-mono text-sky-400 mt-0.5">
                            {activeSession?.display_name || 'Медиа ПК'} · {activeSession?.is_playing ? 'Играет' : 'На паузе'}
                          </div>
                        </div>
                      </div>

                      {/* Interactive Seek / Scrubbing Timeline Bar */}
                      <div className="space-y-1">
                        <div
                          onPointerDown={(e) => {
                            if (dur <= 0) return;
                            e.currentTarget.setPointerCapture(e.pointerId);
                            draggingSliderRef.current = true;
                            const pct = computeCapsulePercent(e.clientX, e.currentTarget);
                            setScrubPosSec(pct * dur);
                          }}
                          onPointerMove={(e) => {
                            if (!draggingSliderRef.current || dur <= 0) return;
                            const pct = computeCapsulePercent(e.clientX, e.currentTarget);
                            setScrubPosSec(pct * dur);
                          }}
                          onPointerUp={(e) => {
                            if (!draggingSliderRef.current) return;
                            draggingSliderRef.current = false;
                            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                            if (dur > 0) {
                              const pct = computeCapsulePercent(e.clientX, e.currentTarget);
                              const sec = Math.round(pct * dur);
                              setScrubPosSec(null);
                              onMediaAction?.(`seek_to:${sec}`, targetApp);
                            }
                          }}
                          title={dur > 0 ? 'Перетащите для перемотки трека' : 'Перемотка кнопками -10с / +10с'}
                          className={`relative h-5 flex items-center touch-none ${dur > 0 ? 'cursor-ew-resize' : 'cursor-default opacity-65'}`}
                        >
                          <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/12' : 'bg-slate-300'}`}>
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-[width] duration-75"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          {dur > 0 && (
                            <span
                              className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-blue-500 -translate-x-1/2 pointer-events-none"
                              style={{ left: `${progressPct}%` }}
                            />
                          )}
                        </div>
                        <div className={`flex items-center justify-between text-[10px] font-mono ${subText}`}>
                          <span>{formatMediaSec(curPos)}</span>
                          <span>{dur > 0 ? formatMediaSec(dur) : '--:--'}</span>
                        </div>
                      </div>

                      {/* Transport Controls: -10s · Prev · Play/Pause · Next · +10s */}
                      <div className="flex items-center justify-between gap-1 px-1">
                        <button
                          type="button"
                          onClick={() => onMediaAction?.('seek_back', targetApp)}
                          title="Перемотать назад на 10 сек"
                          className={`px-2 py-1.5 rounded-full text-[10px] font-mono font-bold cursor-pointer transition ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-white border border-slate-200 hover:bg-slate-200'}`}
                        >
                          -10с
                        </button>
                        <button
                          type="button"
                          onClick={() => onMediaAction?.('prev', targetApp)}
                          title="Предыдущий трек"
                          className="p-2 rounded-full hover:bg-white/15 cursor-pointer transition"
                        >
                          <SkipBack size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMediaAction?.('playpause', targetApp)}
                          title="Пуск / Пауза"
                          className="w-10 h-10 rounded-full bg-[#2563eb] hover:bg-blue-500 text-white shadow-lg shadow-blue-600/40 flex items-center justify-center cursor-pointer transition"
                        >
                          {activeSession?.is_playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onMediaAction?.('next', targetApp)}
                          title="Следующий трек"
                          className="p-2 rounded-full hover:bg-white/15 cursor-pointer transition"
                        >
                          <SkipForward size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMediaAction?.('seek_forward', targetApp)}
                          title="Перемотать вперёд на 10 сек"
                          className={`px-2 py-1.5 rounded-full text-[10px] font-mono font-bold cursor-pointer transition ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-white border border-slate-200 hover:bg-slate-200'}`}
                        >
                          +10с
                        </button>
                      </div>
                    </div>

                    {/* Full-Width Pointer-Capture Master Volume Bar + Presets */}
                    <div className="space-y-1.5">
                      <div
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          draggingSliderRef.current = true;
                          volDragStartXRef.current = e.clientX;
                          volDidDragRef.current = false;
                          const val = Math.round(computeCapsulePercent(e.clientX, e.currentTarget) * 100);
                          onVolumeChange(val);
                        }}
                        onPointerMove={(e) => {
                          if (!draggingSliderRef.current) return;
                          if (Math.abs(e.clientX - volDragStartXRef.current) > 4) volDidDragRef.current = true;
                          const val = Math.round(computeCapsulePercent(e.clientX, e.currentTarget) * 100);
                          onVolumeChange(val);
                        }}
                        onPointerUp={(e) => {
                          draggingSliderRef.current = false;
                          try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                        }}
                        onWheel={(e) => {
                          e.preventDefault();
                          onVolumeChange(Math.max(0, Math.min(100, (muted ? 0 : volume) + (e.deltaY < 0 ? 4 : -4))));
                        }}
                        className={`relative h-11 rounded-full border overflow-hidden flex items-center cursor-ew-resize select-none touch-none ${
                          isDark ? 'bg-[#222733]/90 border-white/12' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500/55 to-sky-400/55 pointer-events-none"
                          style={{ width: `${muted ? 0 : Math.max(4, volume)}%` }}
                        />
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={onToggleMute}
                          className="relative z-10 ml-3 p-1 text-white cursor-pointer"
                          title="Вкл / Выкл звук"
                        >
                          {muted || volume === 0 ? <VolumeX size={17} className="text-rose-300" /> : <Volume2 size={17} />}
                        </button>
                        <span className="relative z-10 ml-2 text-[11px] font-bold pointer-events-none">Общая громкость</span>
                        <span className="relative z-10 ml-auto mr-3.5 text-[11px] font-mono font-bold pointer-events-none">
                          {muted ? 'MUTE' : `${volume}%`}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {[0, 25, 50, 75, 100].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => (v === 0 ? onToggleMute() : onVolumeChange(v))}
                            className={`py-1 rounded-full text-[10px] font-mono font-bold border cursor-pointer transition ${
                              !muted && Math.abs(volume - v) <= 3
                                ? 'bg-blue-600 border-blue-400 text-white'
                                : isDark
                                ? 'bg-white/[0.06] border-white/10 hover:bg-white/15'
                                : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {v === 0 ? 'Mute' : `${v}%`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Audio Output Switcher inside Media Modal */}
                    {audioOutputs.length > 0 && (
                      <div className="space-y-1">
                        <div className={`text-[10px] font-bold uppercase tracking-wider px-1 ${subText}`}>Устройство вывода</div>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {audioOutputs.map((dev) => (
                            <button
                              key={dev.id}
                              type="button"
                              onClick={() => onSwitchAudioDevice?.(dev.id, 'output')}
                              className={`w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] flex items-center justify-between border transition cursor-pointer ${
                                dev.id === activeAudioOutputId || dev.is_default
                                  ? 'bg-blue-600/25 border-blue-400/50 text-sky-200 font-bold'
                                  : isDark
                                  ? 'bg-white/[0.05] border-white/10 hover:bg-white/10'
                                  : 'bg-white border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span className="truncate">🔊 {dev.name}</span>
                              {(dev.id === activeAudioOutputId || dev.is_default) && <Check size={12} className="text-sky-300 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Per-App Audio Mixer inside Media Modal */}
                    <LumaPerAppAudioHub
                      isDark={isDark}
                      audioOutputs={audioOutputs as any}
                      activeAudioOutputId={activeAudioOutputId}
                      onSwitchAudioDevice={onSwitchAudioDevice}
                      mediaSessions={mediaSessions}
                      onMediaAction={onMediaAction}
                    />
                  </div>
                );
              })()
            ) : (
              <LumaOneUIGridBody
                isDark={isDark}
                subText={subText}
                editMode={editMode}
                onSetEditMode={setEditMode}
                onOpenVisualStudio={() => {
                  setEditMode(false);
                  setShowVisualStudio(true);
                }}
                panelState={panelState}
                effectiveAccent={effectiveAccent}
                onReorderBlock={reorderBlock}
                onRemoveBlock={removeBlock}
                onAddBlock={(id) => addBlock(id)}
                onResizeBlock={resizeBlock}
                onResetLayout={resetPanelLayout}
                onDraggingChange={setIsGridDragging}
                wifiConnected={wifiConnected}
                wifiEnabled={wifiEnabled}
                wifiName={wifiName}
                wifiStatus={wifiStatus}
                wifiLoading={wifiLoading}
                onToggleWifi={onToggleWifi}
                onRefreshWifi={onRefreshWifi}
                onConnectWifi={onConnectWifi}
                onDisconnectWifi={onDisconnectWifi}
                bluetoothEnabled={bluetoothEnabled}
                bluetoothStatus={bluetoothStatus}
                bluetoothLoading={bluetoothLoading}
                onToggleBluetooth={onToggleBluetooth}
                onRefreshBluetooth={onRefreshBluetooth}
                onBluetoothDeviceAction={onBluetoothDeviceAction}
                wirelessDevices={wirelessDevices}
                activeConnectivityPicker={activeConnectivityPicker}
                onSetActiveConnectivityPicker={setActiveConnectivityPicker}
                dnd={dnd}
                onToggleDnd={onToggleDnd}
                volume={volume}
                muted={muted}
                onVolumeChange={onVolumeChange}
                onToggleMute={onToggleMute}
                brightness={brightness}
                onBrightnessChange={onBrightnessChange}
                onToggleTheme={onToggleTheme}
                dynamicIslandEnabled={dynamicIslandEnabled}
                onToggleIsland={onToggleIsland}
                dualTaskbarMode={dualTaskbarMode}
                onToggleDualTaskbar={onToggleDualTaskbar}
                powerPlan={powerPlan}
                onTogglePowerSaver={onTogglePowerSaver}
                onSetPowerPlan={onSetPowerPlan}
                nightLightLevel={nightLightLevel}
                onNightLightChange={onNightLightChange}
                gamingBoost={gamingBoost}
                onToggleGamingBoost={onToggleGamingBoost}
                micMuted={micMuted}
                onToggleMicMute={onToggleMicMute}
                mediaSessions={mediaSessions}
                onMediaAction={onMediaAction}
                trashCount={trashCount}
                liveCpuPercent={liveCpuPercent}
                liveRamPercent={liveRamPercent}
                liveGpuName={liveGpuName}
                recording={recording}
                recSeconds={recSeconds}
                captureBanner={captureBanner}
                lastCapturePath={lastCapturePath}
                onTakeScreenshot={() => void handleTakeScreenshot()}
                onStartRecording={() => void startRecording()}
                onStopRecording={() => void stopRecording()}
                showFeaturesModal={showFeaturesModal}
                showMiracastModal={showMiracastModal}
                showPerAppAudioModal={showPerAppAudioModal}
                onOpenFeaturesModal={() => setShowFeaturesModal(true)}
                onOpenMediaModal={() => setShowMediaModal(true)}
                onOpenMiracastModal={() => {
                  setActiveConnectivityPicker('none');
                  setShowMediaModal(false);
                  setShowFeaturesModal(false);
                  setShowPerAppAudioModal(false);
                  setShowMiracastModal(true);
                }}
                onOpenPerAppAudioModal={() => {
                  setActiveConnectivityPicker('none');
                  setShowFeaturesModal(false);
                  setShowMediaModal(false);
                  setShowMiracastModal(false);
                  setShowPerAppAudioModal(true);
                }}
                onCloseHub={onClose}
                onOpenWindow={onOpenWindow}
                onOpenVault={onOpenVault}
                onOpenMouseSettings={onOpenMouseSettings}
                onOpenLens={onOpenLens}
                onLaunchPowerShell={onLaunchPowerShell}
                onLockScreen={onLockScreen}
              />
            )}
          </div>
        </div>

        {/* LOWER HALF: Collapsible Unified Notification Center (Synced with One UI 9.0 / Theme Styling!) */}
        <div
          className={`pointer-events-auto border flex flex-col overflow-hidden transition-all duration-200 luma-anim-harmony7 luma-optical-glass luma-glass-edge ${
            isDark ? 'text-white' : 'text-slate-900'
          } ${notifCollapsed ? 'shrink-0' : 'flex-1 min-h-[175px]'}`}
          style={{
            borderRadius: `${Math.min(32, vis.radiusPx + 2)}px`,
            backdropFilter: `blur(${vis.blurPx}px) saturate(140%)`,
            WebkitBackdropFilter: `blur(${vis.blurPx}px) saturate(140%)`,
            background: panelSurfaceStyle.background,
            borderColor: panelSurfaceStyle.borderColor,
          }}
        >
          <div className={`px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0 ${!notifCollapsed ? (isDark ? 'border-b border-white/10' : 'border-b border-slate-200') : ''}`}>
            <button
              onClick={() => setNotifCollapsed((c) => !c)}
              className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
              title={notifCollapsed ? 'Развернуть Центр уведомлений' : 'Свернуть Центр уведомлений'}
            >
              <Bell size={13} className="text-cyan-400 shrink-0" />
              <span className="text-xs font-bold truncate">Центр уведомлений</span>
              {notifications.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  {notifications.length}
                </span>
              )}
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 hidden sm:inline">
                Входящие Live
              </span>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              {onOpenFullShade && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenFullShade();
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    isDark ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25' : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                  }`}
                  title="Открыть полноценную Шторку уведомлений (Alt+N)"
                >
                  Шторка
                </button>
              )}
              {!notifCollapsed && (
                <>
                  <button
                    onClick={() => void triggerTestTelegram()}
                    className={`px-2 py-0.5 rounded-lg text-[10px] border transition cursor-pointer ${
                      isDark ? 'bg-sky-500/15 border-sky-400/25 text-sky-300 hover:bg-sky-500/25' : 'bg-sky-50 border-sky-200 text-sky-700'
                    }`}
                    title="Проверить входящее сообщение Telegram + эффект резины на Острове"
                  >
                    <Send size={9} className="inline mr-1" /> Тест
                  </button>
                  {notifications.length > 0 && (
                    <button onClick={onClearNotifications} className={`text-[10px] px-1.5 py-0.5 rounded-lg cursor-pointer ${subText} hover:text-rose-400`}>
                      Очистить
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => setNotifCollapsed((c) => !c)}
                className={`px-2 py-0.5 rounded-lg text-[10px] border flex items-center gap-1 transition cursor-pointer ${
                  isDark ? 'bg-white/[0.06] border-white/10 text-white/75 hover:bg-white/15' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title={notifCollapsed ? 'Развернуть окно уведомлений' : 'Свернуть окно уведомлений'}
              >
                {notifCollapsed ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
                {notifCollapsed ? 'Развернуть' : 'Свернуть'}
              </button>
            </div>
          </div>

          {!notifCollapsed && (
            <>
              <div className="px-3 pt-2 pb-1 flex items-center gap-1 shrink-0">
                {(
                  [
                    ['all', 'Все'],
                    ['telegram', 'Сообщения (TG / WA / DC)'],
                    ['system', 'Система'],
                  ] as const
                ).map(([k, lbl]) => (
                  <button
                    key={k}
                    onClick={() => setNotifTab(k)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold transition cursor-pointer ${
                      notifTab === k
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/35'
                        : isDark
                        ? 'bg-white/[0.04] text-white/55 hover:bg-white/[0.08]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {filteredNotifs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-4 px-2">
                    <Bell size={22} className="opacity-25 mb-1.5" />
                    <div className={`text-xs font-medium ${subText}`}>Входящих сообщений пока нет</div>
                    <div className={`text-[10px] opacity-70 mt-1 leading-relaxed ${subText}`}>
                      Чистый перехват Luma OS 1.5.4 активен: показываются только реальные входящие сообщения — кто, что и когда написал. Замьюченные каналы игнорируются.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void fetch('/api/kernel/notifications/os', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            app: 'Telegram',
                            sender: 'Алексей',
                            chat: 'Личный чат',
                            title: 'Алексей',
                            body: 'Привет! Уведомления Luma OS 1.5.4 приходят чисто и без спама.',
                          }),
                        }).catch(() => {});
                      }}
                      className="mt-2.5 px-3 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-400/30 text-[10px] font-bold cursor-pointer transition"
                    >
                      Проверить уведомление
                    </button>
                  </div>
                ) : (
                  filteredNotifs.map((n) => {
                    const isMessenger = n.source === 'telegram' || n.source === 'whatsapp' || n.source === 'discord';
                    const avatarGrad =
                      n.source === 'telegram'
                        ? 'from-sky-500 to-blue-600'
                        : n.source === 'whatsapp'
                        ? 'from-emerald-500 to-green-600'
                        : n.source === 'discord'
                        ? 'from-indigo-500 to-violet-600'
                        : 'from-cyan-500 to-teal-600';
                    const initial = (n.sender || n.title || 'L').trim().slice(0, 2).toUpperCase();
                    const showSubtitle =
                      n.title &&
                      n.title.trim().toLowerCase() !== (n.sender || '').trim().toLowerCase() &&
                      !n.title.toLowerCase().includes('новое сообщение');

                    return (
                      <div
                        key={n.id}
                        className={`group p-2.5 rounded-2xl border transition relative flex items-start gap-2.5 ${
                          isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/[0.09]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <button
                          onClick={() => onDismissNotification(n.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-white/15 cursor-pointer"
                        >
                          <X size={11} />
                        </button>

                        {/* Circular Sender Avatar + Messenger Corner Badge (matches image_2.png style) */}
                        <div className="relative shrink-0 mt-0.5">
                          {n.avatarUrl ? (
                            <img
                              src={n.avatarUrl}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border border-white/20 shadow"
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad} text-white font-bold text-xs flex items-center justify-center shadow`}
                            >
                              {isMessenger ? initial : <Download size={14} />}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 ${
                              isDark ? 'border-[#0c0e14]' : 'border-white'
                            } flex items-center justify-center ${
                              n.source === 'telegram'
                                ? 'bg-sky-500 text-white'
                                : n.source === 'whatsapp'
                                ? 'bg-emerald-500 text-white'
                                : n.source === 'discord'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-cyan-500 text-white'
                            }`}
                          >
                            {n.source === 'telegram' ? (
                              <Send size={8} />
                            ) : n.source === 'whatsapp' || n.source === 'discord' ? (
                              <MessageCircle size={8} />
                            ) : (
                              <Bell size={8} />
                            )}
                          </span>
                        </div>

                        {/* Sender → Chat + Message Body */}
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="text-[11px] font-bold truncate leading-tight">
                              <span>{n.sender || n.title}</span>
                              {n.chat && n.chat !== n.sender && (
                                <span className={`font-normal ml-1 ${subText}`}>→ {n.chat}</span>
                              )}
                            </div>
                            <span className={`text-[9px] font-mono shrink-0 ${subText}`}>{n.time}</span>
                          </div>
                          {showSubtitle && (
                            <div className="text-[10px] font-semibold text-cyan-400 truncate mt-0.5">{n.title}</div>
                          )}
                          <div className={`text-[11px] leading-snug mt-0.5 break-words ${isDark ? 'text-white/85' : 'text-slate-700'}`}>
                            {n.body}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
