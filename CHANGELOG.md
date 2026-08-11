# Changelog

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

### Cost / quota note
- GitHub Pages hosting remains free.
- Cloudflare Workers AI currently includes a daily free allocation; it is not unlimited.
- The app must not claim `0 API / 0 credits` when the AI engine is active.
