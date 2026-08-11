# Track-To-Market Local AI — Windows / NVIDIA

V0.1.3 transforme le bridge local préparé en V0.1.2 en **setup réellement lançable en double-clic** pour Track-To-Market et, plus tard, SHINOBIWAN Studio.

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
workflow_api.json + SD3.5 Medium local
```

Le bridge Python n'utilise **aucune dépendance tierce** : il réutilise le Python embarqué de ComfyUI Portable.

## Installation recommandée — double clic

Lancer :

```text
INSTALL_LOCAL_AI.bat
```

Le script :

1. vérifie `curl.exe` et 7-Zip ;
2. télécharge le **ComfyUI Portable NVIDIA officiel** depuis les releases Comfy-Org, avec reprise de téléchargement ;
3. extrait automatiquement `ComfyUI_windows_portable/` ;
4. propose le téléchargement du checkpoint tout-en-un **SD3.5 Medium FP8 Scaled** recommandé dans les exemples officiels ComfyUI ;
5. affiche la Stability AI Community License avant téléchargement ;
6. vérifie le SHA256 du checkpoint ;
7. utilise le `workflow_api.json` TTME fourni dans ce dossier ;
8. lance ensuite `START_LOCAL_AI.bat`.

### Téléchargements à prévoir

Le checkpoint local fait environ **11.6 GB**. ComfyUI Portable ajoute également plusieurs Go. Prévoir une marge disque confortable avant installation.

Le fichier utilisé est :

```text
sd3.5_medium_incl_clips_t5xxlfp8scaled.safetensors
```

Destination :

```text
ComfyUI_windows_portable/ComfyUI/models/checkpoints/
```

Ce checkpoint tout-en-un évite d'avoir à gérer séparément `clip_l`, `clip_g` et `t5xxl` pour le premier smoke test.

## Workflow fourni

V0.1.3 fournit directement :

```text
workflow_api.json
```

Il utilise uniquement des nodes ComfyUI core :

- `CheckpointLoaderSimple`
- `ModelSamplingSD3`
- `CLIPTextEncode`
- `EmptySD3LatentImage`
- `KSampler`
- `VAEDecode`
- `SaveImage`

Réglage initial TTME :

- 1024×576 pour le 16:9 ;
- 36 steps ;
- CFG 4.5 ;
- sampler `euler` ;
- scheduler `sgm_uniform` ;
- shift SD3 = 3.

Ces réglages sont un **baseline de validation**, pas encore un preset artistique final SHINOBIWAN. Après le premier smoke test réel sur la RTX, ils pourront être ajustés selon qualité / temps / VRAM.

## Démarrage quotidien — double clic

Après installation, lancer seulement :

```text
START_LOCAL_AI.bat
```

Le launcher :

- vérifie si ComfyUI répond déjà ;
- démarre ComfyUI NVIDIA avec un profil prudent pour 12 GB VRAM (`--lowvram`, previews désactivées) ;
- démarre le bridge Track-To-Market sur `127.0.0.1:8789` ;
- ouvre `/health` dans le navigateur.

`CHECK_LOCAL_AI.bat` ouvre simplement la page de santé du bridge.

## Réglage RTX 3060 12 GB

Le profil initial privilégie la stabilité mémoire. Le premier objectif n'est pas de battre Flow sur le papier mais de vérifier :

1. chargement du checkpoint ;
2. génération 1024×576 sans OOM ;
3. temps réel par image ;
4. qualité artistique réelle sur le même prompt `Stick to You` ;
5. stabilité de quatre générations successives.

Si ce baseline est concluant, V0.1.4 pourra ajouter des presets, LoRA/styles et un pipeline d'upscale dédié.

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

## Licence modèle

Le modèle reste sous **Stability AI Community License**. Le setup ouvre la page de licence avant le téléchargement et demande une confirmation explicite. Aucun poids n'est stocké dans le repo GitHub.

## Statut V0.1.3

- installer ComfyUI : prêt ;
- téléchargement checkpoint : prêt ;
- vérification SHA256 : prête ;
- workflow API TTME : fourni ;
- launcher local : prêt ;
- bridge localhost : prêt ;
- **smoke test réel RTX : à faire sur la machine utilisateur avant de considérer le moteur local validé qualité**.
