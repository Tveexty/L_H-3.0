import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Plus, Search, Terminal, Trash2, X } from 'lucide-react';
import { LiveSystemTelemetry } from '../data/launcherData';
import { DesignStyle, TaskbarPosition } from './DexWindow';

interface LumaTerminalWindowProps {
  isDark: boolean;
  designStyle?: DesignStyle;
  taskbarPosition?: TaskbarPosition;
  liveSystem: LiveSystemTelemetry | null;
  volume: number;
  isMuted: boolean;
  dynamicIslandEnabled: boolean;
  pendingCommand?: { id: number; command: string } | null;
  onConsumePendingCommand?: () => void;
  onChangeVolume: (val: number) => void;
  onToggleMute: () => void;
  onMediaAction: (action: 'play_pause' | 'next' | 'prev') => void;
  onToggleIsland: () => void;
  onSetThemeMode?: (mode: 'dark' | 'light') => void;
  onSelectTheme?: (themeId: string) => void;
  onSelectAnim?: (preset: 'standard' | 'spring' | 'glide' | 'none') => void;
  onSetDesignStyle?: (style: DesignStyle) => void;
  onSetTaskbarPosition?: (pos: TaskbarPosition) => void;
  onToggleFullscreen?: () => void;
  onOpenExplorer?: (path?: string) => void;
  onOpenTaskMgr?: () => void;
  onPowerAction: (action: 'lock' | 'sleep' | 'recycle_bin') => void;
  onCallRpc: (method: string) => Promise<void>;
  onClipboardUpdated?: (text: string) => void;
}

interface TermLine {
  id: number;
  kind: 'in' | 'out' | 'err' | 'accent';
  text: string;
}

interface TermTab {
  id: string;
  title: string;
  cwd: string;
  lines: TermLine[];
  history: string[];
}

const BUILTIN_COMMANDS = [
  'help',
  'neofetch',
  'sys',
  'top',
  'ps',
  'kill',
  'explorer',
  'taskmgr',
  'ls',
  'find',
  'mkdir',
  'touch',
  'cat',
  'disks',
  'loc',
  'weather',
  'clip',
  'open',
  'calc',
  'media',
  'vol',
  'mute',
  'island',
  'theme',
  'anim',
  'taskbar',
  'fullscreen',
  'rpc',
  'ping',
  'ip',
  'net',
  'tcp',
  'battery',
  'wireless',
  'scan',
  'hosts',
  'trash',
  'dpi',
  'uptime',
  'uuid',
  'hash',
  'base64',
  'hex',
  'date',
  'matrix',
  'gc',
  'notify',
  'sh',
  'lock',
  'sleep',
  'clear',
];

function createTab(idx: number): TermTab {
  return {
    id: `tab_${Date.now()}_${idx}`,
    title: `sh-${idx}`,
    cwd: '~',
    history: [],
    lines: [
      { id: 1, kind: 'accent', text: 'LUMA OS 1.5.4 (CARBON · C-6) · LUMACORE 1.4.7 · LUMASHIELD 2.0 TERMINAL [IPC :49215]' },
      { id: 2, kind: 'out', text: 'Команды: help, neofetch, sys, top, ip, tcp, battery, wireless, scan, hosts, trash, dpi, uuid, hash, base64, gc, matrix, sh <cmd>.' },
    ],
  };
}

