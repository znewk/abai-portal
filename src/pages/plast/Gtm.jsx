// ЦД пласта · ABAI ПАЭГТМ: программа ГТМ (Р2) — маршрут согласования, структура по видам, план-факт эффекта, скважины-кандидаты.
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Box, Typography, Stack, Card, Tabs, Tab, Select, MenuItem } from '@mui/material';
import { PageHeader, KpiRow, Section, StatusChip, Hbars } from '../../components/ui.jsx';
import { BarsChart } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { rng, series, sum, fmt, plural, MON, MONF, dFmt, dAdd, tFmt, TODAY } from '../../lib/format.js';
import { C } from '../../theme.js';
import { useNavigate } from 'react-router-dom';
import { PL_GTM, PL_GTM_T, PL_GTM_ST, PL_ST, WellLink } from './_shared.jsx';
import { RunRoute, RunAction, runNow, stepState } from '../process/forms/widgets.plast.jsx';
import { runPath } from '../../data/exec.js';

// Маршрут годовой программы по шагам записи процесса «Программа ГТМ»
const ROUTE = [['2.4.2', 'Предложения по годовому объёму'], ['2.5', 'Расчёт ожидаемого эффекта'], ['2.6', 'Согласование эффекта'], ['2.7.1', 'Экспертиза эффекта'], ['2.7.2', 'Экспертиза эффекта'], ['2.8', 'Экономическая оценка'], ['2.10', 'Проект годовой программы'], ['2.11', 'Согласование проекта'], ['2.12', 'Включение в ПП']];

