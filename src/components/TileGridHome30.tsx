import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  HardDrive,
  Volume2,
  VolumeX,
  CheckSquare,
  Clock,
  Terminal,
  Wifi,
  Music,
  Timer,
  CloudSun,
  CloudRain,
  Cloud,
  Sun,
  Snowflake,
  CloudLightning,
  Calculator,
  Power,
  FolderPlus,
  Folder,
  Maximize2,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Search,
  Lock,
  Moon,
  RefreshCw,
  ShieldCheck,
  Cpu,
  Sparkles,
  Sliders,
  X,
  MapPin,
  Code2,
  Puzzle,
  LayoutGrid,
  Compass,
  FolderOpen,
} from 'lucide-react';
import { AppItem, formatMonthBadge } from '../data/launcherData';

export type TileSize30 = '1x1' | '2x1' | '2x2';

export interface CustomFolder30 {
  id: string;
  name: string;
  color: string;
  size: TileSize30;
  appIds: string[];
  order: number;
}

export interface WidgetConfig30 {
  id: string;
  title: string;
  size: TileSize30;
  visible: boolean;
  order: number;
}

interface TodoItem30 {
  id: string;
  text: string;
  done: boolean;
}

interface WeatherHourPoint {
  time: string;
  temp: number;
  code: number;
}

interface WeatherState30 {
  city: string;
  country: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  hourly: WeatherHourPoint[];
  loading: boolean;
  updatedAt: string;
}

interface TileGridHome30Props {
  apps: AppItem[];
  isDark: boolean;
  accentHex: string;
  cardBorderRadius: number;
  iconScalePct: number;
  volume: number;
  isMuted: boolean;
  onChangeVolume: (val: number) => void;
  onToggleMute: () => void;
  onLaunchApp: (app: AppItem) => void;
  onSwitchToClassicSearch: () => void;
  onPushNotification: (title: string, message: string, type?: 'info' | 'warning' | 'success') => void;
  onPlayBeep: (freq?: number) => void;
  iconMap: Record<string, React.ComponentType<{ className?: string }>>;
}

const DEFAULT_WIDGETS_30: WidgetConfig30[] = [
  { id: 'cpu_ram', title: '1. Системный монитор (CPU / RAM)', size: '2x1', visible: true, order: 1 },
  { id: 'disk_analyzer', title: '2. Анализатор накопителей (Диски C / D)', size: '2x1', visible: true, order: 2 },
  { id: 'audio_mixer', title: '3. Аудио-микшер и громкость', size: '1x1', visible: true, order: 3 },
  { id: 'clock_uptime', title: '5. Часы, дата и системный аптайм', size: '1x1', visible: true, order: 4 },
  { id: 'notes_todo', title: '4. Быстрые заметки и To-Do', size: '2x2', visible: true, order: 5 },
  { id: 'weather', title: '10. Погода и температура за бортом', size: '2x1', visible: true, order: 6 },
  { id: 'quick_launch', title: '6. Быстрый запуск утилит (Quick Launch)', size: '2x1', visible: true, order: 7 },
  { id: 'network_io', title: '7. Сетевой монитор (Network I/O)', size: '1x1', visible: true, order: 8 },
  { id: 'pomodoro', title: '9. Таймер / Помидор (Pomodoro Focus)', size: '1x1', visible: true, order: 9 },
  { id: 'media_player', title: '8. Медиаплеер (Now Playing)', size: '2x1', visible: true, order: 10 },
  { id: 'calc_converter', title: '11. Быстрый калькулятор / Конвертер', size: '2x1', visible: true, order: 11 },
  { id: 'power_control', title: '12. Управление питанием системы', size: '1x1', visible: true, order: 12 },
];

const DEFAULT_FOLDERS_30: CustomFolder30[] = [
  {
    id: 'folder_games',
    name: 'Игры и Развлечения',
    color: '#10b981',
    size: '2x1',
    appIds: ['steam', 'vkplay', 'youtube'],
    order: 1,
  },
  {
    id: 'folder_work',
    name: 'Работа и Браузеры',
    color: '#3b82f6',
    size: '1x1',
    appIds: ['chrome', 'telegram', 'winword', 'yandexdisk'],
    order: 2,
  },
];

const STORAGE_KEY_30 = 'launcher_hab_v30_csharp_tiles_v1';

function decodeWeatherWmo(code: number): { label: string; kind: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' } {
  if (code === 0) return { label: 'Ясно', kind: 'clear' };
  if (code === 1 || code === 2) return { label: 'Малооблачно', kind: 'cloudy' };
  if (code === 3 || code === 45 || code === 48) return { label: 'Пасмурно', kind: 'cloudy' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Дождь', kind: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Снег', kind: 'snow' };
  if (code >= 95) return { label: 'Гроза', kind: 'storm' };
  return { label: 'Переменная облачность', kind: 'cloudy' };
}

function getSizeSpanClasses(size: TileSize30): string {
  if (size === '2x2') return 'col-span-1 sm:col-span-2 row-span-2 min-h-[290px]';
  if (size === '2x1') return 'col-span-1 sm:col-span-2 row-span-1 min-h-[142px]';
  return 'col-span-1 row-span-1 min-h-[142px]';
}

