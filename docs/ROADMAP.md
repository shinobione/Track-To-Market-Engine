# Track-To-Market roadmap

## V0.1.4 — FINAL vs DRAFT

Status target: standalone product contract frozen before Studio integration.

- premium external import = FINAL
- Local AI = LOCAL DRAFT
- Cloudflare = CLOUD DRAFT
- explicit provenance in UI and ZIP
- DRAFT cannot publish to Studio
- FINAL can publish pack metadata through the existing bridge

## V0.2 — Studio bridge integration

First increment must minimize blast radius:

1. Add a Track-To-Market action from the canonical track workspace.
2. Pass `trackId`, title, genres and short metadata to the standalone.
3. Prefer a new tab / controlled bridge before native component copy.
4. Receive ready / pack messages.
5. Surface FINAL vs DRAFT status in Studio.
6. Do not write R2 or mutate canonical track metadata automatically.

## V0.2.x — controlled persistence

- route accepted FINAL assets through existing Studio / Track Manager services;
- persist release-pack metadata only where a canonical contract exists;
- retain provenance and source model/provider;
- no new parallel catalog authority.

## Local AI Lab

Independent experimentation track:

- compare local checkpoints on the same reference prompt;
- test LoRA / refine / upscale workflows;
- benchmark quality, VRAM and latency;
- promote a local model above DRAFT only after blind visual smoke against premium external generation.

## Later

- SonicTrace enrichment for mood / instrumentation / structure;
- optional AI-assisted release copy;
- richer teaser workflows;
- premium transitions, click feedback, glow and interaction polish;
- mobile/PWA workflow hardening.
