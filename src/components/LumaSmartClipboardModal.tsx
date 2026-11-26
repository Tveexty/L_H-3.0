import React, { useMemo, useState } from 'react';
import {
  Clipboard,
  Code2,
  FileText,
  Image as ImageIcon,
  Link2,
  Palette,
  Pin,
  ScanText,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
export interface SmartClipboardItem {
  id: string;
  text: string;
  time: string;
  source?: string;
  pinned?: boolean;
  imageData?: string;
  ocrText?: string;
}

export type SmartClipCategory = 'all' | 'pinned' | 'text' | 'link' | 'color' | 'image' | 'file' | 'code';

export function detectClipCategory(entry: SmartClipboardItem): Exclude<SmartClipCategory, 'all' | 'pinned'> {
  const txt = (entry.text || '').trim();
  if (entry.imageData || txt.startsWith('data:image/')) return 'image';
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(txt) || /^rgba?\(\s*\d+/i.test(txt) || /^hsla?\(\s*\d+/i.test(txt)) {
    return 'color';
  }
  if (/^https?:\/\/\S+$/i.test(txt)) return 'link';
  if (/^([a-zA-Z]:\\|\/(?:home|Users|tmp|var|etc)\/)/.test(txt) && !txt.includes('\n')) return 'file';
  if (/[{};=>]/.test(txt) && (txt.includes('\n') || /\b(function|const|let|import|def |class |func |SELECT )\b/.test(txt))) {
    return 'code';
  }
  return 'text';
}

interface LumaSmartClipboardModalProps {
  open: boolean;
  isDark: boolean;
  entries: SmartClipboardItem[];
  onClose: () => void;
  onPastePlain: (text: string, simulatePaste?: boolean) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  onClearUnpinned: () => void;
  onAddEntry: (entry: Partial<SmartClipboardItem>) => void;
  onUpdateOCRText: (id: string, ocrText: string) => void;
  onPushToast: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
}

export const LumaSmartClipboardModal: React.FC<LumaSmartClipboardModalProps> = ({
  open,
  isDark,
  entries,
  onClose,
  onPastePlain,
  onTogglePin,
  onDelete,
  onClearUnpinned,
  onAddEntry,
  onUpdateOCRText,
  onPushToast,
}) => {
  const [cat, setCat] = useState<SmartClipCategory>('all');
  const [query, setQuery] = useState('');
  const [plainByDefault, setPlainByDefault] = useState(true);
  const [ocrBusyId, setOcrBusyId] = useState<string | null>(null);

  const enriched = useMemo(
    () =>
      entries.map((e) => ({
        ...e,
        _cat: detectClipCategory(e),
      })),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched
      .filter((e) => {
        if (cat === 'pinned') return Boolean(e.pinned);
        if (cat !== 'all' && e._cat !== cat) return false;
        if (!q) return true;
        return (
          (e.text || '').toLowerCase().includes(q) ||
          (e.ocrText || '').toLowerCase().includes(q) ||
          (e.source || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  }, [enriched, cat, query]);

  if (!open) return null;

  const runOCR = async (id: string, imgData: string) => {
    setOcrBusyId(id);
    try {
      const r = await fetch('/api/kernel/clipboard/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imgData }),
      });
      const d = await r.json();
      if (d?.text) {
        onUpdateOCRText(id, d.text);
        onPushToast('Умный буфер · OCR', `Распознано символов: ${d.text.length} (${d.engine})`, 'success');
      } else {
        onPushToast('Умный буфер · OCR', d?.note || 'Текст на картинке не найден', 'info');
      }
    } catch {
      onPushToast('Умный буфер · OCR', 'Ошибка OCR-распознавания', 'warning');
    } finally {
      setOcrBusyId(null);
    }
  };

  const handleUploadImageForOCR = async (file: File) => {
    const dataUrl = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result || ''));
      fr.readAsDataURL(file);
    });
    const newId = `clip_img_${Date.now()}`;
    onAddEntry({
      id: newId,
      text: file.name,
      imageData: dataUrl,
      source: 'Изображение (Авто-OCR)',
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    });
    setCat('image');
    await runOCR(newId, dataUrl);
  };

  const categories: { id: SmartClipCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: `Все (${entries.length})`, icon: <Clipboard className="w-3.5 h-3.5" /> },
    { id: 'pinned', label: `Закреплённые`, icon: <Pin className="w-3.5 h-3.5" /> },
    { id: 'text', label: 'Текст', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'link', label: 'Ссылки', icon: <Link2 className="w-3.5 h-3.5" /> },
    { id: 'color', label: 'Цвета', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'image', label: 'Картинки + OCR', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'file', label: 'Файлы', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'code', label: 'Код', icon: <Code2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9650] bg-black/55 backdrop-blur-2xl flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[84vh] rounded-[28px] border shadow-[0_32px_100px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden ${
          isDark ? 'bg-[#071021]/95 border-cyan-400/25 text-white' : 'bg-white/95 border-slate-300 text-slate-900'
        }`}
      >
        {/* Top Bar */}
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold">Умный буфер обмена Oxygen (Paste / Raycast)</div>
              <div className="text-[11px] opacity-65">
                Категории · Цвета HEX/RGB · Авто-OCR картинок · Закрепление · Вставка без форматирования (Ctrl+Shift+V)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Картинка → OCR
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUploadImageForOCR(f);
                  e.target.value = '';
                }}
              />
            </label>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search + Plain-Text Toggle + Category Pills */}
        <div className="p-3.5 border-b border-white/10 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10">
              <Search className="w-4 h-4 opacity-55" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по истории, ссылкам, цветам HEX и тексту OCR..."
                className="flex-1 bg-transparent text-xs outline-none"
              />
            </div>
            <label className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[11px] font-bold flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={plainByDefault}
                onChange={(e) => setPlainByDefault(e.target.checked)}
                className="accent-emerald-400"
              />
              Без форматирования (Ctrl+Shift+V)
            </label>
            <button
              onClick={onClearUnpinned}
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold cursor-pointer"
            >
              Очистить незакреплённые
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 border cursor-pointer transition ${
                  cat === c.id
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-white/[0.05] border-white/10 opacity-80 hover:opacity-100'
                }`}
              >
                {c.icon}
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clipboard Cards Grid */}
        <div className="p-4 flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs opacity-60">
              Ничего не найдено в этой категории. Скопируйте текст, ссылку, цвет (#06b6d4) или загрузите картинку для авто-OCR.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 transition ${
                  item.pinned
                    ? 'bg-cyan-500/[0.11] border-cyan-400/40'
                    : isDark
                    ? 'bg-white/[0.04] border-white/10 hover:border-cyan-400/35'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono opacity-70">
                    <span className="uppercase px-1.5 py-0.5 rounded bg-white/10">{item._cat}</span>
                    <span>
                      {item.source ? `${item.source} · ` : ''}
                      {item.time}
                    </span>
                  </div>

                  {item._cat === 'color' && (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl border border-white/25 shadow-inner shrink-0"
                        style={{ backgroundColor: item.text }}
                      />
                      <div className="font-mono text-sm font-extrabold">{item.text}</div>
                    </div>
                  )}

                  {item._cat === 'image' && item.imageData && (
                    <div className="space-y-1.5">
                      <img src={item.imageData} alt={item.text} className="w-full max-h-36 object-cover rounded-xl border border-white/10" />
                      {item.ocrText && (
                        <div className="p-2 rounded-xl bg-black/30 text-[11px] font-mono text-cyan-200 max-h-20 overflow-y-auto">
                          OCR: {item.ocrText}
                        </div>
                      )}
                    </div>
                  )}

                  {item._cat !== 'color' && item._cat !== 'image' && (
                    <div className={`text-xs break-words line-clamp-4 ${item._cat === 'code' ? 'font-mono text-emerald-300' : ''}`}>
                      {item.text}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const txt = item.ocrText || item.text;
                        onPastePlain(txt, plainByDefault);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-extrabold cursor-pointer"
                    >
                      {plainByDefault ? 'Вставить чисто' : 'Копировать'}
                    </button>
                    {item._cat === 'image' && item.imageData && (
                      <button
                        disabled={ocrBusyId === item.id}
                        onClick={() => void runOCR(item.id, item.imageData!)}
                        className="px-2 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/35 text-indigo-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ScanText className="w-3 h-3" />
                        {ocrBusyId === item.id ? 'OCR...' : 'OCR'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onTogglePin(item.id)}
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        item.pinned ? 'bg-cyan-500/25 text-cyan-300' : 'hover:bg-white/10 opacity-70'
                      }`}
                      title={item.pinned ? 'Открепить' : 'Закрепить сниппет'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
