// src/hooks/useDeliverySubmission.ts

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DeliverySubmissionParams {
  orderId: string;
  evidenceFile: File;
  auditPayload: {
    action: string;
    performedBy: string;
    performedAt: string;
    financialSnapshot: {
      orderTotal: number;
      balance: number;
      paymentStatus: string;
    };
    operationalChecklist: {
      physicalCheck: boolean;
      photoEvidence: boolean;
      clientNotified: boolean;
    };
    evidenceUrl: string;
    metadata: {
      userAgent: string;
      ipAddress: string | null;
    };
  };
}

interface SubmissionResult {
  success: boolean;
  evidenceUrl?: string;
  auditLogId?: string;
  error?: string;
}

export function useDeliverySubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const submitDelivery = async (
    params: DeliverySubmissionParams
  ): Promise<SubmissionResult> => {
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // =============================================
      // PASO 1: SUBIR FOTO AL STORAGE
      // =============================================
      const timestamp = Date.now();
      const fileExt = params.evidenceFile.name.split('.').pop();
      const fileName = `${params.orderId}/${timestamp}-delivery.${fileExt}`;

      console.log('📤 Subiendo evidencia:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-delivery-evidence')
        .upload(fileName, params.evidenceFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ Error subiendo foto:', uploadError);
        throw new Error(`Error al subir evidencia: ${uploadError.message}`);
      }

      setUploadProgress(50);

      // =============================================
      // PASO 2: OBTENER URL DE LA EVIDENCIA
      // =============================================
      const { data: urlData } = supabase.storage
        .from('order-delivery-evidence')
        .getPublicUrl(fileName);

      const evidenceUrl = urlData.publicUrl;

      console.log('🔗 URL de evidencia:', evidenceUrl);

      setUploadProgress(75);

      // =============================================
      // PASO 3: ACTUALIZAR PAYLOAD CON URL REAL
      // =============================================
      const finalPayload = {
        ...params.auditPayload,
        evidenceUrl,
      };

      // =============================================
      // PASO 4: EJECUTAR RPC (Transacción Atómica)
      // =============================================
      console.log('⚡ Ejecutando RPC close_order_with_audit...');

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'close_order_with_audit',
        {
          p_order_id: params.orderId,
          p_audit_payload: finalPayload,
          p_final_status: 'delivered',
        }
      );

      if (rpcError) {
        console.error('❌ Error en RPC:', rpcError);
        
        // LIMPIEZA: Intentar borrar la foto huérfana
        console.log('🧹 Limpiando foto huérfana...');
        await supabase.storage
          .from('order-delivery-evidence')
          .remove([fileName]);

        throw new Error(`Error al cerrar orden: ${rpcError.message}`);
      }

      setUploadProgress(100);

      console.log('✅ Entrega completada:', rpcData);

      return {
        success: true,
        evidenceUrl,
        auditLogId: rpcData?.audit_id,
      };

    } catch (error) {
      console.error('💥 Error completo en submitDelivery:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    } finally {
      setIsSubmitting(false);
      // Reset progress después de 1 segundo
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return {
    submitDelivery,
    isSubmitting,
    uploadProgress,
  };
}