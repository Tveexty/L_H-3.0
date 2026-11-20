import React, { useEffect, useRef, useState } from 'react';
import { LiveSystemTelemetry } from '../data/launcherData';

interface LumaTerminalWindowProps {
  isDark: boolean;
  liveSystem: LiveSystemTelemetry | null;
  volume: number;
  isMuted: boolean;
  dynamicIslandEnabled: boolean;
  onChangeVolume: (val: number) => void;
  onToggleMute: () => void;
  onMediaAction: (action: 'play_pause' | 'next' | 'prev') => void;
  onToggleIsland: () => void;
  onPowerAction: (action: 'lock' | 'sleep' | 'recycle_bin') => void;
  onCallRpc: (method: string) => Promise<void>;
}

interface TermLine {
  id: number;
  kind: 'in' | 'out' | 'err';
  text: string;
}

export const LumaTerminalWindow: React.FC<LumaTerminalWindowProps> = ({
  isDark,
  liveSystem,
  volume,
  isMuted,
  dynamicIslandEnabled,
  onChangeVolume,
  onToggleMute,
  onMediaAction,
  onToggleIsland,
  onPowerAction,
  onCallRpc,
}) => {
  const [lines, setLines] = useState<TermLine[]>([
    { id: 1, kind: 'out', text: 'LUMA CORE 1.0.2b SHELL  [IPC 127.0.0.1:49215]' },
    { id: 2, kind: 'out', text: 'Введите "help" для списка системных команд.' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const append = (text: string, kind: 'out' | 'err' = 'out') => {
    setLines((prev) => [...prev, { id: Date.now() + Math.random(), kind, text }]);
  };

  const runCommand = async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    setLines((prev) => [...prev, { id: Date.now() + Math.random(), kind: 'in', text: `luma@host:~$ ${cmd}` }]);
    setHistory((prev) => [cmd, ...prev.slice(0, 30)]);
    setHistIdx(-1);

    const parts = cmd.split(/\s+/);
    const head = parts[0].toLowerCase();
    const arg = (parts[1] || '').toLowerCase();

    if (head === 'clear' || head === 'cls') {
      setLines([]);
      return;
    }

    if (head === 'help') {
      append(
        [
          'КОМАНДЫ LUMA TERMINAL:',
          '  sys               — реальная телеметрия CPU / GPU / RAM / ОС',
          '  disks             — список смонтированных томов и свободного места',
          '  loc               — определённый регион, город, часовой пояс и IP',
          '  media [next|prev|play] — состояние или управление музыкой в системе',
          '  vol <0-100>       — установить системную громкость',
          '  mute              — выключить / включить звук',
          '  island            — включить / выключить Luma Island',
          '  ping              — JSON-RPC 2.0 запрос к ядру Luma Core (49215)',
          '  lock / sleep      — блокировка экрана или сон',
          '  clear             — очистить экран',
        ].join('\n')
      );
      return;
    }

    if (head === 'sys') {
      if (!liveSystem) {
        append('Телеметрия ещё загружается...', 'err');
        return;
      }
      append(
        [
          `HOST : ${liveSystem.hostname} (${liveSystem.os_name})`,
          `CPU  : ${liveSystem.cpu_model} (${liveSystem.cpu_cores} cores) — ${liveSystem.cpu_percent}%`,
          `GPU  : ${liveSystem.gpu_name}`,
          `RAM  : ${liveSystem.ram_used_gb.toFixed(1)} / ${liveSystem.ram_total_gb.toFixed(1)} GB (${liveSystem.ram_percent}%)`,
          `BAT  : ${liveSystem.battery_percent}% ${liveSystem.battery_charging ? '(CHARGING)' : '(BATTERY)'}`,
          `NET  : ↓ ${liveSystem.net_down_mbps.toFixed(1)} Mbps  ↑ ${liveSystem.net_up_mbps.toFixed(1)} Mbps`,
          `VOL  : ${isMuted ? 'MUTE' : `${volume}%`}`,
        ].join('\n')
      );
      return;
    }

    if (head === 'disks') {
      if (!liveSystem?.disks?.length) {
        append('Тома не обнаружены.', 'err');
        return;
      }
      append(
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
        append('Регион не определён.', 'err');
        return;
      }
      const l = liveSystem.location;
      append(
        `CITY: ${l.city} | REGION: ${l.region} | COUNTRY: ${l.country}\nTZ  : ${l.timezone} | COORDS: ${l.latitude.toFixed(3)}, ${l.longitude.toFixed(3)} | IP: ${l.ip}`
      );
      return;
    }

    if (head === 'media') {
      if (arg === 'next') {
        onMediaAction('next');
        append('MEDIA -> NEXT TRACK dispatched.');
      } else if (arg === 'prev') {
        onMediaAction('prev');
        append('MEDIA -> PREVIOUS TRACK dispatched.');
      } else if (arg === 'play' || arg === 'pause') {
        onMediaAction('play_pause');
        append('MEDIA -> PLAY/PAUSE dispatched.');
      } else if (liveSystem?.media?.available) {
        append(`NOW PLAYING: ${liveSystem.media.title} — ${liveSystem.media.artist} [${liveSystem.media.is_playing ? 'PLAYING' : 'PAUSED'}]`);
      } else {
        append('Активная системная медиа-сессия не найдена. Используйте: media next | prev | play');
      }
      return;
    }

    if (head === 'vol') {
      const n = Number(arg);
      if (isNaN(n) || n < 0 || n > 100) {
        append(`Текущая громкость: ${isMuted ? 'MUTE' : `${volume}%`}. Использование: vol <0-100>`);
        return;
      }
      onChangeVolume(n);
      append(`AUDIO -> VOLUME SET TO ${n}%`);
      return;
    }

    if (head === 'mute') {
      onToggleMute();
      append(`AUDIO -> ${isMuted ? 'UNMUTED' : 'MUTED'}`);
      return;
    }

    if (head === 'island') {
      onToggleIsland();
      append(`LUMA ISLAND -> ${dynamicIslandEnabled ? 'OFF' : 'ON'}`);
      return;
    }

    if (head === 'ping') {
      const t0 = performance.now();
      await onCallRpc('system.ping');
      const dt = (performance.now() - t0).toFixed(1);
      append(`PONG 127.0.0.1:49215  version=1.0.2b  rtt=${dt}ms`);
      return;
    }

    if (head === 'lock' || head === 'sleep') {
      onPowerAction(head);
      append(`POWER -> ${head.toUpperCase()} dispatched.`);
      return;
    }

    append(`Неизвестная команда: "${head}". Введите "help".`, 'err');
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`h-full flex flex-col font-mono text-xs p-4 cursor-text ${
        isDark ? 'bg-[#09090b] text-zinc-200' : 'bg-[#f8f8f6] text-zinc-900'
      }`}
    >
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {lines.map((l) => (
          <pre
            key={l.id}
            className={`whitespace-pre-wrap break-words leading-relaxed ${
              l.kind === 'in'
                ? 'text-[#d71921] font-semibold'
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = input;
          setInput('');
          runCommand(v);
        }}
        className={`mt-3 pt-2.5 border-t flex items-center gap-2 ${
          isDark ? 'border-white/10' : 'border-zinc-300'
        }`}
      >
        <span className="text-[#d71921] font-bold shrink-0">luma@host:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && history.length > 0) {
              e.preventDefault();
              const next = Math.min(history.length - 1, histIdx + 1);
              setHistIdx(next);
              setInput(history[next]);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (histIdx <= 0) {
                setHistIdx(-1);
                setInput('');
              } else {
                const next = histIdx - 1;
                setHistIdx(next);
                setInput(history[next]);
              }
            }
          }}
          placeholder="sys, disks, loc, media next, vol 50, ping..."
          className="flex-1 bg-transparent outline-none placeholder:text-zinc-500"
          autoFocus
        />
      </form>
    </div>
  );
};
