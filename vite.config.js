import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — сборка открывается с любого пути GitHub Pages; маршрутизация — HashRouter.
// Тяжёлые библиотеки — в отдельных чанках: ядро React, MUI, таблицы (MUI X DataGrid), графики (Recharts + d3);
// сгенерированные данные BPMN — отдельным чанком (меняются редко, кэшируются отдельно от кода).
// Порядок важен: модуль попадает в первую подходящую группу.
const nm = (list) => new RegExp('node_modules/(' + list.join('|') + ')/');
const CHUNKS = [
  ['react', nm(['react', 'react-dom', 'scheduler', 'react-router', 'react-router-dom', 'cookie', 'set-cookie-parser'])],
  ['mui', nm(['@mui/material', '@mui/system', '@mui/utils', '@mui/styled-engine', '@mui/private-theming', '@mui/core-downloads-tracker', '@emotion/[^/]+', '@popperjs/core', 'react-transition-group', 'stylis', 'clsx', 'prop-types', 'react-is', 'hoist-non-react-statics', '@babel/runtime'])],
  ['datagrid', nm(['@mui/x-data-grid', '@mui/x-internals', '@mui/x-virtualizer', 'reselect', 'use-sync-external-store'])],
  ['bpmn', /\/src\/data\/bpmn\.js$/],
  ['charts', nm(['recharts', 'd3-[^/]+', 'victory-vendor', 'decimal\\.js-light', 'es-toolkit', 'eventemitter3', 'immer', '@reduxjs/toolkit', 'redux', 'redux-thunk', 'react-redux', 'tiny-invariant'])],
];
const slash = (id) => id.split('\\').join('/');

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist', chunkSizeWarningLimit: 700,
    rolldownOptions: { output: { codeSplitting: { groups: CHUNKS.map(([name, re], k) => ({ name, test: (id) => re.test(slash(id)), priority: CHUNKS.length - k })) } } },
  },
});
