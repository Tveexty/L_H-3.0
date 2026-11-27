import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bluetooth,
  CheckCircle2,
  Clipboard,
  Cpu,
  Headphones,
  Laptop,
  Monitor,
  Radio,
  RefreshCw,
  ScanSearch,
  Send,
  Smartphone,
  Sparkles,
  Volume2,
  Wifi,
} from 'lucide-react';
import { LumaMiracastPanel } from './LumaMiracastPanel';

export interface SuperDeviceNode {
  id: string;
  kind: 'phone' | 'audio' | 'bluetooth' | 'display' | 'gamepad' | 'ai' | string;
  name: string;
  subtitle: string;
  connected: boolean;
  battery: number;
  address?: string;
  action_hint: string;
  accent_color: string;
}

interface SuperDeviceSnapshot {
  ok: boolean;
  host_name: string;
  edition: string;
  is_pro: boolean;
  pair_url: string;
  pin: string;
  nodes: SuperDeviceNode[];
  updated_at: string;
}

interface LumaSuperDeviceWindowProps {
  isDark: boolean;
  isPro?: boolean;
  onOpenWindow: (winId: string) => void;
  onOpenLens?: () => void;
  onOpenClipboard?: () => void;
  onPushToast: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
}

function playSuperDeviceSnapChime(connected: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const freqs = connected ? [440, 659.25, 880, 1174.66] : [587.33, 440];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.055);
      gain.gain.setValueAtTime(0.0001, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.05 / (i + 1), now + i * 0.055 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.055 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.5);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    // ignore
  }
}

