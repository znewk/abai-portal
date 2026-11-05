// Демонстрационные данные ИС ЦД Актива: роли, ДЗО, фонд скважин, ряды добычи, задачи (из шагов BPMN Dream TO BE),
// экземпляры процессов, отклонения, уведомления. Всё детерминировано (rng с фиксированным зерном).
import BPMN from './bpmn.js';
import { rng, series, last, pick, dAdd, dayLabels, TODAY } from '../lib/format.js';
import { HERO_WELLS, HERO_ALERTS, TWINS_SPEC } from './story.js';
export { NOUN, OBJECTS, ADMIN_TASKS } from './story.js';
export { BPMN };
// ===== Роли (дорожки BPMN Dream TO BE → роль портала) =====
export const ROLES = [
  { id: 'kmg', name: 'Департамент добычи и разработки', org: 'АО НК «КазМунайГаз»', short: 'КМГ', level: 'Корпоративный центр', color: '#0c2340', ini: 'КМГ', asset: 'all',
    desc: 'Сводная картина по ДЗО: добыча, производственная программа, профиль добычи, согласование программ ГТМ и ПП.',
    lane: (p, r) => /^(КМГ|Дирекция · КМГ|Департаменты · КМГ|БЭиФ · КМГ|ДАЦ)$/.test(r) },
  { id: 'kmgi', name: 'Инженерный центр', org: 'ТОО «КМГ Инжиниринг»', short: 'КМГИ', level: 'Отраслевой инженерный центр', color: '#5b4aa8', ini: 'КИ', asset: 'all',
    desc: 'Экспертиза и методика: эффект ГТМ по единой методике, проверка профилей и проектных решений, сопровождение моделей.',
    lane: (p, r) => /^(КМГИ|Департаменты · КМГИ|Дирекция · КМГИ|БЭиФ · КМГИ)/.test(r) },
  { id: 'dzo', name: 'Департамент добычи нефти и газа', org: 'АО «Озенмунайгаз»', short: 'ОМГ · ДДНГ', level: 'ДЗО', color: '#0f7a55', ini: 'ДД', asset: 'omg',
    desc: 'Управление добычей ДЗО: потенциал, мероприятия, ИМА, механизированный фонд, производственная программа.',
    lane: (p, r) => /^(ДДНГ|Дирекция · ОМГ|Департаменты · ОМГ|Департаменты$|Дирекция$|Дирекции$|ДТТД|ДТРС|ДКС|ДОМ|ДОУП|МЭД|ДБиИА|ДБиЭА|ОКиУР|УТТД)/.test(r) || (r === 'ОМГ (ДЗО)' && /^(Д|Р2|Р3)/.test(p)) },
  { id: 'geo', name: 'Геология и разработка месторождений', org: 'АО «Озенмунайгаз»', short: 'ОМГ · геология и разработка', level: 'ДЗО', color: '#0e7490', ini: 'ГР', asset: 'omg',
    desc: 'Геологическое изучение, геомодели, точки бурения, система разработки, программа ГТМ, оптимизация ППД.',
    lane: (p, r) => /^(ДГиГ|ДРМ|Геологи ОМГ|ДДНГ \/ ДРМ)/.test(r) || (r === 'ОМГ (ДЗО)' && /^(Г|Р1|Р4)/.test(p)) },
  { id: 'nipi', name: 'Проектирование и моделирование', org: 'КазНИПИмунайгаз', short: 'КазНИПИ', level: 'Проектный институт', color: '#9c4221', ini: 'КН', asset: 'omg',
    desc: 'Геологические и гидродинамические модели, проектные документы, варианты системы разработки, проектирование скважин.',
    lane: (p, r) => /^КазНИПИ/.test(r) },
  { id: 'drill', name: 'Строительство и освоение скважин', org: 'АО «Озенмунайгаз»', short: 'ОМГ · бурение и ВСР', level: 'ДЗО', color: '#b7791f', ini: 'БС', asset: 'omg',
    desc: 'Проектирование и подготовка к бурению, мониторинг бурения, освоение, планирование и контроль бригад ВСР.',
    lane: (p, r) => (r === 'ОМГ (ДЗО)' || r === 'Маркшейдеры') && /^Б/.test(p) },
  { id: 'cits', name: 'Центральная инженерно-технологическая служба', org: 'АО «Озенмунайгаз» · НГДУ-1', short: 'ЦИТС НГДУ', level: 'НГДУ', color: '#1c5cab', ini: 'ЦТ', asset: 'omg',
    desc: 'Оперативное управление промыслом: суточная добыча, отклонения от режима, механизированный фонд, замеры и качество данных.',
    lane: (p, r) => /^(ЦИТС НГДУ|Цеха НГДУ|Службы НГДУ|НГДУ|Лаборатория НГДУ|Геол\. служба НГДУ|Служба ГМ|КФК)$/.test(r) },
  { id: 'contr', name: 'Подрядная организация', org: 'Сервисные подрядчики: бурение, ТКРС, сейсморазведка', short: 'Подрядчик', level: 'Внешний участник', color: '#6b7383', ini: 'ПО', asset: 'omg',
    desc: 'Ограниченный доступ: суточные рапорты, загрузка полевых и скважинных данных, дизайн ГНО, наряд-заказы.',
    lane: (p, r) => /^(Подрядная организация|PGSK|Буровая бригада подрядчика|ПО)$/.test(r), limited: true },
  { id: 'admin', name: 'Администрирование данных ЦД', org: 'Служба ИТ · КХД и ABAI БД 2.0', short: 'Администратор', level: 'Сопровождение', color: '#3d4656', ini: 'АД', asset: 'all',
    desc: 'Интеграции КХД, качество и полнота данных, справочники, права доступа и журнал изменений.',
    lane: () => false },
];

