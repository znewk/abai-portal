// Виджеты форм шагов Р1, Р3, Б1, Б2 и карточек объектов (профиль добычи, модель, куст), а также ход записи процесса
// для рабочих мест (Р2, Р3, Р4, Б4, Б5). Данные — из модулей рабочих мест: plast/dev.data.js, dob/profile.data.js, skv/well.data.js.
import { useNavigate, useInRouterContext } from 'react-router-dom';
import { Box, Stack, Typography, Button } from '@mui/material';
import EastRounded from '@mui/icons-material/EastRounded';
import { KV, StatusChip, Hbars, Steps, Meter } from '../../../components/ui.jsx';
import { StackChart, TrendChart, BarsChart } from '../../../components/charts.jsx';
import DataTable from '../../../components/DataTable.jsx';
import { useApp } from '../../../state.jsx';
import { stepPath, dueText, nowDemo } from '../../../data/exec.js';
import { fmt, sum, dFmt, MON } from '../../../lib/format.js';
import { C } from '../../../theme.js';
import { FieldMap, MapLegend, PtMark, PL_PTS, PL_PT_ST, ptSt } from '../../plast/_shared.jsx';
import { MODELS, MST, ADAPT, VARS, VARS_FIELD, OIZ, OIZ_SUM, ATLAS, CARPET } from '../../plast/dev.data.js';
import { YEARS, FC, profile, variants, PROF } from '../../dob/profile.data.js';
import { KUST118, kustOf, W9412 } from '../../skv/well.data.js';

const Sub = ({ children }) => <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2, mb: 0.75 }}>{children}</Typography>;

// ===== Ход записи процесса для рабочих мест =====
// Состояние шага записи по коду: done · cur · wait (ждёт слияния) · next
export function stepState(run, code) {
  if (!run) return 'next'; const i = run.P.s.findIndex((s) => s.c === code); if (i < 0) return 'next';
  if (run.active.some((a) => a.i === i)) return 'cur'; if (run.done.some((d) => d.i === i)) return 'done'; if ((run.pending || []).includes(i)) return 'wait';
  return run.status === 'done' ? 'done' : 'next';
}
// Маршрут по шагам записи: codes [[код, краткое название]]; код показывается только в демо-режиме
export function RunRoute({ run, codes }) {
  const app = useApp(); const demo = app && app.demo; const now = nowDemo();
  return <Steps items={codes.map(([c, t]) => { const st = stepState(run, c); const s = run && run.P.s.find((x) => x.c === c); const a = st === 'cur' && run.active.find((q) => run.P.s[q.i].c === c);
    return { c: demo ? c : null, t, sub: s ? s.r + (a && a.due ? ' · ' + dueText(a.due, now) : '') : '', done: st === 'done', cur: st === 'cur' || st === 'wait' }; })} />;
}
// Действие рабочего места: ведёт в форму активного шага роли (codes — подходящие шаги); иначе — кто сейчас исполняет
export function RunAction({ run, codes, label = 'Открыть в процессе', size = 'small', variant = 'contained', doneLabel = 'Завершено' }) {
  const app = useApp(); const nav = useNavigate();
  if (!run || !app) return null;
  if (run.status === 'done') return <StatusChip tone="good" label={doneLabel} />;
  const act = run.active.filter((a) => !codes || codes.includes(run.P.s[a.i].c));
  const mine = act.find((a) => app.role && app.role.lane(run.p, run.P.s[a.i].r));
  if (mine) return <Button size={size} variant={variant} endIcon={<EastRounded />} onClick={() => nav(stepPath(run, mine.i))}>{label}</Button>;
  const a = act[0] || run.active[0];
  return <Button size={size} color="inherit" endIcon={<EastRounded />} onClick={() => nav(stepPath(run, a ? a.i : 0))}>{a ? `Сейчас: ${run.P.s[a.i].r}` : 'Открыть в процессе'}</Button>;
}
// Текст о текущих шагах записи: «Сейчас: шаг — исполнитель (срок)»
export function runNow(run) {
  if (!run) return ''; if (run.status === 'done') return 'Процесс завершён';
  const now = nowDemo(); return 'Сейчас: ' + run.active.map((a) => `${run.P.s[a.i].t} — ${run.P.s[a.i].r}, ${dueText(a.due, now)}`).join('; ');
}

