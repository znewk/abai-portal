// ЦД пласта · ABAI УЗ 2.0: оптимизация системы заводнения (Р4) — элементы заводнения, рекомендации по закачке, многовариантный расчёт, прогноз эффекта.
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Box, Typography, Divider, Card, Tabs, Tab } from '@mui/material';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, KV } from '../../components/ui.jsx';
import { TrendChart, ScatterPlot } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { rng, series, last, sum, fmt, sgn, pct, plural, MON, dFmt, dAdd, tFmt, TODAY } from '../../lib/format.js';
import { C } from '../../theme.js';
import { useNavigate } from 'react-router-dom';
import { Stack } from '@mui/material';
import { FieldMap, PL_EZ, PL_EZ_T, PL_ST, WellLink, useRerender } from './_shared.jsx';
import { RunRoute, RunAction, runNow } from '../process/forms/widgets.plast.jsx';
import { runPath } from '../../data/exec.js';
import { Demo } from '../../components/ui.jsx';

// 1602 варианта нестационарной закачки (сл. 31)
const OPT = (() => {
  const r = rng('pl-opt'); const pts = [];
  for (let i = 0; i < 1602; i++) { const x = Math.pow(r(), 0.8) * 190; const y = x * 0.11 - 3 + (r() - 0.62) * 9 - Math.pow(Math.max(0, x - 120) / 30, 2) * 0.9; pts.push({ x: +x.toFixed(1), y: +y.toFixed(2) }); }
  return { pts, best: pts.reduce((a, b) => (b.y > a.y ? b : a)) };
})();
// Маршрут оптимизации ППД по шагам записи процесса
const ROUTE = [['4.1', 'Инициирование анализа'], ['4.3.2', 'Анализ энергетики'], ['4.5', 'Ранжирование элементов'], ['4.6', 'Подбор мероприятий'], ['4.7.1', 'Согласование кандидатов'], ['4.8', 'Расчёт эффектов'], ['4.9', 'Экономическая оценка'], ['4.10', 'Итоговые предложения'], ['4.12', 'Мониторинг реакции']];
// Этап записи по активному шагу — для статуса рекомендации
const STAGE = (c) => (/^4\.(1|2|3|4|5)(\.|$)/.test(c) ? 'Анализ системы ППД' : c === '4.6' ? 'Подбор мероприятий' : /^4\.7/.test(c) ? 'Согласование кандидатов' : /^4\.(8|9)$/.test(c) ? 'Расчёт эффекта и экономики' : c === '4.10' ? 'Итоговые предложения' : /^4\.11/.test(c) ? 'Выполнение работ' : c === '4.12' ? 'Мониторинг реакции скважин' : 'Анализ эффективности');

