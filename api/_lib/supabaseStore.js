import { createInitialDatabase } from '../../public/js/seed.js';
import { applySyncOp } from '../../public/js/logic.js';

const STATE_ID = 'main';

export function getSupabaseConfig(env = process.env) {
  const url = String(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = String(
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''
  );
  return {
    url,
    key,
    configured: Boolean(url && key)
  };
}

function sbHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

export async function loadSupabaseState(fetchImpl = globalThis.fetch, env = process.env) {
  const { url, key, configured } = getSupabaseConfig(env);
  if (!configured) {
    throw new Error('Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas.');
  }

  const res = await fetchImpl(`${url}/rest/v1/cp_state?id=eq.${STATE_ID}&select=id,data,version`, {
    method: 'GET',
    headers: sbHeaders(key)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erro ao consultar Supabase (${res.status}): ${txt}`);
  }

  const rows = await res.json();
  if (rows.length > 0 && rows[0].data) {
    return {
      state: rows[0].data,
      version: Number(rows[0].version) || 1
    };
  }

  // Inicializa banco na primeira execução
  const initial = createInitialDatabase();
  const insertRes = await fetchImpl(`${url}/rest/v1/cp_state`, {
    method: 'POST',
    headers: sbHeaders(key, {
      Prefer: 'resolution=ignore-duplicates,return=representation'
    }),
    body: JSON.stringify({
      id: STATE_ID,
      data: initial,
      version: 1,
      updated_at: new Date().toISOString()
    })
  });

  if (!insertRes.ok) {
    const txt = await insertRes.text();
    throw new Error(`Erro ao inicializar cp_state no Supabase (${insertRes.status}): ${txt}`);
  }

  const inserted = await insertRes.json();
  if (Array.isArray(inserted) && inserted.length > 0) {
    return {
      state: inserted[0].data,
      version: Number(inserted[0].version) || 1
    };
  }

  // Caso outro request tenha inserido simultaneamente, re-lê
  const retryRes = await fetchImpl(`${url}/rest/v1/cp_state?id=eq.${STATE_ID}&select=id,data,version`, {
    method: 'GET',
    headers: sbHeaders(key)
  });
  const retryRows = await retryRes.json();
  return {
    state: retryRows[0]?.data || initial,
    version: Number(retryRows[0]?.version) || 1
  };
}

export async function saveSupabaseState(nextState, expectedVersion = null, fetchImpl = globalThis.fetch, env = process.env) {
  const { url, key, configured } = getSupabaseConfig(env);
  if (!configured) {
    throw new Error('Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas.');
  }

  const nextVersion = expectedVersion !== null ? expectedVersion + 1 : Date.now();
  const filter = expectedVersion !== null
    ? `id=eq.${STATE_ID}&version=eq.${expectedVersion}`
    : `id=eq.${STATE_ID}`;

  const res = await fetchImpl(`${url}/rest/v1/cp_state?${filter}`, {
    method: 'PATCH',
    headers: sbHeaders(key, { Prefer: 'return=representation' }),
    body: JSON.stringify({
      data: nextState,
      version: nextVersion,
      updated_at: new Date().toISOString()
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erro ao salvar no Supabase (${res.status}): ${txt}`);
  }

  const rows = await res.json();
  if (expectedVersion !== null && (!Array.isArray(rows) || rows.length === 0)) {
    const err = new Error('Conflito de versão simultânea');
    err.code = 'CONFLICT';
    throw err;
  }

  return {
    state: rows[0]?.data || nextState,
    version: Number(rows[0]?.version) || nextVersion
  };
}

export async function syncOpsWithSupabase(ops, fetchImpl = globalThis.fetch, env = process.env) {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { state, version } = await loadSupabaseState(fetchImpl, env);
    const results = [];
    let changed = false;

    for (const op of ops) {
      const r = applySyncOp(state, op);
      results.push({ opId: op?.opId, ...r });
      if (r.ok && !r.duplicate) {
        changed = true;
      }
    }

    if (!changed) {
      return { ok: true, results, state };
    }

    try {
      const saved = await saveSupabaseState(state, version, fetchImpl, env);
      return { ok: true, results, state: saved.state };
    } catch (err) {
      if (err.code === 'CONFLICT' && attempt < maxAttempts) {
        continue;
      }
      throw err;
    }
  }
}

export async function readBodyJson(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return req.body ? JSON.parse(req.body) : {};
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

export function sendApiJson(res, statusCode, payload, extraHeaders = {}) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extraHeaders)) {
    res.setHeader(k, v);
  }
  res.end(JSON.stringify(payload));
}
