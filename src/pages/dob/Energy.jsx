// Энергоэффективность — ABAI ПДИМ 2.0 (процесс Д7): УРЭ, потребление по видам потребителей, рейтинг НГДУ,
// предложения по энергосбережению (ПАЭГТМ), данные АСКУЭ / АСТУЭ через КХД; цикл мониторинга по НГДУ — в записи процесса.
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack, Tooltip as MuiTooltip } from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, Hbars } from '../../components/ui.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { last, fmt, sgn, pct, tFmt, dShort } from '../../lib/format.js';
import { C } from '../../theme.js';
import { assetName, Cell2, TabCard } from './_shared2.jsx';
import { MONTHS, FACT, PLAN, CONS, CONS_TOT, RATE, PROPS, PROPS_EFF, PROPS_ECO, FEED, URE_LIMIT, propStage, UreChart } from './energy.data.jsx';
import { RunState, runOf } from './_runs.jsx';

export default function Energy() {
  const { asset, toast, runs } = useApp(); const [tab, setTab] = useState('props');
  const lf = last(FACT);
  const run = runOf(runs, 'Д7', 'en:НГДУ-2'); const stage = propStage(run);
  const pst = (m) => (m.cycle ? stage : [m.st, 'good']);
  return (
    <>
      <PageHeader title="Энергоэффективность" sub={`${assetName(asset)} · отчётный период — октябрь 2026`} sys={[['ABAI ПДИМ 2.0', 'dob']]}
        actions={<Button variant="outlined" onClick={() => toast('Отчёт «Энергоэффективность за октябрь 2026» сформирован в ABAI ПДИМ 2.0', 'info')}>Сформировать отчёт</Button>} />
      <KpiRow items={[
        { label: 'Потребление за октябрь', value: '118,4', unit: 'млн кВт·ч', delta: -2.1, du: '%', good: 'down', d: 'к плану' },
        { label: 'УРЭ на добычу жидкости', value: fmt(lf, 2), unit: 'кВт·ч/т', delta: +(lf - last(PLAN)).toFixed(2), dd: 2, good: 'down', d: 'к плану' },
        { label: 'Средний КПД установок ЭЦН', value: '41,6', unit: '%', delta: 1.8, du: ' п. п.', good: 'up', d: 'с начала года' },
        { label: 'Экономия от мероприятий', value: '9,7', unit: 'млн кВт·ч', d: 'с начала года · 202 млн тг' },
      ]} />
      {run && <Section title="Существенное отклонение УРЭ · НГДУ-2" sub={`факт ${fmt(RATE.find((x) => x.n === 'НГДУ-2').u, 1)} кВт·ч/т при плане ${fmt(RATE.find((x) => x.n === 'НГДУ-2').pl, 1)} · ${sgn(RATE.find((x) => x.n === 'НГДУ-2').dvp, 1)} % (порог ${URE_LIMIT} %)`} sx={{ mb: 2 }}
        info="Процесс Д7: при существенном отклонении на дашборде (7.3а) — анализ причин (7.4.1) с уточнением данных службами НГДУ (7.4.2), предложения (7.5), оценка целесообразности (7.6.1, 7.6.2), программа мероприятий (7.7).">
        <RunState run={run} />
      </Section>}
      <Grid2 cols="minmax(0, 3fr) minmax(0, 2fr)">
        <Section title="Удельный расход электроэнергии" sub={`кВт·ч/т жидкости · ${MONTHS[0]} – ${last(MONTHS)}`} info="Дашборд МЭД в ABAI ПДИМ 2.0 (шаг 7.3а): УРЭ и КПД по данным АСКУЭ / АСТУЭ через КХД.">
          <UreChart />
        </Section>
        <Section title="Потребление по видам потребителей" sub={`октябрь 2026 · ${fmt(CONS_TOT, 1)} млн кВт·ч`}>
          <Hbars max={60} rows={CONS.map(([l, v]) => ({ l, v, c: C.s[0], txt: `${fmt(v, 1)} млн`, tip: `${l}: ${fmt(v, 1)} млн кВт·ч · ${pct((v / CONS_TOT) * 100)}` }))} />
        </Section>
      </Grid2>
      <TabCard value={tab} onChange={setTab} tabs={[['props', 'Предложения по энергосбережению'], ['rate', 'Рейтинг НГДУ'], ['feed', 'Данные АСКУЭ / АСТУЭ']]}>
        {tab === 'props' && <>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 2, pt: 1.5, fontSize: 12.5, color: 'text.secondary' }}>
            <span>Итого эффект {fmt(PROPS_EFF, 1)} млн кВт·ч/год · {fmt(PROPS_ECO)} млн тг/год · предложения по НГДУ-2 проходят оценку и включение в программу в процессе</span>
            <MuiTooltip title="Оценка технической и экономической целесообразности — ABAI ПАЭГТМ; программа мероприятий включается в производственную программу."><InfoOutlined sx={{ fontSize: 16, color: '#a3aab6', cursor: 'help' }} /></MuiTooltip>
          </Stack>
          <DataTable rows={PROPS} columns={[
            { field: 't', headerName: 'Мероприятие', minWidth: 320, flex: 2, renderCell: (p) => <Cell2 a={p.row.t} b={p.row.obj} /> },
            { field: 'eff', headerName: 'Эффект, млн кВт·ч/год', type: 'number', width: 170, valueFormatter: (v) => fmt(v, 1) },
            { field: 'eco', headerName: 'Экономия, млн тг/год', type: 'number', width: 165, valueFormatter: (v) => fmt(v) },
            { field: 'pb', headerName: 'Окупаемость, лет', type: 'number', width: 140, valueFormatter: (v) => fmt(v, 1) },
            { field: 'st', headerName: 'Статус', minWidth: 230, valueGetter: (v, r) => pst(r)[0], renderCell: (p) => <StatusChip tone={pst(p.row)[1]} label={pst(p.row)[0]} /> },
          ]} />
        </>}
        {tab === 'rate' && (
          <DataTable rows={RATE} columns={[
            { field: 'n', headerName: 'НГДУ', minWidth: 140, flex: 1, renderCell: (p) => <b>{p.row.rank}. {p.value}</b> },
            { field: 'u', headerName: 'УРЭ, кВт·ч/т', type: 'number', width: 140, valueFormatter: (v) => fmt(v, 1) },
            { field: 'pl', headerName: 'План', type: 'number', width: 110, valueFormatter: (v) => fmt(v, 1) },
            { field: 'dvp', headerName: 'Отклонение, %', type: 'number', width: 140, renderCell: (p) => <Box sx={{ width: '100%', textAlign: 'right', fontWeight: 600, color: p.value > URE_LIMIT ? 'error.main' : p.value > 0 ? 'warning.main' : 'success.main' }}>{sgn(p.value, 1)}</Box> },
            { field: 'eff', headerName: 'КПД ЭЦН, %', type: 'number', width: 130, valueFormatter: (v) => fmt(v, 1) },
          ]} />
        )}
        {tab === 'feed' && <>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 2, pt: 1.5, fontSize: 12.5, color: 'text.secondary' }}>
            <span>Часовые профили: АСКУЭ / АСТУЭ → КХД → ABAI БД 2.0 → ABAI ПДИМ 2.0</span>
            <Box component={RouterLink} to="/m/data/khd" sx={{ color: 'primary.main', textDecoration: 'none', ml: 1 }}>Интеграции КХД →</Box>
          </Stack>
          <DataTable rows={FEED} columns={[
            { field: 'o', headerName: 'Объект учёта', minWidth: 240, flex: 2 },
            { field: 'src', headerName: 'Источник', width: 110 },
            { field: 't', headerName: 'Последний профиль', width: 160, valueFormatter: (v) => `${dShort(v)}, ${tFmt(v)}` },
            { field: 'cos', headerName: 'cos φ', type: 'number', width: 100, renderCell: (p) => <Box sx={{ width: '100%', textAlign: 'right', color: p.value < 0.85 ? 'error.main' : 'inherit', fontWeight: p.value < 0.85 ? 600 : 400 }}>{fmt(p.value, 2)}</Box> },
            { field: 'ok', headerName: 'Обмен', width: 160, renderCell: (p) => (p.value ? <StatusChip tone="good" label="Получено" /> : <StatusChip tone="warn" label="Нет данных 5 ч" />) },
          ]} />
        </>}
      </TabCard>
    </>
  );
}
