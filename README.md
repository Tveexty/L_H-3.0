<div align="center">

<img src="public/luma-lithium-hero.jpg" alt="Luma OS 1.2.3B Lithium" width="100%" style="border-radius: 20px;" />

# Luma OS `1.2.3B (Lithium)`

**Настольная операционная среда на ядре `LumaCore 1.3B` (True Zero-WMI & Zero-PowerShell Win32 Engine), антивирусе `LumaShield 1.3` и шине `Plugin API v2.0`**

[![Version](https://img.shields.io/badge/Luma%20OS-1.2.3B%20Lithium%20Patch-10b981?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/releases/tag/v1.2.3B)
[![Kernel](https://img.shields.io/badge/LumaCore-1.3B%20Zero--WMI-06b6d4?style=for-the-badge)](luma_kernel_main.go)
[![Security](https://img.shields.io/badge/LumaShield-1.3-ef4444?style=for-the-badge)](kernel_security.go)
[![AI](https://img.shields.io/badge/Luma%20AI-0%25%20Idle%20CPU-8b5cf6?style=for-the-badge)](kernel_ai_local.go)
[![Windows](https://img.shields.io/badge/Windows%20x64-Standalone%20GUI-111113?style=for-the-badge)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.3B.exe)

### [⬇ Скачать LumaOS_1.2.3B.exe (Windows x64 · Без браузера · Встроенная иконка)](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.3B.exe)

</div>

---

## Что нового в патче `1.2.3B (Lithium)` · `LumaCore 1.3B`

> **Схема версий SemVer `X.Y.Z`:** 1-я цифра `X` — Глобальное обновление · 2-я цифра `Y` — Большое обновление версии · 3-я цифра `Z` — Патч исправлений и улучшений.

| Модуль | Возможности и исправления |
| :--- | :--- |
| **True Zero-WMI Engine (`WMI Provider Host`: 24% → 0%)** | Найдена и полностью устранена главная скрытая причина загрузки ЦП в Windows (`WMI Provider Host / WmiPrvSE.exe` до 24% ЦП): все WMI-вызовы (`Get-PnpDevice`, `Get-PnpDeviceProperty -Class ...,System`, `Get-CimInstance Win32_Battery / root\WMI / Win32_Processor / Win32_VideoController`) полностью удалены и переписаны на чистые нативные Win32 API: `setupapi.dll` (`SetupDiGetClassDevsW` + `SetupDiGetDevicePropertyW` только по беспроводным шинам `BTHENUM/BTHLE/HID` за ~1.5 мс), `powrprof.dll` (`CallNtPowerInformation`), и системный реестр Windows (<1 мс). **В ядре `LumaCore 1.3B` ровно `0` вызовов WMI** |
| **0 фоновых PowerShell при старте и в простое** | Раскладки клавиатуры считываются напрямую через Win32 `GetKeyboardLayoutList` (0.005 мс), аудиоустройства CoreAudio кэшируются на 60с и загружаются только при открытии Центра управления, а медиа-опрос SMTC для Dynamic Island запускается только при активном острове и открытом плеере/браузере (раз в 30с) с полной остановкой при скрытии острова (`/api/kernel/island/toggle`). Проверено: локальный `Luma AI` потребляет **0% ЦП** в простое и обёрнут в `React.memo` |
| **Возвращён плавный 3D-наклон баннера «Ядро UI»** | Баннер `1.2.3B LumaOS` в **Настройки → Ядро UI** снова мягко наклоняется и плавно меняет ориентацию кристалла при наведении курсора (внешний `perspective: 1100px` + `backface-visibility: hidden` + хешированный Vite-бандл, поэтому картинка никогда не пропадает в WebView2) |
| **Интерактивный Диспетчер задач + Автоскрытие панели** | Частота опроса `0.5с / 1с / 2с / 5с`, интерактивные графики ЦП / ОЗУ / Диски / Сеть / GPU с перекрестием и точным процентом при наведении, автоскрытие панели задач при наведении на край экрана и облегчённая мини-игра пасхалки «Lithium Orbit · Li-3» (3 щита, магнит, восстановление щитов) |

---

## Быстрый старт (Windows)

1. Скачайте автономный файл **[LumaOS_1.2.3B.exe](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.2.3B.exe)**.
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.2.3B.exe .
```
