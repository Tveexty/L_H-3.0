import React, { useMemo, useState } from 'react';
import {
  Zap,
  Plus,
  Play,
  Trash2,
  Power,
  Sparkles,
  Clock,
  BatteryLow,
  AppWindow,
  Shield,
  SunMoon,
  Volume2,
  MousePointer2,
  BellOff,
  Camera,
  Cpu,
  Layers,
  CheckCircle2,
  ArrowRight,
  Flame,
  Moon,
  MicOff,
  Wifi,
  Terminal,
  Globe,
  Filter,
  Copy,
  Sliders,
  Video,
  Bluetooth,
  Monitor,
} from 'lucide-react';

export type ScenarioTriggerType =
  | 'app_launch'
  | 'app_close'
  | 'power_ac'
  | 'power_battery'
  | 'battery_low'
  | 'battery_full'
  | 'time_at'
  | 'time_range'
  | 'cpu_high'
  | 'ram_high'
  | 'gpu_hot'
  | 'wifi_change'
  | 'bt_device'
  | 'theme_change'
  | 'vault_enter'
  | 'system_boot'
  | 'manual';

export type ScenarioConditionType =
  | 'none'
  | 'only_on_battery'
  | 'only_on_ac'
  | 'only_at_night'
  | 'only_in_day'
  | 'only_if_cpu_high'
  | 'only_if_dnd_off';

export type ScenarioActionType =
  | 'set_dnd'
  | 'set_theme'
  | 'set_volume'
  | 'set_brightness'
  | 'set_night_light'
  | 'set_gaming_boost'
  | 'set_mic_mute'
  | 'set_mouse_dpi'
  | 'set_power_plan'
  | 'open_window'
  | 'launch_pc_app'
  | 'open_url'
  | 'run_terminal'
  | 'take_screenshot'
  | 'start_recording'
  | 'optimize_ram'
  | 'notify'
  | 'toggle_island'
  | 'toggle_dual_bar'
  | 'lock_screen'
  | 'sleep_pc'
  | 'clean_trash';

export interface ScenarioActionStep {
  actionType: ScenarioActionType;
  actionParam: string;
}

export interface LumaScenarioRule {
  id: string;
  name: string;
  category?: 'gaming' | 'work' | 'power' | 'privacy' | 'media' | 'custom';
  enabled: boolean;
  triggerType: ScenarioTriggerType;
  triggerParam: string;
  conditionType?: ScenarioConditionType;
  actionType: ScenarioActionType;
  actionParam: string;
  extraActions?: ScenarioActionStep[];
  cooldownSec?: number;
  lastRunAt?: string;
  runCount?: number;
}

export const DEFAULT_SCENARIOS: LumaScenarioRule[] = [
  {
    id: 'sc_gaming_focus',
    name: 'Игровой режим (Steam / CS2 / Valorant)',
    category: 'gaming',
    enabled: true,
    triggerType: 'app_launch',
    triggerParam: 'steam',
    conditionType: 'none',
    actionType: 'set_gaming_boost',
    actionParam: 'on',
    extraActions: [
      { actionType: 'set_dnd', actionParam: 'on' },
      { actionType: 'set_power_plan', actionParam: 'performance' },
    ],
    runCount: 0,
  },
  {
    id: 'sc_low_battery_saver',
    name: 'Энергосбережение при заряде < 25%',
    category: 'power',
    enabled: true,
    triggerType: 'battery_low',
    triggerParam: '25',
    conditionType: 'only_on_battery',
    actionType: 'set_power_plan',
    actionParam: 'powersaver',
    extraActions: [{ actionType: 'set_brightness', actionParam: '45' }],
    runCount: 0,
  },
  {
    id: 'sc_night_theme',
    name: 'Ночной комфорт в 22:00 (Тёмная + Ночной свет)',
    category: 'work',
    enabled: false,
    triggerType: 'time_at',
    triggerParam: '22:00',
    conditionType: 'none',
    actionType: 'set_theme',
    actionParam: 'dark',
    extraActions: [{ actionType: 'set_night_light', actionParam: '40' }],
    runCount: 0,
  },
  {
    id: 'sc_vault_stealth',
    name: 'Полная тишина в Приватном столе',
    category: 'privacy',
    enabled: true,
    triggerType: 'vault_enter',
    triggerParam: '',
    conditionType: 'none',
    actionType: 'set_volume',
    actionParam: '0',
    extraActions: [
      { actionType: 'set_mic_mute', actionParam: 'on' },
      { actionType: 'set_dnd', actionParam: 'on' },
    ],
    runCount: 0,
  },
];

