/**
 * @fileoverview Módulo de Configuración Centralizada.
 */
const CONFIG = {
  /**
   * Lista oficial de nombres de agencias de la Cooperativa Crearcoop.
   * @type {Array<string>}
   */
  AGENCIAS_VALIDAS: ['Rionegro', 'Guatapé', 'Cocorná', 'Carmen'],
  /**
   * Umbral de similitud para la validación de nombres de agencias.
   * @type {number}
   */
  UMBRAL_SIMILITUD: 0.4,
  /**
   * Nombres de los meses en español para formateo de fechas.
   * El índice del array corresponde al valor devuelto por getMonth() (0 = Enero).
   * @type {Array<string>}
   */
  MESES_DEL_ANIO: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ],
  ID_Carpeta_Raiz: '15oFWVh2nFPBQGuv0kwwUmq98G6p7NgXt',
  ARCHIVO_PLANTILLA: '1GdYncMsrdFdpYbDfR3gF2o6aQBokrWoaDy0B0GHOxws',
  EMAIL_SUBJECT_PREFIX: 'MOVSENTERPRISE',
  PARENT_FOLDER_PATH: 'Operaciones-Movimientos',
  DATE_FORMAT: 'yyyy-MM-dd',
  TIMEZONE: 'America/Bogota',
  ATTACHMENT_MIME_TYPE: 'application/pdf',
  PDF_FILENAME_PREFIX: 'DocsMovs',
  //config para conexion DB en Big Query
  BIGQUERY: {
    PROJECT_ID: '',
    DATASET_ID: 'movimientos',
    TABLA_DATOS_AGENTE: 'tab',
    TABLA_REGISTRO: 'registro'
  },
  // --- NUEVA SECCIÓN AÑADIDA ---
  GEMINI: {
    MODEL_NAME: 'gemini-2.5-pro' // Usamos el identificador correcto para el modelo 1.5 Pro
  },
  NOTIFICACIONES: {
    /**
     * Lista centralizada de correos para alertas críticas del sistema.
     * @type {Array<string>}
     */
    CORREOS_SOPORTE: [
      //'operaciones@crearcoop.com', 
      'jose6palabras@gmail.com',
      //'tecnologia@crearcoop.com'
    ],
    CORRREOS_OPERACIONES: ['jose6palabras@gmail.com'],
    ASUNTO_ERROR: 'ERROR EN ANÁLISIS DE MOVIMIENTOS'
  }
};
/**
 * Mapa de configuración que relaciona Agencias Físicas -> Identificador de Tabla.
 * Las claves están normalizadas (minúsculas, sin tildes) para facilitar la búsqueda.
 */
const MAPA_AGENCIAS_TABLAS = {
  // Grupo Boyacá
  'cocorna': 'cocorna',
  'carmen': 'carmen',
  'rionegro': 'rionegro',
  'guatape': 'guatape'
};
const MAPA_AGENCIAS_CODES = {
  'rionegro': 1,    
  'carmen': 2,  
  'cocorna': 3,
  'guatape': 4
};