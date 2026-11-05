// Корпоративная тема MUI: синий КМГ, тёмно-синяя навигация, нейтральные поверхности.
import { createTheme, alpha } from '@mui/material/styles';
import { ruRU as coreRu } from '@mui/material/locale';
import { ruRU as gridRu } from '@mui/x-data-grid/locales';

export const C = {
  navy: '#0c2340', navy2: '#13305a', brand: '#1c5cab', gold: '#c9a227',
  // категориальные ряды графиков (фиксированный порядок)
  s: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  // части ЦД
  part: { skv: '#9c4221', plast: '#0e7490', dob: '#0f7a55', data: '#5b4aa8', desk: '#1c5cab', an: '#5b6b2f' },
  // статусы
  good: '#0ca30c', warn: '#e8a317', serious: '#ec835a', crit: '#d03b3b',
  grid: '#e8ebf0', axis: '#9aa3b2', ink2: '#4d5563', muted: '#7a8291',
};

const theme = createTheme({
  palette: {
    primary: { main: C.brand, dark: '#154a8c' },
    secondary: { main: C.gold },
    success: { main: '#0f7a55' }, warning: { main: '#c47f00' }, error: { main: '#c62f2f' }, info: { main: C.brand },
    background: { default: '#f3f5f8', paper: '#ffffff' },
    text: { primary: '#16191f', secondary: C.ink2 },
    divider: '#e3e7ee',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Segoe UI", "Inter", system-ui, -apple-system, Roboto, Arial, sans-serif',
    fontSize: 13.5,
    h4: { fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontSize: 18, fontWeight: 600 },
    h6: { fontSize: 15, fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
    overline: { fontWeight: 600, letterSpacing: '0.06em', lineHeight: 1.6 },
  },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { WebkitFontSmoothing: 'antialiased' } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { outlined: { borderColor: '#e3e7ee' } } },
    MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { boxShadow: '0 1px 2px rgba(16,24,40,.04)' } } },
    MuiCardHeader: { styleOverrides: { root: { padding: '14px 16px 4px' }, title: { fontSize: 15, fontWeight: 600 }, subheader: { fontSize: 12.5 }, action: { margin: 0, alignSelf: 'center' } } },
    MuiCardContent: { styleOverrides: { root: { padding: '10px 16px 16px', '&:last-child': { paddingBottom: 16 } } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 7 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 6 }, sizeSmall: { height: 22, fontSize: 11.5 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', minHeight: 44, fontSize: 13.5 } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 44 } } },
    MuiTooltip: { styleOverrides: { tooltip: { fontSize: 12, backgroundColor: '#16191f' } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: C.ink2, fontSize: 12, backgroundColor: '#f8f9fb' } } },
    MuiDataGrid: {
      defaultProps: { density: 'compact', disableRowSelectionOnClick: true, rowHeight: 44, columnHeaderHeight: 40 },
      styleOverrides: {
        root: { border: 0, fontSize: 13, '--DataGrid-containerBackground': '#f8f9fb', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, color: C.ink2, fontSize: 12 } },
        row: { '&.clickable': { cursor: 'pointer' } },
        cell: { '&:focus, &:focus-within': { outline: 'none' } },
        columnHeader: { '&:focus, &:focus-within': { outline: 'none' } },
      },
    },
    MuiListItemButton: { styleOverrides: { root: { borderRadius: 7 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 8 } } },
  },
}, coreRu, gridRu);

export default theme;
export { alpha };
