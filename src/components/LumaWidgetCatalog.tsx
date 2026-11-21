import React, { useMemo, useState } from 'react';
import {
  Activity,
  BatteryCharging,
  Calculator,
  Calendar,
  CheckSquare,
  Clock,
  CloudSun,
  Cpu,
  Disc3,
  HardDrive,
  LayoutGrid,
  Power,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Timer,
  TrendingUp,
  Wifi,
  X,
} from 'lucide-react';

export type WidgetShape = 'squircle' | 'circle' | 'pill' | 'sharp' | 'leaf' | 'chamfer';
export type WidgetCategoryId = 'all' | 'clock' | 'battery' | 'weather' | 'media' | 'system' | 'tools';

export interface WidgetVariantDef {
  id: string;
  label: string;
  desc: string;
  w: number;
  h: number;
  shape: WidgetShape;
  previewKind: 'circle' | 'square' | 'wide' | 'pill' | 'flip';
}

export interface WidgetCatalogDef {
  type: string;
  title: string;
  group: 'Основное' | 'Система' | 'Инструменты';
  category: Exclude<WidgetCategoryId, 'all'>;
  defaultW: number;
  defaultH: number;
  defaultVariant: string;
  defaultShape: WidgetShape;
  summary: string;
  variants: WidgetVariantDef[];
}

export const SHAPE_OPTIONS: { id: WidgetShape; label: string; cls: string }[] = [
  { id: 'squircle', label: 'Скругл.', cls: 'luma-shape-squircle' },
  { id: 'circle', label: 'Круг', cls: 'luma-shape-circle' },
  { id: 'pill', label: 'Капсула', cls: 'luma-shape-pill' },
  { id: 'sharp', label: 'Квадрат', cls: 'luma-shape-sharp' },
  { id: 'leaf', label: 'Лист', cls: 'luma-shape-leaf' },
  { id: 'chamfer', label: 'Грань', cls: 'luma-shape-chamfer' },
];

export function getShapeClass(shape?: WidgetShape): string {
  switch (shape) {
    case 'circle':
      return 'luma-shape-circle';
    case 'pill':
      return 'luma-shape-pill';
    case 'sharp':
      return 'luma-shape-sharp';
    case 'leaf':
      return 'luma-shape-leaf';
    case 'chamfer':
      return 'luma-shape-chamfer';
    default:
      return 'luma-shape-squircle';
  }
}

