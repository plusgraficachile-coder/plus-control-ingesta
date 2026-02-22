// ============================================================
// components/dashboard/KpiGrid.tsx
// ============================================================
import { Activity, Wallet, AlertTriangle, Package } from 'lucide-react';
import { FORMATTER } from '../../utils/formatters';

const KpiGrid = ({ data, dark }: any) => {
  const cardBase = dark 
    ? 'bg-[#111827]/60 backdrop-blur-xl border border-white/5 shadow-xl shadow-black/10' 
    : 'bg-white border border-slate-100 shadow-sm';
  const textMain = dark ? 'text-white' : 'text-slate-800';
  const textSub = dark ? 'text-slate-400' : 'text-slate-500';

  const KpiCard = ({ title, value, subValue, icon: Icon, colorClass, gradientClass, badge }: any) => (
    <div className={`relative p-6 rounded-3xl overflow-hidden group transition-all duration-300 hover:scale-[1.02] ${cardBase}`}>
        {/* Fondo con brillo */}
        <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity blur-2xl ${gradientClass}`}></div>
        
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3 rounded-2xl ${dark ? 'bg-white/5' : 'bg-slate-50'} ${colorClass}`}>
                <Icon size={22} />
            </div>
            {badge && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${dark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'} ${colorClass}`}>
                    {badge}
                </span>
            )}
        </div>
        
        <div className="relative z-10">
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-1 opacity-60 ${textMain}`}>{title}</h3>
            <div className={`text-3xl font-black tracking-tight mb-2 ${textMain}`}>{value}</div>
            <div className={`text-xs font-medium flex items-center gap-1 ${textSub}`}>{subValue}</div>
        </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard 
            title="Ventas Netas" 
            value={FORMATTER.format(data.ventasNetas)} 
            subValue={<span><span className="text-cyan-500 font-bold">{data.count}</span> ventas reales</span>} 
            icon={Activity} 
            colorClass="text-cyan-500" 
            gradientClass="bg-cyan-500" 
            badge="FACTURADO" 
        />
        <KpiCard 
            title="Recaudado (Mes)" 
            value={FORMATTER.format(data.recaudado)} 
            subValue="Dinero en caja (Abonos)" 
            icon={Wallet} 
            colorClass="text-emerald-500" 
            gradientClass="bg-emerald-500" 
        />
        <KpiCard 
            title="Por Cobrar" 
            value={FORMATTER.format(data.porCobrar)} 
            subValue="Deuda histórica total" 
            icon={AlertTriangle} 
            colorClass="text-rose-500" 
            gradientClass="bg-rose-500" 
        />
        <KpiCard 
            title="Producción" 
            value={data.enProduccion} 
            subValue={<span>IVA Mes: <span className="text-amber-500">{FORMATTER.format(data.ivaMes)}</span></span>} 
            icon={Package} 
            colorClass="text-amber-500" 
            gradientClass="bg-amber-500" 
            badge="ACTIVOS" 
        />
    </div>
  );
};

export default KpiGrid;