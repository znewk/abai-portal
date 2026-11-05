// Виджеты форм процессов Г1 и Г3 и карточки участка недр: карта участка, сектора и ИИ-ранжирование, кандидаты, бюджет ГРР.
// Данные — plast/geo.data.js и plast/_shared.jsx (те же сектора и точки, что в рабочем месте ЦРНС).
import { Box, Stack, Typography } from '@mui/material';
import { KV, StatusChip, Meter, Hbars } from '../../../components/ui.jsx';
import DataTable from '../../../components/DataTable.jsx';
import { fmt, plural } from '../../../lib/format.js';
import { C } from '../../../theme.js';
import { FieldMap, MapLegend, PtMark, PL_PT_ST, PL_PTS } from '../../plast/_shared.jsx';
import { areaOf, topOf, candidatesOf, PERSP, GRR_BUDGET, GRR_TOTAL, ROADMAP } from '../../plast/geo.data.js';

const Sub = ({ children }) => <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2, mb: 0.75 }}>{children}</Typography>;
const tone = (v) => (v >= PERSP ? 'good' : v >= 65 ? 'warn' : '');

// Карта участка: месторождение со слоем ОИЗ, проектные точки; Северо-Западный участок выделен контуром
const NW_BOX = { x: 120, y: 92, w: 230, h: 150 };
export function AreaMap({ obj, pts = true }) {
  const nw = obj && obj.id === 'area:nw';
  return (
    <Box>
      <Box sx={{ position: 'relative' }}>
        <FieldMap layer="oiz" pts={pts ? PL_PTS : []} fade />
        {nw && <Box component="svg" viewBox="40 40 920 495" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <rect x={NW_BOX.x} y={NW_BOX.y} width={NW_BOX.w} height={NW_BOX.h} rx="10" fill="rgba(28,92,171,.08)" stroke={C.navy} strokeWidth="2.5" strokeDasharray="8 5" />
          <text x={NW_BOX.x + 10} y={NW_BOX.y - 8} fontSize="20" fontWeight="700" fill={C.navy}>Северо-Западный участок · 86 км²</text>
        </Box>}
      </Box>
      <MapLegend layer="oiz" extra={pts ? Object.values(PL_PT_ST).map((v) => <PtMark key={v[0]} c={v[2]} label={v[0]} />) : null} />
    </Box>
  );
}

// Сектора с рейтингом ИИ и прогнозом показателей
export function SectorsWidget({ obj, limit, title }) {
  const T = topOf(obj); const rows = (limit ? T.all.slice(0, limit) : T.all);
  return (
    <Box>
      <Sub>{title || `Сектора · ${T.all.length} · перспективных (рейтинг ${PERSP} и выше) — ${T.persp.length}`}</Sub>
      <DataTable pageSize={0} rows={rows} getRowClassName={(p) => (p.row.score >= PERSP ? 'sel' : '')} columns={[
        { field: 'id', headerName: 'Сектор', width: 72, renderCell: (p) => <b>{p.value}</b> },
        { field: 'score', headerName: 'Рейтинг', width: 112, renderCell: (p) => <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}><Box sx={{ flex: 1 }}><Meter v={p.value} tone={tone(p.value)} h={6} /></Box><b style={{ minWidth: 26, textAlign: 'right' }}>{p.value}</b></Stack> },
        { field: 'qO', headerName: 'Qн, т/сут', type: 'number', width: 84, valueFormatter: (v) => fmt(v, 1) },
        { field: 'wc', headerName: 'Обводн., %', type: 'number', width: 88 },
        { field: 'why', headerName: 'Обоснование', flex: 1, minWidth: 200 },
      ]} />
    </Box>
  );
}
export const sectorFacts = (obj) => { const T = topOf(obj); const a = areaOf(obj); return [['Месторождение · горизонт', `${a.field} · ${a.horizon}`], ['Сетка секторов', a.grid], ['ТОП-10 %', T.t10.map((x) => `${x.id} (${x.score})`).join(', ')], ['ТОП-20 %', T.t20.map((x) => `${x.id} (${x.score})`).join(', ')], ['Перспективных секторов', `${T.persp.length} из ${T.all.length}`]]; };

