/**
 * mockData.js — datos ficticios de demostración.
 * Se activan cuando las APIs de Groq o Gemini no están disponibles.
 *
 * IMPORTANTE: estos datos son FICTICIOS y deben identificarse claramente
 * en la UI con el indicador de MODO DEMOSTRACIÓN.
 * Nunca presentar estos datos como resultados reales de una API.
 */

export const MOCK_TRANSCRIPTION = `[DEMO] Buenos días. Soy el director de TI de Aceros del Valle. 
Tenemos dos servidores físicos en un cuarto de la planta donde corre nuestro ERP. 
Este año tuvimos dos cortes de luz que pararon la operación completa por varias horas.
Somos 180 empleados y el ERP lo usan unos 40 usuarios simultáneos.
Buscamos una solución que garantice continuidad y que no requiera que nosotros administremos el hardware.
También nos preocupa el tema de respaldos — actualmente respaldamos en cintas y una vez perdimos información.
El presupuesto mensual aproximado sería de $50,000 a $80,000 MXN.
¿Qué opciones tienen disponibles?`;

export const MOCK_ANALYSIS = {
  summary:
    'Cliente de manufactura con 180 empleados busca migrar servidores físicos a infraestructura administrada. ' +
    'Experiencia previa de pérdida de datos por cortes de luz. Prioridades: continuidad operativa y respaldos seguros.',
  needs: [
    'Eliminar dependencia de servidores físicos en instalaciones propias',
    'Garantizar continuidad del ERP durante cortes de energía',
    'Implementar respaldos seguros y confiables',
    'Reducir carga administrativa del equipo de TI',
  ],
  technicalRequirements: [
    'Soporte para ERP con ~40 usuarios simultáneos',
    'Alta disponibilidad (mínimo 99.95%)',
    'Respaldo inmutable resistente a ransomware',
    'Acceso 24/7 con soporte técnico incluido',
  ],
  commercialRequirements: [
    'Presupuesto mensual: $50,000–$80,000 MXN',
    'Plazo de contrato a definir (12 o 24 meses)',
    'Empresa: mediana (180 empleados)',
    'Sector: manufactura',
  ],
  missingInformation: [
    'Número exacto de servidores a migrar',
    'Sistema operativo del ERP',
    'Consumo eléctrico actual de los servidores',
    'Volumen de datos a respaldar (TB)',
    'Requerimientos de tiempo de recuperación (RPO/RTO)',
  ],
  suggestedQuestions: [
    '¿Cuántos servidores físicos tienen actualmente y qué sistema operativo utilizan?',
    '¿Cuál es el volumen de datos que manejan hoy (GB o TB)?',
    '¿Tienen documentados los requisitos de su ERP (CPU, RAM, disco)?',
    '¿Cuántas horas de inactividad máxima toleran antes de impactar operaciones críticas?',
    '¿Han evaluado alguna solución en la nube previamente?',
  ],
  compatibleProductSKUs: ['SIM-DC-03', 'SIM-DC-07', 'SIM-BK-01', 'SIM-DC-08'],
  nextSteps: [
    'Completar cuestionario técnico con datos del ERP',
    'Solicitar visita técnica para evaluar infraestructura actual',
    'Preparar propuesta basada en Nube Privada + DRaaS + Backup Inmutable',
  ],
  opportunityType: 'configurable',
};

export const MOCK_MINUTES = {
  title: 'Minuta de Reunión Comercial — Aceros del Valle',
  objective:
    'Levantar necesidades de infraestructura tecnológica y evaluar opciones de solución para garantizar la continuidad operativa del ERP.',
  participants: [
    { name: 'Director de TI', company: 'Aceros del Valle', role: 'Cliente' },
    { name: null, company: 'Alestra', role: 'Ejecutivo Comercial' },
  ],
  topics: [
    'Estado actual de la infraestructura (servidores on-premise)',
    'Impacto de los cortes de luz en la operación',
    'Necesidades de respaldo y recuperación',
    'Presupuesto disponible y expectativas de plazo',
  ],
  summary:
    'Aceros del Valle opera dos servidores físicos en planta que soportan su ERP para 40 usuarios. ' +
    'Han sufrido dos interrupciones por cortes de luz y una pérdida de datos por fallo de cintas. ' +
    'Buscan migrar a infraestructura administrada con alta disponibilidad y respaldos inmutables.',
  decisions: [
    'Evaluar propuesta de Nube Privada con DRaaS y Backup Inmutable',
    'Solicitar levantamiento técnico detallado de la infraestructura actual',
  ],
  agreements: [
    'El cliente enviará especificaciones técnicas del ERP esta semana',
    'Alestra preparará propuesta preliminar en 5 días hábiles',
  ],
  tasks: [
    {
      description: 'Enviar especificaciones técnicas del ERP (CPU, RAM, disco, SO)',
      responsible: null,
      dueDate: null,
      status: 'pending',
    },
    {
      description: 'Preparar propuesta preliminar con opciones de Nube Privada',
      responsible: null,
      dueDate: null,
      status: 'pending',
    },
    {
      description: 'Agendar visita técnica a instalaciones del cliente',
      responsible: null,
      dueDate: null,
      status: 'pending',
    },
  ],
  pendingItems: [
    'Confirmar número exacto de servidores y volumen de datos',
    'Definir RTO y RPO requeridos por el cliente',
    'Confirmar nombres de los participantes de la reunión',
  ],
  nextSteps: [
    'Completar cuestionario técnico',
    'Presentar propuesta con opciones de 12, 24 y 36 meses',
    'Evaluar necesidad de escalamiento a arquitecto de soluciones',
  ],
};
