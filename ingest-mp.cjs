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
const DEBUG = process.env.DEBUG === 'true';  // DEBUG=true → modo diagnóstico sin Supabase

const CONFIG = {
  SUPABASE_URL:    process.env.SUPABASE_URL,
  SUPABASE_KEY:    process.env.SUPABASE_SERVICE_KEY,   // Mapea con env: del YAML
  MP_TICKET:       process.env.MP_TICKET,
  API_URL:         'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json',
  REGION_TARGET:   'ARAUCAN',   // Raíz común: Araucanía / Araucania / De la Araucanía
  MONTO_MINIMO:    parseInt(process.env.MONTO_MINIMO) || 500000,
  DIAS_ATRAS:      parseInt(process.env.DIAS_ATRAS) || (DEBUG ? 5 : 2),
  CONCURRENCIA:    8,           // Más peticiones en paralelo
  MAX_RETRIES:     2,           // Solo 2 reintentos (era 5 → demasiado lento)
  BACKOFF_BASE:    800,         // ms base de espera (era 2000)
  DEBUG_SAMPLE:    15,
};

// --- 2. VALIDACIÓN FAIL-FAST ---
if (!CONFIG.MP_TICKET) {
  console.error('❌ ERROR FATAL: Falta MP_TICKET.');
  process.exit(1);
}
if (!DEBUG && (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY)) {
  console.error('❌ ERROR FATAL: Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY.');
  console.error('   (Para correr sin Supabase usa: DEBUG=true node ingest-mp.cjs)');
  process.exit(1);
}

const supabase = DEBUG ? null : createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
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
      const delay = CONFIG.BACKOFF_BASE * Math.pow(2, i) + Math.floor(Math.random() * 500);
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

// Colector de regiones para modo debug
const _regionesSeen = new Set();