export const SCENARIO_TRIGGERS: { id: ScenarioTriggerType; label: string; hint: string; defaultParam: string; needsParam: boolean }[] = [
  { id: 'app_launch', label: 'Запуск приложения / игры / окна', hint: 'Часть имени: steam, chrome, code, game, cs2', defaultParam: 'chrome', needsParam: true },
  { id: 'app_close', label: 'Закрытие приложения / игры', hint: 'Имя программы', defaultParam: 'steam', needsParam: true },
  { id: 'power_ac', label: 'Подключение зарядки (AC)', hint: 'При подключении питания', defaultParam: '', needsParam: false },
  { id: 'power_battery', label: 'Отключение от розетки', hint: 'Переход на работу от батареи', defaultParam: '', needsParam: false },
  { id: 'battery_low', label: 'Низкий заряд батареи (%)', hint: 'Порог в % (напр. 20 или 25)', defaultParam: '25', needsParam: true },
  { id: 'battery_full', label: 'Заряд батареи выше (%)', hint: 'Порог в % (напр. 95)', defaultParam: '95', needsParam: true },
  { id: 'time_at', label: 'По точному времени (ЧЧ:ММ)', hint: 'Формат 24ч: 22:00 или 09:30', defaultParam: '22:00', needsParam: true },
  { id: 'time_range', label: 'Интервал времени (от-до)', hint: 'Например 23:00-07:00', defaultParam: '23:00-07:00', needsParam: true },
  { id: 'cpu_high', label: 'Высокая нагрузка CPU > (%)', hint: 'Порог загрузки % (напр. 85)', defaultParam: '85', needsParam: true },
  { id: 'ram_high', label: 'Заполнение ОЗУ RAM > (%)', hint: 'Порог ОЗУ % (напр. 85)', defaultParam: '85', needsParam: true },
  { id: 'gpu_hot', label: 'Нагрев видеокарты GPU > (°C)', hint: 'Температура °C (напр. 80)', defaultParam: '80', needsParam: true },
  { id: 'wifi_change', label: 'Смена или отключение Wi-Fi', hint: 'Имя сети или any', defaultParam: 'any', needsParam: true },
  { id: 'bt_device', label: 'Подключение BT / 2.4GHz устройства', hint: 'Имя мыши / наушников (напр. AirPods, Ajazz)', defaultParam: 'any', needsParam: true },
  { id: 'theme_change', label: 'Смена темы оформления', hint: 'dark, light или any', defaultParam: 'dark', needsParam: true },
  { id: 'vault_enter', label: 'Вход в Приватный стол (AES-256)', hint: 'При открытии приватного рабочего стола', defaultParam: '', needsParam: false },
  { id: 'system_boot', label: 'При старте Luma OS', hint: 'Автозапуск при входе в систему', defaultParam: '', needsParam: false },
  { id: 'manual', label: 'Ручной запуск (по кнопке / виджету)', hint: 'Запускается по клику', defaultParam: '', needsParam: false },
];

export const SCENARIO_CONDITIONS: { id: ScenarioConditionType; label: string }[] = [
  { id: 'none', label: 'Без доп. условия (выполнять всегда)' },
  { id: 'only_on_battery', label: 'Только если ПК работает от батареи' },
  { id: 'only_on_ac', label: 'Только если подключена зарядка (AC)' },
  { id: 'only_at_night', label: 'Только в ночное время (21:00–07:00)' },
  { id: 'only_in_day', label: 'Только днём (07:00–21:00)' },
  { id: 'only_if_cpu_high', label: 'Только если нагрузка CPU > 65%' },
  { id: 'only_if_dnd_off', label: 'Только если режим «Не беспокоить» выкл.' },
];

