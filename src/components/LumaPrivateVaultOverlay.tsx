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

function fmtSize(n: number): string {
  if (!n) return '0 Б';
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(2)} МБ`;
}

export const LumaPrivateVaultOverlay: React.FC<LumaPrivateVaultOverlayProps> = ({
  open,
  onClose,
  onLaunchTarget,
  onNotify,
}) => {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [password, setPassword] = useState('');
  const [setupRequirePass, setSetupRequirePass] = useState(true);
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

  // Viewer
  const [viewingItem, setViewingItem] = useState<{ item: VaultItem; content: string } | null>(null);

  // Panic lock: double Esc
  const lastEscRef = useRef(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/kernel/vault/status');
      const data = await res.json();
      if (data?.ok) {
        setStatus(data);
        setSetupRequirePass(Boolean(data.require_password));
        setSetupAutoLock(Number(data.auto_lock_min || 10));
      }
    } catch {
      setError('Не удалось подключиться к LumaShield 1.6 Private Vault');
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchStatus();
      setError('');
    }
  }, [open, fetchStatus]);

  const handleLockAndExit = useCallback(async () => {
    try {
      await fetch('/api/kernel/vault/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock' }),
      });
    } catch {
      // ignore
    }
    setViewingItem(null);
    setPassword('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscRef.current < 450) {
          void handleLockAndExit();
          onNotify?.('Суперконфиденциальность', 'Экстренная блокировка (Esc×2) выполнена', 'warn');
        }
        lastEscRef.current = now;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleLockAndExit, onNotify]);

  if (!open) return null;

  const handleConfigure = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/kernel/vault/auth', {
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
      } else {
        setError(data?.error || 'Ошибка настройки');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/kernel/vault/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', password }),
      });
      const data = await res.json();
      if (data?.ok && data.unlocked) {
        setStatus(data);
        setPassword('');
      } else {
        setError(data?.error || 'Неверный пароль');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUploadLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = typeof reader.result === 'string' ? reader.result : '';
      if (!b64) return;
      setBusy(true);
      try {
        const res = await fetch('/api/kernel/vault/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            kind: 'file',
            name: f.name,
            base64_data: b64,
          }),
        });
        const data = await res.json();
        if (data?.ok) {
          setStatus(data);
          setShowAddModal(false);
          onNotify?.('Зашифровано AES-256-GCM', `Файл «${f.name}» скрыт внутри сейфа`, 'success');
        } else {
          setError(data?.error || 'Ошибка шифрования файла');
        }
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const handleAddItem = async () => {
    setBusy(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        action: 'add',
        kind: addKind,
        name: addName.trim(),
        target: addTarget.trim(),
        content: addContent,
        disk_path: addKind === 'file' ? diskPath.trim() : '',
        remove_original: removeOriginal,
      };
      const res = await fetch('/api/kernel/vault/items', {
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
      } else {
        setError(data?.error || 'Не удалось добавить объект');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpenItem = async (item: VaultItem) => {
    if (item.kind === 'link' && item.target) {
      window.open(item.target.startsWith('http') ? item.target : `https://${item.target}`, '_blank');
      return;
    }
    if (item.kind === 'app' && item.target) {
      onLaunchTarget?.(item.target);
      return;
    }
    try {
      const res = await fetch('/api/kernel/vault/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', id: item.id }),
      });
      const data = await res.json();
      if (data?.ok) {
        setViewingItem({ item: data.item || item, content: String(data.content || '') });
      }
    } catch {
      setError('Не удалось расшифровать элемент');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const res = await fetch('/api/kernel/vault/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    const data = await res.json();
    if (data?.ok) {
      setStatus(data);
      if (viewingItem?.item.id === id) setViewingItem(null);
    }
  };

  const isUnlocked = Boolean(status?.unlocked);

  return (
    <div
      className="fixed inset-0 z-[1200] flex flex-col text-white select-none overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 18% 15%, rgba(16,185,129,0.16), transparent 40%), radial-gradient(circle at 82% 85%, rgba(34,211,238,0.14), transparent 45%), #05070b',
      }}
    >
      {/* Top Security Status Bar */}
      <div className="px-5 py-3 border-b border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-400">
            <Shield size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Суперконфиденциальность · Carbon Vault</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                AES-256-GCM
              </span>
            </div>
            <div className="text-[11px] text-white/50">
              Изолированный рабочий стол · Файлы зашифрованы в *.lumavault и недоступны снаружи · Esc×2 — экстренный выход
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isUnlocked && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 transition"
              >
                <Plus size={14} />
                Скрыть объект
              </button>
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="px-3 py-1.5 rounded-xl text-xs bg-white/[0.07] hover:bg-white/15 border border-white/10 flex items-center gap-1.5"
              >
                <Settings size={13} />
                Доступ
              </button>
            </>
          )}
          <button
            onClick={() => void handleLockAndExit()}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-400/30 flex items-center gap-1.5"
          >
            <Lock size={13} />
            Заблокировать и выйти
          </button>
        </div>
      </div>

      {/* Main Content: Lock Screen OR Isolated Private Desktop */}
      {!isUnlocked ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border border-white/12 bg-white/[0.04] backdrop-blur-2xl p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <EyeOff size={28} />
              </div>
              <h2 className="text-lg font-bold">
                {status?.configured ? 'Приватный рабочий стол заблокирован' : 'Первый запуск Суперконфиденциальности'}
              </h2>
              <p className="text-xs text-white/55">
                {status?.configured
                  ? status.require_password
                    ? 'Введите пароль для расшифровки вашего приватного пространства.'
                    : 'Включён режим быстрого входа без пароля. Нажмите «Войти».'
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
                    onClick={() => setSetupRequirePass(true)}
                    className={`p-3 rounded-2xl border text-left transition ${
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
                    onClick={() => setSetupRequirePass(false)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      !setupRequirePass
                        ? 'bg-cyan-500/15 border-cyan-400/40 text-white'
                        : 'bg-white/[0.03] border-white/10 text-white/60'
                    }`}
                  >
                    <Unlock size={16} className="text-cyan-400 mb-1" />
                    <div className="text-xs font-semibold">Без пароля</div>
                    <div className="text-[10px] opacity-70">Скрыто от Windows</div>
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
                  onClick={() => void handleConfigure()}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black transition"
                >
                  Создать изолированный рабочий стол
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
                  onClick={() => void handleUnlock()}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black flex items-center justify-center gap-2 transition"
                >
                  <Unlock size={15} />
                  Открыть приватный рабочий стол
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          {/* Vault Access Settings Drawer */}
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
                  onClick={() => void handleConfigure()}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400"
                >
                  Применить и перешифровать
                </button>
                <button onClick={() => setShowSettings(false)} className="p-1.5 text-white/60 hover:text-white">
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Isolated Private Desktop Grid */}
          {!status?.items || status.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400 mb-4">
                <FileLock2 size={34} />
              </div>
              <div className="text-base font-bold">Приватный рабочий стол пуст</div>
              <div className="text-xs text-white/55 max-w-md mt-1.5">
                Все файлы, заметки, приложения и ссылки, которые вы добавите сюда, хранятся в зашифрованных блоках
                AES-256-GCM и невидимы для обычного рабочего стола, Проводника Windows и сторонних программ.
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5"
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
                  onDoubleClick={() => void handleOpenItem(item)}
                  onClick={() => void handleOpenItem(item)}
                  className="group relative p-4 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-emerald-400/40 cursor-pointer transition flex flex-col items-center text-center gap-2"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteItem(item.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 transition"
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

          {/* Footer info */}
          <div className="mt-auto pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-white/45">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" />
              Хранилище: {status?.vault_dir} (Zero-Wipe при удалении)
            </span>
            <span>Нажмите Esc дважды для мгновенной блокировки</span>
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
              <button onClick={() => setShowAddModal(false)} className="text-white/50 hover:text-white">
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
                  key={k}
                  onClick={() => setAddKind(k)}
                  className={`py-1.5 rounded-xl text-xs font-medium border ${
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
                  <span className="text-[10px] text-white/50">Документы, фото, ключи, архивы</span>
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
                  onClick={() => void handleAddItem()}
                  disabled={!diskPath.trim() || busy}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black"
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
                  onClick={() => void handleAddItem()}
                  disabled={!addName.trim() || busy}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black"
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
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileLock2 size={15} className="text-emerald-400" />
                <span className="text-sm font-semibold">{viewingItem.item.name}</span>
                <span className="text-[10px] font-mono text-emerald-400">Расшифровано в RAM</span>
              </div>
              <div className="flex items-center gap-2">
                {viewingItem.item.target && (
                  <button
                    onClick={() => onLaunchTarget?.(viewingItem.item.target!)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-cyan-500/20 text-cyan-300 flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Запустить
                  </button>
                )}
                <button onClick={() => setViewingItem(null)} className="text-white/60 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap break-words font-mono text-xs text-emerald-100/90 leading-relaxed">
                {viewingItem.content || '(Пустой или бинарный защищённый файл)'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
