import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  X,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Play,
  Pause,
  Heart,
  Shield,
  Crosshair,
  Flame,
  Swords,
  Magnet,
} from 'lucide-react';
import carbonHeroImg from '../assets/luma-carbon-hero.jpg';

interface HeroCardProps {
  onTriggerEasterEgg: () => void;
  kernelVersion?: string;
  securityVersion?: string;
}

/**
 * Flagship sculptural 3D Carbon hexagonal monolith hero banner for Luma OS 1.5 (Carbon · C-6).
 * Uses outer perspective wrapper, backfaceVisibility: hidden, content-hashed Vite asset,
 * and dual CSS+<img> layers so WebView2 smoothly tilts on hover without ever dropping the image.
 */
export const LumaHeliumHeroCard: React.FC<HeroCardProps> = ({
  onTriggerEasterEgg,
  kernelVersion = '1.6.1',
  securityVersion = '2.0',
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 38, hovering: false });
  const [ripple, setRipple] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - y) * 11;
    const ry = (x - 0.5) * 11;
    setTilt({ rx, ry, gx: x * 100, gy: y * 100, hovering: true });
  };

  const handleLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 38, hovering: false });
  };

  const handleClick = () => {
    setRipple(true);
    window.setTimeout(() => setRipple(false), 380);
    onTriggerEasterEgg();
  };

  return (
    <div style={{ perspective: '1100px' }} className="w-full">
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className="group relative block w-full h-56 sm:h-64 rounded-3xl overflow-hidden border border-cyan-300/25 shadow-xl cursor-pointer text-left select-none active:scale-[0.99] focus:outline-none"
        style={{
          isolation: 'isolate',
          transformStyle: 'flat',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) scale(${tilt.hovering ? 1.012 : 1}) translateZ(0)`,
          transition: tilt.hovering
            ? 'transform 0.14s ease-out, box-shadow 0.25s ease'
            : 'transform 0.52s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease',
          backgroundColor: '#05070b',
          backgroundImage: `url("${carbonHeroImg}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        title="Нажмите, чтобы запустить игру «Carbon Vanguard»!"
      >
        <img
          src={carbonHeroImg}
          alt="Luma OS 1.5.2 Carbon 4K"
          loading="eager"
          decoding="sync"
          draggable={false}
          className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center"
          style={{
            transform: `translate3d(${(-tilt.ry * 1.35).toFixed(2)}px, ${(tilt.rx * 1.35).toFixed(2)}px, 0) scale(${tilt.hovering ? 1.07 : 1.02})`,
            transition: tilt.hovering
              ? 'transform 0.16s ease-out'
              : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-200 opacity-65 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.22) 0%, rgba(34,211,238,0.22) 28%, rgba(16,185,129,0.12) 48%, transparent 66%)`,
          }}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#04060b]/28 via-transparent to-[#03050a]/74" />

        <div className="relative z-10 flex items-center justify-between px-5 pt-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-cyan-300/30 text-[10px] font-mono uppercase tracking-[0.18em] text-white/95">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            LUMACORE {kernelVersion} · SHIELD {securityVersion}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 border border-emerald-300/30 text-[10px] font-mono text-cyan-100 group-hover:bg-white/20 transition">
            <Sparkles className="w-3 h-3 text-cyan-300" />
            Carbon · 4K Studio
          </span>
        </div>

        <div
          className="relative z-10 flex flex-col items-center justify-center text-center h-[calc(100%-56px)] pb-4 px-4"
          style={{
            transform: `translate3d(${(tilt.ry * 0.75).toFixed(2)}px, ${(-tilt.rx * 0.75).toFixed(2)}px, 0)`,
            transition: tilt.hovering ? 'transform 0.16s ease-out' : 'transform 0.52s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            className="text-5xl sm:text-6xl font-black tracking-tight leading-none select-none transition-transform duration-300 group-hover:scale-105"
            style={{
              backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #cffafe 52%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 6px 26px rgba(34, 211, 238, 0.52))',
            }}
          >
            1.5.2
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-semibold tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            LumaOS
          </div>
          <div className="mt-1 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.34em] text-cyan-100/95">
            <span>CARBON</span>
            <span className="opacity-50">·</span>
            <span className="text-emerald-200">C-6</span>
          </div>
        </div>

        {ripple && <div className="pointer-events-none absolute inset-0 bg-cyan-200/20 animate-ping rounded-3xl" />}
      </div>
    </div>
  );
};

export const LumaLithiumHeroCard = LumaHeliumHeroCard;
export const LumaBerylliumHeroCard = LumaHeliumHeroCard;
export const LumaBoronHeroCard = LumaHeliumHeroCard;

// ==================== MINI-GAME ENGINE: BERYLLIUM VANGUARD (ROGUELITE ARENA) + LITHIUM ORBIT ====================

interface EasterEggModalProps {
  open: boolean;
  onClose: () => void;
}

type GameMode = 'vanguard' | 'orbit';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface VanguardEnemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  kind: 'swarmer' | 'brute' | 'sniper' | 'boss';
  shootCd: number;
  hitFlash: number;
  spin: number;
}

interface VanguardBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  pierce: number;
  fromEnemy?: boolean;
  color: string;
  hitIds?: Set<number>;
}

interface XpGem {
  x: number;
  y: number;
  val: number;
  kind: 'xp' | 'heal' | 'nova';
  spin: number;
}

interface LightningArc {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
}

interface UpgradeCard {
  id: string;
  title: string;
  desc: string;
  tag: string;
  accent: string;
  icon: 'multi' | 'blades' | 'lightning' | 'shock' | 'rapid' | 'magnet' | 'shield' | 'pierce';
}

const UPGRADE_POOL: UpgradeCard[] = [
  {
    id: 'multi',
    title: 'Мульти-залп Be-4',
    desc: '+1 плазменный снаряд за каждый выстрел веером',
    tag: 'ОРУЖИЕ',
    accent: 'from-emerald-500 to-teal-500',
    icon: 'multi',
  },
  {
    id: 'blades',
    title: 'Орбитальные клинки',
    desc: '+1 вращающийся изумрудный клинок вокруг ядра',
    tag: 'ЗАЩИТА',
    accent: 'from-cyan-500 to-sky-500',
    icon: 'blades',
  },
  {
    id: 'lightning',
    title: 'Цепная молния',
    desc: 'Выстрелы бьют молнией по 3 ближайшим врагам',
    tag: 'ЭЛЕКТРО',
    accent: 'from-violet-500 to-indigo-500',
    icon: 'lightning',
  },
  {
    id: 'shock',
    title: 'Ударный рывок',
    desc: 'Рывок (Space/Клик) выпускает мощную волну урона',
    tag: 'РЫВОК',
    accent: 'from-amber-500 to-orange-500',
    icon: 'shock',
  },
  {
    id: 'rapid',
    title: 'Турбо-реактор',
    desc: '+22% скорострельности и +15% скорости полёта пуль',
    tag: 'ТЕМП',
    accent: 'from-rose-500 to-pink-500',
    icon: 'rapid',
  },
  {
    id: 'magnet',
    title: 'Квантовый магнит',
    desc: '+60% радиус притяжения кристаллов и +20% опыта',
    tag: 'СБОР',
    accent: 'from-teal-500 to-emerald-500',
    icon: 'magnet',
  },
  {
    id: 'shield',
    title: 'Кристальный щит',
    desc: '+1 максимальный щит (до 5) и полное восстановление',
    tag: 'ЖИЗНИ',
    accent: 'from-emerald-400 to-lime-500',
    icon: 'shield',
  },
  {
    id: 'pierce',
    title: 'Пробивная плазма',
    desc: '+35% урона и пробивание врагов насквозь',
    tag: 'УРОН',
    accent: 'from-yellow-500 to-amber-500',
    icon: 'pierce',
  },
];

// Classic Orbit entity
interface OrbitEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: 'photon' | 'fusion' | 'shard';
  hue: number;
  spin: number;
}

const VANGUARD_BEST_KEY = 'luma_beryllium_vanguard_best_v1';
const ORBIT_BEST_KEY = 'luma_lithium_orbit_highscore_v1';

export const LumaHeliumEasterEggModal: React.FC<EasterEggModalProps> = ({ open, onClose }) => {
  const [phase, setPhase] = useState<'intro' | 'game'>('intro');
  const [mode, setMode] = useState<GameMode>('vanguard');
  const [introProgress, setIntroProgress] = useState(0);

  const [score, setScore] = useState(0);
  const [bestVanguard, setBestVanguard] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(VANGUARD_BEST_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  });
  const [bestOrbit, setBestOrbit] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(ORBIT_BEST_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  });

  const [level, setLevel] = useState(1);
  const [xpPct, setXpPct] = useState(0);
  const [kills, setKills] = useState(0);
  const [combo, setCombo] = useState(1);
  const [lives, setLives] = useState(4);
  const [maxLives, setMaxLives] = useState(4);
  const [dashReady, setDashReady] = useState(100);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [levelUpChoices, setLevelUpChoices] = useState<UpgradeCard[] | null>(null);
  const [bossHpBar, setBossHpBar] = useState<{ hp: number; maxHp: number; name: string } | null>(null);
  const [activeUpgrades, setActiveUpgrades] = useState<Record<string, number>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const modeRef = useRef<GameMode>(mode);
  modeRef.current = mode;

  // Vanguard arena state
  const vgRef = useRef({
    px: 420,
    py: 250,
    tx: 420,
    ty: 250,
    mouseActive: false,
    keys: new Set<string>(),
    enemies: [] as VanguardEnemy[],
    bullets: [] as VanguardBullet[],
    gems: [] as XpGem[],
    particles: [] as Particle[],
    texts: [] as FloatingText[],
    arcs: [] as LightningArc[],
    trail: [] as { x: number; y: number }[],
    nextId: 1,
    score: 0,
    kills: 0,
    level: 1,
    xp: 0,
    xpNeed: 35,
    lives: 4,
    maxLives: 4,
    invuln: 60,
    dashCd: 0,
    dashActive: 0,
    dashVx: 0,
    dashVy: 0,
    shootTimer: 0,
    spawnTimer: 0,
    pulseR: 0,
    pulseA: 0,
    shake: 0,
    frame: 0,
    over: false,
    paused: false,
    choosingUpgrade: false,
    bossSpawnedAtLevel: 0,
    // Upgrades
    multiShot: 1,
    blades: 1,
    lightningLvl: 0,
    shockLvl: 0,
    rapidLvl: 0,
    magnetLvl: 0,
    pierceLvl: 0,
  });

  // Classic Lithium Orbit state
  const orbRef = useRef({
    px: 420,
    py: 250,
    tx: 420,
    ty: 250,
    keys: new Set<string>(),
    entities: [] as OrbitEntity[],
    particles: [] as Particle[],
    trail: [] as { x: number; y: number }[],
    score: 0,
    combo: 1,
    comboTimer: 0,
    lives: 3,
    invulnFrames: 60,
    fusionCount: 0,
    energy: 100,
    pulseRadius: 0,
    pulseAlpha: 0,
    shake: 0,
    spawnTick: 0,
    frame: 0,
    over: false,
    paused: false,
  });

  const playTone = (freq: number, dur = 0.08, type: OscillatorType = 'sine', gain = 0.045, slide = 1.25) => {
    if (!soundOnRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), ctx.currentTime + dur);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      /* ignore */
    }
  };

  const resetVanguard = () => {
    const s = vgRef.current;
    s.px = 420;
    s.py = 250;
    s.tx = 420;
    s.ty = 250;
    s.mouseActive = false;
    s.enemies = [];
    s.bullets = [];
    s.gems = [];
    s.particles = [];
    s.texts = [];
    s.arcs = [];
    s.trail = [];
    s.score = 0;
    s.kills = 0;
    s.level = 1;
    s.xp = 0;
    s.xpNeed = 35;
    s.lives = 4;
    s.maxLives = 4;
    s.invuln = 60;
    s.dashCd = 0;
    s.dashActive = 0;
    s.shootTimer = 0;
    s.spawnTimer = 10;
    s.pulseR = 0;
    s.pulseA = 0;
    s.shake = 0;
    s.frame = 0;
    s.over = false;
    s.paused = false;
    s.choosingUpgrade = false;
    s.bossSpawnedAtLevel = 0;
    s.multiShot = 1;
    s.blades = 1;
    s.lightningLvl = 0;
    s.shockLvl = 0;
    s.rapidLvl = 0;
    s.magnetLvl = 0;
    s.pierceLvl = 0;
    setScore(0);
    setKills(0);
    setLevel(1);
    setXpPct(0);
    setLives(4);
    setMaxLives(4);
    setDashReady(100);
    setBossHpBar(null);
    setLevelUpChoices(null);
    setActiveUpgrades({ blades: 1 });
    setGameOver(false);
    setPaused(false);
  };

  const resetOrbit = () => {
    const st = orbRef.current;
    st.px = 420;
    st.py = 250;
    st.tx = 420;
    st.ty = 250;
    st.entities = [];
    st.particles = [];
    st.trail = [];
    st.score = 0;
    st.combo = 1;
    st.comboTimer = 0;
    st.lives = 3;
    st.invulnFrames = 60;
    st.fusionCount = 0;
    st.energy = 100;
    st.pulseRadius = 0;
    st.pulseAlpha = 0;
    st.shake = 0;
    st.spawnTick = 0;
    st.frame = 0;
    st.over = false;
    st.paused = false;
    setScore(0);
    setCombo(1);
    setLives(3);
    setMaxLives(3);
    setDashReady(100);
    setLevel(1);
    setGameOver(false);
    setPaused(false);
  };

  const resetCurrentGame = (targetMode: GameMode = modeRef.current) => {
    if (targetMode === 'vanguard') resetVanguard();
    else resetOrbit();
  };

  useEffect(() => {
    if (!open) return;
    setPhase('intro');
    setIntroProgress(0);
    setGameOver(false);
    setPaused(false);
    setLevelUpChoices(null);
    playTone(320, 0.24, 'sine', 0.045);
    const t1 = window.setTimeout(() => playTone(480, 0.24, 'triangle', 0.045), 320);
    const t2 = window.setTimeout(() => playTone(660, 0.28, 'sine', 0.05), 680);
    const t3 = window.setTimeout(() => playTone(980, 0.32, 'sine', 0.055), 1080);

    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / 1450);
      setIntroProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        resetVanguard();
        resetOrbit();
        setPhase('game');
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [open]);

  const applyUpgrade = (card: UpgradeCard) => {
    const s = vgRef.current;
    if (card.id === 'multi') s.multiShot = Math.min(6, s.multiShot + 1);
    if (card.id === 'blades') s.blades = Math.min(6, s.blades + 1);
    if (card.id === 'lightning') s.lightningLvl = Math.min(5, s.lightningLvl + 1);
    if (card.id === 'shock') s.shockLvl = Math.min(5, s.shockLvl + 1);
    if (card.id === 'rapid') s.rapidLvl = Math.min(5, s.rapidLvl + 1);
    if (card.id === 'magnet') s.magnetLvl = Math.min(5, s.magnetLvl + 1);
    if (card.id === 'pierce') s.pierceLvl = Math.min(5, s.pierceLvl + 1);
    if (card.id === 'shield') {
      s.maxLives = Math.min(5, s.maxLives + 1);
      s.lives = s.maxLives;
      setMaxLives(s.maxLives);
      setLives(s.lives);
    }
    setActiveUpgrades((prev) => ({ ...prev, [card.id]: (prev[card.id] || 0) + 1 }));
    s.invuln = Math.max(s.invuln, 55);
    s.pulseR = 24;
    s.pulseA = 1;
    s.choosingUpgrade = false;
    setLevelUpChoices(null);
    playTone(720, 0.14, 'triangle', 0.055, 1.45);
    window.setTimeout(() => playTone(1080, 0.18, 'sine', 0.055, 1.2), 90);
  };

  const triggerVanguardDash = () => {
    const s = vgRef.current;
    if (s.over || s.paused || s.choosingUpgrade || s.dashCd > 0) return;
    let dx = 0;
    let dy = 0;
    if (s.keys.has('w') || s.keys.has('arrowup')) dy -= 1;
    if (s.keys.has('s') || s.keys.has('arrowdown')) dy += 1;
    if (s.keys.has('a') || s.keys.has('arrowleft')) dx -= 1;
    if (s.keys.has('d') || s.keys.has('arrowright')) dx += 1;
    if (dx === 0 && dy === 0) {
      dx = s.tx - s.px;
      dy = s.ty - s.py;
    }
    const len = Math.hypot(dx, dy) || 1;
    s.dashVx = (dx / len) * 16;
    s.dashVy = (dy / len) * 16;
    s.dashActive = 10;
    s.dashCd = Math.max(46, 86 - s.shockLvl * 8);
    s.invuln = Math.max(s.invuln, 26);
    s.pulseR = 20;
    s.pulseA = 1;
    s.shake = Math.max(s.shake, 5 + s.shockLvl * 1.5);
    setDashReady(0);
    playTone(300, 0.16, 'triangle', 0.05, 2.2);

    // Shockwave damage & knockback around player
    const shockRange = 135 + s.shockLvl * 42;
    const shockDmg = 28 + s.shockLvl * 26;
    for (const e of s.enemies) {
      const dist = Math.hypot(e.x - s.px, e.y - s.py);
      if (dist < shockRange) {
        e.hp -= shockDmg;
        e.hitFlash = 8;
        const push = (1 - dist / shockRange) * 14;
        const ang = Math.atan2(e.y - s.py, e.x - s.px);
        e.x += Math.cos(ang) * push;
        e.y += Math.sin(ang) * push;
      }
    }
  };

  const triggerOrbitPulse = () => {
    const st = orbRef.current;
    if (st.over || st.paused || st.energy < 28) return;
    st.energy = Math.max(0, st.energy - 28);
    st.pulseRadius = 22;
    st.pulseAlpha = 1;
    st.shake = 7;
    setDashReady(Math.round(st.energy));
    playTone(260, 0.18, 'triangle', 0.055);
    const kept: OrbitEntity[] = [];
    for (const e of st.entities) {
      if (e.kind === 'shard' && Math.hypot(e.x - st.px, e.y - st.py) < 320) {
        st.score += 20 * st.combo;
      } else {
        kept.push(e);
      }
    }
    st.entities = kept;
    setScore(st.score);
  };

  // ==================== MAIN 60FPS CANVAS LOOP (LIGHTWEIGHT ZERO-SHADOWBLUR) ====================
  useEffect(() => {
    if (!open || phase !== 'game') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 840;
    const H = 500;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.code === 'Space' || e.key === 'Shift') {
        e.preventDefault();
        if (modeRef.current === 'vanguard') {
          if (vgRef.current.over) resetVanguard();
          else triggerVanguardDash();
        } else {
          if (orbRef.current.over) resetOrbit();
          else triggerOrbitPulse();
        }
        return;
      }
      if (e.key.toLowerCase() === 'p') {
        if (modeRef.current === 'vanguard') {
          if (vgRef.current.choosingUpgrade) return;
          vgRef.current.paused = !vgRef.current.paused;
          setPaused(vgRef.current.paused);
        } else {
          orbRef.current.paused = !orbRef.current.paused;
          setPaused(orbRef.current.paused);
        }
        return;
      }
      const k = e.key.toLowerCase();
      vgRef.current.keys.add(k);
      orbRef.current.keys.add(k);
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        vgRef.current.mouseActive = false;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      vgRef.current.keys.delete(k);
      orbRef.current.keys.delete(k);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const spawnBurst = (arr: Particle[], x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.2 + Math.random() * 4.2;
        arr.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 18 + Math.random() * 14,
          maxLife: 32,
          color,
          size: 2 + Math.random() * 2.4,
        });
      }
      if (arr.length > 180) arr.splice(0, arr.length - 180);
    };

    const pick3Upgrades = (): UpgradeCard[] => {
      const shuffled = [...UPGRADE_POOL].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 3);
    };

    let raf = 0;

    const loop = () => {
      if (modeRef.current === 'vanguard') {
        const s = vgRef.current;
        s.frame++;

        if (!s.paused && !s.over && !s.choosingUpgrade) {
          // Movement (WASD / Arrows OR smooth mouse follow)
          if (s.dashActive > 0) {
            s.px = Math.max(20, Math.min(W - 20, s.px + s.dashVx));
            s.py = Math.max(20, Math.min(H - 20, s.py + s.dashVy));
            s.dashActive--;
            if (s.frame % 2 === 0) spawnBurst(s.particles, s.px, s.py, '#34d399', 2);
          } else {
            let mx = 0;
            let my = 0;
            if (s.keys.has('w') || s.keys.has('arrowup')) my -= 1;
            if (s.keys.has('s') || s.keys.has('arrowdown')) my += 1;
            if (s.keys.has('a') || s.keys.has('arrowleft')) mx -= 1;
            if (s.keys.has('d') || s.keys.has('arrowright')) mx += 1;
            if (mx !== 0 || my !== 0) {
              const l = Math.hypot(mx, my);
              const spd = 4.9;
              s.px = Math.max(20, Math.min(W - 20, s.px + (mx / l) * spd));
              s.py = Math.max(20, Math.min(H - 20, s.py + (my / l) * spd));
              s.tx = s.px;
              s.ty = s.py;
            } else if (s.mouseActive) {
              const dx = s.tx - s.px;
              const dy = s.ty - s.py;
              const d = Math.hypot(dx, dy);
              if (d > 4) {
                const spd = Math.min(5.2, d * 0.14);
                s.px = Math.max(20, Math.min(W - 20, s.px + (dx / d) * spd));
                s.py = Math.max(20, Math.min(H - 20, s.py + (dy / d) * spd));
              }
            }
          }

          s.trail.push({ x: s.px, y: s.py });
          if (s.trail.length > 16) s.trail.shift();
          if (s.invuln > 0) s.invuln--;
          if (s.dashCd > 0) {
            s.dashCd--;
            if (s.frame % 4 === 0) {
              const maxCd = Math.max(46, 86 - s.shockLvl * 8);
              setDashReady(Math.min(100, Math.round((1 - s.dashCd / maxCd) * 100)));
            }
          }

          // Boss spawn every 5 levels
          if (s.level >= 5 && s.level % 5 === 0 && s.bossSpawnedAtLevel !== s.level) {
            s.bossSpawnedAtLevel = s.level;
            const bossHp = 320 + s.level * 120;
            s.enemies.push({
              id: s.nextId++,
              x: W / 2,
              y: -36,
              vx: 0,
              vy: 0,
              r: 30,
              hp: bossHp,
              maxHp: bossHp,
              kind: 'boss',
              shootCd: 70,
              hitFlash: 0,
              spin: 0,
            });
            s.texts.push({ x: W / 2, y: 76, text: `⚠ БОСС: ТИТАН Be-${s.level}!`, color: '#fbbf24', life: 90 });
            playTone(150, 0.35, 'sawtooth', 0.06, 0.7);
          }

          // Enemy spawning
          s.spawnTimer--;
          const spawnInterval = Math.max(18, 56 - s.level * 3.2);
          if (s.spawnTimer <= 0 && s.enemies.length < 34) {
            s.spawnTimer = spawnInterval;
            const side = Math.floor(Math.random() * 4);
            let ex = 0;
            let ey = 0;
            if (side === 0) { ex = Math.random() * W; ey = -24; }
            else if (side === 1) { ex = W + 24; ey = Math.random() * H; }
            else if (side === 2) { ex = Math.random() * W; ey = H + 24; }
            else { ex = -24; ey = Math.random() * H; }

            const roll = Math.random();
            const kind: VanguardEnemy['kind'] =
              s.level >= 3 && roll > 0.82 ? 'sniper' : s.level >= 2 && roll > 0.65 ? 'brute' : 'swarmer';
            const hpBase =
              kind === 'brute' ? 48 + s.level * 16 : kind === 'sniper' ? 28 + s.level * 9 : 18 + s.level * 6;
            s.enemies.push({
              id: s.nextId++,
              x: ex,
              y: ey,
              vx: 0,
              vy: 0,
              r: kind === 'brute' ? 16 : kind === 'sniper' ? 13 : 10,
              hp: hpBase,
              maxHp: hpBase,
              kind,
              shootCd: 95 + Math.floor(Math.random() * 50),
              hitFlash: 0,
              spin: Math.random() * Math.PI * 2,
            });
          }

          // Auto-aim plasma turret
          s.shootTimer--;
          const fireCd = Math.max(9, Math.round(24 * Math.pow(0.84, s.rapidLvl)));
          if (s.shootTimer <= 0 && s.enemies.length > 0) {
            let nearest: VanguardEnemy | null = null;
            let bestD = Infinity;
            for (const e of s.enemies) {
              const d = Math.hypot(e.x - s.px, e.y - s.py);
              if (d < bestD) {
                bestD = d;
                nearest = e;
              }
            }
            if (nearest && bestD < 520) {
              s.shootTimer = fireCd;
              const baseAng = Math.atan2(nearest.y - s.py, nearest.x - s.px);
              const bSpd = 8.4 + s.rapidLvl * 1.1;
              const dmg = Math.round(16 * Math.pow(1.32, s.pierceLvl));
              const count = s.multiShot;
              for (let i = 0; i < count; i++) {
                const spread = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * 0.28 * Math.min(3, count - 1);
                const ang = baseAng + spread;
                s.bullets.push({
                  x: s.px + Math.cos(ang) * 14,
                  y: s.py + Math.sin(ang) * 14,
                  vx: Math.cos(ang) * bSpd,
                  vy: Math.sin(ang) * bSpd,
                  r: 4.5 + Math.min(2, s.pierceLvl * 0.4),
                  dmg,
                  pierce: s.pierceLvl,
                  color: s.pierceLvl > 0 ? '#fbbf24' : '#34d399',
                  hitIds: new Set<number>(),
                });
              }
              playTone(620 + Math.random() * 110, 0.045, 'triangle', 0.024, 0.65);
            }
          }

          // Orbital blades collision
          const bladeAngleBase = s.frame * 0.075;
          const bladeRadius = 56;
          if (s.blades > 0 && s.frame % 4 === 0) {
            for (let bi = 0; bi < s.blades; bi++) {
              const ba = bladeAngleBase + (bi * Math.PI * 2) / s.blades;
              const bx = s.px + Math.cos(ba) * bladeRadius;
              const by = s.py + Math.sin(ba) * bladeRadius;
              for (const e of s.enemies) {
                if (Math.hypot(e.x - bx, e.y - by) < e.r + 12) {
                  e.hp -= 12 + s.level * 2;
                  e.hitFlash = 5;
                }
              }
            }
          }

          // Update bullets
          const nextBullets: VanguardBullet[] = [];
          for (const b of s.bullets) {
            b.x += b.vx;
            b.y += b.vy;
            if (b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) continue;

            if (b.fromEnemy) {
              if (Math.hypot(b.x - s.px, b.y - s.py) < b.r + 12) {
                if (s.invuln <= 0) {
                  s.lives--;
                  s.invuln = 75;
                  s.shake = 12;
                  setLives(s.lives);
                  spawnBurst(s.particles, s.px, s.py, '#fb7185', 22);
                  playTone(170, 0.24, 'sawtooth', 0.06, 0.6);
                  if (s.lives <= 0) {
                    s.over = true;
                    setGameOver(true);
                    setBestVanguard((prev) => {
                      const best = Math.max(prev, s.score);
                      try { localStorage.setItem(VANGUARD_BEST_KEY, String(best)); } catch { /* ignore */ }
                      return best;
                    });
                  }
                }
                continue;
              }
              nextBullets.push(b);
              continue;
            }

            let consumed = false;
            for (const e of s.enemies) {
              if (b.hitIds?.has(e.id)) continue;
              if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r + 2) {
                e.hp -= b.dmg;
                e.hitFlash = 6;
                b.hitIds?.add(e.id);
                spawnBurst(s.particles, b.x, b.y, b.color, 4);

                // Chain Lightning!
                if (s.lightningLvl > 0) {
                  let chains = Math.min(4, 1 + s.lightningLvl);
                  let prevX = e.x;
                  let prevY = e.y;
                  for (const other of s.enemies) {
                    if (chains <= 0) break;
                    if (other.id === e.id) continue;
                    if (Math.hypot(other.x - prevX, other.y - prevY) < 145) {
                      other.hp -= Math.round(b.dmg * (0.45 + s.lightningLvl * 0.1));
                      other.hitFlash = 5;
                      s.arcs.push({ x1: prevX, y1: prevY, x2: other.x, y2: other.y, life: 8 });
                      prevX = other.x;
                      prevY = other.y;
                      chains--;
                    }
                  }
                }

                if (b.pierce > 0) {
                  b.pierce--;
                } else {
                  consumed = true;
                  break;
                }
              }
            }
            if (!consumed) nextBullets.push(b);
          }
          s.bullets = nextBullets;

          // Update enemies
          let activeBoss: VanguardEnemy | null = null;
          const nextEnemies: VanguardEnemy[] = [];
          for (const e of s.enemies) {
            if (e.hp <= 0) {
              const pts = e.kind === 'boss' ? 500 : e.kind === 'brute' ? 60 : e.kind === 'sniper' ? 45 : 25;
              s.score += pts;
              s.kills++;
              spawnBurst(
                s.particles,
                e.x,
                e.y,
                e.kind === 'boss' ? '#fbbf24' : e.kind === 'sniper' ? '#c084fc' : '#fb7185',
                e.kind === 'boss' ? 36 : 12
              );
              playTone(e.kind === 'boss' ? 120 : 280 + Math.random() * 140, 0.08, 'square', 0.03, 0.5);
              if (e.kind === 'boss') {
                s.shake = 16;
                s.texts.push({ x: e.x, y: e.y, text: '+500 БОСС ПОВЕРЖЕН!', color: '#fbbf24', life: 70 });
                for (let g = 0; g < 8; g++) {
                  s.gems.push({
                    x: e.x + (Math.random() - 0.5) * 44,
                    y: e.y + (Math.random() - 0.5) * 44,
                    val: 16,
                    kind: g === 0 ? 'heal' : 'xp',
                    spin: Math.random() * 6,
                  });
                }
              } else {
                const dropRoll = Math.random();
                s.gems.push({
                  x: e.x,
                  y: e.y,
                  val: e.kind === 'brute' ? 16 : 9,
                  kind: dropRoll < 0.045 && s.lives < s.maxLives ? 'heal' : dropRoll > 0.975 ? 'nova' : 'xp',
                  spin: Math.random() * 6,
                });
              }
              continue;
            }

            if (e.kind === 'boss') activeBoss = e;
            const ang = Math.atan2(s.py - e.y, s.px - e.x);
            const distP = Math.hypot(s.px - e.x, s.py - e.y);
            const spd =
              e.kind === 'boss'
                ? 1.15
                : e.kind === 'brute'
                ? 1.25 + s.level * 0.05
                : e.kind === 'sniper'
                ? distP > 190
                  ? 1.7
                  : 0.35
                : 1.85 + Math.min(1.6, s.level * 0.09);
            e.x += Math.cos(ang) * spd;
            e.y += Math.sin(ang) * spd;
            e.spin += e.kind === 'boss' ? 0.025 : 0.06;
            if (e.hitFlash > 0) e.hitFlash--;

            // Sniper & Boss ranged plasma
            if (e.kind === 'sniper' || e.kind === 'boss') {
              e.shootCd--;
              if (e.shootCd <= 0) {
                if (e.kind === 'sniper') {
                  e.shootCd = 125;
                  s.bullets.push({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(ang) * 3.8,
                    vy: Math.sin(ang) * 3.8,
                    r: 5,
                    dmg: 1,
                    pierce: 0,
                    fromEnemy: true,
                    color: '#e879f9',
                  });
                } else {
                  e.shootCd = 90;
                  const ringCount = 8;
                  for (let k = 0; k < ringCount; k++) {
                    const ra = e.spin + (k * Math.PI * 2) / ringCount;
                    s.bullets.push({
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(ra) * 3.2,
                      vy: Math.sin(ra) * 3.2,
                      r: 5.5,
                      dmg: 1,
                      pierce: 0,
                      fromEnemy: true,
                      color: '#fb923c',
                    });
                  }
                }
              }
            }

            // Player contact
            if (distP < e.r + 12) {
              if (s.invuln <= 0) {
                s.lives--;
                s.invuln = 80;
                s.shake = 13;
                s.pulseR = 22;
                s.pulseA = 0.9;
                setLives(s.lives);
                spawnBurst(s.particles, s.px, s.py, '#fb7185', 24);
                playTone(165, 0.25, 'sawtooth', 0.06, 0.6);
                if (s.lives <= 0) {
                  s.over = true;
                  setGameOver(true);
                  setBestVanguard((prev) => {
                    const best = Math.max(prev, s.score);
                    try { localStorage.setItem(VANGUARD_BEST_KEY, String(best)); } catch { /* ignore */ }
                    return best;
                  });
                }
              }
            }
            nextEnemies.push(e);
          }
          s.enemies = nextEnemies;

          if (s.frame % 6 === 0) {
            setBossHpBar(activeBoss ? { hp: Math.max(0, Math.round(activeBoss.hp)), maxHp: activeBoss.maxHp, name: `ТИТАН Be-${s.level}` } : null);
          }

          // XP Gems magnet & pickup
          const magnetR = 95 + s.magnetLvl * 58;
          const nextGems: XpGem[] = [];
          for (const g of s.gems) {
            g.spin += 0.09;
            const dx = s.px - g.x;
            const dy = s.py - g.y;
            const d = Math.hypot(dx, dy);
            if (d < magnetR && d > 1) {
              const pull = 4.6 + s.magnetLvl * 1.1;
              g.x += (dx / d) * pull;
              g.y += (dy / d) * pull;
            }
            if (d < 22) {
              if (g.kind === 'heal') {
                s.lives = Math.min(s.maxLives, s.lives + 1);
                setLives(s.lives);
                s.texts.push({ x: s.px, y: s.py - 14, text: '+1 ЩИТ ♥', color: '#34d399', life: 45 });
                playTone(880, 0.14, 'sine', 0.055, 1.35);
              } else if (g.kind === 'nova') {
                s.pulseR = 28;
                s.pulseA = 1;
                s.shake = 12;
                s.texts.push({ x: s.px, y: s.py - 16, text: '⚡ NOVA BLAST!', color: '#67e8f9', life: 55 });
                for (const en of s.enemies) {
                  en.hp -= 85;
                  en.hitFlash = 10;
                }
                playTone(440, 0.25, 'triangle', 0.06, 2.4);
              } else {
                const gain = Math.round(g.val * (1 + s.magnetLvl * 0.2));
                s.xp += gain;
                s.score += gain;
                playTone(760 + Math.random() * 140, 0.04, 'sine', 0.025, 1.25);
                if (s.xp >= s.xpNeed) {
                  s.xp -= s.xpNeed;
                  s.level++;
                  s.xpNeed = Math.round(s.xpNeed * 1.34 + 16);
                  s.choosingUpgrade = true;
                  setLevel(s.level);
                  setLevelUpChoices(pick3Upgrades());
                  playTone(520, 0.15, 'triangle', 0.055, 1.5);
                }
              }
              continue;
            }
            nextGems.push(g);
          }
          s.gems = nextGems;

          if (s.pulseA > 0) {
            s.pulseR += 15;
            s.pulseA = Math.max(0, s.pulseA - 0.045);
          }
          if (s.shake > 0) s.shake *= 0.84;

          if (s.frame % 6 === 0) {
            setScore(s.score);
            setKills(s.kills);
            setXpPct(Math.min(100, Math.round((s.xp / Math.max(1, s.xpNeed)) * 100)));
          }
        }

        s.particles = s.particles.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.life--;
          return p.life > 0;
        });
        s.texts = s.texts.filter((t) => {
          t.y -= 0.7;
          t.life--;
          return t.life > 0;
        });
        s.arcs = s.arcs.filter((a) => {
          a.life--;
          return a.life > 0;
        });

        // ===== RENDER BERYLLIUM VANGUARD ARENA =====
        ctx.save();
        if (s.shake > 0.5) {
          ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
        }
        const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 30, W * 0.5, H * 0.5, W * 0.72);
        bg.addColorStop(0, '#072422');
        bg.addColorStop(0.55, '#041216');
        bg.addColorStop(1, '#02070b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Tactical hex grid lines
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.065)';
        ctx.lineWidth = 1;
        for (let gx = 40; gx < W; gx += 48) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, H);
          ctx.stroke();
        }
        for (let gy = 40; gy < H; gy += 48) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(W, gy);
          ctx.stroke();
        }

        if (s.pulseA > 0) {
          ctx.strokeStyle = `rgba(52, 211, 153, ${s.pulseA})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(s.px, s.py, s.pulseR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // XP Gems
        for (const g of s.gems) {
          ctx.save();
          ctx.translate(g.x, g.y);
          ctx.rotate(g.spin);
          ctx.fillStyle = g.kind === 'heal' ? '#34d399' : g.kind === 'nova' ? '#38bdf8' : '#fbbf24';
          ctx.beginPath();
          const sz = g.kind === 'xp' ? 5.5 : 8;
          ctx.moveTo(0, -sz);
          ctx.lineTo(sz * 0.78, 0);
          ctx.lineTo(0, sz);
          ctx.lineTo(-sz * 0.78, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Trail
        for (let i = 1; i < s.trail.length; i++) {
          const a = i / s.trail.length;
          ctx.strokeStyle = `rgba(52, 211, 153, ${a * 0.45})`;
          ctx.lineWidth = a * 7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(s.trail[i - 1].x, s.trail[i - 1].y);
          ctx.lineTo(s.trail[i].x, s.trail[i].y);
          ctx.stroke();
        }

        // Lightning arcs
        for (const arc of s.arcs) {
          ctx.strokeStyle = `rgba(103, 232, 249, ${arc.life / 8})`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(arc.x1, arc.y1);
          const mx = (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 14;
          const my = (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 14;
          ctx.lineTo(mx, my);
          ctx.lineTo(arc.x2, arc.y2);
          ctx.stroke();
        }

        // Bullets
        for (const b of s.bullets) {
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }

        // Enemies
        for (const e of s.enemies) {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(e.spin);
          ctx.fillStyle =
            e.hitFlash > 0
              ? '#ffffff'
              : e.kind === 'boss'
              ? '#f59e0b'
              : e.kind === 'brute'
              ? '#fb923c'
              : e.kind === 'sniper'
              ? '#c084fc'
              : '#fb7185';
          const sides = e.kind === 'boss' ? 8 : e.kind === 'brute' ? 6 : e.kind === 'sniper' ? 3 : 4;
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const a = (i * Math.PI * 2) / sides;
            const px = Math.cos(a) * e.r;
            const py = Math.sin(a) * e.r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();

          // Mini HP bar for brutes & bosses
          if ((e.kind === 'brute' || e.kind === 'boss') && e.hp < e.maxHp) {
            const bw = e.kind === 'boss' ? 54 : 26;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(e.x - bw / 2, e.y - e.r - 9, bw, 4);
            ctx.fillStyle = e.kind === 'boss' ? '#fbbf24' : '#fb7185';
            ctx.fillRect(e.x - bw / 2, e.y - e.r - 9, bw * Math.max(0, e.hp / e.maxHp), 4);
          }
        }

        // Orbital Blades
        if (!s.over && s.blades > 0) {
          const baseA = s.frame * 0.075;
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.16)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(s.px, s.py, 56, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < s.blades; i++) {
            const ba = baseA + (i * Math.PI * 2) / s.blades;
            const bx = s.px + Math.cos(ba) * 56;
            const by = s.py + Math.sin(ba) * 56;
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(ba + Math.PI / 2);
            ctx.fillStyle = '#67e8f9';
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(5, 0);
            ctx.lineTo(0, 10);
            ctx.lineTo(-5, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }

        // Player Hexagonal Beryllium Be-4 Core
        if (!s.over) {
          ctx.save();
          ctx.translate(s.px, s.py);
          if (s.invuln > 0) {
            ctx.strokeStyle = `rgba(103, 232, 249, ${0.4 + 0.4 * Math.sin(s.frame * 0.45)})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.stroke();
          }
          const cg = ctx.createRadialGradient(-3, -3, 2, 0, 0, 15);
          cg.addColorStop(0, '#ffffff');
          cg.addColorStop(0.5, '#34d399');
          cg.addColorStop(1, '#0d9488');
          ctx.fillStyle = cg;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 - Math.PI / 6;
            const hx = Math.cos(a) * 14.5;
            const hy = Math.sin(a) * 14.5;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          ctx.fillStyle = '#022c22';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Be', 0, 0.5);
          ctx.restore();
        }

        // Particles & Floating Texts
        for (const p of s.particles) {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        for (const ft of s.texts) {
          ctx.globalAlpha = Math.min(1, ft.life / 25);
          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      } else {
        // ===== CLASSIC MODE: LITHIUM ORBIT =====
        const st = orbRef.current;
        st.frame++;
        if (!st.paused && !st.over) {
          const speed = 7.4;
          if (st.keys.has('w') || st.keys.has('arrowup')) st.ty = Math.max(24, st.ty - speed);
          if (st.keys.has('s') || st.keys.has('arrowdown')) st.ty = Math.min(H - 24, st.ty + speed);
          if (st.keys.has('a') || st.keys.has('arrowleft')) st.tx = Math.max(24, st.tx - speed);
          if (st.keys.has('d') || st.keys.has('arrowright')) st.tx = Math.min(W - 24, st.tx + speed);

          st.px += (st.tx - st.px) * 0.24;
          st.py += (st.ty - st.py) * 0.24;
          st.trail.push({ x: st.px, y: st.py });
          if (st.trail.length > 20) st.trail.shift();
          if (st.invulnFrames > 0) st.invulnFrames--;
          if (st.comboTimer > 0) {
            st.comboTimer--;
            if (st.comboTimer === 0 && st.combo > 1) {
              st.combo = 1;
              setCombo(1);
            }
          }
          if (st.energy < 100) {
            st.energy = Math.min(100, st.energy + 0.28);
            if (st.frame % 6 === 0) setDashReady(Math.round(st.energy));
          }
          const curWave = 1 + Math.floor(st.score / 320);
          if (st.frame % 15 === 0) setLevel(curWave);

          st.spawnTick++;
          if (st.spawnTick >= Math.max(24, 48 - curWave * 2)) {
            st.spawnTick = 0;
            const side = Math.floor(Math.random() * 4);
            let sx = 0, sy = 0;
            if (side === 0) { sx = Math.random() * W; sy = -20; }
            else if (side === 1) { sx = W + 20; sy = Math.random() * H; }
            else if (side === 2) { sx = Math.random() * W; sy = H + 20; }
            else { sx = -20; sy = Math.random() * H; }
            const roll = Math.random();
            const kind: OrbitEntity['kind'] = roll < 0.56 ? 'photon' : roll < 0.72 ? 'fusion' : 'shard';
            const aimX = kind === 'shard' ? st.px + (Math.random() - 0.5) * 260 : W * 0.2 + Math.random() * W * 0.6;
            const aimY = kind === 'shard' ? st.py + (Math.random() - 0.5) * 260 : H * 0.2 + Math.random() * H * 0.6;
            const ang = Math.atan2(aimY - sy, aimX - sx);
            const spd = kind === 'shard' ? 1.4 + Math.min(2.2, curWave * 0.2) : 1.5 + Math.random();
            st.entities.push({
              x: sx, y: sy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
              r: kind === 'shard' ? 11 : kind === 'fusion' ? 13 : 10,
              kind, hue: kind === 'fusion' ? 188 : 152, spin: 0,
            });
          }

          const nextEntities: OrbitEntity[] = [];
          for (const e of st.entities) {
            if (e.kind !== 'shard') {
              const dx = st.px - e.x;
              const dy = st.py - e.y;
              const dm = Math.hypot(dx, dy);
              if (dm > 1 && dm < 115) {
                e.vx += (dx / dm) * 0.28;
                e.vy += (dy / dm) * 0.28;
              }
            }
            e.x += e.vx;
            e.y += e.vy;
            e.spin += 0.05;
            if (e.x < -60 || e.x > W + 60 || e.y < -60 || e.y > H + 60) continue;
            const d = Math.hypot(e.x - st.px, e.y - st.py);
            if (d < (e.kind === 'shard' ? e.r + 10 : e.r + 24)) {
              if (e.kind !== 'shard') {
                st.score += (e.kind === 'fusion' ? 45 : 15) * st.combo;
                st.combo = Math.min(9, st.combo + 1);
                st.comboTimer = 240;
                st.energy = Math.min(100, st.energy + (e.kind === 'fusion' ? 36 : 12));
                setScore(st.score);
                setCombo(st.combo);
                spawnBurst(st.particles, e.x, e.y, e.kind === 'fusion' ? '#67e8f9' : '#34d399', 10);
                playTone(e.kind === 'fusion' ? 880 : 540 + st.combo * 36, 0.07, 'sine', 0.04);
                continue;
              } else if (st.invulnFrames <= 0) {
                st.lives--;
                setLives(st.lives);
                st.shake = 12;
                if (st.lives > 0) {
                  st.invulnFrames = 90;
                  spawnBurst(st.particles, st.px, st.py, '#fbbf24', 18);
                  continue;
                }
                st.over = true;
                setGameOver(true);
                setBestOrbit((prev) => {
                  const best = Math.max(prev, st.score);
                  try { localStorage.setItem(ORBIT_BEST_KEY, String(best)); } catch { /* ignore */ }
                  return best;
                });
                continue;
              }
            }
            nextEntities.push(e);
          }
          st.entities = nextEntities;
          if (st.pulseAlpha > 0) {
            st.pulseRadius += 16;
            st.pulseAlpha = Math.max(0, st.pulseAlpha - 0.042);
          }
          if (st.shake > 0) st.shake *= 0.86;
        }
        st.particles = st.particles.filter((p) => {
          p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; p.life--; return p.life > 0;
        });

        ctx.save();
        if (st.shake > 0.5) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
        const bg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.72);
        bg.addColorStop(0, '#072226');
        bg.addColorStop(1, '#02070d');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        if (st.pulseAlpha > 0) {
          ctx.strokeStyle = `rgba(52, 211, 153, ${st.pulseAlpha})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(st.px, st.py, st.pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (const e of st.entities) {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(e.spin);
          ctx.fillStyle = e.kind === 'shard' ? '#fb7185' : e.kind === 'fusion' ? '#67e8f9' : '#34d399';
          ctx.beginPath();
          ctx.arc(0, 0, e.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (!st.over) {
          ctx.fillStyle = '#6ee7b7';
          ctx.beginPath();
          ctx.arc(st.px, st.py, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#022c22';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Li', st.px, st.py + 0.5);
        }
        for (const p of st.particles) {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [open, phase, onClose]);

  if (!open) return null;

  const currentBest = mode === 'vanguard' ? Math.max(bestVanguard, score) : Math.max(bestOrbit, score);

  const renderUpgradeIcon = (icon: UpgradeCard['icon']) => {
    switch (icon) {
      case 'multi': return <Crosshair className="w-5 h-5" />;
      case 'blades': return <Swords className="w-5 h-5" />;
      case 'lightning': return <Zap className="w-5 h-5" />;
      case 'shock': return <Flame className="w-5 h-5" />;
      case 'magnet': return <Magnet className="w-5 h-5" />;
      case 'shield': return <Shield className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#020a0d]/90 backdrop-blur-xl p-4"
      onClick={(e) => e.stopPropagation()}
    >
      {phase === 'intro' ? (
        <div
          className="relative flex flex-col items-center justify-center w-full max-w-2xl h-[460px] rounded-3xl overflow-hidden border border-emerald-300/20 bg-[#031216] shadow-2xl"
          style={{
            backgroundImage: `url("${carbonHeroImg}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <img
            src={carbonHeroImg}
            alt="Carbon Awakening"
            loading="eager"
            decoding="sync"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000"
            style={{
              transform: `scale(${1 + introProgress * 0.2})`,
              opacity: 0.45 + introProgress * 0.45,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02090c] via-[#041f24]/50 to-[#02090c]/80" />

          <div className="relative z-10 flex items-center justify-center">
            <div
              className="absolute w-72 h-72 rounded-full border-2 border-emerald-300/55"
              style={{
                transform: `scale(${0.4 + introProgress * 1.45}) rotate(${introProgress * 220}deg)`,
                opacity: 1 - introProgress * 0.55,
              }}
            >
              <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-amber-300" />
            </div>
            <div
              className="absolute w-44 h-44 rounded-full border border-cyan-300/80"
              style={{
                transform: `scale(${0.5 + introProgress * 0.9}) rotate(${-introProgress * 320}deg)`,
              }}
            >
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-300" />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-300" />
            </div>

            <div
              className="text-center transition-all duration-300"
              style={{
                transform: `scale(${0.82 + introProgress * 0.24})`,
                opacity: Math.min(1, introProgress * 1.8),
              }}
            >
              <div className="text-7xl font-black tracking-tight bg-gradient-to-b from-white via-emerald-200 to-amber-300 bg-clip-text text-transparent">
                1.3
              </div>
              <div className="text-xl font-bold tracking-[0.28em] text-white uppercase mt-1">
                BERYLLIUM VANGUARD
              </div>
              <div className="text-[11px] font-mono text-emerald-200/90 mt-2 tracking-widest">
                ROGUELITE АРЕНА Be-4 · АВТОПРИЦЕЛ · ПРОКАЧКА · БОССЫ
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="w-full max-w-[900px] rounded-3xl border border-emerald-400/20 bg-[#041016] text-white shadow-2xl overflow-hidden flex flex-col">
          {/* Top Arcade HUD + 2-Game Switcher */}
          <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-400 to-amber-300 flex items-center justify-center font-mono font-black text-xs text-slate-950 shadow">
                {mode === 'vanguard' ? 'Be' : 'Li'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold tracking-wide uppercase">
                    {mode === 'vanguard' ? 'BERYLLIUM VANGUARD · Be-4' : 'LITHIUM ORBIT · Li-3'}
                  </span>
                  <div className="inline-flex rounded-lg bg-white/10 p-0.5 text-[10px] font-mono">
                    <button
                      onClick={() => {
                        setMode('vanguard');
                        modeRef.current = 'vanguard';
                        resetVanguard();
                      }}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition ${
                        mode === 'vanguard' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      Арена 1.3
                    </button>
                    <button
                      onClick={() => {
                        setMode('orbit');
                        modeRef.current = 'orbit';
                        resetOrbit();
                      }}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition ${
                        mode === 'orbit' ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      Орбита
                    </button>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  {mode === 'vanguard'
                    ? 'WASD / Мышь — манёвр · Авто-стрельба · Пробел/Клик — Ударный рывок · Собирай кристаллы опыта!'
                    : 'Мышь / WASD — полёт · Клик / Пробел — импульс (28%) · 3 щита'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <div className="px-2 py-1 rounded-xl bg-white/[0.06] border border-white/10 inline-flex items-center gap-1">
                {Array.from({ length: maxLives }).map((_, idx) => (
                  <Heart
                    key={idx}
                    className={`w-3.5 h-3.5 transition ${
                      idx < lives ? 'text-rose-400 fill-rose-400' : 'text-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10">
                LVL <span className="text-amber-300 font-bold">{level}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10">
                СЧЁТ <span className="text-emerald-300 font-bold">{score}</span>
              </div>
              {mode === 'vanguard' ? (
                <div className="px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10">
                  ☠ <span className="text-rose-300 font-bold">{kills}</span>
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10">
                  x<span className="text-cyan-300 font-bold">{combo}</span>
                </div>
              )}
              <div className="px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10 inline-flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>{currentBest}</span>
              </div>
              <button
                onClick={() => (mode === 'vanguard' ? triggerVanguardDash() : triggerOrbitPulse())}
                disabled={dashReady < (mode === 'vanguard' ? 100 : 28) || gameOver}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer"
                title={mode === 'vanguard' ? 'Ударный рывок (Space / Клик)' : 'Импульс (Space / Клик)'}
              >
                <Zap className="w-3.5 h-3.5" />
                {dashReady}%
              </button>
              <button
                onClick={() => {
                  if (mode === 'vanguard') {
                    if (vgRef.current.choosingUpgrade) return;
                    vgRef.current.paused = !vgRef.current.paused;
                    setPaused(vgRef.current.paused);
                  } else {
                    orbRef.current.paused = !orbRef.current.paused;
                    setPaused(orbRef.current.paused);
                  }
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
                title="Пауза (P)"
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setSoundOn((v) => !v)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
                title="Звук"
              >
                {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 cursor-pointer"
                title="Закрыть (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* XP Progress Bar & Boss HP Bar (Vanguard mode) */}
          {mode === 'vanguard' && (
            <div className="px-4 py-1.5 bg-black/40 border-b border-white/5 flex items-center gap-3">
              <span className="text-[10px] font-mono text-amber-300 shrink-0">XP · LVL {level}</span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300 transition-all duration-150"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 shrink-0">
                {Object.entries(activeUpgrades)
                  .slice(0, 5)
                  .map(([k, v]) => (
                    <span key={k} className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-200">
                      {k.slice(0, 3).toUpperCase()}×{v}
                    </span>
                  ))}
              </div>
            </div>
          )}

          <div className="relative w-full bg-[#02080d] flex items-center justify-center">
            {mode === 'vanguard' && bossHpBar && !gameOver && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 w-72 sm:w-96 px-3 py-1.5 rounded-xl bg-black/75 border border-amber-400/45">
                <div className="flex justify-between text-[10px] font-mono text-amber-200 font-bold mb-1">
                  <span>⚠ {bossHpBar.name}</span>
                  <span>
                    {bossHpBar.hp} / {bossHpBar.maxHp}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-400"
                    style={{ width: `${Math.min(100, (bossHpBar.hp / Math.max(1, bossHpBar.maxHp)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <canvas
              ref={canvasRef}
              width={840}
              height={500}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const nx = ((e.clientX - rect.left) / rect.width) * 840;
                const ny = ((e.clientY - rect.top) / rect.height) * 500;
                vgRef.current.tx = nx;
                vgRef.current.ty = ny;
                vgRef.current.mouseActive = true;
                orbRef.current.tx = nx;
                orbRef.current.ty = ny;
              }}
              onClick={() => {
                if (mode === 'vanguard') {
                  if (vgRef.current.over) resetVanguard();
                  else triggerVanguardDash();
                } else {
                  if (orbRef.current.over) resetOrbit();
                  else triggerOrbitPulse();
                }
              }}
              className="w-full max-h-[64vh] aspect-[840/500] cursor-crosshair block"
            />

            {/* 3-Card Roguelite Level-Up Picker */}
            {mode === 'vanguard' && levelUpChoices && !gameOver && (
              <div className="absolute inset-0 z-30 bg-[#020a0e]/82 backdrop-blur-md flex flex-col items-center justify-center p-5">
                <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-amber-300">
                  УРОВЕНЬ {level} · ЭВОЛЮЦИЯ ЯДРА Be-4
                </div>
                <div className="text-xl font-black mt-1 mb-4">Выберите улучшение</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
                  {levelUpChoices.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => applyUpgrade(card)}
                      className="group p-4 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.13] hover:border-emerald-300/60 hover:-translate-y-1 transition-all text-left cursor-pointer flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.accent} text-slate-950 flex items-center justify-center shadow-lg`}>
                          {renderUpgradeIcon(card.icon)}
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-emerald-200">
                          {card.tag}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-white group-hover:text-emerald-200 transition">
                          {card.title}
                        </div>
                        <div className="text-[11px] text-zinc-300 mt-1 leading-relaxed">{card.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paused && !gameOver && !levelUpChoices && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <div className="text-2xl font-black tracking-widest uppercase">ПАУЗА</div>
                <button
                  onClick={() => {
                    vgRef.current.paused = false;
                    orbRef.current.paused = false;
                    setPaused(false);
                  }}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Продолжить
                </button>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 bg-[#020b0f]/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="text-[11px] font-mono uppercase tracking-[0.26em] text-emerald-300">
                  {mode === 'vanguard' ? 'МИССИЯ BERYLLIUM ЗАВЕРШЕНА' : 'ЯДРО LITHIUM СТАБИЛИЗИРОВАНО'}
                </div>
                <div className="text-4xl font-black">{score} очков</div>
                <div className="text-xs font-mono text-zinc-300">
                  Рекорд: {currentBest} · Уровень {level} {mode === 'vanguard' ? `· Уничтожено врагов: ${kills}` : ''}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => resetCurrentGame()}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Играть снова
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                  >
                    Вернуться в Luma OS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const LumaLithiumEasterEggModal = LumaHeliumEasterEggModal;
export const LumaBerylliumEasterEggModal = LumaHeliumEasterEggModal;
