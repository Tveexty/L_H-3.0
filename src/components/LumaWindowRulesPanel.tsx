import React, { useEffect, useState } from 'react';
import {
  Monitor,
  Plus,
  Trash2,
  Pin,
  Maximize2,
  BellOff,
  Sparkles,
  Play,
  Layers,
  Check,
  Sliders,
} from 'lucide-react';

export interface MonitorInfoItem {
  index: number;
  name: string;
  primary: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowRuleItem {
  id: string;
  name: string;
  enabled: boolean;
  match_process: string;
  match_title: string;
  monitor_index: number;
  zone: string;
  always_on_top: boolean;
  borderless: boolean;
  opacity: number;
  auto_dnd: boolean;
  disable_compositor: boolean;
  hits?: number;
  last_applied_at?: string;
}

interface LumaWindowRulesPanelProps {
  isDark: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  onPushToast: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
}

const ZONE_LABELS: Record<string, string> = {
  none: 'Не менять позицию',
  left: 'Левая половина',
  right: 'Правая половина',
  'top-left': 'Верх-Лево (¼)',
  'top-right': 'Верх-Право (¼)',
  center: 'По центру (72%)',
  maximized: 'Развернуть',
  fullscreen: 'На весь экран',
};

export const LumaWindowRulesPanel: React.FC<LumaWindowRulesPanelProps> = ({
  isDark,
  surfaceCls,
  btnCls,
  mutedCls,
  onPushToast,
}) => {
  const [rules, setRules] = useState<WindowRuleItem[]>([]);
  const [monitors, setMonitors] = useState<MonitorInfoItem[]>([]);
  const [activeDnd, setActiveDnd] = useState(false);
  const [activeNoComp, setActiveNoComp] = useState(false);
  const [matchedNames, setMatchedNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Draft form for adding new rule
  const [name, setName] = useState('');
  const [matchProcess, setMatchProcess] = useState('');
  const [matchTitle, setMatchTitle] = useState('');
  const [monitorIndex, setMonitorIndex] = useState(0);
  const [zone, setZone] = useState('right');
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [borderless, setBorderless] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [autoDnd, setAutoDnd] = useState(false);
  const [disableCompositor, setDisableCompositor] = useState(false);

  const loadRules = async () => {
    try {
      const r = await fetch('/api/kernel/window-rules');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.rules)) setRules(d.rules);
        if (Array.isArray(d?.monitors)) setMonitors(d.monitors);
        setActiveDnd(Boolean(d?.runtime?.active_dnd));
        setActiveNoComp(Boolean(d?.runtime?.active_disable_compositor));
        setMatchedNames(Array.isArray(d?.runtime?.matched_rule_names) ? d.runtime.matched_rule_names : []);
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    void loadRules();
  }, []);

