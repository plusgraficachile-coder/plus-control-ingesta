name: Ingesta Mercado Público (Debug Mode)

on:
  workflow_dispatch: # Botón manual

jobs:
  ingest:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout código
      uses: actions/checkout@v4

    - name: 🔍 DIAGNOSTICO DE ARCHIVOS (La Verdad)
      run: |
        echo "📂 ¿En qué carpeta estoy?"
        pwd
        echo "📄 ¿Qué archivos hay aquí?"
        ls -la
        echo "🌳 Árbol completo de archivos:"
        ls -R

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        
    - name: Instalar dependencias
      run: npm install

    - name: Ejecutar Ingesta
      env:
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        MP_TICKET: ${{ secrets.MP_TICKET }}
      run: node ingest-mp.js
