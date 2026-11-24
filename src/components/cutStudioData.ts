// Shared presets, templates, AI generators, WebAudio royalty-free music/SFX synthesizer,
// and Design Studio templates for Luma Cut Studio 1.5.2 Pro (CapCut-class engine)

export type ClipTransition = 'none' | 'fade' | 'flash' | 'zoom' | 'wipe_left' | 'wipe_up' | 'glitch' | 'blur' | 'spin' | 'dissolve';
export type ClipMotion = 'static' | 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'pulse' | 'shake' | 'stabilized' | 'track_focus';
export type TextAnim = 'fade' | 'slide' | 'pop' | 'typewriter' | 'glitch' | 'bounce' | 'wave' | 'spread' | 'karaoke' | 'neon_flicker';
export type BlendModeKind = 'source-over' | 'screen' | 'multiply' | 'overlay' | 'lighten' | 'darken';
export type MaskShapeKind = 'none' | 'circle' | 'rect' | 'heart' | 'star' | 'split' | 'gradient';
export type SpeedCurveKind = 'linear' | 'montage' | 'hero' | 'bullet' | 'jump_cut' | 'flash_in';
export type StylizePreset = 'none' | 'anime' | '3d_toon' | 'oil_paint' | 'sketch' | 'cyber_comic';
export type VoiceFilterKind = 'normal' | 'robot' | 'chipmunk' | 'deep_bass' | 'echo' | 'radio';
export type CaptionStyleKind = 'hormozi' | 'neon_karaoke' | 'minimal_glass' | 'cinema';

export interface VideoKeyframe {
  tPct: number; // 0..1 along clip
  xPct: number;
  yPct: number;
  scale: number;
  rotate: number;
  opacity: number;
}

export interface VideoClip {
  id: string;
  track: 'main' | 'overlay';
  name: string;
  kind: 'demo' | 'video' | 'image' | 'ai_scene' | 'freeze';
  srcUrl?: string;
  color: string;
  secondaryColor?: string;
  startSec: number;
  durationSec: number;
  speed: number;
  speedCurve: SpeedCurveKind;
  reverse?: boolean;
  transition: ClipTransition;
  motion: ClipMotion;
  flipH?: boolean;
  rotateDeg?: number;
  opacity: number;
  blendMode: BlendModeKind;
  mask: MaskShapeKind;
  chromaKeyEnabled?: boolean;
  chromaKeyColor?: string;
  chromaTolerance?: number;
  bgRemoveEnabled?: boolean;
  bgReplaceColor?: string;
  stabilize?: boolean;
  objectTrackX?: number;
  objectTrackY?: number;
  keyframes?: VideoKeyframe[];
  pipX?: number;
  pipY?: number;
  pipScale?: number;
  aiPrompt?: string;
}

export interface TextOverlay {
  id: string;
  text: string;
  translatedText?: string;
  startSec: number;
  durationSec: number;
  xPct?: number;
  yPct: number;
  fontSize: number;
  color: string;
  bgPill?: boolean;
  stroke?: boolean;
  anim: TextAnim;
  isCaption?: boolean;
  captionStyle?: CaptionStyleKind;
}

export interface StickerOverlay {
  id: string;
  emoji: string;
  label?: string;
  xPct: number;
  yPct: number;
  size: number;
  startSec: number;
  durationSec: number;
  animated?: boolean;
}

export interface BrushStroke {
  id: string;
  color: string;
  size: number;
  glow: boolean;
  points: { x: number; y: number }[];
}

export interface AudioTrackItem {
  id: string;
  name: string;
  kind: 'music' | 'sfx' | 'voiceover' | 'extracted' | 'seed_sfx';
  startSec: number;
  durationSec: number;
  volume: number;
  url?: string;
  synthPreset?: string;
}

