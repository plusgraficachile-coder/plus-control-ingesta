import { useMemo } from 'react';
import { PieChart, Calendar, DollarSign, Ban, CheckCircle } from 'lucide-react';
import { FORMATTER } from '../../utils/formatters';

const REAL_DEBT_STATES = ['En Producción', 'Entregado', 'Aceptada', 'Finalizado'];

interface DebtPanelProps {
  quotes?: any[];
  dark?: boolean;
  onPay: (quote: any) => void;
  onReject: (quote: any) => void;
}

const DebtPanel = ({ quotes = [], dark, onPay, onReject }: DebtPanelProps) => {
  const cobranzaList = useMemo(() => {
    return quotes
      .filter((q: any) => 
        q.saldo_pendiente > 0 && 
        REAL_DEBT_STATES.includes(q.estado)
      )
      .sort((a: any, b: any) => 
        new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime()
      );
  }, [quotes]);

  return (
    <div className="lg:col-span-3 pg-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-pg-border bg-pg-danger/5 flex justify-between items-center">
        <h3 className="font-bold text-pg-danger flex items-center gap-2">
          <PieChart size={18} className="text-pg-danger" />
          Deuda Pendiente
        </h3>
        <span className="text-xs font-bold bg-pg-danger text-white px-3 py-1 rounded-full">
          {cobranzaList.length} {cobranzaList.length === 1 ? 'Caso' : 'Casos'}
        </span>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-x-auto p-4">
        {cobranzaList.length === 0 ? (
          // Estado vacío
          <div className="min-h-[200px] flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-pg-success/10 flex items-center justify-center mb-3">
              <CheckCircle size={32} className="text-pg-success" />
            </div>
            <p className="text-sm font-semibold text-pg-text mb-1">
              ¡Cuentas al día!
            </p>
            <p className="text-xs text-pg-muted">
              No hay deuda activa en este momento
            </p>
          </div>
        ) : (
          // Grid de deudas
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cobranzaList.map((q: any) => (
              <div 
                key={q.id} 
                className="group relative pg-card hover:shadow-md transition-all border-l-4 border-pg-danger"
              >
                {/* Contenido de la card */}
                <div className="space-y-3">
                  {/* Cliente */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-pg-text truncate">
                        {q.cliente_empresa || q.cliente_nombre || 'Cliente sin nombre'}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-pg-muted mt-1">
                        <Calendar size={12} />
                        <span>
                          {new Date(q.fecha_creacion).toLocaleDateString('es-CL', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Badge de estado */}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-pg-warning/20 text-pg-warning border border-pg-warning/30 whitespace-nowrap">
                      {q.estado}
                    </span>
                  </div>

                  {/* Monto adeudado */}
                  <div className="pt-3 border-t border-pg-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-pg-secondary font-medium">
                        Saldo pendiente
                      </span>
                      <span className="text-lg font-bold text-pg-danger">
                        {FORMATTER.format(q.saldo_pendiente)}
                      </span>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onPay(q)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                                   bg-pg-success/10 text-pg-success hover:bg-pg-success hover:text-white 
                                   rounded-lg transition-all font-medium text-sm
                                   active:scale-95 transform"
                        title="Registrar Pago"
                      >
                        <DollarSign size={16} />
                        <span className="hidden sm:inline">Pagar</span>
                      </button>
                      
                      <button 
                        onClick={() => onReject(q)}
                        className="flex items-center justify-center gap-2 px-3 py-2 
                                   bg-pg-elevated text-pg-muted hover:bg-pg-danger hover:text-white 
                                   rounded-lg transition-all
                                   active:scale-95 transform"
                        title="Anular / Rechazar"
                      >
                        <Ban size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Indicador de hover */}
                <div className="absolute inset-0 rounded-xl border-2 border-pg-danger/0 
                                group-hover:border-pg-danger/20 transition-colors pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer con totales (opcional) */}
      {cobranzaList.length > 0 && (
        <div className="px-5 py-3 border-t border-pg-border bg-pg-elevated">
          <div className="flex items-center justify-between text-sm">
            <span className="text-pg-secondary font-medium">
              Total adeudado:
            </span>
            <span className="text-lg font-bold text-pg-danger">
              {FORMATTER.format(
                cobranzaList.reduce((sum, q) => sum + q.saldo_pendiente, 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtPanel;