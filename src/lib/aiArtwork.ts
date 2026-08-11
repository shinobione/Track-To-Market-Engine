import type { ArtworkVariation, GenerationParams } from '../types';
import { composeArtworkBranding } from './branding';

type Ratio = ArtworkVariation['aspectRatio'];
export type AiProfile = 'quality' | 'fast';

const AI_ENDPOINT = (import.meta.env.VITE_TTME_AI_ENDPOINT || 'https://track-to-market-ai.jerryquinet.workers.dev').replace(/\/+$/, '');

const ratioSize: Record<Ratio, [number, number]> = {
  '16:9': [1024, 576],
  '1:1': [1024, 1024],
  '9:16': [576, 1024],
};

const variationDirections = [
  'cinematic editorial composition, one memorable visual idea, restrained negative space, sophisticated lighting, no generic music hardware',
  'conceptual art direction using tactile materials, unusual scale and premium fashion-campaign restraint, no generic speakers or headphones',
  'minimal high-end campaign frame with bold geometry, controlled asymmetry and distinctive color blocking, no stock poster look',
  'surreal but believable visual metaphor with strong depth, premium photography sensibility and one clear focal subject, no cliché audio equipment',
];

export class AiArtworkError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AiArtworkError';
    this.status = status;
    this.code = code;
  }
}

export const isAiContentFlagError = (error: unknown) => error instanceof AiArtworkError && error.code === 'CONTENT_FLAGGED';

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

export function buildVariationPrompt(basePrompt: string, index: number, safeMode = false): string {
  const safe = safeMode
    ? 'Safety retry: keep the scene fully non-explicit and object/landscape/abstract focused; no people, anatomy, nudity, weapons, drugs or graphic content.'
    : '';
  return `${basePrompt} Variation direction: ${variationDirections[index % variationDirections.length]}. ${safe}`.trim();
}

export async function generateAiArtwork(
  params: GenerationParams,
  prompt: string,
  seed: number,
  aspectRatio: Ratio,
  references: string[] = [],
  profile: AiProfile = 'quality',
): Promise<ArtworkVariation> {
  const [width, height] = ratioSize[aspectRatio];
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('width', String(width));
  form.append('height', String(height));
  form.append('seed', String(Math.max(1, seed >>> 0)));
  form.append('profile', profile);

  for (let index = 0; index < Math.min(4, references.length); index++) {
    const blob = await downscaleReference(references[index]);
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
    code?: string;
  };

  if (!response.ok || !payload.dataUrl) {
    throw new AiArtworkError(payload.error || `AI image generation failed (${response.status}).`, response.status, payload.code);
  }

  const brandedDataUrl = await composeArtworkBranding(payload.dataUrl, params, aspectRatio);

  return {
    id: `${seed}-${aspectRatio}-${Date.now()}`,
    dataUrl: brandedDataUrl,
    sourceDataUrl: payload.dataUrl,
    seed,
    aspectRatio,
    provider: 'workers-ai',
    model: payload.model || (profile === 'quality' ? '@cf/black-forest-labs/flux-2-dev' : '@cf/black-forest-labs/flux-2-klein-4b'),
  };
}

export function buildFormatPrompt(title: string, aspectRatio: Ratio, safeMode = false): string {
  return [
    `Recompose the supplied artwork background for the music track context "${title}" to aspect ratio ${aspectRatio}.`,
    'Preserve the visual identity, subject, palette, lighting and material language of the supplied image.',
    'Artwork only: do not render any title, letters, words, logo, watermark or fake typography; exact branding is added after generation.',
    'Recompose intelligently for the new crop instead of stretching, and preserve useful clean negative space near the lower-left area.',
    'Do not invent a different cover concept or generic music hardware.',
    safeMode ? 'Safety retry: keep the scene fully non-explicit, abstract/object/landscape focused, with no people, anatomy, nudity, weapons, drugs or graphic content.' : '',
  ].filter(Boolean).join(' ');
}
