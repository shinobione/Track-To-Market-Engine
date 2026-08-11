# Changelog

## 0.1.3 — 2026-08-11

### Local AI installation
- Added `local-ai/INSTALL_LOCAL_AI.bat` for a guided Windows/NVIDIA setup.
- Installer downloads the official ComfyUI Portable NVIDIA package with resumable transfers and extracts it locally.
- Added the ready-to-run `local-ai/workflow_api.json` baseline for SD3.5 Medium.
- Installer offers the Comfy-Org `sd3.5_medium_incl_clips_t5xxlfp8scaled.safetensors` checkpoint after explicit license acknowledgement and verifies its published SHA256.
- Hardened `START_LOCAL_AI.bat` with ComfyUI/model/workflow preflight checks, duplicate-process avoidance, a longer GPU startup window, robust TCP readiness probes for ports `8188` / `8789`, and bridge readiness waiting before opening the health page.
- Hardened local bridge health detection: `/system_stats` now has a realistic timeout and falls back to the lighter `/queue` endpoint during slow first CUDA/model initialization.
- Added a shared Track-To-Market `TM` favicon to GitHub Pages / PWA metadata and to the localhost bridge (`/favicon.ico`).
- Rewrote `local-ai/README.md` around the double-click installation path and real-user smoke-test criteria.

### Validation status
- Branch CI passed npm install, TypeScript typecheck and Vite build before merge.
- The local model is **not yet declared final-quality**: the next gate is a real machine smoke test and visual comparison of the same `Stick to You` prompt against ChatGPT Images / Google Flow.
- No Studio, LaunchPAD, R2 or Cloudflare Worker code changed in this milestone.

## 0.1.2 — 2026-08-11

### Product direction
- **ChatGPT Images / Google Flow / Gemini import is now the recommended final-cover path.**
- Cloudflare FLUX is explicitly downgraded to **Cloud Draft** and uses the fast profile to preserve quota.
- Added a first-class **Local AI** path intended for automatic, zero-per-generation-cost inference on the user's NVIDIA GPU.

### Local AI bridge
- Added `local-ai/bridge.py`, a zero-third-party-dependency localhost bridge over the official ComfyUI server API.
- Added `START_LOCAL_AI.bat` double-click launcher using ComfyUI Portable's embedded Python.
- Added `CHECK_LOCAL_AI.bat` health shortcut.
- Bridge binds to `127.0.0.1:8789`, proxies ComfyUI on `127.0.0.1:8188`, auto-detects standard workflow nodes and returns generated images as data URLs.
- Added CORS / Private-Network headers for the SHINOBIWAN GitHub Pages origin and local dev origins.
- Launcher uses `--lowvram --preview-method none` as a conservative starting profile for 12 GB-class NVIDIA cards.
- Stable Diffusion 3.5 Medium documented as the initial workflow candidate; model download remains manual because its official repository is license-gated.

### Frontend
- New provider hierarchy strip: **Quality / Local AI / Cloud Draft**.
- Automatic localhost health detection every 15 seconds.
- Premium prompt copy + multi-image import flow promoted to the primary action.
- Local AI generation produces four covers when the bridge reports ready.
- 1:1 and 9:16 are now deterministic local adaptations from the clean source artwork instead of spending cloud inference on format conversion.
- ZIP metadata records `external-ai`, `local-ai`, or `workers-ai` provenance and V0.1.2 mode.
- Existing title/logo deterministic compositor remains authoritative.

### Safety / scope
- No Studio production code changed in V0.1.2.
- No R2 or LaunchPAD worker changed.
- Cloudflare Worker remains available but is no longer marketed as final quality.
- Local AI does not expose a LAN listener by default.

## 0.1.1 — 2026-08-11

