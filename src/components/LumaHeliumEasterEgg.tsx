import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, RotateCcw, Volume2, VolumeX, Trophy, Zap, Play, Pause, Heart } from 'lucide-react';
import lithiumHeroImg from '../assets/luma-lithium-hero.jpg';

interface HeroCardProps {
  onTriggerEasterEgg: () => void;
  kernelVersion?: string;
  securityVersion?: string;
}

/**
 * Flagship sculptural 3D Lithium crystal orb hero banner for Luma OS 1.2.3 (Lithium · Li-3).
 * Uses content-hashed Vite asset + dual CSS background + eager <img> inside an isolated layer
 * (without Chromium 3D perspective clipping) so the artwork NEVER disappears inside WebView2!
 */
export const LumaHeliumHeroCard: React.FC<HeroCardProps> = ({
  onTriggerEasterEgg,
  kernelVersion = '1.3',
  securityVersion = '1.3',
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [glowPos, setGlowPos] = useState({ gx: 50, gy: 38 });
  const [ripple, setRipple] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    setGlowPos({ gx: px, gy: py });
  };

  const handleClick = () => {
    setRipple(true);
    window.setTimeout(() => setRipple(false), 400);
    onTriggerEasterEgg();
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onMouseMove={handleMove}
      onMouseLeave={() => setGlowPos({ gx: 50, gy: 38 })}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group relative block w-full h-56 sm:h-64 rounded-3xl overflow-hidden border border-white/15 shadow-xl cursor-pointer text-left select-none transition-transform duration-200 hover:scale-[1.006] active:scale-[0.99] focus:outline-none"
      style={{
        isolation: 'isolate',
        backgroundColor: '#04121b',
        backgroundImage: `url("${lithiumHeroImg}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      title="Нажмите, чтобы запустить анимацию Lithium и мини-игру Li-3!"
    >
      {/* Guaranteed eager image layer over identical CSS background so WebView2 GPU never drops the texture */}
      <img
        src={lithiumHeroImg}
        alt="Luma OS 1.2.3 Lithium"
        loading="eager"
        decoding="sync"
        draggable={false}
        className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
      />

      {/* Dynamic pointer glass specular sheen */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200 opacity-70 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at ${glowPos.gx}% ${glowPos.gy}%, rgba(255,255,255,0.22) 0%, rgba(16,185,129,0.14) 30%, transparent 62%)`,
        }}
      />

      {/* Subtle readability vignette (preserves full crystal orb brightness in center) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#041418]/30 via-transparent to-[#020a10]/65" />

      {/* Top badges */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 border border-white/20 text-[10px] font-mono uppercase tracking-[0.18em] text-white/95">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          LUMACORE {kernelVersion} · SHIELD {securityVersion}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/35 border border-white/15 text-[10px] font-mono text-white/95 group-hover:bg-white/20 transition">
          <Sparkles className="w-3 h-3 text-emerald-200" />
          Пасхалка Lithium
        </span>
      </div>

      {/* Centered Flagship Glass Typography */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center h-[calc(100%-56px)] pb-4 px-4">
        <div
          className="text-6xl sm:text-7xl font-black tracking-tight leading-none select-none transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #d1fae5 55%, #67e8f9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 6px 20px rgba(16, 185, 129, 0.55))',
          }}
        >
          1.2.3
        </div>
        <div className="mt-1 text-xl sm:text-2xl font-semibold tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
          LumaOS
        </div>
        <div className="mt-1 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.34em] text-emerald-100/95">
          <span>LITHIUM</span>
          <span className="opacity-50">·</span>
          <span>Li-3</span>
        </div>
      </div>

      {ripple && (
        <div className="pointer-events-none absolute inset-0 bg-white/20 animate-ping rounded-3xl" />
      )}
    </div>
  );
};

export const LumaLithiumHeroCard = LumaHeliumHeroCard;

