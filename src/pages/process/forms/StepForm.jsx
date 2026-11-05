// Форма шага: отрисовка спецификации (что сделать, данные, поля, проверки, документы, решение), выполнение, возврат на доработку.
import { useState, useEffect } from 'react';
import { Box, Stack, Typography, Button, TextField, MenuItem, Radio, RadioGroup, FormControlLabel, Checkbox, Alert, Select, Divider, Collapse } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import DrawRounded from '@mui/icons-material/DrawRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ReplyRounded from '@mui/icons-material/ReplyRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import { useApp } from '../../../state.jsx';
import { KV, StatusChip, Code, Demo } from '../../../components/ui.jsx';
import DataTable from '../../../components/DataTable.jsx';
import { formFor } from './specs.jsx';
import { returnTargets, inputsOf, stepKind } from '../../../data/exec.js';
import { dFmt, tFmt } from '../../../lib/format.js';

const Head = ({ children }) => <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2.25, mb: 0.75 }}>{children}</Typography>;

export default function StepForm({ run, i, onDone, onReturn }) {
  const { sign, demo, toast } = useApp();
  const P = run.P; const s = P.s[i]; const spec = formFor(run, i); const inp = inputsOf(run, i);
  const [vals, setVals] = useState({}); const [checks, setChecks] = useState({}); const [formed, setFormed] = useState({}); const [opt, setOpt] = useState(0); const [comment, setComment] = useState(''); const [back, setBack] = useState(false); const [backTo, setBackTo] = useState(null); const [backNote, setBackNote] = useState('');
  useEffect(() => { setVals({}); setChecks({}); setFormed({}); setOpt(0); setComment(''); setBack(false); setBackNote(''); }, [run.id, i]);
  const rt = returnTargets(run, i);
  useEffect(() => { setBackTo(rt.def); }, [run.id, i]); // eslint-disable-line react-hooks/exhaustive-deps

  const decision = spec.decision; const cur = decision ? decision.options[opt] : null;
  const needComment = cur && cur.comment && !comment.trim();
  const docsReady = (spec.docs || []).every((d) => d.status !== 'draft' || formed[d.name]);
  const checksReady = (spec.checks || []).filter((c) => !c.ok).every((c) => checks[c.label] || c.note);
  const canSubmit = !needComment && docsReady && checksReady;
  const payload = { ...vals, comment: comment.trim() || undefined };
  const submit = () => {
    const doSign = cur ? cur.sign : spec.action && spec.action.sign;
    const text = cur ? (cur.dec ? `${cur.label.replace(/ · подписать ЭЦП$/, '')}` : cur.label.replace(/ · подписать ЭЦП$/, '')) : spec.action.text;
    const go = () => onDone({ dec: cur ? cur.dec : null, text: text + (comment.trim() ? ` — ${comment.trim()}` : ''), sys: spec.sys, payload });
    if (doSign) sign(`${s.t}${(spec.docs || []).length ? '. Документы: ' + spec.docs.map((d) => d.name).join('; ') : ''}.`, go); else go();
  };
  const field = (fl) => (fl.type === 'select'
    ? <TextField key={fl.k} select size="small" label={fl.label} value={vals[fl.k] ?? fl.value} onChange={(e) => setVals({ ...vals, [fl.k]: e.target.value })}>{fl.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField>
    : <TextField key={fl.k} size="small" label={fl.label} value={vals[fl.k] ?? fl.value} onChange={(e) => setVals({ ...vals, [fl.k]: e.target.value })} multiline={fl.type === 'textarea'} minRows={fl.type === 'textarea' ? 2 : undefined} />);

  return (
    <Box>
      <Typography sx={{ fontSize: 14, lineHeight: 1.5 }}>{spec.intro}</Typography>
      {(demo ? spec.hintRaw : spec.hint) && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>{spec.sys ? spec.sys + ': ' : ''}{(demo ? spec.hintRaw : spec.hint).replace(/\.$/, '')}.</Typography>}

      {inp.prev.length > 0 && <>
        <Head>Результаты предыдущих шагов</Head>
        <Stack spacing={0.5}>{inp.prev.slice(-4).map((p) => (
          <Stack key={p.i} direction="row" spacing={1} alignItems="baseline" sx={{ fontSize: 13 }}>
            <CheckCircleRounded sx={{ fontSize: 15, color: 'success.main', alignSelf: 'center' }} />
            <Box sx={{ flex: 1 }}><b>{p.s.r}</b> · {p.s.t}<Typography component="span" sx={{ fontSize: 12.5, color: 'text.secondary' }}> — {p.text}{p.payload && p.payload.comment ? ` («${p.payload.comment}»)` : ''} · {dFmt(p.at)} {tFmt(p.at)}</Typography><Demo> {p.s.c}</Demo></Box>
          </Stack>))}</Stack>
      </>}

      {spec.facts && spec.facts.length > 0 && <><Head>Данные объекта</Head><KV w="42%" rows={spec.facts} /></>}
      {spec.widget}
      {spec.table && <Box sx={{ mt: 2 }}><DataTable rows={spec.table.rows} columns={spec.table.cols} pageSize={0} /></Box>}

      {spec.fields && spec.fields.length > 0 && <>
        <Head>{stepKind(s) === 'data' ? 'Данные для внесения' : 'Параметры'}</Head>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1.5 }}>{spec.fields.map(field)}</Box>
        {stepKind(s) === 'data' && <Button size="small" variant="outlined" startIcon={<UploadFileRounded />} sx={{ mt: 1.5 }} onClick={() => toast('Файл принят и проверен структурно (XLSX, LAS, PDF)', 'info')}>Загрузить файл</Button>}
      </>}

      {spec.checks && spec.checks.length > 0 && <>
        <Head>Проверки</Head>
        <Stack spacing={0.6}>{spec.checks.map((c) => (
          <Stack key={c.label} direction="row" spacing={1} alignItems="flex-start" sx={{ fontSize: 13 }}>
            {c.ok ? <CheckCircleRounded sx={{ fontSize: 17, color: 'success.main' }} /> : c.note ? <ErrorOutlineRounded sx={{ fontSize: 17, color: 'warning.main' }} /> : <Checkbox size="small" sx={{ p: 0, mt: '1px' }} checked={!!checks[c.label]} onChange={(e) => setChecks({ ...checks, [c.label]: e.target.checked })} />}
            <Box><span>{c.label}</span>{c.note && <Typography sx={{ fontSize: 12, color: 'warning.dark' }}>{c.note}</Typography>}</Box>
          </Stack>))}</Stack>
      </>}

      {spec.docs && spec.docs.length > 0 && <>
        <Head>Документы</Head>
        {spec.docs.map((d) => (
          <Stack key={d.name} direction="row" spacing={1} alignItems="center" sx={{ py: 0.6, borderBottom: '1px solid #f0f2f5' }}>
            <DescriptionOutlined sx={{ fontSize: 18, color: 'text.secondary' }} /><Typography sx={{ fontSize: 13.5, flex: 1 }}>{d.name}</Typography>
            {d.status === 'draft' && !formed[d.name] ? <Button size="small" variant="outlined" onClick={() => { setFormed({ ...formed, [d.name]: true }); toast(`Документ «${d.name}» сформирован в ${spec.sys || 'ABAI БД 2.0'}`, 'info'); }}>Сформировать{spec.sys ? ` в ${spec.sys}` : ''}</Button>
              : <><StatusChip tone="good" label={d.status === 'signed' ? 'Подписан ЭЦП' : 'Сформирован'} /><Button size="small" onClick={() => toast(`Открыт документ «${d.name}» (ABAI БД 2.0)`, 'info')}>Открыть</Button></>}
          </Stack>))}
      </>}

      <Divider sx={{ my: 2.5 }} />
      {decision && <>
        {decision.q && <Typography sx={{ fontSize: 13.5, fontWeight: 600, mb: 0.5 }}>{decision.q}</Typography>}
        <RadioGroup value={opt} onChange={(e) => setOpt(+e.target.value)}>
          {decision.options.map((o, k) => <FormControlLabel key={k} value={k} control={<Radio size="small" />} label={<span style={{ fontSize: 13.5 }}>{o.label}{o.dec && demo ? <Code> {o.dec}</Code> : null}</span>} />)}
        </RadioGroup>
      </>}
      <TextField fullWidth multiline minRows={2} size="small" sx={{ mt: 1 }} placeholder={needComment ? 'Комментарий обязателен для этого решения' : 'Комментарий — сохраняется в журнале шага'} value={comment} onChange={(e) => setComment(e.target.value)} error={!!needComment} />

      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <Button variant="contained" disabled={!canSubmit} startIcon={(cur ? cur.sign : spec.action && spec.action.sign) ? <DrawRounded /> : <CheckRounded />} onClick={submit}>{cur ? cur.label : spec.action.label}</Button>
        {rt.list.length > 0 && <Button color="inherit" startIcon={<ReplyRounded />} onClick={() => setBack(!back)}>Вернуть на доработку</Button>}
        {demo && <Button color="inherit" onClick={() => toast('Делегирование: задача передана другому сотруднику подразделения (демонстрация)', 'info')}>Делегировать</Button>}
      </Stack>
      {!docsReady && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>Сформируйте документы шага, чтобы продолжить.</Typography>}
      {!checksReady && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>Отметьте выполнение проверок, чтобы продолжить.</Typography>}

      <Collapse in={back}>
        <Alert severity="warning" icon={false} sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Вернуть на доработку исполнителю предыдущего шага</Typography>
          <Select size="small" fullWidth value={backTo ?? ''} onChange={(e) => setBackTo(e.target.value)} sx={{ bgcolor: '#fff', fontSize: 13, mb: 1 }}>
            {rt.list.map((x) => <MenuItem key={x.i} value={x.i} sx={{ fontSize: 13 }}>{x.s.r} · {x.s.t} ({dFmt(x.at)})</MenuItem>)}
          </Select>
          <TextField fullWidth multiline minRows={2} size="small" placeholder="Замечание (обязательно) — исполнитель увидит его в задаче" value={backNote} onChange={(e) => setBackNote(e.target.value)} sx={{ bgcolor: '#fff' }} />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button variant="contained" color="warning" disabled={!backNote.trim() || backTo == null} onClick={() => onReturn(backTo, backNote.trim())}>Вернуть</Button>
            <Button color="inherit" onClick={() => setBack(false)}>Отмена</Button>
          </Stack>
        </Alert>
      </Collapse>
    </Box>
  );
}
