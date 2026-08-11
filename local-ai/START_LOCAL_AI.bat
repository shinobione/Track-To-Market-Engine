@echo off
setlocal
cd /d "%~dp0"
title SHINOBIWAN Track-To-Market Local AI

echo =============================================================
echo   SHINOBIWAN Track-To-Market - Local AI Launcher v0.1.2
echo =============================================================
echo.

set "COMFY_ROOT=%~dp0ComfyUI_windows_portable"
if defined COMFYUI_HOME set "COMFY_ROOT=%COMFYUI_HOME%"

if not exist "%COMFY_ROOT%\ComfyUI\main.py" (
  echo [STOP] ComfyUI Portable introuvable.
  echo.
  echo Place le dossier ComfyUI_windows_portable dans:
  echo   %~dp0
  echo OU definis la variable COMFYUI_HOME vers ton installation existante.
  echo.
  echo Le README local-ai explique l'installation.
  pause
  exit /b 1
)

set "PYTHON=%COMFY_ROOT%\python_embeded\python.exe"
if not exist "%PYTHON%" (
  echo [STOP] Python embarque ComfyUI introuvable: %PYTHON%
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://127.0.0.1:8188/system_stats ^| Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo [1/2] Demarrage ComfyUI NVIDIA - profil RTX 12 GB...
  start "ComfyUI - TTME" /D "%COMFY_ROOT%" "%PYTHON%" -s "%COMFY_ROOT%\ComfyUI\main.py" --windows-standalone-build --lowvram --preview-method none
  echo      Attente du serveur ComfyUI...
  for /L %%i in (1,1,60) do (
    timeout /t 2 /nobreak >nul
    powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://127.0.0.1:8188/system_stats ^| Out-Null; exit 0 } catch { exit 1 }"
    if not errorlevel 1 goto comfy_ready
  )
  echo [STOP] ComfyUI n'a pas repondu dans le delai.
  pause
  exit /b 1
) else (
  echo [1/2] ComfyUI deja en ligne.
)

:comfy_ready
echo [2/2] Demarrage du bridge Track-To-Market sur 127.0.0.1:8789...
start "TTME Local AI Bridge" "%PYTHON%" "%~dp0bridge.py"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8789/health"
echo.
echo OK - Garde les deux fenetres ouvertes pendant les generations.
echo Tu peux revenir dans Track-To-Market / STUDIO.
echo.
pause
