<div align="center">

<img src="public/luma-nitrogen-hero.jpg" alt="Luma OS 1.6.3 (Nitrogen · N-7 · 2.5D Cryo-Glass QHD)" width="100%" style="border-radius: 18px;" />

<br />

# Luma OS 1.6.3 — **Nitrogen · N-7**

**Флагманская настольная операционная среда для Windows 10 / 11 на ядре `LumaCore 1.5.3`, защите `LumaShield 2.5` (275 правил) и модульном ИИ `Luma Ai Nitrogen`: потоковый SSE-ассистент (Ollama Qwen 2.5 3B / Llama 3.2 3B + OpenAI API) с 3-уровневой SQLite+RAG памятью, установкой/удалением ИИ, интеграцией с Офисом, Календарём и «Обвести для поиска», отключением всех жестов тачпада Windows, активным поиском Wi-Fi и Bluetooth, стоп-зарядкой батареи ноутбука, поддержкой сенсорного экрана и стилуса, постраничным A4 Luma Word, Обзором окон в Пуске и реальным закреплением окон поверх Chrome**

<p>
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.3"><img src="https://img.shields.io/badge/Release-v1.6.3%20(Nitrogen%20·%20N--7)-38bdf8?style=for-the-badge" alt="Release v1.6.3" /></a>
  <img src="https://img.shields.io/badge/Kernel-LumaCore%201.5.3%20(v1.6.3)-10b981?style=for-the-badge" alt="LumaCore 1.5.3" />
  <img src="https://img.shields.io/badge/AI-Luma%20Ai%20Nitrogen%20(SSE%20%2B%20RAG)-8b5cf6?style=for-the-badge" alt="Luma Ai Nitrogen" />
  <img src="https://img.shields.io/badge/Security-LumaShield%202.5%20(275%20Rules)-f43f5e?style=for-the-badge" alt="LumaShield 2.5" />
  <img src="https://img.shields.io/badge/Input-Touch%20%2B%20Stylus%20Ready-06b6d4?style=for-the-badge" alt="Touch and Stylus" />
  <img src="https://img.shields.io/badge/Battery-Stop--Charge%20Mode-f59e0b?style=for-the-badge" alt="Battery Stop-Charge Mode" />
</p>

<h3>
  <a href="https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.3.exe">⬇️ Скачать LumaOS_1.6.3.exe (Portable · 1 файл · 0 зависимостей)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.3">📦 Релиз v1.6.3</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="PATCH_NOTES_1.6.3.md">📝 Патч-ноут 1.6.3</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="luma_ai_nitrogen/README.md">🧠 Модуль Luma Ai Nitrogen</a>
</h3>

</div>

---

## Что нового в **Luma OS 1.6.3 (Nitrogen · N-7 · `LumaCore 1.5.3`)**

| Модуль | Ключевые улучшения обновления 1.6.3 |
| :--- | :--- |
| **Модульный ИИ `Luma Ai Nitrogen`** | Полностью рабочий модульный пакет [`luma_ai_nitrogen/`](luma_ai_nitrogen/) (Python FastAPI + Go-шлюз `/api/kernel/ai/nitrogen/stream`): OpenAI-совместимый клиент (по умолчанию локальный **Ollama** `qwen2.5:3b` / `llama3.2:3b`, легкое переключение на Gemini Flash-Lite / Groq / OpenRouter / LM Studio), **SSE Token Streaming**, **Function Calling / Tools** и **3-уровневая долговременная память** (Context Window + SQLite WAL + Vector RAG с автоизвлечением, дедупликацией и обновлением устаревших фактов). Интегрирован с **Системой**, **Luma Обвести для поиска**, **Luma Office Studio** и **Календарём**. |
| **Скачать / Удалить ИИ в 1 клик** | В окне `Luma Ai Nitrogen` можно автоматически скачать и установить Ollama + `qwen2.5:3b` / `llama3.2:3b` с живым прогресс-баром — или полностью удалить локальные модели ИИ и отключить модуль для освобождения диска. |
| **Отключение всех жестов тачпада Windows** | При работе Luma OS отключаются **все** жесты Windows Precision Touchpad (3/4 пальца, зум, свайпы с краёв EdgeUI) с автоматическим бэкапом и 100% восстановлением при выключении опции, по `Ctrl + Alt + Shift + W` или закрытии `LumaOS_1.6.3.exe`. |
| **Wi-Fi и Bluetooth: ВСЕ устройства рядом** | Активное Win32-сканирование `wlanapi.dll` (`WlanScan`) и `bthprops.cpl` (`BluetoothFindFirstDevice`) находит не только подключённые, но и **все сопряжённые и новые несопряжённые Bluetooth-устройства рядом** (`Подключено` / `Сопряжено` / `Найдено рядом`). |
| **Стоп-зарядка батареи ноутбука** | В *Настройки → Энергосбережение* и *Питание и Батарея* добавлен реальный режим **«🔌 Не заряжать батарею»**: мультивендорный аппаратный Conservation / Stop-Charge (`Lenovo EnergyDrv`, `ASUS ATKACPI`, `MSI/Acer/BIOS WMI`, тепловая защита `powercfg`, Linux sysfs). |
| **Сенсорные экраны и стилусы (Touch & Pen)** | Полная поддержка касаний и пера: перетаскивание и ресайз окон (`touch-action: none`), удержание = ПКМ, рисование в «Обвести для поиска» с учётом силы нажатия стилуса, адаптивный Touch-режим и запуск экранной клавиатуры. |
| **Постраничный A4 в Luma Word** | Большие документы в `Luma Office Studio` отображаются как настоящие **отдельные страницы A4** с зазорами, колонтитулами `Страница N из M`, навигатором страниц и ручным разрывом `Ctrl + Enter`. |
| **«Обзор окон» в меню «Пуск» + Реальный `📌` поверх Chrome** | «Обзор окон» (`D1–D4`, окна Luma и открытые программы Windows) перенесён внутрь **Пуска** (чистая панель задач), а закрепление любого окна Luma (`📌`) вызывает Win32 `SetWindowPos(HWND_TOPMOST)` и держит окно **поверх Chrome и всех программ Windows**. |
| **Чистое меню ПКМ Рабочего стола** | Из контекстного меню Рабочего стола убраны «Спросить Luma AI», «Сделать скриншот экрана», «Во весь экран (F11)», «Режим расстановки» и все пресеты. |

