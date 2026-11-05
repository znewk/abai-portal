// ЦД пласта · ABAI ЦРНС 2.0: 4 показателя → вкладки «Точки бурения» (карта + таблица, детали в панели), «Ранжирование секторов», «Модели», «Варианты разработки».
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Box, Typography, Stack, Card, Tabs, Tab, Drawer, IconButton, Divider, Tooltip } from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { PageHeader, KpiRow, StatusChip, Hbars, Code, KV } from '../../components/ui.jsx';
import { BarsChart } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { fmt, dFmt, dAdd } from '../../lib/format.js';
import { C } from '../../theme.js';
import { useNavigate } from 'react-router-dom';
import { FieldMap, MapLegend, PtMark, PL_PTS, PL_PT_ST, PL_SECT, PL_ST, ptSt } from './_shared.jsx';
import { MODELS, MST, VARS, VARS_FIELD } from './dev.data.js';
import { RunAction, runNow } from '../process/forms/widgets.plast.jsx';
import { runPath } from '../../data/exec.js';
import { Demo } from '../../components/ui.jsx';

const SUB = { pts: 'Узень · фон — плотность ОИЗ, тыс. т/га', sect: 'рейтинг 0–100 · модель ранжирования v.2.4', models: 'версии моделей в ABAI ЦРНС 2.0', vars: `${VARS_FIELD} · технико-экономическая оценка вариантов` };

