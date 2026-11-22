import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Film,
  Play,
  Pause,
  Scissors,
  Plus,
  Trash2,
  Copy,
  Download,
  Type,
  Sparkles,
  Sliders,
  Music,
  Upload,
  Gauge,
  Layers,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

interface VideoClip {
  id: string;
  name: string;
  kind: 'demo' | 'video' | 'image';
  srcUrl?: string;
  color: string;
  startSec: number;
  durationSec: number;
  speed: number;
  transition: 'none' | 'fade' | 'flash' | 'zoom';
}

interface TextOverlay {
  id: string;
  text: string;
  startSec: number;
  durationSec: number;
  yPct: number;
  fontSize: number;
  color: string;
  anim: 'fade' | 'slide' | 'pop';
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
];

const ASPECT_RATIOS: { id: '16:9' | '9:16' | '1:1' | '4:3'; w: number; h: number; label: string }[] = [
  { id: '16:9', w: 640, h: 360, label: '16:9 YouTube' },
  { id: '9:16', w: 300, h: 534, label: '9:16 Reels / TikTok' },
  { id: '1:1', w: 420, h: 420, label: '1:1 Square' },
  { id: '4:3', w: 520, h: 390, label: '4:3 Classic' },
];

interface LumaCutStudioWindowProps {
  isDark: boolean;
  onNotify?: (title: string, msg: string, kind?: 'info' | 'success' | 'warn') => void;
}

