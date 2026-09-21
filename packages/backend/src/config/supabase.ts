import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL no configurado');
    }
    _supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return _supabase;
}

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL no configurado');
    }
    _supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

// Lazy getters — only create when actually used
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop];
  },
});
