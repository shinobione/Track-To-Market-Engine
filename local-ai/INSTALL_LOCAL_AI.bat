@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title SHINOBIWAN Track-To-Market Local AI Installer v0.1.3

echo =============================================================
echo   SHINOBIWAN Track-To-Market - LOCAL AI INSTALLER v0.1.3
echo =============================================================
echo.
echo This installs a LOCAL image stack on your NVIDIA PC:
echo   ComfyUI Portable + SD3.5 Medium FP8 all-in-one + TTME workflow
echo.
echo No OpenAI / Google / Cloudflare API key is used for local generation.
echo.

set "COMFY_ROOT=%~dp0ComfyUI_windows_portable"
set "COMFY_ARCHIVE=%~dp0ComfyUI_windows_portable_nvidia.7z"
set "COMFY_URL=https://github.com/Comfy-Org/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia.7z"
set "MODEL_NAME=sd3.5_medium_incl_clips_t5xxlfp8scaled.safetensors"
set "MODEL_URL=https://huggingface.co/Comfy-Org/stable-diffusion-3.5-fp8/resolve/main/sd3.5_medium_incl_clips_t5xxlfp8scaled.safetensors?download=true"
set "MODEL_SHA256=1778e8857679042c176c21cd8a0da7b29bded68be018557477f84419df79bacf"
set "MODEL_PATH=%COMFY_ROOT%\ComfyUI\models\checkpoints\%MODEL_NAME%"

where curl.exe >nul 2>&1
if errorlevel 1 (
  echo [STOP] curl.exe is required. Windows 10/11 normally includes it.
  pause
  exit /b 1
)

set "SEVENZIP="
where 7z.exe >nul 2>&1 && set "SEVENZIP=7z.exe"
if not defined SEVENZIP if exist "%ProgramFiles%\7-Zip\7z.exe" set "SEVENZIP=%ProgramFiles%\7-Zip\7z.exe"
if not defined SEVENZIP if exist "%ProgramFiles(x86)%\7-Zip\7z.exe" set "SEVENZIP=%ProgramFiles(x86)%\7-Zip\7z.exe"

if not exist "%COMFY_ROOT%\ComfyUI\main.py" (
  if not defined SEVENZIP (
    echo [STOP] 7-Zip is not installed.
    echo Opening the official 7-Zip page and ComfyUI install docs...
    start "" "https://www.7-zip.org/"
    start "" "https://docs.comfy.org/installation/comfyui_portable_windows"
    pause
    exit /b 1
  )

  echo [1/4] Downloading official ComfyUI Portable NVIDIA...
  echo       The download is resumable if interrupted.
  curl.exe -L --fail --retry 5 --retry-delay 5 -C - -o "%COMFY_ARCHIVE%" "%COMFY_URL%"
  if errorlevel 1 (
    echo [STOP] ComfyUI download failed. Re-run this file to resume.
    pause
    exit /b 1
  )

  echo [2/4] Extracting ComfyUI...
  "%SEVENZIP%" x "%COMFY_ARCHIVE%" -o"%~dp0" -y
  if errorlevel 1 (
    echo [STOP] ComfyUI extraction failed.
    pause
    exit /b 1
  )

  if not exist "%COMFY_ROOT%\ComfyUI\main.py" (
    echo [STOP] Unexpected ComfyUI archive structure.
    pause
    exit /b 1
  )

  del /q "%COMFY_ARCHIVE%" >nul 2>&1
) else (
  echo [1/4] ComfyUI Portable already installed - OK.
  echo [2/4] Extraction not needed - OK.
)

if not exist "%COMFY_ROOT%\ComfyUI\models\checkpoints" mkdir "%COMFY_ROOT%\ComfyUI\models\checkpoints"

if not exist "%MODEL_PATH%" (
  echo.
  echo [3/4] Local image model required: SD3.5 Medium FP8 all-in-one.
  echo       Download size: approximately 11.6 GB.
  echo       License: Stability AI Community License.
  echo.
  echo Official ComfyUI recommends this convenient all-in-one SD3.5 Medium checkpoint.
  echo The license page will open now. Read it before continuing.
  start "" "https://stability.ai/license"
  echo.
  set /p "ACCEPT=Continue with the model download? Type OUI to continue: "
  if /I not "!ACCEPT!"=="OUI" (
    echo Model download skipped. You can re-run this installer later.
    pause
    exit /b 0
  )

  echo.
  echo Downloading %MODEL_NAME% ...
  echo Re-run this installer if the transfer is interrupted: curl will resume.
  curl.exe -L --fail --retry 8 --retry-delay 5 -C - -o "%MODEL_PATH%" "%MODEL_URL%"
  if errorlevel 1 (
    echo [STOP] Model download failed or was interrupted. Re-run to resume.
    pause
    exit /b 1
  )
) else (
  echo [3/4] SD3.5 Medium model already present - OK.
)

echo.
echo Verifying model SHA256. This can take a little while on an 11.6 GB file...
for /f "tokens=1" %%H in ('certutil -hashfile "%MODEL_PATH%" SHA256 ^| findstr /R /I "^[0-9a-f][0-9a-f]*$"') do set "HASH=%%H"
if /I not "!HASH!"=="%MODEL_SHA256%" (
  echo [STOP] SHA256 mismatch.
  echo Expected: %MODEL_SHA256%
  echo Found:    !HASH!
  echo Delete the model file and re-run the installer.
  pause
  exit /b 1
)
echo SHA256 OK.

if not exist "%~dp0workflow_api.json" (
  echo [STOP] TTME workflow_api.json is missing. Pull the latest repository files.
  pause
  exit /b 1
)

echo [4/4] Installation ready.
echo.
echo Next step: launching LOCAL AI...
echo.
call "%~dp0START_LOCAL_AI.bat"