export const LumaCutStudioWindow: React.FC<LumaCutStudioWindowProps> = ({
  isDark,
  onNotify,
}) => {
  const [clips, setClips] = useState<VideoClip[]>([
    {
      id: 'clip_demo_1',
      name: 'Carbon 1.5 Intro Motion',
      kind: 'demo',
      color: '#06b6d4',
      startSec: 0,
      durationSec: 4,
      speed: 1,
      transition: 'fade',
    },
    {
      id: 'clip_demo_2',
      name: 'Obsidian Wave Scene',
      kind: 'demo',
      color: '#8b5cf6',
      startSec: 4,
      durationSec: 4,
      speed: 1,
      transition: 'zoom',
    },
  ]);
  const [texts, setTexts] = useState<TextOverlay[]>([
    {
      id: 'txt_1',
      text: 'LUMA OS 1.5 · CARBON',
      startSec: 0.4,
      durationSec: 3.2,
      yPct: 50,
      fontSize: 28,
      color: '#ffffff',
      anim: 'pop',
    },
    {
      id: 'txt_2',
      text: 'СМОНТИРОВАНО В LUMA CUT STUDIO',
      startSec: 4.3,
      durationSec: 3.2,
      yPct: 76,
      fontSize: 18,
      color: '#38bdf8',
      anim: 'slide',
    },
  ]);

  const [selectedClipId, setSelectedClipId] = useState<string>('clip_demo_1');
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'clip' | 'color' | 'text' | 'audio'>('color');
  const [aspectId, setAspectId] = useState<'16:9' | '9:16' | '1:1' | '4:3'>('16:9');
  const [lutId, setLutId] = useState<string>('carbon');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(105);
  const [saturation, setSaturation] = useState(108);
  const [vignette, setVignette] = useState(25);
  const [audioName, setAudioName] = useState<string>('');
  const [audioVolume, setAudioVolume] = useState(80);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaElementsRef = useRef<Record<string, HTMLVideoElement | HTMLImageElement>>({});
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const aspect = useMemo(
    () => ASPECT_RATIOS.find((a) => a.id === aspectId) || ASPECT_RATIOS[0],
    [aspectId]
  );

  const totalDuration = useMemo(() => {
    const clipEnd = clips.reduce((m, c) => Math.max(m, c.startSec + c.durationSec), 0);
    const txtEnd = texts.reduce((m, t) => Math.max(m, t.startSec + t.durationSec), 0);
    return Math.max(4, Number(Math.max(clipEnd, txtEnd).toFixed(2)));
  }, [clips, texts]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || clips[0];
  const selectedText = texts.find((t) => t.id === selectedTextId) || null;

  // Render exact frame at timestamp `t` onto the HTML5 <canvas> compositor
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
      const baseFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.filter = lut && lut.filter !== 'none' ? `${baseFilter} ${lut.filter}` : baseFilter;

      const activeClip = clips.find((c) => t >= c.startSec && t < c.startSec + c.durationSec);
      if (activeClip) {
        const localT = (t - activeClip.startSec) * activeClip.speed;
        const progress = Math.min(1, Math.max(0, (t - activeClip.startSec) / Math.max(0.1, activeClip.durationSec)));

        // Transition transform
        let alpha = 1;
        let scale = 1;
        if (activeClip.transition === 'fade' && progress < 0.15) {
          alpha = progress / 0.15;
        } else if (activeClip.transition === 'zoom' && progress < 0.2) {
          scale = 1.18 - (progress / 0.2) * 0.18;
        }
        ctx.globalAlpha = alpha;
        ctx.translate(W / 2, H / 2);
        ctx.scale(scale, scale);
        ctx.translate(-W / 2, -H / 2);

        const mediaEl = activeClip.srcUrl ? mediaElementsRef.current[activeClip.id] : undefined;
        if (activeClip.kind === 'image' && mediaEl instanceof HTMLImageElement && mediaEl.complete) {
          ctx.drawImage(mediaEl, 0, 0, W, H);
        } else if (activeClip.kind === 'video' && mediaEl instanceof HTMLVideoElement && mediaEl.readyState >= 2) {
          if (Math.abs(mediaEl.currentTime - localT) > 0.25) {
            try {
              mediaEl.currentTime = localT % Math.max(0.5, mediaEl.duration || 10);
            } catch {
              // ignore
            }
          }
          ctx.drawImage(mediaEl, 0, 0, W, H);
        } else {
          // Procedural Cinema Carbon Motion Background
          const grad = ctx.createLinearGradient(
            Math.cos(localT * 0.9) * W * 0.3,
            0,
            W,
            H
          );
          grad.addColorStop(0, '#070a10');
          grad.addColorStop(0.5, activeClip.color);
          grad.addColorStop(1, '#090d16');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);

          // Animated geometric carbon waves
          ctx.strokeStyle = 'rgba(255,255,255,0.16)';
          ctx.lineWidth = 2;
          for (let ring = 0; ring < 5; ring++) {
            ctx.beginPath();
            for (let x = 0; x <= W; x += 24) {
              const y =
                H * (0.25 + ring * 0.14) +
                Math.sin(x * 0.012 + localT * 2.2 + ring) * (18 + ring * 5);
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }

          // Floating kinetic orb
          const ox = W * (0.5 + Math.sin(localT * 1.1) * 0.26);
          const oy = H * (0.5 + Math.cos(localT * 0.85) * 0.18);
          const orbGrad = ctx.createRadialGradient(ox, oy, 6, ox, oy, Math.min(W, H) * 0.28);
          orbGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
          orbGrad.addColorStop(0.4, `${activeClip.color}99`);
          orbGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(ox, oy, Math.min(W, H) * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }

        // Flash transition peak
        if (activeClip.transition === 'flash' && progress < 0.12) {
          ctx.fillStyle = `rgba(255,255,255,${1 - progress / 0.12})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
      ctx.restore();

      // Vignette
      if (vignette > 0) {
        const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.22, W / 2, H / 2, W * 0.72);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }

      // Render Animated Text Overlays
      texts.forEach((ov) => {
        if (t < ov.startSec || t > ov.startSec + ov.durationSec) return;
        const p = (t - ov.startSec) / Math.max(0.1, ov.durationSec);
        ctx.save();
        let ty = (ov.yPct / 100) * H;
        let alpha = 1;
        let sc = 1;
        if (ov.anim === 'fade') {
          if (p < 0.18) alpha = p / 0.18;
          else if (p > 0.82) alpha = (1 - p) / 0.18;
        } else if (ov.anim === 'slide') {
          if (p < 0.22) {
            alpha = p / 0.22;
            ty += (1 - p / 0.22) * 28;
          }
        } else if (ov.anim === 'pop') {
          if (p < 0.18) {
            sc = 0.6 + (p / 0.18) * 0.45;
            alpha = p / 0.18;
          }
        }
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.translate(W / 2, ty);
        ctx.scale(sc, sc);
        ctx.font = `800 ${ov.fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.75)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = ov.color;
        ctx.fillText(ov.text, 0, 0);
        ctx.restore();
      });
    },
    [clips, texts, lutId, brightness, contrast, saturation, vignette]
  );

  // Draw whenever playhead or styles change
  useEffect(() => {
    drawFrameAt(playhead);
  }, [playhead, aspect, drawFrameAt]);

  // Playback loop
  useEffect(() => {
    if (!playing) {
      audioElRef.current?.pause();
      return;
    }
    if (audioElRef.current) {
      audioElRef.current.volume = audioVolume / 100;
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
  }, [playing, totalDuration, audioVolume]);

  const handleImportMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const id = `clip_${Date.now()}`;
    const startSec = clips.reduce((m, c) => Math.max(m, c.startSec + c.durationSec), 0);

    if (file.type.startsWith('audio/')) {
      const aud = new Audio(url);
      audioElRef.current = aud;
      setAudioName(file.name);
      setStatusMsg(`Аудиодорожка добавлена: ${file.name}`);
      return;
    }

    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.src = url;
      img.onload = () => drawFrameAt(playhead);
      mediaElementsRef.current[id] = img;
      setClips((prev) => [
        ...prev,
        {
          id,
          name: file.name,
          kind: 'image',
          srcUrl: url,
          color: '#10b981',
          startSec,
          durationSec: 4,
          speed: 1,
          transition: 'fade',
        },
      ]);
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
        setClips((prev) => [
          ...prev,
          {
            id,
            name: file.name,
            kind: 'video',
            srcUrl: url,
            color: '#f59e0b',
            startSec,
            durationSec: dur,
            speed: 1,
            transition: 'none',
          },
        ]);
        setSelectedClipId(id);
      };
    }
  };

  const handleSplitAtPlayhead = () => {
    const target = clips.find((c) => playhead > c.startSec + 0.3 && playhead < c.startSec + c.durationSec - 0.3);
    if (!target) {
      setStatusMsg('Наведите ползунок времени внутрь клипа для разреза');
      return;
    }
    const leftDur = Number((playhead - target.startSec).toFixed(2));
    const rightDur = Number((target.durationSec - leftDur).toFixed(2));
    const rightClip: VideoClip = {
      ...target,
      id: `clip_${Date.now()}`,
      name: `${target.name} (часть 2)`,
      startSec: Number(playhead.toFixed(2)),
      durationSec: rightDur,
    };
    setClips((prev) =>
      prev.flatMap((c) => (c.id === target.id ? [{ ...c, durationSec: leftDur }, rightClip] : [c]))
    );
    setSelectedClipId(rightClip.id);
    setStatusMsg('Клип разрезан точно по линии воспроизведения ✂');
  };

  const handleDuplicateClip = () => {
    if (!selectedClip) return;
    const end = clips.reduce((m, c) => Math.max(m, c.startSec + c.durationSec), 0);
    const dup: VideoClip = {
      ...selectedClip,
      id: `clip_${Date.now()}`,
      name: `${selectedClip.name} (копия)`,
      startSec: end,
    };
    setClips((prev) => [...prev, dup]);
    setSelectedClipId(dup.id);
  };

  const handleDeleteClip = (id: string) => {
    if (clips.length <= 1) return;
    setClips((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddText = () => {
    const ov: TextOverlay = {
      id: `txt_${Date.now()}`,
      text: 'НОВЫЙ ТИТР',
      startSec: Number(playhead.toFixed(1)),
      durationSec: 2.5,
      yPct: 45,
      fontSize: 26,
      color: '#ffffff',
      anim: 'pop',
    };
    setTexts((prev) => [...prev, ov]);
    setSelectedTextId(ov.id);
    setInspectorTab('text');
  };

  // Real WebM Video Export using canvas.captureStream(30) + MediaRecorder!
  const handleExportWebM = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function' || exporting) return;
    setPlaying(false);
    setExporting(true);
    setExportProgress(0);
    setStatusMsg('Идёт рендер видео в .webm...');

    try {
      const stream = canvas.captureStream(30);
      const chunks: Blob[] = [];
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_800_000 });
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      const done = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      });

      rec.start();
      const fps = 30;
      const totalFrames = Math.ceil(totalDuration * fps);
      for (let f = 0; f <= totalFrames; f++) {
        const t = (f / fps);
        drawFrameAt(t);
        setPlayhead(t);
        setExportProgress(Math.round((f / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 1000 / fps));
      }
      rec.stop();
      const blob = await done;
      const mb = (blob.size / (1024 * 1024)).toFixed(2);

      // Download immediately + notify
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `luma_cut_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(dlUrl);
      setStatusMsg(`Готово! Экспортировано видео (${mb} МБ)`);
      onNotify?.('Luma Cut Studio', `Видео успешно смонтировано и экспортировано (${mb} МБ .webm)`, 'success');
    } catch {
      setStatusMsg('Ошибка экспорта видео в текущем браузере');
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const subText = isDark ? 'text-white/55' : 'text-slate-500';

  return (
    <div
      className={`h-full flex flex-col select-none ${
        isDark ? 'bg-[#0a0c12] text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Studio Bar */}
      <div
        className={`px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
          isDark ? 'bg-[#10131c] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white">
            <Film size={14} />
          </div>
          <span className="text-xs font-bold">Luma Cut Studio</span>
          <label className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-400/30 cursor-pointer flex items-center gap-1">
            <Upload size={12} /> Импорт медиа
            <input type="file" accept="video/*,image/*,audio/*" onChange={handleImportMedia} className="hidden" />
          </label>
          <button
            onClick={handleAddText}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border flex items-center gap-1 ${
              isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <Type size={12} className="text-amber-400" /> + Титр
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={aspectId}
            onChange={(e) => setAspectId(e.target.value as '16:9' | '9:16' | '1:1' | '4:3')}
            className={`px-2 py-1 rounded-xl text-[11px] border outline-none ${
              isDark ? 'bg-[#171b26] border-white/12 text-white' : 'bg-white border-slate-200'
            }`}
          >
            {ASPECT_RATIOS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => void handleExportWebM()}
            disabled={exporting}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:opacity-90 disabled:opacity-50 text-white flex items-center gap-1.5 shadow"
          >
            <Download size={13} />
            {exporting ? `Экспорт ${exportProgress}%` : 'Экспорт .WebM'}
          </button>
        </div>
      </div>

      {/* Upper Workspace: Preview Monitor + Right Inspector */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Center Canvas Monitor */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 relative overflow-hidden bg-black/40">
          <canvas
            ref={canvasRef}
            width={aspect.w}
            height={aspect.h}
            className="max-w-full max-h-[calc(100%-46px)] rounded-xl border border-white/15 shadow-2xl object-contain"
          />

          {/* Transport Bar */}
          <div className="mt-2.5 flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-black/65 border border-white/12 backdrop-blur-md text-xs">
            <button
              onClick={() => setPlayhead(0)}
              className="text-white/70 hover:text-white"
              title="В начало"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="w-7 h-7 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center"
            >
              {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
            </button>
            <span className="font-mono text-[11px] text-cyan-300">
              {playhead.toFixed(1)}s / {totalDuration.toFixed(1)}s
            </span>
            {statusMsg && (
              <span className="text-[10px] text-emerald-300 flex items-center gap-1 max-w-[200px] truncate">
                <CheckCircle2 size={11} /> {statusMsg}
              </span>
            )}
          </div>
        </div>

        {/* Right Inspector Panel (Color/LUT, Clip, Text, Audio) */}
        <div
          className={`w-64 shrink-0 border-l flex flex-col overflow-hidden ${
            isDark ? 'bg-[#0e1119] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="grid grid-cols-4 border-b border-white/10 text-[10px] font-semibold">
            {(
              [
                ['color', 'Цвет', <Sparkles key="c" size={11} />],
                ['clip', 'Клип', <Gauge key="g" size={11} />],
                ['text', 'Текст', <Type key="t" size={11} />],
                ['audio', 'Звук', <Music key="m" size={11} />],
              ] as const
            ).map(([k, lbl, ic]) => (
              <button
                key={k}
                onClick={() => setInspectorTab(k)}
                className={`py-2 flex flex-col items-center gap-0.5 transition ${
                  inspectorTab === k
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                    : subText
                }`}
              >
                {ic}
                {lbl}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
            {inspectorTab === 'color' && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Кино-фильтры (10 LUT)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {LUT_PRESETS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLutId(l.id)}
                      className={`px-2 py-1.5 rounded-xl text-[10px] font-medium border text-left transition ${
                        lutId === l.id
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                          : isDark
                          ? 'bg-white/[0.04] border-white/10 hover:bg-white/10'
                          : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="truncate font-semibold">{l.name}</div>
                      <div className="text-[8px] font-mono opacity-60">{l.badge}</div>
                    </button>
                  ))}
                </div>
                <div className="space-y-2 pt-1">
                  <div>
                    <div className={`text-[10px] flex justify-between ${subText}`}>
                      <span>Яркость</span>
                      <span>{brightness}%</span>
                    </div>
                    <input type="range" min={50} max={160} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-cyan-400" />
                  </div>
                  <div>
                    <div className={`text-[10px] flex justify-between ${subText}`}>
                      <span>Контраст</span>
                      <span>{contrast}%</span>
                    </div>
                    <input type="range" min={50} max={180} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-cyan-400" />
                  </div>
                  <div>
                    <div className={`text-[10px] flex justify-between ${subText}`}>
                      <span>Насыщенность</span>
                      <span>{saturation}%</span>
                    </div>
                    <input type="range" min={0} max={200} value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full accent-cyan-400" />
                  </div>
                  <div>
                    <div className={`text-[10px] flex justify-between ${subText}`}>
                      <span>Виньетка</span>
                      <span>{vignette}%</span>
                    </div>
                    <input type="range" min={0} max={85} value={vignette} onChange={(e) => setVignette(Number(e.target.value))} className="w-full accent-cyan-400" />
                  </div>
                </div>
              </>
            )}

            {inspectorTab === 'clip' && selectedClip && (
              <div className="space-y-2.5">
                <div className="font-semibold truncate">{selectedClip.name}</div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Длительность: {selectedClip.durationSec}s</div>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    step={0.5}
                    value={selectedClip.durationSec}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setClips((prev) => prev.map((c) => (c.id === selectedClip.id ? { ...c, durationSec: d } : c)));
                    }}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Скорость: {selectedClip.speed}×</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0.5, 1, 1.5, 2].map((sp) => (
                      <button
                        key={sp}
                        onClick={() =>
                          setClips((prev) => prev.map((c) => (c.id === selectedClip.id ? { ...c, speed: sp } : c)))
                        }
                        className={`py-1 rounded-lg text-[10px] font-mono border ${
                          selectedClip.speed === sp
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-white/[0.04] border-white/10'
                        }`}
                      >
                        {sp}×
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Переход входа</div>
                  <select
                    value={selectedClip.transition}
                    onChange={(e) =>
                      setClips((prev) =>
                        prev.map((c) =>
                          c.id === selectedClip.id ? { ...c, transition: e.target.value as VideoClip['transition'] } : c
                        )
                      )
                    }
                    className={`w-full px-2 py-1.5 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-[#171b26] border-white/12 text-white' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="none">Без перехода</option>
                    <option value="fade">Плавное появление</option>
                    <option value="zoom">Динамичный зум</option>
                    <option value="flash">Вспышка (Flash)</option>
                  </select>
                </div>
              </div>
            )}

            {inspectorTab === 'text' && (
              <div className="space-y-2.5">
                {!selectedText ? (
                  <div className={`text-[11px] ${subText}`}>
                    Выберите титр на дорожке ниже или нажмите «+ Титр»
                  </div>
                ) : (
                  <>
                    <input
                      value={selectedText.text}
                      onChange={(e) =>
                        setTexts((prev) =>
                          prev.map((t) => (t.id === selectedText.id ? { ...t, text: e.target.value } : t))
                        )
                      }
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none ${
                        isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className={`text-[10px] ${subText}`}>Размер: {selectedText.fontSize}px</div>
                        <input
                          type="range"
                          min={14}
                          max={48}
                          value={selectedText.fontSize}
                          onChange={(e) =>
                            setTexts((prev) =>
                              prev.map((t) => (t.id === selectedText.id ? { ...t, fontSize: Number(e.target.value) } : t))
                            )
                          }
                          className="w-full accent-amber-400"
                        />
                      </div>
                      <div>
                        <div className={`text-[10px] ${subText}`}>Позиция Y: {selectedText.yPct}%</div>
                        <input
                          type="range"
                          min={12}
                          max={90}
                          value={selectedText.yPct}
                          onChange={(e) =>
                            setTexts((prev) =>
                              prev.map((t) => (t.id === selectedText.id ? { ...t, yPct: Number(e.target.value) } : t))
                            )
                          }
                          className="w-full accent-amber-400"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="color"
                        value={selectedText.color}
                        onChange={(e) =>
                          setTexts((prev) =>
                            prev.map((t) => (t.id === selectedText.id ? { ...t, color: e.target.value } : t))
                          )
                        }
                        className="w-10 h-7 rounded cursor-pointer bg-transparent"
                      />
                      <select
                        value={selectedText.anim}
                        onChange={(e) =>
                          setTexts((prev) =>
                            prev.map((t) =>
                              t.id === selectedText.id ? { ...t, anim: e.target.value as TextOverlay['anim'] } : t
                            )
                          )
                        }
                        className={`flex-1 px-2 py-1 rounded-xl text-xs border ${
                          isDark ? 'bg-[#171b26] border-white/12 text-white' : 'bg-white border-slate-200'
                        }`}
                      >
                        <option value="pop">Появление (Pop)</option>
                        <option value="slide">Выезд снизу (Slide)</option>
                        <option value="fade">Плавный (Fade)</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        setTexts((prev) => prev.filter((t) => t.id !== selectedText.id));
                        setSelectedTextId(null);
                      }}
                      className="w-full py-1.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-400/25 text-[11px]"
                    >
                      Удалить титр
                    </button>
                  </>
                )}
              </div>
            )}

            {inspectorTab === 'audio' && (
              <div className="space-y-3">
                <div className={`text-[11px] ${subText}`}>
                  {audioName ? `Трек: ${audioName}` : 'Импортируйте MP3/WAV через «Импорт медиа»'}
                </div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Громкость дорожки: {audioVolume}%</div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={audioVolume}
                    onChange={(e) => setAudioVolume(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Multi-Track Nonlinear Timeline (CapCut Style) */}
      <div
        className={`h-44 shrink-0 border-t flex flex-col ${
          isDark ? 'bg-[#0c0f16] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        {/* Timeline Tools */}
        <div
          className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 ${
            isDark ? 'border-white/10' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSplitAtPlayhead}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30 flex items-center gap-1"
            >
              <Scissors size={12} /> Разрезать
            </button>
            <button
              onClick={handleDuplicateClip}
              className={`px-2 py-1 rounded-lg text-[11px] border flex items-center gap-1 ${
                isDark ? 'bg-white/[0.04] border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <Copy size={11} /> Дубль
            </button>
            <button
              onClick={() => selectedClip && handleDeleteClip(selectedClip.id)}
              disabled={clips.length <= 1}
              className="px-2 py-1 rounded-lg text-[11px] bg-rose-500/10 hover:bg-rose-500/25 disabled:opacity-35 text-rose-400 border border-rose-400/20 flex items-center gap-1"
            >
              <Trash2 size={11} /> Удалить
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <Sliders size={11} className="text-cyan-400" />
            <input
              type="range"
              min={0}
              max={totalDuration}
              step={0.05}
              value={playhead}
              onChange={(e) => setPlayhead(Number(e.target.value))}
              className="w-40 accent-cyan-400"
            />
          </div>
        </div>

        {/* Tracks Area */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 relative">
          {/* Playhead Red/Cyan Needle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-20 pointer-events-none shadow-[0_0_8px_#22d3ee]"
            style={{ left: `calc(76px + ${(playhead / totalDuration) * 84}%)` }}
          />

          {/* Track 1: Video / Media */}
          <div className="flex items-center gap-2">
            <span className={`w-16 text-[10px] font-bold uppercase shrink-0 flex items-center gap-1 ${subText}`}>
              <Layers size={10} /> Видео
            </span>
            <div className="flex-1 h-10 rounded-xl bg-white/[0.04] border border-white/10 relative overflow-hidden">
              {clips.map((c) => {
                const leftPct = (c.startSec / totalDuration) * 100;
                const widthPct = (c.durationSec / totalDuration) * 100;
                const sel = c.id === selectedClipId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedClipId(c.id);
                      setInspectorTab('clip');
                    }}
                    className={`absolute top-1 bottom-1 rounded-lg px-2 flex items-center justify-between text-[10px] font-semibold cursor-pointer truncate border transition ${
                      sel ? 'border-white shadow-lg ring-1 ring-cyan-400' : 'border-white/20 opacity-85 hover:opacity-100'
                    }`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(8, widthPct)}%`,
                      background: `linear-gradient(135deg, ${c.color}cc, ${c.color}66)`,
                    }}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-[9px] font-mono opacity-80 ml-1">{c.durationSec}s</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track 2: Text Overlays */}
          <div className="flex items-center gap-2">
            <span className={`w-16 text-[10px] font-bold uppercase shrink-0 flex items-center gap-1 ${subText}`}>
              <Type size={10} /> Титры
            </span>
            <div className="flex-1 h-8 rounded-xl bg-white/[0.03] border border-white/10 relative overflow-hidden">
              {texts.map((t) => {
                const leftPct = (t.startSec / totalDuration) * 100;
                const widthPct = (t.durationSec / totalDuration) * 100;
                const sel = t.id === selectedTextId;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTextId(t.id);
                      setInspectorTab('text');
                    }}
                    className={`absolute top-1 bottom-1 rounded-lg px-2 flex items-center text-[10px] font-semibold cursor-pointer truncate border ${
                      sel
                        ? 'bg-amber-500/80 border-white text-black'
                        : 'bg-amber-500/35 border-amber-400/40 text-amber-100'
                    }`}
                    style={{ left: `${leftPct}%`, width: `${Math.max(8, widthPct)}%` }}
                  >
                    <span className="truncate">{t.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track 3: Audio */}
          <div className="flex items-center gap-2">
            <span className={`w-16 text-[10px] font-bold uppercase shrink-0 flex items-center gap-1 ${subText}`}>
              <Music size={10} /> Аудио
            </span>
            <div className="flex-1 h-7 rounded-xl bg-white/[0.03] border border-white/10 flex items-center px-2.5 text-[10px]">
              {audioName ? (
                <div className="w-full h-4 rounded-md bg-emerald-500/30 border border-emerald-400/40 px-2 flex items-center text-emerald-200 truncate">
                  ♫ {audioName}
                </div>
              ) : (
                <span className="opacity-40 flex items-center gap-1">
                  <Plus size={10} /> Перетащите или импортируйте аудиодорожку
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
