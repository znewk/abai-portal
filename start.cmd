@echo off
rem Запуск портала локально: dev-сервер Vite и открытие в браузере
cd /d %~dp0
if not exist node_modules call npm install
start "" http://localhost:5173/
npm run dev
