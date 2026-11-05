// Связь рабочих мест ЦД добычи с записями процессов: поиск записи по объекту, состояние записи (текущие шаги, исполнители, срок)
// и переход в форму шага. Действие, которое в BPMN является шагом, выполняется в форме шага; рабочее место ведёт в шаг.
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import EastRounded from '@mui/icons-material/EastRounded';
import { useApp } from '../../state.jsx';
import { StatusChip, Demo } from '../../components/ui.jsx';
import { runPath, stepPath, runTitle, runNum, dueText } from '../../data/exec.js';
import { dFmt } from '../../lib/format.js';

// Запись процесса p по объекту (активная — в приоритете)
export const runOf = (runs, p, objId) => { const rs = runs.filter((r) => r.p === p && (!objId || r.obj.id === objId)); return rs.find((r) => r.status === 'active') || rs[0] || null; };
// Шаг записи на дорожке роли (первый активный)
export const myStep = (role, run) => (run && role ? run.active.find((a) => role.lane(run.p, run.P.s[a.i].r)) || null : null);
// Активен ли в записи шаг с кодом из списка
export const atStep = (run, codes) => (run ? run.active.find((a) => codes.includes(run.P.s[a.i].c)) || null : null);
export const recState = (run) => (!run ? null : run.status === 'done' ? ['Завершён', 'good'] : run.late ? ['Просрочен', 'crit'] : ['В срок', 'info']);

// Состояние записи: текущие шаги и исполнители, срок, кнопка перехода (в свой шаг — выполнить, иначе — открыть запись)
export function RunState({ run, act, open = 'Открыть в процессе', title = true, sx }) {
  const { role } = useApp(); const nav = useNavigate();
  if (!run) return null;
  const mine = myStep(role, run); const st = recState(run);
  const cur = run.status === 'done' ? `Завершён ${run.finishedAt ? dFmt(run.finishedAt) : ''}` : run.active.map((a) => `${run.P.s[a.i].t} — ${run.P.s[a.i].r}`).join('; ') || 'Ожидает завершения параллельных ветвей';
  return (
    <Box sx={{ p: 1.5, border: '1px solid #e3e7ee', borderRadius: 1.5, bgcolor: '#fafbfc', ...sx }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {title && <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{runTitle(run)}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>№ {runNum(run)}</Typography><Demo>{run.id}</Demo>
            <StatusChip tone={st[1]} label={run.status === 'active' ? `${st[0]} · ${dueText(run.worst)}` : st[0]} />
          </Stack>}
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: title ? 0.25 : 0 }}>{run.status === 'done' ? cur : `Сейчас: ${cur}`}</Typography>
        </Box>
        {mine ? <Button size="small" variant="contained" endIcon={<EastRounded />} sx={{ flex: 'none' }} onClick={() => nav(stepPath(run, mine.i))}>{act || 'Выполнить шаг в процессе'}</Button>
          : <Button size="small" endIcon={<EastRounded />} sx={{ flex: 'none' }} onClick={() => nav(runPath(run))}>{open}</Button>}
      </Stack>
    </Box>
  );
}
