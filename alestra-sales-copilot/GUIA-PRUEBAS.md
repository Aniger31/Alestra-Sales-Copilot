# Guía de pruebas end-to-end con APIs reales

## 0. Qué espera la app (verificado en el código)

| Variable | Obligatoria | Dónde se lee |
|---|---|---|
| `GEMINI_API_KEY` | Sí, para análisis y minuta reales | `src/services/geminiService.js` (servidor) |
| `GROQ_API_KEY` | Sí, para transcripción real | `src/services/groqService.js` (servidor) |
| `GEMINI_MODEL` | Recomendada | `geminiService.js`; si falta usa `gemini-3.5-flash-lite` |

- Las claves solo se leen en el servidor (`src/services/*`, rutas `src/app/api/*`). No hay `NEXT_PUBLIC_` ni claves escritas en el código; `.env.local` está en `.gitignore`.
- **Modo demostración:** cada ruta API intenta la integración real; si falla (clave vacía o inválida, cuota, modelo inexistente, red) responde `source: "demo"` + `fallbackCode`/`errorCode`. La UI muestra el banner y el motivo. **Se desactiva solo cuando la llamada real funciona** (`source: "gemini"` / `"groq"`).

```
Grabar (MediaRecorder, webm/opus 32 kbps)
  → POST /api/transcription (FormData "audio")
      → groqService.transcribirAudio → Groq whisper-large-v3
      → { text, source: "groq" }  ó  { source: "demo", errorCode }
  → cuadro "Conversación" (editable)
  → POST /api/analysis { transcription, meetingData }
      → geminiService.analizarConversacion (Gemini)  → SKU validados contra catalog.json
      → reglas comerciales (escalamiento, tipo de oportunidad)
      → { analysis, products, escalation, facts, source: "gemini" }  ó  source: "demo" + fallbackCode
  → panel Análisis: preguntas, información faltante, productos
```

**Tamaño del audio:** a 32 kbps, 10 s ≈ 40 KB (0.04 MB) y 1 min ≈ 240 KB. Un archivo pequeño **no es error**: usa el medidor de nivel y el reproductor del último segmento para confirmar que hay voz.

## 1. Configurar y reiniciar el servidor (a)

1. Detén el servidor: en la terminal de `npm run dev`, `Ctrl + C`.
2. Crea o edita `.env.local` **en la carpeta `alestra-sales-copilot/`** (la misma donde está `package.json`, no en `HackClaude/`):
   ```dotenv
   GEMINI_API_KEY=tu_clave_de_ai_studio
   GROQ_API_KEY=tu_clave_de_groq
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
   - Sin comillas ni espacios extra. En Windows, revisa que no se haya guardado como `.env.local.txt` (en el Explorador: Vista → Extensiones de nombre de archivo).
   - Usa en `GEMINI_MODEL` un modelo que aparezca en tu AI Studio. `gemini-1.5-flash` ya no existe.
3. Arranca de nuevo: `npm run dev`. Next.js **solo lee `.env.local` al iniciar**.
4. Abre `http://localhost:3000/api/status?probar=1`. Debes ver `"configurada": true` y `"prueba": { "ok": true }` en `gemini` y `groq`. Si no:
   - `existeEnvLocal: false` → el archivo está en otra carpeta o con otro nombre.
   - `API_KEY_MISSING` → nombre de variable mal escrito o no reiniciaste.
   - `API_KEY_INVALID` → regenera la clave.
   - `MODEL_NOT_FOUND` → cambia `GEMINI_MODEL`.
   - `QUOTA_EXCEEDED` → espera un momento.

   En la terminal verás una línea `[status] gemini=sí (...) groq=sí .env.local=sí · prueba gemini=true groq=true`.

## 2. Crear una reunión nueva (b)

1. Menú lateral → **Nueva Reunión**. El formulario debe estar **vacío** (ya no se precarga la Clínica Dental).
2. Llena Empresa, Industria y Fecha (obligatorios). Opcional: contacto, ciudad, empleados y el mensaje inicial del cliente.
3. **Guardar y continuar →** crea un registro nuevo y abre el Copiloto. La reunión anterior pasa a **Dashboard → Reuniones anteriores**, desde donde se puede reabrir.
4. Para corregir los datos de la reunión actual usa el paso **Reunión** de la barra de pasos (abre `/meeting?editar=1`).

