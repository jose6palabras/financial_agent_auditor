/**
 * Genera el nombre completo de la tabla en BigQuery basado en la agencia y fecha.
 * Aplica lógica de mapeo para agrupar agencias en sus tablas correspondientes.
 * @param {string} fecha - Fecha en formato 'YYYY-MM-DD'.
 * para la versión 0.8 no se necesita del nombre de la agencia, se elimina el parámetro.
 * @return {string} String completo de la tabla (ej: `proyecto.dataset.movimientos_alpujarra_20260115`)
 * 
 */
function tabla_bq(fecha) {
  // 1. Validación de entrada
  if (!fecha) {
    console.error("Faltan parámetros para generar el nombre de la tabla.");
    return null;
  }
  // 4. Formateo de Fecha (YYYY-MM-DD -> YYYYMMDD)
  const fechaFormatoTabla = fecha.replace(/-/g, '');
  // 5. Construcción del String
  const projectId = CONFIG.BIGQUERY.PROJECT_ID;
  const datasetId = CONFIG.BIGQUERY.DATASET_ID;
  const template = 'movimientos_{fecha}';
  const tableName = template.replace('{fecha}', fechaFormatoTabla);
  // Retornamos con las comillas invertidas (backticks) para SQL Standard
  const fullTableName = `\`${projectId}.${datasetId}.${tableName}\``;
  Logger.log(`[BigQuery] Tabla Destino: ${fullTableName}`);
  return fullTableName;
}
/**
 * Ejecuta una consulta dinámica, parametrizada y con ordenamiento personalizado en BigQuery.
 * @param {Array<string>} usuarios El arreglo de usuarios para la cláusula IN.
 * @returns {Array<Array<string>>|null} Matriz 2D con los resultados, incluyendo cabeceras.
 */
function ejecutarConsultaBigQuery(agencia, fecha, usuarios) {
  if (usuarios.length === 0) {
    Logger.log("No se proporcionaron usuarios para la consulta, no se ejecutará la consulta a BigQuery.");
    return null;
  }
  const projectId = CONFIG.BIGQUERY.PROJECT_ID;
  // función que entrega cod_agencia
  const cod_agencia = generateCodeAgencia(agencia)//Genera el codigo de sucursal para cada agencia v0.8
  const fullTableName = tabla_bq(fecha)//CAMBIOS GENERADOS PARA LA VERSIÓN 0.8 TABLA GENERALIZADA
  const request = {
    query: `
      SELECT TIP_DOC, NUM_DOC, NIT_CC, NOMBRE_TERCERO, FECHA_MOV, CUENTA, NOM_CUENTA, DEBITOS, CREDITOS, MOVIMIENTO, USUARIO, NIT_CC_TERC, NOMBRE_TERC 
      FROM ${fullTableName}
      WHERE SUC_DET = ${cod_agencia} AND USUARIO IN UNNEST(@usuarios_array)
      -- --- NUEVA CLÁUSULA DE ORDENAMIENTO ---
      -- Se ordena primero por TIP_DOC con una secuencia personalizada,
      -- y luego por NUM_DOC para agrupar las transacciones.
      ORDER BY
        CASE TIP_DOC
          WHEN 'RC' THEN 1
          WHEN 'RA' THEN 2
          WHEN 'EF' THEN 3
          WHEN 'SP' THEN 4
          WHEN 'CB' THEN 5
          WHEN 'DC' THEN 6
          WHEN 'DT' THEN 7
          WHEN 'LR' THEN 8
          WHEN 'CN' THEN 9
          WHEN 'CE' THEN 10
          WHEN 'NA' THEN 11
          WHEN 'NA2' THEN 12
          WHEN 'OA' THEN 13
          WHEN 'OP' THEN 14
          WHEN 'OD' THEN 15
          WHEN 'OC' THEN 16
          WHEN 'CO' THEN 17
          WHEN 'TR' THEN 18
          ELSE 99 -- Si aparece un tipo de documento no esperado, se va al final.
        END,
        NUM_DOC
    `,
    useLegacySql: false,
    queryParameters: [
      {
        name: "usuarios_array",
        parameterType: {
          type: "ARRAY",
          arrayType: { type: "STRING" }
        },
        parameterValue: {
          arrayValues: usuarios.map(user => ({ value: user }))
        }
      }
    ]
  };
  Logger.log('--- Se ejecutará la sentence de SQL ---');
  //Logger.log(request.query)
  try {
    const queryResults = BigQuery.Jobs.query(request, projectId);
    const jobId = queryResults.jobReference.jobId;

    let sleepTimeMs = 500;
    while (!queryResults.jobComplete) {
      Utilities.sleep(sleepTimeMs);
      sleepTimeMs *= 1.5;
      queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId);
    }

    const rows = queryResults.rows;
    if (rows) {
      const headers = queryResults.schema.fields.map(field => field.name);
      const data = rows.map(row => row.f.map(cell => cell.v));
      return [headers, ...data];
    }
  } catch (e) {
    console.error(`Error al consultar BigQuery. ¿Existe la tabla ${fullTableName}? Detalles: ${e.toString()}`);
    return null;
  }
  
  return null;
}
/**
 * La función siguiente realiza el registro del movimiento en la base de datos de control, conecta a big query
 * BQ alimenta el tablero de control de Looker
 */
