import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BatteryCharging,
  CheckCircle2,
  Clock,
  Coffee,
  Cpu,
  Gamepad2,
  Headphones,
  HeartPulse,
  Keyboard,
  Laptop,
  Leaf,
  Lock,
  Monitor,
  Moon,
  Mouse,
  Pin,
  PinOff,
  Plug,
  Power,
  Radio,
  RefreshCw,
  Repeat,
  RotateCcw,
  Sun,
  Zap,
} from 'lucide-react';
import { LumaLangCode, tr } from '../i18n/translations';
import { WirelessBatteryInfo } from '../data/launcherData';

interface BatteryDetails {
  present: boolean;
  percent: number;
  charging: boolean;
  ac_online?: boolean;
  health_percent: number;
  design_capacity_mwh: number;
  full_charge_capacity_mwh: number;
  cycle_count: number;
  cycle_supported?: boolean;
  power_watts: number;
  voltage_mv: number;
  estimated_minutes: number;
  status_text: string;
  chemistry: string;
  manufacturer?: string;
  data_source?: string;
}

interface BatteryHistoryPoint {
  ts: number;
  label: string;
  percent: number;
  charging: boolean;
}

interface ScreenTimeDay {
  date: string;
  weekday: string;
  minutes: number;
}

interface BatteryReportResponse {
  ok: boolean;
  details: BatteryDetails;
  history: BatteryHistoryPoint[];
  screen_time_today_min: number;
  screen_time_7d: ScreenTimeDay[];
}

export interface LumaBatteryPanelProps {
  isDark: boolean;
  lang: LumaLangCode;
  activePowerPlan?: 'balanced' | 'performance' | 'saver';
  onSelectPowerPlan?: (plan: 'balanced' | 'performance' | 'saver') => void;
  // Unified Power Settings (merged from PowerSaverPanel into one «Питание и Батарея» tab!)
  screenBrightness?: number;
  onChangeScreenBrightness?: (val: number) => void;
  autoSaverThreshold?: number;
  onChangeAutoSaverThreshold?: (val: number) => void;
  reduceEffectsOnSaver?: boolean;
  onToggleReduceEffectsOnSaver?: () => void;
  onPowerAction?: (action: 'lock' | 'sleep' | 'reboot' | 'shutdown' | 'recycle_bin') => void;
  // Wireless & 2.4GHz Radio-Channel Taskbar Pinning
  pinnedWirelessNames?: string[];
  onTogglePinWireless?: (dev: WirelessBatteryInfo) => void;
  onWirelessDevicesLoaded?: (devs: WirelessBatteryInfo[]) => void;
}

