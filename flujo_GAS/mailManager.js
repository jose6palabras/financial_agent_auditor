/**
 * @fileoverview Módulo de Procesamiento de Correos.
 * Encargado de buscar correos electrónicos y extraer información de ellos.
 */

function buscarCorreosParaProcesar() {
  const prefijoBase = CONFIG.EMAIL_SUBJECT_PREFIX;
  const query = `is:unread subject:("${prefijoBase}")`;
  //const query = `is:unread subject:("${prefijoBase}") has:attachment`;
  try {
    const threads = GmailApp.search(query);
    Logger.log(`Se encontraron ${threads.length} correos para procesar con el prefijo: "${prefijoBase}"`);
    return threads;
  } catch (error) {
    console.error(`Error al buscar correos en Gmail: ${error.toString()}`);
    return [];
  }
}

function debugBusquedaDeCorreos() {
  const prefijoBase = CONFIG.EMAIL_SUBJECT_PREFIX;
  Logger.log(`[DEBUG] Prefijo base del asunto buscado: "${prefijoBase}"`);

  const query = `is:unread subject:("${prefijoBase}") has:attachment`;
  Logger.log(`[DEBUG] Consulta final enviada a Gmail: ${query}`);

  const threads = GmailApp.search(query);
  Logger.log(`[DEBUG] La búsqueda encontró ${threads.length} correos.`);
}

/**
 * Busca en el cuerpo del correo una línea con el prefijo "--Usuario:" y extrae los nombres de usuario.
 * @param {string} body El cuerpo de texto plano del correo electrónico.
 * @returns {Array<string>} Un arreglo de los nombres de usuario. Devuelve un arreglo vacío si no se encuentra la línea.
 * Extrae usuarios del cuerpo del correo basándose en patrones robustos.
 * Soporta separadores por coma, espacio o tabulación.
 * Regla de negocio: Usuarios son 4 letras mayúsculas (Ej: CAUO, LVAR).
 */
/**
 * Extrae usuarios del cuerpo del correo.
 * Regla de negocio ACTUALIZADA: 
 * - Letras mayúsculas.
 * - Longitud: Mínimo 3, Máximo 4 caracteres.
 * - Separadores flexibles (espacio, coma, etc).
 */
function extraerUsuariosDelCuerpo(body) {
  const prefix = '--Usuario:';
  
  const lines = body.split('\n');
  const userLine = lines.find(line => line.trim().startsWith(prefix));

  if (userLine) {
    // Limpiamos el prefijo
    const usersString = userLine.replace(prefix, '');
    
    // EXPRESIÓN REGULAR AJUSTADA
    // \b        -> Límite de palabra (Word Boundary)
    // [A-Z]     -> Solo mayúsculas
    // {3,4}     -> CANTIDAD: De 3 a 4 caracteres (El cambio clave está aquí)
    // g         -> Global
    const patronUsuario = /\b[A-Z]{3,4}\b/g;

    const encontrados = usersString.match(patronUsuario);
    
    const cleanedUsers = encontrados ? encontrados : [];
    
    if (cleanedUsers.length > 0) {
      Logger.log(`[Extracción Usuarios] Éxito: [${cleanedUsers.join(', ')}]`);
      return cleanedUsers;
    } else {
      console.warn(`[Extracción Usuarios] Línea encontrada, pero sin códigos válidos (3-4 letras). Línea: "${userLine}"`);
      return [];
    }    
  }else{
    Logger.log("[Extracción Usuarios] No se encontró la línea '--Usuario:'.");
    //alertaError('Error en los Usuarios', 'FORMATO', obtenerFechaFormateada(), CONFIG.NOTIFICACIONES.CORRREOS_OPERACIONES);
    return [];
  }  
}
/**
 * Función recibe el cuerpo html de un correo, y revisa si tiene algún link de Drive escrito, de ser así regresa el id del archivo adjunto en el link
 */
function extraerIdsDeDrive(cuerpoHtml) {
  const idsEncontrados = new Set();
  // Regex ajustada para capturar IDs de URLs comunes de Drive
  const patron = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/g;
  let coincidencia;
  while ((coincidencia = patron.exec(cuerpoHtml)) !== null) {
    idsEncontrados.add(coincidencia[1]);
  }
  return Array.from(idsEncontrados);
}