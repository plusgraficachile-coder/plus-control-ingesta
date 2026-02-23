const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Configuración
const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  mpTicket: process.env.MP_TICKET,
  apiUrl: 'https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json'
};

// Validación de Seguridad
if (!config.supabaseUrl || !config.supabaseKey || !config.mpTicket) {
  console.error('❌ ERROR CRÍTICO: Faltan variables de entorno.');
  console.error('Revisa tus Secrets en GitHub: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MP_TICKET');
  process.exit(1);
}

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function run() {
  console.log('🚀 Iniciando Ingesta Plus Control...');
  
  // Fecha de hoy formato ddmmaaaa
  const date = new Date();
  const fechaStr = 
    ('0' + date.getDate()).slice(-2) + 
    ('0' + (date.getMonth() + 1)).slice(-2) + 
    date.getFullYear();

  try {
    console.log(`📡 Consultando Mercado Público (Fecha: ${fechaStr})...`);
    
    const url = `${config.apiUrl}?fecha=${fechaStr}&ticket=${config.mpTicket}`;
    const { data } = await axios.get(url);

    if (!data.Listado) {
      console.log('⚠️ La API respondió pero no hay listado (¿Ticket vencido o día sin datos?)');
      return;
    }

    const ordenes = data.Listado;
    console.log(`📊 Total OCs recuperadas: ${ordenes.length}`);

    // FILTRO: Araucanía y > 500k
    const leads = ordenes.filter(oc => {
        const region = oc.Comprador?.Region?.toUpperCase() || '';
        const monto = parseFloat(oc.MontoTotal) || 0;
        return region.includes('ARAUCANÍA') && monto >= 500000;
    });

    console.log(`💎 Leads Calificados: ${leads.length}`);

    if (leads.length > 0) {
      const { error } = await supabase.from('leads').upsert(
        leads.map(l => ({
          codigo_oc: l.Codigo,
          monto: l.MontoTotal,
          descripcion: l.Nombre,
          region: l.Comprador.Region,
          fecha: new Date(),
          estado: 'NUEVO'
        })), 
        { onConflict: 'codigo_oc', ignoreDuplicates: true }
      );

      if (error) console.error('🔥 Error guardando en Supabase:', error);
      else console.log('✅ Leads guardados exitosamente en Supabase.');
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    process.exit(1);
  }
}

run();
