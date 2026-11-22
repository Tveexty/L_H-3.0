import React, { useMemo, useState } from 'react';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Code2,
  Play,
  Plus,
  Upload,
  Palette,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface CustomUserWidgetSpec {
  id: string;
  title: string;
  subtitle?: string;
  bgImage?: string;
  bgOpacity: number;
  bgBlur: number;
  accentColor: string;
  w: number;
  h: number;
  scriptCode: string;
}

export interface CustomWidgetEvalOutput {
  headline?: string;
  value?: string;
  subtitle?: string;
  progress?: number;
  badge?: string;
  rows?: { label: string; value: string }[];
  error?: string;
}

export interface CustomWidgetEvalCtx {
  telemetry: {
    cpu_percent?: number;
    ram_percent?: number;
    ram_used_gb?: number;
    ram_total_gb?: number;
    gpu_percent?: number;
    gpu_temp_c?: number;
    battery_pct?: number;
    battery_charging?: boolean;
  };
  wireless: { name: string; battery_percent: number; device_type: string; transport?: string }[];
  time: { hhmm: string; seconds: string; dateStr: string; hour: number };
  weather: { temp?: number; desc?: string; city?: string };
}

export function evalCustomWidgetScript(
  code: string,
  ctx: CustomWidgetEvalCtx
): CustomWidgetEvalOutput {
  try {
    const fn = new Function('ctx', `"use strict";\n${code}`);
    const out = fn(ctx);
    if (!out || typeof out !== 'object') {
      return {
        headline: 'Виджет',
        value: String(out ?? '—'),
        subtitle: 'Скрипт вернул значение',
      };
    }
    return {
      headline: out.headline != null ? String(out.headline) : undefined,
      value: out.value != null ? String(out.value) : undefined,
      subtitle: out.subtitle != null ? String(out.subtitle) : undefined,
      progress:
        typeof out.progress === 'number' && !Number.isNaN(out.progress)
          ? Math.max(0, Math.min(100, Math.round(out.progress)))
          : undefined,
      badge: out.badge != null ? String(out.badge) : undefined,
      rows: Array.isArray(out.rows)
        ? out.rows.slice(0, 6).map((r: { label?: unknown; value?: unknown }) => ({
            label: String(r?.label ?? ''),
            value: String(r?.value ?? ''),
          }))
        : undefined,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

const SCRIPT_TEMPLATES: { name: string; title: string; accent: string; w: number; h: number; code: string }[] = [
  {
    name: 'Монитор ПК',
    title: 'Carbon Performance',
    accent: '#22d3ee',
    w: 2,
    h: 2,
    code: `const cpu = Math.round(ctx.telemetry.cpu_percent || 0);
const ram = Math.round(ctx.telemetry.ram_percent || 0);
const gpu = Math.round(ctx.telemetry.gpu_percent || 0);
return {
  headline: 'СОСТОЯНИЕ ПК',
  value: cpu + '% CPU',
  subtitle: 'RAM ' + ram + '% · GPU ' + gpu + '%',
  progress: cpu,
  badge: cpu > 75 ? 'НАГРУЗКА' : 'НОРМА',
  rows: [
    { label: 'ОЗУ', value: (ctx.telemetry.ram_used_gb || 0).toFixed(1) + ' ГБ' },
    { label: 'GPU Темп.', value: (ctx.telemetry.gpu_temp_c || 0) + '°C' }
  ]
};`,
  },
  {
    name: 'Мои устройства',
    title: 'Беспроводная периферия',
    accent: '#10b981',
    w: 2,
    h: 2,
    code: `const devs = ctx.wireless || [];
return {
  headline: 'УСТРОЙСТВА',
  value: devs.length + ' подкл.',
  subtitle: devs[0] ? devs[0].name : 'Нет беспроводных',
  badge: 'BT / 2.4G',
  rows: devs.slice(0, 3).map(d => ({
    label: d.name.slice(0, 16),
    value: d.battery_percent >= 0 ? d.battery_percent + '%' : 'ON'
  }))
};`,
  },
  {
    name: 'Стильные часы + Фото',
    title: 'Carbon Clock',
    accent: '#f59e0b',
    w: 2,
    h: 1,
    code: `return {
  headline: ctx.time.dateStr,
  value: ctx.time.hhmm,
  subtitle: (ctx.weather.city || 'Luma OS') + ' · ' + (ctx.weather.temp ?? 20) + '°C',
  badge: 'LIVE'
};`,
  },
  {
    name: 'Обратный отсчёт',
    title: 'До конца дня',
    accent: '#a855f7',
    w: 2,
    h: 1,
    code: `const leftH = Math.max(0, 23 - ctx.time.hour);
const pct = Math.round((ctx.time.hour / 24) * 100);
return {
  headline: 'ПРОГРЕСС ДНЯ',
  value: leftH + ' ч осталось',
  subtitle: 'Пройдено ' + pct + '% суток',
  progress: pct,
  badge: ctx.time.hhmm
};`,
  },
];

interface LumaCustomWidgetBuilderProps {
  open: boolean;
  isDark: boolean;
  initialSpec?: CustomUserWidgetSpec | null;
  previewCtx: CustomWidgetEvalCtx;
  onClose: () => void;
  onSave: (spec: CustomUserWidgetSpec) => void;
}

export const LumaCustomWidgetBuilder: React.FC<LumaCustomWidgetBuilderProps> = ({
  open,
  isDark,
  initialSpec,
  previewCtx,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(initialSpec?.title || 'Мой виджет Carbon');
  const [bgImage, setBgImage] = useState(initialSpec?.bgImage || '/luma-carbon-weave.jpg');
  const [bgOpacity, setBgOpacity] = useState(initialSpec?.bgOpacity ?? 75);
  const [bgBlur, setBgBlur] = useState(initialSpec?.bgBlur ?? 6);
  const [accentColor, setAccentColor] = useState(initialSpec?.accentColor || '#22d3ee');
  const [w, setW] = useState(initialSpec?.w || 2);
  const [h, setH] = useState(initialSpec?.h || 2);
  const [scriptCode, setScriptCode] = useState(
    initialSpec?.scriptCode || SCRIPT_TEMPLATES[0].code
  );

  const previewOut = useMemo(
    () => evalCustomWidgetScript(scriptCode, previewCtx),
    [scriptCode, previewCtx]
  );

  if (!open) return null;

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBgImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    onSave({
      id: initialSpec?.id || `cw_${Date.now()}`,
      title: title.trim() || 'Свой виджет',
      bgImage: bgImage.trim(),
      bgOpacity,
      bgBlur,
      accentColor,
      w,
      h,
      scriptCode,
    });
    onClose();
  };

  const subText = isDark ? 'text-white/55' : 'text-slate-500';

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[88vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
          isDark
            ? 'bg-[#0f1116]/95 border-white/15 text-white'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'border-white/10' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Sparkles size={17} />
            </div>
            <div>
              <div className="text-sm font-bold">Конструктор своих виджетов · Carbon Studio</div>
              <div className={`text-[11px] ${subText}`}>
                Загружайте свою картинку, пишите JS-логику с доступом к данным системы и размещайте на рабочем столе
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Visual & Script Settings */}
          <div className="lg:col-span-7 space-y-4">
            {/* Templates */}
            <div>
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${subText}`}>
                Стартовые шаблоны
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SCRIPT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    onClick={() => {
                      setTitle(tpl.title);
                      setAccentColor(tpl.accent);
                      setW(tpl.w);
                      setH(tpl.h);
                      setScriptCode(tpl.code);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border transition ${
                      isDark
                        ? 'bg-white/[0.05] border-white/10 hover:bg-white/12'
                        : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Title + Size + Accent */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className={`text-[10px] uppercase font-semibold block mb-1 ${subText}`}>
                  Название виджета
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-white/[0.05] border-white/12 text-white' : 'bg-white border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[10px] uppercase font-semibold block mb-1 ${subText}`}>
                  Размер (сетка)
                </label>
                <select
                  value={`${w}x${h}`}
                  onChange={(e) => {
                    const [nw, nh] = e.target.value.split('x').map(Number);
                    setW(nw);
                    setH(nh);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-[#14171f] border-white/12 text-white' : 'bg-white border-slate-200'
                  }`}
                >
                  <option value="2x1">2 × 1 (Широкий)</option>
                  <option value="2x2">2 × 2 (Квадрат)</option>
                  <option value="3x2">3 × 2 (Большой)</option>
                  <option value="4x2">4 × 2 (Панорамный)</option>
                </select>
              </div>
            </div>

            {/* Background Image Upload / URL + Sliders */}
            <div
              className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-cyan-400" />
                  Фоновая картинка и стиль
                </span>
                <label className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-400/25 hover:bg-cyan-500/25 cursor-pointer flex items-center gap-1">
                  <Upload size={12} />
                  Загрузить с ПК
                  <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  value={bgImage.startsWith('data:') ? 'Локальное изображение загружено ✓' : bgImage}
                  onChange={(e) => setBgImage(e.target.value)}
                  placeholder="URL изображения или выберите файл..."
                  className={`flex-1 px-2.5 py-1.5 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-black/30 border-white/12 text-white' : 'bg-white border-slate-200'
                  }`}
                />
                {bgImage && (
                  <button
                    onClick={() => setBgImage('')}
                    className="px-2.5 py-1 rounded-xl text-[11px] bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
                  >
                    Без фото
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 items-center pt-1">
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Прозрачность: {bgOpacity}%</div>
                  <input
                    type="range"
                    min={15}
                    max={100}
                    value={bgOpacity}
                    onChange={(e) => setBgOpacity(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <div className={`text-[10px] mb-1 ${subText}`}>Размытие: {bgBlur}px</div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={bgBlur}
                    onChange={(e) => setBgBlur(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <div className={`text-[10px] mb-1 flex items-center gap-1 ${subText}`}>
                    <Palette size={10} /> Акцент
                  </div>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full h-7 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>
            </div>

            {/* JS Script Editor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <Code2 size={14} className="text-amber-400" />
                  JS-скрипт данных (доступно: ctx.telemetry, ctx.wireless, ctx.time, ctx.weather)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Play size={10} /> Live
                </span>
              </div>
              <textarea
                value={scriptCode}
                onChange={(e) => setScriptCode(e.target.value)}
                rows={10}
                spellCheck={false}
                className={`w-full p-3 rounded-2xl font-mono text-[11px] leading-relaxed border outline-none resize-none ${
                  isDark
                    ? 'bg-[#090b0f] border-white/15 text-emerald-300'
                    : 'bg-slate-900 border-slate-300 text-emerald-300'
                }`}
              />
            </div>
          </div>

          {/* Right: Real-Time Preview */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${subText}`}>
                Живой предпросмотр на рабочем столе
              </div>

              <div
                className="relative rounded-3xl p-5 min-h-[220px] flex flex-col justify-center items-center border border-white/10 overflow-hidden"
                style={{
                  background:
                    'radial-gradient(circle at 20% 20%, rgba(34,211,238,0.18), rgba(15,17,22,0.95) 65%)',
                }}
              >
                {/* Live Widget Card */}
                <div
                  className="relative w-full max-w-[280px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl p-4 text-white"
                  style={{
                    minHeight: h >= 2 ? 175 : 108,
                    backgroundColor: `rgba(15,18,24,${bgOpacity / 100})`,
                  }}
                >
                  {bgImage && (
                    <img
                      src={bgImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{
                        opacity: bgOpacity / 100,
                        filter: bgBlur > 0 ? `blur(${bgBlur * 0.35}px)` : undefined,
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/40 to-black/70 pointer-events-none" />

                  <div className="relative z-10 flex flex-col justify-between h-full gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-85 truncate">
                        {previewOut.headline || title}
                      </span>
                      {previewOut.badge && (
                        <span
                          className="text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor: `${accentColor}33`,
                            color: accentColor,
                            border: `1px solid ${accentColor}55`,
                          }}
                        >
                          {previewOut.badge}
                        </span>
                      )}
                    </div>

                    {previewOut.error ? (
                      <div className="text-[11px] text-rose-300 flex items-start gap-1.5">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span className="break-words">{previewOut.error}</span>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="text-2xl font-black tracking-tight leading-none">
                            {previewOut.value || '—'}
                          </div>
                          {previewOut.subtitle && (
                            <div className="text-[11px] text-white/75 mt-1 truncate">
                              {previewOut.subtitle}
                            </div>
                          )}
                        </div>

                        {typeof previewOut.progress === 'number' && (
                          <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${previewOut.progress}%`,
                                backgroundColor: accentColor,
                              }}
                            />
                          </div>
                        )}

                        {previewOut.rows && previewOut.rows.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-white/10">
                            {previewOut.rows.map((r, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px]">
                                <span className="text-white/65 truncate">{r.label}</span>
                                <span className="font-mono font-semibold" style={{ color: accentColor }}>
                                  {r.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`p-3 rounded-2xl border text-[11px] flex items-start gap-2 ${
                  previewOut.error
                    ? 'bg-rose-500/10 border-rose-400/25 text-rose-300'
                    : isDark
                    ? 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {previewOut.error ? (
                  <>
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>Ошибка в скрипте: {previewOut.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                    <span>Скрипт работает чисто и обновляется в реальном времени!</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-medium ${
                  isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={!!previewOut.error}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-40 text-white flex items-center gap-1.5 shadow-lg transition"
              >
                <Plus size={14} />
                {initialSpec ? 'Сохранить изменения' : 'Добавить на рабочий стол'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
