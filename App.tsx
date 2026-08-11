import React, { useState, useEffect } from 'react';
import { Flow } from 'flow-sdk';
import { SectionLabel, PillButton, MultiFieldDropdown, TextInput } from './components/Primitives';
import { OutputDisplay } from './components/OutputDisplay';
import { ReleasePack, GenerationParams } from './types';

export default function App() {
  const [params, setParams] = useState<GenerationParams>({
    title: '',
    genres: [],
    style: '',
    audioStyle: '',
    lyrics: '',
  });

  const [pack, setPack] = useState<ReleasePack | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({ count: 0, credits: 0 });

  useEffect(() => {
    const id = 'flow-design-system-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; width: 100%; cursor: pointer; padding: 8px 0; }
      input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 3px; background: #595959; border-radius: 9999px; }
      input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: white; box-shadow: 0px 1px 3px rgba(0,0,0,0.5); margin-top: -5.5px; cursor: grab; }
      input[type=range]::-webkit-slider-thumb:active { cursor: grabbing; }
      .dark-scrollbar { scrollbar-width: thin; scrollbar-color: #595959 transparent; }
      .dark-scrollbar::-webkit-scrollbar { width: 6px; }
      .dark-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .dark-scrollbar::-webkit-scrollbar-thumb { background: #595959; border-radius: 9999px; }
      @keyframes dropdown-enter { from { opacity: 0; transform: scale(0.95) translateY(-5px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      .animate-dropdown { animation: dropdown-enter 0.15s ease-out forwards; }
      html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; background: #0e0e0e; font-family: 'Google Sans Text', 'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0.1px; -webkit-font-smoothing: antialiased; }
    `;
    document.head.appendChild(style);
  }, []);

  const handleSelectLogo = async () => {
    try {
      const media = await Flow.media.select({ filter: 'image' });
      setParams(prev => ({
        ...prev,
        logoMediaId: media.mediaId,
        logoBase64: `data:${media.mimeType};base64,${media.base64}`
      }));
    } catch (err) {
      console.error("Logo selection cancelled or failed", err);
    }
  };

  const clearLogo = () => {
    setParams(prev => ({ ...prev, logoMediaId: undefined, logoBase64: undefined }));
  };

  const trackGeneration = (creditCost: number = 0) => {
    setSessionStats(prev => ({ 
      count: prev.count + 1,
      credits: prev.credits + creditCost
    }));
  };

  const generatePack = async () => {
    const titleClean = params.title.trim();
    const genresClean = params.genres || [];
    
    if (!titleClean) {
      setError("Le titre est requis.");
      return;
    }
    if (genresClean.length === 0) {
      setError("Sélectionnez au moins un genre.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPack(null);

    const genreString = genresClean.join(', ');

    try {
      const systemInstruction = `
        Tu es un assistant créatif spécialisé dans les sorties musicales sur SOUNDCLOUD.
        Génère un pack de sortie complet en JSON avec ces champs :
        - coverPrompt: (string) Un prompt cinématographique 16:9 très détaillé pour la génération d'images. 
          Important : Intègre de manière PROMINENTE le titre du morceau "${titleClean}" dans l'œuvre. ${params.logoMediaId ? 'Incorpore également le logo de l\'artiste fourni comme détail de branding.' : ''}
        - soundcloudDescription: (string) Description pour SoundCloud en ANGLAIS. DOIT ÊTRE COURTE : MAXIMUM 140 CARACTÈRES. Utilise des emojis.
        - tags: (string[]) 15 tags SoundCloud pertinents.
        - caption: (string) Légende alternative pour les réseaux sociaux en ANGLAIS.

        ESTHÉTIQUE : ${params.style || 'Moderne, urbain, haute qualité'}.
        LANGUE : Les contenus générés sont en ANGLAIS.
      `;

      const userPrompt = `Titre: ${titleClean}\nGenres: ${genreString}\nAmbiance sonore: ${params.audioStyle}\nMood/Vibe/Direction artistique: ${params.style}\nLyrics: ${params.lyrics}`;

      const response = await Flow.generate.text(userPrompt, { 
        systemInstruction,
        thinkingLevel: 'medium'
      });
      
      const jsonStr = response.text.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(jsonStr) as ReleasePack;
      
      setPack({ ...result, logoMediaId: params.logoMediaId });
      trackGeneration(0);
    } catch (err: any) {
      console.error(err);
      setError("Échec de la génération. Veuillez vérifier vos paramètres.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0e0e0e] text-white">
      {/* Sidebar */}
      <div className="relative border-r border-[rgba(218,220,224,0.15)] flex flex-col items-start justify-between overflow-clip px-[10px] py-[12px] w-[300px] h-full min-h-0 bg-[#0e0e0e]">
        <div className="flex flex-col gap-[24px] items-start w-full overflow-y-auto dark-scrollbar pr-1 pb-4">
          
          <div className="flex flex-col gap-2 items-start w-full">
            <SectionLabel>Informations de base</SectionLabel>
            <div className="flex flex-col gap-1.5 w-full">
              <TextInput 
                value={params.title} 
                onChange={(v) => setParams(prev => ({ ...prev, title: v }))} 
                placeholder="Titre" 
              />
              <MultiFieldDropdown 
                label="Genre" 
                values={params.genres} 
                options={[
                  'Afrobeat', 'Bass House', 'Club Electronic', 'Deep House', 'Drill', 'Drum & Bass', 
                  'Electro', 'G-Funk', 'Glitch Hop', 'Hip Hop', 'House', 'Hyperpop', 'Lo-fi', 'Phonk', 'Plunderphonics', 'Pop', 
                  'R&B', 'Reggaeton', 'Synthwave', 'Techno', 'Trap'
                ]}
                onChange={(v) => setParams(prev => ({ ...prev, genres: v }))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 items-start w-full">
            <SectionLabel>Direction Artistique</SectionLabel>
            <div className="flex flex-col gap-1.5 w-full">
              <TextInput 
                value={params.audioStyle} 
                onChange={(v) => setParams(prev => ({ ...prev, audioStyle: v }))} 
                placeholder="Ambiance sonore" 
              />
              <TextInput 
                value={params.style} 
                onChange={(v) => setParams(prev => ({ ...prev, style: v }))} 
                placeholder="Mood/Vibe/Direction artistique" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 items-start w-full">
            <SectionLabel>Texte</SectionLabel>
            <TextInput 
              value={params.lyrics} 
              onChange={(v) => setParams(prev => ({ ...prev, lyrics: v }))} 
              placeholder="Lyrics" 
            />
          </div>

          <div className="flex flex-col gap-2 items-start w-full">
            <SectionLabel>Logo (Optionnel)</SectionLabel>
            <div className="w-full">
              {params.logoBase64 ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[#595959] group bg-black/40">
                  <img src={params.logoBase64} alt="Logo" className="w-full h-full object-contain p-2" />
                  <button onClick={clearLogo} className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ) : (
                <button onClick={handleSelectLogo} className="w-full aspect-[16/5] rounded-xl border border-dashed border-[#595959] hover:border-[#7a7a7a] hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-1 text-[rgba(218,220,224,0.4)]">
                  <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                  <span className="text-[10px] font-medium uppercase tracking-widest">Logo Artiste</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-start w-full mt-2">
            <SectionLabel>Statistiques Session</SectionLabel>
            <div className="w-full p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-white/40">
                <span>Actions totales</span>
                <span className="text-white font-mono">{sessionStats.count}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-white/40">
                <span>Consommation</span>
                <span className={`${sessionStats.credits > 0 ? 'text-orange-400' : 'text-green-400'} font-bold`}>
                  {sessionStats.credits} CRÉDITS
                </span>
              </div>
              <div className="h-px bg-white/10 w-full my-1" />
              <p className="text-[9px] text-white/30 leading-tight italic">
                L'image (Banana Pro) est gratuite. La vidéo (Omni Flash) coûte 12 crédits par essai.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[5px] items-start w-full pt-4">
          {error && (
            <div className="text-[10px] text-red-400 px-2 py-2 mb-2 bg-red-400/10 border border-red-400/20 rounded-lg w-full flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">error</span>
              <span>{error}</span>
            </div>
          )}
          <PillButton 
            variant="solid" 
            onClick={generatePack}
            disabled={isGenerating}
            icon={<span className="material-symbols-outlined text-[18px]">{isGenerating ? 'refresh' : 'auto_awesome'}</span>}
          >
            {isGenerating ? 'Génération...' : 'Générer le Pack'}
          </PillButton>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 h-full overflow-y-auto dark-scrollbar bg-[#090909]">
        <div className="max-w-4xl mx-auto p-8">
          {!pack && !isGenerating && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-[rgba(218,220,224,0.4)] gap-4">
              <span className="material-symbols-outlined text-[48px]">music_note</span>
              <div className="text-center">
                <h2 className="text-xl font-medium text-white/80 tracking-[0.2em] uppercase">SHINOBIWAN</h2>
                <p className="text-sm mt-2">Prêt pour votre prochaine release.</p>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest animate-pulse">Calcul de la stratégie visuelle...</p>
            </div>
          )}

          {pack && !isGenerating && (
            <OutputDisplay 
              pack={pack} 
              params={params} 
              onRegenerate={generatePack} 
              onTrackCredit={trackGeneration}
            />
          )}
        </div>
      </div>
    </div>
  );
}