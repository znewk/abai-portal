// ЦД пласта · обзор: 4 показателя → карта участка и состояние ГДМ → адаптация, синхронизация и процессы во вкладках.
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, ToggleButtonGroup, ToggleButton, Typography, Box, Card, Tabs, Tab } from '@mui/material';
import { PageHeader, KpiRow, Section, Grid2, KV, StatusChip, SegBar } from '../../components/ui.jsx';
import { TrendChart } from '../../components/charts.jsx';
import { WELLS, TWINS } from '../../data/core.js';
import { useApp } from '../../state.jsx';
import { avg, series, rng, fmt, pct, dFmt, dRel, TODAY } from '../../lib/format.js';
import { C } from '../../theme.js';
import { FieldMap, MapLegend, PL_LAYERS, ImaList, ProcCards } from './_shared.jsx';

const PROCS = ['Г3.4', 'Р1', 'Р4', 'Р2'];

export default function Overview() {
  const [layer, setLayer] = useState('p'); const [tab, setTab] = useState('hm'); const { runs } = useApp();
  const tw = TWINS.find((t) => t.id === 'plast'); const pAvg = avg(WELLS.map((w) => w.pPl));
  const years = Array.from({ length: 13 }, (_, i) => String(2014 + i));
  const fact = years.map((_, i) => +(318 + i * 4.9 - i * i * 0.05).toFixed(1));
  const rr = rng('pl-hm'); const model = fact.map((v, i) => +(v * (1 + (rr() - 0.5) * 0.024 * (i < 10 ? 1 : 0.4))).toFixed(1));
  const dev = avg(fact.map((v, i) => Math.abs(model[i] - v) / v)) * 100;
  const inst = runs.filter((r) => PROCS.includes(r.p) && r.status === 'active').length;
  return (
    <>
      <PageHeader title="Обзор ЦД пласта" sys={[['ABAI ЦРНС 2.0', 'plast'], ['ABAI УЗ 2.0', 'plast']]}
        sub={`Месторождение Узень · горизонты XIII–XVIII · ${tw.model} от ${dFmt(tw.upd)}`}
        actions={<><Button variant="outlined" component={RouterLink} to="/plast/crns">Геомодели и ГДМ</Button><Button variant="contained" component={RouterLink} to="/plast/uz">Оптимизация заводнения</Button></>} />
      <KpiRow items={[
        { label: 'Пластовое давление', value: fmt(pAvg, 1), unit: 'атм', delta: -0.6, dd: 1, good: 'up', d: 'среднее, за месяц', spark: series('pl-p', 12, pAvg, 0.004, -0.01) },
        { label: 'Компенсация отбора', value: '104,6', unit: '%', delta: 1.8, du: ' п.п.', good: 'up', d: 'накопленная 101,3%', to: '/plast/uz' },
        { label: 'Остаточные извлекаемые запасы', value: '186,4', unit: 'млн т', d: 'A+B+C1 на 01.01.2026' },
        { label: 'КИН текущий / проектный', value: '0,412', unit: '/ 0,480', d: 'выработка НИЗ 85,8%' },
      ]} />
      <Grid2 cols="3fr 2fr">
        <Section title="Карта участка" sub={PL_LAYERS[layer].t} info={`Узень, горизонты XIII–XVIII · ${PL_LAYERS[layer].src}`}
          action={<ToggleButtonGroup size="small" exclusive value={layer} onChange={(e, v) => v && setLayer(v)}><ToggleButton value="p">Давление</ToggleButton><ToggleButton value="wc">Обводнённость</ToggleButton><ToggleButton value="oiz">Запасы</ToggleButton></ToggleButtonGroup>}>
          <FieldMap layer={layer} />
          <MapLegend layer={layer} />
        </Section>
        <Section title="Состояние ГДМ" action={<StatusChip tone={tw.st[1]} label={tw.st[0]} />} info="ABAI ЦРНС 2.0 · расчётная среда tNavigator, Intersect · оперативная ПДГГДМ (сл. 6, 14)">
          <KV rows={[['Модель', tw.model], ['Обновлена', `${dFmt(tw.upd)} · ${dRel(tw.upd)}`], ['Адаптация на историю', `${tw.q}% скважин в допуске`], ['Отклонение по накопленной нефти', pct(dev, 1)]]} />
          <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2.5, mb: 0.75 }}>Отклонение расчёта по скважинам</Typography>
          <SegBar parts={[{ l: 'до 5%', v: 61, c: '#184f95' }, { l: '5–10%', v: 31, c: '#2a78d6' }, { l: '10–20%', v: 6, c: '#6da7ec' }, { l: 'более 20%', v: 2, c: '#b7d3f6' }]} />
        </Section>
      </Grid2>
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="hm" label="Адаптация на историю" />
          <Tab value="ima" label="Синхронизация с ЦД скважины и добычи" />
          <Tab value="proc" label={`Процессы · ${inst} в работе`} />
        </Tabs>
        {tab === 'hm' && (
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>Накопленная добыча нефти, млн т · месторождение Узень</Typography>
            <TrendChart height={260} unit="млн т" dd={1} data={years.map((x, i) => ({ x, f: fact[i], m: model[i] }))}
              series={[{ key: 'f', name: 'Факт', color: C.s[0] }, { key: 'm', name: 'Расчёт ГДМ', color: C.s[1], dash: true }]} />
          </Box>
        )}
        {tab === 'ima' && (
          <Box sx={{ py: 1 }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', px: 2, pb: 1 }}>Интегрированная модель актива · последний цикл {dFmt(TODAY)} 06:00</Typography>
            <ImaList />
          </Box>
        )}
        {tab === 'proc' && <Box sx={{ py: 1 }}><ProcCards codes={PROCS} /></Box>}
      </Card>
    </>
  );
}
