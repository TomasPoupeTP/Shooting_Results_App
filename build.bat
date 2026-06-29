@echo off
REM ============================================================
REM   Shooting Results App  -  sestaveni .exe (Windows)
REM   Staci dvojklik. Vysledek: dist\ShootingResultsApp.exe
REM ============================================================
setlocal
cd /d "%~dp0"

echo ============================================
echo   Shooting Results App - build .exe
echo ============================================
echo.

REM --- 1) Najdi Python (py launcher nebo python) ---
set "PY=py"
where py >nul 2>nul || set "PY=python"
%PY% --version >nul 2>nul
if errorlevel 1 (
    echo [CHYBA] Python nenalezen.
    echo Nainstaluj Python z https://www.python.org a pri instalaci zaskrtni "Add Python to PATH".
    pause
    exit /b 1
)
echo Pouzivam Python:
%PY% --version
echo.

REM --- 2) Instalace zavislosti ---
echo Instaluji zavislosti (pyinstaller, reportlab)...
%PY% -m pip install --upgrade pip
%PY% -m pip install pyinstaller reportlab
if errorlevel 1 (
    echo [CHYBA] Instalace zavislosti selhala.
    pause
    exit /b 1
)
echo.

REM --- 3) Ikona (volitelna) ---
set "ICON_ARGS="
if exist "clay_pigeon.ico" (
    set "ICON_ARGS=--icon=clay_pigeon.ico"
    echo Ikona clay_pigeon.ico nalezena - bude pouzita.
) else (
    echo [POZOR] clay_pigeon.ico nenalezena - exe bude bez vlastni ikony.
)
echo.

REM --- 4) Uklid starych buildu ---
echo Cistim stare buildy...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist ShootingResultsApp.spec del /q ShootingResultsApp.spec
echo.

REM --- 5) Sestaveni .exe ---
echo Sestavuji .exe (chvili to potrva)...
%PY% -m PyInstaller --onefile --windowed %ICON_ARGS% --name "ShootingResultsApp" shooting_results_app.py
if errorlevel 1 (
    echo [CHYBA] Build selhal.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   HOTOVO!  Vysledek: dist\ShootingResultsApp.exe
echo ============================================
if exist dist start "" explorer "dist"
pause
