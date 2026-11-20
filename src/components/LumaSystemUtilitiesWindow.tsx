import React, { useEffect, useState } from 'react';
import {
  Calculator,
  FileText,
  Server,
  Wrench,
  Volume2,
  Wifi,
  Shield,
  Monitor,
  Sliders,
  Cpu,
  Scissors,
  Keyboard,
  Terminal,
  RefreshCw,
  Save,
  Search,
  ExternalLink,
  Power,
  Bluetooth,
} from 'lucide-react';

interface SystemServiceItem {
  name: string;
  display_name: string;
  status: string;
  start_type: string;
  source: 'luma' | 'os';
  pid?: number;
  description?: string;
}

interface LumaSystemUtilitiesWindowProps {
  isDark: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  volume: number;
  isMuted: boolean;
  onChangeVolume: (val: number) => void;
  onToggleMute: () => void;
  onPushToast: (title: string, message: string, level?: 'info' | 'success' | 'warning') => void;
}

const NOTEPAD_STORAGE_KEY = 'luma_notepad_text_v1';

export const LumaSystemUtilitiesWindow: React.FC<LumaSystemUtilitiesWindowProps> = ({
  isDark,
  surfaceCls,
  btnCls,
  mutedCls,
  volume,
  isMuted,
  onChangeVolume,
  onToggleMute,
  onPushToast,
}) => {
  const [tab, setTab] = useState<'applets' | 'calculator' | 'notepad' | 'services'>('applets');

  // Calculator state
  const [calcExpr, setCalcExpr] = useState('');
  const [calcResult, setCalcResult] = useState('0');
  const [calcHistory, setCalcHistory] = useState<string[]>([]);

  // Notepad state
  const [noteTitle, setNoteTitle] = useState('luma_note.txt');
  const [noteContent, setNoteContent] = useState<string>(() => {
    try {
      return localStorage.getItem(NOTEPAD_STORAGE_KEY) || 'Быстрая заметка Luma OS 1.1.0 (Helium)\n';
    } catch {
      return '';
    }
  });
  const [savingNote, setSavingNote] = useState(false);

  // Services state
  const [services, setServices] = useState<SystemServiceItem[]>([]);
  const [svcQuery, setSvcQuery] = useState('');
  const [svcLoading, setSvcLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(NOTEPAD_STORAGE_KEY, noteContent);
    } catch {
      // ignore
    }
  }, [noteContent]);

  const loadServices = async () => {
    setSvcLoading(true);
    try {
      const r = await fetch('/api/kernel/services?limit=80');
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d?.services)) setServices(d.services);
      }
    } catch {
      // ignore
    } finally {
      setSvcLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'services' && services.length === 0) {
      void loadServices();
    }
  }, [tab]);

  const openApplet = async (applet: string, title: string) => {
    try {
      const r = await fetch('/api/kernel/system-applet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applet }),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast('Системные службы', `Открыто: ${title}`, 'info');
      } else {
        onPushToast('Системные службы', d?.error || 'Недоступно в текущей ОС', 'warning');
      }
    } catch {
      onPushToast('Системные службы', 'Ошибка запуска утилиты', 'warning');
    }
  };

  const evalCalc = (expr: string) => {
    const clean = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/().%\s]/g, '');
    if (!clean.trim()) return;
    try {
      // Safe arithmetic evaluation without arbitrary globals
      const fn = new Function(`"use strict"; return (${clean.replace(/%/g, '/100')});`);
      const val = fn();
      if (typeof val === 'number' && Number.isFinite(val)) {
        const rounded = Math.round(val * 1e10) / 1e10;
        setCalcResult(String(rounded));
        setCalcHistory((prev) => [`${expr} = ${rounded}`, ...prev].slice(0, 12));
        setCalcExpr(String(rounded));
      } else {
        setCalcResult('Ошибка');
      }
    } catch {
      setCalcResult('Ошибка');
    }
  };

  const handleSaveNoteToDisk = async () => {
    setSavingNote(true);
    try {
      const fileName = noteTitle.trim() || 'luma_note.txt';
      const r = await fetch('/api/kernel/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'newfile', path: '~/Desktop', name: fileName, content: noteContent }),
      });
      const d = await r.json();
      if (d?.ok) {
        onPushToast('Блокнот Luma', `Сохранено на Рабочий стол: ${fileName}`, 'success');
      } else {
        const r2 = await fetch('/api/kernel/fs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'newfile', path: '~', name: fileName, content: noteContent }),
        });
        const d2 = await r2.json();
        onPushToast('Блокнот Luma', d2?.ok ? `Сохранено в домашнюю папку: ${fileName}` : 'Не удалось сохранить файл', d2?.ok ? 'success' : 'warning');
      }
    } catch {
      onPushToast('Блокнот Luma', 'Ошибка сохранения', 'warning');
    } finally {
      setSavingNote(false);
    }
  };

  const filteredServices = services.filter((s) => {
    const q = svcQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.display_name.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q)
    );
  });

  const windowsApplets = [
    { id: 'settings', title: 'Параметры Windows', desc: 'Системные настройки ОС', icon: <Sliders className="w-4 h-4" /> },
    { id: 'control', title: 'Панель управления', desc: 'Классическая Control Panel', icon: <Wrench className="w-4 h-4" /> },
    { id: 'devmgmt', title: 'Диспетчер устройств', desc: 'Драйверы и оборудование', icon: <Cpu className="w-4 h-4" /> },
    { id: 'services', title: 'Службы (services.msc)', desc: 'Управление службами Windows', icon: <Server className="w-4 h-4" /> },
    { id: 'network', title: 'Сетевые адаптеры', desc: 'Wi-Fi, Ethernet, VPN (ncpa.cpl)', icon: <Wifi className="w-4 h-4" /> },
    { id: 'sound', title: 'Звук и устройства', desc: 'Микшер и вывод аудио (mmsys.cpl)', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'display', title: 'Экран и мониторы', desc: 'Разрешение, HDR, масштаб', icon: <Monitor className="w-4 h-4" /> },
    { id: 'bluetooth', title: 'Bluetooth и устройства', desc: 'Сопряжение и периферия', icon: <Bluetooth className="w-4 h-4" /> },
    { id: 'defender', title: 'Безопасность Windows', desc: 'Windows Defender (без конфликтов)', icon: <Shield className="w-4 h-4" /> },
    { id: 'firewall', title: 'Брандмауэр', desc: 'Правила сети (wf.msc)', icon: <Shield className="w-4 h-4" /> },
    { id: 'power', title: 'Электропитание', desc: 'Схемы питания (powercfg.cpl)', icon: <Power className="w-4 h-4" /> },
    { id: 'snip', title: 'Ножницы (Скриншот)', desc: 'Захват области экрана', icon: <Scissors className="w-4 h-4" /> },
    { id: 'osk', title: 'Экранная клавиатура', desc: 'Сенсорный ввод Windows', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'powershell', title: 'PowerShell', desc: 'Консоль администратора', icon: <Terminal className="w-4 h-4" /> },
    { id: 'taskschd', title: 'Планировщик заданий', desc: 'Автоматизация задач ОС', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'regedit', title: 'Редактор реестра', desc: 'Системный реестр Windows', icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Top Navigation */}
      <div
        className={`px-3.5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark ? 'border-white/[0.08]' : 'border-zinc-900/10'
        }`}
      >
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'applets' as const, label: 'Утилиты Windows', icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: 'calculator' as const, label: 'Калькулятор', icon: <Calculator className="w-3.5 h-3.5" /> },
            { id: 'notepad' as const, label: 'Блокнот Luma', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'services' as const, label: `Службы ОС (${services.length || '...'})`, icon: <Server className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-xl border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                tab === t.id ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Inline Quick Audio Mixer Strip */}
        <div className="flex items-center gap-2 text-xs">
          <button onClick={onToggleMute} className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`} title="Звук">
            <Volume2 className={`w-3.5 h-3.5 ${isMuted ? 'text-rose-400' : 'text-[var(--luma-accent)]'}`} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={(e) => onChangeVolume(Number(e.target.value))}
            className="w-24 accent-[var(--luma-accent)]"
          />
          <span className="font-mono text-[11px] w-8">{isMuted ? '0%' : `${volume}%`}</span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'applets' && (
          <div className="space-y-3">
            <div className={`text-xs ${mutedCls}`}>
              Системные утилиты и службы Windows, адаптированные под интерфейс Luma OS 1.1.0 (Helium). Нажмите на любую плитку для мгновенного запуска.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {windowsApplets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => void openApplet(a.id, a.title)}
                  className={`p-3.5 rounded-2xl border text-left space-y-2 transition hover:border-[var(--luma-accent)] cursor-pointer group ${surfaceCls}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center">
                      {a.icon}
                    </span>
                    <ExternalLink className={`w-3.5 h-3.5 opacity-40 group-hover:opacity-100 ${mutedCls}`} />
                  </div>
                  <div>
                    <div className="text-xs font-bold truncate">{a.title}</div>
                    <div className={`text-[10px] truncate ${mutedCls}`}>{a.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'calculator' && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4 max-w-2xl mx-auto">
            <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
              <div className={`p-3.5 rounded-xl border text-right font-mono ${btnCls}`}>
                <div className={`text-xs min-h-[18px] truncate ${mutedCls}`}>{calcExpr || '0'}</div>
                <div className="text-3xl font-black tabular-nums truncate mt-1">{calcResult}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 font-mono text-sm">
                {['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '%', '='].map(
                  (k) => (
                    <button
                      key={k}
                      onClick={() => {
                        if (k === 'C') {
                          setCalcExpr('');
                          setCalcResult('0');
                        } else if (k === '=') {
                          evalCalc(calcExpr);
                        } else {
                          setCalcExpr((prev) => prev + k);
                        }
                      }}
                      className={`py-3 rounded-xl border font-bold cursor-pointer transition ${
                        k === '='
                          ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                          : ['÷', '×', '-', '+', '%', 'C'].includes(k)
                          ? 'border-[var(--luma-accent)]/35 text-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                          : btnCls
                      }`}
                    >
                      {k}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${surfaceCls}`}>
              <div className="text-xs font-bold">История вычислений</div>
              {calcHistory.length === 0 ? (
                <div className={`text-xs ${mutedCls}`}>Пока пусто</div>
              ) : (
                <div className="space-y-1.5 font-mono text-xs">
                  {calcHistory.map((h, i) => (
                    <div key={i} className={`p-2 rounded-lg border truncate ${btnCls}`}>
                      {h}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'notepad' && (
          <div className="h-full flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
                placeholder="Имя файла (например: notes.txt)"
              />
              <button
                disabled={savingNote}
                onClick={() => void handleSaveNoteToDisk()}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingNote ? 'Сохранение...' : 'Сохранить файл на диск'}
              </button>
              <span className={`text-[11px] font-mono ${mutedCls}`}>
                {noteContent.length} симв. · {noteContent.split('\n').length} строк
              </span>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={15}
              placeholder="Начните писать заметку или код..."
              className={`w-full flex-1 p-4 rounded-2xl border font-mono text-xs leading-relaxed outline-none resize-none ${surfaceCls}`}
            />
          </div>
        )}

        {tab === 'services' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className={`flex-1 min-w-[200px] flex items-center gap-2 px-3 py-1.5 rounded-xl border ${btnCls}`}>
                <Search className="w-3.5 h-3.5 opacity-60" />
                <input
                  value={svcQuery}
                  onChange={(e) => setSvcQuery(e.target.value)}
                  placeholder="Фильтр служб LumaCore и Windows..."
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>
              <button
                onClick={() => void loadServices()}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${svcLoading ? 'animate-spin' : ''}`} />
                Обновить
              </button>
              <button
                onClick={() => void openApplet('services', 'Службы Windows')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${btnCls}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                services.msc
              </button>
            </div>

            <div className="space-y-1.5">
              {filteredServices.map((s) => (
                <div
                  key={`${s.source}_${s.name}`}
                  className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${surfaceCls}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold truncate">{s.display_name || s.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                          s.source === 'luma'
                            ? 'bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-bold'
                            : 'bg-white/10 opacity-75'
                        }`}
                      >
                        {s.source === 'luma' ? 'LUMA 1.1' : 'ОС'}
                      </span>
                    </div>
                    <div className={`text-[11px] font-mono truncate ${mutedCls}`}>
                      {s.name} {s.description ? `· ${s.description}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                    <span className={mutedCls}>{s.start_type}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        s.status.toLowerCase() === 'running'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
