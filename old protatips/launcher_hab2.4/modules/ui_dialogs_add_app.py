import os
import uuid
import flet as ft
from .glass_morphism import GlassMorphism


ICON_PRESETS = [
    "apps", "terminal", "code", "sports_esports", "chat", "web", "movie", "music_note", "school", "work",
    "settings", "folder", "photo", "brush", "book", "shopping_cart", "home", "travel_explore", "videogame_asset", "smart_toy",
    "security", "local_fire_department", "developer_mode", "cloud", "build", "language", "computer", "desktop_windows", "storage", "analytics",
    "camera_alt", "headphones", "mic", "podcasts", "tv", "smart_display", "newspaper", "rss_feed", "calculate", "science",
    "account_balance_wallet", "payments", "attach_money", "flight", "directions_car", "train", "map", "place", "fitness_center", "self_improvement",
    "medical_services", "healing", "restaurant", "coffee", "local_grocery_store", "pets", "park", "emoji_events", "military_tech", "shield",
    "vpn_key", "lock", "bolt", "flash_on", "rocket_launch", "auto_awesome", "extension", "widgets", "dashboard", "view_kanban",
]


class AddAppDialogMixin:
    def show_add_custom_app_dialog(self, e):
        """Улучшенное окно добавления приложения (v2.4): живое стеклянное превью, поиск иконок, CLI-параметры и лимит трекера."""
        colors = self.core.get_colors()

        selected_icon = {"value": "apps"}
        app_type_state = {"value": "app"}

        preview_icon = ft.Icon("apps", size=38, color=colors["ACCENT"])
        preview_title = ft.Text("Новое приложение", size=13, weight=ft.FontWeight.W_600, color=colors["ON_SURFACE"])
        preview_meta = ft.Text("Games • APP • 0 мин (старт по запуску)", size=11, color=colors["ON_SURFACE_VARIANT"])

        preview_card = GlassMorphism.create_container(
            content=ft.Row(
                [
                    ft.Container(
                        content=preview_icon,
                        width=64,
                        height=64,
                        border_radius=16,
                        bgcolor=GlassMorphism._apply_opacity(colors["ACCENT"], 0.16),
                        border=ft.border.all(1, GlassMorphism._apply_opacity(colors["ACCENT"], 0.35)),
                        alignment=ft.alignment.center,
                    ),
                    ft.Column(
                        [
                            ft.Text("ПРЕДПРОСМОТР КАРТОЧКИ", size=10, color=colors["ACCENT"], weight=ft.FontWeight.BOLD),
                            preview_title,
                            preview_meta,
                        ],
                        spacing=3,
                        expand=True,
                    ),
                ],
                spacing=14,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            colors=colors,
            intensity=self.core.theme_manager.glass_intensity,
            padding=14,
            margin=0,
        )

        def refresh_preview(_=None):
            url_val = (app_url.value or "").strip()
            detected = "web" if url_val.lower().startswith(("http://", "https://")) else app_type_selector.value
            app_type_state["value"] = detected
            preview_title.value = (app_name.value or "").strip() or "Новое приложение"
            cat_val = app_category.value or "Custom"
            limit_val = (daily_limit_field.value or "120").strip()
            preview_meta.value = f"{cat_val} • {detected.upper()} • Старт с 0 мин • Лимит: {limit_val} мин/день"
            preview_icon.name = selected_icon["value"]
            preview_icon.color = colors["WEB_BLUE"] if detected == "web" else colors["ACCENT"]
            preview_card.update()

        app_name = ft.TextField(
            label="Название приложения *",
            hint_text="Например: Cyberpunk 2077 или VS Code",
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
            border_radius=10,
            expand=True,
            on_change=refresh_preview,
        )

        app_category = ft.Dropdown(
            label="Категория",
            value="Games",
            options=[
                ft.dropdown.Option("Games"),
                ft.dropdown.Option("Browser"),
                ft.dropdown.Option("Development"),
                ft.dropdown.Option("Media"),
                ft.dropdown.Option("Music"),
                ft.dropdown.Option("Social"),
                ft.dropdown.Option("Office"),
                ft.dropdown.Option("Cloud"),
                ft.dropdown.Option("System"),
                ft.dropdown.Option("Custom"),
            ],
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
            border_radius=10,
            width=210,
            on_change=refresh_preview,
        )

        app_type_selector = ft.Dropdown(
            label="Тип запуска",
            value="app",
            options=[
                ft.dropdown.Option("app", "Локальное (EXE / URI)"),
                ft.dropdown.Option("web", "Веб-приложение (URL)"),
                ft.dropdown.Option("system", "Системная команда"),
            ],
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
            border_radius=10,
            width=210,
            on_change=refresh_preview,
        )

        def on_url_change(ev):
            val = (app_url.value or "").strip()
            if val.lower().startswith(("http://", "https://")):
                app_type_selector.value = "web"
                app_type_selector.update()
            elif val.lower().endswith(".exe") and not (app_name.value or "").strip():
                base = os.path.splitext(os.path.basename(val))[0].replace("_", " ").replace("-", " ").title()
                app_name.value = base
                app_name.update()
            refresh_preview()

        app_url = ft.TextField(
            label="URL, URI или путь к .exe файлу *",
            hint_text="https://... или C:\\Games\\App\\game.exe или steam://rungameid/...",
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
            border_radius=10,
            expand=True,
            on_change=on_url_change,
        )

        launch_args_field = ft.TextField(
            label="Аргументы запуска (необязательно)",
            hint_text="--fullscreen -novid",
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
            border_radius=10,
            expand=True,
        )

        daily_limit_field = ft.TextField(
            label="Лимит времени (мин/день для детокса)",
            value="120",
            hint_text="120",
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
            border_radius=10,
            width=240,
            on_change=refresh_preview,
        )

        add_to_fav_switch = ft.Switch(value=True, active_track_color=colors["ACCENT"])
        enable_tracker_switch = ft.Switch(value=True, active_track_color=colors["ACCENT"])

        icon_search = ft.TextField(
            hint_text="Поиск иконки (например: game, code, music, cloud)...",
            prefix_icon="search",
            filled=True,
            bgcolor=colors["SURFACE_VARIANT"],
            border_color="transparent",
            border_radius=10,
            content_padding=10,
        )

        icon_grid = ft.GridView(runs_count=8, max_extent=48, spacing=6, run_spacing=6, height=150)

        def set_icon(icon_name: str):
            selected_icon["value"] = icon_name
            populate_icons(icon_search.value or "")
            icon_grid.update()
            refresh_preview()

        def populate_icons(query: str = ""):
            q = query.lower().strip()
            icon_grid.controls.clear()
            filtered = [i for i in ICON_PRESETS if q in i.lower()] if q else ICON_PRESETS
            for icon in filtered:
                is_sel = icon == selected_icon["value"]
                icon_grid.controls.append(
                    ft.Container(
                        content=ft.IconButton(
                            icon=icon,
                            icon_size=20,
                            icon_color=colors["ACCENT"] if is_sel else colors["ON_SURFACE"],
                            tooltip=icon,
                            on_click=lambda e, i=icon: set_icon(i),
                        ),
                        bgcolor=GlassMorphism._apply_opacity(colors["ACCENT"], 0.22)
                        if is_sel
                        else GlassMorphism._apply_opacity(colors["SURFACE_VARIANT"], 0.55),
                        border=ft.border.all(1.5, colors["ACCENT"]) if is_sel else None,
                        border_radius=10,
                    )
                )

        populate_icons()
        icon_search.on_change = lambda e: (populate_icons(e.control.value or ""), icon_grid.update())

        def on_pick_result(ev: ft.FilePickerResultEvent):
            if ev.files:
                chosen_path = ev.files[0].path
                app_url.value = chosen_path
                if not (app_name.value or "").strip():
                    base = os.path.splitext(os.path.basename(chosen_path))[0].replace("_", " ").title()
                    app_name.value = base
                    app_name.update()
                app_url.update()
                refresh_preview()

        file_picker = ft.FilePicker(on_result=on_pick_result)
        if file_picker not in self.core.page.overlay:
            self.core.page.overlay.append(file_picker)

        def pick_file(_):
            try:
                file_picker.pick_files(allow_multiple=False)
            except Exception:
                self.core.show_toast("Не удалось открыть проводник. Введите путь вручную.")

        def add_app(_):
            if not (app_name.value or "").strip() or not (app_url.value or "").strip():
                self.core.show_toast("❌ Заполните название и путь/URL приложения")
                return

            clean_name = app_name.value.strip()
            clean_pkg = clean_name.lower().replace(" ", "_")
            detected_type = app_type_state["value"]

            new_app = {
                "name": clean_name,
                "package": clean_pkg,
                "category": app_category.value or "Custom",
                "icon": selected_icon["value"],
                "url": app_url.value.strip(),
                "args": (launch_args_field.value or "").strip(),
                "type": detected_type,
                "id": str(uuid.uuid4()),
                "official_url": app_url.value.strip() if detected_type == "web" else "",
            }

            self.core.app_manager.custom_apps.append(new_app)
            self.core.app_manager.save_custom_apps()

            if add_to_fav_switch.value:
                self.core.app_manager.add_to_favorites(new_app)

            if enable_tracker_switch.value and hasattr(self.core.plugin_manager, "get_plugin_instance"):
                tracker = self.core.plugin_manager.get_plugin_instance("session_tracker_plugin")
                if tracker and hasattr(tracker, "data"):
                    try:
                        limit_mins = max(15, int(daily_limit_field.value or 120))
                    except ValueError:
                        limit_mins = 120
                    tracker.data.setdefault("apps", {})[clean_pkg] = {
                        "name": clean_name,
                        "category": new_app["category"],
                        "total_seconds": 0,
                        "month_minutes": 0,
                        "week_minutes": 0,
                        "today_minutes": 0,
                        "daily_limit_minutes": limit_mins,
                        "detox_group": "Игры" if new_app["category"] == "Games" else "Браузеры",
                    }
                    tracker._save_data()

            self.core.update_main_content()
            self.core.update_sidebar()
            self.core.page.close(dialog)
            self.core.show_toast(f"✅ Приложение «{clean_name}» успешно добавлено (трекер с 0 мин)")

        dialog = ft.AlertDialog(
            title=ft.Row(
                [
                    ft.Icon("add_box", color=colors["ACCENT"], size=24),
                    ft.Text("Добавить приложение (v2.4)", weight=ft.FontWeight.BOLD, size=19),
                ],
                spacing=10,
            ),
            content=ft.Container(
                width=720,
                content=ft.Column(
                    [
                        preview_card,
                        ft.Row([app_name, app_category, app_type_selector], spacing=10),
                        ft.Row(
                            [
                                app_url,
                                ft.IconButton(
                                    icon="folder_open",
                                    icon_color=colors["ACCENT"],
                                    bgcolor=colors["SURFACE_VARIANT"],
                                    on_click=pick_file,
                                    tooltip="Выбрать исполняемый файл (.exe)",
                                ),
                            ],
                            spacing=8,
                        ),
                        ft.Row([launch_args_field, daily_limit_field], spacing=10),
                        ft.Row(
                            [
                                ft.Row([add_to_fav_switch, ft.Text("Добавить в Избранное", size=12)]),
                                ft.Container(width=16),
                                ft.Row([enable_tracker_switch, ft.Text("Отслеживать в Session Tracker (старт с 0)", size=12)]),
                            ]
                        ),
                        ft.Divider(color=colors["OUTLINE"], height=8),
                        ft.Row(
                            [
                                ft.Text("Выбор иконки", weight=ft.FontWeight.W_600, size=14),
                                ft.Container(expand=True, content=icon_search),
                            ],
                            spacing=12,
                        ),
                        icon_grid,
                    ],
                    scroll=ft.ScrollMode.ADAPTIVE,
                    spacing=10,
                    tight=True,
                ),
            ),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: self.core.page.close(dialog)),
                ft.FilledButton("Добавить приложение", icon="check", on_click=add_app),
            ],
        )
        self.core.page.open(dialog)