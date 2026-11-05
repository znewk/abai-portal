// Паспорт скважины: шапка, вкладки «Обзор», «Конструкция», «ГНО», «Ремонты и мероприятия», «Дело скважины», «Прогноз».
import { useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Card, Stack, Typography, Button, Tabs, Tab, List, ListItemButton, Badge, ToggleButtonGroup, ToggleButton, Alert } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import NorthRounded from '@mui/icons-material/NorthRounded';
import SouthRounded from '@mui/icons-material/SouthRounded';
import { PageHeader, Section, Grid2, StatusChip, KV } from '../../components/ui.jsx';
import { TrendChart, BarsChart } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { WELL, W_ST, ALERTS, BPMN, NOUN, partOfProc } from '../../data/core.js';
import { journal, runPath, runNum, dueText, nowDemo, objectsFor, stepPath } from '../../data/exec.js';
import { C } from '../../theme.js';
import { fmt, fmtK, sum, avg, last, plural, series, rng, pick, dAdd, dFmt, dShort, tFmt, dayLabels, MON, MONF, TODAY } from '../../lib/format.js';
import { useApp } from '../../state.jsx';
import { ProcLink } from './_shared.jsx';

// ===== Данные скважины (демо, детерминированно) =====
function hist(w) {
  const n = 90; const inj = w.type === 'inj'; const base = inj ? w.qInj : Math.max(w.qL, 1);
  const qL = series('qL' + w.id, n, base * 1.04, 0.03, -0.06).map((v) => +v.toFixed(1));
  if (w.dev) for (let i = 78; i < n; i++) qL[i] = +(qL[i] * (0.78 + (i - 78) * 0.004)).toFixed(1);
  qL[n - 1] = Math.round(base);
  const wc = series('wc' + w.id, n, w.wc - 1.2, 0.006, 0.02).map((v) => +Math.min(99, v).toFixed(1)); wc[n - 1] = w.wc;
  const qO = qL.map((v, i) => +(v * (1 - wc[i] / 100) * 0.86).toFixed(1));
  const reg = Math.round(base * 1.05);
  const p = series('p' + w.id, n, inj ? 92 : w.pZab, 0.015).map((v) => +v.toFixed(1));
  const lb = dayLabels(n);
  return { n, qL, qO, wc, reg, p, rows: lb.map((x, i) => ({ x, qL: qL[i], qO: qO[i], wc: wc[i], reg, p: p[i] })) };
}
const built = (w, add = 0) => new Date(w.year, 3, 12 + add);
const hDyn = (w) => Math.min(w.hDyn, Math.round(w.depth * 0.72));
const pumpDepth = (w) => Math.min(w.depth - 70, hDyn(w) + 150);
function repairs(w) {
  const r = rng('rep' + w.id); const kinds = w.type === 'inj'
    ? [['ПРС', 'Опрессовка и смена пакера', 0], ['КРС', 'Ремонтно-изоляционные работы (РИР)', 0], ['ГТМ', 'Обработка призабойной зоны (ОПЗ)', 0], ['ПРС', 'Промывка забоя', 0]]
    : [['ПРС', 'Смена ' + (w.method === 'ШГН' ? 'штангового насоса' : 'ЭЦН'), 0], ['КРС', 'Ликвидация негерметичности эксплуатационной колонны', 0], ['ГТМ', 'Гидроразрыв пласта (ГРП)', 1], ['ГТМ', 'Обработка призабойной зоны (ОПЗ)', 1], ['ПРС', 'Промывка забоя от песчаной пробки', 0], ['ГТМ', 'Оптимизация режима ГНО', 1]];
  const out = []; let d = -40 - Math.floor(r() * 60);
  for (let i = 0; i < 5; i++) { const k = kinds[Math.floor(r() * kinds.length)]; out.push({ id: i, d: dAdd(d), type: k[0], t: k[1], dur: Math.round(18 + r() * 90), br: (k[0] === 'КРС' ? 'КРС-0' : 'ПРС-1') + (1 + Math.floor(r() * 8)), eff: k[2] ? +(1.5 + r() * 6).toFixed(1) : null, act: k[2] ? +(1 + r() * 6).toFixed(1) : null }); d -= 120 + Math.floor(r() * 300); }
  return out;
}
const DOCS = (w) => [
  ['pas', 'Паспорт скважины', 'ABAI БД 2.0', 'Б4', '4.5', dAdd(-210), true],
  ['akt', 'Акт приёмки скважины из бурения', 'ABAI БД 2.0', 'Б4', '4.0', built(w), true],
  ['prog', 'Программа освоения после бурения', 'ABAI БД 2.0', 'Б4', '4.2 – 4.3', built(w, 6), true],
  ['avr', 'Акт выполненных работ (АВР) по последнему ремонту', 'АВР+', 'Б5', '5.4.1', dAdd(-12), w.status !== 'repair'],
  ['tr', 'Технологический режим на ' + MONF[TODAY.getMonth()], 'ABAI ТР 2.0', 'Д9', '', dAdd(-2), false],
  ['inc', 'Инклинометрия ствола', 'ABAI БД 2.0', 'Б3', '3.9.1', built(w, -4), true],
].map(([id, t, sys, p, c, d, signed], i) => ({ id: w.id + ':' + id, t, sys, p, c, d, v: 'v.' + (1 + (i % 3)), signed }));

