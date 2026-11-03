# Архитектура независимого фонового ядра **Luma Beta** (`Luma_Core/`)

## 1. Философия архитектуры (Headless Core + GUI Client)
**Luma Beta** спроектирована как полностью независимый фоновый демон (`Headless Core`), отделенный от пользовательского интерфейса (`Launcher Hab 2.6 GUI Client`).
- **Автономность и нулевой оверхед:** Ядро не импортирует `flet`, `qt`, `tkinter` или другие GUI-фреймворки. В простое цикл событий `asyncio` находится в состоянии ожидания `epoll` / `IOCP` (`0.0% CPU`), а потребление памяти составляет `~12–18 МБ` на Python-прототипе (и `~4–6 МБ` при компиляции модулей на C++20 / Asio).
- **Отказоустойчивость (Fault Isolation):** Падение, зависание или перезапуск графического клиента (`UI`) приводит лишь к закрытию клиентского TCP-дескриптора в `LumaCoreServer._handle_client()`. Ядро продолжает работу в фоне, сохраняя открытые процессы, таймеры и телеметрию.

---

## 2. Структура директорий проекта `Luma_Core/`

```text
Luma_Core/
├── luma_core.py               # Точка входа Headless-демона, JSON-RPC 2.0 IPC сервер и WidgetEngine
├── luma_config.json           # Конфигурация демона (генерируется автоматически)
├── test_ipc_client.py         # Тестовый клиент для проверки JSON-RPC 2.0 сокета
├── ARCHITECTURE.md            # Архитектурная спецификация и контракт JSON-RPC 2.0
├── core/
│   ├── __init__.py
│   ├── process_manager.py     # Запуск сторонних .exe, трекинг PID, контроль состояния и завершение
│   ├── config_manager.py      # Атомарная загрузка/сохранение и схема валидации настроек
│   ├── widget_service.py      # WidgetEngine: фоновый сбор CPU/RAM раз в секунду для живых плиток
│   └── hotkey_manager.py      # Реестр глобальных сочетаний клавиш и маршрутизация событий
└── ipc/
    ├── __init__.py
    └── jsonrpc_protocol.py    # Парсер, валидатор и конструктор пакетов JSON-RPC 2.0
```

---

## 3. Базовый контракт протокола JSON-RPC 2.0

Транспортный уровень: **Local TCP Socket (`127.0.0.1:45890`)** (или Windows Named Pipe `\\.\pipe\luma_core_ipc`), фрейминг — **NDJSON** (каждый пакет завершается символом `\n`, кодировка `UTF-8`).

### 3.1. Пинг ядра (`system.ping`)
**Запрос клиента:**
```json
{"jsonrpc": "2.0", "method": "system.ping", "id": 1}
```
**Ответ ядра:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "pong": true,
    "engine": "Luma Beta Headless Core",
    "version": "0.9.4-beta",
    "timestamp": 1762105000.125
  },
  "id": 1
}
```

### 3.2. Получение живых данных виджетов (`widgets.get_data`)
**Запрос клиента:**
```json
{"method": "widgets.get_data"}
```
*(Поддерживается как полный формат `{"jsonrpc": "2.0", "method": "widgets.get_data", "id": 2}`, так и сокращенный `{"method": "widgets.get_data"}`)*

**Ответ ядра:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "engine": "Luma WidgetService 1.0",
    "interval_sec": 1,
    "metrics": {
      "cpu_percent": 14.2,
      "ram_percent": 42.0,
      "ram_used_mb": 6881.2,
      "ram_total_mb": 16384.0,
      "core_rss_mb": 14.2,
      "uptime_sec": 342,
      "timestamp": 1762105001.004
    },
    "widgets": [
      {
        "id": "sys.cpu_monitor",
        "title": "Нагрузка ЦП (CPU)",
        "type": "gauge",
        "value": 14.2,
        "unit": "%",
        "status": "normal"
      },
      {
        "id": "sys.ram_monitor",
        "title": "Оперативная память (RAM)",
        "type": "gauge",
        "value": 42.0,
        "used_mb": 6881.2,
        "total_mb": 16384.0,
        "unit": "%"
      },
      {
        "id": "luma.core_footprint",
        "title": "Потребление Luma Core (Headless)",
        "type": "badge",
        "value": 14.2,
        "unit": "MB",
        "idle_cpu_percent": 0.0
      }
    ]
  },
  "id": 1
}
```

### 3.3. Список зарегистрированных виджетов (`widgets.list`)
**Запрос клиента:**
```json
{"jsonrpc": "2.0", "method": "widgets.list", "id": 3}
```

### 3.4. Управление процессами (`process.spawn`, `process.list`, `process.terminate`)
**Запрос клиента:**
```json
{
  "jsonrpc": "2.0",
  "method": "process.spawn",
  "params": {
    "command": "C:\\Program Files\\Steam\\steam.exe",
    "args": ["-silent"]
  },
  "id": 4
}
```

### 3.5. Стандартные коды ошибок JSON-RPC 2.0
| Код | Значение | Когда возвращается |
|---|---|---|
| `-32700` | Parse error | Некорректный JSON в потоке |
| `-32600` | Invalid Request | Отсутствует поле `method` или неверный тип структуры |
| `-32601` | Method not found | Вызван неизвестный метод ядра |
| `-32602` | Invalid params | Ошибка валидации параметров метода |
| `-32603` | Internal error | Исключение внутри модуля (перехватывается без падения ядра) |
