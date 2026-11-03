# [file name]: glass_morphism.py
import flet as ft


class GlassMorphism:
    """Модуль прозрачного стекла (Glassmorphism 2.5) в стиле темного графита (Flet #AARRGGBB)."""

    GLASS_STYLES = {
        "light": {
            "bg_blur": 10,
            "bg_opacity": 0.55,
            "border_opacity": 0.08,
            "highlight_opacity": 0.06,
            "shadow_blur": 14,
        },
        "medium": {
            "bg_blur": 16,
            "bg_opacity": 0.72,
            "border_opacity": 0.11,
            "highlight_opacity": 0.10,
            "shadow_blur": 20,
        },
        "strong": {
            "bg_blur": 26,
            "bg_opacity": 0.86,
            "border_opacity": 0.16,
            "highlight_opacity": 0.14,
            "shadow_blur": 28,
        },
    }

    @staticmethod
    def _apply_opacity(color: str, opacity: float) -> str:
        """
        Применяет прозрачность (0.0 - 1.0) к HEX цвету в формате Flet/Flutter (#AARRGGBB).
        ВАЖНО: В Flet 8-символьный HEX имеет формат #AARRGGBB (альфа-канал В НАЧАЛЕ).
        """
        if not isinstance(color, str):
            return "#b3151b26"
        clean = color.strip()
        if not clean.startswith("#"):
            return color
        hex_part = clean[1:]
        if len(hex_part) == 8:
            rgb = hex_part[2:]
        elif len(hex_part) == 6:
            rgb = hex_part
        elif len(hex_part) == 3:
            rgb = "".join(c * 2 for c in hex_part)
        else:
            return color

        clamped = max(0.0, min(1.0, float(opacity)))
        alpha = max(0, min(255, int(round(clamped * 255))))
        return f"#{alpha:02x}{rgb}"

    @staticmethod
    def _make_blur(sigma: float):
        """Создает объект размытия Flet с защитой от старых версий."""
        try:
            return ft.Blur(sigma, sigma, ft.BlurTileMode.MIRROR)
        except Exception:
            return None

    @staticmethod
    def create_container(
        content,
        colors,
        intensity="medium",
        border=True,
        shadow=True,
        border_radius=18,
        padding=16,
        margin=5,
        custom_opacity=None,
    ):
        """Создание контейнера с эффектом прозрачного матового стекла без цветовых искажений."""
        style = GlassMorphism.GLASS_STYLES.get(intensity, GlassMorphism.GLASS_STYLES["medium"])
        opacity = (custom_opacity / 100.0) if custom_opacity is not None else style["bg_opacity"]

        bg_color = GlassMorphism._apply_opacity(colors.get("SURFACE", "#151b26"), opacity)
        border_color = (
            GlassMorphism._apply_opacity(colors.get("ON_SURFACE", "#f1f5f9"), style["border_opacity"])
            if border
            else None
        )

        container = ft.Container(
            content=content,
            bgcolor=bg_color,
            blur=GlassMorphism._make_blur(style["bg_blur"]),
            border=ft.border.all(1, border_color) if border else None,
            border_radius=border_radius,
            padding=padding,
            margin=margin,
            shadow=ft.BoxShadow(
                spread_radius=0,
                blur_radius=style["shadow_blur"],
                color=colors.get("GLASS_SHADOW", "#55000000"),
                offset=ft.Offset(0, 6),
            )
            if shadow
            else None,
            animate=ft.Animation(260, ft.AnimationCurve.EASE_OUT_CUBIC),
            animate_opacity=ft.Animation(220, ft.AnimationCurve.EASE_IN_OUT),
            animate_scale=ft.Animation(180, ft.AnimationCurve.EASE_OUT),
        )
        return container

    @staticmethod
    def create_app_button(
        app,
        colors,
        is_installed,
        is_favorite=False,
        glass_effect=True,
        on_click=None,
        on_long_press=None,
        session_badge_text=None,
        is_running=False,
        intensity="medium",
        card_border_radius=20,
        active_app_color=None,
        icon_scale_pct=100,
    ):
        """
        Создание карточки-плитки приложения в темном графитовом стиле (v2.5):
        - поддерживает кастомное скругление (card_border_radius), масштаб иконок (icon_scale_pct)
          и цвет подсветки активного приложения (active_app_color);
        - подпись времени сессии снизу.
        """
        style = GlassMorphism.GLASS_STYLES.get(intensity, GlassMorphism.GLASS_STYLES["medium"])
        is_plugin = app.get("type") == "plugin"
        active_clr = active_app_color or colors.get("SUCCESS", "#10b981")
        scale_factor = max(0.8, min(1.3, float(icon_scale_pct or 100) / 100.0))

        if is_running:
            icon_color = "#ffffff"
        elif is_plugin:
            icon_color = "#a78bfa"
        elif app.get("type") == "web":
            icon_color = colors.get("WEB_BLUE", colors["ACCENT"])
        else:
            icon_color = colors["ON_SURFACE"] if is_installed else colors["ERROR"]

        if is_running:
            tile_bg = GlassMorphism._apply_opacity(active_clr, 0.22)
            tile_border = ft.border.all(1.5, active_clr)
        elif is_plugin:
            tile_bg = GlassMorphism._apply_opacity("#8b5cf6", 0.16)
            tile_border = ft.border.all(1, GlassMorphism._apply_opacity("#a78bfa", 0.35))
        elif glass_effect:
            tile_bg = GlassMorphism._apply_opacity(colors["SURFACE_VARIANT"], 0.72)
            tile_border = ft.border.all(1, GlassMorphism._apply_opacity(colors["ON_SURFACE"], 0.10))
        else:
            tile_bg = colors["SURFACE_VARIANT"]
            tile_border = ft.border.all(1, colors["OUTLINE"])

        tile_blur = GlassMorphism._make_blur(style["bg_blur"]) if glass_effect else None

        if is_running:
            status_icon = ft.Icon(name="play_circle_outline", size=16, color=active_clr)
        elif is_favorite:
            status_icon = ft.Icon(name="star", size=15, color="#f59e0b")
        elif is_plugin:
            status_icon = ft.Icon(name="extension", size=14, color="#a78bfa")
        else:
            status_icon = ft.Icon(
                name="check" if is_installed else "error_outline",
                size=14,
                color=colors["SUCCESS"] if is_installed else colors["ERROR"],
            )

        tile_size = int(round(78 * scale_factor))
        icon_px = int(round(36 * scale_factor))

        icon_container = ft.Container(
            content=ft.Stack(
                [
                    ft.Container(
                        content=ft.Icon(name=app.get("icon", "apps"), size=icon_px, color=icon_color),
                        alignment=ft.alignment.center,
                    ),
                    ft.Container(
                        content=status_icon,
                        alignment=ft.alignment.bottom_right,
                        padding=ft.padding.only(right=6, bottom=6),
                    ),
                ]
            ),
            width=tile_size,
            height=tile_size,
            alignment=ft.alignment.center,
            bgcolor=tile_bg,
            blur=tile_blur,
            border_radius=int(card_border_radius),
            border=tile_border,
            shadow=ft.BoxShadow(
                blur_radius=14 if is_running else 12,
                color=GlassMorphism._apply_opacity(active_clr, 0.30)
                if is_running
                else colors.get("GLASS_SHADOW", "#55000000"),
                offset=ft.Offset(0, 4),
            ),
            animate=ft.Animation(200, ft.AnimationCurve.EASE_OUT),
        )

        subtitle_text = session_badge_text if session_badge_text is not None else ("ПЛАГИН" if is_plugin else "0 мин")
        subtitle_color = (
            active_clr
            if is_running
            else ("#a78bfa" if is_plugin else colors["ON_SURFACE_VARIANT"])
        )

        subtitle_controls = [
            ft.Text(
                app.get("name", "App"),
                size=12,
                weight=ft.FontWeight.W_600,
                color=colors["ON_SURFACE"] if is_installed or is_plugin else colors["ERROR"],
                text_align=ft.TextAlign.CENTER,
                max_lines=1,
                overflow=ft.TextOverflow.ELLIPSIS,
            ),
            ft.Text(
                subtitle_text,
                size=10,
                weight=ft.FontWeight.W_500 if is_running else ft.FontWeight.NORMAL,
                color=subtitle_color,
                text_align=ft.TextAlign.CENTER,
                max_lines=1,
                overflow=ft.TextOverflow.ELLIPSIS,
            ),
        ]

        app_content = ft.Column(
            [
                icon_container,
                ft.Container(
                    content=ft.Column(
                        subtitle_controls,
                        spacing=2,
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                    ),
                    height=38,
                    alignment=ft.alignment.top_center,
                    padding=ft.padding.only(top=4),
                ),
            ],
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            spacing=4,
            height=130,
        )

        tooltip_lines = [f"Запустить {app.get('name', '')}"]
        if session_badge_text:
            tooltip_lines.append(f"Трекер: {session_badge_text}")

        app_container = ft.Container(
            content=app_content,
            width=116,
            height=148,
            padding=8,
            on_click=on_click,
            on_long_press=on_long_press,
            tooltip="\n".join(tooltip_lines),
            border_radius=max(12, int(card_border_radius) - 4),
            bgcolor="transparent",
            scale=1.0,
            animate=ft.Animation(200, ft.AnimationCurve.EASE_OUT),
            animate_scale=ft.Animation(180, ft.AnimationCurve.EASE_OUT),
        )

        return app_container

    @staticmethod
    def create_card(
        content,
        colors,
        hover_effect=False,
        intensity="medium",
        custom_opacity=None,
        border_radius=20,
    ):
        """Создание секционной карточки в темно-графитовом стиле без желтых рамок."""
        style = GlassMorphism.GLASS_STYLES.get(intensity, GlassMorphism.GLASS_STYLES["medium"])
        opacity = (custom_opacity / 100.0) if custom_opacity is not None else style["bg_opacity"]

        base_bg = GlassMorphism._apply_opacity(colors.get("SURFACE", "#151b26"), opacity)
        base_border = GlassMorphism._apply_opacity(colors.get("ON_SURFACE", "#f1f5f9"), 0.08)

        card = ft.Container(
            content=content,
            bgcolor=base_bg,
            blur=GlassMorphism._make_blur(style["bg_blur"]),
            border=ft.border.all(1, base_border),
            border_radius=int(border_radius),
            padding=20,
            margin=10,
            scale=1.0,
            shadow=ft.BoxShadow(
                spread_radius=0,
                blur_radius=style["shadow_blur"],
                color=colors.get("GLASS_SHADOW", "#55000000"),
                offset=ft.Offset(0, 8),
            ),
            animate=ft.Animation(260, ft.AnimationCurve.EASE_OUT_CUBIC),
            animate_scale=ft.Animation(180, ft.AnimationCurve.EASE_OUT),
        )

        if hover_effect:
            def on_hover(e):
                if e.data == "true":
                    card.border = ft.border.all(1, GlassMorphism._apply_opacity(colors["ACCENT"], 0.35))
                else:
                    card.border = ft.border.all(1, base_border)
                card.update()

            card.on_hover = on_hover

        return card