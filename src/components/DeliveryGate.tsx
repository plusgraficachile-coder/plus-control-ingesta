// src/components/DeliveryGate.tsx

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle,
  Lock,
  XCircle,
  AlertOctagon,
  Camera,
  Loader2,
  Upload,
  FileCheck
} from 'lucide-react';
import { useDeliverySubmission } from '@/hooks/useDeliverySubmission';

interface DeliveryGateProps {
  order: {
    id: string;
    balance: number;
    folio?: string;
    client_name?: string; // Opcional, para el log
  };
  onDeliver: (data: any) => Promise<void> | void;
  onClose: () => void;
}

export const DeliveryGate = ({ order, onDeliver, onClose }: DeliveryGateProps) => {
  const [checks, setChecks] = useState({
    physical: false,
  });
  const [notes, setNotes] = useState('');
  const [photoEvidence, setPhotoEvidence] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('cargando...');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { submitDelivery, isSubmitting, uploadProgress } = useDeliverySubmission();

  // Obtener usuario actual para el log visual
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserEmail(data.user?.email || 'operador_anonimo');
    };
    getUser();
  }, []);

  const isDebtFree = order.balance <= 100;
  const isQualityChecked = checks.physical && !!photoEvidence;
  const canDeliver = isDebtFree && isQualityChecked && !isSubmitting;

  // =============================================
  // MANEJO DE FOTO (UI)
  // =============================================
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen');
      return;
    }

    setPhotoEvidence(file);

    // Preview local inmediato
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // =============================================
  // ACCIÓN FINAL: FIRMAR SALIDA
  // =============================================
  const handleDeliverClick = async () => {
    if (!canDeliver || !photoEvidence) return;

    // 1. Preparar el Payload de Auditoría
    const auditPayload = {
      action: 'delivery_completed',
      performedBy: currentUserEmail,
      performedAt: new Date().toISOString(),
      financialSnapshot: {
        orderTotal: 0, // Si tienes el total, ponlo aquí
        balance: order.balance,
        paymentStatus: order.balance <= 0 ? 'paid' : 'partial',
      },
      operationalChecklist: {
        physicalCheck: checks.physical,
        photoEvidence: true,
        clientNotified: true, // Asumimos presencial
      },
      evidenceUrl: '', // Se llenará en el hook
      metadata: {
        userAgent: navigator.userAgent,
        ipAddress: null,
        notes: notes || null,
      },
    };

    // 2. Ejecutar el Hook (Compresión -> Storage -> RPC)
    const result = await submitDelivery({
      orderId: order.id,
      evidenceFile: photoEvidence,
      auditPayload,
    });

    // 3. Manejar Resultado
    if (result.success) {
      // Éxito: Notificar al padre para actualizar UI
      await onDeliver({
        orderId: order.id,
        status: 'Entregado',
        auditLogId: result.auditLogId
      });
      onClose(); // Cerrar modal
    } else {
      // Error: Mostrar alerta (el hook ya limpió la basura)
      alert(`⚠️ Error al registrar entrega: ${result.error}`);
    }
  };

  return (
    <div className="bg-gray-900 p-0 rounded-xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      
      {/* HEADER */}
      <div className="p-5 border-b border-gray-800 bg-gray-950/50">
        <div className="flex items-center justify-between">
          <h4 className="text-gray-200 text-sm uppercase font-bold tracking-wider flex items-center gap-2">
            <Lock size={16} className={canDeliver ? 'text-cyan-400' : 'text-gray-500'} />
            Protocolo de Salida
          </h4>
          <span className="bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs font-mono border border-gray-700">
            #{order.folio || order.id.slice(0, 6)}
          </span>
        </div>
      </div>

      <div className="p-5 overflow-y-auto custom-scrollbar">
        
        {/* ALERTA DEUDA */}
        {!isDebtFree ? (
          <div className="bg-red-950/30 border border-red-500/50 rounded-lg p-4 mb-5 flex gap-3 animate-pulse">
            <XCircle className="text-red-500 shrink-0 mt-1" size={24} />
            <div>
              <h5 className="text-red-400 font-bold text-sm uppercase">Entrega Bloqueada</h5>
              <p className="text-red-300/80 text-xs mt-1">
                Cliente debe: <span className="font-mono bg-red-900 px-1 rounded text-white">${order.balance.toLocaleString()}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/30 p-3 rounded border border-emerald-900/50 mb-5 text-sm">
             <CheckCircle size={16} />
             <span className="font-medium">Cuenta al día. Habilitado para entrega.</span>
          </div>
        )}

        <div className={!isDebtFree ? 'opacity-50 pointer-events-none grayscale' : ''}>
          
          {/* PASO 1: CHECK FÍSICO */}
          <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border mb-3 select-none ${
            checks.physical 
              ? 'bg-cyan-950/30 border-cyan-500/50' 
              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
          }`}>
            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
              checks.physical ? 'bg-cyan-600 border-cyan-600' : 'border-gray-500'
            }`}>
              {checks.physical && <CheckCircle size={14} className="text-white" />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={checks.physical} 
              onChange={() => setChecks(p => ({...p, physical: !p.physical}))} 
            />
            <div>
              <span className="font-medium text-sm block text-gray-200">Inspección de Calidad</span>
              <span className="text-gray-500 text-xs block">Confirmé medidas, terminaciones y cantidad.</span>
            </div>
          </label>

          {/* PASO 2: EVIDENCIA */}
          <div className="mb-4">
            {!photoPreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="w-full h-32 border-2 border-dashed border-gray-700 hover:border-cyan-500/50 hover:bg-gray-800/50 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-500 transition-all group"
              >
                <div className="p-3 bg-gray-800 rounded-full group-hover:bg-cyan-950/50 transition-colors">
                  <Camera size={20} className="group-hover:text-cyan-400" />
                </div>
                <span className="text-xs font-medium">Tocar para tomar foto de evidencia</span>
              </button>
            ) : (
              <div className="relative group rounded-lg overflow-hidden border border-gray-700">
                <img 
                  src={photoPreview} 
                  alt="Evidence" 
                  className="w-full h-48 object-cover bg-gray-800"
                />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="bg-white text-gray-900 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                   >
                     <Camera size={14} /> Cambiar Foto
                   </button>
                </div>
                <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-lg">
                  <CheckCircle size={10} /> LISTO
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment" // Fuerza cámara trasera en móviles
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* NOTAS */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones finales (quién retira, estado del embalaje...)"
            className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none h-20 placeholder:text-gray-600 mb-4"
          />
        </div>

        {/* BARRA DE PROGRESO */}
        {isSubmitting && (
          <div className="mb-4 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
             <div className="flex justify-between text-xs mb-2">
               <span className="text-cyan-400 font-bold flex items-center gap-2">
                 <Loader2 size={12} className="animate-spin" /> Procesando entrega...
               </span>
               <span className="text-gray-400 font-mono">{uploadProgress}%</span>
             </div>
             <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 ease-out"
                 style={{ width: `${uploadProgress}%` }}
               />
             </div>
             <p className="text-[10px] text-gray-500 mt-2 text-center">
               {uploadProgress < 30 && "Optimizando imagen..."}
               {uploadProgress >= 30 && uploadProgress < 70 && "Subiendo evidencia segura..."}
               {uploadProgress >= 70 && "Firmando auditoría en base de datos..."}
             </p>
          </div>
        )}
      </div>

      {/* FOOTER ACCIONES */}
      <div className="p-5 border-t border-gray-800 bg-gray-950/50 mt-auto">
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 text-gray-400 hover:text-white text-xs font-bold uppercase transition-colors"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleDeliverClick}
            disabled={!canDeliver}
            className={`flex-[2] py-3 rounded-lg font-bold text-sm uppercase flex items-center justify-center gap-2 transition-all shadow-lg ${
              canDeliver 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/20 transform hover:-translate-y-0.5' 
                : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
            }`}
          >
            {isSubmitting ? 'Finalizando...' : (
              <>
                <FileCheck size={18} /> Confirmar Entrega
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};