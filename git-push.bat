@echo off
:: Path project KEKASI React (hardcoded)
set PROJECT_PATH=d:\KEKASI-react - Vercel Deployment

echo ========================================
echo     Git Quick Update - KEKASI React
echo ========================================
echo.
echo Project: %PROJECT_PATH%
echo.

:: Pindah ke folder project
cd /d "%PROJECT_PATH%"
if errorlevel 1 (
    echo ERROR: Folder project tidak ditemukan!
    pause
    exit /b 1
)

:: Add all changes
echo [1/3] Adding all changes...
git add .

:: Get commit message
echo.
set /p msg="Pesan commit (kosongkan untuk 'Quick update'): "
if "%msg%"=="" set msg=Quick update

:: Commit
echo.
echo [2/3] Committing: %msg%
git commit -m "%msg%"

:: Ask for push
echo.
set /p push="Push ke remote? (y/n): "
if /i "%push%"=="y" (
    echo [3/3] Pushing to remote...
    git push
)

echo.
echo ========================================
echo     Done!
echo ========================================
pause
exit