  const upsertRule = async (rule: Partial<WindowRuleItem>) => {
    setBusy(true);
    try {
      const r = await fetch('/api/kernel/window-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', rule }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.rules)) setRules(d.rules);
        onPushToast('Правила окон (KWin)', `Правило «${rule.name}» сохранено и активно`, 'success');
      }
    } catch {
      onPushToast('Правила окон', 'Нет связи с ядром LumaCore 1.6.1', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const toggleRule = async (id: string) => {
    try {
      const r = await fetch('/api/kernel/window-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.rules)) setRules(d.rules);
      }
    } catch {
      // ignore
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const r = await fetch('/api/kernel/window-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.rules)) setRules(d.rules);
        onPushToast('Правила окон', 'Правило удалено', 'info');
      }
    } catch {
      // ignore
    }
  };

  const applyNow = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/kernel/window-rules/apply', { method: 'POST' });
      if (r.ok) {
        const d = await r.json();
        await loadRules();
        onPushToast(
          'Правила окон (KWin)',
          `Применено к окнам: ${d.applied || 0} · Активных правил: ${d.runtime?.matched_rule_names?.length || 0}`,
          'success'
        );
      }
    } catch {
      onPushToast('Правила окон', 'Ошибка применения правил', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const handleAddCustom = async () => {
    if (!name.trim() || (!matchProcess.trim() && !matchTitle.trim())) {
      onPushToast('Правила окон', 'Укажите название и процесс или заголовок окна', 'warning');
      return;
    }
    await upsertRule({
      name: name.trim(),
      enabled: true,
      match_process: matchProcess.trim(),
      match_title: matchTitle.trim(),
      monitor_index: monitorIndex,
      zone,
      always_on_top: alwaysOnTop,
      borderless,
      opacity,
      auto_dnd: autoDnd,
      disable_compositor: disableCompositor,
    });
    setName('');
    setMatchProcess('');
    setMatchTitle('');
  };

  const addQuickPreset = (preset: 'telegram' | 'calc' | 'game' | 'chrome') => {
    const map: Record<string, Partial<WindowRuleItem>> = {
      telegram: {
        name: 'Telegram — 2-й монитор справа без рамки',
        enabled: true,
        match_process: 'telegram',
        match_title: 'telegram',
        monitor_index: monitors.length >= 2 ? 2 : 1,
        zone: 'right',
        always_on_top: false,
        borderless: true,
        opacity: 100,
        auto_dnd: false,
        disable_compositor: false,
      },
      calc: {
        name: 'Калькулятор — всегда поверх всех окон',
        enabled: true,
        match_process: 'calc|calculator',
        match_title: 'калькулятор|calculator',
        monitor_index: 0,
        zone: 'none',
        always_on_top: true,
        borderless: false,
        opacity: 96,
        auto_dnd: false,
        disable_compositor: false,
      },
      game: {
        name: 'Игры — авто-DND и отключение композитора',
        enabled: true,
        match_process: 'cs2|dota2|valorant|gta5|cyberpunk|minecraft|fortnite|apex|rust',
        match_title: '',
        monitor_index: 0,
        zone: 'none',
        always_on_top: false,
        borderless: false,
        opacity: 100,
        auto_dnd: true,
        disable_compositor: true,
      },
      chrome: {
        name: 'Chrome — на 1-м мониторе на весь экран',
        enabled: true,
        match_process: 'chrome',
        match_title: '',
        monitor_index: 1,
        zone: 'maximized',
        always_on_top: false,
        borderless: false,
        opacity: 100,
        auto_dnd: false,
        disable_compositor: false,
      },
    };
    void upsertRule(map[preset]);
  };

  return (
    <div className="space-y-4">
      {/* Header & Live Monitor Map */}
      <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-400 font-bold">
              LUMA OS 1.7.1 OXYGEN · KWIN WINDOW RULES ENGINE
            </div>
            <div className="text-base font-extrabold flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Продвинутый менеджер правил для окон
            </div>
            <div className={`text-xs ${mutedCls}`}>
              Задайте правило один раз — ядро LumaCore 1.6.1 автоматически расставляет окна по мониторам, снимает рамки, держит поверх окон и включает игровой режим.
            </div>
          </div>
          <button
            disabled={busy}
            onClick={() => void applyNow()}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            Применить сейчас
          </button>
        </div>

        {/* Detected Monitors & Live Runtime Status */}
        <div className="flex flex-wrap items-center gap-2">
          {monitors.map((m) => (
            <div
              key={m.index}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono flex items-center gap-1.5 ${
                m.primary ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300' : btnCls
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>
                #{m.index} {m.primary ? '(Основной)' : ''} · {m.width}×{m.height}
              </span>
            </div>
          ))}
          {activeDnd && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold inline-flex items-center gap-1">
              <BellOff className="w-3 h-3" /> Авто-DND активен
            </span>
          )}
          {activeNoComp && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Композитор отключён (Игровой FPS)
            </span>
          )}
          {matchedNames.length > 0 && (
            <span className={`text-[11px] font-mono ${mutedCls}`}>
              Сработало сейчас: {matchedNames.join(', ')}
            </span>
          )}
        </div>

        {/* 1-Click KWin Quick Presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button onClick={() => addQuickPreset('telegram')} className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${btnCls}`}>
            + Telegram (2-й монитор справа без рамки)
          </button>
          <button onClick={() => addQuickPreset('calc')} className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${btnCls}`}>
            + Калькулятор (поверх всех окон)
          </button>
          <button onClick={() => addQuickPreset('game')} className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${btnCls}`}>
            + Игры (авто-DND + без композитора)
          </button>
          <button onClick={() => addQuickPreset('chrome')} className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${btnCls}`}>
            + Chrome (1-й монитор, развернуть)
          </button>
        </div>
      </div>

      {/* Create New Window Rule Form */}
      <div className={`p-4 rounded-2xl border space-y-3 text-xs ${surfaceCls}`}>
        <div className="font-bold flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-cyan-400" />
          Создать новое правило окна
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название правила (напр. Discord справа)"
            className={`px-3 py-2 rounded-xl border outline-none ${btnCls}`}
          />
          <input
            value={matchProcess}
            onChange={(e) => setMatchProcess(e.target.value)}
            placeholder="Процесс / Regex (напр. telegram|discord)"
            className={`px-3 py-2 rounded-xl border font-mono outline-none ${btnCls}`}
          />
          <input
            value={matchTitle}
            onChange={(e) => setMatchTitle(e.target.value)}
            placeholder="Заголовок окна (опционально)"
            className={`px-3 py-2 rounded-xl border outline-none ${btnCls}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={monitorIndex}
            onChange={(e) => setMonitorIndex(Number(e.target.value))}
            className={`px-3 py-2 rounded-xl border outline-none ${btnCls}`}
          >
            <option value={0}>Монитор: Текущий / любой</option>
            <option value={1}>Монитор #1 (Основной)</option>
            <option value={2}>Монитор #2 (Дополнительный)</option>
            <option value={3}>Монитор #3</option>
          </select>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className={`px-3 py-2 rounded-xl border outline-none ${btnCls}`}
          >
            {Object.entries(ZONE_LABELS).map(([k, lbl]) => (
              <option key={k} value={k}>
                Позиция: {lbl}
              </option>
            ))}
          </select>
          <div className={`px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}>
            <span>Прозрачность: {opacity}%</span>
            <input
              type="range"
              min={35}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-24 accent-cyan-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['Поверх всех окон', alwaysOnTop, setAlwaysOnTop],
            ['Без рамки (Borderless)', borderless, setBorderless],
            ['Авто-DND (Тишина)', autoDnd, setAutoDnd],
            ['Отключить композитор', disableCompositor, setDisableCompositor],
          ].map(([label, val, setter]) => (
            <label
              key={label as string}
              className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${
                val ? 'bg-cyan-500/15 border-cyan-400/45 text-cyan-300' : btnCls
              }`}
            >
              <span className="font-semibold truncate">{label as string}</span>
              <input
                type="checkbox"
                checked={val as boolean}
                onChange={(e) => (setter as React.Dispatch<React.SetStateAction<boolean>>)(e.target.checked)}
                className="accent-cyan-400"
              />
            </label>
          ))}
        </div>

        <button
          disabled={busy}
          onClick={() => void handleAddCustom()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Добавить правило окна
        </button>
      </div>

      {/* Active Rules List */}
      <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${surfaceCls}`}>
        <div className="font-bold">Сохранённые правила ({rules.length})</div>
        {rules.length === 0 ? (
          <div className={`py-6 text-center ${mutedCls}`}>Правил пока нет — выберите пресет выше или создайте своё.</div>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div
                key={r.id}
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                  r.enabled
                    ? isDark
                      ? 'bg-cyan-500/[0.07] border-cyan-400/30'
                      : 'bg-cyan-50 border-cyan-400/40'
                    : btnCls
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="font-bold flex flex-wrap items-center gap-1.5">
                    <span>{r.name}</span>
                    {r.monitor_index > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono">
                        Монитор #{r.monitor_index}
                      </span>
                    )}
                    {r.zone && r.zone !== 'none' && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
                        {ZONE_LABELS[r.zone] || r.zone}
                      </span>
                    )}
                    {r.always_on_top && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] inline-flex items-center gap-0.5">
                        <Pin className="w-2.5 h-2.5" /> Поверх
                      </span>
                    )}
                    {r.borderless && (
                      <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[10px] inline-flex items-center gap-0.5">
                        <Maximize2 className="w-2.5 h-2.5" /> Без рамки
                      </span>
                    )}
                    {r.auto_dnd && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">DND</span>
                    )}
                    {r.disable_compositor && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                        Без композитора
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] font-mono ${mutedCls}`}>
                    Процесс: {r.match_process || '*'} · Заголовок: {r.match_title || '*'} · Непрозрачность: {r.opacity || 100}%
                    {r.hits ? ` · Срабатываний: ${r.hits}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => void toggleRule(r.id)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                      r.enabled ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' : btnCls
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    {r.enabled ? 'ВКЛ' : 'ВЫКЛ'}
                  </button>
                  <button
                    onClick={() => void deleteRule(r.id)}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 cursor-pointer"
                    title="Удалить правило"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