// ==================== FULL-SCREEN CINEMATIC ANIMATION + REBALANCED MINI-GAME «LITHIUM ORBIT · Li-3» ====================

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
  const [lives, setLives] = useState(3);
  const [energy, setEnergy] = useState(100);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const gameStateRef = useRef({
    px: 410,
    py: 240,
    tx: 410,
    ty: 240,
    keys: new Set<string>(),
    entities: [] as OrbEntity[],
    particles: [] as Particle[],
    trail: [] as { x: number; y: number }[],
    score: 0,
    combo: 1,
    comboTimer: 0,
    lives: 3,
    invulnFrames: 0,
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

  const playTone = (freq: number, dur = 0.09, type: OscillatorType = 'sine', gain = 0.06) => {
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
    playTone(340, 0.25, 'sine', 0.05);
    const t1 = window.setTimeout(() => playTone(510, 0.25, 'triangle', 0.05), 380);
    const t2 = window.setTimeout(() => playTone(680, 0.3, 'sine', 0.06), 780);
    const t3 = window.setTimeout(() => playTone(1020, 0.35, 'sine', 0.06), 1250);

    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / 1750);
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
    st.px = 410;
    st.py = 240;
    st.tx = 410;
    st.ty = 240;
    st.entities = [];
    st.particles = [];
    st.trail = [];
    st.score = 0;
    st.combo = 1;
    st.comboTimer = 0;
    st.lives = 3;
    st.invulnFrames = 60; // Brief spawn grace shield!
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
    setWave(1);
    setLives(3);
    setEnergy(100);
    setGameOver(false);
    setPaused(false);
  };

  const triggerFusionPulse = () => {
    const st = gameStateRef.current;
    if (st.over || st.paused || st.energy < 28) return;
    st.energy = Math.max(0, st.energy - 28);
    st.pulseRadius = 22;
    st.pulseAlpha = 1;
    st.shake = 7;
    setEnergy(Math.round(st.energy));
    playTone(260, 0.2, 'triangle', 0.06);
    playTone(920, 0.28, 'sine', 0.07);
    const kept: OrbEntity[] = [];
    for (const e of st.entities) {
      const dist = Math.hypot(e.x - st.px, e.y - st.py);
      if (e.kind === 'shard' && dist < 320) {
        st.score += 20 * st.combo;
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 1.5 + Math.random() * 4.0;
          st.particles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 24,
            maxLife: 24,
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

    const spawnBurst = (x: number, y: number, color: string, count = 12) => {
      const st = gameStateRef.current;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.2 + Math.random() * 3.8;
        st.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 22 + Math.random() * 12,
          maxLife: 34,
          color,
          size: 2 + Math.random() * 2.2,
        });
      }
    };

    const loop = () => {
      const st = gameStateRef.current;
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
          if (st.frame % 6 === 0) setEnergy(Math.round(st.energy));
        }

        const curWave = 1 + Math.floor(st.score / 320);
        if (st.frame % 15 === 0) setWave(curWave);

        // Relaxed, enjoyable spawn curve: more photons/fusion, slower & rarer red shards
        st.spawnTick++;
        const spawnEvery = Math.max(24, 48 - curWave * 2);
        if (st.spawnTick >= spawnEvery) {
          st.spawnTick = 0;
          const side = Math.floor(Math.random() * 4);
          let sx = 0, sy = 0;
          if (side === 0) { sx = Math.random() * W; sy = -20; }
          else if (side === 1) { sx = W + 20; sy = Math.random() * H; }
          else if (side === 2) { sx = Math.random() * W; sy = H + 20; }
          else { sx = -20; sy = Math.random() * H; }

          const roll = Math.random();
          const kind: OrbEntity['kind'] = roll < 0.56 ? 'photon' : roll < 0.72 ? 'fusion' : 'shard';
          // Shards aim loosely with wide scatter instead of sniping the player directly
          const aimX = kind === 'shard' ? st.px + (Math.random() - 0.5) * 260 : W * 0.2 + Math.random() * W * 0.6;
          const aimY = kind === 'shard' ? st.py + (Math.random() - 0.5) * 260 : H * 0.2 + Math.random() * H * 0.6;
          const ang = Math.atan2(aimY - sy, aimX - sx);
          const spd =
            kind === 'shard'
              ? 1.35 + Math.min(2.2, curWave * 0.20) + Math.random() * 0.85
              : 1.35 + Math.random() * 1.2;

          st.entities.push({
            x: sx,
            y: sy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: kind === 'shard' ? 10 + Math.random() * 3.5 : kind === 'fusion' ? 13 : 10,
            kind,
            hue: kind === 'fusion' ? 188 : 148 + Math.random() * 30,
            spin: Math.random() * Math.PI * 2,
          });
        }

        const nextEntities: OrbEntity[] = [];
        for (const e of st.entities) {
          // Gentle magnetic attraction on friendly orbs when close to the Lithium atom!
          if (e.kind !== 'shard') {
            const dx = st.px - e.x;
            const dy = st.py - e.y;
            const distM = Math.hypot(dx, dy);
            if (distM > 1 && distM < 115) {
              e.vx += (dx / distM) * 0.28;
              e.vy += (dy / distM) * 0.28;
            }
          }

          e.x += e.vx;
          e.y += e.vy;
          e.spin += 0.05;
          if (e.x < -60 || e.x > W + 60 || e.y < -60 || e.y > H + 60) continue;

          const d = Math.hypot(e.x - st.px, e.y - st.py);
          // Generous pickup radius for photons/fusion, forgiving smaller hitbox for shards!
          const hitDist = e.kind === 'shard' ? e.r + 10 : e.r + 24;
          if (d < hitDist) {
            if (e.kind === 'photon' || e.kind === 'fusion') {
              const pts = e.kind === 'fusion' ? 45 : 15;
              st.score += pts * st.combo;
              st.combo = Math.min(9, st.combo + 1);
              st.comboTimer = 240;
              st.energy = Math.min(100, st.energy + (e.kind === 'fusion' ? 38 : 12));
              if (e.kind === 'fusion') {
                st.fusionCount++;
                if (st.lives < 3 && st.fusionCount % 3 === 0) {
                  st.lives++;
                  setLives(st.lives);
                  playTone(1120, 0.22, 'sine', 0.07);
                }
              }
              setScore(st.score);
              setCombo(st.combo);
              setEnergy(Math.round(st.energy));
              spawnBurst(e.x, e.y, e.kind === 'fusion' ? '#67e8f9' : '#34d399', e.kind === 'fusion' ? 18 : 10);
              playTone(e.kind === 'fusion' ? 880 : 540 + st.combo * 38, 0.08, 'sine', 0.05);
              continue;
            } else {
              if (st.invulnFrames > 0) {
                // Shield absorbs impact safely!
                spawnBurst(e.x, e.y, '#67e8f9', 8);
                continue;
              }
              st.lives--;
              setLives(st.lives);
              st.shake = 12;
              if (st.lives > 0) {
                // Shield absorbed the hit! Grant 1.5s invulnerability + protective knockback
                st.invulnFrames = 95;
                st.pulseRadius = 26;
                st.pulseAlpha = 0.85;
                spawnBurst(st.px, st.py, '#fbbf24', 24);
                playTone(220, 0.22, 'triangle', 0.07);
                continue;
              }
              st.over = true;
              setGameOver(true);
              spawnBurst(st.px, st.py, '#fb7185', 32);
              playTone(140, 0.35, 'sawtooth', 0.07);
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
          st.pulseRadius += 16;
          st.pulseAlpha = Math.max(0, st.pulseAlpha - 0.042);
        }
        if (st.shake > 0) st.shake *= 0.86;
      }

      st.particles = st.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
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
        ctx.lineWidth = a * 8;
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
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2;
            ctx.lineTo(Math.cos(ang) * e.r * 1.2, Math.sin(ang) * e.r * 1.2);
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
          ctx.beginPath();
          ctx.arc(0, 0, e.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Player Lithium-3 Atom (with visual shield ring during invulnerability)
      if (!st.over) {
        ctx.save();
        ctx.translate(st.px, st.py);
        if (st.invulnFrames > 0) {
          ctx.strokeStyle = `rgba(103, 232, 249, ${0.45 + 0.4 * Math.sin(st.frame * 0.4)})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Inner 1s orbit (2 electrons)
        ctx.strokeStyle = 'rgba(110, 231, 183, 0.48)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Outer 2s valence orbit (1 electron)
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.stroke();

        const t = st.frame * 0.11;
        for (const offset of [0, Math.PI]) {
          const ex = Math.cos(t + offset) * 18;
          const ey = Math.sin(t + offset) * 18;
          ctx.fillStyle = '#6ee7b7';
          ctx.beginPath();
          ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        const vx = Math.cos(-t * 0.72) * 26;
        const vy = Math.sin(-t * 0.72) * 26;
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(vx, vy, 3.6, 0, Math.PI * 2);
        ctx.fill();

        const coreGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 13);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.5, '#6ee7b7');
        coreGrad.addColorStop(1, '#0d9488');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#022c22';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#020a0d]/90 backdrop-blur-xl p-4"
      onClick={(e) => e.stopPropagation()}
    >
      {phase === 'intro' ? (
        <div
          className="relative flex flex-col items-center justify-center w-full max-w-2xl h-[460px] rounded-3xl overflow-hidden border border-white/15 bg-[#031216] shadow-2xl"
          style={{
            backgroundImage: `url("${lithiumHeroImg}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <img
            src={lithiumHeroImg}
            alt="Lithium Awakening"
            loading="eager"
            decoding="sync"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000"
            style={{
              transform: `scale(${1 + introProgress * 0.2})`,
              opacity: 0.45 + introProgress * 0.45,
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
                1.2.3
              </div>
              <div className="text-xl font-bold tracking-[0.28em] text-white uppercase mt-1">
                LUMA LITHIUM
              </div>
              <div className="text-[11px] font-mono text-emerald-200/90 mt-2 tracking-widest">
                ЗАПУСК ОРБИТЫ Li-3 · 3 ЩИТА · 3 ЭЛЕКТРОНА...
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
                <div className="text-xs font-extrabold tracking-wide uppercase">LITHIUM ORBIT · Пасхалка 1.2.3</div>
                <div className="text-[10px] font-mono text-zinc-400">
                  Мышь / WASD — полёт · Клик / Пробел — импульс (28%) · 3 щита
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <div
                className="px-2 py-1 rounded-xl bg-white/[0.06] border border-white/10 inline-flex items-center gap-1"
                title="Щиты ядра Li-3 (восстанавливаются каждые 3 голубых сферы)"
              >
                {[0, 1, 2].map((idx) => (
                  <Heart
                    key={idx}
                    className={`w-3.5 h-3.5 transition ${
                      idx < lives ? 'text-rose-400 fill-rose-400' : 'text-zinc-600'
                    }`}
                  />
                ))}
              </div>
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
                disabled={energy < 28 || gameOver}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer"
                title="Импульс (Пробел или Клик — 28% энергии)"
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
