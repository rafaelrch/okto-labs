import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nxcohpfkmhlqdaumyyni.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_ANON_KEY) {
  console.warn("SUPABASE_ANON_KEY não configurada. A autenticação não funcionará.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
