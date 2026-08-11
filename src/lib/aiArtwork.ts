import type { ArtworkVariation, GenerationParams } from '../types';

type Ratio = ArtworkVariation['aspectRatio'];

const AI_ENDPOINT = (import.meta.env.VITE_TTME_AI_ENDPOINT || 'https://track-to-market-ai.jerryquinet.workers.dev').replace(/\/+$/, '');

const ratioSize: Record<Ratio, [number, number]> = {
  '16:9': [1024, 576],
  '1:1': [1024, 1024],
  '9:16': [576, 1024],
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload = ''] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/png';
  const bytes = Uint8Array.from(atob(payload), char => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

async function downscaleReference(dataUrl: string, maxDimension = 500): Promise<Blob> {
  const source = dataUrlToBlob(dataUrl);
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable for AI reference preparation.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to prepare AI reference image.')), 'image/png', 0.92);
  });
}

export async function getAiHealth(): Promise<{ ok: boolean; model?: string; allocation?: string }> {
  const response = await fetch(`${AI_ENDPOINT}/health`, { credentials: 'include' });
  if (!response.ok) throw new Error(`AI backend unavailable (${response.status}).`);
  return response.json();
}

export async function generateAiArtwork(
  params: GenerationParams,
  prompt: string,
  seed: number,
  aspectRatio: Ratio,
  references: string[] = [],
): Promise<ArtworkVariation> {
  const [width, height] = ratioSize[aspectRatio];
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('width', String(width));
  form.append('height', String(height));
  form.append('seed', String(Math.max(1, seed >>> 0)));

  const sourceReferences = [...references];
  if (params.logoBase64 && !sourceReferences.includes(params.logoBase64)) sourceReferences.push(params.logoBase64);

  for (let index = 0; index < Math.min(4, sourceReferences.length); index++) {
    const blob = await downscaleReference(sourceReferences[index]);
    form.append(`reference_${index}`, blob, `reference-${index}.png`);
  }

  const response = await fetch(`${AI_ENDPOINT}/api/image`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  const payload = await response.json().catch(() => ({})) as {
    dataUrl?: string;
    model?: string;
    error?: string;
  };

  if (!response.ok || !payload.dataUrl) {
    throw new Error(payload.error || `AI image generation failed (${response.status}).`);
  }

  return {
    id: `${seed}-${aspectRatio}-${Date.now()}`,
    dataUrl: payload.dataUrl,
    seed,
    aspectRatio,
    provider: 'workers-ai',
    model: payload.model || '@cf/black-forest-labs/flux-2-klein-4b',
  };
}

export function buildFormatPrompt(title: string, aspectRatio: Ratio): string {
  return [
    `Adapt the supplied selected cover artwork for the music track "${title}" to aspect ratio ${aspectRatio}.`,
    'Preserve the exact visual identity, subject, palette, lighting, typography hierarchy and SHINOBIWAN branding.',
    'Recompose intelligently for the new crop instead of stretching.',
    'Do not invent a different cover concept.',
  ].join(' ');
}
