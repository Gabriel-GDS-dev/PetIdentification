@echo off
cd /d "%~dp0"
title Identificacao Pet - Celular
echo MODO CELULAR POR WI-FI
echo.
echo Antes de continuar:
echo - Deixe o computador ligado.
echo - Conecte computador e celular na mesma rede Wi-Fi.
echo - Use no celular o endereco mostrado no terminal.
echo.
echo Iniciando banco e servidor...
echo.
call npm run celular
echo.
echo O aplicativo foi encerrado. Pressione qualquer tecla para fechar.
pause >nul
