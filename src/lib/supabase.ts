import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lohitrurbqfxvijawsee.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';

// Public / Client-side Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Admin Supabase Client (Bypasses RLS using Secret Key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
