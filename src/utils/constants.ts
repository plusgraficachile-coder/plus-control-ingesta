export const ORDER_STATUS = {
  PENDING: 'Pendiente',
  PRODUCTION: 'En Producción',
  READY: 'Listo para Entrega',
  DELIVERED: 'Entregado'
} as const;

export const IS_READY_FOR_DELIVERY = (status: string) => {
  const normalized = status?.trim();
  return [
    ORDER_STATUS.READY, 
    'Terminado', 
    'Listo', 
    'Listo para Entrega'
  ].includes(normalized);
};