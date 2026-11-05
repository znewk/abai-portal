// Данные бурения (ABAI Цифровое бурение, процесс Б3): буровые, проектный и фактический график, отклонения, баланс времени.
import { WELLS } from '../../data/core.js';
import { rng, fmt, last } from '../../lib/format.js';

const RIGS = { 'УЗН-7455': ['ZJ-40 № 12', 'Буровой подрядчик № 1', 9, -0.02], 'КРМ-761': ['БУ-3000 ЭУК № 7', 'Буровой подрядчик № 2', 14, -0.07], 'УЗН-9387': ['ZJ-30 № 5', 'Буровой подрядчик № 1', 6, 0.025] };
// Скважины в бурении: проектный график (ГТН) и факт по данным ГТИ
export const DRILL = WELLS.filter((w) => w.status === 'drill').map((w, k) => {
  const [rig, ctr, cur, lag] = RIGS[w.id] || [['ZJ-40 № 3', 'БУ-2900 № 2'][k % 2], 'Буровой подрядчик № 3', 4 + (k % 7), -0.03];
  const r = rng('drill' + w.id); const days = 18 + Math.floor(r() * 6);
  const plan = Array.from({ length: days + 1 }, (_, i) => Math.round(w.depth * Math.min(1, i < 2 ? i * 0.025 : i < 5 ? 0.05 + (i - 2) * 0.14 : i < 7 ? 0.47 : 0.47 + (i - 7) * (0.53 / (days - 9)))));
  const fact = plan.slice(0, cur + 1).map((v, i) => Math.round(Math.max(0, v * (1 + lag * (i / Math.max(1, cur)) - (i > 3 ? 0.03 * r() : 0)))));
  return { id: w.id, fld: w.fld, depth: w.depth, rig, ctr, days, cur, plan, fact, bh: last(fact), bhPlan: plan[cur], kust: 110 + k * 4, daily: fact[cur] - fact[cur - 1] };
});
export const drillOf = (id) => DRILL.find((d) => d.id === id) || DRILL[0];
// Отклонения по скважине: [название, величина, тон, статус, закрыто]
export const devs = (d) => {
  const r = rng('dv' + d.id);
  return [
    ['Превышение нормы времени на интервале ' + fmt(Math.round(d.depth * 0.45)) + '–' + fmt(Math.round(d.depth * 0.55)) + ' м', '+' + (4 + Math.floor(r() * 6)) + ' ч', 'serious', 'Корректирующие мероприятия согласованы', true],
    ['Поглощение бурового раствора', fmt(2 + r() * 3, 1) + ' м³/ч', 'warn', 'Мероприятия на согласовании ДЗО (3.7)', false],
    ['Отклонение зенитного угла от проектного профиля', fmt(0.6 + r(), 1) + '°', 'warn', 'Мероприятие исполнено (3.8)', true],
  ].map(([t, v, tone, st, ok], i) => ({ id: 'ОТБ-' + d.id.replace(/\D/g, '') + i, t, v, tone, st, ok }));
};
export const RT = [['Нагрузка на долото', 'т', 12], ['Частота вращения ротора', 'об/мин', 85], ['Давление на стояке', 'атм', 118], ['Расход бурового раствора', 'л/с', 32]];
export const BAL = [['Бурение', 13.5], ['Спуско-подъёмные операции', 5], ['Промывка и проработка', 2.5], ['Подготовительно-заключительные работы', 1.5], ['Непроизводительное время', 1.5]];
export const opOf = (d) => (d.cur < 7 ? 'бурение под кондуктор' : 'бурение под эксплуатационную колонну');
