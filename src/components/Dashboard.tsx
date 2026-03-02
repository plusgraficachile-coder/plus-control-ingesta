import { useState, useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabaseClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Componentes Modulares (Corregida la mayúscula en la carpeta 'Dashboard')
import SmartAdvisor from './SmartAdvisor';
import DebtPanel from './Dashboard/DebtPanel';
import TopMaterials from './Dashboard/TopMaterials';
import KpiGrid from './Dashboard/KpiGrid';

// --- PAYMENT MODAL ---
const PaymentModal = ({ quote, onClose, onConfirm, dark }: any) => {
    const [amount, setAmount] = useState(quote.saldo_pendiente);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
             <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl border relative overflow-hidden ${dark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                {/* ... (mismo contenido del modal de antes) ... */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl">Registrar Pago</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">✕</button>
                </div>
                <div className="mb-4 text-center">
                    <p className="text-sm text-slate-500">Saldo Pendiente</p>
                    <p className="text-2xl font-bold text-rose-500">${quote.saldo_pendiente.toLocaleString('es-CL')}</p>
                </div>
                <div className={`flex items-center gap-3 p-4 rounded-2xl border mb-6 ${dark ? 'bg-[#0B1120] border-emerald-500/30' : 'bg-slate-50 border-emerald-500/20'}`}>
                    <span className="text-emerald-500">$</span>
                    <input type="number" autoFocus value={amount} onChange={e=>setAmount(Number(e.target.value))} className="w-full bg-transparent text-xl font-bold outline-none"/>
                </div>
                <button onClick={() => onConfirm(quote, amount)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex justify-center gap-2">Confirmar</button>
             </div>
        </div>
    );
};

// --- MAIN DASHBOARD ---
const Dashboard = ({ quotes = [], materials = [], dark, onRefresh }: any) => { 
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [paymentModalData, setPaymentModalData] = useState<any>(null);

  // 1. FILTRO MAESTRO: Todo el dashboard "respira" solo lo de este mes
  const monthlyQuotes = useMemo(() => {
    return quotes.filter((q: any) => q.fecha_creacion?.startsWith(selectedMonth));
  }, [quotes, selectedMonth]);

  // Configuración KPI
  const REAL_SALES_STATES = ['En Producción', 'Entregado', 'Listo']; // Estados que cuentan como venta real
  const IGNORE_DEBT_STATES = ['Borrador', 'Rechazada', 'Eliminada', 'Enviada']; 

  // Datos KPI (Usando monthlyQuotes)
  const kpiData = useMemo(() => {
    // Ventas Reales (Solo lo que se está produciendo o se entregó ESTE MES)
    const ventasReales = monthlyQuotes.filter((q: any) => REAL_SALES_STATES.includes(q.estado));
    
    return { 
        ventasNetas: ventasReales.reduce((acc: number, q: any) => acc + (q.neto_total || 0), 0),
        // Recaudado: Suma de abonos de cotizaciones creadas este mes
        recaudado: monthlyQuotes.filter((q:any) => !IGNORE_DEBT_STATES.includes(q.estado)).reduce((acc: number, q: any) => acc + (q.abono_inicial || 0), 0),
        // Por Cobrar: Deuda generada este mes
        porCobrar: monthlyQuotes.filter((q: any) => !IGNORE_DEBT_STATES.includes(q.estado) && q.saldo_pendiente > 0).reduce((acc: number, q: any) => acc + (q.saldo_pendiente || 0), 0),
        enProduccion: monthlyQuotes.filter((q: any) => q.estado === 'En Producción').length,
        count: ventasReales.length,
ivaMes: Math.round(ventasReales.reduce((acc: number, q: any) => acc + (q.neto_total || 0), 0) * 0.19), 
    };
  }, [monthlyQuotes]);

  // Datos Materiales (Usando monthlyQuotes)
  const materialStats = useMemo(() => {
    const soldQuotes = monthlyQuotes.filter((q: any) => REAL_SALES_STATES.includes(q.estado));
    const materialCount: Record<string, number> = {};
    soldQuotes.forEach((q: any) => {
        q.items?.forEach((item: any) => {
            let name = item.nombre_producto || item.descripcion_item || 'Varios';
            materialCount[name] = (materialCount[name] || 0) + (item.total_linea || 0);
        });
    });
    return Object.entries(materialCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5); 
  }, [monthlyQuotes]);

  // Gráfico Tendencia (Este SÍ usa 'quotes' global para mostrar historia anual)
  const chartData = useMemo(() => {
    return ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'].map((month, idx) => {
      const monthStr = `${new Date().getFullYear()}-${String(idx + 1).padStart(2, '0')}`;
      const monthQuotes = quotes.filter((q: any) => q.fecha_creacion?.startsWith(monthStr) && REAL_SALES_STATES.includes(q.estado));
      return { name: month, ventas: monthQuotes.reduce((acc: number, q: any) => acc + (q.neto_total || 0), 0) };
    });
  }, [quotes]);

  // Handlers
  const handleQuickPay = async (quote: any, amountPaid: number) => {
      if (amountPaid <= 0 || amountPaid > quote.saldo_pendiente) return toast.error('Monto inválido');
      try {
        const { error } = await supabase.from('cotizaciones').update({ abono_inicial: (quote.abono_inicial || 0) + amountPaid, saldo_pendiente: (quote.total_final || 0) - ((quote.abono_inicial || 0) + amountPaid) }).eq('id', quote.id);
        if (error) throw error;
        toast.success('Pago registrado'); setPaymentModalData(null); if (onRefresh) onRefresh();
      } catch (error: any) { toast.error(error.message); }
  };

  const handleReject = async (quote: any) => {
      if (!confirm('¿Anular cotización?')) return;
      try {
          const { error } = await supabase.from('cotizaciones').update({ estado: 'Rechazada' }).eq('id', quote.id);
          if (error) throw error;
          toast.success('Anulada'); if (onRefresh) onRefresh();
      } catch (error: any) { toast.error(error.message); }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {paymentModalData && <PaymentModal quote={paymentModalData} dark={dark} onClose={() => setPaymentModalData(null)} onConfirm={handleQuickPay} />}

      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight ${dark ? 'text-white':'text-slate-800'}`}>Resumen Financiero</h2>
          <p className="text-sm text-slate-500">Vista Mensual Filtrada</p>
        </div>
        {/* SELECTOR DE MES */}
        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`bg-transparent font-bold text-sm px-2 cursor-pointer border-b ${dark ? 'text-white border-slate-700' : 'text-slate-800 border-slate-300'}`}/>
      </div>

      <KpiGrid data={kpiData} dark={dark} />
      <div className="mt-2 mb-2">

      <div className="mt-2 mb-8">
        <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
            <Lightbulb size={20} className="text-yellow-400 fill-yellow-400/20"/> Sugerencias IA
        </h3>
        {/* SmartAdvisor también recibe solo lo del mes para dar consejos relevantes al momento */}
        <SmartAdvisor quotes={monthlyQuotes} materials={materials} dark={dark} />
      </div>

      (ya está bien, el espacio viene de arriba)
        <div className={`lg:col-span-2 p-8 rounded-3xl ${dark ? 'bg-[#111827]/60 border-white/5' : 'bg-white border-slate-100'} border shadow-sm`}>
          <div className="flex justify-between items-center mb-8"><h3 className={`font-bold text-lg ${dark?'text-white':'text-slate-800'}`}>Tendencia Anual</h3></div>
          <div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={dark ? '#334155' : '#e2e8f0'} vertical={false} opacity={0.4} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: dark ? '#94a3b8' : '#64748b', fontSize: 11}} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{fill: dark ? '#94a3b8' : '#64748b', fontSize: 11}} tickFormatter={(val) => `$${val/1000}k`} /><Tooltip contentStyle={{backgroundColor: dark ? '#0f172a' : '#fff', borderRadius: '12px'}} /><Area type="monotone" dataKey="ventas" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" /></AreaChart></ResponsiveContainer></div>
        </div>

        {/* COMPONENTES FILTRADOS POR MES */}
        <div className="flex flex-col gap-6">
            <TopMaterials data={materialStats} dark={dark} />
            {/* Aquí pasamos monthlyQuotes. Si alguien te debe de hace 3 meses, NO saldrá aquí. 
                Esto mantiene la lista corta como pediste. */}
            <DebtPanel quotes={monthlyQuotes} dark={dark} onPay={setPaymentModalData} onReject={handleReject} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;