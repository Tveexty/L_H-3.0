export type OneUIPanelBlockSize = '1x1' | '2x1' | '2x2' | '4x1' | '4x2' | '1x2';

export type OneUIGradientPreset =
  | 'monet_theme'
  | 'liquid_glass'
  | 'oneui_aurora'
  | 'cobalt_frost'
  | 'emerald_fluorine'
  | 'sunset_rose';

export interface OneUIPanelBlock {
  id: string;
  size: OneUIPanelBlockSize;
}

export interface OneUIPanelVisualConfig {
  opacity: number; // 35..98
  blurPx: number; // 0..40
  radiusPx: number; // 12..32
  accentColor: string; // hex
  gradientPreset: OneUIGradientPreset;
  syncWithTheme: boolean; // syncs Control Panel & Taskbar with OS Theme / Monet palette
  sliderOrientation: 'horizontal' | 'vertical';
}

export interface OneUIPanelPreset {
  id: string;
  name: string;
  builtin?: boolean;
  blocks: OneUIPanelBlock[];
  visual: OneUIPanelVisualConfig;
}

export interface OneUIPanelState {
  version: number;
  blocks: OneUIPanelBlock[];
  visual: OneUIPanelVisualConfig;
  activePresetId: string;
  userPresets: OneUIPanelPreset[];
}

export const ONEUI_PANEL_STORAGE_KEY = 'luma_oneui9_panel_state_v181';

export const ONEUI_GRADIENT_PRESETS: {
  id: OneUIGradientPreset;
  label: string;
  preview: string;
  darkBg: string;
  lightBg: string;
  accent: string;
}[] = [
  {
    id: 'monet_theme',
    label: 'По теме ОС',
    preview: 'linear-gradient(135deg, var(--luma-accent, #10b981), #06b6d4)',
    darkBg: 'linear-gradient(155deg, rgba(16, 22, 34, OP), rgba(11, 16, 28, OP))',
    lightBg: 'linear-gradient(155deg, rgba(255, 255, 255, OP), rgba(241, 246, 255, OP))',
    accent: '',
  },
  {
    id: 'liquid_glass',
    label: 'Liquid Glass',
    preview: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    darkBg: 'linear-gradient(155deg, rgba(18, 25, 42, OP), rgba(14, 18, 30, OP))',
    lightBg: 'linear-gradient(155deg, rgba(250, 253, 255, OP), rgba(235, 244, 255, OP))',
    accent: '#38bdf8',
  },
  {
    id: 'oneui_aurora',
    label: 'One UI 9.0',
    preview: 'linear-gradient(135deg, #2563eb, #60a5fa)',
    darkBg: 'linear-gradient(160deg, rgba(16, 22, 36, OP), rgba(10, 14, 24, OP))',
    lightBg: 'linear-gradient(160deg, rgba(248, 250, 255, OP), rgba(232, 239, 252, OP))',
    accent: '#2563eb',
  },
  {
    id: 'emerald_fluorine',
    label: 'Fluorine F-9',
    preview: 'linear-gradient(135deg, #10b981, #06b6d4)',
    darkBg: 'linear-gradient(155deg, rgba(10, 26, 28, OP), rgba(11, 18, 26, OP))',
    lightBg: 'linear-gradient(155deg, rgba(240, 253, 250, OP), rgba(236, 254, 255, OP))',
    accent: '#10b981',
  },
  {
    id: 'cobalt_frost',
    label: 'Кобальт',
    preview: 'linear-gradient(135deg, #6366f1, #a855f7)',
    darkBg: 'linear-gradient(155deg, rgba(22, 18, 42, OP), rgba(12, 14, 28, OP))',
    lightBg: 'linear-gradient(155deg, rgba(245, 243, 255, OP), rgba(238, 242, 255, OP))',
    accent: '#6366f1',
  },
  {
    id: 'sunset_rose',
    label: 'Закат',
    preview: 'linear-gradient(135deg, #f43f5e, #f59e0b)',
    darkBg: 'linear-gradient(155deg, rgba(34, 16, 24, OP), rgba(18, 14, 22, OP))',
    lightBg: 'linear-gradient(155deg, rgba(255, 241, 242, OP), rgba(255, 247, 237, OP))',
    accent: '#f43f5e',
  },
];