// ===== Конструкция скважины (SVG) =====
function Construction({ w }) {
  const H = 560, top = 30, sc = (m) => top + (m / (w.depth + 60)) * (H - top - 30);
  const cols = [['Направление', 426, 30, 60], ['Кондуктор', 324, 650, 44], ['Эксплуатационная колонна', 146, w.depth, 26]];
  const perfTop = w.depth - 45, perfBot = w.depth - 12; const pump = w.type === 'inj' ? null : pumpDepth(w);
  const L = [];
  cols.forEach(([t, d, to, hw], i) => L.push([sc(to), 185 + hw + 10, t, `Ø ${d} мм · 0–${fmt(to)} м${i ? ' · цементаж до устья' : ''}`]));
  L.push([sc((perfTop + perfBot) / 2), 226, 'Интервал перфорации', `${fmt(perfTop)}–${fmt(perfBot)} м · горизонт ${w.horizon}`]);
  if (pump) L.push([sc(pump) - 9, 195, `${w.method} ${w.pump}`, `глубина спуска ${fmt(pump)} м · НКТ Ø 73 мм`]);
  else L.push([sc(perfTop - 20), 199, 'НКТ Ø 73 мм с пакером', `пакер на ${fmt(perfTop - 20)} м`]);
  L.sort((p, q) => p[0] - q[0]); const ys = L.map((l) => l[0]);
  for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], i === ys.length - 1 ? H - 10 : ys[i + 1] - 34);
  for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + 34);
  const perf = []; for (let m = perfTop + 4; m < perfBot; m += 7) perf.push(m);
  const ink = '#4d5563';
  return (
    <svg viewBox={`0 0 640 ${H + 10}`} style={{ width: '100%', maxWidth: 720, display: 'block', fontFamily: 'inherit' }} role="img" aria-label="Конструкция скважины">
      <rect x="0" y={top} width="640" height={H - top} fill="#fcfcfb" />
      {[0, 200, 400, 600, 800, 1000, 1200, 1400].filter((m) => m < w.depth + 60).map((m) => <g key={m}><line x1="40" x2="330" y1={sc(m)} y2={sc(m)} stroke={C.grid} /><text x="34" y={sc(m) + 4} textAnchor="end" fontSize="11" fill={C.muted}>{fmt(m)}</text></g>)}
      {cols.map(([t, , to, hw]) => <g key={t} stroke={ink} strokeWidth="2.5" fill="none"><rect x={185 - hw} y={top} width={hw * 2} height={sc(to) - top} /><line x1={185 - hw - 8} x2={185 - hw} y1={sc(to)} y2={sc(to)} /><line x1={185 + hw} x2={185 + hw + 8} y1={sc(to)} y2={sc(to)} /></g>)}
      <rect x={159} y={sc(perfTop)} width="52" height={sc(perfBot) - sc(perfTop)} fill={C.s[1]} opacity=".25" />
      {perf.map((m) => <g key={m} stroke={C.s[1]} strokeWidth="2"><line x1={145} x2={159} y1={sc(m)} y2={sc(m)} /><line x1={211} x2={225} y1={sc(m)} y2={sc(m)} /></g>)}
      <line x1="185" x2="185" y1={top} y2={sc(pump || perfTop - 20)} stroke={C.s[0]} strokeWidth="5" />
      {pump ? <rect x="177" y={sc(pump) - 20} width="16" height="22" rx="3" fill={C.s[0]} /> : <rect x="173" y={sc(perfTop - 20) - 6} width="24" height="10" rx="2" fill={ink} />}
      {w.type !== 'inj' && <g><line x1="140" x2="230" y1={sc(hDyn(w))} y2={sc(hDyn(w))} stroke={C.s[2]} strokeWidth="2" strokeDasharray="4 3" /><text x="134" y={sc(hDyn(w)) + 4} textAnchor="end" fontSize="11" fill={ink}>Нд {fmt(hDyn(w))} м</text></g>}
      <line x1="185" x2="185" y1={sc(w.depth)} y2={sc(w.depth) + 10} stroke={ink} strokeWidth="2" />
      <text x="185" y={sc(w.depth) + 24} textAnchor="middle" fontSize="11" fill={C.muted}>Забой {fmt(w.depth)} м</text>
      {L.map(([y, x, t, s2], i) => <g key={t}><path d={`M${x} ${y}H340L362 ${ys[i]}H372`} fill="none" stroke={C.axis} strokeDasharray="2 3" /><text x="378" y={ys[i] - 2} fontSize="12" fontWeight="600" fill="#16191f">{t}</text><text x="378" y={ys[i] + 13} fontSize="11" fill={C.muted}>{s2}</text></g>)}
    </svg>
  );
}

