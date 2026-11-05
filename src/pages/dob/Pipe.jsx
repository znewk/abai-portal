// Целостность трубопроводов — ABAI ПДИМ 2.0 · целостность трубопроводов (процесс Д8):
// матрица рисков 5×5, реестр участков, записи процесса по участкам, программа надёжности, история отказов.
import { useState } from 'react';
import { Box, Button, Stack, Typography, Alert } from '@mui/material';
import { PageHeader, KpiRow, Section, Grid2, KV, StatusChip, Kpi } from '../../components/ui.jsx';
import { BarsChart } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { dFmt, dRel, fmt, sum, plural, TODAY } from '../../lib/format.js';
import { C } from '../../theme.js';
import { assetName, Cell2, DetailDrawer, SecT, TabCard } from './_shared2.jsx';
import { PIPES, PROG, PROG_ST, PL, CL, YRS, FAILS, pipeDays, riskTone, RISK_T, RiskMatrix } from './pipe.data.jsx';
import { RunState, runOf, atStep } from './_runs.jsx';

// Участок: паспорт, риск, срок диагностики; если по участку ведётся запись процесса — её состояние и переход в шаг
function PipeDrawer({ x, onClose, planRun }) {
  const { runs } = useApp();
  if (!x) return <DetailDrawer open={false} onClose={onClose} />;
  const t = riskTone(x.risk); const run = x.obj ? runOf(runs, 'Д8', x.obj) : null; const days = pipeDays(x);
  return (
    <DetailDrawer open onClose={onClose} title={x.name} sub={`${x.id} · ${x.type} · ${x.ngdu}`}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, mb: 2 }}>
        <Kpi label="Риск отказа" value={String(x.risk)} d={`${RISK_T[t]} · вероятность ${x.p} × последствия ${x.c}`} />
        <Kpi label="Остаточный ресурс" value={String(x.res)} unit={plural(x.res, 'год', 'года', 'лет')} d={`потеря стенки ${x.wall} %`} />
        <Kpi label="Отказов за 5 лет" value={String(x.fails)} d="по истории ремонтов" />
      </Box>
      <SecT sx={{ mt: 0 }}>Паспорт участка</SecT>
      <KV rows={[['Диаметр', `${x.d} мм`], ['Протяжённость', `${fmt(x.len, 1)} км`], ['Год ввода', x.year], ['Следующая диагностика', days < 0 ? `${dFmt(x.diag)} · просрочена` : `${dFmt(x.diag)} (${dRel(x.diag)})`], ['Метод диагностики', x.method], ['Документы', 'паспорт трубопровода, отчёт о диагностике, экспертное заключение']]} />
      <SecT>Надёжность участка в процессе</SecT>
      {run ? <RunState run={run} />
        : planRun ? <><Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>Отдельной записи по участку нет: мероприятия по участку учитываются в плане мероприятий по надёжности, который сейчас согласуется.</Typography><RunState run={planRun} open="Открыть план в процессе" act="Согласовать план в процессе" /></>
          : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Участок контролируется по срокам диагностики; запись процесса создаётся при наступлении срока.</Typography>}
      {t === 'crit' && <Alert severity="error" sx={{ mt: 2 }}>Критический риск — участок в приоритете программы надёжности; решение по мероприятиям принимают ДДНГ и ДКС.</Alert>}
    </DetailDrawer>
  );
}

