import { useContext } from 'react';
// О системе: архитектура ЦД Актива и ИМА (сл. 14, 34, 54–56), этапы Upstream и процессы, дорожная карта, ролевая модель — по вкладкам.
import { useState } from 'react';
import { Box, Card, Typography, Stack, Link, Tabs, Tab, Tooltip } from '@mui/material';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import { PageHeader, Section , DemoCtx } from '../components/ui.jsx';
import DataTable from '../components/DataTable.jsx';
import { ProcLinks } from './data/_shared.jsx';
import { ROLES, BPMN, NOUN } from '../data/core.js';
import { tasksFor } from '../data/exec.js';
import { useApp } from '../state.jsx';
import { C } from '../theme.js';
import { sum } from '../lib/format.js';

// Части ЦД Актива (по TW_DEF, abai-mockup/shared/twin.js): модули [название, продукт Nedra, функция, источник]
const PARTS = [
  { id: 'data', t: 'Единые данные ЦД', c: C.part.data,
    lead: 'Сквозной слой для всех двойников: данные промысла собираются в КХД и хранятся в ABAI БД 2.0; внешние системы — через интеграции КХД.',
    mods: [['КХД', 'Nedra.DATA', 'Слой бизнес-интеграций; собственная разработка КМГ — единый слой хранения, обработки и аналитики данных для автоматизированного обмена между службами', 'сл. 3, 34'], ['ABAI БД 2.0', '', 'Единая база ЦД Актива на модулях ABAI: скважины, замеры, документы, статусы и уведомления', 'сл. 54']] },
  { id: 'skv', t: 'ЦД скважины', c: C.part.skv,
    lead: 'Конструкция и режимы работы скважины: дебиты, ограничения ГНО; строительство скважины и ремонты.',
    mods: [['ABAI Цифровое бурение', 'Nedra.RTM', 'Модули «Сводки» и «Онлайн-мониторинг» — в офисе и на буровой; WITSML-сервер и клиент, данные реального времени', 'сл. 55'], ['ABAI Цифровой мониторинг ТКРС', 'Nedra.WWO', 'Нормы времени, КР / ТР, ПЗ / ПР; ролевая модель согласования наряд-заказов и планов работ', 'сл. 55']] },
  { id: 'plast', t: 'ЦД пласта', c: C.part.plast,
    lead: 'Давление, насыщенность, закачка; приток и обводнённость. Основа — постоянно действующая геолого-гидродинамическая модель.',
    mods: [['ABAI ЦРНС 2.0', 'Nedra.NUMEX', 'Подбор системы разработки, размещение и заканчивание скважин, серийные оптимизационные расчёты и автоадаптация на историю', 'сл. 24–28'], ['ABAI УЗ 2.0', 'Nedra.NUMEX Optimize', 'Подбор оптимальных режимов скважин на ГДМ для увеличения NPV и КИН, оптимизация заводнения', 'сл. 29–31'], ['ABAI ПАЭГТМ', '', 'Планирование, экономика и анализ эффективности геолого-технических мероприятий', 'BPMN Р2, Д5']] },
  { id: 'dob', t: 'ЦД добычи и наземной инфраструктуры', c: C.part.dob,
    lead: 'Сбор, транспортировка и сдача; пропускная способность и мощности; добыча, потенциал и мероприятия.',
    mods: [['ABAI ПДИМ 2.0', 'Nedra.DIGITAL TWIN', 'Конфигурация технологических расчётов, структур данных, пользовательских экранов и специальных расчётов', 'сл. 55'], ['ABAI ПДИМ 2.0 · целостность трубопроводов', 'Nedra.DIGITAL TWIN Pipe', 'Обучение ML-моделей', 'сл. 56'], ['ABAI Наземная инфраструктура', 'Nedra.INFRAPLAN', 'Построение моделей инфраструктуры, расчёт технологических и экономических кейсов', 'сл. 55'], ['ABAI ТР 2.0', '', 'Технологический режим и отклонения скважин', 'BPMN Д2, Д9'], ['ABAI ПГНО', '', 'Подбор погружного оборудования', 'BPMN Д6']] },
];
// Интегрированная модель актива (сл. 14)
const IMA = [
  ['ЦД скважины', C.part.skv, 'конструкция, режимы работы'],
  ['режимы, дебиты, ограничения ГНО ⇄ приток, пластовое давление, обводнённость'],
  ['ЦД пласта', C.part.plast, 'давление, насыщенность, закачка'],
  ['от скважины: режимы и дебиты ⇄ пропускная способность, мощности, возможности сдачи'],
  ['ЦД добычи и наземной инфраструктуры', C.part.dob, 'сбор, транспортировка, сдача'],
];
// Рабочий стол роли (главная) — по типу роли
const DESK = { kmg: 'Сводка по ДЗО, согласования программ и профиля', kmgi: 'Очередь экспертиз и состояние двойников', dzo: 'Объекты и отклонения ДЗО, состояние двойников', geo: 'Модели, точки бурения, программа ГТМ', nipi: 'Очередь проектных и модельных работ', drill: 'Буровые, освоение, бригады ВСР', cits: 'Суточная добыча, отклонения, мехфонд', contr: 'Рапорты, полевые данные, наряд-заказы (отдельное меню)', admin: 'Интеграции КХД, качество данных, состояние двойников' };

