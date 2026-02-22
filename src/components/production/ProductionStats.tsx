import { DollarSign, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FORMATTER } from '../../utils/formatters';

interface ProductionStatsProps {
  quotes: any[];
}

export const ProductionStats = ({ quotes }: ProductionStatsProps) => {
  // 1. Lógica de Negocio: Calcular Totales
  const stats = quotes.reduce(
    (acc, quote) => {
      // Solo consideramos órdenes activas (no rechazadas/archivadas si las hubiera)
      if (quote.estado === 'Rechazada') return acc;

      // A. Total Vendido (Suma de total_final)
      acc.totalVendido += quote.total_final || 0;

      // B. Deuda en la Calle (Suma de saldo_pendiente)
      // Solo sumamos si el saldo es positivo
      if ((quote.saldo_pendiente || 0) > 0) {
        acc.deudaTotal += quote.saldo_pendiente;
        acc.clientesDeudores += 1;
      }

      // C. Eficiencia: Terminados vs En Proceso
      if (quote.estado === 'Listo' || quote.estado === 'Entregado') {
        acc.terminados += 1;
      } else {
        acc.enProceso += 1;
      }

      return acc;
    },
    { totalVendido: 0, deudaTotal: 0, clientesDeudores: 0, terminados: 0, enProceso: 0 }
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      
      {/* TARJETA 1: DEUDA (La más importante) */}
      <div className="bg-[#1F2937] p-4 rounded-xl border border-rose-500/20 relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
           <AlertCircle size={40} className="text-rose-500" />
        </div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Por Cobrar</p>
        <h3 className="text-2xl font-black text-rose-400">
          {FORMATTER.format(stats.deudaTotal)}
        </h3>
        <p className="text-rose-500/60 text-[10px] font-mono mt-1">
          {stats.clientesDeudores} clientes deben
        </p>
      </div>

      {/* TARJETA 2: PRODUCCIÓN ACTIVA */}
      <div className="bg-[#1F2937] p-4 rounded-xl border border-amber-500/20 relative overflow-hidden">
         <div className="absolute right-0 top-0 p-3 opacity-10">
           <TrendingUp size={40} className="text-amber-500" />
        </div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">En Taller</p>
        <h3 className="text-2xl font-black text-amber-400">
          {stats.enProceso}
        </h3>
        <p className="text-amber-500/60 text-[10px] font-mono mt-1">
            Órdenes activas
        </p>
      </div>

      {/* TARJETA 3: TERMINADOS */}
      <div className="bg-[#1F2937] p-4 rounded-xl border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-3 opacity-10">
           <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Listos / Entregados</p>
        <h3 className="text-2xl font-black text-emerald-400">
          {stats.terminados}
        </h3>
        <p className="text-emerald-500/60 text-[10px] font-mono mt-1">
            Eficiencia
        </p>
      </div>

      {/* TARJETA 4: VENTA TOTAL (Opcional, oculta en móvil si quieres) */}
      <div className="bg-[#1F2937] p-4 rounded-xl border border-cyan-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-3 opacity-10">
           <DollarSign size={40} className="text-cyan-500" />
        </div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Venta Total Tablero</p>
        <h3 className="text-2xl font-black text-cyan-400">
          {FORMATTER.format(stats.totalVendido)}
        </h3>
        <p className="text-cyan-500/60 text-[10px] font-mono mt-1">
            Bruto acumulado
        </p>
      </div>

    </div>
  );
};