import React, { useState, useEffect, useRef } from 'react';
import { ReleasePack, GenerationParams } from '../types';
import { Flow } from 'flow-sdk';
import { PillButton, TextInput } from './Primitives';
import JSZip from 'jszip';

interface Variation {
  id: string;
  url: string;
  mediaId: string;
}

interface FormatPack {
  square?: Variation;
  story?: Variation;
}

interface OutputDisplayProps {
  pack: ReleasePack;
  params: GenerationParams;
  onRegenerate: () => Promise<void>;
  onTrackCredit: (cost: number) => void;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ pack, params, onRegenerate, onTrackCredit }) => {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [activeVariationIndex, setActiveVariationIndex] = useState<number | null>(null);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [activeFormatGenIndex, setActiveFormatGenIndex] = useState<number | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [formatPacks, setFormatPacks] = useState<Record<number, FormatPack>>({});
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [editedPrompt, setEditedPrompt] = useState(pack.coverPrompt);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    setEditedPrompt(pack.coverPrompt);
    setVariations([]);
    setFormatPacks({});
    setActiveVariationIndex(null);
    setVideoUrl(null);
    cancelRef.current = false;
  }, [pack]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerateVariations = async () => {
    setIsGeneratingVariations(true);
    setVariations([]); 
    setFormatPacks({});
    setActiveVariationIndex(null);
    cancelRef.current = false;

    const results: Variation[] = [];
    try {
      for (let i = 0; i < 4; i++) {
        if (cancelRef.current) break;
        
        const res = await Flow.generate.image({
          prompt: `${editedPrompt} --seed ${Math.floor(Math.random() * 99999)}`,
          aspectRatio: '16:9',
          modelDisplayName: '🍌 Nano Banana Pro',
          referenceImageMediaIds: params.logoMediaId ? [params.logoMediaId] : undefined
        });

        const newVar = {
          id: `${Date.now()}-${i}`,
          url: `data:${res.mimeType};base64,${res.base64}`,
          mediaId: res.mediaId
        };
        results.push(newVar);
        setVariations([...results]);
        if (i === 0) setActiveVariationIndex(0);
        onTrackCredit(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingVariations(false);
    }
  };

  const handleGenerateFormats = async (index: number) => {
    const base = variations[index];
    if (!base || activeFormatGenIndex !== null) return;

    setActiveFormatGenIndex(index);
    try {
      const sq = await Flow.generate.image({
        prompt: editedPrompt,
        aspectRatio: '1:1',
        modelDisplayName: '🍌 Nano Banana Pro',
        referenceImageMediaIds: [base.mediaId]
      });
      onTrackCredit(0);

      const st = await Flow.generate.image({
        prompt: editedPrompt,
        aspectRatio: '9:16',
        modelDisplayName: '🍌 Nano Banana Pro',
        referenceImageMediaIds: [base.mediaId]
      });
      onTrackCredit(0);

      setFormatPacks(prev => ({
        ...prev,
        [index]: {
          square: { id: 'sq', url: `data:${sq.mimeType};base64,${sq.base64}`, mediaId: sq.mediaId },
          story: { id: 'st', url: `data:${st.mimeType};base64,${st.base64}`, mediaId: st.mediaId }
        }
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setActiveFormatGenIndex(null);
    }
  };

  const handleGenerateVideo = async (index: number) => {
    const base = variations[index];
    if (!base || isGeneratingVideo) return;

    setIsGeneratingVideo(true);
    try {
      const res = await Flow.generate.video({
        prompt: `Cinematic motion graphics for the track "${params.title}". Dynamic lighting and depth.`,
        firstFrameImageMediaId: base.mediaId,
        modelDisplayName: 'Omni Flash',
        aspectRatio: '16:9',
        durationSeconds: 8
      });
      
      const bytes = Uint8Array.from(atob(res.base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: res.mimeType });
      setVideoUrl(URL.createObjectURL(blob));
      onTrackCredit(12);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleExportZip = async () => {
    if (activeVariationIndex === null) return;
    const zip = new JSZip();
    const folder = zip.folder(params.title.replace(/\s/g, '_') || 'Pack');
    
    const v = variations[activeVariationIndex];
    const f = formatPacks[activeVariationIndex];

    folder?.file("Cover_16-9.png", v.url.split(',')[1], { base64: true });
    if (f?.square) folder?.file("Cover_1-1.png", f.square.url.split(',')[1], { base64: true });
    if (f?.story) folder?.file("Cover_9-16.png", f.story.url.split(',')[1], { base64: true });
    
    folder?.file("Description_SoundCloud.txt", pack.soundcloudDescription);
    folder?.file("Tags.txt", pack.tags.join(', '));
    folder?.file("Instagram_Caption.txt", pack.caption);

    const content = await zip.generateAsync({ type: 'blob' });
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await Flow.download({
        base64,
        mimeType: 'application/zip',
        filename: `${params.title || 'Pack'}.zip`
      });
    };
    reader.readAsDataURL(content);
  };

  return (
    <div className="flex flex-col gap-10">
      
      {previewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} className="max-h-full max-w-full rounded-lg shadow-2xl" />
        </div>
      )}

      {videoUrl && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl" onClick={() => setVideoUrl(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <video src={videoUrl} autoPlay loop controls className="w-full rounded-2xl shadow-2xl" />
            <button onClick={() => setVideoUrl(null)} className="absolute -top-12 right-0 text-white flex items-center gap-2 uppercase text-[10px] tracking-widest font-bold">
              Fermer <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter uppercase">{params.title || 'Sans titre'}</h1>
          <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mt-2">Génération Active • Shinobiwan Engine</p>
        </div>
        <button onClick={onRegenerate} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest transition-colors">
          <span className="material-symbols-outlined text-[16px]">refresh</span> Nouveau Prompt
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Visuals Section */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Galerie de Covers (16:9)</span>
            {variations.length > 0 && (
              <button 
                onClick={handleGenerateVariations} 
                disabled={isGeneratingVariations}
                className="text-[9px] font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span> Régénérer tout
              </button>
            )}
          </div>

          {variations.length === 0 && !isGeneratingVariations ? (
            <div className="aspect-video w-full rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 bg-white/[0.02]">
              <span className="material-symbols-outlined text-white/10 text-[64px]">imagesmode</span>
              <PillButton variant="solid" onClick={handleGenerateVariations} disabled={isGeneratingVariations}>
                {isGeneratingVariations ? 'Calcul...' : 'Commencer la Création'}
              </PillButton>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map(i => (
                <div 
                  key={variations[i]?.id || i} 
                  onClick={() => variations[i] && setActiveVariationIndex(i)}
                  className={`group relative aspect-video rounded-xl overflow-hidden border transition-all duration-300 ${
                    activeVariationIndex === i ? 'border-white scale-[1.02] shadow-xl z-10' : 'border-white/10 opacity-60 hover:opacity-100'
                  } bg-black/40 cursor-pointer`}
                >
                  {variations[i] ? (
                    <>
                      <img src={variations[i].url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-2">
                         <button onClick={() => setPreviewUrl(variations[i].url)} className="w-full h-8 bg-white text-black rounded-lg text-[9px] font-bold uppercase">Aperçu</button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleGenerateFormats(i); }} 
                            disabled={activeFormatGenIndex !== null}
                            className={`w-full h-8 border rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                              formatPacks[i] 
                                ? 'bg-green-500 text-white border-green-400' 
                                : 'bg-black/40 hover:bg-black/80 border-white/20'
                            }`}
                         >
                            {activeFormatGenIndex === i ? (
                              <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                            ) : formatPacks[i] ? (
                              <><span className="material-symbols-outlined text-[14px]">check</span> Formats OK</>
                            ) : 'Adapter Formats'}
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleGenerateVideo(i); }} 
                            className="w-full h-8 bg-black/40 hover:bg-black/80 border border-white/20 rounded-lg text-[9px] font-bold uppercase transition-colors"
                         >
                            {isGeneratingVideo && activeVariationIndex === i ? 'Vidéo...' : 'Teaser 8s'}
                         </button>
                      </div>
                    </>
                  ) : isGeneratingVariations && variations.length === i ? (
                    <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
                      <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/[0.01]">
                       <span className="text-[10px] text-white/5 font-mono">VARIANT {i+1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeVariationIndex !== null && formatPacks[activeVariationIndex] && (
            <div className="flex flex-col gap-4 p-6 rounded-2xl bg-white/[0.03] border border-white/10 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Formats Additionnels</span>
                <span className="text-[9px] font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20 uppercase tracking-widest">Cohérence Active</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/40">
                    <img src={formatPacks[activeVariationIndex].square?.url} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[8px] font-bold tracking-widest text-white/60 uppercase">1:1 Square</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="relative aspect-[9/16] rounded-lg overflow-hidden border border-white/10 bg-black/40 h-[200px]">
                    <img src={formatPacks[activeVariationIndex].story?.url} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[8px] font-bold tracking-widest text-white/60 uppercase">9:16 Story</div>
                  </div>
                </div>
              </div>
              <PillButton variant="solid" onClick={handleExportZip} icon={<span className="material-symbols-outlined">folder_zip</span>}>Exporter le Pack Complet (.zip)</PillButton>
            </div>
          )}
        </div>

        {/* Texts Section */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          {/* Editable Cover Prompt Section */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Cover Prompt (IA - Éditable)</span>
              <button onClick={() => copyToClipboard(editedPrompt, 'prompt')} className="text-[10px] text-white/40 hover:text-white uppercase font-bold tracking-widest transition-colors">
                {copiedField === 'prompt' ? 'Copie ✓' : 'Copier'}
              </button>
            </div>
            <div className="relative">
              <TextInput 
                value={editedPrompt} 
                onChange={setEditedPrompt} 
                placeholder="Modifiez le prompt visuel ici..." 
                className="h-[120px] text-[12px] leading-relaxed"
              />
              <div className="absolute -bottom-5 right-1">
                 <p className="text-[8px] text-white/20 uppercase font-bold tracking-tighter">Éditez avant de cliquer sur "Commencer la Création"</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">SoundCloud Description (Max 140)</span>
              <button onClick={() => copyToClipboard(pack.soundcloudDescription, 'sc')} className="text-[10px] text-white/40 hover:text-white uppercase font-bold tracking-widest transition-colors">
                {copiedField === 'sc' ? 'Copie ✓' : 'Copier'}
              </button>
            </div>
            <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/10 text-[12px] leading-relaxed text-white/70 whitespace-pre-wrap font-mono min-h-[100px]">
              {pack.soundcloudDescription}
              <div className="mt-2 text-[10px] text-white/20">{pack.soundcloudDescription.length}/140</div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Social Media Caption</span>
              <button onClick={() => copyToClipboard(pack.caption, 'ig')} className="text-[10px] text-white/40 hover:text-white uppercase font-bold tracking-widest transition-colors">
                {copiedField === 'ig' ? 'Copie ✓' : 'Copier'}
              </button>
            </div>
            <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/10 text-[12px] leading-relaxed text-white/90 italic min-h-[80px]">
              {pack.caption}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-1">Tags SoundCloud</span>
            <div className="flex flex-wrap gap-2">
              {pack.tags.map((tag, i) => (
                <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/40">#{tag}</span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
