// ============================================================================
// COMPONENTE: RadarDeNegocios.tsx - VERSIÓN FINAL (INTEGRADA)
// ============================================================================
// Incluye: Kanban, Conexión Supabase, @dnd-kit y WIZARD DE AUDITORÍA
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCorners,
  KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { WizardAuditoriaTactica } from './WizardAuditoriaTactica';
import { generarPDFLead } from '../../utils/pdfLead';

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
}

// ============================================================================
// UTILIDADES (fuera del componente para evitar re-creación en cada render)
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
  if (!score) return '#4B5563';
  if (score >= 80) return '#EF4444';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#10B981';
  return '#6B7280';
};

const getUrgenciaEmoji = (nivel: number) => {
  const emojis = ['❄️', '🌡️', '🔥', '🔥🔥', '🔥🔥🔥'];
  return emojis[nivel - 1] || '🌡️';
};

const ETAPAS_KANBAN: Array<Lead['estado']> = ['raw', 'validacion', 'calificado', 'cotizacion'];

// ============================================================================
// COMPONENTE: TARJETA DE LEAD (fuera del componente padre para hooks de @dnd-kit)
// ============================================================================

const LeadCard: React.FC<{
  lead: Lead;
  onSelect: (lead: Lead) => void;
  isOverlay?: boolean;
}> = ({ lead, onSelect, isOverlay }) => {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const scoreColor = getColorPorScore(lead.score_total);

  return (
    <div
      ref={setNodeRef}
      style={isOverlay ? {} : style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onSelect(lead)}
      className={`bg-gray-800 border border-gray-700 rounded-lg p-4 mb-3 select-none transition-all ${
        isOverlay
          ? 'cursor-grabbing scale-105 border-cyan-500 shadow-2xl'
          : 'cursor-grab active:cursor-grabbing hover:border-cyan-500 hover:shadow-lg'
      }`}
    >
      {/* Header con Score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scoreColor }} />
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

      {/* Gap de coherencia */}
      {lead.gap_coherencia && (
        <p className="text-xs text-cyan-400 mt-2 line-clamp-2">
          💡 {lead.gap_coherencia}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTE: COLUMNA DEL KANBAN (fuera del componente padre)
// ============================================================================

const KanbanColumn: React.FC<{
  titulo: string;
  etapa: Lead['estado'];
  leads: Lead[];
  color: string;
  onSelectLead: (lead: Lead) => void;
}> = ({ titulo, etapa, leads, color, onSelectLead }) => {
  const { setNodeRef } = useDroppable({ id: etapa });

  return (
    <div className="bg-gray-900 rounded-lg p-4 min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          {titulo}
        </h2>
        <span
          className="text-xs px-2 py-1 rounded text-white font-semibold"
          style={{ backgroundColor: color }}
        >
          {leads.length}
        </span>
      </div>

      {/* Drop area */}
      <div ref={setNodeRef} className="flex-1 min-h-[400px]">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onSelect={onSelectLead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">Sin leads</p>
            <p className="text-xs mt-1">Arrastra aquí para mover</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const RadarDeNegocios: React.FC<RadarDeNegociosProps> = ({ userId }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadParaAuditar, setLeadParaAuditar] = useState<Lead | null>(null);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  // ============================================================================
  // SENSORES @dnd-kit
  // ============================================================================

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ============================================================================
  // ACCIONES DEL PANEL DE LEAD
  // ============================================================================

  const limpiarTelefonoChileno = (tel: string): string => {
    const soloDigitos = tel.replace(/\D/g, '');
    if (soloDigitos.startsWith('56')) return soloDigitos;
    if (soloDigitos.startsWith('0')) return `56${soloDigitos.slice(1)}`;
    if (soloDigitos.length === 9 && soloDigitos.startsWith('9')) return `56${soloDigitos}`;
    return soloDigitos;
  };

  const handleWhatsApp = (lead: Lead) => {
    if (!lead.telefono) {
      toast.warning('Este lead no tiene teléfono registrado');
      return;
    }
    const telefono = limpiarTelefonoChileno(lead.telefono);
    const gap = lead.gap_coherencia
      ? `\n\nDetectamos que *${lead.nombre_negocio}* podría mejorar en: _${lead.gap_coherencia}_`
      : '';
    const mensaje =
      `Hola! 👋 Mi nombre es Luis de *Plus Gráfica SpA*, imprenta en Temuco.\n\n` +
      `Nos gustaría presentarles una propuesta de imagen corporativa e impresión para *${lead.nombre_negocio}*.` +
      `${gap}\n\n¿Tienen 5 minutos para conversarlo? 🙌`;
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const handleEmail = (lead: Lead) => {
    if (!lead.email) {
      toast.warning('Este lead no tiene email registrado');
      return;
    }
    const asunto = `Propuesta Plus Gráfica para ${lead.nombre_negocio}`;
    const cuerpo =
      `Estimados ${lead.nombre_negocio},\n\n` +
      `Mi nombre es Luis Sáez, de Plus Gráfica SpA, empresa de diseño e impresión en Temuco.\n\n` +
      `Nos gustaría presentarles una propuesta personalizada para mejorar su imagen corporativa` +
      (lead.gap_coherencia ? `:\n\n${lead.gap_coherencia}\n\n` : '.\n\n') +
      `Quedamos a su disposición para agendar una reunión sin costo.\n\n` +
      `Saludos,\nLuis Sáez\nPlus Gráfica SpA\ncontacto@plusgrafica.cl\n+56 9 XXXX XXXX`;
    window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  };

  const handlePDF = async (lead: Lead) => {
    try {
      await generarPDFLead(lead);
      toast.success('PDF generado correctamente');
    } catch (err) {
      console.error('Error generando PDF:', err);
      toast.error('Error al generar el PDF');
    }
  };

  // ============================================================================
  // MOVER LEAD DE ETAPA
  // ============================================================================

  const moverLeadEtapa = async (leadId: string, nuevaEtapa: Lead['estado']) => {
    try {
      const { error } = await supabase
        .from('leads_estrategicos')
        .update({ estado: nuevaEtapa, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) {
        console.error('Error moviendo lead:', error);
        toast.error('Error al mover el lead. Verifica los permisos.');
        await fetchLeads(); // Revertir estado local
      } else {
        await fetchLeads();
      }
    } catch (error) {
      console.error('Error moviendo lead:', error);
    }
  };

  // ============================================================================
  // HANDLERS DE @dnd-kit
  // ============================================================================

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLeadId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLeadId(null);
    if (!over) return;

    // Si se soltó sobre una card, buscar la etapa de esa card
    let nuevaEtapa = over.id as Lead['estado'];
    const overLead = leads.find((l) => l.id === over.id);
    if (overLead) nuevaEtapa = overLead.estado;

    // Solo permitir mover a columnas del Kanban
    if (!ETAPAS_KANBAN.includes(nuevaEtapa)) return;

    const activeLead = leads.find((l) => l.id === active.id);
    if (!activeLead || activeLead.estado === nuevaEtapa) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === active.id ? { ...l, estado: nuevaEtapa } : l)),
    );

    await moverLeadEtapa(active.id as string, nuevaEtapa);
  };

  // ============================================================================
  // DATOS DERIVADOS
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

  const activeLead = leads.find((l) => l.id === activeLeadId);

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
            onClick={() => toast.info('Formulario de nuevo prospecto — próximamente')}
          >
            + NUEVO PROSPECTO
          </button>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Kanban con @dnd-kit */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory">
          <KanbanColumn
            titulo="LEADS RAW"
            etapa="raw"
            leads={leadsPorEtapa.raw}
            color="#6B7280"
            onSelectLead={setSelectedLead}
          />
          <KanbanColumn
            titulo="VALIDACIÓN"
            etapa="validacion"
            leads={leadsPorEtapa.validacion}
            color="#00AEEF"
            onSelectLead={setSelectedLead}
          />
          <KanbanColumn
            titulo="CALIFICADOS"
            etapa="calificado"
            leads={leadsPorEtapa.calificado}
            color="#10B981"
            onSelectLead={setSelectedLead}
          />
          <KanbanColumn
            titulo="COTIZACIÓN"
            etapa="cotizacion"
            leads={leadsPorEtapa.cotizacion}
            color="#F59E0B"
            onSelectLead={setSelectedLead}
          />
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="w-[280px] rotate-2">
              <LeadCard lead={activeLead} onSelect={() => {}} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Panel lateral — Detalles del lead seleccionado */}
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
              {selectedLead.email && (
                <p><strong>Email:</strong> {selectedLead.email}</p>
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
                onClick={() => handleWhatsApp(selectedLead)}
                title={selectedLead.telefono ? `Contactar a ${selectedLead.telefono}` : 'Sin teléfono registrado'}
              >
                📱 WhatsApp{!selectedLead.telefono && ' (sin teléfono)'}
              </button>
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold"
                onClick={() => handleEmail(selectedLead)}
                title={selectedLead.email ? `Enviar a ${selectedLead.email}` : 'Sin email registrado'}
              >
                ✉️ Email{!selectedLead.email && ' (sin email)'}
              </button>
              <button
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold"
                onClick={() => handlePDF(selectedLead)}
              >
                📄 Generar PDF
              </button>
              <button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-semibold"
                onClick={() => {
                  setLeadParaAuditar(selectedLead);
                  setSelectedLead(null);
                }}
              >
                🔍 Auditar Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard de Auditoría */}
      {leadParaAuditar && (
        <WizardAuditoriaTactica
          lead={leadParaAuditar}
          supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
          supabaseKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
          userId={userId}
          onCompletado={() => {
            setLeadParaAuditar(null);
            fetchLeads();
          }}
          onCancelar={() => setLeadParaAuditar(null)}
        />
      )}
    </div>
  );
};

export default RadarDeNegocios;
