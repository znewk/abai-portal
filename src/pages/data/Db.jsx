// Единые данные ЦД · ABAI БД 2.0: реестр документов процессов (главная таблица), каталог объектов данных, журнал, справочники; качество данных — сбоку.
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Tabs, Tab, Card, Stack, Select, MenuItem, Typography, Tooltip, Link } from '@mui/material';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, KV, Meter, Code } from '../../components/ui.jsx';
import DataTable from '../../components/DataTable.jsx';
import { SideDrawer, SecTitle, VTimeline, ProcLink } from './_shared.jsx';
import { useApp } from '../../state.jsx';
import { BPMN } from '../../data/core.js';
import { C } from '../../theme.js';
import { fmt, fmtK, rng, avg, dAdd, dFmt, tFmt, plural, TODAY } from '../../lib/format.js';

const DIR = { geologiya: 'Геология', razrabotka: 'Разработка', burenie: 'Бурение и освоение', dobycha: 'Добыча' };
const SIG = { ok: ['Подписан ЭЦП', 'good'], sign: ['На подписании', 'warn'], appr: ['На согласовании', 'info'], draft: ['Черновик', ''], ext: ['От внешней стороны', ''] };

// Реестр документов: уникальные документы шагов процессов BPMN Dream TO BE
const DOCS = (() => {
  const m = new Map();
  BPMN.forEach((P) => P.s.forEach((s) => s.d.forEach((d) => {
    if (!m.has(d)) m.set(d, { d, p: P.p, m: P.m, pt: P.t, c: s.c, st: s.t, r: s.r, sys: s.s.find((x) => /ABAI|АВР|ИСЭЗ|Directum|КХД/.test(x)) || s.s[0] || 'ABAI БД 2.0', n: 0 });
    m.get(d).n++;
  })));
  return [...m.values()].map((x, i) => {
    const r = rng('doc-' + x.d); const fm = (x.d.match(/\(([^)]*)\)\s*$/) || [])[1] || '';
    const ext = /^Уполномоченные/.test(x.r); const v = r();
    return { ...x, id: 'ДОК-' + String(18240 + i * 7), name: x.d.replace(/\s*\([^)]*\)\s*$/, ''), fm, sig: ext ? 'ext' : v < 0.56 ? 'ok' : v < 0.76 ? 'sign' : v < 0.9 ? 'appr' : 'draft', date: dAdd(-Math.floor(r() * 45)), ver: 1 + Math.floor(r() * 3) };
  });
})();

// Каталог объектов данных: [объект, состав, записей, за месяц, источник, потребитель]
const CAT = [
  ['Скважины', 'Паспорта, конструкция, инклинометрия', 3412, 6, 'ABAI БД 2.0 · ABAI Цифровое бурение', 'skv'],
  ['Наряд-заказы', 'Заказ-наряды КРС / ПРС, акты', 9860, 312, 'АВР+ · ABAI Цифровой мониторинг ТКРС (Б5)', 'skv'],
  ['ГИС', 'Кривые LAS, РИГИС, результаты испытаний', 18940, 214, 'Подрядчики · ABAI ЦРНС 2.0 (Г3)', 'plast'],
  ['Керн', 'Образцы и лабораторные исследования', 6215, 38, 'КазНИПИ · ABAI ЦРНС 2.0', 'plast'],
  ['Сейсмика', 'Полевые данные SEG-D, кубы, интерпретация', 42, 1, 'Подрядчики · Spark · Petrel (Г3.1–Г3.3)', 'plast'],
  ['Модели', 'Геологические и гидродинамические модели (версии)', 27, 2, 'ABAI ЦРНС 2.0 · Petrel · tNavigator', 'plast'],
  ['Мероприятия', 'ГТМ: кандидаты, эффект, экономика', 2146, 57, 'ABAI ПАЭГТМ (Р2, Д5)', 'plast'],
  ['Замеры', 'Дебиты АГЗУ, лабораторные анализы, уровни', 1284560, 102300, 'СДМС · цеха и лаборатория НГДУ (Д1)', 'dob'],
  ['Параметры работы', 'Онлайн-параметры скважин и объектов', 48200000, 3900000, 'СДМС · SCADA через КХД', 'dob'],
  ['Трубопроводы', 'Паспорта участков, диагностика, отказы', 1926, 4, 'ABAI ПДИМ 2.0 (Д8)', 'dob'],
  ['Энергоучёт', 'Часовые профили потребления', 11600000, 800000, 'АСКУЭ / АСТУЭ через КХД (Д7)', 'dob'],
  ['Документы', 'Документы шагов процессов с ЭЦП', 152380, 4120, 'ABAI БД 2.0', 'data'],
].map(([t, s, n, m, src, part], i) => ({ id: i, t, s, n, m, src, part }));
const PART_T = { skv: 'ЦД скважины', plast: 'ЦД пласта', dob: 'ЦД добычи', data: 'Все двойники' };

