import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Copy, Download, ExternalLink, FileSpreadsheet, FileText, FolderOpen, Moon, Presentation,
  Printer, Save, Search, Send, Sparkles, Sun, Table2, X,
} from 'lucide-react';
import {
  DocComment, EXCEL_TEMPLATES, OfficeAppMode, OfficeSheet, OfficeSlide,
  PPT_TEMPLATES, WORD_TEMPLATES,
} from './office/officeTypes';
import { LumaWordEditor } from './office/LumaWordEditor';
import { LumaExcelEditor } from './office/LumaExcelEditor';
import { LumaPowerPointEditor } from './office/LumaPowerPointEditor';

export type { OfficeAppMode, OfficeSheet, OfficeSlide };

interface LumaOfficeSuiteWindowProps {
  isDark?: boolean;
  initialMode?: OfficeAppMode;
  onNotify?: (title: string, body: string, level?: 'info' | 'ok' | 'warn' | 'danger') => void;
}

const OFFICE_AUTOSAVE_KEY = 'luma_office_pro_session_v153';

const APP_BRAND: Record<OfficeAppMode, { name: string; color: string; short: string; defaultExt: string }> = {
  docs: { name: 'Luma Word', color: '#185ABD', short: 'Word', defaultExt: 'docx' },
  sheets: { name: 'Luma Excel', color: '#107C41', short: 'Excel', defaultExt: 'xlsx' },
  slides: { name: 'Luma PowerPoint', color: '#B7472A', short: 'PowerPoint', defaultExt: 'pptx' },
};

const TELL_ME_ACTIONS: { label: string; keywords: string; mode: OfficeAppMode; cmd: string }[] = [
  { label: 'Вставить таблицу (Word)', keywords: 'таблица table ячейки', mode: 'docs', cmd: 'table' },
  { label: 'Найти и заменить (Word)', keywords: 'найти заменить поиск find replace', mode: 'docs', cmd: 'find' },
  { label: 'Водяной знак / Подложка (Word)', keywords: 'водяной знак подложка watermark', mode: 'docs', cmd: 'watermark' },
  { label: 'Автоматическое оглавление (Word)', keywords: 'оглавление содержание toc', mode: 'docs', cmd: 'toc' },
  { label: 'Проверка правописания и типографики (Word)', keywords: 'правописание ошибки spell проверка', mode: 'docs', cmd: 'spell' },
  { label: 'Добавить примечание (Word)', keywords: 'примечание комментарий comment', mode: 'docs', cmd: 'comment' },
  { label: 'Вставить формулу fx (Excel · 140+)', keywords: 'формула сумма впр если fx', mode: 'sheets', cmd: 'formula' },
  { label: 'Построить диаграмму (Excel)', keywords: 'диаграмма график chart bar pie', mode: 'sheets', cmd: 'chart' },
  { label: 'Включить автофильтр (Excel)', keywords: 'фильтр автофильтр filter', mode: 'sheets', cmd: 'filter' },
  { label: 'Создать сводную таблицу (Excel)', keywords: 'сводная таблица pivot', mode: 'sheets', cmd: 'pivot' },
  { label: 'Начать показ слайдов F5 (PowerPoint)', keywords: 'показ слайд шоу f5 play', mode: 'slides', cmd: 'play' },
  { label: 'Вставить фигуру (PowerPoint)', keywords: 'фигура стрелка звезда shape', mode: 'slides', cmd: 'shape' },
  { label: 'Анимации объектов (PowerPoint)', keywords: 'анимация вылет animation', mode: 'slides', cmd: 'anim' },
  { label: 'Темы оформления слайдов (PowerPoint)', keywords: 'тема дизайн фон theme', mode: 'slides', cmd: 'theme' },
];

