import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText, Table2, Presentation, FolderOpen, Download, Plus, Trash2, Copy,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Image as ImageIcon, Play, ChevronLeft, ChevronRight,
  BarChart3, Search, Undo2, Redo2, Square, Circle, Type, Maximize2, X,
  Sparkles, Check, AlertCircle, Columns, Rows, ArrowUpDown, FileSpreadsheet,
  Printer, SlidersHorizontal, ArrowUp, ArrowDown, Link2, MessageSquare,
  Highlighter, Subscript, Superscript, Minus, Triangle, Star, ArrowRight,
  Lock, Filter, Layers, PenTool, Eraser, Compass, ZoomIn, ZoomOut,
  FilePlus, Save, Layout, PieChart, TrendingUp,
} from 'lucide-react';

export type OfficeAppMode = 'docs' | 'sheets' | 'slides';

export type SlideShapeKind =
  | 'rect' | 'rounded' | 'circle' | 'triangle' | 'diamond'
  | 'arrow_right' | 'arrow_up' | 'star' | 'callout' | 'banner' | 'badge' | 'line';

export type SlideAnimKind = 'none' | 'fade_in' | 'fly_left' | 'fly_up' | 'zoom_in' | 'bounce' | 'pulse';

export interface OfficeSlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'table' | 'smartart' | 'chart';
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
  borderColor?: string;
  opacity?: number;
  rotate?: number;
  imageSrc?: string;
  shape?: SlideShapeKind;
  anim?: SlideAnimKind;
  rows?: string[][];
  smartArtItems?: string[];
  chartData?: { label: string; value: number }[];
}

export interface OfficeSlide {
  id: string;
  title: string;
  background: string;
  transition: 'fade' | 'slide' | 'zoom' | 'flip' | 'none';
  notes: string;
  elements: OfficeSlideElement[];
}

export interface CellMeta {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  bg?: string;
  color?: string;
  border?: 'none' | 'thin' | 'thick' | 'bottom';
  format?: 'text' | 'number' | 'currency' | 'usd' | 'percent';
  wrap?: boolean;
  colSpan?: number;
}

export interface OfficeSheet {
  name: string;
  cells: Record<string, string>;
  styles?: Record<string, CellMeta>;
  rows: number;
  cols: number;
  freezeHeader?: boolean;
  freezeFirstCol?: boolean;
}

interface DocComment {
  id: string;
  author: string;
  text: string;
  time: string;
  resolved?: boolean;
}

interface LumaOfficeSuiteWindowProps {
  isDark?: boolean;
  initialMode?: OfficeAppMode;
  onNotify?: (title: string, body: string, level?: 'info' | 'ok' | 'warn' | 'danger') => void;
}

const OFFICE_AUTOSAVE_KEY = 'luma_office_pro_session_v152';

const SLIDE_THEMES = [
  { name: 'Carbon Dark', bg: '#0f172a', text: '#f8fafc', accent: '#38bdf8' },
  { name: 'Midnight Violet', bg: '#1e1b4b', text: '#eef2ff', accent: '#a78bfa' },
  { name: 'Pure Paper', bg: '#ffffff', text: '#0f172a', accent: '#2563eb' },
  { name: 'Emerald Pitch', bg: '#064e3b', text: '#ecfdf5', accent: '#34d399' },
  { name: 'Obsidian Gold', bg: '#18181b', text: '#fafafa', accent: '#f59e0b' },
  { name: 'Crimson Studio', bg: '#450a0a', text: '#fff1f2', accent: '#fb7185' },
  { name: 'Arctic Gradient', bg: 'linear-gradient(135deg,#0f172a,#1e3a5f)', text: '#f8fafc', accent: '#38bdf8' },
  { name: 'Sunset Deck', bg: 'linear-gradient(135deg,#31102f,#7c2d12)', text: '#fff7ed', accent: '#fb923c' },
];

const DEFAULT_DOC_HTML = `<h1>Luma Office Studio 1.5.2 · Документ</h1>
<p>Полный аналог <strong>Microsoft Word</strong>, <strong>Excel</strong> и <strong>PowerPoint</strong> внутри Luma OS 1.5.2 Carbon. Поддерживает реальное открытие и сохранение <code>.docx</code>, <code>.xlsx</code>, <code>.pptx</code>, <code>.pdf</code>, <code>.csv</code>, <code>.odt</code>, <code>.rtf</code>, <code>.html</code>, <code>.md</code> и <code>.txt</code>.</p>
<h2>Ключевые возможности Word · Excel · PowerPoint</h2>
<ul>
  <li><strong>Word (Docs):</strong> многовкладочная лента Ribbon, стили, колонки, водяные знаки, колонтитулы, оглавление, таблицы и комментарии</li>
  <li><strong>Excel (Sheets):</strong> 35+ формул (SUM, AVG, IF, VLOOKUP, COUNTIF, SUMIF, MEDIAN, STDEV...), границы, закрепление, условное форматирование, автофильтр и 6 типов графиков</li>
  <li><strong>PowerPoint (Slides):</strong> 12+ фигур, SmartArt, анимации элементов, переходы и режим показа F5 с лазерной указкой и маркером рисования</li>
</ul>`;

const DEFAULT_SHEETS: OfficeSheet[] = [
  {
    name: 'Бюджет 2026',
    rows: 30,
    cols: 12,
    freezeHeader: true,
    cells: {
      A1: 'Категория', B1: 'План (₽)', C1: 'Факт (₽)', D1: 'Разница', E1: 'Статус',
      A2: 'Оборудование', B2: '65000', C2: '58400', D2: '=B2-C2', E2: '=IF(D2>=0,"В бюджете","Перерасход")',
      A3: 'ПО и Облако', B3: '12000', C3: '9800', D3: '=B3-C3', E3: '=IF(D3>=0,"В бюджете","Перерасход")',
      A4: 'Дизайн и Медиа', B4: '24000', C4: '26500', D4: '=B4-C4', E4: '=IF(D4>=0,"В бюджете","Перерасход")',
      A5: 'Маркетинг', B5: '35000', C5: '31200', D5: '=B5-C5', E5: '=IF(D5>=0,"В бюджете","Перерасход")',
      A6: 'ИТОГО', B6: '=SUM(B2:B5)', C6: '=SUM(C2:C5)', D6: '=SUM(D2:D5)', E6: '=COUNTIF(D2:D5,">0")',
      A7: 'Среднее', B7: '=AVERAGE(B2:B5)', C7: '=AVERAGE(C2:C5)', D7: '=MAX(D2:D5)', E7: '=MEDIAN(C2:C5)',
    },
    styles: {
      A1: { bold: true, bg: '#1e293b', color: '#38bdf8', border: 'bottom' },
      B1: { bold: true, bg: '#1e293b', color: '#38bdf8', align: 'right', border: 'bottom' },
      C1: { bold: true, bg: '#1e293b', color: '#38bdf8', align: 'right', border: 'bottom' },
      D1: { bold: true, bg: '#1e293b', color: '#38bdf8', align: 'right', border: 'bottom' },
      E1: { bold: true, bg: '#1e293b', color: '#38bdf8', align: 'center', border: 'bottom' },
      A6: { bold: true, bg: '#0f172a', color: '#34d399', border: 'thick' },
      B6: { bold: true, bg: '#0f172a', color: '#34d399', align: 'right', format: 'currency', border: 'thick' },
      C6: { bold: true, bg: '#0f172a', color: '#34d399', align: 'right', format: 'currency', border: 'thick' },
      D6: { bold: true, bg: '#0f172a', color: '#34d399', align: 'right', format: 'currency', border: 'thick' },
    },
  },
];

const DEFAULT_SLIDES: OfficeSlide[] = [
  {
    id: 'sl_intro_1',
    title: 'Luma OS 1.5.2 Carbon',
    background: 'linear-gradient(135deg,#0f172a,#1e3a5f)',
    transition: 'fade',
    notes: 'Нажмите F5 для показа слайдов. В режиме докладчика доступны лазерная указка и маркер рисования.',
    elements: [
      { id: 'el_t1', type: 'text', x: 8, y: 20, w: 84, h: 18, text: 'Luma Office Studio 1.5.2', fontSize: 44, bold: true, align: 'center', color: '#ffffff', anim: 'fade_in' },
      { id: 'el_s1', type: 'text', x: 12, y: 44, w: 76, h: 16, text: 'Профессиональный пакет Word · Excel · PowerPoint\nс полной поддержкой .docx, .xlsx, .pptx и .pdf', fontSize: 20, align: 'center', color: '#cbd5e1', anim: 'fly_up' },
      { id: 'el_b1', type: 'shape', shape: 'rounded', x: 34, y: 68, w: 32, h: 11, text: 'Carbon · Kernel 1.4.5', fontSize: 16, bold: true, align: 'center', color: '#082f49', bgColor: '#38bdf8', anim: 'zoom_in' },
    ],
  },
  {
    id: 'sl_intro_2',
    title: 'SmartArt и Аналитика',
    background: '#1e1b4b',
    transition: 'slide',
    notes: 'Демонстрация SmartArt и встроенных графиков.',
    elements: [
      { id: 'el_t2', type: 'text', x: 6, y: 8, w: 88, h: 12, text: 'Этапы запуска проекта', fontSize: 32, bold: true, align: 'left', color: '#eef2ff' },
      { id: 'el_sa1', type: 'smartart', x: 6, y: 26, w: 88, h: 28, smartArtItems: ['1. Анализ', '2. Дизайн', '3. Разработка', '4. Релиз 1.5.2'], bgColor: '#312e81', color: '#ffffff' },
      { id: 'el_b2', type: 'text', x: 6, y: 60, w: 88, h: 28, text: '• 12+ фигур, SmartArt, графики и таблицы на слайдах\n• Режим докладчика F5 с лазерной указкой и маркером рисования\n• Настоящий экспорт в .pptx, .pdf и FullHD PNG', fontSize: 18, align: 'left', color: '#cbd5e1' },
    ],
  },
];

// ==================== 35+ FORMULA EXCEL ENGINE ====================

