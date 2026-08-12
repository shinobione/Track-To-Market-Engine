import type { ArtworkVariation, GenerationParams } from '../types';

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

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawContained(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

export async function adaptArtworkLocally(
  sourceDataUrl: string,
  _params: GenerationParams,
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

  // Fill the target ratio with a softened copy so the exported asset has no empty bars.
  ctx.save();
  ctx.filter = 'blur(34px) saturate(.9) brightness(.52)';
  ctx.globalAlpha = 0.92;
  drawCover(ctx, image, width, height);
  ctx.restore();

  // Preserve the complete selected FINAL composition (including integrated title/logo)
  // instead of cropping it away or applying a second generic branding pass.
  drawContained(ctx, image, width, height);

  return {
    id: `format-${aspectRatio}-${seed}-${Date.now()}`,
    dataUrl: canvas.toDataURL('image/jpeg', 0.94),
    seed,
    aspectRatio,
    provider,
    model: `${model || 'source artwork'} + safe-fit adaptation (visual preserved)`,
  };
}
