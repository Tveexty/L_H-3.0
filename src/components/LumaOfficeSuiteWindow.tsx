import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText, Table2, Presentation, FolderOpen, Download, Plus, Trash2, Copy,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Image as ImageIcon, Play, ChevronLeft, ChevronRight,
  BarChart3, Search, Undo2, Redo2, Square, Circle, Type, Maximize2, X,
  Sparkles, Check, AlertCircle, Columns, Rows, ArrowUpDown, FileSpreadsheet,
  Printer, SlidersHorizontal, ArrowUp, ArrowDown,
} from 'lucide-react';

export type OfficeAppMode = 'docs' | 'sheets' | 'slides';

export interface OfficeSlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'table';
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  bgColor?: string;
  imageSrc?: string;
  shape?: 'rect' | 'rounded' | 'circle';
  rows?: string[][];
}

export interface OfficeSlide {
  id: string;
  title: string;
  background: string;
  transition: 'fade' | 'slide' | 'zoom' | 'none';
  notes: string;
  elements: OfficeSlideElement[];
}

export interface CellMeta {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  bg?: string;
  color?: string;
  format?: 'text' | 'number' | 'currency' | 'percent';
}

export interface OfficeSheet {
  name: string;
  cells: Record<string, string>;
  styles?: Record<string, CellMeta>;
  rows: number;
  cols: number;
}

interface LumaOfficeSuiteWindowProps {
  isDark?: boolean;
  initialMode?: OfficeAppMode;
  onNotify?: (title: string, body: string, level?: 'info' | 'ok' | 'warn' | 'danger') => void;
}

const SLIDE_THEMES = [
  { name: 'Carbon Dark', bg: '#0f172a', text: '#f8fafc', accent: '#38bdf8' },
  { name: 'Midnight Violet', bg: '#1e1b4b', text: '#eef2ff', accent: '#a78bfa' },
  { name: 'Pure Paper', bg: '#ffffff', text: '#0f172a', accent: '#2563eb' },
  { name: 'Emerald Pitch', bg: '#064e3b', text: '#ecfdf5', accent: '#34d399' },
  { name: 'Obsidian Gold', bg: '#18181b', text: '#fafafa', accent: '#f59e0b' },
  { name: 'Crimson Studio', bg: '#450a0a', text: '#fff1f2', accent: '#fb7185' },
];

const DEFAULT_DOC_HTML = `<h1>Luma Docs · Новый документ</h1>
<p>Добро пожаловать в встроенный офисный пакет <strong>Luma Office Studio 1.5.1</strong>! Вы можете открывать реальные файлы <code>.docx</code>, <code>.odt</code>, <code>.rtf</code>, <code>.md</code>, <code>.html</code>, <code>.txt</code> и сохранять документы в любой формат.</p>
<h2>Ключевые возможности</h2>
<ul>
  <li>Полное форматирование текста, заголовки, таблицы и вставка изображений</li>
  <li>Экспорт в настоящий <strong>.docx</strong> (Word), <strong>.pdf</strong>, <strong>.html</strong>, <strong>.md</strong>, <strong>.rtf</strong> и <strong>.txt</strong></li>
  <li>Переключение на <strong>Luma Sheets (Excel)</strong> и <strong>Luma Slides (PowerPoint)</strong> в один клик</li>
</ul>`;

const DEFAULT_SHEETS: OfficeSheet[] = [
  {
    name: 'Бюджет 2026',
    rows: 26,
    cols: 10,
    cells: {
      A1: 'Категория', B1: 'План (₽)', C1: 'Факт (₽)', D1: 'Разница',
      A2: 'Оборудование', B2: '65000', C2: '58400', D2: '=B2-C2',
      A3: 'ПО и Облако', B3: '12000', C3: '9800', D3: '=B3-C3',
      A4: 'Дизайн и Медиа', B4: '24000', C4: '21500', D4: '=B4-C4',
      A5: 'Маркетинг', B5: '35000', C5: '31200', D5: '=B5-C5',
      A6: 'ИТОГО', B6: '=SUM(B2:B5)', C6: '=SUM(C2:C5)', D6: '=SUM(D2:D5)',
      A7: 'Среднее', B7: '=AVG(B2:B5)', C7: '=AVG(C2:C5)', D7: '=MAX(D2:D5)',
    },
    styles: {
      A1: { bold: true, bg: '#1e293b', color: '#38bdf8' },
      B1: { bold: true, bg: '#1e293b', color: '#38bdf8', align: 'right' },
      C1: { bold: true, bg: '#1e293b', color: '#38bdf8', align: 'right' },
      D1: { bold: true, bg: '#1e293b', color: '#38bdf8', align: 'right' },
      A6: { bold: true, bg: '#0f172a', color: '#34d399' },
      B6: { bold: true, bg: '#0f172a', color: '#34d399', align: 'right', format: 'currency' },
      C6: { bold: true, bg: '#0f172a', color: '#34d399', align: 'right', format: 'currency' },
      D6: { bold: true, bg: '#0f172a', color: '#34d399', align: 'right', format: 'currency' },
    },
  },
];

const DEFAULT_SLIDES: OfficeSlide[] = [
  {
    id: 'sl_intro_1',
    title: 'Luma OS 1.5.1 Carbon',
    background: '#0f172a',
    transition: 'fade',
    notes: 'Приветственный слайд презентации. Нажмите F5 для полноэкранного показа.',
    elements: [
      {
        id: 'el_t1', type: 'text', x: 8, y: 24, w: 84, h: 20,
        text: 'Luma Slides Studio', fontSize: 44, bold: true, align: 'center', color: '#ffffff',
      },
      {
        id: 'el_s1', type: 'text', x: 14, y: 48, w: 72, h: 16,
        text: 'Открывайте любые файлы PowerPoint (.pptx, .odp) без ошибок\nи сохраняйте презентации в .pptx, .pdf, .html или .png',
        fontSize: 20, align: 'center', color: '#94a3b8',
      },
      {
        id: 'el_b1', type: 'shape', shape: 'rounded', x: 35, y: 72, w: 30, h: 10,
        text: 'Luma Office 1.5.1', fontSize: 16, bold: true, align: 'center', color: '#082f49', bgColor: '#38bdf8',
      },
    ],
  },
  {
    id: 'sl_intro_2',
    title: 'Возможности редактора',
    background: '#1e1b4b',
    transition: 'slide',
    notes: 'Расскажите о поддержке изображений, таблиц и режима докладчика.',
    elements: [
      {
        id: 'el_t2', type: 'text', x: 8, y: 10, w: 84, h: 14,
        text: 'Полный контроль над слайдами', fontSize: 34, bold: true, align: 'left', color: '#eef2ff',
      },
      {
        id: 'el_b2', type: 'text', x: 8, y: 28, w: 84, h: 52,
        text: '• Свободное перемещение текста, фигур, изображений и таблиц\n• Реальный импорт .pptx со всеми встроенными картинками и заметками\n• Режим показа F5 с переходами и лазерной указкой\n• Сохранение обратно в настоящий Microsoft PowerPoint (.pptx)',
        fontSize: 20, align: 'left', color: '#cbd5e1',
      },
    ],
  },
];

// ==================== SPREADSHEET FORMULA ENGINE ====================

