// Обёртки Recharts в едином стиле: тренд с прогнозом и коридором, столбцы с планом, накопленные области, водопад, точки.
import { ResponsiveContainer, ComposedChart, LineChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea, ReferenceLine, Cell, ScatterChart, Scatter, ZAxis, LabelList } from 'recharts';
import { Box, Typography } from '@mui/material';
import { C } from '../theme.js';
import { fmt } from '../lib/format.js';

const AX = { tick: { fontSize: 11, fill: C.muted }, tickLine: false, axisLine: { stroke: '#d5d9e0' } };
const yFmt = (v) => (Math.abs(v) >= 1e6 ? fmt(v / 1e6, 1) + ' млн' : Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 2 }));

// Подсказка
function Tip({ active, payload, label, unit, dd = 0, fcFrom, labels }) {
  if (!active || !payload || !payload.length) return null;
  const rows = payload.filter((p) => p.value != null && p.dataKey !== '_base' && !(Array.isArray(p.value) && p.value[0] == null));
  const isFc = fcFrom != null && labels && labels.indexOf(label) >= labels.indexOf(fcFrom);
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', boxShadow: '0 8px 24px rgba(16,24,40,.14)', borderRadius: 2, px: 1.25, py: 1, fontSize: 12, minWidth: 160 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>{label}{isFc ? ' · прогноз' : ''}</Typography>
      {rows.map((p) => (
        <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', whiteSpace: 'nowrap' }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: p.color || p.stroke || p.fill, opacity: Array.isArray(p.value) ? 0.35 : 1 }} />
          {p.name}
          <Box component="b" sx={{ ml: 'auto', pl: 1.5, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{Array.isArray(p.value) ? `${fmt(p.value[0], dd)} – ${fmt(p.value[1], dd)}` : fmt(p.value, dd)}{unit ? ' ' + unit : ''}</Box>
        </Box>
      ))}
    </Box>
  );
}
const legendProps = { verticalAlign: 'top', align: 'left', iconSize: 10, formatter: (v) => <span style={{ color: C.ink2 }}>{v}</span>, wrapperStyle: { fontSize: 12, color: C.ink2, paddingLeft: 4, paddingBottom: 10, lineHeight: '18px' } };
// Порядок легенды — как у рядов (Recharts 3 по умолчанию сортирует по названию)
const lg = (keys) => ({ ...legendProps, itemSorter: (it) => { const i = keys.indexOf(it.dataKey); return i < 0 ? 99 : i; } });

// Тренд: data [{ x, k1, k2, lo, hi }], series [{ key, name, color, dash, area, width }], band { lo, hi, name, color }, fcFrom (x), marks [{ x, label }]
export function TrendChart({ data, series, band, fcFrom, fcLabel = 'Прогноз', marks = [], unit, dd = 0, height = 260, yDomain, legend = true, xInterval = 'preserveStartEnd' }) {
  const rows = band ? data.map((d) => ({ ...d, _band: d[band.lo] != null ? [d[band.lo], d[band.hi]] : null })) : data;
  const labels = data.map((d) => d.x);
  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="x" {...AX} interval={xInterval} minTickGap={28} />
          <YAxis {...AX} axisLine={false} width={58} tickFormatter={yFmt} domain={yDomain || ['auto', 'auto']} />
          <Tooltip content={<Tip unit={unit} dd={dd} fcFrom={fcFrom} labels={labels} />} />
          {legend && <Legend {...lg([...series.map((x) => x.key), '_band'])} />}
          {fcFrom != null && <ReferenceArea x1={fcFrom} x2={labels[labels.length - 1]} fill="#eef3fa" fillOpacity={0.9} label={{ value: fcLabel, position: 'insideTopLeft', fontSize: 11, fill: C.ink2, fontWeight: 600 }} />}
          {band && <Area dataKey="_band" name={band.name || 'Коридор прогноза'} stroke="none" fill={band.color || C.s[0]} fillOpacity={0.15} isAnimationActive={false} legendType="square" />}
          {series.map((s) => s.area
            ? <Area key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={s.width || 2} fill={s.color} fillOpacity={0.08} dot={false} isAnimationActive={false} connectNulls={false} />
            : <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={s.width || 2} strokeDasharray={s.dash ? '5 4' : undefined} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} connectNulls={false} legendType={s.dash ? 'plainline' : 'line'} />)}
          {marks.map((m) => <ReferenceLine key={m.x} x={m.x} stroke={C.ink2} strokeDasharray="3 3" label={{ value: m.label, position: 'insideBottomRight', fontSize: 11, fill: C.ink2 }} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}

// Столбцы: data [{ x, ... }], series [{ key, name, color }], plan { key, name } — линия плана, stacked, labels (значения над столбцами)
export function BarsChart({ data, series, plan, stacked, unit, dd = 0, height = 240, legend = true, labels, colorBy, layout }) {
  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: labels ? 18 : 6, right: 12, left: 0, bottom: 0 }} barGap={2} layout={layout}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="x" {...AX} interval={data.length > 14 ? 'preserveStartEnd' : 0} minTickGap={data.length > 14 ? 24 : 4} />
          <YAxis {...AX} axisLine={false} width={58} tickFormatter={yFmt} />
          <Tooltip content={<Tip unit={unit} dd={dd} />} cursor={{ fill: 'rgba(28,92,171,.06)' }} />
          {legend && (series.length > 1 || plan) && <Legend {...lg([...series.map((x) => x.key), plan && plan.key])} />}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={stacked ? 'a' : undefined} maxBarSize={26} radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false}>
              {colorBy && data.map((d, j) => <Cell key={j} fill={colorBy(d, s) || s.color} />)}
              {labels && i === series.length - 1 && <LabelList dataKey={s.key} position="top" style={{ fontSize: 11, fill: '#16191f', fontWeight: 600 }} formatter={(v) => fmt(v, dd)} />}
            </Bar>
          ))}
          {plan && <Line dataKey={plan.key} name={plan.name} stroke="#16191f" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 3, fill: '#16191f', strokeWidth: 0 }} isAnimationActive={false} legendType="plainline" />}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}

