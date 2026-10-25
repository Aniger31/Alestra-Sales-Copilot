# Alestra Sales Copilot — Plan de Implementación

---

## Guía para Obtener las API Keys (sin costo)

### Gemini API Key (Google AI Studio)

1. Abrir [https://aistudio.google.com](https://aistudio.google.com) con una cuenta de Google personal (no cuenta de organización GSuite que tenga restricciones).
2. Hacer clic en **"Get API Key"** en el panel izquierdo.
3. Hacer clic en **"Create API key in new project"** — Google crea automáticamente un proyecto de Google Cloud y asocia la clave.
4. Copiar la clave generada (formato: `AIza...`).
5. **No** activar facturación. La cuota gratuita de Google AI Studio es independiente de Google Cloud Billing.
6. Verificar la cuota gratuita disponible: en la misma página, sección "Rate Limits" → Gemini 1.5 Flash: 15 solicitudes por minuto, 1 millón de tokens por día — suficiente para la demo.
7. Para verificar que la clave funciona, ejecutar en terminal (reemplazar `TU_CLAVE`):
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=TU_CLAVE" \
     -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"Hola, responde solo: OK"}]}]}'
   ```
   Respuesta esperada: JSON con `"text": "OK"`. Si devuelve `403`, la clave es incorrecta. Si devuelve `429`, se agotó la cuota.

**Modelo recomendado:** `gemini-1.5-flash` — más rápido y con mayor cuota gratuita que `gemini-1.5-pro`.
Si el equipo tiene acceso a `gemini-2.0-flash-exp`, también es gratuito en AI Studio — solo cambiar `GEMINI_MODEL`.

---

### Groq API Key

1. Abrir [https://console.groq.com](https://console.groq.com).
2. Registrarse con correo o cuenta de GitHub — **no requiere tarjeta de crédito**.
3. En el panel, ir a **"API Keys"** → **"Create API Key"**.
4. Darle un nombre descriptivo (ej. `alestra-hackathon`) y copiar la clave (formato: `gsk_...`).
5. Verificar la cuota gratuita: Groq free tier incluye **25 solicitudes de audio por día** para Whisper y miles de tokens para LLM.
6. Para verificar que la clave funciona:
   ```bash
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer TU_CLAVE"
   ```
   Debe retornar un JSON con lista de modelos disponibles, incluyendo `whisper-large-v3`.

---

### Configuración en el Proyecto

Una vez obtenidas las claves, crear el archivo `.env.local` en la raíz del proyecto (este archivo NUNCA va a Git):

```dotenv
GEMINI_API_KEY=AIza...tu_clave_aqui
GEMINI_MODEL=gemini-1.5-flash
GROQ_API_KEY=gsk_...tu_clave_aqui
```

El archivo `.env.example` que se versiona en Git contiene solo las variables sin valores:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=
GROQ_API_KEY=
```

**Reglas de seguridad:**
- Nunca usar el prefijo `NEXT_PUBLIC_` para estas variables — las expone al navegador.
- Nunca imprimir las claves en `console.log` ni en respuestas de la API.
- Nunca subir `.env.local` a GitHub — el `.gitignore` lo excluye desde la Tarea 1.

---

### Manejo de Errores de Autenticación y Cuota

| Error HTTP | Causa probable | Acción en la app |
|---|---|---|
| `401 Unauthorized` | API key incorrecta o faltante | Mostrar: "API key no configurada. Revisar .env.local" |
| `403 Forbidden` | Key revocada o servicio no habilitado | Mostrar: "API key inválida. Generar una nueva en la consola" |
| `429 Too Many Requests` | Cuota gratuita agotada | Mostrar banner y activar datos ficticios de demostración |
| `503 Service Unavailable` | Servicio temporalmente no disponible | Reintentar 1 vez, luego mostrar error de conexión |

Todos estos errores se manejan en los Route Handlers de Next.js y retornan un JSON estructurado al frontend:
```json
{ "error": "QUOTA_EXCEEDED", "message": "Cuota de Groq agotada", "fallback": true }
```
Cuando `fallback: true`, el frontend carga automáticamente los datos ficticios de `mockData.js`.

---

## Resumen General

**Objetivo:** Construir un MVP full-stack de asistente comercial con IA para ejecutivos de ventas B2B de Alestra, capaz de grabar/transcribir reuniones, analizar conversaciones con Gemini, recomendar productos del catálogo simulado y exportar minutas en formato Word.

**Framework:** Next.js 14+ con App Router, React, JavaScript, CSS Modules.  
**APIs externas:** Google Gemini (análisis + minutas), Groq Whisper (transcripción de audio).  
**Presupuesto:** $0 MXN — solo cuotas gratuitas de Gemini y Groq.  
**Estado inicial:** Repositorio sin código de aplicación. Solo existe la carpeta `catalogo-simulado/` con datos JSON, CSV, SQLite y XLSX.

---

## Diagnóstico Técnico Inicial

### Lo que existe
- `catalogo-simulado/catalogo-simulado.json` — catálogo completo con 45 productos, 7 familias, 7 paquetes, 10 reglas de escalamiento, 12 condiciones comerciales, 10 casos ficticios de clientes.
- `catalogo-simulado/csv/` — las mismas tablas en CSV individuales.
- `catalogo-simulado/catalogo-simulado.db` — SQLite (no se usará directamente; se cargará el JSON).
- `catalogo-simulado/LEEME.md` — documentación del catálogo.

### Lo que NO existe aún
- Proyecto Next.js (no hay `package.json`, `src/`, ni `next.config.js`).
- Ningún componente React.
- Ninguna ruta API.
- Ningún servicio de integración.
- Ningún archivo de entorno.

### Campos clave del catálogo (referencia para la IA)
Cada producto tiene: `sku`, `familia`, `nombre`, `descripcion`, `tipo` (estándar/configurable/a la medida), `segmento`, `precio_mensual_mxn`, `cargo_unico_mxn`, `requiere_alguno_de`, `se_recomienda_con`, `senal_del_cliente`, `preguntas_clave`, `cuando_entra_arquitecto`.

### Estructura del catálogo a importar
Copiar `catalogo-simulado/catalogo-simulado.json` a `src/data/catalog.json` durante la Fase 2 (configuración del proyecto).

---

## Arquitectura de la Aplicación

```
USUARIO
  │
  ▼
Next.js App Router (src/app/)
  │
  ├─ page.jsx            — Dashboard
  ├─ meeting/page.jsx    — Nueva reunión
  ├─ copilot/page.jsx    — Transcripción + Análisis
  ├─ diagnosis/page.jsx  — Diagnóstico + Catálogo
  ├─ minutes/page.jsx    — Minuta editable
  └─ proposal/page.jsx   — Propuesta comercial
  │
  ├─ api/transcription/route.js   ──► Groq Whisper API
  ├─ api/analysis/route.js        ──► Gemini API
  ├─ api/minutes/route.js         ──► Gemini API
  ├─ api/catalog/route.js         ──► src/data/catalog.json
  └─ api/documents/route.js       ──► docx library
```

**Regla de seguridad absoluta:** ninguna clave API sale del servidor (nunca usar `NEXT_PUBLIC_`).

---

## Variables de Entorno Requeridas

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
GROQ_API_KEY=
```

Archivo `.env.local` — solo en la máquina local, nunca en Git.  
Archivo `.env.example` — versionado, sin valores reales.

---

## Sub-tareas del Plan

---

### Tarea 1 — Scaffolding del Proyecto Next.js
**Status:** [x] done

**Intent:** Inicializar el proyecto Next.js con App Router, instalar todas las dependencias necesarias y crear la estructura base de carpetas y archivos de configuración, incluyendo el `MeetingContext` global.

**Expected Outcomes:**
- `package.json` con todas las dependencias del proyecto.
- `next.config.js` configurado.
- Estructura de directorios `src/app/`, `src/components/`, `src/services/`, `src/lib/`, `src/data/`, `src/styles/`, `src/context/` creada.
- `.env.example` con las tres variables documentadas.
- `.gitignore` correcto (excluye `.env.local`, `node_modules`, `catalogo-simulado/*.db`).
- `npm run dev` levanta sin errores en `localhost:3000`.
- `catalog.json` copiado de `catalogo-simulado/catalogo-simulado.json` a `src/data/catalog.json`.
- `src/context/MeetingContext.jsx` con `MeetingProvider` que persiste estado en `localStorage`.

**Todo List:**
1. Crear `package.json` con dependencias: `next`, `react`, `react-dom`, `@google/genai`, `groq-sdk`, `docx`, `busboy` (para parsing multipart en Route Handlers).
2. Crear `next.config.js`.
3. Crear estructura de carpetas vacías con `.gitkeep` donde sea necesario.
4. Crear `src/app/layout.jsx` con metadata básica del proyecto.
5. Crear `src/app/globals.css` con reset básico y variables de color.
6. Crear `.env.example` con `GEMINI_API_KEY=`, `GEMINI_MODEL=`, `GROQ_API_KEY=`.
7. Crear `.gitignore` apropiado para Next.js.
8. Copiar `catalogo-simulado/catalogo-simulado.json` → `src/data/catalog.json`.
9. Crear `README.md` inicial.

**Relevant Context:**
- Dependencias confirmadas: `@google/genai` (SDK oficial Gemini), `groq-sdk` (SDK Groq), `docx` (generación Word).
- `busboy` o el soporte nativo de `formData()` de Next.js Route Handlers para recibir audio.
- No usar `NEXT_PUBLIC_` para ninguna clave.

---

### Tarea 2 — Servicios Backend (Groq, Gemini, Catálogo, Documentos)
**Status:** [x] done

**Intent:** Implementar los cuatro servicios del servidor que encapsulan toda la lógica de negocio y las llamadas a APIs externas. Estos servicios son consumidos por los Route Handlers de Next.js.

**Expected Outcomes:**
- `src/services/groqService.js` con función `transcribirAudio(audioBuffer, mimeType)`.
- `src/services/geminiService.js` con funciones `analizarConversacion(transcripcion)` y `generarMinuta(transcripcion, datosReunion)`.
- `src/services/catalogService.js` con funciones de búsqueda y recomendación basadas en `catalog.json`.
- `src/services/documentService.js` con función `generarDocumentoWord(minuta)` usando la biblioteca `docx`.
- `src/lib/validations.js` con validadores de estructura JSON para respuestas de Gemini.
- `src/lib/constants.js` con límites, formatos permitidos, y textos de error.

**Todo List:**
1. Crear `src/services/groqService.js`: carga `GROQ_API_KEY`, llama a Groq Whisper con el buffer de audio, retorna texto o lanza error tipado.
2. Crear `src/services/geminiService.js`: 
   - `analizarConversacion()` — prompt estructurado que devuelve JSON con `summary`, `needs`, `technicalRequirements`, `commercialRequirements`, `missingInformation`, `suggestedQuestions`, `compatibleProductSKUs`, `nextSteps`.
   - `generarMinuta()` — prompt estructurado que devuelve JSON con `title`, `objective`, `participants`, `topics`, `summary`, `decisions`, `agreements`, `tasks`, `pendingItems`, `nextSteps`.
   - Ambas funciones parsean y validan el JSON; si el parse falla, retornan error descriptivo.
   - Incluir instrucción explícita en el prompt: "No inventes productos, precios ni fechas. Solo usa información presente en la transcripción."
3. Crear `src/services/catalogService.js`: 
   - Carga `catalog.json` una sola vez (módulo singleton).
   - `obtenerProductosPorSKUs(skus)` — filtra y retorna productos completos.
   - `buscarProductosPorFamilia(familia)` — filtra por familia.
   - `evaluarEscalamiento(skus, contexto)` — verifica reglas de escalamiento contra los SKUs y el contexto.
   - `obtenerPaquetesCompatibles(skus)` — sugiere paquetes que contengan los SKUs detectados.
4. Crear `src/services/documentService.js`: genera `.docx` con estructura: título, encabezado, resumen ejecutivo, participantes, temas tratados, decisiones, tabla de tareas (responsable, fecha, estado), próximos pasos. Devuelve un Buffer.
5. Crear `src/lib/validations.js` con funciones `validarAnalisis(json)` y `validarMinuta(json)`.
6. Crear `src/lib/constants.js` con `AUDIO_MAX_SIZE_MB`, `AUDIO_FORMATS_ALLOWED`, `GEMINI_MAX_RETRIES`, mensajes de error estándar.
7. Crear `src/lib/audioUtils.js` con utilidades para validar tipo MIME y tamaño de audio.

**Relevant Context:**
- Groq Whisper acepta: `audio/webm`, `audio/wav`, `audio/mp3`, `audio/mp4`, `audio/ogg`. Tamaño máximo ~25MB.
- Gemini responderá dentro de texto plano — extraer JSON con regex entre triple backticks o parseo directo.
- `catalog.json` tiene campo `aviso` con descargo de responsabilidad — incluirlo en contexto del prompt de Gemini para que no invente precios.
- `documentService.js` usa solo la API `docx` de Node.js — no ejecuta en el cliente.

---

### Tarea 3 — Route Handlers API (Next.js)
**Status:** [x] done (ver alestra-sales-copilot/CAMBIOS.md)

**Intent:** Implementar los cinco Route Handlers de Next.js que exponen los servicios al frontend. Todos se ejecutan en el servidor; ninguno expone claves al cliente.

**Expected Outcomes:**
- `POST /api/transcription` — recibe FormData con archivo de audio, llama a Groq, retorna texto.
- `POST /api/analysis` — recibe JSON con transcripción, llama a Gemini, retorna análisis estructurado.
- `POST /api/minutes` — recibe JSON con transcripción y datos de reunión, retorna minuta estructurada.
- `GET /api/catalog` — retorna catálogo completo o filtrado.
- `POST /api/documents` — recibe minuta confirmada, retorna archivo `.docx` descargable.

**Todo List:**
1. Crear `src/app/api/transcription/route.js`: parse `FormData`, extrae archivo, valida tipo y tamaño con `audioUtils`, llama `groqService.transcribirAudio()`, retorna `{ text }` o error HTTP tipado.
2. Crear `src/app/api/analysis/route.js`: parse JSON body, valida que `transcription` no esté vacío, llama `geminiService.analizarConversacion()`, llama `catalogService.obtenerProductosPorSKUs()` con los SKUs sugeridos, retorna análisis enriquecido con datos reales del catálogo.
3. Crear `src/app/api/minutes/route.js`: parse JSON, valida estructura, llama `geminiService.generarMinuta()`, retorna minuta estructurada.
4. Crear `src/app/api/catalog/route.js`: acepta query params `?familia=` y `?sku=`, retorna productos filtrados del catálogo.
5. Crear `src/app/api/documents/route.js`: recibe minuta confirmada en JSON, llama `documentService.generarDocumentoWord()`, devuelve respuesta con `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document` y header `Content-Disposition: attachment; filename=minuta.docx`.
6. En todos los handlers: capturar errores, distinguir entre errores de cuota agotada (429), autenticación (401/403), red, y retornar mensajes claros al frontend con código HTTP apropiado.

**Relevant Context:**
- Next.js App Router usa `export async function POST(request)` en `route.js`.
- `request.formData()` para audio, `request.json()` para JSON.
- Respuesta binaria con `new Response(buffer, { headers: { ... } })`.
- Si cuota agotada: retornar `{ error: 'QUOTA_EXCEEDED', message: '...', fallback: true }` para que el frontend pueda activar datos ficticios de demostración.

---

### Tarea 4 — Layout y Componentes Base (Chelsea)
**Status:** [x] done

**Intent:** Crear el shell visual de la aplicación: layout con sidebar de navegación, header, sistema de colores y CSS Modules base. Esta tarea establece la identidad visual y los componentes reutilizables.

**Expected Outcomes:**
- `src/app/layout.jsx` con importación de `Sidebar` y `Header`.
- `src/components/layout/Sidebar.jsx` con navegación a las 6 rutas principales.
- `src/components/layout/Header.jsx` con título de sección y breadcrumb.
- `src/styles/dashboard.module.css` y archivos de estilos por componente.
- Variables CSS de color definidas en `globals.css`.
- Diseño responsive funcional en mobile y desktop.

**Todo List:**
1. Definir variables CSS en `globals.css`: `--color-primary: #142B4D`, `--color-accent: #7357E8`, `--color-bg: #F5F7FB`, `--color-white: #FFFFFF`, `--color-text: #1F2937`, `--color-border: #E5E7EB`.
2. Crear `src/components/layout/Sidebar.jsx` y `Sidebar.module.css` con enlaces a: Dashboard, Nueva Reunión, Copiloto, Diagnóstico, Minutas, Propuesta.
3. Crear `src/components/layout/Header.jsx` y `Header.module.css`.
4. Actualizar `src/app/layout.jsx` para usar Sidebar y Header.
5. Crear `src/components/ui/` con componentes atómicos reutilizables: `Button.jsx`, `Card.jsx`, `LoadingSpinner.jsx`, `ErrorMessage.jsx`, `Badge.jsx`.
6. Crear placeholder pages para las 6 rutas: `app/page.jsx`, `app/meeting/page.jsx`, `app/copilot/page.jsx`, `app/diagnosis/page.jsx`, `app/minutes/page.jsx`, `app/proposal/page.jsx`.

**Relevant Context:**
- CSS Modules son obligatorios (no Tailwind, no styled-components).
- Paleta: azul oscuro `#142B4D`, violeta `#7357E8`, fondo `#F5F7FB`, blanco `#FFFFFF`, texto `#1F2937`, borde `#E5E7EB`.
- Priorizar reutilización de componentes entre pantallas.

---

### Tarea 5 — Pantalla Dashboard y Nueva Reunión
**Status:** [x] done

**Intent:** Implementar la pantalla de inicio con resumen de reuniones y la pantalla de registro de nueva reunión con el formulario de datos del cliente.

**Expected Outcomes:**
- Dashboard muestra tarjetas de resumen y acceso rápido a reuniones.
- Formulario de nueva reunión captura: nombre del cliente, empresa, industria, ciudad, número de empleados, fecha, tipo de reunión.
- Datos de reunión se persisten en estado React (no base de datos — MVP).
- Navegación al copiloto al guardar la reunión.

**Todo List:**
1. Crear `src/components/meeting/MeetingForm.jsx` y `MeetingForm.module.css` con el formulario de datos del cliente.
2. Crear `src/components/meeting/MeetingCard.jsx` para mostrar reuniones en el dashboard.
3. Implementar `src/app/meeting/page.jsx` completo.
4. Implementar `src/app/page.jsx` (Dashboard) con lista de reuniones recientes y accesos directos.
5. Usar `useState` y Context/localStorage para persistir datos de reunión durante la sesión de demostración.
6. Incluir los 10 casos ficticios de `catalog.json` como datos de ejemplo cargables con un botón "Cargar caso de prueba".

**Relevant Context:**
- Los casos ficticios están en `catalog.json` bajo la clave `casos_clientes` — usarlos para el botón de demo.
- No usar base de datos — estado en React + localStorage es suficiente para el MVP del hackathon.

---

### Tarea 6 — Pantalla Copiloto (Grabación + Transcripción)
**Status:** [x] done (ver alestra-sales-copilot/CAMBIOS.md)

**Intent:** Implementar la captura de audio con MediaRecorder API, la entrada manual de texto, y la visualización de la transcripción editable. Es el corazón del flujo principal.

**Expected Outcomes:**
- Botón de grabación que solicita permiso al micrófono y graba con MediaRecorder.
- Indicador visual de grabación activa (animación de punto rojo pulsante).
- Al detener, el audio se envía a `POST /api/transcription`.
- Campo de texto editable muestra la transcripción devuelta.
- Opción de ingresar texto manualmente (sin grabar).
- Botón "Analizar" que envía la transcripción a `POST /api/analysis`.
- Estado de carga durante transcripción y análisis.
- Manejo de error si el micrófono fue denegado o la cuota se agotó.

**Todo List:**
1. Crear `src/components/copilot/AudioRecorder.jsx` con lógica de `MediaRecorder`, estados `idle/recording/processing`.
2. Crear `src/components/copilot/TranscriptionEditor.jsx` — textarea editable con contador de caracteres.
3. Crear `src/components/copilot/AnalysisPanel.jsx` — muestra necesidades, requisitos, preguntas sugeridas del análisis de Gemini.
4. Crear `src/lib/audioUtils.js` con función `validarAudio(blob)` que comprueba tipo MIME y tamaño.
5. Implementar `src/app/copilot/page.jsx` componiendo los tres componentes anteriores.
6. Manejar error `QUOTA_EXCEEDED` mostrando banner "Cuota API agotada — mostrando datos de demostración" y cargar análisis ficticio de prueba.
7. Crear `src/lib/mockData.js` con análisis y minuta ficticios para demostración cuando las APIs fallen.

**Relevant Context:**
- MediaRecorder graba en `audio/webm` en Chrome/Edge, `audio/ogg` en Firefox — ambos son aceptados por Groq Whisper.
- El hook `useRef` para el `MediaRecorder`, `useState` para el `Blob` de audio.
- Enviar al Route Handler con `FormData` y campo `audio`.

---

### Tarea 7 — Pantalla Diagnóstico (Catálogo + Recomendaciones)
**Status:** [x] done (ver alestra-sales-copilot/CAMBIOS.md)

**Intent:** Mostrar los productos del catálogo recomendados por Gemini validados contra SKUs reales, indicar el tipo de oportunidad (estándar/configurable/a la medida) y señalar si se requiere escalamiento a un arquitecto.

**Expected Outcomes:**
- Lista de productos recomendados con nombre, familia, tipo, precio mensual y justificación.
- Indicador de tipo de oportunidad global (estándar / configurable / a la medida / información insuficiente).
- Alerta visible si aplican reglas de escalamiento: "Se requiere revisión de un arquitecto de soluciones".
- Paquetes sugeridos cuando correspondan.
- Información faltante listada con las preguntas pendientes de respuesta.
- Estimación económica ficticia y explícita solo si hay precios suficientes.

**Todo List:**
1. Crear `src/components/diagnosis/ProductCard.jsx` para cada producto recomendado.
2. Crear `src/components/diagnosis/EscalationAlert.jsx` — banner de alerta cuando aplica regla de escalamiento.
3. Crear `src/components/diagnosis/PackageCard.jsx` para paquetes sugeridos.
4. Crear `src/components/diagnosis/MissingInfoPanel.jsx` — lista las preguntas pendientes del análisis de Gemini.
5. Implementar `src/app/diagnosis/page.jsx` consumiendo los resultados del análisis (pasados por estado de la sesión).
6. Implementar función en `catalogService.js` `evaluarEscalamiento(productosSKUs, contexto)` que verifica las 10 reglas de `reglas_escalamiento`.
7. Nota de disclaimer visible: "Precios simulados, sin IVA. No son cotizaciones oficiales de Alestra."

**Relevant Context:**
- Las reglas de escalamiento están en `catalog.json` bajo `reglas_escalamiento` con campo `cuando_entra_un_arquitecto`.
- Condiciones comerciales en `catalog.json` bajo `condiciones_comerciales` — mostrar descuentos por plazo.
- Los precios en el catálogo son en MXN sin IVA (IVA = 16%).

---

### Tarea 8 — Pantalla Minutas (Generación y Editor)
**Status:** [x] done (ver alestra-sales-copilot/CAMBIOS.md)

**Intent:** Generar la minuta estructurada con Gemini a partir de la transcripción revisada, mostrarla en un editor interactivo y permitir edición de campos antes de exportar.

**Expected Outcomes:**
- Botón "Generar minuta" que llama a `POST /api/minutes`.
- Minuta muestra: título, objetivo, participantes, temas, resumen, decisiones, acuerdos.
- Tabla de tareas editable con campos: descripción, responsable, fecha límite, estado.
- Información pendiente de confirmación marcada con indicador visual (ej. `⚠ Sin confirmar`).
- Botón "Confirmar y exportar" que activa la generación del documento Word.

**Todo List:**
1. Crear `src/components/minutes/MinuteHeader.jsx` — título, fecha, participantes editables.
2. Crear `src/components/minutes/MinuteSections.jsx` — resumen, decisiones, acuerdos con textarea editables.
3. Crear `src/components/minutes/TaskTable.jsx` — tabla con filas editables para cada tarea.
4. Crear `src/components/minutes/PendingItemsList.jsx` — lista de ítems pendientes de confirmación.
5. Implementar `src/app/minutes/page.jsx` con estado local del objeto minuta y edición inline.
6. Mostrar badge visual `⚠ Sin confirmar` en campos que Gemini dejó como `null` (responsable, fecha).
7. Solicitar confirmación antes de generar el Word: modal o checklist de revisión.

**Relevant Context:**
- La estructura de la minuta viene definida en la Sección 10 del prompt maestro.
- Los campos `responsible: null` y `dueDate: null` indican información que Gemini no encontró en la transcripción — marcarlos visualmente.

---

### Tarea 9 — Generación y Descarga de Documento Word
**Status:** [x] done (ver alestra-sales-copilot/CAMBIOS.md)

**Intent:** Implementar la generación del archivo `.docx` real con la biblioteca `docx` para JavaScript, incluyendo estructura profesional con encabezados, tabla de tareas y próximos pasos.

**Expected Outcomes:**
- `POST /api/documents` recibe la minuta confirmada y devuelve un archivo `.docx` válido.
- El archivo descargado abre correctamente en Microsoft Word.
- Estructura del documento: portada, resumen ejecutivo, temas, decisiones, tabla de tareas (con columnas Descripción, Responsable, Fecha, Estado), próximos pasos.
- Botón de descarga en la pantalla de minutas activa la descarga automática.

**Todo List:**
1. Implementar `src/services/documentService.js` con `generarDocumentoWord(minuta)` usando la API `docx`.
2. Incluir: `Document`, `Paragraph`, `TextRun`, `Table`, `TableRow`, `TableCell`, `HeadingLevel`, `AlignmentType`.
3. Crear tabla de tareas con tres columnas: Descripción, Responsable, Fecha y Estado.
4. Agregar pie de página con: "Documento generado por Alestra Sales Copilot — Datos simulados para demostración".
5. Implementar `src/app/api/documents/route.js` que llama al servicio y responde con los headers MIME correctos.
6. En el frontend (`src/app/minutes/page.jsx`): al recibir la respuesta binaria, crear un `Blob` y activar descarga con un `<a>` temporal.

**Relevant Context:**
- La biblioteca `docx` de npm genera XML válido de Open XML — produce archivos `.docx` reales, no HTML renombrado.
- `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- En Next.js Route Handler, devolver `new Response(buffer, { headers })`.

---

### Tarea 10 — Pantalla Propuesta Comercial
**Status:** [x] done (ver alestra-sales-copilot/CAMBIOS.md)

**Intent:** Mostrar la propuesta preliminar con el resumen de la solución sugerida, los productos recomendados con precios y condiciones comerciales, y el botón de exportación final.

**Expected Outcomes:**
- Resumen de la solución propuesta con productos del catálogo validados.
- Tabla de productos con: SKU, nombre, precio mensual, cargo único, plazo sugerido, descuento aplicable.
- Subtotal mensual, nota de IVA (16%), vigencia de propuesta (30 días).
- Disclaimer explícito: "Propuesta preliminar de demostración. No es una cotización oficial de Alestra."
- Botón de exportación Word de la propuesta (usa el mismo `documentService` con plantilla de propuesta).

**Todo List:**
1. Crear `src/components/proposal/ProposalSummary.jsx` — resumen de la oportunidad y tipo de caso.
2. Crear `src/components/proposal/ProductTable.jsx` — tabla con los productos cotizados.
3. Crear `src/components/proposal/CommercialTerms.jsx` — condiciones aplicables y descuentos.
4. Implementar `src/app/proposal/page.jsx`.
5. Agregar función `generarPropuestaWord(propuesta)` en `documentService.js` con plantilla de propuesta.
6. Mostrar disclaimer de datos simulados de forma prominente.

**Relevant Context:**
- Las `condiciones_comerciales` del catálogo definen los descuentos por plazo: 12 meses = precio lista, 24 meses = -5%, 36 meses = -10%.
- Descuento máximo del vendedor sin autorización: 10%.
- Los cargos únicos no tienen descuento por plazo; se pueden pagar en 3 mensualidades.

---

### Tarea 11 — Pruebas Finales y Preparación de Demo
**Status:** [~] parcial — falta probar Gemini/Groq con claves reales y abrir los .docx en Microsoft Word

**Intent:** Verificar el recorrido completo de extremo a extremo, documentar limitaciones conocidas, preparar datos ficticios de demostración y crear el README final.

**Expected Outcomes:**
- Flujo completo funciona: Registrar → Grabar → Transcribir → Analizar → Diagnosticar → Generar minuta → Exportar Word.
- Todos los errores de API muestran mensajes claros y activar modo de demostración con datos ficticios.
- README completo con instrucciones de instalación, configuración y ejecución.
- 10 casos ficticios de `casos_clientes` del catálogo accesibles como datos de prueba.

**Todo List:**
1. Probar el flujo completo con credenciales de Gemini y Groq del equipo.
2. Verificar que el `.docx` generado abre en Microsoft Word.
3. Probar todos los escenarios de error: API key faltante, cuota agotada, audio vacío, formato inválido.
4. Verificar que `mockData.js` activa correctamente cuando las APIs fallan.
5. Actualizar `README.md` con: instalación, configuración de `.env.local`, ejecución, arquitectura, límites de APIs, problemas conocidos.
6. Verificar que `.env.local` no está en Git (`git status` no debe mostrarlo).

---

## Dinámica de Trabajo

**IBM Bob** implementa e integra todo el código de forma incremental en el repositorio, trabajando tarea por tarea.
**El equipo valida y aprueba** cada tarea terminada antes de pasar a la siguiente.

### Responsabilidades de revisión por tarea

| Tarea | Quién valida |
|-------|-------------|
| Tarea 1 — Scaffolding | Las tres — verificar que `npm run dev` arranca |
| Tarea 2 — Servicios Backend | **Fernanda** (Groq + Gemini) · **Regina** (Catálogo + Documentos) |
| Tarea 3 — Route Handlers | **Fernanda** (transcripción, análisis, minutas) · **Regina** (catálogo, documentos) |
| Tarea 4 — Layout y Componentes Base | **Chelsea** — identidad visual, colores, responsive |
| Tarea 5 — Dashboard y Reunión | **Chelsea** — flujo de formulario y navegación |
| Tarea 6 — Copiloto y Grabación | **Chelsea** (UI grabación) · **Fernanda** (transcripción real) |
| Tarea 7 — Diagnóstico | **Chelsea** (UI) · **Regina** (catálogo y escalamiento) |
| Tarea 8 — Minutas | **Chelsea** (UI editor) · **Regina** (estructura de minuta) |
| Tarea 9 — Generación Word | **Regina** — abrir `.docx` en Microsoft Word |
| Tarea 10 — Propuesta | **Chelsea** (UI) · **Regina** (condiciones comerciales) |
| Tarea 11 — Pruebas y Demo | Las tres — flujo completo de extremo a extremo |

### Reglas de trabajo

- Bob implementa cada tarea completa antes de pedir validación.
- La persona indicada revisa y aprueba; si hay correcciones, Bob las aplica antes de continuar.
- No se bloquea el desarrollo por aprobaciones individuales cuando la tarea no es responsabilidad de esa integrante.
- Un solo branch `main` — sin ramas por integrante salvo solicitud expresa.
- Bob no modifica archivos no relacionados con la tarea en curso.

---

## Control de Versiones

- Un repositorio, una sola rama `main`.
- Commits atómicos por tarea completada, siguiendo la convención: `feat: scaffolding next.js project`, `feat: integrate groq whisper`, etc.
- No subir `.env.local`, claves, grabaciones ni `node_modules`.

---

## Limitaciones Conocidas

1. **Estado con React Context + localStorage:** un `MeetingContext` global persiste los datos de la reunión activa entre pantallas y recargas. No se usa ninguna dependencia adicional (Zustand, Redux, etc.).
2. **Cuotas gratuitas:** si Gemini o Groq agotan su cuota, el sistema muestra datos ficticios pero no puede procesar nuevas conversaciones reales hasta el siguiente periodo.
3. **Audio en Safari iOS:** MediaRecorder puede no estar disponible en todos los dispositivos iOS. Mostrar mensaje de error apropiado y permitir entrada manual.
4. **Tamaño de audio:** Groq Whisper tiene límite de ~25MB. Grabaciones largas deben segmentarse. Para el MVP, limitar a grabaciones de máximo 10 minutos.
5. **Respuestas JSON de Gemini:** Gemini no garantiza JSON puro en todos los casos. Se implementa extracción robusta con fallback a error descriptivo.
6. **Sin autenticación de usuarios:** el MVP no tiene login. Apropiado para demostración de hackathon.

---

## Criterios de Éxito del MVP

- [ ] `npm run dev` inicia sin errores.
- [ ] Navegación entre las 6 pantallas funciona.
- [ ] Formulario de reunión guarda datos.
- [ ] Grabación de audio funciona en Chrome.
- [ ] Transcripción real retorna texto desde Groq.
- [ ] Análisis real retorna necesidades y preguntas desde Gemini.
- [ ] Los SKUs recomendados coinciden con productos reales del catálogo.
- [ ] Se detecta correctamente cuando aplica escalamiento a arquitecto.
- [ ] Minuta generada tiene estructura válida.
- [ ] Minuta es editable antes de exportar.
- [ ] Archivo `.docx` descargado abre en Microsoft Word.
- [ ] Si una API falla, el sistema muestra datos de demostración sin romper.
