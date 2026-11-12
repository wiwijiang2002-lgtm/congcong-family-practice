import { gradeAnswer } from '@cstf/core/grade';
import { BANK, TEMPLATES, type FamilyQuestion } from './data';
import { focusFor } from './weekly-questions';

export const STORAGE_KEY = 'congcong-family-demo:v1';
export interface WeeklyPlanInfo { stage: 'practice' | 'check'; from: string; to: string; readyAt: string; topics: { key: string; label: string; subject: '语文' | '数学'; sourceId: number; lastWrongAt: string; practiceId?: string }[] }
export interface Plan { id: string; title: string; date: string; minutes: number; questions: FamilyQuestion[]; createdAt: string; kind: 'daily' | 'review'; weekly?: WeeklyPlanInfo }
export interface Response { question: FamilyQuestion; answer: string; correct: boolean | null }
export interface Attempt { id: string; planId: string; title: string; date: string; startedAt: string; completedAt: string; responses: Response[]; score: number; total: number; weekly?: WeeklyPlanInfo }
export interface Session { id: string; planId: string; startedAt: string; index: number; answer: string; responses: Response[] }
export interface State { version: 1; plans: Plan[]; attempts: Attempt[]; session: Session | null }
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date;
}
export function createPlan(title: string, date: string, minutes: number, questions: FamilyQuestion[], kind: Plan['kind'] = 'daily'): Plan {
  if (!title.trim() || title.trim().length > 40 || !validDate(date) || !questions.length || questions.length > 12 || !Number.isInteger(minutes) || minutes < 1 || minutes > 60) throw new Error('请填写练习名称、日期，并选择 1–12 道题。');
  if (!questions.some(q => q.score > 0)) throw new Error('请至少选择一道默写、填空或数学判分题；仿写单独记录不计分。');
  return { id: uid(), title: title.trim(), date, minutes, questions: structuredClone(questions), createdAt: new Date().toISOString(), kind };
}
export function initialState(): State {
  const t = TEMPLATES[0];
  return { version: 1, plans: [createPlan(t.name, localDate(), t.minutes, t.ids.map(id => BANK.find(q => q.id === id)!))], attempts: [], session: null };
}
// Never parseFloat an incomplete numeric string. Fractions need actual arithmetic.
function numeric(s: string): number | null {
  const text = s.normalize('NFKC').trim();
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d+)?|\.\d+))?%?$/.test(text)) return null;
  const percent = text.endsWith('%');
  const [a, b] = text.replace(/%$/, '').split('/').map(Number);
  const value = b === undefined ? a : b === 0 ? NaN : a / b;
  return Number.isFinite(value) ? value / (percent ? 100 : 1) : null;
}
export function grade(q: FamilyQuestion, answer: string): boolean {
  if (['fill_blank', 'calculation', 'word_problem'].includes(q.type)) {
    const actual = numeric(answer), expected = numeric(q.answer);
    return actual !== null && expected !== null && Math.abs(actual - expected) < 1e-8;
  }
  return gradeAnswer(q, answer.normalize('NFKC'));
}
export function begin(state: State, planId: string, now = new Date()): State {
  if (!state.plans.some(p => p.id === planId)) throw new Error('找不到这份练习。');
  if (state.attempts.some(a => a.planId === planId)) throw new Error('这份练习已经完成，可以到结果中回顾。');
  const plan = state.plans.find(p=>p.id===planId)!;
  if (plan.weekly && Date.parse(plan.weekly.readyAt) > now.getTime()) throw new Error('这份独立复测还未开放。请与同类练习间隔至少 24 小时，再来检验记忆和理解。');
  if (plan.weekly?.stage==='check') for (const ref of plan.weekly.topics) {
    const proof=state.attempts.find(a=>a.id===ref.practiceId);
    const rows=proof?.responses.filter(r=>r.question.weekly?.key===ref.key)??[];
    const newerWrong=proof&&state.attempts.some(a=>a.completedAt>=proof.completedAt&&a.responses.some(r=>r.correct===false&&focusFor(r.question).key===ref.key));
    if(!proof||rows.length<2||rows.some(r=>r.correct!==true)||newerWrong||now.getTime()-Date.parse(proof.completedAt)<24*60*60*1000) throw new Error('这个知识点需要先重新完成同类巩固，再间隔 24 小时复测。');
  }
  if (state.session) {
    if (state.session.planId === planId) return state;
    throw new Error('请先完成进行中的练习。');
  }
  return { ...state, session: { id: uid(), planId, startedAt: now.toISOString(), index: 0, answer: '', responses: [] } };
}
export function check(state: State): State {
  const s = state.session;
  if (!s) return state;
  if (s.responses[s.index]) return state; // Idempotent double tap.
  if (!s.answer.trim()) throw new Error('先写下或选出你的答案吧。');
  const q = state.plans.find(p => p.id === s.planId)!.questions[s.index];
  return { ...state, session: { ...s, responses: [...s.responses, { question: structuredClone(q), answer: s.answer, correct: q.mode === 'writing' ? null : grade(q, s.answer) }] } };
}
export function advance(state: State): State {
  const s = state.session;
  if (!s || !s.responses[s.index]) return state;
  const plan = state.plans.find(p => p.id === s.planId)!;
  if (s.index < plan.questions.length - 1) return { ...state, session: { ...s, index: s.index + 1, answer: '' } };
  if (state.attempts.some(a => a.id === s.id || a.planId === s.planId)) return { ...state, session: null };
  const attempt: Attempt = {
    id: s.id, planId: plan.id, title: plan.title, date: plan.date,
    startedAt: s.startedAt, completedAt: new Date().toISOString(), responses: s.responses,
    score: s.responses.reduce((n, r) => n + (r.correct ? r.question.score : 0), 0),
    total: plan.questions.reduce((n, q) => n + q.score, 0),
    ...(plan.weekly ? { weekly: structuredClone(plan.weekly) } : {}),
  };
  return { ...state, session: null, attempts: [...state.attempts, attempt] };
}
export function mistakes(state: State): Response[] {
  const latest = new Map<number, Response>();
  for (const a of [...state.attempts].sort((a,b) => a.completedAt.localeCompare(b.completedAt))) for (const r of a.responses) if(!r.question.weekly) latest.set(r.question.id, r);
  return [...latest.values()].filter(r => r.correct === false);
}
function validQuestion(q: unknown): q is FamilyQuestion {
  if (!q || typeof q !== 'object') return false;
  const x = q as FamilyQuestion;
  if(x.weekly&&(!['practice','check'].includes(x.weekly.stage)||typeof x.weekly.key!=='string'||typeof x.weekly.label!=='string'||!Number.isInteger(x.weekly.sourceId)||typeof x.weekly.signature!=='string'))return false;
  if(x.weekly){const original=BANK.find(q=>q.id===x.weekly!.sourceId);if(!original||focusFor(original).key!==x.weekly.key)return false;}
  return Number.isInteger(x.id) && ['语文','数学'].includes(x.subject) && ['choice','fill_blank','fill_blank_text'].includes(x.type) && typeof x.question === 'string' && typeof x.answer === 'string' && typeof x.explanation === 'string' && typeof x.knowledge_point === 'string' && (x.mode === 'writing' ? x.score === 0 : x.score === 10) && Array.isArray(x.options) && x.options.every(o => typeof o === 'string') && (x.type !== 'choice' || x.options.length === 4);
}
function validWeekly(plan:Plan):boolean {
  const w=plan.weekly;
  if(!w)return !plan.questions.some(q=>q.weekly);
  if(!['practice','check'].includes(w.stage)||!validDate(w.from)||!validDate(w.to)||!Number.isFinite(Date.parse(w.readyAt))||!Array.isArray(w.topics)||w.topics.length<1||w.topics.length>3)return false;
  const keys=new Set<string>();
  for(const t of w.topics){
    if(!t||typeof t.key!=='string'||keys.has(t.key)||typeof t.label!=='string'||!['语文','数学'].includes(t.subject)||!Number.isInteger(t.sourceId)||!Number.isFinite(Date.parse(t.lastWrongAt))||(w.stage==='check'&&typeof t.practiceId!=='string'))return false;
    keys.add(t.key);
    const rows=plan.questions.filter(q=>q.weekly?.key===t.key);
    if(rows.length!==2||rows.some(q=>q.weekly?.stage!==w.stage||q.weekly.sourceId!==t.sourceId))return false;
  }
  return plan.questions.length===w.topics.length*2&&plan.questions.every(q=>q.weekly&&keys.has(q.weekly.key));
}
// Local records can be corrupt or from an old version; fail visibly, never overwrite.
export function decode(raw: string): State {
  const x = JSON.parse(raw) as State;
  if (x.version !== 1 || !Array.isArray(x.plans) || !Array.isArray(x.attempts)) throw new Error('数据格式不兼容');
  const ids = new Set<string>();
  for (const p of x.plans) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id) || typeof p.title !== 'string' || typeof p.date !== 'string' || !validDate(p.date) || !Array.isArray(p.questions) || !p.questions.length || p.questions.length > 12 || !p.questions.every(validQuestion) || !p.questions.some(q=>q.score>0) || !Number.isInteger(p.minutes) || p.minutes < 1 || p.minutes > 60 || !['daily', 'review'].includes(p.kind)) throw new Error('练习数据不完整');
    ids.add(p.id);
    if(!validWeekly(p))throw new Error('一周巩固题目或安排数据不完整');
  }
  const finished = new Set<string>();
  for (const a of x.attempts) {
    const p = x.plans.find(p => p.id === a?.planId);
    if (!p || finished.has(a.planId) || typeof a.id !== 'string' || !Number.isFinite(Date.parse(a.startedAt)) || !Number.isFinite(Date.parse(a.completedAt)) || !Array.isArray(a.responses) || a.responses.length !== p.questions.length || !a.responses.every((r, i) => validQuestion(r?.question) && r.question.id === p.questions[i].id && typeof r.answer === 'string' && r.correct === (r.question.mode === 'writing' ? null : grade(r.question, r.answer))) || a.score !== a.responses.reduce((n,r) => n + (r.correct ? r.question.score : 0),0) || a.total !== p.questions.reduce((n,q) => n+q.score,0)) throw new Error('结果数据不完整');
    finished.add(a.planId);
    if(a.weekly&&JSON.stringify(a.weekly)!==JSON.stringify(p.weekly))throw new Error('一周巩固结果与安排不一致');
  }
  if (x.session !== null) {
    const s = x.session, p = x.plans.find(p => p.id === s?.planId);
    if (!s || !p || finished.has(s.planId) || typeof s.id !== 'string' || !Number.isFinite(Date.parse(s.startedAt)) || !Number.isInteger(s.index) || s.index < 0 || s.index >= p.questions.length || typeof s.answer !== 'string' || !Array.isArray(s.responses) || s.responses.length < s.index || s.responses.length > s.index+1 || !s.responses.every((r,i) => validQuestion(r?.question) && r.question.id === p.questions[i].id && typeof r.answer === 'string' && r.correct === (r.question.mode === 'writing' ? null : grade(r.question,r.answer)))) throw new Error('练习进度不完整');
  }
  return x;
}
