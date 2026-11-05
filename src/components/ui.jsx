import { createContext, useContext } from 'react';
// Общие компоненты интерфейса: заголовок страницы, KPI, карточки разделов, статусы, полосы, шаги, «ключ — значение».
import { Box, Card, CardHeader, CardContent, Chip, Stack, Typography, LinearProgress, Tooltip, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorRounded from '@mui/icons-material/ErrorRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import InfoRounded from '@mui/icons-material/InfoRounded';
import ReportRounded from '@mui/icons-material/ReportRounded';
import ArrowDropUpRounded from '@mui/icons-material/ArrowDropUpRounded';
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { C } from '../theme.js';
import { fmt, sgn, sum, pct } from '../lib/format.js';

// Тон статуса → цвета и иконка (good / warn / serious / crit / info / '')
export const TONE = {
  good: { fg: '#0b6b47', bg: '#e6f5ee', icon: CheckCircleRounded },
  warn: { fg: '#8a5a00', bg: '#fff4dc', icon: WarningAmberRounded },
  serious: { fg: '#a2421b', bg: '#fdede6', icon: ReportRounded },
  crit: { fg: '#b02a2a', bg: '#fbe9e9', icon: ErrorRounded },
  info: { fg: '#154a8c', bg: '#e8f0fb', icon: InfoRounded },
  '': { fg: '#4d5563', bg: '#eef1f5', icon: null },
};
// Статус — тихий: цветная точка и текст; цвет несёт смысл только у исключений (warn / serious / crit)
const DOT = { good: '#1f9d6b', warn: '#e0a100', serious: '#e07a4f', crit: '#d03b3b', info: '#2a78d6', '': '#a3aab6' };
export function StatusChip({ tone = '', label, sx }) {
  const strong = tone === 'crit' || tone === 'serious' || tone === 'warn';
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 12.5, fontWeight: strong ? 600 : 500, color: strong ? (TONE[tone] || TONE['']).fg : 'text.secondary', whiteSpace: 'nowrap', lineHeight: 1.4, ...sx }}>
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: DOT[tone] ?? DOT[''], flex: 'none' }} />{label}
    </Box>
  );
}

// Метка системы с цветом части ЦД
export function SysTag({ name, part }) {
  return <Chip size="small" variant="outlined" label={name} sx={{ bgcolor: '#fff', fontWeight: 600, color: 'text.secondary', '&::before': { content: '""', width: 8, height: 8, borderRadius: '50%', bgcolor: C.part[part] || C.brand, ml: 1, mr: -0.25 } }} />;
}

// Встраивание страницы во вкладку процесса: заголовок не повторяется, остаются только действия
export const EmbedCtx = createContext(false);
// Демо-слой: связь экранов с BPMN и источниками — показывается только при включённом переключателе «Демо · BPMN»
export const DemoCtx = createContext(false);
const DEMO_SX = { border: '1px dashed #8b5cf6', color: '#6d28d9', bgcolor: '#f5f3ff', borderRadius: 1, px: 0.75, py: 0.1, fontSize: 11.5, fontWeight: 600, lineHeight: 1.6, gap: 0.5, alignItems: 'center' };
export function Demo({ children, block, sx }) {
  const on = useContext(DemoCtx); if (!on) return null;
  return <Box component={block ? 'div' : 'span'} sx={{ display: block ? 'flex' : 'inline-flex', ...DEMO_SX, ...(block ? { mt: 1 } : { ml: 0.75 }), ...sx }}><b>BPMN</b>{children}</Box>;
}
// Заголовок страницы: title, sub (строка или узел), sys [[название, часть]], actions (узел)
export function PageHeader({ title, sub, sys, actions }) {
  const embedded = useContext(EmbedCtx); const demo = useContext(DemoCtx);
  if (embedded) return actions ? <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 2, mt: -0.5 }}>{actions}</Stack> : null;
  return (
    <Stack direction="row" alignItems="flex-end" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1.5 }}>
      <Box sx={{ flex: 1, minWidth: 300 }}>
        {sys && <Typography sx={{ fontSize: 12, fontWeight: 600, color: C.part[sys[0][1]] || 'primary.main', letterSpacing: '.02em', mb: 0.5 }}>{sys.map(([n]) => (demo ? n : n.replace(/\s*\(Nedra[^)]*\)/, ''))).join(' · ')}</Typography>}
        <Typography variant="h4" component="h1">{title}</Typography>
        {sub && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 900 }}>{sub}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>{actions}</Stack>}
    </Stack>
  );
}

