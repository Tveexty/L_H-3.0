<div align="center">

<img src="public/luma-helium-hero.jpg" alt="Luma OS 1.1.0 Helium" width="100%" style="border-radius: 20px;" />

# Luma OS `1.1.0 (Helium)`

**Настольная операционная среда на собственном Go-ядре `LumaCore 1.1` и модуле безопасности `LumaShield 1.1`**

[![Version](https://img.shields.io/badge/Luma%20OS-1.1.0%20Helium-d946ef?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/releases/tag/v1.1.0)
[![Kernel](https://img.shields.io/badge/LumaCore-1.1-38bdf8?style=for-the-badge)](luma_kernel_main.go)
[![Security](https://img.shields.io/badge/LumaShield-1.1%20Zero--Conflict%20AV-10b981?style=for-the-badge)](kernel_security.go)
[![Languages](https://img.shields.io/badge/Languages-9%20Locales-f59e0b?style=for-the-badge)](src/i18n/translations.ts)
[![Windows](https://img.shields.io/badge/Windows%20x64-Standalone%20GUI-111113?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.1.0.exe)

### [⬇ Скачать LumaOS_1.1.0.exe (Windows x64 · Без браузера · Встроенная иконка)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.1.0.exe)

</div>

---

## Что нового в `1.1.0 (Helium)`

| Модуль | Возможности |
| :--- | :--- |
| **Умная Панель задач (100+ приложений)** | Автоматическое сжатие вкладок (`Полные -> Компакт -> Значки`), горизонтальная прокрутка колесом и стрелками, поиск по всем открытым окнам в «Все окна (N)», живое изменение высоты/ширины (`38–84 px`) перетаскиванием за край или ползунком |
| **Мультиязычность (9 языков)** | Русский, English, Română, Deutsch, 中文 (简体), Français, Español, Українська, 日本語 — мгновенное переключение интерфейса, меню и локали дат |
| **Ядро `LumaCore 1.1` + `LumaShield 1.1`** | Ускоренное ядро телеметрии и обновлённое ядро безопасности с журналом аудита, SHA-256 и локальным user-space антивирусом **без конфликтов с Windows Defender** (быстрая/выборочная проверка, аудит автозагрузки, EICAR-тест, изолированный карантин) |
| **Обновление через GitHub (OTA)** | Полностью рабочая проверка новых релизов GitHub (SemVer), просмотр списка изменений, загрузка нового `.exe` с живым **прогресс-баром** (`%`, `МБ/с`, проверка `SHA-256` и заголовка PE32+) и моментальным переходом на новую версию |
| **Режим оболочки поверх Windows** | Автозапуск с Windows (`HKCU Run`), запуск сразу во весь экран (`--fullscreen`), скрытие панели задач Windows (`Shell_TrayWnd` + `SPI_SETWORKAREA`) при работе в Chrome и других программах, с автоматическим восстановлением при выходе и по `Ctrl+Alt+Shift+W` |
| **Интеграция нейросетей (`Luma AI`)** | Google Gemini, OpenAI, Anthropic Claude, DeepSeek, OpenRouter, Groq, локальная Ollama / LM Studio и любой OpenAI-совместимый API через встроенный Go-шлюз (без CORS), с контекстом телеметрии ПК и запуском команд в терминале |
| **Диспетчер задач как в Windows 11** | Тепловая карта ЦП/ОЗУ, группы (*Приложения Luma*, *Окна Windows*, *Фоновые процессы*), «Новая задача», снятие процессов по PID, графики Производительности (ЦП/ОЗУ/Диски/Сеть/GPU), реальная Автозагрузка и Службы ОС |
| **Системные службы и утилиты** | Адаптированные под стиль Luma встроенные **Калькулятор**, **Блокнот** (с сохранением на диск), **Микшер звука**, **Службы ОС** и 16 системных апплетов Windows (`devmgmt.msc`, `services.msc`, `wf.msc`, `ncpa.cpl`, `mmsys.cpl` и др.) |
| **Ядро UI + Пасхалка `HELIUM ORBIT`** | Флагманский 3D-арт `1.1 LumaOS HELIUM` с параллаксом; клик запускает орбитальную анимацию пробуждения и полноценную 60 FPS мини-игру **«HELIUM ORBIT»** с комбо, звуком и рекордами |
| **Питание прямо в «Пуск»** | Выключение ПК, перезагрузка, сон, блокировка и выход из Luma OS прямо из меню «Пуск» с окном подтверждения |
| **Исправленные часы, Валюты и Обои** | Полностью убрана обрезка даты и цифр часов на любых формах и размерах; настраиваемый виджет валют с живыми курсами (`RUB`, `MDL`, `USD`, `EUR`, `RON`, `UAH`, `CNY`, `BTC`, `ETH` и др.) и конвертером; движок обоев с размытием и затемнением |

---

## Быстрый старт (Windows)

1. Скачайте автономный файл **[LumaOS_1.1.0.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.1.0.exe)**.
2. Запустите двойным кликом — Luma OS откроется в собственном окне WebView2 со встроенной иконкой (без открытия Microsoft Edge).
3. Горячие клавиши:
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.1.0.exe .
```

## Архитектура проекта

- [`luma_kernel_main.go`](luma_kernel_main.go) — ядро `LumaCore 1.1`, HTTP/RPC-сервер (`127.0.0.1:49215/49216`), VFS (AES-256-GCM)
- [`kernel_security.go`](kernel_security.go) — ядро безопасности `LumaShield 1.1`, локальный антивирус, карантин, EICAR, журнал аудита
- [`kernel_updater_ai.go`](kernel_updater_ai.go) — GitHub OTA-обновлятор с прогрессом, универсальный AI-прокси, живые курсы валют
- [`window_windows.go`](window_windows.go) / [`system_windows.go`](system_windows.go) — нативное окно WebView2, Win32 Shell Mode (`Shell_TrayWnd` + `SPI_SETWORKAREA`), автозапуск, службы, Defender status
- [`src/App.tsx`](src/App.tsx) — оболочка Luma OS, сжимаемая панель задач, меню «Пуск», центр настроек
- [`src/i18n/translations.ts`](src/i18n/translations.ts) — словарь локализации на 9 языков
- [`src/components/LumaHeliumEasterEgg.tsx`](src/components/LumaHeliumEasterEgg.tsx) — 3D-арт Helium 1.1, орбитальная анимация и мини-игра `HELIUM ORBIT`
- [`src/components/LumaSecurityPanel.tsx`](src/components/LumaSecurityPanel.tsx) — интерфейс `LumaShield 1.1` и карантина
- [`src/components/LumaAIAssistantWindow.tsx`](src/components/LumaAIAssistantWindow.tsx) — мультипровайдерный чат `Luma AI`
- [`src/components/LumaSystemUtilitiesWindow.tsx`](src/components/LumaSystemUtilitiesWindow.tsx) — системные службы и утилиты Windows
- [`src/components/LumaTaskManagerWindow.tsx`](src/components/LumaTaskManagerWindow.tsx) — Диспетчер задач в стиле Windows 11
- [`src/components/LumaExplorerWindow.tsx`](src/components/LumaExplorerWindow.tsx) — многовкладочный Проводник Luma со скрытыми файлами
