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
  Eye,
  CheckSquare,
  Square,
  Clock,
  Upload,
  Image as ImageIcon,
  Code2,
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

function classifyTrashCategory(item: TrashItemMeta): 'folders' | 'docs' | 'code' | 'images' | 'other' {
  if (item.is_dir) return 'folders';
  const ext = item.name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'images';
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'go', 'rs', 'cpp', 'cs', 'html', 'css', 'json', 'sql', 'sh', 'ps1'].includes(ext)) return 'code';
  if (['txt', 'md', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'csv'].includes(ext)) return 'docs';
  return 'other';
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
  const [autoCleanDays, setAutoCleanDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'docs' | 'code' | 'images' | 'folders'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [previewData, setPreviewData] = useState<{ item: TrashItemMeta; preview?: string; image_src?: string; is_image?: boolean } | null>(null);
  const [movePath, setMovePath] = useState('');
  const [showMoveInput, setShowMoveInput] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState('');
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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
        setAutoCleanDays(Number(data.auto_clean_days || 0));
        onCountChange?.(list.length);
      }
    } catch {
      setStatusMsg('Нет связи с подсистемой Корзины LumaCore 1.5.7');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void loadTrash();
    const onUpdated = () => void loadTrash();
    window.addEventListener('luma-trash-updated', onUpdated);
    return () => window.removeEventListener('luma-trash-updated', onUpdated);
  }, [loadTrash]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((i) => {
      if (category !== 'all' && classifyTrashCategory(i) !== category) return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.original_path.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ru');
      if (sortBy === 'size') return b.size_bytes - a.size_bytes;
      return b.deleted_at.localeCompare(a.deleted_at);
    });
  }, [items, query, category, sortBy]);

  const selectedList = useMemo(() => Object.keys(selectedIds).filter((id) => selectedIds[id]), [selectedIds]);

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
        if (previewData?.item.id === item.id) setPreviewData(null);
        setStatusMsg(`Восстановлено: ${data.restored_path || item.original_path}`);
        onNotify?.('Корзина Luma OS', `Файл «${item.name}» восстановлен`, 'success');
      } else {
        setStatusMsg(data?.error || 'Не удалось восстановить');
      }
    } catch {
      setStatusMsg('Ошибка восстановления объекта');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedList.length === 0) return;
    const res = await fetch('/api/kernel/trash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_restore', ids: selectedList }),
    });
    const data = await res.json();
    if (data?.ok) {
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      setTotalBytes(Number(data.total_bytes || 0));
      setSelectedIds({});
      onCountChange?.(list.length);
      setStatusMsg(`Восстановлено объектов: ${data.restored_count}`);
      onNotify?.('Корзина Luma OS', `Массово восстановлено: ${data.restored_count}`, 'success');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedList.length === 0) return;
    const animMap: Record<string, boolean> = {};
    selectedList.forEach((id) => { animMap[id] = true; });
    setDeletingIds(animMap);
    await new Promise((r) => setTimeout(r, 320));
    try {
      const res = await fetch('/api/kernel/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_delete', ids: selectedList }),
      });
      const data = await res.json();
      if (data?.ok) {
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setTotalBytes(Number(data.total_bytes || 0));
        setSelectedIds({});
        onCountChange?.(list.length);
        setStatusMsg(`Удалено навсегда: ${data.deleted_count}`);
      }
    } finally {
      setDeletingIds({});
    }
  };

  const handlePreview = async (item: TrashItemMeta) => {
    try {
      const res = await fetch('/api/kernel/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', id: item.id }),
      });
      const data = await res.json();
      if (data?.ok) {
        setPreviewData({ item, preview: data.preview, image_src: data.image_src, is_image: data.is_image });
      }
    } catch {
      setStatusMsg('Не удалось открыть предпросмотр файла');
    }
  };

  const handleAutoCleanChange = async (days: number) => {
    const res = await fetch('/api/kernel/trash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auto_clean', auto_clean_days: days }),
    });
    const data = await res.json();
    if (data?.ok) {
      setAutoCleanDays(Number(data.auto_clean_days || 0));
      setItems(Array.isArray(data.items) ? data.items : items);
      setTotalBytes(Number(data.total_bytes ?? totalBytes));
      setStatusMsg(days === 0 ? 'Автоочистка отключена' : `Автоочистка настроена: файлы старше ${days} дн.`);
    }
  };

  const handleDropFiles = async (fileList: FileList) => {
    for (const file of Array.from(fileList).slice(0, 8)) {
      const b64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.readAsDataURL(file);
      });
      const res = await fetch('/api/kernel/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', name: file.name, base64_data: b64 }),
      });
      const data = await res.json();
      if (data?.ok) {
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setTotalBytes(Number(data.total_bytes || 0));
        onCountChange?.(list.length);
      }
    }
    setStatusMsg('Перетащенные файлы помещены в Корзину Luma OS');
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
        if (previewData?.item.id === item.id) setPreviewData(null);
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
    items.forEach((i) => { allMap[i.id] = true; });
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
        setSelectedIds({});
        setPreviewData(null);
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
        onNotify?.('Корзина Luma OS', 'Объект перемещён в Корзину', 'info');
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
      if (data?.picked && data.path) setMovePath(data.path);
      setShowMoveInput(true);
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
          content: 'Демо-файл Корзины Luma OS 1.5.1 (Carbon).\nВы можете просмотреть его содержимое прямо в корзине, восстановить или удалить навсегда.',
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

  const cardBg = isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white/80 border-slate-200/90 text-slate-900';
  const subText = isDark ? 'text-white/55' : 'text-slate-500';
  const delClass =
    deleteAnimStyle === 'harmony7'
      ? 'luma-delete-harmony7'
      : deleteAnimStyle === 'evaporate'
      ? 'opacity-0 -translate-y-4 scale-90 blur-sm transition-all duration-300'
      : 'opacity-0 scale-75 transition-all duration-200';

  return (
    <div
      className={`h-full flex flex-col relative ${isDark ? 'text-white' : 'text-slate-900'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) void handleDropFiles(e.dataTransfer.files);
      }}
    >
      {dragOver && (
        <div className="absolute inset-0 z-40 bg-rose-500/20 backdrop-blur-md border-2 border-dashed border-rose-400 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <Upload size={32} className="text-rose-300" />
          <div className="text-sm font-bold text-white">Отпустите файлы, чтобы поместить их в Корзину</div>
        </div>
      )}

      {/* Top Header */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/70'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${items.length > 0 ? 'bg-gradient-to-br from-rose-500/20 to-amber-500/20 border-rose-400/35 text-rose-400' : 'bg-gradient-to-br from-slate-500/15 to-cyan-500/15 border-white/15 text-cyan-400'}`}>
            <Trash2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Корзина Luma OS 1.5.1</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-white/75' : 'bg-slate-200 text-slate-700'}`}>
                {items.length} объ. · {formatBytes(totalBytes)}
              </span>
            </div>
            <div className={`text-[11px] truncate max-w-[340px] ${subText}`}>
              {trashDir || 'Системное хранилище удалённых файлов Carbon 1.5.1'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'}`} title="Автоочистка старых файлов">
            <Clock size={12} className="text-cyan-400" />
            <select
              value={autoCleanDays}
              onChange={(e) => void handleAutoCleanChange(Number(e.target.value))}
              className="bg-transparent outline-none text-[11px] cursor-pointer"
            >
              <option value={0} className="bg-zinc-900">Авто: Выкл</option>
              <option value={7} className="bg-zinc-900">Авто: 7 дн.</option>
              <option value={30} className="bg-zinc-900">Авто: 30 дн.</option>
            </select>
          </div>
          <button onClick={handlePickFromOS} className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${isDark ? 'bg-white/[0.06] border-white/12 hover:bg-white/12 text-white' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800'}`}>
            <Plus size={13} /> В корзину
          </button>
          <button onClick={handleCreateDemo} className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/10 text-white/80' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'}`}>
            <Sparkles size={13} className="text-amber-400" /> Тест-файл
          </button>
          <button onClick={() => void loadTrash()} className={`p-1.5 rounded-xl border transition cursor-pointer ${isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/10 text-white/80' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'}`} title="Обновить">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setConfirmEmpty(true)} disabled={items.length === 0} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/90 hover:bg-rose-500 disabled:opacity-35 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer">
            <Trash2 size={13} /> Очистить всё
          </button>
        </div>
      </div>

      {showMoveInput && (
        <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${isDark ? 'border-white/10 bg-cyan-500/10' : 'border-slate-200 bg-cyan-50'}`}>
          <FolderOpen size={15} className="text-cyan-400 shrink-0" />
          <input
            value={movePath}
            onChange={(e) => setMovePath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleMoveFromDisk()}
            placeholder="Путь к файлу или папке на ПК..."
            className="flex-1 bg-transparent text-xs outline-none"
          />
          <button onClick={() => void handleMoveFromDisk()} className="px-3 py-1 rounded-lg text-xs font-medium bg-cyan-500 text-white hover:bg-cyan-400 cursor-pointer">Удалить в Корзину</button>
          <button onClick={() => setShowMoveInput(false)} className={`p-1 rounded-lg ${subText} hover:opacity-100`}><X size={14} /></button>
        </div>
      )}

      {/* Search + Filters + Sorting + Bulk Bar */}
      <div className="px-4 py-2 flex flex-wrap items-center gap-2">
        <div className={`flex-1 min-w-[180px] flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'}`}>
          <Search size={14} className={subText} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по имени или пути..." className="flex-1 bg-transparent text-xs outline-none" />
        </div>
        <div className="flex items-center gap-1">
          {(
            [
              ['all', 'Все'],
              ['docs', 'Документы'],
              ['code', 'Код'],
              ['images', 'Фото'],
              ['folders', 'Папки'],
            ] as const
          ).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setCategory(k)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                category === k ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/35' : isDark ? 'bg-white/[0.04] text-white/55 hover:bg-white/10' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className={`px-2 py-1 rounded-lg text-[10px] border outline-none cursor-pointer ${isDark ? 'bg-white/[0.05] border-white/10 text-white' : 'bg-white border-slate-200'}`}>
          <option value="date" className="bg-zinc-900">Сначала новые</option>
          <option value="name" className="bg-zinc-900">По имени А→Я</option>
          <option value="size" className="bg-zinc-900">По размеру ↓</option>
        </select>
      </div>

      {/* Multi-select Bulk Actions Bar */}
      {selectedList.length > 0 && (
        <div className={`mx-4 mb-2 px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${isDark ? 'bg-cyan-500/12 border-cyan-400/30' : 'bg-cyan-50 border-cyan-200'}`}>
          <span className="font-semibold text-cyan-300">Выбрано объектов: {selectedList.length}</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => void handleBulkRestore()} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 flex items-center gap-1 cursor-pointer">
              <RotateCcw size={11} /> Восстановить ({selectedList.length})
            </button>
            <button onClick={() => void handleBulkDelete()} className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 flex items-center gap-1 cursor-pointer">
              <Trash2 size={11} /> Удалить ({selectedList.length})
            </button>
            <button onClick={() => setSelectedIds({})} className="px-2 py-1 rounded-lg bg-white/10 text-[10px] cursor-pointer">Сброс</button>
          </div>
        </div>
      )}

      {confirmEmpty && (
        <div className={`mx-4 mb-2 p-3 rounded-2xl border flex items-center justify-between gap-3 ${isDark ? 'bg-rose-500/15 border-rose-400/35 text-rose-100' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            <span>Удалить навсегда все {items.length} объ. ({formatBytes(totalBytes)}) и очистить Корзину Windows?</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setConfirmEmpty(false)} className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-white border border-slate-200'}`}>Отмена</button>
            <button onClick={() => void handleEmptyAll()} className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500 text-white hover:bg-rose-400 cursor-pointer">Да, очистить</button>
          </div>
        </div>
      )}

      {statusMsg && (
        <div className={`mx-4 mb-2 px-3 py-1.5 rounded-xl text-[11px] flex items-center justify-between ${isDark ? 'bg-white/[0.06] text-emerald-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          <span className="flex items-center gap-1.5 truncate"><CheckCircle2 size={13} /> {statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="opacity-60 hover:opacity-100 ml-2 cursor-pointer"><X size={12} /></button>
        </div>
      )}

      {/* Main Split: Items + Optional Inline Preview Drawer */}
      <div className="flex-1 flex min-h-0 overflow-hidden px-4 pb-4 gap-3">
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.length > 0 && (
            <div className="flex items-center justify-between text-[10px] px-1">
              <button
                onClick={() => {
                  const allChecked = filtered.every((f) => selectedIds[f.id]);
                  if (allChecked) setSelectedIds({});
                  else {
                    const m: Record<string, boolean> = {};
                    filtered.forEach((f) => { m[f.id] = true; });
                    setSelectedIds(m);
                  }
                }}
                className={`flex items-center gap-1 cursor-pointer ${subText} hover:text-cyan-400`}
              >
                <CheckSquare size={12} /> Выбрать все ({filtered.length})
              </button>
              <span className={`flex items-center gap-1 ${subText}`}><HardDrive size={11} className="text-cyan-400" /> Перетащите файлы сюда для удаления</span>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center py-10">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-3 border ${isDark ? 'bg-white/[0.04] border-white/10 text-white/30' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                <Trash2 size={28} />
              </div>
              <div className="text-sm font-semibold">{items.length === 0 ? 'Корзина абсолютно чиста' : 'Ничего не найдено'}</div>
              <div className={`text-xs mt-1 max-w-xs ${subText}`}>
                {items.length === 0
                  ? 'Удалённые файлы из Проводника Luma OS или перетащенные мышкой файлы появляются здесь. Можно посмотреть содержимое до восстановления.'
                  : 'Попробуйте изменить фильтр или поисковый запрос.'}
              </div>
            </div>
          ) : (
            filtered.map((item) => {
              const isDeleting = !!deletingIds[item.id];
              const checked = !!selectedIds[item.id];
              const cat = classifyTrashCategory(item);
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${cardBg} ${
                    checked ? 'ring-1 ring-cyan-400/60 bg-cyan-500/[0.07]' : ''
                  } ${isDeleting ? delClass : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => setSelectedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className="text-cyan-400 shrink-0 cursor-pointer"
                    >
                      {checked ? <CheckSquare size={15} /> : <Square size={15} className="opacity-40" />}
                    </button>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.is_dir ? 'bg-amber-500/15 text-amber-400' : cat === 'images' ? 'bg-pink-500/15 text-pink-400' : cat === 'code' ? 'bg-violet-500/15 text-violet-400' : 'bg-cyan-500/15 text-cyan-400'}`}>
                      {item.is_dir ? <Folder size={17} /> : cat === 'images' ? <ImageIcon size={17} /> : cat === 'code' ? <Code2 size={17} /> : <FileText size={17} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{item.name}</div>
                      <div className={`text-[10px] truncate ${subText}`}>Откуда: {item.original_path}</div>
                      <div className={`text-[10px] flex items-center gap-2 mt-0.5 ${subText}`}>
                        <span>{formatBytes(item.size_bytes)}</span>
                        <span>·</span>
                        <span>Удалено: {item.deleted_at}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => void handlePreview(item)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/15 text-sky-300' : 'bg-slate-100 border-slate-200 text-sky-700'}`}
                      title="Просмотреть содержимое перед восстановлением"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => void handleRestore(item)}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-400/25 flex items-center gap-1 transition cursor-pointer"
                    >
                      <RotateCcw size={12} /> Восстановить
                    </button>
                    <button
                      onClick={() => void handleDeletePermanent(item)}
                      className="p-1.5 rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-400/20 transition cursor-pointer"
                      title="Удалить навсегда"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Inline Preview Drawer */}
        {previewData && (
          <div className={`w-72 shrink-0 rounded-2xl border p-3 flex flex-col overflow-hidden ${isDark ? 'bg-zinc-950/90 border-white/12' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{previewData.item.name}</div>
                <div className={`text-[10px] ${subText}`}>{formatBytes(previewData.item.size_bytes)} · {previewData.item.deleted_at}</div>
              </div>
              <button onClick={() => setPreviewData(null)} className="p-1 opacity-60 hover:opacity-100 cursor-pointer"><X size={13} /></button>
            </div>
            <div className="flex-1 overflow-auto text-[11px]">
              {previewData.is_image && previewData.image_src ? (
                <img src={previewData.image_src} alt={previewData.item.name} className="w-full rounded-xl border border-white/10 object-contain" />
              ) : (
                <pre className="font-mono text-[10px] whitespace-pre-wrap break-words opacity-85 select-text">{previewData.preview}</pre>
              )}
            </div>
            <button
              onClick={() => void handleRestore(previewData.item)}
              className="mt-2 w-full py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={12} /> Восстановить файл
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
