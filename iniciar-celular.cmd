@echo off
cd /d "%~dp0"
title Identificacao Pet - Celular
echo MODO ANDROID INSTALAVEL
echo.
echo Antes de continuar:
echo - Ative a Depuracao USB no Android.
echo - Conecte o celular pelo cabo USB.
echo - Aceite a autorizacao exibida no celular.
echo.
echo Iniciando banco, servidor e conexao Android...
echo O navegador do celular sera aberto automaticamente.
echo.
call npm.cmd run celular
echo.
echo O aplicativo foi encerrado. Pressione qualquer tecla para fechar.
pause >nul
