// Виджеты форм шагов и карточек объектов ЦД добычи (Д3, Д4, Д5, Д7, Д8): данные — из модулей рабочих мест
// (pot.data.js, ima.data.js, energy.data.jsx, pipe.data.jsx), поэтому цифры совпадают с рабочими местами.
import { Box, Stack, Typography } from '@mui/material';
import { KV, StatusChip, Meter, Hbars } from '../../../components/ui.jsx';
import DataTable from '../../../components/DataTable.jsx';
import { WELLS } from '../../../data/core.js';
import { fmt, sgn, sum, plural, dFmt, dRel } from '../../../lib/format.js';
import { C } from '../../../theme.js';
import { summaryRows, wellFacts } from './widgets.jsx';
import { POT_SCEN, LEVERS, BASE_2027, PAST_EFF, POT_VARIANTS, NGDU_CAUSES, LOSSES, eventOf } from '../../dob/pot.data.js';
import { SCEN, NARROWS, CALIB, IMA_CONV, node } from '../../dob/ima.data.js';
import { RATE, PROPS, CAUSES, UreChart, rateOf, URE_LIMIT } from '../../dob/energy.data.jsx';
import { pipeOfObj, pipeDays, riskTone, RISK_T, RiskMatrix } from '../../dob/pipe.data.jsx';

const Sub = ({ children }) => <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2, mb: 0.75 }}>{children}</Typography>;
const ldTone = (v) => (v > 90 ? 'crit' : v > 80 ? 'warn' : 'good');
const numCol = (field, headerName, d = 0, extra = {}) => ({ field, headerName, type: 'number', align: 'right', headerAlign: 'right', width: 120, valueFormatter: (v) => (v == null ? '' : fmt(v, d)), ...extra });

// ===== Д3: отклонения добычи по НГДУ за сутки (те же цифры, что в суточной сводке) =====
export function NgduDevWidget() {
  const rows = summaryRows('ДЗО').map((x) => ({ ...x, dev: x.fact - x.plan, why: (NGDU_CAUSES[x.n] || []).join('; ') }));
  return (
    <Box>
      <Sub>Отклонения добычи нефти по НГДУ за сутки</Sub>
      <DataTable rows={rows} pageSize={0} columns={[
        { field: 'n', headerName: 'НГДУ', width: 100, renderCell: (p) => <b>{p.value}</b> },
        numCol('plan', 'План, т', 0, { width: 96 }), numCol('fact', 'Факт, т', 0, { width: 96 }),
        { field: 'dev', headerName: 'Откл., т', type: 'number', width: 90, align: 'right', headerAlign: 'right', renderCell: (p) => <Box component="span" sx={{ color: p.value >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>{sgn(p.value)}</Box> },
        { field: 'why', headerName: 'Основные причины (ТР 2.0)', flex: 1, minWidth: 220 },
      ]} />
    </Box>
  );
}
export const ngduDevTotal = () => { const r = summaryRows('ДЗО'); return { plan: sum(r.map((x) => x.plan)), fact: sum(r.map((x) => x.fact)) }; };

// ===== Д3: сценарии потенциала базовой добычи 2027 =====
export function PotScenWidget({ chart = true }) {
  return (
    <Box>
      <Sub>Сценарии потенциала на 2027 год · базовая добыча {fmt(BASE_2027, 2)} млн т</Sub>
      <DataTable rows={POT_SCEN} pageSize={0} getRowClassName={(p) => (p.row.base ? 'sel' : '')} columns={[
        { field: 't', headerName: 'Сценарий', minWidth: 220, flex: 1, renderCell: (p) => <Box><b>{p.value}</b>{p.row.base && <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}> · рекомендуемый</Typography>}<Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.row.d}</Typography></Box> },
        numCol('tsut', 'Прирост, т/сут', 0, { valueFormatter: (v) => '+' + fmt(v) }),
        numCol('year', 'Прирост, тыс. т/год', 1, { width: 150, valueFormatter: (v) => '+' + fmt(v, 1) }),
      ]} />
      {chart && <Box sx={{ mt: 1.5 }}><Hbars labelW="44%" rows={LEVERS.map((x) => ({ l: x.t, v: x.v, c: x.id === 'idle' ? '#86b6ef' : C.s[0], txt: '+' + fmt(x.v) + ' т/сут', tip: x.d }))} /></Box>}
    </Box>
  );
}
export const potFacts = () => [['Базовая добыча 2027', `${fmt(BASE_2027, 2)} млн т`], ['Потери от потенциала к факту', `${fmt(sum(LOSSES.map((x) => x[1])))} т/сут`], ...POT_SCEN.map((s) => [`Сценарий «${s.t}»`, `+${fmt(s.tsut)} т/сут · +${fmt(s.year, 1)} тыс. т`])];