// Этапы Upstream (сл. 3; соответствие процессов этапам — по разбору BPMN)
const STAGES = [
  { t: 'ГРР и перспективное планирование', goal: 'Коэффициент восполнения ресурсной базы', hor: '25+ лет', procs: ['Г1', 'Г3', 'Г3.1', 'Г3.2', 'Г3.3'] },
  { t: 'Геология и разработка', goal: 'Стратегия разработки с оптимальными NPV и КИН', hor: 'до 5 лет', procs: ['Г3.4', 'Р1', 'Р2', 'Р3', 'Р4'] },
  { t: 'Техническая политика', goal: 'Оптимальное соотношение плана по добыче и CAPEX', hor: 'до 3 лет', procs: ['Б1', 'Д8'] },
  { t: 'Строительство скважины', goal: 'Дополнительная добыча от достижения потенциала ПЦСС', hor: 'внутри года', procs: ['Б1', 'Б2', 'Б3', 'Б4', 'Б5'] },
  { t: 'Управление добычей', goal: 'Максимальное соотношение факта по добыче и OPEX', hor: 'внутри года', procs: ['Д1', 'Д2', 'Д3', 'Д4', 'Д5', 'Д6', 'Д7', 'Д9'] },
].map((x, i) => ({ id: i, ...x }));
const CROSS = [
  ['Интегрированное моделирование на уровне ДЗО', 'синхронизация подземной и наземной части (скважина, пласт, труба); цикл от 1 года до 20+ лет', ['Д4']],
  ['Целостность и надёжность (ЦИН)', 'сквозной процесс на уровне ДЗО', ['Д8']],
  ['Производственное планирование', 'синхронизация данных для сборки и утверждения бизнес-плана; ежегодно', ['Р2', 'Р3']],
  ['Инвестиционная политика', 'инвестиционное планирование, мониторинг исполнения и пост-инвест анализ', ['Д5']],
].map(([t, d, procs], i) => ({ id: i, t, d, procs }));
// Дорожная карта внедрения (Восточный Молдабек, октябрь 2026 – январь 2027)
const ROAD = [
  ['ЦД скважины', 'ABAI Цифровое бурение (сводки, онлайн-мониторинг, WITSML, данные реального времени); ABAI Цифровой мониторинг ТКРС', 'сл. 55'],
  ['ЦД пласта', 'Адаптация системы под оставшиеся пласты с учётом ГДМ, настройка налоговой базы; настройка и создание проектов', 'сл. 55'],
  ['ЦД добычи и наземного обустройства', 'ABAI ПДИМ 2.0; ABAI Наземная инфраструктура; ПДИМ 2.0 · целостность трубопроводов', 'сл. 55–56'],
  ['Сквозной слой', 'Слой данных ЦД, интеграции, внедрение ЦД Актива', 'сл. 56'],
].map(([t, w, s], i) => ({ id: i, t, w, s }));
const MOCK = 'https://znewk.github.io/abai-mockup/';
const LINKS = [['Мокапы процессов Upstream', MOCK], ['Дерево ЦД Актива', MOCK + 'tree/index.html'], ['Процессы Upstream: AS IS → Dream TO BE', MOCK + 'present/index.html']];

