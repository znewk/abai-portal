// Карточка объекта двойника (сводка за сутки, программа, элемент заводнения, трубопровод, модель, бригады …):
// свойства, процессы и задачи по объекту, документы шагов, история действий.
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, Stack, Typography, List, ListItemButton, Alert, Chip } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import { useApp } from '../state.jsx';
import { PageHeader, Section, Grid2, KV, StatusChip, Demo } from '../components/ui.jsx';
import { PARTS, NOUN, BPMN } from '../data/core.js';
import { objOf, runsOf, runTitle, runNum, runPath, stepPath, journal, dueText, nowDemo, objectsFor, procOf } from '../data/exec.js';
import { procPath } from '../layout/nav.js';
import { dFmt, tFmt, plural } from '../lib/format.js';
import { SummaryWidget, ElementWidget, BrigWidget, CandidatesWidget, MechWidget } from './process/forms/widgets.jsx';
import { PipeObjWidget, EnergyObjWidget, PotObjWidget, ImaObjWidget, EventObjWidget } from './process/forms/widgets.dob.jsx';
import { ProfileObjWidget, ModelObjWidget, KustObjWidget } from './process/forms/widgets.plast.jsx';
import { AreaObjWidget } from './process/forms/widgets.geo.jsx';
import { SeisObjWidget } from './process/forms/widgets.seis.jsx';

// Предметный виджет карточки по виду объекта (данные — из тех же модулей, что рабочие места и формы шагов)
const KIND_W = { pipe: PipeObjWidget, energy: EnergyObjWidget, pot: PotObjWidget, ima: ImaObjWidget, event: EventObjWidget, profile: ProfileObjWidget, model: ModelObjWidget, kust: KustObjWidget, area: AreaObjWidget, seis: SeisObjWidget };

const KIND_T = { summary: 'Суточная сводка', ngdu: 'Подразделение', dns: 'Объект подготовки нефти', pipe: 'Трубопровод', program: 'Программа', report: 'Отчёт', profile: 'Профиль добычи', element: 'Элемент заводнения', model: 'Геологическая модель', ima: 'Интегрированная модель актива', brig: 'Бригады ВСР', kust: 'Куст скважин', area: 'Участок недр', seis: 'Сейсморазведочные работы', pot: 'Потенциал добычи', event: 'Мероприятие', energy: 'Энергопотребление', mech: 'Механизированный фонд' };

