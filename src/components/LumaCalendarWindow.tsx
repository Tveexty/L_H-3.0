import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';

export interface LumaCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  title: string;
  note?: string;
  color: string;
  done?: boolean;
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
  { id: 'indigo', hex: '#6366f1', label: 'Индиго' },
  { id: 'emerald', hex: '#10b981', label: 'Изумруд' },
  { id: 'rose', hex: '#f43f5e', label: 'Рубин' },
  { id: 'amber', hex: '#f59e0b', label: 'Янтарь' },
  { id: 'sky', hex: '#38bdf8', label: 'Небо' },
  { id: 'violet', hex: '#a855f7', label: 'Фиолет' },
];

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const LumaCalendarWindow: React.FC<LumaCalendarWindowProps> = React.memo(
  ({ isDark, onNotify }) => {
    const today = useMemo(() => new Date(), []);
    const todayKey = useMemo(() => toYmd(today), [today]);

    const [viewYear, setViewYear] = useState<number>(today.getFullYear());
    const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string>(todayKey);
    const [nowClock, setNowClock] = useState<Date>(() => new Date());

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
          id: 'ev_welcome_boron',
          date: todayKey,
          time: '10:00',
          title: 'Релиз Luma OS 1.4 (Boron · B-5)',
          note: 'Новый календарь, мышь и DPI, SDK v3.0 и виджеты погоды',
          color: '#6366f1',
          done: false,
        },
      ];
    });

    const [newTitle, setNewTitle] = useState('');
    const [newTime, setNewTime] = useState('12:00');
    const [newNote, setNewNote] = useState('');
    const [newColor, setNewColor] = useState('#6366f1');

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

    const calendarCells = useMemo(() => {
      const firstOfMonth = new Date(viewYear, viewMonth, 1);
      const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
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

    const eventsByDate = useMemo(() => {
      const m = new Map<string, LumaCalendarEvent[]>();
      for (const ev of events) {
        const list = m.get(ev.date) || [];
        list.push(ev);
        m.set(ev.date, list);
      }
      for (const [, list] of m) {
        list.sort((a, b) => a.time.localeCompare(b.time));
      }
      return m;
    }, [events]);

    const selectedEvents = eventsByDate.get(selectedDate) || [];

    const upcomingEvents = useMemo(() => {
      return [...events]
        .filter((e) => !e.done && e.date >= todayKey)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 6);
    }, [events, todayKey]);

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
      };
      setEvents((prev) => [...prev, item]);
      setNewTitle('');
      setNewNote('');
      onNotify?.('Календарь Luma', `Событие «${title}» добавлено на ${selectedDate}`, 'success');
    };

    const toggleDone = (id: string) => {
      setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, done: !ev.done } : ev)));
    };

    const deleteEvent = (id: string) => {
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    };

    const surfaceCls = isDark
      ? 'bg-white/[0.045] border-white/[0.1] text-zinc-100'
      : 'bg-white/[0.6] border-zinc-900/[0.12] text-zinc-900';
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

    return (
      <div className="h-full flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto">
        {/* Left: Month Calendar Grid */}
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

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleJumpToday}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
              >
                Сегодня
              </button>
              <button
                onClick={handlePrevMonth}
                className={`p-1.5 rounded-xl border cursor-pointer ${btnCls}`}
                title="Предыдущий месяц"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className={`p-1.5 rounded-xl border cursor-pointer ${btnCls}`}
                title="Следующий месяц"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS_SHORT.map((wd, idx) => (
              <div
                key={wd}
                className={`py-1 text-[11px] font-mono font-bold uppercase tracking-wider ${
                  idx >= 5 ? 'text-rose-400' : mutedCls
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* 42 Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 flex-1">
            {calendarCells.map((cell) => {
              const isToday = cell.dateStr === todayKey;
              const isSel = cell.dateStr === selectedDate;
              const dayEvents = eventsByDate.get(cell.dateStr) || [];
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
                  className={`relative min-h-[62px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
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
                        isToday
                          ? 'bg-[var(--luma-accent)] text-white'
                          : cell.isWeekend
                          ? 'text-rose-400'
                          : ''
                      }`}
                    >
                      {cell.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-mono opacity-60">{dayEvents.length}</span>
                    )}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dayEvents.slice(0, 4).map((ev) => (
                        <span
                          key={ev.id}
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
        </div>

        {/* Right: Selected Day Events + Add Event + Upcoming */}
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
                На этот день событий пока нет. Добавьте напоминание ниже!
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
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
                      <div className={`font-bold ${ev.done ? 'line-through opacity-55' : ''}`}>
                        {ev.title}
                      </div>
                      <div className={`text-[10px] font-mono flex items-center gap-1 mt-0.5 ${mutedCls}`}>
                        <Clock className="w-2.5 h-2.5" />
                        <span>{ev.time}</span>
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

          {/* Upcoming Agenda */}
          <div className={`p-4 rounded-2xl border space-y-2 ${surfaceCls}`}>
            <div className="text-[11px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Ближайшие планы ({upcomingEvents.length})
            </div>
            {upcomingEvents.length === 0 ? (
              <div className={`text-xs ${mutedCls}`}>Все ближайшие задачи выполнены.</div>
            ) : (
              <div className="space-y-1.5">
                {upcomingEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedDate(ev.date)}
                    className={`w-full px-2.5 py-2 rounded-xl border text-left text-xs flex items-center gap-2 cursor-pointer transition ${btnCls}`}
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
