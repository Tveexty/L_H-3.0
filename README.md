<div align="center">

<img src="public/luma-nitrogen-hero.jpg" alt="Luma OS 1.6.2 (Nitrogen · N-7 · 2.5D Cryo-Glass QHD)" width="100%" style="border-radius: 18px;" />

<br />

# Luma OS 1.6.2 — **Nitrogen · N-7**

**Флагманская настольная операционная среда для Windows 10 / 11 на ядре `LumaCore 1.5.2` и защите `LumaShield 2.5` (275 правил), с умной нейросетью `Luma AI 5.0 Nexus` (долгосрочная память · глубокое управление ПК · весь интернет), «Luma Обвести для поиска» (OCR + перевод + веб-поиск по экрану), Управлением жестами и Спецвозможностями, живым индикатором загрузок, безопасной Корзиной Luma OS, гибкой перетаскиваемой «Папкой Luma», фирменными стилями `Luma Matrix` / `Luma Glass` / `Luma Nova` и 2.5D обоями Nitrogen Cryo-Glass**

<p>
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.2"><img src="https://img.shields.io/badge/Release-v1.6.2%20(Nitrogen%20·%20N--7)-38bdf8?style=for-the-badge" alt="Release v1.6.2" /></a>
  <img src="https://img.shields.io/badge/Kernel-LumaCore%201.5.2%20(v1.6.2)-10b981?style=for-the-badge" alt="LumaCore 1.5.2" />
  <img src="https://img.shields.io/badge/Security-LumaShield%202.5%20(275%20Rules)-f43f5e?style=for-the-badge" alt="LumaShield 2.5" />
  <img src="https://img.shields.io/badge/AI-Luma%20AI%205.0%20Nexus-8b5cf6?style=for-the-badge" alt="Luma AI 5.0 Nexus" />
  <img src="https://img.shields.io/badge/Lens-Обвести%20для%20поиска-0ea5e9?style=for-the-badge" alt="Luma Lens" />
  <img src="https://img.shields.io/badge/Gestures-3%2F4%20пальца%20%2B%20Мышь-06b6d4?style=for-the-badge" alt="Gestures" />
</p>

<h3>
  <a href="https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.2.exe">⬇️ Скачать LumaOS_1.6.2.exe (Portable · 1 файл · 0 зависимостей)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.2">📦 Релиз v1.6.2</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="PATCH_NOTES_1.6.2.md">📝 Патч-ноут 1.6.2</a>
</h3>

</div>

---

## Что нового в **Luma OS 1.6.2 (Nitrogen · N-7 · `LumaCore 1.5.2` · `Luma AI 5.0 Nexus`)**

| Модуль | Ключевые улучшения обновления 1.6.2 |
| :--- | :--- |
| **Фикс перетаскивания приложений в папки** | Устранён баг с появлением нерабочего `.png` в папке: иконки ярлыков защищены (`draggable={false}`, `pointer-events-none`), внутренние перетаскивания ярлыков (`application/x-luma-shortcut`) обрабатываются с приоритетом и переносят реальное рабочее приложение с сохранением его родной иконки. |
| **Живой индикатор загрузок на панели** | При скачивании файлов в браузерах (`.crdownload`/`.part`/`.opdownload`/`.download`), торрентах (`.!qb`/`.!ut`/`.aria2`), Telegram, Steam или любых активно растущих файлов в `Downloads` на панели задач автоматически появляется неоновая капсула с названием, `%`, скоростью `МБ/с` и прогресс-баром; после завершения автоматически скрывается. |
| **Luma AI 5.0 Nexus (Память · Система · Весь интернет)** | Долгосрочная память о пользователе (`%AppData%/LumaOS/ai_memory_v5.json` + менеджер «Память» в окне чата), контекст диалога, развёрнутые статьи Википедии RU/EN, переводчик на 50 языков, математика/уравнения и глубокое управление ПК (диагностика тормозов с топ-процессами, пинг, буфер обмена, завершение процессов, очистка Temp, Корзина, Luma Lens). |
| **Управление · Спецвозможности (Жесты + ПКМ + Плагины)** | Новый единый раздел в Настройках: **Управление жестами** (3 пальца вниз = **Скриншот**, 3 пальца вверх = Обзор окон, влево/вправо = Рабочие столы, 4 пальца вниз = Рабочий стол, Круг / 3 пальца тап = **Luma Обвести для поиска**, плюс режим жестов мышью `Alt + ПКМ`), настройки меню **ПКМ**, управление **Плагинами** и опции доступности. |
| **Luma Обвести для поиска (`Ctrl+Shift+L`)** | Полноценный визуальный поиск по экрану: захват экрана (`Win32 BitBlt`), свободное обведение кругом (лассо) или рамкой, офлайн-OCR текста (`RU+EN`), палитра доминирующих цветов, перевод в 1 клик, веб-поиск через `Luma AI 5.0`, сохранение вырезки PNG и визуальный поиск. |
| **Гибкая «Папка Luma» слева** | Перемещена в крайне левый слот панели задач по умолчанию, свободно **перетаскивается мышью** между 4 позициями панели и скрывается / добавляется в 1 клик в Настройках → Панель задач. |
| **Безопасное удаление в Корзину Luma OS** | Все удаляемые файлы и папки (Проводник, API ядра, Luma AI 5.0) безопасно перемещаются в **Корзину Luma OS** с мгновенным обновлением и восстановлением в 1 клик. |

