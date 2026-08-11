import type { ArtworkVariation, GenerationParams } from '../types';

type Ratio = ArtworkVariation['aspectRatio'];

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Unable to load artwork for branding.'));
  image.src = src;
});

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, preferred: number, minimum: number) {
  let size = preferred;
  while (size > minimum) {
    ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minimum;
}

function drawArtistFallback(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.font = `800 ${size}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.shadowColor = 'rgba(0,0,0,.8)';
  ctx.shadowBlur = size * 0.45;
  ctx.fillText('SHINOBIWAN', x, y);
  ctx.restore();
}

export async function composeArtworkBranding(sourceDataUrl: string, params: GenerationParams, aspectRatio: Ratio): Promise<string> {
  const source = await loadImage(sourceDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = source.naturalWidth || source.width;
  canvas.height = source.naturalHeight || source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable for artwork branding.');

  const width = canvas.width;
  const height = canvas.height;
  const compact = aspectRatio === '9:16';
  const margin = Math.round(width * (compact ? 0.075 : 0.055));

  ctx.drawImage(source, 0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, height * 0.48, 0, height);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,.62)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const title = params.title.trim() || 'Untitled';
  const maxWidth = width - margin * 2;
  const preferred = Math.round(width * (compact ? 0.105 : aspectRatio === '1:1' ? 0.085 : 0.072));
  const minimum = Math.max(28, Math.round(width * 0.045));
  const fontSize = fitFont(ctx, title, maxWidth, preferred, minimum);

  ctx.save();
  ctx.font = `900 ${fontSize}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,.88)';
  ctx.shadowBlur = Math.max(12, fontSize * 0.32);
  ctx.shadowOffsetY = Math.max(2, fontSize * 0.045);
  const titleY = height - margin - Math.round(fontSize * 0.42);
  ctx.fillText(title, margin, titleY, maxWidth);
  ctx.restore();

  const accentY = height - margin - Math.round(fontSize * 1.55);
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.fillRect(margin, accentY, Math.max(34, width * 0.045), Math.max(2, height * 0.004));

  if (params.logoBase64) {
    try {
      const logo = await loadImage(params.logoBase64);
      const maxLogoWidth = width * (compact ? 0.28 : 0.18);
      const maxLogoHeight = height * (compact ? 0.07 : 0.09);
      const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height, 1);
      const logoWidth = Math.max(1, Math.round(logo.width * scale));
      const logoHeight = Math.max(1, Math.round(logo.height * scale));
      const logoX = width - margin - logoWidth;
      const logoY = margin;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.85)';
      ctx.shadowBlur = 14;
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      ctx.restore();
    } catch {
      drawArtistFallback(ctx, margin, margin + Math.round(fontSize * 0.22), Math.max(13, Math.round(fontSize * 0.18)));
    }
  } else {
    drawArtistFallback(ctx, margin, margin + Math.round(fontSize * 0.22), Math.max(13, Math.round(fontSize * 0.18)));
  }

  return canvas.toDataURL('image/png');
}