export const LumaOfficeSuiteWindow: React.FC<LumaOfficeSuiteWindowProps> = ({
  initialMode = 'docs',
  onNotify,
}) => {
  const [mode, setMode] = useState<OfficeAppMode>(initialMode);
  const [officeDark, setOfficeDark] = useState(false); // Authentic crisp MS Office light UI by default!
  const [backstageOpen, setBackstageOpen] = useState(false);
  const [backstageTab, setBackstageTab] = useState<'new' | 'save' | 'info'>('new');
  const [docTitle, setDocTitle] = useState('Документ 1');
  const [docHtml, setDocHtml] = useState<string>(WORD_TEMPLATES[3].html);
  const [comments, setComments] = useState<DocComment[]>([]);
  const [sheets, setSheets] = useState<OfficeSheet[]>(EXCEL_TEMPLATES[0].sheets);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [slides, setSlides] = useState<OfficeSlide[]>(PPT_TEMPLATES[0].slides);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  // Luma AI 5.0 Nexus Office Assistant Drawer state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiReply, setAiReply] = useState('');
  const [aiSources, setAiSources] = useState<{ title: string; url: string; provider: string }[]>([]);

  const runOfficeAI38 = async (action: string, customPrompt?: string) => {
    setAiOpen(true);
    setAiBusy(true);
    const appKey = mode === 'docs' ? 'word' : mode === 'sheets' ? 'excel' : 'powerpoint';
    let content = '';
    if (mode === 'docs') {
      content = docHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
    } else if (mode === 'sheets') {
      const sh = sheets[activeSheetIdx] || sheets[0];
      content = JSON.stringify(sh?.cells || {}).slice(0, 3000);
    } else {
      const sl = slides[activeSlideIdx] || slides[0];
      const elemsText = (sl?.elements || []).map((el) => el.text || '').filter(Boolean).join('\n');
      content = `${sl?.title || ''}\n${elemsText}\n${sl?.notes || ''}`.trim();
    }
    try {
      const r = await fetch('/api/kernel/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: appKey,
          action,
          content,
          prompt: (customPrompt ?? aiPrompt).trim(),
          filename: docTitle,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setAiReply(String(d.reply || ''));
        setAiSources(Array.isArray(d.sources) ? d.sources : []);
      }
    } catch {
      setAiReply('Не удалось связаться с Luma AI 5.0 Nexus.');
    } finally {
      setAiBusy(false);
    }
  };

  const applyAIResultToOffice = () => {
    if (!aiReply.trim()) return;
    if (mode === 'docs') {
      const htmlBlock = `<p>${aiReply.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
      setDocHtml((prev) => prev + htmlBlock);
      onNotify?.('Luma AI 5.0 · Word', 'Ответ вставлен в конец документа', 'ok');
    } else if (mode === 'slides') {
      const nowId = Date.now();
      const slideTitle = aiPrompt.trim() || `AI 5.0 · ${docTitle}`;
      const newSlide: OfficeSlide = {
        id: `sl_ai_${nowId}`,
        title: slideTitle,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0c4a6e 100%)',
        transition: 'fade',
        notes: aiReply,
        elements: [
          {
            id: `el_ai_title_${nowId}`,
            type: 'text',
            x: 6,
            y: 8,
            w: 88,
            h: 16,
            text: slideTitle,
            fontSize: 30,
            bold: true,
            color: '#f8fafc',
            align: 'left',
          },
          {
            id: `el_ai_body_${nowId}`,
            type: 'text',
            x: 6,
            y: 28,
            w: 88,
            h: 62,
            text: aiReply.slice(0, 700),
            fontSize: 16,
            color: '#e2e8f0',
            align: 'left',
          },
        ],
      };
      setSlides((prev) => [...prev, newSlide]);
      setActiveSlideIdx(slides.length);
      onNotify?.('Luma AI 5.0 · PowerPoint', 'Добавлен новый слайд с тезисами AI 5.0', 'ok');
    } else {
      navigator.clipboard?.writeText(aiReply).catch(() => {});
      onNotify?.('Luma AI 5.0 · Excel', 'Формулы и рекомендации скопированы в буфер обмена', 'ok');
    }
  };

  // Tell Me quick search in the title bar
  const [tellMeQuery, setTellMeQuery] = useState('');
  const [tellMeFocused, setTellMeFocused] = useState(false);
  const [tellMeCommand, setTellMeCommand] = useState<{ cmd: string; seq: number } | null>(null);
  const tellMeSeqRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Restore saved session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OFFICE_AUTOSAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.mode) setMode(saved.mode);
      if (saved.docTitle) setDocTitle(saved.docTitle);
      if (saved.docHtml) setDocHtml(saved.docHtml);
      if (Array.isArray(saved.comments)) setComments(saved.comments);
      if (Array.isArray(saved.sheets) && saved.sheets.length > 0) setSheets(saved.sheets);
      if (Array.isArray(saved.slides) && saved.slides.length > 0) setSlides(saved.slides);
    } catch {
      /* ignore */
    }
  }, []);

  // Debounced autosave
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(
          OFFICE_AUTOSAVE_KEY,
          JSON.stringify({ mode, docTitle, docHtml, comments, sheets, slides })
        );
      } catch {
        /* ignore quota */
      }
    }, 600);
    return () => window.clearTimeout(id);
  }, [mode, docTitle, docHtml, comments, sheets, slides]);

  const brand = APP_BRAND[mode];

  const tellMeMatches = useMemo(() => {
    const q = tellMeQuery.trim().toLowerCase();
    if (!q) return TELL_ME_ACTIONS.filter((a) => a.mode === mode).slice(0, 6);
    return TELL_ME_ACTIONS.filter(
      (a) => a.label.toLowerCase().includes(q) || a.keywords.includes(q)
    ).slice(0, 7);
  }, [tellMeQuery, mode]);

  const triggerTellMe = (act: (typeof TELL_ME_ACTIONS)[number]) => {
    setMode(act.mode);
    tellMeSeqRef.current += 1;
    setTellMeCommand({ cmd: act.cmd, seq: tellMeSeqRef.current });
    setTellMeQuery('');
    setTellMeFocused(false);
  };

  // Real native backend Import (.docx / .xlsx / .pptx / .odp / .odt / .ods / .csv / .html / .md / .rtf / .txt)
  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setBusy(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/kernel/office/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: file.name, base64_data: base64Data }),
      });
      const data = await res.json();
      if (!data?.ok) {
        onNotify?.('Luma Office', data?.error || 'Не удалось открыть файл', 'danger');
        return;
      }
      setDocTitle(file.name.replace(/\.[^.]+$/, ''));
      if (data.kind === 'docs') {
        setMode('docs');
        setDocHtml(data.doc_html || `<p>${(data.doc_markdown || '').replace(/\n/g, '</p><p>')}</p>`);
      } else if (data.kind === 'sheets' && Array.isArray(data.sheets) && data.sheets.length > 0) {
        setMode('sheets');
        const mapped: OfficeSheet[] = data.sheets.map((s: OfficeSheet, idx: number) => ({
          name: s.name || `Лист${idx + 1}`,
          rows: Math.max(35, Number(s.rows || 0) + 10),
          cols: Math.max(12, Number(s.cols || 0) + 4),
          cells: s.cells && typeof s.cells === 'object' ? s.cells : {},
          styles: s.styles && typeof s.styles === 'object' ? s.styles : {},
        }));
        setSheets(mapped);
        setActiveSheetIdx(0);
      } else if (data.kind === 'slides' && Array.isArray(data.slides) && data.slides.length > 0) {
        setMode('slides');
        const mapped: OfficeSlide[] = data.slides.map((sl: OfficeSlide, idx: number) => ({
          id: sl.id || `imp_sl_${Date.now()}_${idx}`,
          title: sl.title || `Слайд ${idx + 1}`,
          background: sl.background || '#ffffff',
          transition: sl.transition || 'fade',
          notes: sl.notes || '',
          elements: Array.isArray(sl.elements) ? sl.elements : [],
        }));
        setSlides(mapped);
        setActiveSlideIdx(0);
      }
      setBackstageOpen(false);
      onNotify?.('Luma Office', `Открыт файл: ${file.name}`, 'ok');
    } catch (err) {
      onNotify?.('Luma Office', `Ошибка открытия: ${err instanceof Error ? err.message : 'сбой'}`, 'danger');
    } finally {
      setBusy(false);
    }
  };

  // Real native backend Export (.docx / .xlsx / .pptx / .csv / .html / .md / .rtf / .txt / .pdf)
  const handleExport = async (format: string) => {
    if (format === 'pdf') {
      window.print();
      return;
    }
    setBusy(true);
    try {
      const tmpDiv = document.createElement('div');
      tmpDiv.innerHTML = docHtml;
      const plainText = tmpDiv.textContent || '';

      const exportSheets = sheets.map((s) => ({
        name: s.name,
        cells: s.cells,
        styles: s.styles || {},
        rows: s.rows,
        cols: s.cols,
      }));

      const exportSlides = slides.map((sl) => ({
        id: sl.id,
        title: sl.title,
        background: sl.background,
        transition: sl.transition,
        notes: sl.notes,
        elements: sl.elements.map((el) => ({
          id: el.id,
          type: el.type === 'wordart' ? 'text' : el.type === 'smartart' || el.type === 'chart' ? 'shape' : el.type,
          x: el.x,
          y: el.y,
          w: el.w,
          h: el.h,
          text: el.text || (el.smartArtItems ? el.smartArtItems.join(' → ') : el.chartTitle || ''),
          fontSize: el.fontSize,
          bold: el.bold,
          italic: el.italic,
          align: el.align,
          color: el.color,
          bgColor: el.bgColor,
          imageSrc: el.imageSrc,
          shape: el.shape,
          rows: el.rows,
        })),
      }));

      const fileName = `${docTitle.trim() || 'Document'}.${format}`;
      const res = await fetch('/api/kernel/office/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: mode,
          format,
          file_name: fileName,
          title: docTitle,
          doc_html: docHtml,
          doc_text: plainText,
          sheets: exportSheets,
          slides: exportSlides,
        }),
      });
      const data = await res.json();
      if (!data?.ok || !data?.base64_data) {
        onNotify?.('Luma Office', data?.error || 'Ошибка экспорта файла', 'danger');
        return;
      }
      const bin = atob(data.base64_data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.mime_type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.file_name || fileName;
      a.click();
      URL.revokeObjectURL(url);
      setBackstageOpen(false);
      onNotify?.('Luma Office', `Файл сохранён: ${data.file_name || fileName}`, 'ok');
    } catch (err) {
      onNotify?.('Luma Office', `Ошибка сохранения: ${err instanceof Error ? err.message : 'сбой'}`, 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.xlsx,.pptx,.odp,.odt,.ods,.csv,.tsv,.html,.md,.rtf,.txt,.json"
        className="hidden"
        onChange={handleOpenFile}
      />

      {/* AUTHENTIC MICROSOFT 365 COLORED TOP TITLE BAR (Royal Blue Word / Forest Green Excel / Orange-Red PowerPoint!) */}
      <div
        style={{ backgroundColor: brand.color }}
        className="h-10 px-2.5 text-white flex items-center justify-between gap-2 shrink-0 select-none shadow-sm"
      >
        {/* Left: Backstage «Файл» + Quick Access Toolbar + Editable Filename */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => setBackstageOpen((v) => !v)}
            className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
              backstageOpen ? 'bg-white text-slate-900 shadow' : 'bg-black/20 hover:bg-black/30 text-white'
            }`}
          >
            Файл
          </button>

          <div className="h-4 w-px bg-white/25 mx-0.5" />

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleExport(brand.defaultExt)}
            title={`Быстро сохранить (.${brand.defaultExt})`}
            className="p-1.5 rounded hover:bg-white/15 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            title="Открыть файл (.docx / .xlsx / .pptx / .csv ...)"
            className="p-1.5 rounded hover:bg-white/15 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title="Печать / PDF"
            className="p-1.5 rounded hover:bg-white/15 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="ml-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/20 focus:bg-white focus:text-slate-900 text-xs font-semibold outline-none w-36 sm:w-44 truncate transition"
          />
        </div>

        {/* Center: Microsoft 365 «Tell Me» Instant Command Search */}
        <div className="relative hidden md:block w-60 lg:w-72">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/18 focus-within:bg-white focus-within:text-slate-900 text-white transition">
            <Search className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <input
              value={tellMeQuery}
              onFocus={() => setTellMeFocused(true)}
              onBlur={() => window.setTimeout(() => setTellMeFocused(false), 180)}
              onChange={(e) => setTellMeQuery(e.target.value)}
              placeholder="Поиск инструментов (Таблица, Формула...)"
              className="bg-transparent outline-none text-[11px] w-full placeholder:text-white/75 focus:placeholder:text-slate-400"
            />
          </div>
          {tellMeFocused && (
            <div className="absolute left-0 right-0 top-full mt-1 rounded-lg bg-white text-slate-900 border border-slate-200 shadow-2xl py-1 z-50 text-xs">
              {tellMeMatches.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onMouseDown={() => triggerTellMe(m)}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Authentic Word / Excel / PowerPoint App Switcher + Theme Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center bg-black/20 rounded-lg p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => { setMode('docs'); setBackstageOpen(false); }}
              className={`px-2.5 py-1 rounded-md inline-flex items-center gap-1 transition cursor-pointer ${
                mode === 'docs' ? 'bg-white text-[#185ABD] shadow-xs' : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Word
            </button>
            <button
              type="button"
              onClick={() => { setMode('sheets'); setBackstageOpen(false); }}
              className={`px-2.5 py-1 rounded-md inline-flex items-center gap-1 transition cursor-pointer ${
                mode === 'sheets' ? 'bg-white text-[#107C41] shadow-xs' : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              type="button"
              onClick={() => { setMode('slides'); setBackstageOpen(false); }}
              className={`px-2.5 py-1 rounded-md inline-flex items-center gap-1 transition cursor-pointer ${
                mode === 'slides' ? 'bg-white text-[#B7472A] shadow-xs' : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" /> PowerPoint
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAiOpen((v) => !v)}
            title="Помощник Luma AI 5.0 Nexus (тексты, формулы Excel, слайды PowerPoint)"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
              aiOpen
                ? 'bg-white text-sky-700 shadow'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI 5.0
          </button>

          <button
            type="button"
            onClick={() => setOfficeDark((v) => !v)}
            title={officeDark ? 'Светлая классическая тема Office' : 'Тёмная тема Office'}
            className="p-1.5 rounded hover:bg-white/15 cursor-pointer"
          >
            {officeDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Luma AI 5.0 Nexus Side Assistant Drawer for Word / Excel / PowerPoint */}
      {aiOpen && (
        <div
          className={`fixed sm:absolute right-3 top-12 bottom-3 w-80 sm:w-96 z-[60] rounded-2xl border shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl ${
            officeDark ? 'bg-slate-950/96 border-sky-400/30 text-slate-100' : 'bg-white/97 border-slate-300 text-slate-900'
          }`}
        >
          <div className="px-3.5 py-2.5 border-b border-black/10 flex items-center justify-between bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
            <div className="flex items-center gap-1.5 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              Luma AI 5.0 · {brand.short}
            </div>
            <button type="button" onClick={() => setAiOpen(false)} className="p-1 rounded hover:bg-white/15 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className={`p-2.5 border-b flex flex-wrap gap-1.5 ${officeDark ? 'border-white/10' : 'border-slate-200'}`}>
            {(mode === 'docs'
              ? [
                  { id: 'improve', label: 'Улучшить текст' },
                  { id: 'summarize', label: 'Краткая выжимка' },
                  { id: 'generate', label: 'Дополнить фактами' },
                ]
              : mode === 'sheets'
              ? [
                  { id: 'formula', label: 'Подобрать формулу fx' },
                  { id: 'analyze', label: 'Анализ таблицы' },
                  { id: 'explain', label: 'Объяснить расчёт' },
                ]
              : [
                  { id: 'slide', label: 'Тезисы слайда' },
                  { id: 'improve', label: 'Усилить выступление' },
                  { id: 'summarize', label: 'Заметки докладчика' },
                ]
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                disabled={aiBusy}
                onClick={() => void runOfficeAI38(btn.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                  officeDark
                    ? 'bg-sky-500/15 border-sky-400/30 text-sky-300 hover:bg-sky-500/25'
                    : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 text-xs space-y-2.5">
            {aiBusy ? (
              <div className="text-sky-500 animate-pulse">Luma AI 5.0 анализирует {brand.short} и проверяет источники…</div>
            ) : aiReply ? (
              <>
                <div className="whitespace-pre-wrap leading-relaxed">{aiReply}</div>
                {aiSources.length > 0 && (
                  <div className="pt-2 border-t border-slate-500/20 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-sky-500 font-bold">Проверенные источники</div>
                    <div className="flex flex-wrap gap-1">
                      {aiSources.map((s, idx) => (
                        <a
                          key={`${s.url}_${idx}`}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 text-[10px] text-sky-500 hover:underline inline-flex items-center gap-1 max-w-full truncate"
                        >
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{s.provider}: {s.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={applyAIResultToOffice}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold cursor-pointer"
                  >
                    {mode === 'docs' ? 'Вставить в Word' : mode === 'slides' ? 'Добавить как слайд' : 'Копировать для Excel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(aiReply).catch(() => {});
                      onNotify?.('Luma AI 5.0', 'Ответ скопирован', 'ok');
                    }}
                    className={`p-1.5 rounded-lg border cursor-pointer ${officeDark ? 'border-white/15 hover:bg-white/10' : 'border-slate-300 hover:bg-slate-100'}`}
                    title="Копировать ответ"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="opacity-65">
                Выберите действие выше или введите задачу для <b>{brand.name}</b> — Luma AI 5.0 Nexus поможет с текстом, формулами или слайдами с проверенными источниками.
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (aiPrompt.trim()) void runOfficeAI38('ask', aiPrompt);
            }}
            className={`p-2 border-t flex gap-1.5 ${officeDark ? 'border-white/10' : 'border-slate-200'}`}
          >
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={`Спросить AI 5.0 для ${brand.short}…`}
              className={`flex-1 px-2.5 py-1.5 rounded-xl border text-xs outline-none ${officeDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-300'}`}
            />
            <button
              type="submit"
              disabled={aiBusy || !aiPrompt.trim()}
              className="px-2.5 py-1.5 rounded-xl bg-sky-600 text-white cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* AUTHENTIC MS OFFICE «ФАЙЛ» BACKSTAGE VIEW */}
      {backstageOpen ? (
        <div className={`flex-1 min-h-0 flex overflow-hidden ${officeDark ? 'bg-[#1E1E1E] text-zinc-100' : 'bg-[#F3F2F1] text-slate-900'}`}>
          {/* Colored Left Sidebar */}
          <div style={{ backgroundColor: brand.color }} className="w-48 shrink-0 text-white p-3 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setBackstageOpen(false)}
              className="mb-3 px-2.5 py-1.5 rounded hover:bg-white/15 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Вернуться в {brand.short}
            </button>
            <button
              type="button"
              onClick={() => setBackstageTab('new')}
              className={`px-3 py-2 rounded text-left text-xs font-bold cursor-pointer ${backstageTab === 'new' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              Создать / Шаблоны
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded text-left text-xs font-bold hover:bg-white/10 cursor-pointer"
            >
              Открыть с ПК…
            </button>
            <button
              type="button"
              onClick={() => setBackstageTab('save')}
              className={`px-3 py-2 rounded text-left text-xs font-bold cursor-pointer ${backstageTab === 'save' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              Сохранить как / Экспорт
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded text-left text-xs font-bold hover:bg-white/10 cursor-pointer"
            >
              Печать (PDF)
            </button>
            <button
              type="button"
              onClick={() => setBackstageTab('info')}
              className={`px-3 py-2 rounded text-left text-xs font-bold cursor-pointer ${backstageTab === 'info' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              Сведения о пакете
            </button>
          </div>

          {/* Right Backstage Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {backstageTab === 'new' && (
              <>
                <div>
                  <h2 className="text-xl font-bold mb-1">Создать документ · {brand.name}</h2>
                  <p className="text-xs opacity-65">Выберите готовый шаблон Microsoft Word, Excel или PowerPoint — всё откроется мгновенно.</p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#185ABD] uppercase tracking-wider">Шаблоны Word (.docx)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {WORD_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setMode('docs');
                          setDocTitle(tpl.name);
                          setDocHtml(tpl.html);
                          setBackstageOpen(false);
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                          officeDark ? 'bg-[#252526] border-white/10 hover:border-[#185ABD]' : 'bg-white border-zinc-200 hover:border-[#185ABD] shadow-xs'
                        }`}
                      >
                        <FileText className="w-6 h-6 text-[#185ABD]" />
                        <div className="text-xs font-bold">{tpl.name}</div>
                        <div className="text-[10px] opacity-65">{tpl.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#107C41] uppercase tracking-wider">Шаблоны Excel (.xlsx)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {EXCEL_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setMode('sheets');
                          setDocTitle(tpl.name);
                          setSheets(JSON.parse(JSON.stringify(tpl.sheets)));
                          setActiveSheetIdx(0);
                          setBackstageOpen(false);
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                          officeDark ? 'bg-[#252526] border-white/10 hover:border-[#107C41]' : 'bg-white border-zinc-200 hover:border-[#107C41] shadow-xs'
                        }`}
                      >
                        <FileSpreadsheet className="w-6 h-6 text-[#107C41]" />
                        <div className="text-xs font-bold">{tpl.name}</div>
                        <div className="text-[10px] opacity-65">{tpl.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#B7472A] uppercase tracking-wider">Шаблоны PowerPoint (.pptx)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PPT_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setMode('slides');
                          setDocTitle(tpl.name);
                          setSlides(JSON.parse(JSON.stringify(tpl.slides)));
                          setActiveSlideIdx(0);
                          setBackstageOpen(false);
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                          officeDark ? 'bg-[#252526] border-white/10 hover:border-[#B7472A]' : 'bg-white border-zinc-200 hover:border-[#B7472A] shadow-xs'
                        }`}
                      >
                        <Presentation className="w-6 h-6 text-[#B7472A]" />
                        <div className="text-xs font-bold">{tpl.name}</div>
                        <div className="text-[10px] opacity-65">{tpl.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {backstageTab === 'save' && (
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-xl font-bold">Сохранить как · {docTitle}</h2>
                <p className="text-xs opacity-70">Нативный Go-конвертер LumaCore 1.4.7 создаёт настоящие файлы Microsoft Office без облака и сторонних программ.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(mode === 'docs'
                    ? [
                        { ext: 'docx', label: 'Документ Word (.docx)', desc: 'Полная совместимость с MS Word' },
                        { ext: 'pdf', label: 'PDF / Печать (.pdf)', desc: 'Для отправки и печати' },
                        { ext: 'html', label: 'Веб-страница (.html)', desc: 'С сохранением стилей' },
                        { ext: 'md', label: 'Markdown (.md)', desc: 'Для GitHub и заметок' },
                        { ext: 'rtf', label: 'Формат RTF (.rtf)', desc: 'Универсальный формат' },
                        { ext: 'txt', label: 'Обычный текст (.txt)', desc: 'Только текст' },
                      ]
                    : mode === 'sheets'
                    ? [
                        { ext: 'xlsx', label: 'Книга Excel (.xlsx)', desc: 'Полная совместимость с MS Excel' },
                        { ext: 'csv', label: 'Таблица CSV (.csv)', desc: 'Разделитель запятая' },
                        { ext: 'tsv', label: 'Таблица TSV (.tsv)', desc: 'Разделитель табуляция' },
                        { ext: 'html', label: 'HTML-таблица (.html)', desc: 'Для браузера' },
                        { ext: 'pdf', label: 'PDF / Печать (.pdf)', desc: 'Печать листа' },
                      ]
                    : [
                        { ext: 'pptx', label: 'Презентация PowerPoint (.pptx)', desc: 'Нативный файл MS PowerPoint' },
                        { ext: 'html', label: 'Интерактивный HTML (.html)', desc: 'Открывается в любом браузере' },
                        { ext: 'pdf', label: 'PDF / Печать (.pdf)', desc: 'Раздаточные материалы' },
                        { ext: 'json', label: 'Проект Luma Slides (.json)', desc: 'Резервная копия со всеми слоями' },
                      ]
                  ).map((item) => (
                    <button
                      key={item.ext}
                      type="button"
                      disabled={busy}
                      onClick={() => void handleExport(item.ext)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition space-y-1 ${
                        officeDark ? 'bg-[#252526] border-white/10 hover:bg-white/10' : 'bg-white border-zinc-200 hover:border-slate-400 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Download className="w-4 h-4" style={{ color: brand.color }} />
                        {item.label}
                      </div>
                      <div className="text-[10px] opacity-65">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {backstageTab === 'info' && (
              <div className="space-y-3 max-w-xl text-xs leading-relaxed">
                <h2 className="text-xl font-bold">Luma Office Studio 1.6.2b (Nitrogen · AI 5.0)</h2>
                <p>Классический понятный интерфейс Microsoft Word, Excel и PowerPoint с группировкой инструментов на ленте Ribbon, строкой быстрого поиска команд и автосохранением.</p>
                <ul className="list-disc pl-5 space-y-1 opacity-85">
                  <li><strong>Word:</strong> 7 вкладок ленты, сетка таблиц 10×8, Формат по образцу, безопасный поиск/замена по текстовым узлам, кликабельная навигация по заголовкам, уравнения и символы, линейка, проверка типографики, озвучка текста и примечания.</li>
                  <li><strong>Excel:</strong> 140+ формул на русском и английском (`СУММ`, `ВПР`, `ГПР`, `ПРОСМОТРX`, `ЕСЛИМН`, `СЧЁТЕСЛИМН`, `ПЛТ`, `ЧПС`, `МЕДИАНА`, `КОРРЕЛ`, `ПРЕОБР`), поиск формул `fx`, навигация стрелками и быстрый ввод с клавиатуры, `Ctrl+Z`, маркер автозаполнения, сводные таблицы и 6 типов графиков.</li>
                  <li><strong>PowerPoint:</strong> 8 вкладок ленты, 15+ фигур, редактируемый SmartArt и диаграммы, рисование пером/маркером, 12 тем, 10 живых переходов слайдов, 12 настоящих CSS-анимаций объектов с порядком показа, `Ctrl+Z`, `Delete` и режим докладчика `F5`.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : mode === 'docs' ? (
        <LumaWordEditor
          officeDark={officeDark}
          docHtml={docHtml}
          onChangeDocHtml={setDocHtml}
          docTitle={docTitle}
          comments={comments}
          onChangeComments={setComments}
          onNotify={onNotify}
          tellMeCommand={tellMeCommand}
        />
      ) : mode === 'sheets' ? (
        <LumaExcelEditor
          officeDark={officeDark}
          sheets={sheets}
          activeSheetIdx={activeSheetIdx}
          onChangeActiveSheetIdx={setActiveSheetIdx}
          onChangeSheets={setSheets}
          onNotify={onNotify}
          tellMeCommand={tellMeCommand}
        />
      ) : (
        <LumaPowerPointEditor
          officeDark={officeDark}
          slides={slides}
          activeSlideIdx={activeSlideIdx}
          onChangeActiveSlideIdx={setActiveSlideIdx}
          onChangeSlides={setSlides}
          onNotify={onNotify}
          tellMeCommand={tellMeCommand}
        />
      )}
    </div>
  );
};
