import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ClipboardPaste,
  Columns,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileCode,
  FileImage,
  FilePlus,
  FileText,
  Film,
  Folder,
  FolderPlus,
  HardDrive,
  Home,
  Info,
  LayoutGrid,
  List,
  Monitor,
  Music,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Save,
  Scissors,
  Search,
  Star,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import { LiveDiskMetric, LiveSystemTelemetry } from '../data/launcherData';
import { PropertiesTarget } from './LumaSettingsExtra';

interface ExplorerEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  mod_time: string;
  ext: string;
  is_hidden: boolean;
}

interface QuickFolder {
  name: string;
  path: string;
  kind: string;
}

interface ExplorerTab {
  id: string;
  title: string;
  path: string;
  history: string[];
  histIdx: number;
}

function formatBytesRu(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${bytes} Б`;
}

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp'];
const CODE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.go', '.py', '.json', '.css', '.html', '.rs', '.cpp', '.c', '.cs', '.sh', '.ps1', '.yaml', '.yml', '.sql'];
const DOC_EXTS = ['.txt', '.md', '.log', '.ini', '.cfg', '.csv', '.xml', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const MEDIA_EXTS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.mp4', '.mkv', '.avi', '.mov', '.webm'];

function getFileIcon(entry: ExplorerEntry, cls = 'w-4 h-4') {
  if (entry.is_dir) return <Folder className={`${cls} text-[var(--luma-accent)]`} />;
  const ext = (entry.ext || '').toLowerCase();
  if (IMAGE_EXTS.includes(ext)) {
    return <FileImage className={`${cls} text-sky-400`} />;
  }
  if (['.mp3', '.wav', '.flac', '.ogg', '.m4a'].includes(ext)) {
    return <Music className={`${cls} text-emerald-400`} />;
  }
  if (['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext)) {
    return <Film className={`${cls} text-purple-400`} />;
  }
  if (CODE_EXTS.includes(ext)) {
    return <FileCode className={`${cls} text-amber-400`} />;
  }
  if (DOC_EXTS.includes(ext)) {
    return <FileText className={`${cls} text-zinc-400`} />;
  }
  return <File className={`${cls} text-zinc-400`} />;
}

function getQuickIcon(kind: string) {
  switch (kind) {
    case 'desktop':
      return <Monitor className="w-3.5 h-3.5 shrink-0" />;
    case 'downloads':
      return <Download className="w-3.5 h-3.5 shrink-0" />;
    case 'documents':
      return <FileText className="w-3.5 h-3.5 shrink-0" />;
    case 'pictures':
      return <FileImage className="w-3.5 h-3.5 shrink-0" />;
    case 'music':
      return <Music className="w-3.5 h-3.5 shrink-0" />;
    case 'videos':
      return <Film className="w-3.5 h-3.5 shrink-0" />;
    case 'drive':
      return <HardDrive className="w-3.5 h-3.5 shrink-0 text-[var(--luma-accent)]" />;
    case 'home':
      return <Home className="w-3.5 h-3.5 shrink-0" />;
    default:
      return <Folder className="w-3.5 h-3.5 shrink-0" />;
  }
}

export const LumaExplorerWindow: React.FC<{
  initialPath?: string;
  isDark: boolean;
  liveSystem: LiveSystemTelemetry | null;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  popoverShellCls: string;
  onInspectProperties: (target: PropertiesTarget) => void;
  onPinToDesktop: (entry: { name: string; path: string; is_dir: boolean }) => void;
  onPushToast: (title: string, msg: string, type?: 'info' | 'warning' | 'success') => void;
}> = ({
  initialPath,
  isDark,
  liveSystem,
  surfaceCls,
  btnCls,
  mutedCls,
  popoverShellCls,
  onInspectProperties,
  onPinToDesktop,
  onPushToast,
}) => {
  const [tabs, setTabs] = useState<ExplorerTab[]>([
    { id: 'tab_1', title: 'Домашняя', path: initialPath || '~', history: [initialPath || '~'], histIdx: 0 },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab_1');
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const [quickFolders, setQuickFolders] = useState<QuickFolder[]>([]);
  const [pinnedFolders, setPinnedFolders] = useState<{ name: string; path: string }[]>(() => {
    try {
      const raw = localStorage.getItem('luma_explorer_pinned_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [];
  });
  const [drives, setDrives] = useState<LiveDiskMetric[]>(liveSystem?.disks || []);
  const [entries, setEntries] = useState<ExplorerEntry[]>([]);
  const [parentPath, setParentPath] = useState<string>('');
  const [hiddenCount, setHiddenCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showHidden, setShowHidden] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'dirs' | 'images' | 'code' | 'docs' | 'media'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'tiles' | 'icons'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [addressDraft, setAddressDraft] = useState<string>(initialPath || '~');
  const [editingAddress, setEditingAddress] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchResults, setIsSearchResults] = useState<boolean>(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<{ mode: 'copy' | 'cut'; paths: string[] } | null>(null);
  const [extraShutters, setExtraShutters] = useState<{ id: string; initialPath: string }[]>([]);
  const [mainDropActive, setMainDropActive] = useState<boolean>(false);
  const [shutterRefreshTick, setShutterRefreshTick] = useState<number>(0);

  const transferFilesToDir = async (sourcePaths: string[], destDir: string, mode: 'move' | 'copy') => {
    const clean = sourcePaths.filter(Boolean);
    if (clean.length === 0 || !destDir) return;
    let okCount = 0;
    let lastErr = '';
    for (const src of clean) {
      const base = src.split(/[\\/]/).filter(Boolean).pop() || '';
      if (!base) continue;
      const sep = destDir.includes('\\') && !destDir.includes('/') ? '\\' : '/';
      const dest = destDir.endsWith(sep) ? `${destDir}${base}` : `${destDir}${sep}${base}`;
      if (src === dest) continue;
      try {
        const res = await fetch('/api/kernel/fs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: mode, path: src, dest }),
        });
        const data = await res.json();
        if (data?.ok) okCount++;
        else lastErr = data?.error || 'Ошибка операции';
      } catch {
        lastErr = 'Нет связи с ядром';
      }
    }
    if (okCount > 0) {
      onPushToast(
        'Проводник',
        mode === 'move' ? `Перемещено объектов: ${okCount}` : `Скопировано объектов: ${okCount}`,
        'success'
      );
      setShutterRefreshTick((t) => t + 1);
      // Refresh primary pane
      void fetchDirectory(activeTab.path, false);
    } else if (lastErr) {
      onPushToast('Проводник', lastErr, 'warning');
    }
  };
  const [preview, setPreview] = useState<{
    entry: ExplorerEntry;
    kind: 'text' | 'image';
    content?: string;
    loading?: boolean;
    editing?: boolean;
    saving?: boolean;
  } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; entry: ExplorerEntry } | null>(null);
  const [promptModal, setPromptModal] = useState<
    | { kind: 'mkdir' | 'newfile'; value: string }
    | { kind: 'rename'; entry: ExplorerEntry; value: string }
    | null
  >(null);

  useEffect(() => {
    try {
      localStorage.setItem('luma_explorer_pinned_v1', JSON.stringify(pinnedFolders));
    } catch {
      /* ignore */
    }
  }, [pinnedFolders]);

  const loadDrives = async () => {
    try {
      const r = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'drives' }),
      });
      const d = await r.json();
      if (d?.ok) {
        if (Array.isArray(d.quick_folders)) setQuickFolders(d.quick_folders);
        if (Array.isArray(d.disks) && d.disks.length > 0) setDrives(d.disks);
      }
    } catch {
      // ignore offline
    }
  };

  const fetchDirectory = async (targetPath: string, pushHistory = true) => {
    setLoading(true);
    setErrorMsg('');
    setIsSearchResults(false);
    setSelectedPaths([]);
    try {
      const r = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ls', path: targetPath, show_hidden: showHidden }),
      });
      const d = await r.json();
      if (!d?.ok) {
        setErrorMsg(d?.error || 'Не удалось открыть каталог');
      } else {
        const resolved = d.path || targetPath;
        setEntries(Array.isArray(d.entries) ? d.entries : []);
        setParentPath(d.parent || '');
        setHiddenCount(typeof d.hidden_count === 'number' ? d.hidden_count : 0);
        setAddressDraft(resolved);
        const parts = resolved.split(/[\\/]/).filter(Boolean);
        const title = parts[parts.length - 1] || resolved;
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== activeTabId) return t;
            if (!pushHistory) return { ...t, path: resolved, title };
            const nextHist = [...t.history.slice(0, t.histIdx + 1), resolved];
            return { ...t, path: resolved, title, history: nextHist, histIdx: nextHist.length - 1 };
          })
        );
      }
    } catch {
      setErrorMsg('Файловая служба LumaCore недоступна');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrives();
  }, []);

  useEffect(() => {
    if (initialPath) {
      fetchDirectory(initialPath, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPath]);

  useEffect(() => {
    fetchDirectory(activeTab.path, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, showHidden]);

  const handleBack = () => {
    if (activeTab.histIdx <= 0) return;
    const nextIdx = activeTab.histIdx - 1;
    const target = activeTab.history[nextIdx];
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, histIdx: nextIdx, path: target } : t)));
    fetchDirectory(target, false);
  };

  const handleForward = () => {
    if (activeTab.histIdx >= activeTab.history.length - 1) return;
    const nextIdx = activeTab.histIdx + 1;
    const target = activeTab.history[nextIdx];
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, histIdx: nextIdx, path: target } : t)));
    fetchDirectory(target, false);
  };

  const handleDeepSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      fetchDirectory(activeTab.path, false);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const r = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', path: activeTab.path, query: q, show_hidden: showHidden }),
      });
      const d = await r.json();
      if (d?.ok) {
        setEntries(Array.isArray(d.entries) ? d.entries : []);
        setIsSearchResults(true);
      }
    } catch {
      setErrorMsg('Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEntry = async (entry: ExplorerEntry) => {
    if (entry.is_dir) {
      fetchDirectory(entry.path, true);
      return;
    }
    const ext = (entry.ext || '').toLowerCase();
    if (IMAGE_EXTS.includes(ext)) {
      setPreview({ entry, kind: 'image', loading: false });
      return;
    }
    const textExts = [...CODE_EXTS, '.txt', '.md', '.log', '.ini', '.cfg', '.csv', '.xml', '.env', '.gitignore'];
    if (textExts.includes(ext) || entry.size < 65536) {
      setPreview({ entry, kind: 'text', loading: true, editing: false });
      try {
        const r = await fetch('/api/kernel/fs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cat', path: entry.path }),
        });
        const d = await r.json();
        if (d?.ok) {
          setPreview({ entry, kind: 'text', content: d.content || '', loading: false, editing: false });
          return;
        }
      } catch {
        // fallback to OS open
      }
    }
    handleOpenInOS(entry.path);
  };

  const handleSavePreviewFile = async () => {
    if (!preview || preview.kind !== 'text') return;
    setPreview((p) => (p ? { ...p, saving: true } : null));
    try {
      const r = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'newfile',
          path: preview.entry.path,
          content: preview.content || '',
        }),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast('Проводник Pro', `Файл «${preview.entry.name}» сохранён`, 'success');
        setPreview((p) => (p ? { ...p, editing: false, saving: false } : null));
        void fetchDirectory(activeTab.path, false);
      } else {
        onPushToast('Ошибка сохранения', d?.error || 'Не удалось сохранить файл', 'warning');
        setPreview((p) => (p ? { ...p, saving: false } : null));
      }
    } catch {
      onPushToast('Ошибка сохранения', 'Файловая служба недоступна', 'warning');
      setPreview((p) => (p ? { ...p, saving: false } : null));
    }
  };

  const togglePinCurrentFolder = () => {
    const cur = activeTab.path;
    if (!cur) return;
    setPinnedFolders((prev) => {
      if (prev.some((f) => f.path === cur)) {
        onPushToast('Проводник', `Папка откреплена из избранного`, 'info');
        return prev.filter((f) => f.path !== cur);
      }
      const name = cur.split(/[\\/]/).filter(Boolean).pop() || cur;
      onPushToast('Проводник', `Папка «${name}» закреплена в избранном`, 'success');
      return [...prev, { name, path: cur }];
    });
  };

  const handleOpenInOS = async (path: string) => {
    try {
      await fetch('/api/kernel/open-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      onPushToast('Проводник', `Открыто: ${path.split(/[\\/]/).pop() || path}`, 'info');
    } catch {
      onPushToast('Проводник', 'Не удалось запустить файл в ОС', 'warning');
    }
  };

  const handlePaste = async () => {
    if (!clipboard || clipboard.paths.length === 0) return;
    let okCount = 0;
    for (const src of clipboard.paths) {
      try {
        const r = await fetch('/api/kernel/fs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: clipboard.mode === 'cut' ? 'move' : 'copy',
            path: src,
            target_path: activeTab.path,
          }),
        });
        const d = await r.json();
        if (d?.ok) okCount++;
      } catch {
        // ignore
      }
    }
    if (clipboard.mode === 'cut') setClipboard(null);
    onPushToast('Проводник', `${clipboard.mode === 'cut' ? 'Перемещено' : 'Скопировано'}: ${okCount}`, 'success');
    fetchDirectory(activeTab.path, false);
  };

  const handleDeleteSelected = async (pathsToDelete: string[]) => {
    if (pathsToDelete.length === 0) return;
    let deleted = 0;
    for (const p of pathsToDelete) {
      try {
        const r = await fetch('/api/kernel/fs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', path: p }),
        });
        const d = await r.json();
        if (d?.ok) deleted++;
      } catch {
        // ignore
      }
    }
    if (deleted > 0) {
      onPushToast('Проводник', `Удалено объектов: ${deleted}`, 'info');
      setSelectedPaths([]);
      if (preview && pathsToDelete.includes(preview.entry.path)) setPreview(null);
      fetchDirectory(activeTab.path, false);
    }
  };

  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptModal || !promptModal.value.trim()) return;
    const val = promptModal.value.trim();
    try {
      const body =
        promptModal.kind === 'rename'
          ? { action: 'rename', path: promptModal.entry.path, name: val }
          : { action: promptModal.kind, path: activeTab.path, name: val };
      const r = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast(
          'Проводник',
          promptModal.kind === 'mkdir'
            ? `Папка «${val}» создана`
            : promptModal.kind === 'newfile'
            ? `Файл «${val}» создан`
            : `Переименовано в «${val}»`,
          'success'
        );
        setPromptModal(null);
        fetchDirectory(activeTab.path, false);
      } else {
        onPushToast('Ошибка', d?.error || 'Операция не выполнена', 'warning');
      }
    } catch {
      onPushToast('Ошибка', 'Не удалось выполнить операцию', 'warning');
    }
  };

  const visibleEntries = useMemo(() => {
    const q = !isSearchResults ? searchQuery.trim().toLowerCase() : '';
    const list = entries.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q)) return false;
      const ext = (e.ext || '').toLowerCase();
      if (typeFilter === 'dirs') return e.is_dir;
      if (typeFilter === 'images') return !e.is_dir && IMAGE_EXTS.includes(ext);
      if (typeFilter === 'code') return !e.is_dir && CODE_EXTS.includes(ext);
      if (typeFilter === 'docs') return !e.is_dir && DOC_EXTS.includes(ext);
      if (typeFilter === 'media') return !e.is_dir && MEDIA_EXTS.includes(ext);
      return true;
    });
    return [...list].sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'ru');
      else if (sortBy === 'size') cmp = a.size - b.size;
      else if (sortBy === 'type') cmp = (a.ext || '').localeCompare(b.ext || '');
      else cmp = (a.mod_time || '').localeCompare(b.mod_time || '');
      return sortAsc ? cmp : -cmp;
    });
  }, [entries, searchQuery, isSearchResults, typeFilter, sortBy, sortAsc]);

  const breadcrumbs = useMemo(() => {
    const raw = activeTab.path || '';
    if (raw.startsWith('/')) {
      const segs = raw.split('/').filter(Boolean);
      const list = [{ label: '/', path: '/' }];
      let acc = '';
      segs.forEach((s) => {
        acc += '/' + s;
        list.push({ label: s, path: acc });
      });
      return list;
    }
    const segs = raw.split('\\').filter(Boolean);
    const list: { label: string; path: string }[] = [];
    let acc = '';
    segs.forEach((s, i) => {
      acc = i === 0 ? s + '\\' : acc.replace(/\\$/, '') + '\\' + s;
      list.push({ label: s, path: acc });
    });
    return list;
  }, [activeTab.path]);

  const singleSelectedEntry =
    selectedPaths.length === 1 ? entries.find((e) => e.path === selectedPaths[0]) || null : null;

  return (
    <div
      onClick={() => setCtxMenu(null)}
      className="h-full flex flex-col min-h-0 text-xs select-none"
    >
      {/* 1. WINDOWS 11 MULTI-TAB STRIP */}
      <div className={`px-2 pt-1.5 flex items-center gap-1 border-b shrink-0 ${isDark ? 'border-white/[0.08] bg-black/20' : 'border-zinc-900/[0.1] bg-black/[0.03]'}`}>
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group px-3 py-1.5 rounded-t-xl border border-b-0 flex items-center gap-2 max-w-[180px] cursor-pointer transition ${
                active
                  ? `${surfaceCls} font-semibold`
                  : isDark
                  ? 'border-transparent text-zinc-400 hover:bg-white/[0.05]'
                  : 'border-transparent text-zinc-600 hover:bg-zinc-900/[0.05]'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
              <span className="truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rest = tabs.filter((t) => t.id !== tab.id);
                    setTabs(rest);
                    if (activeTabId === tab.id) setActiveTabId(rest[0].id);
                  }}
                  className="p-0.5 rounded hover:bg-white/15 opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={() => {
            const id = `tab_${Date.now()}`;
            setTabs((p) => [...p, { id, title: 'Домашняя', path: '~', history: ['~'], histIdx: 0 }]);
            setActiveTabId(id);
          }}
          title="Новая вкладка Проводника"
          className={`p-1.5 rounded-lg mb-1 cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/10'}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. WINDOWS NAVIGATION BAR (BACK / FORWARD / UP / REFRESH + BREADCRUMBS + SEARCH) */}
      <div className={`px-3 py-2 border-b flex flex-wrap items-center gap-1.5 shrink-0 ${isDark ? 'border-white/[0.08]' : 'border-zinc-900/[0.1]'}`}>
        <button disabled={activeTab.histIdx <= 0} onClick={handleBack} title="Назад" className={`p-1.5 rounded-lg border disabled:opacity-35 cursor-pointer ${btnCls}`}>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button disabled={activeTab.histIdx >= activeTab.history.length - 1} onClick={handleForward} title="Вперёд" className={`p-1.5 rounded-lg border disabled:opacity-35 cursor-pointer ${btnCls}`}>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button disabled={!parentPath} onClick={() => parentPath && fetchDirectory(parentPath, true)} title="На уровень вверх" className={`p-1.5 rounded-lg border disabled:opacity-35 cursor-pointer ${btnCls}`}>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => fetchDirectory(activeTab.path, false)} title="Обновить" className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Address Bar / Breadcrumbs */}
        <div
          onClick={() => setEditingAddress(true)}
          className={`flex-1 min-w-[200px] h-8 px-2.5 rounded-xl border flex items-center gap-1 overflow-x-auto no-scrollbar ${btnCls}`}
        >
          {editingAddress ? (
            <form
              className="w-full flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                setEditingAddress(false);
                fetchDirectory(addressDraft, true);
              }}
            >
              <input
                autoFocus
                value={addressDraft}
                onChange={(e) => setAddressDraft(e.target.value)}
                onBlur={() => setEditingAddress(false)}
                className="w-full bg-transparent font-mono text-xs outline-none"
              />
            </form>
          ) : (
            <div className="flex items-center gap-1 font-mono text-[11px] whitespace-nowrap">
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={b.path}>
                  {idx > 0 && <span className="opacity-40">/</span>}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchDirectory(b.path, true);
                    }}
                    className={`px-1.5 py-0.5 rounded hover:bg-[var(--luma-accent-soft)] hover:text-[var(--luma-accent)] cursor-pointer ${
                      idx === breadcrumbs.length - 1 ? 'font-bold' : mutedCls
                    }`}
                  >
                    {b.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Search Input + Recursive Deep Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDeepSearch();
          }}
          className={`w-56 h-8 px-2.5 rounded-xl border flex items-center gap-1.5 ${btnCls}`}
        >
          <Search className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim() && isSearchResults) fetchDirectory(activeTab.path, false);
            }}
            placeholder="Поиск файлов..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                if (isSearchResults) fetchDirectory(activeTab.path, false);
              }}
              className="text-zinc-500 hover:text-current cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </form>
      </div>

      {/* 3. WINDOWS COMMAND BAR (NEW / CUT / COPY / PASTE / RENAME / DELETE / HIDDEN / VIEW) */}
      <div className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${isDark ? 'border-white/[0.08] bg-white/[0.015]' : 'border-zinc-900/[0.09] bg-black/[0.02]'}`}>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setPromptModal({ kind: 'mkdir', value: 'Новая папка' })}
            className="px-2.5 py-1 rounded-lg bg-[var(--luma-accent)] text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" /> Папка
          </button>
          <button
            onClick={() => setPromptModal({ kind: 'newfile', value: 'Новый документ.txt' })}
            className={`px-2.5 py-1 rounded-lg border font-medium inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
          >
            <FilePlus className="w-3.5 h-3.5" /> Файл
          </button>

          <span className={`w-px h-4 mx-1 ${isDark ? 'bg-white/15' : 'bg-zinc-900/15'}`} />

          <button
            disabled={selectedPaths.length === 0}
            onClick={() => {
              setClipboard({ mode: 'cut', paths: selectedPaths });
              onPushToast('Проводник', `Вырезано: ${selectedPaths.length}`, 'info');
            }}
            title="Вырезать"
            className={`p-1.5 rounded-lg border disabled:opacity-35 cursor-pointer ${btnCls}`}
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={selectedPaths.length === 0}
            onClick={() => {
              setClipboard({ mode: 'copy', paths: selectedPaths });
              onPushToast('Проводник', `Скопировано: ${selectedPaths.length}`, 'info');
            }}
            title="Копировать"
            className={`p-1.5 rounded-lg border disabled:opacity-35 cursor-pointer ${btnCls}`}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={!clipboard}
            onClick={handlePaste}
            title="Вставить сюда"
            className={`px-2 py-1 rounded-lg border disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
            {clipboard ? `Вставить (${clipboard.paths.length})` : ''}
          </button>
          <button
            disabled={!singleSelectedEntry}
            onClick={() => singleSelectedEntry && setPromptModal({ kind: 'rename', entry: singleSelectedEntry, value: singleSelectedEntry.name })}
            title="Переименовать"
            className={`p-1.5 rounded-lg border disabled:opacity-35 cursor-pointer ${btnCls}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={selectedPaths.length === 0}
            onClick={() => handleDeleteSelected(selectedPaths)}
            title="Удалить"
            className="p-1.5 rounded-lg border border-[var(--luma-accent-border)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] disabled:opacity-35 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={!singleSelectedEntry}
            onClick={() =>
              singleSelectedEntry &&
              onInspectProperties({
                label: singleSelectedEntry.name,
                path: singleSelectedEntry.path,
                kind: singleSelectedEntry.is_dir ? 'disk_folder' : 'file',
                onDelete: () => handleDeleteSelected([singleSelectedEntry.path]),
                onPinToDesktop: () => onPinToDesktop(singleSelectedEntry),
              })
            }
            title="Свойства"
            className={`p-1.5 rounded-lg border disabled:opacity-35 cursor-pointer ${btnCls}`}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Open Multiple Side-by-Side Shutters for Easy Drag & Drop Moving Between Folders! */}
          <button
            type="button"
            disabled={extraShutters.length >= 2}
            onClick={() => {
              const defaultNext = quickFolders.find((q) => q.path !== activeTab.path)?.path || activeTab.path || '~';
              setExtraShutters((prev) => [...prev, { id: `sh_${Date.now()}`, initialPath: defaultNext }]);
            }}
            title="Открыть дополнительную шторку рядом для удобного перетаскивания файлов между папками (до 3 шторок)"
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition disabled:opacity-40 ${
              extraShutters.length > 0
                ? 'border-[var(--luma-accent)] bg-[var(--luma-accent)] text-white shadow-sm'
                : btnCls
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>+ Шторка ({extraShutters.length + 1}/3)</span>
          </button>

          {/* Pin Current Folder to Sidebar Favorites */}
          <button
            onClick={togglePinCurrentFolder}
            title="Закрепить текущую папку в избранном"
            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
              pinnedFolders.some((f) => f.path === activeTab.path)
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-400'
                : btnCls
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Избранное</span>
          </button>

          {/* Show ALL Hidden System Files Toggle */}
          <button
            onClick={() => setShowHidden((v) => !v)}
            title="Показывать все скрытые и системные файлы"
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              showHidden ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
            }`}
          >
            {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Скрытые: {showHidden ? 'ВКЛ' : 'ВЫКЛ'}
          </button>

          {/* View Mode */}
          <div className={`flex items-center p-0.5 rounded-lg border ${btnCls}`}>
            {(
              [
                ['table', <Table2 className="w-3.5 h-3.5" />, 'Таблица'],
                ['tiles', <List className="w-3.5 h-3.5" />, 'Плитка'],
                ['icons', <LayoutGrid className="w-3.5 h-3.5" />, 'Значки'],
              ] as const
            ).map(([m, ic, label]) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                title={label}
                className={`p-1 rounded-md cursor-pointer ${viewMode === m ? 'bg-[var(--luma-accent)] text-white' : ''}`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3b. QUICK FILE-TYPE FILTER CHIPS BAR */}
      <div className={`px-3 py-1 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${isDark ? 'border-white/[0.06] bg-black/15' : 'border-zinc-900/[0.07] bg-black/[0.015]'}`}>
        <span className={`text-[10px] font-mono uppercase mr-1 shrink-0 ${mutedCls}`}>Фильтр:</span>
        {(
          [
            ['all', 'Все файлы'],
            ['dirs', 'Папки'],
            ['images', 'Изображения'],
            ['code', 'Код'],
            ['docs', 'Документы'],
            ['media', 'Медиа'],
          ] as const
        ).map(([fid, label]) => (
          <button
            key={fid}
            onClick={() => setTypeFilter(fid)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 cursor-pointer transition ${
              typeFilter === fid
                ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                : btnCls
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 4. MAIN BODY: LEFT SIDEBAR + CENTER FILE VIEW + OPTIONAL PREVIEW */}
      <div className="flex-1 min-h-0 flex">
        {/* Left Navigation Tree (Pinned Favorites + Quick Access + This PC Drives) */}
        <aside className={`w-52 shrink-0 border-r p-2.5 overflow-y-auto space-y-3 ${isDark ? 'border-white/[0.08] bg-white/[0.015]' : 'border-zinc-900/[0.1] bg-black/[0.025]'}`}>
          {pinnedFolders.length > 0 && (
            <div className="space-y-0.5">
              <div className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-amber-400`}>Избранное</div>
              {pinnedFolders.map((pf) => (
                <div
                  key={pf.path}
                  className={`group w-full px-2 py-1.5 rounded-lg flex items-center justify-between gap-1.5 transition cursor-pointer ${
                    activeTab.path === pf.path
                      ? 'bg-[var(--luma-accent)] text-white font-semibold'
                      : isDark
                      ? 'text-zinc-200 hover:bg-white/[0.06]'
                      : 'text-zinc-800 hover:bg-zinc-900/[0.07]'
                  }`}
                  onClick={() => fetchDirectory(pf.path, true)}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{pf.name}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinnedFolders((prev) => prev.filter((x) => x.path !== pf.path));
                    }}
                    title="Убрать из избранного"
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/20 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-0.5">
            <div className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Быстрый доступ</div>
            {quickFolders
              .filter((q) => q.kind !== 'drive')
              .map((q) => (
                <button
                  key={q.path}
                  onClick={() => fetchDirectory(q.path, true)}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-2 transition cursor-pointer ${
                    activeTab.path === q.path
                      ? 'bg-[var(--luma-accent)] text-white font-semibold'
                      : isDark
                      ? 'text-zinc-300 hover:bg-white/[0.06]'
                      : 'text-zinc-800 hover:bg-zinc-900/[0.07]'
                  }`}
                >
                  {getQuickIcon(q.kind)}
                  <span className="truncate">{q.name}</span>
                </button>
              ))}
          </div>

          <div className="space-y-1">
            <div className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${mutedCls}`}>Этот компьютер</div>
            {drives.map((d) => {
              const mountPath = d.mount.endsWith(':') ? d.mount + '\\' : d.mount;
              return (
                <button
                  key={d.mount}
                  onClick={() => fetchDirectory(mountPath, true)}
                  className={`w-full p-2 rounded-xl border text-left space-y-1 transition cursor-pointer ${
                    activeTab.path.startsWith(mountPath) && mountPath.length > 1
                      ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                      : btnCls
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5 font-semibold truncate">
                      <HardDrive className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
                      {d.mount}
                    </span>
                    <span className="text-[10px] font-mono">{d.percent}%</span>
                  </div>
                  <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-zinc-900/15'}`}>
                    <div className="h-full bg-[var(--luma-accent)]" style={{ width: `${d.percent}%` }} />
                  </div>
                  <div className={`text-[9px] font-mono ${mutedCls}`}>
                    Свободно {d.free_gb.toFixed(1)} из {d.total_gb.toFixed(0)} ГБ
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center File List (Primary Shutter — supports Drag & Drop from any other shutter!) */}
        <div
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('application/x-luma-fs')) {
              e.preventDefault();
              setMainDropActive(true);
            }
          }}
          onDragLeave={() => setMainDropActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setMainDropActive(false);
            const raw = e.dataTransfer.getData('application/x-luma-fs');
            if (!raw) return;
            try {
              const paths = JSON.parse(raw) as string[];
              void transferFilesToDir(paths, activeTab.path, e.ctrlKey || e.altKey ? 'copy' : 'move');
            } catch {
              /* ignore */
            }
          }}
          className={`flex-1 min-w-0 overflow-y-auto p-3 transition ${
            mainDropActive ? 'ring-2 ring-inset ring-[var(--luma-accent)] bg-[var(--luma-accent)]/10' : ''
          }`}
        >
          {errorMsg ? (
            <div className={`p-6 rounded-xl border text-center space-y-2 ${surfaceCls}`}>
              <div className="font-bold text-[var(--luma-accent)]">{errorMsg}</div>
              <button onClick={() => fetchDirectory('~', true)} className={`px-3 py-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
                Вернуться в домашнюю папку
              </button>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className={`py-14 text-center font-mono ${mutedCls}`}>
              {loading ? 'Загрузка файлов...' : 'Эта папка пуста'}
            </div>
          ) : viewMode === 'table' ? (
            <div className={`rounded-xl border overflow-hidden ${surfaceCls}`}>
              <div className={`grid grid-cols-12 gap-2 px-3 py-2 border-b text-[10px] font-mono uppercase tracking-wider ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-zinc-900/10 bg-black/[0.02]'} ${mutedCls}`}>
                {(
                  [
                    ['name', 'Имя', 'col-span-6'],
                    ['date', 'Дата изменения', 'col-span-2'],
                    ['type', 'Тип', 'col-span-2'],
                    ['size', 'Размер', 'col-span-2 text-right'],
                  ] as const
                ).map(([col, label, span]) => (
                  <button
                    key={col}
                    onClick={() => {
                      if (sortBy === col) setSortAsc((v) => !v);
                      else {
                        setSortBy(col);
                        setSortAsc(true);
                      }
                    }}
                    className={`${span} text-left hover:text-current cursor-pointer`}
                  >
                    {label} {sortBy === col ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                ))}
              </div>
              <div className={`divide-y ${isDark ? 'divide-white/[0.05]' : 'divide-zinc-900/[0.07]'}`}>
                {visibleEntries.map((entry) => {
                  const sel = selectedPaths.includes(entry.path);
                  return (
                    <div
                      key={entry.path}
                      draggable
                      onDragStart={(e) => {
                        const dragList = sel ? selectedPaths : [entry.path];
                        e.dataTransfer.setData('application/x-luma-fs', JSON.stringify(dragList));
                        e.dataTransfer.effectAllowed = 'copyMove';
                      }}
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          setSelectedPaths((p) => (p.includes(entry.path) ? p.filter((x) => x !== entry.path) : [...p, entry.path]));
                        } else {
                          setSelectedPaths([entry.path]);
                        }
                      }}
                      onDoubleClick={() => handleOpenEntry(entry)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedPaths([entry.path]);
                        setCtxMenu({ x: e.clientX, y: e.clientY, entry });
                      }}
                      className={`grid grid-cols-12 gap-2 px-3 py-2 items-center cursor-pointer transition ${
                        sel
                          ? 'bg-[var(--luma-accent-soft)]'
                          : isDark
                          ? 'hover:bg-white/[0.04]'
                          : 'hover:bg-zinc-900/[0.04]'
                      }`}
                    >
                      <div className={`col-span-6 flex items-center gap-2 min-w-0 ${entry.is_hidden ? 'opacity-70' : ''}`}>
                        {getFileIcon(entry, 'w-4 h-4 shrink-0')}
                        <span className="truncate font-medium">{entry.name}</span>
                        {entry.is_hidden && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-500/20 text-[9px] font-mono uppercase shrink-0">
                            скрытый
                          </span>
                        )}
                      </div>
                      <div className={`col-span-2 font-mono text-[11px] truncate ${mutedCls}`}>{entry.mod_time || '—'}</div>
                      <div className={`col-span-2 font-mono text-[11px] truncate ${mutedCls}`}>
                        {entry.is_dir ? 'Папка' : entry.ext ? entry.ext.toUpperCase().slice(1) : 'Файл'}
                      </div>
                      <div className={`col-span-2 font-mono text-[11px] text-right ${mutedCls}`}>
                        {entry.is_dir ? '—' : formatBytesRu(entry.size)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'tiles' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {visibleEntries.map((entry) => {
                const sel = selectedPaths.includes(entry.path);
                return (
                  <div
                    key={entry.path}
                    onClick={() => setSelectedPaths([entry.path])}
                    onDoubleClick={() => handleOpenEntry(entry)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedPaths([entry.path]);
                      setCtxMenu({ x: e.clientX, y: e.clientY, entry });
                    }}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${surfaceCls} ${
                      sel ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : ''
                    } ${entry.is_hidden ? 'opacity-75' : ''}`}
                  >
                    {getFileIcon(entry, 'w-6 h-6 shrink-0')}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{entry.name}</div>
                      <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                        {entry.is_dir ? 'Папка' : formatBytesRu(entry.size)} {entry.is_hidden ? '· скрытый' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {visibleEntries.map((entry) => {
                const sel = selectedPaths.includes(entry.path);
                return (
                  <div
                    key={entry.path}
                    onClick={() => setSelectedPaths([entry.path])}
                    onDoubleClick={() => handleOpenEntry(entry)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedPaths([entry.path]);
                      setCtxMenu({ x: e.clientX, y: e.clientY, entry });
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center cursor-pointer transition ${surfaceCls} ${
                      sel ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : ''
                    } ${entry.is_hidden ? 'opacity-70' : ''}`}
                  >
                    {getFileIcon(entry, 'w-8 h-8')}
                    <div className="text-[11px] font-medium line-clamp-2 break-all leading-tight">{entry.name}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right File Preview Pane (Image Preview + Editable Text/Code Quick Save) */}
        {preview && (
          <aside className={`w-80 shrink-0 border-l p-3 flex flex-col gap-2 min-h-0 ${isDark ? 'border-white/[0.08] bg-black/20' : 'border-zinc-900/[0.1] bg-black/[0.025]'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold truncate">{preview.entry.name}</span>
              <div className="flex items-center gap-1">
                {preview.kind === 'text' && !preview.loading && (
                  <button
                    onClick={() => setPreview((p) => (p ? { ...p, editing: !p.editing } : null))}
                    title={preview.editing ? 'Режим просмотра' : 'Редактировать файл'}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                      preview.editing ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                    }`}
                  >
                    <Pencil className="w-3 h-3" />
                    {preview.editing ? 'Просмотр' : 'Править'}
                  </button>
                )}
                <button onClick={() => setPreview(null)} className={`p-1 rounded-lg border cursor-pointer ${btnCls}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className={`text-[10px] font-mono space-y-0.5 ${mutedCls}`}>
              <div>Размер: {formatBytesRu(preview.entry.size)}</div>
              <div>Изменён: {preview.entry.mod_time || '—'}</div>
            </div>

            {preview.kind === 'image' ? (
              <div className={`flex-1 min-h-0 rounded-xl border p-2 flex items-center justify-center overflow-hidden ${surfaceCls}`}>
                <img
                  src={`/api/kernel/fs/raw?path=${encodeURIComponent(preview.entry.path)}`}
                  alt={preview.entry.name}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            ) : preview.editing ? (
              <textarea
                value={preview.content || ''}
                onChange={(e) => setPreview((p) => (p ? { ...p, content: e.target.value } : null))}
                spellCheck={false}
                className={`flex-1 min-h-0 p-2.5 rounded-xl border text-[10px] font-mono leading-relaxed outline-none resize-none ${surfaceCls}`}
              />
            ) : (
              <pre className={`flex-1 min-h-0 overflow-auto p-2.5 rounded-xl border text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all ${surfaceCls}`}>
                {preview.loading ? 'Чтение...' : preview.content || '(пустой файл)'}
              </pre>
            )}

            <div className="flex items-center gap-1.5">
              {preview.kind === 'text' && preview.editing && (
                <button
                  disabled={preview.saving}
                  onClick={() => void handleSavePreviewFile()}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {preview.saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              )}
              <button
                onClick={() => handleOpenInOS(preview.entry.path)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--luma-accent)] text-white font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Открыть в ОС
              </button>
            </div>
          </aside>
        )}

        {/* Extra Side-by-Side Folder Shutters (Multi-Pane Drag & Drop File Transfer!) */}
        {extraShutters.map((sh, idx) => (
          <ExplorerShutterPane
            key={sh.id}
            shutterNumber={idx + 2}
            initialPath={sh.initialPath}
            quickFolders={quickFolders}
            drives={drives}
            isDark={isDark}
            surfaceCls={surfaceCls}
            btnCls={btnCls}
            mutedCls={mutedCls}
            primarySelectedPaths={selectedPaths}
            primaryDirPath={activeTab.path}
            refreshTick={shutterRefreshTick}
            onTransfer={(paths, destDir, mode) => void transferFilesToDir(paths, destDir, mode)}
            onClose={() => setExtraShutters((prev) => prev.filter((x) => x.id !== sh.id))}
          />
        ))}
      </div>

      {/* 5. WINDOWS STATUS BAR */}
      <div className={`px-3 py-1.5 border-t flex items-center justify-between text-[10px] font-mono shrink-0 ${isDark ? 'border-white/[0.08]' : 'border-zinc-900/[0.1]'} ${mutedCls}`}>
        <div className="flex items-center gap-3">
          <span>Элементов: {visibleEntries.length}</span>
          <span>Скрытых в папке: {hiddenCount}</span>
          {selectedPaths.length > 0 && <span className="text-[var(--luma-accent)] font-bold">Выбрано: {selectedPaths.length}</span>}
          {extraShutters.length > 0 && <span className="text-emerald-400 font-bold">Шторок: {extraShutters.length + 1} (перетащите файл для переноса)</span>}
        </div>
        <span className="truncate max-w-[320px]">{isSearchResults ? `Поиск: «${searchQuery}»` : activeTab.path}</span>
      </div>

      {/* RIGHT-CLICK FILE CONTEXT MENU */}
      {ctxMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            left: Math.min(ctxMenu.x, window.innerWidth - 220),
            top: Math.min(ctxMenu.y, window.innerHeight - 280),
          }}
          className={`fixed z-[9500] w-52 border p-1.5 space-y-0.5 text-xs ${popoverShellCls}`}
        >
          <button
            onClick={() => {
              handleOpenEntry(ctxMenu.entry);
              setCtxMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[var(--luma-accent-soft)] text-left font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5 text-[var(--luma-accent)]" /> Открыть
          </button>
          <button
            onClick={() => {
              handleOpenInOS(ctxMenu.entry.path);
              setCtxMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Открыть в ОС
          </button>
          <button
            onClick={() => {
              onPinToDesktop(ctxMenu.entry);
              setCtxMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 cursor-pointer"
          >
            <Pin className="w-3.5 h-3.5" /> На рабочий стол
          </button>
          <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`} />
          <button
            onClick={() => {
              setClipboard({ mode: 'cut', paths: [ctxMenu.entry.path] });
              setCtxMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" /> Вырезать
          </button>
          <button
            onClick={() => {
              setClipboard({ mode: 'copy', paths: [ctxMenu.entry.path] });
              setCtxMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> Копировать
          </button>
          <button
            onClick={() => {
              setPromptModal({ kind: 'rename', entry: ctxMenu.entry, value: ctxMenu.entry.name });
              setCtxMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" /> Переименовать
          </button>
          <button
            onClick={() => {
              onInspectProperties({
                label: ctxMenu.entry.name,
                path: ctxMenu.entry.path,
                kind: ctxMenu.entry.is_dir ? 'disk_folder' : 'file',
                onDelete: () => handleDeleteSelected([ctxMenu.entry.path]),
                onPinToDesktop: () => onPinToDesktop(ctxMenu.entry),
              });
              setCtxMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-[var(--luma-accent)]" /> Свойства
          </button>
          <button
            onClick={() => {
              handleDeleteSelected([ctxMenu.entry.path]);
              setCtxMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold text-left flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Удалить
          </button>
        </div>
      )}

      {/* CREATE / RENAME MODAL */}
      {promptModal && (
        <div onClick={() => setPromptModal(null)} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmitPrompt}
            onClick={(e) => e.stopPropagation()}
            className={`luma-animate-in w-full max-w-sm border p-4 space-y-3 ${popoverShellCls}`}
          >
            <div className="font-bold text-sm">
              {promptModal.kind === 'mkdir'
                ? 'Создать новую папку'
                : promptModal.kind === 'newfile'
                ? 'Создать новый файл'
                : 'Переименовать'}
            </div>
            <input
              autoFocus
              value={promptModal.value}
              onChange={(e) => setPromptModal({ ...promptModal, value: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${btnCls}`}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPromptModal(null)} className={`px-3 py-1.5 rounded-lg border cursor-pointer ${btnCls}`}>
                Отмена
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-lg bg-[var(--luma-accent)] text-white font-semibold cursor-pointer">
                Применить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const ExplorerShutterPane: React.FC<{
  shutterNumber: number;
  initialPath: string;
  quickFolders: QuickFolder[];
  drives: LiveDiskMetric[];
  isDark: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  primarySelectedPaths: string[];
  primaryDirPath: string;
  refreshTick: number;
  onTransfer: (paths: string[], destDir: string, mode: 'move' | 'copy') => void;
  onClose: () => void;
}> = ({
  shutterNumber,
  initialPath,
  quickFolders,
  drives,
  isDark,
  surfaceCls,
  btnCls,
  mutedCls,
  primarySelectedPaths,
  primaryDirPath,
  refreshTick,
  onTransfer,
  onClose,
}) => {
  const [curPath, setCurPath] = useState(initialPath || '~');
  const [parentDir, setParentDir] = useState('');
  const [items, setItems] = useState<ExplorerEntry[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropHover, setDropHover] = useState(false);

  const loadDir = async (p: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/kernel/fs?path=${encodeURIComponent(p)}`);
      if (r.ok) {
        const d = await r.json();
        if (d?.ok) {
          setCurPath(d.path || p);
          setParentDir(d.parent || '');
          setItems(Array.isArray(d.entries) ? d.entries : []);
          setSelected([]);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDir(curPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-luma-fs')) {
          e.preventDefault();
          setDropHover(true);
        }
      }}
      onDragLeave={() => setDropHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropHover(false);
        const raw = e.dataTransfer.getData('application/x-luma-fs');
        if (!raw) return;
        try {
          const paths = JSON.parse(raw) as string[];
          onTransfer(paths, curPath, e.ctrlKey || e.altKey ? 'copy' : 'move');
        } catch {
          /* ignore */
        }
      }}
      className={`w-[340px] lg:w-[390px] shrink-0 border-l flex flex-col min-h-0 transition ${
        isDark ? 'border-white/10 bg-black/20' : 'border-zinc-900/10 bg-zinc-50/80'
      } ${dropHover ? 'ring-2 ring-inset ring-[var(--luma-accent)] bg-[var(--luma-accent)]/12' : ''}`}
    >
      {/* Shutter Header */}
      <div className={`px-2.5 py-2 border-b space-y-1.5 shrink-0 ${isDark ? 'border-white/10' : 'border-zinc-900/10'}`}>
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent)]/20 text-[var(--luma-accent)] text-[10px] font-bold shrink-0">
              Шторка {shutterNumber}
            </span>
            <button
              type="button"
              disabled={!parentDir}
              onClick={() => parentDir && void loadDir(parentDir)}
              title="На уровень вверх"
              className={`p-1 rounded border cursor-pointer disabled:opacity-35 ${btnCls}`}
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => void loadDir(curPath)}
              title="Обновить"
              className={`p-1 rounded border cursor-pointer ${btnCls}`}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть шторку"
            className="p-1 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Folder / Drive Switcher */}
        <select
          value={curPath}
          onChange={(e) => void loadDir(e.target.value)}
          className={`w-full px-2 py-1 rounded-lg border text-[11px] font-mono outline-none ${btnCls}`}
        >
          <option value={curPath}>{curPath}</option>
          {quickFolders.map((q) => (
            <option key={q.path} value={q.path}>
              {q.name} ({q.path})
            </option>
          ))}
          {drives.map((d) => {
            const mp = d.mount.endsWith(':') ? d.mount + '\\' : d.mount;
            return (
              <option key={d.mount} value={mp}>
                Диск {d.mount}
              </option>
            );
          })}
        </select>

        {/* 1-Click Transfer Buttons */}
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          <button
            type="button"
            disabled={primarySelectedPaths.length === 0}
            onClick={() => onTransfer(primarySelectedPaths, curPath, 'move')}
            className="flex-1 py-1 px-2 rounded-lg bg-[var(--luma-accent)] text-white font-bold disabled:opacity-35 cursor-pointer truncate"
            title="Переместить выбранные из основной панели сюда"
          >
            Переместить сюда ({primarySelectedPaths.length}) →
          </button>
          <button
            type="button"
            disabled={primarySelectedPaths.length === 0}
            onClick={() => onTransfer(primarySelectedPaths, curPath, 'copy')}
            className={`py-1 px-2 rounded-lg border font-semibold disabled:opacity-35 cursor-pointer ${btnCls}`}
            title="Копировать выбранные сюда"
          >
            Копир.
          </button>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onTransfer(selected, primaryDirPath, 'move')}
              className="py-1 px-2 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
              title="Переместить выбранные из этой шторки в основную панель"
            >
              ← В основную ({selected.length})
            </button>
          )}
        </div>
      </div>

      {/* Drop Hint */}
      {dropHover && (
        <div className="px-3 py-1.5 bg-[var(--luma-accent)]/20 text-[var(--luma-accent)] text-[11px] font-bold text-center">
          Отпустите, чтобы переместить сюда (Ctrl — копировать)
        </div>
      )}

      {/* Shutter Entries List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {items.length === 0 ? (
          <div className={`py-10 text-center text-[11px] font-mono ${mutedCls}`}>
            {loading ? 'Загрузка...' : 'Пустая папка — перетащите файлы сюда'}
          </div>
        ) : (
          items.map((entry) => {
            const isSel = selected.includes(entry.path);
            return (
              <div
                key={entry.path}
                draggable
                onDragStart={(e) => {
                  const list = isSel ? selected : [entry.path];
                  e.dataTransfer.setData('application/x-luma-fs', JSON.stringify(list));
                  e.dataTransfer.effectAllowed = 'copyMove';
                }}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    setSelected((p) => (p.includes(entry.path) ? p.filter((x) => x !== entry.path) : [...p, entry.path]));
                  } else {
                    setSelected([entry.path]);
                  }
                }}
                onDoubleClick={() => {
                  if (entry.is_dir) void loadDir(entry.path);
                }}
                className={`px-2 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-xs cursor-pointer transition ${
                  isSel
                    ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                    : `${surfaceCls} hover:border-[var(--luma-accent)]/40`
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getFileIcon(entry, 'w-3.5 h-3.5 shrink-0')}
                  <span className="truncate font-medium">{entry.name}</span>
                </div>
                <span className={`text-[10px] font-mono shrink-0 ${mutedCls}`}>
                  {entry.is_dir ? 'Папка' : formatBytesRu(entry.size)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

