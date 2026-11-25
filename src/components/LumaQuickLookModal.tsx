import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode,
  FileText,
  Film,
  Folder,
  Image as ImageIcon,
  Loader2,
  Music,
  RotateCcw,
  RotateCw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface QuickLookSiblingItem {
  name: string;
  path: string;
  is_dir?: boolean;
  isDir?: boolean;
  size?: number;
  ext?: string;
}

export type QuickLookCandidate = QuickLookSiblingItem;

interface QuickLookData {
  ok: boolean;
  kind: 'image' | 'video' | 'audio' | 'code' | 'markdown' | 'pdf' | 'text' | 'folder' | 'binary';
  language?: string;
  name: string;
  path: string;
  ext?: string;
  size?: number;
  size_human?: string;
  mod_time?: string;
  stream_url?: string;
  text_preview?: string;
  lines_count?: number;
  truncated?: boolean;
  dir_children?: { name: string; path: string; is_dir: boolean; size: number }[];
  error?: string;
}

interface AISourceItem {
  title: string;
  url: string;
  provider: string;
  snippet?: string;
}

interface LumaQuickLookModalProps {
  open: boolean;
  items: QuickLookSiblingItem[];
  activeIndex: number;
  isDark: boolean;
  onChangeIndex: (nextIdx: number) => void;
  onClose: () => void;
  onOpenExternal?: (path: string) => void;
  onPushToast?: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
}

const CODE_KEYWORDS = new Set([
  'import', 'export', 'from', 'default', 'function', 'const', 'let', 'var', 'return', 'if', 'else',
  'for', 'while', 'switch', 'case', 'break', 'continue', 'class', 'interface', 'type', 'extends',
  'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'package', 'func', 'struct', 'go',
  'defer', 'chan', 'select', 'range', 'def', 'elif', 'pass', 'with', 'as', 'lambda', 'yield',
  'pub', 'fn', 'mut', 'impl', 'match', 'SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP', 'ORDER', 'BY',
  'true', 'false', 'null', 'nil', 'None', 'True', 'False',
]);