// ===== Вкладки =====
function Overview({ w, H, al }) {
  const inj = w.type === 'inj'; const comp = Math.round((last(H.qL) / H.reg) * 100);
  const [k, setK] = useState('qL');
  const V = inj
    ? { qL: ['Приёмистость', 'м³/сут', [{ key: 'qL', name: 'Приёмистость', color: C.s[0], area: true }, { key: 'reg', name: 'Режим ABAI ТР 2.0', color: C.ink2, dash: true, width: 1.5 }]], p: ['Давление закачки', 'атм', [{ key: 'p', name: 'Давление закачки', color: C.s[0] }]] }
    : { qL: ['Дебит жидкости', 'м³/сут', [{ key: 'qL', name: 'Дебит жидкости', color: C.s[0], area: true }, { key: 'reg', name: 'Режим ABAI ТР 2.0', color: C.ink2, dash: true, width: 1.5 }]], qO: ['Дебит нефти', 'т/сут', [{ key: 'qO', name: 'Дебит нефти', color: C.s[0] }]], wc: ['Обводнённость', '%', [{ key: 'wc', name: 'Обводнённость', color: C.s[0] }]] };
  const cur = V[k] || V.qL;
  const mode = inj
    ? [['Режим закачки', fmt(H.reg) + ' м³/сут'], ['Выполнение режима', comp + '%'], ['Давление закачки', fmt(last(H.p), 1) + ' атм']]
    : [['Режим ТР 2.0', fmt(H.reg) + ' м³/сут'], ['Выполнение режима', comp + '%'], ['Динамический уровень', fmt(hDyn(w)) + ' м'], ['Забойное давление', w.pZab + ' атм']];
  return (
    <Grid2 cols="2fr 1fr">
      <Section title={cur[0] + ', 90 суток'} sub={cur[1]} info="Замеры АГЗУ и СДМС; режим — ABAI ТР 2.0; обводнённость — лабораторные анализы НГДУ."
        action={<ToggleButtonGroup size="small" exclusive value={k} onChange={(e, v) => v && setK(v)}>{Object.keys(V).map((x) => <ToggleButton key={x} value={x} sx={{ px: 1.25, py: 0.25, fontSize: 12.5 }}>{V[x][0]}</ToggleButton>)}</ToggleButtonGroup>}>
        <TrendChart data={H.rows} unit={cur[1]} dd={1} height={300} legend={cur[2].length > 1} series={cur[2]} />
      </Section>
      <Stack spacing={2}>
        <Section title="Режим работы"><KV w="55%" rows={mode} /></Section>
        <Section title="Отклонения" flush info={<span>ABAI ТР 2.0 → карточка отклонения → мероприятие в ABAI ПАЭГТМ. Процессы: <ProcLink code="Д2" short /> · <ProcLink code="Д9" short /></span>}>
          {al.length ? (
            <List disablePadding>{al.map((a) => (
              <ListItemButton key={a.id} component={RouterLink} to="/dob/tr" sx={{ borderRadius: 0, px: 2, py: 1.1, borderTop: '1px solid #f0f2f5', display: 'block' }}>
                <Stack direction="row" spacing={1} justifyContent="space-between"><Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{a.t}</Typography><Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{dShort(a.since)}</Typography></Stack>
                <Box sx={{ mt: 0.25 }}><StatusChip tone={a.st === 'Устранено' ? 'good' : a.tone} label={a.st + (a.loss ? ` · потери ${fmt(a.loss, 1)} т/сут` : '')} /></Box>
              </ListItemButton>))}
            </List>
          ) : <Box sx={{ px: 2, pb: 2, color: 'text.secondary', fontSize: 13 }}>Отклонений от технологического режима нет</Box>}
        </Section>
      </Stack>
    </Grid2>
  );
}

