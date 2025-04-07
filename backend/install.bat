
@echo off
echo FlexiFlow Monitoring System - Installer
echo ======================================
echo.

REM Check for Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: This installer requires administrator privileges.
    echo Please right-click the installer and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

echo Checking NPM installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: NPM is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ which includes NPM.
    echo.
    pause
    exit /b 1
)

echo Creating environment configuration...
if not exist .env (
    echo Creating default .env file...
    copy .env.example .env
    echo JWT_SECRET=%RANDOM%%RANDOM%%RANDOM% >> .env
)

echo Installing required packages...
call npm install

if %errorlevel% neq 0 (
    echo Error: Failed to install required NPM packages.
    echo Please check your internet connection and try again.
    echo.
    pause
    exit /b 1
)

echo Creating required directories...
if not exist logs mkdir logs
if not exist backups mkdir backups
if not exist reports mkdir reports

echo Installing FlexiFlow as a Windows service...
call npm run install-service

if %errorlevel% neq 0 (
    echo Error: Failed to install Windows service.
    echo Please check the logs for more information.
    echo.
    pause
    exit /b 1
)

echo.
echo Installation complete!
echo FlexiFlow Monitoring System has been installed as a Windows service.
echo The service is configured to start automatically when Windows starts.
echo.
echo You can access the application at: http://localhost:3000
echo Default login: admin / admin123
echo.
echo IMPORTANT: Please change the default password after logging in!
echo.
pause
