// Технологический режим (Д2, Д9): 3 показателя → записи по механизированному фонду → таблица отклонений с фильтром и структура →
// отклонение в боковой панели; статус отклонения с карточкой — из записи процесса, действия по карточке — в форме шага.
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Button, Box, Drawer, IconButton, Typography, ToggleButtonGroup, ToggleButton, Stack, Tabs, Tab } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, Hbars, KV, Steps } from '../../components/ui.jsx';
import { TrendChart } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { ALERTS, WELL, NGDU } from '../../data/core.js';
import { fmt, sgn, pct, sum, series, dayLabels, dFmt, tFmt, dRel, MONF, TODAY } from '../../lib/format.js';
import { C } from '../../theme.js';
import { assetName, useStore } from './_shared1.jsx';
import { RunState } from './_runs.jsx';

const ST = ['Новое', 'Карточка отклонения', 'Мероприятие в ПАЭГТМ', 'Устранено'];
const ST_TONE = { 'Новое': 'crit', 'Карточка отклонения': 'warn', 'Мероприятие в ПАЭГТМ': 'info', 'Устранено': 'good' };
const ago = (d) => { const m = Math.max(1, Math.round((TODAY - d) / 6e4)); return m < 60 ? `${m} мин назад` : m < 1440 ? `${Math.floor(m / 60)} ч назад` : dRel(d); };
const valOf = (a) => (a.val == null ? ({ esp: 'подача отсутствует', tr: 'вне режима', risk: 'выше порога', meas: 'нет замера' }[a.kind] || 'вне режима') : a.kind === 'wc' ? '+' + fmt(a.val, 1) + ' п. п.' : sgn(a.val) + '%');
const MEAS = (a, w) => ({ qL: w.method === 'Фонтан' ? 'Исследование скважины, подбор штуцера' : `Исследование скважины, оптимизация режима ${w.method}`, wc: 'Изоляция водопритока (РИР), уточнение замера лабораторией', tr: 'Корректировка режима по ТР 2.0', esp: 'Заявка на подбор ГНО в ПГНО, ПРС со сменой оборудования', inj: 'ОПЗ нагнетательной скважины', risk: 'Профилактика ГНО, перевод на щадящий режим', meas: 'Проверка АГЗУ, внеплановый замер' }[a.kind]);
// Запись «Карточка отклонения» по отклонению и статус отклонения по её состоянию
const cardOf = (runs, a) => runs.find((r) => r.p === 'Д2' && (r.num === a.id || (!r.num && r.obj.id === 'w:' + a.well && r.status === 'active'))) || null;
const stOfRun = (run) => { if (run.status === 'done') return 'Устранено'; const c = run.active.map((x) => run.P.s[x.i].c); return c.some((x) => ['2.7', '2.8', '2.9', '2.10', '2.11.1', '2.11.2', '2.12'].includes(x)) ? 'Мероприятие в ПАЭГТМ' : 'Карточка отклонения'; };
const Over = ({ children }) => <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2.5, mb: 0.75 }}>{children}</Typography>;