function colToLetter(c: number): string {
  let s = '';
  let n = c;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function parseRef(ref: string): [number, number] | null {
  const m = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
  if (!m) return null;
  let col = 0;
  for (const ch of m[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return [col - 1, parseInt(m[2], 10)];
}

function expandRange(a: string, b: string): string[] {
  const p1 = parseRef(a);
  const p2 = parseRef(b);
  if (!p1 || !p2) return [];
  const [c1, r1] = p1;
  const [c2, r2] = p2;
  const refs: string[] = [];
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
      refs.push(`${colToLetter(c)}${r}`);
    }
  }
  return refs;
}

function evalSheetCell(ref: string, cells: Record<string, string>, visited = new Set<string>()): string {
  const raw = cells[ref];
  if (raw === undefined || raw === null) return '';
  const trimmed = String(raw).trim();
  if (!trimmed.startsWith('=')) return trimmed;
  if (visited.has(ref)) return '#CYCLE!';
  visited.add(ref);

  const getNum = (r: string): number => {
    const v = evalSheetCell(r.toUpperCase(), cells, new Set(visited));
    const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  try {
    let expr = trimmed.slice(1).trim();

    // Handle CONCAT(A1, " ", B1)
    const concatM = /^CONCAT\((.*)\)$/i.exec(expr);
    if (concatM) {
      return concatM[1]
        .split(',')
        .map((part) => {
          const p = part.trim();
          if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) return p.slice(1, -1);
          if (/^[A-Z]+\d+$/i.test(p)) return evalSheetCell(p.toUpperCase(), cells, new Set(visited));
          return p;
        })
        .join('');
    }

    // Handle IF(cond, trueVal, falseVal)
    const ifM = /^IF\(([^,]+),([^,]+),([^)]+)\)$/i.exec(expr);
    if (ifM) {
      const condRaw = ifM[1].replace(/\b([A-Z]+\d+)\b/gi, (_, r) => String(getNum(r)));
      // Safe simple comparison check
      const cmp = /^(-?\d+(?:\.\d+)?)\s*(>=|<=|!=|==|=|>|<)\s*(-?\d+(?:\.\d+)?)$/.exec(condRaw.trim());
      if (cmp) {
        const l = parseFloat(cmp[1]);
        const r = parseFloat(cmp[3]);
        const op = cmp[2];
        const ok = op === '>' ? l > r : op === '<' ? l < r : op === '>=' ? l >= r : op === '<=' ? l <= r : op === '!=' ? l !== r : l === r;
        const branch = (ok ? ifM[2] : ifM[3]).trim();
        if ((branch.startsWith('"') && branch.endsWith('"')) || (branch.startsWith("'") && branch.endsWith("'"))) return branch.slice(1, -1);
        return evalSheetCell('__TMP__', { ...cells, __TMP__: '=' + branch }, new Set(visited));
      }
    }

    // Replace aggregate functions SUM, AVG, AVERAGE, MIN, MAX, COUNT, ROUND, ABS, SQRT
    expr = expr.replace(/\b(SUM|AVG|AVERAGE|MIN|MAX|COUNT)\(([^)]+)\)/gi, (_m, fnRaw, argsStr) => {
      const fn = String(fnRaw).toUpperCase();
      const vals: number[] = [];
      for (const token of String(argsStr).split(/[;,]/)) {
        const t = token.trim();
        if (t.includes(':')) {
          const [s, e] = t.split(':');
          for (const cr of expandRange(s, e)) {
            const rawVal = evalSheetCell(cr, cells, new Set(visited));
            const num = parseFloat(rawVal.replace(/\s/g, '').replace(',', '.'));
            if (Number.isFinite(num)) vals.push(num);
          }
        } else if (/^[A-Z]+\d+$/i.test(t)) {
          const rawVal = evalSheetCell(t.toUpperCase(), cells, new Set(visited));
          const num = parseFloat(rawVal.replace(/\s/g, '').replace(',', '.'));
          if (Number.isFinite(num)) vals.push(num);
        } else {
          const num = parseFloat(t.replace(',', '.'));
          if (Number.isFinite(num)) vals.push(num);
        }
      }
      if (fn === 'COUNT') return String(vals.length);
      if (vals.length === 0) return '0';
      if (fn === 'SUM') return String(vals.reduce((a, b) => a + b, 0));
      if (fn === 'AVG' || fn === 'AVERAGE') return String(vals.reduce((a, b) => a + b, 0) / vals.length);
      if (fn === 'MIN') return String(Math.min(...vals));
      if (fn === 'MAX') return String(Math.max(...vals));
      return '0';
    });

    expr = expr.replace(/\bROUND\(([^,]+),([^)]+)\)/gi, (_, a, b) => {
      const va = parseFloat(a.replace(/\b([A-Z]+\d+)\b/gi, (r: string) => String(getNum(r))));
      const vb = parseInt(b, 10) || 0;
      return Number.isFinite(va) ? va.toFixed(Math.max(0, Math.min(8, vb))) : '0';
    });
    expr = expr.replace(/\bABS\(([^)]+)\)/gi, (_, a) => String(Math.abs(parseFloat(a.replace(/\b([A-Z]+\d+)\b/gi, (r: string) => String(getNum(r)))) || 0)));
    expr = expr.replace(/\bSQRT\(([^)]+)\)/gi, (_, a) => String(Math.sqrt(Math.max(0, parseFloat(a.replace(/\b([A-Z]+\d+)\b/gi, (r: string) => String(getNum(r)))) || 0))));

    // Substitute remaining cell references
    expr = expr.replace(/\b([A-Z]+\d+)\b/gi, (_, r) => String(getNum(r)));
    expr = expr.replace(/\^/g, '**');

    // Only evaluate safe arithmetic expression characters
    if (!/^[\d+\-*/().\s*]+$/.test(expr)) return '#ERR!';
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${expr});`)();
    if (typeof val === 'number' && Number.isFinite(val)) {
      return Number.isInteger(val) ? String(val) : String(Math.round(val * 10000) / 10000);
    }
    return '#ERR!';
  } catch {
    return '#ERR!';
  }
}

function formatCellDisplay(val: string, meta?: CellMeta): string {
  if (!val) return '';
  const n = parseFloat(val);
  if (!Number.isFinite(n)) return val;
  if (meta?.format === 'currency') return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
  if (meta?.format === 'percent') return `${(n * 100).toFixed(1)}%`;
  if (meta?.format === 'number') return n.toLocaleString('ru-RU', { maximumFractionDigits: 4 });
  return val;
}

function downloadBase64File(fileName: string, mimeType: string, b64: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const LumaOfficeSuiteWindow: React.FC<LumaOfficeSuiteWindowProps> = ({ initialMode = 'slides', onNotify }) => {
  const [mode, setMode] = useState<OfficeAppMode>(initialMode);
  const [docTitle, setDocTitle] = useState('Мой проект Luma');
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // DOCS STATE
  const [docHtml, setDocHtml] = useState<string>(DEFAULT_DOC_HTML);
  const [docDarkPaper, setDocDarkPaper] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const docEditorRef = useRef<HTMLDivElement>(null);

  // SHEETS STATE
  const [sheets, setSheets] = useState<OfficeSheet[]>(DEFAULT_SHEETS);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [selectedCell, setSelectedCell] = useState('B6');
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  // SLIDES STATE
  const [slides, setSlides] = useState<OfficeSlide[]>(DEFAULT_SLIDES);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedElId, setSelectedElId] = useState<string | null>(DEFAULT_SLIDES[0]?.elements[0]?.id ?? null);
  const [presenting, setPresenting] = useState(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<{ id: string; mode: 'move' | 'resize'; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number } | null>(null);
  const slideStageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slideImageInputRef = useRef<HTMLInputElement>(null);
  const docImageInputRef = useRef<HTMLInputElement>(null);

  const activeSheet = sheets[activeSheetIdx] || sheets[0];
  const activeSlide = slides[activeSlideIdx] || slides[0];
  const selectedEl = activeSlide?.elements.find((e) => e.id === selectedElId) || null;

  // Sync docHtml into contentEditable only when changed programmatically (import / new doc)
  const docHydrateKey = useRef(0);
  useEffect(() => {
    if (mode === 'docs' && docEditorRef.current && docEditorRef.current.innerHTML !== docHtml) {
      docEditorRef.current.innerHTML = docHtml;
    }
  }, [mode, docHydrateKey.current]);

  // F5 Presentation keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (presenting) {
        if (e.key === 'Escape') {
          setPresenting(false);
        } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') {
          e.preventDefault();
          setActiveSlideIdx((i) => Math.min(slides.length - 1, i + 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          setActiveSlideIdx((i) => Math.max(0, i - 1));
        }
      } else if (mode === 'slides' && e.key === 'F5') {
        e.preventDefault();
        setPresenting(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, mode, slides.length]);

  // Drag/resize slide elements smoothly
  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => {
      const box = slideStageRef.current?.getBoundingClientRect();
      if (!box) return;
      const dxPct = ((e.clientX - dragState.startX) / box.width) * 100;
      const dyPct = ((e.clientY - dragState.startY) / box.height) * 100;
      setSlides((prev) =>
        prev.map((sl, si) =>
          si !== activeSlideIdx
            ? sl
            : {
                ...sl,
                elements: sl.elements.map((el) => {
                  if (el.id !== dragState.id) return el;
                  if (dragState.mode === 'move') {
                    return {
                      ...el,
                      x: Math.max(0, Math.min(96 - el.w, Math.round((dragState.origX + dxPct) * 10) / 10)),
                      y: Math.max(0, Math.min(96 - el.h, Math.round((dragState.origY + dyPct) * 10) / 10)),
                    };
                  }
                  return {
                    ...el,
                    w: Math.max(8, Math.min(100 - el.x, Math.round((dragState.origW + dxPct) * 10) / 10)),
                    h: Math.max(6, Math.min(100 - el.y, Math.round((dragState.origH + dyPct) * 10) / 10)),
                  };
                }),
              }
        )
      );
    };
    const onUp = () => setDragState(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragState, activeSlideIdx]);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg((cur) => (cur === msg ? null : cur)), 4200);
  };

  // ==================== UNIVERSAL OPEN FILE (.pptx, .docx, .xlsx, .odp, .csv, .md, .html, .rtf, .txt, .json) ====================
  const handleImportFile = async (file: File) => {
    setBusy(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/kernel/office/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: file.name, base64_data: b64 }),
      });
      const data = await res.json();
      if (!data.ok) {
        showStatus(`Ошибка открытия: ${data.error || 'неизвестный формат'}`);
        onNotify?.('Luma Office Studio', data.error || 'Не удалось открыть файл', 'danger');
        return;
      }
      setDocTitle(data.title || file.name);
      if (data.kind === 'slides' && Array.isArray(data.slides) && data.slides.length > 0) {
        setSlides(data.slides);
        setActiveSlideIdx(0);
        setSelectedElId(data.slides[0]?.elements?.[0]?.id ?? null);
        setMode('slides');
        showStatus(`Открыта презентация «${file.name}» (${data.slides.length} сл.)`);
      } else if (data.kind === 'sheets' && Array.isArray(data.sheets) && data.sheets.length > 0) {
        setSheets(data.sheets);
        setActiveSheetIdx(0);
        setSelectedCell('A1');
        setMode('sheets');
        showStatus(`Открыта таблица «${file.name}» (${data.sheets.length} лист.)`);
      } else {
        const htmlContent = data.doc_html || '<p></p>';
        setDocHtml(htmlContent);
        docHydrateKey.current += 1;
        setMode('docs');
        setTimeout(() => {
          if (docEditorRef.current) docEditorRef.current.innerHTML = htmlContent;
        }, 30);
        showStatus(`Открыт документ «${file.name}»`);
      }
      onNotify?.('Luma Office Studio', `Файл «${file.name}» успешно открыт без ошибок`, 'ok');
    } catch (err: any) {
      showStatus(`Ошибка импорта: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  // ==================== UNIVERSAL EXPORT (ANY FORMAT) ====================
  const handleExport = async (format: string) => {
    setExportMenuOpen(false);
    if (format === 'pdf') {
      // High-fidelity printable PDF window
      const w = window.open('', '_blank', 'width=960,height=720');
      if (!w) {
        showStatus('Разрешите всплывающие окна для печати PDF');
        return;
      }
      const res = await fetch('/api/kernel/office/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: mode,
          format: 'html',
          file_name: docTitle,
          title: docTitle,
          doc_html: docEditorRef.current?.innerHTML || docHtml,
          sheets,
          slides,
        }),
      });
      const data = await res.json();
      if (data.ok && data.base64_data) {
        const htmlStr = decodeURIComponent(escape(atob(data.base64_data)));
        w.document.open();
        w.document.write(htmlStr);
        w.document.close();
        setTimeout(() => w.print(), 350);
        showStatus('Открыт диалог сохранения в PDF');
      }
      return;
    }

    if (format === 'png' && mode === 'slides' && activeSlide) {
      // Render active slide to crisp 1920x1080 PNG on canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = activeSlide.background || '#0f172a';
        ctx.fillRect(0, 0, 1920, 1080);
        for (const el of activeSlide.elements) {
          const x = (el.x / 100) * 1920;
          const y = (el.y / 100) * 1080;
          const w = (el.w / 100) * 1920;
          const h = (el.h / 100) * 1080;
          if (el.bgColor) {
            ctx.fillStyle = el.bgColor;
            ctx.fillRect(x, y, w, h);
          }
          if (el.text) {
            ctx.fillStyle = el.color || '#ffffff';
            const fs = Math.round((el.fontSize || 24) * 1.9);
            ctx.font = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${fs}px system-ui, sans-serif`;
            ctx.textAlign = el.align === 'center' ? 'center' : el.align === 'right' ? 'right' : 'left';
            const tx = el.align === 'center' ? x + w / 2 : el.align === 'right' ? x + w - 12 : x + 12;
            el.text.split('\n').forEach((ln, li) => ctx.fillText(ln, tx, y + fs + li * (fs * 1.3)));
          }
        }
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${docTitle}_slide_${activeSlideIdx + 1}.png`;
        a.click();
        showStatus(`Слайд ${activeSlideIdx + 1} сохранён как FullHD PNG`);
      }
      return;
    }

    setBusy(true);
    try {
      const currentHtml = mode === 'docs' && docEditorRef.current ? docEditorRef.current.innerHTML : docHtml;
      const currentText = mode === 'docs' && docEditorRef.current ? docEditorRef.current.innerText : '';
      const res = await fetch('/api/kernel/office/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: mode,
          format,
          file_name: docTitle,
          title: docTitle,
          doc_html: currentHtml,
          doc_text: currentText,
          sheets,
          slides,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        showStatus(`Ошибка экспорта: ${data.error}`);
        return;
      }
      downloadBase64File(data.file_name, data.mime_type, data.base64_data);
      showStatus(`Сохранено: ${data.file_name} (${(data.size_bytes / 1024).toFixed(1)} КБ)`);
      onNotify?.('Luma Office Studio', `Документ сохранён в формате .${format.toUpperCase()}`, 'ok');
    } catch (err: any) {
      showStatus(`Ошибка экспорта: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  // ==================== DOCS HELPERS ====================
  const execDocCmd = (cmd: string, val?: string) => {
    docEditorRef.current?.focus();
    document.execCommand(cmd, false, val);
    if (docEditorRef.current) setDocHtml(docEditorRef.current.innerHTML);
  };

  const insertDocTable = () => {
    const tbl = `<table style="border-collapse:collapse;width:100%;margin:12px 0;"><tr><th style="border:1px solid #94a3b8;padding:6px;background:rgba(56,189,248,.12)">Столбец 1</th><th style="border:1px solid #94a3b8;padding:6px;background:rgba(56,189,248,.12)">Столбец 2</th><th style="border:1px solid #94a3b8;padding:6px;background:rgba(56,189,248,.12)">Столбец 3</th></tr><tr><td style="border:1px solid #94a3b8;padding:6px">Данные 1</td><td style="border:1px solid #94a3b8;padding:6px">Данные 2</td><td style="border:1px solid #94a3b8;padding:6px">Данные 3</td></tr></table><p><br/></p>`;
    execDocCmd('insertHTML', tbl);
  };

  const docStats = useMemo(() => {
    const plain = docHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = plain ? plain.split(' ').length : 0;
    return { words, chars: plain.length, readMin: Math.max(1, Math.ceil(words / 180)) };
  }, [docHtml]);

  // ==================== SHEETS HELPERS ====================
  const updateSheetCell = (ref: string, val: string) => {
    setSheets((prev) =>
      prev.map((sh, i) => (i !== activeSheetIdx ? sh : { ...sh, cells: { ...sh.cells, [ref]: val } }))
    );
  };

  const updateCellStyle = (patch: Partial<CellMeta>) => {
    setSheets((prev) =>
      prev.map((sh, i) => {
        if (i !== activeSheetIdx) return sh;
        const cur = sh.styles?.[selectedCell] || {};
        return { ...sh, styles: { ...(sh.styles || {}), [selectedCell]: { ...cur, ...patch } } };
      })
    );
  };

  const sortActiveColumn = (asc: boolean) => {
    const parsed = parseRef(selectedCell);
    if (!parsed) return;
    const [colIdx] = parsed;
    const colLetter = colToLetter(colIdx);
    const rowData: { row: number; vals: string[] }[] = [];
    for (let r = 2; r <= activeSheet.rows; r++) {
      const vals: string[] = [];
      let nonEmptyRow = false;
      for (let c = 0; c < activeSheet.cols; c++) {
        const v = activeSheet.cells[`${colToLetter(c)}${r}`] || '';
        if (v) nonEmptyRow = true;
        vals.push(v);
      }
      if (nonEmptyRow) rowData.push({ row: r, vals });
    }
    rowData.sort((a, b) => {
      const va = evalSheetCell(`${colLetter}${a.row}`, activeSheet.cells);
      const vb = evalSheetCell(`${colLetter}${b.row}`, activeSheet.cells);
      const na = parseFloat(va);
      const nb = parseFloat(vb);
      if (Number.isFinite(na) && Number.isFinite(nb)) return asc ? na - nb : nb - na;
      return asc ? va.localeCompare(vb, 'ru') : vb.localeCompare(va, 'ru');
    });
    const nextCells: Record<string, string> = {};
    for (let c = 0; c < activeSheet.cols; c++) {
      const h = activeSheet.cells[`${colToLetter(c)}1`];
      if (h) nextCells[`${colToLetter(c)}1`] = h;
    }
    rowData.forEach((rd, idx) => {
      rd.vals.forEach((v, c) => {
        if (v) nextCells[`${colToLetter(c)}${idx + 2}`] = v;
      });
    });
    setSheets((prev) => prev.map((sh, i) => (i !== activeSheetIdx ? sh : { ...sh, cells: nextCells })));
    showStatus(`Столбец ${colLetter} отсортирован (${asc ? 'А→Я' : 'Я→А'})`);
  };

  const chartSeries = useMemo(() => {
    if (!activeSheet) return [];
    const out: { label: string; value: number }[] = [];
    for (let r = 2; r <= Math.min(activeSheet.rows, 20); r++) {
      const label = evalSheetCell(`A${r}`, activeSheet.cells);
      const valStr = evalSheetCell(`B${r}`, activeSheet.cells);
      const num = parseFloat(valStr.replace(/\s/g, '').replace(',', '.'));
      if (label && Number.isFinite(num) && !label.toLowerCase().includes('итого')) {
        out.push({ label, value: Math.abs(num) });
      }
    }
    return out;
  }, [activeSheet]);

  // ==================== SLIDES HELPERS ====================
  const updateActiveSlide = (patch: Partial<OfficeSlide>) => {
    setSlides((prev) => prev.map((sl, i) => (i !== activeSlideIdx ? sl : { ...sl, ...patch })));
  };

  const updateSelectedEl = (patch: Partial<OfficeSlideElement>) => {
    if (!selectedElId) return;
    setSlides((prev) =>
      prev.map((sl, i) =>
        i !== activeSlideIdx
          ? sl
          : { ...sl, elements: sl.elements.map((el) => (el.id === selectedElId ? { ...el, ...patch } : el)) }
      )
    );
  };

  const addSlideElement = (kind: 'text' | 'rect' | 'circle' | 'table') => {
    const id = `el_${Date.now()}`;
    let el: OfficeSlideElement;
    if (kind === 'table') {
      el = {
        id, type: 'table', x: 12, y: 30, w: 76, h: 42,
        rows: [['Показатель', '2025', '2026'], ['Рост', '+34%', '+68%'], ['Пользователи', '12 400', '48 900']],
      };
    } else if (kind === 'rect' || kind === 'circle') {
      el = {
        id, type: 'shape', shape: kind === 'circle' ? 'circle' : 'rounded',
        x: 34, y: 34, w: 30, h: 24, text: 'Блок', fontSize: 20, bold: true, align: 'center', color: '#ffffff', bgColor: '#2563eb',
      };
    } else {
      el = {
        id, type: 'text', x: 14, y: 38, w: 72, h: 18,
        text: 'Новый текстовый блок', fontSize: 26, bold: false, align: 'left', color: '#f8fafc',
      };
    }
    updateActiveSlide({ elements: [...activeSlide.elements, el] });
    setSelectedElId(id);
  };

  const handleSlideImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const id = `el_img_${Date.now()}`;
      updateActiveSlide({
        elements: [
          ...activeSlide.elements,
          { id, type: 'image', x: 22, y: 20, w: 54, h: 56, imageSrc: String(reader.result || '') },
        ],
      });
      setSelectedElId(id);
    };
    reader.readAsDataURL(file);
  };

  const addNewSlide = () => {
    const next: OfficeSlide = {
      id: `sl_${Date.now()}`,
      title: `Слайд ${slides.length + 1}`,
      background: activeSlide?.background || '#0f172a',
      transition: 'fade',
      notes: '',
      elements: [
        {
          id: `el_${Date.now()}_t`, type: 'text', x: 8, y: 12, w: 84, h: 16,
          text: `Заголовок слайда ${slides.length + 1}`, fontSize: 34, bold: true, align: 'left',
          color: activeSlide?.background === '#ffffff' ? '#0f172a' : '#f8fafc',
        },
        {
          id: `el_${Date.now()}_b`, type: 'text', x: 8, y: 32, w: 84, h: 48,
          text: '• Ключевой тезис 1\n• Ключевой тезис 2\n• Ключевой тезис 3',
          fontSize: 20, align: 'left', color: activeSlide?.background === '#ffffff' ? '#334155' : '#cbd5e1',
        },
      ],
    };
    setSlides((prev) => [...prev, next]);
    setActiveSlideIdx(slides.length);
    setSelectedElId(next.elements[0].id);
  };

  const exportFormats = mode === 'slides'
    ? [
        { fmt: 'pptx', label: 'PowerPoint (.pptx)', desc: 'Настоящий OOXML для PowerPoint / Keynote' },
        { fmt: 'pdf', label: 'PDF Документ (.pdf)', desc: 'Печать и отправка без искажений' },
        { fmt: 'png', label: 'Слайд в 1080p (.png)', desc: 'Картинка текущего слайда FullHD' },
        { fmt: 'html', label: 'Веб-презентация (.html)', desc: 'Открывается в любом браузере' },
        { fmt: 'md', label: 'Конспект (.md)', desc: 'Текст всех слайдов в Markdown' },
        { fmt: 'json', label: 'Проект Luma (.json)', desc: 'Полный резервный файл' },
      ]
    : mode === 'sheets'
      ? [
          { fmt: 'xlsx', label: 'Excel Книга (.xlsx)', desc: 'Все листы и формулы OOXML' },
          { fmt: 'csv', label: 'Таблица CSV (.csv)', desc: 'UTF-8 BOM для Excel и баз данных' },
          { fmt: 'tsv', label: 'Таблица TSV (.tsv)', desc: 'С разделителем табуляции' },
          { fmt: 'pdf', label: 'PDF Таблица (.pdf)', desc: 'Печать и экспорт отчёта' },
          { fmt: 'html', label: 'Веб-таблица (.html)', desc: 'Автономная HTML-страница' },
          { fmt: 'json', label: 'Проект Luma (.json)', desc: 'Полный резервный файл' },
        ]
      : [
          { fmt: 'docx', label: 'Microsoft Word (.docx)', desc: 'Настоящий OOXML документ' },
          { fmt: 'pdf', label: 'PDF Документ (.pdf)', desc: 'Готов к печати и отправке' },
          { fmt: 'html', label: 'Веб-документ (.html)', desc: 'Полное сохранение стилей' },
          { fmt: 'md', label: 'Markdown (.md)', desc: 'Для GitHub и документации' },
          { fmt: 'rtf', label: 'Rich Text (.rtf)', desc: 'Универсальный формат WordPad' },
          { fmt: 'txt', label: 'Обычный текст (.txt)', desc: 'Чистый текст UTF-8' },
        ];

  return (
    <div
      className="h-full flex flex-col bg-[#0b0e14] text-zinc-100 select-none relative overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleImportFile(f);
      }}
    >
      {/* Hidden universal file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pptx,.ppsx,.odp,.ppt,.docx,.odt,.doc,.rtf,.md,.html,.htm,.txt,.xlsx,.ods,.xls,.csv,.tsv,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportFile(f);
          e.target.value = '';
        }}
      />
      <input
        ref={slideImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSlideImageUpload(f);
          e.target.value = '';
        }}
      />
      <input
        ref={docImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => execDocCmd('insertHTML', `<img src="${r.result}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`);
          r.readAsDataURL(f);
          e.target.value = '';
        }}
      />

      {/* Drag & Drop Overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-sky-500/20 backdrop-blur-md border-2 border-dashed border-sky-400 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <FolderOpen className="w-12 h-12 text-sky-300" />
          <div className="text-lg font-bold text-white">Отпустите файл, чтобы открыть в Luma Office Studio</div>
          <div className="text-xs text-sky-200">.pptx · .docx · .xlsx · .odp · .odt · .ods · .csv · .md · .rtf · .html · .txt · .json</div>
        </div>
      )}

      {/* TOP SUITE RIBBON */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-950/95 border-b border-white/10 shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMode('docs')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'docs' ? 'bg-blue-500/25 text-blue-300 border border-blue-400/40' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Docs <span className="text-[9px] opacity-70 hidden sm:inline">Word</span>
          </button>
          <button
            onClick={() => setMode('sheets')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'sheets' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" /> Sheets <span className="text-[9px] opacity-70 hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => setMode('slides')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'slides' ? 'bg-orange-500/25 text-orange-300 border border-orange-400/40' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Presentation className="w-3.5 h-3.5" /> Slides <span className="text-[9px] opacity-70 hidden sm:inline">PowerPoint</span>
          </button>
        </div>

        <input
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white w-44 sm:w-56 focus:outline-none focus:border-sky-400/50"
          placeholder="Название документа..."
        />

        <div className="flex items-center gap-1.5 relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            title="Открыть .pptx, .docx, .xlsx, .csv, .md, .rtf, .html, .txt"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" /> Открыть файл
          </button>

          {mode === 'slides' && (
            <button
              onClick={() => setPresenting(true)}
              className="px-2.5 py-1.5 rounded-lg bg-orange-500/25 hover:bg-orange-500/35 border border-orange-400/40 text-orange-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Полноэкранный показ презентации (F5)"
            >
              <Play className="w-3.5 h-3.5" /> Показ (F5)
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setExportMenuOpen((v) => !v)}
              disabled={busy}
              className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Сохранить как ▾
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-zinc-900 border border-white/15 shadow-2xl p-1.5 z-50">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Экспорт в любой формат</div>
                {exportFormats.map((ef) => (
                  <button
                    key={ef.fmt}
                    onClick={() => handleExport(ef.fmt)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-white">{ef.label}</div>
                    <div className="text-[10px] text-zinc-400">{ef.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATUS BANNER */}
      {statusMsg && (
        <div className="px-3 py-1 bg-sky-500/15 border-b border-sky-400/25 text-[11px] text-sky-200 flex items-center gap-2 shrink-0">
          <Check className="w-3.5 h-3.5 text-sky-400" /> {statusMsg}
        </div>
      )}

      {/* ==================== MODE 1: LUMA DOCS (WORD ANALOG) ==================== */}
      {mode === 'docs' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-3 py-1.5 bg-zinc-900/90 border-b border-white/10 flex items-center gap-1 flex-wrap shrink-0">
            <button onClick={() => execDocCmd('undo')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer" title="Отменить"><Undo2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => execDocCmd('redo')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer" title="Повторить"><Redo2 className="w-3.5 h-3.5" /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <select
              onChange={(e) => execDocCmd('formatBlock', e.target.value)}
              defaultValue="P"
              className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-zinc-200"
            >
              <option value="P" className="bg-zinc-900">Обычный</option>
              <option value="H1" className="bg-zinc-900">Заголовок 1</option>
              <option value="H2" className="bg-zinc-900">Заголовок 2</option>
              <option value="H3" className="bg-zinc-900">Заголовок 3</option>
            </select>
            <select
              onChange={(e) => execDocCmd('fontName', e.target.value)}
              defaultValue="Segoe UI"
              className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-zinc-200"
            >
              <option value="Segoe UI" className="bg-zinc-900">Segoe UI</option>
              <option value="Georgia" className="bg-zinc-900">Georgia</option>
              <option value="Times New Roman" className="bg-zinc-900">Times New Roman</option>
              <option value="Consolas" className="bg-zinc-900">Consolas</option>
            </select>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={() => execDocCmd('bold')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer" title="Жирный"><Bold className="w-3.5 h-3.5" /></button>
            <button onClick={() => execDocCmd('italic')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer" title="Курсив"><Italic className="w-3.5 h-3.5" /></button>
            <button onClick={() => execDocCmd('underline')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer" title="Подчёркнутый"><Underline className="w-3.5 h-3.5" /></button>
            <button onClick={() => execDocCmd('strikeThrough')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer" title="Зачёркнутый"><Strikethrough className="w-3.5 h-3.5" /></button>
            <label className="px-1.5 py-1 rounded hover:bg-white/10 cursor-pointer text-[10px] flex items-center gap-1" title="Цвет текста">
              A
              <input type="color" defaultValue="#2563eb" onChange={(e) => execDocCmd('foreColor', e.target.value)} className="w-3.5 h-3.5 bg-transparent border-0 cursor-pointer" />
            </label>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={() => execDocCmd('justifyLeft')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer"><AlignLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => execDocCmd('justifyCenter')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer"><AlignCenter className="w-3.5 h-3.5" /></button>
            <button onClick={() => execDocCmd('justifyRight')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer"><AlignRight className="w-3.5 h-3.5" /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={() => execDocCmd('insertUnorderedList')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer" title="Маркированный список"><List className="w-3.5 h-3.5" /></button>
            <button onClick={() => execDocCmd('insertOrderedList')} className="p-1.5 rounded hover:bg-white/10 cursor-pointer" title="Нумерованный список"><ListOrdered className="w-3.5 h-3.5" /></button>
            <button onClick={insertDocTable} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] flex items-center gap-1 cursor-pointer"><Table2 className="w-3.5 h-3.5 text-sky-400" /> Таблица</button>
            <button onClick={() => docImageInputRef.current?.click()} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] flex items-center gap-1 cursor-pointer"><ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> Фото</button>
            <button onClick={() => setFindOpen((v) => !v)} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] flex items-center gap-1 cursor-pointer"><Search className="w-3.5 h-3.5" /> Найти</button>
            <button onClick={() => setDocDarkPaper((v) => !v)} className="ml-auto px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] cursor-pointer">
              {docDarkPaper ? '☀ Светлый лист' : '🌙 Тёмный лист'}
            </button>
          </div>

          {findOpen && (
            <div className="px-3 py-1.5 bg-zinc-900 border-b border-white/10 flex items-center gap-2 text-xs shrink-0">
              <input value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="Найти..." className="px-2 py-1 rounded bg-zinc-950 border border-white/10 text-white w-40" />
              <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Заменить на..." className="px-2 py-1 rounded bg-zinc-950 border border-white/10 text-white w-40" />
              <button
                onClick={() => {
                  if (!findText || !docEditorRef.current) return;
                  const next = docEditorRef.current.innerHTML.split(findText).join(replaceText);
                  docEditorRef.current.innerHTML = next;
                  setDocHtml(next);
                  showStatus(`Заменено «${findText}» → «${replaceText}»`);
                }}
                className="px-2.5 py-1 rounded bg-sky-500 text-zinc-950 font-semibold cursor-pointer"
              >
                Заменить всё
              </button>
              <button onClick={() => setFindOpen(false)} className="p-1 text-zinc-400 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/70 flex justify-center">
            <div
              ref={docEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setDocHtml((e.target as HTMLDivElement).innerHTML)}
              className={`w-full max-w-[780px] min-h-[820px] rounded-xl shadow-2xl p-10 focus:outline-none select-text prose prose-sm max-w-none leading-relaxed ${
                docDarkPaper
                  ? 'bg-zinc-900 text-zinc-100 border border-white/10'
                  : 'bg-white text-slate-900 border border-slate-200'
              }`}
              style={{ fontFamily: 'Segoe UI, system-ui, sans-serif' }}
            />
          </div>

          <div className="px-3 py-1 bg-zinc-950 border-t border-white/10 text-[10px] text-zinc-400 flex items-center justify-between shrink-0">
            <span>Слов: <strong className="text-zinc-200">{docStats.words}</strong> · Символов: <strong className="text-zinc-200">{docStats.chars}</strong> · Чтение ~{docStats.readMin} мин</span>
            <span>Luma Docs · Совместимо с Microsoft Word (.docx)</span>
          </div>
        </div>
      )}

      {/* ==================== MODE 2: LUMA SHEETS (EXCEL ANALOG) ==================== */}
      {mode === 'sheets' && activeSheet && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sheets Toolbar */}
          <div className="px-3 py-1.5 bg-zinc-900/90 border-b border-white/10 flex items-center gap-1.5 flex-wrap shrink-0">
            <span className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-mono text-xs font-bold min-w-[44px] text-center">
              {selectedCell}
            </span>
            <span className="text-xs font-mono text-zinc-500">fx</span>
            <input
              value={activeSheet.cells[selectedCell] ?? ''}
              onChange={(e) => updateSheetCell(selectedCell, e.target.value)}
              placeholder="Значение или формула: =SUM(B2:B5), =AVG(C2:C5), =IF(B2>100, 1, 0)"
              className="flex-1 min-w-[200px] px-2.5 py-1 rounded bg-zinc-950 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-400/50"
            />
            <button onClick={() => updateCellStyle({ bold: !activeSheet.styles?.[selectedCell]?.bold })} className={`p-1.5 rounded cursor-pointer ${activeSheet.styles?.[selectedCell]?.bold ? 'bg-emerald-500/30 text-emerald-200' : 'hover:bg-white/10'}`} title="Жирный"><Bold className="w-3.5 h-3.5" /></button>
            <button onClick={() => updateCellStyle({ italic: !activeSheet.styles?.[selectedCell]?.italic })} className={`p-1.5 rounded cursor-pointer ${activeSheet.styles?.[selectedCell]?.italic ? 'bg-emerald-500/30 text-emerald-200' : 'hover:bg-white/10'}`} title="Курсив"><Italic className="w-3.5 h-3.5" /></button>
            <select
              value={activeSheet.styles?.[selectedCell]?.format || 'text'}
              onChange={(e) => updateCellStyle({ format: e.target.value as any })}
              className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[11px]"
            >
              <option value="text" className="bg-zinc-900">Общий</option>
              <option value="number" className="bg-zinc-900">Число</option>
              <option value="currency" className="bg-zinc-900">Валюта ₽</option>
              <option value="percent" className="bg-zinc-900">Процент %</option>
            </select>
            <button onClick={() => sortActiveColumn(true)} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] flex items-center gap-1 cursor-pointer" title="Сортировать столбец"><ArrowUpDown className="w-3.5 h-3.5" /> А→Я</button>
            <button
              onClick={() => setSheets((prev) => prev.map((sh, i) => (i !== activeSheetIdx ? sh : { ...sh, rows: Math.min(200, sh.rows + 10) })))}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Rows className="w-3.5 h-3.5" /> +10 строк
            </button>
            <button
              onClick={() => setSheets((prev) => prev.map((sh, i) => (i !== activeSheetIdx ? sh : { ...sh, cols: Math.min(26, sh.cols + 2) })))}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Columns className="w-3.5 h-3.5" /> +2 столб.
            </button>
            <button
              onClick={() => setShowChart((v) => !v)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${showChart ? 'bg-emerald-500 text-zinc-950' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'}`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Диаграмма
            </button>
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Grid */}
            <div className="flex-1 overflow-auto">
              <table className="border-collapse text-xs w-max min-w-full">
                <thead className="sticky top-0 z-10 bg-zinc-900">
                  <tr>
                    <th className="w-10 border border-white/10 bg-zinc-950 text-[10px] text-zinc-500 font-mono">#</th>
                    {Array.from({ length: activeSheet.cols }).map((_, ci) => (
                      <th key={ci} className="min-w-[110px] border border-white/10 px-2 py-1 text-[10px] font-mono text-zinc-400 font-semibold">
                        {colToLetter(ci)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: activeSheet.rows }).map((_, ri) => {
                    const rowNum = ri + 1;
                    return (
                      <tr key={rowNum}>
                        <td className="border border-white/10 bg-zinc-950/90 text-center text-[10px] font-mono text-zinc-500 sticky left-0">
                          {rowNum}
                        </td>
                        {Array.from({ length: activeSheet.cols }).map((_, ci) => {
                          const ref = `${colToLetter(ci)}${rowNum}`;
                          const isSel = selectedCell === ref;
                          const meta = activeSheet.styles?.[ref];
                          const rawVal = activeSheet.cells[ref] ?? '';
                          const computed = isSel ? rawVal : formatCellDisplay(evalSheetCell(ref, activeSheet.cells), meta);
                          return (
                            <td
                              key={ref}
                              onClick={() => setSelectedCell(ref)}
                              style={{
                                backgroundColor: meta?.bg || undefined,
                                color: meta?.color || undefined,
                              }}
                              className={`border border-white/10 p-0 ${isSel ? 'ring-2 ring-emerald-400 ring-inset bg-emerald-500/10' : 'hover:bg-white/[0.03]'}`}
                            >
                              <input
                                value={computed}
                                onFocus={() => setSelectedCell(ref)}
                                onChange={(e) => updateSheetCell(ref, e.target.value)}
                                className={`w-full px-2 py-1 bg-transparent focus:outline-none text-xs ${
                                  meta?.bold ? 'font-bold' : ''
                                } ${meta?.italic ? 'italic' : ''} ${
                                  meta?.align === 'right' ? 'text-right' : meta?.align === 'center' ? 'text-center' : 'text-left'
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Live Chart Side Drawer */}
            {showChart && (
              <div className="w-72 border-l border-white/10 bg-zinc-950/90 p-3 flex flex-col gap-3 shrink-0 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5"><BarChart3 className="w-4 h-4" /> Живая диаграмма (A:B)</div>
                  <button onClick={() => setShowChart(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex gap-1">
                  {(['bar', 'line', 'pie'] as const).map((t) => (
                    <button key={t} onClick={() => setChartType(t)} className={`flex-1 py-1 rounded text-[11px] font-semibold cursor-pointer ${chartType === t ? 'bg-emerald-500 text-zinc-950' : 'bg-white/5 text-zinc-300'}`}>
                      {t === 'bar' ? 'Столбцы' : t === 'line' ? 'Линия' : 'Круг'}
                    </button>
                  ))}
                </div>
                {chartSeries.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 py-8 text-center">Заполните подписи в столбце A и числа в столбце B для построения графика.</div>
                ) : chartType === 'bar' ? (
                  <div className="space-y-2">
                    {chartSeries.map((pt, i) => {
                      const maxV = Math.max(...chartSeries.map((s) => s.value), 1);
                      const pct = Math.max(4, Math.round((pt.value / maxV) * 100));
                      return (
                        <div key={i} className="space-y-0.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="truncate text-zinc-300">{pt.label}</span>
                            <span className="font-mono text-emerald-300">{pt.value.toLocaleString('ru-RU')}</span>
                          </div>
                          <div className="h-3 rounded bg-white/5 overflow-hidden">
                            <div className="h-full rounded bg-gradient-to-r from-emerald-500 to-sky-400" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : chartType === 'line' ? (
                  <svg viewBox="0 0 240 140" className="w-full h-40 bg-white/[0.02] rounded-lg border border-white/10 p-2">
                    {(() => {
                      const maxV = Math.max(...chartSeries.map((s) => s.value), 1);
                      const pts = chartSeries.map((s, i) => {
                        const x = 15 + (i / Math.max(1, chartSeries.length - 1)) * 210;
                        const y = 125 - (s.value / maxV) * 105;
                        return `${x},${y}`;
                      }).join(' ');
                      return (
                        <>
                          <polyline fill="none" stroke="#34d399" strokeWidth="2.5" points={pts} />
                          {chartSeries.map((s, i) => {
                            const x = 15 + (i / Math.max(1, chartSeries.length - 1)) * 210;
                            const y = 125 - (s.value / maxV) * 105;
                            return <circle key={i} cx={x} cy={y} r="4" fill="#38bdf8" />;
                          })}
                        </>
                      );
                    })()}
                  </svg>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-40 h-40 -rotate-90">
                      {(() => {
                        const total = chartSeries.reduce((a, b) => a + b.value, 0) || 1;
                        const palette = ['#34d399', '#38bdf8', '#a78bfa', '#f59e0b', '#fb7185', '#2dd4bf'];
                        let acc = 0;
                        return chartSeries.map((s, i) => {
                          const start = (acc / total) * Math.PI * 2;
                          acc += s.value;
                          const end = (acc / total) * Math.PI * 2;
                          const large = end - start > Math.PI ? 1 : 0;
                          const d = `M 0 0 L ${Math.cos(start)} ${Math.sin(start)} A 1 1 0 ${large} 1 ${Math.cos(end)} ${Math.sin(end)} Z`;
                          return <path key={i} d={d} fill={palette[i % palette.length]} />;
                        });
                      })()}
                    </svg>
                    <div className="w-full space-y-1 text-[10px]">
                      {chartSeries.map((s, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-zinc-300 truncate">{s.label}</span>
                          <span className="font-mono text-zinc-400">{s.value.toLocaleString('ru-RU')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Sheet Tabs */}
          <div className="px-2 py-1 bg-zinc-950 border-t border-white/10 flex items-center gap-1 overflow-x-auto shrink-0">
            {sheets.map((sh, i) => (
              <button
                key={i}
                onClick={() => setActiveSheetIdx(i)}
                className={`px-3 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer ${
                  i === activeSheetIdx ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileSpreadsheet className="w-3 h-3" /> {sh.name}
              </button>
            ))}
            <button
              onClick={() => {
                const next = { name: `Лист ${sheets.length + 1}`, cells: {}, rows: 24, cols: 10 };
                setSheets((p) => [...p, next]);
                setActiveSheetIdx(sheets.length);
              }}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Новый лист
            </button>
            <span className="ml-auto text-[10px] text-zinc-500 pr-2">Формулы: =SUM, =AVG, =MIN, =MAX, =COUNT, =IF, =ROUND, =SQRT, =CONCAT</span>
          </div>
        </div>
      )}

      {/* ==================== MODE 3: LUMA SLIDES (POWERPOINT ANALOG) ==================== */}
      {mode === 'slides' && activeSlide && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Slides Element Toolbar */}
          <div className="px-3 py-1.5 bg-zinc-900/90 border-b border-white/10 flex items-center gap-1.5 flex-wrap shrink-0">
            <button onClick={() => addSlideElement('text')} className="px-2 py-1 rounded bg-white/8 hover:bg-white/15 text-[11px] font-medium flex items-center gap-1 cursor-pointer"><Type className="w-3.5 h-3.5 text-sky-400" /> Текст</button>
            <button onClick={() => slideImageInputRef.current?.click()} className="px-2 py-1 rounded bg-white/8 hover:bg-white/15 text-[11px] font-medium flex items-center gap-1 cursor-pointer"><ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> Картинка</button>
            <button onClick={() => addSlideElement('rect')} className="px-2 py-1 rounded bg-white/8 hover:bg-white/15 text-[11px] font-medium flex items-center gap-1 cursor-pointer"><Square className="w-3.5 h-3.5 text-violet-400" /> Фигура</button>
            <button onClick={() => addSlideElement('circle')} className="px-2 py-1 rounded bg-white/8 hover:bg-white/15 text-[11px] font-medium flex items-center gap-1 cursor-pointer"><Circle className="w-3.5 h-3.5 text-pink-400" /> Круг</button>
            <button onClick={() => addSlideElement('table')} className="px-2 py-1 rounded bg-white/8 hover:bg-white/15 text-[11px] font-medium flex items-center gap-1 cursor-pointer"><Table2 className="w-3.5 h-3.5 text-amber-400" /> Таблица</button>
            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Themes */}
            <div className="flex items-center gap-1">
              {SLIDE_THEMES.map((th) => (
                <button
                  key={th.name}
                  title={`Тема: ${th.name}`}
                  onClick={() => updateActiveSlide({ background: th.bg })}
                  className={`w-5 h-5 rounded-full border cursor-pointer ${activeSlide.background === th.bg ? 'border-sky-400 scale-110' : 'border-white/25'}`}
                  style={{ background: th.bg }}
                />
              ))}
            </div>

            <select
              value={activeSlide.transition}
              onChange={(e) => updateActiveSlide({ transition: e.target.value as any })}
              className="ml-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[11px]"
              title="Переход слайда"
            >
              <option value="fade" className="bg-zinc-900">Переход: Плавный</option>
              <option value="slide" className="bg-zinc-900">Переход: Сдвиг</option>
              <option value="zoom" className="bg-zinc-900">Переход: Зум</option>
              <option value="none" className="bg-zinc-900">Без перехода</option>
            </select>

            {selectedEl && (
              <>
                <div className="w-px h-4 bg-white/10 mx-1" />
                {(selectedEl.type === 'text' || selectedEl.type === 'shape') && (
                  <>
                    <input
                      type="number"
                      min={10}
                      max={96}
                      value={selectedEl.fontSize || 20}
                      onChange={(e) => updateSelectedEl({ fontSize: Number(e.target.value) || 20 })}
                      className="w-12 px-1.5 py-0.5 rounded bg-zinc-950 border border-white/10 text-[11px] text-center"
                      title="Размер шрифта"
                    />
                    <button onClick={() => updateSelectedEl({ bold: !selectedEl.bold })} className={`p-1 rounded cursor-pointer ${selectedEl.bold ? 'bg-sky-500/30 text-sky-300' : 'hover:bg-white/10'}`}><Bold className="w-3.5 h-3.5" /></button>
                    <button onClick={() => updateSelectedEl({ italic: !selectedEl.italic })} className={`p-1 rounded cursor-pointer ${selectedEl.italic ? 'bg-sky-500/30 text-sky-300' : 'hover:bg-white/10'}`}><Italic className="w-3.5 h-3.5" /></button>
                    <button onClick={() => updateSelectedEl({ align: 'left' })} className="p-1 rounded hover:bg-white/10 cursor-pointer"><AlignLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => updateSelectedEl({ align: 'center' })} className="p-1 rounded hover:bg-white/10 cursor-pointer"><AlignCenter className="w-3.5 h-3.5" /></button>
                    <button onClick={() => updateSelectedEl({ align: 'right' })} className="p-1 rounded hover:bg-white/10 cursor-pointer"><AlignRight className="w-3.5 h-3.5" /></button>
                    <input type="color" value={selectedEl.color || '#ffffff'} onChange={(e) => updateSelectedEl({ color: e.target.value })} title="Цвет текста" className="w-5 h-5 bg-transparent border-0 cursor-pointer" />
                    {selectedEl.type === 'shape' && (
                      <input type="color" value={selectedEl.bgColor || '#2563eb'} onChange={(e) => updateSelectedEl({ bgColor: e.target.value })} title="Цвет заливки" className="w-5 h-5 bg-transparent border-0 cursor-pointer" />
                    )}
                  </>
                )}
                <button
                  onClick={() => {
                    updateActiveSlide({ elements: activeSlide.elements.filter((e) => e.id !== selectedEl.id) });
                    setSelectedElId(null);
                  }}
                  className="ml-auto p-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 cursor-pointer"
                  title="Удалить элемент"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left Filmstrip */}
            <div className="w-44 border-r border-white/10 bg-zinc-950/90 flex flex-col shrink-0">
              <div className="p-2 border-b border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Слайды ({slides.length})</span>
                <button onClick={addNewSlide} className="px-2 py-0.5 rounded bg-orange-500/25 hover:bg-orange-500/40 text-orange-200 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer">
                  <Plus className="w-3 h-3" /> Слайд
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {slides.map((sl, idx) => (
                  <div
                    key={sl.id}
                    onClick={() => { setActiveSlideIdx(idx); setSelectedElId(sl.elements[0]?.id ?? null); }}
                    className={`group rounded-lg p-1.5 border transition-all cursor-pointer ${
                      idx === activeSlideIdx ? 'border-orange-400 bg-orange-500/10' : 'border-white/10 hover:border-white/25 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-mono text-zinc-400">{idx + 1}</span>
                      <span className="truncate flex-1 mx-1 text-zinc-200">{sl.title}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const dup: OfficeSlide = {
                              ...sl,
                              id: `sl_${Date.now()}`,
                              title: `${sl.title} (копия)`,
                              elements: sl.elements.map((el, k) => ({ ...el, id: `${el.id}_c${k}_${Date.now()}` })),
                            };
                            setSlides((p) => [...p.slice(0, idx + 1), dup, ...p.slice(idx + 1)]);
                          }}
                          className="p-0.5 hover:text-sky-300"
                          title="Дублировать"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                        {slides.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSlides((p) => p.filter((_, i) => i !== idx));
                              setActiveSlideIdx(Math.max(0, idx - 1));
                            }}
                            className="p-0.5 hover:text-rose-400"
                            title="Удалить"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div
                      className="w-full aspect-video rounded overflow-hidden relative border border-white/10 pointer-events-none"
                      style={{ background: sl.background || '#0f172a' }}
                    >
                      {sl.elements.slice(0, 4).map((el) => (
                        <div
                          key={el.id}
                          style={{
                            position: 'absolute',
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.w}%`,
                            height: `${el.h}%`,
                            color: el.color || '#fff',
                            backgroundColor: el.bgColor || undefined,
                            fontSize: '5px',
                            overflow: 'hidden',
                          }}
                        >
                          {el.type === 'image' && el.imageSrc ? (
                            <img src={el.imageSrc} alt="" className="w-full h-full object-contain" />
                          ) : (
                            el.text
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Center 16:9 Interactive Slide Stage + Speaker Notes */}
            <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/60">
              <div className="flex-1 flex items-center justify-center p-5 overflow-hidden">
                <div
                  ref={slideStageRef}
                  onMouseDown={() => setSelectedElId(null)}
                  className="w-full max-w-[820px] aspect-video rounded-xl shadow-2xl border border-white/15 relative overflow-hidden"
                  style={{ background: activeSlide.background || '#0f172a' }}
                >
                  {activeSlide.elements.map((el) => {
                    const isSel = selectedElId === el.id;
                    return (
                      <div
                        key={el.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedElId(el.id);
                          setDragState({
                            id: el.id, mode: 'move',
                            startX: e.clientX, startY: e.clientY,
                            origX: el.x, origY: el.y, origW: el.w, origH: el.h,
                          });
                        }}
                        style={{
                          position: 'absolute',
                          left: `${el.x}%`,
                          top: `${el.y}%`,
                          width: `${el.w}%`,
                          height: `${el.h}%`,
                          backgroundColor: el.bgColor || undefined,
                          borderRadius: el.shape === 'circle' ? '9999px' : el.shape === 'rounded' ? '16px' : '4px',
                        }}
                        className={`cursor-move transition-shadow ${isSel ? 'ring-2 ring-sky-400 shadow-lg' : 'hover:ring-1 hover:ring-white/30'}`}
                      >
                        {el.type === 'image' && el.imageSrc ? (
                          <img src={el.imageSrc} alt="" className="w-full h-full object-contain pointer-events-none select-none" />
                        ) : el.type === 'table' && el.rows ? (
                          <table className="w-full h-full border-collapse text-[11px] bg-black/25 backdrop-blur-sm">
                            <tbody>
                              {el.rows.map((row, ri) => (
                                <tr key={ri}>
                                  {row.map((cell, ci) => (
                                    <td key={ci} className={`border border-white/20 p-1 ${ri === 0 ? 'font-bold bg-white/10' : ''}`}>
                                      <input
                                        value={cell}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const nextRows = (el.rows || []).map((r, rIdx) =>
                                            rIdx !== ri ? r : r.map((c, cIdx) => (cIdx === ci ? e.target.value : c))
                                          );
                                          updateSelectedEl({ rows: nextRows });
                                        }}
                                        className="w-full bg-transparent text-white focus:outline-none text-xs"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <textarea
                            value={el.text || ''}
                            onMouseDown={(e) => {
                              if (isSel) e.stopPropagation();
                            }}
                            onChange={(e) => updateSelectedEl({ text: e.target.value })}
                            style={{
                              color: el.color || '#ffffff',
                              fontSize: `${Math.max(11, Math.round((el.fontSize || 20) * 0.85))}px`,
                              fontWeight: el.bold ? 700 : 400,
                              fontStyle: el.italic ? 'italic' : 'normal',
                              textAlign: el.align || 'left',
                            }}
                            className="w-full h-full bg-transparent resize-none p-2 focus:outline-none leading-snug select-text"
                          />
                        )}

                        {isSel && (
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDragState({
                                id: el.id, mode: 'resize',
                                startX: e.clientX, startY: e.clientY,
                                origX: el.x, origY: el.y, origW: el.w, origH: el.h,
                              });
                            }}
                            className="w-3.5 h-3.5 rounded-full bg-sky-400 border-2 border-zinc-950 absolute -right-1.5 -bottom-1.5 cursor-nwse-resize shadow"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Speaker Notes */}
              <div className="h-20 border-t border-white/10 bg-zinc-950/90 px-4 py-2 flex flex-col shrink-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Заметки докладчика · Слайд {activeSlideIdx + 1} / {slides.length}</div>
                <textarea
                  value={activeSlide.notes}
                  onChange={(e) => updateActiveSlide({ notes: e.target.value })}
                  placeholder="Добавьте заметки к слайду..."
                  className="flex-1 bg-transparent text-xs text-zinc-300 resize-none focus:outline-none select-text"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== F5 FULLSCREEN PRESENTATION OVERLAY ==================== */}
      {presenting && activeSlide && (
        <div
          className="fixed inset-0 z-[99999] bg-black flex items-center justify-center cursor-none"
          onMouseMove={(e) => setLaserPos({ x: e.clientX, y: e.clientY })}
          onClick={() => setActiveSlideIdx((i) => Math.min(slides.length - 1, i + 1))}
        >
          <div
            className="w-screen h-screen max-w-[177.78vh] max-h-[56.25vw] relative overflow-hidden shadow-2xl transition-all duration-300"
            style={{ background: activeSlide.background || '#0f172a' }}
          >
            {activeSlide.elements.map((el) => (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.w}%`,
                  height: `${el.h}%`,
                  backgroundColor: el.bgColor || undefined,
                  borderRadius: el.shape === 'circle' ? '9999px' : el.shape === 'rounded' ? '18px' : '4px',
                  color: el.color || '#ffffff',
                  fontSize: `clamp(14px, ${((el.fontSize || 22) / 14).toFixed(2)}vw, ${(el.fontSize || 22) * 1.6}px)`,
                  fontWeight: el.bold ? 700 : 400,
                  fontStyle: el.italic ? 'italic' : 'normal',
                  textAlign: el.align || 'left',
                  whiteSpace: 'pre-wrap',
                }}
                className="p-2 leading-snug"
              >
                {el.type === 'image' && el.imageSrc ? (
                  <img src={el.imageSrc} alt="" className="w-full h-full object-contain" />
                ) : el.type === 'table' && el.rows ? (
                  <table className="w-full h-full border-collapse text-sm bg-black/30">
                    <tbody>
                      {el.rows.map((r, ri) => (
                        <tr key={ri}>
                          {r.map((c, ci) => (
                            <td key={ci} className={`border border-white/25 p-2 ${ri === 0 ? 'font-bold bg-white/10' : ''}`}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  el.text
                )}
              </div>
            ))}
          </div>

          {/* Laser Pointer Dot */}
          {laserPos && (
            <div
              className="fixed w-3.5 h-3.5 rounded-full bg-rose-500 shadow-[0_0_16px_4px_rgba(244,63,94,0.85)] pointer-events-none"
              style={{ left: laserPos.x - 7, top: laserPos.y - 7 }}
            />
          )}

          {/* Presenter Controls Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-zinc-950/85 border border-white/15 backdrop-blur-xl flex items-center gap-3 text-xs text-white cursor-auto"
          >
            <button onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))} className="p-1 hover:text-sky-400 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-mono">{activeSlideIdx + 1} / {slides.length}</span>
            <button onClick={() => setActiveSlideIdx((i) => Math.min(slides.length - 1, i + 1))} className="p-1 hover:text-sky-400 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-white/15" />
            <button onClick={() => setPresenting(false)} className="px-2 py-0.5 rounded bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 cursor-pointer">Выйти (Esc)</button>
          </div>
        </div>
      )}
    </div>
  );
};
