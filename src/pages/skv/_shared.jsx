// Общее для страниц «ЦД скважины»: цвета статусов и способов, ссылки на процессы, схема расположения скважин, кнопка подрядчика.
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Link, Tooltip, Button, Box } from '@mui/material';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import { BPMN, W_ST } from '../../data/core.js';
import { C } from '../../theme.js';
import { fmt, dFmt, dAdd } from '../../lib/format.js';
import { useApp } from '../../state.jsx';

export const ST_C = { work: C.good, idle: C.warn, repair: C.serious, drill: C.s[0], osv: C.s[6], plan: '#8a93a6' };
export const M_C = { 'ЭЦН': C.s[0], 'ШГН': C.s[1], 'Фонтан': C.s[2], 'Нагнетательная': C.s[3] };
export const ST_TONE = (st) => W_ST[st][1];
export const noRate = (w) => w.status === 'drill' || w.status === 'osv';
export const wellPath = (id) => '/m/skv/wells/' + encodeURIComponent(id);

// Ссылка на процесс: «Б3 · Мониторинг бурения» (short — краткое название)
export function ProcLink({ code, short }) {
  const P = BPMN.find((x) => x.p === code);
  if (!P) return <span>{code}</span>;
  return <Link component={RouterLink} to={'/proc/' + encodeURIComponent(code)} underline="hover" title={P.t}>{code} · {short ? P.short : P.t}</Link>;
}
export const WellLink = ({ id }) => <Link component={RouterLink} to={wellPath(id)} underline="hover" onClick={(e) => e.stopPropagation()} sx={{ fontWeight: 600 }}>{id}</Link>;

// Кнопка подрядчика «Загрузить суточный рапорт»
export function ContrBtn() {
  const { role, tasks } = useApp(); const nav = useNavigate();
  if (!role || !role.limited) return null;
  const t = tasks.find((x) => x.p === 'Б3' && x.s && x.s.c === '3.3');
  if (!t) return null;
  return <Button variant="contained" startIcon={<UploadFileRounded />} onClick={() => nav(t.path)}>Загрузить суточный рапорт · {t.objName}</Button>;
}

// Схема расположения скважин (SVG): клик — паспорт скважины
export function WellMap({ wells, sel, height = 420 }) {
  const nav = useNavigate();
  return (
    <Box sx={{ width: '100%', bgcolor: '#f6f8fb', borderRadius: 1.5, overflow: 'hidden' }}>
      <svg viewBox="0 0 1000 560" style={{ width: '100%', height: 'auto', maxHeight: height, display: 'block' }} role="img" aria-label="Схема расположения скважин">
        <ellipse cx="500" cy="282" rx="462" ry="240" fill="#eef3f9" stroke="#c9d6e8" strokeWidth="2" />
        <path d="M60 262 C 180 250, 290 300, 330 420" fill="none" stroke="#c9d6e8" strokeWidth="2" strokeDasharray="6 5" />
        <text x="560" y="34" fill={C.muted} fontSize="20" textAnchor="middle">Узень</text>
        <text x="70" y="548" fill={C.muted} fontSize="20">Карамандыбас</text>
        {wells.map((w) => (
          <Tooltip key={w.id} arrow title={<span><b>{w.id}</b><br />{w.method} · {W_ST[w.status][0]}<br />{w.type === 'inj' ? `Закачка ${fmt(w.qInj)} м³/сут` : `Qн ${fmt(w.qO, 1)} т/сут · обводн. ${w.wc}%`}</span>}>
            <g style={{ cursor: 'pointer' }} onClick={() => nav(wellPath(w.id))}>
              <circle cx={w.x} cy={w.y} r={w.id === sel ? 13 : w.type === 'inj' ? 8 : 9} fill={w.type === 'inj' ? '#fff' : ST_C[w.status]} stroke={w.type === 'inj' ? C.s[0] : '#fff'} strokeWidth={w.type === 'inj' ? 3.5 : 2.5} />
              {w.id === sel && <text x={w.x + 18} y={w.y + 7} fontSize="20" fontWeight="600" fill="#16191f">{w.id}</text>}
            </g>
          </Tooltip>
        ))}
      </svg>
    </Box>
  );
}
// Легенда схемы; wells — для счётчиков по статусам (легенда заменяет отдельную сводку «Состояние фонда»)
export function MapLegend({ wells }) {
  const n = (k) => (wells ? wells.filter((w) => w.type === 'prod' && w.status === k).length : null);
  const inj = wells ? wells.filter((w) => w.type === 'inj').length : null;
  const num = (v) => (v == null ? null : <b style={{ color: '#16191f', fontWeight: 600 }}>{v}</b>);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2.5, rowGap: 0.5, mt: 1.25, fontSize: 12.5, color: 'text.secondary' }}>
      {wells && <Box component="span" sx={{ fontWeight: 600 }}>Добывающие:</Box>}
      {Object.keys(W_ST).map((k) => <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ST_C[k] }} />{W_ST[k][0]} {num(n(k))}</Box>)}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Box sx={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${C.s[0]}`, bgcolor: '#fff' }} />Нагнетательные {num(inj)}</Box>
    </Box>
  );
}
