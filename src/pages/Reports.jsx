// Аналитика · сводка по ДЗО, выполнение производственной программы, регламентные отчёты (ABAI ПДИМ 2.0, КХД).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { PageHeader, KpiRow, Section, Grid2, KV } from '../components/ui.jsx';
import { BarsChart } from '../components/charts.jsx';
import DataTable from '../components/DataTable.jsx';
import { ProcLink, SideDrawer } from './data/_shared.jsx';
import { useApp } from '../state.jsx';
import { PROD, NOUN } from '../data/core.js';
import { runPath, stepPath, objOf, dueText } from '../data/exec.js';
import { C } from '../theme.js';
import { fmt, sgn, pct, sum, avg, last, rng, dAdd, dFmt, TODAY } from '../lib/format.js';

const MON = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт'];
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31];
// Выполнение ПП по месяцам, тыс. т
const ppOf = (id) => {
  const k = id === 'all' ? 1.52 : id === 'emg' ? 0.52 : 1;
  const plan = DAYS.map((d, i) => Math.round((14250 * k * d * (1 - i * 0.001)) / 100) / 10);
  const r = rng('rp-pp-' + id); const fact = plan.map((v, i) => Math.round(v * (0.985 + r() * 0.026 - (i === 6 ? 0.012 : 0)) * 10) / 10);
  return { plan, fact };
};
const DZO = [
  { id: 'omg', n: 'АО «Озенмунайгаз»', s: 'ОМГ', gtm: [312, 356] },
  { id: 'emg', n: 'АО «Эмбамунайгаз»', s: 'ЭМГ', gtm: [104, 130] },
];
// [отчёт, периодичность, система, процесс, получатели, сформирован (дней назад)]
const REP = [
  ['Суточная сводка добычи ДЗО', 'ежесуточно', 'ABAI ПДИМ 2.0', 'Д1', 'ДОУП, ЦИТС НГДУ, КМГ через КХД', 0],
  ['Мониторинг добычи: план / факт и отклонения', 'ежесуточно', 'ABAI ПДИМ 2.0 · ABAI ТР 2.0', 'Д2', 'службы НГДУ, ДДНГ', 0],
  ['Суточный рапорт бурения', 'ежесуточно', 'ABAI Цифровое бурение · ABAI БД 2.0', 'Б3', 'ОМГ, КМГИ', 0],
  ['Планирование и контроль бригад ВСР', 'еженедельно', 'ABAI БД 2.0', 'Б5', 'ОМГ, подрядные организации', -1],
  ['Состояние механизированного фонда', 'еженедельно', 'ABAI ТР 2.0 · ABAI ПГНО', 'Д9', 'службы НГДУ, ДДНГ', -1],
  ['Выполнение ОТМ', 'ежемесячно', 'ABAI ПДИМ 2.0', 'Р2', 'ОМГ, КМГИ, КМГ', -3],
  ['Анализ эффективности ГТМ', 'ежемесячно', 'ABAI ПАЭГТМ', 'Р2', 'КМГИ, КМГ', -3],
  ['Энергоэффективность: УРЭ и КПД', 'ежемесячно', 'ABAI ПДИМ 2.0', 'Д7', 'МЭД, ДДНГ', -3],
  ['Потенциал базовой добычи по сценариям', 'ежемесячно', 'ABAI ПДИМ 2.0', 'Д3', 'ДДНГ, КМГ', -6],
  ['Среднесрочный профиль добычи на 5 лет', 'ежегодно', 'ABAI ПДИМ 2.0', 'Р3', 'КазНИПИ, КМГИ, КМГ', -38],
  ['Программа надёжности трубопроводов', 'ежегодно', 'ABAI ПДИМ 2.0 · целостность трубопроводов', 'Д8', 'служба ГМ, ДДНГ', -62],
  ['Форма № 6-ГР', 'ежегодно', 'ABAI БД 2.0', 'Г3', 'КазНИПИ, уполномоченные органы', -120],
].map(([t, per, sys, p, to, d], i) => ({ id: i, t, per, sys, p, to, d, ...(i === 0 ? { run: 'Д1-2026-308', obj: 'sum:ДЗО:02.11' } : {}) }));
const dayT = (v) => (dFmt(v) === dFmt(TODAY) ? 'сегодня' : dFmt(v));

