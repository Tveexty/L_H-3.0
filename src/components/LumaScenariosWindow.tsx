import React, { useState } from 'react';
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
} from 'lucide-react';

export type ScenarioTriggerType =
  | 'app_launch'
  | 'power_ac'
  | 'power_battery'
  | 'battery_low'
  | 'time_at'
  | 'theme_change'
  | 'vault_enter'
  | 'manual';

export type ScenarioActionType =
  | 'set_dnd'
  | 'set_theme'
  | 'set_volume'
  | 'set_mouse_dpi'
  | 'set_power_plan'
  | 'open_window'
  | 'take_screenshot'
  | 'optimize_ram'
  | 'notify'
  | 'toggle_island'
  | 'toggle_dual_bar';

export interface LumaScenarioRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: ScenarioTriggerType;
  triggerParam: string;
  actionType: ScenarioActionType;
  actionParam: string;
  lastRunAt?: string;
  runCount?: number;
}

export const DEFAULT_SCENARIOS: LumaScenarioRule[] = [
  {
    id: 'sc_gaming_focus',
    name: 'Игровой режим (Steam / CS2 / Valorant)',
    enabled: true,
    triggerType: 'app_launch',
    triggerParam: 'steam',
    actionType: 'set_dnd',
    actionParam: 'on',
    runCount: 0,
  },
  {
    id: 'sc_low_battery_saver',
    name: 'Энергосбережение при заряде < 25%',
    enabled: true,
    triggerType: 'battery_low',
    triggerParam: '25',
    actionType: 'set_power_plan',
    actionParam: 'powersaver',
    runCount: 0,
  },
  {
    id: 'sc_night_theme',
    name: 'Ночная тема в 22:00',
    enabled: false,
    triggerType: 'time_at',
    triggerParam: '22:00',
    actionType: 'set_theme',
    actionParam: 'dark',
    runCount: 0,
  },
  {
    id: 'sc_vault_stealth',
    name: 'Тишина в Суперконфиденциальности',
    enabled: true,
    triggerType: 'vault_enter',
    triggerParam: '',
    actionType: 'set_volume',
    actionParam: '0',
    runCount: 0,
  },
];

export const SCENARIO_TRIGGERS: { id: ScenarioTriggerType; label: string; hint: string; defaultParam: string }[] = [
  { id: 'app_launch', label: 'Запуск приложения / окна', hint: 'Часть имени: steam, chrome, code, game', defaultParam: 'chrome' },
  { id: 'power_ac', label: 'Подключение зарядки (AC)', hint: 'Срабатывает при подключении питания', defaultParam: '' },
  { id: 'power_battery', label: 'Отключение от розетки', hint: 'Переход на работу от батареи', defaultParam: '' },
  { id: 'battery_low', label: 'Низкий заряд батареи (%)', hint: 'Порог в процентах (например 25)', defaultParam: '25' },
  { id: 'time_at', label: 'По времени (ЧЧ:ММ)', hint: 'Формат 24ч: 22:00 или 09:30', defaultParam: '22:00' },
  { id: 'theme_change', label: 'Смена темы оформления', hint: 'dark, light или any', defaultParam: 'dark' },
  { id: 'vault_enter', label: 'Вход в Суперконфиденциальность', hint: 'При открытии приватного стола', defaultParam: '' },
  { id: 'manual', label: 'Ручной запуск (по кнопке)', hint: 'Запускается из панели или Сценариев', defaultParam: '' },
];

export const SCENARIO_ACTIONS: { id: ScenarioActionType; label: string; hint: string; defaultParam: string }[] = [
  { id: 'set_dnd', label: 'Режим «Не беспокоить»', hint: 'on или off', defaultParam: 'on' },
  { id: 'set_theme', label: 'Переключить тему', hint: 'dark или light', defaultParam: 'dark' },
  { id: 'set_volume', label: 'Установить громкость (%)', hint: '0..100 (0 = без звука)', defaultParam: '35' },
  { id: 'set_mouse_dpi', label: 'Изменить DPI мыши', hint: 'Например 800, 1600, 3200', defaultParam: '1600' },
  { id: 'set_power_plan', label: 'План питания ОС', hint: 'performance, balanced, powersaver', defaultParam: 'performance' },
  { id: 'open_window', label: 'Открыть приложение Luma', hint: 'calendar, code_studio, cut_studio, terminal, security, trash', defaultParam: 'code_studio' },
  { id: 'take_screenshot', label: 'Сделать быстрый скриншот', hint: 'Сохранит в ~/Pictures/LumaCaptures', defaultParam: '' },
  { id: 'optimize_ram', label: 'Очистить RAM ядра', hint: 'Вызовет LumaCore GC оптимизацию', defaultParam: '' },
  { id: 'notify', label: 'Показать уведомление', hint: 'Текст уведомления', defaultParam: 'Сценарий Carbon выполнен!' },
  { id: 'toggle_island', label: 'Dynamic Island', hint: 'on или off', defaultParam: 'on' },
  { id: 'toggle_dual_bar', label: 'Двойная панель задач', hint: 'on или off', defaultParam: 'on' },
];

