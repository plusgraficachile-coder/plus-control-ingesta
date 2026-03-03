#!/usr/bin/env node
/**
 * PLUS CONTROL - MOTOR DE INGESTA V3 (Producción)
 * Archivo: ingest-mp.cjs  ← .cjs garantiza CommonJS aunque package.json tenga "type":"module"
 *
 * Funcionalidades:
 * - Normalización de texto y región (sin tildes, uppercase)
 * - Retry con Backoff Exponencial (anti-caídas de la API)
 * - Deep Dive: Lista → Detalle por CodigoExternal
 * - Filtros: Región Araucanía + Monto mínimo $500k
 * - Modelo Relacional: organizations ↔ signal_types ↔ signals (UPSERT / idempotente)
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// --- 1. CONFIGURACIÓN ---
const CONFIG = {
  SUPABASE_URL:    process.env.SUPABASE_URL,
  SUPABASE_KEY:    process.env.SUPABASE_SERVICE_KEY,   // Mapea con env: del YAML
  MP_TICKET:       process.env.MP_TICKET,
  API_URL:         'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json',
  REGION_TARGET:   'ARAUCAN',   // Raíz común: Araucanía / Araucania / De la Araucanía
  MONTO_MINIMO:    500000,
  DIAS_ATRAS:      2,           // Hoy + Ayer (cubre ejecuciones con delay)
  CONCURRENCIA:    5,           // Peticiones simultáneas de detalle
  MAX_RETRIES:     5,           // Intentos ante error 500 / red
};

// --- 2. VALIDACIÓN FAIL-FAST ---
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY || !CONFIG.MP_TICKET) {
  console.error('❌ ERROR FATAL: Faltan variables de entorno.');
  console.error('   Requeridas: SUPABASE_URL | SUPABASE_SERVICE_KEY | MP_TICKET');
  process.exit(1);
}

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
  auth: { persistSession: false }
});

// --- 3. UTILIDADES ---

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Normaliza texto: "La Araucanía" → "LA ARAUCANIA" */
function normalizeText(s) {
  if (!s) return '';
  return s.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/** Formatea fecha como DDMMYYYY para la API de MP */
function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

/** GET con retry y backoff exponencial + jitter */
async function fetchWithRetry(url, params, context = '') {
  for (let i = 0; i < CONFIG.MAX_RETRIES; i++) {
    try {
      const res = await axios.get(url, { params, timeout: 15000 });
      return res.data;
    } catch (e) {
      const status = e.response?.status || 'Network';
      const isLast = i === CONFIG.MAX_RETRIES - 1;
      console.warn(`⚠️  [Intento ${i + 1}/${CONFIG.MAX_RETRIES}] ${context}: ${status}`);
      if (isLast) {
        console.error(`❌ Error definitivo en ${context}. Saltando.`);
        return null;
      }
      const delay = 2000 * Math.pow(2, i) + Math.floor(Math.random() * 1000);
      await wait(delay);
    }
  }
}

// --- 4. SCORING DE OPORTUNIDAD ---

/**
 * Calcula un score de 0-100 basado en:
 * - Monto estimado   (hasta 50 pts)
 * - Urgencia (días hasta cierre)  (hasta 30 pts)
 * - Tipo de licitación LE/LP/LR  (hasta 20 pts)
 */
function calcularScore(detail) {
  const monto = parseInt(detail.MontoEstimado) || 0;
  let score = 0;

  // Puntaje por monto
  if (monto >= 10_000_000) score += 50;
  else if (monto >= 5_000_000) score += 40;
  else if (monto >= 2_000_000) score += 30;
  else if (monto >= 1_000_000) score += 20;
  else score += 10;

  // Puntaje por urgencia (días hasta cierre)
  const cierre = detail.FechaCierre ? new Date(detail.FechaCierre) : null;
  if (cierre) {
    const diasRestantes = Math.ceil((cierre - Date.now()) / 86400000);
    if (diasRestantes <= 3)       score += 30;
    else if (diasRestantes <= 7)  score += 20;
    else if (diasRestantes <= 15) score += 10;
    else score += 5;
  }

  // Puntaje por tipo
  const tipo = (detail.Tipo || '').toUpperCase();
  if (tipo.includes('LE')) score += 20;       // Licitación Pública ≥ 1000 UTM
  else if (tipo.includes('LP')) score += 15;  // Licitación Pública < 1000 UTM
  else if (tipo.includes('LR')) score += 10;  // Licitación Privada

  return Math.min(score, 100);
}

// --- 5. PROCESAMIENTO DE UNA LICITACIÓN ---

async function processDetail(codigo) {
  const data = await fetchWithRetry(
    CONFIG.API_URL,
    { codigo, ticket: CONFIG.MP_TICKET },
    `Detalle ${codigo}`
  );

  const detail = data?.Listado?.[0];
  if (!detail) return false;

  // Filtro: Región
  const regionNorm = normalizeText(detail.Comprador?.Region || '');
  if (!regionNorm.includes(normalizeText(CONFIG.REGION_TARGET))) return false;

  // Filtro: Monto
  const monto = parseInt(detail.MontoEstimado) || 0;
  if (monto < CONFIG.MONTO_MINIMO) return false;

  const score = calcularScore(detail);

  // A. Upsert Organización
  const rutOrg = detail.Comprador?.RutUnidad || 'SN';
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .upsert({
      rut:          rutOrg,
      razon_social: detail.Comprador?.NombreOrganismo,
      region:       detail.Comprador?.Region,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'rut' })
    .select('id')
    .single();

  if (orgError) {
    console.error(`Error Org ${rutOrg}:`, orgError.message);
    return false;
  }

  // B. Upsert Tipo de Señal
  const { data: type } = await supabase
    .from('signal_types')
    .upsert(
      { name: 'licitacion_publica', source: 'MercadoPublico' },
      { onConflict: 'name' }
    )
    .select('id')
    .single();

  // C. Insert Señal (idempotente vía external_code)
  const { error: sigError } = await supabase
    .from('signals')
    .upsert({
      org_id:          org.id,
      signal_type_id:  type?.id,
      external_code:   detail.CodigoExternal,
      monto:           monto,
      score:           score,
      nombre:          detail.Nombre,
      fecha_cierre:    detail.FechaCierre || null,
      raw_data:        detail,
      capturado_at:    new Date().toISOString(),
    }, { onConflict: 'external_code' });

  if (!sigError) {
    console.log(`🎯 LEAD [Score:${score}] ${detail.CodigoExternal} | $${monto.toLocaleString('es-CL')} | ${(detail.Nombre || '').substring(0, 45)}...`);
    return true;
  } else if (sigError.code !== '23505') {
    console.error('Error Señal:', sigError.message);
  }

  return false;
}

// --- 6. ORQUESTADOR PRINCIPAL ---

async function main() {
  console.log('🚀 PLUS CONTROL — MOTOR DE INGESTA V3 (Producción)');
  console.log(`   Región: ${CONFIG.REGION_TARGET} | Monto mínimo: $${CONFIG.MONTO_MINIMO.toLocaleString('es-CL')}`);
  console.log(`   Días procesados: ${CONFIG.DIAS_ATRAS} | Concurrencia: ${CONFIG.CONCURRENCIA}`);

  let totalCapturados = 0;
  let totalRevisados  = 0;

  for (let d = 0; d < CONFIG.DIAS_ATRAS; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = formatDate(date);

    console.log(`\n📅 Procesando: ${dateStr}`);

    const listData = await fetchWithRetry(
      CONFIG.API_URL,
      { fecha: dateStr, ticket: CONFIG.MP_TICKET },
      `Lista ${dateStr}`
    );

    const listado = listData?.Listado || [];
    totalRevisados += listado.length;
    console.log(`   Items en lista: ${listado.length}`);

    // Procesar en batches con concurrencia controlada
    for (let i = 0; i < listado.length; i += CONFIG.CONCURRENCIA) {
      const batch = listado.slice(i, i + CONFIG.CONCURRENCIA);
      const results = await Promise.all(
        batch.map(item =>
          item.CodigoExternal
            ? processDetail(item.CodigoExternal)
            : Promise.resolve(false)
        )
      );
      totalCapturados += results.filter(Boolean).length;
      if (i % 25 === 0) process.stdout.write('.');
    }
  }

  console.log('\n');
  console.log('🏁 EJECUCIÓN FINALIZADA');
  console.log(`   Licitaciones revisadas : ${totalRevisados}`);
  console.log(`   Leads Araucanía capturados: ${totalCapturados}`);

  if (totalCapturados === 0) {
    console.warn('⚠️  Sin leads. Verificar: ticket vigente | horario | filtros de región/monto');
  }
}

main().catch(err => {
  console.error('💥 Error no manejado:', err);
  process.exit(1);
});
