import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Download,
  Flame,
  Lock,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Square,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { AppItem, formatDurationRu, formatLiveClock, HostWindowInfo } from '../data/launcherData';

export interface HostAppUsageEntry {
  key: string;
  name: string;
  category: string;
  secondsToday: number;
  dailyLimitMinutes: number;
  iconUrl?: string;
  isLive: boolean;
  pid?: number;
}

interface LumaTrackerWindowProps {
  isDark: boolean;
  apps: AppItem[];
  hostWindows: HostWindowInfo[];
  hostUsageSeconds: Record<string, { name: string; seconds: number; category: string; iconUrl?: string }>;
  hostLimitsMinutes: Record<string, number>;
  dailyHistoryMinutes: Record<string, number>;
  strictFocusLock: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  onChangeAppLimit: (appId: string, minutes: number) => void;
  onChangeHostLimit: (key: string, minutes: number) => void;
  onToggleStrictLock: () => void;
  onStopLumaApp: (appId: string) => void;
  onKillHostPid: (pid: number) => void;
  onPushToast: (title: string, msg: string, type?: 'info' | 'warning' | 'success') => void;
}

const LIMIT_PRESETS = [
  { label: '30м', min: 30 },
  { label: '1ч', min: 60 },
  { label: '2ч', min: 120 },
  { label: '3ч', min: 180 },
  { label: '4ч', min: 240 },
  { label: '∞', min: 0 },
];

const PRODUCTIVE_CATEGORIES = new Set(['Dev', 'Code', 'Work', 'System', 'Tools', 'Office', 'AI', 'Browser']);