async function processDetail(codigo, debugCollector = null) {
  const data = await fetchWithRetry(
    CONFIG.API_URL,
    { codigo, ticket: CONFIG.MP_TICKET },
    `Detalle ${codigo}`
  );

  const detail = data?.Listado?.[0];
  if (!detail) return false;

  // --- MODO DEBUG: recolectar regiones y montos sin filtrar ---
  if (DEBUG && debugCollector !== null) {
    // Primera vez: imprimir estructura completa del detalle para detectar campos reales
    if (debugCollector.length === 0) {
      console.log('\n   🔬 ESTRUCTURA COMPLETA DEL PRIMER DETALLE:');
      console.log(JSON.stringify(detail, null, 2).substring(0, 2000));
      console.log('\n   🔑 Claves en detail.Comprador:', JSON.stringify(Object.keys(detail.Comprador || {})));
    }

    // Buscar región en distintos campos posibles
    const regionCandidatos = [
      detail.Comprador?.Region,
      detail.Comprador?.RegionUnidad,
      detail.Comprador?.RegionOrganismo,
      detail.Comprador?.NombreRegion,
      detail.UnidadCompra?.Region,
      detail.Region,
      detail.RegionUnidad,
    ].filter(Boolean);

    const region = regionCandidatos[0] || 'SIN_REGION';
    const monto  = parseInt(detail.MontoEstimado) || 0;
    const regionNorm = normalizeText(region);
    _regionesSeen.add(region);
    debugCollector.push({
      codigo,
      region,
      regionNorm,
      monto,
      nombre: (detail.Nombre || '').substring(0, 60),
      matchRegion: regionNorm.includes(normalizeText(CONFIG.REGION_TARGET)),
      matchMonto:  monto >= CONFIG.MONTO_MINIMO,
    });
    return false; // en debug no guardamos nada
  }

  // Filtro: Región (campo correcto es RegionUnidad, no Region)
  const regionNorm = normalizeText(detail.Comprador?.RegionUnidad || '');
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
      region:       detail.Comprador?.RegionUnidad,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'rut' })
    .select('id')
    .single();

  if (orgError) {
    console.error(`Error Org ${rutOrg}:`, orgError.message);
    return false;
  }

  // B. Upsert Tipo de Señal (base_weight y category son NOT NULL)
  const { data: type } = await supabase
    .from('signal_types')
    .upsert(
      {
        name:         'licitacion_publica',
        source:       'MercadoPublico',
        base_weight:  70,
        category:     'financial_trigger',
        display_name: 'Licitación Pública',
      },
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
  if (DEBUG) {
    console.log('🔍 PLUS CONTROL — MODO DEBUG (sin escritura en Supabase)');
    console.log(`   Buscando regiones en los últimos ${CONFIG.DIAS_ATRAS} días...`);
    console.log(`   Muestra: ${CONFIG.DEBUG_SAMPLE} items por día`);
  } else {
    console.log('🚀 PLUS CONTROL — MOTOR DE INGESTA V3 (Producción)');
    console.log(`   Región: ${CONFIG.REGION_TARGET} | Monto mínimo: $${CONFIG.MONTO_MINIMO.toLocaleString('es-CL')}`);
    console.log(`   Días procesados: ${CONFIG.DIAS_ATRAS} | Concurrencia: ${CONFIG.CONCURRENCIA}`);
  }

  let totalCapturados = 0;
  let totalRevisados  = 0;
  const debugCollector = DEBUG ? [] : null;

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
    if (listado.length === 0) continue;

    // En debug: muestra los campos del primer item para entender la estructura
    if (DEBUG && debugCollector.length === 0) {
      console.log('\n   🔎 Campos disponibles en item de lista:', Object.keys(listado[0]).join(', '));
    }

    // En debug: procesar solo una muestra para no hacer demasiadas peticiones
    const sample = DEBUG ? listado.slice(0, CONFIG.DEBUG_SAMPLE) : listado;

    // Circuit breaker: si los primeros 10 detalles fallan todos, saltar el día
    let consecutiveFails = 0;
    let capturadosHoy    = 0;

    // Procesar en batches con concurrencia controlada
    for (let i = 0; i < sample.length; i += CONFIG.CONCURRENCIA) {
      const batch = sample.slice(i, i + CONFIG.CONCURRENCIA);
      const results = await Promise.all(
        batch.map(item => {
          const codigo = item.CodigoExterno || item.CodigoExternal || item.Codigo;
          return codigo
            ? processDetail(codigo, debugCollector)
            : Promise.resolve(false);
        })
      );
      const hits = results.filter(Boolean).length;
      totalCapturados += hits;
      capturadosHoy   += hits;

      // Circuit breaker: si después de 10 items no hay ningún éxito, asumir API caída
      if (i === 0 && hits === 0 && !DEBUG) {
        consecutiveFails++;
        if (consecutiveFails >= 2) {
          console.warn(`   ⚡ Circuit breaker: API inestable para ${dateStr}, saltando día.`);
          break;
        }
      } else {
        consecutiveFails = 0;
      }

      if (!DEBUG && i % 50 === 0 && i > 0) {
        process.stdout.write(`\n   ↳ ${i}/${sample.length} revisadas, ${capturadosHoy} leads hoy`);
      }
    }
  }

  // --- REPORTE DE DEBUG ---
  if (DEBUG) {
    console.log('\n\n══════════════════════════════════════════');
    console.log('📊 DIAGNÓSTICO DE REGIONES ENCONTRADAS');
    console.log('══════════════════════════════════════════');

    if (debugCollector.length === 0) {
      console.log('⚠️  No se obtuvieron detalles. Posibles causas:');
      console.log('   - El ticket MP está vencido');
      console.log('   - La API devolvió HTTP 500 en todos los reintentos');
      console.log('   - No hay licitaciones en los últimos 5 días');
    } else {
      console.log(`   Detalles obtenidos: ${debugCollector.length}`);

      // Regiones únicas con conteo
      const regionCount = {};
      for (const item of debugCollector) {
        regionCount[item.region] = (regionCount[item.region] || 0) + 1;
      }

      console.log('\n📍 Regiones encontradas (con conteo):');
      Object.entries(regionCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([region, count]) => {
          const match = normalizeText(region).includes(normalizeText(CONFIG.REGION_TARGET));
          console.log(`   ${match ? '✅ MATCH' : '      '} "${region}" (${count})`);
        });

      const matches = debugCollector.filter(i => i.matchRegion);
      console.log(`\n🎯 Matches "${CONFIG.REGION_TARGET}": ${matches.length} de ${debugCollector.length}`);

      if (matches.length > 0) {
        console.log('   Ejemplos con filtro actual:');
        matches.slice(0, 5).forEach(m =>
          console.log(`   - $${m.monto.toLocaleString('es-CL')} | ${m.region} | ${m.nombre}`)
        );
      } else {
        // Buscar variante de Araucanía en los datos
        const arauc = Object.keys(regionCount).find(r =>
          normalizeText(r).includes('ARAUC')
        );
        if (arauc) {
          console.log(`\n💡 Se encontró región relacionada: "${arauc}"`);
          console.log(`   Actualiza REGION_TARGET en el script a: '${normalizeText(arauc).split(' ').find(w => w.includes('ARAUC')) || 'ARAUC'}'`);
        } else {
          console.log('\n💡 Ninguna región contiene "ARAUC". Ver lista arriba y ajustar REGION_TARGET.');
        }
      }
    }
    console.log('\n══════════════════════════════════════════\n');
    return;
  }

  // --- REPORTE DE PRODUCCIÓN ---
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
