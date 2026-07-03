@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════╗
echo ║   ECOREAN BOC — 로컬 폴더 구조 설정         ║
echo ╚══════════════════════════════════════════════╝
echo.

set DEST=C:\Users\udune\ecorean-os

echo 폴더 생성 중...
mkdir "%DEST%\src\master-db\seed" 2>nul
mkdir "%DEST%\src\master-db\brands" 2>nul
mkdir "%DEST%\src\estimate-engine" 2>nul
mkdir "%DEST%\src\shared" 2>nul
mkdir "%DEST%\src\test-runner" 2>nul
mkdir "%DEST%\docs" 2>nul

echo.
echo ✅ 폴더 구조 생성 완료
echo.
echo 이제 Downloads 폴더의 파일들을 아래 위치로 이동하세요:
echo.
echo  ECOREAN_BOC_v1.html             → %DEST%\
echo  ECOREAN_공정단가DB_v2.2.json     → %DEST%\src\master-db\seed\cost-items-v2.json
echo  ECOREAN_외주업체DB.json          → %DEST%\src\master-db\seed\subcontractors.json
echo  ECOREAN_하자유형DB.json          → %DEST%\src\master-db\seed\defect-types.json
echo  ECOREAN_공정일정템플릿.json      → %DEST%\src\master-db\seed\schedule-templates.json
echo  ECOREAN_자재DB.json             → %DEST%\src\master-db\seed\material-items.json
echo  ECOREAN_인건비DB_2025공식.json   → %DEST%\src\master-db\seed\labor-roles.json
echo  ECOREAN_브랜드DB.json           → %DEST%\src\master-db\brands\brand-price-db.json
echo  ECOREAN_TestRunner.js           → %DEST%\src\test-runner\test-runner.js
echo  ECOREAN_RuleEngine.ts           → %DEST%\src\estimate-engine\rule-engine.ts
echo  ECOREAN_DiagnosticsEngine.ts    → %DEST%\src\estimate-engine\diagnostics.ts
echo  ECOREAN_MarginEngine.ts         → %DEST%\src\estimate-engine\margin-engine.ts
echo  ECOREAN_ProcessSelector.ts      → %DEST%\src\estimate-engine\process-selector.ts
echo.
pause
