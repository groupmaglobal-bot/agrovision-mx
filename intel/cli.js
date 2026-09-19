#!/usr/bin/env node
/* =========================================================================
   AGROVISION INTELLIGENCE — CLI
   npm run intel -- <comando> [opciones]

   daily                 06:00  Búsqueda en todos los feeds + recalcular
   trends                12:00  Recalcular tendencias
   summary               18:00  Resumen diario (output/<fecha>/resumen-diario.md)
   weekly                DOM    AGROVISION WEEKLY (output/<fecha>/agrovision-weekly-NNN.md)
   search "<tema>"              Búsqueda ad hoc (Google News ES + EN) y guardado
   import <archivo.json>        Importa investigación estructurada
   recompute                    Re-clasifica, verifica, puntúa y detecta tendencias
   rebuild                      Reconstruye los ítems importados desde intel/inbox/*.json + recompute
   generate <id> [tipos]        Genera newsletter/instagram/linkedin/article/reel (.md)
   top [n]                      Lista los n ítems publicables con más potencial
   export <json|csv|md> [out]   Exporta los ítems únicos
   sources:check                Prueba cada feed configurado

   Opciones: --fetch (descarga cada página para verificar la URL y extraer texto)
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import * as pl from './lib/pipeline.js';

const [cmd, ...args] = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const pos = args.filter((a) => !a.startsWith('--'));
const now = process.env.INTEL_NOW ? new Date(process.env.INTEL_NOW).getTime() : Date.now();
const today = new Date(now).toISOString().slice(0, 10);
const db = pl.loadDB();
const log = console.log;
const run = (type, extra = {}) => db.runs.push({ id: `${type}-${new Date(now).toISOString()}`, type, at: new Date().toISOString(), ...extra });
const out = (f, s) => { const p = path.join(pl.INTEL, 'output', today, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); log('  → ' + path.relative(process.cwd(), p)); };

async function main() {
  switch (cmd) {
    case 'daily': {
      log('AGROVISION INTELLIGENCE · búsqueda diaria');
      const { results, status } = await pl.searchSources({ log });
      const r = await pl.ingestRaw(db, results, { fetchPages: flags.has('--fetch'), now, log });
      const c = pl.recompute(db, { now });
      run('daily', { ...r, feeds_ok: status.filter((s) => s.ok).length, feeds_failed: status.filter((s) => !s.ok).length, duplicates: c.duplicates });
      break;
    }
    case 'search': {
      const q = pos.join(' ');
      if (!q) throw new Error('Uso: search "<tema>"');
      log(`Buscando: ${q}`);
      const { results } = await pl.searchSources({ query: q, log });
      const r = await pl.ingestRaw(db, results, { fetchPages: flags.has('--fetch'), now, log });
      pl.recompute(db, { now });
      run('search', { query: q, ...r });
      break;
    }
    case 'import': {
      if (!pos.length) throw new Error('Uso: import <archivo.json> [...]');
      for (const f of pos) pl.importItems(db, path.resolve(f), { now, via: flags.has('--claude') ? 'claude-websearch' : 'manual', log });
      const c = pl.recompute(db, { now });
      run('import', { files: pos.map((f) => path.basename(f)), duplicates: c.duplicates });
      break;
    }
    case 'rebuild': {
      const dir = path.join(pl.INTEL, 'inbox');
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
      for (const f of files) pl.importItems(db, path.join(dir, f), { now, via: 'inbox', log });
      const c = pl.recompute(db, { now });
      run('rebuild', { files: files.length, duplicates: c.duplicates });
      break;
    }
    case 'recompute': { const c = pl.recompute(db, { now }); run('recompute', c); log(`  Duplicados: ${c.duplicates}`); break; }
    case 'trends': {
      pl.recompute(db, { now });
      run('trends', { top: db.trends.slice(0, 5).map((t) => t.id) });
      db.trends.slice(0, 8).forEach((t) => log(`  ${String(t.score).padStart(3)}  ${t.label} (${t.mentions}, ${t.direction})`));
      break;
    }
    case 'summary': { pl.recompute(db, { now }); out('resumen-diario.md', pl.dailySummary(db, { now })); run('summary'); break; }
    case 'weekly': { pl.recompute(db, { now }); const w = pl.writeWeekly(db, { now }); log(`  → ${path.relative(process.cwd(), w.file)}`); run('weekly', { issue: w.issue }); break; }
    case 'generate': {
      const [id, ...types] = pos;
      const files = pl.generateToFiles(db, id, types.length ? types : undefined, { date: today });
      files.forEach((f) => log('  → intel/' + f));
      run('generate', { id, files: files.length });
      break;
    }
    case 'top': {
      const n = +pos[0] || 10;
      db.articles.filter((a) => a.publishable).sort((a, b) => b.priority - a.priority).slice(0, n)
        .forEach((a) => log(`${String(a.score).padStart(3)} ${String(a.priority).padStart(4)}  ${a.evidence.padEnd(5)} ${a.category.padEnd(8)} ${a.id}  ${a.title_agrovision || a.title_original}`));
      return; // sin cambios en db
    }
    case 'export': {
      const fmt = pos[0] || 'json';
      const items = db.articles.filter((a) => !a.duplicate_of);
      const s = pl.exportItems(items, fmt);
      const f = pos[1] || path.join(pl.INTEL, 'output', today, `agrovision-intel.${fmt}`);
      fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); log('  → ' + f);
      return;
    }
    case 'sources:check': {
      const { status } = await pl.searchSources({ log });
      db.feed_status = status.map((s) => ({ ...s, checked_at: new Date().toISOString() }));
      break;
    }
    default:
      log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(2, 21).join('\n').replace(/^ {3}/gm, ''));
      return;
  }
  pl.saveDB(db);
  log(`  db.json · ${db.articles.length} ítems · ${db.trends.length} tendencias`);
}
main().catch((e) => { console.error('✗ ' + (e.message || e)); process.exit(1); });
