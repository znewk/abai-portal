// Исполнение процессов: экземпляры с несколькими активными шагами (токены), развилки и слияния по BPMN,
// адресный возврат на доработку, нормативные сроки и просрочки, журнал, задачи ролей, объекты экземпляров.
import { BPMN, WELLS, W_ST, OBJECTS, NOUN, ADMIN_TASKS, partOfProc } from './core.js';
import { STORY_RUNS, SLA, SLA_OPS } from './story.js';
import { TODAY, dAdd, rng } from '../lib/format.js';

export const procOf = (code) => BPMN.find((P) => P.p === code);
// Адрес шага: код BPMN или #индекс (для шагов без кода)
export const stepKey = (P, i) => P.s[i].c || '#' + i;
export const stepIdx = (P, key) => (String(key).startsWith('#') ? +String(key).slice(1) : P.s.findIndex((s) => s.c === key));
const numNx = (s) => s.nx.filter((x) => typeof x[0] === 'number');
const numPv = (s) => s.pv.filter((x) => typeof x[0] === 'number');
const norm = (v) => String(v == null ? '' : v).trim().toLowerCase();

// Демо-часы: дата демо-«сегодня», текущее время суток
export const nowDemo = () => { const n = new Date(); const d = new Date(TODAY); d.setHours(n.getHours(), n.getMinutes(), n.getSeconds()); return d; };
const NOW = () => nowDemo();

// ===== Тип шага → форма и норматив =====
export function stepKind(s) {
  const t = s.t.toLowerCase();
  if (/эксперт|заключени|рассмотр|проверк.*(проект|расч|отч|качеств|модел)|супервайз/.test(t)) return 'expert';
  if (/соглас|утвер|подпис|(^|[^а-яё])одобр|приня|приём|прием|подтвер|допустить/.test(t)) return 'approve';
  if (/расч|рассчит|оцен|модел|подбор|подобр|анализ|прогноз|оптимиз|ранжир|интерпрет|построен|сравн/.test(t)) return 'calc';
  if (/внес|загруз|замер|собра|сбор|ввод|регистр|актуализ|обнов|уточн|предостав|получ.*данн|зафикс/.test(t)) return 'data';
  if (s.d.length || /сформир|подготов|разработ|оформ|составл|формиров/.test(t)) return 'docs';
  return 'do';
}
export const KIND_T = { approve: 'Согласование', expert: 'Экспертиза', calc: 'Расчёт', data: 'Ввод данных', docs: 'Документы', do: 'Исполнение' };
export const slaOf = (P, s) => (SLA_OPS[P.p] && ['data', 'do', 'approve'].includes(stepKind(s)) ? SLA_OPS[P.p] : SLA[stepKind(s)] || 3);

// ===== Объекты =====
export function objOf(ref) {
  if (!ref) return { id: '', kind: '', name: '—', short: '—', path: null, part: null };
  if (typeof ref === 'object') return ref;
  if (ref.startsWith('w:')) {
    const id = ref.slice(2); const w = WELLS.find((x) => x.id === id);
    return { id: ref, kind: 'well', name: 'Скважина ' + id, short: id, path: '/m/skv/wells/' + encodeURIComponent(id), part: 'skv', well: w || null, sub: w ? `${w.method} · ${w.ngdu} · ${W_ST[w.status][0]}` : '' };
  }
  const o = OBJECTS.find((x) => x.id === ref);
  if (!o) return { id: ref, kind: '', name: ref, short: ref, path: null, part: null };
  // У мероприятий объект ссылается на скважину по номеру — подставляем запись фонда
  const well = typeof o.well === 'string' ? WELLS.find((x) => x.id === o.well) || null : o.well || null;
  return { ...o, well, path: `/m/${o.part}/obj/${encodeURIComponent(o.id)}`, sub: o.attrs && o.attrs[0] ? `${o.attrs[0][0]}: ${o.attrs[0][1]}` : '' };
}
// Виды объектов, с которыми запускается процесс
const START_OBJ = { 'Г1': ['area'], 'Г3': ['area'], 'Г3.1': ['seis'], 'Г3.2': ['seis'], 'Г3.3': ['seis'], 'Г3.4': ['model'], 'Р1': ['model', 'area'], 'Р2': ['program', 'report'], 'Р3': ['profile'], 'Р4': ['element'],
  'Б1': ['well:plan', 'kust'], 'Б2': ['kust', 'well:plan'], 'Б3': ['well:drill'], 'Б4': ['well:osv'], 'Б5': ['brig'], 'Д1': ['summary'], 'Д2': ['well:prod'], 'Д3': ['pot'], 'Д4': ['ima'], 'Д5': ['event'], 'Д6': ['well:prod'], 'Д7': ['energy', 'ngdu'], 'Д8': ['pipe'], 'Д9': ['mech', 'well:prod'] };
