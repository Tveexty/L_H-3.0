import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Clipboard,
  CloudSun,
  Cpu,
  Crown,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Music,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ScanSearch,
  Settings2,
  Sun,
  Timer,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

export type ModularBlockId =
  | 'superdevice'
  | 'circle_search'
  | 'weather'
  | 'currency'
  | 'telemetry'
  | 'media'
  | 'clipboard'
  | 'pomodoro'
  | 'workspaces'
  | 'brightness'
  | 'volume'
  | 'photo_studio'
  | 'edition';

export interface ModularPanelConfig {
  enabled: boolean;
  position: 'top' | 'bottom';
  scrollActions: boolean;
  showBuilderButton?: boolean;
  order: ModularBlockId[];
  hidden: ModularBlockId[];
}

export const ALL_MODULAR_BLOCKS: { id: ModularBlockId; label: string; scrollHint: string }[] = [
  { id: 'superdevice', label: 'Суперустройство', scrollHint: 'Открыть экосистему' },
  { id: 'circle_search', label: 'Circle to Search', scrollHint: 'Ctrl+Shift+Space · Поиск по экрану' },
  { id: 'weather', label: 'Погода', scrollHint: 'Колесо: вид погоды' },
  { id: 'currency', label: 'Курсы валют', scrollHint: 'Колесо: USD/EUR/CNY/BTC' },
  { id: 'telemetry', label: 'CPU / GPU / RAM', scrollHint: 'Колесо: режим метрик' },
  { id: 'media', label: 'Активный трек', scrollHint: 'Колесо: пред./след. трек' },
  { id: 'clipboard', label: 'Буфер обмена', scrollHint: 'Колесо: листать буфер' },
  { id: 'pomodoro', label: 'Pomodoro-таймер', scrollHint: 'Колесо: ±1 мин' },
  { id: 'workspaces', label: 'Виртуальные столы', scrollHint: 'Колесо: перекл. столов' },
  { id: 'brightness', label: 'Яркость', scrollHint: 'Колесо: ±5% яркости' },
  { id: 'volume', label: 'Звук', scrollHint: 'Колесо: ±4% громкости' },
  { id: 'photo_studio', label: 'Фоторедактор', scrollHint: 'Luma Photo Studio' },
  { id: 'edition', label: 'Редакция Base/Pro', scrollHint: 'Права и опции' },
];

export const DEFAULT_MODULAR_PANEL_CONFIG: ModularPanelConfig = {
  enabled: true,
  position: 'top',
  scrollActions: true,
  showBuilderButton: true,
  order: [
    'superdevice',
    'circle_search',
    'weather',
    'currency',
    'telemetry',
    'media',
    'clipboard',
    'pomodoro',
    'workspaces',
    'brightness',
    'volume',
    'edition',
  ],
  hidden: ['photo_studio'],
};

interface MarketRateItem {
  code: string;
  pair: string;
  symbol: string;
  value: number;
  change: number;
  unit: string;
}

interface LumaModularPanelBarProps {
  config: ModularPanelConfig;
  onChangeConfig: (next: ModularPanelConfig) => void;
  isDark: boolean;
  isPro: boolean;
  isAdmin: boolean;
  visualNoiseHidden?: boolean;
  // Live system signals
  weatherTemp?: string;
  weatherDesc?: string;
  weatherCity?: string;
  cpuLoad: number;
  gpuLoad: number;
  ramLoad: number;
  mediaTitle?: string;
  mediaPlaying?: boolean;
  onMediaAction: (action: 'play_pause' | 'next' | 'prev') => void;
  clipboardTexts: string[];
  onOpenClipboard: () => void;
  onCopyText: (t: string) => void;
  activeDesktop: number;
  desktopCount: number;
  onSwitchDesktop: (n: number) => void;
  brightness: number;
  onBrightnessChange: (b: number) => void;
  volume: number;
  muted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  onOpenSuperDevice: () => void;
  onOpenCircleSearch?: () => void;
  onOpenPhotoStudio: () => void;
  onOpenTaskMgr: () => void;
  onOpenEditionSettings: () => void;
  onPushToast: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
}