export default function Gtm() {
  const { role, runs } = useApp(); const nav = useNavigate(); const [ft, setFt] = useState('all'); const [tab, setTab] = useState('cand');
  const run = runs.find((r) => r.p === 'Р2' && r.obj.id === 'prog:gtm-2027');
  // Статусы кандидатов — из состояния записи: пока идёт экспертиза эффекта, кандидаты «на проверке»; после неё — включены
  const expDone = run && ['2.7.1', '2.7.2'].every((c) => stepState(run, c) === 'done');
  const stOf = (g) => PL_ST.gtm[g.id] || (g.st0 === 'check' && expDone ? 'incl' : g.st0);
  const rows = PL_GTM.map((g) => ({ ...g, st: stOf(g) })).filter((g) => ft === 'all' || g.t === ft);
  const n = sum(PL_GTM_T.map((t) => t[1])), q = sum(PL_GTM_T.map((t) => t[2]));
  const pl = series('pl-gtm-plan', 10, 31, 0.08, 0.25).map((v) => +v.toFixed(1)); const fa = pl.map((v, i) => +(v * (0.86 + rng('pl-gtm-f' + i)() * 0.22)).toFixed(1));
  const nCheck = rows.filter((g) => g.st === 'check').length;

  const cols = [
    { field: 'w', headerName: 'Скважина', width: 150, renderCell: ({ row }) => (row.well ? <b><WellLink id={row.w} /></b> : <Box><b>{row.w}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>проектная точка</Typography></Box>) },
    { field: 't', headerName: 'Вид ГТМ', flex: 1, minWidth: 150, renderCell: ({ row }) => <Box>{row.t}<Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.ngdu}</Typography></Box> },
    { field: 'q', headerName: 'Прирост, т/сут', type: 'number', width: 130, renderCell: ({ value }) => (value ? '+' + fmt(value, 1) : <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>компенсация</Typography>) },
    { field: 'npv', headerName: 'NPV, млн тг', type: 'number', width: 110, renderCell: ({ value }) => <Box component="span" sx={{ color: value < 25 ? 'error.main' : 'inherit', fontWeight: value < 25 ? 600 : 400 }}>{fmt(value)}</Box> },
    { field: 'st', headerName: 'Статус', width: 220, valueGetter: (v) => PL_GTM_ST[v][0], renderCell: ({ row }) => <StatusChip tone={PL_GTM_ST[row.st][1]} label={PL_GTM_ST[row.st][0]} /> },
  ];
  return (
    <>
      <PageHeader title="Программа ГТМ" sys={[['ABAI ПАЭГТМ', 'plast']]}
        sub={`Программа ГТМ на 2027 год · проект от ${dFmt(dAdd(-2))} · ОМГ`}
        actions={run ? <Button variant="outlined" onClick={() => nav(runPath(run))}>Открыть в процессе</Button> : null} />
      <KpiRow items={[
        { label: 'Мероприятий в программе 2027', value: fmt(n), d: `${PL_GTM_T.length} видов ГТМ` },
        { label: 'Ожидаемая дополнительная добыча', value: fmt(q, 1), unit: 'тыс. т', d: expDone ? 'эффект подтверждён экспертизой' : `на экспертизе КазНИПИ и КМГИ · ${nCheck} мероприятий` },
        { label: 'NPV программы', value: '48,7', unit: 'млрд тг', d: 'по нормативам затрат' },
        { label: 'Эффект ГТМ 2026', value: fmt(sum(fa), 1), unit: 'тыс. т', delta: (sum(fa) / sum(pl) - 1) * 100, du: '%', good: 'up', d: 'к плану, 318 из 342 ГТМ' },
      ]} />
      <Section title="Согласование программы" sx={{ mb: 2 }}
        info="Маршрут записи Р2-2026-039: ОМГ (ДЗО) → экспертиза эффекта КазНИПИ и КМГИ параллельно → экономическая оценка → проект программы → включение в ПП. Каждое действие выполняется в форме шага записи; подпись ЭЦП — в форме."
        action={run ? <RunAction run={run} label="Подписать ЭЦП и передать" doneLabel="Включена в производственную программу" /> : null}>
        {run ? <><RunRoute run={run} codes={ROUTE} />
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1.5 }}>{runNow(run)}</Typography></>
          : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Запись процесса по программе ГТМ на 2027 год не найдена — запустите процесс в разделе процессов ЦД пласта.</Typography>}
      </Section>
      <Card>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ flex: 1 }}>
            <Tab value="cand" label={`Кандидаты · ${PL_GTM.length}`} /><Tab value="mix" label="Структура программы" /><Tab value="pf" label="План и факт 2026" />
          </Tabs>
          {tab === 'cand' && <Select size="small" value={ft} onChange={(e) => setFt(e.target.value)} sx={{ minWidth: 200, fontSize: 13 }}>
            <MenuItem value="all">Все виды ГТМ</MenuItem>{PL_GTM_T.map((t) => <MenuItem key={t[0]} value={t[0]}>{t[0]}</MenuItem>)}
          </Select>}
        </Stack>
        {tab === 'cand' && <Box sx={{ py: 1 }}><Typography sx={{ px: 2, pb: 1, fontSize: 12.5, color: 'text.secondary' }}>Кандидаты включаются в программу при формировании проекта годовой программы; статусы обновляются по ходу согласования.</Typography><DataTable rows={rows} columns={cols} search pageSize={10} /></Box>}
        {tab === 'mix' && (
          <Box sx={{ p: 2, maxWidth: 820 }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1.5 }}>Ожидаемая дополнительная добыча по видам ГТМ, тыс. т</Typography>
            <Hbars labelW="40%" rows={PL_GTM_T.map(([t, cn, e]) => ({ l: `${t} · ${cn} мер.`, v: e, c: C.s[0], txt: fmt(e, 1) }))} />
          </Box>
        )}
        {tab === 'pf' && (
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>Эффект ГТМ, тыс. т · январь – {MONF[9]} {TODAY.getFullYear()} · отчёт «Выполнение ОТМ» (ПДИМ 2.0)</Typography>
            <BarsChart height={270} unit="тыс. т" dd={1} data={MON.slice(0, 10).map((x, i) => ({ x, fa: fa[i], pl: pl[i] }))} series={[{ key: 'fa', name: 'Факт', color: C.s[0] }]} plan={{ key: 'pl', name: 'План' }} />
          </Box>
        )}
      </Card>
    </>
  );
}