// ===== Д3: эффективность мероприятий 2026 =====
export function PastEffWidget() {
  return (
    <Box>
      <Sub>Эффективность мероприятий 2026 года (январь – октябрь) · ПАЭГТМ</Sub>
      <DataTable rows={PAST_EFF} pageSize={0} columns={[
        { field: 't', headerName: 'Вид мероприятия', minWidth: 150, flex: 1, renderCell: (p) => <b>{p.value}</b> },
        numCol('n', 'Выполнено', 0, { width: 96 }), numCol('plan', 'План, тыс. т', 1, { width: 100 }), numCol('fact', 'Факт, тыс. т', 1, { width: 100 }),
        { field: 'pct', headerName: 'Выполнение', width: 110, renderCell: (p) => <StatusChip tone={p.value >= 95 ? 'good' : p.value >= 80 ? 'warn' : 'crit'} label={p.value + ' %'} /> },
        { field: 'rent', headerName: 'Рентабельность', minWidth: 170, flex: 1 },
      ]} />
    </Box>
  );
}
// ===== Д3: варианты решений =====
export function PotVariantsWidget() {
  return (
    <Box>
      <Sub>Варианты решений · оценка эффекта ПАЭГТМ</Sub>
      <DataTable rows={POT_VARIANTS} pageSize={0} getRowClassName={(p) => (p.row.rec ? 'sel' : '')} columns={[
        { field: 't', headerName: 'Вариант', minWidth: 240, flex: 1, renderCell: (p) => <Box><b>{p.value}</b>{p.row.rec && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>рекомендуемый: наибольший прирост на единицу затрат</Typography>}</Box> },
        numCol('eff', 'Прирост, т/сут', 0, { valueFormatter: (v) => '+' + fmt(v) }), numCol('year', 'тыс. т/год', 1, { width: 100 }),
        numCol('capex', 'Затраты, млрд тг', 1, { width: 130 }), numCol('npv', 'NPV, млрд тг', 1, { width: 120 }),
      ]} />
    </Box>
  );
}

// ===== Д4: интегрированная модель актива =====
export function ImaScenWidget({ rec = true }) {
  return (
    <Box>
      <Sub>Сценарные расчёты ИМА · загрузка узких мест</Sub>
      <DataTable rows={SCEN} pageSize={0} getRowClassName={(p) => (rec && p.row.rec ? 'sel' : '')} columns={[
        { field: 't', headerName: 'Сценарий', minWidth: 190, flex: 1, renderCell: (p) => <Box><b>{p.value}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.row.d}</Typography></Box> },
        numCol('liq', 'Прирост жидкости, м³/сут', 0, { width: 130, valueFormatter: (v) => (v ? '+' + fmt(v) : 'без изменения') }),
        { field: 'dns3', headerName: 'ДНС-3', width: 80, renderCell: (p) => <StatusChip tone={ldTone(p.value)} label={p.value + ' %'} /> },
        { field: 'bkns1', headerName: 'БКНС-1', width: 86, renderCell: (p) => <StatusChip tone={ldTone(p.value)} label={p.value + ' %'} /> },
        { field: 'res', headerName: 'Решение', minWidth: 200, flex: 1.2 },
      ]} />
    </Box>
  );
}
export function ImaCalibWidget({ after = false }) {
  return (
    <Box>
      <Sub>Адаптация модели сети на замеры давления · сходимость {after ? `${IMA_CONV.before} % → ${IMA_CONV.after} %` : `${IMA_CONV.before} %`}</Sub>
      <DataTable rows={CALIB} pageSize={0} columns={[
        { field: 'n', headerName: 'Узел', flex: 1, minWidth: 140, renderCell: (p) => <b>{p.value}</b> },
        numCol('m', 'Замер, атм', 1, { width: 110 }), numCol('c', 'Расчёт, атм', 1, { width: 110 }),
        { field: 'dev', headerName: 'Невязка', width: 110, renderCell: (p) => <StatusChip tone={p.value > 5 ? 'crit' : p.value > 2 ? 'warn' : 'good'} label={fmt(p.value, 1) + ' %'} /> },
      ]} />
    </Box>
  );
}
export function NarrowsWidget() {
  return (
    <Box>
      <Sub>Узкие места по результатам расчёта сети</Sub>
      <Stack spacing={0.75}>{NARROWS.map(([tone, t, d, id]) => (
        <Stack key={t} direction="row" spacing={1.25} alignItems="flex-start" sx={{ fontSize: 13 }}>
          <StatusChip tone={tone} label={!id ? 'Риск отказа' : tone === 'crit' ? 'Предельная' : 'Повышенная'} sx={{ minWidth: 104 }} /><Box><b>{t}</b><Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{d}</Typography></Box>
        </Stack>))}</Stack>
    </Box>
  );
}
export const imaFacts = () => { const d = node('dns3'); return [['Скважин в модели', fmt(IMA_CONV.wells)], ['Сходимость расчёта сети', `${IMA_CONV.before} %`], ['ДНС-3', `загрузка ${d.ld} % · ${fmt(d.fact)} из ${fmt(d.cap)} м³/сут`], ['Потери из-за ограничения приёма', '186 т/сут']]; };

// ===== Д5: мероприятие и его расчёт =====
export function EventWidget({ obj, part = 'tech' }) {
  const e = eventOf(obj.id); const w = obj.well || WELLS.find((x) => e && x.id === e.well);
  if (!e) return null;
  return (
    <Box>
      {part === 'tech' && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
        <Box><Sub>Скважина {w ? w.id : e.well} · текущий режим</Sub><KV w="52%" rows={wellFacts(w).slice(0, 5)} /></Box>
        <Box><Sub>Технический потенциал · {e.kind}</Sub><KV w="52%" rows={e.tech} /></Box>
      </Box>}
      {part === 'scen' && <><Sub>Эффект мероприятия по сценариям · ПАЭГТМ</Sub>
        <DataTable rows={e.scen.map(([t, q, y, npv], k) => ({ id: k, t, q, y, npv, base: k === 1 }))} pageSize={0} getRowClassName={(p) => (p.row.base ? 'sel' : '')} columns={[
          { field: 't', headerName: 'Сценарий', flex: 1, minWidth: 150, renderCell: (p) => <b>{p.value}</b> },
          numCol('q', 'Прирост, т/сут', 1, { valueFormatter: (v) => '+' + fmt(v, 1) }), numCol('y', 'Доп. добыча за 12 мес., тыс. т', 1, { width: 170 }), numCol('npv', 'NPV, млн тг', 0),
        ]} /></>}
      {part === 'feas' && <><Sub>Возможность реализации в текущих условиях</Sub>
        <Stack spacing={0.6}>{e.feas.map(([t, ok]) => <Stack key={t} direction="row" spacing={1} alignItems="center" sx={{ fontSize: 13 }}><StatusChip tone={ok ? 'good' : 'crit'} label={ok ? 'Обеспечено' : 'Ограничение'} sx={{ minWidth: 110 }} /><span>{t}</span></Stack>)}</Stack></>}
      {part === 'infra' && e.infra && <><Sub>Варианты инфраструктурных решений</Sub>
        <DataTable rows={e.infra} pageSize={0} getRowClassName={(p) => (p.row.rec ? 'sel' : '')} columns={[
          { field: 't', headerName: 'Вариант', flex: 1, minWidth: 220, renderCell: (p) => <Box><b>{p.value}</b>{p.row.rec && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>рекомендуемый</Typography>}</Box> },
          numCol('cost', 'Затраты, млн тг', 0, { width: 130 }), { field: 'term', headerName: 'Срок', width: 90 }, { field: 'who', headerName: 'Оценка', width: 120 },
        ]} /></>}
    </Box>
  );
}
export const eventFacts = (obj) => { const e = eventOf(obj.id); if (!e) return obj.attrs || []; const b = e.scen[1]; return [['Мероприятие', `${e.title} · ${e.well}`], ['Эффект (базовый сценарий)', `+${fmt(b[1], 1)} т/сут · ${fmt(b[2], 1)} тыс. т за 12 мес.`], ['NPV', `${fmt(e.npv)} млн тг`], ['Затраты', `${fmt(e.capex)} млн тг`]]; };

