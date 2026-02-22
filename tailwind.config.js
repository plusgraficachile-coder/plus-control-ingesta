/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Control total desde <html class="dark">
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* =========================
         🎨 COLORES DEL SISTEMA PG
         ========================= */
      colors: {
        pg: {
          bg: "var(--pg-bg-main)",
          card: "var(--pg-bg-card)",
          cyan: "var(--pg-cyan)",
          border: "var(--pg-border)",
          text: "var(--pg-text-main)",
          muted: "var(--pg-text-muted)",
          status: {
            warning: "var(--pg-status-warning)",
            danger: "var(--pg-status-danger)",
            success: "var(--pg-status-success)",
          },
        },
      },

      /* =========================
         🔤 TIPOGRAFÍA INDUSTRIAL
         ========================= */
      fontFamily: {
        roboto: ["Roboto", "sans-serif"],
      },

      /* =========================
         💡 EFECTOS DE MARCA
         ========================= */
      boxShadow: {
        'pg-glow': "0 0 15px var(--pg-cyan-glow)",
      },

      /* =========================
         📐 BORDES Y RADIOS
         ========================= */
      borderRadius: {
        'pg': '1.25rem',
      },
    },
  },
  plugins: [],
};
