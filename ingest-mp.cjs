require('dotenv').config();

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  MP_TICKET: process.env.MP_TICKET,
  API_URL: 'https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json',
  DIAS_ATRAS: 2,
  MAX_RETRIES: 3
};
async function main() {
  console.log("🚀 MOTOR PLUS CONTROL v3.2 (Modo Diagnóstico)...");

  const OFFSET_DIAS = 3;

  for (let d = 0; d < CONFIG.DIAS_ATRAS; d++) {

    const date = new Date();
    date.setDate(date.getDate() - d - OFFSET_DIAS);

    const dateStr =
      `${String(date.getDate()).padStart(2, '0')}` +
      `${String(date.getMonth() + 1).padStart(2, '0')}` +
      `${date.getFullYear()}`;

    console.log(`\n📅 Consultando fecha: ${dateStr}`);

    const listData = await fetchWithRetry(
      CONFIG.API_URL,
      { fecha: dateStr, ticket: CONFIG.MP_TICKET },
      `Lista ${dateStr}`
    );

    if (!listData) {
      console.log("❌ Respuesta nula del servidor.");
      continue;
    }

    const listado = Array.isArray(listData.Listado)
      ? listData.Listado
      : [];

    if (listado.length === 0) {
      console.log("📭 Sin resultados para esta fecha.");
      continue;
    }

    console.log(`📊 Encontrados: ${listado.length} registros`);

    for (const item of listado) {
      if (!item?.CodigoExternal) continue;

      await processDetail(item.CodigoExternal);
      await wait(400);
    }
  }

  console.log("\n🏁 Proceso finalizado.");
}

main();