import base64
from email.message import EmailMessage
from typing import Dict, Any, List, Optional
from auth import obtener_servicio_gmail

def leer_correo(query: str) -> List[Dict[str, Any]]:
    """
    Busca correos electrónicos y extrae su contenido, incluyendo la detección lógica de archivos PDF.
    
    Parámetros:
        query (str): Cadena de búsqueda con la sintaxis estándar de Gmail (ej. "is:unread has:attachment").
        
    Retorno:
        List[Dict[str, Any]]: Lista de diccionarios con asunto, cuerpo, message_id, thread_id, 
                              has_attachment (bool) y los metadatos del adjunto si existe (attachment_id, filename).
    """
    service = obtener_servicio_gmail()
    try:
        results = service.users().messages().list(userId='me', q=query).execute()
        messages = results.get('messages', [])
        
        correos_procesados = []
        
        for msg in messages:
            msg_data = service.users().messages().get(
                userId='me', id=msg['id'], format='full'
            ).execute()
            
            payload = msg_data.get('payload', {})
            headers = payload.get('headers', [])
            
            asunto = next((h['value'] for h in headers if h['name'] == 'Subject'), "Sin asunto")
            
            cuerpo = ""
            has_attachment = False
            attachment_id = None
            filename = None
            
            # Función recursiva para buscar el cuerpo del texto y adjuntos en la estructura multipart
            def procesar_partes(parts):
                nonlocal cuerpo, has_attachment, attachment_id, filename
                for part in parts:
                    mime_type = part.get('mimeType', '')
                    if mime_type == 'text/plain' and 'data' in part.get('body', {}):
                        cuerpo = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                    elif 'attachmentId' in part.get('body', {}):
                        has_attachment = True
                        if mime_type == 'application/pdf' or part.get('filename', '').endswith('.pdf'):
                            attachment_id = part['body']['attachmentId']
                            filename = part.get('filename', 'documento.pdf')
                    elif 'parts' in part:
                        procesar_partes(part['parts'])
            
            if 'parts' in payload:
                procesar_partes(payload['parts'])
            elif payload.get('mimeType') == 'text/plain':
                cuerpo = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
                
            correos_procesados.append({
                "message_id": msg_data['id'],
                "thread_id": msg_data['threadId'],
                "asunto": asunto,
                "cuerpo": cuerpo,
                "has_attachment": has_attachment,
                "attachment_metadata": {"id": attachment_id, "name": filename} if attachment_id else None
            })
            
        return correos_procesados
    except Exception as e:
        raise RuntimeError(f"Error al leer el correo: {str(e)}")

def extraer_bytes_adjunto(message_id: str, attachment_id: str) -> bytes:
    """
    Descarga y decodifica los bytes de un archivo adjunto desde la API de Gmail.
    
    Parámetros:
        message_id (str): Identificador único del mensaje en Gmail.
        attachment_id (str): Identificador único del archivo adjunto extraído en la lectura.
        
    Retorno:
        bytes: Flujo de bytes (binario) del archivo decodificado.
    """
    service = obtener_servicio_gmail()
    try:
        adjunto = service.users().messages().attachments().get(
            userId='me', messageId=message_id, id=attachment_id
        ).execute()
        
        file_data = base64.urlsafe_b64decode(adjunto['data'])
        return file_data
    except Exception as e:
        raise RuntimeError(f"Error al extraer bytes del adjunto: {str(e)}")

def responder_correo(message_usr: str, message_id: str, thread_id: str) -> bool:
    """
    Envía una respuesta a un correo existente manteniendo la coherencia del hilo (threading).
    
    Parámetros:
        message_usr (str): Contenido textual de la respuesta a enviar.
        message_id (str): Identificador del mensaje al cual se responde.
        thread_id (str): Identificador del hilo de conversación.
        
    Retorno:
        bool: True si la respuesta se envió exitosamente, False en caso contrario.
    """
    service = obtener_servicio_gmail()
    try:
        # Obtener cabeceras del correo original para estructurar la respuesta
        msg_original = service.users().messages().get(
            userId='me', id=message_id, format='metadata', 
            metadataHeaders=['Subject', 'From', 'Message-ID', 'References']
        ).execute()
        
        headers = msg_original['payload']['headers']
        asunto_original = next((h['value'] for h in headers if h['name'] == 'Subject'), "")
        destinatario = next((h['value'] for h in headers if h['name'] == 'From'), "")
        msg_id_rfc = next((h['value'] for h in headers if h['name'] == 'Message-ID'), "")
        references = next((h['value'] for h in headers if h['name'] == 'References'), msg_id_rfc)

        # Construir el objeto MIME
        correo = EmailMessage()
        correo.set_content(message_usr)
        correo['To'] = destinatario
        correo['Subject'] = asunto_original if asunto_original.startswith("Re:") else f"Re: {asunto_original}"
        correo['In-Reply-To'] = msg_id_rfc
        correo['References'] = f"{references} {msg_id_rfc}".strip()

        raw_message = base64.urlsafe_b64encode(correo.as_bytes()).decode()
        cuerpo_peticion = {
            'raw': raw_message,
            'threadId': thread_id
        }

        service.users().messages().send(userId='me', body=cuerpo_peticion).execute()
        return True
    except Exception as e:
        print(f"Error al responder correo: {str(e)}")
        return False

def marcar_como_leido(message_id: str) -> bool:
    """
    Elimina la etiqueta UNREAD de un mensaje en Gmail.
    
    Parámetros:
        message_id (str): Identificador único del mensaje.
        
    Retorno:
        bool: True si la modificación fue exitosa, False en caso contrario.
    """
    service = obtener_servicio_gmail()
    try:
        service.users().messages().modify(
            userId='me', id=message_id, body={'removeLabelIds': ['UNREAD']}
        ).execute()
        return True
    except Exception as e:
        print(f"Error al marcar como leído: {str(e)}")
        return False

def marcar_como_no_leido(message_id: str) -> bool:
    """
    Agrega la etiqueta UNREAD a un mensaje en Gmail.
    
    Parámetros:
        message_id (str): Identificador único del mensaje.
        
    Retorno:
        bool: True si la modificación fue exitosa, False en caso contrario.
    """
    service = obtener_servicio_gmail()
    try:
        service.users().messages().modify(
            userId='me', id=message_id, body={'addLabelIds': ['UNREAD']}
        ).execute()
        return True
    except Exception as e:
        print(f"Error al marcar como no leído: {str(e)}")
        return False