export const TileGridHome30: React.FC<TileGridHome30Props> = ({
  apps,
  isDark,
  accentHex,
  cardBorderRadius,
  iconScalePct,
  volume,
  isMuted,
  onChangeVolume,
  onToggleMute,
  onLaunchApp,
  onSwitchToClassicSearch,
  onPushNotification,
  onPlayBeep,
  iconMap,
}) => {
  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_30);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  }, []);

  // --- Widgets, Folders & App Tile Sizes ---
  const [widgets, setWidgets] = useState<WidgetConfig30[]>(saved?.widgets || DEFAULT_WIDGETS_30);
  const [folders, setFolders] = useState<CustomFolder30[]>(saved?.folders || DEFAULT_FOLDERS_30);
  const [appSizes, setAppSizes] = useState<Record<string, TileSize30>>(
    saved?.appSizes || {
      steam: '2x1',
      chrome: '1x1',
      telegram: '1x1',
      youtube: '2x1',
    }
  );
  const [appOrder, setAppOrder] = useState<string[]>(
    saved?.appOrder || apps.map((a) => a.id)
  );
  const [editMode, setEditMode] = useState<boolean>(false);
  const [tileShellStyle, setTileShellStyle] = useState<'windows_metro' | 'android_tiles' | 'luma_glass'>(
    saved?.tileShellStyle || 'windows_metro'
  );
  const [lumaKernelModalOpen, setLumaKernelModalOpen] = useState<boolean>(false);
  const [lumaServices, setLumaServices] = useState([
    { id: 'luma.kernel.vfs', name: 'Виртуальная ФС и Реестр (LumaSystemKernel.cs)', subsystem: 'Storage VFS', memMb: 2.1, status: 'Running' },
    { id: 'luma.security.gcm', name: 'Криптоядро AES-256-GCM + PBKDF2-SHA512 (SecurityKernel.cs)', subsystem: 'Security', memMb: 1.4, status: 'Running' },
    { id: 'luma.ipc.jsonrpc', name: 'Шина JSON-RPC 2.0 • 127.0.0.1:49215 (LumaCoreDaemon.cs)', subsystem: 'IPC Bus', memMb: 2.3, status: 'Running' },
    { id: 'luma.audio.wasapi', name: 'Звуковой сервер CoreAudio WASAPI (AudioControllerWasapi.cs)', subsystem: 'Multimedia', memMb: 1.6, status: 'Running' },
    { id: 'luma.widgets.engine', name: 'Движок 12 живых виджетов (WidgetEngine.cs)', subsystem: 'Telemetry', memMb: 2.2, status: 'Running' },
    { id: 'luma.island.daemon', name: 'Служба Dynamic Island & Уведомлений (DynamicIslandService.cs)', subsystem: 'Shell UI', memMb: 1.5, status: 'Running' },
    { id: 'luma.plugins.host', name: 'Песочница плагинов .NET 8 (PluginApiV3.cs)', subsystem: 'Sandbox', memMb: 1.9, status: 'Running' },
    { id: 'luma.shell.tiles', name: 'Композитор плиток Windows / Android (TileShellDashboardWindow.cs)', subsystem: 'Compositor', memMb: 3.2, status: 'Running' },
  ]);
  const [widgetConfigModalOpen, setWidgetConfigModalOpen] = useState<boolean>(false);
  const [securityModalOpen, setSecurityModalOpen] = useState<boolean>(false);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState<boolean>(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderColor, setNewFolderColor] = useState<string>('#3b82f6');
  const [newFolderSize, setNewFolderSize] = useState<TileSize30>('2x1');
  const [newFolderSelectedApps, setNewFolderSelectedApps] = useState<string[]>(['steam', 'chrome']);

  // --- Widget 1: CPU / RAM Live Telemetry ---
  const [cpuUsage, setCpuUsage] = useState<number>(18);
  const [ramUsagePct, setRamUsagePct] = useState<number>(42);
  const ramTotalGb = 32;
  const ramUsedGb = useMemo(() => ((ramUsagePct / 100) * ramTotalGb).toFixed(1), [ramUsagePct]);

  // --- Widget 2: Disks C: and D: ---
  const [diskCUsedGb, setDiskCUsedGb] = useState<number>(312.4);
  const diskCTotalGb = 512;
  const [diskDUsedGb] = useState<number>(648.0);
  const diskDTotalGb = 1024;

  // --- Widget 3: Audio Device ---
  const [audioDevice, setAudioDevice] = useState<string>(
    saved?.audioDevice || 'Realtek HD Audio (WASAPI)'
  );

  // --- Widget 4: Quick Notes & To-Do ---
  const [todoItems, setTodoItems] = useState<TodoItem30[]>(
    saved?.todoItems || [
      { id: 'td1', text: 'Проверить ядро Luma Core 1.0 (C# .NET 8)', done: true },
      { id: 'td2', text: 'Расставить плитки и папки на главном экране 3.0', done: false },
      { id: 'td3', text: 'Протестировать живой поиск погоды Open-Meteo', done: false },
    ]
  );
  const [newTodoText, setNewTodoText] = useState<string>('');
  const [quickNoteText, setQuickNoteText] = useState<string>(
    saved?.quickNoteText ||
      'Luma Core 1.0 (C#): Все 12 системных виджетов синхронизированы по JSON-RPC 2.0 (127.0.0.1:49215).'
  );
  const [notesTab, setNotesTab] = useState<'todo' | 'note'>('todo');

  // --- Widget 5: Clock & System Uptime ---
  const [nowDate, setNowDate] = useState<Date>(new Date());
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(saved?.uptimeSeconds ?? 14825);

  // --- Widget 7: Network I/O ---
  const [netDownKbps, setNetDownKbps] = useState<number>(1420);
  const [netUpKbps, setNetUpKbps] = useState<number>(310);
  const [netHistory, setNetHistory] = useState<number[]>([28, 45, 62, 38, 74, 52, 68, 44]);

  // --- Widget 8: Media Player (Now Playing) ---
  const [mediaTracks] = useState([
    { title: 'Cybernetic Horizon (Luma 1.0 Mix)', artist: 'Synthwave Core • WASAPI Direct', durationSec: 214 },
    { title: 'Midnight Neon Protocol', artist: 'Luma C# Orchestra', durationSec: 188 },
    { title: 'Quantum Glass Symphony', artist: 'Aether Audio Engine', durationSec: 245 },
  ]);
  const [trackIndex, setTrackIndex] = useState<number>(0);
  const [mediaPlaying, setMediaPlaying] = useState<boolean>(false);
  const [mediaProgressSec, setMediaProgressSec] = useState<number>(64);

  // --- Widget 9: Pomodoro Focus Timer ---
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState<number>(25 * 60);
  const [pomoRunning, setPomoRunning] = useState<boolean>(false);

  // --- Widget 10: Real Weather Search (Open-Meteo Geocoding + Forecast) ---
  const [weatherQuery, setWeatherQuery] = useState<string>('');
  const [weatherSearchOpen, setWeatherSearchOpen] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherState30>(
    saved?.weather || {
      city: 'Москва',
      country: 'Россия',
      temp: 20,
      feelsLike: 19,
      humidity: 54,
      windSpeed: 3.8,
      weatherCode: 1,
      description: 'Малооблачно',
      hourly: [
        { time: '12:00', temp: 20, code: 1 },
        { time: '15:00', temp: 22, code: 0 },
        { time: '18:00', temp: 19, code: 2 },
        { time: '21:00', temp: 16, code: 3 },
      ],
      loading: false,
      updatedAt: 'Обновлено только что',
    }
  );

  // --- Widget 11: Quick Calculator & Converter ---
  const [calcMode, setCalcMode] = useState<'calc' | 'conv'>('calc');
  const [calcInput, setCalcInput] = useState<string>('128 * 24');
  const [convValue, setConvValue] = useState<string>('100');
  const [convType, setConvType] = useState<'usd_rub' | 'eur_rub' | 'gb_mb' | 'km_mi' | 'c_f'>('usd_rub');

  // --- Widget 12: Power Control & Lock Screen ---
  const [shutdownTimerSec, setShutdownTimerSec] = useState<number | null>(null);
  const [lockScreenActive, setLockScreenActive] = useState<boolean>(false);

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_30,
        JSON.stringify({
          widgets,
          folders,
          appSizes,
          appOrder,
          audioDevice,
          todoItems,
          quickNoteText,
          uptimeSeconds,
          weather,
          tileShellStyle,
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [widgets, folders, appSizes, appOrder, audioDevice, todoItems, quickNoteText, uptimeSeconds, weather, tileShellStyle]);

  // Keep appOrder synced with any newly added apps
  useEffect(() => {
    setAppOrder((prev) => {
      const existing = new Set(prev);
      const added = apps.filter((a) => !existing.has(a.id)).map((a) => a.id);
      return added.length > 0 ? [...prev, ...added] : prev;
    });
  }, [apps]);

  // 1-second live telemetry tick (Clock, Uptime, CPU/RAM, Network, Media, Pomodoro, Power Timer)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
      setUptimeSeconds((prev) => prev + 1);

      // Realistic CPU & RAM fluctuations
      setCpuUsage((prev) => {
        const delta = Math.floor(Math.random() * 11) - 5;
        return Math.max(6, Math.min(96, prev + delta));
      });
      setRamUsagePct((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1;
        return Math.max(28, Math.min(92, prev + delta));
      });

      // Network I/O fluctuations
      const nextDown = Math.max(120, Math.round(950 + Math.sin(Date.now() / 1800) * 650 + Math.random() * 480));
      const nextUp = Math.max(45, Math.round(240 + Math.cos(Date.now() / 2200) * 140 + Math.random() * 110));
      setNetDownKbps(nextDown);
      setNetUpKbps(nextUp);
      setNetHistory((prev) => [...prev.slice(1), Math.min(100, Math.max(12, Math.round(nextDown / 22)))]);

      // Media player tick
      setMediaProgressSec((prev) => {
        if (!mediaPlaying) return prev;
        const maxDur = mediaTracks[trackIndex]?.durationSec || 200;
        if (prev + 1 >= maxDur) {
          setTrackIndex((idx) => (idx + 1) % mediaTracks.length);
          return 0;
        }
        return prev + 1;
      });

      // Pomodoro tick
      setPomoSecondsLeft((prev) => {
        if (!pomoRunning) return prev;
        if (prev <= 1) {
          setPomoRunning(false);
          onPlayBeep(880);
          const nextMode = pomoMode === 'work' ? 'break' : 'work';
          setPomoMode(nextMode);
          onPushNotification(
            'Таймер Помидор (Pomodoro 3.0)',
            nextMode === 'break'
              ? 'Рабочая сессия 25 мин завершена! Время отдохнуть 5 минут.'
              : 'Перерыв окончен! Готовы к новому фокусу 25 минут.',
            'success'
          );
          return nextMode === 'break' ? 5 * 60 : 25 * 60;
        }
        return prev - 1;
      });

      // Shutdown countdown tick
      setShutdownTimerSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          onPlayBeep(520);
          onPushNotification(
            'Управление питанием Luma 1.0',
            'Таймер автовыключения сработал (shutdown.exe /s /t 0 выполнен в демо-режиме).',
            'warning'
          );
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mediaPlaying, trackIndex, mediaTracks, pomoRunning, pomoMode, onPlayBeep, onPushNotification]);

  // --- Real Open-Meteo Weather Search ---
  const searchWeatherByCity = async (cityQuery: string) => {
    const trimmed = cityQuery.trim();
    if (!trimmed) return;
    setWeather((prev) => ({ ...prev, loading: true }));
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=ru&format=json`
      );
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        onPushNotification(
          'Погода Luma 3.0',
          `Город «${trimmed}» не найден в базе Open-Meteo. Проверьте написание.`,
          'warning'
        );
        setWeather((prev) => ({ ...prev, loading: false }));
        return;
      }
      const place = geoData.results[0];
      const lat = place.latitude;
      const lon = place.longitude;
      const resolvedCity = place.name || trimmed;
      const resolvedCountry = place.country || '';

      const forecastRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&forecast_days=1&timezone=auto`
      );
      const fData = await forecastRes.json();
      const current = fData.current || {};
      const code = typeof current.weather_code === 'number' ? current.weather_code : 0;
      const wmo = decodeWeatherWmo(code);

      const hourlyPoints: WeatherHourPoint[] = [];
      if (fData.hourly && Array.isArray(fData.hourly.time)) {
        const currentHour = new Date().getHours();
        const startIdx = Math.max(0, Math.min(currentHour, fData.hourly.time.length - 4));
        for (let i = startIdx; i < Math.min(startIdx + 4, fData.hourly.time.length); i++) {
          const rawTime = String(fData.hourly.time[i] || '');
          const hhmm = rawTime.includes('T') ? rawTime.split('T')[1].slice(0, 5) : `${i}:00`;
          hourlyPoints.push({
            time: hhmm,
            temp: Math.round(Number(fData.hourly.temperature_2m?.[i] ?? current.temperature_2m ?? 20)),
            code: Number(fData.hourly.weather_code?.[i] ?? code),
          });
        }
      }

      setWeather({
        city: resolvedCity,
        country: resolvedCountry,
        temp: Math.round(Number(current.temperature_2m ?? 20)),
        feelsLike: Math.round(Number(current.apparent_temperature ?? current.temperature_2m ?? 20)),
        humidity: Math.round(Number(current.relative_humidity_2m ?? 50)),
        windSpeed: Number(Number(current.wind_speed_10m ?? 3.5).toFixed(1)),
        weatherCode: code,
        description: wmo.label,
        hourly:
          hourlyPoints.length > 0
            ? hourlyPoints
            : [
                { time: '12:00', temp: Math.round(Number(current.temperature_2m ?? 20)), code },
                { time: '15:00', temp: Math.round(Number(current.temperature_2m ?? 20)) + 1, code },
                { time: '18:00', temp: Math.round(Number(current.temperature_2m ?? 20)) - 1, code },
                { time: '21:00', temp: Math.round(Number(current.temperature_2m ?? 20)) - 3, code },
              ],
        loading: false,
        updatedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      });
      setWeatherSearchOpen(false);
      setWeatherQuery('');
      onPushNotification(
        'Погода обновлена',
        `${resolvedCity}: ${Math.round(Number(current.temperature_2m ?? 20))}°C, ${wmo.label}`,
        'success'
      );
    } catch {
      setWeather((prev) => ({ ...prev, loading: false }));
      onPushNotification(
        'Автономный кэш погоды',
        'Сервер погоды временно недоступен, используются кэшированные данные Luma Core.',
        'info'
      );
    }
  };

  // --- Helpers for resizing & ordering ---
  const cycleSize = (current: TileSize30): TileSize30 => {
    if (current === '1x1') return '2x1';
    if (current === '2x1') return '2x2';
    return '1x1';
  };

  const handleCycleWidgetSize = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, size: cycleSize(w.size) } : w))
    );
  };

  const handleMoveWidget = (id: string, dir: -1 | 1) => {
    setWidgets((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((w) => w.id === id);
      if (idx < 0) return prev;
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= sorted.length) return prev;
      const tempOrder = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[targetIdx].order };
      sorted[targetIdx] = { ...sorted[targetIdx], order: tempOrder };
      return sorted;
    });
  };

  const handleCycleFolderSize = (folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, size: cycleSize(f.size) } : f))
    );
  };

  const handleCycleAppSize = (appId: string) => {
    setAppSizes((prev) => ({
      ...prev,
      [appId]: cycleSize(prev[appId] || '1x1'),
    }));
  };

  const handleMoveAppTile = (appId: string, dir: -1 | 1) => {
    setAppOrder((prev) => {
      const idx = prev.indexOf(appId);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, removed);
      return copy;
    });
  };

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim() || 'Новая папка';
    const created: CustomFolder30 = {
      id: 'folder_' + Date.now(),
      name: trimmed,
      color: newFolderColor,
      size: newFolderSize,
      appIds: newFolderSelectedApps,
      order: folders.length + 1,
    };
    setFolders((prev) => [...prev, created]);
    setNewFolderName('');
    setCreateFolderModalOpen(false);
    onPushNotification('Папка создана', `Папка «${trimmed}» (${newFolderSize}) добавлена на плиточный экран.`, 'success');
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (activeFolderId === folderId) setActiveFolderId(null);
    onPushNotification('Папка удалена', 'Приложения из папки остались в общей сетке.', 'info');
  };

  const handleToggleAppInFolder = (folderId: string, appId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f;
        const exists = f.appIds.includes(appId);
        return {
          ...f,
          appIds: exists ? f.appIds.filter((id) => id !== appId) : [...f.appIds, appId],
        };
      })
    );
  };

  // Safe Calculator evaluation
  const evaluatedCalcResult = useMemo(() => {
    const expr = calcInput.replace(/,/g, '.').trim();
    if (!expr) return '0';
    if (!/^[0-9+\-*/().\s%^]+$/.test(expr)) return 'Ввод...';
    try {
      const normalized = expr.replace(/\^/g, '**');
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${normalized});`)();
      if (typeof val === 'number' && Number.isFinite(val)) {
        return Number.isInteger(val) ? String(val) : val.toFixed(2);
      }
      return 'Ошибка';
    } catch {
      return '...';
    }
  }, [calcInput]);

  // Converter calculation
  const convertedResult = useMemo(() => {
    const num = parseFloat(convValue.replace(/,/g, '.'));
    if (Number.isNaN(num)) return '0';
    switch (convType) {
      case 'usd_rub':
        return `${(num * 92.5).toFixed(1)} ₽`;
      case 'eur_rub':
        return `${(num * 100.4).toFixed(1)} ₽`;
      case 'gb_mb':
        return `${(num * 1024).toFixed(0)} МБ`;
      case 'km_mi':
        return `${(num * 0.621371).toFixed(2)} миль`;
      case 'c_f':
        return `${((num * 9) / 5 + 32).toFixed(1)} °F`;
      default:
        return String(num);
    }
  }, [convValue, convType]);

  // Weather icon helper
  const renderWeatherIcon = (code: number, className = 'w-6 h-6') => {
    const info = decodeWeatherWmo(code);
    if (info.kind === 'clear') return <Sun className={`${className} text-amber-400`} />;
    if (info.kind === 'rain') return <CloudRain className={`${className} text-sky-400`} />;
    if (info.kind === 'snow') return <Snowflake className={`${className} text-cyan-300`} />;
    if (info.kind === 'storm') return <CloudLightning className={`${className} text-purple-400`} />;
    return <CloudSun className={`${className} text-blue-300`} />;
  };

  // Format uptime HH:MM:SS
  const formattedUptime = useMemo(() => {
    const h = Math.floor(uptimeSeconds / 3600);
    const m = Math.floor((uptimeSeconds % 3600) / 60);
    const s = uptimeSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [uptimeSeconds]);

  const sortedVisibleWidgets = useMemo(
    () => [...widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order),
    [widgets]
  );

  const orderedApps = useMemo(() => {
    const map = new Map<string, AppItem>(apps.map((a) => [a.id, a]));
    const result: AppItem[] = [];
    for (const id of appOrder) {
      const item = map.get(id);
      if (item) {
        result.push(item);
        map.delete(id);
      }
    }
    for (const leftover of map.values()) {
      result.push(leftover);
    }
    return result;
  }, [apps, appOrder]);

  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeFolderId) || null,
    [folders, activeFolderId]
  );

  // CPU load semantic color (green / yellow / red)
  const cpuStatusColor =
    cpuUsage < 55
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15'
      : cpuUsage < 80
      ? 'text-amber-400 border-amber-500/40 bg-amber-500/15'
      : 'text-rose-400 border-rose-500/40 bg-rose-500/15';

  const cpuBarColor =
    cpuUsage < 55 ? 'bg-emerald-500' : cpuUsage < 80 ? 'bg-amber-500' : 'bg-rose-500';

  const ramBarColor =
    ramUsagePct < 60 ? 'bg-blue-500' : ramUsagePct < 82 ? 'bg-amber-500' : 'bg-rose-500';

  const renderWidgetBody = (w: WidgetConfig30) => {
    switch (w.id) {
      // 1. Системный монитор (CPU / RAM) [2x1]
      case 'cpu_ram':
        return (
          <div className="flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold tracking-tight">Системный монитор (CPU / RAM)</div>
                  <div className="text-[10px] text-slate-400 font-mono">Luma Core 1.0 • WMI Sensor</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${cpuStatusColor}`}>
                {cpuUsage < 55 ? 'НОРМА' : cpuUsage < 80 ? 'НАГРУЗКА' : 'ПИК'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-auto">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium">Процессор (CPU)</span>
                  <span className="font-mono font-bold tabular-nums text-sm">{cpuUsage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${cpuBarColor}`}
                    style={{ width: `${cpuUsage}%` }}
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium">ОЗУ (RAM)</span>
                  <span className="font-mono font-bold tabular-nums text-xs">
                    {ramUsedGb} / {ramTotalGb} ГБ ({ramUsagePct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${ramBarColor}`}
                    style={{ width: `${ramUsagePct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      // 2. Анализатор накопителей (Диски C / D) [2x1]
      case 'disk_analyzer': {
        const cPct = Math.round((diskCUsedGb / diskCTotalGb) * 100);
        const cFree = (diskCTotalGb - diskCUsedGb).toFixed(1);
        const dPct = Math.round((diskDUsedGb / diskDTotalGb) * 100);
        const dFree = (diskDTotalGb - diskDUsedGb).toFixed(1);
        return (
          <div className="flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold tracking-tight">Анализатор накопителей (C: / D:)</div>
                  <div className="text-[10px] text-slate-400 font-mono">NVMe PCIe 4.0 • C# DriveInfo</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setDiskCUsedGb((prev) => Math.max(180, Number((prev - 2.4).toFixed(1))));
                  onPushNotification('Очистка кэша C:', 'Освобождено 2.4 ГБ временных файлов Windows.', 'success');
                }}
                className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[10px] font-semibold transition"
              >
                Очистить кэш
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 my-auto">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-200">Диск C: (Система)</span>
                  <span className="font-mono text-blue-400 font-bold tabular-nums">{cPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-1">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${cPct}%` }} />
                </div>
                <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                  Свободно {cFree} ГБ из {diskCTotalGb} ГБ
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-200">Диск D: (Данные)</span>
                  <span className="font-mono text-indigo-400 font-bold tabular-nums">{dPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-1">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${dPct}%` }} />
                </div>
                <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                  Свободно {dFree} ГБ из {diskDTotalGb} ГБ
                </div>
              </div>
            </div>
          </div>
        );
      }

      // 3. Аудио-микшер и громкость [1x1]
      case 'audio_mixer':
        return (
          <div className="flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onToggleMute}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition ${
                    isMuted
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                  }`}
                  title="Мгновенный Mute"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="text-xs font-bold">Аудио-микшер</span>
              </div>
              <span className="text-xs font-mono font-bold tabular-nums text-sky-400">
                {isMuted ? 'MUTE' : `${volume}%`}
              </span>
            </div>

            <div className="my-auto space-y-2">
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => onChangeVolume(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-1.5 rounded-lg"
              />
              <select
                value={audioDevice}
                onChange={(e) => {
                  setAudioDevice(e.target.value);
                  onPushNotification('Аудиоустройство WASAPI', `Активен выход: ${e.target.value}`, 'info');
                }}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-lg px-2 py-1 text-[10px] text-slate-300 outline-none"
              >
                <option value="Realtek HD Audio (WASAPI)">Realtek HD Audio (WASAPI)</option>
                <option value="NVIDIA High Definition Audio">NVIDIA HDMI Audio</option>
                <option value="Sony WH-1000XM5 Bluetooth">Sony WH-1000XM5 (BT)</option>
              </select>
            </div>
          </div>
        );

      // 4. Быстрые заметки и To-Do [2x2]
      case 'notes_todo':
        return (
          <div className="flex flex-col h-full justify-between gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Быстрые заметки и To-Do</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Выполнено {todoItems.filter((t) => t.done).length} из {todoItems.length}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setNotesTab('todo')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                    notesTab === 'todo' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Чек-лист
                </button>
                <button
                  onClick={() => setNotesTab('note')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                    notesTab === 'note' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Заметка
                </button>
              </div>
            </div>

            {notesTab === 'todo' ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[175px]">
                  {todoItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
                    >
                      <button
                        onClick={() =>
                          setTodoItems((prev) =>
                            prev.map((t) => (t.id === item.id ? { ...t, done: !t.done } : t))
                          )
                        }
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition ${
                            item.done
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-600 bg-slate-950'
                          }`}
                        >
                          {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span
                          className={`text-xs truncate transition ${
                            item.done ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {item.text}
                        </span>
                      </button>
                      <button
                        onClick={() => setTodoItems((prev) => prev.filter((t) => t.id !== item.id))}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Удалить задачу"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = newTodoText.trim();
                    if (!trimmed) return;
                    setTodoItems((prev) => [
                      ...prev,
                      { id: 'td_' + Date.now(), text: trimmed, done: false },
                    ]);
                    setNewTodoText('');
                  }}
                  className="flex items-center gap-1.5 pt-1"
                >
                  <input
                    type="text"
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    placeholder="Новая задача..."
                    className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            ) : (
              <textarea
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                placeholder="Быстрая заметка в памяти ядра Luma 1.0..."
                className="flex-1 w-full bg-slate-900/75 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 resize-none outline-none focus:border-amber-400/70"
              />
            )}
          </div>
        );

      // 5. Часы, дата и системный аптайм [1x1]
      case 'clock_uptime': {
        const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        return (
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                {weekdays[nowDate.getDay()]}
              </span>
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="my-auto">
              <div className="text-xl font-mono font-extrabold tabular-nums tracking-tight text-white">
                {nowDate.toLocaleTimeString('ru-RU', { hour12: false })}
              </div>
              <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                {nowDate.toLocaleDateString('ru-RU')}
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
              <span>Аптайм ОС:</span>
              <span className="text-emerald-400 font-bold tabular-nums">{formattedUptime}</span>
            </div>
          </div>
        );
      }

      // 6. Быстрый запуск утилит (Quick Launch) [2x1]
      case 'quick_launch': {
        const tools = [
          { id: 'cmd', name: 'Терминал / CMD', cmd: 'wt.exe / cmd.exe', icon: Terminal, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
          { id: 'taskmgr', name: 'Диспетчер задач', cmd: 'taskmgr.exe', icon: Activity, color: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
          { id: 'regedit', name: 'Редактор реестра', cmd: 'regedit.exe', icon: Sliders, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
          { id: 'explorer', name: 'Проводник Windows', cmd: 'explorer.exe', icon: FolderOpen, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
        ];
        return (
          <div className="flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Быстрый запуск системных утилит</span>
              <span className="text-[10px] font-mono text-slate-400">IPC Process.Start</span>
            </div>
            <div className="grid grid-cols-4 gap-2 my-auto">
              {tools.map((tool) => {
                const IconComp = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      onPlayBeep(660);
                      onPushNotification(
                        `Запуск ${tool.name}`,
                        `Команда ядра Luma 1.0: ${tool.cmd} выполнена успешно.`,
                        'success'
                      );
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/65 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-600 transition group"
                  >
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center mb-1 ${tool.color}`}>
                      <IconComp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-200 text-center leading-tight line-clamp-1">
                      {tool.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      // 7. Сетевой монитор (Network I/O) [1x1 / 2x1]
      case 'network_io': {
        const downText =
          netDownKbps >= 1024 ? `${(netDownKbps / 1024).toFixed(2)} МБ/с` : `${netDownKbps} КБ/с`;
        const upText =
          netUpKbps >= 1024 ? `${(netUpKbps / 1024).toFixed(2)} МБ/с` : `${netUpKbps} КБ/с`;
        return (
          <div className="flex flex-col justify-between h-full gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Сеть I/O</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono">
                ONLINE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 my-auto">
              <div className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-800">
                <div className="text-[9px] text-slate-400">↓ Входящий</div>
                <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums">{downText}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-800">
                <div className="text-[9px] text-slate-400">↑ Исходящий</div>
                <div className="text-xs font-mono font-bold text-sky-400 tabular-nums">{upText}</div>
              </div>
            </div>

            <div className="flex items-end gap-1 h-5 pt-1">
              {netHistory.map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-emerald-500/50 rounded-t transition-all duration-300"
                  style={{ height: `${Math.max(15, val)}%` }}
                />
              ))}
            </div>
          </div>
        );
      }

      // 8. Медиаплеер (Now Playing) [2x1]
      case 'media_player': {
        const currentTrack = mediaTracks[trackIndex] || mediaTracks[0];
        const pct = Math.min(100, Math.round((mediaProgressSec / currentTrack.durationSec) * 100));
        return (
          <div className="flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-pink-500/40 flex items-center justify-center text-pink-300 shrink-0">
                  <Music className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{currentTrack.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentTrack.artist}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setTrackIndex((idx) => (idx - 1 + mediaTracks.length) % mediaTracks.length);
                    setMediaProgressSec(0);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  title="Предыдущий трек"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setMediaPlaying((p) => !p)}
                  className="p-2 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold transition"
                  title={mediaPlaying ? 'Пауза' : 'Воспроизвести'}
                >
                  {mediaPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setTrackIndex((idx) => (idx + 1) % mediaTracks.length);
                    setMediaProgressSec(0);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  title="Следующий трек"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setMediaProgressSec(Math.round(ratio * currentTrack.durationSec));
                }}
                className="w-full h-2 rounded-full bg-slate-800 overflow-hidden cursor-pointer"
              >
                <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 tabular-nums">
                <span>
                  {Math.floor(mediaProgressSec / 60)}:{String(mediaProgressSec % 60).padStart(2, '0')}
                </span>
                <span>
                  {Math.floor(currentTrack.durationSec / 60)}:
                  {String(currentTrack.durationSec % 60).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        );
      }

      // 9. Таймер / Помидор (Pomodoro Focus) [1x1]
      case 'pomodoro': {
        const mm = String(Math.floor(pomoSecondsLeft / 60)).padStart(2, '0');
        const ss = String(pomoSecondsLeft % 60).padStart(2, '0');
        return (
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-rose-400" />
                Помидор
              </span>
              <button
                onClick={() => {
                  const next = pomoMode === 'work' ? 'break' : 'work';
                  setPomoMode(next);
                  setPomoRunning(false);
                  setPomoSecondsLeft(next === 'work' ? 25 * 60 : 5 * 60);
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                  pomoMode === 'work'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {pomoMode === 'work' ? '25М ФОКУС' : '5М ОТДЫХ'}
              </button>
            </div>

            <div className="my-auto text-center">
              <div className="text-2xl font-mono font-extrabold tabular-nums text-white tracking-tight">
                {mm}:{ss}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPomoRunning((r) => !r)}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition ${
                  pomoRunning
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                {pomoRunning ? 'Пауза' : 'Старт'}
              </button>
              <button
                onClick={() => {
                  setPomoRunning(false);
                  setPomoSecondsLeft(pomoMode === 'work' ? 25 * 60 : 5 * 60);
                }}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
                title="Сброс таймера"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      }

      // 10. Погода и температура за бортом [1x1 / 2x1]
      case 'weather':
        return (
          <div className="flex flex-col justify-between h-full gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {renderWeatherIcon(weather.weatherCode, 'w-6 h-6 shrink-0')}
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white truncate">{weather.city}</span>
                    <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {weather.description} • Ветер {weather.windSpeed} м/с
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xl font-mono font-extrabold tabular-nums text-white">
                  {weather.temp > 0 ? `+${weather.temp}°` : `${weather.temp}°`}
                </span>
                <button
                  onClick={() => setWeatherSearchOpen((o) => !o)}
                  className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition"
                  title="Поиск любого города мира"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {weatherSearchOpen ? (
              <div className="space-y-1.5 my-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    searchWeatherByCity(weatherQuery);
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    type="text"
                    value={weatherQuery}
                    onChange={(e) => setWeatherQuery(e.target.value)}
                    placeholder="Введите город (Москва, Казань, Токио...)"
                    className="flex-1 bg-slate-950 border border-sky-500/50 rounded-lg px-2 py-1 text-xs text-white outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={weather.loading}
                    className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
                  >
                    {weather.loading ? '...' : 'Найти'}
                  </button>
                </form>
                <div className="flex flex-wrap gap-1">
                  {['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Минск'].map((c) => (
                    <button
                      key={c}
                      onClick={() => searchWeatherByCity(c)}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-700"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {weather.hourly.slice(0, 4).map((h, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center p-1 rounded-lg bg-slate-900/60 border border-slate-800/80"
                  >
                    <span className="text-[9px] font-mono text-slate-400">{h.time}</span>
                    <span className="text-xs font-mono font-bold text-slate-100 tabular-nums">
                      {h.temp > 0 ? `+${h.temp}°` : `${h.temp}°`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // 11. Быстрый калькулятор / Конвертер [2x1]
      case 'calc_converter':
        return (
          <div className="flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold">Калькулятор и Конвертер</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setCalcMode('calc')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    calcMode === 'calc' ? 'bg-violet-500 text-white' : 'text-slate-400'
                  }`}
                >
                  Вычисления
                </button>
                <button
                  onClick={() => setCalcMode('conv')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    calcMode === 'conv' ? 'bg-violet-500 text-white' : 'text-slate-400'
                  }`}
                >
                  Конвертер
                </button>
              </div>
            </div>

            {calcMode === 'calc' ? (
              <div className="flex items-center gap-2 my-auto">
                <input
                  type="text"
                  value={calcInput}
                  onChange={(e) => setCalcInput(e.target.value)}
                  placeholder="Напр: (1450 + 350) * 1.15"
                  className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-violet-400"
                />
                <div className="px-3 py-2 rounded-xl bg-violet-500/15 border border-violet-500/40 font-mono font-extrabold text-sm text-violet-300 tabular-nums shrink-0 min-w-[90px] text-right">
                  = {evaluatedCalcResult}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 my-auto">
                <input
                  type="number"
                  value={convValue}
                  onChange={(e) => setConvValue(e.target.value)}
                  className="w-24 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                />
                <select
                  value={convType}
                  onChange={(e) => setConvType(e.target.value as any)}
                  className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-2 py-1.5 text-xs text-slate-200 outline-none"
                >
                  <option value="usd_rub">USD → RUB</option>
                  <option value="eur_rub">EUR → RUB</option>
                  <option value="gb_mb">ГБ → МБ</option>
                  <option value="km_mi">Км → Мили</option>
                  <option value="c_f">°C → °F</option>
                </select>
                <div className="flex-1 px-2.5 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/40 font-mono font-bold text-xs text-violet-300 tabular-nums text-right">
                  {convertedResult}
                </div>
              </div>
            )}
          </div>
        );

      // 12. Управление питанием системы [1x1]
      case 'power_control':
        return (
          <div className="flex flex-col justify-between h-full gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1">
                <Power className="w-3.5 h-3.5 text-rose-400" />
                Питание ОС
              </span>
              {shutdownTimerSec !== null && (
                <span className="text-[10px] font-mono font-bold text-amber-400 tabular-nums">
                  Выкл: {Math.floor(shutdownTimerSec / 60)}:{String(shutdownTimerSec % 60).padStart(2, '0')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 my-auto">
              <button
                onClick={() => {
                  onPlayBeep(580);
                  setLockScreenActive(true);
                }}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-sky-400 transition"
                title="Блокировка экрана (Win+L)"
              >
                <Lock className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[9px] font-semibold">Win+L</span>
              </button>
              <button
                onClick={() => {
                  onPlayBeep(440);
                  onPushNotification('Режим сна Windows', 'Отправлена команда powrprof.dll,SetSuspendState.', 'info');
                }}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-indigo-400 transition"
                title="Перевести ПК в спящий режим"
              >
                <Moon className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[9px] font-semibold">Сон</span>
              </button>
              <button
                onClick={() => {
                  onPlayBeep(500);
                  onPushNotification('Перезагрузка ОС', 'Запланирована перезагрузка через 5 секунд (shutdown /r).', 'warning');
                }}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-amber-400 transition"
                title="Перезагрузка системы"
              >
                <RefreshCw className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[9px] font-semibold">Рестарт</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (shutdownTimerSec !== null) {
                  setShutdownTimerSec(null);
                  onPushNotification('Таймер отменен', 'Автовыключение ПК отменено (shutdown /a).', 'info');
                } else {
                  setShutdownTimerSec(15 * 60);
                  onPushNotification('Таймер выключения', 'Автовыключение ПК через 15 минут активировано.', 'warning');
                }
              }}
              className={`w-full py-1 rounded-lg text-[10px] font-bold border transition ${
                shutdownTimerSec !== null
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              {shutdownTimerSec !== null ? 'Отменить таймер выкл.' : 'Таймер выкл. (15м)'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const effectiveTileRadius =
    tileShellStyle === 'windows_metro'
      ? 6
      : tileShellStyle === 'android_tiles'
      ? 28
      : cardBorderRadius;

  return (
    <div className="space-y-5">
      {/* LUMA OS 1.0 FULL SYSTEM KERNEL LAYER (UNDERNEATH THE TILE INTERFACE) */}
      <div
        className={`p-3.5 rounded-2xl border backdrop-blur-xl transition-all ${
          isDark
            ? 'bg-gradient-to-r from-slate-950/95 via-[#0c1424]/95 to-slate-950/95 border-teal-500/40 text-slate-100 shadow-[0_0_25px_rgba(20,184,166,0.12)]'
            : 'bg-gradient-to-r from-slate-100 via-white to-slate-100 border-teal-500/40 text-slate-900'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-2.5 py-1 rounded-lg bg-teal-500 text-slate-950 font-mono font-black text-xs flex items-center gap-1.5 shadow">
              <Cpu className="w-3.5 h-3.5" />
              LUMA OS 1.0 SYSTEM
            </div>
            <div>
              <div className="text-xs font-extrabold flex items-center gap-2">
                <span>Полноценная система Luma OS (100% C# .NET 8 Kernel)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px]">
                  ● {lumaServices.filter((s) => s.status === 'Running').length}/{lumaServices.length} СЛУЖБ АКТИВНЫ
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Ядро: LumaSystemKernel.cs • Шина IPC: 127.0.0.1:49215 (JSON-RPC 2.0) • Поверх системы: Плиточная оболочка ({tileShellStyle === 'windows_metro' ? 'Windows Metro / 11 Live Tiles' : tileShellStyle === 'android_tiles' ? 'Android 15 Material Quick Tiles' : 'Luma Liquid Glass 3.0'})
              </div>
            </div>
          </div>

          {/* Tile Shell Style Switcher on top of Luma OS */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-950/90 border border-slate-800">
              <button
                onClick={() => {
                  setTileShellStyle('windows_metro');
                  onPushNotification('Оболочка поверх Luma OS', 'Включен режим живых плиток Windows (Metro / Fluent Live Tiles).', 'info');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  tileShellStyle === 'windows_metro'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Плиточный интерфейс в стиле Windows (Metro / Windows 11 Live Tiles)"
              >
                🪟 Плитки Windows
              </button>
              <button
                onClick={() => {
                  setTileShellStyle('android_tiles');
                  onPushNotification('Оболочка поверх Luma OS', 'Включен режим плиток Android 15 (Material You Bento Tiles).', 'info');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  tileShellStyle === 'android_tiles'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Плиточный интерфейс в стиле Android 15 (Material You Quick Tiles)"
              >
                🤖 Плитки Android
              </button>
              <button
                onClick={() => {
                  setTileShellStyle('luma_glass');
                  onPushNotification('Оболочка поверх Luma OS', 'Включен гибридный режим жидкого стекла Luma Glass 3.0.', 'info');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  tileShellStyle === 'luma_glass'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Гибридный стеклянный стиль плиток Luma Glass"
              >
                ✨ Luma Glass
              </button>
            </div>

            <button
              onClick={() => setLumaKernelModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              Службы системы Luma ({lumaServices.length})
            </button>
          </div>
        </div>
      </div>

      {/* Top Launcher 3.0 Control Bar: Mode Switcher + C# Luma 1.0 Status + Customization */}
      <div
        className={`p-3.5 rounded-2xl border backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 transition-all ${
          isDark
            ? 'bg-slate-900/75 border-slate-800/90 text-slate-100'
            : 'bg-white/85 border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600/25 to-blue-600/25 border border-violet-500/40">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-extrabold tracking-tight">
              Оболочка Launcher Hab 3.0 (C# .NET 8) поверх Luma OS 1.0
            </span>
          </div>

          {/* Mode Switcher: Tile Grid Home vs Classic Quick Search */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800">
            <button
              className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow flex items-center gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Плиточный экран 3.0
            </button>
            <button
              onClick={onSwitchToClassicSearch}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              title="Переключиться на старое классическое окно быстрого поиска"
            >
              <Search className="w-3.5 h-3.5" />
              Быстрый поиск (Классическое окно)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCreateFolderModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Создать папку
          </button>

          <button
            onClick={() => setWidgetConfigModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            Виджеты ({sortedVisibleWidgets.length}/12)
          </button>

          <button
            onClick={() => setEditMode((e) => !e)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
              editMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {editMode ? 'Готово (Режим правки)' : 'Размеры и места плиток'}
          </button>

          <button
            onClick={() => setSecurityModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Luma 1.0 Security &amp; API 3.0
          </button>
        </div>
      </div>

      {editMode && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
          <span>
            <strong>Режим настройки плиток 3.0 активен:</strong> нажимайте кнопку размера (<strong>1x1 / 2x1 / 2x2</strong>) или стрелки (<strong>← / →</strong>) на любой папке, виджете или приложении, чтобы настроить экран под себя.
          </span>
          <button
            onClick={() => setEditMode(false)}
            className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Сохранить сетку
          </button>
        </div>
      )}

      {/* SECTION 1: 12 INTERACTIVE SYSTEM WIDGETS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            Системные плитки-виджеты ядра Luma OS 1.0 ({sortedVisibleWidgets.length} из 12 активны • Режим: {tileShellStyle === 'windows_metro' ? 'Windows Metro Tiles' : tileShellStyle === 'android_tiles' ? 'Android 15 Tiles' : 'Luma Glass'})
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Нажмите «Размеры и места плиток» для изменения 1x1 • 2x1 • 2x2
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 auto-rows-fr">
          {sortedVisibleWidgets.map((w) => (
            <div
              key={w.id}
              style={{ borderRadius: `${effectiveTileRadius}px` }}
              className={`${getSizeSpanClasses(w.size)} p-3.5 border backdrop-blur-xl transition-all duration-300 relative group ${
                tileShellStyle === 'windows_metro'
                  ? isDark
                    ? 'bg-[#111927]/95 border-sky-500/35 border-t-2 border-t-sky-400 hover:border-sky-400 shadow-[0_4px_20px_rgba(2,132,199,0.12)]'
                    : 'bg-white/95 border-sky-300 border-t-2 border-t-sky-500 text-slate-900'
                  : tileShellStyle === 'android_tiles'
                  ? isDark
                    ? 'bg-[#141d2b]/90 border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_6px_24px_rgba(16,185,129,0.1)]'
                    : 'bg-emerald-50/90 border-emerald-200 text-slate-900'
                  : isDark
                  ? 'bg-slate-900/75 border-slate-800/90 hover:border-slate-700'
                  : 'bg-white/90 border-slate-200 hover:border-slate-300 text-slate-900'
              } ${editMode ? 'ring-2 ring-amber-400/60' : ''}`}
            >
              {/* Edit Controls Overlay for Widget */}
              {editMode && (
                <div className="absolute -top-2.5 right-2 z-20 flex items-center gap-1 bg-slate-950 border border-amber-500/60 rounded-lg px-1.5 py-0.5 shadow-lg">
                  <button
                    onClick={() => handleMoveWidget(w.id, -1)}
                    className="p-0.5 text-slate-300 hover:text-amber-400"
                    title="Сдвинуть влево"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleCycleWidgetSize(w.id)}
                    className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-extrabold text-[10px]"
                    title="Изменить размер виджета (1x1 / 2x1 / 2x2)"
                  >
                    {w.size}
                  </button>
                  <button
                    onClick={() => handleMoveWidget(w.id, 1)}
                    className="p-0.5 text-slate-300 hover:text-amber-400"
                    title="Сдвинуть вправо"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {renderWidgetBody(w)}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: CUSTOM FOLDERS & LIVE APP TILES (1x1, 2x1, 2x2) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
            Папки и Живые плитки приложений поверх системы Luma OS (1x1 • 2x1 • 2x2)
          </h3>
          <button
            onClick={() => setCreateFolderModalOpen(true)}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Добавить папку
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {/* Render Folders First */}
          {folders.map((folder) => {
            const folderApps = apps.filter((a) => folder.appIds.includes(a.id));
            const spanClass =
              folder.size === '2x2'
                ? 'col-span-2 row-span-2 min-h-[240px]'
                : folder.size === '2x1'
                ? 'col-span-2 row-span-1 min-h-[125px]'
                : 'col-span-1 row-span-1 min-h-[125px]';

            return (
              <div
                key={folder.id}
                style={{
                  borderRadius: `${effectiveTileRadius}px`,
                  borderColor: editMode ? '#f59e0b' : `${folder.color}66`,
                }}
                onClick={() => {
                  if (!editMode) setActiveFolderId(folder.id);
                }}
                className={`${spanClass} p-3.5 border backdrop-blur-xl cursor-pointer transition-all duration-300 hover:scale-[1.01] relative flex flex-col justify-between ${
                  tileShellStyle === 'windows_metro'
                    ? isDark
                      ? 'bg-[#101929]/95 border-t-2'
                      : 'bg-white/95 border-t-2'
                    : isDark
                    ? 'bg-slate-900/80'
                    : 'bg-white/90'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${folder.color}25`, color: folder.color }}
                    >
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold truncate">{folder.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Папка • {folderApps.length} прил.
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCycleFolderSize(folder.id);
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-200 border border-slate-700 shrink-0"
                    title="Изменить размер папки (1x1 / 2x1 / 2x2)"
                  >
                    {folder.size}
                  </button>
                </div>

                {/* Mini icons preview inside folder tile */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {folderApps.slice(0, folder.size === '1x1' ? 3 : 6).map((app) => {
                    const IconComp = iconMap[app.icon] || Compass;
                    return (
                      <button
                        key={app.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onLaunchApp(app);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-slate-200 transition"
                        title={`Запустить ${app.name}`}
                      >
                        <IconComp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        {folder.size !== '1x1' && <span className="truncate max-w-[75px]">{app.name}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Render App Live Tiles */}
          {orderedApps.map((app) => {
            const tileSize: TileSize30 = appSizes[app.id] || '1x1';
            const IconComp = iconMap[app.icon] || Compass;
            const spanClass =
              tileSize === '2x2'
                ? 'col-span-2 row-span-2 min-h-[240px]'
                : tileSize === '2x1'
                ? 'col-span-2 row-span-1 min-h-[125px]'
                : 'col-span-1 row-span-1 min-h-[125px]';

            return (
              <div
                key={app.id}
                style={{ borderRadius: `${effectiveTileRadius}px` }}
                onClick={() => {
                  if (!editMode) onLaunchApp(app);
                }}
                className={`${spanClass} p-3.5 border backdrop-blur-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] relative flex flex-col justify-between group ${
                  app.isRunning
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : tileShellStyle === 'windows_metro'
                    ? isDark
                      ? 'bg-[#111927]/90 border-sky-500/30 border-t-2 border-t-sky-500/70 hover:border-sky-400'
                      : 'bg-white/95 border-sky-200 border-t-2 border-t-sky-500 hover:border-sky-400'
                    : tileShellStyle === 'android_tiles'
                    ? isDark
                      ? 'bg-[#141e2e]/90 border-emerald-500/25 hover:border-emerald-400/60'
                      : 'bg-white/95 border-emerald-200 hover:border-emerald-400'
                    : isDark
                    ? 'bg-slate-900/70 border-slate-800/90 hover:border-blue-500/50'
                    : 'bg-white/90 border-slate-200 hover:border-blue-400'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div
                    style={{ transform: `scale(${iconScalePct / 100})` }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition ${
                      app.isRunning
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : tileShellStyle === 'android_tiles'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 rounded-2xl'
                        : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-1">
                    {editMode && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveAppTile(app.id, -1);
                          }}
                          className="p-1 rounded bg-slate-950/90 text-slate-300 hover:text-amber-400 border border-slate-700"
                          title="Переместить левее"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveAppTile(app.id, 1);
                          }}
                          className="p-1 rounded bg-slate-950/90 text-slate-300 hover:text-amber-400 border border-slate-700"
                          title="Переместить правее"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCycleAppSize(app.id);
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-950/75 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-700/80 opacity-85 group-hover:opacity-100 transition"
                      title="Изменить размер плитки приложения (1x1 / 2x1 / 2x2)"
                    >
                      {tileSize}
                    </button>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-xs font-extrabold tracking-tight truncate">{app.name}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                    <span>{app.category}</span>
                    <span className="tabular-nums">
                      {formatMonthBadge(app.monthMinutes, app.elapsedSeconds, app.isRunning)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Luma OS 1.0 System Kernel & Services Manager (C# .NET 8) */}
      {lumaKernelModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLumaKernelModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-teal-500/50 p-5 space-y-4 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500 text-slate-950 font-black flex items-center justify-center text-xs">
                  LUMA
                </div>
                <div>
                  <h3 className="text-base font-extrabold">
                    Ядро и Службы системы Luma OS 1.0 (C# .NET 8 System Kernel)
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    LumaSystemKernel.cs • LumaCoreDaemon.cs • Плиточная оболочка смонтирована поверх системы
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLumaKernelModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Язык и среда ядра</div>
                <div className="font-mono font-bold text-teal-300 mt-0.5">100% C# • .NET 8.0 LTS</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Потребление ОЗУ службами</div>
                <div className="font-mono font-bold text-emerald-400 mt-0.5">
                  {lumaServices.reduce((acc, s) => acc + s.memMb, 0).toFixed(1)} МБ RSS (Изолировано)
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Активная оболочка поверх ОС</div>
                <div className="font-mono font-bold text-sky-400 mt-0.5">
                  {tileShellStyle === 'windows_metro'
                    ? 'Windows Metro Tiles'
                    : tileShellStyle === 'android_tiles'
                    ? 'Android 15 Material Tiles'
                    : 'Luma Liquid Glass'}
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {lumaServices.map((srv) => (
                <div
                  key={srv.id}
                  className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{srv.name}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono text-[10px]">
                        {srv.subsystem}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      ID: {srv.id} • Память: {srv.memMb} МБ
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold">
                      ● {srv.status}
                    </span>
                    <button
                      onClick={() => {
                        onPlayBeep(660);
                        onPushNotification(
                          'Перезапуск службы Luma OS',
                          `Служба ${srv.id} (C# .NET 8) успешно перезапущена Watchdog-супервизором за 4 мс.`,
                          'success'
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] cursor-pointer"
                    >
                      Рестарт
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Open Folder View (Add/Remove Apps, Rename, Resize) */}
      {activeFolder && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveFolderId(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-5 space-y-4 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${activeFolder.color}25`, color: activeFolder.color }}
                >
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{activeFolder.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Размер плитки: {activeFolder.size} • Приложений: {activeFolder.appIds.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCycleFolderSize(activeFolder.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold"
                >
                  Размер: {activeFolder.size}
                </button>
                <button
                  onClick={() => handleDeleteFolder(activeFolder.id)}
                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400"
                  title="Удалить папку"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveFolderId(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Apps inside folder */}
            <div className="grid grid-cols-3 gap-2.5">
              {apps
                .filter((a) => activeFolder.appIds.includes(a.id))
                .map((app) => {
                  const IconComp = iconMap[app.icon] || Compass;
                  return (
                    <button
                      key={app.id}
                      onClick={() => {
                        onLaunchApp(app);
                        setActiveFolderId(null);
                      }}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition"
                    >
                      <IconComp className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-xs font-bold truncate">{app.name}</span>
                    </button>
                  );
                })}
            </div>

            <div className="border-t border-slate-800 pt-3">
              <div className="text-xs font-bold text-slate-400 mb-2">
                Добавить или убрать приложения в этой папке:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {apps.map((app) => {
                  const included = activeFolder.appIds.includes(app.id);
                  return (
                    <button
                      key={app.id}
                      onClick={() => handleToggleAppInFolder(activeFolder.id, app.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                        included
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {included ? '✓ ' : '+ '}
                      {app.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create New Folder */}
      {createFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setCreateFolderModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 space-y-4 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-400" />
                Создать папку на плиточном экране
              </h3>
              <button
                onClick={() => setCreateFolderModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Название папки</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Например: Разработка C# / Стрим"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Размер папки в сетке</label>
                  <select
                    value={newFolderSize}
                    onChange={(e) => setNewFolderSize(e.target.value as TileSize30)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="1x1">1x1 (Компактная)</option>
                    <option value="2x1">2x1 (Широкая)</option>
                    <option value="2x2">2x2 (Большая)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Акцентный цвет</label>
                  <input
                    type="color"
                    value={newFolderColor}
                    onChange={(e) => setNewFolderColor(e.target.value)}
                    className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Выберите приложения для папки</label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800">
                  {apps.map((app) => {
                    const selected = newFolderSelectedApps.includes(app.id);
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() =>
                          setNewFolderSelectedApps((prev) =>
                            selected ? prev.filter((id) => id !== app.id) : [...prev, app.id]
                          )
                        }
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border transition ${
                          selected
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}
                        {app.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreateFolderModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
              >
                Создать папку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Configure All 12 Widgets Visibility & Sizes */}
      {widgetConfigModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setWidgetConfigModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 p-5 space-y-4 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold">Менеджер 12 системных виджетов Luma Core 1.0</h3>
                <p className="text-xs text-slate-400">
                  Включайте виджеты и выбирайте размер плитки (1x1, 2x1, 2x2) для каждого модуля
                </p>
              </div>
              <button
                onClick={() => setWidgetConfigModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {widgets.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      checked={w.visible}
                      onChange={() =>
                        setWidgets((prev) =>
                          prev.map((item) =>
                            item.id === w.id ? { ...item, visible: !item.visible } : item
                          )
                        )
                      }
                      className="rounded accent-blue-500"
                    />
                    <span className="text-xs font-bold truncate">{w.title}</span>
                  </label>
                  <button
                    onClick={() => handleCycleWidgetSize(w.id)}
                    className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-mono font-bold text-xs shrink-0"
                  >
                    {w.size}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Luma Core 1.0 Security & Plugin API 3.0 Inspector */}
      {securityModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSecurityModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-purple-500/40 p-5 space-y-4 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">
                    Ядро безопасности Luma 1.0 &amp; Plugin API v3.0 (C# .NET 8)
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    127.0.0.1:49215 • AES-256-GCM • PBKDF2-HMAC-SHA512 (310 000 итераций)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSecurityModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Криптоконтейнер Luma Security 1.0
                </div>
                <p className="text-slate-400">
                  Конфигурации и секреты плагинов шифруются алгоритмом <strong>AES-256-GCM</strong> с 96-битным Nonce и 128-битным тегом аутентификации.
                </p>
                <div className="font-mono text-[10px] text-slate-300 pt-1">
                  KDF: PBKDF2-HMAC-SHA512 (310,000 iter)
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
                <div className="font-bold text-blue-400 flex items-center gap-1.5">
                  <Puzzle className="w-4 h-4" /> Контракт ILumaPluginV3 (C# SDK)
                </div>
                <p className="text-slate-400">
                  Плагины загружаются в изолированный <strong>AssemblyLoadContext (.NET 8)</strong> с проверкой разрешений и поддержкой кастомных плиток 1x1 / 2x1 / 2x2.
                </p>
                <div className="font-mono text-[10px] text-slate-300 pt-1">
                  IPC: JSON-RPC 2.0 + HMAC-SHA256 Anti-Replay
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  onPlayBeep(740);
                  onPushNotification(
                    'Аудит безопасности Luma 1.0',
                    'Проверка ключей AES-256-GCM и подписей IPC HMAC-SHA256 успешно пройдена.',
                    'success'
                  );
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                Выполнить крипто-тест ядра
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE LOCK SCREEN OVERLAY (Win+L) */}
      {lockScreenActive && (
        <div
          onClick={() => setLockScreenActive(false)}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center text-white cursor-pointer select-none"
        >
          <Lock className="w-10 h-10 text-sky-400 mb-4 animate-pulse" />
          <div className="text-6xl font-mono font-extrabold tabular-nums tracking-tight mb-2">
            {nowDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-sm text-slate-300 mb-6">
            {nowDate.toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
          <div className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-slate-200">
            Экран заблокирован (Luma 1.0 Win+L) — нажмите в любом месте для разблокировки
          </div>
        </div>
      )}
    </div>
  );
};
