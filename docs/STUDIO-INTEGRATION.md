# SHINOBIWAN Studio integration contract

## But

Track-To-Market Engine V0.1 reste autonome pour valider le workflow gratuitement. L'étape suivante consiste à l'intégrer dans `shinobione/shinobiwan-studio` comme module de production **track-centric**.

Studio est actuellement React + Vite + TypeScript. Track-To-Market utilise volontairement la même base technique.

## Intégration recommandée — native

Ne pas conserver un iframe comme architecture finale. Préférer :

1. déplacer/adapter `src/lib/releaseEngine.ts`, `artwork.ts` et `video.ts` dans Studio ;
2. créer un `TrackToMarketView` / `ReleaseWorkspace` côté Studio ;
3. l'ouvrir depuis le `TrackWorkspace` d'un `trackId` canonique ;
4. hydrater les inputs depuis les métadonnées/lyrics déjà présentes dans Studio ;
5. conserver l'export ZIP comme action locale ;
6. toute écriture canonique future doit passer par les services/autorités Studio existants, jamais directement depuis le moteur d'artwork.

## Bridge de transition

La version standalone accepte ces query params :

```text
?source=studio
&trackId=<canonical-track-id>
&title=<title>
&genres=Trap,R%26B
&audioStyle=<suno-style>
&style=<visual-direction>
&lyrics=<lyrics>
```

`lyrics` dans l'URL n'est prévu que pour des tests courts. Pour une intégration réelle, éviter les longues paroles en query string.

Quand elle est chargée dans un contexte parent, l'app peut émettre :

```ts
{
  type: 'shinobiwan:track-to-market:ready',
  version: '0.1.0'
}
```

Lors d'un export ZIP :

```ts
{
  type: 'shinobiwan:track-to-market:pack',
  version: '0.1.0',
  trackId,
  params,
  pack
}
```

Ce `postMessage` est un bridge de transition uniquement. Une intégration native supprimera ce besoin.

## Données attendues de Studio

Minimum :

- `trackId`
- `title`
- `genres`

Amélioration :

- lyrics canoniques `lyrics.txt`
- résumé / mood SonicTrace
- instrumentation / énergie / brightness
- prompt Suno ou style source s'il existe dans les métadonnées
- cover canonique comme inspiration optionnelle

## Garde-fous

- pas de clé API dans le client ;
- pas d'écriture directe R2/Track Manager depuis la standalone ;
- pas de duplication de `lyrics.txt` comme source de vérité ;
- ne pas modifier les assets canoniques sans action utilisateur explicite ;
- conserver le mode local gratuit même si un provider IA optionnel est ajouté plus tard.
