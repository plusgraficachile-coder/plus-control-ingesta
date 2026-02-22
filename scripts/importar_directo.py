import pandas as pd
import sys
import re
from datetime import datetime
from supabase import create_client, Client
import os

# --- CREDENCIALES DIRECTAS (SIN ARCHIVO .ENV) ---
# Esto elimina el error de lectura del archivo
SUPABASE_URL = "https://zeiolwgqjovpwskdrgzy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaW9sd2dxam92cHdza2RyZ3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTY0NTU0MiwiZXhwIjoyMDgxMjIxNTQyfQ.ZW2PSLAj8DfnlHm-SPwAiAFl-ikmxcgst1h2XsCbRfc"

print(f"🔌 Conectando a Supabase: {SUPABASE_URL}...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("✅ Cliente iniciado correctamente.")

# --- FUNCIONES DE LIMPIEZA ---
def limpiar_rut(rut_str):
    if pd.isna(rut_str): return None
    rut_limpio = re.sub(r'[^0-9Kk]', '', str(rut_str))
    if len(rut_limpio) < 2: return None
    cuerpo = rut_limpio[:-1]
    dv = rut_limpio[-1].upper()
    if len(cuerpo) <= 6: return f"{cuerpo[:-3]}.{cuerpo[-3:]}-{dv}"
    return f"{cuerpo[:-6]}.{cuerpo[-6:-3]}.{cuerpo[-3:]}-{dv}"

def parsear_monto(monto):
    if pd.isna(monto) or str(monto).strip() == '': return 0.0
    if isinstance(monto, (int, float)): return float(monto)
    monto_limpio = str(monto).replace('.', '').replace(',', '.')
    try:
        return float(monto_limpio)
    except:
        return 0.0

def importar_csv(archivo_csv):
    print(f"📂 Leyendo archivo: {archivo_csv}")
    
    try:
        # Configuración forzada para tu archivo RCV del SII
        df = pd.read_csv(
            archivo_csv, 
            sep=';',            # Separador correcto
            encoding='latin1',  # Encoding correcto
            thousands='.', 
            decimal=','
        )
        print(f"✅ Archivo leído. Columnas detectadas: {len(df.columns)}")
    except Exception as e:
        print(f"❌ Error crítico leyendo el CSV: {e}")
        return

    # Mapeo de columnas
    mapeo = {
        'Tipo Doc': 'tipo_dte', 'Folio': 'folio', 'Fecha Docto': 'fecha_emision',
        'RUT Proveedor': 'rut_emisor', 'Razon Social': 'razon_social_emisor',
        'Monto Neto': 'monto_neto', 'Monto Exento': 'monto_exento',
        'Monto Total': 'monto_total', 'Monto IVA Recuperable': 'monto_iva', 
        'Monto IVA': 'monto_iva'
    }
    
    df = df.rename(columns=mapeo)
    
    # Asegurar columna IVA
    if 'monto_iva' not in df.columns:
        for col in df.columns:
            if 'IVA' in col and 'Recuperable' in col:
                df = df.rename(columns={col: 'monto_iva'})
                break
    if 'monto_iva' not in df.columns: df['monto_iva'] = 0

    print("🔄 Importando a Supabase...")
    registros_exitosos = 0
    
    for _, row in df.iterrows():
        try:
            if pd.isna(row.get('rut_emisor')) or pd.isna(row.get('folio')): continue

            datos = {
                'tipo_dte': int(row['tipo_dte']),
                'folio': int(row['folio']),
                'fecha_emision': pd.to_datetime(row['fecha_emision'], format='%d/%m/%Y').strftime('%Y-%m-%d'),
                'rut_emisor': limpiar_rut(row['rut_emisor']),
                'razon_social_emisor': str(row['razon_social_emisor'])[:200],
                'monto_neto': parsear_monto(row.get('monto_neto', 0)),
                'monto_iva': parsear_monto(row.get('monto_iva', 0)),
                'monto_exento': parsear_monto(row.get('monto_exento', 0)),
                'monto_total': parsear_monto(row.get('monto_total', 0)),
                'periodo_tributario': pd.to_datetime(row['fecha_emision'], format='%d/%m/%Y').strftime('%Y-%m'),
                'importado_desde': 'SCRIPT_DIRECTO'
            }
            
            supabase.table('compras_sii').insert(datos).execute()
            registros_exitosos += 1
            print(f"   ✅ Factura {datos['folio']} importada.")
            
        except Exception as e:
            if "duplicate key" not in str(e):
                print(f"   ⚠️ Error en fila: {e}")

    print(f"\n🎉 ¡VICTORIA! Se importaron {registros_exitosos} facturas.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python importar_directo.py NOMBRE_ARCHIVO.csv")
    else:
        importar_csv(sys.argv[1])