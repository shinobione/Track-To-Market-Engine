import type { GenerationParams, ReleasePack } from '../types';

const SIGNATURE = 'Thx for listening😁👍 — SHINOBIWAN';

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
const lowerTag = (value: string) => clean(value).toLowerCase().replace(/^#/, '').replace(/[^a-z0-9à-ÿ -]/gi, '').replace(/\s+/g, ' ');

function inferMood(params: GenerationParams): string[] {
  const source = `${params.style} ${params.audioStyle} ${params.lyrics}`.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/dark|night|ghost|shadow|noir|industrial/, 'dark'],
    [/love|heart|close|romantic|intimate|sensual/, 'intimate'],
    [/energy|club|dance|festival|rave|hard|aggress/, 'high energy'],
    [/dream|ambient|atmos|ethereal|space|cosmic/, 'atmospheric'],
    [/sad|tear|melanch|lonely|pain/, 'melancholic'],
    [/sun|summer|warm|bright|gold/, 'warm'],
  ];
  const hits = rules.filter(([rule]) => rule.test(source)).map(([, tag]) => tag);
  return hits.length ? [...new Set(hits)].slice(0, 3) : ['cinematic'];
}

export function generateCoverPrompt(params: GenerationParams, variant = 0): string {
  const genres = params.genres.join(', ');
  const mood = inferMood(params).join(', ');
  const direction = clean(params.style) || 'modern cinematic editorial artwork';
  const audio = clean(params.audioStyle) || 'dynamic contemporary production';
  const compositions = [
    'bold editorial composition with one memorable focal idea and controlled negative space',
    'off-center composition with layered foreground/background depth and tactile material detail',
    'wide cinematic composition with sophisticated perspective and restrained visual hierarchy',
    'minimal conceptual composition with premium campaign restraint and distinctive geometry',
  ];

  return [
    `Create premium 16:9 artwork for the music track context “${clean(params.title)}”.`,
    `Genres: ${genres}. Sonic character: ${audio}. Mood: ${mood}. Art direction: ${direction}.`,
    `Use ${compositions[variant % compositions.length]}.`,
    'ARTWORK BACKGROUND ONLY: do not render the track title, letters, words, logos, watermarks or fake typography. Exact title and artist branding will be composited after generation.',
    'Leave useful clean negative space around the lower-left region for later title placement, while keeping the artwork visually complete without text.',
    'Avoid generic AI album-cover clichés: no random speakers, headphones, microphones, equalizers, vinyl records, glowing music notes or audio hardware unless explicitly requested by the art direction.',
    'Prioritize a distinctive visual metaphor, coherent palette, believable materials, restrained bloom, detailed lighting and high-end editorial music-campaign finish.',
  ].join(' ');
}

export function generateDescription(params: GenerationParams): string {
  const genre = params.genres.slice(0, 2).join(' / ');
  const mood = inferMood(params)[0];
  const core = `${clean(params.title)} — ${genre}. ${mood} energy, shaped for late-night replay. `;
  const maxCore = Math.max(0, 140 - SIGNATURE.length);
  const clipped = core.length > maxCore ? `${core.slice(0, Math.max(0, maxCore - 1)).trimEnd()}…` : core;
  return `${clipped}${SIGNATURE}`.slice(0, 140);
}

export function generateTags(params: GenerationParams): string[] {
  const mood = inferMood(params);
  const base = [
    ...params.genres,
    ...params.genres.map(g => `${g} music`),
    ...mood,
    'shinobiwan',
    'independent artist',
    'new music',
    'night drive',
    'headphones',
    'playlist',
    'electronic music',
    'cinematic',
    'late night',
    'release',
    'new release',
    'music discovery',
    'underground music',
    'artist development',
    'soundcloud',
  ].map(lowerTag).filter(Boolean);
  return [...new Set(base)].slice(0, 18);
}

export function generateCaption(params: GenerationParams): string {
  const genre = params.genres.slice(0, 2).join(' × ');
  const mood = inferMood(params)[0];
  return `“${clean(params.title)}” is out of the lab. ${genre} with a ${mood} pulse.\nTurn it up. ⚡ #SHINOBIWAN`;
}

export function generateReleasePack(params: GenerationParams): ReleasePack {
  return {
    coverPrompt: generateCoverPrompt(params),
    soundcloudDescription: generateDescription(params),
    tags: generateTags(params),
    caption: generateCaption(params),
  };
}
