'use client';
/**
 * descargarWord — Tarea 9. Pide el .docx a POST /api/documents y lo descarga con un <a> temporal.
 * @param {'minutes'|'proposal'} type
 * @param {object} data
 * @param {string} nombre — nombre del archivo
 */
export async function descargarWord(type, data, nombre) {
  const res = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  });
  if (!res.ok) {
    let msg = 'No se pudo generar el documento Word.';
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const nombreArchivo = (prefijo, empresa, fecha) =>
  `${prefijo}-${String(empresa || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${(fecha || new Date().toISOString()).slice(0, 10)}.docx`;
