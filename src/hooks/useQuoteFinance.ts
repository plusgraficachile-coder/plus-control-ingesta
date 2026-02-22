// ============================================================
// src/hooks/useQuoteFinance.tsx
// Lógica financiera híbrida (M2 vs Unidades)
// ============================================================
import { useMemo } from 'react';

// Función auxiliar para evitar errores con null/undefined
const safeNum = (val: any) => {
  if (!val || val === '') return 0;
  return Number(val) || 0;
};

// --- 🔥 ESTA ES LA FUNCIÓN QUE FALTABA EXPORTAR ---
export const calculateItemTotal = (item: any) => {
  const ancho = safeNum(item.medidas_ancho);
  const alto = safeNum(item.medidas_alto);
  const cantidad = safeNum(item.cantidad) || 1;
  const precio = safeNum(item.precio_unitario_aplicado);

  // CASO A: Producto Dimensionado (Tiene Ancho Y Alto)
  // Se cobra por metro cuadrado (m2)
  if (ancho > 0 && alto > 0) {
    // Convertir cm a m2: (100cm * 100cm) / 10000 = 1m2
    const areaM2 = (ancho * alto) / 10000;
    
    // Total = Cantidad * Area * PrecioM2
    return Math.round(cantidad * areaM2 * precio);
  }

  // CASO B: Producto Unitario / Servicio (Ancho o Alto es 0)
  // Se cobra directo por unidad (Precio * Cantidad)
  return Math.round(cantidad * precio);
};

// Hook de Totales Globales
export const useQuoteFinance = (items: any[], discountPct: number = 0, hasIva: boolean = true) => {
  return useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];

    const subtotal = safeItems.reduce((acc, item) => acc + calculateItemTotal(item), 0);
    
    const discount = Math.round(subtotal * (safeNum(discountPct) / 100));
    const net = Math.max(0, subtotal - discount);
    const iva = hasIva ? Math.round(net * 0.19) : 0;
    const total = net + iva;

    return { subtotal, discount, net, iva, total };
  }, [items, discountPct, hasIva]);
};