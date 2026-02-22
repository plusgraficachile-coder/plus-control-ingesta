// src/lib/supabase.ts
// Archivo: src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las credenciales de Supabase en el archivo .env');
}

// ✅ ASEGÚRATE QUE DIGA "export const" (NO "export default")
export const supabase = createClient(supabaseUrl, supabaseKey, {  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Debug info (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log('🔗 Supabase conectado a:', supabaseUrl)
  console.log('✅ Variables de entorno cargadas correctamente')
}

export type Database = {
  public: {
    Tables: {
      cotizaciones: {
        Row: {
          id: string
          folio: string
          estado: string
          balance: number
          saldo_pendiente: number
          total_final: number
          cliente_nombre: string
          cliente_empresa: string
          fecha_creacion: string
          delivered_at: string | null
          updated_at: string
        }
      }
      order_audit_logs: {
        Row: {
          id: string
          order_id: string
          data: any
          created_at: string
          created_by: string | null
        }
      }
    }
  }
}