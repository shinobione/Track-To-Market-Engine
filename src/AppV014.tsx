import { useEffect, useState } from 'react';
import { Button, MultiFieldDropdown, SectionLabel, TextInput } from './components/Primitives';
import { OutputDisplayV014 } from './components/OutputDisplayV014';
import type { ArtworkStrategy, GenerationParams, ReleasePack } from './types';
import { generateReleasePack } from './lib/releaseEngine';
import { announceReady, mergeBridgeInput, readStudioBridgeInput, subscribeStudioBridgeInput } from './lib/studioBridge';

const GENRES = ['Afrobeat','Bass House','Classical','Club Electronic','Deep House','Drill','Drum & Bass','Electro','Electro-Funk','G-Funk','Glitch Hop','Glitchcore','Hip Hop','House','Hyperpop','Lo-fi','Phonk','Plunderphonics','Pop','R&B','Reggaeton','Rock','Synthwave','Techno','Trap','West Coast Hip-Hop'].sort();
const DRAFT_KEY = 'shinobiwan:track-to-market:draft:v0.2.0';
const LEGACY_DRAFT_KEYS = [
  'shinobiwan:track-to-market:draft:v0.1.5',
  'shinobiwan:track-to-market:draft:v0.1.4',
  'shinobiwan:track-to-market:draft:v0.1.2',
  'shinobiwan:track-to-market:draft:v0.1.1',
];
const EMPTY: GenerationParams = { title: '', genres: [], style: '', audioStyle: '', lyrics: '', artworkStrategy: 'integrated' };

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

  useEffect(() => {
    const unsubscribe = subscribeStudioBridgeInput(input => {
      setParams(previous => mergeBridgeInput(previous, input));
      setPack(null);
      setError(null);
    });
    announceReady();
    return unsubscribe;
  }, []);

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

  const refreshPackFor = (next: GenerationParams) => {
    setParams(next);
    if (pack && next.title.trim() && next.genres.length) setPack(generateReleasePack(next));
  };

  const setArtworkStrategy = (artworkStrategy: ArtworkStrategy) => refreshPackFor({ ...params, artworkStrategy });

  const selectLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Le logo doit être une image.');
    const reader = new FileReader();
    reader.onload = () => {
      const logoBase64 = String(reader.result);
      refreshPackFor({ ...params, logoBase64 });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    const { logoBase64: _logo, ...withoutLogo } = params;
    refreshPackFor(withoutLogo);
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-scroll">
        <div className="brand"><div className="brand-mark">TM</div><div><strong>SHINOBIWAN</strong><span>TRACK-TO-MARKET</span></div></div>
        <div className="local-badge">RELEASE ORCHESTRATOR · STUDIO BRIDGE V3</div>

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
          <SectionLabel>Premium artwork strategy</SectionLabel>
          <div className="strategy-toggle" role="group" aria-label="Premium artwork strategy">
            <button className={params.artworkStrategy !== 'clean' ? 'active' : ''} type="button" onClick={() => setArtworkStrategy('integrated')}><strong>Integrated</strong><span>Flow/ChatGPT compose title + logo</span></button>
            <button className={params.artworkStrategy === 'clean' ? 'active' : ''} type="button" onClick={() => setArtworkStrategy('clean')}><strong>Clean</strong><span>Artwork only · brand later</span></button>
          </div>
        </div>

        <div className="field-group">
          <SectionLabel>Lyrics</SectionLabel>
          <TextInput value={params.lyrics} onChange={value => setParams(previous => ({ ...previous, lyrics: value }))} placeholder="Paroles / thèmes du morceau" rows={8}/>
        </div>

        <div className="field-group">
          <SectionLabel>Logo artiste · référence premium</SectionLabel>
          {params.logoBase64 ? <div className="logo-preview"><img src={params.logoBase64} alt="Artist logo"/><button onClick={clearLogo}>×</button></div> : <label className="file-zone">＋ Logo SHINOBIWAN<input type="file" accept="image/*" onChange={event => selectLogo(event.target.files?.[0])}/></label>}
          <small className="field-hint">En mode Integrated, le prompt exige explicitement d’attacher ce fichier comme image de référence dans Flow / ChatGPT / Gemini.</small>
        </div>

        {params.trackId && <div className="studio-context"><span>STUDIO CONTEXT</span><b>{params.trackId}</b></div>}

        <div className="stats">
          <div><span>Actions session</span><b>{stats.actions}</b></div>
          <div><span>Final workflow</span><b>External premium → TTM → Studio</b></div>
          <p>TTM orchestre le brief, les références, l’import fidèle, les variantes de format, le teaser, le release pack et le retour visuel vers Studio. Local/Cloud restent DRAFT.</p>
        </div>
      </div>

      <div className="sidebar-bottom">
        {error && <div className="error-banner">{error}</div>}
        <Button onClick={generate}>✦ Générer / recalculer le Release Pack</Button>
        <small>v0.2.0 · Release Orchestrator · Studio Bridge V3</small>
      </div>
    </aside>

    <main className="main-content">
      {!pack ? <div className="empty-state">
        <div className="empty-symbol">↗</div>
        <span>TRACK → MARKET</span>
        <h1>Brief it. Create it.<br/><em>Stage the final.</em></h1>
        <p>TTM prépare le handoff premium, transporte le logo de référence, conserve la cover importée intacte par défaut, fabrique les assets de release et renvoie une vraie preview FINAL à Studio.</p>
        <div className="empty-pills"><span>PREMIUM HANDOFF</span><span>REFERENCE LOGO</span><span>NON-DESTRUCTIVE IMPORT</span><span>STUDIO PREVIEW</span></div>
      </div> : <OutputDisplayV014 pack={pack} params={params} onPackChange={setPack} onRegenerate={generate} onTrackAction={() => setStats(previous => ({ actions: previous.actions + 1 }))}/>} 
    </main>
  </div>;
}
