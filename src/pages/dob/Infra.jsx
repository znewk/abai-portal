// Наземная инфраструктура — ABAI Наземная инфраструктура (процесс Д4, ИМА): схема сбора, подготовки и ППД,
// загрузка мощностей, узкие места, сценарии интегрированной модели (данные — ima.data.js), запись расчёта ИМА.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography, Tooltip, List, ListItemButton, Alert } from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { PageHeader, KpiRow, Section, KV, StatusChip, Meter, TONE, Kpi, Grid2 } from '../../components/ui.jsx';
import { TrendChart } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { TWINS } from '../../data/core.js';
import { series, dayLabels, dRel, fmt, pct } from '../../lib/format.js';
import { NODES, node, SCEN, NARROWS } from './ima.data.js';
import { RunState, runOf } from './_runs.jsx';
import { C } from '../../theme.js';
import { assetName, ldTone, LD_T, Cell2, DetailDrawer, SecT, TabCard } from './_shared2.jsx';

// Схема: нефть — скважины → ГЗУ → ДНС → ЦППН → сдача; вода — ЦППН → УПВ → БКНС → ВРП → нагнетательные
function Scheme({ sel, onPick }) {
  const W = 1120, H = 680; const X = [80, 290, 510, 760, 990]; const Y = (row) => 56 + row * 50; const NW = 150, NH = 38;
  const wy = (n) => (n.type === 'УПВ' ? 562 : 500 + Math.round((n.row - 4.4) / 0.9) * 62);
  const pos = (n) => ({ x: X[n.col], y: n.kind === 'water' ? wy(n) : n.type === 'ГЗУ' ? Y(n.row) : n.type === 'ДНС' ? Y(n.row * 2 + 0.5) : Y(3.5) });
  const strokeC = { good: C.good, warn: C.warn, crit: C.crit };
  const OIL = '#5f6b7c', WAT = C.s[0];
  const edges = [];
  const edge = (a, b, kind, ld, k) => {
    const p = pos(a), q = pos(b); const x1 = p.x + NW / 2, x2 = q.x - NW / 2; const mx = (x1 + x2) / 2; const t = ldTone(ld);
    edges.push(<path key={k} d={`M${x1} ${p.y}H${mx}V${q.y}H${x2}`} fill="none" stroke={kind === 'water' ? WAT : OIL} strokeWidth={t === 'crit' ? 3.5 : 2} strokeDasharray={t === 'crit' ? '7 4' : undefined} markerEnd={`url(#ar${kind === 'water' ? 'w' : 'o'})`} />);
  };
  const gzu = NODES.filter((n) => n.type === 'ГЗУ'); const vrp = NODES.filter((n) => n.type === 'ВРП');
  gzu.forEach((n) => { const p = pos(n); edges.push(<path key={'w' + n.id} d={`M${X[0] + NW / 2} ${p.y}H${p.x - NW / 2}`} stroke={OIL} strokeWidth={2} fill="none" markerEnd="url(#aro)" />); });
  NODES.forEach((n) => { if (n.parent && n.kind === 'oil') edge(n, node(n.parent), 'oil', n.ld, 'e' + n.id); });
  NODES.filter((n) => n.type === 'ДНС').forEach((n) => edge(n, node('cppn'), 'oil', n.id === 'dns3' ? 94 : 70, 'c' + n.id));
  edge(node('cppn'), node('sdacha'), 'oil', 68, 'sd');
  const c = pos(node('cppn')), u = pos(node('upv'));
  edges.push(<path key="cu" d={`M${c.x} ${c.y + NH / 2}V${u.y - NH / 2}`} stroke={WAT} strokeWidth={2} fill="none" markerEnd="url(#arw)" />);
  NODES.filter((n) => n.type === 'БКНС').forEach((b) => { const p = pos(b); edges.push(<path key={'u' + b.id} d={`M${u.x - NW / 2} ${u.y}H${(u.x - NW / 2 + p.x + NW / 2) / 2}V${p.y}H${p.x + NW / 2}`} stroke={WAT} strokeWidth={b.ld > 90 ? 3.5 : 2} strokeDasharray={b.ld > 90 ? '7 4' : undefined} fill="none" markerEnd="url(#arw)" />); });
  vrp.forEach((v) => { const p = pos(v), b = pos(node(v.parent)); edges.push(<path key={'b' + v.id} d={`M${b.x - NW / 2} ${b.y}H${p.x + NW / 2}`} stroke={WAT} strokeWidth={2} fill="none" markerEnd="url(#arw)" />, <path key={'i' + v.id} d={`M${p.x - NW / 2} ${p.y}H${X[0] + NW / 2}`} stroke={WAT} strokeWidth={2} fill="none" markerEnd="url(#arw)" />); });
  const wellBox = (y, t, sub, k) => (
    <g key={k}><rect x={X[0] - NW / 2} y={y - NH / 2} width={NW} height={NH} rx="6" fill="#fff" stroke="#d5dbe5" /><text x={X[0]} y={y - 3} textAnchor="middle" style={{ fontSize: 12, fontWeight: 600, fill: '#16191f' }}>{t}</text><text x={X[0]} y={y + 12} textAnchor="middle" style={{ fontSize: 10.5, fill: C.muted }}>{sub}</text></g>
  );
  const hdr = ['Скважины', 'Замерные установки', 'Дожимные насосные станции', 'Подготовка нефти и воды', 'Сдача'];
  return (
    <Box>
      <Box component="svg" viewBox={`0 0 ${W} ${H}`} sx={{ width: '100%', display: 'block', bgcolor: '#fafbfc', borderRadius: 1.5, fontFamily: 'inherit' }} role="img" aria-label="Схема сбора, подготовки нефти и системы ППД">
        <defs>{[['o', OIL], ['w', WAT]].map(([k, col]) => <marker key={k} id={'ar' + k} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" style={{ fill: col }} /></marker>)}</defs>
        {hdr.map((h, i) => <text key={h} x={X[i]} y={20} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: C.ink2, letterSpacing: '.04em', textTransform: 'uppercase' }}>{h}</text>)}
        <line x1="20" x2={W - 20} y1="440" y2="440" stroke="#c3c7cf" strokeDasharray="4 4" />
        <text x="20" y="464" style={{ fontSize: 11, fontWeight: 700, fill: C.ink2, letterSpacing: '.04em', textTransform: 'uppercase' }}>Система ППД: подготовка воды, БКНС, ВРП, нагнетательные скважины</text>
        <text x={c.x + 8} y={(c.y + u.y) / 2} style={{ fontSize: 10.5, fill: C.muted }}>подтоварная вода</text>
        {edges}
        {gzu.map((n, i) => wellBox(pos(n).y, 'Добывающие', `группа ${i + 1} · ${fmt(n.wells)} скв.`, 'wb' + n.id))}
        {vrp.map((n) => wellBox(pos(n).y, 'Нагнетательные', `${n.t} · ${fmt(n.wells)} скв.`, 'vb' + n.id))}
        {NODES.map((n) => {
          const p = pos(n); const t = ldTone(n.ld); const on = sel === n.id;
          return (
            <Tooltip key={n.id} title={`${n.t} · ${n.type} · загрузка ${n.ld}% (${LD_T[t].toLowerCase()}) · ${fmt(n.fact)} из ${fmt(n.cap)} ${n.unit}`} placement="top">
              <g onClick={() => onPick(n.id)} style={{ cursor: 'pointer' }}>
                <rect x={p.x - NW / 2} y={p.y - NH / 2} width={NW} height={NH} rx="6" fill={TONE[t].bg} stroke={on ? '#16191f' : strokeC[t]} strokeWidth={on ? 2.5 : 1.5} />
                <text x={p.x - NW / 2 + 10} y={p.y - 3} style={{ fontSize: 12, fontWeight: 600, fill: '#16191f' }}>{n.t}</text>
                <text x={p.x - NW / 2 + 10} y={p.y + 12} style={{ fontSize: 10.5, fill: C.muted }}>{n.type}</text>
                <text x={p.x + NW / 2 - 10} y={p.y + 5} textAnchor="end" style={{ fontSize: 12.5, fontWeight: 700, fill: TONE[t].fg }}>{t === 'good' ? '' : t === 'crit' ? '■ ' : '! '}{n.ld}%</text>
              </g>
            </Tooltip>
          );
        })}
      </Box>
      <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2.5, rowGap: 0.75, mt: 1.25, fontSize: 12, color: 'text.secondary' }}>
        {[['good', 'Норма · загрузка до 80%'], ['warn', 'Повышенная · 80–90%'], ['crit', 'Предельная · свыше 90%']].map(([t, l]) => <Stack key={t} direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: TONE[t].bg, border: `1.5px solid ${strokeC[t]}` }} /><span>{l}</span></Stack>)}
        <Stack direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 16, height: 3, bgcolor: OIL, borderRadius: 1 }} /><span>Нефтесбор</span></Stack>
        <Stack direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 16, height: 3, bgcolor: WAT, borderRadius: 1 }} /><span>Вода и закачка</span></Stack>
        <Stack direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 16, borderTop: `2px dashed ${C.ink2}` }} /><span>Участок с ограничением</span></Stack>
      </Stack>
    </Box>
  );
}

