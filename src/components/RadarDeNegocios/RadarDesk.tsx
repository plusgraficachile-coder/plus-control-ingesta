// ============================================================================
// COMPONENTE: RadarDesk.tsx - Escritorio IA conectado a signals de Mercado Público
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles, Send, Trash2, ArrowRight, Calendar, Building2 } from 'lucide-react';

interface Signal {
  id: string;
  external_code: string;
  nombre: string;
  monto: number;
  score: number;
  fecha_cierre: string | null;
  capturado_at: string;
  estado: string;
  iv?: number;
  nc?: number;
  gap_coherencia?: string;
  ticket_ajustado?: number;
  organizations: {
    razon_social: string;
    region: string;
  } | null;
}

export const RadarDesk = ({ userId, dark = false }: { userId: string; dark?: boolean }) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selected, setSelected]   = useState<Signal | null>(null);
  const [loading, setLoading]     = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    impacto_visual: 5,
    nivel_corp:     5,
    ticket:         0,
    observacion:    ''
  });

  // ── Tokens de diseño ──────────────────────────────────────────────────────
  const t = {
    pageBg:        dark ? 'bg-[#0f172a]'         : 'bg-[#F0F2F5]',
    sidebarBg:     dark ? 'bg-[#1e293b]'         : 'bg-white',
    sidebarBorder: dark ? 'border-slate-700'     : 'border-slate-200',
    cockpitBg:     dark ? 'bg-[#0f172a]'         : 'bg-[#F0F2F5]',
    text:          dark ? 'text-white'           : 'text-slate-800',
    textSub:       dark ? 'text-slate-400'       : 'text-slate-500',
    textMuted:     dark ? 'text-slate-500'       : 'text-slate-400',
    itemActive:    dark ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-cyan-50 border-cyan-400',
    itemInactive:  dark ? 'bg-transparent border-transparent hover:bg-slate-800' : 'bg-white border-transparent hover:border-slate-300 hover:shadow-sm',
    itemBorder:    'border',
    ticketBg:      dark ? 'bg-[#1e293b] border-slate-700'  : 'bg-white border-slate-200 shadow-sm',
    ticketInput:   dark ? 'bg-transparent text-white border-slate-600 focus:border-cyan-500' : 'bg-transparent text-slate-800 border-slate-300 focus:border-cyan-500',
    textareaBg:    dark ? 'bg-[#1e293b] border-slate-700 text-slate-200 focus:border-cyan-500' : 'bg-white border-slate-200 text-slate-700 focus:border-cyan-400',
    rangeBg:       dark ? 'bg-slate-700'         : 'bg-slate-200',
    aiBtn:         dark ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-900/50' : 'border-cyan-200 bg-cyan-50 text-cyan-600 hover:bg-cyan-100',
    discardBtn:    dark ? 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-500 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200',
    scoreColor:    'text-cyan-500',
    chipBg:        dark ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-100 text-slate-600',
  };

  // ── Carga datos desde signals + organizations ─────────────────────────────
  useEffect(() => { fetchSignals(); }, []);

  const fetchSignals = async () => {
    const { data, error } = await supabase
      .from('signals')
      .select(`
        id, external_code, nombre, monto, score,
        fecha_cierre, capturado_at, estado,
        iv, nc, gap_coherencia, ticket_ajustado,
        organizations ( razon_social, region )
      `)
      .eq('estado', 'raw')
      .order('score', { ascending: false });

    if (error) console.error('Error cargando signals:', error.message);
    if (data && data.length > 0) {
      setSignals(data as Signal[]);
      seleccionar(data[0] as Signal);
    }
    setLoading(false);
  };

  const seleccionar = (s: Signal) => {
    setSelected(s);
    setFormData({
      impacto_visual: s.iv    ?? 5,
      nivel_corp:     s.nc    ?? 5,
      ticket:         s.ticket_ajustado ?? s.monto ?? 0,
      observacion:    s.gap_coherencia  ?? ''
    });
  };

  // ── Análisis IA (Gemini) ──────────────────────────────────────────────────
  const handleAiAnalysis = async () => {
    if (!selected) return;
    const apiKey = import.meta.env.VITE_GEMINI_KEY;
    if (!apiKey) { alert('Falta VITE_GEMINI_KEY en .env'); return; }
    setAnalyzing(true);

    try {
      const org     = selected.organizations?.razon_social ?? 'Organismo público';
      const region  = selected.organizations?.region        ?? 'Araucanía';
      const monto   = selected.monto?.toLocaleString('es-CL') ?? '0';
      const cierre  = selected.fecha_cierre
        ? new Date(selected.fecha_cierre).toLocaleDateString('es-CL')
        : 'sin fecha';

      const prompt = `Analiza esta oportunidad de negocio para una empresa de impresión gráfica en Chile y responde ÚNICAMENTE con el JSON indicado, sin texto adicional ni markdown.

Datos:
- Cliente potencial: ${org} (${region})
- Descripción: ${selected.nombre}
- Presupuesto referencial: $${monto} CLP
- Fecha límite: ${cierre}
- Score algorítmico: ${selected.score}/100

Responde con este JSON exacto:
{"ticket_sugerido": 0, "gap_detectado": "texto", "impacto_visual": 5}

Donde:
- ticket_sugerido: monto entero en CLP que la empresa podría cotizar
- gap_detectado: una frase con el argumento de venta principal
- impacto_visual: número entero del 1 al 10`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 512 }
          })
        }
      );

      const data = await res.json();

      // Detectar bloqueo por safety filters u otros errores de API
      if (data.error) throw new Error(`API error ${data.error.code}: ${data.error.message}`);
      if (!data.candidates?.length) {
        const razon = data.promptFeedback?.blockReason ?? 'sin candidatos';
        throw new Error(`Gemini bloqueó la respuesta: ${razon}`);
      }

      const raw = data.candidates[0]?.content?.parts?.[0]?.text ?? '';
      const finishReason = data.candidates[0]?.finishReason ?? '';
      if (!raw || finishReason === 'SAFETY') throw new Error(`Gemini bloqueó por seguridad (${finishReason})`);

      // Extraer el bloque JSON con regex
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`Respuesta sin JSON: ${raw.substring(0, 300)}`);
      const analysis = JSON.parse(jsonMatch[0]);

      setFormData(prev => ({
        ...prev,
        ticket:         analysis.ticket_sugerido  ?? prev.ticket,
        observacion:    analysis.gap_detectado    ?? prev.observacion,
        impacto_visual: analysis.impacto_visual   ?? prev.impacto_visual,
      }));
    } catch (err: any) {
      alert(`Error IA: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Validar y pasar a siguiente etapa ────────────────────────────────────
  const handleValidar = async () => {
    if (!selected) return;
    const score_ajustado = Math.round(
      ((formData.impacto_visual + formData.nivel_corp) / 2) * 10
    );

    const { error } = await supabase
      .from('signals')
      .update({
        estado:          'validacion',
        iv:              formData.impacto_visual,
        nc:              formData.nivel_corp,
        score:           score_ajustado,
        ticket_ajustado: formData.ticket,
        gap_coherencia:  formData.observacion,
        auditado_at:     new Date().toISOString(),
      })
      .eq('id', selected.id);

    if (!error) {
      const resto = signals.filter(s => s.id !== selected.id);
      setSignals(resto);
      if (resto.length > 0) seleccionar(resto[0]);
      else setSelected(null);
    } else {
      alert(`Error al validar: ${error.message}`);
    }
  };

  // ── Descartar ────────────────────────────────────────────────────────────
  const handleDescartar = async () => {
    if (!selected) return;
    if (!confirm('¿Descartar este lead? No aparecerá más en el escritorio.')) return;

    const { error } = await supabase
      .from('signals')
      .update({ estado: 'descartado' })
      .eq('id', selected.id);

    if (!error) {
      const resto = signals.filter(s => s.id !== selected.id);
      setSignals(resto);
      if (resto.length > 0) seleccionar(resto[0]);
      else setSelected(null);
    }
  };

  // ── Helpers UI ────────────────────────────────────────────────────────────
  const margen      = Math.round(formData.ticket * 0.35);
  const scoreVisual = ((formData.impacto_visual + formData.nivel_corp) / 2).toFixed(1);

  const diasAlCierre = selected?.fecha_cierre
    ? Math.ceil((new Date(selected.fecha_cierre).getTime() - Date.now()) / 86400000)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={`flex items-center justify-center h-screen ${t.pageBg} ${t.textSub}`}>
      Cargando leads de Mercado Público...
    </div>
  );

  return (
    <div className={`flex h-screen font-sans overflow-hidden ${t.pageBg} animate-fade-in`}>

      {/* ── SIDEBAR ── */}
      <div className={`w-80 border-r flex flex-col z-10 shadow-xl shadow-black/5 ${t.sidebarBg} ${t.sidebarBorder}`}>
        <div className={`p-6 border-b ${t.sidebarBorder}`}>
          <h2 className={`text-lg font-bold ${t.text}`}>Escritorio de Auditoría</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500" />
            <span className={`text-xs ${t.textSub}`}>{signals.length} leads de Mercado Público</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {signals.map(s => (
            <div
              key={s.id}
              onClick={() => seleccionar(s)}
              className={`p-4 rounded-xl cursor-pointer transition-all relative group ${t.itemBorder} ${
                selected?.id === s.id ? t.itemActive : t.itemInactive
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className={`font-bold text-sm ${t.text} truncate pr-2`}>
                  {s.organizations?.razon_social ?? s.nombre}
                </div>
                {selected?.id === s.id && <ArrowRight size={14} className="text-cyan-500 shrink-0" />}
              </div>
              <div className={`text-xs ${t.textMuted} truncate`}>{s.nombre}</div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[10px] font-bold ${t.textSub}`}>
                  ${s.monto?.toLocaleString('es-CL')}
                </span>
                <span className={`text-[10px] font-black text-cyan-500`}>
                  {s.score}pts
                </span>
              </div>
            </div>
          ))}

          {signals.length === 0 && (
            <div className={`text-center py-10 px-4 ${t.textMuted} text-sm`}>
              <p className="font-medium mb-1">Sin leads por auditar</p>
              <p className="text-xs opacity-70">El ETL corre diariamente y captura nuevas licitaciones de Araucanía</p>
            </div>
          )}
        </div>
      </div>

      {/* ── COCKPIT ── */}
      <div className={`flex-1 flex flex-col overflow-y-auto ${t.cockpitBg}`}>
        {selected ? (
          <div className="max-w-4xl mx-auto w-full p-8 md:p-12 flex flex-col gap-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ${t.textMuted}`}>
                  Licitación Mercado Público · {selected.external_code}
                </span>
                <h1 className={`text-3xl font-black mb-3 ${t.text} leading-tight`}>
                  {selected.organizations?.razon_social ?? 'Organismo Público'}
                </h1>
                <p className={`text-sm mb-3 ${t.textSub} line-clamp-2`}>{selected.nombre}</p>

                {/* Chips de info */}
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ${t.chipBg}`}>
                    <Building2 size={11} />
                    {selected.organizations?.region ?? 'Araucanía'}
                  </span>
                  {diasAlCierre !== null && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ${
                      diasAlCierre <= 3 ? 'bg-red-500/10 text-red-500' :
                      diasAlCierre <= 7 ? 'bg-amber-500/10 text-amber-500' :
                      t.chipBg
                    }`}>
                      <Calendar size={11} />
                      {diasAlCierre > 0 ? `Cierra en ${diasAlCierre}d` : 'Cerrada'}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ${t.chipBg}`}>
                    ETL score: {selected.score}/100
                  </span>
                </div>
              </div>

              {/* Score Widget */}
              <div className={`text-right p-4 rounded-2xl border shrink-0 ${dark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`text-5xl font-black ${t.scoreColor}`}>{scoreVisual}</div>
                <div className={`text-[10px] uppercase tracking-widest mt-1 font-bold ${t.textMuted}`}>Score Auditor</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Columna Izquierda: Sliders + Ticket */}
              <div className="space-y-8">
                <div className={`p-6 rounded-2xl border ${t.ticketBg} space-y-6`}>
                  {[
                    { label: 'Impacto Visual Potencial', key: 'impacto_visual' as const, color: 'accent-cyan-500' },
                    { label: 'Nivel Corporativo',        key: 'nivel_corp'     as const, color: 'accent-purple-500' },
                  ].map(({ label, key, color }) => (
                    <div key={key} className="space-y-3">
                      <div className={`flex justify-between text-sm ${t.textSub}`}>
                        <span>{label}</span>
                        <span className={`font-bold ${t.text}`}>{formData[key]}/10</span>
                      </div>
                      <input
                        type="range" min="1" max="10"
                        value={formData[key]}
                        onChange={e => setFormData({ ...formData, [key]: parseInt(e.target.value) })}
                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${color} ${t.rangeBg}`}
                      />
                    </div>
                  ))}
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
                          onChange={e => setFormData({ ...formData, ticket: parseInt(e.target.value) || 0 })}
                          className={`text-2xl font-black outline-none w-36 bg-transparent ${t.ticketInput}`}
                        />
                      </div>
                      <p className={`text-[10px] mt-1 ${t.textMuted}`}>
                        MP: ${selected.monto?.toLocaleString('es-CL')}
                      </p>
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
                      ? <span className="animate-pulse">Consultando Gemini...</span>
                      : <><Sparkles className="w-4 h-4 group-hover:text-yellow-400 transition-colors" /> Analizar con Gemini</>
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
                  onChange={e => setFormData({ ...formData, observacion: e.target.value })}
                  className={`flex-1 min-h-[200px] w-full border rounded-2xl p-6 outline-none resize-none transition-colors text-sm leading-relaxed ${t.textareaBg}`}
                  placeholder="Ej: Organismo con presupuesto activo para eventos corporativos. Necesitan gráfica de alta calidad para la fecha..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className={`flex gap-4 pt-6 border-t ${t.sidebarBorder} mt-auto`}>
              <button
                className={`px-6 py-4 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors ${t.discardBtn}`}
                onClick={handleDescartar}
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
          <div className={`flex flex-col items-center justify-center h-full gap-3 ${t.textMuted}`}>
            <div className={`p-4 rounded-full ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Sparkles className="w-8 h-8 text-cyan-500 opacity-50" />
            </div>
            <p className="font-medium">Selecciona un lead para auditar</p>
            <p className={`text-xs ${t.textMuted} opacity-60`}>Los leads llegan automáticamente desde Mercado Público</p>
          </div>
        )}
      </div>
    </div>
  );
};