// ===== Д7: энергоэффективность =====
export function UreWidget({ ngdu = 'НГДУ-2' }) {
  const r = rateOf(ngdu);
  return (
    <Box>
      <Sub>УРЭ на добычу жидкости, кВт·ч/т · {ngdu}: {fmt(r.u, 1)} при плане {fmt(r.pl, 1)} ({sgn(r.dvp, 1)} %, порог {URE_LIMIT} %)</Sub>
      <UreChart height={240} />
    </Box>
  );
}
export function RateWidget({ mark = 'НГДУ-2' }) {
  return (
    <Box>
      <Sub>Удельные показатели по НГДУ за октябрь 2026</Sub>
      <DataTable rows={RATE} pageSize={0} getRowClassName={(p) => (p.row.n === mark ? 'sel' : '')} columns={[
        { field: 'n', headerName: 'НГДУ', flex: 1, minWidth: 110, renderCell: (p) => <b>{p.value}</b> },
        numCol('u', 'УРЭ, кВт·ч/т', 1), numCol('pl', 'План, кВт·ч/т', 1),
        { field: 'dvp', headerName: 'Отклонение', width: 120, renderCell: (p) => <StatusChip tone={p.value > URE_LIMIT ? 'crit' : p.value > 0 ? 'warn' : 'good'} label={sgn(p.value, 1) + ' %'} /> },
        numCol('eff', 'КПД ЭЦН, %', 1),
      ]} />
    </Box>
  );
}
export function CausesWidget() {
  return (
    <Box>
      <Sub>Реестр причин отклонения УРЭ · НГДУ-2 · {sgn(sum(CAUSES.map((x) => x.v)), 1)} %</Sub>
      <DataTable rows={CAUSES} pageSize={0} columns={[
        { field: 't', headerName: 'Причина', flex: 1, minWidth: 220, renderCell: (p) => <Box><b>{p.value}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.row.src}</Typography></Box> },
        { field: 'obj', headerName: 'Объект', width: 130 },
        numCol('v', 'Вклад, п. п.', 1, { width: 110, valueFormatter: (v) => '+' + fmt(v, 1) }),
      ]} />
    </Box>
  );
}
export function PropsWidget({ cycle = true, cols = 'all' }) {
  const rows = PROPS.filter((m) => !cycle || m.cycle);
  return (
    <Box>
      <Sub>Предложения по сокращению энергопотребления{cycle ? ' · НГДУ-2' : ''}</Sub>
      <DataTable rows={rows} pageSize={0} columns={[
        { field: 't', headerName: 'Мероприятие', flex: 1, minWidth: 220, renderCell: (p) => <Box><b>{p.value}</b><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.row.obj}</Typography></Box> },
        numCol('eff', 'Эффект, млн кВт·ч/год', 1, { width: 140 }),
        ...(cols !== 'tech' ? [numCol('eco', 'Экономия, млн тг/год', 0, { width: 140 }), numCol('capex', 'Затраты, млн тг', 0, { width: 120 }), numCol('pb', 'Окупаемость, лет', 1, { width: 120 })] : []),
      ]} />
    </Box>
  );
}

// ===== Д8: участок трубопровода =====
export function PipeWidget({ obj, matrix = true }) {
  const x = pipeOfObj(obj.id); if (!x) return null; const t = riskTone(x.risk); const days = pipeDays(x);
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: matrix ? { xs: '1fr', md: '1fr 1fr' } : '1fr', gap: 2, mt: 1 }}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><StatusChip tone={t} label={`Риск ${x.risk} · ${RISK_T[t]}`} /><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{x.id} · {x.type}</Typography></Stack>
        <KV w="50%" rows={[['Участок', x.name], ['Подразделение', x.ngdu], ['Диаметр · протяжённость', `${x.d} мм · ${fmt(x.len, 1)} км`], ['Год ввода', String(x.year)], ['Остаточный ресурс', `${x.res} ${plural(x.res, 'год', 'года', 'лет')} · потеря стенки ${x.wall} %`], ['Срок диагностики', days < 0 ? `${dFmt(x.diag)} · просрочен` : `${dFmt(x.diag)} (${dRel(x.diag)})`], ['Отказов за 5 лет', String(x.fails)]]} />
        <Box sx={{ mt: 1.25 }}><Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>Остаточный ресурс до замены</Typography><Meter v={Math.min(100, x.res * 5)} tone={x.res <= 3 ? 'crit' : x.res <= 8 ? 'warn' : 'good'} h={8} /></Box>
      </Box>
      {matrix && <Box><Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.75 }}>Положение участка в матрице рисков (вероятность × последствия)</Typography><RiskMatrix mark={{ p: x.p, c: x.c }} /></Box>}
    </Box>
  );
}

// ===== Виджеты карточек объектов =====
export const PipeObjWidget = ({ obj }) => <Box sx={{ mb: 2, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e3e7ee' }}><PipeWidget obj={obj} /></Box>;
export function EnergyObjWidget({ obj }) {
  const ng = (obj.short.match(/НГДУ-\d/) || ['НГДУ-2'])[0];
  return <Box sx={{ mb: 2, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e3e7ee', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 2 }}><UreWidget ngdu={ng} /><CausesWidget /></Box>;
}
export const PotObjWidget = () => <Box sx={{ mb: 2, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e3e7ee' }}><PotScenWidget /></Box>;
export const ImaObjWidget = () => <Box sx={{ mb: 2, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e3e7ee', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}><NarrowsWidget /><ImaCalibWidget /></Box>;
export function EventObjWidget({ obj }) {
  const e = eventOf(obj.id); if (!e) return null;
  return <Box sx={{ mb: 2, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e3e7ee' }}><EventWidget obj={obj} part="tech" /><EventWidget obj={obj} part="scen" />{!e.ok && <EventWidget obj={obj} part="infra" />}</Box>;
}
