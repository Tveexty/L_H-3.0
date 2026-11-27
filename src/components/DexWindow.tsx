import React, { useEffect, useRef, useState } from 'react';
import { Columns2, Maximize2, Minimize2, Minus, MoreHorizontal, Pin, X } from 'lucide-react';

export type TaskbarPosition = 'bottom' | 'left' | 'right' | 'top';
export type DesignStyle = 'matrix' | 'glass' | 'nova';
export type WindowControlsStyle = 'classic' | 'dots3' | 'menu3';

export type SnapZone =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'tl'
  | 'tr'
  | 'bl'
  | 'br'
  | 'left23'
  | 'right13'
  | 'center'
  | 'maximize';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface DexWindowProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  isDark: boolean;
  designStyle?: DesignStyle;
  windowControlsStyle?: WindowControlsStyle;
  taskbarPosition?: TaskbarPosition;
  taskbarSizePx?: number;
  topBarOffsetPx?: number;
  zIndex: number;
  alwaysOnTop?: boolean;
  onToggleAlwaysOnTop?: () => void;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
  minWidth?: number;
  minHeight?: number;
  defaultMaximized?: boolean;
  snapCommand?: { zone: SnapZone; seq: number } | null;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

interface WinRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const DexWindow: React.FC<DexWindowProps> = React.memo(({
  id,
  title,
  subtitle,
  icon,
  isDark,
  designStyle = 'matrix',
  windowControlsStyle = 'classic',
  taskbarPosition = 'bottom',
  taskbarSizePx = 56,
  topBarOffsetPx = 0,
  zIndex,
  alwaysOnTop = false,
  onToggleAlwaysOnTop,
  initialWidth = 980,
  initialHeight = 640,
  initialX,
  initialY,
  minWidth = 360,
  minHeight = 280,
  defaultMaximized = false,
  snapCommand = null,
  onFocus,
  onMinimize,
  onClose,
  children,
}) => {
  const storageKey = `luma_win_rect_${id}`;

  const getInsets = () => {
    const bar = taskbarSizePx <= 0 ? 0 : Math.max(44, Math.min(84, taskbarSizePx));
    const padTop =
      topBarOffsetPx > 0
        ? topBarOffsetPx + 6
        : taskbarPosition === 'top' && bar > 0
        ? bar + 6
        : 8;
    const padBottom = taskbarPosition === 'bottom' && bar > 0 ? bar + 8 : 8;
    const padLeft = taskbarPosition === 'left' && bar > 0 ? bar + 12 : 8;
    const padRight = taskbarPosition === 'right' && bar > 0 ? bar + 12 : 8;
    return { padTop, padBottom, padLeft, padRight };
  };

  const computeSnapRect = (zone: SnapZone): WinRect => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    const { padTop, padBottom, padLeft, padRight } = getInsets();
    const availW = Math.max(420, vw - padLeft - padRight);
    const availH = Math.max(320, vh - padTop - padBottom);
    const gap = 6;
    const halfW = Math.floor((availW - gap) / 2);
    const halfH = Math.floor((availH - gap) / 2);
    const twoThirdW = Math.floor((availW - gap) * 0.65);
    const oneThirdW = availW - gap - twoThirdW;

    switch (zone) {
      case 'left':
        return { x: padLeft, y: padTop, w: halfW, h: availH };
      case 'right':
        return { x: padLeft + halfW + gap, y: padTop, w: availW - halfW - gap, h: availH };
      case 'top':
        return { x: padLeft, y: padTop, w: availW, h: halfH };
      case 'bottom':
        return { x: padLeft, y: padTop + halfH + gap, w: availW, h: availH - halfH - gap };
      case 'tl':
        return { x: padLeft, y: padTop, w: halfW, h: halfH };
      case 'tr':
        return { x: padLeft + halfW + gap, y: padTop, w: availW - halfW - gap, h: halfH };
      case 'bl':
        return { x: padLeft, y: padTop + halfH + gap, w: halfW, h: availH - halfH - gap };
      case 'br':
        return { x: padLeft + halfW + gap, y: padTop + halfH + gap, w: availW - halfW - gap, h: availH - halfH - gap };
      case 'left23':
        return { x: padLeft, y: padTop, w: twoThirdW, h: availH };
      case 'right13':
        return { x: padLeft + twoThirdW + gap, y: padTop, w: oneThirdW, h: availH };
      case 'center': {
        const cw = Math.min(Math.max(minWidth, initialWidth), availW - 40);
        const ch = Math.min(Math.max(minHeight, initialHeight), availH - 40);
        return {
          x: padLeft + Math.round((availW - cw) / 2),
          y: padTop + Math.round((availH - ch) / 2),
          w: cw,
          h: ch,
        };
      }
      case 'maximize':
      default:
        return { x: padLeft, y: padTop, w: availW, h: availH };
    }
  };

  const [maximized, setMaximized] = useState<boolean>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && typeof saved.maximized === 'boolean') return saved.maximized;
    } catch {
      /* ignore */
    }
    return defaultMaximized;
  });

  const [rect, setRect] = useState<WinRect>(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    const { padTop, padBottom, padLeft, padRight } = getInsets();
    const availW = Math.max(420, vw - padLeft - padRight);
    const availH = Math.max(320, vh - padTop - padBottom);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && typeof saved.w === 'number' && typeof saved.h === 'number') {
        const w = Math.max(minWidth, Math.min(saved.w, availW));
        const h = Math.max(minHeight, Math.min(saved.h, availH));
        const x = Math.min(Math.max(padLeft, saved.x ?? padLeft + 12), Math.max(padLeft, vw - w - padRight));
        const y = Math.min(Math.max(padTop, saved.y ?? padTop + 12), Math.max(padTop, vh - h - padBottom));
        return { x, y, w, h };
      }
    } catch {
      /* ignore */
    }
    const w = Math.min(initialWidth, availW - 24);
    const h = Math.min(initialHeight, availH - 24);
    const x =
      initialX !== undefined
        ? Math.min(Math.max(padLeft + 8, initialX), Math.max(padLeft + 8, vw - w - padRight))
        : Math.max(padLeft + 12, padLeft + Math.round((availW - w) / 2));
    const y =
      initialY !== undefined
        ? Math.min(Math.max(padTop + 8, initialY), Math.max(padTop + 8, vh - h - padBottom))
        : Math.max(padTop + 12, padTop + Math.round((availH - h) / 2));
    return { x, y, w, h };
  });

  const [snapMenuOpen, setSnapMenuOpen] = useState(false);
  const [dotsMenuOpen, setDotsMenuOpen] = useState(false);
  const [snapPreviewZone, setSnapPreviewZone] = useState<SnapZone | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const snapPreviewRef = useRef<SnapZone | null>(null);
  const snapSeqRef = useRef<number>(0);

  // Persist geometry cleanly whenever window settles
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ ...rect, maximized }));
      } catch {
        /* ignore */
      }
    }, 180);
    return () => window.clearTimeout(t);
  }, [rect, maximized, storageKey]);

  const applySnap = (zone: SnapZone) => {
    setSnapMenuOpen(false);
    setSnapPreviewZone(null);
    snapPreviewRef.current = null;
    if (zone === 'maximize') {
      setMaximized(true);
      return;
    }
    setMaximized(false);
    setRect(computeSnapRect(zone));
  };

  // External multitasking snap commands (Split Screen / Tile / Cascade / Center)
  useEffect(() => {
    if (!snapCommand || snapCommand.seq === snapSeqRef.current) return;
    snapSeqRef.current = snapCommand.seq;
    applySnap(snapCommand.zone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapCommand]);

  const dragRef = useRef<{
    mode: 'drag' | 'resize';
    dir?: ResizeDir;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastT: number;
    vx: number;
    vy: number;
    curX: number;
    curY: number;
    orig: WinRect;
  } | null>(null);

  useEffect(() => {
    const detectEdgeSnap = (clientX: number, clientY: number): SnapZone | null => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const { padTop, padBottom, padLeft } = getInsets();
      const edge = 20;
      const corner = 72;
      const nearLeft = clientX <= padLeft + edge;
      const nearRight = clientX >= vw - edge;
      const nearTop = clientY <= padTop + edge;
      const nearBottom = clientY >= vh - padBottom - edge;

      if (nearLeft && clientY <= padTop + corner) return 'tl';
      if (nearLeft && clientY >= vh - padBottom - corner) return 'bl';
      if (nearRight && clientY <= padTop + corner) return 'tr';
      if (nearRight && clientY >= vh - padBottom - corner) return 'br';
      if (nearLeft) return 'left';
      if (nearRight) return 'right';
      if (nearTop) return 'maximize';
      if (nearBottom) return 'bottom';
      return null;
    };

    const onMove = (e: PointerEvent) => {
      const st = dragRef.current;
      if (!st) return;
      const { mode, dir, startX, startY, orig } = st;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const { padTop, padBottom, padLeft, padRight } = getInsets();
      const maxBottom = vh - padBottom;
      const maxRight = vw - padRight;

      if (mode === 'drag') {
        const now = performance.now();
        const dt = Math.max(4, now - st.lastT);
        const instVx = (e.clientX - st.lastX) / dt; // px per ms
        const instVy = (e.clientY - st.lastY) / dt;
        st.vx = st.vx * 0.55 + instVx * 0.45;
        st.vy = st.vy * 0.55 + instVy * 0.45;
        st.lastX = e.clientX;
        st.lastY = e.clientY;
        st.lastT = now;

        const nx = Math.max(padLeft - orig.w + 180, Math.min(vw - 140, orig.x + dx));
        const ny = Math.max(padTop, Math.min(maxBottom - 42, orig.y + dy));
        st.curX = nx;
        st.curY = ny;
        setRect((r) => ({ ...r, x: nx, y: ny }));
        const z = detectEdgeSnap(e.clientX, e.clientY);
        snapPreviewRef.current = z;
        setSnapPreviewZone(z);
        return;
      }

      // 8-direction resize
      let { x, y, w, h } = orig;
      if (dir?.includes('e')) {
        w = Math.max(minWidth, Math.min(maxRight - x, orig.w + dx));
      }
      if (dir?.includes('s')) {
        h = Math.max(minHeight, Math.min(maxBottom - y, orig.h + dy));
      }
      if (dir?.includes('w')) {
        const nextW = Math.max(minWidth, Math.min(orig.x + orig.w - padLeft, orig.w - dx));
        x = orig.x + (orig.w - nextW);
        w = nextW;
      }
      if (dir?.includes('n')) {
        const nextH = Math.max(minHeight, Math.min(orig.y + orig.h - padTop, orig.h - dy));
        y = orig.y + (orig.h - nextH);
        h = nextH;
      }
      setRect({ x, y, w, h });
    };

    const onUp = () => {
      const st = dragRef.current;
      dragRef.current = null;
      setIsInteracting(false);
      if (st?.mode === 'drag') {
        if (snapPreviewRef.current) {
          applySnap(snapPreviewRef.current);
        } else if (document.documentElement.dataset.springPhysics !== 'off') {
          // Spring-physics flick inertia: react organically to drag velocity on release!
          const speed = Math.hypot(st.vx, st.vy);
          const staleMs = performance.now() - st.lastT;
          if (speed > 0.22 && staleMs < 85) {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const { padTop, padBottom, padLeft } = getInsets();
            const throwX = Math.max(-130, Math.min(130, st.vx * 92));
            const throwY = Math.max(-96, Math.min(96, st.vy * 92));
            const targetX = Math.round(Math.max(padLeft - st.orig.w + 180, Math.min(vw - 140, st.curX + throwX)));
            const targetY = Math.round(Math.max(padTop, Math.min(vh - padBottom - 42, st.curY + throwY)));
            setRect((r) => ({ ...r, x: targetX, y: targetY }));
          }
        }
      }
      snapPreviewRef.current = null;
      setSnapPreviewZone(null);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskbarPosition, taskbarSizePx, topBarOffsetPx, minWidth, minHeight]);

  // Keep maximized numeric bounds synchronized on viewport resize so maximize/restore spring-interpolates smoothly!
  const [vpSize, setVpSize] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));
  useEffect(() => {
    const onResize = () => setVpSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    onFocus();
    setSnapMenuOpen(false);
    setIsInteracting(true);
    const now = performance.now();
    if (maximized) {
      // Smoothly unmaximize under finger / stylus / cursor
      const ratio = e.clientX / Math.max(1, window.innerWidth);
      const nx = Math.round(e.clientX - rect.w * ratio);
      const ny = Math.max(getInsets().padTop, e.clientY - 18);
      const restored = { ...rect, x: nx, y: ny };
      setMaximized(false);
      setRect(restored);
      dragRef.current = {
        mode: 'drag',
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: now,
        vx: 0,
        vy: 0,
        curX: restored.x,
        curY: restored.y,
        orig: restored,
      };
      return;
    }
    dragRef.current = {
      mode: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: now,
      vx: 0,
      vy: 0,
      curX: rect.x,
      curY: rect.y,
      orig: { ...rect },
    };
  };

  const startResize = (dir: ResizeDir) => (e: React.PointerEvent) => {
    if (maximized) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    onFocus();
    setSnapMenuOpen(false);
    setIsInteracting(true);
    dragRef.current = {
      mode: 'resize',
      dir,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: performance.now(),
      vx: 0,
      vy: 0,
      curX: rect.x,
      curY: rect.y,
      orig: { ...rect },
    };
  };

  const { padTop, padBottom, padLeft, padRight } = getInsets();
  const isGlass = designStyle === 'glass';
  const isNova = designStyle === 'nova';
  const maxW = Math.max(minWidth, vpSize.w - padLeft - padRight);
  const maxH = Math.max(minHeight, vpSize.h - padTop - padBottom);

  const style: React.CSSProperties = maximized
    ? {
        position: 'fixed',
        left: padLeft,
        top: padTop,
        width: maxW,
        height: maxH,
        zIndex,
        borderRadius: isGlass ? '22px' : isNova ? '16px' : 'var(--luma-radius)',
      }
    : {
        position: 'fixed',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        zIndex,
        borderRadius: isGlass ? '24px' : isNova ? '18px' : 'var(--luma-radius)',
      };

  const winSurface = isNova
    ? isDark
      ? 'dex-window-nova-dark text-zinc-100'
      : 'dex-window-nova-light text-zinc-900'
    : isGlass
    ? isDark
      ? 'dex-window-pixel-dark text-slate-100'
      : 'dex-window-pixel-light text-slate-900'
    : isDark
    ? 'dex-window-dark text-zinc-100'
    : 'dex-window-light text-zinc-900';

  const previewRect = snapPreviewZone ? computeSnapRect(snapPreviewZone) : null;

  return (
    <>
      {/* Aero Edge Snap Ghost Preview */}
      {previewRect && (
        <div
          style={{
            position: 'fixed',
            left: previewRect.x,
            top: previewRect.y,
            width: previewRect.w,
            height: previewRect.h,
            zIndex: zIndex - 1,
            borderColor: 'var(--luma-accent)',
          }}
          className="pointer-events-none rounded-2xl border-2 bg-[var(--luma-accent)]/15 backdrop-blur-md transition-all duration-200 shadow-2xl"
        />
      )}

      <div
        style={style}
        onPointerDown={onFocus}
        onContextMenu={(e) => e.stopPropagation()}
        className={`luma-animate-in luma-optical-glass luma-glass-edge flex flex-col overflow-hidden select-none ${
          isInteracting ? '' : 'luma-win-spring-motion'
        } ${winSurface} ${
          alwaysOnTop ? 'ring-1 ring-amber-400/65 shadow-[0_24px_80px_rgba(245,158,11,0.22)]' : ''
        }`}
      >
        {/* Window Titlebar (Full Mouse + Touch + Stylus drag support) */}
        <div
          onPointerDown={startDrag}
          onDoubleClick={() => setMaximized((m) => !m)}
          style={{ touchAction: 'none' }}
          className={`h-11 px-4 flex items-center justify-between gap-3 border-b shrink-0 cursor-grab active:cursor-grabbing relative ${
            isNova
              ? isDark
                ? 'border-sky-400/[0.14] bg-[#0e1526]/95'
                : 'border-sky-900/[0.12] bg-[#eaf1f9]/95'
              : isGlass
              ? isDark
                ? 'border-blue-300/[0.1] bg-blue-400/[0.04]'
                : 'border-blue-900/[0.1] bg-slate-200/55'
              : isDark
              ? 'border-white/[0.08] bg-white/[0.02]'
              : 'border-zinc-900/[0.1] bg-zinc-300/35'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              style={{ color: isNova || isGlass ? 'var(--luma-accent)' : undefined }}
              className={isDark ? 'text-zinc-300' : 'text-zinc-700'}
            >
              {icon}
            </span>
            <span className="text-xs font-bold tracking-tight truncate">{title}</span>
            {alwaysOnTop && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/45 text-amber-300 text-[9px] font-bold shrink-0">
                <Pin className="w-2.5 h-2.5" /> Поверх всех окон
              </span>
            )}
            {subtitle && (
              <span className="hidden sm:inline text-[11px] font-mono text-zinc-500 truncate">
                / {subtitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 relative">
            {/* Always on Top (Поверх Chrome и всех окон Windows) Pin Toggle */}
            {onToggleAlwaysOnTop && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAlwaysOnTop();
                }}
                title={alwaysOnTop ? 'Открепить (сейчас поверх Chrome и всех окон)' : 'Закрепить поверх Chrome и всех приложений Windows (📌)'}
                className={`w-7 h-7 ${isGlass || isNova ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center transition cursor-pointer ${
                  alwaysOnTop
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/40'
                    : isDark
                    ? 'text-zinc-400 hover:bg-white/10 hover:text-amber-300'
                    : 'text-zinc-500 hover:bg-zinc-200 hover:text-amber-600'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${alwaysOnTop ? 'fill-current' : ''}`} />
              </button>
            )}

            {/* Windows 11 Snap Layout Picker */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDotsMenuOpen(false);
                setSnapMenuOpen((v) => !v);
              }}
              title="Макеты привязки окон (Snap Layouts)"
              className={`w-7 h-7 ${isGlass || isNova ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center transition cursor-pointer ${
                snapMenuOpen
                  ? 'bg-[var(--luma-accent)] text-white'
                  : isDark
                  ? 'text-zinc-400 hover:bg-white/10 hover:text-white'
                  : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>

            {windowControlsStyle === 'dots3' ? (
              <div className="flex items-center gap-1.5 pl-1.5 pr-0.5 group/dots">
                <button
                  onClick={onMinimize}
                  title="Свернуть"
                  className="w-3.5 h-3.5 rounded-full bg-amber-400 hover:bg-amber-300 border border-amber-500/50 flex items-center justify-center transition transform hover:scale-110 cursor-pointer shadow-sm"
                >
                  <Minus className="w-2 h-2 text-amber-950 opacity-0 group-hover/dots:opacity-100 transition-opacity stroke-[3]" />
                </button>
                <button
                  onClick={() => setMaximized((m) => !m)}
                  title={maximized ? 'Восстановить' : 'Развернуть'}
                  className="w-3.5 h-3.5 rounded-full bg-emerald-400 hover:bg-emerald-300 border border-emerald-500/50 flex items-center justify-center transition transform hover:scale-110 cursor-pointer shadow-sm"
                >
                  {maximized ? (
                    <Minimize2 className="w-2 h-2 text-emerald-950 opacity-0 group-hover/dots:opacity-100 transition-opacity stroke-[3]" />
                  ) : (
                    <Maximize2 className="w-2 h-2 text-emerald-950 opacity-0 group-hover/dots:opacity-100 transition-opacity stroke-[3]" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  title="Закрыть"
                  className="w-3.5 h-3.5 rounded-full bg-rose-500 hover:bg-rose-400 border border-rose-600/50 flex items-center justify-center transition transform hover:scale-110 cursor-pointer shadow-sm"
                >
                  <X className="w-2 h-2 text-rose-950 opacity-0 group-hover/dots:opacity-100 transition-opacity stroke-[3]" />
                </button>
              </div>
            ) : windowControlsStyle === 'menu3' ? (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSnapMenuOpen(false);
                    setDotsMenuOpen((v) => !v);
                  }}
                  title="Управление окном (3 точки)"
                  className={`w-7 h-7 ${isGlass || isNova ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center transition cursor-pointer ${
                    dotsMenuOpen
                      ? 'bg-[var(--luma-accent)] text-white'
                      : isDark
                      ? 'text-zinc-300 hover:bg-white/12 hover:text-white'
                      : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {dotsMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute right-0 top-9 z-50 w-48 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-xl space-y-0.5 ${
                      isDark
                        ? 'bg-zinc-950/95 border-white/15 text-zinc-100'
                        : 'bg-white/95 border-zinc-300 text-zinc-900'
                    }`}
                  >
                    {onToggleAlwaysOnTop && (
                      <button
                        onClick={() => {
                          setDotsMenuOpen(false);
                          onToggleAlwaysOnTop();
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer ${
                          alwaysOnTop ? 'bg-amber-500/20 text-amber-300 font-bold' : isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5 text-amber-400" />
                        {alwaysOnTop ? 'Открепить окно' : 'Поверх всех окон'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDotsMenuOpen(false);
                        onMinimize();
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer ${
                        isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5 text-amber-400" />
                      Свернуть
                    </button>
                    <button
                      onClick={() => {
                        setDotsMenuOpen(false);
                        setMaximized((m) => !m);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer ${
                        isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
                      }`}
                    >
                      {maximized ? (
                        <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {maximized ? 'Восстановить' : 'Развернуть'}
                    </button>
                    <div className={`my-1 h-px ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />
                    <button
                      onClick={() => {
                        setDotsMenuOpen(false);
                        onClose();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 transition cursor-pointer font-semibold"
                    >
                      <X className="w-3.5 h-3.5" />
                      Закрыть окно
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={onMinimize}
                  title="Свернуть"
                  className={`w-7 h-7 ${isGlass ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center transition cursor-pointer ${
                    isDark ? 'text-zinc-400 hover:bg-white/10 hover:text-white' : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setMaximized((m) => !m)}
                  title={maximized ? 'Восстановить' : 'Развернуть'}
                  className={`w-7 h-7 ${isGlass ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center transition cursor-pointer ${
                    isDark ? 'text-zinc-400 hover:bg-white/10 hover:text-white' : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={onClose}
                  title="Закрыть"
                  className={`w-7 h-7 ${isGlass ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center text-zinc-400 hover:bg-[var(--luma-accent)] hover:text-white transition cursor-pointer`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Floating Snap Layout Grid Popover */}
            {snapMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-0 top-9 z-50 w-64 p-3 rounded-2xl border shadow-2xl backdrop-blur-xl ${
                  isDark
                    ? 'bg-zinc-950/95 border-white/15 text-zinc-100'
                    : 'bg-white/95 border-zinc-300 text-zinc-900'
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                  Snap Layouts · Мультизадачность
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {/* 50 / 50 */}
                  <div className={`p-1.5 rounded-xl border grid grid-cols-2 gap-1 h-12 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-zinc-200 bg-zinc-50'}`}>
                    <button
                      onClick={() => applySnap('left')}
                      title="Левая половина (50%)"
                      className={`rounded-md transition cursor-pointer ${isDark ? 'bg-white/15 hover:bg-[var(--luma-accent)]' : 'bg-zinc-300 hover:bg-[var(--luma-accent)]'}`}
                    />
                    <button
                      onClick={() => applySnap('right')}
                      title="Правая половина (50%)"
                      className={`rounded-md transition cursor-pointer ${isDark ? 'bg-white/15 hover:bg-[var(--luma-accent)]' : 'bg-zinc-300 hover:bg-[var(--luma-accent)]'}`}
                    />
                  </div>

                  {/* 65 / 35 */}
                  <div className={`p-1.5 rounded-xl border grid grid-cols-3 gap-1 h-12 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-zinc-200 bg-zinc-50'}`}>
                    <button
                      onClick={() => applySnap('left23')}
                      title="Левые 2/3 экрана"
                      className={`col-span-2 rounded-md transition cursor-pointer ${isDark ? 'bg-white/15 hover:bg-[var(--luma-accent)]' : 'bg-zinc-300 hover:bg-[var(--luma-accent)]'}`}
                    />
                    <button
                      onClick={() => applySnap('right13')}
                      title="Правая 1/3 экрана"
                      className={`rounded-md transition cursor-pointer ${isDark ? 'bg-white/15 hover:bg-[var(--luma-accent)]' : 'bg-zinc-300 hover:bg-[var(--luma-accent)]'}`}
                    />
                  </div>

                  {/* 2x2 Quarters */}
                  <div className={`p-1.5 rounded-xl border grid grid-cols-2 grid-rows-2 gap-1 h-12 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-zinc-200 bg-zinc-50'}`}>
                    {(['tl', 'tr', 'bl', 'br'] as SnapZone[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => applySnap(q)}
                        title={`Четверть (${q.toUpperCase()})`}
                        className={`rounded-sm transition cursor-pointer ${isDark ? 'bg-white/15 hover:bg-[var(--luma-accent)]' : 'bg-zinc-300 hover:bg-[var(--luma-accent)]'}`}
                      />
                    ))}
                  </div>

                  {/* Top / Bottom */}
                  <div className={`p-1.5 rounded-xl border grid grid-rows-2 gap-1 h-12 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-zinc-200 bg-zinc-50'}`}>
                    <button
                      onClick={() => applySnap('top')}
                      title="Верхняя половина"
                      className={`rounded-md transition cursor-pointer ${isDark ? 'bg-white/15 hover:bg-[var(--luma-accent)]' : 'bg-zinc-300 hover:bg-[var(--luma-accent)]'}`}
                    />
                    <button
                      onClick={() => applySnap('bottom')}
                      title="Нижняя половина"
                      className={`rounded-md transition cursor-pointer ${isDark ? 'bg-white/15 hover:bg-[var(--luma-accent)]' : 'bg-zinc-300 hover:bg-[var(--luma-accent)]'}`}
                    />
                  </div>

                  {/* Center */}
                  <button
                    onClick={() => applySnap('center')}
                    title="По центру"
                    className={`p-2 rounded-xl border h-12 flex items-center justify-center transition cursor-pointer ${isDark ? 'border-white/10 bg-white/[0.03] hover:border-[var(--luma-accent)]' : 'border-zinc-200 bg-zinc-50 hover:border-[var(--luma-accent)]'}`}
                  >
                    <span className={`w-7 h-5 rounded-md ${isDark ? 'bg-white/20' : 'bg-zinc-300'}`} />
                  </button>

                  {/* Fullscreen/Max */}
                  <button
                    onClick={() => applySnap('maximize')}
                    title="Во весь экран"
                    className={`p-1.5 rounded-xl border h-12 flex items-center justify-center transition cursor-pointer ${isDark ? 'border-white/10 bg-white/[0.03] hover:border-[var(--luma-accent)]' : 'border-zinc-200 bg-zinc-50 hover:border-[var(--luma-accent)]'}`}
                  >
                    <span className={`w-full h-full rounded-md ${isDark ? 'bg-white/20' : 'bg-zinc-300'}`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Window Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden select-text">
          {children}
        </div>

        {/* 8-Direction Resize Handles (All 4 edges + 4 corners — Mouse, Touch & Stylus friendly) */}
        {!maximized && (
          <>
            <div onPointerDown={startResize('n')} style={{ touchAction: 'none' }} className="absolute top-0 left-4 right-4 h-2.5 cursor-ns-resize z-20" />
            <div onPointerDown={startResize('s')} style={{ touchAction: 'none' }} className="absolute bottom-0 left-4 right-4 h-2.5 cursor-ns-resize z-20" />
            <div onPointerDown={startResize('w')} style={{ touchAction: 'none' }} className="absolute left-0 top-4 bottom-4 w-2.5 cursor-ew-resize z-20" />
            <div onPointerDown={startResize('e')} style={{ touchAction: 'none' }} className="absolute right-0 top-4 bottom-4 w-2.5 cursor-ew-resize z-20" />

            <div onPointerDown={startResize('nw')} style={{ touchAction: 'none' }} className="absolute top-0 left-0 w-5 h-5 cursor-nwse-resize z-30" />
            <div onPointerDown={startResize('ne')} style={{ touchAction: 'none' }} className="absolute top-0 right-0 w-5 h-5 cursor-nesw-resize z-30" />
            <div onPointerDown={startResize('sw')} style={{ touchAction: 'none' }} className="absolute bottom-0 left-0 w-5 h-5 cursor-nesw-resize z-30" />
            <div
              onPointerDown={startResize('se')}
              style={{ touchAction: 'none' }}
              title="Изменить размер окна (мышь, палец или стилус)"
              className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-30 flex items-end justify-end p-1.5 opacity-55 hover:opacity-100"
            >
              <span className={`w-2.5 h-2.5 border-r-2 border-b-2 rounded-br-[2px] ${isDark ? 'border-zinc-400' : 'border-zinc-500'}`} />
            </div>
          </>
        )}
      </div>
    </>
  );
});

