import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Bluetooth,
  RefreshCw,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  Headphones,
  Mouse,
  Keyboard,
  Gamepad2,
  BatteryCharging,
  Power,
  Unplug,
} from 'lucide-react';

export interface WifiNetworkItem {
  ssid: string;
  signal: number;
  secured: boolean;
  auth: string;
  band: string;
  connected: boolean;
  saved: boolean;
  bssid?: string;
}

export interface WifiStatusSnapshot {
  ok: boolean;
  available: boolean;
  enabled: boolean;
  connected: boolean;
  active_ssid: string;
  interface_name: string;
  signal: number;
  ip_address?: string;
  networks: WifiNetworkItem[];
  error?: string;
  updated_at?: string;
}

export interface BluetoothDeviceItem {
  name: string;
  status: string;
  connected: boolean;
  paired?: boolean;
  discovered?: boolean;
  address?: string;
  class?: string;
  device_type?: string;
  battery_percent?: number;
  transport?: string;
  instance_id?: string;
}

export interface BluetoothStatusSnapshot {
  ok?: boolean;
  available: boolean;
  enabled: boolean;
  adapter_name: string;
  devices: BluetoothDeviceItem[];
  updated_at?: string;
}

interface WifiPickerProps {
  isDark: boolean;
  status: WifiStatusSnapshot | null;
  loading: boolean;
  onRefresh: (rescan?: boolean) => void;
  onToggleRadio: (enabled: boolean) => void;
  onConnect: (
    ssid: string,
    password?: string
  ) => Promise<{ ok: boolean; needs_password?: boolean; message?: string; error?: string }>;
  onDisconnect: () => Promise<void>;
  onClose: () => void;
}

const SignalBars: React.FC<{ signal: number; active?: boolean }> = ({ signal, active }) => {
  const level = signal >= 75 ? 4 : signal >= 50 ? 3 : signal >= 25 ? 2 : signal > 0 ? 1 : 0;
  return (
    <div className="flex items-end gap-[2px] h-3 shrink-0" title={`Сигнал ${signal}%`}>
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          style={{ height: `${bar * 3}px` }}
          className={`w-[3px] rounded-full transition-colors ${
            bar <= level
              ? active
                ? 'bg-emerald-400'
                : 'bg-cyan-400'
              : 'bg-current opacity-20'
          }`}
        />
      ))}
    </div>
  );
};

