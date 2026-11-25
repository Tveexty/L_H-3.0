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
 * Viewport-clamped context menu container (Luma OS 1.5.1).
 * Automatically measures its exact rendered width/height and flips/clamps
 * inside [padding, viewport - size - padding] so NO menu ever overflows off-screen.
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
  const [pos, setPos] = useState<{ left: number; top: number; ready: boolean }>({
    left: x,
    top: y,
    ready: false,
  });

  useLayoutEffect(() => {
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = rect.width || 220;
      const h = rect.height || 200;

      // Flip left if overflowing right edge, then hard-clamp inside viewport
      let left = x;
      if (left + w + padding > vw) {
        left = x - w;
      }
      left = Math.max(padding, Math.min(left, vw - w - padding));

      // Flip upward if overflowing bottom edge (crucial for bottom taskbar right-clicks!), then hard-clamp
      let top = y;
      if (top + h + padding > vh) {
        top = y - h;
      }
      top = Math.max(padding, Math.min(top, vh - h - padding));

      setPos({ left, top, ready: true });
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
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
