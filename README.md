# SHINOBIWAN Track-To-Market Engine

**Version 0.1.2 — Quality-first / Local-AI-ready / GitHub Pages / Studio-ready**

Track-To-Market transforme les informations d'un morceau en **release pack exploitable** : direction de cover, images, formats 16:9 / 1:1 / 9:16, copy SoundCloud/social, tags, teaser et ZIP.

## V0.1.2 — pivot qualité

Le smoke V0.1.1 a confirmé que FLUX.2 sur Workers AI est techniquement fiable mais **pas assez bon comme moteur de cover premium** comparé à ChatGPT Images / Google Flow / Gemini pour l'univers SHINOBIWAN.

La hiérarchie officielle devient donc :

1. **QUALITÉ — recommandé** : génération dans ChatGPT Images / Google Flow / Gemini, puis import dans Track-To-Market.
2. **LOCAL AI — gratuit et automatisable** : ComfyUI sur le PC / RTX, via un bridge localhost dédié.
3. **CLOUD DRAFT** : Cloudflare Workers AI / FLUX.2 uniquement pour explorer rapidement une direction, jamais présenté comme qualité finale.

```text
                         +--> ChatGPT / Flow / Gemini --> import premium
Track-To-Market / Studio |
                         +--> 127.0.0.1:8789 --> ComfyUI --> RTX local
                         |
                         +--> Cloudflare Worker --> FLUX.2 --> draft
                                      |
                                      v
                       deterministic title/logo branding
                                      |
                                      v
                           formats + teaser + ZIP
```

## Ce qui fonctionne

- Cover Prompt anglais éditable ;
- import jusqu'à 4 covers premium ;
- détection automatique du bridge Local AI ;
- contrat de génération locale compatible ComfyUI ;
- Cloudflare rétrogradé en mode brouillon `fast` ;
- titre exact + vrai logo composés localement, jamais redessinés par l'IA ;
- adaptation 1:1 / 9:16 déterministe depuis l'artwork source ;
- teaser 8 s WebM ;
- description SoundCloud ≤ 140 ;
- tags + caption ;
- export ZIP avec provenance du moteur ;
- autosave des inputs ;
- bridge `trackId` prêt pour SHINOBIWAN Studio.

## Moteur local Windows / NVIDIA

Voir [`local-ai/README.md`](local-ai/README.md).

Le repo fournit :

```text
local-ai/
├── bridge.py
├── START_LOCAL_AI.bat
├── CHECK_LOCAL_AI.bat
└── workflow_api.json   # à exporter depuis ComfyUI
```

Le bridge utilise l'API serveur locale ComfyUI et **aucune dépendance Python supplémentaire**. Le launcher réutilise le Python embarqué de ComfyUI Portable.

Le profil initial recommandé à tester est **Stable Diffusion 3.5 Medium**, puis nous validerons visuellement s'il mérite le rôle de moteur local final avant son intégration native dans Studio.

## Développement frontend

```bash
npm install
npm run dev
npm run build
```

## GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` publie `dist/` depuis `main`.

```text
https://shinobione.github.io/Track-To-Market-Engine/
```

## Cloudflare Worker — draft uniquement

Le Worker existant reste disponible mais n'est plus le chemin premium. Son déploiement demeure manuel via `Deploy Track-To-Market AI Worker` avec confirmation `DEPLOY`.

Aucune clé API n'est exposée dans le frontend.

## Sécurité locale

- bridge lié uniquement à `127.0.0.1` ;
- pas de LAN par défaut ;
- CORS limité à GitHub Pages SHINOBIWAN + développement local ;
- aucune clé OpenAI / Google / Cloudflare nécessaire pour Local AI ;
- les modèles restent sur la machine.

## Contrat Studio

Voir [`docs/STUDIO-INTEGRATION.md`](docs/STUDIO-INTEGRATION.md).

V0.1.2 prépare le contrat `localhost` sans encore modifier le repo Studio de production. Une fois le moteur local validé sur la RTX, Studio pourra détecter le bridge automatiquement et proposer le même workflow depuis le Track Workspace.

## Roadmap

- **V0.1.2** — quality-first + Local AI bridge + Cloud Draft ;
- **V0.1.3** — smoke réel RTX / choix définitif du workflow local / réglages qualité ;
- **V0.2** — intégration native SHINOBIWAN Studio ;
- ensuite : enrichissement SonicTrace, texte IA optionnel, premium feel et micro-interactions.