function Architecture() {
  const demo = useContext(DemoCtx);
  return (
    <>
      <Section title="Архитектура ЦД Актива" sub="части ЦД и модули ABAI" sx={{ mb: 2 }}
        info="По стратсессии, сл. 14, 34, 54–56. В скобках — продукт Nedra в той же роли. Наведите на модуль — его функции и источник.">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          {PARTS.map((p) => (
            <Box key={p.id} sx={{ border: '1px solid', borderColor: 'divider', borderTop: `3px solid ${p.c}`, borderRadius: 2, p: 1.75 }}>
              <Typography sx={{ fontSize: 14.5, fontWeight: 600 }}>{p.t}</Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.75, mb: 1.25 }}>{p.lead}</Typography>
              {p.mods.map(([n, alt, f, s]) => (
                <Tooltip key={n} title={demo ? `${f} · ${s}` : f} placement="top-start">
                  <Box sx={{ borderTop: '1px solid #eef1f5', py: 0.75, fontSize: 13, cursor: 'help' }}>
                    <b style={{ fontWeight: 600 }}>{n}</b>{demo && alt && <Box component="span" sx={{ color: '#6d28d9' }}> ({alt})</Box>}
                  </Box>
                </Tooltip>
              ))}
            </Box>
          ))}
        </Box>
      </Section>
      <Section title="Интегрированная модель актива" sub="что синхронизируется между двойниками"
        info="Сл. 14. Связи без указания направления в источнике показаны как двусторонние. Процесс ИМА — Д4.">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.2fr 1fr 1.2fr 1fr' }, alignItems: 'center', gap: 1 }}>
          {IMA.map((x, i) => (x.length === 3
            ? <Box key={i} sx={{ border: '1px solid', borderColor: 'divider', borderTop: `3px solid ${x[1]}`, borderRadius: 2, p: 1.5, textAlign: 'center' }}><Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{x[0]}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{x[2]}</Typography></Box>
            : <Box key={i} sx={{ textAlign: 'center', px: 1, fontSize: 12, color: 'text.secondary' }}><Box sx={{ fontSize: 18, color: C.axis, lineHeight: 1 }}>⇄</Box>{x[0]}</Box>))}
        </Box>
        {demo && <Stack direction="row" spacing={2.5} sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid #eef1f5', flexWrap: 'wrap', rowGap: 1, fontSize: 13 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Связанные материалы:</Typography>
          {LINKS.map(([t, h]) => <Link key={t} href={h} target="_blank" rel="noopener" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{t}<OpenInNewRounded sx={{ fontSize: 14 }} /></Link>)}
        </Stack>}
      </Section>
    </>
  );
}

