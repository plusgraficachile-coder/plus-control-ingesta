// ============================================================================
// COMPONENTE: RadarDeNegocios.tsx - VERSIÓN FINAL (INTEGRADA)
// ============================================================================
// Incluye: Kanban, Conexión Supabase, Drag&Drop y WIZARD DE AUDITORÍA
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
  iv?: number; // Impacto Visual
  nc?: number; // Nivel Corporativo
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
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const RadarDeNegocios: React.FC<RadarDeNegociosProps> = ({ userId }) => {
  // Estado

  // Estado
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadParaAuditar, setLeadParaAuditar] = useState<Lead | null>(null); // <--- AGREGAR ESTO
  // ============================================================================
  // FETCH INICIAL
  // ============================================================================

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads_estrategicos')
        .select('*')
        .order('score_total', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching leads:', error);
        // Intentar sin filtro de usuario (RLS desactivado)
        const { data: allData, error: allError } = await supabase
          .from('leads_estrategicos')
          .select('*')
          .order('urgencia_nivel', { ascending: false });
        
        if (!allError) {
          setLeads(allData || []);
        }
      } else {
        setLeads(data || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ============================================================================
  // MOVER LEAD DE ETAPA (Drag & Drop)
  // ============================================================================

  const moverLeadEtapa = async (leadId: string, nuevaEtapa: Lead['estado']) => {
    try {
      const { error } = await supabase
        .from('leads_estrategicos')
        .update({ estado: nuevaEtapa, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) {
        console.error('Error moviendo lead:', error);
        alert('Error al mover el lead. Verifica los permisos.');
      } else {
        await fetchLeads(); // Refrescar
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
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(monto);
  };

  const getColorPorScore = (score?: number) => {
    if (!score) return '#4B5563'; // Gris
    if (score >= 80) return '#EF4444'; // Rojo - MUY URGENTE
    if (score >= 60) return '#F59E0B'; // Ámbar - URGENTE
    if (score >= 40) return '#10B981'; // Verde - BUENA OPORTUNIDAD
    return '#6B7280'; // Gris oscuro - BAJA PRIORIDAD
  };

  const getUrgenciaEmoji = (nivel: number) => {
    const emojis = ['❄️', '🌡️', '🔥', '🔥🔥', '🔥🔥🔥'];
    return emojis[nivel - 1] || '🌡️';
  };

  // ============================================================================
  // FILTRAR LEADS POR ETAPA
  // ============================================================================

  const leadsPorEtapa = {
    raw: leads.filter((l) => l.estado === 'raw'),
    validacion: leads.filter((l) => l.estado === 'validacion'),
    calificado: leads.filter((l) => l.estado === 'calificado'),
    cotizacion: leads.filter((l) => l.estado === 'cotizacion'),
  };

  const stats = {
    raw: leadsPorEtapa.raw.length,
    validacion: leadsPorEtapa.validacion.length,
    calificado: leadsPorEtapa.calificado.length,
    cotizacion: leadsPorEtapa.cotizacion.length,
  };

  // ============================================================================
  // COMPONENTE: TARJETA DE LEAD
  // ============================================================================

  const LeadCard: React.FC<{ lead: Lead }> = ({ lead }) => {
    const scoreColor = getColorPorScore(lead.score_total);

    return (
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-3 cursor-pointer hover:border-cyan-500 hover:shadow-lg transition-all"
        onClick={() => setSelectedLead(lead)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('leadId', lead.id);
        }}
      >
        {/* Header con Score */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: scoreColor }}
            />
            <span className="text-xs text-gray-400">{lead.folio}</span>
          </div>
          {lead.score_total !== undefined && (
            <div
              className="px-2 py-1 rounded text-xs font-bold text-white"
              style={{ backgroundColor: scoreColor }}
            >
              {lead.score_total}
            </div>
          )}
        </div>

        {/* Nombre del negocio */}
        <h3 className="text-white font-semibold text-sm mb-1 truncate">
          {lead.nombre_negocio}
        </h3>

        {/* Rubro */}
        <p className="text-gray-400 text-xs mb-2">{lead.rubro}</p>

        {/* Indicadores */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {lead.ticket_estimado && (
            <span className="text-green-400 font-medium">
              {formatearMoneda(lead.ticket_estimado)}
            </span>
          )}
          <span>{getUrgenciaEmoji(lead.urgencia_nivel)}</span>
          {lead.capacidad_pago && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] ${
                lead.capacidad_pago === 'ALTA'
                  ? 'bg-green-900 text-green-300'
                  : lead.capacidad_pago === 'MEDIA'
                  ? 'bg-yellow-900 text-yellow-300'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {lead.capacidad_pago}
            </span>
          )}
        </div>

        {/* Gap de coherencia (si existe) */}
        {lead.gap_coherencia && (
          <p className="text-xs text-cyan-400 mt-2 line-clamp-2">
            💡 {lead.gap_coherencia}
          </p>
        )}
      </div>
    );
  };

  // ============================================================================
  // COMPONENTE: COLUMNA DEL KANBAN
  // ============================================================================

  const KanbanColumn: React.FC<{
    titulo: string;
    etapa: Lead['estado'];
    leads: Lead[];
    color: string;
  }> = ({ titulo, etapa, leads, color }) => {
    return (
      <div
        className="bg-gray-900 rounded-lg p-4 min-h-[600px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const leadId = e.dataTransfer.getData('leadId');
          if (leadId) {
            moverLeadEtapa(leadId, etapa);
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {titulo}
          </h2>
          <span
            className="text-xs px-2 py-1 rounded text-white font-semibold"
            style={{ backgroundColor: color }}
          >
            {leads.length}
          </span>
        </div>

        {/* Cards */}
        <div className="space-y-2">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>

        {/* Empty state */}
        {leads.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">Sin leads</p>
            <p className="text-xs mt-1">Arrastra aquí para mover</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-white text-lg">Cargando Radar de Negocios...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              🎯 Radar de Negocios
            </h1>
            <p className="text-gray-400 text-sm">
              Curaduría estratégica de oportunidades en {leads[0]?.ciudad || 'tu ciudad'}
            </p>
          </div>
          <button
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            onClick={() => {
              alert('Función de agregar lead - próximamente implementaremos el formulario');
            }}
          >
            + NUEVO PROSPECTO
          </button>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-xs mb-1">LEADS RAW</div>
            <div className="text-2xl font-bold text-white">{stats.raw}</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-xs mb-1">EN VALIDACIÓN</div>
            <div className="text-2xl font-bold text-cyan-400">{stats.validacion}</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-xs mb-1">CALIFICADOS</div>
            <div className="text-2xl font-bold text-green-400">{stats.calificado}</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-xs mb-1">COTIZACIÓN</div>
            <div className="text-2xl font-bold text-amber-400">{stats.cotizacion}</div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-4 gap-4">
        <KanbanColumn
          titulo="LEADS RAW"
          etapa="raw"
          leads={leadsPorEtapa.raw}
          color="#6B7280"
        />
        <KanbanColumn
          titulo="VALIDACIÓN"
          etapa="validacion"
          leads={leadsPorEtapa.validacion}
          color="#00AEEF"
        />
        <KanbanColumn
          titulo="CALIFICADOS"
          etapa="calificado"
          leads={leadsPorEtapa.calificado}
          color="#10B981"
        />
        <KanbanColumn
          titulo="COTIZACIÓN"
          etapa="cotizacion"
          leads={leadsPorEtapa.cotizacion}
          color="#F59E0B"
        />
      </div>

      {/* Panel lateral - Detalles del lead seleccionado */}
      {selectedLead && (
        <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700 p-6 overflow-y-auto shadow-2xl z-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Detalles del Lead</h2>
            <button
              className="text-gray-400 hover:text-white text-2xl"
              onClick={() => setSelectedLead(null)}
            >
              ✕
            </button>
          </div>

          {/* Contenido del panel */}
          <div className="space-y-4">
            {/* Nombre y Score */}
            <div>
              <div className="text-2xl font-bold text-white mb-2">
                {selectedLead.nombre_negocio}
              </div>
              {selectedLead.score_total !== undefined && (
                <div className="flex items-center gap-2">
                  <div
                    className="text-3xl font-black px-4 py-2 rounded"
                    style={{
                      backgroundColor: getColorPorScore(selectedLead.score_total),
                      color: 'white',
                    }}
                  >
                    {selectedLead.score_total}
                  </div>
                  <div className="text-sm text-gray-400">Score Total</div>
                </div>
              )}
            </div>

            {/* Detalles */}
            <div className="text-sm text-gray-300 space-y-2">
              <p><strong>Folio:</strong> {selectedLead.folio}</p>
              <p><strong>Rubro:</strong> {selectedLead.rubro}</p>
              <p><strong>Ciudad:</strong> {selectedLead.ciudad}</p>
              {selectedLead.direccion && (
                <p><strong>Dirección:</strong> {selectedLead.direccion}</p>
              )}
              {selectedLead.telefono && (
                <p><strong>Teléfono:</strong> {selectedLead.telefono}</p>
              )}
              {selectedLead.ticket_estimado && (
                <p><strong>Ticket Est:</strong> {formatearMoneda(selectedLead.ticket_estimado)}</p>
              )}
              <p><strong>Urgencia:</strong> {getUrgenciaEmoji(selectedLead.urgencia_nivel)} Nivel {selectedLead.urgencia_nivel}</p>
            </div>

            {/* Gap de coherencia */}
            {selectedLead.gap_coherencia && (
              <div className="bg-cyan-900 bg-opacity-30 border border-cyan-600 rounded p-3">
                <div className="text-cyan-400 font-semibold mb-1">💡 Gap de Coherencia</div>
                <div className="text-sm text-gray-200">{selectedLead.gap_coherencia}</div>
              </div>
            )}

            {/* Argumento de venta */}
            {selectedLead.argumento_venta && (
              <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded p-3">
                <div className="text-green-400 font-semibold mb-1">💬 Argumento de Venta</div>
                <div className="text-sm text-gray-200">{selectedLead.argumento_venta}</div>
              </div>
            )}

            {/* Acciones */}
            <div className="border-t border-gray-700 pt-4 space-y-2">
              <button 
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold"
                onClick={() => alert('Función WhatsApp - próximamente')}
              >
                📱 WhatsApp
              </button>
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold"
                onClick={() => alert('Función Email - próximamente')}
              >
                ✉️ Email
              </button>
              <button 
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold"
                onClick={() => alert('Función PDF - próximamente')}
              >
                📄 Generar PDF
              </button>
              <button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-semibold"
                onClick={() => {
                  setLeadParaAuditar(selectedLead); // Carga el lead en el Wizard
                  setSelectedLead(null);            // Cierra el panel lateral para limpiar la vista
                }}
              >
                🔍 Auditar Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ COMPONENTE WIZARD (Se renderiza cuando leadParaAuditar tiene datos) */}
      {leadParaAuditar && (
        <WizardAuditoriaTactica
          lead={leadParaAuditar}
          supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
          supabaseKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
          userId={userId}
          onCompletado={() => {
            setLeadParaAuditar(null);
            fetchLeads(); // Recarga el Kanban para ver el nuevo Score
          }}
          onCancelar={() => setLeadParaAuditar(null)}
        />
      )}
    </div>
  );
};

export default RadarDeNegocios;