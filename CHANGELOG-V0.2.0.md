# Track-To-Market V0.2.0 — Release Orchestrator

Date: 2026-08-12

## Real-user findings addressed

- The uploaded SHINOBIWAN logo was visible in TTM but the premium handoff did not explicitly tell Flow / ChatGPT / Gemini to attach and use that file as a reference image.
- Premium imports were automatically modified by a large generic white title treatment, reducing the quality of otherwise strong external artwork.
- Studio received FINAL text/provenance but not a visual preview of the actual selected cover.

## Product changes

### Premium handoff

- Added `Integrated` strategy as the default.
- Added `Clean` artwork-only strategy.
- When a logo exists, the prompt now explicitly requires `ATTACH THAT LOGO FILE AS A REFERENCE IMAGE`.
- The prompt requires exact logo fidelity and forbids redraw/respell/reinterpretation.
- Integrated mode asks the premium provider to compose the exact title and supplied logo inside the artwork itself.

### Non-destructive FINAL import

- Premium imports now enter TTM as `Original FINAL` without any automatic compositing.
- Optional treatments are explicit and reversible: `Original FINAL`, `Logo only`, `Editorial`.
- Missing logo references never produce invented pseudo-branding.
- Original imported artwork remains retained separately when a treatment is applied.

### Format adaptation

- Removed implicit rebranding from 1:1 / 9:16 adaptation.
- Added safe-fit adaptation with softened background fill so the complete selected composition remains visible.

### Export

FINAL ZIP now includes:

- selected 16:9 cover;
- original imported 16:9 source when a treatment was applied;
- 1:1 / 9:16 derivatives when generated;
- teaser when generated;
- SHINOBIWAN logo reference when supplied;
- `Provider_Handoff.txt`;
- release texts;
- V0.2 provenance in `release-pack.json`.

### Studio Bridge V3

- Protocol version advanced to `0.2.0`.
- FINAL return now includes a compressed preview of the actual selected artwork.
- Return envelope also includes artwork strategy and branding mode.
- No canonical write path was added.

## Safety

- Local AI remains DRAFT-only.
- Cloudflare AI remains DRAFT-only.
- No R2 write from TTM.
- No Track Manager mutation from TTM.
- No automatic Studio persistence.

Rollback anchor:

`safety/pre-v0.2-release-orchestrator-20260812`

Regression guard:

`npm run check:v0.2`
