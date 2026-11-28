import React, { useEffect, useRef, useState } from 'react';
import {
  Folder, FileText, Image as ImageIcon, Film, Music, FileCode2,
  Eye, LayoutGrid, Fan, ExternalLink, Plus, X, ArrowUpRight,
  Download, Pause, AlertCircle, PackageOpen, Layers, ChevronUp,
} from 'lucide-react';
import type { QuickLookCandidate } from './LumaQuickLookModal';

export interface DockProgressTask {
  id: string;
  app_key: string;
  app_name: string;
  title: string;
  source: 'steam' | 'browser' | 'luma' | string;
  state: 'active' | 'extracting' | 'paused' | 'error' | 'done' | string;
  percent: number;
  bytes_done: number;
  bytes_total: number;
  speed_mb_s: number;
  detail?: string;
  updated_at: number;
}

export interface DockFolderStackConfig {
  id: string;
  name: string;
  path: string;
  view_mode: 'fan' | 'grid' | string;
  color: string;
}

export interface DockStackFileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  ext: string;
  mod_time: string;
  thumb_url?: string;
}

export interface SmartDockStatus {
  ok: boolean;
  tasks: DockProgressTask[];
  badges: Record<string, number>;
  stacks: DockFolderStackConfig[];
  checked_at: string;
}

// ---- Filter out idle 0% phantom tasks unless explicitly paused, errored, or actively downloading in Steam ----
function isRealVisibleTask(t: DockProgressTask | null | undefined): t is DockProgressTask {
  if (!t || t.state === 'done') return false;
  if (t.state === 'paused' || t.state === 'error') return true;
  if (t.source === 'steam' && (t.state === 'active' || t.state === 'extracting')) return true;
  return (t.percent || 0) > 0 || (t.bytes_done || 0) > 0 || (t.speed_mb_s || 0) > 0;
}

