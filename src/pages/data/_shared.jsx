// Общие элементы страниц «Единые данные» и «Аналитика»: боковая панель, вертикальная лента этапов, ссылка на процесс.
import { Drawer, Box, Typography, IconButton, Divider, Stack, Link, Tooltip } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { BPMN } from '../../data/core.js';
import { C } from '../../theme.js';

export function SideDrawer({ open, onClose, title, sub, children, actions, width = 600 }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '94vw', sm: width } } } }}>
      <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ px: 2.5, py: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontSize: 17 }}>{title}</Typography>
          {sub && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{sub}</Typography>}
        </Box>
        <IconButton onClick={onClose} size="small"><CloseRounded /></IconButton>
      </Stack>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>{children}</Box>
      {actions && <><Divider /><Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 2.5, py: 1.5, bgcolor: '#fafbfc' }}>{actions}</Stack></>}
    </Drawer>
  );
}

// Подзаголовок секции внутри панели
export const SecTitle = ({ children, sx }) => <Typography variant="overline" component="div" sx={{ color: 'text.secondary', fontSize: 11.5, mt: 2.5, mb: 1, ...sx }}>{children}</Typography>;

// Вертикальная лента: items [{ t, s, st: 'done' | 'cur' | '' }]
export function VTimeline({ items }) {
  return (
    <Box sx={{ position: 'relative', pl: 2.5 }}>
      <Box sx={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, bgcolor: '#e3e7ee' }} />
      {items.map((x, i) => (
        <Box key={i} sx={{ position: 'relative', pb: 1.5, fontSize: 13 }}>
          <Box sx={{ position: 'absolute', left: -20, top: 4, width: 12, height: 12, borderRadius: '50%', bgcolor: x.st === 'done' ? C.good : x.st === 'cur' ? C.brand : '#fff', border: '2px solid', borderColor: x.st === 'done' ? C.good : x.st === 'cur' ? C.brand : '#c3c7cf' }} />
          <Box sx={{ fontWeight: x.st === 'cur' ? 600 : 400 }}>{x.t}</Box>
          {x.s && <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{x.s}</Box>}
        </Box>
      ))}
    </Box>
  );
}

// Ссылка на процесс BPMN: «Д1» (с подсказкой полного названия) или «Д1 · Учёт добычи»
export function ProcLink({ code, short = false }) {
  const P = BPMN.find((p) => p.p === code);
  return (
    <Tooltip title={P ? P.t : ''} placement="top">
      <Link component={RouterLink} to={'/proc/' + encodeURIComponent(code)} onClick={(e) => e.stopPropagation()} underline="hover" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
        {code}{P && short ? <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}> · {P.short}</Box> : null}
      </Link>
    </Tooltip>
  );
}
// Список ссылок на процессы через запятую
export const ProcLinks = ({ codes, short }) => <Box component="span">{codes.map((c, i) => <span key={c}>{i ? ', ' : ''}<ProcLink code={c} short={short} /></span>)}</Box>;