function formatMinShort(sec: number): string {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}м ${sec % 60}с`;
  const h = Math.floor(m / 60);
  return `${h}ч ${m % 60}м`;
}

export const LumaTrackerWindow: React.FC<LumaTrackerWindowProps> = React.memo(
  ({
    isDark,
    apps,
    hostWindows,
    hostUsageSeconds,
    hostLimitsMinutes,
    dailyHistoryMinutes,
    strictFocusLock,
    surfaceCls,
    btnCls,
    mutedCls,
    onChangeAppLimit,
    onChangeHostLimit,
    onToggleStrictLock,
    onStopLumaApp,
    onKillHostPid,
    onPushToast,
  }) => {
    const [tab, setTab] = useState<'overview' | 'limits' | 'focus'>('overview');
    const [focusDurationMin, setFocusDurationMin] = useState<number>(25);
    const [focusLeftSec, setFocusLeftSec] = useState<number>(25 * 60);
    const [focusRunning, setFocusRunning] = useState(false);
    const [focusCompleted, setFocusCompleted] = useState(0);

    useEffect(() => {
      if (!focusRunning) return;
      const id = window.setInterval(() => {
        setFocusLeftSec((prev) => {
          if (prev <= 1) {
            setFocusRunning(false);
            setFocusCompleted((c) => c + 1);
            onPushToast('Фокус-сессия завершена!', `Вы успешно отработали ${focusDurationMin} мин в режиме глубокого фокуса.`, 'success');
            return focusDurationMin * 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }, [focusRunning, focusDurationMin, onPushToast]);

    // Merge Luma apps + real Windows host apps into one clean analytics list
    const hostEntries = useMemo<HostAppUsageEntry[]>(() => {
      const liveByKey = new Map<string, HostWindowInfo>();
      for (const hw of hostWindows) {
        if (hw.is_self) continue;
        const k = (hw.friendly_name || hw.name).trim().toLowerCase();
        if (!liveByKey.has(k)) liveByKey.set(k, hw);
      }

      const keys = new Set<string>([...Object.keys(hostUsageSeconds), ...liveByKey.keys()]);
      const rows: HostAppUsageEntry[] = [];
      for (const key of keys) {
        const stored = hostUsageSeconds[key];
        const live = liveByKey.get(key);
        const name = live?.friendly_name || live?.name || stored?.name || key;
        const sec = stored?.seconds ?? 0;
        const limit = hostLimitsMinutes[key] ?? 0;
        rows.push({
          key,
          name,
          category: stored?.category || 'Windows',
          secondsToday: sec,
          dailyLimitMinutes: limit,
          iconUrl: live?.icon_url || stored?.iconUrl,
          isLive: Boolean(live),
          pid: live?.pid,
        });
      }
      return rows.sort((a, b) => Number(b.isLive) - Number(a.isLive) || b.secondsToday - a.secondsToday);
    }, [hostWindows, hostUsageSeconds, hostLimitsMinutes]);

    const lumaTotalSec = useMemo(
      () => apps.reduce((acc, a) => acc + a.todayMinutes * 60 + a.elapsedSeconds, 0),
      [apps]
    );
    const hostTotalSec = useMemo(
      () => hostEntries.reduce((acc, h) => acc + h.secondsToday, 0),
      [hostEntries]
    );
    const totalTodaySec = lumaTotalSec + hostTotalSec;

    // Productivity score
    const productivityPct = useMemo(() => {
      let prod = 0;
      let total = 0;
      for (const a of apps) {
        const s = a.todayMinutes * 60 + a.elapsedSeconds;
        total += s;
        if (PRODUCTIVE_CATEGORIES.has(a.category)) prod += s;
      }
      for (const h of hostEntries) {
        total += h.secondsToday;
        const lower = h.name.toLowerCase();
        if (
          PRODUCTIVE_CATEGORIES.has(h.category) ||
          lower.includes('code') ||
          lower.includes('studio') ||
          lower.includes('terminal') ||
          lower.includes('word') ||
          lower.includes('excel') ||
          lower.includes('figma')
        ) {
          prod += h.secondsToday;
        }
      }
      if (total <= 0) return 100;
      return Math.min(100, Math.max(15, Math.round((prod / total) * 100)));
    }, [apps, hostEntries]);

    // 7-day chart
    const last7Days = useMemo(() => {
      const days: { key: string; label: string; minutes: number }[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('ru-RU', { weekday: 'short' });
        const mins = i === 0 ? Math.max(dailyHistoryMinutes[key] || 0, Math.round(totalTodaySec / 60)) : dailyHistoryMinutes[key] || 0;
        days.push({ key, label, minutes: mins });
      }
      return days;
    }, [dailyHistoryMinutes, totalTodaySec]);

    const maxDayMin = Math.max(30, ...last7Days.map((d) => d.minutes));

    // Category breakdown
    const categoryTotals = useMemo(() => {
      const map: Record<string, number> = {};
      for (const a of apps) {
        const s = a.todayMinutes * 60 + a.elapsedSeconds;
        if (s > 0) map[a.category] = (map[a.category] || 0) + s;
      }
      for (const h of hostEntries) {
        if (h.secondsToday > 0) map[h.category] = (map[h.category] || 0) + h.secondsToday;
      }
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
    }, [apps, hostEntries]);

    // Over-limit alerts count
    const overLimitCount = useMemo(() => {
      let c = 0;
      for (const a of apps) {
        if (a.dailyLimitMinutes > 0 && a.todayMinutes * 60 + a.elapsedSeconds >= a.dailyLimitMinutes * 60) c++;
      }
      for (const h of hostEntries) {
        if (h.dailyLimitMinutes > 0 && h.secondsToday >= h.dailyLimitMinutes * 60) c++;
      }
      return c;
    }, [apps, hostEntries]);

    const exportCsv = () => {
      const lines = ['Источник,Приложение,Категория,Сегодня (мин),Лимит (мин),Статус'];
      for (const a of apps) {
        const mins = Math.round((a.todayMinutes * 60 + a.elapsedSeconds) / 60);
        lines.push(`Luma,"${a.name}","${a.category}",${mins},${a.dailyLimitMinutes},${a.isRunning ? 'Активно' : 'Остановлено'}`);
      }
      for (const h of hostEntries) {
        const mins = Math.round(h.secondsToday / 60);
        lines.push(`Windows,"${h.name}","${h.category}",${mins},${h.dailyLimitMinutes},${h.isLive ? 'Открыто' : 'Закрыто'}`);
      }
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luma_tracker_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onPushToast('Трекер сессий 2.0', 'Отчёт активности сохранён в CSV', 'success');
    };

    const focusMM = String(Math.floor(focusLeftSec / 60)).padStart(2, '0');
    const focusSS = String(focusLeftSec % 60).padStart(2, '0');
    const focusPct = Math.round(((focusDurationMin * 60 - focusLeftSec) / Math.max(1, focusDurationMin * 60)) * 100);

    return (
      <div className="h-full flex flex-col gap-3 p-4 overflow-y-auto">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {[
              { id: 'overview' as const, label: 'Обзор и Аналитика', icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { id: 'limits' as const, label: `Лимиты (${overLimitCount})`, icon: <ShieldAlert className="w-3.5 h-3.5" /> },
              { id: 'focus' as const, label: 'Фокус-сессия', icon: <Timer className="w-3.5 h-3.5" /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                  tab === t.id ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleStrictLock}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                strictFocusLock
                  ? 'bg-rose-500/20 border-rose-500/45 text-rose-400'
                  : btnCls
              }`}
              title="Предупреждать и предлагать закрывать программы при превышении дневного лимита"
            >
              <Lock className="w-3.5 h-3.5" />
              Строгий контроль: {strictFocusLock ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
            <button
              onClick={exportCsv}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className={`p-3 rounded-2xl border ${surfaceCls}`}>
            <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>Сегодня всего</div>
            <div className="text-xl font-mono font-black mt-0.5 text-[var(--luma-accent)]">
              {formatMinShort(totalTodaySec)}
            </div>
            <div className={`text-[10px] font-mono ${mutedCls}`}>Luma + Окна Windows</div>
          </div>
          <div className={`p-3 rounded-2xl border ${surfaceCls}`}>
            <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>Активных окон</div>
            <div className="text-xl font-mono font-black mt-0.5 text-emerald-400">
              {apps.filter((a) => a.isRunning).length + hostWindows.filter((w) => !w.is_self).length}
            </div>
            <div className={`text-[10px] font-mono ${mutedCls}`}>В реальном времени</div>
          </div>
          <div className={`p-3 rounded-2xl border ${surfaceCls}`}>
            <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>Продуктивность</div>
            <div className="text-xl font-mono font-black mt-0.5 text-cyan-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {productivityPct}%
            </div>
            <div className={`text-[10px] font-mono ${mutedCls}`}>Индекс фокуса</div>
          </div>
          <div className={`p-3 rounded-2xl border ${surfaceCls}`}>
            <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>Превышений лимита</div>
            <div className={`text-xl font-mono font-black mt-0.5 ${overLimitCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {overLimitCount}
            </div>
            <div className={`text-[10px] font-mono ${mutedCls}`}>Фокус-сессий: {focusCompleted}</div>
          </div>
        </div>

        {/* TAB 1: OVERVIEW + 7-DAY ANALYTICS + LIVE WINDOWS */}
        {tab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* 7-Day Activity Bar Chart */}
              <div className={`p-4 rounded-2xl border ${surfaceCls}`}>
                <div className="flex items-center justify-between text-xs font-bold mb-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                    Активность за 7 дней
                  </span>
                  <span className={`font-mono text-[10px] ${mutedCls}`}>Минут в день</span>
                </div>
                <div className="h-32 flex items-end justify-between gap-2 pt-3">
                  {last7Days.map((d, idx) => {
                    const hPct = Math.max(8, Math.round((d.minutes / maxDayMin) * 100));
                    const isToday = idx === last7Days.length - 1;
                    return (
                      <div key={d.key} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
                        <span className="text-[10px] font-mono opacity-70">{d.minutes}м</span>
                        <div className="w-full max-w-[34px] flex-1 flex items-end">
                          <div
                            className={`w-full rounded-t-lg transition-all duration-300 ${
                              isToday ? 'bg-[var(--luma-accent)]' : 'bg-emerald-500/55'
                            }`}
                            style={{ height: `${hPct}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-mono ${isToday ? 'font-bold text-[var(--luma-accent)]' : mutedCls}`}>
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Разбивка по категориям сегодня
                </div>
                {categoryTotals.length === 0 ? (
                  <div className={`py-8 text-center text-xs ${mutedCls}`}>
                    Откройте любые приложения Windows или Luma — трекер автоматически запишет время!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoryTotals.map(([cat, secs]) => {
                      const pct = Math.min(100, Math.round((secs / Math.max(1, totalTodaySec)) * 100));
                      return (
                        <div key={cat} className="space-y-1 text-xs">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span className="font-semibold">{cat}</span>
                            <span>
                              {formatMinShort(secs)} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--luma-accent)]" style={{ width: `${Math.max(4, pct)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Real Windows Apps Live Session List */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Отслеживаемые приложения Windows ({hostEntries.length})</span>
                <span className={`text-[10px] font-mono ${mutedCls}`}>Автоучёт открытых окон каждые 15 сек</span>
              </div>
              {hostEntries.length === 0 ? (
                <div className={`py-5 text-center text-xs ${mutedCls}`}>
                  Нет сторонних открытых окон Windows в текущей сессии.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {hostEntries.slice(0, 12).map((h) => {
                    const pct = h.dailyLimitMinutes > 0 ? Math.min(100, Math.round((h.secondsToday / (h.dailyLimitMinutes * 60)) * 100)) : 0;
                    const over = h.dailyLimitMinutes > 0 && h.secondsToday >= h.dailyLimitMinutes * 60;
                    return (
                      <div key={h.key} className={`p-2.5 rounded-xl border space-y-1.5 text-xs ${over ? 'border-rose-500/50 bg-rose-500/10' : btnCls}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {h.iconUrl ? (
                              <img src={h.iconUrl} alt="" className="w-5 h-5 rounded object-contain shrink-0" />
                            ) : (
                              <span className={`w-2 h-2 rounded-full shrink-0 ${h.isLive ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                            )}
                            <span className="font-bold truncate">{h.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                            <span className={h.isLive ? 'text-emerald-400 font-bold' : ''}>{formatMinShort(h.secondsToday)}</span>
                            {over && h.isLive && h.pid && (
                              <button
                                onClick={() => onKillHostPid(h.pid!)}
                                className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                title="Закрыть приложение (лимит исчерпан)"
                              >
                                Закрыть
                              </button>
                            )}
                          </div>
                        </div>
                        {h.dailyLimitMinutes > 0 && (
                          <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${over ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.max(3, pct)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PER-APP DAILY LIMITS (LUMA + WINDOWS) */}
        {tab === 'limits' && (
          <div className="space-y-3">
            {/* Windows apps limits */}
            {hostEntries.length > 0 && (
              <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
                <div className="text-xs font-bold">Лимиты для реальных приложений Windows</div>
                <div className="space-y-2">
                  {hostEntries.map((h) => {
                    const pct = h.dailyLimitMinutes > 0 ? Math.min(100, Math.round((h.secondsToday / (h.dailyLimitMinutes * 60)) * 100)) : 0;
                    const over = h.dailyLimitMinutes > 0 && h.secondsToday >= h.dailyLimitMinutes * 60;
                    return (
                      <div key={`lim_h_${h.key}`} className={`p-3 rounded-xl border space-y-2 text-xs ${over ? 'border-rose-500/45 bg-rose-500/10' : btnCls}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {h.iconUrl && <img src={h.iconUrl} alt="" className="w-5 h-5 object-contain shrink-0" />}
                            <span className="font-bold truncate">{h.name}</span>
                            {over && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-mono inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> ЛИМИТ
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {LIMIT_PRESETS.map((p) => (
                              <button
                                key={p.label}
                                onClick={() => onChangeHostLimit(h.key, p.min)}
                                className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono cursor-pointer ${
                                  h.dailyLimitMinutes === p.min
                                    ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-bold'
                                    : btnCls
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
                          <span>Сегодня: {formatMinShort(h.secondsToday)}</span>
                          <span>Лимит: {h.dailyLimitMinutes > 0 ? `${h.dailyLimitMinutes} мин (${pct}%)` : 'Без лимита'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Luma catalog apps limits */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
              <div className="text-xs font-bold">Лимиты для приложений каталога Luma</div>
              <div className="space-y-2">
                {apps.map((app) => {
                  const totalSec = app.todayMinutes * 60 + app.elapsedSeconds;
                  const pct = app.dailyLimitMinutes > 0 ? Math.min(100, Math.round((totalSec / (app.dailyLimitMinutes * 60)) * 100)) : 0;
                  const over = app.dailyLimitMinutes > 0 && totalSec >= app.dailyLimitMinutes * 60;
                  return (
                    <div key={app.id} className={`p-3 rounded-xl border space-y-2 text-xs ${over ? 'border-rose-500/45 bg-rose-500/10' : btnCls}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold truncate">{app.name}</span>
                          <span className={`text-[10px] font-mono ${mutedCls}`}>{app.category}</span>
                          {app.isRunning && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono">
                              LIVE {formatLiveClock(app.elapsedSeconds)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {LIMIT_PRESETS.map((p) => (
                            <button
                              key={p.label}
                              onClick={() => onChangeAppLimit(app.id, p.min)}
                              className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono cursor-pointer ${
                                app.dailyLimitMinutes === p.min
                                  ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-bold'
                                  : btnCls
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                          {app.isRunning && (
                            <button
                              onClick={() => onStopLumaApp(app.id)}
                              className="p-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white cursor-pointer"
                              title="Остановить сессию"
                            >
                              <Square className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${over ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-400' : 'bg-[var(--luma-accent)]'}`}
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono opacity-75">
                        <span>Сегодня: {formatDurationRu(app.todayMinutes, app.elapsedSeconds)}</span>
                        <span>Лимит: {app.dailyLimitMinutes > 0 ? `${app.dailyLimitMinutes} мин (${pct}%)` : 'Без лимита'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEEP WORK FOCUS SESSION */}
        {tab === 'focus' && (
          <div className={`p-6 rounded-2xl border flex flex-col items-center text-center gap-4 ${surfaceCls}`}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] text-[11px] font-mono font-bold">
              <Flame className="w-3.5 h-3.5" />
              РЕЖИМ ГЛУБОКОГО ФОКУСА · DEEP WORK
            </div>

            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="8" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="var(--luma-accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={326.7}
                  strokeDashoffset={326.7 * (1 - focusPct / 100)}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-mono font-black tracking-tight">
                  {focusMM}:{focusSS}
                </div>
                <div className={`text-[10px] font-mono ${mutedCls}`}>{focusPct}% выполнено</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {[15, 25, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setFocusRunning(false);
                    setFocusDurationMin(m);
                    setFocusLeftSec(m * 60);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                    focusDurationMin === m ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                  }`}
                >
                  {m} мин
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFocusRunning((v) => !v)}
                className="px-6 py-2.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                {focusRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {focusRunning ? 'Пауза' : 'Начать фокус-сессию'}
              </button>
              <button
                onClick={() => {
                  setFocusRunning(false);
                  setFocusLeftSec(focusDurationMin * 60);
                }}
                className={`p-2.5 rounded-xl border cursor-pointer ${btnCls}`}
                title="Сбросить"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className={`text-xs max-w-md ${mutedCls}`}>
              Завершённых фокус-сессий сегодня: <strong className={isDark ? 'text-white' : 'text-zinc-900'}>{focusCompleted}</strong>. По окончании сессии система отправит крупное уведомление справа.
            </div>
          </div>
        )}
      </div>
    );
  }
);
