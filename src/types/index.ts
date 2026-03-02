// ============================================================================
// src/types/index.ts
// Interfaces compartidas de dominio — fuente única de verdad para tipos clave.
// Importar desde aquí en servicios, hooks y componentes.
// ============================================================================

// ─── ITEM DE COTIZACIÓN ────────────────────────────────────────────────────
export interface QuoteItem {
  id?: string;
  cotizacion_id?: string;
  material_id?: string | null;
  nombre_producto: string;
  descripcion_item?: string;
  codigo?: string | null;
  estado_produccion?: string;
  notas_taller?: string | null;
  cantidad: number;
  medidas_ancho?: number;
  medidas_alto?: number;
  precio_unitario_aplicado: number;
  costo_unitario?: number;
  total_linea: number;
  descuento_row?: number;
  manual_desc?: boolean;
  // Campo de visualización (join desde materiales)
  caracteristicas?: string;
}

// ─── COTIZACIÓN ─────────────────────────────────────────────────────────────
export interface Quote {
  id?: string;
  folio?: string;
  estado?: string;
  usuario_id?: string;
  cliente_id?: string | null;
  // Snapshot de cliente
  cliente_nombre?: string;
  cliente_empresa?: string;
  cliente_rut?: string;
  email_cliente?: string;
  telefono_cliente?: string;
  direccion_cliente?: string;
  ciudad_cliente?: string;
  // Condiciones
  condicion_pago?: string;
  validez_oferta?: string;
  notas?: string | null;
  aplica_iva?: boolean;
  // Fechas
  fecha_creacion?: string;
  fecha_pago?: string | null;
  fecha_vencimiento?: string | null;
  fecha_entrega?: string | null;
  updated_at?: string;
  // Totales
  descuento_porcentaje?: number;
  descuento_total?: number;
  neto_total?: number;
  iva_total?: number;
  total_final?: number;
  abono_inicial?: number;
  saldo_pendiente?: number;
  // Relación
  items?: QuoteItem[];
}

// ─── CLIENTE ─────────────────────────────────────────────────────────────────
/** Representación UI (lo que devuelve clientService.fetchClients) */
export interface Client {
  id?: string;
  nombre?: string;       // = empresa en DB
  rut?: string;
  contacto?: string;     // = contacto_nombre en DB
  // Campos raw de DB (también presentes en respuestas de Supabase)
  empresa?: string;
  contacto_nombre?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
}

/** Formulario de creación/edición de cliente */
export interface ClientFormData {
  id?: string;
  nombre?: string;
  rut?: string;
  contacto?: string;
}

// ─── MATERIAL ─────────────────────────────────────────────────────────────────
export interface Material {
  id?: string;
  codigo?: string | null;
  nombre: string;
  caracteristicas?: string;
  descripcion?: string;
  costo_base_m2?: number;
  margen_sugerido?: number;
  precio_venta_base?: number;
  ficha_tecnica?: Record<string, unknown>;
}

/** Formulario de creación/edición de material */
export interface MaterialFormData {
  id?: string;
  codigo?: string;
  nombre: string;
  caracteristicas?: string;
  costo_base_m2?: number | string;
  margen_sugerido?: number | string;
  precio_venta_base?: number | string;
  // Campos de ficha técnica
  spec_composicion?: string;
  spec_durabilidad?: string;
  spec_resistencia?: string;
  spec_usos?: string;
  spec_tecnologia?: string;
  spec_acabado?: string;
}

// ─── REGLAS DE DESCUENTO ──────────────────────────────────────────────────────
export interface DiscountRule {
  id?: string;
  nombre?: string;
  tipo?: string;
  valor?: number;
  cantidad_minima?: number;
  condicion?: Record<string, unknown>;
  activo?: boolean;
}

// ─── PRODUCCIÓN ───────────────────────────────────────────────────────────────
/** Datos que devuelve DeliveryGate al completar una entrega */
export interface GateDeliverData {
  orderId: string;
  balance?: number;
  folio?: string;
  client_name?: string;
}
