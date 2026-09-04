import asyncio
from google.adk.runners import Runner
from google.adk.artifacts import InMemoryArtifactService
from google.adk.sessions import InMemorySessionService
from google.genai import types

from agent import root_agent 

async def ejecutar_auditoria():
    session_id = "auditoria_session_1"
    session_service = InMemorySessionService()
    
    # 1. Creamos la sesión explícitamente en la memoria antes de correr el runner
    await session_service.create_session(
        session_id=session_id,
        app_name="auditor_autonomo",
        user_id="default_user"
    )

    # 2. Configuramos el ejecutor
    runner = Runner(
        agent=root_agent,
        app_name="auditor_autonomo",
        session_service=session_service,
        artifact_service=InMemoryArtifactService()
    )
    
    prompt_inicial = "Inicia la lectura de correos y realiza la auditoría de movimientos."
    print("Iniciando proceso autónomo...")
    
    user_message = types.Content(role="user", parts=[types.Part(text=prompt_inicial)])
    
    # 3. Ejecutamos el flujo
    async for evento in runner.run_async(
        user_id="default_user",
        session_id=session_id,
        new_message=user_message
    ):
        if hasattr(evento, 'content') and evento.content:
            for part in evento.content.parts:
                if part.text:
                    print(f"Salida del Agente:\n{part.text}")
        elif hasattr(evento, 'text') and evento.text:
            print(f"Salida del Agente:\n{evento.text}")
            
    print("Auditoría finalizada. Apagando contenedor.")

if __name__ == "__main__":
    asyncio.run(ejecutar_auditoria())