export default function Crns() {
  const { role, runs } = useApp(); const nav = useNavigate();
  const [sel, setSel] = useState(null); const [tab, setTab] = useState('pts'); const [open, setOpen] = useState(null);
  const pts = PL_PTS.map((p) => ({ ...p, st: ptSt(p) }));
  const cnt = (s) => pts.filter((p) => p.st === s).length; const mst = (m) => PL_ST.models[m.id] || m.st;
  const rec = VARS.find((v) => v.rec); const pt = open ? pts.find((p) => p.id === open) : null;
  // Согласование точек — шаги системы разработки (Узень), включение в ковёр — шаги проекта скважины (атлас точек)
  const r1 = runs.find((r) => r.p === 'Р1' && r.status === 'active' && r.obj.id === 'model:uzen-2026.3');
  const b1 = runs.find((r) => r.p === 'Б1' && r.status === 'active' && r.obj.id === 'kust:122');
  const r1k = runs.find((r) => r.p === 'Р1' && r.status === 'active' && r.obj.id === 'model:krm-2026.1');
  const modelRun = (m) => runs.find((r) => r.p === 'Г3.4' && r.status === 'active' && r.obj.id === m.obj);
  const pick = (id) => { setSel(id); setOpen(id); };

  const pCols = [
    { field: 'id', headerName: 'Точка', width: 110, renderCell: ({ value }) => <b>{value}</b> },
    { field: 'sec', headerName: 'Сектор', width: 70 },
    { field: 'rate', headerName: 'Рейтинг', type: 'number', width: 80 },
    { field: 'q', headerName: 'Дебит, т/сут', type: 'number', width: 100, valueFormatter: (v) => fmt(v, 1) },
    { field: 'st', headerName: 'Статус', flex: 1, minWidth: 170, valueGetter: (v) => PL_PT_ST[v][0], renderCell: ({ row }) => <StatusChip tone={PL_PT_ST[row.st][1]} label={PL_PT_ST[row.st][0]} /> },
  ];
  const mCols = [
    { field: 't', headerName: 'Модель', flex: 1.6, renderCell: ({ row }) => <Box><b>{row.t}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>горизонты {row.h} · {row.tool}</Typography></Box> },
    { field: 'v', headerName: 'Версия', width: 100, renderCell: ({ value }) => <Code>{value}</Code> },
    { field: 'd', headerName: 'Дата', width: 110, type: 'date', valueFormatter: (v) => dFmt(v) },
    { field: 'st', headerName: 'Статус', width: 190, valueGetter: (v, row) => MST[mst(row)][0], renderCell: ({ row }) => <StatusChip tone={MST[mst(row)][1]} label={MST[mst(row)][0]} /> },
    { field: 'act', headerName: '', width: 170, sortable: false, filterable: false, renderCell: ({ row }) => (modelRun(row) && !role.limited ? <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); nav(runPath(modelRun(row))); }}>Ход построения</Button> : null) },
  ];
  const vCols = [
    { field: 't', headerName: 'Вариант', flex: 1, minWidth: 300, renderCell: ({ row }) => <Box><Stack direction="row" spacing={1} alignItems="center"><b>{row.t}</b>{row.rec && <StatusChip tone="good" label="Рекомендуемый" />}</Stack><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.d}</Typography></Box> },
    { field: 'npv', headerName: 'NPV, млрд тг', type: 'number', width: 110 },
    { field: 'kin', headerName: 'КИН', type: 'number', width: 80, valueFormatter: (v) => fmt(v, 3) },
    { field: 'n', headerName: 'Новых скважин', type: 'number', width: 120 },
    { field: 'capex', headerName: 'CAPEX, млрд тг', type: 'number', width: 120 },
  ];
  const tabInfo = {
    pts: 'Проектные точки формируются и проверяются на ГДМ в процессе «Система разработки»; согласованные точки через атлас точек включаются в ковёр бурения (процесс «Проект скважины»).',
    sect: `Пересчёт ${dFmt(dAdd(-6))} — автоматически после публикации геомодели Узень v.2026.3; используется при выборе участков и доразведке.`,
    models: 'Версии моделей хранятся в ABAI БД 2.0; публикация геомодели — после приёмки материалов, ГДМ — для оптимизации ППД.',
    vars: `Расчёт в ABAI ЦРНС 2.0 и УЗ 2.0 · технико-экономическая оценка от ${dFmt(dAdd(-4))}`,
  };
  return (
    <>
      <PageHeader title="Геомодели и точки бурения" sys={[['ABAI ЦРНС 2.0', 'plast']]}
        sub="Узень, Карамандыбас · модели, ранжирование секторов, проектные точки бурения"
        actions={<Button variant="outlined" component={RouterLink} to={'/proc/' + encodeURIComponent('Р1')}>Система разработки<Demo>Р1</Demo></Button>} />
      <KpiRow items={[
        { label: 'Проектные точки бурения', value: String(pts.length), d: `кандидатов ${cnt('cand')} · в ковре ${cnt('carpet')}` },
        { label: 'Приоритетные сектора', value: String(PL_SECT.filter((s) => s.score >= 80).length), d: `рейтинг ≥ 80 из ${PL_SECT.length}` },
        { label: 'Опубликованные модели', value: String(MODELS.filter((m) => mst(m) === 'pub').length), d: `в построении ${MODELS.filter((m) => mst(m) === 'build').length} · требуют актуализации ${MODELS.filter((m) => mst(m) === 'upd').length}` },
        { label: `Лучший вариант разработки · ${VARS_FIELD}`, value: 'Вариант ' + rec.id, d: `NPV ${fmt(rec.npv)} млрд тг · КИН ${fmt(rec.kin, 3)}` },
      ]} />
      <Card>
        <Stack direction="row" alignItems="center" sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ flex: 1 }}>
            <Tab value="pts" label="Точки бурения" /><Tab value="sect" label="Ранжирование секторов" /><Tab value="models" label="Модели" /><Tab value="vars" label="Варианты разработки" />
          </Tabs>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mr: 0.75 }}>{SUB[tab]}</Typography>
          <Tooltip title={tabInfo[tab]} placement="top-end"><InfoOutlined sx={{ fontSize: 16, color: '#a3aab6', cursor: 'help' }} /></Tooltip>
        </Stack>
        {tab === 'pts' && (
          <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2, '& > *': { minWidth: 0 } }}>
            <Box>
              <FieldMap layer="oiz" pts={pts} sel={sel} onPt={(id) => pick(id)} fade />
              <MapLegend layer="oiz" extra={Object.values(PL_PT_ST).map((v) => <PtMark key={v[0]} c={v[2]} label={v[0]} />)} />
            </Box>
            <DataTable rows={pts} columns={pCols} pageSize={10} onRowClick={(r) => pick(r.id)} getRowClassName={(p) => (p.row.id === sel ? 'sel' : '')} initialSort={[{ field: 'rate', sort: 'desc' }]} />
          </Box>
        )}
        {tab === 'sect' && (
          <Box sx={{ p: 2, maxWidth: 900 }}>
            <Hbars max={100} labelW="30%" rows={PL_SECT.map((s, i) => ({ l: `${s.id} · ОИЗ ${fmt(s.oiz, 1)} млн т`, v: s.score, c: i < 3 ? C.s[0] : '#9ec5f4', txt: String(s.score), tip: `${s.id}: ${s.why} · ННТ ${s.nnt} м` }))} />
          </Box>
        )}
        {tab === 'models' && <Box sx={{ py: 1 }}><DataTable rows={MODELS} columns={mCols} /></Box>}
        {tab === 'vars' && (
          <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2, '& > *': { minWidth: 0 } }}>
            <DataTable rows={VARS} columns={vCols} getRowClassName={(p) => (p.row.rec ? 'sel' : '')} />
            <Box>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>NPV вариантов, млрд тг</Typography>
              <BarsChart height={230} unit="млрд тг" labels legend={false} data={VARS.map((v) => ({ x: 'Вариант ' + v.id, npv: v.npv, rec: v.rec }))}
                series={[{ key: 'npv', name: 'NPV', color: C.s[0] }]} colorBy={(d) => (d.rec ? C.s[0] : '#9ec5f4')} />
              {r1k && <Box sx={{ mt: 1.5 }}><Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>{runNow(r1k)}</Typography><RunAction run={r1k} codes={['1.15', '1.16', '1.17']} label="Открыть оценку в процессе" /></Box>}
            </Box>
          </Box>
        )}
      </Card>

      <Drawer anchor="right" open={!!pt} onClose={() => setOpen(null)} slotProps={{ paper: { sx: { width: { xs: '100%', md: 460 } } } }}>
        {pt && <>
          <Stack direction="row" alignItems="flex-start" sx={{ p: 2.5, pb: 2 }}>
            <Box sx={{ flex: 1 }}><Typography variant="h5">Проектная точка {pt.id}</Typography><Box sx={{ mt: 0.75 }}><StatusChip tone={PL_PT_ST[pt.st][1]} label={PL_PT_ST[pt.st][0]} /></Box></Box>
            <IconButton onClick={() => setOpen(null)}><CloseRounded /></IconButton>
          </Stack>
          <Divider />
          <Box sx={{ p: 2.5, flex: 1 }}>
            <KV rows={[['Сектор', pt.sec], ['Тип скважины', pt.type], ['Рейтинг', `${pt.rate} из 100`], ['Ожидаемый дебит нефти', `${fmt(pt.q, 1)} т/сут`], ['Проектная глубина', `${fmt(pt.depth)} м`], ['Процесс', pt.st === 'carpet' ? 'Проект скважины · ковёр бурения 2027' : pt.st === 'agreed' ? 'Проект скважины · атлас точек' : 'Система разработки · проектные точки']]} />
            {(pt.st === 'carpet' ? null : pt.st === 'agreed' ? b1 : r1) && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 2 }}>{runNow(pt.st === 'agreed' ? b1 : r1)}</Typography>}
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 2.5 }}>{tabInfo.pts}</Typography>
          </Box>
          {!role.limited && <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#fafbfc' }}>
            {pt.st === 'cand' && <RunAction run={r1} codes={['1.6.1', '1.6.2', '1.6.3', '1.7']} label="Согласовать в процессе" size="medium" />}
            {pt.st === 'agreed' && <RunAction run={b1} codes={['1.1.6', '1.1.7']} label="Включить в ковёр в процессе" size="medium" />}
            {pt.st === 'carpet' && <Button component={RouterLink} to={'/proc/' + encodeURIComponent('Б1')}>Проект скважины →</Button>}
          </Stack>}
        </>}
      </Drawer>
    </>
  );
}
