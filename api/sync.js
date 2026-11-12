import { readBodyJson, sendApiJson, syncOpsWithSupabase } from './_lib/supabaseStore.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendApiJson(res, 405, { ok: false, error: 'Method not allowed' });
  }
  try {
    const body = await readBodyJson(req);
    const ops = Array.isArray(body.ops) ? body.ops : [];
    const result = await syncOpsWithSupabase(ops);
    return sendApiJson(res, 200, result);
  } catch (err) {
    return sendApiJson(res, 500, { ok: false, error: err.message });
  }
}
