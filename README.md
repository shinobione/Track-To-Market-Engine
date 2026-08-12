# SHINOBIWAN Track-To-Market Engine

**Version 0.2.0 — Release Orchestrator / Premium Handoff / Studio Bridge V3**

Track-To-Market n'est plus défini comme un simple générateur de prompt + ZIP. Il orchestre le passage **Track context → creative brief → provider premium → import FINAL fidèle → assets de release → staging Studio**.

## Contrat produit V0.2

La hiérarchie qualité reste stricte :

1. **PREMIUM FINAL** — ChatGPT Images / Google Flow / Gemini puis import dans Track-To-Market.
2. **LOCAL DRAFT** — ComfyUI + RTX via le bridge localhost, pour idéation gratuite.
3. **CLOUD DRAFT** — Cloudflare Workers AI / FLUX.2 pour exploration rapide uniquement.

```text
Studio track context
      ↓
Track-To-Market creative brief
      ↓
ChatGPT / Flow / Gemini + logo reference
      ↓
FINAL artwork import (preserved by default)
      ↓
optional brand treatment / 1:1 / 9:16 / teaser / release texts / ZIP
      ↓
Studio Bridge V3: FINAL preview + provenance + release pack
```

## Premium provider handoff

V0.2 introduit deux stratégies explicites :

### Integrated — défaut

Le provider premium est chargé de composer l'artwork fini :

- titre exact du morceau intégré à la composition ;
- logo SHINOBIWAN comme branding secondaire lorsqu'un vrai logo a été fourni ;
- pas de faux pseudo-texte décoratif ;
- pas de postulat « background puis gros titre blanc collé après ».

Lorsqu'un logo est uploadé dans TTM, le prompt contient explicitement :

`ATTACH THAT LOGO FILE AS A REFERENCE IMAGE`

Le fichier peut être téléchargé directement depuis le handoff TTM et est également inclus dans le ZIP FINAL.

### Clean

Le provider génère uniquement l'artwork sans titre/logo. Le branding peut ensuite être choisi explicitement dans TTM.

## Import FINAL non destructif

Une cover premium importée arrive en mode :

**`Original FINAL`**

TTM conserve l'image telle quelle. Aucun titre, logo, watermark, gradient ou autre compositing n'est imposé automatiquement.

Trois traitements sont disponibles :

- **Original FINAL** — aucune modification ;
- **Logo only** — ajoute uniquement le vrai logo fourni ;
- **Editorial** — traitement typographique local optionnel, réversible.

La source importée reste conservée séparément et est réincluse dans le ZIP lorsqu'un traitement est appliqué.

## Formats et assets

- import jusqu'à 4 covers premium FINAL ;
- adaptations 1:1 / 9:16 en **safe-fit** afin de préserver la composition complète, le titre et le logo au lieu de les recadrer silencieusement ;
- teaser local 8 s WebM ;
- SoundCloud ≤ 140 caractères ;
- 15–18 tags ;
- social caption ;
- ZIP FINAL/DRAFT avec provenance détaillée ;
- `Provider_Handoff.txt` ;
- logo de référence lorsqu'il existe ;
- source premium originale lorsqu'un traitement local a été appliqué ;
- `release-pack.json` V0.2.

## Studio Bridge V3

Bridge version : **0.2.0**.

Studio hydrate TTM avec le `trackId` canonique et le contexte long via `postMessage`.

Un export FINAL renvoie désormais :

- `trackId` ;
- `releaseStatus=final` ;
- provider / modèle ;
- stratégie artwork ;
- traitement de branding ;
- release pack texte ;
- **preview JPEG compressée de la vraie cover FINAL sélectionnée**.

Cela permet à Studio de review réellement l'artwork reçu au lieu d'afficher uniquement un statut textuel.

Aucune persistance canonique automatique n'est introduite par V0.2. Track Manager / services Studio restent les seules autorités de write.

## DRAFT engines

### Local AI

```text
127.0.0.1:8789 -> ComfyUI 127.0.0.1:8188 -> RTX
```

Voir [`local-ai/README.md`](local-ai/README.md).

Le workflow SD3.5 Medium actuel reste officiellement un moteur d'idéation DRAFT.

### Cloud Draft

Cloudflare FLUX reste disponible pour explorer rapidement une direction mais ne peut jamais être promu silencieusement en FINAL.

## Développement

```bash
npm install
npm run check:v0.2
npm run build
```

GitHub Pages : `https://shinobione.github.io/Track-To-Market-Engine/`

## Sécurité / périmètre

- aucune clé secrète dans GitHub Pages ;
- bridge local lié uniquement à `127.0.0.1` ;
- aucun write R2 direct depuis Track-To-Market ;
- Worker AI séparé des Workers media/R2 ;
- les providers Local/Cloud restent DRAFT-only ;
- un logo absent ou cassé n'est jamais remplacé par un faux logo inventé ;
- une cover FINAL importée n'est jamais altérée sans action explicite ;
- toute persistance future passe par les services Studio / Track Manager existants.

## Régression V0.2

`scripts/test-v0.2-release-orchestrator.mjs` verrouille :

- instruction explicite d'attacher le logo comme référence ;
- stratégies Integrated / Clean ;
- import FINAL non destructif ;
- absence de rebranding implicite dans les formats ;
- ZIP avec handoff/logo/source ;
- Studio preview + provenance Bridge V3.

## Roadmap

- **V0.2.0** — Release Orchestrator + Provider Handoff + import FINAL fidèle + Bridge V3 preview ;
- **Studio Build 47** — consommation de la preview/provenance V3 dans Track Workspace ;
- **Phase 7** — progression track-centric gardée par Studio ;
- **Local AI Lab** — checkpoints / LoRA / refine workflows pour améliorer les drafts ;
- persistance canonique uniquement via une future action Studio explicite et protégée.
