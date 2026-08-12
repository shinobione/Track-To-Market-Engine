import { useEffect, useState } from 'react';
import { Button, MultiFieldDropdown, SectionLabel, TextInput } from './components/Primitives';
import { OutputDisplayV014 } from './components/OutputDisplayV014';
import type { GenerationParams, ReleasePack } from './types';
import { generateReleasePack } from './lib/releaseEngine';
import { announceReady, mergeBridgeInput, readStudioBridgeInput } from './lib/studioBridge';

const GENRES = ['Afrobeat','Bass House','Classical','Club Electronic','Deep House','Drill','Drum & Bass','Electro','Electro-Funk','G-Funk','Glitch Hop','Glitchcore','Hip Hop','House','Hyperpop','Lo-fi','Phonk','Plunderphonics','Pop','R&B','Reggaeton','Rock','Synthwave','Techno','Trap','West Coast Hip-Hop'].sort();
const DRAFT_KEY = 'shinobiwan:track-to-market:draft:v0.1.4';
const LEGACY_DRAFT_KEYS = [
  'shinobiwan:track-to-market:draft:v0.1.2',
  'shinobiwan:track-to-market:draft:v0.1.1',
];
const EMPTY: GenerationParams = { title: '', genres: [], style: '', audioStyle: '', lyrics: '' };

function readDraft(): GenerationParams {
  let draft = EMPTY;
  try {
    const stored = localStorage.getItem(DRAFT_KEY)
      || LEGACY_DRAFT_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
    if (stored) draft = { ...EMPTY, ...JSON.parse(stored) };
  } catch {
    draft = EMPTY;
  }
  return mergeBridgeInput(draft, readStudioBridgeInput());
}

export default function AppV014() {
  const [params, setParams] = useState<GenerationParams>(readDraft);
  const [pack, setPack] = useState<ReleasePack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ actions: 0 });

  useEffect(() => { announceReady(); }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(params));
    } catch {
      try {
        const { logoBase64: _logo, ...lightDraft } = params;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(lightDraft));
      } catch {
        // Best effort only. A failed draft save must never break generation.
      }
    }
  }, [params]);

  const generate = () => {
    const title = params.title.trim();
    if (!title) return setError('Le titre est requis.');
    if (!params.genres.length) return setError('Sélectionne au moins un genre.');
    setError(null);
    setPack(generateReleasePack({ ...params, title }));
    setStats(previous => ({ actions: previous.actions + 1 }));
  };

  const selectLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Le logo doit être une image.');
    const reader = new FileReader();
    reader.onload = () => setParams(previous => ({ ...previous, logoBase64: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-scroll">
        <div className="brand"><div className="brand-mark">TM</div><div><strong>SHINOBIWAN</strong><span>TRACK-TO-MARKET</span></div></div>
        <div className="local-badge">FINAL-FIRST · DRAFT LAB</div>

        <div className="field-group">
          <SectionLabel>Informations de base</SectionLabel>
          <TextInput value={params.title} onChange={value => setParams(previous => ({ ...previous, title: value }))} placeholder="Titre" rows={2}/>
          <MultiFieldDropdown label="Genres" values={params.genres} options={GENRES} onChange={genres => setParams(previous => ({ ...previous, genres }))}/>
        </div>

        <div className="field-group">
          <SectionLabel>Direction artistique</SectionLabel>
          <TextInput value={params.audioStyle} onChange={value => setParams(previous => ({ ...previous, audioStyle: value }))} placeholder="Suno prompt / ambiance sonore" rows={4}/>
          <TextInput value={params.style} onChange={value => setParams(previous => ({ ...previous, style: value }))} placeholder="Mood / vibe / direction artistique" rows={3}/>
        </div>

        <div className="field-group">
          <SectionLabel>Lyrics</SectionLabel>
          <TextInput value={params.lyrics} onChange={value => setParams(previous => ({ ...previous, lyrics: value }))} placeholder="Paroles / thèmes du morceau" rows={8}/>
        </div>

        <div className="field-group">
          <SectionLabel>Logo artiste · optionnel</SectionLabel>
          {params.logoBase64 ? <div className="logo-preview"><img src={params.logoBase64} alt="Artist logo"/><button onClick={() => setParams(previous => ({ ...previous, logoBase64: undefined }))}>×</button></div> : <label className="file-zone">＋ Logo SHINOBIWAN<input type="file" accept="image/*" onChange={event => selectLogo(event.target.files?.[0])}/></label>}
        </div>

        {params.trackId && <div className="studio-context"><span>STUDIO CONTEXT</span><b>{params.trackId}</b></div>}

        <div className="stats">
          <div><span>Actions session</span><b>{stats.actions}</b></div>
          <div><span>Cover finale</span><b>Premium import only</b></div>
          <p>Local AI et Cloudflare sont des moteurs de direction visuelle. Seule une cover premium importée peut être publiée comme FINAL vers STUDIO.</p>
        </div>
      </div>

      <div className="sidebar-bottom">
        {error && <div className="error-banner">{error}</div>}
        <Button onClick={generate}>✦ Générer / recalculer le Release Pack</Button>
        <small>v0.1.4 · FINAL vs DRAFT · Studio-safe gate</small>
      </div>
    </aside>

    <main className="main-content">
      {!pack ? <div className="empty-state">
        <div className="empty-symbol">↗</div>
        <span>TRACK → MARKET</span>
        <h1>Explore the direction.<br/><em>Ship the final.</em></h1>
        <p>FINAL = cover premium importée depuis ChatGPT / Flow / Gemini. LOCAL et CLOUD = brouillons de direction. Track-To-Market garde la provenance claire jusqu’au ZIP et à STUDIO.</p>
        <div className="empty-pills"><span>FINAL QUALITY</span><span>LOCAL DRAFT</span><span>CLOUD DRAFT</span><span>STUDIO SAFE</span></div>
      </div> : <OutputDisplayV014 pack={pack} params={params} onPackChange={setPack} onRegenerate={generate} onTrackAction={() => setStats(previous => ({ actions: previous.actions + 1 }))}/>} 
    </main>
  </div>;
}