// ===== ДЗО и месторождения =====
export const ASSETS = [
  { id: 'all', name: 'Все ДЗО', short: 'Все ДЗО' },
  { id: 'omg', name: 'АО «Озенмунайгаз»', short: 'ОМГ', fields: ['Узень', 'Карамандыбас'], k: 1 },
  { id: 'emg', name: 'АО «Эмбамунайгаз»', short: 'ЭМГ', fields: ['Восточный Молдабек', 'Кенбай'], k: 0.52 },
];
export const NGDU = ['НГДУ-1', 'НГДУ-2', 'НГДУ-3', 'НГДУ-4'];

// ===== Фонд скважин (демонстрационный участок месторождения) =====
export const WELLS = (() => {
  const r = rng('wells-uzen'); const out = [];
  const shape = (x, y) => { const dx = (x - 500) / 430, dy = (y - 280) / 215; return dx * dx + dy * dy + 0.18 * Math.sin(x / 70) * dx < 1; };
  let i = 0;
  while (out.length < 96 && i < 4000) {
    i++;
    const x = 80 + r() * 840, y = 70 + r() * 420; if (!shape(x, y)) continue;
    if (out.some((w) => Math.hypot(w.x - x, w.y - y) < 38)) continue;
    const inj = r() < 0.27; const fld = x < 300 && y > 260 ? 'Карамандыбас' : 'Узень';
    const num = (fld === 'Узень' ? 1000 : 300) + Math.floor(r() * 8000 / (fld === 'Узень' ? 1 : 10));
    const ng = NGDU[Math.min(3, Math.floor((x - 80) / 215))];
    const st = r(); const status = st < 0.78 ? 'work' : st < 0.86 ? 'idle' : st < 0.93 ? 'repair' : st < 0.965 ? 'drill' : 'osv';
    const method = inj ? 'Нагнетательная' : r() < 0.62 ? 'ЭЦН' : r() < 0.85 ? 'ШГН' : 'Фонтан';
    const qL = inj ? 0 : Math.round(20 + r() * 140); const wc = inj ? 0 : Math.round(62 + r() * 34); const qO = inj ? 0 : +(qL * (1 - wc / 100) * 0.86).toFixed(1);
    const risk = inj ? 0 : Math.round(Math.pow(r(), 2.2) * 92);
    out.push({
      id: (fld === 'Узень' ? 'УЗН-' : 'КРМ-') + num, fld, ngdu: ng, gzu: 'ГЗУ-' + (100 + Math.floor((x / 1000) * 30) + Math.floor((y / 600) * 4) * 30), x: Math.round(x), y: Math.round(y),
      type: inj ? 'inj' : 'prod', method, status: status === 'drill' || status === 'osv' ? status : status,
      qL, wc, qO, qInj: inj ? Math.round(80 + r() * 260) : 0, pPl: Math.round(95 + r() * 55), pZab: Math.round(40 + r() * 45),
      hDyn: inj ? 0 : Math.round(600 + r() * 700), pump: method === 'ЭЦН' ? pick(r, ['ЭЦН5-45-1500', 'ЭЦН5-60-1350', 'ЭЦН5А-80-1400', 'ЭЦН5-125-1200']) : method === 'ШГН' ? pick(r, ['НН2Б-44', 'НН2Б-57', 'НВ1Б-38']) : '—',
      mtbf: Math.round(280 + r() * 520), risk, depth: Math.round(1150 + r() * 350), year: 1966 + Math.floor(r() * 58), horizon: pick(r, ['XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII']),
      dev: !inj && status === 'work' && r() < 0.16,
    });
  }
  // Скважины-герои сюжета: заменяют сгенерированные того же типа, сохраняя положение на схеме
  const used = new Set();
  HERO_WELLS.forEach((h) => {
    const free = (x) => !used.has(x) && x.type === h.type && !HERO_WELLS.some((y) => y.id === x.id);
    let w = null;
    if (h.injIdx != null) { const slot = out.filter((x) => x.type === 'inj')[h.injIdx]; const ex = out.find((x) => x.id === h.id); if (ex && slot && ex !== slot) ex.id = slot.id; w = slot; }
    w = w || out.find((x) => x.id === h.id && !used.has(x)) || out.find((x) => free(x) && x.status === h.status) || out.find((x) => free(x) && (h.type === 'inj' || x.status === 'work'));
    if (!w) return; used.add(w);
    const qL = h.qL ?? w.qL, wc = h.wc ?? w.wc;
    Object.assign(w, { ...h, x: w.x, y: w.y, qL, wc, qO: h.type === 'inj' || h.status === 'drill' || h.status === 'osv' ? 0 : +(qL * (1 - wc / 100) * 0.86).toFixed(1), qInj: h.qInj ?? (h.type === 'inj' ? w.qInj : 0), dev: !!h.dev, hero: true });
    if (h.status === 'drill' || h.status === 'osv' || h.status === 'plan') Object.assign(w, { qL: 0, wc: 0, qO: 0, hDyn: 0, risk: 0, pump: '—', mtbf: 0 });
  });
  return out;
})();
export const WELL = (id) => WELLS.find((w) => w.id === id);
export const W_ST = { work: ['В работе', 'good'], idle: ['Простой', 'warn'], repair: ['Ремонт (ТКРС)', 'serious'], drill: ['Бурение', 'info'], osv: ['Освоение', 'info'], plan: ['Проектная', ''] };