export const SCENARIO_ACTIONS: { id: ScenarioActionType; label: string; hint: string; defaultParam: string; needsParam: boolean }[] = [
  { id: 'set_gaming_boost', label: 'Игровой режим (Gaming Boost)', hint: 'on или off', defaultParam: 'on', needsParam: true },
  { id: 'set_dnd', label: 'Режим «Не беспокоить» (DND)', hint: 'on или off', defaultParam: 'on', needsParam: true },
  { id: 'set_theme', label: 'Переключить тему оформления', hint: 'dark или light', defaultParam: 'dark', needsParam: true },
  { id: 'set_night_light', label: 'Ночной свет (теплота %)', hint: '0..70 (0 = выкл)', defaultParam: '40', needsParam: true },
  { id: 'set_volume', label: 'Установить громкость (%)', hint: '0..100 (0 = тишина)', defaultParam: '35', needsParam: true },
  { id: 'set_brightness', label: 'Установить яркость экрана (%)', hint: '30..100', defaultParam: '65', needsParam: true },
  { id: 'set_mic_mute', label: 'Заглушить / Включить микрофон', hint: 'on (выкл) или off (вкл)', defaultParam: 'on', needsParam: true },
  { id: 'set_mouse_dpi', label: 'Изменить скорость мыши (DPI)', hint: 'Например 800, 1200, 1600, 3200', defaultParam: '1600', needsParam: true },
  { id: 'set_power_plan', label: 'План питания ОС', hint: 'performance, balanced, powersaver', defaultParam: 'performance', needsParam: true },
  { id: 'open_window', label: 'Открыть приложение Luma OS', hint: 'code_studio, cut_studio, office, ai, terminal, calendar, security, trash', defaultParam: 'code_studio', needsParam: true },
  { id: 'launch_pc_app', label: 'Запустить программу / игру на ПК', hint: 'Путь к .exe или имя (steam, discord, notepad)', defaultParam: 'notepad', needsParam: true },
  { id: 'open_url', label: 'Открыть сайт / URL', hint: 'https://youtube.com', defaultParam: 'https://youtube.com', needsParam: true },
  { id: 'run_terminal', label: 'Выполнить команду терминала', hint: 'Команда bash / cmd / powershell', defaultParam: 'echo Luma Scenario OK', needsParam: true },
  { id: 'take_screenshot', label: 'Сделать компактный скриншот', hint: 'Сохранит в ~/Pictures/LumaCaptures', defaultParam: '', needsParam: false },
  { id: 'start_recording', label: 'Начать Zero-Freeze запись экрана', hint: 'Сохранит AVI в ~/Videos/LumaRecordings', defaultParam: '', needsParam: false },
  { id: 'optimize_ram', label: 'Очистить и оптимизировать RAM', hint: 'Вызовет LumaCore GC оптимизацию', defaultParam: '', needsParam: false },
  { id: 'notify', label: 'Показать уведомление (Остров)', hint: 'Текст уведомления', defaultParam: 'Сценарий Luma 1.5.2 выполнен!', needsParam: true },
  { id: 'toggle_island', label: 'Dynamic Island', hint: 'on или off', defaultParam: 'on', needsParam: true },
  { id: 'toggle_dual_bar', label: 'Двойная панель задач', hint: 'on или off', defaultParam: 'on', needsParam: true },
  { id: 'lock_screen', label: 'Заблокировать экран ПК', hint: '', defaultParam: '', needsParam: false },
  { id: 'sleep_pc', label: 'Перевести ПК в спящий режим', hint: '', defaultParam: '', needsParam: false },
  { id: 'clean_trash', label: 'Очистить Корзину Luma OS', hint: '', defaultParam: '', needsParam: false },
];

