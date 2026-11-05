// Общее для страниц ЦД добычи (часть 1): ряды актива, подразделения, ссылки, локальное состояние, водопад со сдвигом оси.
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Link, Box } from '@mui/material';
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';
import { PROD, ASSETS } from '../../data/core.js';
import { fmt, sgn } from '../../lib/format.js';
import { C } from '../../theme.js';

export const assetName = (asset) => (ASSETS.find((a) => a.id === asset) || ASSETS[1]).name;
export const assetK = (asset) => (asset === 'all' ? 1.52 : (ASSETS.find((a) => a.id === asset) || {}).k || 1);

// Ряды актива; для «Все ДЗО» — поэлементная сумма ОМГ и ЭМГ (сходится с таблицей по ДЗО)
export function seriesOf(asset) {
  if (asset !== 'all') return PROD[asset] || PROD.omg;
  const a = PROD.omg, b = PROD.emg; const add = (x, y) => x.map((v, i) => v + y[i]);
  return { plan: add(a.plan, b.plan), fact: add(a.fact, b.fact), fc: add(a.fc, b.fc), lo: add(a.lo, b.lo), hi: add(a.hi, b.hi), liq: add(a.liq, b.liq), gas: add(a.gas, b.gas), inj: add(a.inj, b.inj), wc: a.wc.map((v, i) => +((v * a.liq[i] + b.wc[i] * b.liq[i]) / (a.liq[i] + b.liq[i])).toFixed(1)) };
}
export const NGDU_SHARE = {
  omg: [['НГДУ-1', 0.31], ['НГДУ-2', 0.27], ['НГДУ-3', 0.24], ['НГДУ-4', 0.18]],
  emg: [['НГДУ «Жайыкмунайгаз»', 0.29], ['НГДУ «Жылыоймунайгаз»', 0.27], ['НГДУ «Доссормунайгаз»', 0.23], ['НГДУ «Кайнармунайгаз»', 0.21]],
};

export const ProcLink = ({ p }) => <Link component={RouterLink} to={'/proc/' + encodeURIComponent(p)} underline="hover">{p}</Link>;
export const WellLink = ({ id }) => <Link component={RouterLink} to={'/m/skv/wells/' + encodeURIComponent(id)} underline="hover" onClick={(e) => e.stopPropagation()} sx={{ fontWeight: 600 }}>{id}</Link>;

// Состояние страниц на время сеанса (сохраняется при переходах между разделами)
const STORE = { confirmed: {}, prof: 2, meas: {}, ast: {} };
export function useStore() {
  const [, set] = useState(0);
  return [STORE, () => set((x) => x + 1)];
}

// Водопад с началом шкалы base: items [{ l, v, total, fact }]
export function ShiftWaterfall({ items, base, unit, height = 300 }) {
  let acc = 0;
  const data = items.map((it) => {
    const from = it.total ? base : acc; const to = it.total ? it.v : acc + it.v; acc = to;
    return { x: it.l, _b: Math.min(from, to) - base, val: Math.abs(to - from), raw: it.v, total: it.total, fact: it.fact, to };
  });
  const top = Math.max(...data.map((d) => d.to)) - base;
  const col = (d) => (d.total ? (d.fact ? C.s[0] : '#6da7ec') : C.crit);
  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="x" interval={0} height={46} tickLine={false} axisLine={{ stroke: '#d5d9e0' }} tick={({ x, y, payload }) => {
            const w = payload.value.split(' '); const l1 = []; const l2 = []; w.forEach((s) => ((l1.join(' ') + ' ' + s).length < 18 && !l2.length ? l1.push(s) : l2.push(s)));
            return <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={C.muted}><tspan x={x}>{l1.join(' ')}</tspan><tspan x={x} dy={13}>{l2.join(' ')}</tspan></text>;
          }} />
          <YAxis width={58} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.muted }} domain={[0, Math.ceil((top * 1.04) / 100) * 100]} tickFormatter={(v) => fmt(v + base)} />
          <Tooltip cursor={{ fill: 'rgba(28,92,171,.06)' }} content={({ active, payload }) => {
            if (!active || !payload || !payload[0]) return null; const d = payload[0].payload;
            return <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', borderRadius: 2, px: 1.25, py: 1, fontSize: 12, boxShadow: '0 8px 24px rgba(16,24,40,.14)' }}><b>{d.x}</b><br />{d.total ? '' : sgn(d.raw) + ' → '}{fmt(d.to)} {unit}</Box>;
          }} />
          <Bar dataKey="_b" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="val" stackId="w" maxBarSize={52} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={col(d)} />)}
            <LabelList dataKey="raw" position="top" style={{ fontSize: 11, fontWeight: 600, fill: '#16191f' }} formatter={(v) => (v < 0 ? sgn(v) : fmt(v))} />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}

// Обводнённость по подразделениям: среднее по строкам равно показателю верхнего уровня (сводка сходится с KPI и карточкой)
export function fixMean(rows, target) {
  if (!rows.length) return rows; const n = rows.length; const d = target - rows.reduce((a, x) => a + x.wc, 0) / n;
  rows.forEach((x) => { x.wc = +(x.wc + d).toFixed(1); });
  const rest = rows.slice(1).reduce((a, x) => a + x.wc, 0); rows[0].wc = +(target * n - rest).toFixed(1);
  return rows;
}

// Колонка-число для DataTable
export const num = (field, headerName, d = 0, extra = {}) => ({ field, headerName, type: 'number', align: 'right', headerAlign: 'right', valueFormatter: (v) => (v == null ? '—' : fmt(v, d)), ...extra });
