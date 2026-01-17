import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nxcohpfkmhlqdaumyyni.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Y29ocGZrbWhscWRhdW15eW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTA0NjYsImV4cCI6MjA4NDE4NjQ2Nn0.thuoYjuTsvXCspv7s586rFgZ0w1aEh8tT8X1E9rgyXI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
