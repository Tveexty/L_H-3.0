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
  Sparkles,
  Download,
  Command,
  Code2,
  Map as MapIcon,
  Wand2,
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
  path: string; // empty = unsaved scratch file
  content: string;
  dirty: boolean;
  language: string;
}

interface LumaCodeStudioWindowProps {
  isDark: boolean;
  onNotify?: (title: string, msg: string, kind?: 'info' | 'success' | 'warn') => void;
}

const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'python', 'go', 'html', 'css',
  'json', 'rust', 'cpp', 'csharp', 'sql', 'markdown', 'bash', 'powershell',
];

const CODE_SNIPPETS: { label: string; lang: string; file: string; code: string }[] = [
  {
    label: 'JavaScript · Async Fetch',
    lang: 'javascript',
    file: 'fetch_demo.js',
    code: `async function loadStatus() {\n  const res = await fetch('/api/kernel/status');\n  const data = await res.json();\n  console.log('Luma OS:', data.version, data.codename);\n}\nloadStatus();\n`,
  },
  {
    label: 'Python · FastAPI Server',
    lang: 'python',
    file: 'server.py',
    code: `from fastapi import FastAPI\n\napp = FastAPI(title="Luma API")\n\n@app.get("/health")\nasync def health():\n    return {"ok": True, "os": "Luma 1.5.1"}\n`,
  },
  {
    label: 'HTML5 · Glass Card',
    lang: 'html',
    file: 'index.html',
    code: `<!doctype html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8" />\n  <style>\n    body { margin:0; height:100vh; display:grid; place-items:center; background:#090b10; color:#fff; font-family:system-ui; }\n    .card { padding:28px 36px; border-radius:20px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15); }\n  </style>\n</head>\n<body>\n  <div class="card"><h2>Luma Code Studio 1.5.1</h2><p>Живой HTML-предпросмотр</p></div>\n</body>\n</html>\n`,
  },
  {
    label: 'Go · HTTP JSON Handler',
    lang: 'go',
    file: 'main.go',
    code: `package main\n\nimport (\n\t"encoding/json"\n\t"net/http"\n)\n\nfunc main() {\n\thttp.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {\n\t\t_ = json.NewEncoder(w).Encode(map[string]bool{"pong": true})\n\t})\n\t_ = http.ListenAndServe(":8080", nil)\n}\n`,
  },
  {
    label: 'SQL · Analytics CTE',
    lang: 'sql',
    file: 'query.sql',
    code: `WITH totals AS (\n  SELECT user_id, SUM(amount) AS spent\n  FROM orders\n  GROUP BY user_id\n)\nSELECT user_id, spent FROM totals ORDER BY spent DESC LIMIT 10;\n`,
  },
];

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', mjs: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', go: 'go', html: 'html', htm: 'html', css: 'css',
    json: 'json', rs: 'rust', cpp: 'cpp', cc: 'cpp', h: 'cpp', c: 'cpp',
    cs: 'csharp', sql: 'sql', md: 'markdown', sh: 'bash', ps1: 'powershell',
  };
  return map[ext] || 'plaintext';
}

// Fast zero-dependency syntax highlighter producing safe HTML spans
function highlightCodeHTML(code: string, lang: string, isDark: boolean): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!code) return '\n';
  if (lang === 'plaintext') return esc(code) + '\n';

  const kwSet = new Set([
    'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
    'async', 'await', 'import', 'export', 'from', 'default', 'class', 'extends', 'new', 'try', 'catch', 'finally', 'throw',
    'def', 'elif', 'pass', 'with', 'as', 'lambda', 'yield', 'True', 'False', 'None', 'in', 'not', 'and', 'or', 'print',
    'package', 'func', 'type', 'struct', 'interface', 'go', 'defer', 'chan', 'select', 'map', 'range', 'nil',
    'fn', 'pub', 'mut', 'impl', 'match', 'use', 'mod', 'enum', 'trait', 'let', 'true', 'false', 'null', 'undefined',
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'WITH', 'JOIN', 'LEFT', 'INNER', 'CREATE', 'TABLE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'DELETE', 'AS', 'DESC', 'ASC',
    'public', 'private', 'static', 'void', 'int', 'string', 'bool', 'float', 'double', 'auto', 'namespace', 'using', 'include',
  ]);

  const tokenRe = /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|<\/?[a-zA-Z][\w-]*|\b[a-zA-Z_]\w*\b)/gm;
  const cComment = isDark ? '#6b7280' : '#64748b';
  const cString = isDark ? '#34d399' : '#059669';
  const cNumber = isDark ? '#fbbf24' : '#d97706';
  const cKeyword = isDark ? '#c084fc' : '#7c3aed';
  const cTag = isDark ? '#38bdf8' : '#0284c7';

  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(code)) !== null) {
    if (m.index > last) out += esc(code.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('//') || tok.startsWith('/*') || (tok.startsWith('#') && (lang === 'python' || lang === 'bash' || lang === 'powershell'))) {
      out += `<span style="color:${cComment};font-style:italic">${esc(tok)}</span>`;
    } else if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith('`')) {
      out += `<span style="color:${cString}">${esc(tok)}</span>`;
    } else if (/^\d/.test(tok)) {
      out += `<span style="color:${cNumber}">${esc(tok)}</span>`;
    } else if (tok.startsWith('<')) {
      out += `<span style="color:${cTag}">${esc(tok)}</span>`;
    } else if (kwSet.has(tok) || kwSet.has(tok.toUpperCase())) {
      out += `<span style="color:${cKeyword};font-weight:600">${esc(tok)}</span>`;
    } else {
      out += esc(tok);
    }
    last = m.index + tok.length;
  }
  if (last < code.length) out += esc(code.slice(last));
  return out + '\n';
}

