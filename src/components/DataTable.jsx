// Таблица на MUI DataGrid: сортировка, фильтр колонок, пагинация, поиск в панели, клик по строке.
import { DataGrid } from '@mui/x-data-grid';
import { Box } from '@mui/material';

// rows: массив с полем id; columns: колонки DataGrid; onRowClick(row); pageSize — строк на странице (0 — без пагинации)
export default function DataTable({ rows, columns, onRowClick, pageSize = 10, search = false, height, getRowClassName, sx, initialSort, localeText, ...rest }) {
  const paged = pageSize && rows.length > pageSize;
  return (
    <Box sx={{ width: '100%', ...(height ? { height } : {}), ...sx }}>
      <DataGrid
        rows={rows}
        columns={columns.map((c) => ({ flex: c.width ? undefined : 1, minWidth: 90, ...c }))}
        autoHeight={!height}
        onRowClick={onRowClick ? (p) => onRowClick(p.row) : undefined}
        getRowClassName={(p) => [onRowClick ? 'clickable' : '', getRowClassName ? getRowClassName(p) : ''].join(' ')}
        hideFooter={!paged}
        pageSizeOptions={paged ? [pageSize, 25, 50] : undefined}
        initialState={{ pagination: { paginationModel: { pageSize: paged ? pageSize : 100 } }, ...(initialSort ? { sorting: { sortModel: initialSort } } : {}) }}
        showToolbar={search || undefined}
        slotProps={search ? { toolbar: { printOptions: { disableToolbarButton: true }, csvOptions: { disableToolbarButton: true }, quickFilterProps: { debounceMs: 200 } } } : undefined}
        getRowHeight={() => 'auto'}
        disableVirtualization={rows.length <= 300}
        disableColumnSelector
        disableDensitySelector
        localeText={{ paginationDisplayedRows: ({ from, to, count }) => `${from}–${to} из ${count}`, toolbarQuickFilterPlaceholder: 'Поиск…', paginationRowsPerPage: 'Строк на странице:', ...localeText }}
        sx={{ '& .MuiDataGrid-cell': { py: 0.9, display: 'flex', alignItems: 'center', lineHeight: 1.35, whiteSpace: 'normal', wordBreak: 'break-word' }, '& .MuiDataGrid-columnHeaderTitle': { whiteSpace: 'normal', lineHeight: 1.2 }, '& .MuiDataGrid-row.sel': { bgcolor: '#e8f0fb' } }}
        {...rest}
      />
    </Box>
  );
}
