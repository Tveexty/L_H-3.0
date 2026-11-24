import React, { useEffect, useMemo, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDownAZ, ArrowUpZA, BarChart3, Bold,
  Columns, Copy, Eraser, Filter, Italic, Lock, MessageSquare, PieChart, Plus,
  Rows, Sigma, Sparkles, Table2, Trash2, TrendingUp, Underline, Unlock, WrapText, X,
} from 'lucide-react';
import {
  CellMeta, colIndexToLetter, evaluateExcelFormula, ExcelChartDef,
  formatExcelDisplayValue, makeCellKey, OfficeSheet, RibbonBigBtn, RibbonGroup, RibbonSmallBtn,
} from './officeTypes';

export type ExcelRibbonTab = 'home' | 'insert' | 'page' | 'formulas' | 'data' | 'review' | 'view';

export interface LumaExcelEditorProps {
  officeDark: boolean;
  sheets: OfficeSheet[];
  activeSheetIdx: number;
  onChangeActiveSheetIdx: (idx: number) => void;
  onChangeSheets: (sheets: OfficeSheet[]) => void;
  onNotify?: (title: string, body: string, level?: 'info' | 'ok' | 'warn' | 'danger') => void;
  tellMeCommand?: { cmd: string; seq: number } | null;
}

const EXCEL_GREEN = '#107C41';

const FILL_COLORS = ['#FFFFFF', '#E6F4EA', '#DBEAFE', '#FEF3C7', '#FEE2E2', '#F3E8FF', '#107C41', '#185ABD', '#1F2937'];
const FONT_COLORS = ['#111827', '#107C41', '#185ABD', '#B91C1C', '#B45309', '#6D28D9', '#FFFFFF'];

const FORMULA_LIBRARY: { cat: string; name: string; template: string; desc: string }[] = [
  { cat: 'Основные', name: 'СУММ / SUM', template: '=СУММ(B2:B7)', desc: 'Складывает числа в диапазоне' },
  { cat: 'Основные', name: 'СРЗНАЧ / AVERAGE', template: '=СРЗНАЧ(B2:B7)', desc: 'Среднее арифметическое диапазона' },
  { cat: 'Основные', name: 'МИН / MIN', template: '=МИН(B2:B7)', desc: 'Минимальное значение' },
  { cat: 'Основные', name: 'МАКС / MAX', template: '=МАКС(B2:B7)', desc: 'Максимальное значение' },
  { cat: 'Основные', name: 'СЧЁТ / COUNT', template: '=СЧЁТ(B2:B7)', desc: 'Количество чисел в диапазоне' },
  { cat: 'Логика', name: 'ЕСЛИ / IF', template: '=ЕСЛИ(C2<=B2;"В норме";"Превышение")', desc: 'Условие: если истина / иначе' },
  { cat: 'Логика', name: 'СЧЁТЕСЛИ / COUNTIF', template: '=СЧЁТЕСЛИ(B2:B7;">10000")', desc: 'Подсчёт ячеек по условию' },
  { cat: 'Логика', name: 'СУММЕСЛИ / SUMIF', template: '=СУММЕСЛИ(A2:A7;"Продукты*";C2:C7)', desc: 'Сумма ячеек по условию' },
  { cat: 'Логика', name: 'ЕСЛИОШИБКА / IFERROR', template: '=ЕСЛИОШИБКА(C2/B2;0)', desc: 'Заменяет ошибку значением' },
  { cat: 'Поиск', name: 'ВПР / VLOOKUP', template: '=ВПР(A2;A2:D7;3;0)', desc: 'Вертикальный поиск в таблице' },
  { cat: 'Поиск', name: 'ИНДЕКС / INDEX', template: '=ИНДЕКС(A2:C7;2;2)', desc: 'Значение по номеру строки и столбца' },
  { cat: 'Поиск', name: 'ПОИСКПОЗ / MATCH', template: '=ПОИСКПОЗ("Транспорт";A2:A7;0)', desc: 'Позиция элемента в диапазоне' },
  { cat: 'Финансы', name: 'ПЛТ / PMT', template: '=-ПЛТ(0.16/12;24;500000)', desc: 'Ежемесячный платёж по кредиту' },
  { cat: 'Финансы', name: 'БС / FV', template: '=-БС(0.12/12;36;10000;0)', desc: 'Будущая стоимость вклада' },
  { cat: 'Статистика', name: 'МЕДИАНА / MEDIAN', template: '=МЕДИАНА(B2:B7)', desc: 'Медиана выборки' },
  { cat: 'Статистика', name: 'СТАНДОТКЛОН / STDEV', template: '=СТАНДОТКЛОН(B2:B7)', desc: 'Стандартное отклонение' },
  { cat: 'Текст/Дата', name: 'СЦЕПИТЬ / CONCAT', template: '=СЦЕПИТЬ(A2;" — ";B2)', desc: 'Объединяет несколько строк' },
  { cat: 'Текст/Дата', name: 'СЕГОДНЯ / TODAY', template: '=СЕГОДНЯ()', desc: 'Текущая дата' },
];

type CondFmtMode = 'none' | 'databars' | 'colorscale' | 'duplicates' | 'gt_avg';

