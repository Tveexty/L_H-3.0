import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AppWindow,
  BatteryCharging,
  BellOff,
  Calculator,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Code2,
  Cpu,
  Disc3,
  Folder,
  FolderPlus,
  Grid,
  HardDrive,
  Lock,
  MapPin,
  Moon,
  Move,
  Music,
  Pause,
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
import { AppItem, IslandMediaPlayer, LiveSystemTelemetry } from '../data/launcherData';

export type DesktopGridCols = 22 | 20;
export type WallpaperStyle = 'dots' | 'grid' | 'matte';

export interface DesktopWidgetInstance {
  id: string;
  widgetType: string;
  title: string;
  group: 'Основное' | 'Система' | 'Инструменты';
  col: number;
  row: number;
  w: number;
  h: number;
}

export interface DesktopShortcut {
  id: string;
  kind: 'system' | 'app' | 'folder';
  label: string;
  icon: string;
  target: string;
  appIds?: string[];
  col: number;
  row: number;
}

interface WidgetCatalogDef {
  type: string;
  title: string;
  group: 'Основное' | 'Система' | 'Инструменты';
  defaultW: number;
  defaultH: number;
  summary: string;
}

export const DESKTOP_WIDGET_CATALOG: WidgetCatalogDef[] = [
  { type: 'luma_clock', title: 'Часы и дата', group: 'Основное', defaultW: 5, defaultH: 3, summary: 'Цифровые часы с секундным индикатором и датой' },
  { type: 'luma_weather', title: 'Погода (Авто-регион)', group: 'Основное', defaultW: 5, defaultH: 2, summary: 'Текущая погода Open-Meteo по вашему региону' },
  { type: 'luma_media', title: 'Медиаплеер', group: 'Основное', defaultW: 6, defaultH: 2, summary: 'Играющий трек ОС и аппаратное переключение' },
  { type: 'luma_sys', title: 'CPU / GPU / ОЗУ', group: 'Система', defaultW: 6, defaultH: 2, summary: 'Реальная загрузка процессора, видео и памяти' },
  { type: 'luma_disks', title: 'Накопители', group: 'Система', defaultW: 5, defaultH: 2, summary: 'Смонтированные тома и свободное место' },
  { type: 'luma_net', title: 'Сеть и IPC', group: 'Система', defaultW: 5, defaultH: 2, summary: 'Скорость приёма/отдачи Мбит/с и статус шины 49215' },
  { type: 'luma_battery', title: 'Батарея и питание', group: 'Система', defaultW: 4, defaultH: 2, summary: 'Реальный уровень заряда и состояние сети' },
  { type: 'luma_power', title: 'Управление питанием', group: 'Система', defaultW: 5, defaultH: 2, summary: 'Блокировка экрана, сон и системная Корзина' },
  { type: 'luma_guard', title: 'LumaGuard AES-256', group: 'Система', defaultW: 5, defaultH: 2, summary: 'Состояние шифрования и ротация ключей ядра' },
  { type: 'luma_utils', title: 'Системные модули', group: 'Система', defaultW: 5, defaultH: 2, summary: 'Быстрый доступ к Приложениям, Терминалу, Ядру' },
  { type: 'luma_quick', title: 'Быстрые переключатели', group: 'Основное', defaultW: 5, defaultH: 2, summary: 'Звук, DND, Luma Island и переключение темы' },
  { type: 'luma_notes', title: 'Заметки и задачи', group: 'Инструменты', defaultW: 5, defaultH: 3, summary: 'Компактный список задач прямо на рабочем столе' },
  { type: 'luma_pomodoro', title: 'Таймер фокуса', group: 'Инструменты', defaultW: 4, defaultH: 2, summary: 'Интервальный таймер работы 25 минут' },
  { type: 'luma_calc', title: 'Калькулятор', group: 'Инструменты', defaultW: 5, defaultH: 3, summary: 'Быстрые вычисления без открытия окна' },
  { type: 'luma_calendar', title: 'Календарь и пояса', group: 'Инструменты', defaultW: 5, defaultH: 2, summary: 'Дата, день недели и мировое время' },
  { type: 'luma_wellbeing', title: 'Экранное время', group: 'Инструменты', defaultW: 5, defaultH: 2, summary: 'Живая сводка активных сессий приложений' },
  { type: 'luma_rings', title: 'Ритм дня', group: 'Инструменты', defaultW: 4, defaultH: 2, summary: 'Индикаторы фокуса, задач и активности' },
  { type: 'luma_markets', title: 'Курсы и рынки', group: 'Инструменты', defaultW: 5, defaultH: 2, summary: 'Компактная лента котировок BTC / ETH / USD' },
];

