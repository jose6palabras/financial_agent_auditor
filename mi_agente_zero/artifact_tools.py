from google.adk.tools import ToolContext
from google.genai import types
from gmail_tools import extraer_bytes_adjunto

# ====================================================
# función puente para cargar un archivo adjunto desde Gmail al contexto del agente
async def procesar_y_guardar_adjunto(message_id: str, attachment_id: str, filename: str, tool_context: ToolContext) -> str:
    """
    Descarga un archivo adjunto desde un correo y lo inyecta directamente en la memoria del agente.
    El agente debe usar esta herramienta cuando encuentre un correo con un documento adjunto.
    """
    try:
        file_bytes = extraer_bytes_adjunto(message_id, attachment_id)
        
        artifact = types.Part.from_bytes(
            data=file_bytes, 
            mime_type="application/pdf"
        )
        
        # Agregamos 'await' para esperar la resolución de la promesa del framework
        version = await tool_context.save_artifact(filename=filename, artifact=artifact)
        
        return f"El adjunto '{filename}' se descargó y guardó en el contexto correctamente (versión {version}). Ahora puedes analizar su contenido."
    except Exception as e:
        return f"Error al procesar el adjunto: {str(e)}"

async def analizar_pdf_almacenado(filename: str, tool_context: ToolContext):
    """
    Lee un documento PDF previamente guardado en el sistema de artefactos.
    El agente debe usar esta herramienta para acceder al contenido visual y textual del PDF.
    """
    try:
        # Agregamos 'await' para recuperar el binario correctamente
        artifact = await tool_context.load_artifact(filename)
        
        if not artifact:
            return f"Error: No se encontró ningún archivo con el nombre '{filename}'. Verifica que haya sido procesado."
        
        return artifact
        
    except Exception as e:
        return f"Error interno al intentar cargar el archivo para análisis: {str(e)}"
