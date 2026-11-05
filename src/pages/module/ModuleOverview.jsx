// Обзор модуля — состояние двойника: объекты и их процессы, отклонения, актуальность моделей; мои задачи в модуле; ход исполнения.
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, List, ListItemButton, Stack, Typography } from '@mui/material';
import { useApp } from '../../state.jsx';
import { KpiRow, Section, Grid2, StatusChip, Meter, SegBar } from '../../components/ui.jsx';
import DataTable from '../../components/DataTable.jsx';
import { BPMN, PARTS, WELLS, ALERTS, PROD, TWINS, OBJECTS, W_ST, NOUN, partOfDir, partOfTask } from '../../data/core.js';
import { taskPath, runPath, runTitle, runsOf, dueText, nowDemo } from '../../data/exec.js';
import { procPath, modPath, canSee, objPath } from '../../layout/nav.js';
import { fmt, pct, last, sum, dShort, dFmt, dRel, plural } from '../../lib/format.js';
import { C } from '../../theme.js';
import { DRILL } from '../skv/drill.data.js';
import { PL_EZ, PL_EZ_T } from '../plast/_shared.jsx';
import { summaryRows } from '../process/forms/widgets.jsx';

function Row({ title, meta, right, onClick }) {
  return (
    <ListItemButton onClick={onClick} sx={{ borderRadius: 0, px: 2, py: 1, gap: 1.5, alignItems: 'flex-start', borderTop: '1px solid #f0f2f5' }}>
      <Box sx={{ minWidth: 0, flex: 1 }}><Typography sx={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.35 }}>{title}</Typography>{meta && <Typography component="div" sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{meta}</Typography>}</Box>
      <Box sx={{ flex: 'none', textAlign: 'right' }}>{right}</Box>
    </ListItemButton>
  );
}
const runMeta = (r) => (r ? `${NOUN[r.p]}: ${r.P.s[r.active[0].i].t} · ${r.lanes.join(', ')}` : '');

