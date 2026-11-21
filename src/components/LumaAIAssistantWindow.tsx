import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Settings2,
  Copy,
  Check,
  Terminal,
  Cpu,
  KeyRound,
  Globe,
  Bot,
  User,
  Loader2,
  SlidersHorizontal,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

export type AIProviderId =
  | 'luma_local'
  | 'gemini'
  | 'openai'
  | 'claude'
  | 'deepseek'
  | 'openrouter'
  | 'groq'
  | 'ollama'
  | 'custom';

export interface AIProviderPreset {
  id: AIProviderId;
  label: string;
  badge: string;
  defaultModel: string;
  models: string[];
  defaultBaseUrl: string;
  needsKey: boolean;
  hint: string;
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  {
    id: 'luma_local',
    label: 'Luma AI (Автономный)',
    badge: 'Без API',
    defaultModel: 'luma-nano-1.2',
    models: ['luma-nano-1.2', 'luma-code-1.2'],
    defaultBaseUrl: 'internal://lumanano-1.2',
    needsKey: false,
    hint: 'Встроенный офлайн-движок LumaNano 1.2 внутри ядра: работает без API-ключей и интернета — диагностика ПК, лёгкий код (Python/JS/Go/HTML/SQL/PS), математика, SHA-256, пароли и JSON.',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    badge: 'Cloud',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'],
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    needsKey: true,
    hint: 'Ключ на aistudio.google.com/apikey',
  },
  {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    badge: 'Cloud',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'gpt-4.1'],
    defaultBaseUrl: 'https://api.openai.com/v1',
    needsKey: true,
    hint: 'Ключ на platform.openai.com',
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    badge: 'Cloud',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest'],
    defaultBaseUrl: 'https://api.anthropic.com/v1/messages',
    needsKey: true,
    hint: 'Ключ на console.anthropic.com',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    badge: 'Fast',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    needsKey: true,
    hint: 'Ключ на platform.deepseek.com',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (100+ моделей)',
    badge: 'Multi',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
    models: [
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o-mini',
    ],
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    needsKey: true,
    hint: 'Есть бесплатные модели (:free) на openrouter.ai',
  },
  {
    id: 'groq',
    label: 'Groq (Ultra-Fast)',
    badge: 'LPU',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    needsKey: true,
    hint: 'Мгновенная генерация на console.groq.com',
  },
  {
    id: 'ollama',
    label: 'Ollama / LM Studio',
    badge: 'Локально',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'qwen2.5:7b', 'deepseek-r1:8b', 'gemma3:4b', 'mistral'],
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    needsKey: false,
    hint: 'Локальная LLM без API-ключа (порт 11434 / 1234)',
  },
  {
    id: 'custom',
    label: 'Свой API (OpenAI-совм.)',
    badge: 'Custom',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini'],
    defaultBaseUrl: '',
    needsKey: false,
    hint: 'Любой OpenAI-совместимый сервер (/v1/chat/completions)',
  },
];

export interface LumaAIConfig {
  provider: AIProviderId;
  apiKeys: Partial<Record<AIProviderId, string>>;
  models: Partial<Record<AIProviderId, string>>;
  baseUrls: Partial<Record<AIProviderId, string>>;
  systemPrompt: string;
  temperature: number;
  includeSystemContext: boolean;
}

export const DEFAULT_LUMA_AI_CONFIG: LumaAIConfig = {
  provider: 'luma_local',
  apiKeys: {},
  models: {},
  baseUrls: {},
  systemPrompt:
    'Ты — встроенный системный ИИ-ассистент Luma OS 1.2.0 (Lithium). Отвечай чётко, структурированно и на языке пользователя.',
  temperature: 0.7,
  includeSystemContext: true,
};

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  model?: string;
}

interface ChatThread {
  id: string;
  title: string;
  messages: ChatMsg[];
  updatedAt: string;
}