export const LumaSuperDeviceWindow: React.FC<LumaSuperDeviceWindowProps> = ({
  isDark,
  isPro = true,
  onOpenWindow,
  onOpenLens,
  onOpenClipboard,
  onPushToast,
}) => {
  const [data, setData] = useState<SuperDeviceSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapHover, setSnapHover] = useState(false);
  const [pulseWave, setPulseWave] = useState(0);
  const [selectedNode, setSelectedNode] = useState<SuperDeviceNode | null>(null);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number; baseX: number; baseY: number }>({ x: 0, y: 0, baseX: 0, baseY: 0 });

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/kernel/superdevice/status');
      if (r.ok) {
        const d = await r.json();
        if (d?.ok) setData(d);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
    const id = window.setInterval(() => void loadSnapshot(), 6000);
    return () => window.clearInterval(id);
  }, [loadSnapshot]);

  const connectNode = async (node: SuperDeviceNode) => {
    playSuperDeviceSnapChime(true);
    setPulseWave((p) => p + 1);
    setSelectedNode(node);

    try {
      const r = await fetch('/api/kernel/superdevice/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: node.id,
          kind: node.kind,
          address: node.address || '',
          name: node.name,
          action: 'connect',
        }),
      });
      const res = await r.json();
      if (res?.ok) {
        if (res.status) setData(res.status);
        onPushToast('Суперустройство', res.message || `Подключено: ${node.name}`, 'success');
      }
    } catch {
      // continue to UI action
    }

    if (node.kind === 'phone') {
      onOpenWindow('oxygen_connect');
    } else if (node.kind === 'display') {
      onOpenWindow('window_rules');
    } else if (node.kind === 'ai') {
      onOpenWindow('ai');
    }
  };

  const sendFileQuick = async () => {
    try {
      const r = await fetch('/api/kernel/pick-file?mode=file');
      if (!r.ok) return;
      const d = await r.json();
      if ((!d?.picked && !d?.ok) || !d?.path) return;
      const sr = await fetch('/api/kernel/oxygen-connect/send-to-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: d.path }),
      });
      if (sr.ok) {
        onPushToast('Суперустройство', 'Файл отправлен с полноэкранной волной Стиль ОС!', 'success');
      }
    } catch {
      onPushToast('Суперустройство', 'Откройте Oxygen Connect для отправки файла', 'info');
    }
  };

  const nodes = data?.nodes || [];
  const connectedCount = nodes.filter((n) => n.connected).length;

  const getNodeIcon = (kind: string) => {
    switch (kind) {
      case 'phone':
        return <Smartphone className="w-5 h-5" />;
      case 'audio':
        return <Volume2 className="w-5 h-5" />;
      case 'bluetooth':
        return <Headphones className="w-5 h-5" />;
      case 'display':
        return <Monitor className="w-5 h-5" />;
      case 'ai':
        return <Cpu className="w-5 h-5" />;
      default:
        return <Radio className="w-5 h-5" />;
    }
  };

  const cardCls = isDark
    ? 'bg-white/[0.06] border-white/12 text-white'
    : 'bg-white/90 border-slate-200 text-slate-900';
  const muted = isDark ? 'text-white/60' : 'text-slate-500';

  return (
    <div className={`h-full overflow-y-auto p-4 sm:p-5 space-y-4 select-none ${isDark ? 'bg-[#080d18] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Стиль ОС SuperDevice Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/35 text-blue-300 text-[10px] font-mono font-bold uppercase tracking-wider">
            <Radio className="w-3 h-3 animate-pulse" /> Экосистема Суперустройство · {isPro ? 'PRO' : 'BASE'}
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1">
            Суперустройство Luma OS 1.8.2
          </h2>
          <p className={`text-xs ${muted}`}>
            Перетащите любой пузырёк устройства к центральному ПК (или нажмите на него), чтобы мгновенно объединить их в единую экосистему.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-xs font-mono font-bold">
            Активно: {connectedCount} / {nodes.length}
          </span>
          <button
            onClick={() => void loadSnapshot()}
            className={`px-3 py-1.5 rounded-2xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${cardCls}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Обновить
          </button>
        </div>
      </div>

      {/* Interactive HarmonyOS Orbital SuperDevice Radar */}
      <div
        ref={arenaRef}
        className="relative h-[370px] rounded-[32px] border border-blue-400/25 overflow-hidden flex items-center justify-center"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 50% 50%, rgba(37,99,235,0.28) 0%, rgba(15,23,42,0.92) 56%, rgba(6,10,20,0.98) 100%)'
            : 'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.18) 0%, rgba(241,245,249,0.95) 65%, rgba(226,232,240,0.98) 100%)',
        }}
      >
        {/* Concentric HarmonyOS Radar Orbits */}
        <div className="pointer-events-none absolute w-[190px] h-[190px] rounded-full border border-blue-400/25" />
        <div className="pointer-events-none absolute w-[305px] h-[305px] rounded-full border border-dashed border-sky-400/20" />
        <div className="pointer-events-none absolute w-[430px] h-[430px] rounded-full border border-white/[0.06]" />

        {/* Snap Energy Pulse Ring */}
        {pulseWave > 0 && (
          <div
            key={pulseWave}
            className="pointer-events-none absolute w-32 h-32 rounded-full border-2 border-sky-400 animate-ping opacity-50"
          />
        )}

        {/* Central PC Sphere */}
        <div
          className={`relative z-20 w-32 h-32 rounded-full flex flex-col items-center justify-center text-center p-3 transition-transform duration-300 ${
            snapHover
              ? 'scale-115 shadow-[0_0_60px_rgba(56,189,248,0.8)] ring-4 ring-sky-400/70'
              : 'shadow-[0_0_45px_rgba(37,99,235,0.55)] ring-2 ring-blue-400/50'
          }`}
          style={{
            background: 'linear-gradient(145deg, #2563eb 0%, #0ea5e9 55%, #1d4ed8 100%)',
          }}
        >
          <Laptop className="w-8 h-8 text-white mb-1 drop-shadow" />
          <div className="text-xs font-black text-white leading-tight truncate max-w-[100px]">
            {data?.host_name || 'Этот ПК'}
          </div>
          <div className="text-[9px] font-mono text-white/85 uppercase mt-0.5">
            {isPro ? 'Luma PRO' : 'Luma BASE'}
          </div>
        </div>

        {/* Orbiting Device Bubbles (Draggable to center PC sphere!) */}
        {nodes.map((node, idx) => {
          const angle = (idx / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
          const rx = node.connected ? 116 : 152;
          const ry = node.connected ? 105 : 132;
          const baseX = Math.cos(angle) * rx;
          const baseY = Math.sin(angle) * ry;
          const isDrag = draggingId === node.id;
          const curX = isDrag ? baseX + dragOffset.x : baseX;
          const curY = isDrag ? baseY + dragOffset.y : baseY;

          return (
            <React.Fragment key={node.id}>
              {/* Glowing tether line for connected devices */}
              {node.connected && (
                <svg
                  className="pointer-events-none absolute inset-0 w-full h-full z-10"
                  viewBox="-260 -185 520 370"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <line
                    x1={0}
                    y1={0}
                    x2={curX}
                    y2={curY}
                    stroke={node.accent_color || '#38bdf8'}
                    strokeWidth="2.5"
                    strokeDasharray="6 5"
                    strokeOpacity="0.7"
                  />
                </svg>
              )}

              <div
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDraggingId(node.id);
                  setDragOffset({ x: 0, y: 0 });
                  dragOriginRef.current = { x: e.clientX, y: e.clientY, baseX, baseY };
                }}
                onPointerMove={(e) => {
                  if (draggingId !== node.id) return;
                  const dx = e.clientX - dragOriginRef.current.x;
                  const dy = e.clientY - dragOriginRef.current.y;
                  setDragOffset({ x: dx, y: dy });
                  const dist = Math.hypot(dragOriginRef.current.baseX + dx, dragOriginRef.current.baseY + dy);
                  setSnapHover(dist < 92);
                }}
                onPointerUp={(e) => {
                  if (draggingId !== node.id) return;
                  const dx = e.clientX - dragOriginRef.current.x;
                  const dy = e.clientY - dragOriginRef.current.y;
                  const moved = Math.hypot(dx, dy);
                  const dist = Math.hypot(dragOriginRef.current.baseX + dx, dragOriginRef.current.baseY + dy);
                  setDraggingId(null);
                  setDragOffset({ x: 0, y: 0 });
                  setSnapHover(false);
                  if (moved < 8 || dist < 95) {
                    void connectNode(node);
                  }
                }}
                style={{
                  transform: `translate(${curX}px, ${curY}px)`,
                  transition: isDrag ? 'none' : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
                  touchAction: 'none',
                }}
                className={`absolute z-30 cursor-grab active:cursor-grabbing flex flex-col items-center group`}
                title={`${node.name} · Перетащите к центру или нажмите`}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-xl transition ${
                    node.connected
                      ? 'bg-blue-600 border-sky-300 text-white shadow-blue-500/45 scale-105'
                      : isDark
                      ? 'bg-[#1a2234]/90 border-white/20 text-white/85 hover:border-sky-400/60'
                      : 'bg-white border-slate-300 text-slate-800 hover:border-blue-400'
                  }`}
                >
                  {getNodeIcon(node.kind)}
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur text-[10px] font-bold text-white max-w-[118px] truncate border border-white/10">
                  {node.name}
                </div>
                {node.battery >= 0 && (
                  <div className="text-[9px] font-mono font-bold text-emerald-300">
                    🔋 {node.battery}%
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Selected Node Action Card */}
      {selectedNode && (
        <div className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${cardCls}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              {getNodeIcon(selectedNode.kind)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black flex items-center gap-1.5">
                <span className="truncate">{selectedNode.name}</span>
                {selectedNode.connected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </div>
              <div className={`text-[11px] truncate ${muted}`}>{selectedNode.subtitle}</div>
            </div>
          </div>
          <button
            onClick={() => void connectNode(selectedNode)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
          >
            {selectedNode.action_hint}
          </button>
        </div>
      )}

      {/* Quick Ecosystem SuperHub Bridges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => void sendFileQuick()}
          className={`p-3 rounded-2xl border text-left space-y-1.5 cursor-pointer hover:border-sky-400/50 transition ${cardCls}`}
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
            <Send className="w-4 h-4" />
          </div>
          <div className="text-xs font-black">Luma Share</div>
          <div className={`text-[10px] ${muted}`}>Файл на телефон с волной</div>
        </button>

        <button
          onClick={() => onOpenWindow('oxygen_connect')}
          className={`p-3 rounded-2xl border text-left space-y-1.5 cursor-pointer hover:border-sky-400/50 transition ${cardCls}`}
        >
          <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="text-xs font-black">QR · Телефон</div>
          <div className={`text-[10px] font-mono ${muted}`}>PIN: {data?.pin || '••••••'}</div>
        </button>

        <button
          onClick={() => onOpenClipboard?.()}
          className={`p-3 rounded-2xl border text-left space-y-1.5 cursor-pointer hover:border-sky-400/50 transition ${cardCls}`}
        >
          <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center">
            <Clipboard className="w-4 h-4" />
          </div>
          <div className="text-xs font-black">Общий буфер</div>
          <div className={`text-[10px] ${muted}`}>ПК ↔ Смартфон + OCR</div>
        </button>

        <button
          onClick={() => onOpenLens?.()}
          className={`p-3 rounded-2xl border text-left space-y-1.5 cursor-pointer hover:border-sky-400/50 transition ${cardCls}`}
        >
          <div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center">
            <ScanSearch className="w-4 h-4" />
          </div>
          <div className="text-xs font-black">Circle to Search</div>
          <div className={`text-[10px] ${muted}`}>Визуальный поиск AI</div>
        </button>
      </div>

      {/* Wireless Second Screen (Miracast) in SuperDevice Ecosystem */}
      <LumaMiracastPanel
        mode="compact"
        onNotify={(msg) => onPushToast('2-й экран (Miracast)', msg, 'info')}
      />

      {/* Connected Hardware Directory */}
      <div className={`p-3.5 rounded-2xl border space-y-2 ${cardCls}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-black flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Все узлы экосистемы
          </span>
          <span className={`text-[10px] font-mono ${muted}`}>
            <Bluetooth className="w-3 h-3 inline mr-1" />
            Обновлено: {data?.updated_at || '—'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {nodes.map((n) => (
            <button
              key={`list_${n.id}`}
              onClick={() => void connectNode(n)}
              className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left cursor-pointer transition ${
                n.connected
                  ? 'bg-blue-500/15 border-blue-400/40'
                  : isDark
                  ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.connected ? 'bg-blue-600 text-white' : 'bg-white/10'}`}>
                {getNodeIcon(n.kind)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">{n.name}</div>
                <div className={`text-[10px] truncate ${muted}`}>{n.subtitle}</div>
              </div>
              <span className={`text-[10px] font-mono font-bold ${n.connected ? 'text-emerald-400' : muted}`}>
                {n.connected ? 'ON' : 'Подкл.'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
