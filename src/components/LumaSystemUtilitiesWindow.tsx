import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Server,
  Wrench,
  Volume2,
  VolumeX,
  Wifi,
  Shield,
  Monitor,
  Sliders,
  Cpu,
  Scissors,
  Keyboard,
  Terminal,
  RefreshCw,
  Save,
  Search,
  ExternalLink,
  Power,
  Bluetooth,
  Play,
  Square,
  RotateCw,
  HardDrive,
  Trash2,
  FolderOpen,
  Activity,
  Calculator,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { LumaLangCode, tr } from '../i18n/translations';

interface SystemServiceItem {
  name: string;
  display_name: string;
  status: string;
  start_type: string;
  source: 'luma' | 'os';
  pid?: number;
  description?: string;
}

interface HardwareDeviceItem {
  name: string;
  class: string;
  status: string;
  manufacturer: string;
  instance_id?: string;
}

interface NetworkAdapterItem {
  name: string;
  ipv4: string;
  ipv6?: string;
  mac: string;
  up: boolean;
  speed?: string;
}

interface FirewallProfileItem {
  name: string;
  enabled: boolean;
}

interface DiskInfoItem {
  mount: string;
  label: string;
  used_gb: number;
  total_gb: number;
  free_gb: number;
  percent: number;
}

interface LumaSystemUtilitiesWindowProps {
  isDark: boolean;
  lang?: LumaLangCode;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  volume: number;
  isMuted: boolean;
  disks?: DiskInfoItem[];
  onChangeVolume: (val: number) => void;
  onToggleMute: () => void;
  onOpenCalculator?: () => void;
  onPushToast: (title: string, message: string, level?: 'info' | 'success' | 'warning') => void;
}

type UtilTab = 'devices' | 'services' | 'network' | 'sound' | 'notepad' | 'disks' | 'applets';

const NOTEPAD_STORAGE_KEY = 'luma_notepad_text_v1';

