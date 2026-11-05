// Мониторинг ТКРС (Б5): бригады КРС / ПРС, график движения (Гант), бригадо-часы, простои, наряд-заказы, планы работ.
import { useState } from 'react';
import { Box, Card, Stack, Typography, Button, Tooltip, Tabs, Tab } from '@mui/material';
import { PageHeader, KpiRow, Section, StatusChip, Hbars } from '../../components/ui.jsx';
import { BarsChart } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { WELLS } from '../../data/core.js';
import { C } from '../../theme.js';
import { fmt, sum, rng, pick, dAdd, dFmt, dShort, tFmt, MONF, TODAY } from '../../lib/format.js';
import { useApp } from '../../state.jsx';
import { ProcLink, ContrBtn, WellLink } from './_shared.jsx';
import { RunRoute, RunAction, runNow } from '../process/forms/widgets.plast.jsx';
import { Demo } from '../../components/ui.jsx';

// Маршрут плана работ бригад ВСР по шагам записи процесса
const ROUTE = [['5.1', 'Годовой план ВСР'], ['5.2', 'Оперативный график'], ['5.3.1', 'Назначение бригад'], ['5.4.1', 'Заказ-наряд'], ['5.5.1', 'План организации работ'], ['5.6.1', 'Учёт бригадо-часов'], ['5.7.1', 'Диспетчерский контроль'], ['5.8', 'Контроль исполнения плана']];

// Бригады (демо): блоки работ на ±7 суток
const BR = (() => {
  const r = rng('brig'); const prodW = WELLS.filter((w) => w.type === 'prod');
  const names = ['КРС-01', 'КРС-02', 'КРС-04', 'КРС-07', 'ПРС-11', 'ПРС-12', 'ПРС-14', 'ПРС-15', 'ПРС-17', 'ПРС-19'];
  const stl = [['В работе', 'good'], ['В работе', 'good'], ['Переезд', 'info'], ['В работе', 'good'], ['Простой', 'crit'], ['В работе', 'good'], ['Ожидание', 'warn'], ['В работе', 'good'], ['В работе', 'good'], ['Переезд', 'info']];
  return names.map((n, i) => {
    const krs = n.startsWith('КРС'); const blocks = []; let d = -7 - Math.floor(r() * 3);
    while (d < 8) {
      const len = krs ? 4 + Math.floor(r() * 5) : 2 + Math.floor(r() * 3); const w = prodW[Math.floor(r() * prodW.length)];
      blocks.push({ k: krs ? 'krs' : 'prs', d, len, well: w.id, t: krs ? pick(r, ['РИР', 'Ликвидация негерметичности', 'Зарезка бокового ствола', 'ГРП']) : pick(r, ['Смена ЭЦН', 'Смена ШГН', 'Промывка забоя', 'Ревизия НКТ']) });
      d += len;
      if (r() < 0.4) { blocks.push({ k: 'mv', d, len: 1, t: 'Переезд' }); d += 1; }
      if (r() < 0.18) { blocks.push({ k: 'idle', d, len: 1, t: pick(r, ['Ожидание спецтехники', 'Ожидание МТР']) }); d += 1; }
    }
    const plan = krs ? 336 : 312; const fact = Math.round(plan * (0.82 + r() * 0.2));
    const cur = blocks.find((b) => b.d <= 0 && b.d + b.len > 0) || blocks[0];
    return { id: n, n, krs, st: stl[i], blocks, plan, fact, cur, ctr: krs ? 'Подрядчик ВСР № 1 (КРС)' : 'Подрядчик ВСР № 2 (ПРС)' };
  });
})();
const KC = { krs: C.s[0], prs: C.s[2], mv: '#b7bfcc', idle: C.serious };
const KN = { krs: 'КРС', prs: 'ПРС', mv: 'Переезд', idle: 'Простой' };
const IDLE = [['Ожидание спецтехники', 46], ['Ожидание МТР', 31], ['Согласование плана работ', 18], ['Погодные условия', 14], ['Ожидание геофизической партии', 11]];