export default function Reports() {
  const { asset, toast, runs, role } = useApp(); const nav = useNavigate();
  // Суточная сводка ДЗО формируется шагом процесса «Сводка за сутки»: отчёт ведёт в запись, а не формируется здесь
  const runOf = (r) => (r && r.run ? runs.find((x) => x.id === r.run) : null);
  const sumRun = runOf(REP[0]); const sumObj = objOf(REP[0].obj);
  const runState = (x) => (!x ? '' : x.status === 'done' ? 'сформирована и передана в КМГ' : `${x.P.s[x.active[0].i].t} · ${x.lanes.join(', ')} · ${dueText(x.worst)}`);
  const openRun = (x) => { const mine = x.active.find((a) => role.lane(x.p, x.P.s[a.i].r)); nav(mine ? stepPath(x, mine.i) : runPath(x)); };
  const [dz, setDz] = useState(asset === 'emg' ? 'emg' : asset === 'omg' ? 'omg' : 'all');
  const [done, setDone] = useState({}); const [rep, setRep] = useState(null);
  const N = PROD.nF - 1; const o = PROD.omg, e = PROD.emg;
  const fact = o.fact[N] + e.fact[N], plan = o.plan[N] + e.plan[N];
  const pp = ppOf(dz); const ppAll = ppOf('all');
  const gtm = DZO.reduce((a, x) => [a[0] + x.gtm[0], a[1] + x.gtm[1]], [0, 0]);
  const rows = DZO.map((x) => { const p = PROD[x.id]; const q = ppOf(x.id); return { ...x, pl: p.plan[N], fa: p.fact[N], ytd: (sum(q.fact) / sum(q.plan)) * 100 }; });
  rows.push({ id: 'tot', n: 'Итого', pl: sum(rows.map((r) => r.pl)), fa: sum(rows.map((r) => r.fa)), ytd: (sum(ppAll.fact) / sum(ppAll.plan)) * 100, gtm, tot: true });
  const madeOf = (r) => { const x = runOf(r); return x && x.status === 'done' ? x.finishedAt : done[r.id] ? TODAY : dAdd(r.d); };
  const make = (r) => { setDone({ ...done, [r.id]: 1 }); toast(`Отчёт «${r.t}» сформирован`); };

  return (
    <Box>
      <PageHeader title="Сводка и отчёты" sys={[['ABAI ПДИМ 2.0', 'dob']]}
        sub={`Сводка ДЗО на ${dFmt(TODAY)} · поступает в КМГ через КХД`}
        actions={<Button variant="contained" onClick={() => toast('Сводка по ДЗО выгружена (.xlsx)')}>Выгрузить сводку</Button>} />
      <KpiRow items={[
        { label: 'Добыча нефти за сутки', value: fmt(fact), unit: 'т', delta: ((fact - plan) / plan) * 100, du: '%', good: 'up', d: `план ${fmt(plan)} т` },
        { label: 'Выполнение ПП', value: fmt((sum(ppAll.fact) / sum(ppAll.plan)) * 100, 1), unit: '%', d: 'январь – октябрь 2026' },
        { label: 'Программа ГТМ', value: `${fmt(gtm[0])} / ${fmt(gtm[1])}`, d: `выполнено ${pct((gtm[0] / gtm[1]) * 100)}` },
        { label: 'Обводнённость продукции', value: fmt(avg([last(o.wc), last(e.wc)]), 1), unit: '%', d: 'средняя по ДЗО' },
      ]} />
      <Grid2 cols="1fr 1.25fr">
        <Section title="Сводка по ДЗО" sub="нефть, т/сут · ПП и ГТМ с начала года" flush action={<Button size="small" onClick={() => nav(sumObj.path)}>Сводка за {sumObj.attrs[1][1].slice(0, 5)}</Button>} info="Суточная сводка ДЗО формируется в ABAI ПДИМ 2.0 и передаётся в КМГ через КХД (процесс Д1).">
          <DataTable rows={rows} pageSize={0} disableColumnSorting getRowClassName={(p) => (p.row.tot ? 'tot' : '')} sx={{ '& .tot': { bgcolor: '#f5f7fa', fontWeight: 700 } }} columns={[
            { field: 'n', headerName: 'ДЗО', flex: 1.4, minWidth: 160 },
            { field: 'fa', headerName: 'Факт', type: 'number', width: 90, valueFormatter: (v) => fmt(v) },
            { field: 'dv', headerName: 'К плану', type: 'number', width: 90, valueGetter: (v, r) => r.fa - r.pl, renderCell: ({ value }) => <Box sx={{ width: '100%', textAlign: 'right', color: value < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>{sgn(value)}</Box> },
            { field: 'ytd', headerName: 'ПП', type: 'number', width: 80, valueFormatter: (v) => pct(v) },
            { field: 'gtm', headerName: 'ГТМ', type: 'number', width: 100, valueGetter: (v, r) => r.gtm[0], renderCell: ({ row }) => <Box sx={{ width: '100%', textAlign: 'right' }}>{fmt(row.gtm[0])} / {fmt(row.gtm[1])}</Box> },
          ]} />
        </Section>
        <Section title="Выполнение производственной программы" sub="добыча нефти, тыс. т в месяц · 2026"
          action={<ToggleButtonGroup size="small" exclusive value={dz} onChange={(ev, v) => v && setDz(v)}><ToggleButton value="all">Все ДЗО</ToggleButton><ToggleButton value="omg">ОМГ</ToggleButton><ToggleButton value="emg">ЭМГ</ToggleButton></ToggleButtonGroup>}>
          <BarsChart data={MON.map((x, i) => ({ x, fact: pp.fact[i], plan: pp.plan[i] }))} series={[{ key: 'fact', name: 'Факт', color: C.s[0] }]} plan={{ key: 'plan', name: 'План ПП' }} unit="тыс. т" dd={1} height={250} />
        </Section>
      </Grid2>
      <Section title="Регламентные отчёты" sub={`${REP.length} отчётов`} flush info="Отчёты формируются по расписанию и по запросу; источник — система ABAI и процесс BPMN Dream TO BE.">
        <DataTable rows={REP} pageSize={8} onRowClick={setRep} columns={[
          { field: 't', headerName: 'Отчёт', flex: 2, minWidth: 280, renderCell: ({ row }) => <Box><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{row.t}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.sys}</Typography></Box> },
          { field: 'per', headerName: 'Периодичность', width: 140 },
          { field: 'p', headerName: 'Процесс', width: 110, renderCell: ({ value }) => <ProcLink code={value} /> },
          { field: 'd', headerName: 'Сформирован', width: 130, valueGetter: (v, row) => madeOf(row), valueFormatter: (v) => dayT(v) },
          { field: 'a', headerName: '', width: 150, sortable: false, filterable: false, renderCell: ({ row }) => (runOf(row) ? <Button size="small" onClick={(ev) => { ev.stopPropagation(); openRun(runOf(row)); }}>Открыть в процессе</Button> : <Button size="small" onClick={(ev) => { ev.stopPropagation(); make(row); }}>Сформировать</Button>) },
        ]} />
      </Section>
      {rep && (
        <SideDrawer open onClose={() => setRep(null)} title={rep.t} sub={rep.per}
          actions={runOf(rep) ? <><Button onClick={() => nav(objOf(rep.obj).path)}>Карточка сводки</Button><Button variant="contained" onClick={() => openRun(runOf(rep))}>Открыть в процессе</Button></> : <><Button onClick={() => toast(`Отчёт «${rep.t}» выгружен (.xlsx)`)}>Выгрузить .xlsx</Button><Button variant="contained" onClick={() => make(rep)}>Сформировать</Button></>}>
          <KV rows={[['Система', rep.sys], ['Процесс', <ProcLink code={rep.p} short />], ['Периодичность', rep.per], ['Получатели', rep.to], runOf(rep) ? [NOUN[rep.p], `${objOf(rep.obj).short} · ${runState(runOf(rep))}`] : null, runOf(rep) ? ['Нефть за сутки', `${objOf(rep.obj).attrs[2][1]} при плане ${objOf(rep.obj).attrs[3][1]}`] : null, ['Последний раз сформирован', dayT(madeOf(rep))]].filter(Boolean)} />
        </SideDrawer>
      )}
    </Box>
  );
}
