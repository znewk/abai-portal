// Данные подбора ГНО (ABAI ПГНО, процесс Д6): заявка из экземпляра процесса, варианты насосов, напорная характеристика.
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceDot, ReferenceLine } from 'recharts';
import { Box } from '@mui/material';
import { ALERTS, WELLS } from '../../data/core.js';
import { rng, pick, fmt } from '../../lib/format.js';
import { C } from '../../theme.js';

export const STAGES = [['6.1', 'Заявка на подбор'], ['6.4а', 'Сбор исходных данных'], ['6.11', 'Дизайн подрядчика'], ['6.7', 'Экспертиза ДТРС, ДТТД, КФК'], ['6.9', 'Решение по подбору']];
export const SHORT = ['Заявка', 'Исходные данные', 'Дизайн', 'Экспертиза', 'Решение принято'];
export const stTone = (i) => (i >= 4 ? 'good' : i === 3 ? 'warn' : i === 0 ? 'info' : '');
// Этап заявки по активным шагам экземпляра
export function stageOf(run) {
  if (run.status === 'done') return 4;
  const codes = run.active.map((a) => run.P.s[a.i].c || '');
  const has = (re) => codes.some((c) => re.test(c));
  if (has(/^6\.(9|15|16|17|18|19|20)/)) return 4;
  if (has(/^6\.(7|8)/)) return 3;
  if (has(/^6\.1[012]$/)) return 2;
  if (has(/^6\.(4|5|6|13|14)/)) return 1;
  return 0;
}
// Параметры заявки по скважине (детерминированно)
export function reqParams(w) {
  const r = rng('db2-gno-' + w.id);
  const al = ALERTS.find((a) => a.well === w.id && a.st !== 'Устранено');
  const reason = w.status === 'repair' ? 'Отказ ГНО' : al && al.kind === 'esp' ? 'Срыв подачи ЭЦН' : w.risk > 60 ? 'Рост риска отказа' : w.method === 'ШГН' && w.qL > 60 ? 'Перевод на ЭЦН' : 'Оптимизация режима';
  return { reason, gas: Math.round(38 + r() * 50), compl: [pick(r, ['АСПО', 'Солеотложения', 'Вынос песка', 'Высокий газовый фактор']), r() < 0.4 ? pick(r, ['Коррозия', 'Эмульсия']) : null].filter(Boolean), pInt: Math.round(28 + r() * 22), tPl: Math.round(58 + r() * 12) };
}
// Заявка из экземпляра Д6
export function reqFromRun(run) {
  const w = run.obj.well || WELLS[0];
  return { id: run.num || run.id, run, w, stage: stageOf(run), created: run.started, prio: run.late || w.risk > 60 || w.status === 'repair' ? 'Высокий' : 'Обычный', ...reqParams(w) };
}
// Дополнительные заявки для очереди (без экземпляра): скважины с наибольшим риском
export function extraReqs(exclude, n = 6) {
  const pool = WELLS.filter((w) => w.type === 'prod' && w.status === 'work' && (w.method === 'ЭЦН' || w.method === 'ШГН') && !exclude.includes(w.id)).sort((a, b) => b.risk - a.risk).slice(0, n);
  return pool.map((w, i) => { const r = rng('xreq' + w.id); return { id: 'ЗП-' + (3221 + i * 7), run: null, w, stage: [1, 0, 2, 4, 1, 0][i % 6], created: new Date(Date.UTC(2026, 9, 10 + Math.floor(r() * 20))), prio: w.risk > 60 ? 'Высокий' : 'Обычный', ...reqParams(w) }; });
}

