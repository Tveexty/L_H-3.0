# [file name]: plugins/session_tracker_plugin.py
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import flet as ft

try:
    import psutil
except ImportError:
    psutil = None


def _hex_alpha(hex_color: str, opacity: float) -> str:
    """Форматирует HEX цвет с прозрачностью в формат Flet #AARRGGBB."""
    if not isinstance(hex_color, str) or not hex_color.startswith("#"):
        return "#331e2636"
    raw = hex_color[1:]
    if len(raw) == 8:
        raw = raw[2:]
    if len(raw) != 6:
        return hex_color
    alpha = max(0, min(255, int(round(max(0.0, min(1.0, opacity)) * 255))))
    return f"#{alpha:02x}{raw}"


class GameAppSessionTrackerPlugin:
    """
    Плагин «Game & App Session Tracker» (Трекер активности и игрового времени) для Launcher Hab 2.4.
    Начинает отсчет строго с 0 и запускает реальный посекундный таймер при запуске любого приложения.
    """

    WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

    PLUGIN_META = {
        "id": "session_tracker_plugin",
        "name": "Game & App Session Tracker",
        "version": "2.4.0",
        "author": "Launcher Hab Team",
        "category": "Плагины",
        "description": "Трекер игрового и экранного времени: старт с 0, живой таймер при запуске приложений, графики за день/неделю/месяц и лимиты детокса.",
        "icon": "insights",
    }

    def __init__(self):
        self.context = None
        self.api = None
        self.data_file = Path("session_tracker_data.json")
        # package -> timestamp последнего тика
        self.active_sessions: Dict[str, float] = {}
        # package -> timestamp начала текущей непрерывной сессии
        self.session_started_at: Dict[str, float] = {}
        self.notified_limits_today: set = set()
        self.selected_period = "day"  # "day" | "week" | "month"
        self.data = self._load_data()

    def _default_data(self) -> Dict[str, Any]:
        today = datetime.now().strftime("%Y-%m-%d")
        return {
            "schema_version": "2.4_zero_start",
            "apps": {
                "steam": {
                    "name": "Steam",
                    "category": "Games",
                    "total_seconds": 0,
                    "month_minutes": 0,
                    "week_minutes": 0,
                    "today_minutes": 0,
                    "daily_limit_minutes": 180,
                    "detox_group": "Игры",
                },
                "chrome": {
                    "name": "Chrome",
                    "category": "Browser",
                    "total_seconds": 0,
                    "month_minutes": 0,
                    "week_minutes": 0,
                    "today_minutes": 0,
                    "daily_limit_minutes": 240,
                    "detox_group": "Браузеры",
                },
                "telegram": {
                    "name": "Telegram",
                    "category": "Social",
                    "total_seconds": 0,
                    "month_minutes": 0,
                    "week_minutes": 0,
                    "today_minutes": 0,
                    "daily_limit_minutes": 60,
                    "detox_group": "Соцсети и мессенджеры",
                },
                "vk": {
                    "name": "VK",
                    "category": "Social",
                    "total_seconds": 0,
                    "month_minutes": 0,
                    "week_minutes": 0,
                    "today_minutes": 0,
                    "daily_limit_minutes": 60,
                    "detox_group": "Соцсети и мессенджеры",
                },
                "youtube": {
                    "name": "YouTube",
                    "category": "Media",
                    "total_seconds": 0,
                    "month_minutes": 0,
                    "week_minutes": 0,
                    "today_minutes": 0,
                    "daily_limit_minutes": 90,
                    "detox_group": "Медиа",
                },
                "vlc": {
                    "name": "VLC",
                    "category": "Media",
                    "total_seconds": 0,
                    "month_minutes": 0,
                    "week_minutes": 0,
                    "today_minutes": 0,
                    "daily_limit_minutes": 180,
                    "detox_group": "Медиа",
                },
            },
            "detox_groups": {
                "Игры": {"daily_limit_minutes": 180, "enabled": True},
                "Соцсети и мессенджеры": {"daily_limit_minutes": 90, "enabled": True},
                "Медиа": {"daily_limit_minutes": 120, "enabled": True},
                "Браузеры": {"daily_limit_minutes": 240, "enabled": False},
            },
            "daily_history": {
                "Пн": 0,
                "Вт": 0,
                "Ср": 0,
                "Чт": 0,
                "Пт": 0,
                "Сб": 0,
                "Вс": 0,
            },
            "last_updated_date": today,
        }

    def _load_data(self) -> Dict[str, Any]:
        try:
            if self.data_file.exists():
                with self.data_file.open("r", encoding="utf-8") as f:
                    loaded = json.load(f)
                # Если данные были от старой демо-сборки без schema_version == "2.4_zero_start",
                # сбрасываем предзаполненные часы в 0, чтобы трекер честно считал с 0!
                if isinstance(loaded, dict) and loaded.get("schema_version") == "2.4_zero_start":
                    return loaded
        except Exception:
            pass
        default = self._default_data()
        self._save_data(default)
        return default

    def _save_data(self, data: Optional[Dict[str, Any]] = None):
        target = data or self.data
        try:
            with self.data_file.open("w", encoding="utf-8") as f:
                json.dump(target, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def reset_all_stats(self):
        """Полный сброс всей статистики времени в 0."""
        self.active_sessions.clear()
        self.session_started_at.clear()
        self.notified_limits_today.clear()
        self.data = self._default_data()
        self._save_data()

    def set_context(self, context):
        self.context = context

    def on_load(self, api):
        self.api = api
        self.context = getattr(api, "core", self.context)

    def cleanup(self):
        for pkg in list(self.active_sessions.keys()):
            self.stop_session(pkg)
        self._save_data()

    def _ensure_app_entry(self, pkg: str, name: str = None, category: str = "Custom") -> Dict[str, Any]:
        pkg_clean = pkg.lower().strip()
        if pkg_clean not in self.data["apps"]:
            self.data["apps"][pkg_clean] = {
                "name": name or pkg_clean.title(),
                "category": category,
                "total_seconds": 0,
                "month_minutes": 0,
                "week_minutes": 0,
                "today_minutes": 0,
                "daily_limit_minutes": 180 if category == "Games" else 120,
                "detox_group": (
                    "Игры"
                    if category == "Games"
                    else ("Соцсети и мессенджеры" if category == "Social" else ("Медиа" if category == "Media" else "Браузеры"))
                ),
            }
        elif "total_seconds" not in self.data["apps"][pkg_clean]:
            self.data["apps"][pkg_clean]["total_seconds"] = int(self.data["apps"][pkg_clean].get("month_minutes", 0)) * 60
        return self.data["apps"][pkg_clean]

    # --- Хуки жизненного цикла приложений ---
    def on_app_launched(self, app: Dict[str, Any]):
        """Вызывается при запуске приложения из лаунчера — включает реальный таймер сессии."""
        if app.get("type") == "plugin":
            return
        pkg = str(app.get("package", app.get("name", "app"))).lower()
        name = app.get("name", pkg)
        category = app.get("category", "Custom")

        self._ensure_app_entry(pkg, name, category)
        now = time.time()
        self.active_sessions[pkg] = now
        if pkg not in self.session_started_at:
            self.session_started_at[pkg] = now
        self._save_data()

    def stop_session(self, package: str):
        """Останавливает активный таймер приложения и фиксирует накопленное время."""
        pkg = package.lower()
        now = time.time()
        if pkg in self.active_sessions:
            last_ts = self.active_sessions.pop(pkg)
            delta = max(0, int(now - last_ts))
            if delta > 0:
                self._add_seconds(pkg, delta)
        self.session_started_at.pop(pkg, None)
        self._save_data()

    def toggle_session(self, package: str, app_name: str = None, category: str = "Games") -> bool:
        """Запускает или останавливает таймер для указанного приложения."""
        pkg = package.lower()
        if pkg in self.active_sessions:
            self.stop_session(pkg)
            return False
        self._ensure_app_entry(pkg, app_name or pkg.title(), category)
        now = time.time()
        self.active_sessions[pkg] = now
        self.session_started_at[pkg] = now
        self._save_data()
        return True

    def _add_seconds(self, pkg: str, seconds: int):
        if seconds <= 0:
            return
        entry = self._ensure_app_entry(pkg)
        prev_total = int(entry.get("total_seconds", 0))
        new_total = prev_total + seconds
        entry["total_seconds"] = new_total

        added_minutes = (new_total // 60) - (prev_total // 60)
        if added_minutes > 0:
            entry["today_minutes"] = int(entry.get("today_minutes", 0)) + added_minutes
            entry["week_minutes"] = int(entry.get("week_minutes", 0)) + added_minutes
            entry["month_minutes"] = int(entry.get("month_minutes", 0)) + added_minutes

            weekday_ru = self.WEEKDAYS_RU[datetime.now().weekday()]
            hist = self.data.setdefault("daily_history", {})
            hist[weekday_ru] = int(hist.get(weekday_ru, 0)) + added_minutes

            self._check_detox_limits(pkg)

    def tick_second(self) -> bool:
        """
        Вызывается каждую секунду из основного таймера лаунчера.
        Возвращает True, если есть хотя бы одна активная сессия (чтобы обновить бейджи).
        """
        if not self.active_sessions:
            return False
        now = time.time()
        for pkg in list(self.active_sessions.keys()):
            last_ts = self.active_sessions.get(pkg, now)
            elapsed = int(now - last_ts)
            if elapsed >= 1:
                self.active_sessions[pkg] = now
                self._add_seconds(pkg, elapsed)
        return True

    def on_tick(self):
        """Вызывается раз в минуту для сохранения данных на диск и проверки процессов ОС."""
        self.tick_second()
        self._save_data()

    def _check_detox_limits(self, package: str):
        """Проверка превышения лимита приложения или группы детокса и отправка уведомления."""
        if self.context and hasattr(self.context, "theme_manager"):
            if not getattr(self.context.theme_manager, "detox_notifications", True):
                return

        pkg = package.lower()
        app_entry = self.data["apps"].get(pkg)
        if not app_entry:
            return

        today_min = int(app_entry.get("today_minutes", 0))
        app_limit = int(app_entry.get("daily_limit_minutes", 0))
        group_name = app_entry.get("detox_group", "")

        if app_limit > 0 and today_min >= app_limit and f"app_{pkg}" not in self.notified_limits_today:
            self.notified_limits_today.add(f"app_{pkg}")
            self._notify(
                f"⚠️ Лимит времени: {app_entry['name']}",
                f"Вы провели в {app_entry['name']} уже {self.format_duration(today_min)} сегодня (лимит: {self.format_duration(app_limit)}).",
            )

        group_cfg = self.data.get("detox_groups", {}).get(group_name)
        if group_cfg and group_cfg.get("enabled", False):
            group_limit = int(group_cfg.get("daily_limit_minutes", 120))
            group_total = sum(
                int(a.get("today_minutes", 0))
                for a in self.data["apps"].values()
                if a.get("detox_group") == group_name
            )
            if group_total >= group_limit and f"group_{group_name}" not in self.notified_limits_today:
                self.notified_limits_today.add(f"group_{group_name}")
                self._notify(
                    f"🛑 Цифровой детокс: «{group_name}»",
                    f"Дневной лимит группы «{group_name}» достигнут ({self.format_duration(group_total)} из {self.format_duration(group_limit)}).",
                )

    def _notify(self, title: str, message: str):
        if self.context and hasattr(self.context, "show_system_notification"):
            try:
                self.context.show_system_notification(title, message)
            except Exception:
                pass

    @staticmethod
    def format_hms(seconds: int) -> str:
        seconds = max(0, int(seconds))
        h, rem = divmod(seconds, 3600)
        m, s = divmod(rem, 60)
        if h > 0:
            return f"{h:02d}:{m:02d}:{s:02d}"
        return f"{m:02d}:{s:02d}"

    @staticmethod
    def format_hours_month(minutes: int, total_seconds: int = 0) -> str:
        if minutes <= 0 and total_seconds <= 0:
            return "0 мин"
        if minutes <= 0 and total_seconds > 0:
            return f"{total_seconds} сек"
        hours = minutes / 60.0
        if hours >= 10:
            return f"{int(round(hours))} ч в мес"
        elif hours >= 1:
            return f"{hours:.1f} ч в мес"
        return f"{minutes} мин"

    @staticmethod
    def format_duration(minutes: int, total_seconds: int = 0) -> str:
        if minutes <= 0 and total_seconds > 0:
            return f"{total_seconds} сек"
        h, m = divmod(int(minutes), 60)
        if h > 0 and m > 0:
            return f"{h} ч {m} мин"
        elif h > 0:
            return f"{h} ч"
        return f"{m} мин"

    # --- Контракт плагина для карточек приложений ---
    def get_app_card_badge(self, app: Dict[str, Any]) -> Optional[str]:
        """Возвращает строку времени для карточки приложения (начиная с «0 мин» и живого таймера при запуске)."""
        if app.get("type") == "plugin":
            return "Расширение"
        pkg = str(app.get("package", "")).lower()
        entry = self.data.get("apps", {}).get(pkg)
        if not entry:
            for k, v in self.data.get("apps", {}).items():
                if v.get("name", "").lower() == str(app.get("name", "")).lower():
                    entry = v
                    pkg = k
                    break

        is_running = pkg in self.active_sessions
        total_sec = int(entry.get("total_seconds", 0)) if entry else 0
        month_min = int(entry.get("month_minutes", 0)) if entry else 0

        if is_running:
            session_sec = max(0, int(time.time() - self.session_started_at.get(pkg, time.time())))
            return f"🟢 {self.format_hms(max(total_sec, session_sec))}"

        return self.format_hours_month(month_min, total_sec)

    def is_app_running(self, app: Dict[str, Any]) -> bool:
        pkg = str(app.get("package", "")).lower()
        return pkg in self.active_sessions

    # --- UI компонент плагина ---
    def get_ui_component(self):
        colors = (
            self.context.get_colors()
            if self.context and hasattr(self.context, "get_colors")
            else {
                "SURFACE": "#151b26",
                "SURFACE_VARIANT": "#1e2636",
                "ON_SURFACE": "#f1f5f9",
                "ON_SURFACE_VARIANT": "#8b9bb4",
                "ACCENT": "#3b82f6",
                "SUCCESS": "#10b981",
                "ERROR": "#ef4444",
                "OUTLINE": "#263042",
            }
        )

        period_state = {"value": self.selected_period}
        bars_column = ft.Column(spacing=8)
        summary_text = ft.Text("", size=13, color=colors["ON_SURFACE_VARIANT"])

        def build_bars():
            bars_column.controls.clear()
            period = period_state["value"]
            field_map = {
                "day": ("today_minutes", "за сегодня"),
                "week": ("week_minutes", "за неделю"),
                "month": ("month_minutes", "за месяц"),
            }
            field_key, label_suffix = field_map.get(period, ("today_minutes", "за сегодня"))

            apps_list = sorted(
                self.data.get("apps", {}).items(),
                key=lambda kv: (kv[0] in self.active_sessions, int(kv[1].get("total_seconds", 0)), int(kv[1].get(field_key, 0))),
                reverse=True,
            )
            max_val = max([max(1, int(v.get("total_seconds", 0))) for _, v in apps_list] + [300])
            total_sec_all = sum(int(v.get("total_seconds", 0)) for _, v in apps_list)
            total_min_all = sum(int(v.get(field_key, 0)) for _, v in apps_list)
            active_count = len(self.active_sessions)

            summary_text.value = (
                f"Экранное время ({label_suffix}): {self.format_duration(total_min_all, total_sec_all)} • "
                f"Активных таймеров: {active_count}"
            )

            for pkg, info in apps_list:
                mins = int(info.get(field_key, 0))
                total_sec = int(info.get("total_seconds", 0))
                limit_min = int(info.get("daily_limit_minutes", 180))
                is_running = pkg in self.active_sessions
                ratio = min(1.0, max(total_sec, mins * 60) / max(1, max_val))
                is_over_limit = period == "day" and limit_min > 0 and mins >= limit_min

                if is_running:
                    time_label = f"🟢 Идет отсчет: {self.format_hms(total_sec)}"
                else:
                    time_label = self.format_duration(mins, total_sec)

                bars_column.controls.append(
                    ft.Container(
                        bgcolor=_hex_alpha(colors["SUCCESS"], 0.12) if is_running else _hex_alpha(colors["SURFACE_VARIANT"], 0.65),
                        border=ft.border.all(
                            1,
                            colors["SUCCESS"] if is_running else _hex_alpha(colors["ON_SURFACE"], 0.08),
                        ),
                        border_radius=12,
                        padding=12,
                        content=ft.Column(
                            [
                                ft.Row(
                                    [
                                        ft.Icon(
                                            "play_circle_fill" if is_running else ("sports_esports" if info.get("category") == "Games" else "apps"),
                                            size=20,
                                            color=colors["SUCCESS"] if is_running else (colors["ERROR"] if is_over_limit else colors["ACCENT"]),
                                        ),
                                        ft.Column(
                                            [
                                                ft.Text(
                                                    f"{info.get('name', pkg)} — {time_label}",
                                                    weight=ft.FontWeight.W_600,
                                                    size=13,
                                                    color=colors["ON_SURFACE"],
                                                ),
                                                ft.Text(
                                                    f"Группа: {info.get('detox_group', '—')} • Лимит: {limit_min} мин/день",
                                                    size=11,
                                                    color=colors["ERROR"] if is_over_limit else colors["ON_SURFACE_VARIANT"],
                                                ),
                                            ],
                                            spacing=2,
                                            expand=True,
                                        ),
                                        ft.FilledButton(
                                            "Стоп" if is_running else "Старт таймера",
                                            icon="stop" if is_running else "play_arrow",
                                            on_click=lambda e, p=pkg, n=info.get("name", pkg), c=info.get("category", "Games"): _toggle_app_timer(p, n, c),
                                            style=ft.ButtonStyle(
                                                bgcolor=colors["ERROR"] if is_running else colors["ACCENT"],
                                                color="#ffffff",
                                            ),
                                        ),
                                    ]
                                ),
                                ft.ProgressBar(
                                    value=ratio,
                                    height=6,
                                    border_radius=4,
                                    color=colors["SUCCESS"] if is_running else (colors["ERROR"] if is_over_limit else colors["ACCENT"]),
                                    bgcolor=colors["SURFACE"],
                                ),
                            ],
                            spacing=8,
                        ),
                    )
                )

        def _toggle_app_timer(pkg_key: str, app_name: str, category: str):
            self.toggle_session(pkg_key, app_name, category)
            build_bars()
            try:
                bars_column.update()
                summary_text.update()
                if self.context and hasattr(self.context, "update_sidebar"):
                    self.context.update_sidebar()
            except Exception:
                pass

        def _reset_stats(_):
            self.reset_all_stats()
            build_bars()
            try:
                bars_column.update()
                summary_text.update()
                if self.context and hasattr(self.context, "update_sidebar"):
                    self.context.update_sidebar()
                if self.context and hasattr(self.context, "show_toast"):
                    self.context.show_toast("Статистика трекера сброшена в 0")
            except Exception:
                pass

        def set_period(p: str):
            period_state["value"] = p
            self.selected_period = p
            build_bars()
            try:
                bars_column.update()
                summary_text.update()
            except Exception:
                pass

        build_bars()

        detox_rows = []
        for g_name, g_cfg in self.data.get("detox_groups", {}).items():
            detox_rows.append(
                ft.Row(
                    [
                        ft.Switch(
                            value=bool(g_cfg.get("enabled", True)),
                            active_track_color=colors["ACCENT"],
                            on_change=lambda e, gn=g_name: _toggle_detox_group(gn, e.control.value),
                        ),
                        ft.Text(g_name, size=13, expand=True, color=colors["ON_SURFACE"]),
                        ft.Text(
                            f"Лимит: {self.format_duration(g_cfg.get('daily_limit_minutes', 120))}/день",
                            size=12,
                            color=colors["ON_SURFACE_VARIANT"],
                        ),
                    ]
                )
            )

        def _toggle_detox_group(group_name: str, enabled: bool):
            if group_name in self.data["detox_groups"]:
                self.data["detox_groups"][group_name]["enabled"] = bool(enabled)
                self._save_data()

        return ft.Container(
            padding=16,
            border_radius=16,
            bgcolor=_hex_alpha(colors["SURFACE"], 0.85),
            border=ft.border.all(1, _hex_alpha(colors["ON_SURFACE"], 0.08)),
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Icon("insights", color=colors["ACCENT"], size=24),
                            ft.Column(
                                [
                                    ft.Text(
                                        "Game & App Session Tracker (Отсчет с 0 при запуске)",
                                        size=16,
                                        weight=ft.FontWeight.BOLD,
                                        color=colors["ON_SURFACE"],
                                    ),
                                    summary_text,
                                ],
                                spacing=2,
                                expand=True,
                            ),
                            ft.OutlinedButton(
                                "Сбросить в 0",
                                icon="restart_alt",
                                on_click=_reset_stats,
                            ),
                        ]
                    ),
                    ft.Row(
                        [
                            ft.FilledButton("День", on_click=lambda e: set_period("day")),
                            ft.FilledButton("Неделя", on_click=lambda e: set_period("week")),
                            ft.FilledButton("Месяц", on_click=lambda e: set_period("month")),
                        ],
                        spacing=8,
                    ),
                    bars_column,
                    ft.Divider(color=colors["OUTLINE"], height=14),
                    ft.Text(
                        "Группы цифрового детокса (уведомления при превышении лимита)",
                        size=13,
                        weight=ft.FontWeight.W_600,
                        color=colors["ON_SURFACE"],
                    ),
                    *detox_rows,
                ],
                spacing=12,
            ),
        )


def initialize_plugin():
    return GameAppSessionTrackerPlugin()
