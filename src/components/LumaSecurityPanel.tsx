import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ScanSearch,
  FolderSearch,
  Trash2,
  RotateCcw,
  Bug,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Activity,
  RefreshCw,
} from 'lucide-react';

export interface SecurityThreatItem {
  id: string;
  path: string;
  name: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  reason: string;
  sha256: string;
  size: number;
  detected_at: string;
}

export interface QuarantineEntry {
  id: string;
  original_path: string;
  original_name: string;
  reason: string;
  severity: string;
  sha256: string;
  quarantined_at: string;
  size: number;
}

export interface SecurityAuditEntry {
  id: string;
  time: string;
  level: string;
  category: string;
  action: string;
  detail: string;
}

export interface SecurityStatusData {
  security_core_version: string;
  engine_name: string;
  score: number;
  defender: {
    available: boolean;
    realtime_enabled: boolean;
    antivirus_enabled: boolean;
    signature_version: string;
    compatible_note: string;
    conflict_free: boolean;
  };
  last_scan_time: string;
  last_scan_files: number;
  last_scan_ms: number;
  scan_count: number;
  threats: SecurityThreatItem[];
  quarantine: QuarantineEntry[];
  quarantine_dir: string;
  audit_log: SecurityAuditEntry[];
  crypto: string;
}

interface LumaSecurityPanelProps {
  isDark: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  onPushToast: (title: string, message: string, level?: 'info' | 'success' | 'warning') => void;
  onOpenWindowsDefender?: () => void;
}

