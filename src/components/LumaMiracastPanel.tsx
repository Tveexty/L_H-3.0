import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Cast,
  Check,
  CheckCircle2,
  Columns2,
  Copy,
  Download,
  ExternalLink,
  KeyRound,
  Laptop,
  Loader2,
  Monitor,
  MonitorPlay,
  MousePointerClick,
  Power,
  QrCode,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tv,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  LumaSecondScreenReceiverModal,
  SecondScreenStatusPayload,
} from './LumaSecondScreenReceiverModal';

export interface MiracastStatusInfo {
  ok: boolean;
  wifi_available: boolean;
  miracast_supported: boolean;
  wireless_display_installed: boolean;
  adapter_name: string;
  active_display_mode: string;
  message: string;
  error?: string;
}

export interface MiracastActionResult {
  ok: boolean;
  action: string;
  message: string;
  missing_component?: boolean;
  no_wifi_miracast?: boolean;
  install_settings_uri?: string;
  active_display_mode?: string;
  error?: string;
}

export interface LumaMiracastPanelProps {
  mode?: 'full' | 'compact';
  onNotify?: (msg: string) => void;
  className?: string;
}

type DisplayModeId = 'clone' | 'extend' | 'internal' | 'external';
type StudioTabId = 'airdisplay' | 'monitors' | 'miracast';

