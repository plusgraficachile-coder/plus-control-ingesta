#!/usr/bin/env node

/**
 * PLUS CONTROL - MOTOR DE INTELIGENCIA MP v2
 * Arquitectura Estratégica
 * - Normalización robusta RUT
 * - Separación Organización / Señal
 * - Scoring dinámico
 * - Idempotencia
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  MP_TICKET: process.env.MP_TICKET,
  MP_BASE_URL: 'https://api.mercadopublico.cl/servicios/v1/publico',
  REGION_TARGET: 'ARAUCAN',
  MONTO_MINIMO: 500000,
  DIAS_ATRAS: 1
};

if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY || !CONFIG.MP_TICKET) {
  console.error("❌ Faltan variables de entorno críticas.");
  process.exit(1);
}

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
  auth: { persistSession: false }
});

// ============================================================
// UTILIDADES
// ============================================================

function normalizeRut(rutRaw) {
  if (!rutRaw) return null;
  let clean = rutRaw.replace(/[.\s]/g, '').toUpperCase();
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

function calculateScore(orden, orgHistoryCount = 0) {
  let score = 0;
  const monto = parseFloat(orden.Total) || 0;

  if (monto > 500000) score += 20;
  if (monto > 2000000) score += 40;
  if (monto > 10000000) score += 80;

  if (orden.Comprador?.Region?.toUpperCase().includes(CONFIG.REGION_TARGET))
    score += 30;

  if (orden.Comprador?.NombreOrganismo?.toUpperCase().includes("MUNICIPAL"))
    score += 20;

  if (orgHistoryCount > 2)
    score += 15;

  return score;
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ============================================================
// BASE DE DATOS
// ============================================================

async function getOrCreateSignalType() {
  const { data } = await supabase
    .from('signal_types')
    .upsert({
      name: 'orden_compra_mp',
      source: 'MercadoPublico',
      base_weight: 50,
      category: 'financial_trigger'
    }, { onConflict: 'name' })
    .select('id')
    .single();

  return data.id;
}

async function upsertOrganization(rut, razon_social) {
  const rutNorm = normalizeRut(rut);
  if (!rutNorm) return null;

  const { data } = await supabase
    .from('organizations')
    .upsert({
      rut: rutNorm,
      razon_social,
      region: 'Araucanía',
      updated_at: new Date()
    }, { onConflict: 'rut' })
    .select('id')
    .single();

  return data.id;
}

async function createSignal(orgId, signalTypeId, externalCode, rawData, weight) {
  const { error } = await supabase
    .from('signals')
    .insert({
      org_id: orgId,
      signal_type_id: signalTypeId,
      external_code: externalCode,
      raw_data: rawData,
      weight
    });

  if (error && error.code !== '23505') throw error;
}

async function updateOrganizationScore(orgId) {
  const { data } = await supabase
    .from('signals')
    .select('weight')
    .eq('org_id', orgId);

  const total = data.reduce((sum, s) => sum + (s.weight || 0), 0);

  await supabase
    .from('organizations')
    .update({ score_total: total })
    .eq('id', orgId);
}

// ============================================================
// API MP
// ============================================================

async function fetchMP(date) {
  const url = `${CONFIG.MP_BASE_URL}/ordenesdecompra.json`;
  const params = { fecha: formatDate(date), ticket: CONFIG.MP_TICKET };
  const res = await axios.get(url, { params, timeout: 30000 });
  return res.data?.Listado || [];
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  log("🚀 Iniciando Motor Inteligente MP");

  const signalTypeId = await getOrCreateSignalType();
  let leads = 0;

  for (let i = 0; i < CONFIG.DIAS_ATRAS; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const ordenes = await fetchMP(date);

    for (const orden of ordenes) {

      const monto = parseFloat(orden.Total) || 0;
      const region = orden.Comprador?.Region || '';

      if (monto < CONFIG.MONTO_MINIMO) continue;
      if (!region.toUpperCase().includes(CONFIG.REGION_TARGET)) continue;

      const orgId = await upsertOrganization(
        orden.Comprador.RutUnidad,
        orden.Comprador.NombreOrganismo
      );

      if (!orgId) continue;

      const { data: history } = await supabase
        .from('signals')
        .select('id')
        .eq('org_id', orgId);

      const score = calculateScore(orden, history.length);

      await createSignal(
        orgId,
        signalTypeId,
        `MP-${orden.Codigo}`,
        orden,
        score
      );

      await updateOrganizationScore(orgId);

      log(`💰 Señal detectada: ${orden.Codigo} | Score: ${score}`);
      leads++;
    }
  }

  log(`🏁 Finalizado. Nuevas señales: ${leads}`);
}

main().catch(err => {
  console.error("🔥 Error fatal:", err);
  process.exit(1);
});
