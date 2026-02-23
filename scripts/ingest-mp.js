#!/usr/bin/env node

/**
 * PLUS CONTROL - Motor de Ingesta Mercado Público
 * 
 * Objetivo: Capturar licitaciones adjudicadas en La Araucanía
 * Ejecuta: Diariamente a las 09:00 AM Chile (12:00 UTC)
 * Autor: Plus Gráfica
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
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

/**
 * Normalizar RUT chileno
 * @param {string} rutRaw - RUT en cualquier formato
 * @returns {string|null} RUT normalizado (12345678-9)
 */
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

/**
 * Formatear fecha para API de Mercado Público
 * @param {Date} date 
 * @returns {string} DDMMYYYY
 */
function formatDateForMP(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

/**
 * Logger con timestamp
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const icons = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    debug: '🔍'
  };
  
  console.log(`${icons[level] || 'ℹ️'} [${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// ============================================================
// FUNCIONES DE NEGOCIO
// ============================================================

/**
 * Obtener o crear Signal Type
 */
async function getOrCreateSignalType() {
  try {
    const { data: existing, error: readError } = await supabase
      .from('signal_types')
      .select('id')
      .eq('name', 'orden_compra_araucania')
      .maybeSingle();
    
    if (readError) throw readError;
    
    if (existing) {
      log('debug', 'Signal type encontrado', { id: existing.id });
      return existing.id;
    }
    
    const { data: created, error: createError } = await supabase
      .from('signal_types')
      .insert({
        name: 'orden_compra_araucania',
        source: 'MercadoPublico',
        base_weight: 50, // Score base desde signal_types (fuente única)
        category: 'financial_trigger'
      })
      .select('id')
      .single();
    
    if (createError) throw createError;
    
    log('success', 'Signal type creado', { id: created.id });
    return created.id;
    
  } catch (error) {
    log('error', 'Error en getOrCreateSignalType', { error: error.message });
    throw error;
  }
}

/**
 * UPSERT de organización (idempotente)
 * @param {Object} orgData - Datos de la organización
 * @returns {string|null} ID de la organización
 */
async function upsertOrganization(orgData) {
  try {
    const rutNorm = normalizeRut(orgData.rut);
    
    if (!rutNorm) {
      log('warning', `RUT inválido: ${orgData.rut}`);
      return null;
    }
    
    // Intentar buscar existente
    const { data: existing, error: readError } = await supabase
      .from('organizations')
      .select('id, razon_social')
      .eq('rut', rutNorm)
      .maybeSingle();
    
    if (readError) throw readError;
    
    if (existing) {
      log('debug', `Org existente: ${existing.razon_social}`);
      return existing.id;
    }
    
    // Crear nueva
    const { data: created, error: createError } = await supabase
      .from('organizations')
      .insert({
        rut: rutNorm,
        razon_social: orgData.razon_social,
        region: 'Araucanía',
        status: 'lead_frio',
        contact_info: {}
      })
      .select('id, razon_social')
      .single();
    
    if (createError) throw createError;
    
    log('success', `Nueva org: ${created.razon_social}`);
    return created.id;
    
  } catch (error) {
    log('error', 'Error en upsertOrganization', { 
      error: error.message, 
      rut: orgData.rut 
    });
    return null;
  }
}

/**
 * Crear señal (idempotente por external_code)
 */
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
      // Error 23505 = duplicate key (constraint unique)
      if (error.code === '23505') {
        log('debug', 'Señal ya existe (idempotencia)');
        return false; // No es error, solo ya existía
      }
      throw error;
    }
    
    return true;
    
  } catch (error) {
    log('error', 'Error creando señal', { error: error.message });
    return false;
  }
}

/**
 * Obtener órdenes de compra de Mercado Público (con retry)
 */
