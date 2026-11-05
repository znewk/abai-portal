// Главная — рабочий стол роли. Порядок чтения: что ждёт моего решения (просрочено · сегодня · на неделе) →
// показатели и объекты роли → лента событий; состояние двойников — у ДДНГ, КМГИ и администратора данных.
import { Box, Button, List, ListItemButton, Stack, Typography, Card } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useApp } from '../state.jsx';
import { PageHeader, KpiRow, Section, Grid2, StatusChip, Meter, Hbars } from '../components/ui.jsx';
import { TrendChart, BarsChart } from '../components/charts.jsx';
import { PROD, WELLS, ALERTS, TWINS, ASSETS, OBJECTS, W_ST } from '../data/core.js';
import { taskPath, dueText, nowDemo, runTitle, runPath, runsOf, objOf, stepKind } from '../data/exec.js';
import { notifsFor } from '../data/notify.js';
import { fmt, pct, sgn, sum, last, dShort, dRel, dFmt, tFmt, plural, series, dayLabels, TODAY } from '../lib/format.js';
import { C } from '../theme.js';
import { TONE } from '../components/ui.jsx';
import { DRILL } from './skv/drill.data.js';
import { PL_EZ, PL_EZ_T, PL_GTM } from './plast/_shared.jsx';

const dev = (f, p) => ((f - p) / p) * 100;
const TYPE = { kmg: 'manager', dzo: 'manager', geo: 'manager', drill: 'manager', kmgi: 'expert', nipi: 'expert', cits: 'operator', contr: 'operator', admin: 'operator' };

// ===== Показатели роли (не более четырёх) =====
function kpiSet(roleId, P, tasks, runs) {
  const f = last(P.fact), p = P.plan[PROD.nF - 1];
  const openA = ALERTS.filter((a) => a.st !== 'Устранено');
  const prodW = WELLS.filter((w) => w.type === 'prod' && w.status !== 'plan'); const work = prodW.filter((w) => w.status === 'work').length;
  const K = {
    oil: { label: 'Добыча нефти за сутки', value: fmt(f), unit: 'т', delta: dev(f, p), du: '%', good: 'up', d: 'к плану', spark: P.fact.slice(-14), to: '/m/dob/p/Д1' },
    liq: { label: 'Добыча жидкости за сутки', value: fmt(last(P.liq)), unit: 'м³', d: 'обводнённость ' + pct(last(P.wc)), to: '/m/dob/p/Д1' },
    fund: { label: 'Коэффициент эксплуатации', value: pct((work / prodW.length) * 100), d: `${work} из ${prodW.length} скважин в работе`, to: '/m/skv/wells' },
    alerts: { label: 'Отклонения от режима', value: fmt(openA.length), d: 'потери ' + fmt(sum(openA.map((a) => a.loss)), 1) + ' т/сут', to: '/m/dob/p/Д2' },
    gtm: { label: 'Эффект ГТМ с начала года', value: '412,6', unit: 'тыс. т', delta: 3.4, du: '%', good: 'up', d: 'к программе', to: '/m/plast/p/Р2' },
    pp: { label: 'Выполнение ПП', value: '99,1', unit: '%', delta: -0.9, du: ' п.п.', good: 'up', d: 'с начала года', to: '/reports' },
    gdm: { label: 'Адаптация ГДМ', value: '92', unit: '%', d: 'ГДМ Узень v.2026.3', to: '/m/plast' },
    pts: { label: 'Проектные точки бурения', value: '16', d: '8 кандидатов · 4 в ковре', to: '/m/plast/p/Г3.4' },
    comp: { label: 'Компенсация отбора', value: '104,2', unit: '%', delta: 1.8, du: ' п.п.', good: 'up', d: 'за месяц', to: '/m/plast/p/Р4' },
    ez: { label: 'Элементы с неэффективной закачкой', value: fmt(PL_EZ.filter((e) => e.tone === 'crit').length), d: `из ${PL_EZ.length} элементов`, to: '/m/plast/p/Р4' },
    drill: { label: 'Скважин в бурении', value: fmt(DRILL.length), d: `${DRILL.filter((d) => d.bh - d.bhPlan < -20).length} с забоем ниже плана`, to: '/m/skv/p/Б3' },
    npv: { label: 'Непроизводительное время', value: '6,3', unit: '%', delta: -1.1, du: ' п.п.', good: 'down', d: 'за месяц', to: '/m/skv/p/Б3' },
    osv: { label: 'Скважин в освоении', value: fmt(WELLS.filter((w) => w.status === 'osv').length), d: 'по программе', to: '/m/skv/p/Б4' },
    brig: { label: 'Бригады ВСР в работе', value: '23 / 27', d: '2 в простое', to: '/m/skv/p/Б5' },
    khd: { label: 'Интеграции без ошибок', value: '12 / 14', d: 'сбой обмена АВР+', to: '/m/data/khd' },
    dq: { label: 'Качество данных', value: '96,4', unit: '%', delta: 0.6, du: ' п.п.', good: 'up', d: 'за неделю', to: '/m/data' },
    docs: { label: 'Документов на подписании', value: '14', to: '/m/data' },
    rep: { label: 'Суточные рапорты', value: `${DRILL.length - 1} / ${DRILL.length}`, d: `загружены за ${dFmt(TODAY).slice(0, 5)}`, to: '/m/skv/p/Б3' },
    exch: { label: 'Обмен через КХД за сутки', value: '1,92', unit: 'млн записей', delta: 2.1, du: '%', good: 'up', d: 'к средней за неделю', to: '/m/data/khd' },
    exp: { label: 'На экспертизе', value: fmt(tasks.filter((t) => t.s && ['expert', 'approve'].includes(stepKind(t.s))).length), d: 'документов и расчётов', to: '/tasks' },
    models: { label: 'Модели в работе', value: fmt(runs.filter((r) => ['Г3.4', 'Р1'].includes(r.p) && r.status === 'active').length), d: 'геологические и ГДМ', to: '/m/plast' },
  };
  const set = { kmg: ['oil', 'pp', 'gtm', 'liq'], kmgi: ['exp', 'gtm', 'gdm', 'oil'], dzo: ['oil', 'liq', 'fund', 'alerts'], geo: ['ez', 'comp', 'pts', 'gdm'], nipi: ['models', 'pts', 'gdm', 'comp'],
    drill: ['drill', 'npv', 'osv', 'brig'], cits: ['oil', 'alerts', 'fund', 'liq'], contr: ['rep', 'drill', 'osv', 'brig'], admin: ['khd', 'dq', 'docs', 'exch'] }[roleId];
  return set.map((k) => K[k]);
}

