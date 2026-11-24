import React from 'react';

export type OfficeAppMode = 'docs' | 'sheets' | 'slides';

export type SlideShapeKind =
  | 'rect'
  | 'rounded'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'arrow_right'
  | 'arrow_left'
  | 'arrow_up'
  | 'arrow_down'
  | 'star'
  | 'heart'
  | 'pentagon'
  | 'hexagon'
  | 'callout'
  | 'banner'
  | 'badge'
  | 'cylinder'
  | 'line';

export type SlideAnimKind =
  | 'none'
  | 'appear'
  | 'fade_in'
  | 'fly_left'
  | 'fly_right'
  | 'fly_up'
  | 'zoom_in'
  | 'spin'
  | 'bounce'
  | 'pulse'
  | 'sway';

export type SlideTransitionKind =
  | 'none'
  | 'morph'
  | 'fade'
  | 'push'
  | 'wipe'
  | 'slide'
  | 'zoom'
  | 'flip'
  | 'blinds'
  | 'flash';

export interface SlideStroke {
  id: string;
  color: string;
  width: number;
  opacity: number;
  points: { x: number; y: number }[];
}

export interface OfficeSlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'table' | 'smartart' | 'chart' | 'wordart';
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textShadow?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  rotate?: number;
  shadow?: boolean;
  imageSrc?: string;
  shape?: SlideShapeKind;
  anim?: SlideAnimKind;
  animOrder?: number;
  animDelay?: number;
  rows?: string[][];
  smartArtLayout?: 'list' | 'process' | 'cycle' | 'hierarchy' | 'matrix' | 'pyramid';
  smartArtItems?: string[];
  chartType?: 'bar' | 'line' | 'pie';
  chartTitle?: string;
  chartData?: { label: string; value: number }[];
}

export interface OfficeSlide {
  id: string;
  title: string;
  background: string;
  transition: SlideTransitionKind;
  transitionDuration?: number;
  autoAdvanceSec?: number;
  notes: string;
  elements: OfficeSlideElement[];
  drawings?: SlideStroke[];
}

export interface CellMeta {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  fontFamily?: string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  bg?: string;
  color?: string;
  border?: 'none' | 'all' | 'thin' | 'thick' | 'bottom' | 'outer';
  format?: 'general' | 'text' | 'number' | 'currency' | 'usd' | 'eur' | 'percent' | 'date';
  decimals?: number;
  wrap?: boolean;
  colSpan?: number;
  note?: string;
  validationList?: string[];
  sparklineRange?: string;
}

export interface ExcelChartDef {
  id: string;
  type: 'bar' | 'hbar' | 'line' | 'area' | 'pie' | 'donut';
  title: string;
  labelCol: number;
  valueCol: number;
  startRow: number;
  endRow: number;
}

export interface OfficeSheet {
  name: string;
  tabColor?: string;
  cells: Record<string, string>;
  styles?: Record<string, CellMeta>;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  rows: number;
  cols: number;
  freezeHeader?: boolean;
  freezeFirstCol?: boolean;
  protected?: boolean;
  charts?: ExcelChartDef[];
}

export interface DocComment {
  id: string;
  author: string;
  quote?: string;
  text: string;
  time: string;
  resolved?: boolean;
}

// ==================== AUTHENTIC MS OFFICE RIBBON UI PRIMITIVES ====================

export const RibbonGroup: React.FC<{
  label: string;
  isDark?: boolean;
  children: React.ReactNode;
}> = ({ label, isDark, children }) => (
  <div
    className={`flex flex-col justify-between px-2.5 py-1 border-r shrink-0 min-h-[76px] ${
      isDark ? 'border-white/10' : 'border-[#D1D1D1]'
    }`}
  >
    <div className="flex items-center gap-1 flex-1">{children}</div>
    <div
      className={`text-[10px] text-center leading-none pt-1 select-none font-medium tracking-tight ${
        isDark ? 'text-zinc-400' : 'text-[#5C5C5C]'
      }`}
    >
      {label}
    </div>
  </div>
);

