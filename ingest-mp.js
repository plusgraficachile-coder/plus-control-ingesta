#!/usr/bin/env node
/**
 * PLUS CONTROL - MOTOR DE INGESTA V3 (Producción)
 * - Normalización de Texto (Región)
 * - Retry con Backoff Exponencial (Anti-Caídas)
 * - Deep Dive (Lista -> Detalle)
 */
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// --- 1. CONFIGURACIÓN ---
const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY, 
  MP_TICKET: process.env.MP_TICKET,
  API_URL: 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json',
  REGION_TARGET: 'ARAUCAN', // Buscamos la raíz (Araucanía, Araucania, De la Araucanía)
  MONTO_MINIMO: 500000,
  DIAS_ATRAS: 2,     // Hoy y Ayer
  CONCURRENCIA: 5,   // Peticiones simultáneas de detalle
  MAX_RETRIES: 5     // Intentos ante error 500
};

// Validar entorno
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY || !CONFIG.MP_TICKET) {
  console.error("❌ ERROR FATAL: Faltan credenciales en el entorno (.env / Secrets)");
  process.exit(1);
}

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
  auth: { persistSession: false }
});

// --- 2. UTILIDADES ROBUSTAS ---

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Normaliza texto: "La Araucanía" -> "LA ARAUCANIA"
function normalizeText(s) {
  if (!s) return '';
  return s.toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quita tildes
    .toUpperCase()
    .trim();
}

function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

// Cliente HTTP con Retry & Backoff
async function fetchWithRetry(url, params, context = '') {
  for (let i = 0; i < CONFIG.MAX_RETRIES; i++) {
    try {
      const res = await axios.get(url, { params, timeout: 15000 });
      return res.data;
    } catch (e) {
      const status = e.response?.status || 'Network';
      const isLast = i === CONFIG.MAX_RETRIES - 1;
      
      console.warn(`⚠️ [Intento ${i+1}/${CONFIG.MAX_RETRIES}] Fallo en ${context}: ${status}`);
      
      if (isLast) {
        console.error(`❌ Error definitivo en ${context}. Saltando.`);
        return null;
      }

      // Backoff: 2s, 4s, 8s... + Jitter (para no golpear sincronizado)
      const baseDelay = 2000 * Math.pow(2, i);
      const jitter = Math.floor(Math.random() * 1000);
      await wait(baseDelay + jitter);
    }
  }
}

// --- 3. LÓGICA CORE ---

async function processDetail(codigo) {
  // 1. Obtener Detalle
  const data = await fetchWithRetry(
    CONFIG.API_URL, 
    { codigo, ticket: CONFIG.MP_TICKET }, 
    `Detalle ${codigo}`
  );
  
  const detail = data?.Listado?.[0];
  if (!detail) return false;

  // 2. Extracción y Normalización
  const regionRaw = detail.Comprador?.Region || '';
  const regionNorm = normalizeText(regionRaw);
  const targetNorm = normalizeText(CONFIG.REGION_TARGET);
  const monto = parseInt(detail.MontoEstimado) || 0;

  // 3. Filtros
  if (!regionNorm.includes(targetNorm)) return false; // No es Araucanía
  if (monto < CONFIG.MONTO_MINIMO) return false;      // Muy barato

  // 4. Persistencia (Upsert)
  
  // A. Organización
  const rutOrg = detail.Comprador?.RutUnidad || 'SN';
  const { data: org, error: orgError } = await supabase.from('organizations')
    .upsert({ 
      rut: rutOrg, 
      razon_social: detail.Comprador?.NombreOrganismo,
      region: regionRaw, // Guardamos el original para visualización
      updated_at: new Date()
    }, { onConflict: 'rut' })
    .select('id')
    .single();

  if (orgError) {
    console.error(`Error guardando Org ${rutOrg}:`, orgError.message);
    return false;
  }

  // B. Tipo de Señal (Solo asegurar que existe)
  const { data: type } = await supabase.from('signal_types')
    .upsert({ name: 'licitacion_publica', source: 'MercadoPublico' }, { onConflict: 'name' })
    .select('id')
    .single();

  // C. Señal (Oportunidad)
  const { error: sigError } = await supabase.from('signals').insert({
    org_id: org.id,
    signal_type_id: type.id,
    external_code: detail.CodigoExternal,
    raw_data: detail // Guardamos todo el JSON para análisis futuro
  });

  if (!sigError) {
    console.log(`🎯 ¡LEAD CAPTURADO! ${detail.CodigoExternal} | $${monto.toLocaleString('es-CL')} | ${detail.Nombre.substring(0,40)}...`);
    return true;
  } else if (sigError.code !== '23505') { // Ignorar error de duplicado
    console.error(`Error guardando Señal:`, sigError.message);
  }
  
  return false;
}

// --- 4. ORQUESTADOR PRINCIPAL ---

async function main() {
  console.log("🚀 INICIANDO MOTOR V3 (Robustez + Región)...");
  let totalCapturados = 0;

  for (let d = 0; d < CONFIG.DIAS_ATRAS; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = formatDate(date);

    console.log(`\n📅 Procesando fecha: ${dateStr}`);
    
    // Paso 1: Obtener Lista Diaria
    const listData = await fetchWithRetry(
      CONFIG.API_URL, 
      { fecha: dateStr, ticket: CONFIG.MP_TICKET }, 
      `Lista ${dateStr}`
    );
    
    const listado = listData?.Listado || [];
    console.log(`   Items en lista bruta: ${listado.length}`);

    // Paso 2: Procesar en Batches (Concurrencia Controlada)
    for (let i = 0; i < listado.length; i += CONFIG.CONCURRENCIA) {
      const batch = listado.slice(i, i + CONFIG.CONCURRENCIA);
      
      const promises = batch.map(item => {
        if (item.CodigoExternal) return processDetail(item.CodigoExternal);
        return Promise.resolve(false);
      });

      const results = await Promise.all(promises);
      totalCapturados += results.filter(Boolean).length;
      
      // Feedback visual de progreso
      if (i % 20 === 0) process.stdout.write('.');
    }
  }

  console.log(`\n\n🏁 EJECUCIÓN FINALIZADA.`);
  console.log(`   Total Leads Araucanía Capturados: ${totalCapturados}`);
  
  if (totalCapturados === 0) {
    console.warn("⚠️ No se encontraron leads. Verifica: 1. Horario (temprano?) 2. Ticket 3. Filtros");
  }
}

main();
