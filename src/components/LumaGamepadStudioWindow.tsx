import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Gamepad2, Sliders, Palette, Vibrate, MousePointer2, Plus, Trash2, Save,
  RefreshCw, Gauge, BatteryCharging, Sparkles, Activity, CheckCircle2, Play, Square,
} from 'lucide-react';

export interface GamepadProfile {
  id: string;
  name: string;
  description: string;
  left_deadzone: number;
  right_deadzone: number;
  anti_deadzone: number;
  stick_curve: 'linear' | 'precision' | 'aggressive' | 's_curve' | 'quadratic' | string;
  trigger_deadzone: number;
  trigger_curve: 'linear' | 'hair_trigger' | 'smooth' | string;
  lightbar_hex: string;
  lightbar_mode: 'static' | 'battery' | 'rainbow' | 'off' | string;
  lightbar_brightness: number;
  rumble_strength: number;
  polling_rate_hz: number;
  mouse_emulation: boolean;
  mouse_sensitivity: number;
  invert_y: boolean;
  bindings: Record<string, string>;
  built_in?: boolean;
}

export interface GamepadControllerState {
  index: number;
  id: string;
  name: string;
  kind: 'ds4' | 'dualsense' | 'xbox' | 'hid' | string;
  transport: string;
  connected: boolean;
  battery_pct: number;
  vendor_id?: string;
  product_id?: string;
  supports_rgb: boolean;
  supports_rumble: boolean;
  lx: number;
  ly: number;
  rx: number;
  ry: number;
  lt: number;
  rt: number;
  buttons: number;
  pressed_names: string[];
}

interface LiveAxisState {
  lx: number;
  ly: number;
  rx: number;
  ry: number;
  lt: number;
  rt: number;
  pressed: Set<string>;
  kind: 'dualsense' | 'ds4' | 'xbox' | 'hid';
  name: string;
  transport: string;
  battery: number;
  connected: boolean;
}

interface LumaGamepadStudioWindowProps {
  kernelBase: string;
  isDarkTheme: boolean;
  onNotify?: (title: string, message: string) => void;
}

const DEFAULT_PROFILE: GamepadProfile = {
  id: 'default_balanced',
  name: 'Стандарт (Баланс)',
  description: 'Универсальный профиль для DualSense, DualShock 4 и Xbox',
  left_deadzone: 0.08,
  right_deadzone: 0.08,
  anti_deadzone: 0.02,
  stick_curve: 'linear',
  trigger_deadzone: 0.05,
  trigger_curve: 'linear',
  lightbar_hex: '#38bdf8',
  lightbar_mode: 'static',
  lightbar_brightness: 85,
  rumble_strength: 100,
  polling_rate_hz: 500,
  mouse_emulation: false,
  mouse_sensitivity: 1.2,
  invert_y: false,
  bindings: {
    A: 'LMB', B: 'RMB', X: 'KEY_SPACE', Y: 'KEY_ENTER',
    LB: 'BROWSER_BACK', RB: 'MMB', START: 'ALT_TAB', BACK: 'KEY_ESC',
  },
  built_in: true,
};

const LIGHTBAR_SWATCHES = ['#38bdf8', '#a855f7', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#ffffff'];
const BINDING_ACTIONS = [
  'LMB', 'RMB', 'MMB', 'KEY_SPACE', 'KEY_ENTER', 'KEY_ESC', 'KEY_TAB', 'ALT_TAB',
  'KEY_SHIFT', 'KEY_CTRL', 'KEY_Q', 'KEY_E', 'KEY_R', 'KEY_C',
  'BROWSER_BACK', 'VOLUME_UP', 'VOLUME_DOWN',
];
const BUTTON_KEYS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'START', 'BACK'];

function applyStickCurveClient(raw: number, dz: number, antiDz: number, curve: string): number {
  const mag = Math.abs(raw);
  if (mag <= dz) return 0;
  const sign = raw < 0 ? -1 : 1;
  const norm = Math.min(1, (mag - dz) / Math.max(0.01, 1 - dz));
  let shaped = norm;
  if (curve === 'precision' || curve === 'quadratic') shaped = norm * norm;
  else if (curve === 'aggressive') shaped = Math.pow(norm, 0.65);
  else if (curve === 's_curve') shaped = norm * norm * (3 - 2 * norm);
  if (antiDz > 0 && shaped > 0) shaped = Math.min(1, antiDz + shaped * (1 - antiDz));
  return sign * shaped;
}

function detectBrowserKind(id: string): 'dualsense' | 'ds4' | 'xbox' | 'hid' {
  const low = (id || '').toLowerCase();
  if (low.includes('dualsense') || low.includes('0ce6') || low.includes('0df2')) return 'dualsense';
  if (low.includes('dualshock') || low.includes('05c4') || low.includes('09cc') || low.includes('wireless controller')) return 'ds4';
  if (low.includes('xbox') || low.includes('xinput') || low.includes('045e')) return 'xbox';
  return 'hid';
}