function Row({ tone, title, meta, right, onClick }) {
  return (
    <ListItemButton onClick={onClick} sx={{ borderRadius: 0, px: 2, py: 1, gap: 1.5, alignItems: 'flex-start', borderTop: '1px solid #f0f2f5' }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.35 }}>{title}</Typography>
        {meta && <Typography component="div" sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{meta}</Typography>}
      </Box>
      <Box sx={{ flex: 'none', textAlign: 'right' }}>{right}{tone && <Box sx={{ mt: 0.25 }}><StatusChip tone={tone[0]} label={tone[1]} /></Box>}</Box>
    </ListItemButton>
  );
}

// ===== Ждёт моего решения: просрочено · сегодня · на неделе =====
function Decisions({ tasks }) {
  const nav = useNavigate(); const now = nowDemo(); const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = (t) => (!t.due ? 'later' : t.due < now ? 'late' : (t.due - d0) / 864e5 < 1 ? 'today' : (t.due - d0) / 864e5 < 7 ? 'week' : 'later');
  const cols = [['late', 'Просрочено', 'crit'], ['today', 'Сегодня', 'warn'], ['week', 'На этой неделе', 'info'], ['later', 'Позже', '']];
  const by = Object.fromEntries(cols.map(([k]) => [k, tasks.filter((t) => b(t) === k).sort((a, b2) => (a.due || 0) - (b2.due || 0))]));
  const shown = cols.filter(([k]) => by[k].length || k !== 'later').slice(0, 3);
  return (
    <Card sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 1.5, pb: 1 }}><Typography variant="h6" sx={{ flex: 1 }}>Ждёт моего решения</Typography><Button size="small" onClick={() => nav('/tasks')}>Все задачи · {tasks.length} →</Button></Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: `repeat(${shown.length}, 1fr)` }, borderTop: '1px solid #f0f2f5' }}>
        {shown.map(([k, t, tone], ci) => (
          <Box key={k} sx={{ borderLeft: ci ? '1px solid #f0f2f5' : 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1 }}><StatusChip tone={by[k].length ? tone : ''} label={t} sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '.04em' }} /><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{by[k].length}</Typography></Stack>
            {by[k].length ? by[k].slice(0, 4).map((x) => (
              <Row key={x.id} title={x.t} onClick={() => nav(taskPath(x))} meta={<>{x.title || x.pt}{x.rework ? <Box component="span" sx={{ color: 'warning.dark', fontWeight: 600 }}> · на доработке</Box> : null}</>}
                right={<Typography sx={{ fontSize: 12, fontWeight: k === 'late' ? 600 : 400, color: k === 'late' ? 'error.main' : 'text.secondary', whiteSpace: 'nowrap' }}>{x.due ? dueText(x.due, now) : ''}</Typography>} />))
              : <Typography sx={{ px: 2, py: 2, fontSize: 13, color: 'text.secondary' }}>{k === 'late' ? 'Просроченных задач нет' : k === 'today' ? 'На сегодня задач нет — ближайшие сроки в соседней колонке' : k === 'week' ? 'Задач на неделю нет' : 'Задач с более поздним сроком нет'}</Typography>}
            {by[k].length > 4 && <Typography sx={{ px: 2, py: 1, fontSize: 12, color: 'text.secondary' }}>и ещё {by[k].length - 4}</Typography>}
          </Box>))}
      </Box>
    </Card>
  );
}

