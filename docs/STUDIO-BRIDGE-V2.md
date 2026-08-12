# Track-To-Market — Studio Bridge V2

Version: **0.1.5**

The bridge supports both an embedded parent window and a Studio-opened child tab (`window.opener`). No wildcard target origin is used.

## Allowed Studio origins

- `https://shinobione.github.io`
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:4173`
- `http://127.0.0.1:4173`

## 1. Ready handshake

Track-To-Market sends:

```ts
{
  type: 'shinobiwan:track-to-market:ready',
  version: '0.1.5',
  accepts: 'shinobiwan:track-to-market:input'
}
```

The message is sent to an iframe parent and/or the opening Studio tab when present.

## 2. Studio input

Studio answers with:

```ts
{
  type: 'shinobiwan:track-to-market:input',
  version: '0.1.5',
  input: {
    source: 'studio',
    trackId,
    title,
    genres,
    audioStyle,
    style,
    lyrics
  }
}
```

Long lyrics are carried by `postMessage`, not the query string. Incoming payload fields are type-checked before being merged into the local draft.

The URL may still contain short bootstrap fields (`source`, `trackId`, `title`, `genres`) so the child tab is intelligible before the handshake completes.

## 3. FINAL return

Only the FINAL path calls the publication bridge. The return envelope is:

```ts
{
  type: 'shinobiwan:track-to-market:pack',
  version: '0.1.5',
  trackId,
  releaseStatus: 'final',
  artworkProvider: 'external-ai',
  artworkModel,
  mode: 'quality-import',
  params,
  pack
}
```

`logoBase64` is never copied back into the message payload.

Local Draft and Cloud Draft can still be exported locally, but never publish a Studio pack message.

## Security / authority

- event origins are allowlisted;
- `postMessage` target origins are explicit;
- Track-To-Market does not write R2;
- Track-To-Market does not call Track Manager mutation APIs;
- the first Studio integration stores returned FINAL data only in transient UI state for review;
- canonical persistence remains a later Studio/Track Manager-controlled step.
