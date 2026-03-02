// ============================================================
// src/hooks/useAppLogic.ts
// Hook personalizado para gestionar el estado global de la app
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';
import type { Quote, Client, Material, DiscountRule } from '../types';

export const useAppLogic = () => {
  // --- ESTADOS ---
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState('materiales');
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);

  // --- DATOS ---
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);

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
      const { data: qData, error: qError } = await supabase
        .from('cotizaciones')
        .select(`*, items:cotizaciones_detalle(*)`)
        .order('fecha_creacion', { ascending: false });
      if (qError) throw qError;

      const { data: cData, error: cError } = await supabase
        .from('clientes')
        .select('*')
        .order('empresa', { ascending: true });
      if (cError) throw cError;

      const { data: mData, error: mError } = await supabase
        .from('materiales')
        .select('*')
        .order('nombre', { ascending: true });
      if (mError) throw mError;

      const { data: rData } = await supabase
        .from('reglas_descuento_volumen')
        .select('*')
        .order('cantidad_minima', { ascending: true });

      setQuotes(qData || []);
      setClients(cData || []);
      setMaterials(mData || []);
      setDiscountRules(rData || []);

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error cargando datos:', error);
      toast.error('Error de conexión: ' + msg);
    }
  }, [session]);

  useEffect(() => {
    if (session) fetchData();
  }, [session, view, fetchData]);

  return {
    session,
    loading,
    view,
    setView,
    darkMode,
    setDarkMode,
    quotes,
    clients,
    materials,
    discountRules,
    fetchData,
  };
};
