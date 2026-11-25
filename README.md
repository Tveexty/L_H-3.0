<div align="center">

<img src="public/luma-nitrogen-hero.jpg" alt="Luma OS 1.6.2b (Nitrogen · N-7 · 2.5D Cryo-Glass QHD)" width="100%" style="border-radius: 18px;" />

<br />

# Luma OS 1.6.2b — **Nitrogen · N-7**

**Флагманская настольная операционная среда для Windows 10 / 11 на ядре `LumaCore 1.5.2b` и защите `LumaShield 2.5` (275 правил): 100% нативные Wi-Fi и Bluetooth (выбор сетей, ввод пароля и устройства по ПКМ без Windows), единый режим «Замена горячих клавиш» (`Win` · `Alt+Tab` · `Win+D` · отключение жестов тачпада Windows), умная нейросеть `Luma AI 5.0 Nexus`, «Luma Обвести для поиска», Управление жестами и Спецвозможности, живой индикатор загрузок, безопасная Корзина и 2.5D обои Nitrogen Cryo-Glass**

<p>
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.2b"><img src="https://img.shields.io/badge/Release-v1.6.2b%20(Nitrogen%20·%20N--7)-38bdf8?style=for-the-badge" alt="Release v1.6.2b" /></a>
  <img src="https://img.shields.io/badge/Kernel-LumaCore%201.5.2b%20(v1.6.2b)-10b981?style=for-the-badge" alt="LumaCore 1.5.2b" />
  <img src="https://img.shields.io/badge/Security-LumaShield%202.5%20(275%20Rules)-f43f5e?style=for-the-badge" alt="LumaShield 2.5" />
  <img src="https://img.shields.io/badge/Connectivity-Native%20Wi--Fi%20%2B%20Bluetooth-06b6d4?style=for-the-badge" alt="Native Wi-Fi and Bluetooth" />
  <img src="https://img.shields.io/badge/AI-Luma%20AI%205.0%20Nexus-8b5cf6?style=for-the-badge" alt="Luma AI 5.0 Nexus" />
  <img src="https://img.shields.io/badge/Shell-Replace%20Hotkeys%20%2B%20Touchpad-0ea5e9?style=for-the-badge" alt="Replace Hotkeys" />
</p>

<h3>
  <a href="https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.2b.exe">⬇️ Скачать LumaOS_1.6.2b.exe (Portable · 1 файл · 0 зависимостей)</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/Tveexty/L_H-3.0/releases/tag/v1.6.2b">📦 Релиз v1.6.2b</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="PATCH_NOTES_1.6.2b.md">📝 Патч-ноут 1.6.2b</a>
</h3>

</div>

---

## Что нового в **Luma OS 1.6.2b (Nitrogen · N-7 · `LumaCore 1.5.2b`)**

| Модуль | Ключевые улучшения обновления 1.6.2b |
| :--- | :--- |
| **100% нативные Wi-Fi и Bluetooth (ПКМ + ввод пароля)** | В **Панель управления** (`Tab`) и в **Центр управления** в углу экрана добавлены живые плитки **Wi-Fi** и **Bluetooth**: ЛКМ включает/выключает адаптер, а **ПКМ** (или стрелка `›`) открывает встроенный список доступных сетей Wi-Fi и устройств Bluetooth с уровнем сигнала, зарядом, **встроенным полем ввода пароля Wi-Fi / PIN-кода Bluetooth** и отключением в 1 клик — полностью внутри Luma OS, без единого окна Параметров Windows. |
| **Оболочка Windows → «Замена горячих клавиш»** | Новый единый переключатель в *Настройки → Оболочка Windows*: **`Win`** открывает Пуск Luma OS (или панель Luma Nova), **`Alt + Tab`** — фирменное окно переключения окон Luma OS, **`Win + D`** — возврат на рабочий стол Luma OS, а **жесты тачпада Windows (3/4 пальца) отключаются** на время работы и автоматически восстанавливаются при выключении опции, по `Ctrl + Alt + Shift + W` или закрытии `LumaOS_1.6.2b.exe`. |
| **Фикс самопроизвольного открытия Настроек Windows** | Полностью устранены фоновые системные вызовы `RequestAccessAsync()` и внешние ссылки `ms-settings:`, а также добавлено самовосстановление флагов клавиши `Win` после UAC-окон — окно Настроек Windows больше никогда не открывается само по себе. |
| **Улучшенная стабильность перехватчика `Alt + Tab` / `Win`** | Автоматический сброс активной сессии `Alt + Tab` при выборе окна мышью или потере фокуса, проверка модификаторов при одиночном нажатии `Win` и чистый UTF-8 парсер сетей Wi-Fi (`chcp 65001`) для кириллических SSID и русскоязычной Windows. |

