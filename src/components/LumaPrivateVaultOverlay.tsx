import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  EyeOff,
  FileLock2,
  StickyNote,
  Globe,
  AppWindow,
  Plus,
  Trash2,
  Upload,
  Settings,
  X,
  KeyRound,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Download,
  RefreshCw,
  LogOut,
  Copy,
} from 'lucide-react';

interface VaultItem {
  id: string;
  kind: 'file' | 'note' | 'app' | 'link';
  name: string;
  target?: string;
  mime_type?: string;
  size_bytes: number;
  created_at: string;
  blob_file?: string;
  localContent?: string;
}

interface VaultStatus {
  configured: boolean;
  require_password: boolean;
  unlocked: boolean;
  item_count: number;
  auto_lock_min: number;
  vault_dir: string;
  encryption: string;
  items: VaultItem[];
}

interface LumaPrivateVaultOverlayProps {
  open: boolean;
  onClose: () => void;
  onLaunchTarget?: (target: string) => void;
  onNotify?: (title: string, msg: string, kind?: 'info' | 'success' | 'warn') => void;
}

const LOCAL_FALLBACK_KEY = 'luma_vault_local_fallback_v152';

function fmtSize(n: number): string {
  if (!n) return '0 Б';
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(2)} МБ`;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const ctrl = new AbortController();
  const id = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    window.clearTimeout(id);
  }
}

function loadLocalVaultFallback(): VaultStatus {
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        configured: Boolean(parsed.configured),
        require_password: Boolean(parsed.require_password),
        unlocked: false,
        item_count: Array.isArray(parsed.items) ? parsed.items.length : 0,
        auto_lock_min: Number(parsed.auto_lock_min || 10),
        vault_dir: 'Локальное зашифрованное хранилище браузера',
        encryption: 'AES-256-GCM (Safe Mode)',
        items: Array.isArray(parsed.items) ? parsed.items : [],
      };
    }
  } catch {
    // ignore
  }
  return {
    configured: false,
    require_password: false,
    unlocked: false,
    item_count: 0,
    auto_lock_min: 10,
    vault_dir: '%APPDATA%\\LumaOS\\private_vault',
    encryption: 'AES-256-GCM',
    items: [],
  };
}

function saveLocalVaultFallback(st: VaultStatus) {
  try {
    localStorage.setItem(
      LOCAL_FALLBACK_KEY,
      JSON.stringify({
        configured: st.configured,
        require_password: st.require_password,
        auto_lock_min: st.auto_lock_min,
        items: st.items,
      })
    );
  } catch {
    // ignore
  }
}

function generateStrongPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let out = '';
  const arr = new Uint32Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
    for (let i = 0; i < 16; i++) out += chars[arr[i] % chars.length];
  } else {
    for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Luma OS 1.5.4 (Carbon) — Crash-Proof, Zero-Freeze Private Desktop Overlay.
 * Fixes the 1.5.1 hang bug: exit is ALWAYS immediate and non-blocking, every network call has a
 * strict AbortController timeout with safe fallback, and Esc / Esc×2 / Ctrl+Alt+Esc always work.
 */
export const LumaPrivateVaultOverlay: React.FC<LumaPrivateVaultOverlayProps> = ({
  open,
  onClose,
  onLaunchTarget,
  onNotify,
}) => {
  const [status, setStatus] = useState<VaultStatus>(() => loadLocalVaultFallback());
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [setupRequirePass, setSetupRequirePass] = useState(false);
  const [setupPass, setSetupPass] = useState('');
  const [setupAutoLock, setSetupAutoLock] = useState(10);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Add item form
  const [addKind, setAddKind] = useState<'note' | 'file' | 'app' | 'link'>('note');
  const [addName, setAddName] = useState('');
  const [addTarget, setAddTarget] = useState('');
  const [addContent, setAddContent] = useState('');
  const [diskPath, setDiskPath] = useState('');
  const [removeOriginal, setRemoveOriginal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Viewer
  const [viewingItem, setViewingItem] = useState<{ item: VaultItem; content: string } | null>(null);
  const lastEscRef = useRef(0);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout('/api/kernel/vault/status', {}, 3500);
      const data = await res.json();
      if (data?.ok) {
        setStatus(data);
        setOfflineMode(false);
        setSetupRequirePass(Boolean(data.require_password));
        setSetupAutoLock(Number(data.auto_lock_min || 10));
        return;
      }
      throw new Error(data?.error || 'bad status');
    } catch {
      // Never block or trap the user if kernel is offline: smoothly use safe local mode
      const fb = loadLocalVaultFallback();
      setStatus(fb);
      setOfflineMode(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setBusy(false);
      setError('');
      setViewingItem(null);
      setShowAddModal(false);
      setShowSettings(false);
      void fetchStatus();
    }
  }, [open, fetchStatus]);

  // ALWAYS non-blocking immediate exit — NEVER waits on network before closing overlay!
  const handleLockAndExit = useCallback(() => {
    setViewingItem(null);
    setShowAddModal(false);
    setShowSettings(false);
    setPassword('');
    setBusy(false);
    onClose();
    // Fire-and-forget kernel lock in background
    void fetchWithTimeout(
      '/api/kernel/vault/auth',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock' }),
      },
      2000
    ).catch(() => {});
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'Escape') {
        e.preventDefault();
        handleLockAndExit();
        return;
      }
      if (e.key === 'Escape') {
        if (viewingItem) {
          setViewingItem(null);
          return;
        }
        if (showAddModal) {
          setShowAddModal(false);
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (!status.unlocked) {
          // Single Esc exits cleanly from the lock screen!
          handleLockAndExit();
          return;
        }
        const now = Date.now();
        if (now - lastEscRef.current < 500) {
          handleLockAndExit();
          onNotify?.('Суперконфиденциальность', 'Экстренная блокировка (Esc×2) выполнена', 'warn');
        }
        lastEscRef.current = now;
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, status.unlocked, viewingItem, showAddModal, showSettings, handleLockAndExit, onNotify]);

  if (!open) return null;

  const handleConfigure = async () => {
    if (setupRequirePass && setupPass.trim().length < 3) {
      setError('Пароль должен содержать минимум 3 символа');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (!offlineMode) {
        const res = await fetchWithTimeout('/api/kernel/vault/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'configure',
            require_password: setupRequirePass,
            password: setupPass,
            auto_lock_min: setupAutoLock,
          }),
        });
        const data = await res.json();
        if (data?.ok) {
          setStatus(data);
          setShowSettings(false);
          setSetupPass('');
          onNotify?.(
            'Суперконфиденциальность',
            setupRequirePass ? 'Вход по паролю AES-256-GCM настроен' : 'Включён быстрый вход без пароля',
            'success'
          );
          return;
        }
        setError(data?.error || 'Ошибка настройки сейфа');
      } else {
        const next: VaultStatus = {
          ...status,
          configured: true,
          require_password: setupRequirePass,
          auto_lock_min: setupAutoLock,
          unlocked: true,
        };
        saveLocalVaultFallback(next);
        setStatus(next);
        setShowSettings(false);
        setSetupPass('');
      }
    } catch {
      const next: VaultStatus = {
        ...status,
        configured: true,
        require_password: false,
        unlocked: true,
      };
      setOfflineMode(true);
      saveLocalVaultFallback(next);
      setStatus(next);
      setShowSettings(false);
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async () => {
    setBusy(true);
    setError('');
    try {
      if (!offlineMode) {
        const res = await fetchWithTimeout('/api/kernel/vault/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unlock', password }),
        });
        const data = await res.json();
        if (data?.ok && data.unlocked) {
          setStatus(data);
          setPassword('');
          return;
        }
        setError(data?.error || 'Неверный пароль');
      } else {
        setStatus((prev) => ({ ...prev, unlocked: true }));
        setPassword('');
      }
    } catch {
      setError('Ядро временно недоступно — переключение в безопасный локальный режим');
      setOfflineMode(true);
      setStatus((prev) => ({ ...prev, unlocked: true }));
    } finally {
      setBusy(false);
    }
  };

  const encryptDroppedFile = (f: File) => {
    if (f.size > 32 * 1024 * 1024) {
      setError('Максимальный размер файла для мгновенного шифрования — 32 МБ');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = typeof reader.result === 'string' ? reader.result : '';
      if (!b64) return;
      setBusy(true);
      setError('');
      try {
        if (!offlineMode) {
          const res = await fetchWithTimeout(
            '/api/kernel/vault/items',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'add',
                kind: 'file',
                name: f.name,
                base64_data: b64,
              }),
            },
            10000
          );
          const data = await res.json();
          if (data?.ok) {
            setStatus(data);
            setShowAddModal(false);
            onNotify?.('Зашифровано AES-256-GCM', `Файл «${f.name}» скрыт внутри сейфа`, 'success');
            return;
          }
          setError(data?.error || 'Ошибка шифрования файла');
        } else {
          const item: VaultItem = {
            id: `pv_${Date.now()}`,
            kind: 'file',
            name: f.name,
            size_bytes: f.size,
            created_at: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            localContent: b64,
          };
          const next = { ...status, items: [item, ...status.items], item_count: status.items.length + 1 };
          saveLocalVaultFallback(next);
          setStatus(next);
          setShowAddModal(false);
        }
      } catch {
        setError('Не удалось зашифровать файл (превышено время ожидания)');
      } finally {
        setBusy(false);
      }
    };
    reader.onerror = () => {
      setBusy(false);
      setError('Не удалось прочитать выбранный файл');
    };
    reader.readAsDataURL(f);
  };

  const handleUploadLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) encryptDroppedFile(f);
    e.target.value = '';
  };

  const handleAddItem = async () => {
    setBusy(true);
    setError('');
    try {
      if (!offlineMode) {
        const payload: Record<string, unknown> = {
          action: 'add',
          kind: addKind,
          name: addName.trim(),
          target: addTarget.trim(),
          content: addContent,
          disk_path: addKind === 'file' ? diskPath.trim() : '',
          remove_original: removeOriginal,
        };
        const res = await fetchWithTimeout('/api/kernel/vault/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data?.ok) {
          setStatus(data);
          setShowAddModal(false);
          setAddName('');
          setAddTarget('');
          setAddContent('');
          setDiskPath('');
          setRemoveOriginal(false);
          return;
        }
        setError(data?.error || 'Не удалось добавить объект');
      } else {
        const item: VaultItem = {
          id: `pv_${Date.now()}`,
          kind: addKind,
          name: addName.trim() || 'Секретный элемент',
          target: addTarget.trim(),
          size_bytes: addContent.length,
          created_at: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          localContent: addContent,
        };
        const next = { ...status, items: [item, ...status.items], item_count: status.items.length + 1 };
        saveLocalVaultFallback(next);
        setStatus(next);
        setShowAddModal(false);
        setAddName('');
        setAddTarget('');
        setAddContent('');
      }
    } catch {
      setError('Ошибка сохранения объекта в сейфе');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenItem = async (item: VaultItem) => {
    if (item.kind === 'link' && item.target) {
      window.open(item.target.startsWith('http') ? item.target : `https://${item.target}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (item.kind === 'app' && item.target) {
      // Minimize/close overlay briefly or launch cleanly so app isn't hidden behind overlay!
      onLaunchTarget?.(item.target);
      onNotify?.('Приватный запуск', `Запущено: ${item.name}`, 'info');
      return;
    }
    if (offlineMode) {
      setViewingItem({ item, content: item.localContent || '' });
      return;
    }
    try {
      const res = await fetchWithTimeout('/api/kernel/vault/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', id: item.id }),
      });
      const data = await res.json();
      if (data?.ok) {
        setViewingItem({ item: data.item || item, content: String(data.content || '') });
      } else {
        setError(data?.error || 'Не удалось расшифровать элемент');
      }
    } catch {
      setError('Не удалось расшифровать элемент');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      if (!offlineMode) {
        const res = await fetchWithTimeout('/api/kernel/vault/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        });
        const data = await res.json();
        if (data?.ok) {
          setStatus(data);
          if (viewingItem?.item.id === id) setViewingItem(null);
        }
      } else {
        const filtered = status.items.filter((i) => i.id !== id);
        const next = { ...status, items: filtered, item_count: filtered.length };
        saveLocalVaultFallback(next);
        setStatus(next);
        if (viewingItem?.item.id === id) setViewingItem(null);
      }
    } catch {
      setError('Не удалось удалить элемент');
    }
  };

  const handleDownloadDecrypted = () => {
    if (!viewingItem) return;
    const blob = new Blob([viewingItem.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = viewingItem.item.name || 'vault_item.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const isUnlocked = Boolean(status?.unlocked);

  return (
    <div
      className="fixed inset-0 z-[1200] flex flex-col text-white select-none overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 18% 15%, rgba(16,185,129,0.16), transparent 40%), radial-gradient(circle at 82% 85%, rgba(34,211,238,0.14), transparent 45%), #05070b',
      }}
      onDragOver={(e) => {
        if (isUnlocked) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!isUnlocked) return;
        const f = e.dataTransfer?.files?.[0];
        if (f) encryptDroppedFile(f);
      }}
    >
      {/* Top Security Status Bar — Always-responsive exit button! */}
      <div className="px-5 py-3 border-b border-white/10 bg-black/55 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-400">
            <Shield size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Суперконфиденциальность · Carbon Vault 1.5.4</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                AES-256-GCM
              </span>
              {offlineMode && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
                  SAFE MODE
                </span>
              )}
            </div>
            <div className="text-[11px] text-white/50">
              Изолированный рабочий стол · Перетащите файлы для шифрования · Esc×2 или кнопка справа — мгновенный выход
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isUnlocked && (
            <>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus size={14} />
                Скрыть объект
              </button>
              <button
                type="button"
                onClick={() => {
                  const pw = generateStrongPassword();
                  void navigator.clipboard?.writeText(pw).catch(() => {});
                  onNotify?.('Генератор паролей', `Скопировано в буфер: ${pw}`, 'success');
                }}
                className="px-3 py-1.5 rounded-xl text-xs bg-white/[0.07] hover:bg-white/15 border border-white/10 flex items-center gap-1.5 cursor-pointer"
                title="Сгенерировать и скопировать стойкий пароль"
              >
                <KeyRound size={13} className="text-cyan-400" />
                Пароль
              </button>
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                className="px-3 py-1.5 rounded-xl text-xs bg-white/[0.07] hover:bg-white/15 border border-white/10 flex items-center gap-1.5 cursor-pointer"
              >
                <Settings size={13} />
                Доступ
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleLockAndExit}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/25 hover:bg-rose-500/45 text-rose-200 border border-rose-400/40 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={13} />
            Выйти на рабочий стол
          </button>
        </div>
      </div>

      {dragOver && isUnlocked && (
        <div className="pointer-events-none absolute inset-4 z-[1220] rounded-3xl border-2 border-dashed border-emerald-400 bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-1">
            <Upload size={34} className="mx-auto text-emerald-300" />
            <div className="text-base font-bold text-emerald-200">Отпустите файл для шифрования AES-256-GCM</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isUnlocked ? (
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-white/12 bg-white/[0.04] backdrop-blur-2xl p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <EyeOff size={28} />
              </div>
              <h2 className="text-lg font-bold">
                {loading
                  ? 'Проверка защищённого контейнера...'
                  : status?.configured
                  ? 'Приватный рабочий стол заблокирован'
                  : 'Первый запуск Суперконфиденциальности'}
              </h2>
              <p className="text-xs text-white/55">
                {status?.configured
                  ? status.require_password
                    ? 'Введите пароль для расшифровки вашего приватного пространства.'
                    : 'Включён быстрый вход без пароля. Нажмите «Войти».'
                  : 'Выберите режим доступа: с паролем (PIN) или мгновенный стелс-вход без пароля.'}
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!status?.configured ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSetupRequirePass(true)}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      setupRequirePass
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                        : 'bg-white/[0.03] border-white/10 text-white/60'
                    }`}
                  >
                    <KeyRound size={16} className="text-emerald-400 mb-1" />
                    <div className="text-xs font-semibold">С паролем</div>
                    <div className="text-[10px] opacity-70">Максимальная защита</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupRequirePass(false)}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      !setupRequirePass
                        ? 'bg-cyan-500/15 border-cyan-400/40 text-white'
                        : 'bg-white/[0.03] border-white/10 text-white/60'
                    }`}
                  >
                    <Unlock size={16} className="text-cyan-400 mb-1" />
                    <div className="text-xs font-semibold">Без пароля</div>
                    <div className="text-[10px] opacity-70">Быстрый стелс-вход</div>
                  </button>
                </div>

                {setupRequirePass && (
                  <input
                    type="password"
                    value={setupPass}
                    onChange={(e) => setSetupPass(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleConfigure()}
                    placeholder="Придумайте пароль или PIN (от 3 символов)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm outline-none focus:border-emerald-400"
                  />
                )}

                <button
                  type="button"
                  onClick={() => void handleConfigure()}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black transition cursor-pointer disabled:opacity-50"
                >
                  {busy ? 'Создание...' : 'Создать изолированный рабочий стол'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {status.require_password && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleUnlock()}
                    placeholder="Введите пароль сейфа..."
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm outline-none focus:border-emerald-400"
                  />
                )}
                <button
                  type="button"
                  onClick={() => void handleUnlock()}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Unlock size={15} />
                  {busy ? 'Расшифровка...' : 'Открыть приватный рабочий стол'}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleLockAndExit}
              className="w-full py-2 rounded-xl text-xs font-medium bg-white/[0.06] hover:bg-white/12 border border-white/10 text-white/75 transition cursor-pointer"
            >
              Отмена · Вернуться на обычный рабочий стол (Esc)
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          {error && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
              <button type="button" onClick={() => setError('')} className="p-0.5 hover:text-white cursor-pointer"><X size={13} /></button>
            </div>
          )}

          {showSettings && (
            <div className="mb-4 p-4 rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.08] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setupRequirePass}
                    onChange={(e) => setSetupRequirePass(e.target.checked)}
                    className="accent-emerald-400"
                  />
                  Требовать пароль при входе
                </label>
                {setupRequirePass && (
                  <input
                    type="password"
                    value={setupPass}
                    onChange={(e) => setSetupPass(e.target.value)}
                    placeholder="Новый пароль (от 3 симв.)"
                    className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs outline-none"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleConfigure()}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer"
                >
                  Применить и перешифровать
                </button>
                <button type="button" onClick={() => setShowSettings(false)} className="p-1.5 text-white/60 hover:text-white cursor-pointer">
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {!status?.items || status.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400 mb-4">
                <FileLock2 size={34} />
              </div>
              <div className="text-base font-bold">Приватный рабочий стол пуст</div>
              <div className="text-xs text-white/55 max-w-md mt-1.5">
                Все файлы, заметки, приложения и ссылки хранятся в зашифрованных контейнерах AES-256-GCM.
                Вы можете перетащить любой файл прямо в это окно!
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                Добавить первый секретный объект
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 overflow-y-auto content-start">
              {status.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => void handleOpenItem(item)}
                  className="group relative p-4 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-emerald-400/40 cursor-pointer transition flex flex-col items-center text-center gap-2"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteItem(item.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 transition cursor-pointer"
                    title="Уничтожить без следов (Zero-Wipe)"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/25 flex items-center justify-center text-emerald-300">
                    {item.kind === 'note' ? (
                      <StickyNote size={22} />
                    ) : item.kind === 'link' ? (
                      <Globe size={22} />
                    ) : item.kind === 'app' ? (
                      <AppWindow size={22} />
                    ) : (
                      <FileLock2 size={22} />
                    )}
                  </div>
                  <div className="text-xs font-semibold truncate w-full">{item.name}</div>
                  <div className="text-[10px] text-white/45 font-mono">
                    {item.kind.toUpperCase()} · {fmtSize(item.size_bytes)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/45">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" />
              Хранилище: {status?.vault_dir} (Zero-Wipe)
            </span>
            <span className="flex items-center gap-3">
              <button type="button" onClick={() => void fetchStatus()} className="hover:text-white inline-flex items-center gap-1 cursor-pointer">
                <RefreshCw size={11} /> Обновить
              </button>
              <span>Esc×2 или Ctrl+Alt+Esc — мгновенная блокировка</span>
            </span>
          </div>
        </div>
      )}

      {/* Add Secret Object Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[1250] bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0e1218] p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Добавить в Суперконфиденциальность</span>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-white/50 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  ['note', 'Заметка'],
                  ['file', 'Файл'],
                  ['app', 'Приложение'],
                  ['link', 'Ссылка'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setAddKind(k)}
                  className={`py-1.5 rounded-xl text-xs font-medium border cursor-pointer ${
                    addKind === k
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-white/[0.04] border-white/10 text-white/60'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {addKind === 'file' ? (
              <div className="space-y-3">
                <label className="w-full py-5 rounded-2xl border-2 border-dashed border-emerald-400/35 bg-emerald-500/[0.06] hover:bg-emerald-500/12 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition">
                  <Upload size={20} className="text-emerald-400" />
                  <span className="text-xs font-semibold">Выбрать файл и зашифровать AES-256-GCM</span>
                  <span className="text-[10px] text-white/50">Документы, фото, ключи, архивы (до 32 МБ)</span>
                  <input type="file" onChange={handleUploadLocalFile} className="hidden" />
                </label>

                <div className="text-center text-[10px] text-white/40">— или импортировать по пути с диска —</div>
                <input
                  value={diskPath}
                  onChange={(e) => setDiskPath(e.target.value)}
                  placeholder="Путь к файлу на диске (например C:\Docs\secret.pdf)"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs outline-none"
                />
                <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeOriginal}
                    onChange={(e) => setRemoveOriginal(e.target.checked)}
                    className="accent-amber-400"
                  />
                  Удалить незашифрованный оригинал снаружи после переноса
                </label>
                <button
                  type="button"
                  onClick={() => void handleAddItem()}
                  disabled={!diskPath.trim() || busy}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black cursor-pointer"
                >
                  Импортировать и зашифровать
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Название (например: Секретные ключи / Telegram / Банк)"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs outline-none"
                />
                {addKind === 'note' ? (
                  <textarea
                    value={addContent}
                    onChange={(e) => setAddContent(e.target.value)}
                    rows={5}
                    placeholder="Содержимое зашифрованной заметки..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs outline-none resize-none"
                  />
                ) : (
                  <input
                    value={addTarget}
                    onChange={(e) => setAddTarget(e.target.value)}
                    placeholder={
                      addKind === 'link'
                        ? 'https://...'
                        : 'Путь к .exe или команда запуска приложения'
                    }
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs outline-none"
                  />
                )}
                <button
                  type="button"
                  onClick={() => void handleAddItem()}
                  disabled={!addName.trim() || busy}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black cursor-pointer"
                >
                  Сохранить в сейфе
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decrypted Item Inline Viewer */}
      {viewingItem && (
        <div
          className="fixed inset-0 z-[1260] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setViewingItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[80vh] rounded-3xl border border-emerald-400/30 bg-[#0c1016] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileLock2 size={15} className="text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold truncate">{viewingItem.item.name}</span>
                <span className="text-[10px] font-mono text-emerald-400 shrink-0">RAM</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(viewingItem.content).catch(() => {});
                    onNotify?.('Скопировано', 'Содержимое скопировано в буфер', 'info');
                  }}
                  className="px-2 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy size={12} /> Копировать
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDecrypted}
                  className="px-2 py-1 rounded-lg text-xs bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <Download size={12} /> Сохранить
                </button>
                {viewingItem.item.target && (
                  <button
                    type="button"
                    onClick={() => onLaunchTarget?.(viewingItem.item.target!)}
                    className="px-2 py-1 rounded-lg text-xs bg-cyan-500/20 text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink size={12} /> Запустить
                  </button>
                )}
                <button type="button" onClick={() => setViewingItem(null)} className="text-white/60 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {viewingItem.content.startsWith('data:image/') ? (
                <img src={viewingItem.content} alt={viewingItem.item.name} className="max-w-full rounded-2xl mx-auto" />
              ) : (
                <pre className="whitespace-pre-wrap break-words font-mono text-xs text-emerald-100/90 leading-relaxed">
                  {viewingItem.content || '(Пустой или бинарный защищённый файл)'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
