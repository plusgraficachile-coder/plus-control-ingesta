// ============================================================
// components/SmartAdvisor.tsx
// Versión: "La Verdad Financiera" (Filtros SQL aplicados)
// ============================================================

import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, AlertTriangle, Sparkles, 
  BrainCircuit, Loader, RefreshCw, Info, DollarSign 
} from 'lucide-react';
import { toast } from 'sonner';
import { FORMATTER } from '../utils/formatters';

const API_KEY = import.meta.env.VITE_GEMINI_KEY;

const SmartAdvisor = ({ quotes = [], materials = [], dark }: any) => {
  
  const [aiTips, setAiTips] = useState<any[] | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // --- 1. INTELIGENCIA LÓGICA (Siempre activa) ---
  const staticInsights = useMemo(() => {
    const tips: any[] = [];
    
    // 🔥 EL FILTRO DE LA VERDAD
    // Solo consideramos dinero real (Producción o Entregado)
    const ventasReales = quotes.filter((q: any) => 
      ['En Producción', 'Entregado'].includes(q.estado)
    );
    
    // Deuda (Aquí sí miramos todo lo que no esté rechazado/borrador)
    const deudasRecientes = quotes.filter((q: any) => 
      q.saldo_pendiente > 0 && 
      !['Rechazada', 'Borrador', 'Eliminada'].includes(q.estado)
    );
    const totalDeuda = deudasRecientes.reduce((acc: number, q: any) => acc + (q.saldo_pendiente || 0), 0);
    
    // Alerta de Cobranza
    if (totalDeuda > 100000) { 
      tips.push({
        id: 'debt_high',
        type: 'danger',
        icon: AlertTriangle,
        title: 'Recuperación de Capital',
        message: `Hay ${FORMATTER.format(totalDeuda)} por cobrar en la calle. Unos mensajes de recordatorio hoy podrían cerrar la semana con saldo positivo.`,
      });
    }

    // Lógica de Producto Estrella (Mejorada)
    const matCount: Record<string, number> = {};
    
    ventasReales.forEach((q: any) => {
        q.items?.forEach((i: any) => {
            // Normalización de nombres (Igual que en SQL)
            let name = i.nombre_producto || i.descripcion_item || 'Varios / Insumos';
            
            // Limpieza extra por si acaso
            if (!name || name.trim() === '' || name === 'Producto') name = 'Varios / Insumos';
            if (name.includes('(')) name = name.split('(')[0].trim();
            
            // Sumamos DINERO, no cantidad
            const monto = Number(i.total_linea || 0);
            if (monto > 0) {
                matCount[name] = (matCount[name] || 0) + monto;
            }
        });
    });
    
    const sortedProducts = Object.entries(matCount).sort((a,b) => b[1] - a[1]);
    
    // Buscamos el top 1, evitando "Varios" si hay algo más específico que destaque
    let topProd = sortedProducts[0];
    if (topProd && (topProd[0].includes('Varios') || topProd[0].includes('Otros')) && sortedProducts.length > 1) {
        // Si el primero es "Varios", miramos si el segundo está cerca (ej: 80% del valor) para destacarlo mejor
        topProd = sortedProducts[1];
    }

    if (topProd) {
       tips.push({
         id: 'top_product',
         type: 'success',
         icon: Sparkles,
         title: 'Producto Estrella',
         message: `"${topProd[0]}" es tu líder real en facturación (${FORMATTER.format(topProd[1])}). Enfoca tu marketing aquí.`,
       });
    }

    // Si no hay nada, consejo por defecto
    if (tips.length === 0) {
        tips.push({
            id: 'default_tip',
            type: 'info',
            icon: Info,
            title: 'Esperando Ventas',
            message: 'Aún no hay ventas cerradas ("En Producción" o "Entregado") para analizar tendencias. ¡A vender!',
        });
    }

    return tips;
  }, [quotes]);


  // --- 2. INTELIGENCIA ARTIFICIAL ---
  const askGemini = async () => {
    setLoadingAI(true);
    try {
        // Preparamos datos REALES para la IA
        const ventasCerradas = quotes.filter((q:any) => ['En Producción', 'Entregado'].includes(q.estado));
        const ingresoTotal = ventasCerradas.reduce((acc: number, q: any) => acc + (q.total || 0), 0);
        const deudaTotal = quotes
            .filter((q:any) => !['Rechazada', 'Borrador'].includes(q.estado))
            .reduce((acc:any, q:any) => acc + (q.saldo_pendiente||0), 0);

        const resumen = {
            ventas_cerradas_qty: ventasCerradas.length,
            ingreso_real_total: ingresoTotal, // Le enviamos el dinero real
            monto_por_cobrar: deudaTotal,
            ticket_promedio: ventasCerradas.length > 0 ? Math.round(ingresoTotal / ventasCerradas.length) : 0,
            fecha: new Date().toLocaleDateString()
        };

        const prompt = `Actúa como consultor de negocios senior para una imprenta. Analiza estos datos financieros reales: ${JSON.stringify(resumen)}. 
        Dame 2 consejos estratégicos, breves y accionables en formato JSON estricto: [{"title": "...", "message": "...", "type": "info" (o warning/success)}]. 
        No uses markdown.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Error API Google:", data.error);
            throw new Error("Error de conexión con Google");
        }

        let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Limpieza de JSON (Robustez)
        const jsonStart = textResponse.indexOf('[');
        const jsonEnd = textResponse.lastIndexOf(']') + 1;
        
        if (jsonStart === -1) throw new Error("Formato inválido");
        
        const geminiTips = JSON.parse(textResponse.slice(jsonStart, jsonEnd));
        
        const tipsWithIcons = geminiTips.map((t: any, idx: number) => ({
            ...t,
            id: `ai_${idx}`,
            icon: t.type === 'success' || t.title.includes('Oportunidad') ? Sparkles : 
                  t.type === 'warning' || t.title.includes('Atención') ? AlertTriangle : BrainCircuit
        }));

        setAiTips(tipsWithIcons);
        toast.success('Análisis Estratégico Completado');

    } catch (error) {
        console.error("Fallo IA, usando respaldo:", error);
        toast.error('IA ocupada. Usando modo local...');
        
        setAiTips([
            {
                id: 'backup_1',
                title: 'Foco en Cobranza',
                message: 'La liquidez es rey. Revisa tus cuentas por cobrar antes de aceptar nuevos trabajos grandes.',
                type: 'warning',
                icon: AlertTriangle
            },
            {
                id: 'backup_2',
                title: 'Revisión de Costos',
                message: 'Si el dólar está alto, verifica que tus precios de venta base sigan cubriendo el margen deseado.',
                type: 'info',
                icon: TrendingUp
            }
        ]);
    } finally {
        setLoadingAI(false);
    }
  };

  const activeTips = aiTips || staticInsights;

  return (
    <div className="mb-8 animate-fade-in">
        <div className="flex justify-between items-end mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                {aiTips ? <><BrainCircuit size={14} className="text-violet-500"/> Reporte Inteligente</> : 'Análisis Automático'}
            </span>
            
            <button 
                onClick={askGemini} 
                disabled={loadingAI}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg
                ${loadingAI 
                    ? 'bg-slate-800 text-slate-400 cursor-wait' 
                    : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white hover:scale-105'
                }`}
            >
                {loadingAI ? <Loader size={14} className="animate-spin"/> : <BrainCircuit size={14}/>}
                {loadingAI ? 'Analizando...' : (aiTips ? 'Regenerar IA' : 'Consultar a IA')}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTips.map((tip) => (
                <div 
                    key={tip.id} 
                    className={`p-4 rounded-2xl border flex gap-4 items-start transition-all hover:shadow-md relative overflow-hidden
                    ${tip.type === 'danger' ? (dark ? 'bg-rose-900/10 border-rose-500/20' : 'bg-rose-50 border-rose-100') : ''}
                    ${tip.type === 'warning' ? (dark ? 'bg-amber-900/10 border-amber-500/20' : 'bg-amber-50 border-amber-100') : ''}
                    ${tip.type === 'success' ? (dark ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100') : ''}
                    ${tip.type === 'info' ? (dark ? 'bg-blue-900/10 border-blue-500/20' : 'bg-blue-50 border-blue-100') : ''}
                    `}
                >   
                    <div className={`p-2.5 rounded-xl shrink-0 z-10
                        ${tip.type === 'danger' ? 'bg-rose-500 text-white' : ''}
                        ${tip.type === 'warning' ? 'bg-amber-500 text-white' : ''}
                        ${tip.type === 'success' ? 'bg-emerald-500 text-white' : ''}
                        ${tip.type === 'info' ? 'bg-blue-500 text-white' : ''}
                    `}>
                        {tip.icon ? <tip.icon size={20} /> : <Info size={20}/>}
                    </div>
                    
                    <div className="z-10">
                        <h4 className={`font-bold text-sm mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>{tip.title}</h4>
                        <p className={`text-xs leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{tip.message}</p>
                    </div>
                </div>
            ))}
        </div>
        
        {aiTips && (
            <div className="text-center mt-3">
                <button onClick={() => setAiTips(null)} className="text-[10px] text-slate-500 hover:text-cyan-500 underline flex items-center justify-center gap-1 mx-auto transition-colors">
                    <RefreshCw size={10}/> Volver al análisis normal
                </button>
            </div>
        )}
    </div>
  );
};

export default SmartAdvisor;