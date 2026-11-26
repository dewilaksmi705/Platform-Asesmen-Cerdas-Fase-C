import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const rawAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

function validateSupabaseUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured: boolean =
  validateSupabaseUrl(rawUrl) && rawAnonKey.length > 0;

export const supabaseConfigError: string | null = !rawUrl || !rawAnonKey
  ? 'Konfigurasi Supabase belum diisi. Mohon atur variabel lingkungan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY menggunakan Project URL dan Anon/Public Key Supabase Anda.'
  : !validateSupabaseUrl(rawUrl)
  ? 'Format VITE_SUPABASE_URL tidak valid. Pastikan URL diawali dengan https://.'
  : null;

/**
 * Klien Supabase khusus frontend menggunakan Anon/Public Key.
 * Jangan pernah menggunakan Service Role Key di sisi klien.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;
