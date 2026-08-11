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
        v
FLUX.2 [klein] 4B
```

Le Worker est séparé de `launchpad-media` et `launchpad-r2-api`.

## État validé — 2026-08-11

- Worker `track-to-market-ai` déployé avec succès.
- Version Cloudflare : `2aba36ec-79ac-4734-afc8-8d9bafaa7ca3`.
- Binding `env.AI` confirmé par Wrangler.
- `/health` validé avec `@cf/black-forest-labs/flux-2-klein-4b`.
- Smoke test réel `/api/image` validé : 512×512, seed `4242`, image retournée correctement.
- GitHub Pages déployé avec succès depuis `main`.
- URL publique : `https://shinobione.github.io/Track-To-Market-Engine/`.

## Pourquoi ChatGPT Plus / Google AI Plus ne sont pas branchés directement

Les abonnements grand public donnent accès à la génération d'images dans leurs applications respectives, mais ne fournissent pas automatiquement des crédits API réutilisables par une PWA tierce.

Track-To-Market conserve donc deux chemins :

1. **Automatique** — FLUX.2 via Cloudflare Workers AI.
2. **Abonnements existants** — copier le Cover Prompt, générer l'image dans ChatGPT Images ou Google Flow, puis utiliser `Importer covers ChatGPT / Flow` dans Track-To-Market. Jusqu'à quatre images peuvent être importées dans la galerie.

Une cover importée est considérée comme une vraie cover IA externe. Elle peut être sélectionnée, prévisualisée et exportée. Si le Worker FLUX est disponible, `Adapter 1:1 + 9:16` utilise la cover importée comme image de référence et conserve son identité visuelle.

## Première mise en service Cloudflare

Dans GitHub :

1. Ouvrir `shinobione/Track-To-Market-Engine`.
2. Aller dans **Settings → Environments**.
3. Créer l'environnement `cloudflare-production` s'il n'existe pas.
4. Dans cet environnement, ajouter les secrets :
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
5. Le token doit permettre le déploiement de Workers sur le compte Cloudflare concerné et l'utilisation du binding Workers AI.
6. Ouvrir **Actions → Deploy Track-To-Market AI Worker → Run workflow**.
7. Saisir exactement `DEPLOY` dans le champ de confirmation.
8. Lancer le workflow et vérifier que le job `Deploy Worker` est vert.

Le workflow utilise :

```text
npx wrangler@4.115.0 deploy --config worker/wrangler.toml
```

Il exécute ensuite automatiquement un smoke test sur `/health` avec cinq tentatives avant d'échouer.

## Smoke test Worker

Après déploiement, ouvrir :

```text
https://track-to-market-ai.jerryquinet.workers.dev/health
```

La réponse doit indiquer `ok: true` et le modèle FLUX.2.

Ensuite tester depuis Track-To-Market :

1. saisir titre + genre ;
2. générer le Release Pack ;
3. cliquer `Créer 4 variations IA · FLUX.2` ;
4. sélectionner une cover ;
5. cliquer `Adapter 1:1 + 9:16` ;
6. exporter le ZIP.

## Réutiliser ChatGPT Images / Google Flow

Si tu veux consommer les générations déjà comprises dans tes abonnements grand public :

1. copier le `Cover Prompt` depuis Track-To-Market ;
2. le coller dans ChatGPT Images ou Google Flow ;
3. générer une à quatre propositions ;
4. enregistrer les images ;
5. revenir dans Track-To-Market ;
6. cliquer `Importer covers ChatGPT / Flow` et sélectionner jusqu'à quatre images ;
7. choisir la cover retenue ;
8. utiliser `Adapter 1:1 + 9:16` si FLUX est disponible, ou exporter directement la cover + les textes.

Le ZIP conserve `external-ai` comme provenance afin de ne pas confondre une image importée avec une génération Workers AI.

## GitHub Pages

Source : GitHub Actions depuis `main`.

URL publique :

```text
https://shinobione.github.io/Track-To-Market-Engine/
```

## Garde-fous

- aucune clé IA dans le frontend ;
- aucun secret dans GitHub Pages ;
- le Worker Track-To-Market reste séparé des Workers LaunchPAD ;
- pas d'écriture R2/canonique dans cette phase ;
- Canvas reste un fallback explicite uniquement ;
- les images importées depuis ChatGPT/Flow ne sont jamais prétendues avoir été générées par FLUX.
