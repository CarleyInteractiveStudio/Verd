@echo off
echo =======================================================
echo == VidSpri Admin App Builder
echo =======================================================
echo.
echo This script will build the admin_server.py into a single .exe file.
echo It will be located in the 'admin_app\dist' folder when finished.
echo.

REM --- Step 1: Check if pip is available ---
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: 'pip' is not installed or not in your PATH.
    echo Please make sure Python is installed correctly (check "Add Python to PATH").
    pause
    exit /b
)

REM --- Step 2: Navigate to the admin_app directory ---
echo [STEP 1] Navigating to the admin_app directory...
cd /d "%~dp0\admin_app"
if %errorlevel% neq 0 (
    echo ERROR: Could not find the 'admin_app' directory in the same folder as this script.
    pause
    exit /b
)
echo Done.
echo.

REM --- Step 3: Install PyInstaller ---
echo [STEP 2] Installing PyInstaller...
pip install pyinstaller
echo Done.
echo.

REM --- Step 4: Run the build command ---
echo [STEP 3] Building the executable... This may take a moment.
pyinstaller --onefile --add-data "templates;templates" --add-data "static;static" admin_server.py
echo.

REM --- Step 5: Final message ---
if exist "dist\admin_server.exe" (
    echo =======================================================
    echo == BUILD SUCCESSFUL!
    echo =======================================================
    echo.
    echo You can find your file here:
    echo %cd%\dist\admin_server.exe
    echo.
    echo You can close this window now.
) else (
    echo =======================================================
    echo == BUILD FAILED!
    echo =======================================================
    echo.
    echo An error occurred. Please review the messages above.
    echo Make sure you have Python installed correctly.
)

echo.
pause
