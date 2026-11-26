<div align="center">

<img src="public/luma-oxygen-hero.jpg" alt="Luma OS 1.7.2B (Oxygen · O-8 · Base & Pro)" width="100%" style="border-radius: 18px;" />

<br />

# Luma OS 1.7.2B — **Oxygen · O-8 (`Base` & `Pro`)**

**Флагманская настольная оболочка для Windows 10 / 11 в двух редакциях (`Base` и `Pro` с полными правами) на ядре `LumaCore 1.6.2` и антивирусе `LumaShield 3.2`: починенный `Circle to Search` без чёрного экрана на ПК и телефоне с едиными мобильными мозгами Vision AI, встроенный фоторедактор `Luma Photo Studio`, системное открытие всех фото и папок, модульная Drag&Drop-панель виджетов, `Scroll Actions` (KDE / Waybar), HarmonyOS Панель управления, экосистема «Суперустройство» и 100% фикс `Alt+Tab` + `Dynamic Island`**

<p>
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.7.2B"><img src="https://img.shields.io/badge/Release-v1.7.2B%20(Base%20%26%20Pro)-2563eb?style=for-the-badge" alt="Release v1.7.2B" /></a>
  <img src="https://img.shields.io/badge/Kernel-LumaCore%201.6.2%20(v1.7.2B)-10b981?style=for-the-badge" alt="LumaCore 1.6.2" />
  <img src="https://img.shields.io/badge/Circle%20to%20Search-PC%20%2B%20Phone%20Vision%20Fixed-a855f7?style=for-the-badge" alt="Circle to Search PC+Phone" />
  <img src="https://img.shields.io/badge/Design-HarmonyOS%20Control%20%2B%20SuperDevice-0ea5e9?style=for-the-badge" alt="HarmonyOS Control & SuperDevice" />
  <img src="https://img.shields.io/badge/Apps-Luma%20Photo%20Studio%20%2B%20System%20Open-8b5cf6?style=for-the-badge" alt="Luma Photo Studio" />
  <img src="https://img.shields.io/badge/Security-LumaShield%203.2%20(340%2B)-f43f5e?style=for-the-badge" alt="LumaShield 3.2" />
</p>

<h3>
  <a href="https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.2B_Pro.exe">👑 Скачать LumaOS_1.7.2B_Pro.exe (Pro · Полные права)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.2B_Base.exe">⬇️ Скачать LumaOS_1.7.2B_Base.exe (Base)</a>
  <br />
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.7.2B">📦 Релиз v1.7.2B</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="PATCH_NOTES_1.7.2B.md">📝 Патч-ноут 1.7.2B</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="LumaOxygenConnect_Android/README.md">📱 Oxygen Connect (Android)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="luma_ai_nitrogen/README.md">🧠 Luma Ai Nitrogen</a>
</h3>

</div>