function GnoTab({ w }) {
  const { toast } = useApp();
  if (w.type === 'inj') return (
    <Section title="Оборудование нагнетательной скважины" info="ABAI БД 2.0 · режим закачки — ABAI УЗ 2.0" sx={{ maxWidth: 820 }}>
      <KV rows={[['Компоновка', 'НКТ Ø 73 мм с пакером ПРО-ЯМО'], ['Глубина пакера', fmt(w.depth - 65) + ' м'], ['Источник закачки', 'КНС-' + (2 + (w.x % 5)) + ' · водовод высокого давления'], ['Агент закачки', 'пластовая и сточная вода'], ['Последняя опрессовка', dFmt(dAdd(-96))], ['Межремонтный период', fmt(w.mtbf) + ' сут'], ['Режим закачки', <span>{fmt(w.qInj)} м³/сут · утверждён {dFmt(dAdd(-9))} (<ProcLink code="Р4" short />)</span>]]} />
    </Section>
  );
  if (w.method === 'Фонтан') return (
    <Section title="Фонтанная арматура" sx={{ maxWidth: 820 }}>
      <KV rows={[['Способ эксплуатации', 'фонтанный'], ['Штуцер', '8 мм'], ['Буферное давление', '24 атм'], ['Затрубное давление', '31 атм'], ['Последний замер', dFmt(dAdd(-1)) + ' · АГЗУ ' + w.gzu]]} />
    </Section>
  );
  const r = rng('gno' + w.id); const days = Math.round(w.mtbf * (0.4 + r() * 0.5)); const n = 90; const lb = dayLabels(n, n - 1);
  const base = Math.max(3, w.risk * 0.35);
  const data = lb.map((x, i) => { const v = +Math.min(99, base + (w.risk - base) * Math.pow(i / (n - 1), 1.3)).toFixed(1); return { x, v, lo: +Math.max(0, v - 2 - i * 0.12).toFixed(1), hi: +Math.min(100, v + 2 + i * 0.14).toFixed(1) }; });
  const tone = w.risk > 70 ? 'crit' : w.risk > 40 ? 'warn' : 'good';
  const kq = fmt(0.62 + r() * 0.3, 2); const compl = pick(r, ['АСПО', 'вынос песка', 'солеотложения', 'газ на приёме насоса']);
  return (
    <Grid2 cols="1fr 2fr">
      <Section title="Глубинно-насосное оборудование" info="ABAI БД 2.0 · ABAI ПГНО">
        <KV w="48%" rows={[['Способ эксплуатации', w.method], ['Типоразмер', <b>{w.pump}</b>], ['Глубина спуска', fmt(pumpDepth(w)) + ' м'], ['Дата спуска', dFmt(dAdd(-days))], ['Текущая наработка', fmt(days) + ' сут'], ['Средняя наработка на отказ', fmt(w.mtbf) + ' сут'], [w.method === 'ЭЦН' ? 'Частота / ток' : 'Число качаний', w.method === 'ЭЦН' ? '48 Гц · 31 А' : '5,2 мин⁻¹'], ['Коэффициент подачи', kq], ['Осложнения', compl]]} />
      </Section>
      <Section title="Прогноз риска отказа ГНО" sub="90 суток, %" info={<span>Модель ABAI ПГНО, расчёт {dFmt(TODAY)} 06:00. Подбор ГНО — <ProcLink code="Д6" />, мониторинг — <ProcLink code="Д9" />.</span>}
        action={w.risk > 40 ? <Button size="small" variant="contained" onClick={() => toast(`Заявка на подбор ГНО по ${w.id} создана и направлена в службу НГДУ (Д6 6.1)`)}>Создать заявку на подбор</Button> : <StatusChip tone={tone} label={`Риск ${w.risk}%`} />}>
        <TrendChart data={data} unit="%" dd={1} height={240} yDomain={[0, 100]} series={[{ key: 'v', name: 'Вероятность отказа', color: C.s[0] }]} band={{ lo: 'lo', hi: 'hi', name: 'Доверительный интервал 80%' }} />
      </Section>
    </Grid2>
  );
}

