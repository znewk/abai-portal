// Мои задачи: активные шаги процессов на дорожках роли — по срочности (просрочено · сегодня · на неделе · позже),
// с объектом, сроком и статусом; выполненные — с результатом. Задача открывает форму шага в экземпляре.
import { useMemo, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, Tabs, Tab, Stack, Select, MenuItem, Typography, Link, Chip } from '@mui/material';
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded';
import { useApp } from '../state.jsx';
import { PageHeader, StatusChip, Code, Demo } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import { BPMN, T_ST, PARTS, partOfTask } from '../data/core.js';
import { taskPath, dueText, nowDemo } from '../data/exec.js';
import { dFmt, tFmt, plural, TODAY } from '../lib/format.js';

const TABS = [['active', 'Активные'], ['late', 'Просроченные'], ['sign', 'На подписании'], ['rework', 'На доработке'], ['done', 'Выполненные']];
const bucket = (t, now) => { if (!t.due) return 'later'; if (t.due < now) return 'late'; const d = (t.due - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5; return d < 1 ? 'today' : d < 7 ? 'week' : 'later'; };
const BUCKET_T = { late: 'Просрочено', today: 'Сегодня', week: 'На этой неделе', later: 'Позже' };
const dueColor = (t, now) => (t.st === 'done' ? 'text.secondary' : t.due < now ? 'error.main' : t.due - now < 36e5 * 36 ? 'warning.dark' : 'text.primary');

export const taskColumns = (now, withProc = true) => [
  { field: 't', headerName: 'Задача', flex: 2.2, minWidth: 320, renderCell: ({ row }) => <Box sx={{ py: 0.25 }}><Box sx={{ lineHeight: 1.35, fontWeight: 500 }}>{row.t}</Box><Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{row.title || row.pt}{row.r && row.p ? ` · ${row.r}` : ''}{withProc && row.p ? <Demo> {row.p} {row.s ? row.s.c : ''}</Demo> : null}{row.rework ? <Box component="span" sx={{ color: 'warning.dark', fontWeight: 600 }}> · замечание: {row.rework.comment.slice(0, 80)}{row.rework.comment.length > 80 ? '…' : ''}</Box> : null}</Typography></Box> },
  { field: 'objName', headerName: 'Объект', flex: 1, minWidth: 170, renderCell: ({ row }) => (row.obj && row.obj.path ? <Link component={RouterLink} to={row.obj.path} underline="hover" onClick={(e) => e.stopPropagation()} sx={{ fontWeight: 500 }}>{row.objName}</Link> : row.objName) },
  { field: 'from', headerName: 'От кого', flex: 1, minWidth: 160, renderCell: ({ row }) => <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.3 }}>{row.from}</Typography> },
  { field: 'due', headerName: 'Срок', width: 170, type: 'date', renderCell: ({ row }) => <Box sx={{ color: dueColor(row, now), fontWeight: row.due < now ? 600 : 400, lineHeight: 1.3 }}>{dFmt(row.due)}<Typography sx={{ fontSize: 11.5, color: 'inherit', opacity: 0.85 }}>{dueText(row.due, now)}</Typography></Box> },
  { field: 'st', headerName: 'Статус', width: 140, valueGetter: (v) => T_ST[v][0], renderCell: ({ row }) => <StatusChip tone={T_ST[row.st][1]} label={T_ST[row.st][0]} /> },
];