// Качество данных по доменам: полнота, достоверность, своевременность
const QUAL = [
  ['Фонд скважин и паспорта', 98.6, 97.9, 96.4], ['Ремонты и наряд-заказы', 89.4, 92.1, 78.6], ['Геолого-геофизические данные', 91.5, 96.2, 84.7],
  ['Замеры и суточная добыча', 96.1, 93.4, 91.8], ['Параметры СДМС / SCADA', 94.2, 95.7, 88.3], ['Энергоучёт', 97.3, 94.8, 95.9], ['Трубопроводы', 86.2, 90.5, 82.1],
];
const qTone = (v) => (v >= 95 ? 'good' : v >= 85 ? '' : v >= 75 ? 'warn' : 'crit');

// Журнал изменений: [минут назад, кто (система или роль), что, объект]
const LOG = [
  [8, 'КХД', 'Загружены параметры работы скважин СДМС', '3 286 скважин · 2,86 млн записей'],
  [35, 'ABAI ТР 2.0', 'Обновлён технологический режим', '214 скважин НГДУ-1, НГДУ-3'],
  [48, 'ABAI ТР 2.0', 'Создана карточка отклонения (Д2, Д9)', 'УЗН-4471 · срыв подачи ЭЦН'],
  [130, 'ABAI ПДИМ 2.0', 'Сформирована суточная сводка ДЗО (Д1)', 'ожидает подтверждения ДОУП по НГДУ-3'],
  [220, 'ABAI Цифровое бурение', 'Сформированы суточные рапорты бурения (Б3)', 'УЗН-7455, КРМ-761, УЗН-9387'],
  [915, 'ОМГ · геология и разработка', 'Опубликована геологическая модель Узень v.2026.3 (Г3.4)', 'запущен пересчёт ИИ-ранжирования'],
  [1060, 'КазНИПИ', 'Загружен отчёт по исследованиям керна (Г3 3.31.3)', 'скважина УЗН-9244'],
  [1178, 'ЦИТС НГДУ-1', 'Подтверждены замеры лаборатории (Д1)', '128 скважин'],
  [1383, 'Подрядная организация', 'Загружены LAS-файлы и РИГИС (Г3 3.28)', 'скважина УЗН-9387'],
  [1465, 'Администратор данных', 'Изменён справочник «Типоразмеры ГНО»', 'версия 14 · +6 позиций'],
  [2392, 'КМГИ (ГО)', 'Подписана ЭЦП программа ГТМ на 2027 год (Р2)', 'маршрут согласования завершён'],
  [2851, 'АВР+', 'Получены наряд-заказы КРС / ПРС (Б5)', '41 наряд-заказ'],
].map(([mn, who, what, obj], i) => ({ id: i, t: new Date(TODAY.getTime() - mn * 60000), who, what, obj }));

