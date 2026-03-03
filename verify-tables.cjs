const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zeiolwgqjovpwskdrgzy.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaW9sd2dxam92cHdza2RyZ3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NDU1NDIsImV4cCI6MjA4MTIyMTU0Mn0.4QFE3J7lbS40LqoI4MhFJsa83YynhHeBFAR0JwNnTaw';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function verify() {
  const tables = ['organizations', 'signal_types', 'signals'];
  console.log('Verificando existencia de tablas en Supabase...\n');

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);

    if (!error) {
      console.log('✅', table, '- existe y es legible (filas devueltas:', data.length, ')');
    } else if (error.code === '42501' || (error.message && error.message.includes('policy'))) {
      console.log('✅', table, '- existe (RLS activo — solo service_role puede leer)');
    } else if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
      console.log('❌', table, '- NO EXISTE. Ejecuta el SQL de migración.');
    } else {
      console.log('⚠️ ', table, '- código:', error.code, '| mensaje:', error.message);
    }
  }

  console.log('\nVerificación completa.');
}

verify().catch(function(err) { console.error(err); });
