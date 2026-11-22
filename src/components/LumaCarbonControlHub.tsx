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
} from 'lucide-react';

export interface CarbonNotificationItem {
  id: string;
  source: 'telegram' | 'discord' | 'browser' | 'system';
  sender: string;
  title: string;
  body: string;
  time: string;
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

export type ControlHubTileId =
  | 'wifi'
  | 'bluetooth'
  | 'dnd'
  | 'theme'
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
  { id: 'wifi', label: 'Wi-Fi', desc: 'Сеть и интернет' },
  { id: 'bluetooth', label: 'Bluetooth', desc: 'Беспроводные модули' },
  { id: 'dnd', label: 'Не беспокоить', desc: 'Приглушить уведомления' },
  { id: 'theme', label: 'Тема', desc: 'Светлая / Тёмная' },
  { id: 'screenshot', label: 'Скриншот', desc: 'Компактный JPEG (~120 КБ)' },
  { id: 'recorder', label: 'Запись экрана', desc: 'Компактный WebM VP9' },
  { id: 'vault', label: 'Конфиденциальность', desc: 'Приватный стол AES-256' },
  { id: 'scenarios', label: 'Сценарии', desc: 'Если → То автоматизация' },
  { id: 'mouse_dpi', label: 'DPI мыши', desc: 'Скорость и чувствительность' },
  { id: 'island', label: 'Dynamic Island', desc: 'Живой остров сверху' },
  { id: 'dual_bar', label: 'Двойная панель', desc: 'Верх: утилиты, Низ: окна' },
  { id: 'trash', label: 'Корзина', desc: 'Удалённые файлы Luma' },
  { id: 'code_studio', label: 'Code Studio', desc: 'Редактор кода (VS Code)' },
  { id: 'cut_studio', label: 'Cut Studio', desc: 'Видеоредактор (CapCut)' },
  { id: 'power_saver', label: 'Энергосбережение', desc: 'План питания ОС' },
  { id: 'features_mgr', label: 'Функции ОС', desc: 'Вкл/Выкл модулей системы' },
];

export const DEFAULT_HUB_TILES: ControlHubTileId[] = [
  'wifi',
  'bluetooth',
  'dnd',
  'theme',
  'screenshot',
  'recorder',
  'vault',
  'scenarios',
  'mouse_dpi',
  'dual_bar',
  'trash',
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
  { key: 'ai', label: 'Luma AI Ассистент', desc: 'Локальная и облачная нейросеть' },
  { key: 'dynamicIsland', label: 'Dynamic Island', desc: 'Плавающий островок уведомлений и плеера' },
  { key: 'calendar', label: 'Календарь и задачи', desc: 'Месяц/Неделя/Повестка, Pomodoro и .ics' },
  { key: 'scenarios', label: 'Сценарии (Автоматизация)', desc: 'Правила «Если действие → результат»' },
  { key: 'codeStudio', label: 'Luma Code Studio', desc: 'Встроенная IDE для разработки' },
  { key: 'cutStudio', label: 'Luma Cut Studio', desc: 'Видеоредактор с таймлайном и экспортом' },
  { key: 'trash', label: 'Корзина Luma OS', desc: 'Системное хранилище удалённых файлов' },
  { key: 'wirelessScanner', label: 'Сканер BT / 2.4GHz', desc: 'Заряд мышек IO, Ajazz, Ardor, наушников' },
  { key: 'privateVault', label: 'Суперконфиденциальность', desc: 'Изолированный приватный рабочий стол' },
  { key: 'easterEgg', label: 'Мини-игра Пасхалка', desc: 'Секретная игра в разделе «О системе»' },
];

interface LumaCarbonControlHubProps {
  open: boolean;
  isDark: boolean;
  onClose: () => void;
  // System state
  wifiConnected: boolean;
  wifiName: string;
  bluetoothEnabled: boolean;
  onToggleBluetooth: () => void;
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
}

const HUB_TILES_KEY = 'luma_carbon_hub_tiles_v15';
const HUB_BT_COLLAPSED_KEY = 'luma_bt_section_collapsed_v15';

