import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

interface VMemDrive {
  drive: string;
  label: string;
  free_gb: number;
  total_gb: number;
  media_type: string;
  is_ssd: boolean;
}

interface VMemStatus {
  ok: boolean;
  platform: string;
  is_admin: boolean;
  physical_ram_total_gb: number;
  physical_ram_used_gb: number;
  current_pagefile_min_mb: number;
  current_pagefile_max_mb: number;
  current_pagefile_used_mb: number;
  current_pagefile_path: string;
  is_fixed_min_max: boolean;
  memory_compression_enabled: boolean;
  clear_pagefile_at_shutdown: boolean;
  config: {
    enabled: boolean;
    preset_gb: number;
    drive: string;
    fixed_min_max: boolean;
    memory_compression: boolean;
    clear_pagefile_at_shutdown: boolean;
    ssd_rated_tbw: number;
  };
  drives: VMemDrive[];
  tbw: {
    rated_tbw: number;
    daily_write_gb: number;
    yearly_write_tb: number;
    wear_percent_per_year: number;
    estimated_years: number;
    ssd_friendly_score: number;
    write_reduction_pct: number;
    recommendation: string;
  };
  effective_total_ram_gb: number;
  needs_reboot: boolean;
}

interface LumaVirtualMemoryPanelProps {
  isDark: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  onElevateAdmin: () => void;
  onPushToast: (title: string, msg: string, level?: 'info' | 'success' | 'warning') => void;
}

