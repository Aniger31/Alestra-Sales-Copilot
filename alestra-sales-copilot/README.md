# Alestra Sales Copilot

Asistente comercial con inteligencia artificial para ejecutivos de ventas B2B.
Desarrollado para el Hackathon Alestra.

> **Aviso:** Este es un prototipo académico desarrollado para demostración.
> No representa productos, precios ni condiciones oficiales de Alestra.

---

## Equipo

- **Chelsea Sánchez Rincón** — Frontend e interfaz de usuario
- **Fernanda Acosta Ramirez** — Integraciones de IA (Gemini y Groq)
- **Regina Hernández Rodríguez** — Catálogo, documentos y reglas comerciales

---

## Tecnologías

| Componente | Tecnología |
|---|---|
| Framework | Next.js 15 con App Router |
| Frontend | React 19 |
| Lenguaje | JavaScript |
| Estilos | CSS Modules |
| Transcripción | Groq Whisper API |
| Análisis IA | Google Gemini API |
| Generación Word | docx (npm) |
| Catálogo | JSON local |

---

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior

---

## Instalación

```bash
# 1. Entrar al directorio del proyecto
cd alestra-sales-copilot

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env.local
```

Editar `.env.local` y configurar las claves:

```dotenv
GEMINI_API_KEY=AIza...tu_clave_aqui
GEMINI_MODEL=gemini-3.5-flash-lite   # verifica el modelo disponible en AI Studio
GROQ_API_KEY=gsk_...tu_clave_aqui
```

---

## Obtener las API Keys (sin costo)

### Gemini API Key