function NodeDrawer({ n, onClose }) {
  const { role, runs } = useApp(); const nav = useNavigate();
  const canStart = role && !role.limited && role.lane('Д4', 'ДДНГ'); const run = runOf(runs, 'Д4', 'ima:uzen-dns3');
  if (!n) return <DetailDrawer open={false} onClose={onClose} />;
  const t = ldTone(n.ld); const kids = NODES.filter((x) => x.parent === n.id);
  const hist = series('db2-ld-' + n.id, 30, n.ld, 0.03).map((v) => Math.min(104, +v.toFixed(1))); const lb = dayLabels(30);
  return (
    <DetailDrawer open onClose={onClose} title={n.t} sub={`${n.type}${n.ngdu ? ' · ' + n.ngdu : ''}`}
      actions={canStart && n.ld > 80 ? <Button variant="contained" onClick={() => nav('/m/dob/p/' + encodeURIComponent('Д4') + '?start=1')}>Инициировать инженерную проработку</Button> : null}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, mb: 2 }}>
        <Kpi label="Загрузка" value={n.ld + '%'} d={LD_T[t]} /><Kpi label="Факт" value={fmt(n.fact)} d={n.unit} /><Kpi label="Проектная мощность" value={fmt(n.cap)} d={n.unit} />
      </Box>
      <SecT sx={{ mt: 0 }}>Параметры</SecT>
      <KV rows={[['Статус', <StatusChip tone={t} label={LD_T[t]} />], ['Давление на входе', n.pin ? `${fmt(n.pin, 1)} атм` : null], ['Давление на выходе', n.pout ? `${fmt(n.pout, 1)} атм` : null], ['Подключено скважин', n.wells ? fmt(n.wells) : null], ['Подключённые объекты', kids.length ? kids.map((k) => k.t).join(', ') : null], ['Источник данных', 'SCADA → КХД → ABAI БД 2.0']]} />
      <SecT>Загрузка за 30 суток, %</SecT>
      <TrendChart height={190} legend={false} unit="%" dd={1} data={hist.map((v, i) => ({ x: lb[i], v }))} series={[{ key: 'v', name: 'Загрузка', color: C.s[0] }]} />
      {n.ld > 90 && <Alert severity="error" sx={{ mt: 1.5 }}>Загрузка выше 90 % проектной мощности — ограничение учтено в потенциале базовой добычи.</Alert>}
      {(n.id === 'dns3' || n.parent === 'dns3') && run && <><SecT>Интегрированная модель в процессе</SecT><RunState run={run} /></>}
      {n.ld > 80 && n.ld <= 90 && <Alert severity="warning" sx={{ mt: 1.5 }}>Загрузка выше 80% — требуется проверка сценарием ИМА при вводе скважин и ГТМ.</Alert>}
    </DetailDrawer>
  );
}

