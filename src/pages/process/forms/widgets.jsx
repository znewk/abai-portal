// Виджеты форм шагов: предметные данные объекта внутри формы (варианты насосов, график бурения, сводка по подразделениям,
// карточка отклонения, кандидаты ГТМ, элемент заводнения, бригады ВСР). Переиспользуют данные рабочих мест — цифры совпадают.
import { Box, Stack, Typography } from '@mui/material';
import { KV, StatusChip, Meter } from '../../../components/ui.jsx';
import { TrendChart } from '../../../components/charts.jsx';
import DataTable from '../../../components/DataTable.jsx';
import { WELLS, ALERTS, PROD } from '../../../data/core.js';
import { fmt, pct, sgn, sum, last, rng, dFmt, dShort, tFmt, dAdd, TODAY } from '../../../lib/format.js';
import { C } from '../../../theme.js';
import { reqFromRun, pumpsFor, hOp, HeadChart } from '../../dob/gno.data.jsx';
import { drillOf, devs, BAL, opOf } from '../../skv/drill.data.js';
import { seriesOf, NGDU_SHARE, fixMean } from '../../dob/_shared1.jsx';
import { PL_GTM, PL_GTM_ST, PL_EZ, PL_EZ_T } from '../../plast/_shared.jsx';

const Sub = ({ children }) => <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2, mb: 0.75 }}>{children}</Typography>;

// Д6: варианты насосов и напорная характеристика по заявке
export function PumpsWidget({ run, chart = true }) {
  const req = reqFromRun(run); const pumps = pumpsFor(req); const rec = pumps.find((p) => p.rec);
  return (
    <Box>
      <Sub>Варианты насосов · подача {fmt(rec.qt)} м³/сут · напор {fmt(hOp(pumps))} м</Sub>
      <DataTable rows={pumps} getRowClassName={(p) => (p.row.rec ? 'sel' : '')} columns={[
        { field: 'name', headerName: 'Типоразмер', minWidth: 200, flex: 2, renderCell: (p) => <Box><b>{p.row.name}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.row.rec ? 'рекомендуемый · в рабочей зоне' : p.row.fit}</Typography></Box> },
        { field: 'eff', headerName: 'КПД, %', type: 'number', width: 80, valueFormatter: (v) => fmt(v, 1) },
        { field: 'kwh', headerName: 'кВт·ч/сут', type: 'number', width: 96, valueFormatter: (v) => fmt(v) },
        { field: 'mtbf', headerName: 'Наработка, сут', type: 'number', width: 120, valueFormatter: (v) => fmt(v) },
      ]} />
      {chart && <Box sx={{ mt: 1.5 }}><HeadChart pumps={pumps} height={240} /></Box>}
    </Box>
  );
}
export const pumpsSummary = (run) => { const p = pumpsFor(reqFromRun(run)); const r = p.find((x) => x.rec); return `${r.name} · КПД ${fmt(r.eff, 1)} % · наработка ${fmt(r.mtbf)} сут`; };

// Б3: глубина по стволу и суточный рапорт
export function DepthWidget({ wellId, report = true }) {
  const d = drillOf(wellId); const dv = d.bh - d.bhPlan;
  const data = Array.from({ length: d.days + 1 }, (_, i) => ({ x: 'сут ' + i, plan: d.plan[i], fact: i <= d.cur ? d.fact[i] : null }));
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: report ? { xs: '1fr', md: '3fr 2fr' } : '1fr', gap: 2, mt: 1 }}>
      <Box>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 0.5 }}>{d.rig} · {d.ctr} · {dv >= 0 ? 'опережение' : 'отставание'} {fmt(Math.abs(dv))} м от ГТН</Typography>
        <TrendChart data={data} unit="м" height={220} yDomain={[0, 'auto']} marks={[{ x: 'сут ' + d.cur, label: 'сейчас' }]} series={[{ key: 'plan', name: 'Проектный график (ГТН)', color: C.ink2, dash: true, width: 1.5 }, { key: 'fact', name: 'Факт по данным ГТИ', color: C.s[0] }]} />
      </Box>
      {report && <Box><KV rows={[['Сутки бурения', `${d.cur} из ${d.days}`], ['Забой на 06:00', fmt(d.bh) + ' м'], ['Проходка за сутки', fmt(d.daily) + ' м'], ['Операция', opOf(d)], ['Буровой раствор', 'полимер-глинистый, 1,18 г/см³']]} /></Box>}
    </Box>
  );
}
export const drillFacts = (wellId) => { const d = drillOf(wellId); return [['Буровая установка', `${d.rig} · ${d.ctr}`], ['Сутки бурения', `${d.cur} из ${d.days}`], ['Забой', `${fmt(d.bh)} м из ${fmt(d.depth)} м`], ['Отклонение от ГТН', `${sgn(d.bh - d.bhPlan)} м`]]; };
export const drillDevs = (wellId) => devs(drillOf(wellId));
export const drillBal = () => BAL;

