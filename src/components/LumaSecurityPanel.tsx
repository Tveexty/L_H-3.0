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
  Cpu,
  Plus,
  ShieldOff,
  Sparkles,
  Network,
  ListChecks,
  Globe,
} from 'lucide-react';
import { ActiveTcpConnectionInfo, StartupAuditFindingInfo } from '../data/launcherData';

interface HostsAuditEntry {
  ip: string;
  host: string;
  line: number;
  suspicious: boolean;
  reason?: string;
}

interface HostsAuditResult {
  ok: boolean;
  path: string;
  total_mappings: number;
  suspicious_count: number;
  checked_at?: string;
  entries: HostsAuditEntry[];
}

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
  rules_count?: number;
  realtime_guard_enabled?: boolean;
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
  exclusions?: string[];
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
  const [newExclusion, setNewExclusion] = useState('');
  const [subTab, setSubTab] = useState<'scanner' | 'network' | 'startup_audit' | 'hosts_audit' | 'quarantine' | 'exclusions' | 'audit'>('scanner');

  // LumaShield 1.5 Network Monitor, Startup Auditor & Hosts File DNS Integrity Auditor state
  const [tcpConns, setTcpConns] = useState<ActiveTcpConnectionInfo[]>([]);
  const [tcpLoading, setTcpLoading] = useState(false);
  const [tcpOnlySusp, setTcpOnlySusp] = useState(false);
  const [startupFindings, setStartupFindings] = useState<StartupAuditFindingInfo[]>([]);
  const [startupLoading, setStartupLoading] = useState(false);
  const [hostsAudit, setHostsAudit] = useState<HostsAuditResult | null>(null);
  const [hostsLoading, setHostsLoading] = useState(false);

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

  const fetchNetworkMonitor = async () => {
    setTcpLoading(true);
    try {
      const r = await fetch('/api/kernel/security/network');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.connections)) setTcpConns(d.connections);
      }
    } catch {
      // ignore
    } finally {
      setTcpLoading(false);
    }
  };

  const fetchStartupAudit = async () => {
    setStartupLoading(true);
    try {
      const r = await fetch('/api/kernel/security/startup-audit');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.findings)) setStartupFindings(d.findings);
      }
    } catch {
      // ignore
    } finally {
      setStartupLoading(false);
    }
  };

  const fetchHostsAudit = async () => {
    setHostsLoading(true);
    try {
      const r = await fetch('/api/kernel/security/hosts-audit');
      if (r.ok) {
        const d = (await r.json()) as HostsAuditResult;
        if (d?.ok) setHostsAudit(d);
      }
    } catch {
      // ignore
    } finally {
      setHostsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, []);

  useEffect(() => {
    if (subTab === 'network') void fetchNetworkMonitor();
    if (subTab === 'startup_audit') void fetchStartupAudit();
    if (subTab === 'hosts_audit') void fetchHostsAudit();
  }, [subTab]);

  const toggleRealtimeGuard = async () => {
    const next = !(status?.realtime_guard_enabled ?? true);
    try {
      const r = await fetch('/api/kernel/security/guard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (r.ok) {
        await fetchStatus();
        onPushToast(
          'LumaShield 1.5 Real-Time Guard',
          next ? 'Фоновая защита Загрузок и Рабочего стола включена' : 'Фоновая защита приостановлена',
          next ? 'success' : 'info'
        );
      }
    } catch {
      onPushToast('LumaShield 1.5', 'Не удалось переключить Real-Time Guard', 'warning');
    }
  };

  const runScan = async (mode: 'quick' | 'deep' | 'startup' | 'processes' | 'custom', path = '') => {
    setScanning(true);
    setScanLabel(
      mode === 'quick'
        ? 'Быстрая проверка (Загрузки, Рабочий стол, Автозагрузка, PE-маскировка)...'
        : mode === 'deep'
        ? 'Глубокое сканирование (85+ правил LumaShield 1.5, Энтропия Шеннона, AMSI/Стиллеры/Майнеры/Инъекции)...'
        : mode === 'startup'
        ? 'Аудит автозагрузки и скриптов...'
        : mode === 'processes'
        ? 'Инспекция активных процессов в памяти ОС...'
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
        'LumaShield 1.5',
        count > 0
          ? `Обнаружено угроз: ${count} (проверено ${d.files_scanned} объектов за ${d.elapsed_ms} мс)`
          : `Угроз не найдено · Проверено ${d.files_scanned} объектов за ${d.elapsed_ms} мс`,
        count > 0 ? 'warning' : 'success'
      );
    } catch {
      onPushToast('LumaShield 1.5', 'Не удалось выполнить сканирование', 'warning');
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
        'LumaShield 1.5 EICAR-Тест',
        `Тестовый файл обнаружен (${d?.threats?.length || 1})! Можно изолировать в карантин.`,
        'warning'
      );
    } catch {
      onPushToast('LumaShield 1.5', 'Ошибка EICAR-теста', 'warning');
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
        onPushToast('Карантин LumaShield 1.6', `Файл «${t.name}» изолирован`, 'success');
        await fetchStatus();
      } else {
        onPushToast('Карантин', d?.error || 'Не удалось изолировать файл', 'warning');
      }
    } catch {
      onPushToast('Карантин', 'Ошибка связи с ядром безопасности', 'warning');
    }
  };

  const quarantineAllThreats = async () => {
    try {
      const r = await fetch('/api/kernel/security/quarantine-all', { method: 'POST' });
      const d = await r.json();
      if (d?.ok) {
        onPushToast('Карантин LumaShield 1.6', `Изолировано угроз: ${d.quarantined}`, 'success');
        await fetchStatus();
      }
    } catch {
      onPushToast('Карантин', 'Не удалось выполнить массовую изоляцию', 'warning');
    }
  };

  const manageExclusion = async (action: 'add' | 'remove', targetPath: string) => {
    if (!targetPath.trim()) return;
    try {
      const r = await fetch('/api/kernel/security/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, path: targetPath.trim() }),
      });
      if (r.ok) {
        if (action === 'add') setNewExclusion('');
        onPushToast(
          'Белый список LumaShield 1.6',
          action === 'add' ? 'Путь добавлен в исключения' : 'Путь удалён из исключений',
          'info'
        );
        await fetchStatus();
      }
    } catch {
      // ignore
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
          'Карантин LumaShield 1.6',
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
  const exclusions = status?.exclusions ?? [];
  const audit = status?.audit_log ?? [];
  const rtGuard = status?.realtime_guard_enabled ?? true;
  const suspTcpCount = tcpConns.filter((c) => c.suspicious).length;
  const visibleTcp = tcpOnlySusp ? tcpConns.filter((c) => c.suspicious) : tcpConns;

  return (
    <div className="space-y-4">
      {/* Top Security Score, Real-Time Guard & Zero-Conflict Windows Defender Harmony Card */}
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
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--luma-accent)] font-bold flex flex-wrap items-center gap-1.5">
                <span>ЯДРО БЕЗОПАСНОСТИ · LUMASHIELD {status?.security_core_version || '1.5'}</span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent-soft)] text-[9px]">
                  {status?.rules_count || 85}+ ПРАВИЛ
                </span>
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
                {status?.crypto || 'AES-256-GCM + 85+ Heuristics + Hosts DNS Audit + TCP Monitor + Startup Auditor'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void toggleRealtimeGuard()}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                rtGuard ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-400' : btnCls
              }`}
              title="Фоновый контроль Загрузок и Рабочего стола без конфликта с Windows Defender"
            >
              {rtGuard ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
              Real-Time Guard: {rtGuard ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
            <button
              onClick={() => void fetchStatus()}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Обновить
            </button>
          </div>
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
              <div className="font-bold">LumaShield 1.5 + Windows Defender (Без конфликтов)</div>
              <div className="text-[11px] opacity-85">
                {status?.defender?.available
                  ? `Windows Defender активен (реальное время: ${status.defender.realtime_enabled ? 'ВКЛ' : 'ВЫКЛ'} · базы ${status.defender.signature_version}). LumaShield 1.5 добавляет 85+ правил, Аудит Hosts (DNS), Сетевой монитор TCP и Аудит автозагрузки.`
                  : 'LumaShield 1.5 работает в безопасном user-space режиме: 85+ поведенческих правил, Аудит Hosts (DNS), PE-маскировка, энтропия Шеннона, TCP-монитор и аудит автозагрузки.'}
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
          { id: 'scanner' as const, label: 'Антивирус 1.5', badge: threats.length || undefined },
          { id: 'hosts_audit' as const, label: 'Аудит Hosts (DNS)', badge: hostsAudit ? hostsAudit.suspicious_count || undefined : undefined },
          { id: 'network' as const, label: 'Сетевой экран', badge: suspTcpCount || (tcpConns.length || undefined) },
          { id: 'startup_audit' as const, label: 'Аудит автозагрузки', badge: startupFindings.filter((f) => f.risk !== 'safe').length || undefined },
          { id: 'quarantine' as const, label: 'Карантин', badge: quarantine.length || undefined },
          { id: 'exclusions' as const, label: 'Белый список', badge: exclusions.length || undefined },
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

      {/* TAB 1B: HOSTS FILE DNS INTEGRITY AUDITOR (LUMASHIELD 1.5) */}
      {subTab === 'hosts_audit' && (
        <div className={`p-4 rounded-2xl border space-y-3 text-xs ${surfaceCls}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[var(--luma-accent)]" />
                Аудит целостности файла Hosts (DNS Hijack Protection · LumaShield 1.5)
              </div>
              <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
                Проверка системного файла hosts на скрытые DNS-перенаправления банков, антивирусов, обновлений Windows и фишинговые подмены
              </div>
            </div>
            <button
              onClick={() => void fetchHostsAudit()}
              disabled={hostsLoading}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${hostsLoading ? 'animate-spin' : ''}`} />
              Проверить Hosts
            </button>
          </div>

          {hostsAudit ? (
            <div className="space-y-2.5">
              <div
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                  hostsAudit.suspicious_count === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {hostsAudit.suspicious_count === 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  <span className="font-bold">
                    {hostsAudit.suspicious_count === 0
                      ? 'Файл hosts чист — подозрительных DNS-подмен не обнаружено'
                      : `Обнаружено подозрительных DNS-записей: ${hostsAudit.suspicious_count}`}
                  </span>
                </div>
                <span className="font-mono text-[10px] opacity-80">
                  {hostsAudit.path} · записей: {hostsAudit.total_mappings}
                </span>
              </div>

              {hostsAudit.entries && hostsAudit.entries.length > 0 ? (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {hostsAudit.entries.map((entry, idx) => (
                    <div
                      key={`${entry.line}_${idx}`}
                      className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] ${
                        entry.suspicious ? 'bg-rose-500/15 border-rose-500/40 text-rose-200' : btnCls
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">
                          <span className="opacity-60 mr-2">L{entry.line}</span>
                          <span>{entry.ip}</span>
                          <span className="mx-2 opacity-50">→</span>
                          <span>{entry.host}</span>
                        </div>
                        {entry.reason && <div className="text-[10px] opacity-85 mt-0.5">{entry.reason}</div>}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          entry.suspicious ? 'bg-rose-600 text-white' : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {entry.suspicious ? 'ПОДМЕНА' : 'OK'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`py-4 text-center font-mono ${mutedCls}`}>
                  В файле hosts нет активных пользовательских перенаправлений (стандартная конфигурация ОС).
                </div>
              )}
            </div>
          ) : (
            <div className={`py-6 text-center font-mono ${mutedCls}`}>
              {hostsLoading ? 'Чтение и проверка файла hosts...' : 'Нажмите «Проверить Hosts» для запуска аудита DNS'}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: ANTIVIRUS SCANNER */}
      {subTab === 'scanner' && (
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                disabled={scanning}
                onClick={() => void runScan('quick')}
                className="p-2.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ScanSearch className="w-3.5 h-3.5 shrink-0" />
                Быстрая
              </button>
              <button
                disabled={scanning}
                onClick={() => void runScan('deep')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${btnCls}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                Глубокая
              </button>
              <button
                disabled={scanning}
                onClick={() => void runScan('processes')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${btnCls}`}
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                Процессы
              </button>
              <button
                disabled={scanning}
                onClick={() => void runScan('startup')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${btnCls}`}
              >
                <Shield className="w-3.5 h-3.5 text-[var(--luma-accent)] shrink-0" />
                Автозагрузка
              </button>
              <button
                disabled={scanning}
                onClick={() => void runEicarTest()}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${btnCls}`}
              >
                <Bug className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                EICAR-тест
              </button>
            </div>

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
                <span>Объектов: {status.last_scan_files}</span>
                <span>Время: {status.last_scan_ms} мс</span>
              </div>
            )}
          </div>

          <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
            <div className="text-xs font-bold flex flex-wrap items-center justify-between gap-2">
              <span>Обнаруженные угрозы ({threats.length})</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono ${mutedCls}`}>
                  32+ правил · AMSI · Майнеры · Стиллеры · PE-маскировка · Энтропия
                </span>
                {threats.length > 1 && (
                  <button
                    onClick={() => void quarantineAllThreats()}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Изолировать все
                  </button>
                )}
              </div>
            </div>
            {threats.length === 0 ? (
              <div className={`py-6 text-center text-xs ${mutedCls}`}>
                Угрозы не обнаружены. Запустите «Быстрая», «Глубокая» или «EICAR-тест» для проверки защиты.
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => void manageExclusion('add', t.path)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${btnCls}`}
                      >
                        Доверять
                      </button>
                      <button
                        onClick={() => void quarantineThreat(t)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        В карантин
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE TCP NETWORK MONITOR (LUMASHIELD 1.4) */}
      {subTab === 'network' && (
        <div className={`p-4 rounded-2xl border space-y-3 text-xs ${surfaceCls}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <Network className="w-4 h-4 text-emerald-400" />
                Сетевой монитор TCP в реальном времени ({tcpConns.length})
              </div>
              <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
                Прямое чтение таблицы соединений ОС (Win32 GetExtendedTcpTable / procfs, 0% WMI) с детектором подозрительных портов
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTcpOnlySusp((v) => !v)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                  tcpOnlySusp ? 'bg-rose-500/20 border-rose-500/45 text-rose-300' : btnCls
                }`}
              >
                Подозрительные ({suspTcpCount})
              </button>
              <button
                onClick={() => void fetchNetworkMonitor()}
                disabled={tcpLoading}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${tcpLoading ? 'animate-spin' : ''}`} />
                Обновить
              </button>
            </div>
          </div>

          {visibleTcp.length === 0 ? (
            <div className={`py-6 text-center font-mono ${mutedCls}`}>
              {tcpLoading ? 'Сканирование сетевых сокетов...' : tcpOnlySusp ? 'Подозрительных TCP-соединений не обнаружено!' : 'Нет активных TCP-соединений'}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {visibleTcp.map((c, idx) => (
                <div
                  key={`${c.local_addr}_${c.remote_addr}_${idx}`}
                  className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] ${
                    c.suspicious ? 'bg-rose-500/15 border-rose-500/40 text-rose-200' : btnCls
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold flex items-center gap-2">
                      <span className="truncate">{c.process_name}</span>
                      <span className="text-[10px] opacity-65">PID {c.pid}</span>
                      {c.suspicious && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] uppercase">РИСК</span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-80 truncate">
                      {c.local_addr} → {c.remote_addr} {c.note ? `· ${c.note}` : ''}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      c.state === 'ESTABLISHED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/15 text-sky-400'
                    }`}
                  >
                    {c.state}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STARTUP PERSISTENCE AUDITOR (LUMASHIELD 1.4) */}
      {subTab === 'startup_audit' && (
        <div className={`p-4 rounded-2xl border space-y-3 text-xs ${surfaceCls}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-[var(--luma-accent)]" />
                Аудит автозагрузки (Startup Persistence Auditor)
              </div>
              <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
                Проверка записей реестра Run и autostart на скрытый запуск PowerShell, скриптов из Temp/AppData и LOLBins
              </div>
            </div>
            <button
              onClick={() => void fetchStartupAudit()}
              disabled={startupLoading}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${startupLoading ? 'animate-spin' : ''}`} />
              Проверить
            </button>
          </div>

          {startupFindings.length === 0 ? (
            <div className={`py-6 text-center font-mono ${mutedCls}`}>
              {startupLoading ? 'Анализ ключей автозагрузки...' : 'Записей автозагрузки не найдено'}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {startupFindings.map((f, idx) => (
                <div
                  key={`${f.name}_${idx}`}
                  className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                    f.risk === 'high'
                      ? 'bg-rose-500/15 border-rose-500/40'
                      : f.risk === 'medium'
                      ? 'bg-amber-500/10 border-amber-500/35'
                      : btnCls
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-bold flex items-center gap-2">
                      <span className="truncate">{f.name}</span>
                      <span className={`text-[10px] font-mono opacity-65`}>{f.location}</span>
                    </div>
                    <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{f.command}</div>
                    <div className="text-[11px] opacity-85">{f.reason}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase shrink-0 ${
                      f.risk === 'high'
                        ? 'bg-rose-600 text-white'
                        : f.risk === 'medium'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {f.risk === 'high' ? 'ОПАСНО' : f.risk === 'medium' ? 'ВНИМАНИЕ' : 'БЕЗОПАСНО'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ISOLATED QUARANTINE */}
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

      {/* TAB 5: WHITELIST EXCLUSIONS */}
      {subTab === 'exclusions' && (
        <div className={`p-4 rounded-2xl border space-y-3 text-xs ${surfaceCls}`}>
          <div>
            <div className="font-bold">Белый список (Исключения LumaShield 1.6)</div>
            <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
              Доверенные папки и файлы, которые пропускаются сканером и Real-Time Guard
            </div>
          </div>
          <div className="flex gap-2">
            <input
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              placeholder="Путь к доверенной папке или файлу..."
              className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
            />
            <button
              onClick={() => void manageExclusion('add', newExclusion)}
              disabled={!newExclusion.trim()}
              className="px-3.5 py-2 rounded-xl bg-[var(--luma-accent)] text-white font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить
            </button>
          </div>
          {exclusions.length === 0 ? (
            <div className={`py-5 text-center font-mono ${mutedCls}`}>Список исключений пуст.</div>
          ) : (
            <div className="space-y-1.5">
              {exclusions.map((ex) => (
                <div key={ex} className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}>
                  <span className="font-mono truncate">{ex}</span>
                  <button
                    onClick={() => void manageExclusion('remove', ex)}
                    className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                    title="Удалить из исключений"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SECURITY KERNEL AUDIT LOG */}
      {subTab === 'audit' && (
        <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[var(--luma-accent)]" />
              Журнал ядра безопасности LumaShield 1.6
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