// ===== Главный график роли =====
function MainChart({ roleId, P, asset }) {
  const nav = useNavigate();
  const open = (to, l) => <Button size="small" onClick={() => nav(to)}>{l}</Button>;
  if (['kmg', 'dzo', 'cits'].includes(roleId)) {
    const n0 = PROD.nF - 1; const from = PROD.nF - 21; const at = (a, i) => (i === n0 ? P.fact[n0] : i > n0 ? a[i - PROD.nF] : null);
    const data = PROD.labels.map((x, i) => ({ x, fact: i < PROD.nF ? P.fact[i] : null, plan: P.plan[i], fc: at(P.fc, i), lo: at(P.lo, i), hi: at(P.hi, i) })).slice(from, PROD.nF + 10);
    return (
      <Section title="Добыча нефти" sub={`${ASSETS.find((a) => a.id === asset).name} · 20 суток факта и прогноз на 10 суток, т/сут`} action={open('/m/dob/p/Д1', 'Суточная сводка →')}
        info="Факт и план — ABAI ПДИМ 2.0; прогноз — по режимам ТР 2.0 и потенциалу (Д3).">
        <TrendChart data={data} height={240} unit="т" fcFrom={PROD.labels[n0]} fcLabel="Прогноз" xInterval={3}
          series={[{ key: 'fact', name: 'Факт', color: C.s[0] }, { key: 'plan', name: 'План', color: C.ink2, dash: true, width: 1.5 }, { key: 'fc', name: 'Прогноз', color: C.s[0], dash: true }]} band={{ lo: 'lo', hi: 'hi', name: 'Коридор P10–P90' }} />
      </Section>
    );
  }
  if (['geo', 'nipi', 'kmgi'].includes(roleId)) {
    const yrs = ['2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031'];
    const fact = [5.24, 5.18, 5.12, 5.06, 5.01]; const base = [4.86, 4.71, 4.57, 4.43, 4.30]; const opt = [4.98, 4.92, 4.85, 4.77, 4.69];
    const data = yrs.map((x, i) => ({ x, fact: i <= 4 ? fact[i] : null, base: i === 4 ? 5.01 : i > 4 ? base[i - 5] : null, opt: i === 4 ? 5.01 : i > 4 ? opt[i - 5] : null }));
    return (
      <Section title="Прогноз добычи по ГДМ" sub="Месторождение Узень, млн т в год" action={open('/m/plast', 'ЦД пласта →')} info="Расчёт на ГДМ Узень v.2026.3 (ABAI ЦРНС 2.0); оптимизация заводнения — ABAI УЗ 2.0.">
        <TrendChart data={data} height={240} unit="млн т" dd={2} fcFrom="2026" fcLabel="Прогноз" series={[{ key: 'fact', name: 'Факт', color: C.s[0] }, { key: 'base', name: 'Базовый вариант', color: C.s[1], dash: true }, { key: 'opt', name: 'С оптимизацией заводнения', color: C.s[2], dash: true }]} />
      </Section>
    );
  }
  if (['drill', 'contr'].includes(roleId)) {
    const m = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const plan = [8, 9, 10, 11, 12, 12, 13, 13, 12, 12, 11, 10]; const fact = [7, 9, 9, 11, 12, 11, 13, 14, 12, 11, 3, null];
    return (
      <Section title="Ввод скважин из бурения" sub="2026 год, скважин в месяц" action={open('/m/skv/p/Б3', 'Бурение →')} info="План — производственная программа ДЗО (Б1 1.2); факт — ABAI Цифровое бурение и БД 2.0.">
        <BarsChart data={m.map((x, i) => ({ x, fact: fact[i], plan: plan[i] }))} height={240} unit="скв." series={[{ key: 'fact', name: 'Факт', color: C.s[0] }]} plan={{ key: 'plan', name: 'План ПП' }} />
      </Section>
    );
  }
  const d = series('khd-vol', 30, 1.84e6, 0.05, 0.08).map((v) => Math.round(v));
  return (
    <Section title="Обмен данными через КХД" sub="записей в сутки, 30 суток" action={open('/m/data/khd', 'Интеграции →')}>
      <BarsChart data={dayLabels(30).map((x, i) => ({ x, v: d[i] }))} height={240} series={[{ key: 'v', name: 'Записей', color: C.s[0] }]} legend={false} />
    </Section>
  );
}