function RepairsTab({ w }) {
  const R = repairs(w); const g = R.filter((x) => x.type === 'ГТМ');
  const cols = [
    { field: 'd', headerName: 'Дата', width: 110, valueFormatter: (v) => dFmt(v) },
    { field: 'type', headerName: 'Вид', width: 70 },
    { field: 't', headerName: 'Работа', minWidth: 220 },
    { field: 'br', headerName: 'Бригада', width: 90 },
    { field: 'dur', headerName: 'Длит., ч', type: 'number', width: 80 },
    { field: 'act', headerName: 'Эффект план / факт, т/сут', width: 170, type: 'number', renderCell: ({ row: x }) => (x.eff == null ? '—' : <span>{fmt(x.eff, 1)} / <b style={{ color: x.act >= x.eff ? '#0b6b47' : '#b02a2a' }}>{fmt(x.act, 1)}</b></span>) },
  ];
  return (
    <Grid2 cols="2fr 1fr">
      <Section title="История ремонтов и мероприятий" flush info="КРС / ПРС — ABAI Цифровой мониторинг ТКРС и АВР+; ГТМ — ABAI ПАЭГТМ.">
        <DataTable rows={R} columns={cols} initialSort={[{ field: 'd', sort: 'desc' }]} />
      </Section>
      <Section title="Эффективность ГТМ" sub="прирост дебита нефти, т/сут" info={<span>Анализ эффективности — <ProcLink code="Р2" /></span>}>
        {g.length ? <BarsChart height={250} unit="т/сут" dd={1} data={g.map((x) => ({ x: dShort(x.d) + ' ' + String(x.d.getFullYear()).slice(2), act: x.act, eff: x.eff }))} series={[{ key: 'act', name: 'Факт', color: C.s[0] }]} plan={{ key: 'eff', name: 'План (ожидаемый эффект)' }} />
          : <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>ГТМ по скважине не проводились</Box>}
      </Section>
    </Grid2>
  );
}

function DocsTab({ w, signed, setSigned }) {
  const { role, sign, toast } = useApp();
  const D = DOCS(w).map((d) => ({ ...d, signed: d.signed || !!signed[d.id] })); const canSign = role && !role.limited;
  const cols = [
    { field: 't', headerName: 'Документ', minWidth: 280, renderCell: ({ row: d }) => <Box><Typography sx={{ fontSize: 13, fontWeight: 600 }}>{d.t}</Typography><Typography variant="caption" color="text.secondary">{d.v}</Typography></Box> },
    { field: 'sys', headerName: 'Система', width: 130 },
    { field: 'd', headerName: 'Дата', width: 110, valueFormatter: (v) => dFmt(v) },
    { field: 'signed', headerName: 'ЭЦП', width: 160, renderCell: ({ value }) => <StatusChip tone={value ? 'good' : 'warn'} label={value ? 'Подписан' : 'Ожидает подписи'} /> },
    { field: 'act', headerName: '', width: 230, sortable: false, filterable: false, renderCell: ({ row: d }) => (
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" onClick={() => toast(`Документ «${d.t}» открыт в просмотрщике ABAI БД 2.0`)}>Открыть</Button>
        {!d.signed && canSign && <Button size="small" variant="contained" onClick={() => sign(`Документ «${d.t}» · скважина ${w.id}`, () => { setSigned({ ...signed, [d.id]: true }); toast(`Документ «${d.t}» подписан ЭЦП`); })}>Подписать ЭЦП</Button>}
      </Stack>) },
  ];
  return (
    <Section title="Дело скважины" sub={`${D.length} документов · ${D.filter((d) => !d.signed).length} ожидают подписи`} flush info={<span>Документы хранятся в ABAI БД 2.0; формирование паспорта — <ProcLink code="Б4" /></span>}>
      <DataTable rows={D} columns={cols} />
    </Section>
  );
}

