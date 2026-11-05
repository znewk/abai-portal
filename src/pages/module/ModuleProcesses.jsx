// Процессы модуля: реестр процессов BPMN модуля с ходом исполнения и долей роли.
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useApp } from '../../state.jsx';
import { Section, StatusChip, Code } from '../../components/ui.jsx';
import DataTable from '../../components/DataTable.jsx';
import { BPMN, partOfDir } from '../../data/core.js';
import { procPath, canSee } from '../../layout/nav.js';

export default function ModuleProcesses() {
  const { part } = useParams(); const nav = useNavigate(); const { role, tasks, runs } = useApp();
  const rows = BPMN.filter((P) => partOfDir(P.m) === part).map((P) => {
    const pr = runs.filter((r) => r.p === P.p && r.status === 'active');
    return { id: P.p, P, inWork: pr.length, late: pr.filter((r) => r.late).length, mine: P.s.filter((s) => role.lane(P.p, s.r)).length, my: tasks.filter((t) => t.p === P.p).length };
  });
  return (
    <Section title="Процессы модуля" info="Процессы и шаги — из итогового архива BPMN, вариант Dream TO BE (целевой вариант на ABAI)" flush>
      <DataTable rows={rows} pageSize={0} onRowClick={(r) => canSee(role, procPath(part, r.id)) && nav(procPath(part, r.id))} columns={[
        { field: 'id', headerName: 'Код', width: 80, renderCell: ({ value }) => <Code>{value}</Code> },
        { field: 'P', headerName: 'Процесс', flex: 2, minWidth: 300, sortable: false, renderCell: ({ row }) => <Box><Box sx={{ fontWeight: 500 }}>{row.P.t}</Box><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.P.ws}</Typography></Box> },
        { field: 'owner', headerName: 'Владелец', width: 160, valueGetter: (v, row) => row.P.owner },
        { field: 'inWork', headerName: 'В работе', width: 100, type: 'number' },
        { field: 'late', headerName: 'Статус', width: 150, renderCell: ({ row }) => (row.late ? <StatusChip tone="crit" label={`${row.late} с нарушением срока`} /> : <StatusChip tone="good" label="В срок" />) },
        { field: 'my', headerName: 'Мои задачи', width: 110, type: 'number', renderCell: ({ value }) => (value ? <b>{value}</b> : <span style={{ color: '#a3aab6' }}>—</span>) },
      ]} />
    </Section>
  );
}
