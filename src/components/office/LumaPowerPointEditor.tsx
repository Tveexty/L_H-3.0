import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowRight, ArrowUp, BarChart3,
  Bold, ChevronLeft, ChevronRight, Circle, Copy, Eraser, Grid, Highlighter,
  Image as ImageIcon, Italic, Layers, Layout, Maximize2, MessageSquare, PenTool,
  Play, Plus, RotateCw, Sparkles, Square, Star, Table2, Trash2, Triangle, Type,
  Underline, X,
} from 'lucide-react';
import {
  OfficeSlide, OfficeSlideElement, RibbonBigBtn, RibbonGroup, RibbonSmallBtn,
  SLIDE_THEMES, SlideAnimKind, SlideShapeKind, SlideTransitionKind,
} from './officeTypes';

export type PptRibbonTab = 'home' | 'insert' | 'draw' | 'design' | 'transitions' | 'animations' | 'slideshow' | 'view';

export interface LumaPowerPointEditorProps {
  officeDark: boolean;
  slides: OfficeSlide[];
  activeSlideIdx: number;
  onChangeActiveSlideIdx: (idx: number) => void;
  onChangeSlides: (slides: OfficeSlide[]) => void;
  onNotify?: (title: string, body: string, level?: 'info' | 'ok' | 'warn' | 'danger') => void;
  tellMeCommand?: { cmd: string; seq: number } | null;
}

const PPT_ORANGE = '#B7472A';

const SLIDE_LAYOUTS: { id: string; name: string; build: () => OfficeSlideElement[] }[] = [
  {
    id: 'title',
    name: 'Титульный слайд',
    build: () => [
      { id: `e_${Date.now()}_1`, type: 'text', x: 8, y: 26, w: 84, h: 20, text: 'Заголовок презентации', fontSize: 40, bold: true, align: 'center', color: '#1e293b' },
      { id: `e_${Date.now()}_2`, type: 'text', x: 14, y: 50, w: 72, h: 14, text: 'Подзаголовок и имя докладчика', fontSize: 18, align: 'center', color: '#64748b' },
    ],
  },
  {
    id: 'title_content',
    name: 'Заголовок и объект',
    build: () => [
      { id: `e_${Date.now()}_1`, type: 'text', x: 6, y: 7, w: 88, h: 12, text: 'Заголовок слайда', fontSize: 30, bold: true, color: '#1e293b' },
      { id: `e_${Date.now()}_2`, type: 'text', x: 6, y: 24, w: 88, h: 64, text: '• Первый ключевой пункт\n• Второй важный тезис\n• Третий вывод презентации', fontSize: 20, color: '#334155' },
    ],
  },
  {
    id: 'two_content',
    name: 'Два объекта',
    build: () => [
      { id: `e_${Date.now()}_1`, type: 'text', x: 6, y: 7, w: 88, h: 12, text: 'Сравнение двух подходов', fontSize: 28, bold: true, color: '#1e293b' },
      { id: `e_${Date.now()}_2`, type: 'shape', shape: 'rounded', x: 6, y: 24, w: 42, h: 64, text: 'Левая колонка\n• Преимущество 1\n• Преимущество 2', fontSize: 16, bgColor: '#EFF6FF', color: '#1e293b' },
      { id: `e_${Date.now()}_3`, type: 'shape', shape: 'rounded', x: 52, y: 24, w: 42, h: 64, text: 'Правая колонка\n• Преимущество 1\n• Преимущество 2', fontSize: 16, bgColor: '#FFF7ED', color: '#1e293b' },
    ],
  },
  {
    id: 'section',
    name: 'Заголовок раздела',
    build: () => [
      { id: `e_${Date.now()}_1`, type: 'shape', shape: 'rect', x: 6, y: 38, w: 8, h: 2, bgColor: '#B7472A', text: '' },
      { id: `e_${Date.now()}_2`, type: 'text', x: 6, y: 42, w: 88, h: 18, text: 'Раздел 2 · Ключевые результаты', fontSize: 36, bold: true, color: '#1e293b' },
    ],
  },
  {
    id: 'blank',
    name: 'Пустой слайд',
    build: () => [],
  },
];

const SHAPES: { kind: SlideShapeKind; label: string }[] = [
  { kind: 'rect', label: 'Прямоугольник' },
  { kind: 'rounded', label: 'Скруглённый' },
  { kind: 'circle', label: 'Овал / Круг' },
  { kind: 'triangle', label: 'Треугольник' },
  { kind: 'diamond', label: 'Ромб' },
  { kind: 'arrow_right', label: 'Стрелка →' },
  { kind: 'arrow_left', label: 'Стрелка ←' },
  { kind: 'arrow_up', label: 'Стрелка ↑' },
  { kind: 'arrow_down', label: 'Стрелка ↓' },
  { kind: 'star', label: 'Звезда' },
  { kind: 'hexagon', label: 'Шестиугольник' },
  { kind: 'callout', label: 'Выноска' },
  { kind: 'banner', label: 'Лента' },
  { kind: 'badge', label: 'Бейдж' },
  { kind: 'line', label: 'Линия' },
];

const TRANSITIONS: { id: SlideTransitionKind; label: string }[] = [
  { id: 'none', label: 'Нет' },
  { id: 'morph', label: 'Трансформация' },
  { id: 'fade', label: 'Выцветание' },
  { id: 'push', label: 'Сдвиг' },
  { id: 'wipe', label: 'Панорама' },
  { id: 'slide', label: 'Наплыв' },
  { id: 'zoom', label: 'Масштаб' },
  { id: 'flip', label: 'Переворот' },
  { id: 'blinds', label: 'Шторки' },
  { id: 'flash', label: 'Вспышка' },
];

const ANIMATIONS: { id: SlideAnimKind; label: string }[] = [
  { id: 'none', label: 'Нет' },
  { id: 'appear', label: 'Возникновение' },
  { id: 'fade_in', label: 'Выцветание' },
  { id: 'fly_left', label: 'Вылет слева' },
  { id: 'fly_right', label: 'Вылет справа' },
  { id: 'fly_up', label: 'Вылет снизу' },
  { id: 'zoom_in', label: 'Масштаб' },
  { id: 'bounce', label: 'Отскок' },
  { id: 'pulse', label: 'Пульсация' },
  { id: 'spin', label: 'Вращение' },
];

