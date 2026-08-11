import type { ArtworkVariation, GenerationParams } from '../types';

const LOCAL_AI_ENDPOINT = (import.meta.env.VITE_TTME_LOCAL_AI_ENDPOINT || 'http://127.0.0.1:8789').replace(/\/+$/, '');

export interface LocalAiHealth {
  ok: boolean;
  ready: boolean;
  service?: string;
  backend?: string;
  model?: string;
  gpu?: string;
  vram?: string;
  message?: string;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
  }
}

export async function getLocalAiHealth(timeoutMs = 1200): Promise<LocalAiHealth> {
  try {
    const response = await withTimeout(fetch(`${LOCAL_AI_ENDPOINT}/health`, { cache: 'no-store' }), timeoutMs);
    if (!response.ok) return { ok: false, ready: false, message: `Local bridge HTTP ${response.status}` };
    return await response.json() as LocalAiHealth;
  } catch {
    return { ok: false, ready: false, message: 'Local AI bridge offline' };
  }
}

export async function generateLocalAiArtwork(
  params: GenerationParams,
  prompt: string,
  seed: number,
  aspectRatio: ArtworkVariation['aspectRatio'] = '16:9',
): Promise<ArtworkVariation> {
  const sizes: Record<ArtworkVariation['aspectRatio'], [number, number]> = {
    '16:9': [1024, 576],
    '1:1': [1024, 1024],
    '9:16': [576, 1024],
  };
  const [width, height] = sizes[aspectRatio];
  const response = await fetch(`${LOCAL_AI_ENDPOINT}/api/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width, height, seed, title: params.title }),
  });
  const payload = await response.json().catch(() => ({})) as { dataUrl?: string; model?: string; error?: string };
  if (!response.ok || !payload.dataUrl) throw new Error(payload.error || `Local AI generation failed (${response.status}).`);
  return {
    id: `local-ai-${seed}-${Date.now()}`,
    dataUrl: payload.dataUrl,
    sourceDataUrl: payload.dataUrl,
    seed,
    aspectRatio,
    provider: 'local-ai',
    model: payload.model || 'ComfyUI local workflow',
  };
}