async function fetchOrdenesCompra(fecha, retries = 3) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `${CONFIG.MP_BASE_URL}/ordenesdecompra.json`;
      const params = {
        fecha: formatDateForMP(fecha),
        ticket: CONFIG.MP_TICKET
      };
      
      log('info', `Consultando MP: ${formatDateForMP(fecha)} (intento ${attempt}/${retries})`);
      
      const response = await axios.get(url, { 
        params,
        timeout: 30000
      });
      
      const ordenes = response.data?.Listado || [];
      log('success', `Órdenes encontradas: ${ordenes.length}`);
      
      return ordenes;
      
    } catch (error) {
      lastError = error;
      
      if (error.response) {
        log('warning', `API MP Error ${error.response.status} (intento ${attempt}/${retries})`, {
          status: error.response.status,
          data: error.response.data
        });
      } else {
        log('warning', `Request Error (intento ${attempt}/${retries}): ${error.message}`);
      }
      
      // Si es el último intento, no esperar
      if (attempt < retries) {
        const waitTime = attempt * 2000; // Backoff: 2s, 4s, 6s
        log('info', `Esperando ${waitTime/1000}s antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // Si llegamos aquí, todos los reintentos fallaron
  log('error', `Todos los reintentos fallaron para ${formatDateForMP(fecha)}`);
  return [];
}

/**
 * Procesar una orden de compra
 */
async function procesarOrden(orden, signalTypeId) {
  try {
    // Filtro 1: Monto mínimo
    const monto = parseFloat(orden.Total) || 0;
    if (monto < CONFIG.MONTO_MINIMO) {
      return { procesada: false, motivo: 'monto_bajo' };
    }
    
    // Filtro 2: Región Araucanía
    const region = orden.Region || '';
    if (!region.toLowerCase().includes('araucan')) {
      return { procesada: false, motivo: 'region_incorrecta' };
    }
    
    // UPSERT organización
    const orgId = await upsertOrganization({
      rut: orden.RutProveedor,
      razon_social: orden.NombreProveedor || 'Sin nombre'
    });
    
    if (!orgId) {
      return { procesada: false, motivo: 'error_org' };
    }
    
    // Crear señal (idempotente)
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
    
    if (created) {
      log('success', `Procesada: ${orden.NombreProveedor} - $${monto.toLocaleString('es-CL')}`);
    }
    
    return { 
      procesada: true, 
      creada: created,
      monto: monto
    };
    
  } catch (error) {
    log('error', 'Error procesando orden', { error: error.message });
    return { procesada: false, motivo: 'error_fatal' };
  }
}

// ============================================================
// FLUJO PRINCIPAL
// ============================================================

async function main() {
  const startTime = Date.now();
  let lockAcquired = false;
  
  log('info', '🚀 INICIANDO INGESTA MERCADO PÚBLICO');
  log('info', `Región: Araucanía | Monto mínimo: $${CONFIG.MONTO_MINIMO.toLocaleString('es-CL')}`);
  
  try {
    // 1. Verificar conexión Supabase
    log('info', 'Verificando conexión Supabase...');
    const { error: testError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (testError) {
      throw new Error(`Error Supabase: ${testError.message}`);
    }
    log('success', 'Supabase conectado');
    
    // 2. Adquirir lock
    log('info', 'Adquiriendo lock...');
    const { data: acquired, error: lockError } = await supabase.rpc('acquire_mp_lock');
    
    if (lockError) {
      throw new Error(`Error adquiriendo lock: ${lockError.message}`);
    }
    
    if (!acquired) {
      log('warning', 'Otra instancia ya está ejecutándose. Saliendo.');
      process.exit(0); // No es error, solo concurrencia
    }
    
    lockAcquired = true;
    log('success', 'Lock adquirido');
    
    // 3. Obtener Signal Type
    const signalTypeId = await getOrCreateSignalType();
    
    // 3. Procesar últimos N días
    let stats = {
      ordenes_totales: 0,
      ordenes_procesadas: 0,
      senales_creadas: 0,
      senales_duplicadas: 0,
      montos_total: 0,
      errores: 0
    };
    
    for (let i = 0; i < CONFIG.DIAS_ATRAS; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      const ordenes = await fetchOrdenesCompra(fecha);
      stats.ordenes_totales += ordenes.length;
      
      for (const orden of ordenes) {
        const resultado = await procesarOrden(orden, signalTypeId);
        
        if (resultado.procesada) {
          stats.ordenes_procesadas++;
          if (resultado.creada) {
            stats.senales_creadas++;
            stats.montos_total += resultado.monto || 0;
          } else {
            stats.senales_duplicadas++; // Ya existía
          }
        } else {
          stats.errores++;
        }
      }
    }
    
    // 4. Obtener top leads
    const { data: hotLeads } = await supabase
      .from('hot_leads')
      .select('razon_social, hot_score, total_signals')
      .limit(10);
    
    // 5. Reporte final
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('info', '═══════════════════════════════════════');
    log('success', 'INGESTA COMPLETADA');
    log('info', `Duración: ${duration}s`);
    log('info', `Órdenes consultadas: ${stats.ordenes_totales}`);
    log('info', `Órdenes procesadas: ${stats.ordenes_procesadas}`);
    log('info', `Señales creadas: ${stats.senales_creadas}`);
    log('info', `Señales duplicadas: ${stats.senales_duplicadas}`);
    log('info', `Errores: ${stats.errores}`);
    log('info', `Monto total: $${stats.montos_total.toLocaleString('es-CL')}`);
    log('info', '═══════════════════════════════════════');
    
    if (hotLeads && hotLeads.length > 0) {
      log('info', '\n🔥 TOP 10 HOT LEADS:');
      log('info', '─────────────────────────────────────────');
      hotLeads.forEach((lead, i) => {
        console.log(`${i + 1}. ${lead.razon_social}`);
        console.log(`   Score: ${lead.hot_score} | Señales: ${lead.total_signals}`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    log('error', 'ERROR FATAL', { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  } finally {
    // Liberar lock SIEMPRE (éxito o error)
    if (lockAcquired) {
      try {
        log('info', 'Liberando lock...');
        await supabase.rpc('release_mp_lock');
        log('success', 'Lock liberado');
      } catch (releaseError) {
        log('error', 'Error liberando lock', { error: releaseError.message });
        // No hacer exit aquí, ya estamos saliendo
      }
    }
  }
}

// Ejecutar
main();
