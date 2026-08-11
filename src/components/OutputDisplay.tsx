import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import type { ArtworkVariation, FormatPack, GenerationParams, ReleasePack } from '../types';
import { Button, TextInput } from './Primitives';
import { makeSeed, renderArtwork } from '../lib/artwork';
import { buildFormatPrompt, generateAiArtwork } from '../lib/aiArtwork';
import { createTeaserVideo } from '../lib/video';
import { generateCaption, generateCoverPrompt, generateDescription } from '../lib/releaseEngine';
import { publishPackToStudio } from '../lib/studioBridge';

interface Props {
  pack: ReleasePack;
  params: GenerationParams;
  onPackChange: (pack: ReleasePack) => void;
  onRegenerate: () => void;
  onTrackAction: () => void;
}

type ArtworkEngine = 'ai' | 'local';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const dataUrlToBase64 = (url: string) => url.split(',')[1] || '';
const extensionFor = (url: string) => url.startsWith('data:image/jpeg') ? 'jpg' : 'png';

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error || new Error('Unable to read imported cover.'));
  reader.readAsDataURL(file);
});

export const OutputDisplay: React.FC<Props> = ({ pack, params, onPackChange, onRegenerate, onTrackAction }) => {
  const [variations, setVariations] = useState<ArtworkVariation[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [formats, setFormats] = useState<Record<number, FormatPack>>({});
  const [generating, setGenerating] = useState(false);
  const [formatting, setFormatting] = useState<number | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState(pack.coverPrompt);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<ArtworkEngine>('ai');
  const cancelRef = useRef(false);

  useEffect(() => {
    setEditedPrompt(pack.coverPrompt);
    setVariations([]);
    setFormats({});
    setActive(null);
    setVideoBlob(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setError(null);
    setEngine('ai');
    cancelRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.coverPrompt, params.title]);

  const copy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1400);
  };

  const importExternalCovers = async (files?: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, 4);
    if (!selected.length) {
      setError('Sélectionne au moins une image générée dans ChatGPT Images ou Google Flow.');
      return;
    }

    setError(null);
    setGenerating(true);
    try {
      const imported: ArtworkVariation[] = [];
      for (let index = 0; index < selected.length; index++) {
        const dataUrl = await fileToDataUrl(selected[index]);
        imported.push({
          id: `external-${Date.now()}-${index}`,
          dataUrl,
          seed: makeSeed(params, index),
          aspectRatio: '16:9',
          provider: 'external-ai',
          model: 'ChatGPT Images / Google Flow import',
        });
        onTrackAction();
      }
      setVariations(imported);
      setFormats({});
      setActive(0);
      setEngine('ai');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const generateOne = async (mode: ArtworkEngine, index: number, aspectRatio: ArtworkVariation['aspectRatio'], seed: number, references: string[] = []) => {
    if (mode === 'ai') {
      const prompt = aspectRatio === '16:9' ? editedPrompt : buildFormatPrompt(params.title, aspectRatio);
      return generateAiArtwork(params, prompt, seed, aspectRatio, references);
    }
    const local = await renderArtwork(params, seed, aspectRatio);
    return { ...local, provider: 'local' as const, model: 'Canvas 2D fallback' };
  };

  const generateVariations = async (mode: ArtworkEngine = 'ai') => {
    setEngine(mode);
    setGenerating(true);
    setError(null);
    setVariations([]);
    setFormats({});
    setActive(null);
    cancelRef.current = false;

    try {
      const next: ArtworkVariation[] = [];
      for (let index = 0; index < 4; index++) {
        if (cancelRef.current) break;
        const variation = await generateOne(mode, index, '16:9', makeSeed(params, index));
        next.push(variation);
        setVariations([...next]);
        if (index === 0) setActive(0);
        onTrackAction();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(mode === 'ai'
        ? `Moteur IA indisponible : ${message} Tu peux importer une cover générée avec ton abonnement ChatGPT/Google Flow, ou utiliser le fallback local explicite.`
        : message);
    } finally {
      setGenerating(false);
    }
  };

  const generateFormats = async (index: number) => {
    const base = variations[index];
    if (!base || formatting !== null) return;

    setFormatting(index);
    setError(null);

    try {
      const mode: ArtworkEngine = base.provider === 'local' ? 'local' : 'ai';
      const references = mode === 'ai' ? [base.dataUrl] : [];
      const [square, story] = await Promise.all([
        generateOne(mode, index, '1:1', base.seed, references),
        generateOne(mode, index, '9:16', base.seed, references),
      ]);
      setFormats(previous => ({ ...previous, [index]: { square, story } }));
      onTrackAction();
      onTrackAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormatting(null);
    }
  };

  const generateVideo = async (index: number) => {
    const base = variations[index];
    if (!base || videoBusy) return;
    setVideoBusy(true);
    setError(null);
    setActive(index);

    try {
      const blob = await createTeaserVideo(base, params.title, 8);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const url = URL.createObjectURL(blob);
      setVideoBlob(blob);
      setVideoUrl(url);
      onTrackAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setVideoBusy(false);
    }
  };

  const exportZip = async () => {
    if (active === null) return;
    const zip = new JSZip();
    const safeTitle = params.title.trim().replace(/[^a-z0-9-_]+/gi, '_') || 'release';
    const folder = zip.folder(`${safeTitle}_Track-To-Market`)!;
    const selected = variations[active];
    const format = formats[active];

    folder.file(`Cover_16-9.${extensionFor(selected.dataUrl)}`, dataUrlToBase64(selected.dataUrl), { base64: true });
    if (format?.square) folder.file(`Cover_1-1.${extensionFor(format.square.dataUrl)}`, dataUrlToBase64(format.square.dataUrl), { base64: true });
    if (format?.story) folder.file(`Cover_9-16.${extensionFor(format.story.dataUrl)}`, dataUrlToBase64(format.story.dataUrl), { base64: true });
    if (videoBlob) folder.file('Teaser_8s.webm', videoBlob);

    folder.file('Cover_Prompt.txt', editedPrompt);
    folder.file('Description_SoundCloud.txt', pack.soundcloudDescription);
    folder.file('Tags.txt', pack.tags.join(', '));
    folder.file('Social_Caption.txt', pack.caption);
    folder.file('release-pack.json', JSON.stringify({
      version: '0.1.0',
      trackId: params.trackId,
      artworkProvider: selected.provider || engine,
      artworkModel: selected.model,
      params: { ...params, logoBase64: params.logoBase64 ? '[embedded image omitted]' : undefined },
      pack: { ...pack, coverPrompt: editedPrompt },
    }, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, `${safeTitle}_Release_Pack.zip`);
    publishPackToStudio(params, { ...pack, coverPrompt: editedPrompt });
  };

  const replacePack = (field: keyof ReleasePack, value: string | string[]) => onPackChange({ ...pack, [field]: value } as ReleasePack);

  return <div className="output-stack">
    {preview && <div className="modal" onClick={() => setPreview(null)}><img src={preview} alt="Artwork preview" /></div>}
    {videoUrl && <div className="modal" onClick={() => setVideoUrl(null)}><div className="video-modal" onClick={event => event.stopPropagation()}><video src={videoUrl} autoPlay loop controls /><div className="modal-actions"><Button onClick={() => videoBlob && downloadBlob(videoBlob, `${params.title || 'track'}_teaser_8s.webm`)}>Télécharger WebM</Button><Button variant="ghost" onClick={() => setVideoUrl(null)}>Fermer</Button></div></div></div>}

    <header className="release-head"><div><span>TRACK-TO-MARKET / AI-FIRST ENGINE</span><h1>{params.title || 'Sans titre'}</h1><p>{params.trackId ? `Studio trackId · ${params.trackId}` : 'Standalone release workflow'}</p></div><Button variant="ghost" onClick={onRegenerate}>↻ Nouveau pack</Button></header>
    {error && <div className="error-banner">{error}</div>}

    <div className="output-grid">
      <section className="visual-column">
        <div className="section-row"><b>Galerie de covers · vraie génération IA</b><span>{variations[active ?? -1]?.provider === 'external-ai' ? 'Import ChatGPT / Flow' : engine === 'ai' ? 'FLUX.2 klein 4B · Workers AI' : 'Fallback local explicite'}</span></div>

        {!variations.length && !generating ? <div className="art-empty">
          <div className="art-icon">◇</div>
          <h3>AI artwork engine</h3>
          <p>FLUX.2 génère automatiquement 4 covers. Tu peux aussi réutiliser les images générées avec tes abonnements ChatGPT Images ou Google Flow.</p>
          <Button onClick={() => generateVariations('ai')}>Créer 4 variations IA · FLUX.2</Button>
          <label className="button button-ghost external-import">Importer covers ChatGPT / Flow<input type="file" accept="image/*" multiple onChange={event => importExternalCovers(event.target.files)} /></label>
          <Button variant="ghost" onClick={() => generateVariations('local')}>Fallback local uniquement</Button>
        </div> :
          <div className="art-grid">{[0,1,2,3].map(index => <div key={variations[index]?.id || index} className={`art-card ${active === index ? 'active' : ''}`} onClick={() => variations[index] && setActive(index)}>{variations[index] ? <><img src={variations[index].dataUrl} alt={`Cover ${index + 1}`} /><div className="art-overlay"><Button onClick={() => setPreview(variations[index].dataUrl)}>Aperçu</Button><Button variant="ghost" onClick={() => generateFormats(index)} disabled={formatting !== null}>{formatting === index ? 'Adaptation…' : formats[index] ? '✓ Formats prêts' : 'Adapter 1:1 + 9:16'}</Button><Button variant="ghost" onClick={() => generateVideo(index)} disabled={videoBusy}>{videoBusy && active === index ? 'Encodage…' : 'Teaser 8s'}</Button></div></> : <div className="art-placeholder">{generating && variations.length === index ? (engine === 'ai' ? 'IA en génération…' : 'Fallback local…') : `VARIANT ${index + 1}`}</div>}</div>)}</div>}
        {generating && <Button variant="danger" onClick={() => { cancelRef.current = true; }}>Annuler la génération</Button>}
        {active !== null && !formats[active] && <Button variant="ghost" onClick={exportZip}>Exporter la cover sélectionnée + textes</Button>}

        {active !== null && formats[active] && <div className="format-panel"><div className="section-row"><b>Formats additionnels</b><span>{variations[active]?.provider !== 'local' ? 'Référence IA conservée' : 'Seed locale verrouillée'}</span></div><div className="formats"><figure><img src={formats[active].square?.dataUrl} alt="Square cover"/><figcaption>1:1 · Square</figcaption></figure><figure className="story"><img src={formats[active].story?.dataUrl} alt="Story cover"/><figcaption>9:16 · Story / Reel</figcaption></figure></div><Button onClick={exportZip}>Exporter le pack complet .ZIP</Button></div>}
      </section>

      <section className="text-column">
        <TextPanel title="Cover Prompt · éditable" action={copied === 'prompt' ? 'Copié ✓' : 'Copier'} onAction={() => copy(editedPrompt, 'prompt')}><TextInput value={editedPrompt} onChange={setEditedPrompt} rows={8}/><button className="mini-link" onClick={() => setEditedPrompt(generateCoverPrompt(params, Math.floor(Math.random()*4)))}>Régénérer seulement le prompt</button></TextPanel>
        <TextPanel title="SoundCloud · max 140" action={copied === 'sc' ? 'Copié ✓' : 'Copier'} onAction={() => copy(pack.soundcloudDescription, 'sc')}><div className="text-card mono">{pack.soundcloudDescription}<small>{pack.soundcloudDescription.length}/140</small></div><button className="mini-link" onClick={() => replacePack('soundcloudDescription', generateDescription(params))}>Régénérer seulement la description</button></TextPanel>
        <TextPanel title="Social caption" action={copied === 'caption' ? 'Copié ✓' : 'Copier'} onAction={() => copy(pack.caption, 'caption')}><div className="text-card">{pack.caption}</div><button className="mini-link" onClick={() => replacePack('caption', generateCaption(params))}>Régénérer seulement la caption</button></TextPanel>
        <TextPanel title="Tags SoundCloud"><div className="tags">{pack.tags.map(tag => <span key={tag}>#{tag}</span>)}</div></TextPanel>
      </section>
    </div>
  </div>;
};

const TextPanel: React.FC<{ title: string; action?: string; onAction?: () => void; children: React.ReactNode }> = ({ title, action, onAction, children }) => <div className="text-panel"><div className="section-row"><b>{title}</b>{action && <button onClick={onAction}>{action}</button>}</div>{children}</div>;