export const LumaExcelEditor: React.FC<LumaExcelEditorProps> = ({
  officeDark,
  sheets,
  activeSheetIdx,
  onChangeActiveSheetIdx,
  onChangeSheets,
  onNotify,
  tellMeCommand,
}) => {
  const sheet = sheets[activeSheetIdx] || sheets[0];
  const [tab, setTab] = useState<ExcelRibbonTab>('home');
  const [selStart, setSelStart] = useState({ col: 0, row: 0 });
  const [selEnd, setSelEnd] = useState({ col: 0, row: 0 });
  const [draggingSel, setDraggingSel] = useState(false);
  const [fillDragging, setFillDragging] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [showGridlines, setShowGridlines] = useState(true);
  const [showHeaders, setShowHeaders] = useState(true);
  const [showFormulaBar, setShowFormulaBar] = useState(true);
  const [showFormulasMode, setShowFormulasMode] = useState(false);
  const [condFmt, setCondFmt] = useState<CondFmtMode>('none');
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [filterCol, setFilterCol] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [fxWizardOpen, setFxWizardOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [clipboardRange, setClipboardRange] = useState<{ cells: Record<string, string>; w: number; h: number } | null>(null);

  useEffect(() => {
    if (!tellMeCommand) return;
    const c = tellMeCommand.cmd;
    if (c === 'formula') { setTab('formulas'); setFxWizardOpen(true); }
    if (c === 'chart') { setTab('insert'); addChart('bar'); }
    if (c === 'filter') { setTab('data'); setFilterEnabled(true); }
    if (c === 'pivot') { setTab('insert'); buildPivotSheet(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tellMeCommand]);

  const updateSheet = (updater: (s: OfficeSheet) => OfficeSheet) => {
    onChangeSheets(sheets.map((s, i) => (i === activeSheetIdx ? updater(s) : s)));
  };

  const activeKey = makeCellKey(selStart.col, selStart.row);
  const activeRaw = sheet.cells[activeKey] || '';
  const activeStyle = sheet.styles?.[activeKey] || {};

  const selBounds = useMemo(() => {
    const r1 = Math.min(selStart.row, selEnd.row);
    const r2 = Math.max(selStart.row, selEnd.row);
    const c1 = Math.min(selStart.col, selEnd.col);
    const c2 = Math.max(selStart.col, selEnd.col);
    return { r1, r2, c1, c2 };
  }, [selStart, selEnd]);

  const selectedKeys = useMemo(() => {
    const out: string[] = [];
    for (let r = selBounds.r1; r <= selBounds.r2; r++) {
      for (let c = selBounds.c1; c <= selBounds.c2; c++) {
        out.push(makeCellKey(c, r));
      }
    }
    return out;
  }, [selBounds]);

  const nameBoxLabel =
    selBounds.r1 === selBounds.r2 && selBounds.c1 === selBounds.c2
      ? activeKey
      : `${makeCellKey(selBounds.c1, selBounds.r1)}:${makeCellKey(selBounds.c2, selBounds.r2)}`;

  const setCellRaw = (key: string, val: string) => {
    if (sheet.protected) {
      onNotify?.('Excel · Защита листа', 'Лист защищён. Снимите защиту на вкладке «Рецензирование».', 'warn');
      return;
    }
    updateSheet((s) => {
      const nextCells = { ...s.cells };
      if (val === '') delete nextCells[key];
      else nextCells[key] = val;
      return { ...s, cells: nextCells };
    });
  };

  const applyStyleToSelection = (patch: Partial<CellMeta>) => {
    if (sheet.protected) return;
    updateSheet((s) => {
      const nextStyles = { ...(s.styles || {}) };
      for (const k of selectedKeys) {
        nextStyles[k] = { ...(nextStyles[k] || {}), ...patch };
      }
      return { ...s, styles: nextStyles };
    });
  };

  // Evaluate all displayed values once per render for speed & conditional formatting
  const evaluatedMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [k, raw] of Object.entries(sheet.cells)) {
      map[k] = raw.trim().startsWith('=') ? evaluateExcelFormula(raw, sheet.cells) : raw;
    }
    return map;
  }, [sheet.cells]);

  // Live Excel Status Bar stats for currently selected range (Average / Count / Sum!)
  const selectionStats = useMemo(() => {
    const nums: number[] = [];
    let nonEmpty = 0;
    for (const k of selectedKeys) {
      const v = evaluatedMap[k] ?? '';
      if (v.trim() !== '') {
        nonEmpty++;
        const n = Number(v.replace(/\s/g, '').replace(',', '.'));
        if (!Number.isNaN(n)) nums.push(n);
      }
    }
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = nums.length ? sum / nums.length : 0;
    return { count: nonEmpty, numCount: nums.length, sum, avg };
  }, [selectedKeys, evaluatedMap]);

  // Numeric stats across sheet for Conditional Formatting (Data Bars / Color Scale / Duplicates)
  const sheetCondStats = useMemo(() => {
    const freq = new Map<string, number>();
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let cnt = 0;
    for (const v of Object.values(evaluatedMap)) {
      const t = v.trim();
      if (!t) continue;
      freq.set(t.toLowerCase(), (freq.get(t.toLowerCase()) || 0) + 1);
      const n = Number(t.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isNaN(n)) {
        if (n < min) min = n;
        if (n > max) max = n;
        sum += n;
        cnt++;
      }
    }
    return { freq, min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : 100, avg: cnt ? sum / cnt : 0 };
  }, [evaluatedMap]);

  // Smart AutoSum (sums contiguous numbers above or left of active cell)
  const runAutoSum = (fnName: 'СУММ' | 'СРЗНАЧ' | 'СЧЁТ' | 'МАКС' | 'МИН' = 'СУММ') => {
    const { col, row } = selStart;
    if (selBounds.r1 !== selBounds.r2 || selBounds.c1 !== selBounds.c2) {
      const targetKey = makeCellKey(selBounds.c1, selBounds.r2 + 1);
      setCellRaw(targetKey, `=${fnName}(${makeCellKey(selBounds.c1, selBounds.r1)}:${makeCellKey(selBounds.c2, selBounds.r2)})`);
      setSelStart({ col: selBounds.c1, row: selBounds.r2 + 1 });
      setSelEnd({ col: selBounds.c1, row: selBounds.r2 + 1 });
      return;
    }
    let startR = row - 1;
    while (startR >= 0 && (sheet.cells[makeCellKey(col, startR)] || '').trim() !== '') startR--;
    startR++;
    if (startR < row) {
      setCellRaw(activeKey, `=${fnName}(${makeCellKey(col, startR)}:${makeCellKey(col, row - 1)})`);
    } else {
      setCellRaw(activeKey, `=${fnName}(B2:B7)`);
    }
  };

  // Smart Fill Handle Down/Right with number increment & formula relative row shift!
  const performFillTo = (targetCol: number, targetRow: number) => {
    if (sheet.protected) return;
    const baseRaw = sheet.cells[activeKey] || '';
    if (!baseRaw) return;
    updateSheet((s) => {
      const nextCells = { ...s.cells };
      const nextStyles = { ...(s.styles || {}) };
      const baseStyle = s.styles?.[activeKey];
      const baseNum = Number(baseRaw.replace(',', '.'));
      const isNum = !baseRaw.startsWith('=') && !Number.isNaN(baseNum) && baseRaw.trim() !== '';

      const rEnd = Math.max(selStart.row, targetRow);
      const cEnd = Math.max(selStart.col, targetCol);
      for (let r = selStart.row; r <= rEnd; r++) {
        for (let c = selStart.col; c <= cEnd; c++) {
          if (r === selStart.row && c === selStart.col) continue;
          const k = makeCellKey(c, r);
          const dr = r - selStart.row;
          const dc = c - selStart.col;
          if (isNum) {
            nextCells[k] = String(baseNum + dr + dc);
          } else if (baseRaw.startsWith('=')) {
            nextCells[k] = baseRaw.replace(/([A-Za-z]+)(\d+)/g, (_m, colStr: string, rowStr: string) => {
              const newRow = Math.max(1, parseInt(rowStr, 10) + dr);
              return `${colStr}${newRow}`;
            });
          } else {
            nextCells[k] = baseRaw;
          }
          if (baseStyle) nextStyles[k] = { ...baseStyle };
        }
      }
      return { ...s, cells: nextCells, styles: nextStyles };
    });
    setSelEnd({ col: Math.max(selStart.col, targetCol), row: Math.max(selStart.row, targetRow) });
  };

  // Format as Table preset
  const applyTableStyle = (headerBg: string, stripeBg: string) => {
    updateSheet((s) => {
      const nextStyles = { ...(s.styles || {}) };
      const r1 = selBounds.r1;
      const r2 = Math.max(selBounds.r2, r1 + 6);
      const c1 = selBounds.c1;
      const c2 = Math.max(selBounds.c2, c1 + 4);
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const k = makeCellKey(c, r);
          if (r === r1) {
            nextStyles[k] = { ...(nextStyles[k] || {}), bold: true, bg: headerBg, color: '#ffffff', border: 'all' };
          } else {
            nextStyles[k] = { ...(nextStyles[k] || {}), bg: (r - r1) % 2 === 0 ? stripeBg : '#ffffff', color: '#111827', border: 'all' };
          }
        }
      }
      return { ...s, styles: nextStyles };
    });
    onNotify?.('Excel · Формат таблицы', 'Применён стиль таблицы Excel к диапазону', 'ok');
  };

  // Sort rows by active column (preserving row 1 header!)
  const sortByActiveCol = (asc: boolean) => {
    if (sheet.protected) return;
    const col = selStart.col;
    const populatedRows: number[] = [];
    for (let r = 1; r < sheet.rows; r++) {
      let hasData = false;
      for (let c = 0; c < sheet.cols; c++) {
        if ((sheet.cells[makeCellKey(c, r)] || '').trim() !== '') {
          hasData = true;
          break;
        }
      }
      if (hasData) populatedRows.push(r);
    }
    const rowData = populatedRows.map((r) => {
      const vals: string[] = [];
      const sts: (CellMeta | undefined)[] = [];
      for (let c = 0; c < sheet.cols; c++) {
        const k = makeCellKey(c, r);
        vals.push(sheet.cells[k] || '');
        sts.push(sheet.styles?.[k]);
      }
      return { sortVal: evaluatedMap[makeCellKey(col, r)] || '', vals, sts };
    });
    rowData.sort((a, b) => {
      const na = Number(a.sortVal.replace(',', '.'));
      const nb = Number(b.sortVal.replace(',', '.'));
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return asc ? na - nb : nb - na;
      return asc ? a.sortVal.localeCompare(b.sortVal, 'ru') : b.sortVal.localeCompare(a.sortVal, 'ru');
    });
    updateSheet((s) => {
      const nextCells = { ...s.cells };
      const nextStyles = { ...(s.styles || {}) };
      populatedRows.forEach((origRow, i) => {
        for (let c = 0; c < s.cols; c++) {
          const k = makeCellKey(c, origRow);
          const v = rowData[i].vals[c];
          if (v) nextCells[k] = v;
          else delete nextCells[k];
          if (rowData[i].sts[c]) nextStyles[k] = rowData[i].sts[c]!;
        }
      });
      return { ...s, cells: nextCells, styles: nextStyles };
    });
    onNotify?.('Excel · Сортировка', `Столбец ${colIndexToLetter(col)} отсортирован (${asc ? 'А→Я' : 'Я→А'})`, 'ok');
  };

  // Remove duplicate rows
  const removeDuplicates = () => {
    const seen = new Set<string>();
    let removed = 0;
    updateSheet((s) => {
      const nextCells = { ...s.cells };
      for (let r = 1; r < s.rows; r++) {
        const sig = Array.from({ length: s.cols }, (_, c) => (s.cells[makeCellKey(c, r)] || '').trim()).join('|');
        if (sig.replace(/\|/g, '') === '') continue;
        if (seen.has(sig.toLowerCase())) {
          removed++;
          for (let c = 0; c < s.cols; c++) delete nextCells[makeCellKey(c, r)];
        } else {
          seen.add(sig.toLowerCase());
        }
      }
      return { ...s, cells: nextCells };
    });
    onNotify?.('Excel · Дубликаты', removed > 0 ? `Удалено дубликатов строк: ${removed}` : 'Повторяющихся строк не найдено', 'ok');
  };

  // Generate Pivot Summary Sheet
  const buildPivotSheet = () => {
    const groups = new Map<string, { count: number; sum: number }>();
    for (let r = 1; r < sheet.rows; r++) {
      const key = (evaluatedMap[makeCellKey(0, r)] || '').trim();
      if (!key || key.toUpperCase() === 'ИТОГО') continue;
      const val = Number((evaluatedMap[makeCellKey(1, r)] || evaluatedMap[makeCellKey(2, r)] || '0').replace(',', '.'));
      const g = groups.get(key) || { count: 0, sum: 0 };
      g.count++;
      if (!Number.isNaN(val)) g.sum += val;
      groups.set(key, g);
    }
    const pivotCells: Record<string, string> = { A1: 'Группа (Сводная)', B1: 'Количество', C1: 'Сумма' };
    const pivotStyles: Record<string, CellMeta> = {
      A1: { bold: true, bg: '#107C41', color: '#fff' },
      B1: { bold: true, bg: '#107C41', color: '#fff' },
      C1: { bold: true, bg: '#107C41', color: '#fff' },
    };
    let rowIdx = 2;
    groups.forEach((v, k) => {
      pivotCells[`A${rowIdx}`] = k;
      pivotCells[`B${rowIdx}`] = String(v.count);
      pivotCells[`C${rowIdx}`] = String(v.sum);
      pivotStyles[`C${rowIdx}`] = { format: 'currency' };
      rowIdx++;
    });
    pivotCells[`A${rowIdx}`] = 'ОБЩИЙ ИТОГ';
    pivotCells[`B${rowIdx}`] = `=СУММ(B2:B${rowIdx - 1})`;
    pivotCells[`C${rowIdx}`] = `=СУММ(C2:C${rowIdx - 1})`;
    pivotStyles[`A${rowIdx}`] = { bold: true, bg: '#E6F4EA' };
    pivotStyles[`B${rowIdx}`] = { bold: true, bg: '#E6F4EA' };
    pivotStyles[`C${rowIdx}`] = { bold: true, bg: '#E6F4EA', format: 'currency' };

    const newSheet: OfficeSheet = {
      name: `Сводная ${sheets.length + 1}`,
      rows: Math.max(25, rowIdx + 5),
      cols: 8,
      freezeHeader: true,
      cells: pivotCells,
      styles: pivotStyles,
    };
    onChangeSheets([...sheets, newSheet]);
    onChangeActiveSheetIdx(sheets.length);
    onNotify?.('Excel · Сводная таблица', `Создана сводная по ${groups.size} группам`, 'ok');
  };

  // Add Live Chart
  const addChart = (type: ExcelChartDef['type']) => {
    const newChart: ExcelChartDef = {
      id: `ch_${Date.now()}`,
      type,
      title: `Диаграмма (${type.toUpperCase()})`,
      labelCol: selBounds.c1,
      valueCol: selBounds.c2 > selBounds.c1 ? selBounds.c2 : Math.min(sheet.cols - 1, selBounds.c1 + 1),
      startRow: Math.max(1, selBounds.r1 === 0 ? 1 : selBounds.r1),
      endRow: Math.max(5, selBounds.r2),
    };
    updateSheet((s) => ({ ...s, charts: [...(s.charts || []), newChart] }));
    onNotify?.('Excel · Диаграмма', 'Живая диаграмма добавлена справа от таблицы', 'ok');
  };

  // Filtered visible row indices
  const visibleRows = useMemo(() => {
    const out: number[] = [];
    const q = filterText.trim().toLowerCase();
    for (let r = 0; r < sheet.rows; r++) {
      if (!filterEnabled || r === 0 || !q) {
        out.push(r);
      } else {
        const val = (evaluatedMap[makeCellKey(filterCol, r)] || '').toLowerCase();
        if (val.includes(q)) out.push(r);
      }
    }
    return out;
  }, [sheet.rows, filterEnabled, filterCol, filterText, evaluatedMap]);

  const ribbonBg = officeDark ? 'bg-[#252526] border-white/10 text-zinc-100' : 'bg-[#F3F2F1] border-[#D1D1D1] text-[#242424]';
  const tabBarBg = officeDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-[#E1DFDD]';

  const TABS: { id: ExcelRibbonTab; label: string }[] = [
    { id: 'home', label: 'Главная' },
    { id: 'insert', label: 'Вставка' },
    { id: 'page', label: 'Разметка страницы' },
    { id: 'formulas', label: 'Формулы' },
    { id: 'data', label: 'Данные' },
    { id: 'review', label: 'Рецензирование' },
    { id: 'view', label: 'Вид' },
  ];

  const CHART_COLORS = ['#107C41', '#185ABD', '#F59E0B', '#E11D48', '#7C3AED', '#0EA5E9', '#14B8A6'];

  return (
    <div
      className="flex flex-col flex-1 min-h-0 select-none"
      onMouseUp={() => {
        setDraggingSel(false);
        setFillDragging(false);
      }}
    >
      {/* AUTHENTIC MS EXCEL RIBBON TABS */}
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
                    ? 'bg-[#252526] text-[#34D399] font-bold'
                    : 'bg-[#F3F2F1] text-[#107C41] font-bold'
                  : officeDark
                  ? 'text-zinc-300 hover:bg-white/5'
                  : 'text-[#323130] hover:bg-[#F3F2F1]'
              }`}
            >
              {t.label}
              {active && <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full bg-[#107C41]" />}
            </button>
          );
        })}
        {sheet.protected && (
          <span className="ml-auto px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-bold inline-flex items-center gap-1">
            <Lock className="w-3 h-3" /> Лист защищён
          </span>
        )}
      </div>

      {/* AUTHENTIC MS EXCEL RIBBON GROUPS */}
      <div className={`flex items-stretch overflow-x-auto border-b px-1.5 py-0.5 ${ribbonBg}`}>
        {tab === 'home' && (
          <>
            <RibbonGroup label="Буфер обмена" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Copy className="w-5 h-5 text-[#107C41]" />}
                label="Копировать"
                accent={EXCEL_GREEN}
                isDark={officeDark}
                onClick={() => {
                  const data: Record<string, string> = {};
                  for (let r = selBounds.r1; r <= selBounds.r2; r++) {
                    for (let c = selBounds.c1; c <= selBounds.c2; c++) {
                      data[`${c - selBounds.c1}:${r - selBounds.r1}`] = sheet.cells[makeCellKey(c, r)] || '';
                    }
                  }
                  setClipboardRange({ cells: data, w: selBounds.c2 - selBounds.c1 + 1, h: selBounds.r2 - selBounds.r1 + 1 });
                  onNotify?.('Excel', 'Диапазон скопирован', 'info');
                }}
              />
              <RibbonBigBtn
                icon={<Table2 className="w-5 h-5" />}
                label="Вставить"
                disabled={!clipboardRange}
                accent={EXCEL_GREEN}
                isDark={officeDark}
                onClick={() => {
                  if (!clipboardRange) return;
                  updateSheet((s) => {
                    const next = { ...s.cells };
                    for (const [rel, val] of Object.entries(clipboardRange.cells)) {
                      const [dc, dr] = rel.split(':').map(Number);
                      const k = makeCellKey(selStart.col + dc, selStart.row + dr);
                      if (val) next[k] = val;
                      else delete next[k];
                    }
                    return { ...s, cells: next };
                  });
                }}
              />
            </RibbonGroup>

            <RibbonGroup label="Шрифт и Границы" isDark={officeDark}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-0.5">
                  <RibbonSmallBtn icon={<Bold className="w-3.5 h-3.5" />} active={activeStyle.bold} accent={EXCEL_GREEN} isDark={officeDark} title="Полужирный" onClick={() => applyStyleToSelection({ bold: !activeStyle.bold })} />
                  <RibbonSmallBtn icon={<Italic className="w-3.5 h-3.5" />} active={activeStyle.italic} accent={EXCEL_GREEN} isDark={officeDark} title="Курсив" onClick={() => applyStyleToSelection({ italic: !activeStyle.italic })} />
                  <RibbonSmallBtn icon={<Underline className="w-3.5 h-3.5" />} active={activeStyle.underline} accent={EXCEL_GREEN} isDark={officeDark} title="Подчёркнутый" onClick={() => applyStyleToSelection({ underline: !activeStyle.underline })} />
                  <div className="h-4 w-px bg-zinc-400/30 mx-0.5" />
                  <RibbonSmallBtn icon={<span className="text-[10px] font-bold">⊞</span>} label="Границы" active={activeStyle.border === 'all'} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => applyStyleToSelection({ border: activeStyle.border === 'all' ? 'none' : 'all' })} />
                  <RibbonSmallBtn icon={<span className="text-[10px] font-bold">▁</span>} title="Нижняя граница" active={activeStyle.border === 'bottom'} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => applyStyleToSelection({ border: activeStyle.border === 'bottom' ? 'none' : 'bottom' })} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] opacity-60">Фон:</span>
                  {FILL_COLORS.slice(0, 7).map((c) => (
                    <button key={c} type="button" onClick={() => applyStyleToSelection({ bg: c })} className="w-3.5 h-3.5 rounded-xs border border-black/25 cursor-pointer" style={{ backgroundColor: c }} />
                  ))}
                  <span className="text-[9px] opacity-60 ml-1">Текст:</span>
                  {FONT_COLORS.slice(0, 5).map((c) => (
                    <button key={c} type="button" onClick={() => applyStyleToSelection({ color: c })} className="w-3.5 h-3.5 rounded-full border border-black/25 cursor-pointer" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </RibbonGroup>

            <RibbonGroup label="Выравнивание" isDark={officeDark}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-0.5">
                  <RibbonSmallBtn icon={<AlignLeft className="w-3.5 h-3.5" />} active={activeStyle.align === 'left'} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => applyStyleToSelection({ align: 'left' })} />
                  <RibbonSmallBtn icon={<AlignCenter className="w-3.5 h-3.5" />} active={activeStyle.align === 'center'} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => applyStyleToSelection({ align: 'center' })} />
                  <RibbonSmallBtn icon={<AlignRight className="w-3.5 h-3.5" />} active={activeStyle.align === 'right'} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => applyStyleToSelection({ align: 'right' })} />
                </div>
                <div className="flex items-center gap-0.5">
                  <RibbonSmallBtn icon={<WrapText className="w-3.5 h-3.5" />} label="Перенос" active={activeStyle.wrap} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => applyStyleToSelection({ wrap: !activeStyle.wrap })} />
                  <RibbonSmallBtn
                    icon={<Columns className="w-3.5 h-3.5" />}
                    label="Объед."
                    active={(activeStyle.colSpan || 1) > 1}
                    accent={EXCEL_GREEN}
                    isDark={officeDark}
                    onClick={() => {
                      const span = Math.max(1, selBounds.c2 - selBounds.c1 + 1);
                      applyStyleToSelection({ colSpan: (activeStyle.colSpan || 1) > 1 ? 1 : Math.max(2, span), align: 'center' });
                    }}
                  />
                </div>
              </div>
            </RibbonGroup>

            <RibbonGroup label="Число" isDark={officeDark}>
              <div className="flex flex-col gap-1">
                <select
                  value={activeStyle.format || 'general'}
                  onChange={(e) => applyStyleToSelection({ format: e.target.value as CellMeta['format'] })}
                  className={`h-6 px-1.5 rounded border text-[11px] w-28 outline-none ${officeDark ? 'bg-[#1e1e1e] border-white/15' : 'bg-white border-[#C8C6C4]'}`}
                >
                  <option value="general">Общий</option>
                  <option value="number">Числовой</option>
                  <option value="currency">Денежный (₽)</option>
                  <option value="usd">Доллар ($)</option>
                  <option value="eur">Евро (€)</option>
                  <option value="percent">Процентный (%)</option>
                  <option value="text">Текстовый</option>
                </select>
                <div className="flex items-center gap-0.5">
                  <RibbonSmallBtn icon={<span className="font-bold text-[11px]">₽</span>} isDark={officeDark} title="Денежный ₽" onClick={() => applyStyleToSelection({ format: 'currency' })} />
                  <RibbonSmallBtn icon={<span className="font-bold text-[11px]">%</span>} isDark={officeDark} title="Процентный" onClick={() => applyStyleToSelection({ format: 'percent' })} />
                  <RibbonSmallBtn icon={<span className="font-mono text-[10px]">.00↑</span>} isDark={officeDark} title="Увеличить разрядность" onClick={() => applyStyleToSelection({ decimals: Math.min(4, (activeStyle.decimals ?? 2) + 1) })} />
                  <RibbonSmallBtn icon={<span className="font-mono text-[10px]">.0↓</span>} isDark={officeDark} title="Уменьшить разрядность" onClick={() => applyStyleToSelection({ decimals: Math.max(0, (activeStyle.decimals ?? 2) - 1) })} />
                </div>
              </div>
            </RibbonGroup>

            <RibbonGroup label="Стили и Усл. формат" isDark={officeDark}>
              <div className="flex flex-col gap-1">
                <select
                  value={condFmt}
                  onChange={(e) => setCondFmt(e.target.value as CondFmtMode)}
                  className={`h-6 px-1.5 rounded border text-[10px] outline-none ${officeDark ? 'bg-[#1e1e1e] border-white/15' : 'bg-white border-[#C8C6C4]'}`}
                >
                  <option value="none">Усл. форматирование: Выкл</option>
                  <option value="databars">Гистограммы в ячейках</option>
                  <option value="colorscale">Цветовая шкала (Зелёный-Красный)</option>
                  <option value="gt_avg">Подсветить выше среднего</option>
                  <option value="duplicates">Подсветить дубликаты</option>
                </select>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => applyTableStyle('#107C41', '#E6F4EA')} className="px-1.5 py-0.5 rounded bg-[#107C41] text-white text-[9px] font-bold cursor-pointer">Табл. Зел.</button>
                  <button type="button" onClick={() => applyTableStyle('#185ABD', '#EFF6FF')} className="px-1.5 py-0.5 rounded bg-[#185ABD] text-white text-[9px] font-bold cursor-pointer">Табл. Син.</button>
                  <button type="button" onClick={() => applyTableStyle('#B7472A', '#FFF7ED')} className="px-1.5 py-0.5 rounded bg-[#B7472A] text-white text-[9px] font-bold cursor-pointer">Табл. Оранж.</button>
                </div>
              </div>
            </RibbonGroup>

            <RibbonGroup label="Ячейки и Автосумма" isDark={officeDark}>
              <RibbonBigBtn icon={<Sigma className="w-5 h-5 text-[#107C41]" />} label="Автосумма" accent={EXCEL_GREEN} isDark={officeDark} onClick={() => runAutoSum('СУММ')} />
              <div className="flex flex-col gap-0.5">
                <RibbonSmallBtn icon={<Rows className="w-3.5 h-3.5" />} label="+Строки" isDark={officeDark} onClick={() => updateSheet((s) => ({ ...s, rows: s.rows + 10 }))} />
                <RibbonSmallBtn icon={<Columns className="w-3.5 h-3.5" />} label="+Столбцы" isDark={officeDark} onClick={() => updateSheet((s) => ({ ...s, cols: Math.min(26, s.cols + 4) }))} />
                <RibbonSmallBtn
                  icon={<Eraser className="w-3.5 h-3.5 text-rose-500" />}
                  label="Очистить"
                  isDark={officeDark}
                  onClick={() => {
                    updateSheet((s) => {
                      const nc = { ...s.cells };
                      const ns = { ...(s.styles || {}) };
                      selectedKeys.forEach((k) => { delete nc[k]; delete ns[k]; });
                      return { ...s, cells: nc, styles: ns };
                    });
                  }}
                />
              </div>
            </RibbonGroup>
          </>
        )}

        {tab === 'insert' && (
          <>
            <RibbonGroup label="Сводные таблицы" isDark={officeDark}>
              <RibbonBigBtn icon={<Table2 className="w-5 h-5 text-[#107C41]" />} label="Сводная таблица" isDark={officeDark} onClick={buildPivotSheet} />
            </RibbonGroup>
            <RibbonGroup label="Диаграммы (6 типов)" isDark={officeDark}>
              <RibbonBigBtn icon={<BarChart3 className="w-5 h-5 text-[#107C41]" />} label="Гистограмма" isDark={officeDark} onClick={() => addChart('bar')} />
              <RibbonBigBtn icon={<BarChart3 className="w-5 h-5 rotate-90 text-sky-600" />} label="Линейчатая" isDark={officeDark} onClick={() => addChart('hbar')} />
              <RibbonBigBtn icon={<TrendingUp className="w-5 h-5 text-indigo-500" />} label="График" isDark={officeDark} onClick={() => addChart('line')} />
              <RibbonBigBtn icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} label="С областями" isDark={officeDark} onClick={() => addChart('area')} />
              <RibbonBigBtn icon={<PieChart className="w-5 h-5 text-amber-500" />} label="Круговая" isDark={officeDark} onClick={() => addChart('pie')} />
              <RibbonBigBtn icon={<PieChart className="w-5 h-5 text-rose-500" />} label="Кольцевая" isDark={officeDark} onClick={() => addChart('donut')} />
            </RibbonGroup>
          </>
        )}

        {tab === 'page' && (
          <RibbonGroup label="Параметры листа" isDark={officeDark}>
            <RibbonBigBtn icon={<Table2 className="w-5 h-5 text-[#107C41]" />} label="Сетка" active={showGridlines} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => setShowGridlines((v) => !v)} />
            <RibbonBigBtn icon={<span className="font-mono font-bold text-sm">A/1</span>} label="Заголовки" active={showHeaders} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => setShowHeaders((v) => !v)} />
          </RibbonGroup>
        )}

        {tab === 'formulas' && (
          <>
            <RibbonGroup label="Библиотека функций (55+)" isDark={officeDark}>
              <RibbonBigBtn icon={<span className="font-serif italic font-black text-lg text-[#107C41]">fx</span>} label="Вставить функцию" active={fxWizardOpen} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => setFxWizardOpen((v) => !v)} />
              <RibbonBigBtn icon={<Sigma className="w-5 h-5 text-[#107C41]" />} label="СУММ" isDark={officeDark} onClick={() => runAutoSum('СУММ')} />
              <RibbonBigBtn icon={<span className="font-mono text-xs font-bold">AVG</span>} label="СРЗНАЧ" isDark={officeDark} onClick={() => runAutoSum('СРЗНАЧ')} />
              <RibbonBigBtn icon={<span className="font-mono text-xs font-bold">MAX</span>} label="МАКС" isDark={officeDark} onClick={() => runAutoSum('МАКС')} />
              <RibbonBigBtn icon={<span className="font-mono text-xs font-bold">MIN</span>} label="МИН" isDark={officeDark} onClick={() => runAutoSum('МИН')} />
              <RibbonBigBtn icon={<Sparkles className="w-5 h-5 text-violet-500" />} label="ЕСЛИ / ВПР" isDark={officeDark} onClick={() => setFxWizardOpen(true)} />
            </RibbonGroup>
            <RibbonGroup label="Зависимости" isDark={officeDark}>
              <RibbonBigBtn
                icon={<span className="font-mono font-bold text-xs">=fx</span>}
                label="Показать формулы"
                active={showFormulasMode}
                accent={EXCEL_GREEN}
                isDark={officeDark}
                onClick={() => setShowFormulasMode((v) => !v)}
              />
            </RibbonGroup>
          </>
        )}

        {tab === 'data' && (
          <>
            <RibbonGroup label="Сортировка и фильтр" isDark={officeDark}>
              <RibbonBigBtn icon={<ArrowDownAZ className="w-5 h-5 text-[#107C41]" />} label="Сорт. А→Я" isDark={officeDark} onClick={() => sortByActiveCol(true)} />
              <RibbonBigBtn icon={<ArrowUpZA className="w-5 h-5 text-sky-600" />} label="Сорт. Я→А" isDark={officeDark} onClick={() => sortByActiveCol(false)} />
              <RibbonBigBtn
                icon={<Filter className="w-5 h-5 text-amber-500" />}
                label="Автофильтр"
                active={filterEnabled}
                accent={EXCEL_GREEN}
                isDark={officeDark}
                onClick={() => {
                  setFilterCol(selStart.col);
                  setFilterEnabled((v) => !v);
                }}
              />
            </RibbonGroup>
            <RibbonGroup label="Работа с данными" isDark={officeDark}>
              <RibbonBigBtn icon={<Trash2 className="w-5 h-5 text-rose-500" />} label="Удалить дубликаты" isDark={officeDark} onClick={removeDuplicates} />
              <RibbonBigBtn
                icon={<Sparkles className="w-5 h-5 text-indigo-500" />}
                label="Список в ячейке"
                isDark={officeDark}
                onClick={() => {
                  const raw = window.prompt('Варианты выпадающего списка через запятую:', 'В норме, Перерасход, Срочно, Готово');
                  if (raw) {
                    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
                    applyStyleToSelection({ validationList: list });
                    onNotify?.('Excel · Проверка данных', `Добавлен выпадающий список (${list.length} знач.)`, 'ok');
                  }
                }}
              />
            </RibbonGroup>
          </>
        )}

        {tab === 'review' && (
          <>
            <RibbonGroup label="Примечания" isDark={officeDark}>
              <RibbonBigBtn
                icon={<MessageSquare className="w-5 h-5 text-amber-500" />}
                label="Примечание к ячейке"
                isDark={officeDark}
                onClick={() => {
                  const note = window.prompt(`Примечание для ячейки ${activeKey}:`, activeStyle.note || '');
                  if (note !== null) applyStyleToSelection({ note: note.trim() || undefined });
                }}
              />
            </RibbonGroup>
            <RibbonGroup label="Защита" isDark={officeDark}>
              <RibbonBigBtn
                icon={sheet.protected ? <Unlock className="w-5 h-5 text-amber-500" /> : <Lock className="w-5 h-5 text-[#107C41]" />}
                label={sheet.protected ? 'Снять защиту' : 'Защитить лист'}
                active={sheet.protected}
                accent={EXCEL_GREEN}
                isDark={officeDark}
                onClick={() => updateSheet((s) => ({ ...s, protected: !s.protected }))}
              />
            </RibbonGroup>
          </>
        )}

        {tab === 'view' && (
          <>
            <RibbonGroup label="Окно · Закрепить" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Rows className="w-5 h-5 text-[#107C41]" />}
                label="Закрепить шапку"
                active={Boolean(sheet.freezeHeader)}
                accent={EXCEL_GREEN}
                isDark={officeDark}
                onClick={() => updateSheet((s) => ({ ...s, freezeHeader: !s.freezeHeader }))}
              />
              <RibbonBigBtn
                icon={<Columns className="w-5 h-5 text-sky-600" />}
                label="Закрепить 1 стлб."
                active={Boolean(sheet.freezeFirstCol)}
                accent={EXCEL_GREEN}
                isDark={officeDark}
                onClick={() => updateSheet((s) => ({ ...s, freezeFirstCol: !s.freezeFirstCol }))}
              />
            </RibbonGroup>
            <RibbonGroup label="Отображение" isDark={officeDark}>
              <RibbonSmallBtn icon={<span className="font-serif italic font-bold">fx</span>} label="Строка формул" active={showFormulaBar} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => setShowFormulaBar((v) => !v)} />
              <RibbonSmallBtn icon={<Table2 className="w-3.5 h-3.5" />} label="Сетка" active={showGridlines} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => setShowGridlines((v) => !v)} />
            </RibbonGroup>
            <RibbonGroup label="Масштаб" isDark={officeDark}>
              {[80, 100, 120, 140].map((z) => (
                <RibbonSmallBtn key={z} icon={<span className="font-mono text-[10px]">{z}%</span>} active={zoom === z} accent={EXCEL_GREEN} isDark={officeDark} onClick={() => setZoom(z)} />
              ))}
            </RibbonGroup>
          </>
        )}
      </div>

      {/* FORMULA WIZARD POPOVER */}
      {fxWizardOpen && (
        <div className={`px-4 py-2.5 border-b text-xs space-y-2 ${officeDark ? 'bg-[#1E1E1E] border-white/10 text-zinc-100' : 'bg-[#F0FDF4] border-[#BBF7D0] text-slate-900'}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#107C41]">Мастер функций Excel (55+ формул на русском и английском) — кликните для вставки в {activeKey}</span>
            <button type="button" onClick={() => setFxWizardOpen(false)} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
            {FORMULA_LIBRARY.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => {
                  setCellRaw(activeKey, f.template);
                  setFxWizardOpen(false);
                }}
                className={`p-1.5 rounded border text-left cursor-pointer transition ${
                  officeDark ? 'bg-white/5 border-white/12 hover:border-emerald-400' : 'bg-white border-emerald-200 hover:border-[#107C41]'
                }`}
              >
                <div className="font-mono font-bold text-[10px] text-[#107C41]">{f.name}</div>
                <div className="text-[9px] opacity-70 truncate">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AUTOFILTER BAR */}
      {filterEnabled && (
        <div className={`px-3 py-1.5 border-b flex items-center gap-2 text-xs ${officeDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-amber-50 border-amber-200 text-slate-800'}`}>
          <Filter className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-semibold">Фильтр по столбцу:</span>
          <select
            value={filterCol}
            onChange={(e) => setFilterCol(Number(e.target.value))}
            className={`px-2 py-0.5 rounded border text-xs ${officeDark ? 'bg-black/30 border-white/15' : 'bg-white border-zinc-300'}`}
          >
            {Array.from({ length: sheet.cols }).map((_, c) => (
              <option key={c} value={c}>{colIndexToLetter(c)} — {sheet.cells[makeCellKey(c, 0)] || `Столбец ${c + 1}`}</option>
            ))}
          </select>
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Содержит текст..."
            className={`px-2 py-0.5 rounded border text-xs w-48 outline-none ${officeDark ? 'bg-black/30 border-white/15' : 'bg-white border-zinc-300'}`}
          />
          <span className="text-[11px] opacity-70">Показано строк: {Math.max(0, visibleRows.length - 1)}</span>
          <button type="button" onClick={() => { setFilterText(''); setFilterEnabled(false); }} className="ml-auto text-rose-500 font-semibold cursor-pointer">Сбросить</button>
        </div>
      )}

      {/* AUTHENTIC EXCEL NAME BOX + fx FORMULA BAR */}
      {showFormulaBar && (
        <div className={`flex items-center gap-1.5 px-2 py-1 border-b text-xs ${officeDark ? 'bg-[#1E1E1E] border-white/10 text-zinc-100' : 'bg-white border-[#D1D1D1] text-slate-900'}`}>
          <div className={`px-2.5 py-1 rounded border font-mono font-bold text-center min-w-[74px] ${officeDark ? 'bg-[#252526] border-white/15' : 'bg-[#F3F2F1] border-[#C8C6C4]'}`}>
            {nameBoxLabel}
          </div>
          <button
            type="button"
            onClick={() => setFxWizardOpen((v) => !v)}
            title="Вставить функцию (55+ формул)"
            className={`px-2 py-1 rounded border font-serif italic font-black text-sm cursor-pointer ${officeDark ? 'border-white/15 hover:bg-white/10 text-emerald-400' : 'border-[#C8C6C4] hover:bg-[#E6F4EA] text-[#107C41]'}`}
          >
            fx
          </button>
          <input
            value={activeRaw}
            onChange={(e) => setCellRaw(activeKey, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSelStart((s) => ({ ...s, row: Math.min(sheet.rows - 1, s.row + 1) }));
                setSelEnd((s) => ({ ...s, row: Math.min(sheet.rows - 1, s.row + 1) }));
              }
            }}
            placeholder="Введите значение или формулу, например: =СУММ(B2:B7) или =ВПР(...)"
            className={`flex-1 px-2.5 py-1 rounded border font-mono text-xs outline-none ${
              officeDark ? 'bg-[#141414] border-white/15 text-white focus:border-[#107C41]' : 'bg-white border-[#C8C6C4] focus:border-[#107C41]'
            }`}
          />
        </div>
      )}

      {/* MAIN SPREADSHEET GRID + LIVE CHARTS DOCK */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className={`flex-1 min-w-0 overflow-auto ${officeDark ? 'bg-[#18181A]' : 'bg-white'}`}>
          <table
            style={{ fontSize: `${Math.round((12 * zoom) / 100)}px` }}
            className="border-collapse table-fixed"
          >
            {showHeaders && (
              <thead className={sheet.freezeHeader ? 'sticky top-0 z-20' : ''}>
                <tr>
                  <th className={`w-10 h-6 border text-[10px] font-mono ${officeDark ? 'bg-[#252526] border-white/12 text-zinc-400' : 'bg-[#F3F2F1] border-[#D1D1D1] text-slate-600'}`}>
                    ◢
                  </th>
                  {Array.from({ length: sheet.cols }).map((_, c) => {
                    const colActive = c >= selBounds.c1 && c <= selBounds.c2;
                    const wPx = sheet.colWidths?.[c] || (c === 0 ? 170 : 108);
                    return (
                      <th
                        key={c}
                        style={{ width: `${wPx}px` }}
                        onClick={() => {
                          setSelStart({ col: c, row: 0 });
                          setSelEnd({ col: c, row: sheet.rows - 1 });
                        }}
                        className={`relative h-6 border text-[11px] font-semibold cursor-pointer select-none ${
                          colActive
                            ? officeDark
                              ? 'bg-[#107C41]/30 border-[#107C41] text-emerald-300'
                              : 'bg-[#D3F0E0] border-[#107C41] text-[#107C41]'
                            : officeDark
                            ? 'bg-[#252526] border-white/12 text-zinc-300'
                            : 'bg-[#F3F2F1] border-[#D1D1D1] text-slate-700'
                        }`}
                      >
                        {colIndexToLetter(c)}
                        {/* Column Resize Handle */}
                        <span
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const origW = wPx;
                            const onMove = (ev: MouseEvent) => {
                              const nextW = Math.max(54, Math.min(360, origW + (ev.clientX - startX)));
                              updateSheet((s) => ({ ...s, colWidths: { ...(s.colWidths || {}), [c]: nextW } }));
                            };
                            const onUp = () => {
                              window.removeEventListener('mousemove', onMove);
                              window.removeEventListener('mouseup', onUp);
                            };
                            window.addEventListener('mousemove', onMove);
                            window.addEventListener('mouseup', onUp);
                          }}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#107C41]"
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
            )}
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r} className={sheet.freezeHeader && r === 0 ? 'sticky top-6 z-10' : ''}>
                  {showHeaders && (
                    <td
                      onClick={() => {
                        setSelStart({ col: 0, row: r });
                        setSelEnd({ col: sheet.cols - 1, row: r });
                      }}
                      className={`w-10 h-6 border text-center text-[10px] font-mono cursor-pointer ${
                        r >= selBounds.r1 && r <= selBounds.r2
                          ? officeDark
                            ? 'bg-[#107C41]/30 border-[#107C41] text-emerald-300 font-bold'
                            : 'bg-[#D3F0E0] border-[#107C41] text-[#107C41] font-bold'
                          : officeDark
                          ? 'bg-[#252526] border-white/12 text-zinc-400'
                          : 'bg-[#F3F2F1] border-[#D1D1D1] text-slate-600'
                      }`}
                    >
                      {r + 1}
                    </td>
                  )}
                  {Array.from({ length: sheet.cols }).map((_, c) => {
                    const key = makeCellKey(c, r);
                    const meta = sheet.styles?.[key] || {};
                    const rawVal = sheet.cells[key] || '';
                    const evalVal = evaluatedMap[key] ?? '';
                    const displayVal = showFormulasMode ? rawVal : formatExcelDisplayValue(evalVal, meta);
                    const isPrimary = c === selStart.col && r === selStart.row;
                    const inSelection = c >= selBounds.c1 && c <= selBounds.c2 && r >= selBounds.r1 && r <= selBounds.r2;
                    const isEditing = editingCell === key;
                    const isBottomRightOfSel = c === selBounds.c2 && r === selBounds.r2;

                    // Conditional formatting overlay
                    let condBg = meta.bg || '';
                    let dataBarPct = 0;
                    const numVal = Number(evalVal.replace(/\s/g, '').replace(',', '.'));
                    const hasNum = evalVal.trim() !== '' && !Number.isNaN(numVal);
                    if (condFmt === 'databars' && hasNum && sheetCondStats.max > sheetCondStats.min) {
                      dataBarPct = Math.max(4, Math.min(100, Math.round(((numVal - sheetCondStats.min) / (sheetCondStats.max - sheetCondStats.min)) * 100)));
                    } else if (condFmt === 'colorscale' && hasNum && sheetCondStats.max > sheetCondStats.min) {
                      const ratio = (numVal - sheetCondStats.min) / (sheetCondStats.max - sheetCondStats.min);
                      condBg = ratio > 0.66 ? '#DCFCE7' : ratio > 0.33 ? '#FEF9C3' : '#FEE2E2';
                    } else if (condFmt === 'gt_avg' && hasNum && numVal > sheetCondStats.avg) {
                      condBg = '#BBF7D0';
                    } else if (condFmt === 'duplicates' && evalVal.trim() && (sheetCondStats.freq.get(evalVal.trim().toLowerCase()) || 0) > 1) {
                      condBg = '#FECACA';
                    }

                    return (
                      <td
                        key={key}
                        title={meta.note ? `Примечание: ${meta.note}` : undefined}
                        onMouseDown={() => {
                          setEditingCell(null);
                          setSelStart({ col: c, row: r });
                          setSelEnd({ col: c, row: r });
                          setDraggingSel(true);
                        }}
                        onMouseEnter={() => {
                          if (fillDragging) performFillTo(c, r);
                          else if (draggingSel) setSelEnd({ col: c, row: r });
                        }}
                        onDoubleClick={() => setEditingCell(key)}
                        style={{
                          backgroundColor: condBg || (inSelection && !isPrimary ? (officeDark ? 'rgba(16,124,65,0.22)' : 'rgba(16,124,65,0.12)') : undefined),
                          color: meta.color || (condBg && condBg.startsWith('#F') ? '#111827' : undefined),
                          fontWeight: meta.bold ? 700 : undefined,
                          fontStyle: meta.italic ? 'italic' : undefined,
                          textDecoration: meta.underline ? 'underline' : undefined,
                          textAlign: meta.align || (hasNum ? 'right' : 'left'),
                          whiteSpace: meta.wrap ? 'normal' : 'nowrap',
                          borderBottom: meta.border === 'bottom' ? '2px solid #111827' : undefined,
                          borderColor: meta.border === 'all' ? '#475569' : undefined,
                        }}
                        className={`relative h-6 px-1.5 overflow-hidden text-ellipsis cursor-cell ${
                          showGridlines
                            ? officeDark
                              ? 'border border-white/10 text-zinc-100'
                              : 'border border-[#E2E8F0] text-slate-900'
                            : 'border border-transparent'
                        } ${isPrimary ? 'outline-2 -outline-offset-2 outline-[#107C41] z-10' : ''} ${
                          sheet.freezeFirstCol && c === 0 ? 'sticky left-10 z-10' : ''
                        }`}
                      >
                        {/* In-Cell Data Bar */}
                        {dataBarPct > 0 && (
                          <div
                            className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-xs bg-[#107C41]/25"
                            style={{ width: `${dataBarPct}%` }}
                          />
                        )}

                        {/* Classic Excel Red Corner Triangle for Cell Note */}
                        {meta.note && (
                          <span className="pointer-events-none absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-rose-600 border-l-[6px] border-l-transparent" />
                        )}

                        {isEditing ? (
                          meta.validationList && meta.validationList.length > 0 ? (
                            <select
                              autoFocus
                              value={rawVal}
                              onChange={(e) => {
                                setCellRaw(key, e.target.value);
                                setEditingCell(null);
                              }}
                              onBlur={() => setEditingCell(null)}
                              className="w-full h-full bg-white text-slate-900 outline-none text-xs"
                            >
                              <option value="">— Выбрать —</option>
                              {meta.validationList.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              autoFocus
                              value={rawVal}
                              onChange={(e) => setCellRaw(key, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingCell(null);
                                  setSelStart({ col: c, row: Math.min(sheet.rows - 1, r + 1) });
                                  setSelEnd({ col: c, row: Math.min(sheet.rows - 1, r + 1) });
                                } else if (e.key === 'Tab') {
                                  e.preventDefault();
                                  setEditingCell(null);
                                  setSelStart({ col: Math.min(sheet.cols - 1, c + 1), row: r });
                                  setSelEnd({ col: Math.min(sheet.cols - 1, c + 1), row: r });
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="w-full h-full bg-transparent outline-none font-mono text-xs"
                            />
                          )
                        ) : (
                          <span className="relative z-10">{displayVal}</span>
                        )}

                        {/* Classic MS Excel Green Fill Handle Square! */}
                        {isBottomRightOfSel && !isEditing && (
                          <span
                            title="Потяните за уголок для автозаполнения (Fill Handle)"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setFillDragging(true);
                            }}
                            className="absolute -bottom-[2px] -right-[2px] w-2 h-2 bg-[#107C41] border border-white cursor-crosshair z-20"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LIVE EXCEL CHARTS PANEL (Right Side when charts exist) */}
        {(sheet.charts || []).length > 0 && (
          <div
            className={`w-80 shrink-0 border-l p-3 overflow-y-auto space-y-3 ${
              officeDark ? 'bg-[#1E1E1E] border-white/10 text-zinc-100' : 'bg-[#F8FAFC] border-[#D1D1D1] text-slate-900'
            }`}
          >
            <div className="text-xs font-bold text-[#107C41] flex items-center justify-between">
              <span>Диаграммы листа ({sheet.charts!.length})</span>
            </div>
            {sheet.charts!.map((ch) => {
              const pts: { label: string; value: number }[] = [];
              for (let r = ch.startRow; r <= ch.endRow; r++) {
                const lbl = evaluatedMap[makeCellKey(ch.labelCol, r)] || `Стр ${r + 1}`;
                const val = Number((evaluatedMap[makeCellKey(ch.valueCol, r)] || '0').replace(/\s/g, '').replace(',', '.'));
                if (!Number.isNaN(val) && val !== 0) pts.push({ label: lbl, value: Math.abs(val) });
              }
              const maxV = Math.max(1, ...pts.map((p) => p.value));
              const totalV = Math.max(1, pts.reduce((a, b) => a + b.value, 0));

              return (
                <div key={ch.id} className={`rounded-lg border p-2.5 space-y-2 ${officeDark ? 'bg-[#252526] border-white/10' : 'bg-white border-zinc-200 shadow-xs'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={ch.title}
                      onChange={(e) =>
                        updateSheet((s) => ({
                          ...s,
                          charts: (s.charts || []).map((x) => (x.id === ch.id ? { ...x, title: e.target.value } : x)),
                        }))
                      }
                      className="text-xs font-bold bg-transparent outline-none flex-1 truncate"
                    />
                    <button
                      type="button"
                      onClick={() => updateSheet((s) => ({ ...s, charts: (s.charts || []).filter((x) => x.id !== ch.id) }))}
                      className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {pts.length === 0 ? (
                    <div className="text-[10px] opacity-60 py-6 text-center">Заполните числовые ячейки для отображения диаграммы</div>
                  ) : ch.type === 'pie' || ch.type === 'donut' ? (
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
                        {(() => {
                          let cum = 0;
                          return pts.map((p, i) => {
                            const frac = p.value / totalV;
                            const startA = cum * 2 * Math.PI - Math.PI / 2;
                            cum += frac;
                            const endA = cum * 2 * Math.PI - Math.PI / 2;
                            const x1 = 50 + 42 * Math.cos(startA);
                            const y1 = 50 + 42 * Math.sin(startA);
                            const x2 = 50 + 42 * Math.cos(endA);
                            const y2 = 50 + 42 * Math.sin(endA);
                            const large = frac > 0.5 ? 1 : 0;
                            return (
                              <path
                                key={i}
                                d={`M 50 50 L ${x1} ${y1} A 42 42 0 ${large} 1 ${x2} ${y2} Z`}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                              />
                            );
                          });
                        })()}
                        {ch.type === 'donut' && <circle cx="50" cy="50" r="22" fill={officeDark ? '#252526' : '#ffffff'} />}
                      </svg>
                      <div className="space-y-1 text-[10px] min-w-0 flex-1">
                        {pts.slice(0, 6).map((p, i) => (
                          <div key={i} className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="truncate">{p.label}</span>
                            <span className="ml-auto font-mono opacity-75">{Math.round((p.value / totalV) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : ch.type === 'line' || ch.type === 'area' ? (
                    <svg viewBox="0 0 260 120" className="w-full h-32">
                      {(() => {
                        const coords = pts.map((p, i) => ({
                          x: 16 + (pts.length > 1 ? (i / (pts.length - 1)) * 228 : 114),
                          y: 100 - (p.value / maxV) * 82,
                          p,
                        }));
                        const lineD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
                        return (
                          <>
                            {ch.type === 'area' && <path d={`${lineD} L ${coords[coords.length - 1].x} 100 L ${coords[0].x} 100 Z`} fill="#107C4133" />}
                            <path d={lineD} fill="none" stroke="#107C41" strokeWidth="2.5" strokeLinecap="round" />
                            {coords.map((c, i) => (
                              <g key={i}>
                                <circle cx={c.x} cy={c.y} r="3.5" fill="#107C41" />
                                <text x={c.x} y="114" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.7">
                                  {c.p.label.slice(0, 6)}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  ) : ch.type === 'hbar' ? (
                    <div className="space-y-1.5">
                      {pts.slice(0, 6).map((p, i) => (
                        <div key={i} className="space-y-0.5 text-[10px]">
                          <div className="flex justify-between">
                            <span className="truncate">{p.label}</span>
                            <span className="font-mono font-bold">{p.value.toLocaleString('ru-RU')}</span>
                          </div>
                          <div className="h-2.5 rounded bg-zinc-500/15 overflow-hidden">
                            <div className="h-full rounded" style={{ width: `${(p.value / maxV) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex items-end gap-2 pt-3 px-1">
                      {pts.slice(0, 7).map((p, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-0">
                          <span className="text-[8px] font-mono opacity-70 truncate">{Math.round(p.value)}</span>
                          <div className="w-full flex-1 flex items-end">
                            <div
                              className="w-full rounded-t"
                              style={{ height: `${Math.max(8, (p.value / maxV) * 100)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                          </div>
                          <span className="text-[9px] truncate w-full text-center opacity-75">{p.label.slice(0, 7)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SHEET TABS BAR (Authentic Bottom Excel Sheet Tabs) */}
      <div className={`h-7 px-2 border-t flex items-center gap-1 overflow-x-auto text-xs ${officeDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-[#F3F2F1] border-[#D1D1D1]'}`}>
        {sheets.map((s, idx) => {
          const active = idx === activeSheetIdx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChangeActiveSheetIdx(idx)}
              onDoubleClick={() => {
                const name = window.prompt('Новое имя листа:', s.name);
                if (name && name.trim()) {
                  onChangeSheets(sheets.map((x, i) => (i === idx ? { ...x, name: name.trim() } : x)));
                }
              }}
              className={`px-3 py-1 rounded-t text-[11px] font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                active
                  ? officeDark
                    ? 'bg-[#252526] text-emerald-400 border-[#107C41]'
                    : 'bg-white text-[#107C41] border-[#107C41] shadow-xs'
                  : officeDark
                  ? 'text-zinc-400 border-transparent hover:bg-white/5'
                  : 'text-slate-600 border-transparent hover:bg-white/60'
              }`}
            >
              {s.name}
            </button>
          );
        })}
        <button
          type="button"
          title="Добавить новый лист"
          onClick={() => {
            const next: OfficeSheet = { name: `Лист${sheets.length + 1}`, rows: 35, cols: 12, cells: {}, styles: {} };
            onChangeSheets([...sheets, next]);
            onChangeActiveSheetIdx(sheets.length);
          }}
          className="w-6 h-6 rounded-full hover:bg-[#107C41]/15 text-[#107C41] flex items-center justify-center cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* AUTHENTIC MS EXCEL GREEN STATUS BAR WITH LIVE SELECTION SUM / AVG / COUNT! */}
      <div className="h-6 px-3 bg-[#107C41] text-white text-[11px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span>Готово</span>
          <span className="opacity-80 hidden sm:inline">Лист: {sheet.name}</span>
        </div>
        <div className="flex items-center gap-4 font-mono">
          {selectionStats.numCount > 0 && (
            <>
              <span>Среднее: {selectionStats.avg.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</span>
              <span>Количество: {selectionStats.count}</span>
              <span className="font-bold">Сумма: {selectionStats.sum.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</span>
            </>
          )}
          <div className="flex items-center gap-1.5">
            <input type="range" min={70} max={150} step={10} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-16 accent-white cursor-pointer" />
            <span className="w-8 text-right">{zoom}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
