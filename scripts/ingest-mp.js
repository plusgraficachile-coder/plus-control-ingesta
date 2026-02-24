const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY, // Mapeo correcto desde GitHub
  MP_TICKET: process.env.MP_TICKET,
  MP_BASE_URL: 'https://api.mercadopublico.cl/servicios/v1/publico',
  REGION_CODIGO: '9',        // Araucanía
  MONTO_MINIMO: 500000,      // $500k
  DIAS_ATRAS: 3,             // Buscar últimos 3 días
  SIGNAL_SCORE: 50           // Score inicial por licitación
};

// Validar variables de entorno
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY || !CONFIG.MP_TICKET) {
  console.error('❌ ERROR: Variables de entorno faltantes');
  console.error('Requeridas: SUPABASE_URL, SUPABASE_SERVICE_KEY, MP_TICKET');
  process.exit(1);
}

// Cliente Supabase
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
  auth: { persistSession: false }
});

// ============================================================
// UTILIDADES
// ============================================================

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

function formatDateForMP(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  // Iconos simples para logs de texto
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', debug: '🔍' };
  console.log(`${icons[level] || 'ℹ️'} [${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// ============================================================
// FUNCIONES DE NEGOCIO
// ============================================================

async function getOrCreateSignalType() {
  try {
    const { data: existing, error: readError } = await supabase
      .from('signal_types')
      .select('id')
      .eq('name', 'orden_compra_araucania')
      .maybeSingle();
    
    if (readError) throw readError;
    if (existing) return existing.id;
    
    const { data: created, error: createError } = await supabase
      .from('signal_types')
      .insert({
        name: 'orden_compra_araucania',
        source: 'MercadoPublico',
        base_weight: 50,
        category: 'financial_trigger'
      })
      .select('id')
      .single();
    
    if (createError) throw createError;
    return created.id;
    
  } catch (error) {
    log('error', 'Error en getOrCreateSignalType', { error: error.message });
    throw error;
  }
}

async function upsertOrganization(orgData) {
  try {
    const rutNorm = normalizeRut(orgData.rut);
    if (!rutNorm) {
      log('warning', `RUT inválido: ${orgData.rut}`);
      return null;
    }
    
    // UPSERT inteligente (Insertar o Actualizar si existe)
    const { data, error } = await supabase
      .from('organizations')
      .upsert({
         rut: rutNorm,
         razon_social: orgData.razon_social,
         region: 'Araucanía',
         updated_at: new Date() // Actualizamos la fecha de última vista
      }, { onConflict: 'rut' })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;

  } catch (error) {
    log('error', 'Error en upsertOrganization', { error: error.message, rut: orgData.rut });
    return null;
  }
}

async function createSignal(orgId, signalTypeId, externalCode, rawData) {
  try {
    const { error } = await supabase
      .from('signals')
      .insert({
        org_id: orgId,
        signal_type_id: signalTypeId,
        external_code: externalCode,
        raw_data: rawData
      });
    
    if (error) {
      if (error.code === '23505') return false; // Ya existe (Idempotencia)
      throw error;
    }
    return true;
    
  } catch (error) {
    log('error', 'Error creando señal', { error: error.message });
    return false;
  }
}

async function fetchOrdenesCompra(fecha, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `${CONFIG.MP_BASE_URL}/ordenesdecompra.json`;
      const params = { fecha: formatDateForMP(fecha), ticket: CONFIG.MP_TICKET };
      
      log('info', `Consultando MP: ${formatDateForMP(fecha)} (Intento ${attempt}/${retries})`);
      const response = await axios.get(url, { params, timeout: 30000 });
      
      return response.data?.Listado || [];
      
    } catch (error) {
      log('warning', `Fallo intento ${attempt}: ${error.message}`);
      if (attempt < retries) await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  return [];
}

async function procesarOrden(orden, signalTypeId) {
  try {
    const monto = parseFloat(orden.Total) || 0;
    if (monto < CONFIG.MONTO_MINIMO) return { procesada: false };

    const region = orden.Region || '';
    if (!region.toLowerCase().includes('araucan')) return { procesada: false }; // Solo Araucanía

    // 1. Gestionar Organización
    const orgId = await upsertOrganization({
      rut: orden.RutProveedor,
      razon_social: orden.NombreProveedor || 'Proveedor Sin Nombre'
    });

    if (!orgId) return { procesada: false };

    // 2. Gestionar Señal
    const externalCode = `MP-OC-${orden.Codigo}`;
    const rawData = {
      codigo: orden.Codigo,
      monto: monto,
      comprador: orden.NombreOrganismo,
      fecha: orden.Fecha,
      estado: orden.Estado,
      link: `https://www.mercadopublico.cl/PurchaseOrder/Modules/PO/DetailsPurchaseOrder.aspx?codigoOC=${orden.Codigo}`
    };

    const created = await createSignal(orgId, signalTypeId, externalCode, rawData);
    
    if (created) log('success', `Lead: ${orden.NombreProveedor} ($${monto.toLocaleString('es-CL')})`);
    
    return { procesada: true, creada: created, monto: monto };

  } catch (error) {
    log('error', 'Error procesando orden', error);
    return { procesada: false };
  }
}

// ============================================================
// MAIN LOOP
// ============================================================

async function main() {
  const startTime = Date.now();
  log('info', '🚀 INICIANDO INGESTA FULL (Versión Ferrari)');
  
  try {
    // NOTA: Hemos desactivado temporalmente el LOCK (RPC) para asegurar que 
    // la primera ejecución funcione sin necesidad de funciones SQL complejas adicionales.
    
    const signalTypeId = await getOrCreateSignalType();
    let stats = { procesadas: 0, nuevas: 0, monto: 0 };

    for (let i = 0; i < CONFIG.DIAS_ATRAS; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      const ordenes = await fetchOrdenesCompra(fecha);
      log('info', `📅 ${formatDateForMP(fecha)}: ${ordenes.length} órdenes encontradas.`);

      for (const orden of ordenes) {
        const res = await procesarOrden(orden, signalTypeId);
        if (res.procesada) {
          stats.procesadas++;
          if (res.creada) {
            stats.nuevas++;
            stats.monto += res.monto;
          }
        }
      }
    }

    log('info', '════════ RESUMEN ════════');
    log('success', `Nuevos Leads: ${stats.nuevas}`);
    log('info', `Monto Detectado: $${stats.monto.toLocaleString('es-CL')}`);
    log('info', `Tiempo: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

  } catch (error) {
    log('error', 'ERROR FATAL EN MAIN', error);
    process.exit(1);
  }
}

main();