// Диаграмма Ганта: бригады × сутки (−7 … +7)
function Gantt() {
  const D0 = -7, D1 = 7, W = 1180, L = 92, row = 30, H = 34 + BR.length * row; const cw = (W - L - 10) / (D1 - D0 + 1); const X = (d) => L + (d - D0) * cw;
  const days = []; for (let d = D0; d <= D1; d++) days.push(d);
  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 1, fontSize: 12, color: 'text.secondary' }}>{Object.keys(KC).map((k) => <Stack key={k} direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: KC[k] }} /><span>{KN[k]}</span></Stack>)}</Stack>
      <svg viewBox={`0 0 ${W} ${H + 4}`} style={{ width: '100%', display: 'block', fontFamily: 'inherit' }} role="img" aria-label="График движения бригад">
        {days.map((d) => <g key={d}><rect x={X(d)} y="22" width={cw} height={H - 22} fill={d === 0 ? '#e8f0fb' : (d - D0) % 2 ? '#fafbfc' : '#fff'} /><text x={X(d) + cw / 2} y="15" textAnchor="middle" fontSize="11" fill={d === 0 ? '#16191f' : C.muted} fontWeight={d === 0 ? 600 : 400}>{dShort(dAdd(d))}</text></g>)}
        {BR.map((b, i) => { const y = 26 + i * row; return (
          <g key={b.n}>
            <text x={L - 10} y={y + 17} textAnchor="end" fontSize="12" fontWeight="600" fill="#16191f">{b.n}</text>
            <line x1={L} x2={W - 10} y1={y + row - 2} y2={y + row - 2} stroke={C.grid} />
            {b.blocks.map((k, j) => { const a = Math.max(D0, k.d), e = Math.min(D1 + 1, k.d + k.len); if (e <= a) return null; const x = X(a) + 1, w = X(e) - X(a) - 2; return (
              <Tooltip key={j} arrow title={<span><b>{b.n} · {k.t}</b>{k.well && <><br />{k.well}</>}<br />{dShort(dAdd(k.d))} – {dShort(dAdd(k.d + k.len - 1))} · {k.len} сут</span>}>
                <g><rect x={x} y={y + 3} width={w} height={row - 9} rx="4" fill={KC[k.k]} />{k.well && w > 70 && <text x={x + 6} y={y + 18} fill="#fff" fontSize="11" style={{ pointerEvents: 'none' }}>{k.well}</text>}</g>
              </Tooltip>); })}
          </g>); })}
        <line x1={X(0) + cw / 2} x2={X(0) + cw / 2} y1="22" y2={H} stroke={C.brand} strokeWidth="2" />
      </svg>
    </Box>
  );
}

