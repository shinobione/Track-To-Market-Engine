# Track-To-Market Local AI — Windows / NVIDIA

V0.1.2 prépare un moteur local **gratuit par génération** pour Track-To-Market et, plus tard, SHINOBIWAN Studio.

## Architecture

```text
Track-To-Market / Studio (browser)
        |
        | http://127.0.0.1:8789
        v
local-ai/bridge.py
        |
        | ComfyUI Server API
        v
ComfyUI @ 127.0.0.1:8188
        |
        v
workflow_api.json + modèle local
```

Le bridge Python n'utilise **aucune dépendance tierce** : il réutilise le Python embarqué de ComfyUI Portable.

## Installation initiale

1. Télécharger **ComfyUI Portable Windows (NVIDIA)** depuis la documentation officielle ComfyUI.
2. Extraire le dossier sous :

```text
local-ai/ComfyUI_windows_portable/
```

Alternative : garder ComfyUI ailleurs et définir `COMFYUI_HOME` vers `ComfyUI_windows_portable`.
3. Installer un workflow image local dans ComfyUI. Profil de départ recommandé pour la RTX 3060 12 GB : **Stable Diffusion 3.5 Medium**.
4. Pour SD 3.5 Medium, accepter d'abord la Stability Community License sur le dépôt officiel du modèle. Les poids sont gated : le repo ne tente volontairement pas de contourner cette étape ni de stocker les modèles.
5. Charger le workflow officiel / template dans ComfyUI, vérifier qu'une image sort correctement.
6. Dans ComfyUI, exporter le workflow en **API format** et l'enregistrer ici sous :

```text
local-ai/workflow_api.json
```

Le bridge cherche automatiquement les nodes usuels : `CLIPTextEncode`, `KSampler`/`KSamplerAdvanced`, un node `*LatentImage` et `SaveImage`. Il injecte prompt, seed, largeur et hauteur, puis récupère l'image via l'API ComfyUI.

## Démarrage double-clic

Double-cliquer :

```text
START_LOCAL_AI.bat
```

Le launcher :
- vérifie si ComfyUI répond déjà ;
- démarre ComfyUI NVIDIA si nécessaire ;
- démarre le bridge Track-To-Market sur `127.0.0.1:8789` ;
- ouvre `/health` dans le navigateur.

`CHECK_LOCAL_AI.bat` ouvre simplement la page de santé du bridge.

## Réglage RTX 3060 12 GB

Le launcher privilégie la stabilité mémoire. Si nécessaire, utiliser les options ComfyUI `--lowvram` et désactiver les previews. Pour une génération finale, commencer à 1024×576 puis monter en résolution seulement après validation du workflow.

## Contrat HTTP local

### `GET /health`

Retourne :
- bridge online/offline ;
- ComfyUI online/offline ;
- workflow présent ou non ;
- GPU/VRAM lorsque ComfyUI les expose.

### `POST /api/image`

Payload :

```json
{
  "prompt": "art direction...",
  "width": 1024,
  "height": 576,
  "seed": 12345,
  "title": "Track title"
}
```

Réponse :

```json
{
  "dataUrl": "data:image/png;base64,...",
  "model": "ComfyUI local workflow",
  "seed": 12345
}
```

## Sécurité

- écoute uniquement sur `127.0.0.1` ;
- aucune ouverture LAN par défaut ;
- allowlist CORS limitée à GitHub Pages SHINOBIWAN et au dev local ;
- en-tête Private Network Access pour permettre au frontend HTTPS de joindre le loopback lorsque le navigateur le demande ;
- aucune clé Cloudflare, OpenAI ou Google n'est requise.

## Limite actuelle V0.1.2

Le bridge et le contrat sont prêts, mais **le modèle n'est pas téléchargé automatiquement** : SD 3.5 Medium exige l'acceptation explicite d'une licence côté fournisseur. On validera d'abord le workflow sur la RTX 3060 avant de déclarer le moteur local comme qualité finale.
