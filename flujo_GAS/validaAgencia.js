/**
 * @fileoverview Módulo de Funciones de Utilidad.
 * @description Contiene funciones auxiliares y reutilizables para el proyecto.
 * Incluye validaciones de datos y cálculos comunes.
 */

/**
 * Calcula la similitud entre dos cadenas de texto usando el algoritmo de
 * distancia de Levenshtein. Devuelve un valor entre 0 (sin similitud) y 1 (coincidencia exacta).
 * @param {string} str1 Primera cadena de texto.
 * @param {string} str2 Segunda cadena de texto.
 * @returns {number} El índice de similitud (0 a 1).
 * @private
 */
function _calcularSimilitud(str1, str2) {
  // Normalizamos las cadenas a minúsculas para una comparación insensible a mayúsculas.
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  
  // La distancia de Levenshtein nos da el número de ediciones necesarias.
  // La similitud es 1 - (distancia / longitud de la cadena más larga).
  const distance = _levenshteinDistance(longer, shorter);
  return (longerLength - distance) / parseFloat(longerLength);
}

/**
 * Implementación del algoritmo de distancia de Levenshtein.
 * @param {string} s1
 * @param {string} s2
 * @returns {number} La distancia de edición entre s1 y s2.
 * @private
 */
function _levenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
}


/**
 * Valida si una agencia dada existe en la lista de agencias autorizadas,
 * permitiendo pequeñas variaciones o errores tipográficos.
 *
 * @param {string} agencia El nombre de la agencia a validar (ej: 'pedregal', 'Mayorsta').
 * @param {Array<string>} listaAgencias La lista oficial de agencias desde la configuración.
 * @returns {string|null} El nombre oficial de la agencia si se encuentra una coincidencia
 * válida, o null si no hay ninguna coincidencia que supere
 * el umbral de similitud.
 */
function validaAgencia(agencia, listaAgencias) {
  // --- Manejo de Errores y Casos Borde ---
  if (!agencia || typeof agencia !== 'string' || agencia.trim() === '') {
    console.error('Error: El parámetro "agencia" es inválido. Debe ser un string no vacío.');
    return null;
  }
  if (!Array.isArray(listaAgencias) || listaAgencias.length === 0) {
    console.error('Error: El parámetro "lista_agencias" es inválido. Debe ser un array no vacío.');
    return null;
  }

  try {
    let mejorCoincidencia = null;
    let maximaSimilitud = 0.0;

    // Normalizamos la entrada para una comparación más robusta
    const agenciaNormalizada = agencia.trim();

    // Iteramos sobre la lista oficial de agencias
    for (const agenciaOficial of listaAgencias) {
      const similitud = _calcularSimilitud(agenciaNormalizada, agenciaOficial);
      
      // Si la similitud es mayor que la máxima encontrada hasta ahora, la guardamos
      if (similitud > maximaSimilitud) {
        maximaSimilitud = similitud;
        mejorCoincidencia = agenciaOficial;
      }
    }

    // Comparamos la mejor similitud encontrada con nuestro umbral de confianza
    if (maximaSimilitud >= CONFIG.UMBRAL_SIMILITUD) {
      console.log(`Coincidencia encontrada para "${agencia}": "${mejorCoincidencia}" con una similitud de ${(maximaSimilitud * 100).toFixed(2)}%`);
      return mejorCoincidencia;
    }

    // Si ninguna coincidencia superó el umbral, retornamos null
    console.log(`No se encontró una coincidencia suficiente para "${agencia}". Máxima similitud: ${(maximaSimilitud * 100).toFixed(2)}%`);
    return null;

  } catch (error) {
    // Capturamos cualquier error inesperado durante la ejecución
    console.error(`Ocurrió un error inesperado en la función validaAgencia: ${error.message}`);
    // Opcional: podrías registrar el error en un log más persistente.
    // Logger.log(`Error en validaAgencia: ${error.stack}`);
    return null;
  }
}