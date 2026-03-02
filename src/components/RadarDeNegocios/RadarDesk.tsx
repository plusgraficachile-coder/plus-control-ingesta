// ============================================================================
// COMPONENTE: RadarDesk.tsx - ESTILO BCI (CLARO) + NAVY (OSCURO)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles, Send, Trash2, ArrowRight } from 'lucide-react';

interface Lead {
  id: string;
  folio: string;
  nombre_negocio: string;
  rubro: string;
  ticket_estimado: number;
  estado: string;
  score_total: number;
  gap_coherencia?: string;
  created_at: string;
}

export const RadarDesk = ({ userId, dark = false }: { userId: string; dark?: boolean }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    impacto_visual: 5,
    nivel_corp: 5,
    ticket: 0,
    observacion: ''
  });

  // ============================================================================
  // 🎨 TOKENS DE DISEÑO (Sincronizados con Dashboard y Radar)
  // ============================================================================
  const t = {
    // Estructura Base
    pageBg:       dark ? 'bg-[#0f172a]'          : 'bg-[#F0F2F5]', // Navy vs Gray-50
    sidebarBg:    dark ? 'bg-[#1e293b]'          : 'bg-white',     // Slate-800 vs White
    sidebarBorder: dark ? 'border-slate-700'      : 'border-slate-200',
    cockpitBg:    dark ? 'bg-[#0f172a]'          : 'bg-[#F0F2F5]',

    // Tipografía
    text:         dark ? 'text-white'            : 'text-slate-800',
    textSub:      dark ? 'text-slate-400'        : 'text-slate-500',
    textMuted:    dark ? 'text-slate-500'        : 'text-slate-400',

    // Lista Lateral (Items)
    itemActive:   dark ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-cyan-50 border-cyan-400',
    itemInactive: dark ? 'bg-transparent border-transparent hover:bg-slate-800' : 'bg-white border-transparent hover:border-slate-300 hover:shadow-sm',
    itemBorder:   'border',

    // Ticket Box (Caja Principal)
    ticketBg:     dark ? 'bg-[#1e293b] border-slate-700'  : 'bg-white border-slate-200 shadow-sm',
    ticketInput:  dark ? 'bg-transparent text-white border-slate-600 focus:border-cyan-500' : 'bg-transparent text-slate-800 border-slate-300 focus:border-cyan-500',

    // Inputs & Controles
    textareaBg:   dark ? 'bg-[#1e293b] border-slate-700 text-slate-200 focus:border-cyan-500' : 'bg-white border-slate-200 text-slate-700 focus:border-cyan-400',
    rangeBg:      dark ? 'bg-slate-700'          : 'bg-slate-200',

    // Botones Especiales
    aiBtn:        dark ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-900/50' : 'border-cyan-200 bg-cyan-50 text-cyan-600 hover:bg-cyan-100',
    discardBtn:   dark ? 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-500 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200',
    
    // Acentos
    scoreColor:   'text-cyan-500',
  };

  // ============================================================================
  // LÓGICA
  // ============================================================================

  useEffect(() => { fetchLeads(); }, []);

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

  const handleAiAnalysis = async () => {
    if (!selectedLead) return;
    setAnalyzing(true);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Eres un estratega de negocios en Temuco. Analiza prospectos para Plus Grafica. Se breve y directo.' },
            { role: 'user', content: `Analiza: ${selectedLead.nombre_negocio} (${selectedLead.rubro}). Responde SOLO JSON: {"ticket_sugerido": numero_clp, "gap_detectado": "frase_persuasiva_corta", "impacto_visual": 1_a_10}` }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      if (!data.choices?.length) throw new Error("Sin respuesta AI");
      const analysis = JSON.parse(data.choices[0].message.content);

      setFormData(prev => ({
        ...prev,
        ticket: analysis.ticket_sugerido || prev.ticket,
        observacion: analysis.gap_detectado || prev.observacion,
        impacto_visual: analysis.impacto_visual || prev.impacto_visual
      }));
    } catch (err: any) {
      alert(`Error AI: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

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

  const margen = Math.round(formData.ticket * 0.35);
  const scoreVisual = ((formData.impacto_visual + formData.nivel_corp) / 2).toFixed(1);

  // ============================================================================
  // RENDER UI
  // ============================================================================

  if (loading) return (
    <div className={`flex items-center justify-center h-screen ${t.pageBg} ${t.textSub}`}>
      Cargando Leads...
    </div>
  );

  return (
    <div className={`flex h-screen font-sans overflow-hidden ${t.pageBg} animate-fade-in`}>

      {/* ── SIDEBAR (Lista de Leads) ── */}
      <div className={`w-80 border-r flex flex-col z-10 shadow-xl shadow-black/5 ${t.sidebarBg} ${t.sidebarBorder}`}>
        <div className={`p-6 border-b ${t.sidebarBorder}`}>
          <h2 className={`text-lg font-bold ${t.text}`}>Escritorio de Auditoría</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`flex h-2 w-2 rounded-full bg-cyan-500`}></span>
            <span className={`text-xs ${t.textSub}`}>{leads.length} prospectos RAW</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {leads.map(lead => (
            <div
              key={lead.id}
              onClick={() => seleccionarLead(lead)}
              className={`p-4 rounded-xl cursor-pointer transition-all relative group ${t.itemBorder} ${
                selectedLead?.id === lead.id ? t.itemActive : t.itemInactive
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className={`font-bold text-sm ${t.text} truncate pr-2`}>{lead.nombre_negocio}</div>
                {selectedLead?.id === lead.id && <ArrowRight size={14} className="text-cyan-500" />}
              </div>
              <div className={`text-xs ${t.textMuted}`}>{lead.rubro}</div>
              <div className={`text-[10px] ${t.textSub} mt-2 opacity-60`}>
                {new Date(lead.created_at).toLocaleDateString('es-CL')}
              </div>
            </div>
          ))}
          {leads.length === 0 && (
             <div className={`text-center py-10 px-4 ${t.textMuted} text-sm`}>
                No hay leads nuevos por auditar.
             </div>
          )}
        </div>
      </div>

      {/* ── COCKPIT (Zona de Trabajo) ── */}
      <div className={`flex-1 flex flex-col overflow-y-auto ${t.cockpitBg}`}>
        {selectedLead ? (
          <div className="max-w-4xl mx-auto w-full p-8 md:p-12 flex flex-col gap-8">

            {/* Header del Lead */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ${t.textMuted}`}>Analizando Prospecto</span>
                <h1 className={`text-4xl font-black mb-3 ${t.text} leading-tight`}>{selectedLead.nombre_negocio}</h1>
                <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border bg-opacity-50 ${
                  dark ? 'bg-slate-800 text-cyan-400 border-slate-700' : 'bg-white text-cyan-700 border-slate-200'
                }`}>
                  {selectedLead.rubro.toUpperCase()}
                </span>
              </div>
              
              {/* Score Widget */}
              <div className={`text-right p-4 rounded-2xl border ${dark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`text-5xl font-black ${t.scoreColor}`}>{scoreVisual}</div>
                <div className={`text-[10px] uppercase tracking-widest mt-1 font-bold ${t.textMuted}`}>Score Potencial</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Columna Izquierda: Inputs Manuales */}
                <div className="space-y-8">
                    {/* Sliders */}
                    <div className={`p-6 rounded-2xl border ${t.ticketBg} space-y-6`}>
                        <div className="space-y-3">
                            <div className={`flex justify-between text-sm ${t.textSub}`}>
                                <span>Impacto Visual Actual</span>
                                <span className={`font-bold ${t.text}`}>{formData.impacto_visual}/10</span>
                            </div>
                            <input
                                type="range" min="1" max="10"
                                value={formData.impacto_visual}
                                onChange={e => setFormData({...formData, impacto_visual: parseInt(e.target.value)})}
                                className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${t.rangeBg}`}
                            />
                        </div>
                        <div className="space-y-3">
                            <div className={`flex justify-between text-sm ${t.textSub}`}>
                                <span>Nivel Corporativo</span>
                                <span className={`font-bold ${t.text}`}>{formData.nivel_corp}/10</span>
                            </div>
                            <input
                                type="range" min="1" max="10"
                                value={formData.nivel_corp}
                                onChange={e => setFormData({...formData, nivel_corp: parseInt(e.target.value)})}
                                className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-500 ${t.rangeBg}`}
                            />
                        </div>
                    </div>

                    {/* Ticket Box */}
                    <div className={`p-6 rounded-2xl border flex flex-col gap-4 relative overflow-hidden ${t.ticketBg}`}>
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-400 to-purple-500" />
                        
                        <div className="flex justify-between items-end border-b border-dashed pb-4 border-slate-300 dark:border-slate-700">
                            <div>
                                <p className={`text-[10px] uppercase font-bold mb-1 ${t.textMuted}`}>Ticket Estimado</p>
                                <div className="flex items-center gap-1">
                                    <span className={`text-lg font-light ${t.textSub}`}>$</span>
                                    <input
                                        type="number"
                                        value={formData.ticket}
                                        onChange={e => setFormData({...formData, ticket: parseInt(e.target.value)})}
                                        className={`text-2xl font-black outline-none w-32 bg-transparent ${t.ticketInput}`}
                                    />
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-emerald-500 font-bold mb-1">Margen (35%)</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                    +${new Intl.NumberFormat('es-CL').format(margen)}
                                </p>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleAiAnalysis}
                            disabled={analyzing}
                            className={`w-full py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all group ${t.aiBtn}`}
                        >
                            {analyzing
                                ? <span className="animate-pulse">Consultando a Gemini...</span>
                                : <><Sparkles className="w-4 h-4 group-hover:text-yellow-400 transition-colors" /> Estimar con IA</>
                            }
                        </button>
                    </div>
                </div>

                {/* Columna Derecha: Observación */}
                <div className="flex flex-col h-full">
                     <label className={`text-[10px] uppercase font-bold mb-3 block ${t.textMuted}`}>
                        Gap de Coherencia / Argumento de Venta
                    </label>
                    <textarea
                        value={formData.observacion}
                        onChange={e => setFormData({...formData, observacion: e.target.value})}
                        className={`flex-1 w-full border rounded-2xl p-6 outline-none resize-none transition-colors text-sm leading-relaxed ${t.textareaBg}`}
                        placeholder="Ej: Su fachada está deteriorada pero tienen camionetas nuevas del año. Hay incoherencia visual..."
                    />
                </div>
            </div>

            {/* Footer de Acción */}
            <div className={`flex gap-4 pt-6 border-t ${t.sidebarBorder} mt-auto`}>
              <button 
                className={`px-6 py-4 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors ${t.discardBtn}`}
                onClick={() => {
                   if(confirm("¿Descartar lead?")) {
                       // Lógica simple de descarte visual (o conectar a DB si quisieras)
                       const nuevos = leads.filter(l => l.id !== selectedLead.id);
                       setLeads(nuevos);
                       setSelectedLead(nuevos[0] || null);
                   }
                }}
              >
                <Trash2 className="w-4 h-4" /> Descartar
              </button>
              
              <button
                onClick={handleValidar}
                className="flex-1 px-6 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-black flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all"
              >
                APROBAR Y PASAR A VALIDACIÓN <Send className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center h-full ${t.textMuted}`}>
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-cyan-500 opacity-50" />
            </div>
            <p className="font-medium">Selecciona un prospecto para auditar</p>
          </div>
        )}
      </div>
    </div>
  );
};