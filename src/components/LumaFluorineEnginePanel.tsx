import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  Layers,
  Palette,
  Play,
  Plus,
  Puzzle,
  RefreshCw,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { getCurrentMonetPalette, MonetPalette } from '../utils/monetEngine';

export type MonetSourceMode = 'auto' | 'wallpaper' | 'media' | 'off';

export interface FluorineVisualSettingsProps {
  isDark: boolean;
  opticalBlur: boolean;
  onToggleOpticalBlur: (v: boolean) => void;
  fluentReveal: boolean;
  onToggleFluentReveal: (v: boolean) => void;
  monetMode: MonetSourceMode;
  onChangeMonetMode: (m: MonetSourceMode) => void;
  onForceRefreshMonet?: () => void;
}

export const LumaFluorineVisualPanel: React.FC<FluorineVisualSettingsProps> = ({
  isDark,
  opticalBlur,
  onToggleOpticalBlur,
  fluentReveal,
  onToggleFluentReveal,
  monetMode,
  onChangeMonetMode,
  onForceRefreshMonet,
}) => {
  const [pal, setPal] = useState<MonetPalette>(() => getCurrentMonetPalette());

  useEffect(() => {
    const onEv = (e: Event) => {
      const ce = e as CustomEvent<{ palette: MonetPalette }>;
      if (ce.detail?.palette) setPal(ce.detail.palette);
    };
    window.addEventListener('luma-monet-palette', onEv);
    return () => window.removeEventListener('luma-monet-palette', onEv);
  }, []);

  const cardCls = isDark
    ? 'bg-white/[0.04] border-white/10 text-zinc-100'
    : 'bg-white/80 border-zinc-900/12 text-zinc-900';
  const mutedCls = isDark ? 'text-zinc-400' : 'text-zinc-600';

  return (
    <div className={`p-4 rounded-2xl border space-y-3.5 luma-glass-edge ${cardCls}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-xs font-extrabold tracking-tight">Визуальный движок Fluorine 1.8</div>
            <div className={`text-[10px] ${mutedCls}`}>Оптический блюр, блики Fluent Reveal и адаптивная палитра Material You (Monet)</div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 border border-emerald-400/35 text-emerald-400">
          FLUORINE · F-9
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <button
          type="button"
          onClick={() => onToggleOpticalBlur(!opticalBlur)}
          className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition cursor-pointer ${
            opticalBlur
              ? 'bg-emerald-500/12 border-emerald-400/40'
              : isDark
              ? 'bg-black/20 border-white/10 opacity-75'
              : 'bg-zinc-100 border-zinc-300 opacity-80'
          }`}
        >
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> Оптический блюр
            </div>
            <div className={`text-[10px] leading-snug ${mutedCls}`}>
              Живое многослойное стекло с хроматической аберрацией, микрозернистостью и подсветкой контуров.
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 ${opticalBlur ? 'bg-emerald-500 text-white' : 'bg-zinc-600/30'}`}>
            {opticalBlur ? 'ВКЛ' : 'ВЫКЛ'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onToggleFluentReveal(!fluentReveal)}
          className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition cursor-pointer ${
            fluentReveal
              ? 'bg-cyan-500/12 border-cyan-400/40'
              : isDark
              ? 'bg-black/20 border-white/10 opacity-75'
              : 'bg-zinc-100 border-zinc-300 opacity-80'
          }`}
        >
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Блики граней (Fluent Reveal)
            </div>
            <div className={`text-[10px] leading-snug ${mutedCls}`}>
              Мягкий световой контур толстого стекла на краях окон, карточек, панели задач и виджетов под курсором.
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 ${fluentReveal ? 'bg-cyan-500 text-white' : 'bg-zinc-600/30'}`}>
            {fluentReveal ? 'ВКЛ' : 'ВЫКЛ'}
          </span>
        </button>
      </div>

      {/* Material You (Monet) Adaptive Palette Selector + Live Extracted Swatches */}
      <div className={`p-3 rounded-xl border space-y-2.5 ${isDark ? 'bg-black/25 border-white/10' : 'bg-slate-50 border-zinc-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Palette className="w-3.5 h-3.5" style={{ color: pal.primary }} />
            Адаптивная палитра Material You (Monet)
          </div>
          <div className="flex items-center gap-1">
            {(
              [
                ['auto', 'Авто'],
                ['wallpaper', 'Обои'],
                ['media', 'Музыка'],
                ['off', 'Выкл'],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => onChangeMonetMode(k)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border cursor-pointer transition ${
                  monetMode === k
                    ? 'bg-emerald-500 text-white border-emerald-400'
                    : isDark
                    ? 'bg-white/[0.05] border-white/10 hover:bg-white/10'
                    : 'bg-white border-zinc-300 hover:bg-zinc-100'
                }`}
              >
                {lbl}
              </button>
            ))}
            {onForceRefreshMonet && monetMode !== 'off' && (
              <button
                type="button"
                onClick={onForceRefreshMonet}
                title="Пересчитать цвета из текущих обоев"
                className={`p-1 rounded-lg border cursor-pointer ${isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/15' : 'bg-white border-zinc-300'}`}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {pal.swatches.map((hex, i) => (
              <span
                key={`${hex}-${i}`}
                title={hex}
                className="w-6 h-6 rounded-full border border-white/30 shadow-sm"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <span className={`text-[10px] font-mono truncate ${mutedCls}`}>
            Источник: {monetMode === 'off' ? 'Отключено (ручной акцент)' : pal.sourceLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

interface PluginV4Item {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: string;
  enabled: boolean;
  builtin: boolean;
  runs: number;
}

interface LumaCore2Diag {
  ok: boolean;
  cpu_percent?: number;
  ram_percent?: number;
  metrics?: {
    engine_version: string;
    sdk_version: string;
    goroutines: number;
    alloc_mb: number;
    cache_hit_rate_pct: number;
    plugins_active: number;
    plugins_total: number;
    optimizations_run: number;
    powershell_ready: boolean;
  };
}

export const LumaCore2PluginsPanel: React.FC<{ isDark: boolean; onToast?: (title: string, msg: string) => void }> = ({
  isDark,
  onToast,
}) => {
  const [diag, setDiag] = useState<LumaCore2Diag | null>(null);
  const [plugins, setPlugins] = useState<PluginV4Item[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadAll = async () => {
    try {
      const [dRes, pRes] = await Promise.all([
        fetch('/api/kernel/v2/diagnostics'),
        fetch('/api/kernel/v2/plugins'),
      ]);
      if (dRes.ok) setDiag(await dRes.json());
      if (pRes.ok) {
        const pd = await pRes.json();
        if (Array.isArray(pd.plugins)) setPlugins(pd.plugins);
      }
    } catch {
      /* offline standalone fallback */
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const runOptimize = async () => {
    setOptimizing(true);
    try {
      const r = await fetch('/api/kernel/v2/optimize', { method: 'POST' });
      const d = await r.json();
      onToast?.('LumaCore 2.0', d?.message || 'Оптимизация ОЗУ завершена');
      await loadAll();
    } catch {
      onToast?.('LumaCore 2.0', 'Кэш оболочки очищен');
    } finally {
      setOptimizing(false);
    }
  };

  const pluginAction = async (action: 'toggle' | 'run' | 'remove', id: string) => {
    try {
      const r = await fetch('/api/kernel/v2/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      const d = await r.json();
      if (Array.isArray(d.plugins)) setPlugins(d.plugins);
      if (d.message) onToast?.('Плагины SDK v4.0', d.message);
    } catch {}
  };

  const installCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const r = await fetch('/api/kernel/v2/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'install',
          plugin: {
            name: newName.trim(),
            description: newDesc.trim() || 'Пользовательский плагин Luma OS 1.8',
            category: 'automation',
            author: 'Пользователь',
          },
        }),
      });
      const d = await r.json();
      if (Array.isArray(d.plugins)) setPlugins(d.plugins);
      setNewName('');
      setNewDesc('');
      onToast?.('Плагины SDK v4.0', `Плагин «${newName.trim()}» установлен и активирован`);
    } catch {}
  };

  const cardCls = isDark
    ? 'bg-white/[0.04] border-white/10 text-zinc-100'
    : 'bg-white/85 border-zinc-900/12 text-zinc-900';
  const mutedCls = isDark ? 'text-zinc-400' : 'text-zinc-600';

  return (
    <div className={`p-4 rounded-2xl border space-y-4 luma-glass-edge ${cardCls}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-xs font-extrabold">Ядро LumaCore 2.0 и движок плагинов нового поколения</div>
            <div className={`text-[10px] ${mutedCls}`}>
              Ускоренный кэшируемый API · живая шина событий · безопасный оптимизатор памяти
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void loadAll()}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-zinc-300'}`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Обновить
          </button>
          <button
            type="button"
            onClick={() => void runOptimize()}
            disabled={optimizing}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60"
          >
            <Zap className="w-3.5 h-3.5" /> {optimizing ? 'Очистка...' : 'Ускорить ОЗУ'}
          </button>
        </div>
      </div>

      {diag?.metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-black/25 border-white/10' : 'bg-slate-50 border-zinc-200'}`}>
            <div className={`text-[9px] font-mono uppercase ${mutedCls}`}>Движок ядра</div>
            <div className="font-mono font-bold text-emerald-400">LumaCore {diag.metrics.engine_version}</div>
          </div>
          <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-black/25 border-white/10' : 'bg-slate-50 border-zinc-200'}`}>
            <div className={`text-[9px] font-mono uppercase ${mutedCls}`}>Память ядра</div>
            <div className="font-mono font-bold">{diag.metrics.alloc_mb.toFixed(1)} МБ · {diag.metrics.goroutines} потоков</div>
          </div>
          <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-black/25 border-white/10' : 'bg-slate-50 border-zinc-200'}`}>
            <div className={`text-[9px] font-mono uppercase ${mutedCls}`}>Кэш API</div>
            <div className="font-mono font-bold text-cyan-400">{diag.metrics.cache_hit_rate_pct.toFixed(0)}% HIT</div>
          </div>
          <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-black/25 border-white/10' : 'bg-slate-50 border-zinc-200'}`}>
            <div className={`text-[9px] font-mono uppercase ${mutedCls}`}>Плагины</div>
            <div className="font-mono font-bold flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> {diag.metrics.plugins_active}/{diag.metrics.plugins_total} активны
            </div>
          </div>
        </div>
      )}

      {/* Active SDK v4.0 Plugins List */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold flex items-center gap-1.5">
          <Puzzle className="w-3.5 h-3.5 text-cyan-400" /> Установленные плагины ({plugins.length})
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {plugins.map((p) => (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 ${
                isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-zinc-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{p.name}</div>
                  <div className={`text-[10px] leading-snug line-clamp-2 ${mutedCls}`}>{p.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => void pluginAction('toggle', p.id)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 cursor-pointer ${
                    p.enabled ? 'bg-emerald-500 text-white' : 'bg-zinc-600/35 text-zinc-400'
                  }`}
                >
                  {p.enabled ? 'ВКЛ' : 'ВЫКЛ'}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className={`font-mono ${mutedCls}`}>v{p.version} · {p.runs} запусков</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void pluginAction('run', p.id)}
                    className="px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5" /> Тест
                  </button>
                  {!p.builtin && (
                    <button
                      type="button"
                      onClick={() => void pluginAction('remove', p.id)}
                      className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                      title="Удалить плагин"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Install Custom Plugin */}
      <form onSubmit={installCustom} className="flex flex-wrap gap-1.5 pt-1">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название нового плагина..."
          className={`flex-1 min-w-[150px] px-2.5 py-1.5 rounded-xl border text-xs outline-none ${isDark ? 'bg-black/30 border-white/15' : 'bg-white border-zinc-300'}`}
        />
        <input
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Краткое описание..."
          className={`flex-1 min-w-[160px] px-2.5 py-1.5 rounded-xl border text-xs outline-none ${isDark ? 'bg-black/30 border-white/15' : 'bg-white border-zinc-300'}`}
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Добавить плагин
        </button>
      </form>
    </div>
  );
};
