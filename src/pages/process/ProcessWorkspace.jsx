// Рабочее место процесса: прикладной экран ABAI, на котором исполняется процесс; для остальных — очередь записей процесса,
// шаги, ожидающие роль, документы и участники.
import { Suspense } from 'react';
import { lazyP } from '../../lib/lazyp.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, List, ListItemButton, Stack, Typography, LinearProgress } from '@mui/material';
import { useApp } from '../../state.jsx';
import { KpiRow, Section, Grid2, StatusChip, Hbars } from '../../components/ui.jsx';
import { procOf, runPath, runTitle, stepKind, KIND_T, dueText, nowDemo } from '../../data/exec.js';
import { procPath } from '../../layout/nav.js';
import { plural, fmt } from '../../lib/format.js';
import { C } from '../../theme.js';

const L = (f) => lazyP(f);
// Процесс → экран ABAI, на котором он исполняется (подгружаются по требованию)
const WS = {
  'Б3': L(() => import('../skv/Drill.jsx')), 'Б4': L(() => import('../skv/Osv.jsx')), 'Б5': L(() => import('../skv/Tkrs.jsx')),
  'Г1': L(() => import('../plast/Crns.jsx')), 'Г3': L(() => import('../plast/Crns.jsx')), 'Г3.4': L(() => import('../plast/Crns.jsx')), 'Р1': L(() => import('../plast/Crns.jsx')), 'Р2': L(() => import('../plast/Gtm.jsx')), 'Р3': L(() => import('../dob/Profile.jsx')), 'Р4': L(() => import('../plast/Uz.jsx')),
  'Д1': L(() => import('../dob/Daily.jsx')), 'Д2': L(() => import('../dob/Regime.jsx')), 'Д3': L(() => import('../dob/Potential.jsx')), 'Д4': L(() => import('../dob/Infra.jsx')), 'Д5': L(() => import('../dob/Potential.jsx')), 'Д6': L(() => import('../dob/Gno.jsx')), 'Д7': L(() => import('../dob/Energy.jsx')), 'Д8': L(() => import('../dob/Pipe.jsx')), 'Д9': L(() => import('../dob/Regime.jsx')),
};

// Сводное рабочее место: записи процесса, мои шаги, участники, документы
function GenericWorkspace({ P, part }) {
  const nav = useNavigate(); const { role, runs: all } = useApp(); const now = nowDemo();
  const runs = all.filter((r) => r.p === P.p && r.status === 'active');
  const mine = runs.flatMap((r) => r.active.filter((a) => role.lane(P.p, P.s[a.i].r)).map((a) => ({ r, a })));
  const docs = [...new Set(P.s.flatMap((s) => s.d))];
  const lanes = [...P.s.reduce((m, s) => m.set(s.r, (m.get(s.r) || 0) + 1), new Map())];
  const kinds = P.s.reduce((m, s) => { const k = stepKind(s); m[k] = (m[k] || 0) + 1; return m; }, {});
  return (
    <Box>
      <KpiRow items={[
        { label: 'В работе', value: fmt(runs.length), d: `${runs.filter((r) => r.late).length} с нарушением срока` },
        { label: 'Ожидают вашего решения', value: fmt(mine.length), d: mine.filter((x) => x.a.due < now).length ? `${mine.filter((x) => x.a.due < now).length} просрочено` : 'в срок' },
        { label: 'Документов процесса', value: fmt(docs.length), d: 'формируются в ABAI БД 2.0' },
        { label: 'Согласований и экспертиз', value: fmt((kinds.approve || 0) + (kinds.expert || 0)), d: `из ${P.s.length} этапов` },
      ]} />
      <Grid2 cols="3fr 2fr">
        <Section title="В работе" flush action={<Button size="small" onClick={() => nav(procPath(part, P.p, 'runs'))}>Ход исполнения →</Button>}>
          <List disablePadding>{runs.map((r) => (
            <ListItemButton key={r.id} onClick={() => nav(runPath(r))} sx={{ borderRadius: 0, px: 2, py: 1.1, borderTop: '1px solid #f0f2f5', display: 'block' }}>
              <Stack direction="row" justifyContent="space-between" spacing={1}><Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{runTitle(r)}</Typography>{r.late ? <StatusChip tone="crit" label={dueText(r.worst)} /> : <StatusChip tone="info" label={dueText(r.worst)} />}</Stack>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{r.active.map((a) => `${P.s[a.i].t} · ${P.s[a.i].r}${role.lane(P.p, P.s[a.i].r) ? ' (ваш шаг)' : ''}`).join('; ')}</Typography>
            </ListItemButton>))}
            {!runs.length && <Box sx={{ p: 3, color: 'text.secondary', textAlign: 'center' }}>Записей в работе нет. Запустите процесс по объекту кнопкой «Запустить процесс».</Box>}</List>
        </Section>
        <Section title="Участники процесса">
          <Hbars rows={lanes.map(([r, n]) => ({ l: r, v: n, c: role.lane(P.p, r) ? C.brand : '#b9c4d4', txt: `${n} ${plural(n, 'шаг', 'шага', 'шагов')}` }))} />
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5 }}>Типы шагов: {Object.entries(kinds).map(([k, n]) => `${KIND_T[k].toLowerCase()} — ${n}`).join(', ')}</Typography>
        </Section>
      </Grid2>
      {docs.length > 0 && <Section title="Документы процесса" flush>
        <List disablePadding>{docs.map((d) => { const s = P.s.find((x) => x.d.includes(d)); return (
          <Box key={d} sx={{ px: 2, py: 1, borderTop: '1px solid #f0f2f5', display: 'flex', gap: 2, alignItems: 'baseline' }}><Typography sx={{ fontSize: 13.5, flex: 1 }}>{d}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{s.t} · {s.r}</Typography></Box>); })}</List>
      </Section>}
    </Box>
  );
}

export default function ProcessWorkspace() {
  const { part, code } = useParams(); const P = procOf(code); const W = WS[code];
  return W ? <Suspense fallback={<LinearProgress />}><W /></Suspense> : <GenericWorkspace P={P} part={part} />;
}