## 3. Grabar y confirmar la transcripción (c)

1. En **Copiloto → Integraciones**, pulsa **Probar conexión**: ambos deben decir **Conectado**.
2. Si tienes varios micrófonos, elige el correcto en **Micrófono**.
3. **● Grabar** → acepta el permiso del navegador → habla 10–20 s. El medidor debe ponerse verde (“Se escucha voz”).
4. **■ Detener**. Debe aparecer:
   - “Último segmento: duración · tamaño · nivel máx.” y un reproductor: escúchalo para confirmar que se grabó tu voz.
   - El texto en **Conversación** con la etiqueta **Groq Whisper**, precedido de `Cliente:`.
5. En la terminal: `[transcription] audio recibido: … KB` y `[transcription] Groq OK: N caracteres`.
6. Si falla, el mensaje rojo dice la causa (clave, cuota, audio vacío, silencio, permiso). En la consola del navegador (F12) verás `[grabación] …`.
7. Puedes editar el texto o añadir líneas con **+ Cliente** / **+ Vendedor**.

## 4. Verificar que el análisis ya no es DEMO (d)

1. **Analizar conversación**.
2. Debe verse la etiqueta **Analizado con Gemini** en el panel, la pastilla **GEMINI** (verde) arriba a la derecha y **ningún** banner “MODO DEMOSTRACIÓN”.
3. En la terminal: `[analysis] Gemini OK en … ms · N SKU sugeridos` (y, si Gemini propuso un SKU inexistente, `… descartado(s)`).
4. Si sale DEMO, el banner indica el motivo exacto (`API_KEY_INVALID`, `MODEL_NOT_FOUND`, `QUOTA_EXCEEDED`…) y la terminal muestra `✖ Gemini falló …`.

## 5. Diagnóstico → Minuta → Propuesta (e)

1. **Ver diagnóstico →**
   - Productos con SKU real, precio de lista y estado.
   - Escribe cantidades: el “Mensual estimado” y el tipo de oportunidad se recalculan.
   - Revisa la alerta de arquitecto (debe nombrar la regla ESC que aplica, o decir que no aplica ninguna) y confirma los **Hechos del cliente**.
   - Marca las preguntas respondidas: el % de levantamiento sube.
2. **Minuta** → **Generar minuta**.
   - Debe decir **Generada con Gemini**.
   - Responsables y fechas que no se dijeron aparecen como “⚠ Sin confirmar”.
   - **Confirmar y exportar Word** → marca la casilla → se descarga `Minuta-<empresa>-<fecha>.docx`. Ábrelo en Word.
3. **Propuesta**:
   - Precios del catálogo y aviso de “no es cotización oficial”.
   - Cambia el plazo (12/24/36): baja la mensualidad.
   - **Descargar Word** → `Propuesta-<empresa>-<fecha>.docx`: tabla con cantidades, descuentos, totales con IVA. Terminal: `[documents] propuesta-comercial.docx generado`.
4. **Dashboard**: la reunión activa es la nueva y las anteriores siguen en “Reuniones anteriores” con su propia transcripción.

## 6. Pruebas negativas rápidas

| Prueba | Resultado esperado |
|---|---|
| Quitar `GROQ_API_KEY` y reiniciar → grabar | Error rojo “el servidor no ve GROQ_API_KEY…”; el texto no se reemplaza |
| Clave Gemini incorrecta → analizar | Banner DEMO con “la clave fue rechazada…”; terminal `API_KEY_INVALID` |
| Grabar menos de 1 s | “La grabación duró menos de 1 segundo” (no se envía) |
| Micrófono silenciado | “No se detectó voz…” (no se envía; evita texto inventado por Whisper) |
| Bloquear el permiso del micrófono | Mensaje de permiso denegado y opción de escribir |

## Cómo se probó en el desarrollo

Con micrófono simulado de Chromium y servidores que imitan Groq y Gemini (`GROQ_BASE_URL` / `GOOGLE_GEMINI_BASE_URL`), se verificó:

- **Sin claves:** errores claros y modo demo.
- **Con claves válidas:** transcripción en el cuadro → “Analizado con Gemini” → minuta Gemini → propuesta → Word.
- **Con clave inválida:** `API_KEY_INVALID` en la UI y en la terminal.

Falta la prueba con las claves y servicios reales de ustedes, que es esta guía.
