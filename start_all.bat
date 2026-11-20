@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title Luma OS 1.0.2 — Flagship Edition (Ядро Luma Core 1.0.2 + 2 Окна)

echo ============================================================================
echo   🚀 LUMA OS 1.0.2 KERNEL ^& SHELL (FLAGSHIP EDITION • MATERIAL 3 EXPRESSIVE)
echo   - Окно 1: Список и карточки по группам + Luma Spotlight (Ctrl+K) + Island
echo   - Окно 2: Матрица ячеек 20x30 (18 живых виджетов Luma Pulse / Aura / Core)
echo   - Ядро Luma Core 1.0.2: Реальная телеметрия, медиа-шина, авто-регион, AES-256-GCM
echo ============================================================================
echo.

cd /d "%~dp0"

:: 1. Мгновенный запуск автономного исполняемого файла LumaOS_1.0.2.exe (без зависимостей!)
if exist "LumaOS_1.0.2.exe" (
    echo [LumaOS 1.0.2 EXE] Запуск готового исполняемого файла LumaOS_1.0.2.exe ^(Ядро + 2 Окна^)...
    start "Luma OS 1.0.2 Kernel & Shell" "LumaOS_1.0.2.exe"
    echo.
    echo ✅ Ядро Luma Core 1.0.2 и оба окна ^(Окно 1: По группам + Окно 2: Ячейки 20x30^) запущены!
    exit /b 0
)

:: 2. Резервный запуск (если LumaOS_1.0.2.exe перемещен)
where dotnet >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist "LauncherHab3.0_CSharp\LauncherHab3.csproj" (
        pushd "LauncherHab3.0_CSharp"
        dotnet build LauncherHab3.csproj -c Release --nologo
        if !ERRORLEVEL! EQU 0 (
            start "LauncherHub 3.0 (C# .NET 8)" dotnet run --project LauncherHab3.csproj -c Release --no-build
        )
        popd
    )
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist "Luma_Core\luma_core.py" (
        start "Luma Core Daemon (127.0.0.1:49215)" /min python "Luma_Core\luma_core.py" --host 127.0.0.1 --port 49215
    )
    if exist "launcher_hab2.4\main.py" (
        start "LauncherHub Main UI" python "launcher_hab2.4\main.py"
    )
)

pause
