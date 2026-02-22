import { supabase } from './supabaseClient'

export const getProductionQuotes = async () => {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select(`
      id,
      folio,
      cliente_empresa,
      cliente_nombre,
      fecha_creacion,
      estado,
      items:cotizaciones_detalle(
        id,
        descripcion_item,
        cantidad,
        medidas_ancho,
        medidas_alto,
        material_id
      )
    `)
    .in('estado', ['Aceptada', 'En Producción', 'Listo'])
    .order('fecha_creacion', { ascending: true });

  if (error) {
    console.error('❌ Error cargando producción:', error.message);
    throw error;
  }

  return data || [];
};
