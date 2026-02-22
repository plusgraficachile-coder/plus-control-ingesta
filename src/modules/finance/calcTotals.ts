export const calculateItemValues = (
  cantidad: number,
  precio: number,
  costo: number
) => {
  const safe = (n: any) => {
    const v = Number(n);
    return isFinite(v) ? v : 0;
  };

  const q = safe(cantidad);
  const p = safe(precio);
  const c = safe(costo);

  const total_linea = Math.round(q * p);
  const costo_total = Math.round(q * c);
  const utilidad = total_linea - costo_total;

  const margen_real = total_linea > 0 ? (utilidad / total_linea) * 100 : 0;
  const markup = costo_total > 0 ? (utilidad / costo_total) * 100 : 0;

  return {
    total_linea,
    costo_total,
    utilidad,
    margen_real,
    markup
  };
};

export const calculateQuoteTotals = (
  items: any[] = [],
  descuentoPct: number = 0,
  abonoInicial: number = 0,
  aplicaIva: boolean = true
) => {
  const safe = (n: any) => {
    const v = Number(n);
    return isFinite(v) ? v : 0;
  };

  const safeDescuento = Math.min(Math.max(safe(descuentoPct), 0), 100);
  const safeAbono = Math.max(safe(abonoInicial), 0);

  const itemsCalculados = items.map(item => ({
    ...item,
    ...calculateItemValues(
      item.cantidad,
      item.precio_unitario,
      item.costo_unitario
    )
  }));

  const subtotal = itemsCalculados.reduce((sum, i) => sum + i.total_linea, 0);
  const montoDescuento = Math.round(subtotal * (safeDescuento / 100));
  const neto = Math.max(0, subtotal - montoDescuento);
  const iva = aplicaIva ? Math.round(neto * 0.19) : 0;
  const total = neto + iva;
  const saldoPendiente = Math.max(0, total - safeAbono);

  return {
    itemsCalculados,
    subtotal,
    montoDescuento,
    neto,
    iva,
    total,
    saldoPendiente
  };
};
