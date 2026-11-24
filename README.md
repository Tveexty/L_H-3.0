<div align="center">

<img src="public/luma-carbon-hero.jpg" alt="Luma OS 1.5.4 (Carbon · C-6 · 4K UHD)" width="100%" style="border-radius: 18px;" />

<br />

# Luma OS 1.5.4 — **Carbon · C-6**

**Флагманская настольная операционная среда для Windows 10 / 11 на ядре `LumaCore 1.4.7`, с переписанной с нуля чистой Шторкой уведомлений (Кто · Что · Когда, 0% спама из мута), умным `Alt + Tab` (MRU-порядок + живые превью окон), многошторочным Проводником, 140+ формулами Excel, починенными анимациями PowerPoint, Battery Care (50%–100%) и круглосуточной стабильностью без вылетов**

<p>
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.5.4"><img src="https://img.shields.io/badge/Release-v1.5.4%20(Carbon%20·%20C--6)-06b6d4?style=for-the-badge" alt="Release v1.5.4" /></a>
  <img src="https://img.shields.io/badge/Kernel-LumaCore%201.4.7%20(24%2F7%20Stable)-10b981?style=for-the-badge" alt="LumaCore 1.4.7" />
  <img src="https://img.shields.io/badge/Security-LumaShield%202.0%20(175%2B%20Rules)-f43f5e?style=for-the-badge" alt="LumaShield 2.0" />
  <img src="https://img.shields.io/badge/Office-140%2B%20Formulas%20%26%2012%20Animations-185ABD?style=for-the-badge" alt="Luma Office 1.5.4" />
  <img src="https://img.shields.io/badge/Battery%20Care-Charge%20Limit%2050--100%25-22c55e?style=for-the-badge" alt="Battery Care" />
  <img src="https://img.shields.io/badge/Wallpapers-4K%20UHD%203840×2160-f59e0b?style=for-the-badge" alt="4K UHD Wallpapers" />
</p>

<h3>
  <a href="https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.5.4.exe">⬇️ Скачать LumaOS_1.5.4.exe (Portable · 1 файл · 0 зависимостей)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.5.4">📦 Страница релиза v1.5.4</a>
</h3>

</div>

---

## Что нового в **Luma OS 1.5.4 (Carbon · C-6 · Ядро `1.4.7`)**

| Модуль | Ключевые улучшения и исправления обновления 1.5.4 |
| :--- | :--- |
| **Исправлены периодические вылеты `LumaOS.exe` (`24/7 Stability`)** | Найдена и полностью устранена корневая причина регулярных вылетов каждые 15–30 минут — утечка Win32-колбэков Go (`syscall.NewCallback` внутри фонового цикла исчерпывал лимит 2000 колбэков Windows). Все колбэки переведены на постоянные синглтоны, добавлены защиты COM/WebView2, очистка кэшей и `panic-recovery` во всех фоновых воркерах. |
| **Переписанные с нуля уведомления + Полноценная Шторка уведомлений (`Alt + N`)** | Полностью удалён спам из замьюченных каналов и фейковые заглушки «Новое уведомление +4 нажмите чтобы посмотреть». Новый движок `LumaCore 1.4.7` (Share-Safe WPN SQLite/WAL + `FILETIME` + COM `UIAutomation`) доставляет только **реальные входящие сообщения**: **КТО** написал, **ЧТО** написал и **КОГДА**. Полноценная **Шторка уведомлений** (колокольчик на панели задач или `Alt + N`) с поиском, фильтрами по мессенджерам (`Telegram`, `WhatsApp`, `Discord`, `VK`), группировкой *«Сегодня / Вчера / Ранее»* и мгновенным переходом в чат. |
| **Умный `Alt + Tab` (MRU-порядок + живые превью окон) и тихое переключение** | Последнее открытое или использованное окно всегда перемещается **вперёд** списка (истинный MRU-трекинг в ядре и оболочке). Карточки `Alt + Tab` в реальном времени показывают **живое содержимое открытых окон Windows** (`PrintWindow`) и приложений Luma OS. Полностью убраны навязчивые тосты и всплывающие уведомления при переключении окон и возврате на главный экран. |
| **Меню панели задач поверх ВСЕХ открытых окон** | При нажатии на запущенное приложение на панели задач окно управления («На передний план», «Закрыть») теперь всегда открывается **поверх любых открытых окон приложений** — сворачивать текущее окно больше не нужно. |
| **Многошторочный Проводник Luma OS** | Кнопка **`+ Шторка`** открывает до **3 параллельных шторок папок бок о бок** прямо внутри Проводника. Поддерживается прямое перетаскивание (**Drag & Drop**, `Ctrl+Drop` для копирования) и перенос/копирование файлов между папками в 1 клик. |
| **Luma Office 1.5.4 — 140+ формул Excel, живые анимации PowerPoint и фиксы Word** | **Excel**: движок **140+ формул на русском и английском** (`СУММЕСЛИМН`, `ВПР`, `ГПР`, `ПРОСМОТРX`/`XLOOKUP`, `ИНДЕКС`, `ПОИСКПОЗ`, `ЕСЛИМН`, `ПЛТ`/`БС`/`ПС`/`ЧПС`/`КПЕР`, `МЕДИАНА`, `КОРРЕЛ`, `ПРЕДСКАЗ`, `ПРЕОБР`, `ОБЪЕДИНИТЬ`), мастер формул `fx` с поиском и категориями, навигация стрелками, мгновенный ввод с клавиатуры и `Ctrl+Z`. **PowerPoint**: полностью починены **12 настоящих CSS-анимаций объектов** и **10 живых переходов слайдов** (живой предпросмотр, порядок показа `#1..#8`, задержки, `F5`), редактор SmartArt/диаграмм, `Delete` и `Ctrl+Z`. **Word**: безопасный поиск/замена строго по текстовым узлам без порчи HTML, чистый выбор размера шрифта и кликабельная прокрутка к заголовкам из Навигации. |
| **Питание и Батарея: Battery Care (`50%–100%`) и чистый экран сна** | Добавлена фирменная защита аккумулятора ноутбука (**Battery Care**) с ограничением максимального заряда от **50% до 100%** (пресеты `60%` / `80%` / `85%` / `90%` / `100%`, визуальная шкала батареи и ползунок). Убраны все лишние технические надписи в интерфейсе, а настройки сна при бездействии получили лаконичный современный вид. |

