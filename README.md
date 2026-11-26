<div align="center">

<img src="public/luma-nitrogen-hero.jpg" alt="Luma OS 1.6.6 (Nitrogen · N-7 · 2.5D Cryo-Glass QHD)" width="100%" style="border-radius: 18px;" />

<br />

# Luma OS 1.6.6 — **Nitrogen · N-7**

**Флагманская настольная операционная среда для Windows 10 / 11 на ядре `LumaCore 1.5.6`, защите `LumaShield 2.5` (275 правил) и модульном ИИ `Luma Ai Nitrogen`: рамочное выделение нескольких элементов ЛКМ на рабочем столе, 36 языков интерфейса системы с быстрым поиском, настоящий нативный Win32 Always-On-Top Dynamic Island оверлей поверх Chrome и всех окон Windows с прилипанием к экрану и 15+ новыми настройками капсулы**

<p>
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.6"><img src="https://img.shields.io/badge/Release-v1.6.6%20(Nitrogen%20·%20N--7)-38bdf8?style=for-the-badge" alt="Release v1.6.6" /></a>
  <img src="https://img.shields.io/badge/Kernel-LumaCore%201.5.6%20(v1.6.6)-10b981?style=for-the-badge" alt="LumaCore 1.5.6" />
  <img src="https://img.shields.io/badge/Island-Always--On--Top%20Win32-ec4899?style=for-the-badge" alt="Always-On-Top Dynamic Island" />
  <img src="https://img.shields.io/badge/Languages-36%20UI%20%2B%20120%2B%20KBD-8b5cf6?style=for-the-badge" alt="36 UI Languages" />
  <img src="https://img.shields.io/badge/Desktop-LMB%20Marquee%20Multi--Select-06b6d4?style=for-the-badge" alt="Desktop Multi-Select" />
  <img src="https://img.shields.io/badge/Security-LumaShield%203.0%20Hardcore%20(340%2B%20Rules)-f43f5e?style=for-the-badge" alt="LumaShield 3.0 Hardcore" />
</p>

<h3>
  <a href="https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.6.exe">⬇️ Скачать LumaOS_1.6.6.exe (Portable · 1 файл · 0 зависимостей)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.6">📦 Релиз v1.6.6</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="PATCH_NOTES_1.6.6.md">📝 Патч-ноут 1.6.6</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="luma_ai_nitrogen/README.md">🧠 Модуль Luma Ai Nitrogen</a>
</h3>

</div>

---

## Что нового в **Luma OS 1.6.6 (Nitrogen · N-7 · `LumaCore 1.5.6` · `LumaShield 3.0`)**

| Модуль | Ключевые возможности обновления 1.6.6 |
| :--- | :--- |
| **Жёсткий антивирус `LumaShield 3.0` (`Anti-RAT` + `USB Guard`)** | 340+ правил: активный щит каждые 6 секунд контролирует систему, процессы и все подключённые **USB-флешки**. Любой файл, пытающийся управлять ПК (`RAT`, `Reverse Shell`, `Keylogger`, `autorun.inf`, вирусные `.lnk`, двойные расширения), немедленно завершается, перезаписывается нулями (`0x00`) и **удаляется под ноль**. Подозрительные чужие файлы (`Zone.Identifier` / USB) автоматически блокируются, при этом ядро Windows и Luma OS защищены белым списком. |
| **Рамочное выделение ЛКМ на Рабочем столе** | Зажатие ЛКМ по пустому месту стола рисует стеклянную акцентную рамку и выделяет сразу несколько ярлыков, папок и виджетов. Поддерживаются `Ctrl/Shift + клик`, `Ctrl + A`, `Esc`, `Delete`, групповое перетаскивание по сетке, групповой перенос в папку, сбор в новую папку в 1 клик, плавающая панель действий и групповое ПКМ-меню. |
| **36 языков интерфейса системы (+18 новых)** | В 2 раза расширен список языков ОС: добавлены Беларуская, Oʻzbekcha, Azərbaycanca, ქართული, Հայերեն, Čeština, Slovenčina, Български, Српски, Ελληνικά, Magyar, Svenska, Norsk, Suomi, Tiếng Việt, Bahasa Indonesia, ไทย и עברית — с мгновенным поиском в *Настройки → Язык и регион*, метками `RTL` и расширенным автопереводом. |
| **Dynamic Island поверх Chrome и всех окон Windows** | В `LumaCore 1.5.6` встроен настоящий нативный Win32-оверлей (`HWND_TOPMOST + WS_EX_LAYERED + WS_EX_TOOLWINDOW + WS_EX_NOACTIVATE`), прилипающий к выбранной зоне экрана поверх Google Chrome, игр и всех окон Windows без перехвата фокуса, с живым эквалайзером, кликабельными кнопками `⏮ ⏯ ⏭`, часами, CPU/RAM, батареей и прогрессом загрузок. Внутри Luma OS остров поднят на слой `z-[9400]`. |
| **15+ новых настроек Luma Island** | 6 зон прилипания на экране (верх/низ · лево/центр/право), ползунки отступа от края (`0–64px`) и прозрачности (`55–100%`), 4 стиля капсулы (`Obsidian`, `Cryo-Glass`, `Frosted`, `Pure OLED`), режим `Click-Through`, блокировка/свободное перетаскивание, показ поверх F11/игр, расширение при наведении, модули Часов/CPU·RAM/Погоды/Загрузок и кнопка теста импульса. |

