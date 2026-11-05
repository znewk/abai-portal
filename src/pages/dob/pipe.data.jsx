// Данные целостности трубопроводов (Д8): реестр участков с оценкой риска, программа надёжности, отказы по годам.
// Общие для рабочего места «Целостность трубопроводов», форм шагов Д8 и карточек объектов pipe:*.
import { Box, Stack, Typography, Tooltip } from '@mui/material';
import { TONE } from '../../components/ui.jsx';
import { C } from '../../theme.js';
import { NGDU } from '../../data/core.js';
import { riskTone, RISK_T } from './_shared2.jsx';
import { rng, pick, dAdd, plural, fmt, TODAY } from '../../lib/format.js';

// Участки с объектами двойника (карточки pipe:*) — значения совпадают с атрибутами объектов в story.js
const HERO_PIPES = {
  'pipe:ДНС-3–ЦППН': { name: 'ДНС-3 – ЦППН', type: 'Напорный нефтепровод', ngdu: 'НГДУ-1', p: 4, c: 5, year: 1978, wall: 58, res: 2, diag: 12, d: 426, len: 14.2, fails: 3, method: 'внутритрубная дефектоскопия' },
  'pipe:БКНС-3–ВРП-27': { name: 'БКНС-3 – ВРП-27', type: 'Водовод высокого давления', ngdu: 'НГДУ-3', p: 2, c: 4, year: 2004, wall: 22, res: 14, diag: 117, d: 219, len: 8.6, fails: 0, method: 'контроль толщин, коррозионный мониторинг' },
};

export const PIPES = (() => {
  const r = rng('db2-pipes'); const out = [];
  const types = [['Нефтесборный коллектор', [114, 159, 219]], ['Напорный нефтепровод', [273, 325, 426]], ['Водовод высокого давления', [114, 159, 219]], ['Газопровод', [89, 114, 159]]];
  for (let i = 0; i < 240; i++) {
    const ti = r() < 0.42 ? 0 : r() < 0.4 ? 2 : r() < 0.7 ? 1 : 3; const [tt, ds] = types[ti];
    const year = 1972 + Math.floor(Math.pow(r(), 0.7) * 50); const age = 2026 - year;
    const p = Math.max(1, Math.min(5, Math.round(1 + (age / 54) * 3 + (r() - 0.5) * 2.2)));
    const c = Math.max(1, Math.min(5, Math.round((ti === 1 ? 3.4 : ti === 3 ? 3 : 2.2) + (r() - 0.5) * 2.6)));
    const ng = NGDU[Math.floor(r() * 4)]; const g = 112 + Math.floor(r() * 60); const dn = NGDU.indexOf(ng) + 1;
    const name = ti === 0 ? `ГЗУ-${g} – ДНС-${dn}` : ti === 1 ? `ДНС-${dn} – ЦППН, участок ${1 + Math.floor(r() * 6)}` : ti === 2 ? `БКНС-${1 + Math.floor(r() * 3)} – ВРП-${10 + Math.floor(r() * 36)}` : `ДНС-${dn} – ГПЗ, участок ${1 + Math.floor(r() * 4)}`;
    out.push({ id: 'ТП-' + (10400 + i * 3), name, type: tt, d: pick(r, ds), len: +(0.6 + r() * 9).toFixed(1), year, ngdu: ng, p, c, risk: p * c,
      wall: Math.round(8 + p * 9 + r() * 10), res: Math.max(1, Math.round(26 - p * 4.4 - r() * 4)), diag: dAdd(Math.round(-20 + r() * 400)), fails: Math.max(0, Math.round((p - 2) * r() * 2.4)),
      method: tt === 'Напорный нефтепровод' ? 'внутритрубная дефектоскопия' : 'контроль толщин, коррозионный мониторинг' });
  }
  Object.entries(HERO_PIPES).forEach(([obj, h]) => {
    const k = out.find((x) => x.type === h.type && !x.obj);
    Object.assign(k, { ...h, obj, risk: h.p * h.c, diag: dAdd(h.diag) });
  });
  return out;
})();
export const pipeOfObj = (objId) => PIPES.find((x) => x.obj === objId) || null;
export const pipeDays = (x) => Math.round((x.diag - TODAY) / 864e5);
// Участки со сроком диагностики в ближайшие 30 суток (шаг контроля сроков)
export const pipesSoon = () => PIPES.filter((x) => pipeDays(x) >= 0 && pipeDays(x) < 30).sort((a, b) => a.diag - b.diag);

// Риск по матрице 5×5 (тоны и подписи — общие для ЦД добычи)
export { riskTone, RISK_T };
export const PL = ['Очень низкая', 'Низкая', 'Средняя', 'Высокая', 'Очень высокая'];
export const CL = ['Незначительные', 'Малые', 'Умеренные', 'Значительные', 'Катастрофические'];

// Программа надёжности 2027: стадии — agreed (согласовано), contract (контрактование диагностики), sogl (на согласовании), form (формирование)
export const PROG_ST = { agreed: ['Согласовано ДДНГ и ДКС', 'good'], contract: ['Контрактование подрядчика', 'warn'], sogl: ['На согласовании ДДНГ и ДКС', 'info'], form: ['Формирование мероприятий', ''], done: ['Утверждено, включено в план', 'good'] };
export const PROG = [
  ['Замена участков с остаточным ресурсом менее 3 лет', 'Служба главного механика', 18, 42.6, 6840, 38, 'agreed'],
  ['Внутритрубная диагностика напорных нефтепроводов', 'Подрядная организация по ТЗ ДДНГ', 9, 61.3, 1270, 12, 'contract'],
  ['Ингибиторная защита нефтесборных коллекторов и водоводов', 'Служба главного механика', 46, 138.0, 980, 21, 'sogl'],
  ['Ремонт изоляции и катодная защита', 'Служба главного механика', 22, 57.4, 1460, 15, 'sogl'],
  ['Ремонт с применением композитных муфт', 'Подрядная организация', 31, 4.8, 620, 9, 'form'],
].map(([t, who, n, km, cost, red, st], i) => ({ id: i, t, who, n, km, cost, red, st }));