// ===== Добыча: ряды за 60 суток + прогноз 30 суток =====
export const PROD = (() => {
  const nF = 60, nP = 30;
  const mk = (aid) => {
    const k = (ASSETS.find((a) => a.id === aid) || {}).k ?? 1.52;
    const plan = series('plan' + aid, nF + nP, 14250 * k, 0.004, -0.01).map((v) => Math.round(v));
    const fact = series('fact' + aid, nF, 14080 * k, 0.012, -0.012).map((v) => Math.round(v));
    fact[47] = Math.round(fact[47] * 0.955); fact[48] = Math.round(fact[48] * 0.968); // остановка ДНС-3
    const base = last(fact);
    const fc = Array.from({ length: nP }, (_, i) => Math.round(base * (1 - 0.0004 * i) + (i > 9 ? 120 * k : i * 12 * k)));
    const lo = fc.map((v, i) => Math.round(v * (1 - 0.006 - i * 0.0009))); const hi = fc.map((v, i) => Math.round(v * (1 + 0.004 + i * 0.0007)));
    const liq = fact.map((v, i) => Math.round(v / (1 - 0.888 + 0.0002 * Math.sin(i)) / 0.86));
    const gas = fact.map((v) => Math.round(v * 0.098));
    const inj = series('inj' + aid, nF, 128600 * k, 0.01).map((v) => Math.round(v));
    return { plan, fact, fc, lo, hi, liq, gas, inj, wc: series('wc' + aid, nF, 88.6, 0.002, 0.003).map((v) => +v.toFixed(1)) };
  };
  const omg = mk('omg'), emg = mk('emg'); const all = {};
  Object.keys(omg).forEach((k) => { all[k] = omg[k].map((v, i) => (k === 'wc' ? +((v * omg.liq[i] + emg[k][i] * emg.liq[i]) / (omg.liq[i] + emg.liq[i])).toFixed(1) : v + emg[k][i])); });
  return { omg, emg, all, nF, nP, labels: dayLabels(nF + nP, nP) };
})();
export const prodOf = (asset) => PROD[asset] || PROD.omg;

