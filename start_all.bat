@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title LauncherHub 3.0 ^& Luma Core 1.0 — Быстрый запуск в один клик

echo ============================================================================
echo   🚀 LAUNCHERHUB 3.0 + LUMA SYSTEM CORE 1.0 (C# .NET 8 ^& PYTHON FLET)
echo ============================================================================
echo.

cd /d "%~dp0"

:: 1. Определяем корневую директорию и папку C# проекта
if exist "LauncherHab3.csproj" (
    set "CSHARP_DIR=%CD%"
    set "ROOT_DIR=%CD%\.."
) else (
    set "CSHARP_DIR=%CD%\LauncherHab3.0_CSharp"
    set "ROOT_DIR=%CD%"
)

:: 2. Удаляем дублирующуюся папку public\LauncherHab3.0_CSharp, если она мешает MSBuild
if exist "%ROOT_DIR%\public\LauncherHab3.0_CSharp" (
    echo [Очистка] Удаление дубликата public\LauncherHab3.0_CSharp для чистой сборки MSBuild...
    rmdir /s /q "%ROOT_DIR%\public\LauncherHab3.0_CSharp"
)

:: 3. Проверка и запуск C# .NET 8 версии (LauncherHab3.0_CSharp)
where dotnet >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist "%CSHARP_DIR%\LauncherHab3.csproj" (
        echo [C# .NET 8] Обнаружен .NET SDK. Сборка и запуск LauncherHab3.0_CSharp...
        pushd "%CSHARP_DIR%"
        dotnet build LauncherHab3.csproj -c Release --nologo
        if !ERRORLEVEL! EQU 0 (
            echo [C# .NET 8] Сборка успешно завершена без ошибок! Запуск ядра Luma и окон UI...
            start "LauncherHub 3.0 (C# .NET 8)" dotnet run --project LauncherHab3.csproj -c Release --no-build
        ) else (
            echo [Внимание] Ошибка сборки C# проекта. Проверьте установленный .NET 8.0 Windows Desktop SDK.
        )
        popd
    )
) else (
    echo [Инфо] .NET SDK (dotnet) не найден в PATH, переход к проверке Python/Flet контура...
)

:: 4. Проверка и автозапуск Python/Flet контура (Luma_Core + launcher_hab2.4 + Дашборд плиток)
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist "%ROOT_DIR%\Luma_Core\luma_core.py" (
        echo [Python Luma Core] Проверка сокета 127.0.0.1:49215 и запуск фонового ядра...
        start "Luma Core Daemon (127.0.0.1:49215)" /min python "%ROOT_DIR%\Luma_Core\luma_core.py" --host 127.0.0.1 --port 49215
        timeout /t 1 /nobreak >nul
    )
    if exist "%ROOT_DIR%\launcher_hab2.4\main.py" (
        echo [Python UI] Запуск главного окна LauncherHub (Flet)...
        start "LauncherHub Main UI" python "%ROOT_DIR%\launcher_hab2.4\main.py"
    )
    if exist "%ROOT_DIR%\Luma_Core\ui_tiles_dashboard.py" (
        echo [Python Tiles] Запуск 3-го окна Плиточного Дашборда 12 виджетов...
        start "Luma Tiles Dashboard" python "%ROOT_DIR%\Luma_Core\ui_tiles_dashboard.py"
    )
)

echo.
echo ============================================================================
echo   ✅ Все доступные модули LauncherHub 3.0 и ядро Luma (127.0.0.1:49215) запущены!
echo ============================================================================
pause
