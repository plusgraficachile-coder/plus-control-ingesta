import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Calendar, User, FileSearch, Loader2 } from 'lucide-react';

export const EvidenceViewer = ({ orderId, onClose }: { orderId: string, onClose: () => void }) => {
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLog = async () => {
      // Buscamos el último log de entrega para esta orden
      const { data, error } = await supabase
        .from('order_audit_logs')
        .select('*')
        .eq('order_id', orderId)
        .eq('action', 'DELIVERY_COMPLETED') // Asegúrate que coincida con tu SQL
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setLog(data);
      }
      setLoading(false);
    };

    fetchLog();
  }, [orderId]);

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
      <Loader2 className="animate-spin" />
      <span className="text-xs uppercase tracking-wider">Recuperando evidencia forense...</span>
    </div>
  );

  if (!log) return (
    <div className="text-center py-8">
      <FileSearch className="mx-auto text-slate-600 mb-2" size={32} />
      <p className="text-slate-400">No hay registro digital de esta entrega.</p>
      <p className="text-slate-600 text-xs mt-1">(Quizás se entregó antes de implementar el sistema V2)</p>
      <button onClick={onClose} className="mt-4 text-cyan-500 hover:underline text-xs">Cerrar</button>
    </div>
  );

  // Parseamos el payload si viene como string, o lo usamos directo
  const details = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;

  return (
    <div className="bg-[#111827] rounded-xl overflow-hidden border border-emerald-500/20 shadow-2xl">
      {/* HEADER TIPO "TICKET" */}
      <div className="bg-emerald-900/20 p-4 border-b border-emerald-500/20 flex items-center gap-3">
        <div className="bg-emerald-500/20 p-2 rounded-full">
          <CheckCircle2 className="text-emerald-500" size={20} />
        </div>
        <div>
          <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wider">Entrega Certificada</h3>
          <p className="text-emerald-600/60 text-[10px] font-mono">ID AUDITORÍA: {log.id.slice(0, 8)}</p>
        </div>
      </div>

      {/* CUERPO DE LA EVIDENCIA */}
      <div className="p-0">
        {/* LA FOTO (The Hero) */}
        <div className="relative group">
            {log.evidence_url ? (
                <a href={log.evidence_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden">
                    <img 
                        src={log.evidence_url || 'https://placehold.co/600x400?text=Error+URL'} 
    onError={(e) => {
        console.error("Error cargando imagen:", log.evidence_url);
        e.currentTarget.src = 'https://placehold.co/600x400?text=Imagen+Rota';
    }}
    alt="Evidencia" 
    className="w-full h-56 object-cover hover:scale-105 transition-transform duration-500 cursor-zoom-in"
/>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent opacity-60" />
                    <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                        Clic para ampliar
                    </span>
                </a>
            ) : (
                <div className="h-40 bg-slate-800 flex items-center justify-center text-slate-500 text-xs italic">
                    Sin evidencia fotográfica
                </div>
            )}
        </div>

        {/* METADATA */}
        <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-3 rounded-lg border border-white/5">
                    <span className="text-slate-500 text-[10px] font-bold uppercase flex items-center gap-1 mb-1">
                        <User size={10} /> Responsable
                    </span>
                    <p className="text-slate-200 text-xs truncate" title={details.performedBy}>
                        {details.performedBy || 'Sistema'}
                    </p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-white/5">
                    <span className="text-slate-500 text-[10px] font-bold uppercase flex items-center gap-1 mb-1">
                        <Calendar size={10} /> Fecha Hora
                    </span>
                    <p className="text-slate-200 text-xs">
                        {new Date(log.created_at).toLocaleString('es-CL')}
                    </p>
                </div>
            </div>

            {/* CHECKLIST */}
            <div className="bg-black/20 rounded p-3 text-[10px] text-slate-400 font-mono space-y-1">
                <div className="flex justify-between">
                    <span>• Inspección Física:</span>
                    <span className={details.operationalChecklist?.physicalCheck ? "text-emerald-500" : "text-rose-500"}>
                        {details.operationalChecklist?.physicalCheck ? "APROBADO" : "OMITIDO"}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>• Saldo al Entregar:</span>
                    <span className="text-white">${(details.financialSnapshot?.balance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span>• Dispositivo:</span>
                    <span className="truncate max-w-[150px]">{details.metadata?.userAgent?.split(')')[0] + ')' || 'N/A'}</span>
                </div>
            </div>

            {/* NOTAS */}
            {details.metadata?.notes && (
                <div className="text-xs text-slate-300 italic border-l-2 border-slate-600 pl-3 py-1">
                    "{details.metadata.notes}"
                </div>
            )}
        </div>
      </div>

      <div className="p-4 bg-slate-900 border-t border-white/5 flex justify-center">
        <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold uppercase transition-colors"
        >
            Cerrar Expediente
        </button>
      </div>
    </div>
  );
};