---

## Все флагманские возможности ветки **1.6.x (Nitrogen · N-7)**

- **Режим разработчика (`Ctrl + Shift + D`) и Режим Администратора (UAC):** живой Developer HUD (FPS, JS/Go RAM, горутины, лог IPC, DOM-инспектор) + определение прав Администратора и перезапуск через `runas`.
- **Стиль системы `Luma Nova`:** панель задач без кнопки Пуск и компактная верхняя правая капсула (Язык · Wi-Fi · Батарея) с компактным Пуском/лаунчером, переключателем окон рабочего стола, `Alt + R`, рабочими столами `D1–D4`, звуком, яркостью и питанием.
- **`Luma SwapBoost` (Виртуальная память 2 / 4 / 6 ГБ):** фиксированный `pagefile.sys` (`Min == Max`), сжатие памяти Windows, `ClearPageFileAtShutdown = 0` и расчёт ресурса **TBW**.
- **Ядро `LumaCore 1.5.2` и защита `LumaShield 2.5`:** 275 эвристических и сигнатурных правил, аудит автозагрузки и Планировщика задач, 0 утечек Win32-колбэков (`syscall.NewCallback` строго синглтоны).
- **«Поверх всех окон» (`📌 Always on Top`):** для всех 21 окна Luma OS и любых внешних окон Windows (`SetWindowPos HWND_TOPMOST/HWND_NOTOPMOST`).
- **`Luma Gamepad Studio`:** DualShock 4, DualSense, Xbox (XInput) и HID, 60 FPS визуализатор, профили, кривые/мёртвые зоны, RGB Lightbar, вибрация, `125–1000 Гц` и эмуляция мыши/клавиатуры.
- **`Luma Deep Uninstaller`:** список программ, деинсталлятор, 4-этапный сканер остатков (файлы, реестр HKCU/HKLM, службы/задачи), галочки, автобэкап и безопасное восстановление.
- **`Luma Peek` по клавише `Space`:** фото (зум/поворот), видео и аудио (**HTTP 206 Range**), код с подсветкой + AI 5.0, PDF, Markdown, перелистывание стрелками.
- **Клавиша `Win` и исправленный `Alt + Tab`:** одиночный `Win` открывает Пуск Luma OS / панель `Luma Nova` (сохраняя `Win+D`, `Win+L`, `Win+Shift+S`, `Win+Space`, `Win+E`), а `Alt + Tab` стабильно фокусируется поверх рабочего стола со стрелками/`Enter`/`Esc`.

---

## Галерея обоев **Nitrogen (QHD 2560×1440)**

> Все 20 обоев встроены в `LumaOS_1.6.2.exe` (включая полную коллекцию предыдущих версий).

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

## Скачать Luma OS (все 20 сборок сохранены)

Все исполняемые файлы автономны (**Single-Binary Portable EXE** — встроенный фронтенд + Go-ядро, установка не требуется):

| Версия | Кодовое имя | Ядро / Возможности | Прямая ссылка |
| :--- | :--- | :--- | :--- |
| **1.6.2 (Актуальная)** | **Nitrogen · N-7** | `LumaCore 1.5.2` · `Luma AI 5.0 Nexus` · `Luma Обвести для поиска` · `Жесты & Спецвозможности` · `Live Загрузки` · `Безопасная Корзина` | [**LumaOS_1.6.2.exe**](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.2.exe) |
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.6.1.exe .
```
