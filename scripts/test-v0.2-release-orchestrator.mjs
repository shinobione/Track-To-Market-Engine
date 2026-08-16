import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/AppV014.tsx', 'utf8');
const output = fs.readFileSync('src/components/OutputDisplayV014.tsx', 'utf8');
const engine = fs.readFileSync('src/lib/releaseEngine.ts', 'utf8');
const branding = fs.readFileSync('src/lib/branding.ts', 'utf8');
const formats = fs.readFileSync('src/lib/formatArtwork.ts', 'utf8');
const bridge = fs.readFileSync('src/lib/studioBridge.ts', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));

assert.equal(pkg.version, '0.2.0');
assert.equal(manifest.id, '/Track-To-Market-Engine/', 'Track-To-Market PWA id must be unique on shinobione.github.io.');
assert.equal(manifest.start_url, '/Track-To-Market-Engine/', 'Track-To-Market start_url must stay inside its GitHub Pages project.');
assert.equal(manifest.scope, '/Track-To-Market-Engine/', 'Track-To-Market scope must not cover sibling GitHub Pages apps.');
assert.match(app, /artworkStrategy: 'integrated'/, 'Integrated premium artwork must be the default strategy.');
assert.match(app, /Flow\/ChatGPT compose title \+ logo/, 'The UI must explain integrated provider composition.');
assert.match(app, /image de référence dans Flow \/ ChatGPT \/ Gemini/, 'Uploaded logo handoff must be explicit in UI.');

assert.match(engine, /REFERENCE ASSET REQUIRED/, 'Logo-aware prompts must contain an explicit reference-asset contract.');
assert.match(engine, /ATTACH THAT LOGO FILE AS A REFERENCE IMAGE/, 'Prompt must tell the user/provider to attach the uploaded logo file.');
assert.match(engine, /INTEGRATED ARTWORK MODE/, 'Integrated artwork prompt strategy must exist.');
assert.match(engine, /CLEAN ARTWORK MODE/, 'Clean artwork fallback strategy must exist.');
assert.match(engine, /without requiring a generic white title overlay/, 'Prompt must reject the old generic post-overlay assumption.');

assert.match(output, /dataUrl: raw,[\s\S]*sourceDataUrl: raw/, 'Premium FINAL imports must enter the gallery unchanged.');
assert.match(output, /setBrandingMode\('preserve'\)/, 'FINAL imports must default to preserve mode.');
assert.match(output, /Original FINAL[\s\S]*Aucune modification/, 'The UI must expose an explicit non-destructive FINAL treatment.');
assert.match(output, /Provider_Handoff\.txt/, 'The ZIP must include provider handoff instructions.');
assert.match(output, /SHINOBIWAN_Logo_Reference/, 'The ZIP must include the uploaded logo reference when available.');
assert.match(output, /previewDataUrl/, 'FINAL return must prepare a real artwork preview for Studio.');

assert.match(branding, /mode: BrandingMode = 'editorial'/, 'Branding must be an explicit mode rather than implicit import behavior.');
assert.match(branding, /if \(mode === 'preserve'\) return sourceDataUrl/, 'Preserve branding mode must be lossless.');
assert.doesNotMatch(formats, /composeArtworkBranding/, 'Format adaptation must not silently re-apply generic branding.');
assert.match(formats, /safe-fit adaptation \(visual preserved\)/, 'Format adaptation must preserve the complete selected composition.');

assert.match(bridge, /BRIDGE_VERSION = '0\.2\.0'/, 'Studio Bridge V3 must expose the V0.2 protocol version.');
assert.match(bridge, /previewDataUrl: publication\.previewDataUrl/, 'Studio bridge must carry FINAL artwork preview.');
assert.match(bridge, /brandingMode: publication\.brandingMode/, 'Studio bridge must carry branding provenance.');
assert.match(main, /import '\.\/v0\.2\.0\.css';/, 'V0.2 orchestrator styles must be loaded.');

console.log('V0.2 Release Orchestrator passed logo-reference, non-destructive FINAL, safe-format, Studio-preview and isolated PWA identity guards.');
