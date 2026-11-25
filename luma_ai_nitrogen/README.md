# Luma Ai Nitrogen — Модульный ИИ-ассистент (Python FastAPI + 3-Tier Memory)

Модульный ИИ-движок **Luma Ai Nitrogen** с поддержкой OpenAI-совместимого API (по умолчанию локальный **Ollama** с `qwen2.5:3b` или `llama3.2:3b`), потокового вывода (**SSE + WebSocket**), вызова инструментов (**Function Calling** — Календарь Luma OS, телеметрия ПК, файлы, Office Studio, Luma Обвести для поиска) и **трёхуровневой агрессивной долговременной памяти** (`SQLite WAL` + векторный RAG + фоновый Fact Extractor с обновлением устаревших фактов).

## Структура модулей
- `config.py` — конфигурация API, пресеты провайдеров (Ollama, LM Studio, Gemini Flash-Lite, Groq, OpenRouter), пути к БД памяти и загрузка `.env`.
- `llm_client.py` — универсальный асинхронный OpenAI-совместимый клиент (`stream_chat` по токенам, `tool_calls`, `/embeddings` + встроенный 384-dim семантический векторизатор).
- `memory_manager.py` — трёхуровневая память: окно контекста (`Short-Term`), полная история переписок и архив кода в `SQLite WAL` (`Long-Term`), векторная база (`Semantic RAG`) + фоновый `Fact Extractor` с дедупликацией и обновлением устаревших фактов.
- `tools.py` — расширяемый реестр инструментов (`ToolRegistry`) с интеграцией в ядро `LumaCore 1.5.3` (`127.0.0.1:49216`).
- `agent.py` — ядро `LumaAiNitrogenAgent` (системная персона, сборка 3-уровневого контекста, цикл инструментов и фоновое извлечение фактов).
- `server.py` / `main.py` — FastAPI-сервер (REST + SSE `/api/chat/stream` + WebSocket `/ws/chat`) на `127.0.0.1:49225`.

---

## Пошаговая инструкция по установке и первому запуску

### Шаг 1. Установите локальный Ollama и модель (или используйте кнопку «Скачать ИИ» в Luma OS!)
```bash
# Windows (через winget):
winget install -e --id Ollama.Ollama

# Загрузите быструю модель Flash-Lite класса:
ollama pull qwen2.5:3b
# (или альтернатива: ollama pull llama3.2:3b)

# Опционально — модель эмбеддингов (если не скачивать, сработает встроенный векторизатор):
ollama pull nomic-embed-text
```

### Шаг 2. Установите Python-зависимости
```bash
cd luma_ai_nitrogen
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

### Шаг 3. Настройте `.env`
```bash
copy .env.example .env    # Windows
# cp .env.example .env    # Linux / macOS
```
По умолчанию в `.env` уже прописаны `BASE_URL=http://127.0.0.1:11434/v1` и `MODEL_NAME=qwen2.5:3b`. Для переключения на Gemini Flash-Lite / Groq / OpenRouter просто поменяйте `BASE_URL`, `API_KEY` и `MODEL_NAME`.

### Шаг 4. Первый запуск сервера
Из корневой папки репозитория (`L_H-3.0`):
```bash
python -m luma_ai_nitrogen.main
```
Сервер запустится на **`http://127.0.0.1:49225`**, и `LumaOS_1.6.3.exe` автоматически подключится к нему!

### Проверка API
- Состояние и статистика памяти: `GET http://127.0.0.1:49225/api/health`
- Потоковый чат (SSE): `POST http://127.0.0.1:49225/api/chat/stream`
- WebSocket-чат: `ws://127.0.0.1:49225/ws/chat`
- Факты памяти: `GET http://127.0.0.1:49225/api/memory/facts`
