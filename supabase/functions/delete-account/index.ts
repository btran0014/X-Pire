// delete-account: permanently deletes the calling user. Their items and receipts are removed
// by `on delete cascade`. The app can't do this itself: deleting an auth user needs the secret key.
// verify_jwt is on, so only requests with a valid user session reach this code.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

function readKey(jsonVar: string, legacyVar: string): string {
  const raw = Deno.env.get(jsonVar);
  if (raw) {
    try {
      const key = JSON.parse(raw)?.default;
      if (typeof key === 'string' && key) return key;
    } catch {
      // fall through to the legacy variable
    }
  }
  const legacy = Deno.env.get(legacyVar);
  if (!legacy) throw new Error(`Missing ${jsonVar} / ${legacyVar}`);
  return legacy;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const PUBLISHABLE_KEY = readKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
const SECRET_KEY = readKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const userClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (claimsError || !userId) {
      return json(401, { error: 'unauthorized', message: 'Please sign in again.' });
    }

    // Only the caller can be deleted: the id comes from their verified token, never the body.
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return json(200, { deleted: true });
  } catch (error) {
    console.error('delete-account failed', error);
    return json(500, { error: 'internal', message: 'Could not delete your data. Try again.' });
  }
});
