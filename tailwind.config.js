/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pg: {
          bg: 'rgb(var(--pg-bg-main) / <alpha-value>)',
          card: 'rgb(var(--pg-bg-card) / <alpha-value>)',
          elevated: 'rgb(var(--pg-bg-elevated) / <alpha-value>)',
          
          primary: 'rgb(var(--pg-primary) / <alpha-value>)',
          'primary-hover': 'rgb(var(--pg-primary-hover) / <alpha-value>)',
          'primary-light': 'rgb(var(--pg-primary-light) / <alpha-value>)',
          
          cyan: 'rgb(var(--pg-cyan) / <alpha-value>)',
          
          success: 'rgb(var(--pg-status-success) / <alpha-value>)',
          warning: 'rgb(var(--pg-status-warning) / <alpha-value>)',
          danger: 'rgb(var(--pg-status-danger) / <alpha-value>)',
          
          text: 'rgb(var(--pg-text-main) / <alpha-value>)',
          secondary: 'rgb(var(--pg-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--pg-text-muted) / <alpha-value>)',
          
          border: 'rgb(var(--pg-border) / <alpha-value>)',
          'border-hover': 'rgb(var(--pg-border-hover) / <alpha-value>)',
        },
      },
      
      fontFamily: {
        roboto: ["Roboto", "sans-serif"],
      },
      
      boxShadow: {
        'pg-glow': "0 0 20px var(--pg-cyan-glow)",
        'pg-card': "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      },
      
      borderRadius: {
        'pg': '1rem',
      },
    },
  },
  plugins: [],
};