// ===== Объекты роли: отклонения, буровые, элементы, модели, ДЗО =====
function Objects({ role, runs }) {
  const nav = useNavigate();
  if (role.id === 'kmg') return (
    <Section title="Добыча по ДЗО за сутки" flush action={<Button size="small" onClick={() => nav('/reports')}>Сводка →</Button>}>
      <List disablePadding>{['omg', 'emg'].map((id) => { const P = PROD[id]; const a = ASSETS.find((x) => x.id === id); const f = last(P.fact), p = P.plan[PROD.nF - 1]; const d = dev(f, p); return (
        <Row key={id} title={a.name} meta={`план ${fmt(p)} т · обводнённость ${pct(last(P.wc))}`} onClick={() => nav('/reports')}
          right={<><Typography sx={{ fontSize: 14, fontWeight: 600 }}>{fmt(f)} т</Typography><Typography sx={{ fontSize: 12, fontWeight: 600, color: d < 0 ? 'error.main' : 'success.main' }}>{sgn(d, 1)}%</Typography></>} />); })}
        <Row title="Программа ГТМ на 2027 год" meta="расчёт эффекта на согласовании КазНИПИ и КМГИ" tone={['info', 'На согласовании']} onClick={() => nav('/m/plast/obj/' + encodeURIComponent('prog:gtm-2027'))} />
      </List>
    </Section>);
  if (['dzo', 'cits'].includes(role.id)) {
    const list = ALERTS.filter((a) => a.st !== 'Устранено').slice(0, 6);
    return (
      <Section title="Отклонения от режима" sub={`${list.length} открытых · потери ${fmt(sum(list.map((a) => a.loss)), 1)} т/сут`} flush action={<Button size="small" onClick={() => nav('/m/dob/p/Д2')}>Все →</Button>}>
        <List disablePadding>{list.map((a) => { const r = runsOf(runs, 'w:' + a.well).find((x) => x.status === 'active'); return (
          <Row key={a.id} title={`${a.t} · ${a.well}`} meta={`${a.ngdu} · ${dShort(a.since)} ${tFmt(a.since)}${r ? ` · ${runTitle(r)}: ${r.lanes.join(', ')}` : ''}`} tone={[a.tone, a.st]} onClick={() => nav('/m/skv/wells/' + encodeURIComponent(a.well))}
            right={a.loss ? <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'error.main' }}>−{fmt(a.loss, 1)} т/сут</Typography> : null} />); })}</List>
      </Section>);
  }
  if (role.id === 'geo') {
    const els = PL_EZ.filter((e) => e.tone !== 'good').slice(0, 5); const cands = PL_GTM.filter((x) => x.st0 === 'cand').length;
    return (
      <Section title="Элементы заводнения и кандидаты ГТМ" flush action={<Button size="small" onClick={() => nav('/m/plast/p/Р4')}>Оптимизация ППД →</Button>}>
        <List disablePadding>{els.map((e) => <Row key={e.id} title={`Элемент ${e.id} · ${e.c.id}`} meta={`компенсация ${e.comp} % · ${fmt(e.eff, 1)} т на 1 000 м³`} tone={[e.tone, PL_EZ_T[e.tone]]} onClick={() => nav('/m/plast/obj/' + encodeURIComponent('ez:' + e.id))} />)}
          <Row title={`Кандидаты ГТМ: ${cands} на рассмотрении`} meta="Программа ГТМ на 2027 год · ABAI ПАЭГТМ" onClick={() => nav('/m/plast/p/Р2')} /></List>
      </Section>);
  }
  if (['nipi', 'kmgi'].includes(role.id)) {
    const objs = OBJECTS.filter((o) => ['model', 'profile', 'program', 'seis'].includes(o.kind)).map((o) => ({ o, r: runsOf(runs, o.id).find((x) => x.status === 'active') })).filter((x) => x.r).slice(0, 6);
    return (
      <Section title="Модели, программы и отчёты в работе" flush>
        <List disablePadding>{objs.map(({ o, r }) => <Row key={o.id} title={o.name} meta={`${runTitle(r)} · ${r.P.s[r.active[0].i].t} · ${r.lanes.join(', ')}`} tone={r.late ? ['crit', dueText(r.worst)] : ['info', dueText(r.worst)]} onClick={() => nav(runPath(r))} />)}</List>
      </Section>);
  }
  if (['drill', 'contr'].includes(role.id)) return (
    <Section title="Буровые и освоение" flush action={<Button size="small" onClick={() => nav('/m/skv/p/Б3')}>Бурение →</Button>}>
      <List disablePadding>
        {DRILL.map((d) => { const lag = d.bh - d.bhPlan; const r = runsOf(runs, 'w:' + d.id).find((x) => x.p === 'Б3' && x.status === 'active'); return <Row key={d.id} title={`${d.id} · ${d.rig}`} meta={`${d.ctr} · забой ${fmt(d.bh)} м из ${fmt(d.depth)} · сутки ${d.cur} из ${d.days}${r && r.late ? ' · срок шага нарушен' : ''}`} tone={lag < -20 ? ['warn', `Ниже плана на ${fmt(-lag)} м`] : ['good', 'В пределах плана']} onClick={() => (role.limited && r ? nav(runPath(r)) : nav('/m/skv/wells/' + encodeURIComponent(d.id)))} />; })}
        {WELLS.filter((w) => w.status === 'osv').map((w) => { const r = runsOf(runs, 'w:' + w.id).find((x) => x.p === 'Б4' && x.status === 'active'); return <Row key={w.id} title={`${w.id} · освоение`} meta={r ? `${r.P.s[r.active[0].i].t} · ${r.lanes.join(', ')}` : w.ngdu} tone={['info', W_ST[w.status][0]]} onClick={() => (r ? nav(runPath(r)) : nav('/m/skv/wells/' + encodeURIComponent(w.id)))} />; })}
      </List>
    </Section>);
  return (
    <Section title="Интеграции и качество данных" flush action={<Button size="small" onClick={() => nav('/m/data/khd')}>Интеграции →</Button>}>
      <List disablePadding>
        <Row title="СДМС → КХД: 14 скважин без параметров за 02.11" meta="ошибка обмена · влияет на сводку НГДУ-1 и НГДУ-3" tone={['crit', 'Сбой']} onClick={() => nav('/m/data/khd')} />
        <Row title="АВР+ → БД 2.0: задержка обмена 40 мин" meta="акты выполненных работ ТКРС" tone={['warn', 'Задержка']} onClick={() => nav('/m/data/khd')} />
        <Row title="Расхождение фонда БД 2.0 ↔ ТР 2.0: 5 скважин" meta="сверка по заявке администратора" tone={['warn', 'Сверка']} onClick={() => nav('/m/data')} />
        <Row title="Геомодель Узень v.2026.3 опубликована" meta="ЦРНС 2.0 · слои доступны · пересчёт ранжирования завершён" tone={['good', 'Выполнено']} onClick={() => nav('/m/plast/obj/' + encodeURIComponent('model:uzen-2026.3'))} />
      </List>
    </Section>);
}

