// ЦД пласта: общие данные страниц (слои карты, точки бурения, элементы заводнения, программа ГТМ) и карта месторождения.
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Tooltip, Typography, Stack, Link } from '@mui/material';
import { WELLS, W_ST, BPMN } from '../../data/core.js';
import { useApp } from '../../state.jsx';
import { rng, pick, fmt, plural, dAdd } from '../../lib/format.js';
import { C } from '../../theme.js';
import { StatusChip, Steps, Code } from '../../components/ui.jsx';

// ===== Состояние в рамках сеанса (статусы согласования) =====
export const PL_ST = { models: {}, pts: {}, uzSent: {}, gtm: {}, gtmStage: 5 };
export const useRerender = () => { const [, set] = useState(0); return () => set((x) => x + 1); };
export const plProc = (c) => BPMN.find((p) => p.p === c);
export const plStep = (p, c) => { const P = plProc(p); return P ? P.s.find((s) => s.c === c) : null; };

// ===== Деления шкалы =====
function ticks(min, max, cnt = 5) {
  if (max === min) max = min + 1;
  const span = max - min; const mag = Math.pow(10, Math.floor(Math.log10(span / cnt)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= cnt) || 10 * mag;
  const out = []; for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 2; v += step) out.push(+v.toFixed(10));
  return out;
}

// ===== Контур месторождения (та же форма, что у генератора WELLS) =====
const CX = 500, CY = 280;
export const PL_SHAPE = (x, y) => { const dx = (x - 500) / 430, dy = (y - 280) / 215; return dx * dx + dy * dy + 0.18 * Math.sin(x / 70) * dx; };
const CONTOUR = (() => {
  const pts = [];
  for (let k = 0; k < 120; k++) {
    const a = (k / 120) * Math.PI * 2; let lo = 0, hi = 1.6;
    for (let i = 0; i < 30; i++) { const t = (lo + hi) / 2; PL_SHAPE(CX + 430 * t * Math.cos(a), CY + 215 * t * Math.sin(a)) < 1 ? (lo = t) : (hi = t); }
    pts.push([CX + 430 * lo * Math.cos(a) * 1.04, CY + 215 * lo * Math.sin(a) * 1.06]);
  }
  return 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
})();