const INITIAL_EMPTY_TAB: EditorTab = {
  id: 'tab_empty_1',
  name: 'untitled.txt',
  path: '',
  content: '',
  dirty: false,
  language: 'plaintext',
};

const AUTO_CLOSE_PAIRS: Record<string, string> = {
  '(': ')',
  '{': '}',
  '[': ']',
  '"': '"',
  "'": "'",
  '`': '`',
};

export const LumaCodeStudioWindow: React.FC<LumaCodeStudioWindowProps> = ({
  isDark,
  onNotify,
}) => {
  // Clean empty startup: ONE empty file & NO system files exposed until user explicitly opens a folder/file!
  const [tabs, setTabs] = useState<EditorTab[]>([INITIAL_EMPTY_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>(INITIAL_EMPTY_TAB.id);
  const [workspaceOpened, setWorkspaceOpened] = useState(false);
  const [currentDir, setCurrentDir] = useState<string>('');
  const [entries, setEntries] = useState<FsEntryItem[]>([]);
  const [loadingFs, setLoadingFs] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [showSnippets, setShowSnippets] = useState(false);
  const [folderPathPrompt, setFolderPathPrompt] = useState(false);
  const [folderPathInput, setFolderPathInput] = useState('');
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Luma Code Studio 1.5.1 Pro — Чистое рабочее пространство. Откройте файл или начните писать код.',
  ]);
  const [termCmd, setTermCmd] = useState('');
  const [statusToast, setStatusToast] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const browserFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  // Listen for global Ctrl+Shift+P Command Palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setShowPalette((v) => !v);
        setPaletteQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const flashToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast((cur) => (cur === msg ? '' : cur)), 2400);
  };

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
        setWorkspaceOpened(true);
        setCurrentDir(data.path || dirPath);
        const list: FsEntryItem[] = Array.isArray(data.entries) ? data.entries : [];
        list.sort((a, b) => Number(b.is_dir) - Number(a.is_dir) || a.name.localeCompare(b.name));
        setEntries(list);
      } else {
        flashToast(data?.error || 'Не удалось открыть папку');
      }
    } catch {
      flashToast('Ошибка подключения к файловой системе');
    } finally {
      setLoadingFs(false);
    }
  }, []);

  const handleOpenFolderDialog = async () => {
    try {
      const res = await fetch('/api/kernel/pick-file?mode=folder');
      const data = await res.json();
      if (data?.picked && data.path) {
        await loadDirectory(data.path);
        return;
      }
    } catch {
      // fallback to manual path input
    }
    setFolderPathPrompt(true);
  };

  const handleOpenBrowserFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const newTab: EditorTab = {
        id: `tab_${Date.now()}`,
        name: file.name,
        path: '',
        content: String(reader.result || ''),
        dirty: false,
        language: detectLanguage(file.name),
      };
      setTabs((prev) => (prev.length === 1 && !prev[0].content && prev[0].name === 'untitled.txt' ? [newTab] : [...prev, newTab]));
      setActiveTabId(newTab.id);
      flashToast(`Открыт файл: ${file.name}`);
    };
    reader.readAsText(file);
  };

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
        setTabs((prev) => (prev.length === 1 && !prev[0].content && prev[0].name === 'untitled.txt' ? [newTab] : [...prev, newTab]));
        setActiveTabId(newTab.id);
      }
    } catch {
      flashToast('Не удалось прочитать файл');
    }
  };

  const updateActiveContent = (nextCode: string) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, content: nextCode, dirty: true } : t)));
  };

  const updateActiveLanguage = (lang: string) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, language: lang } : t)));
  };

  const handleFormatCode = () => {
    if (!activeTab) return;
    if (activeTab.language === 'json') {
      try {
        const pretty = JSON.stringify(JSON.parse(activeTab.content), null, 2);
        updateActiveContent(pretty);
        flashToast('JSON отформатирован');
        return;
      } catch {
        flashToast('Ошибка синтаксиса JSON');
        return;
      }
    }
    // Generic clean indentation + trailing whitespace trim
    const cleaned = activeTab.content
      .split('\n')
      .map((l) => l.replace(/\s+$/, ''))
      .join('\n')
      .trimEnd() + '\n';
    updateActiveContent(cleaned);
    flashToast('Код очищен и выровнен');
  };

  const handleDownloadFile = () => {
    if (!activeTab) return;
    const blob = new Blob([activeTab.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab.name || 'code.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flashToast(`Скачан файл: ${activeTab.name}`);
  };

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    if (!activeTab.path && !workspaceOpened) {
      handleDownloadFile();
      return;
    }
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
          prev.map((t) => (t.id === activeTab.id ? { ...t, path: data.path || targetPath, dirty: false } : t))
        );
        flashToast(`Сохранено: ${activeTab.name}`);
        if (workspaceOpened && currentDir) void loadDirectory(currentDir);
        onNotify?.('Luma Code Studio', `Файл «${activeTab.name}» сохранён`, 'success');
      } else {
        flashToast(data?.error || 'Ошибка сохранения');
      }
    } catch {
      handleDownloadFile();
    }
  }, [activeTab, currentDir, workspaceOpened, loadDirectory, onNotify]);

  const handleRunCode = useCallback(async () => {
    if (!activeTab) return;
    setShowTerminal(true);
    const lang = activeTab.language;
    const stamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (lang === 'html') {
      setShowHtmlPreview(true);
      setTerminalLogs((prev) => [...prev, `[${stamp}] ▶ Открыт живой HTML-предпросмотр (${activeTab.name})`]);
      return;
    }

    if (lang === 'javascript' || lang === 'typescript') {
      const captured: string[] = [];
      const fakeConsole = {
        log: (...args: unknown[]) => captured.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
        warn: (...args: unknown[]) => captured.push('⚠ ' + args.map(String).join(' ')),
        error: (...args: unknown[]) => captured.push('✖ ' + args.map(String).join(' ')),
      };
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('console', activeTab.content);
        const res = fn(fakeConsole);
        if (res !== undefined) captured.push(`=> ${String(res)}`);
        setTerminalLogs((prev) => [...prev, `[${stamp}] ▶ run ${activeTab.name}`, ...(captured.length ? captured : ['(Успешно выполнено без вывода)'])]);
      } catch (err) {
        setTerminalLogs((prev) => [...prev, `[${stamp}] ✖ Error: ${err instanceof Error ? err.message : String(err)}`]);
      }
      return;
    }

    if (activeTab.path) {
      let cmd = '';
      if (lang === 'python') cmd = `python3 "${activeTab.path}" || python "${activeTab.path}"`;
      else if (lang === 'go') cmd = `go run "${activeTab.path}"`;
      else if (lang === 'bash') cmd = `bash "${activeTab.path}"`;
      else cmd = `echo "Файл ${activeTab.name} (${activeTab.content.length} байт)"`;
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
      setTerminalLogs((prev) => [...prev, `[${stamp}] ℹ Сохраните файл в открытую папку или переключите язык на JavaScript/HTML для мгновенного запуска`]);
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

  const handleCreateNewTab = (fnameOverride?: string, contentOverride = '', langOverride?: string) => {
    const fname = (fnameOverride ?? newFileName).trim() || `untitled_${tabs.length + 1}.txt`;
    const newTab: EditorTab = {
      id: `tab_${Date.now()}`,
      name: fname,
      path: '',
      content: contentOverride,
      dirty: Boolean(contentOverride),
      language: langOverride || detectLanguage(fname),
    };
    setTabs((prev) => (prev.length === 1 && !prev[0].content && prev[0].name === 'untitled.txt' && contentOverride ? [newTab] : [...prev, newTab]));
    setActiveTabId(newTab.id);
    setNewFileName('');
    setCreatingFile(false);
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) {
      setTabs([{ ...INITIAL_EMPTY_TAB, id: `tab_${Date.now()}` }]);
      return;
    }
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (activeTabId === id) setActiveTabId(next[0].id);
  };

  const updateCursorFromEl = (el: HTMLTextAreaElement) => {
    const upTo = el.value.slice(0, el.selectionStart);
    const split = upTo.split('\n');
    setCursorPos({ line: split.length, col: split[split.length - 1].length + 1 });
  };

  const syncScroll = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
  };

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el || !activeTab) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      void handleSave();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleRunCode();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setShowFind((v) => !v);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      updateActiveContent(activeTab.content.slice(0, start) + '  ' + activeTab.content.slice(end));
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
        updateCursorFromEl(el);
      });
      return;
    }
    // Auto-indent on Enter
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      const start = el.selectionStart;
      const before = activeTab.content.slice(0, start);
      const lineStart = before.lastIndexOf('\n') + 1;
      const curLine = before.slice(lineStart);
      const indentMatch = /^(\s*)/.exec(curLine);
      let indent = indentMatch ? indentMatch[1] : '';
      if (/[{([]\s*$/.test(curLine) || /:\s*$/.test(curLine)) indent += '  ';
      if (indent.length > 0) {
        e.preventDefault();
        const after = activeTab.content.slice(el.selectionEnd);
        updateActiveContent(before + '\n' + indent + after);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 1 + indent.length;
          updateCursorFromEl(el);
        });
      }
      return;
    }
    // Auto-close brackets & quotes
    if (!e.ctrlKey && !e.metaKey && !e.altKey && AUTO_CLOSE_PAIRS[e.key]) {
      const closeCh = AUTO_CLOSE_PAIRS[e.key];
      const start = el.selectionStart;
      const end = el.selectionEnd;
      e.preventDefault();
      const selected = activeTab.content.slice(start, end);
      const next = activeTab.content.slice(0, start) + e.key + selected + closeCh + activeTab.content.slice(end);
      updateActiveContent(next);
      requestAnimationFrame(() => {
        el.selectionStart = start + 1;
        el.selectionEnd = start + 1 + selected.length;
        updateCursorFromEl(el);
      });
    }
  };

  const lines = useMemo(() => (activeTab?.content || '').split('\n'), [activeTab?.content]);
  const highlightedHTML = useMemo(
    () => highlightCodeHTML(activeTab?.content || '', activeTab?.language || 'plaintext', isDark),
    [activeTab?.content, activeTab?.language, isDark]
  );

  const paletteCommands = useMemo(() => {
    const all = [
      { label: 'Новый пустой файл', action: () => setCreatingFile(true) },
      { label: 'Открыть папку проекта', action: () => void handleOpenFolderDialog() },
      { label: 'Открыть файл с компьютера', action: () => browserFileInputRef.current?.click() },
      { label: 'Форматировать / выровнять код', action: handleFormatCode },
      { label: 'Запустить код (Ctrl+Enter)', action: () => void handleRunCode() },
      { label: 'Скачать / Сохранить как', action: handleDownloadFile },
      { label: 'Переключить миникарту', action: () => setShowMinimap((v) => !v) },
      { label: 'Переключить терминал', action: () => setShowTerminal((v) => !v) },
      { label: 'Открыть HTML-предпросмотр', action: () => setShowHtmlPreview((v) => !v) },
      { label: 'Закрыть папку проекта (очистить проводник)', action: () => { setWorkspaceOpened(false); setEntries([]); setCurrentDir(''); } },
    ];
    const q = paletteQuery.trim().toLowerCase();
    return q ? all.filter((c) => c.label.toLowerCase().includes(q)) : all;
  }, [paletteQuery]);

  const goParentDir = () => {
    if (!currentDir || currentDir === '/' || currentDir.length <= 3) return;
    const cleaned = currentDir.replace(/[\\/]+$/, '');
    const idx = Math.max(cleaned.lastIndexOf('/'), cleaned.lastIndexOf('\\'));
    if (idx > 0) void loadDirectory(cleaned.slice(0, idx));
    else void loadDirectory('/');
  };

  return (
    <div className={`h-full flex flex-col select-text relative ${isDark ? 'bg-[#0d1017] text-slate-100' : 'bg-[#f8fafc] text-slate-900'}`}>
      <input
        ref={browserFileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleOpenBrowserFile(f);
          e.target.value = '';
        }}
      />

      {/* Command Palette Modal (Ctrl+Shift+P) */}
      {showPalette && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-12" onClick={() => setShowPalette(false)}>
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/15 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
              <Command size={14} className="text-cyan-400" />
              <input
                autoFocus
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowPalette(false);
                  if (e.key === 'Enter' && paletteCommands[0]) {
                    paletteCommands[0].action();
                    setShowPalette(false);
                  }
                }}
                placeholder="Введите команду (форматировать, открыть, запустить)..."
                className="flex-1 bg-transparent text-xs text-white outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1.5">
              {paletteCommands.map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => { cmd.action(); setShowPalette(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-cyan-500/20 hover:text-white transition cursor-pointer"
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top IDE Toolbar */}
      <div className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${isDark ? 'bg-[#121620] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setShowSidebar((v) => !v)} className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border cursor-pointer ${showSidebar ? 'bg-cyan-500/15 border-cyan-400/35 text-cyan-400' : isDark ? 'bg-white/[0.04] border-white/10 text-white/65' : 'bg-slate-100 border-slate-200'}`}>
            <Folder size={12} /> Проводник
          </button>
          <button onClick={() => setCreatingFile((v) => !v)} className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 border cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200'}`}>
            <Plus size={12} /> Новый
          </button>
          <button onClick={() => browserFileInputRef.current?.click()} className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 border cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200'}`}>
            <FolderOpen size={12} className="text-amber-400" /> Открыть файл
          </button>
          <div className="relative">
            <button onClick={() => setShowSnippets((v) => !v)} className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 border cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200'}`}>
              <Sparkles size={12} className="text-violet-400" /> Шаблоны
            </button>
            {showSnippets && (
              <div className="absolute left-0 mt-1 w-56 rounded-xl bg-zinc-900 border border-white/15 shadow-2xl p-1 z-40">
                {CODE_SNIPPETS.map((sn) => (
                  <button
                    key={sn.label}
                    onClick={() => {
                      handleCreateNewTab(sn.file, sn.code, sn.lang);
                      setShowSnippets(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-200 hover:bg-white/10 cursor-pointer"
                  >
                    {sn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleFormatCode} className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 border cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200'}`} title="Форматировать код">
            <Wand2 size={12} className="text-sky-400" /> Формат
          </button>
          <button onClick={() => void handleSave()} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-400/30 flex items-center gap-1 cursor-pointer" title="Сохранить (Ctrl+S)">
            <Save size={12} /> Сохранить
          </button>
          <button onClick={() => void handleRunCode()} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1 shadow-sm cursor-pointer" title="Запустить (Ctrl+Enter)">
            <Play size={11} fill="currentColor" /> Запуск
          </button>
        </div>

        <div className="flex items-center gap-1">
          {statusToast && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mr-2">
              <CheckCircle2 size={12} /> {statusToast}
            </span>
          )}
          <button onClick={() => setShowPalette(true)} className={`px-2 py-1 rounded-lg text-[10px] border flex items-center gap-1 cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10 text-white/65' : 'bg-slate-100 border-slate-200'}`} title="Палитра команд (Ctrl+Shift+P)">
            <Command size={11} /> Команды
          </button>
          <button onClick={() => setShowFind((v) => !v)} className={`p-1.5 rounded-lg border cursor-pointer ${showFind ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400' : isDark ? 'bg-white/[0.04] border-white/10 text-white/65' : 'bg-slate-100 border-slate-200'}`} title="Поиск (Ctrl+F)">
            <Search size={12} />
          </button>
          <button onClick={() => setShowMinimap((v) => !v)} className={`p-1.5 rounded-lg border cursor-pointer ${showMinimap ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400' : isDark ? 'bg-white/[0.04] border-white/10 text-white/65' : 'bg-slate-100 border-slate-200'}`} title="Миникарта">
            <MapIcon size={12} />
          </button>
          <button onClick={() => setWordWrap((v) => !v)} className={`p-1.5 rounded-lg border cursor-pointer ${wordWrap ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400' : isDark ? 'bg-white/[0.04] border-white/10 text-white/65' : 'bg-slate-100 border-slate-200'}`} title="Перенос строк">
            <WrapText size={12} />
          </button>
          <button onClick={() => setFontSize((s) => Math.max(10, s - 1))} className={`p-1.5 rounded-lg border cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200'}`}><ZoomOut size={12} /></button>
          <button onClick={() => setFontSize((s) => Math.min(22, s + 1))} className={`p-1.5 rounded-lg border cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200'}`}><ZoomIn size={12} /></button>
          <button onClick={handleDownloadFile} className={`p-1.5 rounded-lg border cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10 text-sky-300' : 'bg-slate-100 border-slate-200'}`} title="Скачать файл"><Download size={12} /></button>
          <button onClick={() => setShowHtmlPreview((v) => !v)} className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 border cursor-pointer ${showHtmlPreview ? 'bg-purple-500/20 border-purple-400/40 text-purple-300' : isDark ? 'bg-white/[0.04] border-white/10 text-white/65' : 'bg-slate-100 border-slate-200'}`}>
            <Eye size={12} /> Превью
          </button>
          <button onClick={() => setShowTerminal((v) => !v)} className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 border cursor-pointer ${showTerminal ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' : isDark ? 'bg-white/[0.04] border-white/10 text-white/65' : 'bg-slate-100 border-slate-200'}`}>
            <Terminal size={12} /> Консоль
          </button>
        </div>
      </div>

      {creatingFile && (
        <div className={`px-3 py-1.5 border-b flex items-center gap-2 ${isDark ? 'bg-cyan-500/10 border-white/10' : 'bg-cyan-50 border-slate-200'}`}>
          <FileCode2 size={14} className="text-cyan-400" />
          <input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNewTab()}
            placeholder="Имя нового файла (app.py, index.html, main.go, style.css)..."
            autoFocus
            className="flex-1 bg-transparent text-xs outline-none"
          />
          <button onClick={() => handleCreateNewTab()} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500 text-black cursor-pointer">Создать</button>
          <button onClick={() => setCreatingFile(false)} className="opacity-60 hover:opacity-100 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {folderPathPrompt && (
        <div className={`px-3 py-1.5 border-b flex items-center gap-2 ${isDark ? 'bg-amber-500/10 border-white/10' : 'bg-amber-50 border-slate-200'}`}>
          <FolderOpen size={14} className="text-amber-400" />
          <input
            value={folderPathInput}
            onChange={(e) => setFolderPathInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && folderPathInput.trim()) {
                void loadDirectory(folderPathInput.trim());
                setFolderPathPrompt(false);
              }
            }}
            placeholder="Введите путь к папке проекта (например: C:\Projects\MyApp или ~/Projects)..."
            autoFocus
            className="flex-1 bg-transparent text-xs outline-none"
          />
          <button
            onClick={() => {
              if (folderPathInput.trim()) void loadDirectory(folderPathInput.trim());
              setFolderPathPrompt(false);
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 text-black cursor-pointer"
          >
            Открыть
          </button>
          <button onClick={() => setFolderPathPrompt(false)} className="opacity-60 hover:opacity-100 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Main Split Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Clean Explorer Sidebar — NEVER auto-exposes system files until user opens a folder! */}
        {showSidebar && (
          <div className={`w-56 shrink-0 border-r flex flex-col overflow-hidden ${isDark ? 'bg-[#0b0e14] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`px-2.5 py-2 border-b flex items-center justify-between gap-1 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 truncate" title={currentDir}>
                {workspaceOpened ? currentDir : 'ПРОЕКТ'}
              </span>
              {workspaceOpened && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={goParentDir} className="p-1 rounded hover:bg-white/10 cursor-pointer" title="Уровень вверх"><FolderUp size={12} /></button>
                  <button onClick={() => void loadDirectory(currentDir)} className="p-1 rounded hover:bg-white/10 cursor-pointer" title="Обновить"><RefreshCw size={11} className={loadingFs ? 'animate-spin' : ''} /></button>
                  <button onClick={() => { setWorkspaceOpened(false); setEntries([]); setCurrentDir(''); }} className="p-1 rounded hover:bg-white/10 cursor-pointer" title="Закрыть папку"><X size={11} /></button>
                </div>
              )}
            </div>

            {!workspaceOpened ? (
              <div className="flex-1 p-3.5 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/12 border border-cyan-400/25 flex items-center justify-center text-cyan-400">
                  <Code2 size={20} />
                </div>
                <div>
                  <div className="text-xs font-semibold">Папка не открыта</div>
                  <div className="text-[10px] opacity-55 mt-1 leading-relaxed">
                    Системные файлы скрыты. Откройте свою папку проекта или отдельный файл.
                  </div>
                </div>
                <div className="w-full space-y-1.5">
                  <button
                    onClick={() => void handleOpenFolderDialog()}
                    className="w-full py-1.5 px-3 rounded-xl text-[11px] font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/35 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FolderOpen size={13} /> Открыть папку
                  </button>
                  <button
                    onClick={() => browserFileInputRef.current?.click()}
                    className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-medium border flex items-center justify-center gap-1.5 cursor-pointer ${isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
                  >
                    <FileCode2 size={13} /> Открыть файл
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {entries.map((entry) => (
                  <button
                    key={entry.path}
                    onClick={() => void openDiskFile(entry)}
                    className={`w-full px-2 py-1 rounded-lg text-left text-[11px] flex items-center gap-1.5 truncate transition cursor-pointer ${
                      activeTab?.path === entry.path
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : isDark ? 'hover:bg-white/[0.06] text-white/80' : 'hover:bg-slate-200/70 text-slate-800'
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
            )}
          </div>
        )}

        {/* Center Editor + Syntax Overlay + Minimap + Optional Preview & Terminal */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Tabs */}
          <div className={`flex items-center overflow-x-auto border-b shrink-0 ${isDark ? 'bg-[#0e121b] border-white/10' : 'bg-slate-100 border-slate-200'}`}>
            {tabs.map((tab) => {
              const active = tab.id === activeTab?.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1.5 border-r cursor-pointer shrink-0 transition ${
                    active
                      ? isDark ? 'bg-[#0d1017] text-cyan-300 border-t-2 border-t-cyan-400 border-r-white/10' : 'bg-white text-cyan-700 border-t-2 border-t-cyan-500 border-r-slate-200'
                      : isDark ? 'text-white/55 hover:bg-white/[0.04] border-r-white/10' : 'text-slate-600 hover:bg-slate-200/60 border-r-slate-200'
                  }`}
                >
                  <FileCode2 size={12} />
                  <span>{tab.name}</span>
                  {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} className="ml-1 opacity-50 hover:opacity-100 cursor-pointer"><X size={11} /></button>
                </div>
              );
            })}
          </div>

          {showFind && (
            <div className={`px-3 py-1.5 border-b flex flex-wrap items-center gap-2 text-xs ${isDark ? 'bg-[#141925] border-white/10' : 'bg-slate-100 border-slate-200'}`}>
              <input value={findQuery} onChange={(e) => setFindQuery(e.target.value)} placeholder="Найти..." className={`px-2 py-1 rounded-lg border outline-none text-xs ${isDark ? 'bg-black/40 border-white/15' : 'bg-white border-slate-300'}`} />
              <input value={replaceQuery} onChange={(e) => setReplaceQuery(e.target.value)} placeholder="Заменить на..." className={`px-2 py-1 rounded-lg border outline-none text-xs ${isDark ? 'bg-black/40 border-white/15' : 'bg-white border-slate-300'}`} />
              <button
                onClick={() => {
                  if (findQuery && activeTab) updateActiveContent(activeTab.content.split(findQuery).join(replaceQuery));
                }}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 cursor-pointer"
              >
                Заменить все
              </button>
              <button onClick={() => setShowFind(false)} className="ml-auto opacity-60 hover:opacity-100 cursor-pointer"><X size={13} /></button>
            </div>
          )}

          {/* Code Editor Surface with Synchronized Live Syntax Highlighting + Minimap */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <div className="flex-1 flex min-h-0 overflow-hidden font-mono relative">
              {/* Line Numbers Gutter */}
              <div
                ref={gutterRef}
                className={`py-3 px-2.5 text-right select-none shrink-0 border-r overflow-hidden ${isDark ? 'bg-[#0b0e14] border-white/10 text-white/30' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                style={{ fontSize, lineHeight: '1.6', minWidth: 44 }}
              >
                {lines.map((_, i) => (
                  <div key={i} className={cursorPos.line === i + 1 ? 'text-cyan-400 font-bold' : ''}>
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Layered Syntax Highlight Overlay + Transparent Caret Textarea */}
              <div className="flex-1 relative min-w-0 overflow-hidden">
                <pre
                  ref={highlightRef}
                  aria-hidden="true"
                  className={`absolute inset-0 m-0 p-3 pointer-events-none overflow-hidden font-mono ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}
                  style={{ fontSize, lineHeight: '1.6', tabSize: 2 }}
                  dangerouslySetInnerHTML={{ __html: highlightedHTML }}
                />
                <textarea
                  ref={textareaRef}
                  value={activeTab?.content || ''}
                  onChange={(e) => {
                    updateActiveContent(e.target.value);
                    updateCursorFromEl(e.target);
                  }}
                  onClick={(e) => updateCursorFromEl(e.currentTarget)}
                  onKeyUp={(e) => updateCursorFromEl(e.currentTarget)}
                  onScroll={syncScroll}
                  onKeyDown={onEditorKeyDown}
                  spellCheck={false}
                  wrap={wordWrap ? 'soft' : 'off'}
                  placeholder="Начните писать код здесь или откройте файл..."
                  className={`absolute inset-0 w-full h-full p-3 bg-transparent outline-none resize-none font-mono text-transparent ${isDark ? 'caret-cyan-400 selection:bg-cyan-500/30 placeholder:text-white/25' : 'caret-cyan-600 selection:bg-cyan-500/25 placeholder:text-slate-400'} ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-auto'}`}
                  style={{ fontSize, lineHeight: '1.6', tabSize: 2 }}
                />
              </div>

              {/* Pro Minimap */}
              {showMinimap && lines.length > 0 && (
                <div
                  className={`w-20 shrink-0 border-l p-1.5 overflow-hidden select-none cursor-pointer hidden md:block ${isDark ? 'bg-[#0a0d13] border-white/10 opacity-70' : 'bg-slate-50 border-slate-200 opacity-75'}`}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientY - rect.top) / Math.max(1, rect.height);
                    if (textareaRef.current) {
                      textareaRef.current.scrollTop = pct * textareaRef.current.scrollHeight;
                      syncScroll();
                    }
                  }}
                  title="Миникарта кода"
                >
                  <div className="text-[3px] leading-[4.5px] font-mono whitespace-pre overflow-hidden text-cyan-300/60">
                    {lines.slice(0, 140).join('\n')}
                  </div>
                </div>
              )}
            </div>

            {showHtmlPreview && (
              <div className="w-[42%] border-l border-white/10 bg-white flex flex-col">
                <div className="px-2.5 py-1 bg-slate-900 text-white text-[10px] font-semibold flex items-center justify-between">
                  <span>Живой HTML Предпросмотр</span>
                  <button onClick={() => setShowHtmlPreview(false)} className="cursor-pointer"><X size={12} /></button>
                </div>
                <iframe title="Luma Code Live Preview" srcDoc={activeTab?.content || ''} sandbox="allow-scripts" className="flex-1 w-full border-0" />
              </div>
            )}
          </div>

          {/* Integrated Terminal */}
          {showTerminal && (
            <div className={`h-36 shrink-0 border-t flex flex-col ${isDark ? 'bg-[#080a0f] border-white/10' : 'bg-slate-900 text-slate-100 border-slate-300'}`}>
              <div className="px-3 py-1 border-b border-white/10 flex items-center justify-between text-[10px] text-white/60">
                <span className="flex items-center gap-1.5 font-semibold text-amber-300"><ChevronDown size={11} /> ТЕРМИНАЛ И ВЫВОД</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setTerminalLogs([])} className="hover:text-white cursor-pointer">Очистить</button>
                  <button onClick={() => setShowTerminal(false)} className="hover:text-white cursor-pointer"><X size={11} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-1.5 font-mono text-[11px] space-y-0.5 text-emerald-300/90">
                {terminalLogs.map((l, i) => (
                  <pre key={i} className="whitespace-pre-wrap break-words m-0">{l}</pre>
                ))}
              </div>
              <div className="px-3 py-1 border-t border-white/10 flex items-center gap-2 font-mono text-[11px]">
                <span className="text-cyan-400">$</span>
                <input
                  value={termCmd}
                  onChange={(e) => setTermCmd(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleExecTerminal()}
                  placeholder="Команда ОС (node -v, python --version, git status)..."
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-white/35"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pro IDE Status Bar */}
      <div className="px-3 py-1 bg-gradient-to-r from-cyan-700 to-blue-800 text-white text-[10px] font-mono flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-3">
          <span className="font-bold">Luma Code Studio 1.5.1 Pro</span>
          <select
            value={activeTab?.language || 'plaintext'}
            onChange={(e) => updateActiveLanguage(e.target.value)}
            className="bg-black/25 rounded px-1.5 py-0.5 outline-none text-[10px] uppercase cursor-pointer"
            title="Язык подсветки синтаксиса"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l} className="bg-zinc-900 text-white">{l.toUpperCase()}</option>
            ))}
          </select>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Стр {cursorPos.line}, Стб {cursorPos.col}</span>
          <span>Строк: {lines.length}</span>
          <span>Ctrl+Shift+P · Ctrl+S · Ctrl+Enter</span>
        </div>
      </div>
    </div>
  );
};