// ===== Р1: варианты системы разработки =====
export function VarsWidget({ chart = true, sel }) {
  return (
    <Box>
      <Sub>Варианты системы разработки · {VARS_FIELD}</Sub>
      <DataTable rows={VARS} getRowClassName={(p) => (p.row.id === (sel || (VARS.find((v) => v.rec) || {}).id) ? 'sel' : '')} columns={[
        { field: 't', headerName: 'Вариант', flex: 1, minWidth: 230, renderCell: (p) => <Box><b>{p.row.t}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.row.d}</Typography></Box> },
        { field: 'n', headerName: 'Новых скважин', type: 'number', width: 110 },
        { field: 'q', headerName: 'Добыча за 20 лет, млн т', type: 'number', width: 130, valueFormatter: (v) => fmt(v, 1) },
        { field: 'kin', headerName: 'КИН', type: 'number', width: 80, valueFormatter: (v) => fmt(v, 3) },
        { field: 'capex', headerName: 'Капитальные затраты, млрд тг', type: 'number', width: 140 },
        { field: 'npv', headerName: 'NPV, млрд тг', type: 'number', width: 100 },
      ]} />
      {chart && <Box sx={{ mt: 1.5 }}><BarsChart height={200} unit="млрд тг" labels legend={false} data={VARS.map((v) => ({ x: 'Вариант ' + v.id, npv: v.npv, rec: v.rec }))} series={[{ key: 'npv', name: 'NPV', color: C.s[0] }]} colorBy={(d) => (d.rec ? C.s[0] : '#9ec5f4')} /></Box>}
    </Box>
  );
}
// ===== Р1: распределение ОИЗ по секторам =====
export function OizWidget() {
  return (
    <Box>
      <Sub>Остаточные извлекаемые запасы по секторам · всего {fmt(OIZ_SUM, 1)} млн т</Sub>
      <Hbars labelW="34%" rows={[...OIZ].sort((a, b) => b.oiz - a.oiz).slice(0, 8).map((s, i) => ({ l: `${s.id} · ${s.why}`, v: s.oiz, c: i < 3 ? C.s[0] : '#9ec5f4', txt: fmt(s.oiz, 1) + ' млн т', tip: `${s.id}: ОИЗ ${fmt(s.oiz, 1)} млн т, ННТ ${s.nnt} м, рейтинг ${s.score}` }))} />
    </Box>
  );
}
// ===== Р1 / Б1: проектные точки на карте ОИЗ =====
export function PointsWidget({ pts = PL_PTS, title }) {
  const rows = pts.map((p) => ({ ...p, st: ptSt(p) })); const inRouter = useInRouterContext();
  return (
    <Box>
      <Sub>{title || `Проектные точки бурения · ${rows.length}`}</Sub>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 2, '& > *': { minWidth: 0 } }}>
        <Box>{inRouter && <FieldMap layer="oiz" pts={rows} fade />}<MapLegend layer="oiz" extra={Object.values(PL_PT_ST).map((v) => <PtMark key={v[0]} c={v[2]} label={v[0]} />)} /></Box>
        <DataTable rows={rows} pageSize={8} initialSort={[{ field: 'rate', sort: 'desc' }]} columns={[
          { field: 'id', headerName: 'Точка', width: 100, renderCell: (p) => <b>{p.value}</b> },
          { field: 'type', headerName: 'Тип', width: 64 },
          { field: 'rate', headerName: 'Рейтинг', type: 'number', width: 76 },
          { field: 'q', headerName: 'Дебит нефти, т/сут', type: 'number', width: 96, valueFormatter: (v) => fmt(v, 1) },
          { field: 'st', headerName: 'Статус', flex: 1, minWidth: 130, renderCell: (p) => <StatusChip tone={PL_PT_ST[p.value][1]} label={PL_PT_ST[p.value][0]} /> },
        ]} />
      </Box>
    </Box>
  );
}
// ===== Б1: атлас 20 точек (отбивка, согласование) =====
export function AtlasWidget({ marks = true }) {
  const n = ATLAS.filter((p) => p.mark).length;
  return (
    <Box>
      <Sub>Атлас точек · ноябрь 2026 · {ATLAS.length} точек{marks ? ` · координаты подтверждены по ${n}` : ''}</Sub>
      <DataTable rows={ATLAS} pageSize={10} columns={[
        { field: 'id', headerName: 'Точка', width: 100, renderCell: (p) => <Box><b>{p.value}</b>{p.row.kust && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.row.kust}</Typography>}</Box> },
        { field: 'sec', headerName: 'Сектор · тип', width: 100, valueGetter: (v, r) => `${r.sec} · ${r.type}` },
        { field: 'depth', headerName: 'Глубина, м', type: 'number', width: 86, valueFormatter: (v) => fmt(v) },
        { field: 'q', headerName: 'Дебит нефти, т/сут', type: 'number', width: 90, valueFormatter: (v) => fmt(v, 1) },
        { field: 'xy', headerName: 'Координаты', width: 120, valueGetter: (v, r) => `${r.x}, ${r.y}`, renderCell: (p) => <Box sx={{ fontSize: 12 }}>{p.row.x}<br />{p.row.y}</Box> },
        { field: 'mark', headerName: 'Отбивка', minWidth: 140, flex: 1, renderCell: (p) => (p.value ? <StatusChip tone="good" label="Подтверждена" /> : <StatusChip tone="warn" label="Ожидает отбивки" />) },
      ]} />
    </Box>
  );
}
// ===== Б1: ковёр бурения 2027 =====
export function CarpetWidget() {
  return (
    <Box>
      <Sub>Ковёр бурения 2027 · точки, включённые по атласам прошлых месяцев</Sub>
      <DataTable rows={CARPET} columns={[
        { field: 'id', headerName: 'Точка', width: 100, renderCell: (p) => <b>{p.value}</b> },
        { field: 'well', headerName: 'Проектная скважина', width: 150 },
        { field: 'type', headerName: 'Тип', width: 64 },
        { field: 'depth', headerName: 'Глубина, м', type: 'number', width: 96, valueFormatter: (v) => fmt(v) },
        { field: 'q', headerName: 'Дебит нефти, т/сут', type: 'number', width: 110, valueFormatter: (v) => fmt(v, 1) },
        { field: 'q1', headerName: 'Срок бурения', flex: 1, minWidth: 120 },
      ]} />
    </Box>
  );
}
// ===== Б1 / Б2: куст =====
export function KustWidget({ id = 'kust:118' }) {
  const k = kustOf(id); const rows = k.wells ? k.wells : k.pts.map((p) => ({ id: p.id, type: p.type, depth: p.depth, q: p.q, pt: p.id, month: k.start }));
  return (
    <Box>
      <Sub>Куст {k.n} · {rows.length} проектных скважин · горизонт {k.horizon} · {k.ngdu}</Sub>
      <DataTable rows={rows} columns={[
        { field: 'id', headerName: k.wells ? 'Скважина' : 'Точка', width: 110, renderCell: (p) => <b>{p.value}</b> },
        ...(k.wells ? [{ field: 'pt', headerName: 'Проектная точка', width: 120 }] : []),
        { field: 'type', headerName: 'Тип', width: 64 },
        { field: 'depth', headerName: 'Проектная глубина, м', type: 'number', width: 130, valueFormatter: (v) => fmt(v) },
        { field: 'q', headerName: 'Пусковой дебит нефти, т/сут', type: 'number', width: 150, valueFormatter: (v) => fmt(v, 1) },
        { field: 'month', headerName: 'Срок бурения', flex: 1, minWidth: 120 },
      ]} />
    </Box>
  );
}
// ===== Б1: технический проект скважины =====
export function ProjectWidget() {
  const w = W9412;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
      <Box><Sub>Технический проект · {w.id}</Sub><KV w="44%" rows={[['Проектная точка', `${w.pt} · сектор ${w.sec}`], ['Тип скважины', w.type], ['Проектная глубина', `${fmt(w.depth)} м`], ['Профиль', w.profile], ['Буровой раствор', w.mud], ['Компоновка низа бурильной колонны', w.bha], ['Пусковой дебит нефти', `${fmt(w.q, 1)} т/сут`]]} /></Box>
      <Box><Sub>Конструкция скважины</Sub>
        <DataTable rows={w.constr.map(([t, d, i], k) => ({ id: k, t, d, i }))} columns={[{ field: 't', headerName: 'Колонна', flex: 1 }, { field: 'd', headerName: 'Диаметр', width: 90 }, { field: 'i', headerName: 'Интервал', width: 110 }]} />
      </Box>
    </Box>
  );
}