export const LumaSecurityPanel: React.FC<LumaSecurityPanelProps> = ({
  isDark,
  surfaceCls,
  btnCls,
  mutedCls,
  onPushToast,
  onOpenWindowsDefender,
}) => {
  const [status, setStatus] = useState<SecurityStatusData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanLabel, setScanLabel] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [subTab, setSubTab] = useState<'scanner' | 'quarantine' | 'audit'>('scanner');

  const fetchStatus = async () => {
    try {
      const r = await fetch('/api/kernel/security/status');
      if (r.ok) {
        const d = await r.json();
        if (d?.ok) setStatus(d);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, []);

  const runScan = async (mode: 'quick' | 'startup' | 'custom', path = '') => {
    setScanning(true);
    setScanLabel(
      mode === 'quick'
        ? 'Быстрая проверка (Загрузки, Рабочий стол, Автозагрузка)...'
        : mode === 'startup'
        ? 'Аудит автозагрузки и скриптов...'
        : `Проверка: ${path || '~'}...`
    );
    try {
      const r = await fetch('/api/kernel/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, path }),
      });
      const d = await r.json();
      await fetchStatus();
      const count = d?.threats?.length ?? 0;
      onPushToast(
        'LumaShield 1.1',
        count > 0
          ? `Обнаружено угроз: ${count} (проверено ${d.files_scanned} файлов за ${d.elapsed_ms} мс)`
          : `Угроз не найдено · Проверено ${d.files_scanned} файлов за ${d.elapsed_ms} мс`,
        count > 0 ? 'warning' : 'success'
      );
    } catch {
      onPushToast('LumaShield 1.1', 'Не удалось выполнить сканирование', 'warning');
    } finally {
      setScanning(false);
      setScanLabel('');
    }
  };

  const runEicarTest = async () => {
    setScanning(true);
    setScanLabel('Создание и проверка безопасного тестового файла EICAR...');
    try {
      const r = await fetch('/api/kernel/security/eicar-test', { method: 'POST' });
      const d = await r.json();
      await fetchStatus();
      onPushToast(
        'LumaShield EICAR-Тест',
        `Тестовый файл обнаружен (${d?.threats?.length || 1})! Теперь можно изолировать его в карантин.`,
        'warning'
      );
    } catch {
      onPushToast('LumaShield', 'Ошибка EICAR-теста', 'warning');
    } finally {
      setScanning(false);
      setScanLabel('');
    }
  };

  const quarantineThreat = async (t: SecurityThreatItem) => {
    try {
      const r = await fetch('/api/kernel/security/quarantine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quarantine',
          path: t.path,
          reason: t.reason,
          severity: t.severity,
        }),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast('Карантин LumaShield', `Файл «${t.name}» изолирован`, 'success');
        await fetchStatus();
      } else {
        onPushToast('Карантин', d?.error || 'Не удалось изолировать файл', 'warning');
      }
    } catch {
      onPushToast('Карантин', 'Ошибка связи с ядром безопасности', 'warning');
    }
  };

  const manageQuarantine = async (id: string, action: 'restore' | 'delete') => {
    try {
      const r = await fetch('/api/kernel/security/quarantine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast(
          'Карантин LumaShield',
          action === 'restore' ? 'Файл восстановлен в исходную папку' : 'Файл удалён навсегда',
          'success'
        );
        await fetchStatus();
      }
    } catch {
      // ignore
    }
  };

  const pickAndScanFolder = async () => {
    try {
      const r = await fetch('/api/kernel/pick-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'folder' }),
      });
      const d = await r.json();
      if (d?.picked && d?.path) {
        setCustomPath(d.path);
        await runScan('custom', d.path);
      }
    } catch {
      // ignore
    }
  };

  const score = status?.score ?? 98;
  const threats = status?.threats ?? [];
  const quarantine = status?.quarantine ?? [];
  const audit = status?.audit_log ?? [];

  return (
    <div className="space-y-4">
      {/* Top Security Score & Zero-Conflict Windows Defender Harmony Card */}
      <div className={`p-4 rounded-2xl border space-y-3.5 ${surfaceCls}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-mono font-black border ${
                threats.length > 0
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              }`}
            >
              <span className="text-lg leading-none">{score}</span>
              <span className="text-[9px] uppercase opacity-75">/100</span>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--luma-accent)] font-bold">
                ЯДРО БЕЗОПАСНОСТИ · LUMASHIELD {status?.security_core_version || '1.1'}
              </div>
              <div className="text-base font-extrabold flex items-center gap-2">
                {threats.length > 0 ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    Обнаружено угроз: {threats.length}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Система защищена
                  </>
                )}
              </div>
              <div className={`text-[11px] font-mono ${mutedCls}`}>
                {status?.crypto || 'AES-256-GCM + PBKDF2-HMAC-SHA512 + Loopback IPC'}
              </div>
            </div>
          </div>

          <button
            onClick={() => void fetchStatus()}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Обновить
          </button>
        </div>

        {/* Zero-Conflict Windows Defender Coexistence Banner */}
        <div
          className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
            isDark
              ? 'bg-emerald-500/[0.08] border-emerald-500/25 text-emerald-200'
              : 'bg-emerald-500/[0.1] border-emerald-600/25 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold">Без конфликтов с Windows Defender</div>
              <div className="text-[11px] opacity-85">
                {status?.defender?.available
                  ? `Windows Defender активен (реальное время: ${status.defender.realtime_enabled ? 'ВКЛ' : 'ВЫКЛ'} · базы ${status.defender.signature_version}). LumaShield работает поверх как лёгкий user-space сканер по запросу.`
                  : 'LumaShield 1.1 не ставит драйверы ядра и не отключает Windows Defender — оба антивируса работают в полной гармонии.'}
              </div>
            </div>
          </div>
          {onOpenWindowsDefender && (
            <button
              onClick={onOpenWindowsDefender}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer shrink-0"
            >
              Windows Defender
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {[
          { id: 'scanner' as const, label: 'Локальный антивирус', badge: threats.length || undefined },
          { id: 'quarantine' as const, label: 'Карантин', badge: quarantine.length || undefined },
          { id: 'audit' as const, label: 'Аудит ядра', badge: audit.length || undefined },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 rounded-xl border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              subTab === t.id ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
            }`}
          >
            <span>{t.label}</span>
            {t.badge !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-mono">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: ANTIVIRUS SCANNER */}
      {subTab === 'scanner' && (
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                disabled={scanning}
                onClick={() => void runScan('quick')}
                className="p-3 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ScanSearch className="w-4 h-4" />
                Быстрая проверка
              </button>
              <button
                disabled={scanning}
                onClick={() => void runScan('startup')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${btnCls}`}
              >
                <Shield className="w-4 h-4 text-[var(--luma-accent)]" />
                Проверка автозагрузки
              </button>
              <button
                disabled={scanning}
                onClick={() => void runEicarTest()}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${btnCls}`}
                title="Создаёт безопасный стандартный тестовый файл EICAR и проверяет его обнаружение"
              >
                <Bug className="w-4 h-4 text-amber-500" />
                EICAR-тест защиты
              </button>
            </div>

            {/* Custom Path Scanner */}
            <div className="flex flex-wrap gap-2">
              <input
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="Путь к папке или файлу для проверки (например: C:\Users\...\Downloads)"
                className={`flex-1 min-w-[200px] px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
              />
              <button
                disabled={scanning}
                onClick={() => void pickAndScanFolder()}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
              >
                <FolderSearch className="w-3.5 h-3.5" />
                Обзор
              </button>
              <button
                disabled={scanning || !customPath.trim()}
                onClick={() => void runScan('custom', customPath.trim())}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer disabled:opacity-40 ${btnCls}`}
              >
                Сканировать
              </button>
            </div>

            {scanning && (
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-mono text-[var(--luma-accent)]">{scanLabel}</div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-2/3 bg-[var(--luma-accent)] rounded-full animate-pulse" />
                </div>
              </div>
            )}

            {status?.last_scan_time && !scanning && (
              <div className={`text-[11px] font-mono flex flex-wrap gap-3 ${mutedCls}`}>
                <span>Последняя проверка: {status.last_scan_time}</span>
                <span>Файлов: {status.last_scan_files}</span>
                <span>Время: {status.last_scan_ms} мс</span>
              </div>
            )}
          </div>

          {/* Detected Threats List */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
            <div className="text-xs font-bold flex items-center justify-between">
              <span>Обнаруженные угрозы ({threats.length})</span>
              <span className={`text-[10px] font-mono ${mutedCls}`}>Эвристика + Двойные расширения + EICAR + SHA-256</span>
            </div>
            {threats.length === 0 ? (
              <div className={`py-6 text-center text-xs ${mutedCls}`}>
                Угрозы не обнаружены. Нажмите «Быстрая проверка» или «EICAR-тест защиты» для проверки работы движка.
              </div>
            ) : (
              <div className="space-y-2">
                {threats.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                      isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-500/10 border-rose-600/30'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{t.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-mono uppercase">
                          {t.category}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-85">{t.reason}</div>
                      <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{t.path}</div>
                      {t.sha256 && (
                        <div className={`text-[10px] font-mono truncate ${mutedCls}`}>SHA-256: {t.sha256.slice(0, 32)}...</div>
                      )}
                    </div>
                    <button
                      onClick={() => void quarantineThreat(t)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      В карантин
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ISOLATED QUARANTINE */}
      {subTab === 'quarantine' && (
        <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">Изолированный карантин ({quarantine.length})</span>
            <span className={`text-[10px] font-mono truncate max-w-[260px] ${mutedCls}`}>{status?.quarantine_dir}</span>
          </div>
          {quarantine.length === 0 ? (
            <div className={`py-6 text-center text-xs ${mutedCls}`}>Карантин пуст.</div>
          ) : (
            <div className="space-y-2">
              {quarantine.map((q) => (
                <div key={q.id} className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${btnCls}`}>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{q.original_name}</div>
                    <div className={`text-[11px] truncate ${mutedCls}`}>{q.reason}</div>
                    <div className={`text-[10px] font-mono truncate ${mutedCls}`}>
                      {q.original_path} · {q.quarantined_at}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => void manageQuarantine(q.id, 'restore')}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Восстановить
                    </button>
                    <button
                      onClick={() => void manageQuarantine(q.id, 'delete')}
                      className="px-2.5 py-1 rounded-lg bg-rose-600/85 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECURITY KERNEL AUDIT LOG */}
      {subTab === 'audit' && (
        <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Журнал ядра безопасности LumaShield 1.1
            </span>
            <span className={`text-[10px] font-mono ${mutedCls}`}>{audit.length} событий</span>
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {audit.map((ev) => (
              <div key={ev.id} className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${btnCls}`}>
                <span className="font-mono text-[10px] opacity-65 shrink-0 pt-0.5">{ev.time}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold shrink-0 ${
                    ev.level === 'danger'
                      ? 'bg-rose-500/20 text-rose-400'
                      : ev.level === 'warn'
                      ? 'bg-amber-500/20 text-amber-400'
                      : ev.level === 'ok'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-sky-500/20 text-sky-400'
                  }`}
                >
                  {ev.category}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{ev.action}</div>
                  <div className={`text-[11px] break-words ${mutedCls}`}>{ev.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
