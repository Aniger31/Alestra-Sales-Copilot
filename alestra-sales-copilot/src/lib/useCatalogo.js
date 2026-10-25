'use client';
/**
 * useCatalogo — obtiene el catálogo completo desde GET /api/catalog?section=todo.
 * El cliente nunca importa catalog.json directamente: catalogService sigue siendo
 * la única fuente de verdad. Se cachea en memoria durante la sesión del navegador.
 */
import { useEffect, useState } from 'react';

let cache = null;
let enCurso = null;

async function cargar() {
  if (cache) return cache;
  enCurso ??= fetch('/api/catalog?section=todo')
    .then(async (r) => {
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'No se pudo cargar el catálogo');
      cache = { ...json.data, disclaimer: json.disclaimer };
      return cache;
    })
    .finally(() => { enCurso = null; });
  return enCurso;
}

export function useCatalogo() {
  const [estado, setEstado] = useState({ catalogo: cache, cargando: !cache, error: '' });
  useEffect(() => {
    if (cache) return;
    let vivo = true;
    cargar()
      .then((c) => vivo && setEstado({ catalogo: c, cargando: false, error: '' }))
      .catch((e) => vivo && setEstado({ catalogo: null, cargando: false, error: e.message }));
    return () => { vivo = false; };
  }, []);
  return estado;
}

/** Arma las líneas de la propuesta a partir de lo guardado en MeetingContext. */
export function lineasDeReunion(meeting) {
  return (meeting.recommendedProducts ?? []).map((p) => ({
    sku: p.sku,
    cantidad: meeting.quantities?.[p.sku] ?? null,
    parametros: meeting.lineParams?.[p.sku] ?? {},
  }));
}

/** Hechos guardados: los confirmados por el vendedor tienen prioridad sobre los detectados. */
export function hechosDeReunion(meeting) {
  return { ...(meeting.detectedFacts ?? {}), ...(meeting.facts ?? {}) };
}
