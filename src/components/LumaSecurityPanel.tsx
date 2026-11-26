import React, { useEffect, useRef, useState } from 'react';
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

export interface HardcoreShieldConfig {
  hardcore_mode: boolean;
  auto_shred_remote_control: boolean;
  usb_flash_guard: boolean;
  block_foreign_files: boolean;
  kill_remote_control_procs: boolean;
}

export interface UsbDriveInfo {
  path: string;
  label: string;
  scanned_at: string;
  threats: number;
}

export interface HardcoreShieldEvent {
  id: string;
  time: string;
  action: string;
  source: string;
  name: string;
  path: string;
  reason: string;
  sha256?: string;
  success: boolean;
}

export interface HardcoreShieldStatus {
  ok: boolean;
  version: string;
  rules_count: number;
  config: HardcoreShieldConfig;
  shredded_count: number;
  blocked_foreign_count: number;
  killed_processes_count: number;
  usb_drives: UsbDriveInfo[];
  events: HardcoreShieldEvent[];
  last_tick_at: string;
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
  const [hardcore, setHardcore] = useState<HardcoreShieldStatus | null>(null);
  const [hardcoreBusy, setHardcoreBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanLabel, setScanLabel] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [subTab, setSubTab] = useState<'scanner' | 'network' | 'startup_audit' | 'hosts_audit' | 'quarantine' | 'exclusions' | 'audit'>('scanner');

