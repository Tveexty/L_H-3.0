import React, { useState } from 'react';
import {
  Hand,
  MousePointerClick,
  Puzzle,
  Accessibility,
  ScanSearch,
  Camera,
  Sparkles,
  Check,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import type { PluginItem } from '../data/launcherData';

export type LumaGestureAction =
  | 'screenshot'
  | 'lens_search'
  | 'alt_tab'
  | 'show_desktop'
  | 'prev_desktop'
  | 'next_desktop'
  | 'control_center'
  | 'ai_assistant'
  | 'spotlight'
  | 'none';

export interface LumaGestureConfig {
  enabled: boolean;
  mouseGesturesEnabled: boolean;
  threeFingersDown: LumaGestureAction;
  threeFingersUp: LumaGestureAction;
  threeFingersLeft: LumaGestureAction;
  threeFingersRight: LumaGestureAction;
  fourFingersDown: LumaGestureAction;
  circleOrThreeTap: LumaGestureAction;
}

export interface LumaRmbMenuConfig {
  showLensSearch: boolean;
  showAiQuick: boolean;
  showScreenshot: boolean;
  showOffice: boolean;
  showStyleSwitch: boolean;
}

export interface LumaAccessibilityConfig {
  highContrast: boolean;
  reducedMotion: boolean;
  largeFocusRing: boolean;
}

export const DEFAULT_GESTURE_CONFIG: LumaGestureConfig = {
  enabled: true,
  mouseGesturesEnabled: true,
  threeFingersDown: 'screenshot',
  threeFingersUp: 'alt_tab',
  threeFingersLeft: 'prev_desktop',
  threeFingersRight: 'next_desktop',
  fourFingersDown: 'show_desktop',
  circleOrThreeTap: 'lens_search',
};

export const DEFAULT_RMB_MENU_CONFIG: LumaRmbMenuConfig = {
  showLensSearch: true,
  showAiQuick: true,
  showScreenshot: true,
  showOffice: true,
  showStyleSwitch: true,
};

export const DEFAULT_ACCESSIBILITY_CONFIG: LumaAccessibilityConfig = {
  highContrast: false,
  reducedMotion: false,
  largeFocusRing: false,
};

export const GESTURE_ACTION_OPTIONS: { value: LumaGestureAction; label: string }[] = [
  { value: 'screenshot', label: '📸 Сделать скриншот экрана' },
  { value: 'lens_search', label: '🔎 Luma Обвести для поиска' },
  { value: 'alt_tab', label: '🪟 Обзор открытых окон (Alt+Tab)' },
  { value: 'show_desktop', label: '🖥️ Свернуть все окна (Рабочий стол)' },
  { value: 'prev_desktop', label: '⬅️ Предыдущий рабочий стол' },
  { value: 'next_desktop', label: '➡️ Следующий рабочий стол' },
  { value: 'control_center', label: '🎛️ Панель управления Luma' },
  { value: 'ai_assistant', label: '✨ Открыть Luma Ai Nitrogen' },
  { value: 'spotlight', label: '⚡ Поиск по системе (Alt+R)' },
  { value: 'none', label: '— Не назначено —' },
];

interface LumaAccessibilityGesturesPanelProps {
  isDark: boolean;
  btnCls: string;
  mutedCls: string;
  gestureConfig: LumaGestureConfig;
  onChangeGestureConfig: (next: LumaGestureConfig) => void;
  onTriggerGestureAction: (action: LumaGestureAction, sourceLabel?: string) => void;
  rightClickBack: boolean;
  onChangeRightClickBack: (next: boolean) => void;
  rmbConfig: LumaRmbMenuConfig;
  onChangeRmbConfig: (next: LumaRmbMenuConfig) => void;
  accessibilityConfig: LumaAccessibilityConfig;
  onChangeAccessibilityConfig: (next: LumaAccessibilityConfig) => void;
  touchModeEnabled?: boolean;
  onChangeTouchModeEnabled?: (next: boolean) => void;
  plugins: PluginItem[];
  onTogglePlugin: (id: string) => void;
  showPluginsInGrid: boolean;
  onChangeShowPluginsInGrid: (next: boolean) => void;
  gridColumns: 3 | 4 | 5;
  onChangeGridColumns: (cols: 3 | 4 | 5) => void;
  onOpenPluginsWindow: () => void;
}

export const LumaAccessibilityGesturesPanel: React.FC<LumaAccessibilityGesturesPanelProps> = ({
  isDark,
  btnCls,
  mutedCls,
  gestureConfig,
  onChangeGestureConfig,
  onTriggerGestureAction,
  rightClickBack,
  onChangeRightClickBack,
  rmbConfig,
  onChangeRmbConfig,
  accessibilityConfig,
  onChangeAccessibilityConfig,
  touchModeEnabled = false,
  onChangeTouchModeEnabled,
  plugins,
  onTogglePlugin,
  showPluginsInGrid,
  onChangeShowPluginsInGrid,
  gridColumns,
  onChangeGridColumns,
  onOpenPluginsWindow,
}) => {
  const [padDragStart, setPadDragStart] = useState<{ x: number; y: number } | null>(null);
  const [padStatus, setPadStatus] = useState<string>('Проведите пальцем, стилусом или мышью вниз / вверх / влево / вправо для теста жеста');
  const [nativeTpStatus, setNativeTpStatus] = useState<{
    raw_input_active?: boolean;
    gestures_detected?: number;
    last_gesture?: string;
    platform?: string;
  } | null>(null);

  React.useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch('/api/kernel/gestures/status');
        if (r.ok && alive) {
          const d = await r.json();
          setNativeTpStatus(d);
        }
      } catch {
        /* ignore */
      }
    };
    void poll();
    const id = window.setInterval(poll, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const cardCls = isDark
    ? 'border-white/10 bg-white/[0.03]'
    : 'border-zinc-900/12 bg-black/[0.02]';

  const selectCls = isDark
    ? 'bg-slate-950/85 border-white/15 text-slate-100'
    : 'bg-white border-slate-300 text-slate-900';

  const gestureRows: {
    key: keyof Pick<
      LumaGestureConfig,
      'threeFingersDown' | 'threeFingersUp' | 'threeFingersLeft' | 'threeFingersRight' | 'fourFingersDown' | 'circleOrThreeTap'
    >;
    title: string;
    subtitle: string;
  }[] = [
    {
      key: 'threeFingersDown',
      title: '3 пальца вниз (тачпад HID / экран / Alt+ПКМ)',
      subtitle: 'Быстрое действие при смахивании тремя пальцами вниз',
    },
    {
      key: 'circleOrThreeTap',
      title: 'Круг / 3 пальца тап (или Alt+ПКМ + круг)',
      subtitle: 'Мгновенный запуск «Luma Обвести для поиска»',
    },
    {
      key: 'threeFingersUp',
      title: '3 пальца вверх (тачпад HID / экран / Alt+ПКМ)',
      subtitle: 'Открыть обзор окон или панель',
    },
    {
      key: 'threeFingersLeft',
      title: '3 пальца влево (тачпад HID / экран / Alt+ПКМ)',
      subtitle: 'Переключение на предыдущий рабочий стол',
    },
    {
      key: 'threeFingersRight',
      title: '3 пальца вправо (тачпад HID / экран / Alt+ПКМ)',
      subtitle: 'Переключение на следующий рабочий стол',
    },
    {
      key: 'fourFingersDown',
      title: '4 пальца вниз (тачпад HID / сенсор)',
      subtitle: 'Быстро показать чистый рабочий стол',
    },
  ];

  const handlePadPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!padDragStart) return;
    const dx = e.clientX - padDragStart.x;
    const dy = e.clientY - padDragStart.y;
    setPadDragStart(null);
    if (Math.hypot(dx, dy) < 24) {
      setPadStatus('Распознано касание → запуск «Круг / 3 пальца тап»');
      onTriggerGestureAction(gestureConfig.circleOrThreeTap, 'Тест жеста: 3 пальца тап');
      return;
    }
    if (Math.abs(dy) >= Math.abs(dx)) {
      if (dy > 0) {
        setPadStatus('Распознан жест «3 пальца вниз»!');
        onTriggerGestureAction(gestureConfig.threeFingersDown, 'Тест жеста: 3 пальца вниз');
      } else {
        setPadStatus('Распознан жест «3 пальца вверх»!');
        onTriggerGestureAction(gestureConfig.threeFingersUp, 'Тест жеста: 3 пальца вверх');
      }
    } else if (dx < 0) {
      setPadStatus('Распознан жест «3 пальца влево»!');
      onTriggerGestureAction(gestureConfig.threeFingersLeft, 'Тест жеста: 3 пальца влево');
    } else {
      setPadStatus('Распознан жест «3 пальца вправо»!');
      onTriggerGestureAction(gestureConfig.threeFingersRight, 'Тест жеста: 3 пальца вправо');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. GESTURE CONTROL & LUMA ОБВЕСТИ ДЛЯ ПОИСКА */}
      <div className={`p-4 rounded-2xl border space-y-3.5 ${cardCls}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400 flex items-center justify-center">
              <Hand className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black flex flex-wrap items-center gap-2">
                <span>Управление жестами и Luma Обвести для поиска</span>
                <span className="px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-400 text-[9px] font-mono">1.6.6b · HID</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                    nativeTpStatus?.raw_input_active
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-indigo-500/15 text-indigo-300'
                  }`}
                >
                  {nativeTpStatus?.raw_input_active
                    ? `Win32 HID активен · событий: ${nativeTpStatus.gestures_detected || 0}`
                    : 'Touch + Pointer + HID готовы'}
                </span>
              </div>
              <div className={`text-[11px] ${mutedCls}`}>
                Нативный захват Precision Touchpad (Win32 Raw Input HID) + по-пальцевый сенсорный трекер и жесты мышью (Alt+ПКМ)
                {nativeTpStatus?.last_gesture ? ` · Последний жест: ${nativeTpStatus.last_gesture}` : ''}
              </div>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={gestureConfig.enabled}
              onChange={(e) => onChangeGestureConfig({ ...gestureConfig, enabled: e.target.checked })}
              className="accent-[var(--luma-accent)] w-4 h-4"
            />
            <span>Включено</span>
          </label>
        </div>

        {/* Quick Action Launchers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onTriggerGestureAction('lens_search', 'Luma Обвести для поиска')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:brightness-110 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer transition"
          >
            <ScanSearch className="w-4 h-4" />
            <span>Запустить «Luma Обвести для поиска» (Ctrl+Shift+L)</span>
          </button>
          <button
            type="button"
            onClick={() => onTriggerGestureAction(gestureConfig.threeFingersDown, 'Жест: 3 пальца вниз')}
            className={`px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Проверить жест «3 пальца вниз»</span>
          </button>
        </div>

        {/* Mouse Gestures Switch (so desktop PCs without touchpads can use all gestures!) */}
        <label className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer ${btnCls}`}>
          <div>
            <div className="text-xs font-bold">Жесты мышью на обычном ПК (удерживайте Alt + ПКМ и проведите)</div>
            <div className={`text-[11px] ${mutedCls}`}>
              Позволяет делать свайпы вниз/вверх/влево/вправо или нарисовать круг обычной мышью без тачпада
            </div>
          </div>
          <input
            type="checkbox"
            checked={gestureConfig.mouseGesturesEnabled}
            onChange={(e) => onChangeGestureConfig({ ...gestureConfig, mouseGesturesEnabled: e.target.checked })}
            className="accent-[var(--luma-accent)] w-4 h-4 shrink-0"
          />
        </label>

        {/* Per-Gesture Action Mapping */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {gestureRows.map((row) => (
            <div key={row.key} className={`p-2.5 rounded-xl border space-y-1.5 ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/70'}`}>
              <div className="text-[11px] font-bold">{row.title}</div>
              <div className={`text-[10px] ${mutedCls}`}>{row.subtitle}</div>
              <select
                value={gestureConfig[row.key]}
                onChange={(e) =>
                  onChangeGestureConfig({
                    ...gestureConfig,
                    [row.key]: e.target.value as LumaGestureAction,
                  })
                }
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold outline-none cursor-pointer ${selectCls}`}
              >
                {GESTURE_ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Live Interactive Gesture Test Pad */}
        <div
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setPadDragStart({ x: e.clientX, y: e.clientY });
          }}
          onPointerUp={handlePadPointerUp}
          className={`p-4 rounded-xl border-2 border-dashed text-center select-none cursor-grab active:cursor-grabbing transition ${
            padDragStart
              ? 'border-sky-400 bg-sky-500/15'
              : isDark
              ? 'border-white/15 bg-black/25 hover:border-sky-400/50'
              : 'border-slate-300 bg-slate-50 hover:border-sky-400'
          }`}
        >
          <div className="text-xs font-bold flex items-center justify-center gap-1.5 text-sky-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Интерактивная зона проверки жестов</span>
          </div>
          <div className={`text-[11px] mt-1 ${mutedCls}`}>{padStatus}</div>
        </div>
      </div>

      {/* 2. RIGHT-CLICK (ПКМ) SETTINGS */}
      <div className={`p-4 rounded-2xl border space-y-3 ${cardCls}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-400/30 text-violet-400 flex items-center justify-center">
            <MousePointerClick className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black">Настройки ПКМ (правая кнопка мыши)</div>
            <div className={`text-[11px] ${mutedCls}`}>
              Поведение правой кнопки мыши и состав контекстного меню Рабочего стола
            </div>
          </div>
        </div>

        <label className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer ${btnCls}`}>
          <div>
            <div className="text-xs font-bold">ПКМ «Назад» в каталогах и окнах</div>
            <div className={`text-[11px] ${mutedCls}`}>
              Правый клик возвращает на шаг назад в каталоге приложений и шторках Проводника
            </div>
          </div>
          <input
            type="checkbox"
            checked={rightClickBack}
            onChange={(e) => onChangeRightClickBack(e.target.checked)}
            className="accent-[var(--luma-accent)] w-4 h-4 shrink-0"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(
            [
              { key: 'showLensSearch', label: 'Пункт «Luma Обвести для поиска»' },
              { key: 'showOffice', label: 'Пункт «Luma Office Studio»' },
              { key: 'showStyleSwitch', label: 'Пункт «Сменить стиль оболочки»' },
            ] as const
          ).map((item) => (
            <label
              key={item.key}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer ${btnCls}`}
            >
              <span className="font-medium">{item.label}</span>
              <input
                type="checkbox"
                checked={rmbConfig[item.key]}
                onChange={(e) => onChangeRmbConfig({ ...rmbConfig, [item.key]: e.target.checked })}
                className="accent-[var(--luma-accent)] w-3.5 h-3.5 shrink-0"
              />
            </label>
          ))}
        </div>
      </div>

      {/* 3. PLUGINS & EXTENSIONS */}
      <div className={`p-4 rounded-2xl border space-y-3 ${cardCls}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center">
              <Puzzle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black">Плагины и расширения Luma OS</div>
              <div className={`text-[11px] ${mutedCls}`}>
                Активно: {plugins.filter((p) => p.enabled).length} из {plugins.length} модулей
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPluginsWindow}
            className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Каталог плагинов</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs cursor-pointer ${btnCls}`}>
            <span className="font-semibold">Показывать плагины в сетке приложений</span>
            <input
              type="checkbox"
              checked={showPluginsInGrid}
              onChange={(e) => onChangeShowPluginsInGrid(e.target.checked)}
              className="accent-[var(--luma-accent)] w-4 h-4"
            />
          </label>
          <div className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs ${btnCls}`}>
            <span className="font-semibold flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 opacity-70" />
              Колонок в каталоге:
            </span>
            <div className="flex gap-1">
              {([3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChangeGridColumns(n)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                    gridColumns === n ? 'bg-[var(--luma-accent)] text-white' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {plugins.map((pl) => (
            <button
              key={pl.id}
              type="button"
              onClick={() => onTogglePlugin(pl.id)}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition ${
                pl.enabled
                  ? 'border-emerald-500/45 bg-emerald-500/10'
                  : btnCls
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{pl.name}</div>
                <div className={`text-[10px] truncate ${mutedCls}`}>{pl.description}</div>
              </div>
              <span
                className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                  pl.enabled ? 'bg-emerald-500 text-white' : 'bg-white/10 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. TOUCHSCREEN & STYLUS (PEN) SUPPORT — LUMA OS 1.6.3 */}
      <div className={`p-4 rounded-2xl border space-y-3 ${cardCls}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 flex items-center justify-center">
              <Hand className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black flex items-center gap-2">
                <span>Сенсорный экран и стилус (Touch &amp; Pen)</span>
                <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 text-[9px] font-mono">1.6.3</span>
              </div>
              <div className={`text-[11px] ${mutedCls}`}>
                Увеличенные кнопки, перетаскивание окон пальцем/стилусом, удержание = ПКМ и чувствительность к нажатию пера
              </div>
            </div>
          </div>
          {onChangeTouchModeEnabled && (
            <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={touchModeEnabled}
                onChange={(e) => onChangeTouchModeEnabled(e.target.checked)}
                className="accent-[var(--luma-accent)] w-4 h-4"
              />
              <span>{touchModeEnabled ? 'Активно' : 'Авто'}</span>
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void fetch('/api/kernel/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: 'osk.exe' }),
              }).catch(() => {});
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${btnCls}`}
          >
            ⌨️ Открыть экранную клавиатуру
          </button>
          <span className={`text-[11px] ${mutedCls}`}>
            {typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
              ? `Обнаружен сенсорный ввод (${navigator.maxTouchPoints} касаний)`
              : 'Поддержка стилуса, планшетов и сенсорных ноутбуков готова'}
          </span>
        </div>
      </div>

      {/* 5. ACCESSIBILITY OPTIONS (СПЕЦВОЗМОЖНОСТИ) */}
      <div className={`p-4 rounded-2xl border space-y-2.5 ${cardCls}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-400 flex items-center justify-center">
            <Accessibility className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black">Спецвозможности интерфейса</div>
            <div className={`text-[11px] ${mutedCls}`}>
              Контрастность, снижение анимаций и увеличенный фокус для комфортной работы
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(
            [
              { key: 'highContrast', label: 'Высокий контраст' },
              { key: 'reducedMotion', label: 'Минимум анимаций' },
              { key: 'largeFocusRing', label: 'Яркая рамка фокуса' },
            ] as const
          ).map((a) => (
            <label
              key={a.key}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
            >
              <span>{a.label}</span>
              <input
                type="checkbox"
                checked={accessibilityConfig[a.key]}
                onChange={(e) =>
                  onChangeAccessibilityConfig({
                    ...accessibilityConfig,
                    [a.key]: e.target.checked,
                  })
                }
                className="accent-[var(--luma-accent)] w-4 h-4"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
