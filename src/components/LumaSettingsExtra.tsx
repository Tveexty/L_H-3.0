import React, { useEffect, useState } from 'react';
import {
  AppWindow,
  ArrowLeft,
  BatteryCharging,
  Bell,
  BellOff,
  Bluetooth,
  BluetoothOff,
  Check,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileText,
  Folder,
  HardDrive,
  Home,
  Info,
  Leaf,
  Lock,
  Pencil,
  Pin,
  Play,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Square,
  Sun,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  AppItem,
  formatDurationRu,
  formatLiveClock,
  LiveSystemTelemetry,
  WindowsNotificationItem,
} from '../data/launcherData';
import { LumaHeliumHeroCard } from './LumaHeliumEasterEgg';

export type PowerProfile = 'performance' | 'balanced' | 'saver';

export interface BluetoothDeviceInfo {
  name: string;
  status: string;
  connected: boolean;
  class: string;
  battery_percent?: number;
  device_type?: string;
  transport?: string;
}

export interface BluetoothStatusInfo {
  available: boolean;
  enabled: boolean;
  adapter_name: string;
  devices: BluetoothDeviceInfo[];
}

export interface PropertiesTarget {
  label: string;
  path: string;
  kind: string;
  app?: AppItem;
  onDelete?: () => void;
  onPinToDesktop?: () => void;
}

interface FileStatResponse {
  exists: boolean;
  path: string;
  name: string;
  is_dir: boolean;
  size_bytes: number;
  size_human: string;
  modified_at: string;
}

interface FsEntryItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  mod_time: string;
  is_hidden?: boolean;
}

function StatusBadge({ active, onLabel = 'ВКЛ', offLabel = 'ВЫКЛ' }: { active: boolean; onLabel?: string; offLabel?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
        active
          ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] border-[var(--luma-accent-border)]'
          : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/25'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--luma-accent)]' : 'bg-zinc-500'}`} />
      {active ? onLabel : offLabel}
    </span>
  );
}

// Deterministic realistic fallback size & download date for catalog apps without an absolute local path
export function getAppMeta(app: AppItem): { sizeLabel: string; installedAt: string; version: string } {
  let hash = 0;
  for (let i = 0; i < app.id.length; i++) hash = (hash * 31 + app.id.charCodeAt(i)) % 997;
  const mb = app.sizeMb ?? (app.type === 'web' ? 12 + (hash % 24) : app.type === 'system' ? 48 + (hash % 90) : 95 + (hash % 460));
  const sizeLabel = mb >= 1024 ? `${(mb / 1024).toFixed(2)} ГБ` : `${mb} МБ`;
  const day = String(1 + (hash % 27)).padStart(2, '0');
  const month = String(1 + ((hash >> 3) % 10)).padStart(2, '0');
  const installedAt = app.installedAt || `${day}.${month}.2026`;
  const version = app.version || (app.type === 'web' ? 'Web App' : `v${1 + (hash % 4)}.${hash % 9}.${(hash >> 2) % 10}`);
  return { sizeLabel, installedAt, version };
}

function formatBytesRu(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${bytes} Б`;
}

