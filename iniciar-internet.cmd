@echo off
cd /d "%~dp0"
title Registro Digital Animal - Internet
echo MODO INTERNET PUBLICO
echo.
echo Este modo deixa o app acessivel fora do seu Wi-Fi usando HTTPS.
echo Deixe esta janela aberta enquanto quiser usar na faculdade.
echo.
call npm run internet
echo.
echo O aplicativo publico foi encerrado. Pressione qualquer tecla para fechar.
pause >nul
