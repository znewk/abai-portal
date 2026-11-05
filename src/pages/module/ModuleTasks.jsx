// Задачи модуля: шаги процессов модуля, ожидающие роль; клик — форма шага в экземпляре.
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Tab, Box, Stack } from '@mui/material';
import { useApp } from '../../state.jsx';
import DataTable from '../../components/DataTable.jsx';
import { partOfTask } from '../../data/core.js';
import { taskPath, nowDemo } from '../../data/exec.js';
import { taskColumns } from '../Tasks.jsx';
import { dFmt, tFmt } from '../../lib/format.js';

export default function ModuleTasks() {
  const { part } = useParams(); const nav = useNavigate(); const { tasks, doneTasks } = useApp(); const [tab, setTab] = useState('active'); const now = nowDemo();
  const act = tasks.filter((t) => partOfTask(t) === part); const done = doneTasks.filter((t) => partOfTask(t) === part);
  const cols = taskColumns(now);
  const doneCols = [cols[0], cols[1], { field: 'at', headerName: 'Выполнено', width: 150, valueFormatter: (v) => `${dFmt(v)} ${tFmt(v)}` }, { field: 'text', headerName: 'Результат', flex: 1, minWidth: 200 }];
  return (
    <Card>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        {[['active', 'Активные', act.length], ['done', 'Выполненные', done.length]].map(([v, l, n]) => <Tab key={v} value={v} label={<Stack direction="row" spacing={1} alignItems="center"><span>{l}</span><Box sx={{ bgcolor: '#eef1f5', borderRadius: 5, px: 0.9, fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>{n}</Box></Stack>} />)}
      </Tabs>
      {tab === 'active' ? <DataTable rows={act.sort((a, b) => a.due - b.due)} pageSize={10} onRowClick={(t) => nav(taskPath(t))} columns={cols} localeText={{ noRowsLabel: 'Задач по модулю нет — все задачи роли в разделе «Мои задачи»' }} />
        : <DataTable rows={done} pageSize={10} onRowClick={(t) => nav(taskPath(t))} columns={doneCols} localeText={{ noRowsLabel: 'Выполненных задач по модулю нет' }} />}
    </Card>
  );
}
