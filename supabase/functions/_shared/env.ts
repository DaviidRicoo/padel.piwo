// Keys available inside Edge Functions. Newer projects expose
// SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS (JSON: name -> key); older
// ones SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY. Accept either.

function firstKey(jsonName: string, legacyName: string): string {
  const raw = Deno.env.get(jsonName);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
      const values = Object.values(parsed as Record<string, string>);
      if (values.length) return values[0];
    } catch {
      return raw;
    }
  }
  const legacy = Deno.env.get(legacyName);
  if (!legacy) throw new Error(`missing ${jsonName} / ${legacyName}`);
  return legacy;
}

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
export const publishableKey = () => firstKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
export const secretKey = () => firstKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