> [!WARNING]
> **⚠️ Нестабильная работа версий `1.6.4` – `1.6.6b`!**
> Сборки **`1.6.4`**, **`1.6.5`**, **`1.6.6`** и **`1.6.6b`** работают **нестабильно** — **не используйте их**. Скачивайте актуальную версию **[Luma OS 1.7.2B Pro / Base](https://github.com/Tveexty/L_H-3.0/releases/tag/v1.7.2B)** (или финальную стабильную сборку ветки `1.6.x` — [`LumaOS_1.6.7.exe`](https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.7)).

---

## Что нового в **Luma OS 1.7.2B (Oxygen · O-8 · `Base` & `Pro` · `LumaCore 1.6.2`)**

| Модуль | Ключевые возможности и исправления 1.7.2B |
| :--- | :--- |
| **🔍 Полный фикс `Circle to Search` (ПК + Телефон · без чёрного экрана!)** | Устранён чёрный экран на ПК и телефоне (исправлен двойной префикс `data:image/png;base64,`, включён `Win32 BitBlt(SRCCOPY \| CAPTUREBLT)` + High-DPI + резервный `CopyFromScreen`, на ПК экран захватывается *до* показа оверлея, а телефон мгновенно получает быстрый JPEG-экран ПК по Wi-Fi сразу при открытии Circle). Возвращены и объединены полноценные мобильные мозги Vision AI для ПК и телефона: 4-уровневый движок со строгим системным промптом, автосинк ключей (`Gemini` с авто-фоллбэком моделей, `OpenAI`, `OpenRouter`, `Groq`), локальная `Ollama Vision` (`qwen2.5vl` / `llava` / `gemma3`), `Ollama Text+OCR` и точная обрезка `x1/y1/x2/y2`. |
| **🎨 `Luma Photo Studio` + открытие всех файлов через систему** | Встроенный фоторедактор (свет/цвет, 12 фильтров, поворот/отражение/кадрирование `1:1 · 16:9 · 4:3 · 9:16`, кисть/маркер/стрелка/рамка/текст/мозаика, Undo/Redo, До/После, экспорт PNG/JPG/WebP, отправка на телефон с волной HarmonyOS, установка на обои). **Все фото** в Проводнике, на рабочем столе, Полке и Oxygen Connect открываются внутри `Luma Photo Studio`, **папки** — в Проводнике Luma OS, документы — в Office Pro, код — в Code Studio + интеграция ассоциаций Windows (HKCU) в 1 клик. |
| **🧩 Модульная панель виджетов (Drag & Drop)** | Соберите **верхнюю или нижнюю** панель из независимых стеклянных блоков (**Погода**, **Курсы валют USD/EUR/CNY/BTC**, **CPU/GPU/RAM**, **Активный трек**, **Буфер обмена**, **Pomodoro-таймер**, **Виртуальные столы**, **Яркость**, **Звук**, **Суперустройство**, **Фотостудия**, **Base/Pro**) и меняйте их местами перетаскиванием мышью. |
| **🖱️ `Scroll Actions` (KDE / Waybar)** | Прокрутка колесом мыши без лишних кликов: над **звуком** — громкость `±4%`, над **панелью задач** — переключение открытых окон, над **яркостью** — `±5%`, над **виртуальными столами** — смена столов, над **плеером** — пред./след. трек, над **валютами / буфером / Pomodoro** — пролистывание пар, истории и минут. |
| **💠 Дизайн в стиле HarmonyOS + «Суперустройство»** | Перерисованная **Панель управления (`TAB`)** и **Панель задач** в стиле HarmonyOS (матовое тёмное стекло, синие круглые акценты `#2563eb`, карточка плеера, капсулы Wi-Fi/Bluetooth с ПКМ-списком и паролем, капсулы «Суперустройство» и «Не беспокоить», широкие капсульные ползунки яркости и звука с прокруткой колесом, сетка 4×4 круглых кнопок) + интерактивная экосистема **«Суперустройство»** с орбитальным радаром и перетаскиванием устройств (Android, наушники, аудио, второй монитор, Luma Ai Nitrogen) на ПК. |
| **🔧 Фикс фокуса `Alt+Tab` + мгновенный `Dynamic Island` + OTA** | После `Alt+Tab` можно **печатать сразу без клика ЛКМ**, и **Dynamic Island появляется мгновенно**. Автообновитель OTA защищён от лимита GitHub API (`HTTP 403`) и безопасно обновляет запущенный EXE на Windows. |
| **👑 Две официальные редакции: `Base` и `Pro`** | **`LumaOS_1.7.2B_Base.exe`** — обычная лёгкая сборка со стандартными правами пользователя. **`LumaOS_1.7.2B_Pro.exe`** — версия **Pro** с **полными правами Администратора (UAC)**, 4K Photo Studio (30 шагов Undo), полной интеграцией ассоциаций Windows, Hardcore Anti-RAT/USB Shield, SwapBoost, Стоп-зарядкой, KWin Game Boost и Developer SDK Studio. |

---

## Сравнение редакций **Luma OS 1.7.2B `Base` vs `Pro`**

| Функция / Права | `Luma OS 1.7.2B Base` | `Luma OS 1.7.2B Pro` |
| :--- | :---: | :---: |
| **Права в Windows** | Пользователь (без UAC) | **Полные права Администратора (UAC)** |
| **Встроенный `Luma Photo Studio`** | До 2K · 12 шагов Undo | **До 4K · 30 шагов Undo · Pro-экспорт** |
| **Открытие фото и папок через Luma OS** | Внутри оболочки | **Внутри оболочки + ассоциации Windows (HKCU)** |
| **Модульная панель + Scroll Actions + HarmonyOS UI** | ✅ | ✅ **Максимум опций + кастом-плагины** |
| **Экосистема «Суперустройство» + Circle to Search (ПК + Телефон)** | ✅ Базовый мост | ✅ **Pro-маршрутизация аудио/BT/экранов** |
| **`LumaShield 3.2` · `SwapBoost` · `Стоп-зарядка` · `KWin Game Boost`** | Базовый режим | ✅ **Все Pro-модули разблокированы** |

---

## Галерея обоев **Oxygen + Nitrogen (21 встроенный арт)**

> Все **21** обои встроены прямо в `LumaOS_1.7.2B_Pro.exe` и `LumaOS_1.7.2B_Base.exe` (включая полную коллекцию предыдущих версий).

<table>
  <tr>
    <td width="33%" align="center">
      <img src="public/luma-oxygen-hero.jpg" alt="Oxygen 2.5D Cryo-Bubbles" width="100%" />
      <br />
      <b>Oxygen — 2.5D Cryo-Bubbles (Главные)</b>
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

## Скачать Luma OS (все 35 сборок сохранены)

Все исполняемые файлы автономны (**Single-Binary Portable EXE** — встроенный фронтенд + Go-ядро, установка не требуется):

| Версия | Кодовое имя | Ядро / Возможности | Прямая ссылка |
| :--- | :--- | :--- | :--- |
| **1.7.2B Pro (Рекомендуем)** | **Oxygen · O-8 Pro** | `LumaCore 1.6.2` · `👑 Полные права Admin` · `🔍 Фикс Circle to Search (без чёрного экрана ПК + Телефон · единые мобильные мозги Vision AI)` · `Photo Studio 4K` · `HarmonyOS UI + Суперустройство` · `Фикс Alt+Tab + OTA` | [**LumaOS_1.7.2B_Pro.exe**](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.2B_Pro.exe) · [OTA (`LumaOS_1.7.2B.exe`)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.2B.exe) |
| **1.7.2B Base** | **Oxygen · O-8 Base** | `LumaCore 1.6.2` · `Стандартные права (без UAC)` · `🔍 Фикс Circle to Search (без чёрного экрана ПК + Телефон · единые мобильные мозги)` · `Photo Studio` · `HarmonyOS UI + Суперустройство` | [**LumaOS_1.7.2B_Base.exe**](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.2B_Base.exe) |
| **1.7.2 Pro** | **Oxygen · O-8 Pro** | `LumaCore 1.6.2` · `👑 Полные права Admin` · `Luma Photo Studio 4K` · `Файлы через Luma OS (HKCU)` · `Модульная панель + Scroll Actions` · `HarmonyOS UI + Суперустройство` · `Фикс Alt+Tab + OTA` | [LumaOS_1.7.2_Pro.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.2_Pro.exe) · [OTA (`LumaOS_1.7.2.exe`)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.2.exe) |
| **1.7.2 Base** | **Oxygen · O-8 Base** | `LumaCore 1.6.2` · `Стандартные права (без UAC)` · `Luma Photo Studio` · `Модульная панель + Scroll Actions` · `HarmonyOS UI + Суперустройство` | [LumaOS_1.7.2_Base.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.2_Base.exe) |
| **1.7.1** | **Oxygen · O-8** | `LumaCore 1.6.1` · `🌊 Полноэкранная волна HarmonyOS` · `📱 1-Тап UI телефона` · `🖱️ Быстрый тачпад 1.4×` · `🔍 Полноценный Circle to Search` | [LumaOS_1.7.1.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.1.exe) |
| **1.7** | **Oxygen · O-8** | `LumaCore 1.6.0` · `100% Иконки` · `Умный автозапуск` · `KWin Правила окон` · `Полка Dropzone` · `Умный буфер (OCR)` · `Per-App Аудио` · `Капсульные OSD` · `Oxygen Connect` | [LumaOS_1.7.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.7.exe) |
| **1.6.7 (Финал 1.6.x)** | **Nitrogen · N-7** | `LumaCore 1.5.7` · `LumaShield 3.1` · `Фикс курсора/кликов Dynamic Island` · `Нативный Zero-Freeze выбор файла` · `old protatips/` | [LumaOS_1.6.7.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.7.exe) |
| ~~1.6.6b~~ *(нестаб.)* | Nitrogen · N-7 | `LumaCore 1.5.6b` · *Нестабильная ветка 1.6.4–1.6.6b (используйте 1.7.2B / 1.6.7)* | [LumaOS_1.6.6b.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.6b.exe) |
| ~~1.6.6~~ *(нестаб.)* | Nitrogen · N-7 | `LumaCore 1.5.6` · *Нестабильная ветка 1.6.4–1.6.6b (используйте 1.7.2B / 1.6.7)* | [LumaOS_1.6.6.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.6.exe) |
| ~~1.6.5~~ *(нестаб.)* | Nitrogen · N-7 | `LumaCore 1.5.5` · *Нестабильная ветка 1.6.4–1.6.6b (используйте 1.7.2B / 1.6.7)* | [LumaOS_1.6.5.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.5.exe) |
| ~~1.6.4~~ *(нестаб.)* | Nitrogen · N-7 | `LumaCore 1.5.4` · *Нестабильная ветка 1.6.4–1.6.6b (используйте 1.7.2B / 1.6.7)* | [LumaOS_1.6.4.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.4.exe) |
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

## Сборка редакций `Base` и `Pro` из исходников

```bash
npm install
npm run build

# Luma OS 1.7.2B Pro (полные права + все Pro-опции)
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui -X main.KernelEdition=pro" -o LumaOS_1.7.2B_Pro.exe .

# Luma OS 1.7.2B Base (обычная лёгкая версия)
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui -X main.KernelEdition=base" -o LumaOS_1.7.2B_Base.exe .
```