// ===== Р3: профиль добычи =====
export function ProfileWidget({ k = 1, v = 0, from = 0, comps = ['base', 'gtm', 'vns', 'mun'], height = 280, title }) {
  const p = profile(k, v); const N = { base: ['Базовая', C.s[0]], gtm: ['ГТМ', C.s[1]], vns: ['Ввод новых скважин', C.s[2]], mun: ['МУН и новые технологии', C.s[3]] };
  const data = YEARS.map((x, i) => ({ x, ...Object.fromEntries(comps.map((c) => [c, p[c][i]])) })).slice(from);
  return (
    <Box>
      <Sub>{title || 'Профиль добычи нефти по компонентам, тыс. т'}</Sub>
      <StackChart data={data} height={height} unit="тыс. т" fcFrom={YEARS[FC]} fcLabel="Прогноз" series={comps.map((c) => ({ key: c, name: N[c][0], color: N[c][1] }))} />
    </Box>
  );
}
// Таблица профиля по годам прогноза
export const profileRows = (k = 1, v = 0) => { const p = profile(k, v); return YEARS.slice(FC).map((y, j) => { const i = j + FC; return { id: y, y, base: p.base[i], gtm: p.gtm[i], vns: p.vns[i], mun: p.mun[i], tot: p.tot[i] }; }); };
export const PROFILE_COLS = [['y', 'Год', 70], ['base', 'Базовая', 100, 'number'], ['gtm', 'ГТМ', 90, 'number'], ['vns', 'Ввод новых скважин', 120, 'number'], ['mun', 'МУН', 80, 'number'], ['tot', 'Итого, тыс. т', 110, 'number']];
export function VariantsWidget({ k = 1 }) {
  const V = variants(k); const data = YEARS.slice(FC - 1).map((x, j) => ({ x, v0: V[0].p.tot[j + FC - 1], v1: V[1].p.tot[j + FC - 1], v2: V[2].p.tot[j + FC - 1] }));
  return (
    <Box>
      <Sub>Варианты профиля, тыс. т</Sub>
      <TrendChart data={data} height={220} unit="тыс. т" xInterval={0} series={[{ key: 'v0', name: 'Вариант 1', color: C.s[0] }, { key: 'v1', name: 'Вариант 2', color: C.s[1] }, { key: 'v2', name: 'Вариант 3', color: C.s[2] }]} />
    </Box>
  );
}

