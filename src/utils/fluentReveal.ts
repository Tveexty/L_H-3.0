// Luma OS 1.8 (Fluorine · F-9) — Fluent Reveal / Specular Glass Edge Tracker
// Ultra-lightweight single-rAF global pointer engine (zero React re-renders).
// Illuminates physical glass contours of cards, windows, dock buttons & panels under cursor/stylus.

let activeStop: (() => void) | null = null;

export function startFluentReveal(enabled: boolean): () => void {
  if (activeStop) {
    activeStop();
    activeStop = null;
  }

  const root = document.documentElement;
  root.setAttribute('data-fluent-reveal', enabled ? 'on' : 'off');
  if (!enabled) return () => {};

  let pointerX = -9999;
  let pointerY = -9999;
  let rafId: number | null = null;
  let cachedNodes: HTMLElement[] = [];
  let lastScanAt = 0;

  const refreshNodes = (now: number) => {
    if (now - lastScanAt > 450 || cachedNodes.length === 0) {
      cachedNodes = Array.from(document.querySelectorAll<HTMLElement>('.luma-glass-edge'));
      lastScanAt = now;
    }
  };

  const renderFrame = () => {
    rafId = null;
    if (document.hidden) return;
    const now = performance.now();
    refreshNodes(now);

    const proximity = 240;
    for (let i = 0; i < cachedNodes.length; i++) {
      const el = cachedNodes[i];
      if (!el.isConnected) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const nearX = pointerX >= rect.left - proximity && pointerX <= rect.right + proximity;
      const nearY = pointerY >= rect.top - proximity && pointerY <= rect.bottom + proximity;
      if (nearX && nearY) {
        const rx = pointerX - rect.left;
        const ry = pointerY - rect.top;
        // Compute distance outside rect to fade smoothly
        const dx = pointerX < rect.left ? rect.left - pointerX : pointerX > rect.right ? pointerX - rect.right : 0;
        const dy = pointerY < rect.top ? rect.top - pointerY : pointerY > rect.bottom ? pointerY - rect.bottom : 0;
        const dist = Math.hypot(dx, dy);
        const alpha = dist <= 0 ? 1 : Math.max(0, 1 - dist / proximity);
        el.style.setProperty('--reveal-x', `${rx.toFixed(1)}px`);
        el.style.setProperty('--reveal-y', `${ry.toFixed(1)}px`);
        el.style.setProperty('--reveal-alpha', alpha.toFixed(2));
      } else if (el.style.getPropertyValue('--reveal-alpha') !== '0') {
        el.style.setProperty('--reveal-alpha', '0');
      }
    }
  };

  const schedule = () => {
    if (rafId === null && !document.hidden) {
      rafId = window.requestAnimationFrame(renderFrame);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    pointerX = e.clientX;
    pointerY = e.clientY;
    schedule();
  };

  const onPointerLeave = () => {
    pointerX = -9999;
    pointerY = -9999;
    schedule();
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });

  const stop = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerleave', onPointerLeave);
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    for (let i = 0; i < cachedNodes.length; i++) {
      if (cachedNodes[i].isConnected) {
        cachedNodes[i].style.setProperty('--reveal-alpha', '0');
      }
    }
    cachedNodes = [];
  };

  activeStop = stop;
  return stop;
}
