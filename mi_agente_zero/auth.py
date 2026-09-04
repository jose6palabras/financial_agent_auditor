import os
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Carga de variables de entorno definidas en .env
load_dotenv()

def obtener_servicio_gmail():
    """
    Construye y retorna el servicio de la API de Gmail.
    
    Retorno:
        Resource: Objeto de servicio de Google API Client para interactuar con Gmail.
    """
    try:
        # Recuperar credenciales desde las variables de entorno
        creds = Credentials(
            token=None, 
            refresh_token=os.environ.get("GMAIL_Refresh_Token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.environ.get("GMAIL_Client_ID"),
            client_secret=os.environ.get("GMAIL_Client_Secret")
        )
        # Construir el servicio de Gmail
        service = build('gmail', 'v1', credentials=creds)
        return service
    except Exception as e:
        raise RuntimeError(f"Error al inicializar el servicio de Gmail: {str(e)}")