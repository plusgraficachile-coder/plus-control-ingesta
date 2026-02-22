// ============================================================
// src/components/ProductManager.tsx
// VERSIÓN FINAL: Responsiva (Móvil 1 Columna / PC 12 Columnas)
// ============================================================
import React, { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { 
  Search, Trash2, Edit, FileText, Copy, 
  DollarSign, Zap, TrendingUp, Download, Upload, Ruler, Info,
  Package, Wrench, AlignLeft 
} from 'lucide-react';
import { FORMATTER } from '../utils/formatters';
import { supabase } from '../services/supabaseClient';

const ProductManager = ({ materials = [], onRefresh, dark }: any) => {
  // --- 1. ESTADOS ---
  const [newMat, setNewMat] = useState({
    id: null, 
    codigo: '', 
    nombre: '', 
    categoria: 'Sustrato', 
    caracteristicas: '', 
    costo_base_m2: '', 
    margen_sugerido: 40, 
    precio_venta_base: '',
    ancho_maximo: 150,
    spec_composicion: '', 
    spec_tecnologia: '', 
    spec_durabilidad: '', 
    spec_resistencia: '', 
    spec_acabado: '',     
    spec_usos: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showTechSpecs, setShowTechSpecs] = useState(false);

  const esServicio = newMat.categoria === 'Servicio';

  // --- 2. RENTABILIDAD ---
  const getRentabilidad = (precioVenta: number, costoBase: number) => {
    if (!precioVenta || precioVenta <= 0 || !costoBase || costoBase <= 0) {
      return { margen: 0, markup: 0, utilidad: 0 };
    }
    const utilidad = precioVenta - costoBase;
    const margen = (utilidad / precioVenta) * 100;
    const markup = (utilidad / costoBase) * 100;
    return {
      margen: Number(margen.toFixed(1)),
      markup: Number(markup.toFixed(1)),
      utilidad: utilidad
    };
  };

  const getStatusColor = (margen: number) => {
    if (margen < 25) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';   
    if (margen < 45) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';  
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';                 
  };

  const rentaActual = getRentabilidad(Number(newMat.precio_venta_base), Number(newMat.costo_base_m2));

  // --- 3. HANDLERS ---
  const handleSave = async () => {
    if (!newMat.nombre || !newMat.precio_venta_base) return toast.error('Nombre y Precio son obligatorios');
    setLoading(true);
    try {
      const materialData = {
        codigo: newMat.codigo?.toUpperCase(),
        nombre: newMat.nombre,
        categoria: newMat.categoria,
        caracteristicas: newMat.caracteristicas, 
        costo_base_m2: Number(newMat.costo_base_m2),
        precio_venta_base: Number(newMat.precio_venta_base),
        margen_sugerido: rentaActual.margen,
        ancho_maximo: esServicio ? 0 : Number(newMat.ancho_maximo),
        ficha_tecnica: {
          composicion: newMat.spec_composicion,
          tecnologia: newMat.spec_tecnologia,
          durabilidad: newMat.spec_durabilidad,
          resistencia: newMat.spec_resistencia,
          acabado: newMat.spec_acabado,
          usos: newMat.spec_usos
        }
      };

      let error = null;
      if (isEditing && newMat.id) {
        const res = await supabase.from('materiales').update(materialData).eq('id', newMat.id);
        error = res.error;
      } else {
        const res = await supabase.from('materiales').insert(materialData);
        error = res.error;
      }

      if (error) throw error;

      toast.success(isEditing ? 'Ítem actualizado' : 'Ítem creado');
      resetForm();
      if (onRefresh) onRefresh();

    } catch (e: any) { 
      toast.error(`Error al guardar: ${e.message}`);
    } finally { 
      setLoading(false); 
    }
  };

  const exportToExcel = () => {
    try {
      const data = materials.map((m: any) => {
        const r = getRentabilidad(m.precio_venta_base, m.costo_base_m2);
        return {
          'SKU': m.codigo,
          'Producto': m.nombre,
          'Características': m.caracteristicas || m.descripcion,
          'Tipo': m.categoria || 'Sustrato',
          'Costo Base': m.costo_base_m2,
          'Precio Venta': m.precio_venta_base,
          'Margen %': r.margen,
          'Utilidad $': r.utilidad,
          'Ancho Máx': m.ancho_maximo
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");
      XLSX.writeFile(wb, "Inventario_PlusGrafica.xlsx");
      toast.success('Excel exportado');
    } catch (e) { toast.error('Error al exportar'); }
  };

  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (evt: any) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const toInsert = data.map(i => ({
          nombre: i.Material || i.Nombre || i.Producto,
          precio_venta_base: Number(i['Venta M2'] || i.Venta),
          costo_base_m2: Number(i['Costo M2'] || i.Costo),
          codigo: i.Código || i.SKU,
          caracteristicas: i.Caracteristicas || i.Descripcion || '',
          categoria: 'Sustrato'
        }));
        await supabase.from('materiales').insert(toInsert);
        toast.success('Importación finalizada');
        if (onRefresh) onRefresh();
      } catch (e) { toast.error('Error en formato de Excel'); }
    };
    reader.readAsBinaryString(file);
  };

  const handleEdit = (m: any) => {
    const specs = m.ficha_tecnica || {};
    setNewMat({
      id: m.id, 
      codigo: m.codigo || '', 
      nombre: m.nombre, 
      categoria: m.categoria || 'Sustrato',
      caracteristicas: m.caracteristicas || m.descripcion || '', 
      costo_base_m2: m.costo_base_m2 || '', 
      margen_sugerido: m.margen_sugerido || 40, 
      precio_venta_base: m.precio_venta_base || '', 
      ancho_maximo: m.ancho_maximo || 150,
      spec_composicion: specs.composicion || '', 
      spec_durabilidad: specs.durabilidad || '',
      spec_resistencia: specs.resistencia || '', 
      spec_usos: specs.usos || '',
      spec_tecnologia: specs.tecnologia || '', 
      spec_acabado: specs.acabado || '',
    });
    setIsEditing(true);
    setShowTechSpecs(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info('Editando ítem existente');
  };

  const handleDuplicate = (m: any) => {
    const specs = m.ficha_tecnica || {};
    setNewMat({
      id: null, 
      codigo: m.codigo ? `${m.codigo}-CPY` : '', 
      nombre: `${m.nombre} (Copia)`, 
      categoria: m.categoria || 'Sustrato',
      caracteristicas: m.caracteristicas || m.descripcion || '', 
      costo_base_m2: m.costo_base_m2 || '', 
      margen_sugerido: m.margen_sugerido || 40, 
      precio_venta_base: m.precio_venta_base || '', 
      ancho_maximo: m.ancho_maximo || 150,
      spec_composicion: specs.composicion || '', 
      spec_durabilidad: specs.durabilidad || '',
      spec_resistencia: specs.resistencia || '', 
      spec_usos: specs.usos || '',
      spec_tecnologia: specs.tecnologia || '', 
      spec_acabado: specs.acabado || '',
    });
    setIsEditing(false); 
    setShowTechSpecs(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Datos copiados. Modifica y guarda como nuevo.');
  };

  const resetForm = () => {
    setNewMat({ 
        id: null, codigo: '', nombre: '', categoria: 'Sustrato', 
        caracteristicas: '', costo_base_m2: '', margen_sugerido: 40, 
        precio_venta_base: '', ancho_maximo: 150, spec_composicion: '', 
        spec_durabilidad: '', spec_resistencia: '', spec_usos: '', 
        spec_tecnologia: '', spec_acabado: '' 
    });
    setIsEditing(false);
    setShowTechSpecs(false);
  };

  const filtered = materials.filter((m: any) => 
    (m.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.codigo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cardBase = dark ? 'bg-[#111827]/60 backdrop-blur-xl border border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-sm';
  const inputBase = dark ? 'bg-[#0B1120] border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500';

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-black tracking-tighter ${dark ? 'text-white' : 'text-slate-900'}`}>Inventario Maestro</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Materiales & Servicios</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <label className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all">
              <Upload size={14}/> Importar <input type="file" hidden onChange={handleImportExcel} accept=".xlsx,.xls"/>
           </label>
           <button onClick={exportToExcel} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
              <Download size={14}/> Exportar
           </button>
        </div>
      </div>

      {/* FORMULARIO DE EDICIÓN */}
      <div className={`p-4 md:p-8 rounded-[2rem] ${cardBase}`}>
        
        {/* SELECTOR TIPO */}
        <div className="flex bg-black/20 p-1 rounded-2xl w-full md:w-fit mb-6 border border-white/5">
            <button 
                onClick={() => setNewMat({...newMat, categoria: 'Sustrato'})}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!esServicio ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
                <Package size={14}/> Material
            </button>
            <button 
                onClick={() => setNewMat({...newMat, categoria: 'Servicio'})}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${esServicio ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
                <Wrench size={14}/> Servicio
            </button>
        </div>

        {/* GRID RESPONSIVA:
            - grid-cols-1: Para móvil (todo en una columna)
            - lg:grid-cols-12: Para escritorio (diseño complejo)
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* SKU */}
          <div className="lg:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">SKU / CÓDIGO</label>
            <input className={`w-full p-4 rounded-2xl outline-none font-mono text-sm ${inputBase}`} value={newMat.codigo} onChange={e => setNewMat({...newMat, codigo: e.target.value})} placeholder={esServicio ? "SERV-001" : "VIN-001"}/>
          </div>
          
          {/* NOMBRE */}
          <div className="lg:col-span-6">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
                {esServicio ? 'Nombre del Servicio' : 'Nombre del Material'}
            </label>
            <input className={`w-full p-4 rounded-2xl outline-none font-bold ${inputBase}`} value={newMat.nombre} onChange={e => setNewMat({...newMat, nombre: e.target.value})} placeholder={esServicio ? "Ej: Instalación en Altura" : "Ej: Vinilo Arlon Brillante"}/>
          </div>
          
          {/* PRECIO */}
          <div className="lg:col-span-4">
            <label className={`text-[10px] font-black uppercase mb-1 block ${esServicio ? 'text-purple-500' : 'text-cyan-500'}`}>
                {esServicio ? 'Precio Unitario' : 'Precio por M²'}
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-4 ${esServicio ? 'text-purple-500/50' : 'text-cyan-500/50'}`}><DollarSign size={18}/></span>
              <input type="number" className={`w-full p-4 pl-10 rounded-2xl outline-none font-black text-xl ${esServicio ? 'text-purple-500' : 'text-cyan-500'} ${inputBase}`} value={newMat.precio_venta_base} onChange={e => setNewMat({...newMat, precio_venta_base: e.target.value})} />
            </div>
          </div>

          {/* CARACTERÍSTICAS */}
          <div className="lg:col-span-12">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-2">
               <AlignLeft size={14}/> Características / Descripción (Visible en PDF)
            </label>
            <textarea 
                rows={2}
                className={`w-full p-4 rounded-2xl outline-none font-medium text-sm resize-none ${inputBase}`} 
                value={newMat.caracteristicas} 
                onChange={e => setNewMat({...newMat, caracteristicas: e.target.value})} 
                placeholder={esServicio ? "Ej: Incluye limpieza de superficie, uso de andamios..." : "Ej: Material de alta durabilidad, acabado mate..."}
            />
          </div>
          
          {/* KPIS (Tarjetas apiladas en móvil, 3 columnas en PC) */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              
              {/* TARJETA 1 */}
              <div className={`p-6 rounded-3xl border flex flex-col justify-between ${getStatusColor(rentaActual.margen)}`}>
                  <div className="flex justify-between items-start">
                      <div>
                          <div className="text-[10px] font-black uppercase opacity-70 flex items-center gap-2 mb-1"><TrendingUp size={14}/> Margen Real</div>
                          <div className="text-4xl font-black tracking-tighter">{rentaActual.margen}%</div>
                      </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-black/10 flex justify-between items-center">
                      <div className="text-[10px] font-black uppercase opacity-70"><DollarSign size={12} className="inline"/> Ganancia Neta</div>
                      <div className="text-xl font-black">{FORMATTER.format(rentaActual.utilidad)}</div>
                  </div>
              </div>
              
              {/* TARJETA 2 */}
              <div className="p-6 rounded-3xl border border-white/5 bg-white/5 text-slate-300 flex flex-col justify-between">
                  <div>
                      <div className="text-[10px] font-black uppercase opacity-60 flex items-center gap-2 mb-1"><DollarSign size={14}/> Costo Base</div>
                      <input type="number" className="bg-transparent border-none outline-none font-black text-3xl w-full text-white placeholder-slate-600" value={newMat.costo_base_m2} onChange={e => setNewMat({...newMat, costo_base_m2: e.target.value})} placeholder="0"/>
                  </div>
                  <div className={`mt-4 pt-3 border-t border-white/10 flex justify-between items-center ${esServicio ? 'text-purple-400' : 'text-cyan-400'}`}>
                      <div className="text-[10px] font-black uppercase opacity-70"><Zap size={12} className="inline mr-1"/> Markup</div>
                      <div className="text-xl font-black">+{rentaActual.markup}%</div>
                  </div>
              </div>

              {/* TARJETA 3 */}
              {esServicio ? (
                  <div className="p-6 rounded-3xl border border-white/5 bg-white/5 text-slate-600 flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-black uppercase opacity-50">Configuración de Servicio</span>
                      <Wrench size={32} className="opacity-20 mt-2"/>
                      <span className="text-[9px] mt-2 opacity-40">No requiere ancho máximo</span>
                  </div>
              ) : (
                  <div className="p-6 rounded-3xl border border-white/5 bg-white/5 text-slate-400 flex flex-col justify-center">
                      <div className="text-[10px] font-black uppercase opacity-60 flex items-center gap-2 mb-2"><Ruler size={14}/> Ancho Máximo (cm)</div>
                      <input type="number" className="bg-transparent border-none outline-none font-black text-4xl w-full text-white placeholder-slate-600" value={newMat.ancho_maximo} onChange={e => setNewMat({...newMat, ancho_maximo: e.target.value})} />
                      <div className="text-[9px] mt-2 opacity-40">Límite para cálculo de cortes</div>
                  </div>
              )}
          </div>

          <div className="lg:col-span-12">
            <button onClick={() => setShowTechSpecs(!showTechSpecs)} className="text-[10px] font-black uppercase text-slate-500 hover:text-cyan-500 transition-all flex items-center gap-2">
              <FileText size={14}/> {showTechSpecs ? 'Ocultar Ficha Técnica Avanzada' : 'Ver Ficha Técnica Avanzada'}
            </button>
          </div>

          {showTechSpecs && (
            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in p-6 md:p-8 bg-black/10 rounded-[2rem] border border-white/5">
                <div className="md:col-span-2 lg:col-span-3 text-xs font-black text-cyan-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Info size={16}/> Campos Adicionales
                </div>
                <div><label className="text-[11px] font-bold uppercase text-slate-500 mb-2 block">Composición</label><input placeholder="Ej: PVC" className={`w-full p-4 rounded-2xl text-sm font-medium ${inputBase}`} value={newMat.spec_composicion} onChange={e=>setNewMat({...newMat, spec_composicion: e.target.value})}/></div>
                <div><label className="text-[11px] font-bold uppercase text-slate-500 mb-2 block">Tecnología</label><input placeholder="Ej: UV" className={`w-full p-4 rounded-2xl text-sm font-medium ${inputBase}`} value={newMat.spec_tecnologia} onChange={e=>setNewMat({...newMat, spec_tecnologia: e.target.value})}/></div>
                <div><label className="text-[11px] font-bold uppercase text-slate-500 mb-2 block">Durabilidad</label><input placeholder="Ej: 1 año" className={`w-full p-4 rounded-2xl text-sm font-medium ${inputBase}`} value={newMat.spec_durabilidad} onChange={e=>setNewMat({...newMat, spec_durabilidad: e.target.value})}/></div>
                <div><label className="text-[11px] font-bold uppercase text-slate-500 mb-2 block">Resistencia</label><input placeholder="Ej: Agua" className={`w-full p-4 rounded-2xl text-sm font-medium ${inputBase}`} value={newMat.spec_resistencia} onChange={e=>setNewMat({...newMat, spec_resistencia: e.target.value})}/></div>
                <div><label className="text-[11px] font-bold uppercase text-slate-500 mb-2 block">Acabado</label><input placeholder="Ej: Mate" className={`w-full p-4 rounded-2xl text-sm font-medium ${inputBase}`} value={newMat.spec_acabado} onChange={e=>setNewMat({...newMat, spec_acabado: e.target.value})}/></div>
            </div>
          )}

          <div className="lg:col-span-12 flex flex-col md:flex-row justify-end gap-4 border-t border-white/5 pt-6">
            {isEditing && <button onClick={resetForm} className="px-6 py-4 text-slate-500 font-black uppercase text-[10px] text-center">Cancelar</button>}
            <button onClick={handleSave} className={`px-12 py-4 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto ${esServicio ? 'bg-purple-600' : 'bg-cyan-600'}`}>
              {isEditing ? 'Actualizar Registro' : 'Guardar en Inventario'}
            </button>
          </div>
        </div>
      </div>

      {/* LISTADO */}
      <div className={`rounded-[2.5rem] overflow-hidden ${cardBase}`}>
        <div className="p-6 bg-white/5 flex items-center gap-4 border-b border-white/5">
            <Search size={20} className="text-slate-500"/>
            <input className="bg-transparent outline-none w-full font-bold text-sm text-white placeholder:text-slate-600" placeholder="Buscar..." onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-black/20">
                <th className="p-6 text-left">SKU / Producto</th>
                <th className="p-6 text-left">Tipo</th>
                <th className="p-6 text-left">Descripción</th>
                <th className="p-6 text-right">Venta</th>
                <th className="p-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((m: any) => {
                const esServ = m.categoria === 'Servicio';
                return (
                  <tr key={m.id} className="hover:bg-white/5 transition-all group">
                    <td className="p-6">
                      <div className={`text-[9px] font-mono font-black mb-1 ${esServ ? 'text-purple-500' : 'text-cyan-500'}`}>{m.codigo || 'S/SKU'}</div>
                      <div className="font-bold text-white text-sm">{m.nombre}</div>
                    </td>
                    <td className="p-6">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${esServ ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                            {m.categoria || 'Sustrato'}
                        </span>
                    </td>
                    <td className="p-6 max-w-xs">
                       <div className="text-xs text-slate-400 truncate">{m.caracteristicas || m.descripcion || '---'}</div>
                    </td>
                    <td className="p-6 text-right">
                      <div className={`text-sm font-black ${esServ ? 'text-purple-400' : 'text-emerald-400'}`}>{FORMATTER.format(m.precio_venta_base)}</div>
                      <div className="text-[9px] font-bold text-slate-600 uppercase">{esServ ? 'UNIDAD' : 'M²'}</div>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2">
                          <button onClick={() => handleDuplicate(m)} className="p-2 bg-blue-500/10 rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white transition-all" title="Duplicar"><Copy size={16}/></button>
                          <button onClick={() => handleEdit(m)} className="p-2 bg-amber-500/10 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white transition-all" title="Editar"><Edit size={16}/></button>
                          <button onClick={async () => { if(confirm('¿Borrar ítem?')) { await supabase.from('materiales').delete().eq('id', m.id); onRefresh(); }}} className="p-2 bg-rose-500/10 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all" title="Eliminar"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductManager;