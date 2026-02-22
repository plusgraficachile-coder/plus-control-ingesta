import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '../services/supabaseClient';

// 1. DEFINIMOS LA FORMA DE LOS DATOS (Para calmar a TypeScript)
interface CatalogsState {
  clientes: any[];
  materiales: any[];
  reglas_descuento_volumen: any[];
  servicios: any[];
  factores_urgencia: any[];
}

export const useAppData = () => {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<any[]>([]);
  
  // 2. USAMOS LA INTERFAZ EN EL STATE (El Fix Clave)
  const [catalogs, setCatalogs] = useState<CatalogsState>({ 
    clientes: [], 
    materiales: [],
    reglas_descuento_volumen: [],
    servicios: [],
    factores_urgencia: []
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Cargar Cotizaciones
      const { data: qData, error: qError } = await supabase
        .from('cotizaciones')
        .select(`*, cotizaciones_detalle(*), clientes(*)`)
        .order('fecha_creacion', { ascending: false });

      if (qError) throw qError;

      const formattedQuotes = (qData || []).map((q: any) => ({
        ...q,
        items: q.cotizaciones_detalle || []
      }));

      // Cargar Catálogos
      const [
        clientesRes, 
        materialesRes, 
        reglasRes, 
        serviciosRes, 
        factoresRes
      ] = await Promise.all([
        supabase.from('clientes').select('*').order('empresa', { ascending: true }),
        supabase.from('materiales').select('*').order('nombre', { ascending: true }),
        supabase.from('reglas_descuento_volumen').select('*').order('rango_min_m2', { ascending: true }),
        supabase.from('servicios').select('*'),
        supabase.from('factores_urgencia').select('*')
      ]);

      if (clientesRes.error) console.error("Error Clientes:", clientesRes.error);
      
      setQuotes(formattedQuotes);
      
      // AHORA TYPESCRIPT NO SE QUEJARÁ AQUÍ
      setCatalogs({
        clientes: clientesRes.data || [],
        materiales: materialesRes.data || [],
        reglas_descuento_volumen: reglasRes.data || [],
        servicios: serviciosRes.data || [],
        factores_urgencia: factoresRes.data || []
      });

    } catch (error: any) {
      console.error('ERROR CRÍTICO CARGANDO DATOS:', error);
      toast.error(error.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Retornamos también las funciones de guardado (simplificado para este archivo)
  // Asegúrate de incluir handleSaveQuote, handleStatusUpdate, etc. si las usas fuera.
  // Por ahora devolvemos lo esencial para que compile QuoteEditor.
  return { 
    loading, 
    quotes, 
    catalogs, 
    refreshData: fetchData 
  };
};