import { useState } from 'react';
import { Plus, Search, FileDown, FileCog, MessageCircle, Pencil, Trash2, Mail, FileText } from 'lucide-react';
import { FORMATTER } from '../../../utils/formatters';
import { generatePDF } from '../../../utils/pdfQuote';
import { generateTechnicalPDF } from '../../../utils/pdfTechnicalSheet';
import { generateSpecSheet } from '../../../utils/pdfSpecSheet';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, {color: string}> = {
  'Borrador': { color: 'text-slate-500' },
  'Enviada': { color: 'text-blue-600' },
  'Aceptada': { color: 'text-cyan-600' },
  'En Producción': { color: 'text-amber-600' },
  'Listo': { color: 'text-teal-600' },
  'Entregado': { color: 'text-emerald-600' },
  'Rechazada': { color: 'text-rose-600' },
};

const QuoteList = ({ quotes, onNew, onEdit, onDelete, onStatusChange, materials, dark }: any) => {
    const [tabView, setTabView] = useState('active'); 
    const [searchProd, setSearchProd] = useState('');

    const ACTIVE_STATUSES = ['Borrador', 'Enviada', 'Aceptada', 'En Producción', 'Listo'];
    const HISTORY_STATUSES = ['Entregado', 'Rechazada'];

    const visibleQuotes = quotes.filter((q: any) => {
        const matchesTab = tabView === 'active' ? ACTIVE_STATUSES.includes(q.estado) : (tabView === 'history' ? HISTORY_STATUSES.includes(q.estado) : true);
        const term = searchProd.toLowerCase();
        const empresa = String(q.cliente_empresa || '').toLowerCase();
        const folio = String(q.folio || '').toLowerCase(); 
        const nombre = String(q.cliente_nombre || '').toLowerCase();
        return matchesTab && (empresa.includes(term) || folio.includes(term) || nombre.includes(term));
    });

    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    
    // --- 🛡️ EL PORTERO DE SEGURIDAD ---
    const handleStatusChangeSafe = (q: any, newStatus: string) => {
        
        // REGLA 1: SIN PAGO NO HAY ENTREGA
        if (newStatus === 'Entregado') {
            if ((q.saldo_pendiente || 0) > 100) {
                toast.error(`⛔ BLOQUEADO: El cliente debe ${FORMATTER.format(q.saldo_pendiente)}`, {
                    description: 'Debes registrar el pago total (Saldo $0) antes de marcar como Entregado.',
                    duration: 5000,
                });
                return;
            }
        }

        // REGLA 2: ADVERTENCIA DE CALIDAD
        if (newStatus === 'Entregado' && q.estado !== 'Listo') {
            if (!confirm('⚠️ ¿Seguro que saltas el paso "Listo"?\n\nEsto asume que el producto ya pasó el Control de Calidad.')) {
                return;
            }
        }

        onStatusChange(q.id, newStatus);
    };

    // --- 📧 GMAIL: Abrir Gmail web con cotización ---
    const sendEmail = (q: any) => {
        const email = q.email_cliente || '';
        if (!email) {
            toast.error('Sin email registrado');
            return;
        }

        const subject = `Cotización #${q.folio || 'N/A'} - Plus Gráfica`;
        const body = 
            `Estimado/a ${q.cliente_nombre || 'Cliente'},\n\n` +
            `Junto con saludar, adjunto la cotización solicitada para su proyecto.\n\n` +
            `Detalles:\n` +
            `- Folio: #${q.folio || 'N/A'}\n` +
            `- Monto: ${FORMATTER.format(q.total_final)}\n` +
            `- Validez de la oferta: ${q.validez_oferta || '15 días'}\n\n` +
            `Quedo atento a su confirmación o a cualquier consulta que desee realizar para avanzar.
Saludos,\n` +
            `Plus Gráfica SpA\n` +
            `contacto@plusgrafica.cl`;

        // Usar Gmail web en lugar de mailto
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        window.open(gmailUrl, '_blank');
        toast.success('Gmail abierto en nueva pestaña');
    };

    // --- 💬 WHATSAPP ---
    const sendWhatsApp = (q: any) => {
        const phone = q.telefono_cliente?.replace(/\D/g, '') || '';
        if (!phone) {
            toast.error('Sin teléfono registrado');
            return;
        }

        const message = encodeURIComponent(
            `Hola ${q.cliente_nombre || 'Cliente'}, adjunto cotización #${q.folio || 'N/A'} por ${FORMATTER.format(q.total_final)}. ` +
            `Cualquier consulta o si necesitas algún ajuste, me dices y lo vemos. Saludos, Luis – Plus Gráfica.`
        );

        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    // --- 📋 FICHAS TÉCNICAS ---
    const handleGenerateSpecs = (q: any) => {
        if (!q.items || q.items.length === 0) {
            toast.error('Esta cotización no tiene ítems');
            return;
        }

        // Generar ficha técnica para cada ítem
        q.items.forEach((item: any) => {
            const material = materials.find((m: any) => String(m.id) === String(item.material_id));
            if (material) {
                generateSpecSheet(material);
            }
        });

        toast.success(`${q.items.length} ficha(s) técnica(s) generadas`);
    };

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-2">
                <div>
                    <h1 className={`text-3xl font-black ${dark ? 'text-white' : 'text-slate-900'} tracking-tight leading-none`}>Gestión De Ventas</h1>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 text-slate-500`}>Panel Comercial</p>
                </div>
                <button onClick={onNew} className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform">
                    <Plus size={20} /> NUEVA COTIZACIÓN
                </button>
            </div>

            <div className={`rounded-2xl border overflow-hidden ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex gap-6">
                        {['active', 'history', 'all'].map(tab => (
                            <button key={tab} onClick={() => setTabView(tab)} className={`text-xs font-bold tracking-widest uppercase pb-1 border-b-2 transition-colors ${tabView === tab ? 'text-cyan-500 border-cyan-500' : 'text-slate-500 border-transparent hover:text-slate-400'}`}>
                                {tab === 'active' ? 'Activas' : tab === 'history' ? 'Historial' : 'Todas'}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input type="text" placeholder="Buscar cliente..." className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg outline-none focus:border-cyan-500 transition-colors ${dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} value={searchProd} onChange={(e) => setSearchProd(e.target.value)}/>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className={`text-[10px] uppercase font-black text-slate-500 tracking-wider ${dark ? 'bg-slate-950/30' : 'bg-slate-50'}`}>
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Folio</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4 text-right">Monto</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${dark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                            {visibleQuotes.map((q: any) => (
                                <tr key={q.id} className={`group transition-colors ${dark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-6 py-4">
                                        <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>{q.cliente_empresa || 'Cliente'}</div>
                                        <div className="text-xs text-slate-500">{q.cliente_nombre}</div>
                                    </td>
                                    <td className="px-6 py-4"><span className={`font-mono text-xs font-bold px-2 py-1 rounded ${dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>#{q.folio || '---'}</span></td>
                                    <td className="px-6 py-4"><div className={`text-sm text-slate-500`}>{formatDate(q.fecha_creacion)}</div></td>
                                    
                                    {/* COLUMNA MONTO CON ALERTA VISUAL DE DEUDA */}
                                    <td className="px-6 py-4 text-right">
                                        <div className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{FORMATTER.format(q.total_final)}</div>
                                        {q.saldo_pendiente > 100 && (
                                            <div className={`text-[9px] font-bold inline-block px-1.5 py-0.5 rounded mt-1 ${
                                                dark 
                                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                                                    : 'bg-rose-500 text-white'
                                            }`}>
                                                Debe: {FORMATTER.format(q.saldo_pendiente)}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        <select 
                                            value={q.estado} 
                                            onChange={(e) => handleStatusChangeSafe(q, e.target.value)}
                                            className={`text-[10px] font-bold uppercase border rounded px-2 py-1 outline-none cursor-pointer transition-colors ${
                                                dark 
                                                    ? 'bg-slate-800 border-slate-700' 
                                                    : 'bg-white border-slate-300'
                                            } ${STATUS_CONFIG[q.estado]?.color || 'text-slate-500'}`}
                                        >
                                            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>

                                    {/* 🆕 COLUMNA DE ACCIONES COMPLETA CON 7 BOTONES */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            {/* PDF Cliente */}
                                            <button 
                                                onClick={() => generatePDF(q, materials)} 
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg hover:scale-110 transition-transform ${dark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'}`} 
                                                title="PDF Cliente"
                                            >
                                                <FileDown size={14}/>
                                            </button>

                                            {/* OT Taller */}
                                            <button 
                                                onClick={() => generateTechnicalPDF(q)} 
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg hover:scale-110 transition-transform ${dark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`} 
                                                title="OT Taller"
                                            >
                                                <FileCog size={14}/>
                                            </button>

                                            {/* 🆕 Fichas Técnicas */}
                                            <button 
                                                onClick={() => handleGenerateSpecs(q)} 
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg hover:scale-110 transition-transform ${dark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`} 
                                                title="Fichas Técnicas"
                                            >
                                                <FileText size={14}/>
                                            </button>

                                            {/* 🆕 Gmail */}
                                            <button 
                                                onClick={() => sendEmail(q)} 
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg hover:scale-110 transition-transform ${dark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`} 
                                                title="Enviar Email"
                                            >
                                                <Mail size={14}/>
                                            </button>

                                            {/* WhatsApp */}
                                            <button 
                                                onClick={() => sendWhatsApp(q)} 
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg hover:scale-110 transition-transform ${dark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`} 
                                                title="WhatsApp"
                                            >
                                                <MessageCircle size={14}/>
                                            </button>

                                            {/* Separador */}
                                            <div className="w-px h-6 bg-slate-700 mx-1"></div>

                                            {/* Editar */}
                                            <button 
                                                onClick={() => onEdit(q)} 
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg hover:scale-110 transition-transform ${dark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`} 
                                                title="Editar"
                                            >
                                                <Pencil size={14}/>
                                            </button>

                                            {/* Eliminar */}
                                            <button 
                                                onClick={() => onDelete(q.id)} 
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg hover:scale-110 transition-transform ${dark ? 'text-slate-500 hover:text-rose-500' : 'text-slate-400 hover:text-rose-600'}`} 
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default QuoteList;
