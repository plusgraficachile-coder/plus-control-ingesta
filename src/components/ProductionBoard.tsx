import { useEffect, useState, useMemo } from 'react'
import {
  DndContext, DragOverlay, closestCorners,
  KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable,
  type DragStartEvent, type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, DollarSign, GripVertical, AlertCircle, Loader } from 'lucide-react'
import { FORMATTER } from '../utils/formatters'
import { toast } from 'sonner'
import ProductionDetailModal from './production/ProductionDetailModal'
import { DeliveryGate } from './DeliveryGate'
import { EvidenceViewer } from './EvidenceViewer'
import { ProductionStats } from './production/ProductionStats'

interface ProductionBoardProps {
  quotes: any[];
  onStatusChange: (id: any, newStatus: string) => void;
  dark: boolean;
  selectedMonth?: string;
}

const COLUMNS = [
  { id: 'Aceptada', title: 'Por Iniciar', dot: 'bg-rose-500', border: 'border-rose-500/20' },
  { id: 'En Producción', title: 'En Taller', dot: 'bg-amber-500', border: 'border-amber-500/20' },
  { id: 'Listo', title: 'Terminado', dot: 'bg-emerald-500', border: 'border-emerald-500/20' },
  { id: 'Entregado', title: 'Entregado', dot: 'bg-slate-500', border: 'border-slate-500/20' },
]

