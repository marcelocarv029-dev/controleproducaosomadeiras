import { loadSupabaseState, sendApiJson } from './_lib/supabaseStore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendApiJson(res, 405, { ok: false, error: 'Method not allowed' });
  }
  try {
    const { state } = await loadSupabaseState();
    const dateStr = new Date().toISOString().slice(0, 10);
    return sendApiJson(res, 200, state, {
      'Content-Disposition': `attachment; filename="controle-producao-backup-${dateStr}.json"`
    });
  } catch (err) {
    return sendApiJson(res, 500, { ok: false, error: err.message });
  }
}
