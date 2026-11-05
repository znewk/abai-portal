// Виджеты форм сейсморазведочных работ (Г3.1–Г3.3) и карточки объекта «сейсморазведка»: ход полевых работ план/факт,
// покрытие площади, качество полевых данных, опытные работы, этапы обработки и интерпретации, перспективные зоны.
// Данные — plast/seis.data.js (те же, что в атрибутах объектов).
import { Box, Stack, Typography } from '@mui/material';
import { KV, StatusChip, Meter } from '../../../components/ui.jsx';
import { BarsChart } from '../../../components/charts.jsx';
import DataTable from '../../../components/DataTable.jsx';
import { useApp } from '../../../state.jsx';
import { fmt, dFmt, dShort } from '../../../lib/format.js';
import { C } from '../../../theme.js';
import { survey, FIELD_DAYS, fieldTotals, COND_MIN, TRIAL, PROD_PARAMS, PROC_STAGES, PROC_START, INT_STAGES, INT_START, stageRows, ST_T, ZONES, zonesTotal, HORIZONS, TIE, pvTotal } from '../../plast/seis.data.js';

const Sub = ({ children }) => <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2, mb: 0.75 }}>{children}</Typography>;
const Tile = ({ l, v, d, tone }) => (
  <Box sx={{ border: '1px solid #e3e7ee', borderRadius: 1.5, px: 1.5, py: 1 }}>
    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{l}</Typography>
    <Typography sx={{ fontSize: 18, fontWeight: 700, color: tone === 'crit' ? 'error.main' : tone === 'warn' ? 'warning.dark' : 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{v}</Typography>
    {d && <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{d}</Typography>}
  </Box>
);

// Итоги полевых работ: выполнено, план на дату, отставание, кондиционные записи
export function FieldTiles({ id }) {
  const sv = survey(id); const t = fieldTotals(id);
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, mt: 1 }}>
      <Tile l="Выполнено" v={`${fmt(t.done, 1)} км²`} d={`${t.pct} % из ${fmt(sv.area)} км²`} />
      <Tile l="План на дату" v={`${fmt(t.plan, 1)} км²`} d={`${fmt(sv.rate, 1)} км² в сутки`} />
      <Tile l="Отставание от графика" v={`${fmt(t.lag, 1)} км²`} d={t.end ? `окончание ${dFmt(t.end)}, по графику ${dFmt(t.endPlan)}` : ''} tone={t.lag > 0 ? 'warn' : ''} />
      <Tile l="Кондиционных записей" v={`${fmt(t.cond, 1)} %`} d={`допуск не менее ${COND_MIN} %`} />
    </Box>
  );
}

// Ход производственных работ по суточным сводкам: факт за сутки и план
export function FieldProgressWidget({ id, chart = true }) {
  const sv = survey(id);
  if (sv.stage !== 'field') return <FieldTiles id={id} />;
  const data = FIELD_DAYS.map((x) => ({ x: dShort(x.date), fact: x.fact, plan: x.plan }));
  return (
    <Box>
      <FieldTiles id={id} />
      {chart && <>
        <Sub>Суточные сводки · км² за сутки</Sub>
        <BarsChart height={210} unit="км²" dd={1} data={data} series={[{ key: 'fact', name: 'Факт за сутки', color: C.s[0] }]} plan={{ key: 'plan', name: 'План' }} />
      </>}
    </Box>
  );
}

