import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BatteryCharging,
  Clock,
  Cpu,
  HeartPulse,
  Laptop,
  Monitor,
  RefreshCw,
  Repeat,
  Zap,
} from 'lucide-react';
import { LumaLangCode, tr } from '../i18n/translations';

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

interface LumaBatteryPanelProps {
  isDark: boolean;
  lang: LumaLangCode;
  activePowerPlan?: string;
  onSelectPowerPlan?: (plan: 'balanced' | 'performance' | 'saver') => void;
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
    loadReport();
    const id = window.setInterval(loadReport, 30000);
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

  // Build SVG polyline & charging highlight areas for 24h discharge/charge graph
  const chartData = useMemo(() => {
    const pts = history.length >= 2
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

    // Build contiguous charging bands
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

  const maxDayMin = Math.max(60, ...days.map((d) => d.minutes));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-emerald-400" />
            {tr(lang, 'batteryTitle')}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Трёхуровневая телеметрия АКБ (Win32 / WMI / BatteryReport XML), циклы, износ и экранное время
            {details?.data_source ? ` · ${details.data_source}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!report?.details?.present && (
            <button
              onClick={() => setDemoMode((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition ${
                demoMode
                  ? 'bg-emerald-500 text-white border-emerald-400'
                  : isDark
                  ? 'border-white/15 bg-white/5 hover:bg-white/10'
                  : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              {tr(lang, 'batteryDemoMode')}
            </button>
          )}
          <button
            onClick={loadReport}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition ${
              isDark ? 'border-white/15 bg-white/5 hover:bg-white/10' : 'border-zinc-300 bg-white hover:bg-zinc-100'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {tr(lang, 'refresh')}
          </button>
        </div>
      </div>

      {/* Desktop PC Notice if no physical battery */}
      {!hasBattery && !demoMode && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${isDark ? 'bg-sky-500/10 border-sky-500/25 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'}`}>
          <Monitor className="w-5 h-5 shrink-0 mt-0.5 text-sky-400" />
          <div className="text-xs leading-relaxed">
            <div className="font-bold mb-1">Питание от стационарной сети (АКБ не обнаружена)</div>
            <div>{tr(lang, 'batteryDesktopNotice')}</div>
          </div>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`rounded-2xl border p-3.5 ${cardCls}`}>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
            <span>Заряд</span>
            <Zap className={`w-4 h-4 ${details?.charging ? 'text-emerald-400' : details?.ac_online ? 'text-sky-400' : 'text-amber-400'}`} />
          </div>
          <div className="text-2xl font-mono font-bold">
            {hasBattery ? `${details?.percent ?? 100}%` : 'AC'}
          </div>
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
              : `${details?.chemistry || 'Li-Ion'}${details?.manufacturer ? ` · ${details.manufacturer}` : ''}`}
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
              : hasBattery && !details?.cycle_supported && (details?.cycle_count ?? 0) === 0
              ? 'Не передаётся ACPI контроллером'
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
            {details?.estimated_minutes ? ` · Осталось ~${fmtMinutes(details.estimated_minutes)}` : ''}
          </div>
        </div>
      </div>