function colToLetter(c: number): string {
  let s = '';
  let n = c;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function letterToCol(letters: string): number {
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return col - 1;
}

function parseCellId(id: string): [number, number] | null {
  const m = /^([A-Z]+)(\d+)$/i.exec(id.trim());
  if (!m) return null;
  return [letterToCol(m[1].toUpperCase()), parseInt(m[2], 10) - 1];
}

function expandRangeIds(rangeStr: string): string[] {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [rangeStr.trim().toUpperCase()];
  const a = parseCellId(parts[0]);
  const b = parseCellId(parts[1]);
  if (!a || !b) return [];
  const res: string[] = [];
  for (let r = Math.min(a[1], b[1]); r <= Math.max(a[1], b[1]); r++) {
    for (let c = Math.min(a[0], b[0]); c <= Math.max(a[0], b[0]); c++) {
      res.push(`${colToLetter(c)}${r + 1}`);
    }
  }
  return res;
}

function splitTopLevelArgs(argStr: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let inQ = false;
  let cur = '';
  for (let i = 0; i < argStr.length; i++) {
    const ch = argStr[i];
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch === '(') depth++;
    else if (!inQ && ch === ')') depth--;
    if (!inQ && depth === 0 && (ch === ',' || ch === ';')) {
      args.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim() !== '') args.push(cur.trim());
  return args;
}

function evaluateCell(
  cellId: string,
  cells: Record<string, string>,
  visited: Set<string> = new Set()
): string | number {
  const raw = (cells[cellId] ?? '').trim();
  if (!raw.startsWith('=')) {
    if (raw !== '' && !Number.isNaN(Number(raw))) return Number(raw);
    return raw;
  }
  if (visited.has(cellId)) return '#CYCLE!';
  const nextVisited = new Set(visited);
  nextVisited.add(cellId);

  const evalAtom = (expr: string): string | number => {
    const t = expr.trim();
    if (!t) return 0;
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1);
    }
    if (!Number.isNaN(Number(t))) return Number(t);
    if (/^[A-Z]+\d+$/i.test(t)) return evaluateCell(t.toUpperCase(), cells, nextVisited);
    return evalFormulaExpr(t);
  };

  const getNums = (argStr: string): number[] => {
    const nums: number[] = [];
    for (const part of splitTopLevelArgs(argStr)) {
      if (part.includes(':')) {
        for (const id of expandRangeIds(part)) {
          const v = evaluateCell(id, cells, nextVisited);
          const n = Number(v);
          if (v !== '' && !Number.isNaN(n)) nums.push(n);
        }
      } else {
        const v = evalAtom(part);
        const n = Number(v);
        if (v !== '' && !Number.isNaN(n)) nums.push(n);
      }
    }
    return nums;
  };

  const matchCond = (val: string | number, crit: string): boolean => {
    const c = crit.replace(/^["']|["']$/g, '').trim();
    const numV = Number(val);
    const m = /^(>=|<=|<>|!=|>|<|=)(.*)$/.exec(c);
    if (m) {
      const op = m[1];
      const rhs = Number(m[2]);
      if (!Number.isNaN(numV) && !Number.isNaN(rhs)) {
        if (op === '>') return numV > rhs;
        if (op === '<') return numV < rhs;
        if (op === '>=') return numV >= rhs;
        if (op === '<=') return numV <= rhs;
        if (op === '<>' || op === '!=') return numV !== rhs;
        return numV === rhs;
      }
      return String(val).toLowerCase() === m[2].trim().toLowerCase();
    }
    return String(val).toLowerCase() === c.toLowerCase();
  };

  const evalFormulaExpr = (exprIn: string): string | number => {
    let expr = exprIn.trim();

    // Standalone string-returning functions first
    const fnDirect = /^([A-Z0-9_]+)\((.*)\)$/i.exec(expr);
    if (fnDirect) {
      const fn = fnDirect[1].toUpperCase();
      const args = splitTopLevelArgs(fnDirect[2]);
      if (fn === 'IF' && args.length >= 2) {
        const condExpr = args[0];
        const cmpM = /^(.+?)(>=|<=|<>|!=|=|>|<)(.+)$/.exec(condExpr);
        let pass = false;
        if (cmpM) {
          const L = evalAtom(cmpM[1]);
          const R = evalAtom(cmpM[3]);
          const op = cmpM[2];
          const nL = Number(L);
          const nR = Number(R);
          if (!Number.isNaN(nL) && !Number.isNaN(nR)) {
            pass = op === '>' ? nL > nR : op === '<' ? nL < nR : op === '>=' ? nL >= nR : op === '<=' ? nL <= nR : op === '=' ? nL === nR : nL !== nR;
          } else {
            pass = op === '=' ? String(L) === String(R) : String(L) !== String(R);
          }
        } else {
          pass = Boolean(evalAtom(condExpr));
        }
        return pass ? evalAtom(args[1]) : args[2] !== undefined ? evalAtom(args[2]) : false ? '' : 0;
      }
      if (fn === 'CONCAT' || fn === 'CONCATENATE') return args.map((a) => String(evalAtom(a))).join('');
      if (fn === 'UPPER') return String(evalAtom(args[0] || '')).toUpperCase();
      if (fn === 'LOWER') return String(evalAtom(args[0] || '')).toLowerCase();
      if (fn === 'TRIM') return String(evalAtom(args[0] || '')).trim();
      if (fn === 'LEFT') return String(evalAtom(args[0] || '')).slice(0, Number(evalAtom(args[1] || '1')));
      if (fn === 'RIGHT') {
        const s = String(evalAtom(args[0] || ''));
        return s.slice(-Math.max(0, Number(evalAtom(args[1] || '1'))));
      }
      if (fn === 'TODAY') return new Date().toLocaleDateString('ru-RU');
      if (fn === 'NOW') return new Date().toLocaleString('ru-RU');
      if (fn === 'VLOOKUP' && args.length >= 3) {
        const lookup = String(evalAtom(args[0])).toLowerCase();
        const rangeParts = args[1].split(':');
        const colIdx = Math.max(1, Number(evalAtom(args[2])));
        if (rangeParts.length === 2) {
          const a = parseCellId(rangeParts[0]);
          const b = parseCellId(rangeParts[1]);
          if (a && b) {
            for (let r = Math.min(a[1], b[1]); r <= Math.max(a[1], b[1]); r++) {
              const keyVal = String(evaluateCell(`${colToLetter(a[0])}${r + 1}`, cells, nextVisited)).toLowerCase();
              if (keyVal === lookup) {
                return evaluateCell(`${colToLetter(a[0] + colIdx - 1)}${r + 1}`, cells, nextVisited);
              }
            }
          }
        }
        return '#N/A';
      }
    }

    // Replace inner numeric functions
    const fnRe = /\b(SUM|AVERAGE|AVG|MIN|MAX|COUNT|COUNTA|COUNTIF|SUMIF|ROUND|FLOOR|CEIL|ABS|SQRT|POWER|MOD|MEDIAN|STDEV|PRODUCT|LEN|PI|SIN|COS|LOG|LN|EXP|RAND)\(([^()]*)\)/gi;
    let guard = 0;
    while (fnRe.test(expr) && guard < 12) {
      guard++;
      expr = expr.replace(fnRe, (_m, fnName: string, argsRaw: string) => {
        const fn = fnName.toUpperCase();
        if (fn === 'PI') return String(Math.PI);
        if (fn === 'RAND') return String(Number(Math.random().toFixed(4)));
        if (fn === 'COUNTA') {
          const ids = argsRaw.includes(':') ? expandRangeIds(argsRaw) : splitTopLevelArgs(argsRaw);
          return String(ids.filter((id) => String(evaluateCell(id, cells, nextVisited)).trim() !== '').length);
        }
        if (fn === 'COUNTIF') {
          const [rng, crit] = splitTopLevelArgs(argsRaw);
          const ids = expandRangeIds(rng || '');
          return String(ids.filter((id) => matchCond(evaluateCell(id, cells, nextVisited), crit || '')).length);
        }
        if (fn === 'SUMIF') {
          const [rng, crit, sumRng] = splitTopLevelArgs(argsRaw);
          const ids = expandRangeIds(rng || '');
          const sumIds = sumRng ? expandRangeIds(sumRng) : ids;
          let total = 0;
          ids.forEach((id, i) => {
            if (matchCond(evaluateCell(id, cells, nextVisited), crit || '')) {
              const v = Number(evaluateCell(sumIds[i] || id, cells, nextVisited));
              if (!Number.isNaN(v)) total += v;
            }
          });
          return String(total);
        }
        if (fn === 'LEN') return String(String(evalAtom(argsRaw)).length);

        const nums = getNums(argsRaw);
        if (fn === 'SUM') return String(nums.reduce((a, b) => a + b, 0));
        if (fn === 'PRODUCT') return String(nums.reduce((a, b) => a * b, 1));
        if (fn === 'AVG' || fn === 'AVERAGE') return String(nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
        if (fn === 'MIN') return String(nums.length ? Math.min(...nums) : 0);
        if (fn === 'MAX') return String(nums.length ? Math.max(...nums) : 0);
        if (fn === 'COUNT') return String(nums.length);
        if (fn === 'MEDIAN') {
          if (!nums.length) return '0';
          const sorted = [...nums].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return String(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
        }
        if (fn === 'STDEV') {
          if (nums.length < 2) return '0';
          const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
          const variance = nums.reduce((acc, x) => acc + (x - avg) ** 2, 0) / (nums.length - 1);
          return String(Math.sqrt(variance));
        }
        if (fn === 'ROUND') {
          const p = Math.pow(10, nums[1] ?? 0);
          return String(Math.round((nums[0] ?? 0) * p) / p);
        }
        if (fn === 'FLOOR') return String(Math.floor(nums[0] ?? 0));
        if (fn === 'CEIL') return String(Math.ceil(nums[0] ?? 0));
        if (fn === 'ABS') return String(Math.abs(nums[0] ?? 0));
        if (fn === 'SQRT') return String(Math.sqrt(Math.max(0, nums[0] ?? 0)));
        if (fn === 'POWER') return String(Math.pow(nums[0] ?? 0, nums[1] ?? 1));
        if (fn === 'MOD') return String(nums[1] ? (nums[0] ?? 0) % nums[1] : 0);
        if (fn === 'SIN') return String(Math.sin(nums[0] ?? 0));
        if (fn === 'COS') return String(Math.cos(nums[0] ?? 0));
        if (fn === 'LOG') return String(Math.log10(Math.max(1e-9, nums[0] ?? 1)));
        if (fn === 'LN') return String(Math.log(Math.max(1e-9, nums[0] ?? 1)));
        if (fn === 'EXP') return String(Math.exp(nums[0] ?? 0));
        return '0';
      });
    }

    // Substitute remaining cell references
    expr = expr.replace(/\b([A-Z]+\d+)\b/gi, (ref) => {
      const val = evaluateCell(ref.toUpperCase(), cells, nextVisited);
      const n = Number(val);
      return val !== '' && !Number.isNaN(n) ? String(n) : '0';
    });

    if (!/^[0-9+\-*/().\s%^]+$/.test(expr)) return expr;
    try {
      const safe = expr.replace(/\^/g, '**');
      // eslint-disable-next-line no-new-func
      const res = new Function(`"use strict"; return (${safe});`)();
      if (typeof res === 'number' && Number.isFinite(res)) {
        return Math.round(res * 10000) / 10000;
      }
      return '#ERR!';
    } catch {
      return '#ERR!';
    }
  };

  return evalFormulaExpr(raw.slice(1));
}

function formatCellValue(val: string | number, meta?: CellMeta): string {
  if (typeof val !== 'number') return String(val);
  if (meta?.format === 'currency') return `${val.toLocaleString('ru-RU')} ₽`;
  if (meta?.format === 'usd') return `$${val.toLocaleString('en-US')}`;
  if (meta?.format === 'percent') return `${(val * 100).toFixed(1)}%`;
  if (meta?.format === 'number') return val.toLocaleString('ru-RU');
  return String(val);
}

function downloadBase64File(fileName: string, mimeType: string, base64Data: string) {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

const FORMULA_LIBRARY = [
  { fn: '=SUM(B2:B5)', desc: 'Сумма диапазона' },
  { fn: '=AVERAGE(B2:B5)', desc: 'Среднее значение' },
  { fn: '=MIN(B2:B5)', desc: 'Минимум' },
  { fn: '=MAX(B2:B5)', desc: 'Максимум' },
  { fn: '=MEDIAN(B2:B5)', desc: 'Медиана' },
  { fn: '=STDEV(B2:B5)', desc: 'Станд. отклонение' },
  { fn: '=IF(D2>=0,"OK","Минус")', desc: 'Условие ЕСЛИ' },
  { fn: '=COUNTIF(D2:D5,">0")', desc: 'Счёт по условию' },
  { fn: '=SUMIF(D2:D5,">0",B2:B5)', desc: 'Сумма по условию' },
  { fn: '=VLOOKUP("ПО и Облако",A2:C5,3)', desc: 'Поиск ВПР (VLOOKUP)' },
  { fn: '=ROUND(B2/3,2)', desc: 'Округление' },
  { fn: '=TODAY()', desc: 'Сегодняшняя дата' },
];

type RibbonTab = 'home' | 'insert' | 'layout' | 'formulas' | 'review' | 'view';

export const LumaOfficeSuiteWindow: React.FC<LumaOfficeSuiteWindowProps> = ({
  isDark = true,
  initialMode = 'docs',
  onNotify,
}) => {
  const [mode, setMode] = useState<OfficeAppMode>(initialMode);
  const [ribbonTab, setRibbonTab] = useState<RibbonTab>('home');
  const [docTitle, setDocTitle] = useState('Документ Luma 1.5.2');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Word (Docs) state
  const [docHtml, setDocHtml] = useState<string>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(OFFICE_AUTOSAVE_KEY) || 'null');
      if (s?.docHtml) return s.docHtml;
    } catch {}
    return DEFAULT_DOC_HTML;
  });
  const docEditorRef = useRef<HTMLDivElement | null>(null);
  const [docZoom, setDocZoom] = useState(100);
  const [docFont, setDocFont] = useState('Inter');
  const [docFontSize, setDocFontSize] = useState('3');
  const [docLandscape, setDocLandscape] = useState(false);
  const [docMargins, setDocMargins] = useState<'normal' | 'narrow' | 'wide'>('normal');
  const [docColumns, setDocColumns] = useState<1 | 2 | 3>(1);
  const [docLineHeight, setDocLineHeight] = useState('1.6');
  const [docPageBg, setDocPageBg] = useState('#ffffff');
  const [docWatermark, setDocWatermark] = useState('');
  const [docHeader, setDocHeader] = useState('');
  const [docFooter, setDocFooter] = useState('Luma Office Studio 1.5.2 · Стр. 1');
  const [showRuler, setShowRuler] = useState(true);
  const [showDocFind, setShowDocFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [docComments, setDocComments] = useState<DocComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Excel (Sheets) state
  const [sheets, setSheets] = useState<OfficeSheet[]>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(OFFICE_AUTOSAVE_KEY) || 'null');
      if (Array.isArray(s?.sheets) && s.sheets.length > 0) return s.sheets;
    } catch {}
    return DEFAULT_SHEETS;
  });
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [selectedCell, setSelectedCell] = useState('A1');
  const [formulaInput, setFormulaInput] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'hbar' | 'line' | 'area' | 'pie' | 'donut'>('bar');
  const [autoFilterQuery, setAutoFilterQuery] = useState('');
  const [showAutoFilter, setShowAutoFilter] = useState(false);
  const [condFormatEnabled, setCondFormatEnabled] = useState(false);
  const [showFormulaPicker, setShowFormulaPicker] = useState(false);

  // PowerPoint (Slides) state
  const [slides, setSlides] = useState<OfficeSlide[]>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(OFFICE_AUTOSAVE_KEY) || 'null');
      if (Array.isArray(s?.slides) && s.slides.length > 0) return s.slides;
    } catch {}
    return DEFAULT_SLIDES;
  });
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedElId, setSelectedElId] = useState<string | null>('el_t1');
  const [presenting, setPresenting] = useState(false);
  const [presenterTool, setPresenterTool] = useState<'laser' | 'pen' | 'highlighter'>('laser');
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [slideShowTimer, setSlideShowTimer] = useState(0);
  const [showPresenterNotes, setShowPresenterNotes] = useState(false);
  const [dragState, setDragState] = useState<{
    id: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; mode: 'move' | 'resize';
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgInsertInputRef = useRef<HTMLInputElement | null>(null);
  const slideCanvasRef = useRef<HTMLDivElement | null>(null);
  const presenterDrawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingPresenterRef = useRef(false);

  const activeSheet = sheets[activeSheetIdx] || sheets[0];
  const activeSlide = slides[activeSlideIdx] || slides[0];
  const selectedEl = activeSlide?.elements.find((e) => e.id === selectedElId) || null;

  // Auto-save to localStorage
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(OFFICE_AUTOSAVE_KEY, JSON.stringify({ docHtml, sheets, slides }));
      } catch {}
    }, 600);
    return () => window.clearTimeout(t);
  }, [docHtml, sheets, slides]);

  // Hydrate contentEditable on mode switch to docs
  useEffect(() => {
    if (mode === 'docs' && docEditorRef.current && docEditorRef.current.innerHTML !== docHtml) {
      docEditorRef.current.innerHTML = docHtml;
    }
  }, [mode]);

  // Sync formula bar
  useEffect(() => {
    if (activeSheet) setFormulaInput(activeSheet.cells[selectedCell] ?? '');
  }, [selectedCell, activeSheetIdx, activeSheet]);

  // F5 / Presenter keyboard + timer
  useEffect(() => {
    if (!presenting) {
      setSlideShowTimer(0);
      return;
    }
    const timer = window.setInterval(() => setSlideShowTimer((s) => s + 1), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresenting(false);
      else if (e.key === 'ArrowRight' || e.key === ' ') setActiveSlideIdx((i) => Math.min(slides.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setActiveSlideIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [presenting, slides.length]);

  // Slide element drag/resize
  useEffect(() => {
    if (!dragState) return;
    const onMove = (ev: MouseEvent) => {
      const box = slideCanvasRef.current?.getBoundingClientRect();
      if (!box) return;
      const dxPct = ((ev.clientX - dragState.startX) / box.width) * 100;
      const dyPct = ((ev.clientY - dragState.startY) / box.height) * 100;
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
                      x: Math.max(0, Math.min(95, Math.round((dragState.origX + dxPct) * 10) / 10)),
                      y: Math.max(0, Math.min(92, Math.round((dragState.origY + dyPct) * 10) / 10)),
                    };
                  }
                  return {
                    ...el,
                    w: Math.max(8, Math.min(100, Math.round((dragState.origW + dxPct) * 10) / 10)),
                    h: Math.max(6, Math.min(100, Math.round((dragState.origH + dyPct) * 10) / 10)),
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
    setTimeout(() => setStatusMsg((cur) => (cur === msg ? null : cur)), 3800);
  };

  // ==================== REAL IMPORT & EXPORT (.docx, .xlsx, .pptx, .pdf, .csv, .md, .html, .rtf, .txt, .png) ====================
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
        showStatus(`Ошибка открытия: ${data.error || 'формат не поддерживается'}`);
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
        setMode('docs');
        setTimeout(() => {
          if (docEditorRef.current) docEditorRef.current.innerHTML = htmlContent;
        }, 30);
        showStatus(`Открыт документ «${file.name}»`);
      }
      onNotify?.('Luma Office Studio', `Файл «${file.name}» открыт`, 'ok');
    } catch (err: unknown) {
      showStatus(`Ошибка импорта: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (format: string) => {
    setExportMenuOpen(false);
    if (format === 'pdf') {
      const w = window.open('', '_blank', 'width=960,height=720');
      if (!w) {
        showStatus('Разрешите всплывающие окна для печати PDF');
        return;
      }
      const res = await fetch('/api/kernel/office/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: mode, format: 'html', file_name: docTitle, title: docTitle,
          doc_html: docEditorRef.current?.innerHTML || docHtml, sheets, slides,
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
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = activeSlide.background.startsWith('#') ? activeSlide.background : '#0f172a';
        ctx.fillRect(0, 0, 1920, 1080);
        for (const el of activeSlide.elements) {
          const x = (el.x / 100) * 1920, y = (el.y / 100) * 1080, w = (el.w / 100) * 1920, h = (el.h / 100) * 1080;
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
          kind: mode, format, file_name: docTitle, title: docTitle,
          doc_html: currentHtml, doc_text: currentText, sheets, slides,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        showStatus(`Ошибка экспорта: ${data.error}`);
        return;
      }
      downloadBase64File(data.file_name, data.mime_type, data.base64_data);
      showStatus(`Сохранено: ${data.file_name} (${(data.size_bytes / 1024).toFixed(1)} КБ)`);
      onNotify?.('Luma Office Studio', `Сохранено в .${format.toUpperCase()}`, 'ok');
    } catch (err: unknown) {
      showStatus(`Ошибка экспорта: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  // ==================== WORD HELPERS ====================
  const execDocCmd = (cmd: string, val?: string) => {
    docEditorRef.current?.focus();
    document.execCommand(cmd, false, val);
    if (docEditorRef.current) setDocHtml(docEditorRef.current.innerHTML);
  };

  const insertDocTable = (rows = 3, cols = 3) => {
    const head = Array.from({ length: cols }).map((_, i) => `<th style="border:1px solid #94a3b8;padding:6px;background:rgba(56,189,248,.14)">Колонка ${i + 1}</th>`).join('');
    const body = Array.from({ length: rows - 1 })
      .map(() => `<tr>${Array.from({ length: cols }).map(() => `<td style="border:1px solid #94a3b8;padding:6px">Текст</td>`).join('')}</tr>`)
      .join('');
    execDocCmd('insertHTML', `<table style="border-collapse:collapse;width:100%;margin:12px 0;"><tr>${head}</tr>${body}</table><p><br/></p>`);
  };

  const insertAutoTOC = () => {
    const tmp = document.createElement('div');
    tmp.innerHTML = docEditorRef.current?.innerHTML || docHtml;
    const heads = Array.from(tmp.querySelectorAll('h1, h2, h3')).map((h) => ({
      level: Number(h.tagName[1]),
      text: h.textContent || '',
    }));
    const listHtml = heads.length
      ? heads.map((h) => `<div style="padding-left:${(h.level - 1) * 18}px;margin:2px 0;">• ${h.text}</div>`).join('')
      : '<div>(Добавьте заголовки H1 / H2 / H3 в документ)</div>';
    execDocCmd('insertHTML', `<div style="border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin:12px 0;background:#f8fafc;"><strong>Оглавление</strong>${listHtml}</div><p><br/></p>`);
  };

  const handleFindReplaceDoc = () => {
    if (!findText || !docEditorRef.current) return;
    const updated = docEditorRef.current.innerHTML.split(findText).join(replaceText);
    docEditorRef.current.innerHTML = updated;
    setDocHtml(updated);
    showStatus(`Заменено: «${findText}» → «${replaceText}»`);
  };

  const docStats = useMemo(() => {
    const plain = docHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = plain ? plain.split(' ').length : 0;
    return { words, chars: plain.length, readMin: Math.max(1, Math.ceil(words / 180)) };
  }, [docHtml]);

  // ==================== EXCEL HELPERS ====================
  const updateCell = (cellId: string, val: string) => {
    setSheets((prev) =>
      prev.map((sh, i) => (i !== activeSheetIdx ? sh : { ...sh, cells: { ...sh.cells, [cellId]: val } }))
    );
  };

  const updateCellStyle = (patch: Partial<CellMeta>) => {
    setSheets((prev) =>
      prev.map((sh, i) =>
        i !== activeSheetIdx
          ? sh
          : { ...sh, styles: { ...(sh.styles || {}), [selectedCell]: { ...(sh.styles?.[selectedCell] || {}), ...patch } } }
      )
    );
  };

  const sortActiveColumn = (asc: boolean) => {
    const parsed = parseCellId(selectedCell);
    if (!parsed || !activeSheet) return;
    const sortCol = parsed[0];
    const rowData: { r: number; key: string | number; rowCells: Record<number, string> }[] = [];
    for (let r = 1; r < activeSheet.rows; r++) {
      const rowCells: Record<number, string> = {};
      let hasAny = false;
      for (let c = 0; c < activeSheet.cols; c++) {
        const val = activeSheet.cells[`${colToLetter(c)}${r + 1}`];
        if (val) {
          rowCells[c] = val;
          hasAny = true;
        }
      }
      if (hasAny) {
        rowData.push({ r, key: evaluateCell(`${colToLetter(sortCol)}${r + 1}`, activeSheet.cells), rowCells });
      }
    }
    rowData.sort((a, b) => {
      const na = Number(a.key), nb = Number(b.key);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return asc ? na - nb : nb - na;
      return asc ? String(a.key).localeCompare(String(b.key)) : String(b.key).localeCompare(String(a.key));
    });
    const nextCells: Record<string, string> = {};
    for (let c = 0; c < activeSheet.cols; c++) {
      const h = activeSheet.cells[`${colToLetter(c)}1`];
      if (h) nextCells[`${colToLetter(c)}1`] = h;
    }
    rowData.forEach((rd, idx) => {
      Object.entries(rd.rowCells).forEach(([c, v]) => {
        nextCells[`${colToLetter(Number(c))}${idx + 2}`] = v;
      });
    });
    setSheets((prev) => prev.map((sh, i) => (i === activeSheetIdx ? { ...sh, cells: nextCells } : sh)));
    showStatus(`Сортировка столбца ${colToLetter(sortCol)} (${asc ? 'А→Я' : 'Я→А'})`);
  };

  const chartSeries = useMemo(() => {
    if (!activeSheet) return [];
    const items: { label: string; value: number }[] = [];
    for (let r = 2; r <= Math.min(activeSheet.rows, 20); r++) {
      const lbl = String(evaluateCell(`A${r}`, activeSheet.cells) || '').trim();
      const val = Number(evaluateCell(`B${r}`, activeSheet.cells));
      if (lbl && !Number.isNaN(val) && lbl.toUpperCase() !== 'ИТОГО' && lbl.toUpperCase() !== 'СРЕДНЕЕ') {
        items.push({ label: lbl, value: Math.max(0, val) });
      }
    }
    return items.slice(0, 10);
  }, [activeSheet]);

  // ==================== POWERPOINT HELPERS ====================
  const updateSelectedEl = (patch: Partial<OfficeSlideElement>) => {
    if (!selectedElId) return;
    setSlides((prev) =>
      prev.map((sl, si) =>
        si !== activeSlideIdx ? sl : { ...sl, elements: sl.elements.map((e) => (e.id === selectedElId ? { ...e, ...patch } : e)) }
      )
    );
  };

  const addSlideElement = (el: Omit<OfficeSlideElement, 'id'>) => {
    const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setSlides((prev) => prev.map((sl, si) => (si === activeSlideIdx ? { ...sl, elements: [...sl.elements, { ...el, id }] } : sl)));
    setSelectedElId(id);
  };

  const applySlideLayout = (layout: 'title' | 'two_col' | 'comparison' | 'blank') => {
    const baseColor = activeSlide?.background === '#ffffff' ? '#0f172a' : '#f8fafc';
    const els: OfficeSlideElement[] =
      layout === 'title'
        ? [
            { id: `el_${Date.now()}_1`, type: 'text', x: 10, y: 26, w: 80, h: 18, text: 'Заголовок слайда', fontSize: 42, bold: true, align: 'center', color: baseColor },
            { id: `el_${Date.now()}_2`, type: 'text', x: 18, y: 50, w: 64, h: 14, text: 'Подзаголовок презентации', fontSize: 20, align: 'center', color: '#94a3b8' },
          ]
        : layout === 'two_col'
        ? [
            { id: `el_${Date.now()}_1`, type: 'text', x: 6, y: 8, w: 88, h: 12, text: 'Сравнение в два столбца', fontSize: 30, bold: true, color: baseColor },
            { id: `el_${Date.now()}_2`, type: 'shape', shape: 'rounded', x: 6, y: 25, w: 41, h: 62, text: 'Левая колонка\n• Пункт 1\n• Пункт 2', fontSize: 18, color: baseColor, bgColor: 'rgba(56,189,248,0.14)' },
            { id: `el_${Date.now()}_3`, type: 'shape', shape: 'rounded', x: 53, y: 25, w: 41, h: 62, text: 'Правая колонка\n• Пункт A\n• Пункт B', fontSize: 18, color: baseColor, bgColor: 'rgba(168,85,247,0.14)' },
          ]
        : layout === 'comparison'
        ? [
            { id: `el_${Date.now()}_1`, type: 'text', x: 6, y: 8, w: 88, h: 12, text: 'Показатели и SmartArt', fontSize: 30, bold: true, color: baseColor },
            { id: `el_${Date.now()}_2`, type: 'smartart', x: 6, y: 26, w: 88, h: 28, smartArtItems: ['Шаг 1: Идея', 'Шаг 2: Прототип', 'Шаг 3: Запуск'], bgColor: '#1e293b', color: '#ffffff' },
          ]
        : [];
    setSlides((prev) => prev.map((sl, si) => (si === activeSlideIdx ? { ...sl, elements: els } : sl)));
    setSelectedElId(els[0]?.id ?? null);
  };

  const handleInsertImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      if (mode === 'docs') {
        execDocCmd('insertHTML', `<img src="${src}" style="max-width:100%;border-radius:8px;margin:10px 0;" />`);
      } else if (mode === 'slides') {
        addSlideElement({ type: 'image', x: 20, y: 22, w: 48, h: 48, imageSrc: src });
      }
      showStatus('Изображение вставлено');
    };
    reader.readAsDataURL(file);
  };

  const renderSlideElementVisual = (el: OfficeSlideElement, interactive: boolean) => {
    const shapeClip =
      el.shape === 'circle'
        ? 'rounded-full'
        : el.shape === 'rounded' || el.shape === 'badge'
        ? 'rounded-2xl'
        : 'rounded-md';

    if (el.type === 'image' && el.imageSrc) {
      return <img src={el.imageSrc} alt="" className="w-full h-full object-contain pointer-events-none rounded-lg" />;
    }
    if (el.type === 'smartart') {
      const items = el.smartArtItems || ['Этап 1', 'Этап 2', 'Этап 3'];
      return (
        <div className="w-full h-full flex items-center gap-2 p-2">
          {items.map((it, idx) => (
            <React.Fragment key={idx}>
              <div
                className="flex-1 h-full rounded-xl flex items-center justify-center text-center px-2 font-bold text-sm shadow-lg border border-white/20"
                style={{ backgroundColor: el.bgColor || '#0284c7', color: el.color || '#ffffff' }}
              >
                {it}
              </div>
              {idx < items.length - 1 && <ArrowRight size={18} className="text-cyan-400 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      );
    }
    if (el.type === 'chart') {
      const pts = el.chartData || [
        { label: 'Q1', value: 42 },
        { label: 'Q2', value: 68 },
        { label: 'Q3', value: 85 },
        { label: 'Q4', value: 96 },
      ];
      const mx = Math.max(...pts.map((p) => p.value), 1);
      return (
        <div className="w-full h-full rounded-xl bg-black/30 border border-white/15 p-3 flex items-end justify-around gap-2">
          {pts.map((p, i) => (
            <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
              <span className="text-[10px] font-mono text-cyan-300">{p.value}</span>
              <div className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500 to-blue-400" style={{ height: `${Math.max(12, (p.value / mx) * 78)}%` }} />
              <span className="text-[10px] text-white/75">{p.label}</span>
            </div>
          ))}
        </div>
      );
    }
    if (el.type === 'table') {
      const rows = el.rows || [['Показатель', '2025', '2026'], ['Рост', '+42%', '+88%']];
      return (
        <table className="w-full h-full border-collapse text-xs bg-black/25 rounded-lg overflow-hidden">
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((cell, ci) => (
                  <td key={ci} className={`border border-white/20 px-2 py-1 ${ri === 0 ? 'font-bold bg-cyan-500/20' : ''}`} style={{ color: el.color || '#ffffff' }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (el.type === 'shape' && (el.shape === 'triangle' || el.shape === 'diamond' || el.shape === 'star' || el.shape === 'arrow_right')) {
      return (
        <div className="w-full h-full relative flex items-center justify-center">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            {el.shape === 'triangle' && <polygon points="50,4 96,96 4,96" fill={el.bgColor || '#38bdf8'} />}
            {el.shape === 'diamond' && <polygon points="50,4 96,50 50,96 4,50" fill={el.bgColor || '#a855f7'} />}
            {el.shape === 'star' && <polygon points="50,4 63,36 97,36 69,57 80,92 50,70 20,92 31,57 3,36 37,36" fill={el.bgColor || '#f59e0b'} />}
            {el.shape === 'arrow_right' && <polygon points="4,30 62,30 62,10 96,50 62,90 62,70 4,70" fill={el.bgColor || '#10b981'} />}
          </svg>
          {el.text && (
            <span className="relative z-10 text-center px-2 font-bold" style={{ fontSize: `${el.fontSize || 16}px`, color: el.color || '#ffffff' }}>
              {el.text}
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        className={`w-full h-full flex items-center px-2.5 py-1.5 whitespace-pre-wrap break-words ${shapeClip}`}
        style={{
          backgroundColor: el.bgColor || 'transparent',
          border: el.borderColor ? `2px solid ${el.borderColor}` : undefined,
          color: el.color || '#ffffff',
          fontSize: `${el.fontSize || 20}px`,
          fontWeight: el.bold ? 700 : 400,
          fontStyle: el.italic ? 'italic' : 'normal',
          justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
          textAlign: el.align || 'left',
          opacity: (el.opacity ?? 100) / 100,
          transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
        }}
      >
        {interactive && selectedElId === el.id ? (
          <textarea
            value={el.text || ''}
            onChange={(e) => updateSelectedEl({ text: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full h-full bg-transparent outline-none resize-none"
            style={{ textAlign: el.align || 'left', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
          />
        ) : (
          <span>{el.text}</span>
        )}
      </div>
    );
  };

  // Theme palette
  const shellBg = isDark ? 'bg-[#0b0e14] text-slate-100' : 'bg-slate-50 text-slate-900';
  const barBg = isDark ? 'bg-[#121621] border-white/10' : 'bg-white border-slate-200';
  const btnCls = isDark
    ? 'px-2 py-1 rounded-lg text-[11px] bg-white/[0.05] hover:bg-white/12 border border-white/10 text-white/85 flex items-center gap-1 cursor-pointer transition'
    : 'px-2 py-1 rounded-lg text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 flex items-center gap-1 cursor-pointer transition';

  const modeAccent = mode === 'docs' ? 'from-blue-600 to-sky-500' : mode === 'sheets' ? 'from-emerald-600 to-teal-500' : 'from-orange-600 to-rose-500';
  const exportFormats =
    mode === 'docs'
      ? [['docx', 'Microsoft Word (.docx)'], ['pdf', 'Печать / PDF'], ['html', 'Веб-страница (.html)'], ['md', 'Markdown (.md)'], ['rtf', 'Rich Text (.rtf)'], ['txt', 'Текст (.txt)']]
      : mode === 'sheets'
      ? [['xlsx', 'Microsoft Excel (.xlsx)'], ['csv', 'Таблица CSV (.csv)'], ['html', 'HTML-таблица'], ['pdf', 'Печать / PDF']]
      : [['pptx', 'PowerPoint (.pptx)'], ['pdf', 'Презентация PDF'], ['png', 'Слайд FullHD PNG'], ['html', 'Веб-презентация (.html)']];

  const RIBBON_TABS: { id: RibbonTab; label: string }[] = [
    { id: 'home', label: 'Главная' },
    { id: 'insert', label: 'Вставка' },
    { id: 'layout', label: mode === 'docs' ? 'Макет' : mode === 'sheets' ? 'Данные' : 'Дизайн' },
    { id: 'formulas', label: mode === 'docs' ? 'Ссылки' : mode === 'sheets' ? 'Формулы' : 'Анимации' },
    { id: 'review', label: 'Рецензирование' },
    { id: 'view', label: 'Вид' },
  ];

  // Presenter Fullscreen Overlay with Laser Pointer & Pen/Highlighter Canvas!
  if (presenting && activeSlide) {
    const mm = String(Math.floor(slideShowTimer / 60)).padStart(2, '0');
    const ss = String(slideShowTimer % 60).padStart(2, '0');
    return (
      <div
        className="fixed inset-0 z-[1500] bg-black flex flex-col select-none"
        onMouseMove={(e) => setLaserPos({ x: e.clientX, y: e.clientY })}
      >
        <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
          <div
            className="relative w-full max-w-[1440px] aspect-video rounded-xl overflow-hidden shadow-2xl"
            style={{ background: activeSlide.background }}
          >
            {activeSlide.elements.map((el) => (
              <div key={el.id} className="absolute" style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%` }}>
                {renderSlideElementVisual(el, false)}
              </div>
            ))}

            {/* Interactive Pen / Highlighter Overlay */}
            <canvas
              ref={presenterDrawCanvasRef}
              width={1280}
              height={720}
              onMouseDown={(e) => {
                if (presenterTool === 'laser') return;
                drawingPresenterRef.current = true;
                const c = presenterDrawCanvasRef.current;
                const ctx = c?.getContext('2d');
                if (!c || !ctx) return;
                const r = c.getBoundingClientRect();
                ctx.beginPath();
                ctx.moveTo(((e.clientX - r.left) / r.width) * 1280, ((e.clientY - r.top) / r.height) * 720);
              }}
              onMouseMove={(e) => {
                if (!drawingPresenterRef.current || presenterTool === 'laser') return;
                const c = presenterDrawCanvasRef.current;
                const ctx = c?.getContext('2d');
                if (!c || !ctx) return;
                const r = c.getBoundingClientRect();
                ctx.strokeStyle = presenterTool === 'highlighter' ? 'rgba(250,204,21,0.45)' : '#f43f5e';
                ctx.lineWidth = presenterTool === 'highlighter' ? 18 : 4;
                ctx.lineCap = 'round';
                ctx.lineTo(((e.clientX - r.left) / r.width) * 1280, ((e.clientY - r.top) / r.height) * 720);
                ctx.stroke();
              }}
              onMouseUp={() => { drawingPresenterRef.current = false; }}
              className={`absolute inset-0 w-full h-full ${presenterTool !== 'laser' ? 'cursor-crosshair' : 'pointer-events-none'}`}
            />
          </div>

          {/* Laser Pointer Dot */}
          {presenterTool === 'laser' && laserPos && (
            <div
              className="fixed w-3.5 h-3.5 rounded-full bg-rose-500 shadow-[0_0_16px_4px_rgba(244,63,94,0.9)] pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
              style={{ left: laserPos.x, top: laserPos.y }}
            />
          )}
        </div>

        {/* Presenter Control HUD */}
        <div className="px-5 py-2.5 bg-zinc-950/95 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-white text-xs">
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"><ChevronLeft size={16} /></button>
            <span className="font-mono font-bold">Слайд {activeSlideIdx + 1} / {slides.length}</span>
            <button onClick={() => setActiveSlideIdx((i) => Math.min(slides.length - 1, i + 1))} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"><ChevronRight size={16} /></button>
            <span className="font-mono text-cyan-400 ml-2">⏱ {mm}:{ss}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => setPresenterTool('laser')} className={`px-2.5 py-1 rounded-lg cursor-pointer ${presenterTool === 'laser' ? 'bg-rose-500 text-white' : 'bg-white/10'}`}>🔴 Лазер</button>
            <button onClick={() => setPresenterTool('pen')} className={`px-2.5 py-1 rounded-lg cursor-pointer ${presenterTool === 'pen' ? 'bg-cyan-500 text-black' : 'bg-white/10'}`}>✏️ Перо</button>
            <button onClick={() => setPresenterTool('highlighter')} className={`px-2.5 py-1 rounded-lg cursor-pointer ${presenterTool === 'highlighter' ? 'bg-amber-400 text-black' : 'bg-white/10'}`}>🖍 Маркер</button>
            <button
              onClick={() => presenterDrawCanvasRef.current?.getContext('2d')?.clearRect(0, 0, 1280, 720)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              Стереть
            </button>
            <button onClick={() => setShowPresenterNotes((v) => !v)} className={`px-2.5 py-1 rounded-lg cursor-pointer ${showPresenterNotes ? 'bg-purple-500 text-white' : 'bg-white/10'}`}>Заметки</button>
            <button onClick={() => setPresenting(false)} className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 font-bold cursor-pointer">Завершить (Esc)</button>
          </div>
        </div>
        {showPresenterNotes && (
          <div className="px-5 py-2 bg-zinc-900 border-t border-white/10 text-xs text-zinc-300">
            <strong>Заметки докладчика:</strong> {activeSlide.notes || '(Нет заметок к этому слайду)'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col overflow-hidden ${shellBg}`}>
      <input ref={fileInputRef} type="file" accept=".docx,.xlsx,.pptx,.odp,.odt,.csv,.md,.html,.rtf,.txt,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImportFile(f); e.target.value = ''; }} />
      <input ref={imgInsertInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleInsertImageFile(f); e.target.value = ''; }} />

      {/* Top Suite Bar: Mode Switcher (Word / Excel / PowerPoint) + Title + Open/Export */}
      <div className={`px-3 py-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${barBg}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              ['docs', 'Word · Docs', <FileText size={13} key="d" />, 'bg-blue-600 text-white'],
              ['sheets', 'Excel · Sheets', <Table2 size={13} key="s" />, 'bg-emerald-600 text-white'],
              ['slides', 'PowerPoint · Slides', <Presentation size={13} key="p" />, 'bg-orange-600 text-white'],
            ] as const
          ).map(([id, lbl, ic, activeCls]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                mode === id ? `${activeCls} shadow` : isDark ? 'bg-white/[0.05] text-white/70 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {ic} {lbl}
            </button>
          ))}
          <input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className={`ml-1 px-2.5 py-1 rounded-xl text-xs font-semibold border outline-none w-44 ${isDark ? 'bg-black/30 border-white/12 text-white' : 'bg-slate-50 border-slate-200'}`}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {statusMsg && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mr-1">
              <Check size={12} /> {statusMsg}
            </span>
          )}
          <button onClick={() => fileInputRef.current?.click()} disabled={busy} className={btnCls}>
            <FolderOpen size={12} className="text-amber-400" /> Открыть файл
          </button>
          {mode === 'slides' && (
            <button onClick={() => setPresenting(true)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-orange-500 hover:bg-orange-400 text-white flex items-center gap-1 cursor-pointer">
              <Play size={11} fill="currentColor" /> Показ F5
            </button>
          )}
          <div className="relative">
            <button onClick={() => setExportMenuOpen((v) => !v)} className={`px-3 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r ${modeAccent} text-white flex items-center gap-1 cursor-pointer shadow`}>
              <Download size={12} /> Сохранить / Экспорт
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-52 rounded-xl bg-zinc-900 border border-white/15 shadow-2xl p-1 z-50">
                {exportFormats.map(([fmt, lbl]) => (
                  <button key={fmt} onClick={() => void handleExport(fmt)} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-100 hover:bg-cyan-500/20 cursor-pointer">
                    {lbl}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Tab Microsoft Office Style Ribbon */}
      <div className={`border-b shrink-0 ${barBg}`}>
        <div className="px-3 pt-1 flex items-center gap-1 border-b border-white/10">
          {RIBBON_TABS.map((rt) => (
            <button
              key={rt.id}
              onClick={() => setRibbonTab(rt.id)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-t-lg transition cursor-pointer ${
                ribbonTab === rt.id
                  ? isDark ? 'bg-white/10 text-cyan-300 border-b-2 border-cyan-400' : 'bg-slate-100 text-blue-600 border-b-2 border-blue-500'
                  : 'opacity-65 hover:opacity-100'
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>

        {/* Dynamic Ribbon Controls */}
        <div className="px-3 py-1.5 flex flex-wrap items-center gap-1.5 min-h-[38px]">
          {/* ==================== WORD RIBBON ==================== */}
          {mode === 'docs' && ribbonTab === 'home' && (
            <>
              <select value={docFont} onChange={(e) => { setDocFont(e.target.value); execDocCmd('fontName', e.target.value); }} className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10 outline-none">
                {['Inter', 'Calibri', 'Arial', 'Times New Roman', 'Georgia', 'Consolas'].map((f) => <option key={f} value={f} className="bg-zinc-900 text-white">{f}</option>)}
              </select>
              <select value={docFontSize} onChange={(e) => { setDocFontSize(e.target.value); execDocCmd('fontSize', e.target.value); }} className="px-1.5 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10 outline-none">
                {[['1', '10pt'], ['2', '12pt'], ['3', '14pt'], ['4', '18pt'], ['5', '24pt'], ['6', '32pt'], ['7', '44pt']].map(([v, l]) => <option key={v} value={v} className="bg-zinc-900 text-white">{l}</option>)}
              </select>
              <button onClick={() => execDocCmd('bold')} className={btnCls} title="Жирный"><Bold size={12} /></button>
              <button onClick={() => execDocCmd('italic')} className={btnCls} title="Курсив"><Italic size={12} /></button>
              <button onClick={() => execDocCmd('underline')} className={btnCls} title="Подчёркнутый"><Underline size={12} /></button>
              <button onClick={() => execDocCmd('strikeThrough')} className={btnCls} title="Зачёркнутый"><Strikethrough size={12} /></button>
              <button onClick={() => execDocCmd('subscript')} className={btnCls} title="Подстрочный"><Subscript size={12} /></button>
              <button onClick={() => execDocCmd('superscript')} className={btnCls} title="Надстрочный"><Superscript size={12} /></button>
              <label className={btnCls} title="Цвет текста">A<input type="color" defaultValue="#0f172a" onChange={(e) => execDocCmd('foreColor', e.target.value)} className="w-3.5 h-3.5 bg-transparent cursor-pointer" /></label>
              <label className={btnCls} title="Маркер выделения"><Highlighter size={11} /><input type="color" defaultValue="#fef08a" onChange={(e) => execDocCmd('hiliteColor', e.target.value)} className="w-3.5 h-3.5 bg-transparent cursor-pointer" /></label>
              <button onClick={() => execDocCmd('formatBlock', 'H1')} className={btnCls}>H1</button>
              <button onClick={() => execDocCmd('formatBlock', 'H2')} className={btnCls}>H2</button>
              <button onClick={() => execDocCmd('formatBlock', 'P')} className={btnCls}>Обычный</button>
              <button onClick={() => execDocCmd('justifyLeft')} className={btnCls}><AlignLeft size={12} /></button>
              <button onClick={() => execDocCmd('justifyCenter')} className={btnCls}><AlignCenter size={12} /></button>
              <button onClick={() => execDocCmd('justifyRight')} className={btnCls}><AlignRight size={12} /></button>
              <button onClick={() => execDocCmd('justifyFull')} className={btnCls}><AlignJustify size={12} /></button>
              <button onClick={() => execDocCmd('insertUnorderedList')} className={btnCls}><List size={12} /></button>
              <button onClick={() => execDocCmd('insertOrderedList')} className={btnCls}><ListOrdered size={12} /></button>
              <button onClick={() => execDocCmd('undo')} className={btnCls}><Undo2 size={12} /></button>
              <button onClick={() => execDocCmd('redo')} className={btnCls}><Redo2 size={12} /></button>
            </>
          )}
          {mode === 'docs' && ribbonTab === 'insert' && (
            <>
              <button onClick={() => insertDocTable(3, 3)} className={btnCls}><Table2 size={12} /> Таблица 3×3</button>
              <button onClick={() => insertDocTable(5, 4)} className={btnCls}><Table2 size={12} /> Таблица 5×4</button>
              <button onClick={() => imgInsertInputRef.current?.click()} className={btnCls}><ImageIcon size={12} /> Картинка</button>
              <button onClick={() => { const u = window.prompt('URL ссылки:', 'https://'); if (u) execDocCmd('createLink', u); }} className={btnCls}><Link2 size={12} /> Ссылка</button>
              <button onClick={() => execDocCmd('insertHorizontalRule')} className={btnCls}><Minus size={12} /> Линия</button>
              <button onClick={() => execDocCmd('insertHTML', `<div style="border-top:2px dashed #94a3b8;margin:20px 0;text-align:center;font-size:10px;color:#64748b;">— Разрыв страницы —</div><p><br/></p>`)} className={btnCls}>Разрыв страницы</button>
              <button onClick={() => execDocCmd('insertHTML', `<span>${new Date().toLocaleDateString('ru-RU')}</span>`)} className={btnCls}>Дата</button>
              <button onClick={insertAutoTOC} className={btnCls}><Sparkles size={12} /> Авто-Оглавление</button>
            </>
          )}
          {mode === 'docs' && ribbonTab === 'layout' && (
            <>
              <button onClick={() => setDocLandscape((v) => !v)} className={btnCls}>Ориентация: {docLandscape ? 'Альбомная' : 'Книжная'}</button>
              <select value={docMargins} onChange={(e) => setDocMargins(e.target.value as 'normal' | 'narrow' | 'wide')} className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10">
                <option value="normal" className="bg-zinc-900">Поля: Обычные</option>
                <option value="narrow" className="bg-zinc-900">Поля: Узкие</option>
                <option value="wide" className="bg-zinc-900">Поля: Широкие</option>
              </select>
              <select value={docColumns} onChange={(e) => setDocColumns(Number(e.target.value) as 1 | 2 | 3)} className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10">
                <option value={1} className="bg-zinc-900">1 колонка</option>
                <option value={2} className="bg-zinc-900">2 колонки</option>
                <option value={3} className="bg-zinc-900">3 колонки</option>
              </select>
              <select value={docLineHeight} onChange={(e) => setDocLineHeight(e.target.value)} className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10">
                <option value="1.15" className="bg-zinc-900">Интервал 1.15</option>
                <option value="1.5" className="bg-zinc-900">Интервал 1.5</option>
                <option value="1.6" className="bg-zinc-900">Интервал 1.6</option>
                <option value="2.0" className="bg-zinc-900">Интервал 2.0</option>
              </select>
              <input value={docWatermark} onChange={(e) => setDocWatermark(e.target.value)} placeholder="Водяной знак (напр. ЧЕРНОВИК)..." className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10 w-44 outline-none" />
              <label className={btnCls}>Фон листа<input type="color" value={docPageBg} onChange={(e) => setDocPageBg(e.target.value)} className="w-3.5 h-3.5 bg-transparent cursor-pointer" /></label>
            </>
          )}
          {mode === 'docs' && ribbonTab === 'formulas' && (
            <>
              <button onClick={insertAutoTOC} className={btnCls}><Sparkles size={12} /> Собрать оглавление (H1-H3)</button>
              <input value={docHeader} onChange={(e) => setDocHeader(e.target.value)} placeholder="Верхний колонтитул..." className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10 w-44 outline-none" />
              <input value={docFooter} onChange={(e) => setDocFooter(e.target.value)} placeholder="Нижний колонтитул..." className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10 w-48 outline-none" />
            </>
          )}
          {mode === 'docs' && ribbonTab === 'review' && (
            <>
              <button onClick={() => setShowDocFind((v) => !v)} className={btnCls}><Search size={12} /> Найти и заменить</button>
              <button onClick={() => setShowComments((v) => !v)} className={btnCls}><MessageSquare size={12} /> Комментарии ({docComments.length})</button>
              <span className="text-[11px] opacity-70 ml-2">Слов: {docStats.words} · Символов: {docStats.chars} · Чтение: ~{docStats.readMin} мин</span>
            </>
          )}
          {mode === 'docs' && ribbonTab === 'view' && (
            <>
              <button onClick={() => setShowRuler((v) => !v)} className={btnCls}>Линейка: {showRuler ? 'ВКЛ' : 'ВЫКЛ'}</button>
              <button onClick={() => setDocZoom((z) => Math.max(70, z - 10))} className={btnCls}><ZoomOut size={12} /></button>
              <span className="text-xs font-mono">{docZoom}%</span>
              <button onClick={() => setDocZoom((z) => Math.min(150, z + 10))} className={btnCls}><ZoomIn size={12} /></button>
              <button onClick={() => void handleExport('pdf')} className={btnCls}><Printer size={12} /> Печать</button>
            </>
          )}

          {/* ==================== EXCEL RIBBON ==================== */}
          {mode === 'sheets' && ribbonTab === 'home' && (
            <>
              <button onClick={() => updateCellStyle({ bold: !activeSheet?.styles?.[selectedCell]?.bold })} className={btnCls}><Bold size={12} /></button>
              <button onClick={() => updateCellStyle({ italic: !activeSheet?.styles?.[selectedCell]?.italic })} className={btnCls}><Italic size={12} /></button>
              <button onClick={() => updateCellStyle({ underline: !activeSheet?.styles?.[selectedCell]?.underline })} className={btnCls}><Underline size={12} /></button>
              <button onClick={() => updateCellStyle({ align: 'left' })} className={btnCls}><AlignLeft size={12} /></button>
              <button onClick={() => updateCellStyle({ align: 'center' })} className={btnCls}><AlignCenter size={12} /></button>
              <button onClick={() => updateCellStyle({ align: 'right' })} className={btnCls}><AlignRight size={12} /></button>
              <label className={btnCls} title="Заливка ячейки">Фон<input type="color" defaultValue="#1e293b" onChange={(e) => updateCellStyle({ bg: e.target.value })} className="w-3.5 h-3.5 cursor-pointer" /></label>
              <label className={btnCls} title="Цвет текста">Текст<input type="color" defaultValue="#38bdf8" onChange={(e) => updateCellStyle({ color: e.target.value })} className="w-3.5 h-3.5 cursor-pointer" /></label>
              <select value={activeSheet?.styles?.[selectedCell]?.format || 'text'} onChange={(e) => updateCellStyle({ format: e.target.value as CellMeta['format'] })} className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10">
                <option value="text" className="bg-zinc-900">Общий</option>
                <option value="number" className="bg-zinc-900">Число (1 234)</option>
                <option value="currency" className="bg-zinc-900">Валюта (₽)</option>
                <option value="usd" className="bg-zinc-900">Доллар ($)</option>
                <option value="percent" className="bg-zinc-900">Процент (%)</option>
              </select>
              <select value={activeSheet?.styles?.[selectedCell]?.border || 'none'} onChange={(e) => updateCellStyle({ border: e.target.value as CellMeta['border'] })} className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10">
                <option value="none" className="bg-zinc-900">Граница: Нет</option>
                <option value="thin" className="bg-zinc-900">Тонкая рамка</option>
                <option value="thick" className="bg-zinc-900">Толстая рамка</option>
                <option value="bottom" className="bg-zinc-900">Нижняя черта</option>
              </select>
              <button onClick={() => updateCellStyle({ colSpan: activeSheet?.styles?.[selectedCell]?.colSpan === 2 ? 1 : 2 })} className={btnCls}>Объединить (2 кол.)</button>
              <button onClick={() => setCondFormatEnabled((v) => !v)} className={`${btnCls} ${condFormatEnabled ? 'border-emerald-400 text-emerald-300' : ''}`}>
                Условное формат.
              </button>
            </>
          )}
          {mode === 'sheets' && ribbonTab === 'insert' && (
            <>
              <button onClick={() => { setShowChart(true); setChartType('bar'); }} className={btnCls}><BarChart3 size={12} /> Столбчатая</button>
              <button onClick={() => { setShowChart(true); setChartType('hbar'); }} className={btnCls}><BarChart3 size={12} /> Линейчатая</button>
              <button onClick={() => { setShowChart(true); setChartType('line'); }} className={btnCls}><TrendingUp size={12} /> Линейная</button>
              <button onClick={() => { setShowChart(true); setChartType('area'); }} className={btnCls}><TrendingUp size={12} /> С областями</button>
              <button onClick={() => { setShowChart(true); setChartType('pie'); }} className={btnCls}><PieChart size={12} /> Круговая</button>
              <button onClick={() => { setShowChart(true); setChartType('donut'); }} className={btnCls}><PieChart size={12} /> Кольцевая</button>
              <button onClick={() => setSheets((p) => p.map((s, i) => (i === activeSheetIdx ? { ...s, rows: s.rows + 5 } : s)))} className={btnCls}><Rows size={12} /> +5 строк</button>
              <button onClick={() => setSheets((p) => p.map((s, i) => (i === activeSheetIdx ? { ...s, cols: Math.min(26, s.cols + 2) } : s)))} className={btnCls}><Columns size={12} /> +2 столбца</button>
            </>
          )}
          {mode === 'sheets' && ribbonTab === 'layout' && (
            <>
              <button onClick={() => sortActiveColumn(true)} className={btnCls}><ArrowUp size={12} /> Сорт А→Я</button>
              <button onClick={() => sortActiveColumn(false)} className={btnCls}><ArrowDown size={12} /> Сорт Я→А</button>
              <button onClick={() => setShowAutoFilter((v) => !v)} className={btnCls}><Filter size={12} /> Автофильтр</button>
              <button
                onClick={() => setSheets((p) => p.map((s, i) => (i === activeSheetIdx ? { ...s, freezeHeader: !s.freezeHeader } : s)))}
                className={btnCls}
              >
                <Lock size={12} /> Закрепить шапку: {activeSheet?.freezeHeader ? 'ДА' : 'НЕТ'}
              </button>
              <button onClick={() => setCondFormatEnabled((v) => !v)} className={btnCls}>Тепловая подсветка (+ / -)</button>
            </>
          )}
          {mode === 'sheets' && (ribbonTab === 'formulas' || ribbonTab === 'review' || ribbonTab === 'view') && (
            <>
              <button onClick={() => setShowFormulaPicker((v) => !v)} className={btnCls}><Sparkles size={12} /> Мастер 35+ формул</button>
              <button onClick={() => { updateCell(selectedCell, '=SUM(B2:B5)'); setFormulaInput('=SUM(B2:B5)'); }} className={btnCls}>Σ Автосумма</button>
              <button onClick={() => { updateCell(selectedCell, '=AVERAGE(B2:B5)'); setFormulaInput('=AVERAGE(B2:B5)'); }} className={btnCls}>Среднее</button>
              <button onClick={() => { updateCell(selectedCell, '=IF(D2>=0,"OK","Минус")'); setFormulaInput('=IF(D2>=0,"OK","Минус")'); }} className={btnCls}>ЕСЛИ (IF)</button>
              <button onClick={() => { updateCell(selectedCell, '=VLOOKUP("ПО и Облако",A2:C5,3)'); setFormulaInput('=VLOOKUP("ПО и Облако",A2:C5,3)'); }} className={btnCls}>ВПР (VLOOKUP)</button>
              <button onClick={() => setShowChart((v) => !v)} className={btnCls}><BarChart3 size={12} /> Панель графиков</button>
            </>
          )}

          {/* ==================== POWERPOINT RIBBON ==================== */}
          {mode === 'slides' && ribbonTab === 'home' && (
            <>
              <button onClick={() => {
                const ns: OfficeSlide = { id: `sl_${Date.now()}`, title: `Слайд ${slides.length + 1}`, background: activeSlide?.background || '#0f172a', transition: 'fade', notes: '', elements: [{ id: `el_${Date.now()}`, type: 'text', x: 8, y: 12, w: 84, h: 14, text: `Новый слайд ${slides.length + 1}`, fontSize: 34, bold: true, color: '#ffffff' }] };
                setSlides((p) => [...p, ns]);
                setActiveSlideIdx(slides.length);
              }} className={btnCls}><Plus size={12} /> Новый слайд</button>
              <button onClick={() => applySlideLayout('title')} className={btnCls}><Layout size={12} /> Титульный</button>
              <button onClick={() => applySlideLayout('two_col')} className={btnCls}>2 столбца</button>
              <button onClick={() => applySlideLayout('comparison')} className={btnCls}>SmartArt макет</button>
              <button onClick={() => addSlideElement({ type: 'text', x: 12, y: 30, w: 50, h: 14, text: 'Текстовый блок', fontSize: 22, color: '#ffffff' })} className={btnCls}><Type size={12} /> Текст</button>
              {selectedEl && (
                <>
                  <button onClick={() => updateSelectedEl({ bold: !selectedEl.bold })} className={btnCls}><Bold size={12} /></button>
                  <button onClick={() => updateSelectedEl({ italic: !selectedEl.italic })} className={btnCls}><Italic size={12} /></button>
                  <button onClick={() => updateSelectedEl({ fontSize: Math.max(10, (selectedEl.fontSize || 20) - 2) })} className={btnCls}>A-</button>
                  <button onClick={() => updateSelectedEl({ fontSize: Math.min(72, (selectedEl.fontSize || 20) + 2) })} className={btnCls}>A+</button>
                  <label className={btnCls}>Цвет<input type="color" value={selectedEl.color || '#ffffff'} onChange={(e) => updateSelectedEl({ color: e.target.value })} className="w-3.5 h-3.5 cursor-pointer" /></label>
                  <label className={btnCls}>Заливка<input type="color" value={selectedEl.bgColor?.startsWith('#') ? selectedEl.bgColor : '#38bdf8'} onChange={(e) => updateSelectedEl({ bgColor: e.target.value })} className="w-3.5 h-3.5 cursor-pointer" /></label>
                  <button onClick={() => {
                    setSlides((p) => p.map((s, si) => (si === activeSlideIdx ? { ...s, elements: s.elements.filter((e) => e.id !== selectedEl.id) } : s)));
                    setSelectedElId(null);
                  }} className="px-2 py-1 rounded-lg text-[11px] bg-rose-500/20 text-rose-300 border border-rose-400/30 cursor-pointer"><Trash2 size={12} /></button>
                </>
              )}
            </>
          )}
          {mode === 'slides' && ribbonTab === 'insert' && (
            <>
              <button onClick={() => imgInsertInputRef.current?.click()} className={btnCls}><ImageIcon size={12} /> Картинка</button>
              <button onClick={() => addSlideElement({ type: 'shape', shape: 'rounded', x: 25, y: 30, w: 30, h: 18, text: 'Блок', bgColor: '#0284c7', color: '#ffffff' })} className={btnCls}><Square size={12} /> Прямоуг.</button>
              <button onClick={() => addSlideElement({ type: 'shape', shape: 'circle', x: 35, y: 30, w: 20, h: 32, text: 'Круг', bgColor: '#7c3aed', color: '#ffffff' })} className={btnCls}><Circle size={12} /> Круг</button>
              <button onClick={() => addSlideElement({ type: 'shape', shape: 'triangle', x: 35, y: 30, w: 22, h: 32, text: '', bgColor: '#0ea5e9' })} className={btnCls}><Triangle size={12} /> Треуг.</button>
              <button onClick={() => addSlideElement({ type: 'shape', shape: 'diamond', x: 35, y: 30, w: 22, h: 32, text: 'Ромб', bgColor: '#a855f7' })} className={btnCls}>◆ Ромб</button>
              <button onClick={() => addSlideElement({ type: 'shape', shape: 'star', x: 35, y: 30, w: 20, h: 32, text: '', bgColor: '#f59e0b' })} className={btnCls}><Star size={12} /> Звезда</button>
              <button onClick={() => addSlideElement({ type: 'shape', shape: 'arrow_right', x: 25, y: 40, w: 28, h: 18, text: 'Далее', bgColor: '#10b981' })} className={btnCls}><ArrowRight size={12} /> Стрелка</button>
              <button onClick={() => addSlideElement({ type: 'smartart', x: 8, y: 34, w: 84, h: 28, smartArtItems: ['Анализ', 'План', 'Запуск', 'Рост'], bgColor: '#0369a1', color: '#ffffff' })} className={btnCls}><Layers size={12} /> SmartArt</button>
              <button onClick={() => addSlideElement({ type: 'chart', x: 18, y: 24, w: 56, h: 50 })} className={btnCls}><BarChart3 size={12} /> График</button>
              <button onClick={() => addSlideElement({ type: 'table', x: 12, y: 30, w: 68, h: 34, rows: [['Этап', 'План', 'Факт'], ['Дизайн', '100%', '100%'], ['Релиз', '90%', '95%']] })} className={btnCls}><Table2 size={12} /> Таблица</button>
            </>
          )}
          {mode === 'slides' && ribbonTab === 'layout' && (
            <>
              <span className="text-[11px] opacity-65 mr-1">Темы слайда:</span>
              {SLIDE_THEMES.map((th) => (
                <button
                  key={th.name}
                  onClick={() => setSlides((p) => p.map((sl, si) => (si === activeSlideIdx ? { ...sl, background: th.bg } : sl)))}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-white/20 text-white cursor-pointer"
                  style={{ background: th.bg }}
                >
                  {th.name}
                </button>
              ))}
            </>
          )}
          {mode === 'slides' && (ribbonTab === 'formulas' || ribbonTab === 'review' || ribbonTab === 'view') && (
            <>
              <span className="text-[11px] opacity-65">Переход слайда:</span>
              <select
                value={activeSlide?.transition || 'fade'}
                onChange={(e) => setSlides((p) => p.map((s, si) => (si === activeSlideIdx ? { ...s, transition: e.target.value as OfficeSlide['transition'] } : s)))}
                className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10"
              >
                <option value="none" className="bg-zinc-900">Нет</option>
                <option value="fade" className="bg-zinc-900">Плавное появление</option>
                <option value="slide" className="bg-zinc-900">Сдвиг</option>
                <option value="zoom" className="bg-zinc-900">Масштаб</option>
                <option value="flip" className="bg-zinc-900">Переворот</option>
              </select>
              {selectedEl && (
                <>
                  <span className="text-[11px] opacity-65 ml-2">Анимация объекта:</span>
                  <select
                    value={selectedEl.anim || 'none'}
                    onChange={(e) => updateSelectedEl({ anim: e.target.value as SlideAnimKind })}
                    className="px-2 py-1 rounded-lg text-[11px] bg-white/10 border border-white/10"
                  >
                    <option value="none" className="bg-zinc-900">Без анимации</option>
                    <option value="fade_in" className="bg-zinc-900">Проявление</option>
                    <option value="fly_left" className="bg-zinc-900">Вылет слева</option>
                    <option value="fly_up" className="bg-zinc-900">Вылет снизу</option>
                    <option value="zoom_in" className="bg-zinc-900">Увеличение</option>
                    <option value="bounce" className="bg-zinc-900">Пружина</option>
                  </select>
                </>
              )}
              <button onClick={() => setPresenting(true)} className="ml-auto px-3 py-1 rounded-lg text-[11px] font-bold bg-orange-500 text-white cursor-pointer flex items-center gap-1">
                <Play size={11} /> Начать показ (F5 · Лазер + Маркер)
              </button>
            </>
          )}
        </div>
      </div>

      {/* ==================== MAIN WORKSPACE ==================== */}
      {mode === 'docs' && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {showDocFind && (
              <div className={`px-3 py-1.5 border-b flex items-center gap-2 text-xs ${barBg}`}>
                <input value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="Найти..." className="px-2 py-1 rounded-lg bg-white/10 border border-white/10 outline-none" />
                <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Заменить на..." className="px-2 py-1 rounded-lg bg-white/10 border border-white/10 outline-none" />
                <button onClick={handleFindReplaceDoc} className="px-2.5 py-1 rounded-lg bg-blue-500 text-white font-semibold cursor-pointer">Заменить все</button>
                <button onClick={() => setShowDocFind(false)} className="ml-auto opacity-60 cursor-pointer"><X size={13} /></button>
              </div>
            )}

            {showRuler && (
              <div className="px-6 py-1 bg-black/20 border-b border-white/10 flex justify-center shrink-0">
                <div className="w-full max-w-[780px] flex justify-between text-[9px] font-mono opacity-45 select-none">
                  {Array.from({ length: 17 }).map((_, i) => <span key={i}>{i}</span>)}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-black/15">
              <div
                className="relative shadow-2xl rounded-sm text-slate-900 transition-all"
                style={{
                  width: docLandscape ? '1020px' : '794px',
                  minHeight: docLandscape ? '680px' : '1020px',
                  transform: `scale(${docZoom / 100})`,
                  transformOrigin: 'top center',
                  backgroundColor: docPageBg,
                  padding: docMargins === 'narrow' ? '28px 34px' : docMargins === 'wide' ? '64px 86px' : '48px 60px',
                }}
              >
                {docWatermark && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                    <span className="text-6xl font-black uppercase tracking-widest text-slate-900/10 -rotate-35 select-none">
                      {docWatermark}
                    </span>
                  </div>
                )}
                {docHeader && <div className="text-[11px] text-slate-400 border-b border-slate-200 pb-1 mb-4">{docHeader}</div>}
                <div
                  ref={docEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => { if (docEditorRef.current) setDocHtml(docEditorRef.current.innerHTML); }}
                  className="outline-none prose prose-sm max-w-none relative z-10 min-h-[820px]"
                  style={{ columnCount: docColumns, columnGap: '28px', lineHeight: docLineHeight, fontFamily: docFont }}
                />
                {docFooter && <div className="text-[11px] text-slate-400 border-t border-slate-200 pt-2 mt-6 text-center">{docFooter}</div>}
              </div>
            </div>
          </div>

          {showComments && (
            <div className={`w-64 shrink-0 border-l p-3 flex flex-col gap-2 ${barBg}`}>
              <div className="text-xs font-bold flex items-center justify-between">
                <span>Комментарии ({docComments.length})</span>
                <button onClick={() => setShowComments(false)} className="cursor-pointer"><X size={13} /></button>
              </div>
              <div className="flex gap-1">
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Добавить заметку..." className="flex-1 px-2 py-1 rounded-lg text-xs bg-white/10 border border-white/10 outline-none" />
                <button
                  onClick={() => {
                    if (!newComment.trim()) return;
                    setDocComments((p) => [{ id: `cm_${Date.now()}`, author: 'Вы', text: newComment.trim(), time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }, ...p]);
                    setNewComment('');
                  }}
                  className="px-2 py-1 rounded-lg bg-cyan-500 text-black text-xs font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {docComments.map((c) => (
                  <div key={c.id} className="p-2 rounded-xl bg-white/5 border border-white/10 text-xs">
                    <div className="flex justify-between text-[10px] opacity-60"><span>{c.author}</span><span>{c.time}</span></div>
                    <div className="mt-1">{c.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== EXCEL WORKSPACE ==================== */}
      {mode === 'sheets' && activeSheet && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Formula Bar */}
          <div className={`px-3 py-1.5 border-b flex items-center gap-2 text-xs shrink-0 ${barBg}`}>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold min-w-[44px] text-center">{selectedCell}</span>
            <span className="font-serif italic opacity-55">fx</span>
            <input
              value={formulaInput}
              onChange={(e) => { setFormulaInput(e.target.value); updateCell(selectedCell, e.target.value); }}
              placeholder="Введите значение или формулу (=SUM, =AVERAGE, =IF, =VLOOKUP, =COUNTIF, =MEDIAN...)"
              className="flex-1 px-2.5 py-1 rounded-lg bg-black/25 border border-white/10 font-mono text-xs outline-none"
            />
            {showAutoFilter && (
              <input
                value={autoFilterQuery}
                onChange={(e) => setAutoFilterQuery(e.target.value)}
                placeholder="Автофильтр строк..."
                className="w-40 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-xs outline-none"
              />
            )}
          </div>

          {showFormulaPicker && (
            <div className={`px-3 py-2 border-b flex flex-wrap gap-1.5 shrink-0 ${barBg}`}>
              {FORMULA_LIBRARY.map((f) => (
                <button
                  key={f.fn}
                  onClick={() => { updateCell(selectedCell, f.fn); setFormulaInput(f.fn); setShowFormulaPicker(false); }}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                  title={f.desc}
                >
                  {f.fn} <span className="opacity-65">({f.desc})</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Spreadsheet Grid */}
            <div className="flex-1 overflow-auto">
              <table className="border-collapse text-xs font-mono min-w-full">
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-20 w-10 bg-zinc-900 border border-white/15 text-[10px] text-white/50">#</th>
                    {Array.from({ length: activeSheet.cols }).map((_, c) => (
                      <th key={c} className="sticky top-0 z-10 min-w-[105px] px-2 py-1 bg-zinc-900 border border-white/15 text-[10px] text-cyan-300">
                        {colToLetter(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: activeSheet.rows }).map((_, r) => {
                    if (showAutoFilter && autoFilterQuery.trim() && r > 0) {
                      const rowText = Array.from({ length: activeSheet.cols })
                        .map((__, c) => String(evaluateCell(`${colToLetter(c)}${r + 1}`, activeSheet.cells)))
                        .join(' ')
                        .toLowerCase();
                      if (!rowText.includes(autoFilterQuery.trim().toLowerCase())) return null;
                    }
                    return (
                      <tr key={r} className={activeSheet.freezeHeader && r === 0 ? 'sticky top-6 z-10' : ''}>
                        <td className="sticky left-0 z-10 bg-zinc-900/95 border border-white/15 text-center text-[10px] text-white/45 select-none">
                          {r + 1}
                        </td>
                        {Array.from({ length: activeSheet.cols }).map((__, c) => {
                          const cid = `${colToLetter(c)}${r + 1}`;
                          const isSel = selectedCell === cid;
                          const st = activeSheet.styles?.[cid];
                          const evaluated = evaluateCell(cid, activeSheet.cells);
                          const display = formatCellValue(evaluated, st);
                          const condBg =
                            condFormatEnabled && typeof evaluated === 'number' && r > 0
                              ? evaluated < 0
                                ? 'rgba(244,63,94,0.28)'
                                : evaluated > 10000
                                ? 'rgba(16,185,129,0.22)'
                                : undefined
                              : undefined;
                          const borderStyle =
                            st?.border === 'thick'
                              ? '2px solid #38bdf8'
                              : st?.border === 'thin'
                              ? '1px solid #94a3b8'
                              : undefined;

                          return (
                            <td
                              key={cid}
                              colSpan={st?.colSpan || 1}
                              onClick={() => setSelectedCell(cid)}
                              className={`border border-white/10 px-2 py-1 cursor-cell select-none ${isSel ? 'ring-2 ring-inset ring-emerald-400 bg-emerald-500/10' : ''}`}
                              style={{
                                backgroundColor: st?.bg || condBg,
                                color: st?.color,
                                fontWeight: st?.bold ? 700 : 400,
                                fontStyle: st?.italic ? 'italic' : 'normal',
                                textDecoration: st?.underline ? 'underline' : undefined,
                                textAlign: st?.align || (typeof evaluated === 'number' ? 'right' : 'left'),
                                border: borderStyle,
                                borderBottom: st?.border === 'bottom' ? '2px solid #38bdf8' : undefined,
                              }}
                            >
                              {isSel ? (
                                <input
                                  value={activeSheet.cells[cid] ?? ''}
                                  onChange={(e) => { updateCell(cid, e.target.value); setFormulaInput(e.target.value); }}
                                  className="w-full bg-transparent outline-none text-inherit"
                                  autoFocus
                                />
                              ) : (
                                <span className="block truncate max-w-[180px]">{display}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 6-Type Live Chart Sidebar */}
            {showChart && (
              <div className={`w-72 shrink-0 border-l p-3 flex flex-col gap-3 ${barBg}`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Диаграмма ({chartType.toUpperCase()})</span>
                  <button onClick={() => setShowChart(false)} className="cursor-pointer"><X size={13} /></button>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  {(['bar', 'hbar', 'line', 'area', 'pie', 'donut'] as const).map((ct) => (
                    <button key={ct} onClick={() => setChartType(ct)} className={`py-1 rounded-lg border cursor-pointer ${chartType === ct ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200' : 'bg-white/5 border-white/10'}`}>
                      {ct.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="flex-1 rounded-2xl bg-black/30 border border-white/10 p-3 flex items-center justify-center">
                  {chartSeries.length === 0 ? (
                    <span className="text-xs opacity-50">Нет числовых данных в A2:B10</span>
                  ) : chartType === 'pie' || chartType === 'donut' ? (
                    (() => {
                      const total = chartSeries.reduce((a, b) => a + b.value, 0) || 1;
                      const colors = ['#38bdf8', '#34d399', '#f59e0b', '#a855f7', '#f43f5e', '#22d3ee'];
                      let cum = 0;
                      return (
                        <svg viewBox="0 0 120 120" className="w-44 h-44 -rotate-90">
                          {chartSeries.map((pt, idx) => {
                            const frac = pt.value / total;
                            const dash = frac * 251.2;
                            const el = (
                              <circle
                                key={idx}
                                cx="60" cy="60" r="40"
                                fill="none"
                                stroke={colors[idx % colors.length]}
                                strokeWidth={chartType === 'donut' ? 18 : 38}
                                strokeDasharray={`${dash} 251.2`}
                                strokeDashoffset={-cum * 251.2}
                              />
                            );
                            cum += frac;
                            return el;
                          })}
                        </svg>
                      );
                    })()
                  ) : chartType === 'line' || chartType === 'area' ? (
                    (() => {
                      const mx = Math.max(...chartSeries.map((x) => x.value), 1);
                      const pts = chartSeries.map((x, i) => `${(i / Math.max(1, chartSeries.length - 1)) * 200 + 10},${130 - (x.value / mx) * 105}`).join(' ');
                      return (
                        <svg viewBox="0 0 220 150" className="w-full h-44">
                          {chartType === 'area' && <polygon points={`10,130 ${pts} 210,130`} fill="rgba(56,189,248,0.25)" />}
                          <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" />
                        </svg>
                      );
                    })()
                  ) : (
                    <div className="w-full h-48 flex items-end justify-around gap-1.5">
                      {chartSeries.map((pt, i) => {
                        const mx = Math.max(...chartSeries.map((x) => x.value), 1);
                        return (
                          <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                            <div className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-cyan-400" style={{ height: `${Math.max(8, (pt.value / mx) * 80)}%` }} />
                            <span className="text-[8px] truncate max-w-[44px] opacity-75">{pt.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sheet Tabs Footer */}
          <div className={`px-3 py-1.5 border-t flex items-center gap-1.5 shrink-0 ${barBg}`}>
            {sheets.map((sh, idx) => (
              <button
                key={sh.name + idx}
                onClick={() => setActiveSheetIdx(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  idx === activeSheetIdx ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-white/5 opacity-65'
                }`}
              >
                {sh.name}
              </button>
            ))}
            <button
              onClick={() => {
                setSheets((p) => [...p, { name: `Лист ${p.length + 1}`, rows: 26, cols: 10, cells: {} }]);
                setActiveSheetIdx(sheets.length);
              }}
              className={btnCls}
            >
              <Plus size={11} /> Лист
            </button>
          </div>
        </div>
      )}

      {/* ==================== POWERPOINT WORKSPACE ==================== */}
      {mode === 'slides' && activeSlide && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Slide Filmstrip */}
          <div className={`w-44 shrink-0 border-r p-2.5 overflow-y-auto space-y-2 ${barBg}`}>
            {slides.map((sl, idx) => (
              <div
                key={sl.id}
                onClick={() => { setActiveSlideIdx(idx); setSelectedElId(sl.elements[0]?.id ?? null); }}
                className={`p-1.5 rounded-xl border cursor-pointer transition ${
                  idx === activeSlideIdx ? 'border-orange-400 bg-orange-500/15' : 'border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-mono font-bold">#{idx + 1}</span>
                  {slides.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSlides((p) => p.filter((_, i) => i !== idx));
                        setActiveSlideIdx(Math.max(0, idx - 1));
                      }}
                      className="text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
                <div className="w-full aspect-video rounded-md overflow-hidden border border-white/15 flex items-center justify-center text-[9px] text-white font-bold px-1 text-center" style={{ background: sl.background }}>
                  <span className="truncate">{sl.elements[0]?.text || sl.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Center Slide Canvas + Notes */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 p-5 flex items-center justify-center bg-black/25 overflow-hidden">
              <div
                ref={slideCanvasRef}
                onClick={() => setSelectedElId(null)}
                className="relative w-full max-w-[920px] aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/15"
                style={{ background: activeSlide.background }}
              >
                {activeSlide.elements.map((el) => {
                  const isSel = selectedElId === el.id;
                  return (
                    <div
                      key={el.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedElId(el.id); }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedElId(el.id);
                        setDragState({ id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.w, origH: el.h, mode: 'move' });
                      }}
                      className={`absolute cursor-move ${isSel ? 'ring-2 ring-cyan-400' : 'hover:ring-1 hover:ring-white/40'}`}
                      style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%` }}
                    >
                      {renderSlideElementVisual(el, true)}
                      {isSel && (
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDragState({ id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.w, origH: el.h, mode: 'resize' });
                          }}
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-white cursor-nwse-resize"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`px-4 py-2 border-t flex items-center gap-2 shrink-0 ${barBg}`}>
              <span className="text-[10px] font-bold uppercase opacity-60 shrink-0">Заметки докладчика:</span>
              <input
                value={activeSlide.notes}
                onChange={(e) => setSlides((p) => p.map((s, i) => (i === activeSlideIdx ? { ...s, notes: e.target.value } : s)))}
                placeholder="Подсказки для выступления (видны в режиме F5)..."
                className="flex-1 bg-transparent text-xs outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className={`px-3 py-1 bg-gradient-to-r ${modeAccent} text-white text-[10px] font-mono flex items-center justify-between shrink-0`}>
        <span>Luma Office Studio 1.5.2 Pro · Автосохранение ВКЛ</span>
        <span>
          {mode === 'docs'
            ? `Word · Слов: ${docStats.words} · Масштаб ${docZoom}%`
            : mode === 'sheets'
            ? `Excel · Лист: ${activeSheet?.name} · Ячейка ${selectedCell} · 35+ формул`
            : `PowerPoint · Слайд ${activeSlideIdx + 1}/${slides.length} · F5 Показ`}
        </span>
      </div>
    </div>
  );
};
