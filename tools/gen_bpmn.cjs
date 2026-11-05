// Генератор src/data/bpmn.js: процессы и шаги Dream TO BE из abai-mockup (shared/landscape-trail.js + PROC_META модулей + bpmn-data.js).
// Запуск из корня abai-portal: node tools/gen_bpmn.cjs
// Поля шага: c код, t название, r исполнитель (дорожка), s системы, d документы, pv / nx шаги до / после ([индекс, подпись ветки] или [событие]),
//   n аннотации BPMN, gx тип развилки после шага (x исключающая, p параллельная, i включающая), gq вопрос развилки, gj тип слияния перед шагом.
const fs = require('fs');
const path = require('path');
const SRC = path.resolve(__dirname, '../../abai-mockup');
const load = (f, name) => { const s = fs.readFileSync(path.join(SRC, f), 'utf8'); return new Function(s.replace(/\bconst (\w+) =/g, 'var $1 =') + `;return ${name};`)(); };
const grab = (f) => { const s = fs.readFileSync(path.join(SRC, f), 'utf8'); const i = s.indexOf('PROC_META'); const a = s.indexOf('{', i); let d = 0, j = a; for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}' && !--d) break; } return new Function('return ' + s.slice(a, j + 1))(); };
const trail = load('shared/landscape-trail.js', 'LS_TRAIL').dream;
const meta = { geologiya: grab('geologiya/js/config.js'), razrabotka: grab('razrabotka/js/config.js'), burenie: grab('burenie/js/config.js'), dobycha: grab('dobycha/js/model.js') };
const data = { geologiya: load('geologiya/js/bpmn-data.js', 'BPMN'), razrabotka: load('razrabotka/js/bpmn-data.js', 'BPMN'), burenie: load('burenie/js/bpmn-data.js', 'BPMN'), dobycha: load('dobycha/js/bpmn-data.js', 'BPMN') };
const SHORT_FIX = { 'Мехфонд': 'Механизированный фонд' };
const GW = { exclusiveGateway: 'x', parallelGateway: 'p', inclusiveGateway: 'i', eventBasedGateway: 'x', complexGateway: 'i' };

// Пул Dream процесса: узлы и потоки
function poolOf(p) {
  const P = (data[p.m] || []).find((x) => x.num === p.n); if (!P) return null;
  return P.pools.find((x) => x.variant === 'dream') || null;
}
// Развилка после узла: первый шлюз по исходящим потокам
function splitAfter(pool, id, seen = new Set()) {
  const out = pool.flows.filter((f) => f.from === id);
  for (const f of out) {
    const n = pool.nodes.find((x) => x.id === f.to); if (!n || seen.has(n.id)) continue; seen.add(n.id);
    if (n.kind === 'gateway') { const nOut = pool.flows.filter((x) => x.from === n.id).length; if (nOut > 1) return { g: GW[n.type] || 'x', q: n.name || '' }; return splitAfter(pool, n.id, seen); }
  }
  return null;
}
// Слияние перед узлом: ближайший шлюз по входящим потокам с несколькими входами
function joinBefore(pool, id, seen = new Set()) {
  const inn = pool.flows.filter((f) => f.to === id);
  for (const f of inn) {
    const n = pool.nodes.find((x) => x.id === f.from); if (!n || seen.has(n.id)) continue; seen.add(n.id);
    if (n.kind === 'gateway') { const nIn = pool.flows.filter((x) => x.to === n.id).length; if (nIn > 1) return GW[n.type] || 'x'; return joinBefore(pool, n.id, seen); }
  }
  return null;
}

let gx = 0, gj = 0;
const out = trail.map((p) => {
  const m = (meta[p.m] || {})[p.n] || {}; const pool = poolOf(p);
  return {
    p: p.p, m: p.m, n: p.n, t: p.t,
    short: SHORT_FIX[m.short] || m.short || p.t, owner: m.owner || '', ws: m.ws || '', idea: m.idea || '',
    s: p.s.map((s) => {
      const o = { c: s.c, t: s.t, r: s.r, s: s.s, d: s.d, pv: s.pv, nx: s.nx };
      if (s.n && s.n.length) o.n = s.n;
      if (pool && s.id) {
        const sp = s.nx.length > 1 ? splitAfter(pool, s.id) : null; if (sp) { o.gx = sp.g; if (sp.q) o.gq = sp.q; gx++; }
        const jn = s.pv.filter((x) => typeof x[0] === 'number').length > 1 ? joinBefore(pool, s.id) : null; if (jn) { o.gj = jn; gj++; }
      }
      return o;
    }),
  };
});
const hdr = '// Сгенерировано tools/gen_bpmn.cjs из abai-mockup (BPMN Dream TO BE, архив TO BE). Не править вручную.\n';
fs.writeFileSync(path.join(__dirname, '../src/data/bpmn.js'), hdr + 'const BPMN = ' + JSON.stringify(out) + ';\nexport default BPMN;\n');
console.log('processes', out.length, 'steps', out.reduce((a, p) => a + p.s.length, 0), 'splits', gx, 'joins', gj);
