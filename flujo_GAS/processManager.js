/**
 * @fileoverview Módulo para tareas posteriores al guardado del archivo.
 * Orquestador de Analisis y Procesamiento
 * Este orquestador tiene las tareas más robustas, trabajando con los ids compartidos de carpetas y archivos
 */
function iniciarAnalisisDeMovimientos(rutaDelPDF, agencia, fecha, usuarios, pdfid) {
  Logger.log(`================ INICIO ANÁLISIS: ${agencia} | FECHA: ${fecha} ================`);
  
  try {
    // 1. PREPARACIÓN DE CARPETA Y HOJA DE CÁLCULO
    const carpetaDestino = DriveApp.getFolderById(rutaDelPDF);
    const nombreSheet = `${agencia}-${fecha}`;
    
    // Generar copia y validar que no haya fallado
    const idPlantillaCopia = copia_plantilla(CONFIG.ARCHIVO_PLANTILLA);
    if (!idPlantillaCopia) {
      throw new Error(`Fallo crítico: No se pudo crear la copia de la plantilla para ${agencia}.`);
    }

    const archivo_plantilla = DriveApp.getFileById(idPlantillaCopia);
    archivo_plantilla.setName(nombreSheet);
    archivo_plantilla.moveTo(carpetaDestino);
    Logger.log(`Hoja de Cálculo creada y movida a: ${carpetaDestino.getName()}`);

    // 2. CONSULTA A BIGQUERY Y VALIDACIÓN
    const queryData = ejecutarConsultaBigQuery(agencia, fecha, usuarios);
    const spreadsheet_abierta = SpreadsheetApp.openById(idPlantillaCopia);
    const sheet = spreadsheet_abierta.getSheets()[0];
    // 2.1 REGISTRO DE QUE EL MOVIMIENTO LLEGÓ AL SISTEMA INDEPENDIENTE SI HAY O NO MOVIMIENTOS.
    const fechaLimpia = typeof fecha === 'string' ? fecha.replace(/-/g, '') : Utilities.formatDate(fecha, Session.getScriptTimeZone(), "yyyyMMdd");
    const id_movs = agencia + fechaLimpia;
    registrarVerificacionEnBigQuery(id_movs, agencia, fecha, obtenerFechaFormateada(), 'Sistema');

    // MANEJO DE ERROR BIGQUERY (Early Return)
    if (!queryData || queryData.length <= 1) {
      Logger.log(`ADVERTENCIA: La consulta a BigQuery para '${agencia}' no devolvió resultados.`);
      sheet.getRange("A1").setValue(`La consulta a BigQuery para la agencia '${agencia}' y fecha '${fecha}' no devolvió resultados. REVISA SI EXISTEN MOVIMIENTOS.`);
      
      const errorbd = 'La consulta a BigQuery no devolvió datos para escribir. Hoja de calculo NO lista para analisis.';
      alertaError(errorbd, agencia, fecha, CONFIG.NOTIFICACIONES.CORREOS_SOPORTE);
      
      // Detenemos el proceso de ESTA agencia sin cancelar el script global
      return; 
    }
    // 3. ESCRITURA DE DATOS EN LA HOJA DE CÁLCULO
    sheet.getRange(1, 1, queryData.length, queryData[0].length).setValues(queryData);
    sheet.insertColumnBefore(1);
    sheet.getRange("A1").setValue("Documento");
    Logger.log(`Se escribieron ${queryData.length - 1} filas de datos. Hoja lista para análisis.`);
    // ================= PROCESO DE ANÁLISIS DE MOVIMIENTOS POR IA =================
    // ingreso de consumo de json analizado por el agente adk
    const stringJsonApi = obtenerJsonAgente(id_movs);    
    // ================== PROCESO DE ANÁLISIS DE MOVIMIENTOS POR IA [FIN] =================
    if (!stringJsonApi) { 
      throw new Error("FALLO AGENTE: No se pudo obtener el JSON del agente."); 
    }

    // 5. APLANADO DE DATOS
    Logger.log("Iniciando Paso 2: Aplanando estructura JSON...");
    const jsonAplanado = aplanarEstructuraJson(stringJsonApi);

    if (!jsonAplanado || jsonAplanado.length === 0) {
      throw new Error("Fallo en Aplanado: El JSON devuelto es inválido o no contenía movimientos procesables.");
    }

    // 6. VERIFICACIÓN FINAL
    Logger.log("Iniciando Paso 3: Verificación de movimientos...");
    const verify = verifyDocuments(idPlantillaCopia, jsonAplanado);
    
    if (verify) {
      Logger.log("================ PROCESO DE VERIFICACIÓN EXITOSO ================");
    } else {
      Logger.log("================ PROCESO DE VERIFICACIÓN FALLIDO ================");
      // Opcional: Notificar si la verificación no cuadra
      //alertaError(`Discordancia de datos en verificación para ${agencia}`, agencia, fecha, CONFIG.NOTIFICACIONES.CORREOS_SOPORTE);

    }

  } catch (error) {
    // 7. MANEJO GLOBAL DE ERRORES DE LA FUNCIÓN
    console.error(`Error en el proceso de análisis de ${agencia}: ${error.message}\n${error.stack}`);
    alertaError(`Excepción de código: ${error.message}`, agencia, fecha, CONFIG.NOTIFICACIONES.CORREOS_SOPORTE);
  }
}