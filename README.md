<div align="center">

<img src="public/luma-oxygen-hero.jpg" alt="Luma OS 1.7 (Oxygen · O-8 · 2.5D Cryo-Bubbles)" width="100%" style="border-radius: 18px;" />

<br />

# Luma OS 1.7 — **Oxygen · O-8**

**Новое поколение настольной оболочки для Windows 10 / 11 на ядре `LumaCore 1.6.0`, антивирусе `LumaShield 3.2` (340+ правил · Anti-RAT · USB Shield) и ИИ `Luma Ai Nitrogen`: 100% прогрузка всех иконок, умный автозапуск самой новой версии, KWin-правила окон, навсегда починенный `Alt+Tab`, полка Drag & Drop (`Yoink / Dropzone`), Умный буфер обмена с категориями и Auto-OCR, Per-App Аудио-центр в Панели управления, капсульные OSD-индикаторы, 2.5D обои Oxygen, новая 60 FPS мини-игра и Android-компаньон `Oxygen Connect` (SuperHub)**

<p>
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.7"><img src="https://img.shields.io/badge/Release-v1.7%20(Oxygen%20O--8)-38bdf8?style=for-the-badge" alt="Release v1.7" /></a>
  <img src="https://img.shields.io/badge/Kernel-LumaCore%201.6.0%20(v1.7)-10b981?style=for-the-badge" alt="LumaCore 1.6.0" />
  <img src="https://img.shields.io/badge/Security-LumaShield%203.2%20(340%2B)-f43f5e?style=for-the-badge" alt="LumaShield 3.2" />
  <img src="https://img.shields.io/badge/Windows-KWin%20Rules%20%2B%20Alt%2BTab%20Fix-6366f1?style=for-the-badge" alt="KWin Window Rules" />
  <img src="https://img.shields.io/badge/Android-Oxygen%20Connect%20SuperHub-0ea5e9?style=for-the-badge" alt="Oxygen Connect Android" />
  <img src="https://img.shields.io/badge/Audio-Per--App%20Mixer%20%2B%20Capsule%20OSD-06b6d4?style=for-the-badge" alt="Per-App Audio & OSD" />
</p>

<h3>
  <a href="https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.exe">⬇️ Скачать LumaOS_1.7.exe (Oxygen · 1 файл)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.7">📦 Релиз v1.7</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="PATCH_NOTES_1.7.md">📝 Патч-ноут 1.7</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="LumaOxygenConnect_Android/README.md">📱 Oxygen Connect (Android)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="luma_ai_nitrogen/README.md">🧠 Luma Ai Nitrogen</a>
</h3>

</div>

