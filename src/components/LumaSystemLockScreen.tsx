import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Battery,
  BatteryCharging,
  Bell,
  Calendar,
  Check,
  CheckSquare,
  CloudSun,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Moon,
  Palette,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  Unlock,
  Volume2,
  X,
} from 'lucide-react';
import type { IslandMediaPlayer, LiveSystemTelemetry } from '../data/launcherData';
import type { CarbonNotificationItem } from './LumaCarbonControlHub';

export type LockWidgetId =
  | 'weather'
  | 'media'
  | 'battery'
  | 'system'
  | 'calendar'
  | 'todo'
  | 'notifications'
  | 'day_progress';

const LOCK_WIDGETS_KEY = 'luma_system_lock_widgets_v181';
const LOCK_TODO_KEY = 'luma_system_lock_note_v181';

const ALL_LOCK_WIDGETS: { id: LockWidgetId; label: string; desc: string }[] = [
  { id: 'weather', label: 'Погода', desc: 'Температура и город' },
  { id: 'media', label: 'Медиаплеер', desc: 'Трек и кнопки управления' },
  { id: 'battery', label: 'Батарея', desc: 'Уровень заряда и питание' },
  { id: 'system', label: 'Система', desc: 'CPU / RAM / GPU в реальном времени' },
  { id: 'calendar', label: 'Календарь', desc: 'Сегодняшний день и дата' },
  { id: 'todo', label: 'Быстрая заметка', desc: 'Напоминание на экране блокировки' },
  { id: 'notifications', label: 'Уведомления', desc: 'Последние входящие сообщения' },
  { id: 'day_progress', label: 'Прогресс дня', desc: 'Пройдено времени суток и Monet' },
];

const DEFAULT_LOCK_WIDGETS: LockWidgetId[] = ['weather', 'media', 'battery', 'system'];

export interface LumaSystemLockScreenProps {
  open: boolean;
  isDark: boolean;
  accentHex: string;
  wallpaperUrl?: string;
  themeBgGradient?: string;
  liveSystem: LiveSystemTelemetry | null;
  islandPlayers: IslandMediaPlayer[];
  activePlayerIndex: number;
  mediaPlaying: boolean;
  notifications: CarbonNotificationItem[];
  onMediaAction?: (action: 'playpause' | 'next' | 'prev') => void;
  onUnlock: () => void;
  onSleep?: () => void;
}

