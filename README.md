# SHINOBIWAN Track-To-Market Engine

**Version 0.1.0 — local-first / GitHub Pages / Studio-ready**

Track-To-Market Engine transforme les informations d'un morceau en **release pack exploitable** sans backend obligatoire, sans clé API et sans abonnement.

Cette version est l'adaptation autonome du prototype `Outil FLOW — SHINOBIWAN Release Pack Generator`. Le prototype dépendait de `flow-sdk`; V0.1 remplace cette dépendance par des moteurs navigateur locaux afin d'être hébergeable gratuitement sur GitHub Pages et intégrable ensuite dans `shinobione/shinobiwan-studio`.

## Ce qui fonctionne en V0.1

- génération locale du **Cover Prompt** en anglais ;
- description SoundCloud limitée à **140 caractères** avec signature SHINOBIWAN ;
- **15–18 tags** normalisés en minuscules ;
- caption sociale en anglais ;
- génération procédurale de **4 artworks 16:9** en PNG, directement dans le navigateur ;
- adaptation cohérente du visuel sélectionné en **1:1** et **9:16**, avec seed conservée ;
- upload local du logo artiste ;
- teaser vidéo **8 secondes** encodé localement en WebM avec `MediaRecorder` quand le navigateur le permet ;
- export `.zip` : artworks, teaser éventuel, prompt, textes, tags et `release-pack.json` ;
- aucune image, lyric ou donnée du morceau n'est envoyée à un serveur par l'application ;
- responsive desktop/mobile ;
- contrat d'intégration préparé pour SHINOBIWAN Studio.

## Pourquoi ce choix

GitHub Pages ne fournit pas de backend secret. Exposer une clé d'API IA dans une SPA publique serait une mauvaise architecture. V0.1 privilégie donc :

1. **0 € d'hébergement** via GitHub Pages ;
2. **0 clé** dans le navigateur ;
3. une app réellement utilisable hors de Google Flow ;
4. une architecture qui pourra recevoir plus tard un provider IA optionnel sans réécrire l'UI.

Le moteur procédural n'essaie pas de se faire passer pour Nano Banana / Flow : ses artworks sont générés localement avec Canvas 2D. Le teaser est un WebM local, pas une génération vidéo IA.

## Développement local

```bash
npm install
npm run dev
```

Validation :

```bash
npm run build
```

## GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` construit Vite et publie `dist/` via GitHub Pages.

Le `base` Vite est :

```ts
/Track-To-Market-Engine/
```

Après merge sur `main`, activer **Settings → Pages → Source: GitHub Actions** si nécessaire. L'URL cible est :

`https://shinobione.github.io/Track-To-Market-Engine/`

## Entrées

- `title` — titre exact du morceau ;
- `genres[]` — genres/sous-genres ;
- `audioStyle` — prompt Suno / signature sonore ;
- `lyrics` — paroles / thèmes ;
- `style` — mood / vibe / direction artistique ;
- `logoBase64` — logo artiste local optionnel ;
- `trackId` — identifiant canonique optionnel injecté par Studio.

## Contrat Studio

Voir [`docs/STUDIO-INTEGRATION.md`](docs/STUDIO-INTEGRATION.md).

Le code métier est séparé de l'UI dans `src/lib/` pour permettre une intégration native future dans `shinobiwan-studio` sans iframe obligatoire.

## Architecture

```text
src/
├── App.tsx
├── types.ts
├── styles.css
├── components/
│   ├── Primitives.tsx
│   └── OutputDisplay.tsx
└── lib/
    ├── artwork.ts
    ├── releaseEngine.ts
    ├── studioBridge.ts
    └── video.ts
```

## Limites connues V0.1

- les textes sont générés par règles locales, pas par LLM ;
- les artworks sont procéduraux et non photoréalistes ;
- `MediaRecorder` varie selon le navigateur et produit du WebM, pas du MP4 ;
- le bridge Studio est préparé, mais aucune modification de `shinobiwan-studio` n'est incluse dans cette PR ;
- l'app n'écrit rien dans le catalogue canonique : l'intégration Studio devra rester explicite et respecter les autorités d'écriture existantes.

## Roadmap courte

- **V0.1** — standalone local-first + Pages + bridge contract ;
- **V0.2** — intégration native dans Studio, préremplissage depuis `trackId` canonique ;
- **V0.3** — provider IA optionnel côté backend privé si un jour souhaité, sans casser le mode local gratuit ;
- premium feel : transitions, feedback tactile/clic, glow contrôlé, micro-interactions et états de progression cohérents avec Studio.
