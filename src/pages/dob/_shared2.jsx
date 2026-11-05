// Общее для страниц ЦД добычи (часть 2): ссылки, тоны загрузки и риска, боковая панель деталей.
import { Link as RouterLink } from 'react-router-dom';
import { Box, Drawer, IconButton, Typography, Stack, Divider, Link, Card, Tabs, Tab } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { ASSETS } from '../../data/core.js';

export const assetName = (asset) => (ASSETS.find((a) => a.id === asset && a.id !== 'all') || ASSETS[1]).name;

// Ссылка на процесс BPMN
export const ProcLink = ({ c, children }) => <Link component={RouterLink} to={'/proc/' + encodeURIComponent(c)} underline="hover">{children || c}</Link>;
// Ссылка на скважину (у подрядчика — без ссылки)
export const WellLink = ({ id, limited }) => (limited ? <b>{id}</b> : <Link component={RouterLink} to={'/m/skv/wells/' + encodeURIComponent(id)} underline="hover" onClick={(e) => e.stopPropagation()}>{id}</Link>);

// Загрузка объектов: до 80% норма, 80–90% повышенная, свыше 90% предельная
export const ldTone = (v) => (v > 90 ? 'crit' : v > 80 ? 'warn' : 'good');
export const LD_T = { good: 'Норма', warn: 'Повышенная', crit: 'Предельная' };
// Риск по матрице 5×5
export const riskTone = (s) => (s >= 15 ? 'crit' : s >= 10 ? 'serious' : s >= 5 ? 'warn' : 'good');
export const RISK_T = { crit: 'Критический', serious: 'Высокий', warn: 'Средний', good: 'Низкий' };

// Две строки в ячейке таблицы
export const Cell2 = ({ a, b, bold = true }) => (
  <Box sx={{ minWidth: 0 }}>
    <Box sx={{ fontWeight: bold ? 600 : 400, whiteSpace: 'normal' }}>{a}</Box>
    {b && <Box sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'normal' }}>{b}</Box>}
  </Box>
);

// Боковая панель деталей
export function DetailDrawer({ open, onClose, title, sub, children, actions, width = 640 }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: width } } } }}>
      <Stack direction="row" alignItems="flex-start" sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="h6" sx={{ fontSize: 17 }}>{title}</Typography>{sub && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{sub}</Typography>}</Box>
        <IconButton onClick={onClose} size="small"><CloseRounded /></IconButton>
      </Stack>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>{children}</Box>
      {actions && <><Divider /><Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 2.5, py: 1.5, bgcolor: '#fafbfc' }}>{actions}</Stack></>}
    </Drawer>
  );
}

// Подзаголовок секции внутри карточки
export const SecT = ({ children, sx }) => <Typography variant="overline" component="div" sx={{ color: 'text.secondary', fontSize: 11.5, mt: 2, mb: 0.75, ...sx }}>{children}</Typography>;

// Цветной текст отклонения
export const Dev = ({ v, d = 1, good = 'down', children }) => <Box component="span" sx={{ color: (good === 'down' ? v > 0 : v < 0) ? 'error.main' : 'success.main', fontWeight: 600 }}>{children}</Box>;

// Карточка с вкладками для второстепенного содержимого: tabs [[id, подпись]], action — справа от вкладок
export function TabCard({ tabs, value, onChange, action, children, sx }) {
  return (
    <Card sx={{ minWidth: 0, ...sx }}>
      <Stack direction="row" alignItems="center" sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={value} onChange={(e, v) => onChange(v)} variant="scrollable" sx={{ flex: 1, minWidth: 0 }}>
          {tabs.map(([id, l]) => <Tab key={id} value={id} label={l} />)}
        </Tabs>
        {action && <Stack direction="row" spacing={1} sx={{ flex: 'none', pl: 1 }}>{action}</Stack>}
      </Stack>
      {children}
    </Card>
  );
}
