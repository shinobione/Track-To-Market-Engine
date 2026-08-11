# SHINOBIWAN Track-To-Market Engine

**Version 0.1.0 — AI-first / GitHub Pages / Studio-ready**

Track-To-Market Engine transforme les informations d'un morceau en **release pack exploitable** : cover prompt, vraies covers IA, déclinaisons de formats, copy SoundCloud/social, tags, teaser et ZIP.

Cette application est le portage standalone du prototype `Outil FLOW — SHINOBIWAN Release Pack Generator`. Le prototype dépendait de `flow-sdk`; V0.1 remplace cette dépendance par une architecture compatible avec GitHub Pages **sans supprimer le moteur IA**.

## Architecture

```text
GitHub Pages / SHINOBIWAN Studio
        |
        | HTTPS + Cloudflare Access
        v
track-to-market-ai Worker
        |
        v
Cloudflare Workers AI
FLUX.2 [klein] 4B
```

Le frontend ne contient **aucune clé API**. Le Worker utilise le binding `AI` de Cloudflare.

### Moteur visuel principal

- modèle : `@cf/black-forest-labs/flux-2-klein-4b`
- vraie génération / édition d'image IA ;
- 4 variations 16:9 ;
- seed reproductible ;
- logo SHINOBIWAN comme image de référence ;
- adaptation 1:1 et 9:16 à partir de la cover sélectionnée ;
- Canvas 2D conservé uniquement comme **fallback explicite**, jamais substitué silencieusement à l'IA.

Cloudflare Workers AI fournit actuellement une allocation gratuite quotidienne. V0.1 vise donc un usage personnel normal à **0 € tant que cette allocation n'est pas dépassée**. Il ne faut pas présenter ce quota comme illimité.

## Ce qui fonctionne

- Cover Prompt en anglais ;
- description SoundCloud ≤ 140 caractères avec signature SHINOBIWAN ;
- 15–18 tags normalisés ;
- caption sociale ;
- 4 covers IA 16:9 via FLUX.2 ;
- adaptations IA 1:1 / 9:16 avec cover source comme référence ;
- logo artiste optionnel ;
- teaser 8 s local WebM ;
- export ZIP complet ;
- responsive desktop/mobile ;
- bridge `trackId` préparé pour SHINOBIWAN Studio.

## Développement

```bash
npm install
npm run dev
npm run build
```

Le build React/Vite reste indépendant du Worker.

## Backend IA Cloudflare

Configuration : [`worker/wrangler.toml`](worker/wrangler.toml)

Déploiement manuel :

```bash
npx wrangler@4.115.0 deploy --config worker/wrangler.toml
```

URL cible par défaut :

```text
https://track-to-market-ai.jerryquinet.workers.dev
```

Le frontend peut utiliser un autre endpoint avec :

```env
VITE_TTME_AI_ENDPOINT=https://example.workers.dev
```

### Déploiement GitHub Actions

Le workflow `.github/workflows/deploy-ai-worker.yml` attend dans l'environnement GitHub `cloudflare-production` :

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Ce sont les mêmes noms de secrets que les Workers SHINOBIWAN existants, mais les secrets GitHub restent configurés par repository/environnement.

## Sécurité

Le Worker applique une allowlist CORS pour `https://shinobione.github.io` et les origines de développement local.

Pour la production personnelle, placer `track-to-market-ai` derrière **Cloudflare Access**, comme les surfaces privées existantes. CORS ne remplace pas une authentification et ne doit pas être considéré comme une protection contre l'abus de quota.

## GitHub Pages

`.github/workflows/deploy-pages.yml` publie `dist/`.

URL cible :

```text
https://shinobione.github.io/Track-To-Market-Engine/
```

## Contrat Studio

Voir [`docs/STUDIO-INTEGRATION.md`](docs/STUDIO-INTEGRATION.md).

Le module reste `trackId`-aware et les écritures canoniques futures doivent continuer à passer par les autorités Studio/Track Manager existantes.

## Limites V0.1

- le Worker IA doit être déployé pour obtenir les vraies covers ;
- l'allocation Workers AI gratuite est limitée quotidiennement ;
- le fallback Canvas existe pour dépannage uniquement ;
- les textes sont encore générés localement par règles ; un endpoint LLM Workers AI pourra remplacer ce moteur sans modifier le contrat UI ;
- le teaser vidéo est local WebM, pas une génération vidéo IA ;
- aucune écriture R2/catalogue n'est faite par le moteur.

## Roadmap

- **V0.1** — standalone AI-first + FLUX.2 Worker + GitHub Pages ;
- **V0.2** — intégration native dans Studio et préremplissage canonique ;
- **V0.3** — texte IA via Workers AI + enrichissement SonicTrace ;
- ensuite : premium feel, transitions, glow contrôlé et micro-interactions cohérentes Studio.