const TEMPLATES: Omit<LumaScenarioRule, 'id'>[] = [
  {
    name: 'Киберспорт Про: 800 DPI + Boost + Тишина',
    category: 'gaming',
    enabled: true,
    triggerType: 'manual',
    triggerParam: '',
    actionType: 'set_mouse_dpi',
    actionParam: '800',
    extraActions: [
      { actionType: 'set_gaming_boost', actionParam: 'on' },
      { actionType: 'set_dnd', actionParam: 'on' },
      { actionType: 'set_power_plan', actionParam: 'performance' },
    ],
  },
  {
    name: 'Утро разработчика: Code Studio + Терминал + Светлая',
    category: 'work',
    enabled: true,
    triggerType: 'time_at',
    triggerParam: '09:30',
    actionType: 'open_window',
    actionParam: 'code_studio',
    extraActions: [
      { actionType: 'set_theme', actionParam: 'dark' },
      { actionType: 'notify', actionParam: 'Доброе утро! Рабочее место разработчика готово.' },
    ],
  },
  {
    name: 'Авто-очистка RAM при переполнении > 85%',
    category: 'power',
    enabled: true,
    triggerType: 'ram_high',
    triggerParam: '85',
    actionType: 'optimize_ram',
    actionParam: '',
    extraActions: [{ actionType: 'notify', actionParam: 'ОЗУ > 85% — выполнена авто-оптимизация памяти!' }],
  },
  {
    name: 'Защита глаз вечером: Ночной свет 45% + Яркость 60%',
    category: 'work',
    enabled: true,
    triggerType: 'time_at',
    triggerParam: '21:30',
    actionType: 'set_night_light',
    actionParam: '45',
    extraActions: [{ actionType: 'set_brightness', actionParam: '60' }],
  },
  {
    name: 'От розетки → Максимальная мощность + 100% яркость',
    category: 'power',
    enabled: true,
    triggerType: 'power_ac',
    triggerParam: '',
    actionType: 'set_power_plan',
    actionParam: 'performance',
    extraActions: [{ actionType: 'set_brightness', actionParam: '95' }],
  },
  {
    name: 'Стрим / Запись видео: Cut Studio + DND + Микрофон',
    category: 'media',
    enabled: true,
    triggerType: 'manual',
    triggerParam: '',
    actionType: 'set_dnd',
    actionParam: 'on',
    extraActions: [
      { actionType: 'open_window', actionParam: 'cut_studio' },
      { actionType: 'set_mic_mute', actionParam: 'off' },
    ],
  },
  {
    name: 'Перегрев GPU > 82°C → Баланс питания + Предупреждение',
    category: 'gaming',
    enabled: true,
    triggerType: 'gpu_hot',
    triggerParam: '82',
    actionType: 'set_power_plan',
    actionParam: 'balanced',
    extraActions: [{ actionType: 'notify', actionParam: 'Внимание! Температура GPU превысила 82°C' }],
  },
  {
    name: 'Офисная сессия: Office Studio + 1600 DPI',
    category: 'work',
    enabled: true,
    triggerType: 'manual',
    triggerParam: '',
    actionType: 'open_window',
    actionParam: 'office',
    extraActions: [{ actionType: 'set_mouse_dpi', actionParam: '1600' }],
  },
  {
    name: 'Подключены наушники BT → Громкость 55%',
    category: 'media',
    enabled: true,
    triggerType: 'bt_device',
    triggerParam: 'AirPods',
    actionType: 'set_volume',
    actionParam: '55',
  },
  {
    name: 'Быстрый уход от ПК: Тишина + Блокировка экрана',
    category: 'privacy',
    enabled: true,
    triggerType: 'manual',
    triggerParam: '',
    actionType: 'set_volume',
    actionParam: '0',
    extraActions: [{ actionType: 'lock_screen', actionParam: '' }],
  },
  {
    name: 'Учёба без отвлечений: DND + Luma AI 3.0 + Офис',
    category: 'work',
    enabled: true,
    triggerType: 'manual',
    triggerParam: '',
    actionType: 'set_dnd',
    actionParam: 'on',
    extraActions: [{ actionType: 'open_window', actionParam: 'ai' }],
  },
  {
    name: 'Режим кино: Яркость 100% + Громкость 80% + DND',
    category: 'media',
    enabled: true,
    triggerType: 'manual',
    triggerParam: '',
    actionType: 'set_brightness',
    actionParam: '100',
    extraActions: [
      { actionType: 'set_volume', actionParam: '80' },
      { actionType: 'set_dnd', actionParam: 'on' },
    ],
  },
];