export const LumaVirtualMemoryPanel: React.FC<LumaVirtualMemoryPanelProps> = ({
  isDark,
  surfaceCls,
  btnCls,
  mutedCls,
  onElevateAdmin,
  onPushToast,
}) => {
  const [status, setStatus] = useState<VMemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [sizeGB, setSizeGB] = useState<number>(4);
  const [drive, setDrive] = useState<string>('C:');
  const [fixedMinMax, setFixedMinMax] = useState<boolean>(true);
  const [memComp, setMemComp] = useState<boolean>(true);
  const [clearAtShutdown, setClearAtShutdown] = useState<boolean>(false);
  const [ratedTBW, setRatedTBW] = useState<number>(300);

  const loadStatus = async (refresh = false) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/kernel/vmem/status${refresh ? '?refresh=1' : ''}`);
      if (r.ok) {
        const d = (await r.json()) as VMemStatus;
        if (d?.ok) {
          setStatus(d);
          setSizeGB(d.config.enabled ? d.config.preset_gb : d.config.preset_gb || 0);
          setDrive(d.config.drive || d.drives[0]?.drive || 'C:');
          setFixedMinMax(d.config.fixed_min_max ?? true);
          setMemComp(d.config.memory_compression ?? true);
          setClearAtShutdown(Boolean(d.config.clear_pagefile_at_shutdown));
          setRatedTBW(d.config.ssd_rated_tbw || 300);
        }
      }
    } catch {
      /* offline */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus(false);
  }, []);

  const handleApply = async () => {
    setApplying(true);
    try {
      const r = await fetch('/api/kernel/vmem/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size_gb: sizeGB,
          drive,
          fixed_min_max: fixedMinMax,
          memory_compression: memComp,
          clear_pagefile_at_shutdown: clearAtShutdown,
          ssd_rated_tbw: ratedTBW,
        }),
      });
      const d = await r.json();
      if (d?.status?.ok) setStatus(d.status);
      if (d?.ok) {
        onPushToast('Виртуальная память (RAM Plus)', d.message || 'Настройки применены', d.requires_admin ? 'warning' : 'success');
      } else {
        onPushToast('Виртуальная память', d?.error || 'Не удалось применить настройки', 'warning');
      }
    } catch {
      onPushToast('Виртуальная память', 'Нет связи с ядром LumaCore 1.5.0', 'warning');
    } finally {
      setApplying(false);
    }
  };

  const physGB = status?.physical_ram_total_gb || 16;
  const effGB = +(physGB + (sizeGB > 0 ? sizeGB : 0)).toFixed(1);
  const selectedDrive = status?.drives.find((x) => x.drive === drive) || status?.drives[0];

  // Live preview of SSD TBW wear as user toggles switches before saving
  const liveDailyGB = (() => {
    const base = Math.max(2, sizeGB || 2) * 0.75;
    let d = base;
    if (memComp) d *= 0.42;
    if (fixedMinMax) d *= 0.82;
    if (clearAtShutdown) d += Math.max(2, sizeGB || 2) * 1.25;
    return Math.round(d * 100) / 100;
  })();
  const liveYearlyTB = Math.round(((liveDailyGB * 365) / 1024) * 1000) / 1000;
  const liveWearPct = Math.round(((liveYearlyTB / Math.max(50, ratedTBW)) * 100) * 1000) / 1000;

  return (
    <div className={`p-4 rounded-2xl border space-y-4 ${surfaceCls}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-extrabold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--luma-accent)]" />
            Виртуальная память · RAM Plus (2 / 4 / 6 ГБ с SSD/HDD)
          </div>
          <div className={`text-xs ${mutedCls}`}>
            Бережно к SSD: фиксированный pagefile (Min == Max), сжатие памяти Windows, ClearPageFileAtShutdown = 0 и расчёт TBW
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadStatus(true)}
          className={`px-2.5 py-1.5 rounded-xl border text-xs inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Physical RAM + RAM Plus Combined Bar */}
      <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-black/25 border-white/10' : 'bg-black/[0.03] border-zinc-900/10'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-mono font-bold">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>ОЗУ: {physGB} ГБ</span>
            <span className="text-[var(--luma-accent)]">+ {sizeGB > 0 ? `${sizeGB} ГБ RAM Plus` : 'Авто'}</span>
            <span>= {effGB} ГБ</span>
          </div>
          <span className="text-[11px] font-mono opacity-75">
            Текущий pagefile: {status?.current_pagefile_min_mb ?? 0}–{status?.current_pagefile_max_mb ?? 0} МБ
            {status?.is_fixed_min_max ? ' (Фикс.)' : ''}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-black/30 overflow-hidden flex">
          <div
            style={{ width: `${(physGB / Math.max(1, effGB)) * 100}%` }}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full"
          />
          {sizeGB > 0 && (
            <div
              style={{ width: `${(sizeGB / Math.max(1, effGB)) * 100}%` }}
              className="bg-gradient-to-r from-violet-500 to-emerald-400 h-full"
            />
          )}
        </div>
      </div>

      {/* Size Presets: Auto / 2 GB / 4 GB / 6 GB */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {[
          { gb: 0, title: 'Авто (ОС)', sub: 'Управляет Windows' },
          { gb: 2, title: '+2 ГБ', sub: '2048 / 2048 МБ · Эко' },
          { gb: 4, title: '+4 ГБ', sub: '4096 / 4096 МБ · Оптим.' },
          { gb: 6, title: '+6 ГБ', sub: '6144 / 6144 МБ · Макс.' },
        ].map((p) => (
          <button
            key={p.gb}
            type="button"
            onClick={() => setSizeGB(p.gb)}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              sizeGB === p.gb
                ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] ring-1 ring-[var(--luma-accent)]'
                : btnCls
            }`}
          >
            <div className="font-extrabold text-sm">{p.title}</div>
            <div className={`text-[10px] font-mono mt-0.5 ${mutedCls}`}>{p.sub}</div>
          </button>
        ))}
      </div>

      {/* Drive Selection & SSD-Friendly Protection Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1.5">
          <label className={`text-[11px] font-mono uppercase ${mutedCls}`}>Диск для RAM Plus</label>
          <select
            value={drive}
            onChange={(e) => setDrive(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border font-mono outline-none ${btnCls}`}
          >
            {(status?.drives || [{ drive: 'C:', label: 'System', free_gb: 64, total_gb: 256, media_type: 'NVMe SSD', is_ssd: true }]).map((d) => (
              <option key={d.drive} value={d.drive}>
                {d.drive} ({d.media_type} · свободно {d.free_gb} / {d.total_gb} ГБ)
              </option>
            ))}
          </select>
          {selectedDrive && (
            <div className={`text-[10px] flex items-center gap-1.5 ${mutedCls}`}>
              <HardDrive className="w-3 h-3 text-cyan-400" />
              Тип накопителя: <strong>{selectedDrive.media_type}</strong>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className={`text-[11px] font-mono uppercase ${mutedCls}`}>Ресурс SSD (TBW) для расчёта износа</label>
          <div className="flex gap-1.5">
            {[150, 300, 600, 1200].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRatedTBW(v)}
                className={`flex-1 py-2 rounded-xl border font-mono font-bold cursor-pointer ${
                  ratedTBW === v ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 SSD Care Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <button
          type="button"
          onClick={() => setFixedMinMax((v) => !v)}
          className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
            fixedMinMax ? 'border-emerald-500/50 bg-emerald-500/10' : btnCls
          }`}
        >
          <div className="font-bold flex items-center justify-between">
            <span>Min == Max</span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${fixedMinMax ? 'text-emerald-400' : 'opacity-30'}`} />
          </div>
          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>Фиксированный файл без фрагментации SSD</div>
        </button>

        <button
          type="button"
          onClick={() => setMemComp((v) => !v)}
          className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
            memComp ? 'border-emerald-500/50 bg-emerald-500/10' : btnCls
          }`}
        >
          <div className="font-bold flex items-center justify-between">
            <span>Сжатие памяти</span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${memComp ? 'text-emerald-400' : 'opacity-30'}`} />
          </div>
          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>Windows Memory Compression (-58% записей)</div>
        </button>

        <button
          type="button"
          onClick={() => setClearAtShutdown((v) => !v)}
          className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
            !clearAtShutdown ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-amber-500/50 bg-amber-500/10'
          }`}
        >
          <div className="font-bold flex items-center justify-between">
            <span>ClearPageFile = {clearAtShutdown ? '1' : '0'}</span>
            {!clearAtShutdown ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>
            {!clearAtShutdown ? 'Не перезаписывает SSD при выключении' : 'Осторожно: лишний износ SSD!'}
          </div>
        </button>
      </div>

      {/* Live TBW Wear Calculator Summary */}
      <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${isDark ? 'bg-cyan-500/8 border-cyan-400/20' : 'bg-sky-50 border-sky-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-cyan-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Оценка износа SSD ({ratedTBW} TBW):
          </span>
          <span className="font-mono font-bold text-emerald-400">
            ~{liveDailyGB} ГБ/день · {liveYearlyTB} ТБ/год ({liveWearPct}%/год)
          </span>
        </div>
        <div className={`text-[11px] ${mutedCls}`}>
          {status?.tbw?.recommendation ||
            `При таком профиле ресурс ${ratedTBW} TBW расходуется всего на ${liveWearPct}% в год — максимально безопасно для NVMe/SATA SSD.`}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!status?.is_admin && (
          <button
            type="button"
            onClick={onElevateAdmin}
            className="px-3 py-2 rounded-xl border border-amber-400/40 bg-amber-500/15 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Перезапустить от Администратора (UAC)
          </button>
        )}
        <button
          type="button"
          disabled={applying}
          onClick={() => void handleApply()}
          className="ml-auto px-4 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {applying ? 'Применение...' : `Применить RAM Plus (${sizeGB > 0 ? `+${sizeGB} ГБ` : 'Авто'})`}
        </button>
      </div>
    </div>
  );
};
