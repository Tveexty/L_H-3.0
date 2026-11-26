import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';

/**
 * OXYGEN PULSE 2.5D — Flagship Zero-Lag 60 FPS Cryo-Orbital Synth Mini-Game for Luma OS 1.7 (Oxygen · O-8).
 * Pure Canvas2D animation loop with zero React re-renders per frame, procedural WebAudio chimes,
 * Oxygen Cryo-Dash shockwaves (Space / Click), combo multipliers, and persistent high score.
 */
export const LumaOxygenPulseGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('luma_oxygen_pulse_best') || 0);
    } catch {
      return 0;
    }
  });
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTone = (freq: number, dur = 0.09, type: OscillatorType = 'sine', gain = 0.08) => {
    if (mutedRef.current) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // ignore audio restrictions
    }
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 820;
    const H = 480;
    canvas.width = W;
    canvas.height = H;

    const player = {
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
      r: 15,
      dashEnergy: 100,
      dashTimer: 0,
      invuln: 1.0,
      hp: 3,
      trail: [] as { x: number; y: number }[],
    };

    const keys = new Set<string>();
    let pointerActive = false;
    let pointerX = W / 2;
    let pointerY = H / 2;

    type Orb = { x: number; y: number; r: number; pulse: number; golden: boolean };
    type Hazard = { x: number; y: number; vx: number; vy: number; r: number; spin: number; frozen: number };
    type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; sz: number };
    type Ring = { x: number; y: number; r: number; maxR: number; alpha: number; col: string };

    const orbs: Orb[] = [];
    const hazards: Hazard[] = [];
    const particles: Particle[] = [];
    const rings: Ring[] = [];

    let curScore = 0;
    let combo = 1;
    let comboTimer = 0;
    let wave = 1;
    let spawnTimer = 0;
    let orbTimer = 0;
    let elapsed = 0;
    let shake = 0;
    let rafId = 0;
    let lastTs = performance.now();

    const spawnBurst = (x: number, y: number, col: string, count = 16) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const sp = 70 + Math.random() * 190;
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45 + Math.random() * 0.25, max: 0.7, col, sz: 2 + Math.random() * 3.5 });
      }
    };

    const spawnOrb = () => {
      orbs.push({
        x: 56 + Math.random() * (W - 112),
        y: 56 + Math.random() * (H - 112),
        r: 10,
        pulse: Math.random() * Math.PI * 2,
        golden: Math.random() < 0.16,
      });
    };

    const spawnHazard = () => {
      const side = Math.floor(Math.random() * 4);
      let x = 0;
      let y = 0;
      if (side === 0) {
        x = Math.random() * W;
        y = -20;
      } else if (side === 1) {
        x = W + 20;
        y = Math.random() * H;
      } else if (side === 2) {
        x = Math.random() * W;
        y = H + 20;
      } else {
        x = -20;
        y = Math.random() * H;
      }
      const ang = Math.atan2(player.y - y, player.x - x) + (Math.random() - 0.5) * 0.45;
      const spd = 95 + wave * 16 + Math.random() * 60;
      hazards.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 11 + Math.random() * 6, spin: Math.random() * 6, frozen: 0 });
    };

    const triggerCryoPulse = () => {
      if (player.dashEnergy < 45) return;
      player.dashEnergy -= 45;
      player.dashTimer = 0.26;
      player.invuln = Math.max(player.invuln, 0.45);
      rings.push({ x: player.x, y: player.y, r: 16, maxR: 185, alpha: 1, col: '#38bdf8' });
      playTone(540, 0.14, 'triangle', 0.12);
      playTone(820, 0.18, 'sine', 0.08);
      // Freeze or shatter nearby hazards into score!
      for (let i = hazards.length - 1; i >= 0; i--) {
        const h = hazards[i];
        const d = Math.hypot(h.x - player.x, h.y - player.y);
        if (d < 175) {
          spawnBurst(h.x, h.y, '#38bdf8', 14);
          hazards.splice(i, 1);
          curScore += 35 * combo;
          combo = Math.min(16, combo + 1);
          comboTimer = 3.2;
        }
      }
    };

    for (let i = 0; i < 4; i++) spawnOrb();

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        triggerCryoPulse();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / rect.width) * W;
      pointerY = ((e.clientY - rect.top) / rect.height) * H;
      pointerActive = true;
    };
    const onMouseDown = () => triggerCryoPulse();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - lastTs) / 1000);
      lastTs = now;
      elapsed += dt;
      wave = 1 + Math.floor(elapsed / 12);

      // Input & smooth elastic velocity
      let ax = 0;
      let ay = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) ay -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) ay += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) ax -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) ax += 1;
      if (ax !== 0 || ay !== 0) {
        pointerActive = false;
        const mag = Math.hypot(ax, ay) || 1;
        player.vx += (ax / mag) * 1450 * dt;
        player.vy += (ay / mag) * 1450 * dt;
      } else if (pointerActive) {
        const dx = pointerX - player.x;
        const dy = pointerY - player.y;
        player.vx += dx * 12 * dt;
        player.vy += dy * 12 * dt;
      }
      const damp = Math.pow(0.0016, dt);
      player.vx *= damp;
      player.vy *= damp;
      const maxSpd = player.dashTimer > 0 ? 520 : 340;
      const spd = Math.hypot(player.vx, player.vy);
      if (spd > maxSpd) {
        player.vx = (player.vx / spd) * maxSpd;
        player.vy = (player.vy / spd) * maxSpd;
      }
      player.x = Math.max(player.r + 8, Math.min(W - player.r - 8, player.x + player.vx * dt));
      player.y = Math.max(player.r + 8, Math.min(H - player.r - 8, player.y + player.vy * dt));
      player.trail.unshift({ x: player.x, y: player.y });
      if (player.trail.length > 14) player.trail.pop();

      player.dashEnergy = Math.min(100, player.dashEnergy + 18 * dt);
      if (player.dashTimer > 0) player.dashTimer -= dt;
      if (player.invuln > 0) player.invuln -= dt;
      if (shake > 0) shake = Math.max(0, shake - 28 * dt);
      if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) combo = 1;
      }

      // Spawners
      orbTimer -= dt;
      if (orbTimer <= 0 && orbs.length < 6) {
        spawnOrb();
        orbTimer = 1.4;
      }
      spawnTimer -= dt;
      if (spawnTimer <= 0 && hazards.length < 18 + wave * 2) {
        spawnHazard();
        spawnTimer = Math.max(0.28, 1.05 - wave * 0.08);
      }

      // Collect Orbs
      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.pulse += dt * 4.5;
        const dist = Math.hypot(o.x - player.x, o.y - player.y);
        if (dist < 85) {
          o.x += ((player.x - o.x) / (dist || 1)) * 220 * dt;
          o.y += ((player.y - o.y) / (dist || 1)) * 220 * dt;
        }
        if (dist < player.r + o.r + 4) {
          orbs.splice(i, 1);
          const pts = (o.golden ? 120 : 25) * combo;
          curScore += pts;
          combo = Math.min(16, combo + 1);
          comboTimer = 3.4;
          player.dashEnergy = Math.min(100, player.dashEnergy + (o.golden ? 40 : 14));
          spawnBurst(o.x, o.y, o.golden ? '#fbbf24' : '#22d3ee', o.golden ? 22 : 12);
          rings.push({ x: o.x, y: o.y, r: 8, maxR: o.golden ? 72 : 44, alpha: 0.9, col: o.golden ? '#fbbf24' : '#22d3ee' });
          playTone(380 + combo * 45, 0.08, 'sine', 0.09);
        }
      }

      // Update Hazards
      for (let i = hazards.length - 1; i >= 0; i--) {
        const h = hazards[i];
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.spin += dt * 3.2;
        if (h.x < -60 || h.x > W + 60 || h.y < -60 || h.y > H + 60) {
          hazards.splice(i, 1);
          continue;
        }
        if (player.invuln <= 0 && Math.hypot(h.x - player.x, h.y - player.y) < player.r + h.r - 3) {
          hazards.splice(i, 1);
          player.hp -= 1;
          player.invuln = 1.25;
          combo = 1;
          shake = 10;
          spawnBurst(player.x, player.y, '#fb7185', 24);
          rings.push({ x: player.x, y: player.y, r: 10, maxR: 120, alpha: 1, col: '#fb7185' });
          playTone(135, 0.22, 'sawtooth', 0.11);
          if (player.hp <= 0) {
            setScore(curScore);
            setBest((prev) => {
              const nextBest = Math.max(prev, curScore);
              try {
                localStorage.setItem('luma_oxygen_pulse_best', String(nextBest));
              } catch {
                // ignore
              }
              return nextBest;
            });
            setPhase('over');
            return;
          }
        }
      }

      // Draw Scene
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

      const bg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
      bg.addColorStop(0, '#09203f');
      bg.addColorStop(0.55, '#040d1d');
      bg.addColorStop(1, '#02050c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Subtle 2.5D Orbital Rings
      ctx.strokeStyle = 'rgba(56,189,248,0.09)';
      ctx.lineWidth = 1;
      for (let rr = 85; rr <= 340; rr += 85) {
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, rr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Expanding Shockwave Rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const rg = rings[i];
        rg.r += (rg.maxR - rg.r) * 8 * dt + 60 * dt;
        rg.alpha -= 2.1 * dt;
        if (rg.alpha <= 0) {
          rings.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = rg.col;
        ctx.globalAlpha = Math.max(0, rg.alpha);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, pt.life / pt.max);
        ctx.fillStyle = pt.col;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.sz, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw O₂ Cryo-Orbs (2.5D glowing glass spheres)
      for (const o of orbs) {
        const r = o.r + Math.sin(o.pulse) * 2;
        const g = ctx.createRadialGradient(o.x - 3, o.y - 3, 1, o.x, o.y, r + 6);
        if (o.golden) {
          g.addColorStop(0, '#fef08a');
          g.addColorStop(0.55, '#f59e0b');
          g.addColorStop(1, 'rgba(245,158,11,0)');
        } else {
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.45, '#38bdf8');
          g.addColorStop(1, 'rgba(6,182,212,0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, r + 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Plasma Shards
      for (const h of hazards) {
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.spin);
        ctx.fillStyle = '#fb7185';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2;
          const x1 = Math.cos(a) * h.r;
          const y1 = Math.sin(a) * h.r;
          if (k === 0) ctx.moveTo(x1, y1);
          else ctx.lineTo(x1, y1);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Player Trail
      for (let i = 0; i < player.trail.length; i++) {
        const t = player.trail[i];
        const ratio = 1 - i / player.trail.length;
        ctx.fillStyle = `rgba(56,189,248,${ratio * 0.28})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, player.r * ratio * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Player 2.5D Oxygen Sphere
      const pg = ctx.createRadialGradient(player.x - 5, player.y - 5, 2, player.x, player.y, player.r + 4);
      pg.addColorStop(0, '#ffffff');
      pg.addColorStop(0.4, '#7dd3fc');
      pg.addColorStop(0.8, '#0284c7');
      pg.addColorStop(1, 'rgba(2,132,199,0)');
      ctx.globalAlpha = player.invuln > 0 && Math.floor(elapsed * 18) % 2 === 0 ? 0.45 : 1;
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Crisp Canvas HUD (zero React reflows!)
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 15px Consolas, monospace';
      ctx.fillText(`O₂ SCORE: ${curScore}   ×${combo}   WAVE ${wave}`, 18, 28);
      ctx.fillStyle = '#fb7185';
      ctx.fillText('♥'.repeat(Math.max(0, player.hp)), W - 78, 28);

      // Cryo-Pulse Charge Bar
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(18, H - 22, 160, 8);
      ctx.fillStyle = player.dashEnergy >= 45 ? '#22d3ee' : '#64748b';
      ctx.fillRect(18, H - 22, (player.dashEnergy / 100) * 160, 8);
      ctx.fillStyle = 'rgba(224,242,254,0.85)';
      ctx.font = 'bold 11px Segoe UI, sans-serif';
      ctx.fillText('SPACE / КЛИК — CRYO PULSE', 188, H - 14);

      ctx.restore();
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
    };
  }, [phase]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold inline-flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Oxygen Pulse 2.5D · 60 FPS
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono font-bold inline-flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" /> Рекорд: {best}
          </span>
        </div>
        <button
          onClick={() => setMuted((m) => !m)}
          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white inline-flex items-center gap-1 cursor-pointer"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {muted ? 'Без звука' : 'Звук ВКЛ'}
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-cyan-400/30 bg-[#02050c] aspect-[820/480] w-full">
        <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

        {phase !== 'playing' && (
          <div className="absolute inset-0 bg-[#030917]/82 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 bg-clip-text text-transparent">
              {phase === 'over' ? `ИГРА ОКОНЧЕНА · СЧЁТ: ${score}` : 'OXYGEN PULSE · O₂ REACTOR'}
            </div>
            <p className="text-xs text-sky-100/75 max-w-md">
              Управляйте сферой <b>мышью</b> или <b>WASD / стрелками</b>. Собирайте сферы кислорода O₂ для комбо до ×16, уклоняйтесь от красных осколков и жмите <b>Пробел / Клик</b> для ледяной ударной волны!
            </p>
            <button
              onClick={() => {
                setScore(0);
                setPhase('playing');
              }}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 font-black text-sm inline-flex items-center gap-2 shadow-xl shadow-cyan-500/30 hover:scale-105 transition cursor-pointer"
            >
              {phase === 'over' ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {phase === 'over' ? 'Сыграть ещё раз' : 'Запустить Oxygen Pulse'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