export default function Pipe() {
  const { asset, runs } = useApp();
  const [flt, setFlt] = useState(null); const [sel, setSel] = useState(null); const [tab, setTab] = useState('prog');
  const hi = PIPES.filter((x) => x.risk >= 15); const soon = PIPES.filter((x) => pipeDays(x) >= 0 && pipeDays(x) < 30);
  const rows = (flt ? PIPES.filter((x) => x.p === flt.p && x.c === flt.c) : PIPES).slice().sort((a, b) => b.risk - a.risk || a.res - b.res);
  // Записи процесса по участкам; план мероприятий — запись с активным шагом согласования плана (или формирования мероприятий)
  const recs = runs.filter((r) => r.p === 'Д8').sort((a, b) => (a.status === 'done') - (b.status === 'done'));
  const planRun = recs.find((r) => atStep(r, ['8.7'])) || recs.find((r) => atStep(r, ['8.6'])) || null;
  const approved = recs.some((r) => r.done.some((d) => r.P.s[d.i].c === '8.7'));
  const stOf = (m) => (m.st === 'sogl' && approved && !planRun ? 'done' : m.st);
  const live = new Set(recs.filter((r) => r.status === 'active').map((r) => r.obj.id));
  return (
    <>
      <PageHeader title="Целостность трубопроводов" sub={`${assetName(asset)} · риск отказа, остаточный ресурс, сроки диагностики`} sys={[['ABAI ПДИМ 2.0 · целостность трубопроводов', 'dob']]} />
      <KpiRow items={[
        { label: 'Протяжённость', value: '4 862', unit: 'км', d: `${fmt(PIPES.length)} участков с оценкой риска` },
        { label: 'Отказы за 12 месяцев', value: '146', delta: -11.5, du: '%', good: 'down', d: 'к предыдущему периоду' },
        { label: 'Критический риск', value: fmt(hi.length), d: plural(hi.length, 'участок', 'участка', 'участков') },
        { label: 'Диагностика в ближайшие 30 суток', value: fmt(soon.length), d: plural(soon.length, 'участок', 'участка', 'участков') },
      ]} />
      {recs.length > 0 && <Section title="Надёжность трубопроводов в процессе" sub="записи по участкам: паспорт, диагностика, оценка риска, план мероприятий" sx={{ mb: 2 }}
        info="Процесс Д8 «Паспортизация и формирование программ надёжности по трубопроводам»: контроль сроков диагностики (8.1а), диагностика (8.3.2), оценка риска (8.5а), мероприятия (8.6), согласование плана (8.7).">
        <Stack spacing={1}>{recs.map((r) => <RunState key={r.id} run={r} />)}</Stack>
      </Section>}
      <Grid2 cols="minmax(0, 5fr) minmax(0, 7fr)">
        <Section title="Матрица рисков" sub="вероятность × последствия отказа" info="Нажмите на ячейку, чтобы отфильтровать реестр участков. Риск и остаточный ресурс рассчитываются в ПДИМ 2.0 (шаг 8.5а)."
          action={flt ? <Button size="small" onClick={() => setFlt(null)}>Сбросить</Button> : null}>
          <RiskMatrix flt={flt} setFlt={setFlt} />
        </Section>
        <Section title="Реестр участков" sub={flt ? `${PL[flt.p - 1]} вероятность · ${CL[flt.c - 1].toLowerCase()} последствия · ${rows.length}` : `${PIPES.length} участков, по убыванию риска`} flush>
          <DataTable rows={rows} search pageSize={8} onRowClick={(x) => setSel(x)} columns={[
            { field: 'name', headerName: 'Участок', minWidth: 210, flex: 2, renderCell: (p) => <Cell2 a={p.row.name} b={`${p.row.type} · ${p.row.ngdu}${live.has(p.row.obj) ? ' · в процессе' : ''}`} /> },
            { field: 'res', headerName: 'Ресурс', type: 'number', width: 90, valueFormatter: (v) => `${v} ${plural(v, 'год', 'года', 'лет')}` },
            { field: 'risk', headerName: 'Риск', width: 130, renderCell: (p) => <StatusChip tone={riskTone(p.value)} label={`${p.value} · ${RISK_T[riskTone(p.value)]}`} /> },
            { field: 'diag', headerName: 'Диагностика', width: 120, renderCell: (p) => { const days = Math.round((p.value - TODAY) / 864e5); return <Box sx={{ color: days < 0 ? 'error.main' : days < 30 ? 'warning.main' : 'inherit', fontWeight: days < 30 ? 600 : 400 }}>{days < 0 ? 'просрочена' : dFmt(p.value)}</Box>; } },
          ]} />
        </Section>
      </Grid2>
      <TabCard value={tab} onChange={setTab} tabs={[['prog', 'Программа надёжности 2027'], ['fails', 'Отказы по годам']]}>
        {tab === 'prog' && <>
          <Typography sx={{ px: 2, pt: 1.5, fontSize: 12.5, color: 'text.secondary' }}>Итого {fmt(sum(PROG.map((m) => m.cost)))} млн тг · мероприятия формируются по рискам участков, план согласуют ДДНГ и ДКС</Typography>
          {planRun && <Box sx={{ px: 2, pt: 1.5 }}><RunState run={planRun} act="Согласовать план в процессе" open="Открыть план в процессе" /></Box>}
          <DataTable rows={PROG} columns={[
            { field: 't', headerName: 'Мероприятие', minWidth: 300, flex: 2, renderCell: (p) => <Cell2 a={p.row.t} b={p.row.who} /> },
            { field: 'n', headerName: 'Участков', type: 'number', width: 100 },
            { field: 'cost', headerName: 'Затраты, млн тг', type: 'number', width: 140, valueFormatter: (v) => fmt(v) },
            { field: 'red', headerName: 'Снижение риска', type: 'number', width: 140, valueFormatter: (v) => `−${v} %` },
            { field: 'st', headerName: 'Статус', minWidth: 230, valueGetter: (v, r) => PROG_ST[stOf(r)][0], renderCell: (p) => <StatusChip tone={PROG_ST[stOf(p.row)][1]} label={PROG_ST[stOf(p.row)][0]} /> },
          ]} />
        </>}
        {tab === 'fails' && (
          <Box sx={{ p: 2 }}>
            <BarsChart height={300} stacked unit="отказов" data={YRS.map((x, i) => ({ x, a: FAILS.a[i], b: FAILS.b[i], c: FAILS.c[i] }))}
              series={[{ key: 'a', name: 'Нефтесборные коллекторы', color: C.s[0] }, { key: 'b', name: 'Водоводы', color: C.s[1] }, { key: 'c', name: 'Напорные нефтепроводы и газопроводы', color: C.s[2] }]} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>2026 — за 10 месяцев</Typography>
          </Box>
        )}
      </TabCard>
      <PipeDrawer x={sel} onClose={() => setSel(null)} planRun={planRun} />
    </>
  );
}
