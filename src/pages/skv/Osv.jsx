// Освоение скважин (Б4): скважины в освоении, этапы, чек-лист по шагам BPMN, работа новой скважины vs соседние.
import { useState, useEffect, useRef } from 'react';
import { Box, Card, Stack, Typography, Button, Tabs, Tab } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, KV, Steps } from '../../components/ui.jsx';
import { TrendChart } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { WELLS, BPMN } from '../../data/core.js';
import { C } from '../../theme.js';
import { fmt, series, dAdd, dFmt, dayLabels } from '../../lib/format.js';
import { useApp } from '../../state.jsx';
import { ProcLink, ContrBtn } from './_shared.jsx';
import { RunAction, runNow } from '../process/forms/widgets.plast.jsx';

const STAGES = [['Приёмка из бурения', ['4.0']], ['Подготовка', ['4.1']], ['Программа освоения', ['4.2', '4.3']], ['Операции освоения', ['4.4', '4.4.1', '4.4.2', '4.4.3', '4.4.4']], ['Наблюдение', ['4.4.5', '4.4.6']], ['Паспорт', ['4.5']]];
const OSV = WELLS.filter((w) => w.status === 'osv').map((w, k) => ({ id: w.id, w, stage: [2, 3, 4][k % 3], start: dAdd(-[6, 14, 27][k % 3]) }));

