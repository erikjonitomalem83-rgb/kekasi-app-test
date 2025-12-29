@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: Path project KEKASI React (hardcoded)
set PROJECT_PATH=d:\KEKASI-react - Vercel Deployment

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║       KEKASI - Sync Status Monitor                     ║
echo ║       Localhost vs Vercel                              ║
echo ╚════════════════════════════════════════════════════════╝
echo.

:: Pindah ke folder project
cd /d "%PROJECT_PATH%"
if errorlevel 1 (
    echo [ERROR] Folder project tidak ditemukan!
    pause
    exit /b 1
)

echo [1/4] Mengambil data terbaru dari remote...
git fetch origin main >nul 2>&1

echo [2/4] Memeriksa perubahan lokal...
echo.
echo ──────────────────────────────────────────────────────────
echo  STATUS PERUBAHAN LOKAL
echo ──────────────────────────────────────────────────────────

:: Cek uncommitted changes
for /f %%i in ('git status --porcelain ^| find /c /v ""') do set CHANGES=%%i
if %CHANGES% GTR 0 (
    echo  [!] Ada %CHANGES% file yang belum di-commit:
    echo.
    git status --short
    echo.
) else (
    echo  [OK] Tidak ada perubahan lokal yang belum di-commit
)

echo.
echo ──────────────────────────────────────────────────────────
echo  PERBANDINGAN COMMIT
echo ──────────────────────────────────────────────────────────

:: Get local and remote commit hashes
for /f %%i in ('git rev-parse HEAD') do set LOCAL_COMMIT=%%i
for /f %%i in ('git rev-parse origin/main') do set REMOTE_COMMIT=%%i

:: Get short hashes for display
for /f %%i in ('git rev-parse --short HEAD') do set LOCAL_SHORT=%%i
for /f %%i in ('git rev-parse --short origin/main') do set REMOTE_SHORT=%%i

echo.
echo  Commit Lokal (Localhost) : %LOCAL_SHORT%
echo  Commit Remote (Vercel)   : %REMOTE_SHORT%
echo.

if "%LOCAL_COMMIT%"=="%REMOTE_COMMIT%" (
    echo  ╔═══════════════════════════════════════════════════╗
    echo  ║  [SINKRON] Localhost dan Vercel sudah sama!       ║
    echo  ╚═══════════════════════════════════════════════════╝
) else (
    :: Cek apakah local ahead atau behind
    for /f %%i in ('git rev-list origin/main..HEAD --count') do set AHEAD=%%i
    for /f %%i in ('git rev-list HEAD..origin/main --count') do set BEHIND=%%i
    
    if !AHEAD! GTR 0 (
        echo  ╔═══════════════════════════════════════════════════╗
        echo  ║  [!] LOCALHOST LEBIH BARU - !AHEAD! commit belum di-push  ║
        echo  ╚═══════════════════════════════════════════════════╝
        echo.
        echo  Commit yang belum di-push ke Vercel:
        git log origin/main..HEAD --oneline
    )
    
    if !BEHIND! GTR 0 (
        echo  ╔═══════════════════════════════════════════════════╗
        echo  ║  [!] VERCEL LEBIH BARU - !BEHIND! commit perlu di-pull    ║
        echo  ╚═══════════════════════════════════════════════════╝
        echo.
        echo  Commit yang belum di-pull ke localhost:
        git log HEAD..origin/main --oneline
    )
)

echo.
echo ──────────────────────────────────────────────────────────
echo  COMMIT TERAKHIR YANG SUDAH DI-DEPLOY (VERCEL)
echo ──────────────────────────────────────────────────────────
echo.
git log origin/main -1 --format="  Hash   : %%h%%n  Tanggal: %%ci%%n  Pesan  : %%s"

echo.
echo ──────────────────────────────────────────────────────────
echo  WAKTU PEMERIKSAAN: %date% %time%
echo ──────────────────────────────────────────────────────────
echo.

pause
exit /b 0