const THREADS_KEY = 'luma_ai_threads_v1';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: {
      isFinal: boolean;
      [j: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface LumaAIAssistantWindowProps {
  isDark: boolean;
  surfaceCls: string;
  btnCls: string;
  mutedCls: string;
  locale?: string;
  config: LumaAIConfig;
  onChangeConfig: (next: LumaAIConfig) => void;
  onRunInTerminal?: (cmd: string) => void;
  onPushToast: (title: string, message: string, level?: 'info' | 'success' | 'warning') => void;
}

export const LumaAIAssistantWindow: React.FC<LumaAIAssistantWindowProps> = ({
  isDark,
  surfaceCls,
  btnCls,
  mutedCls,
  locale = 'ru-RU',
  config,
  onChangeConfig,
  onRunInTerminal,
  onPushToast,
}) => {
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const raw = localStorage.getItem(THREADS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 't_welcome',
        title: 'Новый чат',
        updatedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        messages: [],
      },
    ];
  });
  const [activeThreadId, setActiveThreadId] = useState<string>(threads[0]?.id || 't_welcome');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voice Input & Speech Synthesis TTS state
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const preset = AI_PROVIDER_PRESETS.find((p) => p.id === config.provider) || AI_PROVIDER_PRESETS[0];
  const currentKey = config.apiKeys[config.provider] || '';
  const currentModel = config.models[config.provider] || preset.defaultModel;
  const currentBaseUrl = config.baseUrls[config.provider] ?? preset.defaultBaseUrl;

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  useEffect(() => {
    try {
      localStorage.setItem(THREADS_KEY, JSON.stringify(threads.slice(0, 20)));
    } catch {
      // ignore
    }
  }, [threads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages.length, loading]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const speakText = (text: string, msgId?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onPushToast('Luma AI Голос', 'Синтез речи не поддерживается браузером', 'warning');
      return;
    }
    try {
      if (msgId && speakingId === msgId) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      window.speechSynthesis.cancel();
      // Strip markdown code blocks for cleaner speech
      const clean = text.replace(/```[\s\S]*?```/g, ' (блок кода) ').replace(/[*#`_]/g, '').slice(0, 900);
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = locale;
      utter.rate = 1.02;
      utter.onend = () => setSpeakingId(null);
      utter.onerror = () => setSpeakingId(null);
      setSpeakingId(msgId || 'auto');
      window.speechSynthesis.speak(utter);
    } catch {
      setSpeakingId(null);
    }
  };

  const toggleVoiceInput = () => {
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      onPushToast(
        'Голосовой ввод',
        'Web Speech API недоступен в этом движке. В Windows WebView2 (Edge/Chromium) голосовой ввод работает нативно.',
        'warning'
      );
      return;
    }

    try {
      const rec = new SR();
      rec.lang = locale;
      rec.continuous = false;
      rec.interimResults = true;
      let finalTranscript = '';

      rec.onresult = (ev) => {
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const piece = ev.results[i][0]?.transcript || '';
          if (ev.results[i].isFinal) {
            finalTranscript += piece;
          } else {
            interim += piece;
          }
        }
        setInput((finalTranscript + interim).trim());
      };

      rec.onerror = (ev) => {
        setListening(false);
        if (ev.error !== 'aborted' && ev.error !== 'no-speech') {
          onPushToast('Голосовой ввод', `Ошибка микрофона: ${ev.error}`, 'warning');
        }
      };

      rec.onend = () => {
        setListening(false);
      };

      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
      onPushToast('Голосовой ввод', 'Не удалось запустить микрофон', 'warning');
    }
  };

  const createNewThread = () => {
    const id = `t_${Date.now()}`;
    const nt: ChatThread = {
      id,
      title: 'Новый чат',
      updatedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      messages: [],
    };
    setThreads((prev) => [nt, ...prev]);
    setActiveThreadId(id);
    setShowConfig(false);
  };

  const deleteThread = (id: string) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh: ChatThread = { id: `t_${Date.now()}`, title: 'Новый чат', updatedAt: 'сейчас', messages: [] };
        setActiveThreadId(fresh.id);
        return [fresh];
      }
      if (activeThreadId === id) setActiveThreadId(next[0].id);
      return next;
    });
  };

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || loading || !activeThread) return;

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
    }

    const userMsg: ChatMsg = {
      id: `m_${Date.now()}`,
      role: 'user',
      content,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...activeThread.messages, userMsg];
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? {
              ...t,
              title: t.messages.length === 0 ? content.slice(0, 32) : t.title,
              updatedAt: userMsg.time,
              messages: updatedMessages,
            }
          : t
      )
    );
    setInput('');
    setLoading(true);

    try {
      const r = await fetch('/api/kernel/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          api_key: currentKey,
          base_url: currentBaseUrl,
          model: currentModel,
          system_prompt: config.systemPrompt,
          temperature: config.temperature,
          include_context: config.includeSystemContext,
          messages: updatedMessages.slice(-16).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await r.json();
      const replyText = data?.ok
        ? data.reply
        : `Ошибка (${preset.label}): ${data?.error || 'Не удалось получить ответ'}.\n\nСовет: переключитесь на «Luma AI (Автономный · Без API)» — он работает без API-ключей прямо из ядра LumaCore 1.2!`;
      const botMsg: ChatMsg = {
        id: `m_${Date.now()}_a`,
        role: 'assistant',
        content: replyText,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        model: data?.model || currentModel,
      };
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThread.id ? { ...t, messages: [...t.messages, botMsg] } : t))
      );
      if (data?.ok && autoSpeak) {
        speakText(replyText, botMsg.id);
      }
      if (!data?.ok) {
        onPushToast('Luma AI', data?.error || 'Требуется настройка провайдера', 'warning');
      }
    } catch {
      onPushToast('Luma AI', 'Нет ответа от шлюза LumaCore 1.2', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (msg: ChatMsg) => {
    const parts = msg.content.split(/(```[\s\S]*?```)/g);
    return (
      <div className="space-y-2 text-xs leading-relaxed whitespace-pre-wrap break-words">
        {parts.map((part, idx) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const raw = part.slice(3, -3);
            const firstNl = raw.indexOf('\n');
            const lang = firstNl > 0 ? raw.slice(0, firstNl).trim() : '';
            const code = firstNl > 0 ? raw.slice(firstNl + 1) : raw;
            const blockId = `${msg.id}_${idx}`;
            const isShell = ['bash', 'sh', 'cmd', 'powershell', 'ps1', 'shell', ''].includes(lang.toLowerCase());
            return (
              <div
                key={idx}
                className={`rounded-xl border overflow-hidden font-mono text-[11px] ${
                  isDark ? 'bg-black/50 border-white/10' : 'bg-zinc-900 text-zinc-100 border-zinc-700'
                }`}
              >
                <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>{lang || 'code'}</span>
                  <div className="flex items-center gap-1.5">
                    {isShell && onRunInTerminal && (
                      <button
                        onClick={() => onRunInTerminal(code.trim().split('\n')[0])}
                        className="px-2 py-0.5 rounded bg-[var(--luma-accent)]/25 text-[var(--luma-accent)] hover:bg-[var(--luma-accent)] hover:text-white inline-flex items-center gap-1 cursor-pointer transition"
                      >
                        <Terminal className="w-3 h-3" />
                        В терминал
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(code).catch(() => {});
                        setCopiedId(blockId);
                        setTimeout(() => setCopiedId(null), 1200);
                      }}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === blockId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedId === blockId ? 'OK' : 'Копия'}
                    </button>
                  </div>
                </div>
                <pre className="p-3 overflow-x-auto text-zinc-100">{code}</pre>
              </div>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex min-h-0">
      {/* Left Threads Rail */}
      <aside
        className={`w-48 sm:w-56 shrink-0 border-r p-2.5 flex flex-col gap-2 ${
          isDark ? 'border-white/[0.08] bg-black/20' : 'border-zinc-900/10 bg-black/[0.03]'
        }`}
      >
        <button
          onClick={createNewThread}
          className="w-full py-2 px-3 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Новый диалог
        </button>

        {/* Quick 1-click toggle to Offline LumaNano 1.2 */}
        <button
          onClick={() => {
            onChangeConfig({ ...config, provider: 'luma_local' });
            onPushToast('Luma AI', 'Включён встроенный автономный движок LumaNano 1.2 (без API)', 'success');
          }}
          className={`w-full py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition ${
            config.provider === 'luma_local'
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
              : btnCls
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Автономный (без API)</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {threads.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                setActiveThreadId(t.id);
                setShowConfig(false);
              }}
              className={`group px-2.5 py-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-1.5 transition ${
                t.id === activeThread?.id && !showConfig
                  ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] font-semibold'
                  : btnCls
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate">{t.title}</div>
                <div className={`text-[10px] font-mono ${mutedCls}`}>{t.messages.length} сообщ.</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteThread(t.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Active Provider Pill */}
        <button
          onClick={() => setShowConfig((v) => !v)}
          className={`p-2.5 rounded-xl border text-left space-y-1 cursor-pointer transition ${
            showConfig ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : btnCls
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono uppercase">
            <span className="text-[var(--luma-accent)] font-bold truncate">{preset.label}</span>
            <Settings2 className="w-3 h-3 shrink-0" />
          </div>
          <div className="text-[11px] font-mono truncate opacity-80">{currentModel}</div>
          <div className={`text-[10px] ${preset.needsKey && !currentKey ? 'text-amber-500' : 'text-emerald-500'}`}>
            {preset.needsKey ? (currentKey ? 'API-ключ задан' : 'Нужен API-ключ') : 'Без ключа · Готов'}
          </div>
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header Bar */}
        <div
          className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 ${
            isDark ? 'border-white/[0.08]' : 'border-zinc-900/10'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-[var(--luma-accent)] shrink-0" />
            <span className="text-xs font-bold truncate">{preset.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${btnCls}`}>{currentModel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (autoSpeak) window.speechSynthesis?.cancel();
                setAutoSpeak((v) => !v);
              }}
              className={`px-2.5 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1 cursor-pointer ${
                autoSpeak
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-semibold'
                  : btnCls
              }`}
              title="Автоматически озвучивать ответы Luma AI голосом"
            >
              {autoSpeak ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              <span className="hidden md:inline">Озвучка</span>
            </button>
            <button
              onClick={() => onChangeConfig({ ...config, includeSystemContext: !config.includeSystemContext })}
              className={`px-2.5 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1 cursor-pointer ${
                config.includeSystemContext
                  ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                  : btnCls
              }`}
              title="Передавать ИИ живую телеметрию ПК (CPU/RAM/ОС)"
            >
              <Cpu className="w-3 h-3" />
              <span className="hidden sm:inline">Контекст ПК</span>
            </button>
            <button
              onClick={() => setShowConfig((v) => !v)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                showConfig ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Модель
            </button>
          </div>
        </div>

        {showConfig ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
              <div className="text-xs font-bold">Выберите нейросеть (встроенная без API или облачная)</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AI_PROVIDER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onChangeConfig({ ...config, provider: p.id })}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      config.provider === p.id
                        ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]'
                        : btnCls
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{p.label}</div>
                    <div className={`text-[10px] font-mono ${p.id === 'luma_local' ? 'text-emerald-400 font-bold' : mutedCls}`}>
                      {p.badge}
                    </div>
                  </button>
                ))}
              </div>
              <div className={`text-[11px] ${mutedCls}`}>{preset.hint}</div>
            </div>

            <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="space-y-1">
                  <span className={`text-[11px] font-mono flex items-center gap-1 ${mutedCls}`}>
                    <KeyRound className="w-3 h-3" />
                    API-ключ ({preset.label})
                  </span>
                  <input
                    type="password"
                    disabled={config.provider === 'luma_local'}
                    value={currentKey}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        apiKeys: { ...config.apiKeys, [config.provider]: e.target.value },
                      })
                    }
                    placeholder={
                      config.provider === 'luma_local'
                        ? 'Не требуется — работает автономно!'
                        : preset.needsKey
                        ? 'Вставьте API-ключ...'
                        : 'Опционально для локального сервера'
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none disabled:opacity-55 ${btnCls}`}
                  />
                </label>

                <label className="space-y-1">
                  <span className={`text-[11px] font-mono flex items-center gap-1 ${mutedCls}`}>
                    <Bot className="w-3 h-3" />
                    Модель
                  </span>
                  <input
                    value={currentModel}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        models: { ...config.models, [config.provider]: e.target.value },
                      })
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
                  />
                </label>
              </div>

              {/* Quick Model Chips */}
              <div className="flex flex-wrap gap-1.5">
                {preset.models.map((m) => (
                  <button
                    key={m}
                    onClick={() =>
                      onChangeConfig({ ...config, models: { ...config.models, [config.provider]: m } })
                    }
                    className={`px-2 py-1 rounded-lg border text-[10px] font-mono cursor-pointer ${
                      currentModel === m ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {config.provider !== 'luma_local' && (
                <label className="block space-y-1 text-xs">
                  <span className={`text-[11px] font-mono flex items-center gap-1 ${mutedCls}`}>
                    <Globe className="w-3 h-3" />
                    Base URL (API Endpoint)
                  </span>
                  <input
                    value={currentBaseUrl}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        baseUrls: { ...config.baseUrls, [config.provider]: e.target.value },
                      })
                    }
                    placeholder={preset.defaultBaseUrl || 'https://your-endpoint.com/v1'}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
                  />
                </label>
              )}

              <label className="block space-y-1 text-xs">
                <span className={`text-[11px] font-mono ${mutedCls}`}>Системный промпт</span>
                <textarea
                  rows={2}
                  value={config.systemPrompt}
                  onChange={(e) => onChangeConfig({ ...config, systemPrompt: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${btnCls}`}
                />
              </label>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className={mutedCls}>Температура: {config.temperature.toFixed(1)}</span>
                  <input
                    type="range"
                    min={0}
                    max={1.4}
                    step={0.1}
                    value={config.temperature}
                    onChange={(e) => onChangeConfig({ ...config, temperature: Number(e.target.value) })}
                    className="w-28 accent-[var(--luma-accent)]"
                  />
                </div>
                <button
                  onClick={() => {
                    setShowConfig(false);
                    onPushToast('Luma AI', `Активна модель: ${preset.label} (${currentModel})`, 'success');
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold cursor-pointer"
                >
                  Сохранить и вернуться в чат
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeThread?.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base font-extrabold">Luma AI · {preset.label}</div>
                    <div className={`text-xs mt-1 ${mutedCls}`}>
                      Работает из коробки без API-ключей (движок LumaNano 1.2 + голосовой ввод), а также поддерживает Gemini, OpenAI, Claude, DeepSeek, Groq и Ollama.
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    {[
                      'Диагностика ПК и текущая нагрузка системы',
                      'Напиши код на Python для быстрого HTTP-сервера',
                      'Напиши HTML/CSS карточку с эффектом стекла',
                      'Сгенерируй надёжный пароль и UUID',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => void sendMessage(prompt)}
                        className={`p-2.5 rounded-xl border text-left text-[11px] leading-snug cursor-pointer transition hover:border-[var(--luma-accent)] ${btnCls}`}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                activeThread?.messages.map((m) => (
                  <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-xl bg-[var(--luma-accent)] text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 border ${
                        m.role === 'user'
                          ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white'
                          : surfaceCls
                      }`}
                    >
                      {renderMessageContent(m)}
                      <div
                        className={`mt-1.5 flex items-center justify-between gap-3 text-[9px] font-mono ${
                          m.role === 'user' ? 'text-white/75 justify-end' : mutedCls
                        }`}
                      >
                        <span>
                          {m.time} {m.model ? `· ${m.model}` : ''}
                        </span>
                        {m.role === 'assistant' && (
                          <button
                            onClick={() => speakText(m.content, m.id)}
                            title="Озвучить ответ"
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer ${
                              speakingId === m.id ? 'text-emerald-400' : ''
                            }`}
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {m.role === 'user' && (
                      <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${btnCls}`}>
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-[var(--luma-accent)] font-mono">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{preset.label} генерирует ответ...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Composer with Voice Input Mic */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage();
              }}
              className={`p-3 border-t flex items-center gap-2 ${
                isDark ? 'border-white/[0.08]' : 'border-zinc-900/10'
              }`}
            >
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={listening ? 'Остановить запись голоса' : `Голосовой ввод (${locale})`}
                className={`p-2.5 rounded-xl border cursor-pointer transition shrink-0 ${
                  listening
                    ? 'bg-rose-500 border-rose-400 text-white animate-pulse shadow-lg shadow-rose-500/30'
                    : btnCls
                }`}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? 'Говорите в микрофон...' : `Спросите ${preset.label} (или нажмите микрофон)...`}
                className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs outline-none ${btnCls}`}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                Отправить
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