// Д1: сводка по подразделениям (НГДУ) или по цехам внутри НГДУ
export function summaryRows(scope) {
  const P = seriesOf('omg'); const i = PROD.nF - 1; const r = rng('ngdu-omg');
  const parts = NGDU_SHARE.omg.map(([n, sh]) => { const f = 1 + (r() - 0.55) * 0.04; return { id: n, n, plan: Math.round(P.plan[i] * sh), fact: Math.round(P.fact[i] * sh * f), wc: +(last(P.wc) + (r() - 0.5) * 4).toFixed(1) }; });
  parts[0].fact += P.fact[i] - sum(parts.map((x) => x.fact)); fixMean(parts, last(P.wc));
  if (!scope || scope === 'ДЗО') return parts;
  const ng = parts.find((x) => x.n === scope) || parts[0]; const r2 = rng('ceh' + scope); const sh = [0.31, 0.27, 0.24, 0.18];
  const rows = sh.map((s, k) => ({ id: 'ЦДНГ-' + (k + 1), n: 'ЦДНГ-' + (k + 1), plan: Math.round(ng.plan * s), fact: Math.round(ng.fact * s * (1 + (r2() - 0.5) * 0.03)), wc: +(ng.wc + (r2() - 0.5) * 3).toFixed(1) }));
  rows[0].fact += ng.fact - sum(rows.map((x) => x.fact)); rows[0].plan += ng.plan - sum(rows.map((x) => x.plan));
  return fixMean(rows, ng.wc);
}
export function SummaryWidget({ scope, title }) {
  const rows = summaryRows(scope); const tot = { id: '_t', n: 'Итого', plan: sum(rows.map((x) => x.plan)), fact: sum(rows.map((x) => x.fact)), wc: +(sum(rows.map((x) => x.wc)) / rows.length).toFixed(1), tot: true };
  const num = (field, headerName, d = 0, extra = {}) => ({ field, headerName, type: 'number', align: 'right', headerAlign: 'right', width: 110, valueFormatter: (v) => fmt(v, d), ...extra });
  return (
    <Box>
      <Sub>{title || `Добыча нефти за ${dFmt(dAdd(-1))}`}</Sub>
      <DataTable rows={rows.concat([tot])} getRowClassName={(p) => (p.row.tot ? 'tot' : '')} disableColumnMenu sx={{ '& .tot': { bgcolor: '#f8f9fb', fontWeight: 600 } }} columns={[
        { field: 'n', headerName: 'Подразделение', flex: 1.4, renderCell: (p) => (p.row.tot ? <b>{p.value}</b> : p.value) },
        num('plan', 'План, т'), num('fact', 'Факт, т', 0, { renderCell: (p) => <b>{fmt(p.value)}</b> }),
        { field: 'dev', headerName: 'Откл., т', type: 'number', align: 'right', headerAlign: 'right', width: 96, valueGetter: (v, r) => r.fact - r.plan, renderCell: (p) => <Box component="span" sx={{ color: p.value >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>{sgn(p.value)}</Box> },
        num('wc', 'Обводн., %', 1, { width: 100 }),
      ]} />
    </Box>
  );
}
export const summaryFacts = (scope) => { const rows = summaryRows(scope); const f = sum(rows.map((x) => x.fact)), p = sum(rows.map((x) => x.plan)); return [['Нефть, факт', `${fmt(f)} т`], ['План', `${fmt(p)} т`], ['Отклонение', `${sgn(f - p)} т (${sgn(((f - p) / p) * 100, 1)} %)`], ['Обводнённость', pct(sum(rows.map((x) => x.wc)) / rows.length)]]; };

// Д2 / Д9: карточка отклонения по скважине
export const alertOf = (wellId) => ALERTS.find((a) => a.well === wellId && a.st !== 'Устранено') || ALERTS.find((a) => a.well === wellId) || null;
export function AlertWidget({ wellId }) {
  const a = alertOf(wellId); const w = WELLS.find((x) => x.id === wellId); if (!a || !w) return null;
  const r = rng('al' + wellId); const n = 14; const base = w.qL || 40;
  const data = Array.from({ length: n }, (_, k) => ({ x: dShort(dAdd(k - n + 1)), q: k < n - 2 ? +(base * (1.02 + (r() - 0.5) * 0.06)).toFixed(1) : +(base * (a.kind === 'esp' ? (k === n - 1 ? 0 : 0.35) : 0.78)).toFixed(1), reg: Math.round(base * 1.03) }));
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 3fr' }, gap: 2, mt: 1 }}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><StatusChip tone={a.tone} label={a.t} /><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{a.id}</Typography></Stack>
        <KV rows={[['Зафиксировано', `${dFmt(a.since)} ${tFmt(a.since)} · ABAI ТР 2.0`], ['Скважина', `${w.id} · ${w.method} · ${w.ngdu}`], ['Режим', `${fmt(Math.round(base * 1.03))} м³/сут`], ['Факт', a.kind === 'esp' ? 'подача отсутствует' : `${fmt(last(data).q, 1)} м³/сут`], ['Потери', a.loss ? `${fmt(a.loss, 1)} т/сут` : '—'], ['Статус', a.st]]} />
      </Box>
      <TrendChart data={data} unit="м³/сут" dd={1} height={200} series={[{ key: 'q', name: 'Дебит жидкости', color: C.s[0], area: true }, { key: 'reg', name: 'Режим ТР 2.0', color: C.ink2, dash: true, width: 1.5 }]} />
    </Box>
  );
}

// Р2: кандидаты ГТМ
export function CandidatesWidget({ limit = 8, st }) {
  const rows = PL_GTM.filter((x) => !st || x.st0 === st).slice(0, limit).map((x) => ({ ...x, id: x.id }));
  return (
    <Box>
      <Sub>Мероприятия-кандидаты · {rows.length} из {PL_GTM.length}</Sub>
      <DataTable rows={rows} columns={[
        { field: 'w', headerName: 'Скважина', width: 120, renderCell: (p) => <b>{p.value}</b> },
        { field: 't', headerName: 'Вид ГТМ', flex: 1, minWidth: 150, renderCell: (p) => <Box>{p.value}<Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.row.ngdu}</Typography></Box> },
        { field: 'q', headerName: 'Прирост, т/сут', type: 'number', width: 120, valueFormatter: (v) => (v ? '+' + fmt(v, 1) : '—') },
        { field: 'npv', headerName: 'NPV, млн тг', type: 'number', width: 110, valueFormatter: (v) => fmt(v) },
        { field: 'st0', headerName: 'Статус', width: 190, renderCell: (p) => <StatusChip tone={PL_GTM_ST[p.value][1]} label={PL_GTM_ST[p.value][0]} /> },
      ]} />
    </Box>
  );
}
export const gtmFacts = () => { const inc = PL_GTM.filter((x) => x.st0 === 'incl'); return [['Кандидатов', fmt(PL_GTM.length)], ['Включено в программу', fmt(inc.length)], ['Суммарный прирост', `+${fmt(sum(inc.map((x) => x.q)), 1)} т/сут`], ['NPV включённых', `${fmt(sum(inc.map((x) => x.npv)))} млн тг`]]; };

