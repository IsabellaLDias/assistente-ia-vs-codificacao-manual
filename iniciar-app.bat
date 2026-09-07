@echo off
cd /d "%~dp0"
echo LAB02 - Abra http://127.0.0.1:3010 no navegador.
echo Mantenha esta janela aberta enquanto usar o app.
node web\server.mjs
pause