export const LumaWifiPickerPanel: React.FC<WifiPickerProps> = ({
  isDark,
  status,
  loading,
  onRefresh,
  onToggleRadio,
  onConnect,
  onDisconnect,
  onClose,
}) => {
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busySsid, setBusySsid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const shellCls = isDark
    ? 'bg-[#0b101b]/95 border-cyan-400/30 text-white'
    : 'bg-white/95 border-slate-300 text-slate-900';
  const itemCls = isDark
    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.09]'
    : 'bg-slate-50 border-slate-200 hover:bg-slate-100';
  const mutedCls = isDark ? 'text-white/55' : 'text-slate-500';
  const inputCls = isDark
    ? 'bg-black/45 border-white/15 text-white placeholder:text-white/35 focus:border-cyan-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500';

  const enabled = status ? status.enabled : true;
  const networks = status?.networks || [];

  const handleRowClick = async (net: WifiNetworkItem) => {
    setFeedback(null);
    if (net.connected) {
      setSelectedSsid((prev) => (prev === net.ssid ? null : net.ssid));
      return;
    }
    if (net.secured && !net.saved) {
      setSelectedSsid(net.ssid);
      setPassword('');
      setShowPass(false);
      return;
    }
    setBusySsid(net.ssid);
    try {
      const res = await onConnect(net.ssid);
      if (res.ok) {
        setSelectedSsid(null);
        setPassword('');
        setFeedback({ kind: 'ok', text: res.message || `Подключено к ${net.ssid}` });
      } else if (res.needs_password) {
        setSelectedSsid(net.ssid);
        setPassword('');
        setFeedback({ kind: 'err', text: res.error || 'Введите пароль сети Wi-Fi' });
      } else {
        setFeedback({ kind: 'err', text: res.error || 'Не удалось подключиться' });
      }
    } finally {
      setBusySsid(null);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent, ssid: string) => {
    e.preventDefault();
    if (!password.trim()) {
      setFeedback({ kind: 'err', text: 'Введите пароль сети' });
      return;
    }
    setFeedback(null);
    setBusySsid(ssid);
    try {
      const res = await onConnect(ssid, password);
      if (res.ok) {
        setSelectedSsid(null);
        setPassword('');
        setFeedback({ kind: 'ok', text: res.message || `Подключено к ${ssid}` });
      } else {
        setFeedback({ kind: 'err', text: res.error || 'Неверный пароль или сеть недоступна' });
      }
    } finally {
      setBusySsid(null);
    }
  };

  const handleDisconnect = async () => {
    setFeedback(null);
    setBusySsid(status?.active_ssid || '__disconnect__');
    try {
      await onDisconnect();
      setSelectedSsid(null);
      setFeedback({ kind: 'ok', text: 'Отключено от Wi-Fi' });
    } finally {
      setBusySsid(null);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className={`rounded-2xl border p-2.5 space-y-2 shadow-xl ${shellCls}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {enabled ? (
            <Wifi className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span className="text-[11px] font-bold truncate">Сети Wi-Fi</span>
          {status?.connected && status.active_ssid && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-emerald-500/20 text-emerald-400 truncate max-w-[110px]">
              {status.active_ssid}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleRadio(!enabled)}
            title={enabled ? 'Выключить Wi-Fi' : 'Включить Wi-Fi'}
            className={`px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-bold border transition cursor-pointer ${
              enabled
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                : isDark
                ? 'bg-white/5 border-white/15 text-white/50'
                : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}
          >
            {enabled ? 'ВКЛ' : 'ВЫКЛ'}
          </button>
          <button
            type="button"
            onClick={() => onRefresh(true)}
            disabled={loading}
            title="Сканировать сети Wi-Fi"
            className={`p-1 rounded-lg border transition cursor-pointer ${itemCls}`}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть список Wi-Fi"
            className={`p-1 rounded-lg border transition cursor-pointer ${itemCls}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`px-2 py-1.5 rounded-xl text-[10px] font-medium border ${
            feedback.kind === 'ok'
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-400/35 text-rose-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {!enabled ? (
        <div className={`py-4 text-center space-y-2 text-[11px] ${mutedCls}`}>
          <div>Wi-Fi адаптер выключен</div>
          <button
            type="button"
            onClick={() => onToggleRadio(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Power className="w-3 h-3" /> Включить Wi-Fi
          </button>
        </div>
      ) : loading && networks.length === 0 ? (
        <div className={`py-4 flex items-center justify-center gap-2 text-[11px] ${mutedCls}`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          <span>Поиск доступных сетей Wi-Fi…</span>
        </div>
      ) : networks.length === 0 ? (
        <div className={`py-3 text-center text-[10px] font-mono ${mutedCls}`}>
          {status?.error || 'Доступные сети Wi-Fi не найдены. Нажмите обновить.'}
        </div>
      ) : (
        <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
          {networks.map((net) => {
            const expanded = selectedSsid === net.ssid;
            const isBusy = busySsid === net.ssid;
            return (
              <div
                key={net.ssid}
                className={`rounded-xl border transition overflow-hidden ${
                  net.connected
                    ? 'border-emerald-400/45 bg-emerald-500/10'
                    : expanded
                    ? 'border-cyan-400/50 bg-cyan-500/10'
                    : itemCls
                }`}
              >
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleRowClick(net)}
                  className="w-full px-2.5 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SignalBars signal={net.signal} active={net.connected} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold truncate flex items-center gap-1.5">
                        <span className="truncate">{net.ssid}</span>
                        {net.connected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                      </div>
                      <div className={`text-[9px] font-mono truncate ${mutedCls}`}>
                        {net.connected
                          ? 'Подключено'
                          : net.saved
                          ? 'Сохранена'
                          : net.secured
                          ? 'Требуется пароль'
                          : 'Открытая сеть'}{' '}
                        · {net.band || 'Wi-Fi'} · {net.signal}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : net.secured ? (
                      <Lock className={`w-3 h-3 ${net.connected ? 'text-emerald-400' : mutedCls}`} />
                    ) : (
                      <Unlock className={`w-3 h-3 ${mutedCls}`} />
                    )}
                  </div>
                </button>

                {/* Inline Connect / Password / Disconnect Drawer (100% Native Luma OS) */}
                {expanded && (
                  <div className={`px-2.5 pb-2.5 pt-1 border-t space-y-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    {net.connected ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-mono ${mutedCls}`}>
                          {status?.ip_address ? `IP: ${status.ip_address}` : 'Активное соединение'}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleDisconnect()}
                          disabled={Boolean(busySsid)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-400/35 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Unplug className="w-3 h-3" /> Отключить
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={(e) => void handlePasswordSubmit(e, net.ssid)} className="space-y-1.5">
                        <div className="text-[10px] font-medium flex items-center gap-1 text-cyan-300">
                          <KeyRound className="w-3 h-3" /> Пароль для «{net.ssid}»
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type={showPass ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            placeholder="Введите ключ безопасности Wi-Fi..."
                            className={`w-full pl-2.5 pr-8 py-1.5 rounded-lg border text-[11px] outline-none ${inputCls}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass((v) => !v)}
                            className={`absolute right-2 p-0.5 cursor-pointer ${mutedCls}`}
                            title={showPass ? 'Скрыть пароль' : 'Показать пароль'}
                          >
                            {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSsid(null);
                              setPassword('');
                              setFeedback(null);
                            }}
                            className={`px-2 py-1 rounded-lg border text-[10px] cursor-pointer ${itemCls}`}
                          >
                            Отмена
                          </button>
                          <button
                            type="submit"
                            disabled={isBusy || !password.trim()}
                            className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                            Подключить
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface BluetoothPickerProps {
  isDark: boolean;
  status: BluetoothStatusSnapshot | null;
  loading: boolean;
  onRefresh: (activeScan?: boolean) => void;
  onToggleRadio: (enabled: boolean) => void;
  onDeviceAction: (
    dev: BluetoothDeviceItem,
    action: 'connect' | 'disconnect' | 'pair',
    pin?: string
  ) => Promise<{ ok: boolean; needs_pin?: boolean; message?: string; error?: string }>;
  onClose: () => void;
}

export const LumaBluetoothPickerPanel: React.FC<BluetoothPickerProps> = ({
  isDark,
  status,
  loading,
  onRefresh,
  onToggleRadio,
  onDeviceAction,
  onClose,
}) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const shellCls = isDark
    ? 'bg-[#0b101b]/95 border-sky-400/30 text-white'
    : 'bg-white/95 border-slate-300 text-slate-900';
  const itemCls = isDark
    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.09]'
    : 'bg-slate-50 border-slate-200 hover:bg-slate-100';
  const mutedCls = isDark ? 'text-white/55' : 'text-slate-500';
  const inputCls = isDark
    ? 'bg-black/45 border-white/15 text-white placeholder:text-white/35 focus:border-sky-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500';

  const enabled = status ? status.enabled : true;
  const devices = status?.devices || [];

  const renderDevIcon = (t?: string) => {
    if (t === 'headphones') return <Headphones className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    if (t === 'mouse') return <Mouse className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    if (t === 'keyboard') return <Keyboard className="w-3.5 h-3.5 text-violet-400 shrink-0" />;
    if (t === 'gamepad') return <Gamepad2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    return <Bluetooth className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  };

  const runAction = async (dev: BluetoothDeviceItem, key: string, action: 'connect' | 'disconnect' | 'pair', pin?: string) => {
    setFeedback(null);
    setBusyKey(key);
    try {
      const res = await onDeviceAction(dev, action, pin);
      if (res.ok) {
        setPinCode('');
        setSelectedKey(null);
        setFeedback({ kind: 'ok', text: res.message || 'Готово' });
      } else {
        setFeedback({ kind: 'err', text: res.error || 'Не удалось выполнить операцию' });
      }
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className={`rounded-2xl border p-2.5 space-y-2 shadow-xl ${shellCls}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Bluetooth className={`w-3.5 h-3.5 shrink-0 ${enabled ? 'text-sky-400' : 'text-rose-400'}`} />
          <span className="text-[11px] font-bold truncate">Bluetooth ({devices.length})</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleRadio(!enabled)}
            title={enabled ? 'Выключить Bluetooth' : 'Включить Bluetooth'}
            className={`px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-bold border transition cursor-pointer ${
              enabled
                ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                : isDark
                ? 'bg-white/5 border-white/15 text-white/50'
                : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}
          >
            {enabled ? 'ВКЛ' : 'ВЫКЛ'}
          </button>
          <button
            type="button"
            onClick={() => onRefresh(true)}
            disabled={loading}
            title="Найти все устройства Bluetooth рядом (активное сканирование)"
            className={`px-1.5 py-1 rounded-lg border text-[9px] font-semibold inline-flex items-center gap-1 transition cursor-pointer ${itemCls}`}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Поиск</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть список Bluetooth"
            className={`p-1 rounded-lg border transition cursor-pointer ${itemCls}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`px-2 py-1.5 rounded-xl text-[10px] font-medium border ${
            feedback.kind === 'ok'
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-400/35 text-rose-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {!enabled ? (
        <div className={`py-4 text-center space-y-2 text-[11px] ${mutedCls}`}>
          <div>Модуль Bluetooth выключен</div>
          <button
            type="button"
            onClick={() => onToggleRadio(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Power className="w-3 h-3" /> Включить Bluetooth
          </button>
        </div>
      ) : loading && devices.length === 0 ? (
        <div className={`py-4 flex items-center justify-center gap-2 text-[11px] ${mutedCls}`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
          <span>Поиск всех устройств Bluetooth рядом…</span>
        </div>
      ) : devices.length === 0 ? (
        <div className={`py-3 text-center text-[10px] font-mono ${mutedCls}`}>
          Устройства Bluetooth не найдены. Нажмите «Поиск» для сканирования эфира.
        </div>
      ) : (
        <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
          {devices.map((dev, idx) => {
            const devKey = `${dev.instance_id || dev.address || dev.name}_${idx}`;
            const expanded = selectedKey === devKey;
            const isBusy = busyKey === devKey;
            const hasBat = typeof dev.battery_percent === 'number' && dev.battery_percent >= 0;
            const stateLabel = dev.connected
              ? 'Подключено'
              : dev.discovered && !dev.paired
              ? 'Найдено рядом'
              : 'Сопряжено';
            return (
              <div
                key={devKey}
                className={`rounded-xl border transition overflow-hidden ${
                  dev.connected
                    ? 'border-emerald-400/45 bg-emerald-500/10'
                    : dev.discovered && !dev.paired
                    ? 'border-amber-400/35 bg-amber-500/[0.06]'
                    : expanded
                    ? 'border-cyan-400/50 bg-cyan-500/10'
                    : itemCls
                }`}
              >
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setSelectedKey((prev) => (prev === devKey ? null : devKey))}
                  className="w-full px-2.5 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {renderDevIcon(dev.device_type)}
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold truncate">{dev.name}</div>
                      <div className={`text-[9px] font-mono truncate ${mutedCls}`}>
                        {stateLabel} · {dev.address || dev.transport || dev.class || 'Bluetooth'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasBat && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 inline-flex items-center gap-0.5">
                        <BatteryCharging className="w-2.5 h-2.5" />
                        {dev.battery_percent}%
                      </span>
                    )}
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    ) : dev.connected ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                    ) : dev.discovered && !dev.paired ? (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-amber-500/20 text-amber-300">НОВОЕ</span>
                    ) : null}
                  </div>
                </button>

                {expanded && (
                  <div className={`px-2.5 pb-2.5 pt-1.5 border-t space-y-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    {dev.connected ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void runAction(dev, devKey, 'disconnect')}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-400/35 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Unplug className="w-3 h-3" /> Отключить
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void runAction(dev, devKey, dev.discovered || pinCode.trim() ? 'pair' : 'connect', pinCode.trim());
                        }}
                        className="space-y-1.5"
                      >
                        <input
                          type="text"
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value)}
                          placeholder="PIN-код (если требует устройство, опционально)"
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-[10px] outline-none ${inputCls}`}
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKey(null);
                              setPinCode('');
                            }}
                            className={`px-2 py-1 rounded-lg border text-[10px] cursor-pointer ${itemCls}`}
                          >
                            Отмена
                          </button>
                          <button
                            type="submit"
                            disabled={isBusy}
                            className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                            {dev.discovered && !dev.paired ? 'Сопрячь и подключить' : pinCode.trim() ? 'Сопрячь с PIN' : 'Подключить'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
