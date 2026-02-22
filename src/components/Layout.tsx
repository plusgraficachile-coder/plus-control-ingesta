// ============================================================
// components/Layout.tsx
// Diseño "Deep Glass" Premium + RADAR COMPLETO
// CON RADAR KANBAN + RADAR DESK (IA) + FINANZAS
// ============================================================

import React, { useState } from 'react';
import {
  LayoutDashboard, Moon, Sun, Menu, ChevronRight,
  Briefcase, Users, Layers, Package, Settings,
  PlusCircle, Activity, X,
  Receipt,   // ✅ Icono para Finanzas
  Radar,     // ✅ Icono para Radar Kanban
  Sparkles,  // ✅ Icono para Radar Desk (IA)
  Bell,
  Search,
  LogOut,
  User,
  HelpCircle
} from 'lucide-react';

// ============================================================
// CONFIGURACIÓN DE NAVEGACIÓN
// ============================================================

const NAV_ITEMS = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Panel Principal' },
  { id: 'finanzas',   icon: Receipt,         label: 'Finanzas' },
  { id: 'radar',      icon: Radar,           label: 'Radar Kanban' },    // ✅ Vista Kanban
  { id: 'radar-desk', icon: Sparkles,        label: 'Escritorio IA' },   // ✅ Vista Desk con IA
  { id: 'quotes',     icon: Briefcase,       label: 'Ventas' },
  { id: 'clients',    icon: Users,           label: 'Clientes' },
  { id: 'products',   icon: Layers,          label: 'Materiales' },
  { id: 'production', icon: Package,         label: 'Producción' },
];

const VIEW_LABELS: Record<string, string> = {
  dashboard:  'Panel de Control',
  finanzas:   'Control de Gastos e IVA',
  radar:      'Radar de Oportunidades',
  'radar-desk': 'Escritorio de Validación IA', // ✅ NUEVO
  quotes:     'Gestión de Ventas',
  clients:    'Cartera de Clientes',
  products:   'Inventario & Materiales',
  production: 'Flujo de Producción',
  settings:   'Configuración del Sistema',
};

// ============================================================
// COMPONENTE PRINCIPAL: LAYOUT
// ============================================================

