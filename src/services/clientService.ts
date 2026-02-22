// ============================================================
// services/clientService.ts
// Operaciones CRUD para clientes en Supabase.
// Adaptado a la estructura REAL de la tabla `clientes`.
// ============================================================

import { supabase } from './supabaseClient';

/* =========================
   CREAR / ACTUALIZAR
========================= */
export const saveClient = async (formData: any) => {
  // Adaptamos nombres de UI → DB
  const payload = {
    empresa: formData.nombre,              // UI "nombre" → DB "empresa"
    rut: formData.rut,
    contacto_nombre: formData.contacto,    // UI "contacto" → DB "contacto_nombre"
  };

  if (formData.id) {
    const { error } = await supabase
      .from('clientes')
      .update(payload)
      .eq('id', formData.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('clientes')
      .insert([payload]);

    if (error) throw error;
  }
};

/* =========================
   ELIMINAR
========================= */
export const deleteClient = async (id: string) => {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

/* =========================
   OBTENER LISTA
========================= */
export const fetchClients = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, empresa, rut, contacto_nombre')
    .order('empresa', { ascending: true });

  if (error) throw error;

  // Adaptamos DB → UI
  return (data || []).map(c => ({
    id: c.id,
    nombre: c.empresa,              // DB "empresa" → UI "nombre"
    rut: c.rut,
    contacto: c.contacto_nombre     // DB "contacto_nombre" → UI "contacto"
  }));
};
