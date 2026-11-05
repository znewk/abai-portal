// Экземпляр процесса: ход по шагам с ветвями (слева), форма выбранного шага (в центре), контекст объекта (справа), журнал.
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { Box, Card, Stack, Typography, Button, Alert, LinearProgress, Chip, Divider, Link, Tooltip } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import EastRounded from '@mui/icons-material/EastRounded';
import HourglassEmptyRounded from '@mui/icons-material/HourglassEmptyRounded';
import { useApp } from '../../state.jsx';
import { StatusChip, Code, KV, Demo } from '../../components/ui.jsx';
import { ROLES, ALERTS, W_ST } from '../../data/core.js';
import { stepKind, KIND_T, journal, dueText, runTitle, runNum, runPath, runsOf, nowDemo } from '../../data/exec.js';
import { dFmt, dShort, tFmt, plural } from '../../lib/format.js';
import { C } from '../../theme.js';
import StepForm from './forms/StepForm.jsx';

const roleFor = (code, lane) => ROLES.find((r) => !r.limited && r.lane(code, lane)) || ROLES.find((r) => r.lane(code, lane));

function StepRow({ x, st, on, meta, onClick, mine, parallel }) {
  const dot = st === 'done' ? C.good : st === 'cur' ? (mine ? C.brand : C.warn) : st === 'wait' ? '#b9c4d4' : '#fff';
  return (
    <Box onClick={onClick} sx={{ display: 'flex', gap: 1.25, px: 1.5, py: 0.9, cursor: 'pointer', borderRadius: 1.5, bgcolor: on ? '#e8f0fb' : 'transparent', '&:hover': { bgcolor: on ? '#e8f0fb' : '#f6f8fb' } }}>
      <Box sx={{ width: 20, height: 20, borderRadius: '50%', flex: 'none', mt: 0.2, display: 'grid', placeItems: 'center', bgcolor: dot, border: '2px solid', borderColor: st === 'done' ? C.good : st === 'cur' ? (mine ? C.brand : C.warn) : '#c9ced8', color: '#fff' }}>
        {st === 'done' && <CheckRounded sx={{ fontSize: 13 }} />}{st === 'wait' && <HourglassEmptyRounded sx={{ fontSize: 12, color: '#fff' }} />}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: st === 'cur' ? 600 : 400, color: st === 'next' || st === 'wait' ? 'text.secondary' : 'text.primary', lineHeight: 1.3 }}>{x.t}</Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{x.r}{meta ? ` · ${meta}` : ''}{parallel ? ' · параллельно' : ''}</Typography>
      </Box>
    </Box>
  );
}

// Контекст объекта: карточка, отклонения, другие процессы по объекту
function ObjectPanel({ run, runs }) {
  const o = run.obj; const w = o.well; const nav = useNavigate();
  const others = runsOf(runs, o.id).filter((r) => r.id !== run.id);
  const alerts = w ? ALERTS.filter((a) => a.well === w.id && a.st !== 'Устранено') : [];
  const rows = w ? [['Состояние', W_ST[w.status][0]], ['Подразделение', `${w.ngdu} · ${w.gzu}`], ...(w.type === 'inj' ? [['Приёмистость', `${w.qInj} м³/сут`]] : w.status === 'work' ? [['Дебит жидкости', `${w.qL} м³/сут`], ['Обводнённость', `${w.wc} %`], ['ГНО', `${w.method} · ${w.pump}`], ['Риск отказа ГНО', `${w.risk} %`]] : [['Проектная глубина', `${w.depth} м`], ['Горизонт', w.horizon]])] : (o.attrs || []).slice(0, 6);
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="overline" color="text.secondary">Объект</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{o.path ? <Link component={RouterLink} to={o.path} underline="hover" color="inherit">{o.name}</Link> : o.name}</Typography>
      <Box sx={{ mt: 1.25 }}><KV w="48%" rows={rows} /></Box>
      {alerts.length > 0 && <>
        <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2 }}>Отклонения</Typography>
        {alerts.map((a) => <Box key={a.id} sx={{ fontSize: 13, py: 0.5 }}><StatusChip tone={a.tone} label={a.t} /><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{a.id} · {dShort(a.since)} {tFmt(a.since)} · {a.st}{a.loss ? ` · потери ${a.loss} т/сут` : ''}</Typography></Box>)}
      </>}
      <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2 }}>Процессы по объекту</Typography>
      {others.length ? others.map((r) => (
        <Box key={r.id} onClick={() => nav(runPath(r))} sx={{ py: 0.75, borderTop: '1px solid #f0f2f5', cursor: 'pointer', '&:hover': { bgcolor: '#f6f8fb' } }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{runTitle(r)}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{r.status === 'done' ? `завершён ${dFmt(r.finishedAt)}` : `${r.P.s[r.active[0].i].t} · ${r.lanes.join(', ')}`}</Typography>
        </Box>)) : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Других процессов по объекту нет</Typography>}
      {o.path && <Button size="small" endIcon={<EastRounded />} component={RouterLink} to={o.path} sx={{ mt: 1.5 }}>{w ? 'Паспорт скважины' : 'Карточка объекта'}</Button>}
    </Card>
  );
}

