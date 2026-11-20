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
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Square,
  Wifi,
  X,
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

function MiniAreaGraph({ values, max = 100 }: { values: number[]; max?: number }) {
  const pts = values.length > 1 ? values : [0, 0];
  const w = 240;
  const h = 64;
  const coords = pts.map((v, i) => {
    const x = (i / Math.max(1, pts.length - 1)) * w;
    const y = h - (Math.min(max, Math.max(0, v)) / Math.max(1, max)) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = coords.join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16 overflow-visible">
      <polygon points={area} fill="var(--luma-accent-soft)" />
      <polyline points={line} fill="none" stroke="var(--luma-accent)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
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
  const [tab, setTab] = useState<'processes' | 'performance' | 'services'>('processes');
  const [processes, setProcesses] = useState<HostProcessInfo[]>([]);
  const [selfPid, setSelfPid] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'mem' | 'cpu' | 'name' | 'pid'>('mem');
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [cpuHist, setCpuHist] = useState<number[]>(() => Array(24).fill(cpuLoad));
  const [ramHist, setRamHist] = useState<number[]>(() => Array(24).fill(ramLoad));
  const [netHist, setNetHist] = useState<number[]>(() => Array(24).fill(0));

  const fetchProcs = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/kernel/processes?limit=60');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.processes)) setProcesses(d.processes);
        if (typeof d.self_pid === 'number') setSelfPid(d.self_pid);
      }
    } catch {
      // ignore offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcs();
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(fetchProcs, 2800);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    setCpuHist((prev) => [...prev.slice(-29), cpuLoad]);
    setRamHist((prev) => [...prev.slice(-29), ramLoad]);
    setNetHist((prev) => [...prev.slice(-29), (liveSystem?.net_down_mbps || 0) + (liveSystem?.net_up_mbps || 0)]);
  }, [cpuLoad, ramLoad, liveSystem?.net_down_mbps, liveSystem?.net_up_mbps, paused]);

  const filteredProcs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = processes.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q) || String(p.pid).includes(q)
    );
    return [...list].sort((a, b) => {
      if (sortBy === 'mem') return b.mem_mb - a.mem_mb;
      if (sortBy === 'cpu') return b.cpu_pct - a.cpu_pct;
      if (sortBy === 'pid') return a.pid - b.pid;
      return a.name.localeCompare(b.name);
    });
  }, [processes, query, sortBy]);

  const lumaCoreServices = [
    { name: 'LumaCore 1.0 Kernel Daemon', detail: 'IPC 127.0.0.1:49215 · HTTP 49216', status: kernelConnected ? 'Работает' : 'Автономно', mem: '18.4 МБ', pid: selfPid || 1004 },
    { name: 'LumaGuard Security Engine', detail: 'AES-256-GCM + PBKDF2-HMAC-SHA512', status: 'Защищён', mem: '4.2 МБ', pid: (selfPid || 1004) + 1 },
    { name: 'Luma Window Compositor', detail: `Окон открыто: ${openLumaWindows.length}`, status: 'Активен', mem: '14.1 МБ', pid: (selfPid || 1004) + 2 },
    { name: 'Luma Telemetry & HAL', detail: liveSystem?.os_name || 'Host HAL', status: kernelConnected ? 'Онлайн' : 'Ожидание', mem: '6.8 МБ', pid: (selfPid || 1004) + 3 },
    { name: 'Luma Island Service', detail: 'Медиа · Буфер обмена · Таймер', status: dynamicIslandEnabled ? 'Работает' : 'Остановлен', mem: '3.1 МБ', pid: (selfPid || 1004) + 4 },
  ];

  return (
    <div className="h-full flex min-h-0 text-xs">
      {/* Windows 11-style Left Sidebar */}
      <aside className={`w-48 shrink-0 border-r p-3 flex flex-col gap-1 ${isDark ? 'border-white/[0.08] bg-white/[0.015]' : 'border-zinc-900/[0.1] bg-black/[0.025]'}`}>
        {(
          [
            ['processes', 'Процессы', <Layers className="w-4 h-4" />],
            ['performance', 'Производительность', <Activity className="w-4 h-4" />],
            ['services', 'Службы Luma', <Server className="w-4 h-4" />],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-left font-medium transition cursor-pointer ${
              tab === id
                ? 'bg-[var(--luma-accent)] text-white font-semibold'
                : isDark
                ? 'text-zinc-300 hover:bg-white/[0.06]'
                : 'text-zinc-800 hover:bg-zinc-900/[0.07]'
            }`}
          >
            {icon}
            <span className="truncate">{label}</span>
          </button>
        ))}

        <div className="mt-auto space-y-1.5 pt-3 border-t border-white/10 font-mono text-[10px]">
          <div className="flex justify-between">
            <span className={mutedCls}>CPU</span>
            <span className="font-bold text-[var(--luma-accent)]">{cpuLoad}%</span>
          </div>
          <div className="flex justify-between">
            <span className={mutedCls}>ОЗУ</span>
            <span className="font-bold">{ramLoad}%</span>
          </div>
          <div className="flex justify-between">
            <span className={mutedCls}>Процессы</span>
            <span>{processes.length + lumaCoreServices.length}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Top Controls */}
        <div className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${isDark ? 'border-white/[0.08]' : 'border-zinc-900/[0.1]'}`}>
          <div className={`flex-1 min-w-[180px] max-w-sm flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${btnCls}`}>
            <Search className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Фильтр по имени процесса или PID..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-500"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-current cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPaused((v) => !v)} className={`px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1 cursor-pointer ${btnCls}`}>
              {paused ? <Play className="w-3.5 h-3.5 text-[var(--luma-accent)]" /> : <Pause className="w-3.5 h-3.5" />}
              {paused ? 'Возобновить' : 'Пауза'}
            </button>
            <button onClick={fetchProcs} className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`} title="Обновить">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {selectedPid && selectedPid !== selfPid && (
              <button
                onClick={async () => {
                  await onKillHostProcess(selectedPid, true);
                  setSelectedPid(null);
                  fetchProcs();
                }}
                className="px-3 py-1.5 rounded-lg bg-[var(--luma-accent)] text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Square className="w-3 h-3" /> Снять задачу ({selectedPid})
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {tab === 'processes' && (
            <>
              {/* 1. OPEN APPLICATIONS (LUMA + REAL OS WINDOWS) */}
              <section className="space-y-2">
                <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>
                  Открытые приложения и окна ({openLumaWindows.length + runningApps.length + hostWindows.length})
                </div>
                <div className={`rounded-xl border divide-y overflow-hidden ${surfaceCls} ${isDark ? 'divide-white/[0.06]' : 'divide-zinc-900/[0.08]'}`}>
                  {openLumaWindows.map((win) => (
                    <div key={`lwin_${win.id}`} className="px-3.5 py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AppWindow className="w-4 h-4 text-[var(--luma-accent)] shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{win.label}</div>
                          <div className={`text-[10px] font-mono ${mutedCls}`}>
                            Окно Luma OS · {win.minimized ? 'Свёрнуто' : 'Активно'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => onFocusLumaWindow(win.id)} className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${btnCls}`}>
                          Перейти
                        </button>
                        <button
                          onClick={() => onCloseLumaWindow(win.id)}
                          className="px-2 py-1 rounded-lg border border-[var(--luma-accent-border)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] text-[11px] font-semibold cursor-pointer"
                        >
                          Снять задачу
                        </button>
                      </div>
                    </div>
                  ))}

                  {runningApps.map((app) => (
                    <div key={`lapp_${app.id}`} className="px-3.5 py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)] shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{app.name}</div>
                          <div className={`text-[10px] font-mono ${mutedCls}`}>
                            Приложение Luma · сессия {formatLiveClock(app.elapsedSeconds)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => onFocusLumaApp(app)} className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${btnCls}`}>
                          Открыть
                        </button>
                        <button
                          onClick={() => onStopLumaApp(app.id)}
                          className="px-2 py-1 rounded-lg border border-[var(--luma-accent-border)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] text-[11px] font-semibold cursor-pointer"
                        >
                          Снять задачу
                        </button>
                      </div>
                    </div>
                  ))}

                  {hostWindows.map((hw) => (
                    <div key={`hwin_${hw.pid}`} className="px-3.5 py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ExternalLink className="w-4 h-4 text-sky-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{hw.title || hw.name}</div>
                          <div className={`text-[10px] font-mono ${mutedCls}`}>
                            Приложение ОС ({hw.name}) · PID {hw.pid} · {hw.mem_mb.toFixed(0)} МБ
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => onFocusHostWindow(hw.pid)} className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${btnCls}`}>
                          Фокус
                        </button>
                        <button
                          onClick={async () => {
                            await onKillHostProcess(hw.pid, false);
                            fetchProcs();
                          }}
                          className="px-2 py-1 rounded-lg border border-[var(--luma-accent-border)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] text-[11px] font-semibold cursor-pointer"
                        >
                          Снять задачу
                        </button>
                      </div>
                    </div>
                  ))}

                  {openLumaWindows.length === 0 && runningApps.length === 0 && hostWindows.length === 0 && (
                    <div className={`py-4 text-center font-mono ${mutedCls}`}>Нет активных пользовательских приложений</div>
                  )}
                </div>
              </section>

              {/* 2. LUMA OS CORE SYSTEM PROCESSES */}
              <section className="space-y-2">
                <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>
                  Процессы системы Luma OS ({lumaCoreServices.length})
                </div>
                <div className={`rounded-xl border divide-y overflow-hidden ${surfaceCls} ${isDark ? 'divide-white/[0.06]' : 'divide-zinc-900/[0.08]'}`}>
                  {lumaCoreServices.map((svc) => (
                    <div key={svc.name} className="px-3.5 py-2 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6 flex items-center gap-2 min-w-0">
                        <Cpu className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{svc.name}</div>
                          <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{svc.detail}</div>
                        </div>
                      </div>
                      <div className="col-span-2 font-mono text-[11px] text-emerald-500 font-semibold">{svc.status}</div>
                      <div className={`col-span-2 font-mono text-[11px] ${mutedCls}`}>PID {svc.pid}</div>
                      <div className="col-span-2 font-mono text-[11px] text-right">{svc.mem}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 3. REAL OS BACKGROUND PROCESSES */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono uppercase tracking-[0.14em] ${mutedCls}`}>
                    Процессы операционной системы ({filteredProcs.length})
                  </span>
                  <div className={`flex items-center gap-1 p-0.5 rounded-lg border text-[10px] font-mono ${btnCls}`}>
                    {(
                      [
                        ['mem', 'ОЗУ'],
                        ['cpu', 'CPU'],
                        ['name', 'Имя'],
                        ['pid', 'PID'],
                      ] as const
                    ).map(([k, l]) => (
                      <button
                        key={k}
                        onClick={() => setSortBy(k)}
                        className={`px-2 py-0.5 rounded cursor-pointer ${sortBy === k ? 'bg-[var(--luma-accent)] text-white font-bold' : ''}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`rounded-xl border overflow-hidden ${surfaceCls}`}>
                  <div className={`grid grid-cols-12 gap-2 px-3.5 py-2 border-b text-[10px] font-mono uppercase ${isDark ? 'border-white/10' : 'border-zinc-900/10'} ${mutedCls}`}>
                    <span className="col-span-5">Процесс</span>
                    <span className="col-span-2">PID</span>
                    <span className="col-span-2">CPU</span>
                    <span className="col-span-2 text-right">Память</span>
                    <span className="col-span-1 text-right">Действ.</span>
                  </div>
                  <div className={`divide-y max-h-64 overflow-y-auto ${isDark ? 'divide-white/[0.05]' : 'divide-zinc-900/[0.07]'}`}>
                    {filteredProcs.map((p) => {
                      const sel = selectedPid === p.pid;
                      return (
                        <div
                          key={p.pid}
                          onClick={() => setSelectedPid(p.pid)}
                          className={`grid grid-cols-12 gap-2 px-3.5 py-1.5 items-center cursor-pointer transition ${
                            sel
                              ? 'bg-[var(--luma-accent-soft)]'
                              : isDark
                              ? 'hover:bg-white/[0.04]'
                              : 'hover:bg-zinc-900/[0.04]'
                          }`}
                        >
                          <div className="col-span-5 min-w-0">
                            <div className="font-medium truncate flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.is_self && (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] text-[9px] font-mono font-bold">
                                  LUMA
                                </span>
                              )}
                            </div>
                            {p.title && p.title !== p.name && (
                              <div className={`text-[10px] truncate ${mutedCls}`}>{p.title}</div>
                            )}
                          </div>
                          <div className={`col-span-2 font-mono text-[11px] ${mutedCls}`}>{p.pid}</div>
                          <div className="col-span-2 font-mono text-[11px]">{p.cpu_pct.toFixed(1)}</div>
                          <div className="col-span-2 font-mono text-[11px] text-right">{p.mem_mb.toFixed(1)} МБ</div>
                          <div className="col-span-1 flex justify-end">
                            {!p.is_self && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await onKillHostProcess(p.pid, true);
                                  fetchProcs();
                                }}
                                title="Снять задачу"
                                className="p-1 rounded hover:bg-[var(--luma-accent-soft)] text-zinc-500 hover:text-[var(--luma-accent)] cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'performance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={`p-4 rounded-xl border space-y-2 ${surfaceCls}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-2"><Cpu className="w-4 h-4 text-[var(--luma-accent)]" /> Процессор</span>
                  <span className="text-lg font-mono font-extrabold text-[var(--luma-accent)]">{cpuLoad}%</span>
                </div>
                <div className={`text-[11px] font-mono truncate ${mutedCls}`}>
                  {liveSystem?.cpu_model || 'CPU'} · {liveSystem?.cpu_cores || 0} потоков
                </div>
                <MiniAreaGraph values={cpuHist} max={100} />
              </div>

              <div className={`p-4 rounded-xl border space-y-2 ${surfaceCls}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-[var(--luma-accent)]" /> Оперативная память</span>
                  <span className="text-lg font-mono font-extrabold text-[var(--luma-accent)]">{ramLoad}%</span>
                </div>
                <div className={`text-[11px] font-mono ${mutedCls}`}>
                  {liveSystem ? `${liveSystem.ram_used_gb.toFixed(1)} / ${liveSystem.ram_total_gb.toFixed(1)} ГБ` : '—'}
                </div>
                <MiniAreaGraph values={ramHist} max={100} />
              </div>

              <div className={`p-4 rounded-xl border space-y-2 ${surfaceCls}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-2"><Wifi className="w-4 h-4 text-[var(--luma-accent)]" /> Сеть</span>
                  <span className="font-mono font-bold text-[var(--luma-accent)]">
                    ↓ {(liveSystem?.net_down_mbps || 0).toFixed(1)} · ↑ {(liveSystem?.net_up_mbps || 0).toFixed(1)} Мбит/с
                  </span>
                </div>
                <MiniAreaGraph values={netHist} max={Math.max(10, ...netHist)} />
              </div>

              <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
                <div className="font-bold flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[var(--luma-accent)]" /> Накопители
                </div>
                {(liveSystem?.disks || []).map((d) => (
                  <div key={d.mount} className="space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span>{d.mount} ({d.label})</span>
                      <span>{d.used_gb.toFixed(1)} / {d.total_gb.toFixed(0)} ГБ ({d.percent}%)</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-zinc-900/15'}`}>
                      <div className="h-full bg-[var(--luma-accent)]" style={{ width: `${d.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'services' && (
            <div className="space-y-3">
              {[
                {
                  title: 'Служба Luma Island',
                  sub: 'Плавающая капсула медиа, буфера обмена и таймера',
                  active: dynamicIslandEnabled,
                  action: onToggleIsland,
                  btn: dynamicIslandEnabled ? 'Остановить' : 'Запустить',
                },
                {
                  title: 'Служба синхронизации буфера ОС',
                  sub: 'Фоновый захват буфера обмена Windows в Luma Island',
                  active: islandAutoClipboard,
                  action: onToggleAutoClip,
                  btn: islandAutoClipboard ? 'Выключить' : 'Включить',
                },
              ].map((s) => (
                <div key={s.title} className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${surfaceCls}`}>
                  <div>
                    <div className="font-bold">{s.title}</div>
                    <div className={`text-[11px] ${mutedCls}`}>{s.sub}</div>
                  </div>
                  <button
                    onClick={s.action}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                      s.active ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                    }`}
                  >
                    {s.btn}
                  </button>
                </div>
              ))}

              <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${surfaceCls}`}>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[var(--luma-accent)]" />
                  <div>
                    <div className="font-bold">LumaGuard AES-256-GCM</div>
                    <div className={`text-[11px] ${mutedCls}`}>Принудительная ротация криптографического ключа шины IPC</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onRotateKey();
                    onPushToast('LumaGuard', 'Ключ шифрования обновлён', 'success');
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${btnCls}`}
                >
                  Ротация ключа
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