      {/* 24h Discharge & Charge SVG Curve */}
      <div className={`rounded-2xl border p-4 ${cardCls}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Activity className="w-4 h-4 text-emerald-400" />
            {tr(lang, 'batteryHistory24h')}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/35 border border-emerald-400" />
              На зарядке
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Уровень заряда %
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${chartData.W} ${chartData.H}`} className="w-full h-44">
            <defs>
              <linearGradient id="lumaBattArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[100, 75, 50, 25, 0].map((val) => {
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
                  <text
                    x={chartData.padL - 5}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill={isDark ? '#71717a' : '#71717a'}
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Green charging highlight zones */}
            {chartData.chargeBands.map((b, i) => (
              <rect
                key={i}
                x={b.x1}
                y={chartData.padT}
                width={Math.max(4, b.x2 - b.x1)}
                height={chartData.usableH}
                fill="rgba(16, 185, 129, 0.16)"
              />
            ))}

            {/* Fill & Stroke */}
            <path d={chartData.areaPath} fill="url(#lumaBattArea)" />
            <path d={chartData.linePath} fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

            {/* Dots & X-axis labels */}
            {chartData.coords.map((c, idx) => {
              const showLabel =
                chartData.coords.length <= 7 ||
                idx === 0 ||
                idx === chartData.coords.length - 1 ||
                idx % Math.ceil(chartData.coords.length / 6) === 0;
              return (
                <g key={idx}>
                  <circle cx={c.x} cy={c.y} r="3" fill={c.charging ? '#34d399' : '#22d3ee'} />
                  {showLabel && (
                    <text
                      x={c.x}
                      y={chartData.H - 5}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#71717a"
                      fontFamily="monospace"
                    >
                      {c.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 7-Day Screen-On Time + Power Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={`rounded-2xl border p-4 ${cardCls}`}>
          <div className="text-xs font-bold mb-3 flex items-center justify-between">
            <span>{tr(lang, 'batteryScreenTime')} · {tr(lang, 'battery7Days')}</span>
            <span className="font-mono text-[11px] text-zinc-500">
              Среднее: {fmtMinutes(Math.round(days.reduce((a, b) => a + b.minutes, 0) / Math.max(1, days.length)))}
            </span>
          </div>
          <div className="h-32 flex items-end justify-between gap-2 pt-4">
            {(days.length > 0 ? days : [{ date: 'today', weekday: 'Сегодня', minutes: todayMin }]).map((d) => {
              const pct = Math.max(10, Math.round((d.minutes / maxDayMin) * 100));
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-mono text-zinc-500">{Math.round(d.minutes / 60 * 10) / 10}ч</span>
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

        <div className={`rounded-2xl border p-4 space-y-3 ${cardCls}`}>
          <div className="text-xs font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--luma-accent)]" />
            Профиль энергопотребления Windows / Luma
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'saver' as const, label: 'Эко', desc: 'Макс. автономность' },
              { id: 'balanced' as const, label: 'Баланс', desc: 'Оптимум Luma' },
              { id: 'performance' as const, label: 'Турбо', desc: 'Макс. FPS / CPU' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectPowerPlan?.(p.id)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  activePowerPlan === p.id
                    ? 'border-[var(--luma-accent)] bg-[var(--luma-accent)]/15'
                    : isDark
                    ? 'border-white/10 hover:bg-white/5'
                    : 'border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div className="text-xs font-bold">{p.label}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
          <div className={`text-[11px] rounded-xl p-2.5 border ${isDark ? 'bg-black/30 border-white/10 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'}`}>
            LumaBatteryEngine автоматически записывает точки разряда каждую минуту в постоянное хранилище <span className="font-mono">battery_history.json</span>.
          </div>
        </div>
      </div>

      {/* Wireless Peripherals Battery Monitor (Bluetooth / BLE / HID Mice, Keyboards, Headphones, Gamepads) */}
      <WirelessBatteriesCard isDark={isDark} cardCls={cardCls} />
    </div>
  );
};

interface WirelessBatRow {
  name: string;
  device_type: string;
  battery_percent: number;
  connected: boolean;
  transport: string;
}

const WirelessBatteriesCard: React.FC<{ isDark: boolean; cardCls: string }> = ({ isDark, cardCls }) => {
  const [devices, setDevices] = useState<WirelessBatRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWireless = async (refresh = false) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/kernel/wireless/batteries${refresh ? '?refresh=1' : ''}`);
      if (r.ok) {
        const d = await r.json();
        setDevices(Array.isArray(d?.devices) ? d.devices : []);
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

  const typeLabel = (t: string) => {
    switch (t) {
      case 'mouse':
        return 'Мышь';
      case 'keyboard':
        return 'Клавиатура';
      case 'headphones':
        return 'Наушники / Аудио';
      case 'gamepad':
        return 'Геймпад';
      case 'watch':
        return 'Часы';
      case 'phone':
        return 'Смартфон';
      default:
        return 'Беспроводное устройство';
    }
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${cardCls}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            Заряд беспроводных устройств (Мыши, Клавиатуры, Наушники, Геймпады)
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Реальный опрос Bluetooth / BLE / HID датчиков заряда ОС ({devices.length} обнаружено)
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
          Беспроводные периферийные устройства с датчиком заряда сейчас не подключены. Как только подключите Bluetooth-наушники, мышь, клавиатуру или геймпад, их процент заряда появится здесь автоматически.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {devices.map((dev, idx) => {
            const pct = Math.max(0, Math.min(100, dev.battery_percent));
            const barColor = pct <= 20 ? 'bg-rose-500' : pct <= 45 ? 'bg-amber-400' : 'bg-emerald-500';
            return (
              <div
                key={`${dev.name}_${idx}`}
                className={`p-3 rounded-xl border space-y-2 ${
                  isDark ? 'bg-black/25 border-white/10' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{dev.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono truncate">
                      {typeLabel(dev.device_type)} · {dev.transport}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-mono font-black shrink-0 ${
                      pct <= 20 ? 'text-rose-400' : pct <= 45 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