// Спарклайн
export function Spark({ data, color = C.brand, w = 80, h = 30 }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <Box sx={{ width: w, height: h }}>
      <ResponsiveContainer><LineChart data={d} margin={{ top: 3, bottom: 3, left: 2, right: 4 }}><YAxis hide domain={['dataMin', 'dataMax']} /><Line dataKey="v" stroke={color} strokeWidth={1.6} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>
    </Box>
  );
}

// KPI: { label, value, unit, delta, du, dd, good: 'up'|'down', d (подпись), spark, to }
export function Kpi({ label, value, unit, delta, du = '', dd = 1, good, d, spark, to }) {
  let dl = null;
  if (delta != null) {
    const up = delta >= 0; const ok = good ? (good === 'up' ? up : !up) : null;
    const col = ok == null ? 'text.secondary' : ok ? 'success.main' : 'error.main'; const I = up ? ArrowDropUpRounded : ArrowDropDownRounded;
    dl = <Box component="span" sx={{ color: col, fontWeight: 600, display: 'inline-flex', alignItems: 'center', mr: 0.5 }}><I sx={{ fontSize: 20, ml: -0.6 }} />{sgn(delta, dd)}{du}</Box>;
  }
  const body = (
    <Card sx={{ height: '100%', position: 'relative', transition: 'border-color .15s', ...(to ? { '&:hover': { borderColor: 'primary.main' } } : {}) }}>
      <Box sx={{ p: '12px 14px 10px' }}>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={label}>{label}</Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{value}{unit && <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary', ml: 0.5 }}>{unit}</Typography>}</Typography>
          {spark && <Spark data={spark} color="#9aa6b8" w={72} h={26} />}
        </Stack>
        <Typography variant="caption" color="text.secondary" component="div" noWrap sx={{ display: 'flex', alignItems: 'center', minHeight: 20 }}>{dl}{d}</Typography>
      </Box>
    </Card>
  );
  return to ? <Box component={RouterLink} to={to} sx={{ textDecoration: 'none', display: 'block', height: '100%' }}>{body}</Box> : body;
}
export function KpiRow({ items, min = 210 }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 1.5, mb: 2 }}>{items.map((k, i) => <Kpi key={i} {...k} />)}</Box>;
}

// Карточка раздела: title, sub, action, footer, flush (без отступов — для таблиц и списков)
export function Section({ title, sub, info, action, footer, flush, children, sx }) {
  const demo = useContext(DemoCtx);
  const head = info && demo ? <Stack direction="row" spacing={0.75} alignItems="center"><span>{title}</span><Tooltip title={info} placement="top-start"><Box component="span" sx={{ display: 'inline-flex', ...DEMO_SX, cursor: 'help' }}><InfoOutlined sx={{ fontSize: 13 }} />BPMN</Box></Tooltip></Stack> : title;
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...sx }}>
      {title != null && <CardHeader title={head} subheader={sub} action={action} />}
      <Box sx={{ flex: 1, minWidth: 0, ...(flush ? { pt: 1 } : { px: 2, pt: 1.25, pb: 2 }) }}>{children}</Box>
      {footer && <><Divider /><Box sx={{ px: 2, py: 1, fontSize: 12, color: 'text.secondary', display: 'flex', gap: 1, alignItems: 'center' }}>{footer}</Box></>}
    </Card>
  );
}

// Сетка: cols — шаблон grid-template-columns (по умолчанию 1fr 1fr)
export function Grid2({ cols = '1fr 1fr', gap = 2, children, sx }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: cols }, gap, mb: 2, '& > *': { minWidth: 0 }, ...sx }}>{children}</Box>;
}

// «Ключ — значение»
export function KV({ rows, w = '38%' }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `minmax(130px, ${w}) 1fr`, columnGap: 2, rowGap: 0.9, fontSize: 13 }}>
      {rows.filter((r) => r && r[1] != null && r[1] !== '').map(([k, v], i) => [<Box key={'k' + i} sx={{ color: 'text.secondary' }}>{k}</Box>, <Box key={'v' + i} sx={{ minWidth: 0 }}>{v}</Box>])}
    </Box>
  );
}

