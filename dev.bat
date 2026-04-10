@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/3] 최신 코드 받는 중...
git pull origin claude/lathe-simulation-examples-gXg3G
if errorlevel 1 (
    echo.
    echo [오류] git pull 실패. 아래 명령어로 원격 주소를 설정하세요:
    echo git remote set-url origin https://[PAT]@github.com/DesignQuus/DesignQuus.git
    pause
    exit /b 1
)

echo.
echo [2/3] 패키지 확인 중...
call npm install --silent

echo.
echo [3/3] 개발 서버 시작 (http://localhost:5173)
call npm run dev
