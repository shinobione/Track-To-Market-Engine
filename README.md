# SHINOBIWAN Track-To-Market Engine

**Version 0.1.4 — FINAL vs DRAFT / Quality-first / Local RTX / Studio-safe**

Track-To-Market transforme les informations d'un morceau en release pack : direction visuelle, covers, formats 16:9 / 1:1 / 9:16, copy SoundCloud/social, tags, teaser et ZIP.

## Contrat produit V0.1.4

Les smoke tests réels ont validé le pipeline local, mais pas la qualité premium du modèle local actuel. La hiérarchie officielle est donc :

1. **FINAL QUALITY** — ChatGPT Images / Google Flow / Gemini puis import dans Track-To-Market. Seul chemin automatiquement marqué FINAL.
2. **LOCAL DRAFT** — ComfyUI + RTX via le bridge localhost. Gratuit par génération, destiné à l'idéation.
3. **CLOUD DRAFT** — Cloudflare Workers AI / FLUX.2 pour exploration rapide uniquement.

```text
ChatGPT / Flow / Gemini -> import -> FINAL -> formats / teaser / ZIP -> Studio
Local bridge / ComfyUI ----------> DRAFT -> previews / DRAFT ZIP only
Cloudflare / FLUX.2 ------------> DRAFT -> previews / DRAFT ZIP only
```

### Finality gate

- chaque galerie et chaque cover indiquent FINAL ou DRAFT ;
- Local AI et Cloudflare ne deviennent jamais FINAL automatiquement ;
- un ZIP DRAFT conserve provider, modèle, mode et `releaseStatus=draft` ;
- un ZIP DRAFT n'est pas publié au bridge Studio ;
- seul un import premium peut produire un export FINAL et déclencher la publication Studio ;
- titre et vrai logo restent composés localement de façon déterministe.

## Ce qui fonctionne

- Cover Prompt anglais éditable ;
- import jusqu'à 4 covers premium FINAL ;
- Local Draft réel via `127.0.0.1:8789` -> ComfyUI `127.0.0.1:8188` -> RTX ;
- Cloud Draft via le Worker FLUX existant ;
- adaptation 1:1 / 9:16 déterministe ;
- teaser local 8 s WebM ;
- SoundCloud ≤ 140 caractères, tags, social caption ;
- export ZIP FINAL ou DRAFT avec provenance ;
- autosave des inputs ;
- bridge `trackId` prêt pour SHINOBIWAN Studio.

## Moteur local Windows / NVIDIA

Voir [`local-ai/README.md`](local-ai/README.md).

```text
local-ai/
├── INSTALL_LOCAL_AI.bat
├── START_LOCAL_AI.bat
├── CHECK_LOCAL_AI.bat
├── bridge.py
└── workflow_api.json
```

Le workflow SD3.5 Medium actuel est un baseline de DRAFT. L'amélioration qualité locale est traitée séparément afin de ne pas brouiller le chemin FINAL.

## Développement

```bash
npm install
npm run dev
npm run build
```

GitHub Pages : `https://shinobione.github.io/Track-To-Market-Engine/`

## Sécurité / périmètre

- aucune clé secrète dans GitHub Pages ;
- bridge local lié uniquement à `127.0.0.1` ;
- aucun write R2 direct depuis Track-To-Market ;
- Worker AI séparé des Workers media/R2 ;
- un asset DRAFT ne peut pas déclencher une publication finale Studio.

## Contrat Studio

Voir [`docs/STUDIO-INTEGRATION.md`](docs/STUDIO-INTEGRATION.md).

V0.1.4 fige le finality gate avant V0.2 : Studio peut préremplir Track-To-Market depuis un `trackId`, mais seul un pack FINAL premium peut être renvoyé comme résultat final.

## Roadmap

- **V0.1.4** — FINAL vs DRAFT + provenance stricte + Studio publish gate ;
- **V0.2** — intégration track-centric dans SHINOBIWAN Studio ;
- **V0.2.x** — persistance via les services Studio autorisés ;
- **Local AI Lab** — checkpoints / LoRA / refine workflows pour améliorer les drafts ;
- ensuite : enrichissement SonicTrace, texte IA optionnel, premium feel et micro-interactions.
