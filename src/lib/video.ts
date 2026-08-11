import type { ArtworkVariation } from '../types';

export async function createTeaserVideo(artwork: ArtworkVariation, title: string, durationSeconds = 8): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder is not supported in this browser.');
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable.');

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load artwork for teaser.'));
    img.src = artwork.dataUrl;
  });

  const stream = canvas.captureStream(30);
  const supported = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
  if (!supported) throw new Error('No supported WebM encoder found in this browser.');
  const recorder = new MediaRecorder(stream, { mimeType: supported, videoBitsPerSecond: 6_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = event => event.data.size && chunks.push(event.data);
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Video recording failed.'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: supported }));
  });
  recorder.start();

  const started = performance.now();
  await new Promise<void>(resolve => {
    const frame = (now: number) => {
      const elapsed = (now - started) / 1000;
      const progress = Math.min(1, elapsed / durationSeconds);
      const loop = Math.sin(progress * Math.PI * 2);
      const scale = 1.02 + Math.abs(loop) * 0.025;
      const drawW = canvas.width * scale;
      const drawH = canvas.height * scale;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.96;
      ctx.drawImage(image, (canvas.width - drawW) / 2 + loop * 6, (canvas.height - drawH) / 2, drawW, drawH);
      ctx.globalAlpha = 0.12 + Math.abs(loop) * 0.08;
      const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.font = '700 22px Arial, Helvetica, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.fillText(title.toUpperCase(), 54, canvas.height - 48);
      if (progress < 1) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });

  recorder.stop();
  return done;
}
