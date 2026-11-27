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
}

const HUB_TILES_KEY = 'luma_carbon_hub_tiles_v151';
const HUB_BT_COLLAPSED_KEY = 'luma_bt_section_collapsed_v15';
const HUB_NOTIF_COLLAPSED_KEY = 'luma_notif_collapsed_v151';

const ACCENT_SWATCHES = ['#06b6d4', '#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#3b82f6'];

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
  const [editMode, setEditMode] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showMiracastModal, setShowMiracastModal] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string>('');
  const [scrubPosSec, setScrubPosSec] = useState<number | null>(null);
  const [activeConnectivityPicker, setActiveConnectivityPicker] = useState<'none' | 'wifi' | 'bluetooth'>('none');
  const draggingSliderRef = useRef(false);
  const volDragStartXRef = useRef<number>(0);
  const volDidDragRef = useRef<boolean>(false);

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

  const [btCollapsed, setBtCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HUB_BT_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [notifCollapsed, setNotifCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HUB_NOTIF_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [audioCollapsed, setAudioCollapsed] = useState(true);
  const [notifTab, setNotifTab] = useState<'all' | 'telegram' | 'system'>('all');

  // Auto-close on mouse leave (paused during Edit Mode, Media Settings, Miracast, Features Manager, Slider Drag, or Wi-Fi/BT Picker!)
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
      showFeaturesModal ||
      showMediaModal ||
      showMiracastModal ||
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
      localStorage.setItem(HUB_BT_COLLAPSED_KEY, btCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [btCollapsed]);

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

  return (
    <>
      <div className="fixed inset-0 z-[940]" onClick={onClose} />

      {/* Top-Right Carbon Control Hub (1/4 Screen Width × 1/2 Height) + Collapsible Notification Center Below — Auto-closes when cursor leaves! */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={handleHubMouseEnter}
        onMouseLeave={handleHubMouseLeave}
        className="fixed top-3 right-3 bottom-3 z-[945] flex flex-col gap-2.5 pointer-events-none"
        style={{ width: 'clamp(330px, 24vw, 396px)' }}
      >
        {/* UPPER HALF: Compact OS Style Control Center (zero wasted empty space!) */}
        <div
          className={`pointer-events-auto rounded-[28px] border backdrop-blur-3xl flex flex-col overflow-hidden luma-spring-panel shadow-[0_24px_70px_rgba(0,0,0,0.58)] ${
            isDark
              ? 'bg-[#121620]/86 border-white/15 text-white'
              : 'bg-white/90 border-slate-200/90 text-slate-900'
          }`}
          style={{ maxHeight: notifCollapsed ? 'calc(100% - 54px)' : '68vh' }}
        >
          {/* Top Compact Header Row */}
          <div className="px-3.5 pt-2.5 pb-1.5 flex items-center justify-between gap-2 shrink-0">
            <button
              onClick={() => {
                setEditMode((v) => !v);
                setShowFeaturesModal(false);
                setShowMediaModal(false);
                setActiveConnectivityPicker('none');
              }}
              title="Редактировать панель управления"
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition cursor-pointer ${
                editMode
                  ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/35'
                  : isDark
                  ? 'bg-white/[0.09] border-white/12 text-white/85 hover:bg-white/16'
                  : 'bg-slate-200/75 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {editMode ? <Check size={14} /> : <Pencil size={14} />}
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
              <span className="text-xs font-extrabold tracking-tight truncate">
                Luma OS 1.7.5 {isPro ? 'Pro' : 'Base'}
              </span>
              {isPro && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-600/25 border border-blue-400/40 text-sky-300 text-[9px] font-mono font-bold inline-flex items-center gap-0.5">
                  <Crown size={9} className="text-amber-300" />
                  {isAdmin ? 'ADMIN' : 'PRO'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
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

          {/* Scrollable Compact OS Style Control Center Content */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {showFeaturesModal ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-sky-400">Менеджер функций Luma OS 1.7.5</span>
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
                      {on ? <ToggleRight size={19} className="text-blue-400 shrink-0" /> : <ToggleLeft size={19} className="text-white/30 shrink-0" />}
                    </button>
                  );
                })}
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
              <>
                {/* ===== ROW 1-2: COMPACT MEDIA CARD (LEFT — CLICK OPENS PLAYER SETTINGS!) + TIGHT WI-FI & BT CAPSULES (RIGHT) ===== */}
                {(() => {
                  const primaryMedia = mediaSessions.find((s) => s.is_playing) || mediaSessions[0];
                  const pillSurface = isDark
                    ? 'bg-[#222733]/85 border-white/10 hover:bg-[#2a3040]/92'
                    : 'bg-slate-100/92 border-slate-200 hover:bg-slate-200/80';
                  const activeBtDev =
                    bluetoothStatus?.devices?.find((d) => d.connected)?.name ||
                    wirelessDevices.find((w) => w.connected)?.name ||
                    (bluetoothEnabled ? 'Bluetooth вкл.' : 'Выкл.');

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-2 items-stretch">
                        {/* Left Compact Media Player Card (Click card -> Full Media Settings with Seek & Volume!) */}
                        <div
                          onClick={() => setShowMediaModal(true)}
                          onWheel={(e) => {
                            e.preventDefault();
                            onMediaAction?.(e.deltaY > 0 ? 'next' : 'prev', primaryMedia?.source_app || primaryMedia?.id);
                          }}
                          title="Нажмите для открытия настроек плеера (перемотка, громкость, вывод) · Колесо: треки"
                          className={`rounded-[22px] border p-2.5 flex flex-col justify-between h-[104px] cursor-pointer transition ${pillSurface}`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <Speaker size={15} className="text-white/85" />
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[7px] font-black shadow">
                                ♪
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-bold truncate leading-tight">
                                {primaryMedia?.title || 'Не воспроизводится'}
                              </div>
                              <div className={`text-[9px] truncate ${subText}`}>
                                {primaryMedia?.artist || primaryMedia?.display_name || 'Нажмите для плеера'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMediaModal(true);
                              }}
                              title="Настройки плеера, перемотка и звук"
                              className="w-6 h-6 rounded-full bg-white/10 hover:bg-blue-600 text-white/85 flex items-center justify-center cursor-pointer transition shrink-0"
                            >
                              <Sliders size={11} />
                            </button>
                          </div>

                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between px-1 pt-1"
                          >
                            <button
                              type="button"
                              onClick={() => onMediaAction?.('prev', primaryMedia?.source_app || primaryMedia?.id)}
                              className="p-1 opacity-75 hover:opacity-100 cursor-pointer transition"
                              title="Предыдущий трек"
                            >
                              <SkipBack size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMediaAction?.('playpause', primaryMedia?.source_app || primaryMedia?.id)}
                              className="w-7 h-7 rounded-full bg-white/14 hover:bg-blue-600 text-white flex items-center justify-center cursor-pointer transition"
                              title="Пуск / Пауза"
                            >
                              {primaryMedia?.is_playing ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => onMediaAction?.('next', primaryMedia?.source_app || primaryMedia?.id)}
                              className="p-1 opacity-75 hover:opacity-100 cursor-pointer transition"
                              title="Следующий трек"
                            >
                              <SkipForward size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Right Tightly Stacked Wi-Fi + Bluetooth Capsules (Zero empty gap between them!) */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => onToggleWifi?.(!wifiEnabled)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveConnectivityPicker((cur) => (cur === 'wifi' ? 'none' : 'wifi'));
                              onRefreshWifi?.(true);
                            }}
                            title="Wi-Fi · ЛКМ: Вкл/Выкл · ПКМ: список сетей и пароль"
                            className={`h-[48px] px-2 rounded-full border flex items-center gap-2 text-left cursor-pointer transition ${
                              activeConnectivityPicker === 'wifi' ? 'ring-2 ring-blue-400 ' + pillSurface : pillSurface
                            }`}
                          >
                            <span
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition shadow-md ${
                                wifiEnabled || wifiConnected
                                  ? 'bg-[#2563eb] text-white shadow-blue-600/40'
                                  : isDark
                                  ? 'bg-white/12 text-white/60'
                                  : 'bg-slate-300 text-slate-600'
                              }`}
                            >
                              <Wifi size={16} />
                            </span>
                            <div className="min-w-0 flex-1 pr-1">
                              <div className="text-[11px] font-bold truncate leading-tight">{wifiName || 'Wi-Fi'}</div>
                              <div className={`text-[9px] truncate ${subText}`}>ПКМ — сети</div>
                            </div>
                          </button>

                          <button
                            onClick={() => onToggleBluetooth(!bluetoothEnabled)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveConnectivityPicker((cur) => (cur === 'bluetooth' ? 'none' : 'bluetooth'));
                              onRefreshBluetooth?.(true);
                            }}
                            title="Bluetooth · ЛКМ: Вкл/Выкл · ПКМ: список устройств"
                            className={`h-[48px] px-2 rounded-full border flex items-center gap-2 text-left cursor-pointer transition ${
                              activeConnectivityPicker === 'bluetooth' ? 'ring-2 ring-blue-400 ' + pillSurface : pillSurface
                            }`}
                          >
                            <span
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition shadow-md ${
                                bluetoothEnabled
                                  ? 'bg-[#2563eb] text-white shadow-blue-600/40'
                                  : isDark
                                  ? 'bg-white/12 text-white/60'
                                  : 'bg-slate-300 text-slate-600'
                              }`}
                            >
                              <Bluetooth size={16} />
                            </span>
                            <div className="min-w-0 flex-1 pr-1">
                              <div className="text-[11px] font-bold truncate leading-tight">{activeBtDev}</div>
                              <div className={`text-[9px] truncate ${subText}`}>ПКМ — устройства</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Inline Native Wi-Fi & Bluetooth Picker (opened via RMB!) */}
                      {activeConnectivityPicker === 'wifi' && (
                        <LumaWifiPickerPanel
                          isDark={isDark}
                          status={wifiStatus}
                          loading={wifiLoading}
                          onRefresh={(rescan) => onRefreshWifi?.(rescan)}
                          onToggleRadio={(en) => onToggleWifi?.(en)}
                          onConnect={
                            onConnectWifi ||
                            (async () => ({ ok: false, error: 'Сервис Wi-Fi недоступен' }))
                          }
                          onDisconnect={onDisconnectWifi || (async () => {})}
                          onClose={() => setActiveConnectivityPicker('none')}
                        />
                      )}

                      {activeConnectivityPicker === 'bluetooth' && (
                        <LumaBluetoothPickerPanel
                          isDark={isDark}
                          status={bluetoothStatus}
                          loading={bluetoothLoading}
                          onRefresh={(activeScan) => onRefreshBluetooth?.(activeScan)}
                          onToggleRadio={(en) => onToggleBluetooth(en)}
                          onDeviceAction={
                            onBluetoothDeviceAction ||
                            (async () => ({ ok: false, error: 'Сервис Bluetooth недоступен' }))
                          }
                          onClose={() => setActiveConnectivityPicker('none')}
                        />
                      )}

                      {/* ===== ROW 3-4: SUPERDEVICE & DND (LEFT) + FULL-HITBOX POINTER-CAPTURE BRIGHTNESS & VOLUME CAPSULES (RIGHT) ===== */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              onClose();
                              onOpenWindow('superdevice');
                            }}
                            title="Суперустройство — единая экосистема устройств Luma OS"
                            className={`h-[44px] px-2 rounded-full border flex items-center gap-2 text-left cursor-pointer transition ${pillSurface}`}
                          >
                            <span className="w-8 h-8 rounded-full bg-white/10 border border-white/15 text-sky-300 flex items-center justify-center shrink-0">
                              <Radio size={15} />
                            </span>
                            <span className="text-[11px] font-bold truncate pr-1">Суперустройство</span>
                          </button>

                          <button
                            onClick={onToggleDnd}
                            title="Режим «Не беспокоить»"
                            className={`h-[44px] px-2 rounded-full border flex items-center gap-2 text-left cursor-pointer transition ${pillSurface}`}
                          >
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
                                dnd ? 'bg-[#2563eb] text-white shadow-md shadow-blue-600/40' : 'bg-white/10 text-white/80'
                              }`}
                            >
                              <Moon size={15} />
                            </span>
                            <span className="text-[11px] font-bold truncate pr-1">Не беспокоить</span>
                          </button>
                        </div>

                        {/* Right Column: 100% Full-Hitbox Pointer-Capture Sliders (ZERO vertical offset!) */}
                        <div className="flex flex-col gap-2">
                          {/* Brightness Capsule — drag anywhere on entire capsule! */}
                          <div
                            onPointerDown={(e) => {
                              e.currentTarget.setPointerCapture(e.pointerId);
                              draggingSliderRef.current = true;
                              const pct = computeCapsulePercent(e.clientX, e.currentTarget);
                              onBrightnessChange(Math.round(25 + pct * 75));
                            }}
                            onPointerMove={(e) => {
                              if (!draggingSliderRef.current) return;
                              const pct = computeCapsulePercent(e.clientX, e.currentTarget);
                              onBrightnessChange(Math.round(25 + pct * 75));
                            }}
                            onPointerUp={(e) => {
                              draggingSliderRef.current = false;
                              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                            }}
                            onPointerCancel={() => {
                              draggingSliderRef.current = false;
                            }}
                            onWheel={(e) => {
                              e.preventDefault();
                              onBrightnessChange(Math.max(25, Math.min(100, brightness + (e.deltaY < 0 ? 5 : -5))));
                            }}
                            title={`Яркость: ${brightness}% · Потяните в любом месте полоски или крутите колесо`}
                            className={`relative h-[44px] rounded-full border overflow-hidden flex items-center cursor-ew-resize select-none touch-none ${pillSurface}`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/32 to-white/48 pointer-events-none"
                              style={{ width: `${Math.max(12, ((brightness - 25) / 75) * 100)}%` }}
                            />
                            <Sun size={16} className="relative z-10 ml-3 text-white drop-shadow shrink-0 pointer-events-none" />
                            <span className="relative z-10 ml-auto mr-3 text-[10px] font-mono font-bold opacity-90 pointer-events-none">
                              {brightness}%
                            </span>
                          </div>

                          {/* Volume Capsule — drag anywhere (even starting on icon!); short click on icon toggles Mute */}
                          <div
                            onPointerDown={(e) => {
                              e.currentTarget.setPointerCapture(e.pointerId);
                              draggingSliderRef.current = true;
                              volDragStartXRef.current = e.clientX;
                              volDidDragRef.current = false;
                              const r = e.currentTarget.getBoundingClientRect();
                              const clickedIcon = e.clientX - r.left <= 38;
                              if (!clickedIcon) {
                                const val = Math.round(computeCapsulePercent(e.clientX, e.currentTarget) * 100);
                                onVolumeChange(val);
                              }
                            }}
                            onPointerMove={(e) => {
                              if (!draggingSliderRef.current) return;
                              if (Math.abs(e.clientX - volDragStartXRef.current) > 4) {
                                volDidDragRef.current = true;
                              }
                              if (volDidDragRef.current) {
                                const val = Math.round(computeCapsulePercent(e.clientX, e.currentTarget) * 100);
                                onVolumeChange(val);
                              }
                            }}
                            onPointerUp={(e) => {
                              const wasDrag = volDidDragRef.current;
                              const r = e.currentTarget.getBoundingClientRect();
                              const releasedOnIcon = e.clientX - r.left <= 38;
                              draggingSliderRef.current = false;
                              volDidDragRef.current = false;
                              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                              if (!wasDrag && releasedOnIcon) {
                                onToggleMute();
                              }
                            }}
                            onPointerCancel={() => {
                              draggingSliderRef.current = false;
                              volDidDragRef.current = false;
                            }}
                            onWheel={(e) => {
                              e.preventDefault();
                              onVolumeChange(Math.max(0, Math.min(100, (muted ? 0 : volume) + (e.deltaY < 0 ? 4 : -4))));
                            }}
                            title={`Громкость: ${muted ? 0 : volume}% · Потяните в любом месте полоски, клик по иконке — без звука`}
                            className={`relative h-[44px] rounded-full border overflow-hidden flex items-center cursor-ew-resize select-none touch-none ${pillSurface}`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500/45 to-white/48 pointer-events-none"
                              style={{ width: `${muted ? 0 : Math.max(volume > 0 ? 10 : 0, volume)}%` }}
                            />
                            <span className="relative z-10 ml-3 text-white drop-shadow shrink-0 pointer-events-none">
                              {muted || volume === 0 ? <VolumeX size={16} className="text-rose-300" /> : <Volume2 size={16} />}
                            </span>
                            <span className="relative z-10 ml-auto mr-3 text-[10px] font-mono font-bold opacity-90 pointer-events-none">
                              {muted ? 'MUTE' : `${volume}%`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ===== COMPACT 4x4 OS STYLE CIRCULAR QUICK TOGGLES GRID ===== */}
                      <div className="grid grid-cols-4 gap-x-1.5 gap-y-2 pt-0.5">
                        {(
                          [
                            {
                              id: 'share',
                              label: 'Luma Share',
                              active: true,
                              icon: <Share2 size={18} />,
                              onClick: () => {
                                onClose();
                                onOpenWindow('oxygen_connect');
                              },
                            },
                            {
                              id: 'mute',
                              label: 'Без звука',
                              active: muted || volume === 0,
                              icon: muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />,
                              onClick: onToggleMute,
                            },
                            {
                              id: 'rec',
                              label: recording ? `${Math.floor(recSeconds / 60)}:${String(recSeconds % 60).padStart(2, '0')}` : 'Запись',
                              active: recording,
                              icon: recording ? <Square size={16} fill="currentColor" /> : <Video size={18} />,
                              onClick: () => (recording ? void stopRecording() : void startRecording()),
                            },
                            {
                              id: 'shot',
                              label: 'Скриншот',
                              active: false,
                              icon: <Camera size={18} />,
                              onClick: () => void handleTakeScreenshot(),
                            },
                            {
                              id: 'lens',
                              label: 'Circle AI',
                              active: false,
                              icon: <ScanSearch size={18} />,
                              onClick: () => {
                                onClose();
                                onOpenLens?.();
                              },
                            },
                            {
                              id: 'eye',
                              label: 'Защита глаз',
                              active: nightLightLevel > 0,
                              icon: <Moon size={18} />,
                              onClick: () => onNightLightChange?.(nightLightLevel > 0 ? 0 : 35),
                            },
                            {
                              id: 'photo',
                              label: 'Фотостудия',
                              active: false,
                              icon: <ImageIcon size={18} />,
                              onClick: () => {
                                onClose();
                                onOpenWindow('photo_editor');
                              },
                            },
                            {
                              id: 'miracast',
                              label: '2-й экран',
                              active: showMiracastModal,
                              icon: <Cast size={18} />,
                              onClick: () => {
                                setActiveConnectivityPicker('none');
                                setShowFeaturesModal(false);
                                setShowMediaModal(false);
                                setShowMiracastModal(true);
                              },
                            },
                            {
                              id: 'game',
                              label: 'Игровой',
                              active: gamingBoost,
                              icon: <Flame size={18} />,
                              onClick: () => onToggleGamingBoost?.(),
                            },
                            {
                              id: 'mic',
                              label: 'Микрофон',
                              active: !micMuted,
                              icon: micMuted ? <MicOff size={18} /> : <Mic size={18} />,
                              onClick: () => onToggleMicMute?.(),
                            },
                            {
                              id: 'island',
                              label: 'Остров',
                              active: dynamicIslandEnabled,
                              icon: <Sparkles size={18} />,
                              onClick: onToggleIsland,
                            },
                            {
                              id: 'shield',
                              label: 'LumaShield',
                              active: true,
                              icon: <ShieldCheck size={18} />,
                              onClick: () => {
                                onClose();
                                onOpenWindow('security');
                              },
                            },
                            {
                              id: 'vault',
                              label: 'Сейф',
                              active: false,
                              icon: <Shield size={18} />,
                              onClick: () => {
                                onClose();
                                onOpenVault();
                              },
                            },
                            {
                              id: 'theme',
                              label: isDark ? 'Тёмная' : 'Светлая',
                              active: isDark,
                              icon: <SunMoon size={18} />,
                              onClick: onToggleTheme,
                            },
                            {
                              id: 'dual',
                              label: '2 Панели',
                              active: dualTaskbarMode,
                              icon: <Layers size={18} />,
                              onClick: onToggleDualTaskbar,
                            },
                            {
                              id: 'feats',
                              label: 'Функции',
                              active: showFeaturesModal,
                              icon: <Sliders size={18} />,
                              onClick: () => setShowFeaturesModal(true),
                            },
                          ] as const
                        ).map((q) => (
                          <button
                            key={q.id}
                            onClick={q.onClick}
                            className="flex flex-col items-center gap-1 group cursor-pointer"
                          >
                            <span
                              className={`w-[44px] h-[44px] rounded-full flex items-center justify-center border transition-all duration-150 ${
                                q.active
                                  ? 'bg-[#2563eb] border-blue-400/60 text-white shadow-[0_6px_18px_rgba(37,99,235,0.42)] group-hover:brightness-110'
                                  : isDark
                                  ? 'bg-[#222733]/85 border-white/10 text-white/85 group-hover:bg-[#2c3344]'
                                  : 'bg-slate-200/90 border-slate-300 text-slate-800 group-hover:bg-slate-300'
                              }`}
                            >
                              {q.icon}
                            </span>
                            <span className="text-[9.5px] font-medium leading-tight text-center truncate w-full opacity-85">
                              {q.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* Editable Custom Extra Tiles Section when Edit Mode is toggled */}
                {editMode && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-3 gap-1.5">
                      {tiles.map((t, idx) => renderTileCard(t, idx))}
                    </div>
                    <div className={`p-2.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-blue-500/[0.08] border-blue-400/25' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="text-[10px] font-semibold text-sky-400">Добавить дополнительные плитки:</div>
                      <div className="flex flex-wrap gap-1">
                        {ALL_HUB_TILES.filter((x) => !tiles.includes(x.id)).map((x) => (
                          <button
                            key={x.id}
                            onClick={() => toggleTileInDeck(x.id)}
                            className={`px-2 py-1 rounded-full text-[10px] font-medium border flex items-center gap-1 cursor-pointer ${
                              isDark ? 'bg-white/[0.06] border-white/10 hover:bg-white/15' : 'bg-white border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <Plus size={10} /> {x.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {(captureBanner || recording) && (
                  <div className={`px-3 py-2 rounded-2xl border text-[10px] flex items-center justify-between gap-2 ${isDark ? 'bg-emerald-500/12 border-emerald-400/25 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                    <span className="truncate">{captureBanner}</span>
                    {lastCapturePath && (
                      <button
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent('luma-open-internal-file', {
                              detail: { path: lastCapturePath, mode: 'auto' },
                            })
                          )
                        }
                        className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/25 hover:bg-emerald-500/40 flex items-center gap-1 cursor-pointer"
                      >
                        <FolderOpen size={10} /> Открыть
                      </button>
                    )}
                  </div>
                )}

                {/* Power Plan 3-Way Switcher + Accent Swatches */}
                <div className={`p-2.5 rounded-2xl border space-y-2 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={subText}>План питания ОС:</span>
                    <div className="flex items-center gap-1">
                      {(
                        [
                          ['saver', 'Эко'],
                          ['balanced', 'Баланс'],
                          ['performance', 'Макс'],
                        ] as const
                      ).map(([p, lbl]) => {
                        const isCur = powerPlan === p || (p === 'saver' && powerPlan === 'powersaver');
                        return (
                          <button
                            key={p}
                            onClick={() => (onSetPowerPlan ? onSetPowerPlan(p) : onTogglePowerSaver())}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                              isCur
                                ? 'bg-blue-600 border-blue-400 text-white'
                                : isDark
                                ? 'bg-white/[0.05] border-white/10 text-white/60'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            {lbl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {onPickAccentColor && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`flex items-center gap-1 ${subText}`}><Palette size={11} /> Быстрый акцент:</span>
                      <div className="flex items-center gap-1.5">
                        {ACCENT_SWATCHES.map((hex) => (
                          <button
                            key={hex}
                            onClick={() => onPickAccentColor(hex)}
                            className="w-4 h-4 rounded-full border border-white/30 hover:scale-115 transition cursor-pointer"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={subText}>Качество записи экрана:</span>
                    <div className="flex items-center gap-1">
                      {([1.2, 2.5, 5] as const).map((mbps) => (
                        <button
                          key={mbps}
                          onClick={() => setRecBitrateMbps(mbps)}
                          className={`px-1.5 py-0.5 rounded-md font-mono border transition cursor-pointer ${
                            recBitrateMbps === mbps
                              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                              : isDark
                              ? 'bg-white/[0.04] border-white/10 text-white/50'
                              : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                        >
                          {mbps === 1.2 ? 'Эко' : mbps === 2.5 ? 'Норм' : 'HD'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Luma OS 1.7 Oxygen: 1-Click SuperHub Bar (Oxygen Connect Android + Drop Shelf) */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      onOpenWindow('oxygen_connect');
                      onClose();
                    }}
                    className={`px-2.5 py-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                      isDark
                        ? 'bg-sky-500/10 border-sky-400/25 hover:bg-sky-500/20 text-sky-200'
                        : 'bg-sky-50 border-sky-200 hover:bg-sky-100 text-sky-900'
                    }`}
                    title="Открыть Oxygen Connect (Android SuperHub · QR-код)"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold truncate">📱 Oxygen Connect</div>
                      <div className={`text-[9px] truncate ${subText}`}>Android · QR · Камера→ПК</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('luma-toggle-shelf'));
                      onClose();
                    }}
                    className={`px-2.5 py-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                      isDark
                        ? 'bg-cyan-500/10 border-cyan-400/25 hover:bg-cyan-500/20 text-cyan-200'
                        : 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100 text-cyan-900'
                    }`}
                    title="Открыть полку Drag & Drop (Yoink / Dropzone · Ctrl+Alt+S)"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold truncate">📦 Полка Dropzone</div>
                      <div className={`text-[9px] truncate ${subText}`}>Пачка файлов · ZIP</div>
                    </div>
                  </button>
                </div>

                {/* Luma OS 1.7 Oxygen: Per-App Audio & Media Hub (KDE Plasma / PipeWire style!) */}
                <LumaPerAppAudioHub
                  isDark={isDark}
                  audioOutputs={audioOutputs as any}
                  activeAudioOutputId={activeAudioOutputId}
                  onSwitchAudioDevice={onSwitchAudioDevice}
                  mediaSessions={mediaSessions}
                  onMediaAction={onMediaAction}
                />

                {/* Audio Output / Input Switcher inside Hub */}
                {(audioOutputs.length > 0 || audioInputs.length > 0) && (
                  <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <button
                      onClick={() => setAudioCollapsed((c) => !c)}
                      className="w-full px-2.5 py-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-1.5">
                        <Speaker size={12} className="text-cyan-400" />
                        Звук · Вывод и Микрофон ({audioOutputs.length + audioInputs.length})
                      </span>
                      <ChevronRight size={12} className={`transition-transform ${!audioCollapsed ? 'rotate-90' : ''}`} />
                    </button>
                    {!audioCollapsed && (
                      <div className="px-2.5 pb-2.5 space-y-1.5">
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
                )}

                {/* Collapsible Bluetooth / 2.4GHz Peripherals Section */}
                {enabledFeatures.wirelessScanner && (
                  <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                      <button onClick={() => setBtCollapsed((c) => !c)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider flex-1 text-left">
                        <ChevronRight size={12} className={`transition-transform ${!btCollapsed ? 'rotate-90' : ''}`} />
                        <span>Устройства BT / 2.4GHz ({wirelessDevices.length})</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button onClick={onRefreshWireless} className={`p-1 rounded-lg ${subText} hover:text-cyan-400`} title="Опросить заряд мышек IO / Ajazz / Ardor / BT"><RefreshCw size={11} /></button>
                        <button onClick={() => setBtCollapsed((c) => !c)} className={`text-[10px] px-2 py-0.5 rounded-lg border ${isDark ? 'bg-white/[0.06] border-white/10 text-white/75' : 'bg-white border-slate-200 text-slate-600'}`}>
                          {btCollapsed ? 'Показать' : 'Скрыть'}
                        </button>
                      </div>
                    </div>
                    {!btCollapsed && (
                      <div className="px-2.5 pb-2.5 space-y-1.5">
                        {wirelessDevices.length === 0 ? (
                          <div className={`text-[10px] py-1 ${subText}`}>Нет обнаруженных беспроводных устройств</div>
                        ) : (
                          wirelessDevices.map((dev, i) => (
                            <div key={`${dev.name}-${i}`} className={`px-2 py-1.5 rounded-xl flex items-center justify-between gap-2 text-[11px] ${isDark ? 'bg-white/[0.04]' : 'bg-white border border-slate-200/70'}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                {renderWirelessIcon(dev.device_type)}
                                <div className="min-w-0">
                                  <div className="font-medium truncate leading-tight">{dev.name}</div>
                                  <div className={`text-[9px] truncate ${subText}`}>{dev.transport || '2.4GHz / BT'}</div>
                                </div>
                              </div>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${dev.battery_percent >= 0 ? (dev.battery_percent <= 20 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300') : 'bg-cyan-500/15 text-cyan-300'}`}>
                                {dev.battery_percent >= 0 ? `${dev.battery_percent}%` : 'Подкл.'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* LOWER HALF: Collapsible Unified Notification Center (Incoming Messenger Messages + OS) */}
        <div
          className={`pointer-events-auto rounded-3xl border backdrop-blur-2xl flex flex-col overflow-hidden transition-all duration-200 luma-anim-harmony7 ${glassSurface} ${
            notifCollapsed ? 'shrink-0' : 'flex-1 min-h-[190px]'
          }`}
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
