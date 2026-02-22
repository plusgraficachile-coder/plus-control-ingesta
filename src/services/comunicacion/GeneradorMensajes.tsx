// ============================================================================
// UTILIDAD: Generador de Mensajes con Templates
// ============================================================================
// Sistema para generar mensajes personalizados de WhatsApp y Email
// Basado en templates configurables de Supabase
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TIPOS
// ============================================================================

interface Template {
  id: string;
  nombre: string;
  tipo: 'whatsapp' | 'email' | 'sms';
  asunto?: string;
  contenido: string;
  variables: string[];
}

interface Lead {
  id: string;
  nombre_negocio: string;
  telefono?: string;
  email?: string;
  gap_coherencia?: string;
  argumento_venta?: string;
  puntos_dolor?: { tipo: string; gravedad: string }[];
}

interface DatosTemplate {
  nombre_contacto?: string;
  mi_nombre: string;
  nombre_negocio: string;
  ciudad: string;
  gap_principal?: string;
  dolor_especifico?: string;
  gap_coherencia?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// CLASE: GeneradorMensajes
// ============================================================================

export class GeneradorMensajes {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Obtiene un template de la base de datos
   */
  async obtenerTemplate(nombre: string): Promise<Template | null> {
    try {
      const { data, error } = await this.supabase
        .from('templates_comunicacion')
        .select('*')
        .eq('nombre', nombre)
        .eq('activo', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo template:', error);
      return null;
    }
  }

  /**
   * Reemplaza variables en un template con datos reales
   */
  private reemplazarVariables(contenido: string, datos: DatosTemplate): string {
    let resultado = contenido;

    // Reemplazar cada variable {nombre_variable}
    Object.keys(datos).forEach((key) => {
      const valor = datos[key] || `[${key}]`; // Si no existe, dejar el placeholder
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      resultado = resultado.replace(regex, valor);
    });

    return resultado;
  }

  /**
   * Genera un mensaje de WhatsApp basado en template
   */
  async generarMensajeWhatsApp(
    templateNombre: string,
    lead: Lead,
    datosAdicionales: Partial<DatosTemplate> = {}
  ): Promise<{ mensaje: string; telefono: string } | null> {
    const template = await this.obtenerTemplate(templateNombre);
    if (!template || template.tipo !== 'whatsapp') {
      console.error('Template de WhatsApp no encontrado');
      return null;
    }

    if (!lead.telefono) {
      console.error('Lead no tiene teléfono');
      return null;
    }

    // Preparar datos
    const datos: DatosTemplate = {
      nombre_negocio: lead.nombre_negocio,
      gap_principal: lead.gap_coherencia || 'tiene oportunidades de mejora',
      dolor_especifico:
        lead.puntos_dolor?.[0]?.tipo || 'puntos de optimización detectados',
      ...datosAdicionales,
    };

    // Generar mensaje
    const mensaje = this.reemplazarVariables(template.contenido, datos);

    // Limpiar teléfono (solo números)
    const telefonoLimpio = lead.telefono.replace(/\D/g, '');

    return {
      mensaje,
      telefono: telefonoLimpio,
    };
  }

  /**
   * Genera un email basado en template
   */
  async generarEmail(
    templateNombre: string,
    lead: Lead,
    datosAdicionales: Partial<DatosTemplate> = {}
  ): Promise<{ asunto: string; cuerpo: string; destinatario: string } | null> {
    const template = await this.obtenerTemplate(templateNombre);
    if (!template || template.tipo !== 'email') {
      console.error('Template de email no encontrado');
      return null;
    }

    if (!lead.email) {
      console.error('Lead no tiene email');
      return null;
    }

    // Preparar datos
    const datos: DatosTemplate = {
      nombre_negocio: lead.nombre_negocio,
      gap_coherencia: lead.gap_coherencia || 'oportunidades de mejora detectadas',
      ...datosAdicionales,
    };

    // Generar contenido
    const asunto = this.reemplazarVariables(template.asunto || 'Contacto', datos);
    const cuerpo = this.reemplazarVariables(template.contenido, datos);

    return {
      asunto,
      cuerpo,
      destinatario: lead.email,
    };
  }

  /**
   * Abre WhatsApp Web con mensaje pre-llenado
   * IMPORTANTE: Abre en ventana del navegador, NO envía automáticamente
   */
  abrirWhatsApp(telefono: string, mensaje: string): void {
    const mensajeCodificado = encodeURIComponent(mensaje);
    const url = `https://wa.me/${telefono}?text=${mensajeCodificado}`;
    window.open(url, '_blank');
  }

  /**
   * Abre cliente de email local con datos pre-llenados
   * IMPORTANTE: Abre Gmail/Outlook local, NO envía automáticamente
   */
  abrirEmail(destinatario: string, asunto: string, cuerpo: string): void {
    const asuntoCodificado = encodeURIComponent(asunto);
    const cuerpoCodificado = encodeURIComponent(cuerpo);
    const url = `mailto:${destinatario}?subject=${asuntoCodificado}&body=${cuerpoCodificado}`;
    window.location.href = url;
  }
}

// ============================================================================
// COMPONENTE REACT: EditorMensaje
// ============================================================================

import React, { useState, useEffect } from 'react';

interface EditorMensajeProps {
  lead: Lead;
  tipo: 'whatsapp' | 'email';
  templateNombre: string;
  generador: GeneradorMensajes;
  datosUsuario: {
    mi_nombre: string;
    ciudad: string;
  };
  onCerrar: () => void;
}

export const EditorMensaje: React.FC<EditorMensajeProps> = ({
  lead,
  tipo,
  templateNombre,
  generador,
  datosUsuario,
  onCerrar,
}) => {
  const [mensaje, setMensaje] = useState('');
  const [asunto, setAsunto] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarTemplate = async () => {
      setCargando(true);

      if (tipo === 'whatsapp') {
        const resultado = await generador.generarMensajeWhatsApp(
          templateNombre,
          lead,
          datosUsuario
        );
        if (resultado) {
          setMensaje(resultado.mensaje);
        }
      } else {
        const resultado = await generador.generarEmail(
          templateNombre,
          lead,
          datosUsuario
        );
        if (resultado) {
          setAsunto(resultado.asunto);
          setMensaje(resultado.cuerpo);
        }
      }

      setCargando(false);
    };

    cargarTemplate();
  }, [tipo, templateNombre, lead, generador, datosUsuario]);

