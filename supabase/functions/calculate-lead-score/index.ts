// ============================================================================
// EDGE FUNCTION: calculate-lead-score
// ============================================================================
// Calcula el score de un lead basándose en pesos configurables
// Ruta: /functions/calculate-lead-score
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScoringPesos {
  error_critico_visible: number
  capacidad_pago: number
  dependencia_plataforma: number
  fachada_obsoleta: number
  baja_conversion: number
}

interface Lead {
  id: string
  capacidad_pago: 'ALTA' | 'MEDIA' | 'BAJA' | 'DESCONOCIDA'
  urgencia_nivel: number
}

interface Auditoria {
  tiene_dominio_propio: boolean
  seo_nivel: 'ALTO' | 'MEDIO' | 'BAJO' | 'NULO'
  dependencia_plataforma: number
  estado_letrero: string
  tiene_agenda_online: boolean
  tiene_whatsapp_integrado: boolean
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { leadId } = await req.json()

    if (!leadId) {
      throw new Error('leadId es requerido')
    }

    // 1. Obtener pesos configurables
    const { data: config, error: configError } = await supabaseClient
      .from('config_taller')
      .select('valor')
      .eq('clave', 'scoring_pesos')
      .single()

    if (configError) throw configError

    const pesos: ScoringPesos = config.valor

    // 2. Obtener datos del lead
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads_estrategicos')
      .select('id, capacidad_pago, urgencia_nivel')
      .eq('id', leadId)
      .single()

    if (leadError) throw leadError

    // 3. Obtener auditoría
    const { data: auditoria, error: auditoriaError } = await supabaseClient
      .from('auditorias_tacticas')
      .select('*')
      .eq('lead_id', leadId)
      .single()

    if (auditoriaError && auditoriaError.code !== 'PGRST116') {
      throw auditoriaError
    }

    if (!auditoria) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Lead no auditado aún',
          score: null,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // 4. CALCULAR SCORE
    let score = 0
    const desglose: Record<string, number> = {}

    // Error crítico visible (+40 por defecto)
    if (
      auditoria.tiene_dominio_propio === false ||
      auditoria.seo_nivel === 'NULO'
    ) {
      const puntos = pesos.error_critico_visible
      score += puntos
      desglose.error_critico = puntos
    }

    // Capacidad de pago (+25 por defecto)
    if (lead.capacidad_pago === 'ALTA') {
      const puntos = pesos.capacidad_pago
      score += puntos
      desglose.capacidad_pago = puntos
    }

    // Dependencia de plataforma (+15 por defecto)
    if (auditoria.dependencia_plataforma >= 80) {
      const puntos = pesos.dependencia_plataforma
      score += puntos
      desglose.dependencia_plataforma = puntos
    }

    // Fachada obsoleta (+10 por defecto)
    if (['MALO', 'OBSOLETO'].includes(auditoria.estado_letrero)) {
      const puntos = pesos.fachada_obsoleta
      score += puntos
      desglose.fachada_obsoleta = puntos
    }

    // Baja conversión (+10 por defecto)
    if (
      auditoria.tiene_agenda_online === false &&
      auditoria.tiene_whatsapp_integrado === false
    ) {
      const puntos = pesos.baja_conversion
      score += puntos
      desglose.baja_conversion = puntos
    }

    // Limitar a 100
    const scoreFinal = Math.min(score, 100)

    // 5. Calcular IV y NC
    // IV (Impacto Visual) = Suma de puntos físicos
    let iv = 0
    if (auditoria.estado_letrero === 'OBSOLETO') iv += 40
    if (auditoria.iluminacion_nocturna === false) iv += 30
    if (auditoria.coherencia_digital_fisica === 'BAJA') iv += 30
    const ivFinal = Math.min(iv, 100)

    // NC (Nivel Corporativo) = Suma de puntos digitales
    let nc = 0
    if (auditoria.tiene_dominio_propio === false) nc += 40
    if (auditoria.seo_nivel === 'NULO') nc += 30
    if (auditoria.dependencia_plataforma >= 80) nc += 30
    const ncFinal = Math.min(nc, 100)

    // 6. Actualizar el lead con IV y NC (el score_total se calcula automáticamente)
    const { error: updateError } = await supabaseClient
      .from('leads_estrategicos')
      .update({
        iv: ivFinal,
        nc: ncFinal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        success: true,
        score: scoreFinal,
        iv: ivFinal,
        nc: ncFinal,
        desglose,
        pesos_usados: pesos,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
