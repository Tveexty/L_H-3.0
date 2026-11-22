import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Flag,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Sparkles,
  Timer,
  Trash2,
  Upload,
} from 'lucide-react';

export interface LumaCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  title: string;
  note?: string;
  color: string;
  done?: boolean;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  priority?: 'normal' | 'important' | 'urgent';
}

interface LumaCalendarWindowProps {
  isDark: boolean;
  accentHex?: string;
  onNotify?: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

const STORAGE_KEY = 'luma_calendar_events_v1';

const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const COLOR_TAGS = [
  { id: 'cyan', hex: '#06b6d4', label: 'Carbon Циан' },
  { id: 'indigo', hex: '#6366f1', label: 'Индиго' },
  { id: 'emerald', hex: '#10b981', label: 'Изумруд' },
  { id: 'rose', hex: '#f43f5e', label: 'Рубин' },
  { id: 'amber', hex: '#f59e0b', label: 'Янтарь' },
  { id: 'violet', hex: '#a855f7', label: 'Фиолет' },
];

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function eventOccursOnDate(ev: LumaCalendarEvent, dateStr: string): boolean {
  if (ev.date === dateStr) return true;
  if (!ev.repeat || ev.repeat === 'none') return false;
  if (dateStr < ev.date) return false;
  const [ey, em, ed] = ev.date.split('-').map(Number);
  const [ty, tm, td] = dateStr.split('-').map(Number);
  if (!ey || !ty) return false;
  const startDt = new Date(ey, em - 1, ed);
  const targetDt = new Date(ty, tm - 1, td);
  if (ev.repeat === 'daily') return true;
  if (ev.repeat === 'weekly') return startDt.getDay() === targetDt.getDay();
  if (ev.repeat === 'monthly') return ed === td;
  return false;
}

export const LumaCalendarWindow: React.FC<LumaCalendarWindowProps> = React.memo(
  ({ isDark, onNotify }) => {
    const today = useMemo(() => new Date(), []);
    const todayKey = useMemo(() => toYmd(today), [today]);

    const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
    const [viewYear, setViewYear] = useState<number>(today.getFullYear());
    const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string>(todayKey);
    const [nowClock, setNowClock] = useState<Date>(() => new Date());
    const [searchQuery, setSearchQuery] = useState('');

    // Built-in Pomodoro Focus Timer
    const [pomoSec, setPomoSec] = useState(25 * 60);
    const [pomoRunning, setPomoRunning] = useState(false);
    const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');

    const [events, setEvents] = useState<LumaCalendarEvent[]>(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        /* ignore */
      }
      return [
        {
          id: 'ev_welcome_carbon',
          date: todayKey,
          time: '10:00',
          title: 'Luma OS 1.5 (Carbon · C-6)',
          note: 'Панель управления Tab, Сценарии, Code/Cut Studio, Приватный сейф',
          color: '#06b6d4',
          done: false,
          repeat: 'none',
          priority: 'important',
        },
      ];
    });

