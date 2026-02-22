// ============================================================
// src/components/Settings.tsx
// CONFIGURACIÓN: Perfil + Gestión de Descuentos (VERSIÓN FINAL)
// ============================================================

import { useState } from 'react'; // ✅ Corregida la coma extra en el import
import { supabase } from '../services/supabaseClient';
import { 
  LogOut, Tag, Plus, Trash2, Loader2, Zap, Sparkles 
} from 'lucide-react'; // ✅ Eliminadas User y Shield que no se usaban
import { toast } from 'sonner';

const Settings = ({ dark, session, discountRules = [], onRefresh }: any) => {
  const [isAdding, setIsAdding] = useState(false);

  // --- 1. CIERRE DE SESIÓN ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sesión finalizada correctamente');
    window.location.reload();
  };

  // --- 2. GESTIÓN DE DESCUENTOS (BLINDADA) ---
  const handleAddRule = async () => {
    setIsAdding(true);
    try {
      // Usamos el nombre de tabla exacto que definimos en el SQL
      const { error } = await supabase
        .from('reglas_descuento_volumen')
        .insert([{ 
          cantidad_minima: 10, 
          porcentaje_descuento: 5,
          nombre_regla: 'Nuevo Nivel'
        }]);
      
      if (error) throw error;
      toast.success('Nuevo nivel de descuento añadido');
      if (onRefresh) onRefresh();
    } catch (e: any) {
      console.error("Error Supabase:", e);
      toast.error('No se pudo añadir: Revisa permisos RLS en Supabase');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateRule = async (id: string, field: string, value: number) => {
    try {
      const { error } = await supabase
        .from('reglas_descuento_volumen')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error('Error al actualizar base de datos');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('¿Eliminar este nivel de descuento?')) return;
    try {
      const { error } = await supabase.from('reglas_descuento_volumen').delete().eq('id', id);
      if (error) throw error;
      toast.success('Nivel eliminado');
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error('Error al borrar de la base de datos');
    }
  };

  // --- 3. ESTILOS NEON GLASS INDUSTRIAL ---
  const cardClass = dark 
    ? 'bg-[#111827]/80 backdrop-blur-2xl border border-white/5 shadow-2xl' 
    : 'bg-white border-slate-200 text-slate-800 shadow-xl';
    
  const inputClass = dark
    ? 'bg-[#0B1120] border-white/10 text-white focus:border-cyan-500/50 outline-none'
    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 outline-none';

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-20 px-4">
      <div className="flex items-center justify-between mb-10">
        <h2 className={`text-4xl font-black tracking-tighter ${dark ? 'text-white' : 'text-slate-900'}`}>
          Configuración
        </h2>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-[10px] font-bold uppercase tracking-widest">
           <Sparkles size={12}/> Plus Gráfica PRO
        </div>
      </div>

      {/* PERFIL */}
      <div className={`p-8 rounded-[2.5rem] border mb-8 ${cardClass} relative overflow-hidden`}>
        <div className="relative flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl">
                {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
                <h3 className="font-bold text-2xl mb-1 tracking-tight">{session?.user?.email}</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-500 opacity-80 font-mono">ADMINISTRADOR MAESTRO</p>
            </div>
        </div>
      </div>

      {/* REGLAS DE DESCUENTO */}
      <div className={`p-8 rounded-[2.5rem] border mb-8 ${cardClass}`}>
        <div className="flex justify-between items-center mb-10">
            <div>
                <h3 className="font-bold text-xl flex items-center gap-3">
                    <Tag className="text-amber-500" size={24}/> Niveles de Descuento
                </h3>
                <p className="text-xs opacity-40 mt-1 font-medium italic">Estrategia de precios por volumen de producción</p>
            </div>
            <button 
              onClick={handleAddRule}
              disabled={isAdding}
              className="p-4 rounded-2xl bg-cyan-600 text-white hover:bg-cyan-500 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isAdding ? <Loader2 size={20} className="animate-spin"/> : <Plus size={20} />}
            </button>
        </div>

        <div className="space-y-4">
            {discountRules.map((rule: any) => (
                <div key={rule.id} className="grid grid-cols-12 gap-6 items-end p-5 rounded-3xl bg-slate-500/5 border border-white/5 hover:border-cyan-500/20 transition-all group">
                    <div className="col-span-5">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest ml-1">Cant. Mínima</label>
                        <div className="relative">
                            <input 
                              type="number"
                              className={`w-full p-4 rounded-2xl text-sm font-bold pl-12 ${inputClass}`}
                              defaultValue={rule.cantidad_minima}
                              onBlur={(e) => handleUpdateRule(rule.id, 'cantidad_minima', Number(e.target.value))}
                            />
                            <div className="absolute left-4 top-4 text-slate-500 opacity-40"><Zap size={16}/></div>
                        </div>
                    </div>
                    <div className="col-span-5">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest ml-1">% Descuento</label>
                        <div className="relative">
                            <input 
                                type="number"
                                className={`w-full p-4 rounded-2xl text-sm font-black text-emerald-500 pr-12 ${inputClass}`}
                                defaultValue={rule.porcentaje_descuento}
                                onBlur={(e) => handleUpdateRule(rule.id, 'porcentaje_descuento', Number(e.target.value))}
                            />
                            <span className="absolute right-5 top-4 font-black text-emerald-500/40">%</span>
                        </div>
                    </div>
                    <div className="col-span-2 flex justify-end">
                        <button 
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-4 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            ))}
            {discountRules.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-[2rem] opacity-20">
                    <Tag size={48} className="mx-auto mb-4" />
                    <p className="font-bold text-sm uppercase tracking-widest text-white">Configura tus niveles de descuento</p>
                </div>
            )}
        </div>
      </div>

      {/* LOGOUT */}
      <button 
        onClick={handleLogout}
        className="w-full py-6 rounded-[2rem] border-2 border-rose-500/20 text-rose-500 font-black uppercase tracking-[0.3em] hover:bg-rose-500 hover:text-white transition-all shadow-2xl active:scale-[0.98] mb-20"
      >
        <LogOut size={20} className="inline mr-2" /> Salir del Sistema
      </button>
    </div>
  );
};

export default Settings;