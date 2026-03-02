import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { TrendingUp, Package, DollarSign } from 'lucide-react';

interface Proveedor {
  nombre: string;
  total: number;
  cantidad: number;
}

export default function TablaProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState('');

  useEffect(() => {
    async function cargarEstadisticasMes() {
      try {
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
          .toISOString().split('T')[0];
        const inicioSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1)
          .toISOString().split('T')[0];

        // Formatear nombre del mes
        const nombreMes = ahora.toLocaleDateString('es-CL', { 
          month: 'long', 
          year: 'numeric' 
        });
        setMesActual(nombreMes);

        const { data, error } = await supabase
          .from('compras_sii')
          .select('razon_social_emisor, monto_total')
          .gte('fecha', inicioMes)
          .lt('fecha', inicioSiguiente);

        if (!error && data) {
          const resumen = data.reduce((acc: any, curr: any) => {
            const nombre = curr.razon_social_emisor || 'Desconocido';
            if (!acc[nombre]) acc[nombre] = { nombre, total: 0, cantidad: 0 };
            acc[nombre].total += Number(curr.monto_total) || 0;
            acc[nombre].cantidad += 1;
            return acc;
          }, {});

          const ranking = Object.values(resumen).sort((a: any, b: any) => b.total - a.total);
          setProveedores(ranking as Proveedor[]);
        }
      } catch (err) {
        console.error("Error en Ranking:", err);
      } finally {
        setLoading(false);
      }
    }
    
    cargarEstadisticasMes();
  }, []);

  // Calcular total general
  const totalGeneral = proveedores.reduce((sum, p) => sum + p.total, 0);
  const docsTotal = proveedores.reduce((sum, p) => sum + p.cantidad, 0);

  if (loading) {
    return (
      <div className="pg-card">
        <div className="space-y-3">
          <div className="h-6 bg-pg-elevated rounded animate-pulse" />
          <div className="h-4 bg-pg-elevated rounded w-2/3 animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-pg-elevated rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pg-card overflow-hidden p-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-pg-border bg-gradient-to-r from-pg-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pg-primary to-pg-cyan 
                            flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-pg-text">
                Ranking Proveedores
              </h3>
              <p className="text-xs text-pg-muted capitalize">
                {mesActual}
              </p>
            </div>
          </div>
          
          {/* Stats rápidas */}
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <div className="text-right">
              <p className="text-pg-muted">Proveedores</p>
              <p className="font-bold text-pg-text">{proveedores.length}</p>
            </div>
            <div className="text-right">
              <p className="text-pg-muted">Documentos</p>
              <p className="font-bold text-pg-text">{docsTotal}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      {proveedores.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-pg-elevated flex items-center justify-center mb-3">
            <Package size={32} className="text-pg-muted" />
          </div>
          <p className="text-sm font-semibold text-pg-text mb-1">
            Sin compras registradas
          </p>
          <p className="text-xs text-pg-muted">
            No hay movimientos en {mesActual}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pg-border bg-pg-elevated">
                  <th className="px-6 py-3 text-left">
                    <span className="text-xs font-bold text-pg-secondary uppercase tracking-wide">
                      Proveedor
                    </span>
                  </th>
                  <th className="px-6 py-3 text-center">
                    <span className="text-xs font-bold text-pg-secondary uppercase tracking-wide">
                      Docs
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <span className="text-xs font-bold text-pg-secondary uppercase tracking-wide">
                      Total Mes
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <span className="text-xs font-bold text-pg-secondary uppercase tracking-wide">
                      % Total
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pg-border">
                {proveedores.map((p, i) => {
                  const porcentaje = totalGeneral > 0 ? (p.total / totalGeneral) * 100 : 0;
                  
                  return (
                    <tr 
                      key={i} 
                      className="group hover:bg-pg-elevated transition-colors"
                    >
                      {/* Proveedor */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Ranking badge */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                                          ${i === 0 
                                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg' 
                                            : i === 1
                                            ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white'
                                            : i === 2
                                            ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                                            : 'bg-pg-elevated text-pg-muted'
                                          }`}>
                            {i + 1}
                          </div>
                          
                          <span className="font-semibold text-sm text-pg-text group-hover:text-pg-primary transition-colors">
                            {p.nombre}
                          </span>
                        </div>
                      </td>
                      
                      {/* Cantidad docs */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full 
                                       bg-pg-cyan/10 text-pg-cyan text-xs font-bold">
                          <Package size={12} />
                          {p.cantidad}
                        </span>
                      </td>
                      
                      {/* Total */}
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-sm text-pg-text">
                          ${p.total.toLocaleString('es-CL')}
                        </span>
                      </td>
                      
                      {/* Porcentaje */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-pg-elevated rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-pg-primary to-pg-cyan transition-all"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-pg-secondary w-12 text-right">
                            {porcentaje.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards - Mobile */}
          <div className="md:hidden divide-y divide-pg-border">
            {proveedores.slice(0, 10).map((p, i) => {
              const porcentaje = totalGeneral > 0 ? (p.total / totalGeneral) * 100 : 0;
              
              return (
                <div key={i} className="p-4 hover:bg-pg-elevated transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold
                                      ${i < 3 ? 'bg-gradient-to-br from-pg-primary to-pg-cyan text-white' : 'bg-pg-elevated text-pg-muted'}`}>
                        {i + 1}
                      </span>
                      <span className="font-semibold text-sm text-pg-text">
                        {p.nombre}
                      </span>
                    </div>
                    
                    <span className="px-2 py-1 rounded-md bg-pg-cyan/10 text-pg-cyan text-xs font-bold">
                      {p.cantidad} docs
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-pg-text">
                      ${p.total.toLocaleString('es-CL')}
                    </span>
                    <span className="text-xs text-pg-secondary">
                      {porcentaje.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer con total */}
          <div className="px-6 py-4 border-t border-pg-border bg-pg-elevated">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-pg-secondary">
                <DollarSign size={16} />
                <span className="font-medium">Total General:</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-pg-primary to-pg-cyan bg-clip-text text-transparent">
                ${totalGeneral.toLocaleString('es-CL')}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}