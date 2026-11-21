import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AppWindow,
  Cpu,
  ExternalLink,
  HardDrive,
  Layers,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Server,
  ShieldCheck,
  Square,
  Wifi,
  X,
  ChevronDown,
  ChevronRight,
  Gauge,
} from 'lucide-react';
import {
  AppItem,
  formatLiveClock,
  HostProcessInfo,
  HostWindowInfo,
  LiveSystemTelemetry,
} from '../data/launcherData';

interface OpenLumaWindowItem {
  id: string;
  label: string;
  minimized: boolean;
}

interface SystemServiceRow {
  name: string;
  display_name: string;
  status: string;
  start_type: string;
  source: 'luma' | 'os';
  pid?: number;
  description?: string;
}

interface StartupRow {
  name: string;
  command: string;
  location: string;
  enabled: boolean;
  impact: string;
}

function WinChart({
  values,
  max = 100,
  color = 'var(--luma-accent)',
  height = 140,
  showGrid = true,
}: {
  values: number[];
  max?: number;
  color?: string;
  height?: number;
  showGrid?: boolean;
}) {
  const pts = values.length > 1 ? values : [0, 0];
  const w = 420;
  const h = height;
  const coords = pts.map((v, i) => {
    const x = (i / Math.max(1, pts.length - 1)) * w;
    const y = h - (Math.min(max, Math.max(0, v)) / Math.max(1, max)) * (h - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = coords.join(' ');
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full block" preserveAspectRatio="none">
      {showGrid && (
        <g stroke="currentColor" strokeOpacity="0.09" strokeWidth="1">
          {[0.25, 0.5, 0.75].map((r) => (
            <line key={`h_${r}`} x1="0" y1={h * r} x2={w} y2={h * r} />
          ))}
          {[0.2, 0.4, 0.6, 0.8].map((r) => (
            <line key={`v_${r}`} x1={w * r} y1="0" x2={w * r} y2={h} />
          ))}
        </g>
      )}
      <polygon points={area} fill={color} fillOpacity="0.18" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function heatCellCls(pct: number, isDark: boolean): string {
  if (pct >= 65) return isDark ? 'bg-rose-500/35 text-rose-200 font-bold' : 'bg-rose-500/25 text-rose-900 font-bold';
  if (pct >= 30) return isDark ? 'bg-amber-500/28 text-amber-200 font-semibold' : 'bg-amber-500/22 text-amber-900 font-semibold';
  if (pct >= 8) return isDark ? 'bg-amber-500/12 text-zinc-200' : 'bg-amber-500/10 text-zinc-800';
  return isDark ? 'bg-white/[0.02] text-zinc-300' : 'bg-black/[0.015] text-zinc-700';
}

export const LumaTaskManagerWindow: React.FC<{
  isDark: boolean;
  liveSystem: LiveSystemTelemetry | null;
  cpuLoad: number;
  ramLoad: number;
  kernelConnected: boolean;
  openLumaWindows: OpenLumaWindowItem[];
  runningApps: AppItem[];
  hostWindows: HostWindowInfo[];
  dynamicIslandEnabled: boolean;
  islandAutoClipboard: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  onFocusLumaWindow: (id: string) => void;
  onCloseLumaWindow: (id: string) => void;
  onFocusLumaApp: (app: AppItem) => void;
  onStopLumaApp: (appId: string) => void;
  onFocusHostWindow: (pid: number) => void;
  onKillHostProcess: (pid: number, force?: boolean) => Promise<void>;
  onToggleIsland: () => void;
  onToggleAutoClip: () => void;
  onRotateKey: () => void;
  onPushToast: (title: string, msg: string, type?: 'info' | 'warning' | 'success') => void;
}> = ({
  isDark,
  liveSystem,
  cpuLoad,
  ramLoad,
  kernelConnected,
  openLumaWindows,
  runningApps,
  hostWindows,
  dynamicIslandEnabled,
  islandAutoClipboard,
  surfaceCls,
  btnCls,
  mutedCls,
  onFocusLumaWindow,
  onCloseLumaWindow,
  onFocusLumaApp,
  onStopLumaApp,
  onFocusHostWindow,
  onKillHostProcess,
  onToggleIsland,
  onToggleAutoClip,
  onRotateKey,
  onPushToast,
}) => {
  const [tab, setTab] = useState<'processes' | 'performance' | 'startup' | 'services'>('processes');
  const [perfMetric, setPerfMetric] = useState<'cpu' | 'ram' | 'disk' | 'net' | 'gpu'>('cpu');
  const [query, setQuery] = useState('');
  const [paused, setPaused] = useState(false);
  const [sortKey, setSortKey] = useState<'mem' | 'cpu' | 'name' | 'pid'>('mem');
  const [processes, setProcesses] = useState<HostProcessInfo[]>([]);
  const [services, setServices] = useState<SystemServiceRow[]>([]);
  const [startupItems, setStartupItems] = useState<StartupRow[]>([]);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [runTaskOpen, setRunTaskOpen] = useState(false);
  const [runTaskCmd, setRunTaskCmd] = useState('');

  const [cpuHistory, setCpuHistory] = useState<number[]>(() => Array(30).fill(cpuLoad));
  const [ramHistory, setRamHistory] = useState<number[]>(() => Array(30).fill(ramLoad));
  const [netHistory, setNetHistory] = useState<number[]>(() => Array(30).fill(0));
  const [gpuHistory, setGpuHistory] = useState<number[]>(() => Array(30).fill(liveSystem?.gpu_percent || 12));

  useEffect(() => {
    if (paused) return;
    setCpuHistory((p) => [...p.slice(-39), cpuLoad]);
    setRamHistory((p) => [...p.slice(-39), ramLoad]);
    setNetHistory((p) => [...p.slice(-39), Math.round((liveSystem?.net_down_mbps || 0) + (liveSystem?.net_up_mbps || 0))]);
    setGpuHistory((p) => [...p.slice(-39), liveSystem?.gpu_percent ?? Math.min(100, Math.round(cpuLoad * 0.7 + 8))]);
  }, [cpuLoad, ramLoad, liveSystem?.net_down_mbps, liveSystem?.net_up_mbps, liveSystem?.gpu_percent, paused]);

  const fetchProcesses = async () => {
    try {
      const r = await fetch('/api/kernel/processes?limit=90');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.processes)) setProcesses(d.processes);
      }
    } catch {
      // ignore
    }
  };

  const fetchServicesAndStartup = async () => {
    try {
      const [rs, rst] = await Promise.all([fetch('/api/kernel/services?limit=80'), fetch('/api/kernel/startup')]);
      if (rs.ok) {
        const ds = await rs.json();
        if (Array.isArray(ds?.services)) setServices(ds.services);
      }
      if (rst.ok) {
        const dst = await rst.json();
        if (Array.isArray(dst?.items)) setStartupItems(dst.items);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void fetchProcesses();
    void fetchServicesAndStartup();
    const timer = window.setInterval(() => {
      if (!paused) void fetchProcesses();
    }, 2500);
    return () => clearInterval(timer);
  }, [paused]);

  const q = query.trim().toLowerCase();

  const filteredLumaWindows = useMemo(
    () => openLumaWindows.filter((w) => !q || w.label.toLowerCase().includes(q) || w.id.toLowerCase().includes(q)),
    [openLumaWindows, q]
  );

  const filteredLumaApps = useMemo(
    () => runningApps.filter((a) => !q || a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)),
    [runningApps, q]
  );

  const filteredHostWindows = useMemo(
    () =>
      hostWindows.filter(
        (hw) => !q || hw.title.toLowerCase().includes(q) || hw.name.toLowerCase().includes(q) || String(hw.pid).includes(q)
      ),
    [hostWindows, q]
  );

  const filteredBgProcesses = useMemo(() => {
    const winPids = new Set(hostWindows.map((w) => w.pid));
    const list = processes.filter((p) => {
      if (winPids.has(p.pid)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q) || String(p.pid).includes(q);
    });
    return [...list].sort((a, b) => {
      if (sortKey === 'cpu') return b.cpu_pct - a.cpu_pct;
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'pid') return a.pid - b.pid;
      return b.mem_mb - a.mem_mb;
    });
  }, [processes, hostWindows, q, sortKey]);

  const handleRunNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = runTaskCmd.trim();
    if (!cmd) return;
    try {
      await fetch('/api/kernel/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `task_${Date.now()}`, name: cmd, target: cmd, type: 'native' }),
      });
      onPushToast('Диспетчер задач', `Запущена задача: ${cmd}`, 'success');
      setRunTaskCmd('');
      setRunTaskOpen(false);
    } catch {
      onPushToast('Диспетчер задач', 'Не удалось запустить задачу', 'warning');
    }
  };

  const toggleGroup = (k: string) => setCollapsedGroups((prev) => ({ ...prev, [k]: !prev[k] }));
  const totalMemMB = (liveSystem?.ram_total_gb || 16) * 1024;
  const disks = liveSystem?.disks || [];
  const mainDiskPct = disks[0]?.percent ?? 0;

  return (
    <div className="h-full flex min-h-0 select-none">
      {/* Authentic Windows 11 Task Manager Left Navigation Rail */}
      <aside
        className={`w-14 sm:w-48 shrink-0 border-r p-2 flex flex-col justify-between gap-2 ${
          isDark ? 'border-white/[0.08] bg-black/25' : 'border-zinc-900/10 bg-black/[0.03]'
        }`}
      >
        <div className="space-y-1">
          {[
            { id: 'processes' as const, label: 'Процессы', icon: <Layers className="w-4 h-4 shrink-0" />, badge: filteredLumaWindows.length + filteredLumaApps.length + filteredHostWindows.length + filteredBgProcesses.length },
            { id: 'performance' as const, label: 'Производительность', icon: <Activity className="w-4 h-4 shrink-0" /> },
            { id: 'startup' as const, label: 'Автозагрузка', icon: <Rocket className="w-4 h-4 shrink-0" />, badge: startupItems.length || undefined },
            { id: 'services' as const, label: 'Службы', icon: <Server className="w-4 h-4 shrink-0" />, badge: services.length || undefined },
          ].map((nav) => (
            <button
              key={nav.id}
              onClick={() => setTab(nav.id)}
              title={nav.label}
              className={`w-full px-2.5 py-2.5 rounded-xl flex items-center justify-center sm:justify-between gap-2 text-xs transition cursor-pointer ${
                tab === nav.id
                  ? 'bg-[var(--luma-accent)] text-white font-bold shadow-sm'
                  : isDark
                  ? 'text-zinc-300 hover:bg-white/[0.07]'
                  : 'text-zinc-700 hover:bg-zinc-900/[0.07]'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {nav.icon}
                <span className="hidden sm:inline truncate">{nav.label}</span>
              </span>
              {nav.badge !== undefined && (
                <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-black/20 text-[10px] font-mono">
                  {nav.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bottom LumaCore 1.2 Badge */}
        <div className={`hidden sm:block p-2.5 rounded-xl border text-[10px] font-mono space-y-1 ${surfaceCls}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-[var(--luma-accent)]">LumaCore 1.2</span>
            <span className="text-emerald-500">{kernelConnected ? 'ONLINE' : 'LOCAL'}</span>
          </div>
          <div className={mutedCls}>ЦП {cpuLoad}% · ОЗУ {ramLoad}%</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Windows-Style Top Command Toolbar */}
        <div
          className={`px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${
            isDark ? 'border-white/[0.08]' : 'border-zinc-900/10'
          }`}
        >
          <div className={`flex-1 min-w-[180px] max-w-sm flex items-center gap-2 px-3 py-1.5 rounded-xl border ${btnCls}`}>
            <Search className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Имя, издатель или PID процесса..."
              className="w-full bg-transparent text-xs outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="opacity-60 hover:opacity-100 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setRunTaskOpen((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl border font-semibold inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
            >
              <Plus className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Новая задача
            </button>
            <button
              disabled={selectedPid === null}
              onClick={() => {
                if (selectedPid !== null) {
                  void onKillHostProcess(selectedPid, true);
                  setSelectedPid(null);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600/85 hover:bg-rose-600 text-white font-semibold disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3 h-3" />
              Снять задачу
            </button>
            <button
              onClick={() => setPaused((v) => !v)}
              className={`p-1.5 rounded-xl border cursor-pointer ${btnCls}`}
              title={paused ? 'Возобновить обновление' : 'Пауза'}
            >
              {paused ? <Play className="w-3.5 h-3.5 text-emerald-500" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                void fetchProcesses();
                void fetchServicesAndStartup();
              }}
              className={`p-1.5 rounded-xl border cursor-pointer ${btnCls}`}
              title="Обновить"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline "Run New Task" Bar (Win+R style inside Task Manager) */}
        {runTaskOpen && (
          <form
            onSubmit={handleRunNewTask}
            className={`px-4 py-2.5 border-b flex items-center gap-2 text-xs ${
              isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-black/[0.04] border-zinc-900/10'
            }`}
          >
            <span className="font-mono font-bold text-[var(--luma-accent)]">Запустить:</span>
            <input
              value={runTaskCmd}
              onChange={(e) => setRunTaskCmd(e.target.value)}
              placeholder="notepad.exe, chrome, cmd, explorer или путь к .exe..."
              autoFocus
              className={`flex-1 px-3 py-1.5 rounded-lg border font-mono text-xs outline-none ${btnCls}`}
            />
            <button type="submit" className="px-3 py-1.5 rounded-lg bg-[var(--luma-accent)] text-white font-bold cursor-pointer">
              ОК
            </button>
            <button type="button" onClick={() => setRunTaskOpen(false)} className={`px-2 py-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
              Отмена
            </button>
          </form>
        )}

        {/* ==================== TAB 1: PROCESSES (WINDOWS 11 HEATMAP TABLE) ==================== */}
        {tab === 'processes' && (
          <div className="flex-1 overflow-y-auto">
            {/* Sticky Windows Column Headers with Live Totals */}
            <div
              className={`sticky top-0 z-10 grid grid-cols-[1fr_72px_84px_72px_72px_96px] text-[11px] font-mono border-b backdrop-blur-md ${
                isDark ? 'bg-[#121216]/95 border-white/10' : 'bg-[#ebeae5]/95 border-zinc-900/10'
              }`}
            >
              <button onClick={() => setSortKey('name')} className="px-3 py-2 text-left font-bold cursor-pointer hover:text-[var(--luma-accent)]">
                Имя {sortKey === 'name' ? '▾' : ''}
              </button>
              <button onClick={() => setSortKey('cpu')} className="px-2 py-1.5 text-right border-l border-white/5 cursor-pointer">
                <div className="text-sm font-black text-[var(--luma-accent)]">{cpuLoad}%</div>
                <div className={`text-[9px] ${mutedCls}`}>ЦП {sortKey === 'cpu' ? '▾' : ''}</div>
              </button>
              <button onClick={() => setSortKey('mem')} className="px-2 py-1.5 text-right border-l border-white/5 cursor-pointer">
                <div className="text-sm font-black text-sky-400">{ramLoad}%</div>
                <div className={`text-[9px] ${mutedCls}`}>Память {sortKey === 'mem' ? '▾' : ''}</div>
              </button>
              <div className="px-2 py-1.5 text-right border-l border-white/5">
                <div className="text-sm font-black text-emerald-400">{mainDiskPct}%</div>
                <div className={`text-[9px] ${mutedCls}`}>Диск</div>
              </div>
              <button onClick={() => setSortKey('pid')} className="px-2 py-1.5 text-right border-l border-white/5 cursor-pointer">
                <div className="text-xs font-bold">PID</div>
                <div className={`text-[9px] ${mutedCls}`}>{sortKey === 'pid' ? '▾' : 'ID'}</div>
              </button>
              <div className="px-2 py-2 text-right border-l border-white/5 font-bold">Действия</div>
            </div>

            {/* GROUP 1: LUMA OS WINDOWS & APPS */}
            <div>
              <button
                onClick={() => toggleGroup('luma')}
                className={`w-full px-3 py-1.5 text-left text-[11px] font-bold flex items-center gap-1.5 border-b cursor-pointer ${
                  isDark ? 'bg-white/[0.04] border-white/[0.06] text-zinc-200' : 'bg-black/[0.04] border-zinc-900/10 text-zinc-800'
                }`}
              >
                {collapsedGroups.luma ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Приложения Luma OS ({filteredLumaWindows.length + filteredLumaApps.length})</span>
              </button>
              {!collapsedGroups.luma && (
                <>
                  {filteredLumaWindows.map((w) => (
                    <div
                      key={`lw_${w.id}`}
                      className={`grid grid-cols-[1fr_72px_84px_72px_72px_96px] items-center text-xs border-b ${
                        isDark ? 'border-white/[0.04] hover:bg-white/[0.04]' : 'border-zinc-900/[0.05] hover:bg-black/[0.03]'
                      }`}
                    >
                      <div className="px-3 py-2 flex items-center gap-2 min-w-0">
                        <AppWindow className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
                        <span className="font-semibold truncate">{w.label}</span>
                        {w.minimized && <span className={`text-[10px] ${mutedCls}`}>(Свёрнуто)</span>}
                      </div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(1.2, isDark)}`}>0.4%</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(4, isDark)}`}>42 МБ</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${mutedCls}`}>0 МБ/с</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${mutedCls}`}>LUMA</div>
                      <div className="px-2 py-1.5 flex items-center justify-end gap-1">
                        <button onClick={() => onFocusLumaWindow(w.id)} title="Переключиться" className={`p-1 rounded border cursor-pointer ${btnCls}`}>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button onClick={() => onCloseLumaWindow(w.id)} title="Закрыть" className="p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredLumaApps.map((app) => (
                    <div
                      key={`la_${app.id}`}
                      className={`grid grid-cols-[1fr_72px_84px_72px_72px_96px] items-center text-xs border-b ${
                        isDark ? 'border-white/[0.04] hover:bg-white/[0.04]' : 'border-zinc-900/[0.05] hover:bg-black/[0.03]'
                      }`}
                    >
                      <div className="px-3 py-2 flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)] shrink-0" />
                        <span className="font-semibold truncate">{app.name}</span>
                        <span className={`text-[10px] font-mono ${mutedCls}`}>{formatLiveClock(app.elapsedSeconds)}</span>
                      </div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(2.5, isDark)}`}>1.5%</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(6, isDark)}`}>86 МБ</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${mutedCls}`}>0.1 МБ/с</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${mutedCls}`}>APP</div>
                      <div className="px-2 py-1.5 flex items-center justify-end gap-1">
                        <button onClick={() => onFocusLumaApp(app)} title="Открыть" className={`p-1 rounded border cursor-pointer ${btnCls}`}>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button onClick={() => onStopLumaApp(app.id)} title="Снять" className="p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* GROUP 2: REAL OPEN HOST WINDOWS (CHROME, VSCODE, EXPLORER, ETC.) */}
            <div>
              <button
                onClick={() => toggleGroup('hostwin')}
                className={`w-full px-3 py-1.5 text-left text-[11px] font-bold flex items-center gap-1.5 border-b cursor-pointer ${
                  isDark ? 'bg-white/[0.04] border-white/[0.06] text-emerald-300' : 'bg-black/[0.04] border-zinc-900/10 text-emerald-800'
                }`}
              >
                {collapsedGroups.hostwin ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Открытые приложения ПК / Windows ({filteredHostWindows.length})</span>
              </button>
              {!collapsedGroups.hostwin &&
                filteredHostWindows.map((hw) => {
                  const memPct = (hw.mem_mb / totalMemMB) * 100;
                  const isSel = selectedPid === hw.pid;
                  return (
                    <div
                      key={`hw_${hw.pid}`}
                      onClick={() => setSelectedPid(hw.pid)}
                      className={`grid grid-cols-[1fr_72px_84px_72px_72px_96px] items-center text-xs border-b cursor-pointer ${
                        isSel
                          ? 'bg-[var(--luma-accent-soft)] border-[var(--luma-accent)]/40'
                          : isDark
                          ? 'border-white/[0.04] hover:bg-white/[0.04]'
                          : 'border-zinc-900/[0.05] hover:bg-black/[0.03]'
                      }`}
                    >
                      <div className="px-3 py-2 flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{hw.title || hw.name}</div>
                          <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{hw.name}</div>
                        </div>
                      </div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(3, isDark)}`}>—</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(memPct * 3, isDark)}`}>
                        {hw.mem_mb.toFixed(0)} МБ
                      </div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${mutedCls}`}>0 МБ/с</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${mutedCls}`}>{hw.pid}</div>
                      <div className="px-2 py-1.5 flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusHostWindow(hw.pid);
                          }}
                          title="На передний план"
                          className={`p-1 rounded border cursor-pointer ${btnCls}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void onKillHostProcess(hw.pid, false);
                          }}
                          title="Снять задачу"
                          className="p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* GROUP 3: BACKGROUND OS PROCESSES */}
            <div>
              <button
                onClick={() => toggleGroup('bg')}
                className={`w-full px-3 py-1.5 text-left text-[11px] font-bold flex items-center gap-1.5 border-b cursor-pointer ${
                  isDark ? 'bg-white/[0.04] border-white/[0.06] text-zinc-300' : 'bg-black/[0.04] border-zinc-900/10 text-zinc-700'
                }`}
              >
                {collapsedGroups.bg ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Фоновые процессы ОС ({filteredBgProcesses.length})</span>
              </button>
              {!collapsedGroups.bg &&
                filteredBgProcesses.map((p) => {
                  const memPct = (p.mem_mb / totalMemMB) * 100;
                  const isSel = selectedPid === p.pid;
                  return (
                    <div
                      key={`bg_${p.pid}`}
                      onClick={() => setSelectedPid(p.pid)}
                      className={`grid grid-cols-[1fr_72px_84px_72px_72px_96px] items-center text-xs border-b cursor-pointer ${
                        isSel
                          ? 'bg-[var(--luma-accent-soft)] border-[var(--luma-accent)]/40'
                          : isDark
                          ? 'border-white/[0.04] hover:bg-white/[0.04]'
                          : 'border-zinc-900/[0.05] hover:bg-black/[0.03]'
                      }`}
                    >
                      <div className="px-3 py-1.5 min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        {p.title && p.title !== p.name && <div className={`text-[10px] truncate ${mutedCls}`}>{p.title}</div>}
                      </div>
                      <div className={`px-2 py-1.5 text-right font-mono text-[11px] ${heatCellCls(p.cpu_pct, isDark)}`}>
                        {p.cpu_pct.toFixed(1)}%
                      </div>
                      <div className={`px-2 py-1.5 text-right font-mono text-[11px] ${heatCellCls(memPct * 4, isDark)}`}>
                        {p.mem_mb.toFixed(1)} МБ
                      </div>
                      <div className={`px-2 py-1.5 text-right font-mono text-[11px] ${mutedCls}`}>0 МБ/с</div>
                      <div className={`px-2 py-1.5 text-right font-mono text-[11px] ${mutedCls}`}>{p.pid}</div>
                      <div className="px-2 py-1 flex items-center justify-end gap-1">
                        {!p.is_self && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void onKillHostProcess(p.pid, true);
                            }}
                            title="Принудительно завершить"
                            className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-600 hover:text-white text-[10px] font-mono cursor-pointer"
                          >
                            Снять
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: PERFORMANCE (WINDOWS 11 DUAL-PANE GRAPHS) ==================== */}
        {tab === 'performance' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[220px_1fr] overflow-hidden">
            {/* Left Metric Selector Tiles with Mini Sparklines */}
            <div className={`border-r p-2.5 space-y-2 overflow-y-auto ${isDark ? 'border-white/[0.08]' : 'border-zinc-900/10'}`}>
              {[
                {
                  id: 'cpu' as const,
                  title: 'ЦП',
                  sub: `${cpuLoad}% · ${liveSystem?.cpu_cores || 0} потоков`,
                  data: cpuHistory,
                  max: 100,
                  color: '#38bdf8',
                  icon: <Cpu className="w-3.5 h-3.5" />,
                },
                {
                  id: 'ram' as const,
                  title: 'Память',
                  sub: liveSystem ? `${liveSystem.ram_used_gb.toFixed(1)}/${liveSystem.ram_total_gb.toFixed(1)} ГБ (${ramLoad}%)` : `${ramLoad}%`,
                  data: ramHistory,
                  max: 100,
                  color: '#a855f7',
                  icon: <Gauge className="w-3.5 h-3.5" />,
                },
                {
                  id: 'disk' as const,
                  title: 'Диски',
                  sub: `${disks.length} том(ов) · ${mainDiskPct}% занято`,
                  data: Array(20).fill(mainDiskPct),
                  max: 100,
                  color: '#10b981',
                  icon: <HardDrive className="w-3.5 h-3.5" />,
                },
                {
                  id: 'net' as const,
                  title: 'Сеть',
                  sub: `↓${(liveSystem?.net_down_mbps || 0).toFixed(1)} ↑${(liveSystem?.net_up_mbps || 0).toFixed(1)} Мбит/с`,
                  data: netHistory,
                  max: Math.max(20, ...netHistory),
                  color: '#f59e0b',
                  icon: <Wifi className="w-3.5 h-3.5" />,
                },
                {
                  id: 'gpu' as const,
                  title: 'Графика GPU',
                  sub: `${liveSystem?.gpu_percent ?? 12}% · ${liveSystem?.gpu_temp_c ?? 48}°C`,
                  data: gpuHistory,
                  max: 100,
                  color: '#f43f5e',
                  icon: <Activity className="w-3.5 h-3.5" />,
                },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPerfMetric(m.id)}
                  className={`w-full p-2.5 rounded-xl border text-left space-y-1.5 cursor-pointer transition ${
                    perfMetric === m.id ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : surfaceCls
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="inline-flex items-center gap-1.5">{m.icon} {m.title}</span>
                  </div>
                  <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{m.sub}</div>
                  <div className="h-8 rounded-lg overflow-hidden border border-white/10">
                    <WinChart values={m.data} max={m.max} color={m.color} height={36} showGrid={false} />
                  </div>
                </button>
              ))}
            </div>

            {/* Right Large Windows Performance Graph + Hardware Spec Grid */}
            <div className="p-4 overflow-y-auto space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-lg font-extrabold">
                    {perfMetric === 'cpu'
                      ? 'Центральный процессор (ЦП)'
                      : perfMetric === 'ram'
                      ? 'Оперативная память (ОЗУ)'
                      : perfMetric === 'disk'
                      ? 'Накопители и тома'
                      : perfMetric === 'net'
                      ? 'Сетевые интерфейсы'
                      : 'Графический процессор (GPU)'}
                  </div>
                  <div className={`text-xs font-mono ${mutedCls}`}>
                    {perfMetric === 'cpu'
                      ? liveSystem?.cpu_model || 'x64 Processor'
                      : perfMetric === 'gpu'
                      ? liveSystem?.gpu_name || 'GPU'
                      : perfMetric === 'ram'
                      ? `${liveSystem?.ram_total_gb.toFixed(1) || 16} ГБ физической памяти`
                      : liveSystem?.hostname || 'Luma Workstation'}
                  </div>
                </div>
                <div className="text-2xl font-mono font-black text-[var(--luma-accent)]">
                  {perfMetric === 'cpu'
                    ? `${cpuLoad}%`
                    : perfMetric === 'ram'
                    ? `${ramLoad}%`
                    : perfMetric === 'disk'
                    ? `${mainDiskPct}%`
                    : perfMetric === 'net'
                    ? `${((liveSystem?.net_down_mbps || 0) + (liveSystem?.net_up_mbps || 0)).toFixed(1)} Мбит/с`
                    : `${liveSystem?.gpu_percent ?? 12}%`}
                </div>
              </div>

              <div className={`h-52 rounded-2xl border p-3 ${surfaceCls}`}>
                <WinChart
                  values={
                    perfMetric === 'cpu'
                      ? cpuHistory
                      : perfMetric === 'ram'
                      ? ramHistory
                      : perfMetric === 'net'
                      ? netHistory
                      : perfMetric === 'gpu'
                      ? gpuHistory
                      : Array(20).fill(mainDiskPct)
                  }
                  max={perfMetric === 'net' ? Math.max(20, ...netHistory) : 100}
                  color={
                    perfMetric === 'cpu'
                      ? '#38bdf8'
                      : perfMetric === 'ram'
                      ? '#a855f7'
                      : perfMetric === 'disk'
                      ? '#10b981'
                      : perfMetric === 'net'
                      ? '#f59e0b'
                      : '#f43f5e'
                  }
                  height={180}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className={`p-3 rounded-xl border ${surfaceCls}`}>
                  <div className={`text-[10px] ${mutedCls}`}>Логических ядер</div>
                  <div className="text-base font-bold mt-0.5">{liveSystem?.cpu_cores || '—'}</div>
                </div>
                <div className={`p-3 rounded-xl border ${surfaceCls}`}>
                  <div className={`text-[10px] ${mutedCls}`}>Процессов</div>
                  <div className="text-base font-bold mt-0.5">{processes.length}</div>
                </div>
                <div className={`p-3 rounded-xl border ${surfaceCls}`}>
                  <div className={`text-[10px] ${mutedCls}`}>Окон ПК</div>
                  <div className="text-base font-bold mt-0.5">{hostWindows.length}</div>
                </div>
                <div className={`p-3 rounded-xl border ${surfaceCls}`}>
                  <div className={`text-[10px] ${mutedCls}`}>Ядро</div>
                  <div className="text-base font-bold mt-0.5 text-[var(--luma-accent)]">LumaCore 1.2</div>
                </div>
              </div>

              {perfMetric === 'disk' && disks.length > 0 && (
                <div className="space-y-2">
                  {disks.map((d) => (
                    <div key={d.mount} className={`p-3 rounded-xl border space-y-1.5 text-xs ${surfaceCls}`}>
                      <div className="flex justify-between font-mono">
                        <span className="font-bold">{d.label} ({d.mount})</span>
                        <span>{d.used_gb.toFixed(1)} / {d.total_gb.toFixed(1)} ГБ ({d.percent}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: STARTUP APPS ==================== */}
        {tab === 'startup' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            <div className={`text-xs ${mutedCls}`}>
              Программы автозагрузки операционной системы (реестр HKCU/HKLM Run и autostart).
            </div>
            {startupItems.length === 0 ? (
              <div className={`py-8 text-center text-xs ${mutedCls}`}>Список автозагрузки пуст</div>
            ) : (
              startupItems.map((it, idx) => (
                <div key={`${it.name}_${idx}`} className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${surfaceCls}`}>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{it.name}</div>
                    <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{it.command}</div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    <span className={`px-2 py-0.5 rounded border ${btnCls}`}>{it.location}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${it.enabled ? 'bg-emerald-500/15 text-emerald-500' : 'bg-zinc-500/20 text-zinc-400'}`}>
                      {it.enabled ? 'Включено' : 'Отключено'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ==================== TAB 4: SERVICES (LUMA + OS) ==================== */}
        {tab === 'services' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Core Luma Quick Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button onClick={onToggleIsland} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${surfaceCls}`}>
                <span className="font-semibold">Luma Island</span>
                <span className={dynamicIslandEnabled ? 'text-emerald-500 font-mono font-bold' : mutedCls}>
                  {dynamicIslandEnabled ? 'ВКЛ' : 'ВЫКЛ'}
                </span>
              </button>
              <button onClick={onToggleAutoClip} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${surfaceCls}`}>
                <span className="font-semibold">Авто-буфер</span>
                <span className={islandAutoClipboard ? 'text-emerald-500 font-mono font-bold' : mutedCls}>
                  {islandAutoClipboard ? 'ВКЛ' : 'ВЫКЛ'}
                </span>
              </button>
              <button onClick={onRotateKey} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${surfaceCls}`}>
                <span className="font-semibold inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                  Ротация AES-ключа
                </span>
                <span className="font-mono text-[10px] text-[var(--luma-accent)]">Обновить</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {services
                .filter((s) => !q || s.name.toLowerCase().includes(q) || s.display_name.toLowerCase().includes(q))
                .map((s) => (
                  <div key={`${s.source}_${s.name}`} className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${surfaceCls}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{s.display_name || s.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${s.source === 'luma' ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-bold' : 'bg-white/10 opacity-75'}`}>
                          {s.source === 'luma' ? 'LUMA 1.1' : 'ОС'}
                        </span>
                      </div>
                      <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{s.name} {s.description ? `· ${s.description}` : ''}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold shrink-0 ${s.status.toLowerCase() === 'running' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-zinc-500/20 text-zinc-400'}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
