import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Film,
  Play,
  Pause,
  Scissors,
  Trash2,
  Copy,
  Download,
  Type,
  Sparkles,
  Music,
  Upload,
  Gauge,
  CheckCircle2,
  RotateCcw,
  Undo2,
  Redo2,
  Camera,
  SlidersHorizontal,
  Smile,
  FlipHorizontal,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

type ClipTransition = 'none' | 'fade' | 'flash' | 'zoom' | 'wipe_left' | 'wipe_up' | 'glitch' | 'blur';
type ClipMotion = 'static' | 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'pulse' | 'shake';
type TextAnim = 'fade' | 'slide' | 'pop' | 'typewriter' | 'glitch' | 'bounce' | 'wave' | 'spread';

interface VideoClip {
  id: string;
  name: string;
  kind: 'demo' | 'video' | 'image';
  srcUrl?: string;
  color: string;
  startSec: number;
  durationSec: number;
  speed: number;
  transition: ClipTransition;
  motion: ClipMotion;
  flipH?: boolean;
  rotateDeg?: number;
}

interface TextOverlay {
  id: string;
  text: string;
  startSec: number;
  durationSec: number;
  yPct: number;
  fontSize: number;
  color: string;
  bgPill?: boolean;
  stroke?: boolean;
  anim: TextAnim;
}

interface StickerOverlay {
  id: string;
  emoji: string;
  xPct: number;
  yPct: number;
  size: number;
  startSec: number;
  durationSec: number;
}

const LUT_PRESETS: { id: string; name: string; filter: string; badge: string }[] = [
  { id: 'orig', name: 'Оригинал', filter: 'none', badge: 'STD' },
  { id: 'carbon', name: 'Carbon Noir', filter: 'contrast(1.22) saturate(0.72) brightness(0.92)', badge: 'C-6' },
  { id: 'cyber', name: 'Cyber Teal', filter: 'contrast(1.18) saturate(1.35) hue-rotate(-14deg)', badge: 'CYB' },
  { id: 'sunset', name: 'Warm Sunset', filter: 'sepia(0.28) saturate(1.45) contrast(1.08)', badge: 'WARM' },
  { id: 'vhs', name: 'VHS Retro', filter: 'contrast(1.15) saturate(1.25) sepia(0.22) hue-rotate(8deg)', badge: 'VHS' },
  { id: 'nordic', name: 'Nordic Ice', filter: 'saturate(0.8) brightness(1.06) hue-rotate(15deg) contrast(1.08)', badge: 'ICE' },
  { id: 'matrix', name: 'Emerald Matrix', filter: 'hue-rotate(65deg) contrast(1.25) saturate(1.3)', badge: 'MTX' },
  { id: 'golden', name: 'Golden Hour', filter: 'brightness(1.06) sepia(0.35) saturate(1.5)', badge: 'GLD' },
  { id: 'bw', name: 'Cinema B&W', filter: 'grayscale(1) contrast(1.32)', badge: 'B&W' },
  { id: 'dream', name: 'Dreamy Glow', filter: 'brightness(1.12) saturate(1.22) contrast(0.94)', badge: 'GLW' },
  { id: 'kodak', name: 'Kodak 2383', filter: 'contrast(1.26) saturate(1.18) sepia(0.14)', badge: 'KDK' },
  { id: 'neon', name: 'Tokyo Neon', filter: 'contrast(1.28) saturate(1.65) hue-rotate(-22deg)', badge: 'NEO' },
];

const ASPECT_RATIOS: { id: '16:9' | '9:16' | '1:1' | '4:3'; ratio: number; label: string }[] = [
  { id: '16:9', ratio: 16 / 9, label: '16:9 YouTube' },
  { id: '9:16', ratio: 9 / 16, label: '9:16 Reels / Shorts' },
  { id: '1:1', ratio: 1, label: '1:1 Square' },
  { id: '4:3', ratio: 4 / 3, label: '4:3 Classic' },
];