---

## Что нового было в **Luma OS 1.5.3 (Carbon · C-6 · Ядро `1.4.6`)**

| Модуль | Ключевые улучшения обновления 1.5.3 |
| :--- | :--- |
| **Фирменный `Alt + Tab` поверх ВСЕХ окон + `Win + D` → Luma OS** | Переработанный Win32 `WH_KEYBOARD_LL` перехватчик с `AttachThreadInput` и временным `HWND_TOPMOST` мгновенно открывает стеклянный **Luma Switcher** поверх Chrome, Telegram и любых приложений Windows; нажатие **`Win + D`** полностью заменено на мгновенный возврат на главный экран Luma OS. |
| **Аутентичный Microsoft-интерфейс Luma Office** | Фирменные цветные шапки (`Word #185ABD`, `Excel #107C41`, `PowerPoint #B7472A`), подписанные группы ленты **Ribbon**, меню **«Файл» (Backstage)** с шаблонами и строка поиска инструментов (**Tell Me**). |
| **Сон и выключение экрана при бездействии** | Отдельные таймеры выключения экрана и перехода в сон для работы **От сети (ПК)** и **От батареи (Ноутбук)**, гибернация, блокировка перед сном, живой счётчик бездействия и режим **«Не засыпать»**. |

---

## Что нового было в **Luma OS 1.5.2 (Carbon · C-6 · Ядро `1.4.5`)**

| Модуль | Ключевые улучшения и исправления обновления 1.5.2 |
| :--- | :--- |
| **Zero-Freeze запись экрана (`LumaCore 1.4.5`)** | Полностью исправлен критический баг зависания ПК при запуске записи экрана: внедрён нативный фоновый Go AVI-рекордер (`~/Videos/LumaRecordings`) без блокировки WebView2/Topmost и мгновенная остановка по **`Ctrl + Shift + S`**. |
| **Luma Cut Studio Pro (CapCut-класса)** | Многодорожечный таймлайн (**V1, V2 PiP с Blend Modes, T1, A1 + бит-маркеры**), маски и хромакей, ключевые кадры, кривые скорости, LUT + кривые RGB + ретушь, озвучка и Seed Audio, автосубтитры, EditPilot ИИ-монтаж и Design Studio. |
| **Luma Code Studio Pro (IDE)** | Исправлена потеря кода при сворачивании (автосохранение в реальном времени), добавлена live-диагностика ошибок кода и многовкладочный Pro Терминал. |
| **Luma AI 3.0 & Конструктор виджетов Pro (115+ опций)** | Двух-источниковый веб-синтез (**Wikipedia + DuckDuckGo**), переводчик, суммаризатор, калькулятор, конструктор виджетов с запуском любых программ ПК и расширенные Сценарии. |

---

## Галерея 4K UHD обоев **Carbon**

> Все 4K обои встроены в `LumaOS_1.5.4.exe` и дополняют полную накопительную коллекцию предыдущих версий (`Boron 1.4`, `Beryllium 1.3.1`, `Lithium 1.2`, `Obsidian Silk`, `Helium 1.1` + 10 живых CSS-обоев).

