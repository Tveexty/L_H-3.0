import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Monitor,
  Smartphone,
  Upload,
  History,
  Image as ImageIcon,
  Wrench,
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
  category?: string;
  model?: string;
  engine?: string;
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

interface CircleHistoryItem {
  id: string;
  source_device: string;
  category: string;
  model: string;
  query: string;
  ocr_text: string;
  reply: string;
  thumb_b64?: string;
  colors?: string[];
  time: string;
}

interface LumaLensSearchOverlayProps {
  open: boolean;
  isDark: boolean;
  initialImageSrc?: string | null;
  preferCachedScreen?: boolean;
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

function getCategoryBadge(cat?: string): { icon: string; label: string; cls: string } {
  switch (cat) {
    case 'math':
      return { icon: '📐', label: 'Математика', cls: 'bg-violet-500/20 border-violet-400/40 text-violet-200' };
    case 'code':
      return { icon: '🛠', label: 'Ошибка / Код', cls: 'bg-amber-500/20 border-amber-400/40 text-amber-200' };
    case 'text':
      return { icon: '📝', label: 'Текст / Перевод', cls: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' };
    case 'product':
      return { icon: '🛍', label: 'Товар / Предмет', cls: 'bg-sky-500/20 border-sky-400/40 text-sky-200' };
    case 'place':
      return { icon: '📍', label: 'Место', cls: 'bg-rose-500/20 border-rose-400/40 text-rose-200' };
    case 'vision':
      return { icon: '✨', label: 'Vision AI', cls: 'bg-blue-600/25 border-blue-400/45 text-sky-200' };
    default:
      return { icon: '🔍', label: 'Circle to Search', cls: 'bg-sky-500/20 border-sky-400/40 text-sky-200' };
  }
}

function playCircleChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [587.33, 880, 1174.66].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.045);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.032 / (idx + 1), now + idx * 0.045 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.35);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    // ignore
  }
}

/**
 * Luma OS 1.7.2 (Oxygen) — Unified System + Phone Circle to Search
 * Same ultra-fluid multimodal experience as Phone Mode, deeply integrated into Luma OS & Windows:
 *  - Global Ctrl+Shift+Space captures Chrome/YouTube/Telegram/Games BEFORE bringing Luma OS up
 *  - Sources: Live PC Screen, Local Photo / Ctrl+V Paste, Latest Phone Photo (Oxygen Connect), Photo Studio
 *  - Live token-by-token SSE streaming (no blocking spinner!), Markdown rendering, Synced PC + Phone History!
 */
