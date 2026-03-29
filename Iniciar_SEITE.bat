@echo off
setlocal
title SEITE - Lanzador de Aplicacion

echo ============================================================
echo   SEITE - SISTEMA DE ESTIMACION DE INSTALACIONES ELECTRICAS
echo ============================================================
echo.
echo Iniciando preparacion...
echo.

:: 1. Verificar Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo encontrar Node.js.
    echo Por favor, asegurese de que Node.js este instalado.
    echo Visite: https://nodejs.org/
    pause
    exit /b
)

:: 2. Instalar dependencias si no existen
if not exist "node_modules\" (
    echo [INFO] Esta es la primera vez que inicia la aplicacion.
    echo [INFO] Instalando componentes necesarios... por favor espere.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Hubo un problema al instalar los componentes.
        pause
        exit /b
    )
    echo [OK] Componentes instalados con exito.
    echo.
)

:: 3. Informar al usuario sobre la URL y el mensaje de exito
echo ============================================================
echo   LA APLICACION SE ESTA INICIANDO
echo ============================================================
echo.
echo 1. Se abrira su navegador automaticamente en:
echo    http://localhost:5173
echo.
echo 2. Deje esta ventana abierta mientras usa la aplicacion.
echo.
echo 3. Una vez en la web, podra ver un mensaje de confirmacion
echo    en la "Consola del Desarrollador" (F12) que dice:
echo    "SEITE: Default materials catalog seeded."
echo.
echo ============================================================
echo.

:: 4. Abrir navegador y ejecutar servidor
start http://localhost:5173
npm run dev

pause
