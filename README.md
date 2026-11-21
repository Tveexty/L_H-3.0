<div align="center">

<img src="public/luma-lithium-hero.jpg" alt="Luma OS 1.2.3 Lithium" width="100%" style="border-radius: 20px;" />

# Luma OS `1.2.3 (Lithium)`

**Настольная операционная среда на ультра-оптимизированном Go-ядре `LumaCore 1.3` (Zero-PowerShell Win32 Engine), антивирусе `LumaShield 1.3` и шине `Plugin API v2.0`**

[![Version](https://img.shields.io/badge/Luma%20OS-1.2.3%20Lithium%20Patch-10b981?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/releases/tag/v1.2.3)
[![Kernel](https://img.shields.io/badge/LumaCore-1.3%20Zero--PS-06b6d4?style=for-the-badge)](luma_kernel_main.go)
[![Security](https://img.shields.io/badge/LumaShield-1.3-ef4444?style=for-the-badge)](kernel_security.go)
[![AI](https://img.shields.io/badge/Luma%20AI-Lang%20%2B%20Code%20%2B%20Verbosity-8b5cf6?style=for-the-badge)](kernel_ai_local.go)
[![Windows](https://img.shields.io/badge/Windows%20x64-Standalone%20GUI-111113?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.3.exe)

### [⬇ Скачать LumaOS_1.2.3.exe (Windows x64 · Без браузера · Встроенная иконка)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.3.exe)

</div>

---

## Что нового в патче `1.2.3 (Lithium)` · `LumaCore 1.3`

> **Схема версий SemVer `X.Y.Z`:** 1-я цифра `X` — Глобальное обновление · 2-я цифра `Y` — Большое обновление версии · 3-я цифра `Z` — Патч исправлений и улучшений.

| Модуль | Возможности и исправления |
| :--- | :--- |
| **Ядро `LumaCore 1.3` (Zero-PowerShell Win32 Engine)** | Полностью переписаны горячие системные пути на чистые нативные Win32 API: список процессов (`CreateToolhelp32Snapshot` + `GetProcessTimes` + `GetProcessMemoryInfo` + `QueryFullProcessImageNameW`), открытые окна (`EnumWindows` с единым переиспользуемым callback без утечек), фокус окон (`SetForegroundWindow`), буфер обмена (`OpenClipboard` + `CF_UNICODETEXT`) и сетевая телеметрия (`iphlpapi.dll GetIfTable`). **Фоновые запуски `powershell.exe` сокращены на ~96%** (с 60–100/мин до минимума) |
| **Колоссальная оптимизация ЦП и GPU** | Изолированы часы панели задач (`LumaTaskbarClock` — **0 лишних рендеров** корневой оболочки в простое), добавлен **Zero-GPU Idle Freeze** (`visibilitychange` + `data-luma-idle="true"` мгновенно замораживает все CSS-анимации и фоновые запросы при сворачивании), `React.memo` для окон и рабочего стола, оптимизированное размытие (`8–12 px` без двойного прохода `saturate()`), убран `box-shadow`-аниматор на Dynamic Island + кнопка **«Турбо-Эко (1 клик)»** в **Настройки → Графика и Экран** |
| **Улучшенный Диспетчер задач с интерактивными графиками** | Выделенный высокочастотный опрос в реальном времени (**`0.5с` / `1с` по умолчанию / `2с` / `5с`** + пауза) и новые **интерактивные графики** ЦП / ОЗУ / Диски / Сеть / GPU на 60 точек с точными временными метками: **наведите курсор на любую часть графика**, чтобы увидеть вертикальное перекрестие, маркер и точный процент/значение на тот момент + Мин / Сред / Пик |
| **Автоскрытие панели задач при наведении** | Новая опция **«Автоматически скрывать панель задач»** в **Настройки → Панель задач** и в ПКМ по панели задач: освобождает 100% рабочей области рабочего стола и развёрнутых окон (для всех 3 позиций: снизу, слева, сверху) и плавно выезжает при наведении курсора на край экрана |
| **Исправлен исчезающий баннер «Ядро UI» и баги** | Изображение кристалла `LumaHeliumHeroCard` переведено в хешируемый бандл Vite (`src/assets/luma-lithium-hero.jpg`), убран конфликтный 3D-слой `perspective/rotateX/Y` WebView2 и добавлены правильные заголовки `Cache-Control` в ядре. Также исправлены: двойное переключение `Alt+R` (240 мс debounce + `stopImmediatePropagation`), запуск «Новая задача» в Диспетчере задач (`/api/kernel/launch` `target`/`url`), версионные бейджи `LumaCore 1.3` / `Shield 1.3` |
| **Облегчённая мини-игра пасхалки «Lithium Orbit · Li-3»** | Вместо мгновенной смерти с 1 удара добавлены **3 щита (`♥ ♥ ♥`)** с неуязвимостью `1.5с` и отталкиванием, магнитное притяжение золотых фотонов и бирюзовых сфер слияния, восстановление +1 щита за каждые 3 сферы слияния, более честный и плавный спавн красных осколков и отказ от тяжёлого `ctx.shadowBlur` |

### Ранее добавлено в ветке `1.2.x (Lithium)`
- **120+ языков мира и раскладки клавиатуры**, **переключение вывода/ввода звука** в Центре управления, **процент заряда беспроводных устройств** (Bluetooth/HID), **LumaShield 1.3** (Real-Time Guard, сканер процессов, карантин, белый список), **Luma AI** (`Luma Lang 1.2` + `Luma Code 1.2` + выбор объёма ответов), **18 языков системы**, **Dynamic Island 2.0**, **Откат версии (Version Rollback)** и **Проводник Pro**.

---

## Быстрый старт (Windows)

1. Скачайте автономный файл **[LumaOS_1.2.3.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.3.exe)**.
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.2.3.exe .
```

## Архитектура проекта

- [`luma_kernel_main.go`](luma_kernel_main.go) — ядро `LumaCore 1.3`, HTTP/RPC-сервер (`127.0.0.1:49215/49216`), 350 мс кэш снапшотов, `Cache-Control` middleware, `LumaShield 1.3` и Version Rollback API
- [`system_windows.go`](system_windows.go) / [`window_windows.go`](window_windows.go) — Zero-PowerShell Win32 движок (`CreateToolhelp32Snapshot`, `GetProcessTimes`, `GetProcessMemoryInfo`, `EnumWindows`, `SetForegroundWindow`, `OpenClipboard`, `iphlpapi GetIfTable`), WebView2 профиль и нативный `Alt+R` перехватчик
- [`kernel_security.go`](kernel_security.go) — ядро безопасности `LumaShield 1.3`: 20+ эвристических правил, PE-анализ, энтропия Шеннона, Real-Time Guard, сканер процессов, карантин и белый список
- [`kernel_ai_local.go`](kernel_ai_local.go) — двойной ИИ-движок `Luma Lang 1.2` и `Luma Code 1.2` с 3 режимами объёма информации (`brief` / `balanced` / `detailed`)
- [`kernel_updater_ai.go`](kernel_updater_ai.go) — GitHub OTA-обновлятор + движок **Version Rollback** с автобэкапом в `%APPDATA%/LumaOS/versions` и проверкой PE32+
- [`src/components/LumaTaskManagerWindow.tsx`](src/components/LumaTaskManagerWindow.tsx) — Диспетчер задач 1.2.3 с настраиваемой частотой опроса (`0.5с–5с`) и интерактивными графиками с наведением
- [`src/components/LumaHeliumEasterEgg.tsx`](src/components/LumaHeliumEasterEgg.tsx) — баннер «Ядро UI» со встроенным хешированным ассетом и сбалансированная мини-игра `Lithium Orbit · Li-3`
- [`src/components/LumaDesktopCanvas.tsx`](src/components/LumaDesktopCanvas.tsx) / [`src/components/DexWindow.tsx`](src/components/DexWindow.tsx) — мемоизированные сетка рабочего стола и оконный менеджер с поддержкой автоскрытия панели задач