export function objectsFor(P) {
  const kinds = START_OBJ[P.p] || []; const out = [];
  kinds.forEach((k) => {
    if (k.startsWith('well:')) { const st = k.slice(5); WELLS.filter((w) => (st === 'prod' ? w.type === 'prod' && w.status === 'work' : w.status === st)).slice(0, 40).forEach((w) => out.push(objOf('w:' + w.id))); }
    else OBJECTS.filter((o) => o.kind === k).forEach((o) => out.push(objOf(o.id)));
  });
  return out;
}

// ===== Граф шагов =====
// Следующие шаги после i при решении dec: параллельная развилка — все; исключающая — ветви с подписью, равной решению (или первая);
// включающая — непомеченные ветви всегда плюс помеченные по решению
export function nextOf(P, i, dec) {
  const s = P.s[i]; const nx = numNx(s);
  if (!nx.length) return [];
  if (nx.length === 1) return [nx[0][0]];
  const labels = nx.map((x) => x[1]).filter(Boolean);
  const g = s.gx || (!labels.length ? 'p' : 'x');
  if (g === 'p') return [...new Set(nx.map((x) => x[0]))];
  const lab = nx.filter((x) => x[1]); const unl = nx.filter((x) => !x[1]);
  if (dec != null) { const m = lab.filter((x) => norm(x[1]) === norm(dec)); if (m.length) return [...new Set((g === 'i' ? unl : []).concat(m).map((x) => x[0]))]; }
  if (g === 'i') return [...new Set(nx.map((x) => x[0]))];
  return [...new Set(unl.length ? unl.map((x) => x[0]) : [nx[0][0]])];
}
// Решение на развилке после шага: вопрос и варианты (подписи ветвей)
export function decisionOf(P, i) {
  const s = P.s[i]; const nx = numNx(s); const labels = [...new Set(nx.map((x) => x[1]).filter(Boolean))];
  if (labels.length > 1 && (s.gx === 'x' || s.gx === 'i' || !s.gx)) return { q: s.gq || '', options: labels, kind: s.gx || 'x' };
  return null;
}
// Шаги, достижимые вперёд из from (без возврата по циклам)
function reach(P, from, stop) {
  const seen = new Set(); const q = [from];
  while (q.length) { const i = q.shift(); numNx(P.s[i]).forEach(([j]) => { if (!seen.has(j) && !(stop && stop.has(j))) { seen.add(j); q.push(j); } }); }
  return seen;
}
// Предшественники (замыкание по прямым рёбрам pv с меньшим индексом)
function ancestors(P, idxs) {
  const seen = new Set(); const q = [...idxs];
  while (q.length) { const i = q.shift(); numPv(P.s[i]).forEach(([j]) => { if (j < i && !seen.has(j)) { seen.add(j); q.push(j); } }); }
  idxs.forEach((i) => seen.delete(i));
  return [...seen].sort((a, b) => a - b);
}
// Стартовые шаги: шаг 0 и другие шаги без предшественников в его компоненте связности
export function startSteps(P) {
  const comp = new Set([0]); const q = [0];
  while (q.length) { const i = q.shift(); [...numNx(P.s[i]).map((x) => x[0]), ...numPv(P.s[i]).map((x) => x[0])].forEach((j) => { if (!comp.has(j)) { comp.add(j); q.push(j); } }); }
  return P.s.map((s, i) => i).filter((i) => comp.has(i) && !numPv(P.s[i]).length);
}

