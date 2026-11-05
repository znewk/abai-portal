// Единые данные ЦД · КХД: схема интеграций, объём обмена, журнал ошибок, реестр интеграций (сл. 3, 34, 54; BPMN Dream TO BE).
import { useState } from 'react';
import { Box, Button, Stack, Typography, List, ListItem, Tooltip, Card, Tabs, Tab } from '@mui/material';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, KV } from '../../components/ui.jsx';
import { BarsChart, MiniLine } from '../../components/charts.jsx';
import DataTable from '../../components/DataTable.jsx';
import { SideDrawer, SecTitle } from './_shared.jsx';
import { useApp } from '../../state.jsx';
import { C } from '../../theme.js';
import { fmt, fmtK, sum, series, dayLabels, dAdd, dFmt, tFmt, plural, TODAY } from '../../lib/format.js';

// [id, система, направление, данные, протокол, период, обмен (мин назад), объём за сутки, ошибок, статус, источник]
const INT = [
  ['sdms', 'СДМС', 'СДМС → КХД → ABAI БД 2.0', 'Параметры работы скважин, онлайн', 'OPC UA', 'онлайн, 5 мин', 3, 2860000, 14, 'warn', 'Д1 1.1 – 1.2'],
  ['scada', 'SCADA (АСУ ТП)', 'SCADA → КХД', 'Телеметрия АСУ ТП', 'OPC UA', 'онлайн', 1, 1020000, 0, 'good', 'Д1'],
  ['isu', 'ИСУ', 'ИСУ → КХД', 'Данные учёта добычи', 'REST API', '1 час', 26, 48000, 0, 'good', 'Д1'],
  ['askue', 'АСКУЭ / АСТУЭ', 'АСКУЭ / АСТУЭ → КХД → ABAI БД 2.0', 'Часовые профили: напряжение, ток, cos φ', 'REST API', '1 час', 40, 186000, 0, 'good', 'Д7 7.2.1'],
  ['gti', 'Станция ГТИ Петролайн', 'ДЭЛ-140/150 → КХД → ABAI БД 2.0', 'Данные бурения в реальном времени', 'WITSML 1.4.1', 'онлайн', 1, 412000, 0, 'good', 'Б3'],
  ['bd', 'ABAI БД 2.0', 'КХД ⇄ ABAI БД 2.0', 'Нормализованные данные промысла, статусы, документы', 'Внутренняя шина', 'онлайн', 1, 3900000, 0, 'good', 'сл. 54'],
  ['eng', 'Petrel / tNavigator', 'ABAI ЦРНС 2.0 ⇄ Petrel / tNavigator', 'Исходные данные, геомодель, карты ОИЗ, НИЗ, ННТ', 'Интеграционный коннектор', 'по событию', 1080, 6, 0, 'good', 'Г3.4 3.4.2 · 3.4.15'],
  ['kc', 'КЦ (КМГ)', 'ABAI БД 2.0 → КХД → КЦ', 'ПП ДЗО, суточные сводки, итоги бурения', 'REST API', 'сутки', 130, 2400, 0, 'good', 'Б1 1.2.1 · Б3 3.9.2'],
  ['sap', 'SAP', 'КХД ⇄ SAP', 'Справочники оборудования, затраты, МТР', 'Адаптер SAP', 'сутки', 410, 18000, 0, 'good', 'сл. 54'],
  ['sed', 'СЭД', 'КХД ⇄ СЭД', 'Регистрация входящих и исходящих документов', 'Адаптер СЭД', 'по событию', 12, 1100, 0, 'good', 'сл. 54'],
  ['zak', 'Портал закупок Самрук-Казына', 'КХД ⇄ Портал закупок', 'Тендерный пакет на бурение', 'Адаптер', 'по событию', 2900, 36, 0, 'good', 'Б2'],
  ['isez', 'ИСЭЗ Самрук-Казына', 'ABAI БД 2.0 → ИСЭЗ', 'План работ (.xlsx) для закупа', 'Файловая выгрузка', 'по событию', 5200, 4, 0, 'info', 'Г3 3.24 → 3.26'],
  ['avr', 'АВР+', 'АВР+ ⇄ ABAI БД 2.0', 'Заказ-наряды КРС / ПРС, акты выполненных работ', 'REST API', '15 мин', 95, 3400, 23, 'crit', 'Б5'],
  ['dir', 'Directum', 'Directum ⇄ ABAI БД 2.0', 'ПОР на ПРС, согласование', 'Адаптер', 'по событию', 64, 210, 0, 'good', 'Б5'],
].map(([id, sys, dir, data, proto, per, ago, vol, err, st, src]) => ({ id, sys, dir, data, proto, per, ago, vol, err, st, src }));
const IST = { good: 'В работе', warn: 'Частичные ошибки', crit: 'Сбой обмена', info: 'Файловый обмен' };
const SC = { good: C.good, warn: C.warn, crit: C.crit, info: C.axis };
const agoT = (m) => (m < 60 ? `${m} мин назад` : m < 1440 ? `${Math.round(m / 60)} ч назад` : `${Math.round(m / 1440)} сут назад`);
// Журнал ошибок: [интеграция, минут назад, тон, описание, последствие]
const ERRS = [
  ['avr', 31, 'crit', 'Ошибка авторизации адаптера', '23 наряд-заказа не переданы (Б5)'],
  ['sdms', 182, 'warn', `Нет параметров за ${dFmt(dAdd(-1))} по 14 скважинам НГДУ-3`, 'канал связи ГЗУ-148, ГЗУ-152 (Д1 1.1)'],
  ['sdms', 655, 'good', 'Задержка передачи 18 мин (устранено автоматически)', 'повторная отправка пакета'],
  ['sap', 2085, 'good', 'Расхождение кода оборудования в справочнике SAP PM (исправлено)', '6 позиций'],
];
const GRP = [['Промысловые данные (СДМС, SCADA, ИСУ)', C.s[0], 3930], ['Энергоучёт (АСКУЭ / АСТУЭ)', C.s[1], 186], ['Бурение (WITSML)', C.s[2], 412], ['Корпоративные системы', C.s[3], 25]];