function ForecastTab({ w }) {
  const inj = w.type === 'inj';
  const lb = Array.from({ length: 24 }, (_, i) => { const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - 11 + i, 1); return MON[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2); });
  const base = inj ? w.qInj : w.qO; const q = base < 10 ? 2 : 1;
  const fact = series('mf' + w.id, 12, base * 1.07, 0.025, -0.07).map((v) => +v.toFixed(q)); fact[11] = base;
  const fc = Array.from({ length: 12 }, (_, i) => +(base * Math.pow(inj ? 1 : 0.992, i + 1)).toFixed(q));
  const data = lb.map((x, i) => (i < 11 ? { x, f: fact[i] } : i === 11 ? { x, f: base, p: base, lo: base, hi: base } : { x, p: fc[i - 12], lo: +(fc[i - 12] * (1 - 0.03 - (i - 12) * 0.008)).toFixed(q), hi: +(fc[i - 12] * (1 + 0.025 + (i - 12) * 0.006)).toFixed(q) }));
  const cum = sum(fc) * 30.4; const unit = inj ? 'м³/сут' : 'т/сут';
  return (
    <Grid2 cols="2fr 1fr">
      <Section title={inj ? 'Прогноз приёмистости на 12 месяцев' : 'Прогноз дебита нефти на 12 месяцев'} sub={inj ? 'м³/сут' : 'т/сут'} info={`ГДМ Узень v.2026.3, режим ABAI ТР 2.0, расчёт ${dFmt(dAdd(-1))}.`}>
        <TrendChart data={data} unit={unit} dd={q} height={290} fcFrom={lb[11]} series={[{ key: 'f', name: 'Факт', color: C.s[0] }, { key: 'p', name: 'Прогноз', color: C.s[0], dash: true }]} band={{ lo: 'lo', hi: 'hi', name: 'Коридор прогноза P10–P90' }} />
      </Section>
      <Section title="Итоги прогноза">
        <KV w="52%" rows={inj ? [['Средняя приёмистость', fmt(avg(fc)) + ' м³/сут'], ['Накопленная закачка за 12 мес.', fmtK(cum) + ' м³'], ['Элемент заводнения', 'Э-' + (10 + (w.x % 9))], ['Влияние на окружающие скважины', '4 добывающих']]
          : [['Средний дебит нефти', fmt(avg(fc), 1) + ' т/сут'], ['Накопленная добыча за 12 мес.', fmt(cum) + ' т'], ['Темп падения', '0,8% в месяц'], ['Прогноз обводнённости', fmt(Math.min(99, w.wc + 1.6), 1) + '%'], ['Базовая добыча', 'без учёта ГТМ']]} />
      </Section>
    </Grid2>
  );
}