// Мероприятия по участку (шаг формирования мероприятий): по риску и остаточному ресурсу
export function pipeMeasures(x) {
  const out = [];
  if (x.res <= 3) out.push({ t: 'Замена участка трубопровода', v: `${fmt(x.len, 1)} км · Ø ${x.d} мм`, term: 'II квартал 2027', cost: Math.round(x.len * 380) });
  if (x.type === 'Напорный нефтепровод') out.push({ t: 'Внутритрубная диагностика после замены', v: 'весь участок', term: 'IV квартал 2027', cost: 48 });
  out.push({ t: 'Ингибиторная защита', v: 'дозирование 25 г/т', term: 'с января 2027', cost: Math.round(6 + x.len * 1.4) });
  if (x.wall > 40) out.push({ t: 'Ремонт с применением композитных муфт', v: `${Math.max(2, Math.round(x.wall / 12))} дефектов`, term: 'до замены участка', cost: Math.round(x.wall * 0.9) });
  out.push({ t: 'Ремонт изоляции и катодная защита', v: `${fmt(x.len * 0.3, 1)} км`, term: 'III квартал 2027', cost: Math.round(x.len * 4.2) });
  return out.map((m, k) => ({ id: k + 1, ...m }));
}
// Результаты диагностики (отчёт подрядчика)
export function pipeDiag(x) {
  const r = rng('diag' + x.id);
  return { tmin: +(x.d > 300 ? 9.5 * (1 - x.wall / 100) : 7 * (1 - x.wall / 100)).toFixed(1), tnom: x.d > 300 ? 9.5 : 7, defects: Math.round(x.wall / 4 + r() * 4), crit: x.wall > 50 ? 3 : x.wall > 30 ? 1 : 0, corr: +(0.1 + x.wall / 300).toFixed(2), cat: x.wall > 50 ? 'Ограниченно работоспособное' : x.wall > 30 ? 'Работоспособное с ограничениями' : 'Работоспособное' };
}

export const YRS = ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026*'];
export const FAILS = { a: [112, 104, 109, 97, 92, 86, 81, 63], b: [64, 61, 58, 55, 51, 47, 44, 35], c: [21, 19, 22, 18, 17, 16, 14, 11] };

// Матрица рисков 5×5: число участков в ячейке; mark — выделить ячейку участка; setFlt — фильтр по ячейке
export function RiskMatrix({ flt, setFlt, mark }) {
  const cnt = (p, c) => PIPES.filter((x) => x.p === p && x.c === c).length;
  const strokeC = { good: C.good, warn: C.warn, serious: C.serious, crit: C.crit };
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '24px 104px repeat(5, minmax(0, 1fr))', gap: '4px', alignItems: 'stretch' }}>
        <Box sx={{ gridRow: '1 / span 5', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11.5, color: 'text.secondary', textAlign: 'center', fontWeight: 600 }}>Вероятность отказа</Box>
        {[5, 4, 3, 2, 1].map((p) => [
          <Box key={'l' + p} sx={{ fontSize: 12, color: 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1, textAlign: 'right', lineHeight: 1.2 }}>{PL[p - 1]}</Box>,
          ...[1, 2, 3, 4, 5].map((c) => {
            const n = cnt(p, c); const t = riskTone(p * c); const on = (flt && flt.p === p && flt.c === c) || (mark && mark.p === p && mark.c === c);
            return (
              <Tooltip key={p + '-' + c} title={`Вероятность: ${PL[p - 1].toLowerCase()} · последствия: ${CL[c - 1].toLowerCase()} — ${n} ${plural(n, 'участок', 'участка', 'участков')}, риск ${p * c} (${RISK_T[t].toLowerCase()})`}>
                <Box component="button" onClick={() => setFlt && setFlt(on ? null : { p, c })} sx={{ height: 46, border: on ? '2px solid #16191f' : `1px solid ${strokeC[t]}55`, bgcolor: TONE[t].bg, borderRadius: 1.25, cursor: setFlt ? 'pointer' : 'default', font: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: TONE[t].fg, transition: 'transform .1s', '&:hover': { transform: 'scale(1.04)' } }}>
                  <Typography sx={{ fontSize: 17, fontWeight: 700, color: n ? TONE[t].fg : '#b6bcc6', fontVariantNumeric: 'tabular-nums' }}>{n}</Typography>
                </Box>
              </Tooltip>
            );
          }),
        ])}
        <Box /><Box />
        {CL.map((c, i) => <Box key={c} title={c} sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', pt: 0.5, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{['Незначит.', 'Малые', 'Умеренные', 'Значит.', 'Катастроф.'][i]}</Box>)}
      </Box>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', textAlign: 'center', fontWeight: 600, mt: 0.5, pl: '128px' }}>Последствия отказа</Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, mt: 1.5, fontSize: 12, color: 'text.secondary' }}>
        {['good', 'warn', 'serious', 'crit'].map((t) => <Stack key={t} direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: TONE[t].bg, border: `1.5px solid ${strokeC[t]}` }} /><span>{RISK_T[t]}</span></Stack>)}
      </Stack>
    </Box>
  );
}

