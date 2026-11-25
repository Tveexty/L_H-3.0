<div align="center">

<img src="public/luma-nitrogen-hero.jpg" alt="Luma OS 1.6.4 (Nitrogen · N-7 · 2.5D Cryo-Glass QHD)" width="100%" style="border-radius: 18px;" />

<br />

# Luma OS 1.6.4 — **Nitrogen · N-7**

**Флагманская настольная операционная среда для Windows 10 / 11 на ядре `LumaCore 1.5.4`, защите `LumaShield 2.5` (275 правил) и модульном ИИ `Luma Ai Nitrogen`: нативный Win32 HID-драйвер многопальцевых жестов тачпада и сенсора, исправленный потоковый клиент Google Gemini API (SSE + OpenAI-compat), авто-скрытие визуального шума в видео/полном экране, интерактивный магнитный Dock с отскоком запуска и ореолом прогресса рендера/загрузок, пружинная физика окон с инерцией и полностью обновлённый информативный экран OTA-обновления**

<p>
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.4"><img src="https://img.shields.io/badge/Release-v1.6.4%20(Nitrogen%20·%20N--7)-38bdf8?style=for-the-badge" alt="Release v1.6.4" /></a>
  <img src="https://img.shields.io/badge/Kernel-LumaCore%201.5.4%20(v1.6.4)-10b981?style=for-the-badge" alt="LumaCore 1.5.4" />
  <img src="https://img.shields.io/badge/AI-Luma%20Ai%20Nitrogen%20%2B%20Gemini%20SSE-8b5cf6?style=for-the-badge" alt="Luma Ai Nitrogen" />
  <img src="https://img.shields.io/badge/Gestures-Win32%20Precision%20HID-06b6d4?style=for-the-badge" alt="Win32 Precision HID Gestures" />
  <img src="https://img.shields.io/badge/Physics-Magnetic%20Dock%20%2B%20Spring-ec4899?style=for-the-badge" alt="Magnetic Dock and Spring Physics" />
  <img src="https://img.shields.io/badge/Security-LumaShield%202.5%20(275%20Rules)-f43f5e?style=for-the-badge" alt="LumaShield 2.5" />
</p>

<h3>
  <a href="https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.4.exe">⬇️ Скачать LumaOS_1.6.4.exe (Portable · 1 файл · 0 зависимостей)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.4">📦 Релиз v1.6.4</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="PATCH_NOTES_1.6.4.md">📝 Патч-ноут 1.6.4</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="luma_ai_nitrogen/README.md">🧠 Модуль Luma Ai Nitrogen</a>
</h3>

</div>

---

## Что нового в **Luma OS 1.6.4 (Nitrogen · N-7 · `LumaCore 1.5.4`)**

| Модуль | Ключевые улучшения обновления 1.6.4 |
| :--- | :--- |
| **Нативные жесты тачпада и сенсора (`Win32 HID`)** | В ядро `LumaCore 1.5.4` встроен прямой драйвер Win32 Raw Input HID для **Windows Precision Touchpad** (`WM_INPUT` + `hid.dll`, `ContactCount` + `X/Y`) с потоком `/api/kernel/gestures/events`, а фронтенд-трекер переписан на по-пальцевый `Map<id>` (`TouchEvent` + `PointerEvent`) без скачков центроида — 3 пальца вниз/вверх/влево/вправо, 4 пальца вниз и тап 3 пальцами срабатывают мгновенно. |
| **Исправление Google Gemini API (`SSE + OpenAI-compat`)** | Полностью устранена ошибка `Gemini HTTP 404: .` для `gemini-2.5-flash` и `gemini-2.5-flash-lite`: принудительная очистка префикса `models/`, точный выбор нативного SSE (`.../v1beta/models/{model}:streamGenerateContent?alt=sse&key=...`) или OpenAI-пути (`.../v1beta/openai/chat/completions`), безопасное логирование URL (`key=***`), полное чтение тела non-200 ошибок и динамический заголовок с именем выбранной модели. |
| **Авто-скрытие визуального шума** | При просмотре видео (`<video>` / `Luma Cut Studio`) или в полноэкранном режиме (`F11`) через 2.6с бездействия курсора верхняя панель, `Dynamic Island`, `Luma Nova` и `Dock` плавно уходят за край экрана и мгновенно возвращаются при движении мыши. |
| **Интерактивный магнитный `Dock`** | Плавное увеличение, подъём и притяжение иконок к курсору по кривой Гаусса (`GPU rAF`), упругий **отскок при запуске** и живой светящийся **ореол + полоса прогресса** прямо на иконке при скачивании файлов и рендере видео в `Luma Cut Studio`. |
| **Пружинные анимации и инерция окон** | Окна `DexWindow` реагируют на скорость перетаскивания (плавная инерция и пружинная остановка), а меню Пуск, Центр управления, Панель управления (`Tab`) и всплывающие панели открываются с живой пружинной физикой. |
| **Новый экран обновления (`Cryo-Glass OTA`)** | Двойной орбитальный реактор, 5-этапный конвейер установки, живой график скорости (`SVG sparkline`), расчёт ETA, статус `SHA-256`, интерактивная карусель «Что нового в 1.6.4» и раскрываемый журнал установки в реальном времени. |

