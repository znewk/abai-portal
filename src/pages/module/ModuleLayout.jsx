// Модуль ЦД: заголовок модуля и вкладки (обзор, процессы, задачи, объекты); страницы вкладок — через Outlet.
import { Outlet, useParams, useLocation, Link as RouterLink, Navigate } from 'react-router-dom';
import { Box, Tabs, Tab, Typography, Stack } from '@mui/material';
import { PARTS } from '../../data/core.js';
import { MODULE_TABS, modPath } from '../../layout/nav.js';
import { EmbedCtx } from '../../components/ui.jsx';

export default function ModuleLayout() {
  const { part } = useParams(); const loc = useLocation();
  const P = PARTS.find((x) => x.id === part); if (!P) return <Navigate to="/" replace />;
  const seg = decodeURIComponent(loc.pathname).split('/').filter(Boolean);
  const inProc = seg[2] === 'p';
  const tabs = MODULE_TABS[part]; const cur = inProc ? 'proc' : seg[2] || '';
  return (
    <Box>
      {!inProc && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: P.c }} /><Typography sx={{ fontSize: 12, fontWeight: 600, color: P.c, letterSpacing: '.02em' }}>{P.sys}</Typography></Stack>
          <Typography variant="h4" component="h1" sx={{ mt: 0.5 }}>{P.t}</Typography>
        </Box>
      )}
      {!inProc && (
        <Tabs value={tabs.some((t) => t[0] === cur) ? cur : false} sx={{ mb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          {tabs.map(([id, t]) => <Tab key={id} value={id} label={t} component={RouterLink} to={modPath(part, id)} sx={{ fontWeight: 600 }} />)}
        </Tabs>
      )}
      <EmbedCtx.Provider value={true}><Outlet /></EmbedCtx.Provider>
    </Box>
  );
}
