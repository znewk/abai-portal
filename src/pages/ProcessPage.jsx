// Карточка процесса BPMN: участники и шаги, таблица шагов, экземпляры, документы и системы, связи.
import { useState, useContext } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, Tabs, Tab, Stack, Typography, Tooltip, Chip, Link, List } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import DescriptionRounded from '@mui/icons-material/DescriptionRounded';
import EastRounded from '@mui/icons-material/EastRounded';
import { useApp } from '../state.jsx';
import { PageHeader, KpiRow, Section, Grid2, KV, Code, Pill, StatusChip, Hbars, IconBox, EmbedCtx, Demo } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import { BPMN, partOfDir } from '../data/core.js';
import { runPath, runTitle, dueText, bpmnGaps } from '../data/exec.js';
import { procPath } from '../layout/nav.js';
import { DIRS, isAbai, sysOf, lanesOf } from './Processes.jsx';
import { fmt, pct, dFmt, plural } from '../lib/format.js';
import { C } from '../theme.js';

const events = (P, k) => [...new Set(P.s.flatMap((s) => s[k].filter((x) => typeof x[0] !== 'number').map((x) => x[0])))];

export default function ProcessPage() {
  const { code } = useParams(); const { role, runs, demo } = useApp(); const embedded = useContext(EmbedCtx); const nav = useNavigate(); const [tab, setTab] = useState('lanes');
  const P = BPMN.find((x) => x.p === code);
  if (!P) return <PageHeader title="Процесс не найден" sub={<>Процесса с кодом «{code}» нет в реестре. <Link component={RouterLink} to="/proc">Реестр процессов</Link></>} />;
  const dir = DIRS.find((d) => d[0] === P.m); const lanes = lanesOf(P); const docs = [...new Set(P.s.flatMap((s) => s.d))]; const inst = runs.filter((r) => r.p === P.p && r.status === 'active');
  const trig = events(P, 'pv').filter((x) => !/^[ГРБД]\d/.test(x)); const res = events(P, 'nx').filter((x) => !/^[ГРБД]\d/.test(x));
  const links = [...new Set(events(P, 'pv').concat(events(P, 'nx')).filter((x) => /^[ГРБД]\d/.test(x)))];
  const my = P.s.filter((s) => role.lane(P.p, s.r)).length; const ab = P.s.filter(isAbai).length;
  const codeOf = (x) => x.match(/^([ГРБД]\d+(?:\.\d)?)/)[1];
  const gaps = bpmnGaps(P); const gapOf = (i) => (gaps.dead.has(i) ? 'нет исходящего перехода в BPMN' : gaps.orphan.has(i) ? 'нет входящего перехода в BPMN' : gaps.loop.has(i) ? 'взаимный переход без условия выхода в BPMN — проходится один раз' : '');
  const nGaps = new Set([...gaps.dead, ...gaps.orphan, ...gaps.loop]).size;

  return (
    <Box>
      {!embedded && <>      <PageHeader title={`${P.p} · ${P.t}`} sub={`${dir ? dir[1] : ''}${P.owner ? ' · владелец — ' + P.owner : ''}`}
        actions={<><Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => nav('/proc')}>Реестр</Button>{my > 0 && <Button variant="contained" onClick={() => nav('/tasks')}>Мои задачи по процессу</Button>}</>} />
      <KpiRow items={[
        { label: 'Этапов', value: fmt(P.s.length), d: `${lanes.length} участников` },
        { label: 'Этапов в системах ABAI', value: pct((ab / P.s.length) * 100, 0), d: `${ab} из ${P.s.length}` },
        { label: 'Записей в работе', value: fmt(inst.length), d: `${inst.filter((i) => i.late).length} с нарушением срока` },
      ]} />
      </>}
      <Grid2 cols="2fr 1fr">
        <Section title="О процессе">
          {P.idea && <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 2 }}>{P.idea}</Typography>}
          <KV rows={[['Рабочее место', P.ws], ['Триггер', trig.length ? trig.map((x) => <div key={x}>{x}</div>) : ''], ['Результат', res.length ? res.map((x) => <div key={x}>{x}</div>) : '']]} />
        </Section>
        <Section title="Связанные процессы" info="По ссылкам на смежные процессы в BPMN Dream TO BE" flush={links.length > 0}>
          {links.length ? <List disablePadding>{links.map((x) => { const c = codeOf(x); const Q = BPMN.find((q) => q.p === c); return (
            <Stack key={x} direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1, borderTop: '1px solid #f0f2f5' }}><IconBox icon={EastRounded} />{Q ? <Link component={RouterLink} to={procPath(partOfDir(Q.m), c)} sx={{ fontSize: 13.5 }}>{x}</Link> : <Typography sx={{ fontSize: 13.5 }}>{x}</Typography>}</Stack>); })}</List>
            : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Связанных процессов нет</Typography>}
        </Section>
      </Grid2>
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="lanes" label="Участники и этапы" /><Tab value="steps" label={`Этапы · ${P.s.length}`} /><Tab value="inst" label={`${demo ? 'Экземпляры' : 'Записи в работе'} · ${inst.length}`} /><Tab value="docs" label="Документы и системы" />
        </Tabs>
        {tab === 'lanes' && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              {lanes.map(([r, n], i) => { const mine = role.lane(P.p, r); return (
                <Box key={r} sx={{ display: 'grid', gridTemplateColumns: '210px 1fr', borderTop: i ? '1px solid' : 0, borderColor: 'divider', bgcolor: mine ? '#f5f9ff' : '#fff' }}>
                  <Box sx={{ p: 1.5, bgcolor: mine ? '#edf4fd' : '#fafbfc', borderRight: '1px solid', borderColor: 'divider', borderLeft: mine ? `3px solid ${C.brand}` : 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{n} {plural(n, 'шаг', 'шага', 'шагов')}</Typography>
                    {mine && <Chip size="small" label="Ваша роль" sx={{ mt: 0.75, bgcolor: '#e8f0fb', color: 'primary.dark' }} />}
                  </Box>
                  <Box sx={{ p: 1.25, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignContent: 'flex-start' }}>
                    {P.s.map((s, i) => [s, i]).filter(([s]) => s.r === r).map(([s, i]) => (
                      <Tooltip key={i} title={<><b>{demo ? s.c + ' ' : ''}{s.t}</b><br />{s.s.join(', ') || 'без системы'}{s.d.length ? <><br />Документы: {s.d.join('; ')}</> : null}{demo && gapOf(i) ? <><br />Пробел модели: {gapOf(i)}</> : null}</>}>
                        <Box sx={{ fontSize: 12, bgcolor: isAbai(s) ? '#dbe8f8' : s.s.length ? '#f1ecdf' : '#f0f1f4', borderRadius: 1.5, px: 1, py: 0.6, maxWidth: 300, lineHeight: 1.3, cursor: 'default', ...(demo && gapOf(i) ? { outline: '1.5px dashed #8b5cf6', outlineOffset: '-1.5px' } : {}) }}>
                          {demo && <Box component="span" sx={{ fontFamily: 'Consolas, monospace', fontSize: 11, color: 'text.secondary', mr: 0.75 }}>{s.c}</Box>}{s.t}
                          {demo && gapOf(i) && <Box component="span" sx={{ display: 'block', fontSize: 11, color: '#6d28d9', mt: 0.25 }}>{gapOf(i)}</Box>}
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                </Box>); })}
            </Box>
            <Stack direction="row" spacing={2.5} sx={{ mt: 1.5, fontSize: 12, color: 'text.secondary', flexWrap: 'wrap', rowGap: 0.5 }}>
              {[['#dbe8f8', 'Этап в системе ABAI'], ['#f1ecdf', 'Инженерное ПО или внешняя система'], ['#f0f1f4', 'Ручной этап']].map(([c, t]) => <Stack key={t} direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: 0.75, bgcolor: c }} /><span>{t}</span></Stack>)}
              {demo && nGaps > 0 && <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: '#6d28d9' }}><Box sx={{ width: 12, height: 12, borderRadius: 0.75, outline: '1.5px dashed #8b5cf6' }} /><span>Пробелы модели BPMN: {nGaps} {plural(nGaps, 'шаг', 'шага', 'шагов')}</span></Stack>}
            </Stack>
          </Box>
        )}
        {tab === 'steps' && <DataTable search pageSize={15} rows={P.s.map((s, i) => ({ ...s, id: i }))} columns={[
          ...(demo ? [{ field: 'c', headerName: 'Код', width: 100, renderCell: ({ value }) => <Code>{value}</Code> }] : [{ field: 'n', headerName: '№', width: 60, type: 'number', valueGetter: (v, row) => row.id + 1 }]),
          { field: 't', headerName: 'Шаг', flex: 2, minWidth: 260, renderCell: ({ row }) => <Box>{row.t}{demo && gapOf(row.id) ? <Typography sx={{ fontSize: 11.5, color: '#6d28d9' }}>Пробел модели: {gapOf(row.id)}</Typography> : null}</Box> },
          { field: 'r', headerName: 'Исполнитель', width: 190 },
          { field: 's', headerName: 'Системы', flex: 1, minWidth: 200, valueGetter: (v) => v.join(', '), renderCell: ({ row }) => (row.s.length ? <Box>{row.s.map((x) => <Pill key={x}>{x}</Pill>)}</Box> : <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>вне ИС</Typography>) },
          { field: 'd', headerName: 'Документы', flex: 1, minWidth: 200, valueGetter: (v) => v.join('; '), renderCell: ({ value }) => <Typography sx={{ fontSize: 12 }}>{value}</Typography> },
          { field: 'nx', headerName: 'Далее', width: 170, sortable: false, renderCell: ({ row }) => <Box>{row.nx.map((x, j) => <div key={j}>{typeof x[0] === 'number' ? <>{demo ? <Code>{P.s[x[0]].c}</Code> : <Typography component="span" sx={{ fontSize: 12 }}>{x[0] + 1}.</Typography>} <Typography component="span" sx={{ fontSize: 11.5, color: 'text.secondary' }}>{x[1] || ''}</Typography></> : <Typography component="span" sx={{ fontSize: 11.5, color: 'text.secondary' }}>{x[0]}</Typography>}</div>)}</Box> },
        ]} />}
        {tab === 'inst' && <DataTable rows={inst} onRowClick={(r) => nav(runPath(r))} columns={[
          { field: 'obj', headerName: 'Запись', width: 260, valueGetter: (v, row) => row.obj.short, renderCell: ({ row }) => <Box><b>{runTitle(row)}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>начат {dFmt(row.started)}</Typography></Box> },
          { field: 'pr', headerName: 'Ход процесса', flex: 1, minWidth: 260, renderCell: ({ row }) => { const d = new Set(row.done.map((x) => x.i)); const a = new Set(row.active.map((x) => x.i)); return <Stack direction="row" spacing="2px" sx={{ width: '100%' }}>{P.s.map((s, i) => <Tooltip key={i} title={`${demo ? s.c + ' ' : ''}${s.t}`}><Box sx={{ flex: 1, height: 10, minWidth: 2, borderRadius: 0.5, bgcolor: d.has(i) ? C.good : a.has(i) ? C.brand : '#e3e7ee' }} /></Tooltip>)}</Stack>; } },
          { field: 'si', headerName: 'Текущие шаги', flex: 1, minWidth: 240, sortable: false, renderCell: ({ row }) => <Box>{row.active.map((a) => <div key={a.i}>{demo && <Code>{P.s[a.i].c}</Code>} {P.s[a.i].t}<Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}> · {P.s[a.i].r}</Typography></div>)}</Box> },
          { field: 'late', headerName: 'Срок', width: 160, renderCell: ({ row }) => (row.late ? <StatusChip tone="crit" label={dueText(row.worst)} /> : <StatusChip tone="good" label={dueText(row.worst)} />) },
        ]} />}
        {tab === 'docs' && (
          <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
            <Box><Typography variant="overline" color="text.secondary">Документы процесса</Typography>
              {docs.length ? docs.map((d) => { const st = P.s.find((s) => s.d.includes(d)); return (
                <Stack key={d} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1, borderTop: '1px solid #f0f2f5' }}><IconBox icon={DescriptionRounded} /><Box><Typography sx={{ fontSize: 13.5 }}>{d}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{demo && <Code>{st.c}</Code>} {st.t} · {st.r}</Typography></Box></Stack>); })
                : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Документы по процессу не формируются</Typography>}
            </Box>
            <Box><Typography variant="overline" color="text.secondary" component="div" sx={{ mb: 1 }}>Системы по числу шагов</Typography>
              <Hbars rows={sysOf(P).map(([x, n]) => ({ l: x, v: n, c: /^ABAI|^КХД/.test(x) ? C.s[0] : C.s[3] }))} />
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  );
}