<table>
  <tr>
    <td width="33%" align="center">
      <img src="public/luma-carbon-hero.jpg" alt="Carbon 4K UHD Monolith" width="100%" />
      <br />
      <b>Carbon — 4K UHD Monolith</b>
    </td>
    <td width="33%" align="center">
      <img src="public/luma-carbon-weave.jpg" alt="Carbon Weave 4K UHD" width="100%" />
      <br />
      <b>Carbon Weave — 4K UHD</b>
    </td>
    <td width="33%" align="center">
      <img src="public/luma-carbon-forged.jpg" alt="Forged Carbon 4K UHD" width="100%" />
      <br />
      <b>Forged Carbon — 4K UHD</b>
    </td>
  </tr>
</table>

---

## API ядра `LumaCore 1.4.7`

| Метод и эндпоинт | Назначение |
| :--- | :--- |
| `GET / POST / DELETE /api/kernel/notifications/os` | Переписанный движок уведомлений (WPN DB/WAL + COM UIA, кто/что/когда, 0% спама из мута) |
| `GET /api/kernel/windows/previews` · `.../preview?pid=` | Живые превью открытых окон Windows в реальном времени для `Alt + Tab` |
| `GET / POST /api/kernel/power/charge-limit` | **Battery Care** — ограничение максимального заряда аккумулятора (`50%–100%`) |
| `GET / POST /api/kernel/power/idle-sleep` | Настройки сна и отключения экрана при бездействии (от сети и от батареи) |
| `POST /api/kernel/capture/native-record/start\|stop` · `GET .../status` | Нативный Zero-Freeze AVI-рекордер экрана в фоне (`~/Videos/LumaRecordings`) |
| `POST /api/kernel/alt-tab/toggle` · `.../release` | Управление нативным перехватчиком `Alt + Tab` и `Win + D` |
| `POST /api/kernel/ai/chat` | Движок **Luma AI 3.0** (`Luma Lang 3.0` + `Luma Code 3.0` + Веб-синтез) |
| `POST /api/kernel/office/import` · `export` | Нативный импорт/экспорт `.pptx`, `.docx`, `.xlsx`, `.odp`, `.odt`, `.ods`, `.csv`, `.md`, `.html`, `.rtf`, `.txt` |
| `POST /api/kernel/security/scan-file` · `GET .../report` | Антивирус `LumaShield 2.0` (175+ правил, проверка архивов, VBA-макросов и отчёт `.md`) |
| `GET /api/kernel/wireless/batteries?refresh=1` | Сканер Bluetooth, BLE и 2.4GHz мышек **IO**, **Ajazz**, **Ardor Gaming**, **Logitech**, **Razer** и др. |

---

## Горячие клавиши

| Комбинация | Действие |
| :--- | :--- |
| `Alt + Tab` (или `Alt + Q`) | **Умный переключатель окон Luma OS** (MRU-порядок + живые превью открытых окон) |
| `Win + D` | Мгновенный возврат на главный экран **Luma OS** |
| `Alt + N` | **Шторка уведомлений** (кто, что и когда написал) |
| `Tab` (или правый верхний угол) | **Панель управления Carbon (`1/4 × 1/2`)** + быстрые настройки |
| `Ctrl + Shift + S` | Мгновенная остановка Zero-Freeze записи экрана |
| `Alt + R` / `Ctrl + K` | **Luma Search** — мгновенный поиск приложений ПК, студий, настроек, служб и веба |
| `Ctrl + Shift + P` / `Ctrl + /` | Command Palette и комментирование строк в **Code Studio Pro** |
| `F5` (в Luma PowerPoint) | Полноэкранный показ презентации с переходами, анимациями и лазерной указкой |
| `Esc` / `Ctrl + Alt + Esc` | Мгновенный выход и блокировка **Приватного рабочего стола** |
| `Alt + Shift` / `Win + Space` | Мгновенная смена раскладки клавиатуры |
| `Ctrl + Alt + Shift + W` | Экстренное восстановление системной панели задач Windows |

---

## Скачать Luma OS (все сборки)

Все исполняемые файлы автономны (**Single-Binary Portable EXE** — встроенный фронтенд + Go-ядро, установка не требуется):

| Версия | Кодовое имя | Ядро / Защита | Прямая ссылка |
| :--- | :--- | :--- | :--- |
| **1.5.4 (Актуальная)** | **Carbon · C-6** | `LumaCore 1.4.7` · `24/7 Stability` · `Шторка` · `140+ Excel` · `Battery Care` | [**LumaOS_1.5.4.exe**](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.5.4.exe) |
| **1.5.3** | Carbon · C-6 | `LumaCore 1.4.6` · `Topmost Alt+Tab` · `MS-style Office` · `Idle Sleep` | [LumaOS_1.5.3.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.5.3.exe) |
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
| **1.2** | Lithium · Li-3 | `LumaCore 1.2` | [LumaOS_1.2.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.exe) |
| **1.1** | Helium · He-2 | `LumaCore 1.1` | [LumaOS_1.1.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.1.exe) |
| **1.0.4** | Classic DeX | `LumaCore 1.0` | [LumaOS_1.0.4.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.0.4.exe) |

---

## Сборка из исходников

```bash
npm install
npm run build
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.5.2.exe .
```