function AlertDrawer({ a, onClose, onSet }) {
  const { runs, role } = useApp(); const nav = useNavigate();
  if (!a) return null;
  const card = cardOf(runs, a); const other = runs.filter((r) => r !== card && ['Д6', 'Д9'].includes(r.p) && r.obj.id === 'w:' + a.well);
  const canStart = role && !role.limited && role.lane('Д2', 'ЦИТС НГДУ');
  const w = WELL(a.well) || {}; const inj = w.type === 'inj'; const n = 30;
  const cut = n - 1 - Math.max(1, Math.round((TODAY - a.since) / 864e5)); const base = inj ? w.qInj : w.qL;
  const lb = dayLabels(n);
  const v = series('al-' + a.id, n, base * 1.02, 0.015).map((x, i) => Math.round(i >= cut ? x * (1 + (a.val != null && a.kind !== 'wc' ? a.val / 100 : -0.08)) : x));
  const stIdx = ST.indexOf(a.st);
  const chain = [['ТР 2.0', 'Аларм'], ['БД 2.0', 'Карточка отклонения'], ['ПАЭГТМ', 'Мероприятие'], ['ТР 2.0', 'Контроль режима']];
  return (
    <Box sx={{ width: 600, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{a.t} · {a.well}</Typography>
          <Typography variant="body2" color="text.secondary">{a.ngdu} · выявлено {dFmt(a.since)} {tFmt(a.since)}</Typography>
          <Box sx={{ mt: 0.75 }}><StatusChip tone={ST_TONE[a.st]} label={a.st} /></Box>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseRounded /></IconButton>
      </Stack>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, pb: 2 }}>
        <Over>Оценка</Over>
        <KV rows={[['Отклонение', valOf(a)], ['Потери добычи', a.loss ? fmt(a.loss, 1) + ' т/сут' : 'без потерь добычи'], ['Рекомендуемое мероприятие', MEAS(a, w)], ['Ожидаемый эффект', a.loss ? fmt(a.loss * 0.8, 1) + ' т/сут' : 'восстановление режима']]} />
        <Over>{inj ? 'Приёмистость' : 'Дебит жидкости'} за 30 суток, м³/сут</Over>
        <TrendChart data={lb.map((x, i) => ({ x, v: v[i] }))} height={180} unit="м³/сут" legend={false} series={[{ key: 'v', name: inj ? 'Приёмистость' : 'Дебит жидкости', color: C.s[0] }]} marks={[{ x: lb[Math.max(0, cut)], label: 'Аларм' }]} />
        <Over>Обработка</Over>
        <Steps items={chain.map(([c, t], i) => ({ c, t, done: i < stIdx || stIdx === 3, cur: i === stIdx && stIdx < 3 }))} />
        <Over>Скважина</Over>
        <KV rows={inj ? [['Способ', w.method], ['Приёмистость', fmt(w.qInj) + ' м³/сут'], ['Пластовое давление', fmt(w.pPl) + ' атм']] : [['Способ · ГНО', w.pump && w.pump !== '—' ? `${w.method} · ${w.pump}` : w.method], ['Дебит жидкости / нефти', `${fmt(w.qL)} м³/сут / ${fmt(w.qO, 1)} т/сут`], ['Обводнённость', fmt(w.wc) + '%'], ['Риск отказа ГНО', fmt(w.risk) + '%']]} />
        <Over>В процессе</Over>
        {card ? <RunState run={card} open="Открыть карточку в процессе" /> : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Карточка отклонения не создана{a.st === 'Устранено' ? ': отклонение устранено без мероприятий.' : '. Создайте карточку — анализ причины, классификация и мероприятия выполняются в процессе.'}</Typography>}
        {other.map((r) => <RunState key={r.id} run={r} sx={{ mt: 1 }} />)}
      </Box>
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#fafbfc' }}>
        <Button component={RouterLink} to={'/m/skv/wells/' + encodeURIComponent(a.well)}>Паспорт скважины</Button>
        {!card && a.st !== 'Устранено' && <Button variant="outlined" onClick={() => onSet(a, 'Устранено')}>Закрыть без карточки</Button>}
        {!card && a.st !== 'Устранено' && canStart && <Button variant="contained" onClick={() => nav('/m/dob/p/' + encodeURIComponent('Д2') + '?start=1')}>Создать карточку отклонения</Button>}
      </Stack>
    </Box>
  );
}