interface LayoutProps {
  view: string;
  setView: (v: string) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  view,
  setView,
  darkMode,
  setDarkMode,
  children,
}) => {
  // Estados locales
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // ============================================================
  // ESTILOS DINÁMICOS
  // ============================================================

  const mainBg = darkMode 
    ? 'bg-[#0B1121] text-slate-100' 
    : 'bg-[#F8FAFC] text-slate-900';
  
  const sidebarBg = darkMode 
    ? 'bg-[#111827]/95 backdrop-blur-xl border-r border-white/5' 
    : 'bg-white/90 backdrop-blur-xl border-r border-slate-200 shadow-xl';

  const headerBg = darkMode
    ? 'bg-[#0B1121]/80 backdrop-blur-md border-b border-white/5'
    : 'bg-white/80 backdrop-blur-md border-b border-slate-200';

  // Función para estilos de botones activos
  const getButtonClass = (isActive: boolean) => {
    if (isActive) {
      return darkMode
        ? 'bg-cyan-500/10 text-cyan-400 border-l-[3px] border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
        : 'bg-cyan-50 text-cyan-700 border-l-[3px] border-cyan-600';
    }
    return darkMode
      ? 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border-l-[3px] border-transparent'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-l-[3px] border-transparent';
  };

  // ============================================================
  // NOTIFICACIONES (Ejemplo)
  // ============================================================

  const notificaciones = [
    { id: 1, tipo: 'radar', mensaje: '3 leads nuevos con score >80', tiempo: 'Hace 5 min' },
    { id: 2, tipo: 'venta', mensaje: 'Cotización #1234 aprobada', tiempo: 'Hace 1h' },
    { id: 3, tipo: 'produccion', mensaje: 'Orden #891 lista para entrega', tiempo: 'Hace 2h' },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${mainBg}`}>
      
      {/* ========== OVERLAY MÓVIL ========== */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* ========== SIDEBAR ========== */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 flex flex-col shadow-2xl 
          transition-transform duration-300 md:relative md:translate-x-0 
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          ${sidebarBg}
        `}
      >
        
        {/* Logo Area */}
        <div className={`p-6 flex items-center gap-3 border-b ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="relative group cursor-pointer" onClick={() => setView('dashboard')}>
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-lg"></div>
            {/* Logo */}
            <div className="relative w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg">
              P
            </div>
          </div>
          <div>
            <span className={`font-bold text-lg tracking-tight block leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Plus Control
            </span>
            <span className="text-[10px] font-medium tracking-wider text-cyan-500 uppercase">
              Business Intelligence
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-1.5 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 opacity-70">
            Menú Principal
          </div>
          
          {NAV_ITEMS.map((item) => {
            const isActive = view === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => { 
                  setView(item.id); 
                  setIsMobileMenuOpen(false); 
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 rounded-r-xl 
                  transition-all duration-300 group 
                  ${getButtonClass(isActive)}
                `}
              >
                <item.icon 
                  size={20} 
                  className={`
                    transition-transform duration-300 
                    ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                  `} 
                />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <ChevronRight 
                    size={14} 
                    className="ml-auto opacity-50 animate-pulse" 
                  />
                )}
                
                {/* Badge para Radar (ambos nuevos) */}
                {(item.id === 'radar' || item.id === 'radar-desk') && (
                  <span className="ml-auto bg-cyan-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    NUEVO
                  </span>
                )}
              </button>
            );
          })}

          <div className="flex-1"></div>

          {/* Settings Section */}
          <div className={`pt-4 mt-4 border-t ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
            <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 opacity-70">
              Sistema
            </div>
            <button
              onClick={() => { 
                setView('settings'); 
                setIsMobileMenuOpen(false); 
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-r-xl 
                transition-all duration-300 group 
                ${getButtonClass(view === 'settings')}
              `}
            >
              <Settings 
                size={20} 
                className={
                  view === 'settings' 
                    ? 'animate-spin-slow' 
                    : 'group-hover:rotate-90 transition-transform duration-500'
                } 
              />
              <span className="font-medium text-sm">Configuración</span>
            </button>
          </div>

          {/* User Info en Sidebar */}
          <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${darkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                LS
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Luis Silva
                </p>
                <p className="text-xs text-slate-500 truncate">
                  Administrador
                </p>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <main className="flex-1 flex flex-col h-screen relative">
        
        {/* ========== HEADER ========== */}
        <header className={`h-16 md:h-20 flex items-center justify-between px-4 md:px-8 z-20 sticky top-0 ${headerBg}`}>
          
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-slate-500 hover:text-cyan-500 transition-colors" 
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className={`font-bold text-lg md:text-2xl capitalize tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {VIEW_LABELS[view] || view}
            </h2>
            
            {/* Badge si estás en algún Radar */}
            {(view === 'radar' || view === 'radar-desk') && (
              <span className="hidden md:inline-flex items-center gap-1.5 bg-cyan-500/10 text-cyan-500 text-xs font-semibold px-3 py-1.5 rounded-full border border-cyan-500/20">
                {view === 'radar-desk' ? <Sparkles size={12} /> : <Radar size={12} />}
                {view === 'radar-desk' ? 'INTELIGENCIA ARTIFICIAL' : 'INTELIGENCIA COMERCIAL'}
              </span>
            )}
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            
            {/* Búsqueda Rápida */}
            <button 
              className={`
                hidden md:flex items-center gap-2 px-4 py-2 rounded-lg 
                transition-all duration-300
                ${darkMode 
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                }
              `}
            >
              <Search size={16} />
              <span className="text-sm">Buscar...</span>
              <kbd className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </button>

            {/* Notificaciones */}
            <div className="relative">
              <button 
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
                className={`
                  p-2.5 rounded-full transition-all duration-300 relative
                  ${darkMode 
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-110' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 hover:scale-110'
                  }
                `}
                title="Notificaciones"
              >
                <Bell size={18} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0B1121] animate-pulse"></span>
              </button>

              {/* Dropdown de Notificaciones */}
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)}></div>
                  <div className={`
                    absolute right-0 top-12 w-80 rounded-2xl shadow-2xl border p-2 z-40 
                    animate-in fade-in zoom-in-95 duration-200 origin-top-right
                    ${darkMode 
                      ? 'bg-[#1F2937] border-white/10 text-white' 
                      : 'bg-white border-slate-100 text-slate-800'
                    }
                  `}>
                    <div className="px-4 py-3 border-b border-dashed border-slate-500/20">
                      <p className="font-bold text-sm">Notificaciones</p>
                    </div>
                    <div className="py-2 max-h-96 overflow-y-auto">
                      {notificaciones.map((notif) => (
                        <button
                          key={notif.id}
                          className={`
                            w-full text-left px-4 py-3 rounded-xl transition-colors
                            ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                          `}
                        >
                          <p className="text-sm font-medium">{notif.mensaje}</p>
                          <p className="text-xs text-slate-500 mt-1">{notif.tiempo}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Toggle Dark Mode */}
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`
                p-2.5 rounded-full transition-all duration-300 
                ${darkMode 
                  ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700 hover:scale-110' 
                  : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 hover:scale-110'
                }
              `}
              title="Cambiar Tema"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            {/* "LA MALETA" (Menú Rápido) */}
            <div className="relative">
              <button 
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
                className={`
                  h-10 w-10 rounded-full flex items-center justify-center relative 
                  shadow-lg transition-transform hover:scale-105 
                  ${darkMode 
                    ? 'bg-gradient-to-tr from-slate-700 to-slate-600 text-slate-300 hover:text-white' 
                    : 'bg-gradient-to-tr from-slate-200 to-white text-slate-500 hover:text-cyan-600'
                  }
                `}
              >
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0B1121] z-10"></span>
                {isProfileOpen ? <X size={18} /> : <Briefcase size={18} />}
              </button>

              {/* MENÚ DESPLEGABLE */}
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsProfileOpen(false)}></div>
                  
                  <div className={`
                    absolute right-0 top-12 w-64 rounded-2xl shadow-2xl border p-2 z-40 
                    animate-in fade-in zoom-in-95 duration-200 origin-top-right 
                    ${darkMode 
                      ? 'bg-[#1F2937] border-white/10 text-white' 
                      : 'bg-white border-slate-100 text-slate-800'
                    }
                  `}>
                    <div className="px-4 py-3 border-b border-dashed border-slate-500/20">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Mi Empresa
                      </p>
                      <p className="font-bold text-base truncate">Plus Control</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] text-emerald-500 font-bold">
                          Sistema Operativo
                        </span>
                      </div>
                    </div>
                    
                    <div className="py-2">
                      {/* Acciones Rápidas */}
                      <button 
                        onClick={() => { 
                          setView('radar-desk'); 
                          setIsProfileOpen(false); 
                        }} 
                        className={`
                          w-full text-left px-4 py-2.5 text-sm rounded-xl 
                          flex items-center gap-3 transition-colors 
                          ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                        `}
                      >
                        <Sparkles size={16} className="text-purple-500"/> 
                        Escritorio IA
                      </button>
                      
                      <button 
                        onClick={() => { 
                          setView('radar'); 
                          setIsProfileOpen(false); 
                        }} 
                        className={`
                          w-full text-left px-4 py-2.5 text-sm rounded-xl 
                          flex items-center gap-3 transition-colors 
                          ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                        `}
                      >
                        <Radar size={16} className="text-cyan-500"/> 
                        Radar Kanban
                      </button>
                      
                      <button 
                        onClick={() => { 
                          setView('quotes'); 
                          setIsProfileOpen(false); 
                        }} 
                        className={`
                          w-full text-left px-4 py-2.5 text-sm rounded-xl 
                          flex items-center gap-3 transition-colors 
                          ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                        `}
                      >
                        <PlusCircle size={16} className="text-green-500"/> 
                        Nueva Cotización
                      </button>
                      
                      <button 
                        onClick={() => { 
                          setView('production'); 
                          setIsProfileOpen(false); 
                        }} 
                        className={`
                          w-full text-left px-4 py-2.5 text-sm rounded-xl 
                          flex items-center gap-3 transition-colors 
                          ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                        `}
                      >
                        <Activity size={16} className="text-amber-500"/> 
                        Ver Producción
                      </button>

                      <button 
                        onClick={() => { 
                          setView('products'); 
                          setIsProfileOpen(false); 
                        }} 
                        className={`
                          w-full text-left px-4 py-2.5 text-sm rounded-xl 
                          flex items-center gap-3 transition-colors 
                          ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                        `}
                      >
                        <Layers size={16} className="text-indigo-500"/> 
                        Inventario
                      </button>
                    </div>

                    {/* Divider */}
                    <div className={`my-2 border-t ${darkMode ? 'border-white/5' : 'border-slate-100'}`}></div>

                    {/* User Actions */}
                    <div className="py-2">
                      <button 
                        className={`
                          w-full text-left px-4 py-2.5 text-sm rounded-xl 
                          flex items-center gap-3 transition-colors 
                          ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                        `}
                      >
                        <User size={16} className="text-slate-400"/> 
                        Mi Perfil
                      </button>
                      
                      <button 
                        className={`
                          w-full text-left px-4 py-2.5 text-sm rounded-xl 
                          flex items-center gap-3 transition-colors 
                          ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                        `}
                      >
                        <HelpCircle size={16} className="text-slate-400"/> 
                        Ayuda
                      </button>
                      
                      <button 
                        className={`
                          w-full text-left px-4 py-2.5 text-sm rounded-xl 
                          flex items-center gap-3 transition-colors text-rose-500
                          ${darkMode ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'}
                        `}
                      >
                        <LogOut size={16} /> 
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ========== CONTENIDO PRINCIPAL ========== */}
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar overflow-x-hidden relative" 
          onClick={() => {
            setIsProfileOpen(false);
            setIsNotificationsOpen(false);
          }}
        >
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