export const DESKTOP_WIDGET_CATALOG: WidgetCatalogDef[] = [
  {
    type: 'luma_clock',
    title: 'Часы и дата',
    group: 'Основное',
    category: 'clock',
    defaultW: 5,
    defaultH: 3,
    defaultVariant: 'wide_editorial',
    defaultShape: 'squircle',
    summary: '5 стилей: 18 циферблатов, круглые аналоговые, матричный квадрат, флип и капсула',
    variants: [
      { id: 'wide_editorial', label: '18 Циферблатов', desc: 'Синхронизация с выбранным стилем часов', w: 5, h: 3, shape: 'squircle', previewKind: 'wide' },
      { id: 'analog_circle', label: 'Аналоговый круг', desc: 'Круглый циферблат со стрелками', w: 3, h: 3, shape: 'circle', previewKind: 'circle' },
      { id: 'square_matrix', label: 'Квадрат матрица', desc: 'Крупные часы над минутами', w: 3, h: 3, shape: 'squircle', previewKind: 'square' },
      { id: 'split_flip', label: 'Механика Флип', desc: 'Раздельные перекидные табло', w: 4, h: 2, shape: 'sharp', previewKind: 'flip' },
      { id: 'pill_minimal', label: 'Мини-капсула', desc: 'Узкая строка времени и даты', w: 4, h: 1, shape: 'pill', previewKind: 'pill' },
    ],
  },
  {
    type: 'luma_battery',
    title: 'Батарея и питание',
    group: 'Система',
    category: 'battery',
    defaultW: 3,
    defaultH: 3,
    defaultVariant: 'circle_ring',
    defaultShape: 'circle',
    summary: 'Реальный заряд АКБ: кольцо, квадратная ячейка, полоса или компактная капсула',
    variants: [
      { id: 'circle_ring', label: 'Кольцо заряда', desc: 'Круговой индикатор процентов', w: 3, h: 3, shape: 'circle', previewKind: 'circle' },
      { id: 'square_cell', label: 'Квадрат ячейка', desc: 'Вертикальный элемент питания', w: 3, h: 3, shape: 'squircle', previewKind: 'square' },
      { id: 'wide_bar', label: 'Широкая шкала', desc: 'Процент, статус сети и полоса', w: 4, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'pill_compact', label: 'Капсула питания', desc: 'Компактный индикатор 3×1', w: 3, h: 1, shape: 'pill', previewKind: 'pill' },
    ],
  },
  {
    type: 'luma_weather',
    title: 'Погода (Авто-регион)',
    group: 'Основное',
    category: 'weather',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'wide_forecast',
    defaultShape: 'squircle',
    summary: 'Погода Open-Meteo по вашему городу: широкая карточка, квадрат или круглый радар',
    variants: [
      { id: 'wide_forecast', label: 'Широкий прогноз', desc: 'Город, температура, ветер и влажность', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'square_card', label: 'Квадрат погоды', desc: 'Компактная плитка 3×3 с крупной цифрой', w: 3, h: 3, shape: 'squircle', previewKind: 'square' },
      { id: 'circle_radar', label: 'Круглый радар', desc: 'Атмосферный круглый виджет 3×3', w: 3, h: 3, shape: 'circle', previewKind: 'circle' },
    ],
  },
  {
    type: 'luma_media',
    title: 'Медиаплеер',
    group: 'Основное',
    category: 'media',
    defaultW: 6,
    defaultH: 2,
    defaultVariant: 'wide_deck',
    defaultShape: 'squircle',
    summary: 'Управление реальной музыкой ОС: широкая дека, виниловый круг или квадратная обложка',
    variants: [
      { id: 'wide_deck', label: 'Широкая дека', desc: 'Трек, эквалайзер и все кнопки', w: 6, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'vinyl_circle', label: 'Виниловый круг', desc: 'Вращающийся круглый диск 3×3', w: 3, h: 3, shape: 'circle', previewKind: 'circle' },
      { id: 'square_cover', label: 'Квадрат обложка', desc: 'Карточка 3×3 с кнопками внизу', w: 3, h: 3, shape: 'squircle', previewKind: 'square' },
    ],
  },
  {
    type: 'luma_sys',
    title: 'CPU / RAM / Система',
    group: 'Система',
    category: 'system',
    defaultW: 6,
    defaultH: 2,
    defaultVariant: 'wide_telemetry',
    defaultShape: 'squircle',
    summary: 'Живая нагрузка процессора, памяти и дисков: 4 шкалы, двойные кольца или полоса',
    variants: [
      { id: 'wide_telemetry', label: 'Панель 4 шкалы', desc: 'CPU, ОЗУ, Диск и Заряд в ряд', w: 6, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'dual_rings', label: 'Двойные кольца', desc: 'Два круговых датчика CPU и ОЗУ', w: 4, h: 3, shape: 'squircle', previewKind: 'square' },
      { id: 'pill_strip', label: 'Узкая лента', desc: 'Компактная капсула 5×1', w: 5, h: 1, shape: 'pill', previewKind: 'pill' },
    ],
  },
  {
    type: 'luma_disks',
    title: 'Накопители',
    group: 'Система',
    category: 'system',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'wide_disks',
    defaultShape: 'squircle',
    summary: 'Свободное место на томах ОС: список дисков или круговой индикатор',
    variants: [
      { id: 'wide_disks', label: 'Список томов', desc: 'Полосы заполнения всех дисков', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'circle_disk', label: 'Круг диска', desc: 'Кольцо системного тома 3×3', w: 3, h: 3, shape: 'circle', previewKind: 'circle' },
    ],
  },
  {
    type: 'luma_net',
    title: 'Сеть и IPC',
    group: 'Система',
    category: 'system',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'wide_net',
    defaultShape: 'squircle',
    summary: 'Скорость приёма/отдачи Мбит/с и IP-адрес шины ядра 49215',
    variants: [
      { id: 'wide_net', label: 'Сетевой монитор', desc: 'Приём и отдача рядом', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'square_net', label: 'Квадрат трафика', desc: 'Вертикальные счётчики 3×3', w: 3, h: 3, shape: 'squircle', previewKind: 'square' },
    ],
  },
  {
    type: 'luma_pomodoro',
    title: 'Таймер фокуса',
    group: 'Инструменты',
    category: 'tools',
    defaultW: 4,
    defaultH: 2,
    defaultVariant: 'wide_focus',
    defaultShape: 'squircle',
    summary: 'Интервальный таймер работы 25 минут: широкая карточка или круглый циферблат',
    variants: [
      { id: 'wide_focus', label: 'Панель фокуса', desc: 'Таймер с кнопками Старт и Сброс', w: 4, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'circle_dial', label: 'Круглый таймер', desc: 'Круговой обратный отсчёт 3×3', w: 3, h: 3, shape: 'circle', previewKind: 'circle' },
    ],
  },
  {
    type: 'luma_calendar',
    title: 'Календарь и пояса',
    group: 'Инструменты',
    category: 'clock',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'wide_world',
    defaultShape: 'squircle',
    summary: 'Листок календаря 3×3 или дата с мировыми часовыми поясами',
    variants: [
      { id: 'wide_world', label: 'Дата + Пояса', desc: 'Дата и время MSK / LON / TYO', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'square_date', label: 'Листок даты', desc: 'Крупное число месяца и день недели', w: 3, h: 3, shape: 'squircle', previewKind: 'square' },
    ],
  },
  {
    type: 'luma_quick',
    title: 'Быстрые переключатели',
    group: 'Основное',
    category: 'tools',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'wide_quick',
    defaultShape: 'squircle',
    summary: 'Звук, DND, Luma Island и тема в 1 клик',
    variants: [
      { id: 'wide_quick', label: 'Ряд 4 кнопки', desc: 'Горизонтальный блок управления', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'square_grid', label: 'Матрица 2×2', desc: 'Квадратная сетка 3×3', w: 3, h: 3, shape: 'squircle', previewKind: 'square' },
    ],
  },
  {
    type: 'luma_utils',
    title: 'Системные модули',
    group: 'Система',
    category: 'system',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'wide_utils',
    defaultShape: 'squircle',
    summary: 'Быстрый запуск Проводника, Диспетчера задач, Терминала и Настроек',
    variants: [
      { id: 'wide_utils', label: 'Панель модулей', desc: '4 системные утилиты в ряд', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'square_utils', label: 'Квадрат 2×2', desc: 'Компактная сетка утилит 3×3', w: 3, h: 3, shape: 'squircle', previewKind: 'square' },
    ],
  },
  {
    type: 'luma_notes',
    title: 'Заметки и задачи',
    group: 'Инструменты',
    category: 'tools',
    defaultW: 5,
    defaultH: 3,
    defaultVariant: 'default',
    defaultShape: 'squircle',
    summary: 'Интерактивный список задач с добавлением прямо на рабочем столе',
    variants: [
      { id: 'default', label: 'Список задач', desc: 'Чеклист 5×3 с полем ввода', w: 5, h: 3, shape: 'squircle', previewKind: 'wide' },
      { id: 'compact', label: 'Компактный блок', desc: 'Квадратная карточка 4×3', w: 4, h: 3, shape: 'squircle', previewKind: 'square' },
    ],
  },
  {
    type: 'luma_calc',
    title: 'Калькулятор',
    group: 'Инструменты',
    category: 'tools',
    defaultW: 5,
    defaultH: 3,
    defaultVariant: 'default',
    defaultShape: 'squircle',
    summary: 'Быстрые вычисления без открытия окна',
    variants: [
      { id: 'default', label: 'Инженерная плитка', desc: 'Клавиатура 4×4 с живым расчётом', w: 5, h: 3, shape: 'squircle', previewKind: 'square' },
    ],
  },
  {
    type: 'luma_power',
    title: 'Управление питанием',
    group: 'Система',
    category: 'battery',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'default',
    defaultShape: 'squircle',
    summary: 'Блокировка экрана, спящий режим и Корзина ОС',
    variants: [
      { id: 'default', label: 'Питание 3 кнопки', desc: 'Блок, Сон и Корзина', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'pill_power', label: 'Капсула питания', desc: 'Узкая панель действий', w: 5, h: 1, shape: 'pill', previewKind: 'pill' },
    ],
  },
  {
    type: 'luma_guard',
    title: 'LumaGuard AES-256',
    group: 'Система',
    category: 'system',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'default',
    defaultShape: 'squircle',
    summary: 'Состояние шифрования и быстрая ротация ключей ядра',
    variants: [
      { id: 'default', label: 'Статус защиты', desc: 'AES-256 + кнопка ротации', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
    ],
  },
  {
    type: 'luma_wellbeing',
    title: 'Экранное время',
    group: 'Инструменты',
    category: 'tools',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'default',
    defaultShape: 'squircle',
    summary: 'Счётчик активных сессий и переход в Трекер',
    variants: [
      { id: 'default', label: 'Сводка сессий', desc: 'Активные задачи сейчас', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
    ],
  },
  {
    type: 'luma_rings',
    title: 'Ритм дня',
    group: 'Инструменты',
    category: 'tools',
    defaultW: 4,
    defaultH: 2,
    defaultVariant: 'default',
    defaultShape: 'squircle',
    summary: 'Прогресс выполненных задач за день',
    variants: [
      { id: 'default', label: 'Шкала прогресса', desc: 'Процент выполненных задач', w: 4, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'circle_ring', label: 'Круг прогресса', desc: 'Кольцо активности 3×3', w: 3, h: 3, shape: 'circle', previewKind: 'circle' },
    ],
  },
  {
    type: 'luma_markets',
    title: 'Курсы и рынки',
    group: 'Инструменты',
    category: 'tools',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'default',
    defaultShape: 'squircle',
    summary: 'Компактная лента котировок BTC / ETH / USD',
    variants: [
      { id: 'default', label: 'Лента 3 тикера', desc: 'BTC, ETH и USD в ряд', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
    ],
  },
  {
    type: 'luma_battery_pro',
    title: 'Аналитика Батареи Pro',
    group: 'Система',
    category: 'battery',
    defaultW: 5,
    defaultH: 3,
    defaultVariant: 'lithium_prism',
    defaultShape: 'squircle',
    summary: 'Здоровье АКБ %, циклы зарядки, график разряда и переход в настройки батареи',
    variants: [
      { id: 'lithium_prism', label: 'Призма Lithium', desc: 'График, здоровье % и циклы', w: 5, h: 3, shape: 'squircle', previewKind: 'wide' },
      { id: 'chamfer_pro', label: 'Техно-грань', desc: 'Скошенные углы со статистикой', w: 5, h: 2, shape: 'chamfer', previewKind: 'wide' },
    ],
  },
  {
    type: 'luma_ai_quick',
    title: 'Luma AI Мини-чат',
    group: 'Инструменты',
    category: 'tools',
    defaultW: 6,
    defaultH: 3,
    defaultVariant: 'lithium_prism',
    defaultShape: 'squircle',
    summary: 'Быстрые вопросы к автономному LumaNano 1.2 прямо с рабочего стола (без API)',
    variants: [
      { id: 'lithium_prism', label: 'Карточка чата', desc: 'Поле запроса и мгновенный ответ', w: 6, h: 3, shape: 'squircle', previewKind: 'wide' },
      { id: 'pill_ai', label: 'AI-строка', desc: 'Компактная капсула запроса 6×1', w: 6, h: 1, shape: 'pill', previewKind: 'pill' },
    ],
  },
  {
    type: 'luma_world_clock',
    title: 'Мировые часы (3 города)',
    group: 'Основное',
    category: 'clock',
    defaultW: 6,
    defaultH: 2,
    defaultVariant: 'minimal_editorial',
    defaultShape: 'squircle',
    summary: 'Точное время в 3 мировых столицах в реальном времени (Москва / Лондон / Токио)',
    variants: [
      { id: 'minimal_editorial', label: '3 Города в ряд', desc: 'Синхронизация по UTC', w: 6, h: 2, shape: 'squircle', previewKind: 'wide' },
      { id: 'chamfer_cities', label: 'Гранёный блок', desc: 'Контрастный стиль с гранями', w: 6, h: 2, shape: 'chamfer', previewKind: 'wide' },
    ],
  },
  {
    type: 'luma_screentime',
    title: 'Экранное время Pro',
    group: 'Инструменты',
    category: 'tools',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'lithium_prism',
    defaultShape: 'squircle',
    summary: 'Живое экранное время за сегодня и столбцы активности за 7 дней',
    variants: [
      { id: 'lithium_prism', label: '7-дневная шкала', desc: 'Экранное время и график', w: 5, h: 2, shape: 'squircle', previewKind: 'wide' },
    ],
  },
  {
    type: 'luma_lithium_spectrum',
    title: 'Спектр Lithium Li-3',
    group: 'Основное',
    category: 'media',
    defaultW: 5,
    defaultH: 2,
    defaultVariant: 'chamfer_pro',
    defaultShape: 'chamfer',
    summary: 'Эквалайзер и быстрый запуск Калькулятора, Luma AI и Служб ОС',
    variants: [
      { id: 'chamfer_pro', label: 'Кристалл Li-3', desc: 'Живые волны и быстрые ярлыки', w: 5, h: 2, shape: 'chamfer', previewKind: 'wide' },
    ],
  },
];

export function getWidgetDef(widgetType: string): WidgetCatalogDef {
  return DESKTOP_WIDGET_CATALOG.find((d) => d.type === widgetType) || DESKTOP_WIDGET_CATALOG[0];
}

function getWidgetFamilyIcon(type: string) {
  switch (type) {
    case 'luma_clock':
    case 'luma_world_clock':
      return <Clock className="w-4 h-4" />;
    case 'luma_battery':
    case 'luma_battery_pro':
      return <BatteryCharging className="w-4 h-4" />;
    case 'luma_weather':
      return <CloudSun className="w-4 h-4" />;
    case 'luma_media':
    case 'luma_lithium_spectrum':
      return <Disc3 className="w-4 h-4" />;
    case 'luma_sys':
      return <Cpu className="w-4 h-4" />;
    case 'luma_disks':
      return <HardDrive className="w-4 h-4" />;
    case 'luma_net':
      return <Wifi className="w-4 h-4" />;
    case 'luma_pomodoro':
      return <Timer className="w-4 h-4" />;
    case 'luma_calendar':
      return <Calendar className="w-4 h-4" />;
    case 'luma_quick':
      return <Sliders className="w-4 h-4" />;
    case 'luma_utils':
      return <LayoutGrid className="w-4 h-4" />;
    case 'luma_notes':
      return <CheckSquare className="w-4 h-4" />;
    case 'luma_calc':
      return <Calculator className="w-4 h-4" />;
    case 'luma_power':
      return <Power className="w-4 h-4" />;
    case 'luma_guard':
      return <ShieldCheck className="w-4 h-4" />;
    case 'luma_wellbeing':
    case 'luma_screentime':
      return <Activity className="w-4 h-4" />;
    case 'luma_rings':
    case 'luma_ai_quick':
      return <Sparkles className="w-4 h-4" />;
    case 'luma_markets':
      return <TrendingUp className="w-4 h-4" />;
    default:
      return <LayoutGrid className="w-4 h-4" />;
  }
}

function VariantMiniPreview({
  widgetType,
  variant,
  isDark,
}: {
  widgetType: string;
  variant: WidgetVariantDef;
  isDark: boolean;
}) {
  const frameBg = isDark ? 'bg-black/45 border-white/12 text-zinc-100' : 'bg-white/85 border-zinc-900/15 text-zinc-900';
  const dimCls = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const shapeBoxCls =
    variant.previewKind === 'circle'
      ? 'w-20 h-20 rounded-full'
      : variant.previewKind === 'square'
      ? 'w-20 h-20 rounded-2xl'
      : variant.previewKind === 'pill'
      ? 'w-36 h-10 rounded-full'
      : variant.previewKind === 'flip'
      ? 'w-32 h-16 rounded-md'
      : 'w-36 h-16 rounded-2xl';

  // Signature visual thumbnails so every widget design is immediately clear
  if (widgetType === 'luma_clock') {
    if (variant.id === 'analog_circle') {
      return (
        <div className={`${shapeBoxCls} border flex items-center justify-center relative ${frameBg}`}>
          <svg viewBox="0 0 60 60" className="w-16 h-16">
            <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <line
                key={deg}
                x1="30"
                y1="6"
                x2="30"
                y2={deg % 90 === 0 ? '11' : '8.5'}
                stroke="currentColor"
                strokeWidth={deg % 90 === 0 ? '2' : '1'}
                transform={`rotate(${deg} 30 30)`}
              />
            ))}
            <line x1="30" y1="30" x2="30" y2="16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" transform="rotate(305 30 30)" />
            <line x1="30" y1="30" x2="30" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" transform="rotate(55 30 30)" />
            <line x1="30" y1="34" x2="30" y2="10" stroke="var(--luma-accent)" strokeWidth="1.2" strokeLinecap="round" transform="rotate(140 30 30)" />
            <circle cx="30" cy="30" r="2.2" fill="var(--luma-accent)" />
          </svg>
        </div>
      );
    }
    if (variant.id === 'square_matrix') {
      return (
        <div className={`${shapeBoxCls} border flex flex-col items-center justify-center leading-none font-mono font-extrabold ${frameBg}`}>
          <span className="text-xl">14</span>
          <span className="text-xl text-[var(--luma-accent)]">38</span>
        </div>
      );
    }
    if (variant.id === 'split_flip') {
      return (
        <div className={`${shapeBoxCls} border flex items-center justify-center gap-1.5 px-2 font-mono font-bold ${frameBg}`}>
          <span className="px-2 py-1.5 rounded bg-black/25 border border-white/10 text-base relative">14</span>
          <span className="text-[var(--luma-accent)]">:</span>
          <span className="px-2 py-1.5 rounded bg-black/25 border border-white/10 text-base relative">38</span>
        </div>
      );
    }
    if (variant.id === 'pill_minimal') {
      return (
        <div className={`${shapeBoxCls} border flex items-center justify-center gap-2 px-3 font-mono text-xs font-bold ${frameBg}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--luma-accent)]" />
          <span>14:38</span>
          <span className={`text-[9px] font-normal ${dimCls}`}>ПТ 20</span>
        </div>
      );
    }
    return (
      <div className={`${shapeBoxCls} border flex flex-col justify-between p-2.5 font-mono ${frameBg}`}>
        <span className={`text-[8px] uppercase ${dimCls}`}>LUMA CLOCK</span>
        <span className="text-xl font-bold leading-none">
          14<span className="text-[var(--luma-accent)]">:</span>38
        </span>
      </div>
    );
  }

  if (widgetType === 'luma_battery') {
    if (variant.id === 'circle_ring') {
      return (
        <div className={`${shapeBoxCls} border flex items-center justify-center relative ${frameBg}`}>
          <svg viewBox="0 0 60 60" className="w-16 h-16 -rotate-90">
            <circle cx="30" cy="30" r="23" fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="5" />
            <circle cx="30" cy="30" r="23" fill="none" stroke="var(--luma-accent)" strokeWidth="5" strokeDasharray="144" strokeDashoffset="28" strokeLinecap="round" />
          </svg>
          <span className="absolute text-xs font-mono font-bold">84%</span>
        </div>
      );
    }
    if (variant.id === 'square_cell') {
      return (
        <div className={`${shapeBoxCls} border p-2 flex flex-col justify-end relative overflow-hidden ${frameBg}`}>
          <div className="absolute inset-x-0 bottom-0 h-[72%] bg-[var(--luma-accent-soft)] border-t-2 border-[var(--luma-accent)]" />
          <div className="relative z-10 text-center font-mono">
            <div className="text-base font-extrabold">84%</div>
            <div className={`text-[8px] ${dimCls}`}>АКБ</div>
          </div>
        </div>
      );
    }
    if (variant.id === 'pill_compact') {
      return (
        <div className={`${shapeBoxCls} border px-3 flex items-center gap-2 font-mono text-xs font-bold ${frameBg}`}>
          <BatteryCharging className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
          <div className="flex-1 h-1.5 rounded-full bg-zinc-500/25 overflow-hidden">
            <div className="h-full w-4/5 bg-[var(--luma-accent)] rounded-full" />
          </div>
          <span>84%</span>
        </div>
      );
    }
    return (
      <div className={`${shapeBoxCls} border p-2.5 flex flex-col justify-between font-mono ${frameBg}`}>
        <div className="flex justify-between items-center text-[9px]">
          <span className={dimCls}>АКБ</span>
          <span className="font-bold">84%</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-500/25 overflow-hidden">
          <div className="h-full w-4/5 bg-[var(--luma-accent)] rounded-full" />
        </div>
      </div>
    );
  }

  if (widgetType === 'luma_media') {
    if (variant.id === 'vinyl_circle') {
      return (
        <div className={`${shapeBoxCls} border flex items-center justify-center relative ${frameBg}`}>
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-current/25 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-[var(--luma-accent)] flex items-center justify-center text-white text-[9px]">▶</div>
          </div>
        </div>
      );
    }
    if (variant.id === 'square_cover') {
      return (
        <div className={`${shapeBoxCls} border p-2 flex flex-col justify-between ${frameBg}`}>
          <div className="w-6 h-6 rounded-lg bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center">
            <Disc3 className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span>Track</span>
            <span className="text-[var(--luma-accent)]">▶</span>
          </div>
        </div>
      );
    }
    return (
      <div className={`${shapeBoxCls} border px-3 py-2 flex items-center justify-between ${frameBg}`}>
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold">Аудио ОС</div>
          <div className={`text-[8px] font-mono ${dimCls}`}>◀ ▶ ▶▶</div>
        </div>
        <div className="w-6 h-6 rounded-full bg-[var(--luma-accent)] text-white flex items-center justify-center text-[9px]">▶</div>
      </div>
    );
  }

  if (widgetType === 'luma_weather') {
    if (variant.id === 'circle_radar') {
      return (
        <div className={`${shapeBoxCls} border flex flex-col items-center justify-center gap-0.5 ${frameBg}`}>
          <CloudSun className="w-4 h-4 text-[var(--luma-accent)]" />
          <span className="text-sm font-mono font-bold">+18°</span>
        </div>
      );
    }
    if (variant.id === 'square_card') {
      return (
        <div className={`${shapeBoxCls} border p-2 flex flex-col items-center justify-center gap-1 ${frameBg}`}>
          <CloudSun className="w-5 h-5 text-[var(--luma-accent)]" />
          <span className="text-sm font-mono font-bold">+18°</span>
        </div>
      );
    }
    return (
      <div className={`${shapeBoxCls} border px-3 py-2 flex items-center justify-between ${frameBg}`}>
        <div className="flex items-center gap-1.5">
          <CloudSun className="w-4 h-4 text-[var(--luma-accent)]" />
          <span className="text-base font-mono font-bold">+18°</span>
        </div>
        <span className={`text-[8px] font-mono ${dimCls}`}>Ясно</span>
      </div>
    );
  }

  // Generic crisp miniature preview for System, Disks, Net, Pomodoro, Calendar, Tools
  if (variant.previewKind === 'circle') {
    return (
      <div className={`${shapeBoxCls} border flex flex-col items-center justify-center gap-1 ${frameBg}`}>
        <span className="text-[var(--luma-accent)]">{getWidgetFamilyIcon(widgetType)}</span>
        <span className="text-[9px] font-mono font-bold">
          {variant.w}×{variant.h}
        </span>
      </div>
    );
  }
  if (variant.previewKind === 'pill') {
    return (
      <div className={`${shapeBoxCls} border px-3 flex items-center justify-center gap-2 ${frameBg}`}>
        <span className="text-[var(--luma-accent)]">{getWidgetFamilyIcon(widgetType)}</span>
        <span className="text-[10px] font-mono font-bold">
          {variant.w}×{variant.h}
        </span>
      </div>
    );
  }
  return (
    <div className={`${shapeBoxCls} border p-2.5 flex flex-col justify-between ${frameBg}`}>
      <span className="text-[var(--luma-accent)]">{getWidgetFamilyIcon(widgetType)}</span>
      <div className="flex items-center gap-1">
        <span className="h-1 flex-1 rounded-full bg-[var(--luma-accent)]" />
        <span className="h-1 w-4 rounded-full bg-zinc-500/35" />
      </div>
    </div>
  );
}

const CATEGORIES: { id: WidgetCategoryId; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'clock', label: 'Часы и дата' },
  { id: 'battery', label: 'Питание' },
  { id: 'weather', label: 'Погода' },
  { id: 'media', label: 'Медиа' },
  { id: 'system', label: 'Система' },
  { id: 'tools', label: 'Инструменты' },
];

export const LumaWidgetGalleryModal: React.FC<{
  col: number;
  row: number;
  isDark: boolean;
  modalShellCls: string;
  subBtnCls: string;
  mutedCls: string;
  onSelectVariant: (def: WidgetCatalogDef, variant: WidgetVariantDef) => void;
  onClose: () => void;
}> = ({ col, row, isDark, modalShellCls, subBtnCls, mutedCls, onSelectVariant, onClose }) => {
  const [category, setCategory] = useState<WidgetCategoryId>('all');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('luma_clock');

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DESKTOP_WIDGET_CATALOG.filter((def) => {
      if (category !== 'all' && def.category !== category) return false;
      if (!q) return true;
      return (
        def.title.toLowerCase().includes(q) ||
        def.summary.toLowerCase().includes(q) ||
        def.variants.some((v) => v.label.toLowerCase().includes(q))
      );
    });
  }, [category, search]);

  const activeDef = useMemo(() => {
    return filteredCatalog.find((d) => d.type === selectedType) || filteredCatalog[0] || DESKTOP_WIDGET_CATALOG[0];
  }, [filteredCatalog, selectedType]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`luma-animate-in w-full max-w-4xl h-[80vh] max-h-[680px] border flex flex-col overflow-hidden ${modalShellCls}`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isDark ? 'border-white/10' : 'border-zinc-900/10'
          }`}
        >
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-[var(--luma-accent)]" />
              Галерея виджетов Luma ({DESKTOP_WIDGET_CATALOG.length})
            </h3>
            <p className={`text-[11px] font-mono ${mutedCls}`}>
              Ячейка [{col}, {row}] · Выберите виджет слева и стиль/форму справа · После добавления ПКМ меняет размер и форму
            </p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg border cursor-pointer ${subBtnCls}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Pills + Search Bar */}
        <div
          className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
            isDark ? 'border-white/[0.07] bg-white/[0.015]' : 'border-zinc-900/[0.08] bg-zinc-900/[0.02]'
          }`}
        >
          <div className="flex flex-wrap items-center gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  category === c.id ? 'bg-[var(--luma-accent)] text-white' : `${subBtnCls} border`
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border w-48 ${subBtnCls}`}>
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти виджет..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Clean 2-Column Picker: Left = Widget Families, Right = Visual Variants & Shapes */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Left Column: Widget Families */}
          <div
            className={`w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r overflow-y-auto p-2.5 space-y-1 max-h-44 md:max-h-none ${
              isDark ? 'border-white/[0.08]' : 'border-zinc-900/[0.08]'
            }`}
          >
            {filteredCatalog.map((def) => {
              const active = activeDef?.type === def.type;
              return (
                <button
                  key={def.type}
                  onClick={() => setSelectedType(def.type)}
                  className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2.5 transition cursor-pointer ${
                    active
                      ? 'bg-[var(--luma-accent)] text-white font-semibold'
                      : isDark
                      ? 'hover:bg-white/[0.06] text-zinc-200'
                      : 'hover:bg-zinc-900/[0.06] text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={active ? 'text-white' : 'text-[var(--luma-accent)]'}>
                      {getWidgetFamilyIcon(def.type)}
                    </span>
                    <span className="text-xs truncate">{def.title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                      active ? 'bg-white/20 text-white' : 'bg-zinc-500/15 text-zinc-500'
                    }`}
                  >
                    {def.variants.length}
                  </span>
                </button>
              );
            })}
            {filteredCatalog.length === 0 && (
              <div className={`py-8 text-center text-xs font-mono ${mutedCls}`}>Ничего не найдено</div>
            )}
          </div>

          {/* Right Column: Visual Style & Shape Variants for Selected Widget */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
            {activeDef && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-base font-bold flex items-center gap-2">
                      <span className="text-[var(--luma-accent)]">{getWidgetFamilyIcon(activeDef.type)}</span>
                      {activeDef.title}
                    </div>
                    <div className={`text-xs mt-0.5 ${mutedCls}`}>{activeDef.summary}</div>
                  </div>
                  <span className={`text-[10px] font-mono uppercase px-2 py-1 rounded-lg border ${subBtnCls}`}>
                    Стилей: {activeDef.variants.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeDef.variants.map((variant) => {
                    const shapeMeta = SHAPE_OPTIONS.find((s) => s.id === variant.shape);
                    return (
                      <button
                        key={variant.id}
                        onClick={() => onSelectVariant(activeDef, variant)}
                        className={`group p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 hover:border-[var(--luma-accent)] ${subBtnCls}`}
                      >
                        <div className="w-full h-24 rounded-xl flex items-center justify-center bg-black/[0.06] dark:bg-white/[0.03] group-hover:scale-[1.02] transition">
                          <VariantMiniPreview widgetType={activeDef.type} variant={variant} isDark={isDark} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold truncate">{variant.label}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-bold shrink-0">
                              {variant.w}×{variant.h}
                            </span>
                          </div>
                          <div className={`text-[11px] leading-snug ${mutedCls}`}>{variant.desc}</div>
                          <div className="pt-1 flex items-center justify-between text-[10px] font-mono">
                            <span className={mutedCls}>Форма: {shapeMeta?.label || variant.shape}</span>
                            <span className="text-[var(--luma-accent)] font-bold opacity-85 group-hover:opacity-100">
                              + Добавить
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