// Clean Minimal Default Desktop (Leaves ~75% calm negative space!)
const DEFAULT_MINIMAL_WIDGETS: DesktopWidgetInstance[] = [
  { id: 'w_clock', widgetType: 'luma_clock', title: 'Часы и дата', group: 'Основное', col: 3, row: 1, w: 5, h: 3 },
  { id: 'w_weather', widgetType: 'luma_weather', title: 'Погода (Авто-регион)', group: 'Основное', col: 3, row: 4, w: 5, h: 2 },
  { id: 'w_media', widgetType: 'luma_media', title: 'Медиаплеер', group: 'Основное', col: 17, row: 1, w: 6, h: 2 },
  { id: 'w_sys', widgetType: 'luma_sys', title: 'CPU / GPU / ОЗУ', group: 'Система', col: 17, row: 3, w: 6, h: 2 },
];

const DEFAULT_WORKSTATION_WIDGETS: DesktopWidgetInstance[] = [
  { id: 'w_clock', widgetType: 'luma_clock', title: 'Часы и дата', group: 'Основное', col: 3, row: 1, w: 5, h: 3 },
  { id: 'w_weather', widgetType: 'luma_weather', title: 'Погода (Авто-регион)', group: 'Основное', col: 3, row: 4, w: 5, h: 2 },
  { id: 'w_notes', widgetType: 'luma_notes', title: 'Заметки и задачи', group: 'Инструменты', col: 3, row: 6, w: 5, h: 3 },
  { id: 'w_quick', widgetType: 'luma_quick', title: 'Быстрые переключатели', group: 'Основное', col: 9, row: 1, w: 5, h: 2 },
  { id: 'w_disks', widgetType: 'luma_disks', title: 'Накопители', group: 'Система', col: 9, row: 3, w: 5, h: 2 },
  { id: 'w_net', widgetType: 'luma_net', title: 'Сеть и IPC', group: 'Система', col: 9, row: 5, w: 5, h: 2 },
  { id: 'w_pomodoro', widgetType: 'luma_pomodoro', title: 'Таймер фокуса', group: 'Инструменты', col: 9, row: 7, w: 5, h: 2 },
  { id: 'w_media', widgetType: 'luma_media', title: 'Медиаплеер', group: 'Основное', col: 15, row: 1, w: 6, h: 2 },
  { id: 'w_sys', widgetType: 'luma_sys', title: 'CPU / GPU / ОЗУ', group: 'Система', col: 15, row: 3, w: 6, h: 2 },
  { id: 'w_power', widgetType: 'luma_power', title: 'Управление питанием', group: 'Система', col: 15, row: 5, w: 6, h: 2 },
  { id: 'w_guard', widgetType: 'luma_guard', title: 'LumaGuard AES-256', group: 'Система', col: 15, row: 7, w: 6, h: 2 },
];

const DEFAULT_SHORTCUTS: DesktopShortcut[] = [
  { id: 'sc_apps', kind: 'system', label: 'Приложения', icon: 'AppWindow', target: 'apps', col: 1, row: 1 },
  { id: 'sc_term', kind: 'system', label: 'Терминал', icon: 'Terminal', target: 'terminal', col: 1, row: 2 },
  { id: 'sc_kernel', kind: 'system', label: 'Ядро', icon: 'Code2', target: 'kernel', col: 1, row: 3 },
  { id: 'sc_settings', kind: 'system', label: 'Настройки', icon: 'Settings', target: 'settings', col: 1, row: 4 },
];

const DESKTOP_STORAGE_KEY = 'luma_os_1_0_2b_dex_desktop_v1';

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

export interface LumaDesktopCanvasProps {
  isDark: boolean;
  accentHex: string;
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
  onOpenSystemWindow: (win: 'apps' | 'tracker' | 'kernel' | 'terminal' | 'settings' | 'plugins' | 'island' | 'spaces') => void;
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
}