export default function ObjectCard() {
  const { part, id } = useParams(); const nav = useNavigate(); const { role, runs } = useApp(); const now = nowDemo();
  const o = objOf(id); const M = PARTS.find((x) => x.id === part);
  if (!o.kind) return <Alert severity="warning">Объект «{id}» не найден.</Alert>;
  const rs = runsOf(runs, o.id).sort((a, b) => (a.status === 'done') - (b.status === 'done') || b.started - a.started);
  const active = rs.filter((r) => r.status === 'active');
  const myTasks = active.flatMap((r) => r.active.filter((a) => role.lane(r.p, r.P.s[a.i].r)).map((a) => ({ r, a })));
  // Документы пройденных шагов: имя без расширения файла и служебного префикса, каждый документ — один раз (последняя редакция)
  const docName = (n) => n.replace(/^Форма БД 2\.0:\s*/, '').replace(/\s*\((?:[^()]*\.[a-zA-Z]+[^()]*|SEG-[DY]|проект Petrel[^()]*)\)\s*$/, '').replace(/\s+/g, ' ').trim();
  const docs = [...rs.flatMap((r) => r.done.flatMap((d) => r.P.s[d.i].d.map((name) => ({ name: docName(name), r, at: d.at, by: d.by, step: r.P.s[d.i].t })))).sort((a, b) => b.at - a.at)
    .reduce((m, x) => (m.has(x.name.toLowerCase()) ? m : m.set(x.name.toLowerCase(), x)), new Map()).values()];
  const hist = rs.flatMap((r) => journal(r).map((e) => ({ ...e, r }))).sort((a, b) => b.at - a.at).slice(0, 15);
  // Процессы, которые можно запустить по объекту этого вида
  const startable = BPMN.filter((P) => objectsFor(P).some((x) => x.id === o.id) && !active.some((r) => r.p === P.p) && !role.limited);
  const widget = o.kind === 'summary' ? <SummaryWidget scope={(o.short.match(/НГДУ-\d|ДЗО/) || ['ДЗО'])[0]} /> : o.kind === 'element' ? <ElementWidget id={o.short.replace('Элемент ', '')} /> : o.kind === 'brig' ? <BrigWidget /> : o.kind === 'program' && o.id === 'prog:gtm-2027' ? <CandidatesWidget limit={8} /> : o.kind === 'mech' ? <Section title="Механизированный фонд" sub="риск отказа ГНО" flush><MechWidget ngdu={o.short.replace('Мехфонд ', '')} /></Section> : KIND_W[o.kind] ? (() => { const W = KIND_W[o.kind]; return <W obj={o} />; })() : null;
  return (
    <Box>
      <PageHeader title={o.name} sub={`${KIND_T[o.kind] || 'Объект'} · ${M ? M.t : ''}`}
        actions={<><Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => nav(-1)}>Назад</Button>{startable.slice(0, 2).map((P) => <Button key={P.p} variant="contained" startIcon={<PlayArrowRounded />} onClick={() => nav(procPath(part, P.p) + '?start=1')}>{NOUN[P.p] || P.short}</Button>)}</>} />
      {widget}
      <Grid2 cols="1fr 1fr" sx={{ mt: widget ? 2 : 0 }}>
        <Section title="Свойства"><KV w="46%" rows={o.attrs || []} /></Section>
        <Section title={`Процессы по объекту · ${active.length} в работе`} flush>
          <List disablePadding>{rs.map((r) => (
            <ListItemButton key={r.id} onClick={() => nav(runPath(r))} sx={{ borderRadius: 0, px: 2, py: 1.1, borderTop: '1px solid #f0f2f5', display: 'block' }}>
              <Stack direction="row" justifyContent="space-between" spacing={1}><Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{NOUN[r.p]}<Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}> · {runNum(r)}</Typography><Demo> {r.id}</Demo></Typography>{r.status === 'done' ? <StatusChip tone="good" label={`Завершён ${dFmt(r.finishedAt)}`} /> : r.late ? <StatusChip tone="crit" label={dueText(r.worst, now)} /> : <StatusChip tone="info" label={dueText(r.worst, now)} />}</Stack>
              {r.status === 'active' && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{r.active.map((a) => `${r.P.s[a.i].t} · ${r.P.s[a.i].r}${role.lane(r.p, r.P.s[a.i].r) ? ' (ваш шаг)' : ''}`).join('; ')}</Typography>}
            </ListItemButton>))}
            {!rs.length && <Box sx={{ p: 3, color: 'text.secondary', textAlign: 'center', fontSize: 13 }}>Процессов по объекту нет{startable.length ? ' — запустите процесс кнопкой выше' : ''}</Box>}</List>
        </Section>
      </Grid2>
      {myTasks.length > 0 && <Alert severity="info" sx={{ mb: 2 }} action={<Button size="small" onClick={() => nav(stepPath(myTasks[0].r, myTasks[0].a.i))}>Открыть</Button>}>Вашего решения ожидают: {myTasks.map(({ r, a }) => `«${r.P.s[a.i].t}» (${runTitle(r)})`).join('; ')}</Alert>}
      <Grid2 cols="1fr 1fr">
        <Section title={`Документы · ${docs.length}`} flush>
          <List disablePadding>{docs.slice(0, 10).map((d, k) => (
            <Stack key={k} direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 0.9, borderTop: '1px solid #f0f2f5' }}>
              <DescriptionOutlined sx={{ fontSize: 18, color: 'text.secondary' }} /><Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontSize: 13.5 }}>{d.name}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{d.step} · {d.by} · {dFmt(d.at)}</Typography></Box><StatusChip tone="good" label="В БД 2.0" />
            </Stack>))}
            {!docs.length && <Box sx={{ p: 3, color: 'text.secondary', textAlign: 'center', fontSize: 13 }}>Документов по объекту пока нет</Box>}</List>
        </Section>
        <Section title="История" flush>
          <Box sx={{ px: 2, pb: 1 }}>{hist.map((e, k) => (
            <Stack key={k} direction="row" spacing={2} sx={{ py: 0.75, borderTop: k ? '1px solid #f0f2f5' : 0, fontSize: 13 }}>
              <Box sx={{ width: 100, color: 'text.secondary', flex: 'none', fontSize: 12 }}>{dFmt(e.at)} {tFmt(e.at)}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}><b>{e.by}</b> · {e.r.P.s[e.i].t}<Typography sx={{ fontSize: 12, color: e.kind === 'return' ? 'warning.dark' : 'text.secondary' }}>{NOUN[e.r.p]} · {e.text}</Typography></Box>
            </Stack>))}
            {!hist.length && <Typography sx={{ py: 2, fontSize: 13, color: 'text.secondary', textAlign: 'center' }}>Действий по объекту пока нет</Typography>}</Box>
        </Section>
      </Grid2>
    </Box>
  );
}
