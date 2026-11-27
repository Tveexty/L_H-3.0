import React, { useRef, useState } from 'react';
import {
  Activity,
  BellOff,
  Bluetooth,
  Calculator,
  Calendar,
  Camera,
  Cast,
  Clipboard,
  Code2,
  Cpu,
  FileText,
  Film,
  Flame,
  FolderOpen,
  Gamepad2,
  Image as ImageIcon,
  Layers,
  Lock,
  Mic,
  MicOff,
  Minus,
  Moon,
  MousePointer2,
  Palette,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  ScanSearch,
  Share2,
  Shield,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  Speaker,
  Square,
  Sun,
  SunMoon,
  Terminal,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  Wifi,
  Zap,
} from 'lucide-react';
import {
  BluetoothDeviceItem,
  BluetoothStatusSnapshot,
  LumaBluetoothPickerPanel,
  LumaWifiPickerPanel,
  WifiStatusSnapshot,
} from './LumaConnectivityPicker';
import type { MediaPlayerSessionMini } from './LumaPerAppAudioHub';
import type { WirelessDeviceItem } from './LumaCarbonControlHub';
import {
  blockGridClass,
  getAllowedSizes,
  hexToRgba,
  OneUIPanelBlock,
  OneUIPanelState,
} from './LumaOneUIPanelEngine';

export interface LumaOneUIGridBodyProps {
  isDark: boolean;
  subText: string;
  editMode: boolean;
  onSetEditMode: (v: boolean) => void;
  onOpenVisualStudio: () => void;
  panelState: OneUIPanelState;
  effectiveAccent: string;
  onReorderBlock: (fromIdx: number, toIdx: number) => void;
  onRemoveBlock: (id: string) => void;
  onAddBlock: (id: string) => void;
  onResizeBlock: (id: string) => void;
  onResetLayout: () => void;
  onDraggingChange?: (dragging: boolean) => void;
  // Connectivity & pickers
  wifiConnected: boolean;
  wifiEnabled: boolean;
  wifiName: string;
  wifiStatus: WifiStatusSnapshot | null;
  wifiLoading: boolean;
  onToggleWifi?: (enabled?: boolean) => void;
  onRefreshWifi?: (rescan?: boolean) => void;
  onConnectWifi?: (
    ssid: string,
    password?: string
  ) => Promise<{ ok: boolean; needs_password?: boolean; message?: string; error?: string }>;
  onDisconnectWifi?: () => Promise<void>;
  bluetoothEnabled: boolean;
  bluetoothStatus: BluetoothStatusSnapshot | null;
  bluetoothLoading: boolean;
  onToggleBluetooth: (enabled?: boolean) => void;
  onRefreshBluetooth?: (activeScan?: boolean) => void;
  onBluetoothDeviceAction?: (
    dev: BluetoothDeviceItem,
    action: 'connect' | 'disconnect' | 'pair',
    pin?: string
  ) => Promise<{ ok: boolean; needs_pin?: boolean; message?: string; error?: string }>;
  wirelessDevices: WirelessDeviceItem[];
  activeConnectivityPicker: 'none' | 'wifi' | 'bluetooth';
  onSetActiveConnectivityPicker: (v: 'none' | 'wifi' | 'bluetooth') => void;
  // System controls
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
  nightLightLevel: number;
  onNightLightChange?: (level: number) => void;
  gamingBoost: boolean;
  onToggleGamingBoost?: () => void;
  micMuted: boolean;
  onToggleMicMute?: () => void;
  mediaSessions: MediaPlayerSessionMini[];
  onMediaAction?: (action: string, sessionId?: string) => void;
  trashCount: number;
  liveCpuPercent: number;
  liveRamPercent: number;
  liveGpuName: string;
  recording: boolean;
  recSeconds: number;
  captureBanner: string;
  lastCapturePath: string;
  onTakeScreenshot: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  showFeaturesModal: boolean;
  showMiracastModal: boolean;
  showPerAppAudioModal: boolean;
  onOpenFeaturesModal: () => void;
  onOpenMediaModal: () => void;
  onOpenMiracastModal: () => void;
  onOpenPerAppAudioModal: () => void;
  onCloseHub: () => void;
  onOpenWindow: (winId: string) => void;
  onOpenVault: () => void;
  onOpenMouseSettings: () => void;
  onOpenLens?: () => void;
  onLaunchPowerShell?: (admin?: boolean) => void;
  onLockScreen?: () => void;
}

