import pandas as pd
import sys

# Ajusta el nombre si tu archivo se llama diferente
archivo = "enero.csv" 

print(f"--- ANALIZANDO: {archivo} ---")
try:
    df = pd.read_csv(archivo, sep=';', encoding='latin1')
    
    print("\n1. LAS PRIMERAS 5 COLUMNAS SON:")
    for i, col in enumerate(df.columns[:5]):
        print(f"   [{i}] {col}")

    print("\n2. LA PRIMERA FILA DE DATOS ES:")
    primera_fila = df.iloc[0]
    for i, (col, val) in enumerate(primera_fila.items()):
        if i < 5: # Solo mostrar las primeras 5 para no llenar la pantalla
            print(f"   Columna '{col}' contiene: {val}")

except Exception as e:
    print(f"Error: {e}")