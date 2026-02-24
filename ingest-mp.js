#!/usr/bin/env node
/**
 * DIAGNÓSTICO V3 - PRUEBA DE RESILIENCIA
 * Objetivo: Encontrar un endpoint de Licitaciones que NO devuelva Error 500.
 */
const axios = require('axios');

const CONFIG = {
  MP_TICKET: process.env.MP_TICKET,
  API_URL: 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json'
};

if (!CONFIG.MP_TICKET) process.exit(1);

function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

async function testEndpoint(name, params) {
  console.log(`\n🧪 PROBANDO: ${name}`);
  console.log(`   Params: ${JSON.stringify(params)}`);
  
  try {
    const res = await axios.get(CONFIG.API_URL, { 
      params: { ...params, ticket: CONFIG.MP_TICKET },
      timeout: 10000 
    });
    
    const count = res.data?.Listado?.length || 0;
    console.log(`   ✅ ÉXITO: Status 200 | Resultados: ${count}`);
    
    if (count > 0) {
      const sample = res.data.Listado[0];
      console.log(`   🔎 Muestra: ${sample.CodigoExternal} | ${sample.Nombre.substring(0, 40)}...`);
      // Chequeo rápido de campos
      console.log(`      ¿Tiene Región?: ${JSON.stringify(sample).includes('Region') ? 'SÍ' : 'NO'}`);
    }
    return true;

  } catch (e) {
    console.log(`   ❌ FALLO: ${e.message}`);
    if (e.response) console.log(`      Server dice: ${e.response.status} - ${e.response.statusText}`);
    return false;
  }
}

async function main() {
  console.log("🕵️ INICIANDO TEST DE PUERTAS TRASERAS...");

  // PRUEBA 1: Fecha de HOY (Tal vez ayer estaba corrupto)
  const today = new Date();
  await testEndpoint("Consulta por Fecha (HOY)", { fecha: formatDate(today) });

  // PRUEBA 2: Por Estado PUBLICADA (Código 5) -> Esta es nuestra esperanza
  // Nota: A veces el param es 'estado', a veces 'Estado'. Probamos minúscula estándar.
  await testEndpoint("Consulta por Estado (Publicada - 5)", { estado: '5' });

  // PRUEBA 3: Por Estado ADJUDICADA (Código 8)
  await testEndpoint("Consulta por Estado (Adjudicada - 8)", { estado: '8' });
}

main();
