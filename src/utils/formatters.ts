// ============================================================
// utils/formatters.ts
// Constantes globales y funciones de formato.
// Fuente única de verdad para estados y formatos.
// ============================================================

/* ======================= FORMATOS ======================= */

export const FORMATTER = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
});

export const formatDate = (d: string) =>
  d
    ? new Date(d).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

export const COLORS = [
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

/* ======================= ESTADOS COMERCIALES (VENTAS) ======================= */
/* Flujo de vida de una cotización */

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Borrador: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  Enviada: { label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  Aceptada: { label: 'Aceptada', color: 'bg-cyan-100 text-cyan-700' },
  'En Producción': { label: 'En Producción', color: 'bg-amber-100 text-amber-700' },
  Listo: { label: 'Listo', color: 'bg-teal-100 text-teal-700' },
  Entregado: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-700' },
};

/* Estados que generan ingreso confirmado */
export const SOLD_STATUS = ['Aceptada', 'En Producción', 'Listo', 'Entregado'];

/* Estados activos (trabajos que siguen abiertos) */
export const ACTIVE_STATUS = ['Aceptada', 'En Producción', 'Listo'];

/* ======================= ESTADOS PRODUCTIVOS (KANBAN) ======================= */
/* Flujo físico del trabajo en el taller */

export const PRODUCTION_STATUS = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Producción',
  READY: 'Listo',       // 🔥 ESTE activa el DeliveryGate
  DELIVERED: 'Entregado',
} as const;

/* Estados productivos que aún NO están entregados */
export const ACTIVE_PRODUCTION_STATUS = [
  PRODUCTION_STATUS.PENDING,
  PRODUCTION_STATUS.IN_PROGRESS,
  PRODUCTION_STATUS.READY,
];

/* ======================= CONDICIONES COMERCIALES ======================= */

export const PAYMENT_TERMS = [
  'Contado',
  '50% Anticipo / 50% Contra Entrega',
  '15 Días (OC)',
  '30 Días (OC)',
  '60 Días (OC)',
];

export const VALIDITY_OPTIONS = ['5 Días', '10 Días', '15 Días', '30 Días'];

/* ======================= RECURSOS ======================= */

// Logo base64 para PDFs (pega aquí cuando lo tengas)
export const LOGO_BASE64 = '';
