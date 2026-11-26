import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crop,
  Download,
  Eraser,
  FlipHorizontal,
  FlipVertical,
  FolderOpen,
  Highlighter,
  Image as ImageIcon,
  Layers,
  Minus,
  MoveRight,
  Paintbrush,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Send,
  Sliders,
  Sparkles,
  SplitSquareHorizontal,
  Square,
  Type,
  Undo2,
  Wand2,
} from 'lucide-react';

export interface LumaPhotoEditorProps {
  initialPath?: string;
  isDark: boolean;
  isPro?: boolean;
  onSetWallpaper?: (dataUrl: string) => void;
  onPushToast: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
}

type EditorTool = 'adjust' | 'filters' | 'crop' | 'brush' | 'highlighter' | 'arrow' | 'rect' | 'text' | 'mosaic';

interface PhotoAdjustments {
  brightness: number; // 50..180 (100 default)
  contrast: number;   // 50..180
  saturate: number;   // 0..220
  warmth: number;     // -50..50
  hue: number;        // -180..180
  blur: number;       // 0..12
  vignette: number;   // 0..85
}

const DEFAULT_ADJ: PhotoAdjustments = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  warmth: 0,
  hue: 0,
  blur: 0,
  vignette: 0,
};

interface FilterPreset {
  id: string;
  name: string;
  adj: Partial<PhotoAdjustments>;
  cssExtra?: string;
}

const FILTER_PRESETS: FilterPreset[] = [
  { id: 'orig', name: 'Оригинал', adj: {} },
  { id: 'oxygen', name: 'Oxygen Cryo', adj: { brightness: 104, contrast: 112, saturate: 118, warmth: -18, vignette: 12 } },
  { id: 'cinema', name: 'Кино 35mm', adj: { brightness: 96, contrast: 122, saturate: 90, warmth: 12, vignette: 35 } },
  { id: 'noir', name: 'Ч/Б Нуар', adj: { brightness: 102, contrast: 138, saturate: 0, vignette: 40 } },
  { id: 'neon', name: 'Неон Кибер', adj: { brightness: 106, contrast: 125, saturate: 165, hue: -14, vignette: 20 } },
  { id: 'sunset', name: 'Тёплый Закат', adj: { brightness: 105, contrast: 108, saturate: 132, warmth: 32, vignette: 18 } },
  { id: 'vintage', name: 'Винтаж', adj: { brightness: 98, contrast: 92, saturate: 78, warmth: 26, vignette: 45 } },
  { id: 'drama', name: 'Драма', adj: { brightness: 92, contrast: 145, saturate: 85, vignette: 55 } },
  { id: 'hdr', name: 'Сочный HDR', adj: { brightness: 104, contrast: 128, saturate: 152, vignette: 10 } },
  { id: 'pastel', name: 'Пастель', adj: { brightness: 114, contrast: 86, saturate: 88, warmth: 8 } },
  { id: 'nordic', name: 'Север', adj: { brightness: 102, contrast: 114, saturate: 82, warmth: -28, vignette: 22 } },
  { id: 'matte', name: 'Матовый', adj: { brightness: 106, contrast: 84, saturate: 94, warmth: 10, vignette: 16 } },
];

const DRAW_COLORS = ['#38bdf8', '#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#ffffff', '#111827'];

