import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import type { ArtworkVariation, FormatPack, GenerationParams, ReleasePack } from '../types';
import { Button, TextInput } from './Primitives';
import { makeSeed, renderArtwork } from '../lib/artwork';
import { buildFormatPrompt, buildVariationPrompt, generateAiArtwork, isAiContentFlagError } from '../lib/aiArtwork';
import { composeArtworkBranding } from '../lib/branding';
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
type ArtworkSlot = ArtworkVariation | undefined;

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
const randomNonce = () => crypto.getRandomValues(new Uint32Array(1))[0] || Date.now();
const normalizeSeed = (value: number) => Math.max(1, value >>> 0);

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error || new Error('Unable to read imported cover.'));
  reader.readAsDataURL(file);
});

export const OutputDisplay: React.FC<Props> = ({ pack, params, onPackChange, onRegenerate, onTrackAction }) => {
  const [variations, setVariations] = useState<ArtworkSlot[]>([]);
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
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
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
    setNotice(null);
    setGenerating(true);
    try {
      const imported: ArtworkSlot[] = [];
      for (let index = 0; index < selected.length; index++) {
        const rawDataUrl = await fileToDataUrl(selected[index]);
        const brandedDataUrl = await composeArtworkBranding(rawDataUrl, params, '16:9');
        imported[index] = {
          id: `external-${Date.now()}-${index}`,
          dataUrl: brandedDataUrl,
          sourceDataUrl: rawDataUrl,
          seed: makeSeed(params, index),
          aspectRatio: '16:9',
          provider: 'external-ai',
          model: 'ChatGPT Images / Google Flow import + local branding',
        };
        onTrackAction();
      }
      setVariations(imported);
      setFormats({});
      setActive(0);
      setEngine('ai');
      setNotice('Covers importées : le titre et le logo exacts ont été composés localement, sans demander à l’IA de les redessiner.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const generateOne = async (
    mode: ArtworkEngine,
    index: number,
    aspectRatio: ArtworkVariation['aspectRatio'],
    seed: number,
    references: string[] = [],
    safeMode = false,
  ) => {
    if (mode === 'ai') {
      const prompt = aspectRatio === '16:9'
        ? buildVariationPrompt(editedPrompt, index, safeMode)
        : buildFormatPrompt(params.title, aspectRatio, safeMode);
      return generateAiArtwork(params, prompt, seed, aspectRatio, references, 'quality');
    }
    const local = await renderArtwork(params, seed, aspectRatio);
    return { ...local, sourceDataUrl: local.dataUrl, provider: 'local' as const, model: 'Canvas 2D fallback' };
  };

  const generateVariations = async (mode: ArtworkEngine = 'ai') => {
    setEngine(mode);
    setGenerating(true);
    setError(null);
    setNotice(null);
    setVariations([]);
    setFormats({});
    setActive(null);
    cancelRef.current = false;

    const nonce = randomNonce();
    const next: ArtworkSlot[] = new Array(4).fill(undefined);
    let firstActive: number | null = null;
    let permanentlyFlagged = 0;
    let recoveredFlags = 0;

    try {
      for (let index = 0; index < 4; index++) {
        if (cancelRef.current) break;
        let created: ArtworkVariation | undefined;
        let lastFlag: unknown;
        const attempts = mode === 'ai' ? 3 : 1;

        for (let attempt = 0; attempt < attempts; attempt++) {
          const seed = normalizeSeed(makeSeed(params, index) ^ nonce ^ ((attempt + 1) * 0x9e3779b9));
          try {
            created = await generateOne(mode, index, '16:9', seed, [], attempt > 0);
            if (attempt > 0) recoveredFlags += 1;
            break;
          } catch (err) {
            if (mode === 'ai' && isAiContentFlagError(err)) {
              lastFlag = err;
              continue;
            }
            throw err;
          }
        }

        if (!created) {
          permanentlyFlagged += 1;
          next[index] = undefined;
          setVariations([...next]);
          if (!lastFlag) throw new Error('La variante n’a pas pu être générée.');
          continue;
        }

        next[index] = created;
        setVariations([...next]);
        if (firstActive === null) {
          firstActive = index;
          setActive(index);
        }
        onTrackAction();
      }

      if (permanentlyFlagged) {
        setNotice(`${permanentlyFlagged} variante(s) rejetée(s) par la modération après retry. Les autres ont été conservées : tu peux relancer les 4 sans refresh.`);
      } else if (recoveredFlags) {
        setNotice(`${recoveredFlags} rejet(s) de modération ont été récupérés automatiquement avec une nouvelle seed et une variante plus abstraite.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(mode === 'ai'
        ? `Génération IA interrompue : ${message} Tes inputs sont conservés. Tu peux relancer les 4 covers immédiatement.`
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
    setNotice(null);

    try {
      const mode: ArtworkEngine = base.provider === 'local' ? 'local' : 'ai';
      const references = mode === 'ai' ? [base.sourceDataUrl || base.dataUrl] : [];
      const createFormat = async (aspectRatio: '1:1' | '9:16') => {
        try {
          return await generateOne(mode, index, aspectRatio, base.seed, references, false);
        } catch (err) {
          if (mode === 'ai' && isAiContentFlagError(err)) {
            return generateOne(mode, index, aspectRatio, normalizeSeed(base.seed ^ randomNonce()), references, true);
          }
          throw err;
        }
      };
      const [square, story] = await Promise.all([createFormat('1:1'), createFormat('9:16')]);
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
    const selected = variations[active];
    if (!selected) return;
    const zip = new JSZip();
    const safeTitle = params.title.trim().replace(/[^a-z0-9-_]+/gi, '_') || 'release';
    const folder = zip.folder(`${safeTitle}_Track-To-Market`)!;
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
      version: '0.1.1',
      trackId: params.trackId,
      artworkProvider: selected.provider || engine,
      artworkModel: selected.model,
      branding: 'deterministic browser compositor',
      params: { ...params, logoBase64: params.logoBase64 ? '[embedded image omitted]' : undefined },
      pack: { ...pack, coverPrompt: editedPrompt },
    }, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, `${safeTitle}_Release_Pack.zip`);
    publishPackToStudio(params, { ...pack, coverPrompt: editedPrompt });
  };

  const replacePack = (field: keyof ReleasePack, value: string | string[]) => onPackChange({ ...pack, [field]: value } as ReleasePack);
  const selectedVariation = active === null ? undefined : variations[active];
  const generatedCount = variations.filter(Boolean).length;

  return <div className="output-stack">
    {preview && <div className="modal" onClick={() => setPreview(null)}><img src={preview} alt="Artwork preview" /></div>}
    {videoUrl && <div className="modal" onClick={() => setVideoUrl(null)}><div className="video-modal" onClick={event => event.stopPropagation()}><video src={videoUrl} autoPlay loop controls /><div className="modal-actions"><Button onClick={() => videoBlob && downloadBlob(videoBlob, `${params.title || 'track'}_teaser_8s.webm`)}>Télécharger WebM</Button><Button variant="ghost" onClick={() => setVideoUrl(null)}>Fermer</Button></div></div></div>}

    <header className="release-head"><div><span>TRACK-TO-MARKET / AI-FIRST ENGINE</span><h1>{params.title || 'Sans titre'}</h1><p>{params.trackId ? `Studio trackId · ${params.trackId}` : 'Brouillon local autosauvegardé · standalone release workflow'}</p></div><Button variant="ghost" onClick={onRegenerate}>↻ Recalculer le pack</Button></header>
    {error && <div className="error-banner">{error}</div>}
    {notice && <div className="notice-banner">{notice}</div>}

    <div className="output-grid">
      <section className="visual-column">
        <div className="section-row art-section-head"><b>Galerie de covers · artwork IA + branding exact</b><div className="art-head-actions"><span>{selectedVariation?.provider === 'external-ai' ? 'Import ChatGPT / Flow' : engine === 'ai' ? 'FLUX.2 dev · Quality · 8 steps' : 'Fallback local explicite'}</span>{generatedCount > 0 && !generating && <button onClick={() => generateVariations(engine)}>↻ Régénérer les 4</button>}</div></div>

        {!generatedCount && !generating ? <div className="art-empty">
          <div className="art-icon">◇</div>
          <h3>AI artwork engine</h3>
          <p>FLUX.2 dev génère l’artwork sans texte. Track-To-Market ajoute ensuite le titre et ton vrai logo localement pour éviter la typo IA déformée.</p>
          <Button onClick={() => generateVariations('ai')}>Créer 4 variations IA · Qualité</Button>
          <label className="button button-ghost external-import">Importer covers ChatGPT / Flow<input type="file" accept="image/*" multiple onChange={event => importExternalCovers(event.target.files)} /></label>
          <Button variant="ghost" onClick={() => generateVariations('local')}>Fallback local uniquement</Button>
        </div> :
          <div className="art-grid">{[0,1,2,3].map(index => {
            const variation = variations[index];
            return <div key={variation?.id || index} className={`art-card ${active === index ? 'active' : ''}`} onClick={() => variation && setActive(index)}>{variation ? <><img src={variation.dataUrl} alt={`Cover ${index + 1}`} /><div className="art-overlay"><Button onClick={() => setPreview(variation.dataUrl)}>Aperçu</Button><Button variant="ghost" onClick={() => generateFormats(index)} disabled={formatting !== null}>{formatting === index ? 'Adaptation…' : formats[index] ? '✓ Formats prêts' : 'Adapter 1:1 + 9:16'}</Button><Button variant="ghost" onClick={() => generateVideo(index)} disabled={videoBusy}>{videoBusy && active === index ? 'Encodage…' : 'Teaser 8s'}</Button></div></> : <div className="art-placeholder">{generating ? 'IA en génération…' : 'VARIANTE NON GÉNÉRÉE'}</div>}</div>;
          })}</div>}
        <div className="generation-actions">{generating ? <Button variant="danger" onClick={() => { cancelRef.current = true; }}>Annuler la génération</Button> : generatedCount > 0 ? <Button variant="ghost" onClick={() => generateVariations(engine)}>↻ Régénérer 4 nouvelles covers</Button> : null}</div>
        {active !== null && selectedVariation && !formats[active] && <Button variant="ghost" onClick={exportZip}>Exporter la cover sélectionnée + textes</Button>}

        {active !== null && selectedVariation && formats[active] && <div className="format-panel"><div className="section-row"><b>Formats additionnels</b><span>{selectedVariation.provider !== 'local' ? 'Artwork recomposé + branding exact' : 'Seed locale verrouillée'}</span></div><div className="formats"><figure><img src={formats[active].square?.dataUrl} alt="Square cover"/><figcaption>1:1 · Square</figcaption></figure><figure className="story"><img src={formats[active].story?.dataUrl} alt="Story cover"/><figcaption>9:16 · Story / Reel</figcaption></figure></div><Button onClick={exportZip}>Exporter le pack complet .ZIP</Button></div>}
      </section>

      <section className="text-column">
        <TextPanel title="Cover Prompt · artwork only" action={copied === 'prompt' ? 'Copié ✓' : 'Copier'} onAction={() => copy(editedPrompt, 'prompt')}><TextInput value={editedPrompt} onChange={setEditedPrompt} rows={8}/><button className="mini-link" onClick={() => setEditedPrompt(generateCoverPrompt(params, Math.floor(Math.random()*4)))}>Régénérer seulement le prompt</button></TextPanel>
        <TextPanel title="SoundCloud · max 140" action={copied === 'sc' ? 'Copié ✓' : 'Copier'} onAction={() => copy(pack.soundcloudDescription, 'sc')}><div className="text-card mono">{pack.soundcloudDescription}<small>{pack.soundcloudDescription.length}/140</small></div><button className="mini-link" onClick={() => replacePack('soundcloudDescription', generateDescription(params))}>Régénérer seulement la description</button></TextPanel>
        <TextPanel title="Social caption" action={copied === 'caption' ? 'Copié ✓' : 'Copier'} onAction={() => copy(pack.caption, 'caption')}><div className="text-card">{pack.caption}</div><button className="mini-link" onClick={() => replacePack('caption', generateCaption(params))}>Régénérer seulement la caption</button></TextPanel>
        <TextPanel title="Tags SoundCloud"><div className="tags">{pack.tags.map(tag => <span key={tag}>#{tag}</span>)}</div></TextPanel>
      </section>
    </div>
  </div>;
};

const TextPanel: React.FC<{ title: string; action?: string; onAction?: () => void; children: React.ReactNode }> = ({ title, action, onAction, children }) => <div className="text-panel"><div className="section-row"><b>{title}</b>{action && <button onClick={onAction}>{action}</button>}</div>{children}</div>;
