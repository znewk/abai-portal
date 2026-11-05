// Ленивая загрузка с предзагрузкой: экран подгружается по требованию, а после входа — заранее, в простое браузера.
// Загруженный модуль рисуется напрямую, без Suspense, — при переходе нет заглушки и «мигания».
import { lazy } from 'react';

const ALL = [];
export function lazyP(factory) {
  let mod = null; let p = null;
  const load = () => (p = p || factory().then((m) => { mod = m; return m; }));
  const Lazy = lazy(load);
  const C = (props) => (mod ? <mod.default {...props} /> : <Lazy {...props} />);
  C.preload = load; ALL.push(C);
  return C;
}
// Предзагрузка всех ленивых экранов по одному, когда браузер свободен
export function preloadAll() {
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  let k = 0; const next = () => { if (k >= ALL.length) { window.dispatchEvent(new Event('abai-preloaded')); return; } ALL[k++].preload().catch(() => {}).finally(() => idle(next)); };
  idle(next);
}
