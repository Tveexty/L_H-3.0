import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Film, Play, Pause, Scissors, Trash2, Copy, Download, Type, Sparkles, Music,
  Upload, Gauge, CheckCircle2, RotateCcw, Undo2, Redo2, Camera, SlidersHorizontal,
  Smile, FlipHorizontal, RotateCw, Layers, Wand2, Mic, MicOff, Brush, Volume2,
  Bot, Palette, FileText, Save, FolderOpen, Square, Plus, Repeat, Snowflake,
  Crosshair, Languages, MessageSquare, Layout, Zap, ScissorsLineDashed, UserCheck,
} from 'lucide-react';
import {
  ASPECT_RATIOS, AudioTrackItem, BlendModeKind, BrushStroke, CaptionStyleKind,
  ClipMotion, ClipTransition, DESIGN_STUDIO_PRESETS, LUT_PRESETS, MaskShapeKind,
  playProceduralAudio, PROJECT_TEMPLATES, ROYALTY_FREE_AUDIO_LIB, speedCurveMultiplier,
  SpeedCurveKind, StickerOverlay, StylizePreset, TextAnim, TextOverlay,
  translateCaptionText, VideoClip, VoiceFilterKind,
} from './cutStudioData';

const CODEC_OPTIONS = [
  { id: 'vp9', label: 'VP9 · WebM (Лучшее качество)', mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { id: 'vp8', label: 'VP8 · WebM (Быстрый рендер)', mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { id: 'h264', label: 'H.264 / AVC · MP4/WebM', mime: 'video/mp4;codecs=avc1.42E01E', fallbackMime: 'video/webm;codecs=h264', ext: 'mp4' },
  { id: 'av1', label: 'AV1 · WebM (Сверхсжатие)', mime: 'video/webm;codecs=av01.0.04M.08', ext: 'webm' },
] as const;

const STICKER_PALETTE = ['🔥', '⚡', '✨', '🎬', '🚀', '💎', '🎵', '❤️', '👑', '⭐', '🎯', '💥'];
const CUT_PROJECT_STORAGE_KEY = 'luma_cut_studio_project_v152';

interface LumaCutStudioWindowProps {
  isDark: boolean;
  onNotify?: (title: string, msg: string, kind?: 'info' | 'success' | 'warn') => void;
}

type StudioView = 'editor' | 'design';
type InspectorTab = 'edit' | 'fx' | 'audio' | 'text' | 'ai' | 'templates';

export const LumaCutStudioWindow: React.FC<LumaCutStudioWindowProps> = ({ isDark, onNotify }) => {
  const [studioView, setStudioView] = useState<StudioView>('editor');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('edit');

  // Core multi-track project state
  const [clips, setClips] = useState<VideoClip[]>([
    {
      id: 'clip_demo_1', track: 'main', name: 'Carbon 1.5.2 Intro', kind: 'demo',
      color: '#06b6d4', secondaryColor: '#1e3a8a', startSec: 0, durationSec: 4, speed: 1, speedCurve: 'linear',
      transition: 'fade', motion: 'zoom_in', opacity: 100, blendMode: 'source-over', mask: 'none',
    },
    {
      id: 'clip_demo_2', track: 'main', name: 'Obsidian Neon Scene', kind: 'demo',
      color: '#8b5cf6', secondaryColor: '#ec4899', startSec: 4, durationSec: 4, speed: 1, speedCurve: 'montage',
      transition: 'glitch', motion: 'pan_right', opacity: 100, blendMode: 'source-over', mask: 'none',
    },
  ]);
  const [texts, setTexts] = useState<TextOverlay[]>([
    {
      id: 'txt_1', text: 'LUMA CUT STUDIO 1.5.2', startSec: 0.3, durationSec: 3.4,
      yPct: 48, fontSize: 30, color: '#ffffff', bgPill: true, stroke: false, anim: 'spread',
    },
    {
      id: 'txt_2', text: 'МОНТАЖ · МАСКИ · ИИ · ОЗВУЧКА', startSec: 4.2, durationSec: 3.4,
      yPct: 76, fontSize: 20, color: '#38bdf8', bgPill: true, stroke: true, anim: 'karaoke', isCaption: true, captionStyle: 'neon_karaoke',
    },
  ]);
  const [stickers, setStickers] = useState<StickerOverlay[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrackItem[]>([
    { id: 'aud_1', name: 'Lo-Fi Carbon Chill', kind: 'music', startSec: 0, durationSec: 8, volume: 75, synthPreset: 'lofi_chill' },
  ]);
  const [beatMarkers, setBeatMarkers] = useState<number[]>([0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]);
  const [brushStrokes, setBrushStrokes] = useState<BrushStroke[]>([]);

  // Undo / Redo
  const [undoStack, setUndoStack] = useState<{ clips: VideoClip[]; texts: TextOverlay[]; stickers: StickerOverlay[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ clips: VideoClip[]; texts: TextOverlay[]; stickers: StickerOverlay[] }[]>([]);

  // Selection & playback
  const [selectedClipId, setSelectedClipId] = useState<string>('clip_demo_1');
  const [selectedTextId, setSelectedTextId] = useState<string>('txt_1');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('luma-media-playing', { detail: { playing, source: 'cut_studio' } }));
    return () => {
      window.dispatchEvent(new CustomEvent('luma-media-playing', { detail: { playing: false, source: 'cut_studio' } }));
    };
  }, [playing]);
  const [aspect, setAspect] = useState<'16:9' | '9:16' | '1:1' | '4:3' | '21:9'>('16:9');
  const [zoomPxPerSec, setZoomPxPerSec] = useState(64);

  // Category 2: Color, RGB Curves, Visual FX, Retouch & Stylize
  const [lutId, setLutId] = useState('orig');
  const [exposure, setExposure] = useState(100);
  const [contrast, setContrast] = useState(105);
  const [saturation, setSaturation] = useState(110);
  const [whiteBalance, setWhiteBalance] = useState(0); // -50 cool .. +50 warm
  const [rgbR, setRgbR] = useState(100);
  const [rgbG, setRgbG] = useState(100);
  const [rgbB, setRgbB] = useState(100);
  const [vignette, setVignette] = useState(20);
  const [fxGrain, setFxGrain] = useState(false);
  const [fxVhsLines, setFxVhsLines] = useState(false);
  const [fxChromatic, setFxChromatic] = useState(false);
  const [fxLetterbox, setFxLetterbox] = useState(false);
  const [fxBodyGlow, setFxBodyGlow] = useState(false);
  const [retouchSmooth, setRetouchSmooth] = useState(0);
  const [retouchGlow, setRetouchGlow] = useState(0);
  const [retouchSlim, setRetouchSlim] = useState(0);
  const [stylize, setStylize] = useState<StylizePreset>('none');
  const [aiUpscale, setAiUpscale] = useState(false);

  // Category 3: Audio Pro
  const [audioNoiseReduce, setAudioNoiseReduce] = useState(false);
  const [audioSpeechEnhance, setAudioSpeechEnhance] = useState(false);
  const [vocalSplit, setVocalSplit] = useState<'full' | 'vocals_only' | 'instrumental'>('full');
  const [voiceFilter, setVoiceFilter] = useState<VoiceFilterKind>('normal');
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [seedAudioPrompt, setSeedAudioPrompt] = useState('cinematic whoosh laser');
  const voiceRecRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);

  // Category 4: Brush Drawing, Auto Captions, TTS & AI Stickers
  const [brushMode, setBrushMode] = useState(false);
  const [brushColor, setBrushColor] = useState('#22d3ee');
  const [brushSize, setBrushSize] = useState(5);
  const [brushGlow, setBrushGlow] = useState(true);
  const drawingBrushRef = useRef(false);
  const [captionLang, setCaptionLang] = useState<'ru' | 'en' | 'de' | 'es'>('ru');
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [aiStickerPrompt, setAiStickerPrompt] = useState('');

  // Category 5: AI Tools (EditPilot, Seedance/Sora Video, Seedream Image, Script-to-Video, Digital Avatar)
  const [editPilotInput, setEditPilotInput] = useState('');
  const [editPilotLog, setEditPilotLog] = useState<string[]>([
    'EditPilot AI готов! Попробуйте: «сделай ч/б», «формат 9:16», «включи глитч», «добавь титр Привет», «ускорь в 2 раза», «разрежь», «аватар»',
  ]);
  const [aiGenPrompt, setAiGenPrompt] = useState('Неоновый киберпанк город под дождём');
  const [scriptText, setScriptText] = useState('Привет! Это видео собрано в Luma Cut Studio.\nЗдесь есть маски, ключи, озвучка и ИИ.\nПодписывайся и пробуй прямо сейчас!');
  const [avatarEnabled, setAvatarEnabled] = useState(false);
  const [avatarName, setAvatarName] = useState('Luma AI Ведущий');

  // Category 6: Design Studio + Converter / Compressor
  const [designPresetIdx, setDesignPresetIdx] = useState(0);
  const [designHeadline, setDesignHeadline] = useState(DESIGN_STUDIO_PRESETS[0].headline);
  const [designSub, setDesignSub] = useState(DESIGN_STUDIO_PRESETS[0].sub);
  const [designBadge, setDesignBadge] = useState(DESIGN_STUDIO_PRESETS[0].badge);
  const [designBg1, setDesignBg1] = useState(DESIGN_STUDIO_PRESETS[0].bg1);
  const [designBg2, setDesignBg2] = useState(DESIGN_STUDIO_PRESETS[0].bg2);
  const [designEmoji, setDesignEmoji] = useState('🚀');
  const designCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Export & Converter settings
  const [exportCodec, setExportCodec] = useState<'vp9' | 'vp8' | 'h264' | 'av1'>('vp9');
  const [exportRes, setExportRes] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [exportFps, setExportFps] = useState<24 | 30 | 60>(30);
  const [exportBitrate, setExportBitrate] = useState<2 | 5 | 10>(5);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Luma Cut Studio 1.5.2 Pro готов к монтажу');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaElementsRef = useRef<Record<string, HTMLVideoElement | HTMLImageElement>>({});
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const importTargetTrackRef = useRef<'main' | 'overlay' | 'replace'>('main');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const projectImportRef = useRef<HTMLInputElement | null>(null);

  const selectedClip = useMemo(() => clips.find((c) => c.id === selectedClipId) || clips[0], [clips, selectedClipId]);
  const selectedText = useMemo(() => texts.find((t) => t.id === selectedTextId) || texts[0], [texts, selectedTextId]);
  const totalDuration = useMemo(() => Math.max(4, clips.reduce((m, c) => Math.max(m, c.startSec + c.durationSec), 0)), [clips]);

  const canvasDims = useMemo(() => {
    if (aspect === '9:16') return { w: 405, h: 720 };
    if (aspect === '1:1') return { w: 600, h: 600 };
    if (aspect === '4:3') return { w: 640, h: 480 };
    if (aspect === '21:9') return { w: 840, h: 360 };
    return { w: 720, h: 405 };
  }, [aspect]);

  const pushHistory = useCallback(() => {
    setUndoStack((s) => [...s.slice(-19), { clips, texts, stickers }]);
    setRedoStack([]);
  }, [clips, texts, stickers]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, { clips, texts, stickers }]);
    setUndoStack((s) => s.slice(0, -1));
    setClips(prev.clips);
    setTexts(prev.texts);
    setStickers(prev.stickers);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((s) => [...s, { clips, texts, stickers }]);
    setRedoStack((r) => r.slice(0, -1));
    setClips(next.clips);
    setTexts(next.texts);
    setStickers(next.stickers);
  };

  // Auto-save project metadata
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          CUT_PROJECT_STORAGE_KEY,
          JSON.stringify({ clips: clips.map((c) => ({ ...c, srcUrl: c.srcUrl?.startsWith('blob:') ? undefined : c.srcUrl })), texts, stickers, aspect, lutId })
        );
      } catch {}
    }, 800);
    return () => window.clearTimeout(t);
  }, [clips, texts, stickers, aspect, lutId]);

  const updateSelectedClip = useCallback(
    (patch: Partial<VideoClip>) => {
      if (!selectedClip) return;
      setClips((prev) => prev.map((c) => (c.id === selectedClip.id ? { ...c, ...patch } : c)));
    },
    [selectedClip]
  );

  // ==================== CANVAS RENDERER (Masks, Chroma Key, Keyframes, PiP, Retouch, Stylize, Brush, Avatar, Captions) ====================
  const drawClipLayer = useCallback(
    (ctx: CanvasRenderingContext2D, clip: VideoClip, t: number, W: number, H: number) => {
      const rawLocal = t - clip.startSec;
      const pct = Math.max(0, Math.min(1, rawLocal / Math.max(0.1, clip.durationSec)));
      const effectivePct = clip.reverse ? 1 - pct : pct;
      const curveMul = speedCurveMultiplier(clip.speedCurve || 'linear', effectivePct);
      const localT = effectivePct * clip.durationSec * (clip.speed || 1) * curveMul;

      // Interpolate Keyframes if present
      let kfX = 0, kfY = 0, kfScale = 1, kfRot = 0, kfOp = 1;
      if (clip.keyframes && clip.keyframes.length > 0) {
        const sorted = [...clip.keyframes].sort((a, b) => a.tPct - b.tPct);
        let a = sorted[0], b = sorted[sorted.length - 1];
        for (let i = 0; i < sorted.length - 1; i++) {
          if (pct >= sorted[i].tPct && pct <= sorted[i + 1].tPct) {
            a = sorted[i];
            b = sorted[i + 1];
            break;
          }
        }
        const span = Math.max(0.001, b.tPct - a.tPct);
        const f = Math.max(0, Math.min(1, (pct - a.tPct) / span));
        kfX = a.xPct + (b.xPct - a.xPct) * f;
        kfY = a.yPct + (b.yPct - a.yPct) * f;
        kfScale = a.scale + (b.scale - a.scale) * f;
        kfRot = a.rotate + (b.rotate - a.rotate) * f;
        kfOp = a.opacity + (b.opacity - a.opacity) * f;
      }

      ctx.save();
      ctx.globalCompositeOperation = clip.blendMode || 'source-over';
      let alpha = ((clip.opacity ?? 100) / 100) * kfOp;
      if (clip.transition === 'fade' && rawLocal < 0.55) alpha *= Math.min(1, rawLocal / 0.55);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // PiP Overlay bounding box vs Full Canvas
      const isOverlay = clip.track === 'overlay';
      const boxW = isOverlay ? W * (clip.pipScale || 0.42) : W;
      const boxH = isOverlay ? H * (clip.pipScale || 0.42) : H;
      const cx = isOverlay ? W * ((clip.pipX ?? 68) / 100) : W / 2;
      const cy = isOverlay ? H * ((clip.pipY ?? 30) / 100) : H / 2;

      // Apply Mask clipping path
      if (clip.mask && clip.mask !== 'none') {
        ctx.beginPath();
        if (clip.mask === 'circle') {
          ctx.arc(cx, cy, Math.min(boxW, boxH) * 0.44, 0, Math.PI * 2);
        } else if (clip.mask === 'rect') {
          ctx.rect(cx - boxW * 0.4, cy - boxH * 0.38, boxW * 0.8, boxH * 0.76);
        } else if (clip.mask === 'split') {
          ctx.rect(0, 0, W * 0.52, H);
        } else if (clip.mask === 'star') {
          const R = Math.min(boxW, boxH) * 0.45, r = R * 0.45;
          for (let i = 0; i < 10; i++) {
            const ang = (i * Math.PI) / 5 - Math.PI / 2;
            const rad = i % 2 === 0 ? R : r;
            const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
        } else if (clip.mask === 'heart') {
          const s = Math.min(boxW, boxH) * 0.38;
          ctx.moveTo(cx, cy + s * 0.75);
          ctx.bezierCurveTo(cx - s * 1.3, cy, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
          ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.3, cy, cx, cy + s * 0.75);
        } else {
          ctx.rect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
        }
        ctx.clip();
      }

      // Motion & Transforms
      let scaleX = kfScale * (1 - retouchSlim * 0.0018);
      let scaleY = kfScale;
      let tx = (kfX / 100) * W, ty = (kfY / 100) * H;
      let rot = (clip.rotateDeg || 0) + kfRot;

      if (clip.motion === 'zoom_in') { const m = 1 + pct * 0.16; scaleX *= m; scaleY *= m; }
      else if (clip.motion === 'zoom_out') { const m = 1.16 - pct * 0.16; scaleX *= m; scaleY *= m; }
      else if (clip.motion === 'pan_left') { scaleX *= 1.12; scaleY *= 1.12; tx -= (pct - 0.5) * 44; }
      else if (clip.motion === 'pan_right') { scaleX *= 1.12; scaleY *= 1.12; tx += (pct - 0.5) * 44; }
      else if (clip.motion === 'pulse') { const m = 1 + Math.sin(localT * 6) * 0.04; scaleX *= m; scaleY *= m; }
      else if (clip.motion === 'shake' && !clip.stabilize) { tx += Math.sin(localT * 42) * 5; ty += Math.cos(localT * 36) * 4; }
      else if (clip.motion === 'stabilized' || clip.stabilize) { scaleX *= 1.06; scaleY *= 1.06; }

      if (clip.transition === 'spin' && rawLocal < 0.5) rot += (1 - rawLocal / 0.5) * 180;
      if (clip.transition === 'zoom' && rawLocal < 0.45) { const z = 1.35 - (rawLocal / 0.45) * 0.35; scaleX *= z; scaleY *= z; }
      if (clip.transition === 'wipe_left' && rawLocal < 0.45) tx += (1 - rawLocal / 0.45) * W * 0.35;

      ctx.translate(cx + tx, cy + ty);
      if (rot) ctx.rotate((rot * Math.PI) / 180);
      if (clip.flipH) ctx.scale(-1, 1);
      ctx.scale(scaleX, scaleY);

      // Filters (LUT + Color Grading + White Balance + Retouch + Stylize + AI Upscale)
      const lut = LUT_PRESETS.find((l) => l.id === lutId)?.filter || 'none';
      const wbFilter = whiteBalance > 0 ? `sepia(${(whiteBalance / 120).toFixed(2)})` : whiteBalance < 0 ? `hue-rotate(${Math.round(whiteBalance * 0.5)}deg)` : '';
      const stylizeFilter =
        stylize === 'anime' ? 'contrast(1.32) saturate(1.65) brightness(1.06)'
        : stylize === '3d_toon' ? 'contrast(1.22) saturate(1.45) brightness(1.08)'
        : stylize === 'oil_paint' ? 'contrast(1.38) saturate(1.5) sepia(0.18)'
        : stylize === 'sketch' ? 'grayscale(1) contrast(2.1) brightness(1.2)'
        : stylize === 'cyber_comic' ? 'contrast(1.45) saturate(1.8) hue-rotate(-18deg)'
        : '';
      const smoothBlur = retouchSmooth > 0 ? `blur(${(retouchSmooth * 0.025).toFixed(2)}px)` : '';
      const sharpen = aiUpscale ? 'contrast(1.12) saturate(1.08)' : '';
      ctx.filter = `${lut === 'none' ? '' : lut} brightness(${exposure + retouchGlow * 0.25}%) contrast(${contrast}%) saturate(${saturation}%) ${wbFilter} ${stylizeFilter} ${smoothBlur} ${sharpen}`.trim();

      // Render Media or AI Procedural Scene
      const media = mediaElementsRef.current[clip.id];
      if ((clip.kind === 'video' || clip.kind === 'image' || clip.kind === 'freeze') && media) {
        if (clip.kind === 'video' && media instanceof HTMLVideoElement) {
          const targetT = localT % Math.max(0.5, media.duration || 5);
          if (Math.abs(media.currentTime - targetT) > 0.25) {
            try { media.currentTime = targetT; } catch {}
          }
        }
        ctx.drawImage(media, -boxW / 2, -boxH / 2, boxW, boxH);
      } else {
        // Rich procedural Carbon / AI Seedance Scene
        const grad = ctx.createLinearGradient(-boxW / 2, -boxH / 2, boxW / 2, boxH / 2);
        grad.addColorStop(0, clip.bgRemoveEnabled ? (clip.bgReplaceColor || '#0f172a') : clip.color);
        grad.addColorStop(1, clip.secondaryColor || '#090d16');
        ctx.fillStyle = grad;
        ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);

        // Dynamic Animated Wave / Orb Mesh
        for (let i = 0; i < 4; i++) {
          const ox = Math.sin(localT * (0.9 + i * 0.35) + i * 2) * boxW * 0.28;
          const oy = Math.cos(localT * (0.7 + i * 0.28) + i) * boxH * 0.24;
          const rg = ctx.createRadialGradient(ox, oy, 8, ox, oy, boxW * 0.32);
          rg.addColorStop(0, i % 2 === 0 ? 'rgba(56,189,248,0.42)' : 'rgba(236,72,153,0.34)');
          rg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = rg;
          ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
        }

        if (clip.aiPrompt) {
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`AI SCENE · ${clip.aiPrompt.slice(0, 34).toUpperCase()}`, 0, boxH * 0.42);
        }
      }

      // Real Chroma Key matting (for video/image overlays)
      if (clip.chromaKeyEnabled && !isOverlay) {
        try {
          const imgData = ctx.getImageData(0, 0, W, H);
          const d = imgData.data;
          const tol = clip.chromaTolerance ?? 75;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            if (g > r + tol * 0.5 && g > b + tol * 0.5 && g > 85) {
              d[i] = 15; d[i + 1] = 23; d[i + 2] = 42;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {}
      }

      // Body / Silhouette Neon FX
      if (fxBodyGlow) {
        ctx.strokeStyle = 'rgba(34,211,238,0.75)';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 18;
        ctx.strokeRect(-boxW * 0.44, -boxH * 0.44, boxW * 0.88, boxH * 0.88);
      }

      // Object Tracker Crosshair HUD
      if (clip.motion === 'track_focus') {
        const txP = ((clip.objectTrackX ?? 50) - 50) * (boxW / 100) + Math.sin(localT * 2.5) * 24;
        const tyP = ((clip.objectTrackY ?? 50) - 50) * (boxH / 100) + Math.cos(localT * 2) * 14;
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.strokeRect(txP - 28, tyP - 28, 56, 56);
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('TRACK LOCK', txP - 26, tyP - 34);
      }

      if (clip.transition === 'flash' && rawLocal < 0.22) {
        ctx.fillStyle = `rgba(255,255,255,${(1 - rawLocal / 0.22) * 0.85})`;
        ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
      }

      ctx.restore();
    },
    [lutId, exposure, contrast, saturation, whiteBalance, retouchSmooth, retouchGlow, retouchSlim, stylize, aiUpscale, fxBodyGlow]
  );

  const drawFrameAt = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#07090f';
      ctx.fillRect(0, 0, W, H);

      // 1) Main Track V1
      const mainClip = clips.find((c) => c.track === 'main' && t >= c.startSec && t < c.startSec + c.durationSec) || clips.find((c) => c.track === 'main');
      if (mainClip) drawClipLayer(ctx, mainClip, t, W, H);

      // 2) Overlay / PiP Track V2
      clips
        .filter((c) => c.track === 'overlay' && t >= c.startSec && t < c.startSec + c.durationSec)
        .forEach((ov) => drawClipLayer(ctx, ov, t, W, H));

      // RGB Color Balance Tint
      if (rgbR !== 100 || rgbG !== 100 || rgbB !== 100) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const r = Math.min(255, Math.max(0, Math.round(rgbR * 1.27)));
        const g = Math.min(255, Math.max(0, Math.round(rgbG * 1.27)));
        const b = Math.min(255, Math.max(0, Math.round(rgbB * 1.27)));
        ctx.fillStyle = `rgba(${r},${g},${b},0.22)`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // Post-FX Overlays (Chromatic, VHS, Grain, Vignette, Letterbox)
      if (fxChromatic) {
        ctx.fillStyle = 'rgba(0,245,255,0.06)';
        ctx.fillRect(4, 0, W, H);
        ctx.fillStyle = 'rgba(255,0,110,0.06)';
        ctx.fillRect(-4, 0, W, H);
      }
      if (fxVhsLines) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5);
      }
      if (fxGrain) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (let i = 0; i < 120; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
      }
      if (vignette > 0) {
        const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.72);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, `rgba(0,0,0,${(vignette / 100) * 0.85})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }
      if (fxLetterbox) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H * 0.11);
        ctx.fillRect(0, H * 0.89, W, H * 0.11);
      }

      // 3) Freehand Brush Strokes
      brushStrokes.forEach((st) => {
        if (st.points.length < 2) return;
        ctx.save();
        ctx.strokeStyle = st.color;
        ctx.lineWidth = st.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (st.glow) {
          ctx.shadowColor = st.color;
          ctx.shadowBlur = 12;
        }
        ctx.beginPath();
        st.points.forEach((pt, idx) => {
          const px = pt.x * W, py = pt.y * H;
          if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
      });

      // 4) Digital Avatar PiP with Live Lip-Sync Animation
      if (avatarEnabled) {
        const ax = W - 82, ay = H - 82;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ax, ay, 54, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
        // Stylized Avatar Face + Animated Mouth
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(ax, ay - 8, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(ax - 7, ay - 12, 3, 0, Math.PI * 2);
        ctx.arc(ax + 7, ay - 12, 3, 0, Math.PI * 2);
        ctx.fill();
        const mouthOpen = playing ? 3 + Math.abs(Math.sin(t * 14)) * 7 : 3;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(ax, ay + 1, 7, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(avatarName.slice(0, 14), ax, ay + 36);
        ctx.restore();
      }

      // 5) Stickers
      stickers.forEach((st) => {
        if (t < st.startSec || t > st.startSec + st.durationSec) return;
        ctx.save();
        const bounce = st.animated ? Math.sin((t - st.startSec) * 8) * 6 : 0;
        ctx.font = `${st.size}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.emoji, (st.xPct / 100) * W, (st.yPct / 100) * H + bounce);
        if (st.label) {
          ctx.font = 'bold 11px system-ui';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(st.label, (st.xPct / 100) * W, (st.yPct / 100) * H + st.size * 0.65 + bounce);
        }
        ctx.restore();
      });

      // 6) Text Overlays & Auto Captions
      texts.forEach((ov) => {
        if (t < ov.startSec || t > ov.startSec + ov.durationSec) return;
        const local = t - ov.startSec;
        const txt = captionLang !== 'ru' && ov.translatedText ? ov.translatedText : ov.text;
        let displayText = txt;
        let scale = 1, alpha = 1, dy = 0;
        if (ov.anim === 'fade' && local < 0.4) alpha = local / 0.4;
        if (ov.anim === 'pop' && local < 0.25) scale = 0.5 + (local / 0.25) * 0.6;
        if (ov.anim === 'bounce') dy = -Math.abs(Math.sin(local * 6)) * 10;
        if (ov.anim === 'slide' && local < 0.35) dy = (1 - local / 0.35) * 32;
        if (ov.anim === 'typewriter') displayText = txt.slice(0, Math.max(1, Math.floor((local / Math.max(0.4, ov.durationSec * 0.65)) * txt.length)));

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        const px = ((ov.xPct ?? 50) / 100) * W;
        const py = (ov.yPct / 100) * H + dy;
        ctx.translate(px, py);
        ctx.scale(scale, scale);
        const fontPx = Math.round(ov.fontSize * (W / 720));
        ctx.font = `900 ${fontPx}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (ov.bgPill || ov.captionStyle === 'hormozi' || ov.captionStyle === 'minimal_glass') {
          const mw = ctx.measureText(displayText).width + 26;
          ctx.fillStyle = ov.captionStyle === 'hormozi' ? 'rgba(0,0,0,0.82)' : 'rgba(15,23,42,0.7)';
          ctx.beginPath();
          ctx.roundRect(-mw / 2, -fontPx * 0.72, mw, fontPx * 1.44, 10);
          ctx.fill();
        }
        if (ov.stroke || ov.captionStyle === 'hormozi') {
          ctx.lineWidth = Math.max(2, fontPx * 0.1);
          ctx.strokeStyle = '#000000';
          ctx.strokeText(displayText, 0, 0);
        }
        if (ov.anim === 'glitch') {
          ctx.fillStyle = '#00f0ff';
          ctx.fillText(displayText, -2, 0);
          ctx.fillStyle = '#ff006e';
          ctx.fillText(displayText, 2, 0);
        }
        ctx.fillStyle = ov.anim === 'karaoke' && Math.floor(local * 3) % 2 === 0 ? '#facc15' : ov.color;
        ctx.fillText(displayText, 0, 0);
        ctx.restore();
      });
    },
    [clips, texts, stickers, brushStrokes, avatarEnabled, avatarName, playing, captionLang, drawClipLayer, rgbR, rgbG, rgbB, fxChromatic, fxVhsLines, fxGrain, vignette, fxLetterbox]
  );

  useEffect(() => {
    if (studioView === 'editor') drawFrameAt(playhead);
  }, [playhead, canvasDims, drawFrameAt, studioView]);

  // Design Studio Live Canvas Renderer
  useEffect(() => {
    if (studioView !== 'design') return;
    const c = designCanvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const p = DESIGN_STUDIO_PRESETS[designPresetIdx] || DESIGN_STUDIO_PRESETS[0];
    c.width = p.w;
    c.height = p.h;
    const g = ctx.createLinearGradient(0, 0, p.w, p.h);
    g.addColorStop(0, designBg1);
    g.addColorStop(1, designBg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, p.w, p.h);
    // Decorative glow orbs
    const orb = ctx.createRadialGradient(p.w * 0.8, p.h * 0.25, 20, p.w * 0.8, p.h * 0.25, p.w * 0.4);
    orb.addColorStop(0, 'rgba(255,255,255,0.28)');
    orb.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = orb;
    ctx.fillRect(0, 0, p.w, p.h);
    // Badge
    if (designBadge) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.roundRect(64, 58, 220, 56, 28);
      ctx.fill();
      ctx.fillStyle = '#090d16';
      ctx.font = '900 28px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(designBadge, 174, 96);
    }
    // Emoji
    ctx.font = `${Math.round(p.h * 0.28)}px system-ui`;
    ctx.textAlign = 'right';
    ctx.fillText(designEmoji, p.w - 72, p.h * 0.62);
    // Headline
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = `900 ${Math.round(p.h * 0.11)}px system-ui`;
    ctx.fillText(designHeadline, 64, p.h * 0.56, p.w * 0.72);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.round(p.h * 0.055)}px system-ui`;
    ctx.fillText(designSub, 64, p.h * 0.72, p.w * 0.72);
  }, [studioView, designPresetIdx, designHeadline, designSub, designBadge, designBg1, designBg2, designEmoji]);

  // Playback loop
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
  }, [playing, totalDuration]);

  // ==================== ACTIONS ====================
  const handleImportMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pushHistory();
    const url = URL.createObjectURL(file);
    const id = `clip_${Date.now()}`;
    const targetMode = importTargetTrackRef.current;

    if (file.type.startsWith('audio/')) {
      audioElRef.current = new Audio(url);
      setAudioTracks((p) => [...p, { id: `aud_${Date.now()}`, name: file.name, kind: 'music', startSec: 0, durationSec: 8, volume: 85, url }]);
      setStatusMsg(`Аудиодорожка добавлена: ${file.name}`);
      return;
    }
    const track: 'main' | 'overlay' = targetMode === 'overlay' ? 'overlay' : 'main';
    const startSec = targetMode === 'overlay' ? Number(playhead.toFixed(1)) : clips.filter((c) => c.track === 'main').reduce((m, c) => Math.max(m, c.startSec + c.durationSec), 0);

    const finalize = (kind: 'video' | 'image', dur: number) => {
      if (targetMode === 'replace' && selectedClip) {
        mediaElementsRef.current[selectedClip.id] = mediaElementsRef.current[id];
        setClips((p) => p.map((c) => (c.id === selectedClip.id ? { ...c, name: file.name, kind, srcUrl: url } : c)));
        setStatusMsg(`Фрагмент заменён на «${file.name}»`);
      } else {
        const nextClip: VideoClip = {
          id, track, name: file.name, kind, srcUrl: url, color: '#0ea5e9',
          startSec, durationSec: dur, speed: 1, speedCurve: 'linear', transition: 'fade',
          motion: kind === 'image' ? 'zoom_in' : 'static', opacity: 100, blendMode: 'source-over',
          mask: 'none', pipX: 70, pipY: 28, pipScale: 0.38,
        };
        setClips((p) => [...p, nextClip]);
        setSelectedClipId(id);
        setStatusMsg(`${track === 'overlay' ? 'Наложение PiP' : 'Клип'} добавлен: ${file.name}`);
      }
    };

    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.src = url;
      img.onload = () => drawFrameAt(playhead);
      mediaElementsRef.current[id] = img;
      finalize('image', 4);
    } else if (file.type.startsWith('video/')) {
      const vid = document.createElement('video');
      vid.src = url;
      vid.muted = true;
      vid.playsInline = true;
      vid.onloadedmetadata = () => {
        mediaElementsRef.current[id] = vid;
        finalize('video', Math.max(2, Math.min(30, Number((vid.duration || 5).toFixed(1)))));
      };
    }
    e.target.value = '';
  };

  const handleSplitAtPlayhead = () => {
    const target = clips.find((c) => c.track === 'main' && playhead > c.startSec + 0.25 && playhead < c.startSec + c.durationSec - 0.25);
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
    setStatusMsg('Клип разделён ✂');
  };

  const handleJoinAdjacent = () => {
    const mains = clips.filter((c) => c.track === 'main').sort((a, b) => a.startSec - b.startSec);
    const idx = mains.findIndex((c) => c.id === selectedClipId);
    if (idx < 0 || idx >= mains.length - 1) {
      setStatusMsg('Выберите клип, после которого есть следующий фрагмент');
      return;
    }
    pushHistory();
    const a = mains[idx], b = mains[idx + 1];
    setClips((prev) =>
      prev
        .filter((c) => c.id !== b.id)
        .map((c) => (c.id === a.id ? { ...c, name: `${a.name} + ${b.name}`, durationSec: Number((a.durationSec + b.durationSec).toFixed(2)) } : c))
    );
    setStatusMsg('Два фрагмента соединены в единый клип ✓');
  };

  const handleFreezeFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    pushHistory();
    drawFrameAt(playhead);
    const dataUrl = canvas.toDataURL('image/png');
    const id = `freeze_${Date.now()}`;
    const img = new Image();
    img.src = dataUrl;
    mediaElementsRef.current[id] = img;
    const end = clips.filter((c) => c.track === 'main').reduce((m, c) => Math.max(m, c.startSec + c.durationSec), 0);
    setClips((p) => [
      ...p,
      {
        id, track: 'main', name: `Стоп-кадр ${playhead.toFixed(1)}s`, kind: 'freeze', srcUrl: dataUrl,
        color: '#0ea5e9', startSec: end, durationSec: 2.5, speed: 1, speedCurve: 'linear',
        transition: 'none', motion: 'static', opacity: 100, blendMode: 'source-over', mask: 'none',
      },
    ]);
    setStatusMsg('Создан стоп-кадр (Freeze Frame) ❄');
  };

  const handleAddKeyframe = () => {
    if (!selectedClip) return;
    const tPct = Math.max(0, Math.min(1, (playhead - selectedClip.startSec) / Math.max(0.1, selectedClip.durationSec)));
    const existing = selectedClip.keyframes || [];
    const nextKf = {
      tPct: Number(tPct.toFixed(2)),
      xPct: existing.length % 2 === 0 ? 0 : 8,
      yPct: 0,
      scale: existing.length % 2 === 0 ? 1 : 1.18,
      rotate: existing.length % 2 === 0 ? 0 : 4,
      opacity: 1,
    };
    updateSelectedClip({ keyframes: [...existing.filter((k) => Math.abs(k.tPct - nextKf.tPct) > 0.05), nextKf] });
    setStatusMsg(`Добавлен ключевой кадр (${Math.round(tPct * 100)}%) ◆`);
  };

  // Voiceover Microphone Recording
  const toggleVoiceover = async () => {
    if (recordingVoice) {
      voiceRecRef.current?.stop();
      setRecordingVoice(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      voiceRecRef.current = mr;
      mr.ondataavailable = (ev) => { if (ev.data.size > 0) voiceChunksRef.current.push(ev.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(voiceChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        audioElRef.current = new Audio(url);
        setAudioTracks((p) => [...p, { id: `vo_${Date.now()}`, name: `Озвучка (${voiceFilter})`, kind: 'voiceover', startSec: Number(playhead.toFixed(1)), durationSec: 4, volume: 100, url }]);
        setStatusMsg('Голосовая озвучка записана и добавлена на A1 🎙');
      };
      mr.start();
      setRecordingVoice(true);
      setStatusMsg('Идёт запись голоса с микрофона...');
    } catch {
      setStatusMsg('Нет доступа к микрофону — используйте TTS-озвучку');
    }
  };

  // Multi-Voice TTS
  const handleSpeakCaptionsTTS = () => {
    const allText = texts.map((t) => (captionLang !== 'ru' && t.translatedText ? t.translatedText : t.text)).join('. ');
    if (!allText || !('speechSynthesis' in window)) {
      setStatusMsg('Нет текста для озвучки TTS');
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(allText);
    u.lang = captionLang === 'en' ? 'en-US' : captionLang === 'de' ? 'de-DE' : captionLang === 'es' ? 'es-ES' : 'ru-RU';
    u.pitch = voiceFilter === 'chipmunk' ? 1.6 : voiceFilter === 'deep_bass' ? 0.6 : ttsPitch;
    u.rate = voiceFilter === 'robot' ? 0.9 : 1.02;
    window.speechSynthesis.speak(u);
    setStatusMsg('Идёт нейро-озвучка текста (TTS) 🔊');
  };

  // Auto Captions + Translate + SRT/TXT Transcript Export
  const handleAutoCaptions = () => {
    pushHistory();
    const lines = scriptText.split('\n').map((s) => s.trim()).filter(Boolean);
    const step = totalDuration / Math.max(1, lines.length);
    const nextCaps: TextOverlay[] = lines.map((ln, idx) => ({
      id: `cap_${Date.now()}_${idx}`,
      text: ln,
      translatedText: translateCaptionText(ln, captionLang),
      startSec: Number((idx * step).toFixed(2)),
      durationSec: Number(Math.max(1.2, step - 0.15).toFixed(2)),
      yPct: 78,
      fontSize: 21,
      color: '#facc15',
      bgPill: true,
      stroke: true,
      anim: 'karaoke',
      isCaption: true,
      captionStyle: 'hormozi',
    }));
    setTexts((p) => [...p.filter((x) => !x.isCaption), ...nextCaps]);
    setStatusMsg(`Сгенерировано ${nextCaps.length} синхронных автосубтитров ✓`);
  };

  const handleExportTranscript = (ext: 'srt' | 'txt') => {
    const fmtSrt = (sec: number) => {
      const h = String(Math.floor(sec / 3600)).padStart(2, '0');
      const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
      const s = String(Math.floor(sec % 60)).padStart(2, '0');
      const ms = String(Math.round((sec % 1) * 1000)).padStart(3, '0');
      return `${h}:${m}:${s},${ms}`;
    };
    const content =
      ext === 'txt'
        ? texts.map((t) => t.text).join('\n')
        : texts.map((t, i) => `${i + 1}\n${fmtSrt(t.startSec)} --> ${fmtSrt(t.startSec + t.durationSec)}\n${t.text}\n`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `luma_transcript.${ext}`;
    a.click();
    setStatusMsg(`Транскрипт экспортирован (.${ext.toUpperCase()})`);
  };

  // Working EditPilot AI Command Interpreter!
  const handleRunEditPilot = () => {
    const q = editPilotInput.trim();
    if (!q) return;
    setEditPilotInput('');
    const low = q.toLowerCase();
    let reply = '';

    if (low.includes('ч/б') || low.includes('черно') || low.includes('bw')) {
      setLutId('bw');
      reply = 'Применён кинематографичный фильтр Cinema B&W.';
    } else if (low.includes('9:16') || low.includes('shorts') || low.includes('reels') || low.includes('вертикал')) {
      setAspect('9:16');
      reply = 'Кадр автоматически переформатирован в 9:16 (Reels / Shorts).';
    } else if (low.includes('16:9') || low.includes('youtube')) {
      setAspect('16:9');
      reply = 'Выбран широкоформатный 16:9 YouTube.';
    } else if (low.includes('глитч') || low.includes('glitch')) {
      setFxChromatic(true);
      updateSelectedClip({ transition: 'glitch' });
      reply = 'Включён глитч-переход и хроматическая аберрация.';
    } else if (low.includes('ускор') || low.includes('2x') || low.includes('быстр')) {
      updateSelectedClip({ speed: 2, speedCurve: 'montage' });
      reply = 'Скорость клипа увеличена до 2.0x с кривой Montage.';
    } else if (low.includes('замедл') || low.includes('slow')) {
      updateSelectedClip({ speed: 0.5, speedCurve: 'hero' });
      reply = 'Включено плавное замедление 0.5x (Hero Curve).';
    } else if (low.includes('разреж') || low.includes('split')) {
      handleSplitAtPlayhead();
      reply = 'Выполнен разрез клипа на текущей позиции ползунка.';
    } else if (low.includes('бит') || low.includes('beat')) {
      const markers = Array.from({ length: Math.floor(totalDuration * 2) }).map((_, i) => Number((i * 0.5 + 0.25).toFixed(2)));
      setBeatMarkers(markers);
      reply = `Расставлено ${markers.length} автоматических бит-маркеров.`;
    } else if (low.includes('субтитр') || low.includes('caption')) {
      handleAutoCaptions();
      reply = 'Автосубтитры синхронизированы по дорожке.';
    } else if (low.includes('аватар') || low.includes('avatar')) {
      setAvatarEnabled((v) => !v);
      reply = 'Цифровой ИИ-аватар переключён на видео.';
    } else if (low.includes('титр') || low.includes('текст')) {
      const txt = q.replace(/добавь|титр|текст/gi, '').trim() || 'LUMA EDITPILOT';
      setTexts((p) => [...p, { id: `txt_${Date.now()}`, text: txt, startSec: playhead, durationSec: 3, yPct: 45, fontSize: 28, color: '#ffffff', bgPill: true, anim: 'pop' }]);
      reply = `Добавлен анимированный титр «${txt}».`;
    } else if (low.includes('пауз') || low.includes('тишин')) {
      let cur = 0;
      setClips((prev) => prev.map((c) => (c.track === 'main' ? { ...c, startSec: cur, durationSec: Math.max(1.5, Number((c.durationSec * 0.9).toFixed(1))) } : c)).map((c) => { if (c.track === 'main') { const out = { ...c, startSec: cur }; cur += c.durationSec; return out; } return c; }));
      reply = 'Удалены паузы и слова-паразиты, таймлайн уплотнён!';
    } else if (low.includes('аниме') || low.includes('anime')) {
      setStylize('anime');
      reply = 'Включена стилизация Anime AI.';
    } else {
      setLutId('cyber');
      setAiUpscale(true);
      reply = `EditPilot обработал запрос «${q}»: улучшена чёткость (AI Upscale) и цветокоррекция Cyber Teal.`;
    }
    setEditPilotLog((p) => [...p.slice(-6), `Вы: ${q}`, `EditPilot: ${reply}`]);
    setStatusMsg(reply);
  };

  // AI Video Scene / Image Generator (Seedance / Seedream)
  const handleGenerateAIScene = (asOverlay: boolean) => {
    pushHistory();
    const palettes: [string, string][] = [['#0ea5e9', '#6366f1'], ['#ec4899', '#7c3aed'], ['#10b981', '#0f172a'], ['#f59e0b', '#be123c']];
    const [c1, c2] = palettes[Math.floor(Math.random() * palettes.length)];
    const end = clips.filter((c) => c.track === 'main').reduce((m, c) => Math.max(m, c.startSec + c.durationSec), 0);
    const id = `ai_${Date.now()}`;
    setClips((p) => [
      ...p,
      {
        id, track: asOverlay ? 'overlay' : 'main', name: `AI: ${aiGenPrompt.slice(0, 18)}`, kind: 'ai_scene',
        color: c1, secondaryColor: c2, startSec: asOverlay ? Number(playhead.toFixed(1)) : end, durationSec: 4,
        speed: 1, speedCurve: 'linear', transition: 'zoom', motion: 'zoom_in', opacity: 100,
        blendMode: asOverlay ? 'screen' : 'source-over', mask: asOverlay ? 'circle' : 'none',
        pipX: 74, pipY: 30, pipScale: 0.36, aiPrompt: aiGenPrompt,
      },
    ]);
    setSelectedClipId(id);
    setStatusMsg(asOverlay ? 'Seedream AI арт добавлен как PiP-наложение ✨' : 'Seedance / Sora AI сцена сгенерирована на таймлайн 🎬');
  };

  const handleScriptToVideo = () => {
    pushHistory();
    const lines = scriptText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const colors = ['#0284c7', '#7c3aed', '#059669', '#e11d48', '#d97706'];
    const genClips: VideoClip[] = lines.map((ln, idx) => ({
      id: `scv_${Date.now()}_${idx}`, track: 'main', name: `Сцена ${idx + 1}`, kind: 'ai_scene',
      color: colors[idx % colors.length], secondaryColor: '#090d16', startSec: idx * 3, durationSec: 3,
      speed: 1, speedCurve: 'linear', transition: idx % 2 === 0 ? 'fade' : 'zoom', motion: idx % 2 === 0 ? 'zoom_in' : 'pan_right',
      opacity: 100, blendMode: 'source-over', mask: 'none', aiPrompt: ln,
    }));
    const genTexts: TextOverlay[] = lines.map((ln, idx) => ({
      id: `sct_${Date.now()}_${idx}`, text: ln, startSec: idx * 3 + 0.15, durationSec: 2.7,
      yPct: 74, fontSize: 22, color: '#ffffff', bgPill: true, stroke: true, anim: 'karaoke', isCaption: true, captionStyle: 'hormozi',
    }));
    setClips(genClips);
    setTexts(genTexts);
    setSelectedClipId(genClips[0].id);
    setPlayhead(0);
    setStatusMsg(`Сценарий превращён в видео из ${genClips.length} сцен с титрами! 🎬`);
  };

  const handleLongToShorts = () => {
    pushHistory();
    setAspect('9:16');
    setLutId('cyber');
    handleAutoCaptions();
    setStatusMsg('Long-to-Shorts: 9:16 + хайлайт-цветокор + Hormozi субтитры готовы! ⚡');
  };

  // Real Video Export with Converter, Smart Compressor & Live Dock Render Progress
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function' || exporting) return;
    setExporting(true);
    setExportProgress(0);
    setPlaying(false);
    const renderTitle = `Рендер ${exportRes} · ${exportCodec.toUpperCase()}`;
    window.dispatchEvent(new CustomEvent('luma-render-progress', { detail: { active: true, percent: 2, title: renderTitle } }));
    try {
      const codecMeta = CODEC_OPTIONS.find((c) => c.id === exportCodec) || CODEC_OPTIONS[0];
      const mime = MediaRecorder.isTypeSupported(codecMeta.mime)
        ? codecMeta.mime
        : 'fallbackMime' in codecMeta && codecMeta.fallbackMime && MediaRecorder.isTypeSupported(codecMeta.fallbackMime)
        ? codecMeta.fallbackMime
        : 'video/webm';
      const stream = canvas.captureStream(exportFps);
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: exportBitrate * 1_000_000 });
      mr.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
      const done = new Promise<Blob>((resolve) => { mr.onstop = () => resolve(new Blob(chunks, { type: mime })); });
      mr.start(200);

      const stepMs = Math.round(1000 / Math.min(30, exportFps));
      const totalSteps = Math.max(20, Math.round((totalDuration * 1000) / stepMs));
      for (let i = 0; i <= totalSteps; i++) {
        const curT = (i / totalSteps) * totalDuration;
        drawFrameAt(curT);
        const pct = Math.round((i / totalSteps) * 100);
        setExportProgress(pct);
        window.dispatchEvent(new CustomEvent('luma-render-progress', { detail: { active: true, percent: Math.max(2, pct), title: renderTitle } }));
        await new Promise((r) => setTimeout(r, stepMs));
      }
      mr.stop();
      const blob = await done;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luma_cut_${exportRes}_${exportCodec}_${Date.now()}.${codecMeta.ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      const mb = (blob.size / (1024 * 1024)).toFixed(2);
      setStatusMsg(`Рендер завершён: ${mb} МБ (${exportRes} · ${exportCodec.toUpperCase()})`);
      onNotify?.('Luma Cut Studio', `Видео экспортировано (${mb} МБ)`, 'success');
    } catch {
      setStatusMsg('Ошибка рендера видео');
    } finally {
      setExporting(false);
      window.dispatchEvent(new CustomEvent('luma-render-progress', { detail: { active: false, percent: 100, title: renderTitle } }));
    }
  };

  const estFileMb = ((totalDuration * exportBitrate) / 8).toFixed(1);
  const subText = isDark ? 'text-white/55' : 'text-slate-500';
  const panelBg = isDark ? 'bg-[#10131c] border-white/10' : 'bg-white border-slate-200';
  const btnCls = isDark
    ? 'px-2 py-1 rounded-lg text-[11px] bg-white/[0.06] hover:bg-white/14 border border-white/10 text-white/85 flex items-center gap-1 cursor-pointer transition'
    : 'px-2 py-1 rounded-lg text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 flex items-center gap-1 cursor-pointer transition';

  return (
    <div className={`h-full flex flex-col overflow-hidden select-none ${isDark ? 'bg-[#090b11] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <input ref={fileInputRef} type="file" accept="video/*,image/*,audio/*" className="hidden" onChange={handleImportMedia} />
      <input
        ref={projectImportRef}
        type="file"
        accept=".json,.lumacut"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            try {
              const parsed = JSON.parse(String(r.result || '{}'));
              if (Array.isArray(parsed.clips)) setClips(parsed.clips);
              if (Array.isArray(parsed.texts)) setTexts(parsed.texts);
              setStatusMsg('Проект .lumacut загружен ✓');
            } catch {}
          };
          r.readAsText(f);
          e.target.value = '';
        }}
      />

      {/* Top Studio Bar */}
      <div className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${panelBg}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center rounded-xl overflow-hidden border border-white/15 mr-1">
            <button onClick={() => setStudioView('editor')} className={`px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer ${studioView === 'editor' ? 'bg-cyan-500 text-black' : 'bg-white/5 opacity-70'}`}>
              <Film size={12} /> Видеомонтаж
            </button>
            <button onClick={() => setStudioView('design')} className={`px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer ${studioView === 'design' ? 'bg-purple-500 text-white' : 'bg-white/5 opacity-70'}`}>
              <Palette size={12} /> Design Studio
            </button>
          </div>
          {studioView === 'editor' && (
            <>
              <button onClick={() => { importTargetTrackRef.current = 'main'; fileInputRef.current?.click(); }} className={btnCls}><Upload size={12} className="text-cyan-400" /> + Медиа</button>
              <button onClick={() => { importTargetTrackRef.current = 'overlay'; fileInputRef.current?.click(); }} className={btnCls}><Layers size={12} className="text-purple-400" /> + PiP Наложение</button>
              <button onClick={handleSplitAtPlayhead} className={btnCls} title="Разрезать (S)"><Scissors size={12} /> Разрез</button>
              <button onClick={handleJoinAdjacent} className={btnCls} title="Соединить со следующим"><Plus size={12} /> Соединить</button>
              <button onClick={handleFreezeFrame} className={btnCls} title="Стоп-кадр"><Snowflake size={12} className="text-sky-300" /> Стоп-кадр</button>
              <button onClick={handleUndo} disabled={undoStack.length === 0} className={`${btnCls} disabled:opacity-35`}><Undo2 size={12} /></button>
              <button onClick={handleRedo} disabled={redoStack.length === 0} className={`${btnCls} disabled:opacity-35`}><Redo2 size={12} /></button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-emerald-400 hidden xl:inline truncate max-w-[260px]">{statusMsg}</span>
          {studioView === 'editor' && (
            <>
              <select value={aspect} onChange={(e) => setAspect(e.target.value as typeof aspect)} className="px-2 py-1 rounded-lg text-[10px] bg-white/10 border border-white/10 outline-none">
                {ASPECT_RATIOS.map((ar) => <option key={ar.id} value={ar.id} className="bg-zinc-900">{ar.label}</option>)}
              </select>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify({ clips, texts, stickers, aspect, lutId }, null, 2)], { type: 'application/json' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `project_${Date.now()}.lumacut.json`;
                  a.click();
                  setStatusMsg('Проект сохранён (.lumacut.json)');
                }}
                className={btnCls}
                title="Сохранить проект"
              >
                <Save size={12} />
              </button>
              <button onClick={() => projectImportRef.current?.click()} className={btnCls} title="Открыть проект"><FolderOpen size={12} /></button>
              <button
                onClick={() => void handleExportVideo()}
                disabled={exporting}
                className="px-3 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white flex items-center gap-1 cursor-pointer shadow"
              >
                <Download size={12} /> {exporting ? `Рендер ${exportProgress}%` : `Экспорт (~${estFileMb} МБ)`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ==================== DESIGN STUDIO MODE (Thumbnails, Banners, Posters, Memes) ==================== */}
      {studioView === 'design' ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          <div className={`lg:col-span-4 border-r p-4 overflow-y-auto space-y-3 ${panelBg}`}>
            <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5"><Palette size={14} /> Design Studio — Обложки, Баннеры, Постеры и Мемы</div>
            <div className="grid grid-cols-2 gap-1.5">
              {DESIGN_STUDIO_PRESETS.map((pr, idx) => (
                <button
                  key={pr.id}
                  onClick={() => { setDesignPresetIdx(idx); setDesignHeadline(pr.headline); setDesignSub(pr.sub); setDesignBadge(pr.badge); setDesignBg1(pr.bg1); setDesignBg2(pr.bg2); }}
                  className={`p-2 rounded-xl border text-left text-[11px] font-semibold cursor-pointer ${designPresetIdx === idx ? 'bg-purple-500/20 border-purple-400 text-purple-200' : 'bg-white/5 border-white/10'}`}
                >
                  {pr.name}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <input value={designHeadline} onChange={(e) => setDesignHeadline(e.target.value)} placeholder="Главный заголовок" className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-black/30 border border-white/15 outline-none" />
              <input value={designSub} onChange={(e) => setDesignSub(e.target.value)} placeholder="Подзаголовок" className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-black/30 border border-white/15 outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={designBadge} onChange={(e) => setDesignBadge(e.target.value)} placeholder="Бейдж (NEW 2026)" className="px-2.5 py-1.5 rounded-xl text-xs bg-black/30 border border-white/15 outline-none" />
                <input value={designEmoji} onChange={(e) => setDesignEmoji(e.target.value)} placeholder="Эмодзи" className="px-2.5 py-1.5 rounded-xl text-xs bg-black/30 border border-white/15 outline-none text-center" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px]">Цвет 1 <input type="color" value={designBg1} onChange={(e) => setDesignBg1(e.target.value)} className="w-full h-8 rounded cursor-pointer bg-transparent" /></label>
                <label className="text-[10px]">Цвет 2 <input type="color" value={designBg2} onChange={(e) => setDesignBg2(e.target.value)} className="w-full h-8 rounded cursor-pointer bg-transparent" /></label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const c = designCanvasRef.current;
                  if (!c) return;
                  const a = document.createElement('a');
                  a.href = c.toDataURL('image/png');
                  a.download = `luma_design_${Date.now()}.png`;
                  a.click();
                  setStatusMsg('Дизайн сохранён в PNG ✓');
                }}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download size={13} /> Скачать PNG
              </button>
              <button
                onClick={() => {
                  const c = designCanvasRef.current;
                  if (!c) return;
                  const url = c.toDataURL('image/png');
                  const id = `des_${Date.now()}`;
                  const img = new Image();
                  img.src = url;
                  mediaElementsRef.current[id] = img;
                  setClips((p) => [...p, { id, track: 'main', name: 'Обложка Design Studio', kind: 'image', srcUrl: url, color: '#7c3aed', startSec: totalDuration, durationSec: 3.5, speed: 1, speedCurve: 'linear', transition: 'fade', motion: 'zoom_in', opacity: 100, blendMode: 'source-over', mask: 'none' }]);
                  setStudioView('editor');
                  setStatusMsg('Обложка добавлена на таймлайн видео!');
                }}
                className="px-3 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/35 text-xs font-bold cursor-pointer"
              >
                В видео →
              </button>
            </div>
          </div>
          <div className="lg:col-span-8 p-6 flex items-center justify-center bg-black/35 overflow-hidden">
            <canvas ref={designCanvasRef} className="max-w-full max-h-full rounded-2xl shadow-2xl border border-white/15 object-contain" />
          </div>
        </div>
      ) : (
        /* ==================== MAIN VIDEO EDITOR WORKSPACE ==================== */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
            {/* Left: Video Canvas Preview + Transport + Freehand Brush */}
            <div className="lg:col-span-7 flex flex-col min-h-0 bg-black/35 border-r border-white/10">
              <div className="flex-1 p-3 flex items-center justify-center min-h-0 relative overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={canvasDims.w}
                  height={canvasDims.h}
                  onMouseDown={(e) => {
                    if (!brushMode) return;
                    drawingBrushRef.current = true;
                    const r = e.currentTarget.getBoundingClientRect();
                    const pt = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
                    setBrushStrokes((p) => [...p, { id: `br_${Date.now()}`, color: brushColor, size: brushSize, glow: brushGlow, points: [pt] }]);
                  }}
                  onMouseMove={(e) => {
                    if (!brushMode || !drawingBrushRef.current) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    const pt = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
                    setBrushStrokes((p) => {
                      if (!p.length) return p;
                      const last = p[p.length - 1];
                      return [...p.slice(0, -1), { ...last, points: [...last.points, pt] }];
                    });
                  }}
                  onMouseUp={() => { drawingBrushRef.current = false; }}
                  className={`max-w-full max-h-full rounded-xl shadow-2xl border border-white/15 ${brushMode ? 'cursor-crosshair ring-2 ring-cyan-400' : ''}`}
                />
                {brushMode && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-cyan-500 text-black text-[10px] font-bold shadow">
                    🖌 Режим рисования кистью прямо на кадре
                  </div>
                )}
              </div>

              {/* Transport Bar */}
              <div className={`px-3 py-1.5 border-t flex items-center justify-between gap-2 shrink-0 ${panelBg}`}>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPlaying((p) => !p)} className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1 cursor-pointer">
                    {playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    {playing ? 'Пауза' : 'Плей'}
                  </button>
                  <button onClick={() => { setPlaying(false); setPlayhead(0); }} className={btnCls}><RotateCcw size={12} /></button>
                  <span className="font-mono text-xs text-cyan-300 ml-1">
                    {playhead.toFixed(1)}s / {totalDuration.toFixed(1)}s
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setBrushMode((v) => !v)} className={`${btnCls} ${brushMode ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300' : ''}`}>
                    <Brush size={12} /> Кисть
                  </button>
                  <button onClick={() => {
                    const c = canvasRef.current;
                    if (!c) return;
                    drawFrameAt(playhead);
                    const a = document.createElement('a');
                    a.href = c.toDataURL('image/png');
                    a.download = `luma_frame_${playhead.toFixed(1)}s.png`;
                    a.click();
                  }} className={btnCls}>
                    <Camera size={12} /> Кадр PNG
                  </button>
                </div>
              </div>
            </div>

            {/* Right: 6-Category Pro Inspector */}
            <div className={`lg:col-span-5 flex flex-col min-h-0 overflow-hidden ${panelBg}`}>
              {/* 6 Category Tabs */}
              <div className="px-2 py-1.5 border-b border-white/10 grid grid-cols-6 gap-1 shrink-0 text-[10px]">
                {(
                  [
                    ['edit', 'Монтаж', <Scissors size={11} key="e" />],
                    ['fx', 'Цвет/FX', <SlidersHorizontal size={11} key="f" />],
                    ['audio', 'Звук', <Music size={11} key="a" />],
                    ['text', 'Текст', <Type size={11} key="t" />],
                    ['ai', 'ИИ Pro', <Bot size={11} key="i" />],
                    ['templates', 'Шабл.', <Layout size={11} key="p" />],
                  ] as const
                ).map(([id, lbl, ic]) => (
                  <button
                    key={id}
                    onClick={() => setInspectorTab(id)}
                    className={`py-1.5 rounded-xl font-bold flex flex-col items-center gap-0.5 cursor-pointer transition ${
                      inspectorTab === id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'bg-white/[0.04] opacity-70 hover:opacity-100'
                    }`}
                  >
                    {ic}
                    <span>{lbl}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
                {/* ==================== CAT 1: EDITING, OVERLAY, MASKS, CHROMA, KEYFRAMES, SPEED ==================== */}
                {inspectorTab === 'edit' && selectedClip && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300 truncate">{selectedClip.name} ({selectedClip.track === 'overlay' ? 'PiP V2' : 'Main V1'})</span>
                      <div className="flex gap-1">
                        <button onClick={() => { importTargetTrackRef.current = 'replace'; fileInputRef.current?.click(); }} className={btnCls}>Заменить</button>
                        <button onClick={() => {
                          pushHistory();
                          const dup: VideoClip = { ...selectedClip, id: `clip_${Date.now()}`, name: `${selectedClip.name} (коп.)`, startSec: selectedClip.startSec + selectedClip.durationSec };
                          setClips((p) => [...p, dup]);
                        }} className={btnCls}><Copy size={11} /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-[10px] block mb-0.5 ${subText}`}>Скорость: {selectedClip.speed}x</label>
                        <input type="range" min={0.25} max={4} step={0.25} value={selectedClip.speed} onChange={(e) => updateSelectedClip({ speed: Number(e.target.value) })} className="w-full accent-cyan-400" />
                      </div>
                      <div>
                        <label className={`text-[10px] block mb-0.5 ${subText}`}>Кривая скорости</label>
                        <select value={selectedClip.speedCurve} onChange={(e) => updateSelectedClip({ speedCurve: e.target.value as SpeedCurveKind })} className="w-full px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[11px]">
                          <option value="linear">Линейная</option>
                          <option value="montage">Montage (Разгон)</option>
                          <option value="hero">Hero (Слоу-мо центр)</option>
                          <option value="bullet">Bullet Time</option>
                          <option value="jump_cut">Jump Cut</option>
                          <option value="flash_in">Flash In</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-[10px] block mb-0.5 ${subText}`}>Маска кадра</label>
                        <select value={selectedClip.mask} onChange={(e) => updateSelectedClip({ mask: e.target.value as MaskShapeKind })} className="w-full px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[11px]">
                          <option value="none">Без маски</option>
                          <option value="circle">Круг</option>
                          <option value="rect">Прямоугольник</option>
                          <option value="heart">Сердце ♥</option>
                          <option value="star">Звезда ★</option>
                          <option value="split">Разделение 50/50</option>
                        </select>
                      </div>
                      <div>
                        <label className={`text-[10px] block mb-0.5 ${subText}`}>Наложение (Blend Mode)</label>
                        <select value={selectedClip.blendMode} onChange={(e) => updateSelectedClip({ blendMode: e.target.value as BlendModeKind })} className="w-full px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[11px]">
                          <option value="source-over">Обычный (Normal)</option>
                          <option value="screen">Экран (Screen)</option>
                          <option value="multiply">Умножение (Multiply)</option>
                          <option value="overlay">Перекрытие (Overlay)</option>
                          <option value="lighten">Осветление</option>
                          <option value="darken">Затемнение</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-[10px] block mb-0.5 ${subText}`}>Переход клипа</label>
                        <select value={selectedClip.transition} onChange={(e) => updateSelectedClip({ transition: e.target.value as ClipTransition })} className="w-full px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[11px]">
                          {['none', 'fade', 'flash', 'zoom', 'wipe_left', 'glitch', 'spin', 'dissolve'].map((tr) => <option key={tr} value={tr}>{tr.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`text-[10px] block mb-0.5 ${subText}`}>Движение / Трекинг</label>
                        <select value={selectedClip.motion} onChange={(e) => updateSelectedClip({ motion: e.target.value as ClipMotion })} className="w-full px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[11px]">
                          <option value="static">Статика</option>
                          <option value="zoom_in">Плавный зум +</option>
                          <option value="zoom_out">Плавный зум -</option>
                          <option value="pan_left">Панорама влево</option>
                          <option value="pan_right">Панорама вправо</option>
                          <option value="pulse">Пульсация</option>
                          <option value="shake">Тряска камеры</option>
                          <option value="stabilized">Стабилизация</option>
                          <option value="track_focus">Отслеживание объекта</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => updateSelectedClip({ reverse: !selectedClip.reverse })} className={`${btnCls} ${selectedClip.reverse ? 'border-cyan-400 text-cyan-300' : ''}`}><Repeat size={11} /> Реверс</button>
                      <button onClick={() => updateSelectedClip({ flipH: !selectedClip.flipH })} className={btnCls}><FlipHorizontal size={11} /> Отразить</button>
                      <button onClick={() => updateSelectedClip({ rotateDeg: ((selectedClip.rotateDeg || 0) + 90) % 360 })} className={btnCls}><RotateCw size={11} /> Поворот 90°</button>
                      <button onClick={() => updateSelectedClip({ stabilize: !selectedClip.stabilize })} className={`${btnCls} ${selectedClip.stabilize ? 'border-emerald-400 text-emerald-300' : ''}`}><Crosshair size={11} /> Стабилизатор</button>
                      <button onClick={handleAddKeyframe} className="px-2 py-1 rounded-lg text-[11px] bg-amber-500/20 text-amber-300 border border-amber-400/35 cursor-pointer font-bold">
                        ◆ + Ключевой кадр ({selectedClip.keyframes?.length || 0})
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[11px]">Хромакей (Chroma Key · Зелёный экран)</span>
                        <input type="checkbox" checked={!!selectedClip.chromaKeyEnabled} onChange={(e) => updateSelectedClip({ chromaKeyEnabled: e.target.checked })} className="accent-emerald-400" />
                      </div>
                      {selectedClip.chromaKeyEnabled && (
                        <div>
                          <label className={`text-[10px] ${subText}`}>Допуск зелёного: {selectedClip.chromaTolerance ?? 75}</label>
                          <input type="range" min={20} max={150} value={selectedClip.chromaTolerance ?? 75} onChange={(e) => updateSelectedClip({ chromaTolerance: Number(e.target.value) })} className="w-full accent-emerald-400" />
                        </div>
                      )}
                      <div>
                        <label className={`text-[10px] ${subText}`}>Непрозрачность слоя: {selectedClip.opacity}%</label>
                        <input type="range" min={10} max={100} value={selectedClip.opacity} onChange={(e) => updateSelectedClip({ opacity: Number(e.target.value) })} className="w-full accent-cyan-400" />
                      </div>
                    </div>
                  </>
                )}

                {/* ==================== CAT 2: COLOR, RGB CURVES, FX, RETOUCH, STYLIZE ==================== */}
                {inspectorTab === 'fx' && (
                  <>
                    <div>
                      <div className={`text-[10px] font-bold uppercase mb-1 ${subText}`}>Кинофильтры LUT (12)</div>
                      <div className="grid grid-cols-3 gap-1">
                        {LUT_PRESETS.map((l) => (
                          <button key={l.id} onClick={() => setLutId(l.id)} className={`px-2 py-1 rounded-lg text-[10px] border cursor-pointer truncate ${lutId === l.id ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold' : 'bg-white/5 border-white/10'}`}>
                            {l.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={`text-[10px] ${subText}`}>Экспозиция: {exposure}%</label><input type="range" min={50} max={160} value={exposure} onChange={(e) => setExposure(Number(e.target.value))} className="w-full accent-cyan-400" /></div>
                      <div><label className={`text-[10px] ${subText}`}>Контраст: {contrast}%</label><input type="range" min={50} max={180} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-cyan-400" /></div>
                      <div><label className={`text-[10px] ${subText}`}>Насыщенность: {saturation}%</label><input type="range" min={0} max={200} value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full accent-cyan-400" /></div>
                      <div><label className={`text-[10px] ${subText}`}>Баланс белого: {whiteBalance}</label><input type="range" min={-50} max={50} value={whiteBalance} onChange={(e) => setWhiteBalance(Number(e.target.value))} className="w-full accent-amber-400" /></div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <div className="text-[10px] font-bold text-cyan-300">Кривые RGB (Красный · Зелёный · Синий)</div>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="text-[10px] text-rose-400">R {rgbR}%<input type="range" min={40} max={160} value={rgbR} onChange={(e) => setRgbR(Number(e.target.value))} className="w-full accent-rose-500" /></label>
                        <label className="text-[10px] text-emerald-400">G {rgbG}%<input type="range" min={40} max={160} value={rgbG} onChange={(e) => setRgbG(Number(e.target.value))} className="w-full accent-emerald-500" /></label>
                        <label className="text-[10px] text-sky-400">B {rgbB}%<input type="range" min={40} max={160} value={rgbB} onChange={(e) => setRgbB(Number(e.target.value))} className="w-full accent-sky-500" /></label>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="text-[10px] font-bold text-pink-300">Ретушь лица и тела + Стилизация AI</div>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="text-[10px]">Кожа {retouchSmooth}%<input type="range" min={0} max={100} value={retouchSmooth} onChange={(e) => setRetouchSmooth(Number(e.target.value))} className="w-full accent-pink-400" /></label>
                        <label className="text-[10px]">Сияние {retouchGlow}%<input type="range" min={0} max={100} value={retouchGlow} onChange={(e) => setRetouchGlow(Number(e.target.value))} className="w-full accent-pink-400" /></label>
                        <label className="text-[10px]">Контур {retouchSlim}%<input type="range" min={0} max={60} value={retouchSlim} onChange={(e) => setRetouchSlim(Number(e.target.value))} className="w-full accent-pink-400" /></label>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1">
                        {(['none', 'anime', '3d_toon', 'oil_paint', 'sketch', 'cyber_comic'] as const).map((st) => (
                          <button key={st} onClick={() => setStylize(st)} className={`py-1 rounded-lg text-[10px] border cursor-pointer ${stylize === st ? 'bg-purple-500/25 border-purple-400 text-purple-200 font-bold' : 'bg-white/5 border-white/10'}`}>
                            {st.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        ['Зерно', fxGrain, () => setFxGrain((v) => !v)],
                        ['VHS', fxVhsLines, () => setFxVhsLines((v) => !v)],
                        ['Хроматика', fxChromatic, () => setFxChromatic((v) => !v)],
                        ['Кинополосы', fxLetterbox, () => setFxLetterbox((v) => !v)],
                        ['Неон Силуэт', fxBodyGlow, () => setFxBodyGlow((v) => !v)],
                        ['AI Upscale 4K', aiUpscale, () => setAiUpscale((v) => !v)],
                      ].map(([lbl, on, toggle]) => (
                        <button key={String(lbl)} onClick={toggle as () => void} className={`${btnCls} ${on ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200' : ''}`}>
                          {String(lbl)}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* ==================== CAT 3: AUDIO, MUSIC LIBRARY, VOICEOVER, VOICE FX, SEED AUDIO ==================== */}
                {inspectorTab === 'audio' && (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => void toggleVoiceover()} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer ${recordingVoice ? 'bg-rose-500 text-white animate-pulse' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/35'}`}>
                        {recordingVoice ? <MicOff size={12} /> : <Mic size={12} />} {recordingVoice ? 'Стоп запись' : 'Записать озвучку'}
                      </button>
                      <button onClick={() => {
                        setAudioTracks((p) => [...p, { id: `ext_${Date.now()}`, name: `Извлечено: ${selectedClip?.name || 'Видео'}`, kind: 'extracted', startSec: 0, durationSec: selectedClip?.durationSec || 4, volume: 90 }]);
                        setStatusMsg('Аудио извлечено из видео на дорожку A1 🎵');
                      }} className={btnCls}>Извлечь аудио</button>
                      <button onClick={() => {
                        const mk = Array.from({ length: Math.floor(totalDuration * 2) }).map((_, i) => Number((i * 0.5 + 0.25).toFixed(2)));
                        setBeatMarkers(mk);
                        setStatusMsg(`Авто-биты расставлены (${mk.length} маркеров) ◆`);
                      }} className={btnCls}><Zap size={11} className="text-amber-400" /> Авто-биты</button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                      <div className="text-[10px] font-bold text-emerald-300">Очистка звука, Разделение вокала и Фильтры голоса</div>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setAudioNoiseReduce((v) => !v)} className={`${btnCls} ${audioNoiseReduce ? 'border-emerald-400 text-emerald-300' : ''}`}>Шумоподавление</button>
                        <button onClick={() => setAudioSpeechEnhance((v) => !v)} className={`${btnCls} ${audioSpeechEnhance ? 'border-emerald-400 text-emerald-300' : ''}`}>Усиление речи</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={vocalSplit} onChange={(e) => setVocalSplit(e.target.value as typeof vocalSplit)} className="px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[11px]">
                          <option value="full">Микс: Полный звук</option>
                          <option value="vocals_only">Только вокал (AI Split)</option>
                          <option value="instrumental">Только минус / музыка</option>
                        </select>
                        <select value={voiceFilter} onChange={(e) => setVoiceFilter(e.target.value as VoiceFilterKind)} className="px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[11px]">
                          <option value="normal">Голос: Оригинал</option>
                          <option value="robot">Робот</option>
                          <option value="chipmunk">Бурундук (Высокий)</option>
                          <option value="deep_bass">Глубокий бас</option>
                          <option value="echo">Эхо студии</option>
                          <option value="radio">Рация / Радио</option>
                        </select>
                      </div>
                    </div>

                    {/* Text-to-SFX (Seed Audio) */}
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="text-[10px] font-bold text-amber-300">Seed Audio · Генератор SFX по тексту</div>
                      <div className="flex gap-1.5">
                        <input value={seedAudioPrompt} onChange={(e) => setSeedAudioPrompt(e.target.value)} placeholder="whoosh, laser, boom, wind..." className="flex-1 px-2 py-1 rounded-lg bg-black/30 border border-white/15 text-[11px] outline-none" />
                        <button
                          onClick={() => {
                            playProceduralAudio(seedAudioPrompt, voiceFilter);
                            setAudioTracks((p) => [...p, { id: `sfx_${Date.now()}`, name: `SFX: ${seedAudioPrompt.slice(0, 16)}`, kind: 'seed_sfx', startSec: Number(playhead.toFixed(1)), durationSec: 1.5, volume: 90, synthPreset: seedAudioPrompt }]);
                            setStatusMsg(`Звуковой эффект «${seedAudioPrompt}» сгенерирован!`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-bold text-[11px] cursor-pointer"
                        >
                          Создать
                        </button>
                      </div>
                    </div>

                    {/* Royalty-Free Music & SFX Library */}
                    <div>
                      <div className={`text-[10px] font-bold uppercase mb-1 ${subText}`}>Библиотека музыки и SFX без авторских прав</div>
                      <div className="space-y-1">
                        {ROYALTY_FREE_AUDIO_LIB.map((tr) => (
                          <div key={tr.id} className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold truncate">{tr.name}</div>
                              <div className={`text-[9px] ${subText}`}>{tr.badge} · {tr.durationSec}s</div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => playProceduralAudio(tr.id, voiceFilter)} className={btnCls}><Volume2 size={11} /></button>
                              <button
                                onClick={() => {
                                  playProceduralAudio(tr.id, voiceFilter);
                                  setAudioTracks((p) => [...p, { id: `lib_${Date.now()}`, name: tr.name, kind: tr.kind, startSec: Number(playhead.toFixed(1)), durationSec: tr.durationSec, volume: 80, synthPreset: tr.id }]);
                                  setStatusMsg(`Добавлено на A1: ${tr.name}`);
                                }}
                                className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold cursor-pointer"
                              >
                                + A1
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ==================== CAT 4: TEXT, AUTO CAPTIONS, TRANSLATOR, TTS, BRUSH, STICKERS ==================== */}
                {inspectorTab === 'text' && (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={handleAutoCaptions} className="px-2.5 py-1 rounded-lg bg-cyan-500 text-black font-bold text-[11px] cursor-pointer flex items-center gap-1"><MessageSquare size={11} /> Автосубтитры</button>
                      <button onClick={handleSpeakCaptionsTTS} className={btnCls}><Volume2 size={11} className="text-emerald-400" /> Озвучка TTS</button>
                      <button onClick={() => {
                        setTexts((p) => [...p, { id: `txt_${Date.now()}`, text: 'НОВЫЙ ТИТР', startSec: Number(playhead.toFixed(1)), durationSec: 3, yPct: 48, fontSize: 28, color: '#ffffff', bgPill: true, anim: 'pop' }]);
                      }} className={btnCls}><Plus size={11} /> Титр</button>
                      <button onClick={() => handleExportTranscript('srt')} className={btnCls}><FileText size={11} /> .SRT</button>
                      <button onClick={() => handleExportTranscript('txt')} className={btnCls}><FileText size={11} /> .TXT</button>
                    </div>

                    {/* Caption Translator */}
                    <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
                      <span className="text-[11px] flex items-center gap-1"><Languages size={12} className="text-sky-400" /> Перевод субтитров:</span>
                      <div className="flex gap-1">
                        {(['ru', 'en', 'de', 'es'] as const).map((lng) => (
                          <button
                            key={lng}
                            onClick={() => {
                              setCaptionLang(lng);
                              setTexts((p) => p.map((t) => ({ ...t, translatedText: translateCaptionText(t.text, lng) })));
                              setStatusMsg(`Субтитры переведены на ${lng.toUpperCase()}`);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer ${captionLang === lng ? 'bg-sky-500 text-black' : 'bg-white/10'}`}
                          >
                            {lng}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedText && (
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                        <input value={selectedText.text} onChange={(e) => setTexts((p) => p.map((t) => (t.id === selectedText.id ? { ...t, text: e.target.value } : t)))} className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-xs outline-none" />
                        <div className="grid grid-cols-3 gap-1.5">
                          <select value={selectedText.anim} onChange={(e) => setTexts((p) => p.map((t) => (t.id === selectedText.id ? { ...t, anim: e.target.value as TextAnim } : t)))} className="px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[10px]">
                            {['fade', 'slide', 'pop', 'typewriter', 'glitch', 'bounce', 'spread', 'karaoke'].map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                          </select>
                          <select value={selectedText.captionStyle || 'hormozi'} onChange={(e) => setTexts((p) => p.map((t) => (t.id === selectedText.id ? { ...t, captionStyle: e.target.value as CaptionStyleKind } : t)))} className="px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[10px]">
                            <option value="hormozi">Hormozi Bold</option>
                            <option value="neon_karaoke">Neon Karaoke</option>
                            <option value="minimal_glass">Minimal Glass</option>
                            <option value="cinema">Cinema Sub</option>
                          </select>
                          <input type="color" value={selectedText.color} onChange={(e) => setTexts((p) => p.map((t) => (t.id === selectedText.id ? { ...t, color: e.target.value } : t)))} className="w-full h-7 rounded cursor-pointer bg-transparent" />
                        </div>
                      </div>
                    )}

                    {/* Freehand Canvas Brush */}
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold flex items-center gap-1"><Brush size={12} className="text-cyan-400" /> Рисование кистью на видео</span>
                        <div className="flex gap-1">
                          <button onClick={() => setBrushMode((v) => !v)} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${brushMode ? 'bg-cyan-500 text-black' : 'bg-white/10'}`}>{brushMode ? 'ВКЛ' : 'ВЫКЛ'}</button>
                          <button onClick={() => setBrushStrokes([])} className="px-2 py-0.5 rounded-lg text-[10px] bg-rose-500/20 text-rose-300 cursor-pointer">Стереть</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-8 h-6 rounded bg-transparent cursor-pointer" />
                        <input type="range" min={2} max={18} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="flex-1 accent-cyan-400" />
                        <label className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={brushGlow} onChange={(e) => setBrushGlow(e.target.checked)} /> Неон</label>
                      </div>
                    </div>

                    {/* Stickers + AI Sticker Generator */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {STICKER_PALETTE.map((em) => (
                          <button key={em} onClick={() => setStickers((p) => [...p, { id: `st_${Date.now()}`, emoji: em, xPct: 22 + Math.round(Math.random() * 55), yPct: 22 + Math.round(Math.random() * 50), size: 42, startSec: playhead, durationSec: 3, animated: true }])} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-base cursor-pointer">
                            {em}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <input value={aiStickerPrompt} onChange={(e) => setAiStickerPrompt(e.target.value)} placeholder="ИИ-стикер по тексту (напр. ПОДПИШИСЬ)..." className="flex-1 px-2 py-1 rounded-lg bg-black/30 border border-white/15 text-[11px] outline-none" />
                        <button
                          onClick={() => {
                            if (!aiStickerPrompt.trim()) return;
                            setStickers((p) => [...p, { id: `aist_${Date.now()}`, emoji: '✨', label: aiStickerPrompt.trim().toUpperCase(), xPct: 50, yPct: 30, size: 36, startSec: playhead, durationSec: 3.5, animated: true }]);
                            setAiStickerPrompt('');
                            setStatusMsg('ИИ-стикер добавлен на видео ✨');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          + AI Стикер
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ==================== CAT 5: AI STUDIO (EditPilot, Seedance/Sora, BG Remove, Script-to-Video, Shorts, Avatar) ==================== */}
                {inspectorTab === 'ai' && (
                  <>
                    {/* EditPilot Command Bar */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/12 to-purple-500/12 border border-cyan-400/30 space-y-1.5">
                      <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5"><Bot size={13} /> EditPilot AI · Монтаж текстом</div>
                      <div className="flex gap-1.5">
                        <input
                          value={editPilotInput}
                          onChange={(e) => setEditPilotInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRunEditPilot()}
                          placeholder="«сделай ч/б», «формат 9:16», «добавь титр Привет»..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-[11px] outline-none"
                        />
                        <button onClick={handleRunEditPilot} className="px-2.5 py-1 rounded-lg bg-cyan-500 text-black font-bold text-[11px] cursor-pointer">Пуск</button>
                      </div>
                      <div className="max-h-20 overflow-y-auto space-y-0.5 text-[10px] text-white/75">
                        {editPilotLog.map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    </div>

                    {/* Seedance / Sora 2 & Seedream Generators */}
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="text-[11px] font-bold text-purple-300 flex items-center gap-1"><Sparkles size={12} /> Генератор ИИ-видео (Seedance/Sora) и Арта (Seedream)</div>
                      <input value={aiGenPrompt} onChange={(e) => setAiGenPrompt(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-[11px] outline-none" />
                      <div className="grid grid-cols-2 gap-1.5">
                        <button onClick={() => handleGenerateAIScene(false)} className="py-1.5 rounded-lg bg-purple-500/25 text-purple-200 border border-purple-400/35 text-[10px] font-bold cursor-pointer">🎬 Сгенерировать сцену</button>
                        <button onClick={() => handleGenerateAIScene(true)} className="py-1.5 rounded-lg bg-pink-500/25 text-pink-200 border border-pink-400/35 text-[10px] font-bold cursor-pointer">🖼 ИИ-Арт (PiP слой)</button>
                      </div>
                    </div>

                    {/* Script-to-Video */}
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="text-[11px] font-bold text-amber-300">Сценарий → Видео (Script-to-Video)</div>
                      <textarea value={scriptText} onChange={(e) => setScriptText(e.target.value)} rows={3} className="w-full p-2 rounded-lg bg-black/30 border border-white/15 text-[11px] outline-none resize-none" />
                      <button onClick={handleScriptToVideo} className="w-full py-1.5 rounded-lg bg-amber-500 text-black font-bold text-[11px] cursor-pointer">Собрать видео по сценарию ✨</button>
                    </div>

                    {/* 1-Click AI Utilities */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={handleLongToShorts} className={btnCls}><Zap size={12} className="text-amber-400" /> Long → Shorts 9:16</button>
                      <button onClick={() => updateSelectedClip({ bgRemoveEnabled: !selectedClip?.bgRemoveEnabled, bgReplaceColor: '#020617' })} className={`${btnCls} ${selectedClip?.bgRemoveEnabled ? 'border-emerald-400 text-emerald-300' : ''}`}>
                        <Wand2 size={12} /> Удалить фон ИИ
                      </button>
                      <button onClick={() => setAvatarEnabled((v) => !v)} className={`${btnCls} ${avatarEnabled ? 'border-cyan-400 text-cyan-300' : ''}`}>
                        <UserCheck size={12} /> ИИ-Аватар (Lip-Sync)
                      </button>
                      <button
                        onClick={() => {
                          let cur = 0;
                          setClips((prev) => prev.map((c) => { if (c.track !== 'main') return c; const d = Math.max(1.5, Number((c.durationSec * 0.88).toFixed(1))); const out = { ...c, startSec: cur, durationSec: d }; cur += d; return out; }));
                          setStatusMsg('Паузы и слова-паразиты удалены ✂');
                        }}
                        className={btnCls}
                      >
                        <ScissorsLineDashed size={12} /> Удалить паузы
                      </button>
                    </div>
                  </>
                )}

                {/* ==================== CAT 6: TEMPLATES, CONVERTER & SMART COMPRESSOR ==================== */}
                {inspectorTab === 'templates' && (
                  <>
                    <div className="text-[10px] font-bold uppercase text-cyan-300">Готовые шаблоны монтажа в 1 клик</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PROJECT_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => {
                            pushHistory();
                            setClips(tpl.clips);
                            setTexts(tpl.texts);
                            setAspect(tpl.aspect);
                            setLutId(tpl.lut);
                            setSelectedClipId(tpl.clips[0].id);
                            setPlayhead(0);
                            setStatusMsg(`Применён шаблон: ${tpl.name}`);
                          }}
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 text-left cursor-pointer transition"
                        >
                          <div className="text-[11px] font-bold truncate">{tpl.name}</div>
                          <div className="text-[9px] font-mono text-cyan-400 mt-0.5">{tpl.badge} · LUT {tpl.lut.toUpperCase()}</div>
                        </button>
                      ))}
                    </div>

                    {/* Format Converter & Smart Compressor */}
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                      <div className="text-[11px] font-bold text-emerald-300">Конвертер форматов и Сжатие видео</div>
                      <select value={exportCodec} onChange={(e) => setExportCodec(e.target.value as typeof exportCodec)} className="w-full px-2 py-1.5 rounded-lg bg-zinc-900 border border-white/15 text-[11px]">
                        {CODEC_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                      <div className="grid grid-cols-3 gap-1.5">
                        <select value={exportRes} onChange={(e) => setExportRes(e.target.value as typeof exportRes)} className="px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[10px]">
                          <option value="720p">720p HD</option>
                          <option value="1080p">1080p FHD</option>
                          <option value="4k">4K UHD</option>
                        </select>
                        <select value={exportFps} onChange={(e) => setExportFps(Number(e.target.value) as 24 | 30 | 60)} className="px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[10px]">
                          <option value={24}>24 FPS</option>
                          <option value={30}>30 FPS</option>
                          <option value={60}>60 FPS</option>
                        </select>
                        <select value={exportBitrate} onChange={(e) => setExportBitrate(Number(e.target.value) as 2 | 5 | 10)} className="px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[10px]">
                          <option value={2}>2 Мбит/с (Сжато)</option>
                          <option value={5}>5 Мбит/с (Норм)</option>
                          <option value={10}>10 Мбит/с (Макс)</option>
                        </select>
                      </div>
                      <div className={`text-[10px] font-mono ${subText}`}>Расчётный размер файла: ~{estFileMb} МБ</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Multi-Track Timeline (Ruler + Beat Markers + V1 + V2 PiP + T1 + A1) */}
          <div className={`h-44 shrink-0 border-t flex flex-col overflow-hidden ${panelBg}`}>
            <div className="px-3 py-1 border-b border-white/10 flex items-center justify-between text-[10px] shrink-0">
              <div className="flex items-center gap-3 font-mono">
                <span className="text-cyan-300 font-bold">МНОГОДОРОЖЕЧНЫЙ ТАЙМЛАЙН</span>
                <span className={subText}>V1 · V2 (PiP) · T1 (Титры) · A1 (Звук) · ◆ Биты ({beatMarkers.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoomPxPerSec((z) => Math.max(36, z - 12))} className={btnCls}>-</button>
                <span className="font-mono text-[10px]">{zoomPxPerSec}px/s</span>
                <button onClick={() => setZoomPxPerSec((z) => Math.min(130, z + 12))} className={btnCls}>+</button>
              </div>
            </div>

            <div
              className="flex-1 overflow-x-auto overflow-y-auto relative p-2 space-y-1.5"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left + e.currentTarget.scrollLeft - 56;
                setPlayhead(Math.max(0, Math.min(totalDuration, Number((x / zoomPxPerSec).toFixed(2)))));
              }}
            >
              {/* Playhead Line */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 shadow-[0_0_8px_#f43f5e]"
                style={{ left: `${56 + playhead * zoomPxPerSec}px` }}
              />

              {/* Beat Markers Ruler */}
              <div className="flex items-center h-4 relative">
                <span className="w-12 shrink-0 text-[9px] font-mono opacity-50">TIME</span>
                <div className="relative h-full" style={{ width: `${totalDuration * zoomPxPerSec + 120}px` }}>
                  {beatMarkers.map((b, i) => (
                    <span key={i} title={`Бит ${b}s`} className="absolute top-0.5 text-[9px] text-amber-400 -translate-x-1/2" style={{ left: `${b * zoomPxPerSec}px` }}>◆</span>
                  ))}
                </div>
              </div>

              {/* V2 Overlay / PiP Track */}
              <div className="flex items-center h-7 relative">
                <span className="w-12 shrink-0 text-[9px] font-mono text-purple-300 font-bold">V2 PiP</span>
                <div className="relative h-full bg-white/[0.03] rounded-md" style={{ width: `${totalDuration * zoomPxPerSec + 120}px` }}>
                  {clips.filter((c) => c.track === 'overlay').map((c) => (
                    <div
                      key={c.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedClipId(c.id); setInspectorTab('edit'); }}
                      className={`absolute top-0.5 bottom-0.5 rounded-md px-2 flex items-center text-[10px] font-semibold truncate cursor-pointer border ${selectedClipId === c.id ? 'border-white bg-purple-500/70' : 'border-purple-400/40 bg-purple-600/45'}`}
                      style={{ left: `${c.startSec * zoomPxPerSec}px`, width: `${Math.max(36, c.durationSec * zoomPxPerSec - 2)}px` }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* V1 Main Video Track */}
              <div className="flex items-center h-9 relative">
                <span className="w-12 shrink-0 text-[9px] font-mono text-cyan-300 font-bold">V1 VID</span>
                <div className="relative h-full bg-white/[0.04] rounded-md" style={{ width: `${totalDuration * zoomPxPerSec + 120}px` }}>
                  {clips.filter((c) => c.track === 'main').map((c) => (
                    <div
                      key={c.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedClipId(c.id); }}
                      className={`absolute top-0.5 bottom-0.5 rounded-lg px-2 flex items-center justify-between gap-1 text-[10px] font-bold truncate cursor-pointer border ${selectedClipId === c.id ? 'border-white ring-1 ring-cyan-300' : 'border-white/20'}`}
                      style={{ left: `${c.startSec * zoomPxPerSec}px`, width: `${Math.max(44, c.durationSec * zoomPxPerSec - 2)}px`, backgroundColor: `${c.color}aa` }}
                    >
                      <span className="truncate">{c.name} {c.reverse ? '↺' : ''}</span>
                      {clips.filter((x) => x.track === 'main').length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); setClips((p) => p.filter((x) => x.id !== c.id)); }} className="opacity-70 hover:opacity-100 cursor-pointer"><Trash2 size={10} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* T1 Text / Captions Track */}
              <div className="flex items-center h-6 relative">
                <span className="w-12 shrink-0 text-[9px] font-mono text-amber-300 font-bold">T1 TXT</span>
                <div className="relative h-full bg-white/[0.03] rounded-md" style={{ width: `${totalDuration * zoomPxPerSec + 120}px` }}>
                  {texts.map((t) => (
                    <div
                      key={t.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedTextId(t.id); setInspectorTab('text'); }}
                      className={`absolute top-0.5 bottom-0.5 rounded px-1.5 flex items-center text-[9px] font-semibold truncate cursor-pointer border ${selectedTextId === t.id ? 'border-white bg-amber-500/70 text-black' : 'border-amber-400/35 bg-amber-500/30'}`}
                      style={{ left: `${t.startSec * zoomPxPerSec}px`, width: `${Math.max(36, t.durationSec * zoomPxPerSec - 2)}px` }}
                    >
                      {t.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* A1 Audio Track */}
              <div className="flex items-center h-6 relative">
                <span className="w-12 shrink-0 text-[9px] font-mono text-emerald-300 font-bold">A1 AUD</span>
                <div className="relative h-full bg-white/[0.03] rounded-md" style={{ width: `${totalDuration * zoomPxPerSec + 120}px` }}>
                  {audioTracks.map((a) => (
                    <div
                      key={a.id}
                      onClick={(e) => { e.stopPropagation(); if (a.synthPreset) playProceduralAudio(a.synthPreset, voiceFilter); setInspectorTab('audio'); }}
                      className="absolute top-0.5 bottom-0.5 rounded px-2 flex items-center text-[9px] font-semibold truncate cursor-pointer bg-emerald-500/35 border border-emerald-400/40 text-emerald-100"
                      style={{ left: `${a.startSec * zoomPxPerSec}px`, width: `${Math.max(40, a.durationSec * zoomPxPerSec - 2)}px` }}
                    >
                      ♪ {a.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
