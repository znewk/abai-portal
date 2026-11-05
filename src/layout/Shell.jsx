// Оболочка: боковое меню (по роли), шапка (хлебные крошки, поиск по объектам, задачам и процессам, актив, уведомления роли, роль), область страницы.
import { useState, useMemo } from 'react';
import { Link as RouterLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Box, useMediaQuery, Drawer, List, ListItemButton, ListItemIcon, ListItemText, FormControlLabel, Switch, Tooltip, Typography, AppBar, Toolbar, Breadcrumbs, Link, Autocomplete, TextField, InputAdornment, Select, MenuItem, IconButton, Badge, Popover, Avatar, Menu, Divider, Stack, ListSubheader, Button } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import RestartAltRounded from '@mui/icons-material/RestartAltRounded';
import { navFor, NAV_FLAT, MODULE_TABS, canSee, navOf, procPath } from './nav.js';
import { useApp } from '../state.jsx';
import { ROLES, ASSETS, WELLS, BPMN, OBJECTS, W_ST, PARTS, partOfDir, NOUN, ALERTS } from '../data/core.js';
import { runTitle, runPath, stepPath, objOf } from '../data/exec.js';
import { notifsFor } from '../data/notify.js';
import { TONE } from '../components/ui.jsx';
import { C } from '../theme.js';
import { dFmt, tFmt, TODAY } from '../lib/format.js';

