import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Trash2,
  RotateCcw,
  FolderOpen,
  FileText,
  Folder,
  RefreshCw,
  Plus,
  Search,
  Sparkles,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
  X,
} from 'lucide-react';

export interface TrashItemMeta {
  id: string;
  name: string;
  original_path: string;
  stored_name: string;
  is_dir: boolean;
  size_bytes: number;
  deleted_at: string;
  source: string;
}

interface LumaTrashWindowProps {
  isDark: boolean;
  deleteAnimStyle?: 'harmony7' | 'shrink' | 'evaporate';
  onNotify?: (title: string, msg: string, kind?: 'info' | 'success' | 'warn') => void;
  onCountChange?: (count: number) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 Б';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

export const LumaTrashWindow: React.FC<LumaTrashWindowProps> = ({
  isDark,
  deleteAnimStyle = 'harmony7',
  onNotify,
  onCountChange,
}) => {
  const [items, setItems] = useState<TrashItemMeta[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [trashDir, setTrashDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [movePath, setMovePath] = useState('');
  const [showMoveInput, setShowMoveInput] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState('');
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kernel/trash');
      const data = await res.json();
      if (data?.ok) {
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setTotalBytes(Number(data.total_bytes || 0));
        setTrashDir(String(data.trash_dir || ''));
        onCountChange?.(list.length);
      }
    } catch {
      setStatusMsg('Нет связи с подсистемой Корзины LumaCore 1.6');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.original_path.toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleRestore = async (item: TrashItemMeta) => {
    try {
      const res = await fetch('/api/kernel/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', id: item.id }),
      });
      const data = await res.json();
      if (data?.ok) {
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setTotalBytes(Number(data.total_bytes || 0));
        onCountChange?.(list.length);
        setStatusMsg(`Восстановлено: ${data.restored_path || item.original_path}`);
        onNotify?.('Корзина Luma OS', `Файл «${item.name}» восстановлен`, 'success');
      } else {
        setStatusMsg(data?.error || 'Не удалось восстановить');
      }
    } catch {
      setStatusMsg('Ошибка восстановления объекта');
    }
  };