// Скважины-кандидаты (точки) по перспективным секторам
export function GeoCandWidget({ obj, extra = [], title }) {
  const rows = candidatesOf(obj).concat(extra);
  return (
    <Box>
      <Sub>{title || `Скважины-кандидаты · ${rows.length}`}</Sub>
      <DataTable pageSize={0} rows={rows} columns={[
        { field: 'id', headerName: 'Точка', flex: 1, minWidth: 96, renderCell: (p) => <b>{p.value}</b> },
        { field: 'sec', headerName: 'Сектор', flex: 0.7, minWidth: 70 },
        { field: 'type', headerName: 'Тип', flex: 0.6, minWidth: 56 },
        { field: 'depth', headerName: 'Глубина, м', type: 'number', flex: 0.9, minWidth: 90, valueFormatter: (v) => fmt(v) },
        { field: 'q', headerName: 'Qн, т/сут', type: 'number', flex: 0.8, minWidth: 80, valueFormatter: (v) => fmt(v, 1) },
        { field: 'rate', headerName: 'Рейтинг', type: 'number', flex: 0.7, minWidth: 70 },
        { field: 'src', headerName: 'Предложение', flex: 1.3, minWidth: 120, renderCell: (p) => <StatusChip tone={p.value === 'КМГ' ? 'warn' : p.value === 'КМГИ' ? 'info' : ''} label={p.value === 'КМГ' ? 'акционер (КМГ)' : p.value} /> },
      ]} />
    </Box>
  );
}

// Бюджет ГРР по годам, млрд тг
export function GrrWidget() {
  const rows = GRR_BUDGET.map((x, i) => ({ id: i, ...x, t: +(x.y27 + x.y28 + x.y29).toFixed(2) }));
  return (
    <Box>
      <Sub>Затраты на ГРР · {fmt(GRR_TOTAL, 2)} млрд тг</Sub>
      <DataTable pageSize={0} rows={rows} columns={[
        { field: 'l', headerName: 'Вид работ', flex: 1, minWidth: 220 },
        ...['y27', 'y28', 'y29'].map((k) => ({ field: k, headerName: '20' + k.slice(1), type: 'number', width: 84, valueFormatter: (v) => (v ? fmt(v, 2) : '') })),
        { field: 't', headerName: 'Итого', type: 'number', width: 84, valueFormatter: (v) => fmt(v, 2) },
      ]} />
    </Box>
  );
}

// Дорожная карта доразведки
export function RoadmapWidget() {
  return (
    <Box>
      <Sub>Дорожная карта доразведки · {ROADMAP.length} {plural(ROADMAP.length, 'этап', 'этапа', 'этапов')}</Sub>
      <DataTable pageSize={0} rows={ROADMAP.map((x, i) => ({ id: i, ...x }))} columns={[
        { field: 'e', headerName: 'Этап', flex: 1, minWidth: 200, renderCell: (p) => <b>{p.value}</b> },
        { field: 'v', headerName: 'Объём', width: 170 }, { field: 't', headerName: 'Срок', width: 140 }, { field: 'who', headerName: 'Исполнитель', width: 170 },
      ]} />
    </Box>
  );
}

// Карточка объекта «Участок недр»: карта и сектора (контрактная территория, доразведка) или рейтинг секторов (свободный участок)
export function AreaObjWidget({ obj }) {
  const T = topOf(obj); const a = areaOf(obj);
  const bars = <Hbars max={100} labelW="34%" rows={T.all.slice(0, 8).map((s) => ({ l: `${s.id} · Qн ${fmt(s.qO, 1)} т/сут`, v: s.score, c: s.score >= PERSP ? C.s[0] : '#9ec5f4', txt: String(s.score), tip: `${s.id}: ${s.why}` }))} />;
  if (obj && obj.id === 'area:south') return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2, p: 2, bgcolor: '#fff', border: '1px solid #e6e9ef', borderRadius: 2 }}>
      <Box><Typography sx={{ fontWeight: 600, mb: 1 }}>Рейтинг секторов · ИИ-ранжирование</Typography>{bars}</Box>
      <Box><Typography sx={{ fontWeight: 600, mb: 1 }}>Оценка перспектив</Typography><KV w="50%" rows={[['Горизонты', a.horizons], ['Сетка секторов', a.grid], ['Перспективных секторов', `${T.persp.length} из ${T.all.length}`], ['Прогнозные ресурсы (D1)', `${fmt(a.res, 1)} млн т`]]} /></Box>
    </Box>
  );
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2, mb: 2, p: 2, bgcolor: '#fff', border: '1px solid #e6e9ef', borderRadius: 2, '& > *': { minWidth: 0 } }}>
      <AreaMap obj={obj} />
      <Box><Typography sx={{ fontWeight: 600, mb: 1 }}>Рейтинг секторов · ИИ-ранжирование</Typography>{bars}
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>Перспективными считаются сектора с рейтингом {PERSP} и выше: {T.persp.map((x) => x.id).join(', ') || 'нет'}.</Typography></Box>
    </Box>
  );
}
