import React, { useMemo, useState } from 'react';
import {
  Bell, BellOff, CheckCheck, Clock, ExternalLink, Info, MessageCircle,
  Search, Send, Trash2, X,
} from 'lucide-react';
import { CarbonNotificationItem } from './LumaCarbonControlHub';

export interface ShadeNotificationItem extends CarbonNotificationItem {
  appName?: string;
  dateLabel?: string;
  timestamp?: number;
}

interface LumaNotificationShadeProps {
  open: boolean;
  isDark: boolean;
  notifications: ShadeNotificationItem[];
  dndEnabled: boolean;
  onToggleDnd: () => void;
  onClose: () => void;
  onClearAll: () => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onOpenMessenger: (item: ShadeNotificationItem) => void;
  onSendTest: () => void;
}

type FilterKey = 'all' | 'telegram' | 'whatsapp' | 'discord' | 'browser' | 'system';

function formatRelativeWhen(item: ShadeNotificationItem): string {
  const ts = item.timestamp || 0;
  if (!ts) return item.time;
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 45) return `только что · ${item.time}`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин назад · ${item.time}`;
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return `сегодня в ${item.time}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `вчера в ${item.time}`;
  return `${item.dateLabel || d.toLocaleDateString('ru-RU')} в ${item.time}`;
}

function getDateBucket(item: ShadeNotificationItem): 'Сегодня' | 'Вчера' | 'Ранее' {
  const ts = item.timestamp || 0;
  if (!ts) return 'Сегодня';
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Сегодня';
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Вчера';
  return 'Ранее';
}

function appBadgeInfo(item: ShadeNotificationItem): { label: string; grad: string; pill: string } {
  switch (item.source) {
    case 'telegram':
      return {
        label: item.appName || 'Telegram',
        grad: 'from-sky-400 to-blue-600',
        pill: 'bg-sky-500/15 text-sky-400 border-sky-400/30',
      };
    case 'whatsapp':
      return {
        label: item.appName || 'WhatsApp',
        grad: 'from-emerald-400 to-green-600',
        pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30',
      };
    case 'discord':
      return {
        label: item.appName || 'Discord',
        grad: 'from-indigo-400 to-violet-600',
        pill: 'bg-indigo-500/15 text-indigo-400 border-indigo-400/30',
      };
    case 'browser':
      return {
        label: item.appName || 'VK / Web',
        grad: 'from-blue-500 to-cyan-500',
        pill: 'bg-cyan-500/15 text-cyan-400 border-cyan-400/30',
      };
    default:
      return {
        label: item.appName || 'Сообщение',
        grad: 'from-violet-500 to-fuchsia-600',
        pill: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
      };
  }
}

/**
 * Luma OS 1.5.4 (Carbon) — Full Notification Shade («Шторка уведомлений»).
 * Shows ONLY real incoming messages with WHO wrote, WHAT they wrote, and WHEN they wrote — zero muted-channel spam!
 */
