# SHINOBIWAN Track-To-Market Engine

**Version 0.1.1 — AI-first / GitHub Pages / Studio-ready**

Track-To-Market Engine transforme les informations d'un morceau en **release pack exploitable** : cover prompt, vraies covers IA, déclinaisons de formats, copy SoundCloud/social, tags, teaser et ZIP.

Cette application est le portage standalone du prototype `Outil FLOW — SHINOBIWAN Release Pack Generator`. Le prototype dépendait de `flow-sdk`; la version standalone remplace cette dépendance par une architecture compatible avec GitHub Pages **sans supprimer le moteur IA**.

## Architecture

```text
GitHub Pages / SHINOBIWAN Studio
        |
        v
track-to-market-ai Worker
        |
        v
Cloudflare Workers AI
FLUX.2 [dev] quality / FLUX.2 [klein] 4B fast
        |
        v
Browser branding compositor
exact title + real SHINOBIWAN logo
```

Le frontend ne contient **aucune clé API**. Le Worker utilise le binding `AI` de Cloudflare.

### Moteur visuel principal — V0.1.1

- profil automatique : `@cf/black-forest-labs/flux-2-dev`, **8 steps** ;
- profil rapide disponible côté Worker : `@cf/black-forest-labs/flux-2-klein-4b` ;
- 4 variations 16:9 avec directions artistiques réellement différentes ;
- l'IA génère l'**artwork sans texte ni logo** ;
- le titre exact et le vrai logo uploadé sont ensuite composés localement dans le navigateur ;
- la source IA sans branding est conservée pour les adaptations 1:1 et 9:16 ;
- Canvas 2D reste uniquement un **fallback explicite**.

Cette séparation évite de demander au modèle d'inventer une typographie ou de redessiner le logo, deux causes majeures de covers visuellement « AI cheap ».

### Modération / retries

Une sortie Cloudflare signalée comme `flagged` n'est plus traitée comme une panne globale. Le Worker la remonte comme `CONTENT_FLAGGED`; le frontend retente automatiquement la variante avec :

- une nouvelle seed ;
- une direction plus abstraite / object-focused ;
- puis continue les autres slots si une variante reste rejetée.

Un rejet ne doit donc plus imposer de refresh ni détruire le batch entier.

## Ce qui fonctionne

- Cover Prompt en anglais ;
- description SoundCloud ≤ 140 caractères avec signature SHINOBIWAN ;
- 15–18 tags normalisés ;
- caption sociale ;
- 4 covers IA 16:9 ;
- **reroll des 4 covers sans refresh** ;
- autosave local des inputs ;
- adaptations IA 1:1 / 9:16 depuis la source artwork propre ;
- logo artiste optionnel avec rendu exact ;
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

Le workflow reste manuel et exige la confirmation `DEPLOY` avant publication du Worker.

## Coût / allocation gratuite

Cloudflare Workers AI fournit actuellement une allocation gratuite quotidienne limitée. FLUX.2 [dev] consomme plus de Neurons que Klein 4B ; V0.1.1 utilise 8 steps comme compromis qualité/coût afin de viser environ un workflow normal de release pack par jour dans l'allocation gratuite actuelle.

Ce quota n'est **pas** présenté comme illimité.

## Sécurité

Le Worker applique une allowlist CORS pour `https://shinobione.github.io` et les origines de développement local.

Pour une exposition durable, Cloudflare Access reste recommandé. CORS ne remplace pas une authentification et ne protège pas à lui seul le quota IA contre l'abus.

## GitHub Pages

`.github/workflows/deploy-pages.yml` publie `dist/`.

URL :

```text
https://shinobione.github.io/Track-To-Market-Engine/
```

## Contrat Studio

Voir [`docs/STUDIO-INTEGRATION.md`](docs/STUDIO-INTEGRATION.md).

Le module reste `trackId`-aware et les écritures canoniques futures doivent continuer à passer par les autorités Studio/Track Manager existantes.

## Limites actuelles

- l'allocation Workers AI gratuite est limitée quotidiennement ;
- les textes sont encore générés localement par règles ;
- le teaser vidéo est local WebM, pas une génération vidéo IA ;
- aucune écriture R2/catalogue n'est faite par le moteur ;
- le draft navigateur est best-effort : si un logo encodé est trop lourd pour `localStorage`, les champs texte restent prioritaires.

## Roadmap

- **V0.1.1** — qualité covers, retry modération, reroll, autosave, branding exact ;
- **V0.2** — intégration native dans Studio et préremplissage canonique ;
- **V0.3** — texte IA via Workers AI + enrichissement SonicTrace ;
- ensuite : premium feel, transitions, glow contrôlé et micro-interactions cohérentes Studio.
