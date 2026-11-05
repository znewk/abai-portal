// Меню: рабочий стол, модули ЦД Актива (скважина → пласт → наземная инфраструктура → единые данные), аналитика.
// У подрядной организации — отдельное меню: рабочий стол, задачи, объекты, о системе. Внутри модуля — вкладки.
import HomeRounded from '@mui/icons-material/HomeRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import AdjustRounded from '@mui/icons-material/AdjustRounded';
import BubbleChartRounded from '@mui/icons-material/BubbleChartRounded';
import OilBarrelRounded from '@mui/icons-material/OilBarrelRounded';
import StorageRounded from '@mui/icons-material/StorageRounded';
import AssessmentRounded from '@mui/icons-material/AssessmentRounded';
import AccountTreeRounded from '@mui/icons-material/AccountTreeRounded';
import InfoRounded from '@mui/icons-material/InfoRounded';
import ConstructionRounded from '@mui/icons-material/ConstructionRounded';
import { C } from '../theme.js';

export const NAV = [
  { id: 'desk', t: 'Рабочий стол', items: [['/', HomeRounded, 'Главная'], ['/tasks', TaskAltRounded, 'Мои задачи']] },
  { id: 'cd', t: 'ЦД Актива', items: [
    ['/m/skv', AdjustRounded, 'ЦД скважины', C.part.skv], ['/m/plast', BubbleChartRounded, 'ЦД пласта', C.part.plast],
    ['/m/dob', OilBarrelRounded, 'ЦД добычи', C.part.dob], ['/m/data', StorageRounded, 'Единые данные', C.part.data],
  ] },
  { id: 'an', t: 'Аналитика', items: [['/reports', AssessmentRounded, 'Сводка и отчёты'], ['/proc', AccountTreeRounded, 'Реестр процессов'], ['/about', InfoRounded, 'О системе']] },
];
// Меню подрядной организации
export const NAV_CONTR = [
  { id: 'desk', t: 'Рабочий стол', items: [['/', HomeRounded, 'Главная'], ['/tasks', TaskAltRounded, 'Мои задачи'], ['/objects', ConstructionRounded, 'Мои объекты']] },
  { id: 'an', t: 'Справка', items: [['/about', InfoRounded, 'О системе']] },
];
export const navFor = (role) => (role && role.limited ? NAV_CONTR : NAV);
export const NAV_FLAT = [...NAV, ...NAV_CONTR].flatMap((g) => g.items.map(([to, icon, t, c]) => ({ to, icon, t, c, g }))).filter((x, i, a) => a.findIndex((y) => y.to === x.to) === i);

// Вкладки модулей
export const MODULE_TABS = {
  skv: [['', 'Обзор'], ['proc', 'Процессы'], ['tasks', 'Задачи'], ['wells', 'Фонд скважин']],
  plast: [['', 'Обзор'], ['proc', 'Процессы'], ['tasks', 'Задачи'], ['map', 'Карта пласта']],
  dob: [['', 'Обзор'], ['proc', 'Процессы'], ['tasks', 'Задачи'], ['objects', 'Объекты']],
  data: [['', 'Единая база данных'], ['khd', 'Интеграции КХД'], ['tasks', 'Задачи']],
};

// Пути процесса и модуля
export const modPath = (part, sub = '') => `/m/${part}${sub ? '/' + sub : ''}`;
export const procPath = (part, code, sub = '') => `/m/${part}/p/${encodeURIComponent(code)}${sub ? '/' + sub : ''}`;
export const objPath = (part, id) => `/m/${part}/obj/${encodeURIComponent(id)}`;

// Подрядчик: рабочий стол, задачи, свои объекты; из модулей — только свои шаги (экземпляры), карточки объектов и рабочие места своих процессов
const CONTR_PROC = ['/m/skv/p/Б3', '/m/skv/p/Б4', '/m/skv/p/Б5', '/m/dob/p/Д6', '/m/plast/p/Г3.1', '/m/plast/p/Г3.2', '/m/plast/p/Г3.3'];
export const canSee = (role, path) => {
  if (!role || !role.limited) return true;
  const p = decodeURIComponent(path);
  if (['/', '/tasks', '/objects', '/about'].includes(p)) return true;
  if (!p.startsWith('/m/')) return false;
  if (/^\/m\/[^/]+\/(obj|wells)\//.test(p)) return true;
  if (/^\/m\/[^/]+\/p\/[^/]+\/run\//.test(p)) return true;
  return CONTR_PROC.some((x) => p === x || p.startsWith(x + '/'));
};
// Пункт меню для пути (самое длинное совпадение)
export const navOf = (path) => NAV_FLAT.filter((x) => path === x.to || (x.to !== '/' && path.startsWith(x.to + '/'))).sort((a, b) => b.to.length - a.to.length)[0] || NAV_FLAT[0];
