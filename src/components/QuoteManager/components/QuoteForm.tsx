import { useEffect, useState } from 'react';
import { ChevronLeft, Save, Users, Calculator, Info, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { FORMATTER } from '../../../utils/formatters';
import { calculateItemTotal } from '../../../hooks/useQuoteFinance';
import { useThemeClasses } from '../../../hooks/useThemeClasses';
import SearchableSelect from './SearchableSelect';

// Configuración de Estados
const STATUS_CONFIG: Record<string, {label: string, color: string}> = {
  'Borrador': { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  'Enviada': { label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  'Aceptada': { label: 'Aceptada', color: 'bg-cyan-100 text-cyan-700' },
  'En Producción': { label: 'En Producción', color: 'bg-amber-100 text-amber-700' },
  'Listo': { label: 'Listo', color: 'bg-teal-100 text-teal-700' },
  'Entregado': { label: 'Entregado', color: 'bg-emerald-100 text-emerald-700' },
  'Rechazada': { label: 'Rechazada', color: 'bg-rose-100 text-rose-700' },
};

const QuoteForm = ({ initialData, onSave, onCancel, catalogs, dark }: any) => {
    const [form, setForm] = useState<any>({
        fecha_creacion: new Date().toISOString(),
        cliente_id: '', cliente_nombre: '', cliente_empresa: '', cliente_rut: '',
        email_cliente: '', telefono_cliente: '', direccion_cliente: '', ciudad_cliente: '',
        items: [],
        neto_total: 0, iva_total: 0, total_final: 0, 
        abono_inicial: 0, saldo_pendiente: 0, // 🔥 IMPORTANTE: Campos de dinero
        estado: 'Borrador', aplica_iva: true, descuento_porcentaje: 0,
        ...(initialData || {}) 
    });

    const materialesList = catalogs.materiales || [];
    const clientesList = catalogs.clientes || [];

    // Preparamos opciones para el buscador
    const clientOptions = clientesList.map((c: any) => ({
        ...c,
        nombre: c.empresa || c.contacto_nombre || 'Sin Nombre',
        codigo: c.rut || 'S/R'
    }));

    // --- CÁLCULOS AUTOMÁTICOS ---
    useEffect(() => {
        const currentItems = form.items || [];
        const subtotal = currentItems.reduce((acc: number, item: any) => acc + (item.total_linea || 0), 0);
        const dctoMonto = Math.round(subtotal * ((form.descuento_porcentaje || 0) / 100));
        const neto = Math.max(0, subtotal - dctoMonto);
        const iva = form.aplica_iva ? Math.round(neto * 0.19) : 0;
        const total = neto + iva;
        
        // 🔥 CÁLCULO CLAVE: Saldo = Total - Abono
        const saldo = Math.max(0, total - (form.abono_inicial || 0));

        // Solo actualizamos si hay cambios matemáticos para evitar loop infinito
        if (
            form.total_final !== total || 
            form.neto_total !== neto || 
            form.saldo_pendiente !== saldo
        ) {
            setForm((prev: any) => ({ 
                ...prev, 
                neto_total: neto, 
                iva_total: iva, 
                total_final: total, 
                saldo_pendiente: saldo 
            }));
        }
    }, [JSON.stringify(form.items), form.descuento_porcentaje, form.aplica_iva, form.abono_inicial]);

    // Helpers de Formulario
    const handleClientSelect = (id: string) => {
        const c = clientesList.find((x:any) => String(x.id) === String(id));
        if (c) {
            setForm({ 
                ...form, 
                cliente_id: c.id, cliente_empresa: c.empresa, cliente_nombre: c.contacto_nombre || c.contacto || '', 
                email_cliente: c.email, telefono_cliente: c.telefono, cliente_rut: c.rut,
                direccion_cliente: c.direccion || '', ciudad_cliente: c.ciudad || ''
            });
        }
    };

    const addItem = () => {
        if (!materialesList.length) return toast.error('No hay materiales cargados');
        const mat = materialesList[0];
        setForm({ ...form, items: [...form.items, {
            material_id: mat.id, nombre_producto: mat.nombre, descripcion_item: mat.caracteristicas || mat.descripcion || '', 
            cantidad: 1, medidas_ancho: 0, medidas_alto: 0, precio_unitario_aplicado: mat.precio_venta_base,
            total_linea: mat.precio_venta_base
        }] });
    };

    const updateItem = (idx: number, field: string, val: any) => {
        const newItems = [...form.items];
        const item = { ...newItems[idx], [field]: val };
        if (field === 'material_id') {
            const m = materialesList.find((x:any) => String(x.id) === String(val));
            if (m) { 
                item.nombre_producto = m.nombre; 
                item.precio_unitario_aplicado = m.precio_venta_base;
                item.descripcion_item = m.caracteristicas || m.descripcion || ''; 
            }
        }
        if (field !== 'total_linea') item.total_linea = calculateItemTotal(item);
        newItems[idx] = item;
        setForm({ ...form, items: newItems });
    };

    // Estilos — centralizado en useThemeClasses
    const theme = useThemeClasses(dark);

    const formatearRut = (rutRaw: string) => {
        if (!rutRaw) return '';
        const valor = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
        if (valor.length <= 1) return valor;
        const cuerpo = valor.slice(0, -1);
        const dv = valor.slice(-1);
        return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 animate-in fade-in">
            <div className="flex items-center justify-between mb-6">
                <button onClick={onCancel} className="flex items-center gap-2 text-slate-500 hover:text-cyan-500 font-bold">
                    <ChevronLeft /> Volver
                </button>
                <div className="flex gap-3">
                    <span className={`px-4 py-2 rounded-lg font-mono font-bold border ${theme.badge}`}>
                        {form.id ? `EDITANDO #${form.folio || '...'}` : 'NUEVA'}
                    </span>
                    <button onClick={() => onSave(form)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg">
                        <Save size={18} /> GUARDAR
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* CLIENTE */}
                    <div className={`p-6 rounded-xl border ${theme.card}`}>
                        <h3 className="font-bold flex items-center gap-2 mb-4 text-cyan-500"><Users size={20}/> Datos del Cliente</h3>
                        <div className="mb-4">
                            <label className={theme.label}>Buscar Cliente</label>
                            <SearchableSelect value={form.cliente_id} options={clientOptions} onChange={handleClientSelect} placeholder="-- Buscar o Seleccionar --" dark={dark} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={theme.label}>RUT</label><input className={`w-full p-2.5 rounded-lg border font-mono ${theme.input}`} value={formatearRut(form.cliente_rut || '')} onChange={e=>setForm({...form, cliente_rut: e.target.value})} placeholder="76.xxx.xxx-x"/></div>
                            <div><label className={theme.label}>Razón Social</label><input className={`w-full p-2.5 rounded-lg border font-bold ${theme.input}`} value={form.cliente_empresa || ''} onChange={e=>setForm({...form, cliente_empresa: e.target.value})} /></div>
                            <div><label className={theme.label}>Contacto</label><input className={`w-full p-2.5 rounded-lg border ${theme.input}`} value={form.cliente_nombre || ''} onChange={e=>setForm({...form, cliente_nombre: e.target.value})} /></div>
                            <div><label className={theme.label}>Email</label><input className={`w-full p-2.5 rounded-lg border ${theme.input}`} value={form.email_cliente || ''} onChange={e=>setForm({...form, email_cliente: e.target.value})} /></div>
                            <div><label className={theme.label}>Teléfono</label><input className={`w-full p-2.5 rounded-lg border ${theme.input}`} value={form.telefono_cliente || ''} onChange={e=>setForm({...form, telefono_cliente: e.target.value})} /></div>
                            <div><label className={theme.label}>Ciudad</label><input className={`w-full p-2.5 rounded-lg border ${theme.input}`} value={form.ciudad_cliente || ''} onChange={e=>setForm({...form, ciudad_cliente: e.target.value})} /></div>
                        </div>
                    </div>

                    {/* ITEMS */}
                    <div className={`p-6 rounded-xl border ${theme.card}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2 text-cyan-500"><Calculator size={20}/> Detalle de Producción</h3>
                            <button onClick={addItem} className="text-xs bg-cyan-500/10 text-cyan-500 px-3 py-1 rounded font-bold hover:bg-cyan-500 hover:text-white transition-colors">+ AGREGAR ÍTEM</button>
                        </div>
                        <div className="space-y-3">
                            {form.items.map((item: any, idx: number) => (
                                <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-3 relative ${theme.cardInner}`}>
                                    <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                                        <div className="col-span-2 md:col-span-4">
                                            <label className={theme.label}>PRODUCTO</label>
                                            <SearchableSelect value={item.material_id} options={materialesList} onChange={(newId: string) => updateItem(idx, 'material_id', newId)} placeholder="Seleccionar..." dark={dark} />
                                        </div>
                                        <div className="col-span-1 md:col-span-2"><label className={theme.label}>ANCHO</label><input type="number" className={`w-full p-3 text-center rounded-xl border ${theme.input}`} value={item.medidas_ancho} onChange={e=>updateItem(idx, 'medidas_ancho', e.target.value)} /></div>
                                        <div className="col-span-1 md:col-span-2"><label className={theme.label}>ALTO</label><input type="number" className={`w-full p-3 text-center rounded-xl border ${theme.input}`} value={item.medidas_alto} onChange={e=>updateItem(idx, 'medidas_alto', e.target.value)} /></div>
                                        <div className="col-span-1 md:col-span-2"><label className={theme.label}>CANT.</label><input type="number" className={`w-full p-3 text-center font-bold rounded-xl border ${theme.input}`} value={item.cantidad} onChange={e=>updateItem(idx, 'cantidad', e.target.value)} /></div>
                                        <div className="col-span-1 md:col-span-2 text-right"><label className={theme.label}>TOTAL</label><div className="p-3 font-mono font-bold text-cyan-400 text-sm bg-black/20 rounded-xl">{FORMATTER.format(item.total_linea)}</div></div>
                                    </div>
                                    <div className="relative">
                                        <Info size={14} className="absolute left-3 top-3 text-slate-500"/>
                                        <input className={`w-full p-3 pl-9 text-xs rounded-xl border outline-none ${theme.input}`} placeholder="Detalle técnico para PDF..." value={item.descripcion_item || ''} onChange={e=>updateItem(idx, 'descripcion_item', e.target.value)} />
                                    </div>
                                    <button onClick={()=>setForm({...form, items: form.items.filter((_:any, i:number) => i !== idx)})} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg hover:bg-rose-600"><Trash2 size={12}/></button>
                                </div>
                            ))}
                            {form.items.length === 0 && <p className="text-center text-slate-500 py-4 italic text-sm">No hay ítems agregados.</p>}
                        </div>
                    </div>
                </div>

                {/* RESUMEN LATERAL */}
                <div className="space-y-6">
                    <div className={`p-6 rounded-xl border shadow-xl ${theme.panel}`}>
                        <h3 className={`font-bold text-lg mb-4 ${theme.textMain}`}>Resumen</h3>
                        <div className="space-y-2 text-sm">
                            <div className={`flex justify-between ${theme.textSub}`}><span>Subtotal</span> <span>{FORMATTER.format(form.items.reduce((a:any, b:any)=>a+(b.total_linea||0), 0))}</span></div>
                            <div className={`flex justify-between items-center ${theme.textSub}`}><span>Dcto (%)</span> <input type="number" className={`w-12 text-right rounded p-1 text-xs border ${theme.panelInput}`} value={form.descuento_porcentaje} onChange={e=>setForm({...form, descuento_porcentaje: e.target.value})}/></div>
                            <div className={`flex justify-between font-bold pt-2 border-t ${theme.textSub} ${theme.divider}`}><span>Neto</span> <span className={theme.textMain}>{FORMATTER.format(form.neto_total)}</span></div>
                            <div className={`flex justify-between items-center ${theme.textSub}`}><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.aplica_iva} onChange={()=>setForm({...form, aplica_iva: !form.aplica_iva})} /> IVA (19%)</label><span>{FORMATTER.format(form.iva_total)}</span></div>

                            <div className={`border-t pt-3 flex justify-between items-center mt-2 ${theme.divider}`}>
                                <span className={`text-lg font-bold ${theme.textMain}`}>TOTAL</span>
                                <span className="text-2xl font-black text-cyan-400">{FORMATTER.format(form.total_final)}</span>
                            </div>

                            {/* ABONO */}
                            <div className={`mt-4 pt-4 border-t ${theme.divider}`}>
                                <label className="block text-[10px] font-bold uppercase text-amber-500 mb-1">Abono Inicial (Pago)</label>
                                <div className="flex items-center gap-2">
                                    <span className={theme.textSub}>$</span>
                                    <input
                                        type="number"
                                        value={form.abono_inicial}
                                        onChange={(e) => setForm({...form, abono_inicial: Number(e.target.value)})}
                                        className={`w-full border rounded p-2 text-right font-bold outline-none focus:border-amber-500 ${theme.panelInput}`}
                                    />
                                </div>
                            </div>
                            
                            {/* 🔥 SALDO PENDIENTE CALCULADO 🔥 */}
                            <div className="flex justify-between items-center mt-2 pt-2">
                                <span className="text-xs font-bold text-rose-500 uppercase">Saldo Pendiente</span>
                                <span className="text-xl font-bold text-rose-500">{FORMATTER.format(form.saldo_pendiente)}</span>
                            </div>

                        </div>
                    </div>
                    <div className={`p-4 rounded-xl border ${theme.card}`}>
                        <label className={theme.label}>ESTADO</label>
                        <select className={`w-full p-2 rounded border font-bold uppercase ${theme.input}`} value={form.estado} onChange={e=>setForm({...form, estado: e.target.value})}>
                            {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteForm;