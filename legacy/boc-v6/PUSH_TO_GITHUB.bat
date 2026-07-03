@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   ECOREAN BOC — GitHub Push Script      ║
echo ╚══════════════════════════════════════════╝
echo.

cd /d "C:\Users\udune\ecorean-os"

echo [1/4] 현재 폴더 확인...
echo 위치: %CD%
echo.

echo [2/4] 변경 파일 확인...
git status
echo.

echo [3/4] 전체 파일 스테이징...
git add .
echo.

echo [4/4] 커밋 및 Push...
git commit -m "BOC v1.0 완성 — DB 260개 + 엔진 + TestRunner [2026-04-25]"
git push origin main

echo.
echo ✅ Push 완료!
echo 확인: https://github.com/udunext7-wq/ecorean-os
echo.
pause