// Горизонтальные полосы: rows [{ l, v, c, txt, mark, tip }]
export function Hbars({ rows, max, labelW = '40%' }) {
  const mx = max || Math.max(...rows.map((r) => Math.max(r.v, r.mark || 0)), 1);
  return (
    <Stack spacing={1.1}>
      {rows.map((r, i) => (
        <Tooltip key={i} title={r.tip || ''} placement="top" disableHoverListener={!r.tip}>
          <Box sx={{ display: 'grid', gridTemplateColumns: `minmax(110px, ${labelW}) 1fr auto`, gap: 1.25, alignItems: 'center', fontSize: 13 }}>
            <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.l}>{r.l}</Box>
            <Box sx={{ position: 'relative', height: 12 }}>
              <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(0.5, (r.v / mx) * 100)}%`, bgcolor: r.c || C.s[0], borderRadius: '0 4px 4px 0' }} />
              {r.mark != null && <Box sx={{ position: 'absolute', top: -3, bottom: -3, width: 2, bgcolor: 'text.primary', left: `${(r.mark / mx) * 100}%` }} />}
            </Box>
            <Box sx={{ color: 'text.secondary', minWidth: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.txt ?? fmt(r.v)}</Box>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  );
}

// Сегментированная полоса: parts [{ l, v, c }]
export function SegBar({ parts, h = 12 }) {
  const t = sum(parts.map((p) => p.v)) || 1;
  return (
    <Box>
      <Stack direction="row" spacing="2px" sx={{ height: h, borderRadius: 1, overflow: 'hidden' }}>
        {parts.map((p, i) => <Tooltip key={i} title={`${p.l}: ${fmt(p.v)} (${pct((p.v / t) * 100)})`}><Box sx={{ width: `${(p.v / t) * 100}%`, bgcolor: p.c }} /></Tooltip>)}
      </Stack>
      <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, mt: 1, fontSize: 12.5, color: 'text.secondary' }}>
        {parts.map((p, i) => <Stack key={i} direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: p.c }} /><span>{p.l}</span><b style={{ color: '#16191f' }}>{fmt(p.v)}</b></Stack>)}
      </Stack>
    </Box>
  );
}

// Индикатор заполнения: tone good / warn / crit / '' (синий)
export function Meter({ v, max = 100, tone = '', h = 8 }) {
  const col = { good: C.good, warn: C.warn, crit: C.crit, '': C.brand }[tone] || C.brand;
  return <LinearProgress variant="determinate" value={Math.min(100, (v / max) * 100)} sx={{ height: h, borderRadius: 4, bgcolor: col + '26', '& .MuiLinearProgress-bar': { bgcolor: col, borderRadius: 4 } }} />;
}

// Шаги процесса: items [{ c (код), t, done, cur, sub }]
export function Steps({ items }) {
  return (
    <Box sx={{ display: 'flex', overflowX: 'auto', pb: 0.5 }}>
      {items.map((s, i) => (
        <Box key={i} sx={{ flex: 1, minWidth: 120, position: 'relative', pt: 3, pr: 1, fontSize: 12, color: s.cur ? 'text.primary' : 'text.secondary', fontWeight: s.cur ? 600 : 400 }}>
          <Box sx={{ position: 'absolute', top: 8, left: 0, right: 0, height: 2, bgcolor: s.done ? C.good : '#e3e7ee' }} />
          <Box sx={{ position: 'absolute', top: 2, left: 0, width: 14, height: 14, borderRadius: '50%', bgcolor: s.done ? C.good : s.cur ? C.brand : '#fff', border: '2px solid', borderColor: s.done ? C.good : s.cur ? C.brand : '#c3c7cf', boxShadow: s.cur ? '0 0 0 3px #e8f0fb' : 'none' }} />
          {s.c && <Box sx={{ fontFamily: 'Consolas, monospace', fontSize: 11, color: 'text.secondary', fontWeight: 400 }}>{s.c}</Box>}
          {s.t}
          {s.sub && <Box sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 400 }}>{s.sub}</Box>}
        </Box>
      ))}
    </Box>
  );
}

// Код (процесс / шаг)
export const Code = ({ children }) => <Box component="span" sx={{ fontFamily: 'Consolas, "Cascadia Mono", monospace', fontSize: 12, bgcolor: '#eef1f5', borderRadius: 0.75, px: 0.6, color: 'text.secondary', whiteSpace: 'nowrap' }}>{children}</Box>;
// Метка-пилюля (система)
export const Pill = ({ children }) => <Chip size="small" variant="outlined" label={children} sx={{ fontWeight: 500, color: 'text.secondary', bgcolor: '#fff', mr: 0.5, mb: 0.25 }} />;
// Иконка в кружке для списков
export function IconBox({ icon: I, tone = 'info' }) {
  const t = TONE[tone] || TONE.info;
  return <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: t.bg, color: t.fg, display: 'grid', placeItems: 'center', flex: 'none' }}>{I ? <I sx={{ fontSize: 18 }} /> : null}</Box>;
}
// Пометка источника
export const Src = ({ children }) => <Typography component="span" sx={{ fontSize: 11.5, color: 'text.secondary', fontStyle: 'normal' }}>{children}</Typography>;