export const DEFAULT_ONEUI_VISUAL: OneUIPanelVisualConfig = {
  opacity: 82,
  blurPx: 26,
  radiusPx: 24,
  accentColor: '#2563eb',
  gradientPreset: 'monet_theme',
  syncWithTheme: true,
  sliderOrientation: 'vertical',
};

export const BUILTIN_ONEUI_PRESETS: OneUIPanelPreset[] = [
  {
    id: 'oneui9_classic',
    name: 'One UI 9.0',
    builtin: true,
    visual: {
      opacity: 84,
      blurPx: 28,
      radiusPx: 24,
      accentColor: '#2563eb',
      gradientPreset: 'monet_theme',
      syncWithTheme: true,
      sliderOrientation: 'vertical',
    },
    blocks: [
      { id: 'wifi', size: '2x1' },
      { id: 'bluetooth', size: '2x1' },
      { id: 'media', size: '2x2' },
      { id: 'brightness', size: '1x2' },
      { id: 'volume', size: '1x2' },
      { id: 'superdevice', size: '2x1' },
      { id: 'dnd', size: '2x1' },
      { id: 'per_app_audio', size: '1x1' },
      { id: 'miracast', size: '1x1' },
      { id: 'shot', size: '1x1' },
      { id: 'rec', size: '1x1' },
      { id: 'lens', size: '1x1' },
      { id: 'eye', size: '1x1' },
      { id: 'game', size: '1x1' },
      { id: 'lock_screen', size: '1x1' },
      { id: 'sys_monitor', size: '4x1' },
    ],
  },
  {
    id: 'liquid_glass_compact',
    name: 'Liquid Glass',
    builtin: true,
    visual: {
      opacity: 68,
      blurPx: 34,
      radiusPx: 28,
      accentColor: '#38bdf8',
      gradientPreset: 'liquid_glass',
      syncWithTheme: true,
      sliderOrientation: 'horizontal',
    },
    blocks: [
      { id: 'media', size: '2x2' },
      { id: 'wifi', size: '2x1' },
      { id: 'bluetooth', size: '2x1' },
      { id: 'brightness', size: '2x1' },
      { id: 'volume', size: '2x1' },
      { id: 'dnd', size: '1x1' },
      { id: 'eye', size: '1x1' },
      { id: 'mic', size: '1x1' },
      { id: 'per_app_audio', size: '1x1' },
      { id: 'shot', size: '1x1' },
      { id: 'rec', size: '1x1' },
      { id: 'lens', size: '1x1' },
      { id: 'lock_screen', size: '1x1' },
      { id: 'superdevice', size: '2x1' },
      { id: 'oxygen_connect', size: '2x1' },
    ],
  },
  {
    id: 'gaming_hud',
    name: 'Игровой HUD',
    builtin: true,
    visual: {
      opacity: 88,
      blurPx: 20,
      radiusPx: 18,
      accentColor: '#10b981',
      gradientPreset: 'emerald_fluorine',
      syncWithTheme: false,
      sliderOrientation: 'horizontal',
    },
    blocks: [
      { id: 'sys_monitor', size: '4x2' },
      { id: 'game', size: '2x1' },
      { id: 'mic', size: '2x1' },
      { id: 'volume', size: '4x1' },
      { id: 'brightness', size: '4x1' },
      { id: 'media', size: '4x2' },
      { id: 'rec', size: '2x1' },
      { id: 'shot', size: '2x1' },
      { id: 'per_app_audio', size: '2x1' },
      { id: 'dnd', size: '2x1' },
    ],
  },
];

