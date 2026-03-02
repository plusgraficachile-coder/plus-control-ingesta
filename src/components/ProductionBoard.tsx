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
import { Clock, DollarSign, GripVertical, AlertCircle, Loader, ChevronLeft, ChevronRight } from 'lucide-react'
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
  { id: 'Aceptada',      title: 'Por Iniciar', dot: 'bg-rose-500',    border: 'border-rose-500/20'    },
  { id: 'En Producción', title: 'En Taller',   dot: 'bg-amber-500',   border: 'border-amber-500/20'   },
  { id: 'Listo',         title: 'Terminado',   dot: 'bg-emerald-500', border: 'border-emerald-500/20' },
  { id: 'Entregado',     title: 'Entregado',   dot: 'bg-slate-500',   border: 'border-slate-500/20'   },
]

// --- HELPERS ---
const diffDays = (dateStr: string | null) => {
  if (!dateStr) return 999
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

const sortByPriority = (quotes: any[]) =>
  [...quotes].sort((a, b) => diffDays(a.fecha_vencimiento) - diffDays(b.fecha_vencimiento))

// Helper para formatear mes legible
const formatMonthLabel = (yearMonth: string) => {
  const [year, month] = yearMonth.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${months[parseInt(month) - 1]} ${year}`
}

// --- KANBAN CARD — respeta dark ---
const KanbanCard = ({ quote, onOpen, isOverlay, dark }: { quote: any, onOpen?: (q: any)=>void, isOverlay?: boolean, dark?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.id })
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    opacity: isDragging ? 0.3 : 1,
  }

  const daysLeft = diffDays(quote.fecha_vencimiento)
  const wrapperStyle = isOverlay ? {} : style

  // FIX: clases dinámicas según dark
  const cardBg = dark
    ? 'bg-[#1F2937] text-white border-white/5 hover:border-white/10'
    : 'bg-white text-slate-800 border-transparent hover:border-slate-200 shadow-sm hover:shadow-md'

  return (
    <div
      ref={setNodeRef}
      style={wrapperStyle}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onOpen && onOpen(quote)}
      className={`relative p-4 mb-3 rounded-xl border group select-none transition-all
        ${cardBg}
        ${isOverlay ? 'cursor-grabbing scale-105 !border-cyan-500 shadow-2xl z-50' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <div className="flex justify-between items-start mb-2 pr-4">
        <span className={`text-[10px] font-bold uppercase font-mono flex items-center gap-1 ${dark ? 'opacity-50' : 'text-slate-400'}`}>
          <GripVertical size={12} className="opacity-50" />
          #{quote.folio || String(quote.id).slice(0, 6)}
        </span>

        {(quote.saldo_pendiente || 0) > 0 && quote.estado !== 'Entregado' && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded border border-rose-400/20">
            <DollarSign size={8} /> DEBE
          </span>
        )}
      </div>

      <h4 className={`font-bold text-sm mb-2 leading-snug ${dark ? 'text-gray-100' : 'text-slate-800'}`}>
        {quote.cliente_empresa || quote.cliente_nombre || 'Cliente Sin Nombre'}
      </h4>

      {daysLeft <= 3 && quote.estado !== 'Entregado' && (
        <div className="mb-3">
          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${
            daysLeft < 0
              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {daysLeft < 0 ? `ATRASADO ${Math.abs(daysLeft)} DIAS` : daysLeft === 0 ? 'VENCE HOY' : 'URGENTE'}
          </span>
        </div>
      )}

      <div className={`flex items-center justify-between pt-3 mt-1 border-t ${dark ? 'border-white/5' : 'border-slate-100'}`}>
        <div className={`flex items-center gap-1.5 text-[10px] ${dark ? 'opacity-60' : 'text-slate-400'}`}>
          <Clock size={12} />
          {quote.estado === 'Entregado' && quote.fecha_entrega
            ? `Entregado: ${new Date(quote.fecha_entrega).toLocaleDateString('es-CL', {day:'2-digit', month:'short'})}`
            : new Date(quote.fecha_creacion).toLocaleDateString('es-CL', { day:'2-digit', month:'short' })
          }
        </div>
        <div className="text-xs font-bold tracking-tight text-cyan-500">
          {FORMATTER.format(quote.total_final ?? 0)}
        </div>
      </div>
    </div>
  )
}

// --- COLUMN — respeta dark ---
const Column = ({ column, quotes, onOpen, dark }: any) => {
  const { setNodeRef } = useDroppable({ id: column.id })
  
  const headerBg = dark
    ? `bg-[#111827]/50 border ${column.border}`
    : `bg-[#F0F2F5] border border-transparent`

  const bodyBg = dark
    ? 'bg-[#0B1120]/30 border-white/5'
    : 'bg-[#F0F2F5] border-transparent'

  return (
    <div className="flex-1 min-w-[220px] max-w-[320px] flex flex-col h-full snap-center shrink-0">
      <div className={`flex items-center justify-between mb-4 p-3 rounded-xl ${headerBg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${column.dot}`} />
          <h3 className={`font-black text-sm uppercase tracking-wide ${dark ? 'text-white' : 'text-slate-700'}`}>
            {column.title}
          </h3>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${dark ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-white text-slate-500 border-slate-200'}`}>
          {quotes.length}
        </span>
      </div>

      <div ref={setNodeRef} className={`flex-1 rounded-2xl p-2 border min-h-[500px] ${bodyBg}`}>
        <SortableContext items={quotes.map((q: any) => q.id)} strategy={verticalListSortingStrategy}>
          {quotes.map((quote: any) => (
            <KanbanCard key={quote.id} quote={quote} onOpen={onOpen} dark={dark} />
          ))}
        </SortableContext>
        
        {quotes.length === 0 && (
          <div className={`h-full flex flex-col items-center justify-center gap-2 min-h-[200px] ${dark ? 'opacity-20 text-slate-400' : 'opacity-30 text-slate-400'}`}>
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

  // FIX: selector de mes — por defecto mes actual, navegable
  const [viewMonth, setViewMonth] = useState<string | 'all'>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    if (initialQuotes) {
      const relevant = initialQuotes.filter(q =>
        ['Aceptada', 'En Producción', 'Listo', 'Entregado'].includes(q.estado)
      )
      setLocalQuotes(relevant)
      setIsLoading(false)
    }
  }, [initialQuotes])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Navegar mes anterior / siguiente
  const navigateMonth = (dir: -1 | 1) => {
    if (viewMonth === 'all') return
    const [y, m] = viewMonth.split('-').map(Number)
    const date = new Date(y, m - 1 + dir, 1)
    setViewMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }

  // FIX: filtro por mes seleccionado
  const filteredQuotes = useMemo(() => {
    return localQuotes.filter(quote => {
      // Activos SIEMPRE visibles (en producción, aceptados, listos)
      if (['Aceptada', 'En Producción', 'Listo'].includes(quote.estado)) {
        return true
      }

      // Entregados: filtrar por mes seleccionado
      if (quote.estado === 'Entregado') {
        if (viewMonth === 'all') return true
        const dateStr = quote.fecha_entrega || quote.updated_at || quote.fecha_creacion
        if (!dateStr) return true
        return dateStr.startsWith(viewMonth)
      }

      return false
    })
  }, [localQuotes, viewMonth])

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {}
    COLUMNS.forEach(c => map[c.id] = [])
    filteredQuotes.forEach(q => { if (map[q.estado]) map[q.estado].push(q) })
    Object.keys(map).forEach(k => map[k] = sortByPriority(map[k]))
    return map
  }, [filteredQuotes])

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as number)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) { setActiveId(null); return }

    let newStatus = over.id as string
    const overQuote = localQuotes.find(q => q.id === over.id)
    if (overQuote) newStatus = overQuote.estado
    if (!COLUMNS.some(c => c.id === newStatus)) { setActiveId(null); return }

    const currentQuote = localQuotes.find(q => q.id === active.id)
    if (!currentQuote || currentQuote.estado === newStatus) { setActiveId(null); return }

    if (newStatus === 'Entregado') {
      toast.error('Protocolo de Salida', {
        description: 'Haz clic en la tarjeta para subir evidencia y firmar la entrega.',
        duration: 4000
      })
      setActiveId(null)
      return
    }

    setLocalQuotes(prev => prev.map(q => q.id === active.id ? { ...q, estado: newStatus } : q))
    onStatusChange(active.id, newStatus)
    setActiveId(null)
  }

  const handleGateDeliver = async (data: any) => {
    const now = new Date().toISOString()
    setLocalQuotes(prev => prev.map(q =>
      q.id === data.orderId ? { ...q, estado: 'Entregado', fecha_entrega: now, updated_at: now } : q
    ))
    onStatusChange(data.orderId, 'Entregado')
    setSelectedQuote(null)
    toast.success('Pedido Entregado y Auditado')
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
      {/* Header con navegador de mes */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h2 className={`text-3xl font-black tracking-tighter ${dark ? 'text-white' : 'text-slate-900'}`}>
            Tablero Kanban
          </h2>
          <p className={`text-xs mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Activos siempre visibles · Entregados filtrados por mes
          </p>
        </div>

        {/* Navegador de mes */}
        <div className={`flex items-center gap-1 rounded-xl border p-1 ${dark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <button
            onClick={() => navigateMonth(-1)}
            className={`p-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <ChevronLeft size={16} />
          </button>

          <span className={`text-xs font-bold px-3 min-w-[80px] text-center ${dark ? 'text-white' : 'text-slate-700'}`}>
            {viewMonth === 'all' ? 'Todo' : formatMonthLabel(viewMonth)}
          </span>

          <button
            onClick={() => navigateMonth(1)}
            className={`p-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={() => setViewMonth('all')}
            className={`text-[10px] font-bold px-2 py-1 rounded-lg ml-1 transition-colors ${
              viewMonth === 'all'
                ? 'bg-cyan-500 text-white'
                : dark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Todo
          </button>
        </div>
      </div>

      <ProductionStats quotes={filteredQuotes} />

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-12 h-[calc(100vh-200px)] items-start snap-x snap-mandatory px-4 w-full scroll-smooth">
          {COLUMNS.map(col => (
            <Column key={col.id} column={col} quotes={grouped[col.id]} onOpen={setSelectedQuote} dark={dark} />
          ))}
          <div className="shrink-0 w-8" />
        </div>

        <DragOverlay>
          {activeQuote ? (
            <div className="w-[320px] rotate-2 cursor-grabbing">
              <KanbanCard quote={activeQuote} isOverlay dark={dark} />
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