// Справочники: [справочник, записей, версия, обновлён (дней), владелец]
const DICT = [
  ['Месторождения, горизонты и объекты разработки', 412, 9, -12, 'ОМГ · геология и разработка'], ['Фонд и категории скважин', 3412, 31, 0, 'ABAI БД 2.0'],
  ['Типоразмеры ГНО', 386, 14, -1, 'ABAI ПГНО'], ['Виды геолого-технических мероприятий', 64, 6, -40, 'ABAI ПАЭГТМ'], ['Причины простоев и отказов', 118, 8, -21, 'ABAI ТР 2.0'],
  ['Организации и подрядчики', 274, 22, -3, 'ABAI БД 2.0'], ['Объекты наземной инфраструктуры', 1468, 11, -7, 'ABAI Наземная инфраструктура'], ['Виды документов процессов', DOCS.length, 3, -30, 'ABAI БД 2.0'],
].map(([t, n, v, d, o], i) => ({ id: i, t, n, v, d: dAdd(d), o }));

const whenT = (t) => (dFmt(t) === dFmt(TODAY) ? 'сегодня' : dFmt(t) === dFmt(dAdd(-1)) ? 'вчера' : dFmt(t)) + ', ' + tFmt(t);

function DocDrawer({ x, sg, onClose, onSign, toast }) {
  const P = BPMN.find((p) => p.p === x.p);
  const si = P ? P.s.findIndex((s) => s.c === x.c) : -1;
  const nx = si >= 0 ? (P.s[si].nx || []).map((n) => (typeof n[0] === 'number' ? P.s[n[0]] : null)).filter(Boolean)[0] : null;
  const route = [
    { t: 'Документ создан', s: `${x.r} · шаг ${x.c} · ${dFmt(x.date)}`, st: 'done' },
    { t: 'Зарегистрирован в ' + x.sys, s: dFmt(x.date), st: 'done' },
    { t: nx ? `Согласование · ${nx.r} (шаг ${nx.c})` : 'Согласование', s: sg === 'appr' ? 'ожидает решения' : sg === 'draft' ? '' : 'согласовано', st: sg === 'appr' ? 'cur' : sg === 'draft' ? '' : 'done' },
    { t: 'Подписание ЭЦП', s: sg === 'ok' ? 'подписано' : sg === 'sign' ? 'ожидает подписи' : '', st: sg === 'sign' ? 'cur' : sg === 'ok' ? 'done' : '' },
  ];
  return (
    <SideDrawer open onClose={onClose} title={x.name} sub={`${x.id} · версия ${x.ver}${x.fm ? ' · ' + x.fm : ''}`}
      actions={<><Button onClick={() => toast(`Документ «${x.name}» выгружен`)}>Скачать</Button>{(sg === 'sign' || sg === 'appr') && <Button variant="contained" onClick={onSign}>Подписать ЭЦП</Button>}</>}>
      <KV rows={[
        ['Статус', <StatusChip label={SIG[sg][0]} tone={SIG[sg][1]} />],
        ['Процесс', <Link component={RouterLink} to={'/proc/' + encodeURIComponent(x.p)}>{x.p} · {x.pt}</Link>], ['Этап процесса', <span><Code>{x.c}</Code> {x.st}</span>],
        ['Автор', x.r], ['Система хранения', x.sys], ['Направление', DIR[x.m]], ['Используется', `в ${x.n} ${plural(x.n, 'шаге', 'шагах', 'шагах')} процесса`], ['Зарегистрирован', dFmt(x.date)],
      ]} />
      <SecTitle>Маршрут согласования</SecTitle>
      <VTimeline items={route} />
      <SecTitle>Версии</SecTitle>
      <VTimeline items={Array.from({ length: x.ver }, (_, i) => x.ver - i).map((v) => ({ t: `Версия ${v}${v === x.ver ? ' · текущая' : ''}`, s: `${x.r} · ${dFmt(dAdd(-(x.ver - v) * 3, x.date))}`, st: v === x.ver ? 'cur' : 'done' }))} />
    </SideDrawer>
  );
}

