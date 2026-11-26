import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  X,
  Copy,
  Check,
  Languages,
  Sparkles,
  ExternalLink,
  Download,
  RotateCcw,
  Loader2,
  ScanSearch,
  Palette,
  Lasso,
  Square,
} from 'lucide-react';

interface LensSourceItem {
  title: string;
  url: string;
  provider: string;
  snippet?: string;
}

interface LensVisualLink {
  name: string;
  url: string;
}

interface LensResultPayload {
  ok: boolean;
  width?: number;
  height?: number;
  dominant_colors?: string[];
  ocr_text?: string;
  query_used?: string;
  translation?: string;
  reply?: string;
  sources?: LensSourceItem[];
  visual_search_urls?: LensVisualLink[];
  saved_path?: string;
  elapsed_ms?: number;
  error?: string;
}

interface LumaLensSearchOverlayProps {
  open: boolean;
  isDark: boolean;
  onClose: () => void;
  onAskAI?: (prompt: string) => void;
  onNotify?: (title: string, message: string, level?: 'info' | 'success' | 'warning') => void;
}

interface Point {
  x: number;
  y: number;
}

interface SelectionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Luma OS 1.6.2 (Nitrogen) — «Luma Обвести для поиска»
 * Interactive full-screen visual search: circle/lasso or box any area on screen,
 * run native offline OCR (RU+EN), extract dominant colors, translate, search the web,
 * or ask Luma AI 5.0 Nexus in one motion.
 */
