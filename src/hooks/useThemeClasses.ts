// ============================================================
// hooks/useThemeClasses.ts
// Fuente única de verdad para todos los estilos dark/light.
// Todos los componentes deben importar desde aquí.
// ============================================================

export const useThemeClasses = (dark: boolean) => ({
  // ── Contenedores ──────────────────────────────────────────
  card: dark
    ? 'bg-slate-800 border-slate-700 text-slate-100 shadow-slate-900/20'
    : 'bg-white border-slate-200 text-slate-800 shadow-sm',

  // Card elevada (item dentro de card)
  cardInner: dark
    ? 'bg-slate-700/30 border-slate-600'
    : 'bg-slate-50 border-slate-200',

  // Panel lateral / resumen (fondo más oscuro en dark)
  panel: dark
    ? 'bg-slate-900 border-slate-700'
    : 'bg-slate-50 border-slate-200',

  // Fondo de página / kanban column
  pageBg: dark ? 'bg-[#0f172a]' : 'bg-[#F0F2F5]',
  colBg:  dark ? 'bg-[#0f172a]/80' : 'bg-[#E8EAED]',

  // ── Inputs ────────────────────────────────────────────────
  input: dark
    ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-cyan-500'
    : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:ring-cyan-200',

  // Input dentro del panel resumen
  panelInput: dark
    ? 'bg-slate-800 border-slate-600 text-white'
    : 'bg-white border-slate-200 text-slate-700',

  // ── Tipografía ────────────────────────────────────────────
  textMain:  dark ? 'text-white'      : 'text-slate-800',
  textSub:   dark ? 'text-slate-400'  : 'text-slate-500',
  textMuted: dark ? 'text-slate-500'  : 'text-slate-400',

  // Label pequeño UPPERCASE
  label: 'text-[10px] font-bold uppercase text-slate-500 mb-1 block',

  // ── Bordes / divisores ────────────────────────────────────
  border:   dark ? 'border-slate-700'     : 'border-slate-200',
  divider:  dark ? 'border-slate-700'     : 'border-slate-200',

  // ── Tabla ─────────────────────────────────────────────────
  tableHeader: dark
    ? 'bg-slate-900/50 text-slate-400 border-slate-700'
    : 'bg-slate-50 text-slate-500 border-slate-100',
  tableRowHover: dark
    ? 'hover:bg-slate-700/50 border-slate-700'
    : 'hover:bg-slate-50 border-slate-100',

  // ── Botones / badges ──────────────────────────────────────
  iconBtn: dark
    ? 'text-slate-400 hover:text-white hover:bg-slate-700'
    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',

  badge: dark
    ? 'bg-slate-800 text-white border-slate-700'
    : 'bg-slate-100 text-slate-700 border-slate-200',

  // ── Kanban cards ──────────────────────────────────────────
  kanbanCard: dark
    ? 'bg-[#1F2937] text-white border-white/5 hover:border-white/10'
    : 'bg-white text-slate-800 border-transparent hover:border-slate-200 shadow-sm hover:shadow-md',

  // ── Alertas / tips ────────────────────────────────────────
  tipDanger:  dark ? 'bg-rose-900/10 border-rose-500/20'     : 'bg-rose-50 border-rose-100',
  tipWarning: dark ? 'bg-amber-900/10 border-amber-500/20'   : 'bg-amber-50 border-amber-100',
  tipSuccess: dark ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100',
  tipInfo:    dark ? 'bg-blue-900/10 border-blue-500/20'     : 'bg-blue-50 border-blue-100',

  // ── Gráficos (valores hex para Recharts) ──────────────────
  chartGrid: dark ? '#334155' : '#e2e8f0',
  chartText: dark ? '#94a3b8' : '#64748b',
});

export type ThemeClasses = ReturnType<typeof useThemeClasses>;