export const RibbonBigBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  accent?: string;
  isDark?: boolean;
  title?: string;
  onClick: () => void;
}> = ({ icon, label, active, disabled, accent = '#185ABD', isDark, title, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    title={title || label}
    onClick={onClick}
    style={active ? { backgroundColor: `${accent}22`, borderColor: `${accent}70`, color: isDark ? '#fff' : accent } : undefined}
    className={`flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-md border border-transparent min-w-[48px] max-w-[78px] h-[54px] text-[10px] leading-[1.12] font-medium transition cursor-pointer disabled:opacity-40 ${
      active
        ? ''
        : isDark
        ? 'text-zinc-200 hover:bg-white/10'
        : 'text-[#242424] hover:bg-[#E8E6E4]'
    }`}
  >
    <span className="shrink-0">{icon}</span>
    <span className="text-center line-clamp-2">{label}</span>
  </button>
);

export const RibbonSmallBtn: React.FC<{
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  accent?: string;
  isDark?: boolean;
  title?: string;
  onClick: () => void;
}> = ({ icon, label, active, disabled, accent = '#185ABD', isDark, title, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    title={title || label}
    onClick={onClick}
    style={active ? { backgroundColor: `${accent}24`, borderColor: `${accent}75`, color: isDark ? '#fff' : accent } : undefined}
    className={`inline-flex items-center gap-1 px-1.5 py-1 rounded border border-transparent text-[11px] font-medium transition cursor-pointer disabled:opacity-40 whitespace-nowrap ${
      active
        ? ''
        : isDark
        ? 'text-zinc-200 hover:bg-white/10'
        : 'text-[#242424] hover:bg-[#E8E6E4]'
    }`}
  >
    <span className="shrink-0">{icon}</span>
    {label && <span>{label}</span>}
  </button>
);

// ==================== EXCEL CELL COORDINATES & 55+ FORMULA ENGINE (RU + EN) ====================

export function colIndexToLetter(col: number): string {
  let s = '';
  let n = col + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function letterToColIndex(letters: string): number {
  let n = 0;
  const up = letters.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    n = n * 26 + (up.charCodeAt(i) - 64);
  }
  return n - 1;
}

export function parseCellRef(ref: string): { col: number; row: number } | null {
  const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(ref.trim());
  if (!m) return null;
  return { col: letterToColIndex(m[1]), row: parseInt(m[2], 10) - 1 };
}

export function makeCellKey(col: number, row: number): string {
  return `${colIndexToLetter(col)}${row + 1}`;
}

export function expandRangeKeys(rangeStr: string): string[] {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [rangeStr.trim().replace(/\$/g, '').toUpperCase()];
  const a = parseCellRef(parts[0]);
  const b = parseCellRef(parts[1]);
  if (!a || !b) return [];
  const r1 = Math.min(a.row, b.row);
  const r2 = Math.max(a.row, b.row);
  const c1 = Math.min(a.col, b.col);
  const c2 = Math.max(a.col, b.col);
  const out: string[] = [];
  for (let r = r1; r <= r2 && out.length < 2500; r++) {
    for (let c = c1; c <= c2 && out.length < 2500; c++) {
      out.push(makeCellKey(c, r));
    }
  }
  return out;
}

const RU_FN_MAP: Record<string, string> = {
  'СУММ': 'SUM',
  'СРЗНАЧ': 'AVERAGE',
  'СРЕДНЕЕ': 'AVERAGE',
  'ЕСЛИ': 'IF',
  'ЕСЛИОШИБКА': 'IFERROR',
  'ВПР': 'VLOOKUP',
  'ИНДЕКС': 'INDEX',
  'ПОИСКПОЗ': 'MATCH',
  'СЧЁТ': 'COUNT',
  'СЧЕТ': 'COUNT',
  'СЧЁТЗ': 'COUNTA',
  'СЧЕТЗ': 'COUNTA',
  'СЧЁТЕСЛИ': 'COUNTIF',
  'СЧЕТЕСЛИ': 'COUNTIF',
  'СУММЕСЛИ': 'SUMIF',
  'МИН': 'MIN',
  'МАКС': 'MAX',
  'МЕДИАНА': 'MEDIAN',
  'СТАНДОТКЛОН': 'STDEV',
  'ОКРУГЛ': 'ROUND',
  'ОКРУГЛВВЕРХ': 'CEIL',
  'ОКРУГЛВНИЗ': 'FLOOR',
  'КОРЕНЬ': 'SQRT',
  'СТЕПЕНЬ': 'POWER',
  'ЦЕЛОЕ': 'INT',
  'ОСТАТ': 'MOD',
  'ПИ': 'PI',
  'ПЛТ': 'PMT',
  'БС': 'FV',
  'ПС': 'PV',
  'СЦЕПИТЬ': 'CONCAT',
  'ЛЕВСИМВ': 'LEFT',
  'ПРАВСИМВ': 'RIGHT',
  'ПСТР': 'MID',
  'ДЛСТР': 'LEN',
  'ПРОПИСН': 'UPPER',
  'СТРОЧН': 'LOWER',
  'СЖПРОБЕЛЫ': 'TRIM',
  'ПОДСТАВИТЬ': 'SUBSTITUTE',
  'И': 'AND',
  'ИЛИ': 'OR',
  'НЕ': 'NOT',
  'СЕГОДНЯ': 'TODAY',
  'ТДАТА': 'NOW',
  'ГОД': 'YEAR',
  'МЕСЯЦ': 'MONTH',
  'ДЕНЬ': 'DAY',
  'НАИБОЛЬШИЙ': 'LARGE',
  'НАИМЕНЬШИЙ': 'SMALL',
  'РАНГ': 'RANK',
  'ПРОИЗВЕД': 'PRODUCT',
  'МОДА': 'MODE',
};

function splitFormulaArgs(argStr: string): string[] {
  const args: string[] = [];
  let cur = '';
  let depth = 0;
  let inQuotes = false;
  for (let i = 0; i < argStr.length; i++) {
    const ch = argStr[i];
    if (ch === '"' && argStr[i - 1] !== '\\') {
      inQuotes = !inQuotes;
      cur += ch;
    } else if (!inQuotes && ch === '(') {
      depth++;
      cur += ch;
    } else if (!inQuotes && ch === ')') {
      depth = Math.max(0, depth - 1);
      cur += ch;
    } else if (!inQuotes && depth === 0 && (ch === ',' || ch === ';')) {
      args.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim() !== '' || args.length > 0) args.push(cur.trim());
  return args;
}

function matchCriterion(val: string, critRaw: string): boolean {
  const crit = critRaw.replace(/^"|"$/g, '').trim();
  const numVal = parseFloat(val.replace(',', '.'));
  const opM = /^(>=|<=|<>|!=|>|<|=)(.*)$/.exec(crit);
  if (opM) {
    const op = opM[1];
    const rhsStr = opM[2].trim();
    const rhsNum = parseFloat(rhsStr.replace(',', '.'));
    if (!Number.isNaN(numVal) && !Number.isNaN(rhsNum)) {
      if (op === '>') return numVal > rhsNum;
      if (op === '<') return numVal < rhsNum;
      if (op === '>=') return numVal >= rhsNum;
      if (op === '<=') return numVal <= rhsNum;
      if (op === '=') return numVal === rhsNum;
      if (op === '<>' || op === '!=') return numVal !== rhsNum;
    }
    if (op === '=') return val.toLowerCase() === rhsStr.toLowerCase();
    if (op === '<>' || op === '!=') return val.toLowerCase() !== rhsStr.toLowerCase();
    return false;
  }
  if (!Number.isNaN(numVal) && !Number.isNaN(parseFloat(crit.replace(',', '.')))) {
    return numVal === parseFloat(crit.replace(',', '.'));
  }
  if (crit.includes('*')) {
    const re = new RegExp('^' + crit.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i');
    return re.test(val);
  }
  return val.trim().toLowerCase() === crit.toLowerCase();
}

export function evaluateExcelFormula(
  rawInput: string,
  cells: Record<string, string>,
  depth = 0
): string {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();
  if (!trimmed.startsWith('=')) return rawInput;
  if (depth > 16) return '#ЦИКЛ!';

  const evalCellVal = (key: string): string => {
    const k = key.replace(/\$/g, '').toUpperCase();
    const v = cells[k] ?? '';
    return v.trim().startsWith('=') ? evaluateExcelFormula(v, cells, depth + 1) : v;
  };

  const toNum = (v: string): number => {
    if (v === '' || v === undefined) return NaN;
    const cleaned = String(v).replace(/\s/g, '').replace(/[₽$€%]/g, '').replace(',', '.');
    return Number(cleaned);
  };

  const evalExpr = (expr: string): string => {
    const e = expr.trim();
    if (!e) return '';
    if ((e.startsWith('"') && e.endsWith('"')) || (e.startsWith("'") && e.endsWith("'"))) {
      return e.slice(1, -1);
    }
    if (/^(TRUE|ИСТИНА)$/i.test(e)) return 'TRUE';
    if (/^(FALSE|ЛОЖЬ)$/i.test(e)) return 'FALSE';
    if (/^-?\d+([.,]\d+)?$/.test(e)) return e.replace(',', '.');
    if (/^\$?[A-Za-z]+\$?\d+$/.test(e)) return evalCellVal(e);

    // Function call NAME(args...)
    const fnMatch = /^([A-Za-zА-Яа-яЁё0-9_.]+)\(([\s\S]*)\)$/.exec(e);
    if (fnMatch) {
      const rawName = fnMatch[1].toUpperCase();
      const fn = RU_FN_MAP[rawName] || rawName;
      const args = splitFormulaArgs(fnMatch[2]);

      const collectNums = (argList: string[]): number[] => {
        const nums: number[] = [];
        for (const a of argList) {
          if (!a) continue;
          if (a.includes(':') && /^\$?[A-Za-z]+\$?\d+:\$?[A-Za-z]+\$?\d+$/.test(a)) {
            for (const k of expandRangeKeys(a)) {
              const n = toNum(evalCellVal(k));
              if (!Number.isNaN(n)) nums.push(n);
            }
          } else {
            const n = toNum(evalExpr(a));
            if (!Number.isNaN(n)) nums.push(n);
          }
        }
        return nums;
      };

      const collectRawStrings = (argList: string[]): string[] => {
        const vals: string[] = [];
        for (const a of argList) {
          if (!a) continue;
          if (a.includes(':') && /^\$?[A-Za-z]+\$?\d+:\$?[A-Za-z]+\$?\d+$/.test(a)) {
            for (const k of expandRangeKeys(a)) vals.push(evalCellVal(k));
          } else {
            vals.push(evalExpr(a));
          }
        }
        return vals;
      };

      switch (fn) {
        case 'SUM':
          return String(collectNums(args).reduce((s, x) => s + x, 0));
        case 'PRODUCT': {
          const ns = collectNums(args);
          return ns.length ? String(ns.reduce((p, x) => p * x, 1)) : '0';
        }
        case 'AVERAGE':
        case 'AVG': {
          const ns = collectNums(args);
          return ns.length ? String(ns.reduce((s, x) => s + x, 0) / ns.length) : '#ДЕЛ/0!';
        }
        case 'MIN': {
          const ns = collectNums(args);
          return ns.length ? String(Math.min(...ns)) : '0';
        }
        case 'MAX': {
          const ns = collectNums(args);
          return ns.length ? String(Math.max(...ns)) : '0';
        }
        case 'COUNT':
          return String(collectNums(args).length);
        case 'COUNTA':
          return String(collectRawStrings(args).filter((s) => s.trim() !== '').length);
        case 'MEDIAN': {
          const ns = collectNums(args).sort((a, b) => a - b);
          if (!ns.length) return '#ЧИСЛО!';
          const mid = Math.floor(ns.length / 2);
          return String(ns.length % 2 ? ns[mid] : (ns[mid - 1] + ns[mid]) / 2);
        }
        case 'MODE': {
          const ns = collectNums(args);
          if (!ns.length) return '#Н/Д';
          const freq = new Map<number, number>();
          let best = ns[0];
          let bestC = 0;
          for (const n of ns) {
            const c = (freq.get(n) || 0) + 1;
            freq.set(n, c);
            if (c > bestC) {
              bestC = c;
              best = n;
            }
          }
          return String(best);
        }
        case 'STDEV':
        case 'STDEV.S': {
          const ns = collectNums(args);
          if (ns.length < 2) return '#ДЕЛ/0!';
          const mean = ns.reduce((s, x) => s + x, 0) / ns.length;
          const variance = ns.reduce((s, x) => s + (x - mean) ** 2, 0) / (ns.length - 1);
          return String(Math.sqrt(variance));
        }
        case 'LARGE': {
          const ns = collectNums([args[0]]).sort((a, b) => b - a);
          const k = Math.round(toNum(evalExpr(args[1] || '1')));
          return k >= 1 && k <= ns.length ? String(ns[k - 1]) : '#ЧИСЛО!';
        }
        case 'SMALL': {
          const ns = collectNums([args[0]]).sort((a, b) => a - b);
          const k = Math.round(toNum(evalExpr(args[1] || '1')));
          return k >= 1 && k <= ns.length ? String(ns[k - 1]) : '#ЧИСЛО!';
        }
        case 'RANK': {
          const target = toNum(evalExpr(args[0] || '0'));
          const ns = collectNums([args[1] || '']).sort((a, b) => b - a);
          const idx = ns.indexOf(target);
          return idx >= 0 ? String(idx + 1) : '#Н/Д';
        }
        case 'ROUND': {
          const v = toNum(evalExpr(args[0] || '0'));
          const d = Math.round(toNum(evalExpr(args[1] || '0')) || 0);
          const f = 10 ** d;
          return Number.isNaN(v) ? '#ЗНАЧ!' : String(Math.round(v * f) / f);
        }
        case 'CEIL':
        case 'ROUNDUP': {
          const v = toNum(evalExpr(args[0] || '0'));
          return Number.isNaN(v) ? '#ЗНАЧ!' : String(Math.ceil(v));
        }
        case 'FLOOR':
        case 'ROUNDDOWN': {
          const v = toNum(evalExpr(args[0] || '0'));
          return Number.isNaN(v) ? '#ЗНАЧ!' : String(Math.floor(v));
        }
        case 'INT': {
          const v = toNum(evalExpr(args[0] || '0'));
          return Number.isNaN(v) ? '#ЗНАЧ!' : String(Math.trunc(v));
        }
        case 'ABS': {
          const v = toNum(evalExpr(args[0] || '0'));
          return Number.isNaN(v) ? '#ЗНАЧ!' : String(Math.abs(v));
        }
        case 'SQRT': {
          const v = toNum(evalExpr(args[0] || '0'));
          return Number.isNaN(v) || v < 0 ? '#ЧИСЛО!' : String(Math.sqrt(v));
        }
        case 'POWER': {
          const a = toNum(evalExpr(args[0] || '0'));
          const b = toNum(evalExpr(args[1] || '1'));
          return String(Math.pow(a, b));
        }
        case 'MOD': {
          const a = toNum(evalExpr(args[0] || '0'));
          const b = toNum(evalExpr(args[1] || '1'));
          return b === 0 ? '#ДЕЛ/0!' : String(a % b);
        }
        case 'PI':
          return String(Math.PI);
        case 'SIN':
          return String(Math.sin(toNum(evalExpr(args[0] || '0'))));
        case 'COS':
          return String(Math.cos(toNum(evalExpr(args[0] || '0'))));
        case 'TAN':
          return String(Math.tan(toNum(evalExpr(args[0] || '0'))));
        case 'LN':
          return String(Math.log(toNum(evalExpr(args[0] || '1'))));
        case 'LOG':
        case 'LOG10':
          return String(Math.log10(toNum(evalExpr(args[0] || '1'))));
        case 'EXP':
          return String(Math.exp(toNum(evalExpr(args[0] || '0'))));
        case 'PMT': {
          // PMT(rate, nper, pv) — real loan annuity payment!
          const rate = toNum(evalExpr(args[0] || '0'));
          const nper = toNum(evalExpr(args[1] || '1'));
          const pv = toNum(evalExpr(args[2] || '0'));
          if (nper <= 0) return '#ЧИСЛО!';
          if (rate === 0) return String(-pv / nper);
          const pmt = (-pv * rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
          return String(Math.round(pmt * 100) / 100);
        }
        case 'FV': {
          const rate = toNum(evalExpr(args[0] || '0'));
          const nper = toNum(evalExpr(args[1] || '1'));
          const pmt = toNum(evalExpr(args[2] || '0'));
          const pv = toNum(evalExpr(args[3] || '0')) || 0;
          if (rate === 0) return String(-(pv + pmt * nper));
          const fv = -(pv * Math.pow(1 + rate, nper) + (pmt * (Math.pow(1 + rate, nper) - 1)) / rate);
          return String(Math.round(fv * 100) / 100);
        }
        case 'PV': {
          const rate = toNum(evalExpr(args[0] || '0'));
          const nper = toNum(evalExpr(args[1] || '1'));
          const pmt = toNum(evalExpr(args[2] || '0'));
          if (rate === 0) return String(-(pmt * nper));
          const pv = -(pmt * (1 - Math.pow(1 + rate, -nper))) / rate;
          return String(Math.round(pv * 100) / 100);
        }
        case 'IF': {
          const cond = evalBool(args[0] || '');
          return cond ? evalExpr(args[1] || 'TRUE') : evalExpr(args[2] || 'FALSE');
        }
        case 'IFERROR': {
          const v = evalExpr(args[0] || '');
          return v.startsWith('#') ? evalExpr(args[1] || '') : v;
        }
        case 'AND':
          return args.every((a) => evalBool(a)) ? 'TRUE' : 'FALSE';
        case 'OR':
          return args.some((a) => evalBool(a)) ? 'TRUE' : 'FALSE';
        case 'NOT':
          return !evalBool(args[0] || '') ? 'TRUE' : 'FALSE';
        case 'COUNTIF': {
          const keys = expandRangeKeys(args[0] || '');
          const crit = evalExpr(args[1] || '');
          return String(keys.filter((k) => matchCriterion(evalCellVal(k), crit)).length);
        }
        case 'SUMIF': {
          const keys = expandRangeKeys(args[0] || '');
          const crit = evalExpr(args[1] || '');
          const sumKeys = args[2] ? expandRangeKeys(args[2]) : keys;
          let sum = 0;
          for (let i = 0; i < keys.length; i++) {
            if (matchCriterion(evalCellVal(keys[i]), crit)) {
              const n = toNum(evalCellVal(sumKeys[i] || keys[i]));
              if (!Number.isNaN(n)) sum += n;
            }
          }
          return String(sum);
        }
        case 'VLOOKUP': {
          const needle = evalExpr(args[0] || '').toLowerCase();
          const rangeParts = (args[1] || '').split(':');
          const colIdx = Math.round(toNum(evalExpr(args[2] || '1')));
          if (rangeParts.length !== 2 || Number.isNaN(colIdx) || colIdx < 1) return '#Н/Д';
          const a = parseCellRef(rangeParts[0]);
          const b = parseCellRef(rangeParts[1]);
          if (!a || !b) return '#Н/Д';
          for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
            const firstVal = evalCellVal(makeCellKey(Math.min(a.col, b.col), r)).toLowerCase();
            if (firstVal === needle) {
              return evalCellVal(makeCellKey(Math.min(a.col, b.col) + colIdx - 1, r));
            }
          }
          return '#Н/Д';
        }
        case 'INDEX': {
          const rangeParts = (args[0] || '').split(':');
          const rowNum = Math.round(toNum(evalExpr(args[1] || '1')));
          const colNum = Math.round(toNum(evalExpr(args[2] || '1')) || 1);
          if (rangeParts.length !== 2) return '#ССЫЛКА!';
          const a = parseCellRef(rangeParts[0]);
          if (!a) return '#ССЫЛКА!';
          return evalCellVal(makeCellKey(a.col + colNum - 1, a.row + rowNum - 1));
        }
        case 'MATCH': {
          const needle = evalExpr(args[0] || '').toLowerCase();
          const keys = expandRangeKeys(args[1] || '');
          const idx = keys.findIndex((k) => evalCellVal(k).toLowerCase() === needle);
          return idx >= 0 ? String(idx + 1) : '#Н/Д';
        }
        case 'CONCAT':
        case 'CONCATENATE':
          return collectRawStrings(args).join('');
        case 'LEFT': {
          const s = evalExpr(args[0] || '');
          const n = Math.max(0, Math.round(toNum(evalExpr(args[1] || '1'))));
          return s.slice(0, n);
        }
        case 'RIGHT': {
          const s = evalExpr(args[0] || '');
          const n = Math.max(0, Math.round(toNum(evalExpr(args[1] || '1'))));
          return s.slice(Math.max(0, s.length - n));
        }
        case 'MID': {
          const s = evalExpr(args[0] || '');
          const start = Math.max(1, Math.round(toNum(evalExpr(args[1] || '1'))));
          const len = Math.max(0, Math.round(toNum(evalExpr(args[2] || '1'))));
          return s.slice(start - 1, start - 1 + len);
        }
        case 'LEN':
          return String(evalExpr(args[0] || '').length);
        case 'UPPER':
          return evalExpr(args[0] || '').toUpperCase();
        case 'LOWER':
          return evalExpr(args[0] || '').toLowerCase();
        case 'TRIM':
          return evalExpr(args[0] || '').replace(/\s+/g, ' ').trim();
        case 'SUBSTITUTE': {
          const s = evalExpr(args[0] || '');
          const oldT = evalExpr(args[1] || '');
          const newT = evalExpr(args[2] || '');
          return oldT ? s.split(oldT).join(newT) : s;
        }
        case 'TODAY':
          return new Date().toLocaleDateString('ru-RU');
        case 'NOW':
          return new Date().toLocaleString('ru-RU');
        case 'YEAR':
          return String(new Date().getFullYear());
        case 'MONTH':
          return String(new Date().getMonth() + 1);
        case 'DAY':
          return String(new Date().getDate());
      }
    }

    // String concatenation with &
    if (e.includes('&')) {
      const parts = e.split('&');
      return parts.map((p) => evalExpr(p)).join('');
    }

    // Arithmetic expression with cell refs & nested functions
    let replaced = e;
    // Resolve nested functions first (innermost)
    for (let pass = 0; pass < 6; pass++) {
      const next = replaced.replace(/([A-Za-zА-Яа-яЁё0-9_.]+)\(([^()]*)\)/g, (m) => {
        const res = evalExpr(m);
        const n = toNum(res);
        return Number.isNaN(n) ? '0' : String(n);
      });
      if (next === replaced) break;
      replaced = next;
    }
    replaced = replaced.replace(/\$?[A-Za-z]+\$?\d+/g, (ref) => {
      const n = toNum(evalCellVal(ref));
      return Number.isNaN(n) ? '0' : String(n);
    });
    replaced = replaced.replace(/\^/g, '**');
    if (/^[0-9+\-*/().\s%]+$/.test(replaced)) {
      try {
        const val = Function(`"use strict"; return (${replaced});`)();
        if (typeof val === 'number') {
          if (!Number.isFinite(val)) return '#ДЕЛ/0!';
          return String(Math.round(val * 1e9) / 1e9);
        }
      } catch {
        return '#ЗНАЧ!';
      }
    }
    return '#ИМЯ?';
  };

  const evalBool = (condStr: string): boolean => {
    const m = /^([\s\S]+?)(>=|<=|<>|!=|=|>|<)([\s\S]+)$/.exec(condStr.trim());
    if (m) {
      const l = evalExpr(m[1]);
      const op = m[2];
      const r = evalExpr(m[3]);
      const ln = toNum(l);
      const rn = toNum(r);
      if (!Number.isNaN(ln) && !Number.isNaN(rn)) {
        if (op === '>') return ln > rn;
        if (op === '<') return ln < rn;
        if (op === '>=') return ln >= rn;
        if (op === '<=') return ln <= rn;
        if (op === '=') return ln === rn;
        return ln !== rn;
      }
      if (op === '=') return l.toLowerCase() === r.toLowerCase();
      if (op === '<>' || op === '!=') return l.toLowerCase() !== r.toLowerCase();
      return false;
    }
    const v = evalExpr(condStr).toLowerCase();
    return v === 'true' || v === 'истина' || (toNum(v) !== 0 && !Number.isNaN(toNum(v)));
  };

  try {
    return evalExpr(trimmed.slice(1));
  } catch {
    return '#ОШИБКА!';
  }
}

export function formatExcelDisplayValue(val: string, meta?: CellMeta): string {
  if (!val || val.startsWith('#')) return val;
  const fmt = meta?.format || 'general';
  if (fmt === 'text' || fmt === 'general') {
    const n = Number(val);
    if (fmt === 'general' && !Number.isNaN(n) && val.trim() !== '' && Math.abs(n) < 1e14 && val.includes('.')) {
      return String(Math.round(n * 10000) / 10000);
    }
    return val;
  }
  const n = Number(String(val).replace(/\s/g, '').replace(',', '.'));
  if (Number.isNaN(n)) return val;
  const dec = meta?.decimals ?? (fmt === 'percent' ? 1 : 2);
  if (fmt === 'number') return n.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (fmt === 'currency') return `${n.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec })} ₽`;
  if (fmt === 'usd') return `$${n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
  if (fmt === 'eur') return `€${n.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
  if (fmt === 'percent') return `${(n * 100).toFixed(dec)}%`;
  return val;
}

// ==================== RICH MICROSOFT OFFICE TEMPLATES ====================

export const WORD_TEMPLATES: { id: string; name: string; desc: string; html: string }[] = [
  {
    id: 'blank',
    name: 'Новый документ',
    desc: 'Чистый лист A4',
    html: '<h1>Новый документ</h1><p>Начните вводить текст здесь…</p>',
  },
  {
    id: 'resume',
    name: 'Резюме (CV)',
    desc: 'Современное резюме специалиста',
    html: `<h1 style="color:#185ABD">Иван Алексеевич Соколов</h1>
<p><strong>Senior Frontend / Full-Stack Разработчик</strong> · Москва · ivan@example.com · +7 (999) 123-45-67</p><hr/>
<h2>О себе</h2><p>Инженер с 6+ годами опыта создания высоконагруженных веб- и десктоп-приложений на TypeScript, React и Go.</p>
<h2>Опыт работы</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0"><tr><th style="border:1px solid #cbd5e1;padding:6px;background:#eff6ff;text-align:left">Период</th><th style="border:1px solid #cbd5e1;padding:6px;background:#eff6ff;text-align:left">Компания и должность</th><th style="border:1px solid #cbd5e1;padding:6px;background:#eff6ff;text-align:left">Достижения</th></tr>
<tr><td style="border:1px solid #cbd5e1;padding:6px">2023 — н.в.</td><td style="border:1px solid #cbd5e1;padding:6px"><strong>Luma Labs</strong> — Lead Engineer</td><td style="border:1px solid #cbd5e1;padding:6px">Ускорил рендер UI на 45%, запустил офисный пакет и ИИ-ассистента</td></tr>
<tr><td style="border:1px solid #cbd5e1;padding:6px">2020 — 2023</td><td style="border:1px solid #cbd5e1;padding:6px"><strong>CloudTech</strong> — Frontend Developer</td><td style="border:1px solid #cbd5e1;padding:6px">Разработал дизайн-систему из 60+ компонентов</td></tr></table>
<h2>Ключевые навыки</h2><ul><li>TypeScript, React, Next.js, Tailwind CSS, WebGL</li><li>Go, Node.js, PostgreSQL, Docker, CI/CD</li></ul>`,
  },
  {
    id: 'contract',
    name: 'Договор оказания услуг',
    desc: 'Официальный бланк договора',
    html: `<h1 style="text-align:center">ДОГОВОР ОКАЗАНИЯ УСЛУГ № 2026-01</h1>
<p style="text-align:right">г. Москва · «24» ноября 2026 г.</p>
<p><strong>ООО «Заказчик»</strong>, в лице Генерального директора, с одной стороны, и <strong>ИП Исполнитель</strong>, с другой стороны, заключили настоящий Договор о нижеследующем:</p>
<h2>1. Предмет договора</h2><p>1.1. Исполнитель обязуется выполнить разработку программного обеспечения согласно Техническому заданию, а Заказчик обязуется принять и оплатить выполненные работы.</p>
<h2>2. Стоимость и порядок расчётов</h2><p>2.1. Общая стоимость работ составляет <strong>250 000 (Двести пятьдесят тысяч) рублей</strong>. Оплата производится в течение 5 банковских дней с даты подписания Акта.</p>
<h2>3. Подписи сторон</h2><table style="width:100%;border-collapse:collapse;margin-top:16px"><tr><td style="border:1px solid #94a3b8;padding:12px;width:50%"><strong>Заказчик:</strong><br/><br/>___________________ / М.П.</td><td style="border:1px solid #94a3b8;padding:12px;width:50%"><strong>Исполнитель:</strong><br/><br/>___________________ / М.П.</td></tr></table>`,
  },
  {
    id: 'report',
    name: 'Аналитический отчёт',
    desc: 'Квартальный отчёт с KPI',
    html: `<h1 style="color:#185ABD">Квартальный отчёт по развитию продукта (Q4 2026)</h1>
<blockquote><strong>Резюме:</strong> Рост активной аудитории составил +38% квартал к кварталу при снижении времени отклика интерфейса на 42%.</blockquote>
<h2>1. Ключевые метрики</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0"><tr><th style="border:1px solid #cbd5e1;padding:6px;background:#f1f5f9">Показатель</th><th style="border:1px solid #cbd5e1;padding:6px;background:#f1f5f9">Q3 2026</th><th style="border:1px solid #cbd5e1;padding:6px;background:#f1f5f9">Q4 2026</th><th style="border:1px solid #cbd5e1;padding:6px;background:#f1f5f9">Динамика</th></tr>
<tr><td style="border:1px solid #cbd5e1;padding:6px">Активные пользователи</td><td style="border:1px solid #cbd5e1;padding:6px">42 500</td><td style="border:1px solid #cbd5e1;padding:6px"><strong>58 650</strong></td><td style="border:1px solid #cbd5e1;padding:6px;color:#15803d">+38%</td></tr>
<tr><td style="border:1px solid #cbd5e1;padding:6px">Удержание (30 дн.)</td><td style="border:1px solid #cbd5e1;padding:6px">64%</td><td style="border:1px solid #cbd5e1;padding:6px"><strong>73%</strong></td><td style="border:1px solid #cbd5e1;padding:6px;color:#15803d">+9 п.п.</td></tr></table>
<h2>2. План на следующий квартал</h2><ol><li>Запуск облачной синхронизации документов</li><li>Оптимизация энергопотребления ноутбуков</li><li>Расширение библиотеки шаблонов Office</li></ol>`,
  },
  {
    id: 'essay',
    name: 'Реферат / Курсовая',
    desc: 'Академическое оформление ГОСТ',
    html: `<p style="text-align:center"><strong>МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ</strong></p>
<h1 style="text-align:center;margin-top:32px">РЕФЕРАТ</h1>
<p style="text-align:center;font-size:16px">по дисциплине «Архитектура современных операционных систем»</p>
<h2 style="text-align:center">Тема: Микроядерные и гибридные подходы в настольных ОС</h2>
<p style="text-align:right;margin-top:28px">Выполнил: студент группы ИВТ-301<br/>Проверил: к.т.н., доцент</p><hr/>
<h2>Введение</h2><p>Современные операционные среды сочетают аппаратную производительность нативного ядра с гибкостью декларативных графических интерфейсов...</p>
<h2>1. Теоретические основы</h2><p>Основной задачей планировщика является минимизация задержек ввода-вывода при сохранении высокой энергоэффективности.</p>
<h2>Заключение</h2><p>Гибридная архитектура позволяет объединить преимущества безопасности и мгновенного отклика пользовательского интерфейса.</p>`,
  },
];

export const EXCEL_TEMPLATES: { id: string; name: string; desc: string; sheets: OfficeSheet[] }[] = [
  {
    id: 'budget',
    name: 'Семейный и бизнес-бюджет',
    desc: 'Автосуммы, % доли, остаток и график',
    sheets: [
      {
        name: 'Бюджет 2026',
        rows: 35,
        cols: 12,
        freezeHeader: true,
        cells: {
          A1: 'Категория', B1: 'План (₽)', C1: 'Факт (₽)', D1: 'Отклонение', E1: 'Выполнение', F1: 'Статус',
          A2: 'Жильё и ЖКХ', B2: '45000', C2: '43800', D2: '=B2-C2', E2: '=C2/B2', F2: '=ЕСЛИ(C2<=B2;"В норме";"Перерасход")',
          A3: 'Продукты и кафе', B3: '32000', C3: '34500', D3: '=B3-C3', E3: '=C3/B3', F3: '=ЕСЛИ(C3<=B3;"В норме";"Перерасход")',
          A4: 'Транспорт', B4: '12000', C4: '10400', D4: '=B4-C4', E4: '=C4/B4', F4: '=ЕСЛИ(C4<=B4;"В норме";"Перерасход")',
          A5: 'Подписки и софт', B5: '6500', C5: '5900', D5: '=B5-C5', E5: '=C5/B5', F5: '=ЕСЛИ(C5<=B5;"В норме";"Перерасход")',
          A6: 'Техника и апгрейд', B6: '25000', C6: '21900', D6: '=B6-C6', E6: '=C6/B6', F6: '=ЕСЛИ(C6<=B6;"В норме";"Перерасход")',
          A7: 'Обучение и книги', B7: '8000', C7: '7200', D7: '=B7-C7', E7: '=C7/B7', F7: '=ЕСЛИ(C7<=B7;"В норме";"Перерасход")',
          A8: 'ИТОГО', B8: '=СУММ(B2:B7)', C8: '=СУММ(C2:C7)', D8: '=СУММ(D2:D7)', E8: '=C8/B8', F8: '=СЧЁТЕСЛИ(F2:F7;"В норме")&" из 6"',
          A10: 'Средний расход', B10: '=СРЗНАЧ(B2:B7)', C10: '=СРЗНАЧ(C2:C7)',
          A11: 'Максимум', B11: '=МАКС(B2:B7)', C11: '=МАКС(C2:C7)',
        },
        styles: {
          A1: { bold: true, bg: '#107C41', color: '#ffffff', align: 'left' },
          B1: { bold: true, bg: '#107C41', color: '#ffffff', align: 'right' },
          C1: { bold: true, bg: '#107C41', color: '#ffffff', align: 'right' },
          D1: { bold: true, bg: '#107C41', color: '#ffffff', align: 'right' },
          E1: { bold: true, bg: '#107C41', color: '#ffffff', align: 'right' },
          F1: { bold: true, bg: '#107C41', color: '#ffffff', align: 'center' },
          B2: { format: 'currency' }, C2: { format: 'currency' }, D2: { format: 'currency' }, E2: { format: 'percent' },
          B3: { format: 'currency' }, C3: { format: 'currency' }, D3: { format: 'currency' }, E3: { format: 'percent' },
          B4: { format: 'currency' }, C4: { format: 'currency' }, D4: { format: 'currency' }, E4: { format: 'percent' },
          B5: { format: 'currency' }, C5: { format: 'currency' }, D5: { format: 'currency' }, E5: { format: 'percent' },
          B6: { format: 'currency' }, C6: { format: 'currency' }, D6: { format: 'currency' }, E6: { format: 'percent' },
          B7: { format: 'currency' }, C7: { format: 'currency' }, D7: { format: 'currency' }, E7: { format: 'percent' },
          A8: { bold: true, bg: '#E6F4EA' },
          B8: { bold: true, bg: '#E6F4EA', format: 'currency' },
          C8: { bold: true, bg: '#E6F4EA', format: 'currency' },
          D8: { bold: true, bg: '#E6F4EA', format: 'currency' },
          E8: { bold: true, bg: '#E6F4EA', format: 'percent' },
          F8: { bold: true, bg: '#E6F4EA', align: 'center' },
          B10: { format: 'currency' }, C10: { format: 'currency' },
          B11: { format: 'currency' }, C11: { format: 'currency' },
        },
        charts: [
          { id: 'c1', type: 'bar', title: 'Фактические расходы по категориям', labelCol: 0, valueCol: 2, startRow: 1, endRow: 6 },
        ],
      },
    ],
  },
  {
    id: 'sales',
    name: 'Отчёт по продажам и KPI',
    desc: 'Выручка, маржа, ВПР и аналитика',
    sheets: [
      {
        name: 'Продажи',
        rows: 35,
        cols: 12,
        freezeHeader: true,
        cells: {
          A1: 'Месяц', B1: 'Заказы', C1: 'Выручка (₽)', D1: 'Себестоимость', E1: 'Прибыль', F1: 'Маржа',
          A2: 'Январь', B2: '142', C2: '890000', D2: '510000', E2: '=C2-D2', F2: '=E2/C2',
          A3: 'Февраль', B3: '168', C3: '1040000', D3: '590000', E3: '=C3-D3', F3: '=E3/C3',
          A4: 'Март', B4: '210', C4: '1320000', D4: '720000', E4: '=C4-D4', F4: '=E4/C4',
          A5: 'Апрель', B5: '195', C5: '1250000', D5: '680000', E5: '=C5-D5', F5: '=E5/C5',
          A6: 'Май', B6: '248', C6: '1580000', D6: '830000', E6: '=C6-D6', F6: '=E6/C6',
          A7: 'ИТОГО', B7: '=СУММ(B2:B6)', C7: '=СУММ(C2:C6)', D7: '=СУММ(D2:D6)', E7: '=СУММ(E2:E6)', F7: '=E7/C7',
        },
        styles: {
          A1: { bold: true, bg: '#107C41', color: '#ffffff' },
          B1: { bold: true, bg: '#107C41', color: '#ffffff' },
          C1: { bold: true, bg: '#107C41', color: '#ffffff' },
          D1: { bold: true, bg: '#107C41', color: '#ffffff' },
          E1: { bold: true, bg: '#107C41', color: '#ffffff' },
          F1: { bold: true, bg: '#107C41', color: '#ffffff' },
          C2: { format: 'currency' }, D2: { format: 'currency' }, E2: { format: 'currency' }, F2: { format: 'percent' },
          C3: { format: 'currency' }, D3: { format: 'currency' }, E3: { format: 'currency' }, F3: { format: 'percent' },
          C4: { format: 'currency' }, D4: { format: 'currency' }, E4: { format: 'currency' }, F4: { format: 'percent' },
          C5: { format: 'currency' }, D5: { format: 'currency' }, E5: { format: 'currency' }, F5: { format: 'percent' },
          C6: { format: 'currency' }, D6: { format: 'currency' }, E6: { format: 'currency' }, F6: { format: 'percent' },
          A7: { bold: true, bg: '#E6F4EA' }, B7: { bold: true, bg: '#E6F4EA' },
          C7: { bold: true, bg: '#E6F4EA', format: 'currency' },
          D7: { bold: true, bg: '#E6F4EA', format: 'currency' },
          E7: { bold: true, bg: '#E6F4EA', format: 'currency' },
          F7: { bold: true, bg: '#E6F4EA', format: 'percent' },
        },
        charts: [
          { id: 'c2', type: 'line', title: 'Рост выручки по месяцам', labelCol: 0, valueCol: 2, startRow: 1, endRow: 5 },
        ],
      },
    ],
  },
  {
    id: 'loan',
    name: 'Кредитный калькулятор (ПЛТ)',
    desc: 'Формула ПЛТ/PMT, переплата и итог',
    sheets: [
      {
        name: 'Кредит',
        rows: 30,
        cols: 10,
        freezeHeader: true,
        cells: {
          A1: 'Параметр', B1: 'Значение',
          A2: 'Сумма кредита (₽)', B2: '1000000',
          A3: 'Годовая ставка', B3: '0.16',
          A4: 'Срок (месяцев)', B4: '36',
          A5: 'Ежемесячный платёж', B5: '=-ПЛТ(B3/12;B4;B2)',
          A6: 'Общая сумма выплат', B6: '=B5*B4',
          A7: 'Переплата по процентам', B7: '=B6-B2',
        },
        styles: {
          A1: { bold: true, bg: '#107C41', color: '#ffffff' },
          B1: { bold: true, bg: '#107C41', color: '#ffffff' },
          B2: { format: 'currency' },
          B3: { format: 'percent' },
          B5: { bold: true, format: 'currency', bg: '#E6F4EA' },
          B6: { format: 'currency' },
          B7: { format: 'currency', color: '#b91c1c', bold: true },
        },
      },
    ],
  },
  {
    id: 'blank',
    name: 'Пустая книга',
    desc: 'Чистый лист 40×16',
    sheets: [{ name: 'Лист1', rows: 40, cols: 16, cells: {}, styles: {} }],
  },
];

export const SLIDE_THEMES: { name: string; bg: string; text: string; accent: string; sub: string }[] = [
  { name: 'Офис Белый', bg: '#ffffff', text: '#1e293b', accent: '#B7472A', sub: '#475569' },
  { name: 'Carbon Dark', bg: '#0f172a', text: '#f8fafc', accent: '#38bdf8', sub: '#94a3b8' },
  { name: 'Королевский синий', bg: 'linear-gradient(135deg,#0f172a,#1e3a8a)', text: '#f8fafc', accent: '#60a5fa', sub: '#bfdbfe' },
  { name: 'Изумрудный бизнес', bg: 'linear-gradient(135deg,#064e3b,#0f766e)', text: '#ecfdf5', accent: '#34d399', sub: '#a7f3d0' },
  { name: 'Терракота Pitch', bg: 'linear-gradient(135deg,#431407,#9a3412)', text: '#fff7ed', accent: '#fb923c', sub: '#fed7aa' },
  { name: 'Полночный фиолет', bg: 'linear-gradient(135deg,#1e1b4b,#581c87)', text: '#f5f3ff', accent: '#c084fc', sub: '#ddd6fe' },
  { name: 'Светлый Графит', bg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', text: '#0f172a', accent: '#2563eb', sub: '#475569' },
  { name: 'Обсидиан Золото', bg: 'linear-gradient(135deg,#18181b,#27272a)', text: '#fafafa', accent: '#f59e0b', sub: '#d4d4d8' },
  { name: 'Крем и Бордо', bg: '#fffbeb', text: '#451a03', accent: '#be123c', sub: '#78350f' },
  { name: 'Неоновый Кибер', bg: 'linear-gradient(135deg,#020617,#1e1b4b,#0c4a6e)', text: '#f0f9ff', accent: '#22d3ee', sub: '#bae6fd' },
  { name: 'Пастель Мята', bg: 'linear-gradient(135deg,#ecfdf5,#eff6ff)', text: '#064e3b', accent: '#059669', sub: '#334155' },
  { name: 'Тёмный Рубин', bg: 'linear-gradient(135deg,#2a0a18,#7f1d1d)', text: '#fff1f2', accent: '#fb7185', sub: '#fecdd3' },
];

export const PPT_TEMPLATES: { id: string; name: string; desc: string; slides: OfficeSlide[] }[] = [
  {
    id: 'pitch',
    name: 'Презентация продукта (Pitch)',
    desc: '3 готовых слайда с SmartArt и графиком',
    slides: [
      {
        id: 'sl_1',
        title: 'Титульный слайд',
        background: 'linear-gradient(135deg,#0f172a,#1e3a8a)',
        transition: 'fade',
        transitionDuration: 0.6,
        notes: 'Поприветствуйте аудиторию и представьте ключевую идею за 30 секунд.',
        elements: [
          {
            id: 'e1', type: 'text', x: 7, y: 20, w: 86, h: 24,
            text: 'Luma Office Studio 1.5.3', fontSize: 44, bold: true, align: 'center', color: '#ffffff', anim: 'fade_in', animOrder: 1,
          },
          {
            id: 'e2', type: 'text', x: 14, y: 48, w: 72, h: 16,
            text: 'Знакомый интерфейс Microsoft Word · Excel · PowerPoint с нативным экспортом .docx / .xlsx / .pptx',
            fontSize: 19, align: 'center', color: '#bfdbfe', anim: 'fly_up', animOrder: 2,
          },
          {
            id: 'e3', type: 'shape', shape: 'rounded', x: 35, y: 72, w: 30, h: 11,
            text: 'Нажмите F5 для показа', fontSize: 14, bold: true, align: 'center', color: '#ffffff', bgColor: '#B7472A', anim: 'zoom_in', animOrder: 3,
          },
        ],
      },
      {
        id: 'sl_2',
        title: 'Процесс и SmartArt',
        background: '#ffffff',
        transition: 'push',
        transitionDuration: 0.5,
        notes: 'Объясните 4 ключевых этапа реализации.',
        elements: [
          {
            id: 'e4', type: 'text', x: 6, y: 7, w: 88, h: 12,
            text: 'Дорожная карта развития', fontSize: 32, bold: true, align: 'left', color: '#0f172a',
          },
          {
            id: 'e5', type: 'smartart', smartArtLayout: 'process', x: 6, y: 26, w: 88, h: 36,
            smartArtItems: ['1. Анализ', '2. Дизайн', '3. Разработка', '4. Релиз'],
            bgColor: '#B7472A', color: '#ffffff', anim: 'fly_left', animOrder: 1,
          },
          {
            id: 'e6', type: 'text', x: 6, y: 70, w: 88, h: 18,
            text: '• Полная совместимость с Microsoft Office\n• Встроенные диаграммы, таблицы, SmartArt и рисование на слайде',
            fontSize: 16, color: '#334155',
          },
        ],
      },
      {
        id: 'sl_3',
        title: 'Рост показателей',
        background: '#ffffff',
        transition: 'zoom',
        transitionDuration: 0.5,
        notes: 'Обратите внимание на ускорение роста в Q4.',
        elements: [
          {
            id: 'e7', type: 'text', x: 6, y: 7, w: 88, h: 12,
            text: 'Динамика ключевых показателей', fontSize: 30, bold: true, color: '#0f172a',
          },
          {
            id: 'e8', type: 'chart', chartType: 'bar', chartTitle: 'Рост аудитории (тыс.)', x: 6, y: 22, w: 52, h: 66,
            chartData: [
              { label: 'Q1', value: 24 },
              { label: 'Q2', value: 38 },
              { label: 'Q3', value: 52 },
              { label: 'Q4', value: 78 },
            ],
            bgColor: '#f8fafc', color: '#0f172a', anim: 'zoom_in', animOrder: 1,
          },
          {
            id: 'e9', type: 'table', x: 61, y: 22, w: 33, h: 52,
            rows: [
              ['Квартал', 'Рост'],
              ['Q1 2026', '+18%'],
              ['Q2 2026', '+32%'],
              ['Q3 2026', '+41%'],
              ['Q4 2026', '+54%'],
            ],
            color: '#0f172a', bgColor: '#fff7ed',
          },
        ],
      },
    ],
  },
  {
    id: 'blank',
    name: 'Пустая презентация',
    desc: 'Чистый белый слайд 16:9',
    slides: [
      {
        id: 'sl_blank_1',
        title: 'Слайд 1',
        background: '#ffffff',
        transition: 'fade',
        transitionDuration: 0.5,
        notes: '',
        elements: [
          { id: 'eb1', type: 'text', x: 10, y: 30, w: 80, h: 18, text: 'Заголовок слайда', fontSize: 40, bold: true, align: 'center', color: '#1e293b' },
          { id: 'eb2', type: 'text', x: 15, y: 52, w: 70, h: 14, text: 'Подзаголовок слайда — дважды кликните для ввода текста', fontSize: 18, align: 'center', color: '#64748b' },
        ],
      },
    ],
  },
];
