<div align="center">

<img src="public/luma-carbon-hero.jpg" alt="Luma OS 1.5.1 (Carbon · C-6 · 4K UHD)" width="100%" style="border-radius: 18px;" />

<br />

# Luma OS 1.5.1 — **Carbon · C-6**

**Флагманская настольная операционная среда для Windows 10 / 11 на ядре `LumaCore 1.6.1`, антивирусе `LumaShield 2.0`, встроенном `Luma Office Studio` и `Luma AI 2.0`**

<p>
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.5.1"><img src="https://img.shields.io/badge/Release-v1.5.1%20(Carbon%20·%20C--6)-06b6d4?style=for-the-badge" alt="Release v1.5.1" /></a>
  <img src="https://img.shields.io/badge/Kernel-LumaCore%201.6.1%20(Zero--WMI)-10b981?style=for-the-badge" alt="LumaCore 1.6.1" />
  <img src="https://img.shields.io/badge/Security-LumaShield%202.0%20(175%2B%20Rules)-f43f5e?style=for-the-badge" alt="LumaShield 2.0" />
  <img src="https://img.shields.io/badge/Office-Docs%20·%20Sheets%20·%20Slides-3b82f6?style=for-the-badge" alt="Luma Office Studio" />
  <img src="https://img.shields.io/badge/AI-Luma%20AI%202.0%20Offline-8b5cf6?style=for-the-badge" alt="Luma AI 2.0" />
  <img src="https://img.shields.io/badge/Wallpapers-4K%20UHD%203840×2160-f59e0b?style=for-the-badge" alt="4K UHD Wallpapers" />
</p>

<h3>
  <a href="https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.5.1.exe">⬇️ Скачать LumaOS_1.5.1.exe (Portable · 1 файл · 0 зависимостей)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.5.1">📦 Страница релиза v1.5.1</a>
</h3>

</div>

---

## Что нового в **Luma OS 1.5.1 (Carbon · C-6)**

| Модуль | Ключевые улучшения обновления 1.5.1 |
| :--- | :--- |
| **Luma Office Studio (Word · Excel · PowerPoint)** | Полноценный встроенный офисный пакет на нативном Go-движке (`archive/zip` + `encoding/xml`): **без ошибок открывает реальные `.pptx` (с изображениями, фигурами, текстом, таблицами и заметками), `.docx`, `.xlsx`, `.odp`, `.odt`, `.ods`, `.csv`, `.md`, `.html`, `.rtf`, `.txt`, `.json`** и сохраняет/экспортирует в **любой формат** (`.pptx`, `.docx`, `.xlsx`, `.pdf`, `.png`, `.html`, `.md`, `.csv`, `.tsv`, `.rtf`, `.txt`, `.json`). Поддерживает формулы (`SUM`, `AVG`, `MIN`, `MAX`, `IF`, `COUNT`, `ROUND`), SVG-диаграммы и режим показа слайдов `F5` с лазерной указкой. |
| **Надёжные уведомления Telegram / Мессенджеров + Резинка Dynamic Island** | Двухуровневый мост уведомлений ОС: прямое чтение Windows WPN `wpndatabase.db` + `WAL` и отслеживание счётчиков непрочитанных окон **Telegram, Discord, WhatsApp, Viber, VK, Slack, Teams, Steam**. При каждом новом сообщении **Dynamic Island** плавно растягивается с **упругим «эффектом резины»** и сразу же сжимается обратно. |
| **Luma AI 2.0 (`Luma Lang 2.0` + `Luma Code 2.0`)** | Обновлённые встроенные офлайн-модели: многоходовая память диалога, статический код-ревьюер и отладчик, решатель квадратных уравнений, ассистент деловых писем/планов/чеклистов и **45+ инженерных рецептов** без API-ключей и интернета. |
| **4K UHD обои (`3840×2160`) без «мыла»** | Все 3 фирменных обоев Carbon пересобраны в кристально чётком **4K UHD (`3840×2160`, 4:4:4 JPEG)** при полном сохранении всей галереи обоев прошлых версий. |
| **Панель управления Carbon Pro + чистый трей-центр** | Новые настройки прямо в Панели управления (`Tab` / правый верхний угол): **Ночной свет** (слайдер защиты глаз), **Игровой режим** (CPU/RAM Boost), **Mute микрофона**, 3-позиционный **План питания**, палитра акцентных цветов, переключатель **вывода и ввода звука**, кнопка **«Свернуть / Развернуть» Центр уведомлений** и **автозакрытие при отводе курсора**. Из нижнего окна трея убраны лишние кнопки (*Заблокировать, Сон, Корзина, EXE*) и настройки панели задач (теперь только в *Настройки → Панель задач*). |
| **Супер-антивирус `LumaShield 2.0` (175+ правил)** | Расширенная база из **175+ сигнатур**: щит от стилеров **Telegram `tdata`, Discord, браузеров и криптокошельков**, проверка **ZIP-архивов и Office VBA-макросов (`vbaProject.bin`)**, проверка любого отдельного файла перетаскиванием (`Drag & Drop`) и экспорт полного отчёта аудита в `.md`. |
| **Точный Таймер + Умные ПКМ-меню (`SmartContextMenu`)** | Исправлено отображение секунд в виджете Таймера (`tabular-nums` `MM:SS` без обрезания + пресеты `5 / 15 / 25 / 45м` + режим Секундомера). Все контекстные меню ПКМ (панель задач, трей, рабочий стол, виджеты, ярлыки) автоматически удерживаются внутри экрана и никогда не выходят за его границы. |
| **Luma Code Studio Pro** | Чистый старт с пустого файла `untitled.txt` **без автозагрузки системных файлов** (проводник открывает только выбранную пользователем папку/файл), живая подсветка синтаксиса, миникарта кода, автозакрытие скобок и автоотступ, **Command Palette (`Ctrl+Shift+P`)**, сниппеты, форматтер и «Сохранить как». |
| **Luma Cut Studio Pro** | Выбор кодека (**VP9 / VP8 / H.264 / AV1**), разрешения (**480p / 720p / 1080p**), FPS (**24 / 30 / 60**), битрейта (**2–16 Мбит/с**), **8 переходов**, **6 Ken Burns анимаций**, **8 анимаций титров**, **12 кино-LUT**, эффекты **Film Grain / VHS / Chromatic / 21:9**, стикеры, плавное затухание звука, **Undo/Redo** и снимок кадра в PNG. |
| **Календарь Pro · Корзина Pro · Терминал (+20 команд)** | **Календарь**: почасовой таймлайн Дня (`07:00–23:00`), категории, быстрый ввод `15:30 Встреча`, статистика выполнения и живые напоминания. **Корзина**: мультивыбор, фильтры категорий, сортировка, встроенный предпросмотр файла, загрузка перетаскиванием и автоочистка. **Терминал**: +20 новых системных команд (`ip`, `tcp`, `battery`, `wireless`, `scan`, `hosts`, `trash`, `dpi`, `uptime`, `uuid`, `hash`, `base64`, `hex`, `date`, `matrix`, `gc`, `notify` и др.). |