export const LumaSystemUtilitiesWindow: React.FC<LumaSystemUtilitiesWindowProps> = ({
  isDark,
  lang = 'ru',
  surfaceCls,
  btnCls,
  mutedCls,
  volume,
  isMuted,
  disks = [],
  onChangeVolume,
  onToggleMute,
  onOpenCalculator,
  onPushToast,
}) => {
  const [tab, setTab] = useState<UtilTab>('devices');

  // 1. Device Manager state
  const [devices, setDevices] = useState<HardwareDeviceItem[]>([]);
  const [devQuery, setDevQuery] = useState('');
  const [devLoading, setDevLoading] = useState(false);

  // 2. Services Manager state
  const [services, setServices] = useState<SystemServiceItem[]>([]);
  const [svcQuery, setSvcQuery] = useState('');
  const [svcLoading, setSvcLoading] = useState(false);
  const [svcBusy, setSvcBusy] = useState<string | null>(null);

  // 3. Network & Firewall state
  const [adapters, setAdapters] = useState<NetworkAdapterItem[]>([]);
  const [firewall, setFirewall] = useState<FirewallProfileItem[]>([]);
  const [hostname, setHostname] = useState('');
  const [netLoading, setNetLoading] = useState(false);
  const [pingHost, setPingHost] = useState('1.1.1.1');
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<{
    ok: boolean;
    host?: string;
    resolved_ip?: string;
    avg_ms?: number;
    min_ms?: number;
    max_ms?: number;
    error?: string;
  } | null>(null);

  // 4. Notepad Pro state
  const [notePath, setNotePath] = useState('~/Desktop/luma_note.txt');
  const [noteContent, setNoteContent] = useState<string>(() => {
    try {
      return localStorage.getItem(NOTEPAD_STORAGE_KEY) || 'Быстрая заметка Luma OS 1.2.2 (Lithium)\n';
    } catch {
      return '';
    }
  });
  const [savingNote, setSavingNote] = useState(false);

  // 5. Disk & Temp Cleaner state
  const [tempInfo, setTempInfo] = useState<{ temp_dir: string; files_count: number; size_mb: number } | null>(null);
  const [cleaningTemp, setCleaningTemp] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(NOTEPAD_STORAGE_KEY, noteContent);
    } catch {
      /* ignore */
    }
  }, [noteContent]);

  const loadDevices = async () => {
    setDevLoading(true);
    try {
      const r = await fetch('/api/kernel/devices');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.devices)) setDevices(d.devices);
      }
    } catch {
      /* ignore */
    } finally {
      setDevLoading(false);
    }
  };

  const loadServices = async () => {
    setSvcLoading(true);
    try {
      const r = await fetch('/api/kernel/services?limit=90');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.services)) setServices(d.services);
      }
    } catch {
      /* ignore */
    } finally {
      setSvcLoading(false);
    }
  };

  const loadNetwork = async () => {
    setNetLoading(true);
    try {
      const r = await fetch('/api/kernel/network/info');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.adapters)) setAdapters(d.adapters);
        if (Array.isArray(d?.firewall)) setFirewall(d.firewall);
        if (d?.hostname) setHostname(d.hostname);
      }
    } catch {
      /* ignore */
    } finally {
      setNetLoading(false);
    }
  };

  const loadTempInfo = async () => {
    try {
      const r = await fetch('/api/kernel/storage/temp-info');
      if (r.ok) {
        const d = await r.json();
        if (d?.ok) setTempInfo({ temp_dir: d.temp_dir, files_count: d.files_count, size_mb: d.size_mb });
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (tab === 'devices' && devices.length === 0) void loadDevices();
    if (tab === 'services' && services.length === 0) void loadServices();
    if (tab === 'network' && adapters.length === 0) void loadNetwork();
    if (tab === 'disks' && !tempInfo) void loadTempInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const controlService = async (name: string, action: 'start' | 'stop' | 'restart') => {
    setSvcBusy(`${name}_${action}`);
    try {
      const r = await fetch('/api/kernel/services/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, action }),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast('Диспетчер служб', `${name}: выполнено (${action})`, 'success');
        await loadServices();
      } else {
        onPushToast('Диспетчер служб', d?.error || 'Недостаточно прав или служба защищена', 'warning');
      }
    } catch {
      onPushToast('Диспетчер служб', 'Ошибка обращения к службе', 'warning');
    } finally {
      setSvcBusy(null);
    }
  };

  const runPing = async (targetOverride?: string) => {
    const target = (targetOverride ?? pingHost).trim();
    if (!target) return;
    setPingHost(target);
    setPingLoading(true);
    try {
      const r = await fetch('/api/kernel/network/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: target }),
      });
      const d = await r.json();
      setPingResult(d);
    } catch {
      setPingResult({ ok: false, host: target, error: 'Ошибка сетевого запроса' });
    } finally {
      setPingLoading(false);
    }
  };

  const playTestSound = () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = ctx.currentTime + i * 0.11;
        g.gain.setValueAtTime((isMuted ? 0 : volume / 100) * 0.15, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.24);
      });
    } catch {
      /* ignore */
    }
  };

  const openNoteFromDisk = async () => {
    try {
      const r = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', path: notePath }),
      });
      const d = await r.json();
      if (d?.ok) {
        setNoteContent(d.content || '');
        onPushToast('Блокнот Pro', `Открыт файл: ${d.path}`, 'success');
      } else {
        onPushToast('Блокнот Pro', d?.error || 'Файл не найден', 'warning');
      }
    } catch {
      onPushToast('Блокнот Pro', 'Ошибка чтения файла', 'warning');
    }
  };

  const saveNoteToDisk = async () => {
    setSavingNote(true);
    try {
      const r = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'newfile', path: notePath, content: noteContent }),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast('Блокнот Pro', `Сохранено: ${d.path}`, 'success');
      } else {
        onPushToast('Блокнот Pro', d?.error || 'Не удалось сохранить файл', 'warning');
      }
    } catch {
      onPushToast('Блокнот Pro', 'Ошибка сохранения', 'warning');
    } finally {
      setSavingNote(false);
    }
  };

  const cleanTempFiles = async () => {
    setCleaningTemp(true);
    try {
      const r = await fetch('/api/kernel/storage/temp-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clean' }),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast('Очистка диска', `Удалено объектов: ${d.removed_count} (${d.freed_mb} МБ)`, 'success');
        await loadTempInfo();
      }
    } catch {
      onPushToast('Очистка диска', 'Ошибка очистки временной папки', 'warning');
    } finally {
      setCleaningTemp(false);
    }
  };

  const openApplet = async (applet: string, title: string) => {
    try {
      const r = await fetch('/api/kernel/system-applet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applet }),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast('Системные службы', `Открыто: ${title}`, 'info');
      } else {
        onPushToast('Системные службы', d?.error || 'Недоступно в текущей ОС', 'warning');
      }
    } catch {
      onPushToast('Системные службы', 'Ошибка запуска утилиты', 'warning');
    }
  };

  const groupedDevices = useMemo(() => {
    const q = devQuery.trim().toLowerCase();
    const map = new Map<string, HardwareDeviceItem[]>();
    for (const dev of devices) {
      if (
        q &&
        !dev.name.toLowerCase().includes(q) &&
        !dev.class.toLowerCase().includes(q) &&
        !dev.manufacturer.toLowerCase().includes(q)
      ) {
        continue;
      }
      const cls = dev.class || 'System';
      if (!map.has(cls)) map.set(cls, []);
      map.get(cls)!.push(dev);
    }
    return Array.from(map.entries());
  }, [devices, devQuery]);

  const filteredServices = useMemo(() => {
    const q = svcQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.display_name.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [services, svcQuery]);

  const windowsApplets = [
    { id: 'settings', title: 'Параметры Windows', desc: 'Системные настройки ОС', icon: <Sliders className="w-4 h-4" /> },
    { id: 'control', title: 'Панель управления', desc: 'Классическая Control Panel', icon: <Wrench className="w-4 h-4" /> },
    { id: 'devmgmt', title: 'Диспетчер устройств', desc: 'Драйверы и оборудование', icon: <Cpu className="w-4 h-4" /> },
    { id: 'services', title: 'Службы (services.msc)', desc: 'Управление службами Windows', icon: <Server className="w-4 h-4" /> },
    { id: 'network', title: 'Сетевые адаптеры', desc: 'Wi-Fi, Ethernet, VPN (ncpa.cpl)', icon: <Wifi className="w-4 h-4" /> },
    { id: 'sound', title: 'Звук и устройства', desc: 'Микшер и вывод аудио (mmsys.cpl)', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'display', title: 'Экран и мониторы', desc: 'Разрешение, HDR, масштаб', icon: <Monitor className="w-4 h-4" /> },
    { id: 'bluetooth', title: 'Bluetooth и устройства', desc: 'Сопряжение и периферия', icon: <Bluetooth className="w-4 h-4" /> },
    { id: 'defender', title: 'Безопасность Windows', desc: 'Windows Defender (без конфликтов)', icon: <Shield className="w-4 h-4" /> },
    { id: 'firewall', title: 'Брандмауэр', desc: 'Правила сети (wf.msc)', icon: <Shield className="w-4 h-4" /> },
    { id: 'power', title: 'Электропитание', desc: 'Схемы питания (powercfg.cpl)', icon: <Power className="w-4 h-4" /> },
    { id: 'snip', title: 'Ножницы (Скриншот)', desc: 'Захват области экрана', icon: <Scissors className="w-4 h-4" /> },
    { id: 'osk', title: 'Экранная клавиатура', desc: 'Сенсорный ввод Windows', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'powershell', title: 'PowerShell', desc: 'Консоль администратора', icon: <Terminal className="w-4 h-4" /> },
    { id: 'taskschd', title: 'Планировщик заданий', desc: 'Автоматизация задач ОС', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'regedit', title: 'Редактор реестра', desc: 'Системный реестр Windows', icon: <Wrench className="w-4 h-4" /> },
  ];

  const navTabs: { id: UtilTab; label: string; icon: React.ReactNode }[] = [
    { id: 'devices', label: tr(lang, 'utilDevices'), icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'services', label: tr(lang, 'utilServices'), icon: <Server className="w-3.5 h-3.5" /> },
    { id: 'network', label: tr(lang, 'utilNetwork'), icon: <Wifi className="w-3.5 h-3.5" /> },
    { id: 'sound', label: tr(lang, 'utilSound'), icon: <Volume2 className="w-3.5 h-3.5" /> },
    { id: 'notepad', label: tr(lang, 'utilNotepad'), icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'disks', label: tr(lang, 'utilDisks'), icon: <HardDrive className="w-3.5 h-3.5" /> },
    { id: 'applets', label: tr(lang, 'utilClassic'), icon: <Wrench className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Top Native Services Ribbon */}
      <div
        className={`px-3.5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark ? 'border-white/[0.08]' : 'border-zinc-900/10'
        }`}
      >
        <div className="flex flex-wrap gap-1.5 text-xs">
          {navTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-2.5 py-1.5 rounded-xl border font-semibold inline-flex items-center gap-1.5 cursor-pointer transition ${
                tab === t.id ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white shadow' : btnCls
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {onOpenCalculator && (
          <button
            onClick={onOpenCalculator}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
            title="Открыть отдельный Калькулятор Luma"
          >
            <Calculator className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            <span>{tr(lang, 'calculator')}</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 1. NATIVE LUMA DEVICE MANAGER */}
        {tab === 'devices' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className={`flex-1 min-w-[220px] flex items-center gap-2 px-3 py-1.5 rounded-xl border ${btnCls}`}>
                <Search className="w-3.5 h-3.5 opacity-60" />
                <input
                  value={devQuery}
                  onChange={(e) => setDevQuery(e.target.value)}
                  placeholder="Поиск оборудования, драйверов, GPU, контроллеров..."
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>
              <button
                onClick={() => void loadDevices()}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${devLoading ? 'animate-spin' : ''}`} />
                Сканировать оборудование ({devices.length})
              </button>
            </div>

            {groupedDevices.length === 0 ? (
              <div className={`p-6 rounded-2xl border text-center text-xs ${surfaceCls} ${mutedCls}`}>
                {devLoading ? 'Опрос шины оборудования PnP / sysfs...' : 'Устройства не найдены'}
              </div>
            ) : (
              <div className="space-y-3">
                {groupedDevices.map(([cls, list]) => (
                  <div key={cls} className={`rounded-2xl border overflow-hidden ${surfaceCls}`}>
                    <div className={`px-3.5 py-2 border-b flex items-center justify-between text-xs font-bold ${isDark ? 'border-white/[0.07] bg-white/[0.02]' : 'border-zinc-200 bg-zinc-50'}`}>
                      <span className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
                        {cls}
                      </span>
                      <span className={`font-mono text-[10px] ${mutedCls}`}>{list.length} устр.</span>
                    </div>
                    <div className="divide-y divide-white/[0.05]">
                      {list.map((dev, idx) => (
                        <div key={`${dev.name}-${idx}`} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{dev.name}</div>
                            <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                              {dev.manufacturer} {dev.instance_id ? `· ${dev.instance_id}` : ''}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                              dev.status.toUpperCase() === 'OK'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {dev.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. NATIVE LUMA SERVICES MANAGER WITH START / STOP / RESTART */}
        {tab === 'services' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className={`flex-1 min-w-[200px] flex items-center gap-2 px-3 py-1.5 rounded-xl border ${btnCls}`}>
                <Search className="w-3.5 h-3.5 opacity-60" />
                <input
                  value={svcQuery}
                  onChange={(e) => setSvcQuery(e.target.value)}
                  placeholder="Поиск служб LumaCore 1.2 и Windows..."
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>
              <button
                onClick={() => void loadServices()}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${svcLoading ? 'animate-spin' : ''}`} />
                Обновить ({services.length})
              </button>
            </div>

            <div className="space-y-1.5">
              {filteredServices.map((s) => {
                const running = s.status.toLowerCase() === 'running';
                return (
                  <div
                    key={`${s.source}_${s.name}`}
                    className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${surfaceCls}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{s.display_name || s.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                            s.source === 'luma'
                              ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-bold'
                              : 'bg-white/10 opacity-75'
                          }`}
                        >
                          {s.source === 'luma' ? 'LUMA 1.2' : 'ОС'}
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono truncate ${mutedCls}`}>
                        {s.name} {s.description ? `· ${s.description}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold ${
                          running ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'
                        }`}
                      >
                        {s.status}
                      </span>
                      {s.source !== 'luma' && (
                        <>
                          {!running ? (
                            <button
                              disabled={svcBusy !== null}
                              onClick={() => void controlService(s.name, 'start')}
                              title="Запустить службу"
                              className={`p-1.5 rounded-lg border hover:border-emerald-400 text-emerald-400 cursor-pointer disabled:opacity-40 ${btnCls}`}
                            >
                              <Play className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              disabled={svcBusy !== null}
                              onClick={() => void controlService(s.name, 'stop')}
                              title="Остановить службу"
                              className={`p-1.5 rounded-lg border hover:border-rose-400 text-rose-400 cursor-pointer disabled:opacity-40 ${btnCls}`}
                            >
                              <Square className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            disabled={svcBusy !== null}
                            onClick={() => void controlService(s.name, 'restart')}
                            title="Перезапустить службу"
                            className={`p-1.5 rounded-lg border hover:border-cyan-400 text-cyan-400 cursor-pointer disabled:opacity-40 ${btnCls}`}
                          >
                            <RotateCw className={`w-3 h-3 ${svcBusy === `${s.name}_restart` ? 'animate-spin' : ''}`} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. NATIVE NETWORK ADAPTERS, FIREWALL & LIVE PING */}
        {tab === 'network' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Firewall Profiles */}
              <div className={`rounded-2xl border p-4 space-y-3 ${surfaceCls}`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Брандмауэр и защита сети {hostname ? `(${hostname})` : ''}
                  </div>
                  <button onClick={() => void loadNetwork()} className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
                    <RefreshCw className={`w-3.5 h-3.5 ${netLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {firewall.map((f) => (
                    <div key={f.name} className={`p-2.5 rounded-xl border text-center ${btnCls}`}>
                      <div className="flex justify-center mb-1">
                        {f.enabled ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div className="text-xs font-bold">{f.name}</div>
                      <div className={`text-[10px] font-mono ${f.enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {f.enabled ? 'Активен' : 'Выкл'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Ping Diagnostics */}
              <div className={`rounded-2xl border p-4 space-y-3 ${surfaceCls}`}>
                <div className="text-xs font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Диагностика задержки (Ping / TCP Probe)
                </div>
                <div className="flex gap-2">
                  <input
                    value={pingHost}
                    onChange={(e) => setPingHost(e.target.value)}
                    placeholder="1.1.1.1 или github.com"
                    className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
                  />
                  <button
                    disabled={pingLoading}
                    onClick={() => void runPing()}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {pingLoading ? 'Замер...' : 'Пинг'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['127.0.0.1', '1.1.1.1', '8.8.8.8', 'github.com'].map((h) => (
                    <button
                      key={h}
                      onClick={() => void runPing(h)}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-mono cursor-pointer ${btnCls}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                {pingResult && (
                  <div className={`p-2.5 rounded-xl border font-mono text-xs ${btnCls}`}>
                    {pingResult.ok ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-400">
                        <span>
                          {pingResult.host} ({pingResult.resolved_ip})
                        </span>
                        <span className="font-bold">
                          avg {pingResult.avg_ms} мс (min {pingResult.min_ms} / max {pingResult.max_ms})
                        </span>
                      </div>
                    ) : (
                      <div className="text-amber-400">{pingResult.error || 'Нет ответа'}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Network Adapters Table */}
            <div className={`rounded-2xl border overflow-hidden ${surfaceCls}`}>
              <div className={`px-4 py-2.5 border-b text-xs font-bold ${isDark ? 'border-white/[0.07]' : 'border-zinc-200'}`}>
                Сетевые адаптеры ПК ({adapters.length})
              </div>
              <div className="divide-y divide-white/[0.05]">
                {adapters.map((a) => (
                  <div key={a.name} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${a.up ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                        {a.name}
                      </div>
                      <div className={`text-[10px] font-mono ${mutedCls}`}>MAC: {a.mac}</div>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <div>{a.ipv4 || 'Нет IPv4'}</div>
                      <div className={`text-[10px] ${mutedCls}`}>{a.speed}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. NATIVE SOUND & MIXER */}
        {tab === 'sound' && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className={`rounded-2xl border p-5 space-y-4 ${surfaceCls}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onToggleMute}
                    className="w-11 h-11 rounded-2xl bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <div>
                    <div className="text-sm font-bold">Основной системный вывод</div>
                    <div className={`text-xs ${mutedCls}`}>Управление громкостью ОС (Luma Audio Bridge)</div>
                  </div>
                </div>
                <div className="text-2xl font-mono font-black">{isMuted ? 'MUTE' : `${volume}%`}</div>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => onChangeVolume(Number(e.target.value))}
                className="w-full accent-[var(--luma-accent)] h-2 cursor-pointer"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex gap-1.5">
                  {[0, 25, 50, 75, 100].map((v) => (
                    <button
                      key={v}
                      onClick={() => onChangeVolume(v)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono cursor-pointer ${btnCls}`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={playTestSound}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold cursor-pointer"
                  >
                    Тест звука
                  </button>
                  <button
                    onClick={() => void openApplet('sound', 'Звук Windows')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}
                  >
                    mmsys.cpl
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. NOTEPAD PRO */}
        {tab === 'notepad' && (
          <div className="h-full flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={notePath}
                onChange={(e) => setNotePath(e.target.value)}
                className={`flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
                placeholder="Путь к файлу (например ~/Desktop/notes.txt)"
              />
              <button
                onClick={() => void openNoteFromDisk()}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Открыть
              </button>
              <button
                disabled={savingNote}
                onClick={() => void saveNoteToDisk()}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingNote ? 'Сохранение...' : 'Сохранить'}
              </button>
              <span className={`text-[11px] font-mono ${mutedCls}`}>
                {noteContent.length} симв. · {noteContent.split('\n').length} строк
              </span>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={15}
              placeholder="Начните писать заметку, конфигурацию или код..."
              className={`w-full flex-1 p-4 rounded-2xl border font-mono text-xs leading-relaxed outline-none resize-none ${surfaceCls}`}
            />
          </div>
        )}

        {/* 6. DISKS & SAFE TEMP CLEANER */}
        {tab === 'disks' && (
          <div className="space-y-4">
            <div className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
              <div>
                <div className="text-xs font-bold flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-[var(--luma-accent)]" />
                  Очистка временных файлов ОС
                </div>
                <div className={`text-[11px] font-mono mt-1 ${mutedCls}`}>
                  {tempInfo
                    ? `${tempInfo.temp_dir} · Файлов: ${tempInfo.files_count} · Объём: ${tempInfo.size_mb} МБ`
                    : 'Сканирование временного каталога...'}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void loadTempInfo()} className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${btnCls}`}>
                  Пересканировать
                </button>
                <button
                  disabled={cleaningTemp}
                  onClick={() => void cleanTempFiles()}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {cleaningTemp ? 'Очистка...' : 'Очистить старые Temp (>12ч)'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {disks.map((d) => (
                <div key={d.mount} className={`rounded-2xl border p-4 space-y-2 ${surfaceCls}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-[var(--luma-accent)]" />
                      {d.label || d.mount} ({d.mount})
                    </span>
                    <span className="font-mono font-bold">{d.percent}%</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`}>
                    <div
                      style={{ width: `${Math.min(100, d.percent)}%` }}
                      className={`h-full rounded-full ${d.percent > 88 ? 'bg-rose-500' : 'bg-[var(--luma-accent)]'}`}
                    />
                  </div>
                  <div className={`text-[11px] font-mono flex justify-between ${mutedCls}`}>
                    <span>Занято: {d.used_gb.toFixed(1)} ГБ</span>
                    <span>Свободно: {d.free_gb.toFixed(1)} ГБ / {d.total_gb.toFixed(1)} ГБ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. CLASSIC WINDOWS APPLETS LAUNCHER */}
        {tab === 'applets' && (
          <div className="space-y-3">
            <div className={`text-xs ${mutedCls}`}>
              Быстрый вызов классических консолей Windows напрямую из Luma OS 1.2.2 (Lithium).
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {windowsApplets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => void openApplet(a.id, a.title)}
                  className={`p-3.5 rounded-2xl border text-left space-y-2 transition hover:border-[var(--luma-accent)] cursor-pointer group ${surfaceCls}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center">
                      {a.icon}
                    </span>
                    <ExternalLink className={`w-3.5 h-3.5 opacity-40 group-hover:opacity-100 ${mutedCls}`} />
                  </div>
                  <div>
                    <div className="text-xs font-bold truncate">{a.title}</div>
                    <div className={`text-[10px] truncate ${mutedCls}`}>{a.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
