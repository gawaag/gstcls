@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installation des dependances...
  call npm install
)
echo.
echo S.A.M Agence  http://localhost:5173
echo API           http://localhost:8787
echo.
call npm run dev
