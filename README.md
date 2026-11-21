<div align="center">

<img src="public/luma-lithium-hero.jpg" alt="Luma OS 1.2.0 Lithium" width="100%" style="border-radius: 20px;" />

# Luma OS `1.2.0 (Lithium)`

**Настольная операционная среда на собственном Go-ядре `LumaCore 1.2` и модуле безопасности `LumaShield 1.2`**

[![Version](https://img.shields.io/badge/Luma%20OS-1.2.0%20Lithium-10b981?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/releases/tag/v1.2.0)
[![Kernel](https://img.shields.io/badge/LumaCore-1.2-06b6d4?style=for-the-badge)](luma_kernel_main.go)
[![Security](https://img.shields.io/badge/LumaShield-1.2%20Zero--Conflict%20AV-10b981?style=for-the-badge)](kernel_security.go)
[![AI](https://img.shields.io/badge/Luma%20AI-Offline%20LumaNano%201.2%20%2B%20Voice-8b5cf6?style=for-the-badge)](kernel_ai_local.go)
[![Windows](https://img.shields.io/badge/Windows%20x64-Standalone%20GUI-111113?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.0.exe)

### [⬇ Скачать LumaOS_1.2.0.exe (Windows x64 · Без браузера · Встроенная иконка)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.0.exe)

</div>

---

## Что нового в `1.2.0 (Lithium)`

| Модуль | Возможности |
| :--- | :--- |
| **Мультизадачность и Виртуальные столы** | Изменение размера окон за **все 8 сторон и углов** с сохранением геометрии, меню **Snap Layouts** (50/50, 65/35, 4 четверти 2×2, верх/низ, центр), **Aero Edge Snap** при перетаскивании к краям экрана и **Обзор окон (`Alt + W`)** с Виртуальными рабочими столами (`Стол 1 / 2 / 3 / + Новый стол`) и разделением экрана в 1 клик |
| **Вечное сохранение виджетов, папок и ярлыков** | Единый постоянный профиль WebView2 (`%APPDATA%/LumaOS/WebView2` с автомиграцией со всех старых версий) + дублирование в дисковое хранилище **`LumaStateVault`** (`%APPDATA%/LumaOS/luma_permanent_state.json` + `.bak`) + **Экспорт и Импорт резервной копии `.json`** в настройках |
| **Автономный `Luma AI` (без API) + Голос** | Встроенный офлайн-движок **`LumaNano 1.2`** работает прямо из ядра без API-ключей и интернета (живая диагностика ПК, генерация лёгкого кода Python/JS/Go/HTML/CSS/PowerShell/Bash/SQL/C#, математика, SHA-256, пароли, UUID, JSON) + **Голосовой ввод (микрофон)** и **голосовая озвучка ответов** + полная поддержка Gemini, OpenAI, Claude, DeepSeek, Groq и Ollama |
| **Собственный системный Калькулятор** | Отдельное окно **`Luma Calculator`** с 4 режимами: **Стандартный** (память `MC/MR/M+/M-` и клавиатура), **Инженерный** (`sin/cos/tan/log/ln/n!/π/e/DEG-RAD`), **Программист** (`HEX/DEC/OCT/BIN` + `AND/OR/XOR/NOT/<< / >>`) и **Конвертер** (длина, масса, температура, данные, скорость, время) + история |
| **Нативные службы и утилиты Windows в UI Luma** | Полноценный интерфейс внутри Luma OS: **Диспетчер устройств** (реальное дерево PnP/оборудования), **Диспетчер служб** с кнопками **Запуск / Стоп / Перезапуск**, **Сеть и Брандмауэр** с живым **Ping-тестером**, **Микшер звука**, **Блокнот Pro** (открытие/сохранение файлов) и **Диски и очистка временных файлов** |
| **Аналитика батареи ноутбука и экранного времени** | Новый раздел настроек **«Батарея и экран»**: SVG-график разряда/зарядки за 24 часа с подсветкой интервалов зарядки, счётчик **циклов зарядки**, **здоровье АКБ %** (`FullCharge / Design mWh`), мощность (Вт) и напряжение (В), график **экранного времени за 7 дней** и демо-режим ноутбука для стационарных ПК |
| **Галерея обоев + 4 анимации смены и живые обои** | 2 новых флагманских 3D-арта (*Lithium 1.2 Crystal* и *Obsidian Silk*), 3 **живых анимированных mesh-фона** (*Lithium Aurora*, *Cosmic Nebula*, *Solar Kinetic*) и 4 кинематографичных перехода при смене обоев: **Сфера (Iris)**, **Сияние (Bloom)**, **Луч (Wipe)** и **Фокус (Morph)** |
| **Новые виджеты, форма «Грань» и Полный перевод** | 5 новых виджетов (*Аналитика Батареи Pro*, *Luma AI Мини-чат*, *Мировые часы*, *Экранное время Pro*, *Спектр Lithium Li-3*), новая форма **«Грань» (Chamfer)**, расширенный перевод всей системы на **9 языков** и обновлённая пасхалка **`LITHIUM ORBIT · Li-3`** с 3 орбитальными электронами |

---

## Быстрый старт (Windows)

1. Скачайте автономный файл **[LumaOS_1.2.0.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.0.exe)**.
2. Запустите двойным кликом — Luma OS откроется в собственном окне WebView2 со встроенной иконкой (без открытия Microsoft Edge), а все ваши виджеты, папки и ярлыки с предыдущих версий подхватятся автоматически.
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.2.0.exe .
```

## Архитектура проекта

- [`luma_kernel_main.go`](luma_kernel_main.go) — ядро `LumaCore 1.2`, HTTP/RPC-сервер (`127.0.0.1:49215/49216`), VFS (AES-256-GCM)
- [`kernel_persistence_battery.go`](kernel_persistence_battery.go) — вечное дисковое хранилище `EternalStateStore` и трекер батареи/экранного времени `BatteryTracker`
- [`kernel_ai_local.go`](kernel_ai_local.go) — автономный офлайн ИИ-движок `LumaNano 1.2` (без API-ключей)
- [`kernel_security.go`](kernel_security.go) — ядро безопасности `LumaShield 1.2`, локальный антивирус, карантин, EICAR, журнал аудита
- [`kernel_updater_ai.go`](kernel_updater_ai.go) — GitHub OTA-обновлятор с прогрессом, универсальный AI-прокси, живые курсы валют
- [`window_windows.go`](window_windows.go) / [`system_windows.go`](system_windows.go) — постоянный профиль WebView2 с миграцией, Win32 Shell Mode, реальный WMI опрос АКБ, PnP устройства, управление службами и брандмауэр
- [`src/components/DexWindow.tsx`](src/components/DexWindow.tsx) — 8-сторонний ресайз, Windows 11 Snap Layouts и Aero Edge Snap
- [`src/components/LumaCalculatorWindow.tsx`](src/components/LumaCalculatorWindow.tsx) — 4-режимный нативный калькулятор Luma
- [`src/components/LumaBatteryPanel.tsx`](src/components/LumaBatteryPanel.tsx) — аналитика батареи 24ч, циклы, износ и экранное время 7д
- [`src/components/LumaSystemUtilitiesWindow.tsx`](src/components/LumaSystemUtilitiesWindow.tsx) — нативные службы Windows в интерфейсе Luma OS
- [`src/components/LumaAIAssistantWindow.tsx`](src/components/LumaAIAssistantWindow.tsx) — автономный + облачный Luma AI с голосовым вводом и озвучкой
- [`src/components/LumaHeliumEasterEgg.tsx`](src/components/LumaHeliumEasterEgg.tsx) — 3D-арт `1.2 Lithium` и игра-пасхалка `LITHIUM ORBIT · Li-3`
- [`src/i18n/translations.ts`](src/i18n/translations.ts) — полный словарь перевода системы на 9 языков