> [!WARNING]
> **⚠️ Нестабильная работа версий `1.6.4` – `1.6.6b`!**
> Сборки **`1.6.4`**, **`1.6.5`**, **`1.6.6`** и **`1.6.6b`** работают **нестабильно** — **не используйте их**. Скачивайте актуальную версию **[Luma OS 1.7 (Oxygen)](https://github.com/Tveexty/L_H-3.0/releases/tag/v1.7)** (или финальную стабильную сборку ветки `1.6.x` — [`LumaOS_1.6.7.exe`](https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.7)).

---

## Что нового в **Luma OS 1.7 (Oxygen · O-8 · `LumaCore 1.6.0` · `LumaShield 3.2`)**

| Модуль | Ключевые возможности и исправления 1.7 (Oxygen) |
| :--- | :--- |
| **100% загрузка всех иконок** | В `LumaCore 1.6.0` добавлена STA COM-инициализация (`CoInitializeEx`), резервный `ExtractIconExW`, чтение расширений (`SHGFI_USEFILEATTRIBUTES`), карта программ (Discord, Telegram, VS Code, Steam, Office, браузеры), гарантированный 2.5D SVG-фолбэк (0 ошибок `404`), сброс кэша `?v=17` и автоповтор загрузки. |
| **Умный автозапуск новой версии** | При запуске и после OTA-обновления ядро сравнивает SemVer сборок `LumaOS_*.exe`, обновляет `HKCU\...\Run\LumaOS` на самую свежую версию и чистит старые дубликаты/ярлыки автозагрузки — после перезагрузки ПК всегда стартует новейшая Luma OS. |
| **Менеджер правил окон (KWin)** | *Настройки → Правила окон (KWin)*: определение всех мониторов (`EnumDisplayMonitors`), размещение по зонам, «без рамки», «поверх всех окон», прозрачность, авто-DND и отключение композитора для игр + готовые пресеты (Telegram, Калькулятор, Игры). |
| **Навсегда починенный `Alt+Tab`** | Синхронное снятие `HWND_TOPMOST` внутри `/api/kernel/windows/focus`, Win32 `AllowSetForegroundWindow` + `AttachThreadInput` + `FocusWindowWithHWND` и мгновенный переход с рабочего стола сразу на реальное внешнее окно. |
| **Полка Drag & Drop (`Ctrl+Alt+S`)** | Аналог Yoink / Dropzone: при перетаскивании файлов, картинок или текста у края экрана выезжает стеклянная полка — накидайте файлы из разных папок, переключитесь в другое окно и заберите всё пачкой (Копировать / Переместить / Упаковать в ZIP). |
| **Умный буфер обмена (`Ctrl+Shift+V`)** | Аналог Paste / Raycast: категории (Текст, Ссылки, Цвета HEX/RGB со свотчами, Картинки, Файлы, Код, Закреплённые), встроенный **Auto-OCR** для изображений (`WinRT OcrEngine`) и вставка чистого текста (**Plain Text**) по умолчанию. |
| **Per-App Аудио-центр в Панели** | В духе KDE Plasma / PipeWire прямо в выпадающей Панели управления (`Tab`): громкость и Mute каждого приложения отдельно (`IAudioSessionManager2`), Drag & Drop карточки приложения на нужный аудиовыход, управление плеерами по отдельности и системный Mute микрофона. |
| **Капсульные OSD-индикаторы** | Полупрозрачные стеклянные капсулы Oxygen / Material You: громкость, яркость, `Caps / Num / Scroll Lock`, заряд Bluetooth, смена трека, статус микрофона `ON / OFF` и живой таймер записи экрана. |
| **2.5D Обои Oxygen + Новая мини-игра** | Новые реалистичные 2.5D-обои **Oxygen 1.7 (Cryo-Bubbles)** (**21 арт в галерее**) и новая 60 FPS мини-игра без лагов **«Oxygen Pulse · O-8»** с выбором в пасхалке между новой и классическими играми (`Oxygen` \| `Арена` \| `Орбита`). |
| **`Oxygen Connect` (Android SuperHub)** | Локальный LAN-сервер (`:49218`) + офлайн **QR-код** для мгновенного подключения Android: фото с камеры телефона сразу на ПК и в Полку Dropzone, двусторонний обмен файлами, общий буфер, виртуальный тачпад/клавиатура, медиа-пульт + нативный Kotlin-проект [`LumaOxygenConnect_Android/`](LumaOxygenConnect_Android/). |

---

## Все ключевые возможности экосистемы **Luma OS**

- **Модульный ИИ `Luma Ai Nitrogen` (`luma_ai_nitrogen/`):** универсальный клиент (Ollama `qwen2.5:3b` / `llama3.2:3b`, Google Gemini SSE/OpenAI, OpenAI, Claude, Groq, OpenRouter), SSE-стриминг, 3-уровневая память (SQLite WAL + RAG), интеграция с Офисом, Календарём и «Обвести для поиска», установка/удаление локального ИИ в 1 клик.
- **Антивирус `LumaShield 3.2` (Zero-Freeze · 340+ правил):** Anti-RAT уничтожение под ноль, Щит USB-флешек, блокировка чужих файлов, нативный Win32 выбор файла (`< 15 мс`, лимит 4 МБ без фризов), аудит автозагрузки и планировщика задач.
- **Нативный `Dynamic Island` поверх Chrome и всех окон Windows, рамочное выделение ЛКМ на рабочем столе и 36 языков интерфейса + 120+ раскладок.**
- **100% нативные Wi-Fi и Bluetooth (ПКМ + пароль), замена горячих клавиш (`Win`, `Alt+Tab`, `Win+D`), Win32 HID жесты Precision Touchpad, магнитный `Dock`, пружинные анимации, `Luma Office Pro` (Word A4 / 140+ формул Excel / PowerPoint), `Luma SwapBoost`, `Gamepad Studio`, `Deep Uninstaller` и `Luma Peek` (`Space`).**

---

## Галерея обоев **Oxygen 1.7 + Nitrogen (21 встроенный арт)**

> Все **21** обои встроены прямо в `LumaOS_1.7.exe` (включая полную коллекцию предыдущих версий).

<table>
  <tr>
    <td width="33%" align="center">
      <img src="public/luma-oxygen-hero.jpg" alt="Oxygen 1.7 2.5D Cryo-Bubbles" width="100%" />
      <br />
      <b>Oxygen 1.7 — 2.5D Cryo-Bubbles (Главные)</b>
    </td>
    <td width="33%" align="center">
      <img src="public/luma-nitrogen-hero.jpg" alt="Nitrogen 2.5D Cryo-Glass" width="100%" />
      <br />
      <b>Nitrogen — 2.5D Cryo-Glass</b>
    </td>
    <td width="33%" align="center">
      <img src="public/luma-nitrogen-monolith.jpg" alt="Nitrogen Monolith" width="100%" />
      <br />
      <b>Nitrogen — N-7 Monolith</b>
    </td>
  </tr>
  <tr>
    <td width="33%" align="center">
      <img src="public/luma-nitrogen-aurora.jpg" alt="Nitrogen Aurora" width="100%" />
      <br />
      <b>Nitrogen Aurora</b>
    </td>
    <td width="33%" align="center">
      <img src="public/luma-nitrogen-glacier.jpg" alt="Nitrogen Glacier" width="100%" />
      <br />
      <b>Nitrogen Glacier</b>
    </td>
    <td width="33%" align="center">
      <img src="public/luma-nitrogen-alpine.jpg" alt="Nitrogen Alpine" width="100%" />
      <br />
      <b>Nitrogen Alpine</b>
    </td>
  </tr>
</table>

---

## Скачать Luma OS (все 28 сборок сохранены)

Все исполняемые файлы автономны (**Single-Binary Portable EXE** — встроенный фронтенд + Go-ядро, установка не требуется):

| Версия | Кодовое имя | Ядро / Возможности | Прямая ссылка |
| :--- | :--- | :--- | :--- |
| **1.7 (Актуальная)** | **Oxygen · O-8** | `LumaCore 1.6.0` · `LumaShield 3.2` · `100% Иконки` · `Умный автозапуск` · `KWin Правила окон` · `Фикс Alt+Tab` · `Полка Dropzone` · `Умный буфер (OCR)` · `Per-App Аудио` · `Капсульные OSD` · `Oxygen Connect (Android)` | [**LumaOS_1.7.exe**](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.exe) |
| **1.6.7 (Финал 1.6.x)** | **Nitrogen · N-7** | `LumaCore 1.5.7` · `LumaShield 3.1` · `Фикс курсора/кликов Dynamic Island` · `Нативный Zero-Freeze выбор файла` · `old protatips/` | [LumaOS_1.6.7.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.7.exe) |
| ~~1.6.6b~~ *(нестаб.)* | Nitrogen · N-7 | `LumaCore 1.5.6b` · *Нестабильная ветка 1.6.4–1.6.6b (используйте 1.7 / 1.6.7)* | [LumaOS_1.6.6b.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.6b.exe) |
| ~~1.6.6~~ *(нестаб.)* | Nitrogen · N-7 | `LumaCore 1.5.6` · *Нестабильная ветка 1.6.4–1.6.6b (используйте 1.7 / 1.6.7)* | [LumaOS_1.6.6.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.6.exe) |
| ~~1.6.5~~ *(нестаб.)* | Nitrogen · N-7 | `LumaCore 1.5.5` · *Нестабильная ветка 1.6.4–1.6.6b (используйте 1.7 / 1.6.7)* | [LumaOS_1.6.5.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.5.exe) |
| ~~1.6.4~~ *(нестаб.)* | Nitrogen · N-7 | `LumaCore 1.5.4` · *Нестабильная ветка 1.6.4–1.6.6b (используйте 1.7 / 1.6.7)* | [LumaOS_1.6.4.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.4.exe) |
| **1.6.3** | Nitrogen · N-7 | `LumaCore 1.5.3` · `Luma Ai Nitrogen (SSE + 3-Tier RAG)` · `Установить/Удалить ИИ` · `Стоп-зарядка АКБ` · `Touch & Stylus` · `Word A4` · `📌 Поверх Chrome` | [LumaOS_1.6.3.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.3.exe) |
| **1.6.2b** | Nitrogen · N-7 | `LumaCore 1.5.2b` · `Нативные Wi-Fi & Bluetooth (ПКМ + пароль)` · `Замена горячих клавиш + Тачпад` · `0 всплытий Настроек Windows` | [LumaOS_1.6.2b.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.2b.exe) |
| **1.6.2** | Nitrogen · N-7 | `LumaCore 1.5.2` · `Luma AI 5.0 Nexus` · `Luma Обвести для поиска` · `Жесты & Спецвозможности` · `Live Загрузки` · `Безопасная Корзина` | [LumaOS_1.6.2.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.2.exe) |
| **1.6.1** | Nitrogen · N-7 | `LumaCore 1.5.1` · `LumaShield 2.5` · `Luma AI 4.0` · `2.5D Cryo-Glass` · `Hover Smart Dock` · `Luma Nova` | [LumaOS_1.6.1.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.1.exe) |
| **1.6** | Nitrogen · N-7 | `LumaCore 1.5.0` · `LumaShield 2.5` · `Gamepad Studio` · `Deep Uninstaller` · `Luma Peek` · `Smart Dock` | [LumaOS_1.6.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.exe) |
| **1.5.4** | Carbon · C-6 | `LumaCore 1.4.7` · `24/7 Stability` · `Шторка` · `140+ Excel` · `Battery Care` | [LumaOS_1.5.4.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.5.4.exe) |
| **1.5.3** | Carbon · C-6 | `LumaCore 1.4.6` · `Topmost Alt+Tab` · `Luma Office Pro` · `Idle Sleep` | [LumaOS_1.5.3.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.5.3.exe) |
| **1.5.2** | Carbon · C-6 | `LumaCore 1.4.5` · `LumaShield 2.0` · `Studios Pro` · `AI 3.0` | [LumaOS_1.5.2.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.5.2.exe) |
| **1.5.1** | Carbon · C-6 | `LumaCore 1.6.1` · `LumaShield 2.0` · `Office Studio` | [LumaOS_1.5.1.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.5.1.exe) |
| **1.5** | Carbon · C-6 | `LumaCore 1.6` · `LumaShield 1.6` · `AES-256 Vault` | [LumaOS_1.5.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.5.exe) |
| **1.4** | Boron · B-5 | `LumaCore 1.5` · `LumaShield 1.5` · `SDK v3.0` | [LumaOS_1.4.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.4.exe) |
| **1.3.1** | Beryllium · Be-4 | `LumaCore 1.4` · `LumaShield 1.4` | [LumaOS_1.3.1.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.3.1.exe) |
| **1.3** | Beryllium · Be-4 | `LumaCore 1.4` · `LumaShield 1.4` | [LumaOS_1.3.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.3.exe) |
| **1.2.3B** | Lithium · Li-3 | `LumaCore 1.3B` (True Zero-WMI) | [LumaOS_1.2.3B.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.3B.exe) |
| **1.2.3** | Lithium · Li-3 | `LumaCore 1.3` · `LumaShield 1.3` | [LumaOS_1.2.3.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.3.exe) |
| **1.2.2** | Lithium · Li-3 | `LumaCore 1.2.2` · `LumaShield 1.3` | [LumaOS_1.2.2.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.2.exe) |
| **1.2.1** | Lithium · Li-3 | `LumaCore 1.2` | [LumaOS_1.2.1.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.1.exe) |
| **1.2.0** | Lithium · Li-3 | `LumaCore 1.2` | [LumaOS_1.2.0.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.0.exe) |
| **1.1.0** | Helium · He-2 | `LumaCore 1.1` | [LumaOS_1.1.0.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.1.0.exe) |
| **1.0.4** | Luma Classic | `LumaCore 1.0` | [LumaOS_1.0.4.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.0.4.exe) |
| **1.0.3** | Luma Classic | `LumaCore 1.0` | [LumaOS_1.0.3.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.0.3.exe) |
| **1.0.2b** | Luma Classic | `LumaCore 1.0` | [LumaOS_1.0.2b.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.0.2b.exe) |

---

## Сборка из исходников

```bash
npm install
npm run build
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.7.exe .
```

## Запуск отдельного модуля `Luma Ai Nitrogen` (Python FastAPI + Ollama / Gemini)

```bash
cd luma_ai_nitrogen
python -m venv .venv && .venv\Scripts\activate   # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
ollama pull qwen2.5:3b
python main.py --mode server                     # или --mode cli для интерактивного чата
```