function renderShapeClipPath(shape?: SlideShapeKind): React.CSSProperties {
  switch (shape) {
    case 'circle': return { borderRadius: '9999px' };
    case 'rounded': return { borderRadius: '14px' };
    case 'badge': return { borderRadius: '9999px' };
    case 'triangle': return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
    case 'diamond': return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' };
    case 'arrow_right': return { clipPath: 'polygon(0% 25%, 65% 25%, 65% 0%, 100% 50%, 65% 100%, 65% 75%, 0% 75%)' };
    case 'arrow_left': return { clipPath: 'polygon(35% 0%, 35% 25%, 100% 25%, 100% 75%, 35% 75%, 35% 100%, 0% 50%)' };
    case 'arrow_up': return { clipPath: 'polygon(50% 0%, 100% 35%, 75% 35%, 75% 100%, 25% 100%, 25% 35%, 0% 35%)' };
    case 'arrow_down': return { clipPath: 'polygon(25% 0%, 75% 0%, 75% 65%, 100% 65%, 50% 100%, 0% 65%, 25% 65%)' };
    case 'star': return { clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' };
    case 'hexagon': return { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' };
    case 'callout': return { borderRadius: '14px 14px 14px 2px' };
    case 'banner': return { clipPath: 'polygon(0% 0%, 100% 0%, 92% 50%, 100% 100%, 0% 100%, 8% 50%)' };
    default: return { borderRadius: '4px' };
  }
}

export const LumaPowerPointEditor: React.FC<LumaPowerPointEditorProps> = ({
  officeDark,
  slides,
  activeSlideIdx,
  onChangeActiveSlideIdx,
  onChangeSlides,
  onNotify,
  tellMeCommand,
}) => {
  const slide = slides[activeSlideIdx] || slides[0];
  const [tab, setTab] = useState<PptRibbonTab>('home');
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [editingElId, setEditingElId] = useState<string | null>(null);
  const [aspect, setAspect] = useState<'16:9' | '4:3'>('16:9');
  const [viewMode, setViewMode] = useState<'normal' | 'sorter'>('normal');
  const [showNotes, setShowNotes] = useState(true);
  const [showGuides, setShowGuides] = useState(false);
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const [shapesPickerOpen, setShapesPickerOpen] = useState(false);
  const [animPreviewTick, setAnimPreviewTick] = useState(0);

  // Freehand drawing tool state
  const [drawTool, setDrawTool] = useState<'select' | 'pen' | 'highlighter' | 'eraser'>('select');
  const [drawColor, setDrawColor] = useState('#E11D48');
  const [drawWidth, setDrawWidth] = useState(3);
  const drawingActiveRef = useRef<string | null>(null);

  // Slideshow & Presenter Mode (F5)
  const [presenting, setPresenting] = useState(false);
  const [presenterView, setPresenterView] = useState(false);
  const [presentIdx, setPresentIdx] = useState(0);
  const [presentTool, setPresentTool] = useState<'none' | 'laser' | 'pen' | 'highlighter'>('laser');
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [screenMask, setScreenMask] = useState<'none' | 'black' | 'white'>('none');
  const [presentSec, setPresentSec] = useState(0);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imgInputRef = useRef<HTMLInputElement | null>(null);

  const selectedEl = slide?.elements.find((e) => e.id === selectedElId) || null;

  useEffect(() => {
    if (!presenting) {
      setPresentSec(0);
      setScreenMask('none');
      return;
    }
    const timer = window.setInterval(() => setPresentSec((s) => s + 1), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresenting(false);
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setPresentIdx((i) => Math.min(slides.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setPresentIdx((i) => Math.max(0, i - 1));
      } else if (e.key.toLowerCase() === 'b') setScreenMask((m) => (m === 'black' ? 'none' : 'black'));
      else if (e.key.toLowerCase() === 'w') setScreenMask((m) => (m === 'white' ? 'none' : 'white'));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [presenting, slides.length]);

  useEffect(() => {
    if (!tellMeCommand) return;
    const c = tellMeCommand.cmd;
    if (c === 'play') startSlideshow(0, false);
    if (c === 'shape') { setTab('insert'); setShapesPickerOpen(true); }
    if (c === 'anim') setTab('animations');
    if (c === 'theme') setTab('design');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tellMeCommand]);

  const updateSlide = (updater: (s: OfficeSlide) => OfficeSlide) => {
    onChangeSlides(slides.map((s, i) => (i === activeSlideIdx ? updater(s) : s)));
  };

  const updateSelectedEl = (patch: Partial<OfficeSlideElement>) => {
    if (!selectedElId) return;
    updateSlide((s) => ({
      ...s,
      elements: s.elements.map((el) => (el.id === selectedElId ? { ...el, ...patch } : el)),
    }));
  };

  const addElement = (el: OfficeSlideElement) => {
    updateSlide((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedElId(el.id);
    setDrawTool('select');
  };

  const addSlideWithLayout = (layoutId: string) => {
    const layout = SLIDE_LAYOUTS.find((l) => l.id === layoutId) || SLIDE_LAYOUTS[1];
    const next: OfficeSlide = {
      id: `sl_${Date.now()}`,
      title: `Слайд ${slides.length + 1}`,
      background: slide?.background || '#ffffff',
      transition: slide?.transition || 'fade',
      transitionDuration: 0.5,
      notes: '',
      elements: layout.build(),
    };
    const nextSlides = [...slides];
    nextSlides.splice(activeSlideIdx + 1, 0, next);
    onChangeSlides(nextSlides);
    onChangeActiveSlideIdx(activeSlideIdx + 1);
    setLayoutPickerOpen(false);
    setSelectedElId(null);
  };

  const duplicateSlide = (idx: number) => {
    const src = slides[idx];
    if (!src) return;
    const copy: OfficeSlide = {
      ...src,
      id: `sl_${Date.now()}`,
      title: `${src.title} (копия)`,
      elements: src.elements.map((e, i) => ({ ...e, id: `el_${Date.now()}_${i}` })),
    };
    const next = [...slides];
    next.splice(idx + 1, 0, copy);
    onChangeSlides(next);
    onChangeActiveSlideIdx(idx + 1);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== idx);
    onChangeSlides(next);
    onChangeActiveSlideIdx(Math.max(0, Math.min(idx, next.length - 1)));
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChangeSlides(next);
    onChangeActiveSlideIdx(target);
  };

  const startSlideshow = (startAt: number, withPresenter: boolean) => {
    setPresentIdx(startAt);
    setPresenterView(withPresenter);
    setPresenting(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === 'string') {
        addElement({
          id: `img_${Date.now()}`,
          type: 'image',
          x: 20, y: 18, w: 60, h: 62,
          imageSrc: r.result,
          borderRadius: 10,
        });
        onNotify?.('PowerPoint · Рисунок', `Добавлено фото: ${f.name}`, 'ok');
      }
    };
    r.readAsDataURL(f);
    e.target.value = '';
  };

  // Drag / Resize handlers on percentage coordinates
  const startDragEl = (e: React.MouseEvent, el: OfficeSlideElement) => {
    if (drawTool !== 'select' || editingElId === el.id) return;
    e.stopPropagation();
    setSelectedElId(el.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = el.x;
    const origY = el.y;
    const onMove = (ev: MouseEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      let nx = Math.max(-10, Math.min(95, origX + dxPct));
      let ny = Math.max(-10, Math.min(95, origY + dyPct));
      // Smart center snap!
      if (Math.abs(nx + el.w / 2 - 50) < 1.8) nx = 50 - el.w / 2;
      if (Math.abs(ny + el.h / 2 - 50) < 1.8) ny = 50 - el.h / 2;
      updateSlide((s) => ({
        ...s,
        elements: s.elements.map((item) => (item.id === el.id ? { ...item, x: nx, y: ny } : item)),
      }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startResizeEl = (e: React.MouseEvent, el: OfficeSlideElement, handle: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 's') => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const { x: ox, y: oy, w: ow, h: oh } = el;
    const onMove = (ev: MouseEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      let x = ox, y = oy, w = ow, h = oh;
      if (handle.includes('e')) w = Math.max(6, ow + dx);
      if (handle.includes('s')) h = Math.max(5, oh + dy);
      if (handle.includes('w')) { x = ox + dx; w = Math.max(6, ow - dx); }
      if (handle.includes('n')) { y = oy + dy; h = Math.max(5, oh - dy); }
      updateSlide((s) => ({
        ...s,
        elements: s.elements.map((item) => (item.id === el.id ? { ...item, x, y, w, h } : item)),
      }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Freehand slide drawing
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (drawTool === 'select') {
      setSelectedElId(null);
      setEditingElId(null);
      return;
    }
    if (drawTool === 'eraser') {
      updateSlide((s) => ({ ...s, drawings: (s.drawings || []).slice(0, -1) }));
      return;
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * 1000;
    const py = ((e.clientY - rect.top) / rect.height) * 562;
    const id = `stk_${Date.now()}`;
    drawingActiveRef.current = id;
    updateSlide((s) => ({
      ...s,
      drawings: [
        ...(s.drawings || []),
        {
          id,
          color: drawTool === 'highlighter' ? '#FACC15' : drawColor,
          width: drawTool === 'highlighter' ? 16 : drawWidth * 2,
          opacity: drawTool === 'highlighter' ? 0.42 : 1,
          points: [{ x: px, y: py }],
        },
      ],
    }));
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!drawingActiveRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * 1000;
    const py = ((e.clientY - rect.top) / rect.height) * 562;
    const sid = drawingActiveRef.current;
    updateSlide((s) => ({
      ...s,
      drawings: (s.drawings || []).map((st) => (st.id === sid ? { ...st, points: [...st.points, { x: px, y: py }] } : st)),
    }));
  };

  // Element renderer (reused in Main Canvas, Thumbnails, and Fullscreen Slideshow!)
  const renderElementBody = (el: OfficeSlideElement, interactive: boolean) => {
    if (el.type === 'image') {
      return (
        <img
          src={el.imageSrc}
          alt=""
          draggable={false}
          style={{ borderRadius: el.borderRadius ?? 8 }}
          className="w-full h-full object-cover pointer-events-none"
        />
      );
    }

    if (el.type === 'table') {
      const rows = el.rows || [['Заголовок 1', 'Заголовок 2'], ['Данные 1', 'Данные 2']];
      return (
        <table className="w-full h-full border-collapse text-xs" style={{ color: el.color || '#0f172a' }}>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    contentEditable={interactive}
                    suppressContentEditableWarning
                    onBlur={(ev) => {
                      if (!interactive) return;
                      const nextRows = rows.map((r, rIdx) => r.map((v, cIdx) => (rIdx === ri && cIdx === ci ? ev.currentTarget.textContent || '' : v)));
                      updateSlide((s) => ({ ...s, elements: s.elements.map((x) => (x.id === el.id ? { ...x, rows: nextRows } : x)) }));
                    }}
                    style={{
                      backgroundColor: ri === 0 ? PPT_ORANGE : ri % 2 === 0 ? '#FFF7ED' : '#ffffff',
                      color: ri === 0 ? '#ffffff' : '#0f172a',
                    }}
                    className="border border-slate-300 px-2 py-1 font-medium outline-none"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (el.type === 'smartart') {
      const items = el.smartArtItems || ['Шаг 1', 'Шаг 2', 'Шаг 3', 'Шаг 4'];
      const layout = el.smartArtLayout || 'process';
      return (
        <div
          className={`w-full h-full flex items-center justify-center gap-2 p-2 ${
            layout === 'hierarchy' || layout === 'pyramid' ? 'flex-col' : layout === 'matrix' ? 'grid grid-cols-2' : 'flex-row'
          }`}
        >
          {items.map((txt, idx) => (
            <React.Fragment key={idx}>
              <div
                style={{
                  backgroundColor: el.bgColor || PPT_ORANGE,
                  color: el.color || '#ffffff',
                  width: layout === 'pyramid' ? `${45 + idx * 18}%` : undefined,
                }}
                className="flex-1 min-w-0 h-full max-h-24 rounded-xl px-2.5 py-2 flex items-center justify-center text-center font-bold text-xs shadow-md"
              >
                {txt}
              </div>
              {layout === 'process' && idx < items.length - 1 && <ArrowRight className="w-4 h-4 shrink-0 text-[#B7472A]" />}
            </React.Fragment>
          ))}
        </div>
      );
    }

    if (el.type === 'chart') {
      const data = el.chartData || [{ label: 'Q1', value: 30 }, { label: 'Q2', value: 55 }, { label: 'Q3', value: 42 }, { label: 'Q4', value: 80 }];
      const maxV = Math.max(1, ...data.map((d) => d.value));
      const palette = ['#B7472A', '#185ABD', '#107C41', '#F59E0B', '#7C3AED'];
      return (
        <div className="w-full h-full rounded-xl p-3 flex flex-col border border-black/10" style={{ backgroundColor: el.bgColor || '#f8fafc', color: el.color || '#0f172a' }}>
          <div className="text-xs font-bold mb-2 text-center">{el.chartTitle || 'Диаграмма'}</div>
          <div className="flex-1 flex items-end gap-2.5 pt-2">
            {data.map((d, i) => (
              <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-mono font-bold">{d.value}</span>
                <div className="w-full flex-1 flex items-end">
                  <div className="w-full rounded-t-md" style={{ height: `${Math.max(10, (d.value / maxV) * 100)}%`, backgroundColor: palette[i % palette.length] }} />
                </div>
                <span className="text-[10px] font-semibold truncate">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Text, Shape, WordArt
    const isShape = el.type === 'shape';
    const isWordArt = el.type === 'wordart';
    const shapeStyle = isShape ? renderShapeClipPath(el.shape) : undefined;

    return (
      <div
        style={{
          ...shapeStyle,
          backgroundColor: isShape ? (el.bgColor || '#B7472A') : el.bgColor || 'transparent',
          border: el.borderColor ? `${el.borderWidth || 2}px solid ${el.borderColor}` : undefined,
          color: el.color || '#1e293b',
          fontSize: `${el.fontSize || 20}px`,
          fontFamily: el.fontFamily || 'Calibri, Segoe UI, sans-serif',
          fontWeight: el.bold || isWordArt ? 800 : 400,
          fontStyle: el.italic ? 'italic' : undefined,
          textDecoration: el.underline ? 'underline' : undefined,
          textAlign: el.align || (isShape || isWordArt ? 'center' : 'left'),
          textShadow: isWordArt || el.textShadow ? '0 3px 12px rgba(0,0,0,0.35)' : undefined,
          boxShadow: el.shadow ? '0 10px 26px rgba(0,0,0,0.28)' : undefined,
        }}
        className={`w-full h-full flex flex-col justify-center px-2.5 py-1.5 whitespace-pre-wrap leading-snug overflow-hidden ${
          isWordArt ? 'tracking-tight uppercase' : ''
        }`}
      >
        {interactive && editingElId === el.id ? (
          <textarea
            autoFocus
            value={el.text || ''}
            onChange={(ev) => updateSelectedEl({ text: ev.target.value })}
            onBlur={() => setEditingElId(null)}
            onClick={(ev) => ev.stopPropagation()}
            style={{ textAlign: el.align || 'left', color: el.color || '#1e293b' }}
            className="w-full h-full bg-transparent outline-none resize-none"
          />
        ) : (
          <span>{el.text}</span>
        )}
      </div>
    );
  };

  const ribbonBg = officeDark ? 'bg-[#252526] border-white/10 text-zinc-100' : 'bg-[#F3F2F1] border-[#D1D1D1] text-[#242424]';
  const tabBarBg = officeDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-[#E1DFDD]';

  const TABS: { id: PptRibbonTab; label: string }[] = [
    { id: 'home', label: 'Главная' },
    { id: 'insert', label: 'Вставка' },
    { id: 'draw', label: 'Рисование' },
    { id: 'design', label: 'Конструктор' },
    { id: 'transitions', label: 'Переходы' },
    { id: 'animations', label: 'Анимации' },
    { id: 'slideshow', label: 'Слайд-шоу' },
    { id: 'view', label: 'Вид' },
  ];

  const renderSlideCanvas = (targetSlide: OfficeSlide, interactive: boolean) => (
    <div
      ref={interactive ? canvasRef : undefined}
      onMouseDown={interactive ? handleCanvasMouseDown : undefined}
      onMouseMove={interactive ? handleCanvasMouseMove : undefined}
      onMouseUp={() => { drawingActiveRef.current = null; }}
      style={{
        background: targetSlide.background,
        aspectRatio: aspect === '16:9' ? '16 / 9' : '4 / 3',
        cursor: interactive && drawTool !== 'select' ? 'crosshair' : 'default',
      }}
      className="relative w-full max-w-[920px] shadow-[0_12px_40px_rgba(0,0,0,0.28)] rounded-[3px] overflow-hidden select-none"
    >
      {/* Alignment Guides */}
      {interactive && showGuides && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute inset-y-0 left-1/2 w-px border-l border-dashed border-[#B7472A]/50" />
          <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed border-[#B7472A]/50" />
        </div>
      )}

      {/* Slide Elements */}
      {targetSlide.elements.map((el) => {
        const isSel = interactive && el.id === selectedElId;
        return (
          <div
            key={`${el.id}_${animPreviewTick}`}
            onMouseDown={(e) => interactive && startDragEl(e, el)}
            onDoubleClick={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              setSelectedElId(el.id);
              if (el.type === 'text' || el.type === 'shape' || el.type === 'wordart') setEditingElId(el.id);
            }}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.w}%`,
              height: `${el.h}%`,
              opacity: el.opacity ?? 1,
              transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
            }}
            className={`absolute ${interactive ? 'cursor-move' : ''} ${
              isSel ? 'ring-2 ring-[#B7472A] z-20' : 'z-10'
            } ${el.anim && el.anim !== 'none' ? 'animate-in fade-in duration-300' : ''}`}
          >
            {renderElementBody(el, interactive)}

            {/* Animation order badge when on Animations tab */}
            {interactive && tab === 'animations' && el.anim && el.anim !== 'none' && (
              <span className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-[#B7472A] text-white text-[10px] font-bold flex items-center justify-center shadow">
                {el.animOrder || 1}
              </span>
            )}

            {/* 6 Resize Handles like real MS PowerPoint */}
            {isSel && (
              <>
                {(['nw', 'ne', 'sw', 'se', 'e', 's'] as const).map((h) => {
                  const posCls =
                    h === 'nw' ? '-top-1.5 -left-1.5 cursor-nwse-resize' :
                    h === 'ne' ? '-top-1.5 -right-1.5 cursor-nesw-resize' :
                    h === 'sw' ? '-bottom-1.5 -left-1.5 cursor-nesw-resize' :
                    h === 'se' ? '-bottom-1.5 -right-1.5 cursor-nwse-resize' :
                    h === 'e' ? 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize' :
                    '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize';
                  return (
                    <span
                      key={h}
                      onMouseDown={(ev) => startResizeEl(ev, el, h)}
                      className={`absolute w-2.5 h-2.5 rounded-full bg-white border-2 border-[#B7472A] shadow z-30 ${posCls}`}
                    />
                  );
                })}
              </>
            )}
          </div>
        );
      })}

      {/* Freehand Vector Drawings Layer */}
      {(targetSlide.drawings || []).length > 0 && (
        <svg viewBox="0 0 1000 562" className="pointer-events-none absolute inset-0 w-full h-full z-25">
          {targetSlide.drawings!.map((st) => (
            <polyline
              key={st.id}
              fill="none"
              stroke={st.color}
              strokeWidth={st.width}
              strokeOpacity={st.opacity}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={st.points.map((p) => `${p.x},${p.y}`).join(' ')}
            />
          ))}
        </svg>
      )}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 select-none">
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* AUTHENTIC MS POWERPOINT RIBBON TABS */}
      <div className={`flex items-center gap-0.5 px-3 pt-1 border-b text-xs overflow-x-auto ${tabBarBg}`}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); if (t.id !== 'draw') setDrawTool('select'); }}
              className={`px-3 py-1.5 rounded-t-md font-medium transition cursor-pointer relative whitespace-nowrap ${
                active
                  ? officeDark
                    ? 'bg-[#252526] text-[#FB923C] font-bold'
                    : 'bg-[#F3F2F1] text-[#B7472A] font-bold'
                  : officeDark
                  ? 'text-zinc-300 hover:bg-white/5'
                  : 'text-[#323130] hover:bg-[#F3F2F1]'
              }`}
            >
              {t.label}
              {active && <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full bg-[#B7472A]" />}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => startSlideshow(activeSlideIdx, false)}
          className="ml-auto my-1 px-3 py-1 rounded bg-[#B7472A] hover:brightness-110 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
        >
          <Play className="w-3 h-3" /> Показ (F5)
        </button>
      </div>

      {/* AUTHENTIC MS POWERPOINT RIBBON GROUPS */}
      <div className={`flex items-stretch overflow-x-auto border-b px-1.5 py-0.5 ${ribbonBg}`}>
        {tab === 'home' && (
          <>
            <RibbonGroup label="Слайды" isDark={officeDark}>
              <RibbonBigBtn icon={<Plus className="w-5 h-5 text-[#B7472A]" />} label="Создать слайд" accent={PPT_ORANGE} isDark={officeDark} onClick={() => setLayoutPickerOpen((v) => !v)} />
              <div className="flex flex-col gap-0.5">
                <RibbonSmallBtn icon={<Layout className="w-3.5 h-3.5" />} label="Макеты" active={layoutPickerOpen} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setLayoutPickerOpen((v) => !v)} />
                <RibbonSmallBtn icon={<Copy className="w-3.5 h-3.5" />} label="Дублировать" isDark={officeDark} onClick={() => duplicateSlide(activeSlideIdx)} />
                <RibbonSmallBtn icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />} label="Удалить" disabled={slides.length <= 1} isDark={officeDark} onClick={() => deleteSlide(activeSlideIdx)} />
              </div>
            </RibbonGroup>

            <RibbonGroup label="Шрифт (выделенный объект)" isDark={officeDark}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <select
                    disabled={!selectedEl}
                    value={selectedEl?.fontSize || 20}
                    onChange={(e) => updateSelectedEl({ fontSize: Number(e.target.value) })}
                    className={`h-6 px-1 rounded border text-[11px] w-16 outline-none ${officeDark ? 'bg-[#1e1e1e] border-white/15' : 'bg-white border-[#C8C6C4]'}`}
                  >
                    {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 60].map((s) => <option key={s} value={s}>{s} pt</option>)}
                  </select>
                  <RibbonSmallBtn icon={<Bold className="w-3.5 h-3.5" />} disabled={!selectedEl} active={selectedEl?.bold} accent={PPT_ORANGE} isDark={officeDark} onClick={() => updateSelectedEl({ bold: !selectedEl?.bold })} />
                  <RibbonSmallBtn icon={<Italic className="w-3.5 h-3.5" />} disabled={!selectedEl} active={selectedEl?.italic} accent={PPT_ORANGE} isDark={officeDark} onClick={() => updateSelectedEl({ italic: !selectedEl?.italic })} />
                  <RibbonSmallBtn icon={<Underline className="w-3.5 h-3.5" />} disabled={!selectedEl} active={selectedEl?.underline} accent={PPT_ORANGE} isDark={officeDark} onClick={() => updateSelectedEl({ underline: !selectedEl?.underline })} />
                </div>
                <div className="flex items-center gap-1">
                  <RibbonSmallBtn icon={<AlignLeft className="w-3.5 h-3.5" />} disabled={!selectedEl} active={selectedEl?.align === 'left'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => updateSelectedEl({ align: 'left' })} />
                  <RibbonSmallBtn icon={<AlignCenter className="w-3.5 h-3.5" />} disabled={!selectedEl} active={selectedEl?.align === 'center'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => updateSelectedEl({ align: 'center' })} />
                  <RibbonSmallBtn icon={<AlignRight className="w-3.5 h-3.5" />} disabled={!selectedEl} active={selectedEl?.align === 'right'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => updateSelectedEl({ align: 'right' })} />
                  <div className="h-4 w-px bg-zinc-400/30 mx-0.5" />
                  {['#ffffff', '#0f172a', '#B7472A', '#185ABD', '#107C41', '#F59E0B'].map((c) => (
                    <button key={c} type="button" disabled={!selectedEl} onClick={() => updateSelectedEl({ color: c })} className="w-3.5 h-3.5 rounded-full border border-black/25 cursor-pointer disabled:opacity-40" style={{ backgroundColor: c }} title="Цвет текста" />
                  ))}
                </div>
              </div>
            </RibbonGroup>

            <RibbonGroup label="Рисование и Упорядочить" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Type className="w-5 h-5 text-[#B7472A]" />}
                label="Надпись"
                isDark={officeDark}
                onClick={() => addElement({ id: `tx_${Date.now()}`, type: 'text', x: 15, y: 35, w: 70, h: 16, text: 'Дважды кликните для ввода текста', fontSize: 22, color: '#1e293b' })}
              />
              <RibbonBigBtn icon={<Square className="w-5 h-5 text-sky-600" />} label="Фигуры ▾" active={shapesPickerOpen} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setShapesPickerOpen((v) => !v)} />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-0.5">
                  <span className="text-[9px] opacity-65">Заливка:</span>
                  {['transparent', '#B7472A', '#185ABD', '#107C41', '#F59E0B', '#EFF6FF'].map((c) => (
                    <button key={c} type="button" disabled={!selectedEl} onClick={() => updateSelectedEl({ bgColor: c })} className="w-3.5 h-3.5 rounded-xs border border-black/25 cursor-pointer" style={{ backgroundColor: c === 'transparent' ? '#e2e8f0' : c }} />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <RibbonSmallBtn
                    icon={<RotateCw className="w-3 h-3" />}
                    label="+15°"
                    disabled={!selectedEl}
                    isDark={officeDark}
                    onClick={() => updateSelectedEl({ rotate: ((selectedEl?.rotate || 0) + 15) % 360 })}
                  />
                  <RibbonSmallBtn
                    icon={<Copy className="w-3 h-3" />}
                    label="Копия"
                    disabled={!selectedEl}
                    isDark={officeDark}
                    onClick={() => selectedEl && addElement({ ...selectedEl, id: `el_${Date.now()}`, x: Math.min(82, selectedEl.x + 4), y: Math.min(82, selectedEl.y + 4) })}
                  />
                  <RibbonSmallBtn
                    icon={<Trash2 className="w-3 h-3 text-rose-500" />}
                    label="Удалить"
                    disabled={!selectedEl}
                    isDark={officeDark}
                    onClick={() => {
                      updateSlide((s) => ({ ...s, elements: s.elements.filter((x) => x.id !== selectedElId) }));
                      setSelectedElId(null);
                    }}
                  />
                </div>
              </div>
            </RibbonGroup>
          </>
        )}

        {tab === 'insert' && (
          <>
            <RibbonGroup label="Иллюстрации" isDark={officeDark}>
              <RibbonBigBtn icon={<ImageIcon className="w-5 h-5 text-emerald-600" />} label="Рисунок с ПК" isDark={officeDark} onClick={() => imgInputRef.current?.click()} />
              <RibbonBigBtn icon={<Square className="w-5 h-5 text-[#B7472A]" />} label="Фигуры (15+)" active={shapesPickerOpen} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setShapesPickerOpen((v) => !v)} />
              <RibbonBigBtn
                icon={<Layers className="w-5 h-5 text-indigo-500" />}
                label="SmartArt"
                isDark={officeDark}
                onClick={() =>
                  addElement({
                    id: `sa_${Date.now()}`, type: 'smartart', smartArtLayout: 'process',
                    x: 8, y: 32, w: 84, h: 32, smartArtItems: ['Идея', 'План', 'Реализация', 'Результат'], bgColor: PPT_ORANGE, color: '#ffffff',
                  })
                }
              />
              <RibbonBigBtn
                icon={<BarChart3 className="w-5 h-5 text-sky-600" />}
                label="Диаграмма"
                isDark={officeDark}
                onClick={() =>
                  addElement({
                    id: `ch_${Date.now()}`, type: 'chart', chartType: 'bar', chartTitle: 'Показатели',
                    x: 15, y: 20, w: 60, h: 62,
                    chartData: [{ label: '2023', value: 35 }, { label: '2024', value: 52 }, { label: '2025', value: 74 }, { label: '2026', value: 96 }],
                  })
                }
              />
            </RibbonGroup>

            <RibbonGroup label="Таблицы и Текст" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Table2 className="w-5 h-5 text-[#B7472A]" />}
                label="Таблица 3×3"
                isDark={officeDark}
                onClick={() =>
                  addElement({
                    id: `tb_${Date.now()}`, type: 'table', x: 15, y: 26, w: 70, h: 44,
                    rows: [['Параметр', 'План', 'Факт'], ['Скорость', '100%', '135%'], ['Качество', '95%', '99%']],
                  })
                }
              />
              <RibbonBigBtn
                icon={<Type className="w-5 h-5" />}
                label="Надпись"
                isDark={officeDark}
                onClick={() => addElement({ id: `tx_${Date.now()}`, type: 'text', x: 15, y: 40, w: 70, h: 16, text: 'Новая надпись', fontSize: 24, color: '#1e293b' })}
              />
              <RibbonBigBtn
                icon={<Sparkles className="w-5 h-5 text-amber-500" />}
                label="WordArt"
                isDark={officeDark}
                onClick={() => addElement({ id: `wa_${Date.now()}`, type: 'wordart', x: 12, y: 34, w: 76, h: 20, text: 'ЭФФЕКТНЫЙ ЗАГОЛОВОК', fontSize: 42, bold: true, align: 'center', color: PPT_ORANGE })}
              />
            </RibbonGroup>
          </>
        )}

        {tab === 'draw' && (
          <RibbonGroup label="Инструменты рисования прямо на слайде" isDark={officeDark}>
            <RibbonBigBtn icon={<Square className="w-4 h-4" />} label="Курсор" active={drawTool === 'select'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setDrawTool('select')} />
            <RibbonBigBtn icon={<PenTool className="w-5 h-5 text-rose-500" />} label="Перо" active={drawTool === 'pen'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setDrawTool('pen')} />
            <RibbonBigBtn icon={<Highlighter className="w-5 h-5 text-amber-400" />} label="Маркер" active={drawTool === 'highlighter'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setDrawTool('highlighter')} />
            <RibbonBigBtn icon={<Eraser className="w-5 h-5" />} label="Ластик" active={drawTool === 'eraser'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setDrawTool('eraser')} />
            <div className="flex flex-col gap-1 px-2">
              <div className="flex items-center gap-1">
                {['#E11D48', '#185ABD', '#107C41', '#F59E0B', '#0f172a', '#ffffff'].map((c) => (
                  <button key={c} type="button" onClick={() => { setDrawColor(c); setDrawTool('pen'); }} className={`w-4 h-4 rounded-full border cursor-pointer ${drawColor === c ? 'ring-2 ring-[#B7472A]' : 'border-black/25'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <span>Толщина:</span>
                <input type="range" min={1} max={10} value={drawWidth} onChange={(e) => setDrawWidth(Number(e.target.value))} className="w-20" />
                <button type="button" onClick={() => updateSlide((s) => ({ ...s, drawings: [] }))} className="text-rose-500 font-bold ml-1 cursor-pointer">Очистить</button>
              </div>
            </div>
          </RibbonGroup>
        )}

        {tab === 'design' && (
          <>
            <RibbonGroup label="Темы оформления (12 тем)" isDark={officeDark}>
              <div className="flex items-center gap-1.5">
                {SLIDE_THEMES.map((th) => (
                  <button
                    key={th.name}
                    type="button"
                    onClick={() => {
                      updateSlide((s) => ({
                        ...s,
                        background: th.bg,
                        elements: s.elements.map((el) => (el.type === 'text' ? { ...el, color: th.text } : el)),
                      }));
                      onNotify?.('PowerPoint · Тема', `Применена тема «${th.name}»`, 'ok');
                    }}
                    style={{ background: th.bg, color: th.text }}
                    className="w-20 h-[52px] rounded border border-black/20 p-1.5 flex flex-col justify-between text-left cursor-pointer hover:scale-105 transition shrink-0"
                  >
                    <span className="text-[11px] font-black leading-none" style={{ color: th.accent }}>Aa</span>
                    <span className="text-[8px] truncate opacity-90">{th.name}</span>
                  </button>
                ))}
              </div>
            </RibbonGroup>
            <RibbonGroup label="Размер слайда" isDark={officeDark}>
              <RibbonBigBtn icon={<span className="font-mono font-bold text-xs">16:9</span>} label="Широкий" active={aspect === '16:9'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setAspect('16:9')} />
              <RibbonBigBtn icon={<span className="font-mono font-bold text-xs">4:3</span>} label="Стандарт" active={aspect === '4:3'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setAspect('4:3')} />
            </RibbonGroup>
          </>
        )}

        {tab === 'transitions' && (
          <>
            <RibbonGroup label="Переход к этому слайду" isDark={officeDark}>
              <div className="flex items-center gap-1">
                {TRANSITIONS.map((trItem) => (
                  <RibbonBigBtn
                    key={trItem.id}
                    icon={<Sparkles className="w-4 h-4 text-[#B7472A]" />}
                    label={trItem.label}
                    active={slide.transition === trItem.id}
                    accent={PPT_ORANGE}
                    isDark={officeDark}
                    onClick={() => updateSlide((s) => ({ ...s, transition: trItem.id }))}
                  />
                ))}
              </div>
            </RibbonGroup>
            <RibbonGroup label="Время" isDark={officeDark}>
              <RibbonBigBtn
                icon={<Copy className="w-4 h-4" />}
                label="Ко всем слайдам"
                isDark={officeDark}
                onClick={() => {
                  onChangeSlides(slides.map((s) => ({ ...s, transition: slide.transition })));
                  onNotify?.('Переходы', 'Переход применён ко всем слайдам', 'ok');
                }}
              />
            </RibbonGroup>
          </>
        )}

        {tab === 'animations' && (
          <RibbonGroup label="Анимация выделенного объекта" isDark={officeDark}>
            <RibbonBigBtn icon={<Play className="w-5 h-5 text-emerald-600" />} label="Просмотр" isDark={officeDark} onClick={() => setAnimPreviewTick((v) => v + 1)} />
            {ANIMATIONS.map((an) => (
              <RibbonBigBtn
                key={an.id}
                icon={<Star className="w-4 h-4 text-emerald-500" />}
                label={an.label}
                disabled={!selectedEl}
                active={selectedEl?.anim === an.id}
                accent={PPT_ORANGE}
                isDark={officeDark}
                onClick={() => updateSelectedEl({ anim: an.id, animOrder: selectedEl?.animOrder || 1 })}
              />
            ))}
          </RibbonGroup>
        )}

        {tab === 'slideshow' && (
          <RibbonGroup label="Начать показ слайдов" isDark={officeDark}>
            <RibbonBigBtn icon={<Play className="w-5 h-5 text-[#B7472A]" />} label="С начала (F5)" isDark={officeDark} onClick={() => startSlideshow(0, false)} />
            <RibbonBigBtn icon={<Maximize2 className="w-5 h-5 text-sky-600" />} label="С текущего" isDark={officeDark} onClick={() => startSlideshow(activeSlideIdx, false)} />
            <RibbonBigBtn icon={<MessageSquare className="w-5 h-5 text-indigo-500" />} label="Режим докладчика" isDark={officeDark} onClick={() => startSlideshow(activeSlideIdx, true)} />
          </RibbonGroup>
        )}

        {tab === 'view' && (
          <RibbonGroup label="Режимы просмотра презентации" isDark={officeDark}>
            <RibbonBigBtn icon={<Layout className="w-5 h-5 text-[#B7472A]" />} label="Обычный" active={viewMode === 'normal'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setViewMode('normal')} />
            <RibbonBigBtn icon={<Grid className="w-5 h-5 text-sky-600" />} label="Сортировщик" active={viewMode === 'sorter'} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setViewMode('sorter')} />
            <RibbonBigBtn icon={<MessageSquare className="w-5 h-5" />} label="Заметки" active={showNotes} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setShowNotes((v) => !v)} />
            <RibbonBigBtn icon={<Circle className="w-5 h-5" />} label="Направляющие" active={showGuides} accent={PPT_ORANGE} isDark={officeDark} onClick={() => setShowGuides((v) => !v)} />
          </RibbonGroup>
        )}
      </div>

      {/* SLIDE LAYOUTS PICKER POPOVER */}
      {layoutPickerOpen && (
        <div className={`px-4 py-2.5 border-b flex flex-wrap items-center gap-2 text-xs ${officeDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-[#D1D1D1]'}`}>
          <span className="font-bold text-[#B7472A] mr-2">Выберите макет нового слайда:</span>
          {SLIDE_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => addSlideWithLayout(l.id)}
              className={`px-3 py-1.5 rounded border font-semibold cursor-pointer ${officeDark ? 'border-white/15 hover:bg-white/10' : 'border-zinc-300 hover:bg-[#FFF7ED] hover:border-[#B7472A]'}`}
            >
              {l.name}
            </button>
          ))}
          <button type="button" onClick={() => setLayoutPickerOpen(false)} className="ml-auto cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* SHAPES GALLERY POPOVER */}
      {shapesPickerOpen && (
        <div className={`px-4 py-2.5 border-b flex flex-wrap items-center gap-1.5 text-xs ${officeDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-[#D1D1D1]'}`}>
          <span className="font-bold text-[#B7472A] mr-2">Фигуры:</span>
          {SHAPES.map((sh) => (
            <button
              key={sh.kind}
              type="button"
              onClick={() => {
                addElement({
                  id: `sh_${Date.now()}`, type: 'shape', shape: sh.kind,
                  x: 34, y: 34, w: 28, h: sh.kind === 'line' ? 2 : 24,
                  text: sh.kind === 'line' ? '' : sh.label, fontSize: 14, bold: true, color: '#ffffff', bgColor: PPT_ORANGE,
                });
                setShapesPickerOpen(false);
              }}
              className={`px-2 py-1 rounded border text-[11px] cursor-pointer ${officeDark ? 'border-white/15 hover:bg-white/10' : 'border-zinc-300 hover:bg-[#FFF7ED]'}`}
            >
              {sh.label}
            </button>
          ))}
          <button type="button" onClick={() => setShapesPickerOpen(false)} className="ml-auto cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* MAIN POWERPOINT WORKSPACE: Left Slide Thumbnails + Center 16:9 Stage + Notes OR Slide Sorter Grid */}
      {viewMode === 'sorter' ? (
        <div className={`flex-1 overflow-auto p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${officeDark ? 'bg-[#161618]' : 'bg-[#E6E6E6]'}`}>
          {slides.map((sl, idx) => (
            <div
              key={sl.id}
              onClick={() => { onChangeActiveSlideIdx(idx); setViewMode('normal'); }}
              className={`rounded-lg border-2 p-2 cursor-pointer transition space-y-1.5 ${
                idx === activeSlideIdx ? 'border-[#B7472A] bg-[#B7472A]/10' : officeDark ? 'border-white/10 bg-[#252526]' : 'border-zinc-300 bg-white'
              }`}
            >
              <div className="aspect-video w-full rounded overflow-hidden pointer-events-none" style={{ background: sl.background }}>
                <div className="w-full h-full flex items-center justify-center p-2 text-[10px] font-bold text-center text-white drop-shadow">
                  {sl.elements.find((e) => e.text)?.text?.slice(0, 40) || sl.title}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span>{idx + 1}. {sl.title}</span>
                <span className="text-[9px] opacity-60 uppercase">{sl.transition}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`flex-1 min-h-0 flex overflow-hidden ${officeDark ? 'bg-[#161618]' : 'bg-[#E6E6E6]'}`}>
          {/* Left Numbered Slide Thumbnails Rail */}
          <div className={`w-48 shrink-0 border-r p-2.5 overflow-y-auto space-y-2.5 ${officeDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-[#F3F2F1] border-[#D1D1D1]'}`}>
            {slides.map((sl, idx) => {
              const active = idx === activeSlideIdx;
              return (
                <div key={sl.id} className="group flex items-start gap-1.5">
                  <span className={`text-[10px] font-mono w-4 text-right pt-1 ${active ? 'text-[#B7472A] font-bold' : 'opacity-60'}`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div
                      onClick={() => { onChangeActiveSlideIdx(idx); setSelectedElId(null); }}
                      style={{ background: sl.background }}
                      className={`aspect-video w-full rounded border-2 overflow-hidden cursor-pointer flex items-center justify-center p-1.5 transition ${
                        active ? 'border-[#B7472A] ring-2 ring-[#B7472A]/30 shadow' : 'border-black/15 hover:border-[#B7472A]/60'
                      }`}
                    >
                      <span className="text-[9px] font-bold text-center line-clamp-2 px-1 rounded bg-black/20 text-white">
                        {sl.elements.find((e) => e.text)?.text || sl.title}
                      </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end gap-1 transition">
                      <button type="button" onClick={() => moveSlide(idx, -1)} className="p-0.5 rounded hover:bg-black/10 cursor-pointer" title="Выше"><ArrowUp className="w-3 h-3" /></button>
                      <button type="button" onClick={() => moveSlide(idx, 1)} className="p-0.5 rounded hover:bg-black/10 cursor-pointer" title="Ниже"><ArrowDown className="w-3 h-3" /></button>
                      <button type="button" onClick={() => duplicateSlide(idx)} className="p-0.5 rounded hover:bg-black/10 cursor-pointer" title="Дублировать"><Copy className="w-3 h-3" /></button>
                      <button type="button" onClick={() => deleteSlide(idx)} className="p-0.5 rounded hover:bg-rose-500/20 text-rose-500 cursor-pointer" title="Удалить"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => addSlideWithLayout('title_content')}
              className="w-full py-2 rounded-lg border border-dashed border-[#B7472A]/50 text-[#B7472A] text-xs font-bold hover:bg-[#B7472A]/10 cursor-pointer"
            >
              + Новый слайд
            </button>
          </div>

          {/* Center Slide Canvas + Collapsible Speaker Notes */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-6">
              {renderSlideCanvas(slide, true)}
            </div>
            {showNotes && (
              <div className={`h-20 shrink-0 border-t px-4 py-2 flex flex-col ${officeDark ? 'bg-[#1E1E1E] border-white/10 text-zinc-200' : 'bg-white border-[#D1D1D1] text-slate-800'}`}>
                <span className="text-[10px] font-bold uppercase opacity-60 mb-1">Заметки к слайду {activeSlideIdx + 1}</span>
                <textarea
                  value={slide.notes}
                  onChange={(e) => updateSlide((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Нажмите, чтобы добавить заметки докладчика для режима показа..."
                  className="flex-1 bg-transparent outline-none resize-none text-xs"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUTHENTIC MS POWERPOINT ORANGE-RED STATUS BAR */}
      <div className="h-6 px-3 bg-[#B7472A] text-white text-[11px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span>Слайд {activeSlideIdx + 1} из {slides.length}</span>
          <span className="hidden sm:inline">Переход: {TRANSITIONS.find((t) => t.id === slide.transition)?.label}</span>
          <span className="hidden md:inline">Формат: {aspect}</span>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setShowNotes((v) => !v)} className="hover:underline cursor-pointer">Заметки</button>
          <button type="button" onClick={() => setViewMode(viewMode === 'normal' ? 'sorter' : 'normal')} className="hover:underline cursor-pointer">
            {viewMode === 'normal' ? 'Сортировщик' : 'Обычный'}
          </button>
          <button type="button" onClick={() => startSlideshow(activeSlideIdx, false)} className="font-bold hover:underline cursor-pointer inline-flex items-center gap-1">
            <Play className="w-3 h-3" /> Показ
          </button>
        </div>
      </div>

      {/* FULLSCREEN F5 SLIDESHOW & PRESENTER VIEW OVERLAY (Laser Pointer + Blackout + Notes!) */}
      {presenting && (
        <div
          onMouseMove={(e) => setLaserPos({ x: e.clientX, y: e.clientY })}
          className="fixed inset-0 z-[1300] bg-black text-white flex flex-col"
        >
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 gap-4 relative overflow-hidden">
            {screenMask !== 'none' ? (
              <div
                onClick={() => setScreenMask('none')}
                className={`absolute inset-0 z-30 flex items-center justify-center cursor-pointer ${screenMask === 'black' ? 'bg-black text-white/40' : 'bg-white text-black/40'}`}
              >
                <span className="text-xs font-mono">Экран скрыт ({screenMask === 'black' ? 'B' : 'W'}) — кликните для возврата</span>
              </div>
            ) : null}

            <div className={`${presenterView ? 'w-2/3' : 'w-full'} h-full flex items-center justify-center`}>
              {renderSlideCanvas(slides[presentIdx] || slides[0], false)}
            </div>

            {presenterView && (
              <div className="w-1/3 h-full bg-zinc-900 rounded-2xl border border-white/10 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-mono text-amber-400">
                  <span>РЕЖИМ ДОКЛАДЧИКА</span>
                  <span>{String(Math.floor(presentSec / 60)).padStart(2, '0')}:{String(presentSec % 60).padStart(2, '0')}</span>
                </div>
                <div className="text-xs opacity-60">Следующий слайд:</div>
                <div className="rounded-lg border border-white/15 p-3 bg-black/40 text-xs">
                  {slides[presentIdx + 1] ? `${presentIdx + 2}. ${slides[presentIdx + 1].title}` : 'Конец презентации'}
                </div>
                <div className="text-xs opacity-60 mt-2">Заметки докладчика:</div>
                <div className="flex-1 overflow-y-auto text-sm leading-relaxed bg-black/30 rounded-xl p-3 border border-white/10">
                  {slides[presentIdx]?.notes || 'Заметок для этого слайда нет.'}
                </div>
              </div>
            )}

            {/* Real-time Red Laser Pointer */}
            {presentTool === 'laser' && laserPos && (
              <div
                style={{ left: laserPos.x - 8, top: laserPos.y - 8 }}
                className="pointer-events-none fixed w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_18px_6px_rgba(244,63,94,0.9)] z-50"
              />
            )}
          </div>

          <div className="h-12 px-5 bg-zinc-950/90 border-t border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPresentIdx((i) => Math.max(0, i - 1))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <span className="font-mono px-2">Слайд {presentIdx + 1} / {slides.length}</span>
              <button type="button" onClick={() => setPresentIdx((i) => Math.min(slides.length - 1, i + 1))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPresentTool(presentTool === 'laser' ? 'none' : 'laser')} className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${presentTool === 'laser' ? 'bg-rose-600 text-white' : 'bg-white/10'}`}>
                Лазерная указка
              </button>
              <button type="button" onClick={() => setPresenterView((v) => !v)} className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${presenterView ? 'bg-[#B7472A] text-white' : 'bg-white/10'}`}>
                Докладчик
              </button>
              <button type="button" onClick={() => setScreenMask(screenMask === 'black' ? 'none' : 'black')} className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer">
                Чёрный экран (B)
              </button>
              <button type="button" onClick={() => setPresenting(false)} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 font-bold cursor-pointer">
                Завершить (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
