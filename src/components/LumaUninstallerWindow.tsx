import React, { useEffect, useMemo, useState } from 'react';
import {
  Trash2, Search, RefreshCw, ShieldCheck, FolderSearch, RotateCcw,
  ExternalLink, CheckSquare, Square, AlertTriangle, HardDrive, Layers,
  FileCode2, Server, CheckCircle2, ArchiveRestore, Sparkles,
} from 'lucide-react';

export interface UninstallProgramItem {
  id: string;
  name: string;
  publisher: string;
  version: string;
  install_date: string;
  install_location: string;
  uninstall_string: string;
  quiet_uninstall_string?: string;
  size_mb: number;
  registry_key?: string;
  source: string;
}

export interface LeftoverItem {
  id: string;
  stage: number;
  stage_name: string;
  kind: 'dir' | 'file' | 'registry' | 'service' | 'task' | string;
  path: string;
  size_bytes: number;
  risk: 'safe' | 'caution' | string;
  selected_default: boolean;
  reason: string;
}

export interface LeftoverStageSummary {
  stage: number;
  title: string;
  count: number;
  size_bytes: number;
  duration_ms: number;
}

export interface LeftoverScanReport {
  ok: boolean;
  program_name: string;
  publisher: string;
  mode: string;
  stages: LeftoverStageSummary[];
  items: LeftoverItem[];
  total_count: number;
  total_size_bytes: number;
  scanned_at: string;
}

export interface UninstallerBackupManifest {
  id: string;
  program_name: string;
  created_at: string;
  backup_dir: string;
  items_count: number;
  freed_bytes: number;
  reg_export?: string;
  restored?: boolean;
}

interface LumaUninstallerWindowProps {
  kernelBase: string;
  isDarkTheme: boolean;
  onNotify?: (title: string, message: string) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 Б';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${bytes} Б`;
}

