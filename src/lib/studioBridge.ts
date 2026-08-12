import type { ArtworkStrategy, BrandingMode, GenerationParams, ReleasePack, StudioBridgeInput } from '../types';

const MESSAGE_READY = 'shinobiwan:track-to-market:ready';
const MESSAGE_INPUT = 'shinobiwan:track-to-market:input';
const MESSAGE_PACK = 'shinobiwan:track-to-market:pack';
const BRIDGE_VERSION = '0.2.0';

const ALLOWED_STUDIO_ORIGINS = [
  'https://shinobione.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
] as const;

export interface StudioPackPublicationMeta {
  releaseStatus: 'final';
  artworkProvider?: string;
  artworkModel?: string;
  mode?: string;
  artworkStrategy?: ArtworkStrategy;
  brandingMode?: BrandingMode;
  previewDataUrl?: string;
}

function bridgeTargets(): Window[] {
  const targets: Window[] = [];
  if (window.parent && window.parent !== window) targets.push(window.parent);
  if (window.opener && !window.opener.closed && window.opener !== window.parent) targets.push(window.opener);
  return targets;
}

function postToStudio(payload: unknown) {
  for (const target of bridgeTargets()) {
    for (const origin of ALLOWED_STUDIO_ORIGINS) {
      target.postMessage(payload, origin);
    }
  }
}

function normalizeBridgeInput(value: unknown): StudioBridgeInput | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const input: StudioBridgeInput = {};

  if (typeof raw.source === 'string') input.source = raw.source;
  if (typeof raw.trackId === 'string') input.trackId = raw.trackId;
  if (typeof raw.title === 'string') input.title = raw.title;
  if (Array.isArray(raw.genres)) input.genres = raw.genres.filter((item): item is string => typeof item === 'string').slice(0, 12);
  if (typeof raw.audioStyle === 'string') input.audioStyle = raw.audioStyle;
  if (typeof raw.style === 'string') input.style = raw.style;
  if (typeof raw.lyrics === 'string') input.lyrics = raw.lyrics;
  if (raw.artworkStrategy === 'integrated' || raw.artworkStrategy === 'clean') input.artworkStrategy = raw.artworkStrategy;

  return input;
}

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
    ...(input.artworkStrategy ? { artworkStrategy: input.artworkStrategy } : {}),
  };
}

export function subscribeStudioBridgeInput(onInput: (input: StudioBridgeInput) => void) {
  const listener = (event: MessageEvent) => {
    if (!ALLOWED_STUDIO_ORIGINS.includes(event.origin as (typeof ALLOWED_STUDIO_ORIGINS)[number])) return;
    const data = event.data as { type?: unknown; input?: unknown } | null;
    if (!data || data.type !== MESSAGE_INPUT) return;
    const input = normalizeBridgeInput(data.input);
    if (input) onInput(input);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

export function announceReady() {
  postToStudio({ type: MESSAGE_READY, version: BRIDGE_VERSION, accepts: MESSAGE_INPUT, capabilities: ['full-context', 'final-preview', 'provenance'] });
}

export function publishPackToStudio(params: GenerationParams, pack: ReleasePack, meta?: StudioPackPublicationMeta) {
  const publication = meta || {
    releaseStatus: 'final' as const,
    artworkProvider: 'external-ai',
    artworkModel: 'Premium external import',
    mode: 'quality-import',
    artworkStrategy: params.artworkStrategy || 'integrated',
    brandingMode: 'preserve' as const,
  };

  postToStudio({
    type: MESSAGE_PACK,
    version: BRIDGE_VERSION,
    trackId: params.trackId,
    releaseStatus: publication.releaseStatus,
    artworkProvider: publication.artworkProvider,
    artworkModel: publication.artworkModel,
    mode: publication.mode,
    artworkStrategy: publication.artworkStrategy,
    brandingMode: publication.brandingMode,
    previewDataUrl: publication.previewDataUrl,
    params: { ...params, logoBase64: params.logoBase64 ? '[embedded image omitted]' : undefined },
    pack,
  });
}
