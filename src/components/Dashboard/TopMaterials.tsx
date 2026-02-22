import React from 'react';
import { Layers, Package } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { FORMATTER } from '../../utils/formatters';

const CHART_COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

const TopMaterials = ({ data = [], dark }: any) => {
  const cardBase = dark 
    ? 'bg-[#111827]/60 backdrop-blur-xl border border-white/5 shadow-xl shadow-black/10' 
    : 'bg-white border border-slate-100 shadow-sm';
  const textMain = dark ? 'text-white' : 'text-slate-800';
  const textSub = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`p-6 rounded-3xl ${cardBase} flex flex-col`}>
        <div className="mb-4">
            <h3 className={`font-bold text-lg ${textMain} flex items-center gap-2`}>
                <Layers size={18} className="text-amber-500"/> Top Materiales
            </h3>
            <p className={`text-xs ${textSub}`}>Ingresos Reales (Mes)</p>
        </div>
        
        <div className="flex-1 flex flex-col">
            {data.length > 0 ? (
                <>
                    {/* GRÁFICO RESPONSIVO (Aspect Square) */}
                    <div className="w-full aspect-square max-h-[280px] relative mb-4 self-center">
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
                                    {/* Fix: Usamos _ para indicar que no usamos la variable 'entry' */}
                                    {data.map((_entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                {/* Fix: Cambiamos (val: number) a (value: any) para que TypeScript no reclame */}
                                <Tooltip 
                                    formatter={(value: any) => FORMATTER.format(Number(value || 0))} 
                                    contentStyle={{backgroundColor: dark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.3)'}} 
                                    itemStyle={{color: '#06b6d4', fontWeight: 'bold'}} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">LÍDER</span>
                                <div className={`text-base font-black ${textMain} truncate max-w-[120px] px-2`}>
                                    {data[0]?.name.split(' ').slice(0, 2).join(' ')}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* LISTA LIMPIA */}
                    <div className="space-y-2.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                        {data.map((item:any, index:number) => (
                            <div key={index} className={`flex justify-between items-center p-3 rounded-xl transition-all group hover:scale-[1.02] ${dark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-lg" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                                    <span className={`text-xs font-medium truncate ${textSub} group-hover:text-cyan-400`}>{item.name}</span>
                                </div>
                                <span className={`font-mono font-bold text-sm ${textMain} ml-3`}>{FORMATTER.format(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 py-12">
                    <Package size={48} className="mb-3"/>
                    <p className="text-sm text-center font-medium">Sin ventas cerradas</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default TopMaterials;