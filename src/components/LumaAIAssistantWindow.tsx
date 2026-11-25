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
  Code2,
  BookOpen,
  Power,
  ExternalLink,
  Brain,
  ChevronDown,
  CheckCircle2,
  Download,
  HardDrive,
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

export type LocalAIMode = 'auto' | 'language' | 'code';

export interface AISourceLinkItem {
  title: string;
  url: string;
  provider: string;
  snippet?: string;
}

export interface AIThinkingStepItem {
  step: number;
  title: string;
  detail: string;
  duration_ms: number;
  status: string;
}

export interface AIExecutedActionItem {
  id: string;
  tool: string;
  label: string;
  status: string;
  detail: string;
}

export interface AIUIActionItem {
  type: string;
  target?: string;
  value?: unknown;
  label: string;
}

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
    label: 'Luma Ai Nitrogen (Ollama · RAG Память · ОС · Офис · Календарь)',
    badge: 'Nitrogen',
    defaultModel: 'qwen2.5:3b',
    models: ['qwen2.5:3b', 'llama3.2:3b', 'luma-nitrogen-core', 'gemini-2.5-flash-lite'],
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    needsKey: false,
    hint: 'Модульный ассистент Luma Ai Nitrogen с потоковым выводом (SSE), трёхуровневой долговременной памятью (SQLite + Vector RAG), локальным Ollama (Qwen 2.5 3B / Llama 3.2 3B), поддержкой любых OpenAI API и интеграцией с Системой, Офисом, Календарём и «Обвести для поиска».',
  },
  {
    id: 'ollama',
    label: 'Локальный Ollama / LM Studio',
    badge: 'Локально',
    defaultModel: 'qwen2.5:3b',
    models: ['qwen2.5:3b', 'llama3.2:3b', 'qwen2.5:7b', 'deepseek-r1:8b', 'gemma3:4b', 'mistral'],
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    needsKey: false,
    hint: 'Локальная нейросеть без API-ключа (Ollama :11434 или LM Studio :1234). Нажмите «Установить ИИ», чтобы скачать автоматически.',
  },
  {
    id: 'gemini',
    label: 'Google Gemini Flash-Lite',
    badge: 'Cloud',
    defaultModel: 'gemini-2.5-flash-lite',
    models: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
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
    id: 'custom',
    label: 'Свой API (OpenAI-совм.)',
    badge: 'Custom',
    defaultModel: 'qwen2.5:3b',
    models: ['qwen2.5:3b', 'llama3.2:3b', 'gpt-4o-mini'],
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    needsKey: false,
    hint: 'Любой OpenAI-совместимый сервер (/v1/chat/completions) — просто задайте BASE_URL, API_KEY и MODEL_NAME',
  },
];

export interface LumaAIConfig {
  provider: AIProviderId;
  aiMode?: LocalAIMode;
  verbosity?: 'brief' | 'balanced' | 'detailed';
  apiKeys: Partial<Record<AIProviderId, string>>;
  models: Partial<Record<AIProviderId, string>>;
  baseUrls: Partial<Record<AIProviderId, string>>;
  systemPrompt: string;
  temperature: number;
  includeSystemContext: boolean;
}

export type AIVerbosity = 'brief' | 'balanced' | 'detailed';

export const DEFAULT_LUMA_AI_CONFIG: LumaAIConfig = {
  provider: 'luma_local',
  aiMode: 'auto',
  verbosity: 'balanced',
  apiKeys: {},
  models: {},
  baseUrls: {},
  systemPrompt:
    'Ты — Luma Ai Nitrogen, универсальный личный ассистент, программист и помощник в Luma OS 1.6.3 (Nitrogen · N-7). Отвечай чётко, без воды, с Markdown-кодом, используй долговременную память и помогай с системой, Офисом, Календарём и поиском.',
  temperature: 0.7,
  includeSystemContext: true,
};

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  model?: string;
  sources?: AISourceLinkItem[];
  thinkingSteps?: AIThinkingStepItem[];
  actions?: AIExecutedActionItem[];
  elapsedMs?: number;
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
  aiEnabled?: boolean;
  onToggleAiEnabled?: (next: boolean) => void;
  config: LumaAIConfig;
  onChangeConfig: (next: LumaAIConfig) => void;
  onRunInTerminal?: (cmd: string) => void;
  onPushToast: (title: string, message: string, level?: 'info' | 'success' | 'warning') => void;
}