// Пробелы модели BPMN (показываются только в демо-режиме): тупиковые шаги без исходящих переходов (завершают свою ветвь)
// и шаги без входящих переходов вне старта процесса (не активируются движком)
export const loop2 = (P, a, b) => numNx(P.s[a]).some(([k, l]) => k === b && !l) && numNx(P.s[b]).some(([k, l]) => k === a && !l);
export function bpmnGaps(P) {
  const st = new Set(startSteps(P)); const idx = P.s.map((s, i) => i);
  return { dead: new Set(idx.filter((i) => !P.s[i].nx.length)), orphan: new Set(idx.filter((i) => !P.s[i].pv.length && !st.has(i))), loop: new Set(idx.filter((i) => numNx(P.s[i]).some(([j]) => j !== i && loop2(P, i, j)))) };
}

// ===== Построение экземпляров =====
const at = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
function buildStory(spec) {
  const P = procOf(spec.p); if (!P) return null;
  const r = rng('run' + spec.id); const started = at(dAdd(-spec.started), 9, 10 + Math.floor(r() * 40));
  const activeIdx = spec.at.map((a) => stepIdx(P, a[0])).filter((i) => i >= 0);
  const doneIdx = spec.done ? spec.done.map((c) => stepIdx(P, c)).filter((i) => i >= 0) : ancestors(P, activeIdx);
  const endAt = activeIdx.length ? Math.min(...spec.at.map((a) => dAdd(-(a[1] ?? 1)).getTime())) : (spec.finished != null ? dAdd(-spec.finished).getTime() : TODAY.getTime());
  const span = Math.max(1, endAt - started.getTime());
  const done = doneIdx.map((i, k) => { const s = P.s[i]; const d = new Date(started.getTime() + ((k + 0.6) / (doneIdx.length + 0.6)) * span); d.setHours(9 + Math.floor(r() * 8), Math.floor(r() * 60), 0, 0); const dec = spec.dec && spec.dec[stepKey(P, i)]; return { i, at: d, by: s.r, dec: dec || null, text: doneText(s, dec), auto: !dec }; });
  const active = spec.at.map((a) => { const i = stepIdx(P, a[0]); if (i < 0) return null; const s = P.s[i]; const o = a[2] || {}; const act = at(dAdd(-(a[1] ?? 1)), 10, 5 + Math.floor(r() * 50)); let due = o.due != null ? new Date(TODAY.getTime() + o.due * 864e5) : new Date(act.getTime() + slaOf(P, s) * 864e5);
    const now = NOW();
    if (o.due == null) { if (o.late) { if (due >= now) due = new Date(now.getTime() - (0.3 + r() * 1.5) * 864e5); } else if (due < now.getTime() + 2 * 36e5) due = new Date(now.getTime() + (0.4 + r() * 0.6) * slaOf(P, s) * 864e5); }
    const preds = numPv(s).map((x) => x[0]).filter((p) => doneIdx.includes(p)); const from = preds.length ? preds[preds.length - 1] : undefined;
    return { i, at: act, due, from, rework: o.rework ? { from: stepIdx(P, o.rework.from), comment: o.rework.comment } : null }; }).filter(Boolean);
  return { id: spec.id, num: spec.num || null, p: P.p, P, part: partOfProc(P.p), obj: objOf(spec.obj), started, active, done, log: [], pending: [], status: active.length ? 'active' : 'done', hidden: !!spec.hidden, finishedAt: active.length ? null : new Date(endAt) };
}
// Результат сюжетного (сгенерированного) шага — текст действия его формы; формы подключаются из specs.jsx (RESULT.fn)
export const RESULT = { fn: null };
const resCache = new Map();
export function resText(run, d) {
  if (!d.auto || !RESULT.fn) return d.text;
  const k = run.id + '|' + d.i; if (!resCache.has(k)) { let t = null; try { t = RESULT.fn(run, d.i); } catch (e) { t = null; } resCache.set(k, t || d.text); }
  return resCache.get(k);
}
function doneText(s, dec) {
  const k = stepKind(s);
  if (dec) return `Решение: ${dec}`;
  return k === 'approve' ? 'Согласовано' + (s.d.length ? ', подписано ЭЦП' : '') : k === 'expert' ? 'Заключение положительное' : k === 'calc' ? 'Расчёт выполнен, результат принят' : k === 'docs' ? 'Документы сформированы' : k === 'data' ? 'Данные внесены' : 'Выполнено';
}
const revive = (o) => ({ ...o, at: new Date(o.at), due: o.due ? new Date(o.due) : undefined });
// Все экземпляры: сюжетные + созданные пользователем, с наложением сохранённого состояния
export function allRuns(store) {
  const ov = (store && store.ov) || {}; const created = (store && store.created) || {};
  const base = STORY_RUNS.map(buildStory).filter(Boolean);
  Object.values(created).forEach((c) => { const P = procOf(c.p); if (!P) return; base.push({ id: c.id, num: null, p: P.p, P, part: partOfProc(P.p), obj: objOf(c.obj), started: new Date(c.started), active: [], done: [], log: [], pending: [], status: 'active', hidden: false, finishedAt: null, user: true }); });
  return base.map((run) => {
    const o = ov[run.id];
    const r = o ? { ...run, active: (o.active || []).map(revive), done: (o.done || []).map(revive), log: (o.log || []).map(revive), pending: o.pending || [], status: o.status, finishedAt: o.finishedAt ? new Date(o.finishedAt) : null, changed: true } : run;
    return derive(r);
  });
}
function derive(run) {
  const P = run.P; const now = NOW();
  const doneSet = new Set(run.done.map((d) => d.i));
  const ahead = new Set(); run.active.forEach((a) => reach(P, a.i, doneSet).forEach((j) => ahead.add(j)));
  const late = run.active.some((a) => a.due && a.due < now);
  const total = doneSet.size + run.active.length + ahead.size;
  return { ...run, late, pr: run.status === 'done' ? 100 : Math.round((doneSet.size / Math.max(1, total)) * 100), total, lanes: [...new Set(run.active.map((a) => P.s[a.i].r))], worst: run.active.reduce((m, a) => (a.due && (!m || a.due < m) ? a.due : m), null) };
}
export const serialize = (run) => ({ active: run.active, done: run.done, log: run.log, pending: run.pending, status: run.status, finishedAt: run.finishedAt });

