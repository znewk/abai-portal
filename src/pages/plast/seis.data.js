// Данные сейсморазведочных работ (процессы Г3.1 полевые работы, Г3.2 обработка, Г3.3 интерпретация):
// съёмки, суточные сводки план/факт, качество полевых данных, замечания подрядчику, опытные работы, этапы обработки и интерпретации,
// перспективные зоны. Общий источник для форм шагов, виджетов и карточек объектов — цифры совпадают с атрибутами объектов (story.js).
import { rng, dAdd, dFmt, sum, fmt } from '../../lib/format.js';

// ===== Съёмки =====
// stage: field — производственные полевые работы, trial — опытные работы, proc — обработка, interp — интерпретация
export const SURVEYS = {
  'seis:uzen-south-3d': { id: 'seis:uzen-south-3d', name: 'Узень-Юг', area: 210, party: 'Сейсморазведочная партия № 4', stage: 'field', start: -30, rate: 5.4, pvDens: 64, channels: 9600, year: 2026 },
  'seis:krm-3d': { id: 'seis:krm-3d', name: 'Карамандыбас', area: 140, party: 'Сейсморазведочная партия № 7', stage: 'trial', pvDens: 64, channels: 7200, year: 2026 },
  'seis:uzen-north-3d': { id: 'seis:uzen-north-3d', name: 'Узень-Север', area: 185, party: 'Сейсморазведочная партия № 2', proc: 'PGSK', stage: 'proc', pvDens: 64, channels: 9600, year: 2026, fieldEnd: -22, tb: 4.6 },
  'seis:uzen-centr-3d': { id: 'seis:uzen-centr-3d', name: 'Узень-Центр', area: 320, party: 'съёмка 2019 года', proc: 'PGSK', stage: 'interp', pvDens: 48, channels: 7680, year: 2019, tb: 6.2 },
};
export const survey = (id) => SURVEYS[id] || SURVEYS['seis:uzen-south-3d'];
export const pvTotal = (sv) => Math.round(sv.area * sv.pvDens);

// ===== Суточные сводки производственных работ (Узень-Юг: 30 суток, выполнено 142,8 км² из 210) =====
const DONE_KM2 = 142.8;
export const FIELD_DAYS = (() => {
  const sv = SURVEYS['seis:uzen-south-3d']; const r = rng('seis-field-us'); const n = -sv.start;
  const raw = Array.from({ length: n }, (_, k) => (k === 11 || k === 12 ? 0 : 3.6 + r() * 2.2));
  const k0 = DONE_KM2 / sum(raw);
  let acc = 0; let accPlan = 0;
  const days = raw.map((v, k) => {
    const fact = k === n - 1 ? +(DONE_KM2 - acc).toFixed(1) : +(v * k0).toFixed(1); acc = +(acc + fact).toFixed(1); accPlan = +(accPlan + sv.rate).toFixed(1);
    const bad = k >= 20 && k <= 22; const cond = fact ? +(bad ? 95.6 + r() * 0.8 : 97.4 + r() * 1.8).toFixed(1) : null;
    return { id: k + 1, day: k + 1, date: dAdd(sv.start + k), plan: sv.rate, fact, acc, accPlan, pv: Math.round(fact * sv.pvDens), cond, sn: fact ? +(bad ? 2.2 + r() * 0.2 : 2.7 + r() * 0.6).toFixed(1) : null, down: k === 11 || k === 12 ? 'Штормовое предупреждение, работы остановлены' : '' };
  });
  return days;
})();
// Итоги полевых работ на дату (по суточным сводкам)
export function fieldTotals(id) {
  const sv = survey(id);
  if (sv.stage !== 'field') { const done = sv.stage === 'trial' ? 0 : sv.area; return { done, pct: Math.round((done / sv.area) * 100), plan: done, lag: 0, pv: Math.round(done * sv.pvDens), pvPlan: pvTotal(sv), cond: sv.stage === 'trial' ? null : 98.1, sn: 3.0, rate: 0, end: null, endPlan: null }; }
  const d = FIELD_DAYS; const L = d[d.length - 1]; const worked = d.filter((x) => x.fact);
  const cond = sum(worked.map((x) => x.cond * x.fact)) / sum(worked.map((x) => x.fact));
  const rate = L.acc / d.length; const left = sv.area - L.acc;
  return { done: L.acc, pct: Math.round((L.acc / sv.area) * 100), plan: Math.min(sv.area, L.accPlan), lag: +(Math.min(sv.area, L.accPlan) - L.acc).toFixed(1), pv: sum(d.map((x) => x.pv)), pvPlan: pvTotal(sv), cond: +cond.toFixed(1), sn: +(sum(worked.map((x) => x.sn)) / worked.length).toFixed(1), rate: +rate.toFixed(2), end: dAdd(Math.ceil(left / rate)), endPlan: dAdd(sv.start + Math.ceil(sv.area / sv.rate) - 1), left: +left.toFixed(1) };
}
export const COND_MIN = 97; // допуск по доле кондиционных записей, %
export const lowDays = () => FIELD_DAYS.filter((x) => x.cond != null && x.cond < COND_MIN);

