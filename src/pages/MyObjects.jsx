// Мои объекты (подрядная организация): буровые, скважины в ремонте и освоении, сейсморазведочные работы — с текущими шагами подрядчика.
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useApp } from '../state.jsx';
import { PageHeader, Section, StatusChip } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import { NOUN } from '../data/core.js';
import { runPath, dueText, nowDemo } from '../data/exec.js';
import { DRILL } from './skv/drill.data.js';
import { fmt } from '../lib/format.js';

export default function MyObjects() {
  const nav = useNavigate(); const { runs, role } = useApp(); const now = nowDemo();
  const mine = runs.filter((r) => r.status === 'active' && r.P.s.some((s) => role.lane(r.p, s.r)));
  const byObj = Object.values(mine.reduce((m, r) => { (m[r.obj.id] = m[r.obj.id] || { id: r.obj.id, o: r.obj, rs: [] }).rs.push(r); return m; }, {}));
  const cols = [
    { field: 'name', headerName: 'Объект', flex: 1.2, minWidth: 240, valueGetter: (v, r) => r.o.name, renderCell: ({ row }) => { const d = DRILL.find((x) => x.id === row.o.short); return <Box><b>{row.o.name}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{d ? `${d.rig} · забой ${fmt(d.bh)} м из ${fmt(d.depth)} · сутки ${d.cur} из ${d.days}` : row.o.sub}</Typography></Box>; } },
    { field: 'rs', headerName: 'Процессы и мои шаги', flex: 1.8, minWidth: 320, sortable: false, renderCell: ({ row }) => <Box sx={{ py: 0.25 }}>{row.rs.map((r) => <Box key={r.id} sx={{ lineHeight: 1.3, mb: 0.25 }}>{NOUN[r.p]}<Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}> · {r.active.map((a) => `${r.P.s[a.i].t}${role.lane(r.p, r.P.s[a.i].r) ? ' (мой шаг)' : ' · ' + r.P.s[a.i].r}`).join('; ')}</Typography></Box>)}</Box> },
    { field: 'st', headerName: 'Срок', width: 170, sortable: false, renderCell: ({ row }) => { const my = row.rs.flatMap((r) => r.active.filter((a) => role.lane(r.p, r.P.s[a.i].r))); const worst = my.reduce((m, a) => (!m || a.due < m ? a.due : m), null); return worst ? <StatusChip tone={worst < now ? 'crit' : 'info'} label={dueText(worst, now)} /> : <StatusChip label="Ожидание заказчика" />; } },
  ];
  return (
    <Box>
      <PageHeader title="Мои объекты" sub="Буровые, скважины и работы, по которым подрядная организация участвует в процессах" />
      <Section title={`Объекты · ${byObj.length}`} flush><DataTable rows={byObj} columns={cols} pageSize={0} onRowClick={(r) => nav(runPath(r.rs[0]))} /></Section>
    </Box>
  );
}
