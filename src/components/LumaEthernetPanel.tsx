import React, { useCallback, useEffect, useState } from 'react';
import {
  Cable,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Power,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Sliders,
  AlertTriangle,
  X,
} from 'lucide-react';

export interface EthernetAdapterInfo {
  name: string;
  description: string;
  status: string; // Up | Disabled | Disconnected
  enabled: boolean;
  connected: boolean;
  link_speed: string;
  mac_address: string;
  ipv4: string;
  prefix_length: number;
  subnet_mask: string;
  gateway: string;
  dns_servers: string[];
  dhcp_enabled: boolean;
  dns_auto: boolean;
  rx_mbps?: number;
  tx_mbps?: number;
}

export interface EthernetStatusSnapshot {
  ok: boolean;
  available: boolean;
  any_enabled: boolean;
  any_connected: boolean;
  primary_name: string;
  primary_speed: string;
  primary_ip: string;
  adapters: EthernetAdapterInfo[];
  error?: string;
  updated_at?: string;
}

interface EthernetActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  status?: EthernetStatusSnapshot;
}

export interface LumaEthernetPanelProps {
  mode?: 'full' | 'compact';
  isDark?: boolean;
  externalStatus?: EthernetStatusSnapshot | null;
  onStatusChange?: (status: EthernetStatusSnapshot) => void;
  onNotify?: (msg: string) => void;
  onClose?: () => void;
  className?: string;
}

const DNS_PRESETS = [
  { id: 'auto', label: 'Авто (DHCP)', p1: '', p2: '' },
  { id: 'cloudflare', label: 'Cloudflare', p1: '1.1.1.1', p2: '1.0.0.1' },
  { id: 'google', label: 'Google DNS', p1: '8.8.8.8', p2: '8.8.4.4' },
  { id: 'adguard', label: 'AdGuard', p1: '94.140.14.14', p2: '94.140.15.15' },
  { id: 'quad9', label: 'Quad9', p1: '9.9.9.9', p2: '149.112.112.112' },
];

