import type { ArtworkVariation, GenerationParams } from '../types';
import { composeArtworkBranding } from './branding';

const dims: Record<ArtworkVariation['aspectRatio'], [number, number]> = {
  '16:9': [1024, 576],
  '1:1': [1024, 1024],
  '9:16': [576, 1024],
};

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Unable to load cover for format adaptation.'));
  image.src = src;
});

export async function adaptArtworkLocally(
  sourceDataUrl: string,
  params: GenerationParams,
  aspectRatio: ArtworkVariation['aspectRatio'],
  seed: number,
  provider: ArtworkVariation['provider'],
  model?: string,
): Promise<ArtworkVariation> {
  const [width, height] = dims[aspectRatio];
  const image = await loadImage(sourceDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable for format adaptation.');

  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);

  const raw = canvas.toDataURL('image/jpeg', 0.94);
  const branded = await composeArtworkBranding(raw, params, aspectRatio);
  return {
    id: `format-${aspectRatio}-${seed}-${Date.now()}`,
    dataUrl: branded,
    sourceDataUrl: raw,
    seed,
    aspectRatio,
    provider,
    model: `${model || 'source artwork'} + deterministic crop/branding`,
  };
}
