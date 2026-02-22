import { createClient } from '@supabase/supabase-js';

// Tus credenciales (Copiadas de tu código anterior)
const SUPABASE_URL = 'https://zeiolwgqjovpwskdrgzy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaW9sd2dxam92cHdza2RyZ3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NDU1NDIsImV4cCI6MjA4MTIyMTU0Mn0.4QFE3J7lbS40LqoI4MhFJsa83YynhHeBFAR0JwNnTaw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);