export const LumaEthernetPanel: React.FC<LumaEthernetPanelProps> = ({
  mode = 'full',
  isDark = true,
  externalStatus = null,
  onStatusChange,
  onNotify,
  onClose,
  className = '',
}) => {
  const [status, setStatus] = useState<EthernetStatusSnapshot | null>(externalStatus);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(mode === 'full');
  const [ipMode, setIpMode] = useState<'dhcp' | 'static'>('dhcp');
  const [ipVal, setIpVal] = useState('');
  const [maskVal, setMaskVal] = useState('255.255.255.0');
  const [gwVal, setGwVal] = useState('');
  const [dnsMode, setDnsMode] = useState<'auto' | 'custom'>('auto');
  const [dns1, setDns1] = useState('');
  const [dns2, setDns2] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const syncFormFromAdapter = useCallback((adapter: EthernetAdapterInfo | undefined) => {
    if (!adapter) return;
    setSelectedName(adapter.name);
    setIpMode(adapter.dhcp_enabled ? 'dhcp' : 'static');
    setIpVal(adapter.ipv4 || '');
    setMaskVal(adapter.subnet_mask || '255.255.255.0');
    setGwVal(adapter.gateway || '');
    setDnsMode(adapter.dns_auto ? 'auto' : 'custom');
    setDns1(adapter.dns_servers?.[0] || '');
    setDns2(adapter.dns_servers?.[1] || '');
  }, []);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/kernel/ethernet/status');
      if (r.ok) {
        const d: EthernetStatusSnapshot = await r.json();
        setStatus(d);
        onStatusChange?.(d);
        const cur =
          d.adapters?.find((a) => a.name === selectedName) ||
          d.adapters?.find((a) => a.connected) ||
          d.adapters?.[0];
        if (cur && !selectedName) {
          syncFormFromAdapter(cur);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [onStatusChange, selectedName, syncFormFromAdapter]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (externalStatus && !status) {
      setStatus(externalStatus);
      const cur =
        externalStatus.adapters?.find((a) => a.connected) || externalStatus.adapters?.[0];
      if (cur && !selectedName) syncFormFromAdapter(cur);
    }
  }, [externalStatus, selectedName, status, syncFormFromAdapter]);

  const adapters = status?.adapters || [];
  const activeAdapter =
    adapters.find((a) => a.name === selectedName) ||
    adapters.find((a) => a.connected) ||
    adapters[0];

  const handleToggle = async (targetName: string, nextEnabled: boolean) => {
    setBusy('toggle');
    setFeedback(null);
    try {
      const r = await fetch('/api/kernel/ethernet/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: targetName, enabled: nextEnabled }),
      });
      const d: EthernetActionResult = await r.json();
      if (d.status) {
        setStatus(d.status);
        onStatusChange?.(d.status);
      }
      if (d.ok) {
        const msg = d.message || (nextEnabled ? 'Проводной интернет включён' : 'Проводной интернет отключён');
        setFeedback({ kind: 'ok', text: msg });
        onNotify?.(msg);
      } else {
        const err = d.error || d.message || 'Не удалось переключить Ethernet';
        setFeedback({ kind: 'err', text: err });
        onNotify?.(err);
      }
    } catch {
      const msg = 'Управление проводным интернетом доступно в установленной Luma OS на Windows.';
      setFeedback({ kind: 'err', text: msg });
      onNotify?.(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleApplyConfig = async (override?: Partial<{
    mode: 'dhcp' | 'static';
    dns_mode: 'auto' | 'custom';
    dns_primary: string;
    dns_secondary: string;
  }>) => {
    if (!activeAdapter) return;
    setBusy('config');
    setFeedback(null);
    const body = {
      name: activeAdapter.name,
      mode: override?.mode ?? ipMode,
      ip: ipVal.trim(),
      subnet_mask: maskVal.trim() || '255.255.255.0',
      gateway: gwVal.trim(),
      dns_mode: override?.dns_mode ?? dnsMode,
      dns_primary: override?.dns_primary ?? dns1.trim(),
      dns_secondary: override?.dns_secondary ?? dns2.trim(),
    };
    try {
      const r = await fetch('/api/kernel/ethernet/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d: EthernetActionResult = await r.json();
      if (d.status) {
        setStatus(d.status);
        onStatusChange?.(d.status);
        const updated = d.status.adapters?.find((a) => a.name === activeAdapter.name);
        if (updated) syncFormFromAdapter(updated);
      }
      if (d.ok) {
        const msg = d.message || 'Настройки проводного интернета применены!';
        setFeedback({ kind: 'ok', text: msg });
        onNotify?.(msg);
      } else {
        const err = d.error || 'Не удалось применить настройки Ethernet';
        setFeedback({ kind: 'err', text: err });
        onNotify?.(err);
      }
    } catch {
      setFeedback({ kind: 'err', text: 'Ошибка связи с ядром Luma OS.' });
    } finally {
      setBusy(null);
    }
  };

  const handleQuickAction = async (action: 'renew' | 'flush_dns' | 'open_ncpa') => {
    setBusy(action);
    setFeedback(null);
    try {
      const r = await fetch('/api/kernel/ethernet/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: activeAdapter?.name || '', action }),
      });
      const d: EthernetActionResult = await r.json();
      if (d.status) {
        setStatus(d.status);
        onStatusChange?.(d.status);
      }
      if (d.ok) {
        setFeedback({ kind: 'ok', text: d.message || 'Выполнено' });
        onNotify?.(d.message || 'Выполнено');
      } else {
        setFeedback({ kind: 'err', text: d.error || 'Не удалось выполнить действие' });
      }
    } catch {
      setFeedback({ kind: 'err', text: 'Действие доступно на Windows.' });
    } finally {
      setBusy(null);
    }
  };

  const compact = mode === 'compact';
  const shellCls = isDark
    ? 'bg-[#0b101b]/95 border-emerald-400/25 text-white'
    : 'bg-white/95 border-slate-300 text-slate-900';
  const cardCls = isDark
    ? 'bg-white/[0.04] border-white/10'
    : 'bg-slate-50 border-slate-200';
  const inputCls = isDark
    ? 'bg-black/45 border-white/15 text-white placeholder:text-white/35 focus:border-emerald-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500';
  const mutedCls = isDark ? 'text-white/55' : 'text-slate-500';

  const isEnabled = activeAdapter ? activeAdapter.enabled : Boolean(status?.any_enabled);
  const isConnected = activeAdapter ? activeAdapter.connected : Boolean(status?.any_connected);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className={`rounded-2xl border shadow-xl ${compact ? 'p-2.5 space-y-2' : 'p-4 space-y-3'} ${shellCls} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
              isConnected
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : isEnabled
                ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                : 'bg-rose-500/15 border-rose-400/35 text-rose-300'
            }`}
          >
            <Cable className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-extrabold tracking-tight truncate flex items-center gap-1.5">
              <span>Проводной интернет (Ethernet)</span>
              {activeAdapter?.link_speed && isConnected && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-emerald-500/20 text-emerald-300">
                  {activeAdapter.link_speed}
                </span>
              )}
            </div>
            <div className={`text-[10px] truncate ${mutedCls}`}>
              {activeAdapter
                ? `${activeAdapter.name} · ${activeAdapter.description}`
                : 'Управление сетевым кабелем, IPv4 и DNS'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => void fetchStatus()}
            disabled={loading}
            title="Обновить состояние Ethernet"
            className={`p-1.5 rounded-xl border transition cursor-pointer ${cardCls}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Закрыть панель Ethernet"
              className={`p-1.5 rounded-xl border transition cursor-pointer ${cardCls}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Adapter Tabs if PC has multiple wired adapters */}
      {adapters.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {adapters.map((a) => (
            <button
              key={a.name}
              type="button"
              onClick={() => syncFormFromAdapter(a)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                activeAdapter?.name === a.name
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                  : `${cardCls} opacity-75 hover:opacity-100`
              }`}
            >
              {a.name} · {a.connected ? 'Сеть' : a.enabled ? 'Нет кабеля' : 'Выкл'}
            </button>
          ))}
        </div>
      )}

      {/* Main Power Card (Disable / Enable Wired Internet in 1 Click!) */}
      {!status?.available && !loading ? (
        <div className={`rounded-xl border p-3 text-center text-[11px] ${cardCls} ${mutedCls}`}>
          Проводной сетевой адаптер (Ethernet) не обнаружен на этом ПК.
        </div>
      ) : (
        <div className={`rounded-xl border p-2.5 flex flex-wrap items-center justify-between gap-2.5 ${cardCls}`}>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 text-[11.5px] font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : isEnabled
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                {isConnected
                  ? 'Подключён по кабелю'
                  : isEnabled
                  ? 'Адаптер включён (кабель не подключён)'
                  : 'Проводной интернет отключён'}
              </span>
            </div>
            <div className={`text-[10px] font-mono ${mutedCls} flex flex-wrap gap-x-2.5 gap-y-0.5`}>
              {activeAdapter?.ipv4 && <span>IP: {activeAdapter.ipv4}</span>}
              {activeAdapter?.gateway && <span>Шлюз: {activeAdapter.gateway}</span>}
              {activeAdapter?.dns_servers?.length ? (
                <span>DNS: {activeAdapter.dns_servers.slice(0, 2).join(', ')}</span>
              ) : null}
              {activeAdapter?.mac_address && !compact && <span>MAC: {activeAdapter.mac_address}</span>}
            </div>
          </div>

          <button
            type="button"
            disabled={busy !== null || !activeAdapter}
            onClick={() => activeAdapter && void handleToggle(activeAdapter.name, !isEnabled)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 ${
              isEnabled
                ? 'border-rose-400/45 bg-rose-500/20 hover:bg-rose-500/32 text-rose-100'
                : 'border-emerald-400/45 bg-emerald-500/25 hover:bg-emerald-500/38 text-emerald-50'
            }`}
          >
            {busy === 'toggle' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Power className="w-3.5 h-3.5" />
            )}
            {isEnabled ? 'Отключить провод' : 'Включить провод'}
          </button>
        </div>
      )}

      {/* Quick 1-Click DNS Presets */}
      {activeAdapter && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className={`font-bold flex items-center gap-1 ${mutedCls}`}>
              <Globe className="w-3 h-3 text-sky-400" /> Быстрые DNS для провода
            </span>
            {compact && (
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-[10px] font-bold text-sky-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                {showAdvanced ? 'Скрыть IP/DNS' : 'Настройки IP/DNS'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {DNS_PRESETS.map((preset) => {
              const active =
                preset.id === 'auto'
                  ? dnsMode === 'auto'
                  : dnsMode === 'custom' && dns1 === preset.p1;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    if (preset.id === 'auto') {
                      setDnsMode('auto');
                      setDns1('');
                      setDns2('');
                      void handleApplyConfig({ dns_mode: 'auto', dns_primary: '', dns_secondary: '' });
                    } else {
                      setDnsMode('custom');
                      setDns1(preset.p1);
                      setDns2(preset.p2);
                      void handleApplyConfig({
                        dns_mode: 'custom',
                        dns_primary: preset.p1,
                        dns_secondary: preset.p2,
                      });
                    }
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    active
                      ? 'border-sky-400/50 bg-sky-500/25 text-white'
                      : `${cardCls} opacity-80 hover:opacity-100`
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Full IPv4 & Custom DNS Settings */}
      {activeAdapter && showAdvanced && (
        <div className={`rounded-xl border p-2.5 space-y-2.5 ${cardCls}`}>
          {/* IPv4 Mode */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold flex items-center gap-1">
                <Server className="w-3 h-3 text-emerald-400" /> Настройка IPv4
              </span>
              <div className="inline-flex rounded-lg p-0.5 border border-white/10 bg-black/25">
                <button
                  type="button"
                  onClick={() => setIpMode('dhcp')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                    ipMode === 'dhcp' ? 'bg-emerald-500/30 text-white' : mutedCls
                  }`}
                >
                  Авто (DHCP)
                </button>
                <button
                  type="button"
                  onClick={() => setIpMode('static')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                    ipMode === 'static' ? 'bg-sky-500/30 text-white' : mutedCls
                  }`}
                >
                  Вручную (Статический)
                </button>
              </div>
            </div>

            {ipMode === 'static' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <input
                  type="text"
                  value={ipVal}
                  onChange={(e) => setIpVal(e.target.value)}
                  placeholder="IP (напр. 192.168.1.50)"
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none ${inputCls}`}
                />
                <input
                  type="text"
                  value={maskVal}
                  onChange={(e) => setMaskVal(e.target.value)}
                  placeholder="Маска (255.255.255.0)"
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none ${inputCls}`}
                />
                <input
                  type="text"
                  value={gwVal}
                  onChange={(e) => setGwVal(e.target.value)}
                  placeholder="Шлюз (192.168.1.1)"
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none ${inputCls}`}
                />
              </div>
            )}
          </div>

          {/* Custom DNS Inputs */}
          <div className="space-y-1.5 pt-1.5 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-sky-400" /> DNS-серверы
              </span>
              <div className="inline-flex rounded-lg p-0.5 border border-white/10 bg-black/25">
                <button
                  type="button"
                  onClick={() => setDnsMode('auto')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                    dnsMode === 'auto' ? 'bg-emerald-500/30 text-white' : mutedCls
                  }`}
                >
                  Авто DNS
                </button>
                <button
                  type="button"
                  onClick={() => setDnsMode('custom')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                    dnsMode === 'custom' ? 'bg-sky-500/30 text-white' : mutedCls
                  }`}
                >
                  Свои DNS
                </button>
              </div>
            </div>

            {dnsMode === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={dns1}
                  onChange={(e) => setDns1(e.target.value)}
                  placeholder="Основной DNS (напр. 1.1.1.1)"
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none ${inputCls}`}
                />
                <input
                  type="text"
                  value={dns2}
                  onChange={(e) => setDns2(e.target.value)}
                  placeholder="Запасной DNS (напр. 1.0.0.1)"
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none ${inputCls}`}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleQuickAction('renew')}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${cardCls}`}
              >
                <RotateCcw className="w-3 h-3" /> Обновить IP
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleQuickAction('flush_dns')}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${cardCls}`}
              >
                <RefreshCw className="w-3 h-3" /> Сброс DNS
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleQuickAction('open_ncpa')}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${cardCls}`}
              >
                <ExternalLink className="w-3 h-3" /> Адаптеры Windows
              </button>
            </div>

            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void handleApplyConfig()}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/35 to-sky-500/35 hover:from-emerald-500/50 hover:to-sky-500/50 border border-emerald-300/40 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {busy === 'config' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Применить настройки
            </button>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`px-2.5 py-2 rounded-xl text-[10.5px] font-medium border flex items-start gap-1.5 ${
            feedback.kind === 'ok'
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
              : 'bg-amber-500/15 border-amber-400/35 text-amber-200'
          }`}
        >
          {feedback.kind === 'ok' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
};