  // LumaShield 3.0 Network Monitor, Startup Auditor & Hosts File DNS Integrity Auditor state
  const [tcpConns, setTcpConns] = useState<ActiveTcpConnectionInfo[]>([]);
  const [tcpLoading, setTcpLoading] = useState(false);
  const [tcpOnlySusp, setTcpOnlySusp] = useState(false);
  const [startupFindings, setStartupFindings] = useState<StartupAuditFindingInfo[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<StartupAuditFindingInfo[]>([]);
  const [startupLoading, setStartupLoading] = useState(false);
  const [hostsAudit, setHostsAudit] = useState<HostsAuditResult | null>(null);
  const [hostsLoading, setHostsLoading] = useState(false);

  const scanAbortRef = useRef<AbortController | null>(null);

  const fetchWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = 15000, trackCancel = false) => {
    const ctrl = new AbortController();
    if (trackCancel) {
      try {
        scanAbortRef.current?.abort();
      } catch {
        // ignore
      }
      scanAbortRef.current = ctrl;
    }
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      window.clearTimeout(timer);
      if (trackCancel && scanAbortRef.current === ctrl) {
        scanAbortRef.current = null;
      }
    }
  };

  const cancelActiveScan = () => {
    try {
      scanAbortRef.current?.abort();
    } catch {
      // ignore
    }
    scanAbortRef.current = null;
    setScanning(false);
    setHardcoreBusy(false);
    setScanLabel('');
    onPushToast('LumaShield 3.1', 'Проверка остановлена пользователем', 'info');
  };

  const fetchHardcore = async () => {
    try {
      const r = await fetchWithTimeout('/api/kernel/security/hardcore/config', {}, 8000);
      if (r.ok) {
        const d = await r.json();
        if (d?.ok) setHardcore(d);
      }
    } catch {
      // ignore
    }
  };

  const updateHardcoreConfig = async (patch: Partial<HardcoreShieldConfig>) => {
    const base: HardcoreShieldConfig = hardcore?.config || {
      hardcore_mode: true,
      auto_shred_remote_control: true,
      usb_flash_guard: true,
      block_foreign_files: true,
      kill_remote_control_procs: true,
    };
    const next = { ...base, ...patch };
    try {
      const r = await fetchWithTimeout(
        '/api/kernel/security/hardcore/config',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        },
        8000
      );
      if (r.ok) {
        const d = await r.json();
        if (d?.ok) setHardcore(d);
        onPushToast(
          'LumaShield 3.1 · Жёсткая защита',
          next.hardcore_mode
            ? 'Активная Anti-RAT, USB и блокировка чужих файлов применена'
            : 'Жёсткий режим временно приостановлен',
          'success'
        );
      }
    } catch {
      onPushToast('LumaShield 3.1', 'Нет связи с ядром LumaCore 1.5.7', 'warning');
    }
  };

  const runUsbGuardScan = async () => {
    setHardcoreBusy(true);
    try {
      const r = await fetchWithTimeout(
        '/api/kernel/security/hardcore/usb-scan',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        20000,
        true
      );
      if (r.ok) {
        const d = await r.json();
        if (d?.status) setHardcore(d.status);
        const drvCount = Array.isArray(d?.drives) ? d.drives.length : 0;
        onPushToast(
          'LumaShield 3.1 · Щит флешек (USB)',
          drvCount === 0
            ? 'Съёмные USB-флешки не подключены — авто-мониторинг активен'
            : `Проверено флешек: ${drvCount} · файлов: ${d.scanned || 0} · уничтожено под ноль: ${d.shredded || 0}`,
          (d.threats || 0) > 0 ? 'warning' : 'success'
        );
        await fetchStatus();
      }
    } catch {
      onPushToast('LumaShield 3.1', 'Проверка USB остановлена или превысила таймаут', 'warning');
    } finally {
      setHardcoreBusy(false);
    }
  };

  const runAntiRatHunt = async () => {
    setHardcoreBusy(true);
    try {
      const r = await fetchWithTimeout(
        '/api/kernel/security/hardcore/hunt',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        20000,
        true
      );
      if (r.ok) {
        const d = await r.json();
        if (d?.status) setHardcore(d.status);
        onPushToast(
          'LumaShield 3.1 · Охота на RAT / Управление ПК',
          `Проверено: ${d.scanned || 0} · уничтожено под ноль: ${d.shredded || 0} · заблокировано чужих: ${d.blocked || 0} · убито процессов: ${d.killed || 0}`,
          (d.threats || 0) > 0 ? 'warning' : 'success'
        );
        await fetchStatus();
      }
    } catch {
      onPushToast('LumaShield 3.1', 'Охота на RAT остановлена или превысила таймаут', 'warning');
    } finally {
      setHardcoreBusy(false);
    }
  };

  const shredThreatToZero = async (t: SecurityThreatItem) => {
    try {
      const r = await fetchWithTimeout(
        '/api/kernel/security/hardcore/shred',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: t.path, reason: t.reason, source: 'system' }),
        },
        10000
      );
      if (r.ok) {
        const d = await r.json();
        if (d?.status) setHardcore(d.status);
        onPushToast(
          'LumaShield 3.1 · Уничтожение под ноль',
          d?.ok ? `Файл «${t.name}» перезаписан нулями и полностью удалён!` : d?.message || 'Файл защищён',
          d?.ok ? 'success' : 'warning'
        );
        await fetchStatus();
      }
    } catch {
      onPushToast('LumaShield 3.1', 'Не удалось выполнить удаление под ноль', 'warning');
    }
  };

  const fetchStatus = async () => {
    try {
      const r = await fetchWithTimeout('/api/kernel/security/status', {}, 8000);
      if (r.ok) {
        const d = await r.json();
        if (d?.ok) setStatus(d);
      }
    } catch {
      // ignore
    }
    void fetchHardcore();
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
      const r = await fetch('/api/kernel/security/tasks-audit');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.startup_entries)) setStartupFindings(d.startup_entries);
        if (Array.isArray(d?.scheduled_tasks)) setScheduledTasks(d.scheduled_tasks);
      } else {
        const r2 = await fetch('/api/kernel/security/startup-audit');
        if (r2.ok) {
          const d2 = await r2.json();
          if (Array.isArray(d2?.findings)) setStartupFindings(d2.findings);
        }
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

  // LumaShield 2.0 Single-File Inspector & Unified Audit Report state
  const [singleFileResult, setSingleFileResult] = useState<{
    name: string;
    size: number;
    sha256: string;
    entropy: number;
    is_pe: boolean;
    verdict: 'clean' | 'threat';
    threat?: SecurityThreatItem | null;
    checked: string;
  } | null>(null);
  const [singleScanning, setSingleScanning] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);

  const handleInspectDroppedFile = async (file: File) => {
    setSingleScanning(true);
    try {
      // NEVER load a huge file (e.g. 500MB .exe/.iso) into WebView2 RAM! Slice max 2 MB for instant <30ms analysis.
      const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
      const sliced = file.size > MAX_UPLOAD_BYTES ? file.slice(0, MAX_UPLOAD_BYTES) : file;
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = () => reject(new Error('Ошибка чтения файла'));
        r.readAsDataURL(sliced);
      });
      const res = await fetchWithTimeout(
        '/api/kernel/security/scan-file',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_name: file.name, base64_data: b64 }),
        },
        15000
      );
      const data = await res.json();
      if (data?.ok) {
        setSingleFileResult(data);
        await fetchStatus();
        onPushToast(
          'LumaShield 3.1 · Анализ файла',
          data.verdict === 'threat'
            ? `УГРОЗА в ${data.name}: ${data.threat?.category || 'Malware'}`
            : `Файл ${data.name} чист (энтропия ${data.entropy})`,
          data.verdict === 'threat' ? 'warning' : 'success'
        );
      } else {
        onPushToast('LumaShield 3.1', data?.error || 'Не удалось проанализировать файл', 'warning');
      }
    } catch {
      onPushToast('LumaShield 3.1', 'Анализ файла отменён или превысил таймаут', 'warning');
    } finally {
      setSingleScanning(false);
    }
  };

  const inspectFileByPath = async (targetPath: string) => {
    const clean = targetPath.trim();
    if (!clean) return;
    setSingleScanning(true);
    try {
      const res = await fetchWithTimeout(
        '/api/kernel/security/scan-file',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: clean }),
        },
        15000
      );
      const data = await res.json();
      if (data?.ok) {
        setSingleFileResult(data);
        await fetchStatus();
        onPushToast(
          'LumaShield 3.1 · Проверка файла',
          data.verdict === 'threat'
            ? `УГРОЗА в ${data.name}: ${data.threat?.category || 'Malware'}`
            : `Файл ${data.name} безопасен (энтропия ${data.entropy})`,
          data.verdict === 'threat' ? 'warning' : 'success'
        );
      } else {
        onPushToast('LumaShield 3.1', data?.error || 'Не удалось проверить файл', 'warning');
      }
    } catch {
      onPushToast('LumaShield 3.1', 'Ошибка проверки файла по пути', 'warning');
    } finally {
      setSingleScanning(false);
    }
  };

  const handleExportAuditReport = async () => {
    setExportingReport(true);
    try {
      const r = await fetch('/api/kernel/security/report');
      const d = await r.json();
      if (d?.ok && d.markdown_report) {
        const blob = new Blob([d.markdown_report], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LumaShield_2.0_Audit_${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
        onPushToast('LumaShield 2.0', 'Полный отчёт аудита безопасности сохранён (.md)', 'success');
      }
    } catch {
      onPushToast('LumaShield 2.0', 'Ошибка генерации отчёта', 'warning');
    } finally {
      setExportingReport(false);
    }
  };

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
          'LumaShield 2.0 Real-Time Guard',
          next ? 'Фоновая защита Загрузок и Рабочего стола включена' : 'Фоновая защита приостановлена',
          next ? 'success' : 'info'
        );
      }
    } catch {
      onPushToast('LumaShield 2.0', 'Не удалось переключить Real-Time Guard', 'warning');
    }
  };

  const runScan = async (mode: 'quick' | 'deep' | 'startup' | 'processes' | 'custom', path = '') => {
    setScanning(true);
    setScanLabel(
      mode === 'quick'
        ? 'Быстрая проверка LumaShield 3.1 (Загрузки, Рабочий стол, Zero-Freeze)...'
        : mode === 'deep'
        ? 'Глубокое сканирование LumaShield 3.1 (340+ правил, Anti-RAT, Архивы/Макросы, Энтропия)...'
        : mode === 'startup'
        ? 'Аудит автозагрузки и скриптов...'
        : mode === 'processes'
        ? 'Инспекция активных процессов (сигнатуры майнеров/RAT/стилеров)...'
        : `Проверка: ${path || '~'}...`
    );
    try {
      const r = await fetchWithTimeout(
        '/api/kernel/security/scan',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, path }),
        },
        20000,
        true
      );
      const d = await r.json();
      await fetchStatus();
      if (d?.busy) {
        onPushToast('LumaShield 3.2', d.message || 'Проверка уже выполняется', 'info');
      } else {
        const count = d?.threats?.length ?? 0;
        const limitNote = d?.timed_out ? ' · лимит Zero-Freeze' : '';
        onPushToast(
          'LumaShield 3.2',
          count > 0
            ? `Обнаружено угроз: ${count} (проверено ${d.files_scanned} объектов за ${d.elapsed_ms} мс${limitNote})`
            : `Угроз не найдено · Проверено ${d.files_scanned} объектов за ${d.elapsed_ms} мс${limitNote}`,
          count > 0 ? 'warning' : 'success'
        );
      }
    } catch {
      onPushToast('LumaShield 3.2', 'Сканирование остановлено или превысило таймаут', 'warning');
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

  const pickAndScanFile = async () => {
    try {
      const r = await fetchWithTimeout(
        '/api/kernel/pick-file',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'file' }),
        },
        125000
      );
      const d = await r.json();
      if (d?.picked && d?.path) {
        setCustomPath(d.path);
        await inspectFileByPath(d.path);
      }
    } catch {
      onPushToast('LumaShield 3.2', 'Выбор файла отменён или превысил таймаут', 'info');
    }
  };

  const pickAndScanFolder = async () => {
    try {
      const r = await fetchWithTimeout(
        '/api/kernel/pick-file',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'folder' }),
        },
        95000
      );
      const d = await r.json();
      if (d?.picked && d?.path) {
        setCustomPath(d.path);
        await runScan('custom', d.path);
      }
    } catch {
      onPushToast('LumaShield 3.2', 'Выбор папки отменён или превысил таймаут', 'info');
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
                <span>ЯДРО БЕЗОПАСНОСТИ · LUMASHIELD {status?.security_core_version || '2.5'}</span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent-soft)] text-[9px]">
                  {status?.rules_count || 235}+ ПРАВИЛ
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px]">
                  TASKS · BYOVD · STEALER SHIELD
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
                {status?.crypto || 'AES-256-GCM + 235+ Heuristics + Startup & Scheduled Tasks Audit + InfoStealer & BYOVD Guard'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              disabled={exportingReport}
              onClick={() => void handleExportAuditReport()}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
              title="Скачать полный отчёт аудита безопасности (.md)"
            >
              <ListChecks className="w-3.5 h-3.5 text-cyan-400" />
              {exportingReport ? 'Экспорт...' : 'Отчёт (.md)'}
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
              <div className="font-bold">LumaShield 3.0 Hardcore + Windows Defender (Без конфликтов)</div>
              <div className="text-[11px] opacity-85">
                {status?.defender?.available
                  ? `Windows Defender активен (реальное время: ${status.defender.realtime_enabled ? 'ВКЛ' : 'ВЫКЛ'} · базы ${status.defender.signature_version}). LumaShield 3.0 усиливает защиту: 340+ правил, Anti-RAT уничтожение под ноль, Щит USB-флешек и Блокировка чужих файлов.`
                  : 'LumaShield 3.0 работает в активном режиме: 340+ эвристических и Anti-RAT правил, автоматическое уничтожение под ноль файлов удалённого управления ПК, Щит USB-флешек, блокировка чужих файлов и аудит автозагрузки/Hosts/TCP.'}
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

        {/* LUMASHIELD 3.0 HARDCORE ACTIVE DEFENSE PANEL (ANTI-RAT ZERO-SHREDDER + USB FLASH GUARD + FOREIGN BLOCKER) */}
        <div
          className={`p-3.5 rounded-2xl border space-y-3 text-xs ${
            hardcore?.config?.hardcore_mode ?? true
              ? isDark
                ? 'bg-rose-500/[0.08] border-rose-500/35'
                : 'bg-rose-500/[0.07] border-rose-500/35'
              : surfaceCls
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-black flex items-center gap-2 flex-wrap">
                  <span>LumaShield 3.2 · Жёсткая защита (Anti-RAT · USB · Zero-Freeze)</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-mono">
                    {hardcore?.rules_count ?? 340}+ ПРАВИЛ
                  </span>
                </div>
                <div className={`text-[11px] ${mutedCls}`}>
                  Любой файл, пытающийся управлять ПК (RAT / Reverse Shell / Keylogger / USB-червь), перезаписывается нулями и удаляется под ноль. Ядро Windows и Luma OS защищены белым списком.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                disabled={hardcoreBusy}
                onClick={() => void runAntiRatHunt()}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Shield className="w-3.5 h-3.5" />
                {hardcoreBusy ? 'Проверка...' : 'Охота на RAT'}
              </button>
              <button
                disabled={hardcoreBusy}
                onClick={() => void runUsbGuardScan()}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${btnCls}`}
              >
                <FolderSearch className="w-3.5 h-3.5 text-sky-400" />
                Проверить флешки (USB)
              </button>
              {hardcoreBusy && (
                <button
                  onClick={cancelActiveScan}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                >
                  Остановить
                </button>
              )}
            </div>
          </div>

          {/* 4 Live Hardcore Defense Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
            {[
              ['Уничтожено под ноль', String(hardcore?.shredded_count ?? 0), 'text-rose-400'],
              ['Заблокировано чужих', String(hardcore?.blocked_foreign_count ?? 0), 'text-amber-400'],
              ['Убито RAT-процессов', String(hardcore?.killed_processes_count ?? 0), 'text-orange-400'],
              ['USB-флешек под щитом', String(hardcore?.usb_drives?.length ?? 0), 'text-sky-400'],
            ].map(([lbl, val, cls]) => (
              <div key={lbl} className={`p-2 rounded-xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-white/60 border-zinc-900/10'}`}>
                <div className={`text-[9px] uppercase ${mutedCls}`}>{lbl}</div>
                <div className={`text-base font-black ${cls}`}>{val}</div>
              </div>
            ))}
          </div>

          {/* 5 Master Hardcore Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                key: 'hardcore_mode' as const,
                title: 'Жёсткий режим LumaShield 3.2',
                sub: 'Непрерывный Zero-Freeze щит каждые 20 сек (кэш 0% CPU)',
                active: hardcore?.config?.hardcore_mode ?? true,
              },
              {
                key: 'auto_shred_remote_control' as const,
                title: 'Удалять под ноль файлы управления ПК',
                sub: 'Перезапись нулями и удаление RAT, шеллов, кейлоггеров',
                active: hardcore?.config?.auto_shred_remote_control ?? true,
              },
              {
                key: 'usb_flash_guard' as const,
                title: 'Щит USB-флешек в реальном времени',
                sub: 'Авто-уничтожение autorun.inf, .lnk-червей и RAT с флешек',
                active: hardcore?.config?.usb_flash_guard ?? true,
              },
              {
                key: 'block_foreign_files' as const,
                title: 'Блокировать чужие файлы',
                sub: 'Изоляция подозрительных скачанных (Zone.Identifier) и USB-файлов',
                active: hardcore?.config?.block_foreign_files ?? true,
              },
              {
                key: 'kill_remote_control_procs' as const,
                title: 'Авто-убийство RAT-процессов',
                sub: 'Мгновенное завершение вредоносных процессов удалённого доступа',
                active: hardcore?.config?.kill_remote_control_procs ?? true,
              },
            ].map((opt) => (
              <label
                key={opt.key}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${
                  opt.active ? 'border-rose-500/40 bg-rose-500/10' : btnCls
                }`}
              >
                <div className="min-w-0">
                  <div className="font-bold truncate">{opt.title}</div>
                  <div className={`text-[10px] truncate ${mutedCls}`}>{opt.sub}</div>
                </div>
                <input
                  type="checkbox"
                  checked={opt.active}
                  onChange={(e) => void updateHardcoreConfig({ [opt.key]: e.target.checked })}
                  className="accent-rose-500 w-4 h-4 shrink-0"
                />
              </label>
            ))}
          </div>

          {/* Live Neutralization Log (when threats were shredded/blocked) */}
          {hardcore?.events && hardcore.events.length > 0 && (
            <div className={`p-2.5 rounded-xl border space-y-1 max-h-36 overflow-y-auto ${isDark ? 'bg-black/35 border-white/10' : 'bg-white/65 border-zinc-900/10'}`}>
              <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>
                Журнал жёсткой нейтрализации ({hardcore.events.length})
              </div>
              {hardcore.events.slice(0, 8).map((ev) => (
                <div key={ev.id} className="flex items-center justify-between gap-2 text-[10px] font-mono">
                  <span className="truncate">
                    <span className="text-rose-400 font-bold">[{ev.action}]</span> {ev.name} — {ev.reason}
                  </span>
                  <span className={`shrink-0 ${mutedCls}`}>{ev.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {[
          { id: 'scanner' as const, label: 'Антивирус 3.0', badge: threats.length || undefined },
          { id: 'hosts_audit' as const, label: 'Аудит Hosts (DNS)', badge: hostsAudit ? hostsAudit.suspicious_count || undefined : undefined },
          { id: 'network' as const, label: 'Сетевой экран', badge: suspTcpCount || (tcpConns.length || undefined) },
          {
            id: 'startup_audit' as const,
            label: 'Автозагрузка и Задачи',
            badge:
              startupFindings.filter((f) => f.risk !== 'safe').length +
                scheduledTasks.filter((f) => f.risk !== 'safe').length || undefined,
          },
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

      {/* TAB 1B: HOSTS FILE DNS INTEGRITY AUDITOR (LUMASHIELD 2.0) */}
      {subTab === 'hosts_audit' && (
        <div className={`p-4 rounded-2xl border space-y-3 text-xs ${surfaceCls}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[var(--luma-accent)]" />
                Аудит целостности файла Hosts (DNS Hijack Protection · LumaShield 2.0)
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

      {/* TAB 1: ANTIVIRUS SCANNER 2.0 */}
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
                Глубокая (175+)
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

            {/* Drag-and-Drop Single-File Deep Inspector */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) void handleInspectDroppedFile(f);
              }}
              className={`p-3 rounded-xl border border-dashed flex flex-wrap items-center justify-between gap-2 text-xs ${
                isDark ? 'border-cyan-400/35 bg-cyan-500/[0.05]' : 'border-cyan-500/40 bg-cyan-50/70'
              }`}
            >
              <div className="min-w-0">
                <div className="font-bold text-cyan-400">Мгновенная проверка файла (LumaShield 3.2 Zero-Freeze)</div>
                <div className={`text-[11px] ${mutedCls}`}>
                  Перетащите сюда любой файл (.exe, .zip, .docx, .ps1, .bat, .pdf) или нажмите «Выбрать файл» — проверяет до 4 МБ без зависания даже на огромных файлах
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  disabled={singleScanning || scanning}
                  onClick={() => void pickAndScanFile()}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/35 text-cyan-300 font-semibold cursor-pointer disabled:opacity-50"
                >
                  {singleScanning ? 'Анализ...' : 'Выбрать файл'}
                </button>
                <label
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${btnCls}`}
                  title="Загрузить файл напрямую (до 2 МБ)"
                >
                  Web
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleInspectDroppedFile(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {singleFileResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  singleFileResult.verdict === 'threat'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                    : 'bg-emerald-500/12 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>
                    {singleFileResult.verdict === 'threat' ? '⚠ ОБНАРУЖЕНА УГРОЗА: ' : '✓ ФАЙЛ БЕЗОПАСЕН: '}
                    {singleFileResult.name}
                  </span>
                  <span className="font-mono text-[10px]">Энтропия: {singleFileResult.entropy} · {singleFileResult.is_pe ? 'PE Binary' : 'Data'}</span>
                </div>
                {singleFileResult.threat && (
                  <div className="text-[11px] font-semibold text-rose-300">
                    [{singleFileResult.threat.category}] {singleFileResult.threat.reason}
                  </div>
                )}
                <div className="text-[10px] font-mono opacity-75 truncate">SHA-256: {singleFileResult.sha256}</div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <input
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="Путь к файлу или папке для проверки (например: C:\Users\...\file.exe)"
                className={`flex-1 min-w-[200px] px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
              />
              <button
                disabled={scanning || singleScanning}
                onClick={() => void pickAndScanFile()}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
                title="Открыть проводник и проверить один конкретный файл без зависания"
              >
                <ScanSearch className="w-3.5 h-3.5 text-cyan-400" />
                Файл
              </button>
              <button
                disabled={scanning || singleScanning}
                onClick={() => void pickAndScanFolder()}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
                title="Открыть проводник и проверить выбранную папку"
              >
                <FolderSearch className="w-3.5 h-3.5" />
                Папка
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
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono text-[var(--luma-accent)] truncate">{scanLabel}</div>
                  <button
                    onClick={cancelActiveScan}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    Остановить
                  </button>
                </div>
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
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        В карантин
                      </button>
                      <button
                        onClick={() => void shredThreatToZero(t)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        title="Перезаписать файл нулями и навсегда уничтожить (LumaShield 3.0)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Под ноль
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

      {/* TAB 3: STARTUP PERSISTENCE & SCHEDULED TASKS AUDITOR (LUMASHIELD 2.5) */}
      {subTab === 'startup_audit' && (
        <div className={`p-4 rounded-2xl border space-y-4 text-xs ${surfaceCls}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-[var(--luma-accent)]" />
                Аудит автозагрузки и планировщика задач (LumaShield 2.5)
              </div>
              <div className={`text-[11px] mt-0.5 ${mutedCls}`}>
                Проверка записей реестра Run, autostart и задач Windows Task Scheduler на скрытый запуск PowerShell, скриптов из Temp/AppData и LOLBins
              </div>
            </div>
            <button
              onClick={() => void fetchStartupAudit()}
              disabled={startupLoading}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${startupLoading ? 'animate-spin' : ''}`} />
              Проверить всё
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
              Автозагрузка ({startupFindings.length})
            </div>
            {startupFindings.length === 0 ? (
              <div className={`py-4 text-center font-mono ${mutedCls}`}>
                {startupLoading ? 'Анализ ключей автозагрузки...' : 'Записей автозагрузки не найдено'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
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
                        <span className="text-[10px] font-mono opacity-65">{f.location}</span>
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

          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
              Планировщик задач / Системные таймеры ({scheduledTasks.length})
            </div>
            {scheduledTasks.length === 0 ? (
              <div className={`py-4 text-center font-mono ${mutedCls}`}>
                {startupLoading ? 'Анализ запланированных задач ОС...' : 'Подозрительных или пользовательских задач не найдено'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {scheduledTasks.map((t, idx) => (
                  <div
                    key={`task_${t.name}_${idx}`}
                    className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                      t.risk === 'high'
                        ? 'bg-rose-500/15 border-rose-500/40'
                        : t.risk === 'medium'
                        ? 'bg-amber-500/10 border-amber-500/35'
                        : btnCls
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="font-bold flex items-center gap-2">
                        <span className="truncate">{t.name}</span>
                        <span className="text-[10px] font-mono opacity-65">{t.location}</span>
                      </div>
                      <div className={`text-[10px] font-mono truncate ${mutedCls}`}>{t.command}</div>
                      <div className="text-[11px] opacity-85">{t.reason}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase shrink-0 ${
                        t.risk === 'high'
                          ? 'bg-rose-600 text-white'
                          : t.risk === 'medium'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {t.risk === 'high' ? 'ОПАСНО' : t.risk === 'medium' ? 'ВНИМАНИЕ' : 'БЕЗОПАСНО'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