export const LUT_PRESETS: { id: string; name: string; filter: string; badge: string }[] = [
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

export const ASPECT_RATIOS: { id: '16:9' | '9:16' | '1:1' | '4:3' | '21:9'; ratio: number; label: string }[] = [
  { id: '16:9', ratio: 16 / 9, label: '16:9 YouTube' },
  { id: '9:16', ratio: 9 / 16, label: '9:16 Reels / Shorts' },
  { id: '1:1', ratio: 1, label: '1:1 Square' },
  { id: '4:3', ratio: 4 / 3, label: '4:3 Classic' },
  { id: '21:9', ratio: 21 / 9, label: '21:9 Cinema' },
];

export const ROYALTY_FREE_AUDIO_LIB: { id: string; name: string; kind: 'music' | 'sfx'; durationSec: number; bpm: number; badge: string }[] = [
  { id: 'lofi_chill', name: 'Lo-Fi Carbon Chill', kind: 'music', durationSec: 8, bpm: 84, badge: 'LO-FI' },
  { id: 'synthwave_drive', name: 'Cyber Synthwave 128', kind: 'music', durationSec: 8, bpm: 128, badge: 'SYNTH' },
  { id: 'phonk_drop', name: 'Drift Phonk Bass', kind: 'music', durationSec: 8, bpm: 140, badge: 'PHONK' },
  { id: 'cinematic_rise', name: 'Epic Cinema Riser', kind: 'music', durationSec: 6, bpm: 100, badge: 'EPIC' },
  { id: 'sfx_whoosh', name: 'Transition Whoosh', kind: 'sfx', durationSec: 1.4, bpm: 0, badge: 'SFX' },
  { id: 'sfx_glitch', name: 'Digital Glitch Hit', kind: 'sfx', durationSec: 1.0, bpm: 0, badge: 'SFX' },
  { id: 'sfx_pop', name: 'Caption Pop Click', kind: 'sfx', durationSec: 0.6, bpm: 0, badge: 'SFX' },
  { id: 'sfx_boom', name: 'Sub Bass Impact', kind: 'sfx', durationSec: 1.8, bpm: 0, badge: 'SFX' },
];

export const PROJECT_TEMPLATES: {
  id: string; name: string; badge: string; aspect: '16:9' | '9:16' | '1:1'; lut: string;
  clips: VideoClip[]; texts: TextOverlay[];
}[] = [
  {
    id: 'reels_hook', name: 'Viral Reels / Shorts Hook', badge: '9:16', aspect: '9:16', lut: 'cyber',
    clips: [
      { id: 't1', track: 'main', name: 'Hook Scene', kind: 'demo', color: '#06b6d4', secondaryColor: '#6366f1', startSec: 0, durationSec: 3, speed: 1, speedCurve: 'flash_in', transition: 'flash', motion: 'zoom_in', opacity: 100, blendMode: 'source-over', mask: 'none' },
      { id: 't2', track: 'main', name: 'Main Drop', kind: 'demo', color: '#ec4899', secondaryColor: '#7c3aed', startSec: 3, durationSec: 4, speed: 1.2, speedCurve: 'montage', transition: 'glitch', motion: 'shake', opacity: 100, blendMode: 'source-over', mask: 'none' },
    ],
    texts: [
      { id: 'tt1', text: '3 ФИШКИ КОТОРЫЕ ВСЁ МЕНЯЮТ', startSec: 0.2, durationSec: 2.6, yPct: 48, fontSize: 28, color: '#facc15', bgPill: true, stroke: true, anim: 'pop', isCaption: true, captionStyle: 'hormozi' },
      { id: 'tt2', text: 'СОХРАНИ ЧТОБЫ НЕ ПОТЕРЯТЬ 🔥', startSec: 3.2, durationSec: 3.4, yPct: 68, fontSize: 24, color: '#ffffff', bgPill: true, anim: 'karaoke', isCaption: true, captionStyle: 'neon_karaoke' },
    ],
  },
  {
    id: 'gaming_frag', name: 'Gaming Fragmovie Edit', badge: '16:9', aspect: '16:9', lut: 'neon',
    clips: [
      { id: 'g1', track: 'main', name: 'Clutch Buildup', kind: 'demo', color: '#7c3aed', secondaryColor: '#0f172a', startSec: 0, durationSec: 3.5, speed: 1, speedCurve: 'bullet', transition: 'zoom', motion: 'zoom_in', opacity: 100, blendMode: 'source-over', mask: 'none' },
      { id: 'g2', track: 'main', name: 'Ace Highlight', kind: 'demo', color: '#f43f5e', secondaryColor: '#f59e0b', startSec: 3.5, durationSec: 3.5, speed: 1.25, speedCurve: 'hero', transition: 'glitch', motion: 'shake', opacity: 100, blendMode: 'source-over', mask: 'none' },
    ],
    texts: [
      { id: 'gt1', text: 'CLUTCH 1v5 · LUMA CUT', startSec: 0.3, durationSec: 3, yPct: 50, fontSize: 34, color: '#38bdf8', stroke: true, anim: 'glitch' },
    ],
  },
  {
    id: 'yt_intro', name: 'YouTube Tech Intro', badge: '16:9', aspect: '16:9', lut: 'carbon',
    clips: [
      { id: 'y1', track: 'main', name: 'Carbon Opener', kind: 'demo', color: '#0ea5e9', secondaryColor: '#020617', startSec: 0, durationSec: 4, speed: 1, speedCurve: 'linear', transition: 'fade', motion: 'pan_right', opacity: 100, blendMode: 'source-over', mask: 'none' },
    ],
    texts: [
      { id: 'yt1', text: 'ОБЗОР НОВЫХ ТЕХНОЛОГИЙ 2026', startSec: 0.4, durationSec: 3.2, yPct: 48, fontSize: 30, color: '#ffffff', bgPill: true, anim: 'spread' },
    ],
  },
  {
    id: 'travel_vlog', name: 'Travel Cinema Vlog', badge: '16:9', aspect: '16:9', lut: 'golden',
    clips: [
      { id: 'tr1', track: 'main', name: 'Golden Horizon', kind: 'demo', color: '#f59e0b', secondaryColor: '#7c2d12', startSec: 0, durationSec: 4, speed: 1, speedCurve: 'linear', transition: 'fade', motion: 'zoom_out', opacity: 100, blendMode: 'source-over', mask: 'none' },
      { id: 'tr2', track: 'main', name: 'Night Lights', kind: 'demo', color: '#1d4ed8', secondaryColor: '#0f172a', startSec: 4, durationSec: 4, speed: 1, speedCurve: 'linear', transition: 'dissolve', motion: 'pan_left', opacity: 100, blendMode: 'source-over', mask: 'none' },
    ],
    texts: [
      { id: 'trt1', text: 'TOKYO · CHAPTER 01', startSec: 0.6, durationSec: 3.0, yPct: 52, fontSize: 32, color: '#fef08a', anim: 'fade' },
    ],
  },
  {
    id: 'podcast_short', name: 'Podcast Split & Captions', badge: '9:16', aspect: '9:16', lut: 'kodak',
    clips: [
      { id: 'p1', track: 'main', name: 'Speaker Cam', kind: 'demo', color: '#1e293b', secondaryColor: '#0f172a', startSec: 0, durationSec: 6, speed: 1, speedCurve: 'linear', transition: 'fade', motion: 'stabilized', opacity: 100, blendMode: 'source-over', mask: 'none' },
    ],
    texts: [
      { id: 'pt1', text: 'Главный секрет продуктивности — фокус', startSec: 0.2, durationSec: 2.8, yPct: 72, fontSize: 22, color: '#ffffff', bgPill: true, anim: 'karaoke', isCaption: true, captionStyle: 'hormozi' },
      { id: 'pt2', text: 'Убирай лишнее каждый день!', startSec: 3.1, durationSec: 2.7, yPct: 72, fontSize: 24, color: '#34d399', bgPill: true, anim: 'pop', isCaption: true, captionStyle: 'hormozi' },
    ],
  },
  {
    id: 'product_promo', name: 'Product Promo Commercial', badge: '1:1', aspect: '1:1', lut: 'dream',
    clips: [
      { id: 'pr1', track: 'main', name: 'Hero Reveal', kind: 'demo', color: '#10b981', secondaryColor: '#064e3b', startSec: 0, durationSec: 4, speed: 1, speedCurve: 'hero', transition: 'zoom', motion: 'pulse', opacity: 100, blendMode: 'source-over', mask: 'none' },
    ],
    texts: [
      { id: 'prt1', text: 'НОВАЯ КОЛЛЕКЦИЯ · -30%', startSec: 0.3, durationSec: 3.4, yPct: 50, fontSize: 30, color: '#ffffff', bgPill: true, anim: 'bounce' },
    ],
  },
];

export const DESIGN_STUDIO_PRESETS = [
  { id: 'yt_thumb', name: 'YouTube Обложка (1280×720)', w: 1280, h: 720, bg1: '#0f172a', bg2: '#0284c7', headline: 'ЭТО МЕНЯЕТ ВСЁ!', sub: 'ОБЗОР LUMA OS 1.5.2', badge: 'NEW 2026' },
  { id: 'banner', name: 'Баннер канала (1600×500)', w: 1600, h: 500, bg1: '#1e1b4b', bg2: '#7c3aed', headline: 'CARBON CREATOR STUDIO', sub: 'ВИДЕО · ДИЗАЙН · КОД', badge: 'PRO' },
  { id: 'poster', name: 'Постер / Афиша (900×1200)', w: 900, h: 1200, bg1: '#450a0a', bg2: '#f59e0b', headline: 'CYBER NIGHT LIVE', sub: '24 НОЯБРЯ · ВХОД СВОБОДНЫЙ', badge: 'EVENT' },
  { id: 'meme', name: 'Мем / Квадрат (1080×1080)', w: 1080, h: 1080, bg1: '#18181b', bg2: '#10b981', headline: 'КОГДА КОД СКОМПИЛИРОВАЛСЯ', sub: 'С ПЕРВОГО РАЗА 😎', badge: 'MEME' },
];

// Real offline WebAudio synthesizer for built-in Music, SFX & Text-to-SFX (Seed Audio)
export function playProceduralAudio(presetOrPrompt: string, voiceFilter: VoiceFilterKind = 'normal') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.24, now);
    master.connect(ctx.destination);

    const low = presetOrPrompt.toLowerCase();
    const pitchMul = voiceFilter === 'chipmunk' ? 1.5 : voiceFilter === 'deep_bass' ? 0.65 : 1;

    if (low.includes('whoosh') || low.includes('wind') || low.includes('ветер')) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 1.1, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(220, now);
      flt.frequency.exponentialRampToValueAtTime(2400 * pitchMul, now + 0.55);
      flt.frequency.exponentialRampToValueAtTime(180, now + 1.05);
      src.connect(flt).connect(master);
      src.start(now);
      return;
    }

    if (low.includes('boom') || low.includes('bass') || low.includes('взрыв') || low.includes('удар')) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150 * pitchMul, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.85);
      g.gain.setValueAtTime(0.6, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(g).connect(master);
      osc.start(now);
      osc.stop(now + 0.92);
      return;
    }

    if (low.includes('glitch') || low.includes('laser') || low.includes('лазер')) {
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime((400 + i * 260) * pitchMul, now + i * 0.06);
        osc.connect(master);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.05);
      }
      return;
    }

    // Musical chord progression loop (2.4s preview)
    const chords = low.includes('phonk')
      ? [110, 130.8, 146.8, 110]
      : low.includes('synth')
      ? [220, 261.6, 329.6, 293.6]
      : [196, 246.9, 293.6, 329.6];

    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = low.includes('synth') || low.includes('phonk') ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq * pitchMul, now + idx * 0.45);
      g.gain.setValueAtTime(0.001, now + idx * 0.45);
      g.gain.linearRampToValueAtTime(0.28, now + idx * 0.45 + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.45 + 0.42);
      osc.connect(g).connect(master);
      osc.start(now + idx * 0.45);
      osc.stop(now + idx * 0.45 + 0.44);
    });
  } catch {
    // ignore WebAudio autoplay restrictions
  }
}