export default function Db() {
  const { role, toast, sign } = useApp(); const admin = role.id === 'admin';
  const [tab, setTab] = useState('docs'); const [dir, setDir] = useState('all'); const [st, setSt] = useState('all');
  const [signed, setSigned] = useState({}); const [doc, setDoc] = useState(null); const [cat, setCat] = useState(null);
  const sigOf = (x) => (signed[x.id] ? 'ok' : x.sig);
  const rows = useMemo(() => DOCS.filter((x) => (dir === 'all' || x.m === dir) && (st === 'all' || sigOf(x) === st)), [dir, st, signed]);
  const cnt = (k) => DOCS.filter((x) => (dir === 'all' || x.m === dir) && sigOf(x) === k).length;
  const qi = avg(QUAL.flatMap((x) => x.slice(1)));
  const toSign = DOCS.filter((x) => sigOf(x) === 'sign').length;

  const docCols = [
    { field: 'name', headerName: 'Документ', flex: 2.4, minWidth: 260, renderCell: ({ row }) => <Box><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{row.name}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.id}</Typography></Box> },
    { field: 'p', headerName: 'Процесс', width: 110, valueGetter: (v, row) => `${row.p} ${row.c}`, renderCell: ({ row }) => <Box><ProcLink code={row.p} /> <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{row.c}</Typography></Box> },
    { field: 'r', headerName: 'Автор', flex: 1, minWidth: 150 },
    { field: 'sig', headerName: 'Статус', width: 170, valueGetter: (v, row) => SIG[sigOf(row)][0], renderCell: ({ row }) => <StatusChip label={SIG[sigOf(row)][0]} tone={SIG[sigOf(row)][1]} /> },
    { field: 'date', headerName: 'Дата', width: 105, type: 'date', valueFormatter: (v) => dFmt(v) },
  ];

  return (
    <Box>
      <PageHeader title="Единая база данных ЦД" sys={[['ABAI БД 2.0', 'data']]}
        sub="Скважины, замеры, документы и статусы двойников · данные промысла поступают через КХД"
        actions={<Button variant="contained" onClick={() => toast('Пакет данных принят, проверка при загрузке запущена')}>Загрузить данные</Button>} />
      <KpiRow items={[
        { label: 'Скважин в базе', value: fmt(3412), d: '+6 за месяц' },
        { label: 'Записей за сутки', value: '4,1', unit: 'млн', delta: 3.2, du: '%', good: 'up', d: 'к среднему за неделю' },
        { label: 'Индекс качества данных', value: fmt(qi, 1), unit: '%', delta: 0.6, du: ' п.п.', good: 'up', d: 'за месяц' },
        { label: 'Ожидают подписи ЭЦП', value: fmt(toSign), d: 'документов' },
      ]} />
      <Grid2 cols="2.3fr 1fr">
        <Card sx={{ minWidth: 0 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }} variant="scrollable">
            <Tab value="docs" label="Реестр документов" /><Tab value="cat" label="Каталог данных" /><Tab value="log" label="Журнал изменений" /><Tab value="dict" label="Справочники" />
          </Tabs>
          {tab === 'docs' && (
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, pt: 2, flexWrap: 'wrap', rowGap: 1 }}>
                <Select size="small" value={dir} onChange={(e) => setDir(e.target.value)} sx={{ minWidth: 200, fontSize: 13 }}>
                  <MenuItem value="all">Все направления</MenuItem>{Object.entries(DIR).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
                <Select size="small" value={st} onChange={(e) => setSt(e.target.value)} sx={{ minWidth: 200, fontSize: 13 }}>
                  <MenuItem value="all">Все статусы</MenuItem>{Object.entries(SIG).map(([k, v]) => <MenuItem key={k} value={k}>{v[0]} · {cnt(k)}</MenuItem>)}
                </Select>
                <Typography variant="body2" color="text.secondary">{fmt(rows.length)} {plural(rows.length, 'документ', 'документа', 'документов')}</Typography>
              </Stack>
              <DataTable rows={rows} columns={docCols} search pageSize={10} onRowClick={setDoc} />
            </Box>
          )}
          {tab === 'cat' && (
            <DataTable rows={CAT} pageSize={0} onRowClick={setCat} columns={[
              { field: 't', headerName: 'Объект данных', flex: 1.5, minWidth: 220, renderCell: ({ row }) => <Box><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{row.t}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.s}</Typography></Box> },
              { field: 'n', headerName: 'Записей', type: 'number', width: 110, valueFormatter: (v) => fmtK(v) },
              { field: 'm', headerName: 'За месяц', type: 'number', width: 110, valueFormatter: (v) => '+' + fmtK(v) },
              { field: 'part', headerName: 'Потребитель', width: 150, valueGetter: (v) => PART_T[v], renderCell: ({ row }) => <Stack direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: C.part[row.part] }} /><span>{PART_T[row.part]}</span></Stack> },
            ]} />
          )}
          {tab === 'log' && (
            <DataTable rows={LOG} pageSize={0} columns={[
              { field: 't', headerName: 'Время', width: 140, type: 'dateTime', valueFormatter: (v) => whenT(v) },
              { field: 'what', headerName: 'Событие', flex: 2, minWidth: 260 },
              { field: 'obj', headerName: 'Объект', flex: 1.3, minWidth: 200, renderCell: ({ value }) => <Box sx={{ color: 'text.secondary' }}>{value}</Box> },
              { field: 'who', headerName: 'Источник', width: 190 },
            ]} />
          )}
          {tab === 'dict' && (
            <DataTable rows={DICT} pageSize={0} columns={[
              { field: 't', headerName: 'Справочник', flex: 2, minWidth: 260 },
              { field: 'n', headerName: 'Записей', type: 'number', width: 100, valueFormatter: (v) => fmt(v) },
              { field: 'v', headerName: 'Версия', type: 'number', width: 80 },
              { field: 'd', headerName: 'Обновлён', type: 'date', width: 110, valueFormatter: (v) => dFmt(v) },
              { field: 'o', headerName: 'Владелец', flex: 1.2, minWidth: 180 },
              ...(admin ? [{ field: 'a', headerName: '', width: 140, sortable: false, filterable: false, renderCell: ({ row }) => <Button size="small" onClick={() => toast(`Справочник «${row.t}» открыт на редактирование (версия ${row.v + 1}, черновик)`)}>Редактировать</Button> }] : []),
            ]} />
          )}
        </Card>
        <Section title="Качество данных" sub="30 суток, по доменам"
          info="Индекс — среднее полноты, достоверности и своевременности. Норма — от 95%, допустимо — 85–95%, ниже 85% — требует внимания. Проверка — при загрузке в КХД и ежесуточно; замечания направляются источникам данных (Д1).">
          <Stack spacing={1.75}>
            {QUAL.map((r) => {
              const v = avg(r.slice(1)); const mn = Math.min(...r.slice(1)); const weak = ['полнота', 'достоверность', 'своевременность'][r.slice(1).indexOf(mn)];
              return (
                <Tooltip key={r[0]} placement="left" title={`Полнота ${fmt(r[1], 1)}% · достоверность ${fmt(r[2], 1)}% · своевременность ${fmt(r[3], 1)}%`}>
                  <Box sx={{ fontSize: 13 }}>
                    <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.5 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>{r[0]}</Box>
                      <Box sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(v, 1)}%</Box>
                    </Stack>
                    <Meter v={v} tone={qTone(v)} h={6} />
                    {mn < 85 && <Typography sx={{ fontSize: 12, color: 'warning.main', mt: 0.5 }}>{weak} — {fmt(mn, 1)}%</Typography>}
                  </Box>
                </Tooltip>
              );
            })}
          </Stack>
        </Section>
      </Grid2>
      {doc && <DocDrawer x={doc} sg={sigOf(doc)} toast={toast} onClose={() => setDoc(null)}
        onSign={() => sign(`Документ «${doc.name}», версия ${doc.ver} (${doc.p}, шаг ${doc.c}).`, () => { setSigned({ ...signed, [doc.id]: 1 }); setDoc(null); toast('Документ подписан ЭЦП и зарегистрирован в ABAI БД 2.0'); })} />}
      {cat && (
        <SideDrawer open onClose={() => setCat(null)} title={cat.t} sub={cat.s}>
          <KV rows={[['Записей', fmt(cat.n)], ['Прирост за месяц', '+' + fmt(cat.m)], ['Источник', cat.src], ['Потребитель', PART_T[cat.part]], ['Хранение', 'ABAI БД 2.0']]} />
        </SideDrawer>
      )}
    </Box>
  );
}
