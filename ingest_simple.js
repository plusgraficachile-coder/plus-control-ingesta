// ============================================================
// PLUS CONTROL: Ingesta Mercado Público - VERSIÓN FINAL
// ============================================================

const dns = require('node:dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// CONFIGURACIÓN
const SUPABASE_URL = 'https://zxioilwggjovpwskdrgy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aW9pbHdnZ2pvdnB3c2tkcmd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjY0NTU0MiwiZXhwIjoyMDUyMjIxNTQyfQ.ZW2PSLAj8DfnlHm-SPwAiAFl-ikmxcgst1h2XsCbRfc';
const MP_TICKET = 'F8537A18-6766-4DEF-9E59-426B4FEE2844';
const MP_BASE_URL = 'https://api.mercadopublico.cl/servicios/v1/publico';

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

function formatDateForAPI(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

function log(level, message) {
  const icons = { info: '📋', success: '✅', warning: '⚠️', error: '❌' };
  console.log(`${icons[level] || 'ℹ️'} ${message}`);
}

// FUNCIONES PRINCIPALES
async function getOrCreateSignalType() {
  try {
    const { data: existing } = await supabase
      .from('signal_types')
      .select('id')
      .eq('name', 'orden_compra_araucania')
      .maybeSingle();
    
    if (existing) {
      log('info', 'Signal type encontrado');
      return existing.id;
    }
    
    const { data: created, error } = await supabase
      .from('signal_types')
      .insert({
        name: 'orden_compra_araucania',
        source: 'MercadoPublico',
        base_weight: 40,
        category: 'financial_trigger'
      })
      .select('id')
      .single();
    
    if (error) throw error;
    log('success', 'Signal type creado');
    return created.id;
    
  } catch (error) {
    log('error', `Error signal type: ${error.message}`);
    throw error;
  }
}

async function upsertOrganization(orgData) {
  try {
    const rutNormalizado = normalizeRut(orgData.rut);
    if (!rutNormalizado) {
      log('warning', `RUT inválido: ${orgData.rut}`);
      return null;
    }
    
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('rut', rutNormalizado)
      .maybeSingle();
    
    if (existing) return existing.id;
    
    const { data: created, error } = await supabase
      .from('organizations')
      .insert({
        rut: rutNormalizado,
        razon_social: orgData.razon_social,
        region: 'Araucanía',
        status: 'lead_frio'
      })
      .select('id')
      .single();
    
    if (error) throw error;
    log('success', `Nueva org: ${orgData.razon_social}`);
    return created.id;
    
  } catch (error) {
    log('error', `Error org: ${error.message}`);
    return null;
  }
}

async function createSignal(orgId, signalTypeId, rawData) {
  try {
    const { error } = await supabase
      .from('signals')
      .insert({
        org_id: orgId,
        signal_type_id: signalTypeId,
        raw_data: rawData
      });
    
    if (error && error.code !== '23505') throw error;
    return true;
  } catch (error) {
    log('error', `Error señal: ${error.message}`);
    return false;
  }
}

async function fetchOrdenesCompra(fecha) {
  try {
    const url = `${MP_BASE_URL}/ordenesdecompra.json`;
    const params = {
      fecha: formatDateForAPI(fecha),
      ticket: MP_TICKET
    };
    
    log('info', `Consultando API: ${formatDateForAPI(fecha)}`);
    
    const response = await axios.get(url, { params, timeout: 30000 });
    const ordenes = response.data?.Listado || [];
    
    log('success', `Órdenes encontradas: ${ordenes.length}`);
    return ordenes;
    
  } catch (error) {
    log('error', `API Error: ${error.message}`);
    return [];
  }
}

async function procesarOrden(orden, signalTypeId) {
  try {
    const monto = parseFloat(orden.Total) || 0;
    if (monto < 500000) return false;
    
    const region = orden.Region || '';
    if (!region.toLowerCase().includes('araucan')) return false;
    
    const orgId = await upsertOrganization({
      rut: orden.RutProveedor,
      razon_social: orden.NombreProveedor || 'Sin nombre'
    });
    
    if (!orgId) return false;
    
    const rawData = {
      codigo_orden: orden.Codigo,
      monto: monto,
      nombre_comprador: orden.NombreOrganismo,
      link: `https://www.mercadopublico.cl/PurchaseOrder/Modules/PO/DetailsPurchaseOrder.aspx?codigoOC=${orden.Codigo}`
    };
    
    const success = await createSignal(orgId, signalTypeId, rawData);
    
    if (success) {
      log('success', `Procesada: ${orden.NombreProveedor} - $${monto.toLocaleString()}`);
    }
    
    return success;
    
  } catch (error) {
    return false;
  }
}

// MAIN
async function main() {
  log('info', '🚀 INICIANDO INGESTA');
  
  try {
    log('info', 'Verificando Supabase...');
    const { error: testError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (testError) throw new Error(`Conexión Supabase: ${testError.message}`);
    log('success', 'Supabase OK');
    
    const signalTypeId = await getOrCreateSignalType();
    
    let totalProcesadas = 0;
    let totalExitosas = 0;
    
    for (let i = 0; i < 3; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      const ordenes = await fetchOrdenesCompra(fecha);
      
      for (const orden of ordenes) {
        totalProcesadas++;
        const success = await procesarOrden(orden, signalTypeId);
        if (success) totalExitosas++;
      }
    }
    
    log('info', '═══════════════════════════════════');
    log('success', 'INGESTA COMPLETADA');
    log('info', `Total procesadas: ${totalProcesadas}`);
    log('info', `Señales creadas: ${totalExitosas}`);
    log('info', '═══════════════════════════════════');
    
    const { data: hotLeads } = await supabase
      .from('hot_leads')
      .select('razon_social, hot_score')
      .limit(10);
    
    if (hotLeads && hotLeads.length > 0) {
      log('info', '\n🔥 TOP 10 HOT LEADS:');
      hotLeads.forEach((lead, i) => {
        console.log(`${i + 1}. ${lead.razon_social} - Score: ${lead.hot_score}`);
      });
    }
    
  } catch (error) {
    log('error', `ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
