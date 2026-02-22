import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

export default function TablaProveedores() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarEstadisticasMes() {
      try {
        // Determinamos el rango del mes actual (Febrero 2026)
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
        const inicioSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1).toISOString().split('T')[0];

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

          setProveedores(Object.values(resumen).sort((a: any, b: any) => b.total - a.total));
        }
      } catch (err) {
        console.error("Error en Ranking:", err);
      } finally {
        setLoading(false);
      }
    }
    cargarEstadisticasMes();
  }, []);

  if (loading) return <div className="text-slate-500 text-[10px] p-4 uppercase">Actualizando Ranking...</div>;

  return (
    <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl">
      <div className="bg-slate-800/50 p-4 border-b border-slate-700/50">
        <h3 className="text-[#00AEEF] font-bold uppercase text-[10px] tracking-[0.2em]">
          Ranking Proveedores - Febrero
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        {proveedores.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs italic">
            No hay compras registradas en febrero aún.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-500 uppercase text-[9px] font-black tracking-widest border-b border-slate-700/50">
                <th className="px-6 py-3">Proveedor</th>
                <th className="px-6 py-3 text-center">Docs</th>
                <th className="px-6 py-3 text-right">Total Mes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {proveedores.map((p, i) => (
                <tr key={i} className="hover:bg-[#00AEEF]/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-slate-300 font-bold text-xs uppercase group-hover:text-white transition-colors">
                      {p.nombre}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-[10px] font-mono">
                      {p.cantidad}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[#00AEEF] font-black text-xs">
                      ${p.total.toLocaleString('es-CL')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}