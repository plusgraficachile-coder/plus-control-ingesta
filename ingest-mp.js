#!/usr/bin/env node

/**
 * PLUS CONTROL - MOTOR DE INGESTA v2 (Producción)
 * - Normalización RUT
 * - Arquitectura Relacional (Org -> Signal)
 * - Scoring Dinámico
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ============================================================
// 1. CONFIGURACIÓN & VALIDACIÓN
// ============================================================
const CONFIG = {
  // NOTA: Usamos SUPABASE_SERVICE_KEY porque así lo definimos en el YAML
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY, 
  MP_TICKET: process.env.MP_TICKET,
  MP_BASE_URL: 'https://api.mercadopublico.cl/servicios/v1/publico',
  REGION_TARGET: 'ARAUCAN',
  MONTO_MINIMO: 500000,
  DIAS_ATRAS: 3
};

if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY || !CONFIG.MP_TICKET) {
  console.error("❌ ERROR FATAL: Credenciales faltantes en el entorno.");
  process.exit(1);
}

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
  auth: { persistSession: false }
});

// ============================================================
// 2. LÓGICA DE NEGOCIO (SCORING & RUT)
// ============================================================

function normalizeRut(rutRaw) {
  if (!rutRaw) return null;
  let clean = rutRaw.replace(/[.\s]/g, '').toUpperCase();
  if (clean.length < 3) return null;
  if (!clean.includes('-')) {
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    clean = `${body}-${dv}`;
  }
  return clean;
}

function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

function calculateScore(orden, historyCount = 0) {
  let score = 0;
  const monto = parseFloat(orden.Total) || 0;

  // Criterios de Negocio
  if (monto > 500000) score += 20;       // Base relevante
  if (monto > 2000000) score += 40;      // Proyecto mediano
  if (monto > 10000000) score += 80;     // Proyecto grande

  if (orden.Comprador?.Region?.toUpperCase().includes(CONFIG.REGION_TARGET)) score += 30;
  if (orden.Comprador?.NombreOrganismo?.toUpperCase().includes("MUNICIPAL")) score += 20;
  if (historyCount > 0) score += 15;     // Cliente conocido

  return score;
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ============================================================
// 3. CAPA DE DATOS (Relacional)
// ============================================================

async function getOrCreateSignalType() {
  // Se asegura que exista el tipo de señal
  const { data, error } = await supabase
    .from('signal_types')
    .upsert({ 
        name: 'orden_compra_mp', 
        source: 'MercadoPublico', 
        base_weight: 50 
    }, { onConflict: 'name' })
    .select('id')
    .single();
    
  if (error) throw error;
  return data.id;
}

async function upsertOrganization(rut, razon_social) {
  const rutNorm = normalizeRut(rut);
  if (!rutNorm) return null;

  const { data, error } = await supabase
    .from('organizations')
    .upsert({
      rut: rutNorm,
      razon_social: razon_social,
      region: 'Araucanía',
      updated_at: new Date()
    }, { onConflict: 'rut' })
    .select('id')
    .single();

  if (error) {
    console.error(`Error Org (${rut}):`, error.message);
    return null;
  }
  return data.id;
}

async function createSignal(orgId, signalTypeId, code, rawData, score) {
  const { error } = await supabase.from('signals').insert({
    org_id: orgId,
    signal_type_id: signalTypeId,
    external_code: code,
    raw_data: { ...rawData, calculated_score: score } // Guardamos score en JSON
  });
  
  if (error && error.code !== '23505') { // Ignoramos duplicados
     console.error('Error Signal:', error.message);
  }
}

// ============================================================
// 4. MAIN LOOP
// ============================================================

async function main() {
  log("🚀 Iniciando Motor Plus Control v2...");

  try {
    const signalTypeId = await getOrCreateSignalType();
    let processed = 0;

    for (let i = 0; i < CONFIG.DIAS_ATRAS; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Fetch API
      const url = `${CONFIG.MP_BASE_URL}/ordenesdecompra.json`;
      const params = { fecha: formatDate(date), ticket: CONFIG.MP_TICKET };
      log(`📡 Consultando: ${params.fecha}`);
      
      let listado = [];
      try {
        const res = await axios.get(url, { params, timeout: 30000 });
        listado = res.data?.Listado || [];
      } catch (e) {
        console.error(`⚠️ Error API MercadoPúblico: ${e.message}`);
        continue;
      }

      // Procesamiento
      for (const orden of listado) {
        const monto = parseFloat(orden.Total) || 0;
        const region = orden.Comprador?.Region || '';

        // Filtros Duros
        if (monto < CONFIG.MONTO_MINIMO) continue;
        if (!region.toUpperCase().includes(CONFIG.REGION_TARGET)) continue;

        // Gestión Relacional
        const orgId = await upsertOrganization(
          orden.Comprador.RutUnidad,
          orden.Comprador.NombreOrganismo
        );

        if (!orgId) continue;

        // Historial para scoring
        const { count } = await supabase
            .from('signals')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);

        const score = calculateScore(orden, count);

        await createSignal(
            orgId, 
            signalTypeId, 
            `MP-${orden.Codigo}`, 
            orden, 
            score
        );
        
        log(`✅ Oportunidad: ${orden.NombreProveedor} | Score: ${score}`);
        processed++;
      }
    }
    
    log(`🏁 Ejecución finalizada. Leads procesados: ${processed}`);

  } catch (error) {
    console.error("🔥 Error Crítico:", error);
    process.exit(1);
  }
}

main();
