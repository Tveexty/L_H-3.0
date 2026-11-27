// Luma OS 1.8 (Fluorine · F-9) — Adaptive Material You (Monet) Palette Engine
// Extracts harmonious primary, secondary, surface & glow colors from the active
// wallpaper (including custom user disk images) or active media artwork.

export interface MonetPalette {
  primary: string;
  primaryRgb: string;
  secondary: string;
  secondaryRgb: string;
  surface: string;
  surfaceRgb: string;
  glow: string;
  pillBg: string;
  border: string;
  swatches: string[];
  sourceLabel: string;
  sourceUrl?: string;
}

export const DEFAULT_FLUORINE_PALETTE: MonetPalette = {
  primary: '#10b981',
  primaryRgb: '16, 185, 129',
  secondary: '#06b6d4',
  secondaryRgb: '6, 182, 212',
  surface: '#071d1b',
  surfaceRgb: '7, 29, 27',
  glow: 'rgba(16, 185, 129, 0.34)',
  pillBg: 'rgba(16, 185, 129, 0.16)',
  border: 'rgba(52, 211, 153, 0.38)',
  swatches: ['#10b981', '#06b6d4', '#34d399', '#22d3ee', '#0f766e'],
  sourceLabel: 'Fluorine 2.5D',
};

const paletteCache = new Map<string, MonetPalette>();
let currentPalette: MonetPalette = DEFAULT_FLUORINE_PALETTE;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(hn + 1 / 3) * 255),
    Math.round(hue2rgb(hn) * 255),
    Math.round(hue2rgb(hn - 1 / 3) * 255),
  ];
}

function buildPaletteFromHSL(
  h1: number,
  s1: number,
  l1: number,
  h2: number,
  s2: number,
  sourceLabel: string,
  sourceUrl?: string
): MonetPalette {
  const pS = clamp(s1 < 0.25 ? 0.55 : s1, 0.42, 0.88);
  const pL = clamp(l1, 0.48, 0.62);
  const [pr, pg, pb] = hslToRgb(h1, pS, pL);

  const sH = Math.abs(h1 - h2) < 22 ? (h1 + 36) % 360 : h2;
  const sS = clamp(s2 < 0.25 ? 0.58 : s2, 0.45, 0.86);
  const [sr, sg, sb] = hslToRgb(sH, sS, 0.56);

  const [surR, surG, surB] = hslToRgb(h1, clamp(pS * 0.45, 0.18, 0.42), 0.1);
  const [l3r, l3g, l3b] = hslToRgb(h1, clamp(pS * 0.9, 0.45, 0.85), 0.68);
  const [l4r, l4g, l4b] = hslToRgb(sH, clamp(sS * 0.9, 0.45, 0.85), 0.68);
  const [l5r, l5g, l5b] = hslToRgb(h1, clamp(pS * 0.72, 0.3, 0.65), 0.34);

  return {
    primary: rgbToHex(pr, pg, pb),
    primaryRgb: `${pr}, ${pg}, ${pb}`,
    secondary: rgbToHex(sr, sg, sb),
    secondaryRgb: `${sr}, ${sg}, ${sb}`,
    surface: rgbToHex(surR, surG, surB),
    surfaceRgb: `${surR}, ${surG}, ${surB}`,
    glow: `rgba(${pr}, ${pg}, ${pb}, 0.34)`,
    pillBg: `rgba(${pr}, ${pg}, ${pb}, 0.16)`,
    border: `rgba(${l3r}, ${l3g}, ${l3b}, 0.38)`,
    swatches: [
      rgbToHex(pr, pg, pb),
      rgbToHex(sr, sg, sb),
      rgbToHex(l3r, l3g, l3b),
      rgbToHex(l4r, l4g, l4b),
      rgbToHex(l5r, l5g, l5b),
    ],
    sourceLabel,
    sourceUrl,
  };
}

function fallbackPaletteForSeed(seed: string, sourceLabel: string): MonetPalette {
  const s = (seed || '').toLowerCase();
  if (s.includes('fluorine-prism')) return buildPaletteFromHSL(190, 0.82, 0.54, 272, 0.76, sourceLabel, seed);
  if (s.includes('fluorine-liquid')) return buildPaletteFromHSL(162, 0.78, 0.50, 198, 0.82, sourceLabel, seed);
  if (s.includes('fluorine-aurora')) return buildPaletteFromHSL(154, 0.74, 0.52, 206, 0.78, sourceLabel, seed);
  if (s.includes('fluorine')) return { ...DEFAULT_FLUORINE_PALETTE, sourceLabel, sourceUrl: seed };
  if (s.includes('oxygen')) return buildPaletteFromHSL(196, 0.84, 0.54, 224, 0.78, sourceLabel, seed);
  if (s.includes('nitrogen')) return buildPaletteFromHSL(222, 0.82, 0.56, 268, 0.74, sourceLabel, seed);
  if (s.includes('carbon')) return buildPaletteFromHSL(210, 0.56, 0.54, 38, 0.76, sourceLabel, seed);
  if (s.includes('boron')) return buildPaletteFromHSL(258, 0.76, 0.58, 316, 0.72, sourceLabel, seed);
  if (s.includes('sunset') || s.includes('amber') || s.includes('gold')) {
    return buildPaletteFromHSL(28, 0.84, 0.54, 344, 0.78, sourceLabel, seed);
  }
  // Hash string to deterministic pleasing hue
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  const h1 = Math.abs(hash) % 360;
  return buildPaletteFromHSL(h1, 0.72, 0.55, (h1 + 42) % 360, 0.70, sourceLabel, seed);
}