interface LumaScenariosWindowProps {
  isDark: boolean;
  scenarios: LumaScenarioRule[];
  onChangeScenarios: (next: LumaScenarioRule[]) => void;
  onExecuteScenario: (rule: LumaScenarioRule) => void;
}

const TEMPLATES: Omit<LumaScenarioRule, 'id'>[] = [
  {
    name: 'Киберспорт: 800 DPI + Производительность',
    enabled: true,
    triggerType: 'manual',
    triggerParam: '',
    actionType: 'set_mouse_dpi',
    actionParam: '800',
  },
  {
    name: 'Работа с кодом: Открыть Luma Code Studio',
    enabled: true,
    triggerType: 'time_at',
    triggerParam: '10:00',
    actionType: 'open_window',
    actionParam: 'code_studio',
  },
  {
    name: 'От сети -> Максимум производительности',
    enabled: true,
    triggerType: 'power_ac',
    triggerParam: '',
    actionType: 'set_power_plan',
    actionParam: 'performance',
  },
  {
    name: 'Оптимизация RAM по кнопке',
    enabled: true,
    triggerType: 'manual',
    triggerParam: '',
    actionType: 'optimize_ram',
    actionParam: '',
  },
];

export const LumaScenariosWindow: React.FC<LumaScenariosWindowProps> = ({
  isDark,
  scenarios,
  onChangeScenarios,
  onExecuteScenario,
}) => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<ScenarioTriggerType>('app_launch');
  const [triggerParam, setTriggerParam] = useState('chrome');
  const [actionType, setActionType] = useState<ScenarioActionType>('set_dnd');
  const [actionParam, setActionParam] = useState('on');
  const [justRanId, setJustRanId] = useState<string | null>(null);

  const subText = isDark ? 'text-white/55' : 'text-slate-500';
  const cardBg = isDark
    ? 'bg-white/[0.04] border-white/10'
    : 'bg-white/85 border-slate-200/90';

  const triggerIcon = (t: ScenarioTriggerType) => {
    switch (t) {
      case 'app_launch':
        return <AppWindow size={14} className="text-cyan-400" />;
      case 'battery_low':
      case 'power_battery':
        return <BatteryLow size={14} className="text-amber-400" />;
      case 'power_ac':
        return <Zap size={14} className="text-emerald-400" />;
      case 'time_at':
        return <Clock size={14} className="text-indigo-400" />;
      case 'theme_change':
        return <SunMoon size={14} className="text-purple-400" />;
      case 'vault_enter':
        return <Shield size={14} className="text-rose-400" />;
      default:
        return <Play size={14} className="text-sky-400" />;
    }
  };

  const actionIcon = (a: ScenarioActionType) => {
    switch (a) {
      case 'set_dnd':
        return <BellOff size={14} className="text-amber-400" />;
      case 'set_theme':
        return <SunMoon size={14} className="text-indigo-400" />;
      case 'set_volume':
        return <Volume2 size={14} className="text-emerald-400" />;
      case 'set_mouse_dpi':
        return <MousePointer2 size={14} className="text-cyan-400" />;
      case 'take_screenshot':
        return <Camera size={14} className="text-pink-400" />;
      case 'optimize_ram':
        return <Cpu size={14} className="text-emerald-400" />;
      case 'toggle_dual_bar':
        return <Layers size={14} className="text-sky-400" />;
      default:
        return <Sparkles size={14} className="text-amber-400" />;
    }
  };

  const handleCreate = () => {
    const tLabel = SCENARIO_TRIGGERS.find((x) => x.id === triggerType)?.label || triggerType;
    const aLabel = SCENARIO_ACTIONS.find((x) => x.id === actionType)?.label || actionType;
    const rule: LumaScenarioRule = {
      id: `sc_${Date.now()}`,
      name: name.trim() || `${tLabel} → ${aLabel}`,
      enabled: true,
      triggerType,
      triggerParam: triggerParam.trim(),
      actionType,
      actionParam: actionParam.trim(),
      runCount: 0,
    };
    onChangeScenarios([rule, ...scenarios]);
    setName('');
    setShowBuilder(false);
  };

  const handleRun = (rule: LumaScenarioRule) => {
    onExecuteScenario(rule);
    setJustRanId(rule.id);
    setTimeout(() => setJustRanId(null), 1500);
  };

  const toggleRule = (id: string) => {
    onChangeScenarios(scenarios.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const deleteRule = (id: string) => {
    onChangeScenarios(scenarios.filter((s) => s.id !== id));
  };

  const addTemplate = (tpl: Omit<LumaScenarioRule, 'id'>) => {
    onChangeScenarios([{ ...tpl, id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` }, ...scenarios]);
  };

  const activeCount = scenarios.filter((s) => s.enabled).length;

  return (
    <div className={`h-full flex flex-col ${isDark ? 'text-white' : 'text-slate-900'}`}>
      {/* Header */}
      <div
        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/70'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-cyan-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Zap size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Сценарии автоматизации</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-400/25">
                Активно: {activeCount}/{scenarios.length}
              </span>
            </div>
            <div className={`text-[11px] ${subText}`}>
              Если произошло действие (триггер) → система автоматически выполняет результат
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowBuilder((v) => !v)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus size={14} />
          {showBuilder ? 'Скрыть конструктор' : 'Новый сценарий'}
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Rule Builder Card */}
        {showBuilder && (
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-cyan-500/[0.07] border-cyan-400/25' : 'bg-cyan-50/70 border-cyan-200'
            }`}
          >
            <div className="text-xs font-semibold flex items-center gap-1.5 text-cyan-400">
              <Sparkles size={14} />
              Конструктор правила «Если → То»
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название сценария (например: Тихий режим при запуске Blender)..."
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                isDark
                  ? 'bg-black/30 border-white/15 text-white placeholder:text-white/40'
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* IF Trigger */}
              <div className={`p-3 rounded-xl border space-y-2 ${cardBg}`}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  1. ЕСЛИ (Триггер)
                </div>
                <select
                  value={triggerType}
                  onChange={(e) => {
                    const next = e.target.value as ScenarioTriggerType;
                    setTriggerType(next);
                    const def = SCENARIO_TRIGGERS.find((x) => x.id === next);
                    setTriggerParam(def?.defaultParam ?? '');
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none ${
                    isDark ? 'bg-[#12141a] border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  {SCENARIO_TRIGGERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {triggerType !== 'power_ac' &&
                  triggerType !== 'power_battery' &&
                  triggerType !== 'vault_enter' &&
                  triggerType !== 'manual' && (
                    <input
                      value={triggerParam}
                      onChange={(e) => setTriggerParam(e.target.value)}
                      placeholder={SCENARIO_TRIGGERS.find((x) => x.id === triggerType)?.hint}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none ${
                        isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  )}
              </div>

              {/* THEN Action */}
              <div className={`p-3 rounded-xl border space-y-2 ${cardBg}`}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  2. ТО (Действие)
                </div>
                <select
                  value={actionType}
                  onChange={(e) => {
                    const next = e.target.value as ScenarioActionType;
                    setActionType(next);
                    const def = SCENARIO_ACTIONS.find((x) => x.id === next);
                    setActionParam(def?.defaultParam ?? '');
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none ${
                    isDark ? 'bg-[#12141a] border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  {SCENARIO_ACTIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
                {actionType !== 'take_screenshot' && actionType !== 'optimize_ram' && (
                  <input
                    value={actionParam}
                    onChange={(e) => setActionParam(e.target.value)}
                    placeholder={SCENARIO_ACTIONS.find((x) => x.id === actionType)?.hint}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none ${
                      isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBuilder(false)}
                className={`px-3 py-1.5 rounded-xl text-xs ${
                  isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-white border border-slate-200'
                }`}
              >
                Отмена
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white"
              >
                Сохранить сценарий
              </button>
            </div>
          </div>
        )}

        {/* Active Scenarios List */}
        <div className="space-y-2">
          {scenarios.map((rule) => {
            const tMeta = SCENARIO_TRIGGERS.find((x) => x.id === rule.triggerType);
            const aMeta = SCENARIO_ACTIONS.find((x) => x.id === rule.actionType);
            const ran = justRanId === rule.id;
            return (
              <div
                key={rule.id}
                className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardBg} ${
                  !rule.enabled ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold truncate">{rule.name}</span>
                    {rule.lastRunAt && (
                      <span className={`text-[10px] font-mono ${subText}`}>
                        Запуск: {rule.lastRunAt} ({rule.runCount || 1}×)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
                        isDark ? 'bg-white/[0.05] border-white/10' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      {triggerIcon(rule.triggerType)}
                      <span>
                        ЕСЛИ: {tMeta?.label}
                        {rule.triggerParam ? ` (${rule.triggerParam})` : ''}
                      </span>
                    </span>
                    <ArrowRight size={12} className={subText} />
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
                        isDark ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {actionIcon(rule.actionType)}
                      <span>
                        ТО: {aMeta?.label}
                        {rule.actionParam ? ` (${rule.actionParam})` : ''}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRun(rule)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1 border transition ${
                      ran
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : isDark
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/25 hover:bg-cyan-500/25'
                        : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
                    }`}
                  >
                    {ran ? <CheckCircle2 size={12} /> : <Play size={12} />}
                    {ran ? 'Выполнено' : 'Запустить'}
                  </button>
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`p-1.5 rounded-xl border transition ${
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
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-400/20 transition"
                    title="Удалить сценарий"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* One-Click Templates */}
        <div className="pt-2">
          <div className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${subText}`}>
            Готовые шаблоны в 1 клик
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEMPLATES.map((tpl, idx) => (
              <button
                key={idx}
                onClick={() => addTemplate(tpl)}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                  isDark
                    ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08]'
                    : 'bg-white/70 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{tpl.name}</div>
                  <div className={`text-[10px] ${subText}`}>
                    Нажмите, чтобы добавить в список сценариев
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