export const LumaLensSearchOverlay: React.FC<LumaLensSearchOverlayProps> = ({
  open,
  isDark,
  initialImageSrc = null,
  preferCachedScreen = false,
  onClose,
  onAskAI,
  onNotify,
}) => {
  const [capturing, setCapturing] = useState(false);
  const [screenshotSrc, setScreenshotSrc] = useState<string | null>(null);
  const [sourceKind, setSourceKind] = useState<'screen' | 'photo' | 'phone'>('screen');
  const [drawMode, setDrawMode] = useState<'lasso' | 'box'>('lasso');
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [selection, setSelection] = useState<SelectionBox | null>(null);
  const [cropDataUrl, setCropDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<LensResultPayload | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [editableOcr, setEditableOcr] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [strokeWidth, setStrokeWidth] = useState<number>(5);
  const [streaming, setStreaming] = useState(false);
  const [liveReply, setLiveReply] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<CircleHistoryItem[]>([]);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch('/api/kernel/lens/history');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.history)) setHistoryItems(d.history);
      }
    } catch {
      // ignore
    }
  }, []);

  const captureLiveScreen = useCallback((useCached: boolean) => {
    setCapturing(true);
    setSourceKind('screen');
    setSelection(null);
    setResult(null);
    setLiveReply('');
    setCropDataUrl(null);
    fetch(`/api/kernel/capture/screen-now${useCached ? '?prefer_cached=1' : ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data?.image_base64) {
          setScreenshotSrc(data.image_base64);
        } else {
          setScreenshotSrc(null);
        }
      })
      .catch(() => setScreenshotSrc(null))
      .finally(() => setCapturing(false));
  }, []);

  const loadLatestPhonePhoto = async () => {
    try {
      const r = await fetch('/api/kernel/oxygen-connect/status');
      if (!r.ok) return;
      const d = await r.json();
      const inbox = Array.isArray(d?.inbox) ? d.inbox : [];
      const latestImg = inbox.find((f: { is_image?: boolean; path?: string }) => f.is_image && f.path);
      if (!latestImg) {
        onNotify?.('Circle to Search', 'Сначала отправьте фото с телефона через Oxygen Connect', 'info');
        return;
      }
      setScreenshotSrc(`/api/kernel/fs/raw-file?path=${encodeURIComponent(latestImg.path)}&t=${Date.now()}`);
      setSourceKind('phone');
      setSelection(null);
      setResult(null);
      setLiveReply('');
      setCropDataUrl(null);
      onNotify?.('Circle to Search', `Загружено фото с телефона: ${latestImg.name}`, 'success');
    } catch {
      onNotify?.('Circle to Search', 'Нет связи с Oxygen Connect', 'warning');
    }
  };

  const loadLocalFile = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotSrc(String(reader.result || ''));
      setSourceKind('photo');
      setSelection(null);
      setResult(null);
      setLiveReply('');
      setCropDataUrl(null);
    };
    reader.readAsDataURL(file);
  };

  // Boot capture + history sync when opened
  useEffect(() => {
    if (!open) {
      setScreenshotSrc(null);
      setPoints([]);
      setSelection(null);
      setCropDataUrl(null);
      setResult(null);
      setCustomQuery('');
      setEditableOcr('');
      setLiveReply('');
      setStreaming(false);
      setDrawing(false);
      setHistoryOpen(false);
      return;
    }
    void loadHistory();
    if (initialImageSrc) {
      setScreenshotSrc(initialImageSrc);
      setSourceKind('photo');
      setCapturing(false);
    } else {
      captureLiveScreen(preferCachedScreen);
    }
  }, [open, initialImageSrc, preferCachedScreen, captureLiveScreen, loadHistory]);

  // Listen for live Phone Circle to Search history updates & Ctrl+V paste / Escape
  useEffect(() => {
    if (!open) return;
    const onHistUpdate = () => void loadHistory();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find((i) => i.type.startsWith('image/'));
      if (imgItem) {
        const f = imgItem.getAsFile();
        if (f) {
          e.preventDefault();
          loadLocalFile(f);
          onNotify?.('Circle to Search', 'Изображение из буфера обмена загружено — обведите объект!', 'success');
        }
      }
    };
    window.addEventListener('luma-circle-history-updated', onHistUpdate);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('luma-circle-history-updated', onHistUpdate);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('paste', onPaste);
    };
  }, [open, onClose, loadHistory, onNotify]);

  // Draw glowing iridescent lasso trail & selection window on interactive canvas
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = selection ? 'rgba(5, 10, 22, 0.54)' : 'rgba(6, 12, 26, 0.24)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (selection && selection.w > 8 && selection.h > 8) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.roundRect(selection.x, selection.y, selection.w, selection.h, 18);
      ctx.fill();
      ctx.restore();

      const grad = ctx.createLinearGradient(
        selection.x,
        selection.y,
        selection.x + selection.w,
        selection.y + selection.h
      );
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.35, '#2563eb');
      grad.addColorStop(0.7, '#a855f7');
      grad.addColorStop(1, '#22d3ee');

      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.roundRect(selection.x, selection.y, selection.w, selection.h, 18);
      ctx.stroke();
      ctx.restore();
    }

    if (points.length > 1) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.45, '#818cf8');
      grad.addColorStop(0.75, '#c084fc');
      grad.addColorStop(1, '#22d3ee');
      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 22;

      if (drawMode === 'box') {
        const p0 = points[0];
        const p1 = points[points.length - 1];
        ctx.beginPath();
        ctx.roundRect(Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y), 16);
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

  // Exact aspect-aware crop (works accurately for both full-screen & contain-fitted photos!)
  const cropSelectionToBase64 = (box: SelectionBox): string | null => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const ir = img.getBoundingClientRect();
      const sx = Math.max(0, Math.round((box.x - ir.left) * (img.naturalWidth / Math.max(1, ir.width))));
      const sy = Math.max(0, Math.round((box.y - ir.top) * (img.naturalHeight / Math.max(1, ir.height))));
      const sw = Math.max(
        16,
        Math.min(img.naturalWidth - sx, Math.round(box.w * (img.naturalWidth / Math.max(1, ir.width))))
      );
      const sh = Math.max(
        16,
        Math.min(img.naturalHeight - sy, Math.round(box.h * (img.naturalHeight / Math.max(1, ir.height))))
      );
      const off = document.createElement('canvas');
      off.width = Math.min(1024, sw);
      off.height = Math.min(1024, sh);
      const ctx = off.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
        return off.toDataURL('image/jpeg', 0.88);
      }
    }
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
      return off.toDataURL('image/jpeg', 0.85);
    }
    return null;
  };

  // True Live Token-by-Token SSE Streaming (NO blocking spinner hiding output!)
  const runCircleSearchStream = async (opts: {
    imageBase64?: string | null;
    query?: string;
    ocrText?: string;
    saveClip?: boolean;
  }) => {
    setStreaming(true);
    setLiveReply('');
    setResult((prev) => ({
      ...(prev || { ok: true }),
      ok: true,
      error: undefined,
    }));

    try {
      const res = await fetch('/api/kernel/lens/circle-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: opts.imageBase64 ?? cropDataUrl ?? '',
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
                setLiveReply(acc);
              } else if (ev.type === 'done') {
                if (ev.reply && !acc) {
                  acc = String(ev.reply);
                  setLiveReply(acc);
                }
                metaPayload = {
                  ...metaPayload,
                  ok: true,
                  category: ev.category,
                  model: ev.model,
                  engine: ev.engine,
                  ocr_text: ev.ocr_text ?? metaPayload.ocr_text,
                  dominant_colors: ev.dominant_colors || metaPayload.dominant_colors,
                  sources: ev.sources || [],
                  visual_search_urls: ev.visual_search_urls || metaPayload.visual_search_urls,
                  elapsed_ms: ev.elapsed_ms,
                };
                setResult(metaPayload);
                playCircleChime();
                void loadHistory();
              }
            } catch {
              /* ignore */
            }
          }
        }
      } else {
        setResult({ ok: false, error: 'Не удалось связаться с модулем Circle to Search (LumaCore 1.6.2)' });
      }
    } catch {
      setLiveReply('Не удалось связаться с системным модулем Circle to Search.');
    } finally {
      setStreaming(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const pressure = e.pointerType === 'pen' ? Math.max(0.25, Math.min(1, e.pressure || 0.5)) : e.pointerType === 'touch' ? 0.85 : 0.65;
    setStrokeWidth(Math.round(3.5 + pressure * 4));
    const p = { x: e.clientX, y: e.clientY };
    setDrawing(true);
    setHistoryOpen(false);
    setSelection(null);
    setResult(null);
    setLiveReply('');
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
    void runCircleSearchStream({ imageBase64: cropped, query: customQuery.trim() });
  };

  const handleCopyText = (txt: string) => {
    if (!txt) return;
    navigator.clipboard?.writeText(txt).catch(() => {});
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1400);
    onNotify?.('Circle to Search', 'Скопировано в буфер обмена', 'success');
  };

  const openCropInPhotoStudio = async () => {
    if (!cropDataUrl) return;
    try {
      const r = await fetch('/api/kernel/photo/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: `CircleCrop_${Date.now()}.png`,
          format: 'png',
          overwrite: false,
          image_base64: cropDataUrl,
        }),
      });
      const d = await r.json();
      if (d?.ok && d?.path) {
        onClose();
        window.dispatchEvent(
          new CustomEvent('luma-open-internal-file', {
            detail: { path: d.path, mode: 'photo', name: d.name },
          })
        );
      }
    } catch {
      onNotify?.('Circle to Search', 'Не удалось открыть фрагмент в Фотостудии', 'warning');
    }
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

  const panelStyle: React.CSSProperties = (() => {
    if (!selection) {
      return { left: '50%', bottom: 28, transform: 'translateX(-50%)' };
    }
    const panelW = Math.min(470, window.innerWidth - 32);
    const spaceRight = window.innerWidth - (selection.x + selection.w);
    const spaceLeft = selection.x;
    if (spaceRight >= panelW + 24) {
      return {
        left: selection.x + selection.w + 16,
        top: Math.max(76, Math.min(window.innerHeight - 500, selection.y)),
      };
    }
    if (spaceLeft >= panelW + 24) {
      return {
        left: Math.max(16, selection.x - panelW - 16),
        top: Math.max(76, Math.min(window.innerHeight - 500, selection.y)),
      };
    }
    return {
      left: Math.max(16, Math.min(window.innerWidth - panelW - 16, selection.x)),
      bottom: 24,
    };
  })();

  const catBadge = getCategoryBadge(result?.category);

  return (
    <div
      className="fixed inset-0 z-[9960] select-none overflow-hidden"
      style={{ animation: 'lumaFadeIn 180ms ease-out' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f && f.type.startsWith('image/')) loadLocalFile(f);
      }}
    >
      {/* Signature Glowing Circle-to-Search Edge Shimmer Aura */}
      <div
        className="pointer-events-none fixed inset-0 z-20"
        style={{
          boxShadow:
            'inset 0 0 42px rgba(56,189,248,0.42), inset 0 0 95px rgba(37,99,235,0.22)',
        }}
      />

      {/* Backdrop Image (Full Screen for PC Screen capture, Centered Fit for Local/Phone Photo!) */}
      {screenshotSrc ? (
        <div className="absolute inset-0 bg-[#050912] flex items-center justify-center pointer-events-none">
          <img
            ref={imgRef}
            src={screenshotSrc}
            alt=""
            draggable={false}
            className={
              sourceKind === 'screen'
                ? 'w-full h-full object-fill'
                : 'max-w-[92vw] max-h-[82vh] rounded-2xl shadow-2xl object-contain'
            }
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm pointer-events-none" />
      )}

      {/* Interactive Glowing Finger / Mouse / Stylus Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
      />

      {/* Top Unified HarmonyOS / Oxygen Circle to Search HUD Pill */}
      <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-1.5 px-3 py-2 rounded-full border border-sky-400/40 bg-[#0d1322]/90 text-white shadow-[0_18px_55px_rgba(0,0,0,0.68)] backdrop-blur-3xl max-w-[96vw]">
        <div className="flex items-center gap-2 pr-2 border-r border-white/15">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
            <ScanSearch className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-black tracking-tight flex items-center gap-1.5">
              <span>Circle to Search</span>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-600/30 border border-sky-400/35 text-sky-300 text-[9px] font-mono">
                Ctrl+Shift+Space
              </span>
            </div>
            <div className="text-[10px] text-slate-300/75 hidden md:block">
              {capturing ? 'Захват экрана...' : 'Обведите любой объект, текст, ошибку или задачу · Ctrl+V вставка фото'}
            </div>
          </div>
        </div>

        {/* Source Switcher (Exact parity with Phone Mode: PC Screen / Local Photo / Phone Photo!) */}
        <button
          type="button"
          onClick={() => captureLiveScreen(false)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
            sourceKind === 'screen' ? 'bg-[#2563eb] text-white' : 'bg-white/[0.08] text-slate-200 hover:bg-white/15'
          }`}
          title="Захватить текущий экран ПК"
        >
          <Monitor className="w-3.5 h-3.5" /> Экран
        </button>

        <label
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
            sourceKind === 'photo' ? 'bg-[#2563eb] text-white' : 'bg-white/[0.08] text-slate-200 hover:bg-white/15'
          }`}
          title="Загрузить любое фото с ПК (или нажмите Ctrl+V)"
        >
          <Upload className="w-3.5 h-3.5" /> Фото
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              loadLocalFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => void loadLatestPhonePhoto()}
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
            sourceKind === 'phone' ? 'bg-[#2563eb] text-white' : 'bg-white/[0.08] text-slate-200 hover:bg-white/15'
          }`}
          title="Загрузить последнее фото с телефона (Oxygen Connect)"
        >
          <Smartphone className="w-3.5 h-3.5" /> С телефона
        </button>

        {/* Lasso vs Box */}
        <div className="flex items-center gap-0.5 bg-white/[0.06] p-0.5 rounded-full border border-white/10">
          <button
            type="button"
            onClick={() => setDrawMode('lasso')}
            className={`px-2 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
              drawMode === 'lasso' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Lasso className="w-3 h-3" /> Круг
          </button>
          <button
            type="button"
            onClick={() => setDrawMode('box')}
            className={`px-2 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
              drawMode === 'box' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Square className="w-3 h-3" /> Рамка
          </button>
        </div>

        {/* Synced PC + Phone History Drawer Button */}
        <button
          type="button"
          onClick={() => {
            setHistoryOpen((v) => !v);
            void loadHistory();
          }}
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
            historyOpen ? 'bg-violet-600 text-white' : 'bg-white/[0.08] text-slate-200 hover:bg-white/15'
          }`}
          title="Общая история Circle to Search (ПК + Телефон)"
        >
          <History className="w-3.5 h-3.5" /> {historyItems.length > 0 ? historyItems.length : 'История'}
        </button>

        {selection && (
          <button
            type="button"
            onClick={() => {
              setSelection(null);
              setResult(null);
              setLiveReply('');
              setCropDataUrl(null);
              setEditableOcr('');
            }}
            className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
          >
            <RotateCcw className="w-3 h-3" /> Заново
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 flex items-center justify-center cursor-pointer transition"
          title="Закрыть (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Synced PC + Phone Circle to Search History Popover */}
      {historyOpen && (
        <div
          className="absolute top-16 right-4 z-40 w-[360px] max-w-[92vw] max-h-[70vh] rounded-[26px] border border-sky-400/30 bg-[#0d1322]/95 text-white shadow-2xl backdrop-blur-3xl flex flex-col overflow-hidden"
        >
          <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-black flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-sky-400" /> Общая история (ПК + Телефон)
            </span>
            <button onClick={() => setHistoryOpen(false)} className="p-1 rounded-full hover:bg-white/10 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {historyItems.length === 0 ? (
              <div className="text-center py-8 text-xs opacity-60">
                История пуста. Обведите область на ПК или смартфоне — результаты синхронизируются автоматически!
              </div>
            ) : (
              historyItems.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setSelection({ x: 80, y: 110, w: 220, h: 140 });
                    setCropDataUrl(h.thumb_b64 || null);
                    setLiveReply(h.reply);
                    setEditableOcr(h.ocr_text || '');
                    setResult({
                      ok: true,
                      category: h.category,
                      model: h.model,
                      ocr_text: h.ocr_text,
                      dominant_colors: h.colors || [],
                    });
                    setHistoryOpen(false);
                  }}
                  className="w-full p-2.5 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] text-left flex items-start gap-2.5 cursor-pointer transition"
                >
                  {h.thumb_b64 ? (
                    <img src={h.thumb_b64} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/15" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-blue-600/25 border border-blue-400/30 flex items-center justify-center shrink-0">
                      {h.source_device === 'phone' ? <Smartphone className="w-4 h-4 text-sky-300" /> : <Monitor className="w-4 h-4 text-sky-300" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono opacity-75">
                      <span className="text-sky-300 font-bold">
                        {h.source_device === 'phone' ? '📱 Телефон' : '🖥 ПК'} · {getCategoryBadge(h.category).label}
                      </span>
                      <span>{h.time}</span>
                    </div>
                    <div className="text-[11px] font-semibold line-clamp-2 mt-0.5 text-white/90">
                      {h.reply.replace(/\*\*/g, '').slice(0, 120)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom Floating Query Pill before circling */}
      {!selection && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[540px] max-w-[92vw] px-3.5 py-2.5 rounded-full border border-sky-400/35 bg-[#0d1322]/92 text-white shadow-[0_18px_60px_rgba(0,0,0,0.7)] backdrop-blur-3xl flex items-center gap-2">
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customQuery.trim()) {
                setSelection({ x: 80, y: 110, w: 220, h: 120 });
                void runCircleSearchStream({ imageBase64: cropDataUrl, query: customQuery.trim() });
              }
            }}
            placeholder="Обведите объект на экране или введите вопрос (математика, перевод, код)..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
          />
          {customQuery.trim() && (
            <button
              type="button"
              onClick={() => {
                setSelection({ x: 80, y: 110, w: 220, h: 120 });
                void runCircleSearchStream({ imageBase64: cropDataUrl, query: customQuery.trim() });
              }}
              className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-bold cursor-pointer"
            >
              Найти
            </button>
          )}
        </div>
      )}

      {/* Sleek Phone-Parity Floating Circle to Search Result Card */}
      {selection && (
        <div
          style={panelStyle}
          className={`absolute z-30 w-[465px] max-w-[92vw] max-h-[78vh] rounded-[28px] border shadow-[0_28px_90px_rgba(0,0,0,0.8)] backdrop-blur-3xl flex flex-col overflow-hidden ${
            isDark
              ? 'bg-[#0c1220]/95 border-sky-400/35 text-slate-100'
              : 'bg-white/96 border-slate-300 text-slate-900'
          }`}
        >
          {/* Header with Cropped Preview + Category Badge + Palette */}
          <div className={`p-3 border-b flex items-center gap-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
            {cropDataUrl && (
              <img
                src={cropDataUrl}
                alt="Выделенная область"
                className="w-16 h-16 rounded-2xl object-cover border border-white/20 shrink-0 bg-black/30"
              />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold inline-flex items-center gap-1 ${catBadge.cls}`}>
                  <span>{catBadge.icon}</span>
                  <span>{catBadge.label}</span>
                </span>
                <span className="text-[10px] font-mono opacity-65 truncate">
                  {streaming ? 'Анализ…' : result?.elapsed_ms !== undefined ? `${result.elapsed_ms} мс` : ''}
                </span>
              </div>
              <div className="text-[11px] font-bold truncate opacity-85">
                {result?.model || 'Circle to Search · Luma Vision'}
              </div>
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
                      className="w-4 h-4 rounded-full border border-white/30 cursor-pointer transition hover:scale-115 relative"
                      style={{ backgroundColor: hex }}
                    >
                      {copiedColor === hex && <Check className="w-2.5 h-2.5 text-white drop-shadow absolute inset-0 m-auto" />}
                    </button>
                  ))}
                  {copiedColor && <span className="text-[9px] font-mono text-emerald-400 ml-1">{copiedColor}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Body — Streams Immediately Without Blocking! */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {/* Primary Circle to Search Visual Answer (Live SSE Markdown!) */}
            <div className={`p-3.5 rounded-2xl border space-y-2 ${isDark ? 'bg-blue-600/10 border-sky-400/30' : 'bg-sky-50 border-sky-200'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-mono uppercase text-sky-400 font-bold flex items-center gap-1.5">
                  {streaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>{streaming ? 'Анализирую выделенную область…' : 'Ответ Circle to Search'}</span>
                </div>
                {liveReply && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(liveReply)}
                    className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedText ? 'Скопировано' : 'Копировать'}
                  </button>
                )}
              </div>

              <div className="leading-relaxed text-xs space-y-1">
                {!liveReply && streaming ? (
                  <div className="py-2 flex items-center gap-2 opacity-75">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span>Определяю объект, текст и контекст…</span>
                  </div>
                ) : (
                  liveReply.split('\n').map((line, lineIdx) => {
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
                                    isDark ? 'bg-black/45 text-cyan-300' : 'bg-slate-200 text-slate-900'
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

            {/* Instant Follow-Up Refinement Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = customQuery.trim() || editableOcr.trim();
                if (!q) return;
                void runCircleSearchStream({ imageBase64: cropDataUrl, query: q, ocrText: editableOcr });
              }}
              className="flex items-center gap-1.5"
            >
              <input
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Уточнить: «переведи», «как исправить», «что за модель»..."
                className={`flex-1 px-3 py-1.5 rounded-full border text-xs outline-none ${
                  isDark ? 'bg-black/40 border-white/15 focus:border-sky-400' : 'bg-slate-50 border-slate-300 focus:border-blue-500'
                }`}
              />
              <button
                type="submit"
                disabled={streaming}
                className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shrink-0"
              >
                Спросить
              </button>
            </form>

            {/* Quick Smart Action Chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={streaming}
                onClick={() =>
                  void runCircleSearchStream({
                    imageBase64: cropDataUrl,
                    query: 'Извлеки весь текст и переведи на русский язык',
                    ocrText: editableOcr,
                  })
                }
                className="px-2.5 py-1.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/35 text-indigo-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
              >
                <Languages className="w-3.5 h-3.5" /> Перевести на RU
              </button>
              <button
                type="button"
                disabled={streaming}
                onClick={() =>
                  void runCircleSearchStream({
                    imageBase64: cropDataUrl,
                    query: 'Объясни причину ошибки или кода и дай точный шаг исправления',
                    ocrText: editableOcr,
                  })
                }
                className="px-2.5 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/35 text-amber-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
              >
                <Wrench className="w-3.5 h-3.5" /> Исправить ошибку
              </button>
              {cropDataUrl && (
                <button
                  type="button"
                  onClick={() => void openCropInPhotoStudio()}
                  className="px-2.5 py-1.5 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> В Фотостудию
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  void runCircleSearchStream({
                    imageBase64: cropDataUrl,
                    query: customQuery.trim() || editableOcr.trim(),
                    saveClip: true,
                  })
                }
                className="px-2.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/35 text-emerald-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
              >
                <Download className="w-3.5 h-3.5" /> Сохранить
              </button>
              {onAskAI && (
                <button
                  type="button"
                  onClick={() => {
                    const q = customQuery.trim() || editableOcr.trim() || liveReply.slice(0, 300) || 'Разбери выделенный фрагмент';
                    onAskAI(q);
                    onClose();
                  }}
                  className="px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" /> В чат ИИ
                </button>
              )}
            </div>

            {/* Editable OCR Text (when text was detected) */}
            {(editableOcr || result?.ocr_text) && (
              <div className={`p-2.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                    Извлечённый текст (OCR)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(editableOcr || result?.ocr_text || '')}
                    className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Копировать
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={editableOcr}
                  onChange={(e) => setEditableOcr(e.target.value)}
                  className={`w-full rounded-xl p-1.5 text-xs outline-none resize-none border ${
                    isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'
                  }`}
                />
              </div>
            )}

            {result?.error && (
              <div className="p-2.5 rounded-2xl border border-rose-500/35 bg-rose-500/10 text-rose-300 text-xs">
                {result.error}
              </div>
            )}

            {/* Verified Web Sources */}
            {result?.sources && result.sources.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                  Источники ({result.sources.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.sources.map((src, i) => (
                    <button
                      key={`${src.url}_${i}`}
                      type="button"
                      onClick={() => openExternalUrl(src.url)}
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
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
                  Открыть визуальный поиск в сети
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.visual_search_urls.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => openExternalUrl(v.url)}
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
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
          </div>
        </div>
      )}
    </div>
  );
};