// ===== Действия =====
// Выполнить шаг i: решение dec выбирает ветвь; параллельные ветви активируются все; слияние ждёт все входящие ветви
export function applyStep(run, i, { dec = null, text = '', sys = '', payload = null } = {}) {
  const P = run.P; const now = NOW();
  const act = run.active.filter((a) => a.i !== i);
  const done = [...run.done, { i, at: now, by: P.s[i].r, dec, text: text || doneText(P.s[i], dec), payload }];
  const log = [...run.log, { i, at: now, by: P.s[i].r, dec, text: text || doneText(P.s[i], dec), sys }];
  let pending = (run.pending || []).filter((j) => j !== i);
  const doneSet = new Set(done.map((d) => d.i));
  const activate = (j, from) => { if (act.some((a) => a.i === j)) return; act.push({ i: j, at: now, due: new Date(now.getTime() + slaOf(P, P.s[j]) * 864e5), from }); pending = pending.filter((x) => x !== j); };
  const blocked = (j) => {
    const preds = numPv(P.s[j]).map((x) => x[0]).filter((p) => p !== j);
    if (preds.length < 2 || P.s[j].gj === 'x') return false;
    const live = act.map((a) => a.i).concat(pending);
    return preds.some((p) => p !== i && !doneSet.has(p) && live.some((a) => a === p || reach(P, a, new Set([j])).has(p)));
  };
  // Взаимный переход без условия выхода (пробел модели: A → B → A без подписей) проходится один раз — пройденный шаг не активируется повторно
  nextOf(P, i, dec).forEach((j) => { if (j !== i && doneSet.has(j) && loop2(P, i, j)) return; if (blocked(j)) { if (!pending.includes(j)) pending.push(j); } else activate(j, i); });
  // ожидавшие слияния, у которых больше нет незавершённых ветвей
  let changed = true;
  while (changed) { changed = false; for (const j of [...pending]) { if (!blocked(j)) { activate(j, i); changed = true; } } }
  const status = act.length || pending.length ? 'active' : 'done';
  return derive({ ...run, active: act, done, log, pending, status, finishedAt: status === 'done' ? now : null });
}
// Вернуть на доработку: шаг toI становится активным у его исполнителя с замечанием
export function returnStep(run, fromI, toI, comment) {
  const P = run.P; const now = NOW();
  const act = run.active.filter((a) => a.i !== fromI && a.i !== toI);
  act.push({ i: toI, at: now, due: new Date(now.getTime() + slaOf(P, P.s[toI]) * 864e5), rework: { from: fromI, comment }, from: fromI });
  const log = [...run.log, { i: fromI, at: now, by: P.s[fromI].r, text: 'Возвращено на доработку: ' + comment, to: toI, kind: 'return' }];
  return derive({ ...run, active: act, log, status: 'active' });
}
// Кандидаты для возврата: пройденные шаги (последние — первыми), по умолчанию — последний шаг другого исполнителя
export function returnTargets(run, fromI) {
  const P = run.P; const seen = new Set(); const out = [];
  [...run.done].reverse().forEach((d) => { if (d.i === fromI || seen.has(d.i)) return; seen.add(d.i); out.push({ i: d.i, s: P.s[d.i], at: d.at }); });
  // По умолчанию — последний пройденный шаг-предшественник другого исполнителя (автор данных), иначе любой другой исполнитель
  const anc = new Set(ancestors(P, [fromI]));
  const def = out.find((x) => anc.has(x.i) && x.s.r !== P.s[fromI].r) || out.find((x) => x.s.r !== P.s[fromI].r) || out[0];
  return { list: out, def: def ? def.i : null };
}
// Новый экземпляр: стартовые шаги активны
export function newRun(P, objRef, existing) {
  const now = NOW(); const n = 100 + existing.filter((r) => r.p === P.p).length * 7 + Math.floor(Math.random() * 6);
  const id = `${P.p}-2026-${String(n).padStart(3, '0')}`;
  const run = { id, num: null, p: P.p, P, part: partOfProc(P.p), obj: objOf(objRef), started: now, active: startSteps(P).map((i) => ({ i, at: now, due: new Date(now.getTime() + slaOf(P, P.s[i]) * 864e5) })), done: [], log: [], pending: [], status: 'active', hidden: false, finishedAt: null, user: true };
  return derive(run);
}

