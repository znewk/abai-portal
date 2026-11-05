// Цифровое бурение (Б3): скважины в бурении, глубина — сутки, параметры WITSML, отклонения, суточный рапорт, ход процесса.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stepPath } from '../../data/exec.js';
import { Box, Card, CardActionArea, Stack, Typography, Button, Tabs, Tab } from '@mui/material';
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, KV, Hbars, Meter, Steps } from '../../components/ui.jsx';
import { TrendChart, MiniLine } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { BPMN } from '../../data/core.js';
import { C } from '../../theme.js';
import { fmt, sum, last, rng, series, dFmt, tFmt, TODAY } from '../../lib/format.js';
import { useApp } from '../../state.jsx';
import { ProcLink, ContrBtn } from './_shared.jsx';

import { DRILL, devs, RT, BAL, opOf } from './drill.data.js';
const PATH = [['Станция ГТИ', 'Петролайн ДЭЛ-140/150 · WITSML 1.4.1'], ['КХД', 'приём и нормализация данных реального времени'], ['ABAI БД 2.0', 'дело скважины, суточная отчётность'], ['ABAI Цифровое бурение (Nedra.RTM)', 'мониторинг РВД, отклонения (сл. 55)'], ['КЦ КМГ', 'итоги бурения через КХД (Б3 3.9.2)']];

