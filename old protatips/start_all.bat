@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title Luma OS 1.0.2b

echo ============================================================================
echo   LUMA OS 1.0.2b — DESKTOP ENVIRONMENT & KERNEL
echo   - Desktop Grid: 22x10 (220 cells) / 20x10 (200 cells) + DeX Windows
echo   - Kernel IPC: 127.0.0.1:49215 | HTTP: 127.0.0.1:49216
echo ============================================================================
echo.

cd /d "%~dp0"

if exist "LumaOS_1.0.2b.exe" (
    echo [LumaOS 1.0.2b] Starting LumaOS_1.0.2b.exe...
    start "Luma OS 1.0.2b" "LumaOS_1.0.2b.exe"
    exit /b 0
)

:: Fallback launch
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
