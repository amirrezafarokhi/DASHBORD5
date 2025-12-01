import { createClient } from '@supabase/supabase-js';

// Prioritize environment variables, fallback to hardcoded values if missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wmtwkwhwfqeggdpdiofk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtdHdrd2h3ZnFlZ2dkcGRpb2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDQzNTEsImV4cCI6MjA3MDEyMDM1MX0.eUsYTVliiF_KHt2nV8egHoDgyuaGqqiV98vhJX-KQBo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});