const CODEC_OPTIONS = [
  { id: 'vp9', label: 'VP9 · WebM (Лучшее качество)', mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { id: 'vp8', label: 'VP8 · WebM (Быстрый рендер)', mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { id: 'h264', label: 'H.264 / AVC · MP4/WebM', mime: 'video/mp4;codecs=avc1.42E01E', fallbackMime: 'video/webm;codecs=h264', ext: 'mp4' },
  { id: 'av1', label: 'AV1 · WebM (Сверхсжатие)', mime: 'video/webm;codecs=av01.0.04M.08', ext: 'webm' },
] as const;

const STICKER_PALETTE = ['🔥', '⚡', '✨', '🎬', '🚀', '💎', '🎵', '❤️', '👑', '⭐'];

interface LumaCutStudioWindowProps {
  isDark: boolean;
  onNotify?: (title: string, msg: string, kind?: 'info' | 'success' | 'warn') => void;
}

export const LumaCutStudioWindow: React.FC<LumaCutStudioWindowProps> = ({ isDark, onNotify }) => {
  const [clips, setClips] = useState<VideoClip[]>([
    {
      id: 'clip_demo_1',
      name: 'Carbon 1.5.1 Intro Motion',
      kind: 'demo',
      color: '#06b6d4',
      startSec: 0,
      durationSec: 4,
      speed: 1,
      transition: 'fade',
      motion: 'zoom_in',
    },
    {
      id: 'clip_demo_2',
      name: 'Obsidian Wave Scene',
      kind: 'demo',
      color: '#8b5cf6',
      startSec: 4,
      durationSec: 4,
      speed: 1,
      transition: 'glitch',
      motion: 'pan_right',
    },
  ]);
  const [texts, setTexts] = useState<TextOverlay[]>([
    {
      id: 'txt_1',
      text: 'LUMA OS 1.5.1 · CARBON',
      startSec: 0.3,
      durationSec: 3.4,
      yPct: 48,
      fontSize: 30,
      color: '#ffffff',
      bgPill: true,
      stroke: false,
      anim: 'spread',
    },
    {
      id: 'txt_2',
      text: 'LUMA CUT STUDIO PRO',
      startSec: 4.2,
      durationSec: 3.4,
      yPct: 74,
      fontSize: 22,
      color: '#38bdf8',
      bgPill: false,
      stroke: true,
      anim: 'typewriter',
    },
  ]);
  const [stickers, setStickers] = useState<StickerOverlay[]>([]);

  // Undo / Redo snapshot history
  const [undoStack, setUndoStack] = useState<{ clips: VideoClip[]; texts: TextOverlay[]; stickers: StickerOverlay[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ clips: VideoClip[]; texts: TextOverlay[]; stickers: StickerOverlay[] }[]>([]);

  const pushHistory = useCallback(() => {
    setUndoStack((s) => [...s.slice(-19), { clips, texts, stickers }]);
    setRedoStack([]);
  }, [clips, texts, stickers]);

  const handleUndo = () => {
    const prev = undoStack[undoStack.length - 1];
    if (!prev) return;
    setRedoStack((r) => [...r, { clips, texts, stickers }]);
    setUndoStack((s) => s.slice(0, -1));
    setClips(prev.clips);
    setTexts(prev.texts);
    setStickers(prev.stickers);
  };

  const handleRedo = () => {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setUndoStack((s) => [...s, { clips, texts, stickers }]);
    setRedoStack((r) => r.slice(0, -1));
    setClips(next.clips);
    setTexts(next.texts);
    setStickers(next.stickers);
  };

  const [selectedClipId, setSelectedClipId] = useState<string>('clip_demo_1');
  const [selectedTextId, setSelectedTextId] = useState<string | null>('txt_1');
  const [inspectorTab, setInspectorTab] = useState<'color' | 'clip' | 'text' | 'fx' | 'export'>('color');
  const [aspectId, setAspectId] = useState<'16:9' | '9:16' | '1:1' | '4:3'>('16:9');
  const [lutId, setLutId] = useState<string>('carbon');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(106);
  const [saturation, setSaturation] = useState(110);
  const [vignette, setVignette] = useState(25);

  // Cinema FX Overlays
  const [fxGrain, setFxGrain] = useState(false);
  const [fxVhsLines, setFxVhsLines] = useState(false);
  const [fxChromatic, setFxChromatic] = useState(false);
  const [fxLetterbox, setFxLetterbox] = useState(false);

  // Export Codec & Quality Settings
  const [codecId, setCodecId] = useState<'vp9' | 'vp8' | 'h264' | 'av1'>('vp9');
  const [resolutionH, setResolutionH] = useState<480 | 720 | 1080>(720);
  const [exportFps, setExportFps] = useState<24 | 30 | 60>(30);
  const [bitrateMbps, setBitrateMbps] = useState<2 | 5 | 10 | 16>(5);

  // Audio + Timeline
  const [audioName, setAudioName] = useState<string>('');
  const [audioVolume, setAudioVolume] = useState(80);
  const [audioFade, setAudioFade] = useState(true);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaElementsRef = useRef<Record<string, HTMLVideoElement | HTMLImageElement>>({});
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const canvasDims = useMemo(() => {
    const ar = ASPECT_RATIOS.find((a) => a.id === aspectId) || ASPECT_RATIOS[0];
    // Preview renders smoothly at crisp 720p-capped aspect; export switches to target resolutionH
    const baseH = exporting ? resolutionH : Math.min(480, resolutionH);
    const w = Math.round((baseH * ar.ratio) / 2) * 2;
    const h = Math.round(baseH / 2) * 2;
    return { w, h };
  }, [aspectId, resolutionH, exporting]);

  const totalDuration = useMemo(() => {
    const clipEnd = clips.reduce((m, c) => Math.max(m, c.startSec + c.durationSec), 0);
    const txtEnd = texts.reduce((m, t) => Math.max(m, t.startSec + t.durationSec), 0);
    return Math.max(4, Number(Math.max(clipEnd, txtEnd).toFixed(2)));
  }, [clips, texts]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || clips[0];
  const selectedText = texts.find((t) => t.id === selectedTextId) || null;

  const supportedCodecs = useMemo(() => {
    const check = (m: string) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m);
    return CODEC_OPTIONS.map((c) => {
      const okMain = check(c.mime);
      const okFallback = 'fallbackMime' in c && c.fallbackMime ? check(c.fallbackMime) : false;
      return { ...c, supported: okMain || okFallback, actualMime: okMain ? c.mime : ('fallbackMime' in c && c.fallbackMime && okFallback ? c.fallbackMime : 'video/webm') };
    });
  }, []);

  // Frame renderer with Motion Keyframes, 8 Transitions, 8 Animated Texts, Stickers & Cinema FX!
  const drawFrameAt = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;

      ctx.save();
      ctx.fillStyle = '#05070b';
      ctx.fillRect(0, 0, W, H);

      const lut = LUT_PRESETS.find((l) => l.id === lutId);
      const activeClip = clips.find((c) => t >= c.startSec && t < c.startSec + c.durationSec);

      if (activeClip) {
        const localT = (t - activeClip.startSec) * activeClip.speed;
        const progress = Math.min(1, Math.max(0, (t - activeClip.startSec) / Math.max(0.1, activeClip.durationSec)));

        // Transition & Motion Keyframe math
        let alpha = 1;
        let scale = 1;
        let tx = 0;
        let ty = 0;
        let extraBlur = 0;

        if (activeClip.transition === 'fade' && progress < 0.16) alpha = progress / 0.16;
        else if (activeClip.transition === 'zoom' && progress < 0.2) scale *= 1.24 - (progress / 0.2) * 0.24;
        else if (activeClip.transition === 'blur' && progress < 0.2) extraBlur = (1 - progress / 0.2) * 14;
        else if (activeClip.transition === 'wipe_left' && progress < 0.2) {
          ctx.beginPath();
          ctx.rect(0, 0, W * (progress / 0.2), H);
          ctx.clip();
        } else if (activeClip.transition === 'wipe_up' && progress < 0.2) {
          const hReveal = H * (progress / 0.2);
          ctx.beginPath();
          ctx.rect(0, H - hReveal, W, hReveal);
          ctx.clip();
        } else if (activeClip.transition === 'glitch' && progress < 0.18) {
          tx += Math.sin(t * 90) * 16;
          ty += Math.cos(t * 75) * 6;
        }

        // Ken Burns / Motion Keyframe
        switch (activeClip.motion) {
          case 'zoom_in': scale *= 1 + progress * 0.16; break;
          case 'zoom_out': scale *= 1.16 - progress * 0.16; break;
          case 'pan_left': scale *= 1.12; tx += (0.5 - progress) * W * 0.08; break;
          case 'pan_right': scale *= 1.12; tx += (progress - 0.5) * W * 0.08; break;
          case 'pulse': scale *= 1 + Math.sin(localT * 4.5) * 0.04; break;
          case 'shake': tx += Math.sin(localT * 28) * 5; ty += Math.cos(localT * 31) * 4; break;
        }

        const baseFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)${extraBlur > 0.2 ? ` blur(${extraBlur.toFixed(1)}px)` : ''}`;
        ctx.filter = lut && lut.filter !== 'none' ? `${baseFilter} ${lut.filter}` : baseFilter;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        ctx.translate(W / 2 + tx, H / 2 + ty);
        if (activeClip.rotateDeg) ctx.rotate((activeClip.rotateDeg * Math.PI) / 180);
        ctx.scale(activeClip.flipH ? -scale : scale, scale);
        ctx.translate(-W / 2, -H / 2);

        const mediaEl = activeClip.srcUrl ? mediaElementsRef.current[activeClip.id] : undefined;
        if (activeClip.kind === 'image' && mediaEl instanceof HTMLImageElement && mediaEl.complete) {
          ctx.drawImage(mediaEl, 0, 0, W, H);
        } else if (activeClip.kind === 'video' && mediaEl instanceof HTMLVideoElement && mediaEl.readyState >= 2) {
          if (Math.abs(mediaEl.currentTime - localT) > 0.25) {
            try { mediaEl.currentTime = localT % Math.max(0.5, mediaEl.duration || 10); } catch { /* ignore */ }
          }
          ctx.drawImage(mediaEl, 0, 0, W, H);
        } else {
          const grad = ctx.createLinearGradient(Math.cos(localT * 0.9) * W * 0.3, 0, W, H);
          grad.addColorStop(0, '#070a10');
          grad.addColorStop(0.5, activeClip.color);
          grad.addColorStop(1, '#090d16');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);

          ctx.strokeStyle = 'rgba(255,255,255,0.16)';
          ctx.lineWidth = Math.max(1.5, W / 360);
          for (let ring = 0; ring < 5; ring++) {
            ctx.beginPath();
            for (let x = 0; x <= W; x += 24) {
              const y = H * (0.25 + ring * 0.14) + Math.sin(x * 0.012 + localT * 2.2 + ring) * (H * 0.04 + ring * 4);
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }

          const ox = W * (0.5 + Math.sin(localT * 1.1) * 0.26);
          const oy = H * (0.5 + Math.cos(localT * 0.85) * 0.18);
          const orbGrad = ctx.createRadialGradient(ox, oy, 6, ox, oy, Math.min(W, H) * 0.3);
          orbGrad.addColorStop(0, 'rgba(255,255,255,0.48)');
          orbGrad.addColorStop(0.4, `${activeClip.color}99`);
          orbGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(ox, oy, Math.min(W, H) * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }

        if (activeClip.transition === 'flash' && progress < 0.12) {
          ctx.fillStyle = `rgba(255,255,255,${1 - progress / 0.12})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
      ctx.restore();

      // Cinema FX Overlays
      if (fxChromatic) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255,0,90,0.06)';
        ctx.fillRect(4, 0, W, H);
        ctx.fillStyle = 'rgba(0,220,255,0.06)';
        ctx.fillRect(-4, 0, W, H);
        ctx.restore();
      }
      if (fxVhsLines) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5);
        ctx.restore();
      }
      if (fxGrain) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (let i = 0; i < 160; i++) {
          const gx = ((Math.sin(i * 12.9898 + t * 47.1) * 43758.5453) % 1 + 1) % 1 * W;
          const gy = ((Math.sin(i * 78.233 + t * 31.7) * 43758.5453) % 1 + 1) % 1 * H;
          ctx.fillRect(gx, gy, 2, 2);
        }
        ctx.restore();
      }
      if (vignette > 0) {
        const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.22, W / 2, H / 2, W * 0.72);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }
      if (fxLetterbox) {
        const barH = Math.round(H * 0.11);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, barH);
        ctx.fillRect(0, H - barH, W, barH);
      }

      // Render Stickers
      stickers.forEach((st) => {
        if (t < st.startSec || t > st.startSec + st.durationSec) return;
        const p = (t - st.startSec) / Math.max(0.1, st.durationSec);
        const bounce = p < 0.15 ? 0.5 + (p / 0.15) * 0.6 : 1 + Math.sin(t * 4) * 0.05;
        ctx.save();
        ctx.translate((st.xPct / 100) * W, (st.yPct / 100) * H);
        ctx.scale(bounce, bounce);
        ctx.font = `${Math.round(st.size * (H / 360))}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.emoji, 0, 0);
        ctx.restore();
      });

      // Render 8-Preset Animated Text Overlays
      const scaleRatio = H / 360;
      texts.forEach((ov) => {
        if (t < ov.startSec || t > ov.startSec + ov.durationSec) return;
        const p = (t - ov.startSec) / Math.max(0.1, ov.durationSec);
        ctx.save();
        let ty = (ov.yPct / 100) * H;
        let txOff = 0;
        let alpha = 1;
        let sc = 1;
        let displayText = ov.text;

        switch (ov.anim) {
          case 'fade':
            if (p < 0.18) alpha = p / 0.18;
            else if (p > 0.82) alpha = (1 - p) / 0.18;
            break;
          case 'slide':
            if (p < 0.22) { alpha = p / 0.22; ty += (1 - p / 0.22) * 32 * scaleRatio; }
            break;
          case 'pop':
            if (p < 0.18) { sc = 0.45 + Math.sin((p / 0.18) * Math.PI * 0.65) * 0.65; alpha = p / 0.18; }
            break;
          case 'typewriter': {
            const chars = Math.max(1, Math.ceil(ov.text.length * Math.min(1, p / 0.45)));
            displayText = ov.text.slice(0, chars);
            break;
          }
          case 'glitch':
            if (p < 0.22 || Math.sin(t * 25) > 0.88) txOff = Math.sin(t * 140) * 8 * scaleRatio;
            break;
          case 'bounce':
            ty -= Math.abs(Math.sin(t * 6.5)) * 12 * scaleRatio;
            break;
          case 'wave':
            ty += Math.sin(t * 4.2) * 9 * scaleRatio;
            break;
          case 'spread':
            sc = 0.85 + Math.min(1, p * 2.5) * 0.2;
            if (p < 0.2) alpha = p / 0.2;
            break;
        }

        const fontPx = Math.round(ov.fontSize * scaleRatio);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.translate(W / 2 + txOff, ty);
        ctx.scale(sc, sc);
        ctx.font = `800 ${fontPx}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (ov.bgPill && displayText) {
          const metrics = ctx.measureText(displayText);
          const padX = 16 * scaleRatio;
          const padY = 8 * scaleRatio;
          ctx.fillStyle = 'rgba(0,0,0,0.62)';
          ctx.beginPath();
          ctx.roundRect(-metrics.width / 2 - padX, -fontPx / 2 - padY, metrics.width + padX * 2, fontPx + padY * 2, 999);
          ctx.fill();
        }
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 14 * scaleRatio;
        if (ov.stroke) {
          ctx.lineWidth = Math.max(2, fontPx * 0.08);
          ctx.strokeStyle = '#000000';
          ctx.strokeText(displayText, 0, 0);
        }
        if (ov.anim === 'glitch') {
          ctx.fillStyle = '#00f0ff';
          ctx.fillText(displayText, -2 * scaleRatio, 0);
          ctx.fillStyle = '#ff006e';
          ctx.fillText(displayText, 2 * scaleRatio, 0);
        }
        ctx.fillStyle = ov.color;
        ctx.fillText(displayText, 0, 0);
        ctx.restore();
      });
    },
    [clips, texts, stickers, lutId, brightness, contrast, saturation, vignette, fxGrain, fxVhsLines, fxChromatic, fxLetterbox]
  );

  useEffect(() => {
    drawFrameAt(playhead);
  }, [playhead, canvasDims, drawFrameAt]);

  // Playback loop with optional Audio Fade In / Fade Out
  useEffect(() => {
    if (!playing) {
      audioElRef.current?.pause();
      return;
    }
    if (audioElRef.current) {
      audioElRef.current.currentTime = playhead;
      void audioElRef.current.play().catch(() => {});
    }
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPlayhead((prev) => {
        const next = prev + dt;
        if (audioElRef.current) {
          let vol = audioVolume / 100;
          if (audioFade) {
            if (next < 0.8) vol *= next / 0.8;
            if (next > totalDuration - 0.8) vol *= Math.max(0, (totalDuration - next) / 0.8);
          }
          audioElRef.current.volume = Math.max(0, Math.min(1, vol));
        }
        if (next >= totalDuration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, totalDuration, audioVolume, audioFade]);

  // Keyboard shortcuts (Space = play/pause, S = split)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey) {
        handleSplitAtPlayhead();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleImportMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pushHistory();
    const url = URL.createObjectURL(file);
    const id = `clip_${Date.now()}`;
    const startSec = clips.reduce((m, c) => Math.max(m, c.startSec + c.durationSec), 0);

    if (file.type.startsWith('audio/')) {
      audioElRef.current = new Audio(url);
      setAudioName(file.name);
      setStatusMsg(`Аудиодорожка: ${file.name}`);
      return;
    }
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.src = url;
      img.onload = () => drawFrameAt(playhead);
      mediaElementsRef.current[id] = img;
      setClips((prev) => [...prev, { id, name: file.name, kind: 'image', srcUrl: url, color: '#10b981', startSec, durationSec: 4, speed: 1, transition: 'fade', motion: 'zoom_in' }]);
      setSelectedClipId(id);
      return;
    }
    if (file.type.startsWith('video/')) {
      const vid = document.createElement('video');
      vid.src = url;
      vid.muted = true;
      vid.playsInline = true;
      vid.onloadedmetadata = () => {
        const dur = Math.max(2, Math.min(30, Number((vid.duration || 5).toFixed(1))));
        mediaElementsRef.current[id] = vid;
        setClips((prev) => [...prev, { id, name: file.name, kind: 'video', srcUrl: url, color: '#f59e0b', startSec, durationSec: dur, speed: 1, transition: 'none', motion: 'static' }]);
        setSelectedClipId(id);
      };
    }
  };

  const handleSplitAtPlayhead = () => {
    const target = clips.find((c) => playhead > c.startSec + 0.3 && playhead < c.startSec + c.durationSec - 0.3);
    if (!target) {
      setStatusMsg('Наведите ползунок внутрь клипа для разреза');
      return;
    }
    pushHistory();
    const leftDur = Number((playhead - target.startSec).toFixed(2));
    const rightDur = Number((target.durationSec - leftDur).toFixed(2));
    const rightClip: VideoClip = { ...target, id: `clip_${Date.now()}`, name: `${target.name} (2)`, startSec: Number(playhead.toFixed(2)), durationSec: rightDur };
    setClips((prev) => prev.flatMap((c) => (c.id === target.id ? [{ ...c, durationSec: leftDur }, rightClip] : [c])));
    setSelectedClipId(rightClip.id);
    setStatusMsg('Клип разрезан точно по линии ✂');
  };

  const handleDuplicateClip = () => {
    if (!selectedClip) return;
    pushHistory();
    const end = clips.reduce((m, c) => Math.max(m, c.startSec + c.durationSec), 0);
    const dup: VideoClip = { ...selectedClip, id: `clip_${Date.now()}`, name: `${selectedClip.name} (копия)`, startSec: end };
    setClips((prev) => [...prev, dup]);
    setSelectedClipId(dup.id);
  };

  const handleDeleteClip = (id: string) => {
    if (clips.length <= 1) return;
    pushHistory();
    setClips((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddText = () => {
    pushHistory();
    const ov: TextOverlay = { id: `txt_${Date.now()}`, text: 'НОВЫЙ ТИТР', startSec: Number(playhead.toFixed(1)), durationSec: 2.8, yPct: 45, fontSize: 28, color: '#ffffff', bgPill: true, anim: 'pop' };
    setTexts((prev) => [...prev, ov]);
    setSelectedTextId(ov.id);
    setInspectorTab('text');
  };

  const handleAddSticker = (emoji: string) => {
    pushHistory();
    setStickers((p) => [...p, { id: `st_${Date.now()}`, emoji, xPct: 20 + Math.round(Math.random() * 60), yPct: 20 + Math.round(Math.random() * 55), size: 42, startSec: Number(playhead.toFixed(1)), durationSec: 3 }]);
    setStatusMsg(`Добавлен стикер ${emoji}`);
  };

  const handleSnapshotPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawFrameAt(playhead);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `luma_cut_frame_${playhead.toFixed(1)}s.png`;
    a.click();
    setStatusMsg('Снимок кадра сохранён в PNG');
  };

  // Pro Video Export with Codec, Resolution, FPS & Bitrate Selection!
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function' || exporting) return;
    setPlaying(false);
    setExporting(true);
    setExportProgress(0);
    const chosen = supportedCodecs.find((c) => c.id === codecId) || supportedCodecs[0];
    setStatusMsg(`Рендер ${resolutionH}p · ${exportFps}fps · ${chosen.id.toUpperCase()} (${bitrateMbps} Мбит/с)...`);

    // Allow React to resize canvas to full target resolution before capture
    await new Promise((r) => setTimeout(r, 60));

    try {
      const stream = canvas.captureStream(exportFps);
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream, {
        mimeType: chosen.actualMime,
        videoBitsPerSecond: bitrateMbps * 1_000_000,
      });
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      const done = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: chosen.actualMime }));
      });
      rec.start();
      const totalFrames = Math.ceil(totalDuration * exportFps);
      for (let f = 0; f <= totalFrames; f++) {
        const t = f / exportFps;
        drawFrameAt(t);
        setPlayhead(t);
        setExportProgress(Math.round((f / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, Math.max(8, Math.round(1000 / exportFps))));
      }
      rec.stop();
      const blob = await done;
      const mb = (blob.size / (1024 * 1024)).toFixed(2);
      const ext = chosen.actualMime.includes('mp4') ? 'mp4' : 'webm';
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `luma_cut_${resolutionH}p_${chosen.id}_${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(dlUrl);
      setStatusMsg(`Экспорт завершён: ${mb} МБ (.${ext} · ${chosen.id.toUpperCase()})`);
      onNotify?.('Luma Cut Studio Pro', `Видео экспортировано (${resolutionH}p ${chosen.id.toUpperCase()}, ${mb} МБ)`, 'success');
    } catch {
      setStatusMsg('Кодек не поддерживается драйвером — выберите VP9 или VP8');
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const subText = isDark ? 'text-white/55' : 'text-slate-500';

  return (
    <div className={`h-full flex flex-col select-none ${isDark ? 'bg-[#0a0c12] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Studio Bar */}
      <div className={`px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${isDark ? 'bg-[#10131c] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white">
            <Film size={14} />
          </div>
          <span className="text-xs font-bold mr-1">Luma Cut Pro</span>
          <label className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-400/30 cursor-pointer flex items-center gap-1">
            <Upload size={12} /> Импорт
            <input type="file" accept="video/*,image/*,audio/*" onChange={handleImportMedia} className="hidden" />
          </label>
          <button onClick={handleAddText} className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border flex items-center gap-1 cursor-pointer ${isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200'}`}>
            <Type size={12} className="text-amber-400" /> + Титр
          </button>
          <button onClick={handleUndo} disabled={undoStack.length === 0} className="p-1.5 rounded-lg bg-white/[0.05] border border-white/10 disabled:opacity-30 cursor-pointer" title="Отменить"><Undo2 size={12} /></button>
          <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-1.5 rounded-lg bg-white/[0.05] border border-white/10 disabled:opacity-30 cursor-pointer" title="Повторить"><Redo2 size={12} /></button>
          <button onClick={handleSnapshotPNG} className="p-1.5 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-white/10 cursor-pointer" title="Снимок кадра (PNG)"><Camera size={12} className="text-emerald-400" /></button>
        </div>

        <div className="flex items-center gap-2">
          <select value={aspectId} onChange={(e) => setAspectId(e.target.value as any)} className={`px-2 py-1 rounded-xl text-[11px] border outline-none ${isDark ? 'bg-[#171b26] border-white/12 text-white' : 'bg-white border-slate-200'}`}>
            {ASPECT_RATIOS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <select value={codecId} onChange={(e) => setCodecId(e.target.value as any)} className={`px-2 py-1 rounded-xl text-[11px] border outline-none ${isDark ? 'bg-[#171b26] border-white/12 text-cyan-300' : 'bg-white border-slate-200'}`} title="Видеокодек экспорта">
            {supportedCodecs.map((c) => (
              <option key={c.id} value={c.id}>{c.id.toUpperCase()} {c.supported ? '✓' : '(fallback)'}</option>
            ))}
          </select>
          <button
            onClick={() => void handleExportVideo()}
            disabled={exporting}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:opacity-90 disabled:opacity-50 text-white flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Download size={13} />
            {exporting ? `Рендер ${exportProgress}%` : `Экспорт ${resolutionH}p`}
          </button>
        </div>
      </div>

      {/* Upper Workspace: Canvas Monitor + 5-Tab Pro Inspector */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-3 relative overflow-hidden bg-black/40">
          <canvas ref={canvasRef} width={canvasDims.w} height={canvasDims.h} className="max-w-full max-h-[calc(100%-46px)] rounded-xl border border-white/15 shadow-2xl object-contain" />
          <div className="mt-2.5 flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-black/65 border border-white/12 backdrop-blur-md text-xs">
            <button onClick={() => setPlayhead(0)} className="text-white/70 hover:text-white cursor-pointer" title="В начало"><RotateCcw size={13} /></button>
            <button onClick={() => setPlaying((p) => !p)} className="w-7 h-7 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center cursor-pointer">
              {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
            </button>
            <span className="font-mono text-[11px] text-cyan-300">{playhead.toFixed(1)}s / {totalDuration.toFixed(1)}s</span>
            {statusMsg && (
              <span className="text-[10px] text-emerald-300 flex items-center gap-1 max-w-[230px] truncate"><CheckCircle2 size={11} /> {statusMsg}</span>
            )}
          </div>
        </div>

        {/* Right Pro Inspector */}
        <div className={`w-72 shrink-0 border-l flex flex-col overflow-hidden ${isDark ? 'bg-[#0e1119] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="grid grid-cols-5 border-b border-white/10 text-[9px] font-semibold">
            {(
              [
                ['color', 'Цвет', <Sparkles key="c" size={11} />],
                ['clip', 'Клип', <Gauge key="g" size={11} />],
                ['text', 'Текст', <Type key="t" size={11} />],
                ['fx', 'FX/Стик', <Smile key="s" size={11} />],
                ['export', 'Кодек', <SlidersHorizontal key="e" size={11} />],
              ] as const
            ).map(([k, lbl, ic]) => (
              <button key={k} onClick={() => setInspectorTab(k)} className={`py-2 flex flex-col items-center gap-0.5 transition cursor-pointer ${inspectorTab === k ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10' : subText}`}>
                {ic}
                {lbl}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
            {inspectorTab === 'color' && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Кино-фильтры (12 LUT)</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {LUT_PRESETS.map((l) => (
                    <button key={l.id} onClick={() => setLutId(l.id)} className={`px-2 py-1.5 rounded-xl text-[10px] font-medium border text-left transition cursor-pointer ${lutId === l.id ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300' : isDark ? 'bg-white/[0.04] border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200'}`}>
                      <div className="truncate font-semibold">{l.name}</div>
                      <div className="text-[8px] font-mono opacity-60">{l.badge}</div>
                    </button>
                  ))}
                </div>
                <div className="space-y-2 pt-1">
                  <div><div className={`text-[10px] flex justify-between ${subText}`}><span>Яркость</span><span>{brightness}%</span></div><input type="range" min={50} max={160} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-cyan-400" /></div>
                  <div><div className={`text-[10px] flex justify-between ${subText}`}><span>Контраст</span><span>{contrast}%</span></div><input type="range" min={50} max={180} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-cyan-400" /></div>
                  <div><div className={`text-[10px] flex justify-between ${subText}`}><span>Насыщенность</span><span>{saturation}%</span></div><input type="range" min={0} max={200} value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full accent-cyan-400" /></div>
                  <div><div className={`text-[10px] flex justify-between ${subText}`}><span>Виньетка</span><span>{vignette}%</span></div><input type="range" min={0} max={85} value={vignette} onChange={(e) => setVignette(Number(e.target.value))} className="w-full accent-cyan-400" /></div>
                </div>
              </>
            )}

            {inspectorTab === 'clip' && selectedClip && (
              <div className="space-y-2.5">
                <div className="font-semibold truncate">{selectedClip.name}</div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Длительность: {selectedClip.durationSec}s</div>
                  <input type="range" min={1} max={15} step={0.5} value={selectedClip.durationSec} onChange={(e) => setClips((prev) => prev.map((c) => (c.id === selectedClip.id ? { ...c, durationSec: Number(e.target.value) } : c)))} className="w-full accent-cyan-400" />
                </div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Скорость: {selectedClip.speed}×</div>
                  <div className="grid grid-cols-5 gap-1">
                    {[0.25, 0.5, 1, 1.5, 2].map((sp) => (
                      <button key={sp} onClick={() => setClips((prev) => prev.map((c) => (c.id === selectedClip.id ? { ...c, speed: sp } : c)))} className={`py-1 rounded-lg text-[10px] font-mono border cursor-pointer ${selectedClip.speed === sp ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/[0.04] border-white/10'}`}>{sp}×</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Переход входа (8 эффектов)</div>
                  <select value={selectedClip.transition} onChange={(e) => setClips((prev) => prev.map((c) => (c.id === selectedClip.id ? { ...c, transition: e.target.value as ClipTransition } : c)))} className={`w-full px-2 py-1.5 rounded-xl text-xs border outline-none ${isDark ? 'bg-[#171b26] border-white/12 text-white' : 'bg-white border-slate-200'}`}>
                    <option value="none">Без перехода</option>
                    <option value="fade">Плавное появление (Fade)</option>
                    <option value="zoom">Динамичный зум (Zoom)</option>
                    <option value="flash">Вспышка (Flash)</option>
                    <option value="wipe_left">Шторка слева (Wipe Left)</option>
                    <option value="wipe_up">Шторка снизу (Wipe Up)</option>
                    <option value="glitch">Глитч-переход (Glitch)</option>
                    <option value="blur">Расфокус (Cinema Blur)</option>
                  </select>
                </div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Анимация кадра (Ken Burns / Motion)</div>
                  <select value={selectedClip.motion} onChange={(e) => setClips((prev) => prev.map((c) => (c.id === selectedClip.id ? { ...c, motion: e.target.value as ClipMotion } : c)))} className={`w-full px-2 py-1.5 rounded-xl text-xs border outline-none ${isDark ? 'bg-[#171b26] border-white/12 text-white' : 'bg-white border-slate-200'}`}>
                    <option value="static">Статика</option>
                    <option value="zoom_in">Плавный наезд (Zoom In)</option>
                    <option value="zoom_out">Плавный отъезд (Zoom Out)</option>
                    <option value="pan_left">Панорама влево</option>
                    <option value="pan_right">Панорама вправо</option>
                    <option value="pulse">Пульсация в ритм (Pulse)</option>
                    <option value="shake">Кино-тряска (Camera Shake)</option>
                  </select>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button onClick={() => setClips((p) => p.map((c) => (c.id === selectedClip.id ? { ...c, flipH: !c.flipH } : c)))} className={`flex-1 py-1.5 rounded-xl text-[10px] border flex items-center justify-center gap-1 cursor-pointer ${selectedClip.flipH ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/[0.04] border-white/10'}`}><FlipHorizontal size={12} /> Отразить</button>
                  <button onClick={() => setClips((p) => p.map((c) => (c.id === selectedClip.id ? { ...c, rotateDeg: ((c.rotateDeg || 0) + 90) % 360 } : c)))} className="flex-1 py-1.5 rounded-xl text-[10px] bg-white/[0.04] border border-white/10 flex items-center justify-center gap-1 cursor-pointer"><RotateCw size={12} /> Поворот {selectedClip.rotateDeg || 0}°</button>
                </div>
              </div>
            )}

            {inspectorTab === 'text' && (
              <div className="space-y-2.5">
                {!selectedText ? (
                  <div className={`text-[11px] ${subText}`}>Выберите титр на дорожке ниже или нажмите «+ Титр»</div>
                ) : (
                  <>
                    <input value={selectedText.text} onChange={(e) => setTexts((prev) => prev.map((t) => (t.id === selectedText.id ? { ...t, text: e.target.value } : t)))} className={`w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none ${isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-white border-slate-200'}`} />
                    <div>
                      <div className={`text-[10px] mb-1 ${subText}`}>Анимация текста (8 пресетов)</div>
                      <select value={selectedText.anim} onChange={(e) => setTexts((prev) => prev.map((t) => (t.id === selectedText.id ? { ...t, anim: e.target.value as TextAnim } : t)))} className={`w-full px-2 py-1.5 rounded-xl text-xs border outline-none ${isDark ? 'bg-[#171b26] border-white/12 text-white' : 'bg-white border-slate-200'}`}>
                        <option value="fade">Плавное появление (Fade)</option>
                        <option value="slide">Выезд снизу (Slide Up)</option>
                        <option value="pop">Пружинный поп (Pop Elastic)</option>
                        <option value="typewriter">Печатная машинка (Typewriter)</option>
                        <option value="glitch">Неон-глитч (Glitch Neon)</option>
                        <option value="bounce">Прыжок (Bounce)</option>
                        <option value="wave">Волна (Wave)</option>
                        <option value="spread">Кино-разлёт (Cinema Spread)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><div className={`text-[10px] ${subText}`}>Размер: {selectedText.fontSize}px</div><input type="range" min={14} max={56} value={selectedText.fontSize} onChange={(e) => setTexts((prev) => prev.map((t) => (t.id === selectedText.id ? { ...t, fontSize: Number(e.target.value) } : t)))} className="w-full accent-amber-400" /></div>
                      <div><div className={`text-[10px] ${subText}`}>Позиция Y: {selectedText.yPct}%</div><input type="range" min={10} max={92} value={selectedText.yPct} onChange={(e) => setTexts((prev) => prev.map((t) => (t.id === selectedText.id ? { ...t, yPct: Number(e.target.value) } : t)))} className="w-full accent-amber-400" /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="color" value={selectedText.color} onChange={(e) => setTexts((p) => p.map((t) => (t.id === selectedText.id ? { ...t, color: e.target.value } : t)))} className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer" />
                      <button onClick={() => setTexts((p) => p.map((t) => (t.id === selectedText.id ? { ...t, bgPill: !t.bgPill } : t)))} className={`flex-1 py-1 rounded-lg text-[10px] border cursor-pointer ${selectedText.bgPill ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-white/[0.04] border-white/10'}`}>Подложка</button>
                      <button onClick={() => setTexts((p) => p.map((t) => (t.id === selectedText.id ? { ...t, stroke: !t.stroke } : t)))} className={`flex-1 py-1 rounded-lg text-[10px] border cursor-pointer ${selectedText.stroke ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-white/[0.04] border-white/10'}`}>Обводка</button>
                    </div>
                    <button onClick={() => { setTexts((p) => p.filter((t) => t.id !== selectedText.id)); setSelectedTextId(null); }} className="w-full py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] cursor-pointer">Удалить титр</button>
                  </>
                )}
              </div>
            )}

            {inspectorTab === 'fx' && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400">Киноэффекты кадра (FX)</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ['Плёночное зерно', fxGrain, () => setFxGrain((v) => !v)],
                    ['VHS скан-линии', fxVhsLines, () => setFxVhsLines((v) => !v)],
                    ['Хром-аберрация', fxChromatic, () => setFxChromatic((v) => !v)],
                    ['Кинополосы 21:9', fxLetterbox, () => setFxLetterbox((v) => !v)],
                  ].map(([lbl, on, toggle]) => (
                    <button key={lbl as string} onClick={toggle as () => void} className={`p-2 rounded-xl text-[10px] font-semibold border transition cursor-pointer ${on ? 'bg-fuchsia-500/25 border-fuchsia-400 text-fuchsia-200' : 'bg-white/[0.04] border-white/10'}`}>
                      {lbl as string}
                    </button>
                  ))}
                </div>

                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 pt-1">Стикеры на кадр</div>
                <div className="grid grid-cols-5 gap-1">
                  {STICKER_PALETTE.map((em) => (
                    <button key={em} onClick={() => handleAddSticker(em)} className="py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/15 text-base cursor-pointer">{em}</button>
                  ))}
                </div>
                {stickers.length > 0 && (
                  <button onClick={() => setStickers([])} className="w-full py-1 rounded-lg bg-rose-500/15 text-rose-300 text-[10px] cursor-pointer">Очистить стикеры ({stickers.length})</button>
                )}

                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 pt-1 flex items-center gap-1"><Music size={11} /> Звук ({audioName || 'не добавлен'})</div>
                <div className="space-y-1.5">
                  <div className={`text-[10px] flex justify-between ${subText}`}><span>Громкость</span><span>{audioVolume}%</span></div>
                  <input type="range" min={0} max={100} value={audioVolume} onChange={(e) => setAudioVolume(Number(e.target.value))} className="w-full accent-emerald-400" />
                  <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                    <input type="checkbox" checked={audioFade} onChange={(e) => setAudioFade(e.target.checked)} />
                    Плавное затухание (Fade In / Out)
                  </label>
                </div>
              </div>
            )}

            {inspectorTab === 'export' && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Кодек и параметры экспорта</div>
                <div className="space-y-1">
                  {supportedCodecs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCodecId(c.id)}
                      className={`w-full p-2 rounded-xl border text-left transition cursor-pointer ${codecId === c.id ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-white/[0.04] border-white/10'}`}
                    >
                      <div className="text-[11px] font-semibold flex items-center justify-between">
                        <span>{c.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${c.supported ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{c.supported ? 'Нативный' : 'Авто'}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Разрешение экспорта</div>
                  <div className="grid grid-cols-3 gap-1">
                    {([480, 720, 1080] as const).map((r) => (
                      <button key={r} onClick={() => setResolutionH(r)} className={`py-1.5 rounded-lg text-[10px] font-mono border cursor-pointer ${resolutionH === r ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/[0.04] border-white/10'}`}>{r}p</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Частота кадров (FPS)</div>
                  <div className="grid grid-cols-3 gap-1">
                    {([24, 30, 60] as const).map((f) => (
                      <button key={f} onClick={() => setExportFps(f)} className={`py-1.5 rounded-lg text-[10px] font-mono border cursor-pointer ${exportFps === f ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/[0.04] border-white/10'}`}>{f} FPS</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Битрейт видео</div>
                  <div className="grid grid-cols-4 gap-1">
                    {([2, 5, 10, 16] as const).map((b) => (
                      <button key={b} onClick={() => setBitrateMbps(b)} className={`py-1.5 rounded-lg text-[10px] font-mono border cursor-pointer ${bitrateMbps === b ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/[0.04] border-white/10'}`}>{b}M</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => void handleExportVideo()} disabled={exporting} className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-bold text-xs cursor-pointer">
                  {exporting ? `Идёт рендер ${exportProgress}%...` : `Начать рендер (${resolutionH}p · ${codecId.toUpperCase()})`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Multi-Track Timeline */}
      <div className={`h-44 shrink-0 border-t flex flex-col ${isDark ? 'bg-[#0b0e15] border-white/10' : 'bg-slate-100 border-slate-200'}`}>
        <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-1.5">
            <button onClick={handleSplitAtPlayhead} className="px-2 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/15 flex items-center gap-1 cursor-pointer" title="Разрезать (S)"><Scissors size={11} className="text-cyan-400" /> Разрезать (S)</button>
            <button onClick={handleDuplicateClip} className="px-2 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/15 flex items-center gap-1 cursor-pointer"><Copy size={11} /> Дублировать</button>
            {selectedClip && clips.length > 1 && (
              <button onClick={() => handleDeleteClip(selectedClip.id)} className="px-2 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 flex items-center gap-1 cursor-pointer"><Trash2 size={11} /> Удалить</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTimelineZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} className="p-0.5 hover:text-cyan-400 cursor-pointer"><ZoomOut size={12} /></button>
            <span className="font-mono text-[10px]">{Math.round(timelineZoom * 100)}%</span>
            <button onClick={() => setTimelineZoom((z) => Math.min(2, +(z + 0.2).toFixed(1)))} className="p-0.5 hover:text-cyan-400 cursor-pointer"><ZoomIn size={12} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto px-3 py-2 space-y-2 relative">
          <input type="range" min={0} max={totalDuration} step={0.05} value={playhead} onChange={(e) => setPlayhead(Number(e.target.value))} className="w-full accent-rose-500 h-1 cursor-pointer" />
          {/* Video Track */}
          <div className="flex items-center gap-1 h-11" style={{ width: `${Math.max(100, timelineZoom * 100)}%` }}>
            {clips.map((c) => (
              <div
                key={c.id}
                onClick={() => { setSelectedClipId(c.id); setInspectorTab('clip'); }}
                style={{ width: `${(c.durationSec / totalDuration) * 100}%`, backgroundColor: `${c.color}30`, borderColor: selectedClipId === c.id ? '#38bdf8' : `${c.color}66` }}
                className="h-full rounded-xl border-2 px-2 py-1 flex flex-col justify-between overflow-hidden cursor-pointer transition"
              >
                <div className="text-[10px] font-bold truncate">{c.name}</div>
                <div className="text-[9px] font-mono opacity-75 truncate">{c.durationSec}s · {c.transition} · {c.motion}</div>
              </div>
            ))}
          </div>
          {/* Text Track */}
          <div className="relative h-8 bg-white/[0.03] rounded-xl border border-white/10" style={{ width: `${Math.max(100, timelineZoom * 100)}%` }}>
            {texts.map((t) => (
              <div
                key={t.id}
                onClick={() => { setSelectedTextId(t.id); setInspectorTab('text'); }}
                style={{ left: `${(t.startSec / totalDuration) * 100}%`, width: `${Math.max(8, (t.durationSec / totalDuration) * 100)}%` }}
                className={`absolute top-1 bottom-1 rounded-lg px-2 flex items-center text-[10px] font-semibold truncate cursor-pointer border ${selectedTextId === t.id ? 'bg-amber-500/35 border-amber-300 text-amber-100' : 'bg-amber-500/20 border-amber-400/40 text-amber-200'}`}
              >
                T: {t.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
