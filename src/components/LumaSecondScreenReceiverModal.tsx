import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  Keyboard,
  Laptop,
  Maximize2,
  Minimize2,
  MonitorPlay,
  MousePointerClick,
  QrCode,
  Radio,
  RefreshCw,
  RotateCw,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react';

export interface SecondScreenMonitorInfo {
  index: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  primary: boolean;
}

export interface SecondScreenPeerInfo {
  host: string;
  ip: string;
  port: number;
  streaming: boolean;
  receiving: boolean;
  monitors: number;
  last_seen: number;
}

export interface SecondScreenClientItem {
  id: string;
  ip: string;
  user_agent: string;
  device_name: string;
  connected: string;
  last_seen: number;
}

export interface SecondScreenWorkspaceInfo {
  title: string;
  note: string;
  quick_url: string;
  show_clock: boolean;
  show_metrics: boolean;
  pinned_cards: string[];
  updated_at: number;
}

export interface SecondScreenConfigInfo {
  enabled: boolean;
  monitor_mode: string;
  fps: number;
  max_width: number;
  quality: number;
  allow_input: boolean;
  require_pin: boolean;
  pin: string;
  receiver_open: boolean;
}

export interface SecondScreenStatusPayload {
  ok: boolean;
  server_up: boolean;
  listen_error?: string;
  host: string;
  lan_ip: string;
  port: number;
  viewer_url: string;
  sender_url: string;
  config: SecondScreenConfigInfo;
  monitors: SecondScreenMonitorInfo[];
  actual_fps: number;
  bitrate_kbps: number;
  stream_width: number;
  stream_height: number;
  connected_clients: SecondScreenClientItem[];
  viewers_count: number;
  incoming_active: boolean;
  incoming_sender: string;
  incoming_ip: string;
  incoming_fps: number;
  incoming_seq: number;
  peers: SecondScreenPeerInfo[];
  workspace: SecondScreenWorkspaceInfo;
  os: string;
}

interface LumaSecondScreenReceiverModalProps {
  open: boolean;
  onClose: () => void;
  initialStatus?: SecondScreenStatusPayload | null;
  onNotify?: (msg: string) => void;
}