export const LumaSystemLockScreen: React.FC<LumaSystemLockScreenProps> = ({
  open,
  isDark,
  accentHex,
  wallpaperUrl,
  themeBgGradient,
  liveSystem,
  islandPlayers,
  activePlayerIndex,
  mediaPlaying,
  notifications,
  onMediaAction,
  onUnlock,
  onSleep,
}) => {
  const [now, setNow] = useState(() => new Date());
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [unlockingAnim, setUnlockingAnim] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    username: string;
    display_name: string;
    domain: string;
    windows_auth_ready: boolean;
    replace_win_l: boolean;
    has_custom_pin: boolean;
  }>({
    username: 'Пользователь',
    display_name: 'Пользователь',
    domain: 'LUMA-PC',
    windows_auth_ready: false,
    replace_win_l: true,
    has_custom_pin: false,
  });

  const [widgets, setWidgets] = useState<LockWidgetId[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCK_WIDGETS_KEY) || 'null');
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return DEFAULT_LOCK_WIDGETS;
  });
  const [editWidgetsOpen, setEditWidgetsOpen] = useState(false);
  const [quickNote, setQuickNote] = useState(() => {
    try {
      return localStorage.getItem(LOCK_TODO_KEY) || 'Проверить почту · Подготовить отчёт';
    } catch {
      return 'Проверить почту · Подготовить отчёт';
    }
  });
  const [weatherInfo, setWeatherInfo] = useState<{ temp: number; city: string; label: string }>({
    temp: 18,
    city: liveSystem?.location?.city || 'Москва',
    label: 'Ясно',
  });

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LOCK_WIDGETS_KEY, JSON.stringify(widgets));
    } catch {}
  }, [widgets]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCK_TODO_KEY, quickNote);
    } catch {}
  }, [quickNote]);

  // Live clock tick while locked
  useEffect(() => {
    if (!open) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  // Load real Windows user identity + lock status on open
  useEffect(() => {
    if (!open) return;
    setPassword('');
    setErrorMsg('');
    setUnlockingAnim(false);
    setEditWidgetsOpen(false);
    fetch('/api/kernel/lock/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: true }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setUserInfo({
            username: d.username || 'Пользователь',
            display_name: d.display_name || d.username || 'Пользователь',
            domain: d.domain || 'Windows',
            windows_auth_ready: Boolean(d.windows_auth_ready),
            replace_win_l: d.replace_win_l !== false,
            has_custom_pin: Boolean(d.has_custom_pin),
          });
        }
      })
      .catch(() => {});

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
  }, [open]);

  // Fetch lightweight weather for the lock screen widget if coordinates exist
  useEffect(() => {
    if (!open || !widgets.includes('weather')) return;
    const lat = liveSystem?.location?.latitude || 55.7558;
    const lon = liveSystem?.location?.longitude || 37.6173;
    const city = liveSystem?.location?.city || 'Локально';
    let alive = true;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.current_weather) return;
        const code = Number(d.current_weather.weathercode || 0);
        const label = code === 0 ? 'Ясно' : code <= 3 ? 'Облачно' : code <= 67 ? 'Дождь' : 'Снег';
        setWeatherInfo({
          temp: Math.round(Number(d.current_weather.temperature || 18)),
          city,
          label,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, widgets, liveSystem?.location?.latitude, liveSystem?.location?.longitude, liveSystem?.location?.city]);

  const timeStr = useMemo(
    () => now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    [now]
  );
  const dateStr = useMemo(() => {
    const raw = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [now]);

  const dayPct = useMemo(() => {
    const mins = now.getHours() * 60 + now.getMinutes();
    return Math.round((mins / 1440) * 100);
  }, [now]);

  const activePlayer = islandPlayers[activePlayerIndex] || islandPlayers[0] || null;

  const handleSubmitUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (verifying) return;
    setVerifying(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/kernel/lock/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setUnlockingAnim(true);
        window.setTimeout(() => {
          setPassword('');
          onUnlock();
        }, 260);
        return;
      }
      setErrorMsg(data?.error || 'Неверный пароль учётной записи Windows');
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      inputRef.current?.select();
    } catch {
      setErrorMsg('Ошибка проверки пароля. Попробуйте ещё раз.');
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
    } finally {
      setVerifying(false);
    }
  };

  const toggleWidget = (id: LockWidgetId) => {
    setWidgets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const moveWidget = (id: LockWidgetId, dir: -1 | 1) => {
    setWidgets((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const [m] = next.splice(i, 1);
      next.splice(j, 0, m);
      return next;
    });
  };

  const toggleReplaceWinL = async () => {
    const next = !userInfo.replace_win_l;
    setUserInfo((u) => ({ ...u, replace_win_l: next }));
    try {
      await fetch('/api/kernel/lock/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replace_win_l: next }),
      });
    } catch {}
  };

  if (!open) return null;

  const safeAccent = accentHex || '#10b981';
  const cardGlass = isDark
    ? 'bg-slate-950/55 border-white/16 text-white'
    : 'bg-white/62 border-white/60 text-slate-900';
  const subText = isDark ? 'text-white/70' : 'text-slate-700/80';

  return (
    <div
      className={`fixed inset-0 z-[5000] flex flex-col justify-between overflow-hidden select-none transition-all duration-300 ${
        unlockingAnim ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundImage: wallpaperUrl
          ? `url("${wallpaperUrl}")`
          : themeBgGradient || 'linear-gradient(135deg, #090d18 0%, #0f1c2e 50%, #0b2434 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Fluorine Optical Glass Vignette + Ambient Monet Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backdropFilter: 'blur(26px) saturate(145%)',
          WebkitBackdropFilter: 'blur(26px) saturate(145%)',
          background: isDark
            ? `radial-gradient(circle at 50% 18%, ${safeAccent}33 0%, rgba(7,10,18,0.58) 55%, rgba(5,8,15,0.82) 100%)`
            : `radial-gradient(circle at 50% 18%, ${safeAccent}28 0%, rgba(248,250,255,0.45) 55%, rgba(226,236,248,0.72) 100%)`,
        }}
      />

      <style>{`
        @keyframes lumaLockShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .luma-lock-shake { animation: lumaLockShake 0.38s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
      `}</style>

      {/* TOP STATUS BAR */}
      <div className="relative z-10 flex items-center justify-between px-7 pt-5">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-xl text-xs font-semibold ${cardGlass}`}>
          <Lock size={13} style={{ color: safeAccent }} />
          <span>Luma OS 1.8.1 · Экран блокировки</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditWidgetsOpen((v) => !v)}
            className={`px-3 py-1.5 rounded-full border backdrop-blur-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition hover:scale-[1.03] ${cardGlass}`}
            title="Настроить виджеты экрана блокировки"
          >
            <Sliders size={13} style={{ color: safeAccent }} />
            Виджеты ({widgets.length})
          </button>
          <button
            type="button"
            onClick={() => void toggleReplaceWinL()}
            className={`px-3 py-1.5 rounded-full border backdrop-blur-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${cardGlass}`}
            title="Перехватывать нажатие Win + L для открытия этого экрана блокировки"
          >
            <KeyRound size={13} style={{ color: userInfo.replace_win_l ? safeAccent : undefined }} />
            Win + L: {userInfo.replace_win_l ? 'Вкл' : 'Выкл'}
          </button>
        </div>
      </div>

      {/* CENTER HERO: SCULPTED CLOCK + WINDOWS ACCOUNT PASSWORD UNLOCK + LOCK WIDGETS */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4 gap-6 overflow-y-auto">
        {/* Clock & Date */}
        <div className="text-center space-y-1">
          <div
            className={`text-[84px] sm:text-[106px] font-black tracking-tight leading-none drop-shadow-[0_10px_32px_rgba(0,0,0,0.4)] ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {timeStr}
          </div>
          <div className={`text-lg sm:text-xl font-semibold tracking-wide drop-shadow ${isDark ? 'text-white/85' : 'text-slate-800'}`}>
            {dateStr}
          </div>
        </div>

        {/* Real Windows Account Password Card */}
        <form
          onSubmit={(e) => void handleSubmitUnlock(e)}
          className={`w-full max-w-[380px] rounded-[28px] border backdrop-blur-2xl p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] space-y-3.5 ${cardGlass} ${
            shake ? 'luma-lock-shake' : ''
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-black shadow-lg shrink-0"
              style={{
                background: `linear-gradient(135deg, ${safeAccent}, #06b6d4)`,
                boxShadow: `0 8px 24px ${safeAccent}55`,
              }}
            >
              {(userInfo.display_name || 'U').trim().slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold truncate">{userInfo.display_name}</div>
              <div className={`text-[11px] flex items-center gap-1.5 truncate ${subText}`}>
                <ShieldCheck size={12} style={{ color: safeAccent }} />
                <span>
                  {userInfo.windows_auth_ready
                    ? `Учётная запись Windows (${userInfo.domain})`
                    : `Локальный профиль · ${userInfo.domain}`}
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder={
                userInfo.windows_auth_ready
                  ? 'Введите пароль Windows...'
                  : 'Введите пароль (или Enter)...'
              }
              autoComplete="current-password"
              className={`w-full h-11 pl-4 pr-10 rounded-2xl border text-sm outline-none transition ${
                isDark
                  ? 'bg-white/10 border-white/18 text-white placeholder:text-white/45 focus:border-white/45'
                  : 'bg-white/85 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-70 hover:opacity-100 cursor-pointer"
              title={showPass ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {errorMsg && (
            <div className="text-[11px] font-semibold text-rose-400 bg-rose-500/12 border border-rose-400/30 rounded-xl px-3 py-1.5">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={verifying}
            className="w-full h-10 rounded-2xl text-white text-xs font-extrabold tracking-wide flex items-center justify-center gap-2 cursor-pointer transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, ${safeAccent}, #2563eb)`,
              boxShadow: `0 10px 26px ${safeAccent}45`,
            }}
          >
            <Unlock size={14} />
            {verifying ? 'Проверка пароля Windows...' : 'Разблокировать'}
          </button>
        </form>

        {/* CUSTOMIZABLE LOCK SCREEN WIDGETS ROW */}
        {widgets.length > 0 && (
          <div className="w-full max-w-[920px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {widgets.map((wid) => {
              if (wid === 'weather') {
                return (
                  <div key={wid} className={`rounded-[22px] border backdrop-blur-2xl p-3.5 flex items-center justify-between gap-3 ${cardGlass}`}>
                    <div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${subText}`}>Погода</div>
                      <div className="text-2xl font-black leading-tight">{weatherInfo.temp}°C</div>
                      <div className={`text-[11px] truncate ${subText}`}>{weatherInfo.city} · {weatherInfo.label}</div>
                    </div>
                    <CloudSun size={30} style={{ color: safeAccent }} className="shrink-0" />
                  </div>
                );
              }
              if (wid === 'media') {
                return (
                  <div key={wid} className={`rounded-[22px] border backdrop-blur-2xl p-3.5 flex flex-col justify-between gap-2 ${cardGlass}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Volume2 size={15} style={{ color: safeAccent }} className="shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{activePlayer?.track || 'Медиа на паузе'}</div>
                        <div className={`text-[10px] truncate ${subText}`}>{activePlayer?.artist || 'Плеер ПК'}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-around pt-0.5">
                      <button type="button" onClick={() => onMediaAction?.('prev')} className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer">
                        <SkipBack size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMediaAction?.('playpause')}
                        className="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer shadow"
                        style={{ backgroundColor: safeAccent }}
                      >
                        {mediaPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                      </button>
                      <button type="button" onClick={() => onMediaAction?.('next')} className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer">
                        <SkipForward size={14} />
                      </button>
                    </div>
                  </div>
                );
              }
              if (wid === 'battery') {
                const pct = liveSystem?.battery_present ? Math.round(liveSystem.battery_percent || 0) : 100;
                const chg = Boolean(liveSystem?.battery_charging);
                return (
                  <div key={wid} className={`rounded-[22px] border backdrop-blur-2xl p-3.5 flex flex-col justify-between gap-2 ${cardGlass}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${subText}`}>Питание</span>
                      {chg ? <BatteryCharging size={18} className="text-emerald-400" /> : <Battery size={18} style={{ color: safeAccent }} />}
                    </div>
                    <div className="text-xl font-black">
                      {liveSystem?.battery_present ? `${pct}%` : 'От сети'}
                    </div>
                    <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: safeAccent }} />
                    </div>
                  </div>
                );
              }
              if (wid === 'system') {
                const cpu = Math.round(liveSystem?.cpu_percent || 0);
                const ram = Math.round(liveSystem?.ram_percent || 0);
                return (
                  <div key={wid} className={`rounded-[22px] border backdrop-blur-2xl p-3.5 space-y-2 ${cardGlass}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${subText}`}>Система</span>
                      <Activity size={14} style={{ color: safeAccent }} />
                    </div>
                    <div className="space-y-1 text-[11px] font-mono">
                      <div className="flex justify-between"><span>CPU</span><span className="font-bold">{cpu}%</span></div>
                      <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, cpu)}%`, backgroundColor: safeAccent }} />
                      </div>
                      <div className="flex justify-between pt-0.5"><span>RAM</span><span className="font-bold">{ram}%</span></div>
                      <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                        <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, ram)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              }
              if (wid === 'calendar') {
                return (
                  <div key={wid} className={`rounded-[22px] border backdrop-blur-2xl p-3.5 flex items-center gap-3 ${cardGlass}`}>
                    <div
                      className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center text-white font-black shrink-0"
                      style={{ backgroundColor: safeAccent }}
                    >
                      <span className="text-[9px] uppercase opacity-85">
                        {now.toLocaleDateString('ru-RU', { month: 'short' })}
                      </span>
                      <span className="text-base leading-none">{now.getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold flex items-center gap-1"><Calendar size={12} /> Сегодня</div>
                      <div className={`text-[11px] truncate ${subText}`}>{dateStr}</div>
                    </div>
                  </div>
                );
              }
              if (wid === 'todo') {
                return (
                  <div key={wid} className={`rounded-[22px] border backdrop-blur-2xl p-3.5 space-y-1.5 ${cardGlass}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${subText}`}>Заметка</span>
                      <CheckSquare size={14} style={{ color: safeAccent }} />
                    </div>
                    <input
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      className={`w-full bg-transparent text-xs font-medium outline-none border-b border-white/15 pb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}
                      placeholder="Важная заметка..."
                    />
                  </div>
                );
              }
              if (wid === 'notifications') {
                const latest = notifications[0];
                return (
                  <div key={wid} className={`rounded-[22px] border backdrop-blur-2xl p-3.5 space-y-1 ${cardGlass}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${subText}`}>Уведомления ({notifications.length})</span>
                      <Bell size={14} style={{ color: safeAccent }} />
                    </div>
                    {latest ? (
                      <>
                        <div className="text-xs font-bold truncate">{latest.sender || latest.title}</div>
                        <div className={`text-[11px] truncate ${subText}`}>{latest.body}</div>
                      </>
                    ) : (
                      <div className={`text-[11px] ${subText}`}>Нет новых сообщений</div>
                    )}
                  </div>
                );
              }
              // day_progress
              return (
                <div key={wid} className={`rounded-[22px] border backdrop-blur-2xl p-3.5 space-y-2 ${cardGlass}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${subText}`}>Прогресс дня</span>
                    <Palette size={14} style={{ color: safeAccent }} />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black">{dayPct}%</span>
                    <span className={`text-[10px] font-mono ${subText}`}>Monet {safeAccent}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${dayPct}%`, backgroundColor: safeAccent }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LOCK SCREEN WIDGET CUSTOMIZER DRAWER */}
      {editWidgetsOpen && (
        <div className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-4">
          <div className={`w-full max-w-[680px] rounded-[26px] border backdrop-blur-3xl p-4 shadow-2xl space-y-3 ${cardGlass}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <Sparkles size={14} style={{ color: safeAccent }} /> Настройка виджетов экрана блокировки
              </span>
              <button
                type="button"
                onClick={() => setEditWidgetsOpen(false)}
                className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold cursor-pointer flex items-center gap-1"
              >
                <Check size={12} /> Готово
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_LOCK_WIDGETS.map((w) => {
                const active = widgets.includes(w.id);
                return (
                  <div
                    key={w.id}
                    className={`p-2.5 rounded-2xl border transition flex flex-col gap-1.5 ${
                      active
                        ? 'border-emerald-400/60 bg-emerald-500/18'
                        : isDark
                        ? 'border-white/12 bg-white/5 hover:bg-white/10'
                        : 'border-slate-300 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleWidget(w.id)}
                      className="text-left flex items-center justify-between gap-1 cursor-pointer"
                    >
                      <span className="text-[11px] font-bold truncate">{w.label}</span>
                      {active ? <X size={12} className="text-rose-400 shrink-0" /> : <Plus size={12} className="text-emerald-400 shrink-0" />}
                    </button>
                    <div className={`text-[9.5px] leading-tight ${subText}`}>{w.desc}</div>
                    {active && (
                      <div className="flex items-center gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => moveWidget(w.id, -1)}
                          className="flex-1 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[9px] font-bold cursor-pointer"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => moveWidget(w.id, 1)}
                          className="flex-1 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[9px] font-bold cursor-pointer"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM POWER & SYSTEM ACTIONS */}
      <div className="relative z-10 flex items-center justify-between px-7 pb-5 text-xs">
        <div className={`text-[11px] font-medium ${subText}`}>
          {userInfo.windows_auth_ready
            ? 'Проверка пароля выполняется напрямую через службу входа Windows'
            : 'Нажмите Enter или «Разблокировать»'}
        </div>
        <div className="flex items-center gap-2">
          {onSleep && (
            <button
              type="button"
              onClick={onSleep}
              className={`px-3 py-1.5 rounded-full border backdrop-blur-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition hover:brightness-110 ${cardGlass}`}
              title="Перевести ПК в спящий режим"
            >
              <Moon size={13} /> Сон
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              fetch('/api/kernel/lock/native-windows-lock', { method: 'POST' }).catch(() => {});
            }}
            className={`px-3 py-1.5 rounded-full border backdrop-blur-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition hover:brightness-110 ${cardGlass}`}
            title="Перейти на стандартный экран блокировки Windows"
          >
            <Lock size={13} /> Экран Windows
          </button>
        </div>
      </div>
    </div>
  );
};
