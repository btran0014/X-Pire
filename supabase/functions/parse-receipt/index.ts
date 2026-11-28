// parse-receipt: reads a receipt photo with Gemini and returns item suggestions with expiry dates.
// Called by the app via supabase.functions.invoke (user JWT verified by the platform, verify_jwt on).
// The photo is passed straight to Gemini and never stored.
import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  geminiRequestBody,
  geminiText,
  needsFallback,
  parseModelOutput,
  RequestError,
  toSuggestion,
  validateRequest,
  type ShelfLifeRow,
} from './logic.ts';

const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite';
const PER_USER_PER_HOUR = Number(Deno.env.get('SCAN_LIMIT_PER_USER_HOUR') ?? 20);
const GLOBAL_PER_DAY = Number(Deno.env.get('SCAN_LIMIT_GLOBAL_DAY') ?? 200);

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
    // --- Who is calling ---------------------------------------------------------------
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const userClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (claimsError || !userId)
      throw new RequestError(401, 'unauthorized', 'Please sign in again.');

    const body = validateRequest(await req.json().catch(() => null));

    // --- Rate limits (counted on attempts, so failures can't be used to dodge them) ------
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [mine, everyone] = await Promise.all([
      admin
        .from('receipts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('scanned_at', hourAgo),
      admin.from('receipts').select('id', { count: 'exact', head: true }).gte('scanned_at', dayAgo),
    ]);
    if (mine.error || everyone.error) throw mine.error ?? everyone.error;
    if ((mine.count ?? 0) >= PER_USER_PER_HOUR) {
      throw new RequestError(429, 'rate_limited', 'Too many scans this hour. Try again later.');
    }
    if ((everyone.count ?? 0) >= GLOBAL_PER_DAY) {
      throw new RequestError(
        429,
        'daily_cap',
        'Scanning is paused for today. Add items by hand for now.',
      );
    }

    const receipt = await admin.from('receipts').insert({ user_id: userId }).select('id').single();
    if (receipt.error) throw receipt.error;

    // --- Read the receipt ------------------------------------------------------------------
    const parsed = parseModelOutput(await callGemini(body));
    if (!parsed.isReceipt || parsed.items.length === 0) {
      return json(200, {
        receiptId: receipt.data.id,
        purchasedOn: body.purchasedOn,
        items: [],
        isReceipt: parsed.isReceipt,
      });
    }

    // --- Fill gaps from USDA FoodKeeper ----------------------------------------------------
    const matches = await Promise.all(
      parsed.items.map(async (line) => {
        if (!needsFallback(line)) return null;
        const { data } = await userClient.rpc('search_shelf_life', {
          query: line.name,
          storage_filter: line.storage,
          max_results: 3,
        });
        const rows = (data ?? []) as ShelfLifeRow[];
        return rows.find((r) => r.min_days !== null) ?? rows[0] ?? null;
      }),
    );
    const items = parsed.items.map((line, i) => toSuggestion(line, body.purchasedOn, matches[i]));

    await admin.from('receipts').update({ item_count: items.length }).eq('id', receipt.data.id);

    return json(200, {
      receiptId: receipt.data.id,
      purchasedOn: body.purchasedOn,
      items,
      isReceipt: true,
    });
  } catch (error) {
    if (error instanceof RequestError) {
      return json(error.status, { error: error.code, message: error.message });
    }
    console.error('parse-receipt failed', error);
    return json(500, { error: 'internal', message: 'Something went wrong reading the receipt.' });
  }
});

async function callGemini(body: ReturnType<typeof validateRequest>): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new RequestError(500, 'not_configured', 'Receipt scanning is not set up yet.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const send = (jsonMode: boolean) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(geminiRequestBody(body, jsonMode)),
      signal: AbortSignal.timeout(45_000),
    });

  let res = await send(true);
  // If JSON mode isn't accepted by this endpoint/model, retry once without it; the prompt
  // still asks for JSON and the reply is validated either way.
  if (res.status === 400) {
    const detail = await res.text();
    console.warn('Gemini 400 with JSON mode, retrying without:', detail.slice(0, 500));
    res = await send(false);
  }
  if (res.status === 429) {
    throw new RequestError(429, 'ai_busy', 'The AI service is busy. Try again in a minute.');
  }
  if (!res.ok) {
    console.error('Gemini error', res.status, (await res.text()).slice(0, 1000));
    throw new RequestError(502, 'ai_error', 'The AI service could not read the receipt.');
  }
  return geminiText(await res.json());
}
