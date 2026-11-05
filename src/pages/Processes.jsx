// Реестр процессов Upstream: 24 процесса BPMN Dream TO BE по направлениям.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, Stack, Typography, ToggleButtonGroup, ToggleButton, Chip } from '@mui/material';
import { useApp } from '../state.jsx';
import { PageHeader, KpiRow, Meter, Pill } from '../components/ui.jsx';
import { BPMN, partOfDir } from '../data/core.js';
import { procPath } from '../layout/nav.js';
import { fmt, pct, sum, plural } from '../lib/format.js';
import { C } from '../theme.js';

export const DIRS = [
  ['geologiya', 'Геология', C.s[4], 'ГРР и перспективное планирование · горизонт 25+ лет'],
  ['razrabotka', 'Разработка', C.s[0], 'Стратегия разработки с оптимальными NPV и КИН · до 5 лет'],
  ['burenie', 'Бурение и освоение', C.s[1], 'Строительство скважины · внутри года'],
  ['dobycha', 'Добыча', C.s[2], 'Управление добычей: максимальное соотношение факта по добыче и OPEX · внутри года'],
];
export const isAbai = (s) => s.s.some((x) => /^ABAI|^КХД/.test(x));
export const sysOf = (P) => { const m = {}; P.s.forEach((s) => s.s.forEach((x) => (m[x] = (m[x] || 0) + 1))); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
export const lanesOf = (P) => { const m = new Map(); P.s.forEach((s) => m.set(s.r, (m.get(s.r) || 0) + 1)); return [...m.entries()]; };

export default function Processes() {
  const { role, runs } = useApp(); const nav = useNavigate(); const [f, setF] = useState('all'); const act = runs.filter((r) => r.status === 'active');
  const mineN = (P) => P.s.filter((s) => role.lane(P.p, s.r)).length;
  const tot = sum(BPMN.map((P) => P.s.length)); const ab = sum(BPMN.map((P) => P.s.filter(isAbai).length));
  return (
    <Box>
      <PageHeader title="Реестр процессов" sub="Бизнес-процессы Upstream: геология, разработка, бурение и освоение, добыча" />
      <KpiRow items={[
        { label: 'Процессов', value: fmt(BPMN.length), d: '4 направления Upstream' },
        { label: 'Этапов в системах ABAI', value: pct((ab / tot) * 100, 0), d: `${fmt(ab)} из ${fmt(tot)}` },
        { label: 'С участием роли', value: fmt(BPMN.filter((P) => mineN(P) > 0).length), d: 'процессов' },
        { label: 'Записей в работе', value: fmt(act.length), d: `${act.filter((r) => r.late).length} с нарушением срока` },
      ]} />
      <ToggleButtonGroup size="small" exclusive value={f} onChange={(e, v) => v && setF(v)} sx={{ mb: 2, bgcolor: '#fff' }}>
        <ToggleButton value="all">Все процессы</ToggleButton><ToggleButton value="mine">С участием роли</ToggleButton>
      </ToggleButtonGroup>
      {DIRS.map(([m, t, c, sub]) => {
        const list = BPMN.filter((P) => P.m === m && (f === 'all' || mineN(P) > 0)); if (!list.length) return null;
        return (
          <Box key={m} sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1.25} alignItems="baseline" sx={{ mb: 1.25 }}><Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: c }} /><Typography variant="h6">{t}</Typography><Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{list.length}</Typography></Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1.5 }}>
              {list.map((P) => {
                const my = mineN(P); const inst = act.filter((r) => r.p === P.p).length; const a = (P.s.filter(isAbai).length / P.s.length) * 100;
                return (
                  <Card key={P.p} sx={{ '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 14px rgba(28,92,171,.1)' } }}>
                    <CardActionArea onClick={() => nav(procPath(partOfDir(P.m), P.p))} sx={{ p: 1.75, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
                      <Stack direction="row" spacing={1.25} alignItems="flex-start"><Box sx={{ border: '1.5px solid', borderColor: c, borderRadius: 1.5, px: 0.75, fontWeight: 700, fontSize: 12, flex: 'none' }}>{P.p}</Box><Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.35 }}>{P.t}</Typography></Stack>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{P.s.length} шагов · {lanesOf(P).length} участников{P.owner ? ' · ' + P.owner : ''}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 'auto' }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', flex: 1 }}>{inst ? `${inst} в работе` : 'в работе нет'}</Typography>
                        {my > 0 && <Chip size="small" label={`${my} ${plural(my, 'шаг', 'шага', 'шагов')} роли`} sx={{ bgcolor: '#e8f0fb', color: 'primary.dark' }} />}
                      </Stack>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
