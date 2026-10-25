# Cambios — Tareas 6 a 11 (continuación del reporte de IBM Bob)

Se completaron las tareas pendientes del plan siguiendo las reglas del reporte: se reutilizaron `Button`, `Card`, `Badge`, `LoadingSpinner` y `ErrorMessage`, se conservó el campo `source: "demo" | "groq" | "gemini"` y solo se tocaron servicios o rutas cuando había un error que lo justificaba (motivo abajo).

## 1. Errores corregidos en lo que ya existía

| Archivo | Problema | Corrección |
|---|---|---|
| `app/api/documents/route.js` | Usaba `respuestaError()` sin definirla → **HTTP 500** con cualquier error de validación (confirmado con curl). | Se agregó la función. Además, la propuesta se **recalcula en el servidor** con el catálogo: si el navegador manda un precio alterado, se ignora (probado: se envió $1 y el Word muestra $425). |
| `lib/constants.js`, `.env.example`, `README.md` | `gemini-1.5-flash` **se apagó el 29-sep-2025**; con esa configuración Gemini responde 404 y la app cae siempre a demo. | Fallback `gemini-3.5-flash-lite`. **Verifiquen en AI Studio** qué modelo tienen disponible y pónganlo en `GEMINI_MODEL`. |
| `services/catalogService.js` → `evaluarEscalamiento()` | Marcaba `requiere: true` si algún producto tenía texto en `cuando_entra_arquitecto` (casi todos) → **todos los casos salían “requiere arquitecto”**, justo el indicador que el reto quiere bajar. | Evalúa las 10 reglas ESC y los umbrales numéricos de cada producto. Las condiciones por producto pasan a `revisar` (informativas). Misma firma; la lógica vive en `lib/commercialRules.js`. |
| `services/catalogService.js` → `determinarTipoOportunidad()` | Cualquier producto configurable volvía “configurable” todo el caso y no consideraba el escalamiento. | Acepta el escalamiento como 2.º parámetro y distingue **mixto** (nuevo en `OPPORTUNITY_TYPES`, igual que en `casos_clientes`). |
| `app/api/analysis/route.js` | En modo demo devolvía **siempre** el análisis de Aceros del Valle (la clínica dental recibía servidores y DRaaS). | Demo basado en la conversación (`lib/demoAnalysis.js`). Además detecta hechos (CNBV, datos de salud, Oracle >2 TB, híbrido…) y los devuelve en `facts` para que el vendedor los confirme. |
| `app/api/minutes/route.js` | Minuta demo siempre de Aceros del Valle. | Si recibe `analysis`, arma la minuta demo con el análisis de esa reunión; si no, se usa la de ejemplo como antes. |
| `services/geminiService.js` | `maxOutputTokens: 2048` puede cortar el JSON en modelos 2.5+ (los tokens de “pensamiento” cuentan). | `maxOutputTokens: 8192` + `responseMimeType: 'application/json'`; lee `response.text`. |
| `services/documentService.js` | La propuesta en Word solo tenía SKU, nombre, tipo y precio unitario. | Si recibe `calculo`, agrega cantidades, descuentos, mensualidad, cargos únicos, totales con IVA, arquitecto y pendientes. Si no, funciona como antes. |

## 2. Tareas implementadas

- **Tarea 6 – Copiloto:** `components/copilot/AudioRecorder.jsx` (idle / recording / processing, punto rojo, límite de 10 min a 32 kbps), `TranscriptionEditor.jsx` (contador, botones `+ Cliente` / `+ Vendedor`), `AnalysisPanel.jsx`, `app/copilot/page.jsx`. Si Groq no está disponible **no** se mete el texto de Aceros en otra reunión: se avisa y el vendedor decide.
- **Tarea 7 – Diagnóstico:** `ProductCard`, `EscalationAlert` (con “Copiar resumen para el arquitecto”), `PackageCard`, `MissingInfoPanel` (avance del levantamiento), `FactsPanel`, `app/diagnosis/page.jsx`. Se puede agregar o quitar productos del catálogo.
- **Tareas 8 y 9 – Minuta y Word:** `MinuteHeader`, `MinuteSections`, `TaskTable`, `PendingItemsList`, `EditableList`; confirmación con checklist antes de exportar; descarga con `lib/descargarWord.js`.
- **Tarea 10 – Propuesta:** `ProposalSummary`, `ProductTable`, `CommercialTerms` (plazo 12/24/36), aviso prominente de no ser cotización oficial, Word.
- **Tarea 11 – Pruebas:** `tests/commercialRules.test.mjs` (`npm test`, 19 pruebas), Dashboard con los **10** casos del catálogo, indicador del encabezado según `analysisSource`, README actualizado.

Archivos nuevos de soporte: `lib/commercialRules.js`, `lib/demoAnalysis.js`, `lib/formatters.js`, `lib/useCatalogo.js`, `lib/descargarWord.js`, `components/meeting/StepProgress.jsx`, `components/meeting/NoActiveMeeting.jsx`, `styles/pages.module.css`.

`MeetingContext.jsx` **no se modificó**; los datos nuevos se guardan con `setMeeting()`: `quantities`, `lineParams`, `facts`, `detectedFacts`, `answeredQuestions`, `contractTerm`, `proposalGeneratedAt`, `proposalExportedAt`, `minutesExportedAt`.

## 3. Qué se verificó

