#!/usr/bin/env node

/**
 * PLUS CONTROL - Motor de Ingesta Mercado Público
 * Arquitectura: 4 Niveles (Cerebro)
 */

const axios = require('axios'); // Import require para Node.js estándar
const { createClient } = require('@supabase/supabase-js');

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  // CORRECCIÓN: Ajustado para coincidir con el Secret de GitHub
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, 
  MP_TICKET: process.env.MP_TICKET, // ¡Necesitas agregar este Secret!
  MP_BASE_URL: 'https://api.mercadopublico.cl/servicios/v1/publico',
  REGION_CODIGO: '9',        // Araucanía
  MONTO_MINIMO: 500000,      // $500k
  DIAS_ATRAS: 1,             // Ajustado a 1 para prueba rápida (puedes subirlo luego)
  SIGNAL_SCORE: 50
};

// Validar variables de entorno
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
  console.error('❌ ERROR: Faltan llaves de Supabase (URL o SERVICE_ROLE_KEY)');
  process.exit(1);
}

// Nota: Si no tienes MP_TICKET aún, el script fallará aquí.
// Si quieres probar sin ticket (solo validación de flujo), comenta estas líneas temporalmente:
if (!CONFIG.MP_TICKET) {
  console.error('❌ ERROR: Falta MP_TICKET en Secrets');
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
  const icons = { info: '📋', success: '✅', warning: '⚠️', error: '❌', debug: '🔍' };
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
    if (!rutNorm) return null;
    
    // Upsert directo para eficiencia
    const { data, error } = await supabase
      .from('organizations')
      .upsert({
        rut: rutNorm,
        razon_social: orgData.razon_social,
        region: 'Araucanía',
        status: 'lead_frio',
        updated_at: new Date()
      }, { onConflict: 'rut' })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    log('error', 'Error en upsertOrganization', { error: error.message });
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
      if (error.code === '23505') return false; // Duplicado
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
      
      log('info', `Consultando MP: ${formatDateForMP(fecha)} (Intento ${attempt})`);
      const response = await axios.get(url, { params, timeout: 30000 });
      return response.data?.Listado || [];
    } catch (error) {
      if (attempt === retries) {
        log('error', `Fallo final consultando MP: ${error.message}`);
        return [];
      }
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

// ============================================================
// FLUJO PRINCIPAL
// ============================================================

async function main() {
  let lockAcquired = false;
  log('info', '🚀 INICIANDO INGESTA PLUS CONTROL');

  try {
    // 1. Lock Distribuido (Protección de concurrencia)
    // Si la función RPC no existe aún en tu DB, esto fallará.
    // Si falla, comenta el bloque de lock para probar la lógica simple.
    try {
        const { data: acquired, error: lockError } = await supabase.rpc('acquire_mp_lock');
        if (lockError) throw lockError;
        if (!acquired) {
            log('warning', '⏳ Lock ocupado. Ejecución omitida.');
            process.exit(0);
        }
        lockAcquired = true;
    } catch (e) {
        log('warning', '⚠️ No se pudo adquirir Lock (¿Existe la función RPC?). Continuando sin lock por ahora...');
    }

    const signalTypeId = await getOrCreateSignalType();
    let procesados = 0;

    // Buscar en el pasado
    for (let i = 0; i < CONFIG.DIAS_ATRAS; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      const ordenes = await fetchOrdenesCompra(fecha);
      
      for (const orden of ordenes) {
        const monto = parseFloat(orden.Total) || 0;
        const region = orden.Comprador?.Region || '';

        // Filtros de Negocio
        if (monto >= CONFIG.MONTO_MINIMO && region.toUpperCase().includes('ARAUCAN')) {
            const orgId = await upsertOrganization({
                rut: orden.Comprador.RutUnidad, // O RutProveedor según corresponda
                razon_social: orden.Comprador.NombreOrganismo
            });

            if (orgId) {
                const created = await createSignal(
                    orgId, 
                    signalTypeId, 
                    `MP-${orden.Codigo}`, 
                    orden
                );
                if (created) {
                    log('success', `💰 Lead Capturado: ${orden.Codigo} ($${monto})`);
                    procesados++;
                }
            }
        }
      }
    }

    log('success', `🏁 Fin del proceso. Leads nuevos: ${procesados}`);

  } catch (error) {
    log('error', '🔥 Error Fatal:', error);
    process.exit(1);
  } finally {
    if (lockAcquired) await supabase.rpc('release_mp_lock');
  }
}

main();