// ===== Слои карты: пластовое давление, обводнённость, плотность ОИЗ (последовательная шкала одного тона) =====
export const PL_LAYERS = {
  p: { t: 'Пластовое давление', u: 'атм', d: 0, ramp: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'], v: (w) => w.pPl + (w.type === 'inj' ? 12 : 0), src: 'карта изобар ГДМ v.2026.3 · ABAI ЦРНС 2.0' },
  wc: { t: 'Обводнённость', u: '%', d: 0, ramp: ['#fde4d6', '#f9c3a6', '#f39d72', '#eb6834', '#c4521f', '#9a3e14', '#6f2b0c'], v: (w) => (w.type === 'inj' ? null : w.wc), src: 'по замерам ABAI БД 2.0' },
  oiz: { t: 'Плотность ОИЗ', u: 'тыс. т/га', d: 1, ramp: ['#d3f2e6', '#a6e3cc', '#6fcfab', '#1baf7a', '#138a5f', '#0d6646', '#084630'], v: (w) => (w.type === 'inj' ? null : (100 - w.wc) * 0.35 + 1), src: 'карта ОИЗ на 01.01.2026 · ABAI ЦРНС 2.0' },
};
const FIELD = {};
function field(layer) {
  if (FIELD[layer]) return FIELD[layer];
  const L = PL_LAYERS[layer]; const src = WELLS.map((w) => [w.x, w.y, L.v(w)]).filter((x) => x[2] != null);
  const step = 10; const cells = []; let mn = 1e9, mx = -1e9;
  for (let x = 50; x < 960; x += step) for (let y = 40; y < 530; y += step) {
    let a = 0, b = 0; for (const [wx, wy, v] of src) { const w = Math.exp(-((wx - x) ** 2 + (wy - y) ** 2) / 7200) + 1e-6; a += w * v; b += w; }
    const v = a / b; cells.push([x, y, v]); if (PL_SHAPE(x, y) < 1.15) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
  }
  let tk = ticks(mn, mx, 6); if (tk.length - 1 > L.ramp.length) tk = ticks(mn, mx, 4);
  const n = tk.length - 1; const ramp = Array.from({ length: n }, (_, i) => L.ramp[Math.round((i * (L.ramp.length - 1)) / Math.max(1, n - 1))]);
  const bin = (v) => Math.max(0, Math.min(n - 1, Math.floor(((v - tk[0]) / (tk[n] - tk[0])) * n)));
  return (FIELD[layer] = { cells, tk, ramp, bin, step });
}

// ===== Проектные точки бурения (ЦРНС 2.0 → Б1) =====
export const PL_PT_ST = { cand: ['Кандидат', 'info', C.s[0]], agreed: ['Согласована', 'warn', C.s[3]], carpet: ['В ковре бурения (Б1)', 'good', C.s[6]] };
export const PL_SECT = (() => {
  const r = rng('pl-sectors'); const why = ['высокая плотность ОИЗ, слабая выработка', 'зона пониженного давления, нужна компенсация', 'невыработанные линзы горизонта XIV', 'краевая зона, подтверждена сейсмикой 3D', 'обводнённость ниже средней по объекту', 'перспектива ЗБС на соседних скважинах'];
  return Array.from({ length: 12 }, (_, i) => ({ id: 'С-' + String(i + 1).padStart(2, '0'), score: Math.round(48 + r() * 50), oiz: +(1.2 + r() * 6.8).toFixed(1), nnt: Math.round(6 + r() * 14), why: pick(r, why) })).sort((a, b) => b.score - a.score);
})();
export const PL_PTS = (() => {
  const r = rng('pl-points'); const out = []; let k = 0;
  while (out.length < 16 && k < 5000) {
    k++; const x = 110 + r() * 780, y = 90 + r() * 380;
    if (PL_SHAPE(x, y) > 0.85) continue;
    if (WELLS.some((w) => Math.hypot(w.x - x, w.y - y) < 22) || out.some((p) => Math.hypot(p.x - x, p.y - y) < 40)) continue;
    const rate = Math.round(58 + r() * 40); const st = out.length < 4 ? 'carpet' : out.length < 8 ? 'agreed' : 'cand';
    out.push({ id: 'ПТ-27-' + String(out.length + 1).padStart(2, '0'), x: Math.round(x), y: Math.round(y), sec: PL_SECT[Math.floor(r() * 8)].id, rate, type: r() < 0.35 ? 'ГС' : 'ННС', q: +(8 + (rate - 58) * 0.45 + r() * 6).toFixed(1), depth: Math.round(1180 + r() * 320), st0: st });
  }
  return out.sort((a, b) => b.rate - a.rate);
})();
export const ptSt = (p) => PL_ST.pts[p.id] || p.st0;

// ===== Элементы заводнения (УЗ 2.0, Р4) =====
export const PL_EZ = (() => {
  const r = rng('pl-ez'); const inj = WELLS.filter((w) => w.type === 'inj');
  return inj.slice(0, 14).map((c, i) => {
    const links = WELLS.filter((w) => w.type === 'prod' && Math.hypot(w.x - c.x, w.y - c.y) < 110).slice(0, 6);
    const comp = Math.round(72 + r() * 70); const eff = +(2.1 + r() * 6.4).toFixed(1);
    const tone = eff > 4.6 && comp >= 86 && comp <= 128 ? 'good' : eff < 3.2 || comp > 134 ? 'crit' : 'warn';
    const rec = tone === 'good' ? 0 : comp > 115 ? -Math.round(c.qInj * (0.18 + r() * 0.2)) : Math.round(c.qInj * (0.15 + r() * 0.25));
    return { id: 'Э-' + String(i + 1).padStart(2, '0'), c, links, comp, eff, tone, rec, eff2: tone === 'good' ? 0 : +(1.5 + r() * 6.5).toFixed(1) };
  }).sort((a, b) => a.eff - b.eff).map((e, i) => Object.assign(e, { rank: i + 1 }));
})();
// Элемент Э-12 сюжета — с нагнетательной скважиной УЗН-5166 (единые данные для всех экранов)
{ const h = PL_EZ.find((e) => e.c.id === 'УЗН-5166'); const e12 = PL_EZ.find((e) => e.id === 'Э-12'); if (h && e12 && h !== e12) { const c = h.c; h.c = e12.c; e12.c = c; } }
export const PL_EZ_T = { good: 'Эффективный', warn: 'Перераспределить закачку', crit: 'Неэффективная закачка' };

// ===== Программа ГТМ (ПАЭГТМ, Р2) =====
export const PL_GTM_T = [['ГРП', 86, 142.6], ['ВНС', 58, 96.4], ['ЗБС', 34, 61.2], ['ОПЗ', 112, 38.9], ['Оптимизация ГНО', 96, 31.8], ['РИР', 47, 22.4], ['Перевод в ППД', 21, 18.7]];
export const PL_GTM_ST = { cand: ['Кандидат', 'info'], check: ['Проверка эффекта КМГИ', 'warn'], incl: ['Включено в программу', 'good'], rej: ['Исключено по экономике', 'crit'] };
export const PL_GTM = (() => {
  let vns = 16; const r = rng('pl-gtm'); const ws = WELLS.filter((w) => w.type === 'prod' && !['drill', 'osv', 'plan'].includes(w.status));
  const tq = { 'ГРП': [6, 14], 'ВНС': [12, 26], 'ЗБС': [8, 18], 'ОПЗ': [1.5, 4.5], 'Оптимизация ГНО': [1.5, 5], 'РИР': [2, 6], 'Перевод в ППД': [0, 0] };
  return ws.slice(0, 26).map((w, i) => {
    const t = PL_GTM_T[Math.floor(r() * PL_GTM_T.length)][0]; const [a, b] = tq[t]; const q = t === 'Перевод в ППД' ? 0 : +(a + r() * (b - a)).toFixed(1);
    const npv = t === 'Перевод в ППД' ? Math.round(40 + r() * 120) : Math.round(q * (14 + r() * 22) - 30); const pb = npv > 0 ? Math.round(3 + r() * 20) : null;
    const st = npv < 25 ? 'rej' : i % 4 === 0 ? 'cand' : i % 4 === 1 ? 'check' : 'incl';
    return { id: i, w: t === 'ВНС' ? 'ПТ-27-' + String(++vns).padStart(2, '0') : w.id, well: t === 'ВНС' ? null : w, t, q, npv, pb, st0: st, ngdu: w.ngdu };
  });
})();

// ===== Карта участка =====
const ST_FILL = { work: '#16191f', idle: C.warn, repair: C.serious };
// layer — слой фона; pts — проектные точки; sel — выбранная точка; onPt(id); ez — элемент заводнения; fade — приглушить скважины
export function FieldMap({ layer, pts, sel, onPt, ez, fade }) {
  const nav = useNavigate(); const F = layer ? field(layer) : null; const L = layer ? PL_LAYERS[layer] : null;
  return (
    <Box component="svg" viewBox="40 40 920 495" role="img" aria-label="Карта участка месторождения" sx={{ width: '100%', display: 'block', bgcolor: '#f6f8fb', borderRadius: 1.5 }}>
      <defs>
        <clipPath id={'plc-' + (layer || 'n')}><path d={CONTOUR} /></clipPath>
        <filter id="pl-blur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      {F ? <g clipPath={`url(#plc-${layer})`}><g filter="url(#pl-blur)">{F.cells.map(([x, y, v], i) => <rect key={i} x={x - F.step / 2} y={y - F.step / 2} width={F.step + 1} height={F.step + 1} fill={F.ramp[F.bin(v)]} />)}</g></g> : <path d={CONTOUR} fill="#eef3f9" />}
      <path d={CONTOUR} fill="none" stroke={C.navy} strokeWidth="1.5" strokeDasharray="6 4" />
      {ez && ez.links.map((w) => <line key={w.id} x1={ez.c.x} y1={ez.c.y} x2={w.x} y2={w.y} stroke={C.navy} strokeWidth="2" opacity=".75" />)}
      {WELLS.map((w) => {
        const hl = ez && (ez.c === w || ez.links.includes(w)); const newW = w.status === 'drill' || w.status === 'osv'; const lv = L && L.v(w) != null ? L.v(w) : null;
        const tip = <Box sx={{ fontSize: 12 }}><b>{w.id}</b><br />{w.type === 'inj' ? 'Нагнетательная' : 'Добывающая · ' + w.method} · {W_ST[w.status][0]}<br />{w.ngdu} · горизонт {w.horizon}{lv != null && <><br />{L.t}: {fmt(lv, L.d)} {L.u}</>}</Box>;
        return (
          <Tooltip key={w.id} title={tip} disableInteractive>
            <g style={{ cursor: 'pointer' }} opacity={hl || !fade ? 1 : 0.45} onClick={() => nav('/skv/well/' + encodeURIComponent(w.id))}>
              {hl && <circle cx={w.x} cy={w.y} r="10" fill="none" stroke={C.navy} strokeWidth="2" />}
              <circle cx={w.x} cy={w.y} r="9" fill="transparent" />
              {w.type === 'inj'
                ? <path d={`M${w.x} ${w.y - 7}L${w.x + 6.5} ${w.y + 4.5}L${w.x - 6.5} ${w.y + 4.5}Z`} fill="#fff" stroke={C.navy} strokeWidth="1.6" />
                : <circle cx={w.x} cy={w.y} r="5" fill={ST_FILL[w.status] || '#fff'} stroke={newW ? '#16191f' : '#fff'} strokeWidth="1.6" strokeDasharray={newW ? '2 1.5' : undefined} />}
            </g>
          </Tooltip>
        );
      })}
      {(pts || []).map((p) => {
        const st = PL_PT_ST[ptSt(p)]; const on = sel === p.id;
        return (
          <Tooltip key={p.id} title={<Box sx={{ fontSize: 12 }}><b>{p.id} · {p.type}</b><br />Сектор {p.sec} · рейтинг {p.rate}<br />Ожидаемый дебит нефти {fmt(p.q, 1)} т/сут<br />{st[0]}</Box>} disableInteractive>
            <g style={{ cursor: 'pointer' }} onClick={() => onPt && onPt(p.id)}>
              {on && <circle cx={p.x} cy={p.y} r="13" fill="none" stroke={C.navy} strokeWidth="2" />}
              <path d={`M${p.x} ${p.y - 8}L${p.x + 8} ${p.y}L${p.x} ${p.y + 8}L${p.x - 8} ${p.y}Z`} fill={st[2]} stroke="#fff" strokeWidth="1.8" />
              {on && <text x={p.x + 12} y={p.y - 10} fontSize="12" fontWeight="600" fill="#16191f">{p.id}</text>}
            </g>
          </Tooltip>
        );
      })}
      <g transform="translate(70 515)"><line x1="0" y1="0" x2="100" y2="0" stroke="#16191f" strokeWidth="2" /><line x1="0" y1="-4" x2="0" y2="4" stroke="#16191f" /><line x1="100" y1="-4" x2="100" y2="4" stroke="#16191f" /><text x="50" y="-7" textAnchor="middle" fontSize="11" fill="#4d5563">1 км</text></g>
      <g transform="translate(925 70)"><path d="M0 -16L6 4L0 0L-6 4Z" fill="#16191f" /><text x="0" y="18" textAnchor="middle" fontSize="11" fontWeight="600" fill="#16191f">С</text></g>
    </Box>
  );
}

// Легенда карты: шкала слоя + условные обозначения скважин (+ extra — дополнительные пункты)
const Mk = ({ children, label }) => <Stack direction="row" spacing={0.75} alignItems="center"><Box component="svg" viewBox="0 0 14 14" sx={{ width: 14, height: 14 }}>{children}</Box><span>{label}</span></Stack>;
export function MapLegend({ layer, extra }) {
  const F = layer ? field(layer) : null; const L = layer ? PL_LAYERS[layer] : null;
  return (
    <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 3, rowGap: 1.25, fontSize: 12, color: 'text.secondary' }}>
      {F && (
        <Box>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{L.t}, {L.u}</Typography>
          <Stack direction="row" spacing="2px">{F.ramp.map((c, i) => <Tooltip key={i} title={`${fmt(F.tk[i], L.d)} – ${fmt(F.tk[i + 1], L.d)} ${L.u}`}><Box sx={{ width: 38, height: 10, bgcolor: c, borderRadius: i === 0 ? '3px 0 0 3px' : i === F.ramp.length - 1 ? '0 3px 3px 0' : 0 }} /></Tooltip>)}</Stack>
          <Box sx={{ position: 'relative', height: 16, width: F.ramp.length * 40 }}>{F.tk.map((t, i) => <Box key={i} component="span" sx={{ position: 'absolute', left: i * 40 - 1, transform: 'translateX(-50%)', fontSize: 11, top: 2, fontVariantNumeric: 'tabular-nums' }}>{fmt(t, L.d)}</Box>)}</Box>
        </Box>
      )}
      <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2, rowGap: 0.5 }}>
        <Mk label="Добывающая в работе"><circle cx="7" cy="7" r="5" fill="#16191f" /></Mk>
        <Mk label="Простой"><circle cx="7" cy="7" r="5" fill={C.warn} /></Mk>
        <Mk label="Ремонт (ТКРС)"><circle cx="7" cy="7" r="5" fill={C.serious} /></Mk>
        <Mk label="Бурение / освоение"><circle cx="7" cy="7" r="5" fill="#fff" stroke="#16191f" strokeWidth="1.4" strokeDasharray="2 1.5" /></Mk>
        <Mk label="Нагнетательная"><path d="M7 1.5L12.5 11.5H1.5Z" fill="#fff" stroke={C.navy} strokeWidth="1.5" /></Mk>
        {extra}
      </Stack>
    </Box>
  );
}
export const PtMark = ({ c, label }) => <Mk label={label}><path d="M7 1L13 7L7 13L1 7Z" fill={c} /></Mk>;

// Синхронизация ЦД пласта с другими частями ЦД (ИМА)
const IMA = [
  ['ЦД скважины → ЦД пласта', 'режимы, дебиты, ограничения ГНО', 'ИМА · Д4', '06:00', 'good'],
  ['ЦД пласта → ЦД скважины', 'приток, пластовое давление, обводнённость', 'ИМА · Д4', '06:00', 'good'],
  ['ABAI БД 2.0 → ABAI УЗ 2.0', 'добыча, закачка, фонд скважин', 'Р4 4.2.1 – 4.2.2', '05:40', 'good'],
  ['SLB Petrel → ABAI ЦРНС 2.0', 'геомодель, карты ОИЗ, НИЗ, ННТ, обводнённости', 'Г3.4 3.4.15', '28.10', 'good'],
  ['ABAI ЦРНС 2.0 → tNavigator', 'исходные данные для актуализации ГДМ', 'Р4 4.3.2 · интеграция', 'вчера, 22:10', 'warn'],
];
export function ImaList() {
  // Обмен моделями: строка — направление и что передаётся; источник (шаг BPMN, слайд) — в подсказке
  return (
    <Box>
      {IMA.map(([t, s, src, tm, tone], i) => (
        <Tooltip key={i} title={src} placement="top-start">
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.1, borderTop: i ? '1px solid #eef1f5' : 0 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{t}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{s}</Typography>
            </Box>
            <Box sx={{ textAlign: 'right', flex: 'none' }}>
              <StatusChip tone={tone} label={tone === 'good' ? 'Синхронизировано' : 'Ожидает пересчёта'} />
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{tm}</Typography>
            </Box>
          </Stack>
        </Tooltip>
      ))}
    </Box>
  );
}

// Процессы BPMN, формирующие ЦД пласта: компактный список (код, название, экземпляры в работе)
export function ProcCards({ codes }) {
  const nav = useNavigate(); const { runs } = useApp();
  return (
    <Box>
      {codes.map((c, i) => {
        const P = plProc(c); if (!P) return null;
        const inst = runs.filter((x) => x.p === c && x.status === 'active'); const late = inst.filter((x) => x.late).length;
        return (
          <Stack key={c} direction="row" spacing={1.5} alignItems="center" onClick={() => nav('/m/plast/p/' + encodeURIComponent(c))}
            sx={{ px: 2, py: 1.1, borderTop: i ? '1px solid #eef1f5' : 0, cursor: 'pointer', '&:hover': { bgcolor: '#f6f9fd' } }}>
            <Code>{c}</Code>
            <Typography sx={{ fontSize: 13.5, flex: 1, minWidth: 0 }}>{P.t}</Typography>
            <Box sx={{ flex: 'none', textAlign: 'right' }}>
              {late ? <StatusChip tone="crit" label={`${late} с нарушением срока`} /> : <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{inst.length ? `${inst.length} в работе` : '—'}</Typography>}
            </Box>
          </Stack>
        );
      })}
    </Box>
  );
}

// Маршрут по шагам BPMN: codes [[процесс, шаг, краткое название]], cur — индекс текущего шага
export function RouteSteps({ codes, cur }) {
  return <Steps items={codes.map(([p, c, short], i) => { const s = plStep(p, c); return { c: `${p} ${c}`, t: short, sub: s ? s.r : '', done: i < cur, cur: i === cur }; })} />;
}

export const WellLink = ({ id }) => <Link component={RouterLink} to={'/m/skv/wells/' + encodeURIComponent(id)} underline="hover" onClick={(e) => e.stopPropagation()}>{id}</Link>;
export const ProcLink = ({ code }) => <Link component={RouterLink} to={'/proc/' + encodeURIComponent(code)} underline="hover" onClick={(e) => e.stopPropagation()}>{code}</Link>;
export { dAdd };
