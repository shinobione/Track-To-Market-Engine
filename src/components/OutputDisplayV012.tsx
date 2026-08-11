import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import type { ArtworkVariation, FormatPack, GenerationParams, ReleasePack } from '../types';
import { Button, TextInput } from './Primitives';
import { composeArtworkBranding } from '../lib/branding';
import { adaptArtworkLocally } from '../lib/formatArtwork';
import { buildVariationPrompt, generateAiArtwork } from '../lib/aiArtwork';
import { generateLocalAiArtwork, getLocalAiHealth, type LocalAiHealth } from '../lib/localAi';
import { createTeaserVideo } from '../lib/video';
import { generateCaption, generateCoverPrompt, generateDescription } from '../lib/releaseEngine';
import { publishPackToStudio } from '../lib/studioBridge';
import { makeSeed } from '../lib/artwork';

interface Props {
  pack: ReleasePack;
  params: GenerationParams;
  onPackChange: (pack: ReleasePack) => void;
  onRegenerate: () => void;
  onTrackAction: () => void;
}

type Mode = 'quality-import' | 'local-ai' | 'cloud-draft';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const dataUrlToBase64 = (url: string) => url.split(',')[1] || '';
const extensionFor = (url: string) => url.startsWith('data:image/jpeg') ? 'jpg' : 'png';
const randomSeed = () => Math.max(1, crypto.getRandomValues(new Uint32Array(1))[0] >>> 0);
const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error || new Error('Impossible de lire cette image.'));
  reader.readAsDataURL(file);
});

