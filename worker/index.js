const QUALITY_MODEL = '@cf/black-forest-labs/flux-2-dev';
const FAST_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';

const defaultOrigins = [
  'https://shinobione.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

function allowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return new Set(configured.length ? configured : defaultOrigins);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  const headers = new Headers({
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  if (allowed.has(origin)) headers.set('Access-Control-Allow-Origin', origin);
  return headers;
}

function json(request, env, body, status = 200) {
  const headers = corsHeaders(request, env);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}

function assertOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return;
  if (!allowedOrigins(env).has(origin)) throw new Error('Origin not allowed.');
}

function classifyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/your output has been flagged|output has been flagged|\b303\b/i.test(message)) {
    return {
      status: 422,
      code: 'CONTENT_FLAGGED',
      error: 'Cette variante a été rejetée par la modération du modèle. Une nouvelle seed ou une direction plus abstraite peut être relancée automatiquement.',
    };
  }
  if (/quota|neurons|limit exceeded|rate limit/i.test(message)) {
    return { status: 429, code: 'AI_QUOTA', error: message };
  }
  return { status: 500, code: 'AI_ERROR', error: message };
}

async function generateImage(request, env) {
  assertOrigin(request, env);
  const incoming = await request.formData();
  const prompt = String(incoming.get('prompt') || '').trim();
  const width = Math.min(1920, Math.max(256, Number(incoming.get('width') || 1024)));
  const height = Math.min(1920, Math.max(256, Number(incoming.get('height') || 768)));
  const seed = Math.min(9999999999, Math.max(1, Number(incoming.get('seed') || 1)));
  const profile = String(incoming.get('profile') || 'quality') === 'fast' ? 'fast' : 'quality';
  const model = profile === 'quality' ? QUALITY_MODEL : FAST_MODEL;

  if (!prompt) return json(request, env, { error: 'Prompt is required.' }, 400);

  const modelForm = new FormData();
  modelForm.append('prompt', prompt);
  modelForm.append('width', String(Math.round(width)));
  modelForm.append('height', String(Math.round(height)));
  modelForm.append('seed', String(Math.round(seed)));
  modelForm.append('guidance', profile === 'quality' ? '3.3' : '3.5');
  if (profile === 'quality') modelForm.append('steps', '8');

  for (let index = 0; index < 4; index++) {
    const candidate = incoming.get(`reference_${index}`);
    if (candidate && typeof candidate !== 'string' && candidate.size > 0) {
      modelForm.append(`input_image_${index}`, candidate, candidate.name || `reference-${index}.png`);
    }
  }

  const serialized = new Response(modelForm);
  const contentType = serialized.headers.get('content-type');
  if (!contentType || !serialized.body) throw new Error('Unable to serialize image request.');

  const result = await env.AI.run(model, {
    multipart: {
      body: serialized.body,
      contentType,
    },
  });

  if (!result?.image) throw new Error('Workers AI returned no image.');

  return json(request, env, {
    dataUrl: `data:image/jpeg;base64,${result.image}`,
    model,
    profile,
    seed: Math.round(seed),
    width: Math.round(width),
    height: Math.round(height),
  });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        return json(request, env, {
          ok: true,
          service: 'SHINOBIWAN Track-To-Market AI',
          version: '0.1.1',
          imageModel: QUALITY_MODEL,
          fastImageModel: FAST_MODEL,
          qualitySteps: 8,
          allocation: 'Cloudflare Workers AI free allocation',
        });
      }

      if (request.method === 'POST' && url.pathname === '/api/image') {
        return await generateImage(request, env);
      }

      return json(request, env, { error: 'Not found.' }, 404);
    } catch (error) {
      const classified = classifyError(error);
      return json(request, env, { error: classified.error, code: classified.code }, classified.status);
    }
  },
};