export const LumaPhotoEditorWindow: React.FC<LumaPhotoEditorProps> = ({
  initialPath,
  isDark,
  isPro = true,
  onSetWallpaper,
  onPushToast,
}) => {
  const [filePath, setFilePath] = useState<string>(initialPath || '');
  const [fileName, setFileName] = useState<string>(
    initialPath ? initialPath.split(/[\\/]/).pop() || 'Фото' : 'Новый холст Luma Photo Studio'
  );
  const [hasImage, setHasImage] = useState<boolean>(false);
  const [imgDims, setImgDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [activeTool, setActiveTool] = useState<EditorTool>('adjust');
  const [adj, setAdj] = useState<PhotoAdjustments>(DEFAULT_ADJ);
  const [activePreset, setActivePreset] = useState<string>('orig');
  const [zoom, setZoom] = useState<number>(100);
  const [compareBefore, setCompareBefore] = useState<boolean>(false);
  const [compareSplit, setCompareSplit] = useState<number>(50);
  const [drawColor, setDrawColor] = useState<string>('#38bdf8');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [textDraft, setTextDraft] = useState<string>('Luma OS 1.7.2');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState<number>(92);
  const [saving, setSaving] = useState<boolean>(false);
  const [cropAspect, setCropAspect] = useState<'free' | '1:1' | '16:9' | '4:3' | '9:16'>('free');
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [historyLen, setHistoryLen] = useState<number>(0);

  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const origSnapshotRef = useRef<string | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const drawingRef = useRef<boolean>(false);
  const startPtRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const shapeSnapshotRef = useRef<ImageData | null>(null);

  const buildFilterString = useCallback((a: PhotoAdjustments) => {
    const sepia = a.warmth > 0 ? a.warmth * 0.45 : 0;
    const hueShift = a.hue + (a.warmth < 0 ? a.warmth * 0.45 : 0);
    return [
      `brightness(${a.brightness}%)`,
      `contrast(${a.contrast}%)`,
      `saturate(${a.saturate}%)`,
      sepia > 0 ? `sepia(${sepia.toFixed(1)}%)` : '',
      hueShift !== 0 ? `hue-rotate(${Math.round(hueShift)}deg)` : '',
      a.blur > 0 ? `blur(${a.blur}px)` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }, []);

  const renderComposite = useCallback(() => {
    const base = baseCanvasRef.current;
    const disp = displayCanvasRef.current;
    if (!base || !disp || base.width === 0 || base.height === 0) return;

    disp.width = base.width;
    disp.height = base.height;
    const ctx = disp.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, disp.width, disp.height);
    ctx.save();
    ctx.filter = buildFilterString(adj);
    ctx.drawImage(base, 0, 0);
    ctx.restore();

    // Warm/Cool color wash subtle tint
    if (Math.abs(adj.warmth) > 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle =
        adj.warmth > 0
          ? `rgba(255, 168, 76, ${(adj.warmth / 160).toFixed(2)})`
          : `rgba(56, 189, 248, ${(Math.abs(adj.warmth) / 150).toFixed(2)})`;
      ctx.fillRect(0, 0, disp.width, disp.height);
      ctx.restore();
    }

    // Optical Vignette
    if (adj.vignette > 0) {
      const cx = disp.width / 2;
      const cy = disp.height / 2;
      const outer = Math.hypot(cx, cy);
      const grad = ctx.createRadialGradient(cx, cy, outer * 0.35, cx, cy, outer);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${(adj.vignette / 100).toFixed(2)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, disp.width, disp.height);
    }

    // Before/After split overlay
    if (compareBefore && origSnapshotRef.current) {
      const splitX = Math.round((disp.width * compareSplit) / 100);
      const origImg = new Image();
      origImg.src = origSnapshotRef.current;
      if (origImg.complete && origImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, disp.height);
        ctx.clip();
        ctx.drawImage(origImg, 0, 0, disp.width, disp.height);
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(2, disp.width / 400);
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, disp.height);
      ctx.stroke();
      ctx.restore();
    }

    // Interactive Crop box overlay
    if (activeTool === 'crop' && cropRect && cropRect.w > 4 && cropRect.h > 4) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
      ctx.fillRect(0, 0, disp.width, disp.height);
      ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.clip();
      ctx.filter = buildFilterString(adj);
      ctx.drawImage(base, 0, 0);
      ctx.restore();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(2, disp.width / 350);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

      // Rule of thirds lines
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = Math.max(1, disp.width / 700);
      for (let i = 1; i <= 2; i++) {
        const lx = cropRect.x + (cropRect.w * i) / 3;
        const ly = cropRect.y + (cropRect.h * i) / 3;
        ctx.beginPath();
        ctx.moveTo(lx, cropRect.y);
        ctx.lineTo(lx, cropRect.y + cropRect.h);
        ctx.moveTo(cropRect.x, ly);
        ctx.lineTo(cropRect.x + cropRect.w, ly);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [adj, activeTool, buildFilterString, compareBefore, compareSplit, cropRect]);

  useEffect(() => {
    renderComposite();
  }, [renderComposite]);

  const pushHistory = useCallback(() => {
    const base = baseCanvasRef.current;
    if (!base || base.width === 0) return;
    const snap = base.toDataURL('image/png');
    const maxSteps = isPro ? 30 : 12;
    const sliced = historyRef.current.slice(0, historyIdxRef.current + 1);
    sliced.push(snap);
    if (sliced.length > maxSteps) sliced.shift();
    historyRef.current = sliced;
    historyIdxRef.current = sliced.length - 1;
    setHistoryIdx(historyIdxRef.current);
    setHistoryLen(sliced.length);
  }, [isPro]);

  const loadImageElement = useCallback(
    (img: HTMLImageElement, name: string, diskPath: string) => {
      const base = baseCanvasRef.current;
      if (!base) return;
      const maxDim = isPro ? 3840 : 2048;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        const s = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      base.width = Math.max(1, w);
      base.height = Math.max(1, h);
      const ctx = base.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      const initialSnap = base.toDataURL('image/png');
      origSnapshotRef.current = initialSnap;
      historyRef.current = [initialSnap];
      historyIdxRef.current = 0;
      setHistoryIdx(0);
      setHistoryLen(1);

      setImgDims({ w, h });
      setFileName(name);
      setFilePath(diskPath);
      setHasImage(true);
      setAdj(DEFAULT_ADJ);
      setActivePreset('orig');
      setCropRect(null);
      setZoom(100);
      renderComposite();
    },
    [isPro, renderComposite]
  );

  const loadFromDiskPath = useCallback(
    (p: string) => {
      if (!p) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadImageElement(img, p.split(/[\\/]/).pop() || 'Фото', p);
      };
      img.onerror = () => {
        onPushToast('Luma Photo Studio', `Не удалось открыть изображение: ${p}`, 'warning');
      };
      img.src = `/api/kernel/fs/raw-file?path=${encodeURIComponent(p)}&t=${Date.now()}`;
    },
    [loadImageElement, onPushToast]
  );

  useEffect(() => {
    if (initialPath) {
      loadFromDiskPath(initialPath);
    }
  }, [initialPath, loadFromDiskPath]);

  const handleUndo = () => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    const snap = historyRef.current[historyIdxRef.current];
    if (!snap) return;
    const img = new Image();
    img.onload = () => {
      const base = baseCanvasRef.current;
      if (!base) return;
      base.width = img.naturalWidth;
      base.height = img.naturalHeight;
      const ctx = base.getContext('2d');
      ctx?.clearRect(0, 0, base.width, base.height);
      ctx?.drawImage(img, 0, 0);
      setImgDims({ w: base.width, h: base.height });
      setHistoryIdx(historyIdxRef.current);
      renderComposite();
    };
    img.src = snap;
  };

  const handleRedo = () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    const snap = historyRef.current[historyIdxRef.current];
    if (!snap) return;
    const img = new Image();
    img.onload = () => {
      const base = baseCanvasRef.current;
      if (!base) return;
      base.width = img.naturalWidth;
      base.height = img.naturalHeight;
      const ctx = base.getContext('2d');
      ctx?.clearRect(0, 0, base.width, base.height);
      ctx?.drawImage(img, 0, 0);
      setImgDims({ w: base.width, h: base.height });
      setHistoryIdx(historyIdxRef.current);
      renderComposite();
    };
    img.src = snap;
  };

  const applyTransform = (mode: 'rotL' | 'rotR' | 'flipH' | 'flipV') => {
    const base = baseCanvasRef.current;
    if (!base || base.width === 0) return;
    const tmp = document.createElement('canvas');
    const rot = mode === 'rotL' || mode === 'rotR';
    tmp.width = rot ? base.height : base.width;
    tmp.height = rot ? base.width : base.height;
    const ctx = tmp.getContext('2d');
    if (!ctx) return;
    ctx.translate(tmp.width / 2, tmp.height / 2);
    if (mode === 'rotR') ctx.rotate(Math.PI / 2);
    if (mode === 'rotL') ctx.rotate(-Math.PI / 2);
    if (mode === 'flipH') ctx.scale(-1, 1);
    if (mode === 'flipV') ctx.scale(1, -1);
    ctx.drawImage(base, -base.width / 2, -base.height / 2);

    base.width = tmp.width;
    base.height = tmp.height;
    const bctx = base.getContext('2d');
    bctx?.clearRect(0, 0, base.width, base.height);
    bctx?.drawImage(tmp, 0, 0);
    setImgDims({ w: base.width, h: base.height });
    setCropRect(null);
    pushHistory();
    renderComposite();
  };

  const applyCropNow = () => {
    const base = baseCanvasRef.current;
    if (!base || !cropRect || cropRect.w < 10 || cropRect.h < 10) return;
    const x = Math.max(0, Math.round(cropRect.x));
    const y = Math.max(0, Math.round(cropRect.y));
    const w = Math.min(base.width - x, Math.round(cropRect.w));
    const h = Math.min(base.height - y, Math.round(cropRect.h));
    if (w < 8 || h < 8) return;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    tmp.getContext('2d')?.drawImage(base, x, y, w, h, 0, 0, w, h);
    base.width = w;
    base.height = h;
    base.getContext('2d')?.drawImage(tmp, 0, 0);
    setImgDims({ w, h });
    setCropRect(null);
    setActiveTool('adjust');
    pushHistory();
    renderComposite();
    onPushToast('Luma Photo Studio', `Фото обрезано до ${w}×${h}px`, 'success');
  };

  const handlePickFromPC = async () => {
    try {
      const r = await fetch('/api/kernel/pick-file?mode=file');
      if (r.ok) {
        const d = await r.json();
        if ((d?.picked || d?.ok) && d?.path) {
          loadFromDiskPath(d.path);
        }
      }
    } catch {
      onPushToast('Luma Photo Studio', 'Используйте перетаскивание или кнопку загрузки', 'info');
    }
  };

  const handleBrowserFile = (file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => loadImageElement(img, file.name, '');
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const disp = displayCanvasRef.current;
    if (!disp) return { x: 0, y: 0 };
    const rect = disp.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * disp.width,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * disp.height,
    };
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasImage) return;
    if (activeTool === 'adjust' || activeTool === 'filters') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    startPtRef.current = pt;
    drawingRef.current = true;

    const base = baseCanvasRef.current;
    if (!base) return;
    const bctx = base.getContext('2d');
    if (!bctx) return;

    if (activeTool === 'text') {
      const label = textDraft.trim() || 'Luma OS';
      const fSize = Math.max(18, Math.round(brushSize * 4.5));
      bctx.save();
      bctx.font = `800 ${fSize}px Inter, system-ui, sans-serif`;
      bctx.shadowColor = 'rgba(0,0,0,0.65)';
      bctx.shadowBlur = 10;
      bctx.fillStyle = drawColor;
      bctx.fillText(label, pt.x, pt.y);
      bctx.restore();
      drawingRef.current = false;
      pushHistory();
      renderComposite();
      return;
    }

    if (activeTool === 'arrow' || activeTool === 'rect') {
      shapeSnapshotRef.current = bctx.getImageData(0, 0, base.width, base.height);
    } else if (activeTool === 'brush' || activeTool === 'highlighter') {
      bctx.save();
      bctx.lineCap = 'round';
      bctx.lineJoin = 'round';
      bctx.strokeStyle = drawColor;
      bctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : 1;
      bctx.lineWidth = Math.max(2, brushSize * (base.width / 700) * (activeTool === 'highlighter' ? 2.6 : 1));
      bctx.beginPath();
      bctx.moveTo(pt.x, pt.y);
      bctx.lineTo(pt.x + 0.1, pt.y + 0.1);
      bctx.stroke();
      bctx.restore();
      renderComposite();
    } else if (activeTool === 'crop') {
      setCropRect({ x: pt.x, y: pt.y, w: 1, h: 1 });
    }
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !hasImage) return;
    const pt = getCanvasPoint(e);
    const base = baseCanvasRef.current;
    if (!base) return;
    const bctx = base.getContext('2d');
    if (!bctx) return;

    if (activeTool === 'crop') {
      let x = Math.min(startPtRef.current.x, pt.x);
      let y = Math.min(startPtRef.current.y, pt.y);
      let w = Math.abs(pt.x - startPtRef.current.x);
      let h = Math.abs(pt.y - startPtRef.current.y);
      if (cropAspect !== 'free' && w > 4) {
        const ratio =
          cropAspect === '1:1' ? 1 : cropAspect === '16:9' ? 16 / 9 : cropAspect === '4:3' ? 4 / 3 : 9 / 16;
        h = w / ratio;
      }
      x = Math.max(0, Math.min(x, base.width - 4));
      y = Math.max(0, Math.min(y, base.height - 4));
      setCropRect({ x, y, w: Math.min(w, base.width - x), h: Math.min(h, base.height - y) });
      return;
    }

    if (activeTool === 'brush' || activeTool === 'highlighter') {
      bctx.save();
      bctx.lineCap = 'round';
      bctx.lineJoin = 'round';
      bctx.strokeStyle = drawColor;
      bctx.globalAlpha = activeTool === 'highlighter' ? 0.32 : 1;
      bctx.lineWidth = Math.max(2, brushSize * (base.width / 700) * (activeTool === 'highlighter' ? 2.6 : 1));
      bctx.beginPath();
      bctx.moveTo(startPtRef.current.x, startPtRef.current.y);
      bctx.lineTo(pt.x, pt.y);
      bctx.stroke();
      bctx.restore();
      startPtRef.current = pt;
      renderComposite();
      return;
    }

    if (activeTool === 'mosaic') {
      const r = Math.max(12, Math.round(brushSize * 3));
      const sx = Math.max(0, Math.round(pt.x - r));
      const sy = Math.max(0, Math.round(pt.y - r));
      const sw = Math.min(base.width - sx, r * 2);
      const sh = Math.min(base.height - sy, r * 2);
      if (sw > 4 && sh > 4) {
        const block = Math.max(8, Math.round(r / 2.2));
        const pxData = bctx.getImageData(sx, sy, sw, sh);
        for (let by = 0; by < sh; by += block) {
          for (let bx = 0; bx < sw; bx += block) {
            const idx = (by * sw + bx) * 4;
            bctx.fillStyle = `rgb(${pxData.data[idx]},${pxData.data[idx + 1]},${pxData.data[idx + 2]})`;
            bctx.fillRect(sx + bx, sy + by, block, block);
          }
        }
        renderComposite();
      }
      return;
    }

    if ((activeTool === 'arrow' || activeTool === 'rect') && shapeSnapshotRef.current) {
      bctx.putImageData(shapeSnapshotRef.current, 0, 0);
      const lw = Math.max(3, brushSize * (base.width / 700));
      bctx.save();
      bctx.strokeStyle = drawColor;
      bctx.fillStyle = drawColor;
      bctx.lineWidth = lw;
      bctx.lineCap = 'round';
      if (activeTool === 'rect') {
        bctx.strokeRect(
          Math.min(startPtRef.current.x, pt.x),
          Math.min(startPtRef.current.y, pt.y),
          Math.abs(pt.x - startPtRef.current.x),
          Math.abs(pt.y - startPtRef.current.y)
        );
      } else {
        const dx = pt.x - startPtRef.current.x;
        const dy = pt.y - startPtRef.current.y;
        const angle = Math.atan2(dy, dx);
        const head = lw * 3.5;
        bctx.beginPath();
        bctx.moveTo(startPtRef.current.x, startPtRef.current.y);
        bctx.lineTo(pt.x, pt.y);
        bctx.stroke();
        bctx.beginPath();
        bctx.moveTo(pt.x, pt.y);
        bctx.lineTo(pt.x - head * Math.cos(angle - Math.PI / 6), pt.y - head * Math.sin(angle - Math.PI / 6));
        bctx.lineTo(pt.x - head * Math.cos(angle + Math.PI / 6), pt.y - head * Math.sin(angle + Math.PI / 6));
        bctx.closePath();
        bctx.fill();
      }
      bctx.restore();
      renderComposite();
    }
  };

  const onCanvasPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    shapeSnapshotRef.current = null;
    if (activeTool !== 'crop') {
      pushHistory();
    }
  };

  const exportFinalDataURL = () => {
    const prevCompare = compareBefore;
    const prevTool = activeTool;
    if (prevCompare || prevTool === 'crop') {
      // Render clean without split/crop guides
      const base = baseCanvasRef.current;
      if (!base) return '';
      const out = document.createElement('canvas');
      out.width = base.width;
      out.height = base.height;
      const ctx = out.getContext('2d');
      if (!ctx) return '';
      ctx.filter = buildFilterString(adj);
      ctx.drawImage(base, 0, 0);
      const mime = exportFormat === 'jpeg' ? 'image/jpeg' : exportFormat === 'webp' ? 'image/webp' : 'image/png';
      return out.toDataURL(mime, exportQuality / 100);
    }
    const disp = displayCanvasRef.current;
    if (!disp) return '';
    const mime = exportFormat === 'jpeg' ? 'image/jpeg' : exportFormat === 'webp' ? 'image/webp' : 'image/png';
    return disp.toDataURL(mime, exportQuality / 100);
  };

  const savePhoto = async (overwrite: boolean, sendToPhone = false) => {
    if (!hasImage) return;
    setSaving(true);
    try {
      const dataUrl = exportFinalDataURL();
      const r = await fetch('/api/kernel/photo/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filePath,
          file_name: fileName,
          image_base64: dataUrl,
          format: exportFormat,
          overwrite: overwrite && Boolean(filePath),
          send_to_phone: sendToPhone,
        }),
      });
      const d = await r.json();
      if (d?.ok) {
        setFilePath(d.path);
        setFileName(d.name);
        onPushToast(
          'Luma Photo Studio',
          sendToPhone
            ? `Сохранено и отправлено на телефон: ${d.name}`
            : `Сохранено: ${d.path}`,
          'success'
        );
      } else {
        onPushToast('Luma Photo Studio', d?.error || 'Не удалось сохранить фото', 'warning');
      }
    } catch {
      onPushToast('Luma Photo Studio', 'Ошибка связи с ядром LumaCore', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const copyImageToClipboard = async () => {
    const dataUrl = exportFinalDataURL();
    if (!dataUrl) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      onPushToast('Luma Photo Studio', 'Фото скопировано в буфер обмена', 'success');
    } catch {
      onPushToast('Luma Photo Studio', 'Сохраните файл на диск для вставки', 'info');
    }
  };

  const applyAsWallpaper = () => {
    const dataUrl = exportFinalDataURL();
    if (!dataUrl || !onSetWallpaper) return;
    onSetWallpaper(dataUrl);
    onPushToast('Luma Photo Studio', 'Установлено как обои рабочего стола Luma OS!', 'success');
  };

  const loadSampleCanvas = () => {
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 1280, 720);
    g.addColorStop(0, '#07152e');
    g.addColorStop(0.5, '#0c3b68');
    g.addColorStop(1, '#1d1042');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1280, 720);
    const orb = ctx.createRadialGradient(640, 340, 20, 640, 340, 320);
    orb.addColorStop(0, 'rgba(56,189,248,0.85)');
    orb.addColorStop(0.5, 'rgba(37,99,235,0.38)');
    orb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = orb;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 56px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Luma Photo Studio 1.7.2', 640, 355);
    ctx.font = '500 22px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Откройте любое фото с ПК или перетащите файл сюда', 640, 405);
    const img = new Image();
    img.onload = () => loadImageElement(img, 'Luma_Canvas_172.png', '');
    img.src = c.toDataURL('image/png');
  };

  const panelBg = isDark ? 'bg-[#0b101b]/95 text-white' : 'bg-slate-50 text-slate-900';
  const cardCls = isDark ? 'bg-white/[0.05] border-white/10' : 'bg-white border-slate-200';
  const muted = isDark ? 'text-white/55' : 'text-slate-500';

  return (
    <div
      className={`h-full flex flex-col overflow-hidden select-none ${panelBg}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f && f.type.startsWith('image/')) handleBrowserFile(f);
      }}
    >
      {/* Hidden base offscreen canvas */}
      <canvas ref={baseCanvasRef} className="hidden" />

      {/* Top Studio Toolbar */}
      <div className={`px-3 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${isDark ? 'border-white/10 bg-black/30' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black truncate flex items-center gap-1.5">
              <span>{fileName}</span>
              {isPro && (
                <span className="px-1.5 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/35 text-sky-300 text-[9px] font-mono">
                  PRO 4K
                </span>
              )}
            </div>
            <div className={`text-[10px] font-mono truncate ${muted}`}>
              {hasImage ? `${imgDims.w}×${imgDims.h}px · Luma Photo Studio` : 'Встроенный системный редактор фото Luma OS 1.7.2'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => void handlePickFromPC()}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${cardCls} hover:border-sky-400/50`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" /> Открыть с ПК
          </button>
          <label className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${cardCls} hover:border-sky-400/50`}>
            <Plus className="w-3.5 h-3.5 text-emerald-400" /> Файл
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBrowserFile(e.target.files?.[0])} />
          </label>

          {hasImage && (
            <>
              <div className="w-px h-5 bg-white/10 mx-0.5" />
              <button
                onClick={handleUndo}
                disabled={historyIdx <= 0}
                title="Отменить (Undo)"
                className={`p-1.5 rounded-xl border cursor-pointer disabled:opacity-30 ${cardCls}`}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIdx >= historyLen - 1}
                title="Повторить (Redo)"
                className={`p-1.5 rounded-xl border cursor-pointer disabled:opacity-30 ${cardCls}`}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCompareBefore((v) => !v)}
                title="Сравнить До / После"
                className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                  compareBefore ? 'bg-blue-600 border-blue-500 text-white' : cardCls
                }`}
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" /> До/После
              </button>
              <button
                onClick={() => void copyImageToClipboard()}
                title="Копировать фото"
                className={`p-1.5 rounded-xl border cursor-pointer ${cardCls}`}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {onSetWallpaper && (
                <button
                  onClick={applyAsWallpaper}
                  title="Установить как обои Luma OS"
                  className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${cardCls}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Обои
                </button>
              )}
              <button
                onClick={() => void savePhoto(false, true)}
                disabled={saving}
                title="Сохранить и отправить на телефон (Волна HarmonyOS)"
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer hover:bg-cyan-500/30"
              >
                <Send className="w-3.5 h-3.5" /> На телефон
              </button>
              <button
                onClick={() => void savePhoto(Boolean(filePath), false)}
                disabled={saving}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/25 hover:brightness-110"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'Сохранение…' : filePath ? 'Сохранить' : 'Экспорт'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Compact Tool Rail */}
        <div className={`w-14 border-r py-2 flex flex-col items-center gap-1.5 shrink-0 ${isDark ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-white'}`}>
          {(
            [
              { id: 'adjust', icon: Sliders, label: 'Цвет' },
              { id: 'filters', icon: Wand2, label: 'Фильтры' },
              { id: 'crop', icon: Crop, label: 'Обрезка' },
              { id: 'brush', icon: Paintbrush, label: 'Кисть' },
              { id: 'highlighter', icon: Highlighter, label: 'Маркер' },
              { id: 'arrow', icon: MoveRight, label: 'Стрелка' },
              { id: 'rect', icon: Square, label: 'Рамка' },
              { id: 'text', icon: Type, label: 'Текст' },
              { id: 'mosaic', icon: Eraser, label: 'Размыть' },
            ] as { id: EditorTool; icon: React.ComponentType<{ className?: string }>; label: string }[]
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                title={t.label}
                className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/35'
                    : isDark
                    ? 'text-white/65 hover:bg-white/10'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[8px] font-bold leading-none">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center Canvas Viewport */}
        <div className="flex-1 min-w-0 relative flex flex-col items-center justify-center overflow-auto p-4 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.08),transparent_70%)]">
          {!hasImage ? (
            <div className={`max-w-md w-full p-6 rounded-3xl border text-center space-y-4 ${cardCls}`}>
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black">Luma Photo Studio 1.7.2</h3>
                <p className={`text-xs mt-1 ${muted}`}>
                  Все фотографии в Проводнике Luma OS, на рабочем столе и в Полке Dropzone открываются прямо здесь. Перетащите изображение или выберите файл с диска.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => void handlePickFromPC()}
                  className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  📁 Выбрать фото на ПК
                </button>
                <button
                  onClick={loadSampleCanvas}
                  className={`px-3.5 py-2 rounded-2xl border text-xs font-bold cursor-pointer ${cardCls}`}
                >
                  ✨ Демо-холст
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="relative inline-flex items-center justify-center rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)] border border-white/15"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              >
                <canvas
                  ref={displayCanvasRef}
                  onPointerDown={onCanvasPointerDown}
                  onPointerMove={onCanvasPointerMove}
                  onPointerUp={onCanvasPointerUp}
                  style={{
                    maxWidth: `${Math.round((zoom / 100) * 760)}px`,
                    maxHeight: `${Math.round((zoom / 100) * 520)}px`,
                    width: 'auto',
                    height: 'auto',
                    cursor: activeTool === 'adjust' || activeTool === 'filters' ? 'default' : 'crosshair',
                    touchAction: 'none',
                  }}
                />
              </div>

              {/* Floating Bottom Zoom + Rotate + Compare Pill */}
              <div className="mt-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 flex items-center gap-2 text-xs text-white">
                <button onClick={() => setZoom((z) => Math.max(40, z - 15))} className="p-1 hover:text-sky-400 cursor-pointer">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold w-10 text-center">{zoom}%</span>
                <button onClick={() => setZoom((z) => Math.min(250, z + 15))} className="p-1 hover:text-sky-400 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-white/15" />
                <button onClick={() => applyTransform('rotL')} title="Повернуть влево 90°" className="p-1 hover:text-sky-400 cursor-pointer">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => applyTransform('rotR')} title="Повернуть вправо 90°" className="p-1 hover:text-sky-400 cursor-pointer">
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => applyTransform('flipH')} title="Отразить горизонтально" className="p-1 hover:text-sky-400 cursor-pointer">
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => applyTransform('flipV')} title="Отразить вертикально" className="p-1 hover:text-sky-400 cursor-pointer">
                  <FlipVertical className="w-3.5 h-3.5" />
                </button>
                {compareBefore && (
                  <>
                    <div className="w-px h-4 bg-white/15" />
                    <span className="text-[10px] font-mono text-sky-300">ДО/ПОСЛЕ</span>
                    <input
                      type="range"
                      min={5}
                      max={95}
                      value={compareSplit}
                      onChange={(e) => setCompareSplit(Number(e.target.value))}
                      className="w-20 accent-sky-400"
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Properties Inspector */}
        <div className={`w-64 border-l p-3 overflow-y-auto space-y-3 shrink-0 ${isDark ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-white'}`}>
          {activeTool === 'adjust' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black">Свет и цвет</span>
                <button
                  onClick={() => {
                    setAdj(DEFAULT_ADJ);
                    setActivePreset('orig');
                  }}
                  className="text-[10px] font-bold text-sky-400 hover:underline cursor-pointer"
                >
                  Сбросить
                </button>
              </div>
              {(
                [
                  { k: 'brightness', label: 'Яркость', min: 50, max: 180, unit: '%' },
                  { k: 'contrast', label: 'Контраст', min: 50, max: 180, unit: '%' },
                  { k: 'saturate', label: 'Насыщенность', min: 0, max: 220, unit: '%' },
                  { k: 'warmth', label: 'Температура', min: -50, max: 50, unit: '' },
                  { k: 'hue', label: 'Оттенок', min: -180, max: 180, unit: '°' },
                  { k: 'vignette', label: 'Виньетка', min: 0, max: 85, unit: '%' },
                  { k: 'blur', label: 'Размытие', min: 0, max: 10, unit: 'px' },
                ] as { k: keyof PhotoAdjustments; label: string; min: number; max: number; unit: string }[]
              ).map((s) => (
                <div key={s.k} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={muted}>{s.label}</span>
                    <span className="font-mono font-bold">
                      {adj[s.k]}
                      {s.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    value={adj[s.k]}
                    onChange={(e) => setAdj((prev) => ({ ...prev, [s.k]: Number(e.target.value) }))}
                    className="w-full accent-blue-500 h-1.5 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTool === 'filters' && (
            <div className="space-y-2.5">
              <div className="text-xs font-black">12 Студийных фильтров</div>
              <div className="grid grid-cols-2 gap-1.5">
                {FILTER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePreset(p.id);
                      setAdj({ ...DEFAULT_ADJ, ...p.adj });
                    }}
                    className={`p-2 rounded-xl border text-left text-[11px] font-bold cursor-pointer transition ${
                      activePreset === p.id
                        ? 'bg-blue-600/25 border-blue-400 text-sky-200'
                        : `${cardCls} hover:border-sky-400/40`
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTool === 'crop' && (
            <div className="space-y-3">
              <div className="text-xs font-black">Кадрирование</div>
              <p className={`text-[11px] ${muted}`}>Выделите область на фото мышкой, затем нажмите «Применить».</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(['free', '1:1', '16:9', '4:3', '9:16'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setCropAspect(a)}
                    className={`py-1.5 rounded-xl border text-[11px] font-mono font-bold cursor-pointer ${
                      cropAspect === a ? 'bg-blue-600 border-blue-500 text-white' : cardCls
                    }`}
                  >
                    {a === 'free' ? 'Своб.' : a}
                  </button>
                ))}
              </div>
              <button
                onClick={applyCropNow}
                disabled={!cropRect}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Применить обрезку
              </button>
            </div>
          )}

          {(activeTool === 'brush' || activeTool === 'highlighter' || activeTool === 'arrow' || activeTool === 'rect' || activeTool === 'text' || activeTool === 'mosaic') && (
            <div className="space-y-3">
              <div className="text-xs font-black">Аннотация и рисование</div>
              {activeTool === 'text' && (
                <div className="space-y-1">
                  <label className={`text-[10px] font-bold uppercase ${muted}`}>Текст на фото (кликните по холсту)</label>
                  <input
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs outline-none ${cardCls}`}
                  />
                </div>
              )}
              {activeTool !== 'mosaic' && (
                <div className="space-y-1.5">
                  <div className={`text-[10px] font-bold uppercase ${muted}`}>Цвет</div>
                  <div className="flex flex-wrap gap-1.5">
                    {DRAW_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setDrawColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full cursor-pointer border-2 transition ${
                          drawColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className={muted}>Толщина / Размер</span>
                  <span className="font-mono font-bold">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={28}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Export Format Card */}
          <div className={`p-3 rounded-2xl border space-y-2.5 ${cardCls}`}>
            <div className="text-[11px] font-black flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-sky-400" /> Сохранение и экспорт
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={`py-1 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer border ${
                    exportFormat === fmt ? 'bg-blue-600 border-blue-500 text-white' : cardCls
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
            {exportFormat !== 'png' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className={muted}>Качество</span>
                  <span className="font-mono font-bold">{exportQuality}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={exportQuality}
                  onChange={(e) => setExportQuality(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            )}
            <button
              onClick={() => void savePhoto(false, false)}
              disabled={!hasImage || saving}
              className={`w-full py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer disabled:opacity-40 ${cardCls} hover:border-sky-400/50`}
            >
              Сохранить копию как {exportFormat.toUpperCase()}
            </button>
          </div>

          <div className={`p-2.5 rounded-2xl border text-[10px] leading-relaxed ${cardCls} ${muted}`}>
            <Layers className="w-3.5 h-3.5 text-sky-400 inline mr-1" />
            В <b>Luma OS 1.7.2</b> все фото из Проводника, Полки и рабочего стола открываются прямо в <b>Luma Photo Studio</b>.
          </div>
        </div>
      </div>
    </div>
  );
};