// ===== Журнал: пройденные шаги и события (возвраты) по времени =====
export function journal(run) {
  const P = run.P;
  const items = run.done.map((d) => ({ kind: 'done', i: d.i, at: d.at, by: d.by, text: resText(run, d), dec: d.dec, sys: P.s[d.i].s[0] || '' }))
    .concat(run.log.filter((l) => l.kind === 'return').map((l) => ({ kind: 'return', i: l.i, at: l.at, by: l.by, text: l.text, to: l.to })))
    .concat(run.active.filter((a) => a.rework).map((a) => ({ kind: 'return', i: a.rework.from, at: a.at, by: P.s[a.rework.from].r, text: 'Возвращено на доработку: ' + a.rework.comment, to: a.i })));
  const seen = new Set();
  return items.filter((x) => { const k = x.kind + x.i + x.at.getTime(); if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.at - b.at);
}
// Результаты предыдущих шагов для формы
export function inputsOf(run, i) {
  const P = run.P; const prev = numPv(P.s[i]).map((x) => x[0]).filter((p) => p !== i);
  const res = prev.map((p) => { const d = [...run.done].reverse().find((x) => x.i === p); return d ? { i: p, s: P.s[p], at: d.at, text: resText(run, d), dec: d.dec, payload: d.payload } : null; }).filter(Boolean);
  return { prev: res, docs: [...new Set(res.flatMap((x) => x.s.d))], sys: P.s[i].s };
}

// ===== Имена =====
// Имя записи: предметное имя процесса + объект; если имя объекта уже содержит суть процесса — только объект
export const runTitle = (run) => { const n = NOUN[run.p] || run.P.short; const s = run.obj.short || ''; const sl = s.toLowerCase(); return n.toLowerCase().split(/[\s·]+/).some((w) => w.length >= 3 && sl.includes(w.slice(0, Math.min(w.length, 6)))) ? s : `${n} · ${s}`; };
export const runNum = (run) => run.num || run.id;
export const runPath = (r) => `/m/${partOfProc(r.p)}/p/${encodeURIComponent(r.p)}/run/${encodeURIComponent(r.id)}`;
export const stepPath = (r, i) => runPath(r) + '?step=' + i;

// Срок словами
export function dueText(due, now = NOW()) {
  if (!due) return '';
  const ms = due - now; const d = Math.floor(Math.abs(ms) / 864e5); const h = Math.floor((Math.abs(ms) % 864e5) / 36e5);
  const hhmm = `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`;
  if (ms < 0) return d >= 1 ? `просрочено на ${d} ${d === 1 ? 'день' : d < 5 ? 'дня' : 'дней'}` : `просрочено на ${Math.max(1, h)} ч`;
  if (due.toDateString() === now.toDateString()) return `сегодня до ${hhmm}`;
  if (d < 1) return `завтра до ${hhmm}`;
  const MON = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `до ${due.getDate()} ${MON[due.getMonth()]}`;
}

// ===== Задачи роли: активные шаги экземпляров на дорожках роли =====
const isSign = (s) => /соглас|утвер|подпис|(^|[^а-яё])одобр|приня|подтвер/i.test(s.t);
export function tasksFor(role, runs) {
  if (role.id === 'admin') return ADMIN_TASKS.map(([t, sys, st, due, prio], k) => ({ id: 'КХД-' + (510 + k), p: null, pt: 'Сопровождение данных ЦД', t, r: 'Администратор данных', sys: [sys], docs: [], obj: objOf(''), objName: sys, due: dAdd(due), created: dAdd(due - 4), st, sign: st === 'sign', prio, from: 'Мониторинг КХД', path: '/m/data/khd' }));
  const now = NOW(); const out = [];
  runs.filter((r) => r.status === 'active').forEach((run) => run.active.forEach((a) => {
    const s = run.P.s[a.i]; if (!role.lane(run.p, s.r)) return;
    const late = a.due && a.due < now; const sign = isSign(s);
    const st = a.rework ? 'rework' : late ? 'late' : sign ? 'sign' : now - a.at > 864e5 ? 'work' : 'new';
    const crit = run.obj.well && run.obj.well.risk > 70;
    out.push({ id: `${run.id}#${a.i}`, run, i: a.i, s, p: run.p, pt: run.P.t, t: s.t, r: s.r, sys: s.s, docs: s.d, obj: run.obj, objName: run.obj.short, due: a.due, created: a.at, late, st, sign, rework: a.rework, prio: late || a.rework || crit ? 'Высокий' : 'Обычный', from: a.from != null ? `${run.P.s[a.from].r} · ${run.P.s[a.from].t}` : 'Старт процесса', path: stepPath(run, a.i), title: runTitle(run) });
  }));
  return out.sort((a, b) => (a.due || 0) - (b.due || 0));
}
// Выполненные шаги роли (с результатом)
export function doneTasksFor(role, runs, limit = 12) {
  const out = [];
  runs.forEach((run) => run.done.forEach((d, k) => { const s = run.P.s[d.i]; if (role.lane(run.p, s.r)) out.push({ id: `${run.id}#${d.i}#${k}`, run, i: d.i, s, p: run.p, pt: run.P.t, t: s.t, r: s.r, obj: run.obj, objName: run.obj.short, at: d.at, text: resText(run, d), st: 'done', path: stepPath(run, d.i), title: runTitle(run) }); }));
  return out.sort((a, b) => b.at - a.at).slice(0, limit);
}
// Задача → адрес
export const taskPath = (t) => t.path || '/tasks';
// Экземпляры по объекту
export const runsOf = (runs, objId) => runs.filter((r) => r.obj.id === objId);
