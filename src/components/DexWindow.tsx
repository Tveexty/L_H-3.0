import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';

export interface DexWindowProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  isDark: boolean;
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
  const [rect, setRect] = useState(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight - 52 : 840;
    const w = Math.min(initialWidth, vw - 40);
    const h = Math.min(initialHeight, vh - 40);
    const x = initialX !== undefined ? Math.min(Math.max(16, initialX), Math.max(16, vw - w - 16)) : Math.max(20, Math.round((vw - w) / 2));
    const y = initialY !== undefined ? Math.min(Math.max(16, initialY), Math.max(16, vh - h - 16)) : Math.max(20, Math.round((vh - h) / 2));
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
      const vh = window.innerHeight - 52;

      if (mode === 'drag') {
        const nx = Math.max(-orig.w + 160, Math.min(vw - 160, orig.x + dx));
        const ny = Math.max(8, Math.min(vh - 44, orig.y + dy));
        setRect((r) => ({ ...r, x: nx, y: ny }));
      } else {
        const nw = Math.max(460, Math.min(vw - orig.x - 8, orig.w + dx));
        const nh = Math.max(320, Math.min(vh - orig.y - 8, orig.h + dy));
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
  }, []);

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

  const style: React.CSSProperties = maximized
    ? {
        position: 'fixed',
        top: 8,
        left: 8,
        right: 8,
        bottom: 60,
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

  return (
    <div
      style={style}
      onMouseDown={onFocus}
      onContextMenu={(e) => e.stopPropagation()}
      className={`luma-animate-in flex flex-col overflow-hidden select-none ${
        maximized ? 'rounded-2xl' : 'rounded-[20px]'
      } ${isDark ? 'dex-window-dark text-zinc-100' : 'dex-window-light text-zinc-900'}`}
    >
      {/* Strict Industrial Titlebar */}
      <div
        onPointerDown={startDrag}
        onDoubleClick={() => setMaximized((m) => !m)}
        className={`h-11 px-4 flex items-center justify-between gap-3 border-b shrink-0 cursor-grab active:cursor-grabbing ${
          isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-zinc-900/[0.08] bg-zinc-50/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{icon}</span>
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
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
              isDark ? 'text-zinc-400 hover:bg-white/10 hover:text-white' : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMaximized((m) => !m)}
            title={maximized ? 'Восстановить' : 'Развернуть'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
              isDark ? 'text-zinc-400 hover:bg-white/10 hover:text-white' : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
            }`}
          >
            {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            title="Закрыть"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-[#d71921] hover:text-white transition cursor-pointer"
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