export default function Osv() {
  const { role, toast, runs } = useApp();
  // Этап освоения — из записи процесса «Освоение скважины» по скважине (если есть), иначе — по данным БД 2.0
  const runOf = (o) => runs.find((r) => r.p === 'Б4' && r.obj.id === 'w:' + o.id && r.status === 'active') || runs.find((r) => r.p === 'Б4' && r.obj.id === 'w:' + o.id);
  const stageOf = (o) => { const r = runOf(o); if (!r) return o.stage; if (r.status === 'done') return STAGES.length - 1; const cs = r.active.map((a) => r.P.s[a.i].c); const k = STAGES.findIndex(([, codes]) => codes.some((c) => cs.includes(c))); return k < 0 ? o.stage : k; };
  const [selId, setSelId] = useState(() => OSV.slice().sort((a, b) => (runOf(b) ? 1 : 0) - (runOf(a) ? 1 : 0) || stageOf(b) - stageOf(a))[0].id); const [tab, setTab] = useState('cmp');
  const sel = OSV.find((o) => o.id === selId);
  const P = BPMN.find((x) => x.p === 'Б4'); const run = runOf(sel);
  const stage = stageOf(sel); const progApproved = stage > 2;
  const done = run ? run.done.map((d) => run.P.s[d.i].c) : STAGES.slice(0, stage).flatMap((x) => x[1]); const cur = run ? run.active.map((a) => run.P.s[a.i].c) : STAGES[stage][1];
  const n = 30; const lb = dayLabels(n);
  const own = series('osvq' + sel.id, n, 24, 0.05, -0.08); const nb = series('osvn' + sel.id, n, 19.5, 0.02, -0.02);
  const chart = lb.map((x, i) => ({ x, own: i < n - (stage >= 4 ? 18 : 6) ? null : +own[i].toFixed(1), nb: +nb[i].toFixed(1) }));
  const onProg = run && run.active.some((a) => run.P.s[a.i].c === '4.3');
  const listRef = useRef(null);
  useEffect(() => { const c = listRef.current; const k = c && c.querySelector('[data-cur="1"]'); if (k) c.scrollTop = k.offsetTop - c.offsetTop - 8; }, [selId, stage, tab]);

  const cols = [
    { field: 'id', headerName: 'Скважина', flex: 1, minWidth: 110, renderCell: ({ value }) => <b>{value}</b> },
    { field: 'stage', headerName: 'Этап', flex: 1.4, minWidth: 150, valueGetter: (v, o) => STAGES[stageOf(o)][0] },
    { field: 'pr', headerName: 'Ход', width: 90, sortable: false, renderCell: ({ row: o }) => <Typography variant="caption" color="text.secondary">{stageOf(o) + 1} из {STAGES.length}</Typography> },
  ];
  return (
    <>
      <PageHeader title="Освоение скважин" sub={`${OSV.length} скважины в освоении после бурения`} sys={[['ABAI БД 2.0', 'skv']]} actions={<ContrBtn />} />
      <KpiRow items={[
        { label: 'Средняя длительность освоения', value: '21', unit: 'сут', delta: -6, dd: 0, du: ' сут', good: 'down', d: 'к 2025 году' },
        { label: 'Введено с начала года', value: '47', unit: 'скважин', d: 'план года — 52' },
        { label: 'Выход на проектный дебит', value: '89', unit: '%', d: 'по введённым в 2026 году' },
      ]} />
      <Grid2 cols="1fr 2fr">
        <Section title="Скважины в освоении" flush>
          <DataTable rows={OSV} columns={cols} onRowClick={(o) => setSelId(o.id)} getRowClassName={(p) => (p.row.id === selId ? 'sel' : '')} />
        </Section>
        <Section title={`Этапы освоения · ${sel.id}`} info={<span>Приёмка, программа, операции, наблюдение и паспорт ведутся в ABAI БД 2.0 на данных Б1–Б3; наряд-заказ — АВР+. Процесс <ProcLink code="Б4" />.</span>}
          action={<Stack direction="row" spacing={1}>{run && <RunAction run={run} label={onProg ? 'Согласовать программу в процессе' : 'Открыть мой шаг'} doneLabel="Освоение завершено" />}
            {stage >= 4 && !role.limited && <Button size="small" variant="outlined" onClick={() => toast(`Режим ${sel.id} поставлен на контроль в ABAI ТР 2.0 с ${dFmt(dAdd(1))}`)}>Поставить режим на контроль</Button>}</Stack>}>
          <Steps items={STAGES.map(([t], i) => ({ t, done: i < stage, cur: i === stage }))} />
          {run && <Typography sx={{ fontSize: 12.5, color: run.late ? 'error.main' : 'text.secondary', mt: 1 }}>{runNow(run)}</Typography>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 2.5 }}>
            <KV w="48%" rows={[['Месторождение', `${sel.w.fld} · ${sel.w.ngdu}`], ['Горизонт', sel.w.horizon], ['Забой', fmt(sel.w.depth) + ' м'], ['Начало освоения', dFmt(run ? run.started : sel.start)]]} />
            <KV w="48%" rows={[['Проектный дебит нефти', '18,0 т/сут'], ['Способ освоения', 'свабирование, спуск ЭЦН'], ['Программа освоения', <StatusChip tone={progApproved ? 'good' : 'warn'} label={progApproved ? 'Согласована ЭЦП' : stage === 2 ? 'На согласовании ДЗО' : 'В разработке'} />]]} />
          </Box>
        </Section>
      </Grid2>
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="cmp" label="Работа в сравнении с соседними" /><Tab value="chk" label={`Чек-лист · ${P.s.filter((s) => done.includes(s.c)).length} из ${P.s.length}`} />
        </Tabs>
        {tab === 'cmp' && (
          <Box sx={{ p: 2 }}>
            {stage >= 3 ? <TrendChart data={chart} unit="т/сут" dd={1} height={260} series={[{ key: 'own', name: `${sel.id}, дебит нефти`, color: C.s[0] }, { key: 'nb', name: 'Среднее по 4 соседним', color: C.s[1] }]} />
              : <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>Приток ещё не получен — операции освоения не завершены</Box>}
          </Box>
        )}
        {tab === 'chk' && (
          <Box ref={listRef} sx={{ maxHeight: 360, overflowY: 'auto', p: 1.5 }}>
            {P.s.map((s) => { const d = done.includes(s.c), c = cur.includes(s.c); return (
              <Stack key={s.c} data-cur={c ? '1' : '0'} direction="row" spacing={1.25} alignItems="center" sx={{ py: 0.9, px: 1, borderRadius: 1.5, bgcolor: c ? '#e8f0fb' : 'transparent', borderBottom: '1px solid #f0f2f5' }}>
                <Box sx={{ width: 18, height: 18, borderRadius: 0.75, border: '2px solid', borderColor: d ? C.good : c ? C.brand : '#c3c7cf', bgcolor: d ? C.good : '#fff', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>{d && <CheckRounded sx={{ fontSize: 14 }} />}</Box>
                <Typography sx={{ fontSize: 13, flex: 1, color: d ? 'text.secondary' : 'text.primary', fontWeight: c ? 600 : 400 }}>{s.t}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{s.r}</Typography>
              </Stack>); })}
          </Box>
        )}
      </Card>
    </>
  );
}
