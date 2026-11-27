import React, { useLayoutEffect, useRef, useState } from 'react';

interface SmartContextMenuProps {
  x: number;
  y: number;
  zIndex?: number;
  className?: string;
  padding?: number;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

/**
 * Viewport-clamped context menu container (Luma OS 1.7.3).
 * Anchors right next to cursor (flipping cleanly upward when right-clicking the bottom taskbar
 * or leftward near the right edge) and re-measures via ResizeObserver so NO menu ever jumps
 * to the center of the screen or overflows off-screen.
 */
export const SmartContextMenu: React.FC<SmartContextMenuProps> = ({
  x,
  y,
  zIndex = 9998,
  className = '',
  padding = 10,
  onClick,
  onContextMenu,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; origin: string; ready: boolean }>({
    left: x,
    top: y,
    origin: 'top left',
    ready: false,
  });

  useLayoutEffect(() => {
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const w = el.offsetWidth || el.getBoundingClientRect().width || 240;
      const h = el.offsetHeight || el.getBoundingClientRect().height || 220;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Anchor horizontally at cursor; flip left only if overflowing right edge
      let flippedX = false;
      let left = x;
      if (left + w + padding > vw) {
        left = x - w;
        flippedX = true;
      }
      left = Math.max(padding, Math.min(left, vw - w - padding));

      // Anchor vertically at cursor; flip cleanly ABOVE cursor when near bottom (taskbar RMB!)
      let flippedY = false;
      let top = y;
      if (top + h + padding > vh) {
        top = y - h - 6;
        flippedY = true;
      }
      top = Math.max(padding, Math.min(top, vh - h - padding));

      const origin = `${flippedY ? 'bottom' : 'top'} ${flippedX ? 'right' : 'left'}`;
      setPos({ left, top, origin, ready: true });
    };

    compute();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && ref.current) {
      ro = new ResizeObserver(compute);
      ro.observe(ref.current);
    }
    window.addEventListener('resize', compute);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [x, y, padding]);

  return (
    <div
      ref={ref}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        transformOrigin: pos.origin,
        zIndex,
        maxHeight: `calc(100vh - ${padding * 2}px)`,
        maxWidth: `calc(100vw - ${padding * 2}px)`,
        opacity: pos.ready ? 1 : 0,
      }}
      className={`overflow-y-auto luma-spring-menu ${className}`}
    >
      {children}
    </div>
  );
};
