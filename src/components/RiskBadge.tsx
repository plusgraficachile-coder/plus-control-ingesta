import React from 'react';

// Interfaz que coincide con tu vista SQL
export interface ClienteRiesgo {
  nivel_riesgo: 'VERDE' | 'AMARILLO' | 'ROJO';
  deuda_total: number;
  max_dias_atraso: number;
  facturas_impagas: number;
}

const FORMATTER = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export const RiskBadge = ({ data }: { data: ClienteRiesgo | null }) => {
  // Si no hay datos o es verde sin deuda, no mostramos nada (limpieza visual)
  if (!data || (data.nivel_riesgo === 'VERDE' && data.deuda_total === 0)) return null;

  const config = {
    VERDE: { 
      bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✅', label: 'Crédito Sano' 
    },
    AMARILLO: { 
      bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '⚠️', label: 'Saldo Pendiente' 
    },
    ROJO: { 
      bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: '⛔', label: 'Moroso / Bloqueado' 
    }
  };

  const style = config[data.nivel_riesgo] || config.VERDE;

  return (
    <div className={`mt-2 flex items-center gap-3 px-3 py-2 rounded-lg border ${style.bg} ${style.border}`}>
      {/* ✅ AQUÍ ESTÁ LA CORRECCIÓN: */}
      <span className="text-xl">{style.icon}</span>
      
      <div className="flex flex-col">
        <span className={`text-xs font-bold ${style.text} uppercase tracking-wider`}>
          {style.label}
        </span>
        <span className="text-sm font-semibold text-slate-700">
          Deuda: {FORMATTER.format(data.deuda_total)}
          {data.max_dias_atraso > 0 && (
            <span className="text-xs font-normal text-slate-500 ml-1">
              ({data.max_dias_atraso} días atraso)
            </span>
          )}
        </span>
      </div>
    </div>
  );
};