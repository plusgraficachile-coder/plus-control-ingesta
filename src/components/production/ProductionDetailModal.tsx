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

  /* ================= MARCAR COMO LISTO ================= */
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
        .eq("estado", "En Producción"); // Blindaje

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

  /* ================= MARCAR COMO ENTREGADO ================= */
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
        .eq("estado", "Listo"); // Blindaje

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
      <div className="pg-glass w-full max-w-2xl rounded-3xl p-8 text-white relative shadow-2xl border border-white/10">

        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white">
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-6 border-b border-white/10 pb-4">
          <h2 className="text-2xl font-bold text-pg-cyan">Orden de Trabajo</h2>
          <p className="text-slate-400 text-sm">{quote.cliente_empresa || quote.cliente_nombre}</p>
          {daysLeft !== null && (
            <span className={`text-xs font-bold ${daysLeft < 0 ? "text-rose-500" : "text-amber-400"}`}>
              {daysLeft < 0 ? "ATRASADO" : `FALTAN ${daysLeft} DÍAS`}
            </span>
          )}
        </div>

        {/* Items */}
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
          {quote.items?.map((item: any, i: number) => (
            <div key={i} className="pg-card p-4">
              <div className="flex justify-between">
                <h4 className="font-bold text-sm">{item.descripcion_item}</h4>
                <span className="text-pg-cyan font-bold">x{item.cantidad}</span>
              </div>
              {item.medidas_ancho > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {item.medidas_ancho}cm × {item.medidas_alto}cm
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Notas */}
        {quote.notas_taller && (
          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
            <div className="flex items-center gap-2 mb-1 font-bold text-amber-400 uppercase">
              <AlertTriangle size={14} /> Notas de Producción
            </div>
            {quote.notas_taller}
          </div>
        )}

        {/* Acciones */}
        <div className="mt-8 flex justify-between items-center">
          <button onClick={() => window.print()} className="text-slate-400 hover:text-white text-xs font-bold">
            <Printer size={18} /> Ticket
          </button>

          <div className="flex gap-3">
            {quote.estado === "En Producción" && (
              <button onClick={handleMarkAsReady} disabled={isUpdating} className="pg-btn-primary flex items-center gap-2 bg-emerald-600">
                <CheckCircle size={18} />
                {isUpdating ? "Actualizando..." : "Marcar como LISTO"}
              </button>
            )}

            {quote.estado === "Listo" && (
              <button onClick={handleMarkAsDelivered} disabled={isUpdating} className="pg-btn-secondary flex items-center gap-2 border-emerald-500 text-emerald-400">
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
