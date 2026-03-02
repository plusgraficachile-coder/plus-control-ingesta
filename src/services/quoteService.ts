// ============================================================
// src/services/quoteService.ts
// Servicio para operaciones CRUD de cotizaciones
// ============================================================

import { supabase } from './supabaseClient';
import { toast } from 'sonner';
import type { Quote, QuoteItem } from '../types';

// Helper: Convierte a número válido
const toNum = (val: unknown): number => {
  if (val === '' || val === null || val === undefined) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

// Helper: Limpia IDs (UUID o Integer)
const toId = (val: unknown): string | null => {
  if (!val || val === '' || val === '0' || val === 0) return null;
  return String(val);
};

export const quoteService = {

  async save(quoteForm: Quote, userId: string) {
    try {
      const quoteData = {
        cliente_id: toId(quoteForm.cliente_id),
        usuario_id: userId,
        fecha_creacion: quoteForm.fecha_creacion || new Date().toISOString(),
        fecha_pago: quoteForm.fecha_pago || null,
        folio: quoteForm.folio || null,
        validez_oferta: quoteForm.validez_oferta || '15 Días',
        condicion_pago: quoteForm.condicion_pago || 'Contado',
        estado: quoteForm.estado || 'Borrador',
        notas: quoteForm.notas || null,
        neto_total: toNum(quoteForm.neto_total),
        descuento_total: toNum(quoteForm.descuento_total),
        descuento_porcentaje: toNum(quoteForm.descuento_porcentaje),
        iva_total: toNum(quoteForm.iva_total),
        total_final: toNum(quoteForm.total_final),
        abono_inicial: toNum(quoteForm.abono_inicial),
        saldo_pendiente: toNum(quoteForm.saldo_pendiente),
        aplica_iva: quoteForm.aplica_iva !== undefined ? quoteForm.aplica_iva : true,
        cliente_nombre: quoteForm.cliente_nombre || '',
        cliente_empresa: quoteForm.cliente_empresa || '',
        cliente_rut: quoteForm.cliente_rut || '',
        email_cliente: quoteForm.email_cliente || '',
        telefono_cliente: quoteForm.telefono_cliente || '',
      };

      let quoteId = quoteForm.id;
      let result;

      if (quoteId) {
        result = await supabase
          .from('cotizaciones')
          .update(quoteData)
          .eq('id', quoteId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('cotizaciones')
          .insert(quoteData)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      quoteId = result.data.id;

      if (quoteId) {
        await supabase
          .from('cotizaciones_detalle')
          .delete()
          .eq('cotizacion_id', quoteId);

        const itemsToSave = (quoteForm.items || []).map((item: QuoteItem) => ({
          cotizacion_id: quoteId,
          material_id: toId(item.material_id),
          nombre_producto: item.nombre_producto || 'Producto',
          descripcion_item: item.descripcion_item || '',
          codigo: item.codigo || null,
          estado_produccion: item.estado_produccion || 'Pendiente',
          notas_taller: item.notas_taller || null,
          cantidad: toNum(item.cantidad) || 1,
          medidas_ancho: toNum(item.medidas_ancho),
          medidas_alto: toNum(item.medidas_alto),
          precio_unitario_aplicado: toNum(item.precio_unitario_aplicado),
          total_linea: toNum(item.total_linea),
          descuento_row: toNum(item.descuento_row),
          manual_desc: Boolean(item.manual_desc),
        }));

        if (itemsToSave.length > 0) {
          const { error: itemsError } = await supabase
            .from('cotizaciones_detalle')
            .insert(itemsToSave);
          if (itemsError) throw itemsError;
        }
      }

      toast.success('✅ Guardado correctamente');
      return { success: true, id: quoteId };

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error guardando cotización:', error);
      if (msg.includes('invalid input syntax for type uuid')) {
        toast.error('Error de Datos: Un ID no es válido. Revisa el cliente seleccionado.');
      } else if (msg.includes('invalid input syntax')) {
        toast.error(`Error de Datos: ${msg}`);
      } else {
        toast.error('Error al guardar: ' + msg);
      }
      return { success: false, error };
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('cotizaciones')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Registro eliminado');
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error eliminando cotización:', error);
      toast.error('Error al eliminar: ' + msg);
      return { success: false, error };
    }
  },

  async updateStatus(id: string | number, newStatus: string, extras: Record<string, unknown> = {}) {
    try {
      const { error } = await supabase
        .from('cotizaciones')
        .update({ estado: newStatus, ...extras })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Estado actualizado: ${newStatus}`);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error actualizando estado:', error);
      toast.error('Error al actualizar: ' + msg);
      return { success: false, error };
    }
  },
};