export const LumaUninstallerWindow: React.FC<LumaUninstallerWindowProps> = ({
  kernelBase, isDarkTheme, onNotify,
}) => {
  const [tab, setTab] = useState<'programs' | 'scanner' | 'backups'>('programs');
  const [programs, setPrograms] = useState<UninstallProgramItem[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'publisher'>('name');
  const [selectedProgram, setSelectedProgram] = useState<UninstallProgramItem | null>(null);
  const [customTargetName, setCustomTargetName] = useState('');

  // 4-stage scanner state
  const [scanMode, setScanMode] = useState<'moderate' | 'deep'>('deep');
  const [scanning, setScanning] = useState(false);
  const [scanReport, setScanReport] = useState<LeftoverScanReport | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [autoBackup, setAutoBackup] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ deleted: number; freed: number; backupId?: string; message?: string } | null>(null);

  // Backups tab state
  const [backups, setBackups] = useState<UninstallerBackupManifest[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [statusBanner, setStatusBanner] = useState('');

  const loadPrograms = async () => {
    setLoadingPrograms(true);
    try {
      const r = await fetch(`${kernelBase}/api/kernel/uninstaller/programs`);
      if (r.ok) {
        const d = await r.json();
        setPrograms(Array.isArray(d.programs) ? d.programs : []);
      }
    } catch { /* ignore */ }
    finally { setLoadingPrograms(false); }
  };

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const r = await fetch(`${kernelBase}/api/kernel/uninstaller/backups`);
      if (r.ok) {
        const d = await r.json();
        setBackups(Array.isArray(d.backups) ? d.backups : []);
      }
    } catch { /* ignore */ }
    finally { setLoadingBackups(false); }
  };

  useEffect(() => {
    loadPrograms();
    loadBackups();
  }, [kernelBase]);

  const filteredPrograms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? programs.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          (p.publisher || '').toLowerCase().includes(q) ||
          (p.install_location || '').toLowerCase().includes(q)
        )
      : programs.slice();
    list.sort((a, b) => {
      if (sortBy === 'size') return (b.size_mb || 0) - (a.size_mb || 0);
      if (sortBy === 'publisher') return (a.publisher || '').localeCompare(b.publisher || '');
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [programs, searchQuery, sortBy]);

  const handleLaunchUninstaller = async (prog: UninstallProgramItem, quiet = false) => {
    setStatusBanner(`Запуск штатного деинсталлятора «${prog.name}»…`);
    try {
      const r = await fetch(`${kernelBase}/api/kernel/uninstaller/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uninstall_string: prog.uninstall_string,
          quiet_uninstall_string: prog.quiet_uninstall_string || '',
          quiet,
        }),
      });
      const d = await r.json();
      setStatusBanner(d.message || (d.ok ? 'Деинсталлятор запущен. После завершения нажмите «Сканировать хвосты».' : d.error || 'Не удалось запустить деинсталлятор'));
      onNotify?.('Luma Uninstaller', d.message || `Запущен деинсталлятор «${prog.name}»`);
    } catch (err) {
      setStatusBanner(`Ошибка запуска деинсталлятора: ${String(err)}`);
    }
  };

  const handleScanLeftovers = async (target?: UninstallProgramItem | null) => {
    const prog = target || selectedProgram;
    const name = prog?.name || customTargetName.trim();
    if (!name) {
      setStatusBanner('Выберите программу из списка или введите название удалённой программы для поиска хвостов.');
      return;
    }
    setTab('scanner');
    setScanning(true);
    setCleanResult(null);
    setStatusBanner(`4-этапное сканирование хвостов «${name}»…`);
    try {
      const r = await fetch(`${kernelBase}/api/kernel/uninstaller/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          publisher: prog?.publisher || '',
          install_location: prog?.install_location || '',
          mode: scanMode,
        }),
      });
      if (r.ok) {
        const rep: LeftoverScanReport = await r.json();
        setScanReport(rep);
        const defIds = new Set<string>();
        (rep.items || []).forEach((it) => {
          if (it.selected_default) defIds.add(it.id);
        });
        setCheckedIds(defIds);
        setStatusBanner(`Найдено ${rep.total_count} остатков (${formatBytes(rep.total_size_bytes)}) за 4 этапа.`);
      }
    } catch (err) {
      setStatusBanner(`Ошибка сканирования: ${String(err)}`);
    } finally {
      setScanning(false);
    }
  };

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItems = useMemo(() => {
    if (!scanReport) return [];
    return (scanReport.items || []).filter((it) => checkedIds.has(it.id));
  }, [scanReport, checkedIds]);

  const selectedBytes = useMemo(
    () => selectedItems.reduce((acc, it) => acc + (it.size_bytes || 0), 0),
    [selectedItems]
  );

  const handleCleanSelected = async () => {
    if (!scanReport || selectedItems.length === 0) return;
    setCleaning(true);
    try {
      const r = await fetch(`${kernelBase}/api/kernel/uninstaller/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_name: scanReport.program_name,
          auto_backup: autoBackup,
          items: selectedItems,
        }),
      });
      const d = await r.json();
      setCleanResult({
        deleted: d.deleted_count ?? 0,
        freed: d.freed_bytes ?? 0,
        backupId: d.backup_id,
        message: d.message,
      });
      setStatusBanner(d.message || `Удалено ${d.deleted_count} хвостов, освобождено ${formatBytes(d.freed_bytes || 0)}.`);
      onNotify?.('Очистка хвостов завершена', `Удалено объектов: ${d.deleted_count ?? 0} (${formatBytes(d.freed_bytes || 0)})`);
      // Remove cleaned items from report view
      setScanReport((prev) => prev ? {
        ...prev,
        items: prev.items.filter((it) => !checkedIds.has(it.id)),
      } : null);
      setCheckedIds(new Set());
      loadBackups();
    } catch (err) {
      setStatusBanner(`Ошибка очистки: ${String(err)}`);
    } finally {
      setCleaning(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    try {
      const r = await fetch(`${kernelBase}/api/kernel/uninstaller/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_id: backupId }),
      });
      const d = await r.json();
      setStatusBanner(d.message || (d.ok ? `Бэкап ${backupId} восстановлен.` : d.error || 'Ошибка восстановления'));
      onNotify?.('Восстановление бэкапа', d.message || `Восстановлено объектов: ${d.restored_count ?? 0}`);
      loadBackups();
    } catch (err) {
      setStatusBanner(`Ошибка восстановления: ${String(err)}`);
    }
  };

  const cardBg = isDarkTheme ? 'bg-slate-900/75 border-white/10' : 'bg-white border-slate-200';
  const muted = isDarkTheme ? 'text-slate-400' : 'text-slate-500';

  const kindBadge = (kind: string) => {
    switch (kind) {
      case 'registry': return { label: 'Реестр', cls: 'bg-violet-500/15 text-violet-400 border-violet-400/30', icon: FileCode2 };
      case 'service': return { label: 'Служба', cls: 'bg-amber-500/15 text-amber-400 border-amber-400/30', icon: Server };
      case 'task': return { label: 'Задача', cls: 'bg-amber-500/15 text-amber-400 border-amber-400/30', icon: Layers };
      case 'dir': return { label: 'Папка', cls: 'bg-sky-500/15 text-sky-400 border-sky-400/30', icon: HardDrive };
      default: return { label: 'Файл', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30', icon: HardDrive };
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDarkTheme ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Header */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${isDarkTheme ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight">Luma Uninstaller & Очистка хвостов</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-400/30">
                4-этапный сканер · Автобэкап
              </span>
            </div>
            <div className={`text-[11px] ${muted}`}>
              Аналог Revo / BCUninstaller: AppData · ProgramData · Program Files · Реестр HKCU/HKLM · Службы и Задачи
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: 'programs', label: `Программы (${programs.length})` },
            { id: 'scanner', label: `Сканер хвостов${scanReport ? ` (${scanReport.items.length})` : ''}` },
            { id: 'backups', label: `Бэкапы (${backups.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                tab === t.id
                  ? 'bg-rose-500 text-white shadow-sm'
                  : isDarkTheme ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {statusBanner && (
        <div className={`px-4 py-1.5 text-[11px] border-b flex items-center justify-between ${isDarkTheme ? 'bg-sky-500/10 border-sky-400/20 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-800'}`}>
          <span className="truncate">{statusBanner}</span>
          <button onClick={() => setStatusBanner('')} className="text-[10px] opacity-70 hover:opacity-100 ml-2">Скрыть</button>
        </div>
      )}

      {/* TAB 1: INSTALLED PROGRAMS */}
      {tab === 'programs' && (
        <div className="flex-1 min-h-0 flex flex-col p-4 gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex-1 min-w-[200px] flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}>
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск программы, издателя или пути…"
                className="w-full bg-transparent outline-none text-xs"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}
            >
              <option value="name">По имени (A–Z)</option>
              <option value="size">По размеру (МБ)</option>
              <option value="publisher">По издателю</option>
            </select>

            <button
              onClick={loadPrograms}
              disabled={loadingPrograms}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${isDarkTheme ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-300 hover:bg-slate-100'}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPrograms ? 'animate-spin' : ''}`} /> Обновить
            </button>
          </div>

          {/* Direct hunt box for already-uninstalled apps */}
          <div className={`p-2.5 rounded-xl border flex flex-wrap items-center gap-2 ${cardBg}`}>
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold">Охота за хвостами уже удалённой программы:</span>
            <input
              value={customTargetName}
              onChange={(e) => setCustomTargetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && customTargetName.trim()) handleScanLeftovers(null); }}
              placeholder="Например: Discord, Adobe, Steam, AnyDesk…"
              className={`flex-1 min-w-[160px] px-2.5 py-1 rounded-lg border text-xs ${isDarkTheme ? 'bg-slate-950 border-white/10' : 'bg-slate-50 border-slate-300'}`}
            />
            <button
              onClick={() => handleScanLeftovers(null)}
              disabled={!customTargetName.trim()}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black disabled:opacity-40"
            >
              Найти хвосты
            </button>
          </div>

          {/* Programs Table */}
          <div className={`flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col ${cardBg}`}>
            <div className={`grid grid-cols-12 px-3 py-2 text-[10px] font-black uppercase tracking-wider border-b ${isDarkTheme ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
              <div className="col-span-5">Программа</div>
              <div className="col-span-3">Издатель</div>
              <div className="col-span-2">Версия</div>
              <div className="col-span-2 text-right">Размер</div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {loadingPrograms ? (
                <div className="p-8 text-center text-xs text-slate-400">Чтение списка установленных программ…</div>
              ) : filteredPrograms.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Ничего не найдено по запросу «{searchQuery}»</div>
              ) : (
                filteredPrograms.map((prog) => {
                  const sel = selectedProgram?.id === prog.id;
                  return (
                    <div
                      key={prog.id}
                      onClick={() => setSelectedProgram(prog)}
                      className={`grid grid-cols-12 items-center px-3 py-2 text-xs cursor-pointer transition-colors ${
                        sel
                          ? 'bg-rose-500/15 text-rose-200'
                          : isDarkTheme ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="col-span-5 pr-2 min-w-0">
                        <div className="font-bold truncate">{prog.name}</div>
                        {prog.install_location && (
                          <div className={`text-[10px] truncate ${muted}`}>{prog.install_location}</div>
                        )}
                      </div>
                      <div className={`col-span-3 truncate pr-2 ${muted}`}>{prog.publisher || '—'}</div>
                      <div className={`col-span-2 truncate font-mono text-[11px] ${muted}`}>{prog.version || '—'}</div>
                      <div className="col-span-2 text-right font-mono text-[11px] font-semibold">
                        {prog.size_mb > 0 ? `${prog.size_mb.toFixed(1)} МБ` : '—'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Action Bar for Selected Program */}
          <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${cardBg}`}>
            <div className="min-w-0">
              {selectedProgram ? (
                <>
                  <div className="text-xs font-black truncate">{selectedProgram.name}</div>
                  <div className={`text-[10px] truncate ${muted}`}>
                    {selectedProgram.publisher || 'Неизвестный издатель'} · Источник: {selectedProgram.source}
                  </div>
                </>
              ) : (
                <div className={`text-xs ${muted}`}>Выберите программу выше для деинсталляции и поиска остатков</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={!selectedProgram || !selectedProgram.uninstall_string}
                onClick={() => selectedProgram && handleLaunchUninstaller(selectedProgram, false)}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Запустить деинсталлятор
              </button>
              <button
                disabled={!selectedProgram}
                onClick={() => selectedProgram && handleScanLeftovers(selectedProgram)}
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
              >
                <FolderSearch className="w-3.5 h-3.5" /> Сканировать хвосты (4 этапа)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 4-STAGE LEFTOVER SCANNER & SAFE CLEANUP */}
      {tab === 'scanner' && (
        <div className="flex-1 min-h-0 flex flex-col p-4 gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black">
                {scanReport ? `Остатки программы «${scanReport.program_name}»` : '4-этапный сканер остатков'}
              </h3>
              <p className={`text-[11px] ${muted}`}>
                Системные каталоги Windows/Linux и папки Luma OS автоматически защищены белым списком.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={scanMode}
                onChange={(e) => setScanMode(e.target.value as 'moderate' | 'deep')}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}
              >
                <option value="moderate">Умеренный режим</option>
                <option value="deep">Глубокий режим (4 этапа)</option>
              </select>
              <button
                onClick={() => handleScanLeftovers()}
                disabled={scanning}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <FolderSearch className={`w-3.5 h-3.5 ${scanning ? 'animate-pulse' : ''}`} />
                {scanning ? 'Сканирую 4 этапа…' : 'Пересканировать'}
              </button>
            </div>
          </div>

          {/* 4-Stage Progress / Summary Cards */}
          {scanReport && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {(scanReport.stages || []).map((st) => (
                <div key={st.stage} className={`p-2.5 rounded-xl border ${cardBg}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-sky-400">Этап {st.stage}</span>
                    <span className={`text-[10px] font-mono ${muted}`}>{st.duration_ms} мс</span>
                  </div>
                  <div className="text-[11px] font-bold truncate mt-0.5">{st.title}</div>
                  <div className="text-xs font-black mt-1">
                    {st.count} шт · <span className="text-amber-400">{formatBytes(st.size_bytes)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cleanResult && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Удалено <b>{cleanResult.deleted}</b> объектов, освобождено <b>{formatBytes(cleanResult.freed)}</b>.
                  {cleanResult.backupId ? ` Автобэкап сохранён: ${cleanResult.backupId}` : ''}
                </span>
              </div>
              {cleanResult.backupId && (
                <button
                  onClick={() => setTab('backups')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 font-bold text-[11px]"
                >
                  К бэкапам
                </button>
              )}
            </div>
          )}

          {/* Selection Controls */}
          {scanReport && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCheckedIds(new Set((scanReport.items || []).map((i) => i.id)))}
                  className={`px-2.5 py-1 rounded-lg border font-semibold ${isDarkTheme ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-300'}`}
                >
                  Выбрать все
                </button>
                <button
                  onClick={() => setCheckedIds(new Set((scanReport.items || []).filter((i) => i.risk === 'safe').map((i) => i.id)))}
                  className={`px-2.5 py-1 rounded-lg border font-semibold ${isDarkTheme ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700'}`}
                >
                  Только безопасные
                </button>
                <button
                  onClick={() => setCheckedIds(new Set())}
                  className={`px-2.5 py-1 rounded-lg border font-semibold ${isDarkTheme ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-300'}`}
                >
                  Снять всё
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4"
                />
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Автобэкап перед удалением (файлы + .reg)</span>
              </label>
            </div>
          )}

          {/* Leftover Items Checklist */}
          <div className={`flex-1 min-h-0 rounded-2xl border overflow-y-auto divide-y divide-white/5 ${cardBg}`}>
            {!scanReport ? (
              <div className="p-10 text-center text-xs text-slate-400">
                Выберите программу на вкладке «Программы» и нажмите «Сканировать хвосты».
              </div>
            ) : scanReport.items.length === 0 ? (
              <div className="p-10 text-center text-xs text-emerald-400 font-semibold">
                Хвостов не осталось — система полностью чиста!
              </div>
            ) : (
              scanReport.items.map((it) => {
                const checked = checkedIds.has(it.id);
                const badge = kindBadge(it.kind);
                return (
                  <div
                    key={it.id}
                    onClick={() => toggleItem(it.id)}
                    className={`px-3 py-2.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      checked ? 'bg-rose-500/[0.08]' : isDarkTheme ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="pt-0.5 text-rose-400 shrink-0">
                      {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${badge.cls}`}>
                          Этап {it.stage} · {badge.label}
                        </span>
                        {it.risk === 'caution' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-400/30 text-[10px] font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Осторожно
                          </span>
                        )}
                        <span className="text-xs font-mono font-semibold truncate">{it.path}</span>
                      </div>
                      <div className={`text-[11px] mt-0.5 ${muted}`}>{it.reason}</div>
                    </div>
                    <div className="text-xs font-mono font-bold shrink-0 text-right">
                      {it.size_bytes > 0 ? formatBytes(it.size_bytes) : 'Ключ'}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Safe Delete Footer */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${cardBg}`}>
            <div className="text-xs">
              Выбрано для очистки: <b className="text-rose-400">{selectedItems.length}</b> шт ·{' '}
              <b className="text-amber-400">{formatBytes(selectedBytes)}</b>
            </div>
            <button
              disabled={cleaning || selectedItems.length === 0}
              onClick={handleCleanSelected}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:brightness-110 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-500/25 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
              {cleaning ? 'Безопасная очистка…' : `Очистить выбранное (${selectedItems.length})`}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: AUTO-BACKUPS & RESTORE */}
      {tab === 'backups' && (
        <div className="flex-1 min-h-0 flex flex-col p-4 gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black flex items-center gap-2">
                <ArchiveRestore className="w-4 h-4 text-emerald-400" /> Автобэкапы очистки и восстановление
              </h3>
              <p className={`text-[11px] ${muted}`}>
                Перед каждым удалением хвостов Luma OS создаёт резервную копию файлов и экспортирует ветки реестра в `.reg`.
              </p>
            </div>
            <button
              onClick={loadBackups}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-white border-slate-300'}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} /> Обновить
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto space-y-2`}>
            {backups.length === 0 ? (
              <div className={`p-10 rounded-2xl border text-center text-xs ${cardBg} ${muted}`}>
                Резервных копий пока нет — они создаются автоматически при очистке хвостов.
              </div>
            ) : (
              backups.map((b) => (
                <div key={b.id} className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${cardBg}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black">{b.program_name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">{b.id}</span>
                      {b.restored && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                          Восстановлен
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${muted}`}>
                      {b.created_at} · Объектов: {b.items_count} · Объём: {formatBytes(b.freed_bytes)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreBackup(b.id)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Восстановить
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
