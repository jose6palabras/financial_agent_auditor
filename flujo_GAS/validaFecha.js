/**
 * Valida y descompone una fecha en año, nombre del mes y día.
 * La función es robusta y acepta tanto objetos Date de JavaScript como
 * cadenas de texto con el formato "YYYY-MM-DD".
 *
 * @param {Date|string} fecha La fecha a procesar.
 * @returns {{year: number, mes: string, dia: number}|null} Un objeto con la fecha
 * descompuesta si la entrada es válida, o null si ocurre un error.
 */
function validaFecha(fecha) {
  if (!fecha) {
    console.error('Error: El parámetro "fecha" es nulo o indefinido.');
    return null;
  }

  try {
    let fechaObj;
    let originalYear, originalMonth, originalDay; // Variables para guardar la entrada original

    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
      fechaObj = fecha;
    } else if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const partes = fecha.split('-');
      originalYear = parseInt(partes[0], 10);
      originalMonth = parseInt(partes[1], 10) - 1; // El mes en JS es 0-indexado
      originalDay = parseInt(partes[2], 10);
      
      fechaObj = new Date(Date.UTC(originalYear, originalMonth, originalDay));

      // --- ¡CORRECCIÓN CRÍTICA AQUÍ! ---
      // Verificamos si JavaScript realizó un "desbordamiento de fecha".
      // Si el día, mes o año del objeto creado no coincide con la entrada, la fecha era inválida.
      if (fechaObj.getUTCFullYear() !== originalYear ||
          fechaObj.getUTCMonth() !== originalMonth ||
          fechaObj.getUTCDate() !== originalDay) {
        console.error(`Error: La fecha proporcionada "${fecha}" no es una fecha calendario válida (ej. día 30 en febrero).`);
        return null;
      }

    } else {
      console.error(`Error: El formato de entrada "${fecha}" no es válido. Debe ser un objeto Date o un string "YYYY-MM-DD".`);
      return null;
    }

    // Esta comprobación sigue siendo útil para el caso de objetos Date inválidos.
    if (isNaN(fechaObj.getTime())) {
      console.error(`Error: La fecha proporcionada "${fecha}" no es una fecha calendario válida.`);
      return null;
    }

    const year = fechaObj.getUTCFullYear();
    const monthIndex = fechaObj.getUTCMonth();
    const dia = fechaObj.getUTCDate();
    const nombreMes = CONFIG.MESES_DEL_ANIO[monthIndex];

    return {
      year: year,
      mes: nombreMes,
      dia: dia
    };

  } catch (error) {
    console.error(`Ocurrió un error inesperado en la función validaFecha: ${error.message}`);
    return null;
  }
}
/**
 * Obtiene la fecha y hora actual formateada según la zona horaria del script.
 * Utiliza la clase Utilities de Apps Script para garantizar compatibilidad con Java SimpleDateFormat.
 * * @param {string} patron - (Opcional) El formato deseado. Por defecto: "yyyy-MM-dd".
 * Ejemplos: "dd/MM/yyyy", "yyyy-MM-dd HH:mm:ss", "yyyyMMdd_HHmm"
 * @return {string} La fecha actual convertida a texto.
 */
function obtenerFechaFormateada(patron = "yyyy-MM-dd") {
  try {
    // 1. Captura el momento exacto de la ejecución (Objeto Date crudo)
    const fecha = new Date();
    
    // 2. Obtiene la zona horaria configurada en el proyecto (ej: America/Bogota)
    // Esto es MEJOR que poner "GMT-5" manual, porque respeta el horario de verano si aplicara.
    const zonaHoraria = Session.getScriptTimeZone();
    
    // 3. Formatea la fecha usando la utilidad nativa de Google
    const fechaTexto = Utilities.formatDate(fecha, zonaHoraria, patron);
    
    return fechaTexto;

  } catch (e) {
    console.error("Error al generar fecha: " + e.message);
    // Fallback: Retorna la fecha en ISO si falla el formateo
    return new Date().toISOString().split('T')[0]; 
  }
}