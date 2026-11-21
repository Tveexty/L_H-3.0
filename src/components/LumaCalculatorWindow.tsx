import React, { useEffect, useMemo, useState } from 'react';
import {
  Binary,
  Calculator,
  Copy,
  Check,
  Delete,
  History,
  Ruler,
  Sigma,
  Trash2,
} from 'lucide-react';
import { LumaLangCode, tr } from '../i18n/translations';

type CalcMode = 'standard' | 'scientific' | 'programmer' | 'converter';
type ProgBase = 16 | 10 | 8 | 2;

interface HistoryEntry {
  expr: string;
  result: string;
  time: string;
}

interface LumaCalculatorWindowProps {
  isDark: boolean;
  lang: LumaLangCode;
}

type UnitCategory = 'length' | 'weight' | 'temp' | 'data' | 'speed' | 'time';

const UNIT_DEFS: Record<
  UnitCategory,
  { label: string; units: { id: string; name: string; toBase: (v: number) => number; fromBase: (v: number) => number }[] }
> = {
  length: {
    label: 'Длина',
    units: [
      { id: 'm', name: 'Метры (м)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'km', name: 'Километры (км)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'cm', name: 'Сантиметры (см)', toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      { id: 'mm', name: 'Миллиметры (мм)', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'in', name: 'Дюймы (in)', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { id: 'ft', name: 'Футы (ft)', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { id: 'mi', name: 'Мили (mi)', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
    ],
  },
  weight: {
    label: 'Масса',
    units: [
      { id: 'kg', name: 'Килограммы (кг)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'g', name: 'Граммы (г)', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'mg', name: 'Миллиграммы (мг)', toBase: (v) => v / 1e6, fromBase: (v) => v * 1e6 },
      { id: 't', name: 'Тонны (т)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'lb', name: 'Фунты (lb)', toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
      { id: 'oz', name: 'Унции (oz)', toBase: (v) => v * 0.02834952, fromBase: (v) => v / 0.02834952 },
    ],
  },
  temp: {
    label: 'Температура',
    units: [
      { id: 'c', name: 'Цельсий (°C)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'f', name: 'Фаренгейт (°F)', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: 'k', name: 'Кельвин (K)', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  data: {
    label: 'Данные',
    units: [
      { id: 'b', name: 'Байты (B)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'kb', name: 'Килобайты (KB)', toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
      { id: 'mb', name: 'Мегабайты (MB)', toBase: (v) => v * 1048576, fromBase: (v) => v / 1048576 },
      { id: 'gb', name: 'Гигабайты (GB)', toBase: (v) => v * 1073741824, fromBase: (v) => v / 1073741824 },
      { id: 'tb', name: 'Терабайты (TB)', toBase: (v) => v * 1099511627776, fromBase: (v) => v / 1099511627776 },
    ],
  },
  speed: {
    label: 'Скорость',
    units: [
      { id: 'kmh', name: 'км/ч', toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
      { id: 'ms', name: 'м/с', toBase: (v) => v, fromBase: (v) => v },
      { id: 'mph', name: 'миль/ч (mph)', toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 },
      { id: 'kn', name: 'Узлы (kn)', toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 },
    ],
  },
  time: {
    label: 'Время',
    units: [
      { id: 's', name: 'Секунды', toBase: (v) => v, fromBase: (v) => v },
      { id: 'min', name: 'Минуты', toBase: (v) => v * 60, fromBase: (v) => v / 60 },
      { id: 'h', name: 'Часы', toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
      { id: 'd', name: 'Дни', toBase: (v) => v * 86400, fromBase: (v) => v / 86400 },
    ],
  },
};

function factorial(n: number): number {
  if (n < 0 || !Number.isFinite(n)) return NaN;
  const k = Math.floor(n);
  if (k > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= k; i++) r *= i;
  return r;
}

function formatNum(v: number): string {
  if (!Number.isFinite(v)) return 'Ошибка';
  if (Math.abs(v) > 1e13 || (Math.abs(v) > 0 && Math.abs(v) < 1e-9)) {
    return v.toExponential(6).replace(/\.?0+e/, 'e');
  }
  const rounded = Math.round(v * 1e10) / 1e10;
  return String(rounded);
}

// Safe math expression evaluator for standard & scientific mode
function safeEvaluateMath(raw: string, degMode: boolean): number {
  const s = raw
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, `(${Math.PI})`)
    .replace(/\^/g, '**')
    .trim();
  if (!s) return 0;
  // Strictly allow only safe mathematical tokens
  const allowed = /^[0-9+\-*/().,%\sA-Za-z_]*$/;
  if (!allowed.test(s)) return NaN;
  const toRad = (x: number) => (degMode ? (x * Math.PI) / 180 : x);
  const scope: Record<string, unknown> = {
    sin: (x: number) => Math.sin(toRad(x)),
    cos: (x: number) => Math.cos(toRad(x)),
    tan: (x: number) => Math.tan(toRad(x)),
    asin: (x: number) => (degMode ? (Math.asin(x) * 180) / Math.PI : Math.asin(x)),
    acos: (x: number) => (degMode ? (Math.acos(x) * 180) / Math.PI : Math.acos(x)),
    atan: (x: number) => (degMode ? (Math.atan(x) * 180) / Math.PI : Math.atan(x)),
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    log: Math.log10,
    ln: Math.log,
    exp: Math.exp,
    pow: Math.pow,
    fact: factorial,
    PI: Math.PI,
    E: Math.E,
  };
  try {
    const fn = new Function(...Object.keys(scope), `"use strict"; return (${s});`);
    const res = fn(...Object.values(scope));
    return typeof res === 'number' ? res : NaN;
  } catch {
    return NaN;
  }
}

export const LumaCalculatorWindow: React.FC<LumaCalculatorWindowProps> = ({ isDark, lang }) => {
  const [mode, setMode] = useState<CalcMode>('standard');
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [memory, setMemory] = useState<number>(0);
  const [degMode, setDegMode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('luma_calc_history_v1') || '[]');
      return Array.isArray(saved) ? saved.slice(0, 30) : [];
    } catch {
      return [];
    }
  });

  // Programmer mode state
  const [progValue, setProgValue] = useState<number>(255);
  const [progBase, setProgBase] = useState<ProgBase>(10);
  const [progPendingOp, setProgPendingOp] = useState<string | null>(null);
  const [progAcc, setProgAcc] = useState<number | null>(null);

  // Converter state
  const [convCat, setConvCat] = useState<UnitCategory>('length');
  const [convFrom, setConvFrom] = useState<string>('m');
  const [convTo, setConvTo] = useState<string>('km');
  const [convInput, setConvInput] = useState<string>('1000');

  useEffect(() => {
    const defs = UNIT_DEFS[convCat].units;
    setConvFrom(defs[0].id);
    setConvTo(defs[1]?.id || defs[0].id);
  }, [convCat]);

  const convertedValue = useMemo(() => {
    const num = parseFloat(convInput.replace(',', '.'));
    if (Number.isNaN(num)) return '0';
    const defs = UNIT_DEFS[convCat].units;
    const fromU = defs.find((u) => u.id === convFrom) || defs[0];
    const toU = defs.find((u) => u.id === convTo) || defs[0];
    return formatNum(toU.fromBase(fromU.toBase(num)));
  }, [convCat, convFrom, convTo, convInput]);

  const pushHistory = (expr: string, result: string) => {
    const entry: HistoryEntry = {
      expr,
      result,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 30);
      try {
        localStorage.setItem('luma_calc_history_v1', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const appendToken = (tok: string) => {
    const isDigitOrDot = /^[0-9.]$/.test(tok);
    if (justEvaluated) {
      if (isDigitOrDot) {
        setDisplay(tok === '.' ? '0.' : tok);
        setExpression('');
      } else {
        setExpression(`${display} ${tok} `);
        setDisplay('0');
      }
      setJustEvaluated(false);
      return;
    }
    if (isDigitOrDot) {
      if (tok === '.' && display.includes('.')) return;
      setDisplay((prev) => (prev === '0' && tok !== '.' ? tok : prev + tok));
    } else if (['+', '−', '×', '÷', '^'].includes(tok)) {
      setExpression((prev) => `${prev}${display} ${tok} `);
      setDisplay('0');
    } else {
      setDisplay((prev) => (prev === '0' ? tok : prev + tok));
    }
  };

  const evaluateCurrent = () => {
    const full = `${expression}${display}`.trim();
    if (!full) return;
    const res = safeEvaluateMath(full, degMode);
    const str = formatNum(res);
    setDisplay(str);
    setExpression(`${full} =`);
    setJustEvaluated(true);
    if (str !== 'Ошибка') pushHistory(full, str);
  };

  const applyUnary = (fnName: string, fn: (x: number) => number) => {
    const val = parseFloat(display);
    if (Number.isNaN(val)) return;
    const res = fn(val);
    const str = formatNum(res);
    setExpression(`${fnName}(${display})`);
    setDisplay(str);
    setJustEvaluated(true);
    if (str !== 'Ошибка') pushHistory(`${fnName}(${val})`, str);
  };

  const clearAll = () => {
    setDisplay('0');
    setExpression('');
    setJustEvaluated(false);
  };

  const backspace = () => {
    if (justEvaluated) {
      clearAll();
      return;
    }
    setDisplay((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  // Keyboard support for Standard & Scientific modes
  useEffect(() => {
    if (mode !== 'standard' && mode !== 'scientific') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        appendToken(e.key);
      } else if (e.key === '+') {
        e.preventDefault();
        appendToken('+');
      } else if (e.key === '-') {
        e.preventDefault();
        appendToken('−');
      } else if (e.key === '*') {
        e.preventDefault();
        appendToken('×');
      } else if (e.key === '/') {
        e.preventDefault();
        appendToken('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        evaluateCurrent();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, display, expression, justEvaluated, degMode]);

  const copyResult = () => {
    const text = mode === 'programmer' ? progValue.toString(progBase).toUpperCase() : mode === 'converter' ? convertedValue : display;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  // Programmer keypad helper
  const progAppendDigit = (ch: string) => {
    const cur = progValue === 0 ? '' : (progValue >>> 0).toString(progBase);
    const nextStr = cur + ch.toLowerCase();
    const parsed = parseInt(nextStr, progBase);
    if (!Number.isNaN(parsed) && parsed <= 0xffffffff) {
      setProgValue(parsed | 0);
    }
  };

  const progApplyBitOp = (op: string) => {
    if (op === 'NOT') {
      setProgValue((v) => ~v);
      return;
    }
    if (op === '<<') {
      setProgValue((v) => v << 1);
      return;
    }
    if (op === '>>') {
      setProgValue((v) => v >> 1);
      return;
    }
    if (op === '=') {
      if (progPendingOp && progAcc !== null) {
        let r = progValue;
        if (progPendingOp === 'AND') r = progAcc & progValue;
        if (progPendingOp === 'OR') r = progAcc | progValue;
        if (progPendingOp === 'XOR') r = progAcc ^ progValue;
        if (progPendingOp === '+') r = (progAcc + progValue) | 0;
        if (progPendingOp === '-') r = (progAcc - progValue) | 0;
        setProgValue(r);
        setProgAcc(null);
        setProgPendingOp(null);
      }
      return;
    }
    setProgAcc(progValue);
    setProgPendingOp(op);
    setProgValue(0);
  };

  const btnBase = isDark
    ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-zinc-100'
    : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-900 shadow-sm';
  const btnOp = isDark
    ? 'bg-white/[0.1] hover:bg-white/[0.18] border-white/[0.12] text-zinc-100 font-bold'
    : 'bg-zinc-200/80 hover:bg-zinc-300/80 border-zinc-300 text-zinc-900 font-bold';
  const btnAccent = 'bg-[var(--luma-accent)] hover:brightness-110 text-white border-transparent font-bold shadow-md';

  const modeTabs: { id: CalcMode; label: string; icon: React.ReactNode }[] = [
    { id: 'standard', label: tr(lang, 'calcStandard'), icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'scientific', label: tr(lang, 'calcScientific'), icon: <Sigma className="w-3.5 h-3.5" /> },
    { id: 'programmer', label: tr(lang, 'calcProgrammer'), icon: <Binary className="w-3.5 h-3.5" /> },
    { id: 'converter', label: tr(lang, 'calcConverter'), icon: <Ruler className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-full flex flex-col p-3.5 gap-3">
      {/* Mode Selector Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
          {modeTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                mode === t.id
                  ? 'bg-[var(--luma-accent)] text-white shadow'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {mode === 'scientific' && (
            <button
              onClick={() => setDegMode((d) => !d)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${btnBase}`}
            >
              {degMode ? 'DEG' : 'RAD'}
            </button>
          )}
          <button
            onClick={copyResult}
            title="Копировать результат"
            className={`px-2.5 py-1.5 rounded-lg text-[11px] border flex items-center gap-1 cursor-pointer ${btnBase}`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {(mode === 'standard' || mode === 'scientific') && (
            <button
              onClick={() => setShowHistory((h) => !h)}
              title={tr(lang, 'calcHistory')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] border flex items-center gap-1 cursor-pointer ${
                showHistory ? btnAccent : btnBase
              }`}
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {(mode === 'standard' || mode === 'scientific') && (
        <div className="flex-1 min-h-0 flex gap-3">
          <div className="flex-1 flex flex-col gap-2.5 min-w-0">
            {/* LED Display */}
            <div
              className={`rounded-2xl border p-4 flex flex-col items-end justify-end min-h-[108px] ${
                isDark ? 'bg-black/45 border-white/10' : 'bg-zinc-100/90 border-zinc-200'
              }`}
            >
              <div className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-500 mb-1">
                <span>{memory !== 0 ? `M: ${formatNum(memory)}` : 'LUMA CALC 1.2'}</span>
                <span className="truncate max-w-[75%] text-right">{expression || ' '}</span>
              </div>
              <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight truncate w-full text-right">
                {display}
              </div>
            </div>

            {/* Memory strip */}
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { l: 'MC', fn: () => setMemory(0) },
                { l: 'MR', fn: () => { setDisplay(formatNum(memory)); setJustEvaluated(false); } },
                { l: 'M+', fn: () => setMemory((m) => m + (parseFloat(display) || 0)) },
                { l: 'M-', fn: () => setMemory((m) => m - (parseFloat(display) || 0)) },
                { l: 'MS', fn: () => setMemory(parseFloat(display) || 0) },
              ].map((m) => (
                <button
                  key={m.l}
                  onClick={m.fn}
                  className={`py-1.5 rounded-lg text-[11px] font-mono border cursor-pointer transition ${btnBase}`}
                >
                  {m.l}
                </button>
              ))}
            </div>

            {/* Scientific Extra Row */}
            {mode === 'scientific' && (
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { l: 'sin', fn: () => applyUnary('sin', (x) => Math.sin(degMode ? (x * Math.PI) / 180 : x)) },
                  { l: 'cos', fn: () => applyUnary('cos', (x) => Math.cos(degMode ? (x * Math.PI) / 180 : x)) },
                  { l: 'tan', fn: () => applyUnary('tan', (x) => Math.tan(degMode ? (x * Math.PI) / 180 : x)) },
                  { l: 'log', fn: () => applyUnary('log', Math.log10) },
                  { l: 'ln', fn: () => applyUnary('ln', Math.log) },
                  { l: '√x', fn: () => applyUnary('sqrt', Math.sqrt) },
                  { l: 'x²', fn: () => applyUnary('sqr', (x) => x * x) },
                  { l: 'xʸ', fn: () => appendToken('^') },
                  { l: 'n!', fn: () => applyUnary('fact', factorial) },
                  { l: '1/x', fn: () => applyUnary('inv', (x) => 1 / x) },
                  { l: 'π', fn: () => { setDisplay(String(Math.PI)); setJustEvaluated(false); } },
                  { l: 'e', fn: () => { setDisplay(String(Math.E)); setJustEvaluated(false); } },
                  { l: '(', fn: () => setExpression((e) => e + '(') },
                  { l: ')', fn: () => { setExpression((e) => e + display + ')'); setDisplay('0'); } },
                  { l: '|x|', fn: () => applyUnary('abs', Math.abs) },
                ].map((b) => (
                  <button
                    key={b.l}
                    onClick={b.fn}
                    className={`py-2 rounded-xl text-xs font-mono border cursor-pointer transition ${btnOp}`}
                  >
                    {b.l}
                  </button>
                ))}
              </div>
            )}

            {/* Main Keypad */}
            <div className="flex-1 grid grid-cols-4 gap-2">
              <button onClick={clearAll} className={`rounded-xl border text-sm font-bold text-rose-400 cursor-pointer transition ${btnBase}`}>C</button>
              <button onClick={() => setDisplay('0')} className={`rounded-xl border text-sm font-bold cursor-pointer transition ${btnBase}`}>CE</button>
              <button onClick={() => applyUnary('%', (x) => x / 100)} className={`rounded-xl border text-sm cursor-pointer transition ${btnOp}`}>%</button>
              <button onClick={backspace} className={`rounded-xl border flex items-center justify-center cursor-pointer transition ${btnOp}`}>
                <Delete className="w-4 h-4" />
              </button>

              {['7', '8', '9'].map((d) => (
                <button key={d} onClick={() => appendToken(d)} className={`rounded-xl border text-lg font-mono font-semibold cursor-pointer transition ${btnBase}`}>{d}</button>
              ))}
              <button onClick={() => appendToken('÷')} className={`rounded-xl border text-lg cursor-pointer transition ${btnOp}`}>÷</button>

              {['4', '5', '6'].map((d) => (
                <button key={d} onClick={() => appendToken(d)} className={`rounded-xl border text-lg font-mono font-semibold cursor-pointer transition ${btnBase}`}>{d}</button>
              ))}
              <button onClick={() => appendToken('×')} className={`rounded-xl border text-lg cursor-pointer transition ${btnOp}`}>×</button>

              {['1', '2', '3'].map((d) => (
                <button key={d} onClick={() => appendToken(d)} className={`rounded-xl border text-lg font-mono font-semibold cursor-pointer transition ${btnBase}`}>{d}</button>
              ))}
              <button onClick={() => appendToken('−')} className={`rounded-xl border text-lg cursor-pointer transition ${btnOp}`}>−</button>

              <button
                onClick={() => setDisplay((d) => (d.startsWith('-') ? d.slice(1) : d === '0' ? '0' : '-' + d))}
                className={`rounded-xl border text-sm font-mono font-semibold cursor-pointer transition ${btnBase}`}
              >
                ±
              </button>
              <button onClick={() => appendToken('0')} className={`rounded-xl border text-lg font-mono font-semibold cursor-pointer transition ${btnBase}`}>0</button>
              <button onClick={() => appendToken('.')} className={`rounded-xl border text-lg font-mono font-bold cursor-pointer transition ${btnBase}`}>.</button>
              <button onClick={() => appendToken('+')} className={`rounded-xl border text-lg cursor-pointer transition ${btnOp}`}>+</button>

              <button onClick={evaluateCurrent} className={`col-span-4 py-3 rounded-xl border text-xl cursor-pointer transition ${btnAccent}`}>=</button>
            </div>
          </div>

          {/* History Drawer */}
          {showHistory && (
            <div className={`w-52 shrink-0 rounded-2xl border p-3 flex flex-col gap-2 ${isDark ? 'bg-black/35 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{tr(lang, 'calcHistory')}</span>
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem('luma_calc_history_v1');
                  }}
                  className="text-zinc-500 hover:text-rose-400 cursor-pointer"
                  title={tr(lang, 'calcClear')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {history.length === 0 ? (
                  <div className="text-xs text-zinc-500 py-8 text-center">Пусто</div>
                ) : (
                  history.map((h, i) => (
                    <button
                      key={`${h.time}-${i}`}
                      onClick={() => {
                        setDisplay(h.result);
                        setExpression(h.expr);
                      }}
                      className={`w-full text-right p-2 rounded-xl border transition cursor-pointer ${
                        isDark ? 'border-white/5 hover:bg-white/5' : 'border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="text-[10px] font-mono text-zinc-500 truncate">{h.expr}</div>
                      <div className="text-sm font-mono font-bold truncate">{h.result}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Programmer Mode (HEX / DEC / OCT / BIN + Bitwise) */}
      {mode === 'programmer' && (
        <div className="flex-1 flex flex-col gap-3">
          <div className={`rounded-2xl border p-3.5 space-y-2 ${isDark ? 'bg-black/45 border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
            {([
              { base: 16 as ProgBase, label: 'HEX', val: (progValue >>> 0).toString(16).toUpperCase() },
              { base: 10 as ProgBase, label: 'DEC', val: String(progValue) },
              { base: 8 as ProgBase, label: 'OCT', val: (progValue >>> 0).toString(8) },
              { base: 2 as ProgBase, label: 'BIN', val: (progValue >>> 0).toString(2).replace(/(.{4})/g, '$1 ').trim() },
            ]).map((row) => (
              <button
                key={row.label}
                onClick={() => setProgBase(row.base)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl border text-left transition cursor-pointer ${
                  progBase === row.base
                    ? 'border-[var(--luma-accent)] bg-[var(--luma-accent)]/15'
                    : isDark
                    ? 'border-transparent hover:bg-white/5'
                    : 'border-transparent hover:bg-zinc-200/70'
                }`}
              >
                <span className="text-[11px] font-mono font-bold text-zinc-400 w-9">{row.label}</span>
                <span className="font-mono text-sm font-bold truncate">{row.val}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {['AND', 'OR', 'XOR', 'NOT', '<<', '>>'].map((op) => (
              <button
                key={op}
                onClick={() => progApplyBitOp(op)}
                className={`py-2 rounded-xl border text-xs font-mono cursor-pointer ${
                  progPendingOp === op ? btnAccent : btnOp
                }`}
              >
                {op}
              </button>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-4 gap-2">
            {['A', 'B', 'C', 'D', 'E', 'F', '7', '8', '9', '4', '5', '6', '1', '2', '3', '0'].map((ch) => {
              const digitVal = parseInt(ch, 16);
              const enabled = digitVal < progBase;
              return (
                <button
                  key={ch}
                  disabled={!enabled}
                  onClick={() => progAppendDigit(ch)}
                  className={`py-2.5 rounded-xl border font-mono font-bold text-sm transition ${
                    enabled ? `${btnBase} cursor-pointer` : 'opacity-25 cursor-not-allowed border-transparent'
                  }`}
                >
                  {ch}
                </button>
              );
            })}
            <button onClick={() => { setProgValue(0); setProgAcc(null); setProgPendingOp(null); }} className={`py-2.5 rounded-xl border text-rose-400 font-bold cursor-pointer ${btnBase}`}>C</button>
            <button onClick={() => progApplyBitOp('+')} className={`py-2.5 rounded-xl border font-mono cursor-pointer ${btnOp}`}>+</button>
            <button onClick={() => progApplyBitOp('-')} className={`py-2.5 rounded-xl border font-mono cursor-pointer ${btnOp}`}>−</button>
            <button onClick={() => progApplyBitOp('=')} className={`py-2.5 rounded-xl border font-mono cursor-pointer ${btnAccent}`}>=</button>
          </div>
        </div>
      )}

      {/* Unit Converter Mode */}
      {mode === 'converter' && (
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(UNIT_DEFS) as UnitCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setConvCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                  convCat === cat ? btnAccent : btnBase
                }`}
              >
                {UNIT_DEFS[cat].label}
              </button>
            ))}
          </div>

          <div className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'bg-black/35 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-zinc-500">Из единицы</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={convInput}
                  onChange={(e) => setConvInput(e.target.value)}
                  className={`flex-1 px-3 py-2.5 rounded-xl border font-mono text-lg font-bold outline-none ${
                    isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                />
                <select
                  value={convFrom}
                  onChange={(e) => setConvFrom(e.target.value)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                    isDark ? 'bg-zinc-900 border-white/15 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                >
                  {UNIT_DEFS[convCat].units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-zinc-500">В единицу</label>
              <div className="flex gap-2">
                <div
                  className={`flex-1 px-3 py-2.5 rounded-xl border font-mono text-lg font-bold ${
                    isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  {convertedValue}
                </div>
                <select
                  value={convTo}
                  onChange={(e) => setConvTo(e.target.value)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                    isDark ? 'bg-zinc-900 border-white/15 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                >
                  {UNIT_DEFS[convCat].units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
