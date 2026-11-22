import React, { useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  Palette,
  Play,
  Plus,
  Puzzle,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { CustomThemeConfig, PluginItem } from '../data/launcherData';

interface LumaDeveloperSdkStudioProps {
  isDark: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  customThemes: CustomThemeConfig[];
  activeThemeKey: string;
  onRegisterTheme: (theme: CustomThemeConfig, applyNow?: boolean) => Promise<void>;
  onDeleteTheme: (id: string) => Promise<void>;
  onApplyTheme: (id: string) => void;
  plugins: PluginItem[];
  onRegisterPlugin: (plugin: PluginItem) => Promise<void>;
  onDeletePlugin: (id: string) => Promise<void>;
  onRunPlugin: (plugin: PluginItem) => void;
  onNotify?: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

const SAMPLE_THEME_JSON = `{
  "id": "boron_aurora_dev",
  "name": "Boron Aurora Custom",
  "description": "Пользовательская тема разработчика SDK v3.0",
  "isDark": true,
  "bgGradient": "radial-gradient(circle at 20% 15%, rgba(99,102,241,0.28), transparent 45%), linear-gradient(155deg, #060916 0%, #101936 55%, #090e20 100%)",
  "surfaceRgba": "rgba(15, 22, 42, 0.90)",
  "cardHex": "#131c36",
  "accent": "indigo",
  "accentHex": "#818cf8"
}`;

const SAMPLE_PLUGIN_JSON = `{
  "id": "dev_quick_focus",
  "name": "Focus Pulse SDK v3",
  "version": "1.0.0",
  "apiVersion": "3.0",
  "author": "Community Dev",
  "category": "Продуктивность",
  "icon": "Zap",
  "description": "Пример плагина Luma SDK v3.0 с вызовом системного уведомления и телеметрии",
  "enabled": true,
  "file": "focus_pulse.luma.json",
  "hooks": ["onBoot", "onAction", "onThemeChange"],
  "permissions": ["notify", "telemetry.read", "theme.read"],
  "actionId": "custom_sdk_v3"
}`;

export const LumaDeveloperSdkStudio: React.FC<LumaDeveloperSdkStudioProps> = React.memo(
  ({
    isDark,
    surfaceCls,
    btnCls,
    mutedCls,
    customThemes,
    activeThemeKey,
    onRegisterTheme,
    onDeleteTheme,
    onApplyTheme,
    plugins,
    onRegisterPlugin,
    onDeletePlugin,
    onRunPlugin,
    onNotify,
  }) => {
    const [tab, setTab] = useState<'themes' | 'plugins' | 'docs'>('themes');
    const [themeName, setThemeName] = useState('Midnight Boron');
    const [themeDesc, setThemeDesc] = useState('Авторская тема для Luma OS 1.4');
    const [themeIsDark, setThemeIsDark] = useState(true);
    const [themeBg1, setThemeBg1] = useState('#070b18');
    const [themeBg2, setThemeBg2] = useState('#141c38');
    const [themeAccent, setThemeAccent] = useState('#6366f1');
    const [themeJson, setThemeJson] = useState(SAMPLE_THEME_JSON);
    const [pluginJson, setPluginJson] = useState(SAMPLE_PLUGIN_JSON);
    const [copied, setCopied] = useState<string>('');

    const copySnippet = (key: string, text: string) => {
      navigator.clipboard?.writeText(text).catch(() => {});
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1500);
      onNotify?.('Luma SDK v3.0', 'Код скопирован в буфер обмена', 'info');
    };

    const handleBuildAndSaveTheme = async () => {
      const name = themeName.trim() || 'Custom Theme';
      const id = `dev_${name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '_')}_${Date.now().toString().slice(-4)}`;
      const theme: CustomThemeConfig = {
        id,
        name,
        description: themeDesc.trim() || 'Создано в Theme Studio SDK v3.0',
        isDark: themeIsDark,
        bgGradient: `radial-gradient(circle at 18% 14%, ${themeAccent}38, transparent 48%), linear-gradient(155deg, ${themeBg1} 0%, ${themeBg2} 55%, ${themeBg1} 100%)`,
        surfaceRgba: themeIsDark ? 'rgba(15, 20, 36, 0.90)' : 'rgba(235, 240, 248, 0.92)',
        cardHex: themeIsDark ? '#13192c' : '#e6ebf4',
        accent: 'custom',
        accentHex: themeAccent,
        accentHoverHex: themeAccent,
        custom: true,
      };
      await onRegisterTheme(theme, true);
    };

    const handleImportThemeJson = async () => {
      try {
        const parsed = JSON.parse(themeJson);
        if (!parsed?.name || !parsed?.accentHex) {
          onNotify?.('Ошибка JSON темы', 'Укажите поля name и accentHex', 'warning');
          return;
        }
        await onRegisterTheme(
          {
            id: parsed.id || `dev_json_${Date.now()}`,
            name: String(parsed.name),
            description: String(parsed.description || 'Импортированная тема SDK v3.0'),
            isDark: parsed.isDark !== false,
            bgGradient:
              parsed.bgGradient ||
              `radial-gradient(circle at 18% 14%, ${parsed.accentHex}33, transparent 48%), linear-gradient(155deg, #070b18 0%, #121a30 100%)`,
            surfaceRgba: parsed.surfaceRgba || (parsed.isDark === false ? 'rgba(236,240,247,0.92)' : 'rgba(16,20,34,0.90)'),
            cardHex: parsed.cardHex || (parsed.isDark === false ? '#e6ebf3' : '#151b2d'),
            accent: parsed.accent || 'custom',
            accentHex: String(parsed.accentHex),
            custom: true,
          },
          true
        );
      } catch (err) {
        onNotify?.('Ошибка JSON темы', String(err), 'warning');
      }
    };

    const handleImportPluginJson = async () => {
      try {
        const parsed = JSON.parse(pluginJson);
        if (!parsed?.name) {
          onNotify?.('Ошибка JSON плагина', 'Укажите обязательное поле name', 'warning');
          return;
        }
        const pl: PluginItem = {
          id: parsed.id || `dev_plug_${Date.now()}`,
          name: String(parsed.name),
          version: String(parsed.version || '1.0.0'),
          apiVersion: '3.0',
          author: String(parsed.author || 'Developer'),
          category: String(parsed.category || 'Developer'),
          icon: String(parsed.icon || 'Puzzle'),
          description: String(parsed.description || 'Плагин разработчика SDK v3.0'),
          enabled: parsed.enabled !== false,
          file: String(parsed.file || 'custom_plugin.luma.json'),
          hooks: Array.isArray(parsed.hooks) ? parsed.hooks : ['onBoot', 'onAction'],
          permissions: Array.isArray(parsed.permissions) ? parsed.permissions : ['notify'],
          actionId: String(parsed.actionId || 'custom_sdk_v3'),
        };
        await onRegisterPlugin(pl);
      } catch (err) {
        onNotify?.('Ошибка JSON плагина', String(err), 'warning');
      }
    };

    const handleFileUpload = (kind: 'theme' | 'plugin', file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const txt = String(reader.result || '');
        if (kind === 'theme') setThemeJson(txt);
        else setPluginJson(txt);
      };
      reader.readAsText(file);
    };

    const exportJsonFile = (filename: string, obj: unknown) => {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    const sdkBrowserCode = `// Регистрация своей темы из консоли или расширения:
window.LumaSDK.registerTheme({
  id: "my_neon_boron",
  name: "My Neon Boron",
  isDark: true,
  accentHex: "#38bdf8",
  bgGradient: "linear-gradient(150deg, #04091a 0%, #0d1b3d 100%)",
  cardHex: "#0f172a",
  surfaceRgba: "rgba(15, 23, 42, 0.9)"
}, true);

// Регистрация своего плагина SDK v3.0:
window.LumaSDK.registerPlugin({
  id: "hello_boron_plugin",
  name: "Hello Boron",
  version: "1.0.0",
  author: "You",
  description: "Мой первый плагин Luma OS 1.4",
  hooks: ["onBoot", "onAction"]
});

// Изменение скорости мыши (DPI) через SDK v3.0:
await window.LumaSDK.system.setMouseDPI({ sensor_dpi: 1600, effective_dpi: 1200 });`;

    return (
      <div className="space-y-4 text-xs">
        {/* SDK v3.0 Banner */}
        <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${surfaceCls}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--luma-accent)] text-white flex items-center justify-center shadow">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold flex items-center gap-2">
                <span>Luma Developer Studio & API v3.0</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  window.LumaSDK
                </span>
              </div>
              <div className={`text-[11px] font-mono ${mutedCls}`}>
                Открытый REST + JS SDK: любой разработчик может создать, импортировать и опубликовать свою тему или плагин
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-1 p-0.5 rounded-xl border ${btnCls}`}>
            {(
              [
                ['themes', 'Студия Тем', Palette],
                ['plugins', 'Студия Плагинов', Puzzle],
                ['docs', 'API v3.0 Доки', Code2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                  tab === id ? 'bg-[var(--luma-accent)] text-white' : ''
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: THEME STUDIO */}
        {tab === 'themes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Visual Theme Creator */}
            <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
              <div className="font-bold text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--luma-accent)]" />
                Визуальный конструктор темы
              </div>
              <div
                className="h-24 rounded-xl border border-white/15 p-3 flex flex-col justify-between shadow-inner"
                style={{
                  background: `radial-gradient(circle at 18% 14%, ${themeAccent}44, transparent 50%), linear-gradient(155deg, ${themeBg1} 0%, ${themeBg2} 100%)`,
                  color: themeIsDark ? '#f4f4f5' : '#18181b',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold">{themeName || 'Новая тема'}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono text-white"
                    style={{ backgroundColor: themeAccent }}
                  >
                    Акцент
                  </span>
                </div>
                <div className="text-[10px] opacity-80 truncate">{themeDesc}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="Название темы"
                  className={`px-2.5 py-1.5 rounded-xl border outline-none ${btnCls}`}
                />
                <button
                  onClick={() => setThemeIsDark((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-xl border font-semibold cursor-pointer ${btnCls}`}
                >
                  База: {themeIsDark ? 'Тёмная' : 'Светлая'}
                </button>
              </div>
              <input
                value={themeDesc}
                onChange={(e) => setThemeDesc(e.target.value)}
                placeholder="Описание темы"
                className={`w-full px-2.5 py-1.5 rounded-xl border outline-none ${btnCls}`}
              />

              <div className="grid grid-cols-3 gap-2">
                <label className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer ${btnCls}`}>
                  <span>Фон 1</span>
                  <input type="color" value={themeBg1} onChange={(e) => setThemeBg1(e.target.value)} className="w-6 h-6 bg-transparent cursor-pointer" />
                </label>
                <label className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer ${btnCls}`}>
                  <span>Фон 2</span>
                  <input type="color" value={themeBg2} onChange={(e) => setThemeBg2(e.target.value)} className="w-6 h-6 bg-transparent cursor-pointer" />
                </label>
                <label className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer ${btnCls}`}>
                  <span>Акцент</span>
                  <input type="color" value={themeAccent} onChange={(e) => setThemeAccent(e.target.value)} className="w-6 h-6 bg-transparent cursor-pointer" />
                </label>
              </div>

              <button
                onClick={() => void handleBuildAndSaveTheme()}
                className="w-full py-2 rounded-xl bg-[var(--luma-accent)] text-white font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Создать и применить тему (SDK v3.0)
              </button>
            </div>

            {/* JSON Importer & Installed Custom Themes */}
            <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">Импорт JSON-темы (.luma-theme.json)</span>
                <label className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${btnCls}`}>
                  <Upload className="w-3 h-3" /> Файл
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload('theme', f);
                    }}
                  />
                </label>
              </div>
              <textarea
                value={themeJson}
                onChange={(e) => setThemeJson(e.target.value)}
                rows={7}
                className={`w-full p-2.5 rounded-xl border font-mono text-[11px] outline-none resize-none ${btnCls}`}
              />
              <button
                onClick={() => void handleImportThemeJson()}
                className="w-full py-2 rounded-xl bg-[var(--luma-accent)] text-white font-bold cursor-pointer"
              >
                Установить тему из JSON
              </button>

              {customThemes.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>
                    Установленные темы разработчиков ({customThemes.length})
                  </div>
                  {customThemes.map((th) => (
                    <div
                      key={th.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${btnCls}`}
                    >
                      <button
                        onClick={() => onApplyTheme(th.id)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: th.accentHex }} />
                        <span className="font-bold truncate">{th.name}</span>
                        {activeThemeKey === th.id && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--luma-accent)] text-white text-[9px] font-mono">
                            Активна
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => exportJsonFile(`${th.id}.luma-theme.json`, th)}
                        title="Экспорт .luma-theme.json"
                        className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => void onDeleteTheme(th.id)}
                        title="Удалить тему"
                        className="p-1 rounded-lg hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PLUGIN STUDIO */}
        {tab === 'plugins' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">Установить плагин из манифеста JSON (API v3.0)</span>
                <label className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${btnCls}`}>
                  <Upload className="w-3 h-3" /> Файл
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload('plugin', f);
                    }}
                  />
                </label>
              </div>
              <textarea
                value={pluginJson}
                onChange={(e) => setPluginJson(e.target.value)}
                rows={12}
                className={`w-full p-2.5 rounded-xl border font-mono text-[11px] outline-none resize-none ${btnCls}`}
              />
              <button
                onClick={() => void handleImportPluginJson()}
                className="w-full py-2 rounded-xl bg-[var(--luma-accent)] text-white font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Зарегистрировать плагин в LumaCore 1.5
              </button>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2.5 ${surfaceCls}`}>
              <div className="font-bold text-sm">Установленные плагины ({plugins.length})</div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
                {plugins.map((pl) => (
                  <div
                    key={pl.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      isDark ? 'bg-black/25 border-white/10' : 'bg-black/[0.03] border-zinc-900/10'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate flex items-center gap-1.5">
                        <span>{pl.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--luma-accent)]/20 text-[var(--luma-accent)]">
                          API {pl.apiVersion || '3.0'}
                        </span>
                      </div>
                      <div className={`text-[10px] truncate ${mutedCls}`}>
                        v{pl.version} · {pl.author || 'Luma'} · {pl.hooks.join(', ')}
                      </div>
                    </div>
                    <button
                      onClick={() => onRunPlugin(pl)}
                      className="px-2 py-1 rounded-lg bg-[var(--luma-accent)] text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3" /> Тест
                    </button>
                    <button
                      onClick={() => exportJsonFile(`${pl.id}.luma-plugin.json`, pl)}
                      title="Экспорт JSON"
                      className={`p-1.5 rounded-lg border cursor-pointer ${btnCls}`}
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => void onDeletePlugin(pl.id)}
                      title="Удалить плагин"
                      className={`p-1.5 rounded-lg border hover:text-rose-400 cursor-pointer ${btnCls}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: API v3.0 DOCS */}
        {tab === 'docs' && (
          <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold text-sm">Открытый JavaScript & REST API v3.0 (window.LumaSDK)</div>
              <button
                onClick={() => copySnippet('sdk', sdkBrowserCode)}
                className={`px-2.5 py-1 rounded-lg border font-semibold inline-flex items-center gap-1 cursor-pointer ${btnCls}`}
              >
                {copied === 'sdk' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Копировать пример
              </button>
            </div>
            <pre className={`p-3 rounded-xl border font-mono text-[11px] overflow-x-auto leading-relaxed ${isDark ? 'bg-black/40 border-white/10 text-indigo-200' : 'bg-zinc-900 text-indigo-200 border-zinc-800'}`}>
              {sdkBrowserCode}
            </pre>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                <div className="font-bold text-[var(--luma-accent)]">GET/POST /api/v3/themes</div>
                <div className={`mt-0.5 ${mutedCls}`}>Регистрация и хранение тем на диске</div>
              </div>
              <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                <div className="font-bold text-[var(--luma-accent)]">GET/POST /api/v3/plugins</div>
                <div className={`mt-0.5 ${mutedCls}`}>Регистрация и запуск плагинов SDK v3.0</div>
              </div>
              <div className={`p-2.5 rounded-xl border ${btnCls}`}>
                <div className="font-bold text-[var(--luma-accent)]">GET /api/v3/sdk</div>
                <div className={`mt-0.5 ${mutedCls}`}>Полный JSON-манифест всех эндпоинтов ОС</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
