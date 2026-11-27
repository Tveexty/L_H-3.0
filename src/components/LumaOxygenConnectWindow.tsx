import React, { useEffect, useState } from 'react';
import {
  Camera,
  ClipboardCopy,
  FolderOpen,
  Image as ImageIcon,
  Laptop,
  Layers,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
} from 'lucide-react';

interface ConnectedPhone {
  id: string;
  name: string;
  ip: string;
  last_seen_at: string;
}

interface ReceivedPhoneFile {
  id: string;
  name: string;
  path: string;
  size: number;
  is_image: boolean;
  from_device: string;
  received_at: string;
  preview_url?: string;
}

interface OxygenConnectStatus {
  ok: boolean;
  lan_ip: string;
  port: number;
  pin: string;
  pair_url: string;
  inbox_dir: string;
  device_name: string;
  devices: ConnectedPhone[];
  inbox: ReceivedPhoneFile[];
}

interface LumaOxygenConnectWindowProps {
  isDark: boolean;
  onPushToast: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
  onCopyToClipboard?: (text: string) => void;
}

export const LumaOxygenConnectWindow: React.FC<LumaOxygenConnectWindowProps> = ({
  isDark,
  onPushToast,
  onCopyToClipboard,
}) => {
  const [status, setStatus] = useState<OxygenConnectStatus | null>(null);
  const [qrKey, setQrKey] = useState(1);

  const loadStatus = async () => {
    try {
      const r = await fetch('/api/kernel/oxygen-connect/status');
      if (r.ok) {
        const d = await r.json();
        if (d?.ok) setStatus(d);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadStatus();
    const id = window.setInterval(() => void loadStatus(), 3500);
    return () => window.clearInterval(id);
  }, []);

  const regeneratePin = async () => {
    try {
      const r = await fetch('/api/kernel/oxygen-connect/regenerate-pin', { method: 'POST' });
      if (r.ok) {
        const d = await r.json();
        if (d?.ok) {
          setStatus(d);
          setQrKey((k) => k + 1);
          onPushToast('Oxygen Connect', `Новый PIN-код сгенерирован: ${d.pin}`, 'success');
        }
      }
    } catch {
      // ignore
    }
  };

  const openFileOnPC = async (path: string) => {
    const lower = path.toLowerCase();
    const isImg = /\.(png|jpe?g|webp|bmp|gif|svg|ico)$/.test(lower);
    window.dispatchEvent(
      new CustomEvent('luma-open-internal-file', {
        detail: { path, mode: isImg ? 'photo' : 'auto', name: path.split(/[\\/]/).pop() || path },
      })
    );
  };

  const sendFileToPhone = async () => {
    try {
      const r = await fetch('/api/kernel/pick-file?mode=file');
      if (!r.ok) return;
      const d = await r.json();
      if ((!d?.picked && !d?.ok) || !d?.path) return;
      const sr = await fetch('/api/kernel/oxygen-connect/send-to-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: d.path }),
      });
      if (sr.ok) {
        const sd = await sr.json();
        if (sd?.ok && sd?.file) {
          onPushToast('Oxygen Connect', `Файл «${sd.file.name}» отправлен на телефон!`, 'success');
          void loadStatus();
        }
      }
    } catch {
      onPushToast('Oxygen Connect', 'Не удалось отправить файл на телефон', 'warning');
    }
  };

  const previewHarmonyWave = (direction: 'receive' | 'send') => {
    window.dispatchEvent(
      new CustomEvent('luma-harmony-transfer', {
        detail: {
          direction,
          fileName: direction === 'receive' ? 'IMG_Oxygen_Photo.jpg' : 'Presentation_LumaOS.pdf',
          size: direction === 'receive' ? 2_450_000 : 1_180_000,
          device: 'Android',
        },
      })
    );
  };

  const addToShelf = async (file: ReceivedPhoneFile) => {
    await fetch('/api/kernel/shelf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add',
        item: { kind: file.is_image ? 'image' : 'file', name: file.name, path: file.path, size: file.size },
      }),
    }).catch(() => {});
    window.dispatchEvent(
      new CustomEvent('luma-harmony-transfer', {
        detail: {
          direction: 'receive',
          fileName: file.name,
          path: file.path,
          size: file.size,
          isImage: file.is_image,
          previewUrl: file.preview_url,
          device: 'Полка Dropzone',
        },
      })
    );
    onPushToast('Oxygen SuperHub', `«${file.name}» добавлен на полку Drag & Drop`, 'success');
  };

  const surfaceCls = isDark
    ? 'bg-white/[0.05] border-white/12 text-white'
    : 'bg-white/85 border-slate-200 text-slate-900';
  const mutedCls = isDark ? 'text-white/60' : 'text-slate-500';
  const outboxList: ReceivedPhoneFile[] = Array.isArray((status as unknown as { outbox?: ReceivedPhoneFile[] })?.outbox)
    ? ((status as unknown as { outbox?: ReceivedPhoneFile[] }).outbox || [])
    : [];

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 space-y-4">
      {/* Стиль ОС SuperDevice Hero Banner in Oxygen 2.5D style */}
      <div className="p-5 rounded-3xl border border-cyan-400/35 bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-indigo-900/30 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-300/40 text-cyan-200 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Luma Oxygen Connect 1.8 · Стиль ОС · Волна и 1-Тап
            </div>
            <h2 className="text-xl font-black tracking-tight">Подключите Android к Luma OS 1.8.2 (Fluorine)</h2>
            <p className={`text-xs ${mutedCls}`}>
              Максимально простой 1-тап интерфейс на телефоне, ускоренный плавный тачпад, Circle to Search и фирменная полноэкранная волна Стиль ОС при каждом приёме и отправке файлов!
            </p>
            <div className="flex flex-wrap gap-2 pt-1.5">
              <button
                onClick={() => void sendFileToPhone()}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/25 transition"
              >
                📤 Отправить файл на телефон
              </button>
              <button
                onClick={() => previewHarmonyWave('receive')}
                className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/35 text-emerald-300 text-xs font-bold cursor-pointer transition"
              >
                🌊 Волна приёма
              </button>
              <button
                onClick={() => previewHarmonyWave('send')}
                className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-300 text-xs font-bold cursor-pointer transition"
              >
                🌊 Волна отправки
              </button>
            </div>
          </div>

          {/* SuperDevice Radial Bubble */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-xl shadow-cyan-500/30 flex items-center justify-center border-2 border-white/35">
              <Laptop className="w-7 h-7" />
            </div>
            <div className="flex flex-col items-center">
              <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-[9px] font-mono text-cyan-300">Wi-Fi LAN</span>
            </div>
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
                (status?.devices?.length || 0) > 0
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/25'
                  : 'bg-white/10 border-white/25 text-white/70'
              }`}
            >
              <Smartphone className="w-7 h-7" />
            </div>
          </div>
        </div>
      </div>

      {/* QR Pairing + Connection Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 ${surfaceCls}`}>
          <div className="w-40 h-40 rounded-2xl bg-white p-2 shadow-xl shrink-0 flex items-center justify-center">
            <img
              src={`/api/kernel/oxygen-connect/qr.svg?k=${qrKey}`}
              alt="QR Oxygen Connect"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="space-y-2 min-w-0 flex-1">
            <div className="text-xs font-extrabold flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-cyan-400" />
              Сканируйте камерой Android
            </div>
            <div className={`text-[11px] ${mutedCls}`}>
              Откроется упрощённый 1-тап интерфейс <b>Oxygen Connect</b>: Фото, Файлы, <b>Circle to Search</b>, Буфер и быстрый Тачпад на одном экране без лишних вкладок.
            </div>
            <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 font-mono text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="opacity-65">Адрес:</span>
                <span className="text-cyan-300 font-bold truncate">
                  http://{status?.lan_ip || '127.0.0.1'}:{status?.port || 49218}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="opacity-65">PIN-код:</span>
                <span className="text-emerald-300 font-black tracking-widest text-sm">{status?.pin || '------'}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  if (status?.pair_url) {
                    onCopyToClipboard?.(status.pair_url);
                    onPushToast('Oxygen Connect', 'Ссылка подключения скопирована', 'success');
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/35 text-cyan-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <ClipboardCopy className="w-3 h-3" /> Копировать URL
              </button>
              <button
                onClick={() => void regeneratePin()}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Новый PIN
              </button>
            </div>
          </div>
        </div>

        {/* Connected Devices & Security */}
        <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-extrabold flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Подключённые телефоны ({status?.devices?.length || 0})
            </div>
            <span className="text-[10px] font-mono text-emerald-400 inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> PIN-защита LAN
            </span>
          </div>

          {!status?.devices || status.devices.length === 0 ? (
            <div className={`py-8 text-center text-xs space-y-1 ${mutedCls}`}>
              <div>Ожидание подключения Android в вашей Wi-Fi сети...</div>
              <div className="text-[10px]">Камера→ПК · Файлы↔ПК · Circle to Search · Быстрый тачпад</div>
            </div>
          ) : (
            <div className="space-y-2">
              {status.devices.map((dev) => (
                <div
                  key={dev.id}
                  className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-emerald-300">{dev.name}</div>
                    <div className="text-[10px] font-mono opacity-70">IP: {dev.ip}</div>
                  </div>
                  <span className="text-[10px] font-mono opacity-70">{dev.last_seen_at}</span>
                </div>
              ))}
            </div>
          )}

          {status?.inbox_dir && (
            <button
              onClick={() => void openFileOnPC(status.inbox_dir)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              Открыть папку входящих ({status.inbox_dir})
            </button>
          )}
        </div>
      </div>

      {/* Outgoing PC -> Phone Queue */}
      {outboxList.length > 0 && (
        <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
          <div className="text-xs font-extrabold text-sky-400">
            📤 Отправлено с ПК на телефон ({outboxList.length}) — доступно на смартфоне в 1 тап
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {outboxList.map((f) => (
              <div key={f.id} className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-bold truncate">{f.name}</div>
                  <div className={`text-[10px] font-mono ${mutedCls}`}>{Math.max(1, Math.round(f.size / 1024))} КБ · {f.received_at}</div>
                </div>
                <span className="text-[10px] font-mono text-sky-300 shrink-0">На телефоне</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Received Camera Photos & Files Inbox */}
      <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
        <div className="flex items-center justify-between">
          <div className="text-xs font-extrabold flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            Входящие фото и файлы с Android ({status?.inbox?.length || 0})
          </div>
          <span className={`text-[10px] ${mutedCls}`}>Автоматически добавляются в Полку Dropzone + Волна Стиль ОС</span>
        </div>

        {!status?.inbox || status.inbox.length === 0 ? (
          <div className={`py-8 text-center text-xs ${mutedCls}`}>
            Сфотографируйте что-нибудь в Oxygen Connect на телефоне — фото прилетит с волной Стиль ОС по всему экрану!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {status.inbox.map((f) => (
              <div key={f.id} className="p-2.5 rounded-2xl bg-black/25 border border-white/10 space-y-2">
                {f.is_image && f.preview_url && (
                  <img
                    src={f.preview_url}
                    alt={f.name}
                    className="w-full h-32 object-cover rounded-xl border border-white/10"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{f.name}</div>
                  <div className={`text-[10px] font-mono ${mutedCls}`}>
                    {Math.max(1, Math.round(f.size / 1024))} КБ · {f.from_device} · {f.received_at}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => void openFileOnPC(f.path)}
                    className="flex-1 px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[11px] font-bold cursor-pointer"
                  >
                    Открыть
                  </button>
                  <button
                    onClick={() => void addToShelf(f)}
                    className="px-2 py-1 rounded-lg bg-white/10 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3 h-3" /> На полку
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
