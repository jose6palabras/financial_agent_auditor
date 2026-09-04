/**
 * @fileoverview Módulo de Manejo de Archivos en Google Drive.
 * Contiene funciones para crear carpetas y guardar archivos.
 */

/**
 * Obtiene o crea una carpeta en Google Drive según una ruta especificada.
 * @param {string} path La ruta de la carpeta (e.g., "Nivel1/Nivel2").
 * @returns {GoogleAppsScript.Drive.Folder} El objeto de la carpeta final.
 */
function obtenerOCrearCarpeta(path) {
  let currentFolder = DriveApp.getRootFolder();
  const folderNames = path.split('/');

  for (const folderName of folderNames) {
    const subFolders = currentFolder.getFoldersByName(folderName);
    if (subFolders.hasNext()) {
      currentFolder = subFolders.next();
    } else {
      currentFolder = currentFolder.createFolder(folderName);
      Logger.log(`Carpeta creada: ${folderName}`);
    }
  }
  return currentFolder;
}

/**
 * Extrae una fecha (YYYY-MM-DD) y el nombre de la agencia del asunto.
 * @param {string} subject El asunto del correo.
 * @returns {{fecha: string, agencia: string}|null} Un objeto con la fecha y la agencia, o null si no se encuentra el patrón.
 */
function extraerInfoDelAsunto(subject) {
  // Busca un patrón de fecha como '2025-08-28' seguido de un espacio y el nombre de la agencia.
  const regexInfo = /(\d{4}-\d{2}-\d{2})\s+([^\s]+)/;
  const match = subject.match(regexInfo);
  
  if (match) {
    return {
      fecha: match[1],   // El primer grupo capturado (la fecha)
      agencia: match[2]  // El segundo grupo capturado (la agencia)
    };
  }
  return null; // Si el patrón no coincide, devolvemos null.
}

/**
 * Guarda un archivo, con un nombre estandarizado, y devuelve un objeto con la información.
 * @param {GoogleAppsScript.Gmail.GmailAttachment} attachment El archivo adjunto del correo.
 * @param {string} subject El asunto del correo.
 * @returns {{ruta: string, agencia: string, fecha: string}|null} Un objeto con los resultados o null si hay error.
 */
function guardarAdjuntoEnDrive(attachment, subject) {
  try {
    if (attachment.getContentType() !== CONFIG.ATTACHMENT_MIME_TYPE) {
      Logger.log(`El adjunto "${attachment.getName()}" no es un PDF. Se omite.`);
      return null;
    }

    const info = extraerInfoDelAsunto(subject);
    let folderPath;
    let infoParaRetorno;

    

    if (info) {
      folderPath = `${CONFIG.PARENT_FOLDER_PATH}/${info.agencia}/${info.fecha}`;
      infoParaRetorno = { agencia: info.agencia, fecha: info.fecha };
    } else {
      Logger.log(`ADVERTENCIA: No se encontró el patrón 'Fecha Agencia' en el asunto: "${subject}". Se usará una carpeta por defecto.`);
      const fechaHoy = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
      folderPath = `${CONFIG.PARENT_FOLDER_PATH}/SIN_AGENCIA_REVISAR/${fechaHoy}`;
      infoParaRetorno = { agencia: 'SIN_AGENCIA_REVISAR', fecha: fechaHoy };
    }
    const targetFolder = obtenerOCrearCarpeta(folderPath);
    // --- BLOQUE PARA ESTANDARIZAR EL NOMBRE DEL ARCHIVO ---    
    // 1. Construir el nuevo nombre del archivo.
    const fechaSinGuiones = infoParaRetorno.fecha.replace(/-/g, ''); // Convierte 2025-08-28 a 20250828
    const nombreAgencia = infoParaRetorno.agencia;
    const nuevoNombre = `${CONFIG.PDF_FILENAME_PREFIX}${nombreAgencia}${fechaSinGuiones}.pdf`;
    // 2. Obtener el contenido del archivo (Blob).
    const fileBlob = attachment.copyBlob();    
    // 3. Asignar el nuevo nombre al Blob.
    fileBlob.setName(nuevoNombre);    
    // 4. Crear el archivo en Drive usando el Blob con el nombre ya modificado.
    const file = targetFolder.createFile(fileBlob);
    const fileId = file.getId(); // --- NUEVO: Capturamos el ID del archivo creado ---
    Logger.log(`Archivo guardado exitosamente. ID: ${fileId}`);
    const fullPath = `${folderPath}/${file.getName()}`;
    Logger.log(`Archivo guardado exitosamente con el nombre estandarizado en: ${fullPath}`);
    return {
      ruta: fullPath,
      agencia: infoParaRetorno.agencia,
      fecha: infoParaRetorno.fecha,
      fileId: fileId
    };

  } catch (error) {
    console.error(`Error al guardar el archivo en Drive: ${error.toString()}`);
    const info = extraerInfoDelAsunto(subject);
    alertaError(error, info.agencia, info.fecha, CONFIG.NOTIFICACIONES.CORREOS_SOPORTE);
    return null;
  }
}