export const SIDE = 264;
export const Logo = ({ size = 32 }) => (
  <Box sx={{ width: size, height: size, borderRadius: 2, bgcolor: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
    <svg viewBox="0 0 32 32" width={size * 0.7} height={size * 0.7}><path d="M16 3 4 9.5v13L16 29l12-6.5v-13Z" fill="none" stroke="#1c5cab" strokeWidth="2.4" strokeLinejoin="round" /><path d="M16 9.5 9.5 13v7L16 23.5l6.5-3.5v-7Z" fill="#1c5cab" /><circle cx="16" cy="16.5" r="2.6" fill="#c9a227" /></svg>
  </Box>
);

// На экранах уже 1200 px (ноутбук, планшет) меню сворачивается до иконок с подсказками
function SideNav() {
  const { role, tasks } = useApp(); const loc = useLocation(); const cur = navOf(loc.pathname).to;
  const open = tasks.length; const mini = !useMediaQuery((t) => t.breakpoints.up('lg')); const W = mini ? 68 : SIDE;
  return (
    <Drawer variant="permanent" sx={{ width: W, flexShrink: 0, '& .MuiDrawer-paper': { width: W, bgcolor: C.navy, color: '#c9d5e6', border: 0, overflowX: 'hidden' } }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ height: 56, px: mini ? 1.5 : 2, borderBottom: '1px solid rgba(255,255,255,.07)', flex: 'none' }}>
        <Logo />
        <Box sx={{ display: mini ? 'none' : 'block' }}><Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '.02em', lineHeight: 1.2 }}>ABAI · ИС ЦД</Typography><Typography sx={{ fontSize: 11, color: '#9fb3cf' }}>Цифровой двойник актива</Typography></Box>
      </Stack>
      <Box sx={{ flex: 1, overflowY: 'auto', px: mini ? 1 : 1.25, py: 1.5 }}>
        {navFor(role).map((g) => {
          const items = g.items.filter(([to]) => canSee(role, to)); if (!items.length) return null;
          return (
            <Box key={g.id} sx={{ mb: mini ? 1 : 2, ...(mini ? { pb: 1, borderBottom: '1px solid rgba(255,255,255,.07)' } : {}) }}>
              <Typography sx={{ display: mini ? 'none' : 'block', px: 1.25, mb: 0.75, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#6f86a8' }}>{g.t}</Typography>
              <List dense disablePadding>
                {items.map(([to, I, t, c]) => {
                  const on = cur === to;
                  const btn = (
                    <ListItemButton key={to} component={RouterLink} to={to} selected={on} aria-label={t} sx={{ py: 0.8, px: 1.25, mb: 0.25, position: 'relative', justifyContent: mini ? 'center' : 'flex-start', color: '#c9d5e6', '&:hover': { bgcolor: 'rgba(255,255,255,.06)', color: '#fff' }, '&.Mui-selected, &.Mui-selected:hover': { bgcolor: C.brand, color: '#fff' } }}>
                      <ListItemIcon sx={{ minWidth: mini ? 0 : 34, color: on ? '#fff' : c || 'inherit' }}><I sx={{ fontSize: 20 }} /></ListItemIcon>
                      {!mini && <ListItemText primary={t} primaryTypographyProps={{ sx: { fontSize: 14, fontWeight: on ? 600 : 400 } }} />}
                      {to === '/tasks' && open > 0 && <Box sx={{ bgcolor: on ? '#fff' : '#e34948', color: on ? C.brand : '#fff', borderRadius: 5, fontSize: 11, fontWeight: 700, px: mini ? 0.6 : 0.9, lineHeight: mini ? '16px' : '18px', ...(mini ? { position: 'absolute', top: 2, right: 4, fontSize: 10 } : {}) }}>{open}</Box>}
                    </ListItemButton>
                  );
                  return mini ? <Tooltip key={to} title={t} placement="right">{btn}</Tooltip> : btn;
                })}
              </List>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: mini ? 'none' : 'block', borderTop: '1px solid rgba(255,255,255,.07)', px: 2, py: 1.25, fontSize: 11, color: '#6f86a8', flex: 'none' }}>
        <b style={{ color: '#9fb3cf' }}>ИС ЦД Актива</b> · версия 2.1<br />Данные на {dFmt(TODAY)} {tFmt(TODAY)}
      </Box>
    </Drawer>
  );
}

// Хлебные крошки из пути: модуль → вкладка / процесс → запись; показываются последние два уровня
function useCrumbs(path, runs) {
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (seg[0] !== 'm') { const nf = navOf(path); const out = [[nf.t, nf.to]]; if (path !== nf.to && seg[1]) out.push([seg[seg.length - 1], null]); return out; }
  const part = PARTS.find((x) => x.id === seg[1]); if (!part) return [];
  const out = [[part.s, '/m/' + part.id]];
  if (seg[2] === 'p' && seg[3]) {
    const P = BPMN.find((x) => x.p === seg[3]);
    out.push([P ? `${P.p} ${P.short}` : seg[3], procPath(part.id, seg[3])]);
    if (seg[4] === 'run' && seg[5]) { const r = runs.find((x) => x.id === seg[5]); out.push([r ? r.obj.short : seg[5], null]); } else if (seg[4] === 'runs') out.push(['Ход исполнения', null]); else if (seg[4] === 'model') out.push(['Регламент', null]);
  } else if (seg[2] === 'obj' && seg[3]) { out.push([objOf(seg[3]).short, null]); }
  else if (seg[2]) {
    const tab = (MODULE_TABS[part.id] || []).find((t) => t[0] === seg[2]);
    out.push([tab ? tab[1] : seg[2], seg[3] ? '/m/' + part.id + '/' + seg[2] : null]);
    if (seg[3]) out.push([seg[3], null]);
  }
  return out;
}

// Поиск: мои задачи, скважины, объекты, записи процессов, отклонения, документы, процессы, разделы.
// На узком экране (планшет) поле свёрнуто в иконку и раскрывается поверх крошек.
function Search() {
  const nav = useNavigate(); const { role, runs, tasks } = useApp();
  const wide = useMediaQuery((t) => t.breakpoints.up('lg')); const [open, setOpen] = useState(false);
  const opts = useMemo(() => {
    const seenDoc = new Set(); const docs = [];
    runs.filter((r) => canSee(role, runPath(r))).forEach((r) => [...r.done].reverse().forEach((d) => r.P.s[d.i].d.forEach((name) => {
      const k = r.id + '|' + name; if (seenDoc.has(k)) return; seenDoc.add(k);
      docs.push({ g: 'Документы', l: name.replace(/^Форма БД 2\.0:\s*/, '').replace(/\s*\((?:[^()]*\.[a-zA-Z]+[^()]*|SEG-[DY]|проект Petrel[^()]*)\)\s*$/, ''), s: `${runTitle(r)} · ${r.P.s[d.i].r} · ${dFmt(d.at)}`, to: stepPath(r, d.i) });
    })));
    const alertTo = (a) => { const r = runs.find((x) => x.num === a.id); return r ? runPath(r) : '/m/skv/wells/' + encodeURIComponent(a.well); };
    return [
      ...tasks.map((t) => ({ g: 'Мои задачи', l: t.t, s: `${t.title || t.pt} · ${t.objName}`, to: t.path })),
      ...WELLS.filter((w) => !role.limited || runs.some((r) => r.obj.id === 'w:' + w.id)).map((w) => ({ g: 'Скважины', l: w.id, s: `${w.fld} · ${w.ngdu} · ${W_ST[w.status][0]}`, to: '/m/skv/wells/' + encodeURIComponent(w.id) })),
      ...OBJECTS.filter(() => !role.limited).map((o) => ({ g: 'Объекты', l: o.name, s: objOf(o.id).sub, to: objOf(o.id).path })),
      ...runs.filter((r) => r.status === 'active' && canSee(role, runPath(r))).map((r) => ({ g: 'В работе', l: runTitle(r), s: `${r.num || r.id} · ${r.lanes.join(', ')}`, to: runPath(r) })),
      ...ALERTS.filter(() => !role.limited).map((a) => ({ g: 'Отклонения', l: `${a.id} · ${a.t}`, s: `${a.well} · ${a.ngdu} · ${a.st}`, to: alertTo(a) })),
      ...docs,
      ...BPMN.map((P) => ({ g: 'Процессы', l: `${P.p} · ${P.t}`, s: NOUN[P.p] || P.short, to: procPath(partOfDir(P.m), P.p) })).filter((x) => canSee(role, x.to)),
      ...NAV_FLAT.filter((x) => canSee(role, x.to)).map((x) => ({ g: 'Разделы', l: x.t, s: x.g.t, to: x.to })),
    ];
  }, [role, runs, tasks]);
  if (!wide && !open) return <Tooltip title="Поиск"><IconButton onClick={() => setOpen(true)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><SearchRounded fontSize="small" /></IconButton></Tooltip>;
  const box = (
    <Autocomplete size="small" options={opts} groupBy={(o) => o.g} getOptionLabel={(o) => o.l} sx={{ width: wide ? { lg: 240, xl: 300 } : '100%' }} blurOnSelect clearOnBlur openOnFocus={!wide}
      filterOptions={(o, s) => { const q = s.inputValue.toLowerCase().trim(); return q ? o.filter((x) => (x.l + ' ' + x.s).toLowerCase().includes(q)).slice(0, 24) : []; }}
      noOptionsText="Скважина, объект, задача, документ, отклонение или раздел" onChange={(e, v) => { if (v) { nav(v.to); setOpen(false); } }} onBlur={() => !wide && setOpen(false)}
      renderOption={(p, o) => { const { key, ...rest } = p; return <li key={key} {...rest}><Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 13 }} noWrap>{o.l}</Typography><Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>{o.s}</Typography></Box></li>; }}
      slotProps={{ paper: { sx: { width: 440, maxWidth: '92vw' } } }}
      renderInput={(p) => <TextField {...p} autoFocus={!wide} placeholder="Поиск" InputProps={{ ...p.InputProps, startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment>, sx: { bgcolor: '#f3f5f8', borderRadius: 2, fontSize: 13 } }} />} />
  );
  if (wide) return box;
  return <Box sx={{ position: 'absolute', left: 16, right: 16, top: 8, zIndex: 2, display: 'flex', gap: 1, alignItems: 'center', bgcolor: '#fff' }}><Box sx={{ flex: 1 }}>{box}</Box><IconButton onClick={() => setOpen(false)} aria-label="Закрыть поиск"><CloseRounded fontSize="small" /></IconButton></Box>;
}

function Header() {
  const { role, login, logout, asset, setAsset, demo, setDemo, runs, tasks, read, markRead, resetAll, toast } = useApp(); const loc = useLocation(); const nav = useNavigate();
  const [nAnchor, setNAnchor] = useState(null); const [uAnchor, setUAnchor] = useState(null);
  const crumbs = useCrumbs(loc.pathname, runs).slice(-2);
  const assets = role.asset === 'all' ? ASSETS : ASSETS.filter((a) => a.id === role.asset);
  const notifs = useMemo(() => notifsFor(role, runs, tasks), [role, runs, tasks]);
  const unread = notifs.filter((x) => !read[x.k]).length;
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
      <Toolbar sx={{ gap: 1.25, minHeight: '56px !important', position: 'relative' }}>
        <Breadcrumbs sx={{ fontSize: 13, flex: 1, minWidth: 0, '& ol': { flexWrap: 'nowrap' }, '& li': { minWidth: 0 } }}>
          <Link component={RouterLink} to="/" underline="hover" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>ИС ЦД</Link>
          {crumbs.map(([t, to], i) => (to && i < crumbs.length - 1
            ? <Link key={i} component={RouterLink} to={to} underline="hover" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 260 }}>{t}</Link>
            : <Typography key={i} sx={{ fontSize: 13, fontWeight: i === crumbs.length - 1 ? 600 : 400, maxWidth: 320 }} color={i === crumbs.length - 1 ? 'text.primary' : 'text.secondary'} noWrap>{t}</Typography>))}
        </Breadcrumbs>
        <Search />
        <Tooltip title="Показать на экранах связь с процессами и шагами BPMN, источники данных — для демонстрации">
          <FormControlLabel sx={{ mr: 0, ml: 0, px: 1, borderRadius: 2, border: '1px dashed', borderColor: demo ? '#8b5cf6' : 'divider', bgcolor: demo ? '#f5f3ff' : 'transparent', whiteSpace: 'nowrap', '& .MuiFormControlLabel-label': { fontSize: 12.5, fontWeight: 600, color: demo ? '#6d28d9' : 'text.secondary' } }}
            control={<Switch size="small" checked={demo} onChange={(e) => setDemo(e.target.checked)} color="secondary" />} label="Демо · BPMN" />
        </Tooltip>
        {!role.limited && <Select size="small" value={asset} onChange={(e) => setAsset(e.target.value)} sx={{ fontSize: 13, fontWeight: 600, minWidth: 150, display: { xs: 'none', xl: 'inline-flex' } }} renderValue={(v) => <span><Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', mr: 0.75 }}>Актив</Typography>{ASSETS.find((a) => a.id === v).short}</span>}>
          {assets.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
        </Select>}
        <IconButton onClick={(e) => setNAnchor(e.currentTarget)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Badge badgeContent={unread} color="error"><NotificationsNoneRounded fontSize="small" /></Badge></IconButton>
        <Popover open={!!nAnchor} anchorEl={nAnchor} onClose={() => setNAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { width: 420, mt: 1, border: '1px solid', borderColor: 'divider', boxShadow: '0 12px 32px rgba(16,24,40,.16)' } } }}>
          <Box sx={{ px: 2, py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="subtitle2">Уведомления</Typography><Button size="small" onClick={() => notifs.forEach((x) => markRead(x.k))} disabled={!unread}>Прочитать все</Button></Box>
          <Divider />
          <List disablePadding sx={{ maxHeight: 460, overflowY: 'auto' }}>{notifs.map((x) => { const T = TONE[x.tone]; const I = T.icon; return (
            <ListItemButton key={x.k} onClick={() => { setNAnchor(null); markRead(x.k); nav(x.to); }} sx={{ borderRadius: 0, alignItems: 'flex-start', gap: 1.25, py: 1, borderBottom: '1px solid #f0f2f5', opacity: read[x.k] ? 0.7 : 1 }}>
              <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: T.bg, color: T.fg, display: 'grid', placeItems: 'center', flex: 'none' }}>{I && <I sx={{ fontSize: 17 }} />}</Box>
              <ListItemText primary={x.t} secondary={`${x.when} · ${x.s}`} primaryTypographyProps={{ sx: { fontSize: 13, fontWeight: read[x.k] ? 400 : 600 } }} secondaryTypographyProps={{ sx: { fontSize: 11.5 } }} />
            </ListItemButton>); })}
            {!notifs.length && <Typography sx={{ p: 2, fontSize: 13, color: 'text.secondary' }}>Новых уведомлений нет</Typography>}</List>
        </Popover>
        <Box onClick={(e) => setUAnchor(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1, py: 0.5, borderRadius: 2, '&:hover': { bgcolor: '#f3f5f8' }, minWidth: 0 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: role.color, fontSize: 12, fontWeight: 700 }}>{role.ini}</Avatar>
          <Box sx={{ lineHeight: 1.2, minWidth: 0, display: { xs: 'none', lg: 'block' } }}><Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }} noWrap>{role.short}</Typography><Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.2, maxWidth: 180 }} noWrap>{role.org}</Typography></Box>
        </Box>
        <Menu anchorEl={uAnchor} open={!!uAnchor} onClose={() => setUAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { width: 340, mt: 1 } } }}>
          <ListSubheader sx={{ lineHeight: '32px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>Сменить роль</ListSubheader>
          {ROLES.map((r) => (
            <MenuItem key={r.id} selected={r.id === role.id} onClick={() => { setUAnchor(null); login(r.id); nav('/'); }} sx={{ gap: 1.25, py: 0.75 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: r.color, fontSize: 11, fontWeight: 700 }}>{r.ini}</Avatar>
              <ListItemText primary={r.short} secondary={r.name} primaryTypographyProps={{ sx: { fontSize: 13 } }} secondaryTypographyProps={{ sx: { fontSize: 11.5 } }} />
            </MenuItem>
          ))}
          <Divider />
          {demo && <MenuItem onClick={() => { setUAnchor(null); resetAll(); toast('Демонстрационные данные восстановлены', 'info'); }} sx={{ gap: 1.25 }}><RestartAltRounded fontSize="small" /> Сбросить демонстрационные данные</MenuItem>}
          <MenuItem onClick={() => { setUAnchor(null); logout(); nav('/'); }} sx={{ gap: 1.25 }}><LogoutRounded fontSize="small" /> Выйти</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default function Shell() {
  const { role, demo } = useApp(); const loc = useLocation();
  const allowed = canSee(role, loc.pathname);
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <SideNav />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <Box component="main" sx={{ p: { xs: 2, xl: 3 }, pb: 2, flex: 1, minWidth: 0 }}>
          {allowed ? <Outlet /> : <Box><Typography variant="h4" component="h1">Нет доступа</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Раздел недоступен для роли «{role.short}». Подрядные организации работают только со своими задачами и объектами.</Typography></Box>}
        </Box>
        <Typography sx={{ fontSize: 11.5, color: '#a3aab6', px: 3, pb: 2 }}>© АО НК «КазМунайГаз» · ИС «Цифровой двойник актива» на базе ABAI{demo ? ' · демо: процессы, шаги, роли и документы — по BPMN Dream TO BE, показатели условные' : ''}</Typography>
      </Box>
    </Box>
  );
}
