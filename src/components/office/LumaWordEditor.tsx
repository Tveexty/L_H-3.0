import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, BookOpen, CheckCheck,
  Clipboard, Columns, Copy, FilePlus, Highlighter, Image as ImageIcon, IndentDecrease,
  IndentIncrease, Italic, Link2, List, ListOrdered, MessageSquare, Minus, Paintbrush,
  Pilcrow, Plus, Printer, Redo2, RemoveFormatting, Scissors, Search, Sigma, Sparkles,
  Strikethrough, Subscript, Superscript, Table2, Type, Underline, Undo2, Volume2, X,
} from 'lucide-react';
import { DocComment, RibbonBigBtn, RibbonGroup, RibbonSmallBtn } from './officeTypes';

export type WordRibbonTab = 'home' | 'insert' | 'design' | 'layout' | 'references' | 'review' | 'view';

export interface LumaWordEditorProps {
  officeDark: boolean;
  docHtml: string;
  onChangeDocHtml: (html: string) => void;
  docTitle: string;
  comments: DocComment[];
  onChangeComments: (comments: DocComment[]) => void;
  onNotify?: (title: string, body: string, level?: 'info' | 'ok' | 'warn' | 'danger') => void;
  onExport?: (format: 'docx' | 'pdf' | 'html' | 'md' | 'rtf' | 'txt') => void;
  tellMeCommand?: { cmd: string; seq: number } | null;
}

const WORD_BLUE = '#185ABD';

const FONTS = [
  'Calibri', 'Times New Roman', 'Arial', 'Cambria', 'Georgia', 'Segoe UI',
  'Verdana', 'Trebuchet MS', 'Tahoma', 'Consolas', 'Courier New', 'Comic Sans MS',
];

const FONT_SIZES = [
  { label: '8', px: 11 }, { label: '9', px: 12 }, { label: '10', px: 13 },
  { label: '11', px: 15 }, { label: '12', px: 16 }, { label: '14', px: 19 },
  { label: '16', px: 21 }, { label: '18', px: 24 }, { label: '20', px: 27 },
  { label: '24', px: 32 }, { label: '28', px: 37 }, { label: '36', px: 48 }, { label: '48', px: 64 },
];

const TEXT_COLORS = [
  '#000000', '#185ABD', '#C00000', '#107C41', '#7030A0', '#D97706',
  '#475569', '#0284C7', '#E11D48', '#059669', '#4F46E5', '#ffffff',
];

const HIGHLIGHT_COLORS = ['#FEF08A', '#BBF7D0', '#BAE6FD', '#FBCFE8', '#FED7AA', '#E9D5FF', 'transparent'];

const WORD_STYLES: { name: string; tag: string; sampleCls: string }[] = [
  { name: 'Обычный', tag: 'p', sampleCls: 'text-[11px] font-normal' },
  { name: 'Заголовок 1', tag: 'h1', sampleCls: 'text-[13px] font-bold text-[#185ABD]' },
  { name: 'Заголовок 2', tag: 'h2', sampleCls: 'text-[12px] font-bold text-[#2B579A]' },
  { name: 'Заголовок 3', tag: 'h3', sampleCls: 'text-[11px] font-semibold text-[#1F4E79]' },
  { name: 'Цитата', tag: 'blockquote', sampleCls: 'text-[11px] italic text-slate-600 border-l-2 border-[#185ABD] pl-1' },
  { name: 'Код', tag: 'pre', sampleCls: 'text-[10px] font-mono bg-slate-100 px-1 rounded' },
];

const EQUATIONS = [
  { label: 'Квадратное ур.', html: '<span style="font-family:Cambria,serif;font-style:italic;padding:2px 6px;background:#f1f5f9;border-radius:4px">x = (−b ± √(b² − 4ac)) / 2a</span>&nbsp;' },
  { label: 'Теорема Пифагора', html: '<span style="font-family:Cambria,serif;font-style:italic;padding:2px 6px;background:#f1f5f9;border-radius:4px">a² + b² = c²</span>&nbsp;' },
  { label: 'Сумма ряда', html: '<span style="font-family:Cambria,serif;padding:2px 6px;background:#f1f5f9;border-radius:4px">∑<sub>i=1</sub><sup>n</sup> x<sub>i</sub></span>&nbsp;' },
  { label: 'Интеграл', html: '<span style="font-family:Cambria,serif;padding:2px 6px;background:#f1f5f9;border-radius:4px">∫<sub>a</sub><sup>b</sup> f(x) dx</span>&nbsp;' },
  { label: 'Площадь круга', html: '<span style="font-family:Cambria,serif;font-style:italic;padding:2px 6px;background:#f1f5f9;border-radius:4px">S = π · r²</span>&nbsp;' },
  { label: 'Энергия E=mc²', html: '<span style="font-family:Cambria,serif;font-style:italic;padding:2px 6px;background:#f1f5f9;border-radius:4px">E = mc²</span>&nbsp;' },
];

const SPECIAL_SYMBOLS = ['©', '®', '™', '§', '°', '±', '×', '÷', '≠', '≈', '≤', '≥', '∞', 'π', '√', '∑', '∫', 'Δ', '€', '₽', '$', '—', '«', '»', '•', '→', '✓', '★'];

const DOC_THEMES = [
  { id: 'office', name: 'Офис (Синий)', accent: '#185ABD', bg: '#ffffff', text: '#111827' },
  { id: 'classic', name: 'Классика (Бордо)', accent: '#991B1B', bg: '#fffefb', text: '#1c1917' },
  { id: 'emerald', name: 'Изумруд', accent: '#047857', bg: '#ffffff', text: '#064e3b' },
  { id: 'slate', name: 'Графит Про', accent: '#334155', bg: '#f8fafc', text: '#0f172a' },
  { id: 'sepia', name: 'Тёплая бумага', accent: '#92400E', bg: '#fefce8', text: '#292524' },
  { id: 'night', name: 'Тёмный лист', accent: '#60A5FA', bg: '#18181b', text: '#f4f4f5' },
];