export const LumaLensSearchOverlay: React.FC<LumaLensSearchOverlayProps> = ({
  open,
  isDark,
  onClose,
  onAskAI,
  onNotify,
}) => {
  const [capturing, setCapturing] = useState(false);
  const [screenshotSrc, setScreenshotSrc] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<'lasso' | 'box'>('lasso');
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [selection, setSelection] = useState<SelectionBox | null>(null);
  const [cropDataUrl, setCropDataUrl] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<LensResultPayload | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [editableOcr, setEditableOcr] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [nitrogenLoading, setNitrogenLoading] = useState(false);
  const [nitrogenReply, setNitrogenReply] = useState('');

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Capture live desktop frame immediately when opened
  useEffect(() => {
    if (!open) {
      setScreenshotSrc(null);
      setPoints([]);
      setSelection(null);
      setCropDataUrl(null);
      setResult(null);
      setCustomQuery('');
      setEditableOcr('');
      setNitrogenReply('');
      setNitrogenLoading(false);
      setDrawing(false);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setCapturing(true);
    fetch('/api/kernel/capture/screen-now')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok && data?.image_base64) {
          setScreenshotSrc(data.image_base64);
        } else {
          setScreenshotSrc(null);
        }
      })
      .catch(() => {
        if (!cancelled) setScreenshotSrc(null);
      })
      .finally(() => {
        if (!cancelled) setCapturing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Escape closes overlay cleanly
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  // Draw glowing lasso trail & selection box on interactive canvas
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle dark scrim
    ctx.fillStyle = selection ? 'rgba(4, 8, 18, 0.52)' : 'rgba(6, 12, 26, 0.28)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cut out highlighted selection area
    if (selection && selection.w > 8 && selection.h > 8) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.roundRect(selection.x, selection.y, selection.w, selection.h, 16);
      ctx.fill();
      ctx.restore();

      // Glowing Nitrogen cyan/violet border around selected region
      const grad = ctx.createLinearGradient(
        selection.x,
        selection.y,
        selection.x + selection.w,
        selection.y + selection.h
      );
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.5, '#818cf8');
      grad.addColorStop(1, '#22d3ee');

      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(selection.x, selection.y, selection.w, selection.h, 16);
      ctx.stroke();
      ctx.restore();
    }

    // Glowing freehand stroke while drawing (adapts to stylus pressure)
    if (points.length > 1) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.5, '#c084fc');
      grad.addColorStop(1, '#22d3ee');
      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 20;

      if (drawMode === 'box') {
        const p0 = points[0];
        const p1 = points[points.length - 1];
        const bx = Math.min(p0.x, p1.x);
        const by = Math.min(p0.y, p1.y);
        const bw = Math.abs(p1.x - p0.x);
        const bh = Math.abs(p1.y - p0.y);
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 14);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [open, points, selection, drawMode, strokeWidth]);

  const cropSelectionToBase64 = (box: SelectionBox): string | null => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const scaleX = img.naturalWidth / window.innerWidth;
      const scaleY = img.naturalHeight / window.innerHeight;
      const sx = Math.max(0, Math.round(box.x * scaleX));
      const sy = Math.max(0, Math.round(box.y * scaleY));
      const sw = Math.max(16, Math.min(img.naturalWidth - sx, Math.round(box.w * scaleX)));
      const sh = Math.max(16, Math.min(img.naturalHeight - sy, Math.round(box.h * scaleY)));
      const off = document.createElement('canvas');
      off.width = sw;
      off.height = sh;
      const ctx = off.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        return off.toDataURL('image/png');
      }
    }
    // Fallback synthetic preview card when running headless without OS framebuffer capture
    const off = document.createElement('canvas');
    off.width = Math.max(64, Math.min(640, Math.round(box.w)));
    off.height = Math.max(64, Math.min(480, Math.round(box.h)));
    const ctx = off.getContext('2d');
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, off.width, off.height);
      g.addColorStop(0, '#0f172a');
      g.addColorStop(1, '#1e3a5f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, off.width, off.height);
      return off.toDataURL('image/png');
    }
    return null;
  };

  const runCircleSearchStream = async (opts: {
    imageBase64?: string | null;
    query?: string;
    ocrText?: string;
    saveClip?: boolean;
  }) => {
    setNitrogenLoading(true);
    setSearching(true);
    setNitrogenReply('');
    try {
      const res = await fetch('/api/kernel/lens/circle-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: opts.imageBase64 || cropDataUrl || '',
          query: (opts.query || '').trim(),
          ocr_text: opts.ocrText || '',
          source_device: 'pc',
          save_clip: Boolean(opts.saveClip),
          stream: true,
        }),
      });
      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let acc = '';
        let metaPayload: LensResultPayload = { ok: true };
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            try {
              const ev = JSON.parse(line.slice(5).trim());
              if (ev.type === 'meta') {
                metaPayload = {
                  ...metaPayload,
                  ok: true,
                  ocr_text: ev.ocr_text || '',
                  dominant_colors: ev.dominant_colors || [],
                  width: ev.width,
                  height: ev.height,
                  saved_path: ev.saved_path,
                  visual_search_urls: ev.visual_search_urls || [],
                };
                setResult(metaPayload);
                if (ev.ocr_text && !opts.query) setEditableOcr(ev.ocr_text);
                if (opts.saveClip && ev.saved_path) {
                  onNotify?.('Circle to Search', `Фрагмент сохранён: ${ev.saved_path}`, 'success');
                }
              } else if (ev.type === 'token' && (ev.content || ev.text)) {
                acc += String(ev.content || ev.text);
                setNitrogenReply(acc);
              } else if (ev.type === 'done') {
                if (ev.reply && !acc) {
                  acc = String(ev.reply);
                  setNitrogenReply(acc);
                }
                metaPayload = {
                  ...metaPayload,
                  ok: true,
                  ocr_text: ev.ocr_text ?? metaPayload.ocr_text,
                  dominant_colors: ev.dominant_colors || metaPayload.dominant_colors,
                  sources: ev.sources || [],
                  visual_search_urls: ev.visual_search_urls || metaPayload.visual_search_urls,
                  elapsed_ms: ev.elapsed_ms,
                };
                setResult(metaPayload);
              }
            } catch {
              /* ignore */
            }
          }
        }
      } else {
        setResult({ ok: false, error: 'Не удалось связаться с модулем Circle to Search (LumaCore 1.6.1)' });
      }
    } catch {
      setNitrogenReply('Не удалось связаться с системным модулем Circle to Search.');
    } finally {
      setNitrogenLoading(false);
      setSearching(false);
    }
  };

  const askNitrogenInline = async (queryText: string) => {
    await runCircleSearchStream({
      imageBase64: cropDataUrl,
      query: queryText,
      ocrText: editableOcr || result?.ocr_text || '',
    });
  };

  const runLensRequest = async (opts: {
    imageBase64?: string | null;
    query?: string;
    translateTo?: string;
    saveClip?: boolean;
  }) => {
    if (opts.translateTo || opts.saveClip) {
      setSearching(true);
      try {
        const r = await fetch('/api/kernel/lens/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: opts.imageBase64 || '',
            query: opts.query || '',
            translate_to: opts.translateTo || '',
            save_clip: Boolean(opts.saveClip),
          }),
        });
        const data: LensResultPayload = await r.json();
        setResult((prev) => ({ ...(prev || {}), ...data }));
        if (data?.ocr_text && !opts.query) {
          setEditableOcr(data.ocr_text);
        }
        if (opts.saveClip && data?.saved_path) {
          onNotify?.('Circle to Search', `Фрагмент сохранён: ${data.saved_path}`, 'success');
        }
      } catch {
        setResult({ ok: false, error: 'Не удалось связаться с модулем поиска LumaCore 1.6.1' });
      } finally {
        setSearching(false);
      }
      return;
    }
    await runCircleSearchStream({
      imageBase64: opts.imageBase64,
      query: opts.query,
      ocrText: editableOcr,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    // Adapt glowing brush width to stylus (pen) pressure or finger touch
    const pressure = e.pointerType === 'pen' ? Math.max(0.25, Math.min(1, e.pressure || 0.5)) : e.pointerType === 'touch' ? 0.85 : 0.6;
    setStrokeWidth(Math.round(3 + pressure * 4));
    const p = { x: e.clientX, y: e.clientY };
    setDrawing(true);
    setSelection(null);
    setResult(null);
    setNitrogenReply('');
    setCropDataUrl(null);
    setPoints([p]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    e.preventDefault();
    if (e.pointerType === 'pen' && e.pressure > 0) {
      setStrokeWidth(Math.round(2.5 + Math.min(1, e.pressure) * 5));
    }
    setPoints((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 3) return prev;
      return [...prev, { x: e.clientX, y: e.clientY }];
    });
  };

  const handlePointerUp = () => {
    if (!drawing) return;
    setDrawing(false);
    if (points.length < 2) {
      setPoints([]);
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = 6;
    const x = Math.max(0, minX - pad);
    const y = Math.max(0, minY - pad);
    const w = Math.min(window.innerWidth - x, maxX - minX + pad * 2);
    const h = Math.min(window.innerHeight - y, maxY - minY + pad * 2);
    setPoints([]);
    if (w < 18 || h < 18) return;

    const box = { x, y, w, h };
    setSelection(box);
    const cropped = cropSelectionToBase64(box);
    setCropDataUrl(cropped);
    // Luma OS 1.7.1: Immediately run full Multimodal Circle to Search analysis on the circled area!
    void runCircleSearchStream({ imageBase64: cropped, query: customQuery.trim() });
  };

  const handleCopyText = (txt: string) => {
    if (!txt) return;
    navigator.clipboard?.writeText(txt).catch(() => {});
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1400);
    onNotify?.('Luma Обвести для поиска', 'Текст скопирован в буфер обмена', 'success');
  };

  const openExternalUrl = (url: string) => {
    fetch('/api/kernel/open-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: url }),
    }).catch(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  };

  if (!open) return null;

  // Smart positioning of floating result drawer beside or below selection
  const panelStyle: React.CSSProperties = (() => {
    if (!selection) {
      return { left: '50%', bottom: 28, transform: 'translateX(-50%)' };
    }
    const panelW = Math.min(460, window.innerWidth - 32);
    const spaceRight = window.innerWidth - (selection.x + selection.w);
    const spaceLeft = selection.x;
    if (spaceRight >= panelW + 24) {
      return {
        left: selection.x + selection.w + 16,
        top: Math.max(72, Math.min(window.innerHeight - 480, selection.y)),
      };
    }
    if (spaceLeft >= panelW + 24) {
      return {
        left: Math.max(16, selection.x - panelW - 16),
        top: Math.max(72, Math.min(window.innerHeight - 480, selection.y)),
      };
    }
    return {
      left: Math.max(16, Math.min(window.innerWidth - panelW - 16, selection.x)),
      bottom: 24,
    };
  })();

  return (
    <div
      className="fixed inset-0 z-[9960] select-none overflow-hidden"
      style={{ animation: 'lumaFadeIn 180ms ease-out' }}
    >
      {/* Captured Live Screen Frame (when native BitBlt capture succeeded) */}
      {screenshotSrc ? (
        <img
          ref={imgRef}
          src={screenshotSrc}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        />
      ) : (
        <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none" />
      )}

      {/* Interactive Glow Lasso / Box Drawing Canvas (Mouse, Touch & Stylus Pressure) */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
      />

      {/* Top Floating Nitrogen Lens HUD Pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-sky-400/35 bg-slate-950/88 text-white shadow-[0_16px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 pr-2 border-r border-white/15">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <ScanSearch className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-black tracking-tight flex items-center gap-1.5">
              <span>Luma Обвести для поиска</span>
              <span className="px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 text-[9px] font-mono">Ai Nitrogen</span>
            </div>
            <div className="text-[10px] text-slate-300/80">
              {capturing
                ? 'Захват экрана...'
                : 'Обведите мышью, пальцем или стилусом любую область экрана · Esc — выход'}
            </div>
          </div>
        </div>

        {/* Mode Switch: Lasso vs Box */}
        <div className="flex items-center gap-1 bg-white/[0.06] p-0.5 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setDrawMode('lasso')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
              drawMode === 'lasso' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
            title="Свободное обведение кругом / лассо"
          >
            <Lasso className="w-3.5 h-3.5" />
            <span>Круг</span>
          </button>
          <button
            type="button"
            onClick={() => setDrawMode('box')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
              drawMode === 'box' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
            title="Прямоугольная рамка"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Рамка</span>
          </button>
        </div>

        {selection && (
          <button
            type="button"
            onClick={() => {
              setSelection(null);
              setResult(null);
              setCropDataUrl(null);
              setEditableOcr('');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
            title="Обвести другую область"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Заново</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 cursor-pointer transition"
          title="Закрыть (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Search Bar when nothing is selected yet (allows quick text query too) */}
      {!selection && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[520px] max-w-[92vw] px-3 py-2 rounded-2xl border border-white/20 bg-slate-950/88 text-white shadow-2xl backdrop-blur-2xl flex items-center gap-2"
        >
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customQuery.trim()) {
                setSelection({ x: 60, y: 90, w: 220, h: 120 });
                void runLensRequest({ query: customQuery.trim() });
              }
            }}
            placeholder="Обведите объект на экране или введите уточняющий вопрос..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
          />
          {customQuery.trim() && (
            <button
              type="button"
              onClick={() => {
                setSelection({ x: 60, y: 90, w: 220, h: 120 });
                void runLensRequest({ query: customQuery.trim() });
              }}
              className="px-3 py-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-bold cursor-pointer"
            >
              Найти
            </button>
          )}
        </div>
      )}

      {/* Results Frosted Glass Card */}
      {selection && (
        <div
          style={panelStyle}
          className={`absolute z-30 w-[450px] max-w-[92vw] max-h-[78vh] rounded-2xl border shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-2xl flex flex-col overflow-hidden ${
            isDark
              ? 'bg-slate-950/94 border-sky-400/30 text-slate-100'
              : 'bg-white/95 border-slate-300 text-slate-900'
          }`}
        >
          {/* Card Header with Cropped Preview + Palette */}
          <div className={`p-3 border-b flex items-center gap-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
            {cropDataUrl && (
              <img
                src={cropDataUrl}
                alt="Выделенная область"
                className="w-16 h-16 rounded-xl object-cover border border-white/20 shrink-0 bg-black/30"
              />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Результаты Luma Lens
                </span>
                {result?.elapsed_ms !== undefined && (
                  <span className="text-[10px] font-mono opacity-60">{result.elapsed_ms} мс</span>
                )}
              </div>
              {result?.width && result?.height && (
                <div className="text-[10px] font-mono opacity-65">
                  Область: {result.width}×{result.height} px
                </div>
              )}
              {result?.dominant_colors && result.dominant_colors.length > 0 && (
                <div className="flex items-center gap-1 pt-0.5">
                  <Palette className="w-3 h-3 opacity-60 shrink-0" />
                  {result.dominant_colors.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(hex).catch(() => {});
                        setCopiedColor(hex);
                        setTimeout(() => setCopiedColor(null), 1200);
                      }}
                      title={`Скопировать цвет ${hex}`}
                      className="w-4 h-4 rounded-md border border-white/30 cursor-pointer transition hover:scale-110 relative"
                      style={{ backgroundColor: hex }}
                    >
                      {copiedColor === hex && (
                        <Check className="w-3 h-3 text-white drop-shadow absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                  {copiedColor && <span className="text-[9px] font-mono text-emerald-400 ml-1">{copiedColor}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {searching ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-sky-400">
                <Loader2 className="w-7 h-7 animate-spin" />
                <div className="font-bold text-xs">Распознаём текст (OCR) и ищем в интернете...</div>
                <div className="text-[10px] opacity-70">Luma AI 5.0 Nexus · Мульти-источники</div>
              </div>
            ) : (
              <>
                {/* Follow-up / Custom Query Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = (customQuery.trim() || editableOcr.trim());
                    if (!q) return;
                    void runLensRequest({ imageBase64: cropDataUrl, query: q });
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="Уточнить поиск или спросить о выделенном..."
                    className={`flex-1 px-2.5 py-1.5 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-black/40 border-white/15 focus:border-sky-400' : 'bg-slate-50 border-slate-300 focus:border-sky-500'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    Найти
                  </button>
                </form>

                {/* Recognized OCR Text Block */}
                {(editableOcr || result?.ocr_text) && (
                  <div className={`p-2.5 rounded-xl border space-y-1.5 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                        Распознанный текст (OCR)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyText(editableOcr || result?.ocr_text || '')}
                          className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedText ? 'Скопировано' : 'Копировать'}
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={editableOcr}
                      onChange={(e) => setEditableOcr(e.target.value)}
                      className={`w-full rounded-lg p-1.5 text-xs outline-none resize-none border ${
                        isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                )}

                {/* Quick Action Chips */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      void runLensRequest({
                        imageBase64: cropDataUrl,
                        query: customQuery.trim() || editableOcr.trim(),
                        translateTo: 'ru',
                      })
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    Перевести
                  </button>
                  <button
                    type="button"
                    disabled={nitrogenLoading}
                    onClick={() => {
                      const q = customQuery.trim() || editableOcr.trim() || 'Помоги разобрать выделенный фрагмент экрана';
                      void askNitrogenInline(q);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:brightness-110 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {nitrogenLoading ? 'Ai Nitrogen думает…' : 'Спросить Luma Ai Nitrogen'}
                  </button>
                  {onAskAI && (
                    <button
                      type="button"
                      onClick={() => {
                        const q = customQuery.trim() || editableOcr.trim() || 'Помоги разобрать выделенный фрагмент экрана';
                        onAskAI(q);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Открыть чат ИИ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      void runLensRequest({
                        imageBase64: cropDataUrl,
                        query: customQuery.trim() || editableOcr.trim(),
                        saveClip: true,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Сохранить PNG
                  </button>
                </div>

                {/* Live Streaming Reply from Circle to Search Visual Engine */}
                {(nitrogenLoading || nitrogenReply) && (
                  <div className={`p-3.5 rounded-2xl border space-y-2 ${isDark ? 'bg-sky-500/10 border-sky-400/35' : 'bg-sky-50 border-sky-300'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] font-mono uppercase text-sky-400 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Circle to Search · Визуальный анализ</span>
                      </div>
                      {nitrogenReply && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(nitrogenReply)}
                          className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-2.5 h-2.5" /> Копировать
                        </button>
                      )}
                    </div>
                    <div className="leading-relaxed text-xs space-y-1">
                      {!nitrogenReply ? (
                        <span className="opacity-75 animate-pulse">Анализирую выделенную область…</span>
                      ) : (
                        nitrogenReply.split('\n').map((line, lineIdx) => {
                          const trimmed = line.trim();
                          if (!trimmed) return <div key={lineIdx} className="h-1" />;
                          const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ');
                          const content = isBullet ? trimmed.slice(2) : trimmed;
                          const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
                          return (
                            <div key={lineIdx} className={isBullet ? 'flex items-start gap-1.5 pl-1' : ''}>
                              {isBullet && <span className="text-sky-400 font-bold select-none">•</span>}
                              <span className="break-words">
                                {parts.map((part, pIdx) => {
                                  if (part.startsWith('**') && part.endsWith('**')) {
                                    return (
                                      <strong key={pIdx} className={isDark ? 'text-sky-200 font-extrabold' : 'text-slate-900 font-extrabold'}>
                                        {part.slice(2, -2)}
                                      </strong>
                                    );
                                  }
                                  if (part.startsWith('`') && part.endsWith('`')) {
                                    return (
                                      <code
                                        key={pIdx}
                                        className={`px-1 py-0.5 rounded font-mono text-[11px] ${
                                          isDark ? 'bg-black/40 text-cyan-300' : 'bg-slate-200 text-slate-900'
                                        }`}
                                      >
                                        {part.slice(1, -1)}
                                      </code>
                                    );
                                  }
                                  return <React.Fragment key={pIdx}>{part}</React.Fragment>;
                                })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Live Translation Block */}
                {result?.translation && (
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-indigo-500/10 border-indigo-400/25' : 'bg-indigo-50 border-indigo-200'}`}>
                    <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold mb-1">Перевод</div>
                    <div className="whitespace-pre-wrap leading-relaxed">{result.translation}</div>
                  </div>
                )}

                {/* AI 5.0 Nexus Reply */}
                {result?.reply && (
                  <div className={`p-3 rounded-xl border leading-relaxed whitespace-pre-wrap ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    {result.reply}
                  </div>
                )}

                {result?.error && (
                  <div className="p-2.5 rounded-xl border border-rose-500/35 bg-rose-500/10 text-rose-300 text-xs">
                    {result.error}
                  </div>
                )}

                {/* Verified Web Sources */}
                {result?.sources && result.sources.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                      Источники из интернета ({result.sources.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.sources.map((src, i) => (
                        <button
                          key={`${src.url}_${i}`}
                          type="button"
                          onClick={() => openExternalUrl(src.url)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                            isDark
                              ? 'bg-sky-500/10 border-sky-400/25 text-sky-300 hover:bg-sky-500/20'
                              : 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100'
                          }`}
                        >
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          <span className="font-bold opacity-80">{src.provider}:</span>
                          <span className="truncate max-w-[170px]">{src.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual Search Engines */}
                {result?.visual_search_urls && result.visual_search_urls.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-white/10">
                    <div className="text-[10px] font-mono uppercase tracking-wider opacity-65 font-bold">
                      Визуальный поиск в сети
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.visual_search_urls.map((v) => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => openExternalUrl(v.url)}
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                            isDark
                              ? 'bg-white/[0.06] border-white/15 hover:bg-white/15'
                              : 'bg-slate-100 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