1. Ir a [https://aistudio.google.com](https://aistudio.google.com)
2. Iniciar sesión con cuenta de Google personal
3. Clic en **"Get API Key"** → **"Create API key in new project"**
4. Copiar la clave generada
5. **No activar facturación** — la cuota gratuita es suficiente para la demo

> **Importante:** `gemini-1.5-flash` se apagó el 29-sep-2025 y `gemini-2.0-flash` el 1-jun-2026 ([changelog de Gemini](https://ai.google.dev/gemini-api/docs/changelog)). Usa un modelo vigente de la familia 3.x Flash que aparezca en tu cuenta de AI Studio y revisa ahí mismo los límites del nivel gratuito.

### Groq API Key

1. Ir a [https://console.groq.com](https://console.groq.com)
2. Registrarse (no requiere tarjeta de crédito)
3. Ir a **"API Keys"** → **"Create API Key"**
4. Copiar la clave generada

Revisa los límites del nivel gratuito en la consola de Groq (modelo `whisper-large-v3`).

---

## Ejecución

```bash
npm run dev      # http://localhost:3000
npm test         # 19 pruebas de reglas comerciales con los 10 casos del catálogo
```

Sin `.env.local` la app funciona completa en **modo demostración** y lo indica en cada resultado.

> **`.env.local` va en esta carpeta (junto a `package.json`)** y Next.js solo lo lee al arrancar: reinicia `npm run dev` después de editarlo.
> Verifica lo que ve el servidor en `http://localhost:3000/api/status?probar=1` o en **Copiloto → Integraciones → Probar conexión**.
> Guía paso a paso de pruebas con APIs reales: [`GUIA-PRUEBAS.md`](./GUIA-PRUEBAS.md).

Abrir: [http://localhost:3000](http://localhost:3000)

---

## Arquitectura

```
src/
├── app/                    # Next.js App Router — páginas y API routes
│   ├── page.jsx            # Dashboard
│   ├── meeting/            # Registro de reunión
│   ├── copilot/            # Grabación y transcripción
│   ├── diagnosis/          # Diagnóstico y catálogo
│   ├── minutes/            # Minuta editable
│   ├── proposal/           # Propuesta comercial
│   └── api/                # Route Handlers (servidor)
├── components/             # Componentes React por sección
├── context/                # MeetingContext (estado global)
├── services/               # Integraciones Groq, Gemini, Catálogo, Documentos
├── lib/                    # Utilidades, validaciones, constantes, datos mock
├── data/                   # catalog.json (catálogo simulado del hackathon)
└── styles/                 # CSS Modules globales
```

---

## Flujo principal del MVP

**Registrar reunión → Grabar / Transcribir → Revisar → Analizar → Diagnosticar → Generar minuta → Exportar Word → Propuesta → Exportar Word**

| Pantalla | Qué hace |
|---|---|
| `/` Dashboard | Reunión activa y los 10 casos de ejemplo del catálogo |
| `/meeting` | Datos del cliente |
| `/copilot` | Grabación (Groq Whisper, segmentos de 10 min), conversación editable con formato `Cliente:` / `Vendedor:`, análisis |
| `/diagnosis` | Productos con cantidades, tipo de oportunidad, reglas de escalamiento ESC-01…ESC-10, paquetes, preguntas pendientes y hechos del cliente |
| `/minutes` | Minuta editable, tareas con “⚠ Sin confirmar”, confirmación y Word |
| `/proposal` | Precios del catálogo, descuentos por plazo/paquete/volumen, IVA, vigencia y Word |

**Regla de oro:** la IA solo propone SKUs (validados contra el catálogo). Precios, descuentos, IVA, clasificación y escalamiento los calcula `src/lib/commercialRules.js`. El Word de la propuesta se recalcula en el servidor.

---

## Modo demostración

Si las API keys no están configuradas o se agota la cuota gratuita, la aplicación activa automáticamente el **modo demostración**:

- **Análisis:** busca por palabras en el catálogo real a partir de la conversación (ya no devuelve siempre el mismo caso).
- **Minuta:** se arma con el análisis de esa reunión, sin inventar responsables ni fechas.
- **Transcripción:** no se mezcla el texto de ejemplo con otra reunión; el vendedor decide si lo usa.

El modo demostración se identifica con un banner visible en la interfaz:

> ⚠ MODO DEMOSTRACIÓN — Los datos mostrados son ficticios y no provienen de una API real.

Los datos de demo y los resultados reales de las APIs **nunca se mezclan ni presentan como equivalentes**.

---

## Catálogo

El catálogo simulado del hackathon se encuentra en `src/data/catalog.json`.

Contiene:
- 45 productos en 7 familias (Data Center, Microsoft 365, Backup, AWS, Azure, OCI, IA)
- 7 paquetes con descuentos
- 10 reglas de escalamiento a arquitecto
- 11 condiciones comerciales
- 10 casos ficticios de clientes para pruebas

---

## Límites de las APIs gratuitas

| API | Límite gratuito | Acción si se agota |
|---|---|---|
| Gemini (modelo en `GEMINI_MODEL`) | Ver AI Studio | Activar modo demo |
| Groq Whisper | Ver consola de Groq | Activar modo demo (el texto escrito se conserva) |

---

## Seguridad

- Las claves API **nunca** se envían al navegador
- No usar el prefijo `NEXT_PUBLIC_` para secretos
- El archivo `.env.local` está excluido del repositorio por `.gitignore`
- Las grabaciones de audio no se almacenan permanentemente
- El catálogo se lee únicamente en el servidor

---

## Problemas conocidos

1. **MediaRecorder en Safari iOS** — puede no estar disponible. Usar entrada manual de texto como alternativa.
2. **Archivos de audio mayores a 24 MB** — el sistema informa el error y solicita una grabación más corta.
3. **JSON malformado de Gemini** — el parser robusto extrae el JSON del texto; si falla, se muestra error descriptivo y se permite continuar.
4. **Sin autenticación de usuarios** — apropiado para prototipo de hackathon; no usar con datos reales de clientes.
5. **Integraciones reales sin probar** — Gemini y Groq no se han probado con claves reales; el modo demo y todos los errores sí.
6. **Supuestos comerciales** — el catálogo no aclara si los descuentos se suman ni cómo se cobra el cargo único por unidad; ver `CAMBIOS.md`.
7. **Una reunión activa a la vez** — `MeetingContext` guarda solo la reunión en curso (cargar otro caso la reemplaza).

---

## Scripts disponibles

```bash
npm run dev      # Desarrollo local
npm run build    # Build de producción
npm run start    # Iniciar servidor de producción
npm run lint     # Verificar código
npm test         # Pruebas de reglas comerciales (Node 22+)
```

---

## Aviso legal

Los datos del catálogo son **ficticios** y fueron proporcionados exclusivamente para el Hackathon Alestra.
No representan productos, precios ni condiciones reales de Alestra.
Este prototipo no debe utilizarse para generar cotizaciones oficiales.