// Схема интеграций (SVG)
function Schema({ stOf, onPick }) {
  const W = 1180, H = 500;
  const tipOf = (id) => { const x = INT.find((i) => i.id === id); return x ? `${x.dir}: ${x.data} · ${x.proto}, ${x.per} · ${IST[stOf(x)]}` : ''; };
  const st = (id) => stOf(INT.find((i) => i.id === id));
  const Node = ({ x, y, w, h, t, s, dot, id, fill = '#fff', stroke = '#dfe3ea', sw = 1, ink = '#16191f', sink = C.muted }) => {
    const g = (
      <g style={{ cursor: id ? 'pointer' : 'default' }} onClick={id ? () => onPick(id) : undefined}>
        <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={sw} />
        {dot && <circle cx={x + 14} cy={y + h / 2} r={4.5} fill={dot} />}
        <text x={x + (dot ? 26 : w / 2)} y={y + h / 2 + (s ? -3 : 4)} textAnchor={dot ? 'start' : 'middle'} style={{ fontSize: 13, fontWeight: 600, fill: ink }}>{t}</text>
        {s && <text x={x + (dot ? 26 : w / 2)} y={y + h / 2 + 13} textAnchor={dot ? 'start' : 'middle'} style={{ fontSize: 11, fill: sink }}>{s}</text>}
      </g>
    );
    return id ? <Tooltip title={tipOf(id)} placement="top">{g}</Tooltip> : g;
  };
  const mk = (c) => 'm' + c.replace(/\W/g, '');
  const Arr = ({ d, c, dash, both, id }) => {
    const p = <path d={d} fill="none" stroke={c} strokeWidth={2} strokeDasharray={dash ? '5 4' : undefined} markerEnd={`url(#${mk(c)}e)`} markerStart={both ? `url(#${mk(c)}s)` : undefined} />;
    return id ? <Tooltip title={tipOf(id)} followCursor>{p}</Tooltip> : p;
  };
  const cols = [C.good, C.warn, C.crit, C.axis, C.brand];
  const src = [['sdms', 'СДМС', 'параметры скважин, онлайн'], ['scada', 'SCADA (АСУ ТП)', 'телеметрия'], ['isu', 'ИСУ', 'учёт добычи'], ['askue', 'АСКУЭ / АСТУЭ', 'энергоучёт, часовые профили'], ['gti', 'Станция ГТИ Петролайн', 'WITSML, данные бурения']];
  const tw = [['ЦД скважины', 'Цифровое бурение · ТКРС', C.part.skv], ['ЦД пласта', 'ЦРНС 2.0 · УЗ 2.0 · ПАЭГТМ', C.part.plast], ['ЦД добычи', 'ПДИМ 2.0 · ТР 2.0 · ПГНО', C.part.dob]];
  const exK = [['kc', 'КЦ (КМГ)', 'ПП, сводки'], ['sap', 'SAP', 'МТР, затраты'], ['sed', 'СЭД', 'документы'], ['zak', 'Портал закупок', 'Самрук-Казына']];
  const exB = [['isez', 'ИСЭЗ', 'файл .xlsx'], ['avr', 'АВР+', 'наряд-заказы'], ['dir', 'Directum', 'ПОР на ПРС']];
  const ey = H - 96, ew = 114;
  const group = (list, x0, cx, busY) => {
    const xs = list.map((_, i) => x0 + i * (ew + 10) + ew / 2);
    return (
      <g>
        <path d={`M${cx} 232L${cx} ${busY}`} stroke={C.axis} strokeWidth={2} fill="none" />
        <path d={`M${Math.min(cx, ...xs)} ${busY}L${Math.max(cx, ...xs)} ${busY}`} stroke={C.axis} strokeWidth={2} fill="none" />
        {list.map(([id, t, s], i) => { const c = SC[st(id)]; const bad = st(id) === 'crit' || st(id) === 'warn'; return (
          <g key={id}>
            <Arr d={`M${xs[i]} ${busY}L${xs[i]} ${ey - 2}`} c={c} id={id} dash={id === 'isez'} both={id !== 'isez' && id !== 'kc'} />
            <Node x={x0 + i * (ew + 10)} y={ey} w={ew} h={50} t={t} s={s} id={id} stroke={bad ? c : '#dfe3ea'} sw={bad ? 2 : 1} />
          </g>); })}
      </g>
    );
  };
  const head = { fontSize: 11, fontWeight: 700, letterSpacing: '.06em', fill: C.muted, textTransform: 'uppercase' };
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 760, display: 'block' }} role="img" aria-label="Схема интеграций КХД">
        <defs>{cols.map((c) => <g key={c}><marker id={mk(c) + 'e'} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill={c} /></marker><marker id={mk(c) + 's'} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M10 0L0 5L10 10Z" fill={c} /></marker></g>)}</defs>
        <text x="20" y="22" style={head}>ИСТОЧНИКИ ДАННЫХ ПРОМЫСЛА</text><text x="380" y="22" style={head}>СЛОЙ ДАННЫХ ЦД</text><text x="930" y="22" style={head}>ДВОЙНИКИ И ИНЖЕНЕРНОЕ ПО</text>
        {src.map(([id, t, s], i) => { const y = 40 + i * 66; return <g key={id}><Arr d={`M240 ${y + 24}C310 ${y + 24} 310 ${150 + i * 18} 378 ${150 + i * 18}`} c={SC[st(id)]} id={id} /><Node x={20} y={y} w={220} h={48} t={t} s={s} dot={SC[st(id)]} id={id} /></g>; })}
        <Node x={380} y={120} w={180} h={110} t="КХД" s="слой бизнес-интеграций" fill={C.navy} stroke={C.navy} ink="#fff" sink="#9fb3cf" />
        <Node x={650} y={120} w={180} h={110} t="ABAI БД 2.0" s="единая база ЦД" fill={C.part.data} stroke={C.part.data} ink="#fff" sink="#ddd6fb" />
        <Arr d="M562 175L648 175" c={SC[st('bd')]} both id="bd" />
        {tw.map(([t, s, c], i) => { const y = 122 + i * 74; return <g key={t}><Arr d={`M832 175C880 175 880 ${y + 27} 928 ${y + 27}`} c={C.brand} both /><Node x={930} y={y} w={230} h={54} t={t} s={s} dot={c} /></g>; })}
        <Node x={930} y={30} w={230} h={46} t="Petrel · tNavigator · Techlog" s="инженерное ПО, коннектор ЦРНС 2.0" dot={SC[st('eng')]} id="eng" />
        <Arr d="M1045 78L1045 120" c={SC[st('eng')]} both id="eng" />
        {group(exK, 262, 470, ey - 56)}{group(exB, 770, 740, ey - 40)}
        <text x="20" y={ey + 18} style={head}>КОРПОРАТИВНЫЕ</text><text x="20" y={ey + 33} style={head}>И ВНЕШНИЕ СИСТЕМЫ</text><text x="20" y={ey + 48} style={{ fontSize: 11, fill: C.muted }}>через адаптеры КХД</text>
      </svg>
      <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2.5, rowGap: 0.5, mt: 1, fontSize: 12.5, color: 'text.secondary' }}>
        {[['в работе', C.good], ['частичные ошибки', C.warn], ['сбой обмена', C.crit], ['файловая выгрузка', C.axis], ['чтение и запись двойников', C.brand]].map(([t, c]) => <Stack key={t} direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 14, height: 3, borderRadius: 1, bgcolor: c }} /><span>{t}</span></Stack>)}
      </Stack>
    </Box>
  );
}

