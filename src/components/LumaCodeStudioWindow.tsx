import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileCode2,
  Folder,
  FolderOpen,
  Play,
  Save,
  Plus,
  X,
  Terminal,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Eye,
  WrapText,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  FolderUp,
} from 'lucide-react';

interface FsEntryItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

interface EditorTab {
  id: string;
  name: string;
  path: string; // empty = scratch buffer
  content: string;
  dirty: boolean;
  language: string;
}

interface LumaCodeStudioWindowProps {
  isDark: boolean;
  onNotify?: (title: string, msg: string, kind?: 'info' | 'success' | 'warn') => void;
}

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript',
    mjs: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    go: 'go',
    html: 'html',
    htm: 'html',
    css: 'css',
    json: 'json',
    rs: 'rust',
    cs: 'csharp',
    sql: 'sql',
    md: 'markdown',
    sh: 'bash',
    bat: 'batch',
    ps1: 'powershell',
  };
  return map[ext] || 'plaintext';
}

const STARTER_TABS: EditorTab[] = [
  {
    id: 'tab_welcome_js',
    name: 'welcome.js',
    path: '',
    language: 'javascript',
    dirty: false,
    content: `// Luma Code Studio 1.5 (Carbon Edition)
// Нажмите "Запустить" (Ctrl+Enter) или откройте любой файл с диска слева!

function fibonacci(n) {
  const seq = [0, 1];
  for (let i = 2; i < n; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq;
}

console.log("⚡ Luma Code Studio готов к работе!");
console.log("Числа Фибоначчи (10):", fibonacci(10).join(", "));
`,
  },
  {
    id: 'tab_preview_html',
    name: 'carbon_card.html',
    path: '',
    language: 'html',
    dirty: false,
    content: `<!DOCTYPE html>
<html lang="ru">
<head>
  <style>
    body {
      margin: 0; height: 100vh; display: grid; place-items: center;
      background: radial-gradient(circle at 20% 20%, #0ea5e933, #090b10 65%);
      font-family: system-ui, sans-serif; color: #fff;
    }
    .card {
      padding: 28px 34px; border-radius: 22px;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14);
      backdrop-filter: blur(18px); text-align: center;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    }
    h1 { margin: 0 0 8px; font-size: 22px; color: #38bdf8; }
    p { margin: 0; font-size: 13px; opacity: 0.78; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Luma OS 1.5 · Carbon</h1>
    <p>Живой HTML/CSS/JS предпросмотр прямо внутри Luma Code Studio</p>
  </div>
</body>
</html>`,
  },
];

