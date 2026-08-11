@echo off
setlocal
cd /d "%~dp0"
title SHINOBIWAN Track-To-Market Local AI

echo =============================================================
echo   SHINOBIWAN Track-To-Market - Local AI Launcher v0.1.3
echo =============================================================
echo.

set "COMFY_ROOT=%~dp0ComfyUI_windows_portable"
if defined COMFYUI_HOME set "COMFY_ROOT=%COMFYUI_HOME%"
set "MODEL_NAME=sd3.5_medium_incl_clips_t5xxlfp8scaled.safetensors"
set "MODEL_PATH=%COMFY_ROOT%\ComfyUI\models\checkpoints\%MODEL_NAME%"

if not exist "%COMFY_ROOT%\ComfyUI\main.py" (
  echo [STOP] ComfyUI Portable introuvable.
  echo.
  echo Double-clique d'abord sur INSTALL_LOCAL_AI.bat.
  echo.
  pause
  exit /b 1
)

if not exist "%MODEL_PATH%" (
  echo [STOP] Checkpoint SD3.5 Medium introuvable:
  echo   %MODEL_PATH%
  echo.
  echo Double-clique sur INSTALL_LOCAL_AI.bat pour terminer l'installation.
  pause
  exit /b 1
)

if not exist "%~dp0workflow_api.json" (
  echo [STOP] workflow_api.json introuvable dans local-ai.
  echo Mets a jour le repo Track-To-Market puis relance.
  pause
  exit /b 1
)

set "PYTHON=%COMFY_ROOT%\python_embeded\python.exe"
if not exist "%PYTHON%" (
  echo [STOP] Python embarque ComfyUI introuvable: %PYTHON%
  pause
  exit /b 1
)

rem Probe TCP directement avec le Python embarque. Plus robuste qu'Invoke-WebRequest
rem sur certaines configurations Windows / PowerShell.
"%PYTHON%" -c "import socket; s=socket.create_connection(('127.0.0.1',8188),2); s.close()" >nul 2>&1
if errorlevel 1 (
  echo [1/2] Demarrage ComfyUI NVIDIA - profil RTX 12 GB...
  start "ComfyUI - TTME" /D "%COMFY_ROOT%" "%PYTHON%" -s "%COMFY_ROOT%\ComfyUI\main.py" --windows-standalone-build --lowvram --preview-method none
  echo      Attente du serveur ComfyUI... premier demarrage parfois long.
  for /L %%i in (1,1,240) do (
    timeout /t 2 /nobreak >nul
    "%PYTHON%" -c "import socket; s=socket.create_connection(('127.0.0.1',8188),2); s.close()" >nul 2>&1
    if not errorlevel 1 goto comfy_ready
  )
  echo [STOP] ComfyUI n'a pas ouvert le port 8188 apres environ 8 minutes.
  echo Regarde la fenetre ComfyUI pour voir l'erreur GPU / CUDA / VRAM eventuelle.
  pause
  exit /b 1
) else (
  echo [1/2] ComfyUI deja en ligne.
)

:comfy_ready
echo      ComfyUI detecte sur 127.0.0.1:8188.
"%PYTHON%" -c "import socket; s=socket.create_connection(('127.0.0.1',8789),2); s.close()" >nul 2>&1
if errorlevel 1 (
  echo [2/2] Demarrage du bridge Track-To-Market sur 127.0.0.1:8789...
  start "TTME Local AI Bridge" /D "%~dp0" "%PYTHON%" -u "%~dp0bridge.py"
  echo      Attente du bridge TTME...
  for /L %%i in (1,1,60) do (
    timeout /t 1 /nobreak >nul
    "%PYTHON%" -c "import socket; s=socket.create_connection(('127.0.0.1',8789),2); s.close()" >nul 2>&1
    if not errorlevel 1 goto bridge_ready
  )
  echo [STOP] Le bridge TTME n'a pas ouvert le port 8789 apres 60 secondes.
  echo Regarde la fenetre "TTME Local AI Bridge" pour l'erreur Python eventuelle.
  echo Tu peux aussi lancer manuellement:
  echo   "%PYTHON%" -u "%~dp0bridge.py"
  pause
  exit /b 1
) else (
  echo [2/2] Bridge Track-To-Market deja en ligne.
)

:bridge_ready
echo      Bridge TTME detecte sur 127.0.0.1:8789.
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8789/health"
echo.
echo OK - Garde les fenetres ComfyUI et TTME Local AI ouvertes pendant les generations.
echo Reviens ensuite dans Track-To-Market et clique sur LOCAL AI.
echo.
pause