// ===== Процессы и задачи по скважине =====
function ProcTab({ w }) {
  const { runs, role } = useApp(); const nav = useNavigate(); const now = nowDemo();
  const rs = runs.filter((r) => r.obj.id === 'w:' + w.id).sort((a, b) => (a.status === 'done') - (b.status === 'done') || b.started - a.started);
  const hist = rs.flatMap((r) => journal(r).map((e) => ({ ...e, r }))).sort((a, b) => b.at - a.at).slice(0, 12);
  const startable = BPMN.filter((P) => objectsFor(P).some((x) => x.id === 'w:' + w.id) && !rs.some((r) => r.p === P.p && r.status === 'active') && !role.limited);
  return (
    <Grid2 cols="1fr 1fr">
      <Section title={`Процессы по скважине · ${rs.filter((r) => r.status === 'active').length} в работе`} flush action={startable.slice(0, 2).map((P) => <Button key={P.p} size="small" variant="outlined" onClick={() => nav(`/m/${partOfProc(P.p)}/p/${encodeURIComponent(P.p)}?start=1`)}>{NOUN[P.p]}</Button>)}>
        <List disablePadding>{rs.map((r) => (
          <ListItemButton key={r.id} onClick={() => nav(runPath(r))} sx={{ borderRadius: 0, px: 2, py: 1.1, borderTop: '1px solid #f0f2f5', display: 'block' }}>
            <Stack direction="row" justifyContent="space-between" spacing={1}><Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{NOUN[r.p]}<Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}> · {runNum(r)}</Typography></Typography>{r.status === 'done' ? <StatusChip tone="good" label={`Завершён ${dFmt(r.finishedAt)}`} /> : <StatusChip tone={r.late ? 'crit' : 'info'} label={dueText(r.worst, now)} />}</Stack>
            {r.status === 'active' && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{r.active.map((a) => `${r.P.s[a.i].t} · ${r.P.s[a.i].r}${role.lane(r.p, r.P.s[a.i].r) ? ' (ваш шаг)' : ''}`).join('; ')}</Typography>}
          </ListItemButton>))}
          {!rs.length && <Box sx={{ p: 3, color: 'text.secondary', textAlign: 'center', fontSize: 13 }}>Процессов по скважине нет</Box>}</List>
      </Section>
      <Section title="История действий" flush>
        <Box sx={{ px: 2, pb: 1 }}>{hist.map((e, k) => (
          <Stack key={k} direction="row" spacing={2} sx={{ py: 0.75, borderTop: k ? '1px solid #f0f2f5' : 0, fontSize: 13 }}>
            <Box sx={{ width: 100, color: 'text.secondary', flex: 'none', fontSize: 12 }}>{dFmt(e.at)} {tFmt(e.at)}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}><b>{e.by}</b> · {e.r.P.s[e.i].t}<Typography sx={{ fontSize: 12, color: e.kind === 'return' ? 'warning.dark' : 'text.secondary' }}>{NOUN[e.r.p]} · {e.text}</Typography></Box>
          </Stack>))}
          {!hist.length && <Typography sx={{ py: 2, fontSize: 13, color: 'text.secondary', textAlign: 'center' }}>Действий пока нет</Typography>}</Box>
      </Section>
    </Grid2>
  );
}

// Плашка на обзоре: какие процессы идут по скважине, на каком шаге и у кого
function WellRuns({ w }) {
  const { runs, role } = useApp(); const nav = useNavigate(); const now = nowDemo();
  const act = runs.filter((r) => r.obj.id === 'w:' + w.id && r.status === 'active');
  if (!act.length) return null;
  return (
    <Box sx={{ mb: 2, display: 'grid', gap: 1 }}>{act.map((r) => {
      const steps = [...new Set(r.active.map((a) => r.P.s[a.i].t))]; const mine = r.active.find((a) => role.lane(r.p, r.P.s[a.i].r));
      return (
        <Alert key={r.id} severity={r.late ? 'warning' : 'info'} icon={false} sx={{ alignItems: 'center', '& .MuiAlert-message': { flex: 1, minWidth: 0 } }}
          action={<Button size="small" onClick={() => nav(mine ? stepPath(r, mine.i) : runPath(r))}>{mine ? 'К моему шагу' : 'Открыть'}</Button>}>
          <Typography sx={{ fontSize: 13.5 }}>По скважине идёт: <b>{NOUN[r.p]}</b> · {runNum(r)} · шаг «{steps[0]}»{steps.length > 1 ? ` и ещё ${steps.length - 1}` : ''} · {r.lanes.join(', ')}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{r.late ? 'Срок нарушен' : 'Срок'}: {dueText(r.worst, now)}{mine ? ' · ваш шаг' : ''}</Typography>
        </Alert>);
    })}</Box>
  );
}