export const LumaTerminalWindow: React.FC<LumaTerminalWindowProps> = ({
  isDark,
  designStyle = 'nothing',
  taskbarPosition = 'bottom',
  liveSystem,
  volume,
  isMuted,
  dynamicIslandEnabled,
  pendingCommand,
  onConsumePendingCommand,
  onChangeVolume,
  onToggleMute,
  onMediaAction,
  onToggleIsland,
  onSetThemeMode,
  onSelectTheme,
  onSelectAnim,
  onSetDesignStyle,
  onSetTaskbarPosition,
  onToggleFullscreen,
  onOpenExplorer,
  onOpenTaskMgr,
  onPowerAction,
  onCallRpc,
  onClipboardUpdated,
}) => {
  const [tabs, setTabs] = useState<TermTab[]>(() => [createTab(1)]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || '');
  const [input, setInput] = useState('');
  const [histIdx, setHistIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [logSearch, setLogSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastExecMs, setLastExecMs] = useState<number | null>(null);
  const tabCounterRef = useRef(2);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTabId) && tabs[0]) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab?.lines]);

  const appendToTab = (tabId: string, text: string, kind: TermLine['kind'] = 'out') => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? { ...t, lines: [...t.lines.slice(-260), { id: Date.now() + Math.random(), kind, text }] }
          : t
      )
    );
  };

  const clearActiveTab = () => {
    if (!activeTab) return;
    setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, lines: [] } : t)));
  };

  const addNewTab = () => {
    const nt = createTab(tabCounterRef.current++);
    setTabs((prev) => [...prev, nt]);
    setActiveTabId(nt.id);
    setHistIdx(-1);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) {
      clearActiveTab();
      return;
    }
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id && next[0]) setActiveTabId(next[0].id);
      return next;
    });
  };

  const runCommand = async (raw: string, targetTabId?: string) => {
    const cmd = raw.trim();
    const tid = targetTabId || activeTab?.id;
    if (!cmd || !tid) return;

    const hostName = liveSystem?.hostname || 'host';
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tid
          ? {
              ...t,
              lines: [...t.lines.slice(-260), { id: Date.now() + Math.random(), kind: 'in', text: `luma@${hostName}:${t.cwd}$ ${cmd}` }],
              history: [cmd, ...t.history.slice(0, 49)],
            }
          : t
      )
    );
    setHistIdx(-1);

    const parts = cmd.split(/\s+/);
    const head = parts[0].toLowerCase();
    const rest = cmd.slice(parts[0].length).trim();
    const arg = (parts[1] || '').toLowerCase();

    if (head === 'clear' || head === 'cls') {
      setTabs((prev) => prev.map((t) => (t.id === tid ? { ...t, lines: [] } : t)));
      return;
    }

    if (head === 'help') {
      appendToTab(
        tid,
        [
          'LUMA PRO TERMINAL 1.5.4 — СПРАВОЧНИК КОМАНД (50+):',
          '  ── СИСТЕМА И ЖЕЛЕЗО ────────────────────────────────────────────────',
          '  neofetch               — паспорт системы, железо и версии ядер',
          '  sys / disks / loc      — CPU, GPU, RAM, диски, авто-регион',
          '  top | ps | kill <pid>  — процессы хоста и завершение по PID',
          '  battery / wireless     — заряд батареи ПК, мышек IO/Ajazz/Ardor и BT',
          '  dpi [400..6400]        — текущая скорость/DPI мыши или установка',
          '  uptime | date | gc     — аптайм ядра, точная дата/время, очистка памяти GC',
          '  ── СЕТЬ И БЕЗОПАСНОСТЬ (LUMASHIELD 2.0) ───────────────────────────',
          '  ip | net               — сетевые интерфейсы, IPv4, MAC, скорость',
          '  tcp                    — активные TCP-соединения и подозрительные порты',
          '  scan [quick|deep|proc] — запуск антивируса LumaShield 2.0 (175+ правил)',
          '  hosts                  — аудит целостности файла hosts (DNS Hijack)',
          '  ── ФАЙЛЫ, КОРЗИНА И УТИЛИТЫ ───────────────────────────────────────',
          '  ls / find / mkdir / touch / cat / open — работа с ФС на ПК',
          '  trash [empty]          — список объектов Корзины Luma OS или очистка',
          '  uuid                   — генерация криптостойкого UUID v4',
          '  hash <текст>           — вычисление SHA-256 хеша текста',
          '  base64 <enc|dec> <txt> — кодирование / декодирование Base64',
          '  hex <число>            — перевод числа в HEX и BIN',
          '  calc <выражение>       — быстрый математический расчёт',
          '  weather | clip | matrix — погода, буфер обмена, пасхалка Матрицы',
          '  notify <текст>         — отправить тест-уведомление (эффект резины Острова)',
          '  ── ОБОЛОЧКА И ОС ──────────────────────────────────────────────────',
          '  media / vol / mute / island / theme / anim / taskbar / fullscreen',
          '  ping | rpc <method> | sh <команда> | lock | sleep | clear',
        ].join('\n')
      );
      return;
    }

    if (head === 'neofetch') {
      const os = liveSystem?.os_name || 'Luma Runtime';
      const cpu = liveSystem ? `${liveSystem.cpu_model} (${liveSystem.cpu_cores}c · ${liveSystem.cpu_percent}%)` : '—';
      const gpu = liveSystem?.gpu_name || '—';
      const ram = liveSystem ? `${liveSystem.ram_used_gb.toFixed(1)} / ${liveSystem.ram_total_gb.toFixed(1)} GB (${liveSystem.ram_percent}%)` : '—';
      const loc = liveSystem?.location?.detected ? `${liveSystem.location.city}, ${liveSystem.location.country}` : 'LOCAL';
      appendToTab(
        tid,
        [
          `  ██╗     ██╗   ██╗███╗   ███╗ █████╗      luma@${hostName}`,
          `  ██║     ██║   ██║████╗ ████║██╔══██╗     ──────────────────────────`,
          `  ██║     ██║   ██║██╔████╔██║███████║     OS      : Luma OS 1.5.4 Carbon (${os})`,
          `  ██║     ██║   ██║██║╚██╔╝██║██╔══██║     STYLE   : ${designStyle === 'nothing' ? 'КЛАССИЧЕСКИЙ' : 'МОДЕРН'} · TASKBAR ${taskbarPosition.toUpperCase()}`,
          `  ███████╗╚██████╔╝██║ ╚═╝ ██║██║  ██║     CPU     : ${cpu}`,
          `  ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝     GPU     : ${gpu}`,
          `                                           RAM     : ${ram}`,
          `  KERNEL : LumaCore ${liveSystem?.kernel_engine_version || '1.4.7'} · Shield 2.0     REGION  : ${loc}`,
        ].join('\n'),
        'accent'
      );
      return;
    }

    if (head === 'sys') {
      if (!liveSystem) {
        appendToTab(tid, 'Телеметрия загружается...', 'err');
        return;
      }
      appendToTab(
        tid,
        [
          `HOST : ${liveSystem.hostname} (${liveSystem.os_name} / ${liveSystem.arch})`,
          `CPU  : ${liveSystem.cpu_model} (${liveSystem.cpu_cores} cores) — ${liveSystem.cpu_percent}%`,
          `GPU  : ${liveSystem.gpu_name}`,
          `RAM  : ${liveSystem.ram_used_gb.toFixed(1)} / ${liveSystem.ram_total_gb.toFixed(1)} GB (${liveSystem.ram_percent}%)`,
          `BAT  : ${liveSystem.battery_percent}% ${liveSystem.battery_charging ? '(AC)' : '(BAT)'}`,
          `NET  : ↓ ${liveSystem.net_down_mbps.toFixed(1)} Mbps  ↑ ${liveSystem.net_up_mbps.toFixed(1)} Mbps`,
          `VOL  : ${isMuted ? 'MUTE' : `${volume}%`}`,
        ].join('\n')
      );
      return;
    }

    if (head === 'top' || head === 'ps') {
      setBusy(true);
      try {
        const r = await fetch('/api/kernel/processes');
        if (r.ok) {
          const d = await r.json();
          const list: { pid: number; name: string; cpu_pct: number; mem_mb: number }[] = d.processes || [];
          if (list.length === 0) {
            appendToTab(tid, 'Список процессов пуст.');
          } else {
            const header = `${'PID'.padEnd(8)} ${'CPU%'.padStart(6)} ${'MEM(MB)'.padStart(9)}  NAME`;
            const rows = list.map(
              (p) => `${String(p.pid).padEnd(8)} ${p.cpu_pct.toFixed(1).padStart(6)} ${p.mem_mb.toFixed(1).padStart(9)}  ${p.name}`
            );
            appendToTab(tid, [header, '─'.repeat(48), ...rows].join('\n'));
          }
        } else {
          appendToTab(tid, 'Ошибка запроса /api/kernel/processes', 'err');
        }
      } catch {
        appendToTab(tid, 'Ядро Luma Core недоступно.', 'err');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (head === 'ls' || head === 'dir') {
      setBusy(true);
      try {
        const r = await fetch('/api/kernel/fs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ls', path: rest || '~' }),
        });
        const d = await r.json();
        if (!d.ok) {
          appendToTab(tid, `Ошибка: ${d.error || 'недоступно'}`, 'err');
        } else {
          const entries: { name: string; is_dir: boolean; size: number }[] = d.entries || [];
          const out = [
            `DIR: ${d.path} (${entries.length})`,
            ...entries.map((e) =>
              e.is_dir
                ? `  [DIR]  ${e.name}/`
                : `  ${String(Math.max(1, Math.round(e.size / 1024))).padStart(6)}K ${e.name}`
            ),
          ].join('\n');
          appendToTab(tid, out);
        }
      } catch {
        appendToTab(tid, 'Файловая система доступна при запущенном ядре Luma Core.', 'err');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (head === 'cat') {
      if (!rest) {
        appendToTab(tid, 'Использование: cat <путь_к_файлу>', 'err');
        return;
      }
      setBusy(true);
      try {
        const r = await fetch('/api/kernel/fs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cat', path: rest }),
        });
        const d = await r.json();
        if (!d.ok) appendToTab(tid, `Ошибка чтения: ${d.error}`, 'err');
        else appendToTab(tid, d.content || '(пустой файл)');
      } catch {
        appendToTab(tid, 'Не удалось прочитать файл.', 'err');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (head === 'open') {
      if (!rest) {
        appendToTab(tid, 'Использование: open <путь_к_файлу | папка | https://...>', 'err');
        return;
      }
      try {
        const r = await fetch('/api/kernel/open-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: rest }),
        });
        const d = await r.json();
        if (d.ok) appendToTab(tid, `OPEN -> ${rest}`);
        else appendToTab(tid, `Ошибка open: ${d.error || 'не найден путь'}`, 'err');
      } catch {
        if (/^https?:\/\//i.test(rest)) {
          window.open(rest, '_blank');
          appendToTab(tid, `OPEN URL -> ${rest}`);
        } else {
          appendToTab(tid, 'Требуется активное ядро Luma Core.', 'err');
        }
      }
      return;
    }

    if (head === 'clip') {
      if (arg === 'set') {
        const text = cmd.replace(/^clip\s+set\s+/i, '');
        try {
          await fetch('/api/kernel/clipboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          });
          onClipboardUpdated?.(text);
          appendToTab(tid, `CLIPBOARD SET (${text.length} симв.)`);
        } catch {
          appendToTab(tid, 'Не удалось записать буфер обмена.', 'err');
        }
      } else {
        try {
          const r = await fetch('/api/kernel/clipboard');
          const d = await r.json();
          appendToTab(tid, d.text ? `CLIPBOARD:\n${d.text}` : 'Буфер обмена пуст.');
        } catch {
          appendToTab(tid, 'Буфер обмена недоступен.', 'err');
        }
      }
      return;
    }

    if (head === 'weather') {
      const loc = liveSystem?.location;
      if (!loc?.detected) {
        appendToTab(tid, 'Регион ещё не определён.', 'err');
        return;
      }
      setBusy(true);
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m&timezone=auto`
        );
        const d = await r.json();
        const c = d.current || {};
        appendToTab(
          tid,
          `${loc.city}, ${loc.country}: ${c.temperature_2m}°C (ощущается ${c.apparent_temperature}°C) · влажность ${c.relative_humidity_2m}% · ветер ${c.wind_speed_10m} км/ч`
        );
      } catch {
        appendToTab(tid, 'Не удалось загрузить Open-Meteo.', 'err');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (head === 'calc') {
      try {
        const cleaned = rest.replace(/[^0-9+\-*/(). %]/g, '');
        if (!cleaned) {
          appendToTab(tid, 'Использование: calc 256 * 12', 'err');
          return;
        }
        // eslint-disable-next-line no-new-func
        const res = Function(`"use strict"; return (${cleaned})`)();
        appendToTab(tid, `= ${res}`, 'accent');
      } catch {
        appendToTab(tid, 'Некорректное математическое выражение.', 'err');
      }
      return;
    }

    if (head === 'disks') {
      if (!liveSystem?.disks?.length) {
        appendToTab(tid, 'Тома не обнаружены.', 'err');
        return;
      }
      appendToTab(
        tid,
        liveSystem.disks
          .map(
            (d) =>
              `${d.mount.padEnd(8)} ${d.used_gb.toFixed(1).padStart(6)} / ${d.total_gb.toFixed(1).padStart(6)} GB  (${String(d.percent).padStart(3)}%)  FREE ${d.free_gb.toFixed(1)} GB`
          )
          .join('\n')
      );
      return;
    }

    if (head === 'loc') {
      if (!liveSystem?.location?.detected) {
        appendToTab(tid, 'Регион не определён.', 'err');
        return;
      }
      const l = liveSystem.location;
      appendToTab(
        tid,
        `CITY: ${l.city} | REGION: ${l.region} | COUNTRY: ${l.country}\nTZ  : ${l.timezone} | COORDS: ${l.latitude.toFixed(3)}, ${l.longitude.toFixed(3)} | IP: ${l.ip}`
      );
      return;
    }

    if (head === 'media') {
      if (arg === 'next') {
        onMediaAction('next');
        appendToTab(tid, 'MEDIA -> NEXT TRACK');
      } else if (arg === 'prev') {
        onMediaAction('prev');
        appendToTab(tid, 'MEDIA -> PREV TRACK');
      } else if (arg === 'play' || arg === 'pause') {
        onMediaAction('play_pause');
        appendToTab(tid, 'MEDIA -> PLAY/PAUSE');
      } else if (liveSystem?.media?.available) {
        appendToTab(tid, `NOW PLAYING: ${liveSystem.media.title} — ${liveSystem.media.artist} [${liveSystem.media.is_playing ? 'PLAYING' : 'PAUSED'}]`);
      } else {
        appendToTab(tid, 'Нет активной сессии ОС. Используйте: media next | prev | play');
      }
      return;
    }

    if (head === 'vol') {
      const n = Number(arg);
      if (isNaN(n) || n < 0 || n > 100) {
        appendToTab(tid, `Громкость: ${isMuted ? 'MUTE' : `${volume}%`}. Использование: vol <0-100>`);
        return;
      }
      onChangeVolume(n);
      appendToTab(tid, `AUDIO -> ${n}%`);
      return;
    }

    if (head === 'mute') {
      onToggleMute();
      appendToTab(tid, `AUDIO -> ${isMuted ? 'UNMUTED' : 'MUTED'}`);
      return;
    }

    if (head === 'island') {
      onToggleIsland();
      appendToTab(tid, `LUMA ISLAND -> ${dynamicIslandEnabled ? 'OFF' : 'ON'}`);
      return;
    }

    if (head === 'theme') {
      if (arg === 'dark' || arg === 'light') {
        onSetThemeMode?.(arg);
        appendToTab(tid, `THEME MODE -> ${arg.toUpperCase()}`);
      } else if (arg === 'nothing' || arg === 'pixelbook') {
        onSetDesignStyle?.(arg);
        appendToTab(tid, `DESIGN STYLE -> ${arg.toUpperCase()}`);
      } else if (['nothing_mono', 'nothing_paper', 'm3_expressive', 'amoled', 'purple', 'spring'].includes(arg)) {
        onSelectTheme?.(arg);
        appendToTab(tid, `THEME -> ${arg}`);
      } else {
        appendToTab(tid, 'Темы: nothing_mono | nothing_paper | m3_expressive | dark | amoled | light | purple | spring | nothing | pixelbook');
      }
      return;
    }

    if (head === 'anim') {
      if (arg === 'standard' || arg === 'spring' || arg === 'glide' || arg === 'none') {
        onSelectAnim?.(arg);
        appendToTab(tid, `ANIMATION PRESET -> ${arg.toUpperCase()}`);
      } else {
        appendToTab(tid, 'Использование: anim standard | spring | glide | none');
      }
      return;
    }

    if (head === 'taskbar') {
      if (arg === 'bottom' || arg === 'left' || arg === 'top') {
        onSetTaskbarPosition?.(arg);
        appendToTab(tid, `TASKBAR POSITION -> ${arg.toUpperCase()}`);
      } else {
        appendToTab(tid, `Текущее положение: ${taskbarPosition}. Использование: taskbar bottom | left | top`);
      }
      return;
    }

    if (head === 'fullscreen' || head === 'fs') {
      onToggleFullscreen?.();
      appendToTab(tid, 'FULLSCREEN -> TOGGLED');
      return;
    }

    if (head === 'ping' || head === 'rpc') {
      const method = head === 'rpc' && rest ? rest : 'system.ping';
      const t0 = performance.now();
      await onCallRpc(method);
      const dt = Math.round(performance.now() - t0);
      setLastExecMs(dt);
      appendToTab(tid, `RPC ${method} @ 127.0.0.1:49215  ok=true  rtt=${dt}ms`, 'accent');
      return;
    }

    if (head === 'lock' || head === 'sleep') {
      onPowerAction(head);
      appendToTab(tid, `POWER -> ${head.toUpperCase()}`);
      return;
    }

    // ==================== LUMA OS 1.5.1 BUILT-IN PRO COMMANDS (+20) ====================
    if (head === 'ip' || head === 'net') {
      setBusy(true);
      try {
        const r = await fetch('/api/kernel/network/adapters');
        const d = await r.json();
        const list = Array.isArray(d.adapters) ? d.adapters : [];
        if (list.length === 0) appendToTab(tid, 'Сетевые адаптеры не найдены.');
        else {
          appendToTab(tid, list.map((a: any) => `${a.up ? '●' : '○'} ${String(a.name).padEnd(22)} IPv4: ${String(a.ipv4 || '—').padEnd(16)} MAC: ${a.mac || '—'}`).join('\n'));
        }
      } catch { appendToTab(tid, 'Ошибка запроса сетевых интерфейсов', 'err'); } finally { setBusy(false); }
      return;
    }

    if (head === 'tcp') {
      setBusy(true);
      try {
        const r = await fetch('/api/kernel/security/network');
        const d = await r.json();
        const conns = Array.isArray(d.connections) ? d.connections.slice(0, 20) : [];
        appendToTab(tid, conns.length ? conns.map((c: any) => `${c.suspicious ? '⚠ ' : '  '}${String(c.process_name || 'proc').padEnd(16)} ${c.local_addr} -> ${c.remote_addr} [${c.state}]`).join('\n') : 'Активных TCP-соединений нет.');
      } catch { appendToTab(tid, 'Ошибка чтения TCP-таблицы', 'err'); } finally { setBusy(false); }
      return;
    }

    if (head === 'battery') {
      setBusy(true);
      try {
        const r = await fetch('/api/kernel/battery/analytics');
        const d = await r.json();
        const hw = d.hardware || {};
        appendToTab(tid, [
          `БАТАРЕЯ: ${hw.present ? `${hw.percent}% (${hw.charging ? 'Зарядка' : 'От батареи'})` : 'Стационарный ПК (от сети)'}`,
          `ЗДОРОВЬЕ: ${hw.health_percent || 100}% · ЦИКЛЫ: ${hw.cycle_count ?? 0} · МОЩНОСТЬ: ${(hw.power_watts || 0).toFixed(1)} Вт`,
        ].join('\n'), 'accent');
      } catch { appendToTab(tid, 'Ошибка чтения батареи', 'err'); } finally { setBusy(false); }
      return;
    }

    if (head === 'wireless') {
      setBusy(true);
      try {
        const r = await fetch('/api/kernel/wireless/batteries?refresh=1');
        const d = await r.json();
        const devs = Array.isArray(d.devices) ? d.devices : [];
        appendToTab(tid, devs.length ? devs.map((x: any) => `• ${x.name} [${x.device_type} · ${x.transport || 'BT/2.4GHz'}] — ${x.battery_percent >= 0 ? `${x.battery_percent}%` : 'Подкл.'}`).join('\n') : 'Беспроводные гаджеты не обнаружены.');
      } catch { appendToTab(tid, 'Ошибка сканера беспроводных устройств', 'err'); } finally { setBusy(false); }
      return;
    }

    if (head === 'scan') {
      const scanMode = arg === 'deep' ? 'deep' : arg === 'proc' || arg === 'processes' ? 'processes' : 'quick';
      setBusy(true);
      appendToTab(tid, `LumaShield 2.0: запуск сканирования (${scanMode})...`, 'accent');
      try {
        const r = await fetch('/api/kernel/security/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: scanMode }),
        });
        const d = await r.json();
        const thr = Array.isArray(d.threats) ? d.threats : [];
        appendToTab(tid, `Проверено объектов: ${d.files_scanned} за ${d.elapsed_ms} мс · Угроз: ${thr.length}`, thr.length > 0 ? 'err' : 'accent');
        if (thr.length > 0) appendToTab(tid, thr.map((t: any) => `  [${t.severity}] ${t.name} (${t.category}) — ${t.reason}`).join('\n'), 'err');
      } catch { appendToTab(tid, 'Ошибка LumaShield 2.0', 'err'); } finally { setBusy(false); }
      return;
    }

    if (head === 'hosts') {
      setBusy(true);
      try {
        const r = await fetch('/api/kernel/security/hosts-audit');
        const d = await r.json();
        appendToTab(tid, `HOSTS (${d.path}): записей ${d.total_mappings}, подозрительных ${d.suspicious_count}`, d.suspicious_count > 0 ? 'err' : 'accent');
      } catch { appendToTab(tid, 'Ошибка аудита hosts', 'err'); } finally { setBusy(false); }
      return;
    }

    if (head === 'trash') {
      setBusy(true);
      try {
        if (arg === 'empty') {
          const r = await fetch('/api/kernel/trash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'empty' }) });
          const d = await r.json();
          appendToTab(tid, `Корзина очищена. Удалено объектов: ${d.removed ?? 0}`, 'accent');
        } else {
          const r = await fetch('/api/kernel/trash');
          const d = await r.json();
          const list = Array.isArray(d.items) ? d.items : [];
          appendToTab(tid, list.length ? list.map((x: any) => `• ${x.name} (${(x.size_bytes / 1024).toFixed(1)} КБ) — ${x.deleted_at}`).join('\n') : 'Корзина Luma OS пуста.');
        }
      } catch { appendToTab(tid, 'Ошибка чтения Корзины', 'err'); } finally { setBusy(false); }
      return;
    }

    if (head === 'dpi') {
      setBusy(true);
      try {
        const val = parseInt(arg, 10);
        if (Number.isFinite(val) && val >= 200 && val <= 16000) {
          const r = await fetch('/api/kernel/mouse/dpi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ effective_dpi: val }) });
          const d = await r.json();
          appendToTab(tid, `DPI обновлён: ${d.effective_dpi} eDPI (скорость Windows: ${d.windows_speed}/20)`, 'accent');
        } else {
          const r = await fetch('/api/kernel/mouse/dpi');
          const d = await r.json();
          appendToTab(tid, `Мышь: ${d.detected_mouse_name || 'System Mouse'} · Sensor ${d.sensor_dpi} DPI · Effective ${d.effective_dpi} eDPI (Win ${d.windows_speed}/20)`);
        }
      } catch { appendToTab(tid, 'Ошибка службы DPI', 'err'); } finally { setBusy(false); }
      return;
    }

    if (head === 'uptime' || head === 'gc') {
      setBusy(true);
      try {
        const r = await fetch(`/api/kernel/diagnostics${head === 'gc' ? '?gc=1' : ''}`);
        const d = await r.json();
        const mins = Math.floor((d.uptime_sec || 0) / 60);
        appendToTab(tid, `LumaCore ${d.kernel_version} · Uptime: ${mins}м ${(d.uptime_sec || 0) % 60}с · Heap: ${d.heap_alloc_mb} МБ · Goroutines: ${d.goroutines}${d.gc_trimmed ? ' · GC выполнен ✓' : ''}`, 'accent');
      } catch { appendToTab(tid, 'Ошибка диагностики ядра', 'err'); } finally { setBusy(false); }
      return;
    }

    if (head === 'uuid') {
      const id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
      appendToTab(tid, id, 'accent');
      return;
    }

    if (head === 'hash') {
      if (!rest) { appendToTab(tid, 'Использование: hash <текст>', 'err'); return; }
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rest));
        const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
        appendToTab(tid, `SHA-256: ${hex}`, 'accent');
      } catch { appendToTab(tid, 'Crypto API недоступно', 'err'); }
      return;
    }

    if (head === 'base64') {
      const sub = parts[1]?.toLowerCase();
      const body = cmd.split(/\s+/).slice(2).join(' ');
      if (!body || (sub !== 'enc' && sub !== 'dec')) {
        appendToTab(tid, 'Использование: base64 enc <текст>  |  base64 dec <base64>', 'err');
        return;
      }
      try {
        const res = sub === 'enc' ? btoa(unescape(encodeURIComponent(body))) : decodeURIComponent(escape(atob(body)));
        appendToTab(tid, res, 'accent');
      } catch { appendToTab(tid, 'Ошибка Base64', 'err'); }
      return;
    }

    if (head === 'hex') {
      const n = parseInt(arg, 10);
      if (!Number.isFinite(n)) { appendToTab(tid, 'Использование: hex <целое число>', 'err'); return; }
      appendToTab(tid, `DEC: ${n}  |  HEX: 0x${n.toString(16).toUpperCase()}  |  BIN: 0b${n.toString(2)}`, 'accent');
      return;
    }

    if (head === 'date') {
      const now = new Date();
      appendToTab(tid, `${now.toLocaleString('ru-RU')} (ISO: ${now.toISOString()})`, 'accent');
      return;
    }

    if (head === 'matrix') {
      const rows = Array.from({ length: 6 }, () =>
        Array.from({ length: 44 }, () => '01アイウエオカキクケコLUMA'[Math.floor(Math.random() * 17)]).join('')
      );
      appendToTab(tid, rows.join('\n'), 'accent');
      return;
    }

    if (head === 'notify') {
      const text = rest || 'Тестовое уведомление из Luma Terminal 1.5.1!';
      await fetch('/api/kernel/notifications/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', app: 'Telegram', title: 'Luma Terminal', body: text, level: 'info' }),
      }).catch(() => {});
      appendToTab(tid, `Уведомление отправлено в Dynamic Island и Центр уведомлений: «${text}»`, 'accent');
      return;
    }

    // Real Host OS Shell execution (`sh <cmd>` or direct fallback!)
    const shellCmd = head === 'sh' ? rest : cmd;
    if (!shellCmd) {
      appendToTab(tid, 'Использование: sh <системная команда>', 'err');
      return;
    }
    setBusy(true);
    const t0 = performance.now();
    try {
      const r = await fetch('/api/kernel/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: shellCmd }),
      });
      const d = await r.json();
      setLastExecMs(Math.round(performance.now() - t0));
      if (d.stdout && String(d.stdout).trim()) {
        appendToTab(tid, String(d.stdout).trimEnd(), 'out');
      }
      if (d.stderr && String(d.stderr).trim()) {
        appendToTab(tid, String(d.stderr).trimEnd(), 'err');
      }
      if (!d.stdout?.trim() && !d.stderr?.trim()) {
        appendToTab(tid, `(exit ${d.exit_code ?? 0})`, d.ok ? 'out' : 'err');
      }
    } catch {
      appendToTab(tid, `Неизвестная команда: "${head}". Введите "help".`, 'err');
    } finally {
      setBusy(false);
    }
  };

  // Auto-run command launched from Desktop Shortcut
  useEffect(() => {
    if (pendingCommand && pendingCommand.command) {
      runCommand(pendingCommand.command);
      onConsumePendingCommand?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCommand?.id]);

  const handleCopyOutput = async () => {
    if (!activeTab) return;
    const text = activeTab.lines.map((l) => l.text).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
    }
    fetch('/api/kernel/clipboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const handleExportLog = () => {
    if (!activeTab) return;
    const text = activeTab.lines.map((l) => l.text).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luma-terminal-${activeTab.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTabComplete = () => {
    const val = input.trim().toLowerCase();
    if (!val || val.includes(' ')) return;
    const match = BUILTIN_COMMANDS.find((c) => c.startsWith(val));
    if (match) setInput(match + ' ');
  };

  const quickChips = ['neofetch', 'sys', 'wireless', 'scan', 'ip', 'tcp', 'hosts', 'trash', 'dpi', 'uuid', 'gc'];
  const hostName = liveSystem?.hostname || 'host';
  const fontCls = fontSize === 'sm' ? 'text-[11px]' : fontSize === 'lg' ? 'text-[14px]' : 'text-xs';
  const visibleLines = (activeTab?.lines || []).filter(
    (l) => !logSearch.trim() || l.text.toLowerCase().includes(logSearch.trim().toLowerCase())
  );

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`h-full flex flex-col font-mono ${fontCls} cursor-text ${
        isDark ? 'bg-[#09090b] text-zinc-200' : 'bg-[#e4e5df] text-zinc-900'
      }`}
    >
      {/* Multi-Tab Header Bar + Pro Tools */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 shrink-0 ${
          isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-zinc-900/10 bg-black/[0.04]'
        }`}
      >
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const active = t.id === activeTab?.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  setActiveTabId(t.id);
                  setHistIdx(-1);
                }}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px] cursor-pointer transition ${
                  active
                    ? 'bg-[var(--luma-accent)] text-white font-bold'
                    : isDark
                    ? 'bg-white/[0.05] text-zinc-400 hover:text-white'
                    : 'bg-white/60 text-zinc-700 border border-zinc-400/50 hover:text-zinc-950'
                }`}
              >
                <Terminal className="w-3 h-3" />
                <span>{t.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(t.id);
                    }}
                    className="opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={addNewTab}
            title="Новая вкладка терминала"
            className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition ${
              isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-zinc-900/10 text-zinc-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className={`hidden sm:flex items-center rounded-lg border overflow-hidden text-[10px] ${isDark ? 'border-white/10' : 'border-zinc-400/60'}`}>
            {(['sm', 'md', 'lg'] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setFontSize(sz)}
                className={`px-1.5 py-0.5 uppercase cursor-pointer ${fontSize === sz ? 'bg-[var(--luma-accent)] text-white font-bold' : ''}`}
              >
                {sz === 'sm' ? 'S' : sz === 'md' ? 'M' : 'L'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            title="Поиск по выводу"
            className={`p-1.5 rounded-lg cursor-pointer transition ${
              searchOpen
                ? 'bg-[var(--luma-accent)] text-white'
                : isDark
                ? 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300'
                : 'bg-white/60 border border-zinc-400/50 text-zinc-700'
            }`}
          >
            <Search className="w-3 h-3" />
          </button>
          <button
            onClick={handleExportLog}
            title="Экспорт лога в .txt"
            className={`p-1.5 rounded-lg cursor-pointer transition ${
              isDark ? 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300' : 'bg-white/60 border border-zinc-400/50 text-zinc-700'
            }`}
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            onClick={handleCopyOutput}
            title="Скопировать вывод"
            className={`px-2 py-1 rounded-lg text-[10px] inline-flex items-center gap-1 cursor-pointer transition ${
              isDark ? 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300' : 'bg-white/60 border border-zinc-400/50 text-zinc-700'
            }`}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'OK' : 'Копия'}</span>
          </button>
          <button
            onClick={clearActiveTab}
            title="Очистить вывод"
            className={`p-1.5 rounded-lg cursor-pointer transition ${
              isDark ? 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400' : 'bg-white/60 border border-zinc-400/50 text-zinc-700'
            }`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Quick Command Chips & Optional Output Search */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`px-3 py-1.5 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${
          isDark ? 'border-white/[0.06]' : 'border-zinc-900/10'
        }`}
      >
        {quickChips.map((chip) => (
          <button
            key={chip}
            onClick={() => runCommand(chip)}
            className={`px-2 py-0.5 rounded-md text-[10px] border cursor-pointer transition whitespace-nowrap ${
              isDark
                ? 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:border-[var(--luma-accent)]'
                : 'bg-white/65 border-zinc-400/50 text-zinc-700 hover:text-zinc-950 hover:border-[var(--luma-accent)]'
            }`}
          >
            {chip}
          </button>
        ))}
        {lastExecMs !== null && !busy && (
          <span className="ml-auto text-[10px] opacity-60 whitespace-nowrap">{lastExecMs} ms</span>
        )}
        {busy && <span className="ml-auto text-[10px] text-[var(--luma-accent)] animate-pulse">EXEC...</span>}
      </div>

      {searchOpen && (
        <div onClick={(e) => e.stopPropagation()} className={`px-3 py-1.5 border-b flex items-center gap-2 shrink-0 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-zinc-900/10 bg-black/[0.04]'}`}>
          <Search className="w-3 h-3 text-[var(--luma-accent)]" />
          <input
            autoFocus
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder="Фильтр строк терминала..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-500"
          />
          {logSearch && (
            <button onClick={() => setLogSearch('')} className="cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Output Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
        {visibleLines.map((l) => (
          <pre
            key={l.id}
            className={`whitespace-pre-wrap break-words leading-relaxed ${
              l.kind === 'in'
                ? 'text-[var(--luma-accent)] font-semibold'
                : l.kind === 'accent'
                ? isDark
                  ? 'text-zinc-100 font-semibold'
                  : 'text-zinc-900 font-semibold'
                : l.kind === 'err'
                ? 'text-amber-500'
                : isDark
                ? 'text-zinc-300'
                : 'text-zinc-700'
            }`}
          >
            {l.text}
          </pre>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Prompt Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = input;
          setInput('');
          runCommand(v);
        }}
        className={`px-4 py-2.5 border-t flex items-center gap-2 shrink-0 ${
          isDark ? 'border-white/10 bg-white/[0.015]' : 'border-zinc-900/15 bg-black/[0.04]'
        }`}
      >
        <span className="text-[var(--luma-accent)] font-bold shrink-0">
          luma@{hostName}:{activeTab?.cwd || '~'}$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            const hist = activeTab?.history || [];
            if (e.key === 'Tab') {
              e.preventDefault();
              handleTabComplete();
            } else if (e.key === 'ArrowUp' && hist.length > 0) {
              e.preventDefault();
              const next = Math.min(hist.length - 1, histIdx + 1);
              setHistIdx(next);
              setInput(hist[next]);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (histIdx <= 0) {
                setHistIdx(-1);
                setInput('');
              } else {
                const next = histIdx - 1;
                setHistIdx(next);
                setInput(hist[next]);
              }
            }
          }}
          placeholder="neofetch, top, kill, explorer, taskmgr, find, ls ~, theme... (Tab)"
          className="flex-1 bg-transparent outline-none placeholder:text-zinc-500"
          autoFocus
        />
      </form>
    </div>
  );
};
