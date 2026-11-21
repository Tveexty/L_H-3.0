<div align="center">

<img src="public/luma-lithium-hero.jpg" alt="Luma OS 1.2.1 Lithium" width="100%" style="border-radius: 20px;" />

# Luma OS `1.2.1 (Lithium)`

**Настольная операционная среда на собственном Go-ядре `LumaCore 1.2`, модуле безопасности `LumaShield 1.2` и шине `Plugin API v2.0`**

[![Version](https://img.shields.io/badge/Luma%20OS-1.2.1%20Lithium%20Patch-10b981?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/releases/tag/v1.2.1)
[![Kernel](https://img.shields.io/badge/LumaCore-1.2-06b6d4?style=for-the-badge)](luma_kernel_main.go)
[![Plugins](https://img.shields.io/badge/Plugin%20API-v2.0-f59e0b?style=for-the-badge)](src/data/launcherData.ts)
[![AI](https://img.shields.io/badge/Luma%20AI-Lang%201.2%20%2B%20Code%201.2-8b5cf6?style=for-the-badge)](kernel_ai_local.go)
[![Windows](https://img.shields.io/badge/Windows%20x64-Standalone%20GUI-111113?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.1.exe)

### [⬇ Скачать LumaOS_1.2.1.exe (Windows x64 · Без браузера · Встроенная иконка)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.1.exe)

</div>

---

## Что нового в патче `1.2.1 (Lithium)`

> **Схема версий SemVer `X.Y.Z`:** 1-я цифра `X` — Глобальное обновление · 2-я цифра `Y` — Большое обновление версии · 3-я цифра `Z` — Патч исправлений и небольших улучшений.

| Модуль | Возможности |
| :--- | :--- |
| **Адаптация под экран (Ноутбук ↔ Монитор)** | Автоматическое адаптивное масштабирование относительно базового экрана ноутбука `1440×900` + точный ручной слайдер `85%–135%` в разделе **«Графика и Экран»**, чтобы на большом мониторе интерфейс не выглядел слишком мелким |
| **Редактирование приложений и размер иконок** | В **Настройки → Приложения** добавлен живой регулятор размера иконок (`36–72 px` + пресеты *Компакт / Стандарт / Крупные / XL*) с мгновенным обновлением на рабочем столе и в библиотеке + встроенный редактор приложений (название, категория, URL/путь, иконка) |
| **Оптимизация GPU и графических процессов** | Новый раздел **«Графика и Экран»**: 4 графических профиля (*Ультра / Баланс / Производительность / Эко*), отключение GPU-размытия (`backdrop-filter`) и теней окон, автопауза живых обоев при открытых окнах, настройка частоты опроса телеметрии (`1.5 с / 3 с / 6 с`) |
| **Улучшенный Проводник Luma Explorer** | Быстрые чипы фильтрации файлов (*Все / Папки / Изображения / Код / Документы / Медиа*), закрепляемое **Избранное (`★`)**, нативный предпросмотр изображений (`/api/kernel/fs/raw`) прямо внутри Проводника и быстрое редактирование с сохранением текстовых файлов и кода |
| **Понятные имена открытых программ и порядок на панели задач** | Выбор отображения открытых программ ПК (**Имя приложения**: *Chrome, Steam, Telegram, VS Code* / **Заголовок окна** / **Компактный бейдж**), скрытие служебного UWP-шума + **редактирование порядка приложений** перетаскиванием прямо на панели задач или кнопками **▲ / ▼** в настройках |
| **Точный Диспетчер задач (Фоновые процессы)** | Полностью переписан сборщик процессов Windows: реальная мгновенная загрузка CPU `0–100%` (дельта `TotalProcessorTime` + `Win32_PerfFormattedData_PerfProc_Process`), Private/Working RAM, потоки (Threads), описания, `friendly_name` и чистая группировка (*Luma / Открытые окна ПК / Фоновые / Системные*) |
| **Точная телеметрия батареи ноутбука** | Трёхуровневый опрос Windows (`GetSystemPowerStatus` + `Win32_Battery` + `root\WMI` + кэшированный парсер `powercfg /batteryreport /xml`) с точным статусом (*Заряжается от сети / Заряжено / Подключено, не заряжается / Работа от батареи*) и честным отображением `—` при отсутствии счётчика циклов |
| **Умный Luma AI (2 модели + Markdown + Отключение)** | Разделение на **`Luma Lang 1.2`** (45+ офлайн-статей энциклопедии + живой поиск Wikipedia API + умная математика + конвертер, без мусорного кода на обычные вопросы) и **`Luma Code 1.2`** (12 языков, 25+ шаблонов) + полноценный рендер Markdown + **Мастер-выключатель Luma AI** в настройках с полным остановом ИИ-движков в ядре |
| **Ежедневная автопроверка OTA + Кинематографичная анимация** | Автоматическая проверка релизов GitHub раз в 24 часа, всплывающее окно с уровнем обновления (`Глобальное / Большое обновление / Патч`) и списком изменений, плюс полноэкранная анимация установки с двойными орбитальными кольцами и 4-этапным прогрессом |
| **Luma Plugin API v2.0 + 11 обновлённых модулей** | Новый эндпоинт ядра `POST /api/kernel/plugins/api` с 10 реальными системными действиями, моделью разрешений и кнопкой **«▶ Запустить»** в окне Расширений; все встроенные и каталожные плагины обновлены до API v2.0 и дополнены новыми модулями |

---

## Быстрый старт (Windows)

1. Скачайте автономный файл **[LumaOS_1.2.1.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.1.exe)**.
2. Запустите двойным кликом — Luma OS откроется в собственном окне WebView2 со встроенной иконкой (без открытия Microsoft Edge), а все ваши виджеты, папки, ярлыки и настройки с предыдущих версий подхватятся автоматически.
3. Горячие клавиши:
   - `Alt + W` — Обзор окон, разделение экрана и виртуальные столы (Multitasking)
   - `Alt + R` — Поиск / Выполнить (Spotlight)
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.2.1.exe .
```

## Архитектура проекта

- [`luma_kernel_main.go`](luma_kernel_main.go) — ядро `LumaCore 1.2`, HTTP/RPC-сервер (`127.0.0.1:49215/49216`), VFS (AES-256-GCM), `Plugin API v2.0`, мастер-выключатель AI и превью изображений `/api/kernel/fs/raw`
- [`kernel_persistence_battery.go`](kernel_persistence_battery.go) — вечное дисковое хранилище `EternalStateStore` и трекер батареи/экранного времени `BatteryTracker`
- [`kernel_ai_local.go`](kernel_ai_local.go) — двойной ИИ-движок `Luma Lang 1.2` (энциклопедия + Wikipedia API + математика) и `Luma Code 1.2` (12 языков)
- [`kernel_security.go`](kernel_security.go) — ядро безопасности `LumaShield 1.2`, локальный антивирус, карантин, EICAR, журнал аудита
- [`kernel_updater_ai.go`](kernel_updater_ai.go) — GitHub OTA-обновлятор с классификацией SemVer `X.Y.Z`, универсальный AI-прокси, живые курсы валют
- [`window_windows.go`](window_windows.go) / [`system_windows.go`](system_windows.go) — постоянный профиль WebView2 с миграцией, Win32 Shell Mode, трёхуровневый опрос АКБ, точные фоновые процессы Windows, PnP устройства, службы и брандмауэр
- [`src/components/DexWindow.tsx`](src/components/DexWindow.tsx) — 8-сторонний ресайз, Windows 11 Snap Layouts и Aero Edge Snap
- [`src/components/LumaExplorerWindow.tsx`](src/components/LumaExplorerWindow.tsx) — Проводник с фильтрами по типам, Избранным, превью изображений и редактированием кода
- [`src/components/LumaTaskManagerWindow.tsx`](src/components/LumaTaskManagerWindow.tsx) — Диспетчер задач с точной загрузкой CPU 0–100%, Private/Working RAM, потоками и группами
- [`src/components/LumaBatteryPanel.tsx`](src/components/LumaBatteryPanel.tsx) — аналитика батареи 24ч, честные циклы, износ и экранное время 7д
- [`src/components/LumaAIAssistantWindow.tsx`](src/components/LumaAIAssistantWindow.tsx) — Luma AI с переключением моделей (`Авто / Языковая / Кодер`), Markdown-рендером, голосом и кнопкой отключения
- [`src/components/LumaCalculatorWindow.tsx`](src/components/LumaCalculatorWindow.tsx) — 4-режимный нативный калькулятор Luma
- [`src/components/LumaSystemUtilitiesWindow.tsx`](src/components/LumaSystemUtilitiesWindow.tsx) — нативные службы Windows в интерфейсе Luma OS
- [`src/i18n/translations.ts`](src/i18n/translations.ts) — полный словарь перевода системы на 9 языков