export default function WellCard() {
  const { id } = useParams(); const w = WELL(id);
  const [tab, setTab] = useState('ov'); const [signed, setSigned] = useState({});
  if (!w) return <PageHeader title="Скважина не найдена" sub={`Скважина «${id}» отсутствует в реестре ABAI БД 2.0 по выбранному активу.`} actions={<Button component={RouterLink} to="/skv" startIcon={<ArrowBackRounded />}>Фонд скважин</Button>} />;
  const inj = w.type === 'inj'; const H = hist(w); const al = ALERTS.filter((a) => a.well === w.id); const alOpen = al.filter((a) => a.st !== 'Устранено').length;
  const procN = useApp().runs.filter((r) => r.obj.id === 'w:' + w.id && r.status === 'active').length;
  const unsigned = DOCS(w).filter((d) => !d.signed && !signed[d.id]).length;
  const facts = [[inj ? 'Приёмистость' : 'Дебит нефти', inj ? fmt(last(H.qL)) + ' м³/сут' : fmt(last(H.qO), 1) + ' т/сут'], [inj ? 'Давление закачки' : 'Обводнённость', inj ? fmt(last(H.p), 1) + ' атм' : fmt(last(H.wc), 1) + '%'], ['Пластовое давление', w.pPl + ' атм'], ['Горизонт', w.horizon], ['Забой', fmt(w.depth) + ' м'], ['Год ввода', w.year]];
  const I = inj ? SouthRounded : NorthRounded;
  return (
    <>
      <Card sx={{ mb: 2 }}>
        <Box sx={{ p: 2.5, pb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: inj ? '#e8f0fb' : '#eef1f5', color: inj ? C.s[0] : 'text.secondary', display: 'grid', placeItems: 'center' }}><I fontSize="small" /></Box>
            <Box>
              <Typography variant="h4" component="h1">{w.id}</Typography>
              <Typography variant="body2" color="text.secondary">{inj ? 'Нагнетательная' : 'Добывающая'} · {w.method === 'Нагнетательная' ? 'закачка воды' : w.method} · {w.fld} · {w.ngdu} · {w.gzu}</Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <StatusChip tone={W_ST[w.status][1]} label={W_ST[w.status][0]} />
              {alOpen > 0 && <StatusChip tone="crit" label={`${alOpen} ${plural(alOpen, 'отклонение', 'отклонения', 'отклонений')}`} />}
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Button component={RouterLink} to="/skv" startIcon={<ArrowBackRounded />}>Фонд</Button>
            <Button component={RouterLink} to="/dob/tr" variant="outlined">Режим в ABAI ТР 2.0</Button>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }, gap: 2, mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            {facts.map(([k, v]) => <Box key={k}><Typography variant="caption" color="text.secondary">{k}</Typography><Typography sx={{ fontWeight: 600, fontSize: 14 }}>{v}</Typography></Box>)}
          </Box>
        </Box>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Tab value="ov" label="Обзор" />
          <Tab value="con" label="Конструкция" />
          <Tab value="gno" label={inj ? 'Оборудование' : 'ГНО'} />
          <Tab value="rep" label="Ремонты и мероприятия" />
          <Tab value="doc" label={<Badge color="warning" badgeContent={unsigned} sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>Дело скважины</Badge>} />
          <Tab value="fc" label="Прогноз" />
          <Tab value="proc" label={<Badge color="primary" badgeContent={procN} sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>Процессы и задачи</Badge>} />
        </Tabs>
      </Card>
      {tab === 'ov' && <><WellRuns w={w} /><Overview w={w} H={H} al={al} /></>}
      {tab === 'con' && (
        <Grid2 cols="3fr 2fr">
          <Section title="Конструкция скважины"><Construction w={w} /></Section>
          <Section title="Параметры конструкции">
            <KV w="50%" rows={[['Проектный забой', fmt(w.depth) + ' м'], ['Фактический забой', fmt(w.depth - 6) + ' м'], ['Профиль ствола', w.year > 2010 ? 'наклонно направленный' : 'вертикальный'], ['Альтитуда стола ротора', '43,6 м'], ['Эксплуатационная колонна', 'Ø 146 мм, марка стали Д'], ['Искусственный забой', fmt(w.depth - 8) + ' м'], ['Интервал перфорации', `${fmt(w.depth - 45)}–${fmt(w.depth - 12)} м`], ['Тип перфорации', 'кумулятивная, 16 отв./м'], ['Инклинометрия', dFmt(built(w, -4))], ['Паспорт утверждён', dFmt(dAdd(-210))]]} />
          </Section>
        </Grid2>
      )}
      {tab === 'gno' && <GnoTab w={w} />}
      {tab === 'rep' && <RepairsTab w={w} />}
      {tab === 'doc' && <DocsTab w={w} signed={signed} setSigned={setSigned} />}
      {tab === 'fc' && <ForecastTab w={w} />}
      {tab === 'proc' && <ProcTab w={w} />}
    </>
  );
}
