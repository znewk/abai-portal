// Маршруты портала: рабочий стол → модули ЦД (обзор, процессы, задачи, объекты) → процесс (рабочее место, ход исполнения, регламент) → запись процесса.
import { useEffect, Suspense } from 'react';
import { lazyP, preloadAll } from './lib/lazyp.jsx';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { LinearProgress } from '@mui/material';
import { useApp } from './state.jsx';
import Shell from './layout/Shell.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Tasks from './pages/Tasks.jsx';
import ModuleLayout from './pages/module/ModuleLayout.jsx';
import ModuleOverview from './pages/module/ModuleOverview.jsx';
import ModuleProcesses from './pages/module/ModuleProcesses.jsx';
import ModuleTasks from './pages/module/ModuleTasks.jsx';
import ProcessLayout from './pages/process/ProcessLayout.jsx';
import ProcessWorkspace from './pages/process/ProcessWorkspace.jsx';
import ProcessRuns from './pages/process/ProcessRuns.jsx';
import { partOfProc } from './data/core.js';
import { procPath } from './layout/nav.js';

// Запись процесса и карточка объекта тянут формы всех процессов — отдельным чанком с предзагрузкой
const RunPage = lazyP(() => import('./pages/process/RunPage.jsx'));
const ObjectCard = lazyP(() => import('./pages/ObjectCard.jsx'));
const Processes = lazyP(() => import('./pages/Processes.jsx'));
const ProcessPage = lazyP(() => import('./pages/ProcessPage.jsx'));
const Fund = lazyP(() => import('./pages/skv/Fund.jsx'));
const WellCard = lazyP(() => import('./pages/skv/WellCard.jsx'));
const PlastOverview = lazyP(() => import('./pages/plast/Overview.jsx'));
const Db = lazyP(() => import('./pages/data/Db.jsx'));
const Khd = lazyP(() => import('./pages/data/Khd.jsx'));
const Reports = lazyP(() => import('./pages/Reports.jsx'));
const About = lazyP(() => import('./pages/About.jsx'));
const DobObjects = lazyP(() => import('./pages/dob/Objects.jsx'));
const MyObjects = lazyP(() => import('./pages/MyObjects.jsx'));

function ScrollTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }
const S = (el) => <Suspense fallback={<LinearProgress />}>{el}</Suspense>;
// Главная вкладка модуля: у «Единых данных» — единая база, у остальных — обзор
function ModuleIndex() { const { part } = useParams(); return part === 'data' ? S(<Db />) : <ModuleOverview />; }
// Прежние адреса разделов → процессы и объекты модулей
const OLD = {
  skv: '/m/skv/wells', 'skv/drill': procPath('skv', 'Б3'), 'skv/osv': procPath('skv', 'Б4'), 'skv/tkrs': procPath('skv', 'Б5'),
  plast: '/m/plast/map', 'plast/crns': procPath('plast', 'Р1'), 'plast/uz': procPath('plast', 'Р4'), 'plast/gtm': procPath('plast', 'Р2'), 'dob/profile': procPath('plast', 'Р3'),
  dob: procPath('dob', 'Д1'), 'dob/pot': procPath('dob', 'Д3'), 'dob/tr': procPath('dob', 'Д2'), 'dob/gno': procPath('dob', 'Д6'), 'dob/infra': procPath('dob', 'Д4'),
  'dob/pipe': procPath('dob', 'Д8'), 'dob/energy': procPath('dob', 'Д7'), data: '/m/data', 'data/khd': '/m/data/khd',
};
const OldWell = () => { const { id } = useParams(); return <Navigate to={'/m/skv/wells/' + encodeURIComponent(id)} replace />; };
const OldProc = () => { const { code } = useParams(); const part = partOfProc(code); return <Navigate to={part ? procPath(part, code) : '/proc'} replace />; };

export default function App() {
  const { role } = useApp();
  useEffect(() => { if (role) preloadAll(); }, [!!role]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!role) return <Login />;
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/:id" element={<Tasks />} />
          <Route path="objects" element={S(<MyObjects />)} />
          <Route path="proc" element={S(<Processes />)} />
          <Route path="proc/:code" element={<OldProc />} />
          <Route path="reports" element={S(<Reports />)} />
          <Route path="about" element={S(<About />)} />
          <Route path="m/:part" element={<ModuleLayout />}>
            <Route index element={<ModuleIndex />} />
            <Route path="proc" element={<ModuleProcesses />} />
            <Route path="tasks" element={<ModuleTasks />} />
            <Route path="wells" element={S(<Fund />)} />
            <Route path="wells/:id" element={S(<WellCard />)} />
            <Route path="map" element={S(<PlastOverview />)} />
            <Route path="khd" element={S(<Khd />)} />
            <Route path="objects" element={S(<DobObjects />)} />
            <Route path="obj/:id" element={S(<ObjectCard />)} />
            <Route path="p/:code" element={<ProcessLayout />}>
              <Route index element={<ProcessWorkspace />} />
              <Route path="runs" element={<ProcessRuns />} />
              <Route path="run/:id" element={S(<RunPage />)} />
              <Route path="model" element={S(<ProcessPage />)} />
            </Route>
          </Route>
          <Route path="skv/well/:id" element={<OldWell />} />
          {Object.entries(OLD).map(([from, to]) => <Route key={from} path={from} element={<Navigate to={to} replace />} />)}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
