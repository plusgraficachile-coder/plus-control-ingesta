// ============================================================================
// COMPONENTE: WizardAuditoriaTactica.tsx
// ============================================================================
// Wizard tipo "Quick-Check" para auditar leads rápidamente
// Flujo: Swipe/Click → Auditar → Calcular Score → Siguiente
// ============================================================================

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase'; // ✅ Esta es la nueva
// ============================================================================
// TIPOS
// ============================================================================

interface Lead {
  id: string;
  folio: string;         // Requerido por el Wizard
  nombre_negocio: string;
  rubro: string;
  ciudad: string;        // Requerido por el Wizard
  score_total?: number;
  estado: 'raw' | 'validacion' | 'calificado' | 'cotizacion' | 'cerrado' | 'descartado';
  url_website?: string;
  url_google_maps?: string;
}

interface DatosAuditoria {
  // Digital
  tiene_dominio_propio: boolean;
  dominio_activo: boolean;
  tipo_web: string;
  web_responsive: boolean;
  web_velocidad: 'rapida' | 'media' | 'lenta';
  seo_nivel: 'ALTO' | 'MEDIO' | 'BAJO' | 'NULO';
  meta_title_optimizado: boolean;
  tiene_subpaginas: boolean;
  tiene_blog: boolean;
  snippet_defectuoso: boolean;
  dependencia_plataforma: number;
  plataformas_usadas: string[];
  tiene_agenda_online: boolean;
  tiene_ecommerce: boolean;
  tiene_whatsapp_integrado: boolean;
  solo_telefono: boolean;
  formulario_contacto: boolean;
  // Física
  visibilidad_calle: 'ALTA' | 'MEDIA' | 'BAJA' | 'NULA';
  iluminacion_nocturna: boolean;
  estado_letrero: 'EXCELENTE' | 'BUENO' | 'REGULAR' | 'MALO' | 'OBSOLETO';
  materiales_usados: string[];
  jerarquia_visual_clara: boolean;
  coherencia_digital_fisica: 'ALTA' | 'MEDIA' | 'BAJA' | 'NULA';
  accesibilidad_entrada: boolean;
  presencia_fisica: 'ALTA' | 'MEDIA' | 'BAJA' | 'OBSOLETA';
  // Meta
  notas_auditor: string;
}

interface WizardAuditoriaTacticaProps {
  lead: Lead;
  supabaseUrl: string;
  supabaseKey: string;
  userId: string;
  onCompletado: () => void;
  onCancelar: () => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const WizardAuditoriaTactica: React.FC<WizardAuditoriaTacticaProps> = ({
  lead,
  userId,
  onCompletado,
  onCancelar,
}) => {

  const [paso, setPaso] = useState(1);
  const totalPasos = 4;

  // Estado del formulario
  const [datos, setDatos] = useState<Partial<DatosAuditoria>>({
    plataformas_usadas: [],
    materiales_usados: [],
    notas_auditor: '',
  });

  const [guardando, setGuardando] = useState(false);

  // ============================================================================
  // ACTUALIZAR CAMPO
  // ============================================================================

  const actualizarCampo = (campo: keyof DatosAuditoria, valor: any) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  };

  const toggleArray = (campo: keyof DatosAuditoria, valor: string) => {
    const array = (datos[campo] as string[]) || [];
    if (array.includes(valor)) {
      actualizarCampo(
        campo,
        array.filter((v) => v !== valor)
      );
    } else {
      actualizarCampo(campo, [...array, valor]);
    }
  };

  // ============================================================================
  // GUARDAR AUDITORÍA
  // ============================================================================

  const guardarAuditoria = async () => {
    setGuardando(true);
    try {
      // 1. Guardar auditoría
      const { error: auditoriaError } = await supabase
        .from('auditorias_tacticas')
        .upsert({
          lead_id: lead.id,
          ...datos,
          auditado_por: userId,
          auditado_en: new Date().toISOString(),
        });

      if (auditoriaError) throw auditoriaError;

      // 2. Actualizar fecha de auditoría en lead
      const { error: leadError } = await supabase
        .from('leads_estrategicos')
        .update({
          auditado_at: new Date().toISOString(),
          estado: 'validacion', // Mover a validación
        })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      // 3. Calcular score (llamar edge function)
      const { error: scoreError } = await supabase.functions.invoke(
        'calculate-lead-score',
        {
          body: { leadId: lead.id },
        }
      );

      if (scoreError) throw scoreError;

      onCompletado();
    } catch (error) {
      console.error('Error guardando auditoría:', error);
      alert('Error al guardar la auditoría');
    } finally {
      setGuardando(false);
    }
  };

