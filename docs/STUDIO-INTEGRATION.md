# SHINOBIWAN Studio integration contract

## But

Track-To-Market Engine est un module **AI-first** préparé pour une intégration track-centric dans `shinobione/shinobiwan-studio`.

Studio et Track-To-Market partagent React + Vite + TypeScript. Le frontend reste statique ; la génération de covers passe par un Worker Cloudflare séparé afin de ne jamais exposer de secret dans GitHub Pages.

## Topologie cible

```text
SHINOBIWAN Studio
  -> TrackToMarketView
  -> track-to-market-ai.jerryquinet.workers.dev
  -> Cloudflare Workers AI / FLUX.2 [klein] 4B
```

Le Worker doit être protégé par Cloudflare Access en production personnelle. L'origin autorisée côté CORS est `https://shinobione.github.io`.

## Intégration native recommandée

1. intégrer `releaseEngine.ts`, `aiArtwork.ts`, `studioBridge.ts` et les composants concernés dans Studio ;
2. créer un `TrackToMarketView` ou `ReleaseWorkspace` ;
3. l'ouvrir depuis le `TrackWorkspace` d'un `trackId` canonique ;
4. hydrater les inputs avec les métadonnées / lyrics Studio ;
5. enrichir la direction artistique avec SonicTrace quand disponible ;
6. conserver l'export ZIP local ;
7. toute écriture canonique future passe par Track Manager / services Studio existants.

## Données attendues

Minimum :

- `trackId`
- `title`
- `genres`

Souhaitables :

- lyrics canoniques `lyrics.txt`
- prompt Suno / audioStyle
- mood / instrumentation / énergie SonicTrace
- cover canonique comme référence optionnelle
- logo SHINOBIWAN

## Bridge standalone temporaire

La standalone accepte :

```text
?source=studio
&trackId=<canonical-track-id>
&title=<title>
&genres=Trap,R%26B
&audioStyle=<suno-style>
&style=<visual-direction>
&lyrics=<lyrics>
```

Les longues lyrics ne doivent pas être transportées durablement en query string.

Elle peut publier :

```ts
{
  type: 'shinobiwan:track-to-market:ready',
  version: '0.1.0'
}
```

et lors de l'export :

```ts
{
  type: 'shinobiwan:track-to-market:pack',
  version: '0.1.0',
  trackId,
  params,
  pack
}
```

## Garde-fous

- aucune clé API dans le client ;
- Worker AI séparé des Workers media/R2 existants ;
- ne pas modifier `launchpad-media` ou `launchpad-r2-api` pour cette fonctionnalité ;
- Cloudflare Access recommandé avant exposition de l'endpoint IA ;
- pas de duplication de `lyrics.txt` ;
- pas d'écriture R2 directe depuis Track-To-Market ;
- Canvas local = secours explicite uniquement ;
- ne jamais présenter le fallback Canvas comme une génération IA.