export const LumaSecondScreenReceiverModal: React.FC<LumaSecondScreenReceiverModalProps> = ({
  open,
  onClose,
  initialStatus = null,
  onNotify,
}) => {
  const [status, setStatus] = useState<SecondScreenStatusPayload | null>(initialStatus);
  const [tab, setTab] = useState<'qr' | 'peer'>('qr');
  const [remoteHost, setRemoteHost] = useState('');
  const [remotePin, setRemotePin] = useState('');
  const [connectedHost, setConnectedHost] = useState<string | null>(null);
  const [connectedPin, setConnectedPin] = useState('');
  const [controlEnabled, setControlEnabled] = useState(true);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showQrOverlay, setShowQrOverlay] = useState(false);
  const [kbdText, setKbdText] = useState('');
  const [showKbdBar, setShowKbdBar] = useState(false);
  const [streamNonce, setStreamNonce] = useState(() => Date.now());
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const remoteImgRef = useRef<HTMLImageElement | null>(null);
  const draggingRef = useRef(false);
  const lastMoveSentRef = useRef(0);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/kernel/second-screen/status');
      if (res.ok) {
        const data: SecondScreenStatusPayload = await res.json();
        setStatus(data);
      }
    } catch {
      // Ignore transient network errors
    }
  }, []);

  // Advertise receiver_open = true while modal is open so other Luma PCs discover this PC
  useEffect(() => {
    if (!open) return;
    setStreamNonce(Date.now());
    void fetch('/api/kernel/second-screen/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_open: true }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok) setStatus(d);
      })
      .catch(() => {});

    const timer = window.setInterval(() => {
      void pollStatus();
    }, 1800);

    return () => {
      window.clearInterval(timer);
      void fetch('/api/kernel/second-screen/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_open: false }),
      }).catch(() => {});
    };
  }, [open, pollStatus]);

  useEffect(() => {
    if (!open) return;
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && rootRef.current) {
        await rootRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be blocked in certain embedded views
    }
  };

  const handleCopySenderUrl = async () => {
    const url = status?.sender_url || '';
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      onNotify?.('Ссылка для трансляции скопирована в буфер обмена!');
      window.setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      onNotify?.(url);
    }
  };

  const sendRemoteInput = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!connectedHost || !controlEnabled) return;
      try {
        await fetch('/api/kernel/second-screen/remote-input', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: connectedHost,
            pin: connectedPin,
            payload,
          }),
        });
      } catch {
        // Ignore transient input drop
      }
    },
    [connectedHost, connectedPin, controlEnabled]
  );

  const getNormalizedCoords = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = remoteImgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x: nx, y: ny };
  };

  const handleConnectPeer = (host: string, pin = '') => {
    const clean = host.trim();
    if (!clean) return;
    setRemoteError(null);
    setConnectedHost(clean);
    setConnectedPin(pin.trim());
    setStreamNonce(Date.now());
    onNotify?.(`Подключение ко второму ПК: ${clean}`);
  };

  const handleSendText = async () => {
    if (!kbdText) return;
    await sendRemoteInput({ action: 'text', text: kbdText });
    setKbdText('');
  };

  if (!open) return null;

  const incomingActive = Boolean(status?.incoming_active) && !connectedHost && !showQrOverlay;
  const senderUrl = status?.sender_url || `http://${status?.lan_ip || '127.0.0.1'}:49225/send`;
  const remoteStreamUrl = connectedHost
    ? `/api/kernel/second-screen/remote-stream?host=${encodeURIComponent(connectedHost)}${
        connectedPin ? `&pin=${encodeURIComponent(connectedPin)}` : ''
      }&t=${streamNonce}`
    : '';
  const incomingStreamUrl = `/api/kernel/second-screen/incoming.mjpeg?t=${streamNonce}`;
  const peers = status?.peers || [];

  const content = (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[2600] flex flex-col bg-[#050814]/95 backdrop-blur-2xl text-white select-none"
    >
      {/* Top Floating Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 bg-black/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400/25 via-cyan-400/20 to-indigo-500/30 border border-emerald-300/30 flex items-center justify-center text-emerald-200 shrink-0">
            <MonitorPlay className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold tracking-tight flex items-center gap-2">
              <span>Luma AirDisplay · Приёмник 2-го экрана</span>
              {(incomingActive || connectedHost) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-400/35 text-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {connectedHost
                    ? `Подключён к ${connectedHost}`
                    : `${status?.incoming_sender || 'Устройство'} · ${Math.round(
                        status?.incoming_fps || 0
                      )} FPS`}
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-white/55 truncate">
              Работает без Miracast и без драйверов — принимает экран с любого телефона, ноутбука, Mac или ПК
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {!connectedHost && (
            <div className="inline-flex rounded-xl p-0.5 border border-white/12 bg-white/[0.05]">
              <button
                type="button"
                onClick={() => {
                  setTab('qr');
                  setShowQrOverlay(true);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  tab === 'qr' && !incomingActive
                    ? 'bg-emerald-500/25 text-emerald-100 border border-emerald-400/30'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" />
                  Принять по QR
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('peer');
                  setShowQrOverlay(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  tab === 'peer'
                    ? 'bg-sky-500/25 text-sky-100 border border-sky-400/30'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5" />
                  Другой ПК Luma ({peers.length})
                </span>
              </button>
            </div>
          )}

          {connectedHost && (
            <>
              <button
                type="button"
                onClick={() => setControlEnabled((v) => !v)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors inline-flex items-center gap-1.5 ${
                  controlEnabled
                    ? 'bg-emerald-500/20 border-emerald-400/35 text-emerald-100'
                    : 'bg-white/[0.06] border-white/12 text-white/70'
                }`}
                title="Управление удалённым ПК мышью и клавиатурой"
              >
                <MousePointerClick className="w-3.5 h-3.5" />
                {controlEnabled ? 'Управление ВКЛ' : 'Только просмотр'}
              </button>
              <button
                type="button"
                onClick={() => setShowKbdBar((v) => !v)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors inline-flex items-center gap-1.5 ${
                  showKbdBar
                    ? 'bg-sky-500/25 border-sky-400/35 text-sky-100'
                    : 'bg-white/[0.06] border-white/12 text-white/75 hover:text-white'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                Ввод текста
              </button>
              <button
                type="button"
                onClick={() => {
                  setConnectedHost(null);
                  setRemoteError(null);
                }}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-amber-400/35 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
              >
                Отключиться
              </button>
            </>
          )}

          {(incomingActive || connectedHost) && (
            <>
              <button
                type="button"
                onClick={() => setFitMode((m) => (m === 'contain' ? 'cover' : 'contain'))}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-white/12 bg-white/[0.06] hover:bg-white/[0.12] text-white/85"
                title="Переключить масштаб: Вписать / Заполнить"
              >
                {fitMode === 'contain' ? 'Вписать' : 'Заполнить'}
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (((r + 90) % 360) as 0 | 90 | 180 | 270))}
                className="w-8 h-8 rounded-xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.12] text-white/85 flex items-center justify-center"
                title={`Повернуть экран (${rotation}°)`}
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {status?.incoming_active && showQrOverlay && !connectedHost && (
            <button
              type="button"
              onClick={() => setShowQrOverlay(false)}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-emerald-400/40 bg-emerald-500/25 text-emerald-100"
            >
              Вернуться к трансляции
            </button>
          )}

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="w-8 h-8 rounded-xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.14] text-white/85 flex items-center justify-center"
            title={isFullscreen ? 'Выйти из полного экрана' : 'Развернуть на весь экран'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-rose-400/30 bg-rose-500/15 hover:bg-rose-500/30 text-rose-100 flex items-center justify-center"
            title="Закрыть приёмник"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        {/* CASE 1: Connected to another Luma OS PC */}
        {connectedHost ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-white/10">
            <img
              ref={remoteImgRef}
              src={remoteStreamUrl}
              alt="Экран удалённого ПК Luma OS"
              decoding="async"
              draggable={false}
              onError={() =>
                setRemoteError(
                  `Не удалось подключиться к ${connectedHost}. Убедитесь, что на том ПК включена трансляция Luma AirDisplay и оба устройства в одной сети.`
                )
              }
              onLoad={() => setRemoteError(null)}
              onMouseDown={(e) => {
                if (!controlEnabled) return;
                if (e.button === 2) return;
                const pt = getNormalizedCoords(e);
                if (!pt) return;
                draggingRef.current = true;
                void sendRemoteInput({ action: 'down', nx: pt.x, ny: pt.y });
              }}
              onMouseMove={(e) => {
                if (!controlEnabled || !draggingRef.current) return;
                const now = Date.now();
                if (now - lastMoveSentRef.current < 16) return;
                lastMoveSentRef.current = now;
                const pt = getNormalizedCoords(e);
                if (pt) void sendRemoteInput({ action: 'move', nx: pt.x, ny: pt.y });
              }}
              onMouseUp={(e) => {
                if (!controlEnabled || !draggingRef.current) return;
                draggingRef.current = false;
                const pt = getNormalizedCoords(e);
                if (pt) void sendRemoteInput({ action: 'up', nx: pt.x, ny: pt.y });
              }}
              onDoubleClick={(e) => {
                if (!controlEnabled) return;
                const pt = getNormalizedCoords(e);
                if (pt) void sendRemoteInput({ action: 'dblclick', nx: pt.x, ny: pt.y });
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!controlEnabled) return;
                const pt = getNormalizedCoords(e);
                if (pt) void sendRemoteInput({ action: 'rclick', nx: pt.x, ny: pt.y });
              }}
              onWheel={(e) => {
                if (!controlEnabled) return;
                const delta = e.deltaY > 0 ? -120 : 120;
                void sendRemoteInput({ action: 'scroll', delta });
              }}
              style={{ transform: `rotate(${rotation}deg)` }}
              className={`${
                fitMode === 'cover' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'
              } transition-transform duration-200 ${controlEnabled ? 'cursor-crosshair' : 'cursor-default'}`}
            />

            {remoteError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
                <div className="max-w-md rounded-2xl border border-amber-400/35 bg-amber-500/15 p-5 text-center space-y-3">
                  <div className="text-sm font-extrabold text-amber-100">{remoteError}</div>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRemoteError(null);
                        setStreamNonce(Date.now());
                      }}
                      className="px-3.5 py-2 rounded-xl bg-sky-500/30 border border-sky-400/40 text-xs font-bold hover:bg-sky-500/40"
                    >
                      Повторить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConnectedHost(null);
                        setRemoteError(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-bold hover:bg-white/20"
                    >
                      Назад к списку
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showKbdBar && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/15 bg-black/80 backdrop-blur-xl shadow-2xl w-[min(560px,92%)]">
                <input
                  type="text"
                  value={kbdText}
                  onChange={(e) => setKbdText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSendText();
                    }
                  }}
                  placeholder="Введите текст (Русский / English) для отправки на тот ПК..."
                  className="flex-1 bg-white/[0.08] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/45 outline-none focus:border-sky-400/60"
                />
                <button
                  type="button"
                  onClick={() => void handleSendText()}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/35 border border-sky-300/40 text-xs font-bold hover:bg-sky-500/50"
                >
                  Отправить
                </button>
                <button
                  type="button"
                  onClick={() => void sendRemoteInput({ action: 'key', key: 'Enter' })}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 text-[11px] font-bold hover:bg-white/20"
                >
                  Enter
                </button>
                <button
                  type="button"
                  onClick={() => void sendRemoteInput({ action: 'key', key: 'Backspace' })}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 text-[11px] font-bold hover:bg-white/20"
                >
                  ⌫
                </button>
              </div>
            )}
          </div>
        ) : incomingActive ? (
          /* CASE 2: Live Incoming Stream pushed from ANY phone / laptop / Mac via /send! */
          <div className="relative w-full h-full flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-emerald-400/25 shadow-[0_0_50px_rgba(16,185,129,0.16)]">
            <img
              src={incomingStreamUrl}
              alt="Входящая трансляция на второй экран"
              draggable={false}
              style={{ transform: `rotate(${rotation}deg)` }}
              className={`${
                fitMode === 'cover' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'
              } transition-transform duration-200`}
            />
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 border border-white/15 text-[11px] text-white/85 backdrop-blur-md">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>
                Принимаем экран: <b>{status?.incoming_sender || 'Устройство'}</b> ({status?.incoming_ip}) ·{' '}
                {Math.round(status?.incoming_fps || 0)} FPS
              </span>
            </div>
          </div>
        ) : tab === 'qr' ? (
          /* CASE 3: Waiting for Incoming Browser Stream via QR / URL */
          <div className="max-w-2xl w-full rounded-[28px] border border-white/12 bg-gradient-to-br from-white/[0.07] via-emerald-500/[0.04] to-sky-500/[0.06] p-6 shadow-2xl grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-center">
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-[200px] h-[200px] rounded-2xl bg-white p-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.4)] flex items-center justify-center">
                <img
                  src={`/api/kernel/second-screen/qr.svg?mode=send&t=${streamNonce}`}
                  alt="QR-код для трансляции на этот ПК"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[10.5px] font-bold text-emerald-200/90 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Ожидаем подключение...
              </span>
            </div>

            <div className="space-y-3.5 min-w-0">
              <div>
                <div className="text-lg font-extrabold tracking-tight text-white">
                  Этот ПК готов работать 2-м экраном!
                </div>
                <p className="text-xs text-white/65 mt-1 leading-relaxed">
                  Miracast не требуется. Просто откройте адрес ниже в любом браузере на ноутбуке, Mac, ПК, iPad или телефоне в той же сети Wi-Fi / LAN / точке доступа:
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/25 bg-black/40 px-3 py-2.5">
                <Wifi className="w-4 h-4 text-emerald-300 shrink-0" />
                <code className="text-xs font-mono text-emerald-100 truncate flex-1 select-text">
                  {senderUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopySenderUrl()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-300/35 text-[11px] font-bold text-emerald-50 inline-flex items-center gap-1 shrink-0"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? 'Готово' : 'Копировать'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="font-extrabold text-emerald-200 mb-0.5">1. Откройте ссылку</div>
                  <div className="text-white/60">Наведите камеру на QR или введите адрес в браузере.</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="font-extrabold text-sky-200 mb-0.5">2. Нажмите «Начать»</div>
                  <div className="text-white/60">Выберите экран, окно или камеру на втором устройстве.</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="font-extrabold text-violet-200 mb-0.5">3. Смотрите здесь</div>
                  <div className="text-white/60">Картинка мгновенно развернётся на этом компьютере!</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10.5px] text-white/50">
                <Smartphone className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>
                  Подходит для Android, iPhone, iPad, Windows, macOS и Linux · Порт {status?.port || 49225}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* CASE 4: Connect to another Luma OS PC (Auto-discovered LAN Peers + Direct IP) */
          <div className="max-w-xl w-full rounded-[28px] border border-white/12 bg-gradient-to-br from-white/[0.07] via-sky-500/[0.04] to-indigo-500/[0.06] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-base font-extrabold text-white">
                  Подключиться к другому ПК с Luma OS
                </div>
                <div className="text-xs text-white/60 mt-0.5">
                  С живым управлением мышью и клавиатурой прямо из этого окна!
                </div>
              </div>
              <button
                type="button"
                onClick={() => void pollStatus()}
                className="w-8 h-8 rounded-xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-white/80"
                title="Обновить поиск компьютеров в сети"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Auto-discovered LAN peers */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Найденные ПК Luma OS в вашей сети
              </div>
              {peers.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-white/55 text-center">
                  Других ПК с включённым Luma AirDisplay пока не видно. Включите трансляцию на втором компьютере или введите его IP ниже.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {peers.map((p) => (
                    <div
                      key={`${p.ip}:${p.port}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-white truncate">{p.host}</div>
                        <div className="text-[10.5px] text-white/60">
                          {p.ip}:{p.port} · Мониторов: {p.monitors || 1}
                          {p.streaming ? ' · Транслирует' : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleConnectPeer(`${p.ip}:${p.port}`, remotePin)}
                        className="px-3 py-1.5 rounded-xl bg-sky-500/35 hover:bg-sky-500/50 border border-sky-300/40 text-xs font-bold text-white shrink-0"
                      >
                        Подключиться
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual IP + PIN */}
            <div className="pt-2 border-t border-white/10 space-y-2.5">
              <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Подключение по IP-адресу вручную
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_auto] gap-2">
                <input
                  type="text"
                  value={remoteHost}
                  onChange={(e) => setRemoteHost(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConnectPeer(remoteHost, remotePin);
                  }}
                  placeholder="Например: 192.168.1.42"
                  className="bg-black/35 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-sky-400/60"
                />
                <input
                  type="text"
                  maxLength={4}
                  value={remotePin}
                  onChange={(e) => setRemotePin(e.target.value)}
                  placeholder="PIN (опц.)"
                  className="bg-black/35 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-sky-400/60"
                />
                <button
                  type="button"
                  onClick={() => handleConnectPeer(remoteHost, remotePin)}
                  disabled={!remoteHost.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500/40 to-indigo-500/40 hover:from-sky-500/55 hover:to-indigo-500/55 border border-sky-300/40 text-xs font-extrabold text-white disabled:opacity-40"
                >
                  Открыть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