function Skv({ runs, nav }) {
  const prod = WELLS.filter((w) => w.type === 'prod' && w.status !== 'plan'); const inj = WELLS.filter((w) => w.type === 'inj');
  const cnt = (k) => prod.filter((w) => w.status === k).length;
  const items = [...DRILL.map((d) => ({ id: d.id, t: `${d.id} · бурение · ${d.rig}`, m: `забой ${fmt(d.bh)} м из ${fmt(d.depth)} · сутки ${d.cur} из ${d.days}`, lag: d.bh - d.bhPlan, r: runsOf(runs, 'w:' + d.id).find((x) => x.status === 'active') })),
    ...WELLS.filter((w) => w.status === 'osv').map((w) => ({ id: w.id, t: `${w.id} · освоение`, m: w.ngdu, r: runsOf(runs, 'w:' + w.id).find((x) => x.status === 'active') })),
    ...WELLS.filter((w) => w.status === 'repair').map((w) => ({ id: w.id, t: `${w.id} · ремонт`, m: `${w.ngdu} · ${w.method}`, r: runsOf(runs, 'w:' + w.id).find((x) => x.status === 'active') }))];
  return (
    <>
      <KpiRow items={[{ label: 'Добывающий фонд', value: fmt(prod.length), d: `${cnt('work')} в работе · ${cnt('idle')} в простое` }, { label: 'Нагнетательный фонд', value: fmt(inj.length), d: 'в работе' }, { label: 'В бурении и освоении', value: `${DRILL.length} / ${cnt('osv')}`, d: `${DRILL.filter((d) => d.bh - d.bhPlan < -20).length} с отставанием от ГТН` }, { label: 'В ремонте', value: fmt(cnt('repair')), d: 'бригады ВСР: 23 из 27 в работе' }]} />
      <Section title="Состояние добывающего фонда" sx={{ mb: 2 }}><SegBar parts={[{ l: 'В работе', v: cnt('work'), c: C.good }, { l: 'Простой', v: cnt('idle'), c: C.warn }, { l: 'Ремонт', v: cnt('repair'), c: C.serious }, { l: 'Бурение', v: cnt('drill'), c: C.s[0] }, { l: 'Освоение', v: cnt('osv'), c: C.s[6] }]} /></Section>
      <Section title="Скважины в работах" flush action={<Button size="small" onClick={() => nav('/m/skv/wells')}>Фонд скважин →</Button>}>
        <List disablePadding>{items.map((x) => <Row key={x.id} title={x.t} meta={<>{x.m}{x.r ? <><br />{runMeta(x.r)}</> : null}</>} onClick={() => nav('/m/skv/wells/' + encodeURIComponent(x.id))}
          right={x.lag != null ? <StatusChip tone={x.lag < -20 ? 'warn' : 'good'} label={x.lag < -20 ? `Забой ниже плана на ${fmt(-x.lag)} м` : 'Забой в пределах плана'} /> : x.r ? <StatusChip tone={x.r.late ? 'crit' : 'info'} label={dueText(x.r.worst)} /> : null} />)}</List>
      </Section>
    </>
  );
}
function Plast({ runs, nav }) {
  const tw = TWINS.find((t) => t.id === 'plast'); const bad = PL_EZ.filter((e) => e.tone !== 'good');
  const objs = OBJECTS.filter((o) => o.part === 'plast' && ['model', 'program', 'profile', 'area', 'seis'].includes(o.kind)).map((o) => ({ o, r: runsOf(runs, o.id).find((x) => x.status === 'active') }));
  return (
    <>
      <KpiRow items={[{ label: 'Пластовое давление', value: '122,6', unit: 'атм', delta: -0.6, dd: 1, good: 'up', d: 'за месяц' }, { label: 'Компенсация отбора', value: '104,2', unit: '%', delta: 1.8, du: ' п.п.', good: 'up', d: 'за месяц' }, { label: 'Адаптация ГДМ', value: `${tw.q}`, unit: '%', d: `${tw.model} · ${dRel(tw.upd)}` }, { label: 'Элементы заводнения', value: `${bad.length} / ${PL_EZ.length}`, d: 'требуют корректировки закачки' }]} />
      <Grid2 cols="1fr 1fr">
        <Section title="Элементы заводнения с отклонениями" flush action={<Button size="small" onClick={() => nav(procPath('plast', 'Р4'))}>Оптимизация ППД →</Button>}>
          <List disablePadding>{bad.slice(0, 6).map((e) => { const r = runsOf(runs, 'ez:' + e.id).find((x) => x.status === 'active'); return <Row key={e.id} title={`Элемент ${e.id} · ${e.c.id}`} meta={<>компенсация {e.comp} % · {fmt(e.eff, 1)} т на 1 000 м³{r ? <><br />{runMeta(r)}</> : null}</>} right={<StatusChip tone={e.tone} label={PL_EZ_T[e.tone]} />} onClick={() => nav(objPath('plast', 'ez:' + e.id))} />; })}</List>
        </Section>
        <Section title="Модели, программы и работы" flush>
          <List disablePadding>{objs.map(({ o, r }) => <Row key={o.id} title={o.name} meta={r ? runMeta(r) : (o.attrs[0] ? `${o.attrs[0][0]}: ${o.attrs[0][1]}` : '')} right={r ? <StatusChip tone={r.late ? 'crit' : 'info'} label={dueText(r.worst)} /> : <StatusChip label="Процессов нет" />} onClick={() => nav(objPath('plast', o.id))} />)}</List>
        </Section>
      </Grid2>
    </>
  );
}
function Dob({ runs, nav, prod }) {
  const f = last(prod.fact), p = prod.plan[PROD.nF - 1]; const openA = ALERTS.filter((a) => a.st !== 'Устранено');
  const rows = summaryRows('ДЗО').map((x) => { const r = runsOf(runs, `sum:${x.n}:02.11`).find((y) => y.status === 'active'); return { ...x, r }; });
  const infra = OBJECTS.filter((o) => o.part === 'dob' && ['dns', 'pipe', 'ima', 'mech', 'energy'].includes(o.kind)).map((o) => ({ o, r: runsOf(runs, o.id).find((x) => x.status === 'active') }));
  return (
    <>
      <KpiRow items={[{ label: 'Добыча нефти за сутки', value: fmt(f), unit: 'т', delta: ((f - p) / p) * 100, du: '%', good: 'up', d: 'к плану', spark: prod.fact.slice(-14) }, { label: 'Отклонения от режима', value: fmt(openA.length), d: 'потери ' + fmt(sum(openA.map((a) => a.loss)), 1) + ' т/сут' }, { label: 'Риск отказа ГНО', value: fmt(WELLS.filter((w) => w.risk > 60 && w.status === 'work').length), d: 'скважин, выше 60 %' }, { label: 'Модель сбора', value: '86', unit: '%', d: 'сходимость · требует пересчёта' }]} />
      <Grid2 cols="1fr 1fr">
        <Section title={`Суточные сводки НГДУ за ${dFmt(new Date(2026, 10, 2))}`} flush>
          <DataTable rows={rows} pageSize={0} onRowClick={(x) => nav(x.r ? runPath(x.r) : objPath('dob', 'ngdu:' + x.n))} columns={[
            { field: 'n', headerName: 'НГДУ', width: 90, renderCell: (q) => <b>{q.value}</b> },
            { field: 'fact', headerName: 'Факт, т', type: 'number', width: 90 },
            { field: 'dev', headerName: 'К плану', width: 90, type: 'number', valueGetter: (v, r) => r.fact - r.plan, renderCell: (q) => <Box component="span" sx={{ color: q.value >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>{q.value > 0 ? '+' : ''}{fmt(q.value)}</Box> },
            { field: 'r', headerName: 'Сводка', flex: 1, minWidth: 200, sortable: false, renderCell: (q) => (q.row.r ? <StatusChip tone={q.row.r.late ? 'crit' : q.row.r.active.some((a) => a.rework) ? 'serious' : 'info'} label={`${q.row.r.P.s[q.row.r.active[0].i].t} · ${q.row.r.lanes[0]}`} /> : <StatusChip tone="good" label="Подтверждена" />) },
          ]} />
        </Section>
        <Section title="Отклонения от режима" flush action={<Button size="small" onClick={() => nav(procPath('dob', 'Д2'))}>Мониторинг добычи →</Button>}>
          <List disablePadding>{openA.slice(0, 6).map((a) => { const r = runsOf(runs, 'w:' + a.well).find((x) => x.status === 'active'); return <Row key={a.id} title={`${a.t} · ${a.well}`} meta={<>{a.ngdu} · {dShort(a.since)}{r ? <><br />{runMeta(r)}</> : null}</>} right={<><StatusChip tone={a.tone} label={a.st} />{a.loss ? <Typography sx={{ fontSize: 12, color: 'error.main', fontWeight: 600 }}>−{fmt(a.loss, 1)} т/сут</Typography> : null}</>} onClick={() => nav('/m/skv/wells/' + encodeURIComponent(a.well))} />; })}</List>
        </Section>
      </Grid2>
      <Section title="Инфраструктура и фонд" flush sx={{ mb: 2 }} action={<Button size="small" onClick={() => nav(modPath('dob', 'objects'))}>Все объекты →</Button>}>
        <List disablePadding>{infra.map(({ o, r }) => <Row key={o.id} title={o.name} meta={r ? runMeta(r) : (o.attrs[0] ? `${o.attrs[0][0]}: ${o.attrs[0][1]}` : '')} right={r ? <StatusChip tone={r.late ? 'crit' : 'info'} label={dueText(r.worst)} /> : null} onClick={() => nav(objPath('dob', o.id))} />)}</List>
      </Section>
    </>
  );
}

export default function ModuleOverview() {
  const { part } = useParams(); const nav = useNavigate(); const { role, tasks, runs: all, prod } = useApp(); const now = nowDemo();
  const procs = BPMN.filter((x) => partOfDir(x.m) === part); const codes = new Set(procs.map((P) => P.p));
  const runs = all.filter((r) => codes.has(r.p)); const active = runs.filter((r) => r.status === 'active');
  const myTasks = tasks.filter((t) => partOfTask(t) === part).sort((a, b) => a.due - b.due);
  return (
    <Box>
      {part === 'skv' && <Skv runs={all} nav={nav} />}{part === 'plast' && <Plast runs={all} nav={nav} />}{part === 'dob' && <Dob runs={all} nav={nav} prod={prod} />}
      <Grid2 cols="2fr 1fr">
        <Section title="Ход исполнения" sub={`${active.length} ${plural(active.length, 'запись', 'записи', 'записей')} в работе · ${active.filter((r) => r.late).length} с нарушением срока`} flush action={<Button size="small" onClick={() => nav(modPath(part, 'proc'))}>Процессы →</Button>}>
          <DataTable rows={active.sort((a, b) => (b.late - a.late) || (a.worst || 0) - (b.worst || 0))} pageSize={8} onRowClick={(r) => canSee(role, procPath(part, r.p)) && nav(runPath(r))} columns={[
            { field: 'id', headerName: 'Запись', flex: 1.2, minWidth: 220, valueGetter: (v, row) => runTitle(row), renderCell: ({ row }) => <Box><b>{row.obj.short}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{NOUN[row.p]}</Typography></Box> },
            { field: 'si', headerName: 'Текущий шаг', flex: 1.6, minWidth: 260, sortable: false, renderCell: ({ row }) => <Box sx={{ py: 0.25 }}>{row.active.map((a) => { const s = row.P.s[a.i]; const my = role.lane(row.p, s.r); return <Box key={a.i} sx={{ lineHeight: 1.3 }}>{s.t}<Typography component="span" sx={{ fontSize: 12, color: my ? 'primary.main' : 'text.secondary', fontWeight: my ? 600 : 400 }}> · {s.r}{my ? ' · ваш шаг' : ''}</Typography></Box>; })}</Box> },
            { field: 'worst', headerName: 'Срок', width: 160, valueGetter: (v, row) => (row.worst ? row.worst.getTime() : 0), renderCell: ({ row }) => <StatusChip tone={row.worst < now ? 'crit' : 'info'} label={dueText(row.worst, now)} /> },
          ]} />
        </Section>
        <Section title="Мои задачи в модуле" flush action={<Button size="small" onClick={() => nav(modPath(part, 'tasks'))}>Все →</Button>}>
          <List disablePadding>
            {myTasks.slice(0, 7).map((t) => (
              <ListItemButton key={t.id} onClick={() => nav(taskPath(t))} sx={{ borderRadius: 0, px: 2, py: 1, borderTop: '1px solid #f0f2f5', display: 'block' }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.35 }}>{t.t}</Typography>
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.25 }}><Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>{t.title}</Typography><Typography sx={{ fontSize: 12, fontWeight: t.due < now ? 600 : 400, color: t.due < now ? 'error.main' : 'text.secondary', whiteSpace: 'nowrap', ml: 1 }}>{dueText(t.due, now)}</Typography></Stack>
              </ListItemButton>))}
            {!myTasks.length && <Box sx={{ p: 3, color: 'text.secondary', textAlign: 'center', fontSize: 13 }}>Задач по модулю нет — все задачи роли в разделе «Мои задачи»</Box>}
          </List>
        </Section>
      </Grid2>
    </Box>
  );
}