// Замечания по проведению работ (консолидируются ОМГ и направляются подрядчику)
export function remarksOf(id) {
  const sv = survey(id); if (sv.stage !== 'field') return [];
  const t = fieldTotals(id); const low = lowDays(); const bad = low.length ? +(100 - sum(low.map((x) => x.cond)) / low.length).toFixed(1) : 0;
  return [
    { src: 'Автопроверка полевых данных', who: 'КМГИ', t: `Доля некондиционных записей ${fmt(bad, 1)} % за ${dFmt(low[0].date)}–${dFmt(low[low.length - 1].date)} при допуске ${100 - COND_MIN} %`, req: 'Повторить отработку 3 линий приёма', term: dAdd(4) },
    { src: 'Экспертная проверка', who: 'КМГИ', t: 'Пропуск 46 пунктов возбуждения в охранной зоне ЛЭП 110 кВ без компенсирующих пунктов', req: 'Отработать компенсирующие пункты по схеме дизайна', term: dAdd(6) },
    { src: 'Реестр обязательств по контракту', who: 'КМГ', t: `Отставание от графика ${fmt(t.lag, 1)} км² (${fmt((t.lag / sv.area) * 100, 1)} % объёма)`, req: 'Ввести второй комплект вибраторов, график восстановления', term: dAdd(3) },
  ].map((x, k) => ({ id: k + 1, ...x }));
}

// ===== Опытные работы: варианты параметров возбуждения и приёма =====
export const TRIAL = {
  profiles: 4, km: 24,
  params: [['Свип-сигнал, Гц', '8–80', '6–96', '6–90'], ['Длительность свипа, с', '12', '16', '14'], ['Число накоплений', '4', '6', '4'], ['База группы приёмников, м', '12', '24', '24'], ['Шаг пунктов возбуждения, м', '50', '50', '50']],
  res: [{ v: 'Вариант А', sn: 2.4, band: '10–62 Гц', depth: 'XVI', cost: 100 }, { v: 'Вариант Б', sn: 3.2, band: '8–76 Гц', depth: 'XVIII', cost: 121 }, { v: 'Вариант В', sn: 3.0, band: '8–72 Гц', depth: 'XVIII', cost: 106, rec: true }],
};
export const PROD_PARAMS = [['Система наблюдений', 'ортогональная, 12 линий приёма × 10 линий возбуждения'], ['Плотность пунктов возбуждения', '64 на км²'], ['Кратность', '120'], ['Бин', '25 × 25 м'], ['Свип-сигнал', '6–90 Гц, 14 с, 4 накопления'], ['База группы приёмников', '24 м']];

// ===== Обработка (Г3.2): этапы со сроками; состояние — по записи процесса =====
export const PROC_STAGES = [
  { c: '3.2.3', t: 'Приёмка и проверка комплектности полевых данных', d: 7, out: 'Акт приёма-передачи' },
  { c: '3.2.4', t: 'Первичная подготовка данных', d: 8, out: 'Подготовленный массив данных' },
  { c: '3.2.5.1', t: 'Повышение качества сигнала', d: 21, out: 'Очищенные сейсмические данные' },
  { c: '3.2.6.1', t: 'Скоростная модель и статические поправки', d: 18, out: 'Скоростная модель, статические поправки' },
  { c: '3.2.7.1', t: 'Временная и глубинная миграция', d: 30, out: '3D-сейсмический куб' },
  { c: '3.2.8', t: 'Отчёт и цифровой комплект обработанных данных', d: 10, out: 'Раздел отчёта по обработке' },
];
export const PROC_START = -6; // начало графика обработки (приёмка данных), сут от демо-сегодня
export const PROC_QC = [['Отношение сигнал/помеха', '2,6 → 4,1'], ['Частотный диапазон', '8–72 Гц'], ['Вертикальная разрешённость', '12 м'], ['Трасс в обработке', '14,2 млн']];