/**
 * Extracts a Material You (Monet) palette from an image URL (same-origin, data URL, or CORS image).
 * Results are cached by URL for instant reuse.
 */
export async function extractMonetPaletteFromImage(
  imageUrl: string,
  sourceLabel = 'Обои рабочего стола'
): Promise<MonetPalette> {
  const key = (imageUrl || '').trim();
  if (!key) return DEFAULT_FLUORINE_PALETTE;
  const cached = paletteCache.get(key);
  if (cached) return { ...cached, sourceLabel };

  // If it's a CSS gradient or non-image token, synthesize harmonious Monet tones from the seed
  if (!key.startsWith('/') && !key.startsWith('http') && !key.startsWith('data:image') && !key.startsWith('blob:')) {
    const pal = fallbackPaletteForSeed(key, sourceLabel);
    paletteCache.set(key, pal);
    return pal;
  }

  return new Promise<MonetPalette>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const doneFallback = () => {
      const pal = fallbackPaletteForSeed(key, sourceLabel);
      paletteCache.set(key, pal);
      resolve(pal);
    };
    const timer = window.setTimeout(doneFallback, 2400);

    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const size = 48;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return doneFallback();
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // 24 hue buckets (15 degrees each) weighted by vibrancy & mid-luminance
        const buckets = Array.from({ length: 24 }, () => ({
          weight: 0,
          hSum: 0,
          sSum: 0,
          lSum: 0,
        }));

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 180) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const [h, s, l] = rgbToHsl(r, g, b);
          if (l < 0.08 || l > 0.94) continue;
          const vibrancy = Math.pow(s, 1.35) * (1 - Math.abs(l - 0.52) * 1.15);
          const weight = Math.max(0.02, vibrancy);
          const idx = Math.floor(((h % 360) + 360) % 360 / 15) % 24;
          buckets[idx].weight += weight;
          buckets[idx].hSum += h * weight;
          buckets[idx].sSum += s * weight;
          buckets[idx].lSum += l * weight;
        }

        const ranked = buckets
          .map((b, idx) => ({ ...b, idx }))
          .filter((b) => b.weight > 0.05)
          .sort((a, b) => b.weight - a.weight);

        if (ranked.length === 0) return doneFallback();

        const top1 = ranked[0];
        const h1 = top1.hSum / top1.weight;
        const s1 = top1.sSum / top1.weight;
        const l1 = top1.lSum / top1.weight;

        // Find a secondary hue at least 30 degrees away for harmonious dual-tone accents
        const top2 =
          ranked.find((b) => {
            const bh = b.hSum / b.weight;
            const diff = Math.min(Math.abs(bh - h1), 360 - Math.abs(bh - h1));
            return diff >= 30;
          }) || ranked[1] || top1;

        const h2 = top2.hSum / top2.weight;
        const s2 = top2.sSum / top2.weight;

        const pal = buildPaletteFromHSL(h1, s1, l1, h2, s2, sourceLabel, key);
        paletteCache.set(key, pal);
        resolve(pal);
      } catch {
        doneFallback();
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      doneFallback();
    };
    img.src = key;
  });
}

export function applyMonetPaletteToDOM(palette: MonetPalette, enabled: boolean): void {
  currentPalette = palette;
  const root = document.documentElement;
  root.setAttribute('data-monet', enabled ? 'on' : 'off');
  root.style.setProperty('--luma-monet-primary', palette.primary);
  root.style.setProperty('--luma-monet-primary-rgb', palette.primaryRgb);
  root.style.setProperty('--luma-monet-secondary', palette.secondary);
  root.style.setProperty('--luma-monet-secondary-rgb', palette.secondaryRgb);
  root.style.setProperty('--luma-monet-surface', palette.surface);
  root.style.setProperty('--luma-monet-surface-rgb', palette.surfaceRgb);
  root.style.setProperty('--luma-monet-glow', palette.glow);
  root.style.setProperty('--luma-monet-pill', palette.pillBg);
  root.style.setProperty('--luma-monet-border', palette.border);

  if (enabled) {
    root.style.setProperty('--luma-accent', palette.primary);
    root.style.setProperty('--luma-accent-rgb', palette.primaryRgb);
    root.style.setProperty('--luma-accent-soft', palette.pillBg);
  }

  try {
    window.dispatchEvent(new CustomEvent('luma-monet-palette', { detail: { palette, enabled } }));
  } catch {
    // ignore
  }
}

export function getCurrentMonetPalette(): MonetPalette {
  return currentPalette;
}
