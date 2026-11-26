# [file name]: ui_panels.py
import flet as ft
from datetime import datetime
from .glass_morphism import GlassMorphism


class UIPanels:
    WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

    def _with_opacity(self, hex_color: str, percent: int) -> str:
        """Возвращает цвет в формате Flet #AARRGGBB."""
        return GlassMorphism._apply_opacity(hex_color, max(0.0, min(1.0, percent / 100.0)))

    def __init__(self, ui_core):
        self.core = ui_core
        self.current_time_text = None
        self.current_date_text = None
        self.clock_container = None
        self.android_clock_hours = None
        self.android_clock_minutes = None
        self.android_clock_date = None
        self.devices_container = None
        self.volume_slider_container = None
        self.audio_button = None
        self.search_field = None
        self.apps_list = None
        self.animated_switcher = None

    def create_header(self):
        colors = self.core.get_colors()
        self.create_time_elements()

        tm = self.core.theme_manager
        clock_frame_enabled = getattr(tm, "clock_glass_frame", True)
        clock_style = getattr(tm, "clock_style", "android_vertical")
        clock_accent = getattr(tm, "clock_accent_color", colors["ACCENT"])
        clock_radius = int(getattr(tm, "clock_border_radius", 16))
        clock_opacity = int(getattr(tm, "clock_bg_opacity", 75)) / 100.0
        clock_glow = getattr(tm, "clock_glow_enabled", True)
        clock_glow_intensity = int(getattr(tm, "clock_glow_intensity", 14))

        if clock_style == "pill_glass":
            time_inner = ft.Row(
                [
                    ft.Icon("schedule", size=16, color=clock_accent),
                    self.current_time_text,
                    ft.Text("•", size=12, color=colors["ON_SURFACE_VARIANT"]),
                    self.current_date_text,
                ],
                spacing=6,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
                tight=True,
            )
        elif clock_style in (
            "android_vertical",
            "stacked",
            "samsung_oneui",
            "vertical_neon_bar",
            "material_expressive",
        ):
            time_inner = ft.Row(
                [
                    self.current_time_text,
                    ft.Container(
                        width=3 if clock_style == "vertical_neon_bar" else 2,
                        height=30,
                        bgcolor=clock_accent,
                        border_radius=2,
                        shadow=ft.BoxShadow(
                            blur_radius=clock_glow_intensity,
                            color=GlassMorphism._apply_opacity(clock_accent, 0.45),
                        )
                        if clock_glow
                        else None,
                    ),
                    self.current_date_text,
                ],
                spacing=8,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
                tight=True,
            )
        elif clock_style in ("ios_standby", "macos_sonoma", "analog_hybrid"):
            time_inner = ft.Row(
                [
                    ft.Icon(
                        "watch_later" if clock_style == "analog_hybrid" else "access_time_filled",
                        size=16,
                        color=clock_accent,
                    ),
                    ft.Column(
                        [self.current_time_text, self.current_date_text],
                        spacing=0,
                        horizontal_alignment=ft.CrossAxisAlignment.START,
                        tight=True,
                    ),
                ],
                spacing=8,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
                tight=True,
            )
        else:
            time_inner = ft.Column(
                [self.current_time_text, self.current_date_text],
                spacing=1,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                tight=True,
            )

        self.clock_container = ft.Container(
            content=time_inner,
            padding=ft.padding.symmetric(horizontal=14, vertical=6),
            alignment=ft.alignment.center,
            bgcolor=GlassMorphism._apply_opacity(colors["SURFACE_VARIANT"], clock_opacity)
            if clock_frame_enabled
            else "transparent",
            border=ft.border.all(
                1.2 if clock_glow else 1.0,
                GlassMorphism._apply_opacity(clock_accent if clock_glow else colors["ON_SURFACE"], 0.35 if clock_glow else 0.12),
            )
            if clock_frame_enabled
            else None,
            border_radius=clock_radius,
            shadow=ft.BoxShadow(
                blur_radius=clock_glow_intensity,
                color=GlassMorphism._apply_opacity(clock_accent, 0.25),
                offset=ft.Offset(0, 2),
            )
            if (clock_frame_enabled and clock_glow)
            else None,
            on_click=self.core.show_settings,
            tooltip="Нажмите для настройки 18 стилей часов и дизайна циферблата (v2.5)",
        )

        # Навигационный переключатель разделов (v2.5)
        active_sec = getattr(self.core, "active_section", "apps")
        section_switcher = ft.Container(
            bgcolor=GlassMorphism._apply_opacity(colors["SURFACE_VARIANT"], 0.65),
            border=ft.border.all(1, GlassMorphism._apply_opacity(colors["ON_SURFACE"], 0.08)),
            border_radius=12,
            padding=3,
            content=ft.Row(
                [
                    ft.Container(
                        content=ft.Row(
                            [
                                ft.Icon(
                                    "grid_view",
                                    size=15,
                                    color="#ffffff" if active_sec == "apps" else colors["ON_SURFACE_VARIANT"],
                                ),
                                ft.Text(
                                    "Приложения",
                                    size=12,
                                    weight=ft.FontWeight.W_600 if active_sec == "apps" else ft.FontWeight.NORMAL,
                                    color="#ffffff" if active_sec == "apps" else colors["ON_SURFACE_VARIANT"],
                                ),
                            ],
                            spacing=5,
                        ),
                        bgcolor=colors["ACCENT"] if active_sec == "apps" else "transparent",
                        border_radius=9,
                        padding=ft.padding.symmetric(horizontal=12, vertical=6),
                        on_click=lambda e: self.core.switch_section("apps"),
                    ),
                    ft.Container(
                        content=ft.Row(
                            [
                                ft.Icon(
                                    "insights",
                                    size=15,
                                    color="#ffffff" if active_sec == "tracker" else colors["ON_SURFACE_VARIANT"],
                                ),
                                ft.Text(
                                    "Трекер времени",
                                    size=12,
                                    weight=ft.FontWeight.W_600 if active_sec == "tracker" else ft.FontWeight.NORMAL,
                                    color="#ffffff" if active_sec == "tracker" else colors["ON_SURFACE_VARIANT"],
                                ),
                            ],
                            spacing=5,
                        ),
                        bgcolor=colors["ACCENT"] if active_sec == "tracker" else "transparent",
                        border_radius=9,
                        padding=ft.padding.symmetric(horizontal=12, vertical=6),
                        on_click=lambda e: self.core.switch_section("tracker"),
                    ),
                ],
                spacing=4,
                tight=True,
            ),
        )

        self.devices_container = ft.Container(
            content=self.core.system_monitor.create_devices_header(colors),
            padding=8,
            alignment=ft.alignment.center,
        )

        plugins_button = ft.IconButton(
            icon="extension",
            icon_color=colors["ON_SURFACE"],
            on_click=self.core.show_plugins_manager,
            tooltip="Платформа плагинов и магазин расширений (API 2.5)",
        )

        current_vol = self.core.audio_controller.get_volume_level()
        self.audio_button = ft.IconButton(
            icon="volume_off" if current_vol == 0 else ("volume_down" if current_vol < 50 else "volume_up"),
            icon_color=colors["ON_SURFACE"],
            on_click=self.core.toggle_volume_slider,
            tooltip="Системная громкость (фоновый контроллер)",
        )

        vol_value_label = ft.Text(f"{current_vol}%", size=11, color=colors["ON_SURFACE"], width=34)

        def _handle_vol_slider(ev):
            v = int(ev.control.value)
            vol_value_label.value = f"{v}%"
            if self.audio_button:
                self.audio_button.icon = "volume_off" if v == 0 else ("volume_down" if v < 50 else "volume_up")
                self.audio_button.update()
            vol_value_label.update()
            self.core.on_volume_change(ev)

        def _handle_mute_click(ev):
            if hasattr(self.core.audio_controller, "toggle_mute"):
                muted = self.core.audio_controller.toggle_mute()
                if self.audio_button:
                    self.audio_button.icon = "volume_off" if muted else "volume_up"
                    self.audio_button.icon_color = colors["ERROR"] if muted else colors["ON_SURFACE"]
                    self.audio_button.update()

        self.volume_slider_container = ft.Container(
            content=ft.Row(
                [
                    ft.IconButton(
                        icon="volume_mute",
                        icon_size=16,
                        icon_color=colors["ON_SURFACE_VARIANT"],
                        tooltip="Выключить/включить звук",
                        on_click=_handle_mute_click,
                    ),
                    ft.Container(
                        content=ft.Slider(
                            value=current_vol,
                            min=0,
                            max=100,
                            divisions=100,
                            label="{value}%",
                            on_change=_handle_vol_slider,
                            active_color=colors["ACCENT"],
                            inactive_color=colors["SURFACE_VARIANT"],
                            width=130,
                        ),
                        padding=ft.padding.symmetric(horizontal=2),
                    ),
                    vol_value_label,
                ],
                spacing=2,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            bgcolor=GlassMorphism._apply_opacity(colors["SURFACE_VARIANT"], 0.85),
            blur=GlassMorphism._make_blur(14),
            border=ft.border.all(1, GlassMorphism._apply_opacity(colors["ON_SURFACE"], 0.12)),
            border_radius=12,
            padding=ft.padding.symmetric(horizontal=8, vertical=2),
            visible=self.core.volume_slider_visible,
            animate_opacity=250,
        )

        workspace_button = ft.IconButton(
            icon="rocket_launch",
            icon_color=colors["ACCENT"],
            tooltip="Smart Workspace",
            on_click=self.core.dialogs.show_workspace_manager,
        )

        hud_button = ft.IconButton(
            icon="monitor_heart",
            icon_color=colors["ACCENT"] if self.core.floating_hud_visible else colors["ON_SURFACE"],
            tooltip="Floating HUD",
            on_click=lambda e: self.core.toggle_floating_hud(),
        )

        # Всегда активный Dynamic Island 2.6 в центре верхней панели
        island_capsule = (
            self.core.dynamic_island.create_header_capsule(colors)
            if hasattr(self.core, "dynamic_island") and self.core.dynamic_island
            else ft.Container()
        )

        header_content = [
            ft.Row(
                [
                    workspace_button,
                    ft.Text("Launcher Hab 2.6", size=20, weight=ft.FontWeight.BOLD, color=colors["ON_SURFACE"]),
                    ft.Container(width=6),
                    section_switcher,
                ],
                spacing=6,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            ft.Container(expand=True, alignment=ft.alignment.center, content=island_capsule),
            self.devices_container,
            self.clock_container,
            plugins_button,
            ft.Row([self.audio_button, self.volume_slider_container], spacing=4),
            hud_button,
            ft.IconButton(
                icon="settings",
                icon_color=colors["ON_SURFACE"],
                on_click=self.core.show_settings,
                tooltip="Настройки Android UI (v2.6)",
            ),
        ]

        return ft.Container(
            content=ft.Row(header_content, vertical_alignment=ft.CrossAxisAlignment.CENTER),
            bgcolor=GlassMorphism._apply_opacity(colors["SURFACE"], 0.88)
            if self.core.theme_manager.glass_effect_enabled
            else colors["SURFACE"],
            blur=GlassMorphism._make_blur(18) if self.core.theme_manager.glass_effect_enabled else None,
            border=ft.border.only(bottom=ft.BorderSide(1, colors["OUTLINE"])),
            padding=ft.padding.symmetric(horizontal=16, vertical=10),
            margin=0,
        )

    def create_time_elements(self):
        colors = self.core.get_colors()
        tm = self.core.theme_manager
        clock_style = getattr(tm, "clock_style", "android_vertical")
        base_size = getattr(tm, "time_font_size", 20)
        clock_bold = getattr(tm, "clock_bold", True)

        if clock_style in (
            "android_vertical",
            "stacked",
            "samsung_oneui",
            "vertical_neon_bar",
            "material_expressive",
        ):
            font_size = max(17, min(26, base_size))
        elif clock_style == "pill_glass":
            font_size = max(14, base_size - 2)
        else:
            font_size = base_size

        mono_styles = ("cyber_mono", "split_flip", "nothing_dot", "retro_casio", "futuristic_hud")

        self.current_time_text = ft.Text(
            "",
            size=font_size,
            font_family="Consolas"
            if clock_style in mono_styles
            else getattr(tm, "time_font_family", tm.font_family),
            text_align=ft.TextAlign.CENTER,
            weight=ft.FontWeight.W_900 if clock_bold else ft.FontWeight.W_500,
            color=getattr(tm, "time_color", colors["ON_SURFACE"]),
        )
        self.current_date_text = ft.Text(
            "",
            size=getattr(tm, "date_font_size", 11),
            font_family=getattr(tm, "date_font_family", tm.font_family),
            text_align=ft.TextAlign.CENTER,
            color=getattr(tm, "date_color", colors["ON_SURFACE_VARIANT"]),
            visible=getattr(tm, "show_date", True),
        )

    def create_android_vertical_clock_banner(self):
        """
        Крупный виджет часов (Android 14 / 18 стилей) + быстрый переключатель стилей часов v2.5.
        """
        colors = self.core.get_colors()
        tm = self.core.theme_manager
        now = datetime.now()
        is_12h = getattr(tm, "time_format", "24") == "12"
        hours_str = now.strftime("%I" if is_12h else "%H")
        mins_str = now.strftime("%M")
        weekday_ru = self.WEEKDAYS_RU[now.weekday()]
        date_str = f"{weekday_ru}, {now.strftime('%d.%m.%Y')}"

        clock_accent = getattr(tm, "clock_accent_color", colors["ACCENT"])
        clock_glow = getattr(tm, "clock_glow_enabled", True)
        clock_glow_intensity = int(getattr(tm, "clock_glow_intensity", 14))
        clock_radius = int(getattr(tm, "clock_border_radius", 16))
        clock_opacity = int(getattr(tm, "clock_bg_opacity", 75)) / 100.0
        clock_bold = getattr(tm, "clock_bold", True)

        self.android_clock_hours = ft.Text(
            hours_str,
            size=44,
            weight=ft.FontWeight.W_900 if clock_bold else ft.FontWeight.W_600,
            color=getattr(tm, "time_color", colors["ON_SURFACE"]),
            height=48,
        )
        self.android_clock_minutes = ft.Text(
            mins_str,
            size=44,
            weight=ft.FontWeight.W_900 if clock_bold else ft.FontWeight.W_600,
            color=clock_accent,
            height=48,
        )
        self.android_clock_date = ft.Text(
            date_str,
            size=13,
            weight=ft.FontWeight.W_500,
            color=getattr(tm, "date_color", colors["ON_SURFACE_VARIANT"]),
        )

        current_style = getattr(tm, "clock_style", "android_vertical")
        style_name = tm.CLOCK_STYLES.get(current_style, current_style)

        def _cycle_clock_style(_):
            keys = list(tm.CLOCK_STYLES.keys())
            idx = keys.index(current_style) if current_style in keys else 0
            next_style = keys[(idx + 1) % len(keys)]
            tm.set_clock_preferences(style=next_style)
            if hasattr(self.core.plugin_manager, "notify_clock_style_changed"):
                self.core.plugin_manager.notify_clock_style_changed(next_style)
            self.core.update_header()
            self.core.update_main_content()
            self.core.update_time()
            self.core.show_toast(f"🕒 Стиль часов: {tm.CLOCK_STYLES.get(next_style, next_style)}")

        banner_content = ft.Row(
            [
                ft.Container(
                    content=ft.Column(
                        [
                            self.android_clock_hours,
                            self.android_clock_minutes,
                        ],
                        spacing=0,
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                        tight=True,
                    ),
                    padding=ft.padding.symmetric(horizontal=20, vertical=8),
                    bgcolor=GlassMorphism._apply_opacity(colors["SURFACE_VARIANT"], clock_opacity),
                    border=ft.border.all(
                        1.5 if clock_glow else 1,
                        GlassMorphism._apply_opacity(clock_accent, 0.45 if clock_glow else 0.25),
                    ),
                    border_radius=clock_radius,
                    shadow=ft.BoxShadow(
                        blur_radius=clock_glow_intensity,
                        color=GlassMorphism._apply_opacity(clock_accent, 0.30),
                        offset=ft.Offset(0, 3),
                    )
                    if clock_glow
                    else None,
                ),
                ft.Column(
                    [
                        ft.Row(
                            [
                                ft.Icon("schedule", size=16, color=clock_accent),
                                ft.Text(
                                    f"Стиль часов: {style_name}",
                                    size=14,
                                    weight=ft.FontWeight.BOLD,
                                    color=colors["ON_SURFACE"],
                                ),
                                ft.Container(
                                    content=ft.Text(
                                        "🟢 АКТИВНО",
                                        size=10,
                                        weight=ft.FontWeight.BOLD,
                                        color=colors["SUCCESS"],
                                    ),
                                    bgcolor=GlassMorphism._apply_opacity(colors["SUCCESS"], 0.16),
                                    border=ft.border.all(1, GlassMorphism._apply_opacity(colors["SUCCESS"], 0.45)),
                                    border_radius=999,
                                    padding=ft.padding.symmetric(horizontal=8, vertical=2),
                                ),
                            ],
                            spacing=6,
                        ),
                        self.android_clock_date,
                        ft.Row(
                            [
                                ft.TextButton(
                                    "Следующий стиль (из 18)",
                                    icon="style",
                                    on_click=_cycle_clock_style,
                                ),
                                ft.TextButton(
                                    "Дизайн и настройки часов",
                                    icon="tune",
                                    on_click=self.core.show_settings,
                                ),
                            ],
                            spacing=4,
                        ),
                    ],
                    spacing=4,
                    expand=True,
                ),
            ],
            spacing=18,
            vertical_alignment=ft.CrossAxisAlignment.CENTER,
        )

        return GlassMorphism.create_card(
            banner_content,
            colors,
            hover_effect=getattr(tm, "card_hover_glow", True),
            intensity=tm.glass_intensity,
            border_radius=getattr(tm, "card_border_radius", 20),
        )

    def create_sidebar(self):
        colors = self.core.get_colors()
        return ft.Container(
            content=self.create_sidebar_content(),
            width=340,
            bgcolor=GlassMorphism._apply_opacity(colors["SURFACE"], 0.82)
            if self.core.theme_manager.glass_effect_enabled
            else colors["SURFACE"],
            blur=GlassMorphism._make_blur(18) if self.core.theme_manager.glass_effect_enabled else None,
            padding=0,
            margin=0,
        )

    def create_sidebar_content(self):
        colors = self.core.get_colors()

        self.search_field = ft.TextField(
            hint_text="Поиск приложений и плагинов...",
            prefix_icon="search",
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_radius=12,
            on_change=self.core.filter_apps,
            content_padding=14,
            expand=True,
            border_color=colors["OUTLINE"],
        )

        filter_button = self.create_filter_button()
        self.apps_list = self.create_apps_list()

        return ft.Column(
            [
                ft.Container(
                    content=ft.Row(
                        [
                            ft.Icon("apps", color=colors["ACCENT"], size=20),
                            ft.Text("Библиотека", size=17, weight=ft.FontWeight.BOLD, color=colors["ON_SURFACE"], expand=True),
                            ft.Text(f"{self.core.get_apps_count()} элем.", size=12, color=colors["ON_SURFACE_VARIANT"]),
                        ]
                    ),
                    padding=ft.padding.only(left=20, right=20, top=16, bottom=6),
                ),
                ft.Container(
                    content=ft.Row([self.search_field, filter_button], spacing=10),
                    padding=ft.padding.symmetric(horizontal=15, vertical=8),
                ),
                ft.Divider(color=colors["OUTLINE"], height=1),
                ft.Container(content=self.apps_list, expand=True),
                ft.Divider(color=colors["OUTLINE"], height=1),
                ft.Container(
                    content=self.create_add_app_button(),
                    padding=ft.padding.symmetric(horizontal=15, vertical=10),
                ),
            ]
        )

    def create_apps_list(self):
        apps_list = ft.ListView(expand=True, spacing=6, padding=10)

        all_apps = self.core.get_all_launchable_items()
        filtered_apps = self.filter_apps_by_type(all_apps)

        for app in filtered_apps:
            apps_list.controls.append(self.create_app_list_item(app))

        return apps_list

    def create_app_list_item(self, app):
        colors = self.core.get_colors()
        tm = self.core.theme_manager
        is_plugin = app.get("type") == "plugin"
        is_installed = True if is_plugin else self.core.app_manager.is_app_installed(app)
        is_running = (
            self.core.plugin_manager.is_app_running(app)
            if hasattr(self.core.plugin_manager, "is_app_running")
            else False
        )
        badge_text = (
            self.core.plugin_manager.get_app_card_badge(app)
            if hasattr(self.core.plugin_manager, "get_app_card_badge")
            else "0 мин"
        )
        active_clr = getattr(tm, "active_app_color", colors["SUCCESS"])

        if is_running:
            bg_color = GlassMorphism._apply_opacity(active_clr, 0.18)
            border_color = GlassMorphism._apply_opacity(active_clr, 0.55)
        elif is_plugin:
            bg_color = GlassMorphism._apply_opacity("#8b5cf6", 0.12)
            border_color = GlassMorphism._apply_opacity("#a78bfa", 0.25)
        else:
            bg_color = GlassMorphism._apply_opacity(colors["SURFACE_VARIANT"], 0.55)
            border_color = GlassMorphism._apply_opacity(colors["ON_SURFACE"], 0.07)

        subtitle_str = f"{app['category']} • {badge_text}"

        title_row_controls = [
            ft.Text(
                app["name"],
                color=colors["ON_SURFACE"] if is_installed else colors["ERROR"],
                size=13,
                weight=ft.FontWeight.W_600,
                max_lines=1,
                overflow=ft.TextOverflow.ELLIPSIS,
            )
        ]
        if is_running:
            title_row_controls.append(
                ft.Text("• Активно", color=active_clr, size=11, weight=ft.FontWeight.W_600)
            )
        elif is_plugin:
            title_row_controls.append(
                ft.Text("• Плагин", color="#a78bfa", size=11, weight=ft.FontWeight.W_500)
            )

        app_item = ft.Container(
            content=ft.Row(
                [
                    ft.Container(
                        content=ft.Icon(
                            app["icon"],
                            color="#a78bfa"
                            if is_plugin
                            else (
                                colors["WEB_BLUE"]
                                if app["type"] == "web"
                                else (colors["ON_SURFACE"] if is_installed else colors["ERROR"])
                            ),
                            size=24,
                        ),
                        width=44,
                        height=44,
                        alignment=ft.alignment.center,
                        bgcolor=GlassMorphism._apply_opacity(colors["SURFACE"], 0.75),
                        border=ft.border.all(1, GlassMorphism._apply_opacity(colors["ON_SURFACE"], 0.08)),
                        border_radius=12,
                    ),
                    ft.Column(
                        [
                            ft.Row(title_row_controls, spacing=6),
                            ft.Text(
                                subtitle_str,
                                color=active_clr
                                if is_running
                                else (colors["ON_SURFACE_VARIANT"] if is_installed else colors["ERROR"]),
                                size=11,
                                max_lines=1,
                                overflow=ft.TextOverflow.ELLIPSIS,
                            ),
                        ],
                        expand=True,
                        spacing=2,
                    ),
                    ft.IconButton(
                        icon="tune" if is_plugin else "more_vert",
                        icon_size=18,
                        icon_color=colors["ON_SURFACE_VARIANT"],
                        on_click=lambda e, app=app: (
                            self.core.plugin_manager.show_plugin_settings_modal(app["package"])
                            if is_plugin
                            else self.core.show_app_menu_dialog(app)
                        ),
                        tooltip="Настройки плагина" if is_plugin else "Меню приложения",
                        style=ft.ButtonStyle(padding=ft.padding.all(6), bgcolor="transparent"),
                    ),
                ],
                spacing=10,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            padding=ft.padding.symmetric(horizontal=12, vertical=10),
            border_radius=14,
            border=ft.border.all(1, border_color),
            on_click=lambda e, app=app: self.core.launch_app(app),
            tooltip=f"Запустить {app['name']}",
            bgcolor=bg_color,
            animate=ft.Animation(180, ft.AnimationCurve.EASE_OUT),
        )

        def on_hover(e):
            if e.data == "true":
                app_item.bgcolor = GlassMorphism._apply_opacity(colors["ACCENT"], 0.20)
                app_item.border = ft.border.all(1, GlassMorphism._apply_opacity(colors["ACCENT"], 0.45))
            else:
                app_item.bgcolor = bg_color
                app_item.border = ft.border.all(1, border_color)
            app_item.update()

        app_item.on_hover = on_hover
        return app_item

    def create_add_app_button(self):
        colors = self.core.get_colors()
        bg_color = GlassMorphism._apply_opacity(colors["ACCENT"], 0.14)

        add_button = ft.Container(
            content=ft.Row(
                [
                    ft.Container(
                        content=ft.Icon("add", color=colors["ACCENT"], size=24),
                        width=44,
                        height=44,
                        alignment=ft.alignment.center,
                        bgcolor=GlassMorphism._apply_opacity(colors["ACCENT"], 0.22),
                        border_radius=12,
                    ),
                    ft.Column(
                        [
                            ft.Text("Добавить приложение", color=colors["ON_SURFACE"], size=13, weight=ft.FontWeight.W_600),
                            ft.Text("EXE, URI или веб-сервис + трекер", color=colors["ON_SURFACE_VARIANT"], size=11),
                        ],
                        expand=True,
                        spacing=2,
                    ),
                ],
                spacing=12,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            padding=ft.padding.symmetric(horizontal=14, vertical=10),
            border_radius=14,
            border=ft.border.all(1, GlassMorphism._apply_opacity(colors["ACCENT"], 0.35)),
            on_click=self.core.show_add_custom_app_dialog,
            tooltip="Добавить новое приложение",
            bgcolor=bg_color,
            animate=ft.Animation(200, ft.AnimationCurve.EASE_OUT),
        )

        def on_hover(e):
            if e.data == "true":
                add_button.bgcolor = GlassMorphism._apply_opacity(colors["ACCENT"], 0.24)
            else:
                add_button.bgcolor = bg_color
            add_button.update()

        add_button.on_hover = on_hover
        return add_button

    def create_filter_button(self):
        colors = self.core.get_colors()
        return ft.Container(
            content=ft.Icon("filter_list", color=colors["ON_SURFACE"], size=20),
            width=44,
            height=44,
            alignment=ft.alignment.center,
            bgcolor=colors["SURFACE_VARIANT"],
            border=ft.border.all(1, colors["OUTLINE"]),
            border_radius=12,
            on_click=self.core.show_filter_menu,
            tooltip="Фильтровать по типу (Приложения / Плагины / Веб)",
        )

    def create_main_content(self):
        """
        Оборачивает основной контент в ft.AnimatedSwitcher + GestureDetector (ПКМ = Назад для управления одной рукой).
        """
        inner = self.create_main_content_internal()
        self.animated_switcher = ft.AnimatedSwitcher(
            content=inner,
            transition=ft.AnimatedSwitcherTransition.FADE,
            duration=280,
            reverse_duration=200,
            switch_in_curve=ft.AnimationCurve.EASE_OUT_CUBIC,
            switch_out_curve=ft.AnimationCurve.EASE_IN_CUBIC,
        )
        gesture_wrapper = ft.GestureDetector(
            content=self.animated_switcher,
            on_secondary_tap_up=lambda e: self.core.handle_right_click_back(e),
        )
        return ft.Container(
            content=gesture_wrapper,
            expand=True,
            padding=12,
            margin=0,
        )

    def create_main_content_internal(self):
        colors = self.core.get_colors()
        tm = self.core.theme_manager
        card_radius = getattr(tm, "card_border_radius", 20)
        hover_glow = getattr(tm, "card_hover_glow", True)

        # Вкладка «Трекер времени»
        if getattr(self.core, "active_section", "apps") == "tracker":
            tracker_ui = None
            if hasattr(self.core.plugin_manager, "get_plugin_ui"):
                tracker_ui = self.core.plugin_manager.get_plugin_ui("session_tracker_plugin")
            if not tracker_ui:
                from plugins.session_tracker_plugin import GameAppSessionTrackerPlugin

                temp_plugin = GameAppSessionTrackerPlugin()
                temp_plugin.set_context(self.core)
                tracker_ui = temp_plugin.get_ui_component()

            tracker_card = GlassMorphism.create_card(
                tracker_ui,
                colors,
                hover_effect=hover_glow,
                intensity=tm.glass_intensity,
                custom_opacity=tm.advanced_glass_opacity if tm.advanced_glass_enabled else None,
                border_radius=card_radius,
            )
            return ft.Container(
                key="section_tracker",
                content=ft.Column([tracker_card], scroll=ft.ScrollMode.ADAPTIVE),
                expand=True,
            )

        main_content_list = []

        if getattr(tm, "show_android_clock_widget", True):
            main_content_list.append(self.create_android_vertical_clock_banner())

        favorites_content = self.create_favorites_panel()
        category_sections = self.create_category_sections()

        main_content_list.append(favorites_content)

        if category_sections:
            main_content_list.extend(category_sections)
        elif self.core.current_filter != "all":
            no_apps_content = ft.Column(
                [
                    ft.Icon("search_off", size=64, color=colors["ON_SURFACE_VARIANT"]),
                    ft.Text(
                        "Нет элементов по выбранному фильтру",
                        size=18,
                        color=colors["ON_SURFACE_VARIANT"],
                        weight=ft.FontWeight.W_500,
                    ),
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=15,
            )
            no_apps_card = GlassMorphism.create_card(
                no_apps_content,
                colors,
                hover_effect=hover_glow,
                intensity=tm.glass_intensity,
                border_radius=card_radius,
            )
            main_content_list.append(no_apps_card)

        main_column = ft.Column(main_content_list, scroll=ft.ScrollMode.ADAPTIVE)

        if self.core.floating_hud_visible:
            perf = self.core.system_monitor.get_performance_info()
            self.core.floating_hud_cpu_text = ft.Text(f"CPU {perf['cpu']}%", size=11, color=colors["ON_SURFACE"])
            self.core.floating_hud_ram_text = ft.Text(f"RAM {perf['ram']}%", size=11, color=colors["ON_SURFACE"])
            self.core.floating_hud_apps_text = ft.Text(
                f"Избранных: {len(self.core.app_manager.favorite_apps)}", size=11, color=colors["ON_SURFACE"]
            )
            hud = ft.Container(
                content=ft.Column(
                    [
                        ft.Text("Floating HUD 2.5", weight=ft.FontWeight.BOLD, size=12, color=colors["ACCENT"]),
                        self.core.floating_hud_cpu_text,
                        self.core.floating_hud_ram_text,
                        self.core.floating_hud_apps_text,
                    ],
                    spacing=2,
                ),
                right=14,
                top=14,
                padding=12,
                bgcolor=GlassMorphism._apply_opacity(colors["SURFACE"], 0.85),
                blur=GlassMorphism._make_blur(18),
                border_radius=14,
                border=ft.border.all(1, GlassMorphism._apply_opacity(colors["ON_SURFACE"], 0.14)),
            )
            return ft.Container(
                key=f"section_apps_{self.core.current_filter}_hud",
                content=ft.Stack([main_column, hud]),
                expand=True,
            )

        self.core.floating_hud_cpu_text = None
        self.core.floating_hud_ram_text = None
        self.core.floating_hud_apps_text = None
        return ft.Container(key=f"section_apps_{self.core.current_filter}", content=main_column, expand=True)

    def create_favorites_panel(self):
        colors = self.core.get_colors()
        tm = self.core.theme_manager
        favorite_apps = self.core.app_manager.favorite_apps
        runs_cnt = getattr(tm, "card_columns", 6)
        card_radius = getattr(tm, "card_border_radius", 20)
        hover_glow = getattr(tm, "card_hover_glow", True)
        active_clr = getattr(tm, "active_app_color", colors["SUCCESS"])
        icon_scale = getattr(tm, "icon_scale_pct", 100)

        header_row = ft.Container(
            content=ft.Row(
                [
                    ft.Icon("star", color="#f59e0b", size=20),
                    ft.Text("Избранное", size=18, weight=ft.FontWeight.BOLD, color=colors["ON_SURFACE"]),
                    ft.Text(f"{len(favorite_apps)}/10", size=12, color=colors["ON_SURFACE_VARIANT"]),
                    ft.Container(expand=True),
                    ft.Text(
                        "Клик — запуск и учет сессии • ПКМ / меню — управление",
                        size=11,
                        color=colors["ON_SURFACE_VARIANT"],
                    ),
                ],
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            padding=ft.padding.symmetric(horizontal=15, vertical=6),
        )

        if not favorite_apps:
            empty_content = ft.Column(
                [
                    header_row,
                    ft.Container(
                        content=ft.Column(
                            [
                                ft.Icon("star_border", size=32, color=colors["ON_SURFACE_VARIANT"]),
                                ft.Text(
                                    "Добавьте приложения в избранное через меню (⋮)",
                                    size=12,
                                    color=colors["ON_SURFACE_VARIANT"],
                                    text_align=ft.TextAlign.CENTER,
                                ),
                            ],
                            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                            spacing=8,
                        ),
                        padding=15,
                        alignment=ft.alignment.center,
                    ),
                ]
            )
            return GlassMorphism.create_card(
                empty_content,
                colors,
                hover_effect=hover_glow,
                intensity=tm.glass_intensity,
                border_radius=card_radius,
            )

        favorites_grid = ft.GridView(
            runs_count=runs_cnt,
            max_extent=130,
            child_aspect_ratio=0.84,
            spacing=15,
            run_spacing=20,
            padding=16,
        )

        for app in favorite_apps:
            is_installed = True if app.get("type") == "plugin" else self.core.app_manager.is_app_installed(app)
            badge = (
                self.core.plugin_manager.get_app_card_badge(app)
                if hasattr(self.core.plugin_manager, "get_app_card_badge")
                else "0 мин"
            )
            running = (
                self.core.plugin_manager.is_app_running(app)
                if hasattr(self.core.plugin_manager, "is_app_running")
                else False
            )

            app_container = GlassMorphism.create_app_button(
                app=app,
                colors=colors,
                is_installed=is_installed,
                is_favorite=True,
                glass_effect=tm.glass_effect_enabled,
                on_click=lambda e, app=app: self.core.launch_app(app),
                on_long_press=lambda e, app=app: self.core.show_favorite_app_menu_dialog(app),
                session_badge_text=badge,
                is_running=running,
                intensity=tm.glass_intensity,
                card_border_radius=card_radius,
                active_app_color=active_clr,
                icon_scale_pct=icon_scale,
            )

            def create_hover_handler(button):
                def on_hover(e):
                    button.scale = 1.05 if e.data == "true" else 1.0
                    button.update()

                return on_hover

            app_container.on_hover = create_hover_handler(app_container)
            favorites_grid.controls.append(app_container)

        favorites_content = ft.Column([header_row, favorites_grid])

        return GlassMorphism.create_card(
            favorites_content,
            colors,
            hover_effect=hover_glow,
            intensity=tm.glass_intensity,
            custom_opacity=tm.advanced_glass_opacity if tm.advanced_glass_enabled else None,
            border_radius=card_radius,
        )

    def create_category_sections(self):
        colors = self.core.get_colors()
        tm = self.core.theme_manager
        all_available_apps = self.core.get_all_launchable_items()
        filtered_apps = self.filter_apps_by_type(all_available_apps)
        runs_cnt = getattr(tm, "card_columns", 6)
        card_radius = getattr(tm, "card_border_radius", 20)
        hover_glow = getattr(tm, "card_hover_glow", True)
        active_clr = getattr(tm, "active_app_color", colors["SUCCESS"])
        icon_scale = getattr(tm, "icon_scale_pct", 100)

        categories = {}
        preferred_order = ["Плагины", "Games", "Browser", "Social", "Media", "Music", "Development", "Office", "System"]
        for cat in preferred_order:
            categories[cat] = []

        for app in filtered_apps:
            cat = app.get("category", "Custom")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(app)

        category_sections = []
        for category, apps in categories.items():
            if not apps:
                continue

            apps_grid = ft.GridView(
                runs_count=runs_cnt,
                max_extent=130,
                child_aspect_ratio=0.84,
                spacing=15,
                run_spacing=20,
                padding=16,
            )

            for app in apps:
                is_plugin = app.get("type") == "plugin"
                is_installed = True if is_plugin else self.core.app_manager.is_app_installed(app)
                badge = (
                    self.core.plugin_manager.get_app_card_badge(app)
                    if hasattr(self.core.plugin_manager, "get_app_card_badge")
                    else "0 мин"
                )
                running = (
                    self.core.plugin_manager.is_app_running(app)
                    if hasattr(self.core.plugin_manager, "is_app_running")
                    else False
                )

                app_button = GlassMorphism.create_app_button(
                    app,
                    colors,
                    is_installed,
                    glass_effect=tm.glass_effect_enabled,
                    on_click=lambda e, app=app: self.core.launch_app(app),
                    on_long_press=lambda e, app=app: (
                        self.core.plugin_manager.show_plugin_settings_modal(app["package"])
                        if is_plugin
                        else self.core.show_app_menu_dialog(app)
                    ),
                    session_badge_text=badge,
                    is_running=running,
                    intensity=tm.glass_intensity,
                    card_border_radius=card_radius,
                    active_app_color=active_clr,
                    icon_scale_pct=icon_scale,
                )

                def create_hover_handler(button):
                    def on_hover(e):
                        button.scale = 1.05 if e.data == "true" else 1.0
                        button.update()

                    return on_hover

                app_button.on_hover = create_hover_handler(app_button)
                apps_grid.controls.append(app_button)

            category_header = ft.Container(
                content=ft.Row(
                    [
                        ft.Container(
                            width=4,
                            height=18,
                            bgcolor="#a78bfa" if category == "Плагины" else colors["ACCENT"],
                            border_radius=2,
                        ),
                        ft.Text(category, size=18, weight=ft.FontWeight.BOLD, color=colors["ON_SURFACE"]),
                        ft.Text("•", size=14, color=colors["ON_SURFACE_VARIANT"]),
                        ft.Text(f"{len(apps)}", size=13, color=colors["ON_SURFACE_VARIANT"], weight=ft.FontWeight.W_500),
                    ],
                    spacing=8,
                    vertical_alignment=ft.CrossAxisAlignment.CENTER,
                ),
                padding=ft.padding.only(left=16, top=8, bottom=4, right=16),
            )

            category_content = ft.Column([category_header, apps_grid])

            category_card = GlassMorphism.create_card(
                category_content,
                colors,
                hover_effect=hover_glow,
                intensity=tm.glass_intensity,
                custom_opacity=tm.advanced_glass_opacity if tm.advanced_glass_enabled else None,
                border_radius=card_radius,
            )
            category_sections.append(category_card)

        return category_sections

    def filter_apps_by_type(self, apps_list):
        if self.core.current_filter == "all":
            return apps_list
        elif self.core.current_filter == "plugin":
            return [app for app in apps_list if app.get("type") == "plugin"]
        elif self.core.current_filter == "web":
            return [app for app in apps_list if app.get("type") == "web"]
        elif self.core.current_filter == "app":
            return [app for app in apps_list if app.get("type") == "app"]
        elif self.core.current_filter == "system":
            return [app for app in apps_list if app.get("type") == "system"]
        elif self.core.current_filter == "custom":
            return [app for app in apps_list if app in self.core.app_manager.custom_apps]
        return apps_list

    def get_category_icon(self, category):
        icons = {
            "Плагины": "extension",
            "Browser": "web",
            "Media": "play_arrow",
            "Music": "music_note",
            "Social": "groups",
            "Games": "sports_esports",
            "System": "computer",
            "Office": "work",
            "Cloud": "cloud",
            "Health": "medical_services",
            "Government": "verified_user",
            "Utilities": "apps",
            "Development": "code",
        }
        return icons.get(category, "apps")

    def show_search_results(self, results, query):
        colors = self.core.get_colors()
        tm = self.core.theme_manager
        runs_cnt = getattr(tm, "card_columns", 6)
        card_radius = getattr(tm, "card_border_radius", 20)
        hover_glow = getattr(tm, "card_hover_glow", True)
        active_clr = getattr(tm, "active_app_color", colors["SUCCESS"])
        icon_scale = getattr(tm, "icon_scale_pct", 100)

        if not results:
            no_results_content = ft.Column(
                [
                    ft.Icon("search_off", size=64, color=colors["ON_SURFACE_VARIANT"]),
                    ft.Text("Ничего не найдено", size=18, color=colors["ON_SURFACE_VARIANT"], weight=ft.FontWeight.W_500),
                    ft.Text(f"По запросу: '{query}'", size=14, color=colors["ON_SURFACE_VARIANT"]),
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=15,
            )
            new_view = ft.Container(
                key=f"search_empty_{query}",
                content=ft.Column(
                    [
                        self.create_favorites_panel(),
                        GlassMorphism.create_card(
                            no_results_content,
                            colors,
                            hover_effect=hover_glow,
                            border_radius=card_radius,
                        ),
                    ],
                    scroll=ft.ScrollMode.ADAPTIVE,
                ),
            )
        else:
            results_header = ft.Container(
                content=ft.Row(
                    [
                        ft.Icon("search", color=colors["ACCENT"], size=20),
                        ft.Text("Результаты поиска", size=18, weight=ft.FontWeight.BOLD, color=colors["ON_SURFACE"]),
                        ft.Container(
                            content=ft.Text(f"{len(results)} найдено", size=12, color=colors["ON_SURFACE_VARIANT"]),
                            bgcolor=colors["SURFACE_VARIANT"],
                            padding=ft.padding.symmetric(horizontal=10, vertical=4),
                            border_radius=12,
                        ),
                    ]
                ),
                padding=ft.padding.only(left=20, top=12, bottom=10, right=20),
            )

            results_grid = ft.GridView(
                runs_count=runs_cnt,
                max_extent=130,
                child_aspect_ratio=0.84,
                spacing=15,
                run_spacing=20,
                padding=16,
            )

            for app in results:
                is_installed = True if app.get("type") == "plugin" else self.core.app_manager.is_app_installed(app)
                badge = (
                    self.core.plugin_manager.get_app_card_badge(app)
                    if hasattr(self.core.plugin_manager, "get_app_card_badge")
                    else "0 мин"
                )
                app_button = GlassMorphism.create_app_button(
                    app,
                    colors,
                    is_installed,
                    glass_effect=tm.glass_effect_enabled,
                    on_click=lambda e, app=app: self.core.launch_app(app),
                    session_badge_text=badge,
                    intensity=tm.glass_intensity,
                    card_border_radius=card_radius,
                    active_app_color=active_clr,
                    icon_scale_pct=icon_scale,
                )
                results_grid.controls.append(app_button)

            search_results_content = ft.Column([results_header, results_grid])
            search_card = GlassMorphism.create_card(
                search_results_content,
                colors,
                hover_effect=hover_glow,
                intensity=tm.glass_intensity,
                border_radius=card_radius,
            )

            new_view = ft.Container(
                key=f"search_results_{query}",
                content=ft.Column([self.create_favorites_panel(), search_card], scroll=ft.ScrollMode.ADAPTIVE),
            )

        if self.animated_switcher:
            self.animated_switcher.content = new_view
        else:
            self.core.main_content.content = new_view

        if hasattr(self.core, "page") and self.core.page:
            self.core.page.update()

    def create_loading_progress(self):
        colors = self.core.get_colors()
        return ft.Container(
            content=ft.Column(
                [
                    ft.Icon("rocket_launch", size=40, color=colors["ACCENT"]),
                    ft.Text("Запуск приложения...", size=14, color=colors["ON_SURFACE"], weight=ft.FontWeight.W_500),
                    ft.Container(
                        content=ft.ProgressBar(
                            value=0, color=colors["ACCENT"], bgcolor=colors["SURFACE_VARIANT"], height=8, border_radius=4
                        ),
                        width=250,
                        padding=ft.padding.only(top=10),
                    ),
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=10,
                alignment=ft.MainAxisAlignment.CENTER,
            ),
            bgcolor=colors["SURFACE"],
            border_radius=15,
            padding=25,
            visible=False,
            width=320,
            height=140,
            top=100,
            alignment=ft.alignment.top_center,
            shadow=ft.BoxShadow(blur_radius=15, color=colors["GLASS_SHADOW"], offset=ft.Offset(0, 5)),
        )