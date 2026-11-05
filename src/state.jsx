// Состояние приложения: роль, актив, экземпляры процессов (единый реестр + действия пользователя), задачи роли,
// уведомления (прочтение), оповещения (Snackbar) и подписание ЭЦП (диалог).
import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { ROLES, prodOf } from './data/core.js';
import { allRuns, tasksFor, doneTasksFor, applyStep, returnStep, newRun, serialize } from './data/exec.js';
import { KV, DemoCtx } from './components/ui.jsx';

const Ctx = createContext(null);
const KEY = 'abai-cd-react-v2';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };

export function AppProvider({ children }) {
  const init = load();
  const [roleId, setRoleId] = useState(init.role || null);
  const [asset, setAssetS] = useState(init.asset || 'omg');
  const [store, setStoreS] = useState(init.store || { ov: {}, created: {} });
  const [read, setReadS] = useState(init.read || {});
  const [demo, setDemoS] = useState(!!init.demo);
  const [snack, setSnack] = useState(null);
  const [sign, setSign] = useState(null);
  const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify({ role: roleId, asset, store, read, demo, ...o })); } catch (e) { /* без хранилища */ } };

  const role = ROLES.find((r) => r.id === roleId) || null;
  const login = (id) => { const r = ROLES.find((x) => x.id === id); const a = r.asset === 'all' ? 'all' : r.asset; setRoleId(id); setAssetS(a); save({ role: id, asset: a }); };
  const logout = () => { setRoleId(null); save({ role: null }); };
  const setAsset = (a) => { setAssetS(a); save({ asset: a }); };
  const setDemo = (v) => { setDemoS(v); save({ demo: v }); };

  // Единый реестр экземпляров (не зависит от роли) и задачи роли — активные шаги на её дорожках
  // После предзагрузки форм (результаты пройденных шагов берутся из форм) реестр пересчитывается
  const [ver, setVer] = useState(0);
  useEffect(() => { const f = () => setVer((v) => v + 1); window.addEventListener('abai-preloaded', f); return () => window.removeEventListener('abai-preloaded', f); }, []);
  const runs = useMemo(() => allRuns(store), [store, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const tasks = useMemo(() => (role ? tasksFor(role, runs) : []), [role, runs]);
  const doneTasks = useMemo(() => (role ? doneTasksFor(role, runs) : []), [role, runs]);
  const setStore = (n) => { setStoreS(n); save({ store: n }); };
  const commit = (run) => setStore({ ...store, ov: { ...store.ov, [run.id]: serialize(run) } });
  // Выполнить шаг: { dec, text, sys, payload } → следующие шаги по BPMN
  const complete = (run, i, opts) => { const n = applyStep(run, i, opts); commit(n); return n; };
  // Вернуть на доработку: шаг toI активируется у исполнителя с замечанием
  const sendBack = (run, fromI, toI, comment) => { const n = returnStep(run, fromI, toI, comment); commit(n); return n; };
  const createRun = (P, objRef) => { const n = newRun(P, objRef, runs); setStore({ ov: { ...store.ov, [n.id]: serialize(n) }, created: { ...store.created, [n.id]: { id: n.id, p: n.p, obj: objRef, started: n.started.toISOString() } } }); return n; };
  const resetRun = (id) => { const ov = { ...store.ov }; delete ov[id]; const created = { ...store.created }; delete created[id]; setStore({ ov, created }); };
  const resetAll = () => setStore({ ov: {}, created: {} });
  const markRead = (k) => { const n = { ...read, [k]: true }; setReadS(n); save({ read: n }); };

  const toast = (msg, sev = 'success') => setSnack({ msg, sev, k: Date.now() });
  // Подписание ЭЦП (демонстрация): sign('Подписание …', () => …)
  const askSign = (what, onOk) => setSign({ what, onOk });

  const value = { role, login, logout, asset, setAsset, prod: prodOf(asset), runs, tasks, doneTasks, complete, sendBack, createRun, resetRun, resetAll, read, markRead, toast, sign: askSign, demo, setDemo };
  return (
    <Ctx.Provider value={value}>
      <DemoCtx.Provider value={demo}>{children}</DemoCtx.Provider>
      <Snackbar open={!!snack} key={snack && snack.k} autoHideDuration={4200} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        {snack ? <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(null)} sx={{ minWidth: 320, maxWidth: 560 }}>{snack.msg}</Alert> : <span />}
      </Snackbar>
      <Dialog open={!!sign} onClose={() => setSign(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Подписание ЭЦП</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{sign && sign.what}</Typography>
          <KV rows={[['Ключ', 'RSA · AUTH_RSA256 · ' + (role ? role.org : '')], ['Владелец', role ? role.name : ''], ['Удостоверяющий центр', 'НУЦ РК'], ['Срок действия', 'до 14.08.2027']]} />
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f5f8fc', borderLeft: '3px solid', borderColor: 'primary.main', borderRadius: 1, fontSize: 13, color: 'text.secondary' }}>
            Документ будет подписан и зарегистрирован в ABAI БД 2.0; процесс перейдёт к следующему участнику автоматически.
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSign(null)}>Отмена</Button>
          <Button variant="contained" onClick={() => { const f = sign.onOk; setSign(null); if (f) f(); }}>Подписать</Button>
        </DialogActions>
      </Dialog>
    </Ctx.Provider>
  );
}
export const useApp = () => useContext(Ctx);