    const [newTitle, setNewTitle] = useState('');
    const [newTime, setNewTime] = useState('12:00');
    const [newNote, setNewNote] = useState('');
    const [newColor, setNewColor] = useState('#06b6d4');
    const [newRepeat, setNewRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
    const [newPriority, setNewPriority] = useState<'normal' | 'important' | 'urgent'>('normal');

    useEffect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
      } catch {
        /* ignore */
      }
    }, [events]);

    useEffect(() => {
      const id = window.setInterval(() => setNowClock(new Date()), 1000);
      return () => window.clearInterval(id);
    }, []);

    // Pomodoro countdown
    useEffect(() => {
      if (!pomoRunning) return;
      const id = window.setInterval(() => {
        setPomoSec((s) => {
          if (s <= 1) {
            setPomoRunning(false);
            onNotify?.(
              'Pomodoro · Календарь',
              pomoMode === 'work' ? 'Фокус-сессия 25 мин завершена! Пора на перерыв.' : 'Перерыв завершён! Можно продолжать.',
              'success'
            );
            return pomoMode === 'work' ? 5 * 60 : 25 * 60;
          }
          return s - 1;
        });
      }, 1000);
      return () => window.clearInterval(id);
    }, [pomoRunning, pomoMode, onNotify]);

    const filteredEvents = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return events;
      return events.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          (ev.note || '').toLowerCase().includes(q) ||
          ev.date.includes(q)
      );
    }, [events, searchQuery]);

    const calendarCells = useMemo(() => {
      const firstOfMonth = new Date(viewYear, viewMonth, 1);
      const startOffset = (firstOfMonth.getDay() + 6) % 7;
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

      const cells: { dateStr: string; day: number; inMonth: boolean; isWeekend: boolean }[] = [];
      for (let i = startOffset - 1; i >= 0; i--) {
        const d = new Date(viewYear, viewMonth - 1, prevMonthDays - i);
        const wd = (d.getDay() + 6) % 7;
        cells.push({ dateStr: toYmd(d), day: d.getDate(), inMonth: false, isWeekend: wd >= 5 });
      }
      for (let dNum = 1; dNum <= daysInMonth; dNum++) {
        const d = new Date(viewYear, viewMonth, dNum);
        const wd = (d.getDay() + 6) % 7;
        cells.push({ dateStr: toYmd(d), day: dNum, inMonth: true, isWeekend: wd >= 5 });
      }
      while (cells.length < 42) {
        const nextDay = cells.length - (startOffset + daysInMonth) + 1;
        const d = new Date(viewYear, viewMonth + 1, nextDay);
        const wd = (d.getDay() + 6) % 7;
        cells.push({ dateStr: toYmd(d), day: d.getDate(), inMonth: false, isWeekend: wd >= 5 });
      }
      return cells;
    }, [viewYear, viewMonth]);

    const weekDays = useMemo(() => {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const base = y && m && d ? new Date(y, m - 1, d) : new Date();
      const mondayOffset = (base.getDay() + 6) % 7;
      const mon = new Date(base.getFullYear(), base.getMonth(), base.getDate() - mondayOffset);
      return Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
        return {
          dateStr: toYmd(dt),
          label: WEEKDAYS_SHORT[i],
          day: dt.getDate(),
          isWeekend: i >= 5,
        };
      });
    }, [selectedDate]);

    const getEventsForDay = (dateStr: string) =>
      filteredEvents
        .filter((ev) => eventOccursOnDate(ev, dateStr))
        .sort((a, b) => a.time.localeCompare(b.time));

    const selectedEvents = useMemo(
      () => getEventsForDay(selectedDate),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [filteredEvents, selectedDate]
    );

    const upcomingEvents = useMemo(() => {
      return [...filteredEvents]
        .filter((e) => !e.done && e.date >= todayKey)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 12);
    }, [filteredEvents, todayKey]);

    const handlePrevMonth = () => {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((y) => y - 1);
      } else {
        setViewMonth((m) => m - 1);
      }
    };

    const handleNextMonth = () => {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((y) => y + 1);
      } else {
        setViewMonth((m) => m + 1);
      }
    };

    const handleJumpToday = () => {
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      setSelectedDate(toYmd(now));
    };

    const handleAddEvent = (e: React.FormEvent) => {
      e.preventDefault();
      const title = newTitle.trim();
      if (!title) return;
      const item: LumaCalendarEvent = {
        id: `ev_${Date.now()}`,
        date: selectedDate,
        time: newTime || '12:00',
        title,
        note: newNote.trim() || undefined,
        color: newColor,
        done: false,
        repeat: newRepeat,
        priority: newPriority,
      };
      setEvents((prev) => [...prev, item]);
      setNewTitle('');
      setNewNote('');
      onNotify?.('Календарь Luma 1.5', `Событие «${title}» добавлено на ${selectedDate}`, 'success');
    };

    const toggleDone = (id: string) => {
      setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, done: !ev.done } : ev)));
    };

    const deleteEvent = (id: string) => {
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    };

    // Export .ics iCalendar
    const handleExportICS = () => {
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Luma OS 1.5 Carbon//Calendar//RU',
      ];
      events.forEach((ev) => {
        const dt = ev.date.replace(/-/g, '') + 'T' + (ev.time || '12:00').replace(':', '') + '00';
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${ev.id}@lumaos`);
        lines.push(`DTSTART:${dt}`);
        lines.push(`SUMMARY:${ev.title.replace(/\n/g, ' ')}`);
        if (ev.note) lines.push(`DESCRIPTION:${ev.note.replace(/\n/g, ' ')}`);
        lines.push('END:VEVENT');
      });
      lines.push('END:VCALENDAR');
      const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luma_calendar_${todayKey}.ics`;
      a.click();
      URL.revokeObjectURL(url);
      onNotify?.('Календарь .ICS', `Экспортировано событий: ${events.length}`, 'success');
    };

    // Import .ics iCalendar
    const handleImportICS = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        const blocks = text.split('BEGIN:VEVENT').slice(1);
        const imported: LumaCalendarEvent[] = [];
        blocks.forEach((b, idx) => {
          const sum = /SUMMARY:(.+)/.exec(b)?.[1]?.trim();
          const dt = /DTSTART[^:]*:(\d{8})(?:T(\d{4}))?/.exec(b);
          const desc = /DESCRIPTION:(.+)/.exec(b)?.[1]?.trim();
          if (sum && dt) {
            const rawD = dt[1];
            const date = `${rawD.slice(0, 4)}-${rawD.slice(4, 6)}-${rawD.slice(6, 8)}`;
            const rawT = dt[2] || '1200';
            const time = `${rawT.slice(0, 2)}:${rawT.slice(2, 4)}`;
            imported.push({
              id: `ics_${Date.now()}_${idx}`,
              date,
              time,
              title: sum,
              note: desc,
              color: '#06b6d4',
              done: false,
              repeat: 'none',
              priority: 'normal',
            });
          }
        });
        if (imported.length > 0) {
          setEvents((prev) => [...prev, ...imported]);
          onNotify?.('Импорт .ICS', `Импортировано событий: ${imported.length}`, 'success');
        }
      };
      reader.readAsText(f);
    };

    const surfaceCls = isDark
      ? 'bg-white/[0.045] border-white/[0.1] text-zinc-100'
      : 'bg-white/[0.7] border-zinc-900/[0.12] text-zinc-900';
    const btnCls = isDark
      ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-zinc-200'
      : 'bg-zinc-900/[0.05] hover:bg-zinc-900/[0.12] border-zinc-900/[0.14] text-zinc-900';
    const mutedCls = isDark ? 'text-zinc-400' : 'text-zinc-600';

    const selectedDateReadable = useMemo(() => {
      const [y, m, d] = selectedDate.split('-').map(Number);
      if (!y || !m || !d) return selectedDate;
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }, [selectedDate]);

    const pomoMM = String(Math.floor(pomoSec / 60)).padStart(2, '0');
    const pomoSS = String(pomoSec % 60).padStart(2, '0');

    return (
      <div className="h-full flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto">
        {/* Left: Upgraded Month / Week / Agenda Calendar */}
        <div className={`flex-1 min-w-0 p-4 rounded-2xl border flex flex-col gap-3 ${surfaceCls}`}>
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[var(--luma-accent)] text-white flex items-center justify-center shadow">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight">
                  {MONTHS_RU[viewMonth]} {viewYear}
                </div>
                <div className={`text-[11px] font-mono ${mutedCls}`}>
                  {nowClock.toLocaleTimeString('ru-RU')} · {nowClock.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* View Mode Switcher */}
              <div className={`p-0.5 rounded-xl border flex items-center ${isDark ? 'bg-black/30 border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
                {(
                  [
                    ['month', 'Месяц'],
                    ['week', 'Неделя'],
                    ['agenda', 'Повестка'],
                  ] as const
                ).map(([m, lbl]) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      viewMode === m ? 'bg-[var(--luma-accent)] text-white' : mutedCls
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <button
                onClick={handleJumpToday}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
              >
                Сегодня
              </button>
              <button onClick={handlePrevMonth} className={`p-1.5 rounded-xl border cursor-pointer ${btnCls}`} title="Предыдущий месяц">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNextMonth} className={`p-1.5 rounded-xl border cursor-pointer ${btnCls}`} title="Следующий месяц">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & ICS Export/Import Row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex-1 min-w-[160px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${btnCls}`}>
              <Search className="w-3.5 h-3.5 opacity-60" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск событий и заметок..."
                className="flex-1 bg-transparent text-xs outline-none"
              />
            </div>
            <button
              onClick={handleExportICS}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
              title="Экспорт всех событий в .ics"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" /> .ICS
            </button>
            <label
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
              title="Импорт событий из файла .ics"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" /> Импорт
              <input type="file" accept=".ics" onChange={handleImportICS} className="hidden" />
            </label>
          </div>

          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {WEEKDAYS_SHORT.map((wd, idx) => (
                  <div key={wd} className={`py-1 text-[11px] font-mono font-bold uppercase tracking-wider ${idx >= 5 ? 'text-rose-400' : mutedCls}`}>
                    {wd}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5 flex-1">
                {calendarCells.map((cell) => {
                  const isToday = cell.dateStr === todayKey;
                  const isSel = cell.dateStr === selectedDate;
                  const dayEvents = getEventsForDay(cell.dateStr);
                  return (
                    <button
                      key={cell.dateStr}
                      onClick={() => {
                        setSelectedDate(cell.dateStr);
                        const [yy, mm] = cell.dateStr.split('-').map(Number);
                        if (yy && mm) {
                          setViewYear(yy);
                          setViewMonth(mm - 1);
                        }
                      }}
                      className={`relative min-h-[58px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        isSel
                          ? 'border-[var(--luma-accent)] bg-[var(--luma-accent)]/15 ring-1 ring-[var(--luma-accent)]'
                          : isToday
                          ? 'border-emerald-400/60 bg-emerald-500/10'
                          : isDark
                          ? 'border-white/[0.06] hover:bg-white/[0.06]'
                          : 'border-zinc-900/[0.08] hover:bg-zinc-900/[0.05]'
                      } ${!cell.inMonth ? 'opacity-35' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-lg ${
                            isToday ? 'bg-[var(--luma-accent)] text-white' : cell.isWeekend ? 'text-rose-400' : ''
                          }`}
                        >
                          {cell.day}
                        </span>
                        {dayEvents.length > 0 && <span className="text-[9px] font-mono opacity-65">{dayEvents.length}</span>}
                      </div>
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dayEvents.slice(0, 4).map((ev) => (
                            <span
                              key={`${cell.dateStr}_${ev.id}`}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: ev.color, opacity: ev.done ? 0.35 : 1 }}
                              title={`${ev.time} ${ev.title}`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 gap-2 flex-1 min-h-[260px]">
              {weekDays.map((wd) => {
                const dayEvs = getEventsForDay(wd.dateStr);
                const isSel = wd.dateStr === selectedDate;
                return (
                  <div
                    key={wd.dateStr}
                    onClick={() => setSelectedDate(wd.dateStr)}
                    className={`p-2 rounded-2xl border flex flex-col gap-1.5 cursor-pointer transition ${
                      isSel
                        ? 'border-[var(--luma-accent)] bg-[var(--luma-accent)]/12'
                        : isDark
                        ? 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                        : 'border-zinc-200 bg-white/60'
                    }`}
                  >
                    <div className="text-center pb-1 border-b border-white/10">
                      <div className={`text-[10px] font-mono uppercase ${wd.isWeekend ? 'text-rose-400' : mutedCls}`}>
                        {wd.label}
                      </div>
                      <div className="text-sm font-black">{wd.day}</div>
                    </div>
                    <div className="space-y-1 overflow-y-auto flex-1">
                      {dayEvs.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-1.5 rounded-lg text-[10px] font-semibold truncate border-l-2"
                          style={{ borderColor: ev.color, backgroundColor: `${ev.color}22` }}
                        >
                          <div className="font-mono text-[9px] opacity-75">{ev.time}</div>
                          <div className="truncate">{ev.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AGENDA VIEW */}
          {viewMode === 'agenda' && (
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[260px]">
              {upcomingEvents.length === 0 ? (
                <div className={`text-xs text-center py-10 ${mutedCls}`}>Нет предстоящих событий по фильтру.</div>
              ) : (
                upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedDate(ev.date)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer ${btnCls}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{ev.title}</div>
                        {ev.note && <div className={`text-[10px] truncate ${mutedCls}`}>{ev.note}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                      {ev.priority === 'urgent' && <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">Срочно</span>}
                      {ev.priority === 'important' && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Важно</span>}
                      <span>{ev.date} · {ev.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: Selected Day Events + Add Event + Pomodoro Focus Timer */}
        <div className="w-full lg:w-84 shrink-0 flex flex-col gap-3">
          {/* Selected Date Card */}
          <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--luma-accent)] font-bold">
                Выбранная дата
              </div>
              <div className="text-sm font-extrabold capitalize mt-0.5">{selectedDateReadable}</div>
            </div>

            {selectedEvents.length === 0 ? (
              <div className={`p-3 rounded-xl border text-xs text-center ${btnCls} ${mutedCls}`}>
                На этот день событий нет. Добавьте задачу ниже!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                {selectedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                      isDark ? 'bg-black/25 border-white/10' : 'bg-black/[0.03] border-zinc-900/10'
                    }`}
                  >
                    <button
                      onClick={() => toggleDone(ev.id)}
                      className="mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 cursor-pointer"
                      style={{
                        borderColor: ev.color,
                        backgroundColor: ev.done ? ev.color : 'transparent',
                        color: '#fff',
                      }}
                    >
                      {ev.done && <Check className="w-3 h-3" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`font-bold flex items-center gap-1.5 ${ev.done ? 'line-through opacity-55' : ''}`}>
                        <span className="truncate">{ev.title}</span>
                        {ev.priority === 'urgent' && <Flag className="w-3 h-3 text-rose-400 shrink-0" />}
                        {ev.priority === 'important' && <Flag className="w-3 h-3 text-amber-400 shrink-0" />}
                      </div>
                      <div className={`text-[10px] font-mono flex items-center gap-1 mt-0.5 flex-wrap ${mutedCls}`}>
                        <Clock className="w-2.5 h-2.5" />
                        <span>{ev.time}</span>
                        {ev.repeat && ev.repeat !== 'none' && (
                          <span className="inline-flex items-center gap-0.5 text-cyan-400">
                            <Repeat className="w-2.5 h-2.5" /> {ev.repeat}
                          </span>
                        )}
                        {ev.note && <span className="truncate">· {ev.note}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="p-1 rounded-lg opacity-55 hover:opacity-100 hover:text-rose-400 cursor-pointer"
                      title="Удалить событие"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Event Form */}
            <form onSubmit={handleAddEvent} className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex gap-1.5">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Новое событие или встреча..."
                  className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border text-xs outline-none ${btnCls}`}
                />
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className={`w-22 px-2 py-1.5 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
                />
              </div>
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Заметка (необязательно)"
                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs outline-none ${btnCls}`}
              />
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={newRepeat}
                  onChange={(e) => setNewRepeat(e.target.value as LumaCalendarEvent['repeat'] & string)}
                  className={`px-2 py-1.5 rounded-xl border text-[11px] outline-none ${isDark ? 'bg-[#151822] border-white/10 text-white' : 'bg-white border-zinc-200'}`}
                >
                  <option value="none">Один раз</option>
                  <option value="daily">Ежедневно</option>
                  <option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option>
                </select>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as LumaCalendarEvent['priority'] & string)}
                  className={`px-2 py-1.5 rounded-xl border text-[11px] outline-none ${isDark ? 'bg-[#151822] border-white/10 text-white' : 'bg-white border-zinc-200'}`}
                >
                  <option value="normal">Обычный</option>
                  <option value="important">Важный</option>
                  <option value="urgent">Срочный</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {COLOR_TAGS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setNewColor(c.hex)}
                      title={c.label}
                      className={`w-5 h-5 rounded-full transition cursor-pointer ${
                        newColor === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Добавить
                </button>
              </div>
            </form>
          </div>

          {/* Built-in Pomodoro Focus Timer */}
          <div className={`p-3.5 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
                Фокус Pomodoro
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setPomoMode('work');
                    setPomoRunning(false);
                    setPomoSec(25 * 60);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                    pomoMode === 'work' ? 'bg-cyan-500/20 text-cyan-300' : mutedCls
                  }`}
                >
                  25м
                </button>
                <button
                  onClick={() => {
                    setPomoMode('break');
                    setPomoRunning(false);
                    setPomoSec(5 * 60);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                    pomoMode === 'break' ? 'bg-emerald-500/20 text-emerald-300' : mutedCls
                  }`}
                >
                  5м
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black font-mono tracking-tight">
                {pomoMM}:{pomoSS}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPomoRunning((r) => !r)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  {pomoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {pomoRunning ? 'Пауза' : 'Старт'}
                </button>
                <button
                  onClick={() => {
                    setPomoRunning(false);
                    setPomoSec(pomoMode === 'work' ? 25 * 60 : 5 * 60);
                  }}
                  className={`p-1.5 rounded-xl border cursor-pointer ${btnCls}`}
                  title="Сброс"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Mini Card */}
          <div className={`p-3.5 rounded-2xl border space-y-2 ${surfaceCls}`}>
            <div className="text-[11px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Ближайшие планы ({upcomingEvents.length})
            </div>
            {upcomingEvents.length === 0 ? (
              <div className={`text-xs ${mutedCls}`}>Все ближайшие задачи выполнены.</div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {upcomingEvents.slice(0, 5).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedDate(ev.date)}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-left text-xs flex items-center gap-2 cursor-pointer transition ${btnCls}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                    <span className="truncate flex-1 font-medium">{ev.title}</span>
                    <span className={`text-[10px] font-mono shrink-0 ${mutedCls}`}>
                      {ev.date.slice(5)} {ev.time}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
