// Суточная добыча (Д1): 4 показателя → график факт / план / прогноз и сводка за сутки → добыча по подразделениям.
import { Button, Box, Stack, Typography, Divider } from '@mui/material';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, Code } from '../../components/ui.jsx';
import { TrendChart } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { useNavigate } from 'react-router-dom';
import { runPath } from '../../data/exec.js';
import { PROD } from '../../data/core.js';
import { fmt, sgn, pct, sum, avg, last, rng, dFmt, dAdd } from '../../lib/format.js';
import { C } from '../../theme.js';
import { seriesOf, assetName, assetK, NGDU_SHARE, useStore, num, fixMean } from './_shared1.jsx';

// Этапы Д1: [код, этап, исполнитель]
const D1 = [
  ['1.1', 'Замеры цехов и анализ проб', 'Цеха НГДУ, лаборатория'],
  ['1.2', 'Консолидация суточных данных', 'ЦИТС НГДУ'],
  ['1.2а', 'Загрузка в КХД и проверка качества', 'ДОУП'],
  ['1.5', 'Верификация источников', 'ДОУП'],
  ['1.7', 'Подтверждение данных для сводки', 'ДОУП'],
  ['1.8', 'Сводка ДЗО в КМГ через КХД', 'ДОУП'],
];
// Замечания проверок качества (без замечаний — 3 проверки из 5)
const QC_ISSUES = [
  ['Расхождение АГЗУ и лаборатории', 'НГДУ-3: 11 скважин, более 5 п. п.'],
  ['Нет параметров СДМС за сутки', '14 скважин · ошибка обмена СДМС → КХД'],
];

function rowsOf(asset, P) {
  const i = PROD.nF - 1; const r = rng('ngdu-' + asset);
  if (asset === 'all') return [['АО «Озенмунайгаз»', PROD.omg], ['АО «Эмбамунайгаз»', PROD.emg]].map(([n, X]) => ({ id: n, n, plan: X.plan[i], fact: X.fact[i], wc: last(X.wc) }));
  const parts = NGDU_SHARE[asset].map(([n, sh]) => { const f = 1 + (r() - 0.55) * 0.04; return { id: n, n, plan: Math.round(P.plan[i] * sh), fact: Math.round(P.fact[i] * sh * f), wc: +(last(P.wc) + (r() - 0.5) * 4).toFixed(1) }; });
  parts[0].fact += P.fact[i] - sum(parts.map((x) => x.fact));
  return fixMean(parts, last(P.wc));
}

