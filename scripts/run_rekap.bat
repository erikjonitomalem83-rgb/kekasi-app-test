@echo off
cd /d "D:\KEKASI-react - Vercel Deployment"
echo Running Auto Rekap Script...
node scripts/auto_rekap.js >> scripts/rekap_log.txt 2>&1
echo Done.
pause
