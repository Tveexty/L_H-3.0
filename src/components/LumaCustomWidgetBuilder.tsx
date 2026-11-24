import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Code2,
  Play,
  Plus,
  Upload,
  Palette,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Type,
  Zap,
  Database,
  Layout,
  Search,
  Trash2,
  Download,
  FileUp,
  AppWindow,
  Globe,
  Terminal,
  FolderOpen,
  Cpu,
  Clock,
  CloudSun,
  BatteryCharging,
  Volume2,
  Shield,
  Music,
  Gamepad2,
  Star,
  Heart,
  Flame,
  Rocket,
  Bookmark,
  Layers,
  MousePointerClick,
} from 'lucide-react';

export type CustomWidgetActionType =
  | 'none'
  | 'launch_pc_app'
  | 'open_luma_app'
  | 'open_url'
  | 'open_folder'
  | 'run_terminal'
  | 'system_action'
  | 'media_control'
  | 'copy_text'
  | 'show_toast'
  | 'run_js';

export interface CustomWidgetActionButton {
  id: string;
  label: string;
  emoji: string;
  actionType: CustomWidgetActionType;
  target: string;
  args?: string;
}

export interface CustomWidgetChainedStep {
  id: string;
  actionType: CustomWidgetActionType;
  target: string;
  args?: string;
}

export interface CustomUserWidgetSpec {
  // Core identity & grid (1-12)
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  categoryTag?: string;
  w: number;
  h: number;
  layoutMode?: 'standard' | 'launcher' | 'hero_photo' | 'minimal_stat' | 'split_rows' | 'ring_gauge' | 'buttons_grid';
  contentAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom' | 'between';
  padding?: number;
  compactMode?: boolean;

  // Visibility toggles (13-21)
  showHeader?: boolean;
  showBadge?: boolean;
  showSubtitle?: boolean;
  showProgress?: boolean;
  showRows?: boolean;
  showEditPencil?: boolean;
  showActionHint?: boolean;
  showIcon?: boolean;
  clickRipple?: boolean;

  // Background & photo (22-40)
  bgMode?: 'image' | 'solid' | 'gradient' | 'glass' | 'transparent' | 'animated_mesh';
  bgImage?: string;
  bgColor?: string;
  bgGradientFrom?: string;
  bgGradientTo?: string;
  bgGradientAngle?: number;
  bgOpacity: number;
  bgBlur: number;
  bgFit?: 'cover' | 'contain' | 'fill';
  bgPosX?: number;
  bgPosY?: number;
  bgZoom?: number;
  bgBrightness?: number;
  bgContrast?: number;
  bgSaturate?: number;
  bgGrayscale?: number;
  bgTintColor?: string;
  bgTintOpacity?: number;
  glassBackdropBlur?: number;
  imageOverlayGradient?: 'dark' | 'soft' | 'bottom' | 'none';

  // Border, Shadow, Glow & Motion (41-52)
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderOpacity?: number;
  shadowIntensity?: number;
  glowColor?: string;
  glowRadius?: number;
  hoverEffect?: 'none' | 'lift' | 'scale' | 'glow' | 'pulse';
  animationPreset?: 'none' | 'float' | 'breathe' | 'shimmer';
  accentColor: string;
  secondaryColor?: string;

  // Icon & Visual Media (53-61)
  iconType?: 'none' | 'emoji' | 'lucide' | 'image';
  iconEmoji?: string;
  iconName?: string;
  iconImage?: string;
  iconSize?: number;
  iconColor?: string;
  iconBgColor?: string;
  iconBgOpacity?: number;
  iconBgShape?: 'none' | 'circle' | 'squircle' | 'square';

  // Typography (62-75)
  fontFamily?: 'sans' | 'mono' | 'serif';
  titleSize?: number;
  titleColor?: string;
  titleWeight?: 'normal' | 'semibold' | 'bold' | 'black';
  titleUppercase?: boolean;
  titleTracking?: number;
  valueSize?: number;
  valueColor?: string;
  valueWeight?: 'semibold' | 'bold' | 'black';
  subtitleSize?: number;
  subtitleColor?: string;
  textShadow?: boolean;
  progressStyle?: 'bar' | 'segmented' | 'ring' | 'dots' | 'hidden';
  progressHeight?: number;

  // Actions & Triggers (76-92)
  clickActionType?: CustomWidgetActionType;
  clickTarget?: string;
  clickArgs?: string;
  clickLabel?: string;
  clickConfirm?: boolean;
  clickSound?: boolean;
  doubleClickActionType?: CustomWidgetActionType;
  doubleClickTarget?: string;
  doubleClickArgs?: string;
  customClickJs?: string;
  quickButtons?: CustomWidgetActionButton[];
  chainedActions?: CustomWidgetChainedStep[];
  openInNewTab?: boolean;
  runSilent?: boolean;
  hotkeyHint?: string;
  tooltipText?: string;
  buttonColumns?: 2 | 3 | 4;

  // Data Sources, Rows, Alerts & JS (93-114)
  dataSource?:
    | 'js_script'
    | 'static'
    | 'telemetry_cpu'
    | 'telemetry_ram'
    | 'telemetry_gpu'
    | 'telemetry_battery'
    | 'wireless'
    | 'clock'
    | 'weather'
    | 'countdown'
    | 'http_json';
  staticValue?: string;
  staticPrefix?: string;
  staticSuffix?: string;
  progressValueManual?: number;
  countdownDate?: string;
  httpUrl?: string;
  httpJsonPath?: string;
  refreshIntervalSec?: number;
  alertEnabled?: boolean;
  alertCondition?: 'gt' | 'lt';
  alertThreshold?: number;
  alertColor?: string;
  alertPulse?: boolean;
  row1Label?: string;
  row1Value?: string;
  row2Label?: string;
  row2Value?: string;
  row3Label?: string;
  row3Value?: string;
  scriptCode: string;
}

export interface CustomWidgetEvalOutput {
  headline?: string;
  value?: string;
  subtitle?: string;
  progress?: number;
  badge?: string;
  rows?: { label: string; value: string }[];
  numericValue?: number;
  error?: string;
}

export interface CustomWidgetEvalCtx {
  telemetry: {
    cpu_percent?: number;
    ram_percent?: number;
    ram_used_gb?: number;
    ram_total_gb?: number;
    gpu_percent?: number;
    gpu_temp_c?: number;
    battery_pct?: number;
    battery_charging?: boolean;
  };
  wireless: { name: string; battery_percent: number; device_type: string; transport?: string }[];
  time: { hhmm: string; seconds: string; dateStr: string; hour: number };
  weather: { temp?: number; desc?: string; city?: string };
}

interface InstalledPcApp {
  id: string;
  name: string;
  exec_path: string;
  icon_url?: string;
  category?: string;
}

export const LUMA_BUILTIN_APP_OPTIONS: { id: string; label: string }[] = [
  { id: 'explorer', label: 'Проводник Luma' },
  { id: 'terminal', label: 'Терминал Luma' },
  { id: 'ai', label: 'Luma AI 3.0 Ассистент' },
  { id: 'code_studio', label: 'Luma Code Studio (IDE)' },
  { id: 'cut_studio', label: 'Luma Cut Studio (Видео)' },
  { id: 'office', label: 'Luma Office Studio' },
  { id: 'calendar', label: 'Календарь и Задачи' },
  { id: 'scenarios', label: 'Сценарии (Автоматизация)' },
  { id: 'security', label: 'LumaShield 2.0 Антивирус' },
  { id: 'taskmgr', label: 'Диспетчер задач' },
  { id: 'calculator', label: 'Калькулятор' },
  { id: 'trash', label: 'Корзина Luma OS' },
  { id: 'settings', label: 'Настройки системы' },
  { id: 'services', label: 'Службы ОС' },
];

export const SYSTEM_ACTION_OPTIONS: { id: string; label: string }[] = [
  { id: 'toggle_theme', label: 'Переключить Светлую / Тёмную тему' },
  { id: 'toggle_dnd', label: 'Переключить Не беспокоить (DND)' },
  { id: 'toggle_gaming', label: 'Переключить Игровой режим (Boost)' },
  { id: 'toggle_mute', label: 'Вкл / Выкл системный звук' },
  { id: 'volume_up', label: 'Громкость +10%' },
  { id: 'volume_down', label: 'Громкость -10%' },
  { id: 'screenshot', label: 'Сделать компактный скриншот' },
  { id: 'open_hub', label: 'Открыть Панель управления (Tab)' },
  { id: 'open_vault', label: 'Открыть Приватный стол (AES-256)' },
  { id: 'open_spotlight', label: 'Открыть Поиск (Alt+R)' },
  { id: 'lock_screen', label: 'Заблокировать экран' },
  { id: 'sleep_pc', label: 'Спящий режим ПК' },
  { id: 'power_performance', label: 'План питания: Максимум' },
  { id: 'power_saver', label: 'План питания: Энергосбережение' },
  { id: 'clean_temp', label: 'Очистить временные файлы (TEMP)' },
];

export const MEDIA_CONTROL_OPTIONS: { id: string; label: string }[] = [
  { id: 'play_pause', label: 'Воспроизвести / Пауза' },
  { id: 'next', label: 'Следующий трек' },
  { id: 'prev', label: 'Предыдущий трек' },
];

const LUCIDE_ICON_MAP: Record<string, React.FC<{ size?: number; style?: React.CSSProperties; className?: string }>> = {
  Sparkles,
  Rocket,
  Gamepad2,
  AppWindow,
  Globe,
  Terminal,
  FolderOpen,
  Cpu,
  Clock,
  CloudSun,
  BatteryCharging,
  Volume2,
  Shield,
  Music,
  Star,
  Heart,
  Flame,
  Zap,
  Bookmark,
  Layers,
};

