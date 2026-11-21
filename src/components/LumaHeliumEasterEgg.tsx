import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, RotateCcw, Volume2, VolumeX, Trophy, Zap, Play, Pause } from 'lucide-react';

interface HeroCardProps {
  onTriggerEasterEgg: () => void;
  kernelVersion?: string;
  securityVersion?: string;
}

/**
 * Flagship sculptural 3D Lithium crystal orb hero banner for Luma OS 1.2 (Lithium · Li-3).
 * Features interactive 3D pointer parallax, liquid glass specular sweep, and launches the
 * Lithium Awakening animation -> playable LITHIUM ORBIT (Li-3) 3-electron mini-game on click!
 */
export const LumaHeliumHeroCard: React.FC<HeroCardProps> = ({
  onTriggerEasterEgg,
  kernelVersion = '1.2',
  securityVersion = '1.2',
}) => {
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 35 });
  const [ripple, setRipple] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 7,
      ry: (px - 0.5) * 9,
      gx: px * 100,
      gy: py * 100,
    });
  };

  const handleClick = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 450);
    onTriggerEasterEgg();
  };

  return (
    <button
      ref={cardRef}
      type="button"
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 35 })}
      onClick={handleClick}
      className="group relative w-full h-56 sm:h-64 rounded-3xl overflow-hidden border border-white/15 shadow-2xl cursor-pointer text-left select-none transition-transform duration-200 focus:outline-none"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${ripple ? 0.985 : 1})`,
      }}
      title="Нажмите, чтобы запустить анимацию Lithium и мини-игру Li-3!"
    >
      {/* Bespoke 3D Sculpted Lithium Crystal Orb Artwork */}
      <img
        src="/luma-lithium-hero.jpg"
        alt="Luma OS 1.2 Lithium"
        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
      />

      {/* Dynamic pointer glass specular sheen */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-75 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.24) 0%, rgba(16,185,129,0.16) 28%, transparent 62%)`,
        }}
      />

      {/* Subtle readability vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#041418]/35 via-transparent to-[#020a10]/70" />

      {/* Top badges */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-[10px] font-mono uppercase tracking-[0.18em] text-white/95">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          LUMACORE {kernelVersion} · SHIELD {securityVersion}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white/90 group-hover:bg-white/20 transition">
          <Sparkles className="w-3 h-3 text-emerald-200" />
          Пасхалка Lithium
        </span>
      </div>

      {/* Centered Flagship Glass Typography */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center h-[calc(100%-56px)] pb-4 px-4">
        <div
          className="text-6xl sm:text-7xl font-black tracking-tight leading-none select-none transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #d1fae5 55%, #67e8f9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 8px 26px rgba(16, 185, 129, 0.55))',
          }}
        >
          1.2
        </div>
        <div className="mt-1 text-xl sm:text-2xl font-semibold tracking-wide text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
          LumaOS
        </div>
        <div className="mt-1 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.34em] text-emerald-100/95">
          <span>LITHIUM</span>
          <span className="opacity-50">·</span>
          <span>Li-3</span>
        </div>
      </div>

      {ripple && (
        <div className="pointer-events-none absolute inset-0 bg-white/25 animate-ping rounded-3xl" />
      )}
    </button>
  );
};

export const LumaLithiumHeroCard = LumaHeliumHeroCard;

// ==================== FULL-SCREEN CINEMATIC ANIMATION + PLAYABLE MINI-GAME «LITHIUM ORBIT · Li-3» ====================

interface EasterEggModalProps {
  open: boolean;
  onClose: () => void;
}

interface OrbEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: 'photon' | 'fusion' | 'shard';
  hue: number;
  spin: number;
}

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

const HIGH_SCORE_KEY = 'luma_lithium_orbit_highscore_v1';

