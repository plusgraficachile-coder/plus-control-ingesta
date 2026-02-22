// ============================================================
// PLUS CONTROL: Ingesta Mercado Público - WINDOWS
// ============================================================

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// CONFIGURACIÓN
const SUPABASE_URL = 'https://zxioilwggjovpwskdrgy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aW9pbHdnZ2pvdnB3c2tkcmd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjY0NTU0MiwiZXhwIjoyMDUyMjIxNTQyfQ.ZW2PSLAj8DfnlHm-SPwAiAFl-ikmxcgst1h2XsCbRfc';
const MP_TICKET = 'F8537A18-6766-4DEF-9E59-426B4FEE2844';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

// UTILIDADES
function normalizeRut(rutRaw) {
  if (!rutRaw) return null;
  let clean = rutRaw.replace(/[.\s]/g, '').trim().toUpperCase();
  if (clean.length < 7) return null;
  if (!clean.includes('-')) {
    const dv = clean.slice(-1);
    const cuerpo = clean.slice(0, -1);
    clean = `${cuerpo}-${dv}`;
  }
  return clean;
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

// MAIN
async function main() {
  console.log('🚀 INICIANDO INGESTA MERCADO PÚBLICO\n');
  
  try {
    // 1. Test Supabase
    console.log('📡 Verificando conexión Supabase...');
    const { error: testError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (testError) {
      throw new Error(`Error Supabase: ${testError.message}`);
    }
    console.log('✅ Supabase conectado\n');
    
    // 2. Obtener signal type
    console.log('🔍 Buscando signal type...');
    let { data: signalType } = await supabase
      .from('signal_types')
      .select('id')
      .eq('name', 'orden_compra_araucania')
      .maybeSingle();
    
    if (!signalType) {
      console.log('⚠️  Signal type no existe, creando...');
      const { data: created, error: createError } = await supabase
        .from('signal_types')
        .insert({
          name: 'orden_compra_araucania',
          source: 'MercadoPublico',
          base_weight: 40,
          category: 'financial_trigger'
        })
        .select('id')
        .single();
      
      if (createError) {
        throw new Error(`Error creando signal type: ${createError.message}`);
      }
      signalType = created;
      console.log('✅ Signal type creado');
    } else {
      console.log('✅ Signal type encontrado');
    }
    
    const signalTypeId = signalType.id;
    console.log(`📋 Signal Type ID: ${signalTypeId}\n`);
    
    // 3. Consultar Mercado Público (últimos 3 días)
    let totalProcesadas = 0;
    let totalExitosas = 0;
    
    for (let i = 0; i < 3; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = formatDate(fecha);
      
      console.log(`📅 Consultando órdenes del: ${fechaStr}`);
      
      try {
        const url = 'https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json';
        const response = await axios.get(url, {
          params: {
            fecha: fechaStr,
            ticket: MP_TICKET
          },
          timeout: 30000
        });
        
        const ordenes = response.data?.Listado || [];
        console.log(`   Encontradas: ${ordenes.length} órdenes`);
        
        // 4. Procesar cada orden
        for (const orden of ordenes) {
          totalProcesadas++;
          
          // Filtro 1: Monto
          const monto = parseFloat(orden.Total) || 0;
          if (monto < 500000) continue;
          
          // Filtro 2: Región
          const region = orden.Region || '';
          if (!region.toLowerCase().includes('araucan')) continue;
          
          // Crear organización
          const rutNorm = normalizeRut(orden.RutProveedor);
          if (!rutNorm) continue;
          
          const { data: existing } = await supabase
            .from('organizations')
            .select('id')
            .eq('rut', rutNorm)
            .maybeSingle();
          
          let orgId;
          if (existing) {
            orgId = existing.id;
          } else {
            const { data: created, error: orgError } = await supabase
              .from('organizations')
              .insert({
                rut: rutNorm,
                razon_social: orden.NombreProveedor || 'Sin nombre',
                region: 'Araucanía',
                status: 'lead_frio'
              })
              .select('id')
              .single();
            
            if (orgError) continue;
            orgId = created.id;
            console.log(`   ✅ Nueva org: ${orden.NombreProveedor}`);
          }
          
          // Crear señal
          const { error: signalError } = await supabase
            .from('signals')
            .insert({
              org_id: orgId,
              signal_type_id: signalTypeId,
              raw_data: {
                codigo: orden.Codigo,
                monto: monto,
                comprador: orden.NombreOrganismo
              }
            });
          
          if (!signalError || signalError.code === '23505') {
            totalExitosas++;
            console.log(`   🎯 Señal: ${orden.NombreProveedor} - $${monto.toLocaleString('es-CL')}`);
          }
        }
        
      } catch (apiError) {
        console.log(`   ❌ Error API: ${apiError.message}`);
      }
      
      console.log(''); // Línea en blanco
    }
    
    // 5. Resumen
    console.log('═══════════════════════════════════════');
    console.log('✅ INGESTA COMPLETADA');
    console.log(`📊 Total procesadas: ${totalProcesadas}`);
    console.log(`🎯 Señales creadas: ${totalExitosas}`);
    console.log('═══════════════════════════════════════\n');
    
    // 6. Top leads
    const { data: hotLeads } = await supabase
      .from('hot_leads')
      .select('razon_social, hot_score, total_signals')
      .limit(10);
    
    if (hotLeads && hotLeads.length > 0) {
      console.log('🔥 TOP 10 HOT LEADS:');
      console.log('─────────────────────────────────────────');
      hotLeads.forEach((lead, i) => {
        console.log(`${i + 1}. ${lead.razon_social}`);
        console.log(`   Score: ${lead.hot_score} | Señales: ${lead.total_signals}`);
      });
    } else {
      console.log('ℹ️  No hay leads aún (es normal en primera ejecución)');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR FATAL:');
    console.error(error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

main();