// ===== Отклонения (ТР 2.0 → карточка отклонения → мероприятие): сюжетные + по скважинам с признаком отклонения =====
export const ALERTS = (() => {
  const base = HERO_ALERTS.map(([id, well, ngdu, t, tone, kind, hours, val, loss, st]) => ({ id, well, ngdu, t, tone, kind, since: new Date(TODAY - hours * 36e5), val, loss, st }));
  const r = rng('alerts'); const heroIds = new Set(HERO_ALERTS.map((a) => a[1]));
  const kinds = [['Снижение дебита жидкости', 'crit', 'qL'], ['Рост обводнённости', 'serious', 'wc'], ['Отклонение от технологического режима', 'serious', 'tr'], ['Нет замера более 3 суток', 'warn', 'meas']];
  const extra = WELLS.filter((w) => w.dev && !heroIds.has(w.id)).slice(0, 5).map((w, i) => {
    const k = kinds[i % kinds.length]; const ago = 20 + Math.floor(r() * 90);
    return { id: 'ОТК-' + (2370 + i * 3), well: w.id, ngdu: w.ngdu, t: k[0], tone: k[1], kind: k[2], since: new Date(TODAY - ago * 36e5), val: k[2] === 'qL' ? -Math.round(10 + r() * 20) : k[2] === 'wc' ? +(2 + r() * 4).toFixed(1) : null, loss: k[2] === 'meas' ? 0 : +(0.8 + r() * 4).toFixed(1), st: ['Новое', 'Карточка отклонения', 'Мероприятие в ПАЭГТМ'][i % 3] };
  });
  return base.concat(extra).sort((a, b) => b.since - a.since);
})();

export const T_ST = { new: ['Новая', 'info'], work: ['В работе', ''], sign: ['На подписании', 'warn'], done: ['Выполнена', 'good'], late: ['Просрочена', 'crit'], rework: ['На доработке', 'serious'] };

// ===== Состояние двойников (ИМА) =====
export const TWINS = TWINS_SPEC.map((t) => ({ ...t, c: { skv: '#9c4221', plast: '#0e7490', dob: '#0f7a55' }[t.id], upd: dAdd(t.upd) }));

// ===== Уведомления: [тон, заголовок, подпись, маршрут] =====
export const NOTIFS = [
  ['crit', 'Срыв подачи ЭЦН на УЗН-4471', 'ABAI ТР 2.0 · 08:52 · создана карточка отклонения ОТК-2407', '/m/skv/wells/УЗН-4471'],
  ['info', 'Опубликована геологическая модель Узень v.2026.3', 'ABAI ЦРНС 2.0 · вчера · запущен пересчёт ИИ-ранжирования секторов', '/m/plast/obj/model:uzen-2026.3'],
  ['warn', 'Суточная сводка НГДУ-1 за 02.11 ожидает подтверждения ДОУП', 'ABAI ПДИМ 2.0 · 07:30', '/m/dob/obj/sum:НГДУ-1:02.11'],
  ['good', 'Расчёт эффекта по Программе ГТМ 2027 передан на согласование КазНИПИ и КМГИ', 'ABAI ПАЭГТМ · 30 окт', '/m/plast/obj/prog:gtm-2027'],
  ['info', 'Суточный рапорт по УЗН-7455 сформирован автоматически', 'ABAI Цифровое бурение · 06:00', '/m/skv/wells/УЗН-7455'],
  ['warn', 'Срок диагностики нефтепровода ДНС-3 – ЦППН через 12 дней', 'ABAI ПДИМ 2.0 · целостность трубопроводов', '/m/dob/obj/pipe:ДНС-3–ЦППН'],
];

// ===== Модули (части ЦД) и их процессы: Бурение → ЦД скважины, Геология и Разработка → ЦД пласта, Добыча → ЦД добычи =====
export const PARTS = [
  { id: 'skv', t: 'ЦД скважины', s: 'ЦД скважины', dirs: ['burenie'], c: '#9c4221', sys: 'ABAI Цифровое бурение · Цифровой мониторинг ТКРС · БД 2.0' },
  { id: 'plast', t: 'ЦД пласта', s: 'ЦД пласта', dirs: ['geologiya', 'razrabotka'], c: '#0e7490', sys: 'ABAI ЦРНС 2.0 · УЗ 2.0 · ПАЭГТМ' },
  { id: 'dob', t: 'ЦД добычи и наземной инфраструктуры', s: 'ЦД добычи', dirs: ['dobycha'], c: '#0f7a55', sys: 'ABAI ПДИМ 2.0 · ТР 2.0 · ПГНО · Наземная инфраструктура' },
  { id: 'data', t: 'Единые данные ЦД', s: 'Единые данные', dirs: ['data'], c: '#5b4aa8', sys: 'КХД · ABAI БД 2.0' },
];
export const partOfDir = (m) => (PARTS.find((p) => p.dirs.includes(m)) || {}).id;
export const partOfProc = (code) => { const P = BPMN.find((x) => x.p === code); return P ? partOfDir(P.m) : null; };
// Задача → модуль (задачи администратора — «Единые данные»)
export const partOfTask = (t) => (t.p ? partOfProc(t.p) : 'data');
