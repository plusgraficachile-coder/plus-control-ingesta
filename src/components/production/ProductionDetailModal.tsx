import React, { useState } from "react";
import { X, Printer, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import { toast } from "sonner";

interface Props {
  quote: any;
  onClose: () => void;
  onRefresh?: () => void;
}

const ProductionDetailModal: React.FC<Props> = ({ quote, onClose, onRefresh }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!quote) return null;

  const daysLeft = quote.fecha_vencimiento
    ? Math.ceil((new Date(quote.fecha_vencimiento).getTime() - Date.now()) / 86400000)
    : null;

  const handleMarkAsReady = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("cotizaciones")
        .update({
          estado: "Listo",
          fecha_listo: new Date().toISOString(),
        })
        .eq("id", quote.id)
        .eq("estado", "En Producción");

      if (error) throw error;

      toast.success("Orden marcada como LISTA");
      onRefresh?.();
      onClose();
    } catch (err: any) {
      toast.error("No se pudo actualizar el estado");
      console.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkAsDelivered = async () => {
    if (quote.saldo_pendiente > 0) {
      toast.error("No se puede entregar: cliente con saldo pendiente");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("cotizaciones")
        .update({
          estado: "Entregado",
          fecha_entrega: new Date().toISOString(),
        })
        .eq("id", quote.id)
        .eq("estado", "Listo");

      if (error) throw error;

      toast.success("Orden marcada como ENTREGADA");
      onRefresh?.();
      onClose();
    } catch (err: any) {
      toast.error("No se pudo registrar la entrega");
      console.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="pg-card w-full max-w-2xl p-8 relative shadow-2xl">
        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-pg-muted hover:text-pg-text transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-6 border-b border-pg-border pb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pg-primary to-pg-cyan bg-clip-text text-transparent">
            Orden de Trabajo
          </h2>
          <p className="text-pg-secondary text-sm mt-1">
            {quote.cliente_empresa || quote.cliente_nombre}
          </p>
          {daysLeft !== null && (
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold
                              ${daysLeft < 0 
                                ? 'bg-pg-danger/20 text-pg-danger border border-pg-danger/30' 
                                : 'bg-pg-warning/20 text-pg-warning border border-pg-warning/30'}`}>
                {daysLeft < 0 ? '⚠️ ATRASADO' : `⏱️ FALTAN ${daysLeft} DÍAS`}
              </span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {quote.items?.map((item: any, i: number) => (
            <div key={i} className="pg-elevated p-4 border-l-4 border-pg-primary">
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-sm text-pg-text flex-1">
                  {item.descripcion_item}
                </h4>
                <span className="px-3 py-1 bg-pg-cyan/20 text-pg-cyan text-xs font-bold rounded-full ml-3">
                  ×{item.cantidad}
                </span>
              </div>
              {item.medidas_ancho > 0 && (
                <p className="text-xs text-pg-muted mt-2">
                  📐 {item.medidas_ancho}cm × {item.medidas_alto}cm
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Notas de taller */}
        {quote.notas_taller && (
          <div className="mt-6 p-4 rounded-lg bg-pg-warning/10 border border-pg-warning/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-pg-warning" />
              <span className="font-bold text-sm text-pg-warning uppercase tracking-wide">
                Notas de Producción
              </span>
            </div>
            <p className="text-sm text-pg-secondary">
              {quote.notas_taller}
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="mt-8 flex justify-between items-center pt-6 border-t border-pg-border">
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 text-pg-secondary hover:text-pg-primary 
                       text-sm font-semibold transition-colors"
          >
            <Printer size={18} />
            <span>Imprimir Ticket</span>
          </button>

          <div className="flex gap-3">
            {quote.estado === "En Producción" && (
              <button 
                onClick={handleMarkAsReady} 
                disabled={isUpdating} 
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold
                           bg-gradient-to-r from-pg-success to-emerald-600 text-white
                           hover:shadow-lg active:scale-95 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={18} />
                {isUpdating ? "Actualizando..." : "Marcar como LISTO"}
              </button>
            )}

            {quote.estado === "Listo" && (
              <button 
                onClick={handleMarkAsDelivered} 
                disabled={isUpdating} 
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold
                           bg-pg-card border-2 border-pg-success text-pg-success
                           hover:bg-pg-success hover:text-white
                           active:scale-95 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={18} />
                {isUpdating ? "Actualizando..." : "Marcar como ENTREGADO"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionDetailModal;