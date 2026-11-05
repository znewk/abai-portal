// Форматирование чисел и дат, детерминированные генераторы демо-данных.

export const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? b : c);
export const fmt = (v, d = 0) => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const fmtK = (v) => (Math.abs(v) >= 1e6 ? fmt(v / 1e6, 1) + ' млн' : Math.abs(v) >= 1e4 ? fmt(v / 1e3, 1) + ' тыс.' : fmt(v));
export const sgn = (v, d = 0) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), d);
export const pct = (v, d = 1) => fmt(v, d) + '%';

// Демо-«сегодня» фиксировано, чтобы данные были согласованы
export const TODAY = new Date(2026, 10, 3, 9, 40);
export const dAdd = (n, base = TODAY) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
export const MON = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const MONF = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export const dFmt = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
export const dShort = (d) => `${d.getDate()} ${MON[d.getMonth()]}`;
export const tFmt = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const dRel = (d) => { const n = Math.round((d - TODAY) / 864e5); return n === 0 ? 'сегодня' : n === 1 ? 'завтра' : n === -1 ? 'вчера' : n > 0 ? `через ${n} ${plural(n, 'день', 'дня', 'дней')}` : `${-n} ${plural(-n, 'день', 'дня', 'дней')} назад`; };
export const dayLabels = (n, end = 0) => Array.from({ length: n }, (_, i) => dShort(dAdd(end - n + 1 + i)));

// Детерминированный генератор псевдослучайных чисел
export function rng(seed) {
  let s = typeof seed === 'string' ? [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) : seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Ряд: n точек вокруг base, шум noise (доля), тренд trend (доля за весь период)
export function series(seed, n, base, noise = 0.03, trend = 0) {
  const r = rng(seed); let w = 0;
  return Array.from({ length: n }, (_, i) => { w = w * 0.6 + (r() - 0.5) * 2 * noise; return base * (1 + trend * (i / Math.max(1, n - 1)) + w); });
}
export const sum = (a) => a.reduce((x, y) => x + y, 0);
export const avg = (a) => (a.length ? sum(a) / a.length : 0);
export const last = (a) => a[a.length - 1];
export const pick = (r, a) => a[Math.floor(r() * a.length)];
