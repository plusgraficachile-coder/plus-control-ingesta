#!/usr/bin/env python3
import pandas as pd
import sys
import re
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from pathlib import Path

# --- INICIO DE LA CORRECCIÓN DE RUTA ---
# Esto obliga a Python a buscar el .env en la carpeta "scripts"
ruta_script = Path(__file__).parent
ruta_env = ruta_script / '.env'

print(f"🔍 Buscando archivo .env en: {ruta_env}")
load_dotenv(dotenv_path=ruta_env)
# ---------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Depuración: Ver qué está leyendo (sin mostrar la llave completa)
if not SUPABASE_URL:
    print("❌ ERROR: No se encontró SUPABASE_URL")
else:
    print(f"✅ URL encontrada: {SUPABASE_URL[:20]}...")

if not SUPABASE_KEY:
    print("❌ ERROR: No se encontró SUPABASE_KEY")
else:
    print("✅ KEY encontrada.")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("\n⚠️  EL ARCHIVO .env PARECE ESTAR VACÍO O NO SE LEE.")
    print("   Por favor abre 'scripts/.env' y asegúrate de guardar los cambios (Ctrl+S).")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- FIN CONFIGURACIÓN ---

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
    ruta_csv = Path(archivo_csv)
    # Si no encuentra el CSV, intenta buscarlo en la misma carpeta del script
    if not ruta_csv.exists():
        ruta_csv = ruta_script / archivo_csv
    
    print(f"📂 Leyendo: {ruta_csv}")
    
    try:
        df = pd.read_csv(
            ruta_csv, 
            sep=';', 
            encoding='latin1', 
            thousands='.', 
            decimal=','
        )
        print(f"✅ Archivo leído. Columnas: {len(df.columns)}")
    except Exception as e:
        print(f"❌ Error leyendo CSV: {e}")
        return

    mapeo = {
        'Tipo Doc': 'tipo_dte',
        'Folio': 'folio',
        'Fecha Docto': 'fecha_emision',
        'RUT Proveedor': 'rut_emisor',
        'Razon Social': 'razon_social_emisor',
        'Monto Neto': 'monto_neto',
        'Monto Exento': 'monto_exento',
        'Monto Total': 'monto_total',
        'Monto IVA Recuperable': 'monto_iva', 
        'Monto IVA': 'monto_iva'
    }
    
    df = df.rename(columns=mapeo)
    
    if 'monto_iva' not in df.columns:
        print("⚠️ Buscando columna de IVA alternativa...")
        for col in df.columns:
            if 'IVA' in col and 'Recuperable' in col:
                df = df.rename(columns={col: 'monto_iva'})
                break
    if 'monto_iva' not in df.columns:
        df['monto_iva'] = 0

    print("🔄 Procesando datos...")
    
    registros_exitosos = 0
    
    for _, row in df.iterrows():
        try:
            if pd.isna(row['rut_emisor']) or pd.isna(row['folio']): continue

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
                'importado_desde': 'CSV_MANUAL'
            }
            
            supabase.table('compras_sii').insert(datos).execute()
            registros_exitosos += 1
            print(f"   ✅ Factura {datos['folio']} importada.")
            
        except Exception as e:
            if "duplicate key" not in str(e):
                print(f"   ⚠️ Error en fila: {e}")

    print(f"\n🎉 ¡LISTO! Se importaron {registros_exitosos} facturas nuevas.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python importar_compras_sii.py NOMBRE_ARCHIVO.csv")
    else:
        importar_csv(sys.argv[1])