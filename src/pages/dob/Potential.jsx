// Потенциал добычи (Д3, Д5): водопад «потенциал → потери → факт», сценарии потенциала базовой добычи на 2027 год (запись Д3),
// скважины с потерями и мероприятия; расчёт потенциала мероприятия ведётся в записях Д5 по мероприятиям.
import { useState } from 'react';
import { Button, Box, Card, Tabs, Tab, Typography, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EastRounded from '@mui/icons-material/EastRounded';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, Hbars } from '../../components/ui.jsx';
import DataTable from '../../components/DataTable.jsx';
import { useApp } from '../../state.jsx';
import { PROD } from '../../data/core.js';
import { stepPath, runPath } from '../../data/exec.js';
import { fmt, pct, sum, dFmt, dAdd } from '../../lib/format.js';
import { C } from '../../theme.js';
import { seriesOf, assetName, assetK, WellLink, ShiftWaterfall, num } from './_shared1.jsx';
import { LOSSES, LEVERS, POT_SCEN, BASE_2027, losses, MEASURES, MEAS_ST } from './pot.data.js';
import { RunState, runOf, myStep, recState } from './_runs.jsx';

const WHY_TONE = { 'Простой': 'warn', 'Ремонт (ТКРС)': 'serious', 'Отклонение от режима': 'crit', 'Риск отказа ГНО': 'warn' };

// Статус мероприятия: у мероприятий с записью расчёта — по состоянию записи
function measState(m, runs) {
  const run = m.obj ? runOf(runs, 'Д5', m.obj) : null;
  if (!run) return { label: MEAS_ST[m.st][0], tone: MEAS_ST[m.st][1], run: null };
  if (run.status === 'done') return { label: 'Решение о реализации принято', tone: 'good', run };
  const s = run.P.s[run.active[0] ? run.active[0].i : 0];
  return { label: `Расчёт в работе · ${s.r}`, tone: recState(run)[1], run };
}

