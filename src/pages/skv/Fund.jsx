// Фонд скважин: 4 показателя → схема расположения и список «Требуют внимания» → реестр с фильтрами.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, Button, TextField, MenuItem, List, ListItemButton, Typography, InputAdornment } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { PageHeader, KpiRow, Section, Grid2, StatusChip } from '../../components/ui.jsx';
import DataTable from '../../components/DataTable.jsx';
import { WELLS, W_ST, NGDU } from '../../data/core.js';
import { fmt, pct, plural, dFmt, tFmt, TODAY } from '../../lib/format.js';
import { useApp } from '../../state.jsx';
import { M_C, noRate, wellPath, WellMap, MapLegend } from './_shared.jsx';

const METHODS = ['ЭЦН', 'ШГН', 'Фонтан', 'Нагнетательная'];
const dash = <Typography component="span" color="text.disabled">—</Typography>;

export default function Fund() {
  const nav = useNavigate(); const { toast } = useApp();
  const [st, setSt] = useState('all'); const [m, setM] = useState('all'); const [ng, setNg] = useState('all'); const [q, setQ] = useState('');
  const W = WELLS; const cnt = (s) => W.filter((w) => w.status === s).length; const cntP = (s) => W.filter((w) => w.type === 'prod' && w.status === s).length;
  const inj = W.filter((w) => w.type === 'inj'); const nProd = W.length - inj.length; const prodW = W.filter((w) => w.type === 'prod' && w.status === 'work');
  const risk = W.filter((w) => w.risk > 70);
  const rows = useMemo(() => W.filter((w) => (st === 'all' || w.status === st) && (m === 'all' || w.method === m) && (ng === 'all' || w.ngdu === ng) && (!q || (w.id + ' ' + w.gzu + ' ' + w.fld).toLowerCase().includes(q.trim().toLowerCase()))), [st, m, ng, q]);

  // 6 колонок: подробности — в паспорте по клику
  const cols = [
    { field: 'id', headerName: 'Скважина', width: 130, renderCell: ({ value }) => <b>{value}</b> },
    { field: 'ngdu', headerName: 'НГДУ', width: 100 },
    { field: 'method', headerName: 'Способ', width: 150, renderCell: ({ value }) => <Stack direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: M_C[value] }} /><span>{value}</span></Stack> },
    { field: 'status', headerName: 'Статус', width: 150, valueGetter: (v) => W_ST[v][0], renderCell: ({ row: w }) => <StatusChip tone={W_ST[w.status][1]} label={W_ST[w.status][0]} /> },
    { field: 'rate', headerName: 'Дебит нефти / закачка', type: 'number', width: 180, valueGetter: (v, w) => (noRate(w) ? null : w.type === 'inj' ? w.qInj : w.qO),
      renderCell: ({ row: w, value }) => (value == null ? dash : w.type === 'inj' ? `${fmt(value)} м³/сут` : `${fmt(value, 1)} т/сут`) },
    { field: 'risk', headerName: 'Риск отказа ГНО', type: 'number', flex: 1, minWidth: 140, valueGetter: (v, w) => (w.type === 'inj' || w.method === 'Фонтан' ? null : v),
      renderCell: ({ value }) => (value == null ? dash : <Box component="span" sx={{ color: value > 70 ? 'error.main' : 'text.primary', fontWeight: value > 70 ? 600 : 400 }}>{value}%</Box>) },
  ];

  const attn = W.filter((w) => w.dev || w.risk > 70).sort((a, b) => Number(b.dev) - Number(a.dev) || b.risk - a.risk).slice(0, 6);
  return (
    <>
      <PageHeader title="Фонд скважин" sub={`Узень, Карамандыбас · НГДУ-1 – НГДУ-4 · на ${dFmt(TODAY)} ${tFmt(TODAY)}`} sys={[['ABAI БД 2.0', 'skv']]}
        actions={<Button variant="outlined" onClick={() => toast(`Файл «Фонд_скважин_${dFmt(TODAY)}.xlsx» сформирован`)}>Выгрузить</Button>} />
      <KpiRow items={[
        { label: 'Фонд скважин', value: fmt(W.length), d: `добывающих ${nProd} · нагнетательных ${inj.length}` },
        { label: 'Коэффициент эксплуатации', value: pct((prodW.length / nProd) * 100), d: `${prodW.length} добывающих в работе` },
        { label: 'Простой и ремонт', value: fmt(cntP('idle') + cntP('repair')), d: `добывающих: простой ${cntP('idle')} · ТКРС ${cntP('repair')}`, to: '/skv/tkrs' },
        { label: 'Высокий риск отказа ГНО', value: fmt(risk.length), d: 'вероятность выше 70%', to: '/dob/gno' },
      ]} />
      <Grid2 cols="2fr 1fr">
        <Section title="Схема расположения" sub={`${W.length} скважин`} info="Нажмите на скважину, чтобы открыть паспорт. Статусы — ABAI БД 2.0, режимы — ABAI ТР 2.0.">
          <WellMap wells={W} height={470} /><MapLegend wells={W} />
        </Section>
        <Section title="Требуют внимания" flush info="Отклонения от технологического режима — ABAI ТР 2.0 (Д2, Д9); прогноз отказов ГНО — ABAI ПГНО (Д6).">
          <List disablePadding>
            {attn.map((w) => (
              <ListItemButton key={w.id} onClick={() => nav(wellPath(w.id))} sx={{ borderRadius: 0, px: 2, py: 1.1, borderTop: '1px solid #f0f2f5', gap: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{w.id}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{w.ngdu} · {w.method}</Typography>
                </Box>
                <StatusChip tone={w.dev ? 'crit' : 'warn'} label={w.dev ? 'Отклонение от режима' : `Риск отказа ${w.risk}%`} />
              </ListItemButton>
            ))}
          </List>
        </Section>
      </Grid2>
      <Section title="Реестр скважин" sub={`${rows.length} ${plural(rows.length, 'скважина', 'скважины', 'скважин')}`} flush
        action={
          <Stack direction="row" spacing={1}>
            <TextField select size="small" value={st} onChange={(e) => setSt(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="all">Все статусы</MenuItem>{Object.keys(W_ST).map((k) => <MenuItem key={k} value={k}>{W_ST[k][0]} · {cnt(k)}</MenuItem>)}</TextField>
            <TextField select size="small" value={m} onChange={(e) => setM(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="all">Все способы</MenuItem>{METHODS.map((x) => <MenuItem key={x} value={x}>{x} · {W.filter((w) => w.method === x).length}</MenuItem>)}</TextField>
            <TextField select size="small" value={ng} onChange={(e) => setNg(e.target.value)} sx={{ minWidth: 120 }}><MenuItem value="all">Все НГДУ</MenuItem>{NGDU.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField>
            <TextField size="small" placeholder="Скважина, ГЗУ" value={q} onChange={(e) => setQ(e.target.value)} sx={{ width: 190 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} />
          </Stack>
        }>
        <DataTable rows={rows} columns={cols} pageSize={10} onRowClick={(w) => nav(wellPath(w.id))} />
      </Section>
    </>
  );
}