// Сводка за сутки: статус, этапы Д1, замечания проверок, подтверждение
function DaySummary({ done, onConfirm, run, nav }) {
  const codes = run ? run.active.map((a) => run.P.s[a.i].c) : []; const stepIdx = (c) => D1.findIndex(([x]) => x === c);
  const cur = run ? (run.status === 'done' ? D1.length : Math.max(0, ...codes.map((c) => (c === '1.6' ? 3 : c === '1.5.1' || c === '1.6.1' ? 3 : stepIdx(c))).filter((i) => i >= 0))) : done ? D1.length : 4;
  return (
    <Section title="Сводка за сутки" sub={dFmt(dAdd(-1))}
      info="Процесс Д1 «Учёт добычи УВ, контроль промысловых параметров»: замеры цехов и лаборатории → БД 2.0, данные СДМС, SCADA, ИСУ → КХД (1.2а), проверка полноты и расхождений в ПДИМ 2.0, подтверждение ДОУП с ЭЦП (1.7), сводка в КМГ через КХД (1.8).">
      <StatusChip tone={run && run.status !== 'done' ? (run.late ? 'crit' : 'warn') : 'good'} label={run && run.status !== 'done' ? `${run.P.s[run.active[0].i].t} · ${run.lanes.join(', ')}${run.late ? ' · срок нарушен' : ''}` : 'Подтверждена и передана в КМГ'} sx={{ fontSize: 13.5 }} />
      <Stack spacing={0.9} sx={{ mt: 2 }}>
        {D1.map(([c, t, who], j) => {
          const st = j < cur ? 'done' : j === cur ? 'cur' : 'next';
          return (
            <Stack key={c} direction="row" spacing={1.25} alignItems="center" sx={{ fontSize: 13, color: st === 'next' ? 'text.secondary' : 'text.primary', fontWeight: st === 'cur' ? 600 : 400 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', flex: 'none', bgcolor: st === 'done' ? C.good : st === 'cur' ? C.brand : '#fff', border: '2px solid', borderColor: st === 'done' ? C.good : st === 'cur' ? C.brand : '#c3c7cf' }} />
              <Box sx={{ width: 36, flex: 'none' }}><Code>{c}</Code></Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>{t}</Box>
              {st === 'cur' && <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>{who}</Typography>}
            </Stack>
          );
        })}
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>Проверки качества: 3 из 5 без замечаний</Typography>
      <Stack spacing={1}>
        {QC_ISSUES.map(([t, s]) => (
          <Box key={t}><StatusChip tone="warn" label={t} /><Typography sx={{ fontSize: 12, color: 'text.secondary', pl: 1.75 }}>{s}</Typography></Box>
        ))}
      </Stack>
      {run && run.status !== 'done' && <Button fullWidth variant="contained" sx={{ mt: 2.5 }} onClick={() => nav(runPath(run))}>Открыть сводку в процессе</Button>}
    </Section>
  );
}

export default function Daily() {
  const { asset, toast, sign, runs } = useApp(); const [S, upd] = useStore(); const nav = useNavigate();
  const run = runs.find((r) => r.p === 'Д1' && r.status === 'active' && r.obj.id === (asset === 'all' ? 'sum:ДЗО:02.11' : 'sum:НГДУ-1:02.11')) || runs.find((r) => r.p === 'Д1' && r.status === 'active');
  const P = seriesOf(asset); const i = PROD.nF - 1; const k = assetK(asset); const done = !!S.confirmed[asset];
  const dv = (f, p) => ((f - p) / p) * 100;
  const liqPlan = Math.round(P.liq[i] * 1.008), injPlan = Math.round(128000 * k);
  const kpis = [
    { label: 'Нефть за сутки', value: fmt(P.fact[i]), unit: 'т', delta: dv(P.fact[i], P.plan[i]), du: '%', good: 'up', d: `к плану ${fmt(P.plan[i])} т`, spark: P.fact.slice(-14) },
    { label: 'Жидкость', value: fmt(P.liq[i]), unit: 'м³', delta: dv(P.liq[i], liqPlan), du: '%', good: 'up', d: 'к плану' },
    { label: 'Закачка воды', value: fmt(P.inj[i]), unit: 'м³', delta: dv(P.inj[i], injPlan), du: '%', good: 'up', d: 'к плану' },
    { label: 'Обводнённость', value: fmt(last(P.wc), 1), unit: '%', d: 'лаборатория и АГЗУ' },
  ];
  const data = PROD.labels.map((x, j) => ({
    x, fact: j < PROD.nF ? P.fact[j] : null, plan: P.plan[j],
    fc: j === i ? P.fact[i] : j > i ? P.fc[j - PROD.nF] : null,
    lo: j === i ? P.fact[i] : j > i ? P.lo[j - PROD.nF] : null, hi: j === i ? P.fact[i] : j > i ? P.hi[j - PROD.nF] : null,
  }));
  const rows = rowsOf(asset, P);
  const tot = { id: '_tot', n: 'Итого', plan: sum(rows.map((x) => x.plan)), fact: sum(rows.map((x) => x.fact)), wc: +avg(rows.map((x) => x.wc)).toFixed(1), tot: true };
  const cols = [
    { field: 'n', headerName: asset === 'all' ? 'ДЗО' : 'Подразделение', flex: 1.6, renderCell: (p) => (p.row.tot ? <b>{p.value}</b> : p.value) },
    num('plan', 'План, т'), num('fact', 'Факт, т', 0, { renderCell: (p) => <b>{fmt(p.value)}</b> }),
    { field: 'dev', headerName: 'Отклонение, т', type: 'number', align: 'right', headerAlign: 'right', valueGetter: (v, r) => r.fact - r.plan, renderCell: (p) => <Box component="span" sx={{ color: p.value >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>{sgn(p.value)}</Box> },
    { field: 'ex', headerName: 'Выполнение', type: 'number', align: 'right', headerAlign: 'right', valueGetter: (v, r) => (r.fact / r.plan) * 100, valueFormatter: (v) => pct(v) },
    num('wc', 'Обводнённость, %', 1),
  ];
  const confirm = () => sign(`Суточная сводка добычи ${assetName(asset)} за ${dFmt(dAdd(-1))} · Д1, этап 1.7 «Подтверждение данных для сводки».`, () => { S.confirmed[asset] = true; upd(); toast('Сводка подтверждена и передана в КМГ через КХД (Д1 1.8)'); });
  return (
    <>
      <PageHeader title="Суточная добыча" sub={`${assetName(asset)} · отчётные сутки ${dFmt(dAdd(-1))}`} sys={[['ABAI ПДИМ 2.0', 'dob']]}
        actions={<Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={() => toast('Суточная сводка выгружена (.xlsx)')}>Выгрузить</Button>} />
      <KpiRow items={kpis} />
      <Grid2 cols="2fr 1fr">
        <Section title="Добыча нефти" sub="т/сут · 60 суток факта, прогноз на 30 суток"
          info="Факт и план — ABAI ПДИМ 2.0; прогноз — расчёт ПДИМ 2.0 на режимах ТР 2.0, коридор P10–P90. 48–49 сутки — плановая остановка ДНС-3.">
          <TrendChart data={data} height={360} unit="т" fcFrom={PROD.labels[i]} fcLabel="Прогноз"
            series={[{ key: 'fact', name: 'Факт', color: C.s[0] }, { key: 'plan', name: 'План', color: '#8a8f99', dash: true, width: 1.5 }, { key: 'fc', name: 'Прогноз', color: C.s[0], dash: true }]}
            band={{ lo: 'lo', hi: 'hi', name: 'Коридор P10–P90' }} marks={[{ x: PROD.labels[47], label: 'Остановка ДНС-3' }]} />
        </Section>
        <DaySummary done={done} onConfirm={confirm} run={run} nav={nav} />
      </Grid2>
      <Section title={asset === 'all' ? 'Добыча по ДЗО' : 'Добыча по подразделениям'} sub={`за ${dFmt(dAdd(-1))}`} flush info="План — производственная программа ДЗО.">
        <DataTable rows={rows.concat([tot])} columns={cols} getRowClassName={(p) => (p.row.tot ? 'tot' : '')} disableColumnMenu sx={{ '& .tot': { bgcolor: '#f8f9fb', fontWeight: 600 } }} />
      </Section>
    </>
  );
}