export default function RunPage() {
  const { code, id } = useParams(); const nav = useNavigate(); const [sp, setSp] = useSearchParams();
  const { role, runs, complete, sendBack, resetRun, login, toast, demo } = useApp();
  const run = runs.find((r) => r.id === id); const P = run && run.P;
  const [sel, setSel] = useState(null); const [result, setResult] = useState(null);
  useEffect(() => { const q = sp.get('step'); if (q != null) { setSel(+q); } }, [id, sp]);
  const mineIdx = useMemo(() => (run ? run.active.filter((a) => role.lane(run.p, P.s[a.i].r)).map((a) => a.i) : []), [run, role, P]);
  if (!run) return <Alert severity="warning" action={<Button component={RouterLink} to={`/m/${code ? '' : ''}`.replace(/\/$/, '') || '/'} size="small">К процессу</Button>}>Запись «{id}» не найдена. Возможно, она удалена при сбросе демонстрационных данных.</Alert>;

  const doneIdx = [...new Set(run.done.map((d) => d.i))]; const activeIdx = run.active.map((a) => a.i);
  const show = sel != null && P.s[sel] ? sel : mineIdx[0] != null ? mineIdx[0] : activeIdx[0] != null ? activeIdx[0] : doneIdx[doneIdx.length - 1];
  const s = P.s[show]; const act = run.active.find((a) => a.i === show); const isCur = !!act; const mine = isCur && role.lane(P.p, s.r); const other = isCur && !mine ? roleFor(P.p, s.r) : null;
  const upcoming = []; { const seen = new Set(activeIdx.concat(run.pending || [])); const q = [...activeIdx]; while (q.length && upcoming.length < 6) { const i = q.shift(); P.s[i].nx.forEach((x) => { if (typeof x[0] === 'number' && !seen.has(x[0]) && !doneIdx.includes(x[0])) { seen.add(x[0]); upcoming.push(x[0]); q.push(x[0]); } }); } }
  const j = journal(run); const at = {}; j.filter((e) => e.kind === 'done').forEach((e) => { at[e.i] = e; });
  const lateCnt = run.active.filter((a) => a.due < nowDemo()).length;

  const onDone = (opts) => {
    const n = complete(run, show, opts);
    const nextMine = n.active.filter((a) => role.lane(n.p, P.s[a.i].r)).map((a) => a.i);
    const passed = n.active.filter((a) => a.from === show).map((a) => `${P.s[a.i].r} — «${P.s[a.i].t}»`);
    const msg = n.status === 'done' ? `${runTitle(n)}: процесс завершён` : passed.length ? `Шаг выполнен. Передано: ${passed.join('; ')}` : n.pending && n.pending.length ? 'Шаг выполнен. Следующий шаг ждёт завершения параллельных ветвей' : 'Шаг выполнен';
    toast(msg); setResult({ text: msg, next: nextMine[0] }); setSel(nextMine[0] != null ? nextMine[0] : null); setSp({}, { replace: true });
  };
  const onReturn = (toI, comment) => { const n = sendBack(run, show, toI, comment); toast(`Возвращено на доработку: ${P.s[toI].r} — «${P.s[toI].t}»`, 'warning'); setResult({ text: `Возвращено на доработку: ${P.s[toI].r}` }); setSel(null); setSp({}, { replace: true }); };

  return (
    <Box>
      <Card sx={{ mb: 2, p: 2 }}>
        <Stack direction="row" spacing={3} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Box sx={{ minWidth: 220 }}><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{run.obj.kind === 'well' ? 'Скважина' : 'Объект'}</Typography><Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25 }}>{run.obj.path ? <Link component={RouterLink} to={run.obj.path} underline="hover" color="inherit">{run.obj.short}</Link> : run.obj.short}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{runNum(run)}<Demo> {run.id}</Demo></Typography></Box>
          <Box><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Начат</Typography><Typography sx={{ fontSize: 14 }}>{dFmt(run.started)}</Typography></Box>
          <Box sx={{ minWidth: 160 }}><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{run.status === 'done' ? 'Завершён' : run.active.length > 1 ? 'Сейчас у' : 'Сейчас у'}</Typography><Typography sx={{ fontSize: 14 }}>{run.status === 'done' ? dFmt(run.finishedAt) : run.lanes.join(', ')}</Typography></Box>
          <Box sx={{ flex: 1, minWidth: 200 }}><Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>Пройдено {doneIdx.length} {plural(doneIdx.length, 'этап', 'этапа', 'этапов')}{run.status !== 'done' ? ` · в работе ${run.active.length}${(run.pending || []).length ? ` · ждут слияния ${run.pending.length}` : ''} · впереди ~${Math.max(0, run.total - doneIdx.length - run.active.length)}` : ''}</Typography><LinearProgress variant="determinate" value={run.pr} sx={{ height: 6, borderRadius: 3 }} /></Box>
          {run.status === 'done' ? <StatusChip tone="good" label="Завершён" /> : lateCnt ? <StatusChip tone="crit" label={`Просрочен · ${lateCnt} ${plural(lateCnt, 'шаг', 'шага', 'шагов')}`} /> : <StatusChip tone="info" label="В срок" />}
          {run.changed && <Tooltip title="Вернуть демонстрационное состояние"><Button size="small" startIcon={<ReplayRounded />} onClick={() => { resetRun(run.id); toast('Состояние восстановлено', 'info'); }}>Сбросить</Button></Tooltip>}
        </Stack>
      </Card>

      {/* Раскладка: широкий экран — ход · форма · объект; ноутбук и планшет — ход и объект слева, форма справа; узкий — форма, ход, объект */}
      <Box sx={{ display: 'grid', gap: 2, alignItems: 'start',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '280px minmax(0, 1fr)', xl: '330px minmax(0, 1fr) 300px' },
        gridTemplateRows: { md: 'auto 1fr', xl: 'auto' },
        gridTemplateAreas: { xs: '"form" "steps" "obj"', md: '"steps form" "obj form"', xl: '"steps form obj"' } }}>
        <Card sx={{ py: 1, gridArea: 'steps' }}>
          <Typography variant="overline" color="text.secondary" sx={{ px: 2 }}>Ход исполнения</Typography>
          <Box sx={{ px: 0.5 }}>
            {doneIdx.length > 5 && <Typography sx={{ fontSize: 12, color: 'text.secondary', px: 1.5, py: 0.5, cursor: 'pointer' }} onClick={() => setSel(doneIdx[0])}>… ещё {doneIdx.length - 5} пройденных</Typography>}
            {doneIdx.slice(-5).map((i) => <StepRow key={'d' + i} x={P.s[i]} st="done" on={i === show} meta={at[i] ? dShort(at[i].at) : ''} onClick={() => setSel(i)} />)}
            {run.active.length > 0 && <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', px: 1.5, pt: 1, textTransform: 'uppercase', letterSpacing: '.05em' }}>Сейчас{run.active.length > 1 ? ` · ${run.active.length} параллельно` : ''}</Typography>}
            {run.active.map((a) => <StepRow key={'a' + a.i} x={P.s[a.i]} st="cur" on={a.i === show} mine={role.lane(P.p, P.s[a.i].r)} meta={(role.lane(P.p, P.s[a.i].r) ? 'ваш шаг · ' : '') + dueText(a.due)} onClick={() => setSel(a.i)} />)}
            {(run.pending || []).map((i) => <StepRow key={'p' + i} x={P.s[i]} st="wait" on={i === show} meta="ждёт завершения ветвей" onClick={() => setSel(i)} />)}
            {upcoming.length > 0 && <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', px: 1.5, pt: 1, textTransform: 'uppercase', letterSpacing: '.05em' }}>Далее</Typography>}
            {upcoming.map((i) => <StepRow key={'u' + i} x={P.s[i]} st="next" on={i === show} onClick={() => setSel(i)} />)}
            {run.status === 'done' && <Alert severity="success" sx={{ m: 1.5 }}>Процесс завершён {dFmt(run.finishedAt)}</Alert>}
          </Box>
        </Card>

        <Box sx={{ gridArea: 'form', minWidth: 0 }}>
          {result && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setResult(null)} action={result.next != null ? <Button size="small" onClick={() => { setSel(result.next); setResult(null); }}>К следующему шагу</Button> : <Button size="small" onClick={() => nav('/tasks')}>К задачам</Button>}>{result.text}</Alert>}
          <Card sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
              <Chip size="small" label={KIND_T[stepKind(s)]} sx={{ bgcolor: '#eef1f5' }} />
              {isCur ? <StatusChip tone={mine ? 'info' : 'warn'} label={mine ? 'Ваш шаг' : 'Текущий шаг'} /> : (run.pending || []).includes(show) ? <StatusChip label="Ждёт завершения параллельных ветвей" /> : doneIdx.includes(show) ? <StatusChip tone="good" label="Выполнен" /> : <StatusChip label="Предстоит" />}
              {isCur && act.due && <StatusChip tone={act.due < nowDemo() ? 'crit' : 'good'} label={'Срок: ' + dueText(act.due)} />}
              {isCur && mine && s.r !== role.short && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Вы действуете за подразделение: <b>{s.r}</b></Typography>}
            </Stack>
            <Typography variant="h5">{s.t}</Typography>
            <Demo block>{P.p}{s.c ? ' · шаг ' + s.c : ''} · дорожка «{s.r}»{s.s.length ? ' · ' + s.s.join(', ') : ''}{s.gx ? ' · развилка ' + { x: 'исключающая', p: 'параллельная', i: 'включающая' }[s.gx] : ''}{s.gj ? ' · слияние' : ''}</Demo>
            <Box sx={{ mt: 1.25 }}>
              <KV w="30%" rows={[['Исполнитель', s.r], ['Системы', s.s.join(', ') || 'вне информационных систем'], s.d.length ? ['Документы', s.d.join('; ')] : null, doneIdx.includes(show) && at[show] ? ['Выполнен', `${dFmt(at[show].at)} ${tFmt(at[show].at)} · ${at[show].text}`] : null]} />
            </Box>
            {isCur && act.rework && <Alert severity="warning" sx={{ mt: 1.5 }}><b>Возвращено на доработку</b> ({P.s[act.rework.from].r} · {P.s[act.rework.from].t}): {act.rework.comment}</Alert>}
            <Divider sx={{ my: 2 }} />
            {isCur && mine && <StepForm key={run.id + ':' + show} run={run} i={show} onDone={onDone} onReturn={onReturn} />}
            {isCur && !mine && (
              <Alert severity="info" action={other && demo && <Button size="small" onClick={() => { login(other.id); toast(`Вы вошли как: ${other.short}`, 'info'); }}>Войти как «{other.short}»</Button>}>
                Шаг выполняет «{s.r}»{other && other.short !== s.r ? ` (${other.short})` : ''}. Срок — {dueText(act.due)}. Задача у исполнителя в «Моих задачах».
              </Alert>)}
            {!isCur && doneIdx.includes(show) && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Шаг выполнен{at[show] ? ` ${dFmt(at[show].at)} — ${at[show].text}` : ''}. Результат передан дальше по процессу.</Typography>}
            {!isCur && !doneIdx.includes(show) && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{(run.pending || []).includes(show) ? 'Шаг откроется, когда завершатся все параллельные ветви перед ним.' : 'Шаг станет доступен исполнителю после завершения предыдущих шагов.'}</Typography>}
          </Card>

          <Card sx={{ mt: 2, p: 2 }}>
            <Typography variant="overline" color="text.secondary">Журнал</Typography>
            <Box sx={{ mt: 1 }}>{j.slice().reverse().slice(0, 10).map((e, k) => (
              <Stack key={k} direction="row" spacing={2} sx={{ py: 0.75, borderTop: k ? '1px solid #f0f2f5' : 0, fontSize: 13 }}>
                <Box sx={{ width: 110, color: 'text.secondary', flex: 'none', fontSize: 12 }}>{dFmt(e.at)} {tFmt(e.at)}</Box>
                <Box sx={{ flex: 1 }}><b>{e.by}</b> · {P.s[e.i].t}<Typography sx={{ fontSize: 12, color: e.kind === 'return' ? 'warning.dark' : 'text.secondary' }}>{e.text}{e.kind === 'return' && e.to != null ? ` → ${P.s[e.to].r}` : ''}{e.sys ? ' · ' + e.sys : ''}</Typography></Box>
              </Stack>))}
              {!j.length && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Процесс только запущен — действий пока нет</Typography>}
            </Box>
          </Card>
        </Box>

        <Box sx={{ gridArea: 'obj', minWidth: 0 }}><ObjectPanel run={run} runs={runs} /></Box>
      </Box>
    </Box>
  );
}
