import json
import asyncio
from google.cloud import bigquery

async def almacenar_auditoria_bigquery(id_movimientos: str, datos_agente: dict) -> str:
    """
    Almacena el resultado de la auditoría en la tabla de BigQuery.
    
    Args:
        id_movimientos: Identificador único del movimiento (ej. Rionegro20260905).
        datos_agente: El objeto con los datos de la auditoría.
    """
    # Encapsulamos la lógica síncrona de la librería de BigQuery en una función interna
    def ejecutar_insercion():
        client = bigquery.Client()
        table_id = "project-abc8568c-462f-4195-846.movimientos_agencias.tab_data_agente"
        
        rows_to_insert = [
            {
                "id_movimientos": id_movimientos,
                # Convertimos el diccionario a string exclusivamente para la inserción
                "datos_agente": json.dumps(datos_agente) 
            }
        ]
        return client.insert_rows_json(table_id, rows_to_insert)

    try:
        # Ejecutamos la conexión en un hilo paralelo para no bloquear el framework del agente
        errores = await asyncio.to_thread(ejecutar_insercion)
        
        if not errores:
            return f"Datos almacenados exitosamente en BigQuery bajo el ID: {id_movimientos}"
        else:
            return f"Errores al insertar en BigQuery: {errores}"
            
    except Exception as e:
        return f"Error interno al conectar con BigQuery: {str(e)}"