export default function About() {
  const [tab, setTab] = useState('arch'); const demo = useContext(DemoCtx); const { runs } = useApp();
  const nouns = (r) => [...new Set(BPMN.filter((P) => P.s.some((s) => r.lane(P.p, s.r))).map((P) => NOUN[P.p]).filter(Boolean))];
  const active = (codes) => runs.filter((x) => codes.includes(x.p) && x.status === 'active');
  const steps = (r) => sum(BPMN.map((P) => P.s.filter((s) => r.lane(P.p, s.r)).length));
  return (
    <Box>
      <PageHeader title="О системе" sub="ЦД Актива на базе ABAI · от операционного уровня ДЗО до корпоративного центра" />
      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab value="arch" label="Архитектура" /><Tab value="stages" label="Этапы и процессы" /><Tab value="road" label="Дорожная карта" /><Tab value="roles" label="Роли" />
        </Tabs>
      </Card>
      {tab === 'arch' && <Architecture />}
      {tab === 'stages' && (
        <>
          <Section title="Этапы Upstream" sub="цель, горизонт и процессы" flush sx={{ mb: 2 }}
            info="Цели и горизонты этапов — стратсессия, сл. 3; соответствие процессов этапам — по разбору BPMN Dream TO BE.">
            <DataTable rows={STAGES} pageSize={0} disableColumnSorting columns={[
              { field: 't', headerName: 'Этап', flex: 1.2, minWidth: 220 },
              { field: 'goal', headerName: 'Цель', flex: 1.4, minWidth: 240 },
              { field: 'hor', headerName: 'Горизонт', width: 110 },
              { field: 'procs', headerName: 'Процессы', flex: 1.4, minWidth: 260, sortable: false, renderCell: ({ row }) => <ProcLinks codes={row.procs} /> },
              { field: 'runs', headerName: 'В работе', flex: 1.3, minWidth: 220, sortable: false, valueGetter: (v, row) => active(row.procs).length, renderCell: ({ row }) => { const a = active(row.procs); const by = [...new Set(a.map((x) => NOUN[x.p]))]; return a.length ? <Box><b>{a.length}</b><Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}> · {by.slice(0, 3).join(', ').toLowerCase()}{by.length > 3 ? ' …' : ''}</Typography></Box> : <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>записей в работе нет</Typography>; } },
            ]} />
          </Section>
          <Section title="Сквозные процессы" flush>
            <DataTable rows={CROSS} pageSize={0} disableColumnSorting columns={[
              { field: 't', headerName: 'Процесс', flex: 1.2, minWidth: 240 },
              { field: 'd', headerName: 'Содержание', flex: 2, minWidth: 300, renderCell: ({ value }) => <Box sx={{ color: 'text.secondary' }}>{value}</Box> },
              { field: 'procs', headerName: 'Процессы', width: 120, sortable: false, renderCell: ({ row }) => <ProcLinks codes={row.procs} /> },
            ]} />
          </Section>
        </>
      )}
      {tab === 'road' && (
        <Section title="Дорожная карта внедрения" sub="Восточный Молдабек · октябрь 2026 – январь 2027" flush info="Стратсессия, сл. 55–56.">
          <DataTable rows={ROAD} pageSize={0} disableColumnSorting columns={[
            { field: 't', headerName: 'Направление', width: 300 },
            { field: 'w', headerName: 'Состав работ', flex: 1, minWidth: 360 },
            ...(demo ? [{ field: 's', headerName: 'Источник', width: 110, renderCell: ({ value }) => <Box sx={{ color: '#6d28d9' }}>{value}</Box> }] : []),
          ]} />
        </Section>
      )}
      {tab === 'roles' && (
        <Section title="Ролевая модель" sub="9 ролей по участникам процессов · вход выбором роли" flush info="Роли соответствуют дорожкам BPMN Dream TO BE; число этапов — шаги в дорожках роли. Полевая роль цеха не вводится.">
          <DataTable rows={ROLES.map((r) => ({ ...r, n: steps(r), tk: tasksFor(r, runs).length, nouns: nouns(r), desk: DESK[r.id] }))} pageSize={0} columns={[
            { field: 'short', headerName: 'Роль', flex: 1.3, minWidth: 240, renderCell: ({ row }) => <Box><Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.short}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.name} · {row.org}</Typography></Box> },
            { field: 'level', headerName: 'Уровень', width: 190 },
            { field: 'desc', headerName: 'Функции в системе', flex: 2, minWidth: 300, renderCell: ({ row }) => <Box><Box sx={{ color: 'text.secondary' }}>{row.desc}</Box><Typography sx={{ fontSize: 12, mt: 0.5 }}>Рабочий стол: {row.desk}</Typography></Box> },
            { field: 'nouns', headerName: 'С чем работает', flex: 1.6, minWidth: 240, sortable: false, valueGetter: (v) => v.join(', '), renderCell: ({ row }) => <Typography sx={{ fontSize: 12.5 }}>{row.nouns.length ? row.nouns.join(', ') : 'интеграции КХД, справочники, права доступа, качество данных'}</Typography> },
            { field: 'tk', headerName: 'Задач сейчас', type: 'number', width: 110 },
            { field: 'n', headerName: 'Этапов в процессах', type: 'number', width: 120, valueFormatter: (v) => (v ? v : 'вне процессов') },
          ]} />
        </Section>
      )}
    </Box>
  );
}
