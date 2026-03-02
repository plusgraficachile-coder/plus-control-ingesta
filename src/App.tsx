import { useEffect } from 'react';
import { Toaster } from 'sonner';

// Hooks y Servicios
import { useAppLogic } from './hooks/useAppLogic';
import { quoteService } from './services/quoteService';

// Componentes
import ErrorBoundary from './components/ErrorBoundary';
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

  // ✅ AGREGAR ESTE useEffect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-pg-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-pg-border mx-auto" />
            <div className="w-16 h-16 rounded-full border-4 border-pg-primary border-t-transparent 
                            animate-spin absolute top-0 left-1/2 -translate-x-1/2" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-pg-text">
              Cargando Plus Control
            </p>
            <p className="text-xs text-pg-muted">
              Preparando tu entorno de trabajo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  const renderView = () => {
    switch (view) {
      case 'radar-desk':
        return (
          <ErrorBoundary moduleName="Escritorio de Validación">
            <div className="animate-slide-in">
              <RadarDesk userId={session?.user?.id || ''} dark={darkMode} />
            </div>
          </ErrorBoundary>
        );

      case 'radar':
        return (
          <ErrorBoundary moduleName="Radar de Negocios">
            <div className="animate-slide-in">
              <RadarDeNegocios
                supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
                supabaseKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
                userId={session?.user?.id || ''}
                dark={darkMode}
              />
            </div>
          </ErrorBoundary>
        );

      case 'finanzas':
        return (
          <ErrorBoundary moduleName="Finanzas">
            <div className="space-y-6 animate-slide-in">
              <div className="pg-card border-l-4 border-pg-primary">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pg-primary to-pg-cyan
                                  flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-pg-text">
                      Control de Gastos e IVA
                    </h2>
                    <p className="text-sm text-pg-muted">
                      Inteligencia de compras • Periodo actual
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashboardIVA />
                <div className="lg:col-span-2">
                  <TablaProveedores />
                </div>
              </div>
            </div>
          </ErrorBoundary>
        );

      case 'dashboard':
        return (
          <ErrorBoundary moduleName="Dashboard">
            <div className="animate-slide-in">
              <Dashboard quotes={quotes} materials={materials} dark={darkMode} onRefresh={fetchData} />
            </div>
          </ErrorBoundary>
        );

      case 'quotes':
        return (
          <ErrorBoundary moduleName="Cotizaciones">
            <div className="animate-slide-in">
              <QuoteManager
                quotes={quotes}
                catalogs={{ materiales: materials, clientes: clients }}
                onSave={handleSaveQuote}
                onDelete={handleDeleteQuote}
                onStatusChange={handleStatusChange}
                dark={darkMode}
              />
            </div>
          </ErrorBoundary>
        );

      case 'production':
        return (
          <ErrorBoundary moduleName="Producción Kanban">
            <div className="animate-slide-in">
              <ProductionKanban quotes={quotes} onStatusChange={handleStatusChange} dark={darkMode} />
            </div>
          </ErrorBoundary>
        );

      case 'materiales':
      case 'products':
        return (
          <ErrorBoundary moduleName="Materiales">
            <div className="animate-slide-in">
              <ProductManager materials={materials} dark={darkMode} onRefresh={fetchData} />
            </div>
          </ErrorBoundary>
        );

      case 'clients':
        return (
          <ErrorBoundary moduleName="Clientes">
            <div className="animate-slide-in">
              <ClientManager clients={clients} dark={darkMode} onRefresh={fetchData} />
            </div>
          </ErrorBoundary>
        );

      case 'settings':
        return (
          <ErrorBoundary moduleName="Configuración">
            <div className="animate-slide-in">
              <Settings dark={darkMode} session={session} discountRules={discountRules} onRefresh={fetchData} />
            </div>
          </ErrorBoundary>
        );

      default:
        return (
          <ErrorBoundary moduleName="Dashboard">
            <div className="animate-slide-in">
              <Dashboard quotes={quotes} materials={materials} dark={darkMode} onRefresh={fetchData} />
            </div>
          </ErrorBoundary>
        );
    }
  };

  return (
    <>
      <Toaster 
        position="top-right" 
        theme={darkMode ? 'dark' : 'light'} 
        richColors 
        closeButton
        toastOptions={{
          className: 'pg-card',
          style: {
            background: darkMode ? 'rgb(20, 27, 61)' : 'white',
            color: darkMode ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)',
            border: darkMode ? '1px solid rgb(30, 41, 59)' : '1px solid rgb(226, 232, 240)',
          }
        }}
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