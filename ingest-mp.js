const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// 1. Configuración e Inicialización
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan las variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// API de Mercado Público (Tickets Diarios)
const MP_API_URL = 'https://api.mercadopublico.cl/servicios/v1/publico/ordenescompra.json';

// Configuración de Negocio (Plus Control)
const REGION_OBJETIVO = 'Araucanía'; // Filtro de texto para la región
const MONTO_MINIMO = 500000; // 500.000 CLP

async function procesarIngesta() {
  console.log('🚀 Iniciando Ingesta Plus Control...');

  try {
    // 2. Obtener datos de Mercado Público (Ticket Público - Últimas OCs)
    // Nota: Usamos la fecha de hoy por defecto en la consulta pública
    console.log('📥 Consultando API Mercado Público...');
    const response = await axios.get(MP_API_URL);
    
    if (!response.data || !response.data.Listado) {
      console.log('⚠️ No se encontraron datos o la estructura de la API cambió.');
      return;
    }

    const ordenes = response.data.Listado;
    console.log(`📊 Total OCs recuperadas (bruto): ${ordenes.length}`);

    // 3. Filtrado Inteligente (Lógica de Negocio)
    const leadsCalificados = ordenes.filter(oc => {
      // Filtro 1: Región (Normalizamos a mayúsculas para evitar errores)
      const esRegion = oc.Comprador && 
                       oc.Comprador.Region && 
                       oc.Comprador.Region.toUpperCase().includes(REGION_OBJETIVO.toUpperCase());
      
      // Filtro 2: Monto
      const esMonto = oc.MontoTotal >= MONTO_MINIMO;

      return esRegion && esMonto;
    });

    console.log(`💎 Leads de Araucanía (> $500k): ${leadsCalificados.length}`);

    if (leadsCalificados.length === 0) {
      console.log('💤 No hay leads nuevos para insertar en este momento.');
      return;
    }

    // 4. Inserción en Supabase (Lógica de Apoyo)
    let insertados = 0;
    let duplicados = 0;

    for (const lead of leadsCalificados) {
      // Mapeo de datos para tu tabla 'leads' o 'ordenes' en Supabase
      // Ajusta los nombres de columnas según tu esquema real en DB
      const payload = {
        codigo_oc: lead.Codigo,
        nombre_oc: lead.Nombre,
        comprador_organismo: lead.Comprador.NombreOrganismo,
        comprador_rut: lead.Comprador.RutUnidad,
        monto_total: lead.MontoTotal,
        fecha_envio: lead.Fechas.FechaEnvio,
        estado: lead.Estado,
        region: lead.Comprador.Region,
        raw_data: lead // Guardamos el JSON completo por seguridad
      };

      // Upsert: Intenta insertar, si el codigo_oc ya existe, no hace nada (ignora)
      // Asume que tienes una constraint UNIQUE en 'codigo_oc'
      const { error } = await supabase
        .from('leads') // ⚠️ IMPORTANTE: Asegúrate que tu tabla se llame 'leads'
        .upsert(payload, { onConflict: 'codigo_oc', ignoreDuplicates: true });

      if (error) {
        console.error(`❌ Error insertando ${lead.Codigo}:`, error.message);
      } else {
        // Supabase no devuelve count en upsert ignore, asumimos éxito si no hay error
        insertados++; 
      }
    }

    console.log(`✅ Proceso finalizado. Leads procesados: ${leadsCalificados.length}`);

  } catch (error) {
    console.error('🔥 Error crítico en el script:', error.message);
    process.exit(1);
  }
}

// Ejecutar
procesarIngesta();
