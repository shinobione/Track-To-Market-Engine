import type { ArtworkVariation, GenerationParams } from '../types';

type Ratio = ArtworkVariation['aspectRatio'];

const ratioSize: Record<Ratio, [number, number]> = {
  '16:9': [1280, 720],
  '1:1': [1080, 1080],
  '9:16': [1080, 1920],
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function palette(params: GenerationParams, seed: number): [string, string, string] {
  const source = `${params.genres.join('|')}|${params.style}|${seed}`;
  const h = hash(source) % 360;
  return [`hsl(${h} 78% 54%)`, `hsl(${(h + 48) % 360} 82% 58%)`, `hsl(${(h + 210) % 360} 70% 38%)`];
}

async function loadImage(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function wrapTitle(ctx: CanvasRenderingContext2D, title: string, maxWidth: number): string[] {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export async function renderArtwork(params: GenerationParams, seed: number, aspectRatio: Ratio = '16:9'): Promise<ArtworkVariation> {
  const [width, height] = ratioSize[aspectRatio];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable.');
  const random = rng(seed);
  const [a, b, c] = palette(params, seed);

  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#07090d');
  gradient.addColorStop(0.5, c);
  gradient.addColorStop(1, '#030406');
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  for (let i = 0; i < 18; i++) {
    const x = random() * width;
    const y = random() * height;
    const r = (0.04 + random() * 0.18) * Math.min(width, height);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, i % 2 ? a : b);
    glow.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.08 + random() * 0.16;
    ctx.fillStyle = glow;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((random() - 0.5) * 0.14);
  ctx.strokeStyle = a;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = Math.max(2, width * 0.002);
  const step = Math.max(44, width * 0.055);
  for (let x = -width; x < width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, -height); ctx.lineTo(x + height * 0.45, height); ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  const margin = width * 0.07;
  const titleSize = Math.max(56, Math.min(width * 0.09, height * 0.17));
  ctx.font = `900 ${titleSize}px Arial, Helvetica, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = a;
  ctx.shadowBlur = Math.max(12, width * 0.018);
  const lines = wrapTitle(ctx, params.title.toUpperCase(), width - margin * 2);
  const lineHeight = titleSize * 0.9;
  const blockHeight = lines.length * lineHeight;
  let y = height * 0.58 - blockHeight / 2;
  lines.forEach(line => {
    ctx.fillText(line, margin, y);
    y += lineHeight;
  });
  ctx.shadowBlur = 0;

  ctx.font = `700 ${Math.max(18, width * 0.016)}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.fillText(params.genres.slice(0, 3).join('  /  ').toUpperCase(), margin, Math.min(height - margin * 0.72, y + lineHeight * 0.4));

  ctx.font = `700 ${Math.max(16, width * 0.014)}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.46)';
  ctx.fillText('SHINOBIWAN', margin, height - margin * 0.5);

  const logo = await loadImage(params.logoBase64);
  if (logo) {
    const maxW = width * 0.18;
    const maxH = height * 0.11;
    const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
    const lw = logo.width * scale;
    const lh = logo.height * scale;
    ctx.globalAlpha = 0.72;
    ctx.drawImage(logo, width - margin - lw, height - margin * 0.42 - lh, lw, lh);
    ctx.globalAlpha = 1;
  }

  const dataUrl = canvas.toDataURL('image/png');
  return { id: `${seed}-${aspectRatio}-${Date.now()}`, dataUrl, seed, aspectRatio };
}

export function makeSeed(params: GenerationParams, index: number): number {
  return hash(`${params.title}|${params.genres.join(',')}|${params.style}|${index}|${Date.now()}`);
}
