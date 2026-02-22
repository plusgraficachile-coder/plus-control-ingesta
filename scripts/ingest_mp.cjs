// ============================================================
// PLUS CONTROL: Ingesta Mercado Público
// Script optimizado con normalización RUT y manejo de errores
// ============================================================

// PARCHE DNS (Fix para EAI_AGAIN en algunos sistemas)
const dns = require('node:dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CONFIG = {
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://zxioilwggjovpwskdrgy.supabase.co',
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aW9pbHdnZ2pvdnB3c2tkcmd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjY0NTU0MiwiZXhwIjoyMDUyMjIxNTQyfQ.ZW2PSLAj8DfnlHm-SPwAiAFl-ikmxcgst1h2XsCbRfc',
  
  // Mercado Público
  MP_TICKET: process.env.MP_TICKET || 'TU-TICKET-AQUI',
  MP_BASE_URL: 'https://api.mercadopublico.cl/servicios/v1/publico',
  
  // Filtros
  REGION_CODIGO: '9', // Araucanía
  MONTO_MINIMO: 500000, // $500k
  DIAS_ATRAS: 7 // Buscar últimos 7 días
};

// Inicializar Supabase
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
  auth: { persistSession: false }
});

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Normalizar RUT chileno
 * Entrada: "12.345.678-9" o "12345678-9" o "123456789"
 * Salida: "12345678-9"
 */
function normalizeRut(rutRaw) {
  if (!rutRaw) return null;
  
  // Quitar puntos, espacios y convertir a mayúsculas
  let clean = rutRaw.replace(/[.\s]/g, '').trim().toUpperCase();
  
  if (clean.length < 7) return null;
  
  // Si no tiene guión, agregarlo antes del último dígito
  if (!clean.includes('-')) {
    const dv = clean.slice(-1);
    const cuerpo = clean.slice(0, -1);
    clean = `${cuerpo}-${dv}`;
  }
  
  return clean;
}

/**
 * Validar dígito verificador de RUT
 */
function validarRut(rut) {
  if (!rut || typeof rut !== 'string') return false;
  
  const normalized = normalizeRut(rut);
  if (!normalized) return false;
  
  const [cuerpo, dv] = normalized.split('-');
  if (!cuerpo || !dv) return false;
  
  // Calcular DV
  let suma = 0;
  let multiplo = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  
  const dvCalculado = 11 - (suma % 11);
  const dvEsperado = dvCalculado === 11 ? '0' : dvCalculado === 10 ? 'K' : String(dvCalculado);
  
  return dv === dvEsperado;
}

/**
 * Formatear fecha para API (DD-MM-YYYY)
 */