export const LumaModularPanelBar: React.FC<LumaModularPanelBarProps> = ({
  config,
  onChangeConfig,
  isDark,
  isPro,
  isAdmin,
  visualNoiseHidden = false,
  weatherTemp = '+21°',
  weatherDesc = 'Ясно',
  weatherCity = 'Luma',
  cpuLoad,
  gpuLoad,
  ramLoad,
  mediaTitle = '',
  mediaPlaying = false,
  onMediaAction,
  clipboardTexts,
  onOpenClipboard,
  onCopyText,
  activeDesktop,
  desktopCount,
  onSwitchDesktop,
  brightness,
  onBrightnessChange,
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  onOpenSuperDevice,
  onOpenCircleSearch,
  onOpenPhotoStudio,
  onOpenTaskMgr,
  onOpenEditionSettings,
  onPushToast,
}) => {
  const [rates, setRates] = useState<MarketRateItem[]>([
    { code: 'USD', pair: 'USD/RUB', symbol: '$', value: 91.45, change: 0.34, unit: '₽' },
    { code: 'EUR', pair: 'EUR/RUB', symbol: '€', value: 98.8, change: -0.18, unit: '₽' },
    { code: 'CNY', pair: 'CNY/RUB', symbol: '¥', value: 12.62, change: 0.12, unit: '₽' },
    { code: 'BTC', pair: 'BTC/USD', symbol: '₿', value: 92450, change: 1.85, unit: '$' },
  ]);
  const [rateIdx, setRateIdx] = useState(0);
  const [weatherMode, setWeatherMode] = useState<0 | 1>(0);
  const [telemetryMode, setTelemetryMode] = useState<0 | 1>(0);
  const [clipIdx, setClipIdx] = useState(0);

  // Built-in Pomodoro Timer
  const [pomoMinutes, setPomoMinutes] = useState(25);
  const [pomoSecLeft, setPomoSecLeft] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoBreak, setPomoBreak] = useState(false);

  // Drag & Drop + Customizer Popover
  const [dragBlock, setDragBlock] = useState<ModularBlockId | null>(null);
  const [dragOverBlock, setDragOverBlock] = useState<ModularBlockId | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const wheelLockRef = useRef<number>(0);

  useEffect(() => {
    let active = true;
    const loadRates = async () => {
      try {
        const r = await fetch('/api/kernel/market/rates');
        if (r.ok && active) {
          const d = await r.json();
          if (d?.ok && Array.isArray(d.rates) && d.rates.length > 0) {
            setRates(d.rates);
          }
        }
      } catch {
        // fallback already loaded
      }
    };
    void loadRates();
    const id = window.setInterval(() => void loadRates(), 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!pomoRunning) return;
    const id = window.setInterval(() => {
      setPomoSecLeft((prev) => {
        if (prev <= 1) {
          const nextBreak = !pomoBreak;
          setPomoBreak(nextBreak);
          onPushToast(
            'Pomodoro-таймер',
            nextBreak ? 'Фокус завершён! Пора на 5-минутный перерыв.' : 'Перерыв окончен! Возвращаемся к фокусу.',
            'success'
          );
          return (nextBreak ? 5 : pomoMinutes) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [pomoRunning, pomoBreak, pomoMinutes, onPushToast]);

  if (!config.enabled) return null;

  const canWheel = () => {
    if (!config.scrollActions) return false;
    const now = Date.now();
    if (now - wheelLockRef.current < 85) return false;
    wheelLockRef.current = now;
    return true;
  };

  const visibleBlocks = config.order.filter((id) => !config.hidden.includes(id));

  const moveBlock = (from: ModularBlockId, to: ModularBlockId) => {
    if (from === to) return;
    const next = [...config.order];
    const fi = next.indexOf(from);
    const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return;
    next.splice(fi, 1);
    next.splice(ti, 0, from);
    onChangeConfig({ ...config, order: next });
  };

  const toggleBlockVisible = (id: ModularBlockId) => {
    const isHidden = config.hidden.includes(id);
    const nextHidden = isHidden ? config.hidden.filter((x) => x !== id) : [...config.hidden, id];
    const nextOrder = config.order.includes(id) ? config.order : [...config.order, id];
    onChangeConfig({ ...config, order: nextOrder, hidden: nextHidden });
  };

  const curRate = rates[rateIdx % rates.length] || rates[0];
  const curClip = clipboardTexts[clipIdx % Math.max(1, clipboardTexts.length)] || 'Буфер пуст';
  const mm = String(Math.floor(pomoSecLeft / 60)).padStart(2, '0');
  const ss = String(pomoSecLeft % 60).padStart(2, '0');

  const pillBase = isDark
    ? 'bg-[#1a1f2b]/78 hover:bg-[#232a3b]/90 border-white/12 text-white'
    : 'bg-white/82 hover:bg-white border-slate-200/90 text-slate-900';

  const renderBlock = (id: ModularBlockId) => {
    const isOver = dragOverBlock === id && dragBlock !== id;
    const commonProps = {
      draggable: true,
      onDragStart: () => setDragBlock(id),
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverBlock(id);
      },
      onDragLeave: () => setDragOverBlock((cur) => (cur === id ? null : cur)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (dragBlock) moveBlock(dragBlock, id);
        setDragBlock(null);
        setDragOverBlock(null);
      },
      onDragEnd: () => {
        setDragBlock(null);
        setDragOverBlock(null);
      },
    };

    const wrapCls = `h-7 px-2.5 rounded-full border backdrop-blur-2xl inline-flex items-center gap-1.5 text-[11px] font-medium cursor-pointer transition-all shrink-0 shadow-sm ${pillBase} ${
      isOver ? 'ring-2 ring-blue-400 scale-105' : ''
    }`;

    switch (id) {
      case 'superdevice':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={onOpenSuperDevice}
            title="Суперустройство (Экосистема Стиль ОС) · Перетащите для перестановки"
            className={`${wrapCls} !bg-blue-600/25 !border-blue-400/45 text-sky-200`}
          >
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Radio className="w-2.5 h-2.5" />
            </span>
            <span className="font-bold hidden md:inline">Суперустройство</span>
          </div>
        );

      case 'circle_search':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={() => onOpenCircleSearch?.()}
            title="Circle to Search (Ctrl+Shift+Space) · Обведите объект, текст, ошибку или фото"
            className={`${wrapCls} !bg-gradient-to-r !from-sky-500/25 !to-violet-600/25 !border-sky-400/50 text-sky-100`}
          >
            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-sky-400 to-violet-600 text-white flex items-center justify-center shadow">
              <ScanSearch className="w-2.5 h-2.5" />
            </span>
            <span className="font-bold hidden lg:inline">Circle</span>
          </div>
        );

      case 'weather':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={() => setWeatherMode((m) => (m === 0 ? 1 : 0))}
            onWheel={(e) => {
              if (!canWheel()) return;
              e.preventDefault();
              setWeatherMode((m) => (m === 0 ? 1 : 0));
            }}
            title="Погода · Колесо мыши: переключить вид · Перетащите для перестановки"
            className={wrapCls}
          >
            <CloudSun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono font-bold">{weatherTemp}</span>
            <span className="opacity-70 hidden lg:inline max-w-[90px] truncate">
              {weatherMode === 0 ? weatherDesc : weatherCity}
            </span>
          </div>
        );

      case 'currency':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={() => setRateIdx((i) => (i + 1) % rates.length)}
            onWheel={(e) => {
              if (!canWheel()) return;
              e.preventDefault();
              setRateIdx((i) => (i + (e.deltaY > 0 ? 1 : rates.length - 1)) % rates.length);
            }}
            title="Курсы валют (Live) · Колесо мыши: USD / EUR / CNY / BTC"
            className={wrapCls}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono font-bold">
              {curRate.symbol} {curRate.value >= 1000 ? Math.round(curRate.value).toLocaleString('ru-RU') : curRate.value.toFixed(2)}
              {curRate.unit}
            </span>
            <span className={`text-[9px] font-mono ${curRate.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {curRate.change >= 0 ? '+' : ''}
              {curRate.change.toFixed(1)}%
            </span>
          </div>
        );

      case 'telemetry':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={onOpenTaskMgr}
            onWheel={(e) => {
              if (!canWheel()) return;
              e.preventDefault();
              setTelemetryMode((m) => (m === 0 ? 1 : 0));
            }}
            title="Загрузка CPU / GPU / RAM · Колесо: сменить режим · Клик: Диспетчер задач"
            className={wrapCls}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            {telemetryMode === 0 ? (
              <span className="font-mono text-[10px]">
                CPU <b>{cpuLoad}%</b> · GPU <b>{gpuLoad}%</b>
              </span>
            ) : (
              <span className="font-mono text-[10px]">
                RAM <b>{ramLoad}%</b> · CPU <b>{cpuLoad}%</b>
              </span>
            )}
          </div>
        );

      case 'media':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={() => onMediaAction('play_pause')}
            onWheel={(e) => {
              if (!canWheel()) return;
              e.preventDefault();
              onMediaAction(e.deltaY > 0 ? 'next' : 'prev');
            }}
            title="Активный трек · ЛКМ: Пауза/Пуск · Колесо мыши: Пред./След. трек"
            className={wrapCls}
          >
            <span className="w-4 h-4 rounded-full bg-blue-600/90 text-white flex items-center justify-center">
              {mediaPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            </span>
            <Music className="w-3 h-3 text-sky-400 shrink-0 hidden sm:inline" />
            <span className="max-w-[115px] truncate text-[10px] font-semibold">
              {mediaTitle || 'Нет трека'}
            </span>
          </div>
        );

      case 'clipboard':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={onOpenClipboard}
            onContextMenu={(e) => {
              e.preventDefault();
              if (curClip && curClip !== 'Буфер пуст') {
                onCopyText(curClip);
                onPushToast('Буфер панели', 'Фрагмент скопирован', 'success');
              }
            }}
            onWheel={(e) => {
              if (!canWheel() || clipboardTexts.length <= 1) return;
              e.preventDefault();
              setClipIdx((i) => (i + (e.deltaY > 0 ? 1 : clipboardTexts.length - 1)) % clipboardTexts.length);
            }}
            title="Умный буфер обмена · Колесо: листать историю · ЛКМ: открыть · ПКМ: скопировать"
            className={wrapCls}
          >
            <Clipboard className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="max-w-[96px] truncate text-[10px] opacity-85">{curClip}</span>
          </div>
        );

      case 'pomodoro':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={() => setPomoRunning((r) => !r)}
            onContextMenu={(e) => {
              e.preventDefault();
              setPomoRunning(false);
              setPomoBreak(false);
              setPomoSecLeft(pomoMinutes * 60);
            }}
            onWheel={(e) => {
              if (!canWheel()) return;
              e.preventDefault();
              const nextM = Math.max(5, Math.min(60, pomoMinutes + (e.deltaY < 0 ? 1 : -1)));
              setPomoMinutes(nextM);
              if (!pomoRunning) setPomoSecLeft(nextM * 60);
            }}
            title="Pomodoro-таймер · ЛКМ: Старт/Пауза · ПКМ: Сброс · Колесо: ±1 мин"
            className={`${wrapCls} ${pomoRunning ? '!border-rose-400/50 !bg-rose-500/20' : ''}`}
          >
            <Timer className={`w-3.5 h-3.5 shrink-0 ${pomoRunning ? 'text-rose-400 animate-pulse' : 'text-rose-300'}`} />
            <span className="font-mono font-bold">
              {mm}:{ss}
            </span>
          </div>
        );

      case 'workspaces':
        return (
          <div
            key={id}
            {...commonProps}
            onWheel={(e) => {
              if (!canWheel()) return;
              e.preventDefault();
              const next =
                e.deltaY > 0
                  ? (activeDesktop % desktopCount) + 1
                  : activeDesktop <= 1
                  ? desktopCount
                  : activeDesktop - 1;
              onSwitchDesktop(next);
            }}
            title="Виртуальные рабочие столы · Колесо мыши: мгновенное переключение столов!"
            className={wrapCls}
          >
            <Layers className="w-3 h-3 text-sky-400 shrink-0" />
            <div className="flex items-center gap-0.5">
              {Array.from({ length: desktopCount }, (_, idx) => idx + 1).map((n) => (
                <button
                  key={n}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitchDesktop(n);
                  }}
                  className={`w-4 h-4 rounded-full text-[9px] font-mono font-black flex items-center justify-center cursor-pointer transition ${
                    activeDesktop === n ? 'bg-blue-600 text-white shadow' : 'opacity-55 hover:opacity-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        );

      case 'brightness':
        return (
          <div
            key={id}
            {...commonProps}
            onWheel={(e) => {
              if (!canWheel()) return;
              e.preventDefault();
              const next = Math.max(20, Math.min(100, brightness + (e.deltaY < 0 ? 5 : -5)));
              onBrightnessChange(next);
            }}
            onClick={() => onBrightnessChange(brightness >= 95 ? 55 : 100)}
            title="Яркость экрана · Крутите колесо мыши для регулировки ±5%!"
            className={wrapCls}
          >
            <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-mono font-bold">{brightness}%</span>
          </div>
        );

      case 'volume':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={onToggleMute}
            onWheel={(e) => {
              if (!canWheel()) return;
              e.preventDefault();
              const next = Math.max(0, Math.min(100, volume + (e.deltaY < 0 ? 4 : -4)));
              onVolumeChange(next);
            }}
            title="Звук · Крутите колесо мыши для громкости ±4% · ЛКМ: Без звука"
            className={wrapCls}
          >
            {muted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            )}
            <span className="font-mono font-bold">{muted ? 'MUTE' : `${volume}%`}</span>
          </div>
        );

      case 'photo_studio':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={onOpenPhotoStudio}
            title="Открыть встроенный фоторедактор Luma Photo Studio"
            className={wrapCls}
          >
            <ImageIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="hidden md:inline font-bold">Фото</span>
          </div>
        );

      case 'edition':
        return (
          <div
            key={id}
            {...commonProps}
            onClick={onOpenEditionSettings}
            title={isPro ? 'Luma OS 1.8 Pro · Полные права и Pro-функции' : 'Luma OS 1.8 Base · Сравнить с версией Pro'}
            className={`${wrapCls} ${
              isPro
                ? '!bg-gradient-to-r !from-blue-600/35 !to-cyan-500/30 !border-sky-400/50 text-sky-200'
                : ''
            }`}
          >
            <Crown className={`w-3 h-3 ${isPro ? 'text-amber-300' : 'opacity-60'}`} />
            <span className="font-mono font-black text-[10px]">
              {isPro ? (isAdmin ? 'PRO·ADMIN' : 'PRO') : 'BASE'}
            </span>
          </div>
        );
    }
  };

  const isTop = config.position === 'top';
  const showBuilderBtn = config.showBuilderButton !== false;

  return (
    <>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed inset-x-0 z-[8860] flex items-center justify-center px-3 pointer-events-none select-none luma-noise-surface ${
          isTop ? 'top-1.5' : 'bottom-[68px]'
        } ${visualNoiseHidden ? (isTop ? 'luma-noise-hidden-top' : 'opacity-0') : ''}`}
      >
        <div
          className={`pointer-events-auto max-w-[96vw] px-2 py-1 rounded-full border backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.42)] flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
            isDark
              ? 'bg-[#111520]/76 border-white/14'
              : 'bg-white/75 border-slate-300/80'
          }`}
        >
          {visibleBlocks.map((id) => renderBlock(id))}

          {/* Modular Bar Customizer Trigger (can be hidden independently) */}
          {showBuilderBtn && (
            <button
              onClick={() => setBuilderOpen((v) => !v)}
              title="Конструктор модульной панели (перетаскивание блоков, верх/низ, скрытие)"
              className={`w-7 h-7 rounded-full border flex items-center justify-center cursor-pointer shrink-0 transition ${
                builderOpen ? 'bg-blue-600 border-blue-500 text-white' : pillBase
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 1-Click Hide Modular Panel */}
          <button
            onClick={() => {
              setBuilderOpen(false);
              onChangeConfig({ ...config, enabled: false });
              onPushToast(
                'Модульная панель скрыта',
                'Её всегда можно вернуть в Настройках → Панель задач или через ПКМ по панели задач.',
                'info'
              );
            }}
            title="Убрать модульную панель (вернуть: Настройки → Панель задач или ПКМ по панели)"
            className={`w-6 h-6 rounded-full border flex items-center justify-center cursor-pointer shrink-0 opacity-60 hover:opacity-100 hover:border-rose-400/50 hover:text-rose-300 transition ${pillBase}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Visual Modular Panel Constructor Modal/Popover */}
      {builderOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`fixed ${isTop ? 'top-12' : 'bottom-[110px]'} right-4 z-[9500] w-[356px] max-w-[92vw] rounded-[28px] border backdrop-blur-3xl p-4 shadow-[0_28px_80px_rgba(0,0,0,0.65)] space-y-3 ${
            isDark ? 'bg-[#121722]/94 border-white/15 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black">Конструктор модульной панели</div>
              <div className="text-[10px] opacity-60">Перетаскивайте блоки или скройте панель целиком</div>
            </div>
            <button onClick={() => setBuilderOpen(false)} className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Position & Scroll Actions Switchers */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onChangeConfig({ ...config, position: 'top' })}
              className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                config.position === 'top' ? 'bg-blue-600 border-blue-500 text-white' : pillBase
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" /> Верхняя панель
            </button>
            <button
              onClick={() => onChangeConfig({ ...config, position: 'bottom' })}
              className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                config.position === 'bottom' ? 'bg-blue-600 border-blue-500 text-white' : pillBase
              }`}
            >
              <ArrowDown className="w-3.5 h-3.5" /> Нижняя панель
            </button>
          </div>

          <label className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div>
              <div className="text-[11px] font-bold">Прокрутка колесом (KDE / Waybar)</div>
              <div className="text-[10px] opacity-60">Звук, яркость, окна, столы, курсы, Pomodoro</div>
            </div>
            <input
              type="checkbox"
              checked={config.scrollActions}
              onChange={(e) => onChangeConfig({ ...config, scrollActions: e.target.checked })}
              className="w-4 h-4 accent-blue-600"
            />
          </label>

          <label className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div>
              <div className="text-[11px] font-bold">Показывать кнопку конструктора (⚙)</div>
              <div className="text-[10px] opacity-60">Скройте шестерёнку, если настройка больше не нужна</div>
            </div>
            <input
              type="checkbox"
              checked={showBuilderBtn}
              onChange={(e) => {
                const nextShow = e.target.checked;
                onChangeConfig({ ...config, showBuilderButton: nextShow });
                if (!nextShow) {
                  setBuilderOpen(false);
                  onPushToast(
                    'Кнопка конструктора скрыта',
                    'Вернуть кнопку конструктора можно в Настройках → Панель задач.',
                    'info'
                  );
                }
              }}
              className="w-4 h-4 accent-blue-600"
            />
          </label>

          {/* Draggable Blocks List */}
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {config.order.map((bid) => {
              const meta = ALL_MODULAR_BLOCKS.find((m) => m.id === bid);
              if (!meta) return null;
              const active = !config.hidden.includes(bid);
              return (
                <div
                  key={`cfg_${bid}`}
                  draggable
                  onDragStart={() => setDragBlock(bid)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragBlock) moveBlock(dragBlock, bid);
                    setDragBlock(null);
                  }}
                  className={`px-2.5 py-2 rounded-xl border flex items-center gap-2 cursor-grab ${
                    isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <GripVertical className="w-3.5 h-3.5 opacity-45 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold truncate">{meta.label}</div>
                    <div className="text-[9px] opacity-55 truncate">{meta.scrollHint}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleBlockVisible(bid)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>

          {/* Remove Modular Panel Entirely */}
          <button
            onClick={() => {
              setBuilderOpen(false);
              onChangeConfig({ ...config, enabled: false });
              onPushToast(
                'Модульная панель отключена',
                'Включить обратно можно в Настройках → Панель задач или ПКМ по панели задач.',
                'info'
              );
            }}
            className="w-full py-2 px-3 rounded-xl border border-rose-500/35 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-bold transition cursor-pointer"
          >
            Убрать модульную панель целиком
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => onChangeConfig(DEFAULT_MODULAR_PANEL_CONFIG)}
              className="text-[11px] font-bold text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Сбросить
            </button>
            <button
              onClick={() => setBuilderOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </>
  );
};
