import { Activity, Wallet, AlertTriangle, Package } from 'lucide-react';
import { FORMATTER } from '../../utils/formatters';

interface KpiData {
  ventasNetas: number;
  count: number;
  recaudado: number;
  porCobrar: number;
  enProduccion: number;
  ivaMes?: any;
}

interface KpiGridProps {
  data: KpiData;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue: React.ReactNode;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass: string;
  badge?: string;
}

const KpiGrid = ({ data }: KpiGridProps) => {
  const KpiCard = ({ title, value, subValue, icon: Icon, colorClass, badge }: KpiCardProps) => (
    <div className="relative pg-card group hover:shadow-pg-glow transition-all duration-300 hover:scale-[1.02] overflow-hidden">
      {/* Efecto de brillo hover */}
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-0 
                       group-hover:opacity-10 transition-opacity blur-3xl ${colorClass}`} 
      />
      
      {/* Header con ícono y badge */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} shadow-lg 
                         group-hover:scale-110 transition-transform`}>
          <Icon size={20} className="text-white" />
        </div>
        
        {badge && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${colorClass}`}>
            {badge}
          </span>
        )}
      </div>
      
      {/* Contenido */}
      <div className="relative z-10 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-pg-secondary">
          {title}
        </h3>
        
        <div className="text-3xl sm:text-4xl font-bold text-pg-text">
          {value}
        </div>
        
        <div className="text-xs text-pg-muted font-medium">
          {subValue}
        </div>
      </div>

      {/* Borde decorativo */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${colorClass} 
                       opacity-0 group-hover:opacity-100 transition-opacity`} 
      />
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
      {/* Ventas Netas */}
      <KpiCard 
        title="Ventas Netas" 
        value={FORMATTER.format(data.ventasNetas)} 
        subValue={
          <span>
            <span className="text-pg-cyan font-bold">{data.count}</span>
            {' '}ventas realizadas
          </span>
        } 
        icon={Activity} 
        colorClass="from-pg-cyan to-pg-primary" 
        badge="FACTURADO" 
      />

      {/* Recaudado */}
      <KpiCard 
        title="Recaudado (Mes)" 
        value={FORMATTER.format(data.recaudado)} 
        subValue="Efectivamente cobrado" 
        icon={Wallet} 
        colorClass="from-pg-success to-emerald-600" 
      />

      {/* Por Cobrar */}
      <KpiCard 
        title="Por Cobrar" 
        value={FORMATTER.format(data.porCobrar)} 
        subValue="Deuda pendiente total" 
        icon={AlertTriangle} 
        colorClass="from-pg-danger to-rose-600" 
      />

      {/* Producción */}
      <KpiCard 
        title="En Producción" 
        value={data.enProduccion} 
        subValue={
          <span>
            IVA Mes:{' '}
            <span className="text-pg-warning font-bold">
              {FORMATTER.format(data.ivaMes)}
            </span>
          </span>
        } 
        icon={Package} 
        colorClass="from-pg-warning to-amber-600" 
        badge="ACTIVOS" 
      />
    </div>
  );
};

export default KpiGrid;