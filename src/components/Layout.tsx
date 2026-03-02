import { 
  LayoutDashboard, 
  DollarSign, 
  Target, 
  Sparkles,
  ShoppingCart, 
  Users, 
  Layers, 
  Package, 
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface LayoutProps {
  view: string;
  setView: (view: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  children: React.ReactNode;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
}

const Layout = ({ view, setView, darkMode, setDarkMode, children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'finanzas', label: 'Finanzas', icon: DollarSign },
    { id: 'radar', label: 'Radar Kanban', icon: Target, badge: 'NUEVO' },
    { id: 'radar-desk', label: 'Escritorio IA', icon: Sparkles, badge: 'NUEVO' },
    { id: 'quotes', label: 'Ventas', icon: ShoppingCart },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'materiales', label: 'Materiales', icon: Layers },
    { id: 'production', label: 'Producción', icon: Package },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="flex h-screen bg-pg-bg overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-pg-card border-r border-pg-border flex-col">
        {/* Header */}
        <div className="p-6 border-b border-pg-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pg-primary to-pg-cyan 
                            flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-pg-text">Plus Control</h1>
              <p className="text-xs text-pg-primary font-semibold uppercase tracking-wide">
                Business Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          <p className="text-xs font-bold text-pg-muted uppercase tracking-widest px-3 mb-3">
            Menú Principal
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                           font-medium transition-all duration-200
                           ${isActive 
                             ? 'bg-gradient-to-r from-pg-primary to-pg-cyan text-white shadow-lg' 
                             : 'text-pg-secondary hover:bg-pg-elevated hover:text-pg-text'
                           }`}
              >
                <Icon size={20} />
                <span className="flex-1 text-left">{item.label}</span>
                
                {item.badge && (
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full border
                                   ${isActive 
                                     ? 'bg-white/20 text-white border-white/30' 
                                     : 'bg-pg-cyan/20 text-pg-cyan border-pg-cyan/30'
                                   }`}>
                    {item.badge}
                  </span>
                )}
                
                {isActive && (
                  <ChevronRight size={16} className="opacity-70" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sistema */}
        <div className="p-4 border-t border-pg-border space-y-1">
          <p className="text-xs font-bold text-pg-muted uppercase tracking-widest px-3 mb-3">
            Sistema
          </p>

          <button
            onClick={() => setView('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                       font-medium transition-all duration-200
                       ${view === 'settings'
                         ? 'bg-gradient-to-r from-pg-primary to-pg-cyan text-white shadow-lg'
                         : 'text-pg-secondary hover:bg-pg-elevated hover:text-pg-text'
                       }`}
          >
            <Settings size={20} />
            <span>Configuración</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                       text-pg-secondary hover:bg-pg-elevated hover:text-pg-text
                       font-medium transition-all duration-200"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          {/* User Card */}
          <div className="mt-4 p-3 rounded-lg bg-pg-elevated border border-pg-border
                         hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pg-primary to-pg-cyan 
                              flex items-center justify-center text-white font-bold shadow-sm">
                LS
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-pg-text truncate">
                  Luis Sáez
                </p>
                <p className="text-xs text-pg-muted">
                  Administrador
                </p>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                       text-pg-danger hover:bg-pg-danger/10
                       font-medium transition-all duration-200"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-pg-card border-b border-pg-border p-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pg-primary to-pg-cyan 
                              flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">P</span>
              </div>
              <div>
                <h1 className="font-bold text-pg-text">Plus Control</h1>
                <p className="text-xs text-pg-primary font-semibold">BI</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-pg-elevated text-pg-text"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            <div 
              className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            
            <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-pg-card border-r border-pg-border 
                              z-40 flex flex-col transform transition-transform duration-300">
              {/* Same content as desktop sidebar */}
              <div className="p-6 border-b border-pg-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pg-primary to-pg-cyan 
                                  flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">P</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-pg-text">Plus Control</h1>
                    <p className="text-xs text-pg-primary font-semibold uppercase tracking-wide">
                      Business Intelligence
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                <p className="text-xs font-bold text-pg-muted uppercase tracking-widest px-3 mb-3">
                  Menú Principal
                </p>

                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = view === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setView(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                 font-medium transition-all duration-200
                                 ${isActive 
                                   ? 'bg-gradient-to-r from-pg-primary to-pg-cyan text-white shadow-lg' 
                                   : 'text-pg-secondary hover:bg-pg-elevated hover:text-pg-text'
                                 }`}
                    >
                      <Icon size={20} />
                      <span className="flex-1 text-left">{item.label}</span>
                      
                      {item.badge && (
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border
                                         ${isActive 
                                           ? 'bg-white/20 text-white border-white/30' 
                                           : 'bg-pg-cyan/20 text-pg-cyan border-pg-cyan/30'
                                         }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border-t border-pg-border space-y-1">
                <p className="text-xs font-bold text-pg-muted uppercase tracking-widest px-3 mb-3">
                  Sistema
                </p>

                <button
                  onClick={() => {
                    setView('settings');
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                             font-medium transition-all duration-200
                             ${view === 'settings'
                               ? 'bg-gradient-to-r from-pg-primary to-pg-cyan text-white shadow-lg'
                               : 'text-pg-secondary hover:bg-pg-elevated hover:text-pg-text'
                             }`}
                >
                  <Settings size={20} />
                  <span>Configuración</span>
                </button>

                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                             text-pg-secondary hover:bg-pg-elevated hover:text-pg-text
                             font-medium transition-all duration-200"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                  <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                             text-pg-danger hover:bg-pg-danger/10
                             font-medium transition-all duration-200"
                >
                  <LogOut size={20} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="pg-container py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;