// ===== Интерпретация (Г3.3): этапы, результаты =====
export const INT_STAGES = [
  { c: '3.3.2.1', t: 'Увязка новых и архивных сейсмических данных', d: 3, f: 3 },
  { c: '3.3.3.1', t: 'Скважинно-сейсмическая увязка', d: 4, f: 5 },
  { c: '3.3.4.1', t: 'Интерпретация горизонтов и разломов', d: 8, f: 8 },
  { c: '3.3.5.1', t: 'Структурные карты', d: 4, f: 3 },
  { c: '3.3.6.1', t: 'Сейсмофациальный и атрибутный анализ', d: 5, f: 5 },
  { c: '3.3.7.1', t: 'Количественная интерпретация: AVO-анализ, инверсия', d: 6, f: 5 },
  { c: '3.3.8.1', t: 'Прогноз фильтрационно-ёмкостных свойств', d: 4, f: 4 },
  { c: '3.3.9.1', t: 'Сводный пакет для геомодели и ЦРНС', d: 2, f: 2 },
  { c: '3.3.10.1', t: 'Перспективные зоны и рекомендации', d: 2, f: 1 },
  { c: '3.3.11.1', t: 'Отчёт по интерпретации', d: 3, f: 2 },
];
export const INT_START = -42;
export const HORIZONS = [['XIII', 98, 6], ['XIV', 99, 9], ['XV', 97, 8], ['XVI', 96, 7], ['XVII', 94, 5], ['XVIII', 91, 3]].map(([h, pick, faults], k) => ({ id: k + 1, h, pick, faults }));
export const TIE = { wells: 27, corr: 0.81, misfit: 3.8, ctrl: 214 };
export const ZONES = [
  { id: 'ПЗ-1', t: 'Южная периклиналь', h: 'XIV', area: 6.8, res: 412, p: 0.62 },
  { id: 'ПЗ-2', t: 'Восточное крыло', h: 'XIII', area: 4.1, res: 236, p: 0.55 },
  { id: 'ПЗ-3', t: 'Зона выклинивания', h: 'XVI', area: 3.2, res: 158, p: 0.41 },
  { id: 'ПЗ-4', t: 'Приразломная зона', h: 'XV', area: 2.6, res: 121, p: 0.38 },
];
export const zonesTotal = () => ({ n: ZONES.length, area: +sum(ZONES.map((z) => z.area)).toFixed(1), res: sum(ZONES.map((z) => z.res)) });
export const CRNS_LAYERS = [['Структурные карты по кровле горизонтов XIII–XVIII', '6 карт', 'GRD'], ['Карты разломов', '38 разломов', 'SHP'], ['Атрибутные карты: RMS-амплитуда, когерентность', '12 карт', 'GRD'], ['Прогноз эффективных толщин', '6 карт', 'GRD'], ['Вероятностные карты коллектора', '6 карт', 'GRD'], ['Контуры перспективных зон', '4 зоны', 'SHP']].map(([t, n, f], k) => ({ id: k + 1, t, n, f }));

// ===== Состояние этапов по записи процесса: done · cur · plan; плановые даты от начала графика =====
export function stageRows(stages, start, run) {
  let at = start; let fat = start;
  return stages.map((x, k) => {
    const from = dAdd(at); const to = dAdd(at + x.d); at += x.d;
    const ffrom = x.f != null ? dAdd(fat) : null; const fto = x.f != null ? dAdd(fat + x.f) : null; if (x.f != null) fat += x.f;
    let st = '';
    if (run) {
      const P = run.P; const idx = P.s.findIndex((s) => s.c === x.c);
      if (run.active.some((a) => a.i === idx)) st = 'cur';
      else if (run.done.some((d) => d.i === idx) || run.status === 'done') st = 'done';
    }
    return { id: k + 1, ...x, from, to, ffrom, fto, st };
  });
}
export const ST_T = { done: ['Выполнен', 'good'], cur: ['В работе', 'info'], '': ['Запланирован', ''] };