/* ==================== 1. ЯДРО UI (KERNEL UI SETTINGS PANEL) ==================== */
export const KernelUIPanel: React.FC<{
  liveSystem: LiveSystemTelemetry | null;
  customDeviceName: string;
  onChangeCustomDeviceName: (name: string) => void;
  kernelConnected: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  isDark: boolean;
  onTriggerEasterEgg?: () => void;
  devModeEnabled?: boolean;
  onToggleDevMode?: (next: boolean) => void;
  onPushToast?: (title: string, msg: string, level?: 'info' | 'warning' | 'success') => void;
}> = ({
  liveSystem,
  customDeviceName,
  onChangeCustomDeviceName,
  kernelConnected,
  surfaceCls,
  btnCls,
  mutedCls,
  isDark,
  onTriggerEasterEgg,
  devModeEnabled = false,
  onToggleDevMode,
  onPushToast,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(customDeviceName || liveSystem?.hostname || 'Luma Desktop');
  const [adminInfo, setAdminInfo] = useState<{
    is_admin: boolean;
    integrity_level: string;
    user: string;
    platform: string;
    can_elevate: boolean;
  } | null>(null);
  const [elevating, setElevating] = useState(false);

  useEffect(() => {
    fetch('/api/kernel/admin/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setAdminInfo(d);
      })
      .catch(() => {});
  }, []);

  const handleElevateAdmin = async () => {
    setElevating(true);
    try {
      const r = await fetch('/api/kernel/admin/elevate', { method: 'POST' });
      const d = await r.json();
      onPushToast?.(
        'Режим Администратора (UAC)',
        d.message || (d.ok ? 'Запрошен перезапуск Luma OS с правами Администратора.' : d.error || 'Не удалось повысить права'),
        d.ok ? 'success' : 'warning'
      );
    } catch {
      onPushToast?.('Режим Администратора', 'Ядро LumaCore недоступно.', 'warning');
    } finally {
      setElevating(false);
    }
  };

  const deviceName = customDeviceName.trim() || liveSystem?.hostname || 'Luma Workstation';
  const modelName = liveSystem?.device_model
    ? liveSystem.manufacturer &&
      !liveSystem.device_model.toLowerCase().includes(liveSystem.manufacturer.toLowerCase()) &&
      liveSystem.manufacturer !== 'Generic'
      ? `${liveSystem.manufacturer} ${liveSystem.device_model}`
      : liveSystem.device_model
    : 'Luma PC Workstation x64';

  return (
    <div className="space-y-4">
      {/* Flagship Sculpted 3D Nitrogen 1.6 QHD Hero Artwork — Click for Easter Egg Mini-Game! */}
      <LumaHeliumHeroCard
        onTriggerEasterEgg={() => onTriggerEasterEgg?.()}
        kernelVersion={liveSystem?.kernel_engine_version || '1.5.1'}
        securityVersion="2.5"
      />

      {/* Device & Kernel UI Identity Card */}
      <div className={`p-5 rounded-2xl border space-y-4 ${surfaceCls}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[var(--luma-accent)] text-white flex items-center justify-center font-mono font-black text-xl shrink-0">
              N
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--luma-accent)] font-bold">
                ЯДРО UI · LUMA NITROGEN · N-7
              </div>
              <div className="text-lg font-extrabold tracking-tight truncate">
                Luma OS 1.6.6b (Nitrogen)
              </div>
              <div className={`text-xs font-mono truncate ${mutedCls}`}>
                LumaCore {liveSystem?.kernel_engine_version || '1.5.6b'} · LumaShield 3.0b · {kernelConnected ? 'IPC ONLINE 127.0.0.1:49215' : 'STANDALONE'}
              </div>
            </div>
          </div>

          <a
            href="/LumaOS_1.6.6b.exe"
            download="LumaOS_1.6.6b.exe"
            className="px-3.5 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-mono font-bold inline-flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            LumaOS_1.6.6b.exe
          </a>
        </div>

        {/* 4 Core Device Identity Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* 1. Имя устройства (editable!) */}
          <div className={`p-3.5 rounded-xl border space-y-1.5 ${isDark ? 'bg-black/25 border-white/[0.08]' : 'bg-black/[0.03] border-zinc-900/10'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Имя устройства</span>
              <button
                onClick={() => {
                  setDraftName(deviceName);
                  setEditingName((v) => !v);
                }}
                className={`p-1 rounded-md cursor-pointer ${mutedCls} hover:text-[var(--luma-accent)]`}
                title="Переименовать устройство"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
            {editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onChangeCustomDeviceName(draftName.trim());
                  setEditingName(false);
                }}
                className="flex gap-1.5"
              >
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className={`flex-1 min-w-0 px-2 py-1 rounded-lg border text-xs font-mono outline-none ${btnCls}`}
                  autoFocus
                />
                <button type="submit" className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-[11px] font-bold cursor-pointer">
                  OK
                </button>
              </form>
            ) : (
              <div className="text-sm font-mono font-bold truncate">{deviceName}</div>
            )}
          </div>

          {/* 2. Название модели устройства */}
          <div className={`p-3.5 rounded-xl border space-y-1.5 ${isDark ? 'bg-black/25 border-white/[0.08]' : 'bg-black/[0.03] border-zinc-900/10'}`}>
            <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Название модели устройства</div>
            <div className="text-sm font-mono font-bold break-words">{modelName}</div>
          </div>

          {/* 3. Версия ПО */}
          <div className={`p-3.5 rounded-xl border space-y-1.5 ${isDark ? 'bg-black/25 border-white/[0.08]' : 'bg-black/[0.03] border-zinc-900/10'}`}>
            <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Версия ПО</div>
            <div className="text-sm font-mono font-bold">1.6.6b (Nitrogen · N-7)</div>
          </div>

          {/* 4. Версия Ядра (1.5.6b) */}
          <div className={`p-3.5 rounded-xl border space-y-1.5 ${isDark ? 'bg-black/25 border-white/[0.08]' : 'bg-black/[0.03] border-zinc-900/10'}`}>
            <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Версия Ядра</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-[var(--luma-accent)]">
                {liveSystem?.kernel_engine_version || '1.5.6b'}
              </span>
              <span className={`text-[10px] font-mono ${mutedCls}`}>LumaCore 1.5.6b · Zero-WMI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Mode & Administrator (UAC) Elevation Controls — Luma OS 1.6.6b Nitrogen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span className="font-bold">Режим разработчика (Live HUD)</span>
            </div>
            <StatusBadge active={devModeEnabled} onLabel="АКТИВЕН" offLabel="ВЫКЛ" />
          </div>
          <p className={`text-[11px] leading-relaxed ${mutedCls}`}>
            Показывает живой HUD поверх экрана: FPS, JS/Go RAM, поток HTTP/IPC запросов, интерактивный инспектор DOM и запуск GC. Горячая клавиша: <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Ctrl+Shift+D</kbd>.
          </p>
          <button
            onClick={() => onToggleDevMode?.(!devModeEnabled)}
            className={`w-full py-2 rounded-xl font-bold transition cursor-pointer ${
              devModeEnabled
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : `${btnCls} border hover:border-[var(--luma-accent)]`
            }`}
          >
            {devModeEnabled ? 'Выключить Dev HUD' : 'Включить Режим разработчика'}
          </button>
        </div>

        <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${adminInfo?.is_admin ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="font-bold">Режим Администратора (UAC)</span>
            </div>
            <StatusBadge
              active={Boolean(adminInfo?.is_admin)}
              onLabel="АДМИНИСТРАТОР"
              offLabel={adminInfo?.integrity_level || 'СТАНДАРТ'}
            />
          </div>
          <p className={`text-[11px] leading-relaxed ${mutedCls}`}>
            {adminInfo?.is_admin
              ? `Текущая сессия (${adminInfo.user || 'User'}) запущена с повышенными правами Администратора (${adminInfo.integrity_level}). Доступны Виртуальная память, Реестр HKLM и Службы.`
              : `Обычный пользователь (${adminInfo?.user || 'User'}). Для настройки виртуальной памяти (Luma SwapBoost), очистки HKLM и системных служб перезапустите от Администратора.`}
          </p>
          <button
            disabled={elevating || Boolean(adminInfo?.is_admin)}
            onClick={() => void handleElevateAdmin()}
            className={`w-full py-2 rounded-xl font-bold transition cursor-pointer disabled:opacity-55 ${
              adminInfo?.is_admin
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
            }`}
          >
            {adminInfo?.is_admin
              ? '✓ Права Администратора уже активны'
              : elevating
              ? 'Запрос UAC (runas)…'
              : 'Перезапустить от имени Администратора'}
          </button>
        </div>
      </div>

      {/* Hardware & Runtime Specification Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {[
          ['Процессор', `${liveSystem?.cpu_model || '—'} (${liveSystem?.cpu_cores || 0} потоков)`],
          [
            'Графика (GPU / VRAM)',
            liveSystem?.gpu_vram_total_mb
              ? `${liveSystem?.gpu_name || '—'} · ${(liveSystem.gpu_vram_total_mb / 1024).toFixed(1)} ГБ VRAM`
              : liveSystem?.gpu_name || '—',
          ],
          ['Оперативная память', liveSystem ? `${liveSystem.ram_used_gb.toFixed(1)} / ${liveSystem.ram_total_gb.toFixed(1)} ГБ (${liveSystem.ram_percent}%)` : '—'],
          ['Платформа / Архитектура', `${liveSystem?.os_name || 'Luma OS'} · ${liveSystem?.arch || 'amd64'}`],
          ['Ядро безопасности', 'LumaShield 3.0b · 275+ Rules + Tasks & Stealer Shield'],
          ['Шина ядра / ИИ', 'LumaCore 1.5.6b · TCP RPC :49215 · Luma Ai Nitrogen'],
        ].map(([k, v]) => (
          <div key={k} className={`p-3.5 rounded-xl border space-y-1 ${surfaceCls}`}>
            <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>{k}</div>
            <div className="font-mono font-semibold break-words">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ==================== 2. BLUETOOTH & WIRELESS BATTERY SETTINGS PANEL ==================== */
export const BluetoothSettingsPanel: React.FC<{
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  onPushToast: (title: string, msg: string, type?: 'info' | 'warning' | 'success') => void;
}> = ({ surfaceCls, btnCls, mutedCls, onPushToast }) => {
  const [bt, setBt] = useState<BluetoothStatusInfo | null>(null);
  const [wirelessBats, setWirelessBats] = useState<
    {
      name: string;
      device_type: string;
      battery_percent: number;
      connected: boolean;
      transport: string;
      vendor_id?: string;
      product_id?: string;
      manufacturer?: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadBt = async (activeScan = false) => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/kernel/bluetooth/devices${activeScan ? '?scan=1' : ''}`),
        fetch('/api/kernel/wireless/batteries?refresh=1'),
      ]);
      if (r1.ok) {
        const d: BluetoothStatusInfo = await r1.json();
        setBt(d);
      } else {
        setBt({ available: false, enabled: false, adapter_name: '', devices: [] });
      }
      if (r2.ok) {
        const w = await r2.json();
        setWirelessBats(Array.isArray(w?.devices) ? w.devices : []);
      }
    } catch {
      setBt({ available: false, enabled: false, adapter_name: '', devices: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBt(false);
  }, []);

  const toggleBt = async () => {
    if (!bt?.available || toggling) return;
    setToggling(true);
    const next = !bt.enabled;
    try {
      const r = await fetch('/api/kernel/bluetooth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (r.ok) {
        const d: BluetoothStatusInfo = await r.json();
        setBt(d);
        onPushToast('Bluetooth', next ? 'Радиомодуль включён' : 'Радиомодуль выключен', 'info');
      }
    } catch {
      onPushToast('Bluetooth', 'Не удалось изменить состояние адаптера', 'warning');
    } finally {
      setToggling(false);
    }
  };

  const kindTag = (t?: string) => {
    switch (t) {
      case 'mouse':
        return 'Мышь';
      case 'keyboard':
        return 'Клавиатура';
      case 'headphones':
        return 'Наушники';
      case 'gamepad':
        return 'Геймпад';
      case 'watch':
        return 'Часы';
      case 'phone':
        return 'Телефон';
      default:
        return 'Беспроводное';
    }
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
        <div className="flex items-center gap-3 min-w-0">
          {bt?.available && bt.enabled ? (
            <Bluetooth className="w-5 h-5 text-[var(--luma-accent)] shrink-0" />
          ) : (
            <BluetoothOff className={`w-5 h-5 shrink-0 ${mutedCls}`} />
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold">Bluetooth и Радиоканал 2.4GHz (LumaCore 1.5.6b)</div>
            <div className={`text-xs truncate ${mutedCls}`}>
              {loading
                ? 'Активный поиск всех Bluetooth-устройств рядом (подключённые, сопряжённые и новые)...'
                : bt?.available
                ? bt.adapter_name || 'Адаптер Bluetooth обнаружен'
                : 'Адаптер Bluetooth не найден (радиоканальные 2.4GHz устройства сканируются напрямую)'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadBt(true)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Найти все рядом
          </button>
          {bt?.available && (
            <button onClick={toggleBt} disabled={toggling} className="cursor-pointer">
              <StatusBadge active={bt.enabled} />
            </button>
          )}
        </div>
      </div>

      {/* Wireless Peripherals Live Strip (Bluetooth + BLE + 2.4GHz HID Mice/Keyboards/Headphones) */}
      {wirelessBats.length > 0 && (
        <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
          <div className="text-xs font-bold flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              Подключённые беспроводные и радиоканальные устройства ({wirelessBats.length})
            </span>
            <span className={`text-[10px] font-mono ${mutedCls}`}>BT · BLE · 2.4GHz HID</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {wirelessBats.map((wb, idx) => {
              const hasBat = typeof wb.battery_percent === 'number' && wb.battery_percent >= 0;
              const pct = hasBat ? Math.max(0, Math.min(100, wb.battery_percent)) : 0;
              const barColor = pct <= 20 ? 'bg-rose-500' : pct <= 45 ? 'bg-amber-400' : 'bg-emerald-500';
              return (
                <div key={`${wb.name}_${idx}`} className={`p-3 rounded-xl border space-y-1.5 text-xs ${btnCls}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{wb.name}</div>
                      <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                        {kindTag(wb.device_type)} · {wb.transport}
                        {wb.vendor_id ? ` · ${wb.vendor_id}${wb.product_id ? `:${wb.product_id}` : ''}` : ''}
                      </div>
                    </div>
                    {hasBat ? (
                      <span
                        className={`font-mono text-sm font-black shrink-0 ${
                          pct <= 20 ? 'text-rose-400' : pct <= 45 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {pct}%
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                        Подключено
                      </span>
                    )}
                  </div>
                  {hasBat ? (
                    <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  ) : (
                    <div className={`text-[10px] font-mono ${mutedCls}`}>
                      Активное соединение · драйвер не передаёт % АКБ в ОС
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !bt?.available && wirelessBats.length === 0 && (
        <div className={`p-5 rounded-xl border space-y-2 text-xs ${surfaceCls}`}>
          <div className="font-bold">Модуль Bluetooth и 2.4GHz периферия не обнаружены</div>
          <div className={mutedCls}>
            Ядро LumaCore 1.5.6b проверило Bluetooth, BLE и USB HID радиоканалы хоста. Включите Bluetooth на устройстве рядом и нажмите «Найти все рядом».
          </div>
          <button
            onClick={() => void loadBt(true)}
            className={`mt-2 px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Повторить активный поиск LumaCore
          </button>
        </div>
      )}

      {bt?.available && (
        <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">Все обнаруженные, сопряжённые и подключённые устройства ({bt.devices.length})</span>
            <button
              onClick={() => void loadBt(true)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Поиск рядом
            </button>
          </div>
          {bt.devices.length === 0 ? (
            <div className={`py-6 text-center text-xs font-mono ${mutedCls}`}>
              Устройства не найдены — нажмите «Поиск рядом», чтобы просканировать эфир Bluetooth
            </div>
          ) : (
            <div className="space-y-2">
              {bt.devices.map((dev, idx) => {
                const devEx = dev as BluetoothStatusInfo['devices'][number] & {
                  paired?: boolean;
                  discovered?: boolean;
                  address?: string;
                };
                const hasBat = typeof dev.battery_percent === 'number' && dev.battery_percent >= 0;
                const pct = hasBat ? Math.max(0, Math.min(100, dev.battery_percent!)) : 0;
                const isDiscovered = Boolean(devEx.discovered) && !dev.connected && !devEx.paired;
                return (
                  <div key={`${dev.name}_${devEx.address || idx}`} className={`p-3 rounded-xl border space-y-2 text-xs ${btnCls}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate flex flex-wrap items-center gap-1.5">
                          <span>{dev.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${surfaceCls} ${mutedCls}`}>
                            {kindTag(dev.device_type)}
                          </span>
                          {isDiscovered && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-400 border border-amber-400/30">
                              Найдено рядом
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] font-mono ${mutedCls}`}>
                          {dev.transport || dev.class || 'Bluetooth'} · {dev.status}
                          {devEx.address ? ` · ${devEx.address}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasBat && (
                          <span
                            className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold inline-flex items-center gap-1 ${
                              pct <= 20
                                ? 'bg-rose-500/15 text-rose-400'
                                : pct <= 45
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                          >
                            <BatteryCharging className="w-3 h-3" />
                            {pct}%
                          </span>
                        )}
                        <button
                          onClick={() => {
                            const action = dev.connected ? 'disconnect' : isDiscovered ? 'pair' : 'connect';
                            void fetch('/api/kernel/bluetooth/connect', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                name: dev.name,
                                instance_id: (dev as { instance_id?: string }).instance_id || '',
                                action,
                              }),
                            })
                              .then((r) => (r.ok ? r.json() : null))
                              .then((d) => {
                                if (d?.status) setBt(d.status);
                                onPushToast('Bluetooth', d?.message || (action === 'disconnect' ? 'Устройство отключено' : 'Команда подключения отправлена'), 'info');
                              })
                              .catch(() => onPushToast('Bluetooth', 'Не удалось изменить подключение', 'warning'));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border transition ${
                            dev.connected
                              ? 'bg-rose-500/15 border-rose-400/35 text-rose-300 hover:bg-rose-500/25'
                              : isDiscovered
                              ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30'
                              : 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                          }`}
                        >
                          {dev.connected ? 'Отключить' : isDiscovered ? 'Сопрячь' : 'Подключить'}
                        </button>
                        <StatusBadge
                          active={dev.connected}
                          onLabel="ПОДКЛ"
                          offLabel={isDiscovered ? 'РЯДОМ' : 'СОПРЯЖЕНО'}
                        />
                      </div>
                    </div>
                    {hasBat && (
                      <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct <= 20 ? 'bg-rose-500' : pct <= 45 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ==================== 3. POWER SAVING PANEL (ЭНЕРГОСБЕРЕЖЕНИЕ) ==================== */
export const PowerSaverPanel: React.FC<{
  powerProfile: PowerProfile;
  onChangePowerProfile: (plan: PowerProfile) => void;
  screenBrightness: number;
  onChangeScreenBrightness: (val: number) => void;
  autoSaverThreshold: number;
  onChangeAutoSaverThreshold: (val: number) => void;
  reduceEffectsOnSaver: boolean;
  onToggleReduceEffectsOnSaver: () => void;
  batteryLevel: number;
  isCharging: boolean;
  onPowerAction: (action: 'lock' | 'sleep' | 'recycle_bin') => void;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
}> = ({
  powerProfile,
  onChangePowerProfile,
  screenBrightness,
  onChangeScreenBrightness,
  autoSaverThreshold,
  onChangeAutoSaverThreshold,
  reduceEffectsOnSaver,
  onToggleReduceEffectsOnSaver,
  batteryLevel,
  isCharging,
  onPowerAction,
  surfaceCls,
  btnCls,
  mutedCls,
}) => {
  const [stopChargeCfg, setStopChargeCfg] = useState<{
    enabled: boolean;
    limit_percent: number;
    stop_charging_now: boolean;
    notify_at_limit: boolean;
    auto_eco_at_limit: boolean;
  }>({
    enabled: false,
    limit_percent: 80,
    stop_charging_now: false,
    notify_at_limit: true,
    auto_eco_at_limit: true,
  });
  const [stopChargeMethod, setStopChargeMethod] = useState('');
  const [stopChargeMsg, setStopChargeMsg] = useState('');

  useEffect(() => {
    void fetch('/api/kernel/power/charge-limit')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.config) setStopChargeCfg((prev) => ({ ...prev, ...d.config }));
        if (d?.hardware_method) setStopChargeMethod(String(d.hardware_method));
      })
      .catch(() => {});
  }, []);

  const updateStopCharging = async (next: typeof stopChargeCfg) => {
    setStopChargeCfg(next);
    try {
      const r = await fetch('/api/kernel/power/charge-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.config) setStopChargeCfg((prev) => ({ ...prev, ...d.config }));
        if (d?.hardware_method) setStopChargeMethod(String(d.hardware_method));
        if (d?.message) {
          setStopChargeMsg(String(d.message));
          window.setTimeout(() => setStopChargeMsg(''), 4000);
        }
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Battery & Charge Status */}
      <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BatteryCharging className="w-5 h-5 text-[var(--luma-accent)]" />
            <div>
              <div className="text-sm font-bold">Питание и батарея</div>
              <div className={`text-xs font-mono ${mutedCls}`}>
                {stopChargeCfg.stop_charging_now
                  ? '🔌 Питание от сети · Зарядка батареи остановлена'
                  : isCharging
                  ? 'Подключено к электросети'
                  : 'Работа от аккумулятора'}
              </div>
            </div>
          </div>
          <span className="text-2xl font-mono font-extrabold tabular-nums">{batteryLevel}%</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-500/20 overflow-hidden">
          <div
            className="h-full bg-[var(--luma-accent)] transition-all duration-300"
            style={{ width: `${Math.max(4, Math.min(100, batteryLevel))}%` }}
          />
        </div>
      </div>

      {/* Laptop Battery Stop-Charging Mode (100% Working Multi-Vendor Conservation Mode) */}
      <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls} ${stopChargeCfg.stop_charging_now ? 'border-amber-400/50 bg-amber-500/10' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold flex flex-wrap items-center gap-2">
              <span>🔌 Не заряжать батарею (Режим сбережения АКБ ноутбука)</span>
              {stopChargeCfg.stop_charging_now && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-400/35">
                  ЗАРЯДКА ОСТАНОВЛЕНА
                </span>
              )}
            </div>
            <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
              Отключает зарядку аккумулятора при работе ноутбука от розетки (Lenovo EnergyDrv / ASUS ATKACPI / MSI / Acer / BIOS WMI + тепловая защита ACPI), чтобы батарея не изнашивалась.
            </div>
            {(stopChargeMethod || stopChargeMsg) && (
              <div className="text-[10px] font-mono text-emerald-400 mt-1">
                {stopChargeMsg || `Контроллер: ${stopChargeMethod}`}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const nextStop = !stopChargeCfg.stop_charging_now;
              void updateStopCharging({
                ...stopChargeCfg,
                enabled: nextStop ? true : stopChargeCfg.enabled,
                stop_charging_now: nextStop,
                limit_percent: nextStop && stopChargeCfg.limit_percent > 80 ? 60 : stopChargeCfg.limit_percent,
              });
            }}
            className="cursor-pointer shrink-0"
          >
            <StatusBadge active={stopChargeCfg.stop_charging_now} onLabel="НЕ ЗАРЯЖАТЬ" offLabel="ВЫКЛ" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`font-semibold mr-1 ${mutedCls}`}>Лимит заряда:</span>
          {[60, 80, 90, 100].map((pct) => {
            const active = !stopChargeCfg.stop_charging_now && (pct === 100 ? !stopChargeCfg.enabled : stopChargeCfg.enabled && stopChargeCfg.limit_percent === pct);
            return (
              <button
                key={pct}
                type="button"
                onClick={() =>
                  void updateStopCharging({
                    ...stopChargeCfg,
                    enabled: pct < 100,
                    stop_charging_now: false,
                    limit_percent: pct,
                  })
                }
                className={`px-2.5 py-1 rounded-lg border font-mono font-bold cursor-pointer transition ${
                  active ? 'bg-emerald-500 border-emerald-400 text-white' : btnCls
                }`}
              >
                {pct === 100 ? '100% (Обычно)' : `До ${pct}%`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Real Power Profiles (wired to Windows powercfg + shell optimizer) */}
      <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
        <div className="text-sm font-bold">Режим энергопотребления</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {(
            [
              {
                id: 'performance' as const,
                title: 'Производительность',
                sub: 'Опрос ядра 1.5с · Максимум отклика',
                icon: <Zap className="w-4 h-4" />,
              },
              {
                id: 'balanced' as const,
                title: 'Сбалансированный',
                sub: 'Опрос 2с · Стандартный баланс',
                icon: <Cpu className="w-4 h-4" />,
              },
              {
                id: 'saver' as const,
                title: 'Энергосбережение',
                sub: 'Опрос 6с · Сниженная нагрузка',
                icon: <Leaf className="w-4 h-4" />,
              },
            ]
          ).map((plan) => {
            const active = powerProfile === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => onChangePowerProfile(plan.id)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer space-y-1.5 ${
                  active ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                }`}
              >
                <div className="flex items-center justify-between">
                  {plan.icon}
                  {active && <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="font-bold">{plan.title}</div>
                <div className={`text-[10px] ${active ? 'text-white/85' : mutedCls}`}>{plan.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Screen Brightness Comfort Dimmer + Auto Saver Threshold */}
      <div className={`p-4 rounded-xl border space-y-4 text-xs ${surfaceCls}`}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono">
            <span className="inline-flex items-center gap-1.5 font-sans font-bold">
              <Sun className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Комфортная яркость оболочки
            </span>
            <span>{screenBrightness}%</span>
          </div>
          <input
            type="range"
            min={55}
            max={100}
            value={screenBrightness}
            onChange={(e) => onChangeScreenBrightness(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5 pt-2 border-t border-zinc-500/15">
          <div className="flex items-center justify-between font-mono">
            <span className="font-sans font-bold">Авто-энергосбережение при заряде ниже</span>
            <span>{autoSaverThreshold}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={autoSaverThreshold}
            onChange={(e) => onChangeAutoSaverThreshold(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div
          onClick={onToggleReduceEffectsOnSaver}
          className="pt-2 border-t border-zinc-500/15 flex items-center justify-between cursor-pointer"
        >
          <div>
            <div className="font-bold">Отключать тяжёлое размытие в Энергосбережении</div>
            <div className={`text-[11px] ${mutedCls}`}>Уменьшает нагрузку GPU в режиме экономии заряда</div>
          </div>
          <StatusBadge active={reduceEffectsOnSaver} />
        </div>
      </div>

      {/* Quick Sleep / Lock */}
      <div className="flex flex-wrap gap-2 text-xs">
        <button onClick={() => onPowerAction('lock')} className={`px-3.5 py-2 rounded-xl border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}>
          <Lock className="w-3.5 h-3.5" /> Блокировка экрана
        </button>
        <button onClick={() => onPowerAction('sleep')} className={`px-3.5 py-2 rounded-xl border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}>
          <Power className="w-3.5 h-3.5" /> Режим сна
        </button>
      </div>
    </div>
  );
};

/* ==================== 4. STORAGE, MEMORY & BUILT-IN FILE EXPLORER ==================== */
export const StorageMemoryPanel: React.FC<{
  liveSystem: LiveSystemTelemetry | null;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  isDark: boolean;
  onInspectFile: (info: PropertiesTarget) => void;
  onPinFileToDesktop: (entry: { name: string; path: string; is_dir: boolean }) => void;
  onOpenInExplorer?: (path: string) => void;
  onPushToast: (title: string, msg: string, type?: 'info' | 'warning' | 'success') => void;
}> = ({
  liveSystem,
  surfaceCls,
  btnCls,
  mutedCls,
  isDark,
  onInspectFile,
  onPinFileToDesktop,
  onOpenInExplorer,
  onPushToast,
}) => {
  const [curPath, setCurPath] = useState<string>('~');
  const [parentPath, setParentPath] = useState<string>('');
  const [entries, setEntries] = useState<FsEntryItem[]>([]);
  const [hiddenCount, setHiddenCount] = useState<number>(0);
  const [showHidden, setShowHidden] = useState<boolean>(true);
  const [fsLoading, setFsLoading] = useState(false);
  const [fsError, setFsError] = useState('');
  const [fsFilter, setFsFilter] = useState('');
  const [previewFile, setPreviewFile] = useState<{ name: string; path: string; content: string } | null>(null);

  const browseDir = async (targetPath: string, includeHidden = showHidden) => {
    setFsLoading(true);
    setFsError('');
    try {
      const r = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ls', path: targetPath, show_hidden: includeHidden }),
      });
      const d = await r.json();
      if (!d.ok) {
        setFsError(d.error || 'Не удалось открыть каталог');
      } else {
        setCurPath(d.path || targetPath);
        setParentPath(d.parent || '');
        setHiddenCount(typeof d.hidden_count === 'number' ? d.hidden_count : 0);
        const list: FsEntryItem[] = Array.isArray(d.entries) ? d.entries : [];
        list.sort((a, b) => Number(b.is_dir) - Number(a.is_dir) || a.name.localeCompare(b.name));
        setEntries(list);
      }
    } catch {
      setFsError('Ядро Luma Core недоступно для чтения файлов');
    } finally {
      setFsLoading(false);
    }
  };

  useEffect(() => {
    browseDir(curPath, showHidden);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHidden]);

  const openOrPreview = async (entry: FsEntryItem) => {
    if (entry.is_dir) {
      browseDir(entry.path);
      return;
    }
    const isText = /\.(txt|md|json|log|csv|ts|tsx|js|go|py|html|css|ini|conf|xml|yaml|yml|sh|bat|ps1|env)$/i.test(entry.name);
    if (isText && entry.size <= 65536) {
      try {
        const r = await fetch('/api/kernel/fs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cat', path: entry.path }),
        });
        const d = await r.json();
        if (d.ok) {
          setPreviewFile({ name: entry.name, path: entry.path, content: d.content || '' });
          return;
        }
      } catch {
        // fallback to native open
      }
    }
    try {
      await fetch('/api/kernel/open-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entry.path }),
      });
      onPushToast('Открыто в ОС', entry.name, 'info');
    } catch {
      onPushToast('Файл', entry.path, 'info');
    }
  };

  const disks = liveSystem?.disks || [];
  const filteredEntries = entries.filter(
    (e) => !fsFilter.trim() || e.name.toLowerCase().includes(fsFilter.trim().toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* RAM & Storage Disks Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">Оперативная память (ОЗУ)</span>
            <span className="font-mono font-bold text-[var(--luma-accent)]">{liveSystem?.ram_percent ?? 0}%</span>
          </div>
          <div className="text-lg font-mono font-extrabold tabular-nums">
            {liveSystem ? `${liveSystem.ram_used_gb.toFixed(1)} / ${liveSystem.ram_total_gb.toFixed(1)} ГБ` : '—'}
          </div>
          <div className="h-2 rounded-full bg-zinc-500/20 overflow-hidden">
            <div className="h-full bg-[var(--luma-accent)]" style={{ width: `${liveSystem?.ram_percent ?? 0}%` }} />
          </div>
          <div className={`text-[11px] font-mono ${mutedCls}`}>
            Доступно: {liveSystem ? `${Math.max(0, liveSystem.ram_total_gb - liveSystem.ram_used_gb).toFixed(1)} ГБ` : '—'}
          </div>
        </div>

        <div className={`p-4 rounded-xl border space-y-2.5 ${surfaceCls}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold inline-flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Состояние накопителей ({disks.length})
            </span>
            <span className="text-[10px] font-mono text-emerald-500 font-bold">OK · SMART</span>
          </div>
          <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
            {disks.map((d) => (
              <div key={d.mount} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono gap-2">
                  <button
                    onClick={() => browseDir(d.mount)}
                    className="font-bold hover:text-[var(--luma-accent)] cursor-pointer truncate"
                    title={`Открыть диск ${d.mount}`}
                  >
                    {d.mount} · {d.label}
                  </button>
                  <span className={mutedCls}>
                    {d.used_gb.toFixed(1)} / {d.total_gb.toFixed(0)} ГБ ({d.percent}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-500/20 overflow-hidden">
                  <div
                    className={`h-full ${d.percent > 85 ? 'bg-[var(--luma-accent)]' : isDark ? 'bg-zinc-200' : 'bg-zinc-800'}`}
                    style={{ width: `${Math.max(3, d.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Built-in Host File Explorer (Shows ALL System Files Including Hidden!) */}
      <div className={`rounded-xl border overflow-hidden ${surfaceCls}`}>
        <div className={`p-3 border-b flex flex-wrap items-center gap-2 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
          <button
            onClick={() => parentPath && browseDir(parentPath)}
            disabled={!parentPath}
            title="Назад"
            className={`p-1.5 rounded-lg border cursor-pointer disabled:opacity-40 ${btnCls}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => browseDir('~')}
            title="Домашняя папка"
            className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          {disks.map((d) => (
            <button
              key={d.mount}
              onClick={() => browseDir(d.mount)}
              className={`px-2 py-1 rounded-lg border text-[11px] font-mono font-bold cursor-pointer ${btnCls}`}
            >
              {d.mount}
            </button>
          ))}
          <div className={`flex-1 min-w-[140px] px-2.5 py-1 rounded-lg border text-[11px] font-mono truncate ${btnCls}`}>
            {curPath}
          </div>
          <button
            onClick={() => setShowHidden((v) => !v)}
            title="Показывать все скрытые и системные файлы"
            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
              showHidden ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
            }`}
          >
            {showHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Скрытые ({hiddenCount})
          </button>
          {onOpenInExplorer && (
            <button
              onClick={() => onOpenInExplorer(curPath)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
            >
              <ExternalLink className="w-3 h-3 text-[var(--luma-accent)]" />
              Проводник
            </button>
          )}
          <div className={`w-36 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${btnCls}`}>
            <Search className="w-3 h-3 text-zinc-500 shrink-0" />
            <input
              value={fsFilter}
              onChange={(e) => setFsFilter(e.target.value)}
              placeholder="Фильтр..."
              className="w-full bg-transparent text-[11px] outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>

        {fsError ? (
          <div className="p-6 text-center text-xs font-mono text-amber-500">{fsError}</div>
        ) : fsLoading ? (
          <div className={`p-6 text-center text-xs font-mono ${mutedCls}`}>Загрузка всех файлов...</div>
        ) : (
          <div className={`divide-y max-h-80 overflow-y-auto ${isDark ? 'divide-white/[0.06]' : 'divide-zinc-900/[0.08]'}`}>
            {filteredEntries.map((entry) => (
              <div
                key={entry.path}
                onClick={() => openOrPreview(entry)}
                className={`px-3.5 py-2 flex items-center justify-between gap-2 text-xs cursor-pointer transition ${
                  isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.04]'
                } ${entry.is_hidden ? 'opacity-75' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {entry.is_dir ? (
                    <Folder className="w-4 h-4 text-[var(--luma-accent)] shrink-0" />
                  ) : (
                    <File className={`w-4 h-4 shrink-0 ${mutedCls}`} />
                  )}
                  <span className="truncate font-medium">{entry.name}</span>
                  {entry.is_hidden && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-500/20 text-[9px] font-mono uppercase shrink-0">
                      скрытый
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`hidden sm:inline text-[10px] font-mono ${mutedCls}`}>
                    {entry.is_dir ? 'ПАПКА' : formatBytesRu(entry.size)}
                  </span>
                  {entry.mod_time && (
                    <span className={`hidden md:inline text-[10px] font-mono ${mutedCls}`}>{entry.mod_time}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPinFileToDesktop({ name: entry.name, path: entry.path, is_dir: entry.is_dir });
                    }}
                    title="Добавить на рабочий стол"
                    className={`p-1 rounded-md border cursor-pointer ${btnCls}`}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectFile({
                        label: entry.name,
                        path: entry.path,
                        kind: entry.is_dir ? 'disk_folder' : 'file',
                        onPinToDesktop: () =>
                          onPinFileToDesktop({ name: entry.name, path: entry.path, is_dir: entry.is_dir }),
                      });
                    }}
                    title="Свойства файла"
                    className={`p-1 rounded-md border cursor-pointer ${btnCls}`}
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {filteredEntries.length === 0 && (
              <div className={`p-6 text-center text-xs font-mono ${mutedCls}`}>Пустой каталог</div>
            )}
          </div>
        )}
      </div>

      {/* Inline File Preview */}
      {previewFile && (
        <div className={`p-3.5 rounded-xl border space-y-2 ${surfaceCls}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold truncate">{previewFile.name}</span>
            <button onClick={() => setPreviewFile(null)} className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <pre className={`p-3 rounded-lg border text-[11px] font-mono max-h-44 overflow-auto whitespace-pre-wrap ${btnCls}`}>
            {previewFile.content}
          </pre>
        </div>
      )}
    </div>
  );
};

/* ==================== 5. SETTINGS APPS LIST PANEL (ICON SIZE + APP EDITOR) ==================== */
const APP_ICON_CHOICES = [
  'Globe', 'Terminal', 'Code2', 'Gamepad2', 'Music', 'MessageSquare', 'FileText',
  'Folder', 'Cpu', 'Shield', 'Sparkles', 'Activity', 'Camera', 'Video', 'Settings',
];

export const SettingsAppsListPanel: React.FC<{
  apps: AppItem[];
  iconSizePx?: number;
  onChangeIconSizePx?: (px: number) => void;
  onUpdateApp?: (updated: AppItem) => void;
  renderAppIcon: (icon: string, cls?: string) => React.ReactNode;
  onLaunchApp: (app: AppItem) => void;
  onDeleteApp: (app: AppItem) => void;
  onOpenProperties: (app: AppItem) => void;
  onResetDefaultApps: () => void;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  isDark: boolean;
}> = ({
  apps,
  iconSizePx = 46,
  onChangeIconSizePx,
  onUpdateApp,
  renderAppIcon,
  onLaunchApp,
  onDeleteApp,
  onOpenProperties,
  onResetDefaultApps,
  surfaceCls,
  btnCls,
  mutedCls,
  isDark,
}) => {
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [draftName, setDraftName] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftIcon, setDraftIcon] = useState('Globe');

  const triggerAnimatedDelete = (app: AppItem) => {
    setDeletingIds((prev) => ({ ...prev, [app.id]: true }));
    window.setTimeout(() => {
      onDeleteApp(app);
      setDeletingIds((prev) => {
        const next = { ...prev };
        delete next[app.id];
        return next;
      });
    }, 260);
  };

  const startEdit = (app: AppItem) => {
    setEditingId(app.id);
    setDraftName(app.name);
    setDraftCategory(app.category);
    setDraftUrl(app.url || '');
    setDraftIcon(app.icon || 'Globe');
  };

  const saveEdit = (app: AppItem) => {
    if (!onUpdateApp) return;
    onUpdateApp({
      ...app,
      name: draftName.trim() || app.name,
      category: draftCategory.trim() || app.category,
      url: draftUrl.trim() || app.url,
      icon: draftIcon || app.icon,
    });
    setEditingId(null);
  };

  const filtered = apps.filter(
    (a) => !q.trim() || a.name.toLowerCase().includes(q.trim().toLowerCase()) || a.category.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* App & Desktop Icon Size Enlarger */}
      {onChangeIconSizePx && (
        <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold">Размер иконок приложений и рабочего стола</div>
              <div className={`text-[11px] ${mutedCls}`}>
                Увеличивает значки на рабочем столе и в библиотеке приложений в реальном времени
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-mono text-xs font-bold">
              {iconSizePx} px
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[180px] space-y-2">
              <input
                type="range"
                min={36}
                max={72}
                step={2}
                value={iconSizePx}
                onChange={(e) => onChangeIconSizePx(Number(e.target.value))}
                className="w-full"
              />
              <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                {(
                  [
                    [38, 'Компакт'],
                    [46, 'Стандарт'],
                    [56, 'Крупные'],
                    [68, 'XL'],
                  ] as const
                ).map(([px, label]) => (
                  <button
                    key={px}
                    onClick={() => onChangeIconSizePx(px)}
                    className={`py-1.5 rounded-lg border font-semibold cursor-pointer transition ${
                      Math.abs(iconSizePx - px) <= 3
                        ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                        : btnCls
                    }`}
                  >
                    {label} ({px})
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview Tile */}
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 min-w-[96px] ${btnCls}`}>
              <div
                style={{ width: `${iconSizePx}px`, height: `${iconSizePx}px` }}
                className="rounded-2xl bg-[var(--luma-accent)]/15 border border-[var(--luma-accent-border)] flex items-center justify-center text-[var(--luma-accent)] transition-all"
              >
                {renderAppIcon('Globe', iconSizePx >= 58 ? 'w-7 h-7' : iconSizePx >= 48 ? 'w-5 h-5' : 'w-4 h-4')}
              </div>
              <span className="text-[10px] font-mono opacity-80">Превью</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex-1 min-w-[180px] flex items-center gap-2 px-3 py-1.5 rounded-xl border ${btnCls}`}>
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по списку приложений..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-500"
          />
        </div>
        <button onClick={onResetDefaultApps} className={`px-3 py-1.5 rounded-xl border text-xs cursor-pointer ${btnCls}`}>
          Восстановить стандартные
        </button>
      </div>

      <div className={`rounded-xl border divide-y overflow-hidden ${surfaceCls} ${isDark ? 'divide-white/[0.06]' : 'divide-zinc-900/[0.08]'}`}>
        {filtered.map((app) => {
          const meta = getAppMeta(app);
          const isEditing = editingId === app.id;
          const isDeleting = Boolean(deletingIds[app.id]);
          return (
            <div key={app.id} className={`px-3.5 py-2.5 space-y-2 text-xs transition-all ${isDeleting ? 'luma-delete-app' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    style={{
                      width: `${Math.min(52, Math.max(32, Math.round(iconSizePx * 0.78)))}px`,
                      height: `${Math.min(52, Math.max(32, Math.round(iconSizePx * 0.78)))}px`,
                    }}
                    className={`relative rounded-xl border flex items-center justify-center shrink-0 transition-all overflow-hidden ${btnCls}`}
                  >
                    <span className="flex items-center justify-center">
                      {renderAppIcon(app.icon, iconSizePx >= 56 ? 'w-5 h-5' : 'w-4 h-4')}
                    </span>
                    {app.iconUrl && (
                      <img
                        src={app.iconUrl}
                        alt={app.name}
                        className="absolute inset-0 m-auto w-[68%] h-[68%] object-contain rounded"
                        onLoad={(e) => {
                          const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                          if (prev) prev.style.opacity = '0';
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1.5">
                      <span>{app.name}</span>
                      {app.isRunning && <span className="w-1.5 h-1.5 rounded-full bg-[var(--luma-accent)]" />}
                    </div>
                    <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                      {app.category} · {meta.sizeLabel} · скачано {meta.installedAt}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onLaunchApp(app)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                      app.isRunning ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                    }`}
                  >
                    {app.isRunning ? 'Стоп' : 'Запуск'}
                  </button>
                  {onUpdateApp && (
                    <button
                      onClick={() => (isEditing ? setEditingId(null) : startEdit(app))}
                      title="Редактировать приложение (имя, иконку, путь)"
                      className={`p-1.5 rounded-lg border cursor-pointer ${
                        isEditing ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onOpenProperties(app)}
                    title="Свойства"
                    className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => triggerAnimatedDelete(app)}
                    title="Удалить приложение"
                    className="p-1.5 rounded-lg hover:bg-rose-500/15 text-zinc-500 hover:text-rose-400 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className={`p-3 rounded-xl border space-y-2.5 ${isDark ? 'bg-black/30 border-white/10' : 'bg-black/[0.03] border-zinc-900/10'}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className={`text-[10px] font-mono ${mutedCls}`}>Название</span>
                      <input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none ${btnCls}`}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className={`text-[10px] font-mono ${mutedCls}`}>Категория</span>
                      <input
                        value={draftCategory}
                        onChange={(e) => setDraftCategory(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none ${btnCls}`}
                      />
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className={`text-[10px] font-mono ${mutedCls}`}>Путь к EXE / Команда / URL</span>
                    <input
                      value={draftUrl}
                      onChange={(e) => setDraftUrl(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none ${btnCls}`}
                    />
                  </label>
                  <div className="space-y-1">
                    <span className={`text-[10px] font-mono ${mutedCls}`}>Иконка приложения</span>
                    <div className="flex flex-wrap gap-1.5">
                      {APP_ICON_CHOICES.map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setDraftIcon(ic)}
                          title={ic}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            draftIcon === ic
                              ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                              : btnCls
                          }`}
                        >
                          {renderAppIcon(ic, 'w-3.5 h-3.5')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className={`px-3 py-1 rounded-lg border text-[11px] cursor-pointer ${btnCls}`}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(app)}
                      className="px-3.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-[11px] font-bold cursor-pointer"
                    >
                      Сохранить изменения
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ==================== 6. SETTINGS NOTIFICATIONS PANEL ==================== */
export const SettingsNotificationsPanel: React.FC<{
  notificationsEnabled: boolean;
  onToggleNotificationsEnabled: () => void;
  dndEnabled: boolean;
  onToggleDnd: () => void;
  toastBannersEnabled: boolean;
  onToggleToastBanners: () => void;
  notificationSoundEnabled: boolean;
  onToggleNotificationSound: () => void;
  notifications: WindowsNotificationItem[];
  onClearNotifications: () => void;
  onMarkAllRead: () => void;
  onSendTestNotification: () => void;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
}> = ({
  notificationsEnabled,
  onToggleNotificationsEnabled,
  dndEnabled,
  onToggleDnd,
  toastBannersEnabled,
  onToggleToastBanners,
  notificationSoundEnabled,
  onToggleNotificationSound,
  notifications,
  onClearNotifications,
  onMarkAllRead,
  onSendTestNotification,
  surfaceCls,
  btnCls,
  mutedCls,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        {[
          { label: 'Уведомления системы', sub: 'Разрешить системные и прикладные оповещения', active: notificationsEnabled, toggle: onToggleNotificationsEnabled },
          { label: 'Режим «Не беспокоить»', sub: 'Скрывать баннеры, тихо сохранять в журнале', active: dndEnabled, toggle: onToggleDnd },
          { label: 'Всплывающие баннеры', sub: 'Показывать тосты в углу экрана', active: toastBannersEnabled, toggle: onToggleToastBanners },
          { label: 'Звуковой сигнал', sub: 'Короткий сигнал при важных событиях', active: notificationSoundEnabled, toggle: onToggleNotificationSound },
        ].map((row) => (
          <div
            key={row.label}
            onClick={row.toggle}
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${surfaceCls}`}
          >
            <div className="min-w-0">
              <div className="font-bold truncate">{row.label}</div>
              <div className={`text-[11px] truncate ${mutedCls}`}>{row.sub}</div>
            </div>
            <StatusBadge active={row.active} />
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-xl border space-y-3 ${surfaceCls}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold inline-flex items-center gap-1.5">
            {dndEnabled ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5 text-[var(--luma-accent)]" />}
            Журнал уведомлений ({notifications.length})
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={onSendTestNotification} className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white font-semibold cursor-pointer">
              Тест
            </button>
            <button onClick={onMarkAllRead} className={`px-2.5 py-1 rounded-lg border cursor-pointer ${btnCls}`}>
              Прочитать
            </button>
            <button onClick={onClearNotifications} className={`px-2.5 py-1 rounded-lg border cursor-pointer ${btnCls}`}>
              Очистить
            </button>
          </div>
        </div>
        {notifications.length === 0 ? (
          <div className={`py-6 text-center text-xs font-mono ${mutedCls}`}>Журнал пуст</div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {notifications.map((n) => (
              <div key={n.id} className={`p-3 rounded-xl border text-xs ${btnCls}`}>
                <div className="flex justify-between font-bold">
                  <span>{n.title}</span>
                  <span className={`font-mono font-normal ${mutedCls}`}>{n.time}</span>
                </div>
                <div className={`mt-0.5 ${mutedCls}`}>{n.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ==================== 7. PROPERTIES MODAL (СВОЙСТВА ПРИЛОЖЕНИЯ / ФАЙЛА) ==================== */
export const PropertiesModal: React.FC<{
  target: PropertiesTarget | null;
  onClose: () => void;
  onLaunchApp?: (app: AppItem) => void;
  onCopyPath: (path: string) => void;
  popoverShellCls: string;
  btnCls: string;
  mutedCls: string;
  isDark: boolean;
}> = ({ target, onClose, onLaunchApp, onCopyPath, popoverShellCls, btnCls, mutedCls, isDark }) => {
  const [stat, setStat] = useState<FileStatResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!target) {
      setStat(null);
      return;
    }
    const p = target.path || '';
    const looksLikeLocalPath = p && !/^https?:\/\//i.test(p) && !p.startsWith('luma://');
    if (!looksLikeLocalPath) {
      setStat(null);
      return;
    }
    setLoading(true);
    fetch('/api/kernel/stat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: p }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: FileStatResponse | null) => setStat(d))
      .catch(() => setStat(null))
      .finally(() => setLoading(false));
  }, [target]);

  if (!target) return null;

  const appMeta = target.app ? getAppMeta(target.app) : null;
  const sizeText = loading
    ? 'Вычисление...'
    : stat?.exists
    ? stat.is_dir
      ? 'Каталог ОС'
      : `${stat.size_human} (${stat.size_bytes.toLocaleString('ru-RU')} байт)`
    : appMeta?.sizeLabel || 'Системный объект';
  const dateText = stat?.exists && stat.modified_at ? stat.modified_at : appMeta?.installedAt || '—';

  return (
    <div onClick={onClose} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className={`luma-animate-in w-full max-w-md border p-5 space-y-4 text-xs ${popoverShellCls}`}
      >
        <div className={`pb-3 border-b flex items-center justify-between gap-2 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center shrink-0">
              {target.kind === 'disk_folder' || target.kind === 'folder' ? (
                <Folder className="w-4 h-4" />
              ) : target.app ? (
                <AppWindow className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{target.label}</div>
              <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>
                Свойства · {target.app ? target.app.category : target.kind}
              </div>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 font-mono">
          {[
            ['Вес / Размер', sizeText],
            ['Дата скачивания / изм.', dateText],
            ['Версия / Тип', appMeta ? `${appMeta.version} (${target.app?.type})` : target.kind.toUpperCase()],
            ['Расположение / Цель', stat?.exists ? stat.path : target.path || '—'],
            ...(target.app
              ? [
                  ['Пакет', target.app.package || '—'],
                  [
                    'Экранное время',
                    target.app.isRunning
                      ? `Активно · ${formatLiveClock(target.app.elapsedSeconds)}`
                      : `Месяц: ${formatDurationRu(target.app.monthMinutes, target.app.elapsedSeconds)}`,
                  ],
                  ['Статус', target.app.isRunning ? 'Запущено' : target.app.installed ? 'Установлено' : 'Веб / Не установлено'],
                ]
              : []),
          ].map(([k, v]) => (
            <div
              key={k}
              className={`px-3 py-2 rounded-xl border flex items-start justify-between gap-3 ${
                isDark ? 'bg-black/20 border-white/[0.07]' : 'bg-black/[0.03] border-zinc-900/10'
              }`}
            >
              <span className={`shrink-0 ${mutedCls}`}>{k}:</span>
              <span className="text-right font-semibold break-all">{v}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {target.app && onLaunchApp && (
              <button
                onClick={() => {
                  onLaunchApp(target.app!);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                {target.app.isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {target.app.isRunning ? 'Остановить' : 'Запустить'}
              </button>
            )}
            {target.path && (
              <button
                onClick={() => onCopyPath(stat?.exists ? stat.path : target.path)}
                className={`px-2.5 py-1.5 rounded-xl border inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
              >
                <Copy className="w-3 h-3" /> Путь
              </button>
            )}
            {target.onPinToDesktop && (
              <button
                onClick={() => {
                  target.onPinToDesktop?.();
                  onClose();
                }}
                className={`px-2.5 py-1.5 rounded-xl border inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
              >
                <Pin className="w-3 h-3" /> На стол
              </button>
            )}
          </div>

          {target.onDelete && (
            <button
              onClick={() => {
                target.onDelete?.();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent-soft)] border border-[var(--luma-accent-border)] text-[var(--luma-accent)] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