export const OutputDisplayV012: React.FC<Props> = ({ pack, params, onPackChange, onRegenerate, onTrackAction }) => {
  const [covers, setCovers] = useState<ArtworkVariation[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [formats, setFormats] = useState<Record<number, FormatPack>>({});
  const [mode, setMode] = useState<Mode>('quality-import');
  const [editedPrompt, setEditedPrompt] = useState(pack.coverPrompt);
  const [busy, setBusy] = useState(false);
  const [formatBusy, setFormatBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [localHealth, setLocalHealth] = useState<LocalAiHealth>({ ok: false, ready: false, message: 'Non vérifié' });

  const selected = active === null ? undefined : covers[active];
  const selectedFormats = active === null ? undefined : formats[active];

  useEffect(() => {
    setEditedPrompt(pack.coverPrompt);
    setCovers([]);
    setFormats({});
    setActive(null);
    setError(null);
    setNotice(null);
    setMode('quality-import');
  }, [pack.coverPrompt, params.title]);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const health = await getLocalAiHealth();
      if (mounted) setLocalHealth(health);
    };
    void check();
    const timer = window.setInterval(check, 15000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  const localLabel = useMemo(() => {
    if (localHealth.ready) return `LOCAL AI ONLINE${localHealth.gpu ? ` · ${localHealth.gpu}` : ''}`;
    if (localHealth.ok) return 'LOCAL BRIDGE ONLINE · WORKFLOW À CONFIGURER';
    return 'LOCAL AI OFFLINE';
  }, [localHealth]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1300);
  };

  const importQualityCovers = async (files?: FileList | null) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, 4);
    if (!selectedFiles.length) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const next: ArtworkVariation[] = [];
      for (let index = 0; index < selectedFiles.length; index++) {
        const raw = await fileToDataUrl(selectedFiles[index]);
        const branded = await composeArtworkBranding(raw, params, '16:9');
        next.push({
          id: `premium-${Date.now()}-${index}`,
          dataUrl: branded,
          sourceDataUrl: raw,
          seed: makeSeed(params, index),
          aspectRatio: '16:9',
          provider: 'external-ai',
          model: 'ChatGPT Images / Google Flow / Gemini import + deterministic branding',
        });
        onTrackAction();
      }
      setMode('quality-import'); setCovers(next); setFormats({}); setActive(0);
      setNotice('Mode QUALITÉ : cover(s) premium importée(s). Le titre et le vrai logo sont appliqués localement sans les redessiner par IA.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  };

  const generateLocal = async () => {
    const health = await getLocalAiHealth(1800);
    setLocalHealth(health);
    if (!health.ready) {
      setError('Le moteur local n’est pas prêt. Lance START_LOCAL_AI.bat puis vérifie le workflow ComfyUI. Tes inputs restent sauvegardés.');
      return;
    }
    setBusy(true); setError(null); setNotice(null); setMode('local-ai'); setCovers([]); setFormats({}); setActive(null);
    try {
      const next: ArtworkVariation[] = [];
      for (let index = 0; index < 4; index++) {
        const seed = randomSeed();
        const raw = await generateLocalAiArtwork(params, buildVariationPrompt(editedPrompt, index, false), seed, '16:9');
        const branded = await composeArtworkBranding(raw.sourceDataUrl || raw.dataUrl, params, '16:9');
        next.push({ ...raw, dataUrl: branded });
        setCovers([...next]);
        if (index === 0) setActive(0);
        onTrackAction();
      }
      setNotice('4 covers générées sur ton PC. Aucun quota Cloudflare consommé.');
    } catch (err) {
      setError(`Local AI : ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusy(false); }
  };

  const generateCloudDrafts = async () => {
    setBusy(true); setError(null); setNotice(null); setMode('cloud-draft'); setCovers([]); setFormats({}); setActive(null);
    try {
      const next: ArtworkVariation[] = [];
      for (let index = 0; index < 4; index++) {
        const seed = randomSeed();
        const raw = await generateAiArtwork(params, buildVariationPrompt(editedPrompt, index, true), seed, '16:9', [], 'fast');
        const source = raw.sourceDataUrl || raw.dataUrl;
        const branded = await composeArtworkBranding(source, params, '16:9');
        next.push({ ...raw, dataUrl: branded, sourceDataUrl: source, model: `${raw.model || 'FLUX'} · DRAFT ONLY` });
        setCovers([...next]);
        if (index === 0) setActive(0);
        onTrackAction();
      }
      setNotice('Brouillons Cloudflare générés. Ce mode est prévu pour explorer une direction, pas pour la cover finale.');
    } catch (err) {
      setError(`Cloud Draft : ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusy(false); }
  };

  const makeFormats = async () => {
    if (!selected || active === null || formatBusy) return;
    setFormatBusy(true); setError(null);
    try {
      const source = selected.sourceDataUrl || selected.dataUrl;
      const [square, story] = await Promise.all([
        adaptArtworkLocally(source, params, '1:1', selected.seed, selected.provider, selected.model),
        adaptArtworkLocally(source, params, '9:16', selected.seed, selected.provider, selected.model),
      ]);
      setFormats(previous => ({ ...previous, [active]: { square, story } }));
      onTrackAction(); onTrackAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setFormatBusy(false); }
  };

  const makeVideo = async () => {
    if (!selected || videoBusy) return;
    setVideoBusy(true); setError(null);
    try {
      const blob = await createTeaserVideo(selected, params.title, 8);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoBlob(blob); setVideoUrl(URL.createObjectURL(blob)); onTrackAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setVideoBusy(false); }
  };

  const exportZip = async () => {
    if (!selected) return;
    const zip = new JSZip();
    const safeTitle = params.title.trim().replace(/[^a-z0-9-_]+/gi, '_') || 'release';
    const folder = zip.folder(`${safeTitle}_Track-To-Market`)!;
    folder.file(`Cover_16-9.${extensionFor(selected.dataUrl)}`, dataUrlToBase64(selected.dataUrl), { base64: true });
    if (selectedFormats?.square) folder.file(`Cover_1-1.${extensionFor(selectedFormats.square.dataUrl)}`, dataUrlToBase64(selectedFormats.square.dataUrl), { base64: true });
    if (selectedFormats?.story) folder.file(`Cover_9-16.${extensionFor(selectedFormats.story.dataUrl)}`, dataUrlToBase64(selectedFormats.story.dataUrl), { base64: true });
    if (videoBlob) folder.file('Teaser_8s.webm', videoBlob);
    folder.file('Cover_Prompt.txt', editedPrompt);
    folder.file('Description_SoundCloud.txt', pack.soundcloudDescription);
    folder.file('Tags.txt', pack.tags.join(', '));
    folder.file('Social_Caption.txt', pack.caption);
    folder.file('release-pack.json', JSON.stringify({ version: '0.1.2', trackId: params.trackId, artworkProvider: selected.provider, artworkModel: selected.model, mode, params: { ...params, logoBase64: params.logoBase64 ? '[embedded image omitted]' : undefined }, pack: { ...pack, coverPrompt: editedPrompt } }, null, 2));
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `${safeTitle}_Release_Pack.zip`);
    publishPackToStudio(params, { ...pack, coverPrompt: editedPrompt });
  };

  const replacePack = (field: keyof ReleasePack, value: string | string[]) => onPackChange({ ...pack, [field]: value } as ReleasePack);

  return <div className="output-stack v012-output">
    {preview && <div className="modal" onClick={() => setPreview(null)}><img src={preview} alt="Artwork preview" /></div>}
    {videoUrl && <div className="modal" onClick={() => setVideoUrl(null)}><div className="video-modal" onClick={event => event.stopPropagation()}><video src={videoUrl} autoPlay loop controls /><div className="modal-actions"><Button onClick={() => videoBlob && downloadBlob(videoBlob, `${params.title}_teaser_8s.webm`)}>Télécharger WebM</Button><Button variant="ghost" onClick={() => setVideoUrl(null)}>Fermer</Button></div></div></div>}

    <header className="release-head"><div><span>TRACK-TO-MARKET / QUALITY-FIRST</span><h1>{params.title || 'Sans titre'}</h1><p>Premium external AI · Local AI bridge · Cloud draft fallback</p></div><Button variant="ghost" onClick={onRegenerate}>↻ Recalculer le pack</Button></header>
    {error && <div className="error-banner">{error}</div>}
    {notice && <div className="notice-banner">{notice}</div>}

    <div className="provider-strip">
      <div className="provider-card recommended"><strong>01 · QUALITÉ</strong><span>ChatGPT Images / Google Flow / Gemini</span><small>Recommandé pour la cover finale</small></div>
      <div className={`provider-card ${localHealth.ready ? 'online' : ''}`}><strong>02 · LOCAL AI</strong><span>{localLabel}</span><small>RTX · zéro coût par génération</small></div>
      <div className="provider-card draft"><strong>03 · CLOUD DRAFT</strong><span>FLUX.2 klein · Workers AI</span><small>Exploration rapide uniquement</small></div>
    </div>

    <div className="output-grid">
      <section className="visual-column">
        <div className="section-row"><b>Galerie de covers</b><span>{mode === 'quality-import' ? 'PREMIUM IMPORT' : mode === 'local-ai' ? 'LOCAL GPU' : 'CLOUD DRAFT'}</span></div>
        {!covers.length && !busy ? <div className="art-empty quality-hub">
          <div className="art-icon">◇</div><h3>Choisis le niveau de qualité</h3>
          <p>Le chemin premium exploite tes abonnements existants. Le moteur local devient le chemin gratuit automatisable. Cloudflare reste un brouillon.</p>
          <Button onClick={() => copy(editedPrompt, 'prompt-main')}>{copied === 'prompt-main' ? 'Prompt copié ✓' : '1 · Copier le prompt premium'}</Button>
          <label className="button button-primary external-import">2 · Importer les covers ChatGPT / Flow / Gemini<input type="file" accept="image/*" multiple onChange={event => importQualityCovers(event.target.files)} /></label>
          <Button variant="ghost" onClick={generateLocal} disabled={busy}>{localHealth.ready ? 'Générer 4 covers · Local AI' : 'Tester / lancer Local AI'}</Button>
          <Button variant="ghost" onClick={generateCloudDrafts}>Brouillons Cloudflare · quota gratuit</Button>
        </div> : <div className="art-grid">{[0,1,2,3].map(index => {
          const cover = covers[index];
          return <div key={cover?.id || index} className={`art-card ${active === index ? 'active' : ''}`} onClick={() => cover && setActive(index)}>{cover ? <><img src={cover.dataUrl} alt={`Cover ${index + 1}`}/><div className="art-overlay"><Button onClick={() => setPreview(cover.dataUrl)}>Aperçu</Button></div></> : <div className="art-placeholder">{busy ? 'GÉNÉRATION…' : 'VIDE'}</div>}</div>;
        })}</div>}
        {busy && <div className="notice-banner">Génération en cours… tes inputs restent sauvegardés.</div>}
        {covers.length > 0 && !busy && <div className="workflow-actions"><Button variant="ghost" onClick={() => setCovers([])}>← Changer de source</Button>{mode === 'local-ai' && <Button variant="ghost" onClick={generateLocal}>↻ Régénérer local</Button>}{mode === 'cloud-draft' && <Button variant="ghost" onClick={generateCloudDrafts}>↻ Régénérer brouillons</Button>}<label className="button button-ghost external-import">Remplacer par covers premium<input type="file" accept="image/*" multiple onChange={event => importQualityCovers(event.target.files)} /></label></div>}
        {selected && <div className="format-panel"><div className="section-row"><b>Finalisation</b><span>Branding déterministe</span></div><div className="workflow-actions"><Button onClick={makeFormats} disabled={formatBusy}>{formatBusy ? 'Adaptation…' : selectedFormats ? '✓ 1:1 + 9:16 prêts' : 'Adapter 1:1 + 9:16'}</Button><Button variant="ghost" onClick={makeVideo} disabled={videoBusy}>{videoBusy ? 'Encodage…' : 'Teaser 8s'}</Button><Button variant="ghost" onClick={exportZip}>Exporter .ZIP</Button></div>{selectedFormats && <div className="formats"><figure><img src={selectedFormats.square?.dataUrl} alt="Square"/><figcaption>1:1</figcaption></figure><figure className="story"><img src={selectedFormats.story?.dataUrl} alt="Story"/><figcaption>9:16</figcaption></figure></div>}</div>}
      </section>

      <section className="text-column">
        <TextPanel title="Cover Prompt · premium" action={copied === 'prompt' ? 'Copié ✓' : 'Copier'} onAction={() => copy(editedPrompt, 'prompt')}><TextInput value={editedPrompt} onChange={setEditedPrompt} rows={10}/><button className="mini-link" onClick={() => setEditedPrompt(generateCoverPrompt(params, Math.floor(Math.random()*4)))}>Régénérer seulement le prompt</button></TextPanel>
        <TextPanel title="SoundCloud · max 140" action="Copier" onAction={() => copy(pack.soundcloudDescription, 'sc')}><div className="text-card mono">{pack.soundcloudDescription}<small>{pack.soundcloudDescription.length}/140</small></div><button className="mini-link" onClick={() => replacePack('soundcloudDescription', generateDescription(params))}>Régénérer seulement la description</button></TextPanel>
        <TextPanel title="Social caption" action="Copier" onAction={() => copy(pack.caption, 'caption')}><div className="text-card">{pack.caption}</div><button className="mini-link" onClick={() => replacePack('caption', generateCaption(params))}>Régénérer seulement la caption</button></TextPanel>
        <TextPanel title="Tags SoundCloud"><div className="tags">{pack.tags.map(tag => <span key={tag}>#{tag}</span>)}</div></TextPanel>
      </section>
    </div>
  </div>;
};

const TextPanel: React.FC<{ title: string; action?: string; onAction?: () => void; children: React.ReactNode }> = ({ title, action, onAction, children }) => <div className="text-panel"><div className="section-row"><b>{title}</b>{action && <button onClick={onAction}>{action}</button>}</div>{children}</div>;
