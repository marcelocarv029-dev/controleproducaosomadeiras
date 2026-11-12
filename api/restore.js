import { loadSupabaseState, saveSupabaseState, readBodyJson, sendApiJson } from './_lib/supabaseStore.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendApiJson(res, 405, { ok: false, error: 'Method not allowed' });
  }
  try {
    const body = await readBodyJson(req);
    const candidate = body.state || body;
    if (!candidate || !Array.isArray(candidate.usuarios) || !Array.isArray(candidate.produtos) || !Array.isArray(candidate.producoes)) {
      return sendApiJson(res, 400, { ok: false, error: 'Arquivo de backup inválido' });
    }
    candidate.updatedAt = new Date().toISOString();
    await loadSupabaseState(); // garante existência do registro
    const saved = await saveSupabaseState(candidate, null);
    return sendApiJson(res, 200, { ok: true, state: saved.state });
  } catch (err) {
    return sendApiJson(res, 500, { ok: false, error: err.message });
  }
}
