/**
 * Guarda una lista de archivos adjuntos (Blobs) en una estructura de carpetas
 * jerárquica, renombrando cada archivo con un formato estandarizado.
 *
 * @param {Array<GoogleAppsScript.Base.Blob>} adjuntos La lista de archivos (objetos Blob) a guardar.
 * @param {string} agencia El nombre de la agencia para la jerarquía.
 * @param {string|Date} fecha La fecha para la jerarquía.
 * @param {boolean} esFaltante (Opcional) Bandera que indica si el documento es una corrección/faltante. A partir de V1.1
 * @returns {{id_carpetafinal: string, ids_archivos: Array<string>, fecha: string, agencia: string}|null}
 */
function guardadoDriveJerarquico(adjuntos, agencia, fecha, esFaltante = false) {
  if (!adjuntos || !Array.isArray(adjuntos) || adjuntos.length === 0) {
    console.error("Error: El parámetro 'adjuntos' debe ser una lista no vacía de archivos.");
    return null;
  }
  if (!agencia || !fecha) {
    console.error("Error: Los parámetros 'agencia' y 'fecha' son obligatorios.");
    return null;
  }

  try {
    console.log(`Iniciando proceso de guardado para la agencia "${agencia}" en la fecha "${fecha}". Faltante: ${esFaltante}`);
    const idCarpetaFinal = gerarquiaCarpetas(CONFIG.ID_Carpeta_Raiz, agencia, fecha);

    if (!idCarpetaFinal) {
      console.error("No se pudo obtener o crear la carpeta de destino. Proceso de guardado abortado.");
      const errorag = "No se pudo obtener o crear la carpeta de destino. Proceso de guardado abortado."
      alertaError(errorag, agencia, fecha, CONFIG.NOTIFICACIONES.CORRREOS_OPERACIONES);
      return null;
    }

    const carpetaDestino = DriveApp.getFolderById(idCarpetaFinal);
    const idsArchivosGuardados = [];

    const agenciaValidada = validaAgencia(agencia, CONFIG.AGENCIAS_VALIDAS);
    const fechaLimpia = typeof fecha === 'string' ? fecha.replace(/-/g, '') : Utilities.formatDate(fecha, Session.getScriptTimeZone(), "yyyyMMdd");
    let contadorArchivos = 1;

    // --- CICLO DE GUARDADO Y RENOMBRADO ---
    for (const adjunto of adjuntos) {
      const nombreOriginal = adjunto.getName();
      const extension = nombreOriginal.includes('.') ? nombreOriginal.split('.').pop() : '';

      // 🚀 LÓGICA CONDICIONAL DE RENOMBRADO CENTRALIZADA
      let nuevoNombre;
      if (esFaltante) {
        nuevoNombre = `Movimientos_${agenciaValidada}_${fechaLimpia}_NOTAFALTANTE_${contadorArchivos}.${extension}`;
      } else {
        nuevoNombre = `Movimientos_${agenciaValidada}_${fechaLimpia}_${contadorArchivos}.${extension}`;
      }

      adjunto.setName(nuevoNombre);

      const archivoGuardado = carpetaDestino.createFile(adjunto);
      const idArchivo = archivoGuardado.getId();
      idsArchivosGuardados.push(idArchivo);
      console.log(`Archivo guardado como "${nuevoNombre}". ID: ${idArchivo}`);

      contadorArchivos++; 
    }

    return {
      id_carpetafinal: idCarpetaFinal,
      ids_archivos: idsArchivosGuardados,
      fecha: fecha,
      agencia: agenciaValidada
    };

  } catch (error) {
    console.error(`Error crítico durante el guardado de archivos en Drive: ${error.message}`);
    alertaError(error, agencia, fecha, CONFIG.NOTIFICACIONES.CORRREOS_OPERACIONES);
    return null;
  }
}