---

## Все флагманские возможности ветки **1.6.x (Nitrogen · N-7)**

- **100% нативные Wi-Fi и Bluetooth (ПКМ + ввод пароля):** управление адаптерами, выбор сетей, ввод пароля Wi-Fi / PIN Bluetooth и поиск всех устройств без единого окна Настроек Windows.
- **Замена горячих клавиш (`Win`, `Alt + Tab`, `Win + D`):** единый переключатель в *Настройки → Оболочка Windows* с полным отключением жестов тачпада Windows и самовосстановлением.
- **Luma Обвести для поиска (`Ctrl + Shift + L`):** захват экрана, свободное обведение лассо мышью/пальцем/стилусом, офлайн-OCR (`RU+EN`), палитра цветов, перевод и потоковый разбор через `Luma Ai Nitrogen`.
- **Управление жестами, Плагины и Спецвозможности:** жесты тачпада и мыши (`Alt + ПКМ`), настройки ПКМ, Плагины и режим сенсорного экрана/стилуса.
- **Режим разработчика (`Ctrl + Shift + D`) и Режим Администратора (UAC):** живой Developer HUD + перезапуск с правами Администратора (`runas`).
- **Стиль системы `Luma Nova`, перетаскиваемая «Папка Luma», живой индикатор загрузок и безопасная Корзина Luma OS.**
- **`Luma SwapBoost` (2 / 4 / 6 ГБ), `Luma Gamepad Studio`, `Luma Deep Uninstaller`, `Luma Peek` (`Space`):** нативные утилиты на ядре `LumaCore 1.5.3` и защите `LumaShield 2.5` (275 правил, 0 утечек Win32-колбэков).

---

## Галерея обоев **Nitrogen (QHD 2560×1440)**

> Все 20 обоев встроены в `LumaOS_1.6.3.exe` (включая полную коллекцию предыдущих версий).

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

## Скачать Luma OS (все 22 сборки сохранены)

Все исполняемые файлы автономны (**Single-Binary Portable EXE** — встроенный фронтенд + Go-ядро, установка не требуется):

| Версия | Кодовое имя | Ядро / Возможности | Прямая ссылка |
| :--- | :--- | :--- | :--- |
| **1.6.3 (Актуальная)** | **Nitrogen · N-7** | `LumaCore 1.5.3` · `Luma Ai Nitrogen (SSE + 3-Tier RAG)` · `Установить/Удалить ИИ` · `Стоп-зарядка АКБ` · `Touch & Stylus` · `Постраничный Word A4` · `Обзор окон в Пуске` · `📌 Поверх Chrome` | [**LumaOS_1.6.3.exe**](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.3.exe) |
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.6.3.exe .
```

## Запуск отдельного модуля `Luma Ai Nitrogen` (Python FastAPI + Ollama)

```bash
cd luma_ai_nitrogen
python -m venv .venv && .venv\Scripts\activate   # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
ollama pull qwen2.5:3b
python main.py --mode server                     # или --mode cli для интерактивного чата
```
