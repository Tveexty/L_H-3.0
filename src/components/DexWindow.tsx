import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';

export type TaskbarPosition = 'bottom' | 'left' | 'top';
export type DesignStyle = 'nothing' | 'pixelbook';

export interface DexWindowProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  isDark: boolean;
  designStyle?: DesignStyle;
  taskbarPosition?: TaskbarPosition;
  zIndex: number;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
  defaultMaximized?: boolean;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export const DexWindow: React.FC<DexWindowProps> = ({
  title,
  subtitle,
  icon,
  isDark,
  designStyle = 'nothing',
  taskbarPosition = 'bottom',
  zIndex,
  initialWidth = 980,
  initialHeight = 640,
  initialX,
  initialY,
  defaultMaximized = false,
  onFocus,
  onMinimize,
  onClose,
  children,
}) => {
  const [maximized, setMaximized] = useState(defaultMaximized);

  const getInsets = () => {
    const padTop = taskbarPosition === 'top' ? 58 : 8;
    const padBottom = taskbarPosition === 'bottom' ? 60 : 8;
    const padLeft = taskbarPosition === 'left' ? 66 : 8;
    const padRight = 8;
    return { padTop, padBottom, padLeft, padRight };
  };

  const [rect, setRect] = useState(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    const { padTop, padBottom, padLeft, padRight } = getInsets();
    const availW = Math.max(480, vw - padLeft - padRight);
    const availH = Math.max(340, vh - padTop - padBottom);
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

  const dragRef = useRef<{
    mode: 'drag' | 'resize';
    startX: number;
    startY: number;
    orig: { x: number; y: number; w: number; h: number };
  } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const { mode, startX, startY, orig } = dragRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const minTop = taskbarPosition === 'top' ? 54 : 6;
      const maxBottom = taskbarPosition === 'bottom' ? vh - 56 : vh - 8;
      const minLeft = taskbarPosition === 'left' ? 62 : 6;

      if (mode === 'drag') {
        const nx = Math.max(minLeft - orig.w + 180, Math.min(vw - 160, orig.x + dx));
        const ny = Math.max(minTop, Math.min(maxBottom - 44, orig.y + dy));
        setRect((r) => ({ ...r, x: nx, y: ny }));
      } else {
        const nw = Math.max(440, Math.min(vw - orig.x - 8, orig.w + dx));
        const nh = Math.max(320, Math.min(maxBottom - orig.y, orig.h + dy));
        setRect((r) => ({ ...r, w: nw, h: nh }));
      }
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
  }, [taskbarPosition]);

  const startDrag = (e: React.PointerEvent) => {
    if (maximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    onFocus();
    dragRef.current = {
      mode: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...rect },
    };
  };

  const startResize = (e: React.PointerEvent) => {
    if (maximized) return;
    e.stopPropagation();
    onFocus();
    dragRef.current = {
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...rect },
    };
  };

  const { padTop, padBottom, padLeft, padRight } = getInsets();

  const style: React.CSSProperties = maximized
    ? {
        position: 'fixed',
        top: padTop,
        left: padLeft,
        right: padRight,
        bottom: padBottom,
        zIndex,
      }
    : {
        position: 'fixed',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        zIndex,
      };

  const isPixel = designStyle === 'pixelbook';
  const winSurface = isPixel
    ? isDark
      ? 'dex-window-pixel-dark text-slate-100'
      : 'dex-window-pixel-light text-slate-900'
    : isDark
    ? 'dex-window-dark text-zinc-100'
    : 'dex-window-light text-zinc-900';

  const radiusCls = isPixel
    ? maximized
      ? 'rounded-[22px]'
      : 'rounded-[24px]'
    : maximized
    ? 'rounded-2xl'
    : 'rounded-[18px]';

  return (
    <div
      style={style}
      onMouseDown={onFocus}
      onContextMenu={(e) => e.stopPropagation()}
      className={`luma-animate-in flex flex-col overflow-hidden select-none ${radiusCls} ${winSurface}`}
    >
      {/* Window Titlebar */}
      <div
        onPointerDown={startDrag}
        onDoubleClick={() => setMaximized((m) => !m)}
        className={`h-11 px-4 flex items-center justify-between gap-3 border-b shrink-0 cursor-grab active:cursor-grabbing ${
          isPixel
            ? isDark
              ? 'border-blue-300/[0.1] bg-blue-400/[0.04]'
              : 'border-blue-900/[0.08] bg-slate-100/75'
            : isDark
            ? 'border-white/[0.08] bg-white/[0.02]'
            : 'border-zinc-900/[0.08] bg-zinc-50/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span style={{ color: isPixel ? 'var(--luma-accent)' : undefined }} className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
            {icon}
          </span>
          <span className="text-xs font-bold tracking-tight truncate">{title}</span>
          {subtitle && (
            <span className="hidden sm:inline text-[11px] font-mono text-zinc-500 truncate">
              / {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onMinimize}
            title="Свернуть"
            className={`w-7 h-7 ${isPixel ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center transition cursor-pointer ${
              isDark ? 'text-zinc-400 hover:bg-white/10 hover:text-white' : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMaximized((m) => !m)}
            title={maximized ? 'Восстановить' : 'Развернуть'}
            className={`w-7 h-7 ${isPixel ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center transition cursor-pointer ${
              isDark ? 'text-zinc-400 hover:bg-white/10 hover:text-white' : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
            }`}
          >
            {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            title="Закрыть"
            className={`w-7 h-7 ${isPixel ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center text-zinc-400 hover:bg-[var(--luma-accent)] hover:text-white transition cursor-pointer`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden select-text">
        {children}
      </div>

      {/* Bottom-Right Resize Grip */}
      {!maximized && (
        <div
          onPointerDown={startResize}
          title="Изменить размер"
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-1 opacity-40 hover:opacity-100"
        >
          <span className={`w-2 h-2 border-r-2 border-b-2 rounded-br-[2px] ${isDark ? 'border-zinc-400' : 'border-zinc-500'}`} />
        </div>
      )}
    </div>
  );
};
