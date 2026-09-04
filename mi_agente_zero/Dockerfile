# 1. Usar una imagen oficial de Python ligera
FROM python:3.11-slim

# 2. Configurar variables de entorno de Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# 3. Establecer el directorio de trabajo en el contenedor
WORKDIR /app

# 4. Copiar e instalar dependencias primero (optimiza el caché de Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiar el resto del código del proyecto 
# (Esto incluirá agent.py, tools, credentials.json y token.json)
COPY . .

# 6. Exponer el puerto que espera Cloud Run
# EXPOSE 8080

# 7. Comando de ejecución
# Si usas el servidor HTTP integrado de ADK, el comando suele ser:
# CMD ["adk", "serve", "--host", "0.0.0.0", "--port", "8080"]
CMD ["python", "main.py"]

# NOTA: Si tu agente está diseñado para ejecutarse una sola vez y detenerse 
# (como un script de terminal), cambia el CMD a:
# CMD ["python", "tu_script_principal.py"]