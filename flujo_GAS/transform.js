/**
 * Aplanan un JSON compacto de movimientos y devuelve un arreglo de objetos individuales
 * listo para su análisis.
 * * A partir de la version 0.9 se hace el siguiente cambio
 * Convierte la cadena JSON extraída en un arreglo plano de objetos iterando de forma segura sus propiedades y descartando datos anómalos.
 * @param {string} jsonString - La cadena de texto validada que contiene la estructura JSON (salida de transformJson).
 * @return {Array<Object>|null} Un arreglo con los movimientos aplanados (Tipo y Numero) listos para su uso, o null si la estructura base es inválida.
 * estructura {"Tipo": "<tipo>", "Numero": "<numero>"}.
 */
function aplanarEstructuraJson(datosJson) {
  try {
    // 1. Validar que la entrada exista y sea directamente un objeto
    if (!datosJson || typeof datosJson !== 'object') {
      Logger.log("ERROR (aplanarEstructuraJson): Se esperaba un objeto JSON válido, pero se recibió un tipo de dato incorrecto o nulo.");
      return null;
    }

    // 2. Asegurarnos de que "Movimiento" existe y es un arreglo iterable
    if (!Array.isArray(datosJson.Movimiento)) {
      Logger.log("ERROR LOGICO (aplanarEstructuraJson): La propiedad 'Movimiento' no existe o no es un Arreglo.");
      Logger.log(`Estructura recibida: ${JSON.stringify(datosJson).substring(0, 100)}...`);
      return null;
    }

    const movimientosAplanados = [];

    // 3. Iteración y Validación de la capa interna
    // Usamos for...of para poder usar 'continue' y saltar errores individuales
    for (const movimiento of datosJson.Movimiento) {
      const tipo = movimiento.Tipo;
      const numeros = movimiento.Numeracion;

      // Validar que el tipo exista
      if (!tipo) {
         Logger.log("ADVERTENCIA (aplanarEstructuraJson): Se encontró un nodo de movimiento sin la propiedad 'Tipo'. Se omite este nodo.");
         continue; // Salta al siguiente movimiento sin romper el programa
      }

      // Validar que Numeracion sea realmente un arreglo antes de intentar iterarlo
      if (!Array.isArray(numeros)) {
         Logger.log(`ADVERTENCIA (aplanarEstructuraJson): El movimiento de tipo '${tipo}' no tiene un arreglo válido en 'Numeracion'. Se omite.`);
         continue; 
      }

      // 4. Extracción de los datos finales
      for (const numero of numeros) {
        // Validación extra: ignorar valores nulos o vacíos 
        if (numero !== null && numero !== undefined && numero !== "") {
          movimientosAplanados.push({
            "Tipo": tipo.toString().trim(),
            "Numero": numero.toString().trim()
          });
        }
      }
    }

    // 5. Evaluación del resultado final
    if (movimientosAplanados.length === 0) {
       Logger.log("ADVERTENCIA (aplanarEstructuraJson): El JSON fue procesado, pero no se logró extraer ningún movimiento válido. Puede que el documento estuviera vacío.");
       return []; 
    }

    Logger.log(`ÉXITO: Se aplanaron estructuralmente ${movimientosAplanados.length} registros de movimientos.`);
    return movimientosAplanados;

  } catch (errorInesperado) {
    Logger.log(`ERROR CATASTRÓFICO no controlado en aplanarEstructuraJson: ${errorInesperado.toString()}`);
    return null; 
  }
}