interface LumaScenariosWindowProps {
  isDark: boolean;
  scenarios: LumaScenarioRule[];
  onChangeScenarios: (next: LumaScenarioRule[]) => void;
  onExecuteScenario: (rule: LumaScenarioRule) => void;
}

export const LumaScenariosWindow: React.FC<LumaScenariosWindowProps> = ({
  isDark,
  scenarios,
  onChangeScenarios,
  onExecuteScenario,
}) => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [filterCat, setFilterCat] = useState<'all' | 'gaming' | 'work' | 'power' | 'privacy' | 'media'>('all');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LumaScenarioRule['category']>('custom');
  const [triggerType, setTriggerType] = useState<ScenarioTriggerType>('app_launch');
  const [triggerParam, setTriggerParam] = useState('chrome');
  const [conditionType, setConditionType] = useState<ScenarioConditionType>('none');
  const [actionType, setActionType] = useState<ScenarioActionType>('set_dnd');
  const [actionParam, setActionParam] = useState('on');
  const [extraActions, setExtraActions] = useState<ScenarioActionStep[]>([]);
  const [justRanId, setJustRanId] = useState<string | null>(null);

  const subText = isDark ? 'text-white/55' : 'text-slate-500';
  const cardBg = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/90 border-slate-200/90';
  const selectCls = isDark
    ? 'w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#12151f] border border-white/15 text-white outline-none'
    : 'w-full px-2.5 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 outline-none';
  const inputCls = isDark
    ? 'w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/30 border border-white/15 text-white outline-none'
    : 'w-full px-2.5 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 outline-none';

  const triggerIcon = (t: ScenarioTriggerType) => {
    switch (t) {
      case 'app_launch':
      case 'app_close':
        return <AppWindow size={13} className="text-cyan-400" />;
      case 'battery_low':
      case 'battery_full':
      case 'power_battery':
        return <BatteryLow size={13} className="text-amber-400" />;
      case 'power_ac':
        return <Zap size={13} className="text-emerald-400" />;
      case 'time_at':
      case 'time_range':
        return <Clock size={13} className="text-indigo-400" />;
      case 'cpu_high':
      case 'ram_high':
      case 'gpu_hot':
        return <Cpu size={13} className="text-rose-400" />;
      case 'wifi_change':
        return <Wifi size={13} className="text-sky-400" />;
      case 'bt_device':
        return <Bluetooth size={13} className="text-blue-400" />;
      case 'theme_change':
        return <SunMoon size={13} className="text-purple-400" />;
      case 'vault_enter':
        return <Shield size={13} className="text-rose-400" />;
      default:
        return <Play size={13} className="text-sky-400" />;
    }
  };

  const actionIcon = (a: ScenarioActionType) => {
    switch (a) {
      case 'set_gaming_boost':
        return <Flame size={13} className="text-orange-400" />;
      case 'set_dnd':
        return <BellOff size={13} className="text-amber-400" />;
      case 'set_theme':
        return <SunMoon size={13} className="text-indigo-400" />;
      case 'set_night_light':
        return <Moon size={13} className="text-amber-300" />;
      case 'set_volume':
        return <Volume2 size={13} className="text-emerald-400" />;
      case 'set_brightness':
        return <Monitor size={13} className="text-yellow-300" />;
      case 'set_mic_mute':
        return <MicOff size={13} className="text-rose-400" />;
      case 'set_mouse_dpi':
        return <MousePointer2 size={13} className="text-cyan-400" />;
      case 'take_screenshot':
        return <Camera size={13} className="text-pink-400" />;
      case 'start_recording':
        return <Video size={13} className="text-rose-400" />;
      case 'optimize_ram':
        return <Cpu size={13} className="text-emerald-400" />;
      case 'run_terminal':
        return <Terminal size={13} className="text-emerald-300" />;
      case 'open_url':
        return <Globe size={13} className="text-sky-400" />;
      case 'toggle_dual_bar':
        return <Layers size={13} className="text-sky-400" />;
      default:
        return <Sparkles size={13} className="text-amber-400" />;
    }
  };

  const handleCreate = () => {
    const tLabel = SCENARIO_TRIGGERS.find((x) => x.id === triggerType)?.label || triggerType;
    const aLabel = SCENARIO_ACTIONS.find((x) => x.id === actionType)?.label || actionType;
    const rule: LumaScenarioRule = {
      id: `sc_${Date.now()}`,
      name: name.trim() || `${tLabel} → ${aLabel}`,
      category,
      enabled: true,
      triggerType,
      triggerParam: triggerParam.trim(),
      conditionType,
      actionType,
      actionParam: actionParam.trim(),
      extraActions: extraActions.length > 0 ? extraActions : undefined,
      runCount: 0,
    };
    onChangeScenarios([rule, ...scenarios]);
    setName('');
    setExtraActions([]);
    setShowBuilder(false);
  };

  const handleRun = (rule: LumaScenarioRule) => {
    onExecuteScenario(rule);
    setJustRanId(rule.id);
    setTimeout(() => setJustRanId(null), 1500);
  };

  const duplicateRule = (rule: LumaScenarioRule) => {
    onChangeScenarios([
      { ...rule, id: `sc_${Date.now()}`, name: `${rule.name} (копия)`, runCount: 0, lastRunAt: undefined },
      ...scenarios,
    ]);
  };

  const filteredScenarios = useMemo(() => {
    if (filterCat === 'all') return scenarios;
    return scenarios.filter((s) => s.category === filterCat);
  }, [scenarios, filterCat]);

  const activeCount = scenarios.filter((s) => s.enabled).length;
  const triggerDef = SCENARIO_TRIGGERS.find((x) => x.id === triggerType);
  const actionDef = SCENARIO_ACTIONS.find((x) => x.id === actionType);

  return (
    <div className={`h-full flex flex-col ${isDark ? 'text-white' : 'text-slate-900'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/70'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-cyan-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Zap size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">Сценарии автоматизации Pro</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-400/25">
                Активно: {activeCount}/{scenarios.length}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/25">
                17 триггеров · 22 действия · Цепочки
              </span>
            </div>
            <div className={`text-[11px] ${subText}`}>
              Создавайте умные правила «ЕСЛИ событие + УСЛОВИЕ → ЦЕПОЧКА действий»
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowBuilder((v) => !v)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <Plus size={14} />
          {showBuilder ? 'Скрыть конструктор' : 'Новый сценарий'}
        </button>
      </div>

      {/* Category Filter Strip */}
      <div className={`px-4 py-2 border-b flex items-center gap-1.5 overflow-x-auto shrink-0 ${isDark ? 'border-white/10 bg-white/[0.015]' : 'border-slate-200 bg-white'}`}>
        <Filter size={12} className="text-cyan-400 shrink-0 mr-1" />
        {(
          [
            ['all', 'Все'],
            ['gaming', 'Игры'],
            ['work', 'Работа'],
            ['power', 'Питание'],
            ['media', 'Медиа'],
            ['privacy', 'Приватность'],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setFilterCat(k)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold cursor-pointer transition ${
              filterCat === k
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/35'
                : isDark
                ? 'bg-white/[0.04] text-white/60 hover:bg-white/10'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Rule Builder Card */}
        {showBuilder && (
          <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-cyan-500/[0.07] border-cyan-400/25' : 'bg-cyan-50/70 border-cyan-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold flex items-center gap-1.5 text-cyan-400">
                <Sparkles size={14} />
                Конструктор правила «ЕСЛИ + И → ЦЕПОЧКА ДЕЙСТВИЙ»
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value as LumaScenarioRule['category'])} className="px-2 py-1 rounded-lg text-[11px] bg-black/30 border border-white/15">
                <option value="custom">Общий</option>
                <option value="gaming">Игры</option>
                <option value="work">Работа</option>
                <option value="power">Питание</option>
                <option value="media">Медиа</option>
                <option value="privacy">Приватность</option>
              </select>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название сценария (например: Режим рендера Blender / Игровой турбо)..."
              className={inputCls}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* 1. IF Trigger */}
              <div className={`p-3 rounded-xl border space-y-2 ${cardBg}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">1. ЕСЛИ (Триггер)</div>
                <select
                  value={triggerType}
                  onChange={(e) => {
                    const next = e.target.value as ScenarioTriggerType;
                    setTriggerType(next);
                    const def = SCENARIO_TRIGGERS.find((x) => x.id === next);
                    setTriggerParam(def?.defaultParam ?? '');
                  }}
                  className={selectCls}
                >
                  {SCENARIO_TRIGGERS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                {triggerDef?.needsParam && (
                  <input value={triggerParam} onChange={(e) => setTriggerParam(e.target.value)} placeholder={triggerDef.hint} className={inputCls} />
                )}
              </div>

              {/* 2. AND Condition */}
              <div className={`p-3 rounded-xl border space-y-2 ${cardBg}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">2. И УСЛОВИЕ (Опционально)</div>
                <select value={conditionType} onChange={(e) => setConditionType(e.target.value as ScenarioConditionType)} className={selectCls}>
                  {SCENARIO_CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <div className={`text-[10px] ${subText}`}>Уточните контекст, чтобы правило срабатывало точно когда нужно</div>
              </div>

              {/* 3. THEN Primary Action */}
              <div className={`p-3 rounded-xl border space-y-2 ${cardBg}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">3. ТО (Основное действие)</div>
                <select
                  value={actionType}
                  onChange={(e) => {
                    const next = e.target.value as ScenarioActionType;
                    setActionType(next);
                    const def = SCENARIO_ACTIONS.find((x) => x.id === next);
                    setActionParam(def?.defaultParam ?? '');
                  }}
                  className={selectCls}
                >
                  {SCENARIO_ACTIONS.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
                {actionDef?.needsParam && (
                  <input value={actionParam} onChange={(e) => setActionParam(e.target.value)} placeholder={actionDef.hint} className={inputCls} />
                )}
              </div>
            </div>

            {/* Chained Extra Actions */}
            <div className={`p-3 rounded-xl border space-y-2 ${cardBg}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold flex items-center gap-1.5 text-cyan-400">
                  <Sliders size={12} />
                  Дополнительные шаги цепочки ({extraActions.length}/5)
                </span>
                <button
                  onClick={() =>
                    extraActions.length < 5 &&
                    setExtraActions([...extraActions, { actionType: 'notify', actionParam: 'Сценарий выполнен!' }])
                  }
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 cursor-pointer flex items-center gap-1"
                >
                  <Plus size={10} /> Добавить шаг
                </button>
              </div>
              {extraActions.map((st, idx) => {
                const meta = SCENARIO_ACTIONS.find((x) => x.id === st.actionType);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                    <span className="col-span-1 text-[10px] font-mono opacity-60">+{idx + 2}</span>
                    <select
                      value={st.actionType}
                      onChange={(e) => {
                        const nt = e.target.value as ScenarioActionType;
                        const def = SCENARIO_ACTIONS.find((x) => x.id === nt);
                        const copy = [...extraActions];
                        copy[idx] = { actionType: nt, actionParam: def?.defaultParam ?? '' };
                        setExtraActions(copy);
                      }}
                      className={`col-span-5 ${selectCls}`}
                    >
                      {SCENARIO_ACTIONS.map((a) => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>
                    <input
                      value={st.actionParam}
                      onChange={(e) => {
                        const copy = [...extraActions];
                        copy[idx] = { ...st, actionParam: e.target.value };
                        setExtraActions(copy);
                      }}
                      placeholder={meta?.hint || 'Параметр'}
                      className={`col-span-5 ${inputCls}`}
                    />
                    <button
                      onClick={() => setExtraActions(extraActions.filter((_, i) => i !== idx))}
                      className="col-span-1 p-1 rounded text-rose-400 hover:bg-rose-500/20 cursor-pointer flex justify-center"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBuilder(false)} className={`px-3 py-1.5 rounded-xl text-xs cursor-pointer ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-white border border-slate-200'}`}>
                Отмена
              </button>
              <button onClick={handleCreate} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer">
                Сохранить сценарий
              </button>
            </div>
          </div>
        )}

        {/* Active Scenarios List */}
        <div className="space-y-2">
          {filteredScenarios.map((rule) => {
            const tMeta = SCENARIO_TRIGGERS.find((x) => x.id === rule.triggerType);
            const cMeta = SCENARIO_CONDITIONS.find((x) => x.id === rule.conditionType);
            const aMeta = SCENARIO_ACTIONS.find((x) => x.id === rule.actionType);
            const ran = justRanId === rule.id;
            return (
              <div
                key={rule.id}
                className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardBg} ${!rule.enabled ? 'opacity-60' : ''}`}
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold truncate">{rule.name}</span>
                    {rule.extraActions && rule.extraActions.length > 0 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/25">
                        Цепочка {rule.extraActions.length + 1} шага
                      </span>
                    )}
                    {rule.lastRunAt && (
                      <span className={`text-[10px] font-mono ${subText}`}>
                        Запуск: {rule.lastRunAt} ({rule.runCount || 1}×)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${isDark ? 'bg-white/[0.05] border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                      {triggerIcon(rule.triggerType)}
                      <span>
                        ЕСЛИ: {tMeta?.label}
                        {rule.triggerParam ? ` (${rule.triggerParam})` : ''}
                      </span>
                    </span>
                    {rule.conditionType && rule.conditionType !== 'none' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border bg-purple-500/12 border-purple-400/25 text-purple-300">
                        И: {cMeta?.label}
                      </span>
                    )}
                    <ArrowRight size={12} className={subText} />
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${isDark ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                      {actionIcon(rule.actionType)}
                      <span>
                        ТО: {aMeta?.label}
                        {rule.actionParam ? ` (${rule.actionParam})` : ''}
                      </span>
                    </span>
                    {rule.extraActions?.map((ex, i) => {
                      const exMeta = SCENARIO_ACTIONS.find((x) => x.id === ex.actionType);
                      return (
                        <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${isDark ? 'bg-cyan-500/10 border-cyan-400/20 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-800'}`}>
                          + {exMeta?.label || ex.actionType}
                          {ex.actionParam ? ` (${ex.actionParam})` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRun(rule)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition cursor-pointer ${
                      ran
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : isDark
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/25 hover:bg-cyan-500/25'
                        : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
                    }`}
                  >
                    {ran ? <CheckCircle2 size={12} /> : <Play size={12} />}
                    {ran ? 'Выполнено' : 'Запустить'}
                  </button>
                  <button
                    onClick={() => duplicateRule(rule)}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${isDark ? 'bg-white/[0.05] text-white/60 border-white/10 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                    title="Дублировать сценарий"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={() => onChangeScenarios(scenarios.map((s) => (s.id === rule.id ? { ...s, enabled: !s.enabled } : s)))}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      rule.enabled
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30'
                        : isDark
                        ? 'bg-white/[0.05] text-white/40 border-white/10'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                    title={rule.enabled ? 'Отключить сценарий' : 'Включить сценарий'}
                  >
                    <Power size={13} />
                  </button>
                  <button
                    onClick={() => onChangeScenarios(scenarios.filter((s) => s.id !== rule.id))}
                    className="p-1.5 rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-400/20 transition cursor-pointer"
                    title="Удалить сценарий"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 12 One-Click Templates */}
        <div className="pt-2">
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${subText}`}>
            Библиотека готовых сценариев (12 шаблонов в 1 клик)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {TEMPLATES.map((tpl, idx) => (
              <button
                key={idx}
                onClick={() =>
                  onChangeScenarios([{ ...tpl, id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` }, ...scenarios])
                }
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                  isDark ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-cyan-400/35' : 'bg-white/80 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{tpl.name}</div>
                  <div className={`text-[10px] mt-0.5 ${subText}`}>
                    {(tpl.extraActions?.length || 0) + 1} действий · Клик — добавить
                  </div>
                </div>
                <Plus size={14} className="text-cyan-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