export const LumaDesktopCanvas: React.FC<LumaDesktopCanvasProps> = ({
  isDark,
  accentHex,
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
}) => {
  const totalRows = 10;
  const totalCells = gridCols * totalRows; // 220 (22x10) or 200 (20x10)

  const [widgets, setWidgets] = useState<DesktopWidgetInstance[]>(() => {
    try {
      const raw = localStorage.getItem(DESKTOP_STORAGE_KEY);
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
      const raw = localStorage.getItem(DESKTOP_STORAGE_KEY);
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

  // Desktop right-click Context Menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; col: number; row: number } | null>(null);
  const [pickerModal, setPickerModal] = useState<null | { mode: 'widget' | 'app'; col: number; row: number }>(null);
  const [openFolder, setOpenFolder] = useState<DesktopShortcut | null>(null);

  // Widget interactive local states
  const [now, setNow] = useState(() => new Date());
  const [notes, setNotes] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: 'n1', text: 'Проверить ресурсы ядра', done: true },
    { id: 'n2', text: 'Настроить сетку 22×10', done: false },
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

  // Auto-fetch live Open-Meteo weather for real detected region
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
      // fallback silently
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

  // Close context menu on Escape or click anywhere
  useEffect(() => {
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCtxMenu(null);
        setPickerModal(null);
        setOpenFolder(null);
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

  // Move widget or shortcut to target cell
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
        prev.map((s) => (s.id === id ? { ...s, col: Math.max(1, Math.min(gridCols, col)), row: Math.max(1, Math.min(totalRows, row)) } : s))
      );
    }
  };

  const resizeSelectedWidget = (dw: number, dh: number) => {
    if (!selectedId) return;
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== selectedId) return w;
        const nw = Math.max(3, Math.min(12, w.w + dw));
        const nh = Math.max(2, Math.min(6, w.h + dh));
        return {
          ...w,
          w: nw,
          h: nh,
          col: Math.min(w.col, gridCols - nw + 1),
          row: Math.min(w.row, totalRows - nh + 1),
        };
      })
    );
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setWidgets((prev) => prev.filter((w) => w.id !== selectedId));
    setShortcuts((prev) => prev.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  };

  const addWidgetAt = (def: WidgetCatalogDef, col: number, row: number) => {
    const id = `w_${def.type}_${Date.now()}`;
    const c = Math.max(1, Math.min(gridCols - def.defaultW + 1, col));
    const r = Math.max(1, Math.min(totalRows - def.defaultH + 1, row));
    setWidgets((prev) => [
      ...prev,
      { id, widgetType: def.type, title: def.title, group: def.group, col: c, row: r, w: def.defaultW, h: def.defaultH },
    ]);
    setPickerModal(null);
    onPushToast('Рабочий стол', `Добавлен виджет «${def.title}»`, 'info');
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

  const addFolderAt = (col: number, row: number) => {
    setShortcuts((prev) => [
      ...prev,
      {
        id: `fld_${Date.now()}`,
        kind: 'folder',
        label: 'Папка',
        icon: 'Folder',
        target: 'folder',
        appIds: apps.slice(0, 4).map((a) => a.id),
        col: Math.max(1, Math.min(gridCols, col)),
        row: Math.max(1, Math.min(totalRows, row)),
      },
    ]);
    setCtxMenu(null);
  };

  const handleCellClick = (col: number, row: number) => {
    setCtxMenu(null);
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
    const menuW = 248;
    const menuH = 310;
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

  // Strict Monochrome Industrial Surface Tokens
  const cardCls = isDark
    ? 'bg-[#121215]/88 border-white/[0.09] text-zinc-100 hover:border-white/[0.18]'
    : 'bg-white/92 border-zinc-900/[0.11] text-zinc-900 hover:border-zinc-900/[0.24] shadow-[0_2px_12px_rgba(0,0,0,0.04)]';
  const mutedCls = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const subBtnCls = isDark
    ? 'bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.09] text-zinc-200'
    : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800';
  const railTrackCls = isDark ? 'bg-white/[0.09]' : 'bg-zinc-200';

  const wallpaperCls =
    wallpaper === 'dots'
      ? isDark
        ? 'luma-bg-dots-dark'
        : 'luma-bg-dots-light'
      : wallpaper === 'grid'
      ? isDark
        ? 'luma-bg-grid-dark'
        : 'luma-bg-grid-light'
      : isDark
      ? 'bg-[#09090b]'
      : 'bg-[#f3f3f1]';

  const renderWeatherIcon = (code: number) => {
    const k = wmoToRu(code).kind;
    if (k === 'sun') return <Sun className="w-5 h-5" />;
    if (k === 'rain') return <CloudRain className="w-5 h-5" />;
    if (k === 'snow') return <Snowflake className="w-5 h-5" />;
    if (k === 'storm') return <CloudLightning className="w-5 h-5" />;
    return code <= 2 ? <CloudSun className="w-5 h-5" /> : <Cloud className="w-5 h-5" />;
  };

  const renderShortcutIcon = (iconName: string, className = 'w-5 h-5') => {
    if (iconName === 'AppWindow') return <AppWindow className={className} />;
    if (iconName === 'Terminal') return <Terminal className={className} />;
    if (iconName === 'Code2') return <Code2 className={className} />;
    if (iconName === 'Settings') return <Settings className={className} />;
    if (iconName === 'Folder') return <Folder className={className} />;
    const Comp = iconMap[iconName] || AppWindow;
    return <Comp className={className} />;
  };

  const renderWidgetBody = (w: DesktopWidgetInstance) => {
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });

    switch (w.widgetType) {
      case 'luma_clock':
        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em]">
              <span className={mutedCls}>{liveSystem?.location?.city || 'LUMA DESKTOP'}</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d71921]" />
                <span className={mutedCls}>{secs}</span>
              </span>
            </div>
            <div className="font-mono font-bold tracking-tighter tabular-nums leading-none text-5xl xl:text-6xl">
              {hrs}
              <span className="text-[#d71921] mx-0.5">:</span>
              {mins}
            </div>
            <div className={`text-[11px] font-mono uppercase tracking-wider truncate ${mutedCls}`}>
              {dateStr}
            </div>
          </div>
        );

      case 'luma_weather':
        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] truncate ${mutedCls}`}>
                <MapPin className="w-3 h-3 text-[#d71921] shrink-0" />
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
                className={`p-1 rounded-md cursor-pointer transition ${mutedCls} hover:text-[#d71921]`}
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

      case 'luma_media':
        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className="inline-flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[#d71921] animate-pulse' : 'bg-zinc-500'}`} />
                <span className={mutedCls}>{hasLiveMedia ? 'АУДИО ОС' : 'МЕДИА'}</span>
              </span>
              {isPlaying && (
                <div className="flex items-end gap-[2px] h-2.5">
                  <span className="w-[2px] h-full bg-[#d71921] luma-eq-bar" />
                  <span className="w-[2px] h-full bg-current luma-eq-bar luma-eq-bar-2" />
                  <span className="w-[2px] h-full bg-[#d71921] luma-eq-bar luma-eq-bar-3" />
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
                  className="w-8 h-8 rounded-full bg-[#d71921] hover:bg-[#b9151c] text-white flex items-center justify-center cursor-pointer transition"
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

      case 'luma_sys': {
        const cpu = liveSystem?.cpu_percent ?? 0;
        const ram = liveSystem?.ram_percent ?? 0;
        const ramStr = liveSystem ? `${liveSystem.ram_used_gb.toFixed(1)}/${liveSystem.ram_total_gb.toFixed(0)}G` : `${ram}%`;
        const disk = liveSystem?.disks?.[0];
        const bat = liveSystem?.battery_percent ?? 100;
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
                        m.pct > 85 ? 'bg-[#d71921]' : isDark ? 'bg-zinc-200' : 'bg-zinc-900'
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
                      {d.free_gb.toFixed(1)}G свободно / {d.total_gb.toFixed(0)}G
                    </span>
                  </div>
                  <div className={`h-[3px] rounded-full overflow-hidden ${railTrackCls}`}>
                    <div
                      className={`h-full ${d.percent > 85 ? 'bg-[#d71921]' : isDark ? 'bg-zinc-200' : 'bg-zinc-900'}`}
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

      case 'luma_battery': {
        const bat = liveSystem?.battery_percent ?? 100;
        const chg = liveSystem?.battery_charging ?? true;
        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={mutedCls}>ПИТАНИЕ</span>
              <BatteryCharging className={`w-3.5 h-3.5 ${chg ? 'text-[#d71921]' : mutedCls}`} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-mono font-bold tabular-nums">{bat}%</span>
              <span className={`text-[10px] font-mono uppercase ${mutedCls}`}>{chg ? 'ОТ СЕТИ' : 'АКБ'}</span>
            </div>
            <div className={`h-[3px] rounded-full overflow-hidden ${railTrackCls}`}>
              <div className={`h-full ${bat < 20 ? 'bg-[#d71921]' : isDark ? 'bg-zinc-200' : 'bg-zinc-900'}`} style={{ width: `${bat}%` }} />
            </div>
          </div>
        );
      }

      case 'luma_quick':
        return (
          <div className="h-full flex flex-col justify-between">
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>УПРАВЛЕНИЕ</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: isMuted ? 'Выкл' : `${volume}%`, active: !isMuted, icon: isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />, onClick: onToggleMute },
                { label: 'DND', active: dndEnabled, icon: <BellOff className="w-3.5 h-3.5" />, onClick: onToggleDnd },
                { label: 'Остров', active: dynamicIslandEnabled, icon: <Disc3 className="w-3.5 h-3.5" />, onClick: onToggleIsland },
                { label: isDark ? 'Ночь' : 'День', active: isDark, icon: isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />, onClick: onToggleTheme },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    b.onClick();
                  }}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-mono cursor-pointer transition ${
                    b.active
                      ? 'bg-[#d71921] border-[#d71921] text-white'
                      : subBtnCls
                  }`}
                >
                  {b.icon}
                  <span className="truncate max-w-full">{b.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

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
                        n.done ? 'bg-[#d71921] border-[#d71921] text-white' : 'border-zinc-500'
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
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-[#d71921] cursor-pointer"
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
              <button type="submit" className="px-2 py-1 rounded-lg bg-[#d71921] text-white text-[11px] font-bold cursor-pointer">
                +
              </button>
            </form>
          </div>
        );

      case 'luma_pomodoro': {
        const mm = String(Math.floor(pomoSec / 60)).padStart(2, '0');
        const ss = String(pomoSec % 60).padStart(2, '0');
        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={`inline-flex items-center gap-1 ${mutedCls}`}>
                <Timer className="w-3 h-3" />
                ФОКУС
              </span>
              <span className={pomoRunning ? 'text-[#d71921]' : mutedCls}>{pomoRunning ? 'ИДЁТ' : 'ПАУЗА'}</span>
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
                  className="px-2.5 py-1.5 rounded-lg bg-[#d71921] text-white text-[10px] font-mono font-bold cursor-pointer"
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
                    k === '=' ? 'bg-[#d71921] border-[#d71921] text-white' : subBtnCls
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        );

      case 'luma_calendar': {
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
              <span className="text-[#d71921] font-bold">{now.getFullYear()}</span>
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

      case 'luma_rings':
        return (
          <div className="h-full flex flex-col justify-between">
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>РИТМ ДНЯ</div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span>Задачи: {notes.filter((n) => n.done).length}/{notes.length}</span>
              <span className="text-[#d71921] font-bold">{Math.round((notes.filter((n) => n.done).length / Math.max(1, notes.length)) * 100)}%</span>
            </div>
            <div className={`h-[3px] rounded-full overflow-hidden ${railTrackCls}`}>
              <div
                className="h-full bg-[#d71921]"
                style={{ width: `${Math.round((notes.filter((n) => n.done).length / Math.max(1, notes.length)) * 100)}%` }}
              />
            </div>
          </div>
        );

      case 'luma_markets':
        return (
          <div className="h-full flex flex-col justify-between">
            <div className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>
              <TrendingUp className="w-3 h-3" />
              РЫНКИ
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              {[
                ['BTC', '94.2k', '+2.4%'],
                ['ETH', '3.31k', '+1.1%'],
                ['USD', '92.4₽', '-0.3%'],
              ].map(([sym, pr, ch]) => (
                <div key={sym}>
                  <div className={`text-[9px] ${mutedCls}`}>{sym}</div>
                  <div className="font-bold tabular-nums">{pr}</div>
                  <div className={`text-[9px] ${ch.startsWith('+') ? 'text-emerald-500' : 'text-[#d71921]'}`}>{ch}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'luma_power':
        return (
          <div className="h-full flex flex-col justify-between">
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>ПИТАНИЕ ПК</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Блок', icon: <Lock className="w-3.5 h-3.5" />, act: 'lock' as const },
                { label: 'Сон', icon: <Power className="w-3.5 h-3.5" />, act: 'sleep' as const },
                { label: 'Корзина', icon: <Trash2 className="w-3.5 h-3.5" />, act: 'recycle_bin' as const },
              ].map((p) => (
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

      case 'luma_guard':
        return (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className={`inline-flex items-center gap-1 ${mutedCls}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-[#d71921]" />
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
      default:
        return (
          <div className="h-full flex flex-col justify-between">
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>МОДУЛИ</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Прил.', icon: <AppWindow className="w-3.5 h-3.5" />, win: 'apps' as const },
                { label: 'Терм.', icon: <Terminal className="w-3.5 h-3.5" />, win: 'terminal' as const },
                { label: 'Ядро', icon: <Code2 className="w-3.5 h-3.5" />, win: 'kernel' as const },
                { label: 'Опции', icon: <Settings className="w-3.5 h-3.5" />, win: 'settings' as const },
              ].map((u) => (
                <button
                  key={u.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSystemWindow(u.win);
                  }}
                  className={`py-2 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-mono cursor-pointer transition ${subBtnCls}`}
                >
                  {u.icon}
                  <span>{u.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${wallpaperCls}`}>
      {/* FULL-VIEWPORT 22x10 (220 CELLS) OR 20x10 (200 CELLS) DESKTOP MATRIX */}
      <div
        className="w-full h-full p-3 pb-16"
        style={{
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
            return (
              <div
                key={`c_${col}_${row}`}
                style={{ gridColumn: `${col} / span 1`, gridRow: `${row} / span 1` }}
                onMouseEnter={() => editMode && setHoveredCell({ col, row })}
                onClick={() => handleCellClick(col, row)}
                onContextMenu={(e) => handleDesktopContextMenu(e, col, row)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHoveredCell({ col, row });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingId) {
                    moveItemToCell(draggingId.kind, draggingId.id, col, row);
                    setDraggingId(null);
                    setHoveredCell(null);
                  }
                }}
                className={`rounded-lg transition-colors flex items-center justify-center ${
                  editMode
                    ? isHovered
                      ? 'border border-[#d71921]/70 bg-[#d71921]/10 cursor-pointer'
                      : isDark
                      ? 'border border-white/[0.06] hover:border-white/[0.15] cursor-pointer'
                      : 'border border-zinc-900/[0.08] hover:border-zinc-900/[0.2] cursor-pointer'
                    : draggingId && isHovered
                    ? 'border border-[#d71921]/60 bg-[#d71921]/10'
                    : ''
                }`}
              >
                {editMode && (
                  <span className="text-[8px] font-mono text-zinc-500/70 pointer-events-none">
                    {col}.{row}
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* 2. Desktop Widgets placed on 22x10 / 20x10 Grid */}
        {widgets.map((w) => {
          const clampedCol = Math.max(1, Math.min(gridCols - w.w + 1, w.col));
          const clampedRow = Math.max(1, Math.min(totalRows - w.h + 1, w.row));
          const isSelected = selectedId === w.id;
          return (
            <div
              key={w.id}
              draggable
              onDragStart={() => setDraggingId({ kind: 'widget', id: w.id })}
              onDragEnd={() => {
                setDraggingId(null);
                setHoveredCell(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setCtxMenu(null);
                if (editMode) setSelectedId(w.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedId(w.id);
                onSetEditMode(true);
              }}
              style={{
                gridColumn: `${clampedCol} / span ${Math.min(w.w, gridCols)}`,
                gridRow: `${clampedRow} / span ${Math.min(w.h, totalRows)}`,
                zIndex: isSelected ? 15 : 5,
                backdropFilter: 'blur(20px)',
              }}
              className={`relative rounded-[18px] border p-3.5 overflow-hidden luma-card-lift ${cardCls} ${
                editMode ? 'cursor-grab active:cursor-grabbing' : ''
              } ${isSelected && editMode ? 'ring-2 ring-[#d71921]' : ''}`}
            >
              {editMode && (
                <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#d71921] text-white text-[9px] font-mono font-bold">
                  <span>
                    {clampedCol},{clampedRow} · {w.w}×{w.h}
                  </span>
                </div>
              )}
              {renderWidgetBody(w)}
            </div>
          );
        })}

        {/* 3. Essential Desktop Shortcuts & Folders on 22x10 / 20x10 Grid */}
        {shortcuts.map((sc) => {
          const clampedCol = Math.max(1, Math.min(gridCols, sc.col));
          const clampedRow = Math.max(1, Math.min(totalRows, sc.row));
          const isSelected = selectedId === sc.id;
          return (
            <button
              key={sc.id}
              draggable
              onDragStart={() => setDraggingId({ kind: 'shortcut', id: sc.id })}
              onDragEnd={() => {
                setDraggingId(null);
                setHoveredCell(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setCtxMenu(null);
                if (editMode) {
                  setSelectedId(sc.id);
                  return;
                }
                if (sc.kind === 'system') {
                  onOpenSystemWindow(sc.target as 'apps' | 'terminal' | 'kernel' | 'settings');
                } else if (sc.kind === 'folder') {
                  setOpenFolder(sc);
                } else {
                  const found = apps.find((a) => a.id === sc.target);
                  if (found) onLaunchApp(found);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedId(sc.id);
                onSetEditMode(true);
              }}
              style={{
                gridColumn: `${clampedCol} / span 1`,
                gridRow: `${clampedRow} / span 1`,
                zIndex: 6,
              }}
              title={sc.label}
              className={`group flex flex-col items-center justify-center gap-1 rounded-2xl p-1 transition cursor-pointer ${
                isDark ? 'hover:bg-white/[0.07] text-zinc-200' : 'hover:bg-zinc-900/[0.06] text-zinc-900'
              } ${isSelected && editMode ? 'ring-2 ring-[#d71921] bg-[#d71921]/10' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-[14px] border flex items-center justify-center transition ${
                  isDark
                    ? 'bg-[#141418]/90 border-white/[0.1] group-hover:border-white/25 text-zinc-100'
                    : 'bg-white/95 border-zinc-900/[0.12] group-hover:border-zinc-900/30 text-zinc-900 shadow-xs'
                }`}
              >
                {renderShortcutIcon(sc.icon, 'w-4 h-4')}
              </div>
              <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">
                {sc.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* FLOATING EDIT-MODE TOOLBAR (ONLY VISIBLE WHEN EDITING THE 200-220 CELL DESKTOP) */}
      {editMode && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`luma-animate-in fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-mono shadow-2xl ${
            isDark ? 'bg-[#121215]/95 border-white/15 text-zinc-100' : 'bg-white/95 border-zinc-300 text-zinc-900'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 px-2 text-[11px] font-bold">
            <Move className="w-3.5 h-3.5 text-[#d71921]" />
            СЕТКА {gridCols}×{totalRows} ({totalCells})
          </span>

          <button
            onClick={() => onSetGridCols(gridCols === 22 ? 20 : 22)}
            className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${subBtnCls}`}
          >
            {gridCols === 22 ? '20×10 (200)' : '22×10 (220)'}
          </button>

          {selectedId && widgets.some((w) => w.id === selectedId) && (
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
            </>
          )}

          {selectedId && (
            <button
              onClick={removeSelected}
              className="px-2 py-1 rounded-lg bg-[#d71921]/15 border border-[#d71921]/40 text-[#d71921] text-[11px] font-bold cursor-pointer"
            >
              Убрать
            </button>
          )}

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
            className="px-3 py-1 rounded-lg bg-[#d71921] text-white text-[11px] font-bold cursor-pointer"
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
          className={`luma-animate-in fixed z-50 w-60 rounded-2xl border p-1.5 shadow-2xl text-xs ${
            isDark ? 'bg-[#121215]/96 border-white/12 text-zinc-100' : 'bg-white/96 border-zinc-300 text-zinc-900'
          }`}
        >
          <div className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>
            Ячейка [{ctxMenu.col}, {ctxMenu.row}] · {gridCols}×{totalRows}
          </div>

          {[
            {
              label: 'Добавить виджет сюда',
              icon: <Plus className="w-3.5 h-3.5" />,
              run: () => {
                setPickerModal({ mode: 'widget', col: ctxMenu.col, row: ctxMenu.row });
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
            {
              label: 'Создать папку',
              icon: <FolderPlus className="w-3.5 h-3.5" />,
              run: () => addFolderAt(ctxMenu.col, ctxMenu.row),
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.run}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
              }`}
            >
              <span className={mutedCls}>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}

          <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-zinc-200'}`} />

          <button
            onClick={() => {
              onSetEditMode(!editMode);
              setCtxMenu(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Move className={`w-3.5 h-3.5 ${mutedCls}`} />
              <span>Режим расстановки</span>
            </span>
            <span className="text-[10px] font-mono text-[#d71921]">{editMode ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>

          <button
            onClick={() => {
              onSetGridCols(gridCols === 22 ? 20 : 22);
              setCtxMenu(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Grid className={`w-3.5 h-3.5 ${mutedCls}`} />
              <span>Сетка экрана</span>
            </span>
            <span className="text-[10px] font-mono">{gridCols}×10</span>
          </button>

          <button
            onClick={() => {
              const order: WallpaperStyle[] = ['dots', 'grid', 'matte'];
              const next = order[(order.indexOf(wallpaper) + 1) % order.length];
              onSetWallpaper(next);
              setCtxMenu(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Sliders className={`w-3.5 h-3.5 ${mutedCls}`} />
              <span>Фон рабочего стола</span>
            </span>
            <span className="text-[10px] font-mono uppercase">
              {wallpaper === 'dots' ? 'Точки' : wallpaper === 'grid' ? 'Сетка' : 'Мат'}
            </span>
          </button>

          <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-zinc-200'}`} />

          <button
            onClick={() => {
              setWidgets(DEFAULT_MINIMAL_WIDGETS);
              setShortcuts(DEFAULT_SHORTCUTS);
              setCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
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
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
            }`}
          >
            <Cpu className={`w-3.5 h-3.5 ${mutedCls}`} />
            <span>Пресет: Все модули</span>
          </button>

          <button
            onClick={() => {
              onOpenSystemWindow('settings');
              setCtxMenu(null);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${mutedCls}`} />
            <span>Настройки системы</span>
          </button>
        </div>
      )}

      {/* WIDGET / APP PICKER MODAL FOR CELL [X, Y] */}
      {pickerModal && (
        <div
          onClick={() => setPickerModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-2xl max-h-[78vh] rounded-2xl border flex flex-col overflow-hidden ${
              isDark ? 'dex-window-dark text-zinc-100' : 'dex-window-light text-zinc-900'
            }`}
          >
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
              <div>
                <h3 className="text-sm font-bold">
                  {pickerModal.mode === 'widget' ? 'Каталог виджетов (18)' : 'Добавить ярлык на рабочий стол'}
                </h3>
                <p className={`text-[11px] font-mono ${mutedCls}`}>
                  Позиция: [{pickerModal.col}, {pickerModal.row}] · Сетка {gridCols}×{totalRows}
                </p>
              </div>
              <button onClick={() => setPickerModal(null)} className={`p-1.5 rounded-lg border cursor-pointer ${subBtnCls}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {pickerModal.mode === 'widget' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DESKTOP_WIDGET_CATALOG.map((def) => (
                    <button
                      key={def.type}
                      onClick={() => addWidgetAt(def, pickerModal.col, pickerModal.row)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-3 ${subBtnCls}`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{def.title}</div>
                        <div className={`text-[11px] truncate ${mutedCls}`}>{def.summary}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/20 shrink-0">
                        {def.defaultW}×{def.defaultH}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP FOLDER POPUP */}
      {openFolder && (
        <div
          onClick={() => setOpenFolder(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-sm rounded-2xl border p-4 space-y-3 ${
              isDark ? 'dex-window-dark text-zinc-100' : 'dex-window-light text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#d71921]" />
                {openFolder.label}
              </span>
              <button onClick={() => setOpenFolder(null)} className={`p-1 rounded-lg border cursor-pointer ${subBtnCls}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(openFolder.appIds || [])
                .map((id) => apps.find((a) => a.id === id))
                .filter((a): a is AppItem => Boolean(a))
                .map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      onLaunchApp(app);
                      setOpenFolder(null);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 text-left cursor-pointer ${subBtnCls}`}
                  >
                    {renderShortcutIcon(app.icon, 'w-4 h-4 shrink-0')}
                    <span className="text-xs font-medium truncate">{app.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
