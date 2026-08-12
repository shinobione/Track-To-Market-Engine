# Track-To-Market → native Studio Release Campaign migration

Date: 2026-08-12

## Decision

After real-user review of TTM V0.2 + Studio Build 47, the standalone product boundary is no longer the preferred daily workflow.

The useful release-campaign behavior is being absorbed into `shinobiwan-studio` Track Workspace → Release Pack.

## Why

The standalone surface still behaved primarily as an intermediary:

```text
Studio → prompt/provider handoff → TTM import → ZIP → Studio
```

That extra hop is not justified when Studio already owns canonical Track context and the useful operations are campaign orchestration/review rather than a new specialist authority.

## Native visual contract

Studio Build 48 uses one accepted 16:9 MASTER and two sibling anchored derivatives:

```text
MASTER 16:9
  ├── coherent 1:1  using MASTER 16:9 as provider reference
  └── coherent 9:16 using MASTER 16:9 as provider reference
```

The vertical variant is not chained from the square variant.

This restores the proven sequential-reference behavior from the original Flow prototype rather than TTM V0.2's local safe-fit adaptation.

## TTM status during migration

Do **not** delete or break TTM V0.2 yet.

Until Studio Build 48 passes real-user smoke, this repository remains:

- rollback/reference implementation;
- historical proof of standalone provider handoff and FINAL import preservation;
- Local AI / Cloudflare DRAFT lab;
- source of release-pack behavior that may still need to be migrated.

Do not develop a second competing Release Campaign UX here while Build 48 is being validated.

## Deprecation gate

TTM may be marked deprecated for normal Studio workflow only after Studio proves:

- logo-reference handoff;
- faithful MASTER 16:9 import;
- anchored coherent 1:1 generation/import;
- anchored coherent 9:16 generation/import;
- three-format review;
- local draft restoration after refresh;
- release campaign ZIP export;
- no canonical R2/Track Manager regression.

## What remains potentially useful after deprecation

- isolated Local AI experimentation;
- Worker/FLUX DRAFT fallback experiments;
- historical implementation reference;
- emergency rollback page.

Canonical write authority remains outside TTM.