export const LumaAIAssistantWindow: React.FC<LumaAIAssistantWindowProps> = React.memo(({
  isDark,
  surfaceCls,
  btnCls,
  mutedCls,
  locale = 'ru-RU',
  aiEnabled = true,
  onToggleAiEnabled,
  config,
  onChangeConfig,
  onRunInTerminal,
  onPushToast,
}) => {
  const [autonomousAgent, setAutonomousAgent] = useState<boolean>(true);
  const [universalWebSearch, setUniversalWebSearch] = useState<boolean>(true);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
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
  const [showMemory, setShowMemory] = useState(false);
  const [memoryStore, setMemoryStore] = useState<{
    user_name?: string;
    user_city?: string;
    facts: { id: string; key: string; value: string; created_at: string }[];
  }>({ facts: [] });
  const [newFactInput, setNewFactInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAiManager, setShowAiManager] = useState(false);
  const [installModelChoice, setInstallModelChoice] = useState<'qwen2.5:3b' | 'llama3.2:3b'>('qwen2.5:3b');
  const [aiManageState, setAiManageState] = useState<{
    installed?: boolean;
    enabled?: boolean;
    ollama_installed?: boolean;
    ollama_running?: boolean;
    python_service_online?: boolean;
    installed_models?: string[];
    installing?: boolean;
    progress?: number;
    step?: string;
    message?: string;
    active_model?: string;
    base_url?: string;
  } | null>(null);

  const fetchAiManageStatus = async () => {
    try {
      const r = await fetch('/api/kernel/ai/manage');
      if (r.ok) {
        const d = await r.json();
        setAiManageState(d);
      }
    } catch {
      /* ignore */
    }
  };

  const runAiManageAction = async (action: 'install' | 'uninstall' | 'enable' | 'disable', model?: string) => {
    try {
      const r = await fetch('/api/kernel/ai/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, model: model || installModelChoice }),
      });
      const d = await r.json();
      setAiManageState(d);
      if (action === 'install') {
        onPushToast('Luma Ai Nitrogen', d?.message || `Запущена загрузка ${model || installModelChoice}...`, 'info');
        if (onToggleAiEnabled && !aiEnabled) onToggleAiEnabled(true);
      } else if (action === 'uninstall') {
        onPushToast('Удаление ИИ', d?.message || 'Модели ИИ удалены, место на диске освобождено', 'success');
        if (onToggleAiEnabled) onToggleAiEnabled(false);
      } else if (action === 'enable') {
        if (onToggleAiEnabled) onToggleAiEnabled(true);
      }
    } catch {
      onPushToast('Luma Ai Nitrogen', 'Не удалось выполнить операцию управления ИИ', 'warning');
    }
  };

  const loadAIMemory = async () => {
    try {
      const r = await fetch('/api/kernel/ai/memory');
      const d = await r.json();
      if (d?.ok && d?.memory) {
        setMemoryStore({
          user_name: d.memory.user_name || '',
          user_city: d.memory.user_city || '',
          facts: Array.isArray(d.memory.facts) ? d.memory.facts : [],
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadAIMemory();
    void fetchAiManageStatus();
  }, []);

  useEffect(() => {
    if (!aiManageState?.installing) return;
    const id = window.setInterval(() => {
      void fetchAiManageStatus();
    }, 1500);
    return () => window.clearInterval(id);
  }, [aiManageState?.installing]);

  const addAIMemoryFactUI = async () => {
    const val = newFactInput.trim();
    if (!val) return;
    try {
      const r = await fetch('/api/kernel/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', key: 'note', value: val }),
      });
      const d = await r.json();
      if (d?.ok && d?.memory) {
        setMemoryStore({
          user_name: d.memory.user_name || '',
          user_city: d.memory.user_city || '',
          facts: Array.isArray(d.memory.facts) ? d.memory.facts : [],
        });
        setNewFactInput('');
        onPushToast('Память Luma Ai Nitrogen', 'Факт сохранён в долговременную память', 'success');
      }
    } catch {
      // ignore
    }
  };

  const deleteAIMemoryFactUI = async (id: string) => {
    try {
      const r = await fetch('/api/kernel/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: id === 'all' ? 'clear' : 'delete', id }),
      });
      const d = await r.json();
      if (d?.ok && d?.memory) {
        setMemoryStore({
          user_name: d.memory.user_name || '',
          user_city: d.memory.user_city || '',
          facts: Array.isArray(d.memory.facts) ? d.memory.facts : [],
        });
      }
    } catch {
      // ignore
    }
  };

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
      onPushToast('Luma Ai Nitrogen Голос', 'Синтез речи не поддерживается браузером', 'warning');
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

  const syncNitrogenBackendConfig = async () => {
    try {
      await fetch('/api/kernel/ai/nitrogen/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: currentBaseUrl || 'http://127.0.0.1:11434/v1',
          api_key: currentKey || 'ollama',
          model_name: currentModel || 'qwen2.5:3b',
          temperature: config.temperature,
          system_prompt: config.systemPrompt,
        }),
      });
    } catch {
      /* ignore */
    }
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
    const targetThreadId = activeThread.id;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === targetThreadId
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

    // Use true SSE Token Streaming via Luma Ai Nitrogen gateway for Nitrogen/Ollama/OpenAI-compatible providers
    const useNitrogenStream =
      config.provider === 'luma_local' ||
      config.provider === 'ollama' ||
      config.provider === 'custom' ||
      config.provider === 'groq' ||
      config.provider === 'openrouter' ||
      config.provider === 'openai' ||
      config.provider === 'deepseek';

    if (useNitrogenStream) {
      const botId = `m_${Date.now()}_a`;
      const botTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const initialBot: ChatMsg = {
        id: botId,
        role: 'assistant',
        content: '',
        time: botTime,
        model: `Luma Ai Nitrogen (${currentModel})`,
      };
      setThreads((prev) =>
        prev.map((t) => (t.id === targetThreadId ? { ...t, messages: [...t.messages, initialBot] } : t))
      );

      try {
        const res = await fetch('/api/kernel/ai/nitrogen/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: targetThreadId,
            message: content,
            history: updatedMessages.slice(-16).map((m) => ({ role: m.role, content: m.content })),
            base_url: currentBaseUrl,
            api_key: currentKey,
            model: currentModel,
            mode: config.aiMode || 'auto',
            verbosity: config.verbosity || 'balanced',
            temperature: config.temperature,
            system_prompt: config.systemPrompt,
            stream: true,
          }),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let fullText = '';
          let modelLabel = `Luma Ai Nitrogen (${currentModel})`;
          let sourcesList: AISourceLinkItem[] | undefined;
          let thinkingList: AIThinkingStepItem[] | undefined;
          let actionsList: AIExecutedActionItem[] | undefined;
          let elapsedMs: number | undefined;

          const patchBot = () => {
            setThreads((prev) =>
              prev.map((t) =>
                t.id === targetThreadId
                  ? {
                      ...t,
                      messages: t.messages.map((m) =>
                        m.id === botId
                          ? {
                              ...m,
                              content: fullText,
                              model: modelLabel,
                              sources: sourcesList,
                              thinkingSteps: thinkingList,
                              actions: actionsList,
                              elapsedMs,
                            }
                          : m
                      ),
                    }
                  : t
              )
            );
          };

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const rawLine of lines) {
              if (!rawLine.startsWith('data:')) continue;
              try {
                const ev = JSON.parse(rawLine.slice(5).trim());
                if (ev.type === 'token' && ev.content) {
                  fullText += String(ev.content);
                  patchBot();
                } else if (ev.type === 'tool_result' && ev.tool) {
                  if (String(ev.tool).includes('calendar')) {
                    window.dispatchEvent(new Event('luma-calendar-updated'));
                  }
                } else if (ev.type === 'done') {
                  if (ev.reply && !fullText) fullText = String(ev.reply);
                  if (ev.model) modelLabel = String(ev.model);
                  if (Array.isArray(ev.sources) && ev.sources.length > 0) sourcesList = ev.sources;
                  if (Array.isArray(ev.thinking_steps) && ev.thinking_steps.length > 0) thinkingList = ev.thinking_steps;
                  if (Array.isArray(ev.actions) && ev.actions.length > 0) actionsList = ev.actions;
                  if (typeof ev.elapsed_ms === 'number') elapsedMs = ev.elapsed_ms;
                  if (Array.isArray(ev.ui_actions) && ev.ui_actions.length > 0) {
                    window.dispatchEvent(new CustomEvent('luma-ai-agent-actions', { detail: ev.ui_actions }));
                  }
                  if (ev.calendar_updated) {
                    window.dispatchEvent(new Event('luma-calendar-updated'));
                  }
                  patchBot();
                }
              } catch {
                /* ignore malformed SSE chunk */
              }
            }
          }

          if (!fullText.trim()) {
            fullText = 'Готово! Запрос обработан Luma Ai Nitrogen.';
            patchBot();
          }
          void loadAIMemory();
          if (autoSpeak) speakText(fullText, botId);
          setLoading(false);
          return;
        }
      } catch {
        // Remove empty placeholder and fall through to /api/kernel/ai/chat fallback
        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetThreadId ? { ...t, messages: t.messages.filter((m) => m.id !== botId) } : t
          )
        );
      }
    }

    try {
      const r = await fetch('/api/kernel/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          mode: config.aiMode || 'auto',
          verbosity: config.verbosity || 'balanced',
          api_key: currentKey,
          base_url: currentBaseUrl,
          model: currentModel,
          system_prompt: config.systemPrompt,
          temperature: config.temperature,
          include_context: config.includeSystemContext,
          autonomous: autonomousAgent,
          web_search: universalWebSearch,
          messages: updatedMessages.slice(-16).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await r.json();
      const replyText = data?.ok
        ? data.reply
        : `Ошибка (${preset.label}): ${data?.error || 'Не удалось получить ответ'}.\n\nСовет: используйте **Luma Ai Nitrogen** (Ollama Qwen 2.5 3B / Llama 3.2 3B или встроенный режим без API-ключей).`;
      const sourcesList: AISourceLinkItem[] | undefined =
        Array.isArray(data?.sources) && data.sources.length > 0 ? data.sources : undefined;
      const thinkingList: AIThinkingStepItem[] | undefined =
        Array.isArray(data?.thinking_steps) && data.thinking_steps.length > 0 ? data.thinking_steps : undefined;
      const actionsList: AIExecutedActionItem[] | undefined =
        Array.isArray(data?.actions) && data.actions.length > 0 ? data.actions : undefined;
      if (Array.isArray(data?.ui_actions) && data.ui_actions.length > 0) {
        window.dispatchEvent(new CustomEvent('luma-ai-agent-actions', { detail: data.ui_actions }));
      }
      const botMsg: ChatMsg = {
        id: `m_${Date.now()}_a`,
        role: 'assistant',
        content: replyText,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        model: data?.model || currentModel,
        sources: sourcesList,
        thinkingSteps: thinkingList,
        actions: actionsList,
        elapsedMs: typeof data?.elapsed_ms === 'number' ? data.elapsed_ms : undefined,
      };
      setThreads((prev) =>
        prev.map((t) => (t.id === targetThreadId ? { ...t, messages: [...t.messages, botMsg] } : t))
      );
      void loadAIMemory();
      if (data?.ok && autoSpeak) {
        speakText(replyText, botMsg.id);
      }
      if (!data?.ok) {
        onPushToast('Luma Ai Nitrogen', data?.error || 'Требуется настройка провайдера', 'warning');
      }
    } catch {
      onPushToast('Luma Ai Nitrogen', 'Нет ответа от шлюза LumaCore 1.5.3', 'warning');
    } finally {
      setLoading(false);
    }
  };

  // Listen for external "luma-ai-ask" requests (e.g. from Quick Look, Explorer, Office, Code Studio)
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;
  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ prompt?: string }>).detail;
      if (detail?.prompt) {
        void sendMessageRef.current(detail.prompt);
      }
    };
    window.addEventListener('luma-ai-ask', handler);
    return () => window.removeEventListener('luma-ai-ask', handler);
  }, []);

  // Full inline Markdown formatter (**bold**, *italic*, `inline code`)
  const renderInlineMarkdown = (line: string, keyPrefix: string, isUserBubble: boolean) => {
    const tokens = line.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
    return tokens.map((tok, i) => {
      if (tok.startsWith('`') && tok.endsWith('`') && tok.length >= 2) {
        return (
          <code
            key={`${keyPrefix}_${i}`}
            className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] ${
              isUserBubble
                ? 'bg-black/25 text-white'
                : isDark
                ? 'bg-white/10 text-emerald-300 border border-white/10'
                : 'bg-zinc-900/10 text-zinc-900 border border-zinc-900/10'
            }`}
          >
            {tok.slice(1, -1)}
          </code>
        );
      }
      if (tok.startsWith('**') && tok.endsWith('**') && tok.length >= 4) {
        return (
          <strong key={`${keyPrefix}_${i}`} className="font-extrabold">
            {tok.slice(2, -2)}
          </strong>
        );
      }
      if (tok.startsWith('*') && tok.endsWith('*') && tok.length >= 2) {
        return (
          <em key={`${keyPrefix}_${i}`} className="italic opacity-90">
            {tok.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={`${keyPrefix}_${i}`}>{tok}</React.Fragment>;
    });
  };

  const renderMarkdownSegment = (text: string, segIdx: number, isUserBubble: boolean) => {
    const lines = text.split('\n');
    return (
      <div key={`md_${segIdx}`} className="space-y-1">
        {lines.map((rawLine, li) => {
          const line = rawLine.trimEnd();
          if (line.trim() === '') return <div key={li} className="h-1" />;
          if (line.startsWith('### ')) {
            return (
              <div key={li} className="text-[13px] font-extrabold tracking-tight pt-0.5 text-[var(--luma-accent)]">
                {renderInlineMarkdown(line.slice(4), `${segIdx}_${li}`, isUserBubble)}
              </div>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <div key={li} className="text-sm font-black tracking-tight pt-0.5">
                {renderInlineMarkdown(line.slice(3), `${segIdx}_${li}`, isUserBubble)}
              </div>
            );
          }
          if (/^[-*•]\s+/.test(line.trimStart())) {
            const body = line.trimStart().replace(/^[-*•]\s+/, '');
            return (
              <div key={li} className="flex items-start gap-2 pl-1">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--luma-accent)] shrink-0" />
                <span className="flex-1">{renderInlineMarkdown(body, `${segIdx}_${li}`, isUserBubble)}</span>
              </div>
            );
          }
          const numMatch = line.trimStart().match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={li} className="flex items-start gap-2 pl-1">
                <span className="font-mono text-[11px] font-bold text-[var(--luma-accent)] shrink-0">
                  {numMatch[1]}.
                </span>
                <span className="flex-1">{renderInlineMarkdown(numMatch[2], `${segIdx}_${li}`, isUserBubble)}</span>
              </div>
            );
          }
          return (
            <p key={li} className="leading-relaxed">
              {renderInlineMarkdown(line, `${segIdx}_${li}`, isUserBubble)}
            </p>
          );
        })}
      </div>
    );
  };

  const openVerifiedSource = (url: string) => {
    if (!url || !url.startsWith('http')) return;
    void fetch('/api/kernel/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: `src_${Date.now()}`, name: url, url, target: url, type: 'web' }),
    }).catch(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  };

  const renderMessageContent = (msg: ChatMsg) => {
    const parts = msg.content.split(/(```[\s\S]*?```)/g);
    const isUserBubble = msg.role === 'user';
    const isThinkingOpen = Boolean(expandedThinking[msg.id]);
    return (
      <div className="space-y-2 text-xs leading-relaxed break-words">
        {/* Luma AI 5.0 Collapsible Chain-of-Thought (Ход мыслей) */}
        {!isUserBubble && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-indigo-500/[0.07] border-indigo-400/25' : 'bg-indigo-50/80 border-indigo-200'}`}>
            <button
              type="button"
              onClick={() => setExpandedThinking((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))}
              className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 text-[10px] font-bold cursor-pointer hover:bg-indigo-500/10 transition"
            >
              <span className="inline-flex items-center gap-1.5 text-indigo-400">
                <Brain className="w-3.5 h-3.5" />
                Ход мыслей AI 5.0 · {msg.thinkingSteps.length} шага{msg.elapsedMs ? ` · ${msg.elapsedMs} мс` : ''}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-indigo-400 transition-transform ${isThinkingOpen ? 'rotate-180' : ''}`} />
            </button>
            {isThinkingOpen && (
              <div className={`px-2.5 pb-2 pt-1 space-y-1.5 border-t ${isDark ? 'border-indigo-400/15' : 'border-indigo-200/80'}`}>
                {msg.thinkingSteps.map((st) => (
                  <div key={st.step} className="flex items-start gap-2 text-[10px]">
                    <span className="font-mono font-black text-indigo-400 shrink-0">{st.step}.</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold">{st.title}</span>
                      <span className="opacity-65"> — {st.detail}</span>
                    </div>
                    <span className="font-mono text-[9px] opacity-50 shrink-0">{st.duration_ms}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Luma AI 5.0 Nexus Executed OS Actions */}
        {!isUserBubble && msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.actions.map((act) => (
              <span
                key={act.id}
                title={act.detail}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 ${
                  isDark
                    ? 'bg-emerald-500/12 border-emerald-400/30 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{act.label}</span>
              </span>
            ))}
          </div>
        )}

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
                  isDark ? 'bg-black/55 border-white/10' : 'bg-zinc-900 text-zinc-100 border-zinc-700'
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
          if (!part.trim()) return null;
          return renderMarkdownSegment(part, idx, isUserBubble);
        })}

        {/* Universal Internet Sources from Luma AI 5.0 */}
        {!isUserBubble && msg.sources && msg.sources.length > 0 && (
          <div className="pt-2 mt-2 border-t border-white/10 space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
              Источники из интернета и ядра ({msg.sources.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {msg.sources.map((src, sIdx) => (
                <button
                  key={`${src.url}_${sIdx}`}
                  onClick={() => openVerifiedSource(src.url)}
                  title={src.snippet || src.url}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                    isDark
                      ? 'bg-sky-500/10 border-sky-400/30 text-sky-300 hover:bg-sky-500/20'
                      : 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  <span className="font-bold opacity-80">{src.provider}:</span>
                  <span className="truncate max-w-[180px]">{src.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeMode: LocalAIMode = config.aiMode || 'auto';

  if (!aiEnabled) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl border border-amber-500/35 bg-amber-500/10 text-amber-400 flex items-center justify-center">
          <Power className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h3 className="text-lg font-extrabold">Luma Ai Nitrogen отключён или удалён</h3>
          <p className={`text-xs leading-relaxed ${mutedCls}`}>
            Вы можете мгновенно включить встроенный ИИ обратно или скачать локальную нейросеть Ollama (Qwen 2.5 3B / Llama 3.2 3B) в 1 клик.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onToggleAiEnabled && (
            <button
              onClick={() => void runAiManageAction('enable')}
              className="px-5 py-2.5 rounded-xl bg-[var(--luma-accent)] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Power className="w-4 h-4" />
              Включить Luma Ai Nitrogen
            </button>
          )}
          <button
            onClick={() => {
              setShowAiManager(true);
              void runAiManageAction('install', installModelChoice);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20"
          >
            <Download className="w-4 h-4" />
            Скачать ИИ ({installModelChoice})
          </button>
        </div>
      </div>
    );
  }

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

        {/* Quick Luma Ai Nitrogen / Web Search Switches */}
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setAutonomousAgent((v) => !v)}
            className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
              autonomousAgent
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400'
                : btnCls
            }`}
            title="Автономный режим: ИИ управляет системой, Календарём, Офисом и файлами"
          >
            <Zap className="w-3 h-3 shrink-0" />
            <span>Агент</span>
          </button>
          <button
            type="button"
            onClick={() => setUniversalWebSearch((v) => !v)}
            className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
              universalWebSearch
                ? 'border-sky-500/60 bg-sky-500/15 text-sky-400'
                : btnCls
            }`}
            title="Поиск по интернету и чтение источников в реальном времени"
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span>Интернет</span>
          </button>
        </div>

        {/* Quick 2-Engine Model Switcher (Luma Ai Nitrogen General vs Code) */}
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => {
              onChangeConfig({ ...config, provider: 'luma_local', aiMode: 'language' });
              onPushToast('Luma Ai Nitrogen', 'Активен универсальный режим с 3-уровневой памятью', 'success');
            }}
            className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
              config.provider === 'luma_local' && activeMode === 'language'
                ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-400'
                : btnCls
            }`}
            title="Универсальный ассистент с долговременной памятью, Календарём и Офисом"
          >
            <BookOpen className="w-3 h-3 shrink-0" />
            <span>Ассистент</span>
          </button>
          <button
            onClick={() => {
              onChangeConfig({ ...config, provider: 'luma_local', aiMode: 'code' });
              onPushToast('Luma Ai Nitrogen Code', 'Активен режим программиста и рефакторинга', 'success');
            }}
            className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
              config.provider === 'luma_local' && activeMode === 'code'
                ? 'border-sky-500/60 bg-sky-500/15 text-sky-400'
                : btnCls
            }`}
            title="Программист: код, дебаг, рефакторинг, API и скрипты"
          >
            <Code2 className="w-3 h-3 shrink-0" />
            <span>Кодер</span>
          </button>
        </div>

        {/* Response Information Volume Selector: Кратко / Баланс / Подробно */}
        <div className="space-y-1">
          <div className={`text-[9px] font-mono uppercase tracking-wider px-0.5 ${mutedCls}`}>
            Объём информации
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'brief' as const, label: 'Кратко', tip: '2–4 предложения, только суть' },
                { id: 'balanced' as const, label: 'Баланс', tip: 'Оптимальная структура и факты' },
                { id: 'detailed' as const, label: 'Подробно', tip: 'Глубокий разбор, детали и советы' },
              ]
            ).map((v) => {
              const active = (config.verbosity || 'balanced') === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    onChangeConfig({ ...config, verbosity: v.id });
                    onPushToast('Luma Ai Nitrogen', `Объём ответа: ${v.label}`, 'info');
                  }}
                  title={v.tip}
                  className={`py-1 px-1 rounded-lg border text-[10px] font-semibold cursor-pointer transition text-center truncate ${
                    active ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white font-bold' : btnCls
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {threads.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                setActiveThreadId(t.id);
                setShowConfig(false);
                setShowMemory(false);
                setShowAiManager(false);
              }}
              className={`group px-2.5 py-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-1.5 transition ${
                t.id === activeThread?.id && !showConfig && !showMemory && !showAiManager
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
          onClick={() => {
            setShowConfig((v) => !v);
            setShowMemory(false);
            setShowAiManager(false);
          }}
          className={`p-2.5 rounded-xl border text-left space-y-1 cursor-pointer transition ${
            showConfig ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)]' : btnCls
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono uppercase">
            <span className="text-[var(--luma-accent)] font-bold truncate">Luma Ai Nitrogen</span>
            <Settings2 className="w-3 h-3 shrink-0" />
          </div>
          <div className="text-[11px] font-mono truncate opacity-80">
            {currentModel}
          </div>
          <div className={`text-[10px] ${preset.needsKey && !currentKey ? 'text-amber-500' : 'text-emerald-500'}`}>
            {aiManageState?.python_service_online
              ? 'FastAPI RAG :49225 · Онлайн'
              : aiManageState?.ollama_running
              ? 'Ollama :11434 · Онлайн'
              : preset.needsKey
              ? currentKey
                ? 'API-ключ задан'
                : 'Нужен API-ключ'
              : 'SSE + Память · Готов'}
          </div>
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header Bar */}
        <div
          className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${
            isDark ? 'border-white/[0.08]' : 'border-zinc-900/10'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-4 h-4 text-[var(--luma-accent)] shrink-0" />
            <div className={`inline-flex p-0.5 rounded-xl border text-[10px] font-bold ${btnCls}`}>
              {(
                [
                  { id: 'auto' as const, label: 'Авто', icon: <Zap className="w-3 h-3" /> },
                  { id: 'language' as const, label: 'Ассистент', icon: <BookOpen className="w-3 h-3" /> },
                  { id: 'code' as const, label: 'Кодер', icon: <Code2 className="w-3 h-3" /> },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => onChangeConfig({ ...config, aiMode: m.id })}
                  className={`px-2 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer transition ${
                    activeMode === m.id ? 'bg-[var(--luma-accent)] text-white' : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setShowAiManager((v) => !v);
                setShowMemory(false);
                setShowConfig(false);
                void fetchAiManageStatus();
              }}
              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                showAiManager
                  ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                  : aiManageState?.installing
                  ? 'border-amber-400 bg-amber-500/15 text-amber-300 animate-pulse'
                  : btnCls
              }`}
              title="Скачать локальную модель Ollama (Qwen 2.5 3B / Llama 3.2 3B) или удалить ИИ"
            >
              <Download className="w-3 h-3" />
              <span>{aiManageState?.installing ? `${aiManageState.progress ?? 0}%` : 'Скачать / Удалить ИИ'}</span>
            </button>
            <button
              onClick={() => {
                setShowMemory((v) => !v);
                setShowConfig(false);
                setShowAiManager(false);
                void loadAIMemory();
              }}
              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                showMemory
                  ? 'border-violet-400 bg-violet-500/20 text-violet-300'
                  : memoryStore.facts.length > 0
                  ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                  : btnCls
              }`}
              title="Долговременная 3-уровневая память Luma Ai Nitrogen"
            >
              <Brain className="w-3 h-3" />
              <span>Память</span>
              <span className="px-1 rounded bg-white/10 text-[10px] font-mono">{memoryStore.facts.length}</span>
            </button>
            <button
              onClick={() => {
                if (autoSpeak) window.speechSynthesis?.cancel();
                setAutoSpeak((v) => !v);
              }}
              className={`px-2 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1 cursor-pointer ${
                autoSpeak
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-semibold'
                  : btnCls
              }`}
              title="Автоматически озвучивать ответы Luma Ai Nitrogen голосом"
            >
              {autoSpeak ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              <span className="hidden lg:inline">Озвучка</span>
            </button>
            <button
              onClick={() => onChangeConfig({ ...config, includeSystemContext: !config.includeSystemContext })}
              className={`px-2 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1 cursor-pointer ${
                config.includeSystemContext
                  ? 'border-[var(--luma-accent)] bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] font-semibold'
                  : btnCls
              }`}
              title="Передавать ИИ живую телеметрию ПК (CPU/RAM/ОС)"
            >
              <Cpu className="w-3 h-3" />
              <span className="hidden sm:inline">ПК</span>
            </button>
            <button
              onClick={() => {
                setShowConfig((v) => !v);
                setShowMemory(false);
                setShowAiManager(false);
              }}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                showConfig ? 'bg-[var(--luma-accent)] border-[var(--luma-accent)] text-white' : btnCls
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Модель
            </button>
            {onToggleAiEnabled && (
              <button
                onClick={() => onToggleAiEnabled(false)}
                title="Отключить Luma Ai Nitrogen в системе (экономия ресурсов)"
                className="p-1.5 rounded-lg border border-rose-500/35 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white cursor-pointer transition"
              >
                <Power className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Download / Install / Uninstall Local AI Manager Drawer */}
        {showAiManager && !showConfig && (
          <div className={`px-4 py-3.5 border-b space-y-3 ${isDark ? 'border-white/10 bg-sky-950/25' : 'border-slate-200 bg-sky-50/80'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black text-sky-400">
                <HardDrive className="w-4 h-4" />
                <span>Управление локальным ИИ — Luma Ai Nitrogen (Ollama)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className={`px-2 py-0.5 rounded-full border ${aiManageState?.ollama_installed ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-400' : 'border-amber-400/40 bg-amber-500/15 text-amber-400'}`}>
                  Ollama: {aiManageState?.ollama_running ? 'Запущен' : aiManageState?.ollama_installed ? 'Установлен' : 'Не установлен'}
                </span>
                <span className={`px-2 py-0.5 rounded-full border ${aiManageState?.python_service_online ? 'border-sky-400/40 bg-sky-500/15 text-sky-400' : 'border-white/15 opacity-70'}`}>
                  Python RAG :49225: {aiManageState?.python_service_online ? 'Онлайн' : 'Оффлайн'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`text-[11px] font-semibold ${mutedCls}`}>Модель для загрузки:</span>
              {(['qwen2.5:3b', 'llama3.2:3b'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInstallModelChoice(m)}
                  className={`px-2.5 py-1 rounded-xl border font-mono text-[11px] font-bold cursor-pointer transition ${
                    installModelChoice === m
                      ? 'bg-sky-500 border-sky-400 text-white'
                      : btnCls
                  }`}
                >
                  {m === 'qwen2.5:3b' ? 'Qwen 2.5 3B (~1.9 ГБ · Лучше для RU/Кода)' : 'Llama 3.2 3B (~2.0 ГБ · Быстрая)'}
                </button>
              ))}
            </div>

            {aiManageState?.installing && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-sky-400">
                  <span>{aiManageState.message || aiManageState.step || 'Установка...'}</span>
                  <span>{aiManageState.progress ?? 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.max(4, Math.min(100, aiManageState.progress ?? 8))}%` }}
                  />
                </div>
              </div>
            )}

            {Array.isArray(aiManageState?.installed_models) && aiManageState.installed_models.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span className={mutedCls}>Установленные модели:</span>
                {aiManageState.installed_models.map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                    {m}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                disabled={Boolean(aiManageState?.installing)}
                onClick={() => void runAiManageAction('install', installModelChoice)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{aiManageState?.installing ? 'Идёт загрузка...' : `Скачать и установить ИИ (${installModelChoice})`}</span>
              </button>

              <button
                type="button"
                disabled={Boolean(aiManageState?.installing)}
                onClick={() => void runAiManageAction('uninstall')}
                className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/12 hover:bg-rose-500 hover:text-white text-rose-400 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить ИИ (освободить диск)</span>
              </button>
            </div>
          </div>
        )}

        {/* Luma Ai Nitrogen Persistent Memory Manager Drawer */}
        {showMemory && !showConfig && (
          <div className={`px-4 py-3 border-b space-y-2.5 ${isDark ? 'border-white/10 bg-violet-950/25' : 'border-slate-200 bg-violet-50/70'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold flex items-center gap-1.5 text-violet-400">
                <Brain className="w-4 h-4" />
                <span>3-уровневая долговременная память Luma Ai Nitrogen ({memoryStore.facts.length})</span>
              </div>
              {memoryStore.facts.length > 0 && (
                <button
                  type="button"
                  onClick={() => void deleteAIMemoryFactUI('all')}
                  className="px-2 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold cursor-pointer"
                >
                  Очистить всё
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={newFactInput}
                onChange={(e) => setNewFactInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addAIMemoryFactUI();
                }}
                placeholder="Добавить факт в память (например: Я пишу код на TypeScript, Go и Python)..."
                className={`flex-1 px-2.5 py-1.5 rounded-xl border text-xs outline-none ${
                  isDark ? 'bg-black/40 border-white/15' : 'bg-white border-slate-300'
                }`}
              />
              <button
                type="button"
                onClick={() => void addAIMemoryFactUI()}
                className="px-3 py-1.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold cursor-pointer"
              >
                Запомнить
              </button>
            </div>
            {memoryStore.facts.length === 0 ? (
              <div className={`text-[11px] ${mutedCls}`}>
                Память пока пуста. Напишите в чате «Меня зовут ...», «Я живу в ...» или «Запомни ...» — Luma Ai Nitrogen сохранит это в SQLite + Vector RAG навсегда.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {memoryStore.facts.map((f) => (
                  <div
                    key={f.id}
                    className={`px-2.5 py-1 rounded-xl border text-[11px] flex items-center gap-1.5 ${
                      isDark ? 'bg-black/35 border-violet-400/25 text-slate-200' : 'bg-white border-violet-200 text-slate-800'
                    }`}
                  >
                    <span className="text-[9px] font-mono uppercase text-violet-400">{f.key}</span>
                    <span>{f.value}</span>
                    <button
                      type="button"
                      onClick={() => void deleteAIMemoryFactUI(f.id)}
                      className="text-rose-400 hover:text-rose-300 cursor-pointer ml-0.5"
                      title="Забыть этот факт"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showConfig ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className={`p-4 rounded-2xl border space-y-3 ${surfaceCls}`}>
              <div className="text-xs font-bold">Выберите движок Luma Ai Nitrogen (локальный Ollama или любой OpenAI-совместимый API)</div>
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
                    <div className={`text-[10px] font-mono ${p.id === 'luma_local' || p.id === 'ollama' ? 'text-emerald-400 font-bold' : mutedCls}`}>
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
                    API_KEY ({preset.badge})
                  </span>
                  <input
                    type="password"
                    value={currentKey}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        apiKeys: { ...config.apiKeys, [config.provider]: e.target.value },
                      })
                    }
                    placeholder={
                      preset.needsKey
                        ? 'Вставьте API-ключ...'
                        : 'ollama (не требуется для локального Ollama)'
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
                  />
                </label>

                <label className="space-y-1">
                  <span className={`text-[11px] font-mono flex items-center gap-1 ${mutedCls}`}>
                    <Bot className="w-3 h-3" />
                    MODEL_NAME
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

              <label className="block space-y-1 text-xs">
                <span className={`text-[11px] font-mono flex items-center gap-1 ${mutedCls}`}>
                  <Globe className="w-3 h-3" />
                  BASE_URL (OpenAI-совместимый API: Ollama / Gemini Flash-Lite / Groq / OpenRouter)
                </span>
                <input
                  value={currentBaseUrl}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      baseUrls: { ...config.baseUrls, [config.provider]: e.target.value },
                    })
                  }
                  placeholder={preset.defaultBaseUrl || 'http://127.0.0.1:11434/v1'}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${btnCls}`}
                />
              </label>

              <label className="block space-y-1 text-xs">
                <span className={`text-[11px] font-mono ${mutedCls}`}>Системный промпт (System Persona)</span>
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
                    void syncNitrogenBackendConfig();
                    setShowConfig(false);
                    onPushToast('Luma Ai Nitrogen', `Сохранено: ${currentModel} (${currentBaseUrl || 'local'})`, 'success');
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
                <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--luma-accent-soft)] text-[var(--luma-accent)] flex items-center justify-center">
                    {activeMode === 'code' ? <Code2 className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="text-base font-extrabold">
                      {activeMode === 'code'
                        ? 'Luma Ai Nitrogen · Программист и Архитектор'
                        : 'Luma Ai Nitrogen · Универсальный ИИ-ассистент'}
                    </div>
                    <div className={`text-xs mt-1 ${mutedCls}`}>
                      {activeMode === 'code'
                        ? 'Потоковый вывод кода, рефакторинг, дебаг и сохранение сниппетов в SQLite + Vector RAG память.'
                        : 'Потоковый ответ по токенам (SSE), 3-уровневая долговременная память, Ollama (Qwen 2.5 3B / Llama 3.2 3B), управление ПК, Календарь, Офис и Luma Обвести для поиска.'}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    {(activeMode === 'code'
                      ? [
                          'Напиши FastAPI микросервис с SQLite и стримингом',
                          'Напиши Telegram-бота на Python (aiogram 3)',
                          'Объясни и отрефактори async/await в TypeScript',
                          'Напиши Go HTTP сервер с graceful shutdown',
                        ]
                      : [
                          'Запланируй созвон завтра в 15:00 в календаре',
                          'Запомни: я пишу на Go, TypeScript и Python',
                          'Проанализируй состояние моего ПК и батареи',
                          'Что у меня запланировано в календаре?',
                        ]
                    ).map((prompt) => (
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
                  <span>Luma Ai Nitrogen генерирует потоковый ответ...</span>
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
                placeholder={
                  listening
                    ? 'Говорите в микрофон...'
                    : activeMode === 'code'
                    ? 'Опишите код, рефакторинг или баг (Python, Go, TS, SQL, C++)...'
                    : 'Спросите Luma Ai Nitrogen о чём угодно, запланируйте задачу в календаре или управляйте ПК...'
                }
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
});