// --- HELPERS ---
const diffDays = (dateStr: string | null) => {
  if (!dateStr) return 999
  const today = new Date()
  today.setHours(0,0,0,0)
  const target = new Date(dateStr)
  target.setHours(0,0,0,0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

const sortByPriority = (quotes: any[]) =>
  [...quotes].sort((a, b) => diffDays(a.fecha_vencimiento) - diffDays(b.fecha_vencimiento))

// --- KANBAN CARD ---
// @ts-ignore
const KanbanCard = ({ quote, onOpen, isOverlay }: { quote: any, onOpen?: (q: any)=>void, isOverlay?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.id })
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    opacity: isDragging ? 0.3 : 1,
  }

  const daysLeft = diffDays(quote.fecha_vencimiento)
  const wrapperStyle = isOverlay ? {} : style

  return (
    <div
      ref={setNodeRef}
      style={wrapperStyle}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onOpen && onOpen(quote)}
      className={`relative p-4 mb-3 rounded-xl bg-[#1F2937] text-white border border-white/5 shadow-lg group select-none ${isOverlay ? 'cursor-grabbing scale-105 border-cyan-500 shadow-2xl z-50' : 'cursor-grab active:cursor-grabbing hover:border-white/10'}`}
    >
      <div className="flex justify-between items-start mb-2 pr-4">
        <span className="text-[10px] font-bold uppercase opacity-50 font-mono flex items-center gap-1">
          <GripVertical size={12} className="opacity-50" />
          #{quote.folio || String(quote.id).slice(0, 6)}
        </span>

        {(quote.saldo_pendiente || 0) > 0 && quote.estado !== 'Entregado' && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded border border-rose-400/20">
            <DollarSign size={8} /> DEBE
          </span>
        )}
      </div>

      <h4 className="font-bold text-sm mb-2 leading-snug text-gray-100">
        {quote.cliente_empresa || quote.cliente_nombre || 'Cliente Sin Nombre'}
      </h4>

      {daysLeft <= 3 && quote.estado !== 'Entregado' && (
        <div className="mb-3">
            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${
            daysLeft < 0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
            {daysLeft < 0 ? `ATRASADO ${Math.abs(daysLeft)} DÍAS` : daysLeft === 0 ? 'VENCE HOY' : 'URGENTE'}
            </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[10px] opacity-60">
          <Clock size={12} />
          {/* ✅ FECHA INTELIGENTE: Si está entregado, muestra cuándo se entregó */}
          {quote.estado === 'Entregado' && quote.fecha_entrega
            ? `Entregado: ${new Date(quote.fecha_entrega).toLocaleDateString('es-CL', {day: '2-digit', month: 'short'})}`
            : new Date(quote.fecha_creacion).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
          }
        </div>
        <div className="text-xs font-bold tracking-tight text-cyan-500">
          {FORMATTER.format(quote.total_final ?? 0)}
        </div>
      </div>
    </div>
  )
}

// --- COLUMN ---
const Column = ({ column, quotes, onOpen }: any) => {
  const { setNodeRef } = useDroppable({ id: column.id })
  
  return (
    <div className="flex-1 min-w-[220px] max-w-[320px] flex flex-col h-full snap-center shrink-0">
        <div className={`flex items-center justify-between mb-4 p-3 rounded-xl bg-[#111827]/50 border ${column.border}`}>
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shadow-lg shadow-${column.dot.split('-')[1]}-500/50 ${column.dot}`} />
                <h3 className="font-black text-sm text-white uppercase tracking-wide">{column.title}</h3>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/5">
                {quotes.length}
            </span>
        </div>

        <div ref={setNodeRef} className="flex-1 rounded-2xl bg-[#0B1120]/30 p-2 border border-white/5 min-h-[500px]">
            <SortableContext items={quotes.map((q: any) => q.id)} strategy={verticalListSortingStrategy}>
                {quotes.map((quote: any) => (
                    <KanbanCard key={quote.id} quote={quote} onOpen={onOpen} />
                ))}
            </SortableContext>
            
            {quotes.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-slate-400 gap-2 min-h-[200px]">
                    <AlertCircle size={32} />
                    <p className="text-xs font-bold uppercase">Sin Pedidos</p>
                </div>
            )}
        </div>
    </div>
  )
}

// --- MAIN COMPONENT ---
const ProductionBoard: React.FC<ProductionBoardProps> = ({ quotes: initialQuotes, onStatusChange, dark }) => {
  const [localQuotes, setLocalQuotes] = useState<any[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
     if (initialQuotes) {
       const relevant = initialQuotes.filter(q => ['Aceptada', 'En Producción', 'Listo', 'Entregado'].includes(q.estado))
       setLocalQuotes(relevant)
       setIsLoading(false)
     }
  }, [initialQuotes])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ✅ LÓGICA FILTRO HÍBRIDO + VENTANA MÓVIL
  // 1. Activos: Se muestran SIEMPRE.
  // 2. Historial: Se muestran los entregados en los ÚLTIMOS 30 DÍAS.
  const filteredQuotes = useMemo(() => {
    return localQuotes.filter(quote => {
        // ACTIVOS (Prioridad)
        if (['Aceptada', 'En Producción', 'Listo', 'En Taller', 'Por Iniciar'].includes(quote.estado)) {
            return true;
        }

        // HISTORIAL (Ventana Móvil 30 Días)
        if (['Entregado', 'Rechazada'].includes(quote.estado)) {
            // Buscamos fecha relevante
            const dateStr = quote.fecha_entrega || quote.updated_at || quote.fecha_creacion;
            if (!dateStr) return true; // Fallback seguro

            const date = new Date(dateStr);
            const today = new Date();
            // Diferencia en días
            const diffTime = Math.abs(today.getTime() - date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            return diffDays <= 30; // 👈 Muestra historial de 1 mes atrás
        }

        return false;
    });
  }, [localQuotes]);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {}
    COLUMNS.forEach(c => map[c.id] = [])

    filteredQuotes.forEach(q => {
      if (map[q.estado]) map[q.estado].push(q)
    })

    Object.keys(map).forEach(k => map[k] = sortByPriority(map[k]))
    return map
  }, [filteredQuotes])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) { setActiveId(null); return; }

    let newStatus = over.id as string
    const overQuote = localQuotes.find(q => q.id === over.id)
    if (overQuote) newStatus = overQuote.estado

    if (!COLUMNS.some(c => c.id === newStatus)) { setActiveId(null); return; }

    const currentQuote = localQuotes.find(q => q.id === active.id)
    if (!currentQuote || currentQuote.estado === newStatus) { setActiveId(null); return; }

    if (newStatus === 'Entregado') {
        toast.error('🔒 Protocolo de Salida', {
            description: 'Haz clic en la tarjeta para subir evidencia y firmar la entrega.',
            duration: 4000
        });
        setActiveId(null);
        return;
    }

    setLocalQuotes(prev => prev.map(q => q.id === active.id ? { ...q, estado: newStatus } : q))
    onStatusChange(active.id, newStatus)
    setActiveId(null)
  }

  const handleGateDeliver = async (data: any) => {
    const now = new Date().toISOString();
    // Actualizamos estado y fechas localmente para reflejo inmediato
    setLocalQuotes(prev => prev.map(q => 
        q.id === data.orderId 
            ? { ...q, estado: 'Entregado', fecha_entrega: now, updated_at: now } 
            : q
    ));
    
    onStatusChange(data.orderId, 'Entregado');
    setSelectedQuote(null);
    toast.success('🚀 Pedido Entregado y Auditado');
  }

  const activeQuote = useMemo(() => localQuotes.find(q => q.id === activeId), [activeId, localQuotes])

  if (isLoading) return (
    <div className={`h-[60vh] w-full flex flex-col items-center justify-center gap-4 ${dark ? 'text-white' : 'text-slate-800'}`}>
        <Loader className="animate-spin text-cyan-500" size={40} />
        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Cargando Tablero...</p>
    </div>
  )

  return (
    <div className="animate-fade-in w-full h-full"> 
      <div className="mb-6 flex justify-between items-end">
         <h2 className={`text-3xl font-black tracking-tighter ${dark ? 'text-white' : 'text-slate-900'}`}>
            Tablero Kanban
         </h2>
         <span className="text-xs font-mono opacity-50 uppercase border px-2 py-1 rounded">
             Historial: Últimos 30 días
         </span>
      </div>

      <ProductionStats quotes={filteredQuotes} />

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-12 h-[calc(100vh-200px)] items-start snap-x snap-mandatory px-4 w-full scroll-smooth">
          {COLUMNS.map(col => (
            <Column key={col.id} column={col} quotes={grouped[col.id]} onOpen={setSelectedQuote} />
          ))}
          <div className="shrink-0 w-8" />
        </div>

        <DragOverlay>
          {activeQuote ? (
             <div className="w-[320px] rotate-2 cursor-grabbing">
                <KanbanCard quote={activeQuote} isOverlay />
             </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ROUTER DE MODALES */}
      {selectedQuote && (
        <>
            {selectedQuote.estado === 'Listo' ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-lg">
                        <DeliveryGate
                            order={{
                                id: selectedQuote.id,
                                balance: selectedQuote.saldo_pendiente,
                                folio: selectedQuote.folio,
                                client_name: selectedQuote.cliente_empresa || selectedQuote.cliente_nombre
                            }}
                            onDeliver={handleGateDeliver}
                            onClose={() => setSelectedQuote(null)}
                        />
                    </div>
                </div>
            ) : selectedQuote.estado === 'Entregado' ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md">
                        <EvidenceViewer 
                            orderId={selectedQuote.id}
                            onClose={() => setSelectedQuote(null)}
                        />
                    </div>
                </div>
            ) : (
                <ProductionDetailModal
                    quote={selectedQuote}
                    onClose={() => setSelectedQuote(null)}
                    onRefresh={() => {}}
                />
            )}
        </>
      )}
    </div>
  )
}

export default ProductionBoard