/**
 * @fileoverview Módulo de Notificaciones y Alertas del Sistema.
 * Centraliza la comunicación de eventos y errores críticos para garantizar
 * la observabilidad y rápida respuesta del área de Operaciones.
 */

/**
 * Envía una alerta por correo electrónico cuando ocurre un error crítico.
 * Implementa un diseño HTML limpio para facilitar la lectura al equipo de soporte.
 * * @param {Error|string} error - El objeto de error nativo o el mensaje de error capturado.
 * @param {string} agencia - El nombre de la agencia afectada (ej. 'Pedregal').
 * @param {string} fecha - La fecha de los movimientos en formato 'YYYY-MM-DD'.
 * @param {Array<string>} [lista_correos] - (Opcional) Lista de correos a notificar. Si no se pasa, usa la centralizada.
 */
function alertaError(error, agencia, fecha, lista_correos) {
  try {
    // 1. Validación de entradas (Principio "Fail Fast")
    // Si no se proporciona una lista, hacemos fallback a nuestra configuración centralizada
    const destinatariosArray = (lista_correos && lista_correos.length > 0) 
                                ? lista_correos 
                                : CONFIG.NOTIFICACIONES.CORREOS_SOPORTE;
    
    // Convertimos el arreglo en un string separado por comas para la API de MailApp
    const destinatarios = destinatariosArray.join(',');
    const asunto = CONFIG.NOTIFICACIONES.ASUNTO_ERROR;
    
    // Extraemos el detalle del error (soporta objetos Error de JS o simples strings)
    const mensajeError = error instanceof Error ? error.stack || error.message : String(error);
    const nombreAgencia = agencia ? agencia : 'No identificada';
    const fechaFallo = fecha ? fecha : 'No identificada';

    // 2. Construcción del Cuerpo del Correo (Estructurado y limpio)
    // Utilizamos HTML en línea para asegurar que se renderice bien en Gmail y otros clientes
    const cuerpoHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 25px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        <h2 style="color: #d9534f; border-bottom: 2px solid #f2dede; padding-bottom: 10px; margin-top: 0;">
          ⚠️ Alerta Crítica del Sistema
        </h2>
        <p style="font-size: 14px;">Hola equipo,</p>
        <p style="font-size: 14px; line-height: 1.5;">
          Se ha detectado una anomalía en el Ecosistema de Auditoría Operativa. Es vital revisar este incidente para asegurar el correcto procesamiento de los movimientos de nuestros <strong>asociados</strong>.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold; width: 35%;">Agencia Afectada:</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #d9534f; font-weight: bold;">${nombreAgencia}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Fecha del Movimiento:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${fechaFallo}</td>
          </tr>
        </table>

        <div style="background-color: #fdf7f7; border-left: 5px solid #d9534f; padding: 15px; margin-top: 20px; border-radius: 0 4px 4px 0;">
          <h4 style="margin-top: 0; color: #a94442; font-size: 14px;">Detalles Técnicos del Error:</h4>
          <pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 12px; color: #555; background: #fff; padding: 10px; border: 1px solid #eee; border-radius: 4px;">${mensajeError}</pre>
        </div>
        
        <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
          Este es un mensaje automático generado por el Ecosistema de Revisión de Movimientos de Crearcoop.<br>
          <em>"Falla rápido, corrige rápido, mejora siempre."</em>
        </p>
      </div>
    `;

    // 3. Envío Seguro del Correo
    MailApp.sendEmail({
      to: destinatarios,
      subject: asunto,
      htmlBody: cuerpoHtml
    });

    console.log(`[AlertManager] ✉️ Alerta de error enviada exitosamente a: ${destinatarios}`);

  } catch (excepcion) {
    // Si falla el envío del correo (ej. cuota diaria excedida), lo registramos en los logs 
    // pero no rompemos la ejecución del sistema principal.
    console.error(`[AlertManager] ❌ Fallo crítico al intentar enviar la alerta de correo: ${excepcion.message}`);
  }
}