export default function Infra() {
  const { asset, runs } = useApp(); const nav = useNavigate();
  const run = runOf(runs, 'Д4', 'ima:uzen-dns3');
  const [sel, setSel] = useState(null); const [tab, setTab] = useState('scen');
  const crit = NODES.filter((n) => n.ld > 90); const tw = TWINS.find((t) => t.id === 'dob');
  const rows = [...NODES].sort((a, b) => b.ld - a.ld);
  const narrows = NARROWS;
  return (
    <>
      <PageHeader title="Наземная инфраструктура" sub={`${assetName(asset)} · сбор, подготовка и сдача нефти, система ППД`} sys={[['ABAI Наземная инфраструктура', 'dob']]} />
      <KpiRow items={[
        { label: 'Загрузка ЦППН', value: pct(node('cppn').ld, 0), d: `${fmt(node('cppn').fact)} м³/сут жидкости` },
        { label: 'Предельная загрузка', value: fmt(crit.length), d: crit.map((n) => n.t).join(', ') },
        { label: 'Потери из-за ограничений', value: '186', unit: 'т/сут', d: 'приём жидкости ДНС-3', to: '/m/dob/p/' + encodeURIComponent('Д3') },
        { label: 'Сходимость расчёта сети', value: pct(tw.q, 0), d: `пересчёт ${dRel(tw.upd)}` },
      ]} />
      {run && <Section title="Интегрированная модель актива · система сбора ДНС-3" sub={`сходимость расчёта сети ${tw.q} % — требуется пересчёт; актуализация модели, расчёты по сценариям и решение по корректировке производственной программы`} sx={{ mb: 2 }}
        info="Процесс Д4: ТЗ (4.1), пакет исходных данных (4.2.1, 4.2.2), актуализация модели (4.2а), локальное решение и расчёты ДТТД (4.3–4.6), оценка применимости (4.7), решение (4.8).">
        <RunState run={run} act="Выполнить шаг расчёта" />
      </Section>}
      <Section title="Схема сбора, подготовки нефти и системы ППД" sub="загрузка объектов, % от проектной мощности" sx={{ mb: 2 }}
        info="Данные SCADA → КХД → ABAI БД 2.0. Нажмите на объект, чтобы открыть параметры и динамику загрузки.">
        <Scheme sel={sel} onPick={setSel} />
      </Section>
      <Grid2 cols="minmax(0, 2fr) minmax(0, 3fr)">
        <Section title="Узкие места" sub="по результатам расчёта сети" flush>
          <List disablePadding>
            {narrows.map(([tone, t, s, id], i) => (
              <ListItemButton key={i} onClick={() => (id ? setSel(id) : nav('/m/dob/p/' + encodeURIComponent('Д8')))} sx={{ borderRadius: 0, display: 'block', py: 1.25, px: 2, borderTop: '1px solid #f0f2f5' }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between"><Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{t}</Typography><StatusChip tone={tone} label={!id ? 'Риск отказа' : tone === 'crit' ? 'Предельная' : 'Повышенная'} /></Stack>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{s}</Typography>
              </ListItemButton>
            ))}
          </List>
        </Section>
        <TabCard value={tab} onChange={setTab} tabs={[['scen', 'Сценарии ИМА'], ['load', 'Загрузка мощностей']]}>
          {tab === 'scen' && <>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 2, pt: 1.5, fontSize: 12.5, color: 'text.secondary' }}>
              <span>Загрузка объектов при изменении фонда и режимов</span>
              <Tooltip title="Расчёт интегрированной модели: пласт – скважина – инфраструктура; модели ЦД скважины, пласта и добычи синхронизируются при каждом пересчёте."><InfoOutlined sx={{ fontSize: 16, color: '#a3aab6', cursor: 'help' }} /></Tooltip>
            </Stack>
            <DataTable rows={SCEN} columns={[
              { field: 't', headerName: 'Сценарий', minWidth: 200, flex: 1, renderCell: (p) => <Cell2 a={p.row.t} b={p.row.d} /> },
              { field: 'liq', headerName: 'Прирост жидкости, м³/сут', type: 'number', width: 130, valueFormatter: (v) => (v ? '+' + fmt(v) : 'без изменения') },
              { field: 'dns3', headerName: 'ДНС-3', width: 80, renderCell: (p) => <StatusChip tone={ldTone(p.value)} label={p.value + '%'} /> },
              { field: 'bkns1', headerName: 'БКНС-1', width: 86, renderCell: (p) => <StatusChip tone={ldTone(p.value)} label={p.value + '%'} /> },
              { field: 'res', headerName: 'Решение', minWidth: 220, flex: 1.2, renderCell: (p) => <Box sx={{ whiteSpace: 'normal' }}>{p.value}</Box> },
            ]} />
          </>}
          {tab === 'load' && (
            <DataTable rows={rows} pageSize={8} onRowClick={(n) => setSel(n.id)} getRowClassName={(p) => (p.row.id === sel ? 'sel' : '')} columns={[
              { field: 't', headerName: 'Объект', minWidth: 150, flex: 1, renderCell: (p) => <Cell2 a={p.row.t} b={`${p.row.type}${p.row.ngdu ? ' · ' + p.row.ngdu : ''}`} /> },
              { field: 'cap', headerName: 'Мощность', type: 'number', width: 120, valueFormatter: (v) => fmt(v) },
              { field: 'fact', headerName: 'Факт', type: 'number', width: 110, valueFormatter: (v) => fmt(v) },
              { field: 'ld', headerName: 'Загрузка', minWidth: 170, renderCell: (p) => <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}><Box sx={{ flex: 1 }}><Meter v={p.value} tone={ldTone(p.value)} h={6} /></Box><b style={{ minWidth: 34, textAlign: 'right' }}>{p.value}%</b></Stack> },
            ]} />
          )}
        </TabCard>
      </Grid2>
      <NodeDrawer n={sel ? node(sel) : null} onClose={() => setSel(null)} />
    </>
  );
}
