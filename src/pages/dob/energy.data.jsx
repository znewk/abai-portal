// Данные энергоэффективности (Д7): УРЭ по месяцам, потребление по видам, рейтинг НГДУ, предложения по энергосбережению,
// данные АСКУЭ / АСТУЭ. Общие для рабочего места «Энергоэффективность», форм шагов Д7 и карточки en:НГДУ-2.
import { Box } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { NGDU } from '../../data/core.js';
import { rng, series, MON, fmt, sum, TODAY } from '../../lib/format.js';
import { C } from '../../theme.js';

export const MONTHS = Array.from({ length: 12 }, (_, i) => { const d = new Date(2025, 10 + i, 1); return `${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; });
export const FACT = series('db2-ure', 12, 11.9, 0.012, -0.045).map((v, i) => +(v + (i === 7 ? 0.35 : 0)).toFixed(2));
export const PLAN = series('db2-ure-p', 12, 11.85, 0.002, -0.03).map((v) => +v.toFixed(2));
export const CONS = [['Установки ЭЦН', 52.1], ['Система ППД (БКНС)', 28.4], ['Установки ШГН', 20.1], ['ДНС и ЦППН', 10.7], ['Прочие потребители', 7.1]];
export const CONS_TOT = sum(CONS.map((x) => x[1]));

// Рейтинг НГДУ по удельному расходу электроэнергии, кВт·ч/т жидкости (НГДУ-2 — объект «Энергопотребление НГДУ-2»)
export const RATE = NGDU.map((n, i) => { const u = [10.9, 12.0, 11.9, 11.2][i]; const pl = [11.1, 11.3, 11.4, 11.3][i]; return { id: n, n, u, pl, dv: +(u - pl).toFixed(1), dvp: +(((u - pl) / pl) * 100).toFixed(1), eff: [43.1, 40.2, 38.4, 42.6][i], plan11: [37.2, 31.8, 29.5, 19.9][i] }; })
  .sort((a, b) => a.dvp - b.dvp).map((x, i) => ({ ...x, rank: i + 1 }));
export const rateOf = (ngdu) => RATE.find((x) => x.n === ngdu) || RATE[0];
// Порог существенного отклонения УРЭ от плана
export const URE_LIMIT = 3;

// Причины отклонения УРЭ НГДУ-2 (реестр причин): вклад в отклонение, п. п.
export const CAUSES = [
  { id: 1, t: 'Установки ЭЦН с КПД ниже 35 %', obj: '27 скважин', v: 2.9, src: 'режимы насосов — ABAI ТР 2.0' },
  { id: 2, t: 'Дросселирование на выкиде насосных агрегатов БКНС-2', obj: 'БКНС-2', v: 1.6, src: 'режим закачки — ABAI УЗ 2.0' },
  { id: 3, t: 'Низкий коэффициент мощности (cos φ 0,81)', obj: 'ДНС-2', v: 0.9, src: 'профили АСКУЭ' },
  { id: 4, t: 'Рост объёма добываемой жидкости при росте обводнённости', obj: 'фонд НГДУ-2', v: 0.8, src: 'ABAI ПДИМ 2.0' },
];

// Предложения по энергосбережению. cycle — предложение текущего цикла по НГДУ-2: статус берётся из записи процесса
export const PROPS = [
  ['Перевод ЭЦН на частотно-регулируемый привод', '42 скважины НГДУ-1, НГДУ-3', 6.8, 142, 1.9, 'Включено в программу 2026', false],
  ['Оптимизация режимов БКНС-2 по рекомендации УЗ 2.0', 'БКНС-2 · НГДУ-2', 4.1, 86, 0.4, '', true],
  ['Замена ЭЦН с низким КПД при плановом ремонте', '27 скважин НГДУ-2', 3.6, 75, 2.6, '', true],
  ['Компенсация реактивной мощности', 'ДНС-2 · НГДУ-2', 1.9, 40, 1.2, '', true],
  ['Перевод малодебитных скважин на периодический режим', '38 скважин ШГН НГДУ-4', 2.4, 50, 0.3, 'Реализуется', false],
].map(([t, obj, eff, eco, pb, st, cycle], i) => ({ id: i, t, obj, eff, eco, pb, st, cycle, capex: Math.round(eco * pb) }));
export const PROPS_EFF = +sum(PROPS.map((m) => m.eff)).toFixed(1);
export const PROPS_ECO = sum(PROPS.map((m) => m.eco));

// Статус предложения текущего цикла по состоянию записи Д7
export function propStage(run) {
  if (!run) return ['Анализ причин', ''];
  const done = new Set(run.done.map((d) => run.P.s[d.i].c)); const act = new Set(run.active.map((a) => run.P.s[a.i].c));
  if (run.status === 'done' || done.has('7.7')) return ['Включено в программу', 'good'];
  if (act.has('7.7')) return ['Формирование программы', 'info'];
  if (act.has('7.6.1') || act.has('7.6.2')) return ['Оценка целесообразности', 'warn'];
  if (done.has('7.5')) return ['Предложено', 'info'];
  return ['Анализ причин', ''];
}

// Обмен данными учёта электроэнергии
export const FEED = (() => {
  const r = rng('db2-feed'); const objs = ['ПС 110/35/6 кВ «Узень»', 'ПС 35/6 кВ ДНС-1', 'ПС 35/6 кВ ДНС-3', 'ПС 35/6 кВ БКНС-1', 'Фидер 6 кВ ГЗУ-142', 'Фидер 6 кВ ГЗУ-172', 'ПС 35/6 кВ ЦППН'];
  return objs.map((o, i) => ({ id: i, o, src: i % 3 === 1 ? 'АСТУЭ' : 'АСКУЭ', t: new Date(TODAY - (i === 5 ? 5.2 : 0.3 + r() * 0.6) * 36e5), u: +(/110/.test(o) ? 109.6 + r() * 0.8 : /Фидер/.test(o) ? 6.1 + r() * 0.3 : 35.2 + r()).toFixed(1), cur: Math.round(80 + r() * 400), cos: +(0.82 + r() * 0.13).toFixed(2), ok: i !== 5 }));
})();
// Аварийные отключения за период (ДОУП)
export const OUTAGES = [
  { id: 1, o: 'ПС 35/6 кВ ДНС-3', d: '14.06.2026', dur: '3 ч 40 мин', why: 'Отключение по защите от перегрузки', loss: 412 },
  { id: 2, o: 'Фидер 6 кВ ГЗУ-172', d: '02.10.2026', dur: '1 ч 15 мин', why: 'Повреждение изолятора', loss: 96 },
  { id: 3, o: 'ПС 35/6 кВ БКНС-1', d: '27.10.2026', dur: '0 ч 50 мин', why: 'Плановое переключение', loss: 0 },
];
// Результат реализованных мероприятий (контроль): УРЭ до и после
export const RESULTS = [
  { id: 1, t: 'Перевод ЭЦН на частотно-регулируемый привод', obj: '42 скважины', before: 12.4, after: 11.1 },
  { id: 2, t: 'Компенсация реактивной мощности ДНС-4', obj: 'ДНС-4', before: 11.6, after: 11.3 },
];

// УРЭ: факт и план по месяцам
export function UreChart({ height = 280 }) {
  const data = MONTHS.map((x, i) => ({ x, f: FACT[i], p: PLAN[i] }));
  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="x" interval={0} tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={{ stroke: '#d5d9e0' }} />
          <YAxis width={48} tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} domain={[10.8, 12.6]} ticks={[10.8, 11.1, 11.4, 11.7, 12, 12.3, 12.6]} tickFormatter={(v) => fmt(v, 1)} />
          <Tooltip formatter={(v) => fmt(v, 2) + ' кВт·ч/т'} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e3e7ee' }} />
          <Legend verticalAlign="top" align="left" iconSize={10} wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} formatter={(v) => <span style={{ color: C.ink2 }}>{v}</span>} />
          <ReferenceLine x={MONTHS[7]} stroke={C.ink2} strokeDasharray="3 3" label={{ value: 'Отключения ДНС-3', position: 'insideBottomRight', fontSize: 11, fill: C.ink2 }} />
          <Line dataKey="f" name="Факт" stroke={C.s[0]} strokeWidth={2} dot={{ r: 3, fill: C.s[0], strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
          <Line dataKey="p" name="План" stroke={C.s[1]} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} legendType="plainline" />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