export const LumaCodeStudioWindow: React.FC<LumaCodeStudioWindowProps> = ({
  isDark,
  onNotify,
}) => {
  const [tabs, setTabs] = useState<EditorTab[]>(STARTER_TABS);
  const [activeTabId, setActiveTabId] = useState<string>(STARTER_TABS[0].id);
  const [currentDir, setCurrentDir] = useState<string>('');
  const [entries, setEntries] = useState<FsEntryItem[]>([]);
  const [loadingFs, setLoadingFs] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Luma Code Studio 1.5 (Carbon IDE) — Встроенный терминал и раннер готовы.',
  ]);
  const [termCmd, setTermCmd] = useState('');
  const [statusToast, setStatusToast] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoadingFs(true);
    try {
      const res = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ls', path: dirPath }),
      });
      const data = await res.json();
      if (data?.ok) {
        setCurrentDir(data.path || dirPath);
        const list: FsEntryItem[] = Array.isArray(data.entries) ? data.entries : [];
        list.sort((a, b) => Number(b.is_dir) - Number(a.is_dir) || a.name.localeCompare(b.name));
        setEntries(list);
      }
    } catch {
      // fallback
    } finally {
      setLoadingFs(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory('~');
  }, [loadDirectory]);

  const openDiskFile = async (entry: FsEntryItem) => {
    if (entry.is_dir) {
      void loadDirectory(entry.path);
      return;
    }
    const existing = tabs.find((t) => t.path === entry.path);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    try {
      const res = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', path: entry.path }),
      });
      const data = await res.json();
      if (data?.ok) {
        const newTab: EditorTab = {
          id: `tab_${Date.now()}`,
          name: entry.name,
          path: data.path || entry.path,
          content: String(data.content ?? ''),
          dirty: false,
          language: detectLanguage(entry.name),
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    } catch {
      setStatusToast('Не удалось прочитать файл');
    }
  };

  const updateActiveContent = (nextCode: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, content: nextCode, dirty: true } : t))
    );
  };

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    let targetPath = activeTab.path;
    if (!targetPath) {
      const base = currentDir || '~';
      const sep = base.includes('\\') ? '\\' : '/';
      targetPath = `${base.replace(/[\\/]+$/, '')}${sep}${activeTab.name}`;
    }
    try {
      const res = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'newfile', path: targetPath, content: activeTab.content }),
      });
      const data = await res.json();
      if (data?.ok) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id ? { ...t, path: data.path || targetPath, dirty: false } : t
          )
        );
        setStatusToast(`Сохранено: ${activeTab.name}`);
        setTimeout(() => setStatusToast(''), 2200);
        void loadDirectory(currentDir || '~');
        onNotify?.('Luma Code Studio', `Файл «${activeTab.name}» сохранён на диск`, 'success');
      } else {
        setStatusToast(data?.error || 'Ошибка сохранения');
      }
    } catch {
      setStatusToast('Нет связи с Luma FS');
    }
  }, [activeTab, currentDir, loadDirectory, onNotify]);

  const handleRunCode = useCallback(async () => {
    if (!activeTab) return;
    setShowTerminal(true);
    const lang = activeTab.language;
    const stamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (lang === 'html') {
      setShowHtmlPreview(true);
      setTerminalLogs((prev) => [...prev, `[${stamp}] ▶ Открыт живой HTML-предпросмотр для ${activeTab.name}`]);
      return;
    }

    if (lang === 'javascript') {
      const captured: string[] = [];
      const fakeConsole = {
        log: (...args: unknown[]) => captured.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
        warn: (...args: unknown[]) => captured.push('⚠ ' + args.map(String).join(' ')),
        error: (...args: unknown[]) => captured.push('✖ ' + args.map(String).join(' ')),
      };
      try {
        const fn = new Function('console', activeTab.content);
        const res = fn(fakeConsole);
        if (res !== undefined) captured.push(`=> ${String(res)}`);
        setTerminalLogs((prev) => [
          ...prev,
          `[${stamp}] ▶ node/js ${activeTab.name}`,
          ...(captured.length ? captured : ['(Успешно выполнено без вывода)']),
        ]);
      } catch (err) {
        setTerminalLogs((prev) => [
          ...prev,
          `[${stamp}] ✖ JS Error: ${err instanceof Error ? err.message : String(err)}`,
        ]);
      }
      return;
    }

    // For Python / Go / Bash / saved scripts — execute via real OS shell /api/kernel/exec!
    if (activeTab.path) {
      let cmd = '';
      if (lang === 'python') cmd = `python3 "${activeTab.path}" || python "${activeTab.path}"`;
      else if (lang === 'go') cmd = `go run "${activeTab.path}"`;
      else if (lang === 'bash') cmd = `bash "${activeTab.path}"`;
      else cmd = `echo "Файл ${activeTab.name} сохранён (${activeTab.content.length} байт)"`;
      setTerminalLogs((prev) => [...prev, `[${stamp}] $ ${cmd}`]);
      try {
        const res = await fetch('/api/kernel/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });
        const data = await res.json();
        const out = [data.stdout, data.stderr].filter(Boolean).join('\n');
        setTerminalLogs((prev) => [...prev, out || `(Код возврата: ${data.exit_code ?? 0})`]);
      } catch {
        setTerminalLogs((prev) => [...prev, '✖ Не удалось выполнить команду через ядро ОС']);
      }
    } else {
      setTerminalLogs((prev) => [
        ...prev,
        `[${stamp}] ℹ Сохраните файл (Ctrl+S), чтобы запустить ${lang} через интерпретатор ОС`,
      ]);
    }
  }, [activeTab]);

  const handleExecTerminal = async () => {
    const cmd = termCmd.trim();
    if (!cmd) return;
    setTermCmd('');
    setTerminalLogs((prev) => [...prev, `$ ${cmd}`]);
    try {
      const res = await fetch('/api/kernel/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      const out = [data.stdout, data.stderr].filter(Boolean).join('\n');
      setTerminalLogs((prev) => [...prev, out || `(exit ${data.exit_code ?? 0})`]);
    } catch {
      setTerminalLogs((prev) => [...prev, 'Ошибка выполнения команды']);
    }
  };

  const handleCreateNewTab = () => {
    const fname = newFileName.trim() || `script_${tabs.length + 1}.js`;
    const newTab: EditorTab = {
      id: `tab_${Date.now()}`,
      name: fname,
      path: '',
      content: '',
      dirty: true,
      language: detectLanguage(fname),
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setNewFileName('');
    setCreatingFile(false);
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return;
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (activeTabId === id) setActiveTabId(next[0].id);
  };

  const handleReplaceAll = () => {
    if (!findQuery || !activeTab) return;
    updateActiveContent(activeTab.content.split(findQuery).join(replaceQuery));
  };

  const goParentDir = () => {
    if (!currentDir || currentDir === '/' || currentDir.length <= 3) return;
    const cleaned = currentDir.replace(/[\\/]+$/, '');
    const idx = Math.max(cleaned.lastIndexOf('/'), cleaned.lastIndexOf('\\'));
    if (idx > 0) void loadDirectory(cleaned.slice(0, idx));
    else void loadDirectory('/');
  };

  // Keyboard shortcuts inside editor
  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      void handleSave();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleRunCode();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setShowFind((v) => !v);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const el = textareaRef.current;
      if (!el || !activeTab) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = activeTab.content.slice(0, start) + '  ' + activeTab.content.slice(end);
      updateActiveContent(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  const lines = useMemo(() => (activeTab?.content || '').split('\n'), [activeTab?.content]);

  return (
    <div
      className={`h-full flex flex-col select-text ${
        isDark ? 'bg-[#0d1017] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* Top IDE Toolbar */}
      <div
        className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
          isDark ? 'bg-[#121620] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border ${
              showSidebar
                ? 'bg-cyan-500/15 border-cyan-400/35 text-cyan-400'
                : isDark
                ? 'bg-white/[0.04] border-white/10 text-white/65'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Folder size={12} /> Проводник
          </button>
          <button
            onClick={() => setCreatingFile((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 border ${
              isDark ? 'bg-white/[0.04] border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Plus size={12} /> Новый файл
          </button>
          <button
            onClick={() => void handleSave()}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-400/30 flex items-center gap-1"
            title="Сохранить на диск (Ctrl+S)"
          >
            <Save size={12} /> Сохранить
          </button>
          <button
            onClick={() => void handleRunCode()}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1 shadow-sm"
            title="Запустить код (Ctrl+Enter)"
          >
            <Play size={11} fill="currentColor" /> Запустить
          </button>
        </div>

        <div className="flex items-center gap-1">
          {statusToast && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mr-2">
              <CheckCircle2 size={12} /> {statusToast}
            </span>
          )}
          <button
            onClick={() => setShowFind((v) => !v)}
            className={`p-1.5 rounded-lg border ${
              showFind
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400'
                : isDark
                ? 'bg-white/[0.04] border-white/10 text-white/65'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
            title="Поиск и замена (Ctrl+F)"
          >
            <Search size={12} />
          </button>
          <button
            onClick={() => setWordWrap((v) => !v)}
            className={`p-1.5 rounded-lg border ${
              wordWrap
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400'
                : isDark
                ? 'bg-white/[0.04] border-white/10 text-white/65'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
            title="Перенос строк"
          >
            <WrapText size={12} />
          </button>
          <button
            onClick={() => setFontSize((s) => Math.max(10, s - 1))}
            className={`p-1.5 rounded-lg border ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200'}`}
            title="Уменьшить шрифт"
          >
            <ZoomOut size={12} />
          </button>
          <button
            onClick={() => setFontSize((s) => Math.min(22, s + 1))}
            className={`p-1.5 rounded-lg border ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200'}`}
            title="Увеличить шрифт"
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={() => setShowHtmlPreview((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 border ${
              showHtmlPreview
                ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                : isDark
                ? 'bg-white/[0.04] border-white/10 text-white/65'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Eye size={12} /> Превью
          </button>
          <button
            onClick={() => setShowTerminal((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 border ${
              showTerminal
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                : isDark
                ? 'bg-white/[0.04] border-white/10 text-white/65'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Terminal size={12} /> Консоль
          </button>
        </div>
      </div>

      {/* New File Prompt */}
      {creatingFile && (
        <div
          className={`px-3 py-1.5 border-b flex items-center gap-2 ${
            isDark ? 'bg-cyan-500/10 border-white/10' : 'bg-cyan-50 border-slate-200'
          }`}
        >
          <FileCode2 size={14} className="text-cyan-400" />
          <input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNewTab()}
            placeholder="Имя файла (app.py, index.html, main.go, style.css)..."
            autoFocus
            className="flex-1 bg-transparent text-xs outline-none"
          />
          <button
            onClick={handleCreateNewTab}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500 text-black"
          >
            Создать
          </button>
          <button onClick={() => setCreatingFile(false)} className="opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Split Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left File Tree Sidebar */}
        {showSidebar && (
          <div
            className={`w-56 shrink-0 border-r flex flex-col overflow-hidden ${
              isDark ? 'bg-[#0b0e14] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div
              className={`px-2.5 py-2 border-b flex items-center justify-between gap-1 ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 truncate" title={currentDir}>
                {currentDir || 'Файлы ПК'}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={goParentDir} className="p-1 rounded hover:bg-white/10" title="Уровень вверх">
                  <FolderUp size={12} />
                </button>
                <button
                  onClick={() => void loadDirectory(currentDir || '~')}
                  className="p-1 rounded hover:bg-white/10"
                  title="Обновить"
                >
                  <RefreshCw size={11} className={loadingFs ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => void openDiskFile(entry)}
                  className={`w-full px-2 py-1 rounded-lg text-left text-[11px] flex items-center gap-1.5 truncate transition ${
                    activeTab?.path === entry.path
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : isDark
                      ? 'hover:bg-white/[0.06] text-white/80'
                      : 'hover:bg-slate-200/70 text-slate-800'
                  }`}
                >
                  {entry.is_dir ? (
                    <>
                      <ChevronRight size={11} className="opacity-50 shrink-0" />
                      <FolderOpen size={13} className="text-amber-400 shrink-0" />
                    </>
                  ) : (
                    <FileCode2 size={13} className="text-cyan-400 shrink-0 ml-3" />
                  )}
                  <span className="truncate">{entry.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Center Editor + Tabs + Optional HTML Preview + Bottom Terminal */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* File Tabs */}
          <div
            className={`flex items-center overflow-x-auto border-b shrink-0 ${
              isDark ? 'bg-[#0e121b] border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {tabs.map((tab) => {
              const active = tab.id === activeTab?.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1.5 border-r cursor-pointer shrink-0 transition ${
                    active
                      ? isDark
                        ? 'bg-[#0d1017] text-cyan-300 border-t-2 border-t-cyan-400 border-r-white/10'
                        : 'bg-white text-cyan-700 border-t-2 border-t-cyan-500 border-r-slate-200'
                      : isDark
                      ? 'text-white/55 hover:bg-white/[0.04] border-r-white/10'
                      : 'text-slate-600 hover:bg-slate-200/60 border-r-slate-200'
                  }`}
                >
                  <FileCode2 size={12} />
                  <span>{tab.name}</span>
                  {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="ml-1 opacity-50 hover:opacity-100"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Find & Replace Bar */}
          {showFind && (
            <div
              className={`px-3 py-1.5 border-b flex flex-wrap items-center gap-2 text-xs ${
                isDark ? 'bg-[#141925] border-white/10' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <input
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder="Найти..."
                className={`px-2 py-1 rounded-lg border outline-none text-xs ${
                  isDark ? 'bg-black/40 border-white/15' : 'bg-white border-slate-300'
                }`}
              />
              <input
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Заменить на..."
                className={`px-2 py-1 rounded-lg border outline-none text-xs ${
                  isDark ? 'bg-black/40 border-white/15' : 'bg-white border-slate-300'
                }`}
              />
              <button
                onClick={handleReplaceAll}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30"
              >
                Заменить все
              </button>
              <button onClick={() => setShowFind(false)} className="ml-auto opacity-60 hover:opacity-100">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Code Area + Optional Live HTML Preview */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <div className="flex-1 flex min-h-0 overflow-auto font-mono">
              {/* Line Numbers Gutter */}
              <div
                className={`py-3 px-2.5 text-right select-none shrink-0 border-r ${
                  isDark
                    ? 'bg-[#0b0e14] border-white/10 text-white/30'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
                style={{ fontSize, lineHeight: '1.6' }}
              >
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              {/* Editable Code Surface */}
              <textarea
                ref={textareaRef}
                value={activeTab?.content || ''}
                onChange={(e) => updateActiveContent(e.target.value)}
                onKeyDown={onEditorKeyDown}
                spellCheck={false}
                wrap={wordWrap ? 'soft' : 'off'}
                className={`flex-1 p-3 bg-transparent outline-none resize-none font-mono ${
                  isDark ? 'text-sky-100 caret-cyan-400' : 'text-slate-900 caret-cyan-600'
                }`}
                style={{ fontSize, lineHeight: '1.6', tabSize: 2 }}
              />
            </div>

            {showHtmlPreview && (
              <div className="w-[42%] border-l border-white/10 bg-white flex flex-col">
                <div className="px-2.5 py-1 bg-slate-900 text-white text-[10px] font-semibold flex items-center justify-between">
                  <span>Живой HTML Предпросмотр</span>
                  <button onClick={() => setShowHtmlPreview(false)}>
                    <X size={12} />
                  </button>
                </div>
                <iframe
                  title="Luma Code Live Preview"
                  srcDoc={activeTab?.content || ''}
                  sandbox="allow-scripts"
                  className="flex-1 w-full border-0"
                />
              </div>
            )}
          </div>

          {/* Integrated Terminal Panel */}
          {showTerminal && (
            <div
              className={`h-36 shrink-0 border-t flex flex-col ${
                isDark ? 'bg-[#080a0f] border-white/10' : 'bg-slate-900 text-slate-100 border-slate-300'
              }`}
            >
              <div className="px-3 py-1 border-b border-white/10 flex items-center justify-between text-[10px] text-white/60">
                <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <ChevronDown size={11} /> ТЕРМИНАЛ И ВЫВОД
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setTerminalLogs([])} className="hover:text-white">
                    Очистить
                  </button>
                  <button onClick={() => setShowTerminal(false)} className="hover:text-white">
                    <X size={11} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-1.5 font-mono text-[11px] space-y-0.5 text-emerald-300/90">
                {terminalLogs.map((l, i) => (
                  <pre key={i} className="whitespace-pre-wrap break-words m-0">
                    {l}
                  </pre>
                ))}
              </div>
              <div className="px-3 py-1 border-t border-white/10 flex items-center gap-2 font-mono text-[11px]">
                <span className="text-cyan-400">$</span>
                <input
                  value={termCmd}
                  onChange={(e) => setTermCmd(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleExecTerminal()}
                  placeholder="Выполнить команду ОС (node -v, python --version, git status)..."
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-white/35"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VS Code Style Status Bar */}
      <div className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-[10px] font-mono flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold">Luma Code Studio 1.5</span>
          <span>{activeTab?.language.toUpperCase()}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Строк: {lines.length}</span>
          <span>Символов: {activeTab?.content.length || 0}</span>
          <span>Ctrl+S · Ctrl+Enter</span>
        </div>
      </div>
    </div>
  );
};
