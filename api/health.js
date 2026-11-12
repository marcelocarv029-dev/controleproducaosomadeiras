import { getSupabaseConfig, sendApiJson } from './_lib/supabaseStore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendApiJson(res, 405, { ok: false, error: 'Method not allowed' });
  }
  const cfg = getSupabaseConfig();
  return sendApiJson(res, 200, {
    ok: true,
    backend: 'supabase',
    configured: cfg.configured,
    time: new Date().toISOString()
  });
}