export default function Uz() {
  const { role, toast, runs } = useApp(); const rr = useRerender(); const nav = useNavigate();
  // Записи оптимизации ППД по элементам заводнения (ez:Э-12, ez:Э-08 …)
  const runOf = (id) => runs.find((r) => r.p === 'Р4' && r.obj.id === 'ez:' + id && r.status === 'active') || runs.find((r) => r.p === 'Р4' && r.obj.id === 'ez:' + id);
  const r4 = runs.filter((r) => r.p === 'Р4');
  const stOf = (e) => { const r = runOf(e.id); if (r) return r.status === 'done' ? ['Мероприятия выполнены', 'good'] : [STAGE(r.P.s[r.active[0].i].c), r.late ? 'crit' : 'warn']; return PL_ST.uzSent[e.id] ? ['Направлено в ПАЭГТМ', 'good'] : ['Рекомендация', 'info']; }; const [sel, setSel] = useState(PL_EZ[0].id); const [tab, setTab] = useState('rec');
  const ez = PL_EZ.find((e) => e.id === sel) || PL_EZ[0]; const recs = PL_EZ.filter((e) => e.tone !== 'good');
  const toGtm = (id) => {
    const list = id === 'all' ? recs.filter((e) => !PL_ST.uzSent[e.id] && !runOf(e.id)) : [PL_EZ.find((e) => e.id === id)];
    list.forEach((e) => (PL_ST.uzSent[e.id] = true));
    toast(list.length ? `${list.length} ${plural(list.length, 'рекомендация передана', 'рекомендации переданы', 'рекомендаций передано')} в ABAI ПАЭГТМ кандидатами в программу ГТМ 2027; по элементам Э-12 и Э-08 мероприятия ведутся в процессе оптимизации ППД` : 'Все рекомендации уже переданы в программу ГТМ', list.length ? 'success' : 'info'); rr();
  };
  // прогноз добычи: 12 месяцев факта + 12 месяцев прогноза
  const months = Array.from({ length: 24 }, (_, i) => { const d = new Date(2025, 10 + i, 1); return MON[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2); });
  const f = series('pl-uzf', 12, 2350, 0.012, -0.03).map(Math.round); const b0 = last(f);
  const data = months.map((x, i) => {
    const base = i < 11 ? null : Math.round(b0 * (1 - 0.0045 * (i - 11)));
    const opt = i < 11 ? null : Math.round(b0 * (1 - 0.0045 * (i - 11)) + Math.min(1, (i - 11) / 4) * 46);
    return { x, f: i < 12 ? f[i] : null, base, opt, lo: opt == null ? null : Math.round(opt - (i - 11) * 3.2), hi: opt == null ? null : Math.round(opt + (i - 11) * 2.4) };
  });
  const gain = sum(recs.map((e) => e.eff2));

  const ezCols = [
    { field: 'id', headerName: 'Элемент', width: 90, renderCell: ({ value }) => <b>{value}</b> },
    { field: 'comp', headerName: 'Компенсация, %', type: 'number', width: 125, renderCell: ({ value }) => <Box component="span" sx={{ color: value > 130 || value < 85 ? 'error.main' : 'inherit', fontWeight: value > 130 || value < 85 ? 600 : 400 }}>{fmt(value)}</Box> },
    { field: 'eff', headerName: 'т на 1000 м³', type: 'number', width: 110, valueFormatter: (v) => fmt(v, 1) },
    { field: 'tone', headerName: 'Оценка', flex: 1, minWidth: 200, valueGetter: (v) => PL_EZ_T[v], renderCell: ({ row }) => <StatusChip tone={row.tone} label={PL_EZ_T[row.tone]} /> },
  ];
  const recCols = [
    { field: 'id', headerName: 'Элемент', width: 90, renderCell: ({ value }) => <b>{value}</b> },
    { field: 'inj', headerName: 'Нагнетательная', width: 130, valueGetter: (v, row) => row.c.id, renderCell: ({ row }) => <WellLink id={row.c.id} /> },
    { field: 'new', headerName: 'Закачка, м³/сут', flex: 1, minWidth: 170, valueGetter: (v, row) => row.c.qInj + row.rec, renderCell: ({ row }) => <span>{fmt(row.c.qInj)} → <b>{fmt(row.c.qInj + row.rec)}</b> <Box component="span" sx={{ color: row.rec < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>({sgn(row.rec)})</Box></span> },
    { field: 'eff2', headerName: 'Эффект, т/сут', type: 'number', width: 115, valueFormatter: (v) => '+' + fmt(v, 1) },
    { field: 'st', headerName: 'Статус', width: 210, valueGetter: (v, row) => stOf(row)[0], renderCell: ({ row }) => <StatusChip tone={stOf(row)[1]} label={stOf(row)[0]} /> },
    { field: 'act', headerName: '', width: 170, sortable: false, filterable: false, renderCell: ({ row }) => { const r = runOf(row.id); if (r) return <Button size="small" onClick={(e) => { e.stopPropagation(); nav(runPath(r)); }}>Открыть в процессе</Button>; return PL_ST.uzSent[row.id] || role.limited ? null : <Button size="small" onClick={(e) => { e.stopPropagation(); toGtm(row.id); }}>В программу ГТМ</Button>; } },
  ];
  return (
    <>
      <PageHeader title="Оптимизация заводнения" sys={[['ABAI УЗ 2.0', 'plast']]}
        sub={`Узень · ${PL_EZ.length} элементов заводнения · расчёт на ГДМ от ${dFmt(dAdd(-1))}`}
        actions={<><Button variant="outlined" component={RouterLink} to={'/proc/' + encodeURIComponent('Р4')}>Оптимизация ППД<Demo>Р4</Demo></Button>{!role.limited && <Button variant="contained" onClick={() => toGtm('all')}>Направить в программу ГТМ</Button>}</>} />
      <KpiRow items={[
        { label: 'Компенсация отбора', value: '104,6', unit: '%', delta: 1.8, du: ' п.п.', good: 'up', d: 'за месяц' },
        { label: 'Закачка без отклика', value: '18,4', unit: '%', delta: -2.1, du: ' п.п.', good: 'down', d: 'доля объёма закачки' },
        { label: 'Проблемных элементов', value: String(recs.length), d: `из ${PL_EZ.length} · направлено в ГТМ: ${Object.keys(PL_ST.uzSent).length}` },
        { label: 'Ожидаемый прирост добычи', value: '+' + fmt(gain, 1), unit: 'т/сут', d: 'при выполнении рекомендаций' },
      ]} />
      <Grid2 cols="1fr 1fr">
        <Section title="Ранжирование элементов" sub="по эффективности закачки" flush info={`Процесс Р4, шаг 4.5 · расчёт ${dFmt(dAdd(-1))} · данные добычи, закачки и фонда — ABAI БД 2.0`}>
          <DataTable rows={PL_EZ} columns={ezCols} pageSize={10} onRowClick={(r) => setSel(r.id)} getRowClassName={(p) => (p.row.id === ez.id ? 'sel' : '')} />
        </Section>
        <Section title={`Элемент ${ez.id}`} action={<StatusChip tone={ez.tone} label={PL_EZ_T[ez.tone]} />} info="Фон — пластовое давление, атм; линии — связь нагнетательной и реагирующих скважин">
          <FieldMap layer="p" ez={ez} />
          <Divider sx={{ my: 1.5 }} />
          <KV rows={[
            ['Нагнетательная скважина', <span key="i"><WellLink id={ez.c.id} /> · {fmt(ez.c.qInj)} м³/сут</span>],
            ['Реагирующие добывающие', <span key="l">{ez.links.length ? ez.links.map((w, i) => <span key={w.id}>{i ? ', ' : ''}<WellLink id={w.id} /></span>) : '—'}</span>],
            ['Компенсация · эффективность', `${pct(ez.comp, 0)} · ${fmt(ez.eff, 1)} т на 1000 м³`],
          ]} />
        </Section>
      </Grid2>
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="rec" label={`Рекомендации · ${recs.length}`} /><Tab value="fc" label="Прогноз эффекта" /><Tab value="opt" label="Варианты оптимизации" /><Tab value="route" label={`Ход оптимизации ППД · ${r4.filter((r) => r.status === 'active').length}`} />
        </Tabs>
        {tab === 'rec' && <Box sx={{ py: 1 }}><DataTable rows={recs} columns={recCols} /></Box>}
        {tab === 'fc' && (
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>Добыча нефти по участку, т/сут · прогноз на 12 месяцев</Typography>
            <TrendChart height={280} unit="т/сут" data={data} fcFrom={data[11].x} fcLabel="Прогноз ГДМ"
              band={{ lo: 'lo', hi: 'hi', name: 'Коридор прогноза', color: C.s[2] }}
              series={[{ key: 'f', name: 'Факт', color: C.s[0] }, { key: 'base', name: 'Базовый режим', color: C.s[1], dash: true }, { key: 'opt', name: 'Оптимизированный режим', color: C.s[2] }]} />
          </Box>
        )}
        {tab === 'opt' && (
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>1 602 варианта нестационарной закачки · оптимум +{fmt(OPT.best.x, 1)} тыс. т, NPV {fmt(OPT.best.y, 1)} млрд тг · целевая функция — NPV</Typography>
            <ScatterPlot height={300} xLabel="Прирост добычи нефти за 5 лет, тыс. т" yLabel="NPV, млрд тг"
              groups={[
                { name: 'Варианты расчёта', color: C.s[0], opacity: 0.35, data: OPT.pts },
                { name: 'Базовый режим', color: C.s[1], opacity: 1, data: [{ x: 0, y: -3 }], shape: 'diamond' },
                { name: 'Оптимум', color: C.navy, opacity: 1, data: [OPT.best], shape: 'star' },
              ]} />
          </Box>
        )}
        {tab === 'route' && (
          <Box sx={{ p: 2 }}>
            {r4.map((r, k) => (
              <Box key={r.id} sx={{ pt: k ? 2 : 0, mt: k ? 2 : 0, borderTop: k ? '1px solid #eef1f5' : 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{r.obj.name}<Demo>{r.id}</Demo></Typography>
                  <RunAction run={r} label="Открыть мой шаг" />
                </Stack>
                <RunRoute run={r} codes={ROUTE} />
                <Typography sx={{ fontSize: 12.5, color: r.late ? 'error.main' : 'text.secondary', mt: 1 }}>{runNow(r)}</Typography>
              </Box>
            ))}
            {!r4.length && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Записей оптимизации ППД нет — запустите процесс по элементу заводнения.</Typography>}
          </Box>
        )}
      </Card>
    </>
  );
}