export default function Regime() {
  const { asset, toast, runs } = useApp(); const [S, upd] = useStore();
  const [f, setF] = useState('open'); const [sel, setSel] = useState(null); const [side, setSide] = useState('kind');
  // Статус: по записи «Карточка отклонения», если она есть; иначе — отметка «закрыто без карточки» в сеансе или исходный статус
  const A = ALERTS.map((a) => { const card = cardOf(runs, a); return { ...a, st: card ? stOfRun(card) : S.ast[a.id] || a.st, card }; });
  const mech = runs.filter((r) => r.p === 'Д9' && r.status === 'active');
  const open = A.filter((a) => a.st !== 'Устранено'); const cnt = (st) => A.filter((a) => a.st === st).length;
  const rows = f === 'open' ? open : f === 'all' ? A : A.filter((a) => a.st === f);
  const kinds = {}; open.forEach((a) => (kinds[a.t] = (kinds[a.t] || 0) + 1));
  const comp = NGDU.map((n, i) => ({ l: n, v: +(95.8 - i * 1.1 - (i === 2 ? 1.6 : 0)).toFixed(1) }));
  const cur = sel ? A.find((a) => a.id === sel) : null;
  const setSt = (a, st) => { S.ast[a.id] = st; upd(); toast(`Отклонение ${a.id} закрыто без карточки · скважина на контроле ТР 2.0`); };
  return (
    <>
      <PageHeader title="Технологический режим" sub={`${assetName(asset)} · техрежим на ${MONF[TODAY.getMonth()]} ${TODAY.getFullYear()}`} sys={[['ABAI ТР 2.0', 'dob']]} />
      <KpiRow items={[
        { label: 'Соблюдение режима', value: pct(93.6), delta: 0.4, du: ' п. п.', good: 'up', d: 'за 7 суток', spark: series('trc', 14, 93, 0.004, 0.01) },
        { label: 'Открытые отклонения', value: fmt(open.length), d: `новых — ${cnt('Новое')}` },
        { label: 'Потери добычи', value: fmt(sum(open.map((a) => a.loss)), 1), unit: 'т/сут', d: 'по открытым отклонениям' },
      ]} />
      {mech.length > 0 && <Section title="Механизированный фонд в процессе" sub="отказы и отклонения параметров ГНО: анализ причин, мероприятия, исполнение" sx={{ mb: 2 }}
        info="Процесс Д9 «Мониторинг и управление механизированным фондом»: выявление отказов (9.2), анализ причин (9.3.1, 9.3.2), перечень мероприятий (9.4, 9.6), реализация (9.8.1, 9.8.2).">
        <Stack spacing={1}>{mech.map((r) => <RunState key={r.id} run={r} />)}</Stack>
      </Section>}
      <Grid2 cols="2fr 1fr">
        <Section title="Отклонения" flush info="Аларм ABAI ТР 2.0 становится карточкой отклонения в БД 2.0, мероприятие и его эффект считаются в ПАЭГТМ (сценарий «Отклонение → мероприятие», Д2 2.3, Д9 9.2).">
          <Box sx={{ px: 2, pb: 1 }}>
            <ToggleButtonGroup size="small" exclusive value={f} onChange={(e, v) => v && setF(v)} sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none', px: 1.5, py: 0.4, fontSize: 12.5 } }}>
              <ToggleButton value="open">Открытые · {open.length}</ToggleButton>
              {ST.map((s) => <ToggleButton key={s} value={s}>{s} · {cnt(s)}</ToggleButton>)}
              <ToggleButton value="all">Все · {A.length}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <DataTable rows={rows} onRowClick={(r) => setSel(r.id)} pageSize={10} localeText={{ noRowsLabel: 'Отклонений с этим статусом нет' }} columns={[
            { field: 'well', headerName: 'Скважина', flex: 0.8, renderCell: (p) => <b>{p.value}</b> },
            { field: 't', headerName: 'Отклонение', flex: 1.7 },
            { field: 'val', headerName: 'Значение', flex: 0.7, align: 'right', headerAlign: 'right', sortable: false, renderCell: (p) => valOf(p.row) },
            { field: 'loss', headerName: 'Потери, т/сут', type: 'number', flex: 0.7, align: 'right', headerAlign: 'right', valueFormatter: (v) => (v ? fmt(v, 1) : 'нет') },
            { field: 'since', headerName: 'Выявлено', flex: 0.8, type: 'dateTime', renderCell: (p) => ago(p.value) },
            { field: 'st', headerName: 'Статус', flex: 1.3, renderCell: (p) => <StatusChip tone={ST_TONE[p.value]} label={p.value} /> },
          ]} />
        </Section>
        <Section title="Структура" flush>
          <Tabs value={side} onChange={(e, v) => setSide(v)} sx={{ px: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, px: 1, mr: 1 } }}>
            <Tab value="kind" label="По причинам" /><Tab value="ngdu" label="По НГДУ" />
          </Tabs>
          <Box sx={{ p: 2 }}>
            {side === 'kind'
              ? <Hbars labelW="60%" rows={Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v, c: C.s[0] }))} />
              : <><Hbars max={100} rows={comp.map((x) => ({ l: x.l, v: x.v, c: x.v < 93 ? C.warn : C.s[0], mark: 95, txt: pct(x.v) }))} /><Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5 }}>Доля скважин в режиме; метка — целевой уровень 95%</Typography></>}
          </Box>
        </Section>
      </Grid2>
      <Drawer anchor="right" open={!!cur} onClose={() => setSel(null)}>
        <AlertDrawer a={cur} onClose={() => setSel(null)} onSet={setSt} />
      </Drawer>
    </>
  );
}