  const handleDeletePermanent = async (item: TrashItemMeta) => {
    setDeletingIds((prev) => ({ ...prev, [item.id]: true }));
    await new Promise((r) => setTimeout(r, deleteAnimStyle === 'harmony7' ? 380 : 220));
    try {
      const res = await fetch('/api/kernel/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: item.id }),
      });
      const data = await res.json();
      if (data?.ok) {
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setTotalBytes(Number(data.total_bytes || 0));
        onCountChange?.(list.length);
        onNotify?.('Корзина Luma OS', `«${item.name}» удалён навсегда`, 'info');
      }
    } finally {
      setDeletingIds((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const handleEmptyAll = async () => {
    setConfirmEmpty(false);
    const allMap: Record<string, boolean> = {};
    items.forEach((i) => {
      allMap[i.id] = true;
    });
    setDeletingIds(allMap);
    await new Promise((r) => setTimeout(r, 360));
    try {
      const res = await fetch('/api/kernel/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'empty' }),
      });
      const data = await res.json();
      if (data?.ok) {
        setItems([]);
        setTotalBytes(0);
        onCountChange?.(0);
        setStatusMsg('Корзина Luma OS и системная Корзина ОС полностью очищены');
        onNotify?.('Корзина очищена', `Удалено объектов: ${data.removed ?? items.length}`, 'success');
      }
    } finally {
      setDeletingIds({});
    }
  };

  const handleMoveFromDisk = async () => {
    const p = movePath.trim();
    if (!p) return;
    try {
      const res = await fetch('/api/kernel/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', path: p }),
      });
      const data = await res.json();
      if (data?.ok) {
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setTotalBytes(Number(data.total_bytes || 0));
        onCountChange?.(list.length);
        setMovePath('');
        setShowMoveInput(false);
        onNotify?.('Корзина Luma OS', `Объект перемещён в Корзину`, 'info');
      } else {
        setStatusMsg(data?.error || 'Не удалось переместить файл');
      }
    } catch {
      setStatusMsg('Ошибка связи с ядром');
    }
  };

  const handlePickFromOS = async () => {
    try {
      const res = await fetch('/api/kernel/pick-file?mode=file');
      const data = await res.json();
      if (data?.picked && data.path) {
        setMovePath(data.path);
        setShowMoveInput(true);
      } else {
        setShowMoveInput(true);
      }
    } catch {
      setShowMoveInput(true);
    }
  };

  const handleCreateDemo = async () => {
    try {
      const res = await fetch('/api/kernel/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'demo',
          name: `carbon_draft_${new Date().toTimeString().slice(0, 5).replace(':', '')}.txt`,
          content: 'Демо-файл Корзины Luma OS 1.5 (Carbon). Вы можете восстановить его или удалить навсегда.',
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setTotalBytes(Number(data.total_bytes || 0));
        onCountChange?.(list.length);
      }
    } catch {
      // ignore
    }
  };

  const cardBg = isDark
    ? 'bg-white/[0.04] border-white/10 text-white'
    : 'bg-white/80 border-slate-200/90 text-slate-900';
  const subText = isDark ? 'text-white/55' : 'text-slate-500';
  const delClass =
    deleteAnimStyle === 'harmony7'
      ? 'luma-delete-harmony7'
      : deleteAnimStyle === 'evaporate'
      ? 'opacity-0 -translate-y-4 scale-90 blur-sm transition-all duration-300'
      : 'opacity-0 scale-75 transition-all duration-200';

  return (
    <div className={`h-full flex flex-col ${isDark ? 'text-white' : 'text-slate-900'}`}>
      {/* Top Carbon Header Bar */}
      <div
        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/70'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              items.length > 0
                ? 'bg-gradient-to-br from-rose-500/20 to-amber-500/20 border-rose-400/35 text-rose-400'
                : 'bg-gradient-to-br from-slate-500/15 to-cyan-500/15 border-white/15 text-cyan-400'
            }`}
          >
            <Trash2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Корзина Luma OS</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-white/10 text-white/75' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {items.length} объ. · {formatBytes(totalBytes)}
              </span>
            </div>
            <div className={`text-[11px] truncate max-w-[340px] ${subText}`}>
              {trashDir || 'Системное хранилище удалённых файлов Carbon 1.5'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handlePickFromOS}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition ${
              isDark
                ? 'bg-white/[0.06] border-white/12 hover:bg-white/12 text-white'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800'
            }`}
          >
            <Plus size={13} />
            В корзину
          </button>
          <button
            onClick={handleCreateDemo}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition ${
              isDark
                ? 'bg-white/[0.05] border-white/10 hover:bg-white/10 text-white/80'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title="Создать тестовый файл в Корзине"
          >
            <Sparkles size={13} className="text-amber-400" />
            Тест-файл
          </button>
          <button
            onClick={() => void loadTrash()}
            className={`p-1.5 rounded-xl border transition ${
              isDark
                ? 'bg-white/[0.05] border-white/10 hover:bg-white/10 text-white/80'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title="Обновить"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setConfirmEmpty(true)}
            disabled={items.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/90 hover:bg-rose-500 disabled:opacity-35 text-white flex items-center gap-1.5 shadow-sm transition"
          >
            <Trash2 size={13} />
            Очистить всё
          </button>
        </div>
      </div>

      {/* Optional Move-From-Disk Bar */}
      {showMoveInput && (
        <div
          className={`px-4 py-2.5 border-b flex items-center gap-2 ${
            isDark ? 'border-white/10 bg-cyan-500/10' : 'border-slate-200 bg-cyan-50'
          }`}
        >
          <FolderOpen size={15} className="text-cyan-400 shrink-0" />
          <input
            value={movePath}
            onChange={(e) => setMovePath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleMoveFromDisk()}
            placeholder="Путь к файлу или папке на ПК (например: C:\\Users\\...\\temp.txt)..."
            className={`flex-1 bg-transparent text-xs outline-none ${
              isDark ? 'text-white placeholder:text-white/40' : 'text-slate-900 placeholder:text-slate-400'
            }`}
          />
          <button
            onClick={() => void handleMoveFromDisk()}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-cyan-500 text-white hover:bg-cyan-400"
          >
            Удалить в Корзину
          </button>
          <button
            onClick={() => setShowMoveInput(false)}
            className={`p-1 rounded-lg ${subText} hover:opacity-100`}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search + Capacity Bar */}
      <div className="px-4 py-2.5 flex items-center gap-3">
        <div
          className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
            isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <Search size={14} className={subText} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по удалённым файлам и исходным путям..."
            className={`flex-1 bg-transparent text-xs outline-none ${
              isDark ? 'text-white placeholder:text-white/40' : 'text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px]">
          <HardDrive size={13} className="text-cyan-400" />
          <span className={subText}>Синхронизация с Корзиной ОС</span>
        </div>
      </div>

      {/* Confirmation Banner */}
      {confirmEmpty && (
        <div
          className={`mx-4 mb-2 p-3 rounded-2xl border flex items-center justify-between gap-3 ${
            isDark
              ? 'bg-rose-500/15 border-rose-400/35 text-rose-100'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            <span>
              Удалить навсегда все {items.length} объ. ({formatBytes(totalBytes)}) и очистить Корзину Windows?
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setConfirmEmpty(false)}
              className={`px-2.5 py-1 rounded-lg text-xs ${
                isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-white border border-slate-200'
              }`}
            >
              Отмена
            </button>
            <button
              onClick={() => void handleEmptyAll()}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500 text-white hover:bg-rose-400"
            >
              Да, очистить
            </button>
          </div>
        </div>
      )}

      {/* Status Toast */}
      {statusMsg && (
        <div
          className={`mx-4 mb-2 px-3 py-1.5 rounded-xl text-[11px] flex items-center justify-between ${
            isDark ? 'bg-white/[0.06] text-emerald-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <CheckCircle2 size={13} />
            {statusMsg}
          </span>
          <button onClick={() => setStatusMsg('')} className="opacity-60 hover:opacity-100 ml-2">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center py-10">
            <div
              className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-3 border ${
                isDark ? 'bg-white/[0.04] border-white/10 text-white/30' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
            >
              <Trash2 size={28} />
            </div>
            <div className="text-sm font-semibold">
              {items.length === 0 ? 'Корзина абсолютно чиста' : 'Ничего не найдено'}
            </div>
            <div className={`text-xs mt-1 max-w-xs ${subText}`}>
              {items.length === 0
                ? 'Удалённые файлы из Проводника Luma OS появляются здесь. Их можно восстановить в исходную папку в 1 клик.'
                : 'Попробуйте изменить поисковый запрос.'}
            </div>
          </div>
        ) : (
          filtered.map((item) => {
            const isDeleting = !!deletingIds[item.id];
            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${cardBg} ${
                  isDeleting ? delClass : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      item.is_dir
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-cyan-500/15 text-cyan-400'
                    }`}
                  >
                    {item.is_dir ? <Folder size={17} /> : <FileText size={17} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{item.name}</div>
                    <div className={`text-[10px] truncate ${subText}`}>
                      Откуда: {item.original_path}
                    </div>
                    <div className={`text-[10px] flex items-center gap-2 mt-0.5 ${subText}`}>
                      <span>{formatBytes(item.size_bytes)}</span>
                      <span>·</span>
                      <span>Удалено: {item.deleted_at}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => void handleRestore(item)}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-400/25 flex items-center gap-1 transition"
                  >
                    <RotateCcw size={12} />
                    Восстановить
                  </button>
                  <button
                    onClick={() => void handleDeletePermanent(item)}
                    className="p-1.5 rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-400/20 transition"
                    title="Удалить навсегда (анимация HarmonyOS 7)"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