function Events({ items, read, markRead }) {
  const nav = useNavigate();
  return (
    <Section title="События" flush sub={`${items.filter((x) => !read[x.k]).length} новых`}>
      <List disablePadding>{items.slice(0, 6).map((x) => { const T = TONE[x.tone]; const I = T.icon; return (
        <ListItemButton key={x.k} onClick={() => { markRead(x.k); nav(x.to); }} sx={{ borderRadius: 0, px: 2, py: 0.9, gap: 1.25, alignItems: 'flex-start', borderTop: '1px solid #f0f2f5', opacity: read[x.k] ? 0.75 : 1 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 2, bgcolor: T.bg, color: T.fg, display: 'grid', placeItems: 'center', flex: 'none', mt: 0.25 }}>{I && <I sx={{ fontSize: 16 }} />}</Box>
          <Box sx={{ minWidth: 0, flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: read[x.k] ? 400 : 600, lineHeight: 1.3 }}>{x.t}</Typography><Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{x.when} · {x.s}</Typography></Box>
        </ListItemButton>); })}</List>
    </Section>
  );
}

function Twins() {
  const nav = useNavigate();
  return (
    <Section title="Цифровые двойники" flush info="Интегрированная модель актива: скважина ⇄ пласт, скважина ⇄ инфраструктура (сл. 14).">
      <List disablePadding>{TWINS.map((t) => (
        <ListItemButton key={t.id} onClick={() => nav(t.href)} sx={{ borderRadius: 0, px: 2, py: 1.1, borderTop: '1px solid #f0f2f5', display: 'block' }}>
          <Stack direction="row" alignItems="center" spacing={1}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.c }} /><Typography sx={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{t.t}</Typography><StatusChip tone={t.st[1]} label={t.st[0]} /></Stack>
          <Box sx={{ mt: 0.75 }}><Meter v={t.q} tone={t.q < 90 ? 'warn' : ''} h={6} /></Box>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{t.qt} — {t.q}% · обновлено {dRel(t.upd)}</Typography>
        </ListItemButton>))}</List>
    </Section>
  );
}

