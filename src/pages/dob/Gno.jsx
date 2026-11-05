// Подбор погружного оборудования — ABAI ПГНО (процесс Д6): очередь заявок из экземпляров процесса, исходные данные,
// варианты насосов, напорная характеристика с рабочей точкой, прогноз отказов механизированного фонда.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import EastRounded from '@mui/icons-material/EastRounded';
import { PageHeader, KpiRow, Section, Grid2, KV, StatusChip, Steps, Meter } from '../../components/ui.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { WELLS } from '../../data/core.js';
import { runPath, runTitle, stepKey } from '../../data/exec.js';
import { fmt, pct, avg, plural, dFmt } from '../../lib/format.js';
import { assetName, WellLink, Cell2, SecT, TabCard } from './_shared2.jsx';
import { STAGES, SHORT, stTone, reqFromRun, extraReqs, pumpsFor, hOp, HeadChart } from './gno.data.jsx';

export default function Gno() {
  const { role, asset, runs } = useApp(); const nav = useNavigate(); const lim = !!(role && role.limited);
  const REQS = useMemo(() => { const live = runs.filter((r) => r.p === 'Д6').map(reqFromRun); return live.concat(extraReqs(live.map((q) => q.w.id))); }, [runs]);
  const [selId, setSelId] = useState(REQS[0].id); const [tab, setTab] = useState('req');
  const sel = REQS.find((q) => q.id === selId) || REQS[0]; const st = sel.stage; const w = sel.w;
  const pumps = useMemo(() => pumpsFor(sel), [sel]);
  const fund = WELLS.filter((x) => x.type === 'prod' && x.method !== 'Фонтан' && x.status === 'work');
  const hi = fund.filter((x) => x.risk > 60);
  const risk = [...fund].sort((a, b) => b.risk - a.risk).slice(0, 10);
  const rec = pumps.find((p) => p.rec);
  const cur = sel.run && sel.run.status === 'active' ? sel.run.active.map((a) => sel.run.P.s[a.i]) : [];
  return (
    <>
      <PageHeader title="Подбор погружного оборудования" sub={`${assetName(asset)} · заявки на подбор ГНО`} sys={[['ABAI ПГНО', 'dob']]}
        actions={lim ? null : <Button variant="contained" startIcon={<AddRounded />} onClick={() => nav('/m/dob/p/Д6?start=1')}>Новая заявка</Button>} />
      <KpiRow items={[
        { label: 'Заявок в работе', value: fmt(REQS.filter((q) => q.stage < 4).length), d: `на экспертизе — ${REQS.filter((q) => q.stage === 3).length}` },
        { label: 'Срок подбора', value: '3,5', unit: 'сут', delta: -6.5, du: ' сут', good: 'down', d: 'к 2025 году' },
        { label: 'Средняя наработка на отказ', value: fmt(avg(fund.map((x) => x.mtbf))), unit: 'сут', delta: 23, dd: 0, du: ' сут', good: 'up', d: 'к 2025 году' },
        { label: 'Высокий риск отказа', value: fmt(hi.length), d: `${plural(hi.length, 'скважина', 'скважины', 'скважин')} · 30 суток` },
      ]} />

      <TabCard value={tab} onChange={setTab} tabs={[['req', `Заявки · ${REQS.length}`], ['risk', 'Прогноз отказов']]} sx={{ mb: 2 }} />

      {tab === 'req' && <>
        <Grid2 cols="minmax(0, 4fr) minmax(0, 7fr)">
          <Section title="Очередь заявок" flush>
            <DataTable rows={REQS} pageSize={6} onRowClick={(q) => setSelId(q.id)} getRowClassName={(p) => (p.row.id === sel.id ? 'sel' : '')} columns={[
              { field: 'id', headerName: 'Заявка', width: 96 },
              { field: 'well', headerName: 'Скважина', minWidth: 150, valueGetter: (v, r) => r.w.id, renderCell: (p) => <Cell2 bold={false} a={<WellLink id={p.row.w.id} limited={lim} />} b={p.row.reason} /> },
              { field: 'stage', headerName: 'Этап', width: 140, valueGetter: (v) => SHORT[v], renderCell: (p) => <StatusChip tone={stTone(p.row.stage)} label={SHORT[p.row.stage]} /> },
            ]} />
          </Section>

          <Section title={`Заявка ${sel.id} · ${w.id}`} sub={`${sel.reason} · ${w.ngdu} · ${w.gzu} · создана ${dFmt(sel.created)}`}
            info="Исходные данные собраны автоматически (шаг 6.4а): конструкция, инклинометрия, режимы и ремонты — из ABAI БД 2.0; дебиты, обводнённость и осложнения — из ABAI ТР 2.0. Опросные листы не требуются."
            action={sel.run ? <Button size="small" endIcon={<EastRounded />} onClick={() => nav(runPath(sel.run))}>Открыть в процессе</Button> : null}>
            <Steps items={STAGES.map(([c, t], i) => ({ c, t, done: i < st, cur: i === st }))} />
            {cur.length > 0 && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 1 }}>Сейчас: {cur.map((s) => `${s.t} — ${s.r}`).join('; ')}{sel.run.late ? ' · срок нарушен' : ''}</Typography>}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 1 }}>
              <Box><SecT>Режим и пласт</SecT><KV w="52%" rows={[['Дебит жидкости', `${fmt(w.qL)} м³/сут`], ['Обводнённость', pct(w.wc, 0)], ['Динамический уровень', `${fmt(w.hDyn)} м`], ['Газовый фактор', `${fmt(sel.gas)} м³/т`], ['Забойное давление', `${fmt(w.pZab)} атм`]]} /></Box>
              <Box><SecT>Скважина и оборудование</SecT><KV w="52%" rows={[['Глубина', `${fmt(w.depth)} м`], ['Текущее ГНО', w.pump], ['Наработка ГНО', `${fmt(w.mtbf)} сут`], ['Пластовая температура', `${sel.tPl} °C`], ['Осложнения', sel.compl.join(', ')]]} /></Box>
            </Box>
          </Section>
        </Grid2>

        <Grid2 cols="minmax(0, 6fr) minmax(0, 5fr)">
          <Section title="Варианты насосов" sub={`подача ${fmt(rec.qt)} м³/сут · напор ${fmt(hOp(pumps))} м`} flush
            info="Экспертиза ДТРС, ДТТД и КФК — параллельно, статусами (шаги 6.7.1–6.7.3); дизайн подрядчика — шаг 6.11; решение — шаг 6.9. Утверждение выполняется в форме шага экземпляра.">
            <DataTable rows={pumps} getRowClassName={(p) => (p.row.rec ? 'sel' : '')} columns={[
              { field: 'name', headerName: 'Типоразмер', minWidth: 210, flex: 2, renderCell: (p) => <Cell2 a={p.row.name} b={p.row.rec ? 'рекомендуемый · в рабочей зоне' : p.row.fit} /> },
              { field: 'eff', headerName: 'КПД, %', type: 'number', width: 80, valueFormatter: (v) => fmt(v, 1) },
              { field: 'kwh', headerName: 'кВт·ч/сут', type: 'number', width: 96, valueFormatter: (v) => fmt(v) },
              { field: 'mtbf', headerName: 'Наработка, сут', type: 'number', width: 116, valueFormatter: (v) => fmt(v) },
            ]} />
          </Section>
          <Section title="Напорная характеристика" sub="напор, м · подача, м³/сут" info="Пунктир — характеристика скважины по данным ABAI ТР 2.0; точка — рабочий режим рекомендуемого насоса.">
            <HeadChart pumps={pumps} />
          </Section>
        </Grid2>
      </>}

      {tab === 'risk' && (
        <Section title="Прогноз отказов механизированного фонда" sub="вероятность отказа на 30 суток" flush
          info="Модель риска ABAI ТР 2.0 по наработке, режимам и осложнениям; причины отказов по ГНО — ABAI ПГНО (процесс Д9).">
          <DataTable rows={risk} columns={[
            { field: 'id', headerName: 'Скважина', width: 130, renderCell: (p) => <Cell2 a={<WellLink id={p.row.id} limited={lim} />} b={p.row.ngdu} /> },
            { field: 'pump', headerName: 'ГНО', width: 150 },
            { field: 'mtbf', headerName: 'Наработка, сут', type: 'number', width: 130, valueFormatter: (v) => fmt(v) },
            { field: 'risk', headerName: 'Риск отказа', minWidth: 200, renderCell: (p) => <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}><Box sx={{ flex: 1 }}><Meter v={p.value} tone={p.value > 60 ? 'crit' : p.value > 35 ? 'warn' : 'good'} h={6} /></Box><b style={{ minWidth: 34, textAlign: 'right' }}>{p.value}%</b></Stack> },
            { field: 'rec', headerName: 'Рекомендация', minWidth: 180, valueGetter: (v, r) => (REQS.some((q) => q.w.id === r.id && q.stage < 4) ? 'Заявка на подбор в работе' : r.risk > 60 ? 'Заявка на подбор, ПРС' : r.risk > 35 ? 'Контроль режима' : 'Наблюдение') },
          ]} />
        </Section>
      )}
    </>
  );
}