const WEB_GAMEPAD_BTN_NAMES = [
  'A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT',
  'BACK', 'START', 'LS', 'RS', 'DPAD_UP', 'DPAD_DOWN', 'DPAD_LEFT', 'DPAD_RIGHT', 'GUIDE',
];

export const LumaGamepadStudioWindow: React.FC<LumaGamepadStudioWindowProps> = ({
  kernelBase, isDarkTheme, onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'visualizer' | 'sticks' | 'lightbar' | 'emulation'>('visualizer');
  const [profiles, setProfiles] = useState<GamepadProfile[]>([DEFAULT_PROFILE]);
  const [activeProfileId, setActiveProfileId] = useState<string>('default_balanced');
  const [draft, setDraft] = useState<GamepadProfile>(DEFAULT_PROFILE);
  const [emulationActive, setEmulationActive] = useState(false);
  const [nativeControllers, setNativeControllers] = useState<GamepadControllerState[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [skinOverride, setSkinOverride] = useState<'auto' | 'dualsense' | 'ds4' | 'xbox'>('auto');
  const [demoSim, setDemoSim] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [fpsDisplay, setFpsDisplay] = useState(60);
  const [rumbleLeft, setRumbleLeft] = useState(180);
  const [rumbleRight, setRumbleRight] = useState(140);
  const [rumbleDuration, setRumbleDuration] = useState(450);

  const [live, setLive] = useState<LiveAxisState>({
    lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0,
    pressed: new Set(), kind: 'dualsense', name: 'Ожидание контроллера…',
    transport: 'USB / Bluetooth / XInput', battery: -1, connected: false,
  });

  const nativeRef = useRef<GamepadControllerState[]>([]);
  const demoRef = useRef(demoSim);
  const selectedIdxRef = useRef(selectedIdx);
  demoRef.current = demoSim;
  selectedIdxRef.current = selectedIdx;

  // Initial load of profiles & backend snapshot
  const fetchSnapshot = async (syncDraft = false) => {
    try {
      const r = await fetch(`${kernelBase}/api/kernel/gamepad/state`);
      if (!r.ok) return;
      const d = await r.json();
      const ctrls: GamepadControllerState[] = Array.isArray(d.controllers) ? d.controllers : [];
      nativeRef.current = ctrls;
      setNativeControllers(ctrls);
      if (Array.isArray(d.profiles) && d.profiles.length > 0) {
        setProfiles(d.profiles);
      }
      if (typeof d.active_profile_id === 'string') {
        setActiveProfileId(d.active_profile_id);
      }
      if (typeof d.emulation_active === 'boolean') {
        setEmulationActive(d.emulation_active);
      }
      if (syncDraft && d.active_profile) {
        setDraft({ ...DEFAULT_PROFILE, ...d.active_profile, bindings: { ...DEFAULT_PROFILE.bindings, ...(d.active_profile.bindings || {}) } });
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchSnapshot(true);
    const t = window.setInterval(() => fetchSnapshot(false), 1200);
    return () => window.clearInterval(t);
  }, [kernelBase]);

  // 60 FPS Live Visualizer loop combining Web Gamepad API + Native XInput/HID + Demo Simulator
  useEffect(() => {
    let rafId = 0;
    let frames = 0;
    let lastFpsAt = performance.now();

    const tick = (now: number) => {
      frames++;
      if (now - lastFpsAt >= 500) {
        setFpsDisplay(Math.min(144, Math.round((frames * 1000) / Math.max(1, now - lastFpsAt))));
        frames = 0;
        lastFpsAt = now;
      }

      const webPads = typeof navigator !== 'undefined' && navigator.getGamepads
        ? Array.from(navigator.getGamepads()).filter((g): g is Gamepad => Boolean(g && g.connected))
        : [];
      const idx = selectedIdxRef.current;
      const nativePad = nativeRef.current[idx] || nativeRef.current[0];
      const webPad = webPads[idx] || webPads[0];

      if (demoRef.current) {
        const t = now / 1000;
        const pressed = new Set<string>();
        const phase = Math.floor(t * 2) % 8;
        const seq = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'DPAD_UP', 'DPAD_RIGHT'];
        pressed.add(seq[phase]);
        setLive({
          lx: Math.sin(t * 1.9) * 0.86,
          ly: Math.cos(t * 1.4) * 0.78,
          rx: Math.cos(t * 2.3) * 0.82,
          ry: Math.sin(t * 1.7) * 0.72,
          lt: (Math.sin(t * 2.1) + 1) * 0.5,
          rt: (Math.cos(t * 2.5) + 1) * 0.5,
          pressed,
          kind: 'dualsense',
          name: 'DualSense Wireless Controller (Демо-симуляция 60 FPS)',
          transport: 'Virtual HID · 1000 Гц',
          battery: 92,
          connected: true,
        });
      } else if (webPad) {
        const pressed = new Set<string>();
        webPad.buttons.forEach((b, bi) => {
          if (b.pressed && WEB_GAMEPAD_BTN_NAMES[bi]) pressed.add(WEB_GAMEPAD_BTN_NAMES[bi]);
        });
        const lt = webPad.buttons[6]?.value ?? 0;
        const rt = webPad.buttons[7]?.value ?? 0;
        setLive({
          lx: webPad.axes[0] ?? 0,
          ly: webPad.axes[1] ?? 0,
          rx: webPad.axes[2] ?? 0,
          ry: webPad.axes[3] ?? 0,
          lt, rt,
          pressed,
          kind: (nativePad?.kind as LiveAxisState['kind']) || detectBrowserKind(webPad.id),
          name: nativePad?.name || webPad.id || 'HID Controller',
          transport: nativePad?.transport || 'Web Gamepad / HID',
          battery: nativePad?.battery_pct ?? -1,
          connected: true,
        });
      } else if (nativePad && nativePad.connected) {
        setLive({
          lx: nativePad.lx,
          ly: nativePad.ly,
          rx: nativePad.rx,
          ry: nativePad.ry,
          lt: nativePad.lt,
          rt: nativePad.rt,
          pressed: new Set(nativePad.pressed_names || []),
          kind: (nativePad.kind as LiveAxisState['kind']) || 'xbox',
          name: nativePad.name,
          transport: nativePad.transport,
          battery: nativePad.battery_pct,
          connected: true,
        });
      } else {
        setLive((prev) => prev.connected ? {
          lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0,
          pressed: new Set(), kind: 'dualsense', name: 'Контроллер не обнаружен (подключите по USB/Bluetooth)',
          transport: 'XInput / USB HID / BT', battery: -1, connected: false,
        } : prev);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const effectiveSkin = skinOverride === 'auto'
    ? (live.kind === 'hid' ? 'dualsense' : live.kind)
    : skinOverride;

  const shapedLX = applyStickCurveClient(live.lx, draft.left_deadzone, draft.anti_deadzone, draft.stick_curve);
  const shapedLY = applyStickCurveClient(draft.invert_y ? -live.ly : live.ly, draft.left_deadzone, draft.anti_deadzone, draft.stick_curve);
  const shapedRX = applyStickCurveClient(live.rx, draft.right_deadzone, draft.anti_deadzone, draft.stick_curve);
  const shapedRY = applyStickCurveClient(draft.invert_y ? -live.ry : live.ry, draft.right_deadzone, draft.anti_deadzone, draft.stick_curve);

  const curvePathPoints = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = i / 40;
      const y = applyStickCurveClient(x, draft.left_deadzone, draft.anti_deadzone, draft.stick_curve);
      pts.push(`${(14 + x * 132).toFixed(1)},${(116 - y * 102).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [draft.left_deadzone, draft.anti_deadzone, draft.stick_curve]);

  const handleSelectProfile = async (id: string) => {
    const found = profiles.find((p) => p.id === id);
    if (found) {
      setActiveProfileId(id);
      setDraft({ ...DEFAULT_PROFILE, ...found, bindings: { ...DEFAULT_PROFILE.bindings, ...(found.bindings || {}) } });
    }
    try {
      const r = await fetch(`${kernelBase}/api/kernel/gamepad/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', id }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.profiles)) setProfiles(d.profiles);
        setStatusMsg(`Профиль «${found?.name || id}» активирован`);
      }
    } catch { /* ignore */ }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${kernelBase}/api/kernel/gamepad/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', activate: true, profile: draft }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.profiles)) setProfiles(d.profiles);
        if (d.active_profile_id) setActiveProfileId(d.active_profile_id);
        setStatusMsg(`Профиль «${draft.name}» сохранён`);
        onNotify?.('Luma Gamepad Studio', `Профиль «${draft.name}» применён (${draft.polling_rate_hz} Гц).`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProfile = () => {
    const custom: GamepadProfile = {
      ...draft,
      id: `custom_${Date.now()}`,
      name: `Мой профиль ${profiles.length + 1}`,
      description: 'Пользовательский профиль Luma Gamepad Studio',
      built_in: false,
    };
    setDraft(custom);
    setStatusMsg('Создан черновик нового профиля — нажмите «Сохранить»');
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      const r = await fetch(`${kernelBase}/api/kernel/gamepad/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.profiles)) setProfiles(d.profiles);
        if (d.active_profile) setDraft(d.active_profile);
        if (d.active_profile_id) setActiveProfileId(d.active_profile_id);
        setStatusMsg('Профиль удалён');
      }
    } catch { /* ignore */ }
  };

  const handleApplyLightbar = async (hex: string, brightness = draft.lightbar_brightness) => {
    setDraft((p) => ({ ...p, lightbar_hex: hex, lightbar_brightness: brightness }));
    try {
      const r = await fetch(`${kernelBase}/api/kernel/gamepad/lightbar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: selectedIdx, hex, brightness }),
      });
      if (r.ok) {
        const d = await r.json();
        setStatusMsg(d.message || `Lightbar обновлён: ${hex}`);
      }
    } catch { /* ignore */ }
  };

  const handleTestRumble = async (left = rumbleLeft, right = rumbleRight, dur = rumbleDuration) => {
    // Also vibrate via Web Gamepad API if supported
    try {
      const gp = navigator.getGamepads?.()[selectedIdx];
      const actuator = (gp as unknown as { vibrationActuator?: { playEffect?: (t: string, o: Record<string, number>) => Promise<void> } })?.vibrationActuator;
      if (actuator?.playEffect) {
        void actuator.playEffect('dual-rumble', {
          duration: dur,
          strongMagnitude: left / 255,
          weakMagnitude: right / 255,
        });
      }
    } catch { /* ignore */ }

    try {
      const r = await fetch(`${kernelBase}/api/kernel/gamepad/rumble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: selectedIdx, left, right, duration_ms: dur }),
      });
      if (r.ok) {
        const d = await r.json();
        setStatusMsg(d.message || `Тест вибрации L:${left} / R:${right} (${dur} мс)`);
      }
    } catch { /* ignore */ }
  };

  const handleToggleEmulation = async (next: boolean) => {
    setEmulationActive(next);
    setDraft((p) => ({ ...p, mouse_emulation: next }));
    try {
      const r = await fetch(`${kernelBase}/api/kernel/gamepad/emulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (r.ok) {
        const d = await r.json();
        setStatusMsg(d.message || (next ? 'Эмуляция мыши и клавиатуры включена' : 'Эмуляция отключена'));
      }
    } catch { /* ignore */ }
  };

  const isPressed = (btn: string) => live.pressed.has(btn);
  const lightColor = draft.lightbar_mode === 'off'
    ? '#334155'
    : draft.lightbar_mode === 'battery'
      ? (live.battery > 50 ? '#10b981' : live.battery > 20 ? '#f59e0b' : '#ef4444')
      : draft.lightbar_hex;

  const faceLabels = effectiveSkin === 'xbox'
    ? { A: 'A', B: 'B', X: 'X', Y: 'Y' }
    : { A: '✕', B: '○', X: '□', Y: '△' };

  const cardBg = isDarkTheme ? 'bg-slate-900/75 border-white/10' : 'bg-white border-slate-200';
  const mutedText = isDarkTheme ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDarkTheme ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Studio Header */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${isDarkTheme ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight">Luma Gamepad Studio</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-400/30">
                DS4 · DualSense · XInput · HID
              </span>
            </div>
            <div className={`text-[11px] flex items-center gap-2 ${mutedText}`}>
              <span className={`inline-flex items-center gap-1 font-semibold ${live.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${live.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {live.name}
              </span>
              <span>· {live.transport}</span>
              {live.battery >= 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <BatteryCharging className="w-3 h-3" /> {live.battery}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/25 text-emerald-400 text-[11px] font-mono font-bold">
            {fpsDisplay} FPS · {draft.polling_rate_hz} Гц ({(1000 / Math.max(1, draft.polling_rate_hz)).toFixed(1)} мс)
          </span>
          <button
            onClick={() => setDemoSim((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-colors ${
              demoSim
                ? 'bg-violet-500/20 border-violet-400/50 text-violet-300'
                : isDarkTheme ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Включить виртуальный сигнал контроллера 60 FPS для проверки осей и кривых"
          >
            {demoSim ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {demoSim ? 'Стоп демо' : 'Демо-сигнал'}
          </button>
          <button
            onClick={() => fetchSnapshot(false)}
            className={`p-1.5 rounded-lg border transition-colors ${isDarkTheme ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
            title="Пересканировать контроллеры"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Profiles Sidebar + Right Studio Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Sidebar: Profiles & Connected Pads */}
        <div className={`w-56 shrink-0 border-r p-3 flex flex-col gap-3 overflow-y-auto ${isDarkTheme ? 'border-white/10 bg-slate-900/45' : 'border-slate-200 bg-white/80'}`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>Профили ({profiles.length})</span>
              <button
                onClick={handleCreateProfile}
                className="p-1 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-400"
                title="Новый профиль"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {profiles.map((p) => {
                const active = p.id === activeProfileId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProfile(p.id)}
                    className={`p-2 rounded-xl border cursor-pointer transition-all ${
                      active
                        ? 'bg-sky-500/15 border-sky-400/50 shadow-sm'
                        : isDarkTheme ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.lightbar_hex }} />
                        <span className="text-xs font-bold truncate">{p.name}</span>
                      </div>
                      {!p.built_in && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProfile(p.id); }}
                          className="p-0.5 text-rose-400 hover:bg-rose-500/15 rounded"
                          title="Удалить профиль"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className={`text-[10px] mt-0.5 flex items-center justify-between ${mutedText}`}>
                      <span>{p.polling_rate_hz} Гц · {p.stick_curve}</span>
                      {p.mouse_emulation && <span className="text-violet-400 font-bold">Мышь</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`pt-2 border-t ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
            <div className={`text-[10px] font-black uppercase tracking-wider mb-1.5 ${mutedText}`}>
              Подключённые устройства ({nativeControllers.length})
            </div>
            {nativeControllers.length === 0 ? (
              <div className={`text-[11px] p-2 rounded-lg border border-dashed ${isDarkTheme ? 'border-white/15 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                Подключите DualSense, DS4 или Xbox геймпад — определится автоматически, или нажмите «Демо-сигнал».
              </div>
            ) : (
              <div className="space-y-1">
                {nativeControllers.map((c, idx) => (
                  <button
                    key={c.id || idx}
                    onClick={() => setSelectedIdx(idx)}
                    className={`w-full text-left p-2 rounded-lg border text-[11px] transition-colors ${
                      selectedIdx === idx ? 'bg-emerald-500/15 border-emerald-400/40' : isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="font-bold truncate">{c.name}</div>
                    <div className={mutedText}>{c.kind.toUpperCase()} · {c.transport}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-auto pt-2 space-y-2">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Сохранение…' : 'Сохранить профиль'}
            </button>
            {statusMsg && (
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 leading-tight">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Main Studio Workspace */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className={`px-4 pt-2.5 pb-2 border-b flex items-center justify-between gap-2 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'visualizer', label: '60 FPS Визуализатор', icon: Activity },
                { id: 'sticks', label: 'Стики, Кривые & Триггеры', icon: Sliders },
                { id: 'lightbar', label: 'RGB Lightbar & Вибрация', icon: Palette },
                { id: 'emulation', label: 'Мышь & Клавиатура', icon: MousePointer2 },
              ].map((t) => {
                const Icon = t.icon;
                const on = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as typeof activeTab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      on
                        ? 'bg-sky-500 text-white shadow-sm'
                        : isDarkTheme ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 text-[10px]">
              {(['auto', 'dualsense', 'ds4', 'xbox'] as const).map((sk) => (
                <button
                  key={sk}
                  onClick={() => setSkinOverride(sk)}
                  className={`px-2 py-1 rounded-md font-bold uppercase ${
                    skinOverride === sk
                      ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/40'
                      : isDarkTheme ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {sk === 'auto' ? 'Авто' : sk}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Panels */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'visualizer' && (
              <>
                <div className={`rounded-2xl border p-4 ${cardBg}`}>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Interactive Live SVG Gamepad */}
                    <div className="lg:col-span-7 flex flex-col items-center">
                      <svg viewBox="0 0 420 250" className="w-full max-w-[440px] drop-shadow-2xl select-none">
                        {/* Trigger Bars L2 / R2 */}
                        <rect x="64" y="14" width="76" height="14" rx="7" fill="#1e293b" stroke="#334155" />
                        <rect x="64" y="14" width={Math.max(4, live.lt * 76)} height="14" rx="7" fill="#38bdf8" />
                        <text x="102" y="24" textAnchor="middle" fontSize="9" fill="#e2e8f0" fontWeight="bold">
                          {effectiveSkin === 'xbox' ? 'LT' : 'L2'} {Math.round(live.lt * 100)}%
                        </text>

                        <rect x="280" y="14" width="76" height="14" rx="7" fill="#1e293b" stroke="#334155" />
                        <rect x="280" y="14" width={Math.max(4, live.rt * 76)} height="14" rx="7" fill="#a855f7" />
                        <text x="318" y="24" textAnchor="middle" fontSize="9" fill="#e2e8f0" fontWeight="bold">
                          {effectiveSkin === 'xbox' ? 'RT' : 'R2'} {Math.round(live.rt * 100)}%
                        </text>

                        {/* Bumpers L1 / R1 */}
                        <rect x="68" y="34" width="68" height="14" rx="6" fill={isPressed('LB') ? '#38bdf8' : '#334155'} />
                        <text x="102" y="44" textAnchor="middle" fontSize="8.5" fill="#fff" fontWeight="bold">
                          {effectiveSkin === 'xbox' ? 'LB' : 'L1'}
                        </text>
                        <rect x="284" y="34" width="68" height="14" rx="6" fill={isPressed('RB') ? '#38bdf8' : '#334155'} />
                        <text x="318" y="44" textAnchor="middle" fontSize="8.5" fill="#fff" fontWeight="bold">
                          {effectiveSkin === 'xbox' ? 'RB' : 'R1'}
                        </text>

                        {/* Controller Silhouette */}
                        <path
                          d="M84,50 L336,50 C366,50 386,74 394,116 L406,184 C412,216 392,236 368,232 C348,228 332,202 316,180 L282,174 L138,174 L104,180 C88,202 72,228 52,232 C28,236 8,216 14,184 L26,116 C34,74 54,50 84,50 Z"
                          fill={effectiveSkin === 'dualsense' ? '#e2e8f0' : '#1e293b'}
                          stroke={effectiveSkin === 'dualsense' ? '#94a3b8' : '#475569'}
                          strokeWidth="2.5"
                        />
                        {/* DualSense black lower core */}
                        <path
                          d="M128,128 L292,128 L314,178 L280,174 L140,174 L106,178 Z"
                          fill="#0f172a"
                        />

                        {/* Touchpad + Glowing RGB Lightbar */}
                        <rect
                          x="154" y="58" width="112" height="54" rx="10"
                          fill="#0f172a"
                          stroke={lightColor}
                          strokeWidth="3"
                          style={{ filter: `drop-shadow(0 0 8px ${lightColor})` }}
                        />
                        <text x="210" y="88" textAnchor="middle" fontSize="10" fill={lightColor} fontWeight="bold" letterSpacing="1">
                          {effectiveSkin.toUpperCase()}
                        </text>

                        {/* Share / Options */}
                        <rect x="132" y="68" width="12" height="20" rx="5" fill={isPressed('BACK') ? '#38bdf8' : '#475569'} />
                        <rect x="276" y="68" width="12" height="20" rx="5" fill={isPressed('START') ? '#38bdf8' : '#475569'} />

                        {/* D-Pad */}
                        <g transform="translate(96, 108)">
                          <rect x="-10" y="-30" width="20" height="20" rx="4" fill={isPressed('DPAD_UP') ? '#38bdf8' : '#334155'} />
                          <rect x="-10" y="10" width="20" height="20" rx="4" fill={isPressed('DPAD_DOWN') ? '#38bdf8' : '#334155'} />
                          <rect x="-30" y="-10" width="20" height="20" rx="4" fill={isPressed('DPAD_LEFT') ? '#38bdf8' : '#334155'} />
                          <rect x="10" y="-10" width="20" height="20" rx="4" fill={isPressed('DPAD_RIGHT') ? '#38bdf8' : '#334155'} />
                          <circle cx="0" cy="0" r="8" fill="#1e293b" />
                        </g>

                        {/* Face Buttons */}
                        <g transform="translate(324, 108)">
                          <circle cx="0" cy="-22" r="13" fill={isPressed('Y') ? '#10b981' : '#334155'} />
                          <text x="0" y="-18" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="bold">{faceLabels.Y}</text>
                          <circle cx="22" cy="0" r="13" fill={isPressed('B') ? '#ef4444' : '#334155'} />
                          <text x="22" y="4" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="bold">{faceLabels.B}</text>
                          <circle cx="0" cy="22" r="13" fill={isPressed('A') ? '#38bdf8' : '#334155'} />
                          <text x="0" y="26" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="bold">{faceLabels.A}</text>
                          <circle cx="-22" cy="0" r="13" fill={isPressed('X') ? '#ec4899' : '#334155'} />
                          <text x="-22" y="4" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="bold">{faceLabels.X}</text>
                        </g>

                        {/* Left Stick */}
                        <g transform="translate(158, 150)">
                          <circle cx="0" cy="0" r="24" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                          <circle cx="0" cy="0" r={draft.left_deadzone * 24} fill="none" stroke="#f59e0b" strokeDasharray="2 2" strokeOpacity="0.8" />
                          <circle cx={shapedLX * 14} cy={shapedLY * 14} r="14" fill={isPressed('LS') ? '#38bdf8' : '#334155'} stroke="#94a3b8" strokeWidth="1.5" />
                        </g>

                        {/* Right Stick */}
                        <g transform="translate(262, 150)">
                          <circle cx="0" cy="0" r="24" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                          <circle cx="0" cy="0" r={draft.right_deadzone * 24} fill="none" stroke="#f59e0b" strokeDasharray="2 2" strokeOpacity="0.8" />
                          <circle cx={shapedRX * 14} cy={shapedRY * 14} r="14" fill={isPressed('RS') ? '#a855f7' : '#334155'} stroke="#94a3b8" strokeWidth="1.5" />
                        </g>
                      </svg>
                    </div>

                    {/* Precision Stick Radars & Telemetry */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Левый стик (LS)', rawX: live.lx, rawY: live.ly, outX: shapedLX, outY: shapedLY, dz: draft.left_deadzone, color: '#38bdf8' },
                          { label: 'Правый стик (RS)', rawX: live.rx, rawY: live.ry, outX: shapedRX, outY: shapedRY, dz: draft.right_deadzone, color: '#a855f7' },
                        ].map((s) => (
                          <div key={s.label} className={`p-2.5 rounded-xl border flex flex-col items-center ${isDarkTheme ? 'bg-slate-950/70 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                            <span className="text-[10px] font-bold mb-1.5">{s.label}</span>
                            <svg viewBox="-50 -50 100 100" className="w-24 h-24">
                              <circle cx="0" cy="0" r="44" fill="none" stroke="#334155" strokeWidth="1" />
                              <line x1="-44" y1="0" x2="44" y2="0" stroke="#334155" strokeDasharray="2 2" />
                              <line x1="0" y1="-44" x2="0" y2="44" stroke="#334155" strokeDasharray="2 2" />
                              <circle cx="0" cy="0" r={s.dz * 44} fill="#f59e0b" fillOpacity="0.16" stroke="#f59e0b" strokeWidth="1" />
                              <circle cx={s.rawX * 42} cy={s.rawY * 42} r="3.5" fill="#94a3b8" opacity="0.5" />
                              <circle cx={s.outX * 42} cy={s.outY * 42} r="5" fill={s.color} />
                            </svg>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">
                              X:{s.outX.toFixed(2)} · Y:{s.outY.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${isDarkTheme ? 'bg-slate-950/60 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className={mutedText}>Частота опроса</span>
                          <div className="flex items-center gap-1">
                            {[125, 250, 500, 1000].map((hz) => (
                              <button
                                key={hz}
                                onClick={() => setDraft((p) => ({ ...p, polling_rate_hz: hz }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  draft.polling_rate_hz === hz ? 'bg-sky-500 text-white' : isDarkTheme ? 'bg-white/5 text-slate-400' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {hz} Гц
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={mutedText}>Нажатые кнопки</span>
                          <span className="font-mono text-[11px] text-sky-400 truncate max-w-[170px]">
                            {live.pressed.size > 0 ? Array.from(live.pressed).join(', ') : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'sticks' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className={`lg:col-span-7 rounded-2xl border p-4 space-y-4 ${cardBg}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-sky-400" /> Мёртвые зоны и кривые отклика
                    </h3>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold w-48 ${isDarkTheme ? 'bg-slate-950 border-white/10' : 'bg-slate-50 border-slate-300'}`}
                      placeholder="Название профиля"
                    />
                  </div>

                  {[
                    { label: 'Мёртвая зона левого стика (LS)', val: draft.left_deadzone, max: 0.45, onChange: (v: number) => setDraft((p) => ({ ...p, left_deadzone: v })) },
                    { label: 'Мёртвая зона правого стика (RS)', val: draft.right_deadzone, max: 0.45, onChange: (v: number) => setDraft((p) => ({ ...p, right_deadzone: v })) },
                    { label: 'Анти-мёртвая зона (Anti-Deadzone)', val: draft.anti_deadzone, max: 0.30, onChange: (v: number) => setDraft((p) => ({ ...p, anti_deadzone: v })) },
                    { label: 'Мёртвая зона курков (L2 / R2)', val: draft.trigger_deadzone, max: 0.40, onChange: (v: number) => setDraft((p) => ({ ...p, trigger_deadzone: v })) },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold">{item.label}</span>
                        <span className="font-mono text-sky-400 font-bold">{Math.round(item.val * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={item.max}
                        step={0.01}
                        value={item.val}
                        onChange={(e) => item.onChange(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>Кривая стиков</label>
                      <select
                        value={draft.stick_curve}
                        onChange={(e) => setDraft((p) => ({ ...p, stick_curve: e.target.value }))}
                        className={`w-full px-2.5 py-2 rounded-xl border text-xs font-semibold ${isDarkTheme ? 'bg-slate-950 border-white/10' : 'bg-slate-50 border-slate-300'}`}
                      >
                        <option value="linear">Линейная (1:1)</option>
                        <option value="precision">Точность (Квадратичная FPS)</option>
                        <option value="aggressive">Агрессивная (Быстрый рывок)</option>
                        <option value="s_curve">S-Кривая (Плавное руление)</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>Кривая триггеров (L2/R2)</label>
                      <select
                        value={draft.trigger_curve}
                        onChange={(e) => setDraft((p) => ({ ...p, trigger_curve: e.target.value }))}
                        className={`w-full px-2.5 py-2 rounded-xl border text-xs font-semibold ${isDarkTheme ? 'bg-slate-950 border-white/10' : 'bg-slate-50 border-slate-300'}`}
                      >
                        <option value="linear">Линейная</option>
                        <option value="hair_trigger">Hair-Trigger (Мгновенный клик)</option>
                        <option value="smooth">Плавный разгон (Гонки)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Live Response Curve Chart */}
                <div className={`lg:col-span-5 rounded-2xl border p-4 flex flex-col justify-between ${cardBg}`}>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Gauge className="w-4 h-4 text-violet-400" /> График отклика стика
                    </h4>
                    <svg viewBox="0 0 160 130" className="w-full h-48 rounded-xl bg-slate-950/80 border border-white/10">
                      <line x1="14" y1="116" x2="146" y2="14" stroke="#334155" strokeDasharray="3 3" />
                      <rect x="14" y="14" width={draft.left_deadzone * 132} height="102" fill="#f59e0b" fillOpacity="0.14" />
                      <polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" points={curvePathPoints} />
                      <text x="16" y="126" fontSize="7" fill="#94a3b8">Вход 0%</text>
                      <text x="122" y="126" fontSize="7" fill="#94a3b8">100%</text>
                    </svg>
                  </div>
                  <label className="mt-3 flex items-center justify-between text-xs font-semibold cursor-pointer p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span>Инвертировать ось Y</span>
                    <input
                      type="checkbox"
                      checked={draft.invert_y}
                      onChange={(e) => setDraft((p) => ({ ...p, invert_y: e.target.checked }))}
                      className="accent-sky-500 w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'lightbar' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* RGB Lightbar Card */}
                <div className={`rounded-2xl border p-4 space-y-4 ${cardBg}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-sky-400" /> RGB Lightbar (DualShock 4 / DualSense)
                    </h3>
                    <div
                      className="w-10 h-4 rounded-full border border-white/25"
                      style={{ background: lightColor, boxShadow: `0 0 14px ${lightColor}` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {LIGHTBAR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => handleApplyLightbar(hex)}
                        className={`w-8 h-8 rounded-xl border-2 transition-transform hover:scale-110 ${
                          draft.lightbar_hex.toLowerCase() === hex ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ background: hex, boxShadow: `0 0 10px ${hex}66` }}
                      />
                    ))}
                    <input
                      type="color"
                      value={draft.lightbar_hex}
                      onChange={(e) => handleApplyLightbar(e.target.value)}
                      className="w-9 h-8 rounded-lg cursor-pointer bg-transparent"
                      title="Произвольный цвет RGB"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold">Яркость светодиода</span>
                      <span className="font-mono text-sky-400 font-bold">{draft.lightbar_brightness}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={draft.lightbar_brightness}
                      onChange={(e) => handleApplyLightbar(draft.lightbar_hex, Number(e.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'static', label: 'Статика' },
                      { id: 'battery', label: 'Батарея' },
                      { id: 'rainbow', label: 'Радуга' },
                      { id: 'off', label: 'Выкл' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setDraft((p) => ({ ...p, lightbar_mode: m.id }))}
                        className={`py-1.5 rounded-lg text-xs font-bold border ${
                          draft.lightbar_mode === m.id ? 'bg-sky-500 text-white border-sky-400' : isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vibration / Rumble Tester */}
                <div className={`rounded-2xl border p-4 space-y-4 ${cardBg}`}>
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Vibrate className="w-4 h-4 text-violet-400" /> Тест моторов вибрации (Dual Rumble)
                  </h3>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Тяжёлый мотор (Левый · Низкие частоты)</span>
                      <span className="font-mono font-bold text-violet-400">{Math.round((rumbleLeft / 255) * 100)}%</span>
                    </div>
                    <input type="range" min={0} max={255} value={rumbleLeft} onChange={(e) => setRumbleLeft(Number(e.target.value))} className="w-full accent-violet-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Лёгкий мотор (Правый · Высокие частоты)</span>
                      <span className="font-mono font-bold text-sky-400">{Math.round((rumbleRight / 255) * 100)}%</span>
                    </div>
                    <input type="range" min={0} max={255} value={rumbleRight} onChange={(e) => setRumbleRight(Number(e.target.value))} className="w-full accent-sky-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Длительность импульса</span>
                      <span className="font-mono font-bold">{rumbleDuration} мс</span>
                    </div>
                    <input type="range" min={100} max={2000} step={50} value={rumbleDuration} onChange={(e) => setRumbleDuration(Number(e.target.value))} className="w-full accent-emerald-500" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTestRumble()}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-sky-500 hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                    >
                      <Vibrate className="w-4 h-4" /> Запустить тест вибрации
                    </button>
                    <button
                      onClick={() => handleTestRumble(0, 0, 50)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-300'}`}
                    >
                      Стоп
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'emulation' && (
              <div className={`rounded-2xl border p-4 space-y-4 ${cardBg}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black flex items-center gap-2">
                      <MousePointer2 className="w-4 h-4 text-emerald-400" /> Режим эмуляции мыши и клавиатуры
                    </h3>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>
                      Правый стик — курсор мыши, левый стик — скролл колёсика, кнопки — ЛКМ/ПКМ и клавиши Windows через нативный SendInput (0% CPU в выключенном состоянии).
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleEmulation(!emulationActive)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      emulationActive
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                        : isDarkTheme ? 'bg-white/10 text-slate-200 hover:bg-white/15' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    }`}
                  >
                    {emulationActive ? '● Эмуляция АКТИВНА' : 'Включить эмуляцию'}
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold">Чувствительность курсора мыши</span>
                    <span className="font-mono text-emerald-400 font-bold">{draft.mouse_sensitivity.toFixed(1)}×</span>
                  </div>
                  <input
                    type="range" min={0.2} max={3.0} step={0.1}
                    value={draft.mouse_sensitivity}
                    onChange={(e) => setDraft((p) => ({ ...p, mouse_sensitivity: Number(e.target.value) }))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {BUTTON_KEYS.map((btnKey) => (
                    <div key={btnKey} className={`p-2.5 rounded-xl border ${isDarkTheme ? 'bg-slate-950/60 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[10px] font-black text-sky-400 uppercase mb-1">Кнопка {btnKey}</div>
                      <select
                        value={draft.bindings?.[btnKey] || 'LMB'}
                        onChange={(e) => setDraft((p) => ({
                          ...p,
                          bindings: { ...(p.bindings || {}), [btnKey]: e.target.value },
                        }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-[11px] font-mono font-bold ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}
                      >
                        {BINDING_ACTIONS.map((act) => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
