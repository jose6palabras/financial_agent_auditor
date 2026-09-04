/**
 * Función auxiliar para obtener una subcarpeta por nombre dentro de una carpeta padre.
 * Si la subcarpeta no existe, la crea.
 * @param {GoogleAppsScript.Drive.Folder} carpetaPadre El objeto de la carpeta donde se buscará/creará.
 * @param {string} nombreSubcarpeta El nombre de la subcarpeta deseada.
 * @returns {GoogleAppsScript.Drive.Folder|null} El objeto de la subcarpeta encontrada o creada, o null si hay un error.
 * @private
 */
function _obtenerOCrearCarpeta(carpetaPadre, nombreSubcarpeta) {
  try {
    const carpetas = carpetaPadre.getFoldersByName(nombreSubcarpeta);
    if (carpetas.hasNext()) {
      // La carpeta ya existe, la retornamos.
      console.log(`Carpeta encontrada: "${nombreSubcarpeta}"`);
      return carpetas.next();
    } else {
      // La carpeta no existe, la creamos.
      console.log(`Creando carpeta: "${nombreSubcarpeta}"`);
      return carpetaPadre.createFolder(nombreSubcarpeta);
    }
  } catch (error) {
    console.error(`Error al obtener o crear la carpeta "${nombreSubcarpeta}": ${error.message}`);
    return null;
  }
}

/**
 * Crea o verifica una jerarquía de carpetas en Google Drive (Agencia -> Año -> Mes -> Día)
 * dentro de una carpeta principal especificada.
 *
 * @param {string} idCarpetaPpal El ID de la carpeta principal de Google Drive donde comenzará la jerarquía.
 * @param {string} agencia El nombre de la agencia (ej: 'pedregal').
 * @param {string|Date} fecha La fecha para la jerarquía (ej: '2025-10-15').
 * @returns {string|null} El ID de la carpeta final (la del día) o null si ocurre un error en el proceso.
 */
function gerarquiaCarpetas(idCarpetaPpal, agencia, fecha) {
  // --- 1. Validaciones Iniciales ---
  if (!idCarpetaPpal || typeof idCarpetaPpal !== 'string') {
    console.error('Error: El parámetro "idCarpetaPpal" es inválido.');
    return null;
  }

  try {
    // Obtenemos la carpeta principal. Si no existe, DriveApp lanzará un error que será capturado.
    let carpetaActual = DriveApp.getFolderById(idCarpetaPpal);
    console.log(`Iniciando en la carpeta principal: "${carpetaActual.getName()}" (ID: ${idCarpetaPpal})`);

    // --- 2. Procesar Agencia ---
    const nombreAgenciaValidado = validaAgencia(agencia, CONFIG.AGENCIAS_VALIDAS);
    if (!nombreAgenciaValidado) {
      console.error(`La agencia "${agencia}" no es válida. Proceso detenido.`);
      return null;
    }
    carpetaActual = _obtenerOCrearCarpeta(carpetaActual, nombreAgenciaValidado);
    if (!carpetaActual) return null; // Detener si hubo un error creando la carpeta

    // --- 3. Procesar Fecha ---
    const fechaDescompuesta = validaFecha(fecha);
    if (!fechaDescompuesta) {
      console.error(`La fecha "${fecha}" no es válida. Proceso detenido.`);
      return null;
    }

    // --- 4. Crear Jerarquía de Fecha (Año -> Mes -> Día) ---
    // Convertimos el año y el día a string para usarlos como nombres de carpeta.
    const carpetasFecha = [
      String(fechaDescompuesta.year),
      fechaDescompuesta.mes,
      String(fechaDescompuesta.dia)
    ];

    for (const nombreCarpeta of carpetasFecha) {
      carpetaActual = _obtenerOCrearCarpeta(carpetaActual, nombreCarpeta);
      if (!carpetaActual) return null; // Detener si hubo un error en cualquier nivel
    }
    
    // --- 5. Retornar ID final ---
    const idFinal = carpetaActual.getId();
    console.log(`Proceso completado. El ID de la carpeta final es: ${idFinal}`);
    return idFinal;

  } catch (e) {
    // Captura errores comunes como "ID de carpeta no encontrado".
    console.error(`Error crítico en el proceso de jerarquía de carpetas: ${e.message}`);
    alertaError(e, agencia, fecha, CONFIG.NOTIFICACIONES.CORREOS_SOPORTE);
    return null;
  }
}