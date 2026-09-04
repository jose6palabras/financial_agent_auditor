/**
 * Crea una copia de un archivo plantilla existente en Google Drive.
 * * @param {string} id_plantilla - El ID único del archivo que servirá como base (Master).
 * @return {string|null} El ID del nuevo archivo creado, o null si hubo un error.
 */
function copia_plantilla(id_plantilla) {
  // 1. Principio "Fail Fast": Validar entradas antes de intentar conectar
  if (!id_plantilla || typeof id_plantilla !== 'string') {
    console.warn("[DriveService] Error: Se intentó copiar una plantilla sin un ID válido.");
    return null;
  }

  try {
    // 2. Conexión con el servicio de Drive
    const archivoOriginal = DriveApp.getFileById(id_plantilla);
    
    // 3. Ejecutar la copia
    // Nota: Al no especificar carpeta, se crea en la unidad raíz del usuario (My Drive)
    // o en la misma ubicación dependiendo de la configuración del dominio.
    // Le damos un nombre temporal para identificarla fácilmente en los logs.
    const nombreNuevo = "Copia_Procesamiento_" + new Date().getTime(); 
    const nuevaCopia = archivoOriginal.makeCopy(nombreNuevo);

    const nuevoId = nuevaCopia.getId();

    // 4. Logging de trazabilidad (Vital para auditoría)
    console.log(`[DriveService] Plantilla duplicada exitosamente. Original: ${id_plantilla} -> Nueva: ${nuevoId}`);

    return nuevoId;

  } catch (e) {
    // 5. Manejo de Errores
    // Capturamos errores comunes como "Archivo no encontrado" o "Permisos insuficientes"
    console.error(`[DriveService] Excepción al copiar plantilla: ${e.message}`);
    return null;
  }
}