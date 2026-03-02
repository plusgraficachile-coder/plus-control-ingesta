// ============================================================================
// COMPONENTE: RadarDeNegocios.tsx - VERSIÓN CON MODO CLARO ESTILO BCI
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase'; 
import { WizardAuditoriaTactica } from './WizardAuditoriaTactica';

// ============================================================================
// TIPOS
// ============================================================================

interface Lead {
  id: string;
  folio: string;
  nombre_negocio: string;
  rubro: string;
  ciudad: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  url_website?: string;
  url_google_maps?: string;
  iv?: number;
  nc?: number;
  score_total?: number;
  capacidad_pago?: 'ALTA' | 'MEDIA' | 'BAJA' | 'DESCONOCIDA';
  urgencia_nivel: number;
  estado: 'raw' | 'validacion' | 'calificado' | 'cotizacion' | 'cerrado' | 'descartado';
  ticket_estimado?: number;
  gap_coherencia?: string;
  argumento_venta?: string;
  puntos_dolor?: any;
  created_at: string;
  auditado_at?: string;
  contactado_at?: string;
}

interface RadarDeNegociosProps {
  supabaseUrl: string;
  supabaseKey: string;
  userId: string;
  dark?: boolean; // ← ahora acepta dark
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const RadarDeNegocios: React.FC<RadarDeNegociosProps> = ({ userId, dark = false }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadParaAuditar, setLeadParaAuditar] = useState<Lead | null>(null);

  // ============================================================================
  // TOKENS DE COLOR — estilo BCI en claro, oscuro igual que antes
  // ============================================================================
  const t = {
    pageBg:    dark ? 'bg-[#0f172a]'                    : 'bg-[#F0F2F5]',
    cardBg:    dark ? 'bg-[#1e293b] border-white/5'     : 'bg-white border-transparent shadow-sm',
    colBg:     dark ? 'bg-[#0f172a]/80'                 : 'bg-[#E8EAED]',
    text:      dark ? 'text-white'                      : 'text-slate-800',
    textSub:   dark ? 'text-slate-400'                  : 'text-slate-500',
    textMuted: dark ? 'text-slate-500'                  : 'text-slate-400',
    border:    dark ? 'border-white/5'                  : 'border-slate-200',
    hover:     dark ? 'hover:border-cyan-500/50'        : 'hover:shadow-md hover:border-cyan-400',
    statBg:    dark ? 'bg-[#1e293b] border-white/5'     : 'bg-white border-transparent shadow-sm',
    panelBg:   dark ? 'bg-[#1e293b] border-white/10'    : 'bg-white border-slate-200',
    inputBg:   dark ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200',
    gapText:   dark ? 'text-cyan-400'                   : 'text-cyan-600',
    argBg:     dark ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-green-50 border-green-200',
    argText:   dark ? 'text-emerald-400'                : 'text-green-600',
  };

  // ============================================================================
  // FETCH
  // ============================================================================

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads_estrategicos')
        .select('*')
        .order('score_total', { ascending: false, nullsFirst: false });

