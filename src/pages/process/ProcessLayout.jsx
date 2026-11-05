// Процесс модуля: компактный заголовок, вкладки «Рабочее место · Ход исполнения · Регламент», запуск по объекту (для роли-владельца).
import { useState, useEffect } from 'react';
import { Outlet, useParams, useLocation, useNavigate, Link as RouterLink, Navigate, useSearchParams } from 'react-router-dom';
import { Box, Tabs, Tab, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField, Alert } from '@mui/material';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import { useApp } from '../../state.jsx';
import { PARTS, partOfDir, NOUN } from '../../data/core.js';
import { procOf, objectsFor, startSteps, runPath } from '../../data/exec.js';
import { procPath, canSee } from '../../layout/nav.js';
import { plural } from '../../lib/format.js';
import { Demo } from '../../components/ui.jsx';

export default function ProcessLayout() {
  const { part, code } = useParams(); const loc = useLocation(); const nav = useNavigate(); const [sp, setSp] = useSearchParams();
  const { role, runs, createRun, toast } = useApp();
  const [open, setOpen] = useState(false); const [obj, setObj] = useState(null);
  const P = procOf(code); const M = PARTS.find((x) => x.id === part);
  useEffect(() => { if (sp.get('start')) { setOpen(true); setSp({}, { replace: true }); } }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!P || !M || partOfDir(P.m) !== part) return <Navigate to={'/m/' + part} replace />;
  if (!canSee(role, loc.pathname)) return <Typography>Процесс недоступен для роли «{role.short}».</Typography>;
  const wsOk = canSee(role, procPath(part, code));
  const seg = decodeURIComponent(loc.pathname).split('/').filter(Boolean);
  const tab = seg[4] === 'runs' || seg[4] === 'run' ? 'runs' : seg[4] === 'model' ? 'model' : 'ws';
  const active = runs.filter((r) => r.p === P.p && r.status === 'active');
  const mine = active.filter((r) => r.active.some((a) => role.lane(P.p, P.s[a.i].r))).length;
  // Запускает процесс роль, выполняющая его первый шаг
  const canStart = !role.limited && startSteps(P).some((i) => role.lane(P.p, P.s[i].r));
  const objects = objectsFor(P).filter((o) => !active.some((r) => r.obj.id === o.id));
  const start = () => {
    if (!obj) return; const r = createRun(P, obj.id); setOpen(false); setObj(null);
    toast(`${NOUN[P.p]} · ${obj.short}: процесс запущен, первый шаг — ${[...new Set(r.active.map((a) => P.s[a.i].r))].join(', ')}`); nav(runPath(r));
  };
  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ mb: 1, flexWrap: 'wrap', rowGap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 320 }}>
          <Typography variant="h4" component="h1"><Box component="span" sx={{ color: M.c, fontWeight: 700, mr: 1 }}>{P.p}</Box>{P.t}<Demo>{P.s.length} шагов Dream TO BE</Demo></Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{P.owner ? `Владелец — ${P.owner} · ` : ''}{active.length} {plural(active.length, 'запись', 'записи', 'записей')} в работе{mine ? ` · ${mine} ${plural(mine, 'ожидает', 'ожидают', 'ожидают')} вашего решения` : ''}</Typography>
        </Box>
        {canStart && <Button variant="contained" startIcon={<PlayArrowRounded />} onClick={() => setOpen(true)}>Запустить процесс</Button>}
      </Stack>
      <Tabs value={tab} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}>
        {wsOk && <Tab value="ws" label="Рабочее место" component={RouterLink} to={procPath(part, P.p)} sx={{ fontWeight: 600 }} />}
        {wsOk && <Tab value="runs" label={`Ход исполнения · ${active.length}`} component={RouterLink} to={procPath(part, P.p, 'runs')} sx={{ fontWeight: 600 }} />}
        {wsOk && <Tab value="model" label="Регламент процесса" component={RouterLink} to={procPath(part, P.p, 'model')} sx={{ fontWeight: 600 }} />}
        {!wsOk && <Tab value={tab} label="Мой шаг в процессе" sx={{ fontWeight: 600 }} />}
      </Tabs>
      <Outlet />
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Запуск: {NOUN[P.p] || P.t}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Выберите объект, по которому запускается процесс. Первый шаг — «{P.s[startSteps(P)[0]].t}» ({P.s[startSteps(P)[0]].r}).</Typography>
          {objects.length ? <Autocomplete options={objects} value={obj} onChange={(e, v) => setObj(v)} getOptionLabel={(o) => o.name} renderOption={(p, o) => { const { key, ...rest } = p; return <li key={key} {...rest}><Box><Typography sx={{ fontSize: 13.5 }}>{o.name}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{o.sub}</Typography></Box></li>; }} renderInput={(p) => <TextField {...p} label="Объект" size="small" autoFocus />} noOptionsText="Объектов не найдено" />
            : <Alert severity="info">Свободных объектов для запуска нет: по всем объектам этого вида процесс уже идёт.</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setOpen(false)}>Отмена</Button><Button variant="contained" disabled={!obj} onClick={start}>Запустить</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
