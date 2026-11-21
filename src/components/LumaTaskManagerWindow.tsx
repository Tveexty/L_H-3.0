import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Zap,
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

interface ChartPoint {
  value: number;
  time: string;
  detail?: string;
}

const MAX_HISTORY_POINTS = 60;

function formatNowTime(): string {
  const d = new Date();
  return d.toLocaleTimeString('ru-RU', { hour12: false });
}

function makeSeedHistory(initialValue: number, detail?: string): ChartPoint[] {
  const now = Date.now();
  return Array.from({ length: 30 }, (_, idx) => {
    const t = new Date(now - (29 - idx) * 1000).toLocaleTimeString('ru-RU', { hour12: false });
    return { value: initialValue, time: t, detail };
  });
}

function MiniSparkline({
  points,
  max = 100,
  color = 'var(--luma-accent)',
  height = 34,
}: {
  points: ChartPoint[];
  max?: number;
  color?: string;
  height?: number;
}) {
  const pts = points.length > 1 ? points : [{ value: 0, time: '' }, { value: 0, time: '' }];
  const w = 180;
  const h = height;
  const safeMax = Math.max(1, max);
  const coords = pts.map((p, i) => {
    const x = (i / Math.max(1, pts.length - 1)) * w;
    const y = h - (Math.min(safeMax, Math.max(0, p.value)) / safeMax) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = coords.join(' ');
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full block" preserveAspectRatio="none">
      <polygon points={area} fill={color} fillOpacity="0.18" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function InteractivePerfChart({
  points,
  max = 100,
  color = '#38bdf8',
  unit = '%',
  isDark,
  mutedCls,
  metricLabel,
}: {
  points: ChartPoint[];
  max?: number;
  color?: string;
  unit?: string;
  isDark: boolean;
  mutedCls: string;
  metricLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const pts = points.length > 1 ? points : [{ value: 0, time: formatNowTime() }, { value: 0, time: formatNowTime() }];
  const safeMax = Math.max(1, max);
  const w = 640;
  const h = 210;
  const padTop = 10;
  const padBottom = 10;
  const plotH = h - padTop - padBottom;

  const coords = useMemo(
    () =>
      pts.map((p, i) => {
        const ratioX = i / Math.max(1, pts.length - 1);
        const x = ratioX * w;
        const clamped = Math.min(safeMax, Math.max(0, p.value));
        const y = h - padBottom - (clamped / safeMax) * plotH;
        return { x, y, ratioX, point: p };
      }),
    [pts, safeMax, plotH]
  );

  const polylineStr = useMemo(() => coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '), [coords]);
  const areaStr = `0,${h - padBottom} ${polylineStr} ${w},${h - padBottom}`;

  const stats = useMemo(() => {
    let min = Infinity;
    let peak = -Infinity;
    let sum = 0;
    for (const p of pts) {
      if (p.value < min) min = p.value;
      if (p.value > peak) peak = p.value;
      sum += p.value;
    }
    return {
      min: Number.isFinite(min) ? min : 0,
      peak: Number.isFinite(peak) ? peak : 0,
      avg: pts.length ? sum / pts.length : 0,
    };
  }, [pts]);

  const updateHoverFromClientX = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const idx = Math.round(relX * (pts.length - 1));
      setHoverIdx(Math.max(0, Math.min(pts.length - 1, idx)));
    },
    [pts.length]
  );

  const active = hoverIdx !== null && coords[hoverIdx] ? coords[hoverIdx] : null;
  const formatVal = (v: number) => (unit === '%' ? `${Math.round(v * 10) / 10}%` : `${v.toFixed(1)} ${unit}`);
  const gradientId = useMemo(() => `lumaChartGrad_${color.replace(/[^a-zA-Z0-9]/g, '')}`, [color]);

  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((r) => ({
    ratio: r,
    label: unit === '%' ? `${Math.round(safeMax * r)}%` : `${Math.round(safeMax * r)}`,
  }));

  return (
    <div className="space-y-2">
      {/* Top interactive readout bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-zinc-900/10 bg-black/[0.04]'}`}>
            Мин: <strong>{formatVal(stats.min)}</strong>
          </span>
          <span className={`px-2 py-0.5 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-zinc-900/10 bg-black/[0.04]'}`}>
            Сред: <strong>{formatVal(stats.avg)}</strong>
          </span>
          <span className={`px-2 py-0.5 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-zinc-900/10 bg-black/[0.04]'}`}>
            Пик: <strong style={{ color }}>{formatVal(stats.peak)}</strong>
          </span>
        </div>
        <div className={`text-[10px] ${mutedCls}`}>
          {active ? (
            <span className="font-bold" style={{ color }}>
              ● {active.point.time} — {formatVal(active.point.value)}
              {active.point.detail ? ` (${active.point.detail})` : ''}
            </span>
          ) : (
            'Наведите курсор на график, чтобы увидеть точный % в любой момент'
          )}
        </div>
      </div>

      {/* Main SVG Plot + Y-axis + Interactive Crosshair & Tooltip */}
      <div className="flex items-stretch gap-2">
        {/* Y-axis scale */}
        <div className={`w-10 shrink-0 flex flex-col justify-between text-right text-[9px] font-mono py-1 select-none ${mutedCls}`}>
          {yTicks.map((t) => (
            <span key={t.ratio}>{t.label}</span>
          ))}
        </div>

        <div
          ref={containerRef}
          onMouseMove={(e) => updateHoverFromClientX(e.clientX)}
          onMouseLeave={() => setHoverIdx(null)}
          onTouchMove={(e) => {
            if (e.touches[0]) updateHoverFromClientX(e.touches[0].clientX);
          }}
          onTouchEnd={() => setHoverIdx(null)}
          className="relative flex-1 h-52 cursor-crosshair select-none overflow-visible"
        >
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full block rounded-xl overflow-hidden" preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.34" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <g stroke="currentColor" strokeOpacity={isDark ? '0.09' : '0.11'} strokeWidth="1">
              {[0, 0.25, 0.5, 0.75, 1].map((r) => {
                const y = padTop + plotH * r;
                return <line key={`h_${r}`} x1="0" y1={y} x2={w} y2={y} />;
              })}
              {[0.167, 0.333, 0.5, 0.667, 0.833].map((r) => (
                <line key={`v_${r}`} x1={w * r} y1={padTop} x2={w * r} y2={h - padBottom} strokeDasharray="3 4" />
              ))}
            </g>

            {/* Area fill & Curve */}
            <polygon points={areaStr} fill={`url(#${gradientId})`} />
            <polyline
              points={polylineStr}
              fill="none"
              stroke={color}
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Hover crosshair line */}
            {active && (
              <g>
                <line
                  x1={active.x}
                  y1={padTop}
                  x2={active.x}
                  y2={h - padBottom}
                  stroke={color}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="0"
                  y1={active.y}
                  x2={w}
                  y2={active.y}
                  stroke={color}
                  strokeOpacity="0.35"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}
          </svg>

          {/* Crisp non-distorted dot marker overlay (so it stays perfectly circular regardless of aspect ratio) */}
          {active && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-20"
              style={{
                left: `${(active.ratioX * 100).toFixed(3)}%`,
                top: `${((active.y / h) * 100).toFixed(3)}%`,
              }}
            >
              <span
                className="block w-4 h-4 rounded-full opacity-35"
                style={{ backgroundColor: color }}
              />
              <span
                className="block w-2.5 h-2.5 rounded-full border-2 border-white shadow-md absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ backgroundColor: color }}
              />
            </div>
          )}

          {/* Floating Tooltip Card showing exact % and timestamp at hovered moment */}
          {active && (
            <div
              className={`pointer-events-none absolute top-2 z-30 px-3 py-2 rounded-xl border shadow-2xl backdrop-blur-md transition-transform duration-75 min-w-[142px] ${
                isDark
                  ? 'bg-[#0e0f14]/95 border-white/15 text-zinc-100'
                  : 'bg-white/95 border-zinc-900/15 text-zinc-900'
              }`}
              style={{
                left: active.ratioX > 0.68 ? undefined : `calc(${(active.ratioX * 100).toFixed(2)}% + 12px)`,
                right: active.ratioX > 0.68 ? `calc(${((1 - active.ratioX) * 100).toFixed(2)}% + 12px)` : undefined,
              }}
            >
              <div className="flex items-center justify-between gap-3 text-[10px] font-mono opacity-75">
                <span>{metricLabel}</span>
                <span>{active.point.time}</span>
              </div>
              <div className="text-lg font-mono font-black leading-tight mt-0.5" style={{ color }}>
                {formatVal(active.point.value)}
              </div>
              {active.point.detail && (
                <div className="text-[10px] font-mono opacity-80 mt-0.5 truncate max-w-[190px]">
                  {active.point.detail}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom timeline labels */}
      <div className={`pl-12 flex items-center justify-between text-[9px] font-mono select-none ${mutedCls}`}>
        <span>{pts[0]?.time || '—'}</span>
        <span>{pts[Math.floor(pts.length / 2)]?.time || '—'}</span>
        <span className="font-bold">Сейчас ({pts[pts.length - 1]?.time || '—'})</span>
      </div>
    </div>
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
}> = React.memo(({
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
  const [refreshMs, setRefreshMs] = useState<500 | 1000 | 2000 | 5000>(1000);
  const [sortKey, setSortKey] = useState<'mem' | 'cpu' | 'name' | 'pid'>('mem');
  const [processes, setProcesses] = useState<HostProcessInfo[]>([]);
  const [services, setServices] = useState<SystemServiceRow[]>([]);
  const [startupItems, setStartupItems] = useState<StartupRow[]>([]);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [runTaskOpen, setRunTaskOpen] = useState(false);
  const [runTaskCmd, setRunTaskCmd] = useState('');
  const [localSystem, setLocalSystem] = useState<LiveSystemTelemetry | null>(null);
  const [lastSampleAt, setLastSampleAt] = useState<string>(() => formatNowTime());

  const activeSystem = localSystem || liveSystem;
  const liveCpu = localSystem ? Math.round(localSystem.cpu_percent) : cpuLoad;
  const liveRam = localSystem ? Math.round(localSystem.ram_percent) : ramLoad;
  const liveGpu = activeSystem?.gpu_percent ?? Math.min(100, Math.round(liveCpu * 0.55 + 6));
  const liveNetTotal = Number(((activeSystem?.net_down_mbps || 0) + (activeSystem?.net_up_mbps || 0)).toFixed(2));
  const disks = activeSystem?.disks || [];
  const mainDiskPct = disks[0]?.percent ?? 0;

  const [cpuHistory, setCpuHistory] = useState<ChartPoint[]>(() => makeSeedHistory(cpuLoad));
  const [ramHistory, setRamHistory] = useState<ChartPoint[]>(() => makeSeedHistory(ramLoad));
  const [diskHistory, setDiskHistory] = useState<ChartPoint[]>(() => makeSeedHistory(mainDiskPct));
  const [netHistory, setNetHistory] = useState<ChartPoint[]>(() => makeSeedHistory(0));
  const [gpuHistory, setGpuHistory] = useState<ChartPoint[]>(() => makeSeedHistory(liveSystem?.gpu_percent || 10));

  const appendSample = useCallback((sys: LiveSystemTelemetry | null, fallbackCpu: number, fallbackRam: number) => {
    const t = formatNowTime();
    const cpuVal = sys ? Math.round(sys.cpu_percent * 10) / 10 : fallbackCpu;
    const ramVal = sys ? Math.round(sys.ram_percent * 10) / 10 : fallbackRam;
    const gpuVal = sys?.gpu_percent ?? Math.min(100, Math.round(cpuVal * 0.55 + 6));
    const down = sys?.net_down_mbps || 0;
    const up = sys?.net_up_mbps || 0;
    const netVal = Number((down + up).toFixed(2));
    const d0 = sys?.disks?.[0];
    const diskVal = d0?.percent ?? 0;

    setLastSampleAt(t);
    setCpuHistory((p) => [
      ...p.slice(-(MAX_HISTORY_POINTS - 1)),
      { value: cpuVal, time: t, detail: sys?.cpu_cores ? `${sys.cpu_cores} логических ядер` : undefined },
    ]);
    setRamHistory((p) => [
      ...p.slice(-(MAX_HISTORY_POINTS - 1)),
      {
        value: ramVal,
        time: t,
        detail: sys ? `${sys.ram_used_gb.toFixed(1)} / ${sys.ram_total_gb.toFixed(1)} ГБ` : undefined,
      },
    ]);
    setDiskHistory((p) => [
      ...p.slice(-(MAX_HISTORY_POINTS - 1)),
      {
        value: diskVal,
        time: t,
        detail: d0 ? `${d0.mount} ${d0.used_gb.toFixed(0)} / ${d0.total_gb.toFixed(0)} ГБ` : undefined,
      },
    ]);
    setNetHistory((p) => [
      ...p.slice(-(MAX_HISTORY_POINTS - 1)),
      { value: netVal, time: t, detail: `↓${down.toFixed(1)} / ↑${up.toFixed(1)} Мбит/с` },
    ]);
    setGpuHistory((p) => [
      ...p.slice(-(MAX_HISTORY_POINTS - 1)),
      {
        value: gpuVal,
        time: t,
        detail: sys?.gpu_temp_c ? `${sys.gpu_temp_c}°C · ${sys.gpu_name || 'GPU'}` : undefined,
      },
    ]);
  }, []);

  const pollFastSnapshot = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const [sysRes, procRes] = await Promise.all([
        fetch('/api/kernel/system'),
        fetch('/api/kernel/processes?limit=100'),
      ]);
      let nextSys: LiveSystemTelemetry | null = null;
      if (sysRes.ok) {
        nextSys = await sysRes.json();
        setLocalSystem(nextSys);
      }
      if (procRes.ok) {
        const pd = await procRes.json();
        if (Array.isArray(pd?.processes)) setProcesses(pd.processes);
      }
      appendSample(nextSys, cpuLoad, ramLoad);
    } catch {
      appendSample(liveSystem, cpuLoad, ramLoad);
    }
  }, [appendSample, cpuLoad, ramLoad, liveSystem]);

  const fetchServicesAndStartup = useCallback(async () => {
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
  }, []);

  // Dedicated high-frequency real-time loop (0.5s / 1s / 2s / 5s) powered by LumaCore 1.3B zero-PowerShell Win32 APIs
  useEffect(() => {
    void pollFastSnapshot();
    void fetchServicesAndStartup();
    if (paused) return;
    const timer = window.setInterval(() => {
      void pollFastSnapshot();
    }, refreshMs);
    return () => clearInterval(timer);
  }, [paused, refreshMs, pollFastSnapshot, fetchServicesAndStartup]);

  const q = query.trim().toLowerCase();

  const filteredLumaWindows = useMemo(
    () => openLumaWindows.filter((w) => !q || w.label.toLowerCase().includes(q) || w.id.toLowerCase().includes(q)),
    [openLumaWindows, q]
  );

  const filteredLumaApps = useMemo(
    () => runningApps.filter((a) => !q || a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)),
    [runningApps, q]
  );

  const processByPid = useMemo(() => {
    const map = new Map<number, HostProcessInfo>();
    for (const p of processes) map.set(p.pid, p);
    return map;
  }, [processes]);

  const filteredHostWindows = useMemo(
    () =>
      hostWindows.filter(
        (hw) =>
          !q ||
          hw.title.toLowerCase().includes(q) ||
          hw.name.toLowerCase().includes(q) ||
          (hw.friendly_name || '').toLowerCase().includes(q) ||
          String(hw.pid).includes(q)
      ),
    [hostWindows, q]
  );

  const { filteredBgProcesses, filteredSysProcesses } = useMemo(() => {
    const winPids = new Set(hostWindows.map((w) => w.pid));
    const matched = processes.filter((p) => {
      if (winPids.has(p.pid)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.friendly_name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q) ||
        String(p.pid).includes(q)
      );
    });
    const sorter = (a: HostProcessInfo, b: HostProcessInfo) => {
      if (sortKey === 'cpu') return b.cpu_pct - a.cpu_pct;
      if (sortKey === 'name') return (a.friendly_name || a.name).localeCompare(b.friendly_name || b.name);
      if (sortKey === 'pid') return a.pid - b.pid;
      return (b.private_mb || b.mem_mb) - (a.private_mb || a.mem_mb);
    };
    const bg = matched.filter((p) => p.category !== 'system').sort(sorter);
    const sys = matched.filter((p) => p.category === 'system').sort(sorter);
    return { filteredBgProcesses: bg, filteredSysProcesses: sys };
  }, [processes, hostWindows, q, sortKey]);

  const handleRunNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = runTaskCmd.trim();
    if (!cmd) return;
    try {
      await fetch('/api/kernel/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `task_${Date.now()}`, name: cmd, url: cmd, target: cmd, type: 'native' }),
      });
      onPushToast('Диспетчер задач', `Запущена задача: ${cmd}`, 'success');
      setRunTaskCmd('');
      setRunTaskOpen(false);
    } catch {
      onPushToast('Диспетчер задач', 'Не удалось запустить задачу', 'warning');
    }
  };

  const toggleGroup = (k: string) => setCollapsedGroups((prev) => ({ ...prev, [k]: !prev[k] }));
  const totalMemMB = (activeSystem?.ram_total_gb || 16) * 1024;
  const netChartMax = Math.max(10, Math.ceil(Math.max(...netHistory.map((p) => p.value)) * 1.25));

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
            {
              id: 'processes' as const,
              label: 'Процессы',
              icon: <Layers className="w-4 h-4 shrink-0" />,
              badge:
                filteredLumaWindows.length +
                filteredLumaApps.length +
                filteredHostWindows.length +
                filteredBgProcesses.length +
                filteredSysProcesses.length,
            },
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

        {/* Bottom LumaCore 1.3B Live Engine Badge */}
        <div className={`hidden sm:block p-2.5 rounded-xl border text-[10px] font-mono space-y-1 ${surfaceCls}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-[var(--luma-accent)]">LumaCore 1.3B</span>
            <span className="text-emerald-500">{kernelConnected ? 'WIN32' : 'LOCAL'}</span>
          </div>
          <div className={mutedCls}>ЦП {liveCpu}% · ОЗУ {liveRam}%</div>
          <div className={`text-[9px] flex items-center justify-between ${mutedCls}`}>
            <span className="inline-flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${paused ? 'bg-amber-400' : 'bg-emerald-500'}`} />
              {paused ? 'Пауза' : `${refreshMs / 1000}с`}
            </span>
            <span>{lastSampleAt}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Windows-Style Top Command Toolbar with Update Speed Selector */}
        <div
          className={`px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${
            isDark ? 'border-white/[0.08]' : 'border-zinc-900/10'
          }`}
        >
          <div className={`flex-1 min-w-[160px] max-w-xs flex items-center gap-2 px-3 py-1.5 rounded-xl border ${btnCls}`}>
            <Search className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Имя, описание или PID..."
              className="w-full bg-transparent text-xs outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="opacity-60 hover:opacity-100 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Refresh Frequency Selector (0.5s / 1s / 2s / 5s) */}
            <div
              className={`inline-flex items-center gap-0.5 p-0.5 rounded-xl border font-mono text-[10px] ${btnCls}`}
              title="Частота обновления данных диспетчера"
            >
              <Zap className="w-3 h-3 text-[var(--luma-accent)] ml-1 mr-0.5" />
              {([500, 1000, 2000, 5000] as const).map((ms) => (
                <button
                  key={ms}
                  onClick={() => setRefreshMs(ms)}
                  className={`px-1.5 py-0.5 rounded-lg transition cursor-pointer ${
                    refreshMs === ms
                      ? 'bg-[var(--luma-accent)] text-white font-bold'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {ms === 500 ? '0.5с' : `${ms / 1000}с`}
                </button>
              ))}
            </div>

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
                void pollFastSnapshot();
                void fetchServicesAndStartup();
              }}
              className={`p-1.5 rounded-xl border cursor-pointer ${btnCls}`}
              title="Обновить сейчас"
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

        {/* ==================== TAB 1: PROCESSES (ACCURATE REAL-TIME TELEMETRY TABLE) ==================== */}
        {tab === 'processes' && (
          <div className="flex-1 overflow-y-auto">
            {/* Sticky Windows Column Headers with Live Totals */}
            <div
              className={`sticky top-0 z-10 grid grid-cols-[1fr_72px_92px_68px_68px_88px] text-[11px] font-mono border-b backdrop-blur-md ${
                isDark ? 'bg-[#121216]/95 border-white/10' : 'bg-[#ebeae5]/95 border-zinc-900/10'
              }`}
            >
              <button onClick={() => setSortKey('name')} className="px-3 py-2 text-left font-bold cursor-pointer hover:text-[var(--luma-accent)]">
                Имя процесса {sortKey === 'name' ? '▾' : ''}
              </button>
              <button onClick={() => setSortKey('cpu')} className="px-2 py-1.5 text-right border-l border-white/5 cursor-pointer">
                <div className="text-sm font-black text-[var(--luma-accent)]">{liveCpu}%</div>
                <div className={`text-[9px] ${mutedCls}`}>ЦП {sortKey === 'cpu' ? '▾' : ''}</div>
              </button>
              <button onClick={() => setSortKey('mem')} className="px-2 py-1.5 text-right border-l border-white/5 cursor-pointer">
                <div className="text-sm font-black text-sky-400">{liveRam}%</div>
                <div className={`text-[9px] ${mutedCls}`}>ОЗУ {sortKey === 'mem' ? '▾' : ''}</div>
              </button>
              <div className="px-2 py-1.5 text-right border-l border-white/5">
                <div className="text-xs font-bold text-emerald-400">Потоки</div>
                <div className={`text-[9px] ${mutedCls}`}>Диск {mainDiskPct}%</div>
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
                      className={`grid grid-cols-[1fr_72px_92px_68px_68px_88px] items-center text-xs border-b ${
                        isDark ? 'border-white/[0.04] hover:bg-white/[0.04]' : 'border-zinc-900/[0.05] hover:bg-black/[0.03]'
                      }`}
                    >
                      <div className="px-3 py-2 flex items-center gap-2 min-w-0">
                        <AppWindow className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
                        <span className="font-semibold truncate">{w.label}</span>
                        {w.minimized && <span className={`text-[10px] ${mutedCls}`}>(Свёрнуто)</span>}
                      </div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(0.5, isDark)}`}>0.2%</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(2, isDark)}`}>24 МБ</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${mutedCls}`}>2</div>
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
                      className={`grid grid-cols-[1fr_72px_92px_68px_68px_88px] items-center text-xs border-b ${
                        isDark ? 'border-white/[0.04] hover:bg-white/[0.04]' : 'border-zinc-900/[0.05] hover:bg-black/[0.03]'
                      }`}
                    >
                      <div className="px-3 py-2 flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)] shrink-0" />
                        <span className="font-semibold truncate">{app.name}</span>
                        <span className={`text-[10px] font-mono ${mutedCls}`}>{formatLiveClock(app.elapsedSeconds)}</span>
                      </div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(0.8, isDark)}`}>0.6%</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(4, isDark)}`}>48 МБ</div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${mutedCls}`}>4</div>
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

            {/* GROUP 2: REAL OPEN HOST WINDOWS (CHROME, STEAM, TELEGRAM, VSCODE...) */}
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
                  const procMeta = processByPid.get(hw.pid);
                  const rowCpu = Math.min(100, Math.max(0, procMeta?.cpu_pct ?? 0));
                  const memVal = procMeta?.private_mb || hw.mem_mb;
                  const memPct = (memVal / totalMemMB) * 100;
                  const isSel = selectedPid === hw.pid;
                  return (
                    <div
                      key={`hw_${hw.pid}`}
                      onClick={() => setSelectedPid(hw.pid)}
                      className={`grid grid-cols-[1fr_72px_92px_68px_68px_88px] items-center text-xs border-b cursor-pointer ${
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
                          <div className="font-semibold truncate">
                            {hw.friendly_name || hw.name}
                            {hw.title && hw.title !== hw.friendly_name ? ` — ${hw.title}` : ''}
                          </div>
                          <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                            {hw.name}.exe {procMeta?.description ? `· ${procMeta.description}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(rowCpu, isDark)}`}>
                        {rowCpu.toFixed(1)}%
                      </div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${heatCellCls(memPct * 3, isDark)}`}>
                        {memVal.toFixed(1)} МБ
                      </div>
                      <div className={`px-2 py-2 text-right font-mono text-[11px] ${mutedCls}`}>
                        {procMeta?.threads || '—'}
                      </div>
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

            {/* GROUP 3: BACKGROUND PROCESSES (ACCURATE WIN32 CPU% + PRIVATE RAM + THREADS) */}
            <div>
              <button
                onClick={() => toggleGroup('bg')}
                className={`w-full px-3 py-1.5 text-left text-[11px] font-bold flex items-center gap-1.5 border-b cursor-pointer ${
                  isDark ? 'bg-white/[0.04] border-white/[0.06] text-zinc-200' : 'bg-black/[0.04] border-zinc-900/10 text-zinc-800'
                }`}
              >
                {collapsedGroups.bg ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Фоновые процессы ({filteredBgProcesses.length})</span>
              </button>
              {!collapsedGroups.bg &&
                filteredBgProcesses.map((p) => {
                  const ramVal = p.private_mb && p.private_mb > 0 ? p.private_mb : p.mem_mb;
                  const memPct = (ramVal / totalMemMB) * 100;
                  const clampedCpu = Math.min(100, Math.max(0, p.cpu_pct));
                  const isSel = selectedPid === p.pid;
                  return (
                    <div
                      key={`bg_${p.pid}`}
                      onClick={() => setSelectedPid(p.pid)}
                      className={`grid grid-cols-[1fr_72px_92px_68px_68px_88px] items-center text-xs border-b cursor-pointer ${
                        isSel
                          ? 'bg-[var(--luma-accent-soft)] border-[var(--luma-accent)]/40'
                          : isDark
                          ? 'border-white/[0.04] hover:bg-white/[0.04]'
                          : 'border-zinc-900/[0.05] hover:bg-black/[0.03]'
                      }`}
                    >
                      <div className="px-3 py-1.5 min-w-0">
                        <div className="font-semibold truncate flex items-center gap-1.5">
                          <span className="truncate">{p.friendly_name || p.name}</span>
                          {p.is_self && (
                            <span className="px-1.5 py-0.2 rounded bg-[var(--luma-accent)]/20 text-[var(--luma-accent)] text-[9px] font-mono">
                              LUMA
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] truncate ${mutedCls}`}>
                          {p.name} {p.description ? `· ${p.description}` : ''}
                        </div>
                      </div>
                      <div className={`px-2 py-1.5 text-right font-mono text-[11px] ${heatCellCls(clampedCpu, isDark)}`}>
                        {clampedCpu.toFixed(1)}%
                      </div>
                      <div
                        className={`px-2 py-1.5 text-right font-mono text-[11px] ${heatCellCls(memPct * 4, isDark)}`}
                        title={`Приватная: ${ramVal.toFixed(1)} МБ · Рабочий набор: ${p.mem_mb.toFixed(1)} МБ`}
                      >
                        {ramVal.toFixed(1)} МБ
                      </div>
                      <div className={`px-2 py-1.5 text-right font-mono text-[11px] ${mutedCls}`}>
                        {p.threads || '—'}
                      </div>
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

            {/* GROUP 4: SYSTEM OS KERNEL PROCESSES */}
            {filteredSysProcesses.length > 0 && (
              <div>
                <button
                  onClick={() => toggleGroup('sys')}
                  className={`w-full px-3 py-1.5 text-left text-[11px] font-bold flex items-center gap-1.5 border-b cursor-pointer ${
                    isDark ? 'bg-white/[0.04] border-white/[0.06] text-sky-300' : 'bg-black/[0.04] border-zinc-900/10 text-sky-800'
                  }`}
                >
                  {collapsedGroups.sys ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>Процессы Windows / Ядра ОС ({filteredSysProcesses.length})</span>
                </button>
                {!collapsedGroups.sys &&
                  filteredSysProcesses.map((p) => {
                    const ramVal = p.private_mb && p.private_mb > 0 ? p.private_mb : p.mem_mb;
                    const clampedCpu = Math.min(100, Math.max(0, p.cpu_pct));
                    const isSel = selectedPid === p.pid;
                    return (
                      <div
                        key={`sys_${p.pid}`}
                        onClick={() => setSelectedPid(p.pid)}
                        className={`grid grid-cols-[1fr_72px_92px_68px_68px_88px] items-center text-xs border-b cursor-pointer ${
                          isSel
                            ? 'bg-[var(--luma-accent-soft)] border-[var(--luma-accent)]/40'
                            : isDark
                            ? 'border-white/[0.04] hover:bg-white/[0.04]'
                            : 'border-zinc-900/[0.05] hover:bg-black/[0.03]'
                        }`}
                      >
                        <div className="px-3 py-1.5 min-w-0">
                          <div className="font-medium truncate">{p.friendly_name || p.name}</div>
                          <div className={`text-[10px] truncate ${mutedCls}`}>{p.description || 'Системный процесс ОС'}</div>
                        </div>
                        <div className={`px-2 py-1.5 text-right font-mono text-[11px] ${heatCellCls(clampedCpu, isDark)}`}>
                          {clampedCpu.toFixed(1)}%
                        </div>
                        <div className={`px-2 py-1.5 text-right font-mono text-[11px] ${mutedCls}`}>
                          {ramVal.toFixed(1)} МБ
                        </div>
                        <div className={`px-2 py-1.5 text-right font-mono text-[11px] ${mutedCls}`}>{p.threads || '—'}</div>
                        <div className={`px-2 py-1.5 text-right font-mono text-[11px] ${mutedCls}`}>{p.pid}</div>
                        <div className="px-2 py-1 text-right font-mono text-[10px] opacity-50">SYSTEM</div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: PERFORMANCE (INTERACTIVE HOVER TELEMETRY GRAPHS) ==================== */}
        {tab === 'performance' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[220px_1fr] overflow-hidden">
            {/* Left Metric Selector Tiles with Mini Sparklines */}
            <div className={`border-r p-2.5 space-y-2 overflow-y-auto ${isDark ? 'border-white/[0.08]' : 'border-zinc-900/10'}`}>
              {[
                {
                  id: 'cpu' as const,
                  title: 'ЦП',
                  sub: `${liveCpu}% · ${activeSystem?.cpu_cores || 0} потоков`,
                  data: cpuHistory,
                  max: 100,
                  color: '#38bdf8',
                  icon: <Cpu className="w-3.5 h-3.5" />,
                },
                {
                  id: 'ram' as const,
                  title: 'Память',
                  sub: activeSystem
                    ? `${activeSystem.ram_used_gb.toFixed(1)}/${activeSystem.ram_total_gb.toFixed(1)} ГБ (${liveRam}%)`
                    : `${liveRam}%`,
                  data: ramHistory,
                  max: 100,
                  color: '#a855f7',
                  icon: <Gauge className="w-3.5 h-3.5" />,
                },
                {
                  id: 'disk' as const,
                  title: 'Диски',
                  sub: `${disks.length} том(ов) · ${mainDiskPct}% занято`,
                  data: diskHistory,
                  max: 100,
                  color: '#10b981',
                  icon: <HardDrive className="w-3.5 h-3.5" />,
                },
                {
                  id: 'net' as const,
                  title: 'Сеть',
                  sub: `↓${(activeSystem?.net_down_mbps || 0).toFixed(1)} ↑${(activeSystem?.net_up_mbps || 0).toFixed(1)} Мбит/с`,
                  data: netHistory,
                  max: netChartMax,
                  color: '#f59e0b',
                  icon: <Wifi className="w-3.5 h-3.5" />,
                },
                {
                  id: 'gpu' as const,
                  title: 'Графика GPU',
                  sub: `${liveGpu}% · ${activeSystem?.gpu_temp_c ?? 46}°C`,
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
                    <MiniSparkline points={m.data} max={m.max} color={m.color} height={34} />
                  </div>
                </button>
              ))}
            </div>

            {/* Right Large Interactive Hover Graph + Hardware Spec Grid */}
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
                      ? activeSystem?.cpu_model || 'x64 Processor'
                      : perfMetric === 'gpu'
                      ? activeSystem?.gpu_name || 'GPU'
                      : perfMetric === 'ram'
                      ? `${activeSystem?.ram_total_gb.toFixed(1) || 16} ГБ физической памяти`
                      : activeSystem?.hostname || 'Luma Workstation'}
                  </div>
                </div>
                <div className="text-2xl font-mono font-black text-[var(--luma-accent)]">
                  {perfMetric === 'cpu'
                    ? `${liveCpu}%`
                    : perfMetric === 'ram'
                    ? `${liveRam}%`
                    : perfMetric === 'disk'
                    ? `${mainDiskPct}%`
                    : perfMetric === 'net'
                    ? `${liveNetTotal.toFixed(1)} Мбит/с`
                    : `${liveGpu}%`}
                </div>
              </div>

              <div className={`rounded-2xl border p-3.5 ${surfaceCls}`}>
                <InteractivePerfChart
                  points={
                    perfMetric === 'cpu'
                      ? cpuHistory
                      : perfMetric === 'ram'
                      ? ramHistory
                      : perfMetric === 'net'
                      ? netHistory
                      : perfMetric === 'gpu'
                      ? gpuHistory
                      : diskHistory
                  }
                  max={perfMetric === 'net' ? netChartMax : 100}
                  unit={perfMetric === 'net' ? 'Мбит/с' : '%'}
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
                  metricLabel={
                    perfMetric === 'cpu'
                      ? 'ЦП'
                      : perfMetric === 'ram'
                      ? 'ОЗУ'
                      : perfMetric === 'disk'
                      ? 'Диск'
                      : perfMetric === 'net'
                      ? 'Сеть'
                      : 'GPU'
                  }
                  isDark={isDark}
                  mutedCls={mutedCls}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className={`p-3 rounded-xl border ${surfaceCls}`}>
                  <div className={`text-[10px] ${mutedCls}`}>Логических ядер</div>
                  <div className="text-base font-bold mt-0.5">{activeSystem?.cpu_cores || '—'}</div>
                </div>
                <div className={`p-3 rounded-xl border ${surfaceCls}`}>
                  <div className={`text-[10px] ${mutedCls}`}>Процессов</div>
                  <div className="text-base font-bold mt-0.5">{processes.length}</div>
                </div>
                <div className={`p-3 rounded-xl border ${surfaceCls}`}>
                  <div className={`text-[10px] ${mutedCls}`}>Интервал опроса</div>
                  <div className="text-base font-bold mt-0.5 text-emerald-400">
                    {paused ? 'ПАУЗА' : `${refreshMs / 1000} с`}
                  </div>
                </div>
                <div className={`p-3 rounded-xl border ${surfaceCls}`}>
                  <div className={`text-[10px] ${mutedCls}`}>Ядро</div>
                  <div className="text-base font-bold mt-0.5 text-[var(--luma-accent)]">LumaCore 1.3</div>
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
                          {s.source === 'luma' ? 'LUMA 1.3' : 'ОС'}
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
});