| Prueba | Resultado |
|---|---|
| `npm run build` (con lint) | ✅ 0 errores, 0 advertencias |
| `npm test` — 10 casos del catálogo + aritmética + demo | ✅ 19/19 |
| Recorrido en navegador (Playwright, modo demo): Dashboard → caso → Copiloto → Diagnóstico → Minuta → Word → Propuesta → Word | ✅ sin errores en consola |
| Clasificación en navegador | Clínica Dental **Estándar**, Seguros Confianza **A la medida** (ESC-08), PagoFácil **Mixto** (CNBV) |
| Errores de API: tipo inválido, JSON inválido, transcripción corta, audio vacío, formato inválido, Groq sin clave | ✅ 400 con mensaje claro / `source: "demo"` |
| Word de minuta y de propuesta | ✅ abren en LibreOffice y python-docx; **falta abrirlos en Microsoft Word** |
| Gemini y Groq con claves reales | ❌ **sin probar** (no hay claves en esta sesión) |

## 4. Supuestos que el catálogo no aclara (confírmenlos con los organizadores)

1. **Descuentos:** plazo, paquete y volumen M365 se **suman**; si pasan de 10 % se marca “requiere autorización del gerente”. Si el tope de 10 % es solo para descuentos discrecionales del vendedor, cambien `descuentoMaximoVendedorPct` en `lib/commercialRules.js`.
2. **Cargo único:** una vez por contrato en productos cobrados por usuario/servidor/TB/equipo; por unidad en productos “por mes” (racks, paquetes de nube).
3. **ESC-04 (regulatorio):** escala la solución, pero no bloquea las líneas estándar (por eso PagoFácil es “mixto”, como dice el caso).

## 5. Para quien continúe

- Configurar `.env.local` con un `GEMINI_MODEL` vigente y probar `/api/analysis` y `/api/minutes` con claves reales.
- Abrir los dos `.docx` en Microsoft Word.
- `npm test` debe seguir en verde después de cualquier cambio a precios o reglas.

---

# Cambios — Pruebas end-to-end con APIs reales (instrucciones.txt)

| # | Tarea | Qué se hizo |
|---|---|---|
| 1 | Nombres de variables | El código espera exactamente `GEMINI_API_KEY`, `GROQ_API_KEY` y `GEMINI_MODEL` (opcional). Coinciden con lo que tienen. El síntoma “API key no configurada” significa que el **servidor** no las está leyendo: `.env.local` fuera de `alestra-sales-copilot/`, guardado como `.env.local.txt`, o `npm run dev` sin reiniciar. |
| 2 | Claves solo en servidor | Auditado: `process.env` solo aparece en `services/groqService.js` y `services/geminiService.js`. Sin `NEXT_PUBLIC_` ni claves en el código. Nuevo `GET /api/status` informa si están cargadas **sin mostrarlas**; con `?probar=1` hace una llamada mínima a cada servicio. |
| 3 | Modo demostración | Cada ruta intenta la API real; ante cualquier error responde `source:"demo"` con `fallbackCode`/`errorCode`. Se desactiva solo cuando la llamada real funciona. Flujo documentado en `GUIA-PRUEBAS.md`. |
| 4 | Audio de 0.04 MB | A 32 kbps, 0.04 MB ≈ 10 s: el tamaño era coherente. Se corrigió que las pistas del micrófono se cerraban antes del último fragmento (ahora se liberan en `onstop`). Se agregó medidor de nivel, selector de micrófono, duración, tamaño, reproductor del segmento y bloqueo de grabaciones de < 1 s o en silencio. |
| 5 | Conversación real | Se quitó el botón que insertaba el texto [DEMO] de Aceros del Valle; si una reunión guardada lo tenía, se descarta. La transcripción de Groq se agrega como `Cliente: …` y el cuadro sigue siendo editable. |
| 6 | Cada reunión con su registro | “Nueva Reunión” abre un formulario en blanco y siempre crea una reunión nueva (antes editaba la activa). Editar = `/meeting?editar=1`. `MeetingContext` guarda un historial (máx. 20); el Dashboard lista “Reuniones anteriores” para reabrir o eliminar. |
| 7 | Logs y errores visibles | Terminal: `[transcription]`, `[analysis]`, `[minutes]`, `[documents]`, `[status]` con tamaños, tiempos, modelo y código de error (nunca claves ni el texto de la conversación). Navegador: `[grabación]`, `[análisis]`, `[minuta]`. UI: mensajes por código (`API_KEY_MISSING`, `API_KEY_INVALID`, `QUOTA_EXCEEDED`, `MODEL_NOT_FOUND`, audio vacío, silencio, permiso denegado) y panel **Integraciones** con “Probar conexión”. |
| 8 | Guía de pruebas | `GUIA-PRUEBAS.md`. |

Archivos nuevos: `app/api/status/route.js`, `components/copilot/IntegrationStatus.jsx`, `lib/integrationErrors.js`, `lib/serverLog.js`, `GUIA-PRUEBAS.md`.
Modificados: `components/copilot/AudioRecorder.jsx`, `app/copilot/page.jsx`, `app/minutes/page.jsx`, `app/meeting/page.jsx`, `app/page.jsx`, `components/meeting/MeetingForm.jsx`, `components/meeting/StepProgress.jsx`, `context/MeetingContext.jsx` (historial), rutas `transcription`, `analysis`, `minutes`, `documents` (logs y `fallbackCode`).

**Verificado** con micrófono simulado de Chromium y servidores que imitan Groq y Gemini:
- **Sin claves:** errores claros y modo demo.
- **Con claves válidas:** audio de 3.3 s → transcripción en el cuadro → “Analizado con Gemini” → minuta Gemini → propuesta → Word.
- **Con clave inválida:** `API_KEY_INVALID` en UI y terminal.

**Falta** la prueba con las claves y servicios reales de ustedes.