export const LumaNotificationShade: React.FC<LumaNotificationShadeProps> = ({
  open,
  isDark,
  notifications,
  dndEnabled,
  onToggleDnd,
  onClose,
  onClearAll,
  onMarkAllRead,
  onDismiss,
  onOpenMessenger,
  onSendTest,
}) => {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [showTip, setShowTip] = useState(false);

  const counts = useMemo(() => {
    const map: Record<FilterKey, number> = {
      all: notifications.length,
      telegram: 0,
      whatsapp: 0,
      discord: 0,
      browser: 0,
      system: 0,
    };
    for (const n of notifications) {
      if (n.source in map) map[n.source as FilterKey]++;
    }
    return map;
  }, [notifications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((n) => {
      if (filter !== 'all' && n.source !== filter) return false;
      if (!q) return true;
      return (
        (n.sender || '').toLowerCase().includes(q) ||
        (n.chat || '').toLowerCase().includes(q) ||
        (n.body || '').toLowerCase().includes(q) ||
        (n.title || '').toLowerCase().includes(q)
      );
    });
  }, [notifications, filter, query]);

  const grouped = useMemo(() => {
    const buckets: Record<'Сегодня' | 'Вчера' | 'Ранее', ShadeNotificationItem[]> = {
      Сегодня: [],
      Вчера: [],
      Ранее: [],
    };
    for (const item of filtered) {
      buckets[getDateBucket(item)].push(item);
    }
    return (['Сегодня', 'Вчера', 'Ранее'] as const)
      .map((label) => ({ label, items: buckets[label] }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  if (!open) return null;

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9600] bg-black/35 backdrop-blur-sm flex justify-end p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[430px] h-full rounded-[26px] border shadow-[0_32px_100px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden backdrop-blur-3xl animate-in slide-in-from-right-8 duration-200 ${
          isDark
            ? 'bg-[#0b0f18]/94 border-white/15 text-white'
            : 'bg-white/95 border-slate-300 text-slate-900'
        }`}
      >
        {/* Top Header */}
        <div className={`px-4 pt-4 pb-3 border-b space-y-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[var(--luma-accent)] to-sky-500 text-white flex items-center justify-center shadow-lg shadow-[var(--luma-accent)]/25">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-tight flex items-center gap-2">
                  <span>Шторка уведомлений</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--luma-accent)] text-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] ${isDark ? 'text-white/55' : 'text-slate-500'}`}>
                  Кто, что и когда написал · без спама из мута
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleDnd}
                title={dndEnabled ? 'Отключить «Не беспокоить»' : 'Включить «Не беспокоить»'}
                className={`p-2 rounded-xl border text-xs cursor-pointer transition ${
                  dndEnabled
                    ? 'bg-violet-500/20 border-violet-400/40 text-violet-300'
                    : isDark
                    ? 'border-white/10 hover:bg-white/10 text-white/70'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {dndEnabled ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl cursor-pointer transition ${
                  isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
              isDark ? 'bg-white/[0.05] border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5 opacity-55 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по отправителю, чату или тексту..."
              className="bg-transparent outline-none flex-1 text-xs placeholder:opacity-50"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="opacity-60 hover:opacity-100 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* App Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
            {(
              [
                ['all', 'Все'],
                ['telegram', 'Telegram'],
                ['whatsapp', 'WhatsApp'],
                ['discord', 'Discord'],
                ['browser', 'VK / Web'],
                ['system', 'Другие'],
              ] as const
            ).map(([k, lbl]) => {
              const active = filter === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`px-2.5 py-1 rounded-full border font-semibold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-[var(--luma-accent)] text-white border-[var(--luma-accent)]'
                      : isDark
                      ? 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/10'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {lbl} {counts[k] > 0 ? `· ${counts[k]}` : ''}
                </button>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="inline-flex items-center gap-1 text-[var(--luma-accent)] font-semibold hover:underline cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Прочитать все
                </button>
              )}
              <button
                type="button"
                onClick={onSendTest}
                className={`inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer ${
                  isDark ? 'text-sky-400' : 'text-sky-600'
                }`}
              >
                <Send className="w-3 h-3" /> Тест
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTip((v) => !v)}
                className={`inline-flex items-center gap-1 cursor-pointer ${isDark ? 'text-white/55 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Info className="w-3 h-3" /> Подсказка
              </button>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Очистить
                </button>
              )}
            </div>
          </div>

          {showTip && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${
                isDark ? 'bg-sky-500/10 border-sky-400/25 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'
              }`}
            >
              Шторка показывает <strong>только реальные входящие сообщения</strong> от людей и активных чатов (каналы в муте полностью игнорируются).
              Чтобы Telegram Desktop передавал имя отправителя, текст и аватарку, включите в Telegram:{' '}
              <strong>Настройки → Уведомления → Использовать уведомления Windows</strong>.
            </div>
          )}
        </div>

        {/* Chronological Message Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-4">
          {grouped.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-2">
              <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <MessageCircle className="w-7 h-7 opacity-35" />
              </div>
              <div className="text-sm font-bold">Новых сообщений нет</div>
              <div className={`text-xs max-w-xs leading-relaxed ${isDark ? 'text-white/55' : 'text-slate-500'}`}>
                Когда вам напишут в Telegram, WhatsApp, Discord или VK, здесь сразу появится карточка: кто написал, точный текст и время.
              </div>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/45' : 'text-slate-500'}`}>
                    {group.label}
                  </span>
                  <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                </div>

                {group.items.map((item) => {
                  const badge = appBadgeInfo(item);
                  const initials = (item.sender || item.title || 'U').trim().slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={item.id}
                      onClick={() => onOpenMessenger(item)}
                      className={`group relative rounded-2xl border p-3 transition cursor-pointer ${
                        item.unread
                          ? isDark
                            ? 'bg-white/[0.07] border-[var(--luma-accent)]/40 hover:bg-white/[0.11]'
                            : 'bg-sky-50/70 border-sky-300 hover:bg-sky-50'
                          : isDark
                          ? 'bg-white/[0.035] border-white/10 hover:bg-white/[0.07]'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(item.id);
                        }}
                        title="Убрать"
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-start gap-3">
                        {/* Circular User Avatar + Messenger Corner Badge */}
                        <div className="relative shrink-0">
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt=""
                              className="w-11 h-11 rounded-full object-cover border border-white/20 shadow"
                            />
                          ) : (
                            <div
                              className={`w-11 h-11 rounded-full bg-gradient-to-br ${badge.grad} text-white font-black text-xs flex items-center justify-center shadow`}
                            >
                              {initials}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-white bg-gradient-to-br ${badge.grad} ${
                              isDark ? 'border-[#0b0f18]' : 'border-white'
                            }`}
                          >
                            {item.source === 'telegram' ? <Send className="w-2 h-2" /> : <MessageCircle className="w-2 h-2" />}
                          </span>
                        </div>

                        {/* WHO + WHEN + WHAT */}
                        <div className="min-w-0 flex-1 pr-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold leading-tight truncate">
                              {item.sender || item.title}
                            </span>
                            {item.chat && item.chat !== item.sender && (
                              <span className={`text-[11px] truncate ${isDark ? 'text-white/55' : 'text-slate-500'}`}>
                                → {item.chat}
                              </span>
                            )}
                            {item.unread && <span className="w-2 h-2 rounded-full bg-[var(--luma-accent)] shrink-0" />}
                          </div>

                          <div className={`text-xs mt-1 leading-relaxed break-words ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                            {item.body}
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded-md border font-bold ${badge.pill}`}>
                                {badge.label}
                              </span>
                              <span className={`inline-flex items-center gap-1 font-mono ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                                <Clock className="w-2.5 h-2.5" />
                                {formatRelativeWhen(item)}
                              </span>
                            </div>
                            <span className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-0.5 text-[var(--luma-accent)] font-semibold transition">
                              Открыть <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