// Р4: элемент заводнения
export function ElementWidget({ id }) {
  const e = PL_EZ.find((x) => x.id === id) || PL_EZ[0];
  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><Typography sx={{ fontWeight: 600 }}>Элемент {e.id}</Typography><StatusChip tone={e.tone} label={PL_EZ_T[e.tone]} /></Stack>
      <KV w="46%" rows={[['Нагнетательная скважина', `${e.c.id} · ${fmt(e.c.qInj)} м³/сут`], ['Реагирующие добывающие', e.links.map((w) => w.id).join(', ')], ['Компенсация отбора', `${e.comp} %`], ['Эффективность закачки', `${fmt(e.eff, 1)} т на 1 000 м³`], ['Рекомендация', e.rec ? `${e.rec > 0 ? 'увеличить' : 'уменьшить'} закачку на ${fmt(Math.abs(e.rec))} м³/сут` : 'режим сохранить'], ['Ожидаемый эффект', e.eff2 ? `+${fmt(e.eff2, 1)} т/сут` : '—']]} />
    </Box>
  );
}
export const elementFacts = (id) => { const e = PL_EZ.find((x) => x.id === id) || PL_EZ[0]; return [['Компенсация', `${e.comp} %`], ['Эффективность закачки', `${fmt(e.eff, 1)} т/1 000 м³`], ['Оценка', PL_EZ_T[e.tone]]]; };
// План и факт мероприятия по элементу: изменение закачки, новый режим, ожидаемый и фактический эффект (77 % плана через 30 суток)
export const elementPlan = (id) => { const e = PL_EZ.find((x) => x.id === id) || PL_EZ[0]; const fact = +(e.eff2 * 0.77).toFixed(1); return { e, rec: e.rec, inj: e.c.qInj + e.rec, eff2: e.eff2, fact }; };
export const elementTable = () => PL_EZ.slice(0, 8).map((e) => ({ id: e.id, el: e.id, inj: e.c.id, comp: e.comp, eff: e.eff, st: PL_EZ_T[e.tone], tone: e.tone }));

