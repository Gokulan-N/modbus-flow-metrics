
@echo off
echo FlexiFlow Monitoring System - Uninstaller
echo ========================================
echo.

REM Check for Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: This uninstaller requires administrator privileges.
    echo Please right-click the uninstaller and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo This will uninstall the FlexiFlow Monitoring System Windows service.
echo The application files will remain in place.
echo.
set /p CONFIRM=Are you sure you want to continue? (Y/N): 

if /i "%CONFIRM%" neq "Y" (
    echo Uninstallation cancelled.
    echo.
    pause
    exit /b 0
)

echo Uninstalling FlexiFlow Windows service...
call npm run uninstall-service

echo.
echo Uninstallation complete!
echo The FlexiFlow Monitoring System service has been removed.
echo Application data and configuration remain intact.
echo.
echo To completely remove the application, delete this directory.
echo.
pause