  // ============================================================================
  // RENDERIZAR PASOS
  // ============================================================================

  const renderPaso = () => {
    switch (paso) {
      case 1:
        return <PasoAuditoriaDigital datos={datos} actualizar={actualizarCampo} />;
      case 2:
        return (
          <PasoConversion
            datos={datos}
            actualizar={actualizarCampo}
            toggleArray={toggleArray}
          />
        );
      case 3:
        return <PasoAuditoriaFisica datos={datos} actualizar={actualizarCampo} />;
      case 4:
        return (
          <PasoCoherenciaYNotas
            datos={datos}
            actualizar={actualizarCampo}
            toggleArray={toggleArray}
          />
        );
      default:
        return null;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                🔍 Auditoría Táctica
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {lead.nombre_negocio} - {lead.rubro}
              </p>
            </div>
            <button
              className="text-gray-400 hover:text-white text-3xl"
              onClick={onCancelar}
            >
              ×
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((p) => (
              <div
                key={p}
                className={`flex-1 h-2 rounded ${
                  p <= paso ? 'bg-cyan-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Paso {paso} de {totalPasos}
          </div>
        </div>

        {/* Contenido del paso */}
        <div className="p-6 overflow-y-auto flex-1">{renderPaso()}</div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold disabled:opacity-50"
            onClick={() => setPaso(paso - 1)}
            disabled={paso === 1}
          >
            ← Anterior
          </button>

          {paso < totalPasos ? (
            <button
              className="flex-1 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded font-semibold"
              onClick={() => setPaso(paso + 1)}
            >
              Siguiente →
            </button>
          ) : (
            <button
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:opacity-50"
              onClick={guardarAuditoria}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : '✅ Guardar y Calcular Score'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PASO 1: AUDITORÍA DIGITAL
// ============================================================================

const PasoAuditoriaDigital: React.FC<{
  datos: Partial<DatosAuditoria>;
  actualizar: (campo: keyof DatosAuditoria, valor: any) => void;
}> = ({ datos, actualizar }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">🌐 Auditoría Digital</h3>

      {/* Dominio */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          ¿Tiene dominio propio?
        </label>
        <div className="flex gap-3">
          <button
            className={`flex-1 py-3 rounded font-semibold ${
              datos.tiene_dominio_propio === true
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
            onClick={() => actualizar('tiene_dominio_propio', true)}
          >
            ✅ Sí
          </button>
          <button
            className={`flex-1 py-3 rounded font-semibold ${
              datos.tiene_dominio_propio === false
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
            onClick={() => actualizar('tiene_dominio_propio', false)}
          >
            ❌ No
          </button>
        </div>
      </div>

      {/* Nivel SEO */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Nivel de SEO Local
        </label>
        <div className="grid grid-cols-4 gap-2">
          {['ALTO', 'MEDIO', 'BAJO', 'NULO'].map((nivel) => (
            <button
              key={nivel}
              className={`py-3 rounded font-semibold ${
                datos.seo_nivel === nivel
                  ? nivel === 'NULO'
                    ? 'bg-red-600 text-white'
                    : nivel === 'BAJO'
                    ? 'bg-orange-600 text-white'
                    : nivel === 'MEDIO'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
              onClick={() => actualizar('seo_nivel', nivel)}
            >
              {nivel}
            </button>
          ))}
        </div>
      </div>

      {/* Características técnicas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={datos.meta_title_optimizado || false}
              onChange={(e) =>
                actualizar('meta_title_optimizado', e.target.checked)
              }
            />
            <span className="text-gray-300">Meta title optimizado</span>
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={datos.tiene_subpaginas || false}
              onChange={(e) => actualizar('tiene_subpaginas', e.target.checked)}
            />
            <span className="text-gray-300">Tiene subpáginas</span>
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={datos.tiene_blog || false}
              onChange={(e) => actualizar('tiene_blog', e.target.checked)}
            />
            <span className="text-gray-300">Tiene blog activo</span>
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={datos.snippet_defectuoso || false}
              onChange={(e) => actualizar('snippet_defectuoso', e.target.checked)}
            />
            <span className="text-gray-300">Snippet defectuoso</span>
          </label>
        </div>
      </div>

      {/* Velocidad web */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Velocidad de carga
        </label>
        <div className="grid grid-cols-3 gap-2">
          {['rapida', 'media', 'lenta'].map((vel) => (
            <button
              key={vel}
              className={`py-3 rounded font-semibold capitalize ${
                datos.web_velocidad === vel
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
              onClick={() => actualizar('web_velocidad', vel)}
            >
              {vel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PASO 2: CONVERSIÓN Y DEPENDENCIA
// ============================================================================

const PasoConversion: React.FC<{
  datos: Partial<DatosAuditoria>;
  actualizar: (campo: keyof DatosAuditoria, valor: any) => void;
  toggleArray: (campo: keyof DatosAuditoria, valor: string) => void;
}> = ({ datos, actualizar, toggleArray }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">💰 Conversión y Dependencia</h3>

      {/* Herramientas de conversión */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-3">
          Herramientas de conversión
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={datos.tiene_agenda_online || false}
              onChange={(e) => actualizar('tiene_agenda_online', e.target.checked)}
            />
            <span className="text-gray-300">📅 Agenda online</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={datos.tiene_ecommerce || false}
              onChange={(e) => actualizar('tiene_ecommerce', e.target.checked)}
            />
            <span className="text-gray-300">🛒 Ecommerce</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={datos.tiene_whatsapp_integrado || false}
              onChange={(e) =>
                actualizar('tiene_whatsapp_integrado', e.target.checked)
              }
            />
            <span className="text-gray-300">📱 WhatsApp integrado</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={datos.formulario_contacto || false}
              onChange={(e) => actualizar('formulario_contacto', e.target.checked)}
            />
            <span className="text-gray-300">📧 Formulario de contacto</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={datos.solo_telefono || false}
              onChange={(e) => actualizar('solo_telefono', e.target.checked)}
            />
            <span className="text-gray-300">☎️ Solo teléfono</span>
          </label>
        </div>
      </div>

      {/* Dependencia de plataforma */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          % Dependencia de plataformas externas
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={datos.dependencia_plataforma || 0}
          onChange={(e) =>
            actualizar('dependencia_plataforma', parseInt(e.target.value))
          }
          className="w-full"
        />
        <div className="flex justify-between text-sm text-gray-400 mt-1">
          <span>0%</span>
          <span className="text-white font-bold">
            {datos.dependencia_plataforma || 0}%
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* Plataformas usadas */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Plataformas que usa
        </label>
        <div className="flex flex-wrap gap-2">
          {['Portal.cl', 'Yapo.cl', 'Mercado Libre', 'Instagram', 'Facebook'].map(
            (plat) => (
              <button
                key={plat}
                className={`px-4 py-2 rounded font-semibold ${
                  datos.plataformas_usadas?.includes(plat)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
                onClick={() => toggleArray('plataformas_usadas', plat)}
              >
                {plat}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PASO 3: AUDITORÍA FÍSICA
// ============================================================================

const PasoAuditoriaFisica: React.FC<{
  datos: Partial<DatosAuditoria>;
  actualizar: (campo: keyof DatosAuditoria, valor: any) => void;
}> = ({ datos, actualizar }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">🏪 Auditoría Física</h3>

      {/* Visibilidad */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Visibilidad desde la calle
        </label>
        <div className="grid grid-cols-4 gap-2">
          {['ALTA', 'MEDIA', 'BAJA', 'NULA'].map((vis) => (
            <button
              key={vis}
              className={`py-3 rounded font-semibold ${
                datos.visibilidad_calle === vis
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
              onClick={() => actualizar('visibilidad_calle', vis)}
            >
              {vis}
            </button>
          ))}
        </div>
      </div>

      {/* Estado del letrero */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Estado del letrero
        </label>
        <div className="grid grid-cols-5 gap-2">
          {['EXCELENTE', 'BUENO', 'REGULAR', 'MALO', 'OBSOLETO'].map((est) => (
            <button
              key={est}
              className={`py-3 rounded font-semibold text-xs ${
                datos.estado_letrero === est
                  ? est === 'OBSOLETO' || est === 'MALO'
                    ? 'bg-red-600 text-white'
                    : est === 'REGULAR'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
              onClick={() => actualizar('estado_letrero', est)}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* Características */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5"
            checked={datos.iluminacion_nocturna || false}
            onChange={(e) => actualizar('iluminacion_nocturna', e.target.checked)}
          />
          <span className="text-gray-300">💡 Iluminación nocturna</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5"
            checked={datos.jerarquia_visual_clara || false}
            onChange={(e) =>
              actualizar('jerarquia_visual_clara', e.target.checked)
            }
          />
          <span className="text-gray-300">🎯 Jerarquía visual clara</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5"
            checked={datos.accesibilidad_entrada || false}
            onChange={(e) => actualizar('accesibilidad_entrada', e.target.checked)}
          />
          <span className="text-gray-300">🚪 Entrada accesible</span>
        </label>
      </div>

      {/* Presencia física general */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Presencia física general
        </label>
        <div className="grid grid-cols-4 gap-2">
          {['ALTA', 'MEDIA', 'BAJA', 'OBSOLETA'].map((pres) => (
            <button
              key={pres}
              className={`py-3 rounded font-semibold ${
                datos.presencia_fisica === pres
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
              onClick={() => actualizar('presencia_fisica', pres)}
            >
              {pres}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PASO 4: COHERENCIA Y NOTAS
// ============================================================================

const PasoCoherenciaYNotas: React.FC<{
  datos: Partial<DatosAuditoria>;
  actualizar: (campo: keyof DatosAuditoria, valor: any) => void;
  toggleArray: (campo: keyof DatosAuditoria, valor: string) => void;
}> = ({ datos, actualizar, toggleArray }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">🎯 Coherencia Digital-Física</h3>

      {/* Nivel de coherencia */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          ¿Qué tan coherente es su presencia digital vs física?
        </label>
        <div className="grid grid-cols-4 gap-2">
          {['ALTA', 'MEDIA', 'BAJA', 'NULA'].map((coh) => (
            <button
              key={coh}
              className={`py-3 rounded font-semibold ${
                datos.coherencia_digital_fisica === coh
                  ? coh === 'NULA' || coh === 'BAJA'
                    ? 'bg-red-600 text-white'
                    : coh === 'MEDIA'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
              onClick={() => actualizar('coherencia_digital_fisica', coh)}
            >
              {coh}
            </button>
          ))}
        </div>
      </div>

      {/* Materiales detectados */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Materiales de señalética
        </label>
        <div className="flex flex-wrap gap-2">
          {['Acrílico', 'LED', 'Vinilo', 'Madera', 'Metal', 'Neón'].map((mat) => (
            <button
              key={mat}
              className={`px-4 py-2 rounded font-semibold ${
                datos.materiales_usados?.includes(mat)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
              onClick={() => toggleArray('materiales_usados', mat)}
            >
              {mat}
            </button>
          ))}
        </div>
      </div>

      {/* Notas del auditor */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          📝 Notas de la auditoría
        </label>
        <textarea
          className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded focus:border-cyan-500 focus:outline-none resize-none"
          rows={6}
          placeholder="Escribe observaciones clave, gaps detectados, argumentos de venta, etc."
          value={datos.notas_auditor || ''}
          onChange={(e) => actualizar('notas_auditor', e.target.value)}
        />
      </div>

      {/* Resumen visual */}
      <div className="bg-cyan-900 bg-opacity-30 border border-cyan-600 rounded p-4">
        <div className="text-cyan-400 font-semibold mb-2">✨ Resumen Rápido</div>
        <div className="text-sm text-gray-300 space-y-1">
          <p>• Dominio: {datos.tiene_dominio_propio ? '✅ Sí' : '❌ No'}</p>
          <p>• SEO: {datos.seo_nivel || 'Sin definir'}</p>
          <p>
            • Letrero: {datos.estado_letrero || 'Sin definir'}
          </p>
          <p>
            • Coherencia: {datos.coherencia_digital_fisica || 'Sin definir'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WizardAuditoriaTactica;