export const LumaHeliumEasterEggModal: React.FC<EasterEggModalProps> = ({ open, onClose }) => {
  const [phase, setPhase] = useState<'intro' | 'game'>('intro');
  const [introProgress, setIntroProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(HIGH_SCORE_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  });
  const [combo, setCombo] = useState(1);
  const [wave, setWave] = useState(1);
  const [energy, setEnergy] = useState(100);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const gameStateRef = useRef({
    px: 400,
    py: 260,
    tx: 400,
    ty: 260,
    keys: new Set<string>(),
    entities: [] as OrbEntity[],
    particles: [] as Particle[],
    trail: [] as { x: number; y: number }[],
    score: 0,
    combo: 1,
    comboTimer: 0,
    energy: 100,
    pulseRadius: 0,
    pulseAlpha: 0,
    shake: 0,
    spawnTick: 0,
    frame: 0,
    over: false,
    paused: false,
  });

  const playTone = (freq: number, dur = 0.09, type: OscillatorType = 'sine', gain = 0.07) => {
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
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, ctx.currentTime + dur);
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

  useEffect(() => {
    if (!open) return;
    setPhase('intro');
    setIntroProgress(0);
    setGameOver(false);
    setPaused(false);
    playTone(340, 0.28, 'sine', 0.06);
    const t1 = window.setTimeout(() => playTone(510, 0.3, 'triangle', 0.06), 450);
    const t2 = window.setTimeout(() => playTone(680, 0.35, 'sine', 0.07), 950);
    const t3 = window.setTimeout(() => playTone(1020, 0.45, 'sine', 0.07), 1550);

    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / 2150);
      setIntroProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        resetGame();
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

  const resetGame = () => {
    const st = gameStateRef.current;
    st.px = 400;
    st.py = 250;
    st.tx = 400;
    st.ty = 250;
    st.entities = [];
    st.particles = [];
    st.trail = [];
    st.score = 0;
    st.combo = 1;
    st.comboTimer = 0;
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
    setWave(1);
    setEnergy(100);
    setGameOver(false);
    setPaused(false);
  };

  const triggerFusionPulse = () => {
    const st = gameStateRef.current;
    if (st.over || st.paused || st.energy < 40) return;
    st.energy = Math.max(0, st.energy - 40);
    st.pulseRadius = 20;
    st.pulseAlpha = 1;
    st.shake = 10;
    setEnergy(Math.round(st.energy));
    playTone(240, 0.24, 'sawtooth', 0.07);
    playTone(920, 0.32, 'sine', 0.08);
    const kept: OrbEntity[] = [];
    for (const e of st.entities) {
      const dist = Math.hypot(e.x - st.px, e.y - st.py);
      if (e.kind === 'shard' && dist < 260) {
        st.score += 18 * st.combo;
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 1.5 + Math.random() * 4.5;
          st.particles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 28,
            maxLife: 28,
            color: '#34d399',
            size: 3,
          });
        }
      } else {
        kept.push(e);
      }
    }
    st.entities = kept;
    setScore(st.score);
  };

  useEffect(() => {
    if (!open || phase !== 'game') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameStateRef.current.over) resetGame();
        else triggerFusionPulse();
        return;
      }
      if (e.key.toLowerCase() === 'p') {
        gameStateRef.current.paused = !gameStateRef.current.paused;
        setPaused(gameStateRef.current.paused);
        return;
      }
      gameStateRef.current.keys.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      gameStateRef.current.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let raf = 0;
    const W = 820;
    const H = 480;

    const spawnBurst = (x: number, y: number, color: string, count = 14) => {
      const st = gameStateRef.current;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.2 + Math.random() * 4.2;
        st.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 24 + Math.random() * 14,
          maxLife: 38,
          color,
          size: 2 + Math.random() * 2.5,
        });
      }
    };

    const loop = () => {
      const st = gameStateRef.current;
      st.frame++;

      if (!st.paused && !st.over) {
        const speed = 6.4;
        if (st.keys.has('w') || st.keys.has('arrowup')) st.ty = Math.max(24, st.ty - speed);
        if (st.keys.has('s') || st.keys.has('arrowdown')) st.ty = Math.min(H - 24, st.ty + speed);
        if (st.keys.has('a') || st.keys.has('arrowleft')) st.tx = Math.max(24, st.tx - speed);
        if (st.keys.has('d') || st.keys.has('arrowright')) st.tx = Math.min(W - 24, st.tx + speed);

        st.px += (st.tx - st.px) * 0.2;
        st.py += (st.ty - st.py) * 0.2;
        st.trail.push({ x: st.px, y: st.py });
        if (st.trail.length > 24) st.trail.shift();

        if (st.comboTimer > 0) {
          st.comboTimer--;
          if (st.comboTimer === 0 && st.combo > 1) {
            st.combo = 1;
            setCombo(1);
          }
        }
        if (st.energy < 100) {
          st.energy = Math.min(100, st.energy + 0.16);
          if (st.frame % 6 === 0) setEnergy(Math.round(st.energy));
        }

        const curWave = 1 + Math.floor(st.score / 240);
        if (st.frame % 15 === 0) setWave(curWave);

        st.spawnTick++;
        const spawnEvery = Math.max(15, 38 - curWave * 3);
        if (st.spawnTick >= spawnEvery) {
          st.spawnTick = 0;
          const side = Math.floor(Math.random() * 4);
          let sx = 0, sy = 0;
          if (side === 0) { sx = Math.random() * W; sy = -20; }
          else if (side === 1) { sx = W + 20; sy = Math.random() * H; }
          else if (side === 2) { sx = Math.random() * W; sy = H + 20; }
          else { sx = -20; sy = Math.random() * H; }

          const roll = Math.random();
          const kind: OrbEntity['kind'] = roll < 0.45 ? 'photon' : roll < 0.56 ? 'fusion' : 'shard';
          const aimX = kind === 'shard' ? st.px + (Math.random() - 0.5) * 140 : W * 0.2 + Math.random() * W * 0.6;
          const aimY = kind === 'shard' ? st.py + (Math.random() - 0.5) * 140 : H * 0.2 + Math.random() * H * 0.6;
          const ang = Math.atan2(aimY - sy, aimX - sx);
          const spd =
            kind === 'shard'
              ? 2.1 + Math.min(4.2, curWave * 0.35) + Math.random() * 1.4
              : 1.5 + Math.random() * 1.5;

          st.entities.push({
            x: sx,
            y: sy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: kind === 'shard' ? 11 + Math.random() * 5 : kind === 'fusion' ? 12 : 9,
            kind,
            hue: kind === 'fusion' ? 188 : 148 + Math.random() * 30,
            spin: Math.random() * Math.PI * 2,
          });
        }

        const nextEntities: OrbEntity[] = [];
        for (const e of st.entities) {
          e.x += e.vx;
          e.y += e.vy;
          e.spin += 0.06;
          if (e.x < -60 || e.x > W + 60 || e.y < -60 || e.y > H + 60) continue;

          const d = Math.hypot(e.x - st.px, e.y - st.py);
          if (d < e.r + 16) {
            if (e.kind === 'photon' || e.kind === 'fusion') {
              const pts = e.kind === 'fusion' ? 40 : 12;
              st.score += pts * st.combo;
              st.combo = Math.min(9, st.combo + 1);
              st.comboTimer = 170;
              st.energy = Math.min(100, st.energy + (e.kind === 'fusion' ? 35 : 9));
              setScore(st.score);
              setCombo(st.combo);
              setEnergy(Math.round(st.energy));
              spawnBurst(e.x, e.y, e.kind === 'fusion' ? '#67e8f9' : '#34d399', e.kind === 'fusion' ? 22 : 12);
              playTone(e.kind === 'fusion' ? 880 : 540 + st.combo * 42, 0.09, 'sine', 0.06);
              continue;
            } else {
              st.over = true;
              st.shake = 16;
              setGameOver(true);
              spawnBurst(st.px, st.py, '#fb7185', 36);
              playTone(140, 0.38, 'sawtooth', 0.08);
              setBestScore((prev) => {
                const best = Math.max(prev, st.score);
                try {
                  localStorage.setItem(HIGH_SCORE_KEY, String(best));
                } catch {
                  /* ignore */
                }
                return best;
              });
              continue;
            }
          }
          nextEntities.push(e);
        }
        st.entities = nextEntities;

        if (st.pulseAlpha > 0) {
          st.pulseRadius += 15;
          st.pulseAlpha = Math.max(0, st.pulseAlpha - 0.045);
        }
        if (st.shake > 0) st.shake *= 0.86;
      }

      st.particles = st.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life--;
        return p.life > 0;
      });

      // Render Lithium deep emerald-obsidian space
      ctx.save();
      if (st.shake > 0.5) {
        ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
      }
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 40, W * 0.5, H * 0.5, W * 0.72);
      bg.addColorStop(0, '#072226');
      bg.addColorStop(0.55, '#041219');
      bg.addColorStop(1, '#02070d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.08)';
      ctx.lineWidth = 1;
      for (const rad of [90, 175, 265, 355]) {
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, rad, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (st.pulseAlpha > 0) {
        ctx.strokeStyle = `rgba(52, 211, 153, ${st.pulseAlpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(st.px, st.py, st.pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Emerald-cyan ribbon trail
      for (let i = 1; i < st.trail.length; i++) {
        const a = i / st.trail.length;
        ctx.strokeStyle = `rgba(52, 211, 153, ${a * 0.55})`;
        ctx.lineWidth = a * 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(st.trail[i - 1].x, st.trail[i - 1].y);
        ctx.lineTo(st.trail[i].x, st.trail[i].y);
        ctx.stroke();
      }

      for (const e of st.entities) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.spin);
        if (e.kind === 'shard') {
          ctx.fillStyle = '#fb7185';
          ctx.shadowColor = '#e11d48';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2;
            ctx.lineTo(Math.cos(ang) * e.r * 1.25, Math.sin(ang) * e.r * 1.25);
            ctx.lineTo(Math.cos(ang + Math.PI / 4) * e.r * 0.45, Math.sin(ang + Math.PI / 4) * e.r * 0.45);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, e.r);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.55, e.kind === 'fusion' ? '#67e8f9' : `hsl(${e.hue}, 90%, 62%)`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.shadowColor = e.kind === 'fusion' ? '#22d3ee' : '#10b981';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(0, 0, e.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Player Lithium-3 Atom (Nucleus + 2 inner shell electrons + 1 outer valence electron!)
      if (!st.over) {
        ctx.save();
        ctx.translate(st.px, st.py);

        // Inner 1s orbit (2 electrons)
        ctx.strokeStyle = 'rgba(110, 231, 183, 0.48)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI * 2);
        ctx.stroke();

        // Outer 2s valence orbit (1 electron)
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, 0, 27, 0, Math.PI * 2);
        ctx.stroke();

        const t = st.frame * 0.11;
        for (const offset of [0, Math.PI]) {
          const ex = Math.cos(t + offset) * 19;
          const ey = Math.sin(t + offset) * 19;
          ctx.fillStyle = '#6ee7b7';
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(ex, ey, 3.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // 3rd valence electron
        const vx = Math.cos(-t * 0.72) * 27;
        const vy = Math.sin(-t * 0.72) * 27;
        ctx.fillStyle = '#e0f2fe';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(vx, vy, 3.8, 0, Math.PI * 2);
        ctx.fill();

        const coreGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.5, '#6ee7b7');
        coreGrad.addColorStop(1, '#0d9488');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#022c22';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText('Li', 0, 0.5);
        ctx.restore();
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

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#020a0d]/90 backdrop-blur-2xl p-4"
      onClick={(e) => e.stopPropagation()}
    >
      {phase === 'intro' ? (
        <div className="relative flex flex-col items-center justify-center w-full max-w-2xl h-[460px] rounded-3xl overflow-hidden border border-white/15 bg-[#031216] shadow-2xl">
          <img
            src="/luma-lithium-hero.jpg"
            alt="Lithium Awakening"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000"
            style={{
              transform: `scale(${1 + introProgress * 0.22})`,
              opacity: 0.42 + introProgress * 0.45,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02090c] via-[#041f24]/50 to-[#02090c]/80" />

          {/* Expanding Lithium 3-Electron Orbital Rings */}
          <div className="relative z-10 flex items-center justify-center">
            <div
              className="absolute w-72 h-72 rounded-full border-2 border-emerald-300/55"
              style={{
                transform: `scale(${0.4 + introProgress * 1.45}) rotate(${introProgress * 220}deg)`,
                opacity: 1 - introProgress * 0.55,
              }}
            >
              <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_16px_#67e8f9]" />
            </div>
            <div
              className="absolute w-44 h-44 rounded-full border border-cyan-300/80"
              style={{
                transform: `scale(${0.5 + introProgress * 0.9}) rotate(${-introProgress * 320}deg)`,
              }}
            >
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_16px_#67e8f9]" />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-300 shadow-[0_0_16px_#34d399]" />
            </div>

            <div
              className="text-center transition-all duration-300"
              style={{
                transform: `scale(${0.82 + introProgress * 0.24})`,
                opacity: Math.min(1, introProgress * 1.8),
              }}
            >
              <div className="text-7xl font-black tracking-tight bg-gradient-to-b from-white via-emerald-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_32px_rgba(16,185,129,0.7)]">
                1.2
              </div>
              <div className="text-xl font-bold tracking-[0.28em] text-white uppercase mt-1">
                LUMA LITHIUM
              </div>
              <div className="text-[11px] font-mono text-emerald-200/90 mt-2 tracking-widest">
                ЗАПУСК ОРБИТЫ Li-3 · 3 ЭЛЕКТРОНА...
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
        <div className="w-full max-w-[860px] rounded-3xl border border-white/15 bg-[#041016] text-white shadow-2xl overflow-hidden flex flex-col">
          {/* Top Arcade HUD */}
          <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center font-mono font-black text-xs text-slate-950">
                Li
              </div>
              <div>
                <div className="text-xs font-extrabold tracking-wide uppercase">LITHIUM ORBIT · Пасхалка 1.2</div>
                <div className="text-[10px] font-mono text-zinc-400">
                  Мышь / WASD — полёт · Пробел — кристальный импульс
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10">
                СЧЁТ <span className="text-emerald-300 font-bold">{score}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10">
                x<span className="text-cyan-300 font-bold">{combo}</span> · W{wave}
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10 inline-flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>{Math.max(bestScore, score)}</span>
              </div>
              <button
                onClick={triggerFusionPulse}
                disabled={energy < 40 || gameOver}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer"
                title="Импульс (Пробел)"
              >
                <Zap className="w-3.5 h-3.5" />
                {energy}%
              </button>
              <button
                onClick={() => {
                  gameStateRef.current.paused = !gameStateRef.current.paused;
                  setPaused(gameStateRef.current.paused);
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

          <div className="relative w-full bg-[#02080d] flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={820}
              height={480}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                gameStateRef.current.tx = ((e.clientX - rect.left) / rect.width) * 820;
                gameStateRef.current.ty = ((e.clientY - rect.top) / rect.height) * 480;
              }}
              onClick={() => {
                if (gameStateRef.current.over) resetGame();
                else triggerFusionPulse();
              }}
              className="w-full max-h-[65vh] aspect-[820/480] cursor-crosshair block"
            />

            {paused && !gameOver && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <div className="text-2xl font-black tracking-widest uppercase">ПАУЗА</div>
                <button
                  onClick={() => {
                    gameStateRef.current.paused = false;
                    setPaused(false);
                  }}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold cursor-pointer"
                >
                  Продолжить
                </button>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 bg-[#020b0f]/75 backdrop-blur-md flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="text-[11px] font-mono uppercase tracking-[0.26em] text-emerald-300">
                  ЯДРО LITHIUM СТАБИЛИЗИРОВАНО
                </div>
                <div className="text-4xl font-black">{score} очков</div>
                <div className="text-xs font-mono text-zinc-300">
                  Рекорд: {Math.max(bestScore, score)} · Волна {wave}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={resetGame}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg"
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
