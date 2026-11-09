import { createClient } from '@supabase/supabase-js';

// Get configuration from env or localStorage
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const saved = localStorage.getItem('banhcuon_supabase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.key) {
        return { url: parsed.url, key: parsed.key, source: 'localStorage' };
      }
    }
  } catch (e) {
    console.error('Error reading saved supabase credentials', e);
  }

  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return { url: envUrl, key: envKey, source: 'env' };
  }

  return null;
}

let supabaseInstance = null;
let currentCredentials = null;

export function getSupabase() {
  const creds = getSupabaseCredentials();
  if (!creds) return null;

  if (
    supabaseInstance &&
    currentCredentials &&
    currentCredentials.url === creds.url &&
    currentCredentials.key === creds.key
  ) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(creds.url, creds.key, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentCredentials = creds;
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveSupabaseCredentials(url, key) {
  if (!url || !key) {
    localStorage.removeItem('banhcuon_supabase_config');
    supabaseInstance = null;
    currentCredentials = null;
    return;
  }
  localStorage.setItem('banhcuon_supabase_config', JSON.stringify({ url: url.trim(), key: key.trim() }));
  supabaseInstance = null;
  currentCredentials = null;
}

export function clearSupabaseCredentials() {
  localStorage.removeItem('banhcuon_supabase_config');
  supabaseInstance = null;
  currentCredentials = null;
}

export async function testSupabaseConnection(url, key) {
  try {
    const client = createClient(url.trim(), key.trim());
    const { data, error } = await client.from('tables').select('id').limit(1);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
