import { useEffect, useState } from 'react';
import { Button, MultiFieldDropdown, SectionLabel, TextInput } from './components/Primitives';
import { OutputDisplay } from './components/OutputDisplay';
import type { GenerationParams, ReleasePack } from './types';
import { generateReleasePack } from './lib/releaseEngine';
import { announceReady, mergeBridgeInput, readStudioBridgeInput } from './lib/studioBridge';

const GENRES = ['Afrobeat','Bass House','Classical','Club Electronic','Deep House','Drill','Drum & Bass','Electro','Electro-Funk','G-Funk','Glitch Hop','Glitchcore','Hip Hop','House','Hyperpop','Lo-fi','Phonk','Plunderphonics','Pop','R&B','Reggaeton','Rock','Synthwave','Techno','Trap','West Coast Hip-Hop'].sort();

const EMPTY: GenerationParams = { title: '', genres: [], style: '', audioStyle: '', lyrics: '' };

export default function App() {
  const [params, setParams] = useState<GenerationParams>(() => mergeBridgeInput(EMPTY, readStudioBridgeInput()));
  const [pack, setPack] = useState<ReleasePack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ actions: 0 });

  useEffect(() => { announceReady(); }, []);

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
        <div className="local-badge">AI-FIRST · FREE ALLOCATION</div>

        <div className="field-group"><SectionLabel>Informations de base</SectionLabel><TextInput value={params.title} onChange={value => setParams(previous => ({ ...previous, title: value }))} placeholder="Titre" rows={2}/><MultiFieldDropdown label="Genres" values={params.genres} options={GENRES} onChange={genres => setParams(previous => ({ ...previous, genres }))}/></div>
        <div className="field-group"><SectionLabel>Direction artistique</SectionLabel><TextInput value={params.audioStyle} onChange={value => setParams(previous => ({ ...previous, audioStyle: value }))} placeholder="Suno prompt / ambiance sonore" rows={4}/><TextInput value={params.style} onChange={value => setParams(previous => ({ ...previous, style: value }))} placeholder="Mood / vibe / direction artistique" rows={3}/></div>
        <div className="field-group"><SectionLabel>Lyrics</SectionLabel><TextInput value={params.lyrics} onChange={value => setParams(previous => ({ ...previous, lyrics: value }))} placeholder="Paroles / thèmes du morceau" rows={8}/></div>
        <div className="field-group"><SectionLabel>Logo artiste · optionnel</SectionLabel>{params.logoBase64 ? <div className="logo-preview"><img src={params.logoBase64} alt="Artist logo"/><button onClick={() => setParams(previous => ({ ...previous, logoBase64: undefined }))}>×</button></div> : <label className="file-zone">＋ Logo SHINOBIWAN<input type="file" accept="image/*" onChange={event => selectLogo(event.target.files?.[0])}/></label>}</div>
        {params.trackId && <div className="studio-context"><span>STUDIO CONTEXT</span><b>{params.trackId}</b></div>}
        <div className="stats"><div><span>Actions session</span><b>{stats.actions}</b></div><div><span>Artwork</span><b>Workers AI</b></div><p>FLUX.2 génère les covers via un Worker Cloudflare privé. Le Canvas local reste uniquement un fallback explicite.</p></div>
      </div>
      <div className="sidebar-bottom">{error && <div className="error-banner">{error}</div>}<Button onClick={generate}>✦ Générer le Release Pack</Button><small>v0.1.0 · AI-first / Studio-ready</small></div>
    </aside>

    <main className="main-content">{!pack ? <div className="empty-state"><div className="empty-symbol">↗</div><span>TRACK → MARKET</span><h1>From finished track<br/><em>to release assets.</em></h1><p>Release copy + vraie génération de covers IA, formats cohérents, teaser et export ZIP. Hébergement statique, inférence via Cloudflare Workers AI.</p><div className="empty-pills"><span>SoundCloud</span><span>Social</span><span>FLUX.2 AI</span><span>ZIP</span></div></div> : <OutputDisplay pack={pack} params={params} onPackChange={setPack} onRegenerate={generate} onTrackAction={() => setStats(previous => ({ actions: previous.actions + 1 }))}/>}</main>
  </div>;
}