function buildLaptopDemoReport(): BatteryReportResponse {
  const now = Math.floor(Date.now() / 1000);
  const curve: { hAgo: number; pct: number; chg: boolean }[] = [
    { hAgo: 22, pct: 98, chg: false },
    { hAgo: 20, pct: 86, chg: false },
    { hAgo: 18, pct: 72, chg: false },
    { hAgo: 16, pct: 55, chg: false },
    { hAgo: 14, pct: 39, chg: false },
    { hAgo: 12, pct: 24, chg: true },
    { hAgo: 11, pct: 52, chg: true },
    { hAgo: 10, pct: 81, chg: true },
    { hAgo: 9, pct: 100, chg: true },
    { hAgo: 7, pct: 91, chg: false },
    { hAgo: 5, pct: 78, chg: false },
    { hAgo: 3, pct: 64, chg: false },
    { hAgo: 1, pct: 57, chg: false },
    { hAgo: 0, pct: 54, chg: false },
  ];
  const history: BatteryHistoryPoint[] = curve.map((c) => {
    const ts = now - c.hAgo * 3600;
    const d = new Date(ts * 1000);
    return {
      ts,
      label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      percent: c.pct,
      charging: c.chg,
    };
  });
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const mins = [310, 425, 380, 290, 465, 220, 345];
  const screen_time_7d: ScreenTimeDay[] = weekdays.map((w, idx) => ({
    date: `2026-11-${15 + idx}`,
    weekday: w,
    minutes: mins[idx],
  }));
  return {
    ok: true,
    details: {
      present: true,
      percent: 54,
      charging: false,
      ac_online: false,
      health_percent: 92,
      design_capacity_mwh: 75000,
      full_charge_capacity_mwh: 69120,
      cycle_count: 148,
      cycle_supported: true,
      power_watts: 11.4,
      voltage_mv: 15420,
      estimated_minutes: 340,
      status_text: 'Работа от батареи',
      chemistry: 'Li-Ion Polymer',
      manufacturer: 'Luma PowerCell',
      data_source: 'Демо-профиль ноутбука',
    },
    history,
    screen_time_today_min: 345,
    screen_time_7d,
  };
}

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} мин`;
  return `${h} ч ${m} мин`;
}

export const LumaBatteryPanel: React.FC<LumaBatteryPanelProps> = ({
  isDark,
  lang,
  activePowerPlan = 'balanced',
  onSelectPowerPlan,
  screenBrightness = 100,
  onChangeScreenBrightness,
  autoSaverThreshold = 20,
  onChangeAutoSaverThreshold,
  reduceEffectsOnSaver = true,
  onToggleReduceEffectsOnSaver,
  onPowerAction,
  pinnedWirelessNames = [],
  onTogglePinWireless,
  onWirelessDevicesLoaded,
}) => {
  const [report, setReport] = useState<BatteryReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kernel/battery/report');
      if (res.ok) {
        const data = (await res.json()) as BatteryReportResponse;
        setReport(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
    const id = window.setInterval(() => void loadReport(), 30000);
    return () => window.clearInterval(id);
  }, []);

  const activeData = useMemo(() => {
    if (demoMode) return buildLaptopDemoReport();
    return report;
  }, [demoMode, report]);

  const details = activeData?.details;
  const hasBattery = Boolean(details?.present);
  const history = activeData?.history || [];
  const days = activeData?.screen_time_7d || [];
  const todayMin = activeData?.screen_time_today_min || 0;

  const chartData = useMemo(() => {
    const pts =
      history.length >= 2
        ? history
        : [
            { ts: 0, label: 'Старт', percent: details?.percent ?? 100, charging: Boolean(details?.charging) },
            { ts: 1, label: 'Сейчас', percent: details?.percent ?? 100, charging: Boolean(details?.charging) },
          ];
    const W = 540;
    const H = 150;
    const padL = 28;
    const padR = 12;
    const padT = 14;
    const padB = 22;
    const usableW = W - padL - padR;
    const usableH = H - padT - padB;

    const coords = pts.map((p, idx) => {
      const x = padL + (pts.length > 1 ? (idx / (pts.length - 1)) * usableW : usableW);
      const pct = Math.max(0, Math.min(100, p.percent));
      const y = padT + ((100 - pct) / 100) * usableH;
      return { ...p, x, y };
    });

    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padT + usableH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padT + usableH).toFixed(1)} Z`;

    const chargeBands: { x1: number; x2: number }[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      if (coords[i].charging) {
        chargeBands.push({ x1: coords[i].x, x2: coords[i + 1].x });
      }
    }

    return { W, H, padL, padT, usableH, coords, linePath, areaPath, chargeBands };
  }, [history, details]);

  const cardCls = isDark
    ? 'bg-white/[0.03] border-white/[0.09] text-zinc-100'
    : 'bg-white border-zinc-200 text-zinc-900 shadow-sm';

  const btnCls = isDark
    ? 'border-white/15 bg-white/5 hover:bg-white/10 text-zinc-100'
    : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-800';

  const maxDayMin = Math.max(60, ...days.map((d) => d.minutes));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-emerald-400" />
            Питание и Батарея
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Единый центр питания: АКБ ноутбука, беспроводные и 2.4GHz устройства, планы энергии, яркость и управление ПК
            {details?.data_source ? ` · ${details.data_source}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!report?.details?.present && (
            <button
              onClick={() => setDemoMode((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition ${
                demoMode ? 'bg-emerald-500 text-white border-emerald-400' : btnCls
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              {tr(lang, 'batteryDemoMode')}
            </button>
          )}
          <button
            onClick={() => void loadReport()}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition ${btnCls}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {tr(lang, 'refresh')}
          </button>
        </div>
      </div>

      {/* Wireless & 2.4GHz Radio-Channel Peripherals with Taskbar Pinning (Top priority!) */}
      <WirelessBatteriesCard
        isDark={isDark}
        cardCls={cardCls}
        pinnedWirelessNames={pinnedWirelessNames}
        onTogglePinWireless={onTogglePinWireless}
        onWirelessDevicesLoaded={onWirelessDevicesLoaded}
      />

      {/* Power Profiles + Brightness + Auto-Saver + Quick PC Power Actions */}
      <div className={`rounded-2xl border p-4 space-y-4 ${cardCls}`}>
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--luma-accent)]" />
            Профиль энергопотребления и экран
          </div>
          <span className="text-[10px] font-mono text-zinc-500">Windows powercfg + LumaCore 1.5</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { id: 'performance' as const, label: 'Производительность', desc: 'Макс. FPS и отклик ЦП', icon: <Zap className="w-4 h-4 text-amber-400" /> },
            { id: 'balanced' as const, label: 'Сбалансированный', desc: 'Оптимум Luma OS 1.4', icon: <Cpu className="w-4 h-4 text-cyan-400" /> },
            { id: 'saver' as const, label: 'Энергосбережение', desc: 'Макс. автономность и тишина', icon: <Leaf className="w-4 h-4 text-emerald-400" /> },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPowerPlan?.(p.id)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                activePowerPlan === p.id
                  ? 'border-[var(--luma-accent)] bg-[var(--luma-accent)]/15'
                  : isDark
                  ? 'border-white/10 hover:bg-white/5'
                  : 'border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center justify-between">
                {p.icon}
                {activePowerPlan === p.id && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent)] text-white text-[9px] font-mono font-bold">
                    АКТИВЕН
                  </span>
                )}
              </div>
              <div className="text-xs font-bold">{p.label}</div>
              <div className="text-[10px] text-zinc-500">{p.desc}</div>
            </button>
          ))}
        </div>

        {/* Brightness & Auto-Saver Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-500/15 text-xs">
          {onChangeScreenBrightness && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="inline-flex items-center gap-1.5 font-sans font-semibold">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Комфортная яркость оболочки
                </span>
                <span>{screenBrightness}%</span>
              </div>
              <input
                type="range"
                min={55}
                max={100}
                value={screenBrightness}
                onChange={(e) => onChangeScreenBrightness(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {onChangeAutoSaverThreshold && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="font-sans font-semibold">Авто-эко при заряде ниже</span>
                <span>{autoSaverThreshold}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={autoSaverThreshold}
                onChange={(e) => onChangeAutoSaverThreshold(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>

        {onToggleReduceEffectsOnSaver && (
          <div
            onClick={onToggleReduceEffectsOnSaver}
            className="pt-2 border-t border-zinc-500/15 flex items-center justify-between cursor-pointer text-xs"
          >
            <div>
              <div className="font-semibold">Отключать тяжёлое размытие (Blur) в Энергосбережении</div>
              <div className="text-[11px] text-zinc-500">Снижает нагрузку на GPU при работе от батареи</div>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                reduceEffectsOnSaver
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                  : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/25'
              }`}
            >
              {reduceEffectsOnSaver ? 'ВКЛ' : 'ВЫКЛ'}
            </span>
          </div>
        )}

        {/* Quick PC Power Actions */}
        {onPowerAction && (
          <div className="pt-2 border-t border-zinc-500/15 flex flex-wrap gap-2 text-xs">
            <button onClick={() => onPowerAction('lock')} className={`px-3 py-1.5 rounded-xl border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}>
              <Lock className="w-3.5 h-3.5" /> Блокировка
            </button>
            <button onClick={() => onPowerAction('sleep')} className={`px-3 py-1.5 rounded-xl border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}>
              <Power className="w-3.5 h-3.5 text-sky-400" /> Сон
            </button>
            <button onClick={() => onPowerAction('reboot')} className={`px-3 py-1.5 rounded-xl border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}>
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Перезагрузка
            </button>
            <button onClick={() => onPowerAction('shutdown')} className="px-3 py-1.5 rounded-xl bg-rose-600/85 hover:bg-rose-600 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              <Power className="w-3.5 h-3.5" /> Выключение ПК
            </button>
          </div>
        )}
      </div>

      {/* Idle Sleep & Display Timeout Settings (Synced to Windows powrprof.dll!) */}
      <IdleSleepSettingsCard
        isDark={isDark}
        cardCls={cardCls}
        onSleepNow={onPowerAction ? () => onPowerAction('sleep') : undefined}
      />

      {/* Desktop PC Notice if no physical battery */}
      {!hasBattery && !demoMode && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            isDark ? 'bg-sky-500/10 border-sky-500/25 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          <Monitor className="w-5 h-5 shrink-0 mt-0.5 text-sky-400" />
          <div className="text-xs leading-relaxed">
            <div className="font-bold mb-1">Стационарное питание от сети (встроенная АКБ ноутбука не обнаружена)</div>
            <div>{tr(lang, 'batteryDesktopNotice')}</div>
          </div>
        </div>
      )}

      {/* Top Battery & Screen Time KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`rounded-2xl border p-3.5 ${cardCls}`}>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
            <span>Заряд ПК</span>
            <Zap className={`w-4 h-4 ${details?.charging ? 'text-emerald-400' : details?.ac_online ? 'text-sky-400' : 'text-amber-400'}`} />
          </div>
          <div className="text-2xl font-mono font-bold">{hasBattery ? `${details?.percent ?? 100}%` : 'AC'}</div>
          <div className="text-[11px] text-zinc-500 mt-1 truncate">
            {details?.status_text || (details?.charging ? tr(lang, 'batteryCharging') : tr(lang, 'batteryDischarging'))}
          </div>
        </div>

        <div className={`rounded-2xl border p-3.5 ${cardCls}`}>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
            <span>{tr(lang, 'batteryHealth')}</span>
            <HeartPulse className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400">
            {hasBattery ? `${details?.health_percent ?? 100}%` : '—'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono truncate">
            {details?.full_charge_capacity_mwh && details?.design_capacity_mwh
              ? `${(details.full_charge_capacity_mwh / 1000).toFixed(1)} / ${(details.design_capacity_mwh / 1000).toFixed(1)} Вт·ч`
              : `${details?.chemistry || 'Li-Ion'}`}
          </div>
        </div>

        <div className={`rounded-2xl border p-3.5 ${cardCls}`}>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
            <span>{tr(lang, 'batteryCycles')}</span>
            <Repeat className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-bold">
            {hasBattery ? (details?.cycle_supported || (details?.cycle_count ?? 0) > 0 ? details?.cycle_count : '—') : '—'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 truncate">
            {hasBattery && (details?.power_watts ?? 0) > 0
              ? `${details?.power_watts?.toFixed(1)} Вт · ${((details?.voltage_mv ?? 0) / 1000).toFixed(2)} В`
              : 'Ресурс ~1000 циклов'}
          </div>
        </div>

        <div className={`rounded-2xl border p-3.5 ${cardCls}`}>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
            <span>{tr(lang, 'batteryScreenTime')}</span>
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-mono font-bold">{fmtMinutes(todayMin)}</div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {tr(lang, 'batteryToday')}
            {details?.estimated_minutes ? ` · ~${fmtMinutes(details.estimated_minutes)}` : ''}
          </div>
        </div>
      </div>

      {/* 24h Discharge/Charge Curve + 7-Day Screen Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={`rounded-2xl border p-4 ${cardCls}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Activity className="w-4 h-4 text-emerald-400" />
              {tr(lang, 'batteryHistory24h')}
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Зелёная зона = зарядка</span>
          </div>
          <svg viewBox={`0 0 ${chartData.W} ${chartData.H}`} className="w-full h-36">
            <defs>
              <linearGradient id="lumaBattArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[100, 50, 0].map((val) => {
              const y = chartData.padT + ((100 - val) / 100) * chartData.usableH;
              return (
                <g key={val}>
                  <line
                    x1={chartData.padL}
                    x2={chartData.W - 12}
                    y1={y}
                    y2={y}
                    stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                    strokeDasharray="3 3"
                  />
                  <text x={chartData.padL - 5} y={y + 3} textAnchor="end" fontSize="9" fill="#71717a" fontFamily="monospace">
                    {val}
                  </text>
                </g>
              );
            })}
            {chartData.chargeBands.map((b, i) => (
              <rect key={i} x={b.x1} y={chartData.padT} width={Math.max(4, b.x2 - b.x1)} height={chartData.usableH} fill="rgba(16, 185, 129, 0.16)" />
            ))}
            <path d={chartData.areaPath} fill="url(#lumaBattArea)" />
            <path d={chartData.linePath} fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>

        <div className={`rounded-2xl border p-4 ${cardCls}`}>
          <div className="text-xs font-bold mb-2 flex items-center justify-between">
            <span>
              {tr(lang, 'batteryScreenTime')} · {tr(lang, 'battery7Days')}
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              Среднее: {fmtMinutes(Math.round(days.reduce((a, b) => a + b.minutes, 0) / Math.max(1, days.length)))}
            </span>
          </div>
          <div className="h-32 flex items-end justify-between gap-2 pt-3">
            {(days.length > 0 ? days : [{ date: 'today', weekday: 'Сегодня', minutes: todayMin }]).map((d) => {
              const pct = Math.max(10, Math.round((d.minutes / maxDayMin) * 100));
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-mono text-zinc-500">{Math.round((d.minutes / 60) * 10) / 10}ч</span>
                  <div className="w-full max-w-[34px] flex-1 flex items-end">
                    <div
                      style={{ height: `${pct}%` }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-[var(--luma-accent)] to-cyan-400 transition-all duration-500"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{d.weekday}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const WirelessBatteriesCard: React.FC<{
  isDark: boolean;
  cardCls: string;
  pinnedWirelessNames: string[];
  onTogglePinWireless?: (dev: WirelessBatteryInfo) => void;
  onWirelessDevicesLoaded?: (devs: WirelessBatteryInfo[]) => void;
}> = ({ isDark, cardCls, pinnedWirelessNames, onTogglePinWireless, onWirelessDevicesLoaded }) => {
  const [devices, setDevices] = useState<WirelessBatteryInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWireless = async (refresh = false) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/kernel/wireless/batteries${refresh ? '?refresh=1' : ''}`);
      if (r.ok) {
        const d = await r.json();
        const list = Array.isArray(d?.devices) ? (d.devices as WirelessBatteryInfo[]) : [];
        setDevices(list);
        onWirelessDevicesLoaded?.(list);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWireless(false);
  }, []);

  const typeIcon = (t: string) => {
    switch (t) {
      case 'mouse': return <Mouse className="w-4 h-4 text-emerald-400" />;
      case 'keyboard': return <Keyboard className="w-4 h-4 text-cyan-400" />;
      case 'headphones': return <Headphones className="w-4 h-4 text-violet-400" />;
      case 'gamepad': return <Gamepad2 className="w-4 h-4 text-amber-400" />;
      default: return <Radio className="w-4 h-4 text-sky-400" />;
    }
  };

  const typeLabel = (t: string) => {
    switch (t) {
      case 'mouse': return 'Мышь';
      case 'keyboard': return 'Клавиатура';
      case 'headphones': return 'Наушники';
      case 'gamepad': return 'Геймпад';
      case 'watch': return 'Часы';
      case 'phone': return 'Смартфон';
      default: return 'Беспроводное';
    }
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${cardCls}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            Беспроводные и 2.4GHz Радиоканальные устройства ({devices.length})
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Bluetooth / BLE + 2.4GHz USB-донглы и беспроводные мыши (LumaCore 1.5 HID Scanner) · Закрепите нужное устройство на Панели задач!
          </div>
        </div>
        <button
          onClick={() => void loadWireless(true)}
          disabled={loading}
          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono inline-flex items-center gap-1.5 cursor-pointer ${
            isDark ? 'border-white/10 hover:bg-white/10' : 'border-zinc-300 hover:bg-zinc-100'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Опросить
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="text-xs text-zinc-500 py-3 text-center">
          Беспроводные устройства (Bluetooth, BLE или 2.4GHz радиоканал) сейчас не обнаружены. Подключите мышь, наушники, клавиатуру или геймпад и нажмите «Опросить».
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {devices.map((dev, idx) => {
            const hasBat = typeof dev.battery_percent === 'number' && dev.battery_percent >= 0;
            const pct = hasBat ? Math.max(0, Math.min(100, dev.battery_percent)) : 0;
            const barColor = pct <= 20 ? 'bg-rose-500' : pct <= 45 ? 'bg-amber-400' : 'bg-emerald-500';
            const isPinned = pinnedWirelessNames.includes(dev.name);
            const isRadio = dev.transport.toLowerCase().includes('2.4') || dev.transport.toLowerCase().includes('радио');
            return (
              <div
                key={`${dev.name}_${idx}`}
                className={`p-3 rounded-xl border space-y-2 ${
                  isPinned
                    ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                    : isDark
                    ? 'bg-black/25 border-white/10'
                    : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                      {typeIcon(dev.device_type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate" title={dev.name}>
                        {dev.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate flex items-center gap-1">
                        <span>{typeLabel(dev.device_type)}</span>
                        <span>·</span>
                        <span className={isRadio ? 'text-emerald-400 font-bold' : ''}>{dev.transport}</span>
                        {dev.vendor_id && (
                          <span className="opacity-70">
                            · {dev.vendor_id}
                            {dev.product_id ? `:${dev.product_id}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasBat ? (
                    <span
                      className={`text-sm font-mono font-black shrink-0 ${
                        pct <= 20 ? 'text-rose-400' : pct <= 45 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                      Подключено
                    </span>
                  )}
                </div>
                {hasBat ? (
                  <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-zinc-500">
                    Активный канал · драйвер устройства не передаёт % заряда ОС
                  </div>
                )}
                {onTogglePinWireless && (
                  <button
                    onClick={() => onTogglePinWireless(dev)}
                    className={`w-full py-1 px-2 rounded-lg border text-[10px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                      isPinned
                        ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                        : isDark
                        ? 'border-white/10 hover:bg-white/10 text-zinc-300'
                        : 'border-zinc-300 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    {isPinned ? 'Убрать с панели задач' : 'На панель задач'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface IdleSleepConfigState {
  display_off_ac_min: number;
  sleep_ac_min: number;
  display_off_dc_min: number;
  sleep_dc_min: number;
  hibernate_after_min: number;
  lock_before_sleep: boolean;
  keep_awake: boolean;
  prevent_sleep_on_media: boolean;
}

const DISPLAY_TIMEOUT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1 минута' },
  { value: 2, label: '2 минуты' },
  { value: 3, label: '3 минуты' },
  { value: 5, label: '5 минут' },
  { value: 10, label: '10 минут' },
  { value: 15, label: '15 минут' },
  { value: 20, label: '20 минут' },
  { value: 30, label: '30 минут' },
  { value: 45, label: '45 минут' },
  { value: 60, label: '1 час' },
  { value: 120, label: '2 часа' },
  { value: 0, label: 'Никогда' },
];

const SLEEP_TIMEOUT_OPTIONS: { value: number; label: string }[] = [
  { value: 2, label: '2 минуты' },
  { value: 5, label: '5 минут' },
  { value: 10, label: '10 минут' },
  { value: 15, label: '15 минут' },
  { value: 20, label: '20 минут' },
  { value: 30, label: '30 минут' },
  { value: 45, label: '45 минут' },
  { value: 60, label: '1 час' },
  { value: 120, label: '2 часа' },
  { value: 180, label: '3 часа' },
  { value: 300, label: '5 часов' },
  { value: 0, label: 'Никогда' },
];

const HIBERNATE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Никогда' },
  { value: 30, label: 'Через 30 минут' },
  { value: 60, label: 'Через 1 час' },
  { value: 120, label: 'Через 2 часа' },
  { value: 180, label: 'Через 3 часа' },
  { value: 360, label: 'Через 6 часов' },
];

const IdleSleepSettingsCard: React.FC<{
  isDark: boolean;
  cardCls: string;
  onSleepNow?: () => void;
}> = ({ isDark, cardCls, onSleepNow }) => {
  const [cfg, setCfg] = useState<IdleSleepConfigState>({
    display_off_ac_min: 15,
    sleep_ac_min: 30,
    display_off_dc_min: 5,
    sleep_dc_min: 15,
    hibernate_after_min: 0,
    lock_before_sleep: true,
    keep_awake: false,
    prevent_sleep_on_media: true,
  });
  const [idleSec, setIdleSec] = useState(0);
  const [acOnline, setAcOnline] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadIdleConfig = async () => {
    try {
      const r = await fetch('/api/kernel/power/idle-sleep');
      if (r.ok) {
        const d = await r.json();
        if (d?.config) setCfg(d.config);
        if (typeof d?.idle_seconds === 'number') setIdleSec(d.idle_seconds);
        if (typeof d?.ac_online === 'boolean') setAcOnline(d.ac_online);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void loadIdleConfig();
    const id = window.setInterval(() => void loadIdleConfig(), 15000);
    return () => window.clearInterval(id);
  }, []);

  const saveConfig = async (next: IdleSleepConfigState) => {
    setCfg(next);
    setSaving(true);
    try {
      const r = await fetch('/api/kernel/power/idle-sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.config) setCfg(d.config);
        setStatusMsg(d?.message || 'Применено в системе Windows');
        window.setTimeout(() => setStatusMsg(''), 4000);
      }
    } catch {
      setStatusMsg('Сохранено локально');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: 'eco' | 'balanced' | 'never') => {
    if (preset === 'eco') {
      void saveConfig({ ...cfg, display_off_ac_min: 5, sleep_ac_min: 15, display_off_dc_min: 2, sleep_dc_min: 5, keep_awake: false });
    } else if (preset === 'balanced') {
      void saveConfig({ ...cfg, display_off_ac_min: 15, sleep_ac_min: 30, display_off_dc_min: 5, sleep_dc_min: 15, keep_awake: false });
    } else {
      void saveConfig({ ...cfg, display_off_ac_min: 0, sleep_ac_min: 0, display_off_dc_min: 15, sleep_dc_min: 0, keep_awake: true });
    }
  };

  const selectCls = isDark
    ? 'w-full px-2.5 py-2 rounded-xl border border-white/12 bg-[#111520] text-zinc-100 text-xs font-medium outline-none focus:border-[var(--luma-accent)] cursor-pointer'
    : 'w-full px-2.5 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 text-xs font-medium outline-none focus:border-[var(--luma-accent)] cursor-pointer';

  const subCardCls = isDark
    ? 'rounded-xl border border-white/10 bg-black/25 p-3.5 space-y-3'
    : 'rounded-xl border border-zinc-200 bg-zinc-50/90 p-3.5 space-y-3';

  const fmtIdle = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m} мин ${r} с` : `${r} с`;
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-4 ${cardCls}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            Сон и выключение экрана при бездействии (ПК и Ноутбук)
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Напрямую синхронизируется со схемой электропитания Windows (`powrprof.dll`) — отдельно для питания от сети и от батареи
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
          <span
            className={`px-2 py-1 rounded-full border ${
              acOnline
                ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}
          >
            {acOnline ? 'Сейчас: От сети (AC)' : 'Сейчас: От батареи (DC)'}
          </span>
          <span className="px-2 py-1 rounded-full border border-zinc-500/25 text-zinc-400">
            Бездействие: {fmtIdle(idleSec)}
          </span>
          {statusMsg && (
            <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {statusMsg}
            </span>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-zinc-500 font-semibold">Быстрые профили:</span>
        <button
          type="button"
          disabled={saving}
          onClick={() => applyPreset('eco')}
          className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer transition ${
            isDark ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          Экономный (экран 2–5м · сон 5–15м)
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => applyPreset('balanced')}
          className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer transition ${
            isDark ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20' : 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100'
          }`}
        >
          Сбалансированный (15/30м)
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => applyPreset('never')}
          className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer transition ${
            isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
        >
          Игровой / Никогда не спать
        </button>
      </div>

      {/* AC vs DC Side-by-Side Timeout Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* AC (Plugged in / Desktop PC) */}
        <div className={subCardCls}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold flex items-center gap-1.5 text-sky-400">
              <Plug className="w-3.5 h-3.5" />
              При работе от сети (ПК / Зарядка)
            </div>
            {acOnline && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">Активно</span>}
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] text-zinc-400">Выключать экран при бездействии через:</span>
            <select
              value={cfg.display_off_ac_min}
              onChange={(e) => void saveConfig({ ...cfg, display_off_ac_min: Number(e.target.value) })}
              className={selectCls}
            >
              {DISPLAY_TIMEOUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-zinc-400">Переводить ПК в сон при бездействии через:</span>
            <select
              value={cfg.sleep_ac_min}
              onChange={(e) => void saveConfig({ ...cfg, sleep_ac_min: Number(e.target.value) })}
              className={selectCls}
            >
              {SLEEP_TIMEOUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* DC (Laptop on Battery) */}
        <div className={subCardCls}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
              <BatteryCharging className="w-3.5 h-3.5" />
              При работе от батареи (Ноутбук)
            </div>
            {!acOnline && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Активно</span>}
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] text-zinc-400">Выключать экран от батареи через:</span>
            <select
              value={cfg.display_off_dc_min}
              onChange={(e) => void saveConfig({ ...cfg, display_off_dc_min: Number(e.target.value) })}
              className={selectCls}
            >
              {DISPLAY_TIMEOUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-zinc-400">Переводить ноутбук в сон от батареи через:</span>
            <select
              value={cfg.sleep_dc_min}
              onChange={(e) => void saveConfig({ ...cfg, sleep_dc_min: Number(e.target.value) })}
              className={selectCls}
            >
              {SLEEP_TIMEOUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Hibernate + Caffeine Keep Awake + Media & Lock Guards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className={`${subCardCls} flex flex-col justify-between`}>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold">Гибернация после сна (сохранение ОЗУ на диск):</span>
            <select
              value={cfg.hibernate_after_min}
              onChange={(e) => void saveConfig({ ...cfg, hibernate_after_min: Number(e.target.value) })}
              className={selectCls}
            >
              {HIBERNATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <div
            onClick={() => void saveConfig({ ...cfg, lock_before_sleep: !cfg.lock_before_sleep })}
            className="pt-2 border-t border-zinc-500/15 flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="font-semibold">Блокировать экран перед сном</div>
              <div className="text-[10px] text-zinc-500">Защита данных при пробуждении ПК</div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                cfg.lock_before_sleep
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                  : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/25'
              }`}
            >
              {cfg.lock_before_sleep ? 'ВКЛ' : 'ВЫКЛ'}
            </span>
          </div>
        </div>

        <div className={`${subCardCls} flex flex-col justify-between`}>
          <div
            onClick={() => void saveConfig({ ...cfg, keep_awake: !cfg.keep_awake })}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
              cfg.keep_awake
                ? 'border-amber-400/50 bg-amber-500/15'
                : isDark
                ? 'border-white/10 hover:bg-white/5'
                : 'border-zinc-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Coffee className={`w-4 h-4 ${cfg.keep_awake ? 'text-amber-400' : 'text-zinc-400'}`} />
              <div>
                <div className="font-bold">Режим «Кофеин» (Не засыпать)</div>
                <div className="text-[10px] text-zinc-500">Временно запретить авто-сон (`SetThreadExecutionState`)</div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                cfg.keep_awake
                  ? 'bg-amber-500/25 text-amber-300 border-amber-400/50'
                  : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/25'
              }`}
            >
              {cfg.keep_awake ? 'АКТИВЕН' : 'ВЫКЛ'}
            </span>
          </div>

          <div
            onClick={() => void saveConfig({ ...cfg, prevent_sleep_on_media: !cfg.prevent_sleep_on_media })}
            className="pt-2 flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="font-semibold">Не засыпать при видео и записи экрана</div>
              <div className="text-[10px] text-zinc-500">Блокирует переход в сон во время рендера и фильмов</div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                cfg.prevent_sleep_on_media
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                  : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/25'
              }`}
            >
              {cfg.prevent_sleep_on_media ? 'ВКЛ' : 'ВЫКЛ'}
            </span>
          </div>

          {onSleepNow && (
            <button
              type="button"
              onClick={onSleepNow}
              className="w-full py-1.5 rounded-xl bg-indigo-600/85 hover:bg-indigo-600 text-white font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <Moon className="w-3.5 h-3.5" />
              Перевести ПК / Ноутбук в сон сейчас
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

