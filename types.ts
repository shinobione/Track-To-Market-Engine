export interface GenerationParams {
  title: string;
  genres: string[]; 
  style: string;
  audioStyle: string;
  lyrics: string;
  logoMediaId?: string;
  logoBase64?: string;
}

export interface ReleasePack {
  coverPrompt: string;
  soundcloudDescription: string;
  tags: string[];
  caption: string;
  logoMediaId?: string;
}