// ===== Карточки объектов =====
// Профиль добычи 2027–2031
export function ProfileObjWidget() {
  const rows = profileRows(1, 0);
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2, mb: 2, '& > *': { minWidth: 0 } }}>
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', borderRadius: 2, p: 2 }}><ProfileWidget height={260} /></Box>
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', borderRadius: 2, p: 2 }}>
        <Sub>Прогноз по годам, тыс. т</Sub>
        <DataTable rows={rows} disableColumnMenu columns={[
          { field: 'y', headerName: 'Год', width: 64 }, { field: 'base', headerName: 'Базовая', type: 'number', flex: 1, valueFormatter: (v) => fmt(v) },
          { field: 'gtm', headerName: 'ГТМ, ВНС, МУН', type: 'number', flex: 1, valueGetter: (v, r) => r.gtm + r.vns + r.mun, valueFormatter: (v) => fmt(v) },
          { field: 'tot', headerName: 'Итого', type: 'number', flex: 1, renderCell: (p) => <b>{fmt(p.value)}</b> },
        ]} />
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>За 5 лет — {fmt(sum(rows.map((r) => r.tot)))} тыс. т; коэффициент падения базовой добычи — {fmt(PROF.fall, 1)} % в год</Typography>
      </Box>
    </Box>
  );
}
// Геологическая модель: версии и адаптация ГДМ
export function ModelObjWidget({ obj }) {
  const rows = MODELS.filter((m) => m.obj === (obj && obj.id)); const gdm = rows.find((m) => m.adapt != null);
  const data = ADAPT.map((a) => ({ x: MON[(10 + a.m) % 12], fact: a.fact, calc: a.calc }));
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 2, '& > *': { minWidth: 0 } }}>
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', borderRadius: 2, p: 2 }}>
        <Sub>Версии моделей · ABAI ЦРНС 2.0</Sub>
        <DataTable rows={rows} disableColumnMenu columns={[
          { field: 't', headerName: 'Модель', flex: 1, minWidth: 180, renderCell: (p) => <Box><b>{p.value} {p.row.v}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.row.tool}</Typography></Box> },
          { field: 'd', headerName: 'Дата', width: 100, valueFormatter: (v) => dFmt(v) },
          { field: 'st', headerName: 'Статус', width: 170, renderCell: (p) => <StatusChip tone={MST[p.value][1]} label={MST[p.value][0]} /> },
        ]} />
      </Box>
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', borderRadius: 2, p: 2 }}>
        <Sub>Адаптация ГДМ на историю{gdm ? ` · ${gdm.adapt} %` : ''}</Sub>
        {gdm ? <><Meter v={gdm.adapt} tone={gdm.adapt >= 90 ? 'good' : 'warn'} h={6} />
          <Box sx={{ mt: 1 }}><TrendChart data={data} height={190} unit="тыс. т" series={[{ key: 'fact', name: 'Факт', color: C.s[0] }, { key: 'calc', name: 'Расчёт ГДМ', color: C.s[1], dash: true }]} /></Box></>
          : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Гидродинамическая модель актуализируется после публикации геологической модели.</Typography>}
      </Box>
    </Box>
  );
}
// Куст скважин: проектные скважины и подготовка к бурению
export function KustObjWidget({ obj }) {
  const k = kustOf(obj && obj.id);
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e3e7ee', borderRadius: 2, p: 2, mb: 2 }}>
      <KustWidget id={obj && obj.id} />
      {k.wells && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 1 }}>Буровой подрядчик — {k.ctr}, установка {k.rig}; освобождается после бурения УЗН-7455 ориентировочно {dFmt(k.rigFree)}.</Typography>}
    </Box>
  );
}
export { KUST118 };
