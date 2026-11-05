// Среднесрочный профиль добычи (Р3): 3 показателя → профиль по компонентам и маршрут согласования → варианты и коэффициенты во вкладках.
import { useState } from 'react';
import { Button, Box, Card, Tabs, Tab, Stack, Typography } from '@mui/material';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, Code, Demo } from '../../components/ui.jsx';
import { StackChart, TrendChart } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { fmt, pct, sum, dFmt } from '../../lib/format.js';
import { C } from '../../theme.js';
import { assetName, assetK, num } from './_shared1.jsx';
import { YEARS, FC, profile, variants, coefs, sum5 } from './profile.data.js';
import { stepState, RunAction, runNow } from '../process/forms/widgets.plast.jsx';
import { dueText, nowDemo } from '../../data/exec.js';

// Маршрут согласования профиля: шаги записи процесса «Профиль добычи»
const ROUTE = [['3.12', 'Интегральный профиль в ПДИМ 2.0'], ['3.13.1', 'Проверка профиля'], ['3.13.2', 'Согласование'], ['3.13.3', 'Согласование'], ['3.14', 'Утверждение, передача в бизнес-план и производственную программу']];

function Route({ run }) {
  const now = nowDemo();
  return (
    <Stack spacing={1.5}>
      {ROUTE.map(([c, t]) => {
        const st0 = stepState(run, c); const st = st0 === 'wait' ? 'cur' : st0; const s = run && run.P.s.find((x) => x.c === c);
        const a = run && run.active.find((q) => run.P.s[q.i].c === c); const d = run && [...run.done].reverse().find((q) => run.P.s[q.i].c === c);
        return (
          <Stack key={c} direction="row" spacing={1.25} alignItems="flex-start">
            <Box sx={{ mt: 0.5, width: 10, height: 10, borderRadius: '50%', flex: 'none', bgcolor: st === 'done' ? C.good : st === 'cur' ? C.brand : '#fff', border: '2px solid', borderColor: st === 'done' ? C.good : st === 'cur' ? C.brand : '#c3c7cf' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: st === 'cur' ? 600 : 500, color: st === 'next' ? 'text.secondary' : 'text.primary' }}>{s ? s.r : ''} · {t}<Demo>{c}</Demo></Typography>
              <Typography sx={{ fontSize: 12, color: a && a.due < now ? 'error.main' : 'text.secondary' }}>{st === 'done' ? (d ? `выполнено ${dFmt(d.at)}` : 'выполнено') : st === 'cur' ? (a ? `в работе · ${dueText(a.due, now)}` : 'ожидает завершения параллельных согласований') : 'ожидает'}</Typography>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

export default function Profile() {
  const { asset, runs } = useApp(); const [tab, setTab] = useState('var'); const k = assetK(asset);
  const p = profile(k, 0); const VV = variants(k); const V = VV.map((x) => x.p);
  const run = runs.find((r) => r.p === 'Р3' && r.obj.id === 'prof:2027-2031' && r.status === 'active') || runs.find((r) => r.p === 'Р3' && r.obj.id === 'prof:2027-2031');
  const done = run && run.status === 'done'; const curN = run ? ROUTE.findIndex(([c]) => stepState(run, c) !== 'done') : 0;
  const kf = coefs(k).filter((x) => x.kp != null);
  const avgKp = sum(kf.filter((x) => +x.y > 2027).map((x) => x.kp)) / kf.filter((x) => +x.y > 2027).length;
  const stack = YEARS.map((x, i) => ({ x, base: p.base[i], gtm: p.gtm[i], vns: p.vns[i], mun: p.mun[i] }));
  const vdata = YEARS.slice(FC - 1).map((x, j) => ({ x, v0: V[0].tot[j + FC - 1], v1: V[1].tot[j + FC - 1], v2: V[2].tot[j + FC - 1] }));
  const vrows = VV.map((x) => ({ id: x.id, name: x.name, prod: x.prod, capex: x.capex, npv: x.npv }));
  return (
    <>
      <PageHeader title="Профиль добычи на 5 лет" sub={`${assetName(asset)} · 2027–2031 · вариант 1, версия 3`} sys={[['ABAI ПДИМ 2.0', 'dob']]}
        actions={run ? <RunAction run={run} codes={['3.13.1', '3.13.2', '3.13.3', '3.14']} label="Согласовать в процессе" size="medium" doneLabel="Профиль утверждён" /> : null} />
      <KpiRow items={[
        { label: 'Добыча 2027–2031', value: fmt(sum5(p)), unit: 'тыс. т', d: 'интегральный профиль' },
        { label: 'Коэффициент падения базовой добычи', value: fmt(avgKp, 3), d: `среднегодовой на 2028–2031 · ${fmt((1 - avgKp) * 100, 1)} % в год` },
        { label: 'Доля ГТМ, ввода скважин и МУН в 2031', value: pct(((p.gtm[9] + p.vns[9] + p.mun[9]) / p.tot[9]) * 100), d: 'в общем объёме' },
      ]} />
      <Grid2 cols="2fr 1fr">
        <Section title="Профиль по компонентам" sub="тыс. т/год"
          info="2022–2025 — факт, 2026 — оценка, 2027–2031 — прогноз ПДИМ 2.0. Базовая добыча — по коэффициентам падения и эксплуатации (БД 2.0); ГТМ — программа ГТМ (Р2, ПАЭГТМ); ВНС — ковёр бурения (Б1); МУН — опытно-промышленные работы. Процесс Р3, шаги 3.3–3.12.">
          <StackChart data={stack} height={340} unit="тыс. т" fcFrom="2027" fcLabel="Прогноз"
            series={[{ key: 'base', name: 'Базовая', color: C.s[0] }, { key: 'gtm', name: 'ГТМ', color: C.s[1] }, { key: 'vns', name: 'Ввод новых скважин', color: C.s[2] }, { key: 'mun', name: 'МУН и новые технологии', color: C.s[3] }]} />
        </Section>
        <Section title="Согласование" sub={done ? 'завершено' : `этап ${Math.max(1, curN + 1)} из ${ROUTE.length}`} info="Маршрут процесса Р3: 3.12 → 3.13.1, 3.13.2, 3.13.3 параллельно → 3.14; согласования подписываются ЭЦП в форме шага.">
          <Route run={run} />
          {run && !done && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5 }}>{runNow(run)}</Typography>}
        </Section>
      </Grid2>
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="var" label="Варианты профиля" /><Tab value="kf" label="Коэффициенты по годам" />
        </Tabs>
        {tab === 'var' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
            <Box sx={{ px: 2, pt: 2 }}>
              <TrendChart data={vdata} height={250} unit="тыс. т" xInterval={0}
                series={[{ key: 'v0', name: 'Вариант 1', color: C.s[0] }, { key: 'v1', name: 'Вариант 2', color: C.s[1] }, { key: 'v2', name: 'Вариант 3', color: C.s[2] }]} />
            </Box>
            <DataTable rows={vrows} disableColumnMenu columns={[
              { field: 'name', headerName: 'Вариант', flex: 2 },
              num('prod', 'Добыча, тыс. т', 0, { flex: 1 }), num('capex', 'CAPEX, млрд тг', 1), num('npv', 'NPV, млрд тг', 1),
            ]} />
          </Box>
        )}
        {tab === 'kf' && (
          <DataTable rows={kf} disableColumnMenu columns={[
            { field: 'y', headerName: 'Год', flex: 0.6 }, { field: 'kind', headerName: 'Тип', flex: 0.6 },
            num('kp', 'Коэффициент падения', 3), num('ke', 'Коэффициент эксплуатации', 3), num('tot', 'Добыча, тыс. т'),
          ]} />
        )}
      </Card>
    </>
  );
}
