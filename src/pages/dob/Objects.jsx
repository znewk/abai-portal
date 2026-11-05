// ЦД добычи · объекты: НГДУ и суточные сводки, объекты подготовки и трубопроводы, модели и мероприятия — с процессами по каждому.
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Stack } from '@mui/material';
import { useApp } from '../../state.jsx';
import { Section, StatusChip, Grid2 } from '../../components/ui.jsx';
import DataTable from '../../components/DataTable.jsx';
import { OBJECTS, NOUN } from '../../data/core.js';
import { objOf, runsOf, dueText, nowDemo } from '../../data/exec.js';

const GROUPS = [['Подразделения и суточные сводки', ['ngdu', 'summary']], ['Инфраструктура', ['dns', 'pipe', 'ima']], ['Потенциал, мероприятия, фонд', ['pot', 'event', 'energy', 'mech']]];

export default function Objects() {
  const nav = useNavigate(); const { runs, role } = useApp(); const now = nowDemo();
  const rows = (kinds) => OBJECTS.filter((o) => o.part === 'dob' && kinds.includes(o.kind)).map((o) => { const rs = runsOf(runs, o.id).filter((r) => r.status === 'active'); return { id: o.id, o, rs, mine: rs.some((r) => r.active.some((a) => role.lane(r.p, r.P.s[a.i].r))) }; });
  const cols = [
    { field: 'name', headerName: 'Объект', flex: 1.4, minWidth: 260, valueGetter: (v, r) => r.o.name, renderCell: ({ row }) => <Box><b>{row.o.name}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{(row.o.attrs || []).slice(0, 2).map((a) => `${a[0]}: ${a[1]}`).join(' · ')}</Typography></Box> },
    { field: 'rs', headerName: 'Процессы в работе', flex: 1.6, minWidth: 300, sortable: false, renderCell: ({ row }) => (row.rs.length ? <Box sx={{ py: 0.25 }}>{row.rs.map((r) => <Box key={r.id} sx={{ lineHeight: 1.3 }}>{NOUN[r.p]}<Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}> · {r.P.s[r.active[0].i].t} · {r.lanes.join(', ')}</Typography></Box>)}</Box> : <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>—</Typography>) },
    { field: 'st', headerName: 'Состояние', width: 180, sortable: false, renderCell: ({ row }) => { const late = row.rs.find((r) => r.late); const w = row.rs[0]; return late ? <StatusChip tone="crit" label={dueText(late.worst, now)} /> : w ? <StatusChip tone={row.mine ? 'info' : 'good'} label={row.mine ? 'ваш шаг' : dueText(w.worst, now)} /> : <StatusChip label="Процессов нет" />; } },
  ];
  return (
    <Box>
      {GROUPS.map(([t, kinds]) => <Section key={t} title={t} flush sx={{ mb: 2 }}><DataTable rows={rows(kinds)} columns={cols} pageSize={0} onRowClick={(r) => nav(objOf(r.id).path)} /></Section>)}
    </Box>
  );
}
