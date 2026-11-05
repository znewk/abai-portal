// Ход исполнения: записи процесса (заявки, сводки, программы …) — объект, текущие шаги и исполнители, срок, состояние.
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, Tabs, Tab, Typography, Stack, Tooltip } from '@mui/material';
import { useApp } from '../../state.jsx';
import { StatusChip, Demo } from '../../components/ui.jsx';
import DataTable from '../../components/DataTable.jsx';
import { procOf, runPath, runNum, dueText, nowDemo } from '../../data/exec.js';
import { NOUN } from '../../data/core.js';
import { dFmt, plural } from '../../lib/format.js';
import { C } from '../../theme.js';

export default function ProcessRuns() {
  const { code } = useParams(); const nav = useNavigate(); const { role, runs } = useApp(); const [tab, setTab] = useState('active');
  const P = procOf(code); const now = nowDemo();
  const all = runs.filter((r) => r.p === code);
  const mine = (r) => r.status === 'active' && r.active.some((a) => role.lane(code, P.s[a.i].r));
  const rows = all.filter((r) => (tab === 'active' ? r.status === 'active' : tab === 'mine' ? mine(r) : r.status === 'done'));
  return (
    <Card>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab value="active" label={`В работе · ${all.filter((r) => r.status === 'active').length}`} />
        <Tab value="mine" label={`Ожидают меня · ${all.filter(mine).length}`} />
        <Tab value="done" label={`Завершённые · ${all.filter((r) => r.status === 'done').length}`} />
      </Tabs>
      <DataTable rows={rows} pageSize={10} onRowClick={(r) => nav(runPath(r))} localeText={{ noRowsLabel: tab === 'mine' ? 'Шагов, ожидающих вашего решения, нет — записи процесса во вкладке «Все»' : 'Записей нет — запустите процесс кнопкой «Запустить процесс»' }} columns={[
        { field: 'obj', headerName: NOUN[code] || 'Объект', flex: 1.2, minWidth: 220, valueGetter: (v, row) => row.obj.short, renderCell: ({ row }) => <Box><b>{row.obj.short}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{runNum(row)}<Demo> {row.id}</Demo></Typography></Box> },
        { field: 'si', headerName: 'Текущий шаг', flex: 1.8, minWidth: 300, sortable: false, renderCell: ({ row }) => (row.status === 'done' ? <span>Процесс завершён {dFmt(row.finishedAt)}</span> : <Box sx={{ py: 0.25 }}>{row.active.map((a) => { const s = P.s[a.i]; const my = role.lane(code, s.r); return <Box key={a.i} sx={{ lineHeight: 1.3, mb: 0.25 }}>{s.t}<Typography component="span" sx={{ fontSize: 12, color: my ? 'primary.main' : 'text.secondary', fontWeight: my ? 600 : 400 }}> · {s.r}{my ? ' · ваш шаг' : ''}</Typography></Box>; })}{(row.pending || []).length > 0 && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>ждёт слияния ветвей: {row.pending.map((i) => P.s[i].t).join('; ')}</Typography>}</Box>) },
        { field: 'pr', headerName: 'Пройдено', width: 170, sortable: false, renderCell: ({ row }) => { const done = new Set(row.done.map((d) => d.i)).size; return (
          <Tooltip title={`${done} ${plural(done, 'этап', 'этапа', 'этапов')} из ~${row.total}`}><Stack direction="row" spacing="2px" sx={{ width: '100%' }}>{Array.from({ length: Math.min(row.total, 20) }, (_, k) => { const n = Math.min(row.total, 20); const d = Math.round((done / row.total) * n); const a = Math.round(((done + row.active.length) / row.total) * n); return <Box key={k} sx={{ flex: 1, height: 8, borderRadius: 0.5, bgcolor: k < d ? C.good : k < a ? C.brand : '#e3e7ee' }} />; })}</Stack></Tooltip>); } },
        { field: 'started', headerName: 'Начат', width: 105, type: 'date', valueFormatter: (v) => dFmt(v) },
        { field: 'worst', headerName: 'Срок', width: 160, valueGetter: (v, row) => (row.worst ? row.worst.getTime() : 0), renderCell: ({ row }) => (row.status === 'done' ? <StatusChip tone="good" label="Завершён" /> : row.worst && row.worst < now ? <StatusChip tone="crit" label={dueText(row.worst)} /> : <StatusChip tone="info" label={dueText(row.worst)} />) },
      ]} />
    </Card>
  );
}
