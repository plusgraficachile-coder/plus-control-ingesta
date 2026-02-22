/**
 * Módulo de Reglas de Negocio
 * Determina el % de descuento basado en el volumen total (m2)
 */

export const getRecommendedDiscount = (
  items: any[] = [], 
  rules: any[] = []
): number => {
  // 1. Calcular Metros Cuadrados Totales de la cotización
  const totalM2 = items.reduce((acc, item) => {
    const ancho = Number(item.medidas_ancho) || 0;
    const alto = Number(item.medidas_alto) || 0;
    const cantidad = Number(item.cantidad) || 1;

    // Fórmula: (Ancho * Alto / 10000) * Cantidad
    const areaM2 = (ancho * alto) / 10000;
    
    return acc + (areaM2 * cantidad);
  }, 0);

  // 2. Buscar en qué rango cae
  // La tabla de Supabase tiene: rango_min_m2 y rango_max_m2
  const matchingRule = rules.find(rule => {
    const min = Number(rule.rango_min_m2) || 0;
    const max = Number(rule.rango_max_m2) || 999999;
    return totalM2 >= min && totalM2 <= max;
  });

  // 3. Retornar el porcentaje (o 0 si no calza con nada)
  return matchingRule ? Number(matchingRule.porcentaje_descuento) : 0;
};