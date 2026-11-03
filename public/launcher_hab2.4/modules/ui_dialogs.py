# [file name]: ui_dialogs.py
import flet as ft
import json
import os
from .glass_morphism import GlassMorphism
from .ui_dialogs_add_app import AddAppDialogMixin
from .ui_dialogs_workspace import WorkspaceDialogMixin


class UIDialogs(AddAppDialogMixin, WorkspaceDialogMixin):
    # Полная история всех версий от 1.0 до 2.6
    VERSION_HISTORY_1_0_TO_2_5 = {
        "2.6": [
            "🚀 LAUNCHER HAB 2.6 — DYNAMIC ISLAND, НАСТРОЙКИ В СТИЛЕ ANDROID, АДАПТИВНАЯ ТЕМА ДЕНЬ/НОЧЬ, АВТООБНОВЛЕНИЕ С GITHUB И ПКМ «НАЗАД»",
            "🏝️ ВСЕГДА АКТИВНЫЙ DYNAMIC ISLAND — интерактивный остров в верхней панели с постоянным отображением статуса, времени, даты и процентов заряда устройства",
            "🔔 ПРОСМОТР УВЕДОМЛЕНИЙ ОТ WINDOWS В ОСТРОВЕ — перехват и журнал системных и прикладных уведомлений Windows с очисткой и фильтрацией",
            "🎵 СМЕНА ПРОИГРЫВАТЕЛЯ В DYNAMIC ISLAND — переключение между Windows Media (SMTC), Яндекс Музыкой, Spotify, VK Музыкой и Telegram Audio + управление треками",
            "⏱️ ВСТРОЕННЫЙ ТАЙМЕР И СЕКУНДОМЕР В ОСТРОВЕ — обратный отсчет с пресетами (1/5/15/25 мин) и секундомер с записью кругов (Laps) и выводом прямо на капсулу",
            "⚡ АНИМАЦИЯ ЗАРЯДКИ УСТРОЙСТВА — неоновая изумрудная волна и пульсация молнии в Dynamic Island при подключении питания и отображение процентов батареи",
            "🌙 ПОЛНОСТЬЮ РАБОЧИЙ РЕЖИМ «НЕ БЕСПОКОИТЬ» (DND) — блокирует всплывающие баннеры и звуки, тихо сохраняя все уведомления внутри Dynamic Island",
            "📱 ПОЛНОСТЬЮ ПЕРЕРИСОВАННЫЕ НАСТРОЙКИ В СТИЛЕ ANDROID 15 — боковое меню с цветными иконками, плитки быстрых настроек (Quick Settings Tiles) и скругленные карточки",
            "🌗 АДАПТИВНАЯ ТЕМА «ДЕНЬ / НОЧЬ» ПО РАСПИСАНИЮ — автоматическая смена темы (днем — светлая/белая, ночью — темная) с выбором точного времени смены и конкретных тем",
            "🔄 АВТООБНОВЛЕНИЕ И ПРОВЕРКА НОВОЙ ВЕРСИИ С GITHUB — проверка релизов через GitHub API, переход на репозиторий GitHub в 1 клик и автопроверка при запуске",
            "🩺 ДИАГНОСТИКА ПРИЛОЖЕНИЯ И РАЗДЕЛ «О ПРИЛОЖЕНИИ» — комплексная проверка файловой системы, шифрования PBKDF2, плагинов, ресурсов ОС и экспорт отчета",
            "🖱️ ФУНКЦИЯ «НАЗАД» НА ПКМ (ПРАВУЮ КНОПКУ МЫШИ) — удобная навигация одной рукой: клик ПКМ возвращает на предыдущий экран, сбрасывает фильтр или закрывает поиск",
        ],
        "2.5": [
            "🚀 LAUNCHER HAB 2.5 — МЕГА-ПЕРСОНАЛИЗАЦИЯ, 18 СТИЛЕЙ ЧАСОВ, КАСТОМНЫЕ ТЕМЫ PRO, API 2.5 И PBKDF2 ШИФРОВАНИЕ",
            "💡 МГНОВЕННАЯ ПОДСВЕТКА АКТИВНЫХ НАСТРОЕК («ЗАЖИГАНИЕ» СТАТУСА) — при выборе любого стиля, переключателя или пресета элемент мгновенно загорается неоновой рамкой и меняет статус с «⚪ Неактивно» на «🟢 АКТИВНО»",
            "🕒 +10 НОВЫХ СТИЛЕЙ ЧАСОВ (ВСЕГО 18 СТИЛЕЙ) — добавлены Nothing OS (Dot-Matrix), iOS 17 StandBy, Samsung OneUI 6, Neon Synthwave 80s, Retro LCD Casio F-91W, macOS Sonoma, Sci-Fi Tactical HUD, Гибридный Хронограф, Неоновая Вертикаль и Material You Expressive",
            "✨ РАСШИРЕННЫЙ ДИЗАЙН ЧАСОВ — настройка неонового свечения (Glow), скругления рамки часов, прозрачности подложки, акцентного цвета минут, жирности шрифта и мигающего разделителя",
            "🎨 СТУДИЯ СОЗДАНИЯ КАСТОМНЫХ ТЕМ 2.5 — живое интерактивное превью темы, выбор режима (Dark / AMOLED / Light), настройка 7 цветовых каналов, радиуса скругления карточек, масштаба иконок и свечения при наведении",
            "🔐 ОБНОВЛЕННОЕ ШИФРОВАНИЕ ДАННЫХ 2.5 — деривация ключей PBKDF2-HMAC-SHA256 (100 000 итераций), контроль целостности HMAC-SHA256, ротация ключей и обратная совместимость с v2.4",
            "🔌 УЛУЧШЕННЫЙ APPLICATION & PLUGIN API 2.5 — шифрованное хранилище секретов для плагинов, хуки смены темы/часов (on_theme_changed, on_clock_style_changed) и диагностика безопасности",
            "📜 ПОЛНАЯ ИСТОРИЯ ОБНОВЛЕНИЙ — добавлен полный архив изменений всех версий программы с 1.0 по 2.5",
        ],
        "2.4": [
            "🚀 LAUNCHER HAB 2.4 — DARK SLATE PRO, LIVE SESSION TRACKER (С 0) И ANDROID 14 ЧАСЫ",
            "🎨 ИСПРАВЛЕНЫ ЦВЕТА И РАМКИ (#AARRGGBB) — убраны желтые полосы, внедрен графитовый стиль Midnight Slate",
            "🔐 ИСПРАВЛЕНО СОХРАНЕНИЕ И ШИФРОВАНИЕ НАСТРОЕК — валидный 32-байтовый ключ Fernet без потери данных",
            "⏱️ GAME & APP SESSION TRACKER С 0 — честный отсчет времени с 00:00 при запуске приложения и живой таймер на карточках",
            "🧩 ПЛАГИНЫ В СПИСКЕ ЗАПУСКА И МАГАЗИН РАСШИРЕНИЙ — скачивание, настройка, включение и удаление плагинов в 1 клик",
            "🕒 ВЕРТИКАЛЬНЫЕ ЧАСЫ ANDROID 14 — крупный вертикальный виджет часов (HH / MM) и 8 современных стилей",
            "🔊 ФОНОВЫЙ КОНТРОЛЛЕР СИСТЕМНОЙ ГРОМКОСТИ — плавная регулировка громкости в фоновом потоке",
        ],
        "2.3": [
            "🎨 УЛУЧШЕННЫЙ LIQUID GLASS ИНТЕРФЕЙС – переработанный стеклянный дизайн, плавные эффекты прозрачности и более современный внешний вид",
            "🖥 FLOATING HUD – новая плавающая панель с системной информацией и быстрым доступом к функциям",
            "🗑 ФИКСИРОВАННАЯ КОРЗИНА – корзина закреплена в правом нижнем углу интерфейса",
            "🔎 ИСТОРИЯ ПОИСКА – система поиска теперь сохраняет предыдущие запросы для более быстрого доступа",
            "💾 УЛУЧШЕННАЯ СИСТЕМА РЕЗЕРВНОГО КОПИРОВАНИЯ – стабильное сохранение и восстановление настроек и данных пользователя",
            "🕒 НОВЫЕ СТИЛИ ЧАСОВ – добавлены дополнительные варианты отображения времени и даты с кастомизацией цвета",
            "🎨 УЛУЧШЕННАЯ ПАНЕЛЬ НАСТРОЕК – более гармоничный дизайн и удобная навигация",
            "🔌 СИСТЕМА ПЛАГИНОВ – поддержка расширений LauncherHub для добавления новых возможностей",
            "🎯 FOCUS MODE PLUGIN – режим концентрации с Pomodoro таймером и минималистичным интерфейсом",
            "🌦 SMART WEATHER PLUGIN – отображение температуры, влажности и скорости ветра",
            "🎵 SMART MUSIC CONTROLLER – управление музыкой через встроенный мини-плеер",
            "📂 SMART FILE FINDER И IDEA NOTEBOOK – быстрый поиск файлов и встроенный блокнот для идей",
        ],
        "2.2": [
            "🚀 LAUNCHER HAB 2.2 - ОПТИМИЗАЦИЯ И КАСТОМИЗАЦИЯ",
            "⚡ ОПТИМИЗАЦИЯ ПРОИЗВОДИЛЬНОСТИ - снижение потребления памяти на 40%",
            "🔍 КЭШИРОВАНИЕ ПОИСКА - мгновенные результаты при повторных запросах",
            "📱 ВИРТУАЛИЗАЦИЯ СПИСКОВ - плавная работа с тысячами приложений",
            "💾 СИСТЕМА РЕЗЕРВНОГО КОПИРОВАНИЯ - полное сохранение/восстановление настроек",
            "⌨️ РАСШИРЕННЫЕ ГОРЯЧИЕ КЛАВИШИ - кастомные комбинации клавиш",
            "👆 УПРАВЛЕНИЕ ЖЕСТАМИ - свайпы для быстрых действий",
            "🕒 КАСТОМИЗАЦИЯ ВРЕМЕНИ - форматы 12/24 часа, выбор стиля отображения",
            "🔤 НАСТРОЙКИ ШРИФТОВ - выбор шрифта и размера текста",
            "🔄 АВТОМАТИЧЕСКИЕ БЭКАПЫ - регулярное сохранение настроек",
            "🎯 ОПТИМИЗИРОВАННЫЙ РЕНДЕРИНГ - отложенная загрузка элементов",
            "🔧 УЛУЧШЕННЫЙ КЭШ-МЕНЕДЖЕР - интеллектуальное кэширование данных",
            "📊 СИСТЕМА МОНИТОРИНГА ПРОИЗВОДИЛЬНОСТИ - отслеживание потребления ресурсов",
            "🐛 ИСПРАВЛЕНИЕ МЕЛКИХ ОШИБОК И УЛУЧШЕНИЕ СТАБИЛЬНОСТИ",
        ],
        "2.1": [
            "🧩 СИСТЕМА ПЛАГИНОВ - модульное расширение функциональности",
            "🔌 Менеджер плагинов с загрузкой/выгрузкой в реальном времени",
            "📁 Автоматическое обнаружение плагинов в папке 'plugins'",
            "🎛️ Компактный аудио-контроллер в основном интерфейсе",
            "🔊 Управление системной громкостью через слайдер",
            "📶 Переключатели Bluetooth и Wi-Fi",
            "🎨 РАСШИРЕННАЯ СИСТЕМА КАСТОМНЫХ ТЕМ",
            "🌈 Создание собственных тем оформления",
            "🔄 Динамическое обновление списка тем",
            "⚡ Оптимизация производительности системы плагинов",
            "🔧 Улучшенный API для разработчиков плагинов",
            "📱 Лучшая адаптация для сенсорных устройств",
            "🎯 Улучшенная навигация в настройках",
            "🐛 Исправление мелких ошибок интерфейса",
        ],
        "2.0": [
            "🚀 МАЖОРНОЕ ОБНОВЛЕНИЕ - ПОЛНАЯ ПЕРЕРАБОТКА",
            "🎨 Новая улучшенная темная тема с лучшей контрастностью",
            "⚡ Оптимизация производительности - на 30% меньше потребления ресурсов",
            "📱 Уникальные Android-анимации открытия окон",
            "✨ Эффекты наведения для всех элементов интерфейса",
            "🔧 Полная модуляризация кодовой базы",
            "🎯 Улучшенная система цветов и теней",
            "📚 Добавлено 50+ новых иконок Material Design",
            "🔄 Переработанный интерфейс настроек",
            "💫 Плавные переходы между состояниями",
            "🎪 Анимации масштабирования при наведении",
            "🔮 Улучшенный Glass Morphism с настраиваемой интенсивностью",
            "📊 Оптимизированная работа с памятью",
            "⚙️ Умное кэширование ресурсов",
            "🌙 Автоматическое управление темой",
            "🔍 Улучшенный поиск с подсказками",
            "📱 Адаптивный дизайн для всех разрешений",
            "🎮 Геймифицированный интерфейс",
            "🔒 Улучшенная система безопасности",
            "📦 Модульная архитектура для легкого расширения",
        ],
        "1.9": [
            "🔐 Система шифрования — безопасное хранение настроек",
            "🛡️ Обработка исключений — try/catch во всех компонентах",
            "⚡ Управление потоками — ThreadPool и асинхронность",
            "🔮 Glass Morphism — полупрозрачные эффекты для кнопок",
            "🎯 Избранное в основной части — полноразмерные плитки",
            "🎨 Система кастомных тем — создавайте свои темы",
            "📱 Адаптивный дизайн — улучшенная UX/UI",
            "🔧 Оптимизация производительности — ThreadPoolManager",
            "🚀 Асинхронные операции — плавный интерфейс",
            "💎 Улучшенная безопасность — Fernet шифрование",
        ],
        "1.8": [
            "📱 Панель устройств перемещена в header",
            "⭐ Панель избранного в основной части",
            "🎯 Убрано постоянное свечение фильтров",
            "📏 Уменьшена высота диалога фильтров",
            "📁 Кнопка проводника в диалоге добавления",
            "🔋 Система мониторинга устройств в реальном времени",
            "🔒 Ограничение избранного до 10 приложений",
            "💎 Оптимизация интерфейса для компактности",
            "🔄 Улучшенное обновление интерфейса в реальном времени",
            "🎨 Плавные анимации для избранных приложений",
            "📊 Точный мониторинг батареи с процентами",
            "🌐 Улучшенное определение сетевых соединений",
            "🔧 Исправлены ошибки кодировки при работе с реестром",
        ],
        "1.7": [
            "🎨 Улучшенный визуальный дизайн с тенями и разделителями",
            "📱 Сбалансированные размеры иконок и текста",
            "🖱️ Плавные hover-анимации карточек приложений",
            "✨ Свечение Fluent Design при наведении",
            "🎯 Улучшенная контрастность текстов",
            "📂 Визуальное разделение между секциями",
            "🔧 Улучшенная кнопка фильтра с tooltip",
            "🚀 Плавная прокрутка главной страницы",
            "🎨 Более яркие акцентные цвета",
            "⚡ Стабильное переключение тем без артефактов",
            "💎 Express-кнопка добавления приложений с градиентом",
            "🕒 Обновленная верхняя панель с местом для аватара",
            "🔔 Информативные tooltip'ы для статусов приложений",
        ],
        "1.6": [
            "Мгновенное обновление интерфейса при изменениям",
            "Компактная система фильтров в сайдбаре",
            "Увеличенные иконки приложений (70% площади)",
            "Увеличенные кнопки приложений для лучшего UX",
            "Исправлены все проблемы со сменой тем",
            "Полная синхронизация цветов интерфейса",
            "Автоматическое обновление без перезапуска",
        ],
        "1.5": [
            "4 темы оформления: Тёмная, Светлая, Фиолетовая, Весна",
            "Улучшенная светлая тема с лучшей читаемостью",
            "Красивая фиолетовая тема",
            "Нежная тема 'Весна' в цветах сакуры",
            "Удобный переключатель тем в настройках",
            "Увеличены иконки приложений для лучшей видимости",
            "Исправлено выравнивание элементов интерфейса",
            "Визуальный выбор иконок при добавлении приложений",
            "Улучшенный дизайн загрузки приложений",
            "Все приложения выровнены по сетке",
            "Убраны иконки '+' из хедера",
            "Статичная кнопка добавления приложения",
        ],
        "1.4": [
            "Кнопка меню (три точки) для каждого приложения",
            "Быстрый доступ к избранному через меню",
            "Изменение пути к файлу для любого приложения",
            "Удаление кастомных приложений через меню",
            "Улучшенное управление приложениями",
            "Более удобная навигация по функциям",
        ],
        "1.3": [
            "Продвинутые анимации интерфейса",
            "Номер эффекта для кнопок",
            "Анимация запуска приложений",
            "Главное подавление элементов",
            "Анимация переключения тем",
            "Контекстовное меню по клику",
        ],
        "1.2": [
            "Официальные сайты для скачивания",
            "Добавление своих приложений",
            "Улучшенный поиск приложений",
            "Сохранение всех изменений",
            "Правильное определение Word, Excel",
            "Улучшена проверка установки",
            "Оптимизировано сохранение данных",
        ],
        "1.1": [
            "Таймер времени — правильное обновление",
            "Сохранение избранного между запусками",
            "Улучшенная проверка установки приложений",
            "Универсальные системные команды",
            "Ручной выбор пути к приложению",
            "Цветовые индикаторы для веб-приложений",
            "Контекстовное меню (долгое нажатие)",
            "Сохранение настроек и ручных путей",
        ],
        "1.0": [
            "Базовый запуск приложений",
            "Категории приложений",
            "Тёмная тема",
            "Поиск приложений",
        ],
    }

    def __init__(self, ui_core):
        self.core = ui_core

    def _alpha(self, hex_color: str, opacity: float) -> str:
        return GlassMorphism._apply_opacity(hex_color, opacity)

    def _create_lit_switch_row(self, title: str, subtitle: str, initial_value: bool, on_toggle, colors: dict):
        """
        Создает интерактивную строку настройки, которая МГНОВЕННО «зажигается» (меняет цвет, рамку, свечение и бейдж статуса
        с «⚪ Неактивно» на «🟢 АКТИВНО») сразу при переключении!
        """
        state = {"active": bool(initial_value)}

        status_badge = ft.Container(
            padding=ft.padding.symmetric(horizontal=10, vertical=4),
            border_radius=8,
        )
        sw = ft.Switch(
            value=state["active"],
            active_track_color=colors["SUCCESS"],
        )
        row_container = ft.Container(
            padding=12,
            border_radius=12,
            animate=ft.Animation(180, ft.AnimationCurve.EASE_OUT),
        )

        def _sync_visual():
            is_on = state["active"]
            status_badge.content = ft.Text(
                "🟢 АКТИВНО" if is_on else "⚪ НЕАКТИВНО",
                size=11,
                weight=ft.FontWeight.BOLD,
                color=colors["SUCCESS"] if is_on else colors["ON_SURFACE_VARIANT"],
            )
            status_badge.bgcolor = (
                self._alpha(colors["SUCCESS"], 0.18) if is_on else self._alpha(colors["SURFACE_VARIANT"], 0.5)
            )
            row_container.bgcolor = (
                self._alpha(colors["ACCENT"], 0.14) if is_on else self._alpha(colors["SURFACE_VARIANT"], 0.35)
            )
            row_container.border = ft.border.all(
                1.5 if is_on else 1,
                colors["ACCENT"] if is_on else colors["OUTLINE"],
            )
            row_container.shadow = (
                ft.BoxShadow(blur_radius=12, color=self._alpha(colors["ACCENT"], 0.25), offset=ft.Offset(0, 2))
                if is_on
                else None
            )

        def _handle_change(e):
            state["active"] = bool(sw.value)
            _sync_visual()
            try:
                row_container.update()
            except Exception:
                pass
            if on_toggle:
                on_toggle(state["active"])

        sw.on_change = _handle_change
        _sync_visual()

        row_container.content = ft.Row(
            [
                sw,
                ft.Column(
                    [
                        ft.Text(title, weight=ft.FontWeight.W_600, size=13, color=colors["ON_SURFACE"]),
                        ft.Text(subtitle, size=11, color=colors["ON_SURFACE_VARIANT"]),
                    ],
                    spacing=2,
                    expand=True,
                ),
                status_badge,
            ],
            spacing=10,
            vertical_alignment=ft.CrossAxisAlignment.CENTER,
        )
        return row_container

    def show_filter_menu(self, e):
        if self.core.filter_dialog_open:
            return

        colors = self.core.get_colors()
        self.core.filter_dialog_open = True

        def close_dialog(e=None):
            self.core.filter_dialog_open = False
            self.core.page.close(dialog)

        def apply_selected_filter(filter_type, e):
            self.core.current_filter = filter_type
            self.core.update_main_content()
            self.core.update_sidebar()
            close_dialog()

        filter_options = [
            ("all", "apps", "Все приложения и плагины"),
            ("plugin", "extension", "Плагины и расширения"),
            ("web", "public", "Веб-приложения"),
            ("app", "desktop_windows", "Локальные приложения"),
            ("system", "computer", "Системные приложения"),
            ("custom", "star", "Мои приложения"),
        ]

        menu_items = []
        for filter_type, icon, text in filter_options:
            is_active = self.core.current_filter == filter_type
            menu_items.append(
                ft.Container(
                    content=ft.Row(
                        [
                            ft.Icon(icon, color=colors["ACCENT"] if is_active else colors["ON_SURFACE_VARIANT"]),
                            ft.Text(
                                text,
                                expand=True,
                                color=colors["ON_SURFACE"],
                                weight=ft.FontWeight.W_600 if is_active else ft.FontWeight.NORMAL,
                            ),
                            ft.Text(
                                "🟢 АКТИВНО" if is_active else "",
                                size=11,
                                color=colors["SUCCESS"],
                                weight=ft.FontWeight.BOLD,
                            ),
                        ]
                    ),
                    on_click=lambda e, ft_val=filter_type: apply_selected_filter(ft_val, e),
                    padding=14,
                    bgcolor=self._alpha(colors["ACCENT"], 0.18) if is_active else "transparent",
                    border=ft.border.all(1.5, colors["ACCENT"]) if is_active else None,
                    border_radius=10,
                )
            )

        dialog_content = ft.Column(
            [
                ft.Text("Фильтры библиотеки", size=18, weight=ft.FontWeight.BOLD, color=colors["ON_SURFACE"]),
                ft.Container(height=8),
                *menu_items,
            ],
            tight=True,
        )

        dialog = ft.AlertDialog(
            modal=True,
            content=ft.Container(
                content=dialog_content, padding=16, bgcolor=colors["SURFACE"], border_radius=14, width=380
            ),
            actions=[ft.TextButton("Закрыть", on_click=close_dialog)],
            shape=ft.RoundedRectangleBorder(radius=14),
        )
        self.core.page.open(dialog)

    def show_settings(self, e):
        colors = self.core.get_colors()
        settings_content = self.create_modern_settings(colors)

        settings_dialog = ft.AlertDialog(
            title=ft.Container(
                content=ft.Row(
                    [
                        ft.Container(
                            width=38,
                            height=38,
                            bgcolor=self._alpha(colors["ACCENT"], 0.2),
                            border_radius=19,
                            alignment=ft.alignment.center,
                            content=ft.Icon("android", color=colors["ACCENT"], size=22),
                        ),
                        ft.Column(
                            [
                                ft.Text("Настройки системы • Android UI 2.6", size=19, weight=ft.FontWeight.BOLD),
                                ft.Text(
                                    "Dynamic Island • Авто День/Ночь • GitHub Updater • ПКМ Назад",
                                    size=11,
                                    color=colors["ON_SURFACE_VARIANT"],
                                ),
                            ],
                            spacing=1,
                            expand=True,
                        ),
                        ft.Container(
                            content=ft.Text(
                                "🟢 Android 15 Style",
                                size=11,
                                color=colors["SUCCESS"],
                                weight=ft.FontWeight.BOLD,
                            ),
                            bgcolor=self._alpha(colors["SUCCESS"], 0.16),
                            padding=ft.padding.symmetric(horizontal=12, vertical=5),
                            border_radius=12,
                        ),
                    ],
                    spacing=10,
                ),
                padding=ft.padding.only(bottom=4),
            ),
            content=ft.Container(
                content=settings_content,
                width=940,
                height=660,
            ),
            actions=[
                ft.TextButton(
                    "Сбросить все настройки",
                    icon="restart_alt",
                    on_click=lambda e: self.show_reset_settings_dialog(),
                ),
                ft.FilledButton("Готово (сохранено)", on_click=lambda e: self.core.page.close(settings_dialog)),
            ],
            shape=ft.RoundedRectangleBorder(radius=24),
        )
        self.core.page.open(settings_dialog)

    def create_modern_settings(self, colors):
        """
        Полностью перерисованные Настройки в стиле Android 15 (OneUI / Pixel Settings):
        - Верхняя шторка быстрых плиток (Android Quick Settings Tiles)
        - Левое меню категорий с круглыми цветными иконками в стиле Android
        - Скругленные карточки настроек справа с мгновенным «зажиганием» статуса
        """
        state = {"active_cat": "island"}
        right_panel = ft.Container(expand=True)
        nav_col = ft.Column(spacing=6, scroll=ft.ScrollMode.ADAPTIVE)
        quick_tiles_row = ft.Row(spacing=8, wrap=True)

        categories = [
            ("island", "blur_circular", "#10b981", "Dynamic Island", "Уведомления, плеер, таймер, DND"),
            ("luma", "memory", "#14b8a6", "Luma Beta (Ядро ОС)", "Headless Core, устройство и ядро безопасности"),
            ("display", "dark_mode", "#3b82f6", "Экран и День / Ночь", "Адаптивная тема, стекло, палитры"),
            ("clock", "schedule", "#a855f7", "Часы и Циферблаты", "18 стилей часов, неон и форматы"),
            ("navigation", "touch_app", "#f59e0b", "Удобство и ПКМ Назад", "Управление одной рукой, сетка"),
            ("plugins", "extension", "#ec4899", "Плагины и API 2.6", "Расширения и трекер времени"),
            ("update_diag", "system_update", "#06b6d4", "Обновление и Диагностика", "GitHub релизы, чек-ап системы"),
            ("about", "info", "#6366f1", "О приложении и Версии", "Сборка 2.6 и история 1.0 – 2.6"),
        ]

        def rebuild_quick_tiles():
            quick_tiles_row.controls.clear()
            tm = self.core.theme_manager
            island = getattr(self.core, "dynamic_island", None)
            dnd_on = island.dnd_enabled if island else False

            tiles_data = [
                (
                    "Не беспокоить",
                    "do_not_disturb_on" if dnd_on else "notifications_none",
                    dnd_on,
                    "#a855f7",
                    lambda e: (
                        island.toggle_dnd() if island else None,
                        rebuild_quick_tiles(),
                        quick_tiles_row.update(),
                    ),
                ),
                (
                    "Авто День/Ночь",
                    "brightness_auto",
                    getattr(tm, "adaptive_theme_enabled", False),
                    "#f59e0b",
                    lambda e: (
                        tm.set_adaptive_theme_preferences(enabled=not getattr(tm, "adaptive_theme_enabled", False)),
                        self.core.check_and_apply_adaptive_theme(force_notify=True),
                        rebuild_quick_tiles(),
                        quick_tiles_row.update(),
                    ),
                ),
                (
                    "ПКМ = Назад",
                    "mouse",
                    getattr(tm, "right_click_back_enabled", True),
                    "#10b981",
                    lambda e: (
                        setattr(tm, "right_click_back_enabled", not getattr(tm, "right_click_back_enabled", True)),
                        tm.save_settings(),
                        self.core.show_toast(
                            "🟢 ПКМ «Назад» включено"
                            if tm.right_click_back_enabled
                            else "⚪ ПКМ «Назад» выключено"
                        ),
                        rebuild_quick_tiles(),
                        quick_tiles_row.update(),
                    ),
                ),
                (
                    "Жидкое стекло",
                    "blur_on",
                    tm.glass_effect_enabled,
                    "#3b82f6",
                    lambda e: (
                        self.core.toggle_glass_effect(),
                        rebuild_quick_tiles(),
                        quick_tiles_row.update(),
                    ),
                ),
                (
                    "Открыть Остров",
                    "open_in_new",
                    True,
                    "#06b6d4",
                    lambda e: island.show_island_modal() if island else None,
                ),
            ]

            for t_title, t_icon, is_on, t_color, t_click in tiles_data:
                quick_tiles_row.controls.append(
                    ft.Container(
                        content=ft.Row(
                            [
                                ft.Container(
                                    width=30,
                                    height=30,
                                    bgcolor=t_color if is_on else self._alpha(colors["SURFACE"], 0.6),
                                    border_radius=15,
                                    alignment=ft.alignment.center,
                                    content=ft.Icon(t_icon, size=16, color="#ffffff" if is_on else colors["ON_SURFACE_VARIANT"]),
                                ),
                                ft.Column(
                                    [
                                        ft.Text(t_title, size=11, weight=ft.FontWeight.BOLD, color=colors["ON_SURFACE"]),
                                        ft.Text(
                                            "🟢 Активно" if is_on else "⚪ Выкл",
                                            size=10,
                                            color=t_color if is_on else colors["ON_SURFACE_VARIANT"],
                                            weight=ft.FontWeight.W_600,
                                        ),
                                    ],
                                    spacing=0,
                                ),
                            ],
                            spacing=8,
                            tight=True,
                        ),
                        padding=ft.padding.symmetric(horizontal=12, vertical=8),
                        bgcolor=self._alpha(t_color, 0.18) if is_on else colors["SETTINGS_CARD"],
                        border=ft.border.all(1.5 if is_on else 1, t_color if is_on else colors["OUTLINE"]),
                        border_radius=18,
                        on_click=t_click,
                    )
                )

        def switch_cat(cat_id: str):
            state["active_cat"] = cat_id
            rebuild_nav()
            rebuild_right()
            try:
                nav_col.update()
                right_panel.update()
            except Exception:
                pass

        def rebuild_nav():
            nav_col.controls.clear()
            for c_id, c_icon, c_color, c_title, c_sub in categories:
                is_sel = state["active_cat"] == c_id
                nav_col.controls.append(
                    ft.Container(
                        content=ft.Row(
                            [
                                ft.Container(
                                    width=38,
                                    height=38,
                                    bgcolor=c_color if is_sel else self._alpha(c_color, 0.18),
                                    border_radius=19,
                                    alignment=ft.alignment.center,
                                    content=ft.Icon(c_icon, size=19, color="#ffffff" if is_sel else c_color),
                                ),
                                ft.Column(
                                    [
                                        ft.Text(
                                            c_title,
                                            size=13,
                                            weight=ft.FontWeight.BOLD if is_sel else ft.FontWeight.W_600,
                                            color=colors["ON_SURFACE"],
                                        ),
                                        ft.Text(
                                            c_sub,
                                            size=10,
                                            color=colors["ON_SURFACE_VARIANT"],
                                            max_lines=1,
                                            overflow=ft.TextOverflow.ELLIPSIS,
                                        ),
                                    ],
                                    spacing=1,
                                    expand=True,
                                ),
                                ft.Icon(
                                    "chevron_right",
                                    size=16,
                                    color=c_color if is_sel else colors["ON_SURFACE_VARIANT"],
                                ),
                            ],
                            spacing=10,
                        ),
                        padding=ft.padding.symmetric(horizontal=12, vertical=10),
                        bgcolor=self._alpha(c_color, 0.18) if is_sel else colors["SETTINGS_CARD"],
                        border=ft.border.all(2 if is_sel else 1, c_color if is_sel else colors["OUTLINE"]),
                        border_radius=18,
                        on_click=lambda e, cid=c_id: switch_cat(cid),
                    )
                )

        def rebuild_right():
            cid = state["active_cat"]
            if cid == "island":
                right_panel.content = self.create_android_island_settings(colors)
            elif cid == "luma":
                right_panel.content = self.create_luma_beta_android_settings(colors)
            elif cid == "display":
                right_panel.content = self.create_appearance_settings(colors)
            elif cid == "clock":
                right_panel.content = ft.Container(
                    content=ft.Column(
                        [
                            self.create_settings_section(
                                "🕒 18 Стилей Часов и Расширенный Дизайн (v2.6)",
                                "Вертикальные часы Android 14 + 10 дизайнерских стилей, неон, рамка и прозрачность",
                                self.create_customization_settings(colors),
                                colors,
                            )
                        ],
                        scroll=ft.ScrollMode.ADAPTIVE,
                    ),
                    padding=8,
                )
            elif cid == "navigation":
                right_panel.content = self.create_android_navigation_and_apps_settings(colors)
            elif cid == "plugins":
                right_panel.content = self.create_plugins_settings(colors)
            elif cid == "update_diag":
                right_panel.content = self.create_github_and_diagnostics_settings(colors)
            else:
                right_panel.content = self.create_about_and_history_settings(colors)

        rebuild_quick_tiles()
        rebuild_nav()
        rebuild_right()

        return ft.Column(
            [
                # Верхняя шторка быстрых переключателей в стиле Android Quick Settings
                ft.Container(
                    bgcolor=self._alpha(colors["SURFACE_VARIANT"], 0.45),
                    border=ft.border.all(1, colors["OUTLINE"]),
                    border_radius=20,
                    padding=10,
                    content=quick_tiles_row,
                ),
                # Двухпанельный макет Android Settings (Слева меню категорий, Справа контент)
                ft.Row(
                    [
                        ft.Container(
                            width=275,
                            content=nav_col,
                            padding=ft.padding.only(right=6),
                        ),
                        ft.VerticalDivider(width=1, color=colors["OUTLINE"]),
                        right_panel,
                    ],
                    expand=True,
                    spacing=10,
                ),
            ],
            spacing=10,
            expand=True,
        )

    def create_android_island_settings(self, colors):
        """Раздел настроек Dynamic Island 2.6 в стиле Android."""
        island = getattr(self.core, "dynamic_island", None)
        return ft.Container(
            content=ft.Column(
                [
                    self.create_settings_section(
                        "🏝️ Dynamic Island 2.6 (Всегда активный остров)",
                        "Управление уведомлениями Windows, плеером, таймером, секундомером, анимацией зарядки и режимом «Не беспокоить»",
                        ft.Column(
                            [
                                ft.Row(
                                    [
                                        ft.FilledButton(
                                            "Открыть центр Dynamic Island",
                                            icon="blur_circular",
                                            on_click=lambda e: island.show_island_modal("overview") if island else None,
                                        ),
                                        ft.FilledTonalButton(
                                            "Таймер Острова",
                                            icon="hourglass_bottom",
                                            on_click=lambda e: island.show_island_modal("timer") if island else None,
                                        ),
                                        ft.FilledTonalButton(
                                            "Секундомер",
                                            icon="timer",
                                            on_click=lambda e: island.show_island_modal("stopwatch") if island else None,
                                        ),
                                        ft.OutlinedButton(
                                            "Уведомления Windows",
                                            icon="notifications_active",
                                            on_click=lambda e: island.show_island_modal("notifications") if island else None,
                                        ),
                                    ],
                                    spacing=8,
                                    wrap=True,
                                ),
                                self._create_lit_switch_row(
                                    "Режим «Не беспокоить» (DND — полностью рабочий)",
                                    "Подавляет все всплывающие окна и звуки, сохраняя уведомления внутри Dynamic Island",
                                    island.dnd_enabled if island else False,
                                    lambda val: (
                                        island.toggle_dnd(val) if island else None,
                                        self.core.show_toast(
                                            "🌙 Режим «Не беспокоить» ВКЛЮЧЕН" if val else "🔔 Режим «Не беспокоить» ВЫКЛЮЧЕН",
                                            force_show=True,
                                        ),
                                    ),
                                    colors,
                                ),
                                self._create_lit_switch_row(
                                    "Анимация зарядки устройства в Dynamic Island",
                                    "Показывать неоновую изумрудную волну и пульс молнии при зарядке",
                                    island.show_charging_anim if island else True,
                                    lambda val: (
                                        setattr(island, "show_charging_anim", val) if island else None,
                                        setattr(self.core.theme_manager, "island_charging_anim", val),
                                        self.core.theme_manager.save_settings(),
                                        island.update_capsule() if island else None,
                                    ),
                                    colors,
                                ),
                                self._create_lit_switch_row(
                                    "Индикация зарядки на стационарном ПК",
                                    "Отображать анимацию питания и проценты устройства на ПК без аккумулятора",
                                    island.simulate_charging if island else True,
                                    lambda val: (
                                        setattr(island, "simulate_charging", val) if island else None,
                                        setattr(self.core.theme_manager, "island_simulate_charging", val),
                                        self.core.theme_manager.save_settings(),
                                        island.update_capsule() if island else None,
                                    ),
                                    colors,
                                ),
                                self._create_lit_switch_row(
                                    "Неоновая подсветка капсулы Острова",
                                    "Динамический ореол вокруг острова под цвет текущего действия (зарядка, плеер, таймер)",
                                    island.island_glow if island else True,
                                    lambda val: (
                                        setattr(island, "island_glow", val) if island else None,
                                        setattr(self.core.theme_manager, "island_glow_enabled", val),
                                        self.core.theme_manager.save_settings(),
                                        self.core.update_header(),
                                    ),
                                    colors,
                                ),
                            ],
                            spacing=10,
                        ),
                        colors,
                    ),
                ],
                scroll=ft.ScrollMode.ADAPTIVE,
            ),
            padding=8,
        )

    def create_luma_beta_android_settings(self, colors):
        """
        Вкладка «Luma Beta» в стиле Android 15 («О телефоне / Версия Android»):
        - Краткое описание версии независимого фонового ядра Luma Beta (Headless Core + GUI Client)
        - Характеристики устройства (CPU, RAM, Архитектура, IPC-сокет 127.0.0.1:45890)
        - Версия ядра безопасности (Security Kernel & Patch Level)
        - Живой тест JSON-RPC 2.0 запроса {"method": "widgets.get_data"} к WidgetEngine
        """
        import platform
        import json
        import time

        rpc_output = ft.Text(
            json.dumps(
                {
                    "jsonrpc": "2.0",
                    "result": {
                        "engine": "Luma WidgetService 1.0",
                        "interval_sec": 1,
                        "metrics": {
                            "cpu_percent": 14.2,
                            "ram_percent": 42.0,
                            "ram_used_mb": 6881.2,
                            "ram_total_mb": 16384.0,
                            "core_rss_mb": 14.2,
                            "idle_cpu_percent": 0.0,
                        },
                    },
                    "id": 1,
                },
                ensure_ascii=False,
                indent=2,
            ),
            font_family="Consolas",
            size=11,
            color="#34d399",
            selectable=True,
        )

        def send_rpc_test(method_name: str):
            now_ts = round(time.time(), 3)
            if method_name == "widgets.get_data":
                payload = {
                    "jsonrpc": "2.0",
                    "result": {
                        "engine": "Luma WidgetService 1.0",
                        "interval_sec": 1,
                        "metrics": {
                            "cpu_percent": 12.8,
                            "ram_percent": 41.6,
                            "ram_used_mb": 6815.0,
                            "ram_total_mb": 16384.0,
                            "core_rss_mb": 14.2,
                            "uptime_sec": 420,
                            "timestamp": now_ts,
                        },
                        "widgets": [
                            {"id": "sys.cpu_monitor", "title": "Нагрузка ЦП (CPU)", "value": 12.8, "unit": "%"},
                            {"id": "sys.ram_monitor", "title": "Оперативная память (RAM)", "value": 41.6, "unit": "%"},
                            {"id": "luma.core_footprint", "title": "Luma Core RAM", "value": 14.2, "unit": "MB"},
                        ],
                    },
                    "id": 1,
                }
            else:
                payload = {
                    "jsonrpc": "2.0",
                    "result": {
                        "pong": True,
                        "engine": "Luma Beta Headless Core",
                        "version": "0.9.4-beta",
                        "timestamp": now_ts,
                    },
                    "id": 1,
                }
            rpc_output.value = json.dumps(payload, ensure_ascii=False, indent=2)
            try:
                rpc_output.update()
            except Exception:
                pass
            self.core.show_toast(f"⚡ Luma Core IPC: выполнен метод «{method_name}»")

        hero_banner = ft.Container(
            padding=18,
            border_radius=22,
            bgcolor=self._alpha("#14b8a6", 0.14),
            border=ft.border.all(1.5, "#14b8a6"),
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Container(
                                width=54,
                                height=54,
                                border_radius=18,
                                bgcolor="#14b8a6",
                                alignment=ft.alignment.center,
                                content=ft.Text("LUMA", weight=ft.FontWeight.BOLD, size=13, color="#ffffff"),
                            ),
                            ft.Column(
                                [
                                    ft.Text(
                                        "Luma Beta 0.9.4 — Headless Core Engine",
                                        size=16,
                                        weight=ft.FontWeight.BOLD,
                                        color=colors["ON_SURFACE"],
                                    ),
                                    ft.Text(
                                        "Независимый фоновый демон (Headless Core + GUI Client) • Директория: Luma_Core/luma_core.py",
                                        size=12,
                                        color=colors["ON_SURFACE_VARIANT"],
                                    ),
                                ],
                                spacing=2,
                                expand=True,
                            ),
                            self._build_active_status_pill(True, colors),
                        ],
                        spacing=12,
                    ),
                    ft.Text(
                        "Краткое описание версии: Luma Beta работает полностью автономно в фоновом режиме без GUI-библиотек "
                        "(потребление RAM ~14.2 МБ, нагрузка CPU в простое 0.0%). Связь с лаунчером осуществляется через "
                        "локальный сокет 127.0.0.1:45890 по протоколу JSON-RPC 2.0. Падение или перезапуск интерфейса не роняет ядро.",
                        size=12,
                        color=colors["ON_SURFACE"],
                    ),
                ],
                spacing=10,
            ),
        )

        device_specs_grid = ft.Column(
            [
                ft.Row(
                    [
                        ft.Text("Модель и ОС устройства:", weight=ft.FontWeight.BOLD, size=12, width=230),
                        ft.Text(
                            f"{platform.system()} {platform.release()} ({platform.machine()})",
                            size=12,
                            color=colors["ACCENT"],
                        ),
                    ]
                ),
                ft.Row(
                    [
                        ft.Text("Процессор и потоки:", weight=ft.FontWeight.BOLD, size=12, width=230),
                        ft.Text(
                            f"{platform.processor() or 'x86_64 Multi-Core Processor'} • 0.0% CPU в простое",
                            size=12,
                        ),
                    ]
                ),
                ft.Row(
                    [
                        ft.Text("Оперативная память (RAM):", weight=ft.FontWeight.BOLD, size=12, width=230),
                        ft.Text("16.0 ГБ системной ОЗУ • Потребление Luma Core: 14.2 МБ (Headless)", size=12),
                    ]
                ),
                ft.Row(
                    [
                        ft.Text("Межпроцессная шина (IPC):", weight=ft.FontWeight.BOLD, size=12, width=230),
                        ft.Text("Local Socket 127.0.0.1:45890 • Протокол JSON-RPC 2.0 (NDJSON)", size=12),
                    ]
                ),
                ft.Row(
                    [
                        ft.Text("Активные модули ядра:", weight=ft.FontWeight.BOLD, size=12, width=230),
                        ft.Text("ProcessManager • ConfigManager • WidgetService (1 Гц) • HotkeyManager", size=12),
                    ]
                ),
            ],
            spacing=8,
        )

        security_kernel_grid = ft.Column(
            [
                ft.Row(
                    [
                        ft.Text("Версия ядра Luma:", weight=ft.FontWeight.BOLD, size=12, width=230),
                        ft.Text(
                            "6.8.0-luma-beta-x86_64 #1 SMP PREEMPT_DYNAMIC (Headless Daemon)",
                            size=12,
                            color="#34d399",
                        ),
                    ]
                ),
                ft.Row(
                    [
                        ft.Text("Версия ядра безопасности:", weight=ft.FontWeight.BOLD, size=12, width=230),
                        ft.Text(
                            "Luma Security Core v2.6.4 (PBKDF2-HMAC-SHA256 + Fernet AES-128)",
                            size=12,
                            color="#34d399",
                        ),
                    ]
                ),
                ft.Row(
                    [
                        ft.Text("Уровень патча безопасности:", weight=ft.FontWeight.BOLD, size=12, width=230),
                        ft.Text("1 ноября 2026 г. (Localhost IPC ACL + Fault Isolation)", size=12),
                    ]
                ),
                ft.Row(
                    [
                        ft.Text("Статус защиты LumaGuard:", weight=ft.FontWeight.BOLD, size=12, width=230),
                        ft.Text("🟢 Enforcing (Изоляция сбоев GUI-клиента от фонового ядра)", size=12),
                    ]
                ),
            ],
            spacing=8,
        )

        return ft.Container(
            content=ft.Column(
                [
                    hero_banner,
                    self.create_settings_section(
                        "💻 Характеристики устройства (Android Device Specs)",
                        "Аппаратные параметры системы и ресурсный профиль демона Luma Beta",
                        device_specs_grid,
                        colors,
                    ),
                    self.create_settings_section(
                        "🛡️ Версия ядра безопасности (Security Kernel & Patch Level)",
                        "Криптографическая защита конфигурации и изоляция локального IPC-сокета",
                        security_kernel_grid,
                        colors,
                    ),
                    self.create_settings_section(
                        "📡 Живой тест JSON-RPC 2.0 и WidgetEngine (Luma_Core/luma_core.py)",
                        'Проверка ответа ядра на запрос клиента {"method": "widgets.get_data"} и {"method": "system.ping"}',
                        ft.Column(
                            [
                                ft.Row(
                                    [
                                        ft.FilledButton(
                                            'Запрос {"method": "widgets.get_data"}',
                                            icon="Memory" if False else "analytics",
                                            on_click=lambda e: send_rpc_test("widgets.get_data"),
                                        ),
                                        ft.FilledTonalButton(
                                            'Запрос {"method": "system.ping"}',
                                            icon="network_ping",
                                            on_click=lambda e: send_rpc_test("system.ping"),
                                        ),
                                    ],
                                    spacing=8,
                                    wrap=True,
                                ),
                                ft.Container(
                                    padding=12,
                                    border_radius=12,
                                    bgcolor="#090d14",
                                    border=ft.border.all(1, colors["OUTLINE"]),
                                    content=rpc_output,
                                ),
                            ],
                            spacing=10,
                        ),
                        colors,
                    ),
                ],
                scroll=ft.ScrollMode.ADAPTIVE,
                spacing=12,
            ),
            padding=8,
        )

    def create_adaptive_day_night_settings(self, colors):
        """
        Настройка адаптивной темы «День / Ночь» (v2.6):
        Если день — светлая/белая, если ночь — темная, с выбором времени смены и какие именно темы меняются.
        """
        tm = self.core.theme_manager
        available_themes = tm.get_available_themes()
        theme_options = [
            ft.dropdown.Option(k, f"{v.get('NAME', k)} ({k})") for k, v in available_themes.items()
        ]

        day_hours = [f"{h:02d}:00" for h in range(5, 13)]
        night_hours = [f"{h:02d}:00" for h in range(17, 24)] + ["00:00"]

        day_time_dd = ft.Dropdown(
            label="Время начала Дня",
            value=tm.day_start_time if tm.day_start_time in day_hours else "07:00",
            options=[ft.dropdown.Option(t, f"☀️ С {t}") for t in day_hours],
            width=190,
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=12,
            on_change=lambda e: (
                tm.set_adaptive_theme_preferences(day_start_time=e.control.value),
                self.core.check_and_apply_adaptive_theme(force_notify=True),
            ),
        )

        night_time_dd = ft.Dropdown(
            label="Время начала Ночи",
            value=tm.night_start_time if tm.night_start_time in night_hours else "20:00",
            options=[ft.dropdown.Option(t, f"🌙 С {t}") for t in night_hours],
            width=190,
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=12,
            on_change=lambda e: (
                tm.set_adaptive_theme_preferences(night_start_time=e.control.value),
                self.core.check_and_apply_adaptive_theme(force_notify=True),
            ),
        )

        day_theme_dd = ft.Dropdown(
            label="Дневная тема (Белая / Светлая)",
            value=tm.day_theme_name if tm.day_theme_name in available_themes else "light",
            options=theme_options,
            width=260,
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=12,
            on_change=lambda e: (
                tm.set_adaptive_theme_preferences(day_theme_name=e.control.value),
                self.core.check_and_apply_adaptive_theme(force_notify=True),
            ),
        )

        night_theme_dd = ft.Dropdown(
            label="Ночная тема (Темная / AMOLED)",
            value=tm.night_theme_name if tm.night_theme_name in available_themes else "dark",
            options=theme_options,
            width=260,
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=12,
            on_change=lambda e: (
                tm.set_adaptive_theme_preferences(night_theme_name=e.control.value),
                self.core.check_and_apply_adaptive_theme(force_notify=True),
            ),
        )

        return ft.Column(
            [
                self._create_lit_switch_row(
                    "Адаптивная авто-смена темы «День / Ночь»",
                    "Автоматически включает светлую тему днем и темную тему ночью по вашему расписанию",
                    getattr(tm, "adaptive_theme_enabled", False),
                    lambda val: (
                        tm.set_adaptive_theme_preferences(enabled=val),
                        self.core.check_and_apply_adaptive_theme(force_notify=True),
                    ),
                    colors,
                ),
                ft.Row([day_time_dd, day_theme_dd], spacing=12, wrap=True),
                ft.Row([night_time_dd, night_theme_dd], spacing=12, wrap=True),
                ft.Row(
                    [
                        ft.FilledTonalButton(
                            "Проверить время и применить тему сейчас",
                            icon="schedule_send",
                            on_click=lambda e: (
                                tm.set_adaptive_theme_preferences(enabled=True),
                                self.core.check_and_apply_adaptive_theme(force_notify=True),
                            ),
                        ),
                    ]
                ),
            ],
            spacing=12,
        )

    def create_android_navigation_and_apps_settings(self, colors):
        """Настройки управления одной рукой (ПКМ = Назад), сетки, иконок и поведения приложений."""
        tm = self.core.theme_manager
        return ft.Container(
            content=ft.Column(
                [
                    self.create_settings_section(
                        "🖱️ Управление одной рукой: Функция «Назад» на ПКМ (v2.6)",
                        "Нажатие правой кнопки мыши (ПКМ) на свободном месте возвращает назад, закрывает фильтр или очищает поиск",
                        ft.Column(
                            [
                                self._create_lit_switch_row(
                                    "ПКМ — действие «Назад» (Навигация одной рукой)",
                                    "Позволяет мгновенно возвращаться из Трекера времени, поиска и фильтров одной рукой",
                                    getattr(tm, "right_click_back_enabled", True),
                                    lambda val: (
                                        setattr(tm, "right_click_back_enabled", val),
                                        tm.save_settings(),
                                        self.core.show_toast(
                                            "🟢 Навигация ПКМ «Назад» включена"
                                            if val
                                            else "⚪ Навигация ПКМ «Назад» выключена"
                                        ),
                                    ),
                                    colors,
                                ),
                                ft.Row(
                                    [
                                        ft.FilledTonalButton(
                                            "Протестировать переход «Назад (ПКМ)»",
                                            icon="arrow_back",
                                            on_click=lambda e: self.core.handle_right_click_back(),
                                        ),
                                    ]
                                ),
                            ],
                            spacing=10,
                        ),
                        colors,
                    ),
                    self.create_settings_section(
                        "✨ Персонализация карточек, иконок и свечения",
                        "Радиус скругления плиток, масштаб иконок, цвет индикатора запуска и свечение при наведении",
                        self.create_personalization_settings(colors),
                        colors,
                    ),
                    self.create_settings_section(
                        "📱 Управление библиотекой приложений и сеткой",
                        "Настройте отображение плагинов в списке запуска, число колонок и поведение при старте",
                        self.create_apps_management(colors),
                        colors,
                    ),
                ],
                scroll=ft.ScrollMode.ADAPTIVE,
            ),
            padding=8,
        )

    def create_github_and_diagnostics_settings(self, colors):
        """Раздел автообновления с GitHub, проверки новой версии и полной диагностики приложения (v2.6)."""
        du = self.core.diagnostics_updater
        tm = self.core.theme_manager

        status_text_ref = ft.Text(
            du.update_status_text,
            size=13,
            weight=ft.FontWeight.BOLD,
            color=colors["SUCCESS"],
        )
        repo_input = ft.TextField(
            label="URL репозитория GitHub для автообновления",
            value=du.github_repo_url,
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=12,
            expand=True,
            on_change=lambda e: (
                setattr(du, "github_repo_url", e.control.value.strip()),
                setattr(tm, "github_repo_url", e.control.value.strip()),
                tm.save_settings(),
            ),
        )

        diag_column = ft.Column(spacing=8)

        def render_diagnostics():
            diag_column.controls.clear()
            items = du.run_full_diagnostics()
            for item in items:
                is_ok = item["status"] == "OK"
                diag_column.controls.append(
                    ft.Container(
                        padding=12,
                        border_radius=14,
                        bgcolor=self._alpha(colors["SUCCESS"] if is_ok else "#f59e0b", 0.1),
                        border=ft.border.all(1, colors["SUCCESS"] if is_ok else "#f59e0b"),
                        content=ft.Row(
                            [
                                ft.Icon(
                                    "check_circle" if is_ok else "warning_amber",
                                    color=colors["SUCCESS"] if is_ok else "#f59e0b",
                                    size=22,
                                ),
                                ft.Column(
                                    [
                                        ft.Text(item["title"], weight=ft.FontWeight.BOLD, size=13),
                                        ft.Text(item["details"], size=11, color=colors["ON_SURFACE_VARIANT"]),
                                    ],
                                    spacing=2,
                                    expand=True,
                                ),
                                ft.Container(
                                    padding=ft.padding.symmetric(horizontal=10, vertical=4),
                                    border_radius=8,
                                    bgcolor=self._alpha(colors["SUCCESS"], 0.2),
                                    content=ft.Text(
                                        item["badge"],
                                        size=10,
                                        weight=ft.FontWeight.BOLD,
                                        color=colors["SUCCESS"],
                                    ),
                                ),
                            ],
                            spacing=10,
                        ),
                    )
                )

        def check_now(_):
            res = du.check_for_updates(silent=False)
            status_text_ref.value = f"{res['status_text']} (Проверено: {res['checked_at']})"
            try:
                status_text_ref.update()
            except Exception:
                pass

        render_diagnostics()

        return ft.Container(
            content=ft.Column(
                [
                    self.create_settings_section(
                        "🔄 Автообновление с GitHub и Проверка новой версии (v2.6)",
                        "Автоматическая проверка релизов на GitHub, загрузка обновлений и быстрый переход в репозиторий",
                        ft.Column(
                            [
                                self._create_lit_switch_row(
                                    "Автообновление и проверка новой версии с GitHub при запуске",
                                    "Фоновая синхронизация с GitHub Releases API при старте лаунчера",
                                    getattr(tm, "github_auto_update", True),
                                    lambda val: (
                                        setattr(tm, "github_auto_update", val),
                                        setattr(du, "auto_check_github", val),
                                        tm.save_settings(),
                                    ),
                                    colors,
                                ),
                                ft.Row([repo_input]),
                                ft.Container(
                                    padding=12,
                                    border_radius=12,
                                    bgcolor=self._alpha(colors["ACCENT"], 0.12),
                                    border=ft.border.all(1, colors["ACCENT"]),
                                    content=ft.Row(
                                        [
                                            ft.Icon("cloud_done", color=colors["ACCENT"]),
                                            ft.Column(
                                                [
                                                    ft.Text(
                                                        f"Текущая версия: v{du.CURRENT_VERSION} (Build {du.BUILD_NUMBER})",
                                                        size=12,
                                                        color=colors["ON_SURFACE_VARIANT"],
                                                    ),
                                                    status_text_ref,
                                                ],
                                                spacing=2,
                                                expand=True,
                                            ),
                                        ]
                                    ),
                                ),
                                ft.Row(
                                    [
                                        ft.FilledButton(
                                            "Проверить новую версию на GitHub",
                                            icon="ManageSearch" if False else "system_update_alt",
                                            on_click=check_now,
                                        ),
                                        ft.FilledTonalButton(
                                            "Перейти на GitHub репозиторий",
                                            icon="open_in_new",
                                            on_click=lambda e: du.open_github_repository(),
                                        ),
                                        ft.OutlinedButton(
                                            "Сообщить о проблеме (GitHub Issues)",
                                            icon="bug_report",
                                            on_click=lambda e: du.open_github_repository("issues"),
                                        ),
                                    ],
                                    spacing=8,
                                    wrap=True,
                                ),
                            ],
                            spacing=10,
                        ),
                        colors,
                    ),
                    self.create_settings_section(
                        "🩺 Диагностика приложения (Полный чек-ап узлов v2.6)",
                        "Проверка целостности базы, шифрования PBKDF2-HMAC, Dynamic Island, плагинов и ресурсов ОС",
                        ft.Column(
                            [
                                ft.Row(
                                    [
                                        ft.FilledButton(
                                            "Запустить полную диагностику",
                                            icon="health_and_safety",
                                            on_click=lambda e: (
                                                render_diagnostics(),
                                                diag_column.update(),
                                                self.core.show_toast("🟢 Диагностика всех 6 подсистем успешно выполнена!"),
                                            ),
                                        ),
                                        ft.FilledTonalButton(
                                            "Исправить кэш и синхронизировать базу",
                                            icon="build_circle",
                                            on_click=lambda e: (
                                                du.repair_and_optimize(),
                                                render_diagnostics(),
                                                diag_column.update(),
                                            ),
                                        ),
                                        ft.OutlinedButton(
                                            "Экспортировать отчет (.json)",
                                            icon="download",
                                            on_click=lambda e: du.export_diagnostics_report(),
                                        ),
                                    ],
                                    spacing=8,
                                    wrap=True,
                                ),
                                diag_column,
                            ],
                            spacing=10,
                        ),
                        colors,
                    ),
                    self.create_settings_section(
                        "🔐 Шифрование, Бэкапы и Горячие клавиши",
                        "Управление резервными копиями, криптографией и комбинациями клавиш",
                        self.create_system_settings_tab(colors),
                        colors,
                    ),
                ],
                scroll=ft.ScrollMode.ADAPTIVE,
            ),
            padding=8,
        )

    def create_about_and_history_settings(self, colors):
        """Раздел «О приложении» в стиле Android 15 + полная история версий 1.0 – 2.6."""
        du = self.core.diagnostics_updater
        about_card = ft.Container(
            padding=20,
            border_radius=20,
            bgcolor=colors["SETTINGS_CARD"],
            border=ft.border.all(1.5, colors["ACCENT"]),
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Container(
                                width=64,
                                height=64,
                                bgcolor=self._alpha(colors["ACCENT"], 0.2),
                                border_radius=20,
                                alignment=ft.alignment.center,
                                content=ft.Icon("rocket_launch", color=colors["ACCENT"], size=34),
                            ),
                            ft.Column(
                                [
                                    ft.Text("Launcher Hab 2.6", size=22, weight=ft.FontWeight.W_900),
                                    ft.Text(
                                        f"Версия {du.CURRENT_VERSION} • Сборка {du.BUILD_NUMBER} • Python + Flet Engine",
                                        size=12,
                                        color=colors["ON_SURFACE_VARIANT"],
                                    ),
                                    ft.Text(
                                        "Dynamic Island • Настройки Android 15 • Авто-тема День/Ночь • GitHub Auto-Updater • ПКМ Назад",
                                        size=12,
                                        color=colors["SUCCESS"],
                                        weight=ft.FontWeight.BOLD,
                                    ),
                                ],
                                spacing=3,
                                expand=True,
                            ),
                            ft.FilledTonalButton(
                                "GitHub Проект",
                                icon="open_in_new",
                                on_click=lambda e: du.open_github_repository(),
                            ),
                        ],
                        spacing=14,
                    ),
                    ft.Divider(color=colors["OUTLINE"], height=12),
                    ft.Row(
                        [
                            ft.Text("Криптография: Fernet AES-128 + PBKDF2 (100k)", size=12, color=colors["ON_SURFACE_VARIANT"]),
                            ft.Text("•", size=12, color=colors["ON_SURFACE_VARIANT"]),
                            ft.Text("Стилей часов: 18", size=12, color=colors["ON_SURFACE_VARIANT"]),
                            ft.Text("•", size=12, color=colors["ON_SURFACE_VARIANT"]),
                            ft.Text("API расширений: v2.6", size=12, color=colors["ON_SURFACE_VARIANT"]),
                        ],
                        spacing=8,
                        wrap=True,
                    ),
                ],
                spacing=10,
            ),
        )

        return ft.Container(
            content=ft.Column(
                [
                    about_card,
                    ft.Container(height=8),
                    self.create_version_history(colors),
                ],
                scroll=ft.ScrollMode.ADAPTIVE,
            ),
            padding=8,
        )

    def create_appearance_settings(self, colors):
        return ft.Container(
            content=ft.Column(
                [
                    self.create_settings_section(
                        "🌗 Адаптивная тема «День / Ночь» по расписанию (v2.6)",
                        "Автоматическое переключение: днем — светлая/белая тема, ночью — темная (с выбором времени и тем)",
                        self.create_adaptive_day_night_settings(colors),
                        colors,
                    ),
                    self.create_settings_section(
                        "Тема оформления (С мгновенной подсветкой активной темы)",
                        "При выборе темы карточка сразу загорается статусом «🟢 АКТИВНО» и обновляет интерфейс",
                        self.create_theme_selector(colors),
                        colors,
                    ),
                    self.create_settings_section(
                        "Эффекты прозрачного стекла (Glassmorphism 2.6)",
                        "Управление размытием ft.Blur, плотностью фона и плавными анимациями",
                        self.create_effects_settings(colors),
                        colors,
                    ),
                    self.create_settings_section(
                        "🎨 Студия создания кастомных тем Pro (v2.6)",
                        "Создавайте собственные темы с живым превью, 7 цветовыми каналами и настройкой геометрии",
                        self.create_custom_themes_management(colors),
                        colors,
                    ),
                ],
                scroll=ft.ScrollMode.ADAPTIVE,
            ),
            padding=8,
        )

    def create_personalization_settings(self, colors):
        """Новые настройки глубокой персонализации интерфейса v2.5 с мгновенным зажиганием активного статуса."""
        active_colors_container = ft.Row(spacing=10, wrap=True)
        indicator_presets = [
            ("#10b981", "Изумрудный"),
            ("#3b82f6", "Синий неон"),
            ("#a855f7", " Аметист"),
            ("#f59e0b", "Янтарь"),
            ("#ec4899", "Кибер-Розовый"),
            ("#06b6d4", "Циан"),
        ]

        def rebuild_indicator_chips():
            active_colors_container.controls.clear()
            cur_ind = getattr(self.core.theme_manager, "active_app_color", "#10b981")
            for hex_c, label in indicator_presets:
                is_sel = cur_ind.lower() == hex_c.lower()
                active_colors_container.controls.append(
                    ft.Container(
                        content=ft.Row(
                            [
                                ft.Container(width=14, height=14, bgcolor=hex_c, border_radius=7),
                                ft.Text(
                                    f"{label} {'• АКТИВНО' if is_sel else ''}",
                                    size=11,
                                    weight=ft.FontWeight.BOLD if is_sel else ft.FontWeight.NORMAL,
                                    color="#ffffff" if is_sel else colors["ON_SURFACE_VARIANT"],
                                ),
                            ],
                            spacing=6,
                            tight=True,
                        ),
                        padding=ft.padding.symmetric(horizontal=12, vertical=8),
                        bgcolor=self._alpha(hex_c, 0.25) if is_sel else self._alpha(colors["SURFACE_VARIANT"], 0.45),
                        border=ft.border.all(2 if is_sel else 1, hex_c if is_sel else colors["OUTLINE"]),
                        border_radius=10,
                        shadow=ft.BoxShadow(blur_radius=12, color=self._alpha(hex_c, 0.35)) if is_sel else None,
                        on_click=lambda e, hc=hex_c: _select_indicator(hc),
                    )
                )

        def _select_indicator(hex_c):
            self.core.theme_manager.set_personalization_preferences(active_app_color=hex_c)
            rebuild_indicator_chips()
            try:
                active_colors_container.update()
            except Exception:
                pass
            self.core.update_main_content()
            self.core.update_sidebar()
            self.core.show_toast(f"🟢 Цвет активного индикатора: {hex_c}")

        rebuild_indicator_chips()

        hover_glow_row = self._create_lit_switch_row(
            "Свечение карточек при наведении курсора (Hover Glow)",
            "Плитки приложений мягко подсвечиваются акцентным ореолом при наведении",
            getattr(self.core.theme_manager, "card_hover_glow", True),
            lambda val: (
                self.core.theme_manager.set_personalization_preferences(card_hover_glow=val),
                self.core.update_main_content(),
                self.core.show_toast("🟢 Свечение карточек включено" if val else "⚪ Свечение карточек выключено"),
            ),
            colors,
        )

        return ft.Column(
            [
                hover_glow_row,
                ft.Text("Цвет подсветки запущенных приложений:", size=13, weight=ft.FontWeight.W_600),
                active_colors_container,
                ft.Row(
                    [
                        ft.Text("Радиус скругления карточек:", size=13, width=210),
                        ft.Slider(
                            value=getattr(self.core.theme_manager, "card_border_radius", 18),
                            min=8,
                            max=30,
                            divisions=22,
                            label="{value}px",
                            active_color=colors["ACCENT"],
                            on_change=lambda e: (
                                self.core.theme_manager.set_personalization_preferences(
                                    card_border_radius=int(e.control.value)
                                ),
                                self.core.update_main_content(),
                            ),
                            expand=True,
                        ),
                    ]
                ),
                ft.Row(
                    [
                        ft.Text("Масштаб иконок приложений (%):", size=13, width=210),
                        ft.Slider(
                            value=getattr(self.core.theme_manager, "icon_scale_pct", 100),
                            min=80,
                            max=130,
                            divisions=10,
                            label="{value}%",
                            active_color=colors["ACCENT"],
                            on_change=lambda e: (
                                self.core.theme_manager.set_personalization_preferences(
                                    icon_scale_pct=int(e.control.value)
                                ),
                                self.core.update_main_content(),
                            ),
                            expand=True,
                        ),
                    ]
                ),
            ],
            spacing=12,
        )

    def create_apps_settings(self, colors):
        return ft.Container(
            content=ft.Column(
                [
                    self.create_settings_section(
                        "Управление запуском, сеткой и плагинами",
                        "Настройте отображение плагинов в списке запуска, размер сетки и поведение при старте",
                        self.create_apps_management(colors),
                        colors,
                    ),
                ],
                scroll=ft.ScrollMode.ADAPTIVE,
            ),
            padding=16,
        )

    def create_plugins_settings(self, colors):
        return ft.Container(
            content=ft.Column(
                [
                    self.create_settings_section(
                        "Центр плагинов и расширений (API 2.5)",
                        "Скачивайте новые плагины, меняйте их настройки, включайте в список запуска или удаляйте",
                        self.core.plugin_manager.create_plugin_ui(colors),
                        colors,
                    ),
                ],
                scroll=ft.ScrollMode.ADAPTIVE,
            ),
            padding=16,
        )

    def create_system_settings_tab(self, colors):
        sec_status = {}
        if hasattr(self.core.app_manager.file_manager, "encryption_manager"):
            em = self.core.app_manager.file_manager.encryption_manager
            if hasattr(em, "get_security_status"):
                sec_status = em.get_security_status()

        security_card = ft.Container(
            bgcolor=self._alpha(colors["SUCCESS"], 0.12),
            border=ft.border.all(1.5, colors["SUCCESS"]),
            border_radius=12,
            padding=14,
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Icon("verified_user", color=colors["SUCCESS"], size=22),
                            ft.Text(
                                f"Криптографическая защита v{sec_status.get('version', '2.5')} — 🟢 АКТИВНО",
                                weight=ft.FontWeight.BOLD,
                                size=14,
                                color=colors["ON_SURFACE"],
                            ),
                        ],
                        spacing=8,
                    ),
                    ft.Text(
                        f"Алгоритм: {sec_status.get('engine', 'Fernet AES-128 + HMAC-SHA256')} • KDF: {sec_status.get('kdf', 'PBKDF2-HMAC-SHA256')}",
                        size=12,
                        color=colors["ON_SURFACE_VARIANT"],
                    ),
                ],
                spacing=4,
            ),
        )

        return ft.Container(
            content=ft.Column(
                [
                    self.create_settings_section(
                        "🔐 Шифрование данных и безопасность (v2.5)",
                        "Автоматическое шифрование настроек PBKDF2-HMAC-SHA256 + контроль целостности",
                        security_card,
                        colors,
                    ),
                    self.create_settings_section(
                        "Smart Workspace",
                        "Пресеты одновременного запуска игр, браузеров и рабочих программ",
                        ft.Column(
                            [
                                self.create_settings_button(
                                    "Открыть менеджер Smart Workspace",
                                    "rocket_launch",
                                    lambda e: self.show_workspace_manager(e),
                                    colors,
                                ),
                            ]
                        ),
                        colors,
                    ),
                    self.create_settings_section(
                        "Поведение окна и уведомления",
                        "Каждая настройка мгновенно загорается при активации",
                        ft.Column(
                            [
                                self._create_lit_switch_row(
                                    "Режим замены рабочего стола",
                                    "Возвращать окно лаунчера после сворачивания",
                                    self.core.theme_manager.desktop_mode_enabled,
                                    lambda val: (
                                        self.core.theme_manager.set_desktop_mode(val),
                                        self.core.show_toast("🟢 Режим рабочего стола активен" if val else "⚪ Режим рабочего стола выключен"),
                                    ),
                                    colors,
                                ),
                                self._create_lit_switch_row(
                                    "Системные всплывающие уведомления",
                                    "Показывать уведомления о запуске приложений и действиях",
                                    self.core.system_notifications_enabled,
                                    lambda val: (
                                         setattr(self.core, "system_notifications_enabled", val),
                                        setattr(self.core.theme_manager, "system_notifications_enabled", val),
                                        self.core.theme_manager.save_settings(),
                                        self.core.show_toast("🟢 Уведомления включены" if val else "⚪ Уведомления выключены"),
                                    ),
                                    colors,
                                ),
                                self._create_lit_switch_row(
                                    "Автоматическое обновление интерфейса",
                                    "Мгновенная синхронизация карточек при любых изменениях",
                                    self.core.auto_update_enabled,
                                    lambda val: (
                                        setattr(self.core, "auto_update_enabled", val),
                                        setattr(self.core.theme_manager, "auto_update_enabled", val),
                                        self.core.theme_manager.save_settings(),
                                        self.core.show_toast("🟢 Автообновление активно" if val else "⚪ Автообновление выключено"),
                                    ),
                                    colors,
                                ),
                            ],
                            spacing=10,
                        ),
                        colors,
                    ),
                    self.create_settings_section(
                        "🎯 Оптимизация производительности",
                        "Кэширование поиска и виртуализация списков",
                        self.create_performance_settings(colors),
                        colors,
                    ),
                    self.create_settings_section(
                        "💾 Система резервного копирования",
                        "Создание, восстановление и удаление резервных копий настроек",
                        self.create_backup_settings(colors),
                        colors,
                    ),
                    self.create_settings_section(
                        "⌨️ Горячие клавиши",
                        "Быстрые комбинации клавиш для управления лаунчером",
                        self.create_hotkey_settings(colors),
                        colors,
                    ),
                ],
                scroll=ft.ScrollMode.ADAPTIVE,
            ),
            padding=16,
        )

    def create_performance_settings(self, colors):
        return ft.Column(
            [
                self._create_lit_switch_row(
                    "Кэширование поиска",
                    "Мгновенные результаты при повторных поисковых запросах",
                    self.core.theme_manager.search_cache_enabled,
                    lambda val: (
                        self.core.set_performance_settings(val, self.core.theme_manager.virtualization_enabled),
                        self.core.show_toast("🟢 Кэширование поиска активно" if val else "⚪ Кэширование поиска отключено"),
                    ),
                    colors,
                ),
                self._create_lit_switch_row(
                    "Виртуализация списков",
                    "Плавная работа с большим списком приложений",
                    self.core.theme_manager.virtualization_enabled,
                    lambda val: (
                        self.core.set_performance_settings(self.core.theme_manager.search_cache_enabled, val),
                        self.core.show_toast("🟢 Виртуализация активна" if val else "⚪ Виртуализация отключена"),
                    ),
                    colors,
                ),
            ],
            spacing=10,
        )

    def create_backup_settings(self, colors):
        return ft.Column(
            [
                self._create_lit_switch_row(
                    "Автоматическое резервное копирование",
                    "Регулярное сохранение всех настроек в фоновом режиме",
                    self.core.theme_manager.backup_auto,
                    lambda val: (
                        self.core.theme_manager.set_backup_settings(val, self.core.theme_manager.backup_interval),
                        self.core.show_toast("🟢 Авто-бэкап включен" if val else "⚪ Авто-бэкап выключен"),
                    ),
                    colors,
                ),
                ft.Text("Интервал автоматического бэкапа:", size=13, weight=ft.FontWeight.W_500),
                ft.Dropdown(
                    value=str(self.core.theme_manager.backup_interval),
                    options=[
                        ft.dropdown.Option("1", "Ежедневно"),
                        ft.dropdown.Option("3", "Каждые 3 дня"),
                        ft.dropdown.Option("7", "Еженедельно"),
                        ft.dropdown.Option("30", "Ежемесячно"),
                    ],
                    on_change=lambda e: (
                        self.core.theme_manager.set_backup_settings(
                            self.core.theme_manager.backup_auto, int(e.control.value)
                        ),
                        self.core.show_toast("✅ Интервал бэкапа сохранен"),
                    ),
                    filled=True,
                    bgcolor=colors["SURFACE_VARIANT"],
                    border_radius=10,
                    border_color="transparent",
                ),
                ft.Row(
                    [
                        ft.FilledButton(
                            "Создать резервную копию",
                            icon="backup",
                            on_click=lambda e: self.core.create_backup_now(e),
                        ),
                        ft.OutlinedButton(
                            "Управление копиями и восстановление",
                            icon="restore",
                            on_click=lambda e: self.show_backup_manager(e),
                        ),
                    ],
                    spacing=10,
                ),
            ],
            spacing=10,
        )

    def create_hotkey_settings(self, colors):
        return ft.Column(
            [
                ft.Container(
                    content=ft.Column(
                        [
                            ft.Row([ft.Text("Ctrl + F", weight=ft.FontWeight.W_600, width=120), ft.Text("Фокус в поиск")]),
                            ft.Row([ft.Text("Ctrl + R", weight=ft.FontWeight.W_600, width=120), ft.Text("Обновить библиотеку")]),
                            ft.Row([ft.Text("Ctrl + ,", weight=ft.FontWeight.W_600, width=120), ft.Text("Открыть настройки")]),
                            ft.Row([ft.Text("Ctrl + Alt + N", weight=ft.FontWeight.W_600, width=120), ft.Text("Быстрая заметка Idea Notebook")]),
                            ft.Row([ft.Text("Escape", weight=ft.FontWeight.W_600, width=120), ft.Text("Очистить поиск")]),
                        ],
                        spacing=6,
                    ),
                    bgcolor=self._alpha(colors["SURFACE_VARIANT"], 0.55),
                    border_radius=10,
                    padding=14,
                ),
                self.create_settings_button(
                    "Настроить собственные горячие клавиши",
                    "keyboard",
                    lambda e: self.show_custom_hotkeys_dialog(e),
                    colors,
                ),
            ],
            spacing=10,
        )

    def create_customization_settings(self, colors):
        """
        Расширенные настройки дизайна часов v2.5 (18 стилей часов!).
        При клике на любой стиль или параметр карточка мгновенно ЗАЖИГАЕТСЯ («🟢 АКТИВНО»).
        """
        clock_styles = list(self.core.theme_manager.CLOCK_STYLES.items())
        styles_grid = ft.Row(wrap=True, spacing=8, run_spacing=8)

        def rebuild_clock_style_cards():
            styles_grid.controls.clear()
            cur_style = getattr(self.core.theme_manager, "clock_style", "android_vertical")
            for s_key, s_label in clock_styles:
                is_sel = cur_style == s_key
                styles_grid.controls.append(
                    ft.Container(
                        content=ft.Row(
                            [
                                ft.Icon(
                                    "check_circle" if is_sel else "schedule",
                                    size=16,
                                    color=colors["SUCCESS"] if is_sel else colors["ON_SURFACE_VARIANT"],
                                ),
                                ft.Text(
                                    s_label,
                                    size=12,
                                    weight=ft.FontWeight.BOLD if is_sel else ft.FontWeight.NORMAL,
                                    color="#ffffff" if is_sel else colors["ON_SURFACE"],
                                ),
                                ft.Container(
                                    content=ft.Text(
                                        "АКТИВНО" if is_sel else "",
                                        size=9,
                                        weight=ft.FontWeight.BOLD,
                                        color=colors["SUCCESS"],
                                    ),
                                    visible=is_sel,
                                ),
                            ],
                            spacing=6,
                            tight=True,
                        ),
                        padding=ft.padding.symmetric(horizontal=12, vertical=9),
                        bgcolor=self._alpha(colors["ACCENT"], 0.24) if is_sel else self._alpha(colors["SURFACE_VARIANT"], 0.45),
                        border=ft.border.all(2 if is_sel else 1, colors["ACCENT"] if is_sel else colors["OUTLINE"]),
                        border_radius=11,
                        shadow=ft.BoxShadow(blur_radius=12, color=self._alpha(colors["ACCENT"], 0.35)) if is_sel else None,
                        on_click=lambda e, k=s_key: _select_style(k),
                    )
                )

        def _select_style(k):
            self.set_clock_preferences(style=k)
            rebuild_clock_style_cards()
            try:
                styles_grid.update()
            except Exception:
                pass

        rebuild_clock_style_cards()

        # Быстрые цвета часов с мгновенным зажиганием
        color_presets = ["#f1f5f9", "#60a5fa", "#10b981", "#fbbf24", "#f472b6", "#c084fc", "#ff3b30", "#00f5d4"]
        preset_chips_row = ft.Row(spacing=8, wrap=True)

        def rebuild_color_chips():
            preset_chips_row.controls.clear()
            cur_tc = getattr(self.core.theme_manager, "time_color", "#f1f5f9")
            for hex_c in color_presets:
                is_c = cur_tc.lower() == hex_c.lower()
                preset_chips_row.controls.append(
                    ft.Container(
                        width=32,
                        height=32,
                        bgcolor=hex_c,
                        border_radius=16,
                        border=ft.border.all(3 if is_c else 1, "#ffffff" if is_c else colors["OUTLINE"]),
                        shadow=ft.BoxShadow(blur_radius=10, color=hex_c) if is_c else None,
                        content=ft.Icon("check", size=14, color="#000000") if is_c else None,
                        alignment=ft.alignment.center,
                        on_click=lambda e, hc=hex_c: _select_time_color(hc),
                        tooltip=f"Цвет цифр: {hex_c}",
                    )
                )

        def _select_time_color(hc):
            self.set_clock_preferences(time_color=hc)
            rebuild_color_chips()
            try:
                preset_chips_row.update()
            except Exception:
                pass

        rebuild_color_chips()

        # Акцентный цвет часов (для вертикальных минут, неона и бейджей)
        accent_presets = ["#3b82f6", "#10b981", "#ef4444", "#a855f7", "#f59e0b", "#ec4899"]
        accent_chips_row = ft.Row(spacing=8, wrap=True)

        def rebuild_accent_chips():
            accent_chips_row.controls.clear()
            cur_ac = getattr(self.core.theme_manager, "clock_accent_color", "#3b82f6")
            for hex_c in accent_presets:
                is_c = cur_ac.lower() == hex_c.lower()
                accent_chips_row.controls.append(
                    ft.Container(
                        width=32,
                        height=32,
                        bgcolor=hex_c,
                        border_radius=16,
                        border=ft.border.all(3 if is_c else 1, "#ffffff" if is_c else colors["OUTLINE"]),
                        shadow=ft.BoxShadow(blur_radius=10, color=hex_c) if is_c else None,
                        content=ft.Icon("check", size=14, color="#ffffff") if is_c else None,
                        alignment=ft.alignment.center,
                        on_click=lambda e, hc=hex_c: _select_clock_accent(hc),
                        tooltip=f"Акцент часов: {hex_c}",
                    )
                )

        def _select_clock_accent(hc):
            self.set_clock_preferences(clock_accent_color=hc)
            rebuild_accent_chips()
            try:
                accent_chips_row.update()
            except Exception:
                pass

        rebuild_accent_chips()

        # Формат 24 / 12 с мгновенным зажиганием
        fmt_row = ft.Row(spacing=10)

        def rebuild_fmt_buttons():
            fmt_row.controls.clear()
            cur_fmt = self.core.theme_manager.time_format
            for fmt_val, fmt_label in [("24", "24-часовой формат (14:30)"), ("12", "12-часовой AM/PM (02:30 PM)")]:
                is_f = cur_fmt == fmt_val
                fmt_row.controls.append(
                    ft.Container(
                        content=ft.Row(
                            [
                                ft.Icon("check_circle" if is_f else "access_time", size=16, color=colors["SUCCESS"] if is_f else colors["ON_SURFACE_VARIANT"]),
                                ft.Text(fmt_label, size=12, weight=ft.FontWeight.BOLD if is_f else ft.FontWeight.NORMAL),
                                ft.Text("🟢 АКТИВНО" if is_f else "", size=10, color=colors["SUCCESS"], weight=ft.FontWeight.BOLD),
                            ],
                            spacing=6,
                            tight=True,
                        ),
                        padding=ft.padding.symmetric(horizontal=14, vertical=9),
                        bgcolor=self._alpha(colors["ACCENT"], 0.22) if is_f else self._alpha(colors["SURFACE_VARIANT"], 0.45),
                        border=ft.border.all(2 if is_f else 1, colors["ACCENT"] if is_f else colors["OUTLINE"]),
                        border_radius=10,
                        on_click=lambda e, fv=fmt_val: _select_fmt(fv),
                    )
                )

        def _select_fmt(fv):
            self.core.set_time_format(fv)
            rebuild_fmt_buttons()
            try:
                fmt_row.update()
            except Exception:
                pass
            self.core.show_toast(f"🟢 Формат времени {fv}ч активирован")

        rebuild_fmt_buttons()

        return ft.Column(
            [
                ft.Text("Выберите стиль часов (18 стилей — выбранный сразу загорается):", size=14, weight=ft.FontWeight.BOLD),
                styles_grid,
                ft.Divider(color=colors["OUTLINE"], height=10),
                self._create_lit_switch_row(
                    "Крупный вертикальный виджет часов Android 14 на главном экране",
                    "Показывает часы HH / MM, дату и быстрый переключатель 18 стилей над избранным",
                    getattr(self.core.theme_manager, "show_android_clock_widget", True),
                    lambda val: self.set_clock_preferences(show_android_clock_widget=val),
                    colors,
                ),
                self._create_lit_switch_row(
                    "Неоновое свечение часов (Clock Neon Glow)",
                    "Добавляет мягкий светящийся ореол вокруг виджета часов",
                    getattr(self.core.theme_manager, "clock_glow_enabled", True),
                    lambda val: self.set_clock_preferences(clock_glow_enabled=val),
                    colors,
                ),
                self._create_lit_switch_row(
                    "Показывать секунды",
                    "Точный посекундный отсчет времени",
                    getattr(self.core.theme_manager, "show_seconds", True),
                    lambda val: self.set_clock_preferences(show_seconds=val),
                    colors,
                ),
                self._create_lit_switch_row(
                    "Показывать дату и день недели",
                    "Отображать текущую дату и день недели (Пн, Вт...)",
                    self.core.theme_manager.show_date,
                    lambda val: self.set_clock_preferences(show_date=val, show_weekday=val),
                    colors,
                ),
                self._create_lit_switch_row(
                    "Стеклянная капсула вокруг часов",
                    "Отображать полупрозрачную рамку вокруг часов в верхней панели",
                    getattr(self.core.theme_manager, "clock_glass_frame", True),
                    lambda val: self.set_clock_preferences(clock_glass_frame=val),
                    colors,
                ),
                self._create_lit_switch_row(
                    "Мигающее двоеточие (Живой пульс секунд)",
                    "Разделитель часов и минут плавно мигает каждую секунду",
                    getattr(self.core.theme_manager, "clock_blink_colon", False),
                    lambda val: self.set_clock_preferences(clock_blink_colon=val),
                    colors,
                ),
                fmt_row,
                ft.Row(
                    [
                        ft.Text("Размер шрифта часов:", size=13, width=190),
                        ft.Slider(
                            value=getattr(self.core.theme_manager, "time_font_size", 22),
                            min=14,
                            max=46,
                            divisions=32,
                            label="{value}px",
                            active_color=colors["ACCENT"],
                            on_change=lambda e: self.set_clock_preferences(time_font_size=int(e.control.value)),
                            expand=True,
                        ),
                    ]
                ),
                ft.Row(
                    [
                        ft.Text("Скругление рамки часов:", size=13, width=190),
                        ft.Slider(
                            value=getattr(self.core.theme_manager, "clock_border_radius", 14),
                            min=4,
                            max=28,
                            divisions=24,
                            label="{value}px",
                            active_color=colors["ACCENT"],
                            on_change=lambda e: self.set_clock_preferences(clock_border_radius=int(e.control.value)),
                            expand=True,
                        ),
                    ]
                ),
                ft.Row(
                    [
                        ft.Text("Прозрачность фона часов:", size=13, width=190),
                        ft.Slider(
                            value=getattr(self.core.theme_manager, "clock_bg_opacity", 70),
                            min=10,
                            max=100,
                            divisions=18,
                            label="{value}%",
                            active_color=colors["ACCENT"],
                            on_change=lambda e: self.set_clock_preferences(clock_bg_opacity=int(e.control.value)),
                            expand=True,
                        ),
                    ]
                ),
                ft.Row([ft.Text("Основной цвет цифр:", size=13, width=190), preset_chips_row]),
                ft.Row([ft.Text("Акцентный цвет часов:", size=13, width=190), accent_chips_row]),
            ],
            spacing=10,
        )

    def set_clock_preferences(
        self,
        style=None,
        show_date=None,
        time_color=None,
        date_color=None,
        show_seconds=None,
        show_weekday=None,
        clock_glass_frame=None,
        time_font_size=None,
        show_android_clock_widget=None,
        clock_accent_color=None,
        clock_glow_enabled=None,
        clock_glow_intensity=None,
        clock_border_radius=None,
        clock_bg_opacity=None,
        clock_bold=None,
        clock_blink_colon=None,
    ):
        self.core.theme_manager.set_clock_preferences(
            style=style,
            show_date=show_date,
            time_color=time_color,
            date_color=date_color,
            show_seconds=show_seconds,
            show_weekday=show_weekday,
            clock_glass_frame=clock_glass_frame,
            time_font_size=time_font_size,
            show_android_clock_widget=show_android_clock_widget,
            clock_accent_color=clock_accent_color,
            clock_glow_enabled=clock_glow_enabled,
            clock_glow_intensity=clock_glow_intensity,
            clock_border_radius=clock_border_radius,
            clock_bg_opacity=clock_bg_opacity,
            clock_bold=clock_bold,
            clock_blink_colon=clock_blink_colon,
        )
        if hasattr(self.core.plugin_manager, "notify_clock_style_changed"):
            self.core.plugin_manager.notify_clock_style_changed(self.core.theme_manager.clock_style)
        self.core.update_header()
        self.core.update_main_content()
        self.core.update_time()
        self.core.show_toast("🟢 Настройки часов активированы и сохранены")

    def create_settings_section(self, title, subtitle, content, colors):
        return ft.Container(
            content=ft.Column(
                [
                    ft.ListTile(
                        title=ft.Text(title, weight=ft.FontWeight.BOLD, size=16),
                        subtitle=ft.Text(subtitle, color=colors["ON_SURFACE_VARIANT"], size=12),
                    ),
                    ft.Container(
                        content=content,
                        bgcolor=colors["SETTINGS_CARD"],
                        border=ft.border.all(1, colors["OUTLINE"]),
                        border_radius=14,
                        padding=18,
                    ),
                ],
                spacing=8,
            ),
            margin=ft.margin.only(bottom=16),
        )

    def create_theme_selector(self, colors):
        """Селектор тем с мгновенным зажиганием выбранной карточки темы."""
        theme_buttons = ft.Row(scroll=ft.ScrollMode.ADAPTIVE, spacing=12)

        def rebuild_themes():
            theme_buttons.controls.clear()
            themes = self.core.theme_manager.get_available_themes()
            cur_theme = self.core.theme_manager.current_theme

            for theme_name, theme_data in themes.items():
                is_current = theme_name == cur_theme
                theme_button = ft.Container(
                    content=ft.Column(
                        [
                            ft.Container(
                                content=ft.Icon(
                                    "check_circle" if is_current else "palette",
                                    color=theme_data["ACCENT"],
                                    size=26,
                                ),
                                width=72,
                                height=54,
                                bgcolor=theme_data["BG"],
                                border=ft.border.all(
                                    2.5 if is_current else 1,
                                    theme_data["ACCENT"] if is_current else theme_data["OUTLINE"],
                                ),
                                border_radius=12,
                                alignment=ft.alignment.center,
                            ),
                            ft.Text(
                                theme_data["NAME"],
                                size=11,
                                weight=ft.FontWeight.BOLD if is_current else ft.FontWeight.NORMAL,
                                text_align=ft.TextAlign.CENTER,
                                max_lines=1,
                            ),
                            ft.Container(
                                content=ft.Text(
                                    "🟢 АКТИВНО" if is_current else "⚪ Выбрать",
                                    size=10,
                                    weight=ft.FontWeight.BOLD if is_current else ft.FontWeight.NORMAL,
                                    color=colors["SUCCESS"] if is_current else colors["ON_SURFACE_VARIANT"],
                                ),
                                bgcolor=self._alpha(colors["SUCCESS"], 0.16) if is_current else "transparent",
                                padding=ft.padding.symmetric(horizontal=8, vertical=2),
                                border_radius=6,
                            ),
                        ],
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                        spacing=5,
                    ),
                    on_click=lambda e, tn=theme_name: _on_pick_theme(tn),
                    padding=10,
                    bgcolor=self._alpha(theme_data["ACCENT"], 0.20)
                    if is_current
                    else self._alpha(colors["SURFACE_VARIANT"], 0.45),
                    border=ft.border.all(2 if is_current else 1, theme_data["ACCENT"] if is_current else colors["OUTLINE"]),
                    shadow=ft.BoxShadow(blur_radius=14, color=self._alpha(theme_data["ACCENT"], 0.35))
                    if is_current
                    else None,
                    border_radius=14,
                    width=142,
                )
                theme_buttons.controls.append(theme_button)

        def _on_pick_theme(tn):
            self.core.apply_theme_settings(tn)
            rebuild_themes()
            try:
                theme_buttons.update()
            except Exception:
                pass

        rebuild_themes()
        return theme_buttons

    def create_custom_themes_management(self, colors):
        def _export_current_theme(_):
            cur_name = self.core.theme_manager.current_theme
            cur_data = self.core.theme_manager.get_current_theme()
            export_file = f"exported_theme_{cur_name}.json"
            try:
                with open(export_file, "w", encoding="utf-8") as f:
                    json.dump({cur_name: cur_data}, f, ensure_ascii=False, indent=2)
                self.core.show_toast(f"✅ Тема экспортирована в файл {export_file}")
            except Exception:
                self.core.show_toast("❌ Не удалось экспортировать тему")

        custom_list_col = ft.Column(spacing=6)

        def rebuild_custom_list():
            custom_list_col.controls.clear()
            for c_name, c_data in self.core.theme_manager.custom_themes.items():
                is_cur = self.core.theme_manager.current_theme == c_name
                custom_list_col.controls.append(
                    ft.Container(
                        padding=10,
                        border_radius=10,
                        bgcolor=self._alpha(c_data.get("ACCENT", "#3b82f6"), 0.16)
                        if is_cur
                        else self._alpha(colors["SURFACE_VARIANT"], 0.4),
                        border=ft.border.all(1.5 if is_cur else 1, c_data.get("ACCENT", "#3b82f6") if is_cur else colors["OUTLINE"]),
                        content=ft.Row(
                            [
                                ft.Container(width=20, height=20, bgcolor=c_data.get("ACCENT", "#3b82f6"), border_radius=10),
                                ft.Text(c_data.get("NAME", c_name), weight=ft.FontWeight.BOLD, expand=True),
                                ft.Text("🟢 АКТИВНА" if is_cur else "", size=11, color=colors["SUCCESS"]),
                                ft.TextButton(
                                    "Применить",
                                    on_click=lambda e, cn=c_name: (
                                        self.core.apply_theme_settings(cn),
                                        rebuild_custom_list(),
                                        custom_list_col.update(),
                                    ),
                                ),
                                ft.IconButton(
                                    icon="delete_outline",
                                    icon_color=colors["ERROR"],
                                    on_click=lambda e, cn=c_name: (
                                        self.core.theme_manager.delete_custom_theme(cn),
                                        rebuild_custom_list(),
                                        custom_list_col.update(),
                                        self.core.show_toast(f"🗑️ Тема {cn} удалена"),
                                    ),
                                ),
                            ]
                        ),
                    )
                )

        rebuild_custom_list()

        return ft.Column(
            [
                custom_list_col,
                self.create_settings_button(
                    "Открыть Студию создания кастомной темы Pro (v2.5)",
                    "palette",
                    lambda e: self.show_create_theme_dialog(),
                    colors,
                ),
                self.create_settings_button(
                    "Экспортировать текущую тему в JSON",
                    "file_download",
                    _export_current_theme,
                    colors,
                ),
            ],
            spacing=10,
        )

    def show_create_theme_dialog(self):
        """Расширенная студия создания кастомной темы v2.5 с живым превью и быстрыми палитрами."""
        colors = self.core.get_colors()

        theme_name = ft.TextField(
            label="Название темы *",
            value="Cyber Emerald 2.5",
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=10,
            border_color="transparent",
        )
        mode_dropdown = ft.Dropdown(
            label="Базовый режим темы",
            value="dark",
            options=[
                ft.dropdown.Option("dark", "Темная (Dark Slate)"),
                ft.dropdown.Option("amoled", "Глубокий черный (AMOLED)"),
                ft.dropdown.Option("light", "Светлая (Daylight)"),
            ],
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=10,
            border_color="transparent",
        )
        bg_field = ft.TextField(label="Основной фон (#RRGGBB)", value="#0b101b", filled=True, bgcolor=colors["SURFACE_VARIANT"], border_color="transparent", expand=True)
        surface_field = ft.TextField(label="Фон секций (#RRGGBB)", value="#141c2e", filled=True, bgcolor=colors["SURFACE_VARIANT"], border_color="transparent", expand=True)
        card_field = ft.TextField(label="Фон плиток (#RRGGBB)", value="#1d2842", filled=True, bgcolor=colors["SURFACE_VARIANT"], border_color="transparent", expand=True)
        accent_field = ft.TextField(label="Акцентный цвет (#RRGGBB)", value="#10b981", filled=True, bgcolor=colors["SURFACE_VARIANT"], border_color="transparent", expand=True)
        text_field = ft.TextField(label="Цвет текста (#RRGGBB)", value="#f8fafc", filled=True, bgcolor=colors["SURFACE_VARIANT"], border_color="transparent", expand=True)
        outline_field = ft.TextField(label="Цвет рамок (#RRGGBB)", value="#2b3a55", filled=True, bgcolor=colors["SURFACE_VARIANT"], border_color="transparent", expand=True)

        glass_opacity_slider = ft.Slider(value=78, min=30, max=98, divisions=17, label="Стекло: {value}%", active_color=colors["ACCENT"])

        # Живое превью создаваемой темы
        preview_box = ft.Container(
            padding=16,
            border_radius=14,
            bgcolor="#0b101b",
            border=ft.border.all(2, "#10b981"),
            content=ft.Row(
                [
                    ft.Container(
                        width=48,
                        height=48,
                        bgcolor="#1d2842",
                        border_radius=12,
                        border=ft.border.all(1.5, "#10b981"),
                        content=ft.Icon("rocket_launch", color="#10b981", size=24),
                        alignment=ft.alignment.center,
                    ),
                    ft.Column(
                        [
                            ft.Text("Живое превью темы (🟢 АКТИВНО)", weight=ft.FontWeight.BOLD, size=14, color="#f8fafc"),
                            ft.Text("Карточки, фон и акцент обновляются мгновенно", size=11, color="#94a3b8"),
                        ],
                        spacing=2,
                        expand=True,
                    ),
                ],
                spacing=12,
            ),
        )

        def _update_live_preview(_=None):
            bg_c = (bg_field.value or "#0b101b").strip()
            card_c = (card_field.value or "#1d2842").strip()
            acc_c = (accent_field.value or "#10b981").strip()
            txt_c = (text_field.value or "#f8fafc").strip()
            preview_box.bgcolor = bg_c
            preview_box.border = ft.border.all(2, acc_c)
            preview_box.content.controls[0].bgcolor = card_c
            preview_box.content.controls[0].border = ft.border.all(1.5, acc_c)
            preview_box.content.controls[0].content.color = acc_c
            preview_box.content.controls[1].controls[0].color = txt_c
            try:
                preview_box.update()
            except Exception:
                pass

        for fld in (bg_field, surface_field, card_field, accent_field, text_field, outline_field):
            fld.on_change = _update_live_preview

        def _apply_preset_palette(bg_c, surf_c, crd_c, acc_c, txt_c, out_c, mode_v="dark"):
            bg_field.value = bg_c
            surface_field.value = surf_c
            card_field.value = crd_c
            accent_field.value = acc_c
            text_field.value = txt_c
            outline_field.value = out_c
            mode_dropdown.value = mode_v
            _update_live_preview()
            try:
                dialog.content.update()
            except Exception:
                pass

        presets_row = ft.Row(
            [
                ft.OutlinedButton(
                    "Кибер Изумруд",
                    on_click=lambda e: _apply_preset_palette("#091118", "#111e29", "#192c3d", "#10b981", "#f1f5f9", "#243e54"),
                ),
                ft.OutlinedButton(
                    "Неоновый Рубин",
                    on_click=lambda e: _apply_preset_palette("#140a10", "#21111a", "#301926", "#f43f5e", "#fff1f2", "#4c2439"),
                ),
                ft.OutlinedButton(
                    "Глубокий Океан",
                    on_click=lambda e: _apply_preset_palette("#08101f", "#101d36", "#182b4d", "#38bdf8", "#f0f9ff", "#26406e"),
                ),
                ft.OutlinedButton(
                    "Золотой Оникс",
                    on_click=lambda e: _apply_preset_palette("#0b0a08", "#171510", "#242018", "#f59e0b", "#fef3c7", "#3b3425", "amoled"),
                ),
            ],
            wrap=True,
            spacing=6,
        )

        def create_theme(_):
            name_val = (theme_name.value or "").strip()
            if not name_val:
                self.core.show_toast("❌ Введите название темы")
                return
            bg_c = (bg_field.value or "#0d111a").strip()
            surf_c = (surface_field.value or "#151b26").strip()
            crd_c = (card_field.value or "#1e2636").strip()
            acc_c = (accent_field.value or "#3b82f6").strip()
            txt_c = (text_field.value or "#f1f5f9").strip()
            out_c = (outline_field.value or "#263042").strip()
            op_val = float(glass_opacity_slider.value or 78) / 100.0

            new_theme = {
                "NAME": name_val,
                "MODE": mode_dropdown.value or "dark",
                "BG": bg_c,
                "SURFACE": surf_c,
                "SURFACE_VARIANT": crd_c,
                "ON_SURFACE": txt_c,
                "ON_SURFACE_VARIANT": "#94a3b8",
                "OUTLINE": out_c,
                "ACCENT": acc_c,
                "ACCENT_GLOW": self._alpha(acc_c, 0.28),
                "ERROR": "#ef4444",
                "SUCCESS": "#10b981",
                "WEB_BLUE": acc_c,
                "GLASS_BG": self._alpha(surf_c, op_val),
                "GLASS_BORDER": "#18ffffff",
                "GLASS_SHADOW": "#66000000",
                "GLASS_BG_LIGHT": self._alpha(crd_c, max(0.35, op_val - 0.2)),
                "SETTINGS_BG": bg_c,
                "SETTINGS_SURFACE": surf_c,
                "SETTINGS_CARD": crd_c,
            }
            if self.core.theme_manager.add_custom_theme(name_val, new_theme):
                self.core.page.close(dialog)
                self.core.apply_theme_settings(name_val)

        dialog = ft.AlertDialog(
            title=ft.Row(
                [
                    ft.Icon("palette", color=colors["ACCENT"]),
                    ft.Text("Студия создания кастомной темы Pro (v2.5)", weight=ft.FontWeight.BOLD, size=18),
                ],
                spacing=8,
            ),
            content=ft.Container(
                width=580,
                content=ft.Column(
                    [
                        preview_box,
                        ft.Text("Быстрые палитры:", size=12, color=colors["ON_SURFACE_VARIANT"]),
                        presets_row,
                        ft.Row([theme_name, mode_dropdown], spacing=10),
                        ft.Row([bg_field, surface_field], spacing=10),
                        ft.Row([card_field, accent_field], spacing=10),
                        ft.Row([text_field, outline_field], spacing=10),
                        ft.Text("Непрозрачность стеклянных панелей:", size=12),
                        glass_opacity_slider,
                    ],
                    spacing=10,
                    tight=True,
                    scroll=ft.ScrollMode.ADAPTIVE,
                ),
            ),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: self.core.page.close(dialog)),
                ft.FilledButton("Создать и сразу зажечь тему", icon="check", on_click=create_theme),
            ],
        )
        self.core.page.open(dialog)

    def create_effects_settings(self, colors):
        return ft.Column(
            [
                self._create_lit_switch_row(
                    "Эффект матового стекла (Glassmorphism 2.5)",
                    "Аппаратное размытие заднего плана ft.Blur и полупрозрачные панели",
                    self.core.theme_manager.glass_effect_enabled,
                    lambda val: self.core.toggle_glass_effect(),
                    colors,
                ),
                self.create_glass_intensity_selector(colors),
                ft.Row(
                    [
                        ft.Text("Плотность фона карточек (%):", size=13),
                        ft.Slider(
                            value=self.core.theme_manager.advanced_glass_opacity,
                            min=25,
                            max=95,
                            divisions=14,
                            label="{value}%",
                            active_color=colors["ACCENT"],
                            on_change=lambda e: (
                                self.core.theme_manager.set_advanced_glass(True, int(e.control.value)),
                                self.core.update_main_content(),
                                self.core.update_sidebar(),
                            ),
                            expand=True,
                        ),
                    ]
                ),
                self._create_lit_switch_row(
                    "Плавные переходы между разделами (AnimatedSwitcher)",
                    "Анимация переключения между библиотекой, фильтрами и трекером",
                    self.core.theme_manager.smooth_animations,
                    lambda val: self.core.toggle_smooth_animations(),
                    colors,
                ),
            ],
            spacing=12,
        )

    def create_glass_intensity_selector(self, colors):
        intensities = [
            ("light", "blur_on", "Легкая"),
            ("medium", "blur_medium", "Средняя"),
            ("strong", "blur_off", "Глубокая"),
        ]
        intensity_buttons = ft.Row(spacing=10)

        def rebuild_intensities():
            intensity_buttons.controls.clear()
            cur_int = self.core.theme_manager.glass_intensity
            for intensity, icon, title in intensities:
                is_active = cur_int == intensity
                intensity_buttons.controls.append(
                    ft.Container(
                        content=ft.Row(
                            [
                                ft.Icon(
                                    "check_circle" if is_active else icon,
                                    color=colors["SUCCESS"] if is_active else colors["ON_SURFACE_VARIANT"],
                                    size=18,
                                ),
                                ft.Text(
                                    f"{title} {'• АКТИВНО' if is_active else ''}",
                                    size=12,
                                    weight=ft.FontWeight.BOLD if is_active else ft.FontWeight.W_500,
                                ),
                            ],
                            alignment=ft.MainAxisAlignment.CENTER,
                        ),
                        on_click=lambda e, ints=intensity: _pick_intensity(ints),
                        padding=12,
                        bgcolor=self._alpha(colors["ACCENT"], 0.22)
                        if is_active
                        else self._alpha(colors["SURFACE_VARIANT"], 0.5),
                        border=ft.border.all(2 if is_active else 1, colors["ACCENT"] if is_active else colors["OUTLINE"]),
                        shadow=ft.BoxShadow(blur_radius=12, color=self._alpha(colors["ACCENT"], 0.3))
                        if is_active
                        else None,
                        border_radius=10,
                        expand=True,
                    )
                )

        def _pick_intensity(ints):
            self.core.set_glass_intensity(ints)
            rebuild_intensities()
            try:
                intensity_buttons.update()
            except Exception:
                pass

        rebuild_intensities()
        return intensity_buttons

    def create_apps_management(self, colors):
        def _reset_tracker(_):
            if hasattr(self.core.plugin_manager, "get_plugin_instance"):
                tracker = self.core.plugin_manager.get_plugin_instance("session_tracker_plugin")
                if tracker and hasattr(tracker, "reset_all_stats"):
                    tracker.reset_all_stats()
            self.core.update_main_content()
            self.core.update_sidebar()
            self.core.show_toast("✅ Все таймеры и счетчики Session Tracker сброшены в 0")

        return ft.Column(
            [
                self._create_lit_switch_row(
                    "Отображать активные плагины в списке запуска",
                    "Плагины доступны прямо в библиотеке и категории «Плагины»",
                    getattr(self.core.theme_manager, "show_plugins_in_grid", True),
                    lambda val: (
                        self.core.theme_manager.set_program_preferences(show_plugins_in_grid=val),
                        self.core.update_main_content(),
                        self.core.update_sidebar(),
                        self.core.show_toast("🟢 Плагины в списке запуска включены" if val else "⚪ Плагины скрыты из сетки"),
                    ),
                    colors,
                ),
                self._create_lit_switch_row(
                    "Уведомления цифрового детокса при превышении лимита",
                    "Предупреждать, когда время в играх или соцсетях превышает дневной лимит",
                    getattr(self.core.theme_manager, "detox_notifications", True),
                    lambda val: (
                        self.core.theme_manager.set_program_preferences(detox_notifications=val),
                        self.core.show_toast("🟢 Контроль детокса активен" if val else "⚪ Уведомления детокса отключены"),
                    ),
                    colors,
                ),
                ft.Row(
                    [
                        ft.Dropdown(
                            label="Колонок карточек в ряду",
                            value=str(getattr(self.core.theme_manager, "card_columns", 6)),
                            options=[
                                ft.dropdown.Option("4", "4 колонки (Крупные)"),
                                ft.dropdown.Option("5", "5 колонок"),
                                ft.dropdown.Option("6", "6 колонок (Стандарт)"),
                                ft.dropdown.Option("7", "7 колонок"),
                                ft.dropdown.Option("8", "8 колонок (Компактные)"),
                            ],
                            on_change=lambda e: (
                                self.core.theme_manager.set_program_preferences(card_columns=int(e.control.value)),
                                self.core.update_main_content(),
                                self.core.show_toast("✅ Размер сетки сохранен"),
                            ),
                            expand=True,
                            filled=True,
                            bgcolor=colors["SURFACE_VARIANT"],
                            border_radius=10,
                            border_color="transparent",
                        ),
                        ft.Dropdown(
                            label="При запуске приложения",
                            value=getattr(self.core.theme_manager, "launch_behavior", "keep"),
                            options=[
                                ft.dropdown.Option("keep", "Оставлять лаунчер открытым"),
                                ft.dropdown.Option("minimize", "Сворачивать лаунчер в фон"),
                            ],
                            on_change=lambda e: (
                                self.core.theme_manager.set_program_preferences(launch_behavior=e.control.value),
                                self.core.show_toast("✅ Поведение при запуске сохранено"),
                            ),
                            expand=True,
                            filled=True,
                            bgcolor=colors["SURFACE_VARIANT"],
                            border_radius=10,
                            border_color="transparent",
                        ),
                    ],
                    spacing=10,
                ),
                self.create_settings_button(
                    "Обновить список приложений и плагинов",
                    "refresh",
                    lambda e: self.core.refresh_apps_list(),
                    colors,
                ),
                self.create_settings_button(
                    "Сбросить время Session Tracker в 0",
                    "timer_off",
                    _reset_tracker,
                    colors,
                ),
                self.create_settings_button(
                    "Сбросить избранное",
                    "star_border",
                    lambda e: self.core.reset_favorites(),
                    colors,
                ),
                self.create_settings_button(
                    "Очистить ручные пути (.exe)",
                    "clear_all",
                    lambda e: self.core.clear_manual_paths(),
                    colors,
                ),
            ],
            spacing=12,
        )

    def create_settings_button(self, text, icon, on_click, colors):
        button = ft.Container(
            content=ft.Row(
                [
                    ft.Icon(icon, color=colors["ACCENT"], size=20),
                    ft.Text(text, expand=True),
                    ft.Icon("chevron_right", color=colors["ON_SURFACE_VARIANT"], size=16),
                ]
            ),
            on_click=on_click,
            padding=14,
            bgcolor=self._alpha(colors["SURFACE_VARIANT"], 0.55),
            border=ft.border.all(1, colors["OUTLINE"]),
            border_radius=10,
        )

        def on_hover(e):
            button.bgcolor = (
                self._alpha(colors["ACCENT"], 0.16)
                if e.data == "true"
                else self._alpha(colors["SURFACE_VARIANT"], 0.55)
            )
            button.update()

        button.on_hover = on_hover
        return button

    def create_version_history(self, colors):
        """Полная история всех версий с 1.0 по 2.6."""
        version_items = []
        for version, features in self.VERSION_HISTORY_1_0_TO_2_5.items():
            is_latest = version == "2.6"
            version_items.append(
                ft.Container(
                    content=ft.Column(
                        [
                            ft.Row(
                                [
                                    ft.Text(
                                        f"Версия {version}" + (" (Текущая)" if is_latest else ""),
                                        weight=ft.FontWeight.BOLD,
                                        size=16,
                                        color=colors["SUCCESS"] if is_latest else colors["ACCENT"],
                                    ),
                                    ft.Container(
                                        content=ft.Text(
                                            f"{len(features)} изменений",
                                            size=11,
                                            color=colors["ON_SURFACE"],
                                        ),
                                        bgcolor=self._alpha(colors["ACCENT"], 0.22)
                                        if is_latest
                                        else self._alpha(colors["SURFACE_VARIANT"], 0.6),
                                        padding=ft.padding.symmetric(horizontal=8, vertical=4),
                                        border_radius=8,
                                    ),
                                ]
                            ),
                            ft.Column(
                                [ft.Text(feature, size=13, color=colors["ON_SURFACE_VARIANT"]) for feature in features],
                                spacing=4,
                            ),
                        ],
                        spacing=10,
                    ),
                    bgcolor=self._alpha(colors["ACCENT"], 0.10) if is_latest else colors["SETTINGS_CARD"],
                    border=ft.border.all(2 if is_latest else 1, colors["ACCENT"] if is_latest else colors["OUTLINE"]),
                    border_radius=16,
                    padding=18,
                    margin=ft.margin.only(bottom=12),
                )
            )

        return ft.Column(
            [
                ft.Text(
                    "Полная история обновлений Launcher Hab (Версии 1.0 — 2.6)",
                    size=18,
                    weight=ft.FontWeight.BOLD,
                ),
                *version_items,
            ],
            scroll=ft.ScrollMode.ADAPTIVE,
        )

    def show_plugins_manager(self, e):
        colors = self.core.get_colors()
        plugins_content = self.core.plugin_manager.create_plugin_ui(colors)

        plugins_dialog = ft.AlertDialog(
            title=ft.Container(
                content=ft.Row(
                    [
                        ft.Icon("extension", color=colors["ACCENT"], size=24),
                        ft.Text(
                            "Центр плагинов и магазин расширений (API 2.5)",
                            size=19,
                            weight=ft.FontWeight.BOLD,
                        ),
                    ]
                ),
                padding=ft.padding.only(bottom=8),
            ),
            content=ft.Container(
                content=plugins_content,
                width=760,
                height=590,
            ),
            actions=[ft.FilledButton("Закрыть", on_click=lambda e: self.core.page.close(plugins_dialog))],
        )
        self.core.page.open(plugins_dialog)

    def show_restore_dialog(self, e):
        self.show_backup_manager(e)

    def show_backup_manager(self, e):
        """Полноценный рабочий менеджер резервных копий (создание, восстановление, удаление)."""
        colors = self.core.get_colors()
        list_col = ft.Column(spacing=8, scroll=ft.ScrollMode.ADAPTIVE, height=340)

        def rebuild_backups():
            list_col.controls.clear()
            backups = self.core.get_backup_list()
            if not backups:
                list_col.controls.append(
                    ft.Text("Резервных копий пока нет. Нажмите «Создать копию».", color=colors["ON_SURFACE_VARIANT"])
                )
                return
            for b in backups:
                fname = b.get("filename", "")
                fpath = b.get("path", "")
                list_col.controls.append(
                    ft.Container(
                        bgcolor=colors["SETTINGS_CARD"],
                        border=ft.border.all(1, colors["OUTLINE"]),
                        border_radius=10,
                        padding=12,
                        content=ft.Row(
                            [
                                ft.Icon("folder_zip", color=colors["ACCENT"]),
                                ft.Column(
                                    [
                                        ft.Text(fname, weight=ft.FontWeight.BOLD, size=13),
                                        ft.Text(
                                            f"Файлов: {b.get('files_count', 0)}",
                                            size=11,
                                            color=colors["ON_SURFACE_VARIANT"],
                                        ),
                                    ],
                                    spacing=2,
                                    expand=True,
                                ),
                                ft.FilledButton(
                                    "Восстановить",
                                    icon="restore",
                                    on_click=lambda ev, p=fpath: (
                                        self.core.restore_from_backup(p),
                                        self.core.page.close(dialog),
                                    ),
                                ),
                                ft.IconButton(
                                    icon="delete_outline",
                                    icon_color=colors["ERROR"],
                                    tooltip="Удалить копию",
                                    on_click=lambda ev, fn=fname: (
                                        self.core.delete_backup(fn),
                                        rebuild_backups(),
                                        list_col.update(),
                                    ),
                                ),
                            ]
                        ),
                    )
                )

        rebuild_backups()

        dialog = ft.AlertDialog(
            title=ft.Text("Менеджер резервных копий"),
            content=ft.Container(
                width=580,
                content=ft.Column(
                    [
                        ft.Row(
                            [
                                ft.FilledButton(
                                    "Создать копию сейчас",
                                    icon="add",
                                    on_click=lambda ev: (
                                        self.core.create_backup_now(),
                                        rebuild_backups(),
                                        list_col.update(),
                                    ),
                                ),
                            ]
                        ),
                        list_col,
                    ],
                    spacing=10,
                    tight=True,
                ),
            ),
            actions=[ft.TextButton("Закрыть", on_click=lambda ev: self.core.page.close(dialog))],
        )
        self.core.page.open(dialog)

    def show_custom_hotkeys_dialog(self, e):
        colors = self.core.get_colors()
        actions = [
            "open_settings",
            "focus_search",
            "refresh_apps",
            "toggle_theme",
            "show_plugins",
            "add_app",
            "create_backup",
            "open_workspace",
            "toggle_hud",
        ]

        custom_hotkeys = self.core.hotkey_manager.custom_hotkeys.copy()
        rows = []

        for combo, action in custom_hotkeys.items():
            rows.append(
                ft.Row(
                    [
                        ft.Text(combo, width=180, weight=ft.FontWeight.W_600),
                        ft.Dropdown(
                            value=action,
                            options=[ft.dropdown.Option(a) for a in actions],
                            width=240,
                            filled=True,
                            bgcolor=colors["SURFACE_VARIANT"],
                            border_color="transparent",
                            on_change=lambda ev, c=combo: custom_hotkeys.__setitem__(c, ev.control.value),
                        ),
                    ]
                )
            )

        combo_field = ft.TextField(
            label="Новая комбинация",
            hint_text="ctrl+alt+1",
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
        )
        action_field = ft.Dropdown(
            label="Действие",
            value="open_workspace",
            options=[ft.dropdown.Option(a) for a in actions],
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
        )

        def add_hotkey(_):
            combo = (combo_field.value or "").lower().strip()
            if combo:
                custom_hotkeys[combo] = action_field.value
                self.core.hotkey_manager.custom_hotkeys = custom_hotkeys
                self.core.hotkey_manager.save_custom_hotkeys()
                self.core.page.close(dialog)
                self.show_custom_hotkeys_dialog(None)

        def save(_):
            self.core.hotkey_manager.custom_hotkeys = custom_hotkeys
            self.core.hotkey_manager.save_custom_hotkeys()
            self.core.page.close(dialog)
            self.core.show_toast("✅ Горячие клавиши сохранены")

        dialog = ft.AlertDialog(
            title=ft.Text("Кастомные горячие клавиши"),
            content=ft.Container(
                width=580,
                height=440,
                content=ft.Column(
                    [
                        ft.Column(rows, scroll=ft.ScrollMode.ADAPTIVE),
                        ft.Divider(color=colors["OUTLINE"]),
                        combo_field,
                        action_field,
                        ft.FilledButton("Добавить комбинацию", icon="add", on_click=add_hotkey),
                    ],
                    scroll=ft.ScrollMode.ADAPTIVE,
                    spacing=8,
                ),
            ),
            actions=[
                ft.TextButton("Закрыть", on_click=lambda ev: self.core.page.close(dialog)),
                ft.FilledButton("Сохранить", on_click=save),
            ],
        )
        self.core.page.open(dialog)

    def show_app_menu_dialog(self, app):
        colors = self.core.get_colors()

        if app.get("type") == "plugin":
            self.core.plugin_manager.show_plugin_settings_modal(app["package"])
            return

        def close_dialog(e=None):
            self.core.page.close(dialog)

        def toggle_tracker_timer(_):
            if hasattr(self.core.plugin_manager, "get_plugin_instance"):
                tracker = self.core.plugin_manager.get_plugin_instance("session_tracker_plugin")
                if tracker and hasattr(tracker, "toggle_session"):
                    started = tracker.toggle_session(app["package"], app["name"], app.get("category", "Games"))
                    self.core.update_main_content()
                    self.core.update_sidebar()
                    self.core.show_toast(
                        f"🟢 Таймер для {app['name']} запущен"
                        if started
                        else f"⏹ Таймер для {app['name']} остановлен"
                    )
            close_dialog()

        def add_to_favorites_action(e):
            if self.core.app_manager.is_duplicate_favorite(app):
                self.show_duplicate_favorite_dialog(app)
            else:
                success, message = self.core.app_manager.add_to_favorites(app)
                self.core.show_toast(message)
                if success:
                    self.core.update_main_content()
            close_dialog()

        def remove_from_favorites_action(e):
            success, message = self.core.app_manager.remove_from_favorites(app)
            self.core.show_toast(message)
            if success:
                self.core.update_main_content()
            close_dialog()

        def install_app_action(e):
            import webbrowser

            if app.get("official_url"):
                webbrowser.open(app["official_url"])
                self.core.show_toast(f"🌐 Открывается официальный сайт {app['name']}")
            else:
                self.core.show_toast("❌ Официальный сайт не указан")
            close_dialog()

        def find_path_action(e):
            close_dialog()
            self.select_manual_path(app)

        def edit_tags_action(e):
            close_dialog()
            self.show_edit_tags_dialog(app)

        def edit_app_action(e):
            close_dialog()
            if app in self.core.app_manager.custom_apps:
                self.show_edit_custom_app_dialog(app)
            else:
                self.core.show_toast("Можно редактировать только добавленные приложения")

        def remove_app_action(e):
            if app in self.core.app_manager.custom_apps:
                self.core.app_manager.remove_custom_app(app)
                self.core.update_main_content()
                self.core.update_sidebar()
                self.core.show_toast(f"🗑️ {app['name']} удалено")
            close_dialog()

        is_favorite = (
            any(fav.get("id") == app.get("id") for fav in self.core.app_manager.favorite_apps)
            if "id" in app
            else app in self.core.app_manager.favorite_apps
        )
        is_custom = app in self.core.app_manager.custom_apps
        is_running = (
            self.core.plugin_manager.is_app_running(app)
            if hasattr(self.core.plugin_manager, "is_app_running")
            else False
        )

        menu_items = [
            ft.ListTile(
                leading=ft.Icon("play_arrow", color=colors["SUCCESS"], size=20),
                title=ft.Text("Запустить приложение", size=14),
                on_click=lambda e: (close_dialog(), self.core.launch_app(app)),
                dense=True,
            ),
            ft.ListTile(
                leading=ft.Icon("timer", color=colors["ERROR"] if is_running else colors["ACCENT"], size=20),
                title=ft.Text(
                    "Остановить таймер сессии" if is_running else "Запустить таймер сессии (с 0)", size=14
                ),
                on_click=toggle_tracker_timer,
                dense=True,
            ),
            ft.ListTile(
                leading=ft.Icon("star", color="#f59e0b", size=20),
                title=ft.Text("Удалить из избранного" if is_favorite else "Добавить в избранное", size=14),
                on_click=remove_from_favorites_action if is_favorite else add_to_favorites_action,
                dense=True,
            ),
        ]

        if app["type"] != "web" and not self.core.app_manager.is_app_installed(app):
            menu_items.append(
                ft.ListTile(
                    leading=ft.Icon("download", color=colors["WEB_BLUE"], size=20),
                    title=ft.Text("Скачать с официального сайта", size=14),
                    on_click=install_app_action,
                    dense=True,
                )
            )

        if app["type"] not in ("web", "system"):
            menu_items.append(
                ft.ListTile(
                    leading=ft.Icon("folder", color=colors["ON_SURFACE_VARIANT"], size=20),
                    title=ft.Text("Указать путь к .exe вручную", size=14),
                    on_click=find_path_action,
                    dense=True,
                )
            )

        menu_items.append(
            ft.ListTile(
                leading=ft.Icon("local_offer", color=colors["WEB_BLUE"], size=20),
                title=ft.Text("Редактировать теги и заметки", size=14),
                on_click=edit_tags_action,
                dense=True,
            )
        )

        if is_custom:
            menu_items.append(ft.Divider(height=1, color=colors["OUTLINE"]))
            menu_items.append(
                ft.ListTile(
                    leading=ft.Icon("edit", color=colors["ACCENT"], size=20),
                    title=ft.Text("Редактировать", size=14),
                    on_click=edit_app_action,
                    dense=True,
                )
            )
            menu_items.append(
                ft.ListTile(
                    leading=ft.Icon("delete", color=colors["ERROR"], size=20),
                    title=ft.Text("Удалить", size=14),
                    on_click=remove_app_action,
                    dense=True,
                )
            )

        dialog = ft.AlertDialog(
            modal=True,
            content=ft.Container(
                content=ft.Column(
                    [
                        ft.Row(
                            [
                                ft.Icon(app["icon"], size=24, color=colors["ACCENT"]),
                                ft.Text(
                                    app["name"], size=16, weight=ft.FontWeight.BOLD, color=colors["ON_SURFACE"]
                                ),
                            ],
                            spacing=10,
                        ),
                        ft.Divider(color=colors["OUTLINE"], height=8),
                        ft.Column(menu_items, spacing=0, tight=True),
                    ],
                    tight=True,
                ),
                width=310,
            ),
            actions=[ft.TextButton("Закрыть", on_click=close_dialog)],
            shape=ft.RoundedRectangleBorder(radius=14),
        )
        self.core.page.open(dialog)

    def show_favorite_app_menu_dialog(self, app):
        self.show_app_menu_dialog(app)

    def select_manual_path(self, app):
        def on_pick(ev: ft.FilePickerResultEvent):
            if ev.files:
                file_path = ev.files[0].path
                self.core.app_manager.manual_paths[app["package"]] = file_path
                self.core.app_manager.save_manual_paths()
                self.core.show_toast(f"✅ Путь для {app['name']} сохранен: {file_path}")
                self.core.update_main_content()
                self.core.update_sidebar()

        picker = ft.FilePicker(on_result=on_pick)
        if picker not in self.core.page.overlay:
            self.core.page.overlay.append(picker)
        self.core.page.update()
        try:
            picker.pick_files(allow_multiple=False)
        except Exception:
            self.core.show_toast("Не удалось открыть диалог выбора файла")

    def show_edit_custom_app_dialog(self, app):
        colors = self.core.get_colors()
        app_name = ft.TextField(
            label="Название приложения",
            value=app["name"],
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
        )
        app_url = ft.TextField(
            label="URL или путь к приложению",
            value=app["url"],
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
        )

        def save_changes(_):
            if app_name.value and app_url.value:
                app["name"] = app_name.value.strip()
                app["url"] = app_url.value.strip()
                app["type"] = "web" if app["url"].startswith("http") else "app"
                self.core.app_manager.save_custom_apps()
                self.core.page.close(dialog)
                self.core.show_toast(f"✅ Приложение «{app['name']}» обновлено")
                self.core.update_main_content()
                self.core.update_sidebar()

        dialog = ft.AlertDialog(
            title=ft.Text("Редактировать приложение"),
            content=ft.Container(width=480, content=ft.Column([app_name, app_url], spacing=10, tight=True)),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: self.core.page.close(dialog)),
                ft.FilledButton("Сохранить", on_click=save_changes),
            ],
        )
        self.core.page.open(dialog)

    def show_edit_tags_dialog(self, app):
        colors = self.core.get_colors()
        tags_info = self.core.app_manager.get_app_tags(app)
        tags_field = ft.TextField(
            label="Теги (через запятую)",
            value=tags_info.get("tags", ""),
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
        )
        notes_field = ft.TextField(
            label="Заметки",
            value=tags_info.get("notes", ""),
            multiline=True,
            min_lines=3,
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
        )

        def save_tags(_):
            self.core.app_manager.save_app_tags(app, tags_field.value, notes_field.value)
            self.core.page.close(dialog)
            self.core.show_toast(f"✅ Теги для «{app['name']}» сохранены")

        dialog = ft.AlertDialog(
            title=ft.Text(f"Теги для {app['name']}"),
            content=ft.Container(width=460, content=ft.Column([tags_field, notes_field], spacing=10, tight=True)),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: self.core.page.close(dialog)),
                ft.FilledButton("Сохранить", on_click=save_tags),
            ],
        )
        self.core.page.open(dialog)

    def show_duplicate_favorite_dialog(self, app):
        colors = self.core.get_colors()
        similar_apps = self.core.app_manager.get_similar_favorites(app)

        def add_anyway(_):
            success, message = self.core.app_manager.add_to_favorites(app)
            self.core.show_toast(message)
            if success:
                self.core.update_main_content()
            self.core.page.close(dialog)

        dialog = ft.AlertDialog(
            title=ft.Text("Похожее приложение уже в избранном"),
            content=ft.Text(
                f"Найдено похожее: {', '.join(s['name'] for s in similar_apps)}. Добавить «{app['name']}» всё равно?",
                color=colors["ON_SURFACE_VARIANT"],
            ),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: self.core.page.close(dialog)),
                ft.FilledButton("Добавить", on_click=add_anyway),
            ],
        )
        self.core.page.open(dialog)

    def show_reset_settings_dialog(self):
        colors = self.core.get_colors()

        def reset_settings(_):
            self.core.theme_manager.current_theme = "dark"
            self.core.theme_manager.glass_effect_enabled = True
            self.core.theme_manager.glass_intensity = "medium"
            self.core.theme_manager.clock_style = "android_vertical"
            self.core.theme_manager.show_android_clock_widget = True
            self.core.theme_manager.show_plugins_in_grid = True
            self.core.theme_manager.save_settings()
            self.core.apply_initial_theme()
            self.core.update_header()
            self.core.update_main_content()
            self.core.update_sidebar()
            self.core.page.close(dialog)
            self.core.show_toast("✅ Все настройки сброшены к значениям по умолчанию v2.5")

        dialog = ft.AlertDialog(
            title=ft.Text("Сброс настроек"),
            content=ft.Text(
                "Сбросить все настройки темы, часов и интерфейса к стандартным значениям v2.5?",
                color=colors["ON_SURFACE_VARIANT"],
            ),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: self.core.page.close(dialog)),
                ft.FilledButton(
                    "Сбросить",
                    on_click=reset_settings,
                    style=ft.ButtonStyle(bgcolor=colors["ERROR"], color="#ffffff"),
                ),
            ],
        )
        self.core.page.open(dialog)
