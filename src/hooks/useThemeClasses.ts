// ============================================================
// utils/useThemeClasses.ts
// Hook que genera las clases de Tailwind según dark/light.
// Todos los componentes lo usan para estilos consistentes.
// ============================================================

export const useThemeClasses = (dark: boolean) => ({
  card: dark
    ? 'bg-slate-800 border-slate-700 text-slate-100 shadow-slate-900/20'
    : 'bg-white border-slate-200 text-slate-800 shadow-sm',
  input: dark
    ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-cyan-500'
    : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:ring-cyan-200',
  tableHeader: dark
    ? 'bg-slate-900/50 text-slate-400 border-slate-700'
    : 'bg-slate-50 text-slate-500 border-slate-100',
  tableRowHover: dark
    ? 'hover:bg-slate-700/50 border-slate-700'
    : 'hover:bg-slate-50 border-slate-100',
  textMain: dark ? 'text-white' : 'text-slate-800',
  textSub: dark ? 'text-slate-400' : 'text-slate-500',
  iconBtn: dark
    ? 'text-slate-400 hover:text-white hover:bg-slate-700'
    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
  chartGrid: dark ? '#334155' : '#e2e8f0',
  chartText: dark ? '#94a3b8' : '#64748b',
});