// Три типоразмера ЭЦН под целевую подачу и требуемый напор
export function pumpsFor(q) {
  const w = q.w; const k = q.reason === 'ГТМ: после ГРП' ? 1.35 : q.reason === 'Оптимизация режима' ? 1.15 : 1.05;
  const qt = Math.round(Math.max(30, (w.qL || 40) * k)); const hreq = Math.round((w.hDyn || 900) + 320 + (q.pInt * 10) / 2);
  const noms = [45, 60, 80, 125, 160, 200];
  let j = noms.findIndex((x) => x >= qt * 0.92); if (j < 0) j = noms.length - 1; j = Math.max(1, Math.min(noms.length - 2, j));
  const r = rng('db2-pump-' + q.id);
  return [noms[j - 1], noms[j], noms[j + 1]].map((qn, i) => {
    const hn = Math.round((hreq * (1 + (i - 1) * -0.06)) / 50) * 50; const eff = +(i === 1 ? 58 + r() * 4 : 47 + r() * 6).toFixed(1);
    const qw = Math.min(qt, qn * 1.35); const kw = (1000 * 9.81 * (qw / 86400) * hreq) / (eff / 100) / 1000 / 0.82;
    return { id: i, name: `ЭЦН5${qn >= 125 ? 'А' : ''}-${qn}-${hn}`, qn, hn, eff, kw: +kw.toFixed(1), kwh: Math.round(kw * 24), mtbf: Math.round((i === 1 ? 620 : 430) + r() * 120), rec: i === 1, fit: i === 1 ? 'в рабочей зоне' : i === 0 ? 'правая граница зоны, перегрев' : 'левая граница зоны, износ', qt, hreq };
  });
}
export const hOp = (pumps) => { const p = pumps.find((x) => x.rec); return Math.round((p.hn / (1 - Math.pow(1 / 1.6, 2))) * (1 - Math.pow(p.qt / (p.qn * 1.6), 2))); };

// Напорные характеристики насосов, характеристика скважины и рабочая точка
export function HeadChart({ pumps, height = 300 }) {
  const qt = pumps[0].qt; const hop = hOp(pumps); const qmax = Math.round((Math.max(...pumps.map((p) => p.qn)) * 1.7) / 10) * 10;
  const qs = Array.from({ length: 41 }, (_, i) => Math.round((i * qmax) / 40));
  const hst = hop * 0.72; const ks = (hop - hst) / (qt * qt);
  const data = qs.map((q) => {
    const row = { q };
    pumps.forEach((p, i) => { const H0 = p.hn / (1 - Math.pow(1 / 1.6, 2)); const Qm = p.qn * 1.6; row['p' + i] = q > Qm ? null : Math.round(H0 * (1 - Math.pow(q / Qm, 2))); });
    const hs = hst + ks * q * q; row.sys = hs > hop * 1.6 ? null : Math.round(hs);
    return row;
  });
  const cols = [C.s[0], C.s[1], C.s[2]];
  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="q" type="number" domain={[0, qmax]} tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={{ stroke: '#d5d9e0' }} />
          <YAxis tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} width={58} tickFormatter={(v) => fmt(v)} domain={[0, (mx) => Math.ceil((mx * 1.08) / 500) * 500]} tickCount={6} allowDecimals={false} />
          <Tooltip formatter={(v) => (v == null ? '—' : fmt(v) + ' м')} labelFormatter={(q) => `Подача ${fmt(q)} м³/сут`} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e3e7ee' }} />
          <Legend verticalAlign="top" align="left" iconSize={10} itemSorter={(it) => ['p0', 'p1', 'p2', 'sys'].indexOf(it.dataKey)} wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} formatter={(v) => <span style={{ color: C.ink2 }}>{v}</span>} />
          {pumps.map((p, i) => <Line key={i} dataKey={'p' + i} name={p.name} stroke={cols[i]} strokeWidth={p.rec ? 2.6 : 1.8} dot={false} isAnimationActive={false} connectNulls={false} />)}
          <Line dataKey="sys" name="Характеристика скважины" stroke={C.s[3]} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} legendType="plainline" />
          <ReferenceLine x={qt} stroke={C.ink2} strokeDasharray="3 3" />
          <ReferenceDot x={qt} y={hop} r={6} fill="#16191f" stroke="#fff" strokeWidth={2} label={{ value: `${fmt(qt)} м³/сут · ${fmt(hop)} м`, position: 'right', fontSize: 11, fill: '#16191f', fontWeight: 600 }} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