interface OneUIModuleDef {
  id: string;
  label: string;
  status?: string;
  cat: 'widgets' | 'controls' | 'apps';
  active: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const computeHorizontalPct = (clientX: number, el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  if (r.width <= 0) return 0;
  return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
};

const computeVerticalPct = (clientY: number, el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  if (r.height <= 0) return 0;
  return Math.max(0, Math.min(1, (r.bottom - clientY) / r.height));
};

export const LumaOneUIGridBody: React.FC<LumaOneUIGridBodyProps> = (props) => {
  const {
    isDark,
    subText,
    editMode,
    onSetEditMode,
    onOpenVisualStudio,
    panelState,
    effectiveAccent,
    onReorderBlock,
    onRemoveBlock,
    onAddBlock,
    onResizeBlock,
    onResetLayout,
    onDraggingChange,
    wifiConnected,
    wifiEnabled,
    wifiName,
    wifiStatus,
    wifiLoading,
    onToggleWifi,
    onRefreshWifi,
    onConnectWifi,
    onDisconnectWifi,
    bluetoothEnabled,
    bluetoothStatus,
    bluetoothLoading,
    onToggleBluetooth,
    onRefreshBluetooth,
    onBluetoothDeviceAction,
    wirelessDevices,
    activeConnectivityPicker,
    onSetActiveConnectivityPicker,
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
    nightLightLevel,
    onNightLightChange,
    gamingBoost,
    onToggleGamingBoost,
    micMuted,
    onToggleMicMute,
    mediaSessions,
    onMediaAction,
    trashCount,
    liveCpuPercent,
    liveRamPercent,
    liveGpuName,
    recording,
    recSeconds,
    captureBanner,
    lastCapturePath,
    onTakeScreenshot,
    onStartRecording,
    onStopRecording,
    showFeaturesModal,
    showMiracastModal,
    showPerAppAudioModal,
    onOpenFeaturesModal,
    onOpenMediaModal,
    onOpenMiracastModal,
    onOpenPerAppAudioModal,
    onCloseHub,
    onOpenWindow,
    onOpenVault,
    onOpenMouseSettings,
    onOpenLens,
    onLaunchPowerShell,
    onLockScreen,
  } = props;

  const [drawerTab, setDrawerTab] = useState<'all' | 'widgets' | 'controls' | 'apps'>('all');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragStartRef = useRef<{ idx: number; x: number; y: number; moved: boolean } | null>(null);
  const longPressRef = useRef<number | null>(null);
  const sliderDragRef = useRef(false);

  const vis = panelState.visual;
  const primaryMedia = mediaSessions.find((s) => s.is_playing) || mediaSessions[0];
  const activeBtDev =
    bluetoothStatus?.devices?.find((d) => d.connected)?.name ||
    wirelessDevices.find((w) => w.connected)?.name ||
    (bluetoothEnabled ? 'Bluetooth вкл.' : 'Выкл.');

  const tileAlpha = Math.max(0.24, Math.min(0.92, (vis.opacity / 100) * 0.88));
  const tileSurfaceStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: `${vis.radiusPx}px`,
    backgroundColor: active
      ? hexToRgba(effectiveAccent, isDark ? 0.88 : 0.92)
      : isDark
      ? `rgba(34, 40, 54, ${tileAlpha.toFixed(2)})`
      : `rgba(241, 245, 252, ${Math.min(0.95, tileAlpha + 0.08).toFixed(2)})`,
    borderColor: active
      ? hexToRgba(effectiveAccent, 0.95)
      : vis.syncWithTheme
      ? hexToRgba(effectiveAccent, isDark ? 0.24 : 0.22)
      : isDark
      ? 'rgba(255,255,255,0.11)'
      : 'rgba(148,163,184,0.28)',
    boxShadow: active ? `0 8px 22px ${hexToRgba(effectiveAccent, 0.36)}` : undefined,
  });

  const MODULE_CATALOG: OneUIModuleDef[] = [
    {
      id: 'wifi',
      label: wifiName || 'Wi-Fi',
      status: wifiConnected ? 'Подключено' : wifiEnabled ? 'Включено' : 'Выкл.',
      cat: 'widgets',
      active: Boolean(wifiEnabled || wifiConnected),
      icon: <Wifi size={16} />,
      onClick: () => onToggleWifi?.(!wifiEnabled),
      onContextMenu: (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSetActiveConnectivityPicker(activeConnectivityPicker === 'wifi' ? 'none' : 'wifi');
        onRefreshWifi?.(true);
      },
    },
    {
      id: 'bluetooth',
      label: 'Bluetooth',
      status: activeBtDev,
      cat: 'widgets',
      active: bluetoothEnabled,
      icon: <Bluetooth size={16} />,
      onClick: () => onToggleBluetooth(!bluetoothEnabled),
      onContextMenu: (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSetActiveConnectivityPicker(activeConnectivityPicker === 'bluetooth' ? 'none' : 'bluetooth');
        onRefreshBluetooth?.(true);
      },
    },
    {
      id: 'media',
      label: 'Медиаплеер',
      status: primaryMedia?.title || 'Пауза',
      cat: 'widgets',
      active: Boolean(primaryMedia?.is_playing),
      icon: <Speaker size={16} />,
      onClick: onOpenMediaModal,
    },
    {
      id: 'brightness',
      label: 'Яркость',
      status: `${brightness}%`,
      cat: 'widgets',
      active: false,
      icon: <Sun size={16} />,
    },
    {
      id: 'volume',
      label: 'Громкость',
      status: muted ? 'MUTE' : `${volume}%`,
      cat: 'widgets',
      active: false,
      icon: muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />,
    },
    {
      id: 'sys_monitor',
      label: 'Монитор ПК',
      status: `CPU ${Math.round(liveCpuPercent)}% · RAM ${Math.round(liveRamPercent)}%`,
      cat: 'widgets',
      active: false,
      icon: <Activity size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('taskmgr');
      },
    },
    {
      id: 'power_plan',
      label: 'План питания',
      status: powerPlan === 'performance' ? 'Макс' : powerPlan === 'saver' || powerPlan === 'powersaver' ? 'Эко' : 'Баланс',
      cat: 'widgets',
      active: powerPlan === 'performance',
      icon: <Zap size={16} />,
    },
    {
      id: 'superdevice',
      label: 'Суперустройство',
      status: 'Экосистема',
      cat: 'widgets',
      active: false,
      icon: <Radio size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('superdevice');
      },
    },
    {
      id: 'oxygen_connect',
      label: 'Oxygen Connect',
      status: 'Android · QR',
      cat: 'widgets',
      active: false,
      icon: <Share2 size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('oxygen_connect');
      },
    },
    {
      id: 'drop_shelf',
      label: 'Полка Dropzone',
      status: 'Drag & Drop',
      cat: 'widgets',
      active: false,
      icon: <Layers size={16} />,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('luma-toggle-shelf'));
        onCloseHub();
      },
    },
    {
      id: 'dnd',
      label: 'Не беспокоить',
      status: dnd ? 'Вкл.' : 'Выкл.',
      cat: 'controls',
      active: dnd,
      icon: dnd ? <BellOff size={16} /> : <Moon size={16} />,
      onClick: onToggleDnd,
    },
    {
      id: 'per_app_audio',
      label: 'Звук ПО',
      status: 'Микшер',
      cat: 'controls',
      active: showPerAppAudioModal,
      icon: <Speaker size={16} />,
      onClick: onOpenPerAppAudioModal,
    },
    {
      id: 'miracast',
      label: '2-й экран',
      status: 'Miracast',
      cat: 'controls',
      active: showMiracastModal,
      icon: <Cast size={16} />,
      onClick: onOpenMiracastModal,
    },
    {
      id: 'lock_screen',
      label: 'Блокировка',
      status: 'Win + L',
      cat: 'controls',
      active: false,
      icon: <Lock size={16} />,
      onClick: () => {
        onCloseHub();
        if (onLockScreen) {
          onLockScreen();
        } else {
          window.dispatchEvent(new CustomEvent('luma-win-l-lock', { detail: { source: 'hub' } }));
        }
      },
    },
    {
      id: 'shot',
      label: 'Скриншот',
      status: 'Снимок',
      cat: 'controls',
      active: false,
      icon: <Camera size={16} />,
      onClick: onTakeScreenshot,
    },
    {
      id: 'rec',
      label: recording ? `${Math.floor(recSeconds / 60)}:${String(recSeconds % 60).padStart(2, '0')}` : 'Запись',
      status: recording ? 'Идёт запись' : 'Видео AVI',
      cat: 'controls',
      active: recording,
      icon: recording ? <Square size={15} /> : <Video size={16} />,
      onClick: () => (recording ? onStopRecording() : onStartRecording()),
    },
    {
      id: 'lens',
      label: 'Обвести',
      status: 'Поиск',
      cat: 'controls',
      active: false,
      icon: <ScanSearch size={16} />,
      onClick: () => {
        onCloseHub();
        if (onOpenLens) {
          onOpenLens();
        } else {
          window.dispatchEvent(new CustomEvent('luma-circle-search-open', { detail: { preCaptured: false } }));
        }
      },
    },
    {
      id: 'eye',
      label: 'Ночь',
      status: nightLightLevel > 0 ? `${nightLightLevel}%` : 'Выкл.',
      cat: 'controls',
      active: nightLightLevel > 0,
      icon: <SunMoon size={16} />,
      onClick: () => onNightLightChange?.(nightLightLevel > 0 ? 0 : 45),
    },
    {
      id: 'game',
      label: 'Игра',
      status: gamingBoost ? 'Ускорен' : 'Обычный',
      cat: 'controls',
      active: gamingBoost,
      icon: <Flame size={16} />,
      onClick: () => onToggleGamingBoost?.(),
    },
    {
      id: 'mic',
      label: 'Микрофон',
      status: micMuted ? 'Выкл.' : 'Активен',
      cat: 'controls',
      active: micMuted,
      icon: micMuted ? <MicOff size={16} /> : <Mic size={16} />,
      onClick: () => onToggleMicMute?.(),
    },
    {
      id: 'mute',
      label: muted ? 'Без звука' : 'Звук',
      status: muted ? 'Выкл.' : `${volume}%`,
      cat: 'controls',
      active: muted,
      icon: muted ? <VolumeX size={16} /> : <Volume2 size={16} />,
      onClick: onToggleMute,
    },
    {
      id: 'island',
      label: 'Остров',
      status: dynamicIslandEnabled ? 'Вкл.' : 'Выкл.',
      cat: 'controls',
      active: dynamicIslandEnabled,
      icon: <Sparkles size={16} />,
      onClick: onToggleIsland,
    },
    {
      id: 'shield',
      label: 'Защита',
      status: 'LumaShield',
      cat: 'controls',
      active: false,
      icon: <ShieldCheck size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('security');
      },
    },
    {
      id: 'vault',
      label: 'Сейф',
      status: 'AES-256',
      cat: 'controls',
      active: false,
      icon: <Shield size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenVault();
      },
    },
    {
      id: 'theme',
      label: isDark ? 'Тёмная' : 'Светлая',
      status: 'Тема',
      cat: 'controls',
      active: !isDark,
      icon: <Sun size={16} />,
      onClick: onToggleTheme,
    },
    {
      id: 'dual_bar',
      label: '2 панели',
      status: dualTaskbarMode ? 'Вкл.' : 'Выкл.',
      cat: 'controls',
      active: dualTaskbarMode,
      icon: <Layers size={16} />,
      onClick: onToggleDualTaskbar,
    },
    {
      id: 'feats',
      label: 'Функции',
      status: 'Модули ОС',
      cat: 'controls',
      active: showFeaturesModal,
      icon: <Sliders size={16} />,
      onClick: onOpenFeaturesModal,
    },
    {
      id: 'mouse_dpi',
      label: 'DPI мыши',
      status: 'Сенсор',
      cat: 'controls',
      active: false,
      icon: <MousePointer2 size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenMouseSettings();
      },
    },
    {
      id: 'explorer',
      label: 'Проводник',
      status: 'Файлы',
      cat: 'apps',
      active: false,
      icon: <FolderOpen size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('explorer');
      },
    },
    {
      id: 'office',
      label: 'Luma Office',
      status: 'Документы',
      cat: 'apps',
      active: false,
      icon: <FileText size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('office');
      },
    },
    {
      id: 'photo',
      label: 'Фотостудия',
      status: 'Редактор',
      cat: 'apps',
      active: false,
      icon: <ImageIcon size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('photo_editor');
      },
    },
    {
      id: 'powershell',
      label: 'PowerShell',
      status: 'Консоль',
      cat: 'apps',
      active: false,
      icon: <Terminal size={16} />,
      onClick: () => {
        onCloseHub();
        if (onLaunchPowerShell) {
          onLaunchPowerShell(false);
        } else {
          fetch('/api/kernel/shell/powershell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin: false }),
          }).catch(() => {});
        }
      },
    },
    {
      id: 'terminal',
      label: 'Терминал',
      status: 'Luma Shell',
      cat: 'apps',
      active: false,
      icon: <Terminal size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('terminal');
      },
    },
    {
      id: 'calculator',
      label: 'Калькулятор',
      status: 'Утилита',
      cat: 'apps',
      active: false,
      icon: <Calculator size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('calculator');
      },
    },
    {
      id: 'calendar',
      label: 'Календарь',
      status: 'События',
      cat: 'apps',
      active: false,
      icon: <Calendar size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('calendar');
      },
    },
    {
      id: 'clipboard',
      label: 'Буфер',
      status: 'История',
      cat: 'apps',
      active: false,
      icon: <Clipboard size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('clipboard');
      },
    },
    {
      id: 'ai',
      label: 'Luma AI',
      status: 'Ассистент',
      cat: 'apps',
      active: false,
      icon: <Sparkles size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('ai');
      },
    },
    {
      id: 'code_studio',
      label: 'Code Studio',
      status: 'IDE',
      cat: 'apps',
      active: false,
      icon: <Code2 size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('code_studio');
      },
    },
    {
      id: 'cut_studio',
      label: 'Cut Studio',
      status: 'Видео',
      cat: 'apps',
      active: false,
      icon: <Film size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('cut_studio');
      },
    },
    {
      id: 'gamepad',
      label: 'Геймпад',
      status: 'Контроллер',
      cat: 'apps',
      active: false,
      icon: <Gamepad2 size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('gamepad');
      },
    },
    {
      id: 'uninstaller',
      label: 'Очистка ПО',
      status: 'Деинстал.',
      cat: 'apps',
      active: false,
      icon: <Cpu size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('uninstaller');
      },
    },
    {
      id: 'trash',
      label: `Корзина${trashCount > 0 ? ` (${trashCount})` : ''}`,
      status: 'Файлы',
      cat: 'apps',
      active: false,
      icon: <Trash2 size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('trash');
      },
    },
    {
      id: 'scenarios',
      label: 'Сценарии',
      status: 'Автомат.',
      cat: 'apps',
      active: false,
      icon: <Zap size={16} />,
      onClick: () => {
        onCloseHub();
        onOpenWindow('scenarios');
      },
    },
  ];

  const catalogMap = new Map(MODULE_CATALOG.map((m) => [m.id, m]));
  const activeIds = new Set(panelState.blocks.map((b) => b.id));
  const hiddenModules = MODULE_CATALOG.filter(
    (m) => !activeIds.has(m.id) && (drawerTab === 'all' || m.cat === drawerTab)
  );

  const renderBlockInner = (blk: OneUIPanelBlock, def: OneUIModuleDef) => {
    const sz = blk.size;

    if (blk.id === 'media') {
      const isTall = sz === '2x2' || sz === '4x2';
      return (
        <div
          onClick={() => !editMode && onOpenMediaModal()}
          onWheel={(e) => {
            if (editMode) return;
            e.preventDefault();
            onMediaAction?.(e.deltaY > 0 ? 'next' : 'prev', primaryMedia?.source_app || primaryMedia?.id);
          }}
          className="w-full h-full p-2.5 flex flex-col justify-between cursor-pointer"
          title="Нажмите для полного плеера и перемотки · Колесо: треки"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/15"
              style={{ backgroundColor: hexToRgba(effectiveAccent, 0.3) }}
            >
              <Speaker size={15} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold truncate leading-tight">
                {primaryMedia?.title || 'Медиа на паузе'}
              </div>
              <div className={`text-[9px] truncate ${subText}`}>
                {primaryMedia?.artist || primaryMedia?.display_name || 'Плеер ПК'}
              </div>
            </div>
          </div>
          {isTall && (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-around pt-1">
              <button
                type="button"
                onClick={() => !editMode && onMediaAction?.('prev', primaryMedia?.source_app || primaryMedia?.id)}
                className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer"
              >
                <SkipBack size={14} />
              </button>
              <button
                type="button"
                onClick={() => !editMode && onMediaAction?.('playpause', primaryMedia?.source_app || primaryMedia?.id)}
                className="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer shadow-md"
                style={{ backgroundColor: effectiveAccent }}
              >
                {primaryMedia?.is_playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => !editMode && onMediaAction?.('next', primaryMedia?.source_app || primaryMedia?.id)}
                className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer"
              >
                <SkipForward size={14} />
              </button>
            </div>
          )}
        </div>
      );
    }

    if (blk.id === 'brightness') {
      const pct = Math.max(8, Math.min(100, ((brightness - 25) / 75) * 100));
      if (sz === '1x2') {
        return (
          <div
            onPointerDown={(e) => {
              if (editMode) return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              sliderDragRef.current = true;
              onDraggingChange?.(true);
              onBrightnessChange(Math.round(25 + computeVerticalPct(e.clientY, e.currentTarget) * 75));
            }}
            onPointerMove={(e) => {
              if (editMode || !sliderDragRef.current) return;
              onBrightnessChange(Math.round(25 + computeVerticalPct(e.clientY, e.currentTarget) * 75));
            }}
            onPointerUp={(e) => {
              if (!sliderDragRef.current) return;
              sliderDragRef.current = false;
              onDraggingChange?.(false);
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
            }}
            onWheel={(e) => {
              if (editMode) return;
              e.preventDefault();
              onBrightnessChange(Math.max(25, Math.min(100, brightness + (e.deltaY < 0 ? 5 : -5))));
            }}
            className="relative w-full h-full overflow-hidden flex flex-col items-center justify-between py-2.5 cursor-ns-resize touch-none"
            title={`Яркость: ${brightness}% (вертикальный ползунок One UI 9.0)`}
          >
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none transition-[height] duration-75"
              style={{
                height: `${pct}%`,
                background: `linear-gradient(to top, ${hexToRgba(effectiveAccent, 0.72)}, ${hexToRgba(effectiveAccent, 0.35)})`,
              }}
            />
            <span className="relative z-10 text-[9.5px] font-mono font-bold pointer-events-none">{brightness}%</span>
            <Sun size={18} className="relative z-10 drop-shadow pointer-events-none" />
          </div>
        );
      }
      return (
        <div
          onPointerDown={(e) => {
            if (editMode) return;
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            sliderDragRef.current = true;
            onDraggingChange?.(true);
            onBrightnessChange(Math.round(25 + computeHorizontalPct(e.clientX, e.currentTarget) * 75));
          }}
          onPointerMove={(e) => {
            if (editMode || !sliderDragRef.current) return;
            onBrightnessChange(Math.round(25 + computeHorizontalPct(e.clientX, e.currentTarget) * 75));
          }}
          onPointerUp={(e) => {
            if (!sliderDragRef.current) return;
            sliderDragRef.current = false;
            onDraggingChange?.(false);
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
          }}
          onWheel={(e) => {
            if (editMode) return;
            e.preventDefault();
            onBrightnessChange(Math.max(25, Math.min(100, brightness + (e.deltaY < 0 ? 5 : -5))));
          }}
          className="relative w-full h-full overflow-hidden flex items-center px-3 cursor-ew-resize touch-none"
          title={`Яркость: ${brightness}%`}
        >
          <div
            className="absolute inset-y-0 left-0 pointer-events-none transition-[width] duration-75"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(to right, ${hexToRgba(effectiveAccent, 0.65)}, ${hexToRgba(effectiveAccent, 0.32)})`,
            }}
          />
          <Sun size={16} className="relative z-10 shrink-0 pointer-events-none" />
          {sz === '4x1' && <span className="relative z-10 ml-2 text-[11px] font-bold pointer-events-none">Яркость</span>}
          <span className="relative z-10 ml-auto text-[10px] font-mono font-bold pointer-events-none">{brightness}%</span>
        </div>
      );
    }

    if (blk.id === 'volume') {
      const pct = muted ? 0 : Math.max(6, Math.min(100, volume));
      if (sz === '1x2') {
        return (
          <div
            onPointerDown={(e) => {
              if (editMode) return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              sliderDragRef.current = true;
              onDraggingChange?.(true);
              onVolumeChange(Math.round(computeVerticalPct(e.clientY, e.currentTarget) * 100));
            }}
            onPointerMove={(e) => {
              if (editMode || !sliderDragRef.current) return;
              onVolumeChange(Math.round(computeVerticalPct(e.clientY, e.currentTarget) * 100));
            }}
            onPointerUp={(e) => {
              if (!sliderDragRef.current) return;
              sliderDragRef.current = false;
              onDraggingChange?.(false);
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
            }}
            onWheel={(e) => {
              if (editMode) return;
              e.preventDefault();
              onVolumeChange(Math.max(0, Math.min(100, (muted ? 0 : volume) + (e.deltaY < 0 ? 5 : -5))));
            }}
            className="relative w-full h-full overflow-hidden flex flex-col items-center justify-between py-2.5 cursor-ns-resize touch-none"
            title={`Громкость: ${muted ? 'MUTE' : `${volume}%`} (вертикальный ползунок One UI 9.0)`}
          >
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none transition-[height] duration-75"
              style={{
                height: `${pct}%`,
                background: `linear-gradient(to top, ${hexToRgba(effectiveAccent, 0.78)}, ${hexToRgba(effectiveAccent, 0.36)})`,
              }}
            />
            <span className="relative z-10 text-[9.5px] font-mono font-bold pointer-events-none">
              {muted ? 'MUTE' : `${volume}%`}
            </span>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (!editMode) onToggleMute();
              }}
              className="relative z-10 p-1 rounded-full hover:bg-white/15 cursor-pointer"
              title="Mute / Unmute"
            >
              {muted || volume === 0 ? <VolumeX size={17} className="text-rose-300" /> : <Volume2 size={17} />}
            </button>
          </div>
        );
      }
      return (
        <div
          onPointerDown={(e) => {
            if (editMode) return;
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            sliderDragRef.current = true;
            onDraggingChange?.(true);
            onVolumeChange(Math.round(computeHorizontalPct(e.clientX, e.currentTarget) * 100));
          }}
          onPointerMove={(e) => {
            if (editMode || !sliderDragRef.current) return;
            onVolumeChange(Math.round(computeHorizontalPct(e.clientX, e.currentTarget) * 100));
          }}
          onPointerUp={(e) => {
            if (!sliderDragRef.current) return;
            sliderDragRef.current = false;
            onDraggingChange?.(false);
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
          }}
          onWheel={(e) => {
            if (editMode) return;
            e.preventDefault();
            onVolumeChange(Math.max(0, Math.min(100, (muted ? 0 : volume) + (e.deltaY < 0 ? 5 : -5))));
          }}
          className="relative w-full h-full overflow-hidden flex items-center px-3 cursor-ew-resize touch-none"
          title={`Громкость: ${muted ? 'MUTE' : `${volume}%`}`}
        >
          <div
            className="absolute inset-y-0 left-0 pointer-events-none transition-[width] duration-75"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(to right, ${hexToRgba(effectiveAccent, 0.72)}, ${hexToRgba(effectiveAccent, 0.32)})`,
            }}
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (!editMode) onToggleMute();
            }}
            className="relative z-10 p-0.5 cursor-pointer"
          >
            {muted || volume === 0 ? <VolumeX size={16} className="text-rose-300" /> : <Volume2 size={16} />}
          </button>
          {sz === '4x1' && <span className="relative z-10 ml-2 text-[11px] font-bold pointer-events-none">Громкость</span>}
          <span className="relative z-10 ml-auto text-[10px] font-mono font-bold pointer-events-none">
            {muted ? 'MUTE' : `${volume}%`}
          </span>
        </div>
      );
    }

    if (blk.id === 'sys_monitor') {
      const cpu = Math.round(liveCpuPercent || 0);
      const ram = Math.round(liveRamPercent || 0);
      if (sz === '4x2') {
        return (
          <div onClick={() => !editMode && def.onClick?.()} className="w-full h-full p-3 flex flex-col justify-between cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold flex items-center gap-1.5">
                <Activity size={13} style={{ color: effectiveAccent }} /> Монитор системы
              </span>
              <span className={`text-[9.5px] font-mono truncate max-w-[140px] ${subText}`}>{liveGpuName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono"><span>CPU</span><span className="font-bold">{cpu}%</span></div>
                <div className="h-2 rounded-full bg-white/12 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, cpu)}%`, backgroundColor: effectiveAccent }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono"><span>RAM</span><span className="font-bold">{ram}%</span></div>
                <div className="h-2 rounded-full bg-white/12 overflow-hidden">
                  <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, ram)}%` }} />
                </div>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div onClick={() => !editMode && def.onClick?.()} className="w-full h-full px-3 flex items-center justify-between gap-2 cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            <Activity size={15} style={{ color: effectiveAccent }} className="shrink-0" />
            <span className="text-[10.5px] font-bold truncate">CPU {cpu}% · RAM {ram}%</span>
          </div>
          {sz === '4x1' && (
            <div className="flex items-center gap-1.5 w-24 shrink-0">
              <div className="flex-1 h-1.5 rounded-full bg-white/12 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, cpu)}%`, backgroundColor: effectiveAccent }} />
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-white/12 overflow-hidden">
                <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, ram)}%` }} />
              </div>
            </div>
          )}
        </div>
      );
    }

    if (blk.id === 'power_plan') {
      return (
        <div className="w-full h-full px-3 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold flex items-center gap-1.5 truncate">
            <Zap size={13} style={{ color: effectiveAccent }} /> Питание
          </span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {(
              [
                ['saver', 'Эко'],
                ['balanced', 'Баланс'],
                ['performance', 'Макс'],
              ] as const
            ).map(([p, lbl]) => {
              const cur = powerPlan === p || (p === 'saver' && powerPlan === 'powersaver');
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => !editMode && (onSetPowerPlan ? onSetPowerPlan(p) : onTogglePowerSaver())}
                  className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border cursor-pointer transition ${
                    cur ? 'text-white' : 'bg-white/8 border-white/10 opacity-75'
                  }`}
                  style={cur ? { backgroundColor: effectiveAccent, borderColor: effectiveAccent } : undefined}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (sz === '1x1') {
      return (
        <div
          onClick={() => !editMode && def.onClick?.()}
          onContextMenu={def.onContextMenu}
          className={`w-full h-full flex flex-col items-center justify-center gap-0.5 px-1 cursor-pointer ${def.active ? 'text-white' : ''}`}
          title={`${def.label}${def.status ? ` · ${def.status}` : ''}`}
        >
          <span className="shrink-0">{def.icon}</span>
          <span className="text-[8.5px] font-semibold leading-tight truncate max-w-full opacity-90">{def.label}</span>
        </div>
      );
    }

    return (
      <div
        onClick={() => !editMode && def.onClick?.()}
        onContextMenu={def.onContextMenu}
        className={`w-full h-full px-2.5 py-2 flex items-center gap-2 text-left cursor-pointer ${def.active ? 'text-white' : ''}`}
        title={`${def.label}${def.status ? ` · ${def.status}` : ''}`}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/12"
          style={{
            backgroundColor: def.active
              ? 'rgba(255,255,255,0.22)'
              : isDark
              ? 'rgba(255,255,255,0.09)'
              : 'rgba(15,23,42,0.08)',
          }}
        >
          {def.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold truncate leading-tight">{def.label}</div>
          {def.status && (
            <div className={`text-[9px] truncate ${def.active ? 'text-white/80' : subText}`}>{def.status}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {editMode && (
        <div
          className="px-2.5 py-2 rounded-2xl border text-[10px] flex flex-wrap items-center justify-between gap-1.5"
          style={{
            backgroundColor: hexToRgba(effectiveAccent, 0.14),
            borderColor: hexToRgba(effectiveAccent, 0.4),
          }}
        >
          <span className="font-semibold">Тяните блоки · Размер меняет кнопка на плитке</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenVisualStudio}
              className="px-2 py-0.5 rounded-full bg-white/12 hover:bg-white/22 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Palette size={10} /> Стиль
            </button>
            <button
              type="button"
              onClick={onResetLayout}
              className="px-2 py-0.5 rounded-full bg-white/12 hover:bg-white/22 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={10} /> Сбросить
            </button>
          </div>
        </div>
      )}

      {activeConnectivityPicker === 'wifi' && (
        <LumaWifiPickerPanel
          isDark={isDark}
          status={wifiStatus}
          loading={wifiLoading}
          onRefresh={(rescan) => onRefreshWifi?.(rescan)}
          onToggleRadio={(en) => onToggleWifi?.(en)}
          onConnect={onConnectWifi || (async () => ({ ok: false, error: 'Сервис Wi-Fi недоступен' }))}
          onDisconnect={onDisconnectWifi || (async () => {})}
          onClose={() => onSetActiveConnectivityPicker('none')}
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
            onBluetoothDeviceAction || (async () => ({ ok: false, error: 'Сервис Bluetooth недоступен' }))
          }
          onClose={() => onSetActiveConnectivityPicker('none')}
        />
      )}

      {/* ONE UI 9.0 FREE 4-COLUMN AUTO-REFLOW CSS GRID */}
      <div className="grid grid-cols-4 auto-rows-[54px] grid-flow-dense gap-2">
        {panelState.blocks.map((blk, idx) => {
          const def = catalogMap.get(blk.id);
          if (!def) return null;
          const isDragging = dragIdx === idx;
          const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
          const canResize = getAllowedSizes(blk.id).length > 1;
          const useActiveBg =
            def.active && blk.id !== 'media' && blk.id !== 'brightness' && blk.id !== 'volume' && blk.id !== 'power_plan';

          return (
            <div
              key={blk.id}
              data-oneui-block-idx={idx}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button[data-block-ctrl]')) return;
                dragStartRef.current = { idx, x: e.clientX, y: e.clientY, moved: false };
                if (editMode) {
                  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                  setDragIdx(idx);
                  setOverIdx(idx);
                  onDraggingChange?.(true);
                } else if (blk.id !== 'brightness' && blk.id !== 'volume') {
                  if (longPressRef.current) window.clearTimeout(longPressRef.current);
                  longPressRef.current = window.setTimeout(() => {
                    onSetEditMode(true);
                    setDragIdx(idx);
                    setOverIdx(idx);
                    onDraggingChange?.(true);
                  }, 440);
                }
              }}
              onPointerMove={(e) => {
                const st = dragStartRef.current;
                if (!st) return;
                if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8) {
                  st.moved = true;
                  if (longPressRef.current) {
                    window.clearTimeout(longPressRef.current);
                    longPressRef.current = null;
                  }
                  if (dragIdx === null && editMode) {
                    setDragIdx(st.idx);
                    onDraggingChange?.(true);
                  }
                }
                if (dragIdx !== null) {
                  const el = document.elementFromPoint(e.clientX, e.clientY);
                  const targetWrap = el?.closest('[data-oneui-block-idx]') as HTMLElement | null;
                  if (targetWrap) {
                    const tIdx = Number(targetWrap.getAttribute('data-oneui-block-idx'));
                    if (!Number.isNaN(tIdx) && tIdx !== overIdx) setOverIdx(tIdx);
                  }
                }
              }}
              onPointerUp={(e) => {
                if (longPressRef.current) {
                  window.clearTimeout(longPressRef.current);
                  longPressRef.current = null;
                }
                dragStartRef.current = null;
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
                  onReorderBlock(dragIdx, overIdx);
                }
                setDragIdx(null);
                setOverIdx(null);
                onDraggingChange?.(false);
              }}
              onPointerCancel={() => {
                if (longPressRef.current) {
                  window.clearTimeout(longPressRef.current);
                  longPressRef.current = null;
                }
                dragStartRef.current = null;
                setDragIdx(null);
                setOverIdx(null);
                onDraggingChange?.(false);
              }}
              style={tileSurfaceStyle(useActiveBg)}
              className={`relative border overflow-hidden select-none luma-oneui-tile ${blockGridClass(blk.size)} ${
                editMode ? 'touch-none cursor-grab active:cursor-grabbing ring-1 ring-white/30' : ''
              } ${isDragging ? 'scale-105 opacity-75 z-30 shadow-2xl' : ''} ${
                isOver ? 'ring-2 ring-emerald-400 scale-[1.03]' : ''
              }`}
            >
              {renderBlockInner(blk, def)}

              {editMode && (
                <>
                  <button
                    type="button"
                    data-block-ctrl="1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBlock(blk.id);
                    }}
                    title={`Убрать «${def.label}» в лоток скрытых модулей`}
                    className="absolute top-1 right-1 z-30 w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center shadow cursor-pointer"
                  >
                    <Minus size={10} />
                  </button>
                  {canResize && (
                    <button
                      type="button"
                      data-block-ctrl="1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResizeBlock(blk.id);
                      }}
                      title="Изменить размер блока"
                      className="absolute bottom-1 right-1 z-30 px-1.5 py-0.5 rounded-full bg-black/55 hover:bg-black/75 border border-white/25 text-[8px] font-mono font-bold text-white cursor-pointer"
                    >
                      {blk.size}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* BOTTOM SLIDE-UP HIDDEN MODULES CATALOG DRAWER (EDIT MODE) */}
      {editMode && (
        <div
          className="luma-oneui-drawer p-2.5 rounded-2xl border space-y-2 mt-1"
          style={{
            backgroundColor: isDark ? 'rgba(12, 16, 26, 0.85)' : 'rgba(255, 255, 255, 0.92)',
            borderColor: hexToRgba(effectiveAccent, 0.35),
          }}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-extrabold" style={{ color: effectiveAccent }}>
              Лоток скрытых модулей ({hiddenModules.length})
            </span>
            <div className="flex items-center gap-1">
              {(
                [
                  ['all', 'Все'],
                  ['widgets', 'Виджеты'],
                  ['controls', 'Система'],
                  ['apps', 'Приложения'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDrawerTab(k)}
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer ${
                    drawerTab === k ? 'text-white' : 'bg-white/5 border-white/10 opacity-70'
                  }`}
                  style={drawerTab === k ? { backgroundColor: effectiveAccent, borderColor: effectiveAccent } : undefined}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {hiddenModules.length === 0 ? (
            <div className={`text-[10px] ${subText}`}>Все модули этой категории уже на панели!</div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {hiddenModules.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onAddBlock(m.id)}
                  className={`px-2 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1 cursor-pointer transition ${
                    isDark ? 'bg-white/[0.06] border-white/12 hover:bg-white/15' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Plus size={10} style={{ color: effectiveAccent }} /> {m.label}
                </button>
              ))}
            </div>
          )}
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
    </div>
  );
};
