// ============================================================================
// COMPONENTE: RadarDesk.tsx (El Escritorio de Validación Inteligente)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles, Send, Trash2, TrendingUp, AlertTriangle } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Clave API
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; 

interface Lead {
  id: string;
  folio: string;
  nombre_negocio: string;
  rubro: string;
  ticket_estimado: number;
  estado: string;
  score_total: number;
  gap_coherencia?: string;
}

export const RadarDesk = ({ userId }: { userId: string }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Estado del Formulario
  const [formData, setFormData] = useState({
    impacto_visual: 5,
    nivel_corp: 5,
    ticket: 0,
    observacion: ''
  });

  // --- 1. CARGA DE DATOS ---
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads_estrategicos')
      .select('*')
      .eq('estado', 'raw') 
      .order('created_at', { ascending: false });
    
    if (data) {
      setLeads(data);
      if (data.length > 0 && !selectedLead) seleccionarLead(data[0]);
    }
    setLoading(false);
  };

  const seleccionarLead = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      impacto_visual: 5,
      nivel_corp: 5,
      ticket: lead.ticket_estimado || 0,
      observacion: lead.gap_coherencia || ''
    });
  };

  // --- 2. CEREBRO: CONEXIÓN DIRECTA (BYPASS DE LIBRERÍA) ---
  const handleAiAnalysis = async () => {
    if (!selectedLead) return;
    if (!GEMINI_API_KEY) {
      alert("⚠️ Error: No se encuentra la VITE_GEMINI_API_KEY en el .env");
      return;
    }
    setAnalyzing(true);
    try {
      // 🚀 Migración a OpenAI: Bypass total de los errores 404 de Gemini
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Eres un estratega de negocios en Temuco. Analiza prospectos para Plus Gráfica.' },
            { role: 'user', content: `Analiza este prospecto: ${selectedLead.nombre_negocio} (${selectedLead.rubro}). Responde ÚNICAMENTE un JSON: {"ticket_sugerido": numero_clp, "gap_detectado": "frase_corta", "impacto_visual": 1_a_10}` }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      
      // Validación de seguridad para evitar el error de lectura '0'
      if (!data.choices || data.choices.length === 0) {
        throw new Error(data.error?.message || "OpenAI no devolvió datos válidos.");
      }

      const analysis = JSON.parse(data.choices[0].message.content);

      setFormData(prev => ({
        ...prev,
        ticket: analysis.ticket_sugerido || prev.ticket,
        observacion: analysis.gap_detectado || prev.observacion,
        impacto_visual: analysis.impacto_visual || prev.impacto_visual
      }));

    } catch (err: any) {
      console.error("Falla en motor OpenAI:", err);
      alert(`🚨 Error de validación: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  }; // Cierre exacto de la función en línea 123
  // --- 3. VALIDACIÓN FINAL ---
  const handleValidar = async () => {
    if (!selectedLead) return;
    const score = ((formData.impacto_visual + formData.nivel_corp) / 2) * 10;

    const { error } = await supabase
      .from('leads_estrategicos')
      .update({
        estado: 'validacion',
        iv: formData.impacto_visual,
        nc: formData.nivel_corp,
        score_total: score,
        ticket_estimado: formData.ticket,
        gap_coherencia: formData.observacion,
        auditado_at: new Date().toISOString()
      })
      .eq('id', selectedLead.id);

    if (!error) {
      const nuevos = leads.filter(l => l.id !== selectedLead.id);
      setLeads(nuevos);
      if (nuevos.length > 0) seleccionarLead(nuevos[0]);
      else setSelectedLead(null);
    }
  };

  // Cálculos visuales
  const margen = Math.round(formData.ticket * 0.35);
  const scoreVisual = ((formData.impacto_visual + formData.nivel_corp) / 2).toFixed(1);

  if (loading) return <div className="p-10 text-cyan-500">Cargando escritorio...</div>;

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-80 border-r border-[#2a2a2a] bg-[#111] flex flex-col">
        <div className="p-6 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-bold">Leads Raw</h2>
          <span className="text-xs text-gray-500">{leads.length} pendientes</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {leads.map(lead => (
            <div 
              key={lead.id}
              onClick={() => seleccionarLead(lead)}
              className={`p-4 mb-2 rounded-lg cursor-pointer border transition-all ${
                selectedLead?.id === lead.id ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-[#161616] border-transparent hover:bg-[#222]'
              }`}
            >
              <div className="font-bold text-sm">{lead.nombre_negocio}</div>
              <div className="text-xs text-gray-500">{lead.rubro}</div>
            </div>
          ))}
        </div>
      </div>

      {/* COCKPIT */}
      <div className="flex-1 p-8 flex flex-col bg-gradient-to-br from-[#0a0a0a] to-[#111]">
        {selectedLead ? (
          <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{selectedLead.nombre_negocio}</h1>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-cyan-400">{selectedLead.rubro}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-6xl font-black text-cyan-500">{scoreVisual}</div>
                <div className="text-xs text-gray-500 uppercase tracking-widest">Global Score</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-10">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400"><span>Impacto Visual</span><span>{formData.impacto_visual}/10</span></div>
                <input type="range" min="1" max="10" value={formData.impacto_visual} onChange={(e) => setFormData({...formData, impacto_visual: parseInt(e.target.value)})} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400"><span>Nivel Corporativo</span><span>{formData.nivel_corp}/10</span></div>
                <input type="range" min="1" max="10" value={formData.nivel_corp} onChange={(e) => setFormData({...formData, nivel_corp: parseInt(e.target.value)})} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
              </div>
            </div>

            <div className="bg-[#161616] border border-[#2a2a2a] p-6 rounded-xl mb-6 flex justify-between items-center relative overflow-hidden">
               <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-purple-500"></div>
               <div>
                 <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ticket Sugerido (CLP)</p>
                 <div className="flex items-center gap-2">
                   <span className="text-2xl text-gray-500">$</span>
                   <input type="number" value={formData.ticket} onChange={(e) => setFormData({...formData, ticket: parseInt(e.target.value)})} className="bg-transparent text-4xl font-bold text-white outline-none w-48 border-b border-gray-700 focus:border-cyan-500" />
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-xs text-gray-500 uppercase font-bold mb-1">Margen Estimado</p>
                 <p className="text-3xl font-bold text-green-500">+${new Intl.NumberFormat('es-CL').format(margen)}</p>
                 <p className="text-xs text-green-700 font-mono">35% NETO</p>
               </div>
            </div>

            <button onClick={handleAiAnalysis} disabled={analyzing} className="w-full py-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 font-bold flex items-center justify-center gap-3 hover:bg-cyan-900/40 transition-all mb-6 group">
              {analyzing ? <span className="animate-pulse">🧠 Analizando con Gemini...</span> : <><Sparkles className="w-5 h-5 group-hover:text-yellow-300 transition-colors" /> Analizar con Gemini</>}
            </button>

            <div className="mb-auto">
              <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Gap Detectado / Observación</label>
              <textarea value={formData.observacion} onChange={(e) => setFormData({...formData, observacion: e.target.value})} className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg p-4 text-gray-300 outline-none focus:border-cyan-500/50 resize-none h-24" placeholder="Escribe aquí el argumento..." />
            </div>

            <div className="flex gap-4 mt-6 pt-6 border-t border-[#2a2a2a]">
              <button className="px-6 py-3 rounded-lg bg-[#222] text-gray-400 hover:text-white flex items-center gap-2"><Trash2 className="w-4 h-4"/> Descartar</button>
              <button onClick={handleValidar} className="flex-1 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">Validar Lead <Send className="w-4 h-4"/></button>
            </div>
          </div>
        ) : <div className="flex items-center justify-center h-full text-gray-600">Selecciona un lead...</div>}
      </div>
    </div>
  );
};