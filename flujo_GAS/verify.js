/**
 * @fileoverview Módulo para verificar documentos en una hoja de cálculo.
 * @version 1.0
 */
/**
 * Namespace para las funciones de verificación.
 * @namespace
/**
 * Compara los documentos de una hoja de Google Sheets con una lista de referencia.
 * Marca cada fila como 'Doc 0k' o 'Faltante' en la columna "Documento".
 *
 * @param {string} sheetId El ID del archivo de Google Sheets.
 * @param {Array<Object>} documentsToCheck Un arreglo de objetos con los documentos a verificar.
 * Ejemplo: [{"Tipo": "CC", "Numeracion": "123"}, {"Tipo": "CE", "Numeracion": "456"}]
 * @returns {boolean} Devuelve true si el proceso fue exitoso, false en caso de error.
 */
function _getNormalizedKey(docType, docNumber) {
    const type = String(docType).trim().toUpperCase();
    const number = String(docNumber).trim();
    return `${type}-${number}`;
  }
function verifyDocuments(sheetId, documentsToCheck) {
    try {
      if (!sheetId || !Array.isArray(documentsToCheck)) {
        throw new Error("ID de la hoja o documentos a verificar no válidos.");
      }
      const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
      const dataRange = sheet.getDataRange();
      const data = dataRange.getValues();      
      const headers = data.shift(); // Saca la primera fila (encabezados)
      const docTypeIndex = headers.indexOf('TIP_DOC');
      const docNumberIndex = headers.indexOf('NUM_DOC');
      const documentStatusIndex = headers.indexOf('Documento');
      if (docTypeIndex === -1 || docNumberIndex === -1 || documentStatusIndex === -1) {
        throw new Error("No se encontraron las columnas necesarias: 'TIP_DOC', 'NUM_DOC', 'Documento'.");
      }
      // Creamos un Set para una búsqueda más eficiente, usando la clave normalizada.
      const documentsSet = new Set(documentsToCheck.map(doc => _getNormalizedKey(doc.Tipo, doc.Numero)));
      const statuses = data.map((row, index) => {
        const docType = row[docTypeIndex];
        const docNumber = row[docNumberIndex];        
        // Es importante verificar que la fila no esté vacía.
        if (!docType || !docNumber) {
          return ['']; // Dejar la celda de estado vacía si no hay datos en la fila.
        }
        const documentKey = _getNormalizedKey(docType, docNumber);
        if (documentsSet.has(documentKey)) {
          return ['Doc 0k'];
        } else {
          return ['Faltante'];
        }
      });
      if (statuses.length > 0) {
        // Escribimos los resultados a partir de la segunda fila (porque quitamos los encabezados).
        sheet.getRange(2, documentStatusIndex + 1, statuses.length, 1).setValues(statuses);
      }
      Logger.log("Verificación de documentos completada con éxito.");
      return true;
    } catch (error) {
      Logger.log(`Error en verifyDocuments: ${error.toString()}`);
      // Aquí podrías agregar un sistema de notificaciones, por ejemplo, enviar un email.
      // MailApp.sendEmail("admin@example.com", "Error en el script de verificación", error.message);
      return false;
    }
  }