---

## Все флагманские возможности ветки **1.6.x (Nitrogen · N-7)**

- **Luma AI 5.0 Nexus:** долгосрочная память о пользователе (`%AppData%/LumaOS/ai_memory_v5.json`), контекст диалога, веб-поиск, перевод на 50 языков и глубокое управление системой.
- **Luma Обвести для поиска (`Ctrl + Shift + L`):** захват экрана, свободное обведение кругом (лассо) или рамкой, офлайн-OCR (`RU+EN`), палитра цветов, перевод и поиск через `Luma AI 5.0`.
- **Управление жестами и Спецвозможности:** 3 пальца вниз = Скриншот, 3 пальца вверх = Обзор окон, влево/вправо = Рабочие столы, 4 пальца вниз = Рабочий стол, Круг = Luma Обвести для поиска, жесты мышью `Alt + ПКМ`, настройки ПКМ и Плагины.
- **Живой индикатор загрузок и безопасная Корзина Luma OS:** неоновая капсула скачиваний на панели задач + безопасное удаление всех файлов в Корзину с восстановлением в 1 клик.
- **Режим разработчика (`Ctrl + Shift + D`) и Режим Администратора (UAC):** живой Developer HUD (FPS, JS/Go RAM, горутины, лог IPC, DOM-инспектор) + перезапуск с правами Администратора (`runas`).
- **Стиль системы `Luma Nova` и перетаскиваемая «Папка Luma»:** панель без кнопки Пуск + верхняя капсула `Luma Nova`, а также перетаскиваемая мышью Папка «Luma Система» слева.
- **`Luma SwapBoost` (2 / 4 / 6 ГБ), `Luma Gamepad Studio`, `Luma Deep Uninstaller`, `Luma Peek` (`Space`) и «Поверх всех окон» (`📌`):** полный набор нативных утилит на ядре `LumaCore 1.5.2b` и защите `LumaShield 2.5` (275 правил, 0 утечек Win32-колбэков).

---

## Галерея обоев **Nitrogen (QHD 2560×1440)**

> Все 20 обоев встроены в `LumaOS_1.6.2b.exe` (включая полную коллекцию предыдущих версий).

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

## Скачать Luma OS (все 21 сборка сохранены)

Все исполняемые файлы автономны (**Single-Binary Portable EXE** — встроенный фронтенд + Go-ядро, установка не требуется):

| Версия | Кодовое имя | Ядро / Возможности | Прямая ссылка |
| :--- | :--- | :--- | :--- |
| **1.6.2b (Актуальная)** | **Nitrogen · N-7** | `LumaCore 1.5.2b` · `Нативные Wi-Fi & Bluetooth (ПКМ + пароль)` · `Замена горячих клавиш + Тачпад` · `0 всплытий Настроек Windows` | [**LumaOS_1.6.2b.exe**](https://github.com/Tveexty/L_H-3.0/raw/main/LumaOS_1.6.2b.exe) |
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
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H=windowsgui" -o LumaOS_1.6.2b.exe .
```