### Quality / artwork
- Default automatic artwork profile moved from FLUX.2 [klein] 4B to **FLUX.2 [dev] at 8 steps** for higher-fidelity output.
- FLUX now generates **artwork backgrounds only**; it is no longer asked to redraw the title or SHINOBIWAN logo.
- Exact track title + real uploaded artist logo are composited deterministically in-browser after generation.
- Raw AI artwork is retained separately from the branded cover so 1:1 / 9:16 adaptations can use a clean source reference.
- Four base covers now receive four distinct art-direction modifiers instead of differing only by seed.
- Prompting explicitly avoids generic AI music-cover clichés (random speakers, headphones, equalizers, vinyl, etc.) unless requested by the user's direction.

### Moderation / reliability
- Cloudflare output-moderation rejections are classified as `CONTENT_FLAGGED` rather than being reported as a dead AI engine.
- A flagged variant is automatically retried with a new seed and a safer abstract/object-focused direction.
- One rejected slot no longer aborts the entire four-cover batch.
- Format adaptation receives the same moderation-aware retry behavior.

### UX
- Added **Régénérer les 4** controls directly in the cover gallery; no page refresh is needed.
- New generation rounds use a fresh random nonce, so rerolling does not replay the same deterministic seeds.
- Inputs are autosaved locally in the browser and restored after refresh when possible.
- Bright native vertical scrollbars were replaced by thin dark scrollbars matching the app.
- Textareas no longer expose the ugly native resize handle.
- `Nouveau pack` was renamed to `Recalculer le pack` to make its behavior explicit.
- Added non-blocking notices for recovered moderation retries.

### Cost note
- FLUX.2 [dev] is more expensive in Neurons than Klein 4B. V0.1.1 uses 8 steps as a quality/cost compromise intended to keep roughly one normal personal release-pack workflow within Cloudflare's current free daily allocation.
- Klein 4B remains available in the Worker as the fast profile/fallback.

## 0.1.0 — 2026-08-11

### Added
- Vite + React + TypeScript standalone application.
- GitHub Pages deployment workflow.
- Cloudflare Workers AI backend skeleton with `AI` binding.
- **FLUX.2 [klein] 4B as the primary artwork engine**.
- Four 16:9 AI variations per generation.
- AI reference-based 1:1 and 9:16 adaptations from the selected cover.
- Optional SHINOBIWAN logo reference.
- Explicit local Canvas fallback; never silently substituted for AI.
- Eight-second local WebM teaser generation via MediaRecorder.
- Complete ZIP export including provider/model metadata.
- Targeted prompt / SoundCloud / caption regeneration.
- Generation cancellation control.
- Responsive UI and Studio bridge contract.
- Manual GitHub Actions workflow for the AI Worker.

### Changed from FLOW prototype
- Removed runtime dependency on `flow-sdk`.
- Replaced Flow media picker with browser file input.
- Replaced Flow download with browser-native Blob downloads.
- Replaced Nano Banana runtime calls with a real external AI provider path through Cloudflare Workers AI.
- Kept the browser Canvas engine only as an explicit degraded fallback.
- Preserved an architecture that can be integrated natively into SHINOBIWAN Studio.

### Verified deployment — 2026-08-11
- Dedicated Worker deployed successfully with `env.AI` binding.
- Worker version ID: `2aba36ec-79ac-4734-afc8-8d9bafaa7ca3`.
- `/health` smoke test passed with FLUX.2 [klein] 4B reported as the active image model.
- Real `/api/image` smoke test passed at 512×512 with seed `4242`.
- Generated response contained a valid image data URL (`172727` characters in the smoke run).
- GitHub Pages build and deployment passed for commit `ae7f56dec9b9fedf3ef592e65dbc785555cf1922`.
- Published URL: `https://shinobione.github.io/Track-To-Market-Engine/`.

### Cost / quota note
- GitHub Pages hosting remains free.
- Cloudflare Workers AI currently includes a daily free allocation; it is not unlimited.
- The app must not claim `0 API / 0 credits` when the AI engine is active.
