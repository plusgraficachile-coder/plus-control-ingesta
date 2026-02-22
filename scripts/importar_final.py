import pandas as pd
import sys
import re
from datetime import datetime
from supabase import create_client, Client

# --- TUS CREDENCIALES ---
SUPABASE_URL = "https://zeiolwgqjovpwskdrgzy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaW9sd2dxam92cHdza2RyZ3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTY0NTU0MiwiZXhwIjoyMDgxMjIxNTQyfQ.ZW2PSLAj8DfnlHm-SPwAiAFl-ikmxcgst1h2XsCbRfc"

# Iniciar cliente
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
    monto_limpio = str(monto).replace('.', '').replace(',', '.')
    try:
        return float(monto_limpio)
    except:
        return 0.0

def importar_blindado(archivo_csv):
    print(f"🚀 Iniciando importación blindada de: {archivo_csv}")
    
    try:
        # Leemos ignorando los nombres de las cabeceras (header=0)
        df = pd.read_csv(archivo_csv, sep=';', encoding='latin1', header=0)
        
        # === CORRECCIÓN DEL DESPLAZAMIENTO ===
        # Detectamos si la columna 'Nro' contiene el Tipo DTE (33, 34, 61)
        primer_valor = str(df.iloc[0, 0]) # Fila 0, Columna 0
        
        if primer_valor in ['33', '34', '61', '56']:
            print("⚠️ DETECTADO DESPLAZAMIENTO DE COLUMNAS (Fix automático activado)")
            # Mapeo por ÍNDICE (Posición) basado en tu captura
            # [0]=TipoDTE, [1]=Giro, [2]=RUT, [3]=RazonSocial, [4]=Folio, [5]=Fecha
            
            # Usamos iloc para seleccionar por posición exacta
            col_tipo = df.iloc[:, 0]  # Columna 0
            col_rut = df.iloc[:, 2]   # Columna 2
            col_razon = df.iloc[:, 3] # Columna 3
            col_folio = df.iloc[:, 4] # Columna 4
            col_fecha = df.iloc[:, 5] # Columna 5
            
            # Para los montos, asumimos las posiciones estándar del SII relativas al desplazamiento
            # Usualmente: ... Fecha, Fecha, Fecha, Exento, Neto, IVA Rec ...
            # Índices estimados: 8=Exento, 9=Neto, 10=IVA Rec
            col_exento = df.iloc[:, 8]
            col_neto = df.iloc[:, 9]
            col_iva = df.iloc[:, 10]
            
        else:
            print("✅ Formato estándar detectado (sin desplazamiento)")
            col_tipo = df['Tipo Doc']
            col_rut = df['RUT Proveedor']
            col_razon = df['Razon Social']
            col_folio = df['Folio']
            col_fecha = df['Fecha Docto']
            col_exento = df['Monto Exento']
            col_neto = df['Monto Neto']
            col_iva = df['Monto IVA Recuperable']

    except Exception as e:
        print(f"❌ Error leyendo archivo: {e}")
        return

    print("🔄 Procesando facturas...")
    count = 0
    
    # Iteramos sobre los datos extraídos
    for i in range(len(df)):
        try:
            # Extraer valores individuales
            tipo_dte = int(col_tipo.iloc[i])
            rut = limpiar_rut(col_rut.iloc[i])
            
            if not rut: continue # Saltar si no hay RUT

            # Calcular montos
            neto = parsear_monto(col_neto.iloc[i])
            iva = parsear_monto(col_iva.iloc[i])
            exento = parsear_monto(col_exento.iloc[i])
            total = neto + iva + exento # Calculamos el total nosotros para evitar errores

            datos = {
                'tipo_dte': tipo_dte,
                'folio': int(col_folio.iloc[i]),
                'fecha_emision': pd.to_datetime(col_fecha.iloc[i], format='%d/%m/%Y').strftime('%Y-%m-%d'),
                'rut_emisor': rut,
                'razon_social_emisor': str(col_razon.iloc[i])[:200],
                'monto_neto': neto,
                'monto_iva': iva,
                'monto_exento': exento,
                'monto_total': total,
                'periodo_tributario': pd.to_datetime(col_fecha.iloc[i], format='%d/%m/%Y').strftime('%Y-%m'),
                'importado_desde': 'SCRIPT_FINAL'
            }

            supabase.table('compras_sii').insert(datos).execute()
            count += 1
            print(f"   ✅ Factura {datos['folio']} ({datos['razon_social_emisor']}) importada.")

        except Exception as e:
            if "duplicate key" not in str(e):
                print(f"   ⚠️ Fila {i}: {e}")

    print(f"\n🎉 ¡IMPORTACIÓN TERMINADA! {count} facturas guardadas.")

if __name__ == "__main__":
    # Nombre fijo de tu archivo renombrado
    importar_blindado("enero.csv")