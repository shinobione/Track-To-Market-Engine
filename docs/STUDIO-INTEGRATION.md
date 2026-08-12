# SHINOBIWAN Studio integration contract

## But

Track-To-Market Engine est un module track-centric intégré à `shinobione/shinobiwan-studio` sans devenir une nouvelle autorité de données parallèle.

V0.2 conserve le finality gate et fait évoluer le bridge en **V3 / protocol 0.2.0** afin que Studio reçoive une vraie preview de la cover FINAL sélectionnée, pas seulement des textes/provenance.

## Topologie

```text
SHINOBIWAN Studio
  -> Track-To-Market standalone
       -> PREMIUM FINAL: external provider + faithful import
       -> LOCAL DRAFT: 127.0.0.1:8789 -> ComfyUI -> RTX
       -> CLOUD DRAFT: Workers AI -> FLUX.2
  <- FINAL preview + provenance + release pack
```

Le frontend TTM reste statique. Local/Cloud restent des moteurs DRAFT. Le chemin FINAL repose sur un artwork premium validé/importé par l'utilisateur.

## Entrée Studio -> TTM

Studio ouvre la standalone avec les métadonnées courtes :

```text
?source=studio
&trackId=<canonical-track-id>
&title=<title>
&genres=Trap,R%26B
```

Après handshake, le contexte complet voyage par `postMessage` :

```ts
{
  type: 'shinobiwan:track-to-market:input',
  version: '0.2.0',
  input: {
    trackId,
    title,
    genres,
    audioStyle,
    style,
    lyrics,
    artworkStrategy?
  }
}
```

Les longues lyrics ne sont donc pas transportées dans l'URL.

## Ready handshake

TTM annonce :

```ts
{
  type: 'shinobiwan:track-to-market:ready',
  version: '0.2.0',
  accepts: 'shinobiwan:track-to-market:input',
  capabilities: ['full-context', 'final-preview', 'provenance']
}
```

Les origins restent allowlistés. Studio vérifie aussi que le message vient exactement de la `Window` enfant qu'il a ouverte.

## FINAL return — Bridge V3

Uniquement lors d'un export FINAL :

```ts
{
  type: 'shinobiwan:track-to-market:pack',
  version: '0.2.0',
  trackId,
  releaseStatus: 'final',
  artworkProvider,
  artworkModel,
  mode: 'quality-import',
  artworkStrategy: 'integrated' | 'clean',
  brandingMode: 'preserve' | 'logo-only' | 'editorial',
  previewDataUrl, // JPEG compressée de l'artwork FINAL sélectionné
  params,
  pack
}
```

`previewDataUrl` sert uniquement au staging/review dans Studio. Elle n'autorise aucune écriture canonique automatique.

## Premium logo reference

Le logo uploadé dans TTM n'est pas transmis magiquement au provider externe par le prompt texte.

V0.2 rend donc la règle explicite :

- TTM indique que le fichier logo doit être **attaché comme image de référence** dans Flow / ChatGPT / Gemini ;
- le prompt exige la fidélité au logo fourni ;
- le fichier logo est téléchargeable depuis TTM ;
- le ZIP FINAL contient aussi le logo de référence ;
- sans référence logo, le provider et le compositor local ne doivent pas inventer un faux logo.

## Import FINAL / branding

Un artwork premium importé arrive en `brandingMode=preserve` : aucune modification automatique.

Les traitements `logo-only` et `editorial` sont optionnels et réversibles. La source importée est conservée séparément.

## Finality gate

- `external-ai` importé manuellement = éligible FINAL ;
- `local-ai` = DRAFT ;
- `workers-ai` = DRAFT ;
- DRAFT peut être adapté/exporté localement ;
- DRAFT ne déclenche jamais le bridge FINAL ;
- aucun clic de génération ne produit une écriture canonique.

## Autorité de données

TTM ne :

- write pas R2 ;
- n'appelle pas Track Manager pour muter un track ;
- ne remplace pas une cover canonique ;
- ne persiste pas automatiquement un release pack.

Studio / Track Manager restent les seules surfaces autorisées pour une future action explicite de persistance.

## V0.2 Studio consumer

Le consumer Studio doit :

1. vérifier origin + child window + matching `trackId` ;
2. rejeter tout retour non-FINAL ;
3. afficher la preview réelle ;
4. afficher provider/model/strategy/branding provenance ;
5. garder le résultat en mémoire pour review ;
6. ne proposer aucune mutation implicite.

Le premier consumer V3 est prévu pour Studio Build 47.
