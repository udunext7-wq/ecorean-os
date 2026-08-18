@echo off
REM ECOREAN BOC — 로컬 정적 서버 자동 시작 (작업 스케줄러 "ECOREAN Local Server" 에서 호출)
REM 수동 실행과 동일: http-server <repo root> -p 8080 -c-1 --cors
REM 트리거: 로그온 시 + 절전 복귀(Kernel-Power 107) 시. 이미 :8080 이 살아있으면 아무것도 하지 않음.
REM 로그: <repo root>\logs\local-server.log
setlocal
set ROOT=%~dp0..
cd /d "%ROOT%"
if not exist "%ROOT%\logs" mkdir "%ROOT%\logs"
netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if %ERRORLEVEL%==0 (
  echo [%date% %time%] :8080 already listening, skip >> "%ROOT%\logs\local-server.log"
  exit /b 0
)
echo [%date% %time%] start http-server :8080 root=%CD% >> "%ROOT%\logs\local-server.log"
"C:\Program Files\nodejs\node.exe" "%ROOT%\node_modules\http-server\bin\http-server" . -p 8080 -c-1 --cors >> "%ROOT%\logs\local-server.log" 2>&1
echo [%date% %time%] http-server exited code %ERRORLEVEL% >> "%ROOT%\logs\local-server.log"
