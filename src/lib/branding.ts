import type { ArtworkVariation, BrandingMode, GenerationParams } from '../types';

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
    ctx.font = `800 ${size}px "Helvetica Neue", Inter, Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minimum;
}

function averageLuminance(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  try {
    const sampleWidth = Math.max(1, Math.min(48, Math.floor(width)));
    const sampleHeight = Math.max(1, Math.min(32, Math.floor(height)));
    const data = ctx.getImageData(Math.max(0, Math.floor(x)), Math.max(0, Math.floor(y)), sampleWidth, sampleHeight).data;
    let total = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      count += 1;
    }
    return count ? total / count : 0.35;
  } catch {
    return 0.35;
  }
}

async function drawLogo(ctx: CanvasRenderingContext2D, params: GenerationParams, width: number, height: number, margin: number, fill: string) {
  if (!params.logoBase64) return;
  try {
    const logo = await loadImage(params.logoBase64);
    const maxLogoWidth = width * 0.18;
    const maxLogoHeight = height * 0.085;
    const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height, 1);
    const logoWidth = Math.max(1, Math.round(logo.width * scale));
    const logoHeight = Math.max(1, Math.round(logo.height * scale));
    const logoX = width - margin - logoWidth;
    const logoY = margin;
    ctx.save();
    ctx.shadowColor = fill === '#111317' ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.58)';
    ctx.shadowBlur = 12;
    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    ctx.restore();
  } catch {
    // Never replace a missing/broken reference with invented pseudo-branding.
  }
}

export async function composeArtworkBranding(
  sourceDataUrl: string,
  params: GenerationParams,
  aspectRatio: Ratio,
  mode: BrandingMode = 'editorial',
): Promise<string> {
  if (mode === 'preserve') return sourceDataUrl;

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

  const sampled = averageLuminance(ctx, margin, height * 0.72, Math.min(48, width - margin), Math.min(32, height * 0.2));
  const foreground = sampled > 0.58 ? '#111317' : '#f7f4ee';

  if (mode === 'logo-only') {
    await drawLogo(ctx, params, width, height, margin, foreground);
    return canvas.toDataURL('image/png');
  }

  const gradient = ctx.createLinearGradient(0, height * 0.56, 0, height);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, sampled > 0.58 ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.48)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const title = params.title.trim() || 'Untitled';
  const maxWidth = width - margin * 2;
  const preferred = Math.round(width * (compact ? 0.075 : aspectRatio === '1:1' ? 0.064 : 0.052));
  const minimum = Math.max(24, Math.round(width * 0.033));
  const fontSize = fitFont(ctx, title, maxWidth, preferred, minimum);
  const titleY = height - margin - Math.round(fontSize * 0.28);

  ctx.save();
  ctx.font = `800 ${fontSize}px "Helvetica Neue", Inter, Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = foreground;
  ctx.shadowColor = foreground === '#111317' ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.62)';
  ctx.shadowBlur = Math.max(7, fontSize * 0.18);
  ctx.fillText(title, margin, titleY, maxWidth);
  ctx.restore();

  ctx.fillStyle = foreground;
  ctx.globalAlpha = 0.72;
  ctx.fillRect(margin, titleY - Math.round(fontSize * 1.15), Math.max(28, width * 0.036), Math.max(2, height * 0.003));
  ctx.globalAlpha = 1;

  await drawLogo(ctx, params, width, height, margin, foreground);
  return canvas.toDataURL('image/png');
}
