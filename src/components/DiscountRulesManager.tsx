import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, Save, X, AlertTriangle, TrendingDown } from 'lucide-react';

export const DiscountRulesManager = ({ dark }: { dark: boolean }) => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estado del formulario
  const [form, setForm] = useState({
    id: null,
    nombre_regla: '',
    rango_min_m2: 0,
    rango_max_m2: 0,
    porcentaje_descuento: 0
  });

  // Cargar reglas al iniciar
  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reglas_descuento_volumen')
        .select('*')
        .order('rango_min_m2', { ascending: true }); // Orden vital para entender la lógica

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      toast.error('Error cargando reglas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  // Guardar (Crear o Editar)
  const handleSave = async () => {
    if (!form.nombre_regla) return toast.error('Ponle un nombre a la regla');
    if (form.rango_min_m2 >= form.rango_max_m2) return toast.error('El rango mínimo debe ser menor al máximo');

    try {
      const payload = {
        nombre_regla: form.nombre_regla,
        rango_min_m2: Number(form.rango_min_m2),
        rango_max_m2: Number(form.rango_max_m2),
        porcentaje_descuento: Number(form.porcentaje_descuento)
      };

      if (form.id) {
        // Actualizar
        const { error } = await supabase.from('reglas_descuento_volumen').update(payload).eq('id', form.id);
        if (error) throw error;
        toast.success('Regla actualizada correctamente');
      } else {
        // Crear
        const { error } = await supabase.from('reglas_descuento_volumen').insert([payload]);
        if (error) throw error;
        toast.success('Nueva regla de descuento creada');
      }

      setIsEditing(false);
      fetchRules(); // Recargar lista
      resetForm();

    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Eliminar
  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro de borrar esta regla? Esto afectará los cálculos automáticos.')) return;
    try {
      const { error } = await supabase.from('reglas_descuento_volumen').delete().eq('id', id);
      if (error) throw error;
      toast.success('Regla eliminada');
      setRules(rules.filter(r => r.id !== id));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => setForm({ id: null, nombre_regla: '', rango_min_m2: 0, rango_max_m2: 100, porcentaje_descuento: 5 });

  const themeCard = dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800';
  const themeInput = dark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-800';

  return (
    <div className={`p-6 rounded-xl border shadow-sm ${themeCard} max-w-4xl mx-auto animate-fade-in`}>
      <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingDown className="text-cyan-500" /> Reglas de Descuento Automático
          </h2>
          <p className="text-xs text-slate-400 mt-1">Define cuánto descuento aplicar según los m² totales.</p>
        </div>
        {!isEditing && (
          <button onClick={() => { resetForm(); setIsEditing(true); }} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
            <Plus size={18} /> Nueva Regla
          </button>
        )}
      </div>

      {/* FORMULARIO DE EDICIÓN */}
      {isEditing && (
        <div className={`mb-6 p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-1">
              <label className="text-xs font-bold uppercase mb-1 block opacity-70">Nombre Regla</label>
              <input type="text" className={`w-full p-2 rounded border ${themeInput}`} placeholder="Ej: Mayorista Nivel 1" value={form.nombre_regla} onChange={e => setForm({ ...form, nombre_regla: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase mb-1 block opacity-70">Desde (m²)</label>
              <input type="number" className={`w-full p-2 rounded border ${themeInput}`} value={form.rango_min_m2} onChange={e => setForm({ ...form, rango_min_m2: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase mb-1 block opacity-70">Hasta (m²)</label>
              <input type="number" className={`w-full p-2 rounded border ${themeInput}`} value={form.rango_max_m2} onChange={e => setForm({ ...form, rango_max_m2: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-bold text-cyan-500 uppercase mb-1 block">Descuento (%)</label>
              <input type="number" className={`w-full p-2 rounded border border-cyan-500/50 font-bold text-cyan-600 ${themeInput}`} value={form.porcentaje_descuento} onChange={e => setForm({ ...form, porcentaje_descuento: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg border border-slate-500 text-slate-400 hover:bg-slate-700/50 flex items-center gap-2"><X size={16} /> Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold flex items-center gap-2"><Save size={16} /> Guardar Regla</button>
          </div>
        </div>
      )}

      {/* LISTA DE REGLAS */}
      <div className="space-y-2">
        {loading ? <div className="text-center py-10 opacity-50">Cargando reglas...</div> : rules.length === 0 ? (
          <div className="text-center py-10 opacity-50 border-2 border-dashed border-slate-600 rounded-lg">
            <AlertTriangle className="mx-auto mb-2 text-amber-500" />
            No hay reglas definidas. El sistema no aplicará descuentos automáticos.
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className={`flex flex-col md:flex-row justify-between items-center p-3 rounded-lg border hover:border-cyan-500/50 transition-colors group ${dark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-4 mb-2 md:mb-0 w-full md:w-auto">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${dark ? 'bg-slate-800 text-cyan-400' : 'bg-white text-cyan-600 shadow-sm'}`}>
                  {rule.porcentaje_descuento}%
                </div>
                <div>
                  <div className="font-bold text-sm">{rule.nombre_regla}</div>
                  <div className="text-xs opacity-60 font-mono">
                    Rango: {rule.rango_min_m2}m² ➝ {rule.rango_max_m2 > 9000 ? '∞' : rule.rango_max_m2 + 'm²'}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setForm(rule); setIsEditing(true); }} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-full"><Edit size={16}/></button>
                <button onClick={() => handleDelete(rule.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full"><Trash2 size={16}/></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};