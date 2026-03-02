import { DollarSign, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FORMATTER } from '../../utils/formatters';

interface ProductionStatsProps {
  quotes: any[];
}

export const ProductionStats = ({ quotes }: ProductionStatsProps) => {
  const stats = quotes.reduce(
    (acc, quote) => {
      if (quote.estado === 'Rechazada') return acc;

      acc.totalVendido += quote.total_final || 0;

      if ((quote.saldo_pendiente || 0) > 0) {
        acc.deudaTotal += quote.saldo_pendiente;
        acc.clientesDeudores += 1;
      }

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
      {/* Deuda - CRÍTICA */}
      <div className="pg-card relative overflow-hidden group border-l-4 border-pg-danger">
        <div className="absolute right-2 top-2 opacity-5 group-hover:opacity-10 transition-opacity">
          <AlertCircle size={60} className="text-pg-danger" />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-bold text-pg-muted uppercase tracking-wide mb-2">
            Por Cobrar
          </p>
          <h3 className="text-3xl font-bold text-pg-danger mb-1">
            {FORMATTER.format(stats.deudaTotal)}
          </h3>
          <p className="text-xs text-pg-danger/70 font-medium">
            {stats.clientesDeudores} {stats.clientesDeudores === 1 ? 'cliente debe' : 'clientes deben'}
          </p>
        </div>
      </div>

      {/* En Taller */}
      <div className="pg-card relative overflow-hidden group border-l-4 border-pg-warning">
        <div className="absolute right-2 top-2 opacity-5 group-hover:opacity-10 transition-opacity">
          <TrendingUp size={60} className="text-pg-warning" />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-bold text-pg-muted uppercase tracking-wide mb-2">
            En Taller
          </p>
          <h3 className="text-3xl font-bold text-pg-warning mb-1">
            {stats.enProceso}
          </h3>
          <p className="text-xs text-pg-warning/70 font-medium">
            Órdenes activas
          </p>
        </div>
      </div>

      {/* Terminados */}
      <div className="pg-card relative overflow-hidden group border-l-4 border-pg-success">
        <div className="absolute right-2 top-2 opacity-5 group-hover:opacity-10 transition-opacity">
          <CheckCircle2 size={60} className="text-pg-success" />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-bold text-pg-muted uppercase tracking-wide mb-2">
            Listos / Entregados
          </p>
          <h3 className="text-3xl font-bold text-pg-success mb-1">
            {stats.terminados}
          </h3>
          <p className="text-xs text-pg-success/70 font-medium">
            Trabajos completados
          </p>
        </div>
      </div>

      {/* Venta Total */}
      <div className="pg-card relative overflow-hidden group border-l-4 border-pg-cyan">
        <div className="absolute right-2 top-2 opacity-5 group-hover:opacity-10 transition-opacity">
          <DollarSign size={60} className="text-pg-cyan" />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-bold text-pg-muted uppercase tracking-wide mb-2">
            Venta Total
          </p>
          <h3 className="text-3xl font-bold text-pg-cyan mb-1">
            {FORMATTER.format(stats.totalVendido)}
          </h3>
          <p className="text-xs text-pg-cyan/70 font-medium">
            En tablero
          </p>
        </div>
      </div>
    </div>
  );
};