// Эксперт: очередь по процессам
function ExpertQueue({ tasks }) {
  const nav = useNavigate(); const now = nowDemo();
  const byP = Object.values(tasks.reduce((m, t) => { const k = t.p || 'other'; (m[k] = m[k] || { k, pt: t.pt, n: 0, late: 0, t }).n++; if (t.due && t.due < now) m[k].late++; return m; }, {}));
  return (
    <Section title="Очередь по процессам" sub={`${tasks.length} ${plural(tasks.length, 'шаг', 'шага', 'шагов')} ожидают`} action={<Button size="small" onClick={() => nav('/tasks')}>К задачам →</Button>}>
      <Hbars rows={byP.sort((a, b) => b.n - a.n).map((x) => ({ l: `${x.k !== 'other' ? x.k + ' · ' : ''}${x.pt}`, v: x.n, c: x.late ? C.crit : C.brand, txt: x.late ? `${x.n} · просрочено ${x.late}` : String(x.n) }))} labelW="55%" />
    </Section>
  );
}

export default function Home() {
  const { role, prod: P, asset, tasks, runs, read, markRead } = useApp(); const nav = useNavigate();
  const type = TYPE[role.id] || 'manager'; const notifs = notifsFor(role, runs, tasks);
  const late = tasks.filter((t) => t.due && t.due < nowDemo()).length;
  return (
    <Box>
      <PageHeader title="Рабочий стол" sub={`${role.name} · ${role.org} · данные на ${dFmt(TODAY)} ${tFmt(TODAY)}`}
        actions={<Button variant={late ? 'contained' : 'outlined'} color={late ? 'error' : 'primary'} onClick={() => nav('/tasks')}>Мои задачи · {tasks.length}{late ? ` · просрочено ${late}` : ''}</Button>} />
      <Decisions tasks={tasks} />
      <KpiRow items={kpiSet(role.id, P, tasks, runs)} />
      {type === 'expert'
        ? <Grid2 cols="1fr 1fr"><ExpertQueue tasks={tasks} /><Objects role={role} runs={runs} /></Grid2>
        : <Grid2 cols="3fr 2fr"><MainChart roleId={role.id} P={P} asset={asset} /><Objects role={role} runs={runs} /></Grid2>}
      <Grid2 cols={['dzo', 'kmgi', 'admin'].includes(role.id) ? '1fr 1fr' : '1fr'}>
        <Events items={notifs} read={read} markRead={markRead} />
        {['dzo', 'kmgi', 'admin'].includes(role.id) && <Twins />}
      </Grid2>
    </Box>
  );
}