---

## Все флагманские возможности ветки **1.6.x (Nitrogen · N-7)**

- **Переключатель «Пружинные анимации во всей системе»** в *Настройки → Панель задач* и в ПКМ-меню самой панели задач.
- **Модульный ИИ `Luma Ai Nitrogen` (`luma_ai_nitrogen/`):** универсальный клиент (Ollama `qwen2.5:3b` / `llama3.2:3b`, Google Gemini SSE/OpenAI, OpenAI, Claude, Groq, OpenRouter), SSE-стриминг, 3-уровневая память (SQLite WAL + RAG), Function Calling, интеграция с Офисом, Календарём и «Обвести для поиска», а также установка/удаление локального ИИ в 1 клик.
- **100% нативные Wi-Fi и Bluetooth (ПКМ + ввод пароля + поиск всех устройств рядом):** управление адаптерами, выбор сетей, ввод пароля Wi-Fi / PIN Bluetooth без открытия Настроек Windows.
- **Замена горячих клавиш (`Win`, `Alt + Tab`, `Win + D`) и нативные Win32 HID жесты Precision Touchpad:** единый переключатель в *Настройки → Оболочка Windows* с полным автовосстановлением по `Ctrl + Alt + Shift + W` и при выходе.
- **Авто-скрытие визуального шума и интерактивный магнитный `Dock`:** растворение панелей при просмотре видео и в `F11`, гауссово притяжение иконок, пружинный отскок и ореол прогресса загрузок/рендера.
- **Luma Обвести для поиска (`Ctrl + Shift + L`):** захват экрана, свободное обведение лассо мышью/пальцем/стилусом, офлайн-OCR (`RU+EN`), палитра цветов, перевод и потоковый разбор через `Luma Ai Nitrogen`.
- **Стоп-зарядка батареи ноутбука, Touch & Stylus, постраничный A4 Word, «Обзор окон» в Пуске и реальное `📌 Поверх всех окон` поверх Chrome.**
- **`Luma SwapBoost` (2 / 4 / 6 ГБ), `Luma Gamepad Studio`, `Luma Deep Uninstaller`, `Luma Peek` (`Space`):** нативные утилиты на ядре `LumaCore 1.5.6` и защите `LumaShield 2.5` (275 правил, 113 API-маршрутов, 0 утечек Win32-колбэков).

---

## Галерея обоев **Nitrogen (QHD 2560×1440)**

> Все 20 обоев встроены в `LumaOS_1.6.6.exe` (включая полную коллекцию предыдущих версий).

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

## Скачать Luma OS (все 25 сборок сохранены)

Все исполняемые файлы автономны (**Single-Binary Portable EXE** — встроенный фронтенд + Go-ядро, установка не требуется):

| Версия | Кодовое имя | Ядро / Возможности | Прямая ссылка |
| :--- | :--- | :--- | :--- |
| **1.6.6 (Актуальная)** | **Nitrogen · N-7** | `LumaCore 1.5.6` · `Выделение ЛКМ на рабочем столе` · `36 языков ОС` · `Нативный Dynamic Island поверх Chrome и Windows` · `15+ настроек Острова` | [**LumaOS_1.6.6.exe**](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.6.exe) |
| **1.6.5** | Nitrogen · N-7 | `LumaCore 1.5.5` · `Переключатель пружинных анимаций` · `Фикс Win32 HID Precision Touchpad` · `Изоляция ключей ИИ` · `Пружинный Maximize + Dock без обрезки` · `go vet 0` | [LumaOS_1.6.5.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.5.exe) |
| **1.6.4** | Nitrogen · N-7 | `LumaCore 1.5.4` · `Win32 HID Жесты` · `Gemini SSE/OpenAI Fix` · `Авто-скрытие шума` · `Магнитный Dock + Рендер` · `Пружинная физика` · `Новый OTA-экран` | [LumaOS_1.6.4.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.4.exe) |
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.6.6.exe .
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
