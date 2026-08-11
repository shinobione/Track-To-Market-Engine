import type { GenerationParams, ReleasePack, StudioBridgeInput } from '../types';

const MESSAGE_READY = 'shinobiwan:track-to-market:ready';
const MESSAGE_PACK = 'shinobiwan:track-to-market:pack';

export function readStudioBridgeInput(): StudioBridgeInput {
  const query = new URLSearchParams(globalThis.location.search);
  const genres = query.get('genres')?.split(',').map(value => value.trim()).filter(Boolean);
  return {
    source: query.get('source') || undefined,
    trackId: query.get('trackId') || undefined,
    title: query.get('title') || undefined,
    genres,
    audioStyle: query.get('audioStyle') || undefined,
    style: query.get('style') || undefined,
    lyrics: query.get('lyrics') || undefined,
  };
}

export function mergeBridgeInput(base: GenerationParams, input: StudioBridgeInput): GenerationParams {
  return {
    ...base,
    ...(input.title ? { title: input.title } : {}),
    ...(input.genres?.length ? { genres: input.genres } : {}),
    ...(input.audioStyle ? { audioStyle: input.audioStyle } : {}),
    ...(input.style ? { style: input.style } : {}),
    ...(input.lyrics ? { lyrics: input.lyrics } : {}),
    ...(input.trackId ? { trackId: input.trackId } : {}),
  };
}

export function announceReady() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: MESSAGE_READY, version: '0.1.0' }, '*');
  }
}

export function publishPackToStudio(params: GenerationParams, pack: ReleasePack) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: MESSAGE_PACK, version: '0.1.0', trackId: params.trackId, params, pack }, '*');
  }
}
