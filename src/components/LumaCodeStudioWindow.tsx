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
  AlertCircle,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Trash2,
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
  path: string;
  content: string;
  dirty: boolean;
  language: string;
}

interface CodeDiagnostic {
  line: number;
  col: number;
  severity: 'error' | 'warning';
  message: string;
  source: string;
}

interface TerminalSessionTab {
  id: string;
  name: string;
  shell: 'auto' | 'powershell' | 'bash';
  lines: string[];
  history: string[];
}

interface LumaCodeStudioWindowProps {
  isDark: boolean;
  onNotify?: (title: string, msg: string, kind?: 'info' | 'success' | 'warn') => void;
}

const SESSION_STORAGE_KEY = 'luma_code_studio_session_v152';

const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'python', 'go', 'html', 'css',
  'json', 'rust', 'cpp', 'csharp', 'sql', 'markdown', 'bash', 'powershell',
];

const CODE_SNIPPETS: { label: string; lang: string; file: string; code: string }[] = [
  {
    label: 'JavaScript · Async Fetch',
    lang: 'javascript',
    file: 'fetch_demo.js',
    code: `async function loadStatus() {\n  const res = await fetch('/api/kernel/status');\n  const data = await res.json();\n  console.log('Luma OS:', data.version, 'Kernel:', data.kernel_engine_version);\n}\nloadStatus();\n`,
  },
  {
    label: 'Python · FastAPI Server',
    lang: 'python',
    file: 'server.py',
    code: `from fastapi import FastAPI\n\napp = FastAPI(title="Luma API")\n\n@app.get("/health")\nasync def health():\n    return {"ok": True, "os": "Luma 1.5.2", "kernel": "1.4.5"}\n`,
  },
  {
    label: 'HTML5 · Glass Card',
    lang: 'html',
    file: 'index.html',
    code: `<!doctype html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8" />\n  <style>\n    body { margin:0; height:100vh; display:grid; place-items:center; background:#090b10; color:#fff; font-family:system-ui; }\n    .card { padding:28px 36px; border-radius:20px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15); }\n  </style>\n</head>\n<body>\n  <div class="card"><h2>Luma Code Studio 1.5.2</h2><p>Живой HTML-предпросмотр + Автосохранение</p></div>\n</body>\n</html>\n`,
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

// Live multi-language syntax & static error diagnostics analyzer
function analyzeCodeDiagnostics(code: string, lang: string): CodeDiagnostic[] {
  const diags: CodeDiagnostic[] = [];
  if (!code.trim() || lang === 'plaintext' || lang === 'markdown') return diags;
  const lines = code.split('\n');

  // 1) JSON exact parser
  if (lang === 'json') {
    try {
      JSON.parse(code);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      let line = 1;
      let col = 1;
      const posM = /position\s+(\d+)/i.exec(msg);
      if (posM) {
        const idx = Number(posM[1]);
        const up = code.slice(0, idx).split('\n');
        line = up.length;
        col = up[up.length - 1].length + 1;
      } else {
        const lineM = /line\s+(\d+)/i.exec(msg);
        if (lineM) line = Number(lineM[1]);
      }
      diags.push({ line, col, severity: 'error', message: `JSON: ${msg}`, source: 'json-lint' });
    }
    return diags;
  }

  // 2) Balanced brackets & unclosed strings check (works for JS/TS/Go/Python/CSS/Rust/C++/C#)
  const openStack: { ch: string; line: number; col: number }[] = [];
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const closeToOpen: Record<string, string> = { ')': '(', '}': '{', ']': '[' };

  for (let li = 0; li < lines.length; li++) {
    const ln = lines[li];
    let inStr: string | null = null;
    let esc = false;
    for (let ci = 0; ci < ln.length; ci++) {
      const ch = ln[ci];
      if (inStr) {
        if (esc) {
          esc = false;
        } else if (ch === '\\') {
          esc = true;
        } else if (ch === inStr) {
          inStr = null;
        }
        continue;
      }
      // Line comment skip
      if (ch === '/' && ln[ci + 1] === '/') break;
      if (ch === '#' && (lang === 'python' || lang === 'bash' || lang === 'powershell')) break;
      if (ch === '"' || ch === "'") {
        inStr = ch;
        continue;
      }
      if (pairs[ch]) {
        openStack.push({ ch, line: li + 1, col: ci + 1 });
      } else if (closeToOpen[ch]) {
        const top = openStack[openStack.length - 1];
        if (!top || top.ch !== closeToOpen[ch]) {
          diags.push({
            line: li + 1,
            col: ci + 1,
            severity: 'error',
            message: `Лишняя или несогласованная закрывающая скобка '${ch}'`,
            source: 'syntax',
          });
        } else {
          openStack.pop();
        }
      }
    }
    if (inStr) {
      diags.push({
        line: li + 1,
        col: Math.max(1, ln.lastIndexOf(inStr) + 1),
        severity: 'error',
        message: `Незакрытая строковая кавычка ${inStr}`,
        source: 'syntax',
      });
    }
  }
  for (const rem of openStack.slice(0, 6)) {
    diags.push({
      line: rem.line,
      col: rem.col,
      severity: 'error',
      message: `Незакрытая скобка '${rem.ch}' (ожидается '${pairs[rem.ch]}')`,
      source: 'syntax',
    });
  }

  // 3) JavaScript / TypeScript real syntax parser + best-practice warnings
  if (lang === 'javascript' || lang === 'typescript') {
    if (lang === 'javascript' && diags.length === 0) {
      try {
        // Strip ES import/export keywords lightly for syntax-only validation
        const checkable = code
          .replace(/^\s*import\s+.*$/gm, '')
          .replace(/^\s*export\s+(default\s+)?/gm, '');
        // eslint-disable-next-line no-new-func
        new Function(checkable);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        diags.push({
          line: Math.min(lines.length, Math.max(1, lines.findIndex((l) => l.trim().length > 0) + 1)),
          col: 1,
          severity: 'error',
          message: `JS SyntaxError: ${msg}`,
          source: 'js-engine',
        });
      }
    }
    lines.forEach((ln, idx) => {
      const trimmed = ln.trim();
      if (/[^=!<>]==[^=]/.test(trimmed) && !trimmed.startsWith('//')) {
        diags.push({
          line: idx + 1,
          col: ln.indexOf('==') + 1,
          severity: 'warning',
          message: "Используйте строгое сравнение '===' вместо '=='",
          source: 'lint',
        });
      }
      if (/\bvar\s+\w+/.test(trimmed) && !trimmed.startsWith('//')) {
        diags.push({
          line: idx + 1,
          col: ln.indexOf('var') + 1,
          severity: 'warning',
          message: "Рекомендуется 'const' или 'let' вместо устаревшего 'var'",
          source: 'lint',
        });
      }
    });
  }

  // 4) Python block colon & indentation diagnostics
  if (lang === 'python') {
    lines.forEach((ln, idx) => {
      const noComment = ln.replace(/#.*$/, '').trimEnd();
      const trimmed = noComment.trim();
      if (/^(def|class|if|elif|else|for|while|try|except|finally|with)\b/.test(trimmed) && !trimmed.endsWith(':') && !trimmed.endsWith('\\')) {
        diags.push({
          line: idx + 1,
          col: noComment.length + 1,
          severity: 'error',
          message: `Python: ожидается двоеточие ':' в конце заголовка блока`,
          source: 'py-lint',
        });
      }
      if (/^\t+ +|^ +\t+/.test(ln)) {
        diags.push({
          line: idx + 1,
          col: 1,
          severity: 'warning',
          message: 'Смешаны табуляция и пробелы в отступе (IndentationWarning)',
          source: 'py-lint',
        });
      }
    });
  }

  // 5) HTML unclosed tags check
  if (lang === 'html') {
    const voidTags = new Set(['meta', 'link', 'img', 'br', 'hr', 'input', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr', '!doctype']);
    const tagStack: { tag: string; line: number }[] = [];
    const tagRe = /<\/?([a-zA-Z!][\w-]*)[^>]*?(\/?)>/g;
    lines.forEach((ln, idx) => {
      let m: RegExpExecArray | null;
      while ((m = tagRe.exec(ln)) !== null) {
        const full = m[0];
        const name = m[1].toLowerCase();
        const selfClose = m[2] === '/';
        if (voidTags.has(name) || selfClose || full.startsWith('<!--')) continue;
        if (full.startsWith('</')) {
          const top = tagStack[tagStack.length - 1];
          if (!top || top.tag !== name) {
            diags.push({ line: idx + 1, col: m.index + 1, severity: 'error', message: `HTML: неожиданный закрывающий тег </${name}>`, source: 'html-lint' });
          } else {
            tagStack.pop();
          }
        } else {
          tagStack.push({ tag: name, line: idx + 1 });
        }
      }
    });
    for (const rem of tagStack.slice(0, 5)) {
      diags.push({ line: rem.line, col: 1, severity: 'warning', message: `HTML: незакрытый тег <${rem.tag}>`, source: 'html-lint' });
    }
  }

  return diags.slice(0, 40);
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
    'fn', 'pub', 'mut', 'impl', 'match', 'use', 'mod', 'enum', 'trait', 'true', 'false', 'null', 'undefined',
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
  name: 'untitled.js',
  path: '',
  content: '',
  dirty: false,
  language: 'javascript',
};

const AUTO_CLOSE_PAIRS: Record<string, string> = {
  '(': ')',
  '{': '}',
  '[': ']',
  '"': '"',
  "'": "'",
  '`': '`',
};

function loadSavedSession(): { tabs: EditorTab[]; activeTabId: string; fontSize: number; wordWrap: boolean } | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.tabs) && parsed.tabs.length > 0) {
      return {
        tabs: parsed.tabs,
        activeTabId: typeof parsed.activeTabId === 'string' ? parsed.activeTabId : parsed.tabs[0].id,
        fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : 13,
        wordWrap: Boolean(parsed.wordWrap),
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return null;
}

export const LumaCodeStudioWindow: React.FC<LumaCodeStudioWindowProps> = ({ isDark, onNotify }) => {
  const saved = useMemo(() => loadSavedSession(), []);

  const [tabs, setTabs] = useState<EditorTab[]>(() => saved?.tabs || [INITIAL_EMPTY_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>(() => saved?.activeTabId || INITIAL_EMPTY_TAB.id);
  const [workspaceOpened, setWorkspaceOpened] = useState(false);
  const [currentDir, setCurrentDir] = useState<string>('');
  const [entries, setEntries] = useState<FsEntryItem[]>([]);
  const [loadingFs, setLoadingFs] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBottomDock, setShowBottomDock] = useState(true);
  const [dockExpanded, setDockExpanded] = useState(false);
  const [bottomTab, setBottomTab] = useState<'terminal' | 'problems' | 'output'>('terminal');
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
  const [fontSize, setFontSize] = useState(() => saved?.fontSize || 13);
  const [wordWrap, setWordWrap] = useState(() => saved?.wordWrap || false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [outputLogs, setOutputLogs] = useState<string[]>([
    'Luma Code Studio 1.5.2 Pro · Автосохранение сессии включено (код сохраняется даже при сворачивании и перезапуске).',
  ]);
  const [termSessions, setTermSessions] = useState<TerminalSessionTab[]>([
    {
      id: 'term_1',
      name: 'Терминал 1',
      shell: 'auto',
      lines: ['Luma Integrated Pro Terminal · Введите команду ОС (node -v, python --version, git status, ls/dir)...'],
      history: [],
    },
  ]);
  const [activeTermId, setActiveTermId] = useState('term_1');
  const [termCmd, setTermCmd] = useState('');
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [statusToast, setStatusToast] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const browserFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) || tabs[0], [tabs, activeTabId]);
  const activeTerm = useMemo(() => termSessions.find((t) => t.id === activeTermId) || termSessions[0], [termSessions, activeTermId]);

  // Auto-persist session to localStorage so minimizing or reopening NEVER loses code!
  useEffect(() => {
    try {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ tabs, activeTabId, fontSize, wordWrap })
      );
    } catch {
      // ignore quota errors
    }
  }, [tabs, activeTabId, fontSize, wordWrap]);

  // Live diagnostics
  const diagnostics = useMemo(
    () => analyzeCodeDiagnostics(activeTab?.content || '', activeTab?.language || 'plaintext'),
    [activeTab?.content, activeTab?.language]
  );
  const errorCount = useMemo(() => diagnostics.filter((d) => d.severity === 'error').length, [diagnostics]);
  const warnCount = useMemo(() => diagnostics.filter((d) => d.severity === 'warning').length, [diagnostics]);
  const diagByLine = useMemo(() => {
    const map = new Map<number, CodeDiagnostic>();
    for (const d of diagnostics) {
      const prev = map.get(d.line);
      if (!prev || (prev.severity === 'warning' && d.severity === 'error')) {
        map.set(d.line, d);
      }
    }
    return map;
  }, [diagnostics]);

  // Global shortcuts inside Code Studio (Ctrl+Shift+P palette, Ctrl+` terminal)
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

  const jumpToLine = useCallback(
    (line: number, col = 1) => {
      const ta = textareaRef.current;
      if (!ta || !activeTab) return;
      const arr = activeTab.content.split('\n');
      const targetLine = Math.max(1, Math.min(arr.length, line));
      let offset = 0;
      for (let i = 0; i < targetLine - 1; i++) offset += arr[i].length + 1;
      offset += Math.min(Math.max(0, col - 1), arr[targetLine - 1]?.length || 0);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = offset;
      const approxLineHeight = fontSize * 1.6;
      ta.scrollTop = Math.max(0, (targetLine - 4) * approxLineHeight);
      if (highlightRef.current) highlightRef.current.scrollTop = ta.scrollTop;
      if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
      setCursorPos({ line: targetLine, col });
    },
    [activeTab, fontSize]
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
      // fallback
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
      setTabs((prev) => (prev.length === 1 && !prev[0].content && prev[0].name.startsWith('untitled') ? [newTab] : [...prev, newTab]));
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
        setTabs((prev) => (prev.length === 1 && !prev[0].content && prev[0].name.startsWith('untitled') ? [newTab] : [...prev, newTab]));
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
        flashToast('Ошибка синтаксиса JSON — смотрите панель «Проблемы»');
        setShowBottomDock(true);
        setBottomTab('problems');
        return;
      }
    }
    const cleaned =
      activeTab.content
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''))
        .join('\n')
        .trimEnd() + '\n';
    updateActiveContent(cleaned);
    flashToast('Код отформатирован');
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
        setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, path: data.path || targetPath, dirty: false } : t)));
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
    setShowBottomDock(true);
    setBottomTab('output');
    const lang = activeTab.language;
    const stamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (lang === 'html') {
      setShowHtmlPreview(true);
      setOutputLogs((prev) => [...prev, `[${stamp}] ▶ Открыт живой HTML-предпросмотр (${activeTab.name})`]);
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
        setOutputLogs((prev) => [...prev, `[${stamp}] ▶ run ${activeTab.name}`, ...(captured.length ? captured : ['(Успешно выполнено без вывода)'])]);
      } catch (err) {
        setOutputLogs((prev) => [...prev, `[${stamp}] ✖ Error: ${err instanceof Error ? err.message : String(err)}`]);
      }
      return;
    }

    if (activeTab.path) {
      let cmd = '';
      if (lang === 'python') cmd = `python3 "${activeTab.path}" || python "${activeTab.path}"`;
      else if (lang === 'go') cmd = `go run "${activeTab.path}"`;
      else if (lang === 'bash') cmd = `bash "${activeTab.path}"`;
      else cmd = `echo "Файл ${activeTab.name} (${activeTab.content.length} байт)"`;
      setOutputLogs((prev) => [...prev, `[${stamp}] $ ${cmd}`]);
      try {
        const res = await fetch('/api/kernel/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });
        const data = await res.json();
        const out = [data.stdout, data.stderr].filter(Boolean).join('\n');
        setOutputLogs((prev) => [...prev, out || `(Код возврата: ${data.exit_code ?? 0})`]);
      } catch {
        setOutputLogs((prev) => [...prev, '✖ Не удалось выполнить команду через ядро ОС']);
      }
    } else {
      setOutputLogs((prev) => [...prev, `[${stamp}] ℹ Сохраните файл в открытую папку или выберите JavaScript/HTML для запуска без файла`]);
    }
  }, [activeTab]);

  const handleExecTerminal = async (overrideCmd?: string) => {
    const cmd = (overrideCmd ?? termCmd).trim();
    if (!cmd || !activeTerm) return;
    if (!overrideCmd) setTermCmd('');
    setHistoryIdx(-1);

    if (cmd === 'clear' || cmd === 'cls') {
      setTermSessions((prev) => prev.map((s) => (s.id === activeTerm.id ? { ...s, lines: [] } : s)));
      return;
    }

    const prefix = activeTerm.shell === 'powershell' ? 'PS>' : '$';
    setTermSessions((prev) =>
      prev.map((s) =>
        s.id === activeTerm.id
          ? { ...s, lines: [...s.lines, `${prefix} ${cmd}`], history: [cmd, ...s.history.slice(0, 49)] }
          : s
      )
    );

    try {
      const fullCmd = currentDir ? `cd "${currentDir}" && ${cmd}` : cmd;
      const res = await fetch('/api/kernel/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: fullCmd }),
      });
      const data = await res.json();
      const out = [data.stdout, data.stderr].filter(Boolean).join('\n') || `(exit ${data.exit_code ?? 0})`;
      setTermSessions((prev) => prev.map((s) => (s.id === activeTerm.id ? { ...s, lines: [...s.lines, out] } : s)));
    } catch {
      setTermSessions((prev) => prev.map((s) => (s.id === activeTerm.id ? { ...s, lines: [...s.lines, '✖ Ошибка выполнения команды'] } : s)));
    }
  };

  const addTerminalSession = () => {
    const id = `term_${Date.now()}`;
    const num = termSessions.length + 1;
    setTermSessions((prev) => [
      ...prev,
      { id, name: `Терминал ${num}`, shell: 'auto', lines: [`Новая сессия Терминал ${num} готова.`], history: [] },
    ]);
    setActiveTermId(id);
  };

  const handleCreateNewTab = (fnameOverride?: string, contentOverride = '', langOverride?: string) => {
    const fname = (fnameOverride ?? newFileName).trim() || `untitled_${tabs.length + 1}.js`;
    const newTab: EditorTab = {
      id: `tab_${Date.now()}`,
      name: fname,
      path: '',
      content: contentOverride,
      dirty: Boolean(contentOverride),
      language: langOverride || detectLanguage(fname),
    };
    setTabs((prev) => (prev.length === 1 && !prev[0].content && prev[0].name.startsWith('untitled') && contentOverride ? [newTab] : [...prev, newTab]));
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
    // Ctrl+/ Toggle Line Comment
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const start = el.selectionStart;
      const arr = activeTab.content.split('\n');
      const lineIdx = activeTab.content.slice(0, start).split('\n').length - 1;
      const prefix = activeTab.language === 'python' || activeTab.language === 'bash' ? '# ' : '// ';
      const cur = arr[lineIdx] || '';
      arr[lineIdx] = cur.trimStart().startsWith(prefix.trim())
        ? cur.replace(prefix.trim() + ' ', '').replace(prefix.trim(), '')
        : prefix + cur;
      updateActiveContent(arr.join('\n'));
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
      { label: 'Показать Проблемы и ошибки кода', action: () => { setShowBottomDock(true); setBottomTab('problems'); } },
      { label: 'Открыть встроенный Pro Терминал', action: () => { setShowBottomDock(true); setBottomTab('terminal'); } },
      { label: 'Скачать / Сохранить как', action: handleDownloadFile },
      { label: 'Переключить миникарту', action: () => setShowMinimap((v) => !v) },
      { label: 'Открыть HTML-предпросмотр', action: () => setShowHtmlPreview((v) => !v) },
      ...tabs.map((t) => ({ label: `Перейти к вкладке: ${t.name}`, action: () => setActiveTabId(t.id) })),
    ];
    const q = paletteQuery.trim().toLowerCase();
    return q ? all.filter((c) => c.label.toLowerCase().includes(q)) : all;
  }, [paletteQuery, tabs]);

  const goParentDir = () => {
    if (!currentDir || currentDir === '/' || currentDir.length <= 3) return;
    const cleaned = currentDir.replace(/[\\/]+$/, '');
    const idx = Math.max(cleaned.lastIndexOf('/'), cleaned.lastIndexOf('\\'));
    if (idx > 0) void loadDirectory(cleaned.slice(0, idx));
    else void loadDirectory('/');
  };

  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiSources, setAiSources] = useState<{ title: string; url: string; provider: string }[]>([]);

  const askCodeAI38 = async (action: string, customQ?: string) => {
    setAiDrawerOpen(true);
    setAiLoading(true);
    try {
      const r = await fetch('/api/kernel/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'code_studio',
          action,
          content: (activeTab?.content || '').slice(0, 6000),
          prompt: (customQ ?? aiPrompt).trim(),
          filename: activeTab?.name || 'code.ts',
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setAiAnswer(String(d.reply || ''));
        setAiSources(Array.isArray(d.sources) ? d.sources : []);
      }
    } catch {
      setAiAnswer('Не удалось связаться с Luma AI 5.0 Nexus.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleOpenBrowserFile(f);
      }}
      className={`h-full flex flex-col select-text relative ${isDark ? 'bg-[#0d1017] text-slate-100' : 'bg-[#f8fafc] text-slate-900'} ${
        dragOver ? 'ring-2 ring-inset ring-cyan-400' : ''
      }`}
    >
      {/* Floating Luma AI 5.0 Code Assistant Drawer */}
      {aiDrawerOpen && (
        <div
          className={`absolute right-3 top-12 bottom-10 w-80 sm:w-96 z-40 rounded-2xl border shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl ${
            isDark ? 'bg-slate-950/95 border-sky-400/30 text-slate-100' : 'bg-white/95 border-sky-300 text-slate-900'
          }`}
        >
          <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-sky-500/15 to-indigo-500/15">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400">
              <Sparkles size={14} /> Luma AI 5.0 Nexus · Код
            </div>
            <button onClick={() => setAiDrawerOpen(false)} className="p-1 rounded hover:bg-white/10 cursor-pointer">
              <X size={14} />
            </button>
          </div>
          <div className="p-2.5 border-b border-white/10 flex flex-wrap gap-1.5">
            {[
              { id: 'explain', label: 'Объяснить код' },
              { id: 'bugs', label: 'Найти ошибки' },
              { id: 'optimize', label: 'Улучшить / Рефакторинг' },
            ].map((act) => (
              <button
                key={act.id}
                onClick={() => void askCodeAI38(act.id)}
                disabled={aiLoading}
                className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-[10px] font-bold cursor-pointer"
              >
                {act.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 text-xs space-y-2.5">
            {aiLoading ? (
              <div className="text-sky-400 animate-pulse">Анализ кода + поиск MDN/GitHub источников…</div>
            ) : aiAnswer ? (
              <>
                <div className="whitespace-pre-wrap leading-relaxed font-sans">{aiAnswer}</div>
                {aiSources.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-sky-400 font-bold">Проверенные источники</div>
                    <div className="flex flex-wrap gap-1">
                      {aiSources.map((s, i) => (
                        <a
                          key={`${s.url}_${i}`}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 text-[10px] text-sky-300 hover:underline truncate max-w-full"
                        >
                          {s.provider}: {s.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="opacity-65">
                Выберите быструю команду выше или задайте вопрос по файлу <b>{activeTab?.name}</b> (с опорой на MDN и GitHub).
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (aiPrompt.trim()) void askCodeAI38('ask', aiPrompt);
            }}
            className="p-2 border-t border-white/10 flex gap-1.5"
          >
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Спросить AI 5.0 о коде…"
              className={`flex-1 px-2.5 py-1.5 rounded-xl border text-xs outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-300'}`}
            />
            <button
              type="submit"
              disabled={aiLoading || !aiPrompt.trim()}
              className="px-3 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              OK
            </button>
          </form>
        </div>
      )}
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

      {/* Command Palette Modal */}
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
                placeholder="Команда или файл (форматировать, терминал, ошибки)..."
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
          <button
            onClick={() => setAiDrawerOpen((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-sm ${
              aiDrawerOpen
                ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white'
                : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-400/35'
            }`}
            title="Открыть помощника Luma AI 5.0 Nexus"
          >
            <Sparkles size={11} /> AI 5.0
          </button>
        </div>

        <div className="flex items-center gap-1">
          {statusToast && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mr-1.5">
              <CheckCircle2 size={12} /> {statusToast}
            </span>
          )}
          <button
            onClick={() => { setShowBottomDock(true); setBottomTab('problems'); }}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono border flex items-center gap-1 cursor-pointer ${
              errorCount > 0
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                : warnCount > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                : 'bg-emerald-500/12 border-emerald-400/30 text-emerald-300'
            }`}
            title="Live диагностика ошибок кода"
          >
            <AlertCircle size={11} /> {errorCount}
            <AlertTriangle size={11} className="ml-0.5" /> {warnCount}
          </button>
          <button onClick={() => setShowPalette(true)} className={`px-2 py-1 rounded-lg text-[10px] border flex items-center gap-1 cursor-pointer ${isDark ? 'bg-white/[0.04] border-white/10 text-white/65' : 'bg-slate-100 border-slate-200'}`} title="Палитра команд (Ctrl+Shift+P)">
            <Command size={11} />
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
          <button onClick={() => { setShowBottomDock((v) => !v); setBottomTab('terminal'); }} className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 border cursor-pointer ${showBottomDock ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' : isDark ? 'bg-white/[0.04] border-white/10 text-white/65' : 'bg-slate-100 border-slate-200'}`}>
            <Terminal size={12} /> Терминал
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
            placeholder="Путь к папке проекта (C:\Projects\MyApp или ~/Projects)..."
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
                  <div className="text-xs font-semibold">Рабочая область</div>
                  <div className="text-[10px] opacity-55 mt-1 leading-relaxed">
                    Откройте папку, выберите файл или перетащите файл прямо в окно редактора.
                  </div>
                </div>
                <div className="w-full space-y-1.5">
                  <button onClick={() => void handleOpenFolderDialog()} className="w-full py-1.5 px-3 rounded-xl text-[11px] font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/35 flex items-center justify-center gap-1.5 cursor-pointer">
                    <FolderOpen size={13} /> Открыть папку
                  </button>
                  <button onClick={() => browserFileInputRef.current?.click()} className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-medium border flex items-center justify-center gap-1.5 cursor-pointer ${isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>
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

        {/* Center Editor + Live Diagnostics + Pro Bottom Dock */}
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
                  {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Автосохранено в сессии" />}
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

          {/* Code Surface with Live Diagnostic Gutter Markers & Line Highlighting */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <div className="flex-1 flex min-h-0 overflow-hidden font-mono relative">
              {/* Line Numbers Gutter with Red/Yellow Diagnostic Markers */}
              <div
                ref={gutterRef}
                className={`py-3 px-2 text-right select-none shrink-0 border-r overflow-hidden ${isDark ? 'bg-[#0b0e14] border-white/10 text-white/30' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                style={{ fontSize, lineHeight: '1.6', minWidth: 52 }}
              >
                {lines.map((_, i) => {
                  const lnNum = i + 1;
                  const d = diagByLine.get(lnNum);
                  return (
                    <div
                      key={i}
                      title={d ? `${d.severity === 'error' ? 'Ошибка' : 'Предупреждение'}: ${d.message}` : undefined}
                      onClick={() => jumpToLine(lnNum, d?.col || 1)}
                      className={`flex items-center justify-end gap-1 cursor-pointer ${
                        d?.severity === 'error'
                          ? 'text-rose-400 font-bold bg-rose-500/15 -mx-2 px-2'
                          : d?.severity === 'warning'
                          ? 'text-amber-400 font-bold bg-amber-500/10 -mx-2 px-2'
                          : cursorPos.line === lnNum
                          ? 'text-cyan-400 font-bold'
                          : ''
                      }`}
                    >
                      {d && (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.severity === 'error' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                      )}
                      <span>{lnNum}</span>
                    </div>
                  );
                })}
              </div>

              {/* Layered Syntax Overlay + Error Line Underlay + Caret Textarea */}
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
                  placeholder="Начните писать код здесь (автосохранение и подсветка ошибок работают в реальном времени)..."
                  className={`absolute inset-0 w-full h-full p-3 bg-transparent outline-none resize-none font-mono text-transparent ${isDark ? 'caret-cyan-400 selection:bg-cyan-500/30 placeholder:text-white/25' : 'caret-cyan-600 selection:bg-cyan-500/25 placeholder:text-slate-400'} ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-auto'}`}
                  style={{ fontSize, lineHeight: '1.6', tabSize: 2 }}
                />
              </div>

              {/* Minimap */}
              {showMinimap && lines.length > 0 && (
                <div
                  className={`w-20 shrink-0 border-l p-1.5 overflow-hidden select-none cursor-pointer hidden md:block ${isDark ? 'bg-[#0a0d13] border-white/10 opacity-75' : 'bg-slate-50 border-slate-200 opacity-80'}`}
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

          {/* Pro Integrated Bottom Dock: Problems · Output · Multi-Tab Terminal */}
          {showBottomDock && (
            <div className={`${dockExpanded ? 'h-64' : 'h-40'} shrink-0 border-t flex flex-col transition-all ${isDark ? 'bg-[#080a0f] border-white/10' : 'bg-slate-900 text-slate-100 border-slate-300'}`}>
              {/* Dock Header Tabs */}
              <div className="px-3 py-1 border-b border-white/10 flex items-center justify-between gap-2 text-[10px] shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setBottomTab('problems')}
                    className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer ${
                      bottomTab === 'problems' ? 'bg-rose-500/20 text-rose-300 border border-rose-400/35' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <AlertCircle size={10} /> Проблемы ({diagnostics.length})
                  </button>
                  <button
                    onClick={() => setBottomTab('output')}
                    className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer ${
                      bottomTab === 'output' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Play size={10} /> Вывод
                  </button>
                  <button
                    onClick={() => setBottomTab('terminal')}
                    className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer ${
                      bottomTab === 'terminal' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/35' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Terminal size={10} /> Терминал ({termSessions.length})
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-white/60">
                  {bottomTab === 'terminal' && (
                    <>
                      <button onClick={() => void handleExecTerminal('git status')} className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 cursor-pointer">git status</button>
                      <button onClick={() => void handleExecTerminal('node -v')} className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 cursor-pointer">node -v</button>
                      <button onClick={addTerminalSession} className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 cursor-pointer flex items-center gap-0.5" title="Новая вкладка терминала">
                        <Plus size={10} /> Сессия
                      </button>
                    </>
                  )}
                  {bottomTab === 'output' && (
                    <button onClick={() => setOutputLogs([])} className="hover:text-white cursor-pointer flex items-center gap-0.5"><Trash2 size={10} /> Очистить</button>
                  )}
                  <button onClick={() => setDockExpanded((v) => !v)} className="p-0.5 hover:text-white cursor-pointer" title="Выше / Ниже">
                    {dockExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                  </button>
                  <button onClick={() => setShowBottomDock(false)} className="p-0.5 hover:text-white cursor-pointer"><X size={11} /></button>
                </div>
              </div>

              {/* Problems View */}
              {bottomTab === 'problems' && (
                <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[11px]">
                  {diagnostics.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-emerald-400/80 gap-1.5 text-xs">
                      <CheckCircle2 size={14} /> Ошибок и предупреждений в «{activeTab?.name}» не обнаружено
                    </div>
                  ) : (
                    diagnostics.map((d, idx) => (
                      <button
                        key={idx}
                        onClick={() => jumpToLine(d.line, d.col)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] flex items-center justify-between gap-2 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {d.severity === 'error' ? (
                            <AlertCircle size={12} className="text-rose-400 shrink-0" />
                          ) : (
                            <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                          )}
                          <span className={d.severity === 'error' ? 'text-rose-200 truncate' : 'text-amber-200 truncate'}>{d.message}</span>
                        </div>
                        <span className="text-[10px] text-white/45 shrink-0">
                          [{d.source}] Стр {d.line}, Стб {d.col}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Output View */}
              {bottomTab === 'output' && (
                <div className="flex-1 overflow-y-auto px-3 py-1.5 font-mono text-[11px] space-y-0.5 text-emerald-300/90">
                  {outputLogs.map((l, i) => (
                    <pre key={i} className="whitespace-pre-wrap break-words m-0">{l}</pre>
                  ))}
                </div>
              )}

              {/* Pro Multi-Tab Terminal View */}
              {bottomTab === 'terminal' && activeTerm && (
                <div className="flex-1 flex flex-col min-h-0">
                  {termSessions.length > 1 && (
                    <div className="px-2 py-0.5 border-b border-white/10 flex items-center gap-1 overflow-x-auto text-[10px]">
                      {termSessions.map((ts) => (
                        <div
                          key={ts.id}
                          onClick={() => setActiveTermId(ts.id)}
                          className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${
                            ts.id === activeTerm.id ? 'bg-amber-500/20 text-amber-200' : 'text-white/50 hover:text-white'
                          }`}
                        >
                          <span>{ts.name}</span>
                          {termSessions.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = termSessions.filter((x) => x.id !== ts.id);
                                setTermSessions(next);
                                if (activeTermId === ts.id) setActiveTermId(next[0].id);
                              }}
                            >
                              <X size={9} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto px-3 py-1.5 font-mono text-[11px] space-y-0.5 text-emerald-300/90">
                    {activeTerm.lines.map((l, i) => (
                      <pre key={i} className="whitespace-pre-wrap break-words m-0">{l}</pre>
                    ))}
                  </div>
                  <div className="px-3 py-1 border-t border-white/10 flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-cyan-400 font-bold">{currentDir ? `${currentDir.split(/[\\/]/).pop()} $` : '$'}</span>
                    <input
                      value={termCmd}
                      onChange={(e) => setTermCmd(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleExecTerminal();
                        else if (e.key === 'ArrowUp' && activeTerm.history.length > 0) {
                          e.preventDefault();
                          const nextIdx = Math.min(activeTerm.history.length - 1, historyIdx + 1);
                          setHistoryIdx(nextIdx);
                          setTermCmd(activeTerm.history[nextIdx] || '');
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          const nextIdx = historyIdx - 1;
                          setHistoryIdx(nextIdx);
                          setTermCmd(nextIdx >= 0 ? activeTerm.history[nextIdx] || '' : '');
                        }
                      }}
                      placeholder="Команда ОС (стрелки ↑↓ история · clear — очистить)..."
                      className="flex-1 bg-transparent outline-none text-white placeholder:text-white/35"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pro IDE Status Bar */}
      <div className="px-3 py-1 bg-gradient-to-r from-cyan-700 to-blue-800 text-white text-[10px] font-mono flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-3">
          <span className="font-bold">Luma Code Studio 1.6.2b Pro · AI 5.0</span>
          <select
            value={activeTab?.language || 'plaintext'}
            onChange={(e) => updateActiveLanguage(e.target.value)}
            className="bg-black/25 rounded px-1.5 py-0.5 outline-none text-[10px] uppercase cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l} className="bg-zinc-900 text-white">{l.toUpperCase()}</option>
            ))}
          </select>
          <span className="text-emerald-200 hidden sm:inline">● Автосохранение</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowBottomDock(true); setBottomTab('problems'); }}
            className="hover:underline cursor-pointer"
          >
            ✖ {errorCount} ⚠ {warnCount}
          </button>
          <span>Стр {cursorPos.line}, Стб {cursorPos.col}</span>
          <span>Строк: {lines.length}</span>
          <span className="hidden md:inline">Ctrl+/ · Ctrl+S · Ctrl+Enter</span>
        </div>
      </div>
    </div>
  );
};