// ---- Reusable Messenger Unread Badge for Dock / Taskbar Icons ----
export const DockMessengerBadge: React.FC<{ count: number }> = ({ count }) => {
  if (!count || count <= 0) return null;
  return (
    <span
      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black leading-[18px] text-center shadow-lg shadow-rose-500/40 ring-2 ring-slate-950/90 pointer-events-none z-20 animate-pulse"
      title={`Непрочитанных уведомлений: ${count}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

// ---- Reusable Live Progress Bar & Outer Progress Halo on Dock / Taskbar Icons ----
export const DockIconProgressBar: React.FC<{ task?: DockProgressTask | null }> = ({ task }) => {
  if (!isRealVisibleTask(task)) return null;
  const pct = Math.max(4, Math.min(100, Math.round(task.percent || 0)));
  const colorMap: Record<string, { bar: string; hex: string; glow: string; label: string }> = {
    active: { bar: 'bg-sky-400', hex: '#38bdf8', glow: 'shadow-[0_0_9px_rgba(56,189,248,0.9)]', label: 'Загрузка' },
    rendering: { bar: 'bg-fuchsia-400', hex: '#e879f9', glow: 'shadow-[0_0_10px_rgba(232,121,249,0.9)]', label: 'Рендер видео' },
    extracting: { bar: 'bg-violet-400', hex: '#a78bfa', glow: 'shadow-[0_0_9px_rgba(167,139,250,0.9)]', label: 'Распаковка' },
    paused: { bar: 'bg-amber-400', hex: '#fbbf24', glow: 'shadow-[0_0_8px_rgba(251,191,36,0.85)]', label: 'Пауза' },
    error: { bar: 'bg-rose-500', hex: '#f43f5e', glow: 'shadow-[0_0_9px_rgba(244,63,94,0.9)]', label: 'Ошибка' },
  };
  const style = colorMap[task.state] || colorMap.active;
  const deg = Math.round((pct / 100) * 360);
  return (
    <>
      {/* Subtle conic progress ring glow directly around the dock icon */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[2.5px] rounded-[inherit] z-10 opacity-90"
        style={{
          background: `conic-gradient(${style.hex} ${deg}deg, rgba(255,255,255,0.08) ${deg}deg)`,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '2px',
          filter: `drop-shadow(0 0 5px ${style.hex}99)`,
        }}
      />
      {/* Bottom micro progress bar with percentage tooltip */}
      <div
        className="absolute left-1 right-1 -bottom-1 h-[3.5px] rounded-full bg-slate-950/90 overflow-hidden ring-1 ring-white/20 pointer-events-none z-20"
        title={`${task.app_name}: ${task.title} — ${style.label} ${pct}%${task.speed_mb_s > 0 ? ` (${task.speed_mb_s.toFixed(1)} МБ/с)` : ''}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${style.bar} ${style.glow}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  );
};

// ---- Helper to match a DockProgressTask to an app name/key ----
export function matchDockTaskForApp(tasks: DockProgressTask[], appNameOrKey: string): DockProgressTask | undefined {
  if (!tasks || tasks.length === 0) return undefined;
  const low = (appNameOrKey || '').toLowerCase();
  return tasks.find((t) => {
    if (!isRealVisibleTask(t)) return false;
    const k = (t.app_key || '').toLowerCase();
    if (!k) return false;
    if (low === k || low.includes(k)) return true;
    if (k === 'chrome' && (low.includes('chrome') || low.includes('edge') || low.includes('brave') || low.includes('yandex') || low.includes('vivaldi') || low.includes('browser'))) return true;
    if (k === 'firefox' && (low.includes('firefox') || low.includes('librewolf') || low.includes('zen'))) return true;
    if (k === 'opera' && low.includes('opera')) return true;
    if (k === 'steam' && low.includes('steam')) return true;
    if (k === 'cut_studio' && (low.includes('cut') || low.includes('video') || low.includes('render') || low.includes('монтаж'))) return true;
    if (k === 'luma_updater' && low.includes('settings')) return true;
    return false;
  });
}

// ---- Helper to match live unread messenger badge count ----
export function matchMessengerBadgeForApp(badges: Record<string, number>, appNameOrKey: string): number {
  if (!badges) return 0;
  const low = (appNameOrKey || '').toLowerCase();
  let total = 0;
  const aliases: Record<string, string[]> = {
    telegram: ['telegram', 'tg', 'ayugram', 'kotatogram'],
    discord: ['discord', 'vesktop'],
    whatsapp: ['whatsapp'],
    vk: ['vk', 'вконтакте', 'vk messenger'],
    viber: ['viber'],
    slack: ['slack'],
    teams: ['teams'],
    signal: ['signal'],
    mail: ['mail', 'outlook', 'thunderbird', 'почта'],
  };
  for (const [k, count] of Object.entries(badges)) {
    const lk = k.toLowerCase();
    if (low.includes(lk) || lk.includes(low)) {
      total += count;
      continue;
    }
    for (const group of Object.values(aliases)) {
      if (group.some((a) => low.includes(a)) && group.some((a) => lk.includes(a))) {
        total += count;
        break;
      }
    }
  }
  return total;
}

function getFileIcon(item: DockStackFileItem) {
  if (item.is_dir) return <Folder className="w-5 h-5 text-amber-400" />;
  const ext = (item.ext || '').toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp'].includes(ext)) return <ImageIcon className="w-5 h-5 text-sky-400" />;
  if (['.mp4', '.webm', '.mov', '.mkv', '.avi'].includes(ext)) return <Film className="w-5 h-5 text-violet-400" />;
  if (['.mp3', '.wav', '.flac', '.ogg', '.m4a'].includes(ext)) return <Music className="w-5 h-5 text-emerald-400" />;
  if (['.ts', '.tsx', '.js', '.go', '.py', '.json', '.html', '.css', '.md', '.rs'].includes(ext)) return <FileCode2 className="w-5 h-5 text-cyan-400" />;
  return <FileText className="w-5 h-5 text-slate-300" />;
}

interface LumaSmartDockStacksProps {
  kernelBase: string;
  stacks: DockFolderStackConfig[];
  tasks: DockProgressTask[];
  isDarkTheme: boolean;
  align?: 'left' | 'right';
  onStacksChanged: (next: DockFolderStackConfig[]) => void;
  onOpenFolderInExplorer: (path: string) => void;
  onOpenFile: (path: string) => void;
  onQuickLook: (items: QuickLookCandidate[], index: number) => void;
  onNotify?: (title: string, message: string) => void;
}

/**
 * Luma OS 1.6.2 (Nitrogen) — Ultra-Clean Hover-Reveal Smart Dock Shelf + Visible Live Download Pill.
 * Keeps the taskbar minimalist when idle, immediately shows a glowing download indicator whenever
 * any file/game/update is downloading, and reveals Folder Stacks + full transfer queue on hover.
 */
export const LumaSmartDockStacks: React.FC<LumaSmartDockStacksProps> = ({
  kernelBase, stacks, tasks, isDarkTheme, align = 'right', onStacksChanged,
  onOpenFolderInExplorer, onOpenFile, onQuickLook, onNotify,
}) => {
  const [shelfOpen, setShelfOpen] = useState(false);
  const [openStackId, setOpenStackId] = useState<string | null>(null);
  const [stackItems, setStackItems] = useState<DockStackFileItem[]>([]);
  const [loadingStack, setLoadingStack] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dragOverStackId, setDragOverStackId] = useState<string | null>(null);
  const [showAddStack, setShowAddStack] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [newStackPath, setNewStackPath] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const leaveTimerRef = useRef<number | null>(null);

  const openStack = stacks.find((s) => s.id === openStackId) || null;
  const activeTasks = tasks.filter(isRealVisibleTask);

  const cancelClose = () => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    cancelClose();
    setShelfOpen(true);
  };

  const handleMouseLeave = () => {
    cancelClose();
    // Keep open while adding a custom stack so user can type cleanly
    if (showAddStack) return;
    leaveTimerRef.current = window.setTimeout(() => {
      setShelfOpen(false);
      setOpenStackId(null);
    }, 260);
  };

  useEffect(() => () => cancelClose(), []);

  const loadStackContents = async (stack: DockFolderStackConfig) => {
    setLoadingStack(true);
    try {
      const r = await fetch(`${kernelBase}/api/kernel/dock/stack?path=${encodeURIComponent(stack.path)}`);
      if (r.ok) {
        const d = await r.json();
        setStackItems(Array.isArray(d.items) ? d.items : []);
        setSelectedIdx(0);
      }
    } catch {
      setStackItems([]);
    } finally {
      setLoadingStack(false);
    }
  };

  const selectStack = (stack: DockFolderStackConfig) => {
    if (openStackId === stack.id) {
      setOpenStackId(null);
      return;
    }
    setOpenStackId(stack.id);
    loadStackContents(stack);
  };

  // Close on outside click + handle Space Luma Peek & Arrow navigation inside open Stack!
  useEffect(() => {
    if (!shelfOpen && !openStackId) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShelfOpen(false);
        setOpenStackId(null);
        setShowAddStack(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!openStackId) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpenStackId(null);
      } else if (e.key === ' ' && stackItems.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const candidates: QuickLookCandidate[] = stackItems.map((it) => ({
          path: it.path, name: it.name, isDir: it.is_dir,
        }));
        onQuickLook(candidates, Math.max(0, Math.min(selectedIdx, candidates.length - 1)));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(stackItems.length - 1, i + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && stackItems[selectedIdx]) {
        e.preventDefault();
        const item = stackItems[selectedIdx];
        if (item.is_dir) onOpenFolderInExplorer(item.path);
        else onOpenFile(item.path);
        setOpenStackId(null);
        setShelfOpen(false);
      }
    };
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [shelfOpen, openStackId, stackItems, selectedIdx, onQuickLook, onOpenFolderInExplorer, onOpenFile]);

  const persistStacks = async (next: DockFolderStackConfig[]) => {
    onStacksChanged(next);
    try {
      await fetch(`${kernelBase}/api/kernel/dock/stacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stacks: next }),
      });
    } catch { /* ignore */ }
  };

  const toggleViewMode = (stack: DockFolderStackConfig) => {
    const nextMode = stack.view_mode === 'fan' ? 'grid' : 'fan';
    const next = stacks.map((s) => (s.id === stack.id ? { ...s, view_mode: nextMode } : s));
    persistStacks(next);
  };

  const handleAddStack = () => {
    if (!newStackPath.trim()) return;
    const name = newStackName.trim() || newStackPath.split(/[/\\]/).filter(Boolean).pop() || 'Папка';
    const next: DockFolderStackConfig[] = [
      ...stacks,
      { id: `stack_${Date.now()}`, name, path: newStackPath.trim(), view_mode: 'grid', color: '#38bdf8' },
    ];
    persistStacks(next);
    setNewStackName('');
    setNewStackPath('');
    setShowAddStack(false);
  };

  const handleDropIntoStack = async (e: React.DragEvent, stack: DockFolderStackConfig) => {
    e.preventDefault();
    setDragOverStackId(null);
    // Ignore internal desktop shortcut/widget drags or icon image URLs
    if (
      e.dataTransfer.types.includes('application/x-luma-shortcut') ||
      e.dataTransfer.types.includes('application/x-luma-widget')
    ) {
      return;
    }
    const raw = e.dataTransfer.getData('application/x-luma-fs') || e.dataTransfer.getData('text/plain');
    if (!raw || raw.startsWith('data:image/') || raw.includes('/api/kernel/app-icon') || raw.startsWith('http://127.0.0.1')) return;
    let srcPath = raw;
    try {
      const parsed = JSON.parse(raw);
      srcPath = parsed.path || parsed.src || raw;
    } catch { /* plain path string */ }
    if (!srcPath || srcPath === stack.path) return;
    try {
      const r = await fetch(`${kernelBase}/api/kernel/fs/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: srcPath, dst: stack.path, move: e.shiftKey }),
      });
      if (r.ok) {
        onNotify?.('Полка Luma Dock', `Файл ${e.shiftKey ? 'перемещён' : 'скопирован'} в «${stack.name}»`);
        if (openStackId === stack.id) loadStackContents(stack);
      }
    } catch { /* ignore */ }
  };

  const topTask = activeTasks[0] || null;
  const dotColor = topTask
    ? topTask.state === 'error'
      ? 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
      : topTask.state === 'paused'
        ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
        : topTask.state === 'extracting'
          ? 'bg-violet-400 shadow-[0_0_8px_#a78bfa]'
          : 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
    : '';
  const topPct = topTask ? Math.max(4, Math.min(100, Math.round(topTask.percent || 0))) : 0;
  const topBarColor = topTask
    ? topTask.state === 'error'
      ? 'bg-rose-500'
      : topTask.state === 'paused'
        ? 'bg-amber-400'
        : topTask.state === 'extracting'
          ? 'bg-violet-400'
          : 'bg-sky-400'
    : 'bg-sky-400';

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragOver={(e) => {
        e.preventDefault();
        handleMouseEnter();
      }}
      className="relative flex items-center gap-1.5 pl-1.5 border-l border-white/10"
    >
      {/* Live Visible Download Indicator Pill (automatically appears whenever ANY download is active!) */}
      {topTask && (
        <button
          type="button"
          onClick={() => setShelfOpen((v) => !v)}
          className={`relative h-8 max-w-[210px] px-2.5 rounded-xl border flex items-center gap-2 overflow-hidden transition-all duration-200 cursor-pointer ${
            topTask.state === 'error'
              ? 'bg-rose-500/18 border-rose-400/45 text-rose-200'
              : topTask.state === 'paused'
                ? 'bg-amber-500/18 border-amber-400/45 text-amber-100'
                : topTask.state === 'extracting'
                  ? 'bg-violet-500/18 border-violet-400/45 text-violet-100'
                  : isDarkTheme
                    ? 'bg-sky-500/18 border-sky-400/45 text-sky-100 shadow-lg shadow-sky-500/15'
                    : 'bg-sky-100 border-sky-400 text-sky-900 shadow-sm'
          }`}
          title={`${topTask.app_name}: ${topTask.title} (${topPct}%${topTask.speed_mb_s > 0 ? ` · ${topTask.speed_mb_s.toFixed(1)} МБ/с` : ''})`}
        >
          {topTask.state === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : topTask.state === 'paused' ? (
            <Pause className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : topTask.state === 'extracting' ? (
            <PackageOpen className="w-3.5 h-3.5 text-violet-400 animate-pulse shrink-0" />
          ) : (
            <Download className="w-3.5 h-3.5 text-sky-400 animate-bounce shrink-0" />
          )}
          <div className="min-w-0 text-left leading-tight">
            <div className="text-[10px] font-bold truncate max-w-[115px]">{topTask.title}</div>
            <div className="text-[9px] font-mono opacity-80 flex items-center gap-1">
              <span>{topPct}%</span>
              {topTask.speed_mb_s > 0 && <span>· {topTask.speed_mb_s.toFixed(1)} МБ/с</span>}
              {activeTasks.length > 1 && <span className="text-sky-300 font-bold">+{activeTasks.length - 1}</span>}
            </div>
          </div>
          {/* Bottom live micro progress bar */}
          <div className="absolute left-0 right-0 bottom-0 h-[2.5px] bg-black/35">
            <div
              className={`h-full transition-all duration-300 ${topBarColor}`}
              style={{ width: `${topPct}%` }}
            />
          </div>
        </button>
      )}

      {/* Ultra-Clean Minimalist Taskbar Handle (everything hides inside & glides out on hover!) */}
      <button
        type="button"
        onClick={() => setShelfOpen((v) => !v)}
        className={`group relative h-8 px-2.5 rounded-xl flex items-center gap-1.5 border transition-all duration-200 cursor-pointer ${
          shelfOpen
            ? isDarkTheme
              ? 'bg-sky-500/20 border-sky-400/45 text-sky-200 shadow-lg shadow-sky-500/15'
              : 'bg-sky-100 border-sky-400 text-sky-800 shadow-sm'
            : isDarkTheme
              ? 'bg-white/[0.04] border-white/10 text-slate-300/80 hover:bg-white/12 hover:text-white hover:border-white/20'
              : 'bg-slate-900/[0.04] border-slate-300/70 text-slate-600 hover:bg-slate-900/10 hover:text-slate-900'
        }`}
        title="Наведите, чтобы открыть Полку папок и активные загрузки"
      >
        <Layers className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
        {topTask && (
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
        )}
        <ChevronUp
          className={`w-3 h-3 opacity-65 transition-transform duration-200 ${shelfOpen ? 'rotate-180 text-sky-400 opacity-100' : ''}`}
        />
      </button>

      {/* Smooth Hover-Reveal Frosted-Glass Shelf Drawer (invisible pb-2 bridge prevents hover gaps!) */}
      <div
        className={`absolute bottom-8 ${
          align === 'left' ? 'left-0 origin-bottom-left' : 'right-0 origin-bottom-right'
        } pb-2.5 z-[9600] transition-all duration-200 ease-out ${
          shelfOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
        }`}
      >
        <div
          className={`w-[360px] max-w-[92vw] rounded-2xl border shadow-[0_24px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden ${
            isDarkTheme
              ? 'bg-slate-950/92 border-white/15 text-slate-100'
              : 'bg-white/95 border-slate-200 text-slate-900'
          }`}
        >
          {/* Shelf Header */}
          <div className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'}`}>
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-black tracking-wide uppercase">Полка Luma Dock</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowAddStack((v) => !v)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition ${
                  showAddStack
                    ? 'bg-sky-500 text-white'
                    : isDarkTheme ? 'bg-white/10 hover:bg-white/20 text-slate-200' : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                }`}
                title="Добавить папку на полку"
              >
                <Plus className="w-3 h-3" /> Папка
              </button>
              <button
                type="button"
                onClick={() => { setShelfOpen(false); setOpenStackId(null); setShowAddStack(false); }}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                title="Скрыть полку"
              >
                <X className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
          </div>

          {/* Add Custom Folder Stack Inline Form */}
          {showAddStack && (
            <div className={`p-3 border-b space-y-2 ${isDarkTheme ? 'border-white/10 bg-sky-500/[0.06]' : 'border-slate-200 bg-sky-50/70'}`}>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  value={newStackName}
                  onChange={(e) => setNewStackName(e.target.value)}
                  placeholder="Название (Проекты)"
                  className={`px-2.5 py-1.5 rounded-lg text-xs border outline-none ${isDarkTheme ? 'bg-black/40 border-white/15' : 'bg-white border-slate-300'}`}
                />
                <input
                  value={newStackPath}
                  onChange={(e) => setNewStackPath(e.target.value)}
                  placeholder="Путь (C:\\Projects)"
                  className={`px-2.5 py-1.5 rounded-lg text-xs border outline-none ${isDarkTheme ? 'bg-black/40 border-white/15' : 'bg-white border-slate-300'}`}
                />
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddStack(false)}
                  className="px-2.5 py-1 rounded-lg text-[11px] opacity-70 hover:opacity-100 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleAddStack}
                  className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-bold cursor-pointer"
                >
                  Добавить
                </button>
              </div>
            </div>
          )}

          {/* Sleek Folder Stacks Strip (Supports Click to Expand + Drag & Drop) */}
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {stacks.map((stack) => {
                const isSelected = openStackId === stack.id;
                const isDropTarget = dragOverStackId === stack.id;
                return (
                  <button
                    key={stack.id}
                    type="button"
                    onClick={() => selectStack(stack)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverStackId(stack.id); }}
                    onDragLeave={() => setDragOverStackId(null)}
                    onDrop={(e) => handleDropIntoStack(e, stack)}
                    className={`group relative px-2.5 py-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isDropTarget
                        ? 'scale-105 bg-sky-500/25 border-sky-400 shadow-lg shadow-sky-500/25'
                        : isSelected
                          ? 'bg-sky-500/18 border-sky-400/50 shadow-md'
                          : isDarkTheme
                            ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.1] hover:border-white/20 hover:-translate-y-0.5'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:-translate-y-0.5'
                    }`}
                    title={`Открыть стек «${stack.name}» (${stack.view_mode === 'fan' ? 'Веер' : 'Сетка'}) · Перетащите файл сюда`}
                  >
                    <div className="relative w-8 h-7 flex items-center justify-center">
                      <span className="absolute w-6 h-5 rounded-md bg-white/10 -rotate-6 -translate-y-0.5 transition-transform group-hover:-rotate-12" />
                      <span className="absolute w-6 h-5 rounded-md bg-white/15 rotate-6 transition-transform group-hover:rotate-12" />
                      <Folder className="w-5 h-5 relative z-10 drop-shadow" style={{ color: stack.color || '#38bdf8' }} />
                    </div>
                    <span className="text-[11px] font-bold truncate w-full text-center">{stack.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expanded Folder Stack View (FAN / GRID + Luma Peek via Space!) */}
          {openStack && (
            <div className={`border-t ${isDarkTheme ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-slate-50/70'}`}>
              <div className={`px-3 py-2 flex items-center justify-between gap-2 border-b ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: openStack.color }} />
                  <span className="text-xs font-black truncate">{openStack.name}</span>
                  <span className="text-[10px] opacity-55">({stackItems.length})</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleViewMode(openStack)}
                    className="px-2 py-0.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Переключить режим Веер / Сетка"
                  >
                    {openStack.view_mode === 'fan' ? <LayoutGrid className="w-3 h-3" /> : <Fan className="w-3 h-3" />}
                    {openStack.view_mode === 'fan' ? 'Сетка' : 'Веер'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenFolderInExplorer(openStack.path);
                      setOpenStackId(null);
                      setShelfOpen(false);
                    }}
                    className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                    title="Открыть в Проводнике"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-2.5 max-h-[260px] overflow-y-auto">
                {loadingStack ? (
                  <div className="py-6 text-center text-xs opacity-60">Загрузка содержимого...</div>
                ) : stackItems.length === 0 ? (
                  <div className="py-6 text-center text-xs opacity-60">Папка пуста</div>
                ) : openStack.view_mode === 'fan' ? (
                  /* FAN VIEW (Веер) */
                  <div className="space-y-1.5 py-0.5">
                    {stackItems.slice(0, 10).map((it, idx) => {
                      const angle = Math.min(5, Math.max(-5, (idx - 4) * 0.9));
                      const isSel = idx === selectedIdx;
                      return (
                        <div
                          key={it.path}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/x-luma-fs', JSON.stringify({ path: it.path, name: it.name, isDir: it.is_dir }));
                            e.dataTransfer.setData('text/plain', it.path);
                          }}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          onClick={() => {
                            if (it.is_dir) onOpenFolderInExplorer(it.path);
                            else onOpenFile(it.path);
                            setOpenStackId(null);
                            setShelfOpen(false);
                          }}
                          style={{ transform: `rotate(${isSel ? 0 : angle * 0.3}deg)` }}
                          className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border cursor-pointer transition-all ${
                            isSel
                              ? 'bg-sky-500/20 border-sky-400/50 scale-[1.01] shadow-md'
                              : isDarkTheme ? 'bg-white/[0.04] border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {it.thumb_url ? (
                            <img src={`${kernelBase}${it.thumb_url}`} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                              {getFileIcon(it)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate">{it.name}</div>
                            <div className="text-[10px] opacity-55">{it.mod_time}</div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const cands: QuickLookCandidate[] = stackItems.map((x) => ({ path: x.path, name: x.name, isDir: x.is_dir }));
                              onQuickLook(cands, idx);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 transition cursor-pointer"
                            title="Luma Peek (Space)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* GRID VIEW (Сетка) */
                  <div className="grid grid-cols-3 gap-1.5">
                    {stackItems.slice(0, 18).map((it, idx) => {
                      const isSel = idx === selectedIdx;
                      return (
                        <div
                          key={it.path}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/x-luma-fs', JSON.stringify({ path: it.path, name: it.name, isDir: it.is_dir }));
                            e.dataTransfer.setData('text/plain', it.path);
                          }}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          onClick={() => {
                            if (it.is_dir) onOpenFolderInExplorer(it.path);
                            else onOpenFile(it.path);
                            setOpenStackId(null);
                            setShelfOpen(false);
                          }}
                          className={`group relative p-2 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition ${
                            isSel
                              ? 'bg-sky-500/20 border-sky-400/50'
                              : isDarkTheme ? 'bg-white/[0.04] border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {it.thumb_url ? (
                            <img src={`${kernelBase}${it.thumb_url}`} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                              {getFileIcon(it)}
                            </div>
                          )}
                          <span className="text-[10px] font-semibold line-clamp-2 leading-tight break-all">{it.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const cands: QuickLookCandidate[] = stackItems.map((x) => ({ path: x.path, name: x.name, isDir: x.is_dir }));
                              onQuickLook(cands, idx);
                            }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-slate-900/80 text-sky-300 cursor-pointer"
                            title="Luma Peek (Space)"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`px-3 py-1.5 border-t flex items-center justify-between text-[10px] opacity-65 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
                <span>Space — Luma Peek · Перетаскивание</span>
                <button
                  type="button"
                  onClick={() => { onOpenFolderInExplorer(openStack.path); setOpenStackId(null); setShelfOpen(false); }}
                  className="text-sky-400 hover:underline flex items-center gap-0.5 font-semibold cursor-pointer"
                >
                  Проводник <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Live Downloads & Installs Section (Hidden cleanly inside the hover shelf!) */}
          <div className={`px-3 py-2.5 border-t ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'}`}>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider opacity-65 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Download className="w-3 h-3 text-sky-400" />
                Загрузки и установки ({activeTasks.length})
              </span>
              {activeTasks.length === 0 && <span className="font-normal normal-case">Нет активных</span>}
            </div>
            {activeTasks.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {activeTasks.map((t) => {
                  const barCls = t.state === 'error' ? 'bg-rose-500' : t.state === 'paused' ? 'bg-amber-400' : t.state === 'extracting' ? 'bg-violet-400' : 'bg-sky-400';
                  const stLabel = t.state === 'error' ? 'Ошибка' : t.state === 'paused' ? 'Пауза' : t.state === 'extracting' ? 'Распаковка' : 'Активно';
                  const Icon = t.state === 'error' ? AlertCircle : t.state === 'paused' ? Pause : t.state === 'extracting' ? PackageOpen : Download;
                  return (
                    <div key={t.id} className={`p-2 rounded-xl border ${isDarkTheme ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold truncate flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                          {t.title}
                        </span>
                        <span className="font-mono font-black shrink-0">{Math.round(t.percent)}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${barCls}`} style={{ width: `${Math.max(4, Math.min(100, t.percent))}%` }} />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-70">
                        <span className="shrink-0">{t.app_name} · {stLabel}</span>
                        <span className="truncate text-right font-mono">
                          {t.speed_mb_s > 0
                            ? `${t.speed_mb_s.toFixed(1)} МБ/с${t.detail ? ` · ${t.detail}` : ''}`
                            : t.detail || ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
