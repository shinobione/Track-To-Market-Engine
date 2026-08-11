# Track-To-Market Engine — AI setup

## Architecture retenue

```text
GitHub Pages / SHINOBIWAN Studio
        |
        v
track-to-market-ai.jerryquinet.workers.dev
        |
        v
Cloudflare Workers AI
        |
        +--> FLUX.2 [dev] · quality · 8 steps (default)
        +--> FLUX.2 [klein] 4B · fast fallback
        |
        v
Browser branding compositor
exact track title + real artist logo
```

Le Worker est séparé de `launchpad-media` et `launchpad-r2-api`.

## Pourquoi le branding n'est plus généré par l'IA

À partir de V0.1.1, FLUX ne reçoit plus la mission de dessiner le titre exact ou le logo SHINOBIWAN. Il génère uniquement l'artwork de fond.

Le navigateur ajoute ensuite :

- le titre exact ;
- le vrai logo uploadé, sans le redessiner ;
- une zone de contraste légère pour conserver la lisibilité.

La source artwork sans branding est conservée dans chaque variation afin que les déclinaisons 1:1 / 9:16 puissent être recomposées proprement par l'IA avant de recevoir le même branding exact.

## Profils Workers AI

### `quality` — défaut

- modèle : `@cf/black-forest-labs/flux-2-dev` ;
- `steps=8` ;
- `guidance=3.3` ;
- utilisé par le frontend V0.1.1.

### `fast`

- modèle : `@cf/black-forest-labs/flux-2-klein-4b` ;
- 4 steps fixes côté modèle ;
- conservé comme profil rapide/fallback côté Worker.

Le profil `quality` consomme davantage de Neurons. Le choix de 8 steps vise un compromis permettant approximativement un workflow personnel complet dans l'allocation gratuite quotidienne actuelle, selon le nombre de générations/retries effectués.

## Gestion du `output flagged` / code 303

Le message Cloudflare `Your output has been flagged` ne signifie pas que le Worker est mort.

Le Worker V0.1.1 classe ce cas comme :

```text
HTTP 422
code: CONTENT_FLAGGED
```

Le frontend :

1. garde les variantes déjà générées ;
2. change la seed ;
3. retente avec une direction plus abstraite / object-focused et explicitement non-explicite ;
4. continue le batch même si un slot reste rejeté après retries.

Le message UI ne doit donc plus afficher `Moteur IA indisponible` pour un simple rejet de sortie.

## État validé V0.1 — 2026-08-11

- Worker `track-to-market-ai` déployé avec succès.
- Version Cloudflare initiale : `2aba36ec-79ac-4734-afc8-8d9bafaa7ca3`.
- Binding `env.AI` confirmé par Wrangler.
- `/health` validé.
- Smoke test réel `/api/image` validé : 512×512, seed `4242`, image retournée correctement.
- GitHub Pages déployé avec succès depuis `main`.
- URL publique : `https://shinobione.github.io/Track-To-Market-Engine/`.

La version Worker V0.1.1 doit être redéployée après merge afin d'activer le profil FLUX.2 [dev] et la classification `CONTENT_FLAGGED`.

## Pourquoi ChatGPT Plus / Google AI Plus ne sont pas branchés directement

Les abonnements grand public donnent accès à la génération d'images dans leurs applications respectives, mais ne fournissent pas automatiquement des crédits API réutilisables par une PWA tierce.

Track-To-Market conserve donc deux chemins :

1. **Automatique** — FLUX.2 via Cloudflare Workers AI.
2. **Abonnements existants** — copier le Cover Prompt, générer l'artwork dans ChatGPT Images ou Google Flow, puis utiliser `Importer covers ChatGPT / Flow` dans Track-To-Market.

Le Cover Prompt V0.1.1 demande volontairement **un artwork sans texte ni logo**. Après import, Track-To-Market applique lui-même le titre et le logo exacts.

## Déploiement Cloudflare

Dans GitHub :

1. ouvrir `shinobione/Track-To-Market-Engine` ;
2. **Settings → Environments → cloudflare-production** ;
3. vérifier les secrets `CLOUDFLARE_ACCOUNT_ID` et `CLOUDFLARE_API_TOKEN` ;
4. ouvrir **Actions → Deploy Track-To-Market AI Worker → Run workflow** ;
5. choisir `main` ;
6. saisir exactement `DEPLOY` ;
7. lancer le workflow.

Le workflow utilise Node 22 et :

```text
npx wrangler@4.115.0 deploy --config worker/wrangler.toml
```

Il exécute ensuite automatiquement un smoke test `/health`.

## Test utilisateur V0.1.1

1. saisir titre + genre + direction ;
2. générer/recalculer le Release Pack ;
3. cliquer `Créer 4 variations IA · Qualité` ;
4. vérifier la diversité des 4 artworks ;
5. vérifier que titre et logo sont parfaitement lisibles et identiques entre variantes ;
6. cliquer `Régénérer 4 nouvelles covers` sans refresh ;
7. sélectionner une cover ;
8. cliquer `Adapter 1:1 + 9:16` ;
9. exporter le ZIP ;
10. rafraîchir volontairement la page et vérifier que les inputs du brouillon sont restaurés.

## Garde-fous

- aucune clé IA dans le frontend ;
- aucun secret dans GitHub Pages ;
- le Worker Track-To-Market reste séparé des Workers LaunchPAD ;
- pas d'écriture R2/canonique dans cette phase ;
- Canvas reste un fallback explicite uniquement ;
- les images importées depuis ChatGPT/Flow restent identifiées `external-ai` dans le ZIP.
