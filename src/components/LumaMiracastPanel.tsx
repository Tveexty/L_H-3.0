import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Cast,
  CheckCircle2,
  Columns2,
  Copy,
  ExternalLink,
  Laptop,
  Loader2,
  Monitor,
  MonitorPlay,
  RefreshCw,
  Tv,
  Wifi,
  WifiOff,
} from 'lucide-react';

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

export const LumaMiracastPanel: React.FC<LumaMiracastPanelProps> = ({
  mode = 'full',
  onNotify,
  className = '',
}) => {
  const [status, setStatus] = useState<MiracastStatusInfo | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<DisplayModeId>('extend');
  const [feedback, setFeedback] = useState<{
    kind: 'info' | 'success' | 'warn' | 'error';
    text: string;
    showInstallBtn?: boolean;
  } | null>(null);

  const fetchStatus = useCallback(async (forceRefresh = false) => {
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
      // Fallback gracefully when running in web preview without Go kernel
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus(false);
  }, [fetchStatus]);

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
          text: data.message || 'Не удалось открыть панель беспроводного подключения.',
          showInstallBtn: Boolean(data.missing_component),
        });
        onNotify?.(data.message);
      }
    } catch {
      const fallback = 'Функция Miracast работает в установленной версии Luma OS на Windows.';
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
            'Компонент Windows «Беспроводной дисплей» не установлен. Установите его в параметрах Windows.',
          showInstallBtn: Boolean(data.missing_component || data.install_settings_uri),
        });
        onNotify?.(data.message);
      }
    } catch {
      const fallback = 'Приём беспроводного экрана доступен на ПК с Windows и Wi-Fi Miracast.';
      setFeedback({ kind: 'warn', text: fallback, showInstallBtn: true });
      onNotify?.(fallback);
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

  const modeButtons: {
    id: DisplayModeId;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'clone',
      label: 'Дублировать',
      shortLabel: 'Дублировать',
      icon: <Copy className="w-3.5 h-3.5" />,
    },
    {
      id: 'extend',
      label: 'Расширить',
      shortLabel: 'Расширить',
      icon: <Columns2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'internal',
      label: 'Только ПК',
      shortLabel: 'Только ПК',
      icon: <Laptop className="w-3.5 h-3.5" />,
    },
    {
      id: 'external',
      label: 'Только 2-й',
      shortLabel: 'Только 2-й',
      icon: <Monitor className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div
      className={`rounded-[22px] border border-white/12 bg-gradient-to-br from-white/[0.06] via-sky-500/[0.04] to-indigo-500/[0.06] backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] ${
        compact ? 'p-3.5 space-y-3' : 'p-4 space-y-3.5'
      } ${className}`}
    >
      {/* Header + Live Hardware Readiness Pills */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400/25 via-cyan-400/20 to-indigo-500/30 border border-sky-300/25 flex items-center justify-center text-sky-200 shrink-0 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            <Cast className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold text-white tracking-tight truncate">
              Беспроводной 2-й экран (Miracast)
            </div>
            <div className="text-[10px] text-white/55 truncate">
              {status?.adapter_name && status.adapter_name !== 'Не обнаружен'
                ? status.adapter_name
                : 'Подключение телевизора, монитора или другого ПК без проводов'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void fetchStatus(true)}
          disabled={loadingStatus}
          title="Обновить проверку Wi-Fi и компонента «Беспроводной дисплей»"
          className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.06] hover:bg-white/[0.14] text-white/75 hover:text-white flex items-center justify-center transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status chips */}
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
            {status.miracast_supported ? 'Miracast поддерживается' : 'Нет Wi-Fi Miracast'}
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
              ? 'Приёмник установлен'
              : 'Приёмник не установлен'}
          </span>
        </div>
      )}

      {/* Two Primary Material 3 / Liquid Glass Action Tiles */}
      <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {/* Mode 1: Source */}
        <button
          type="button"
          onClick={() => void handleCastSource()}
          disabled={busyAction !== null}
          className="group relative overflow-hidden text-left rounded-[18px] p-3.5 border border-sky-300/25 bg-gradient-to-br from-sky-500/20 via-cyan-500/12 to-indigo-500/15 hover:from-sky-500/30 hover:to-indigo-500/25 active:scale-[0.985] transition-all shadow-[0_6px_22px_rgba(14,165,233,0.16)] disabled:opacity-60"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="w-8 h-8 rounded-xl bg-sky-400/20 border border-sky-300/30 flex items-center justify-center text-sky-200 group-hover:scale-105 transition-transform">
              {busyAction === 'cast' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Tv className="w-4 h-4" />
              )}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-400/15 border border-sky-300/25 text-sky-200">
              Источник · Win+K
            </span>
          </div>
          <div className="text-[12.5px] font-extrabold text-white leading-tight">
            Транслировать на другой экран
          </div>
          <div className="text-[10.5px] text-white/65 mt-1 leading-snug">
            Открывает панель беспроводных дисплеев Windows для вывода на ТВ или монитор.
          </div>
        </button>

        {/* Mode 2: Receiver */}
        <button
          type="button"
          onClick={() => void handleReceiveDisplay()}
          disabled={busyAction !== null}
          className="group relative overflow-hidden text-left rounded-[18px] p-3.5 border border-violet-300/25 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-sky-500/15 hover:from-violet-500/30 hover:to-sky-500/25 active:scale-[0.985] transition-all shadow-[0_6px_22px_rgba(139,92,246,0.15)] disabled:opacity-60"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="w-8 h-8 rounded-xl bg-violet-400/20 border border-violet-300/30 flex items-center justify-center text-violet-200 group-hover:scale-105 transition-transform">
              {busyAction === 'receive' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MonitorPlay className="w-4 h-4" />
              )}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-400/15 border border-violet-300/25 text-violet-200">
              Приёмник
            </span>
          </div>
          <div className="text-[12.5px] font-extrabold text-white leading-tight">
            Сделать этот ПК экраном
          </div>
          <div className="text-[10.5px] text-white/65 mt-1 leading-snug">
            Запускает встроенный «Беспроводной дисплей», чтобы транслировать с телефона или ПК.
          </div>
        </button>
      </div>

      {/* Mode 3: Display Switcher (Дублировать / Расширить / Только ПК / Только 2-й) */}
      <div className="rounded-2xl border border-white/10 bg-black/25 p-2.5 space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10.5px] font-bold text-white/75">
            Режим работы второго экрана
          </span>
          <span className="text-[9.5px] text-white/45">
            После подключения
          </span>
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
                <span className="truncate">{compact ? btn.shortLabel : btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback / Missing Component Alert Banner */}
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
            <button
              type="button"
              onClick={() => void handleOpenProjectSettings()}
              disabled={busyAction !== null}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400/25 hover:bg-amber-400/35 border border-amber-300/40 text-amber-50 font-bold text-[11px] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Открыть «Проецирование на этот компьютер»
            </button>
          )}
        </div>
      )}
    </div>
  );
};