export default function Tasks() {
  const { tasks, doneTasks, role, toast } = useApp(); const nav = useNavigate(); const now = nowDemo();
  const [tab, setTab] = useState('active'); const [pf, setPf] = useState(''); const [mf, setMf] = useState('');
  const by = (st) => (st === 'active' ? tasks : st === 'done' ? doneTasks : st === 'late' ? tasks.filter((t) => t.due && t.due < now) : tasks.filter((t) => t.st === st));
  const flt = (t) => (!pf || t.p === pf) && (!mf || partOfTask(t) === mf);
  const rows = useMemo(() => by(tab).filter(flt).sort((a, b) => (tab === 'done' ? b.at - a.at : (a.due || 0) - (b.due || 0))), [tasks, doneTasks, tab, pf, mf]); // eslint-disable-line react-hooks/exhaustive-deps
  const procs = [...new Set(tasks.map((t) => t.p).filter(Boolean))];
  const groups = useMemo(() => { const g = {}; rows.forEach((t) => { const b = bucket(t, now); (g[b] = g[b] || []).push(t); }); return g; }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const cols = taskColumns(now);
  const doneCols = [cols[0], cols[1], { field: 'at', headerName: 'Выполнено', width: 150, valueFormatter: (v) => `${dFmt(v)} ${tFmt(v)}` }, { field: 'text', headerName: 'Результат', flex: 1.2, minWidth: 200, renderCell: ({ row }) => <Typography sx={{ fontSize: 12.5, lineHeight: 1.3 }}>{row.text}</Typography> }];
  const lateN = tasks.filter((t) => t.due && t.due < now).length;
  return (
    <Box>
      <PageHeader title="Мои задачи" sub={`${role.short} · шаги процессов, ожидающие вашего решения${lateN ? ` · ${lateN} ${plural(lateN, 'просрочена', 'просрочены', 'просрочено')}` : ''}`}
        actions={<Button variant="outlined" startIcon={<FileDownloadRounded />} onClick={() => toast('Список задач выгружен (.xlsx)', 'info')}>Выгрузить</Button>} />
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }} variant="scrollable">
          {TABS.map(([v, l]) => <Tab key={v} value={v} label={<Stack direction="row" spacing={1} alignItems="center"><span>{l}</span><Box sx={{ bgcolor: v === 'late' && by(v).length ? '#fbe9e9' : '#eef1f5', color: v === 'late' && by(v).length ? '#b02a2a' : 'text.secondary', borderRadius: 5, px: 0.9, fontSize: 11, fontWeight: 700 }}>{by(v).length}</Box></Stack>} />)}
        </Tabs>
        {role.id !== 'admin' && <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, pt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
          <Select size="small" value={mf} displayEmpty onChange={(e) => { setMf(e.target.value); setPf(''); }} sx={{ minWidth: 220, fontSize: 13 }}>
            <MenuItem value="">Все модули</MenuItem>
            {PARTS.filter((p) => tasks.some((t) => partOfTask(t) === p.id)).map((p) => <MenuItem key={p.id} value={p.id}>{p.t}</MenuItem>)}
          </Select>
          <Select size="small" value={pf} displayEmpty onChange={(e) => setPf(e.target.value)} sx={{ minWidth: 300, fontSize: 13 }}>
            <MenuItem value="">Все процессы</MenuItem>
            {procs.filter((p) => !mf || tasks.some((t) => t.p === p && partOfTask(t) === mf)).map((p) => <MenuItem key={p} value={p}>{p} · {BPMN.find((x) => x.p === p).short}</MenuItem>)}
          </Select>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{rows.length} {plural(rows.length, 'задача', 'задачи', 'задач')}</Typography>
        </Stack>}
        {tab === 'done' ? <DataTable rows={rows} pageSize={12} onRowClick={(t) => nav(taskPath(t))} columns={doneCols} localeText={{ noRowsLabel: 'Выполненных задач пока нет' }} />
          : tab === 'active' && rows.length ? ['late', 'today', 'week', 'later'].filter((b) => groups[b]).map((b) => (
            <Box key={b}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, pt: 2, pb: 0.5 }}><Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: b === 'late' ? 'error.main' : 'text.secondary' }}>{BUCKET_T[b]}</Typography><Chip size="small" label={groups[b].length} sx={{ height: 18, fontSize: 11, bgcolor: b === 'late' ? '#fbe9e9' : '#eef1f5', color: b === 'late' ? '#b02a2a' : 'text.secondary' }} /></Stack>
              <DataTable rows={groups[b]} pageSize={0} onRowClick={(t) => nav(taskPath(t))} columns={cols} columnHeaderHeight={b === 'late' || b === Object.keys(groups).filter((k) => groups[k])[0] ? 40 : 0} />
            </Box>))
            : <DataTable rows={rows} pageSize={10} onRowClick={(t) => nav(taskPath(t))} columns={cols} localeText={{ noRowsLabel: tab === 'late' ? 'Просроченных задач нет' : tab === 'rework' ? 'Задач, возвращённых на доработку, нет' : 'Задач нет' }} />}
      </Card>
    </Box>
  );
}
