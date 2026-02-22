// ============================================================
// services/materialService.ts
// Operaciones CRUD para materiales en Supabase.
// ============================================================

import { supabase } from './supabaseClient';

export const saveMaterial = async (matData: any, isEditing: boolean) => {
  // Armado del JSON de ficha técnica
  const fichaTecnicaJSON = {
    composicion: matData.spec_composicion,
    durabilidad: matData.spec_durabilidad,
    resistencia: matData.spec_resistencia,
    usos: matData.spec_usos,
    tecnologia: matData.spec_tecnologia,
    acabado: matData.spec_acabado,
  };

  const payload = {
    codigo: matData.codigo ? matData.codigo.toUpperCase() : null,
    nombre: matData.nombre,
    caracteristicas: matData.caracteristicas,
    costo_base_m2: Number(matData.costo_base_m2) || 0,
    margen_sugerido: Number(matData.margen_sugerido) || 0,
    precio_venta_base: parseInt(matData.precio_venta_base),
    ficha_tecnica: fichaTecnicaJSON,
  };

  if (isEditing && matData.id) {
    const { error } = await supabase.from('materiales').update(payload).eq('id', matData.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('materiales').insert([payload]);
    if (error) throw error;
  }
};

export const deleteMaterial = async (id: string) => {
  const { error } = await supabase.from('materiales').delete().eq('id', id);
  if (error) throw error;
};

export const fetchMaterials = async () => {
  const { data, error } = await supabase.from('materiales').select('*');
  if (error) throw error;
  return data || [];
};