---

## Все флагманские возможности ветки **1.6.x (Nitrogen · N-7)**

- **Модульный ИИ `Luma Ai Nitrogen` (`luma_ai_nitrogen/`):** универсальный клиент (Ollama `qwen2.5:3b` / `llama3.2:3b`, Google Gemini, OpenAI, Claude, Groq, OpenRouter), SSE-стриминг, 3-уровневая память (SQLite WAL + RAG), Function Calling, интеграция с Офисом, Календарём и «Обвести для поиска», а также установка/удаление локального ИИ в 1 клик.
- **100% нативные Wi-Fi и Bluetooth (ПКМ + ввод пароля + поиск всех устройств рядом):** управление адаптерами, выбор сетей, ввод пароля Wi-Fi / PIN Bluetooth без открытия Настроек Windows.
- **Замена горячих клавиш (`Win`, `Alt + Tab`, `Win + D`) и отключение жестов Windows:** единый переключатель в *Настройки → Оболочка Windows* с полным автовосстановлением по `Ctrl + Alt + Shift + W` и при выходе.
- **Luma Обвести для поиска (`Ctrl + Shift + L`):** захват экрана, свободное обведение лассо мышью/пальцем/стилусом, офлайн-OCR (`RU+EN`), палитра цветов, перевод и потоковый разбор через `Luma Ai Nitrogen`.
- **Стоп-зарядка батареи ноутбука, Touch & Stylus, постраничный A4 Word, «Обзор окон» в Пуске и реальное `📌 Поверх всех окон` поверх Chrome.**
- **`Luma SwapBoost` (2 / 4 / 6 ГБ), `Luma Gamepad Studio`, `Luma Deep Uninstaller`, `Luma Peek` (`Space`):** нативные утилиты на ядре `LumaCore 1.5.4` и защите `LumaShield 2.5` (275 правил, 110 API-маршрутов, 0 утечек Win32-колбэков).

---

## Галерея обоев **Nitrogen (QHD 2560×1440)**

> Все 20 обоев встроены в `LumaOS_1.6.4.exe` (включая полную коллекцию предыдущих версий).

<table>
  <tr>
    <td width="33%" align="center">
      <img src="public/luma-nitrogen-hero.jpg" alt="Nitrogen 2.5D Cryo-Glass" width="100%" />
      <br />
      <b>Nitrogen — 2.5D Cryo-Glass (Главные)</b>
    </td>
    <td width="33%" align="center">
      <img src="public/luma-nitrogen-monolith.jpg" alt="Nitrogen Monolith" width="100%" />
      <br />
      <b>Nitrogen — N-7 Monolith</b>
    </td>
    <td width="33%" align="center">
      <img src="public/luma-nitrogen-aurora.jpg" alt="Nitrogen Aurora" width="100%" />
      <br />
      <b>Nitrogen Aurora</b>
    </td>
  </tr>
  <tr>
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
    <td width="33%" align="center">
      <img src="public/luma-nitrogen-fjord.jpg" alt="Nitrogen Fjord" width="100%" />
      <br />
      <b>Nitrogen Fjord</b>
    </td>
  </tr>
</table>

---

## Скачать Luma OS (все 23 сборки сохранены)

Все исполняемые файлы автономны (**Single-Binary Portable EXE** — встроенный фронтенд + Go-ядро, установка не требуется):

| Версия | Кодовое имя | Ядро / Возможности | Прямая ссылка |
| :--- | :--- | :--- | :--- |
| **1.6.4 (Актуальная)** | **Nitrogen · N-7** | `LumaCore 1.5.4` · `Win32 HID Жесты` · `Gemini SSE/OpenAI Fix` · `Авто-скрытие шума` · `Магнитный Dock + Рендер` · `Пружинная физика` · `Новый OTA-экран` | [**LumaOS_1.6.4.exe**](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.4.exe) |
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.6.4.exe .
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
