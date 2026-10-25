/**
 * validations.js — validadores de respuestas JSON de Gemini.
 * Evita que respuestas incompletas o malformadas lleguen al frontend.
 */

/**
 * Extrae el primer bloque JSON válido de un string de texto.
 * Gemini a veces envuelve el JSON en ```json ... ``` o simplemente lo incrusta en prosa.
 * @param {string} text
 * @returns {object|null}
 */
export function extraerJSON(text) {
  if (!text || typeof text !== 'string') return null;

  // Intentar parse directo primero
  try {
    return JSON.parse(text.trim());
  } catch {
    // No es JSON puro — buscar bloque ```json ... ```
  }

  // Buscar bloque de código JSON
  const bloqueJson = text.match(/```json\s*([\s\S]*?)```/i);
  if (bloqueJson) {
    try {
      return JSON.parse(bloqueJson[1].trim());
    } catch {
      // Bloque malformado
    }
  }

  // Buscar primer objeto JSON en el texto { ... }
  const inicioObj = text.indexOf('{');
  const finObj = text.lastIndexOf('}');
  if (inicioObj !== -1 && finObj > inicioObj) {
    try {
      return JSON.parse(text.slice(inicioObj, finObj + 1));
    } catch {
      // No se pudo extraer
    }
  }

  return null;
}

/**
 * Valida y normaliza la respuesta de analizarConversacion().
 * Garantiza que todos los campos esperados existan, aunque estén vacíos.
 * @param {object} raw
 * @returns {object}
 */
export function validarAnalisis(raw) {
  if (!raw || typeof raw !== 'object') {
    return crearAnalisisVacio();
  }

  return {
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    needs: Array.isArray(raw.needs) ? raw.needs : [],
    technicalRequirements: Array.isArray(raw.technicalRequirements)
      ? raw.technicalRequirements
      : [],
    commercialRequirements: Array.isArray(raw.commercialRequirements)
      ? raw.commercialRequirements
      : [],
    missingInformation: Array.isArray(raw.missingInformation)
      ? raw.missingInformation
      : [],
    suggestedQuestions: Array.isArray(raw.suggestedQuestions)
      ? raw.suggestedQuestions
      : [],
    compatibleProductSKUs: Array.isArray(raw.compatibleProductSKUs)
      ? raw.compatibleProductSKUs.filter((s) => typeof s === 'string')
      : [],
    nextSteps: Array.isArray(raw.nextSteps) ? raw.nextSteps : [],
    opportunityType: raw.opportunityType || 'insuficiente',
  };
}

/**
 * Valida y normaliza la respuesta de generarMinuta().
 * @param {object} raw
 * @returns {object}
 */
export function validarMinuta(raw) {
  if (!raw || typeof raw !== 'object') {
    return crearMinutaVacia();
  }

  return {
    title: typeof raw.title === 'string' ? raw.title : '',
    objective: typeof raw.objective === 'string' ? raw.objective : '',
    participants: Array.isArray(raw.participants) ? raw.participants : [],
    topics: Array.isArray(raw.topics) ? raw.topics : [],
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    decisions: Array.isArray(raw.decisions) ? raw.decisions : [],
    agreements: Array.isArray(raw.agreements) ? raw.agreements : [],
    tasks: Array.isArray(raw.tasks)
      ? raw.tasks.map((t) => ({
          description: typeof t.description === 'string' ? t.description : '',
          responsible: t.responsible || null,
          dueDate: t.dueDate || null,
          status: t.status || 'pending',
        }))
      : [],
    pendingItems: Array.isArray(raw.pendingItems) ? raw.pendingItems : [],
    nextSteps: Array.isArray(raw.nextSteps) ? raw.nextSteps : [],
  };
}

function crearAnalisisVacio() {
  return {
    summary: '',
    needs: [],
    technicalRequirements: [],
    commercialRequirements: [],
    missingInformation: [],
    suggestedQuestions: [],
    compatibleProductSKUs: [],
    nextSteps: [],
    opportunityType: 'insuficiente',
  };
}

function crearMinutaVacia() {
  return {
    title: '',
    objective: '',
    participants: [],
    topics: [],
    summary: '',
    decisions: [],
    agreements: [],
    tasks: [],
    pendingItems: [],
    nextSteps: [],
  };
}
