# SHINOBIWAN Studio integration contract

## But

Track-To-Market Engine est un module track-centric préparé pour une intégration dans `shinobione/shinobiwan-studio` sans devenir une nouvelle autorité de données parallèle.

Le contrat V0.1.4 ajoute une règle importante avant V0.2 : **les assets DRAFT ne doivent jamais être confondus avec les assets FINAL**.

## Topologie actuelle

```text
SHINOBIWAN Studio
  -> Track-To-Market standalone / future native view
       -> FINAL QUALITY: external premium import
       -> LOCAL DRAFT: 127.0.0.1:8789 -> ComfyUI -> RTX
       -> CLOUD DRAFT: dedicated Workers AI Worker -> FLUX.2
```

Le frontend reste statique. Les providers DRAFT sont des outils d'idéation. Le chemin FINAL repose aujourd'hui sur un import premium validé par l'utilisateur.

## Intégration V0.2 recommandée

1. ajouter une entrée Track-To-Market depuis le Track Workspace d'un `trackId` canonique ;
2. hydrater titre / genres / Suno prompt / direction / lyrics depuis les données Studio existantes ;
3. ouvrir d'abord la standalone via son bridge afin de limiter le blast radius ;
4. ne publier un résultat vers Studio que lorsque `releaseStatus === 'final'` ;
5. refuser toute promotion automatique d'un provider `local-ai` / `workers-ai` en asset canonique ;
6. conserver Track Manager / services Studio comme seules autorités d'écriture canoniques ;
7. intégrer nativement les composants seulement après smoke réel du bridge track-centric.

## Données d'entrée attendues

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

## Bridge standalone

La standalone accepte actuellement :

```text
?source=studio
&trackId=<canonical-track-id>
&title=<title>
&genres=Trap,R%26B
&audioStyle=<suno-style>
&style=<visual-direction>
&lyrics=<lyrics>
```

Les longues lyrics ne doivent pas être transportées durablement en query string. V0.2 devra préférer `postMessage` / état partagé du workspace ou un contrat de bridge dédié.

La standalone annonce sa disponibilité via :

```ts
{
  type: 'shinobiwan:track-to-market:ready',
  version: '0.1.x'
}
```

Lors d'un export FINAL uniquement, elle peut publier :

```ts
{
  type: 'shinobiwan:track-to-market:pack',
  version: '0.1.x',
  trackId,
  params,
  pack
}
```

Le ZIP V0.1.4 inclut en plus :

```ts
{
  version: '0.1.4',
  releaseStatus: 'final' | 'draft',
  artworkProvider,
  artworkModel,
  mode,
  publishToStudio: boolean
}
```

## Finality gate

- `external-ai` importé manuellement = éligible FINAL ;
- `local-ai` = DRAFT ;
- `workers-ai` = DRAFT ;
- DRAFT peut être adapté en 1:1 / 9:16 et utilisé pour un teaser de preview ;
- DRAFT peut être exporté en ZIP local explicitement nommé ;
- DRAFT ne déclenche jamais `publishPackToStudio` ;
- aucune écriture canonique ne doit dépendre d'un simple clic de génération.

## Garde-fous

- aucune clé API dans le client ;
- Worker AI séparé des Workers media/R2 existants ;
- ne pas modifier `launchpad-media` ou `launchpad-r2-api` pour cette fonctionnalité ;
- pas de duplication de `lyrics.txt` ;
- pas d'écriture R2 directe depuis Track-To-Market ;
- pas de provider DRAFT promu silencieusement en FINAL ;
- Local AI reste loopback-only par défaut ;
- toute persistance future passe par les services Studio / Track Manager existants.

## V0.2 — premier incrément sûr

Le premier incrément Studio doit rester petit :

```text
Track Workspace
  -> action "Track-To-Market"
  -> ouverture de la standalone avec trackId + métadonnées courtes
  -> réception du ready/pack bridge
  -> affichage du statut FINAL/DRAFT
  -> aucune écriture canonique automatique
```

Une fois ce smoke validé, la vue pourra être intégrée nativement sans changer le contrat de finalité.