export const LumaMiracastPanel: React.FC<LumaMiracastPanelProps> = ({
  mode = 'full',
  onNotify,
  className = '',
}) => {
  const [studioTab, setStudioTab] = useState<StudioTabId>('airdisplay');

  // Universal Luma AirDisplay 2.0 state (Works everywhere, zero Miracast required!)
  const [ssStatus, setSsStatus] = useState<SecondScreenStatusPayload | null>(null);
  const [ssBusy, setSsBusy] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [receiverOpen, setReceiverOpen] = useState(false);
  const [qrNonce, setQrNonce] = useState(() => Date.now());
  const [boardTitle, setBoardTitle] = useState('');
  const [boardNote, setBoardNote] = useState('');
  const [boardUrl, setBoardUrl] = useState('');
  const [boardInitialized, setBoardInitialized] = useState(false);

  // Native Windows Miracast & DisplaySwitch state
  const [status, setStatus] = useState<MiracastStatusInfo | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<DisplayModeId>('extend');
  const [feedback, setFeedback] = useState<{
    kind: 'info' | 'success' | 'warn' | 'error';
    text: string;
    showInstallBtn?: boolean;
  } | null>(null);

  const fetchSecondScreenStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/kernel/second-screen/status');
      if (res.ok) {
        const data: SecondScreenStatusPayload = await res.json();
        setSsStatus(data);
        if (!boardInitialized && data.workspace) {
          setBoardTitle(data.workspace.title || 'Расширенный стол Luma OS');
          setBoardNote(data.workspace.note || '');
          setBoardUrl(data.workspace.quick_url || '');
          setBoardInitialized(true);
        }
      }
    } catch {
      // Graceful fallback in web-only preview
    }
  }, [boardInitialized]);

  const fetchMiracastStatus = useCallback(async (forceRefresh = false) => {
    setLoadingStatus(true);
    try {
      const res = await fetch(
        `/api/kernel/miracast/status${forceRefresh ? '?refresh=1' : ''}`
      );
      if (res.ok) {
        const data: MiracastStatusInfo = await res.json();
        setStatus(data);
        if (
          data.active_display_mode === 'clone' ||
          data.active_display_mode === 'extend' ||
          data.active_display_mode === 'internal' ||
          data.active_display_mode === 'external'
        ) {
          setActiveMode(data.active_display_mode);
        }
      }
    } catch {
      // Fallback gracefully when running without Go kernel
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const refreshAll = useCallback(
    async (force = false) => {
      setQrNonce(Date.now());
      await Promise.all([fetchSecondScreenStatus(), fetchMiracastStatus(force)]);
    },
    [fetchMiracastStatus, fetchSecondScreenStatus]
  );

  useEffect(() => {
    void refreshAll(false);
  }, [refreshAll]);

  // Live poll while streaming or incoming stream active so FPS, viewers & clients stay fresh
  useEffect(() => {
    const active = Boolean(ssStatus?.config?.enabled || ssStatus?.incoming_active);
    const intervalMs = active ? 2500 : 7000;
    const t = window.setInterval(() => {
      void fetchSecondScreenStatus();
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [fetchSecondScreenStatus, ssStatus?.config?.enabled, ssStatus?.incoming_active]);

  const patchSecondScreenConfig = async (
    patch: Record<string, unknown>,
    notifyMsg?: string
  ) => {
    setSsBusy(true);
    try {
      const res = await fetch('/api/kernel/second-screen/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data: SecondScreenStatusPayload = await res.json();
        setSsStatus(data);
        if (patch.enabled === true) {
          setQrNonce(Date.now());
        }
        if (notifyMsg) {
          setFeedback({ kind: 'success', text: notifyMsg });
          onNotify?.(notifyMsg);
        }
      }
    } catch {
      const fallback = 'Сервер второго экрана Luma AirDisplay запускается в установленной Luma OS.';
      setFeedback({ kind: 'warn', text: fallback });
      onNotify?.(fallback);
    } finally {
      setSsBusy(false);
    }
  };

  const handleToggleStreaming = async () => {
    const next = !ssStatus?.config?.enabled;
    await patchSecondScreenConfig(
      { enabled: next },
      next
        ? 'Luma AirDisplay включён! Отсканируйте QR-код или откройте адрес на телефоне, планшете, ноутбуке или ТВ.'
        : 'Трансляция Luma AirDisplay остановлена.'
    );
  };

  const handleSaveWorkspace = async () => {
    setSsBusy(true);
    try {
      const res = await fetch('/api/kernel/second-screen/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: boardTitle.trim() || 'Расширенный стол Luma OS',
          note: boardNote,
          quick_url: boardUrl.trim(),
          show_clock: true,
          show_metrics: true,
          pinned_cards: ['clock', 'telemetry', 'note', 'media'],
        }),
      });
      if (res.ok) {
        const msg = 'Обновлено содержимое Виртуального 2-го стола!';
        setFeedback({ kind: 'success', text: msg });
        onNotify?.(msg);
        await fetchSecondScreenStatus();
      }
    } catch {
      onNotify?.('Не удалось обновить виртуальный стол.');
    } finally {
      setSsBusy(false);
    }
  };

  const handleCopyViewerUrl = async () => {
    const url = ssStatus?.viewer_url || '';
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      onNotify?.('Адрес 2-го экрана скопирован в буфер обмена!');
      window.setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      onNotify?.(url);
    }
  };

  // Native Windows Miracast handlers
  const handleCastSource = async () => {
    setBusyAction('cast');
    setFeedback(null);
    try {
      const res = await fetch('/api/kernel/miracast/cast', { method: 'POST' });
      const data: MiracastActionResult = await res.json();
      if (data.ok) {
        setFeedback({ kind: 'success', text: data.message });
        onNotify?.(data.message);
      } else {
        setFeedback({
          kind: 'warn',
          text:
            (data.message || 'Не удалось открыть панель Windows Cast.') +
            ' Используйте вкладку «Luma AirDisplay» — она работает без Wi-Fi Miracast!',
          showInstallBtn: Boolean(data.missing_component),
        });
        onNotify?.(data.message);
      }
    } catch {
      const fallback = 'Функция Windows Miracast работает на Windows 10/11.';
      setFeedback({ kind: 'warn', text: fallback });
      onNotify?.(fallback);
    } finally {
      setBusyAction(null);
    }
  };

  const handleReceiveDisplay = async () => {
    setBusyAction('receive');
    setFeedback(null);
    try {
      const res = await fetch('/api/kernel/miracast/receive', { method: 'POST' });
      const data: MiracastActionResult = await res.json();
      if (data.ok) {
        setFeedback({ kind: 'success', text: data.message });
        onNotify?.(data.message);
      } else {
        setFeedback({
          kind: 'warn',
          text:
            data.message ||
            'Компонент Windows «Беспроводной дисплей» не установлен. Вы можете установить его кнопкой ниже или включить Luma AirDisplay Приёмник (работает сразу!).',
          showInstallBtn: Boolean(data.missing_component || data.install_settings_uri),
        });
        onNotify?.(data.message);
      }
    } catch {
      const fallback = 'Приём Miracast доступен на Windows 10/11 с Wi-Fi Miracast.';
      setFeedback({ kind: 'warn', text: fallback, showInstallBtn: true });
      onNotify?.(fallback);
    } finally {
      setBusyAction(null);
    }
  };

  const handleInstallWirelessDisplay = async () => {
    setBusyAction('install_dism');
    setFeedback(null);
    try {
      const res = await fetch('/api/kernel/miracast/install-wireless-display', {
        method: 'POST',
      });
      const data: MiracastActionResult = await res.json();
      setFeedback({
        kind: data.ok ? 'success' : 'warn',
        text: data.message,
        showInstallBtn: !data.ok,
      });
      onNotify?.(data.message);
    } catch {
      onNotify?.('Установка компонента «Беспроводной дисплей» доступна на Windows 10/11.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenProjectSettings = async () => {
    setBusyAction('settings');
    try {
      const res = await fetch('/api/kernel/miracast/open-project-settings', {
        method: 'POST',
      });
      const data: MiracastActionResult = await res.json();
      setFeedback({
        kind: data.ok ? 'info' : 'warn',
        text: data.message,
      });
      onNotify?.(data.message);
    } catch {
      onNotify?.('Откройте «Параметры Windows → Система → Проецирование на этот компьютер».');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSwitchMode = async (target: DisplayModeId) => {
    setBusyAction(`mode_${target}`);
    try {
      const res = await fetch('/api/kernel/miracast/display-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: target }),
      });
      const data: MiracastActionResult = await res.json();
      if (data.ok) {
        setActiveMode(target);
        setFeedback({ kind: 'success', text: data.message });
        onNotify?.(data.message);
      } else {
        setFeedback({ kind: 'warn', text: data.message });
        onNotify?.(data.message);
      }
    } catch {
      setActiveMode(target);
      onNotify?.('Переключение режима экрана доступно на Windows.');
    } finally {
      setBusyAction(null);
    }
  };

  const compact = mode === 'compact';
  const streamingOn = Boolean(ssStatus?.config?.enabled);
  const ssMonitors = ssStatus?.monitors || [];
  const connectedClients = ssStatus?.connected_clients || [];
  const currentMonitorMode = ssStatus?.config?.monitor_mode || 'primary';
  const currentFps = ssStatus?.config?.fps || 60;
  const currentWidth = ssStatus?.config?.max_width ?? 1600;
  const currentQuality = ssStatus?.config?.quality || 86;
  const bitrateMbps = ((ssStatus?.bitrate_kbps || 0) / 1000).toFixed(1);
  const allowInput = ssStatus?.config?.allow_input ?? true;
  const requirePin = ssStatus?.config?.require_pin ?? false;
  const currentPin = ssStatus?.config?.pin || '----';
  const viewerUrl =
    ssStatus?.viewer_url || `http://${ssStatus?.lan_ip || '127.0.0.1'}:49225/`;

  const modeButtons: {
    id: DisplayModeId;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'clone', label: 'Дублировать', icon: <Copy className="w-3.5 h-3.5" /> },
    { id: 'extend', label: 'Расширить', icon: <Columns2 className="w-3.5 h-3.5" /> },
    { id: 'internal', label: 'Только ПК', icon: <Laptop className="w-3.5 h-3.5" /> },
    { id: 'external', label: 'Только 2-й', icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  const sourceOptions: { id: string; label: string }[] = [
    { id: 'primary', label: 'Основной экран' },
    ...ssMonitors.map((m, idx) => ({
      id: `mon_${idx + 1}`,
      label: `Монитор ${idx + 1} (${m.width}×${m.height})`,
    })),
    { id: 'right_half', label: 'Правая половина (Сплит)' },
    { id: 'left_half', label: 'Левая половина (Сплит)' },
    ...(ssMonitors.length > 1 ? [{ id: 'all', label: 'Все мониторы вместе' }] : []),
    { id: 'virtual_board', label: 'Виртуальный стол Luma' },
  ];

  return (
    <>
      <div
        className={`rounded-[22px] border border-white/12 bg-gradient-to-br from-white/[0.06] via-emerald-500/[0.03] to-indigo-500/[0.06] backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] ${
          compact ? 'p-3.5 space-y-3' : 'p-4 space-y-3.5'
        } ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400/25 via-cyan-400/20 to-indigo-500/30 border border-emerald-300/25 flex items-center justify-center text-emerald-200 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Cast className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-white tracking-tight truncate flex items-center gap-1.5">
                <span>Второй экран · Luma AirDisplay</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-400/20 border border-emerald-300/30 text-emerald-200">
                  1.8.2b
                </span>
              </div>
              <div className="text-[10px] text-white/60 truncate">
                Работает везде без Miracast и драйверов · Wi-Fi / LAN / Hotspot / USB
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll(true)}
            disabled={loadingStatus}
            title="Обновить состояние экранов и сети"
            className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.06] hover:bg-white/[0.14] text-white/75 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Live Readiness Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-semibold ${
              ssStatus?.server_up !== false
                ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                : 'border-amber-400/35 bg-amber-500/15 text-amber-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            {ssStatus?.server_up !== false
              ? `AirDisplay готов · ${ssStatus?.lan_ip || 'Локальная сеть'}:${ssStatus?.port || 49225}`
              : 'Запуск сервера...'}
          </span>

          {streamingOn && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-cyan-400/35 bg-cyan-500/15 text-cyan-100 font-semibold">
              <Radio className="w-3 h-3 animate-pulse text-cyan-300" />
              В эфире · {Math.round(ssStatus?.actual_fps || 0)} FPS · Экранов:{' '}
              {ssStatus?.viewers_count || connectedClients.length}
            </span>
          )}

          {ssStatus?.incoming_active && (
            <button
              type="button"
              onClick={() => setReceiverOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-violet-400/40 bg-violet-500/20 text-violet-100 font-semibold hover:bg-violet-500/30"
            >
              <MonitorPlay className="w-3 h-3" />
              Входящий экран: {ssStatus.incoming_sender}
            </button>
          )}
        </div>

        {/* 3-Tab Studio Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl border border-white/10 bg-black/30">
          <button
            type="button"
            onClick={() => setStudioTab('airdisplay')}
            className={`px-2 py-1.5 rounded-xl text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 ${
              studioTab === 'airdisplay'
                ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/25 border border-emerald-300/35 text-white shadow-sm'
                : 'text-white/65 hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3 shrink-0" />
            <span className="truncate">AirDisplay</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('monitors')}
            className={`px-2 py-1.5 rounded-xl text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 ${
              studioTab === 'monitors'
                ? 'bg-gradient-to-r from-sky-500/30 to-indigo-500/25 border border-sky-300/35 text-white shadow-sm'
                : 'text-white/65 hover:text-white'
            }`}
          >
            <Monitor className="w-3 h-3 shrink-0" />
            <span className="truncate">Мониторы ({ssMonitors.length || 1})</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('miracast')}
            className={`px-2 py-1.5 rounded-xl text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 ${
              studioTab === 'miracast'
                ? 'bg-gradient-to-r from-violet-500/30 to-fuchsia-500/25 border border-violet-300/35 text-white shadow-sm'
                : 'text-white/65 hover:text-white'
            }`}
          >
            <Wifi className="w-3 h-3 shrink-0" />
            <span className="truncate">Miracast</span>
          </button>
        </div>

        {/* ==================== TAB 1: UNIVERSAL LUMA AIRDISPLAY (WORKS EVERYWHERE!) ==================== */}
        {studioTab === 'airdisplay' && (
          <div className="space-y-3">
            {/* Two Main Universal Mode Tiles */}
            <div
              className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
            >
              {/* Tile 1: Broadcast THIS PC to ANY phone / tablet / laptop / TV */}
              <button
                type="button"
                onClick={() => void handleToggleStreaming()}
                disabled={ssBusy}
                className={`group relative overflow-hidden text-left rounded-[18px] p-3.5 border transition-all active:scale-[0.985] disabled:opacity-60 ${
                  streamingOn
                    ? 'border-emerald-300/50 bg-gradient-to-br from-emerald-500/30 via-cyan-500/20 to-teal-500/20 shadow-[0_8px_28px_rgba(16,185,129,0.26)]'
                    : 'border-sky-300/25 bg-gradient-to-br from-sky-500/20 via-cyan-500/12 to-indigo-500/15 hover:from-sky-500/30 hover:to-indigo-500/25 shadow-[0_6px_22px_rgba(14,165,233,0.16)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform ${
                      streamingOn
                        ? 'bg-emerald-400/25 border-emerald-300/40 text-emerald-100'
                        : 'bg-sky-400/20 border-sky-300/30 text-sky-200'
                    }`}
                  >
                    {ssBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      streamingOn
                        ? 'bg-emerald-400/25 border-emerald-300/45 text-emerald-100'
                        : 'bg-sky-400/15 border-sky-300/25 text-sky-200'
                    }`}
                  >
                    {streamingOn ? '● Активно · Стоп' : 'Источник · Старт'}
                  </span>
                </div>
                <div className="text-[12.5px] font-extrabold text-white leading-tight">
                  {streamingOn
                    ? 'Трансляция идёт — выключить'
                    : 'Вывести этот ПК на 2-й экран'}
                </div>
                <div className="text-[10.5px] text-white/65 mt-1 leading-snug">
                  Превратите любой телефон, планшет, iPad, ноутбук, Mac или Smart TV во второй экран с управлением.
                </div>
              </button>

              {/* Tile 2: Turn THIS PC into a 2nd Screen Receiver (ZERO Miracast!) */}
              <button
                type="button"
                onClick={() => setReceiverOpen(true)}
                className="group relative overflow-hidden text-left rounded-[18px] p-3.5 border border-violet-300/30 bg-gradient-to-br from-violet-500/22 via-fuchsia-500/12 to-sky-500/15 hover:from-violet-500/32 hover:to-sky-500/25 active:scale-[0.985] transition-all shadow-[0_6px_22px_rgba(139,92,246,0.16)]"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="w-8 h-8 rounded-xl bg-violet-400/20 border border-violet-300/30 flex items-center justify-center text-violet-200 group-hover:scale-105 transition-transform">
                    <MonitorPlay className="w-4 h-4" />
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-400/20 border border-violet-300/30 text-violet-100">
                    Приёмник · Без Miracast
                  </span>
                </div>
                <div className="text-[12.5px] font-extrabold text-white leading-tight">
                  Сделать этот ПК 2-м экраном
                </div>
                <div className="text-[10.5px] text-white/65 mt-1 leading-snug">
                  Принимает экран с телефона, ноутбука, Mac или другого ПК с Luma OS по QR-коду на весь экран!
                </div>
              </button>
            </div>

            {/* Active Stream QR + Controls Panel */}
            {streamingOn && (
              <div className="rounded-2xl border border-emerald-400/25 bg-black/35 p-3 space-y-3">
                {/* QR + Link + Live Metrics */}
                <div
                  className={`grid gap-3 items-center ${
                    compact ? 'grid-cols-1' : 'grid-cols-[126px_1fr]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-[118px] h-[118px] rounded-xl bg-white p-1.5 shadow-lg flex items-center justify-center">
                      <img
                        src={`/api/kernel/second-screen/qr.svg?mode=view&t=${qrNonce}`}
                        alt="QR-код второго экрана Luma AirDisplay"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-emerald-200/80 font-semibold inline-flex items-center gap-1">
                      <QrCode className="w-3 h-3" />
                      Сканируй камерой
                    </span>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <div className="text-[11px] font-bold text-white/90">
                      Откройте на 2-м устройстве в любом браузере:
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/45 px-2.5 py-1.5">
                      <code className="text-[11px] font-mono text-emerald-200 truncate flex-1 select-text">
                        {viewerUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => void handleCopyViewerUrl()}
                        className="px-2 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-300/30 text-[10px] font-bold text-emerald-50 inline-flex items-center gap-1 shrink-0"
                      >
                        {copiedUrl ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedUrl ? 'OK' : 'Копировать'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[10px] text-white/70">
                      <span className="px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/10">
                        {ssStatus?.stream_width || (currentWidth || 1920)}×{ssStatus?.stream_height || 1080}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/25 text-emerald-100 font-bold">
                        {Math.round(ssStatus?.actual_fps || 0)} / {currentFps} FPS
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-400/25 text-sky-100 font-bold">
                        {bitrateMbps} Мбит/с · Q{currentQuality}
                      </span>
                      {requirePin && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-300/35 text-amber-100 font-bold">
                          PIN: {currentPin}
                        </span>
                      )}
                    </div>

                    {connectedClients.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {connectedClients.map((cl) => (
                          <span
                            key={cl.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[9.5px] font-semibold text-emerald-100"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {cl.device_name} ({cl.ip})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Source / Region Selector */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <div className="text-[10.5px] font-bold text-white/75">
                    Что транслировать на второй экран:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sourceOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          void patchSecondScreenConfig({ monitor_mode: opt.id })
                        }
                        className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold border transition-all ${
                          currentMonitorMode === opt.id
                            ? 'border-emerald-300/45 bg-emerald-500/25 text-white'
                            : 'border-white/10 bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.11]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Virtual Extended Luma Board Quick Editor */}
                {currentMonitorMode === 'virtual_board' && (
                  <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-2.5 space-y-2">
                    <div className="text-[10.5px] font-bold text-cyan-100">
                      Виртуальный расширенный стол — отправьте заметку или ссылку на 2-й экран:
                    </div>
                    <input
                      type="text"
                      value={boardTitle}
                      onChange={(e) => setBoardTitle(e.target.value)}
                      placeholder="Заголовок доски"
                      className="w-full rounded-lg bg-black/40 border border-white/15 px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-cyan-400/50"
                    />
                    <textarea
                      rows={2}
                      value={boardNote}
                      onChange={(e) => setBoardNote(e.target.value)}
                      placeholder="Текст заметки, список задач или конспект для 2-го экрана..."
                      className="w-full rounded-lg bg-black/40 border border-white/15 px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-cyan-400/50 resize-none"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={boardUrl}
                        onChange={(e) => setBoardUrl(e.target.value)}
                        placeholder="Быстрая ссылка (https://...)"
                        className="flex-1 rounded-lg bg-black/40 border border-white/15 px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-cyan-400/50"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveWorkspace()}
                        disabled={ssBusy}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/30 hover:bg-cyan-500/45 border border-cyan-300/40 text-[11px] font-bold text-white inline-flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        Показать
                      </button>
                    </div>
                  </div>
                )}

                {/* Stream Quality, Bitrate, FPS & Resolution Controls */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-white/60">
                        Частота кадров (Turbo 60 FPS)
                      </div>
                      <div className="flex gap-1">
                        {[24, 30, 45, 60].map((fps) => (
                          <button
                            key={fps}
                            type="button"
                            onClick={() => void patchSecondScreenConfig({ fps })}
                            className={`flex-1 py-1 rounded-lg text-[10.5px] font-bold border ${
                              currentFps === fps
                                ? 'border-emerald-300/50 bg-emerald-500/25 text-white'
                                : 'border-white/10 bg-white/[0.04] text-white/65 hover:text-white'
                            }`}
                          >
                            {fps}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-white/60">Разрешение</div>
                      <div className="flex gap-1">
                        {[
                          { w: 1280, label: '720p' },
                          { w: 1600, label: '900p' },
                          { w: 1920, label: '1080p' },
                          { w: 0, label: 'Натив' },
                        ].map((resOpt) => (
                          <button
                            key={resOpt.w}
                            type="button"
                            onClick={() =>
                              void patchSecondScreenConfig({ max_width: resOpt.w })
                            }
                            className={`flex-1 py-1 rounded-lg text-[10.5px] font-bold border ${
                              currentWidth === resOpt.w
                                ? 'border-sky-300/45 bg-sky-500/25 text-white'
                                : 'border-white/10 bg-white/[0.04] text-white/65 hover:text-white'
                            }`}
                          >
                            {resOpt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-white/60">Битрейт и чёткость картинки</span>
                      <span className="text-sky-200/85 font-mono">{bitrateMbps} Мбит/с</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { q: 72, label: 'Эконом' },
                        { q: 86, label: 'Высокий' },
                        { q: 93, label: 'Макс HD' },
                        { q: 96, label: 'Ультра' },
                      ].map((qOpt) => {
                        const isSel = Math.abs(currentQuality - qOpt.q) <= 3;
                        return (
                          <button
                            key={qOpt.q}
                            type="button"
                            onClick={() =>
                              void patchSecondScreenConfig({ quality: qOpt.q })
                            }
                            className={`py-1 rounded-lg text-[10.5px] font-bold border ${
                              isSel
                                ? 'border-cyan-300/50 bg-cyan-500/25 text-white'
                                : 'border-white/10 bg-white/[0.04] text-white/65 hover:text-white'
                            }`}
                          >
                            {qOpt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Security & Remote Input Toggles */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      void patchSecondScreenConfig({ allow_input: !allowInput })
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold border transition-colors ${
                      allowInput
                        ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100'
                        : 'border-white/12 bg-white/[0.04] text-white/60'
                    }`}
                  >
                    <MousePointerClick className="w-3.5 h-3.5" />
                    Управление с 2-го экрана: {allowInput ? 'ВКЛ' : 'ВЫКЛ'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void patchSecondScreenConfig({ require_pin: !requirePin })
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold border transition-colors ${
                      requirePin
                        ? 'border-amber-400/35 bg-amber-500/15 text-amber-100'
                        : 'border-white/12 bg-white/[0.04] text-white/60'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    PIN-защита: {requirePin ? currentPin : 'ВЫКЛ'}
                  </button>

                  {requirePin && (
                    <button
                      type="button"
                      onClick={() =>
                        void patchSecondScreenConfig(
                          { regenerate_pin: true },
                          'Сгенерирован новый 4-значный PIN!'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-bold border border-white/12 bg-white/[0.06] hover:bg-white/[0.12] text-white/80"
                      title="Обновить PIN-код"
                    >
                      <KeyRound className="w-3 h-3" />
                      Новый PIN
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Help Footer when idle */}
            {!streamingOn && (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[10.5px] text-white/65 leading-relaxed">
                <b className="text-emerald-200">Совет:</b> работает даже на ПК без Wi-Fi карты (через обычный кабель роутера или USB-модем телефона). Никаких сторонних программ на телефоне или втором ноутбуке не нужно — достаточно браузера!
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: MONITORS & WINDOWS PROJECTION ==================== */}
        {studioTab === 'monitors' && (
          <div className="space-y-3">
            {/* Detected Physical / Virtual Monitors */}
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white/80">
                  Обнаруженные дисплеи ({ssMonitors.length || 1})
                </span>
                <span className="text-[9.5px] text-white/45">Windows HAL</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(ssMonitors.length > 0
                  ? ssMonitors
                  : [{ index: 1, name: 'Основной экран', x: 0, y: 0, width: 1920, height: 1080, primary: true }]
                ).map((m, idx) => (
                  <div
                    key={`${m.name}_${idx}`}
                    className={`rounded-xl border p-2.5 flex items-center gap-2.5 ${
                      m.primary
                        ? 'border-sky-400/35 bg-sky-500/12'
                        : 'border-white/12 bg-white/[0.04]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-black/35 border border-white/15 flex items-center justify-center text-sky-200 font-extrabold text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-extrabold text-white truncate">
                        Экран {idx + 1} {m.primary ? '· Основной' : ''}
                      </div>
                      <div className="text-[10px] text-white/60">
                        {m.width} × {m.height} · Позиция ({m.x}, {m.y})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DisplaySwitch Mode Switcher */}
            <div className="rounded-2xl border border-white/10 bg-black/25 p-2.5 space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10.5px] font-bold text-white/75">
                  Режим работы подключённых мониторов (Win + P)
                </span>
                <span className="text-[9.5px] text-white/45">HDMI / DP / Miracast</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {modeButtons.map((btn) => {
                  const isSelected = activeMode === btn.id;
                  const isBusy = busyAction === `mode_${btn.id}`;
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => void handleSwitchMode(btn.id)}
                      disabled={busyAction !== null}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                        isSelected
                          ? 'border-sky-300/45 bg-sky-400/25 text-white shadow-[0_0_14px_rgba(56,189,248,0.22)]'
                          : 'border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.11] hover:text-white'
                      }`}
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : btn.icon}
                      <span className="truncate">{btn.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: NATIVE WINDOWS MIRACAST (ENHANCED) ==================== */}
        {studioTab === 'miracast' && (
          <div className="space-y-3">
            {/* Native Miracast Status Chips */}
            {status && (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-semibold ${
                    status.miracast_supported
                      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                      : 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                  }`}
                >
                  {status.miracast_supported ? (
                    <Wifi className="w-3 h-3" />
                  ) : (
                    <WifiOff className="w-3 h-3" />
                  )}
                  {status.miracast_supported
                    ? `Miracast поддерживается (${status.adapter_name || 'Wi-Fi'})`
                    : 'Нет Wi-Fi Miracast (используйте AirDisplay!)'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-semibold ${
                    status.wireless_display_installed
                      ? 'border-sky-400/30 bg-sky-500/15 text-sky-200'
                      : 'border-white/15 bg-white/[0.06] text-white/65'
                  }`}
                >
                  {status.wireless_display_installed ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-300" />
                  )}
                  {status.wireless_display_installed
                    ? 'Приёмник Windows установлен'
                    : 'Приёмник Windows не установлен'}
                </span>
              </div>
            )}

            <div
              className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
            >
              {/* Source: Win + K */}
              <button
                type="button"
                onClick={() => void handleCastSource()}
                disabled={busyAction !== null}
                className="group relative overflow-hidden text-left rounded-[18px] p-3.5 border border-sky-300/25 bg-gradient-to-br from-sky-500/20 via-cyan-500/12 to-indigo-500/15 hover:from-sky-500/30 hover:to-indigo-500/25 active:scale-[0.985] transition-all disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="w-8 h-8 rounded-xl bg-sky-400/20 border border-sky-300/30 flex items-center justify-center text-sky-200">
                    {busyAction === 'cast' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Tv className="w-4 h-4" />
                    )}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-400/15 border border-sky-300/25 text-sky-200">
                    Windows Cast · Win+K
                  </span>
                </div>
                <div className="text-[12.5px] font-extrabold text-white leading-tight">
                  Транслировать по Miracast
                </div>
                <div className="text-[10.5px] text-white/65 mt-1 leading-snug">
                  Открывает стандартную панель Windows для Smart TV и дисплеев с Miracast.
                </div>
              </button>

              {/* Receiver: PPIProjection */}
              <button
                type="button"
                onClick={() => void handleReceiveDisplay()}
                disabled={busyAction !== null}
                className="group relative overflow-hidden text-left rounded-[18px] p-3.5 border border-violet-300/25 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-sky-500/15 hover:from-violet-500/30 hover:to-sky-500/25 active:scale-[0.985] transition-all disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="w-8 h-8 rounded-xl bg-violet-400/20 border border-violet-300/30 flex items-center justify-center text-violet-200">
                    {busyAction === 'receive' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MonitorPlay className="w-4 h-4" />
                    )}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-400/15 border border-violet-300/25 text-violet-200">
                    Miracast Приёмник
                  </span>
                </div>
                <div className="text-[12.5px] font-extrabold text-white leading-tight">
                  Запустить «Беспроводной дисплей»
                </div>
                <div className="text-[10.5px] text-white/65 mt-1 leading-snug">
                  Запускает встроенное приложение Windows для приёма Miracast.
                </div>
              </button>
            </div>

            {/* 1-Click DISM Installer & Projection Settings */}
            {status && !status.wireless_display_installed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleInstallWirelessDisplay()}
                  disabled={busyAction !== null}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-300/35 text-emerald-100 font-bold text-[11px] transition-colors disabled:opacity-60"
                >
                  {busyAction === 'install_dism' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Установить «Беспроводной дисплей» (1 клик)
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenProjectSettings()}
                  disabled={busyAction !== null}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-white/85 font-bold text-[11px] transition-colors disabled:opacity-60"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Параметры проецирования Windows
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`rounded-2xl border px-3 py-2.5 text-[11px] leading-relaxed space-y-2 ${
              feedback.kind === 'success'
                ? 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100'
                : feedback.kind === 'warn' || feedback.kind === 'error'
                ? 'border-amber-400/35 bg-amber-500/14 text-amber-100'
                : 'border-sky-400/30 bg-sky-500/12 text-sky-100'
            }`}
          >
            <div className="flex items-start gap-2">
              {feedback.kind === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
            {feedback.showInstallBtn && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleInstallWirelessDisplay()}
                  disabled={busyAction !== null}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-300/40 text-emerald-50 font-bold text-[11px] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Установить в 1 клик
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenProjectSettings()}
                  disabled={busyAction !== null}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400/25 hover:bg-amber-400/35 border border-amber-300/40 text-amber-50 font-bold text-[11px] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Параметры Windows
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Built-in Fullscreen Second Screen Receiver Modal (Zero Miracast needed!) */}
      <LumaSecondScreenReceiverModal
        open={receiverOpen}
        onClose={() => setReceiverOpen(false)}
        initialStatus={ssStatus}
        onNotify={onNotify}
      />
    </>
  );
};
