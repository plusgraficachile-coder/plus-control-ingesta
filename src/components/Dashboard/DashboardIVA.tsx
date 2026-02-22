import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Conexión a Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function DashboardIVA() {
  const [ivaCredito, setIvaCredito] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function obtenerIVAMesActual() {
      try {
        // Determinamos el rango del mes actual dinámicamente
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
        const inicioSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1).toISOString().split('T')[0];

        // Consultamos con filtro de rango para evitar el "ruido" de meses pasados
        const { data, error } = await supabase
          .from('compras_sii')
          .select('monto_iva')
          .gte('fecha', inicioMes)     // Mayor o igual al primer día de este mes
          .lt('fecha', inicioSiguiente); // Menor al primer día del mes siguiente

        if (error) throw error;

        const total = data?.reduce((acc, item) => acc + (item.monto_iva || 0), 0) || 0;
        setIvaCredito(total);
      } catch (error) {
        console.error("Error cargando IVA:", error);
      } finally {
        setLoading(false);
      }
    }

    obtenerIVAMesActual();
  }, []);

  return (
    <div className="bg-[#1e293b] p-6 rounded-xl shadow-lg border-l-4 border-[#00AEEF]">
      <div className="flex justify-between items-center">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">
          IVA Crédito (Mes Actual)
        </h3>
        <span className="p-2 bg-[#00AEEF]/10 text-[#00AEEF] rounded-full">
          💰
        </span>
      </div>
      
      <div className="mt-4">
        {loading ? (
          <p className="text-slate-500 text-xs animate-pulse">Calculando periodo...</p>
        ) : (
          <p className="text-3xl font-black text-white">
            ${ivaCredito.toLocaleString('es-CL')}
          </p>
        )}
        <p className="text-[10px] text-slate-500 uppercase mt-2 font-medium">
          Deducible del F29 - Febrero 2026
        </p>
      </div>
    </div>
  );
}