function highlightCodeLine(line: string): React.ReactNode {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--')) {
    return <span className="text-emerald-400/75 italic">{line}</span>;
  }
  const tokens = line.split(/("[^"]*"|'[^']*'|`[^`]*`|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)?\b)/g);
  return tokens.map((tok, i) => {
    if (!tok) return null;
    if ((tok.startsWith('"') && tok.endsWith('"')) || (tok.startsWith("'") && tok.endsWith("'")) || (tok.startsWith('`') && tok.endsWith('`'))) {
      return <span key={i} className="text-amber-300">{tok}</span>;
    }
    if (CODE_KEYWORDS.has(tok)) {
      return <span key={i} className="text-sky-400 font-semibold">{tok}</span>;
    }
    if (/^\d+(?:\.\d+)?$/.test(tok)) {
      return <span key={i} className="text-fuchsia-300">{tok}</span>;
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

function renderSimpleMarkdown(md: string): React.ReactNode {
  return md.split('\n').map((line, i) => {
    const t = line.trim();
    if (t.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-3 mb-1 text-cyan-300">{t.slice(4)}</h3>;
    if (t.startsWith('## ')) return <h2 key={i} className="text-lg font-extrabold mt-4 mb-1.5 text-white">{t.slice(3)}</h2>;
    if (t.startsWith('# ')) return <h1 key={i} className="text-xl font-black mt-4 mb-2 text-white">{t.slice(2)}</h1>;
    if (t.startsWith('- ') || t.startsWith('* ')) {
      return <li key={i} className="ml-4 list-disc text-xs leading-relaxed my-0.5">{t.slice(2)}</li>;
    }
    if (!t) return <div key={i} className="h-2" />;
    return <p key={i} className="text-xs leading-relaxed my-1 opacity-90">{line}</p>;
  });
}

/**
 * Luma OS 1.6 (Nitrogen) — Universal Quick Look Modal (Spacebar Preview).
 * Supports Photos (zoom/rotate), Video & Audio (HTTP Range streaming), Code/Text (syntax highlight + AI 3.8 explain),
 * PDF, Markdown (rendered/raw), Folders, Space/Esc close, and Left/Right arrow sibling flipping!
 */
export const LumaQuickLookModal: React.FC<LumaQuickLookModalProps> = ({
  open,
  items,
  activeIndex,
  isDark,
  onChangeIndex,
  onClose,
  onOpenExternal,
  onPushToast,
}) => {
  const current = items[activeIndex] || items[0] || null;
  const [data, setData] = useState<QuickLookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [mdMode, setMdMode] = useState<'rendered' | 'raw'>('rendered');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReply, setAiReply] = useState('');
  const [aiSources, setAiSources] = useState<AISourceItem[]>([]);

  useEffect(() => {
    if (!open || !current?.path) return;
    setZoom(1);
    setRotation(0);
    setAiOpen(false);
    setAiReply('');
    setAiSources([]);
    setLoading(true);
    let cancelled = false;
    fetch(`/api/kernel/fs/quicklook?path=${encodeURIComponent(current.path)}`)
      .then((r) => r.json())
      .then((d: QuickLookData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ ok: false, kind: 'binary', name: current.name, path: current.path, error: 'Не удалось загрузить предпросмотр' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, current?.path, current?.name]);

  // Space / Esc to close, Left / Right arrows to navigate sibling files, +/- zoom, R rotate
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase() || '';
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'Escape' || e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (items.length > 1) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          onChangeIndex((activeIndex + 1) % items.length);
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          onChangeIndex((activeIndex - 1 + items.length) % items.length);
          return;
        }
      }
      if (data?.kind === 'image') {
        if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)));
        else if (e.key === '-') setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)));
        else if (e.key === '0') {
          setZoom(1);
          setRotation(0);
        } else if (e.key.toLowerCase() === 'r') setRotation((r) => (r + 90) % 360);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, items.length, activeIndex, onChangeIndex, onClose, data?.kind]);

  const explainWithAI38 = async () => {
    if (!data) return;
    setAiOpen(true);
    setAiLoading(true);
    try {
      const res = await fetch('/api/kernel/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'quicklook',
          action: 'explain',
          filename: data.name,
          content: data.text_preview || `Файл: ${data.name} (${data.kind}, ${data.size_human})`,
        }),
      });
      const d = await res.json();
      setAiReply(d?.reply || 'Не удалось получить объяснение AI 3.8.');
      setAiSources(Array.isArray(d?.sources) ? d.sources : []);
    } catch {
      setAiReply('Ошибка связи с Luma AI 3.8 FlashLite.');
    } finally {
      setAiLoading(false);
    }
  };

  const lines = useMemo(() => (data?.text_preview || '').split('\n'), [data?.text_preview]);

  if (!open || !current) return null;

  const encodedRawUrl = data?.path ? `/api/kernel/fs/raw?path=${encodeURIComponent(data.path)}` : '';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9680] bg-black/68 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-100"
    >
      {/* Left / Right Sibling Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex((activeIndex - 1 + items.length) % items.length);
            }}
            title="Предыдущий файл (←)"
            className="fixed left-4 top-1/2 -translate-y-1/2 z-[9690] w-11 h-11 rounded-full bg-black/60 hover:bg-cyan-500 text-white border border-white/15 flex items-center justify-center shadow-2xl cursor-pointer transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex((activeIndex + 1) % items.length);
            }}
            title="Следующий файл (→)"
            className="fixed right-4 top-1/2 -translate-y-1/2 z-[9690] w-11 h-11 rounded-full bg-black/60 hover:bg-cyan-500 text-white border border-white/15 flex items-center justify-center shadow-2xl cursor-pointer transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-5xl h-[82vh] rounded-[26px] border shadow-[0_36px_110px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden ${
          isDark ? 'bg-[#0a0e18]/95 border-white/15 text-white' : 'bg-white/96 border-slate-300 text-slate-900'
        }`}
      >
        {/* Top Toolbar */}
        <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 shrink-0">
              {data?.kind === 'image' ? <ImageIcon className="w-4 h-4" /> :
               data?.kind === 'video' ? <Film className="w-4 h-4" /> :
               data?.kind === 'audio' ? <Music className="w-4 h-4" /> :
               data?.kind === 'code' ? <FileCode className="w-4 h-4" /> :
               data?.kind === 'folder' ? <Folder className="w-4 h-4" /> :
               <FileText className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-extrabold truncate">{current.name}</div>
              <div className="text-[10px] font-mono opacity-60 truncate">
                Luma Peek · {data?.size_human || '…'} · {data?.mod_time || ''} · {activeIndex + 1} / {items.length}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {data?.kind === 'image' && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                  title="Уменьшить (-)"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono px-1.5">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                  title="Увеличить (+)"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  title="Повернуть влево"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Повернуть вправо (R)"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {data?.kind === 'markdown' && (
              <button
                type="button"
                onClick={() => setMdMode((m) => (m === 'rendered' ? 'raw' : 'rendered'))}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold cursor-pointer"
              >
                {mdMode === 'rendered' ? 'Исходник MD' : 'Просмотр MD'}
              </button>
            )}

            {(data?.kind === 'code' || data?.kind === 'text' || data?.kind === 'markdown') && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(data.text_preview || '');
                    onPushToast?.('Luma Peek', 'Содержимое файла скопировано', 'success');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Копировать
                </button>
                <button
                  type="button"
                  onClick={() => void explainWithAI38()}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Объяснить через AI 5.0
                </button>
              </>
            )}

            {onOpenExternal && (
              <button
                type="button"
                onClick={() => onOpenExternal(current.path)}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Открыть
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Закрыть (Space / Esc)"
              className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Preview Viewport + Optional AI 3.8 Drawer */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className="flex-1 min-w-0 min-h-0 overflow-auto flex items-center justify-center bg-black/25 relative">
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-cyan-300">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-mono">Загрузка предпросмотра...</span>
              </div>
            ) : !data?.ok ? (
              <div className="text-center p-8 text-xs opacity-70">{data?.error || 'Не удалось открыть файл'}</div>
            ) : data.kind === 'image' ? (
              <div
                onWheel={(e) => {
                  e.preventDefault();
                  setZoom((z) => Math.max(0.25, Math.min(4, +(z + (e.deltaY < 0 ? 0.15 : -0.15)).toFixed(2))));
                }}
                className="w-full h-full flex items-center justify-center overflow-hidden p-4"
              >
                <img
                  src={encodedRawUrl}
                  alt={data.name}
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                  className="max-w-full max-h-full object-contain transition-transform duration-150 rounded-xl shadow-2xl"
                />
              </div>
            ) : data.kind === 'video' ? (
              <div className="w-full h-full flex items-center justify-center p-4 bg-black">
                <video
                  key={encodedRawUrl}
                  src={encodedRawUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded-xl shadow-2xl outline-none"
                />
              </div>
            ) : data.kind === 'audio' ? (
              <div className="p-8 rounded-3xl border border-white/15 bg-gradient-to-br from-cyan-500/20 via-indigo-500/15 to-violet-600/20 max-w-md w-full text-center space-y-5 shadow-2xl">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg">
                  <Music className="w-12 h-12 text-white" />
                </div>
                <div>
                  <div className="text-base font-extrabold truncate">{data.name}</div>
                  <div className="text-xs font-mono opacity-65 mt-0.5">{data.size_human} · HTTP Range Streaming</div>
                </div>
                <audio key={encodedRawUrl} src={encodedRawUrl} controls autoPlay className="w-full" />
              </div>
            ) : data.kind === 'pdf' ? (
              <iframe title={data.name} src={encodedRawUrl} className="w-full h-full border-0 bg-white" />
            ) : data.kind === 'markdown' && mdMode === 'rendered' ? (
              <div className="w-full h-full overflow-y-auto p-6 select-text max-w-3xl mx-auto">
                {renderSimpleMarkdown(data.text_preview || '')}
              </div>
            ) : data.kind === 'code' || data.kind === 'text' || data.kind === 'markdown' ? (
              <div className="w-full h-full overflow-auto p-4 font-mono text-xs leading-relaxed select-text bg-[#0b101b] text-slate-200">
                {lines.map((ln, idx) => (
                  <div key={idx} className="flex gap-3 hover:bg-white/5 px-1 rounded">
                    <span className="w-10 text-right opacity-35 select-none shrink-0">{idx + 1}</span>
                    <span className="whitespace-pre-wrap break-all">{highlightCodeLine(ln)}</span>
                  </div>
                ))}
              </div>
            ) : data.kind === 'folder' ? (
              <div className="w-full h-full overflow-y-auto p-6 space-y-2 max-w-2xl">
                <div className="text-sm font-bold flex items-center gap-2 mb-3">
                  <Folder className="w-5 h-5 text-cyan-400" />
                  Содержимое папки ({data.size_human})
                </div>
                {(data.dir_children || []).map((ch) => (
                  <div key={ch.path} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <span className="truncate font-medium">{ch.is_dir ? '📁 ' : '📄 '}{ch.name}</span>
                    <span className="font-mono text-[10px] opacity-60">{ch.is_dir ? 'Папка' : `${(ch.size / 1024).toFixed(1)} КБ`}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center space-y-2 p-8">
                <FileText className="w-14 h-14 mx-auto opacity-35" />
                <div className="text-sm font-bold">{data.name}</div>
                <div className="text-xs font-mono opacity-60">Бинарный файл · {data.size_human}</div>
              </div>
            )}
          </div>

          {/* Inline Luma AI 3.8 Explanation Drawer */}
          {aiOpen && (
            <div className="w-80 sm:w-96 border-l border-white/12 bg-[#070b14]/95 p-4 overflow-y-auto flex flex-col gap-3 select-text shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300">
                  <Sparkles className="w-4 h-4" />
                  Luma AI 3.8 FlashLite
                </div>
                <button type="button" onClick={() => setAiOpen(false)} className="p-1 rounded hover:bg-white/10 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {aiLoading ? (
                <div className="py-10 flex flex-col items-center gap-2 text-cyan-300 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Анализ файла через AI 3.8...
                </div>
              ) : (
                <>
                  <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-200">{aiReply}</div>
                  {aiSources.length > 0 && (
                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">Проверенные источники</div>
                      {aiSources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/10 text-[11px] transition"
                        >
                          <div className="font-bold text-cyan-300 truncate">{s.provider} · {s.title}</div>
                          <div className="text-[10px] opacity-65 truncate">{s.url}</div>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className={`px-4 py-1.5 border-t text-[10px] font-mono flex items-center justify-between opacity-65 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <span>Space / Esc — закрыть</span>
          <span>← → — соседние файлы ({activeIndex + 1}/{items.length})</span>
          {data?.kind === 'image' ? <span>Колесо / +/- — зум · R — поворот</span> : <span>Luma Peek 1.6.4</span>}
        </div>
      </div>
    </div>
  );
};
