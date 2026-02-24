#!/usr/bin/env node
/**
 * SCRIPT DE DIAGNÓSTICO - MODO ESPÍA
 * Objetivo: Ver qué devuelve REALMENTE la API de Mercado Público.
 */
const axios = require('axios');

const CONFIG = {
  MP_TICKET: process.env.MP_TICKET,
  MP_BASE_URL: 'https://api.mercadopublico.cl/servicios/v1/publico'
};

if (!CONFIG.MP_TICKET) {
  console.error("❌ ERROR: No hay Ticket configurado en las variables de entorno.");
  process.exit(1);
}

function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

async function main() {
  console.log("🕵️ INICIANDO DIAGNÓSTICO...");
  console.log(`🔑 Usando Ticket: ${CONFIG.MP_TICKET.substring(0, 5)}... (Oculto)`);

  // Probamos solo con AYER (Día hábil seguro)
  const date = new Date();
  date.setDate(date.getDate() - 1); // Ayer
  
  const url = `${CONFIG.MP_BASE_URL}/ordenesdecompra.json`;
  const params = { fecha: formatDate(date), ticket: CONFIG.MP_TICKET };
  
  console.log(`📡 Consultando API para fecha: ${params.fecha}`);

  try {
    const res = await axios.get(url, { params, timeout: 30000 });
    
    // 1. ANÁLISIS DE LA RESPUESTA CRUDA
    console.log("------------------------------------------------");
    console.log("📥 RESPUESTA DEL SERVIDOR (Primeros 200 caracteres):");
    console.log(JSON.stringify(res.data).substring(0, 200));
    console.log("------------------------------------------------");

    // 2. VERIFICACIÓN DE LISTADO
    if (!res.data.Listado) {
        console.error("⚠️ ALERTA: La API no devolvió una lista 'Listado'.");
        console.error("Posible error de Ticket o Límite de API.");
        console.log("Contenido completo:", JSON.stringify(res.data, null, 2));
    } else {
        const count = res.data.Listado.length;
        console.log(`✅ ÉXITO DE CONEXIÓN: Se encontraron ${count} órdenes en bruto.`);
        
        if (count > 0) {
            // 3. MUESTREO DE DATOS (Para ver cómo vienen las regiones)
            const primera = res.data.Listado[0];
            console.log("🔎 EJEMPLO DE DATO (Para revisar filtros):");
            console.log("   - Comprador.Region:", primera.Comprador?.Region);
            console.log("   - Comprador.Nombre:", primera.Comprador?.NombreOrganismo);
            console.log("   - Total:", primera.Total);
        }
    }

  } catch (e) {
    console.error(`🔥 ERROR DE CONEXIÓN HTTP: ${e.message}`);
    if (e.response) {
        console.error("Datos de error:", e.response.data);
    }
  }
}

main();
