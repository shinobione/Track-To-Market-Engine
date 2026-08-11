export interface GenerationParams {
  title: string;
  genres: string[];
  style: string;
  audioStyle: string;
  lyrics: string;
  logoBase64?: string;
  trackId?: string;
}

export interface ReleasePack {
  coverPrompt: string;
  soundcloudDescription: string;
  tags: string[];
  caption: string;
}

export interface ArtworkVariation {
  id: string;
  dataUrl: string;
  sourceDataUrl?: string;
  seed: number;
  aspectRatio: '16:9' | '1:1' | '9:16';
  provider?: 'workers-ai' | 'external-ai' | 'local';
  model?: string;
}

export interface FormatPack {
  square?: ArtworkVariation;
  story?: ArtworkVariation;
}

export interface StudioBridgeInput extends Partial<GenerationParams> {
  source?: 'studio' | string;
}