// Покрытие площади съёмки: ячейка — 1 км²; выполнено · план на дату · осталось
export function CoverageMap({ id }) {
  const sv = survey(id); const t = fieldTotals(id); const cols = 15; const rows = Math.ceil(sv.area / cols); const cs = 16;
  const done = Math.round(t.done); const plan = Math.round(t.plan);
  const cells = Array.from({ length: sv.area }, (_, k) => { const r = Math.floor(k / cols); const c0 = k % cols; const c = r % 2 ? cols - 1 - c0 : c0; return { r, c, st: k < done ? 'done' : k < plan ? 'lag' : 'left' }; });
  const col = { done: C.s[0], lag: '#f6c06b', left: '#e9edf2' };
  return (
    <Box>
      <svg width={cols * cs + 2} height={rows * cs + 2} style={{ display: 'block', maxWidth: '100%' }} role="img" aria-label="Покрытие площади съёмки">
        {cells.map((x, k) => <rect key={k} x={1 + x.c * cs} y={1 + x.r * cs} width={cs - 2} height={cs - 2} rx={2} fill={col[x.st]} />)}
      </svg>
      <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, mt: 1, fontSize: 12, color: 'text.secondary' }}>
        {[['done', `Выполнено · ${fmt(t.done, 1)} км²`], ['lag', `Отставание · ${fmt(t.lag, 1)} км²`], ['left', `Осталось по графику · ${fmt(sv.area - Math.max(t.plan, t.done), 1)} км²`]].map(([k, l]) => <Stack key={k} direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: col[k] }} /><span>{l}</span></Stack>)}
      </Stack>
    </Box>
  );
}

// Качество полевых данных по суткам
export function FieldQualityWidget({ id }) {
  const sv = survey(id);
  if (sv.stage !== 'field') return null;
  const data = FIELD_DAYS.filter((x) => x.cond != null).map((x) => ({ x: dShort(x.date), cond: x.cond, min: COND_MIN }));
  return (
    <Box>
      <Sub>Доля кондиционных записей по суткам, %</Sub>
      <BarsChart height={200} unit="%" dd={1} data={data} series={[{ key: 'cond', name: 'Кондиционные записи', color: C.s[2] }]} plan={{ key: 'min', name: 'Допуск' }} colorBy={(d) => (d.cond < COND_MIN ? C.crit : null)} />
    </Box>
  );
}

// Опытные работы: параметры вариантов и результаты
export function TrialWidget({ results = true }) {
  const params = TRIAL.params.map(([p, a, b, c], k) => ({ id: k + 1, p, a, b, c }));
  return (
    <Box>
      <Sub>Варианты параметров · {TRIAL.profiles} опытных профиля, {TRIAL.km} км</Sub>
      <DataTable rows={params} pageSize={0} columns={[{ field: 'p', headerName: 'Параметр', flex: 1, minWidth: 180 }, { field: 'a', headerName: 'Вариант А', width: 110 }, { field: 'b', headerName: 'Вариант Б', width: 110 }, { field: 'c', headerName: 'Вариант В', width: 110 }]} />
      {results && <>
        <Sub>Результаты опытных работ</Sub>
        <DataTable rows={TRIAL.res.map((x, k) => ({ id: k + 1, ...x }))} pageSize={0} getRowClassName={(p) => (p.row.rec ? 'sel' : '')} columns={[
          { field: 'v', headerName: 'Вариант', width: 130, renderCell: (p) => <Box><b>{p.value}</b>{p.row.rec && <Typography sx={{ fontSize: 12, color: 'success.main' }}>рекомендуемый</Typography>}</Box> },
          { field: 'sn', headerName: 'Сигнал/помеха', type: 'number', width: 120, valueFormatter: (v) => fmt(v, 1) },
          { field: 'band', headerName: 'Частотный диапазон', width: 150 },
          { field: 'depth', headerName: 'Прослеживание до горизонта', width: 140 },
          { field: 'cost', headerName: 'Стоимость, % к варианту А', type: 'number', flex: 1, minWidth: 130 },
        ]} />
      </>}
    </Box>
  );
}
export const prodParams = () => PROD_PARAMS;

// Этапы обработки или интерпретации: плановые сроки и состояние по записи процесса
export function StagesWidget({ kind = 'proc', run, title }) {
  const rows = kind === 'proc' ? stageRows(PROC_STAGES, PROC_START, run) : stageRows(INT_STAGES, INT_START, run);
  return (
    <Box>
      <Sub>{title || (kind === 'proc' ? 'Этапы обработки · график' : 'Этапы интерпретации · график')}</Sub>
      <DataTable rows={rows} pageSize={0} getRowClassName={(p) => (p.row.st === 'cur' ? 'sel' : '')} columns={[
        { field: 't', headerName: 'Этап', flex: 1, minWidth: 220, renderCell: (p) => <Box><b>{p.value}</b>{p.row.out && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.row.out}</Typography>}</Box> },
        { field: 'from', headerName: 'По графику', width: 180, valueFormatter: (v, r) => `${dFmt(r.from)} – ${dFmt(r.to)}` },
        ...(kind === 'int' ? [{ field: 'ffrom', headerName: 'Факт', width: 180, valueFormatter: (v, r) => (r.st === 'done' && r.ffrom ? `${dFmt(r.ffrom)} – ${dFmt(r.fto)}` : '') }] : []),
        { field: 'st', headerName: 'Состояние', width: 130, renderCell: (p) => <StatusChip tone={ST_T[p.value][1]} label={ST_T[p.value][0]} /> },
      ]} />
    </Box>
  );
}

