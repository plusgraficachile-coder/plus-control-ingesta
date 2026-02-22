// ============================================================
// src/components/ClientManager.tsx
// VERSIÓN FINAL: Código Tuyo + Funcionalidad ELIMINAR Agregada
// ============================================================
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';
import { 
  UserPlus, Search, MapPin, Phone, Building, Edit, X, 
  Briefcase, User, Mail, ArrowRight, AlertCircle, Loader2,
  Trash2 // <--- 1. Agregado el icono de basura
} from 'lucide-react';

export default function ClientManager({ clients = [], onRefresh, dark }: any) {
  // Estados de proceso granulares
  const [status, setStatus] = useState<'idle' | 'validating' | 'saving' | 'success'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    rut: '', empresa: '', contacto: '', telefono: '', direccion: '', ciudad: '', email: ''
  });

  // --- HELPER: Limpiar RUT para BD (Data Hygiene) ---
  const limpiarRut = (rut: string) => rut.replace(/[^0-9kK]/g, '').toUpperCase();

  // --- HELPER: Formatear RUT para UI (Visual) ---
  const formatearRut = (rutRaw: string) => {
    const valor = limpiarRut(rutRaw);
    if (valor.length <= 1) return valor;
    const cuerpo = valor.slice(0, -1);
    const dv = valor.slice(-1);
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${cuerpoFormateado}-${dv}`;
  };

  // --- HELPER: Validación Módulo 11 (FLEXIBLE) ---
  const validarRut = (rut: string) => {
    if (!rut || rut.trim() === '') return true;
    const limpio = limpiarRut(rut);
    if (limpio.length < 2) return false;
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    let suma = 0;
    let multiplo = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i]) * multiplo;
        multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }
    const dvEsperado = 11 - (suma % 11);
    const dvCalc = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
    return dvCalc === dv;
  };

  // --- CARGAR DATOS ---
  const handleEdit = (client: any) => {
      setErrors({});
      setEditingId(client.id);
      setForm({
          rut: client.rut ? formatearRut(client.rut) : '', 
          empresa: client.empresa || '',
          contacto: client.contacto_nombre || '', 
          telefono: client.telefono || '',
          direccion: client.direccion || '',
          ciudad: client.ciudad || '',
          email: client.email || ''
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- 2. NUEVA FUNCIÓN: ELIMINAR CLIENTE ---
  const handleDelete = async (id: string) => {
      if (!confirm('¿Estás SEGURO de eliminar este cliente? Esta acción es irreversible.')) return;

      try {
          const { error } = await supabase.from('clientes').delete().eq('id', id);
          if (error) throw error;
          
          toast.success('Cliente eliminado correctamente');
          if (onRefresh) onRefresh();
      } catch (err: any) {
          toast.error('No se pudo eliminar: ' + err.message);
      }
  };

  const resetForm = () => {
      setEditingId(null);
      setErrors({});
      setStatus('idle');
      setForm({ rut: '', empresa: '', contacto: '', telefono: '', direccion: '', ciudad: '', email: '' });
  };

  // --- GUARDADO ROBUSTO ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); 
    setStatus('validating');

    const newErrors: Record<string, string> = {};
    if (!form.empresa.trim()) newErrors.empresa = "Nombre de empresa obligatorio";
    
    if (form.rut.trim() && !validarRut(form.rut)) {
        newErrors.rut = "RUT inválido (Déjalo vacío si no tiene)";
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setStatus('idle');
        toast.error("Corrige los errores antes de continuar");
        return;
    }

    setStatus('saving');

    const payload = {
        rut: form.rut.trim() ? limpiarRut(form.rut) : null, 
        empresa: form.empresa.trim(),
        contacto_nombre: form.contacto.trim(),
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
        ciudad: form.ciudad.trim(),
        email: form.email.trim().toLowerCase()
    };

    try {
      let error = null;
      let data = null;

      if (editingId) {
          const res = await supabase.from('clientes').update(payload).eq('id', editingId).select();
          error = res.error;
          data = res.data;
          
          if (!error && (!data || data.length === 0)) {
             toast.error('🛑 Bloqueo de seguridad (RLS). No tienes permiso.');
             setStatus('idle');
             return;
          }
      } else {
          const res = await supabase.from('clientes').insert([payload]);
          error = res.error;
      }

      if (error) {
          if (error.code === '23505') {
              setErrors({ rut: `El RUT ${formatearRut(payload.rut || '')} ya está registrado.` });
              toast.error("Cliente duplicado detectado.");
          } else {
              throw error; 
          }
          setStatus('idle');
          return;
      }

      setStatus('success');
      toast.success(editingId ? 'Cliente actualizado' : 'Cliente registrado exitosamente');
      
      resetForm();
      if (onRefresh) onRefresh();

    } catch (err: any) {
      console.error("Error crítico:", err);
      toast.error('Error del sistema: ' + err.message);
      setStatus('idle');
    }
  };

  // --- BÚSQUEDA ---
  const term = searchTerm.toLowerCase();
  const processedClients = clients
    .filter((c: any) => {
        const rutLimpio = limpiarRut(c.rut || '');
        const rutFormateado = formatearRut(c.rut || '');
        const rutBusqueda = limpiarRut(searchTerm); 

        return (
            (c.empresa || '').toLowerCase().includes(term) || 
            rutLimpio.includes(rutBusqueda) || 
            rutFormateado.includes(searchTerm) || 
            (c.ciudad || '').toLowerCase().includes(term) ||
            (c.contacto_nombre || '').toLowerCase().includes(term) ||
            (c.email || '').toLowerCase().includes(term)
        );
    })
    .sort((a: any, b: any) => (a.empresa || '').localeCompare(b.empresa || ''));

  // --- ESTILOS ---
  const cardBase = dark ? 'bg-[#111827]/60 backdrop-blur-xl border border-white/5 shadow-2xl' : 'bg-white border border-slate-100 shadow-lg';
  
  const getInputClass = (fieldName: string) => {
      const base = dark 
        ? 'bg-[#0B1120] text-white focus:ring-1 placeholder:text-slate-600' 
        : 'bg-slate-50 text-slate-900 focus:ring-1 placeholder:text-slate-400';
      
      const border = errors[fieldName] 
        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/50' 
        : (dark ? 'border-white/10 focus:border-cyan-500 focus:ring-cyan-500' : 'border-slate-200 focus:border-cyan-500 focus:ring-cyan-500');
        
      return `w-full p-4 rounded-xl outline-none text-sm transition-all border ${base} ${border}`;
  };

  const sectionTitle = `text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${dark ? 'text-cyan-500' : 'text-cyan-600'}`;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h2 className={`text-4xl font-black tracking-tighter ${dark ? 'text-white' : 'text-slate-900'}`}>Clientes</h2>
           <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Base de datos comercial y contactos</p>
        </div>
      </div>

      <div className={`p-8 rounded-[2rem] transition-all duration-300 relative overflow-hidden ${cardBase} ${editingId ? 'ring-2 ring-cyan-500/50' : ''}`}>
        
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
            <h3 className={`font-bold text-xl flex items-center gap-3 ${dark ? 'text-white' : 'text-slate-800'}`}>
              <div className={`p-3 rounded-xl shadow-lg ${editingId ? 'bg-amber-500 text-white' : 'bg-cyan-600 text-white'}`}>
                  {editingId ? <Edit size={24}/> : <UserPlus size={24}/>}
              </div>
              {editingId ? 'Modificar Ficha Cliente' : 'Registrar Nuevo Cliente'}
            </h3>
            {editingId && (
                <button onClick={resetForm} className="text-xs font-bold text-rose-500 flex items-center gap-2 bg-rose-500/10 px-4 py-2 rounded-full hover:bg-rose-500 hover:text-white transition-all">
                    <X size={14}/> CANCELAR EDICIÓN
                </button>
            )}
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* IDENTIDAD */}
          <div className="lg:col-span-4 space-y-4">
             <div className={sectionTitle}><Briefcase size={14}/> Identidad Empresarial</div>
             
             <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">RUT <span className="text-xs font-normal opacity-50">(Opcional)</span></label>
                <input 
                  placeholder="76.123.456-K" 
                  maxLength={12}
                  className={`${getInputClass('rut')} font-mono font-bold tracking-wide`} 
                  value={form.rut} 
                  onChange={e => {
                      setForm({...form, rut: formatearRut(e.target.value)});
                      if(errors.rut) setErrors({...errors, rut: ''});
                  }} 
                />
                {errors.rut && <p className="text-rose-500 text-xs mt-1 font-bold flex items-center gap-1"><AlertCircle size={10}/> {errors.rut}</p>}
             </div>
             
             <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Razón Social <span className="text-rose-500">*</span></label>
                <input 
                  placeholder="Ej: Constructora del Sur SpA" 
                  className={`${getInputClass('empresa')} font-bold text-lg`} 
                  value={form.empresa} 
                  onChange={e => {
                      setForm({...form, empresa: e.target.value});
                      if(errors.empresa) setErrors({...errors, empresa: ''});
                  }} 
                />
                {errors.empresa && <p className="text-rose-500 text-xs mt-1 font-bold flex items-center gap-1"><AlertCircle size={10}/> {errors.empresa}</p>}
             </div>
          </div>

          {/* CONTACTO */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <div className={sectionTitle}><User size={14}/> Contacto Directo</div>
                <input placeholder="Nombre del Contacto" className={getInputClass('contacto')} value={form.contacto} onChange={e => setForm({...form, contacto: e.target.value})} />
                <input placeholder="+56 9 1234 5678" className={getInputClass('telefono')} value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
                <input type="email" placeholder="facturacion@empresa.cl" className={getInputClass('email')} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
             </div>

             <div className="space-y-4 flex flex-col h-full">
                <div className={sectionTitle}><MapPin size={14}/> Ubicación</div>
                <input placeholder="Ciudad (Ej: Temuco)" className={getInputClass('ciudad')} value={form.ciudad} onChange={e => setForm({...form, ciudad: e.target.value})} />
                <input placeholder="Dirección Comercial" className={getInputClass('direccion')} value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} />

                <div className="flex-1 flex items-end pt-4">
                    <button 
                        disabled={status !== 'idle' && status !== 'success'} 
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:scale-100 ${editingId ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/30'}`}
                    >
                        {status === 'validating' && <><Loader2 size={18} className="animate-spin"/> VALIDANDO...</>}
                        {status === 'saving' && <><Loader2 size={18} className="animate-spin"/> GUARDANDO...</>}
                        {status === 'idle' && (editingId ? 'Guardar Cambios' : 'Registrar Cliente')}
                        {status === 'success' && '¡LISTO!'}
                        {status === 'idle' && <ArrowRight size={18}/>}
                    </button>
                </div>
             </div>
          </div>
        </form>
      </div>

      {/* LISTADO */}
      <div className={`rounded-[2.5rem] overflow-hidden min-h-[500px] flex flex-col shadow-2xl ${dark ? 'bg-[#0f172a] border border-slate-800' : 'bg-white border border-slate-200'}`}>
         
         <div className={`p-6 border-b flex items-center gap-4 ${dark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
            <Search className={`text-slate-400`} size={24}/>
            <input 
              placeholder="Buscar por empresa, RUT, ciudad o contacto..." 
              className={`bg-transparent outline-none w-full text-lg font-medium placeholder:text-slate-500 ${dark ? 'text-white' : 'text-slate-800'}`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         
         <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-opacity-50">
            {processedClients.map((client: any) => (
               <div key={client.id} className={`group relative p-5 rounded-2xl border transition-all duration-200 hover:shadow-lg ${dark ? 'bg-[#1e293b]/40 border-slate-800 hover:border-cyan-500/40 hover:bg-[#1e293b]' : 'bg-white border-slate-100 hover:border-cyan-200 hover:shadow-cyan-100'}`}>
                  
                  <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                      <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner ${dark ? 'bg-slate-800 text-slate-400 group-hover:bg-cyan-600 group-hover:text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-cyan-500 group-hover:text-white'} transition-colors duration-300`}>
                             {client.empresa ? client.empresa.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                             <h4 className={`font-bold text-lg leading-tight ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{client.empresa}</h4>
                             <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 mt-1.5">
                                {client.rut ? (
                                    <span className="bg-slate-500/10 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                                        <Building size={10}/> {formatearRut(client.rut)}
                                    </span>
                                ) : (
                                    <span className="bg-slate-500/5 px-2 py-0.5 rounded flex items-center gap-1 font-mono opacity-50">
                                        <Building size={10}/> S/R
                                    </span>
                                )}
                                {client.ciudad && <span className="flex items-center gap-1 text-slate-400"><MapPin size={10}/> {client.ciudad}</span>}
                             </div>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right hidden sm:block">
                             <div className={`text-sm font-bold flex items-center justify-end gap-2 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                                {client.contacto_nombre || <span className="italic text-slate-600 font-normal">Sin contacto</span>} <User size={12} className="opacity-50"/>
                             </div>
                             <div className="text-xs text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                                {client.email} <Mail size={10} className="opacity-50"/>
                             </div>
                          </div>

                          <div className="flex gap-2">
                             <button onClick={() => handleEdit(client)} className={`p-3 rounded-xl transition-all ${dark ? 'bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-cyan-50 hover:text-cyan-600'}`} title="Editar Cliente">
                                <Edit size={18}/>
                             </button>
                             {/* 3. BOTÓN ELIMINAR AGREGADO AQUÍ */}
                             <button onClick={() => handleDelete(client.id)} className={`p-3 rounded-xl transition-all ${dark ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white'}`} title="Eliminar Cliente">
                                <Trash2 size={18}/>
                             </button>
                          </div>
                      </div>
                  </div>
               </div>
            ))}
            
            {processedClients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Search size={48} className="mb-4 text-slate-600"/>
                    <p className="text-slate-500 font-medium">No se encontraron clientes.</p>
                </div>
            )}
         </div>
         
         <div className={`px-6 py-3 text-xs font-bold uppercase tracking-widest text-center ${dark ? 'bg-slate-900 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>
             Total Registros: {processedClients.length}
         </div>
      </div>
    </div>
  );
}