import { useMemo } from 'react';
import { PieChart, Calendar, DollarSign, Ban, CheckCircle } from 'lucide-react';
import { FORMATTER } from '../../utils/formatters';

// 🔥 EL FIX DE ECONORENT ESTÁ AQUÍ
// Definimos explícitamente qué es deuda. "Enviada" NO está aquí.
const REAL_DEBT_STATES = ['En Producción', 'Entregado', 'Aceptada', 'Finalizado'];

const DebtPanel = ({ quotes = [], dark, onPay, onReject }: any) => {

  const cobranzaList = useMemo(() => {
    return quotes
      .filter((q: any) => 
         q.saldo_pendiente > 0 && 
         REAL_DEBT_STATES.includes(q.estado) // ← FILTRO ESTRICTO
      )
      .sort((a: any, b: any) => new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime());
  }, [quotes]);

  const cardBase = dark 
    ? 'bg-[#111827]/60 backdrop-blur-xl border border-white/5 shadow-xl shadow-black/10' 
    : 'bg-white border border-slate-100 shadow-sm';
  const textMain = dark ? 'text-white' : 'text-slate-800';

  return (
    <div className={`lg:col-span-3 rounded-3xl overflow-hidden flex flex-col ${cardBase}`}>
      <div className={`p-5 border-b flex justify-between items-center ${dark ? 'border-white/5 bg-rose-500/5' : 'border-slate-100 bg-rose-50'}`}>
        <h3 className="font-bold text-rose-500 flex items-center gap-2">
            <PieChart size={18}/> Deuda Pendiente
        </h3>
        <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">
            {cobranzaList.length} Casos
        </span>
      </div>
      
      <div className="flex-1 overflow-x-auto p-2">
        {cobranzaList.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-slate-400 opacity-60">
                <CheckCircle size={40} className="mb-2 text-emerald-500"/>
                <p className="text-sm font-medium">¡Cuentas al día! Sin deuda activa.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {cobranzaList.map((q: any) => (
                <div key={q.id} className={`p-3 rounded-2xl flex justify-between items-center group transition-colors border ${dark ? 'hover:bg-white/5 border-white/5' : 'hover:bg-slate-50 border-slate-100'}`}>
                    <div className="truncate pr-2">
                        <div className={`font-bold text-sm truncate ${textMain}`}>{q.cliente_empresa || q.cliente_nombre || 'Cliente'}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar size={10}/> {new Date(q.fecha_creacion).toLocaleDateString()}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="font-bold text-rose-500 text-sm">{FORMATTER.format(q.saldo_pendiente)}</div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => onPay(q)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all" title="Registrar Pago">
                                <DollarSign size={16} />
                            </button>
                            <button onClick={() => onReject(q)} className="p-1.5 rounded-lg bg-slate-500/10 text-slate-400 hover:bg-rose-500 hover:text-white transition-all" title="Anular / Rechazar">
                                <Ban size={16} />
                            </button>
                        </div>
                    </div>
                </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default DebtPanel;