export const ALLOWED_SIZES_BY_BLOCK: Record<string, OneUIPanelBlockSize[]> = {
  wifi: ['1x1', '2x1', '2x2'],
  bluetooth: ['1x1', '2x1', '2x2'],
  media: ['2x1', '2x2', '4x2'],
  brightness: ['2x1', '4x1', '1x2'],
  volume: ['2x1', '4x1', '1x2'],
  sys_monitor: ['2x1', '4x1', '4x2'],
  power_plan: ['2x1', '4x1'],
  superdevice: ['1x1', '2x1'],
  oxygen_connect: ['1x1', '2x1'],
  drop_shelf: ['1x1', '2x1'],
  per_app_audio: ['1x1', '2x1'],
  miracast: ['1x1', '2x1'],
  dnd: ['1x1', '2x1'],
  scenarios_widget: ['2x1', '4x1', '2x2'],
};

export function getAllowedSizes(blockId: string): OneUIPanelBlockSize[] {
  return ALLOWED_SIZES_BY_BLOCK[blockId] || ['1x1', '2x1'];
}

export function cycleBlockSize(blockId: string, current: OneUIPanelBlockSize): OneUIPanelBlockSize {
  const allowed = getAllowedSizes(blockId);
  const idx = allowed.indexOf(current);
  return allowed[(idx + 1) % allowed.length];
}

export function blockGridClass(size: OneUIPanelBlockSize): string {
  switch (size) {
    case '1x1':
      return 'col-span-1 row-span-1';
    case '2x1':
      return 'col-span-2 row-span-1';
    case '2x2':
      return 'col-span-2 row-span-2';
    case '4x1':
      return 'col-span-4 row-span-1';
    case '4x2':
      return 'col-span-4 row-span-2';
    case '1x2':
      return 'col-span-1 row-span-2';
    default:
      return 'col-span-1 row-span-1';
  }
}

export function createDefaultOneUIPanelState(): OneUIPanelState {
  const base = BUILTIN_ONEUI_PRESETS[0];
  return {
    version: 1,
    blocks: base.blocks.map((b) => ({ ...b })),
    visual: { ...base.visual },
    activePresetId: base.id,
    userPresets: [],
  };
}

export function loadOneUIPanelState(): OneUIPanelState {
  try {
    const raw = localStorage.getItem(ONEUI_PANEL_STORAGE_KEY);
    if (!raw) return createDefaultOneUIPanelState();
    const parsed = JSON.parse(raw) as Partial<OneUIPanelState>;
    if (!parsed || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
      return createDefaultOneUIPanelState();
    }
    const def = createDefaultOneUIPanelState();
    return {
      version: 1,
      blocks: parsed.blocks.filter((b) => b && typeof b.id === 'string' && typeof b.size === 'string'),
      visual: {
        ...def.visual,
        ...(parsed.visual || {}),
        opacity: Math.max(35, Math.min(98, Number(parsed.visual?.opacity ?? def.visual.opacity))),
        blurPx: Math.max(0, Math.min(40, Number(parsed.visual?.blurPx ?? def.visual.blurPx))),
        radiusPx: Math.max(12, Math.min(32, Number(parsed.visual?.radiusPx ?? def.visual.radiusPx))),
      },
      activePresetId: typeof parsed.activePresetId === 'string' ? parsed.activePresetId : def.activePresetId,
      userPresets: Array.isArray(parsed.userPresets) ? parsed.userPresets : [],
    };
  } catch {
    return createDefaultOneUIPanelState();
  }
}

export function saveOneUIPanelState(state: OneUIPanelState): void {
  try {
    localStorage.setItem(ONEUI_PANEL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
  try {
    window.dispatchEvent(
      new CustomEvent('luma-panel-theme-sync', {
        detail: state.visual,
      })
    );
  } catch {
    // ignore
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || '#2563eb').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(37, 99, 235, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}
