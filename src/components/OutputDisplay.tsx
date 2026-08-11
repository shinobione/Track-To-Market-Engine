import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import type { ArtworkVariation, FormatPack, GenerationParams, ReleasePack } from '../types';
import { Button, TextInput } from './Primitives';
import { makeSeed, renderArtwork } from '../lib/artwork';
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

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const dataUrlToBase64 = (url: string) => url.split(',')[1] || '';

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
  const cancelRef = useRef(false);

  useEffect(() => {
    setEditedPrompt(pack.coverPrompt);
    setVariations([]);
    setFormats({});
    setActive(null);
    setVideoBlob(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    cancelRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.coverPrompt, params.title]);

  const copy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1400);
  };

  const generateVariations = async () => {
    setGenerating(true); setError(null); setVariations([]); setFormats({}); setActive(null); cancelRef.current = false;
    try {
      const next: ArtworkVariation[] = [];
      for (let index = 0; index < 4; index++) {
        if (cancelRef.current) break;
        const variation = await renderArtwork(params, makeSeed(params, index), '16:9');
        next.push(variation); setVariations([...next]); if (index === 0) setActive(0); onTrackAction();
        await new Promise(resolve => setTimeout(resolve, 90));
      }
    } catch (err) { setError(String(err)); } finally { setGenerating(false); }
  };

  const generateFormats = async (index: number) => {
    const base = variations[index]; if (!base || formatting !== null) return;
    setFormatting(index); setError(null);
    try {
      const [square, story] = await Promise.all([
        renderArtwork(params, base.seed, '1:1'),
        renderArtwork(params, base.seed, '9:16'),
      ]);
      setFormats(previous => ({ ...previous, [index]: { square, story } }));
      onTrackAction(); onTrackAction();
    } catch (err) { setError(String(err)); } finally { setFormatting(null); }
  };

  const generateVideo = async (index: number) => {
    const base = variations[index]; if (!base || videoBusy) return;
    setVideoBusy(true); setError(null); setActive(index);
    try {
      const blob = await createTeaserVideo(base, params.title, 8);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const url = URL.createObjectURL(blob);
      setVideoBlob(blob); setVideoUrl(url); onTrackAction();
    } catch (err) { setError(String(err)); } finally { setVideoBusy(false); }
  };

  const exportZip = async () => {
    if (active === null) return;
    const zip = new JSZip();
    const safeTitle = params.title.trim().replace(/[^a-z0-9-_]+/gi, '_') || 'release';
    const folder = zip.folder(`${safeTitle}_Track-To-Market`)!;
    const selected = variations[active]; const format = formats[active];
    folder.file('Cover_16-9.png', dataUrlToBase64(selected.dataUrl), { base64: true });
    if (format?.square) folder.file('Cover_1-1.png', dataUrlToBase64(format.square.dataUrl), { base64: true });
    if (format?.story) folder.file('Cover_9-16.png', dataUrlToBase64(format.story.dataUrl), { base64: true });
    if (videoBlob) folder.file('Teaser_8s.webm', videoBlob);
    folder.file('Cover_Prompt.txt', editedPrompt);
    folder.file('Description_SoundCloud.txt', pack.soundcloudDescription);
    folder.file('Tags.txt', pack.tags.join(', '));
    folder.file('Social_Caption.txt', pack.caption);
    folder.file('release-pack.json', JSON.stringify({ version: '0.1.0', trackId: params.trackId, params: { ...params, logoBase64: params.logoBase64 ? '[embedded image omitted]' : undefined }, pack: { ...pack, coverPrompt: editedPrompt } }, null, 2));
    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, `${safeTitle}_Release_Pack.zip`);
    publishPackToStudio(params, { ...pack, coverPrompt: editedPrompt });
  };

  const replacePack = (field: keyof ReleasePack, value: string | string[]) => onPackChange({ ...pack, [field]: value } as ReleasePack);

  return <div className="output-stack">
    {preview && <div className="modal" onClick={() => setPreview(null)}><img src={preview} alt="Artwork preview" /></div>}
    {videoUrl && <div className="modal" onClick={() => setVideoUrl(null)}><div className="video-modal" onClick={event => event.stopPropagation()}><video src={videoUrl} autoPlay loop controls /><div className="modal-actions"><Button onClick={() => videoBlob && downloadBlob(videoBlob, `${params.title || 'track'}_teaser_8s.webm`)}>Télécharger WebM</Button><Button variant="ghost" onClick={() => setVideoUrl(null)}>Fermer</Button></div></div></div>}

    <header className="release-head"><div><span>TRACK-TO-MARKET / LOCAL ENGINE</span><h1>{params.title || 'Sans titre'}</h1><p>{params.trackId ? `Studio trackId · ${params.trackId}` : 'Standalone release workflow'}</p></div><Button variant="ghost" onClick={onRegenerate}>↻ Nouveau pack</Button></header>
    {error && <div className="error-banner">{error}</div>}

    <div className="output-grid">
      <section className="visual-column">
        <div className="section-row"><b>Galerie de covers · génération locale</b><span>0 API · 0 crédit</span></div>
        {!variations.length && !generating ? <div className="art-empty"><div className="art-icon">◇</div><h3>Artwork procedural engine</h3><p>4 variations cohérentes générées directement dans ton navigateur.</p><Button onClick={generateVariations}>Créer 4 variations</Button></div> :
          <div className="art-grid">{[0,1,2,3].map(index => <div key={variations[index]?.id || index} className={`art-card ${active === index ? 'active' : ''}`} onClick={() => variations[index] && setActive(index)}>{variations[index] ? <><img src={variations[index].dataUrl} alt={`Cover ${index + 1}`} /><div className="art-overlay"><Button onClick={() => setPreview(variations[index].dataUrl)}>Aperçu</Button><Button variant="ghost" onClick={() => generateFormats(index)} disabled={formatting !== null}>{formatting === index ? 'Adaptation…' : formats[index] ? '✓ Formats prêts' : 'Adapter 1:1 + 9:16'}</Button><Button variant="ghost" onClick={() => generateVideo(index)} disabled={videoBusy}>{videoBusy && active === index ? 'Encodage…' : 'Teaser 8s'}</Button></div></> : <div className="art-placeholder">{generating && variations.length === index ? 'Génération…' : `VARIANT ${index + 1}`}</div>}</div>)}</div>}
        {generating && <Button variant="danger" onClick={() => { cancelRef.current = true; }}>Annuler la génération</Button>}

        {active !== null && formats[active] && <div className="format-panel"><div className="section-row"><b>Formats additionnels</b><span>Cohérence seed verrouillée</span></div><div className="formats"><figure><img src={formats[active].square?.dataUrl} alt="Square cover"/><figcaption>1:1 · Square</figcaption></figure><figure className="story"><img src={formats[active].story?.dataUrl} alt="Story cover"/><figcaption>9:16 · Story / Reel</figcaption></figure></div><Button onClick={exportZip}>Exporter le pack complet .ZIP</Button></div>}
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
