#!/usr/bin/env node
/**
 * DIAGNÓSTICO V2 - LICITACIONES (OPORTUNIDADES)
 * Objetivo: Ver si la lista de Licitaciones trae Región/Monto
 */
const axios = require('axios');

const CONFIG = {
  MP_TICKET: process.env.MP_TICKET,
  // CAMBIO CLAVE: Ahora miramos el futuro (Licitaciones), no el pasado.
  API_URL: 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json'
};

if (!CONFIG.MP_TICKET) process.exit(1);

function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

async function main() {
  console.log("🕵️ INICIANDO DIAGNÓSTICO DE LICITACIONES...");
  
  // Probamos con AYER (para asegurar datos)
  const date = new Date();
  date.setDate(date.getDate() - 1); 
  
  const params = { fecha: formatDate(date), ticket: CONFIG.MP_TICKET };
  console.log(`📡 Consultando Licitaciones para: ${params.fecha}`);

  try {
    const res = await axios.get(CONFIG.API_URL, { params, timeout: 30000 });
    const listado = res.data?.Listado || [];
    
    console.log(`📊 Encontradas: ${listado.length} licitaciones disponibles.`);

    if (listado.length > 0) {
        const primera = listado[0];
        console.log("\n📦 QUE TRAE LA LISTA (Resumen):");
        console.log(`   - Código: ${primera.CodigoExternal}`);
        console.log(`   - Nombre: ${primera.Nombre}`);
        // Verificamos si estos campos existen en la lista simple
        console.log(`   - ¿Trae Región?: ${JSON.stringify(primera).includes('Region') ? 'SÍ' : 'NO'}`);
        console.log(`   - ¿Trae Monto?: ${primera.MontoEstimado !== undefined ? 'SÍ' : 'NO'}`);
        
        // PRUEBA DE PROFUNDIDAD: Consultamos el detalle de la primera licitación
        // para ver si ahí SÍ aparece la región.
        if (primera.CodigoExternal) {
            console.log(`\n🔬 PROFUNDIZANDO: Consultando detalle de ${primera.CodigoExternal}...`);
            const urlDetalle = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json`;
            const resDetalle = await axios.get(urlDetalle, { 
                params: { codigo: primera.CodigoExternal, ticket: CONFIG.MP_TICKET } 
            });
            
            const detalle = resDetalle.data?.Listado?.[0];
            if (detalle) {
                console.log("✅ ¡DETALLE OBTENIDO!");
                console.log(`   - Región Real: ${detalle.Comprador?.Region}`);
                console.log(`   - Comuna: ${detalle.Comprador?.Comuna}`);
                console.log(`   - Monto: ${detalle.MontoEstimado}`);
            }
        }
    } else {
        console.log("⚠️ La lista llegó vacía (pero el ticket funciona).");
    }

  } catch (e) {
    console.error(`🔥 ERROR: ${e.message}`);
  }
}

main();
