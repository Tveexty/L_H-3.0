@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title LauncherHub 3.0 ^& Luma Core 1.0 — Быстрый запуск в один клик

echo ============================================================================
echo   🚀 LAUNCHERHUB 3.0 + LUMA SYSTEM CORE 1.0 (C# .NET 8 ^& PYTHON FLET)
echo ============================================================================
echo.

cd /d "%~dp0"

if exist "..\public\LauncherHab3.0_CSharp" (
    echo [Очистка] Удаление дубликата ..\public\LauncherHab3.0_CSharp...
    rmdir /s /q "..\public\LauncherHab3.0_CSharp"
)

where dotnet >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [Ошибка] Не найден .NET 8 SDK ^(команда dotnet^). Установите .NET 8.0 SDK Windows x64.
    pause
    exit /b 1
)

echo [1/2] Компиляция C# проекта LauncherHab3.csproj...
dotnet build LauncherHab3.csproj -c Release --nologo
if %ERRORLEVEL% NEQ 0 (
    echo [Ошибка] Сборка завершилась с ошибкой.
    pause
    exit /b 1
)

echo [2/2] Сборка 100%% успешна! Запуск демона Luma (127.0.0.1:49215), Лаунчера и Дашборда плиток...
dotnet run --project LauncherHab3.csproj -c Release --no-build
pause
