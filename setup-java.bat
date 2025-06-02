@echo off
setlocal enabledelayedexpansion

REM Verificar se o Java está instalado
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo Java nao encontrado! Por favor, instale o Java JDK 11 ou superior.
    echo Voce pode baixar em: https://adoptium.net/temurin/releases/?version=11
    pause
    exit /b 1
)

REM Encontrar o diretório de instalação do Java
for /f "tokens=*" %%i in ('where java') do set "JAVA_PATH=%%i"
set "JAVA_PATH=!JAVA_PATH:\bin\java.exe=!"

REM Configurar JAVA_HOME
setx JAVA_HOME "!JAVA_PATH!" /M
setx PATH "%PATH%;!JAVA_PATH!\bin" /M

echo Java configurado com sucesso!
echo JAVA_HOME: !JAVA_PATH!
echo.
echo Por favor, feche e reabra o terminal para que as alteracoes tenham efeito.
pause 