export const LumaCarbonControlHub: React.FC<LumaCarbonControlHubProps> = ({
  open,
  isDark,
  onClose,
  wifiConnected,
  wifiName,
  bluetoothEnabled,
  onToggleBluetooth,
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
  const [btCollapsed, setBtCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HUB_BT_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [notifTab, setNotifTab] = useState<'all' | 'telegram' | 'system'>('all');

  // Compact Screen Recorder & Screenshot state
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recBitrateMbps, setRecBitrateMbps] = useState<1.2 | 2.5 | 5>(1.2);
  const [captureBanner, setCaptureBanner] = useState('');
  const [lastCapturePath, setLastCapturePath] = useState('');
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
    if (!recording) return;
    const t = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [recording]);

  // Compact Screenshot: native Win32 GDI32 JPEG (~120 KB) with automatic browser getDisplayMedia fallback!
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
      // Browser fallback (Linux / headless / WebView)
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 15 },
          audio: false,
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        await new Promise((r) => setTimeout(r, 150));
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
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
      }
      setCaptureBanner('Не удалось захватить экран в текущем режиме браузера');
    } catch {
      setCaptureBanner('Захват экрана отменён пользователем');
    }
  }, [onAddNotification]);

  // Compact Screen Recorder (VP9/VP8 low bitrate ~9 MB/min)
  const stopRecording = useCallback(() => {
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
  }, []);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setCaptureBanner('Запись экрана требует разрешения захвата экрана');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
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
            // Fallback browser download
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

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopRecording();
      });

      setRecSeconds(0);
      setRecording(true);
      rec.start(1000);
      setCaptureBanner(`Идёт компактная запись (${recBitrateMbps} Мбит/с)...`);
    } catch {
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
    if (notifTab === 'telegram') return n.source === 'telegram' || n.source === 'discord';
    return n.source === 'system' || n.source === 'browser';
  });

  if (!open && !recording) return null;

  // When closed but still recording, show a sleek floating mini REC pill in top-right!
  if (!open && recording) {
    const mm = String(Math.floor(recSeconds / 60)).padStart(2, '0');
    const ss = String(recSeconds % 60).padStart(2, '0');
    return (
      <div className="fixed top-3 right-4 z-[980] flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600/95 text-white text-xs font-semibold shadow-2xl border border-rose-300/40 backdrop-blur-xl">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="font-mono">REC {mm}:{ss}</span>
        <button
          onClick={stopRecording}
          className="ml-1 px-2 py-0.5 rounded-full bg-black/30 hover:bg-black/50 flex items-center gap-1 text-[10px]"
        >
          <Square size={9} fill="currentColor" /> Стоп
        </button>
      </div>
    );
  }

  const glassSurface = isDark
    ? 'bg-[#0c0e14]/88 border-white/14 text-white shadow-[0_24px_70px_rgba(0,0,0,0.65)]'
    : 'bg-white/88 border-slate-300/80 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.18)]';
  const subText = isDark ? 'text-white/55' : 'text-slate-500';

  const renderTileCard = (id: ControlHubTileId, idx: number) => {
    let icon: React.ReactNode = <Sparkles size={14} />;
    let label = '';
    let sub = '';
    let active = false;
    let onClick = () => {};

    switch (id) {
      case 'wifi':
        icon = <Wifi size={14} />;
        label = 'Wi-Fi';
        sub = wifiConnected ? wifiName || 'Онлайн' : 'Нет сети';
        active = wifiConnected;
        onClick = () => onOpenWindow('settings');
        break;
      case 'bluetooth':
        icon = <Bluetooth size={14} />;
        label = 'Bluetooth';
        sub = bluetoothEnabled ? 'Включён' : 'Выкл';
        active = bluetoothEnabled;
        onClick = onToggleBluetooth;
        break;
      case 'dnd':
        icon = dnd ? <BellOff size={14} /> : <Bell size={14} />;
        label = 'Тишина';
        sub = dnd ? 'Не беспокоить' : 'Уведомления';
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
        sub = `${recBitrateMbps} Мбит/с`;
        active = recording;
        onClick = () => (recording ? stopRecording() : void startRecording());
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
        sub = 'VS Studio';
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
        sub = powerPlan === 'powersaver' ? 'Включён' : 'Баланс';
        active = powerPlan === 'powersaver';
        onClick = onTogglePowerSaver;
        break;
      case 'features_mgr':
        icon = <Sliders size={14} />;
        label = 'Функции';
        sub = 'Модули ОС';
        active = showFeaturesModal;
        onClick = () => setShowFeaturesModal((v) => !v);
        break;
    }

    return (
      <div
        key={id}
        onClick={() => !editMode && onClick()}
        className={`relative p-2.5 rounded-2xl border transition cursor-pointer select-none flex flex-col justify-between min-h-[62px] ${
          id === 'recorder' && recording
            ? 'bg-rose-500/25 border-rose-400/60 text-rose-100 animate-pulse'
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveTile(idx, -1);
              }}
              className="p-0.5 rounded bg-black/50 text-white hover:bg-cyan-500"
              title="Влево/Вверх"
            >
              <ChevronUp size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveTile(idx, 1);
              }}
              className="p-0.5 rounded bg-black/50 text-white hover:bg-cyan-500"
              title="Вправо/Вниз"
            >
              <ChevronDown size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTileInDeck(id);
              }}
              className="p-0.5 rounded bg-rose-500/80 text-white hover:bg-rose-500"
              title="Убрать плитку"
            >
              <X size={10} />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className={active ? 'text-cyan-400' : subText}>{icon}</span>
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

  return (
    <>
      {/* Subtle click-away backdrop */}
      <div className="fixed inset-0 z-[940]" onClick={onClose} />

      {/* Top-Right Carbon Control Hub (1/4 Screen Width × 1/2 Height) + Unified Notification Center Below */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed top-3 right-3 bottom-3 z-[945] flex flex-col gap-2.5 pointer-events-none"
        style={{ width: 'clamp(330px, 25vw, 430px)' }}
      >
        {/* UPPER HALF (~50vh): Fully Editable Carbon Control Deck */}
        <div
          className={`pointer-events-auto rounded-3xl border backdrop-blur-2xl flex flex-col overflow-hidden luma-anim-harmony7 ${glassSurface}`}
          style={{ height: '50vh', minHeight: 330 }}
        >
          {/* Header */}
          <div
            className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <span className="text-xs font-bold tracking-tight truncate">Панель управления Carbon</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md border ${
                  isDark ? 'bg-white/[0.06] border-white/10 text-white/60' : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                TAB
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditMode((v) => !v);
                  setShowFeaturesModal(false);
                }}
                className={`px-2 py-1 rounded-xl text-[10px] font-semibold flex items-center gap-1 border transition ${
                  editMode
                    ? 'bg-emerald-500 text-black border-emerald-400'
                    : isDark
                    ? 'bg-white/[0.06] border-white/10 hover:bg-white/12'
                    : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {editMode ? <Check size={11} /> : <Pencil size={11} />}
                {editMode ? 'Готово' : 'Редакт.'}
              </button>
              <button
                onClick={onClose}
                className={`p-1 rounded-xl ${subText} hover:opacity-100`}
                title="Закрыть (Tab / Esc)"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Scrollable Control Deck Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {showFeaturesModal ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-cyan-400">
                    Менеджер функций Luma OS 1.5
                  </span>
                  <button
                    onClick={() => setShowFeaturesModal(false)}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/15"
                  >
                    Назад
                  </button>
                </div>
                {SYSTEM_FEATURE_META.map((feat) => {
                  const on = enabledFeatures[feat.key];
                  return (
                    <button
                      key={feat.key}
                      onClick={() => onToggleFeature(feat.key)}
                      className={`w-full p-2 rounded-xl border flex items-center justify-between gap-2 text-left transition ${
                        isDark
                          ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate">{feat.label}</div>
                        <div className={`text-[9px] truncate ${subText}`}>{feat.desc}</div>
                      </div>
                      {on ? (
                        <ToggleRight size={20} className="text-emerald-400 shrink-0" />
                      ) : (
                        <ToggleLeft size={20} className="text-white/30 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Editable Tiles Grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {tiles.map((t, idx) => renderTileCard(t, idx))}
                </div>

                {/* Add hidden tiles when in Edit Mode */}
                {editMode && (
                  <div
                    className={`p-2.5 rounded-2xl border space-y-1.5 ${
                      isDark ? 'bg-cyan-500/[0.06] border-cyan-400/25' : 'bg-cyan-50 border-cyan-200'
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-cyan-400">
                      Добавить плитки в панель управления:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ALL_HUB_TILES.filter((x) => !tiles.includes(x.id)).map((x) => (
                        <button
                          key={x.id}
                          onClick={() => toggleTileInDeck(x.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium border flex items-center gap-1 ${
                            isDark
                              ? 'bg-white/[0.06] border-white/10 hover:bg-white/15'
                              : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Plus size={10} />
                          {x.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compact Recording Bitrate & Last Capture Banner */}
                {(captureBanner || recording) && (
                  <div
                    className={`px-2.5 py-2 rounded-xl border text-[10px] flex items-center justify-between gap-2 ${
                      isDark ? 'bg-emerald-500/10 border-emerald-400/25 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <span className="truncate">{captureBanner}</span>
                    {lastCapturePath && (
                      <button
                        onClick={() =>
                          fetch('/api/kernel/open-path', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path: lastCapturePath }),
                          })
                        }
                        className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 flex items-center gap-1"
                        title="Открыть файл"
                      >
                        <FolderOpen size={10} /> Открыть
                      </button>
                    )}
                  </div>
                )}

                {/* Recording Quality Selector */}
                <div className="flex items-center justify-between text-[10px] px-1">
                  <span className={subText}>Качество записи экрана:</span>
                  <div className="flex items-center gap-1">
                    {([1.2, 2.5, 5] as const).map((mbps) => (
                      <button
                        key={mbps}
                        onClick={() => setRecBitrateMbps(mbps)}
                        className={`px-1.5 py-0.5 rounded-md font-mono border transition ${
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

                {/* Volume & Brightness Sliders */}
                <div
                  className={`p-2.5 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={onToggleMute} className={subText} title="Вкл/Выкл звук">
                      {muted || volume === 0 ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-cyan-400" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={muted ? 0 : volume}
                      onChange={(e) => onVolumeChange(Number(e.target.value))}
                      className="flex-1 h-1.5 accent-cyan-400 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono w-7 text-right">{muted ? 0 : volume}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun size={14} className="text-amber-400" />
                    <input
                      type="range"
                      min={30}
                      max={100}
                      value={brightness}
                      onChange={(e) => onBrightnessChange(Number(e.target.value))}
                      className="flex-1 h-1.5 accent-amber-400 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono w-7 text-right">{brightness}%</span>
                  </div>
                </div>

                {/* Collapsible Bluetooth / 2.4GHz Peripherals Section (IO Nova SE, Ajazz, Ardor Gaming...) */}
                {enabledFeatures.wirelessScanner && (
                  <div
                    className={`rounded-2xl border overflow-hidden ${
                      isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setBtCollapsed((c) => !c)}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider flex-1 text-left"
                      >
                        <ChevronRight
                          size={12}
                          className={`transition-transform ${!btCollapsed ? 'rotate-90' : ''}`}
                        />
                        <span>Устройства BT / 2.4GHz ({wirelessDevices.length})</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={onRefreshWireless}
                          className={`p-1 rounded-lg ${subText} hover:text-cyan-400`}
                          title="Опросить заряд мышек IO / Ajazz / Ardor / BT"
                        >
                          <RefreshCw size={11} />
                        </button>
                        <button
                          onClick={() => setBtCollapsed((c) => !c)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border ${
                            isDark ? 'bg-white/[0.06] border-white/10 text-white/75' : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {btCollapsed ? 'Показать' : 'Скрыть'}
                        </button>
                      </div>
                    </div>

                    {!btCollapsed && (
                      <div className="px-2.5 pb-2.5 space-y-1.5">
                        {wirelessDevices.length === 0 ? (
                          <div className={`text-[10px] py-1 ${subText}`}>
                            Нет обнаруженных беспроводных устройств
                          </div>
                        ) : (
                          wirelessDevices.map((dev, i) => (
                            <div
                              key={`${dev.name}-${i}`}
                              className={`px-2 py-1.5 rounded-xl flex items-center justify-between gap-2 text-[11px] ${
                                isDark ? 'bg-white/[0.04]' : 'bg-white border border-slate-200/70'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {renderWirelessIcon(dev.device_type)}
                                <div className="min-w-0">
                                  <div className="font-medium truncate leading-tight">{dev.name}</div>
                                  <div className={`text-[9px] truncate ${subText}`}>
                                    {dev.transport || '2.4GHz / BT'}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  dev.battery_percent >= 0
                                    ? dev.battery_percent <= 20
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-cyan-500/15 text-cyan-300'
                                }`}
                              >
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

        {/* LOWER HALF (~44vh): Unified Notification Center (Telegram + System + All Apps) */}
        <div
          className={`pointer-events-auto flex-1 min-h-[210px] rounded-3xl border backdrop-blur-2xl flex flex-col overflow-hidden luma-anim-harmony7 ${glassSurface}`}
        >
          <div
            className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-cyan-400" />
              <span className="text-xs font-bold">Центр уведомлений</span>
              {notifications.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  {notifications.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  onAddNotification({
                    source: 'telegram',
                    sender: 'Telegram',
                    title: 'Новое сообщение',
                    body: 'Luma OS 1.5 Carbon — уведомления Telegram подключены в единый центр!',
                    unread: true,
                  })
                }
                className={`px-2 py-0.5 rounded-lg text-[10px] border transition ${
                  isDark ? 'bg-sky-500/15 border-sky-400/25 text-sky-300 hover:bg-sky-500/25' : 'bg-sky-50 border-sky-200 text-sky-700'
                }`}
                title="Тест уведомления Telegram"
              >
                <Send size={9} className="inline mr-1" />
                TG
              </button>
              {notifications.length > 0 && (
                <button
                  onClick={onClearNotifications}
                  className={`text-[10px] px-2 py-0.5 rounded-lg ${subText} hover:text-rose-400`}
                >
                  Очистить
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-3 pt-2 pb-1 flex items-center gap-1 shrink-0">
            {(
              [
                ['all', 'Все'],
                ['telegram', 'Telegram / Чаты'],
                ['system', 'Система'],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setNotifTab(k)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold transition ${
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

          {/* Notification Feed */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {filteredNotifs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6">
                <Bell size={22} className="opacity-25 mb-1.5" />
                <div className={`text-xs font-medium ${subText}`}>Уведомлений пока нет</div>
                <div className={`text-[10px] opacity-60 mt-0.5 ${subText}`}>
                  Сообщения Telegram, события сценариев и системы появятся здесь
                </div>
              </div>
            ) : (
              filteredNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`group p-2.5 rounded-2xl border transition relative ${
                    isDark
                      ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <button
                    onClick={() => onDismissNotification(n.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-white/15"
                  >
                    <X size={11} />
                  </button>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {n.source === 'telegram' ? (
                      <Send size={11} className="text-sky-400" />
                    ) : n.source === 'discord' ? (
                      <MessageCircle size={11} className="text-indigo-400" />
                    ) : (
                      <Download size={11} className="text-emerald-400" />
                    )}
                    <span className="text-[10px] font-bold text-cyan-400">{n.sender}</span>
                    <span className={`text-[9px] font-mono ml-auto pr-4 ${subText}`}>{n.time}</span>
                  </div>
                  <div className="text-[11px] font-semibold leading-snug">{n.title}</div>
                  <div className={`text-[10px] leading-relaxed mt-0.5 ${subText}`}>{n.body}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};
