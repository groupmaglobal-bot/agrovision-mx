/* Conector de importación manual: un arreglo JSON de ítems con el esquema
   de intel/README.md (sección "Formato de importación"). Sirve para cargar
   investigación hecha a mano, por Claude o por otra herramienta. */
import fs from 'node:fs';

const REQUIRED = ['title_original', 'url'];
export function readImportFile(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const arr = Array.isArray(data) ? data : data.items;
  if (!Array.isArray(arr)) throw new Error(`${file}: se esperaba un arreglo de ítems`);
  const errors = [];
  arr.forEach((x, i) => {
    for (const k of REQUIRED) if (!x[k]) errors.push(`${file}[${i}]: falta "${k}"`);
    if (x.url && !/^https?:\/\//.test(x.url)) errors.push(`${file}[${i}]: URL inválida`);
    for (const m of x.metrics || []) if (typeof m.value !== 'number') errors.push(`${file}[${i}]: métrica "${m.metric}" sin valor numérico`);
  });
  return { items: arr, errors };
}