export const LumaWordEditor: React.FC<LumaWordEditorProps> = ({
  officeDark,
  docHtml,
  onChangeDocHtml,
  docTitle,
  comments,
  onChangeComments,
  onNotify,
  tellMeCommand,
}) => {
  const [tab, setTab] = useState<WordRibbonTab>('home');
  const [fontFamily, setFontFamily] = useState('Calibri');
  const [fontSizePx, setFontSizePx] = useState(15);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [columns, setColumns] = useState<1 | 2 | 3>(1);
  const [margins, setMargins] = useState<'normal' | 'narrow' | 'wide'>('normal');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'A5' | 'Letter'>('A4');
  const [watermark, setWatermark] = useState('');
  const [pageBg, setPageBg] = useState('#ffffff');
  const [pageText, setPageText] = useState('#111827');
  const [pageBorder, setPageBorder] = useState<'none' | 'thin' | 'double' | 'accent'>('none');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [showPageNum, setShowPageNum] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [showNavPane, setShowNavPane] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showNonPrinting, setShowNonPrinting] = useState(false);
  const [readMode, setReadMode] = useState(false);
  const [trackChanges, setTrackChanges] = useState(false);
  const [formatPainterStyle, setFormatPainterStyle] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  // Popovers & bars
  const [tableGridOpen, setTableGridOpen] = useState(false);
  const [tableHover, setTableHover] = useState({ r: 3, c: 4 });
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [spellIssues, setSpellIssues] = useState<string[] | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const imgInputRef = useRef<HTMLInputElement | null>(null);
  const lastExternalHtmlRef = useRef(docHtml);

  // Sync external html loads (file import / template switch) cleanly into contentEditable without cursor jumping
  useEffect(() => {
    if (editorRef.current && docHtml !== lastExternalHtmlRef.current) {
      if (editorRef.current.innerHTML !== docHtml) {
        editorRef.current.innerHTML = docHtml;
      }
      lastExternalHtmlRef.current = docHtml;
    }
  }, [docHtml]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === '') {
      editorRef.current.innerHTML = docHtml;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Respond to Tell Me search bar commands
  useEffect(() => {
    if (!tellMeCommand) return;
    const c = tellMeCommand.cmd;
    if (c === 'find') setFindOpen(true);
    if (c === 'table') { setTab('insert'); setTableGridOpen(true); }
    if (c === 'watermark') { setTab('design'); setWatermark(watermark ? '' : 'КОНФИДЕНЦИАЛЬНО'); }
    if (c === 'toc') { setTab('references'); insertTOC(); }
    if (c === 'spell') { setTab('review'); runSpellCheck(); }
    if (c === 'comment') { setTab('review'); setShowComments(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tellMeCommand]);

  const syncFromDom = () => {
    if (!editorRef.current) return;
    const next = editorRef.current.innerHTML;
    lastExternalHtmlRef.current = next;
    onChangeDocHtml(next);
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    try {
      document.execCommand(cmd, false, val);
    } catch {
      /* ignore */
    }
    syncFromDom();
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    try {
      document.execCommand('insertHTML', false, html);
    } catch {
      if (editorRef.current) editorRef.current.innerHTML += html;
    }
    syncFromDom();
  };

  const insertTable = (rows: number, cols: number) => {
    let html = '<table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:14px"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        if (r === 0) {
          html += `<th style="border:1px solid #94a3b8;padding:6px 8px;background:#EFF6FF;text-align:left;font-weight:700">Столбец ${c + 1}</th>`;
        } else {
          html += '<td style="border:1px solid #cbd5e1;padding:6px 8px">Данные</td>';
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';
    insertHtml(html);
    setTableGridOpen(false);
    onNotify?.('Word · Таблица', `Вставлена таблица ${rows}×${cols}`, 'ok');
  };

  const insertTOC = () => {
    const tmp = document.createElement('div');
    tmp.innerHTML = docHtml;
    const hs = Array.from(tmp.querySelectorAll('h1, h2, h3'));
    if (hs.length === 0) {
      onNotify?.('Оглавление', 'Добавьте хотя бы один Заголовок 1–3, чтобы собрать авто-оглавление.', 'warn');
      return;
    }
    const items = hs
      .map((h, i) => {
        const indent = h.tagName === 'H1' ? 0 : h.tagName === 'H2' ? 16 : 32;
        return `<div style="padding-left:${indent}px;margin:3px 0;display:flex;justify-content:space-between;border-bottom:1px dotted #cbd5e1"><span>${h.textContent?.trim() || `Раздел ${i + 1}`}</span><span style="color:#64748b">${i + 1}</span></div>`;
      })
      .join('');
    insertHtml(`<div style="border:1px solid #cbd5e1;background:#f8fafc;padding:12px 16px;border-radius:6px;margin:10px 0"><div style="font-weight:700;color:#185ABD;margin-bottom:6px">ОГЛАВЛЕНИЕ</div>${items}</div><p></p>`);
    onNotify?.('Word · Оглавление', `Сформировано из ${hs.length} заголовков`, 'ok');
  };

  const changeCase = (mode: 'upper' | 'lower' | 'title') => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      onNotify?.('Регистр', 'Выделите текст для смены регистра', 'info');
      return;
    }
    const txt = sel.toString();
    const out =
      mode === 'upper'
        ? txt.toUpperCase()
        : mode === 'lower'
        ? txt.toLowerCase()
        : txt.replace(/(^|\s)\S/g, (m) => m.toUpperCase());
    exec('insertText', out);
  };

  const handleFormatPainter = () => {
    if (formatPainterStyle) {
      setFormatPainterStyle(null);
      return;
    }
    const sel = window.getSelection();
    const node = sel?.anchorNode?.parentElement;
    if (!node) {
      onNotify?.('Формат по образцу', 'Поставьте курсор на оформленный текст, затем выделите целевой фрагмент.', 'info');
      return;
    }
    const cs = window.getComputedStyle(node);
    const styleStr = `font-weight:${cs.fontWeight};font-style:${cs.fontStyle};color:${cs.color};background-color:${cs.backgroundColor};font-family:${cs.fontFamily};`;
    setFormatPainterStyle(styleStr);
    onNotify?.('Формат по образцу', 'Стиль скопирован — выделите текст на листе, чтобы применить.', 'ok');
  };

  const handleEditorMouseUp = () => {
    if (!formatPainterStyle) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      const txt = sel.toString();
      insertHtml(`<span style="${formatPainterStyle}">${txt}</span>`);
      setFormatPainterStyle(null);
    }
  };

  const runFindReplace = (replaceAll: boolean) => {
    const q = findTerm;
    if (!q.trim()) return;
    const container = document.createElement('div');
    container.innerHTML = editorRef.current ? editorRef.current.innerHTML : docHtml;

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const countRe = new RegExp(escaped, 'gi');
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let cur = walker.nextNode();
    while (cur) {
      textNodes.push(cur as Text);
      cur = walker.nextNode();
    }

    let totalMatches = 0;
    for (const tn of textNodes) {
      const m = (tn.nodeValue || '').match(countRe);
      if (m) totalMatches += m.length;
    }

    if (totalMatches === 0) {
      onNotify?.('Поиск', `Фрагмент «${q}» не найден`, 'warn');
      return;
    }

    if (replaceTerm !== '' || replaceAll) {
      let replacedCount = 0;
      for (const tn of textNodes) {
        const val = tn.nodeValue || '';
        if (!val) continue;
        if (replaceAll) {
          const matches = val.match(countRe);
          if (matches && matches.length > 0) {
            replacedCount += matches.length;
            tn.nodeValue = val.replace(countRe, () => replaceTerm);
          }
        } else if (replacedCount === 0) {
          const singleRe = new RegExp(escaped, 'i');
          if (singleRe.test(val)) {
            tn.nodeValue = val.replace(singleRe, () => replaceTerm);
            replacedCount = 1;
            break;
          }
        }
      }
      const next = container.innerHTML;
      if (editorRef.current) editorRef.current.innerHTML = next;
      lastExternalHtmlRef.current = next;
      onChangeDocHtml(next);
      onNotify?.('Замена', replaceAll ? `Заменено совпадений: ${replacedCount}` : 'Заменено 1 совпадение', 'ok');
    } else {
      onNotify?.('Поиск', `Найдено совпадений: ${totalMatches}`, 'info');
    }
  };

  const runSpellCheck = () => {
    const tmp = document.createElement('div');
    tmp.innerHTML = editorRef.current ? editorRef.current.innerHTML : docHtml;
    const text = tmp.textContent || '';
    const issues: string[] = [];
    if (/  +/.test(text)) issues.push('Обнаружены двойные пробелы — рекомендуется автоочистка.');
    if (/\b(\S+)\s+\1\b/i.test(text)) issues.push('Найдены повторяющиеся подряд слова.');
    if (/ ,| \.| !| \?/.test(text)) issues.push('Найдены лишние пробелы перед знаками препинания.');
    if (/"[^"]+"/.test(text)) issues.push('Прямые кавычки "..." можно заменить на типографские «ёлочки».');
    if (issues.length === 0) issues.push('Ошибок пунктуации, повторов и типографики не найдено!');
    setSpellIssues(issues);
  };

  const autoFixTypography = () => {
    const container = document.createElement('div');
    container.innerHTML = editorRef.current ? editorRef.current.innerHTML : docHtml;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const val = node.nodeValue || '';
      if (val) {
        node.nodeValue = val
          .replace(/ {2,}/g, ' ')
          .replace(/ ([.,!?;:])/g, '$1')
          .replace(/ - /g, ' — ')
          .replace(/"([^"]+)"/g, '«$1»');
      }
      node = walker.nextNode();
    }
    const next = container.innerHTML;
    if (editorRef.current) editorRef.current.innerHTML = next;
    lastExternalHtmlRef.current = next;
    onChangeDocHtml(next);
    setSpellIssues(['Типографика, кавычки «ёлочки», пробелы и длинные тире «—» приведены к стандарту!']);
    onNotify?.('Word · Правописание', 'Типографика документа улучшена', 'ok');
  };

  const toggleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      onNotify?.('Чтение вслух', 'Синтез речи недоступен в текущей среде', 'warn');
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const tmp = document.createElement('div');
    tmp.innerHTML = docHtml;
    const txt = (tmp.textContent || '').trim();
    if (!txt) return;
    const u = new SpeechSynthesisUtterance(txt.slice(0, 3000));
    u.lang = 'ru-RU';
    u.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        insertHtml(`<p><img src="${reader.result}" style="max-width:100%;border-radius:6px;margin:8px 0" /></p>`);
        onNotify?.('Word · Рисунок', `Вставлено изображение: ${f.name}`, 'ok');
      }
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  // Document live stats & headings tree
  const stats = useMemo(() => {
    const tmp = document.createElement('div');
    tmp.innerHTML = docHtml;
    const txt = (tmp.textContent || '').trim();
    const words = txt ? txt.split(/\s+/).filter(Boolean).length : 0;
    const chars = txt.length;
    const charsNoSpace = txt.replace(/\s/g, '').length;
    const pages = Math.max(1, Math.ceil(words / 380));
    const headings = Array.from(tmp.querySelectorAll('h1, h2, h3')).map((h, i) => ({
      id: i,
      level: Number(h.tagName[1]),
      text: h.textContent?.trim() || `Заголовок ${i + 1}`,
    }));
    return { words, chars, charsNoSpace, pages, headings };
  }, [docHtml]);

  const ribbonBg = officeDark ? 'bg-[#252526] border-white/10 text-zinc-100' : 'bg-[#F3F2F1] border-[#D1D1D1] text-[#242424]';
  const tabBarBg = officeDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-[#E1DFDD]';
  const canvasBg = officeDark ? 'bg-[#161618]' : 'bg-[#E6E6E6]';

  const pageWidthPx =
    orientation === 'landscape'
      ? paperSize === 'A3' ? 1120 : 980
      : paperSize === 'A3' ? 920 : paperSize === 'A5' ? 560 : 794;
  const paddingPx = margins === 'narrow' ? 32 : margins === 'wide' ? 92 : 64;

  const TABS: { id: WordRibbonTab; label: string }[] = [
    { id: 'home', label: 'Главная' },
    { id: 'insert', label: 'Вставка' },
    { id: 'design', label: 'Конструктор' },
    { id: 'layout', label: 'Макет' },
    { id: 'references', label: 'Ссылки' },
    { id: 'review', label: 'Рецензирование' },
    { id: 'view', label: 'Вид' },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 select-none">
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

      {/* AUTHENTIC MS WORD RIBBON TABS */}
      <div className={`flex items-center gap-0.5 px-3 pt-1 border-b text-xs overflow-x-auto ${tabBarBg}`}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-t-md font-medium transition cursor-pointer relative whitespace-nowrap ${
                active
                  ? officeDark
                    ? 'bg-[#252526] text-[#60A5FA] font-bold'
                    : 'bg-[#F3F2F1] text-[#185ABD] font-bold'
                  : officeDark
                  ? 'text-zinc-300 hover:bg-white/5'
                  : 'text-[#323130] hover:bg-[#F3F2F1]'
              }`}
            >
              {t.label}
              {active && <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full bg-[#185ABD]" />}
            </button>
          );
        })}
        {formatPainterStyle && (
          <span className="ml-auto px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-bold animate-pulse">
            Кисть формата активна — выделите текст
          </span>
        )}
      </div>

      {/* AUTHENTIC MS WORD RIBBON GROUPS */}
      <div className={`relative flex items-stretch overflow-x-auto border-b px-1.5 py-0.5 ${ribbonBg}`}>
        {tab === 'home' && (
          <>
            <RibbonGroup label="Буфер обмена" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Clipboard className="w-5 h-5 text-[#185ABD]" />}
                label="Вставить"
                accent={WORD_BLUE}
                isDark={officeDark}
                onClick={async () => {
                  try {
                    const txt = await navigator.clipboard.readText();
                    if (txt) exec('insertText', txt);
                  } catch {
                    exec('paste');
                  }
                }}
              />
              <div className="flex flex-col gap-0.5">
                <RibbonSmallBtn icon={<Scissors className="w-3.5 h-3.5" />} label="Вырезать" isDark={officeDark} onClick={() => exec('cut')} />
                <RibbonSmallBtn icon={<Copy className="w-3.5 h-3.5" />} label="Копировать" isDark={officeDark} onClick={() => exec('copy')} />
                <RibbonSmallBtn
                  icon={<Paintbrush className="w-3.5 h-3.5 text-amber-500" />}
                  label="Формат"
                  active={Boolean(formatPainterStyle)}
                  accent={WORD_BLUE}
                  isDark={officeDark}
                  title="Формат по образцу"
                  onClick={handleFormatPainter}
                />
              </div>
            </RibbonGroup>

            <RibbonGroup label="Шрифт" isDark={officeDark}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <select
                    value={fontFamily}
                    onChange={(e) => {
                      setFontFamily(e.target.value);
                      exec('fontName', e.target.value);
                    }}
                    className={`h-6 px-1.5 rounded border text-[11px] w-32 outline-none ${
                      officeDark ? 'bg-[#1e1e1e] border-white/15 text-white' : 'bg-white border-[#C8C6C4]'
                    }`}
                  >
                    {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select
                    value={fontSizePx}
                    onChange={(e) => {
                      const px = Number(e.target.value);
                      setFontSizePx(px);
                      const sel = window.getSelection();
                      if (sel && !sel.isCollapsed && editorRef.current?.contains(sel.anchorNode)) {
                        const range = sel.getRangeAt(0);
                        const span = document.createElement('span');
                        span.style.fontSize = `${px}px`;
                        try {
                          range.surroundContents(span);
                        } catch {
                          const frag = range.extractContents();
                          span.appendChild(frag);
                          range.insertNode(span);
                        }
                        syncFromDom();
                      }
                    }}
                    className={`h-6 px-1 rounded border text-[11px] w-14 outline-none ${
                      officeDark ? 'bg-[#1e1e1e] border-white/15 text-white' : 'bg-white border-[#C8C6C4]'
                    }`}
                  >
                    {FONT_SIZES.map((s) => <option key={s.label} value={s.px}>{s.label}</option>)}
                  </select>
                  <RibbonSmallBtn
                    icon={<span className="font-bold text-xs">А↑</span>}
                    isDark={officeDark}
                    title="Увеличить размер"
                    onClick={() => {
                      const nextPx = Math.min(64, fontSizePx + 2);
                      setFontSizePx(nextPx);
                      const sel = window.getSelection();
                      if (sel && !sel.isCollapsed && editorRef.current?.contains(sel.anchorNode)) {
                        const range = sel.getRangeAt(0);
                        const span = document.createElement('span');
                        span.style.fontSize = `${nextPx}px`;
                        try {
                          range.surroundContents(span);
                        } catch {
                          span.appendChild(range.extractContents());
                          range.insertNode(span);
                        }
                        syncFromDom();
                      }
                    }}
                  />
                  <RibbonSmallBtn
                    icon={<span className="font-bold text-[10px]">А↓</span>}
                    isDark={officeDark}
                    title="Уменьшить размер"
                    onClick={() => {
                      const nextPx = Math.max(10, fontSizePx - 2);
                      setFontSizePx(nextPx);
                      const sel = window.getSelection();
                      if (sel && !sel.isCollapsed && editorRef.current?.contains(sel.anchorNode)) {
                        const range = sel.getRangeAt(0);
                        const span = document.createElement('span');
                        span.style.fontSize = `${nextPx}px`;
                        try {
                          range.surroundContents(span);
                        } catch {
                          span.appendChild(range.extractContents());
                          range.insertNode(span);
                        }
                        syncFromDom();
                      }
                    }}
                  />
                  <RibbonSmallBtn icon={<span className="text-[11px] font-bold">АА</span>} isDark={officeDark} title="ВСЕ ПРОПИСНЫЕ" onClick={() => changeCase('upper')} />
                  <RibbonSmallBtn icon={<span className="text-[11px]">аа</span>} isDark={officeDark} title="все строчные" onClick={() => changeCase('lower')} />
                  <RibbonSmallBtn icon={<RemoveFormatting className="w-3.5 h-3.5 text-rose-500" />} isDark={officeDark} title="Очистить форматирование" onClick={() => exec('removeFormat')} />
                </div>
                <div className="flex items-center gap-0.5">
                  <RibbonSmallBtn icon={<Bold className="w-3.5 h-3.5" />} isDark={officeDark} title="Полужирный (Ctrl+B)" onClick={() => exec('bold')} />
                  <RibbonSmallBtn icon={<Italic className="w-3.5 h-3.5" />} isDark={officeDark} title="Курсив (Ctrl+I)" onClick={() => exec('italic')} />
                  <RibbonSmallBtn icon={<Underline className="w-3.5 h-3.5" />} isDark={officeDark} title="Подчёркнутый (Ctrl+U)" onClick={() => exec('underline')} />
                  <RibbonSmallBtn icon={<Strikethrough className="w-3.5 h-3.5" />} isDark={officeDark} title="Зачёркнутый" onClick={() => exec('strikeThrough')} />
                  <RibbonSmallBtn icon={<Subscript className="w-3.5 h-3.5" />} isDark={officeDark} title="Подстрочный знак" onClick={() => exec('subscript')} />
                  <RibbonSmallBtn icon={<Superscript className="w-3.5 h-3.5" />} isDark={officeDark} title="Надстрочный знак" onClick={() => exec('superscript')} />
                  <div className="h-4 w-px bg-zinc-400/30 mx-1" />
                  <span className="inline-flex items-center gap-0.5" title="Цвет выделения (маркер)">
                    <Highlighter className="w-3.5 h-3.5 text-amber-500 mr-0.5" />
                    {HIGHLIGHT_COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => exec('hiliteColor', c)}
                        className="w-3.5 h-3.5 rounded-sm border border-black/20 cursor-pointer"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <div className="h-4 w-px bg-zinc-400/30 mx-1" />
                  <span className="inline-flex items-center gap-0.5" title="Цвет шрифта">
                    {TEXT_COLORS.slice(0, 6).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => exec('foreColor', c)}
                        className="w-3.5 h-3.5 rounded-full border border-black/20 cursor-pointer"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </RibbonGroup>

            <RibbonGroup label="Абзац" isDark={officeDark}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-0.5">
                  <RibbonSmallBtn icon={<List className="w-3.5 h-3.5" />} isDark={officeDark} title="Маркированный список" onClick={() => exec('insertUnorderedList')} />
                  <RibbonSmallBtn icon={<ListOrdered className="w-3.5 h-3.5" />} isDark={officeDark} title="Нумерованный список" onClick={() => exec('insertOrderedList')} />
                  <RibbonSmallBtn icon={<IndentDecrease className="w-3.5 h-3.5" />} isDark={officeDark} title="Уменьшить отступ" onClick={() => exec('outdent')} />
                  <RibbonSmallBtn icon={<IndentIncrease className="w-3.5 h-3.5" />} isDark={officeDark} title="Увеличить отступ" onClick={() => exec('indent')} />
                  <RibbonSmallBtn
                    icon={<Pilcrow className="w-3.5 h-3.5" />}
                    active={showNonPrinting}
                    accent={WORD_BLUE}
                    isDark={officeDark}
                    title="Показать непечатаемые знаки ¶"
                    onClick={() => setShowNonPrinting((v) => !v)}
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <RibbonSmallBtn icon={<AlignLeft className="w-3.5 h-3.5" />} isDark={officeDark} title="По левому краю" onClick={() => exec('justifyLeft')} />
                  <RibbonSmallBtn icon={<AlignCenter className="w-3.5 h-3.5" />} isDark={officeDark} title="По центру" onClick={() => exec('justifyCenter')} />
                  <RibbonSmallBtn icon={<AlignRight className="w-3.5 h-3.5" />} isDark={officeDark} title="По правому краю" onClick={() => exec('justifyRight')} />
                  <RibbonSmallBtn icon={<AlignJustify className="w-3.5 h-3.5" />} isDark={officeDark} title="По ширине" onClick={() => exec('justifyFull')} />
                  <select
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    title="Межстрочный интервал"
                    className={`h-6 px-1 rounded border text-[10px] outline-none ml-0.5 ${
                      officeDark ? 'bg-[#1e1e1e] border-white/15 text-white' : 'bg-white border-[#C8C6C4]'
                    }`}
                  >
                    <option value={1.0}>1.0</option>
                    <option value={1.15}>1.15</option>
                    <option value={1.5}>1.5</option>
                    <option value={2.0}>2.0</option>
                    <option value={2.5}>2.5</option>
                  </select>
                </div>
              </div>
            </RibbonGroup>

            <RibbonGroup label="Стили" isDark={officeDark}>
              <div className="flex items-center gap-1">
                {WORD_STYLES.map((st) => (
                  <button
                    key={st.name}
                    type="button"
                    onClick={() => exec('formatBlock', st.tag)}
                    className={`px-2 py-1.5 rounded border text-left transition cursor-pointer h-[52px] min-w-[68px] flex flex-col justify-between ${
                      officeDark
                        ? 'bg-[#1E1E1E] border-white/12 hover:border-[#60A5FA]'
                        : 'bg-white border-[#D1D1D1] hover:border-[#185ABD] hover:bg-[#EFF6FF]'
                    }`}
                  >
                    <span className={`truncate ${st.sampleCls}`}>АаБбВв</span>
                    <span className="text-[9px] text-zinc-500 truncate">{st.name}</span>
                  </button>
                ))}
              </div>
            </RibbonGroup>

            <RibbonGroup label="Редактирование" isDark={officeDark}>
              <div className="flex flex-col gap-0.5">
                <RibbonSmallBtn icon={<Search className="w-3.5 h-3.5 text-[#185ABD]" />} label="Найти / Заменить" active={findOpen} accent={WORD_BLUE} isDark={officeDark} onClick={() => setFindOpen((v) => !v)} />
                <RibbonSmallBtn icon={<Undo2 className="w-3.5 h-3.5" />} label="Отменить" isDark={officeDark} onClick={() => exec('undo')} />
                <RibbonSmallBtn icon={<Redo2 className="w-3.5 h-3.5" />} label="Повторить" isDark={officeDark} onClick={() => exec('redo')} />
              </div>
            </RibbonGroup>
          </>
        )}

        {tab === 'insert' && (
          <>
            <RibbonGroup label="Страницы" isDark={officeDark}>
              <RibbonBigBtn
                icon={<FilePlus className="w-5 h-5 text-[#185ABD]" />}
                label="Титульная страница"
                isDark={officeDark}
                onClick={() =>
                  insertHtml(
                    `<div style="border-bottom:3px solid #185ABD;padding:36px 20px;margin-bottom:24px;text-align:center"><div style="font-size:12px;letter-spacing:2px;color:#64748b">LUMA OFFICE</div><h1 style="font-size:32px;color:#185ABD;margin:10px 0">${docTitle}</h1><p style="color:#475569">${new Date().toLocaleDateString('ru-RU')}</p></div><p></p>`
                  )
                }
              />
              <RibbonBigBtn
                icon={<Minus className="w-5 h-5" />}
                label="Разрыв страницы"
                isDark={officeDark}
                onClick={() => insertHtml('<hr style="border:none;border-top:2px dashed #94a3b8;margin:24px 0" /><p></p>')}
              />
            </RibbonGroup>

            <RibbonGroup label="Таблицы" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Table2 className="w-5 h-5 text-[#185ABD]" />}
                label="Таблица ▾"
                active={tableGridOpen}
                accent={WORD_BLUE}
                isDark={officeDark}
                onClick={() => setTableGridOpen((v) => !v)}
              />
            </RibbonGroup>

            <RibbonGroup label="Иллюстрации" isDark={officeDark}>
              <RibbonBigBtn icon={<ImageIcon className="w-5 h-5 text-emerald-600" />} label="Рисунок с ПК" isDark={officeDark} onClick={() => imgInputRef.current?.click()} />
              <RibbonBigBtn
                icon={<Sparkles className="w-5 h-5 text-amber-500" />}
                label="Выноска (Блок)"
                isDark={officeDark}
                onClick={() =>
                  insertHtml('<div style="border-left:4px solid #185ABD;background:#EFF6FF;padding:10px 14px;border-radius:0 6px 6px 0;margin:10px 0"><strong>Важное примечание:</strong> Введите ключевой тезис здесь.</div><p></p>')
                }
              />
              <RibbonBigBtn
                icon={<Type className="w-5 h-5 text-indigo-500" />}
                label="Надпись"
                isDark={officeDark}
                onClick={() =>
                  insertHtml('<div style="border:1.5px solid #185ABD;padding:10px 14px;border-radius:6px;margin:10px 0;background:#ffffff">Текстовый блок (Надпись)</div><p></p>')
                }
              />
            </RibbonGroup>

            <RibbonGroup label="Ссылки и Колонтитулы" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Link2 className="w-5 h-5 text-sky-600" />}
                label="Гиперссылка"
                isDark={officeDark}
                onClick={() => {
                  const url = window.prompt('Введите адрес ссылки (https://...):', 'https://');
                  if (url) exec('createLink', url);
                }}
              />
              <div className="flex flex-col gap-1">
                <input
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Верхний колонтитул..."
                  className={`h-6 px-2 rounded border text-[11px] w-40 outline-none ${officeDark ? 'bg-[#1e1e1e] border-white/15' : 'bg-white border-[#C8C6C4]'}`}
                />
                <input
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Нижний колонтитул..."
                  className={`h-6 px-2 rounded border text-[11px] w-40 outline-none ${officeDark ? 'bg-[#1e1e1e] border-white/15' : 'bg-white border-[#C8C6C4]'}`}
                />
              </div>
              <RibbonBigBtn
                icon={<span className="font-mono font-bold text-sm">#1</span>}
                label="Номера страниц"
                active={showPageNum}
                accent={WORD_BLUE}
                isDark={officeDark}
                onClick={() => setShowPageNum((v) => !v)}
              />
            </RibbonGroup>

            <RibbonGroup label="Уравнения и Символы" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Sigma className="w-5 h-5 text-violet-600" />}
                label="Формулы и Символы"
                active={symbolsOpen}
                accent={WORD_BLUE}
                isDark={officeDark}
                onClick={() => setSymbolsOpen((v) => !v)}
              />
              <RibbonBigBtn
                icon={<Plus className="w-5 h-5" />}
                label="Дата и время"
                isDark={officeDark}
                onClick={() => exec('insertText', new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }))}
              />
            </RibbonGroup>
          </>
        )}

        {tab === 'design' && (
          <>
            <RibbonGroup label="Темы документа" isDark={officeDark}>
              <div className="flex items-center gap-1.5">
                {DOC_THEMES.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      setPageBg(th.bg);
                      setPageText(th.text);
                      onNotify?.('Word · Конструктор', `Применена тема «${th.name}»`, 'ok');
                    }}
                    className={`px-2.5 py-1.5 rounded border text-left cursor-pointer h-[52px] min-w-[82px] flex flex-col justify-between transition ${
                      pageBg === th.bg ? 'border-[#185ABD] ring-1 ring-[#185ABD]' : officeDark ? 'border-white/15' : 'border-[#D1D1D1]'
                    }`}
                    style={{ backgroundColor: th.bg, color: th.text }}
                  >
                    <span className="text-[11px] font-bold" style={{ color: th.accent }}>Aa</span>
                    <span className="text-[9px] truncate opacity-85">{th.name}</span>
                  </button>
                ))}
              </div>
            </RibbonGroup>

            <RibbonGroup label="Подложка (Водяной знак)" isDark={officeDark}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  {['', 'ОБРАЗЕЦ', 'ЧЕРНОВИК', 'КОНФИДЕНЦИАЛЬНО'].map((wm) => (
                    <button
                      key={wm || 'none'}
                      type="button"
                      onClick={() => setWatermark(wm)}
                      className={`px-2 py-1 rounded border text-[10px] font-semibold cursor-pointer ${
                        watermark === wm
                          ? 'bg-[#185ABD] text-white border-[#185ABD]'
                          : officeDark
                          ? 'bg-[#1e1e1e] border-white/15 hover:bg-white/10'
                          : 'bg-white border-[#C8C6C4] hover:bg-[#EFF6FF]'
                      }`}
                    >
                      {wm || 'Нет'}
                    </button>
                  ))}
                </div>
                <input
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  placeholder="Свой текст подложки..."
                  className={`h-6 px-2 rounded border text-[11px] outline-none ${officeDark ? 'bg-[#1e1e1e] border-white/15' : 'bg-white border-[#C8C6C4]'}`}
                />
              </div>
            </RibbonGroup>

            <RibbonGroup label="Границы страницы" isDark={officeDark}>
              {(['none', 'thin', 'double', 'accent'] as const).map((b) => (
                <RibbonSmallBtn
                  key={b}
                  icon={<span className="w-3.5 h-3.5 inline-block border border-current rounded-xs" />}
                  label={b === 'none' ? 'Нет' : b === 'thin' ? 'Рамка' : b === 'double' ? 'Двойная' : 'Синяя'}
                  active={pageBorder === b}
                  accent={WORD_BLUE}
                  isDark={officeDark}
                  onClick={() => setPageBorder(b)}
                />
              ))}
            </RibbonGroup>
          </>
        )}

        {tab === 'layout' && (
          <>
            <RibbonGroup label="Поля страницы" isDark={officeDark}>
              {(['normal', 'narrow', 'wide'] as const).map((m) => (
                <RibbonBigBtn
                  key={m}
                  icon={<BookOpen className="w-4 h-4 text-[#185ABD]" />}
                  label={m === 'normal' ? 'Обычные' : m === 'narrow' ? 'Узкие' : 'Широкие'}
                  active={margins === m}
                  accent={WORD_BLUE}
                  isDark={officeDark}
                  onClick={() => setMargins(m)}
                />
              ))}
            </RibbonGroup>

            <RibbonGroup label="Ориентация" isDark={officeDark}>
              <RibbonBigBtn
                icon={<div className="w-4 h-5 border-2 border-current rounded-xs" />}
                label="Книжная"
                active={orientation === 'portrait'}
                accent={WORD_BLUE}
                isDark={officeDark}
                onClick={() => setOrientation('portrait')}
              />
              <RibbonBigBtn
                icon={<div className="w-5 h-4 border-2 border-current rounded-xs" />}
                label="Альбомная"
                active={orientation === 'landscape'}
                accent={WORD_BLUE}
                isDark={officeDark}
                onClick={() => setOrientation('landscape')}
              />
            </RibbonGroup>

            <RibbonGroup label="Размер листа" isDark={officeDark}>
              {(['A4', 'A3', 'A5', 'Letter'] as const).map((sz) => (
                <RibbonSmallBtn
                  key={sz}
                  icon={<span className="font-mono text-[10px] font-bold">{sz}</span>}
                  active={paperSize === sz}
                  accent={WORD_BLUE}
                  isDark={officeDark}
                  onClick={() => setPaperSize(sz)}
                />
              ))}
            </RibbonGroup>

            <RibbonGroup label="Колонки" isDark={officeDark}>
              {([1, 2, 3] as const).map((c) => (
                <RibbonBigBtn
                  key={c}
                  icon={<Columns className="w-4 h-4 text-[#185ABD]" />}
                  label={`${c} ${c === 1 ? 'колонка' : 'колонки'}`}
                  active={columns === c}
                  accent={WORD_BLUE}
                  isDark={officeDark}
                  onClick={() => setColumns(c)}
                />
              ))}
            </RibbonGroup>
          </>
        )}

        {tab === 'references' && (
          <>
            <RibbonGroup label="Оглавление" isDark={officeDark}>
              <RibbonBigBtn icon={<List className="w-5 h-5 text-[#185ABD]" />} label="Авто-оглавление" isDark={officeDark} onClick={insertTOC} />
              <RibbonBigBtn
                icon={<BookOpen className="w-5 h-5 text-sky-600" />}
                label="Навигация"
                active={showNavPane}
                accent={WORD_BLUE}
                isDark={officeDark}
                onClick={() => setShowNavPane((v) => !v)}
              />
            </RibbonGroup>
            <RibbonGroup label="Сноски и Источники" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Superscript className="w-5 h-5 text-violet-600" />}
                label="Вставить сноску"
                isDark={officeDark}
                onClick={() => {
                  const note = window.prompt('Текст сноски:');
                  if (note) {
                    insertHtml(`<sup style="color:#185ABD;font-weight:700" title="${note.replace(/"/g, '&quot;')}">[*]</sup>`);
                  }
                }}
              />
              <RibbonBigBtn
                icon={<Plus className="w-5 h-5" />}
                label="Список литературы"
                isDark={officeDark}
                onClick={() =>
                  insertHtml('<h2>Список использованной литературы</h2><ol><li>ГОСТ Р 7.0.5–2008. Библиографическая ссылка.</li><li>Документация Luma OS 1.5.4 Carbon.</li></ol>')
                }
              />
            </RibbonGroup>
          </>
        )}

        {tab === 'review' && (
          <>
            <RibbonGroup label="Правописание" isDark={officeDark}>
              <RibbonBigBtn icon={<CheckCheck className="w-5 h-5 text-emerald-600" />} label="Проверить текст" isDark={officeDark} onClick={runSpellCheck} />
              <RibbonBigBtn icon={<Sparkles className="w-5 h-5 text-amber-500" />} label="Авто-типографика" isDark={officeDark} onClick={autoFixTypography} />
              <RibbonBigBtn
                icon={<Volume2 className={`w-5 h-5 ${speaking ? 'text-rose-500 animate-pulse' : 'text-sky-600'}`} />}
                label={speaking ? 'Стоп озвучки' : 'Прочесть вслух'}
                active={speaking}
                accent={WORD_BLUE}
                isDark={officeDark}
                onClick={toggleReadAloud}
              />
            </RibbonGroup>
            <RibbonGroup label="Примечания" isDark={officeDark}>
              <RibbonBigBtn
                icon={<MessageSquare className="w-5 h-5 text-[#185ABD]" />}
                label={`Примечания (${comments.length})`}
                active={showComments}
                accent={WORD_BLUE}
                isDark={officeDark}
                onClick={() => setShowComments((v) => !v)}
              />
            </RibbonGroup>
            <RibbonGroup label="Исправления" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Paintbrush className="w-5 h-5 text-rose-500" />}
                label="Режим правок"
                active={trackChanges}
                accent={WORD_BLUE}
                isDark={officeDark}
                onClick={() => {
                  setTrackChanges((v) => !v);
                  onNotify?.('Режим исправлений', !trackChanges ? 'Новые правки будут подсвечиваться' : 'Режим исправлений выключен', 'info');
                }}
              />
            </RibbonGroup>
          </>
        )}

        {tab === 'view' && (
          <>
            <RibbonGroup label="Режимы просмотра" isDark={officeDark}>
              <RibbonBigBtn icon={<BookOpen className="w-5 h-5 text-[#185ABD]" />} label="Режим чтения" active={readMode} accent={WORD_BLUE} isDark={officeDark} onClick={() => setReadMode((v) => !v)} />
              <RibbonBigBtn icon={<Printer className="w-5 h-5" />} label="Печать" isDark={officeDark} onClick={() => window.print()} />
            </RibbonGroup>
            <RibbonGroup label="Отображение" isDark={officeDark}>
              <RibbonSmallBtn icon={<Minus className="w-3.5 h-3.5" />} label="Линейка" active={showRuler} accent={WORD_BLUE} isDark={officeDark} onClick={() => setShowRuler((v) => !v)} />
              <RibbonSmallBtn icon={<List className="w-3.5 h-3.5" />} label="Область навигации" active={showNavPane} accent={WORD_BLUE} isDark={officeDark} onClick={() => setShowNavPane((v) => !v)} />
            </RibbonGroup>
            <RibbonGroup label="Масштаб" isDark={officeDark}>
              {[75, 100, 125, 150].map((z) => (
                <RibbonSmallBtn key={z} icon={<span className="font-mono text-[10px]">{z}%</span>} active={zoom === z} accent={WORD_BLUE} isDark={officeDark} onClick={() => setZoom(z)} />
              ))}
            </RibbonGroup>
          </>
        )}
      </div>

      {/* INTERACTIVE 10×8 TABLE PICKER POPOVER (JUST LIKE MS WORD!) */}
      {tableGridOpen && (
        <div
          className={`px-4 py-3 border-b flex flex-wrap items-center gap-4 text-xs ${
            officeDark ? 'bg-[#1E1E1E] border-white/10 text-zinc-100' : 'bg-white border-[#D1D1D1] text-slate-900 shadow-sm'
          }`}
        >
          <div>
            <div className="font-bold text-[11px] mb-1.5 text-[#185ABD]">
              Вставка таблицы: {tableHover.c} × {tableHover.r} (наведите и кликните)
            </div>
            <div className="inline-grid grid-cols-10 gap-1 p-1.5 rounded border border-zinc-400/30">
              {Array.from({ length: 6 * 10 }).map((_, idx) => {
                const r = Math.floor(idx / 10) + 1;
                const c = (idx % 10) + 1;
                const lit = r <= tableHover.r && c <= tableHover.c;
                return (
                  <button
                    key={idx}
                    type="button"
                    onMouseEnter={() => setTableHover({ r, c })}
                    onClick={() => insertTable(r, c)}
                    className={`w-4 h-4 rounded-[2px] border cursor-pointer transition ${
                      lit ? 'bg-[#185ABD]/30 border-[#185ABD]' : 'border-zinc-400/40 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>
          </div>
          <button type="button" onClick={() => setTableGridOpen(false)} className="ml-auto p-1.5 rounded hover:bg-zinc-500/15 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* EQUATIONS & SYMBOLS POPOVER */}
      {symbolsOpen && (
        <div
          className={`px-4 py-2.5 border-b space-y-2 text-xs ${
            officeDark ? 'bg-[#1E1E1E] border-white/10 text-zinc-100' : 'bg-white border-[#D1D1D1] text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#185ABD]">Уравнения и специальные символы</span>
            <button type="button" onClick={() => setSymbolsOpen(false)} className="p-1 rounded hover:bg-zinc-500/15 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EQUATIONS.map((eq) => (
              <button
                key={eq.label}
                type="button"
                onClick={() => insertHtml(eq.html)}
                className={`px-2 py-1 rounded border text-[11px] cursor-pointer ${officeDark ? 'border-white/15 hover:bg-white/10' : 'border-zinc-300 hover:bg-[#EFF6FF]'}`}
              >
                {eq.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {SPECIAL_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => exec('insertText', sym)}
                className={`w-7 h-7 rounded border font-mono text-sm cursor-pointer ${officeDark ? 'border-white/15 hover:bg-white/10' : 'border-zinc-300 hover:bg-[#EFF6FF]'}`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FIND & REPLACE BAR */}
      {findOpen && (
        <div
          className={`px-4 py-2 border-b flex flex-wrap items-center gap-2 text-xs ${
            officeDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-[#EFF6FF] border-[#BFDBFE] text-slate-900'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-[#185ABD]" />
          <input
            value={findTerm}
            onChange={(e) => setFindTerm(e.target.value)}
            placeholder="Найти текст..."
            className={`px-2 py-1 rounded border text-xs w-44 outline-none ${officeDark ? 'bg-black/30 border-white/15' : 'bg-white border-zinc-300'}`}
          />
          <input
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="Заменить на..."
            className={`px-2 py-1 rounded border text-xs w-44 outline-none ${officeDark ? 'bg-black/30 border-white/15' : 'bg-white border-zinc-300'}`}
          />
          <button type="button" onClick={() => runFindReplace(false)} className="px-2.5 py-1 rounded bg-[#185ABD] text-white font-semibold cursor-pointer">
            Заменить
          </button>
          <button type="button" onClick={() => runFindReplace(true)} className="px-2.5 py-1 rounded bg-slate-700 text-white font-semibold cursor-pointer">
            Заменить все
          </button>
          <button type="button" onClick={() => setFindOpen(false)} className="ml-auto p-1 rounded hover:bg-black/10 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* SPELLCHECK BANNER */}
      {spellIssues && (
        <div className="px-4 py-2 border-b bg-emerald-500/10 border-emerald-500/25 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5">
            {spellIssues.map((iss, i) => (
              <div key={i} className="font-medium">• {iss}</div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={autoFixTypography} className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold cursor-pointer">
              Исправить типографику
            </button>
            <button type="button" onClick={() => setSpellIssues(null)} className="p-1 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {/* MAIN MS WORD WORKSPACE: Navigation Pane + Centimeter Ruler + Paper Sheet + Comments Pane */}
      <div className={`flex-1 min-h-0 flex overflow-hidden ${canvasBg}`}>
        {/* Left Navigation Pane (Heading Tree) */}
        {showNavPane && (
          <div
            className={`w-56 shrink-0 border-r p-3 overflow-y-auto text-xs space-y-2 ${
              officeDark ? 'bg-[#1E1E1E] border-white/10 text-zinc-200' : 'bg-white border-[#D1D1D1] text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-[#185ABD]">
              <span>Навигация</span>
              <button type="button" onClick={() => setShowNavPane(false)} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
            {stats.headings.length === 0 ? (
              <div className="text-[11px] opacity-60">Используйте стили «Заголовок 1–3» на вкладке «Главная», чтобы здесь появилось дерево документа.</div>
            ) : (
              stats.headings.map((h) => (
                <div
                  key={h.id}
                  onClick={() => {
                    const hs = editorRef.current?.querySelectorAll('h1, h2, h3');
                    const target = hs?.[h.id] as HTMLElement | undefined;
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      const prevBg = target.style.backgroundColor;
                      target.style.backgroundColor = 'rgba(24,90,189,0.18)';
                      window.setTimeout(() => {
                        target.style.backgroundColor = prevBg;
                      }, 900);
                    }
                  }}
                  style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                  className="py-1 px-1.5 rounded hover:bg-[#185ABD]/10 cursor-pointer truncate font-medium"
                >
                  {h.text}
                </div>
              ))
            )}
          </div>
        )}

        {/* Center Scrollable Multi-Page A4 Word Canvas (True Page-by-Page Layout for Large Documents!) */}
        <div
          id="luma-word-scroll-canvas"
          className="flex-1 min-w-0 overflow-auto flex flex-col items-center py-4 px-4"
        >
          {/* Quick Page Navigator Bar + Manual Page Break (Ctrl+Enter) */}
          <div
            style={{ width: `${Math.round((pageWidthPx * zoom) / 100)}px` }}
            className={`mb-2 px-3 py-1.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-[11px] select-none shrink-0 ${
              officeDark ? 'bg-[#252526] border-white/10 text-zinc-300' : 'bg-white border-[#D1D1D1] text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-[#185ABD]">Листы A4:</span>
              <span className="px-1.5 py-0.5 rounded bg-[#185ABD]/15 text-[#185ABD] font-bold">
                {Math.max(1, stats.pages)} стр.
              </span>
              <span className="opacity-65 hidden sm:inline">· {stats.words} слов</span>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(8, Math.max(1, stats.pages)) }).map((_, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('luma-word-scroll-canvas');
                    if (el) {
                      const pageStep = Math.round(((1060 + 28) * zoom) / 100);
                      el.scrollTo({ top: pIdx * pageStep, behavior: 'smooth' });
                    }
                  }}
                  title={`Перейти на страницу ${pIdx + 1}`}
                  className={`w-6 h-5 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                    officeDark
                      ? 'border-white/15 hover:bg-[#185ABD] hover:text-white'
                      : 'border-slate-300 hover:bg-[#185ABD] hover:text-white'
                  }`}
                >
                  {pIdx + 1}
                </button>
              ))}
              {stats.pages > 8 && <span className="text-[10px] opacity-60">…{stats.pages}</span>}
              {!readMode && (
                <button
                  type="button"
                  onClick={() => {
                    editorRef.current?.focus();
                    document.execCommand(
                      'insertHTML',
                      false,
                      '<div class="luma-word-page-break" contenteditable="false" data-page-break="1"><span>— Разрыв страницы —</span></div><p><br/></p>'
                    );
                    syncFromDom();
                  }}
                  title="Вставить разрыв страницы (Ctrl + Enter)"
                  className="ml-1 px-2 py-0.5 rounded bg-[#185ABD] hover:bg-[#144ca0] text-white text-[10px] font-semibold cursor-pointer"
                >
                  + Разрыв стр.
                </button>
              )}
            </div>
          </div>

          {/* Authentic Centimeter Top Ruler */}
          {showRuler && !readMode && (
            <div
              style={{ width: `${Math.round((pageWidthPx * zoom) / 100)}px` }}
              className={`h-5 mb-2 rounded-sm border flex items-end justify-between px-4 text-[9px] font-mono select-none shrink-0 ${
                officeDark ? 'bg-[#252526] border-white/10 text-zinc-400' : 'bg-white border-[#D1D1D1] text-slate-500'
              }`}
            >
              {Array.from({ length: 17 }).map((_, cm) => (
                <span key={cm} className="flex flex-col items-center">
                  <span>{cm}</span>
                  <span className="w-px h-1.5 bg-current opacity-50" />
                </span>
              ))}
            </div>
          )}

          {/* True Paginated A4 Document Stack: Visual Word Page Sheets & Realistic Desk Gaps Between Every Page */}
          {(() => {
            const A4_PAGE_H = orientation === 'landscape' ? 760 : 1060;
            const PAGE_GAP = 26;
            const STRIDE = A4_PAGE_H + PAGE_GAP;
            const pageCount = Math.max(1, stats.pages);
            const deskBg = officeDark ? '#18181b' : '#e5e7eb';
            const totalMinHeight = pageCount * A4_PAGE_H + (pageCount - 1) * PAGE_GAP;
            return (
              <div
                style={{
                  width: `${pageWidthPx}px`,
                  minHeight: `${totalMinHeight}px`,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  backgroundColor: pageBg,
                  color: pageText,
                  padding: `${paddingPx}px`,
                  // Repeating realistic page-break desk bands so large multi-page documents clearly divide into distinct A4 pages!
                  backgroundImage:
                    pageCount > 1
                      ? `repeating-linear-gradient(to bottom, ${pageBg} 0px, ${pageBg} ${A4_PAGE_H}px, rgba(0,0,0,0.16) ${A4_PAGE_H}px, ${deskBg} ${A4_PAGE_H + 2}px, ${deskBg} ${STRIDE - 2}px, rgba(0,0,0,0.16) ${STRIDE - 1}px, ${pageBg} ${STRIDE}px)`
                      : undefined,
                  border:
                    pageBorder === 'thin'
                      ? '1px solid #334155'
                      : pageBorder === 'double'
                      ? '4px double #185ABD'
                      : pageBorder === 'accent'
                      ? '3px solid #185ABD'
                      : '1px solid rgba(0,0,0,0.14)',
                }}
                className="relative shadow-[0_8px_32px_rgba(0,0,0,0.22)] rounded-[2px] flex flex-col select-text transition-all"
              >
                {/* Visual Page Number Footers & Sheet Separators rendered cleanly at EVERY page boundary */}
                {Array.from({ length: pageCount }).map((_, idx) => {
                  const pageBottomTop = idx * STRIDE + A4_PAGE_H - 28;
                  return (
                    <div
                      key={`pg_marker_${idx}`}
                      style={{ top: `${pageBottomTop}px`, left: `${paddingPx}px`, right: `${paddingPx}px` }}
                      className="pointer-events-none absolute flex items-center justify-between text-[10px] font-mono text-slate-400/90 border-t border-slate-300/60 pt-1 select-none"
                    >
                      <span>{footerText || 'Luma Word 1.6.7'}</span>
                      {showPageNum && (
                        <span>
                          Страница {idx + 1} из {pageCount}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Watermark Overlay */}
                {watermark && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                    <span className="text-6xl font-black tracking-widest opacity-[0.07] -rotate-35 uppercase select-none">
                      {watermark}
                    </span>
                  </div>
                )}

                {/* Header */}
                {headerText && (
                  <div className="text-[11px] text-slate-400 border-b border-slate-200 pb-2 mb-4 flex justify-between">
                    <span>{headerText}</span>
                    <span>{docTitle}</span>
                  </div>
                )}

                {/* Editable Document Body (supports huge texts + Ctrl+Enter manual page breaks!) */}
                <div
                  ref={editorRef}
                  contentEditable={!readMode}
                  suppressContentEditableWarning
                  onInput={syncFromDom}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !readMode) {
                      e.preventDefault();
                      document.execCommand(
                        'insertHTML',
                        false,
                        '<div class="luma-word-page-break" contenteditable="false" data-page-break="1"><span>— Разрыв страницы —</span></div><p><br/></p>'
                      );
                      syncFromDom();
                    }
                  }}
                  onMouseUp={handleEditorMouseUp}
                  style={{
                    fontFamily,
                    fontSize: `${fontSizePx}px`,
                    lineHeight,
                    columnCount: columns,
                    columnGap: '28px',
                    paddingBottom: '44px',
                    cursor: formatPainterStyle ? 'crosshair' : 'text',
                  }}
                  className={`flex-1 outline-none prose max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#185ABD] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-3 [&_table]:w-full [&_table]:border-collapse ${
                    trackChanges ? 'caret-rose-600' : ''
                  } ${showNonPrinting ? '[&_p]:after:content-["¶"] [&_p]:after:text-sky-400/60 [&_p]:after:ml-1' : ''}`}
                />
              </div>
            );
          })()}
        </div>

        {/* Right Comments Pane */}
        {showComments && (
          <div
            className={`w-64 shrink-0 border-l p-3 overflow-y-auto text-xs space-y-2.5 ${
              officeDark ? 'bg-[#1E1E1E] border-white/10 text-zinc-200' : 'bg-white border-[#D1D1D1] text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-[#185ABD]">
              <span>Примечания ({comments.length})</span>
              <button type="button" onClick={() => setShowComments(false)} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex gap-1">
              <input
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCommentText.trim()) {
                    onChangeComments([
                      { id: `c_${Date.now()}`, author: 'Вы', text: newCommentText.trim(), time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) },
                      ...comments,
                    ]);
                    setNewCommentText('');
                  }
                }}
                placeholder="Новое примечание..."
                className={`flex-1 px-2 py-1.5 rounded border text-xs outline-none ${officeDark ? 'bg-black/30 border-white/15' : 'bg-slate-50 border-zinc-300'}`}
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCommentText.trim()) return;
                  onChangeComments([
                    { id: `c_${Date.now()}`, author: 'Вы', text: newCommentText.trim(), time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) },
                    ...comments,
                  ]);
                  setNewCommentText('');
                }}
                className="px-2 rounded bg-[#185ABD] text-white font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            {comments.map((c) => (
              <div key={c.id} className={`p-2.5 rounded-lg border space-y-1 ${officeDark ? 'bg-white/5 border-white/10' : 'bg-[#EFF6FF] border-[#BFDBFE]'}`}>
                <div className="flex items-center justify-between text-[10px] opacity-75">
                  <span className="font-bold">{c.author}</span>
                  <span>{c.time}</span>
                </div>
                <div className={c.resolved ? 'line-through opacity-55' : ''}>{c.text}</div>
                <div className="flex gap-2 pt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => onChangeComments(comments.map((x) => (x.id === c.id ? { ...x, resolved: !x.resolved } : x)))}
                    className="text-[#185ABD] hover:underline cursor-pointer"
                  >
                    {c.resolved ? 'Открыть' : 'Решено'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeComments(comments.filter((x) => x.id !== c.id))}
                    className="text-rose-500 hover:underline cursor-pointer"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AUTHENTIC LUMA WORD BLUE STATUS BAR */}
      <div className="h-6 px-3 bg-[#185ABD] text-white text-[11px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span>Страниц: {stats.pages} (A4)</span>
          <span>Слов: {stats.words}</span>
          <span className="hidden sm:inline">Знаков: {stats.chars} ({stats.charsNoSpace} без проб.)</span>
          <span className="hidden md:inline">Ctrl+Enter — разрыв страницы</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setReadMode((v) => !v)} className="hover:underline cursor-pointer">
            {readMode ? 'Режим чтения' : 'Разметка страниц A4'}
          </button>
          <span>|</span>
          <input
            type="range"
            min={60}
            max={160}
            step={10}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-20 accent-white cursor-pointer"
          />
          <span className="font-mono w-9 text-right">{zoom}%</span>
        </div>
      </div>
    </div>
  );
};
