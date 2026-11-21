<div align="center">

<img src="public/luma-lithium-hero.jpg" alt="Luma OS 1.2.2 Lithium" width="100%" style="border-radius: 20px;" />

# Luma OS `1.2.2 (Lithium)`

**Настольная операционная среда на собственном Go-ядре `LumaCore 1.2`, антивирусном ядре `LumaShield 1.3` и шине `Plugin API v2.0`**

[![Version](https://img.shields.io/badge/Luma%20OS-1.2.2%20Lithium%20Patch-10b981?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/releases/tag/v1.2.2)
[![Kernel](https://img.shields.io/badge/LumaCore-1.2-06b6d4?style=for-the-badge)](luma_kernel_main.go)
[![Security](https://img.shields.io/badge/LumaShield-1.3-ef4444?style=for-the-badge)](kernel_security.go)
[![AI](https://img.shields.io/badge/Luma%20AI-Lang%20%2B%20Code%20%2B%20Verbosity-8b5cf6?style=for-the-badge)](kernel_ai_local.go)
[![Windows](https://img.shields.io/badge/Windows%20x64-Standalone%20GUI-111113?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.2.exe)

### [⬇ Скачать LumaOS_1.2.2.exe (Windows x64 · Без браузера · Встроенная иконка)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.2.exe)

</div>

---

## Что нового в патче `1.2.2 (Lithium)`

> **Схема версий SemVer `X.Y.Z`:** 1-я цифра `X` — Глобальное обновление · 2-я цифра `Y` — Большое обновление версии · 3-я цифра `Z` — Патч исправлений и улучшений.

| Модуль | Возможности |
| :--- | :--- |
| **Раскладки клавиатуры · 120+ языков мира** | Живой индикатор языка ввода в трее (`RUS` / `ENG` / `ROM`…), нативное переключение раскладки Windows (`LoadKeyboardLayoutW` + `WM_INPUTLANGCHANGEREQUEST`) и поиск по каталогу из **120+ языков мира** по 7 регионам с мгновенным добавлением, активацией и удалением |
| **Исправлен `Alt + R` (Spotlight / Выполнить)** | Трёхслойный перехват: нативный Win32 `GetAsyncKeyState(VK_MENU + VK_R)` в `window_windows.go`, ранний `w.Init()` capture-скрипт в WebView2 и capture-phase обработчик `document` независимо от текущей раскладки (RU/EN/др.) + резервная комбинация `Ctrl + K` |
| **Переключение вывода и ввода звука в Центре управления** | Прямо под ползунком громкости в меню Центра управления добавлены раскрывающиеся списки **«Вывод звука»** (динамики / наушники / HDMI) и **«Микрофон / Ввод»** с реальным переключением устройств Windows по умолчанию (`CoreAudio IMMDeviceEnumerator` / `IPolicyConfig`) |
| **Заряд беспроводных устройств (%)** | Отображение реального процента заряда Bluetooth/HID мышек, клавиатур, наушников и геймпадов (`DEVPKEY_Bluetooth_BatteryLevel` / `/sys/class/power_supply`) в Центре управления, разделе **Bluetooth** и аналитике **Батареи** |
| **Ядро безопасности `LumaShield 1.3`** | 20+ новых эвристических правил (Ransomware, Stealer, LOLBins, Reverse Shell), детектор подмены PE-заголовка (`MZ`), энтропия Шеннона для запакованных угроз, фоновый **Real-Time Guard**, сканер активных процессов, глубокое сканирование, **Карантин всех угроз** и постоянный **Белый список (Исключения)** |
| **Объём информации в ответах ИИ** | Выбор детализации ответов **`Кратко`** / **`Баланс`** / **`Подробно`** в боковой панели Luma AI и в **Настройки → ИИ и Нейросети** — управляет как автономными моделями (`Luma Lang 1.2`, `Luma Code 1.2`), так и всеми облачными провайдерами |
| **18 языков интерфейса системы** | К 9 существующим языкам добавлены **Польский, Турецкий, Итальянский, Португальский, Корейский, Арабский, Казахский, Хинди и Нидерландский** |
| **Панель задач: порядок окон Windows + папка «Luma Система»** | Перетаскивание мышью и кнопки **▲ / ▼** для **открытых приложений Windows** (Chrome, Steam, Discord и др.) + опция **«Сжать системные приложения в папку»**, объединяющая все системные окна Luma в одну аккуратную папку-кнопку с выпадающей сеткой |
| **Dynamic Island 2.0 (Реактивный + Аудиоспектр)** | Остров реагирует пружинным импульсом на действия пользователя (громкость, смена звука/раскладки, запуск/удаление приложений, тема, DND) и показывает **7-полосный гармонический аудиоспектр** с вращающимся виниловым диском во время воспроизведения музыки |
| **Добавление всех установленных программ ПК на стол** | Реальный сканер меню Пуск (`.lnk`) и реестра Uninstall (Windows) / `.desktop` (Linux) + окно выбора **«Программы ПК»** с поиском, категориями, *Выбрать все* и размещением прямо на сетке или в новой папке рабочего стола |
| **Анимации удаления приложений и виджетов** | Плавные пружинные анимации исчезновения (`.luma-delete-widget` и `.luma-delete-app` со сжатием и размытием) при удалении виджетов, папок, ярлыков и карточек в библиотеке и настройках |
| **Откат версии (Version Rollback)** | В **Настройки → Обновления и Откат** можно безопасно вернуться на любую предыдущую версию (`1.2.1`, `1.2.0`, `1.1.0`, `1.0.4`, `1.0.3`, `1.0.2b`). Текущая сборка автоматически бэкапится в `%APPDATA%/LumaOS/versions` для мгновенного офлайн-отката, а все виджеты и настройки сохраняются на диске |

---

## Быстрый старт (Windows)

1. Скачайте автономный файл **[LumaOS_1.2.2.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.2.exe)**.
2. Запустите двойным кликом — Luma OS откроется в собственном окне WebView2 со встроенной иконкой (без открытия Microsoft Edge), а все ваши виджеты, папки, ярлыки и настройки с предыдущих версий подхватятся автоматически.
3. Горячие клавиши:
   - `Alt + R` или `Ctrl + K` — Поиск / Выполнить (Spotlight)
   - `Alt + W` — Обзор окон, разделение экрана и виртуальные столы (Multitasking)
   - `F11` — Полноэкранный режим
   - `Alt + D` — Показать рабочий стол
   - `Ctrl + Alt + Shift + W` — Экстренно вернуть панель задач Windows (если включён Shell Mode)

---

## Сборка из исходников

```bash
# 1. Сборка фронтенда (React + Vite + Tailwind)
npm install
npm run build

# 2. Сборка автономного Windows EXE со встроенным UI и ресурсами
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.2.2.exe .
```

## Архитектура проекта

- [`luma_kernel_main.go`](luma_kernel_main.go) — ядро `LumaCore 1.2`, HTTP/RPC-сервер (`127.0.0.1:49215/49216`), Audio I/O API, Wireless Batteries API, World Keyboard Layouts API, Installed Apps Scanner, `LumaShield 1.3` и Version Rollback API
- [`kernel_security.go`](kernel_security.go) — ядро безопасности `LumaShield 1.3`: 20+ эвристических правил, PE-анализ, энтропия Шеннона, Real-Time Guard, сканер процессов, карантин и белый список
- [`kernel_ai_local.go`](kernel_ai_local.go) — двойной ИИ-движок `Luma Lang 1.2` и `Luma Code 1.2` с 3 режимами объёма информации (`brief` / `balanced` / `detailed`)
- [`kernel_updater_ai.go`](kernel_updater_ai.go) — GitHub OTA-обновлятор + движок **Version Rollback** с автобэкапом в `%APPDATA%/LumaOS/versions` и проверкой PE32+
- [`window_windows.go`](window_windows.go) / [`system_windows.go`](system_windows.go) — нативный Win32 `Alt+R` перехватчик, WebView2 профиль, CoreAudio I/O, Bluetooth батареи, Win32 раскладки клавиатуры, сканер установленных программ ПК, Shell Mode и трёхуровневая телеметрия АКБ
- [`src/data/worldLanguages.ts`](src/data/worldLanguages.ts) — справочник 120+ раскладок клавиатуры со всего мира с BCP-47 тегами и Win32 KLID
- [`src/i18n/translations.ts`](src/i18n/translations.ts) — полный словарь перевода системы на 18 языков
- [`src/components/LumaDesktopCanvas.tsx`](src/components/LumaDesktopCanvas.tsx) — сетка рабочего стола с анимациями удаления и окном добавления установленных программ ПК
- [`src/components/LumaSecurityPanel.tsx`](src/components/LumaSecurityPanel.tsx) — интерфейс антивируса `LumaShield 1.3` (Guard, 4 режима скана, Карантин, Исключения)
- [`src/components/LumaAIAssistantWindow.tsx`](src/components/LumaAIAssistantWindow.tsx) — чат Luma AI с выбором объёма информации (`Кратко / Баланс / Подробно`) и моделей
- [`src/components/LumaBatteryPanel.tsx`](src/components/LumaBatteryPanel.tsx) — аналитика батареи ноутбука + проценты заряда беспроводных периферийных устройств
