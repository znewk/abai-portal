// Уведомления роли: возвраты на доработку, просроченные шаги, движение процессов по моим объектам, события систем ABAI.
import { NOTIFS } from './core.js';
import { nowDemo, runTitle, runPath, stepPath } from './exec.js';
import { TODAY } from '../lib/format.js';

const REL = { kmg: /./, kmgi: /./, dzo: /./, cits: /сводк|ЭЦН|рапорт|трубопровод/i, geo: /модель|ГТМ|ЭЦН/i, nipi: /модель|ГТМ/i, drill: /рапорт|ЭЦН/i, contr: /рапорт/i, admin: /./ };
const tFmt = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const dShort = (d) => `${d.getDate()} ${['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][d.getMonth()]}`;
const when = (d) => (d.toDateString() === TODAY.toDateString() ? tFmt(d) : dShort(d));

export function notifsFor(role, runs, tasks) {
  if (!role) return [];
  const now = nowDemo(); const out = [];
  tasks.filter((t) => t.rework).forEach((t) => out.push({ k: 'rw:' + t.id, tone: 'warn', t: `Возвращено на доработку: ${t.t}`, s: `${t.title || t.pt} · ${t.rework.comment.slice(0, 90)}`, to: t.path, at: t.created }));
  tasks.filter((t) => t.due && t.due < now).forEach((t) => out.push({ k: 'late:' + t.id, tone: 'crit', t: `Срок нарушен: ${t.t}`, s: `${t.title || t.pt} · срок ${dShort(t.due)} ${tFmt(t.due)}`, to: t.path, at: t.due }));
  // Движение по процессам, где у роли есть шаги: последние действия других участников
  runs.filter((r) => r.status !== 'done' && r.P.s.some((s) => role.lane(r.p, s.r))).forEach((r) => {
    const last = [...r.done].sort((a, b) => b.at - a.at)[0];
    if (last && !role.lane(r.p, r.P.s[last.i].r) && now - last.at < 2 * 864e5) out.push({ k: 'mv:' + r.id + ':' + last.i, tone: 'info', t: `${runTitle(r)}: ${r.P.s[last.i].t}`, s: `${r.P.s[last.i].r} · ${last.text}`, to: runPath(r), at: last.at });
  });
  runs.filter((r) => r.status === 'done' && r.finishedAt && now - r.finishedAt < 3 * 864e5).forEach((r) => out.push({ k: 'fin:' + r.id, tone: 'good', t: `${runTitle(r)}: процесс завершён`, s: dShort(r.finishedAt), to: runPath(r), at: r.finishedAt }));
  NOTIFS.filter(([, t]) => (REL[role.id] || /./).test(t)).forEach(([tone, t, s, to], i) => out.push({ k: 'sys:' + i, tone, t, s, to, at: new Date(TODAY.getTime() - (i + 1) * 3.6e6 * 2) }));
  const seen = new Set();
  return out.filter((x) => { if (seen.has(x.k)) return false; seen.add(x.k); return true; }).sort((a, b) => b.at - a.at).slice(0, 12).map((x) => ({ ...x, when: when(x.at) }));
}
export { stepPath };