      if (error) {
        const { data: allData, error: allError } = await supabase
          .from('leads_estrategicos')
          .select('*')
          .order('urgencia_nivel', { ascending: false });
        if (!allError) setLeads(allData || []);
      } else {
        setLeads(data || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ============================================================================
  // MOVER LEAD
  // ============================================================================

  const moverLeadEtapa = async (leadId: string, nuevaEtapa: Lead['estado']) => {
    try {
      const { error } = await supabase
        .from('leads_estrategicos')
        .update({ estado: nuevaEtapa, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) {
        console.error('Error moviendo lead:', error);
      } else {
        await fetchLeads();
      }
    } catch (error) {
      console.error('Error moviendo lead:', error);
    }
  };

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  const formatearMoneda = (monto?: number) => {
    if (!monto) return '-';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(monto);
  };

  const getColorPorScore = (score?: number) => {
    if (!score) return '#94A3B8';
    if (score >= 80) return '#EF4444';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#10B981';
    return '#6B7280';
  };

  const getUrgenciaEmoji = (nivel: number) => {
    return ['❄️', '🌡️', '🔥', '🔥🔥', '🔥🔥🔥'][nivel - 1] || '🌡️';
  };

  // ============================================================================
  // DATOS
  // ============================================================================

  const leadsPorEtapa = {
    raw:        leads.filter(l => l.estado === 'raw'),
    validacion: leads.filter(l => l.estado === 'validacion'),
    calificado: leads.filter(l => l.estado === 'calificado'),
    cotizacion: leads.filter(l => l.estado === 'cotizacion'),
  };

  const stats = {
    raw:        leadsPorEtapa.raw.length,
    validacion: leadsPorEtapa.validacion.length,
    calificado: leadsPorEtapa.calificado.length,
    cotizacion: leadsPorEtapa.cotizacion.length,
  };

  // ============================================================================
  // TARJETA DE LEAD
  // ============================================================================

  const LeadCard: React.FC<{ lead: Lead }> = ({ lead }) => {
    const scoreColor = getColorPorScore(lead.score_total);

    return (
      <div
        className={`rounded-xl p-4 mb-3 cursor-pointer border transition-all ${t.cardBg} ${t.hover}`}
        onClick={() => setSelectedLead(lead)}
        draggable
        onDragStart={e => e.dataTransfer.setData('leadId', lead.id)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: scoreColor }} />
            <span className={`text-[10px] font-mono font-bold ${t.textMuted}`}>{lead.folio}</span>
          </div>
          {lead.score_total !== undefined && (
            <div className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: scoreColor }}>
              {lead.score_total}
            </div>
          )}
        </div>

        {/* Nombre */}
        <h3 className={`font-bold text-sm mb-1 truncate ${t.text}`}>
          {lead.nombre_negocio}
        </h3>

        {/* Rubro */}
        <p className={`text-xs mb-3 ${t.textSub}`}>{lead.rubro}</p>

        {/* Indicadores */}
        <div className="flex items-center gap-2 flex-wrap">
          {lead.ticket_estimado && (
            <span className="text-emerald-500 text-xs font-bold">
              {formatearMoneda(lead.ticket_estimado)}
            </span>
          )}
          <span className="text-xs">{getUrgenciaEmoji(lead.urgencia_nivel)}</span>
          {lead.capacidad_pago && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              lead.capacidad_pago === 'ALTA'
                ? dark ? 'bg-green-900 text-green-300 border-green-700' : 'bg-green-50 text-green-700 border-green-200'
                : lead.capacidad_pago === 'MEDIA'
                ? dark ? 'bg-yellow-900 text-yellow-300 border-yellow-700' : 'bg-amber-50 text-amber-700 border-amber-200'
                : dark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {lead.capacidad_pago}
            </span>
          )}
        </div>

        {/* Gap */}
        {lead.gap_coherencia && (
          <p className={`text-xs mt-2 line-clamp-2 ${t.gapText}`}>
            💡 {lead.gap_coherencia}
          </p>
        )}
      </div>
    );
  };

  // ============================================================================
  // COLUMNA KANBAN
  // ============================================================================

  const KanbanColumn: React.FC<{
    titulo: string;
    etapa: Lead['estado'];
    leads: Lead[];
    color: string;
  }> = ({ titulo, etapa, leads, color }) => (
    <div
      className={`rounded-2xl p-4 min-h-[600px] ${t.colBg}`}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (leadId) moverLeadEtapa(leadId, etapa);
      }}
    >
      {/* Header columna */}
      <div className="flex items-center justify-between mb-4">
        <h2 className={`font-black text-xs uppercase tracking-wider flex items-center gap-2 ${t.text}`}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          {titulo}
        </h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div>
        {leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
      </div>

      {/* Empty */}
      {leads.length === 0 && (
        <div className={`text-center mt-8 ${t.textMuted}`}>
          <p className="text-sm font-medium">Sin leads</p>
          <p className="text-xs mt-1">Arrastra aqui para mover</p>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // LOADING
  // ============================================================================

  if (loading) return (
    <div className={`flex items-center justify-center h-screen ${t.pageBg}`}>
      <div className={`text-lg font-bold ${t.text}`}>Cargando Radar de Negocios...</div>
    </div>
  );

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className={`min-h-screen ${t.pageBg} p-6`}>
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className={`text-3xl font-black tracking-tight mb-1 ${t.text}`}>
              🎯 Radar de Negocios
            </h1>
            <p className={`text-sm ${t.textSub}`}>
              Curaduria estrategica de oportunidades en {leads[0]?.ciudad || 'tu ciudad'}
            </p>
          </div>
          <button
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
            onClick={() => alert('Formulario de nuevo prospecto - proximamente')}
          >
            + NUEVO PROSPECTO
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'LEADS RAW',    value: stats.raw,        color: t.text },
            { label: 'EN VALIDACION', value: stats.validacion, color: 'text-cyan-500' },
            { label: 'CALIFICADOS',  value: stats.calificado, color: 'text-emerald-500' },
            { label: 'COTIZACION',   value: stats.cotizacion, color: 'text-amber-500' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 border ${t.statBg}`}>
              <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${t.textSub}`}>{s.label}</div>
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban — scroll horizontal en mobile, grid en desktop */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth">
        <div className="snap-center shrink-0 w-[85vw] md:w-auto md:flex-1 min-w-[220px]">
          <KanbanColumn titulo="LEADS RAW"   etapa="raw"        leads={leadsPorEtapa.raw}        color="#94A3B8" />
        </div>
        <div className="snap-center shrink-0 w-[85vw] md:w-auto md:flex-1 min-w-[220px]">
          <KanbanColumn titulo="VALIDACION"  etapa="validacion" leads={leadsPorEtapa.validacion}  color="#00AEEF" />
        </div>
        <div className="snap-center shrink-0 w-[85vw] md:w-auto md:flex-1 min-w-[220px]">
          <KanbanColumn titulo="CALIFICADOS" etapa="calificado" leads={leadsPorEtapa.calificado}  color="#10B981" />
        </div>
        <div className="snap-center shrink-0 w-[85vw] md:w-auto md:flex-1 min-w-[220px]">
          <KanbanColumn titulo="COTIZACION"  etapa="cotizacion" leads={leadsPorEtapa.cotizacion}  color="#F59E0B" />
        </div>
      </div>

      {/* Panel lateral */}
      {selectedLead && (
        <div className={`fixed right-0 top-0 h-full w-96 border-l p-6 overflow-y-auto shadow-2xl z-50 ${t.panelBg}`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={`text-xl font-bold ${t.text}`}>Detalles del Lead</h2>
            <button
              className={`text-xl p-1 rounded-lg transition-colors ${dark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
              onClick={() => setSelectedLead(null)}
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Nombre y score */}
            <div>
              <div className={`text-2xl font-bold mb-2 ${t.text}`}>{selectedLead.nombre_negocio}</div>
              {selectedLead.score_total !== undefined && (
                <div className="flex items-center gap-2">
                  <div
                    className="text-3xl font-black px-4 py-2 rounded-xl text-white"
                    style={{ backgroundColor: getColorPorScore(selectedLead.score_total) }}
                  >
                    {selectedLead.score_total}
                  </div>
                  <div className={`text-sm ${t.textSub}`}>Score Total</div>
                </div>
              )}
            </div>

            {/* Detalles */}
            <div className={`text-sm space-y-2 ${t.textSub}`}>
              <p><span className={`font-bold ${t.text}`}>Folio:</span> {selectedLead.folio}</p>
              <p><span className={`font-bold ${t.text}`}>Rubro:</span> {selectedLead.rubro}</p>
              <p><span className={`font-bold ${t.text}`}>Ciudad:</span> {selectedLead.ciudad}</p>
              {selectedLead.direccion && <p><span className={`font-bold ${t.text}`}>Direccion:</span> {selectedLead.direccion}</p>}
              {selectedLead.telefono && <p><span className={`font-bold ${t.text}`}>Telefono:</span> {selectedLead.telefono}</p>}
              {selectedLead.ticket_estimado && <p><span className={`font-bold ${t.text}`}>Ticket Est:</span> {formatearMoneda(selectedLead.ticket_estimado)}</p>}
              <p><span className={`font-bold ${t.text}`}>Urgencia:</span> {getUrgenciaEmoji(selectedLead.urgencia_nivel)} Nivel {selectedLead.urgencia_nivel}</p>
            </div>

            {/* Gap */}
            {selectedLead.gap_coherencia && (
              <div className={`border rounded-xl p-3 ${t.inputBg}`}>
                <div className={`font-bold text-sm mb-1 ${t.gapText}`}>💡 Gap de Coherencia</div>
                <div className={`text-sm ${t.textSub}`}>{selectedLead.gap_coherencia}</div>
              </div>
            )}

            {/* Argumento */}
            {selectedLead.argumento_venta && (
              <div className={`border rounded-xl p-3 ${t.argBg}`}>
                <div className={`font-bold text-sm mb-1 ${t.argText}`}>💬 Argumento de Venta</div>
                <div className={`text-sm ${t.textSub}`}>{selectedLead.argumento_venta}</div>
              </div>
            )}

            {/* Acciones */}
            <div className={`border-t pt-4 space-y-2 ${t.border}`}>
              <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
                onClick={() => alert('WhatsApp - proximamente')}>
                📱 WhatsApp
              </button>
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
                onClick={() => alert('Email - proximamente')}>
                ✉️ Email
              </button>
              <button className="w-full bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
                onClick={() => alert('PDF - proximamente')}>
                📄 Generar PDF
              </button>
              <button className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
                onClick={() => { setLeadParaAuditar(selectedLead); setSelectedLead(null); }}>
                🔍 Auditar Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard */}
      {leadParaAuditar && (
        <WizardAuditoriaTactica
          lead={leadParaAuditar}
          supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
          supabaseKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
          userId={userId}
          onCompletado={() => { setLeadParaAuditar(null); fetchLeads(); }}
          onCancelar={() => setLeadParaAuditar(null)}
        />
      )}
    </div>
  );
};

export default RadarDeNegocios;