export default function Tkrs() {
  const { role, sign, toast, runs } = useApp(); const [ok, setOk] = useState({}); const [tab, setTab] = useState('plan');
  const b5 = runs.filter((r) => r.p === 'Б5' && r.obj.kind === 'brig').sort((a, b) => a.obj.id.localeCompare(b.obj.id));
  const cnt = (t) => BR.filter((b) => b.st[0] === t).length; const canApprove = role && !role.limited;
  const orders = BR.flatMap((b) => b.blocks.filter((k) => k.well && k.d > -6 && k.d < 6).slice(0, 1).map((k) => ({ b, k }))).map(({ b, k }, i) => ({ id: 'НЗ-' + (31840 + i * 17), well: k.well, t: (b.krs ? 'КРС · ' : 'ПРС · ') + k.t, br: b.n, st: k.d > 0 ? ['Запланирован', 'info'] : k.d + k.len <= 1 ? ['Закрыт, АВР подписан', 'good'] : ['В работе', ''], ph: k.len * 24, fh: k.d > 0 ? 0 : Math.round(Math.min(k.len, 1 - k.d) * 22) }));
  const por = [['ПОР-311', 'УЗН-4471', 'Смена ЭЦН после срыва подачи', 'ПРС-12'], ['ПОР-314', 'УЗН-2286', 'Ремонтно-изоляционные работы', 'КРС-04'], ['ПОР-317', BR[0].blocks.find((k) => k.well).well, 'Ликвидация негерметичности колонны', 'КРС-01']].map(([id, well, t, br]) => ({ id, well, t, br }));
  const factSum = sum(BR.map((b) => b.fact)), planSum = sum(BR.map((b) => b.plan));
  const brCols = [
    { field: 'n', headerName: 'Бригада', width: 110, renderCell: ({ value }) => <b>{value}</b> },
    { field: 'st', headerName: 'Статус', width: 130, valueGetter: (v) => v[0], renderCell: ({ row: b }) => <StatusChip tone={b.st[1]} label={b.st[0]} /> },
    { field: 'cur', headerName: 'Текущая работа', flex: 1, minWidth: 220, sortable: false, renderCell: ({ row: b }) => (b.cur.well ? <span><WellLink id={b.cur.well} /> · {b.cur.t}</span> : b.cur.t) },
    { field: 'ctr', headerName: 'Подрядчик', width: 210 },
    { field: 'fact', headerName: 'Бригадо-часы, факт / план', width: 200, type: 'number', renderCell: ({ row: b }) => `${fmt(b.fact)} / ${fmt(b.plan)}` },
  ];
  const ordCols = [
    { field: 'id', headerName: 'Наряд-заказ', width: 120, renderCell: ({ value }) => <b>{value}</b> },
    { field: 'well', headerName: 'Скважина', width: 120, renderCell: ({ value }) => <WellLink id={value} /> },
    { field: 't', headerName: 'Работа', flex: 1, minWidth: 220 },
    { field: 'br', headerName: 'Бригада', width: 100 },
    { field: 'st', headerName: 'Статус АВР+', width: 200, valueGetter: (v) => v[0], renderCell: ({ row: o }) => <StatusChip tone={o.st[1]} label={o.st[0]} /> },
    { field: 'fh', headerName: 'Часы, факт / план', width: 150, type: 'number', renderCell: ({ row: o }) => `${fmt(o.fh)} / ${fmt(o.ph)}` },
  ];
  const porCols = [
    { field: 'id', headerName: 'ПОР', width: 110, renderCell: ({ value }) => <b>{value}</b> },
    { field: 'well', headerName: 'Скважина', width: 120, renderCell: ({ value }) => <WellLink id={value} /> },
    { field: 't', headerName: 'Вид работ', flex: 1, minWidth: 240 },
    { field: 'br', headerName: 'Бригада', width: 100 },
    { field: 'ok', headerName: 'Статус', width: 160, valueGetter: (v, x) => !!ok[x.id], renderCell: ({ value }) => <StatusChip tone={value ? 'good' : 'warn'} label={value ? 'Согласован' : 'На согласовании'} /> },
    { field: 'a', headerName: '', width: 130, sortable: false, renderCell: ({ row: x }) => (!ok[x.id] && canApprove ? <Button size="small" variant="outlined" onClick={() => sign(`План работ ${x.id} · ${x.well} · ${x.t} (Б5)`, () => { setOk({ ...ok, [x.id]: true }); toast(`План работ ${x.id} согласован ЭЦП, бригада ${x.br} получила задание`); })}>Согласовать</Button> : null) },
  ];
  const nPor = por.filter((x) => !ok[x.id]).length;
  return (
    <>
      <PageHeader title="Мониторинг ТКРС" sub={`${BR.length} бригад КРС / ПРС на мониторинге участка Узень (всего по плану ВСР на ноябрь — 27) · суточные рапорты на ${tFmt(TODAY)}`} sys={[['ABAI Цифровой мониторинг ТКРС', 'skv']]} actions={<ContrBtn />} />
      <KpiRow items={[
        { label: 'Бригад в работе', value: `${cnt('В работе')} из ${BR.length}`, d: `переезд ${cnt('Переезд')} · ожидание ${cnt('Ожидание')} · простой ${cnt('Простой')}` },
        { label: 'Бригадо-часы за месяц', value: fmt(factSum), unit: 'ч', delta: (factSum / planSum - 1) * 100, du: '%', good: 'up', d: 'к плану' },
        { label: 'Простои за месяц', value: fmt(sum(IDLE.map((x) => x[1]))), unit: 'ч', delta: -12, dd: 0, du: '%', good: 'down', d: 'к прошлому месяцу' },
        { label: 'Средняя продолжительность ПРС', value: '2,7', unit: 'сут', d: 'норма — 3,0 сут' },
      ]} />
      <Section title="График движения бригад" sub={`${dShort(dAdd(-7))} – ${dShort(dAdd(7))}`} sx={{ mb: 2 }}
        info={<span>Оперативный график ведётся в ABAI БД 2.0, бригадо-часы — по суточным рапортам; ABAI Цифровой мониторинг ТКРС (Nedra.WWO). Процесс <ProcLink code="Б5" />.</span>}><Gantt /></Section>
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="plan" label={`Планы работ бригад · ${b5.filter((r) => r.status === 'active').length}`} /><Tab value="br" label="Бригады" /><Tab value="ord" label={`Наряд-заказы · ${orders.length}`} /><Tab value="por" label={`Планы работ на согласовании · ${nPor}`} /><Tab value="idle" label="Простои и бригадо-часы" />
        </Tabs>
        {tab === 'plan' && (
          <Box sx={{ p: 2 }}>
            {b5.map((r, k) => (
              <Box key={r.id} sx={{ pt: k ? 2 : 0, mt: k ? 2 : 0, borderTop: k ? '1px solid #eef1f5' : 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{r.obj.name}<Demo>{r.id}</Demo></Typography>
                  <RunAction run={r} label="Открыть мой шаг" />
                </Stack>
                <RunRoute run={r} codes={ROUTE} />
                <Typography sx={{ fontSize: 12.5, color: r.late ? 'error.main' : 'text.secondary', mt: 1 }}>{runNow(r)}</Typography>
              </Box>
            ))}
            {!b5.length && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Планов работ бригад в работе нет — запустите процесс планирования в разделе процессов ЦД скважины.</Typography>}
          </Box>
        )}
        {tab === 'br' && <DataTable rows={BR} columns={brCols} />}
        {tab === 'ord' && <DataTable rows={orders} columns={ordCols} search />}
        {tab === 'por' && <DataTable rows={por} columns={porCols} />}
        {tab === 'idle' && (
          <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.4fr' }, gap: 4 }}>
            <Box><Typography variant="overline" color="text.secondary" component="div" sx={{ mb: 1 }}>Простои по причинам, ч</Typography><Hbars rows={IDLE.map(([l, v]) => ({ l, v, c: C.s[0], txt: v + ' ч' }))} /></Box>
            <Box><Typography variant="overline" color="text.secondary" component="div">Бригадо-часы: факт и план, {MONF[TODAY.getMonth()]}</Typography>
              <BarsChart height={250} unit="ч" data={BR.map((b) => ({ x: b.n, fact: b.fact, plan: b.plan }))} series={[{ key: 'fact', name: 'Факт', color: C.s[0] }]} plan={{ key: 'plan', name: 'План' }} /></Box>
          </Box>
        )}
      </Card>
    </>
  );
}
