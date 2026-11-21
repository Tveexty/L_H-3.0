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
      { id: 1, kind: 'accent', text: 'LUMA OS 1.2.3B (LITHIUM) · LUMACORE 1.3 PRO TERMINAL  [IPC 127.0.0.1:49215]' },
      { id: 2, kind: 'out', text: 'Команды: help, neofetch, top, kill, explorer, taskmgr, ls, find, mkdir, touch, cat, theme, anim, sh <cmd>.' },
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
          'LUMA PRO TERMINAL — СПРАВОЧНИК КОМАНД:',
          '  neofetch               — паспорт системы, железо и стиль оболочки',
          '  sys / disks / loc      — CPU, GPU, RAM, тома дисков, авто-регион',
          '  top | ps               — реальные процессы хоста (PID, CPU%, RAM)',
          '  ls [path]              — список файлов каталога на ПК (по умолч. ~)',
          '  cat <path>             — просмотр содержимого файла на ПК',
          '  open <path|url>        — открыть файл, папку или URL в системе',
          '  weather                — актуальная погода по региону хоста',
          '  clip [set <текст>]     — чтение или запись системного буфера обмена',
          '  calc <выражение>       — быстрый расчёт (например: calc 1024*16)',
          '  media [next|prev|play] — управление системной музыкой',
          '  vol <0-100> | mute     — системная громкость и звук',
          '  island                 — переключить Luma Island',
          '  theme <dark|light|nothing|pixelbook> — переключить тему/дизайн',
          '  taskbar <bottom|left|top>            — положение панели задач',
          '  fullscreen             — переключить полноэкранный режим',
          '  ping | rpc <method>    — JSON-RPC 2.0 вызов к ядру (порт 49215)',
          '  sh <команда>           — выполнить любую команду ОС (PowerShell/bash)',
          '  lock | sleep | clear   — питание и очистка вкладки',
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
          `  ██║     ██║   ██║██╔████╔██║███████║     OS      : Luma OS 1.2.3B Lithium (${os})`,
          `  ██║     ██║   ██║██║╚██╔╝██║██╔══██║     STYLE   : ${designStyle.toUpperCase()} · TASKBAR ${taskbarPosition.toUpperCase()}`,
          `  ███████╗╚██████╔╝██║ ╚═╝ ██║██║  ██║     CPU     : ${cpu}`,
          `  ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝     GPU     : ${gpu}`,
          `                                           RAM     : ${ram}`,
          `  KERNEL : LumaCore 1.3 · Shield 1.3       REGION  : ${loc}`,
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

  const quickChips = ['neofetch', 'top', 'ls ~', 'explorer', 'taskmgr', 'sys', 'weather', 'ping'];
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