export function renderCustomLucideIcon(name: string | undefined, size: number, color?: string) {
  const Comp = (name && LUCIDE_ICON_MAP[name]) || Sparkles;
  return <Comp size={size} style={{ color }} />;
}

export function evalCustomWidgetScript(code: string, ctx: CustomWidgetEvalCtx): CustomWidgetEvalOutput {
  try {
    const fn = new Function('ctx', `"use strict";\n${code}`);
    const out = fn(ctx);
    if (!out || typeof out !== 'object') {
      return {
        headline: 'Виджет',
        value: String(out ?? '—'),
        subtitle: 'Скрипт вернул значение',
      };
    }
    const parsedNum = Number(String(out.value ?? '').replace(/[^\d.-]/g, ''));
    return {
      headline: out.headline != null ? String(out.headline) : undefined,
      value: out.value != null ? String(out.value) : undefined,
      subtitle: out.subtitle != null ? String(out.subtitle) : undefined,
      progress:
        typeof out.progress === 'number' && !Number.isNaN(out.progress)
          ? Math.max(0, Math.min(100, Math.round(out.progress)))
          : undefined,
      badge: out.badge != null ? String(out.badge) : undefined,
      numericValue: Number.isFinite(parsedNum) ? parsedNum : undefined,
      rows: Array.isArray(out.rows)
        ? out.rows.slice(0, 6).map((r: { label?: unknown; value?: unknown }) => ({
            label: String(r?.label ?? ''),
            value: String(r?.value ?? ''),
          }))
        : undefined,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export function computeCustomWidgetOutput(
  spec: CustomUserWidgetSpec | undefined,
  ctx: CustomWidgetEvalCtx,
  httpData?: string
): CustomWidgetEvalOutput {
  if (!spec) {
    return { headline: 'Carbon Studio', value: 'Настройте', subtitle: 'Нажмите ✎ для редактирования' };
  }
  const src = spec.dataSource || 'js_script';
  const manualRows = [
    spec.row1Label || spec.row1Value ? { label: spec.row1Label || '', value: spec.row1Value || '' } : null,
    spec.row2Label || spec.row2Value ? { label: spec.row2Label || '', value: spec.row2Value || '' } : null,
    spec.row3Label || spec.row3Value ? { label: spec.row3Label || '', value: spec.row3Value || '' } : null,
  ].filter((x): x is { label: string; value: string } => Boolean(x));

  const wrapVal = (v: string) => `${spec.staticPrefix || ''}${v}${spec.staticSuffix || ''}`;

  if (src === 'static') {
    return {
      headline: spec.title,
      value: wrapVal(spec.staticValue || spec.clickLabel || spec.title),
      subtitle: spec.subtitle || (spec.clickActionType && spec.clickActionType !== 'none' ? `Клик: ${spec.clickLabel || spec.clickTarget || 'Запустить'}` : ''),
      badge: spec.badgeText || undefined,
      progress: typeof spec.progressValueManual === 'number' && spec.progressStyle !== 'hidden' ? spec.progressValueManual : undefined,
      rows: manualRows.length > 0 ? manualRows : undefined,
    };
  }
  if (src === 'telemetry_cpu') {
    const cpu = Math.round(ctx.telemetry.cpu_percent || 0);
    return {
      headline: spec.title || 'ПРОЦЕССОР',
      value: wrapVal(`${cpu}%`),
      subtitle: spec.subtitle || `RAM ${Math.round(ctx.telemetry.ram_percent || 0)}% · GPU ${Math.round(ctx.telemetry.gpu_percent || 0)}%`,
      badge: spec.badgeText || (cpu > 75 ? 'ВЫСОКАЯ' : 'НОРМА'),
      progress: cpu,
      numericValue: cpu,
      rows: manualRows.length > 0 ? manualRows : [{ label: 'ОЗУ', value: `${(ctx.telemetry.ram_used_gb || 0).toFixed(1)} ГБ` }],
    };
  }
  if (src === 'telemetry_ram') {
    const ram = Math.round(ctx.telemetry.ram_percent || 0);
    return {
      headline: spec.title || 'ПАМЯТЬ ОЗУ',
      value: wrapVal(`${ram}%`),
      subtitle: spec.subtitle || `${(ctx.telemetry.ram_used_gb || 0).toFixed(1)} / ${(ctx.telemetry.ram_total_gb || 16).toFixed(0)} ГБ`,
      badge: spec.badgeText || 'RAM',
      progress: ram,
      numericValue: ram,
      rows: manualRows,
    };
  }
  if (src === 'telemetry_gpu') {
    const gpu = Math.round(ctx.telemetry.gpu_percent || 0);
    const temp = Math.round(ctx.telemetry.gpu_temp_c || 0);
    return {
      headline: spec.title || 'ВИДЕОКАРТА GPU',
      value: wrapVal(`${gpu}%`),
      subtitle: spec.subtitle || (temp > 0 ? `Температура ${temp}°C` : 'Мониторинг GPU'),
      badge: spec.badgeText || (temp > 0 ? `${temp}°C` : 'GPU'),
      progress: gpu,
      numericValue: gpu,
      rows: manualRows,
    };
  }
  if (src === 'telemetry_battery') {
    const pct = Math.round(ctx.telemetry.battery_pct ?? 100);
    return {
      headline: spec.title || 'БАТАРЕЯ',
      value: wrapVal(`${pct}%`),
      subtitle: spec.subtitle || (ctx.telemetry.battery_charging ? 'Заряжается от сети' : 'От аккумулятора'),
      badge: spec.badgeText || (ctx.telemetry.battery_charging ? '⚡ AC' : 'АКБ'),
      progress: pct,
      numericValue: pct,
      rows: manualRows,
    };
  }
  if (src === 'wireless') {
    const devs = ctx.wireless || [];
    return {
      headline: spec.title || 'ПЕРИФЕРИЯ',
      value: wrapVal(`${devs.length} подкл.`),
      subtitle: spec.subtitle || (devs[0]?.name || 'Нет устройств'),
      badge: spec.badgeText || 'BT / 2.4G',
      rows: devs.slice(0, 3).map((d) => ({
        label: d.name.slice(0, 18),
        value: d.battery_percent >= 0 ? `${d.battery_percent}%` : 'ON',
      })),
    };
  }
  if (src === 'clock') {
    return {
      headline: spec.title || ctx.time.dateStr,
      value: wrapVal(ctx.time.hhmm),
      subtitle: spec.subtitle || `${ctx.time.dateStr} · :${ctx.time.seconds}`,
      badge: spec.badgeText || 'LIVE',
      progress: Math.round(((ctx.time.hour * 60) / 1440) * 100),
      rows: manualRows,
    };
  }
  if (src === 'weather') {
    const t = ctx.weather.temp ?? 20;
    return {
      headline: spec.title || ctx.weather.city || 'ПОГОДА',
      value: wrapVal(`${t > 0 ? '+' : ''}${t}°C`),
      subtitle: spec.subtitle || `${ctx.weather.city || 'Регион'} · ${ctx.weather.desc || 'Ясно'}`,
      badge: spec.badgeText || 'METEO',
      numericValue: t,
      rows: manualRows,
    };
  }
  if (src === 'countdown') {
    const targetMs = spec.countdownDate ? Date.parse(spec.countdownDate) : Date.now() + 86400_000 * 7;
    const diff = Math.max(0, (Number.isNaN(targetMs) ? Date.now() : targetMs) - Date.now());
    const days = Math.floor(diff / 86400_000);
    const hrs = Math.floor((diff % 86400_000) / 3600_000);
    return {
      headline: spec.title || 'ОБРАТНЫЙ ОТСЧЁТ',
      value: wrapVal(`${days}д ${hrs}ч`),
      subtitle: spec.subtitle || (spec.countdownDate ? `До ${spec.countdownDate}` : 'Задайте дату'),
      badge: spec.badgeText || 'Таймер',
      numericValue: days,
      rows: manualRows,
    };
  }
  if (src === 'http_json') {
    return {
      headline: spec.title || 'LIVE API',
      value: wrapVal(httpData || '...'),
      subtitle: spec.subtitle || spec.httpUrl || 'JSON Endpoint',
      badge: spec.badgeText || 'API',
      rows: manualRows,
    };
  }

  // Default: JS script
  const jsOut = evalCustomWidgetScript(spec.scriptCode || 'return { value: "OK" };', ctx);
  if (spec.badgeText && !jsOut.badge) jsOut.badge = spec.badgeText;
  if (manualRows.length > 0 && (!jsOut.rows || jsOut.rows.length === 0)) jsOut.rows = manualRows;
  return jsOut;
}

const PRESET_TEMPLATES: { name: string; emoji: string; patch: Partial<CustomUserWidgetSpec> }[] = [
  {
    name: 'Запуск приложения ПК',
    emoji: '🚀',
    patch: {
      title: 'Мой лаунчер',
      subtitle: 'Нажмите для запуска приложения',
      badgeText: 'APP',
      layoutMode: 'launcher',
      dataSource: 'static',
      staticValue: 'Открыть',
      bgMode: 'gradient',
      bgGradientFrom: '#0ea5e9',
      bgGradientTo: '#6366f1',
      bgGradientAngle: 135,
      accentColor: '#38bdf8',
      iconType: 'emoji',
      iconEmoji: '🚀',
      iconSize: 34,
      iconBgShape: 'squircle',
      iconBgColor: '#ffffff',
      iconBgOpacity: 16,
      hoverEffect: 'lift',
      clickActionType: 'launch_pc_app',
      clickLabel: 'Запустить',
      showProgress: false,
      w: 2,
      h: 2,
    },
  },
  {
    name: 'Игровая карточка (Турбо)',
    emoji: '🎮',
    patch: {
      title: 'Игровой режим',
      subtitle: 'Вкл. Gaming Boost + Запуск игры',
      badgeText: 'TURBO',
      layoutMode: 'launcher',
      dataSource: 'static',
      staticValue: 'PLAY',
      bgMode: 'gradient',
      bgGradientFrom: '#7c3aed',
      bgGradientTo: '#ec4899',
      bgGradientAngle: 120,
      accentColor: '#f472b6',
      glowColor: '#ec4899',
      glowRadius: 18,
      iconType: 'lucide',
      iconName: 'Gamepad2',
      iconSize: 32,
      clickActionType: 'system_action',
      clickTarget: 'toggle_gaming',
      hoverEffect: 'glow',
      w: 2,
      h: 2,
    },
  },
  {
    name: 'Быстрый Веб-портал',
    emoji: '🌐',
    patch: {
      title: 'YouTube / Сайт',
      subtitle: 'Открыть в 1 клик',
      badgeText: 'WEB',
      layoutMode: 'launcher',
      dataSource: 'static',
      staticValue: 'YouTube',
      bgMode: 'gradient',
      bgGradientFrom: '#dc2626',
      bgGradientTo: '#991b1b',
      accentColor: '#f87171',
      iconType: 'lucide',
      iconName: 'Globe',
      iconSize: 30,
      clickActionType: 'open_url',
      clickTarget: 'https://youtube.com',
      w: 2,
      h: 1,
    },
  },
  {
    name: 'Пульт 4 быстрых кнопок',
    emoji: '🎛️',
    patch: {
      title: 'Мой пульт управления',
      subtitle: 'Кнопки в 1 клик',
      badgeText: 'DECK',
      layoutMode: 'buttons_grid',
      dataSource: 'static',
      staticValue: '',
      bgMode: 'glass',
      bgColor: '#0f172a',
      bgOpacity: 82,
      accentColor: '#22d3ee',
      buttonColumns: 2,
      quickButtons: [
        { id: 'b1', label: 'Терминал', emoji: '⌨️', actionType: 'open_luma_app', target: 'terminal' },
        { id: 'b2', label: 'AI 3.0', emoji: '✨', actionType: 'open_luma_app', target: 'ai' },
        { id: 'b3', label: 'Скриншот', emoji: '📸', actionType: 'system_action', target: 'screenshot' },
        { id: 'b4', label: 'Музыка', emoji: '🎵', actionType: 'media_control', target: 'play_pause' },
      ],
      w: 3,
      h: 2,
    },
  },
  {
    name: 'Монитор ПК (CPU/GPU)',
    emoji: '⚡',
    patch: {
      title: 'CARBON TELEMETRY',
      layoutMode: 'standard',
      dataSource: 'telemetry_cpu',
      bgMode: 'image',
      bgImage: '/luma-carbon-weave.jpg',
      bgOpacity: 80,
      accentColor: '#22d3ee',
      progressStyle: 'bar',
      alertEnabled: true,
      alertCondition: 'gt',
      alertThreshold: 80,
      alertColor: '#f43f5e',
      w: 2,
      h: 2,
    },
  },
  {
    name: 'Фото-рамка + Часы',
    emoji: '🖼️',
    patch: {
      title: 'МОЁ ФОТО',
      layoutMode: 'hero_photo',
      dataSource: 'clock',
      bgMode: 'image',
      bgImage: '/luma-carbon-hero-4k.jpg',
      bgOpacity: 95,
      bgBlur: 0,
      imageOverlayGradient: 'bottom',
      accentColor: '#f59e0b',
      valueSize: 36,
      showProgress: false,
      w: 3,
      h: 2,
    },
  },
  {
    name: 'Команда Терминала',
    emoji: '💻',
    patch: {
      title: 'Скрипт ПК',
      subtitle: 'Выполнить команду оболочки',
      badgeText: 'CMD',
      layoutMode: 'launcher',
      dataSource: 'static',
      staticValue: 'Запустить',
      bgMode: 'solid',
      bgColor: '#090d16',
      borderColor: '#10b981',
      borderWidth: 1,
      accentColor: '#10b981',
      fontFamily: 'mono',
      iconType: 'lucide',
      iconName: 'Terminal',
      clickActionType: 'run_terminal',
      clickTarget: 'ipconfig',
      w: 2,
      h: 1,
    },
  },
  {
    name: 'Обратный отсчёт',
    emoji: '⏳',
    patch: {
      title: 'ДО СОБЫТИЯ',
      subtitle: 'Таймер дней и часов',
      badgeText: 'GOAL',
      layoutMode: 'minimal_stat',
      dataSource: 'countdown',
      countdownDate: new Date(Date.now() + 86400_000 * 30).toISOString().slice(0, 10),
      bgMode: 'gradient',
      bgGradientFrom: '#312e81',
      bgGradientTo: '#0f172a',
      accentColor: '#a855f7',
      w: 2,
      h: 1,
    },
  },
  {
    name: 'JS-Виджет Разработчика',
    emoji: '🧩',
    patch: {
      title: 'Custom JS Widget',
      layoutMode: 'standard',
      dataSource: 'js_script',
      bgMode: 'glass',
      accentColor: '#34d399',
      scriptCode: `const cpu = Math.round(ctx.telemetry.cpu_percent || 0);
const ram = Math.round(ctx.telemetry.ram_percent || 0);
const devs = ctx.wireless || [];
return {
  headline: 'LUMA CORE 1.4.5',
  value: cpu + '% CPU',
  subtitle: 'RAM ' + ram + '% · Устройств: ' + devs.length,
  progress: cpu,
  badge: ctx.time.hhmm,
  rows: [
    { label: 'ОЗУ', value: (ctx.telemetry.ram_used_gb || 0).toFixed(1) + ' ГБ' },
    { label: 'Погода', value: (ctx.weather.temp ?? 20) + '°C' }
  ]
};`,
      w: 2,
      h: 2,
    },
  },
];

const DEFAULT_SPEC: CustomUserWidgetSpec = {
  id: '',
  title: 'Мой виджет Carbon Pro',
  subtitle: 'Настраивается под любые задачи',
  badgeText: 'PRO',
  categoryTag: 'custom',
  w: 2,
  h: 2,
  layoutMode: 'standard',
  contentAlign: 'left',
  verticalAlign: 'between',
  padding: 14,
  compactMode: false,
  showHeader: true,
  showBadge: true,
  showSubtitle: true,
  showProgress: true,
  showRows: true,
  showEditPencil: true,
  showActionHint: true,
  showIcon: true,
  clickRipple: true,
  bgMode: 'image',
  bgImage: '/luma-carbon-weave.jpg',
  bgColor: '#0f131c',
  bgGradientFrom: '#0ea5e9',
  bgGradientTo: '#6366f1',
  bgGradientAngle: 135,
  bgOpacity: 82,
  bgBlur: 4,
  bgFit: 'cover',
  bgPosX: 50,
  bgPosY: 50,
  bgZoom: 100,
  bgBrightness: 100,
  bgContrast: 100,
  bgSaturate: 110,
  bgGrayscale: 0,
  bgTintColor: '#000000',
  bgTintOpacity: 35,
  glassBackdropBlur: 16,
  imageOverlayGradient: 'dark',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#ffffff',
  borderStyle: 'solid',
  borderOpacity: 18,
  shadowIntensity: 45,
  glowColor: '#22d3ee',
  glowRadius: 0,
  hoverEffect: 'lift',
  animationPreset: 'none',
  accentColor: '#22d3ee',
  secondaryColor: '#a855f7',
  iconType: 'lucide',
  iconEmoji: '🚀',
  iconName: 'Sparkles',
  iconImage: '',
  iconSize: 22,
  iconColor: '#22d3ee',
  iconBgColor: '#22d3ee',
  iconBgOpacity: 18,
  iconBgShape: 'squircle',
  fontFamily: 'sans',
  titleSize: 10,
  titleColor: '#ffffff',
  titleWeight: 'bold',
  titleUppercase: true,
  titleTracking: 1,
  valueSize: 24,
  valueColor: '#ffffff',
  valueWeight: 'black',
  subtitleSize: 11,
  subtitleColor: '#d4d4d8',
  textShadow: true,
  progressStyle: 'bar',
  progressHeight: 6,
  clickActionType: 'none',
  clickTarget: '',
  clickArgs: '',
  clickLabel: 'Запустить',
  clickConfirm: false,
  clickSound: false,
  doubleClickActionType: 'none',
  doubleClickTarget: '',
  doubleClickArgs: '',
  customClickJs: '',
  quickButtons: [],
  chainedActions: [],
  openInNewTab: true,
  runSilent: true,
  hotkeyHint: '',
  tooltipText: '',
  buttonColumns: 2,
  dataSource: 'js_script',
  staticValue: 'Готов',
  staticPrefix: '',
  staticSuffix: '',
  progressValueManual: 65,
  countdownDate: '',
  httpUrl: '',
  httpJsonPath: '',
  refreshIntervalSec: 5,
  alertEnabled: false,
  alertCondition: 'gt',
  alertThreshold: 85,
  alertColor: '#f43f5e',
  alertPulse: true,
  row1Label: '',
  row1Value: '',
  row2Label: '',
  row2Value: '',
  row3Label: '',
  row3Value: '',
  scriptCode: PRESET_TEMPLATES[8].patch.scriptCode || '',
};

const BUILTIN_BG_GALLERY = [
  { label: 'Carbon 4K', url: '/luma-carbon-hero-4k.jpg' },
  { label: 'Carbon Weave', url: '/luma-carbon-weave.jpg' },
  { label: 'Boron Hero', url: '/luma-boron-hero.jpg' },
  { label: 'Boron Horizon', url: '/luma-boron-horizon.jpg' },
  { label: 'Beryl Aurora', url: '/luma-beryl-aurora.jpg' },
  { label: 'Obsidian Silk', url: '/luma-obsidian-silk.jpg' },
];

interface LumaCustomWidgetBuilderProps {
  open: boolean;
  isDark: boolean;
  initialSpec?: CustomUserWidgetSpec | null;
  previewCtx: CustomWidgetEvalCtx;
  onClose: () => void;
  onSave: (spec: CustomUserWidgetSpec) => void;
}

type BuilderTab = 'layout' | 'visual' | 'typography' | 'actions' | 'data';

export const LumaCustomWidgetBuilder: React.FC<LumaCustomWidgetBuilderProps> = ({
  open,
  isDark,
  initialSpec,
  previewCtx,
  onClose,
  onSave,
}) => {
  const [spec, setSpec] = useState<CustomUserWidgetSpec>(() => ({
    ...DEFAULT_SPEC,
    ...(initialSpec || {}),
  }));
  const [tab, setTab] = useState<BuilderTab>('actions');
  const [installedApps, setInstalledApps] = useState<InstalledPcApp[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [jsonToast, setJsonToast] = useState('');

  useEffect(() => {
    if (!open) return;
    setSpec({ ...DEFAULT_SPEC, ...(initialSpec || {}) });
    fetch('/api/kernel/apps/installed')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.apps) ? d.apps : Array.isArray(d) ? d : [];
        setInstalledApps(list.slice(0, 250));
      })
      .catch(() => {});
  }, [open, initialSpec]);

  const update = <K extends keyof CustomUserWidgetSpec>(key: K, val: CustomUserWidgetSpec[K]) => {
    setSpec((prev) => ({ ...prev, [key]: val }));
  };

  const previewOut = useMemo(() => computeCustomWidgetOutput(spec, previewCtx), [spec, previewCtx]);

  const filteredPcApps = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    if (!q) return installedApps.slice(0, 24);
    return installedApps.filter((a) => a.name.toLowerCase().includes(q) || (a.exec_path || '').toLowerCase().includes(q)).slice(0, 30);
  }, [installedApps, appSearch]);

  if (!open) return null;

  const handleUploadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSpec((p) => ({ ...p, bgMode: 'image', bgImage: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadIcon = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSpec((p) => ({ ...p, iconType: 'image', iconImage: reader.result as string, showIcon: true }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(spec.title || 'luma_widget').replace(/\s+/g, '_')}.luma-widget.json`;
    a.click();
    URL.revokeObjectURL(url);
    setJsonToast('Конфигурация виджета экспортирована');
    setTimeout(() => setJsonToast(''), 2500);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        setSpec((p) => ({ ...p, ...parsed, id: p.id }));
        setJsonToast('Конфигурация загружена ✓');
        setTimeout(() => setJsonToast(''), 2500);
      } catch {
        setJsonToast('Ошибка JSON файла');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    onSave({
      ...spec,
      id: initialSpec?.id || spec.id || `cw_${Date.now()}`,
      title: spec.title.trim() || 'Свой виджет',
    });
    onClose();
  };

  const subText = isDark ? 'text-white/55' : 'text-slate-500';
  const inputCls = isDark
    ? 'w-full px-2.5 py-1.5 rounded-xl text-xs bg-white/[0.06] border border-white/12 text-white outline-none focus:border-cyan-400'
    : 'w-full px-2.5 py-1.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 outline-none focus:border-cyan-500';
  const selectCls = isDark
    ? 'w-full px-2.5 py-1.5 rounded-xl text-xs bg-[#141720] border border-white/12 text-white outline-none'
    : 'w-full px-2.5 py-1.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 outline-none';
  const cardBox = isDark ? 'p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5' : 'p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5';

  // Preview visual computation
  const isAlertTriggered =
    spec.alertEnabled &&
    typeof previewOut.numericValue === 'number' &&
    ((spec.alertCondition === 'lt' && previewOut.numericValue < (spec.alertThreshold ?? 20)) ||
      (spec.alertCondition !== 'lt' && previewOut.numericValue > (spec.alertThreshold ?? 85)));

  const activeAccent = isAlertTriggered ? spec.alertColor || '#f43f5e' : spec.accentColor || '#22d3ee';
  const previewBgStyle: React.CSSProperties = {
    borderRadius: `${spec.borderRadius ?? 20}px`,
    borderWidth: `${spec.borderWidth ?? 1}px`,
    borderStyle: spec.borderStyle || 'solid',
    borderColor: isAlertTriggered
      ? spec.alertColor || '#f43f5e'
      : `${spec.borderColor || '#ffffff'}${Math.round(((spec.borderOpacity ?? 18) / 100) * 255)
          .toString(16)
          .padStart(2, '0')}`,
    boxShadow: `${spec.glowRadius ? `0 0 ${spec.glowRadius}px ${spec.glowColor || activeAccent}66, ` : ''}0 14px ${Math.round((spec.shadowIntensity ?? 45) * 0.7)}px rgba(0,0,0,0.45)`,
    fontFamily: spec.fontFamily === 'mono' ? 'ui-monospace, monospace' : spec.fontFamily === 'serif' ? 'Georgia, serif' : undefined,
    minHeight: spec.h >= 2 ? 185 : 112,
    padding: `${spec.padding ?? 14}px`,
    background:
      spec.bgMode === 'gradient'
        ? `linear-gradient(${spec.bgGradientAngle ?? 135}deg, ${spec.bgGradientFrom || '#0ea5e9'}, ${spec.bgGradientTo || '#6366f1'})`
        : spec.bgMode === 'animated_mesh'
        ? `radial-gradient(circle at 15% 20%, ${spec.bgGradientFrom || '#0ea5e9'}cc, transparent 55%), radial-gradient(circle at 85% 80%, ${spec.bgGradientTo || '#a855f7'}cc, #0b0f1a 70%)`
        : spec.bgMode === 'transparent'
        ? 'transparent'
        : spec.bgMode === 'solid'
        ? spec.bgColor || '#0f131c'
        : `rgba(15,18,26,${(spec.bgOpacity ?? 80) / 100})`,
  };

  const TABS: { id: BuilderTab; label: string; icon: React.ReactNode; count: string }[] = [
    { id: 'actions', label: 'Приложения и Действия', icon: <MousePointerClick size={13} />, count: '22+' },
    { id: 'layout', label: 'Шаблоны и Макет', icon: <Layout size={13} />, count: '21+' },
    { id: 'visual', label: 'Фон, Фото и Свечение', icon: <Palette size={13} />, count: '31+' },
    { id: 'typography', label: 'Текст, Иконка и Шкала', icon: <Type size={13} />, count: '24+' },
    { id: 'data', label: 'Данные, API и JS', icon: <Database size={13} />, count: '22+' },
  ];

  const addQuickButton = () => {
    const cur = spec.quickButtons || [];
    if (cur.length >= 6) return;
    update('quickButtons', [
      ...cur,
      { id: `qb_${Date.now()}`, label: 'Кнопка', emoji: '⚡', actionType: 'open_luma_app', target: 'terminal' },
    ]);
  };

  const addChainStep = () => {
    const cur = spec.chainedActions || [];
    if (cur.length >= 6) return;
    update('chainedActions', [...cur, { id: `ch_${Date.now()}`, actionType: 'system_action', target: 'toggle_gaming' }]);
  };

  return (
    <div className="fixed inset-0 z-[960] flex items-center justify-center p-3 bg-black/65 backdrop-blur-md" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-6xl h-[90vh] max-h-[820px] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
          isDark ? 'bg-[#0d1017]/97 border-white/15 text-white' : 'bg-white/97 border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-purple-500/25 border border-cyan-400/35 flex items-center justify-center text-cyan-400">
              <Sparkles size={17} />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                Конструктор виджетов Pro · Carbon Studio
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  115+ опций
                </span>
              </div>
              <div className={`text-[11px] ${subText}`}>
                Запуск любых приложений ПК, сайтов, скриптов, фото, градиентов, свечения, кнопок, API и JS-логики
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleExportJson} className={`px-2.5 py-1 rounded-xl text-[11px] border flex items-center gap-1 cursor-pointer ${isDark ? 'bg-white/[0.06] border-white/10 hover:bg-white/12' : 'bg-slate-100 border-slate-200'}`} title="Экспорт виджета в JSON">
              <Download size={12} /> JSON
            </button>
            <label className={`px-2.5 py-1 rounded-xl text-[11px] border flex items-center gap-1 cursor-pointer ${isDark ? 'bg-white/[0.06] border-white/10 hover:bg-white/12' : 'bg-slate-100 border-slate-200'}`} title="Импорт виджета из JSON">
              <FileUp size={12} /> Импорт
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
            <button onClick={onClose} className={`p-1.5 rounded-xl cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className={`px-4 py-2 border-b flex items-center gap-1.5 overflow-x-auto shrink-0 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'}`}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                tab === t.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow'
                  : isDark
                  ? 'bg-white/[0.05] text-white/70 hover:bg-white/10'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t.icon}
              {t.label}
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20 text-white' : 'bg-cyan-500/15 text-cyan-400'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left: Controls (7 cols) */}
          <div className="lg:col-span-7 overflow-y-auto p-4 space-y-3.5 border-r border-white/10">
            {/* TAB 4: ACTIONS & LAUNCH ANY PC APP */}
            {tab === 'actions' && (
              <>
                <div className={cardBox}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <AppWindow size={14} className="text-cyan-400" />
                      Быстрый выбор любого приложения с вашего ПК ({installedApps.length})
                    </span>
                    <span className={`text-[10px] ${subText}`}>1 клик подставит путь и иконку</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${isDark ? 'bg-black/30 border-white/12' : 'bg-white border-slate-200'}`}>
                    <Search size={13} className="text-cyan-400 shrink-0" />
                    <input
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      placeholder="Поиск Steam, Telegram, Chrome, Discord, игр и программ..."
                      className="w-full bg-transparent text-xs outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {filteredPcApps.map((app) => (
                      <button
                        key={app.id + app.exec_path}
                        onClick={() =>
                          setSpec((p) => ({
                            ...p,
                            title: app.name,
                            subtitle: 'Нажмите, чтобы запустить',
                            staticValue: app.name,
                            dataSource: 'static',
                            layoutMode: 'launcher',
                            clickActionType: 'launch_pc_app',
                            clickTarget: app.exec_path || app.name,
                            clickLabel: `Открыть ${app.name}`,
                            iconType: app.icon_url ? 'image' : 'lucide',
                            iconImage: app.icon_url || '',
                            iconName: 'AppWindow',
                            showIcon: true,
                          }))
                        }
                        className={`p-1.5 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer ${
                          spec.clickTarget === (app.exec_path || app.name)
                            ? 'bg-cyan-500/20 border-cyan-400/50'
                            : isDark
                            ? 'bg-white/[0.04] border-white/10 hover:bg-white/10'
                            : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {app.icon_url ? (
                          <img src={app.icon_url} alt="" className="w-5 h-5 rounded object-contain shrink-0" />
                        ) : (
                          <AppWindow size={14} className="text-cyan-400 shrink-0" />
                        )}
                        <span className="text-[11px] font-medium truncate">{app.name}</span>
                      </button>
                    ))}
                    {filteredPcApps.length === 0 && (
                      <div className={`col-span-full text-[11px] py-2 text-center ${subText}`}>
                        Укажите путь к `.exe` вручную ниже или выберите встроенное приложение Luma
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Click Action */}
                <div className={cardBox}>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    Основное действие по клику на виджет
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Тип действия</label>
                      <select
                        value={spec.clickActionType || 'none'}
                        onChange={(e) => update('clickActionType', e.target.value as CustomWidgetActionType)}
                        className={selectCls}
                      >
                        <option value="none">Открыть настройки виджета (по умолчанию)</option>
                        <option value="launch_pc_app">Запустить приложение / игру на ПК (.exe)</option>
                        <option value="open_luma_app">Открыть встроенное приложение Luma OS</option>
                        <option value="open_url">Открыть сайт / URL</option>
                        <option value="open_folder">Открыть папку или файл на ПК</option>
                        <option value="run_terminal">Выполнить команду терминала</option>
                        <option value="system_action">Системное действие ОС (Тема/Boost/Звук...)</option>
                        <option value="media_control">Управление музыкой / плеером</option>
                        <option value="copy_text">Скопировать текст в буфер обмена</option>
                        <option value="show_toast">Показать уведомление</option>
                        <option value="run_js">Выполнить свой JS-код при клике</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Цель / Программа / Сайт / Команда</label>
                      {spec.clickActionType === 'open_luma_app' ? (
                        <select value={spec.clickTarget || 'explorer'} onChange={(e) => update('clickTarget', e.target.value)} className={selectCls}>
                          {LUMA_BUILTIN_APP_OPTIONS.map((o) => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                          ))}
                        </select>
                      ) : spec.clickActionType === 'system_action' ? (
                        <select value={spec.clickTarget || 'toggle_gaming'} onChange={(e) => update('clickTarget', e.target.value)} className={selectCls}>
                          {SYSTEM_ACTION_OPTIONS.map((o) => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                          ))}
                        </select>
                      ) : spec.clickActionType === 'media_control' ? (
                        <select value={spec.clickTarget || 'play_pause'} onChange={(e) => update('clickTarget', e.target.value)} className={selectCls}>
                          {MEDIA_CONTROL_OPTIONS.map((o) => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={spec.clickTarget || ''}
                          onChange={(e) => update('clickTarget', e.target.value)}
                          placeholder={
                            spec.clickActionType === 'open_url'
                              ? 'https://youtube.com'
                              : spec.clickActionType === 'launch_pc_app'
                              ? 'C:\\Program Files\\...\\app.exe или notepad'
                              : 'Введите цель...'
                          }
                          className={inputCls}
                        />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Аргументы запуска</label>
                      <input value={spec.clickArgs || ''} onChange={(e) => update('clickArgs', e.target.value)} placeholder="--fullscreen" className={inputCls} />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Подпись кнопки / подсказка</label>
                      <input value={spec.clickLabel || ''} onChange={(e) => update('clickLabel', e.target.value)} placeholder="Запустить" className={inputCls} />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Бейдж горячей клавиши</label>
                      <input value={spec.hotkeyHint || ''} onChange={(e) => update('hotkeyHint', e.target.value)} placeholder="Напр. F9" className={inputCls} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={!!spec.clickConfirm} onChange={(e) => update('clickConfirm', e.target.checked)} className="accent-cyan-400" />
                      Запрашивать подтверждение
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={spec.openInNewTab ?? true} onChange={(e) => update('openInNewTab', e.target.checked)} className="accent-cyan-400" />
                      Открывать URL в новой вкладке
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={spec.clickRipple ?? true} onChange={(e) => update('clickRipple', e.target.checked)} className="accent-cyan-400" />
                      Отклик клика
                    </label>
                  </div>
                </div>

                {/* Double-Click Action */}
                <div className={cardBox}>
                  <div className="text-xs font-bold">Двойной клик (дополнительное действие)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select value={spec.doubleClickActionType || 'none'} onChange={(e) => update('doubleClickActionType', e.target.value as CustomWidgetActionType)} className={selectCls}>
                      <option value="none">Не задано</option>
                      <option value="launch_pc_app">Запустить приложение ПК</option>
                      <option value="open_luma_app">Открыть окно Luma OS</option>
                      <option value="open_url">Открыть сайт / URL</option>
                      <option value="run_terminal">Команда терминала</option>
                      <option value="system_action">Системное действие</option>
                    </select>
                    <input value={spec.doubleClickTarget || ''} onChange={(e) => update('doubleClickTarget', e.target.value)} placeholder="Цель двойного клика..." className={inputCls} />
                  </div>
                </div>

                {/* Inline Mini-Buttons Deck */}
                <div className={cardBox}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Встроенные мини-кнопки внутри виджета ({(spec.quickButtons || []).length}/6)</span>
                    <div className="flex items-center gap-1.5">
                      <select value={spec.buttonColumns || 2} onChange={(e) => update('buttonColumns', Number(e.target.value) as 2 | 3 | 4)} className="px-2 py-1 rounded-lg text-[10px] bg-white/10 border border-white/10">
                        <option value={2}>2 кол.</option>
                        <option value={3}>3 кол.</option>
                        <option value={4}>4 кол.</option>
                      </select>
                      <button onClick={addQuickButton} className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 cursor-pointer flex items-center gap-1">
                        <Plus size={11} /> Кнопка
                      </button>
                    </div>
                  </div>
                  {(spec.quickButtons || []).map((btn, idx) => (
                    <div key={btn.id} className="grid grid-cols-12 gap-1.5 items-center">
                      <input
                        value={btn.emoji}
                        onChange={(e) => {
                          const next = [...(spec.quickButtons || [])];
                          next[idx] = { ...btn, emoji: e.target.value };
                          update('quickButtons', next);
                        }}
                        className={`col-span-2 text-center ${inputCls}`}
                      />
                      <input
                        value={btn.label}
                        onChange={(e) => {
                          const next = [...(spec.quickButtons || [])];
                          next[idx] = { ...btn, label: e.target.value };
                          update('quickButtons', next);
                        }}
                        placeholder="Название"
                        className={`col-span-3 ${inputCls}`}
                      />
                      <select
                        value={btn.actionType}
                        onChange={(e) => {
                          const next = [...(spec.quickButtons || [])];
                          next[idx] = { ...btn, actionType: e.target.value as CustomWidgetActionType };
                          update('quickButtons', next);
                        }}
                        className={`col-span-3 ${selectCls}`}
                      >
                        <option value="launch_pc_app">ПК App</option>
                        <option value="open_luma_app">Luma</option>
                        <option value="open_url">URL</option>
                        <option value="system_action">ОС</option>
                        <option value="media_control">Медиа</option>
                        <option value="run_terminal">CMD</option>
                      </select>
                      <input
                        value={btn.target}
                        onChange={(e) => {
                          const next = [...(spec.quickButtons || [])];
                          next[idx] = { ...btn, target: e.target.value };
                          update('quickButtons', next);
                        }}
                        placeholder="Цель"
                        className={`col-span-3 ${inputCls}`}
                      />
                      <button
                        onClick={() => update('quickButtons', (spec.quickButtons || []).filter((x) => x.id !== btn.id))}
                        className="col-span-1 p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 cursor-pointer flex justify-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Chained Macro Actions */}
                <div className={cardBox}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Цепочка макро-действий (выполняются подряд при клике)</span>
                    <button onClick={addChainStep} className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30 cursor-pointer flex items-center gap-1">
                      <Plus size={11} /> Шаг
                    </button>
                  </div>
                  {(spec.chainedActions || []).map((step, idx) => (
                    <div key={step.id} className="grid grid-cols-12 gap-1.5 items-center">
                      <span className="col-span-1 text-[10px] font-mono opacity-60">#{idx + 1}</span>
                      <select
                        value={step.actionType}
                        onChange={(e) => {
                          const next = [...(spec.chainedActions || [])];
                          next[idx] = { ...step, actionType: e.target.value as CustomWidgetActionType };
                          update('chainedActions', next);
                        }}
                        className={`col-span-4 ${selectCls}`}
                      >
                        <option value="system_action">Системное действие</option>
                        <option value="launch_pc_app">Приложение ПК</option>
                        <option value="open_luma_app">Окно Luma</option>
                        <option value="open_url">Сайт URL</option>
                        <option value="run_terminal">Терминал</option>
                        <option value="show_toast">Уведомление</option>
                      </select>
                      <input
                        value={step.target}
                        onChange={(e) => {
                          const next = [...(spec.chainedActions || [])];
                          next[idx] = { ...step, target: e.target.value };
                          update('chainedActions', next);
                        }}
                        placeholder="Цель шага"
                        className={`col-span-6 ${inputCls}`}
                      />
                      <button
                        onClick={() => update('chainedActions', (spec.chainedActions || []).filter((x) => x.id !== step.id))}
                        className="col-span-1 p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 cursor-pointer flex justify-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* TAB 1: TEMPLATES & LAYOUT */}
            {tab === 'layout' && (
              <>
                <div className={cardBox}>
                  <div className="text-xs font-bold">Готовые пресеты в 1 клик (9 типов)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {PRESET_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.name}
                        onClick={() => setSpec((p) => ({ ...p, ...tpl.patch }))}
                        className={`p-2 rounded-xl border text-left text-[11px] font-medium flex items-center gap-2 transition cursor-pointer ${
                          isDark ? 'bg-white/[0.04] border-white/10 hover:bg-cyan-500/15 hover:border-cyan-400/40' : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-base">{tpl.emoji}</span>
                        <span className="truncate">{tpl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cardBox}>
                  <div className="text-xs font-bold">Основные свойства и сетка</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Заголовок виджета</label>
                      <input value={spec.title} onChange={(e) => update('title', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Подзаголовок</label>
                      <input value={spec.subtitle || ''} onChange={(e) => update('subtitle', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Текст бейджа</label>
                      <input value={spec.badgeText || ''} onChange={(e) => update('badgeText', e.target.value)} placeholder="LIVE / PRO / APP" className={inputCls} />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Режим раскладки</label>
                      <select value={spec.layoutMode || 'standard'} onChange={(e) => update('layoutMode', e.target.value as CustomUserWidgetSpec['layoutMode'])} className={selectCls}>
                        <option value="standard">Стандартная карточка</option>
                        <option value="launcher">Крупный Лаунчер приложения</option>
                        <option value="hero_photo">Фото-обложка (Hero Photo)</option>
                        <option value="minimal_stat">Минималистичная цифра</option>
                        <option value="split_rows">Таблица строк</option>
                        <option value="ring_gauge">Кольцевой индикатор</option>
                        <option value="buttons_grid">Сетка мини-кнопок</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Ширина: {spec.w} кл.</label>
                      <input type="range" min={1} max={6} value={spec.w} onChange={(e) => update('w', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Высота: {spec.h} кл.</label>
                      <input type="range" min={1} max={4} value={spec.h} onChange={(e) => update('h', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Отступы: {spec.padding ?? 14}px</label>
                      <input type="range" min={4} max={28} value={spec.padding ?? 14} onChange={(e) => update('padding', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Выравнивание</label>
                      <select value={spec.contentAlign || 'left'} onChange={(e) => update('contentAlign', e.target.value as 'left' | 'center' | 'right')} className={selectCls}>
                        <option value="left">Слева</option>
                        <option value="center">По центру</option>
                        <option value="right">Справа</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    {(
                      [
                        ['showHeader', 'Показывать шапку'],
                        ['showBadge', 'Показывать бейдж'],
                        ['showSubtitle', 'Показывать подзаголовок'],
                        ['showProgress', 'Показывать прогресс'],
                        ['showRows', 'Показывать строки'],
                        ['showIcon', 'Показывать иконку'],
                        ['showActionHint', 'Подсказка клика'],
                        ['showEditPencil', 'Кнопка ✎ на виджете'],
                        ['compactMode', 'Компактный режим'],
                      ] as const
                    ).map(([k, lbl]) => (
                      <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={spec[k] ?? true}
                          onChange={(e) => update(k, e.target.checked)}
                          className="accent-cyan-400"
                        />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: VISUALS, BACKGROUND, PHOTO, GLOW */}
            {tab === 'visual' && (
              <>
                <div className={cardBox}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-cyan-400" />
                      Тип фона и фоновая картинка (без рамок!)
                    </span>
                    <label className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 cursor-pointer flex items-center gap-1">
                      <Upload size={11} /> Загрузить фото
                      <input type="file" accept="image/*" onChange={handleUploadBg} className="hidden" />
                    </label>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {(
                      [
                        ['image', 'Фото'],
                        ['gradient', 'Градиент'],
                        ['solid', 'Цвет'],
                        ['glass', 'Стекло'],
                        ['animated_mesh', 'Mesh'],
                        ['transparent', 'Прозр.'],
                      ] as const
                    ).map(([m, lbl]) => (
                      <button
                        key={m}
                        onClick={() => update('bgMode', m)}
                        className={`py-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer ${
                          spec.bgMode === m ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200' : isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      value={spec.bgImage?.startsWith('data:') ? 'Локальное фото загружено ✓' : spec.bgImage || ''}
                      onChange={(e) => update('bgImage', e.target.value)}
                      placeholder="URL изображения или выберите из галереи..."
                      className={inputCls}
                    />
                    {spec.bgImage && (
                      <button onClick={() => update('bgImage', '')} className="px-2.5 py-1 rounded-xl text-[11px] bg-rose-500/15 text-rose-400 cursor-pointer shrink-0">
                        Очистить
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {BUILTIN_BG_GALLERY.map((g) => (
                      <button
                        key={g.url}
                        onClick={() => setSpec((p) => ({ ...p, bgMode: 'image', bgImage: g.url }))}
                        className="px-2 py-1 rounded-lg text-[10px] border border-white/10 bg-white/[0.04] hover:bg-white/10 cursor-pointer"
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Прозрачность: {spec.bgOpacity}%</label>
                      <input type="range" min={10} max={100} value={spec.bgOpacity} onChange={(e) => update('bgOpacity', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Размытие фото: {spec.bgBlur}px</label>
                      <input type="range" min={0} max={28} value={spec.bgBlur} onChange={(e) => update('bgBlur', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Яркость: {spec.bgBrightness ?? 100}%</label>
                      <input type="range" min={30} max={160} value={spec.bgBrightness ?? 100} onChange={(e) => update('bgBrightness', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Контраст: {spec.bgContrast ?? 100}%</label>
                      <input type="range" min={50} max={160} value={spec.bgContrast ?? 100} onChange={(e) => update('bgContrast', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Насыщенность: {spec.bgSaturate ?? 110}%</label>
                      <input type="range" min={0} max={200} value={spec.bgSaturate ?? 110} onChange={(e) => update('bgSaturate', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Зум фото: {spec.bgZoom ?? 100}%</label>
                      <input type="range" min={100} max={180} value={spec.bgZoom ?? 100} onChange={(e) => update('bgZoom', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Позиция X: {spec.bgPosX ?? 50}%</label>
                      <input type="range" min={0} max={100} value={spec.bgPosX ?? 50} onChange={(e) => update('bgPosX', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Позиция Y: {spec.bgPosY ?? 50}%</label>
                      <input type="range" min={0} max={100} value={spec.bgPosY ?? 50} onChange={(e) => update('bgPosY', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Цвет 1 / Фон</label>
                      <input type="color" value={spec.bgMode === 'solid' ? spec.bgColor || '#0f131c' : spec.bgGradientFrom || '#0ea5e9'} onChange={(e) => update(spec.bgMode === 'solid' ? 'bgColor' : 'bgGradientFrom', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer bg-transparent" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Градиент 2</label>
                      <input type="color" value={spec.bgGradientTo || '#6366f1'} onChange={(e) => update('bgGradientTo', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer bg-transparent" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Угол: {spec.bgGradientAngle ?? 135}°</label>
                      <input type="range" min={0} max={360} value={spec.bgGradientAngle ?? 135} onChange={(e) => update('bgGradientAngle', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Затемнение фото</label>
                      <select value={spec.imageOverlayGradient || 'dark'} onChange={(e) => update('imageOverlayGradient', e.target.value as CustomUserWidgetSpec['imageOverlayGradient'])} className={selectCls}>
                        <option value="dark">Мягкий тёмный</option>
                        <option value="bottom">Градиент снизу</option>
                        <option value="soft">Лёгкий</option>
                        <option value="none">Без затемнения</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Borders, Glow & Motion */}
                <div className={cardBox}>
                  <div className="text-xs font-bold">Рамка, скругление, свечение (Glow) и анимации</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Скругление: {spec.borderRadius ?? 20}px</label>
                      <input type="range" min={0} max={40} value={spec.borderRadius ?? 20} onChange={(e) => update('borderRadius', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Толщина рамки: {spec.borderWidth ?? 1}px</label>
                      <input type="range" min={0} max={5} value={spec.borderWidth ?? 1} onChange={(e) => update('borderWidth', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Цвет рамки</label>
                      <input type="color" value={spec.borderColor || '#ffffff'} onChange={(e) => update('borderColor', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer bg-transparent" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Неон Glow: {spec.glowRadius ?? 0}px</label>
                      <input type="range" min={0} max={40} value={spec.glowRadius ?? 0} onChange={(e) => update('glowRadius', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Цвет свечения</label>
                      <input type="color" value={spec.glowColor || '#22d3ee'} onChange={(e) => update('glowColor', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer bg-transparent" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Тень: {spec.shadowIntensity ?? 45}%</label>
                      <input type="range" min={0} max={100} value={spec.shadowIntensity ?? 45} onChange={(e) => update('shadowIntensity', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Эффект наведения</label>
                      <select value={spec.hoverEffect || 'lift'} onChange={(e) => update('hoverEffect', e.target.value as CustomUserWidgetSpec['hoverEffect'])} className={selectCls}>
                        <option value="lift">Подъём</option>
                        <option value="scale">Увеличение</option>
                        <option value="glow">Неоновая вспышка</option>
                        <option value="pulse">Пульсация</option>
                        <option value="none">Без эффекта</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Анимация покоя</label>
                      <select value={spec.animationPreset || 'none'} onChange={(e) => update('animationPreset', e.target.value as CustomUserWidgetSpec['animationPreset'])} className={selectCls}>
                        <option value="none">Статичный</option>
                        <option value="breathe">Дыхание</option>
                        <option value="float">Парение</option>
                        <option value="shimmer">Блик</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 3: TYPOGRAPHY, ICON & PROGRESS */}
            {tab === 'typography' && (
              <>
                <div className={cardBox}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Иконка / Эмодзи / Логотип приложения</span>
                    <label className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 cursor-pointer flex items-center gap-1">
                      <Upload size={11} /> Своя иконка
                      <input type="file" accept="image/*" onChange={handleUploadIcon} className="hidden" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Тип иконки</label>
                      <select value={spec.iconType || 'lucide'} onChange={(e) => update('iconType', e.target.value as CustomUserWidgetSpec['iconType'])} className={selectCls}>
                        <option value="lucide">Векторная Lucide</option>
                        <option value="emoji">Эмодзи</option>
                        <option value="image">Картинка / Иконка ПК</option>
                        <option value="none">Скрыть</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Размер: {spec.iconSize ?? 22}px</label>
                      <input type="range" min={14} max={64} value={spec.iconSize ?? 22} onChange={(e) => update('iconSize', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Подложка иконки</label>
                      <select value={spec.iconBgShape || 'squircle'} onChange={(e) => update('iconBgShape', e.target.value as CustomUserWidgetSpec['iconBgShape'])} className={selectCls}>
                        <option value="squircle">Скругл. квадрат</option>
                        <option value="circle">Круг</option>
                        <option value="square">Квадрат</option>
                        <option value="none">Без подложки</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Эмодзи / Имя</label>
                      {spec.iconType === 'emoji' ? (
                        <input value={spec.iconEmoji || '🚀'} onChange={(e) => update('iconEmoji', e.target.value)} className={inputCls} />
                      ) : (
                        <select value={spec.iconName || 'Sparkles'} onChange={(e) => update('iconName', e.target.value)} className={selectCls}>
                          {Object.keys(LUCIDE_ICON_MAP).map((k) => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                <div className={cardBox}>
                  <div className="text-xs font-bold">Шрифты, размеры и цвета текста</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Шрифт</label>
                      <select value={spec.fontFamily || 'sans'} onChange={(e) => update('fontFamily', e.target.value as 'sans' | 'mono' | 'serif')} className={selectCls}>
                        <option value="sans">Современный Sans</option>
                        <option value="mono">Техно Mono</option>
                        <option value="serif">Редакционный Serif</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Акцент</label>
                      <input type="color" value={spec.accentColor} onChange={(e) => update('accentColor', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer bg-transparent" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Цвет заголовка</label>
                      <input type="color" value={spec.titleColor || '#ffffff'} onChange={(e) => update('titleColor', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer bg-transparent" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Цвет значения</label>
                      <input type="color" value={spec.valueColor || '#ffffff'} onChange={(e) => update('valueColor', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer bg-transparent" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Заголовок: {spec.titleSize ?? 10}px</label>
                      <input type="range" min={8} max={22} value={spec.titleSize ?? 10} onChange={(e) => update('titleSize', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Значение: {spec.valueSize ?? 24}px</label>
                      <input type="range" min={14} max={48} value={spec.valueSize ?? 24} onChange={(e) => update('valueSize', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Подпись: {spec.subtitleSize ?? 11}px</label>
                      <input type="range" min={9} max={18} value={spec.subtitleSize ?? 11} onChange={(e) => update('subtitleSize', Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Стиль шкалы</label>
                      <select value={spec.progressStyle || 'bar'} onChange={(e) => update('progressStyle', e.target.value as CustomUserWidgetSpec['progressStyle'])} className={selectCls}>
                        <option value="bar">Гладкая полоса</option>
                        <option value="segmented">Сегменты</option>
                        <option value="dots">Точки</option>
                        <option value="hidden">Скрыта</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={spec.titleUppercase ?? true} onChange={(e) => update('titleUppercase', e.target.checked)} className="accent-cyan-400" />
                      ЗАГЛАВНЫЕ буквы в шапке
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={spec.textShadow ?? true} onChange={(e) => update('textShadow', e.target.checked)} className="accent-cyan-400" />
                      Тень текста (читаемость на фото)
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* TAB 5: LIVE DATA, ALERTS, ROWS & JS */}
            {tab === 'data' && (
              <>
                <div className={cardBox}>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Sliders size={14} className="text-emerald-400" />
                    Источник живых данных
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Источник</label>
                      <select value={spec.dataSource || 'js_script'} onChange={(e) => update('dataSource', e.target.value as CustomUserWidgetSpec['dataSource'])} className={selectCls}>
                        <option value="static">Статичный текст / Кнопка</option>
                        <option value="js_script">Свой JS-скрипт (Pro)</option>
                        <option value="telemetry_cpu">Живая нагрузка CPU %</option>
                        <option value="telemetry_ram">Живая память RAM %</option>
                        <option value="telemetry_gpu">Живая видеокарта GPU %</option>
                        <option value="telemetry_battery">Заряд батареи %</option>
                        <option value="wireless">Беспроводные устройства</option>
                        <option value="clock">Живые часы и дата</option>
                        <option value="weather">Живая погода</option>
                        <option value="countdown">Обратный отсчёт до даты</option>
                        <option value="http_json">Внешний HTTP JSON API</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Префикс</label>
                      <input value={spec.staticPrefix || ''} onChange={(e) => update('staticPrefix', e.target.value)} placeholder="Напр. ⚡ " className={inputCls} />
                    </div>
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Суффикс</label>
                      <input value={spec.staticSuffix || ''} onChange={(e) => update('staticSuffix', e.target.value)} placeholder="Напр. FPS" className={inputCls} />
                    </div>
                  </div>

                  {spec.dataSource === 'static' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-[10px] block mb-1 ${subText}`}>Главный текст</label>
                        <input value={spec.staticValue || ''} onChange={(e) => update('staticValue', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={`text-[10px] block mb-1 ${subText}`}>Ручной прогресс: {spec.progressValueManual ?? 65}%</label>
                        <input type="range" min={0} max={100} value={spec.progressValueManual ?? 65} onChange={(e) => update('progressValueManual', Number(e.target.value))} className="w-full accent-cyan-400" />
                      </div>
                    </div>
                  )}

                  {spec.dataSource === 'countdown' && (
                    <div>
                      <label className={`text-[10px] block mb-1 ${subText}`}>Целевая дата</label>
                      <input type="date" value={spec.countdownDate || ''} onChange={(e) => update('countdownDate', e.target.value)} className={inputCls} />
                    </div>
                  )}

                  {spec.dataSource === 'http_json' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input value={spec.httpUrl || ''} onChange={(e) => update('httpUrl', e.target.value)} placeholder="https://api.example.com/data" className={inputCls} />
                      <input value={spec.httpJsonPath || ''} onChange={(e) => update('httpJsonPath', e.target.value)} placeholder="Поле JSON (напр. price.usd)" className={inputCls} />
                    </div>
                  )}
                </div>

                {/* Custom Info Rows + Threshold Alert */}
                <div className={cardBox}>
                  <div className="text-xs font-bold">Дополнительные строки и порог тревоги (Alert)</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input value={spec.row1Label || ''} onChange={(e) => update('row1Label', e.target.value)} placeholder="Строка 1 (название)" className={inputCls} />
                    <input value={spec.row1Value || ''} onChange={(e) => update('row1Value', e.target.value)} placeholder="Значение 1" className={inputCls} />
                    <input value={spec.row2Label || ''} onChange={(e) => update('row2Label', e.target.value)} placeholder="Строка 2 (название)" className={inputCls} />
                    <input value={spec.row2Value || ''} onChange={(e) => update('row2Value', e.target.value)} placeholder="Значение 2" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                      <input type="checkbox" checked={!!spec.alertEnabled} onChange={(e) => update('alertEnabled', e.target.checked)} className="accent-rose-500" />
                      Тревога по порогу
                    </label>
                    <select value={spec.alertCondition || 'gt'} onChange={(e) => update('alertCondition', e.target.value as 'gt' | 'lt')} className={selectCls}>
                      <option value="gt">Больше &gt;</option>
                      <option value="lt">Меньше &lt;</option>
                    </select>
                    <input type="number" value={spec.alertThreshold ?? 85} onChange={(e) => update('alertThreshold', Number(e.target.value))} className={inputCls} />
                    <input type="color" value={spec.alertColor || '#f43f5e'} onChange={(e) => update('alertColor', e.target.value)} className="w-full h-7 rounded-lg bg-transparent" />
                  </div>
                </div>

                {/* JS Editor */}
                <div className={cardBox}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Code2 size={14} className="text-amber-400" />
                      JS-скрипт данных (ctx.telemetry, ctx.wireless, ctx.time, ctx.weather)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <Play size={10} /> Live
                    </span>
                  </div>
                  <textarea
                    value={spec.scriptCode}
                    onChange={(e) => setSpec((p) => ({ ...p, dataSource: 'js_script', scriptCode: e.target.value }))}
                    rows={8}
                    spellCheck={false}
                    className="w-full p-2.5 rounded-xl font-mono text-[11px] leading-relaxed border border-white/15 bg-[#080a10] text-emerald-300 outline-none resize-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* Right: Live Preview + Summary (5 cols) */}
          <div className="lg:col-span-5 p-4 flex flex-col justify-between gap-3 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${subText}`}>
                  Живой предпросмотр (без рамок · {spec.w}×{spec.h})
                </span>
                {jsonToast && <span className="text-[10px] text-emerald-400 font-semibold">{jsonToast}</span>}
              </div>

              <div
                className="relative rounded-3xl p-5 min-h-[245px] flex items-center justify-center border border-white/10 overflow-hidden"
                style={{
                  background: 'radial-gradient(circle at 20% 20%, rgba(34,211,238,0.22), rgba(11,14,22,0.96) 65%)',
                }}
              >
                <div
                  className={`relative w-full max-w-[310px] overflow-hidden text-white flex flex-col justify-between transition-all ${
                    isAlertTriggered && spec.alertPulse ? 'animate-pulse' : ''
                  }`}
                  style={previewBgStyle}
                >
                  {spec.bgMode === 'image' && spec.bgImage && (
                    <img
                      src={spec.bgImage}
                      alt=""
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{
                        objectFit: spec.bgFit || 'cover',
                        objectPosition: `${spec.bgPosX ?? 50}% ${spec.bgPosY ?? 50}%`,
                        transform: spec.bgZoom && spec.bgZoom !== 100 ? `scale(${spec.bgZoom / 100})` : undefined,
                        opacity: spec.bgOpacity / 100,
                        filter: `blur(${(spec.bgBlur || 0) * 0.35}px) brightness(${spec.bgBrightness ?? 100}%) contrast(${spec.bgContrast ?? 100}%) saturate(${spec.bgSaturate ?? 110}%) grayscale(${spec.bgGrayscale ?? 0}%)`,
                      }}
                    />
                  )}
                  {spec.imageOverlayGradient !== 'none' && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          spec.imageOverlayGradient === 'bottom'
                            ? 'linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0.12) 55%, transparent)'
                            : spec.imageOverlayGradient === 'soft'
                            ? 'linear-gradient(135deg, rgba(0,0,0,0.32), rgba(0,0,0,0.48))'
                            : 'linear-gradient(135deg, rgba(0,0,0,0.52), rgba(0,0,0,0.32), rgba(0,0,0,0.68))',
                      }}
                    />
                  )}

                  <div
                    className={`relative z-10 flex flex-col h-full gap-2 ${
                      spec.contentAlign === 'center' ? 'items-center text-center' : spec.contentAlign === 'right' ? 'items-end text-right' : 'items-start text-left'
                    }`}
                    style={{ textShadow: spec.textShadow ? '0 1px 8px rgba(0,0,0,0.6)' : undefined }}
                  >
                    {(spec.showHeader ?? true) && (
                      <div className="w-full flex items-center justify-between gap-2">
                        <span
                          className={`truncate ${spec.titleUppercase ? 'uppercase' : ''}`}
                          style={{
                            fontSize: `${spec.titleSize ?? 10}px`,
                            color: spec.titleColor || '#ffffff',
                            fontWeight: spec.titleWeight === 'black' ? 900 : spec.titleWeight === 'bold' ? 700 : 600,
                            letterSpacing: `${(spec.titleTracking ?? 1) * 0.05}em`,
                          }}
                        >
                          {previewOut.headline || spec.title}
                        </span>
                        {(spec.showBadge ?? true) && previewOut.badge && (
                          <span
                            className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0"
                            style={{ backgroundColor: `${activeAccent}33`, color: activeAccent, border: `1px solid ${activeAccent}55` }}
                          >
                            {previewOut.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Icon + Value */}
                    <div className={`w-full flex items-center gap-3 my-auto ${spec.contentAlign === 'center' ? 'flex-col justify-center' : ''}`}>
                      {(spec.showIcon ?? true) && spec.iconType !== 'none' && (
                        <div
                          className={`shrink-0 flex items-center justify-center ${
                            spec.iconBgShape === 'circle' ? 'rounded-full p-2' : spec.iconBgShape === 'squircle' ? 'rounded-2xl p-2' : spec.iconBgShape === 'square' ? 'rounded-md p-2' : ''
                          }`}
                          style={{
                            backgroundColor:
                              spec.iconBgShape !== 'none'
                                ? `${spec.iconBgColor || activeAccent}${Math.round(((spec.iconBgOpacity ?? 18) / 100) * 255)
                                    .toString(16)
                                    .padStart(2, '0')}`
                                : undefined,
                          }}
                        >
                          {spec.iconType === 'image' && spec.iconImage ? (
                            <img src={spec.iconImage} alt="" style={{ width: spec.iconSize ?? 24, height: spec.iconSize ?? 24 }} className="object-contain rounded" />
                          ) : spec.iconType === 'emoji' ? (
                            <span style={{ fontSize: `${spec.iconSize ?? 24}px`, lineHeight: 1 }}>{spec.iconEmoji || '🚀'}</span>
                          ) : (
                            renderCustomLucideIcon(spec.iconName, spec.iconSize ?? 22, spec.iconColor || activeAccent)
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {previewOut.value && (
                          <div
                            className="leading-none truncate"
                            style={{
                              fontSize: `${spec.valueSize ?? 24}px`,
                              color: spec.valueColor || '#ffffff',
                              fontWeight: spec.valueWeight === 'semibold' ? 600 : spec.valueWeight === 'bold' ? 700 : 900,
                            }}
                          >
                            {previewOut.value}
                          </div>
                        )}
                        {(spec.showSubtitle ?? true) && previewOut.subtitle && (
                          <div className="mt-1 truncate" style={{ fontSize: `${spec.subtitleSize ?? 11}px`, color: spec.subtitleColor || '#d4d4d8' }}>
                            {previewOut.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Mini-Buttons preview */}
                    {(spec.quickButtons || []).length > 0 && (
                      <div
                        className="w-full grid gap-1.5 pt-1"
                        style={{ gridTemplateColumns: `repeat(${spec.buttonColumns || 2}, minmax(0, 1fr))` }}
                      >
                        {(spec.quickButtons || []).map((b) => (
                          <div key={b.id} className="px-2 py-1 rounded-xl bg-white/12 border border-white/15 text-[10px] font-semibold truncate text-center">
                            {b.emoji} {b.label}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Progress Bar */}
                    {(spec.showProgress ?? true) && spec.progressStyle !== 'hidden' && typeof previewOut.progress === 'number' && (
                      <div className="w-full">
                        {spec.progressStyle === 'segmented' ? (
                          <div className="grid grid-cols-10 gap-1">
                            {Array.from({ length: 10 }).map((_, idx) => (
                              <div
                                key={idx}
                                className="rounded-sm"
                                style={{
                                  height: `${spec.progressHeight ?? 6}px`,
                                  backgroundColor: idx * 10 < (previewOut.progress || 0) ? activeAccent : 'rgba(255,255,255,0.16)',
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-full rounded-full bg-white/15 overflow-hidden" style={{ height: `${spec.progressHeight ?? 6}px` }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${previewOut.progress}%`, backgroundColor: activeAccent }} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rows */}
                    {(spec.showRows ?? true) && previewOut.rows && previewOut.rows.length > 0 && (
                      <div className="w-full space-y-1 pt-1 border-t border-white/12">
                        {previewOut.rows.slice(0, 3).map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px]">
                            <span className="text-white/70 truncate">{r.label}</span>
                            <span className="font-mono font-bold" style={{ color: activeAccent }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action & Validation Status */}
              <div
                className={`p-3 rounded-2xl border text-[11px] flex items-start gap-2 ${
                  previewOut.error
                    ? 'bg-rose-500/10 border-rose-400/30 text-rose-300'
                    : isDark
                    ? 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {previewOut.error ? (
                  <>
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>Ошибка скрипта: {previewOut.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Виджет готов к размещению!</div>
                      <div className="opacity-80 text-[10px] mt-0.5">
                        Клик: {spec.clickActionType && spec.clickActionType !== 'none' ? `${spec.clickActionType} → ${spec.clickTarget || 'OK'}` : 'Настройки виджета'}
                        {(spec.chainedActions || []).length > 0 ? ` · +${spec.chainedActions!.length} макро-шагов` : ''}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-slate-100 hover:bg-slate-200'}`}
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={!!previewOut.error}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-40 text-white flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              >
                <Plus size={14} />
                {initialSpec ? 'Сохранить виджет' : 'Добавить на рабочий стол'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
