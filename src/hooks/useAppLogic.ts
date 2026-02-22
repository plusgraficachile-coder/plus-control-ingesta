// ============================================================
// src/hooks/useAppLogic.ts
// Hook personalizado para gestionar el estado global de la app
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

export const useAppLogic = () => {
  // --- ESTADOS ---
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState('materiales');
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);

  // --- DATOS ---
  const [quotes, setQuotes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [discountRules, setDiscountRules] = useState<any[]>([]);

  // --- GESTIÓN DE SESIÓN ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // --- CARGA DE DATOS ---
  const fetchData = useCallback(async () => {
    if (!session) return;

    try {
      // Cotizaciones con items
      const { data: qData, error: qError } = await supabase
        .from('cotizaciones')
        .select(`*, items:cotizaciones_detalle(*)`)
        .order('fecha_creacion', { ascending: false });
      
      if (qError) throw qError;

      // Clientes
      const { data: cData, error: cError } = await supabase
        .from('clientes')
        .select('*')
        .order('empresa', { ascending: true });
      
      if (cError) throw cError;

      // Materiales
      const { data: mData, error: mError } = await supabase
        .from('materiales')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (mError) throw mError;

      // Reglas de descuento (opcional)
      const { data: rData } = await supabase
        .from('reglas_descuento_volumen')
        .select('*')
        .order('cantidad_minima', { ascending: true });

      // Actualizar estados
      setQuotes(qData || []);
      setClients(cData || []);
      setMaterials(mData || []);
      setDiscountRules(rData || []);

    } catch (error: any) {
      console.error('Error cargando datos:', error);
      toast.error('Error de conexión: ' + error.message);
    }
  }, [session]);

  // Cargar datos cuando hay sesión
  useEffect(() => {
    if (session) fetchData();
  }, [session, view, fetchData]);

  // --- RETORNO ---
  return {
    // Estado de sesión
    session,
    loading,
    
    // Vista y tema
    view,
    setView,
    darkMode,
    setDarkMode,
    
    // Datos
    quotes,
    clients,
    materials,
    discountRules,
    
    // Acciones
    fetchData
  };
};
