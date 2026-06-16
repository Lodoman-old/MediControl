@echo off
cd /d "%~dp0apps\api"

echo Starting Docker...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Docker no esta corriendo. Abre Docker Desktop e intenta de nuevo.
    pause
    exit /b 1
)

echo Waiting for DB...
timeout /t 10 /nobreak >nul

echo Applying Prisma migration...
npx prisma migrate dev --name add_report_schedule
if %errorlevel% neq 0 (
    echo ERROR: Migration fallo.
    pause
    exit /b 1
)

echo Running integration tests...
npx jest --no-coverage
if %errorlevel% equ 0 (
    echo ========================================
    echo ALL TESTS PASSED - SPRINT 5 COMPLETE!
    echo ========================================
) else (
    echo WARNING: Some tests failed. Check output above.
)

pause