// Fast built-in caption translator dictionary + sentence helper
const CAPTION_DICT_EN: Record<string, string> = {
  'привет': 'Hello', 'добро пожаловать': 'Welcome', 'новый титр': 'New Caption',
  'сохрани': 'Save this', 'подпишись': 'Subscribe', 'секрет': 'Secret',
  'фишки': 'Tips', 'фокус': 'Focus', 'обзор': 'Review', 'видео': 'Video',
  'главный': 'Main', 'как': 'How', 'почему': 'Why', 'сегодня': 'Today',
};

export function translateCaptionText(text: string, targetLang: 'en' | 'ru' | 'es' | 'de'): string {
  if (targetLang === 'ru') return text;
  let out = text;
  if (targetLang === 'en') {
    Object.entries(CAPTION_DICT_EN).forEach(([k, v]) => {
      out = out.replace(new RegExp(k, 'gi'), v);
    });
    return out === text ? `[EN] ${text}` : out;
  }
  return `[${targetLang.toUpperCase()}] ${text}`;
}

export function speedCurveMultiplier(curve: SpeedCurveKind, pct: number): number {
  if (curve === 'linear') return 1;
  if (curve === 'montage') return pct < 0.25 ? 2.0 : pct < 0.7 ? 0.65 : 1.8;
  if (curve === 'hero') return pct > 0.35 && pct < 0.65 ? 0.45 : 1.7;
  if (curve === 'bullet') return pct > 0.25 && pct < 0.75 ? 0.35 : 2.2;
  if (curve === 'jump_cut') return Math.sin(pct * Math.PI * 6) > 0 ? 1.8 : 0.7;
  if (curve === 'flash_in') return pct < 0.2 ? 2.6 : 0.9;
  return 1;
}