---

## Галерея 4K UHD обоев **Carbon 1.5.1**

> Все 4K обои встроены в `LumaOS_1.5.1.exe` и дополняют полную накопительную коллекцию предыдущих версий (`Boron 1.4`, `Beryllium 1.3.1`, `Lithium 1.2`, `Obsidian Silk`, `Helium 1.1` + 10 живых CSS-обоев).

<table>
  <tr>
    <td width="33%" align="center">
      <img src="public/luma-carbon-hero.jpg" alt="Carbon 1.5.1 4K UHD Monolith" width="100%" />
      <br />
      <b>Carbon 1.5.1 — 4K UHD Monolith</b>
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

## Новые API ядра `LumaCore 1.6.1`

| Метод и эндпоинт | Назначение |
| :--- | :--- |
| `POST /api/kernel/office/import` | Нативный импорт `.pptx` (с `ppt/media/*` картинками), `.docx`, `.xlsx`, `.odp`, `.odt`, `.ods`, `.csv`, `.md`, `.html`, `.rtf`, `.txt`, `.json` |
| `POST /api/kernel/office/export` | Нативный экспорт в `.pptx`, `.docx`, `.xlsx`, `.html`, `.md`, `.csv`, `.tsv`, `.rtf`, `.txt`, `.json` |
| `GET / POST / DELETE /api/kernel/notifications/os` | Живой мост уведомлений Windows WPN + Telegram / Discord / WhatsApp / VK / Viber |
| `POST /api/kernel/security/scan-file` | Проверка отдельного файла / ZIP / Office VBA макросов через `LumaShield 2.0` |
| `GET /api/kernel/security/report` | Экспорт полного Markdown-отчёта аудита безопасности `LumaShield 2.0` |
| `GET / POST /api/kernel/trash` | Корзина Pro (`preview`, `bulk_restore`, `bulk_delete`, `upload`, `auto_clean`, `empty`) |
| `GET / POST /api/kernel/vault/*` | Суперконфиденциальность (`AES-256-GCM` изолированный стол) |
| `GET /api/kernel/wireless/batteries?refresh=1` | Сканер Bluetooth, BLE и 2.4GHz мышек **IO (Nova SE)**, **Ajazz**, **Ardor Gaming**, **Logitech**, **Razer** и др. |

---

## Горячие клавиши

| Комбинация | Действие |
| :--- | :--- |
| `Tab` (или правый верхний угол) | **Панель управления Carbon (`1/4 × 1/2`)** + сворачиваемый Центр уведомлений |
| `Alt + R` / `Ctrl + K` | **Luma Search** — мгновенный поиск приложений ПК, Office Studio, настроек, служб и веба |
| `Ctrl + Shift + P` (в Code Studio) | Command Palette (форматирование, сниппеты, поиск, превью) |
| `F5` (в Office Slides) | Полноэкранный показ презентации с переходами и лазерной указкой |
| `Esc × 2` (внутри сейфа) | Экстренная блокировка **Суперконфиденциальности** |
| `Alt + Shift` / `Win + Space` | Мгновенная смена раскладки клавиатуры |
| `Alt + W` / `Alt + D` / `F11` | Обзор окон / Показать рабочий стол / Полный экран |
| `Ctrl + Alt + Shift + W` | Экстренное восстановление системной панели задач Windows |

---

## Скачать Luma OS (все сборки)

Все исполняемые файлы автономны (**Single-Binary Portable EXE** — встроенный фронтенд + Go-ядро, установка не требуется):

| Версия | Кодовое имя | Ядро / Защита | Прямая ссылка |
| :--- | :--- | :--- | :--- |
| **1.5.1 (Актуальная)** | **Carbon · C-6** | `LumaCore 1.6.1` · `LumaShield 2.0` · `Office Studio` · `AI 2.0` | [**LumaOS_1.5.1.exe**](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.5.1.exe) |
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.5.1.exe .
```
