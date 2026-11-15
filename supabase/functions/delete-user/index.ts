// delete-user: called by the app (S14, "Borrar cuenta") with the player's session.
// 1. delete_account(), as the player: anonymises the profile, frees future
//    matches, hands over tournaments they organise (see the schema migration).
// 2. Removes the profile photo from the "avatars" bucket.
// 3. Deletes the login itself with the admin API, so the email and password are
//    gone. profiles.auth_id is set to null by its "on delete set null" rule.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, json, publishableKey, secretKey, SUPABASE_URL } from '../_shared/env.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'not_authenticated' }, 401);

  // acting as the player: delete_account() checks who is calling through auth.uid()
  const asPlayer = createClient(SUPABASE_URL, publishableKey(), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await asPlayer.auth.getUser();
  if (userError || !userData.user) return json({ error: 'not_authenticated' }, 401);

  const { error: rpcError } = await asPlayer.rpc('delete_account');
  if (rpcError) return json({ error: rpcError.message }, 400);

  const admin = createClient(SUPABASE_URL, secretKey(), { auth: { persistSession: false } });

  // the profile photo goes too (delete_account() already cleared avatar_url)
  const folder = userData.user.id;
  const { data: files } = await admin.storage.from('avatars').list(folder);
  if (files?.length) {
    const { error: removeError } = await admin.storage.from('avatars').remove(files.map((f) => `${folder}/${f.name}`));
    if (removeError) console.error('avatar not removed', removeError.message);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ deleted: true });
});