export default function Drill() {
  const { role, sign, toast, runs } = useApp(); const nav = useNavigate();
  const [selId, setSelId] = useState(DRILL[0].id); const [ok, setOk] = useState({}); const [tab, setTab] = useState('dev');
  const sel = DRILL.find((d) => d.id === selId) || DRILL[0];
  const P = BPMN.find((x) => x.p === 'Б3'); const steps = P.s.filter((s) => !/^3\.2\.\d/.test(s.c)); const curStep = 4;
  const depthData = Array.from({ length: sel.days + 1 }, (_, i) => ({ x: 'сут ' + i, plan: sel.plan[i], fact: i <= sel.cur ? sel.fact[i] : null }));
  const tl = Array.from({ length: 37 }, (_, i) => tFmt(new Date(TODAY - (36 - i) * 6e5)));
  const D = devs(sel).map((x) => (ok[x.id] ? { ...x, ok: true, st: 'Корректирующие мероприятия согласованы' } : x));
  const canApprove = role && !role.limited; const dv = sel.bh - sel.bhPlan;
  const pending = DRILL.reduce((a, d) => a + devs(d).filter((x) => !x.ok && !ok[x.id]).length, 0);
  const devCols = [
    { field: 't', headerName: 'Отклонение', flex: 1, minWidth: 280 },
    { field: 'v', headerName: 'Величина', width: 100, align: 'right', headerAlign: 'right' },
    { field: 'st', headerName: 'Статус', width: 320, renderCell: ({ row: x }) => <StatusChip tone={x.ok ? 'good' : x.tone} label={x.st} /> },
    { field: 'a', headerName: '', width: 170, sortable: false, renderCell: ({ row: x }) => { if (x.ok || !canApprove) return null; const run = runs.find((r) => r.p === 'Б3' && r.status === 'active' && r.obj.id === 'w:' + sel.id); const a37 = run && run.active.find((q) => run.P.s[q.i].c === '3.7');
      return a37 ? <Button size="small" variant="outlined" onClick={() => nav(stepPath(run, a37.i))}>Согласовать в процессе</Button> : <Button size="small" variant="outlined" onClick={() => sign(`Корректирующие мероприятия по отклонению ${x.id} · ${sel.id} (Б3 3.7)`, () => { setOk({ ...ok, [x.id]: true }); toast(`Мероприятия по ${x.id} согласованы ЭЦП, подрядчик уведомлён`); })}>Согласовать</Button>; } },
  ];
  const pathInfo = <span>{PATH.map(([t, s2]) => `${t} (${s2})`).join(' → ')}. Процесс <ProcLink code="Б3" />.</span>;
  return (
    <>
      <PageHeader title="Цифровое бурение" sub={`Узень, Карамандыбас · ${DRILL.length} буровые в работе · на ${dFmt(TODAY)} ${tFmt(TODAY)}`}
        sys={[['ABAI Цифровое бурение', 'skv']]} actions={<ContrBtn />} />
      <KpiRow items={[
        { label: 'Проходка за сутки', value: fmt(sum(DRILL.map((d) => d.fact[d.cur] - d.fact[d.cur - 1]))), unit: 'м', d: 'по всем буровым' },
        { label: 'Коммерческая скорость', value: fmt(1840), unit: 'м/ст.-мес.', delta: 4.2, du: '%', good: 'up', d: 'к плану' },
        { label: 'Непроизводительное время', value: '6,3', unit: '%', delta: -1.1, du: ' п. п.', good: 'down', d: 'к прошлому месяцу' },
        { label: 'Отклонения на согласовании', value: pending, d: 'ожидают решения ДЗО' },
      ]} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>
        {DRILL.map((d) => { const lagging = d.bh - d.bhPlan < -20; const on = d.id === sel.id; return (
          <Card key={d.id} sx={{ borderColor: on ? 'primary.main' : undefined, boxShadow: on ? '0 0 0 1px #1c5cab' : undefined }}>
            <CardActionArea onClick={() => setSelId(d.id)} sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography sx={{ fontWeight: 700, fontSize: 15 }}>{d.id}</Typography><StatusChip tone={lagging ? 'warn' : 'good'} label={lagging ? 'Забой ниже плана' : 'В пределах плана'} /></Stack>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>{d.rig} · {d.ctr}</Typography>
              <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ my: 1 }}><Typography sx={{ fontSize: 20, fontWeight: 600 }}>{fmt(d.bh)} <small style={{ fontSize: 12, color: C.muted }}>м</small></Typography><Typography variant="caption" color="text.secondary">из {fmt(d.depth)} м · сутки {d.cur} из {d.days}</Typography></Stack>
              <Meter v={d.bh} max={d.depth} tone={lagging ? 'warn' : ''} h={6} />
            </CardActionArea>
          </Card>); })}
      </Box>
      <Grid2 cols="2fr 1fr">
        <Section title={`Глубина по стволу · ${sel.id}`} sub={`${dv >= 0 ? 'опережение' : 'отставание'} ${fmt(Math.abs(dv))} м от проектного графика`} info={pathInfo}>
          <TrendChart data={depthData} unit="м" height={300} yDomain={[0, 'auto']} marks={[{ x: 'сут ' + sel.cur, label: 'сейчас' }]} series={[{ key: 'plan', name: 'Проектный график (ГТН)', color: C.ink2, dash: true, width: 1.5 }, { key: 'fact', name: 'Факт по данным ГТИ', color: C.s[0] }]} />
        </Section>
        <Section title="Суточный рапорт" sub={`на 06:00 ${dFmt(TODAY)}`} info="Сформирован автоматически по данным ГТИ (Б3 3.3) и передан в ABAI БД 2.0 в 06:05."
          action={<Button size="small" onClick={() => toast(`Файл «СР_${sel.id}_${dFmt(TODAY)}.pdf» сформирован`)}>PDF</Button>}>
          <KV rows={[['Сутки', sel.cur], ['Забой', fmt(sel.bh) + ' м'], ['Проходка за сутки', fmt(sel.fact[sel.cur] - sel.fact[sel.cur - 1]) + ' м'], ['Операция', opOf(sel)], ['Буровой раствор', 'полимер-глинистый, 1,18 г/см³']]} />
          <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2, mb: 1 }}>Баланс времени, ч</Typography>
          <Hbars max={24} rows={BAL.map(([l, v], i) => ({ l, v, c: i === 4 ? C.serious : C.s[0], txt: fmt(v, 1) }))} />
        </Section>
      </Grid2>
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="dev" label={`Отклонения · ${D.filter((x) => !x.ok).length}`} /><Tab value="rt" label="Параметры WITSML" /><Tab value="proc" label="Ход процесса Б3" />
        </Tabs>
        {tab === 'dev' && <DataTable rows={D} columns={devCols} />}
        {tab === 'rt' && (
          <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
            {RT.map(([t, u, b], k) => { const v = series('rt' + sel.id + k, 37, b, 0.05).map((x) => +x.toFixed(1)); return (
              <Box key={t}>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{t}</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 600, mb: 0.5 }}>{fmt(last(v), 1)} <Typography component="span" sx={{ fontSize: 12.5, color: 'text.secondary' }}>{u}</Typography></Typography>
                <MiniLine height={100} unit={u} data={tl.map((x, i) => ({ x, v: v[i] }))} keys={[{ key: 'v', name: t, color: C.s[0] }]} />
              </Box>); })}
          </Box>
        )}
        {tab === 'proc' && <Box sx={{ p: 2 }}><Steps items={steps.map((s, i) => ({ c: s.c, t: s.t, sub: s.r, done: i < curStep, cur: i === curStep }))} /></Box>}
      </Card>
    </>
  );
}
