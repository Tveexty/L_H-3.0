import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Bug,
  Cpu,
  Crosshair,
  Pause,
  Play,
  RefreshCw,
  Shield,
  ShieldAlert,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';

export interface DevRequestLogItem {
  id: number;
  time: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
}

export interface DevMetricsData {
  ok: boolean;
  kernel_version: string;
  kernel_codename: string;
  kernel_engine_version: string;
  security_core_version: string;
  goroutines: number;
  heap_alloc_mb: number;
  heap_sys_mb: number;
  sys_mb: number;
  gc_cycles: number;
  last_gc_pause_us: number;
  ipc_requests_total: number;
  http_requests_total: number;
  uptime_sec: number;
  active_routes_count: number;
  is_admin: boolean;
  integrity_level: string;
  pid: number;
  platform: string;
  recent_ipc_logs: DevRequestLogItem[];
}

interface LumaDevHudOverlayProps {
  enabled: boolean;
  isDark: boolean;
  onClose: () => void;
  onElevateAdmin: () => void;
  onPushToast: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
}

interface InspectedDomInfo {
  tag: string;
  id: string;
  classes: string;
  rect: { x: number; y: number; w: number; h: number };
  zIndex: string;
  selector: string;
}

export const LumaDevHudOverlay: React.FC<LumaDevHudOverlayProps> = ({
  enabled,
  isDark,
  onClose,
  onElevateAdmin,
  onPushToast,
}) => {
  const [fps, setFps] = useState(60);
  const [frameMs, setFrameMs] = useState(16.6);
  const [fpsHistory, setFpsHistory] = useState<number[]>(() => Array(24).fill(60));
  const [jsHeapMB, setJsHeapMB] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<DevMetricsData | null>(null);
  const [tab, setTab] = useState<'hud' | 'ipc' | 'inspector'>('hud');
  const [paused, setPaused] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [hoveredDom, setHoveredDom] = useState<InspectedDomInfo | null>(null);
  const [pinnedDom, setPinnedDom] = useState<InspectedDomInfo | null>(null);
  const [pos, setPos] = useState({ x: 16, y: 58 });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  // Live 60 FPS requestAnimationFrame meter + JS heap memory reader
  useEffect(() => {
    if (!enabled) return;
    let rafId = 0;
    let frames = 0;
    let lastTime = performance.now();
    let lastFrame = lastTime;

    const tick = (now: number) => {
      frames++;
      const dt = now - lastFrame;
      lastFrame = now;
      if (now - lastTime >= 500) {
        const curFps = Math.min(240, Math.round((frames * 1000) / (now - lastTime)));
        setFps(curFps);
        setFrameMs(Math.round(dt * 10) / 10);
        setFpsHistory((prev) => [...prev.slice(-23), curFps]);
        const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        if (perfMem && typeof perfMem.usedJSHeapSize === 'number') {
          setJsHeapMB(Math.round((perfMem.usedJSHeapSize / (1024 * 1024)) * 10) / 10);
        }
        frames = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled]);

  // Poll Go Kernel Dev Metrics every 1.2s while HUD is open & unpaused
  useEffect(() => {
    if (!enabled || paused) return;
    const poll = async () => {
      try {
        const r = await fetch('/api/kernel/dev/metrics');
        if (r.ok) {
          const d = (await r.json()) as DevMetricsData;
          if (d?.ok) setMetrics(d);
        }
      } catch {
        /* offline */
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 1200);
    return () => window.clearInterval(id);
  }, [enabled, paused]);

  // Interactive DOM Element Inspector overlay
  useEffect(() => {
    if (!enabled || !inspecting) {
      setHoveredDom(null);
      return;
    }
    const buildInfo = (el: HTMLElement): InspectedDomInfo => {
      const rc = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 5).join('.') : '';
      const sel = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}`;
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || '—',
        classes: typeof el.className === 'string' ? el.className : '',
        rect: { x: Math.round(rc.left), y: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height) },
        zIndex: cs.zIndex,
        selector: sel,
      };
    };
    const onMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest('[data-luma-dev-hud="1"]')) return;
      setHoveredDom(buildInfo(target));
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest('[data-luma-dev-hud="1"]')) return;
      e.preventDefault();
      e.stopPropagation();
      const info = buildInfo(target);
      setPinnedDom(info);
      setInspecting(false);
      setTab('inspector');
      onPushToast('Dev Инспектор', `Выбран элемент <${info.tag}> (${info.rect.w}×${info.rect.h}px)`, 'info');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspecting(false);
    };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [enabled, inspecting, onPushToast]);

  // HUD Dragging
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - 360, dragRef.current.ox + dx)),
        y: Math.max(8, Math.min(window.innerHeight - 160, dragRef.current.oy + dy)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  if (!enabled) return null;

  const triggerGC = async () => {
    try {
      const r = await fetch('/api/kernel/diagnostics?gc=1');
      if (r.ok) {
        onPushToast('LumaCore 1.5.0 GC', 'Сборка мусора ядра выполнена мгновенно', 'success');
      }
    } catch {
      /* ignore */
    }
  };

  const activeDom = hoveredDom || pinnedDom;

  return (
    <>
      {/* Live DOM Highlighter Bounding Box */}
      {inspecting && hoveredDom && (
        <div
          style={{
            position: 'fixed',
            left: hoveredDom.rect.x,
            top: hoveredDom.rect.y,
            width: hoveredDom.rect.w,
            height: hoveredDom.rect.h,
            zIndex: 9998,
          }}
          className="pointer-events-none border-2 border-cyan-400 bg-cyan-400/15 rounded transition-all duration-75"
        >
          <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-cyan-500 text-black font-mono text-[9px] font-bold whitespace-nowrap shadow">
            &lt;{hoveredDom.tag}&gt; {hoveredDom.rect.w}×{hoveredDom.rect.h} · z:{hoveredDom.zIndex}
          </span>
        </div>
      )}

      {/* Draggable Live Developer HUD Panel */}
      <div
        data-luma-dev-hud="1"
        style={{ left: pos.x, top: pos.y }}
        className={`fixed z-[9600] w-[360px] rounded-2xl border shadow-2xl backdrop-blur-2xl select-none overflow-hidden font-mono text-[11px] ${
          isDark
            ? 'bg-[#070b14]/92 border-cyan-400/30 text-slate-100'
            : 'bg-slate-950/90 border-cyan-500/40 text-slate-100'
        }`}
      >
        {/* Drag Header */}
        <div
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
          }}
          className="px-3 py-2 border-b border-white/10 bg-cyan-500/10 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Bug className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-bold text-cyan-300 truncate">DEV HUD · LumaCore 1.5.0</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                metrics?.is_admin
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
              }`}
            >
              {metrics?.is_admin ? 'ADMIN' : 'USER'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setInspecting((v) => !v)}
              title="Инспектор элементов DOM (наведите и кликните)"
              className={`p-1 rounded-lg transition cursor-pointer ${
                inspecting ? 'bg-cyan-400 text-black' : 'hover:bg-white/10 text-cyan-300'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPaused((v) => !v)}
              title={paused ? 'Возобновить опрос' : 'Пауза'}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
            >
              {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
            <button
              onClick={onClose}
              title="Скрыть Dev HUD (Ctrl+Shift+D)"
              className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="px-2 pt-1.5 flex items-center gap-1 border-b border-white/10 pb-1.5">
          {(
            [
              ['hud', 'FPS / RAM', <Activity className="w-3 h-3" />],
              ['ipc', `IPC (${metrics?.http_requests_total ?? 0})`, <Terminal className="w-3 h-3" />],
              ['inspector', 'Инспектор', <Crosshair className="w-3 h-3" />],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                tab === id ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Live FPS / RAM / Kernel Telemetry */}
        {tab === 'hud' && (
          <div className="p-3 space-y-2.5">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[9px] text-slate-400">FPS LIVE</div>
                <div className={`text-lg font-black ${fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {fps}
                </div>
                <div className="text-[9px] text-slate-400">{frameMs} ms/f</div>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[9px] text-slate-400">GO HEAP</div>
                <div className="text-base font-black text-cyan-300">{metrics ? `${metrics.heap_alloc_mb}M` : '—'}</div>
                <div className="text-[9px] text-slate-400">
                  {jsHeapMB !== null ? `JS ${jsHeapMB}M` : `Sys ${metrics?.sys_mb ?? 0}M`}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[9px] text-slate-400">GOROUTINES</div>
                <div className="text-base font-black text-violet-300">{metrics?.goroutines ?? '—'}</div>
                <div className="text-[9px] text-slate-400">GC #{metrics?.gc_cycles ?? 0}</div>
              </div>
            </div>

            {/* Live FPS Sparkline */}
            <div className="h-9 px-2 py-1 rounded-xl bg-black/40 border border-white/10 flex items-end gap-[2px]">
              {fpsHistory.map((v, i) => (
                <div
                  key={i}
                  style={{ height: `${Math.max(12, Math.min(100, (v / 65) * 100))}%` }}
                  className={`flex-1 rounded-t-xs ${v >= 55 ? 'bg-emerald-400/80' : v >= 30 ? 'bg-amber-400/80' : 'bg-rose-400/80'}`}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-300">
              <div className="px-2 py-1 rounded-lg bg-white/5 flex justify-between">
                <span className="text-slate-400">Kernel:</span>
                <span className="text-cyan-300 font-bold">{metrics?.kernel_version || '1.6.0'}</span>
              </div>
              <div className="px-2 py-1 rounded-lg bg-white/5 flex justify-between">
                <span className="text-slate-400">PID:</span>
                <span>{metrics?.pid || '—'}</span>
              </div>
              <div className="px-2 py-1 rounded-lg bg-white/5 flex justify-between">
                <span className="text-slate-400">RPC/HTTP:</span>
                <span>
                  {metrics?.ipc_requests_total ?? 0}/{metrics?.http_requests_total ?? 0}
                </span>
              </div>
              <div className="px-2 py-1 rounded-lg bg-white/5 flex justify-between">
                <span className="text-slate-400">Права:</span>
                <span className={metrics?.is_admin ? 'text-emerald-400' : 'text-amber-300'}>
                  {metrics?.integrity_level || 'Medium'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={triggerGC}
                className="flex-1 py-1.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-cyan-300" />
                Очистить GC
              </button>
              {!metrics?.is_admin && (
                <button
                  onClick={onElevateAdmin}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/35 text-amber-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="w-3 h-3" />
                  Запуск Admin (UAC)
                </button>
              )}
              {metrics?.is_admin && (
                <div className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  UAC High
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Live IPC / HTTP Requests Stream */}
        {tab === 'ipc' && (
          <div className="p-2.5 space-y-1.5 max-h-64 overflow-y-auto">
            {(metrics?.recent_ipc_logs || []).length === 0 ? (
              <div className="py-6 text-center text-slate-400">Ожидание HTTP/IPC запросов...</div>
            ) : (
              (metrics?.recent_ipc_logs || []).slice(0, 20).map((log) => (
                <div key={log.id} className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`px-1 rounded text-[9px] font-bold shrink-0 ${
                        log.method === 'POST' ? 'bg-violet-500/30 text-violet-200' : 'bg-sky-500/25 text-sky-200'
                      }`}
                    >
                      {log.method}
                    </span>
                    <span className="truncate text-slate-200">{log.path.replace('/api/kernel/', '')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={log.status < 400 ? 'text-emerald-400' : 'text-rose-400'}>{log.status}</span>
                    <span className="text-slate-400">{log.duration_ms}ms</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Interactive Element Inspector */}
        {tab === 'inspector' && (
          <div className="p-3 space-y-2.5">
            <button
              onClick={() => setInspecting((v) => !v)}
              className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
                inspecting ? 'bg-cyan-400 text-black' : 'bg-cyan-500/20 border border-cyan-400/35 text-cyan-200 hover:bg-cyan-500/30'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              {inspecting ? 'Кликните по элементу интерфейса (Esc — отмена)' : 'Включить инспектор элементов DOM'}
            </button>
            {activeDom ? (
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold">&lt;{activeDom.tag}&gt;</span>
                  <span className="text-emerald-300">
                    {activeDom.rect.w} × {activeDom.rect.h} px
                  </span>
                </div>
                <div className="text-slate-400">
                  Pos: ({activeDom.rect.x}, {activeDom.rect.y}) · z-index: {activeDom.zIndex}
                </div>
                <div className="p-1.5 rounded bg-black/50 text-slate-300 break-all select-text max-h-20 overflow-y-auto">
                  {activeDom.selector}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      void navigator.clipboard?.writeText(activeDom.selector);
                      onPushToast('Инспектор', 'Селектор скопирован в буфер', 'success');
                    }}
                    className="flex-1 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold cursor-pointer"
                  >
                    Копировать селектор
                  </button>
                  <button
                    onClick={() => setPinnedDom(null)}
                    className="p-1 rounded-lg bg-white/10 hover:bg-rose-500/20 text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-5 text-center text-slate-400 text-[10px] flex flex-col items-center gap-1">
                <Cpu className="w-5 h-5 opacity-40" />
                Нажмите кнопку выше и наведите на любой виджет, окно или панель
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
