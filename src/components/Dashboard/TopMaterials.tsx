import { Layers, Package, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { FORMATTER } from '../../utils/formatters';

// Paleta PG
const CHART_COLORS = [
  'rgb(124, 58, 237)',
  'rgb(59, 130, 246)',
  'rgb(16, 185, 129)',
  'rgb(245, 158, 11)',
  'rgb(239, 68, 68)',
  'rgb(139, 92, 246)',
];

interface TopMaterialsProps {
  data?: any[];
  dark?: boolean;
}

const TopMaterials = ({ data = [], dark }: TopMaterialsProps) => {
  const totalVentas = data.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="pg-card flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pg-primary to-pg-cyan 
                            flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-pg-text">Top Materiales</h3>
              <p className="text-xs text-pg-muted">Ingresos del mes</p>
            </div>
          </div>
          
          {data.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-pg-muted">Total</p>
              <p className="text-sm font-bold text-pg-text">
                {FORMATTER.format(totalVentas)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-pg-elevated flex items-center justify-center mb-4">
              <Package size={40} className="text-pg-muted" />
            </div>
            <p className="text-sm font-semibold text-pg-text mb-1">
              Sin ventas cerradas
            </p>
            <p className="text-xs text-pg-muted">
              Los datos aparecerán cuando haya ventas
            </p>
          </div>
        ) : (
          <>
            {/* Gráfico */}
            <div className="w-full aspect-square max-h-[280px] relative mb-6 self-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={data} 
                    innerRadius="60%" 
                    outerRadius="85%" 
                    paddingAngle={5} 
                    dataKey="value" 
                    cornerRadius={8}
                  >
                    {data.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                        stroke="none" 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => FORMATTER.format(Number(value))}
                    contentStyle={{
                      backgroundColor: 'rgb(var(--pg-bg-card))',
                      borderRadius: '12px',
                      border: '1px solid rgb(var(--pg-border))',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }} 
                    itemStyle={{
                      color: 'rgb(var(--pg-primary))',
                      fontWeight: 'bold'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Centro del donut */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center px-4">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp size={12} className="text-pg-success" />
                    <span className="text-xs text-pg-muted font-semibold uppercase">
                      Líder
                    </span>
                  </div>
                  <div className="text-sm font-bold text-pg-text truncate max-w-[120px]">
                    {data[0]?.name?.split(' ').slice(0, 2).join(' ') || ''}
                  </div>
                  <div className="text-xs text-pg-primary font-semibold mt-1">
                    {data[0] && totalVentas > 0 
                      ? `${((data[0].value / totalVentas) * 100).toFixed(0)}%`
                      : ''
                    }
                  </div>
                </div>
              </div>
            </div>
            
            {/* Lista */}
            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
              {data.map((item, index) => {
                const porcentaje = totalVentas > 0 ? (item.value / totalVentas) * 100 : 0;
                
                return (
                  <div 
                    key={`material-${index}`}
                    className="group pg-card p-3 hover:shadow-md transition-all hover:scale-[1.01] border-l-4"
                    style={{ borderLeftColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="text-xs font-semibold text-pg-text truncate group-hover:text-pg-primary transition-colors">
                          {item.name}
                        </span>
                      </div>
                      
                      <span className="text-xs font-bold text-pg-secondary whitespace-nowrap">
                        {porcentaje.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 h-1.5 bg-pg-elevated rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${porcentaje}%`,
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                          }}
                        />
                      </div>
                      
                      <span className="text-xs font-bold text-pg-text">
                        {FORMATTER.format(item.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Custom scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgb(var(--pg-bg-elevated));
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(var(--pg-border));
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(var(--pg-primary) / 0.5);
        }
      `}</style>
    </div>
  );
};

export default TopMaterials;