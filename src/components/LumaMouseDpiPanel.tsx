import React, { useEffect, useRef, useState } from 'react';
import {
  BatteryCharging,
  Crosshair,
  Gauge,
  MousePointerClick,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { WirelessBatteryInfo } from '../data/launcherData';

export interface MouseDPISnapshot {
  ok: boolean;
  windows_speed: number;
  sensor_dpi: number;
  effective_dpi: number;
  multiplier: number;
  enhance_precision: boolean;
  scroll_lines: number;
  detected_mouse_name: string;
  platform: string;
}

interface LumaMouseDpiPanelProps {
  isDark: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  wirelessDevices?: WirelessBatteryInfo[];
  onRefreshWireless?: () => void;
  onNotify?: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

const SENSOR_DPI_STEPS = [400, 800, 1000, 1200, 1600, 2400, 3200, 6400];

const DPI_PRESETS = [
  { label: 'Снайпер', dpi: 400, desc: 'Макс. точность FPS' },
  { label: 'Точность', dpi: 800, desc: 'Киберспорт / Дизайн' },
  { label: 'Баланс', dpi: 1200, desc: 'Работа и браузер' },
  { label: 'Игры', dpi: 1600, desc: 'Быстрый отклик 1080p/2K' },
  { label: 'Ультра', dpi: 3200, desc: '4K / Мультимонитор' },
];

export const LumaMouseDpiPanel: React.FC<LumaMouseDpiPanelProps> = React.memo(
  ({ isDark, surfaceCls, btnCls, mutedCls, wirelessDevices = [], onRefreshWireless, onNotify }) => {
    const [cfg, setCfg] = useState<MouseDPISnapshot>({
      ok: true,
      windows_speed: 10,
      sensor_dpi: 1600,
      effective_dpi: 1600,
      multiplier: 1.0,
      enhance_precision: false,
      scroll_lines: 3,
      detected_mouse_name: 'Определение мыши...',
      platform: 'windows',
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [customSensor, setCustomSensor] = useState<string>('1600');
    const [testTrail, setTestTrail] = useState<{ x: number; y: number }[]>([]);
    const [testSpeedPx, setTestSpeedPx] = useState<number>(0);
    const lastPosRef = useRef<{ x: number; y: number; t: number } | null>(null);

    const fetchDpi = async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/kernel/mouse/dpi');
        if (r.ok) {
          const d: MouseDPISnapshot = await r.json();
          if (d?.ok) {
            setCfg(d);
            setCustomSensor(String(d.sensor_dpi || 1600));
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      void fetchDpi();
    }, []);

    const applyUpdate = async (patch: {
      sensor_dpi?: number;
      effective_dpi?: number;
      windows_speed?: number;
      enhance_precision?: boolean;
      scroll_lines?: number;
    }, toastLabel?: string) => {
      setSaving(true);
      try {
        const r = await fetch('/api/kernel/mouse/dpi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (r.ok) {
          const d: MouseDPISnapshot = await r.json();
          if (d?.ok) {
            setCfg(d);
            setCustomSensor(String(d.sensor_dpi));
            if (toastLabel) {
              onNotify?.('Служба Мыши и DPI', `${toastLabel} · eDPI ${d.effective_dpi} (Win ${d.windows_speed}/20)`, 'success');
            }
          }
        }
      } catch {
        onNotify?.('Служба Мыши и DPI', 'Доступно при запуске LumaOS_1.4.exe', 'info');
      } finally {
        setSaving(false);
      }
    };

    const detectedMice = wirelessDevices.filter((d) => d.is_mouse || d.device_type === 'mouse');

    return (
      <div className="space-y-4 text-xs">
        {/* Header Card */}
        <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--luma-accent)] text-white flex items-center justify-center shrink-0 shadow">
              <MousePointerClick className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold tracking-tight flex items-center gap-2">
                <span>Сервис скорости мыши и DPI</span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--luma-accent)]/20 text-[var(--luma-accent)] text-[10px] font-mono">
                  LumaCore 1.5
                </span>
              </div>
              <div className={`text-[11px] font-mono truncate ${mutedCls}`}>
                Активная мышь: {detectedMice[0]?.name || cfg.detected_mouse_name} · Win32 SPI Real-Time
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              void fetchDpi();
              onRefreshWireless?.();
            }}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>

        {/* Detected Wireless / 2.4GHz / Bluetooth Mice Banner */}
        {detectedMice.length > 0 && (
          <div className={`p-3.5 rounded-2xl border space-y-2 ${surfaceCls}`}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              Обнаруженные беспроводные / HID мыши ({detectedMice.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {detectedMice.map((m, i) => (
                <div
                  key={`${m.name}_${i}`}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                    isDark ? 'bg-black/25 border-white/10' : 'bg-black/[0.03] border-zinc-900/10'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold truncate">{m.name}</div>
                    <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                      {m.transport}
                      {m.vendor_id ? ` · VID ${m.vendor_id}:${m.product_id}` : ''}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${
                      m.battery_percent >= 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-[var(--luma-accent)]/20 text-[var(--luma-accent)]'
                    }`}
                  >
                    <BatteryCharging className="w-3 h-3" />
                    {m.battery_percent >= 0 ? `${m.battery_percent}%` : 'Подключена'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Effective DPI & Speed Controller */}
        <div className={`p-4 rounded-2xl border space-y-4 ${surfaceCls}`}>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-black/25 border-white/10' : 'bg-black/[0.03] border-zinc-900/10'}`}>
              <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>Эффективный DPI</div>
              <div className="text-2xl font-black font-mono text-[var(--luma-accent)] mt-0.5">
                {cfg.effective_dpi}
              </div>
              <div className={`text-[10px] font-mono ${mutedCls}`}>eDPI (курсор)</div>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-black/25 border-white/10' : 'bg-black/[0.03] border-zinc-900/10'}`}>
              <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>Скорость Windows</div>
              <div className="text-2xl font-black font-mono mt-0.5">
                {cfg.windows_speed}
                <span className="text-xs opacity-50">/20</span>
              </div>
              <div className={`text-[10px] font-mono ${mutedCls}`}>множитель ×{cfg.multiplier}</div>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-black/25 border-white/10' : 'bg-black/[0.03] border-zinc-900/10'}`}>
              <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>Сенсор мыши</div>
              <div className="text-2xl font-black font-mono mt-0.5">{cfg.sensor_dpi}</div>
              <div className={`text-[10px] font-mono ${mutedCls}`}>аппаратный DPI</div>
            </div>
          </div>

          {/* 5 Instant DPI Presets */}
          <div className="space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Быстрые профили DPI
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {DPI_PRESETS.map((p) => {
                const active = Math.abs(cfg.effective_dpi - p.dpi) <= 120;
                return (
                  <button
                    key={p.label}
                    disabled={saving}
                    onClick={() => void applyUpdate({ sensor_dpi: cfg.sensor_dpi, effective_dpi: p.dpi }, `Профиль «${p.label}»`)}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      active
                        ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white shadow'
                        : btnCls
                    }`}
                  >
                    <div className="font-bold text-[11px]">{p.label}</div>
                    <div className="font-mono text-xs font-extrabold">{p.dpi} DPI</div>
                    <div className={`text-[9px] truncate ${active ? 'text-white/80' : mutedCls}`}>{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Effective DPI Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold inline-flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                Целевая скорость курсора (DPI)
              </span>
              <span className="font-mono font-bold text-[var(--luma-accent)]">{cfg.effective_dpi} DPI</span>
            </div>
            <input
              type="range"
              min={200}
              max={6400}
              step={100}
              value={Math.max(200, Math.min(6400, cfg.effective_dpi))}
              onChange={(e) => {
                const v = Number(e.target.value);
                setCfg((prev) => ({ ...prev, effective_dpi: v }));
              }}
              onMouseUp={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                void applyUpdate({ sensor_dpi: cfg.sensor_dpi, effective_dpi: v }, 'Скорость DPI изменена');
              }}
              onTouchEnd={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                void applyUpdate({ sensor_dpi: cfg.sensor_dpi, effective_dpi: v }, 'Скорость DPI изменена');
              }}
              className="w-full accent-[var(--luma-accent)]"
            />
            <div className={`flex justify-between text-[10px] font-mono ${mutedCls}`}>
              <span>200 DPI (Снайпер)</span>
              <span>800</span>
              <span>1600</span>
              <span>3200</span>
              <span>6400 DPI (Макс)</span>
            </div>
          </div>

          {/* Exact Windows 1..20 Pointer Speed Slider */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-bold inline-flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                Точная ступень скорости ОС Windows (1 – 20)
              </span>
              <span className="font-mono font-bold">
                {cfg.windows_speed} / 20 (×{cfg.multiplier})
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={cfg.windows_speed}
              onChange={(e) => {
                const spd = Number(e.target.value);
                void applyUpdate({ sensor_dpi: cfg.sensor_dpi, windows_speed: spd });
              }}
              className="w-full accent-[var(--luma-accent)]"
            />
          </div>

          {/* Hardware Sensor DPI Calibration */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">Базовый DPI сенсора вашей мыши:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={100}
                  max={30000}
                  step={100}
                  value={customSensor}
                  onChange={(e) => setCustomSensor(e.target.value)}
                  className={`w-24 px-2 py-1 rounded-lg border font-mono text-xs outline-none ${btnCls}`}
                />
                <button
                  onClick={() => {
                    const n = Math.max(100, Math.min(30000, Number(customSensor) || 1600));
                    void applyUpdate({ sensor_dpi: n, windows_speed: cfg.windows_speed }, `Сенсор ${n} DPI`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white font-semibold cursor-pointer"
                >
                  Задать
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SENSOR_DPI_STEPS.map((s) => (
                <button
                  key={s}
                  onClick={() => void applyUpdate({ sensor_dpi: s, windows_speed: cfg.windows_speed })}
                  className={`px-2 py-1 rounded-lg border font-mono text-[11px] cursor-pointer ${
                    cfg.sensor_dpi === s ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-bold' : btnCls
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Raw Input / Acceleration + Scroll Lines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <button
              onClick={() =>
                void applyUpdate(
                  { enhance_precision: !cfg.enhance_precision },
                  !cfg.enhance_precision ? 'Акселерация включена' : 'Raw Input (без акселерации)'
                )
              }
              className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer ${btnCls}`}
            >
              <div>
                <div className="font-bold">Повышенная точность (Акселерация)</div>
                <div className={`text-[10px] ${mutedCls}`}>
                  {cfg.enhance_precision ? 'Включена (динамический разгон)' : 'Выключена — чистый Raw Input 1:1'}
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  cfg.enhance_precision ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {cfg.enhance_precision ? 'ВКЛ' : 'RAW'}
              </span>
            </button>

            <div className={`p-3 rounded-xl border space-y-1.5 ${btnCls}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold">Прокрутка колеса (строк)</span>
                <span className="font-mono font-bold text-[var(--luma-accent)]">{cfg.scroll_lines}</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                value={cfg.scroll_lines}
                onChange={(e) => void applyUpdate({ scroll_lines: Number(e.target.value) })}
                className="w-full accent-[var(--luma-accent)]"
              />
            </div>
          </div>
        </div>

        {/* Interactive Live Mouse DPI Test Pad */}
        <div className={`p-4 rounded-2xl border space-y-2 ${surfaceCls}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold inline-flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Интерактивный тест плавности и скорости курсора
            </span>
            <span className="font-mono text-[11px] text-[var(--luma-accent)] font-bold inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {testSpeedPx} px/с
            </span>
          </div>
          <div
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const now = performance.now();
              if (lastPosRef.current) {
                const dt = Math.max(1, now - lastPosRef.current.t) / 1000;
                const dist = Math.hypot(x - lastPosRef.current.x, y - lastPosRef.current.y);
                setTestSpeedPx(Math.round(dist / dt));
              }
              lastPosRef.current = { x, y, t: now };
              setTestTrail((prev) => [...prev.slice(-18), { x, y }]);
            }}
            onMouseLeave={() => {
              lastPosRef.current = null;
              setTestSpeedPx(0);
            }}
            className={`relative h-28 rounded-xl border overflow-hidden select-none cursor-crosshair ${
              isDark ? 'bg-[#080b14] border-white/10' : 'bg-zinc-900/[0.04] border-zinc-900/15'
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11px] font-mono opacity-45">
              Поводите мышью здесь, чтобы сразу оценить новый DPI ({cfg.effective_dpi} eDPI)
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {testTrail.length > 1 && (
                <polyline
                  fill="none"
                  stroke="var(--luma-accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={testTrail.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                />
              )}
              {testTrail.length > 0 && (
                <circle
                  cx={testTrail[testTrail.length - 1].x}
                  cy={testTrail[testTrail.length - 1].y}
                  r="4.5"
                  fill="var(--luma-accent)"
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    );
  }
);