function formatDateForAPI(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

/**
 * Logger con timestamp
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'info': '📋',
    'success': '✅',
    'warning': '⚠️',
    'error': '❌',
    'debug': '🔍'
  }[level] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// ============================================================
// FUNCIONES DE NEGOCIO
// ============================================================

/**
 * Obtener o crear tipo de señal
 */
async function getOrCreateSignalType(name, config) {
  try {
    // Buscar existente
    const { data: existing, error: readError } = await supabase
      .from('signal_types')
      .select('id, base_weight')
      .eq('name', name)
      .maybeSingle();
    
    if (readError) throw readError;
    
    if (existing) {
      log('debug', `Signal type encontrado: ${name}`, { id: existing.id, weight: existing.base_weight });
      return existing.id;
    }
    
    // Crear nuevo
    const { data: created, error: createError } = await supabase
      .from('signal_types')
      .insert({
        name: config.name,
        display_name: config.display_name,
        source: config.source,
        base_weight: config.base_weight,
        category: config.category,
        descripcion: config.descripcion
      })
      .select('id')
      .single();
    
    if (createError) throw createError;
    
    log('success', `Signal type creado: ${name}`, { id: created.id });
    return created.id;
    
  } catch (error) {
    log('error', `Error en getOrCreateSignalType(${name})`, { error: error.message });
    throw error;
  }
}

/**
 * Crear o actualizar organización
 */
async function upsertOrganization(orgData) {
  try {
    const rutNormalizado = normalizeRut(orgData.rut);
    
    if (!rutNormalizado) {
      log('warning', `RUT inválido: ${orgData.rut}`);
      return null;
    }
    
    if (!validarRut(rutNormalizado)) {
      log('warning', `RUT con DV incorrecto: ${rutNormalizado}`);
      // Continuamos igual, algunos RUTs públicos tienen errores
    }
    
    // Buscar existente
    const { data: existing, error: readError } = await supabase
      .from('organizations')
      .select('id, razon_social')
      .eq('rut', rutNormalizado)
      .maybeSingle();
    
    if (readError) throw readError;
    
    if (existing) {
      log('debug', `Organización existente: ${existing.razon_social}`);
      return existing.id;
    }
    
    // Crear nueva
    const { data: created, error: createError } = await supabase
      .from('organizations')
      .insert({
        rut: rutNormalizado,
        razon_social: orgData.razon_social,
        nombre_fantasia: orgData.nombre_fantasia,
        rubro: orgData.rubro,
        region: orgData.region || 'Araucanía',
        comuna: orgData.comuna,
        status: 'lead_frio',
        fuente_descubrimiento: 'MercadoPublico'
      })
      .select('id, razon_social')
      .single();
    
    if (createError) throw createError;
    
    log('success', `Nueva organización: ${created.razon_social}`);
    return created.id;
    
  } catch (error) {
    log('error', `Error en upsertOrganization`, { error: error.message, orgData });
    return null;
  }
}

/**
 * Crear señal
 */
async function createSignal(orgId, signalTypeId, rawData) {
  try {
    const { error } = await supabase
      .from('signals')
      .insert({
        org_id: orgId,
        signal_type_id: signalTypeId,
        raw_data: rawData
      });
    
    if (error) {
      // Si es duplicate por constraint, es OK
      if (error.code === '23505') {
        log('debug', 'Señal ya existe para hoy (duplicate constraint)');
        return true;
      }
      throw error;
    }
    
    log('success', 'Señal creada');
    return true;
    
  } catch (error) {
    log('error', 'Error creando señal', { error: error.message });
    return false;
  }
}

// ============================================================
// API MERCADO PÚBLICO
// ============================================================

/**
 * Obtener órdenes de compra recientes
 */
async function fetchOrdenesCompra(fecha) {
  try {
    const url = `${CONFIG.MP_BASE_URL}/ordenesdecompra.json`;
    const params = {
      fecha: formatDateForAPI(fecha),
      ticket: CONFIG.MP_TICKET
    };
    
    log('info', `Consultando API Mercado Público: ${formatDateForAPI(fecha)}`);
    
    const response = await axios.get(url, { 
      params,
      timeout: 30000 // 30 segundos timeout
    });
    
    const ordenes = response.data?.Listado || [];
    log('success', `Órdenes encontradas: ${ordenes.length}`);
    
    return ordenes;
    
  } catch (error) {
    if (error.response) {
      log('error', `API Error: ${error.response.status}`, { 
        status: error.response.status,
        data: error.response.data 
      });
    } else {
      log('error', `Request Error: ${error.message}`);
    }
    return [];
  }
}

/**
 * Procesar una orden de compra
 */
async function procesarOrden(orden, signalTypeId) {
  try {
    // Filtro 1: Monto mínimo
    const monto = parseFloat(orden.Total) || 0;
    if (monto < CONFIG.MONTO_MINIMO) {
      log('debug', `Orden descartada por monto bajo: $${monto.toLocaleString()}`);
      return false;
    }
    
    // Filtro 2: Región
    const region = orden.Region || '';
    if (!region.toLowerCase().includes('araucan')) {
      log('debug', `Orden descartada por región: ${region}`);
      return false;
    }
    
    // Extraer datos del proveedor
    const proveedorData = {
      rut: orden.RutProveedor,
      razon_social: orden.NombreProveedor || 'Sin nombre',
      region: 'Araucanía',
      comuna: orden.ComunaUnidad
    };
    
    // Crear organización
    const orgId = await upsertOrganization(proveedorData);
    if (!orgId) return false;
    
    // Crear señal
    const rawData = {
      codigo_orden: orden.Codigo,
      monto: monto,
      nombre_comprador: orden.NombreOrganismo,
      fecha: orden.Fecha,
      estado: orden.Estado,
      link: `https://www.mercadopublico.cl/PurchaseOrder/Modules/PO/DetailsPurchaseOrder.aspx?codigoOC=${orden.Codigo}`
    };
    
    const success = await createSignal(orgId, signalTypeId, rawData);
    
    if (success) {
      log('success', `Orden procesada: ${orden.NombreProveedor} - $${monto.toLocaleString()}`);
    }
    
    return success;
    
  } catch (error) {
    log('error', 'Error procesando orden', { error: error.message, orden });
    return false;
  }
}

// ============================================================
// FLUJO PRINCIPAL
// ============================================================

async function main() {
  log('info', '🚀 INICIANDO INGESTA MERCADO PÚBLICO');
  
  try {
    // 1. Validar configuración
    if (CONFIG.MP_TICKET === 'TU-TICKET-AQUI') {
      log('error', 'TICKET DE MERCADO PÚBLICO NO CONFIGURADO');
      log('info', 'Obtén tu ticket en: https://desarrolladores.mercadopublico.cl');
      log('info', 'Luego ejecuta: export MP_TICKET=tu_ticket_aqui');
      process.exit(1);
    }
    
    // 2. Test conexión Supabase
    log('info', 'Verificando conexión a Supabase...');
    const { error: testError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (testError) {
      throw new Error(`Error de conexión Supabase: ${testError.message}`);
    }
    log('success', 'Conexión a Supabase OK');
    
    // 3. Obtener o crear signal type
    const signalTypeId = await getOrCreateSignalType('orden_compra_araucania', {
      name: 'orden_compra_araucania',
      display_name: 'Orden de Compra Región Araucanía',
      source: 'MercadoPublico',
      base_weight: 40,
      category: 'financial_trigger',
      descripcion: 'Orden de compra pública en La Araucanía >$500k'
    });
    
    // 4. Obtener órdenes de los últimos N días
    let totalProcesadas = 0;
    let totalExitosas = 0;
    
    for (let i = 0; i < CONFIG.DIAS_ATRAS; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      const ordenes = await fetchOrdenesCompra(fecha);
      
      for (const orden of ordenes) {
        totalProcesadas++;
        const success = await procesarOrden(orden, signalTypeId);
        if (success) totalExitosas++;
      }
    }
    
    // 5. Resumen
    log('info', '═══════════════════════════════════════');
    log('success', `INGESTA COMPLETADA`);
    log('info', `Total órdenes procesadas: ${totalProcesadas}`);
    log('info', `Señales creadas: ${totalExitosas}`);
    log('info', '═══════════════════════════════════════');
    
    // 6. Mostrar top 10 hot leads
    const { data: hotLeads, error: leadsError } = await supabase
      .from('hot_leads')
      .select('razon_social, hot_score, signals_last_week, last_signal_date')
      .limit(10);
    
    if (!leadsError && hotLeads && hotLeads.length > 0) {
      log('info', '\n🔥 TOP 10 HOT LEADS:');
      log('info', '─────────────────────────────────────────────────');
      hotLeads.forEach((lead, i) => {
        console.log(`${i + 1}. ${lead.razon_social}`);
        console.log(`   Score: ${lead.hot_score} | Señales última semana: ${lead.signals_last_week}`);
        console.log(`   Última actividad: ${new Date(lead.last_signal_date).toLocaleDateString('es-CL')}`);
      });
    }
    
  } catch (error) {
    log('error', 'ERROR FATAL', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main().catch(error => {
    log('error', 'Unhandled error', { error: error.message });
    process.exit(1);
  });
}

module.exports = { main, upsertOrganization, createSignal };