export default function Khd() {
  const { role, toast } = useApp(); const admin = role.id === 'admin';
  const [restart, setRestart] = useState({}); const [pick, setPick] = useState(null); const [tab, setTab] = useState('reg');
  const stOf = (x) => (restart[x.id] ? 'good' : x.st); const errOf = (x) => (restart[x.id] ? 0 : x.err);
  const doRestart = (id) => { const x = INT.find((q) => q.id === id); setRestart({ ...restart, [id]: 1 }); setPick(null); toast(`Обмен «${x.dir}» перезапущен · ошибок нет`); };
  const err = sum(INT.map(errOf)); const ok = INT.filter((x) => ['good', 'info'].includes(stOf(x))).length;
  const n = 30; const lab = dayLabels(n);
  const ser = GRP.map(([nm, c, b], k) => ({ key: 'g' + k, name: nm, color: c, v: series('pd-x' + k, n, b, 0.05).map((v) => Math.round(v)) }));
  const vol = lab.map((x, i) => Object.fromEntries([['x', x], ...ser.map((s) => [s.key, s.v[i]])]));
  const x = pick && INT.find((q) => q.id === pick);
  const errs = ERRS.map(([id, mn, tone, t, s], i) => ({ i, id, it: INT.find((q) => q.id === id), fixed: tone === 'good' || !!restart[id], tone, t, s, tt: new Date(TODAY.getTime() - mn * 60000) }));
  const openErr = errs.filter((e) => !e.fixed).length;

  return (
    <Box>
      <PageHeader title="Интеграции и обмен данными" sys={[['КХД', 'data']]}
        sub="Слой бизнес-интеграций ЦД Актива · обмен между службами без ручного ввода"
        actions={admin && <Button variant="outlined" onClick={() => toast('Проверка адаптеров выполнена: 14 из 14 отвечают')}>Проверить адаптеры</Button>} />
      <KpiRow items={[
        { label: 'Интеграций в работе', value: `${ok} / ${INT.length}`, d: 'без ошибок обмена' },
        { label: 'Объём обмена за сутки', value: '4,5', unit: 'млн записей', delta: 2.1, du: '%', good: 'up', d: 'к среднему за неделю' },
        { label: 'Ошибок за сутки', value: fmt(err), d: err ? 'АВР+, СДМС' : 'обмен без ошибок' },
        { label: 'Доступность КХД', value: '99,6', unit: '%', d: 'за 30 суток' },
      ]} />
      <Grid2 cols="2.4fr 1fr">
        <Section title="Схема интеграций" info="Источники промысла → КХД → ABAI БД 2.0 → двойники скважины, пласта и добычи; корпоративные системы — через адаптеры КХД. КХД — собственная разработка КМГ (сл. 3, 34); внешние системы — сл. 54; состав связей — по BPMN Dream TO BE. Клик по системе — карточка интеграции.">
          <Schema stOf={stOf} onPick={setPick} />
        </Section>
        <Section title="Ошибки обмена" sub={openErr ? `${openErr} ${plural(openErr, 'открыта', 'открыты', 'открыто')} · 72 часа` : 'открытых нет · 72 часа'} flush>
          <List disablePadding>{errs.map((e) => (
            <ListItem key={e.i} onClick={() => setPick(e.id)} sx={{ display: 'block', borderTop: '1px solid #f0f2f5', px: 2, py: 1.25, cursor: 'pointer', '&:hover': { bgcolor: '#f7f9fc' }, opacity: e.fixed ? 0.7 : 1 }}>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{e.it.sys}</Typography>
                <StatusChip tone={e.fixed ? 'good' : e.tone} label={e.fixed ? 'Устранено' : e.tone === 'crit' ? 'Сбой' : 'Ошибки'} />
              </Stack>
              <Typography sx={{ fontSize: 13, mt: 0.25 }}>{e.t}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{e.s} · {dFmt(e.tt) === dFmt(TODAY) ? 'сегодня' : dFmt(e.tt)}, {tFmt(e.tt)}</Typography>
              {!e.fixed && admin && <Button size="small" sx={{ mt: 0.5, ml: -1 }} onClick={(ev) => { ev.stopPropagation(); doRestart(e.id); }}>Перезапустить обмен</Button>}
            </ListItem>))}</List>
        </Section>
      </Grid2>
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="reg" label={`Реестр интеграций · ${INT.length}`} /><Tab value="vol" label="Объём обмена" />
        </Tabs>
        {tab === 'reg' && (
          <DataTable rows={INT} pageSize={8} onRowClick={(r) => setPick(r.id)} columns={[
            { field: 'dir', headerName: 'Интеграция', flex: 2, minWidth: 280, renderCell: ({ row }) => <Box><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{row.dir}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.data}</Typography></Box> },
            { field: 'proto', headerName: 'Протокол', width: 170 },
            { field: 'ago', headerName: 'Последний обмен', type: 'number', width: 140, valueFormatter: (v) => agoT(v) },
            { field: 'vol', headerName: 'За сутки', type: 'number', width: 110, valueFormatter: (v) => fmtK(v) },
            { field: 'err', headerName: 'Ошибок', type: 'number', width: 90, valueGetter: (v, row) => errOf(row), renderCell: ({ value }) => <Box sx={{ width: '100%', textAlign: 'right', color: value ? 'error.main' : 'text.secondary', fontWeight: value ? 700 : 400 }}>{value}</Box> },
            { field: 'st', headerName: 'Статус', width: 170, valueGetter: (v, row) => IST[stOf(row)], renderCell: ({ row }) => <StatusChip tone={stOf(row)} label={IST[stOf(row)]} /> },
          ]} />
        )}
        {tab === 'vol' && (
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>тыс. записей в сутки по группам источников · {dFmt(dAdd(-n + 1))} – {dFmt(TODAY)}</Typography>
            <BarsChart data={vol} series={ser} stacked unit="тыс. записей" height={280} />
          </Box>
        )}
      </Card>

      {x && (
        <SideDrawer open onClose={() => setPick(null)} title={x.dir} sub={x.data}
          actions={admin && errOf(x) ? <Button variant="contained" onClick={() => doRestart(x.id)}>Перезапустить обмен</Button> : <Button onClick={() => setPick(null)}>Закрыть</Button>}>
          <KV rows={[['Статус', <StatusChip tone={stOf(x)} label={IST[stOf(x)]} />], ['Система', x.sys], ['Протокол', x.proto], ['Периодичность', x.per], ['Последний обмен', agoT(x.ago)], ['Объём за сутки', fmt(x.vol) + ' записей'], ['Ошибок за сутки', String(errOf(x))], ['Основание связи', x.src]]} />
          {errOf(x) > 0 && <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, fontSize: 13, bgcolor: '#fff7f7', borderLeft: '3px solid', borderColor: 'error.main' }}>{(ERRS.find((e) => e[0] === x.id && e[2] !== 'good') || [])[3] || 'Ошибки обмена'}</Box>}
          <SecTitle>Объём обмена за 14 суток</SecTitle>
          <MiniLine height={170} unit="записей" keys={[{ key: 'v', name: 'Записей в сутки', color: C.s[0] }]} data={series('pd-i' + x.id, 14, Math.max(1, x.vol), 0.06).map((v, i) => ({ x: dayLabels(14)[i], v: Math.round(v) }))} />
        </SideDrawer>
      )}
    </Box>
  );
}
