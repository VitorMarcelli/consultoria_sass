@echo off
cd /d "%~dp0"

echo Iniciando o servidor backend (NestJS)...
start "Backend" cmd /k "cd backend && npm run start:dev"

echo Iniciando o servidor frontend (Next.js)...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Servidores iniciados em novas janelas!
pause
