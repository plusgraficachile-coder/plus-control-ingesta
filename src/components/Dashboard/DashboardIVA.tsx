import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function DashboardIVA() {
  const [ivaCredito, setIvaCredito] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState('');

  useEffect(() => {
    async function obtenerIVAMesActual() {
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
          .select('monto_iva')
          .gte('fecha', inicioMes)
          .lt('fecha', inicioSiguiente);

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
    <div className="pg-card group hover:shadow-pg-glow transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pg-primary to-pg-cyan 
                          flex items-center justify-center shadow-pg-glow
                          group-hover:scale-110 transition-transform">
            <span className="text-xl">💰</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-pg-text">
              IVA Crédito Fiscal
            </h3>
            <p className="text-xs text-pg-muted">
              {loading ? 'Calculando...' : mesActual}
            </p>
          </div>
        </div>
        
        <span className="px-2 py-1 bg-pg-success/20 text-pg-success text-xs 
                         font-medium rounded-full border border-pg-success/30">
          Activo
        </span>
      </div>

      {/* Monto principal */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            <div className="h-10 bg-pg-elevated rounded-lg animate-pulse" />
            <div className="h-4 bg-pg-elevated rounded w-2/3 animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pg-primary to-pg-cyan 
                               bg-clip-text text-transparent">
                ${ivaCredito.toLocaleString('es-CL')}
              </span>
              <span className="text-sm text-pg-muted">CLP</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-pg-secondary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Deducible del F29</span>
            </div>
          </>
        )}
      </div>

      {/* Footer con acción */}
      <div className="mt-4 pt-4 border-t border-pg-border">
        <button className="w-full text-sm text-pg-cyan hover:text-pg-primary 
                           font-medium transition-colors flex items-center justify-center gap-2
                           group-hover:gap-3">
          Ver detalle
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}