// Перспективные зоны по результатам интерпретации
export function ZonesWidget() {
  const z = zonesTotal();
  return (
    <Box>
      <Sub>Перспективные зоны · {z.n} · {fmt(z.area, 1)} км² · {fmt(z.res)} тыс. т</Sub>
      <DataTable rows={ZONES} pageSize={0} columns={[
        { field: 'id', headerName: 'Зона', width: 80, renderCell: (p) => <b>{p.value}</b> },
        { field: 't', headerName: 'Положение', flex: 1, minWidth: 160, renderCell: (p) => <Box>{p.value}<Typography sx={{ fontSize: 12, color: 'text.secondary' }}>горизонт {p.row.h}</Typography></Box> },
        { field: 'area', headerName: 'Площадь, км²', type: 'number', width: 110, valueFormatter: (v) => fmt(v, 1) },
        { field: 'res', headerName: 'Ресурсы, тыс. т', type: 'number', width: 120 },
        { field: 'p', headerName: 'Вероятность успеха', width: 150, renderCell: (p) => <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}><Box sx={{ flex: 1 }}><Meter v={p.value * 100} tone={p.value >= 0.5 ? 'good' : 'warn'} h={6} /></Box><b>{fmt(p.value * 100)} %</b></Stack> },
      ]} />
    </Box>
  );
}
export const horizonRows = () => HORIZONS;
export const tieFacts = () => [['Скважин с синтетическими сейсмограммами', fmt(TIE.wells)], ['Коэффициент корреляции синтетики и трассы', fmt(TIE.corr, 2)], ['Невязка структурных карт со скважинами', `±${fmt(TIE.misfit, 1)} м по ${fmt(TIE.ctrl)} скважинам`]];

// Карточка объекта «сейсморазведка»: по стадии — ход полевых работ, опытные работы, обработка или интерпретация
export function SeisObjWidget({ obj }) {
  const app = useApp(); const runs = app ? app.runs : [];
  const sv = survey(obj.id); const lastRun = (p) => runs.filter((r) => r.p === p && r.obj.id === obj.id).sort((a, b) => (a.status === 'done') - (b.status === 'done') || b.started - a.started)[0];
  if (sv.stage === 'field') return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2, mb: 2 }}>
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', borderRadius: 2, p: 2 }}><Typography sx={{ fontWeight: 600 }}>Ход полевых работ</Typography><FieldProgressWidget id={obj.id} /></Box>
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', borderRadius: 2, p: 2 }}><Typography sx={{ fontWeight: 600, mb: 1 }}>Покрытие площади съёмки</Typography><CoverageMap id={obj.id} /></Box>
    </Box>
  );
  const box = (children) => <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', borderRadius: 2, p: 2, mb: 2 }}>{children}</Box>;
  if (sv.stage === 'trial') return box(<><Typography sx={{ fontWeight: 600 }}>Программа опытных работ</Typography><TrialWidget results={false} /></>);
  if (sv.stage === 'proc') return box(<><Typography sx={{ fontWeight: 600 }}>Обработка сейсмических данных · {fmt(pvTotal(sv))} пунктов возбуждения</Typography><StagesWidget kind="proc" run={lastRun('Г3.2')} title="Этапы обработки" /></>);
  return box(<><Typography sx={{ fontWeight: 600 }}>Интерпретация сейсмических данных</Typography><StagesWidget kind="int" run={lastRun('Г3.3')} title="Этапы интерпретации" /><ZonesWidget /></>);
}
