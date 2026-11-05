// Общие помощники спецификаций форм шагов: поля, проверки, документы, шаблонные решения.
import { dFmt, TODAY } from '../../../lib/format.js';

export const f = (k, label, value, extra = {}) => ({ k, label, value, ...extra });
export const sel = (k, label, value, options) => ({ k, label, value, type: 'select', options });
export const chk = (label, ok = true, note = '') => ({ label, ok, note });
export const doc = (name, status = 'draft') => ({ name, status });
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const dateNow = () => dFmt(TODAY);
// Таблица формы: cols — [поле, заголовок, ширина | 'flex', тип], rows — массив объектов (id подставляется)
export const tbl = (cols, rows) => ({
  cols: cols.map(([field, headerName, w, type]) => ({ field, headerName, ...(w === 'flex' || !w ? { flex: 1, minWidth: 160 } : { width: w }), ...(type === 'number' ? { type: 'number', align: 'right', headerAlign: 'right' } : {}) })),
  rows: rows.map((r, k) => ({ id: k + 1, ...r })),
});
// Документы шага из BPMN (s.d) со статусом; имя без расширения файла в скобках
export const stepDocs = (s, status = 'draft') => s.d.map((d) => doc(d.replace(/\s*\((?:[^()]*\.[a-zA-Z-]+[^()]*|SEG-[DY])\)\s*$/, '').trim(), status));

// Шаблонные решения
export const APPROVE = (docs, extra = {}) => ({ options: [{ label: docs ? 'Согласовать и подписать ЭЦП' : 'Согласовать', dec: null, sign: !!docs, tone: 'good' }, { label: 'Согласовать с замечаниями', dec: null, comment: true }], ...extra });
export const EXPERT = (sign = true) => ({ options: [{ label: 'Заключение положительное' + (sign ? ' · подписать ЭЦП' : ''), dec: null, sign, tone: 'good' }, { label: 'Заключение с замечаниями', dec: null, comment: true }] });
// Развилка «есть замечания?»: dec — подписи ветвей BPMN (yes — ветвь с замечаниями, no — без)
export const REMARKS = ({ q = 'Есть замечания?', yes = 'да', no = 'нет', okLabel = 'Замечаний нет — согласовать', backLabel = 'Есть замечания — вернуть на доработку', sign = false } = {}) => ({ q, options: [{ label: okLabel + (sign ? ' · подписать ЭЦП' : ''), dec: no, sign, tone: 'good' }, { label: backLabel, dec: yes, comment: true }] });