// Накопленные области: data [{ x, k... }], series [{ key, name, color }], fcFrom
export function StackChart({ data, series, fcFrom, fcLabel = 'Прогноз', unit, dd = 0, height = 280 }) {
  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="x" {...AX} />
          <YAxis {...AX} axisLine={false} width={58} tickFormatter={yFmt} />
          <Tooltip content={<Tip unit={unit} dd={dd} />} />
          <Legend {...lg(series.map((x) => x.key))} />
          {fcFrom != null && <ReferenceArea x1={fcFrom} x2={data[data.length - 1].x} fill="#eef3fa" fillOpacity={0.9} label={{ value: fcLabel, position: 'insideTopLeft', fontSize: 11, fill: C.ink2, fontWeight: 600 }} />}
          {series.map((s) => <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stackId="1" legendType="square" stroke="#fff" strokeWidth={1.5} fill={s.color} fillOpacity={0.88} isAnimationActive={false} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}

// Водопад: items [{ l, v, total }] — total: столбец от нуля, иначе приращение
export function WaterfallChart({ items, unit, dd = 0, height = 280 }) {
  let acc = 0;
  const data = items.map((it) => { const from = it.total ? 0 : acc; const to = it.total ? it.v : acc + it.v; acc = to; return { x: it.l, _base: Math.min(from, to), val: Math.abs(to - from), raw: it.v, total: it.total, to }; });
  const col = (d) => (d.total ? C.s[0] : d.raw < 0 ? C.crit : C.good);
  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="x" {...AX} interval={0} tick={{ fontSize: 11, fill: C.muted }} height={44} />
          <YAxis {...AX} axisLine={false} width={58} tickFormatter={yFmt} domain={[(min) => Math.floor(min * 0.98), 'auto']} />
          <Tooltip cursor={{ fill: 'rgba(28,92,171,.06)' }} content={({ active, payload }) => (active && payload && payload[0] ? <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', borderRadius: 2, px: 1.25, py: 1, fontSize: 12, boxShadow: '0 8px 24px rgba(16,24,40,.14)' }}><b>{payload[0].payload.x}</b><br />{payload[0].payload.total ? '' : (payload[0].payload.raw > 0 ? '+' : '−') + fmt(Math.abs(payload[0].payload.raw), dd) + ' → '}{fmt(payload[0].payload.to, dd)} {unit}</Box> : null)} />
          <Bar dataKey="_base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="val" stackId="w" maxBarSize={48} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={col(d)} />)}
            <LabelList dataKey="raw" position="top" style={{ fontSize: 11, fontWeight: 600, fill: '#16191f' }} formatter={(v) => fmt(v, dd)} />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}

// Точки: groups [{ name, color, data: [{ x, y, z?, label? }] }], xLabel, yLabel
export function ScatterPlot({ groups, xLabel, yLabel, height = 280, xUnit, yUnit }) {
  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 18 }}>
          <CartesianGrid stroke={C.grid} />
          <XAxis type="number" dataKey="x" name={xLabel} unit={xUnit} {...AX} label={{ value: xLabel, position: 'insideBottom', offset: -10, fontSize: 11, fill: C.muted }} domain={['auto', 'auto']} />
          <YAxis type="number" dataKey="y" name={yLabel} unit={yUnit} {...AX} width={60} label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: C.muted }} domain={['auto', 'auto']} />
          <ZAxis type="number" dataKey="z" range={[30, 30]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v) => fmt(v, 1)} />
          {groups.length > 1 && <Legend {...legendProps} itemSorter={null} />}
          {groups.map((g) => <Scatter key={g.name} name={g.name} data={g.data} fill={g.color} fillOpacity={g.opacity ?? 0.8} isAnimationActive={false} shape={g.shape || 'circle'} />)}
        </ScatterChart>
      </ResponsiveContainer>
    </Box>
  );
}

// Малая линия для карточек
export function MiniLine({ data, keys, height = 120, unit }) {
  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="x" {...AX} minTickGap={30} />
          <YAxis {...AX} axisLine={false} width={44} domain={['auto', 'auto']} tickFormatter={yFmt} />
          <Tooltip content={<Tip unit={unit} dd={1} />} />
          {keys.map((k) => <Line key={k.key} dataKey={k.key} name={k.name} stroke={k.color} strokeWidth={1.8} dot={false} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
