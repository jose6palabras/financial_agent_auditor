/**
 * @fileoverview Script principal orquestador.
 * Versión 1.1 (Con reglas de encolamiento y ventana operativa por horarios)
 */
function iniciarProcesoPrincipal() {
  Logger.log("================ INICIO DEL PROCESO ================");

  try {
    // --- 1. VENTANA DE TIEMPO (8:20 AM a 8:20 PM) ---
    // Calculamos el tiempo total en minutos desde las 00:00 para comparaciones precisas.
    const zonaHoraria = Session.getScriptTimeZone();
    const hora = parseInt(Utilities.formatDate(new Date(), zonaHoraria, "HH"), 10);
    const minuto = parseInt(Utilities.formatDate(new Date(), zonaHoraria, "mm"), 10);
    const minutosDelDia = (hora * 60) + minuto;

    const inicioOperacion = (8 * 60) + 20;  // 500 minutos (08:20 AM)
    const finOperacion = (20 * 60) + 20;    // 1220 minutos (08:20 PM)

    if (minutosDelDia < inicioOperacion || minutosDelDia > finOperacion) {
      // Formateo visual para el log (ej. "08:15" en lugar de "8:15")
      const logMinuto = minuto < 10 ? '0' + minuto : minuto;
      const logHora = hora < 10 ? '0' + hora : hora;
      
      Logger.log(`[REGLA DE NEGOCIO] Ejecución omitida. La hora actual (${logHora}:${logMinuto}) está fuera de la ventana operativa (08:20 - 20:20).`);
      Logger.log("================ FIN DEL PROCESO ================");
      return; // Salimos sin hacer peticiones a Gmail
    }
    // --- 2. Control de Supervivencia de Ejecución ---
    const tiempoInicio = Date.now();
    const TIEMPO_MAXIMO_MS = 1000 * 60 * 28.5; // 28.5 minutos de margen seguro
    // --- 3. Búsqueda de Correos ---
    const threadsGenerales = buscarCorreosParaProcesar();

    if (!threadsGenerales || threadsGenerales.length === 0) {
      Logger.log("No hay correos nuevos para procesar. Finalizando ejecución.");
      Logger.log("================ FIN DEL PROCESO ================");
      return;
    }

    // --- 4. REGLA DE NEGOCIO: LÍMITE DE PROCESAMIENTO (BATCH DE 4) ---
    const LOTE_MAXIMO = 4;
    // Extraemos solo los primeros 4 elementos de la cola. El resto se queda en Gmail como "No Leído" para los próximos 10 minutos.
    const threads = threadsGenerales.slice(0, LOTE_MAXIMO);

    Logger.log(`[COLA DE TRABAJO] Se encontraron ${threadsGenerales.length} hilos pendientes. Procesando lote máximo de ${threads.length} correos.`);

    // --- 5. Bucle Principal ---
    for (const thread of threads) {

      // Control de Supervivencia: ¿Nos queda tiempo?
      if (Date.now() - tiempoInicio > TIEMPO_MAXIMO_MS) {
        Logger.log("[ALERTA TIMEOUT] Se alcanzó el 95% del tiempo de ejecución. Deteniendo ciclo para evitar Crash.");
        break; // Detiene el bucle, la función termina limpiamente y retoma los correos pendientes en el próximo Trigger.
      }

      // Aislamiento de Errores por Correo (Try-Catch interno)
      try {
        const messages = thread.getMessages();
        const lastMessage = messages[messages.length - 1];
        const asunto = lastMessage.getSubject();

        // Extraer información del asunto
        const subject_extracted = extraerInfoDelAsunto(asunto);

        // --- VALIDACIÓN DE FECHA (Mismo Día) ---
        const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
        const fechaCorreoStr = (typeof subject_extracted.fecha === 'string')
          ? subject_extracted.fecha
          : Utilities.formatDate(subject_extracted.fecha, Session.getScriptTimeZone(), "yyyy-MM-dd");

        if (fechaCorreoStr === hoy) {
          Logger.log(`[REGLA DE NEGOCIO] Saltando correo: "${asunto}". Motivo: Es del día de hoy (${hoy}). Se procesará mañana.`);
          continue; // Pasa al siguiente correo. Al no marcarse como leído, lo intentará mañana.
        }

        Logger.log(`Analizando correo: "${asunto}"`);

        // --- Recolección de Recursos ---
        const adjuntosFisicos = lastMessage.getAttachments() || [];
        const cuerpoHtml = lastMessage.getBody();
        const idsDrive = extraerIdsDeDrive(cuerpoHtml) || [];

        let archivosParaProcesar = [...adjuntosFisicos];

        if (idsDrive.length > 0) {
          Logger.log(`  -> Se detectaron ${idsDrive.length} enlaces a Drive.`);
          for (const id of idsDrive) {
            try {
              const archivoDrive = DriveApp.getFileById(id);
              const blobDrive = archivoDrive.getBlob().setName(archivoDrive.getName());
              archivosParaProcesar.push(blobDrive);
            } catch (e) {
              console.warn(`  -> Advertencia: No se pudo acceder al archivo de Drive ID ${id}. Detalle: ${e.message}`);
              alertaError('ERROR DE PERMISOS EN DRIVE -> ' + e.message, asunto, obtenerFechaFormateada(), CONFIG.NOTIFICACIONES.CORRREOS_OPERACIONES);
            }
          }
        }

        // --- Evaluación de Escenarios ---
        if (archivosParaProcesar.length === 0) {
          console.warn(`  -> El correo "${asunto}" no contiene archivos adjuntos ni enlaces válidos. Se omite.`);
          thread.markRead();
          continue;
        }

        console.log(`  -> Procesando ${archivosParaProcesar.length} archivos en total.`);

        const emailBodyTexto = lastMessage.getPlainBody();
        // INGRESO PROCESO ALTERNATIVO DE NOTAS FALTANTES V1.1
        // ====================================================================
        // NUEVA LÓGICA: FLUJO ALTERNATIVO PARA DOCUMENTOS FALTANTES
        // ====================================================================
        const esFaltante = asunto.includes('--FALTANTE--') || emailBodyTexto.includes('--FALTANTE--');

        if (esFaltante) {
          Logger.log(`[FLUJO ALTERNATIVO] Se detectó envío de documento FALTANTE para la agencia ${subject_extracted.agencia}`);
          
          // Solo llamamos a la función indicando que esFaltante = true. 
          // Ella se encargará de rutear a la carpeta existente y poner el nombre correcto.
          const resultadoFaltante = guardadoDriveJerarquico(
            archivosParaProcesar,
            subject_extracted.agencia,
            subject_extracted.fecha,
            true // <--- PASAMOS LA BANDERA AQUÍ
          );

          if (resultadoFaltante) {
            Logger.log(`  -> Documento FALTANTE guardado exitosamente. Se omite análisis de IA y usuarios.`);
          } else {
            console.error(`  -> Error al intentar guardar el archivo FALTANTE.`);
            alertaError('Fallo al guardar FALTANTE en Drive', subject_extracted.agencia, subject_extracted.fecha, CONFIG.NOTIFICACIONES.CORREOS_OPERACIONES);
          }

          // Finalizar este correo sin afectar el resto del lote
          thread.markRead();
          continue; 
        }
        // ====================================================================
        // FINAL DEL INGRESO DE NOTAS FALTANTES V1.1
        const usuarios = extraerUsuariosDelCuerpo(emailBodyTexto);

        // --- Ejecución y Orquestación ---
        if (usuarios && usuarios.length > 0) {
          const resultadoGuardado = guardadoDriveJerarquico(
            archivosParaProcesar,
            subject_extracted.agencia,
            subject_extracted.fecha
          );

          if (resultadoGuardado) {
            Logger.log("  -> Guardado exitoso. Iniciando análisis de movimientos...");

            iniciarAnalisisDeMovimientos(
              resultadoGuardado.id_carpetafinal,
              resultadoGuardado.agencia,
              resultadoGuardado.fecha,
              usuarios,
              resultadoGuardado.ids_archivos 
            );

            Logger.log(`  -> Análisis finalizado para: "${asunto}"`);
          } else {
            console.error(`  -> Error lógico: La función guardadoDriveJerarquico devolvió un resultado inválido para "${asunto}".`);
            alertaError('Fallo al guardar archivos en Drive', subject_extracted.agencia, subject_extracted.fecha, CONFIG.NOTIFICACIONES.CORRREOS_OPERACIONES);
          }
        } else {
          Logger.log(`  -> ERROR: No se pudieron extraer usuarios del correo: "${asunto}"`);
          alertaError('No se detectaron usuarios en el cuerpo del correo', subject_extracted.agencia, subject_extracted.fecha, CONFIG.NOTIFICACIONES.CORRREOS_OPERACIONES);
        }

        // --- FIN DE PROCESAMIENTO EXITOSO DEL CORREO ---
        thread.markRead();
        Logger.log(`[ÉXITO] El correo con asunto "${asunto}" ha sido procesado completamente y marcado como leído.`);

      } catch (errorCorreo) {
        // --- MANEJO DE ERROR CRÍTICO POR CORREO ---
        console.error(`ERROR al procesar el correo "${thread.getFirstMessageSubject()}": ${errorCorreo.message}`);
        thread.markRead(); // Vital para evitar bloqueos en cola
        
        // Etiquetamos para control visual de Operaciones si la etiqueta existe
        try {
          const label = GmailApp.getUserLabelByName("Error_Bot");
          if(label) thread.addLabel(label);
        } catch(e){}

        Logger.log("El correo conflictivo ha sido marcado como leído para evitar bloqueos continuos.");
      }
    }

  } catch (errorGlobal) {
    console.error(`ERROR CATASTRÓFICO en orquestador principal: ${errorGlobal.stack}`);
    const erroremail = 'Error URGENTE en proceso principal -> ' + errorGlobal.message;
    alertaError(erroremail, 'SISTEMA', obtenerFechaFormateada(), CONFIG.NOTIFICACIONES.CORRREOS_OPERACIONES);
  }

  Logger.log("================ FIN DEL PROCESO ================");
}