  const handleEnviar = () => {
    if (tipo === 'whatsapp' && lead.telefono) {
      generador.abrirWhatsApp(lead.telefono, mensaje);
    } else if (tipo === 'email' && lead.email) {
      generador.abrirEmail(lead.email, asunto, mensaje);
    }
    onCerrar();
  };

  if (cargando) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-white">Generando mensaje...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white">
              {tipo === 'whatsapp' ? '📱 WhatsApp' : '✉️ Email'} a {lead.nombre_negocio}
            </h2>
            <button
              className="text-gray-400 hover:text-white text-2xl"
              onClick={onCerrar}
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-400">
            Edita el mensaje antes de enviar. Se abrirá en tu cliente local.
          </p>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto flex-1">
          {tipo === 'email' && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Asunto
              </label>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded focus:border-cyan-500 focus:outline-none"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Mensaje
            </label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded focus:border-cyan-500 focus:outline-none resize-none"
              rows={tipo === 'whatsapp' ? 8 : 12}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />
          </div>

          <div className="mt-4 bg-amber-900 bg-opacity-30 border border-amber-600 rounded p-3">
            <div className="text-amber-400 text-sm font-semibold mb-1">
              ⚠️ Importante
            </div>
            <div className="text-amber-200 text-xs">
              {tipo === 'whatsapp'
                ? 'Se abrirá WhatsApp Web. Revisa el mensaje antes de presionar ENVIAR.'
                : 'Se abrirá tu cliente de email (Gmail/Outlook). Revisa antes de enviar.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded font-semibold transition-colors"
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button
            className={`flex-1 ${
              tipo === 'whatsapp'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white py-3 rounded font-semibold transition-colors`}
            onClick={handleEnviar}
          >
            {tipo === 'whatsapp' ? '📱 Abrir WhatsApp' : '✉️ Abrir Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HOOK PERSONALIZADO
// ============================================================================

export const useGeneradorMensajes = (supabaseUrl: string, supabaseKey: string) => {
  const [generador] = useState(() => new GeneradorMensajes(supabaseUrl, supabaseKey));

  return generador;
};

// ============================================================================
// EJEMPLO DE USO
// ============================================================================

/*
// En tu componente RadarDeNegocios.tsx:

import { GeneradorMensajes, EditorMensaje, useGeneradorMensajes } from './GeneradorMensajes';

// Dentro del componente:
const generador = useGeneradorMensajes(supabaseUrl, supabaseKey);
const [modalMensaje, setModalMensaje] = useState<{
  visible: boolean;
  tipo: 'whatsapp' | 'email';
  lead: Lead | null;
} | null>(null);

// Botón de WhatsApp:
<button
  onClick={() => setModalMensaje({
    visible: true,
    tipo: 'whatsapp',
    lead: selectedLead
  })}
>
  📱 WhatsApp
</button>

// Renderizar modal:
{modalMensaje?.visible && modalMensaje.lead && (
  <EditorMensaje
    lead={modalMensaje.lead}
    tipo={modalMensaje.tipo}
    templateNombre={
      modalMensaje.tipo === 'whatsapp'
        ? 'whatsapp_gap_web'
        : 'email_diagnostico_adjunto'
    }
    generador={generador}
    datosUsuario={{
      mi_nombre: 'Luis Silva',
      ciudad: 'Temuco'
    }}
    onCerrar={() => setModalMensaje(null)}
  />
)}
*/