function registrarVerificacionEnBigQuery(movimientoId, agencia, fechaMov, fechaVerif, resp) {
  const projectId = CONFIG.BIGQUERY.PROJECT_ID; // Reemplaza con el ID de tu proyecto
  const datasetId = CONFIG.BIGQUERY.DATASET_ID;
  const tableId = CONFIG.BIGQUERY.TABLA_REGISTRO;

  // Construye la fila que se va a insertar
  const row = {
    id_movimiento: movimientoId,
    agencia: agencia,
    fecha_movimiento: fechaMov, // Formato 'YYYY-MM-DD'
    fecha_verificacion: fechaVerif, // Formato 'YYYY-MM-DD'
    responsable: resp
  };

  // Define la solicitud de inserción
  const request = {
    rows: [{
      json: row
    }]
  };

  // Inserta la fila en la tabla de BigQuery
  try {
    BigQuery.Tabledata.insertAll(request, projectId, datasetId, tableId);
    Logger.log('Dato insertado en BigQuery correctamente.');
  } catch (e) {
    Logger.log('Error al insertar en BigQuery: ' + e.toString());
  }
}
// Ejemplo de cómo llamar a la función
// registrarVerificacionEnBigQuery('MOV-00123', '2025-10-06', '2025-10-07', 'Sistema');

function generateCodeAgencia(agencia_name){
  // 1. Normalización de la Agencia (Limpieza de Datos)
  // Convertimos a minúsculas y quitamos tildes (Cocorná -> cocorna)
  // NFD separa la letra de la tilde, y el regex elimina los diacríticos.
  const agenciaLimpia = agencia_name.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ''); // Quitamos espacios internos
  const agencia_codex = MAPA_AGENCIAS_CODES[agenciaLimpia]
  return agencia_codex  
}
// CONSULTA DEL JSON DE MOVIMIENTOS AGENTE ADK
/**
 * @fileoverview Función para consultar movimientos de agencias en BigQuery.
 * @param {string} id_movs - El ID del movimiento a buscar (ej: "Rionegro20260825").
 * @return {Object|null} El objeto JSON parseado del campo datos_agente, o null en caso de error.
 */
function obtenerJsonAgente(id_movs) {
  Logger.log(`Iniciando consulta a BigQuery para el id_movimientos: ${id_movs}`);

  try {
    // ---------------------------------------------------------
    // 1. VALIDACIONES DE ENTRADA ("Fail Fast")
    // ---------------------------------------------------------
    if (!id_movs || typeof id_movs !== 'string') {
      Logger.log("ERROR: No se proporcionó un 'id_movs' válido.");
      return null;
    }

    // Credenciales y rutas extraídas de la interfaz de BigQuery
    const projectId = CONFIG.BIGQUERY.PROJECT_ID;
    const datasetId = CONFIG.BIGQUERY.DATASET_ID;
    const tableId = CONFIG.BIGQUERY.TABLA_DATOS_AGENTE;

    // ---------------------------------------------------------
    // 2. CONSTRUCCIÓN DE LA CONSULTA (Parametrizada)
    // ---------------------------------------------------------
    // Se ordena por fecha_registro descendente en caso de haber múltiples registros 
    // con el mismo id_movimientos para traer el más reciente.
    const query = `
      SELECT datos_agente 
      FROM \`${projectId}.${datasetId}.${tableId}\`
      WHERE id_movimientos = @id_movs
      ORDER BY fecha_registro DESC
      LIMIT 1
    `;

    const request = {
      query: query,
      useLegacySql: false,
      parameterMode: 'NAMED',
      queryParameters: [
        {
          name: 'id_movs',
          parameterType: { type: 'STRING' },
          parameterValue: { value: id_movs }
        }
      ]
    };

    // ---------------------------------------------------------
    // 3. EJECUCIÓN CON MANEJO AISLADO DE ERRORES
    // ---------------------------------------------------------
    let queryResults;
    try {
      queryResults = BigQuery.Jobs.query(request, projectId);
    } catch (errorBq) {
      Logger.log(`ERROR DE RED/BQ: Falló la comunicación con BigQuery. Detalle: ${errorBq.message}`);
      return null;
    }

    // ---------------------------------------------------------
    // 4. EVALUACIÓN Y PARSEO SEGURO DE RESULTADOS
    // ---------------------------------------------------------
    if (queryResults && queryResults.rows && queryResults.rows.length > 0) {
      Logger.log("Consulta exitosa. Procediendo a transformar JSON...");
      
      // En BigQuery API, las filas regresan en un formato anidado: rows[0].f[0].v
      const datosAgenteString = queryResults.rows[0].f[0].v;

      try {
        const resultadoParseado = JSON.parse(datosAgenteString);
        return resultadoParseado;
      } catch (errorParse) {
        Logger.log(`ERROR DE FORMATO: No se pudo procesar el JSON de datos_agente. Detalle: ${errorParse.message}`);
        return null;
      }

    } else {
      Logger.log(`ADVERTENCIA: La consulta no arrojó resultados para id_movimientos: ${id_movs}`);
      return null;
    }

  } catch (errorGlobal) {
    // ---------------------------------------------------------
    // 5. RED DE SEGURIDAD FINAL
    // ---------------------------------------------------------
    console.error(`ERROR CATASTRÓFICO no controlado en obtenerJsonAgente: ${errorGlobal.stack || errorGlobal.message}`);
    return null;
  }
}