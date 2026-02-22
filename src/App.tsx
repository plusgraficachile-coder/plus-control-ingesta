// ============================================================
// src/App.tsx - VERSIÓN CORREGIDA CON RADAR DE NEGOCIOS
// ============================================================

import { Toaster } from 'sonner';
import { Loader } from 'lucide-react';

// Hooks y Servicios
import { useAppLogic } from './hooks/useAppLogic';
import { quoteService } from './services/quoteService';

// Componentes
import TablaProveedores from './components/Dashboard/TablaProveedores';
import DashboardIVA from './components/Dashboard/DashboardIVA';
import LoginScreen from './components/LoginScreen';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import QuoteManager from "./components/QuoteManager"; 
import ProductManager from './components/ProductManager'; 
import ClientManager from './components/ClientManager'; 
import Settings from './components/Settings'; 
import ProductionKanban from './components/ProductionBoard';
import RadarDeNegocios from './components/RadarDeNegocios/RadarDeNegocios';
import { RadarDesk } from './components/RadarDeNegocios/RadarDesk';

function App() {
  // --- HOOK PERSONALIZADO (Gestiona todo el estado) ---
  const {
    session,
    loading,
    view,
    setView,
    darkMode,
    setDarkMode,
    quotes,
    clients,
    materials,
    discountRules,
    fetchData
  } = useAppLogic();

  // --- HANDLERS SIMPLIFICADOS ---
  const handleSaveQuote = async (quoteForm: any) => {
    const result = await quoteService.save(quoteForm, session?.user?.id);
    if (result.success) await fetchData();
  };

  const handleDeleteQuote = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta cotización?')) return;
    const result = await quoteService.delete(id);
    if (result.success) await fetchData();
  };

  const handleStatusChange = async (id: any, newStatus: string, extras = {}) => {
    const result = await quoteService.updateStatus(id, newStatus, extras);
    if (result.success) await fetchData();
  };

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1121] flex items-center justify-center">
        <Loader className="animate-spin text-cyan-400" size={40} />
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (!session) {
    return <LoginScreen />;
  }

  // --- RENDERIZADO DE VISTAS ---
const renderView = () => {
  switch (view) {
    // 🆕 RADAR DESK (ESCRITORIO IA)
    case 'radar-desk':
      return (
        <RadarDesk 
          userId={session?.user?.id || ''}
        />
      );

    // 🆕 RADAR KANBAN
    case 'radar':
      return (
        <RadarDeNegocios 
          supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
          supabaseKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
          userId={session?.user?.id || ''}
        />
      );

    // 🆕 FINANZAS & COMPRAS
    case 'finanzas':
      return (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
              Control de Gastos e IVA
            </h2>
            <p className="text-slate-500 text-xs uppercase tracking-widest">
              Inteligencia de Compras - Periodo Actual
            </p>
          </div>

          {/* KPIs y Tablas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* IVA Crédito */}
            <DashboardIVA />
            
            {/* Ranking Proveedores */}
            <div className="lg:col-span-2">
              <TablaProveedores />
            </div>
          </div>
        </div>
      );

      // PANEL PRINCIPAL (Dashboard limpio)
      case 'dashboard':
        return (
          <Dashboard 
            quotes={quotes} 
            materials={materials} 
            dark={darkMode} 
            onRefresh={fetchData} 
          />
        );

      // VENTAS (QuoteManager limpio, sin KPIs de finanzas)
      case 'quotes':
        return (
          <QuoteManager 
            quotes={quotes}
            catalogs={{ materiales: materials, clientes: clients }} 
            onSave={handleSaveQuote}
            onDelete={handleDeleteQuote}
            onStatusChange={handleStatusChange}
            dark={darkMode}
          />
        );

      // PRODUCCIÓN
      case 'production':
        return (
          <ProductionKanban 
            quotes={quotes} 
            onStatusChange={handleStatusChange} 
            dark={darkMode} 
          />
        );

      // MATERIALES
      case 'materiales':
      case 'products':
        return (
          <ProductManager 
            materials={materials} 
            dark={darkMode} 
            onRefresh={fetchData} 
          />
        );

      // CLIENTES
      case 'clients':
        return (
          <ClientManager 
            clients={clients} 
            dark={darkMode} 
            onRefresh={fetchData} 
          />
        );

      // CONFIGURACIÓN
      case 'settings':
        return (
          <Settings 
            dark={darkMode} 
            session={session} 
            discountRules={discountRules} 
            onRefresh={fetchData} 
          />
        );

      // DEFAULT: Panel Principal
      default:
        return (
          <Dashboard 
            quotes={quotes} 
            materials={materials} 
            dark={darkMode} 
            onRefresh={fetchData} 
          />
        );
    }
  };

  // --- RENDER PRINCIPAL ---
  return (
    <>
      <Toaster 
        position="top-right" 
        theme={darkMode ? 'dark' : 'light'} 
        richColors 
        closeButton 
      />
      
      <Layout 
        view={view} 
        setView={setView} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
      >
        {renderView()}
      </Layout>
    </>
  );
}

export default App;