// Б5: бригады ВСР
export function brigRows(n = 8) {
  const r = rng('brig'); const objs = WELLS.filter((w) => w.type === 'prod' && (w.status === 'repair' || w.risk > 50)).slice(0, n);
  return objs.map((w, i) => ({ id: (i < 3 ? 'КРС-0' : 'ПРС-1') + (1 + i), brig: (i < 3 ? 'КРС-0' : 'ПРС-1') + (1 + i), w: w.id, work: i < 3 ? 'Капитальный ремонт · РИР' : ['Смена ЭЦН', 'Смена ШГН', 'Промывка забоя', 'Оптимизация режима ГНО', 'Смена ЭЦН'][i % 5], from: dAdd(-Math.floor(r() * 5)), dur: Math.round(i < 3 ? 120 + r() * 100 : 24 + r() * 60), st: i === 5 ? 'Простой · ожидание техники' : i === 7 ? 'Простой · погода' : 'В работе' }));
}
export function BrigWidget() {
  return (
    <Box>
      <Sub>Движение бригад · ноябрь 2026</Sub>
      <DataTable rows={brigRows()} columns={[
        { field: 'brig', headerName: 'Бригада', width: 100, renderCell: (p) => <b>{p.value}</b> },
        { field: 'w', headerName: 'Скважина', width: 110 },
        { field: 'work', headerName: 'Вид работ', flex: 1, minWidth: 180 },
        { field: 'from', headerName: 'Начало', width: 100, valueFormatter: (v) => dFmt(v) },
        { field: 'dur', headerName: 'Норма, ч', type: 'number', width: 90 },
        { field: 'st', headerName: 'Состояние', width: 200, renderCell: (p) => <StatusChip tone={/Простой/.test(p.value) ? 'warn' : 'good'} label={p.value} /> },
      ]} />
    </Box>
  );
}

// Риск отказа ГНО по фонду (Д9)
export function MechWidget({ ngdu }) {
  const rows = WELLS.filter((w) => w.type === 'prod' && w.method !== 'Фонтан' && (!ngdu || w.ngdu === ngdu)).sort((a, b) => b.risk - a.risk).slice(0, 6);
  return (
    <Box>
      <Sub>Скважины с наибольшим риском отказа{ngdu ? ' · ' + ngdu : ''}</Sub>
      <DataTable rows={rows} columns={[
        { field: 'id', headerName: 'Скважина', width: 110, renderCell: (p) => <b>{p.value}</b> },
        { field: 'pump', headerName: 'ГНО', width: 150 },
        { field: 'mtbf', headerName: 'Наработка, сут', type: 'number', width: 120 },
        { field: 'risk', headerName: 'Риск отказа', minWidth: 180, flex: 1, renderCell: (p) => <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}><Box sx={{ flex: 1 }}><Meter v={p.value} tone={p.value > 60 ? 'crit' : p.value > 35 ? 'warn' : 'good'} h={6} /></Box><b style={{ minWidth: 34, textAlign: 'right' }}>{p.value}%</b></Stack> },
      ]} />
    </Box>
  );
}
export const wellFacts = (w) => (!w ? [] : w.type === 'inj' ? [['Приёмистость', `${fmt(w.qInj)} м³/сут`], ['Пластовое давление', `${w.pPl} атм`], ['Горизонт', w.horizon]]
  : w.status === 'drill' || w.status === 'osv' || w.status === 'plan' ? [['Проектная глубина', `${fmt(w.depth)} м`], ['Горизонт', w.horizon], ['Подразделение', w.ngdu]]
    : [['Дебит жидкости', `${fmt(w.qL)} м³/сут`], ['Дебит нефти', `${fmt(w.qO, 1)} т/сут`], ['Обводнённость', `${w.wc} %`], ['Способ · ГНО', `${w.method} · ${w.pump}`], ['Наработка ГНО', `${fmt(w.mtbf)} сут`], ['Риск отказа ГНО', `${w.risk} %`]]);