export default function Potential() {
  const { asset, runs, role } = useApp(); const nav = useNavigate(); const [tab, setTab] = useState('wells');
  const P = seriesOf(asset); const k = assetK(asset); const fact = P.fact[PROD.nF - 1];
  const L = LOSSES.map(([l, v]) => [l, Math.round(v * k)]);
  const pot = fact + sum(L.map((x) => x[1])); const gap = pot - fact;
  const base = Math.floor((fact * 0.9) / 500) * 500;
  const ls = losses().slice(0, 8);
  const meas = MEASURES.map((m) => ({ ...m, ms: measState(m, runs) }));
  const inWork = meas.filter((m) => m.st > 0 || m.ms.run);
  const d3 = runOf(runs, 'Д3', 'pot:base-2027');
  const canStart5 = role && !role.limited && role.lane('Д5', 'Службы НГДУ');
  return (
    <>
      <PageHeader title="Потенциал добычи" sub={`${assetName(asset)} · за ${dFmt(dAdd(-1))}`} sys={[['ABAI ПДИМ 2.0', 'dob'], ['ABAI ПАЭГТМ', 'dob']]} />
      <KpiRow items={[
        { label: 'Потенциал базовой добычи', value: fmt(pot), unit: 'т/сут', d: `факт ${fmt(fact)} т/сут` },
        { label: 'Разрыв потенциал – факт', value: fmt(gap), unit: 'т/сут', d: `${pct((gap / pot) * 100)} потенциала` },
        { label: 'Мероприятий в работе', value: fmt(inWork.length), d: `эффект ${fmt(sum(inWork.map((m) => m.eff)), 1)} т/сут` },
      ]} />
      {d3 && <Section title="Потенциал базовой добычи на 2027 год" sub="сценарии, эффективность прошлых мероприятий, варианты решений и корректировка производственной программы" sx={{ mb: 2 }}
        info="Процесс Д3: анализ отклонений (3.1–3.4), сценарии потенциала (3.4а), эффективность прошлых мероприятий (3.5.1, 3.5.2), инженерная проработка (3.6–3.7.2), варианты (3.8), решение (3.9).">
        <RunState run={d3} />
      </Section>}
      <Grid2 cols="2fr 1fr">
        <Section title="От потенциала к факту" sub="т/сут"
          info={`Потенциал — сценарий «Базовый» ПДИМ 2.0 на режимах ТР 2.0 и насосах ПГНО (Д3 3.4а); потери — по данным ТР 2.0 и БД 2.0. Шкала начинается с ${fmt(base)} т/сут.`}>
          <ShiftWaterfall base={base} unit="т/сут" height={320}
            items={[{ l: 'Потенциал', v: pot, total: true }].concat(L.map(([l, v]) => ({ l, v: -v })), [{ l: 'Факт', v: fact, total: true, fact: true }])} />
        </Section>
        <Section title="Сценарии потенциала на 2027 год" sub={`прирост к базовой добыче ${fmt(BASE_2027 * k, 2)} млн т, т/сут`} info="Сценарный расчёт — Д3 3.4а; резерв «Снятие ограничения ДНС-3» — по расчёту ИМА (Д4).">
          <Hbars labelW="44%" rows={POT_SCEN.map((s) => ({ l: s.t, v: Math.round(s.tsut * k), c: s.base ? C.s[0] : '#86b6ef', txt: `+${fmt(Math.round(s.tsut * k))} · ${fmt(s.year * k, 1)} тыс. т`, tip: s.d }))} />
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5 }}>Резервы: {LEVERS.map((x) => `${x.t[0].toLowerCase() + x.t.slice(1)} +${fmt(Math.round(x.v * k))}`).join(' · ')} т/сут</Typography>
        </Section>
      </Grid2>
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="wells" label="Скважины с потерями" /><Tab value="meas" label={`Мероприятия · ${meas.length}`} />
        </Tabs>
        {tab === 'wells' && (
          <DataTable rows={ls} onRowClick={(r) => nav('/m/skv/wells/' + encodeURIComponent(r.id))} columns={[
            { field: 'id', headerName: 'Скважина', flex: 0.9, renderCell: (p) => <WellLink id={p.value} /> },
            { field: 'ngdu', headerName: 'НГДУ', flex: 0.7 },
            { field: 'why', headerName: 'Причина', flex: 1.3, renderCell: (p) => <StatusChip tone={WHY_TONE[p.value]} label={p.value} /> },
            num('loss', 'Потери, т/сут', 1, { flex: 0.8, renderCell: (p) => <b>{fmt(p.value, 1)}</b> }),
          ]} />
        )}
        {tab === 'meas' && <>
          <Typography sx={{ px: 2, pt: 1.5, fontSize: 12.5, color: 'text.secondary' }}>Мероприятия по приоритету (NPV); технический потенциал, эффект по сценариям и экономика мероприятия рассчитываются в процессе расчёта потенциала мероприятия</Typography>
          <DataTable rows={meas} columns={[
            { field: 'prio', headerName: '№', width: 56, type: 'number' },
            { field: 'well', headerName: 'Объект', flex: 0.7, renderCell: (p) => (p.value.startsWith('ДНС') ? p.value : <WellLink id={p.value} />) },
            { field: 't', headerName: 'Мероприятие', flex: 1.8, renderCell: (p) => <Box sx={{ whiteSpace: 'normal', lineHeight: 1.35 }}>{p.value}</Box> },
            num('eff', 'Эффект, т/сут', 1, { flex: 0.7 }), num('npv', 'NPV, млн тг', 0, { flex: 0.7 }),
            { field: 'st', headerName: 'Статус', flex: 1.5, sortable: false, renderCell: (p) => {
              const ms = p.row.ms;
              if (ms.run) { const mine = myStep(role, ms.run); return <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}><Box sx={{ minWidth: 0, flex: 1, whiteSpace: 'normal', lineHeight: 1.3 }}><StatusChip tone={ms.tone} label={ms.label} sx={{ whiteSpace: 'normal' }} /></Box><Button size="small" endIcon={<EastRounded />} sx={{ flex: 'none' }} onClick={() => nav(mine ? stepPath(ms.run, mine.i) : runPath(ms.run))}>{mine ? 'Выполнить' : 'Открыть'}</Button></Stack>; }
              if (p.row.st === 0 && canStart5) return <Button size="small" onClick={() => nav('/m/dob/p/' + encodeURIComponent('Д5') + '?start=1')}>Рассчитать потенциал</Button>;
              return <StatusChip tone={ms.tone} label={ms.label} />;
            } },
          ]} />
        </>}
      </Card>
    </>
  );
}
