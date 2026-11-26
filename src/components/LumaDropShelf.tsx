import React, { useEffect, useState } from 'react';
import {
  Archive,
  ClipboardCopy,
  FileText,
  FolderInput,
  Image as ImageIcon,
  Layers,
  Link2,
  Plus,
  Trash2,
  X,
  ArrowLeftRight,
  PackageCheck,
} from 'lucide-react';

export interface DropShelfItem {
  id: string;
  kind: 'file' | 'image' | 'text' | 'url';
  name: string;
  path?: string;
  content?: string;
  size?: number;
  added_at: string;
}

interface LumaDropShelfProps {
  isDark: boolean;
  onPushToast: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
  onCopyToClipboard?: (text: string) => void;
}

export const LumaDropShelf: React.FC<LumaDropShelfProps> = ({ isDark, onPushToast, onCopyToClipboard }) => {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'right' | 'left'>('right');
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState<DropShelfItem[]>([]);
  const [busy, setBusy] = useState(false);

  const loadShelf = async () => {
    try {
      const r = await fetch('/api/kernel/shelf');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.items)) setItems(d.items);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadShelf();
    const id = window.setInterval(() => void loadShelf(), 7000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-slide out Yoink / Dropzone shelf whenever user drags ANY file, image, or text over the screen!
  useEffect(() => {
    let dragDepth = 0;
    const onDragEnter = (e: DragEvent) => {
      const types = Array.from(e.dataTransfer?.types || []);
      if (types.includes('Files') || types.includes('text/plain') || types.includes('text/uri-list')) {
        dragDepth++;
        setOpen(true);
      }
    };
    const onDragLeave = () => {
      dragDepth = Math.max(0, dragDepth - 1);
    };
    const onDropGlobal = () => {
      dragDepth = 0;
    };
    const onHotkey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onToggleEvent = () => setOpen((v) => !v);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDropGlobal);
    window.addEventListener('keydown', onHotkey);
    window.addEventListener('luma-toggle-shelf', onToggleEvent);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDropGlobal);
      window.removeEventListener('keydown', onHotkey);
      window.removeEventListener('luma-toggle-shelf', onToggleEvent);
    };
  }, []);

  const addItem = async (item: Partial<DropShelfItem>) => {
    try {
      const r = await fetch('/api/kernel/shelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', item }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.items)) setItems(d.items);
      }
    } catch {
      const localItem: DropShelfItem = {
        id: `local_${Date.now()}_${Math.random()}`,
        kind: (item.kind as DropShelfItem['kind']) || 'text',
        name: item.name || 'Элемент',
        path: item.path,
        content: item.content,
        size: item.size,
        added_at: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
      setItems((prev) => [localItem, ...prev]);
    }
  };

  const handleDropOnShelf = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      for (const f of files.slice(0, 12)) {
        const isImg = f.type.startsWith('image/');
        if (isImg && f.size <= 3 * 1024 * 1024) {
          const dataUrl = await new Promise<string>((res) => {
            const reader = new FileReader();
            reader.onload = () => res(String(reader.result || ''));
            reader.readAsDataURL(f);
          });
          await addItem({ kind: 'image', name: f.name, content: dataUrl, size: f.size });
        } else if (f.size <= 512 * 1024 && (f.type.startsWith('text/') || /\.(txt|md|json|js|ts|py|go|css|html)$/i.test(f.name))) {
          const txt = await f.text();
          await addItem({ kind: 'file', name: f.name, content: txt, size: f.size });
        } else {
          await addItem({ kind: 'file', name: f.name, size: f.size, content: `Файл: ${f.name} (${Math.round(f.size / 1024)} КБ)` });
        }
      }
      onPushToast('Полка Luma (Dropzone)', `Добавлено на полку: ${files.length}`, 'success');
      window.dispatchEvent(
        new CustomEvent('luma-harmony-transfer', {
          detail: {
            direction: 'receive',
            fileName: files.length === 1 ? files[0].name : `${files.length} файлов`,
            size: files.reduce((acc, f) => acc + f.size, 0),
            device: 'Полка Dropzone',
          },
        })
      );
      return;
    }

    const uri = e.dataTransfer.getData('text/uri-list');
    const txt = e.dataTransfer.getData('text/plain');
    if (uri && /^https?:\/\//i.test(uri.trim())) {
      await addItem({ kind: 'url', name: uri.trim().slice(0, 48), content: uri.trim() });
      onPushToast('Полка Luma', 'Ссылка добавлена на полку', 'success');
    } else if (txt && txt.trim()) {
      await addItem({ kind: 'text', name: txt.trim().slice(0, 36), content: txt.trim() });
      onPushToast('Полка Luma', 'Текст добавлен на полку', 'success');
    }
  };

  const addFileFromPC = async () => {
    try {
      const r = await fetch('/api/kernel/pick-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'file' }),
      });
      const d = await r.json();
      if (d?.picked && d?.path) {
        const isImg = /\.(png|jpg|jpeg|webp|gif)$/i.test(d.name || '');
        await addItem({ kind: isImg ? 'image' : 'file', name: d.name, path: d.path, size: d.size });
        onPushToast('Полка Luma', `Файл «${d.name}» положен на полку`, 'success');
        window.dispatchEvent(
          new CustomEvent('luma-harmony-transfer', {
            detail: { direction: 'receive', fileName: d.name, path: d.path, size: d.size, device: 'Полка Dropzone' },
          })
        );
      }
    } catch {
      // ignore
    }
  };

  const takeAllToFolder = async (move: boolean) => {
    if (items.length === 0) return;
    setBusy(true);
    try {
      const pr = await fetch('/api/kernel/pick-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'folder' }),
      });
      const pd = await pr.json();
      const targetDir = pd?.picked && pd?.path ? pd.path : '';
      const r = await fetch('/api/kernel/shelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: move ? 'move_all' : 'copy_all', target_dir: targetDir }),
      });
      const d = await r.json();
      if (d?.ok) {
        if (Array.isArray(d.items)) setItems(d.items);
        window.dispatchEvent(
          new CustomEvent('luma-harmony-transfer', {
            detail: {
              direction: 'send',
              fileName: `Пачка (${d.transferred || items.length} файлов)`,
              path: d.target_dir || targetDir,
              device: move ? 'Перемещено' : 'Скопировано',
            },
          })
        );
        onPushToast(
          'Полка Luma · Забрать пачкой',
          `${move ? 'Перемещено' : 'Скопировано'} объектов: ${d.count} → ${d.target_dir}`,
          'success'
        );
      }
    } catch {
      onPushToast('Полка Luma', 'Не удалось выгрузить пачку', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const zipAll = async () => {
    if (items.length === 0) return;
    setBusy(true);
    try {
      const r = await fetch('/api/kernel/shelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'zip_all' }),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast('Полка Luma · ZIP-пачка', `Собран архив (${d.count} шт.): ${d.zip_path}`, 'success');
      }
    } catch {
      onPushToast('Полка Luma', 'Ошибка сборки ZIP', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    await fetch('/api/kernel/shelf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', id }),
    }).catch(() => {});
  };

  const clearShelf = async () => {
    setItems([]);
    await fetch('/api/kernel/shelf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    }).catch(() => {});
  };

  return (
    <>
      {/* Subtle Edge Tab Handle (Yoink / Dropzone style) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          onDragOver={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          title="Полка Drag & Drop (Yoink / Dropzone · Ctrl+Alt+S)"
          className={`fixed top-1/2 -translate-y-1/2 z-[8800] py-4 px-1.5 border backdrop-blur-xl shadow-2xl transition-all hover:px-2.5 cursor-pointer flex flex-col items-center gap-1.5 ${
            side === 'right' ? 'right-0 rounded-l-2xl border-r-0' : 'left-0 rounded-r-2xl border-l-0'
          } ${
            isDark
              ? 'bg-[#071122]/85 border-cyan-400/35 text-cyan-300 hover:bg-cyan-500/20'
              : 'bg-white/90 border-cyan-500/40 text-cyan-700 hover:bg-cyan-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          {items.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
              {items.length}
            </span>
          )}
        </button>
      )}

      {/* Slide-out Glassmorphic Shelf Panel */}
      {open && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => void handleDropOnShelf(e)}
          className={`fixed top-1/2 -translate-y-1/2 z-[8900] w-80 max-h-[78vh] flex flex-col rounded-3xl border shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all ${
            side === 'right' ? 'right-3' : 'left-3'
          } ${
            dragOver
              ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.015]'
              : isDark
              ? 'bg-[#060f1f]/92 border-cyan-400/30 text-white'
              : 'bg-white/94 border-slate-300 text-slate-900'
          }`}
        >
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold truncate">Полка Dropzone ({items.length})</div>
                <div className="text-[10px] opacity-60 truncate">Кидайте файлы · Переключайте окна</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSide((s) => (s === 'right' ? 'left' : 'right'))}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                title="Перенести край полки (лево/право)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Drop Zone */}
          <div className="p-3 flex-1 overflow-y-auto space-y-2">
            <div
              className={`p-3 rounded-2xl border border-dashed text-center text-[11px] transition ${
                dragOver ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-cyan-400/30 bg-cyan-500/[0.05] opacity-80'
              }`}
            >
              <div className="font-bold">Перетащите файлы, фото или текст сюда</div>
              <button
                onClick={() => void addFileFromPC()}
                className="mt-2 px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/35 text-cyan-300 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Добавить файл с ПК
              </button>
            </div>

            {items.map((it) => (
              <div
                key={it.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', it.path || it.content || it.name);
                  if (it.kind === 'url' && it.content) e.dataTransfer.setData('text/uri-list', it.content);
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs cursor-grab active:cursor-grabbing ${
                  isDark ? 'bg-white/[0.05] border-white/10 hover:border-cyan-400/40' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {it.kind === 'image' && it.content?.startsWith('data:image/') ? (
                  <img src={it.content} alt={it.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                    {it.kind === 'image' ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : it.kind === 'url' ? (
                      <Link2 className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{it.name}</div>
                  <div className="text-[10px] opacity-60 truncate font-mono">
                    {it.path ? it.path : it.size ? `${Math.max(1, Math.round(it.size / 1024))} КБ` : it.kind.toUpperCase()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const txt = it.path || it.content || it.name;
                    onCopyToClipboard?.(txt);
                    onPushToast('Полка Luma', `Скопировано: ${it.name}`, 'info');
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                  title="Копировать путь/текст"
                >
                  <ClipboardCopy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => void removeItem(it.id)}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                  title="Убрать с полки"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Batch Take-All Actions */}
          {items.length > 0 && (
            <div className="p-3 border-t border-white/10 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  disabled={busy}
                  onClick={() => void takeAllToFolder(false)}
                  className="px-2.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  Забрать пачкой
                </button>
                <button
                  disabled={busy}
                  onClick={() => void zipAll()}
                  className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5 text-cyan-400" />
                  В ZIP-архив
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <button
                  disabled={busy}
                  onClick={() => void takeAllToFolder(true)}
                  className="opacity-75 hover:opacity-100 inline-flex items-center gap-1 cursor-pointer"
                >
                  <FolderInput className="w-3 h-3" /> Переместить всё в папку
                </button>
                <button onClick={() => void clearShelf()} className="text-rose-400 hover:underline cursor-pointer">
                  Очистить полку
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
