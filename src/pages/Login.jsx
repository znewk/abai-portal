// Вход: выбор роли (роли — по дорожкам процессов BPMN Dream TO BE).
import { Box, Typography, Card, CardActionArea, Avatar, Stack } from '@mui/material';
import LockRounded from '@mui/icons-material/LockRounded';
import { ROLES } from '../data/core.js';
import { useApp } from '../state.jsx';
import { Logo } from '../layout/Shell.jsx';
import { C } from '../theme.js';

const PARTS = [
  ['ЦД скважины', 'Цифровое бурение · Мониторинг ТКРС'],
  ['ЦД пласта', 'ЦРНС 2.0 · УЗ 2.0 · ПАЭГТМ'],
  ['ЦД добычи и инфраструктуры', 'ПДИМ 2.0 · ТР 2.0 · ПГНО · Наземная инфраструктура'],
  ['Единые данные', 'КХД · ABAI БД 2.0'],
];

export default function Login() {
  const { login } = useApp();
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(420px, 44%) 1fr' } }}>
      <Box sx={{ background: `linear-gradient(160deg, ${C.navy} 0%, #123463 55%, ${C.brand} 130%)`, color: '#fff', p: '48px 56px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', right: -180, bottom: -180, width: 520, height: 520, borderRadius: '50%', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 0 0 60px rgba(255,255,255,.025), 0 0 0 140px rgba(255,255,255,.02)' }} />
        <Stack direction="row" spacing={1.5} alignItems="center"><Logo size={40} /><Box><Typography sx={{ fontWeight: 700, fontSize: 16 }}>ABAI · ИС ЦД Актива</Typography><Typography sx={{ fontSize: 12, color: '#9fb3cf' }}>АО НК «КазМунайГаз» · Upstream</Typography></Box></Stack>
        <Typography sx={{ mt: 'auto', fontSize: 34, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' }}>Цифровой двойник актива<br /><Box component="span" sx={{ color: '#9ec5f4' }}>на базе продуктов ABAI</Box></Typography>
        <Typography sx={{ color: '#c8d6ea', fontSize: 15, maxWidth: 520, mt: 2, mb: 3.5 }}>Единая платформа централизованной зоны: цифровые двойники скважины, пласта, добычи и наземной инфраструктуры на общем слое данных. Поддержка решений от операционного уровня ДЗО до корпоративного центра.</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, maxWidth: 560, mb: 'auto', position: 'relative' }}>
          {PARTS.map(([t, s]) => <Box key={t} sx={{ border: '1px solid rgba(255,255,255,.14)', borderRadius: 2, p: '10px 12px', bgcolor: 'rgba(255,255,255,.04)', fontSize: 13, color: '#dbe5f3' }}><b style={{ display: 'block', color: '#fff', marginBottom: 2 }}>{t}</b>{s}</Box>)}
        </Box>
        <Typography sx={{ color: '#8fa6c6', fontSize: 12, mt: 4 }}>© АО НК «КазМунайГаз» · ИС «Цифровой двойник актива»</Typography>
      </Box>
      <Box sx={{ p: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 900 }}>
        <Typography variant="h5" sx={{ fontSize: 22 }}>Вход в систему</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, mb: 3 }}>Выберите роль — рабочий стол, задачи и доступные модули зависят от роли.</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 1.25 }}>
          {ROLES.map((r) => (
            <Card key={r.id} sx={{ '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 14px rgba(28,92,171,.12)' } }}>
              <CardActionArea onClick={() => login(r.id)} sx={{ p: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 1.5, justifyContent: 'flex-start' }}>
                <Avatar sx={{ bgcolor: r.color, width: 38, height: 38, fontSize: 13, fontWeight: 700 }}>{r.ini}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{r.short}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{r.name} · {r.org}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>{r.desc}</Typography>
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2.5, color: 'text.secondary', fontSize: 12 }}><LockRounded sx={{ fontSize: 16 }} /><span>Вход в рабочем контуре — через корпоративную учётную запись (SSO) и ЭЦП НУЦ РК</span></Stack>
      </Box>
    </Box>
  );
}
