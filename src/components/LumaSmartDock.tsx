import React, { useEffect, useRef, useState } from 'react';
import {
  Folder, FileText, Image as ImageIcon, Film, Music, FileCode2,
  Eye, LayoutGrid, Fan, ExternalLink, Plus, X, ArrowUpRight,
  Download, Pause, AlertCircle, PackageOpen,
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

// ---- Reusable Live Progress Bar Overlay on Dock / Taskbar Icons ----
export const DockIconProgressBar: React.FC<{ task?: DockProgressTask | null }> = ({ task }) => {
  if (!task || task.state === 'done') return null;
  const pct = Math.max(4, Math.min(100, Math.round(task.percent || 0)));
  const colorMap: Record<string, { bar: string; glow: string; label: string }> = {
    active: { bar: 'bg-sky-400', glow: 'shadow-[0_0_8px_rgba(56,189,248,0.85)]', label: 'Загрузка' },
    extracting: { bar: 'bg-violet-400', glow: 'shadow-[0_0_8px_rgba(167,139,250,0.85)]', label: 'Распаковка' },
    paused: { bar: 'bg-amber-400', glow: 'shadow-[0_0_8px_rgba(251,191,36,0.8)]', label: 'Пауза' },
    error: { bar: 'bg-rose-500', glow: 'shadow-[0_0_8px_rgba(244,63,94,0.9)]', label: 'Ошибка' },
  };
  const style = colorMap[task.state] || colorMap.active;
  return (
    <div
      className="absolute left-1 right-1 -bottom-1 h-[4px] rounded-full bg-slate-950/85 overflow-hidden ring-1 ring-white/20 pointer-events-none z-20"
      title={`${task.app_name}: ${task.title} — ${style.label} ${pct}%${task.speed_mb_s > 0 ? ` (${task.speed_mb_s.toFixed(1)} МБ/с)` : ''}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${style.bar} ${style.glow}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

// ---- Helper to match a DockProgressTask to an app name/key ----
export function matchDockTaskForApp(tasks: DockProgressTask[], appNameOrKey: string): DockProgressTask | undefined {
  if (!tasks || tasks.length === 0) return undefined;
  const low = (appNameOrKey || '').toLowerCase();
  return tasks.find((t) => {
    const k = (t.app_key || '').toLowerCase();
    if (!k) return false;
    if (low === k || low.includes(k)) return true;
    if (k === 'chrome' && (low.includes('chrome') || low.includes('edge') || low.includes('brave') || low.includes('yandex') || low.includes('vivaldi') || low.includes('browser'))) return true;
    if (k === 'firefox' && (low.includes('firefox') || low.includes('librewolf') || low.includes('zen'))) return true;
    if (k === 'opera' && low.includes('opera')) return true;
    if (k === 'steam' && low.includes('steam')) return true;
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
  onStacksChanged: (next: DockFolderStackConfig[]) => void;
  onOpenFolderInExplorer: (path: string) => void;
  onOpenFile: (path: string) => void;
  onQuickLook: (items: QuickLookCandidate[], index: number) => void;
  onNotify?: (title: string, message: string) => void;
}

export const LumaSmartDockStacks: React.FC<LumaSmartDockStacksProps> = ({
  kernelBase, stacks, tasks, isDarkTheme, onStacksChanged,
  onOpenFolderInExplorer, onOpenFile, onQuickLook, onNotify,
}) => {
  const [openStackId, setOpenStackId] = useState<string | null>(null);
  const [stackItems, setStackItems] = useState<DockStackFileItem[]>([]);
  const [loadingStack, setLoadingStack] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dragOverStackId, setDragOverStackId] = useState<string | null>(null);
  const [showAddStack, setShowAddStack] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [newStackPath, setNewStackPath] = useState('');
  const [showTasksPopover, setShowTasksPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const openStack = stacks.find((s) => s.id === openStackId) || null;

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

  const toggleStack = (stack: DockFolderStackConfig) => {
    setShowTasksPopover(false);
    if (openStackId === stack.id) {
      setOpenStackId(null);
      return;
    }
    setOpenStackId(stack.id);
    loadStackContents(stack);
  };

  // Close popover on outside click + handle Space Quick Look & Arrow navigation inside open Stack!
  useEffect(() => {
    if (!openStackId && !showTasksPopover) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenStackId(null);
        setShowTasksPopover(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!openStackId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
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
      }
    };
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [openStackId, showTasksPopover, stackItems, selectedIdx, onQuickLook, onOpenFolderInExplorer, onOpenFile]);

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
      { id: `stack_${Date.now()}`, name, path: newStackPath.trim(), view_mode: 'grid', color: '#06b6d4' },
    ];
    persistStacks(next);
    setNewStackName('');
    setNewStackPath('');
    setShowAddStack(false);
  };

  const handleDropIntoStack = async (e: React.DragEvent, stack: DockFolderStackConfig) => {
    e.preventDefault();
    setDragOverStackId(null);
    const raw = e.dataTransfer.getData('application/x-luma-fs') || e.dataTransfer.getData('text/plain');
    if (!raw) return;
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
        onNotify?.('Умный Dock · Стек', `Файл ${e.shiftKey ? 'перемещён' : 'скопирован'} в «${stack.name}»`);
        if (openStackId === stack.id) loadStackContents(stack);
      }
    } catch { /* ignore */ }
  };

  const activeTasks = tasks.filter((t) => t.state !== 'done');

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5 pl-1.5 border-l border-white/15">
      {/* Live Downloads / Installs Summary Pill (Steam / Browsers / Luma) */}
      {activeTasks.length > 0 && (
        <div className="relative">
          <button
            onClick={() => { setOpenStackId(null); setShowTasksPopover((v) => !v); }}
            className={`relative h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-[11px] font-bold border transition-all ${
              isDarkTheme
                ? 'bg-sky-500/15 border-sky-400/35 text-sky-300 hover:bg-sky-500/25'
                : 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100'
            }`}
            title="Активные загрузки и установки (Steam / Браузеры / Luma OS)"
          >
            {activeTasks[0].state === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : activeTasks[0].state === 'paused' ? (
              <Pause className="w-3.5 h-3.5 text-amber-400" />
            ) : activeTasks[0].state === 'extracting' ? (
              <PackageOpen className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            ) : (
              <Download className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
            )}
            <span>{Math.round(activeTasks[0].percent)}%</span>
            <DockIconProgressBar task={activeTasks[0]} />
          </button>

          {showTasksPopover && (
            <div
              className={`absolute bottom-12 right-0 w-80 rounded-2xl border p-3 shadow-2xl backdrop-blur-2xl z-[9600] ${
                isDarkTheme ? 'bg-slate-950/92 border-white/15 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black">Загрузки & Установки ({activeTasks.length})</span>
                <button onClick={() => setShowTasksPopover(false)} className="p-1 rounded-lg hover:bg-white/10">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeTasks.map((t) => {
                  const barCls = t.state === 'error' ? 'bg-rose-500' : t.state === 'paused' ? 'bg-amber-400' : t.state === 'extracting' ? 'bg-violet-400' : 'bg-sky-400';
                  const stLabel = t.state === 'error' ? 'Ошибка' : t.state === 'paused' ? 'Пауза' : t.state === 'extracting' ? 'Распаковка' : 'Активно';
                  return (
                    <div key={t.id} className={`p-2.5 rounded-xl border ${isDarkTheme ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold truncate">{t.title}</span>
                        <span className="font-mono text-[11px] font-black shrink-0">{Math.round(t.percent)}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${Math.max(4, Math.min(100, t.percent))}%` }} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{t.app_name} · {stLabel}</span>
                        <span>{t.speed_mb_s > 0 ? `${t.speed_mb_s.toFixed(1)} МБ/с` : t.detail || ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Folder Stack Icons in Dock */}
      {stacks.map((stack) => {
        const isOpen = openStackId === stack.id;
        const isDropTarget = dragOverStackId === stack.id;
        return (
          <div key={stack.id} className="relative">
            <button
              onClick={() => toggleStack(stack)}
              onDragOver={(e) => { e.preventDefault(); setDragOverStackId(stack.id); }}
              onDragLeave={() => setDragOverStackId(null)}
              onDrop={(e) => handleDropIntoStack(e, stack)}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                isDropTarget
                  ? 'scale-115 bg-sky-500/30 border-sky-400 shadow-lg shadow-sky-500/30'
                  : isOpen
                    ? 'bg-white/20 border-white/35 scale-105'
                    : isDarkTheme
                      ? 'bg-white/[0.07] border-white/10 hover:bg-white/15 hover:-translate-y-0.5'
                      : 'bg-slate-900/5 border-slate-300 hover:bg-slate-900/10 hover:-translate-y-0.5'
              }`}
              title={`Стек папки «${stack.name}» (${stack.view_mode === 'fan' ? 'Веер' : 'Сетка'}) · Перетащите файл сюда`}
            >
              {/* Layered mini-cards icon signifying a Dock Folder Stack */}
              <span className="absolute w-5 h-4 rounded bg-white/15 -rotate-6 -translate-y-1 pointer-events-none" />
              <span className="absolute w-5 h-4 rounded bg-white/20 rotate-6 -translate-y-0.5 pointer-events-none" />
              <Folder className="w-4 h-4 relative z-10" style={{ color: stack.color || '#38bdf8' }} />
            </button>

            {/* Open Stack Popover: FAN (Веер) OR GRID (Сетка) */}
            {isOpen && openStack && (
              <div
                className={`absolute bottom-12 right-0 z-[9600] ${
                  openStack.view_mode === 'fan' ? 'w-72' : 'w-[370px]'
                } rounded-2xl border shadow-2xl backdrop-blur-2xl overflow-hidden ${
                  isDarkTheme ? 'bg-slate-950/92 border-white/15 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-900'
                }`}
              >
                {/* Stack Header */}
                <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="w-4 h-4 shrink-0" style={{ color: openStack.color }} />
                    <span className="text-xs font-black truncate">{openStack.name}</span>
                    <span className="text-[10px] text-slate-400">({stackItems.length})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleViewMode(openStack)}
                      className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 text-[10px] font-bold flex items-center gap-1"
                      title="Переключить режим Веер / Сетка"
                    >
                      {openStack.view_mode === 'fan' ? <LayoutGrid className="w-3 h-3" /> : <Fan className="w-3 h-3" />}
                      {openStack.view_mode === 'fan' ? 'Сетка' : 'Веер'}
                    </button>
                    <button
                      onClick={() => { onOpenFolderInExplorer(openStack.path); setOpenStackId(null); }}
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                      title="Открыть в Проводнике"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stack Body */}
                <div className="p-2.5 max-h-[360px] overflow-y-auto">
                  {loadingStack ? (
                    <div className="py-8 text-center text-xs text-slate-400">Загрузка файлов…</div>
                  ) : stackItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">Папка пуста</div>
                  ) : openStack.view_mode === 'fan' ? (
                    /* FAN (Веер) Curved Cascading Layout */
                    <div className="flex flex-col-reverse gap-1.5 py-1">
                      {stackItems.slice(0, 10).map((item, idx) => {
                        const curveShift = Math.round(Math.pow(idx, 1.35) * 2.2);
                        const rot = -(idx * 1.15);
                        const selected = idx === selectedIdx;
                        return (
                          <div
                            key={item.path}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/x-luma-fs', JSON.stringify({ path: item.path, name: item.name, isDir: item.is_dir }));
                              e.dataTransfer.setData('text/plain', item.path);
                            }}
                            onClick={() => setSelectedIdx(idx)}
                            onDoubleClick={() => {
                              if (item.is_dir) onOpenFolderInExplorer(item.path);
                              else onOpenFile(item.path);
                              setOpenStackId(null);
                            }}
                            style={{
                              transform: `translateX(-${Math.min(20, curveShift)}px) rotate(${Math.max(-8, rot)}deg)`,
                            }}
                            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all hover:scale-[1.02] ${
                              selected
                                ? 'bg-sky-500/20 border-sky-400/50 shadow-md'
                                : isDarkTheme ? 'bg-slate-900/90 border-white/10 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {item.thumb_url ? (
                              <img src={`${kernelBase}${item.thumb_url}`} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                {getFileIcon(item)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate">{item.name}</div>
                              <div className="text-[10px] text-slate-400">{item.mod_time}</div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickLook(stackItems.map((x) => ({ path: x.path, name: x.name, isDir: x.is_dir })), idx);
                              }}
                              className="p-1 rounded-lg hover:bg-sky-500/25 text-sky-400"
                              title="Quick Look (Space)"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* GRID (Сетка) Visual Tile Layout */
                    <div className="grid grid-cols-3 gap-2">
                      {stackItems.slice(0, 18).map((item, idx) => {
                        const selected = idx === selectedIdx;
                        return (
                          <div
                            key={item.path}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/x-luma-fs', JSON.stringify({ path: item.path, name: item.name, isDir: item.is_dir }));
                              e.dataTransfer.setData('text/plain', item.path);
                            }}
                            onClick={() => setSelectedIdx(idx)}
                            onDoubleClick={() => {
                              if (item.is_dir) onOpenFolderInExplorer(item.path);
                              else onOpenFile(item.path);
                              setOpenStackId(null);
                            }}
                            className={`group relative p-2 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                              selected
                                ? 'bg-sky-500/20 border-sky-400/50'
                                : isDarkTheme ? 'bg-white/[0.04] border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickLook(stackItems.map((x) => ({ path: x.path, name: x.name, isDir: x.is_dir })), idx);
                              }}
                              className="absolute top-1 right-1 p-1 rounded-md bg-slate-950/75 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Quick Look (Space)"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            {item.thumb_url ? (
                              <img src={`${kernelBase}${item.thumb_url}`} alt="" className="w-12 h-10 rounded-lg object-cover mb-1.5" />
                            ) : (
                              <div className="w-12 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-1.5">
                                {getFileIcon(item)}
                              </div>
                            )}
                            <span className="text-[10px] font-semibold line-clamp-2 leading-tight break-all">{item.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Stack Footer hint */}
                <div className={`px-3 py-1.5 border-t flex items-center justify-between text-[10px] text-slate-400 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                  <span>Space — Quick Look · Перетаскивание включено</span>
                  <button
                    onClick={() => { onOpenFolderInExplorer(openStack.path); setOpenStackId(null); }}
                    className="text-sky-400 hover:underline font-bold inline-flex items-center gap-0.5"
                  >
                    Открыть всё <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Folder Stack button */}
      <div className="relative">
        <button
          onClick={() => setShowAddStack((v) => !v)}
          className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${
            isDarkTheme ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-200/70 border-slate-300 text-slate-600'
          }`}
          title="Закрепить папку как Стек в Умном Dock"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        {showAddStack && (
          <div className={`absolute bottom-11 right-0 w-64 rounded-2xl border p-3 shadow-2xl backdrop-blur-2xl z-[9600] space-y-2 ${isDarkTheme ? 'bg-slate-950/95 border-white/15 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="text-xs font-black">Добавить Стек папки</div>
            <input
              value={newStackName}
              onChange={(e) => setNewStackName(e.target.value)}
              placeholder="Название (напр. Проекты)"
              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-300'}`}
            />
            <input
              value={newStackPath}
              onChange={(e) => setNewStackPath(e.target.value)}
              placeholder="Путь (C:\Projects или ~/Projects)"
              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-300'}`}
            />
            <div className="flex justify-end gap-1.5">
              <button onClick={() => setShowAddStack(false)} className="px-2.5 py-1 rounded-lg text-xs text-slate-400">Отмена</button>
              <button onClick={handleAddStack} className="px-3 py-1 rounded-lg bg-sky-500 text-white text-xs font-bold">Добавить</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
