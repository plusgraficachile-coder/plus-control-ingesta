// ============================================================================
// COMPONENTE: CotizacionExpress.tsx — Aduana de Rentabilidad
// Intercepta el flujo antes de generar PDF. Obliga a cuantificar el costo
// y bloquea propuestas por debajo del margen mínimo configurado.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, TrendingUp, Calculator, Send, ChevronDown } from 'lucide-react';

interface Props {
  lead: {
    id: string;
    nombre_negocio: string;
    ticket_estimado?: number | null;
    rubro?: string;
    costo_directo?: number | null;
    valor_propuesta_final?: number | null;
    margen_minimo_obj?: number | null;
  };
  dark?: boolean;
  onGenerarPDF: (costo: number, precio: number, margen: number) => void;
  onCerrar: () => void;
}

export const CotizacionExpress: React.FC<Props> = ({ lead, dark = true, onGenerarPDF, onCerrar }) => {
  const esMercadoPublico = lead.rubro === 'Licitación Mercado Público';

  // Umbral dinámico: MP = 35%, privado = 50%
  const umbralDefault = esMercadoPublico ? 35 : 50;
  const [umbral, setUmbral]         = useState(lead.margen_minimo_obj ?? umbralDefault);
  const [costo, setCosto]           = useState(lead.costo_directo ?? 0);
  const [precio, setPrecio]         = useState(lead.valor_propuesta_final ?? lead.ticket_estimado ?? 0);
  const [horas, setHoras]           = useState(0);
  const [costoHora, setCostoHora]   = useState(15000); // CLP/hora estándar
  const [forzar, setForzar]         = useState(false);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando]   = useState(false);

  // Costo directo = materiales + mano de obra
  const costoTotal = useMemo(() => costo + (horas * costoHora), [costo, horas, costoHora]);

  // Margen real = (precio - costo) / precio × 100
  const margenReal = useMemo(() =>
    precio > 0 ? ((precio - costoTotal) / precio) * 100 : 0,
  [precio, costoTotal]);

  // Precio mínimo para alcanzar el umbral: costo / (1 - umbral/100)
  const precioMinimo = useMemo(() =>
    costoTotal > 0 ? Math.ceil(costoTotal / (1 - umbral / 100)) : 0,
  [costoTotal, umbral]);

  const utilidad = precio - costoTotal;
  const esRentable = margenReal >= umbral;
  const puedeEmitir = precio > 0 && costoTotal > 0 && (esRentable || (forzar && comentario.trim().length > 10));

  // Tokens de color
  const t = {
    bg:       dark ? 'bg-[#0f172a]'          : 'bg-white',
    card:     dark ? 'bg-[#1e293b]'          : 'bg-slate-50',
    border:   dark ? 'border-slate-700'      : 'border-slate-200',
    text:     dark ? 'text-white'            : 'text-slate-800',
    textSub:  dark ? 'text-slate-400'        : 'text-slate-500',
    input:    dark ? 'bg-slate-900 border-slate-600 text-white focus:border-cyan-500' : 'bg-white border-slate-300 text-slate-800 focus:border-cyan-500',
    label:    dark ? 'text-slate-400'        : 'text-slate-500',
  };

  const guardarYGenerar = async () => {
    setGuardando(true);
    await supabase.from('leads_estrategicos').update({
      costo_directo:         costoTotal,
      valor_propuesta_final: precio,
      margen_minimo_obj:     umbral,
      forzar_comentario:     forzar ? comentario : null,
    }).eq('id', lead.id);
    setGuardando(false);
    onGenerarPDF(costoTotal, precio, margenReal);
  };

  return (
    <div className={`border rounded-2xl overflow-hidden ${t.card} ${t.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-cyan-400" />
          <span className={`font-black text-sm uppercase tracking-wide text-cyan-400`}>
            Aduana de Rentabilidad
          </span>
        </div>
        <button onClick={onCerrar} className={`text-xs ${t.textSub} hover:text-white transition-colors`}>✕</button>
      </div>

      <div className="p-4 space-y-4">

        {/* Umbral dinámico */}
        <div className={`flex items-center justify-between text-xs ${t.textSub}`}>
          <span>Umbral mínimo ({esMercadoPublico ? 'Mercado Público' : 'Privado'})</span>
          <div className="flex items-center gap-1">
            <input
              type="number" min="10" max="80" step="5"
              value={umbral}
              onChange={e => setUmbral(Number(e.target.value))}
              className={`w-14 text-right text-xs rounded border px-1 py-0.5 outline-none ${t.input}`}
            />
            <span>%</span>
          </div>
        </div>

        {/* Costos */}
        <div className="space-y-3">
          <div>
            <label className={`text-[10px] uppercase font-bold block mb-1 ${t.label}`}>
              Materiales / Costos directos
            </label>
            <input
              type="number" min="0" step="1000"
              value={costo || ''}
              placeholder="0"
              onChange={e => setCosto(Number(e.target.value))}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${t.input}`}
            />
          </div>

          {/* Mano de obra */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-[10px] uppercase font-bold block mb-1 ${t.label}`}>Horas HH</label>
              <input
                type="number" min="0" step="0.5"
                value={horas || ''}
                placeholder="0"
                onChange={e => setHoras(Number(e.target.value))}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${t.input}`}
              />
            </div>
            <div>
              <label className={`text-[10px] uppercase font-bold block mb-1 ${t.label}`}>$/hora</label>
              <input
                type="number" min="0" step="1000"
                value={costoHora || ''}
                placeholder="15000"
                onChange={e => setCostoHora(Number(e.target.value))}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${t.input}`}
              />
            </div>
          </div>

          {/* Costo total calculado */}
          {(horas > 0) && (
            <div className={`text-xs ${t.textSub} flex justify-between px-1`}>
              <span>Costo total (mat. + HH)</span>
              <span className={`font-bold ${t.text}`}>
                ${costoTotal.toLocaleString('es-CL')}
              </span>
            </div>
          )}
        </div>

        {/* Precio */}
        <div>
          <div className="flex justify-between items-end mb-1">
            <label className={`text-[10px] uppercase font-bold ${t.label}`}>
              Precio propuesto (sin IVA)
            </label>
            {precioMinimo > 0 && (
              <button
                onClick={() => setPrecio(precioMinimo)}
                className="text-[9px] text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-0.5"
              >
                <TrendingUp size={9} />
                Mín. ${precioMinimo.toLocaleString('es-CL')}
              </button>
            )}
          </div>
          <input
            type="number" min="0" step="10000"
            value={precio || ''}
            placeholder="0"
            onChange={e => setPrecio(Number(e.target.value))}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${t.input}`}
          />
        </div>

        {/* Semáforo de rentabilidad */}
        {precio > 0 && costoTotal > 0 && (
          <div className={`rounded-xl p-4 border transition-all ${
            esRentable
              ? 'bg-emerald-900/20 border-emerald-500/30'
              : 'bg-red-900/20 border-red-500/30'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm font-bold ${t.textSub}`}>Margen Real</span>
              <span className={`text-2xl font-black ${esRentable ? 'text-emerald-400' : 'text-red-400'}`}>
                {margenReal.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={t.textSub}>Utilidad bruta</span>
              <span className={`font-bold ${esRentable ? 'text-emerald-400' : 'text-red-400'}`}>
                ${utilidad.toLocaleString('es-CL')}
              </span>
            </div>
            {!esRentable && (
              <div className="mt-2 flex items-start gap-1.5">
                <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-red-400">
                  Margen bajo el umbral ({umbral}%). Precio mínimo recomendado: ${precioMinimo.toLocaleString('es-CL')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Forzar envío */}
        {precio > 0 && costoTotal > 0 && !esRentable && (
          <div>
            <button
              onClick={() => setForzar(!forzar)}
              className={`flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors`}
            >
              <ChevronDown size={12} className={`transition-transform ${forzar ? 'rotate-180' : ''}`} />
              Forzar envío (requiere justificación)
            </button>
            {forzar && (
              <textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                placeholder="Ej: Cliente estratégico, volumen asegurado para Q2. Margen bajo aceptado excepcionalmente..."
                className={`mt-2 w-full rounded-lg border px-3 py-2 text-xs outline-none resize-none h-20 transition-colors ${t.input}`}
              />
            )}
          </div>
        )}

        {/* Botón principal */}
        <button
          onClick={guardarYGenerar}
          disabled={!puedeEmitir || guardando}
          className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${
            puedeEmitir
              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {guardando
            ? 'Guardando...'
            : <><Send size={14} /> Validar y Generar PDF</>
          }
        </button>

        {!puedeEmitir && precio > 0 && costoTotal > 0 && !esRentable && !forzar && (
          <p className={`text-center text-[10px] ${t.textSub}`}>
            Ajusta el precio o justifica la excepción para continuar
          </p>
        )}
      </div>
    </div>
  );
};
